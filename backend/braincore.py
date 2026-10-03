"""Braincore — decision engine yang curriculum-aware.

Menyatukan: BKT mastery, misconception ledger, prasyarat, penjadwalan ingatan (FSRS-lite),
state kompetensi (NOT_EXPOSED..TRANSFERRED), pemilihan item adaptif, dan rekomendasi guru.
Braincore mendiagnosis & merekomendasi; keputusan penting tetap milik guru (human policy gate).
"""
import json
import math
import os
from datetime import datetime, timezone, timedelta
from typing import Any

from db import db

# --- Parameter registry dari coordination/braincore-contract.json (Single Source of Truth) ---
_CONTRACT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                              "coordination", "braincore-contract.json")
_CONTRACT: dict[str, Any] = {}
CONTRACT_LOADED = False
if os.path.isfile(_CONTRACT_PATH):
    try:
        with open(_CONTRACT_PATH, "r", encoding="utf-8") as _f:
            _CONTRACT = json.load(_f)
        CONTRACT_LOADED = True
    except Exception as _e:
        print(f"[braincore] ERROR: Gagal membaca kontrak kanonik di {_CONTRACT_PATH}: {_e}")
else:
    print(f"[braincore] WARNING: Berkas kontrak kanonik tidak ditemukan di {_CONTRACT_PATH}")

_COMP = _CONTRACT.get("namespaces", {}).get("competency_mastery", {})
_BKT = _COMP.get("bkt_params", {})
_GATE = _COMP.get("gate", {})
_IRT = _COMP.get("irt_3pl", {})
_DECAY = _COMP.get("decay", {})

# Parameter BKT untuk namespace 'competency_mastery' (deterministik, satu sumber kebenaran)
P_INIT = float(_BKT.get("p_init", 0.25))
P_LEARN = float(_BKT.get("p_learn", 0.18))
P_SLIP = float(_BKT.get("p_slip", 0.10))
P_GUESS = float(_BKT.get("p_guess", 0.20))
MASTERY_T = float(_GATE.get("mastery_threshold", 0.80))
DEVELOPING_T = float(_GATE.get("developing_threshold", 0.60))
MIN_CORRECT_FOR_MASTERY = int(_GATE.get("min_correct_for_mastery", 3))
RETENTION_DAYS = int(_GATE.get("retention_days", 3))

# Parameter IRT 3PL & Psikometri (paritas kanonik dengan client brain v3)
DISCRIMINATION = float(_IRT.get("discrimination", 1.5))
GUESS_FLOOR = float(_IRT.get("guess_floor", 0.25))
TARGET_SUCCESS = float(_IRT.get("target_success", 0.80))
BKT_HALF_LIFE_DAYS = float(_DECAY.get("half_life_days", 30.0))

# Privasi cohort (selaras dengan workers/api/teacher/braincore-bridge.js MIN_COHORT)
MIN_COHORT = int(_CONTRACT.get("privacy_and_cohort", {}).get("min_cohort", 5))

STATES = ["NOT_EXPOSED", "EXPOSED", "PRACTICING", "DEVELOPING", "MASTERED", "RETAINED", "TRANSFERRED"]
STATE_LABEL = {
    "NOT_EXPOSED": "Belum dipelajari", "EXPOSED": "Baru dikenalkan", "PRACTICING": "Perlu latihan",
    "DEVELOPING": "Sedang berkembang", "MASTERED": "Sudah dikuasai", "RETAINED": "Dikuasai & bertahan",
    "TRANSFERRED": "Bisa diterapkan di situasi baru",
}


def success_probability(ability: float, difficulty: float, discrimination: float = DISCRIMINATION) -> float:
    """Model IRT 3PL: P = c + (1 - c) / (1 + exp(-a * (theta - b))).

    Stabil secara numerik: dilindungi batas exp [-40, +40] untuk mencegah OverflowError.
    """
    a = max(0.01, float(discrimination or DISCRIMINATION))
    diff = float(ability or 0.0) - float(difficulty or 0.0)
    z = -a * diff
    if z > 40.0:
        latent = 0.0
    elif z < -40.0:
        latent = 1.0
    else:
        latent = 1.0 / (1.0 + math.exp(z))
    return GUESS_FLOOR + (1.0 - GUESS_FLOOR) * latent


def optimal_difficulty(ability: float, target_success: float = TARGET_SUCCESS, discrimination: float = DISCRIMINATION) -> float:
    """Inversi model 3PL: b = theta - logit((p - c) / (1 - c)) / a."""
    p = max(GUESS_FLOOR + 0.05, min(0.97, float(target_success or TARGET_SUCCESS)))
    a = max(0.01, float(discrimination or DISCRIMINATION))
    latent = max(0.01, min(0.99, (p - GUESS_FLOOR) / (1.0 - GUESS_FLOOR)))
    return round(float(ability or 0.0) - math.log(latent / (1.0 - latent)) / a, 3)


def bkt_decay(p: float | None, elapsed_days: float, half_life_days: float = BKT_HALF_LIFE_DAYS) -> float:
    """Model lupa eksponensial BKT-FSRS: L(t) = L_0 + (L_last - L_0) * exp(-dt / tau)."""
    try:
        p_val = float(P_INIT if p is None else p)
        if math.isnan(p_val) or math.isinf(p_val):
            p_val = P_INIT
    except (TypeError, ValueError):
        p_val = P_INIT

    try:
        dt = float(elapsed_days or 0.0)
        if math.isnan(dt) or math.isinf(dt) or dt <= 0:
            return round(p_val, 4)
    except (TypeError, ValueError):
        return round(p_val, 4)

    if p_val <= P_INIT:
        return round(p_val, 4)

    tau = max(1.0, float(half_life_days or BKT_HALF_LIFE_DAYS)) / math.log(2.0)
    decay_ratio = math.exp(-min(50.0, dt / tau))
    decayed = P_INIT + (p_val - P_INIT) * decay_ratio
    return round(max(0.01, min(0.99, decayed)), 4)


def now():
    return datetime.now(timezone.utc)


def aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def blank_state(student_id: str, competency_id: str) -> dict:
    return {"student_id": student_id, "competency_id": competency_id, "p_mastery": P_INIT,
            "state": "NOT_EXPOSED", "exposures": 0, "attempts": 0, "correct": 0, "streak": 0,
            "hints_used": 0, "retries": 0, "confidence_sum": 0.0, "confidence_n": 0,
            "mastered_at": None, "retained_at": None, "transferred_at": None,
            "stability_days": 1.0, "due_at": None, "last_at": None, "tp_id": None}


async def get_state(student_id: str, competency_id: str) -> dict:
    doc = await db.learner_competency.find_one(
        {"student_id": student_id, "competency_id": competency_id}, {"_id": 0})
    st = doc or blank_state(student_id, competency_id)
    last = aware(st.get("last_at"))
    if last:
        elapsed = max(0.0, (now() - last).total_seconds() / 86400)
        st["p_mastery_decayed"] = bkt_decay(st["p_mastery"], elapsed)
    else:
        st["p_mastery_decayed"] = st["p_mastery"]
    return st


async def get_states(student_id: str, competency_ids: list[str]) -> dict[str, dict]:
    """Ambil banyak state dalam SATU query $in (hindari N+1 get_state per kompetensi)."""
    cids = list(dict.fromkeys(competency_ids))
    docs = await db.learner_competency.find(
        {"student_id": student_id, "competency_id": {"$in": cids}}, {"_id": 0}).to_list(len(cids) or 1)
    by_cid = {d["competency_id"]: d for d in docs}
    out: dict[str, dict] = {}
    for cid in cids:
        st = by_cid.get(cid) or blank_state(student_id, cid)
        last = aware(st.get("last_at"))
        if last:
            elapsed = max(0.0, (now() - last).total_seconds() / 86400)
            st["p_mastery_decayed"] = bkt_decay(st["p_mastery"], elapsed)
        else:
            st["p_mastery_decayed"] = st["p_mastery"]
        out[cid] = st
    return out


def bkt_step(p: float, correct: bool, slip: float = P_SLIP, guess: float = P_GUESS,
             learn: float = P_LEARN) -> float:
    """Langkah BKT klasik (posterior Bayes lalu transisi belajar) — bentuk yang SAMA dengan
    FiezelMasteryBKT.bktStep() di klien; konstanta sengaja parameter supaya gerbang paritas
    bisa menjalankan kedua sisi atas angka yang sama (lihat unit_test.py::test_client_parity)."""
    try:
        p_val = float(P_INIT if p is None else p)
        if math.isnan(p_val) or math.isinf(p_val):
            p_val = P_INIT
    except (TypeError, ValueError):
        p_val = P_INIT
    p_val = max(0.001, min(0.999, p_val))
    s = max(0.01, min(0.49, float(slip if slip is not None else P_SLIP)))
    g = max(0.01, min(0.49, float(guess if guess is not None else P_GUESS)))
    l = max(0.0, min(0.50, float(learn if learn is not None else P_LEARN)))

    if correct:
        num = p_val * (1.0 - s)
        den = num + (1.0 - p_val) * g
    else:
        num = p_val * s
        den = num + (1.0 - p_val) * (1.0 - g)
    post = num / den if den > 0 else p_val
    return post + (1.0 - post) * l


def bkt_update(p: float, correct: bool, hints: int = 0, confidence: float | None = None) -> float:
    """Posterior BKT + koreksi kecil dari perilaku (hint & confidence adalah evidence tambahan)."""
    slip, guess = P_SLIP, P_GUESS
    h = max(0, int(hints or 0))
    # Hint hanya MELEMAHKAN bukti jawaban BENAR. Menaikkan slip pada jawaban SALAH justru
    # membuat "salah walau sudah dibantu" terbaca sebagai kelalaian, sehingga posterior turun
    # LEBIH SEDIKIT daripada salah tanpa bantuan (p=0.5, 2 hint: 0.38 vs 0.27) - arah yang
    # terbalik: gagal meski sudah diberi petunjuk adalah bukti belum-menguasai yang lebih kuat.
    if h > 0 and correct:
        slip = min(0.35, P_SLIP + 0.08 * h)   # benar setelah hint = bukti lebih lemah
    if confidence is not None:
        try:
            c = float(confidence)
            if not math.isnan(c):
                if correct and c <= 0.34:
                    guess = min(0.45, guess + 0.15)       # benar tapi tidak yakin -> mungkin menebak
                if not correct and c >= 0.9:
                    slip = max(0.04, slip - 0.05)         # salah tapi sangat yakin -> miskonsepsi, bukan lalai
        except (TypeError, ValueError):
            pass
    return max(0.01, min(0.99, bkt_step(p, correct, slip, guess, P_LEARN)))


def retrievability(st: dict) -> float | None:
    """Model paruh-waktu retensi memori: R(t) = 2^(-dt / S) == exp(-dt / tau) dengan tau = S / ln(2).

    Harmonis dengan formulasi FiezelCoreBrain.retrievability(halfLifeDays, ageDays) di klien.
    stability_days adalah half-life hari saat retensi ingatan turun ke 0.50.
    """
    last = aware(st.get("last_at"))
    if not last or st["state"] not in ("MASTERED", "RETAINED", "TRANSFERRED"):
        return None
    elapsed = max(0.0, (now() - last).total_seconds() / 86400)
    stability = max(0.5, float(st.get("stability_days") or 1.0))
    return round(math.pow(2.0, -elapsed / stability), 3)


def derive_state(st: dict) -> str:
    if st.get("attempts", 0) == 0:
        return "NOT_EXPOSED" if st.get("exposures", 0) == 0 else "EXPOSED"
    p = st.get("p_mastery_decayed")
    if p is None:
        p = st.get("p_mastery")
    try:
        p_val = float(P_INIT if p is None else p)
        if math.isnan(p_val) or math.isinf(p_val):
            p_val = P_INIT
    except (TypeError, ValueError):
        p_val = P_INIT

    still_mastered = p_val >= MASTERY_T and st.get("correct", 0) >= MIN_CORRECT_FOR_MASTERY
    if st.get("transferred_at") and still_mastered:
        return "TRANSFERRED"
    if st.get("retained_at") and still_mastered:
        return "RETAINED"
    if still_mastered:
        return "MASTERED"
    if p_val >= DEVELOPING_T:
        return "DEVELOPING"
    if st.get("attempts", 0) >= 2:
        return "PRACTICING"
    return "EXPOSED"


def effective_state(st: dict) -> str:
    """State kompetensi efektif setelah memperhitungkan peluruhan waktu (p_mastery_decayed)."""
    if "p_mastery_decayed" in st and st["p_mastery_decayed"] is not None:
        return derive_state(st)
    last = aware(st.get("last_at"))
    p_raw = st.get("p_mastery")
    if p_raw is None:
        p_raw = P_INIT
    if last:
        elapsed = max(0.0, (now() - last).total_seconds() / 86400)
        decayed_p = bkt_decay(p_raw, elapsed)
        return derive_state(dict(st, p_mastery_decayed=decayed_p))
    return derive_state(st)


CONF_VALUE = {"yakin": 1.0, "lumayan": 0.6, "tidak": 0.2}


def diagnose(correct: bool, confidence: float | None, time_ms: int, hints: int,
             expected_time: int, misconception_id: str | None) -> dict:
    try:
        t = int(time_ms or 0)
        exp_t = int(expected_time or 0)
        fast = t > 0 and exp_t > 0 and t < exp_t * 1000 * 0.35
    except (TypeError, ValueError):
        fast = False
    if correct:
        if confidence is not None and confidence <= 0.34:
            return {"label": "lucky_guess", "message": "Jawabanmu benar, tapi kamu belum yakin. Kita perkuat dulu bagian ini supaya benarnya bukan kebetulan."}
        if hints:
            return {"label": "assisted_correct", "message": "Benar dengan bantuan. Kita coba satu lagi tanpa petunjuk ya."}
        if fast and confidence is not None and confidence >= 0.9:
            return {"label": "fluent", "message": "Cepat dan yakin — tandanya sudah lancar."}
        return {"label": "knowledge", "message": "Benar. Pemahamanmu di bagian ini menguat."}
    if misconception_id:
        return {"label": "misconception", "message": "Ada satu langkah yang keliru berulang. Kita bereskan langkah itu dulu."}
    if confidence is not None and confidence >= 0.9:
        return {"label": "false_confidence", "message": "Kamu yakin, tapi jawabannya belum tepat. Justru ini bagian penting untuk diperjelas."}
    if fast:
        return {"label": "careless", "message": "Sepertinya terlalu cepat. Baca ulang soalnya perlahan, kamu bisa."}
    return {"label": "knowledge_gap", "message": "Belum tepat. Bagian ini memang perlu dilatih lagi — ayo pelan-pelan."}


async def apply_attempt(attempt: dict) -> dict:
    """Satu attempt -> pembaruan learner model + ledger miskonsepsi + jadwal review."""
    sid, cid = attempt["student_id"], attempt["competency_id"]
    st = await get_state(sid, cid)
    prev_state = st["state"]
    conf = attempt.get("confidence")
    st["attempts"] += 1
    st["exposures"] = max(st["exposures"], 1)
    st["hints_used"] += attempt.get("hints_used", 0)
    st["retries"] += 1 if attempt.get("retry_of") else 0
    if conf is not None:
        st["confidence_sum"] += conf
        st["confidence_n"] += 1
    correct = bool(attempt.get("correct"))
    if correct:
        st["correct"] += 1
        st["streak"] += 1
    else:
        st["streak"] = 0
    # m025-375 (audit braincore B6): lupa DULU, baru melangkah. p_mastery_decayed dihitung
    # get_state() tetapi dulu tidak dipakai - posterior melangkah dari nilai lama, jadi jeda
    # panjang tidak pernah tercatat dan satu jawaban salah bisa "memulihkan" mastery yang sudah
    # luntur. Sama persis dengan FiezelMasteryBKT.update() di klien.
    start = st.get("p_mastery_decayed", st["p_mastery"])
    st["p_mastery"] = round(bkt_update(start, correct, attempt.get("hints_used", 0), conf), 4)
    st["tp_id"] = attempt.get("tp_id") or st.get("tp_id")

    prev_mastered = aware(st.get("mastered_at"))
    new_state = derive_state(st)
    if new_state == "MASTERED" and not prev_mastered:
        st["mastered_at"] = now()
        st["stability_days"] = 3.0
        st["due_at"] = now() + timedelta(days=3)
    if prev_mastered and correct:
        # review sukses: retensi terbukti bila jaraknya cukup jauh dari saat mastery
        if (now() - prev_mastered).days >= RETENTION_DAYS and not st.get("retained_at"):
            st["retained_at"] = now()
        st["stability_days"] = round(min(180.0, (st.get("stability_days") or 3.0) * 1.9), 2)
        st["due_at"] = now() + timedelta(days=st["stability_days"])
    elif prev_mastered and not correct:
        st["stability_days"] = round(max(1.0, (st.get("stability_days") or 3.0) * 0.5), 2)
        st["due_at"] = now() + timedelta(days=st["stability_days"])
        st["retained_at"] = None
    if attempt.get("is_transfer") and correct and st["p_mastery"] >= MASTERY_T:
        st["transferred_at"] = st.get("transferred_at") or now()
    st["last_at"] = now()
    st["state"] = derive_state(st)
    # Attempt asli yang diobservasi server = konfirmasi sah; lepas tanda pending sync.
    st.pop("sync_pending_confirmation", None)
    # Nilai turunan waktu-baca: tidak disimpan, supaya DB tidak memegang angka basi.
    st.pop("p_mastery_decayed", None)
    await db.learner_competency.update_one({"student_id": sid, "competency_id": cid},
                                           {"$set": st}, upsert=True)

    if not correct and attempt.get("misconception_id"):
        await db.misconception_ledger.update_one(
            {"student_id": sid, "competency_id": cid, "misconception_id": attempt["misconception_id"]},
            {"$inc": {"frequency": 1},
             "$set": {"last_at": now(), "resolved": False, "tp_id": st.get("tp_id"),
                      "confidence": round(min(0.99, 0.4 + 0.2 * (attempt.get("confidence") or 0.5)), 2),
                      "evidence_question_id": attempt.get("question_id")},
             "$setOnInsert": {"first_at": now()}}, upsert=True)
    if correct and st["streak"] >= 2:
        await db.misconception_ledger.update_many(
            {"student_id": sid, "competency_id": cid, "resolved": False},
            {"$set": {"resolved": True, "resolved_at": now()}})
    return {"state": st, "state_changed": prev_state != st["state"], "previous_state": prev_state}


async def mark_exposure(student_id: str, competency_id: str, tp_id: str | None = None):
    st = await get_state(student_id, competency_id)
    if st["attempts"] == 0:
        st["exposures"] += 1
        st["state"] = derive_state(st)
        st["tp_id"] = tp_id or st.get("tp_id")
        st.pop("p_mastery_decayed", None)
        await db.learner_competency.update_one({"student_id": student_id, "competency_id": competency_id},
                                                {"$set": st}, upsert=True)


# ------------------- pemilihan item adaptif -------------------
# Batas pool eksplisit. Dulu to_list(500) SENYAP: kompetensi dengan >500 soal terbit akan
# kehilangan soal ke-501 dst tanpa jejak. Kini batasnya konstanta bernama, jauh di atas
# ukuran bank per kompetensi, dan _pool menandai bila tercapai supaya terlihat di log.
POOL_CAP = 2000


async def _pool(competency_ids: list[str], transfer: bool | None = None) -> list[dict]:
    q: dict[str, Any] = {"competency_id": {"$in": competency_ids}, "is_current": True, "status": "PUBLISHED"}
    if transfer is not None:
        q["is_transfer"] = transfer
    pool = await db.questions.find(q, {"_id": 0}).to_list(POOL_CAP)
    if len(pool) >= POOL_CAP:
        print(f"[braincore] pool {competency_ids} mencapai POOL_CAP={POOL_CAP}; sebagian soal tidak dipertimbangkan")
    return pool


def _q_difficulty(q: dict) -> float:
    d = q.get("difficulty")
    try:
        val = float(0.0 if d is None else d)
        return 0.0 if (math.isnan(val) or math.isinf(val)) else val
    except (TypeError, ValueError):
        return 0.0


async def next_best_item(student_id: str, competency_ids: list[str], served_ids: list[str],
                         allow_prerequisite: bool = True) -> dict | None:
    """Guru menentukan GOAL (kompetensi), Braincore menentukan PATH (item & urutan)."""
    if not competency_ids:
        return None
    states = await get_states(student_id, competency_ids)
    # m025-375 (B6): pilih dan tangga-kan dari penguasaan HARI INI (sudah meluruh), bukan dari
    # angka terakhir yang tercatat - kompetensi yang lama tidak disentuh memang lebih lemah.
    cur = {cid: states[cid].get("p_mastery_decayed", states[cid]["p_mastery"]) for cid in competency_ids}
    target = sorted(competency_ids, key=lambda c: (cur[c], states[c]["attempts"]))[0]
    st = states[target]

    # 1) prasyarat lemah -> turun ke prasyarat lebih dulu
    if allow_prerequisite and cur[target] < 0.5:
        comp = await db.curriculum_nodes.find_one({"id": target}, {"_id": 0}) or {}
        prereq_ids = list((comp.get("meta") or {}).get("prerequisite_competency_ids") or [])
        pstates = await get_states(student_id, prereq_ids) if prereq_ids else {}
        for pid in prereq_ids:
            pst = pstates[pid]
            if pst.get("p_mastery_decayed", pst["p_mastery"]) < 0.6:
                pool = [q for q in await _pool([pid], transfer=False) if q["question_id"] not in served_ids]
                if pool:
                    pool.sort(key=_q_difficulty)
                    pnode = await db.curriculum_nodes.find_one({"id": pid}, {"_id": 0}) or {}
                    return {"question": pool[0], "reason_code": "prerequisite",
                            "reason": f"Sebelum lanjut, kita kuatkan dulu dasarnya: {pnode.get('name', 'kompetensi prasyarat')}. Kalau bagian ini kokoh, sisanya jauh lebih mudah.",
                            "competency_id": pid, "phase": "warm-up"}

    p = cur[target]
    # 2) sudah kuat -> uji transfer
    if p >= MASTERY_T and st["correct"] >= MIN_CORRECT_FOR_MASTERY:
        pool = [q for q in await _pool([target], transfer=True) if q["question_id"] not in served_ids]
        if pool:
            pool.sort(key=_q_difficulty)
            return {"question": pool[0], "reason_code": "transfer",
                    "reason": "Kamu sudah cukup kuat di konsep dasarnya. Sekarang kita coba situasi yang sedikit berbeda untuk memastikan kamu benar-benar bisa memakainya.",
                    "competency_id": target, "phase": "transfer"}

    # 3) pencocokan kesulitan kontinu IRT 3PL desirable difficulty (target success ~0.80)
    theta = 1.0 + 4.0 * max(0.0, min(1.0, p))
    target_difficulty = optimal_difficulty(theta, target_success=TARGET_SUCCESS)
    pool = [q for q in await _pool([target], transfer=False) if q["question_id"] not in served_ids]
    if not pool:
        pool = [q for q in await _pool([target]) if q["question_id"] not in served_ids]
    if not pool:
        return None
    pool.sort(key=lambda q: (abs(_q_difficulty(q) - target_difficulty), _q_difficulty(q)))
    chosen = pool[0]
    if p < 0.35:
        reason = "Kita mulai dari soal yang pas untuk membangun pijakan — cukup menantang supaya kamu belajar, tapi masih sangat bisa kamu kerjakan."
    elif p < 0.72:
        reason = "Jawabanmu tadi menunjukkan bagian ini masih perlu diperkuat, jadi kita latihan satu lagi di tingkat yang sama."
    else:
        reason = "Kamu mulai stabil. Ini sedikit lebih menantang untuk memastikan pemahamanmu."
    phase = "practice" if p < 0.72 else "challenge"
    return {"question": chosen, "reason_code": "difficulty_ladder", "reason": reason,
            "competency_id": target, "phase": phase}


async def remediation_item(student_id: str, competency_id: str, served_ids: list[str]) -> dict | None:
    """Gagal dua kali -> cek prasyarat -> micro-remediation."""
    comp = await db.curriculum_nodes.find_one({"id": competency_id}, {"_id": 0}) or {}
    for pid in ((comp.get("meta") or {}).get("prerequisite_competency_ids") or []):
        pool = [q for q in await _pool([pid], transfer=False) if q["question_id"] not in served_ids]
        if pool:
            pool.sort(key=_q_difficulty)
            pnode = await db.curriculum_nodes.find_one({"id": pid}, {"_id": 0}) or {}
            return {"question": pool[0], "reason_code": "micro_remediation",
                    "reason": f"Kita mundur satu langkah ke {pnode.get('name', 'dasar')} dulu. Ini bagian yang membuat soal tadi terasa sulit.",
                    "competency_id": pid, "phase": "warm-up"}
    pool = [q for q in await _pool([competency_id], transfer=False) if q["question_id"] not in served_ids]
    pool.sort(key=_q_difficulty)
    if pool:
        return {"question": pool[0], "reason_code": "easier_retry",
                "reason": "Kita coba versi yang lebih sederhana dari ide yang sama.",
                "competency_id": competency_id, "phase": "practice"}
    return None


# ------------------- agregat kelas & rekomendasi guru -------------------
# Semua fungsi di bagian ini dulu N+1: satu query per TP, per murid, atau per kompetensi
# (coverage 18 murid x 12 TP = ratusan round-trip Mongo per klik guru). Kini tiap fungsi
# menarik data dalam hitungan query TETAP ($in / batch) lalu mengelompokkan di memori.
MASTERED_STATES = ("MASTERED", "RETAINED", "TRANSFERRED")


async def class_students(class_id: str) -> list[dict]:
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        return []
    ids = cls.get("student_ids") or []
    return await db.users.find({"user_id": {"$in": ids}}, {"_id": 0}).to_list(len(ids) or 1)


async def nodes_by_id(ids: list[str]) -> dict[str, dict]:
    ids = sorted({i for i in ids if i})
    if not ids:
        return {}
    rows = await db.curriculum_nodes.find({"id": {"$in": ids}}, {"_id": 0}).to_list(len(ids))
    return {r["id"]: r for r in rows}


async def _competencies_by_tp(tp_ids: list[str], active_only: bool = True) -> dict[str, list[dict]]:
    q: dict[str, Any] = {"type": "competency", "tp_id": {"$in": tp_ids}}
    if active_only:
        q["status"] = "active"
    comps = await db.curriculum_nodes.find(q, {"_id": 0}).to_list(max(1, len(tp_ids)) * 200)
    out: dict[str, list[dict]] = {t: [] for t in tp_ids}
    for c in comps:
        out.setdefault(c["tp_id"], []).append(c)
    return out


async def _class_records(sids: list[str], comp_ids: list[str]) -> dict[str, list[dict]]:
    """learner_competency untuk seluruh murid x kompetensi dalam SATU query, dikelompokkan per murid."""
    if not sids or not comp_ids:
        return {}
    recs = await db.learner_competency.find(
        {"student_id": {"$in": sids}, "competency_id": {"$in": comp_ids}},
        {"_id": 0}).to_list(len(sids) * len(comp_ids))
    by_student: dict[str, list[dict]] = {}
    for r in recs:
        p_raw = r.get("p_mastery")
        if p_raw is None:
            p_raw = P_INIT
        last = aware(r.get("last_at"))
        if last:
            elapsed = max(0.0, (now() - last).total_seconds() / 86400)
            r["p_mastery_decayed"] = bkt_decay(p_raw, elapsed)
        else:
            r["p_mastery_decayed"] = p_raw
        r["state"] = effective_state(r)
        by_student.setdefault(r["student_id"], []).append(r)
    return by_student


def _coverage_row(tp: dict, comp_ids: list[str], sids: list[str], by_student: dict[str, list[dict]],
                  n_pub: int, n_draft: int) -> dict:
    cset = set(comp_ids)
    rows_of = {s: [x for x in by_student.get(s, []) if x["competency_id"] in cset] for s in sids}
    exposed = sum(1 for s in sids if any(x["attempts"] > 0 or x["exposures"] > 0 for x in rows_of[s]))
    mastered = sum(1 for s in sids if rows_of[s] and all(
        next((x for x in rows_of[s] if x["competency_id"] == c), {}).get("state") in MASTERED_STATES
        for c in comp_ids))
    developing = sum(1 for s in sids if any(x["state"] == "DEVELOPING" for x in rows_of[s]))
    needs = sum(1 for s in sids if any(
        x["state"] in ("PRACTICING", "EXPOSED") and x.get("p_mastery_decayed", x["p_mastery"]) < DEVELOPING_T for x in rows_of[s]))

    # FATAL #1 FIX: Jangan mendilusi rerata dengan len(comp_ids) utuh.
    # Hanya hitung kompetensi yang SUDAH disentuh murid (attempts > 0 atau exposures > 0),
    # dibagi dengan jumlah kompetensi yang disentuh (len(touched)), memakai p_mastery_decayed.
    avg = []
    for s in sids:
        rows = rows_of.get(s, [])
        if not rows:
            continue
        touched = [x for x in rows if x.get("attempts", 0) > 0 or x.get("exposures", 0) > 0]
        if not touched:
            continue
        student_avg = sum(x.get("p_mastery_decayed", x.get("p_mastery", P_INIT)) for x in touched) / len(touched)
        avg.append(student_avg)
    mean_mastery_probability = round(sum(avg) / len(avg), 4) if avg else None

    # FATAL #2 FIX: Kembalikan mastery_pct sebagai legacy alias untuk mean_mastery_probability * 100
    # persis sesuai definisi koordinasi kanonik (coordination/braincore-contract.json),
    # menjaga integritas ambang batas >= 70 di teacher-console.js, rapor-share.js, dan learning-mission.js.
    mastery_pct = round(100.0 * mean_mastery_probability, 0) if mean_mastery_probability is not None else None

    # Proporsi murid tuntas dan belum tuntas atas SELURUH kompetensi TP
    students_mastered_pct = round(100.0 * mastered / exposed, 1) if exposed else 0.0
    students_not_mastered_pct = round(100.0 * max(0, exposed - mastered) / exposed, 1) if exposed else 0.0
    if n_pub == 0 and n_draft == 0:
        status, note = "MISSING", "Belum ada soal untuk TP ini."
    elif exposed == 0:
        status, note = "NOT_TAUGHT", "Belum ada evidence pembelajaran untuk TP ini."
    elif mean_mastery_probability is not None and mean_mastery_probability < 0.60:
        status = "GAP"
        # B7 fix: laporkan PROPORSI MURID nyata (bukan 100 − rerata posterior). "mastered"
        # menghitung murid yang menguasai SELURUH kompetensi TP; not_mastered adalah murid
        # yang sudah punya evidence tetapi belum tuntas.
        not_mastered = max(0, exposed - mastered)
        pct_students = round(100 * not_mastered / exposed) if exposed else 0
        note = (f"TP sudah dipelajari, tetapi {pct_students}% murid "
                f"({not_mastered} dari {exposed} yang aktif) belum mencapai mastery.")
    elif mean_mastery_probability is not None and mean_mastery_probability < 0.80:
        status, note = "DEVELOPING", "Sebagian murid masih berkembang."
    else:
        status, note = "GOOD", "Cakupan dan penguasaan sehat."
    return {"tp_id": tp["id"], "tp_code": tp["code"], "tp_name": tp["name"],
            "cp_id": tp.get("cp_id"), "competency_count": len(comp_ids),
            "questions_published": n_pub, "questions_pending": n_draft,
            "students_total": len(sids), "students_exposed": exposed,
            "students_mastered": mastered, "students_developing": developing,
            "students_needs_help": needs,
            "mean_mastery_probability": mean_mastery_probability,
            "students_mastered_pct": students_mastered_pct,
            "students_not_mastered_pct": students_not_mastered_pct,
            "mastery_pct": mastery_pct,
            "status": status, "note": note}


async def coverage_matrix(class_id: str, subject_id: str | None = None,
                          grade_id: str | None = None) -> dict:
    """Peta cakupan kurikulum: TP x (soal, exposure, mastery, gap) — bedakan belum diajarkan vs belum dikuasai.

    Jumlah query TETAP (5) berapa pun banyaknya TP/murid; dulu 4 query per TP."""
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0}) or {}
    subject_id = subject_id or cls.get("subject_id")
    grade_id = grade_id or cls.get("grade_id")
    q: dict[str, Any] = {"type": "tp", "status": "active"}
    if subject_id:
        q["subject_id"] = subject_id
    if grade_id:
        q["grade_id"] = grade_id
    tps = await db.curriculum_nodes.find(q, {"_id": 0}).sort("code", 1).to_list(500)
    tp_ids = [t["id"] for t in tps]
    students = await class_students(class_id)
    sids = [s["user_id"] for s in students]
    comps_by_tp = await _competencies_by_tp(tp_ids)
    all_comp_ids = [c["id"] for cs in comps_by_tp.values() for c in cs]
    by_student = await _class_records(sids, all_comp_ids)
    qrows = await db.questions.find({"tp_id": {"$in": tp_ids}, "is_current": True,
                                     "status": {"$in": ["PUBLISHED", "DRAFT", "REVIEW", "APPROVED"]}},
                                    {"_id": 0, "tp_id": 1, "status": 1}).to_list(POOL_CAP * 10)
    n_pub: dict[str, int] = {}
    n_draft: dict[str, int] = {}
    for r in qrows:
        bucket = n_pub if r.get("status") == "PUBLISHED" else n_draft
        bucket[r["tp_id"]] = bucket.get(r["tp_id"], 0) + 1
    rows = [_coverage_row(tp, [c["id"] for c in comps_by_tp.get(tp["id"], [])], sids, by_student,
                          n_pub.get(tp["id"], 0), n_draft.get(tp["id"], 0)) for tp in tps]
    return {
        "class_id": class_id, "subject_id": subject_id, "grade_id": grade_id, "rows": rows,
        "metadata": {
            "total_tps": len(tps),
            "is_truncated": len(tps) >= 500,
            "tp_limit": 500
        }
    }


def _tp_summary_from(tp_id: str, comps: list[dict], students: list[dict],
                     by_student: dict[str, list[dict]]) -> dict:
    comp_ids = {c["id"] for c in comps}
    out = {"mastered": [], "developing": [], "needs_remediation": [], "not_started": [],
           "ready_enrichment": [], "tp_id": tp_id, "competencies": comps}
    for s in students:
        recs = [r for r in by_student.get(s["user_id"], []) if r["competency_id"] in comp_ids]
        item = {"student_id": s["user_id"], "name": s.get("name"),
                "p": round(sum(r.get("p_mastery_decayed", r["p_mastery"]) for r in recs) / len(recs), 3) if recs else None,
                "states": {r["competency_id"]: r["state"] for r in recs}}
        if not recs or all(r["attempts"] == 0 for r in recs):
            out["not_started"].append(item)
        elif all(r["state"] in MASTERED_STATES for r in recs):
            (out["ready_enrichment"] if any(r["state"] in ("RETAINED", "TRANSFERRED") for r in recs)
             else out["mastered"]).append(item)
        elif item["p"] is not None and item["p"] < DEVELOPING_T:
            out["needs_remediation"].append(item)
        else:
            out["developing"].append(item)
    return out


async def student_tp_summaries(class_id: str, tp_ids: list[str]) -> dict[str, dict]:
    """Ringkasan per-murid untuk BANYAK TP sekaligus: 3 query, bukan (1 + murid) per TP."""
    students = await class_students(class_id)
    comps_by_tp = await _competencies_by_tp(tp_ids, active_only=False)
    all_comp_ids = [c["id"] for cs in comps_by_tp.values() for c in cs]
    by_student = await _class_records([s["user_id"] for s in students], all_comp_ids)
    return {t: _tp_summary_from(t, comps_by_tp.get(t, []), students, by_student) for t in tp_ids}


async def student_tp_summary(class_id: str, tp_id: str) -> dict:
    return (await student_tp_summaries(class_id, [tp_id]))[tp_id]


async def class_misconceptions(class_id: str, tp_id: str | None = None) -> list[dict]:
    students = await class_students(class_id)
    sids = [s["user_id"] for s in students]
    q: dict[str, Any] = {"student_id": {"$in": sids}, "resolved": False}
    if tp_id:
        q["tp_id"] = tp_id
    rows = await db.misconception_ledger.find(q, {"_id": 0}).to_list(5000)
    agg: dict[str, dict] = {}
    names = {s["user_id"]: s.get("name") for s in students}
    for r in rows:
        key = f"{r['competency_id']}::{r['misconception_id']}"
        a = agg.setdefault(key, {"competency_id": r["competency_id"], "misconception_id": r["misconception_id"],
                                 "tp_id": r.get("tp_id"), "students": [], "frequency": 0,
                                 "last_at": r.get("last_at")})
        if not any(s["student_id"] == r["student_id"] for s in a["students"]):
            a["students"].append({"student_id": r["student_id"], "name": names.get(r["student_id"])})
        a["frequency"] += r.get("frequency", 1)
        if r.get("last_at") and (not a["last_at"] or aware(r["last_at"]) > aware(a["last_at"])):
            a["last_at"] = r["last_at"]
    out = list(agg.values())
    nodes = await nodes_by_id([a["competency_id"] for a in out])
    cohort_suppressed = len(sids) > 0 and len(sids) < MIN_COHORT
    for a in out:
        a["competency_name"] = nodes.get(a["competency_id"], {}).get("name")
        a["student_count"] = len(a["students"])
        a["cohort_suppressed"] = cohort_suppressed
        if cohort_suppressed:
            # Agregat kelas di bawah MIN_COHORT disamarkan detail individunya (prinsip privacy-by-design)
            # Menggunakan ID anonim unik per murid per miskonsepsi agar tidak bentrok saat deduplikasi kelompok
            a["students"] = [{
                "student_id": f"anon_{a['competency_id']}_{a['misconception_id']}_{i+1}",
                "name": f"Murid {i+1}",
                "is_redacted": True
            } for i in range(len(a["students"]))]
        a["headline"] = f"{len(a['students'])} dari {len(sids)} murid masih keliru pada {a['misconception_id']}"
    out.sort(key=lambda x: -x["student_count"])
    return out


async def due_reviews(student_id: str) -> list[dict]:
    rows = await db.learner_competency.find({"student_id": student_id,
                                             "state": {"$in": list(MASTERED_STATES)}},
                                            {"_id": 0}).to_list(1000)
    due_rows = []
    for r in rows:
        due = aware(r.get("due_at"))
        rt = retrievability(r)
        if (due and due <= now()) or (rt is not None and rt < 0.85):
            due_rows.append((r, rt))
    nodes = await nodes_by_id([r["competency_id"] for r, _ in due_rows])
    return [{"competency_id": r["competency_id"], "name": nodes.get(r["competency_id"], {}).get("name"),
             "tp_id": r.get("tp_id"), "retrievability": rt, "due_at": r.get("due_at")}
            for r, rt in due_rows]


async def recommendations(class_id: str) -> list[dict]:
    """“Apa yang harus saya lakukan sekarang?” — maksimal 3 tindakan, tiap tindakan executable."""
    cov = await coverage_matrix(class_id)
    mis = await class_misconceptions(class_id)
    recs: list[dict] = []
    gaps = [r for r in cov["rows"] if r["status"] == "GAP"]
    gaps.sort(key=lambda r: (r["mastery_pct"] or 0))
    ready_rows = [r for r in cov["rows"] if r["status"] in ("GOOD", "DEVELOPING") and r["students_mastered"]]
    # Satu batch ringkasan untuk semua TP yang dibutuhkan (dulu: 1 + N murid query per TP).
    need_ids = ([gaps[0]["tp_id"]] if gaps else []) + [r["tp_id"] for r in ready_rows]
    summaries = await student_tp_summaries(class_id, sorted(set(need_ids))) if need_ids else {}
    if gaps:
        g = gaps[0]
        who = summaries[g["tp_id"]]["needs_remediation"]
        recs.append({"priority": 1, "kind": "remedial", "tp_id": g["tp_id"], "tp_code": g["tp_code"],
                     "title": f"Remedial {g['tp_code']} untuk {len(who)} murid",
                     "why": g["note"], "student_ids": [w["student_id"] for w in who],
                     "student_names": [w["name"] for w in who],
                     "actions": [{"label": "Buat Remedial", "endpoint": "/api/assessments/from-recommendation",
                                  "payload": {"kind": "remedial", "class_id": class_id, "tp_id": g["tp_id"],
                                              "student_ids": [w["student_id"] for w in who]}},
                                 {"label": "Buat Kelompok", "endpoint": "/api/braincore/groups",
                                  "payload": {"class_id": class_id, "tp_id": g["tp_id"]}}]})
    if mis:
        m = mis[0]
        recs.append({"priority": 2, "kind": "review_concept", "tp_id": m.get("tp_id"),
                     "title": f"Bahas ulang konsep {m['competency_name']} untuk {m['student_count']} murid",
                     "why": m["headline"], "student_ids": [s["student_id"] for s in m["students"]],
                     "student_names": [s["name"] for s in m["students"]],
                     "actions": [{"label": "Buat Latihan Terarah", "endpoint": "/api/assessments/from-recommendation",
                                  "payload": {"kind": "practice", "class_id": class_id, "tp_id": m.get("tp_id"),
                                              "competency_id": m["competency_id"],
                                              "student_ids": [s["student_id"] for s in m["students"]]}},
                                 {"label": "Review Konsep di Kelas", "endpoint": "/api/braincore/lesson-plan",
                                  "payload": {"class_id": class_id, "tp_id": m.get("tp_id"), "minutes": 45}}]})
    ready = []
    for r in ready_rows:
        d = summaries[r["tp_id"]]
        cand = d["mastered"] + d["ready_enrichment"]
        if cand:
            ready.append((r, cand))
    if ready:
        r, cand = max(ready, key=lambda x: len(x[1]))
        recs.append({"priority": 3, "kind": "enrichment", "tp_id": r["tp_id"], "tp_code": r["tp_code"],
                     "title": f"Pengayaan {r['tp_code']} untuk {len(cand)} murid",
                     "why": "Murid ini sudah menguasai TP dan siap tantangan transfer.",
                     "student_ids": [c["student_id"] for c in cand],
                     "student_names": [c["name"] for c in cand],
                     "actions": [{"label": "Buat Pengayaan", "endpoint": "/api/assessments/from-recommendation",
                                  "payload": {"kind": "enrichment", "class_id": class_id, "tp_id": r["tp_id"],
                                              "student_ids": [c["student_id"] for c in cand]}}]})
    missing = [r for r in cov["rows"] if r["status"] in ("MISSING", "NOT_TAUGHT")]
    if missing and len(recs) < 3:
        m = missing[0]
        recs.append({"priority": 4, "kind": "curriculum_gap", "tp_id": m["tp_id"], "tp_code": m["tp_code"],
                     "title": f"{m['tp_code']} belum tersentuh",
                     "why": m["note"], "student_ids": [], "student_names": [],
                     "actions": [{"label": "Tambah Soal", "endpoint": "/api/questions", "payload": {"tp_id": m["tp_id"]}},
                                 {"label": "Buat Diagnostik", "endpoint": "/api/assessments/from-recommendation",
                                  "payload": {"kind": "diagnostic", "class_id": class_id, "tp_id": m["tp_id"]}}]})
    return recs[:3] if len(recs) >= 3 else recs


async def dynamic_groups(class_id: str, tp_id: str) -> dict:
    d = await student_tp_summary(class_id, tp_id)
    mis = await class_misconceptions(class_id, tp_id)
    groups = []
    used: set[str] = set()
    for m in mis[:2]:
        members = [s for s in m["students"] if s["student_id"] not in used]
        if members:
            used.update(s["student_id"] for s in members)
            groups.append({"name": f"Kelompok miskonsepsi — {m['misconception_id']}",
                           "focus": m["competency_name"],
                           "reason": f"{len(members)} murid menunjukkan pola keliru {m['misconception_id']}",
                           "members": members, "suggested_action": "review_concept"})
    prereq = [s for s in d["needs_remediation"] if s["student_id"] not in used]
    if prereq:
        used.update(s["student_id"] for s in prereq)
        groups.append({"name": "Kelompok prasyarat", "focus": "Dasar yang belum kokoh",
                       "reason": "Posterior mastery di bawah 0,6 — perlu mundur ke prasyarat.",
                       "members": [{"student_id": s["student_id"], "name": s["name"]} for s in prereq],
                       "suggested_action": "remedial"})
    ontrack = [s for s in d["developing"] if s["student_id"] not in used]
    if ontrack:
        used.update(s["student_id"] for s in ontrack)
        groups.append({"name": "Kelompok on track", "focus": "Latihan mandiri adaptif",
                       "reason": "Sedang berkembang, cukup latihan bertahap.",
                       "members": [{"student_id": s["student_id"], "name": s["name"]} for s in ontrack],
                       "suggested_action": "practice"})
    rich = [s for s in (d["mastered"] + d["ready_enrichment"]) if s["student_id"] not in used]
    if rich:
        groups.append({"name": "Kelompok pengayaan", "focus": "Transfer & tantangan",
                       "reason": "Sudah menguasai TP ini.",
                       "members": [{"student_id": s["student_id"], "name": s["name"]} for s in rich],
                       "suggested_action": "enrichment"})
    notstarted = [s for s in d["not_started"] if s["student_id"] not in used]
    if notstarted:
        groups.append({"name": "Belum ada evidence", "focus": "Diagnostik awal",
                       "reason": "Belum ada bukti belajar untuk TP ini.",
                       "members": [{"student_id": s["student_id"], "name": s["name"]} for s in notstarted],
                       "suggested_action": "diagnostic"})
    return {"tp_id": tp_id, "class_id": class_id, "groups": groups}


async def lesson_plan(class_id: str, tp_id: str, minutes: int = 45) -> dict:
    """Rencana mengajar berbasis evidence kelas, bukan template generik."""
    d = await student_tp_summary(class_id, tp_id)
    mis = await class_misconceptions(class_id, tp_id)
    tp = await db.curriculum_nodes.find_one({"id": tp_id}, {"_id": 0}) or {}
    total = sum(len(d[k]) for k in ("mastered", "developing", "needs_remediation",
                                    "not_started", "ready_enrichment"))
    need = len(d["needs_remediation"]) + len(d["not_started"])
    rich = len(d["mastered"]) + len(d["ready_enrichment"])
    share = {"warmup": 0.11, "concept": 0.16, "guided": 0.22, "adaptive": 0.22,
             "groups": 0.16, "transfer": 0.09, "exit": 0.04}
    if need > total * 0.5:
        share.update({"concept": 0.22, "guided": 0.26, "adaptive": 0.16, "groups": 0.16})
    elif rich > total * 0.5:
        share.update({"concept": 0.09, "guided": 0.13, "adaptive": 0.27, "transfer": 0.18})
    blocks, t = [], 0
    plan_meta = [
        ("warmup", "Warm-up retrieval", "Tanya 3 pertanyaan cepat dari materi sebelumnya untuk mengaktifkan ingatan."),
        ("concept", "Penjelasan konsep",
         (f"Fokus pada miskonsepsi utama: {mis[0]['misconception_id']} ({mis[0]['student_count']} murid)."
          if mis else f"Perkenalkan inti {tp.get('name', 'TP ini')} dengan satu contoh konkret.")),
        ("guided", "Latihan terbimbing", "Kerjakan 2 soal bersama; minta murid menjelaskan langkahnya."),
        ("adaptive", "Latihan adaptif individual",
         f"Buka sesi FIEZEL: {total} murid mendapat jalur berbeda sesuai evidence masing-masing."),
        ("groups", "Kelompok dinamis",
         f"{need} murid ke kelompok prasyarat/remedial, {rich} murid ke pengayaan transfer."),
        ("transfer", "Cek transfer", "Beri 1 soal konteks baru; ini yang membedakan hafalan dari pemahaman."),
        ("exit", "Exit ticket", "1 pertanyaan singkat — hasilnya masuk dashboard sebagai evidence."),
    ]
    for key, title, detail in plan_meta:
        dur = max(2, round(minutes * share[key]))
        blocks.append({"from": t, "to": min(minutes, t + dur), "minutes": dur,
                       "title": title, "detail": detail, "phase": key})
        t += dur
    if blocks:
        blocks[-1]["to"] = minutes
    return {"tp_id": tp_id, "tp_name": tp.get("name"), "class_id": class_id, "minutes": minutes,
            "class_snapshot": {"total": total, "needs_help": need, "ready_enrichment": rich,
                               "developing": len(d["developing"])},
            "blocks": blocks,
            "evidence_based": True,
            "top_misconception": mis[0] if mis else None}


async def learning_passport(student_id: str) -> dict:
    recs = await db.learner_competency.find({"student_id": student_id}, {"_id": 0}).to_list(2000)
    user = await db.users.find_one({"user_id": student_id}, {"_id": 0}) or {}
    # Dulu 2-3 query PER kompetensi (comp, tp, cp). Kini dua batch $in: kompetensi, lalu TP+CP.
    comps = await nodes_by_id([r["competency_id"] for r in recs])
    parent_ids = [c.get("tp_id") for c in comps.values()] + [c.get("cp_id") for c in comps.values()] \
        + [r.get("tp_id") for r in recs]
    parents = await nodes_by_id(parent_ids)
    by_tp: dict[str, dict] = {}
    for r in recs:
        p_raw = r.get("p_mastery")
        if p_raw is None:
            p_raw = P_INIT
        last = aware(r.get("last_at"))
        if last:
            elapsed = max(0.0, (now() - last).total_seconds() / 86400)
            r["p_mastery_decayed"] = bkt_decay(p_raw, elapsed)
        else:
            r["p_mastery_decayed"] = p_raw
        r["state"] = effective_state(r)

        comp = comps.get(r["competency_id"], {})
        tp_id = comp.get("tp_id") or r.get("tp_id") or "lainnya"
        tp = parents.get(tp_id, {})
        row = by_tp.setdefault(tp_id, {"tp_id": tp_id, "tp_code": tp.get("code"), "tp_name": tp.get("name"),
                                        "cp_name": None, "competencies": []})
        if row["cp_name"] is None and comp.get("cp_id"):
            row["cp_name"] = parents.get(comp["cp_id"], {}).get("name")
        row["competencies"].append({
            "competency_id": r["competency_id"], "name": comp.get("name"),
            "state": r["state"], "state_label": STATE_LABEL.get(r["state"], r["state"]),
            "p_mastery": r.get("p_mastery") or P_INIT, "p_mastery_decayed": r.get("p_mastery_decayed") or P_INIT,
            "attempts": r.get("attempts", 0), "correct": r.get("correct", 0),
            "retrievability": retrievability(r), "due_at": r.get("due_at"),
            "transferred": bool(r.get("transferred_at")), "retained": bool(r.get("retained_at"))})
    rows = list(by_tp.values())
    for row in rows:
        cs = row["competencies"]
        def _safe_p(c):
            v = c.get("p_mastery_decayed")
            if v is None:
                v = c.get("p_mastery")
            try:
                val = float(P_INIT if v is None else v)
                return P_INIT if math.isnan(val) else val
            except (TypeError, ValueError):
                return P_INIT
        row["mastery_pct"] = round(100 * sum(_safe_p(c) for c in cs) / len(cs)) if cs else 0
        strongest = max(cs, key=_safe_p) if cs else None
        weakest = min(cs, key=_safe_p) if cs else None
        target_p = _safe_p(weakest) if weakest else 0.0
        row["next_target"] = weakest["name"] if weakest and target_p < MASTERY_T else (
            f"Uji transfer {strongest['name']}" if strongest else None)
    due = await due_reviews(student_id)
    mis = await db.misconception_ledger.find({"student_id": student_id, "resolved": False},
                                              {"_id": 0}).to_list(200)
    return {"student_id": student_id, "name": user.get("name"), "rows": rows,
            "due_reviews": due, "open_misconceptions": mis,
            "totals": {"competencies": len(recs),
                       "mastered": sum(1 for r in recs if r["state"] in MASTERED_STATES),
                       "transferred": sum(1 for r in recs if r.get("transferred_at")),
                       "retained": sum(1 for r in recs if r.get("retained_at"))}}


async def evidence_graph(student_id: str, limit: int = 100) -> dict:
    attempts = await db.attempts.find({"student_id": student_id}, {"_id": 0}).sort("at", -1).to_list(limit)
    nodes, edges = {}, []
    nodes[student_id] = {"id": student_id, "type": "student"}
    for a in attempts:
        aid = a["id"]
        nodes[aid] = {"id": aid, "type": "attempt", "correct": a.get("correct"),
                      "confidence": a.get("confidence"), "time_ms": a.get("time_ms"),
                      "hints_used": a.get("hints_used"), "retry_of": a.get("retry_of"),
                      "is_transfer": a.get("is_transfer"), "at": a.get("at")}
        edges.append({"from": student_id, "to": aid, "rel": "made"})
        for key, typ in (("question_id", "question"), ("competency_id", "competency"),
                         ("tp_id", "tp"), ("cp_id", "cp"), ("curriculum_id", "curriculum"),
                         ("misconception_id", "misconception")):
            v = a.get(key)
            if v:
                nodes.setdefault(v, {"id": v, "type": typ})
                edges.append({"from": aid, "to": v, "rel": f"evidence_for_{typ}"})
    return {"nodes": list(nodes.values()), "edges": edges, "attempt_count": len(attempts)}
