"""Koneksi MongoDB + indeks. Server = source of truth; klien tetap boleh local-first."""
import os
from motor.motor_asyncio import AsyncIOMotorClient

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


async def ensure_indexes():
    await db.users.create_index("email", unique=True,
                                partialFilterExpression={"email": {"$type": "string"}})
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.teacher_invites.create_index("token", unique=True)
    await db.curriculum_nodes.create_index("id", unique=True)
    await db.curriculum_nodes.create_index([("type", 1), ("parent_id", 1)])
    await db.curriculum_nodes.create_index([("type", 1), ("tp_id", 1)])
    await db.questions.create_index([("question_id", 1), ("version", 1)], unique=True)
    await db.questions.create_index([("status", 1), ("tp_id", 1)])
    await db.questions.create_index("competency_id")
    await db.questions.create_index("variant_group_id")
    await db.question_versions.create_index([("question_id", 1), ("version", 1)])
    await db.attempts.create_index("idempotency_key", unique=True)
    await db.attempts.create_index([("student_id", 1), ("competency_id", 1)])
    await db.attempts.create_index("session_id")
    await db.learner_competency.create_index([("student_id", 1), ("competency_id", 1)], unique=True)
    await db.misconception_ledger.create_index(
        [("student_id", 1), ("competency_id", 1), ("misconception_id", 1)], unique=True)
    await db.learning_events.create_index("event_id", unique=True)
    await db.learning_events.create_index([("student_id", 1), ("at", -1)])
    await db.classes.create_index("code", unique=True)
    await db.assessments.create_index([("class_id", 1), ("created_at", -1)])
    await db.sessions.create_index([("student_id", 1), ("assessment_id", 1)])
