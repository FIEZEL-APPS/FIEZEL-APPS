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


async def main():
    test_bkt()
    test_irt_3pl()
    test_bkt_decay()
    test_states()
    test_diagnosis()
    test_parser()
    await test_validation()
    await test_blueprint()
    await test_state_sync()
    print(f"\n=== {ok} PASS / {fail} FAIL ===")
    if fail:
        sys.exit(1)


asyncio.run(main())
