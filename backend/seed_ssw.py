"""Idempotent seeder for SSW SENSEI Knowledge Base & Video Corpus.

Mirrors `seed_mapel.py` and `seed.py` patterns: stores heavy SSW Pengolahan Makanan
data (OTAFF Ed. 4 & Ver 5.1 Apr 2026, 91 PDF pages, 266 Kotoba, 58+ Quizzes, and all
86+ YouTube SSW transcripts including 47 Wakai Papa videos/Shorts) in MongoDB so the
frontend bundle stays lightweight without blocking normal app startup.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends

from auth import teacher_user
from db import db

router = APIRouter(prefix="/api/seed", tags=["seed-ssw"])

_DATA_FILE = Path(__file__).resolve().parent / "data" / "ssw_sensei_full_corpus.json"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def sanitize_ssw_dashes(val: Any) -> Any:
    """Enforces zero em-dash or en-dash anywhere in learner-facing SSW text."""
    if isinstance(val, str):
        return re.sub(r"\s{2,}", " ", val.replace("\u2014", " - ").replace("\u2013", "-")).strip()
    if isinstance(val, list):
        return [sanitize_ssw_dashes(v) for v in val]
    if isinstance(val, dict):
        return {k: sanitize_ssw_dashes(v) for k, v in val.items()}
    return val


@lru_cache(maxsize=1)
def load_ssw_corpus_from_disk() -> dict[str, Any]:
    """Loads & caches the compiled SSW corpus JSON from backend/data once per worker."""
    if not _DATA_FILE.exists():
        return {
            "masterKb": {
                "meta": {"title": "SSW SENSEI KB Missing", "totalPdfPages": 91, "totalKotoba": 266, "totalQuizQuestions": 0, "passingScorePct": 65},
                "roadmapStages": [],
                "goldenNumbers": [],
                "wakaiPapaTrapsAndSecrets": [],
                "mathFormulas": [],
                "pages": [],
                "kotoba": [],
                "quizzes": [],
            },
            "videoCorpus": {"meta": {"totalVideos": 0, "totalChunks": 0}, "videos": [], "chunks": []},
        }
    raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    return sanitize_ssw_dashes(raw)


async def seed_ssw_knowledge() -> dict[str, Any]:
    """Idempotently upserts SSW knowledge items, quizzes, and YouTube chunks into MongoDB."""
    corpus = load_ssw_corpus_from_disk()
    kb = corpus.get("masterKb") or {}
    vc = corpus.get("videoCorpus") or {}

    pages = kb.get("pages") or []
    kotoba = kb.get("kotoba") or []
    quizzes = kb.get("quizzes") or []
    videos = vc.get("videos") or []
    chunks = vc.get("chunks") or []
    now_dt = _now()

    expected_items = 5 + len(pages) + len(kotoba) + len(videos)
    cur_items = await db.ssw_knowledge_items.count_documents({})
    cur_quizzes = await db.ssw_quizzes.count_documents({})
    cur_chunks = await db.ssw_video_chunks.count_documents({})

    created_items = 0
    if cur_items < expected_items:
        docs: list[dict[str, Any]] = [
            {"id": "ssw_meta", "kind": "meta", "data": kb.get("meta", {}), "updated_at": now_dt},
            {"id": "ssw_roadmap", "kind": "roadmap", "data": kb.get("roadmapStages", []), "updated_at": now_dt},
            {"id": "ssw_golden", "kind": "golden", "data": kb.get("goldenNumbers", []), "updated_at": now_dt},
            {"id": "ssw_traps", "kind": "traps", "data": kb.get("wakaiPapaTrapsAndSecrets", []), "updated_at": now_dt},
            {"id": "ssw_formulas", "kind": "formulas", "data": kb.get("mathFormulas", []), "updated_at": now_dt},
        ]
        for pg in pages:
            docs.append({
                "id": f"page_{pg['page']:03d}",
                "kind": "pdf_page",
                "page": int(pg["page"]),
                "data": pg,
                "updated_at": now_dt,
            })
        for kt in kotoba:
            docs.append({
                "id": str(kt["id"]),
                "kind": "kotoba",
                "page": int(kt.get("pdfPage", 46)),
                "data": kt,
                "updated_at": now_dt,
            })
        for vd in videos:
            docs.append({
                "id": f"video_{vd['videoId']}",
                "kind": "video_meta",
                "videoId": vd["videoId"],
                "isWakaiPapa": bool(vd.get("isWakaiPapa")),
                "data": vd,
                "updated_at": now_dt,
            })
        for d in docs:
            res = await db.ssw_knowledge_items.update_one(
                {"id": d["id"]},
                {"$set": d},
                upsert=True,
            )
            if res.upserted_id is not None:
                created_items += 1

    created_quizzes = 0
    if cur_quizzes < len(quizzes):
        for q in quizzes:
            res = await db.ssw_quizzes.update_one(
                {"id": str(q["id"])},
                {"$set": {**q, "updated_at": now_dt}},
                upsert=True,
            )
            if res.upserted_id is not None:
                created_quizzes += 1

    created_chunks = 0
    if cur_chunks < len(chunks):
        for ch in chunks:
            res = await db.ssw_video_chunks.update_one(
                {"chunkId": str(ch["chunkId"])},
                {"$set": {**ch, "updated_at": now_dt}},
                upsert=True,
            )
            if res.upserted_id is not None:
                created_chunks += 1

    return {
        "ok": True,
        "created_items": created_items,
        "created_quizzes": created_quizzes,
        "created_chunks": created_chunks,
        "totals": {
            "pages": len(pages),
            "kotoba": len(kotoba),
            "quizzes": len(quizzes),
            "videos": len(videos),
            "wakaiPapaVideos": sum(1 for v in videos if v.get("isWakaiPapa")),
            "chunks": len(chunks),
        },
    }


@router.post("/ssw")
async def seed_ssw_route(u=Depends(teacher_user)):
    return await seed_ssw_knowledge()


@router.get("/ssw/status")
async def seed_ssw_status():
    corpus = load_ssw_corpus_from_disk()
    vc = corpus.get("videoCorpus") or {}
    kb = corpus.get("masterKb") or {}
    return {
        "disk": {
            "pages": len(kb.get("pages") or []),
            "kotoba": len(kb.get("kotoba") or []),
            "quizzes": len(kb.get("quizzes") or []),
            "videos": len(vc.get("videos") or []),
            "chunks": len(vc.get("chunks") or []),
        },
        "mongo": {
            "items": await db.ssw_knowledge_items.count_documents({}),
            "quizzes": await db.ssw_quizzes.count_documents({}),
            "chunks": await db.ssw_video_chunks.count_documents({}),
        },
    }
