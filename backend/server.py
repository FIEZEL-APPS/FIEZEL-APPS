from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import db, ensure_indexes
import auth
from auth import router as auth_router, owner_router
from curriculum import router as curriculum_router
from questions import router as questions_router
from assessment import router as assessment_router
from learning import router as learning_router
from seed import router as seed_router, seed_curriculum, seed_questions
from seed_english import router as seed_english_router, seed_english_curriculum

app = FastAPI(title="FIEZEL Learning System API", version="1.0.0")

# CORS. Bawaannya SENGAJA kosong, bukan "*", dan itu perbaikan lubang nyata.
#
# Versi sebelumnya memakai `os.environ.get("CORS_ORIGINS", "*")` BERSAMA
# `allow_credentials=True`. Kombinasi itu tidak berperilaku seperti dugaan orang.
# Perilakunya DIUKUR pada versi yang benar-benar dipaku repo ini (starlette 0.37.2,
# lihat requirements.txt) — bukan dikira, dan bukan disalin dari versi lain, karena
# versi Starlette yang lebih baru menjawab berbeda:
#
#   request dari origin asing TANPA cookie  -> Allow-Origin: *                (aman)
#   request dari origin asing DENGAN cookie -> Allow-Origin: https://asing    (LUBANG)
#                                              Allow-Credentials: true
#
# Baris kedua itulah masalahnya, dan justru baris itu yang terjadi pada murid yang
# sedang login. Begitu API ini hidup di internet, situs mana pun bisa memanggilnya
# dari browser murid, cookie sesi murid ikut terkirim, dan penyerang MEMBACA
# jawabannya. Tidak ada satu pun baris di sini yang terlihat salah saat itu terjadi.
#
# Karena itu bawaannya kini GAGAL-TERTUTUP: tanpa CORS_ORIGINS, tidak ada origin
# lintas-situs yang diizinkan sama sekali. Pemasang WAJIB menyebut asalnya sendiri,
# mis. CORS_ORIGINS=https://fiezel.my.id — satu keputusan sadar, bukan bawaan diam.
#
# "*" masih boleh ditulis EKSPLISIT untuk pengembangan lokal, dan kalau itu terjadi
# kredensial dimatikan, karena "buka untuk semua" dan "bawa cookie" tidak pernah
# boleh benar bersamaan.
_raw_origins = os.environ.get("CORS_ORIGINS", "").strip()
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_wildcard = "*" in _origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard else _origins,
    allow_credentials=not _wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth_router, owner_router, curriculum_router, questions_router,
          assessment_router, learning_router, seed_router, seed_english_router):
    app.include_router(r)


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "fiezel-learning-engine",
            "curriculum_nodes": await db.curriculum_nodes.count_documents({}),
            "questions": await db.questions.count_documents({"is_current": True}),
            "attempts": await db.attempts.count_documents({})}


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await auth.seed_owner()
    if await db.curriculum_nodes.count_documents({}) == 0:
        await seed_curriculum()
        await seed_questions()
    if await db.curriculum_nodes.count_documents({"id": {"$regex": "^TP-ENG-1-"}}) == 0:
        await seed_english_curriculum()
