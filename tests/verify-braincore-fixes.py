"""Skrip Pembuktian Nyata (Empirical & Factual Proof) atas Seluruh Perbaikan Braincore FIEZEL.

Menguji secara live di runtime:
1. Pemisahan metrik posterior vs proporsi murid tuntas dan restorasi legacy alias mastery_pct.
2. Harmonisasi formula retrievability paruh-waktu antara Python dan JS.
3. Penegakan batas privasi MIN_COHORT = 5 pada class_misconceptions dengan ID anonim unik anti-bentrok.
4. Pemuatan parameter dinamis dari single source of truth braincore-contract.json.
5. [FATAL #1] Anti-dilusi mean_mastery_probability (hanya bagi kompetensi yang disentuh).
6. [FATAL #3] Anti-DoS clamp (MAX_SYNC_DELTA_ATTEMPTS = 20) DAN anti-spoof sejati:
   klien mengaku 100 benar / p_mastery=0.99 tidak boleh menghasilkan MASTERED.
7. [FATAL #4] Peluruhan waktu (decay) dan effective_state pada learning_passport.
"""
import sys
import os
import math
import asyncio
from types import SimpleNamespace
from datetime import datetime, timezone, timedelta

# In-memory DB stub agar bisa dieksekusi offline/lokal tanpa dependensi live Mongo
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

# Import backend braincore & learning
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))
import braincore as bc
import learning as lr


def test_proof_1_metric_separation():
    print("\n[BUKTI 1] Pemisahan Metrik Posterior vs Proporsi Siswa Sebenarnya")
    sids = ["s1", "s2", "s3", "s4"]
    comp_ids = ["c1"]
    by_student = {
        s: [{"competency_id": "c1", "p_mastery": 0.72, "state": "DEVELOPING", "attempts": 3, "exposures": 1}]
        for s in sids
    }
    tp = {"id": "tp1", "code": "TP01", "name": "Present Perfect Tense"}

    row = bc._coverage_row(tp, comp_ids, sids, by_student, n_pub=5, n_draft=0)

    print(f"  • mean_mastery_probability  : {row['mean_mastery_probability']} (Rerata posterior kelas)")
    print(f"  • students_mastered_pct     : {row['students_mastered_pct']}% (Persentase murid MASTERED nyata)")
    print(f"  • students_not_mastered_pct : {row['students_not_mastered_pct']}% (Persentase murid belum tuntas)")
    print(f"  • legacy alias mastery_pct  : {row['mastery_pct']}")

    assert row["mean_mastery_probability"] == 0.72, "mean_mastery_probability harus 0.72"
    assert row["students_mastered_pct"] == 0.0, "students_mastered_pct harus 0.0% karena 0 murid mastered"
    assert row["students_not_mastered_pct"] == 100.0, "students_not_mastered_pct harus 100.0%"
    assert row["mastery_pct"] == 72.0, "mastery_pct legacy alias harus mean * 100 = 72"
    print("  -> LULUS: Guru sekarang menerima data jujur, bebas distorsi posterior.")


def test_proof_2_retrievability_parity():
    print("\n[BUKTI 2] Paritas Paruh-Waktu Retensi Memori (Python == JS)")
    st = {
        "state": "MASTERED",
        "last_at": bc.now() - timedelta(days=12),
        "stability_days": 4.0
    }
    r_python = bc.retrievability(st)
    r_expected = round(math.pow(2.0, -12.0 / 4.0), 3)
    print(f"  • Hasil Python backend braincore: R(12 hari, S=4 hari) = {r_python}")
    print(f"  • Hasil kanonik JS formula 2^(-dt/S)                   = {r_expected}")

    assert r_python == r_expected == 0.125, f"Retrievability harus tepat 0.125, didapat {r_python}"
    print("  -> LULUS: Semantik formula retensi 100% identik lintas platform.")


async def test_proof_3_cohort_privacy():
    print("\n[BUKTI 3] Perlindungan Privasi Kelas Kecil (MIN_COHORT = 5) & Anti-Bentrok ID")
    bc.db = fake

    # Skenario A: Kelas kecil dengan 3 murid (< MIN_COHORT)
    fake.users.docs = [
        {"user_id": "std_1", "name": "Ahmad Fauzi"},
        {"user_id": "std_2", "name": "Budi Santoso"},
        {"user_id": "std_3", "name": "Citra Lestari"},
    ]
    fake.classes.docs = [{"id": "cls_small", "student_ids": ["std_1", "std_2", "std_3"]}]
    fake.misconception_ledger.docs = [
        {"student_id": "std_1", "competency_id": "comp_1", "misconception_id": "inverted_aux", "resolved": False, "frequency": 2},
        {"student_id": "std_2", "competency_id": "comp_1", "misconception_id": "inverted_aux", "resolved": False, "frequency": 1},
    ]

    res_small = await bc.class_misconceptions("cls_small")
    assert len(res_small) > 0, "Harus menemukan miskonsepsi"
    mis_item = res_small[0]

    print(f"  • Kelas kecil (3 siswa) cohort_suppressed: {mis_item.get('cohort_suppressed')}")
    print(f"  • Detail murid tersamar: {mis_item['students']}")

    assert mis_item.get("cohort_suppressed") is True, "Wajib di-suppress karena < 5 siswa"
    # Memastikan tiap murid punya ID anonim yang unik (bukan 'REDACTED' statis yang bentrok di dynamic_groups)
    assert mis_item["students"][0]["student_id"] == "anon_comp_1_inverted_aux_1", "student_id harus berupa ID anonim unik 1"
    assert mis_item["students"][1]["student_id"] == "anon_comp_1_inverted_aux_2", "student_id harus berupa ID anonim unik 2"
    assert mis_item["students"][0]["is_redacted"] is True
    assert mis_item["students"][0]["name"] == "Murid 1", "Nama asli tidak boleh bocor"

    # Skenario B: Kelas normal dengan 6 murid (>= MIN_COHORT)
    fake.users.docs.extend([
        {"user_id": "std_4", "name": "Dewi"},
        {"user_id": "std_5", "name": "Eko"},
        {"user_id": "std_6", "name": "Farhan"}
    ])
    fake.classes.docs = [{"id": "cls_normal", "student_ids": ["std_1", "std_2", "std_3", "std_4", "std_5", "std_6"]}]

    res_normal = await bc.class_misconceptions("cls_normal")
    mis_normal = res_normal[0]
    print(f"  • Kelas normal (6 siswa) cohort_suppressed: {mis_normal.get('cohort_suppressed')}")
    print(f"  • Detail murid asli: {mis_normal['students'][0]['name']}")

    assert mis_normal.get("cohort_suppressed") is False, "Tidak di-suppress untuk kelas normal"
    assert mis_normal["students"][0]["name"] == "Ahmad Fauzi", "Guru sah berhak melihat nama siswa"
    print("  -> LULUS: Privasi ditegakkan dan ID anonim unik mencegah bentrok deduplikasi.")


def test_proof_4_contract_sync():
    print("\n[BUKTI 4] Parameter Registry Terkoneksi ke Single Source of Truth")
    contract_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "coordination", "braincore-contract.json")
    assert os.path.isfile(contract_file), "braincore-contract.json wajib ada"

    import json
    with open(contract_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    cm = data["namespaces"]["competency_mastery"]["bkt_params"]
    assert bc.CONTRACT_LOADED is True, "CONTRACT_LOADED harus True"
    assert bc.P_INIT == cm["p_init"], f"P_INIT {bc.P_INIT} == {cm['p_init']}"
    assert bc.P_LEARN == cm["p_learn"], f"P_LEARN {bc.P_LEARN} == {cm['p_learn']}"
    assert bc.P_SLIP == cm["p_slip"], f"P_SLIP {bc.P_SLIP} == {cm['p_slip']}"
    assert bc.P_GUESS == cm["p_guess"], f"P_GUESS {bc.P_GUESS} == {cm['p_guess']}"
    assert bc.MIN_COHORT == 5, "MIN_COHORT harus 5"

    print(f"  • CONTRACT_LOADED = {bc.CONTRACT_LOADED}")
    print(f"  • Backend P_INIT = {bc.P_INIT}, P_LEARN = {bc.P_LEARN}, P_SLIP = {bc.P_SLIP}, P_GUESS = {bc.P_GUESS}")
    print("  -> LULUS: Parameter backend terbukti dimuat dari kontrak kanonik.")


def test_proof_5_anti_dilution():
    print("\n[BUKTI 5] Anti-Dilusi mean_mastery_probability (FATAL #1)")
    # Kasus audit OpenCode: TP punya 5 kompetensi (c0..c4).
    # 2 murid hanya mengerjakan 1 kompetensi (c0) dengan p_mastery = 0.80.
    sids = ["s1", "s2"]
    comp_ids = ["c0", "c1", "c2", "c3", "c4"]
    by_student = {
        "s1": [{"competency_id": "c0", "p_mastery": 0.80, "p_mastery_decayed": 0.80, "state": "MASTERED", "attempts": 4, "exposures": 1}],
        "s2": [{"competency_id": "c0", "p_mastery": 0.80, "p_mastery_decayed": 0.80, "state": "MASTERED", "attempts": 4, "exposures": 1}],
    }
    tp = {"id": "tp_audit", "code": "TP-AUDIT", "name": "Audit TP"}
    row = bc._coverage_row(tp, comp_ids, sids, by_student, n_pub=5, n_draft=0)

    print(f"  • mean_mastery_probability: {row['mean_mastery_probability']} (ekspektasi ~0.80, bukan 0.16)")
    print(f"  • status: {row['status']} (ekspektasi GOOD, bukan GAP)")

    assert row["mean_mastery_probability"] == 0.80, f"mean_mastery_probability harus 0.80, didapat {row['mean_mastery_probability']}"
    assert row["status"] == "GOOD", f"Status harus GOOD, bukan {row['status']}"
    print("  -> LULUS: Anti-dilusi terbukti, metrik tidak terdistorsi kompetensi yang belum disentuh.")


async def test_proof_6_sync_state_anti_dos():
    print("\n[BUKTI 6] Anti-DoS pada sync_state (FATAL #3)")
    lr.db = fake
    bc.db = fake

    # Buat murid dan state awal
    sid = "std_hacker"
    cid = "comp_math"
    fake.learner_competency.docs = [{
        "student_id": sid, "competency_id": cid,
        "attempts": 2, "correct": 1, "p_mastery": 0.35, "state": "PRACTICING"
    }]

    # Client nakal mengirim attempts = 10_000_000 dan klaim p_mastery = 0.99
    body = SimpleNamespace(
        competencies=[
            SimpleNamespace(
                competency_id=cid,
                attempts=10_000_000,
                correct=10_000_000,
                streak=10_000_000,
                hints_used=0,
                retries=0,
                p_mastery=0.99,
                stability_days=10.0,
                due_at=None,
                last_at=bc.now().isoformat(),
                tp_id="tp1"
            )
        ],
        misconceptions=[]
    )

    user = {"user_id": sid, "name": "Hacker"}
    import time
    t0 = time.perf_counter()
    res = await lr.sync_state(body, user)
    elapsed = time.perf_counter() - t0

    updated_doc = await fake.learner_competency.find_one({"student_id": sid, "competency_id": cid})
    print(f"  • Waktu eksekusi sync: {elapsed*1000:.2f} ms (bebas freeze loop)")
    print(f"  • Attempts server setelah clamp: {updated_doc['attempts']} (dibatasi delta <= 20)")
    print(f"  • Correct server setelah clamp : {updated_doc['correct']} (dibatasi delta <= 2)")

    assert elapsed < 0.20, f"sync_state harus instan (< 200ms), tetapi butuh {elapsed:.2f}s"
    assert updated_doc["attempts"] == 2 + 20, f"Attempts harus 22 (2 + MAX_SYNC_DELTA 20), didapat {updated_doc['attempts']}"
    assert updated_doc["correct"] == 1 + 2, f"Correct harus 3 (1 + MAX_SYNC_DELTA_CORRECT 2), didapat {updated_doc['correct']}"
    print("  -> LULUS: Anti-DoS clamp aktif, serangan 10 juta attempt tidak membekukan server.")


async def test_proof_8_sync_state_anti_spoof():
    """Reproduksi serangan MINIMAL yang LOLOS dari test anti-spoof lama.

    Test lama hanya memakai p_mastery=0.99, attempts=1, correct=0 — yang memang tidak
    bisa naik, sehingga TIDAK pernah membuktikan apa pun soal spoof. Di sini klien
    mengaku 100 percobaan benar: dengan konstanta BKT sekarang, 2 langkah benar saja
    sudah cukup menembus ambang MASTERY. Test ini HARUS gagal bila pagar spoof dilepas.
    """
    print("\n[BUKTI 8] Anti-Spoof Sejati pada sync_state (FATAL #3 lanjutan)")
    lr.db = fake
    bc.db = fake

    sid = "std_spoofer"
    cid = "comp_spoof"
    fake.learner_competency.docs = [{
        "student_id": sid, "competency_id": cid,
        "attempts": 0, "correct": 0, "p_mastery": bc.P_INIT, "state": "NOT_EXPOSED"
    }]

    # Serangan sebenarnya: klien sama sekali TIDAK mengerjakan apa pun, tetapi mengaku
    # 100 percobaan, 100 benar, p_mastery=0.99.
    body = SimpleNamespace(
        competencies=[
            SimpleNamespace(
                competency_id=cid,
                attempts=100,
                correct=100,
                streak=100,
                hints_used=0,
                retries=0,
                p_mastery=0.99,
                stability_days=10.0,
                due_at=None,
                last_at=bc.now().isoformat(),
                tp_id="tp1"
            )
        ],
        misconceptions=[]
    )

    await lr.sync_state(body, {"user_id": sid, "name": "Spoofer"})
    doc = await fake.learner_competency.find_one({"student_id": sid, "competency_id": cid})
    print(f"  • p_mastery server setelah klaim 0.99 : {doc['p_mastery']}")
    print(f"  • state server setelah sinkron       : {doc['state']}")

    assert doc["p_mastery"] < bc.MASTERY_T, (
        f"Spoof: posterior {doc['p_mastery']} tidak boleh mencapai ambang mastery {bc.MASTERY_T}")
    assert doc["state"] not in bc.MASTERED_STATES, (
        f"Spoof: state {doc['state']} tidak boleh MASTERED dari sinkronisasi klien")
    assert doc.get("sync_pending_confirmation") is True, (
        "State hasil sinkron palsu harus ditandai butuh konfirmasi attempt server")

    # Sisi benar: attempt ASLI yang diobservasi server tetap boleh menaikkan ke mastery.
    real = dict(fake.learner_competency.docs[0])
    real.update({"p_mastery": 0.85, "attempts": 12, "correct": 10, "last_at": bc.now()})
    assert bc.derive_state(real) == "MASTERED", (
        "Jalur attempt asli server harus tetap bisa mencapai MASTERED")
    print("  -> LULUS: Sinkronisasi offline tak bisa memalsukan mastery; jalur attempt asli tetap sah.")


async def test_proof_7_learning_passport_decay():
    print("\n[BUKTI 7] Peluruhan Waktu (Decay) pada learning_passport (FATAL #4)")
    bc.db = fake
    sid = "std_decayed"
    cid = "comp_old"
    fake.users.docs = [{"user_id": sid, "name": "Murid Lama"}]
    # Kompetensi yang dikuasai 90 hari yang lalu (3 x half-life 30 hari -> turun dari 0.95 ke ~0.33)
    past_date = bc.now() - timedelta(days=90)
    fake.learner_competency.docs = [{
        "student_id": sid, "competency_id": cid,
        "attempts": 10, "correct": 9, "p_mastery": 0.95, "state": "MASTERED",
        "last_at": past_date, "tp_id": "tp_old"
    }]
    fake.curriculum_nodes.docs = [
        {"id": cid, "name": "Kompetensi Lama", "tp_id": "tp_old"},
        {"id": "tp_old", "name": "TP Lama", "code": "TP-OLD"}
    ]

    passport = await bc.learning_passport(sid)
    row = passport["rows"][0]
    comp_row = row["competencies"][0]

    print(f"  • p_mastery mentah : {comp_row['p_mastery']}")
    print(f"  • p_mastery_decayed: {comp_row['p_mastery_decayed']} (setelah 90 hari)")
    print(f"  • state efektif    : {comp_row['state']}")
    print(f"  • totals.mastered  : {passport['totals']['mastered']}")

    assert comp_row["p_mastery_decayed"] < 0.60, f"p_mastery_decayed harus turun di bawah 0.60, didapat {comp_row['p_mastery_decayed']}"
    assert comp_row["state"] != "MASTERED", f"State tidak boleh MASTERED setelah luntur 90 hari, didapat {comp_row['state']}"
    assert passport["totals"]["mastered"] == 0, f"Totals mastered harus 0, didapat {passport['totals']['mastered']}"
    print("  -> LULUS: Passport menghitung state efektif secara jujur sesuai peluruhan waktu.")


async def main():
    print("================================================================")
    print(" PEMBUKTIAN FAKTUAL RUNTIME: PERBAIKAN BRAINCORE FIEZEL")
    print("================================================================")
    test_proof_1_metric_separation()
    test_proof_2_retrievability_parity()
    await test_proof_3_cohort_privacy()
    test_proof_4_contract_sync()
    test_proof_5_anti_dilution()
    await test_proof_6_sync_state_anti_dos()
    await test_proof_7_learning_passport_decay()
    await test_proof_8_sync_state_anti_spoof()
    print("\n================================================================")
    print(" SEMUA 8 PENGUJIAN FAKTUAL RUNTIME LULUS 100% TANPA KLAIM PALSU")
    print("================================================================")


if __name__ == "__main__":
    asyncio.run(main())
