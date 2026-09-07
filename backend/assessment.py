"""Assessment Engine — blueprint, jenis asesmen, perakitan soal, coverage, analitik.

Delapan jenis asesmen dengan perilaku berbeda (bukan “assignment biasa”):
diagnostic, practice, formative, summative, remedial, enrichment, review, transfer.
"""
import uuid
import random
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db import db
from auth import teacher_user, current_user
import braincore as bc

router = APIRouter(prefix="/api", tags=["assessment"])

ASSESSMENT_TYPES = {
    "diagnostic": {"label": "Diagnostik", "adaptive": True, "immediate_feedback": False,
                   "allow_retry": False, "shuffle": True, "transfer_ratio": 0.0,
                   "purpose": "Memetakan titik awal murid sebelum mengajar."},
    "practice": {"label": "Latihan", "adaptive": True, "immediate_feedback": True,
                 "allow_retry": True, "shuffle": False, "transfer_ratio": 0.1,
                 "purpose": "Membangun penguasaan dengan umpan balik langsung."},
    "formative": {"label": "Formatif", "adaptive": True, "immediate_feedback": True,
                  "allow_retry": True, "shuffle": False, "transfer_ratio": 0.15,
                  "purpose": "Memantau proses belajar untuk keputusan mengajar."},
    "summative": {"label": "Sumatif", "adaptive": False, "immediate_feedback": False,
                  "allow_retry": False, "shuffle": True, "transfer_ratio": 0.2,
                  "purpose": "Menilai capaian akhir sebuah TP/CP."},
    "remedial": {"label": "Remedial", "adaptive": True, "immediate_feedback": True,
                 "allow_retry": True, "shuffle": False, "transfer_ratio": 0.0,
                 "purpose": "Menutup prasyarat & miskonsepsi yang belum selesai."},
    "enrichment": {"label": "Pengayaan", "adaptive": True, "immediate_feedback": True,
                   "allow_retry": True, "shuffle": False, "transfer_ratio": 0.5,
                   "purpose": "Memperluas penerapan bagi murid yang sudah menguasai."},
    "review": {"label": "Review terjadwal", "adaptive": True, "immediate_feedback": True,
               "allow_retry": True, "shuffle": True, "transfer_ratio": 0.2,
               "purpose": "Retrieval sebelum risiko lupa menjadi tinggi."},
    "transfer": {"label": "Cek transfer", "adaptive": True, "immediate_feedback": True,
                 "allow_retry": False, "shuffle": True, "transfer_ratio": 1.0,
                 "purpose": "Menguji pemahaman di konteks/format berbeda."},
}


def now():
    return datetime.now(timezone.utc)


# ----------------------------- kelas -----------------------------
class ClassIn(BaseModel):
    name: str
    grade_id: str | None = None
    subject_id: str | None = None
    code: str | None = None


def make_code() -> str:
    alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "FZ-" + "".join(random.choice(alpha) for _ in range(6))


@router.post("/classes")
async def create_class(body: ClassIn, u=Depends(teacher_user)):
    code = (body.code or make_code()).upper()
    if await db.classes.find_one({"code": code}):
        raise HTTPException(400, "Kode kelas sudah dipakai")
    doc = {"id": f"CLS-{uuid.uuid4().hex[:8].upper()}", "code": code, "name": body.name.strip()[:80],
           "grade_id": body.grade_id, "subject_id": body.subject_id, "teacher_id": u["user_id"],
           "student_ids": [], "created_at": now()}
    await db.classes.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.get("/classes")
async def list_classes(u=Depends(current_user)):
    if u["role"] in ("teacher", "owner"):
        q: dict[str, Any] = {} if u["role"] == "owner" else {"teacher_id": u["user_id"]}
    else:
        q = {"student_ids": u["user_id"]}
    return await db.classes.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@router.get("/classes/{class_id}")
async def get_class(class_id: str, u=Depends(current_user)):
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(404, "kelas tidak ditemukan")
    cls["students"] = [
        {"user_id": s["user_id"], "name": s.get("name"), "email": s.get("email")}
        for s in await bc.class_students(class_id)]
    return cls


class RosterIn(BaseModel):
    names: list[str]


@router.post("/classes/{class_id}/roster")
async def add_roster(class_id: str, body: RosterIn, u=Depends(teacher_user)):
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(404, "kelas tidak ditemukan")
    created = []
    for raw in body.names:
        name = raw.strip()[:60]
        if not name:
            continue
        uid = f"user_{uuid.uuid4().hex[:12]}"
        doc = {"user_id": uid, "name": name, "role": "student", "provider": "roster", "class_ids": [class_id], "created_at": now()}
        await db.users.insert_one(dict(doc))
        await db.classes.update_one({"id": class_id}, {"$addToSet": {"student_ids": uid}})
        created.append({"user_id": uid, "name": name})
    return {"created": created, "count": len(created)}


# ----------------------------- blueprint -----------------------------
class TPTarget(BaseModel):
    tp_id: str
    count: int


class BlueprintIn(BaseModel):
    title: str
    tp_targets: list[TPTarget]
    cognitive_distribution: dict[str, int] = Field(default_factory=lambda: {"C1": 20, "C2": 30, "C3": 30, "C4": 20})
    difficulty_distribution: dict[str, int] = Field(default_factory=lambda: {"1": 20, "2": 30, "3": 30, "4": 20})
    question_types: list[str] = Field(default_factory=lambda: ["mcq"])
    transfer_ratio: float = 0.1
    assessment_type: str = "formative"


async def check_blueprint(bp: dict) -> dict:
    warnings = []
    total = sum(t["count"] for t in bp["tp_targets"])
    if total == 0:
        warnings.append({"level": "error", "message": "Blueprint belum menargetkan soal apa pun."})
    cog = bp.get("cognitive_distribution") or {}
    s = sum(cog.values())
    if s and abs(s - 100) > 1:
        warnings.append({"level": "error", "message": f"Distribusi kognitif berjumlah {s}%, seharusnya 100%."})
    higher = sum(v for k, v in cog.items() if k in ("C3", "C4", "C5", "C6"))
    if s and higher < 30:
        warnings.append({"level": "warn", "message":
                         f"Hanya {higher}% soal berada di level C3+. Asesmen ini cenderung menguji hafalan."})
    if s and cog.get("C1", 0) > 50:
        warnings.append({"level": "warn", "message": "Lebih dari separuh soal C1 — terlalu dangkal untuk menyimpulkan mastery."})
    dif = bp.get("difficulty_distribution") or {}
    if sum(dif.values()) and abs(sum(dif.values()) - 100) > 1:
        warnings.append({"level": "warn", "message": "Distribusi kesulitan tidak berjumlah 100%."})
    if bp.get("transfer_ratio", 0) <= 0 and bp.get("assessment_type") in ("summative", "formative"):
        warnings.append({"level": "info", "message":
                         "Tanpa soal transfer, sistem tidak bisa membedakan hafalan pola dari pemahaman."})
    # ketersediaan soal per TP
    availability = []
    for t in bp["tp_targets"]:
        n = await db.questions.count_documents({"tp_id": t["tp_id"], "is_current": True, "status": "PUBLISHED"})
        tp = await db.curriculum_nodes.find_one({"id": t["tp_id"]}, {"_id": 0}) or {}
        availability.append({"tp_id": t["tp_id"], "tp_code": tp.get("code"), "needed": t["count"], "available": n})
        if n < t["count"]:
            warnings.append({"level": "warn", "message":
                             f"{tp.get('code', t['tp_id'])} butuh {t['count']} soal terbit, tersedia {n}."})
    return {"warnings": warnings, "availability": availability, "total_questions": total,
            "balanced": not any(w["level"] == "error" for w in warnings)}


@router.post("/blueprints")
async def create_blueprint(body: BlueprintIn, u=Depends(teacher_user)):
    doc = body.model_dump()
    doc.update({"id": f"BP-{uuid.uuid4().hex[:8].upper()}", "created_by": u["user_id"], "created_at": now()})
    check = await check_blueprint(doc)
    doc["check"] = check
    await db.blueprints.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.post("/blueprints/check")
async def check_blueprint_route(body: BlueprintIn, u=Depends(teacher_user)):
    return await check_blueprint(body.model_dump())


@router.get("/blueprints")
async def list_blueprints(u=Depends(teacher_user)):
    return await db.blueprints.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ----------------------------- perakitan & asesmen -----------------------------
async def assemble(tp_targets: list[dict], cognitive: dict[str, int] | None,
                   difficulty: dict[str, int] | None, transfer_ratio: float,
                   qtypes: list[str] | None) -> dict:
    picked: list[dict] = []
    notes = []
    for t in tp_targets:
        need = int(t["count"])
        q: dict[str, Any] = {"tp_id": t["tp_id"], "is_current": True, "status": "PUBLISHED"}
        if qtypes:
            q["question_type"] = {"$in": qtypes}
        pool = await db.questions.find(q, {"_id": 0}).to_list(500)
        if not pool:
            notes.append(f"Tidak ada soal terbit untuk {t['tp_id']}.")
            continue
        want_transfer = round(need * max(0.0, min(1.0, transfer_ratio)))
        transfer_pool = [x for x in pool if x.get("is_transfer")]
        normal_pool = [x for x in pool if not x.get("is_transfer")]

        def by_cog(pl):
            out, buckets = [], {}
            for x in pl:
                buckets.setdefault(x["cognitive_level"], []).append(x)
            if cognitive:
                for lvl, pctv in sorted(cognitive.items()):
                    k = round(need * (pctv / 100.0))
                    out += (buckets.get(lvl) or [])[:k]
            for x in pl:
                if x not in out:
                    out.append(x)
            return out

        chosen = by_cog(transfer_pool)[:want_transfer] + by_cog(normal_pool)[:need - want_transfer]
        seen = {c["question_id"] for c in chosen}
        for x in pool:
            if len(chosen) >= need:
                break
            if x["question_id"] not in seen:
                chosen.append(x)
                seen.add(x["question_id"])
        if len(chosen) < need:
            notes.append(f"{t['tp_id']}: hanya {len(chosen)} dari {need} soal tersedia.")
        picked += chosen[:need]
    dist_cog: dict[str, int] = {}
    dist_dif: dict[str, int] = {}
    for p in picked:
        dist_cog[p["cognitive_level"]] = dist_cog.get(p["cognitive_level"], 0) + 1
        dist_dif[str(p["difficulty"])] = dist_dif.get(str(p["difficulty"]), 0) + 1
    return {"question_ids": [p["question_id"] for p in picked], "questions": picked, "notes": notes,
            "distribution": {"cognitive": dist_cog, "difficulty": dist_dif,
                             "transfer": sum(1 for p in picked if p.get("is_transfer"))}}


class AssessmentIn(BaseModel):
    title: str
    assessment_type: str = "formative"
    class_id: str
    tp_ids: list[str] = Field(default_factory=list)
    competency_ids: list[str] = Field(default_factory=list)
    blueprint_id: str | None = None
    question_ids: list[str] = Field(default_factory=list)
    question_count: int = 10
    student_ids: list[str] = Field(default_factory=list)
    adaptive: bool | None = None
    deadline: str | None = None
    minutes: int | None = None
    goal_note: str = ""


async def _build_assessment(body: AssessmentIn, actor: str) -> dict:
    if body.assessment_type not in ASSESSMENT_TYPES:
        raise HTTPException(400, f"jenis asesmen harus salah satu dari {list(ASSESSMENT_TYPES)}")
    cfg = ASSESSMENT_TYPES[body.assessment_type]
    cls = await db.classes.find_one({"id": body.class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(404, "kelas tidak ditemukan")
    tp_ids = list(body.tp_ids)
    if body.competency_ids and not tp_ids:
        comps = await db.curriculum_nodes.find({"id": {"$in": body.competency_ids}}, {"_id": 0}).to_list(200)
        tp_ids = sorted({c.get("tp_id") for c in comps if c.get("tp_id")})
    bp = None
    if body.blueprint_id:
        bp = await db.blueprints.find_one({"id": body.blueprint_id}, {"_id": 0})
        if not bp:
            raise HTTPException(404, "blueprint tidak ditemukan")
    if body.question_ids:
        qs = await db.questions.find({"question_id": {"$in": body.question_ids}, "is_current": True},
                                      {"_id": 0}).to_list(500)
        built = {"question_ids": [q["question_id"] for q in qs], "questions": qs, "notes": [],
                 "distribution": {}}
    else:
        targets = ([{"tp_id": t["tp_id"], "count": t["count"]} for t in bp["tp_targets"]] if bp
                   else [{"tp_id": t, "count": max(1, round(body.question_count / max(1, len(tp_ids))))}
                         for t in tp_ids])
        built = await assemble(targets,
                               (bp or {}).get("cognitive_distribution"),
                               (bp or {}).get("difficulty_distribution"),
                               (bp or {}).get("transfer_ratio", cfg["transfer_ratio"]),
                               (bp or {}).get("question_types"))
        if not tp_ids:
            tp_ids = sorted({t["tp_id"] for t in targets})
    comp_ids = body.competency_ids or sorted({q["competency_id"] for q in built["questions"]})
    if not comp_ids and tp_ids:
        comps = await db.curriculum_nodes.find({"type": "competency", "tp_id": {"$in": tp_ids}},
                                                {"_id": 0, "id": 1}).to_list(500)
        comp_ids = [c["id"] for c in comps]
    whole_class = not body.student_ids
    students = body.student_ids or (cls.get("student_ids") or [])
    doc = {"id": f"AS-{uuid.uuid4().hex[:8].upper()}", "title": body.title.strip()[:100],
           "assessment_type": body.assessment_type, "config": cfg,
           "adaptive": cfg["adaptive"] if body.adaptive is None else bool(body.adaptive),
           "class_id": body.class_id, "tp_ids": tp_ids, "competency_ids": comp_ids,
           "blueprint_id": body.blueprint_id, "question_ids": built["question_ids"],
           "question_count": len(built["question_ids"]) or body.question_count,
           "distribution": built.get("distribution"), "assembly_notes": built.get("notes"),
           "student_ids": students, "for_whole_class": whole_class,
           "status": "PUBLISHED", "goal_note": body.goal_note,
           "deadline": body.deadline, "minutes": body.minutes or max(5, len(built["question_ids"]) * 2),
           "created_by": actor, "created_at": now()}
    return doc


@router.post("/assessments")
async def create_assessment(body: AssessmentIn, u=Depends(teacher_user)):
    doc = await _build_assessment(body, u["user_id"])
    await db.assessments.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


class FromRecIn(BaseModel):
    kind: str
    class_id: str
    tp_id: str | None = None
    competency_id: str | None = None
    student_ids: list[str] = Field(default_factory=list)
    question_count: int = 8
    title: str | None = None


@router.post("/assessments/from-recommendation")
async def from_recommendation(body: FromRecIn, u=Depends(teacher_user)):
    """Satu klik dari rekomendasi Braincore -> intervensi nyata (remedial/practice/enrichment/diagnostic)."""
    tp = await db.curriculum_nodes.find_one({"id": body.tp_id}, {"_id": 0}) if body.tp_id else None
    label = ASSESSMENT_TYPES.get(body.kind, {}).get("label", body.kind)
    title = body.title or f"{label} — {(tp or {}).get('code') or (tp or {}).get('name') or 'Kompetensi terpilih'}"
    payload = AssessmentIn(title=title, assessment_type=body.kind, class_id=body.class_id,
                           tp_ids=[body.tp_id] if body.tp_id else [],
                           competency_ids=[body.competency_id] if body.competency_id else [],
                           student_ids=body.student_ids, question_count=body.question_count,
                           goal_note="Dibuat dari rekomendasi Braincore")
    doc = await _build_assessment(payload, u["user_id"])
    doc["from_recommendation"] = body.kind
    await db.assessments.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.get("/assessments")
async def list_assessments(class_id: str | None = None, u=Depends(current_user)):
    q: dict[str, Any] = {}
    if class_id:
        q["class_id"] = class_id
    if u["role"] == "student":
        q["student_ids"] = u["user_id"]
    items = await db.assessments.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    for a in items:
        sess = await db.sessions.find({"assessment_id": a["id"]}, {"_id": 0}).to_list(1000)
        a["progress"] = {"started": len(sess),
                         "finished": sum(1 for s in sess if s.get("state") == "finished"),
                         "targets": len(a.get("student_ids") or [])}
        if u["role"] == "student":
            mine = [s for s in sess if s["student_id"] == u["user_id"]]
            a["my_session"] = mine[0] if mine else None
    return items


@router.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str, u=Depends(current_user)):
    a = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "asesmen tidak ditemukan")
    return a


@router.get("/assessments/{assessment_id}/analytics")
async def assessment_analytics(assessment_id: str, u=Depends(teacher_user)):
    a = await get_assessment(assessment_id, u)
    sessions = await db.sessions.find({"assessment_id": assessment_id}, {"_id": 0}).to_list(1000)
    sids = [s["id"] for s in sessions]
    attempts = await db.attempts.find({"session_id": {"$in": sids}}, {"_id": 0}).to_list(10000)
    per_q: dict[str, dict] = {}
    for at in attempts:
        d = per_q.setdefault(at["question_id"], {"question_id": at["question_id"], "n": 0, "correct": 0,
                                                  "avg_time_ms": 0, "misconceptions": {}})
        d["n"] += 1
        d["correct"] += 1 if at.get("correct") else 0
        d["avg_time_ms"] += at.get("time_ms") or 0
        if at.get("misconception_id"):
            d["misconceptions"][at["misconception_id"]] = d["misconceptions"].get(at["misconception_id"], 0) + 1
    items = []
    for qid, d in per_q.items():
        q = await db.questions.find_one({"question_id": qid, "is_current": True}, {"_id": 0})
        p = d["correct"] / d["n"] if d["n"] else None
        items.append({**d, "avg_time_ms": round(d["avg_time_ms"] / d["n"]) if d["n"] else 0,
                      "p_value": round(p, 3) if p is not None else None,
                      "stem": (q or {}).get("stem"), "difficulty": (q or {}).get("difficulty"),
                      "cognitive_level": (q or {}).get("cognitive_level"),
                      "flag": ("terlalu sulit" if p is not None and p < 0.25 else
                               "terlalu mudah" if p is not None and p > 0.95 else "sehat")})
    items.sort(key=lambda x: (x["p_value"] if x["p_value"] is not None else 1))
    finished = [s for s in sessions if s.get("state") == "finished"]
    scores = [s.get("score") for s in finished if s.get("score") is not None]
    return {"assessment": a, "sessions": len(sessions), "finished": len(finished),
            "avg_score": round(sum(scores) / len(scores), 3) if scores else None,
            "items": items,
            "confidence_signals": {
                "lucky_guess": sum(1 for at in attempts if at.get("diagnosis") == "lucky_guess"),
                "false_confidence": sum(1 for at in attempts if at.get("diagnosis") == "false_confidence"),
                "careless": sum(1 for at in attempts if at.get("diagnosis") == "careless"),
                "misconception": sum(1 for at in attempts if at.get("diagnosis") == "misconception")}}


@router.get("/assessment-types")
async def assessment_types():
    return ASSESSMENT_TYPES


# ----------------------------- coverage & insight guru -----------------------------
@router.get("/coverage")
async def coverage(class_id: str, subject_id: str | None = None, grade_id: str | None = None,
                   u=Depends(teacher_user)):
    return await bc.coverage_matrix(class_id, subject_id, grade_id)


@router.get("/braincore/recommendations")
async def get_recommendations(class_id: str, u=Depends(teacher_user)):
    return {"class_id": class_id, "recommendations": await bc.recommendations(class_id)}


class GroupIn(BaseModel):
    class_id: str
    tp_id: str


@router.post("/braincore/groups")
async def post_groups(body: GroupIn, u=Depends(teacher_user)):
    return await bc.dynamic_groups(body.class_id, body.tp_id)


class PlanIn(BaseModel):
    class_id: str
    tp_id: str
    minutes: int = 45


@router.post("/braincore/lesson-plan")
async def post_lesson_plan(body: PlanIn, u=Depends(teacher_user)):
    return await bc.lesson_plan(body.class_id, body.tp_id, body.minutes)


@router.get("/braincore/tp-detail")
async def tp_detail(class_id: str, tp_id: str, u=Depends(teacher_user)):
    return {"summary": await bc.student_tp_summary(class_id, tp_id),
            "misconceptions": await bc.class_misconceptions(class_id, tp_id),
            "state_labels": bc.STATE_LABEL}


@router.get("/braincore/passport/{student_id}")
async def passport(student_id: str, u=Depends(current_user)):
    if u["role"] == "student" and u["user_id"] != student_id:
        raise HTTPException(403, "Hanya bisa melihat paspor sendiri")
    return await bc.learning_passport(student_id)


@router.get("/braincore/evidence-graph/{student_id}")
async def evidence(student_id: str, u=Depends(current_user)):
    if u["role"] == "student" and u["user_id"] != student_id:
        raise HTTPException(403, "Hanya bisa melihat evidence sendiri")
    return await bc.evidence_graph(student_id)


@router.get("/braincore/student-state")
async def student_state(student_id: str, competency_id: str, u=Depends(current_user)):
    st = await bc.get_state(student_id, competency_id)
    return {**st, "state_label": bc.STATE_LABEL.get(st["state"]), "retrievability": bc.retrievability(st)}
