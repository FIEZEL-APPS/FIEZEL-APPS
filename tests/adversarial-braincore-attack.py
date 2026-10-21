"""Adversarial Attack & Penetration Suite for FIEZEL Braincore Engine.

Menyerang Braincore secara sistematis untuk menemukan bug fatal:
1. Math Overflow/Underflow pada success_probability (nilai ekstrim).
2. Zero Division pada optimal_difficulty (diskriminasi <= 0).
3. NaN / Inf injection pada BKT, decay, dan sync_state.
4. Nilai null / None pada p_mastery di database (legacy corruption).
5. Soal dengan difficulty: None / null pada next_best_item.
6. Payload array amplification DoS pada sync_state (5000 items).
7. Misconception deduplication leak (inflated student counts).
"""
import sys
import os
import math
import asyncio
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta

# In-memory DB stub
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

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
import braincore as bc
import learning as lr
bc.db = fake
lr.db = fake

results = []

def run_attack(name, fn):
    try:
        fn()
        print(f"  [CRACKED] {name} -> Tahan dari serangan!")
        results.append((name, "RESISTANT"))
    except Exception as e:
        print(f"  [FATAL BREAK] {name} -> TERJEBOL: {type(e).__name__}: {e}")
        results.append((name, f"BROKEN: {type(e).__name__}"))

async def run_async_attack(name, coro):
    try:
        await coro()
        print(f"  [CRACKED] {name} -> Tahan dari serangan!")
        results.append((name, "RESISTANT"))
    except Exception as e:
        print(f"  [FATAL BREAK] {name} -> TERJEBOL: {type(e).__name__}: {e}")
        results.append((name, f"BROKEN: {type(e).__name__}"))


def attack_1_overflow_exp():
    # Menembakkan kesulitan ekstrim 1000.0 vs kemampuan 0.0
    p = bc.success_probability(0.0, 1000.0)
    assert 0.0 <= p <= 1.0, f"p={p}"
    p2 = bc.success_probability(1000.0, -1000.0)
    assert 0.0 <= p2 <= 1.0, f"p2={p2}"

def attack_2_zero_division_optimal_diff():
    # Diskriminasi 0.0 atau negatif
    b = bc.optimal_difficulty(1.0, discrimination=0.0)
    assert isinstance(b, float)

def attack_3_nan_in_bkt():
    # NaN di bkt_step / bkt_decay / bkt_update
    p = bc.bkt_decay(float('nan'), 10.0)
    assert not math.isnan(p), "bkt_decay harus mengembalikan float valid saat diinjeksi NaN"
    p2 = bc.bkt_update(float('nan'), True)
    assert not math.isnan(p2), "bkt_update harus mengembalikan float valid saat diinjeksi NaN"

async def attack_4_null_p_mastery_in_db():
    # DB rekor memiliki p_mastery: None
    sid = "std_corrupted"
    cid = "comp_null"
    fake.learner_competency.docs = [{
        "student_id": sid, "competency_id": cid,
        "attempts": 2, "correct": 1, "p_mastery": None,
        "last_at": bc.now() - timedelta(days=10), "state": "PRACTICING"
    }]
    fake.users.docs = [{"user_id": sid, "name": "Korup"}]
    fake.curriculum_nodes.docs = [{"id": cid, "name": "Kompetensi Null"}]
    passport = await bc.learning_passport(sid)
    assert passport["rows"][0]["mastery_pct"] >= 0

async def attack_5_null_question_difficulty():
    # Soal di pool memiliki difficulty: None atau tidak ada field difficulty
    sid = "std_adv"
    cid = "comp_diff_none"
    fake.learner_competency.docs = [{
        "student_id": sid, "competency_id": cid,
        "attempts": 1, "correct": 0, "p_mastery": 0.25, "state": "EXPOSED"
    }]
    fake.curriculum_nodes.docs = [{"id": cid, "name": "Comp Diff None"}]
    fake.questions.docs = [
        {"question_id": "Q1", "competency_id": cid, "is_current": True, "status": "PUBLISHED", "difficulty": None},
        {"question_id": "Q2", "competency_id": cid, "is_current": True, "status": "PUBLISHED"} # no difficulty
    ]
    item = await bc.next_best_item(sid, [cid], [])
    assert item is not None

async def attack_6_sync_state_nan_and_array_dos():
    # Injeksi NaN dan 200 items sekaligus
    sid = "std_attacker"
    items = []
    for i in range(200):
        items.append(SimpleNamespace(
            competency_id=f"COMP_{i}",
            attempts=10,
            correct=5,
            streak=1,
            hints_used=0,
            retries=0,
            p_mastery=float('nan'), # NaN inject
            stability_days=float('nan'),
            due_at=None,
            last_at=None,
            tp_id="tp1"
        ))
    body = SimpleNamespace(competencies=items, misconceptions=[])
    res = await lr.sync_state(body, {"user_id": sid, "role": "student"})
    assert res["synced"] is True
    st = await bc.get_state(sid, "COMP_0")
    assert not math.isnan(st["p_mastery"])

async def attack_7_duplicate_misconception_leak():
    # Ledger memiliki 3 baris miskonsepsi untuk murid yang SAMA
    fake.classes.docs = [{"id": "cls_dup", "student_ids": ["s1", "s2"]}]
    fake.users.docs = [{"user_id": "s1", "name": "Siswa 1"}, {"user_id": "s2", "name": "Siswa 2"}]
    fake.misconception_ledger.docs = [
        {"student_id": "s1", "competency_id": "c1", "misconception_id": "m1", "frequency": 1, "resolved": False},
        {"student_id": "s1", "competency_id": "c1", "misconception_id": "m1", "frequency": 2, "resolved": False},
    ]
    mis = await bc.class_misconceptions("cls_dup")
    # Murid s1 tidak boleh dihitung 2 kali
    assert mis[0]["student_count"] == 1, f"student_count harus 1, bukan {mis[0]['student_count']}"

def attack_8_negative_hints_exploit():
    # Negative hints tidak boleh mengecilkan slip di bawah batas aman untuk menggelembungkan mastery
    p_normal = bc.bkt_update(0.5, True, hints=0)
    p_exploit = bc.bkt_update(0.5, True, hints=-100)
    assert p_exploit == p_normal, f"Negative hints exploit terdeteksi! p={p_exploit} vs normal={p_normal}"

def attack_9_negative_latency_diagnose():
    # Latensi negatif tidak boleh didiagnosa sebagai 'careless' atau 'fluent' (fast)
    d = bc.diagnose(False, 0.6, -500, 0, 60, None)
    assert d["label"] != "careless", f"Latency negatif -500ms didiagnosa careless!"

async def attack_10_array_dos_sync_state():
    # Kirim 1000 items array, verifikasi dipotong aman oleh MAX_SYNC_ITEMS
    sid = "std_spammer"
    items = [SimpleNamespace(competency_id=f"C_{i}", attempts=1, correct=1, streak=1,
                             hints_used=0, retries=0, p_mastery=0.5, stability_days=1.0,
                             due_at=None, last_at=None, tp_id=None) for i in range(1000)]
    body = SimpleNamespace(competencies=items, misconceptions=[])
    import time
    t0 = time.perf_counter()
    res = await lr.sync_state(body, {"user_id": sid, "role": "student"})
    elapsed = time.perf_counter() - t0
    assert elapsed < 0.5, f"Sync 1000 items butuh waktu {elapsed:.2f}s!"
    assert res["server_updated_count"] <= 200, f"Array harus dibatasi <= 200 items, didapat {res['server_updated_count']}"


async def main():
    print("=" * 70)
    print(" ADVERSARIAL PENETRATION TEST HARNESS - BRAINCORE ENGINE")
    print("=" * 70)
    run_attack("1. Math Overflow on extreme difficulty", attack_1_overflow_exp)
    run_attack("2. ZeroDivisionError on discrimination <= 0", attack_2_zero_division_optimal_diff)
    run_attack("3. NaN injection in BKT & decay", attack_3_nan_in_bkt)
    await run_async_attack("4. Null / None p_mastery in DB records", attack_4_null_p_mastery_in_db)
    await run_async_attack("5. Question with difficulty=None in next_best_item", attack_5_null_question_difficulty)
    await run_async_attack("6. sync_state NaN injection & Array DoS", attack_6_sync_state_nan_and_array_dos)
    await run_async_attack("7. Duplicate misconception student leak", attack_7_duplicate_misconception_leak)
    run_attack("8. Negative hints exploit in bkt_update", attack_8_negative_hints_exploit)
    run_attack("9. Negative latency in diagnose", attack_9_negative_latency_diagnose)
    await run_async_attack("10. 1000-items payload DoS in sync_state", attack_10_array_dos_sync_state)
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
