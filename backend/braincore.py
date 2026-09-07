"""Braincore — decision engine yang curriculum-aware.

Menyatukan: BKT mastery, misconception ledger, prasyarat, penjadwalan ingatan (FSRS-lite),
state kompetensi (NOT_EXPOSED..TRANSFERRED), pemilihan item adaptif, dan rekomendasi guru.
Braincore mendiagnosis & merekomendasi; keputusan penting tetap milik guru (human policy gate).
"""
import math
from datetime import datetime, timezone, timedelta
from typing import Any

from db import db

# --- parameter BKT (deterministik, satu sumber kebenaran) ---
P_INIT, P_LEARN, P_SLIP, P_GUESS = 0.25, 0.18, 0.10, 0.20
MASTERY_T, DEVELOPING_T = 0.80, 0.60
MIN_CORRECT_FOR_MASTERY = 3
RETENTION_DAYS = 3

STATES = ["NOT_EXPOSED", "EXPOSED", "PRACTICING", "DEVELOPING", "MASTERED", "RETAINED", "TRANSFERRED"]
STATE_LABEL = {
    "NOT_EXPOSED": "Belum dipelajari", "EXPOSED": "Baru dikenalkan", "PRACTICING": "Perlu latihan",
    "DEVELOPING": "Sedang berkembang", "MASTERED": "Sudah dikuasai", "RETAINED": "Dikuasai & bertahan",
    "TRANSFERRED": "Bisa diterapkan di situasi baru",
}


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
    return doc or blank_state(student_id, competency_id)


def bkt_update(p: float, correct: bool, hints: int = 0, confidence: float | None = None) -> float:
    """Posterior BKT + koreksi kecil dari perilaku (hint & confidence adalah evidence tambahan)."""
    slip, guess = P_SLIP, P_GUESS
    if hints:
        slip = min(0.35, P_SLIP + 0.08 * hints)   # benar setelah hint = bukti lebih lemah
    if confidence is not None:
        if correct and confidence <= 0.34:
            guess = min(0.45, guess + 0.15)       # benar tapi tidak yakin -> mungkin menebak
        if not correct and confidence >= 0.9:
            slip = max(0.04, slip - 0.05)         # salah tapi sangat yakin -> miskonsepsi, bukan lalai
    if correct:
        num = p * (1 - slip)
        den = num + (1 - p) * guess
    else:
        num = p * slip
        den = num + (1 - p) * (1 - guess)
    post = num / den if den else p
    return max(0.01, min(0.99, post + (1 - post) * P_LEARN))


def retrievability(st: dict) -> float | None:
    last = aware(st.get("last_at"))
    if not last or st["state"] not in ("MASTERED", "RETAINED", "TRANSFERRED"):
        return None
    elapsed = max(0.0, (now() - last).total_seconds() / 86400)
    return round(math.exp(-elapsed / max(0.5, st.get("stability_days") or 1.0)), 3)


def derive_state(st: dict) -> str:
    if st["attempts"] == 0:
        return "NOT_EXPOSED" if st["exposures"] == 0 else "EXPOSED"
    if st.get("transferred_at"):
        return "TRANSFERRED"
    if st.get("retained_at"):
        return "RETAINED"
    if st["p_mastery"] >= MASTERY_T and st["correct"] >= MIN_CORRECT_FOR_MASTERY:
        return "MASTERED"
    if st["p_mastery"] >= DEVELOPING_T:
        return "DEVELOPING"
    if st["attempts"] >= 2:
        return "PRACTICING"
    return "EXPOSED"


CONF_VALUE = {"yakin": 1.0, "lumayan": 0.6, "tidak": 0.2}


def diagnose(correct: bool, confidence: float | None, time_ms: int, hints: int,
             expected_time: int, misconception_id: str | None) -> dict:
    """Bedakan lucky guess / false confidence / knowledge / careless / misconception."""
    fast = time_ms and expected_time and time_ms < expected_time * 1000 * 0.35
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
    st["p_mastery"] = round(bkt_update(st["p_mastery"], correct, attempt.get("hints_used", 0), conf), 4)
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
        await db.learner_competency.update_one({"student_id": student_id, "competency_id": competency_id},
                                                {"$set": st}, upsert=True)


# ------------------- pemilihan item adaptif -------------------
async def _pool(competency_ids: list[str], transfer: bool | None = None) -> list[dict]:
    q: dict[str, Any] = {"competency_id": {"$in": competency_ids}, "is_current": True, "status": "PUBLISHED"}
    if transfer is not None:
        q["is_transfer"] = transfer
    return await db.questions.find(q, {"_id": 0}).to_list(500)


async def next_best_item(student_id: str, competency_ids: list[str], served_ids: list[str],
                         allow_prerequisite: bool = True) -> dict | None:
    """Guru menentukan GOAL (kompetensi), Braincore menentukan PATH (item & urutan)."""
    states = {cid: await get_state(student_id, cid) for cid in competency_ids}
    target = sorted(competency_ids, key=lambda c: (states[c]["p_mastery"], states[c]["attempts"]))[0]
    st = states[target]

    # 1) prasyarat lemah -> turun ke prasyarat lebih dulu
    if allow_prerequisite and st["p_mastery"] < 0.5:
        comp = await db.curriculum_nodes.find_one({"id": target}, {"_id": 0}) or {}
        for pid in ((comp.get("meta") or {}).get("prerequisite_competency_ids") or []):
            pst = await get_state(student_id, pid)
            if pst["p_mastery"] < 0.6:
                pool = [q for q in await _pool([pid], transfer=False) if q["question_id"] not in served_ids]
                if pool:
                    pool.sort(key=lambda q: q["difficulty"])
                    pnode = await db.curriculum_nodes.find_one({"id": pid}, {"_id": 0}) or {}
                    return {"question": pool[0], "reason_code": "prerequisite",
                            "reason": f"Sebelum lanjut, kita kuatkan dulu dasarnya: {pnode.get('name', 'kompetensi prasyarat')}. Kalau bagian ini kokoh, sisanya jauh lebih mudah.",
                            "competency_id": pid, "phase": "warm-up"}

    p = st["p_mastery"]
    # 2) sudah kuat -> uji transfer
    if p >= MASTERY_T and st["correct"] >= MIN_CORRECT_FOR_MASTERY:
        pool = [q for q in await _pool([target], transfer=True) if q["question_id"] not in served_ids]
        if pool:
            pool.sort(key=lambda q: q["difficulty"])
            return {"question": pool[0], "reason_code": "transfer",
                    "reason": "Kamu sudah cukup kuat di konsep dasarnya. Sekarang kita coba situasi yang sedikit berbeda untuk memastikan kamu benar-benar bisa memakainya.",
                    "competency_id": target, "phase": "transfer"}

    # 3) tangga kesulitan sesuai posterior
    want = 1 if p < 0.35 else 2 if p < 0.55 else 3 if p < 0.72 else 4
    pool = [q for q in await _pool([target], transfer=False) if q["question_id"] not in served_ids]
    if not pool:
        pool = [q for q in await _pool([target]) if q["question_id"] not in served_ids]
    if not pool:
        return None
    pool.sort(key=lambda q: (abs(q["difficulty"] - want), q["difficulty"]))
    chosen = pool[0]
    if p < 0.35:
        reason = "Kita mulai dari soal yang lebih ringan supaya kamu dapat pijakan yang jelas."
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
            pool.sort(key=lambda q: q["difficulty"])
            pnode = await db.curriculum_nodes.find_one({"id": pid}, {"_id": 0}) or {}
            return {"question": pool[0], "reason_code": "micro_remediation",
                    "reason": f"Kita mundur satu langkah ke {pnode.get('name', 'dasar')} dulu. Ini bagian yang membuat soal tadi terasa sulit.",
                    "competency_id": pid, "phase": "warm-up"}
    pool = [q for q in await _pool([competency_id], transfer=False) if q["question_id"] not in served_ids]
    pool.sort(key=lambda q: q["difficulty"])
    if pool:
        return {"question": pool[0], "reason_code": "easier_retry",
                "reason": "Kita coba versi yang lebih sederhana dari ide yang sama.",
                "competency_id": competency_id, "phase": "practice"}
    return None


# ------------------- agregat kelas & rekomendasi guru -------------------
async def class_students(class_id: str) -> list[dict]:
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        return []
    ids = cls.get("student_ids") or []
    return await db.users.find({"user_id": {"$in": ids}}, {"_id": 0}).to_list(500)


async def coverage_matrix(class_id: str, subject_id: str | None = None,
                          grade_id: str | None = None) -> dict:
    """Peta cakupan kurikulum: TP x (soal, exposure, mastery, gap) — bedakan belum diajarkan vs belum dikuasai."""
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0}) or {}
    subject_id = subject_id or cls.get("subject_id")
    grade_id = grade_id or cls.get("grade_id")
    q: dict[str, Any] = {"type": "tp", "status": "active"}
    if subject_id:
        q["subject_id"] = subject_id
    if grade_id:
        q["grade_id"] = grade_id
    tps = await db.curriculum_nodes.find(q, {"_id": 0}).sort("code", 1).to_list(500)
    students = await class_students(class_id)
    sids = [s["user_id"] for s in students]
    rows = []
    for tp in tps:
        comps = await db.curriculum_nodes.find({"type": "competency", "tp_id": tp["id"], "status": "active"},
                                                {"_id": 0, "id": 1, "name": 1}).to_list(200)
        comp_ids = [c["id"] for c in comps]
        n_pub = await db.questions.count_documents({"tp_id": tp["id"], "is_current": True, "status": "PUBLISHED"})
        n_draft = await db.questions.count_documents({"tp_id": tp["id"], "is_current": True,
                                                       "status": {"$in": ["DRAFT", "REVIEW", "APPROVED"]}})
        recs = await db.learner_competency.find({"student_id": {"$in": sids},
                                                 "competency_id": {"$in": comp_ids}}, {"_id": 0}).to_list(5000)
        by_student: dict[str, list] = {}
        for r in recs:
            by_student.setdefault(r["student_id"], []).append(r)
        exposed = sum(1 for s in sids if any(x["attempts"] > 0 or x["exposures"] > 0
                                             for x in by_student.get(s, [])))
        def agg(sid):
            xs = by_student.get(sid, [])
            if not xs or not comp_ids:
                return None
            return sum(x["p_mastery"] for x in xs) / len(comp_ids)
        mastered = sum(1 for s in sids if all(
            (next((x for x in by_student.get(s, []) if x["competency_id"] == c), {}).get("state")
             in ("MASTERED", "RETAINED", "TRANSFERRED")) for c in comp_ids) and by_student.get(s))
        developing = sum(1 for s in sids if by_student.get(s) and any(
            x["state"] in ("DEVELOPING",) for x in by_student.get(s, [])) and s not in [])
        needs = sum(1 for s in sids if by_student.get(s) and any(
            x["state"] in ("PRACTICING", "EXPOSED") and x["p_mastery"] < DEVELOPING_T
            for x in by_student.get(s, [])))
        avg = [agg(s) for s in sids]
        avg = [a for a in avg if a is not None]
        mastery_pct = round(100 * (sum(avg) / len(avg)), 0) if avg else None
        if n_pub == 0 and n_draft == 0:
            status, note = "MISSING", "Belum ada soal untuk TP ini."
        elif exposed == 0:
            status, note = "NOT_TAUGHT", "Belum ada evidence pembelajaran untuk TP ini."
        elif mastery_pct is not None and mastery_pct < 60:
            status = "GAP"
            note = f"TP sudah dipelajari, tetapi {100 - int(mastery_pct)}% murid belum mencapai mastery."
        elif mastery_pct is not None and mastery_pct < 80:
            status, note = "DEVELOPING", "Sebagian murid masih berkembang."
        else:
            status, note = "GOOD", "Cakupan dan penguasaan sehat."
        rows.append({"tp_id": tp["id"], "tp_code": tp["code"], "tp_name": tp["name"],
                     "cp_id": tp.get("cp_id"), "competency_count": len(comp_ids),
                     "questions_published": n_pub, "questions_pending": n_draft,
                     "students_total": len(sids), "students_exposed": exposed,
                     "students_mastered": mastered, "students_developing": developing,
                     "students_needs_help": needs, "mastery_pct": mastery_pct,
                     "status": status, "note": note})
    return {"class_id": class_id, "subject_id": subject_id, "grade_id": grade_id, "rows": rows}


async def student_tp_summary(class_id: str, tp_id: str) -> dict:
    comps = await db.curriculum_nodes.find({"type": "competency", "tp_id": tp_id}, {"_id": 0}).to_list(200)
    comp_ids = [c["id"] for c in comps]
    students = await class_students(class_id)
    out = {"mastered": [], "developing": [], "needs_remediation": [], "not_started": [],
           "ready_enrichment": [], "tp_id": tp_id, "competencies": comps}
    for s in students:
        recs = await db.learner_competency.find({"student_id": s["user_id"],
                                                 "competency_id": {"$in": comp_ids}}, {"_id": 0}).to_list(200)
        item = {"student_id": s["user_id"], "name": s.get("name"),
                "p": round(sum(r["p_mastery"] for r in recs) / len(recs), 3) if recs else None,
                "states": {r["competency_id"]: r["state"] for r in recs}}
        if not recs or all(r["attempts"] == 0 for r in recs):
            out["not_started"].append(item)
        elif all(r["state"] in ("MASTERED", "RETAINED", "TRANSFERRED") for r in recs):
            (out["ready_enrichment"] if any(r["state"] in ("RETAINED", "TRANSFERRED") for r in recs)
             else out["mastered"]).append(item)
        elif item["p"] is not None and item["p"] < DEVELOPING_T:
            out["needs_remediation"].append(item)
        else:
            out["developing"].append(item)
    return out


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
        a["students"].append({"student_id": r["student_id"], "name": names.get(r["student_id"])})
        a["frequency"] += r.get("frequency", 1)
        if r.get("last_at") and (not a["last_at"] or aware(r["last_at"]) > aware(a["last_at"])):
            a["last_at"] = r["last_at"]
    out = list(agg.values())
    for a in out:
        comp = await db.curriculum_nodes.find_one({"id": a["competency_id"]}, {"_id": 0})
        a["competency_name"] = (comp or {}).get("name")
        a["student_count"] = len(a["students"])
        a["headline"] = f"{len(a['students'])} dari {len(sids)} murid masih keliru pada {a['misconception_id']}"
    out.sort(key=lambda x: -x["student_count"])
    return out


async def due_reviews(student_id: str) -> list[dict]:
    rows = await db.learner_competency.find({"student_id": student_id,
                                             "state": {"$in": ["MASTERED", "RETAINED", "TRANSFERRED"]}},
                                            {"_id": 0}).to_list(1000)
    out = []
    for r in rows:
        due = aware(r.get("due_at"))
        rt = retrievability(r)
        if (due and due <= now()) or (rt is not None and rt < 0.85):
            comp = await db.curriculum_nodes.find_one({"id": r["competency_id"]}, {"_id": 0})
            out.append({"competency_id": r["competency_id"], "name": (comp or {}).get("name"),
                        "tp_id": r.get("tp_id"), "retrievability": rt, "due_at": r.get("due_at")})
    return out


async def recommendations(class_id: str) -> list[dict]:
    """“Apa yang harus saya lakukan sekarang?” — maksimal 3 tindakan, tiap tindakan executable."""
    cov = await coverage_matrix(class_id)
    mis = await class_misconceptions(class_id)
    recs: list[dict] = []
    gaps = [r for r in cov["rows"] if r["status"] == "GAP"]
    gaps.sort(key=lambda r: (r["mastery_pct"] or 0))
    if gaps:
        g = gaps[0]
        detail = await student_tp_summary(class_id, g["tp_id"])
        who = detail["needs_remediation"]
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
    for r in cov["rows"]:
        if r["status"] in ("GOOD", "DEVELOPING") and r["students_mastered"]:
            d = await student_tp_summary(class_id, r["tp_id"])
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
    by_tp: dict[str, dict] = {}
    for r in recs:
        comp = await db.curriculum_nodes.find_one({"id": r["competency_id"]}, {"_id": 0}) or {}
        tp_id = comp.get("tp_id") or r.get("tp_id") or "lainnya"
        tp = await db.curriculum_nodes.find_one({"id": tp_id}, {"_id": 0}) or {}
        row = by_tp.setdefault(tp_id, {"tp_id": tp_id, "tp_code": tp.get("code"), "tp_name": tp.get("name"),
                                        "cp_name": None, "competencies": []})
        if row["cp_name"] is None and comp.get("cp_id"):
            cp = await db.curriculum_nodes.find_one({"id": comp["cp_id"]}, {"_id": 0}) or {}
            row["cp_name"] = cp.get("name")
        row["competencies"].append({
            "competency_id": r["competency_id"], "name": comp.get("name"),
            "state": r["state"], "state_label": STATE_LABEL.get(r["state"], r["state"]),
            "p_mastery": r["p_mastery"], "attempts": r["attempts"], "correct": r["correct"],
            "retrievability": retrievability(r), "due_at": r.get("due_at"),
            "transferred": bool(r.get("transferred_at")), "retained": bool(r.get("retained_at"))})
    rows = list(by_tp.values())
    for row in rows:
        cs = row["competencies"]
        row["mastery_pct"] = round(100 * sum(c["p_mastery"] for c in cs) / len(cs)) if cs else 0
        strongest = max(cs, key=lambda c: c["p_mastery"]) if cs else None
        weakest = min(cs, key=lambda c: c["p_mastery"]) if cs else None
        row["next_target"] = weakest["name"] if weakest and weakest["p_mastery"] < MASTERY_T else (
            f"Uji transfer {strongest['name']}" if strongest else None)
    due = await due_reviews(student_id)
    mis = await db.misconception_ledger.find({"student_id": student_id, "resolved": False},
                                              {"_id": 0}).to_list(200)
    return {"student_id": student_id, "name": user.get("name"), "rows": rows,
            "due_reviews": due, "open_misconceptions": mis,
            "totals": {"competencies": len(recs),
                       "mastered": sum(1 for r in recs if r["state"] in ("MASTERED", "RETAINED", "TRANSFERRED")),
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
