"""Curriculum Engine — learning graph berjenjang dengan ID stabil.

Satu koleksi bertipe (curriculum_nodes) menyimpan seluruh jenjang:
curriculum > phase > grade > subject > element > cp > tp > indicator > competency > topic > material
Setiap node menyimpan denormalisasi jalur (phase_id, cp_id, tp_id, ...) supaya
setiap objective bisa ditelusuri tanpa join berantai.
"""
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db import db
from auth import teacher_user, current_user_optional

router = APIRouter(prefix="/api/curriculum", tags=["curriculum"])

TYPES = ["curriculum", "phase", "grade", "subject", "element", "cp", "tp",
         "indicator", "competency", "topic", "material"]
PARENT_OF = {t: (TYPES[i - 1] if i else None) for i, t in enumerate(TYPES)}
PATH_KEYS = {t: f"{t}_id" for t in TYPES}


def now():
    return datetime.now(timezone.utc)


def slug(s: str, n: int = 18) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", (s or "").upper()).strip("-")
    return s[:n] or "NODE"


def path_of(parent: dict | None) -> dict:
    if not parent:
        return {}
    out = {k: v for k, v in parent.items() if k in PATH_KEYS.values() and v}
    out[PATH_KEYS[parent["type"]]] = parent["id"]
    return out


async def next_code(node_type: str, parent: dict | None, name: str) -> str:
    prefix = {"tp": "TP", "cp": "CP", "indicator": "IND", "competency": "KOMP",
              "element": "EL", "topic": "TOP", "material": "MAT"}.get(node_type)
    if not prefix:
        return f"{node_type.upper()}-{slug(name)}"
    n = await db.curriculum_nodes.count_documents({"type": node_type,
                                                   "parent_id": parent["id"] if parent else None})
    base = slug(parent["code"] if parent else "ROOT", 22)
    return f"{prefix}-{base}-{n + 1:02d}"


class NodeIn(BaseModel):
    type: str
    parent_id: str | None = None
    name: str
    id: str | None = None
    code: str | None = None
    description: str = ""
    order: int = 0
    meta: dict[str, Any] = Field(default_factory=dict)


async def create_node(body: NodeIn, actor: str = "system") -> dict:
    if body.type not in TYPES:
        raise HTTPException(400, f"type harus salah satu dari {TYPES}")
    parent = None
    if body.type != "curriculum":
        if not body.parent_id:
            raise HTTPException(400, f"{body.type} wajib punya parent {PARENT_OF[body.type]}")
        parent = await db.curriculum_nodes.find_one({"id": body.parent_id}, {"_id": 0})
        if not parent:
            raise HTTPException(404, "parent tidak ditemukan")
        if parent["type"] != PARENT_OF[body.type]:
            raise HTTPException(400, f"{body.type} harus di bawah {PARENT_OF[body.type]}, bukan {parent['type']}")
    code = body.code or await next_code(body.type, parent, body.name)
    node_id = body.id or code
    if await db.curriculum_nodes.find_one({"id": node_id}):
        raise HTTPException(400, f"id {node_id} sudah dipakai")
    doc = {"id": node_id, "code": code, "type": body.type, "parent_id": body.parent_id,
           "name": body.name.strip(), "description": body.description, "order": body.order,
           "meta": body.meta, "status": "active", "created_by": actor,
           "created_at": now(), "updated_at": now()}
    doc.update(path_of(parent))
    await db.curriculum_nodes.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.post("/nodes")
async def post_node(body: NodeIn, u=Depends(teacher_user)):
    return await create_node(body, u["user_id"])


class NodePatch(BaseModel):
    name: str | None = None
    description: str | None = None
    order: int | None = None
    meta: dict[str, Any] | None = None
    status: str | None = None


@router.patch("/nodes/{node_id}")
async def patch_node(node_id: str, body: NodePatch, u=Depends(teacher_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        return await get_node(node_id)
    upd["updated_at"] = now()
    r = await db.curriculum_nodes.update_one({"id": node_id}, {"$set": upd})
    if not r.matched_count:
        raise HTTPException(404, "node tidak ditemukan")
    return await get_node(node_id)


@router.delete("/nodes/{node_id}")
async def archive_node(node_id: str, u=Depends(teacher_user)):
    """Non-destruktif: node diarsipkan agar evidence historis tetap terbaca."""
    r = await db.curriculum_nodes.update_one({"id": node_id},
                                             {"$set": {"status": "archived", "updated_at": now()}})
    if not r.matched_count:
        raise HTTPException(404, "node tidak ditemukan")
    return {"ok": True, "id": node_id, "status": "archived"}


@router.get("/nodes")
async def list_nodes(type: str | None = None, parent_id: str | None = None,
                     tp_id: str | None = None, subject_id: str | None = None,
                     grade_id: str | None = None, include_archived: bool = False):
    q: dict[str, Any] = {}
    for k, v in (("type", type), ("parent_id", parent_id), ("tp_id", tp_id),
                 ("subject_id", subject_id), ("grade_id", grade_id)):
        if v:
            q[k] = v
    if not include_archived:
        q["status"] = "active"
    return await db.curriculum_nodes.find(q, {"_id": 0}).sort([("order", 1), ("code", 1)]).to_list(2000)


@router.get("/node/{node_id}")
async def get_node(node_id: str):
    n = await db.curriculum_nodes.find_one({"id": node_id}, {"_id": 0})
    if not n:
        raise HTTPException(404, "node tidak ditemukan")
    return n


@router.get("/node/{node_id}/trace")
async def trace(node_id: str):
    """Metadata penuh: kurikulum apa, fase berapa, kelas, mapel, elemen, CP, TP, indikator, kompetensi."""
    n = await get_node(node_id)
    chain = []
    cur = n
    while cur:
        chain.append({"id": cur["id"], "code": cur["code"], "type": cur["type"], "name": cur["name"]})
        cur = await db.curriculum_nodes.find_one({"id": cur.get("parent_id")}, {"_id": 0}) if cur.get("parent_id") else None
    chain.reverse()
    return {"node": n, "breadcrumb": chain,
            "labels": {c["type"]: c["name"] for c in chain},
            "ids": {c["type"] + "_id": c["id"] for c in chain}}


@router.get("/tree")
async def tree(curriculum_id: str | None = None, subject_id: str | None = None,
               grade_id: str | None = None, depth: str = "competency"):
    """Pohon kurikulum sampai kedalaman tertentu (default sampai kompetensi)."""
    limit = TYPES.index(depth) if depth in TYPES else TYPES.index("competency")
    q: dict[str, Any] = {"status": "active"}
    if curriculum_id:
        q["$or"] = [{"id": curriculum_id}, {"curriculum_id": curriculum_id}]
    nodes = await db.curriculum_nodes.find(q, {"_id": 0}).sort([("order", 1), ("code", 1)]).to_list(5000)
    nodes = [n for n in nodes if TYPES.index(n["type"]) <= limit]
    if subject_id:
        nodes = [n for n in nodes if n.get("subject_id") == subject_id or n["id"] == subject_id
                 or TYPES.index(n["type"]) < TYPES.index("subject")]
    if grade_id:
        nodes = [n for n in nodes if n.get("grade_id") == grade_id or n["id"] == grade_id
                 or TYPES.index(n["type"]) < TYPES.index("grade")]
    by_parent: dict[str | None, list] = {}
    for n in nodes:
        by_parent.setdefault(n.get("parent_id"), []).append(n)

    def build(pid):
        out = []
        for n in by_parent.get(pid, []):
            item = dict(n)
            item["children"] = build(n["id"])
            out.append(item)
        return out

    roots = [n for n in nodes if n["type"] == "curriculum"] or by_parent.get(None, [])
    return [dict(r, children=build(r["id"])) for r in roots]


@router.get("/competencies")
async def competencies(tp_id: str | None = None, subject_id: str | None = None,
                       grade_id: str | None = None):
    q: dict[str, Any] = {"type": "competency", "status": "active"}
    if tp_id:
        q["tp_id"] = tp_id
    if subject_id:
        q["subject_id"] = subject_id
    if grade_id:
        q["grade_id"] = grade_id
    return await db.curriculum_nodes.find(q, {"_id": 0}).sort("code", 1).to_list(2000)


class PrereqIn(BaseModel):
    prerequisite_competency_ids: list[str]


@router.put("/competency/{competency_id}/prerequisites")
async def set_prereq(competency_id: str, body: PrereqIn, u=Depends(teacher_user)):
    node = await get_node(competency_id)
    if node["type"] != "competency":
        raise HTTPException(400, "hanya kompetensi yang punya prasyarat")
    for cid in body.prerequisite_competency_ids:
        if cid == competency_id:
            raise HTTPException(400, "kompetensi tidak boleh menjadi prasyarat dirinya sendiri")
        if not await db.curriculum_nodes.find_one({"id": cid, "type": "competency"}):
            raise HTTPException(404, f"prasyarat {cid} bukan kompetensi yang dikenal")
    meta = dict(node.get("meta") or {})
    meta["prerequisite_competency_ids"] = body.prerequisite_competency_ids
    await db.curriculum_nodes.update_one({"id": competency_id},
                                          {"$set": {"meta": meta, "updated_at": now()}})
    return await get_node(competency_id)


async def prerequisites_of(competency_id: str) -> list[str]:
    n = await db.curriculum_nodes.find_one({"id": competency_id}, {"_id": 0})
    return list(((n or {}).get("meta") or {}).get("prerequisite_competency_ids") or [])


@router.get("/legacy-map")
async def legacy_map():
    """Kompatibilitas: skill lama (past_tense, dst.) -> competency_id baru."""
    nodes = await db.curriculum_nodes.find({"type": "competency", "meta.legacy_skill": {"$exists": True}},
                                            {"_id": 0}).to_list(500)
    return {n["meta"]["legacy_skill"]: {"competency_id": n["id"], "tp_id": n.get("tp_id"),
                                        "name": n["name"]} for n in nodes}


@router.get("/subjects")
async def subjects(grade_id: str | None = None):
    q: dict[str, Any] = {"type": "subject", "status": "active"}
    if grade_id:
        q["parent_id"] = grade_id
    return await db.curriculum_nodes.find(q, {"_id": 0}).sort("name", 1).to_list(500)


@router.get("/health-check")
async def curriculum_health(subject_id: str | None = None):
    """Peringatan struktur: TP tanpa indikator, indikator tanpa kompetensi, kompetensi tanpa soal."""
    q: dict[str, Any] = {"status": "active"}
    if subject_id:
        q["subject_id"] = subject_id
    nodes = await db.curriculum_nodes.find(q, {"_id": 0}).to_list(5000)
    by_type: dict[str, list] = {}
    for n in nodes:
        by_type.setdefault(n["type"], []).append(n)
    warns = []
    ind_parents = {n["parent_id"] for n in by_type.get("indicator", [])}
    comp_parents = {n["parent_id"] for n in by_type.get("competency", [])}
    for tp in by_type.get("tp", []):
        if tp["id"] not in ind_parents:
            warns.append({"level": "warn", "node_id": tp["id"], "code": tp["code"],
                          "message": f"TP “{tp['name']}” belum memiliki indikator."})
    for ind in by_type.get("indicator", []):
        if ind["id"] not in comp_parents:
            warns.append({"level": "warn", "node_id": ind["id"], "code": ind["code"],
                          "message": f"Indikator “{ind['name']}” belum memiliki kompetensi."})
    comp_ids = [c["id"] for c in by_type.get("competency", [])]
    if comp_ids:
        with_q = await db.questions.distinct("competency_id",
                                             {"competency_id": {"$in": comp_ids},
                                              "status": {"$in": ["APPROVED", "PUBLISHED"]}})
        for c in by_type.get("competency", []):
            if c["id"] not in set(with_q):
                warns.append({"level": "info", "node_id": c["id"], "code": c["code"],
                              "message": f"Kompetensi “{c['name']}” belum punya soal terbit."})
    return {"warnings": warns, "counts": {k: len(v) for k, v in by_type.items()}}
