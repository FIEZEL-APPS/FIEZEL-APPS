"""SSW SENSEI Backend API - Pengolahan Makanan (OTAFF Ed. 4 & Ver 5.1 Apr 2026).

Mirrors Kurikulum SMP architecture (`curriculum.py` + `seed_mapel.py`): keeps the
complete 91-page PDF manual, 266 Kotoba, 58+ CBT/Math quizzes, and 86+ Indonesian
SSW YouTube transcripts (including 47 Wakai Papa videos/Shorts) on the backend so
the main PWA and Kawan Bicara JS bundle stay fast and lightweight.
"""
from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from db import db
from seed_ssw import load_ssw_corpus_from_disk, sanitize_ssw_dashes

router = APIRouter(prefix="/api/ssw", tags=["ssw-sensei"])

_LETTERS = ["A", "B", "C", "D"]
_PREGRADE_SPOILER_RE = re.compile(
    r"\s+-\s+(?!\d+(?:[,.]\d+)?\s*(?:°C|C|%|ppm|jam|menit|detik|kg|g|mL|L|cm|mm|triliun|miliar|juta)\b).*$"
)


def _clean_pregrade_option_id(text: str) -> str:
    return _PREGRADE_SPOILER_RE.sub("", sanitize_ssw_dashes(text or "")).strip()


def _norm_tokens(text: str) -> list[str]:
    cleaned = re.sub(r"[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+", " ", (text or "").lower())
    return [tok for tok in cleaned.split() if len(tok) >= 2]


def _score_haystack(haystack: str, query_lower: str, tokens: list[str]) -> int:
    if not haystack:
        return 0
    low = haystack.lower()
    score = 0
    if query_lower and query_lower in low:
        score += 12
    for tok in tokens:
        if tok in low:
            score += 4
    return score


async def _load_runtime_data() -> tuple[dict[str, Any], dict[str, Any]]:
    """Uses pre-seeded MongoDB documents when present, with cached corpus fallback."""
    disk = load_ssw_corpus_from_disk()
    kb = disk.get("masterKb") or {}
    vc = disk.get("videoCorpus") or {}
    return kb, vc


@router.get("/health")
async def ssw_health():
    kb, vc = await _load_runtime_data()
    mongo_ok = True
    mongo_counts = {"items": 0, "quizzes": 0, "chunks": 0}
    try:
        mongo_counts["items"] = await db.ssw_knowledge_items.count_documents({})
        mongo_counts["quizzes"] = await db.ssw_quizzes.count_documents({})
        mongo_counts["chunks"] = await db.ssw_video_chunks.count_documents({})
    except Exception:
        mongo_ok = False
    return {
        "ok": True,
        "service": "ssw-sensei-backend",
        "pages": len(kb.get("pages") or []),
        "kotoba": len(kb.get("kotoba") or []),
        "quizzes": len(kb.get("quizzes") or []),
        "traps": len(kb.get("wakaiPapaTrapsAndSecrets") or []),
        "videos": len(vc.get("videos") or []),
        "wakaiPapaVideos": sum(1 for v in (vc.get("videos") or []) if v.get("isWakaiPapa")),
        "chunks": len(vc.get("chunks") or []),
        "mongoReachable": mongo_ok,
        "mongoCounts": mongo_counts,
    }


@router.get("/bootstrap")
async def ssw_bootstrap():
    """Returns compact core manifest (~14 KB) without heavy pages or transcripts."""
    kb, vc = await _load_runtime_data()
    return {
        "ok": True,
        "meta": kb.get("meta", {}),
        "roadmapStages": kb.get("roadmapStages", []),
        "goldenNumbers": kb.get("goldenNumbers", []),
        "mathFormulas": kb.get("mathFormulas", []),
        "wakaiPapaTrapsAndSecrets": kb.get("wakaiPapaTrapsAndSecrets", []),
        "videoMeta": vc.get("meta", {}),
    }


@router.get("/bundle")
async def ssw_bundle(include_chunks: bool = Query(False)):
    """Lazy-hydrates structured KB (91 pages, 266 Kotoba, 58+ quizzes) and video catalog."""
    kb, vc = await _load_runtime_data()
    out: dict[str, Any] = {
        "ok": True,
        "masterKb": kb,
        "videosMeta": vc.get("meta", {}),
        "videos": vc.get("videos", []),
    }
    if include_chunks:
        out["chunks"] = vc.get("chunks", [])
    return out


@router.get("/page/{page_num}")
async def ssw_page_detail(page_num: int):
    if page_num < 1 or page_num > 91:
        raise HTTPException(400, "Nomor halaman PDF harus antara 1 sampai 91.")
    kb, vc = await _load_runtime_data()
    page_item = next((p for p in (kb.get("pages") or []) if int(p.get("page", 0)) == page_num), None)
    if not page_item:
        raise HTTPException(404, f"Halaman {page_num} tidak ditemukan.")
    kotoba_items = [k for k in (kb.get("kotoba") or []) if int(k.get("pdfPage", 0)) == page_num]
    traps = [t for t in (kb.get("wakaiPapaTrapsAndSecrets") or []) if int(t.get("pdfPage", 0)) == page_num]
    formulas = [f for f in (kb.get("mathFormulas") or []) if int(f.get("pdfPage", 0)) == page_num]
    related_videos = [
        v for v in (vc.get("videos") or [])
        if page_num in (v.get("pdfPagesSuggested") or [])
    ][:6]
    return {
        "ok": True,
        "page": page_item,
        "kotoba": kotoba_items,
        "traps": traps,
        "formulas": formulas,
        "relatedVideos": related_videos,
    }


@router.get("/search")
async def ssw_search(
    q: str = Query("", description="Kata kunci Bahasa Indonesia atau Jepang"),
    page: int | None = Query(None, ge=1, le=91),
    channel: str | None = Query(None),
    limit: int = Query(8, ge=1, le=20),
):
    kb, vc = await _load_runtime_data()
    clean_q = sanitize_ssw_dashes(q).strip()
    q_lower = clean_q.lower()
    tokens = _norm_tokens(clean_q)
    channel_filter = (channel or "").strip().lower()

    if page is not None and not clean_q:
        detail = await ssw_page_detail(page)
        return {
            "ok": True,
            "query": f"Hal. {page}",
            "page": detail["page"],
            "matches": {
                "pages": [detail["page"]],
                "kotoba": detail["kotoba"][:limit],
                "traps": detail["traps"],
                "formulas": detail["formulas"],
                "videoInsights": detail["relatedVideos"][:limit],
            },
        }

    scored_pages: list[tuple[int, dict[str, Any]]] = []
    for p in kb.get("pages") or []:
        hay = f"{p.get('unit','')} {p.get('title','')} {p.get('otaffRef','')} {p.get('focusCompass','')} {p.get('summary','')}"
        sc = _score_haystack(hay, q_lower, tokens)
        if page is not None and int(p.get("page", 0)) == page:
            sc += 40
        if sc > 0:
            scored_pages.append((sc, p))
    scored_pages.sort(key=lambda x: (-x[0], int(x[1].get("page", 999))))

    scored_kotoba: list[tuple[int, dict[str, Any]]] = []
    for k in kb.get("kotoba") or []:
        hay = f"{k.get('jp','')} {k.get('reading','')} {k.get('romaji','')} {k.get('meaningId','')} {k.get('category','')}"
        sc = _score_haystack(hay, q_lower, tokens)
        if sc > 0:
            scored_kotoba.append((sc, k))
    scored_kotoba.sort(key=lambda x: -x[0])

    scored_traps: list[tuple[int, dict[str, Any]]] = []
    for t in kb.get("wakaiPapaTrapsAndSecrets") or []:
        hay = f"{t.get('title','')} {t.get('detail','')} {t.get('source','')}"
        sc = _score_haystack(hay, q_lower, tokens)
        if sc > 0:
            scored_traps.append((sc, t))
    scored_traps.sort(key=lambda x: -x[0])

    scored_formulas: list[tuple[int, dict[str, Any]]] = []
    for f in kb.get("mathFormulas") or []:
        hay = f"{f.get('name','')} {f.get('formula','')} {f.get('rule','')}"
        sc = _score_haystack(hay, q_lower, tokens)
        if sc > 0:
            scored_formulas.append((sc, f))
    scored_formulas.sort(key=lambda x: -x[0])

    scored_chunks: list[tuple[int, dict[str, Any]]] = []
    for ch in vc.get("chunks") or []:
        if channel_filter and channel_filter not in str(ch.get("channel", "")).lower():
            continue
        hay = f"{ch.get('title','')} {ch.get('topicCategory','')} {ch.get('text','')}"
        sc = _score_haystack(hay, q_lower, tokens)
        if sc > 0 and ch.get("isWakaiPapa"):
            sc += 2  # Prioritaskan penjelasan Wakai Papa bila relevansinya setara
        if page is not None and page in (ch.get("pdfPagesSuggested") or []):
            sc += 5
        if sc > 0:
            scored_chunks.append((sc, ch))
    scored_chunks.sort(key=lambda x: (-x[0], 0 if x[1].get("isWakaiPapa") else 1, int(x[1].get("chunkIndex", 0))))

    # Deduplicate video chunks slightly (max 2 chunks per single video so variety is broad)
    video_insights: list[dict[str, Any]] = []
    per_vid_count: dict[str, int] = {}
    for _, ch in scored_chunks:
        vid = str(ch.get("videoId", ""))
        cnt = per_vid_count.get(vid, 0)
        if cnt >= 2:
            continue
        per_vid_count[vid] = cnt + 1
        video_insights.append({
            "chunkId": ch.get("chunkId"),
            "videoId": vid,
            "channel": ch.get("channel"),
            "isWakaiPapa": ch.get("isWakaiPapa"),
            "title": ch.get("title"),
            "url": f"https://www.youtube.com/watch?v={vid}",
            "topicCategory": ch.get("topicCategory"),
            "pdfPagesSuggested": ch.get("pdfPagesSuggested"),
            "text": ch.get("text"),
        })
        if len(video_insights) >= limit:
            break

    return {
        "ok": True,
        "query": clean_q,
        "matches": {
            "pages": [p for _, p in scored_pages[:limit]],
            "kotoba": [k for _, k in scored_kotoba[:limit]],
            "traps": [t for _, t in scored_traps[:limit]],
            "formulas": [f for _, f in scored_formulas[:limit]],
            "videoInsights": video_insights,
        },
    }


@router.get("/videos")
async def ssw_videos(
    wakai_papa_only: bool = Query(False),
    topic: str = Query(""),
    limit: int = Query(100, ge=1, le=200),
):
    _, vc = await _load_runtime_data()
    vids = vc.get("videos") or []
    t_low = topic.strip().lower()
    filtered = [
        v for v in vids
        if (not wakai_papa_only or v.get("isWakaiPapa"))
        and (not t_low or t_low in f"{v.get('title','')} {v.get('topicCategory','')}".lower())
    ]
    return {
        "ok": True,
        "total": len(filtered),
        "wakaiPapaCount": sum(1 for v in filtered if v.get("isWakaiPapa")),
        "videos": filtered[:limit],
    }


@router.get("/video/{video_id}")
async def ssw_video_detail(video_id: str):
    _, vc = await _load_runtime_data()
    v = next((item for item in (vc.get("videos") or []) if item.get("videoId") == video_id), None)
    if not v:
        raise HTTPException(404, f"Video {video_id} tidak ditemukan di korpus SSW.")
    chunks = [c for c in (vc.get("chunks") or []) if c.get("videoId") == video_id]
    return {"ok": True, "video": v, "chunks": chunks}


@router.get("/quiz/draw")
async def ssw_quiz_draw(
    mode: str = Query("all"),
    topic: str = Query(""),
    exclude: str = Query(""),
):
    kb, _ = await _load_runtime_data()
    quizzes = kb.get("quizzes") or []
    if not quizzes:
        raise HTTPException(503, "Bank kuis SSW belum tersedia.")

    excluded = {x.strip() for x in exclude.split(",") if x.strip()}
    t_low = topic.strip().lower()
    m_low = mode.strip().lower()

    pool = list(quizzes)
    if m_low == "math":
        math_pool = [q for q in pool if "math" in str(q.get("id", "")).lower() or "hitung" in str(q.get("tag", "")).lower() or "kalkulator" in str(q.get("questionId", "")).lower()]
        if math_pool:
            pool = math_pool
    elif m_low == "trap":
        trap_pool = [q for q in pool if str(q.get("id", "")).startswith("wp_trap_")]
        if trap_pool:
            pool = trap_pool

    if t_low:
        t_pool = [
            q for q in pool
            if t_low in f"{q.get('tag','')} {q.get('questionId','')} {q.get('questionJp','')}".lower()
        ]
        if t_pool:
            pool = t_pool

    unseen = [q for q in pool if q.get("id") not in excluded]
    chosen = (unseen or pool)[0]

    # Intentionally strip correctIndex / correctLetter / explanationId / spoiler rationales until graded
    options = []
    opts_jp = chosen.get("optionsJp") or []
    opts_ruby = chosen.get("optionsRuby") or []
    opts_read = chosen.get("optionsReading") or []
    opts_id = chosen.get("optionsId") or []
    for idx, opt_jp in enumerate(opts_jp):
        options.append({
            "letter": _LETTERS[idx] if idx < len(_LETTERS) else str(idx + 1),
            "index": idx,
            "jp": opt_jp,
            "ruby": opts_ruby[idx] if idx < len(opts_ruby) else opt_jp,
            "reading": opts_read[idx] if idx < len(opts_read) else "",
            "id": _clean_pregrade_option_id(opts_id[idx]) if idx < len(opts_id) else "",
        })

    return {
        "ok": True,
        "quizId": chosen.get("id"),
        "n": chosen.get("n"),
        "tag": chosen.get("tag"),
        "tryoutPdfPage": chosen.get("tryoutPdfPage"),
        "discussionPdfPage": chosen.get("discussionPdfPage"),
        "questionJp": chosen.get("questionJp"),
        "questionRuby": chosen.get("questionRuby"),
        "questionReading": chosen.get("questionReading"),
        "questionId": chosen.get("questionId"),
        "options": options,
    }


class SswGradeIn(BaseModel):
    quizId: str
    userAnswer: str


def _resolve_option_idx(quiz: dict[str, Any], user_answer: str) -> int:
    raw = sanitize_ssw_dashes(user_answer or "").strip()
    if not raw:
        return -1
    upper = raw.upper()
    opts_jp = quiz.get("optionsJp") or []
    opts_id = quiz.get("optionsId") or []

    m = re.match(r"^(?:OPSI|JAWABAN|PILIH(?:AN)?|HURUF)?\s*([ABCD])[.)\s]*$", upper)
    if m:
        idx = _LETTERS.index(m.group(1))
        if idx < len(opts_jp):
            return idx
    m2 = re.search(r"\b(?:OPSI|JAWABAN|PILIH|YANG)\s+([ABCD])\b", upper)
    if m2:
        idx = _LETTERS.index(m2.group(1))
        if idx < len(opts_jp):
            return idx

    low = raw.lower()
    norm = re.sub(r"[.,]+", "", low).strip()
    nums = re.findall(r"\d[\d.,]*", raw)
    best_idx, best_hits = -1, 0
    for i, opt_jp in enumerate(opts_jp):
        opt_id = opts_id[i] if i < len(opts_id) else ""
        comb = f"{opt_jp} {opt_id}".lower().replace(",", "")
        if norm == re.sub(r"[.,]+", "", str(opt_jp).lower()).strip() or norm == re.sub(r"[.,]+", "", str(opt_id).lower()).strip():
            return i
        if nums:
            opt_nums = re.findall(r"\d+", comb)
            hits = sum(1 for n in nums if re.sub(r"[.,]", "", n) in opt_nums)
            if hits == len(nums) and hits > best_hits:
                best_hits, best_idx = hits, i
    if best_idx >= 0:
        return best_idx

    if len(norm) >= 3:
        for i, opt_jp in enumerate(opts_jp):
            opt_id = opts_id[i] if i < len(opts_id) else ""
            if norm in str(opt_id).lower() or norm in str(opt_jp).lower():
                return i

    if re.fullmatch(r"[1234]", raw):
        idx = int(raw) - 1
        if idx < len(opts_jp):
            return idx
    return -1


@router.post("/quiz/grade")
async def ssw_quiz_grade(body: SswGradeIn):
    kb, _ = await _load_runtime_data()
    quizzes = kb.get("quizzes") or []
    quiz = next((q for q in quizzes if str(q.get("id")) == body.quizId), None)
    if not quiz:
        raise HTTPException(404, f"Kuis {body.quizId} tidak ditemukan.")

    sel_idx = _resolve_option_idx(quiz, body.userAnswer)
    corr_idx = int(quiz.get("correctIndex", 0))
    ok = sel_idx == corr_idx
    opts_jp = quiz.get("optionsJp") or []
    opts_id = quiz.get("optionsId") or []
    rationales_id = quiz.get("optionRationalesId") or []

    return {
        "found": True,
        "ok": ok,
        "quizId": quiz.get("id"),
        "tag": quiz.get("tag"),
        "userAnswer": sanitize_ssw_dashes(body.userAnswer),
        "selectedIndex": sel_idx,
        "selectedLetter": _LETTERS[sel_idx] if 0 <= sel_idx < len(_LETTERS) else "?",
        "selectedRationaleId": rationales_id[sel_idx] if 0 <= sel_idx < len(rationales_id) else "",
        "correctIndex": corr_idx,
        "correctLetter": quiz.get("correctLetter") or (_LETTERS[corr_idx] if corr_idx < len(_LETTERS) else "A"),
        "correctAnswerJp": opts_jp[corr_idx] if corr_idx < len(opts_jp) else "",
        "correctAnswerId": _clean_pregrade_option_id(opts_id[corr_idx]) if corr_idx < len(opts_id) else "",
        "correctRationaleId": rationales_id[corr_idx] if 0 <= corr_idx < len(rationales_id) else "",
        "explanationId": quiz.get("explanationId") or "",
        "tryoutPdfPage": quiz.get("tryoutPdfPage"),
        "discussionPdfPage": quiz.get("discussionPdfPage"),
    }
