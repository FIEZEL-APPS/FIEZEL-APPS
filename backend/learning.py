"""Student Learning Loop — learning mission, sesi adaptif, diagnosis, penjelasan,
hint, retry, evidence, mastery, retensi, transfer. Termasuk telemetry idempoten.
"""
import re
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError

from db import db
from auth import current_user
import braincore as bc
from assessment import ASSESSMENT_TYPES

router = APIRouter(prefix="/api/learning", tags=["learning"])

EVENT_TYPES = [
    "lesson_started", "question_presented", "question_answered", "hint_requested",
    "explanation_viewed", "retry_started", "retry_completed", "confidence_submitted",
    "misconception_detected", "competency_updated", "mastery_changed", "review_scheduled",
    "transfer_attempted", "transfer_completed", "assignment_completed",
]


def now():
    return datetime.now(timezone.utc)


async def record_event(event_type: str, student_id: str, payload: dict,
                       event_id: str | None = None) -> dict:
    """Idempoten: event_id stabil -> tidak pernah double-count."""
    if event_type not in EVENT_TYPES:
        raise HTTPException(400, f"event_type tidak dikenal: {event_type}")
    raw = event_id or f"{event_type}:{student_id}:{payload.get('session_id')}:{payload.get('question_id')}:{payload.get('seq')}"
    eid = raw if event_id else hashlib.sha1(raw.encode()).hexdigest()[:24]
    doc = {"event_id": eid, "type": event_type, "student_id": student_id,
           "payload": _minimize(payload), "at": now()}
    try:
        await db.learning_events.insert_one(dict(doc))
        doc.pop("_id", None)
        return {"stored": True, "event_id": eid}
    except DuplicateKeyError:
        return {"stored": False, "event_id": eid, "reason": "duplicate"}


DROP_KEYS = {"raw_answer", "answer_text", "student_name", "email"}


def _minimize(payload: dict) -> dict:
    """Privasi: jangan simpan jawaban mentah/identitas yang tidak diperlukan."""
    return {k: v for k, v in (payload or {}).items() if k not in DROP_KEYS}


class EventIn(BaseModel):
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    event_id: str | None = None


@router.post("/events")
async def post_event(body: EventIn, u=Depends(current_user)):
    return await record_event(body.type, u["user_id"], body.payload, body.event_id)


@router.get("/events")
async def list_events(student_id: str | None = None, limit: int = 100, u=Depends(current_user)):
    sid = student_id if u["role"] in ("teacher", "owner") else u["user_id"]
    q = {"student_id": sid} if sid else {}
    return await db.learning_events.find(q, {"_id": 0}).sort("at", -1).to_list(min(limit, 500))


# ------------------------- hari ini / today plan -------------------------
@router.get("/today")
async def today(u=Depends(current_user)):
    class_ids = u.get("class_ids") or []
    assessments = await db.assessments.find(
        {"status": "PUBLISHED",
         "$or": [{"student_ids": u["user_id"]},
                 {"for_whole_class": True, "class_id": {"$in": class_ids}}]},
        {"_id": 0}).sort("created_at", -1).to_list(50)
    out = []
    for a in assessments:
        sess = await db.sessions.find_one({"assessment_id": a["id"], "student_id": u["user_id"]}, {"_id": 0})
        tps = await db.curriculum_nodes.find({"id": {"$in": a.get("tp_ids") or []}}, {"_id": 0}).to_list(50)
        out.append({"assessment_id": a["id"], "title": a["title"], "type": a["assessment_type"],
                    "type_label": ASSESSMENT_TYPES.get(a["assessment_type"], {}).get("label"),
                    "purpose": ASSESSMENT_TYPES.get(a["assessment_type"], {}).get("purpose"),
                    "goal": [t["name"] for t in tps], "deadline": a.get("deadline"),
                    "minutes": a.get("minutes"), "question_count": a.get("question_count"),
                    "session": {"id": sess["id"], "state": sess["state"],
                                "answered": sess.get("answered_count", 0)} if sess else None})
    return {"missions": out, "due_reviews": await bc.due_reviews(u["user_id"])}


# ------------------------- sesi -------------------------
class StartIn(BaseModel):
    assessment_id: str


async def build_mission(a: dict, student_id: str) -> dict:
    tps = await db.curriculum_nodes.find({"id": {"$in": a.get("tp_ids") or []}}, {"_id": 0}).to_list(50)
    cfg = ASSESSMENT_TYPES.get(a["assessment_type"], {})
    states = []
    for cid in (a.get("competency_ids") or [])[:20]:
        st = await bc.get_state(student_id, cid)
        comp = await db.curriculum_nodes.find_one({"id": cid}, {"_id": 0}) or {}
        states.append({"competency_id": cid, "name": comp.get("name"),
                       "state": st["state"], "state_label": bc.STATE_LABEL.get(st["state"])})
    weakest = min(states, key=lambda s: 0) if states else None
    goal_names = [t["name"] for t in tps] or [s["name"] for s in states[:2]]
    why = {
        "diagnostic": "Kita cari tahu dulu kamu sudah kuat di bagian mana. Tidak dinilai — ini peta, bukan ujian.",
        "practice": "Latihan ini membangun kebiasaan berpikir yang kamu pakai terus di materi berikutnya.",
        "formative": "Hasilnya dipakai gurumu untuk menyesuaikan pelajaran besok, bukan untuk menghukum.",
        "summative": "Saatnya menunjukkan apa yang sudah kamu kuasai dari bagian ini.",
        "remedial": "Ada satu-dua langkah yang masih menyangkut. Kita bereskan itu dulu supaya sisanya terasa mudah.",
        "enrichment": "Kamu sudah menguasai dasarnya. Sekarang kita pakai di situasi yang lebih menantang.",
        "review": "Ini bagian yang mulai rawan lupa. Mengingat ulang sekarang jauh lebih hemat tenaga.",
        "transfer": "Kita cek apakah pemahamanmu tetap jalan saat bentuk soalnya berubah.",
    }.get(a["assessment_type"], "Kita belajar satu kompetensi sampai benar-benar bisa dipakai.")
    return {"today_goal": goal_names, "why_this_matters": why,
            "purpose": cfg.get("purpose"), "type_label": cfg.get("label"),
            "phases": ["warm-up", "example", "practice", "challenge", "check", "review"],
            "competency_states": states,
            "student_view": {"focus": weakest["name"] if weakest else None}}


@router.post("/sessions/start")
async def start_session(body: StartIn, u=Depends(current_user)):
    a = await db.assessments.find_one({"id": body.assessment_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "asesmen tidak ditemukan")
    if u["role"] == "student" and u["user_id"] not in (a.get("student_ids") or []):
        member = a.get("for_whole_class") and a.get("class_id") in (u.get("class_ids") or [])
        if not member:
            raise HTTPException(403, "Asesmen ini bukan untukmu")
        await db.assessments.update_one({"id": a["id"]}, {"$addToSet": {"student_ids": u["user_id"]}})
    existing = await db.sessions.find_one({"assessment_id": a["id"], "student_id": u["user_id"],
                                           "state": "active"}, {"_id": 0})
    if existing:
        return existing
    mission = await build_mission(a, u["user_id"])
    doc = {"id": f"SES-{uuid.uuid4().hex[:10].upper()}", "assessment_id": a["id"],
           "assessment_type": a["assessment_type"], "adaptive": a.get("adaptive", True),
           "class_id": a.get("class_id"), "student_id": u["user_id"],
           "competency_ids": a.get("competency_ids") or [], "tp_ids": a.get("tp_ids") or [],
           "queue": list(a.get("question_ids") or []), "served": [], "state": "active",
           "target_count": a.get("question_count") or len(a.get("question_ids") or []) or 10,
           "answered_count": 0, "correct_count": 0, "hint_count": 0, "retry_count": 0,
           "transfer_attempts": 0, "transfer_correct": 0, "score": None,
           "current": None, "wrong_streak": {}, "mission": mission,
           "started_at": now(), "finished_at": None}
    await db.sessions.insert_one(dict(doc))
    doc.pop("_id", None)
    for cid in doc["competency_ids"]:
        comp = await db.curriculum_nodes.find_one({"id": cid}, {"_id": 0}) or {}
        await bc.mark_exposure(u["user_id"], cid, comp.get("tp_id"))
    await record_event("lesson_started", u["user_id"],
                       {"session_id": doc["id"], "assessment_id": a["id"],
                        "assessment_type": a["assessment_type"]})
    return doc


async def _session(session_id: str, u: dict) -> dict:
    s = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "sesi tidak ditemukan")
    if u["role"] == "student" and s["student_id"] != u["user_id"]:
        raise HTTPException(403, "Bukan sesimu")
    return s


def _public_question(q: dict) -> dict:
    return {"question_id": q["question_id"], "version": q["version"], "stem": q["stem"],
            "options": q.get("options") or [], "question_type": q["question_type"],
            "difficulty": q["difficulty"], "cognitive_level": q["cognitive_level"],
            "estimated_time": q["estimated_time"], "is_transfer": q.get("is_transfer", False),
            "competency_id": q["competency_id"], "competency_name": q.get("competency_name"),
            "tp_id": q.get("tp_id"), "has_hint": bool(q.get("hints"))}


@router.get("/sessions/{session_id}/next")
async def next_question(session_id: str, u=Depends(current_user)):
    s = await _session(session_id, u)
    if s["state"] == "finished":
        return {"done": True, "session": s}
    if s.get("current"):
        q = await db.questions.find_one({"question_id": s["current"]["question_id"], "is_current": True},
                                         {"_id": 0})
        if q:
            return {"done": False, "question": _public_question(q), "reason": s["current"].get("reason"),
                    "phase": s["current"].get("phase"), "progress": _progress(s), "resumed": True}
    if s["answered_count"] >= s["target_count"]:
        return await finish_session(session_id, u)

    pick = None
    if s.get("adaptive"):
        pick = await bc.next_best_item(s["student_id"], s["competency_ids"], s["served"])
    if not pick:
        remaining = [q for q in s["queue"] if q not in s["served"]]
        if not remaining:
            return await finish_session(session_id, u)
        q = await db.questions.find_one({"question_id": remaining[0], "is_current": True}, {"_id": 0})
        if not q:
            await db.sessions.update_one({"id": session_id}, {"$push": {"served": remaining[0]}})
            return await next_question(session_id, u)
        pick = {"question": q, "reason": "Soal berikutnya dari daftar guru.", "reason_code": "fixed_queue",
                "competency_id": q["competency_id"], "phase": "practice"}
    q = pick["question"]
    current = {"question_id": q["question_id"], "version": q["version"],
               "competency_id": pick["competency_id"], "reason": pick["reason"],
               "reason_code": pick["reason_code"], "phase": pick.get("phase"),
               "served_at": now(), "attempt_count": 0, "hints_used": 0}
    await db.sessions.update_one({"id": session_id}, {"$set": {"current": current}})
    await record_event("question_presented", s["student_id"],
                       {"session_id": session_id, "question_id": q["question_id"],
                        "competency_id": pick["competency_id"], "reason_code": pick["reason_code"],
                        "seq": s["answered_count"]})
    if q.get("is_transfer"):
        await record_event("transfer_attempted", s["student_id"],
                           {"session_id": session_id, "question_id": q["question_id"],
                            "competency_id": pick["competency_id"], "seq": s["answered_count"]})
    s = await _session(session_id, u)
    return {"done": False, "question": _public_question(q), "reason": pick["reason"],
            "phase": pick.get("phase"), "progress": _progress(s)}


def _progress(s: dict) -> dict:
    return {"answered": s["answered_count"], "target": s["target_count"],
            "correct": s["correct_count"], "hints": s.get("hint_count", 0),
            "retries": s.get("retry_count", 0)}


@router.post("/sessions/{session_id}/hint")
async def request_hint(session_id: str, u=Depends(current_user)):
    s = await _session(session_id, u)
    cur = s.get("current")
    if not cur:
        raise HTTPException(400, "Belum ada soal aktif")
    q = await db.questions.find_one({"question_id": cur["question_id"], "is_current": True}, {"_id": 0})
    hints = (q or {}).get("hints") or []
    idx = min(cur.get("hints_used", 0), max(0, len(hints) - 1))
    text = hints[idx] if hints else "Coba baca ulang soalnya dan tandai informasi yang diketahui lebih dulu."
    await db.sessions.update_one({"id": session_id},
                                 {"$inc": {"current.hints_used": 1, "hint_count": 1}})
    await record_event("hint_requested", s["student_id"],
                       {"session_id": session_id, "question_id": cur["question_id"],
                        "competency_id": cur["competency_id"], "seq": cur.get("hints_used", 0)})
    return {"hint": text, "hints_used": cur.get("hints_used", 0) + 1, "remaining": max(0, len(hints) - idx - 1)}


def norm_answer(v: str) -> str:
    return re.sub(r"\s+", " ", (v or "").strip().lower()).replace(",", ".")


def grade(q: dict, answer: str) -> bool | None:
    if q["question_type"] == "essay":
        return None
    key = q.get("answer_key", "")
    if q["question_type"] == "mcq":
        return norm_answer(answer)[:1] == norm_answer(key)[:1] and bool(answer)
    if q["question_type"] == "numeric":
        try:
            return abs(float(norm_answer(answer)) - float(norm_answer(key))) < 1e-6
        except ValueError:
            return False
    if q["question_type"] == "true_false":
        return norm_answer(answer) in (norm_answer(key), norm_answer(key)[:1])
    accepted = [norm_answer(x) for x in re.split(r"\s*\|\s*", key) if x.strip()]
    return norm_answer(answer) in accepted


CONF_MAP = {"yakin": 1.0, "lumayan": 0.6, "tidak": 0.2}


class AnswerIn(BaseModel):
    question_id: str
    answer: str = ""
    confidence: str | float | None = None
    time_ms: int = 0
    idempotency_key: str | None = None
    retry_of: str | None = None


@router.post("/sessions/{session_id}/answer")
async def submit_answer(session_id: str, body: AnswerIn, u=Depends(current_user)):
    s = await _session(session_id, u)
    if s["state"] == "finished":
        raise HTTPException(400, "Sesi sudah selesai")
    cur = s.get("current") or {}
    if cur.get("question_id") != body.question_id:
        raise HTTPException(400, "Soal ini bukan soal aktif")
    q = await db.questions.find_one({"question_id": body.question_id, "is_current": True}, {"_id": 0})
    if not q:
        raise HTTPException(404, "soal tidak ditemukan")
    cfg = ASSESSMENT_TYPES.get(s["assessment_type"], {})
    conf = body.confidence
    if isinstance(conf, str):
        conf = CONF_MAP.get(conf.lower())
    correct = grade(q, body.answer)
    chosen_letter = norm_answer(body.answer)[:1].upper() if q["question_type"] == "mcq" else ""
    misconception = None
    if correct is False:
        misconception = (q.get("distractor_misconceptions") or {}).get(chosen_letter) or q.get("misconception_id")
    diag = bc.diagnose(bool(correct), conf, body.time_ms, cur.get("hints_used", 0),
                       q["estimated_time"], misconception) if correct is not None else {
        "label": "needs_teacher_grading", "message": "Jawaban esai kamu menunggu penilaian guru."}

    attempt_id = f"AT-{uuid.uuid4().hex[:12].upper()}"
    idem = body.idempotency_key or f"{session_id}:{body.question_id}:{cur.get('attempt_count', 0)}"
    attempt = {"id": attempt_id, "idempotency_key": idem, "session_id": session_id,
               "assessment_id": s["assessment_id"], "student_id": s["student_id"],
               "class_id": s.get("class_id"), "question_id": q["question_id"],
               "question_version": q["version"], "competency_id": q["competency_id"],
               "tp_id": q.get("tp_id"), "cp_id": q.get("cp_id"), "indicator_id": q.get("indicator_id"),
               "curriculum_id": q.get("curriculum_id"), "difficulty": q["difficulty"],
               "cognitive_level": q["cognitive_level"], "chosen": chosen_letter or None,
               "correct": correct, "confidence": conf, "time_ms": body.time_ms,
               "hints_used": cur.get("hints_used", 0), "retry_of": body.retry_of,
               "is_transfer": q.get("is_transfer", False), "misconception_id": misconception,
               "diagnosis": diag["label"], "at": now()}
    try:
        await db.attempts.insert_one(dict(attempt))
    except DuplicateKeyError:
        prev = await db.attempts.find_one({"idempotency_key": idem}, {"_id": 0})
        return {"duplicate": True, "attempt": prev, "note": "Attempt ini sudah tercatat (idempoten)."}

    update: dict[str, Any] = {"$inc": {"answered_count": 1, "current.attempt_count": 1},
                              "$push": {"served": q["question_id"]}}
    if correct:
        update["$inc"]["correct_count"] = 1
    if q.get("is_transfer"):
        update["$inc"]["transfer_attempts"] = 1
        if correct:
            update["$inc"]["transfer_correct"] = 1
    if body.retry_of:
        update["$inc"]["retry_count"] = 1
    await db.sessions.update_one({"id": session_id}, update)

    result = {"state": await bc.get_state(s["student_id"], q["competency_id"]),
              "state_changed": False, "previous_state": None}
    if correct is not None:
        result = await bc.apply_attempt(attempt)

    await record_event("question_answered", s["student_id"],
                       {"session_id": session_id, "question_id": q["question_id"],
                        "competency_id": q["competency_id"], "correct": correct,
                        "diagnosis": diag["label"], "seq": s["answered_count"]})
    if conf is not None:
        await record_event("confidence_submitted", s["student_id"],
                           {"session_id": session_id, "question_id": q["question_id"],
                            "confidence": conf, "seq": s["answered_count"]})
    if misconception:
        await record_event("misconception_detected", s["student_id"],
                           {"session_id": session_id, "competency_id": q["competency_id"],
                            "misconception_id": misconception, "seq": s["answered_count"]})
    await record_event("competency_updated", s["student_id"],
                       {"session_id": session_id, "competency_id": q["competency_id"],
                        "p_mastery": result["state"]["p_mastery"], "state": result["state"]["state"],
                        "seq": s["answered_count"]})
    if result.get("state_changed"):
        await record_event("mastery_changed", s["student_id"],
                           {"session_id": session_id, "competency_id": q["competency_id"],
                            "from": result.get("previous_state"), "to": result["state"]["state"],
                            "seq": s["answered_count"]})
        if result["state"]["state"] in ("MASTERED", "RETAINED"):
            await record_event("review_scheduled", s["student_id"],
                               {"session_id": session_id, "competency_id": q["competency_id"],
                                "due_at": str(result["state"].get("due_at")), "seq": s["answered_count"]})
    if q.get("is_transfer") and correct:
        await record_event("transfer_completed", s["student_id"],
                           {"session_id": session_id, "question_id": q["question_id"],
                            "competency_id": q["competency_id"], "seq": s["answered_count"]})

    # ---- loop penjelasan: salah -> diagnosis -> penjelasan -> hint -> retry terarah ----
    wrong_streak = dict(s.get("wrong_streak") or {})
    next_action: dict[str, Any] = {"kind": "next_question"}
    explanation = None
    if correct is False:
        wrong_streak[q["competency_id"]] = wrong_streak.get(q["competency_id"], 0) + 1
        explanation = q.get("explanation") or "Perhatikan kembali langkah kuncinya."
        await record_event("explanation_viewed", s["student_id"],
                           {"session_id": session_id, "question_id": q["question_id"],
                            "seq": s["answered_count"]})
        if wrong_streak[q["competency_id"]] >= 2:
            rem = await bc.remediation_item(s["student_id"], q["competency_id"], s["served"] + [q["question_id"]])
            if rem:
                next_action = {"kind": "micro_remediation", "reason": rem["reason"],
                               "question": _public_question(rem["question"]),
                               "prerequisite_check": rem["reason_code"] == "micro_remediation"}
                await db.sessions.update_one({"id": session_id}, {"$set": {"current": {
                    "question_id": rem["question"]["question_id"], "version": rem["question"]["version"],
                    "competency_id": rem["competency_id"], "reason": rem["reason"],
                    "reason_code": rem["reason_code"], "phase": rem.get("phase"),
                    "served_at": now(), "attempt_count": 0, "hints_used": 0}}})
        elif cfg.get("allow_retry"):
            variants = await db.questions.find(
                {"variant_group_id": q.get("variant_group_id"), "is_current": True,
                 "status": "PUBLISHED", "question_id": {"$ne": q["question_id"]}}, {"_id": 0}).to_list(10)
            retry_q = variants[0] if variants else None
            if not retry_q:
                same = await db.questions.find(
                    {"competency_id": q["competency_id"], "is_current": True, "status": "PUBLISHED",
                     "is_transfer": False, "question_id": {"$nin": s["served"] + [q["question_id"]]}},
                    {"_id": 0}).to_list(20)
                same.sort(key=lambda x: abs(x["difficulty"] - q["difficulty"]))
                retry_q = same[0] if same else None
            if retry_q:
                next_action = {"kind": "targeted_retry", "reason":
                               "Kita coba soal serupa dengan angka/konteks berbeda supaya kamu bisa langsung mempraktikkan penjelasan tadi.",
                               "question": _public_question(retry_q), "retry_of": q["question_id"]}
                await db.sessions.update_one({"id": session_id}, {"$set": {"current": {
                    "question_id": retry_q["question_id"], "version": retry_q["version"],
                    "competency_id": retry_q["competency_id"],
                    "reason": next_action["reason"], "reason_code": "targeted_retry",
                    "phase": "practice", "served_at": now(), "attempt_count": 0, "hints_used": 0}}})
                await record_event("retry_started", s["student_id"],
                                   {"session_id": session_id, "question_id": retry_q["question_id"],
                                    "retry_of": q["question_id"], "seq": s["answered_count"]})
    else:
        wrong_streak[q["competency_id"]] = 0
        if body.retry_of:
            await record_event("retry_completed", s["student_id"],
                               {"session_id": session_id, "question_id": q["question_id"],
                                "retry_of": body.retry_of, "seq": s["answered_count"]})
    if next_action["kind"] == "next_question":
        await db.sessions.update_one({"id": session_id}, {"$set": {"current": None}})
    await db.sessions.update_one({"id": session_id}, {"$set": {"wrong_streak": wrong_streak}})

    st = result["state"]
    return {
        "correct": correct,
        "answer_key": q.get("answer_key") if cfg.get("immediate_feedback") else None,
        "diagnosis": diag,
        "explanation": explanation if cfg.get("immediate_feedback") else None,
        "misconception_id": misconception,
        "next_action": next_action,
        "learner_state": {"competency_id": q["competency_id"], "state": st["state"],
                          "state_label": bc.STATE_LABEL.get(st["state"]),
                          "progress_pct": round(st["p_mastery"] * 100)},
        "attempt_id": attempt_id,
    }


@router.post("/sessions/{session_id}/finish")
async def finish_session(session_id: str, u=Depends(current_user)):
    s = await _session(session_id, u)
    if s["state"] != "finished":
        score = round(s["correct_count"] / s["answered_count"], 3) if s["answered_count"] else None
        await db.sessions.update_one({"id": session_id},
                                     {"$set": {"state": "finished", "finished_at": now(),
                                               "score": score, "current": None}})
        await record_event("assignment_completed", s["student_id"],
                           {"session_id": session_id, "assessment_id": s["assessment_id"],
                            "score": score, "answered": s["answered_count"]})
        s = await _session(session_id, u)
    states = []
    for cid in s["competency_ids"]:
        st = await bc.get_state(s["student_id"], cid)
        comp = await db.curriculum_nodes.find_one({"id": cid}, {"_id": 0}) or {}
        states.append({"competency_id": cid, "name": comp.get("name"), "state": st["state"],
                       "state_label": bc.STATE_LABEL.get(st["state"]),
                       "progress_pct": round(st["p_mastery"] * 100),
                       "retrievability": bc.retrievability(st)})
    return {"done": True, "session": s, "summary": {
        "answered": s["answered_count"], "correct": s["correct_count"], "score": s.get("score"),
        "hints": s.get("hint_count"), "retries": s.get("retry_count"),
        "transfer": {"attempts": s.get("transfer_attempts", 0), "correct": s.get("transfer_correct", 0)},
        "competency_states": states,
        "next_step": ("Ada bagian yang masih perlu diperkuat — gurumu akan menyiapkan latihan lanjutan."
                      if any(x["state"] in ("PRACTICING", "EXPOSED") for x in states)
                      else "Kerja bagus. Nanti kita ulang sebentar supaya tidak lupa.")}}


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, u=Depends(current_user)):
    return await _session(session_id, u)


@router.get("/passport")
async def my_passport(u=Depends(current_user)):
    return await bc.learning_passport(u["user_id"])
