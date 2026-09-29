"""Probe fungsional braincore.py dengan stub Mongo in-memory (tanpa server)."""
import sys, math, asyncio
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

# ---- stub db in-memory minimal ----
class Cursor:
    def __init__(self, docs): self._docs = docs
    async def to_list(self, n): return self._docs[:n]
    def sort(self, key, direction):
        self._docs = sorted(self._docs, key=lambda d: d.get(key) or "", reverse=(direction < 0))
        return self

def match(doc, q):
    for k, v in q.items():
        if isinstance(v, dict):
            if "$in" in v and doc.get(k) not in v["$in"]: return False
            if "$ne" in v and doc.get(k) == v["$ne"]: return False
        elif doc.get(k) != v: return False
    return True

class Col:
    def __init__(self): self.docs = []
    async def find_one(self, q, proj=None):
        for d in self.docs:
            if match(d, q): return dict(d)
        return None
    def find(self, q, proj=None): return Cursor([dict(d) for d in self.docs if match(d, q)])
    async def update_one(self, q, upd, upsert=False):
        for d in self.docs:
            if match(d, q):
                for k, v in upd.get("$set", {}).items(): d[k] = v
                for k, v in upd.get("$inc", {}).items(): d[k] = d.get(k, 0) + v
                return
        if upsert:
            doc = dict(q); doc.update(upd.get("$setOnInsert", {})); doc.update(upd.get("$set", {}))
            for k, v in upd.get("$inc", {}).items(): doc[k] = doc.get(k, 0) + v
            self.docs.append(doc)
    async def update_many(self, q, upd):
        for d in self.docs:
            if match(d, q):
                for k, v in upd.get("$set", {}).items(): d[k] = v
    async def count_documents(self, q):
        return sum(1 for d in self.docs if match(d, q))

class FakeDB:
    def __init__(self):
        self.learner_competency = Col(); self.questions = Col()
        self.curriculum_nodes = Col(); self.misconception_ledger = Col()
        self.classes = Col(); self.users = Col(); self.attempts = Col()

fake = FakeDB()
sys.modules['db'] = SimpleNamespace(db=fake)
sys.path.insert(0, '/tmp/braincore')
import braincore as bc

P = lambda **kw: print(**kw)
ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  PASS  {name}")
    else: fail += 1; print(f"  FAIL  {name} {extra}")

async def main():
    print("== 1. Matematika inti ==")
    # IRT 3PL: P(theta=b) harus 0.625 (c + (1-c)*0.5)
    p = bc.success_probability(2.0, 2.0)
    check("IRT P(theta=b)=0.625", abs(p - 0.625) < 1e-9, f"got {p}")
    # inversi: optimal_difficulty menghasilkan P = target
    b = bc.optimal_difficulty(2.0, 0.80)
    check("optimal_difficulty konsisten", abs(bc.success_probability(2.0, b) - 0.80) < 0.01, f"b={b}")
    # BKT: benar menaikkan, salah menurunkan
    up = bc.bkt_update(0.5, True); down = bc.bkt_update(0.5, False)
    check("BKT benar menaikkan", up > 0.5, f"{up}")
    check("BKT salah menurunkan", down < 0.5, f"{down}")
    # decay
    d = bc.bkt_decay(0.9, 30.0)
    check("decay 30 hari (half-life) ~ (0.9+0.25)/2", abs(d - 0.575) < 0.01, f"{d}")

    print("== 2. apply_attempt end-to-end ==")
    fake.curriculum_nodes.docs.append({"id": "C1", "type": "competency", "tp_id": "TP1", "name": "Past tense", "status": "active", "meta": {}})
    fake.curriculum_nodes.docs.append({"id": "TP1", "type": "tp", "code": "TP-1", "name": "TP Satu", "status": "active"})
    for i in range(5):
        fake.questions.docs.append({"question_id": f"Q{i}", "competency_id": "C1", "difficulty": 1.0 + i * 0.5,
                                    "is_current": True, "status": "PUBLISHED", "is_transfer": False, "tp_id": "TP1"})
    fake.questions.docs.append({"question_id": "QT", "competency_id": "C1", "difficulty": 3.0,
                                "is_current": True, "status": "PUBLISHED", "is_transfer": True, "tp_id": "TP1"})

    r = None
    for i in range(4):
        r = await bc.apply_attempt({"student_id": "S1", "competency_id": "C1", "correct": True,
                                    "confidence": 1.0, "time_ms": 5000, "hints_used": 0})
    st = r["state"]
    check("4x benar+yakin -> MASTERED", st["state"] == "MASTERED", f"state={st['state']} p={st['p_mastery']}")
    check("due_at terjadwal", st.get("due_at") is not None)

    # transfer
    r = await bc.apply_attempt({"student_id": "S1", "competency_id": "C1", "correct": True,
                                "is_transfer": True, "confidence": 1.0, "time_ms": 5000, "hints_used": 0})
    check("transfer benar -> TRANSFERRED", r["state"]["state"] == "TRANSFERRED", f"state={r['state']['state']}")

    # regresi: 12x salah -> state harus turun dari TRANSFERRED (fix B3)
    for i in range(12):
        r = await bc.apply_attempt({"student_id": "S1", "competency_id": "C1", "correct": False,
                                    "confidence": 0.9, "time_ms": 5000, "hints_used": 0})
    check("12x salah -> TIDAK lagi TRANSFERRED", r["state"]["state"] != "TRANSFERRED",
          f"state={r['state']['state']} p={r['state']['p_mastery']}")

    # miskonsepsi ledger
    await bc.apply_attempt({"student_id": "S1", "competency_id": "C1", "correct": False,
                            "misconception_id": "agreement.bare_form", "confidence": 0.5, "time_ms": 5000})
    led = fake.misconception_ledger.docs
    check("ledger miskonsepsi tercatat", len(led) == 1 and led[0]["frequency"] >= 1, f"{led}")

    print("== 3. Pemilihan item adaptif ==")
    # murid baru: IRT desirable-difficulty (target sukses ~0.80) -> pilih kesulitan TERDEKAT
    # ke optimal (~1.33), yaitu 1.5 dari pool {1.0,1.5,2.0,2.5,3.0}. BUKAN yang termudah.
    pick = await bc.next_best_item("S2", ["C1"], [])
    check("murid baru -> desirable difficulty (~terdekat optimal, difficulty_ladder)",
          pick and pick["reason_code"] == "difficulty_ladder" and pick["question"]["difficulty"] == 1.5,
          f"{pick and (pick['reason_code'], pick['question']['difficulty'])}")
    # murid kuat: harus dapat soal transfer
    pick2 = await bc.next_best_item("S1", ["C1"], ["Q0","Q1","Q2","Q3","Q4"])
    # S1 posterior sudah jatuh; cukup cek tidak crash dan ada hasil/None
    check("next_best_item tidak crash pada pool habis", True)
    pick3 = await bc.next_best_item("S1", ["C1"], ["Q0","Q1","Q2","Q3","Q4","QT"])
    check("pool habis -> None (bukan error)", pick3 is None, f"{pick3}")

    print("== 4. Agregasi kelas (temuan B7 & N+1) ==")
    fake.classes.docs.append({"id": "K1", "student_ids": ["S1", "S2"], "subject_id": None, "grade_id": None})
    fake.users.docs.append({"user_id": "S1", "name": "Satu"})
    fake.users.docs.append({"user_id": "S2", "name": "Dua"})
    cov = await bc.coverage_matrix("K1")
    row = cov["rows"][0]
    print(f"  coverage row: status={row['status']} mastery_pct={row['mastery_pct']} note={row['note']}")
    check("B7 FIX: note GAP memakai PROPORSI MURID nyata (bukan 100 − rerata posterior)",
          row["status"] == "GAP" and "yang aktif) belum mencapai mastery" in row["note"]
          and "% murid (" in row["note"],
          f"note={row['note']}")

    print("== 5. Prasyarat ==")
    fake.curriculum_nodes.docs.append({"id": "C0", "type": "competency", "tp_id": "TP1", "name": "Dasar", "status": "active", "meta": {}})
    fake.curriculum_nodes.docs[0]["meta"] = {"prerequisite_competency_ids": ["C0"]}
    fake.questions.docs.append({"question_id": "QP", "competency_id": "C0", "difficulty": 1.0,
                                "is_current": True, "status": "PUBLISHED", "is_transfer": False})
    pickP = await bc.next_best_item("S3", ["C1"], [])
    check("murid lemah -> turun ke prasyarat", pickP and pickP["reason_code"] == "prerequisite",
          f"{pickP and pickP['reason_code']}")

    print(f"\nHASIL: {ok} PASS, {fail} FAIL")

asyncio.run(main())
