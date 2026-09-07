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

origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in origins],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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
