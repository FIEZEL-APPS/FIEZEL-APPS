"""Unit test murni (tanpa server) untuk inti Braincore, validasi soal, blueprint & parser."""
import asyncio
import sys
from datetime import datetime, timezone, timedelta

import os
_here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _here)
sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv
load_dotenv(os.path.join(_here, ".env"))
load_dotenv("/app/backend/.env")

# Fallback dummy env vars untuk pengujian murni tanpa server live
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "fiezel_unit_test")

import braincore as bc
from questions import parse_paste, validate_doc, stem_hash
from assessment import check_blueprint, assemble
import db as db_module

# Mock DB untuk unit test murni tanpa server live
class _MockCollection:
    def __init__(self, name=""):
        self.name = name
    async def find_one(self, *args, **kwargs):
        if self.name == "curriculum_nodes":
            return {"id": "TP-MAT-D-7-BIL-01", "code": "BIL-01", "name": "Bilangan"}
        return None
    async def count_documents(self, *args, **kwargs):
        return 10
    async def update_one(self, *args, **kwargs):
        return None
    def find(self, *args, **kwargs):
        return self
    def sort(self, *args, **kwargs):
        return self
    async def to_list(self, limit=100):
        return [{"question_id": f"Q-BIL-{i}", "version": 1, "tp_id": "TP-MAT-D-7-BIL-01",
                 "competency_id": "COMP-1", "difficulty": 2, "cognitive_level": "C2",
                 "question_type": "mcq", "is_transfer": False, "status": "PUBLISHED",
                 "is_current": True} for i in range(10)]

class _MockDB:
    def __getattr__(self, name):
        return _MockCollection(name)

db_module.db = _MockDB()
import questions
questions.db = db_module.db
import assessment
assessment.db = db_module.db
bc.db = db_module.db

ok, fail = 0, 0


def check(name, cond, extra=""):
    global ok, fail
    if cond:
        ok += 1
        print("PASS " + name)
    else:
        fail += 1
        print("FAIL " + name + ("  " + str(extra) if extra else ""))


# ---------- BKT ----------
def test_bkt():
    p = bc.P_INIT
    for _ in range(4):
        p = bc.bkt_update(p, True)
    check("BKT naik saat benar berturut-turut", p > 0.8, p)
    q = bc.bkt_update(0.8, False)
    check("BKT turun saat salah", q < 0.8, q)
    lucky = bc.bkt_update(0.5, True, confidence=0.2)
    sure = bc.bkt_update(0.5, True, confidence=1.0)
    check("benar-tapi-tidak-yakin naik lebih sedikit dari benar-yakin", lucky < sure, (lucky, sure))
    hinted = bc.bkt_update(0.5, True, hints=2)
    check("benar dengan hint = evidence lebih lemah", hinted < sure, (hinted, sure))
    wrong_plain = bc.bkt_update(0.5, False)
    wrong_hinted = bc.bkt_update(0.5, False, hints=2)
    check("salah walau dibantu hint tidak dihukum lebih ringan dari salah tanpa hint",
          wrong_hinted <= wrong_plain, (wrong_hinted, wrong_plain))


# ---------- IRT 3PL & Decay Parity ----------
def test_irt_3pl():
    p_equal = bc.success_probability(3.0, 3.0)
    check("3PL P(theta=b) == 0.625 saat c=0.25", abs(p_equal - 0.625) < 1e-4, p_equal)
    p_harder = bc.success_probability(2.0, 3.0)
    p_easier = bc.success_probability(4.0, 3.0)
    check("kemampuan lebih tinggi menghasilkan P lebih tinggi", p_easier > p_equal > p_harder, (p_harder, p_equal, p_easier))

    # Inversi optimal difficulty
    b_opt = bc.optimal_difficulty(3.5, target_success=0.80)
    p_check = bc.success_probability(3.5, b_opt)
    check("optimal_difficulty menghasilkan P mendekati target 0.80", abs(p_check - 0.80) < 0.02, (b_opt, p_check))
    check("kemampuan lebih tinggi menargetkan soal lebih sulit", bc.optimal_difficulty(4.5) > bc.optimal_difficulty(2.5))


def test_bkt_decay():
    check("decay 0 hari tidak mengubah posterior", bc.bkt_decay(0.85, 0) == 0.85)
    d30 = bc.bkt_decay(0.85, 30.0, half_life_days=30.0)
    check("decay 30 hari meluruh separuh jarak ke P_INIT (0.55)", abs(d30 - 0.55) < 0.01, d30)
    d90 = bc.bkt_decay(0.85, 90.0, half_life_days=30.0)
    check("decay 90 hari semakin mendekati P_INIT (0.25)", d90 < d30 and d90 > 0.25, d90)
    check("di bawah P_INIT tidak meluruh lagi", bc.bkt_decay(0.20, 30.0) == 0.20)


# ---------- C3: paritas RUMUS dengan klien features/brain/fiezel-mastery-bkt.js ----------
# Konstanta klien (L0=0.20, T=0.15, slip=0.10, guess=0.25; gerbang L>=0.95 & n>=5) SENGAJA
# berbeda dari server (P_INIT=0.25, P_LEARN=0.18, P_GUESS=0.20; gerbang 0.80 & 3 benar):
# klien menilai *lesson* luring dengan prior konservatif, server menilai *kompetensi* dengan
# angka yang disetel dari data (m025-379). Yang WAJIB identik adalah BENTUK rumusnya, dan
# itulah yang dijaga di sini: bkt_step & bkt_decay dijalankan dengan konstanta klien dan
# harus menghasilkan angka yang sama dengan bktStep()/calculateDecay() JS (dihitung manual).
def test_client_parity():
    L0, T, s, g = 0.20, 0.15, 0.10, 0.25
    # bktStep(0.5, benar): posterior = 0.45/(0.45+0.125)=0.782608..; +T*(1-post) = 0.815217..
    check("bkt_step benar == klien bktStep", abs(bc.bkt_step(0.5, True, s, g, T) - 0.8152173913) < 1e-9)
    # bktStep(0.5, salah): posterior = 0.05/(0.05+0.375)=0.117647..; +T*(1-post) = 0.25
    check("bkt_step salah == klien bktStep", abs(bc.bkt_step(0.5, False, s, g, T) - 0.25) < 1e-9)
    # calculateDecay: L0 + (L-L0)*exp(-days*ln2/hl). L=0.9, 30 hari, hl 30 -> L0 + 0.7*0.5 = 0.55
    import math
    expect = L0 + (0.9 - L0) * math.exp(-30 * math.log(2) / 30)
    got = bc.P_INIT + (0.9 - bc.P_INIT) * math.exp(-30 / (30 / math.log(2)))
    check("bentuk decay server == klien calculateDecay (half-life eksak)", abs((got - bc.P_INIT) / (0.9 - bc.P_INIT) - (expect - L0) / (0.9 - L0)) < 1e-12)
    check("bkt_decay server konsisten dengan bentuk itu", abs(bc.bkt_decay(0.9, 30.0, 30.0) - round(got, 4)) < 1e-9)
    check("bkt_update memakai bkt_step (tanpa hint/confidence identik)",
          abs(bc.bkt_update(0.5, True) - min(0.99, bc.bkt_step(0.5, True))) < 1e-12)


# ---------- m025-375 (B6): apply_attempt melangkah dari posterior yang sudah meluruh ----------
async def test_apply_attempt_decays_first():
    saved = {}
    class _Col:
        async def find_one(self, *a, **k):
            return dict(saved["doc"]) if "doc" in saved else None
        async def update_one(self, q, upd, upsert=False):
            saved["written"] = dict(upd.get("$set", {}))
        async def update_many(self, *a, **k):
            return None
    class _DB:
        learner_competency = _Col()
        misconception_ledger = _Col()
    real = bc.db
    bc.db = _DB()
    try:
        long_ago = bc.now() - timedelta(days=90)
        saved["doc"] = dict(bc.blank_state("s", "c"), attempts=12, correct=11, p_mastery=0.97,
                            state="MASTERED", last_at=long_ago, mastered_at=long_ago - timedelta(days=5),
                            stability_days=3.0)
        res = await bc.apply_attempt({"student_id": "s", "competency_id": "c", "correct": False})
        p = res["state"]["p_mastery"]
        check("salah setelah 90 hari melangkah dari posterior yang sudah meluruh", p < 0.5, p)
        check("p_mastery_decayed tidak ikut tersimpan ke DB", "p_mastery_decayed" not in saved["written"])
    finally:
        bc.db = real


# ---------- state machine ----------
def test_states():
    st = bc.blank_state("s", "c")
    check("tanpa evidence = NOT_EXPOSED", bc.derive_state(st) == "NOT_EXPOSED")
    st["exposures"] = 1
    check("sudah dikenalkan = EXPOSED", bc.derive_state(st) == "EXPOSED")
    st.update({"attempts": 3, "correct": 1, "p_mastery": 0.4})
    check("latihan tapi lemah = PRACTICING", bc.derive_state(st) == "PRACTICING", st["p_mastery"])
    st["p_mastery"] = 0.7
    check("0.6-0.8 = DEVELOPING", bc.derive_state(st) == "DEVELOPING")
    st.update({"p_mastery": 0.85, "correct": 3})
    check("mastery butuh posterior tinggi + 3 benar", bc.derive_state(st) == "MASTERED")
    st["retained_at"] = bc.now()
    check("retensi terbukti = RETAINED", bc.derive_state(st) == "RETAINED")
    st["transferred_at"] = bc.now()
    check("transfer terbukti = TRANSFERRED", bc.derive_state(st) == "TRANSFERRED")
    st_drop = dict(st, p_mastery=0.2)
    check("TRANSFERRED tidak lengket saat posterior jatuh di bawah mastery",
          bc.derive_state(st_drop) == "PRACTICING", bc.derive_state(st_drop))
    check("RETAINED tidak lengket saat posterior jatuh di bawah mastery",
          bc.derive_state(dict(st_drop, transferred_at=None, p_mastery=0.7)) == "DEVELOPING")
    check("TRANSFERRED kembali saat mastery pulih", bc.derive_state(dict(st_drop, p_mastery=0.9)) == "TRANSFERRED")
    st2 = dict(st, attempts=3, correct=3, p_mastery=0.9, state="MASTERED",
               last_at=bc.now() - timedelta(days=30), stability_days=3.0,
               retained_at=None, transferred_at=None)
    r = bc.retrievability(st2)
    check("retrievability turun setelah lama tidak review", r is not None and r < 0.2, r)
    check("score>=80 bukan satu-satunya syarat mastery",
          bc.derive_state(dict(bc.blank_state("s", "c"), attempts=2, correct=2, p_mastery=0.79,
                               exposures=1)) != "MASTERED")


# ---------- diagnosis ----------
def test_diagnosis():
    d = bc.diagnose(True, 0.2, 5000, 0, 60, None)
    check("benar + tidak yakin -> lucky_guess", d["label"] == "lucky_guess", d)
    d = bc.diagnose(False, 1.0, 40000, 0, 60, None)
    check("salah + sangat yakin -> false_confidence", d["label"] == "false_confidence", d)
    d = bc.diagnose(False, 0.6, 5000, 0, 60, None)
    check("salah + sangat cepat -> careless", d["label"] == "careless", d)
    d = bc.diagnose(False, 0.6, 40000, 0, 60, "MIS-X")
    check("salah + pola miskonsepsi -> misconception", d["label"] == "misconception", d)
    d = bc.diagnose(True, 1.0, 40000, 0, 60, None)
    check("benar tanpa bantuan -> knowledge", d["label"] in ("knowledge", "fluent"), d)
    check("pesan diagnosis tanpa istilah teknis",
          all("BKT" not in bc.diagnose(c, 0.6, 30000, 0, 60, None)["message"] and
              "posterior" not in bc.diagnose(c, 0.6, 30000, 0, 60, None)["message"]
              for c in (True, False)))


# ---------- parser tempelan ----------
def test_parser():
    rows = parse_paste("""1. Hitunglah 2/3 + 1/6
A. 5/6
B. 3/9
C. 1/2
D. 2/9
Jawaban: A
Penjelasan: Samakan penyebut jadi 6.
Hint: cari KPK
2) Apa ibu kota Jawa Barat?
Kunci: Bandung
""")
    check("parser membaca 2 soal", len(rows) == 2, rows)
    check("parser mengenali opsi & kunci", rows[0]["options"] == ["5/6", "3/9", "1/2", "2/9"]
          and rows[0]["answer_key"] == "A", rows[0])
    check("parser mengenali penjelasan & hint",
          rows[0]["explanation"].startswith("Samakan") and rows[0]["hints"] == ["cari KPK"], rows[0])
    check("soal tanpa opsi jadi short_answer", rows[1]["question_type"] == "short_answer", rows[1])
    check("parser deterministik", parse_paste("1. A?\nKunci: x") == parse_paste("1. A?\nKunci: x"))
    check("stem hash mengabaikan spasi/kapital",
          stem_hash("Hitung 2 + 2") == stem_hash("hitung   2 + 2"))


# ---------- validasi ----------
async def test_validation():
    base = {"question_id": "Q-TEST", "question_type": "mcq", "stem": "Hitunglah 2/3 + 1/6 dengan benar",
            "options": ["5/6", "3/9"], "answer_key": "Z", "competency_id": "", "tp_id": None,
            "cp_id": None, "indicator_id": None, "explanation": "", "hints": [],
            "distractor_misconceptions": {}, "misconception_id": None,
            "prerequisite_competency_ids": [], "difficulty": 2, "cognitive_level": "C2",
            "stem_hash": stem_hash("x-unik-untuk-tes-validasi")}
    issues = await validate_doc(base)
    codes = {i["code"] for i in issues}
    check("validasi menangkap kunci salah", "answer_key_invalid" in codes, codes)
    check("validasi menangkap TP kosong", "tp_missing" in codes, codes)
    check("validasi menangkap kompetensi kosong", "competency_missing" in codes, codes)
    check("validasi menangkap penjelasan kosong", "explanation_missing" in codes, codes)
    check("validasi menangkap prasyarat kosong", "prerequisite_missing" in codes, codes)
    check("ada isu level error (blokir terbit)", any(i["level"] == "error" for i in issues))


# ---------- blueprint ----------
async def test_blueprint():
    bad = {"tp_targets": [{"tp_id": "TP-MAT-D-7-BIL-01", "count": 10}],
           "cognitive_distribution": {"C1": 70, "C2": 30}, "transfer_ratio": 0.0,
           "assessment_type": "summative", "difficulty_distribution": {}}
    r = await check_blueprint(bad)
    msgs = " ".join(w["message"] for w in r["warnings"])
    check("blueprint dominan C1 diperingatkan", "C3+" in msgs and "dangkal" in msgs, msgs)
    check("blueprint tanpa transfer diperingatkan", "transfer" in msgs, msgs)
    good = {"tp_targets": [{"tp_id": "TP-MAT-D-7-BIL-01", "count": 4}],
            "cognitive_distribution": {"C1": 20, "C2": 30, "C3": 30, "C4": 20},
            "transfer_ratio": 0.25, "assessment_type": "formative", "difficulty_distribution": {}}
    r2 = await check_blueprint(good)
    check("blueprint seimbang lolos", r2["balanced"] and not any(
        w["level"] == "error" for w in r2["warnings"]), r2["warnings"])
    asm = await assemble(good["tp_targets"], good["cognitive_distribution"], None, 0.25, ["mcq"])
    check("perakitan mengembalikan soal", len(asm["question_ids"]) > 0, asm["notes"])
    check("perakitan tidak duplikat", len(set(asm["question_ids"])) == len(asm["question_ids"]))


import learning
learning.db = db_module.db
from learning import CompetencySyncIn, StateSyncIn, sync_state


# ---------- state sync ----------
async def test_state_sync():
    user = {"user_id": "STUDENT-1", "role": "student"}
    payload = StateSyncIn(
        theta=3.2,
        sd=0.45,
        competencies=[
            CompetencySyncIn(
                competency_id="COMP-BIL-01",
                p_mastery=0.82,
                attempts=5,
                correct=4,
                streak=3,
                stability_days=3.0
            )
        ],
        misconceptions=[{"competency_id": "COMP-BIL-01", "misconception_id": "MIS-SIGN", "frequency": 1}]
    )
    res = await sync_state(payload, u=user)
    check("sync_state berhasil tersinkron", res["synced"] is True)
    check("sync_state merekonsiliasi kompetensi klien", res["client_competencies_received"] == 1)
    check("sync_state mencatat pembaruan server", res["server_updated_count"] >= 1)

    # Anti-tamper: klaim palsu p_mastery=0.99 dengan 1 attempt salah tidak boleh menjadi MASTERED
    payload_fake = StateSyncIn(
        competencies=[
            CompetencySyncIn(
                competency_id="COMP-FAKE-01",
                p_mastery=0.99,
                attempts=1,
                correct=0,
                streak=0,
                stability_days=1.0
            )
        ]
    )
    await sync_state(payload_fake, u=user)
    saved_state = await bc.get_state("STUDENT-1", "COMP-FAKE-01")
    check("sync_state menolak klaim p_mastery palsu tanpa bukti", saved_state["p_mastery"] <= 0.25)
    check("sync_state tidak menandai MASTERED untuk klaim palsu", saved_state["state"] != "MASTERED")


async def test_empty_competency_ids():
    res = await bc.next_best_item("STUDENT-1", [], [])
    check("next_best_item tidak crash (500) pada competency_ids kosong", res is None)


def test_shuffled_questions_and_options():
    q = {
        "question_id": "Q-TEST-1",
        "version": 1,
        "question_type": "mcq",
        "options": ["Aplikasi 1", "Aplikasi 2", "Aplikasi 3", "Aplikasi 4"],
        "answer_key": "A"
    }
    q1 = learning.get_shuffled_question_data("SES-STUDENT-1", q)
    q2 = learning.get_shuffled_question_data("SES-STUDENT-2", q)
    
    check("shuffled options tetap memiliki 4 opsi", len(q1["options"]) == 4)
    check("kunci jawaban menyesuaikan opsi yang diacak", q1["answer_key"] in ["A", "B", "C", "D"])
    check("shuffling berbeda antar siswa (anti-cheating)", q1["options"] != q2["options"] or q1["answer_key"] != q2["answer_key"])


async def main():
    test_bkt()
    test_irt_3pl()
    test_bkt_decay()
    test_client_parity()
    test_states()
    await test_apply_attempt_decays_first()
    test_diagnosis()
    test_parser()
    await test_validation()
    await test_blueprint()
    await test_state_sync()
    await test_empty_competency_ids()
    test_shuffled_questions_and_options()
    print(f"\n=== {ok} PASS / {fail} FAIL ===")
    if fail:
        sys.exit(1)


asyncio.run(main())
