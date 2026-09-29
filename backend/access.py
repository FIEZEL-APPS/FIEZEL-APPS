"""Kontrol akses berbasis KEPEMILIKAN (anti-IDOR), dipakai assessment.py & learning.py.

Sebelumnya endpoint guru hanya memeriksa PERAN (teacher_user): guru mana pun bisa membaca
cakupan/rekomendasi/asesmen/sesi kelas guru lain hanya dengan menebak class_id, dan murid
bisa membaca state murid lain lewat ?student_id=. Kepemilikan ditentukan classes.teacher_id
(guru) dan classes.student_ids / users.class_ids (murid). Owner bebas.
"""
from fastapi import HTTPException

from db import db


async def class_or_404(class_id: str) -> dict:
    cls = await db.classes.find_one({"id": class_id}, {"_id": 0})
    if not cls:
        raise HTTPException(404, "kelas tidak ditemukan")
    return cls


async def assert_class_teacher(class_id: str, u: dict) -> dict:
    """Guru hanya kelas yang DIAMPUnya; owner bebas."""
    cls = await class_or_404(class_id)
    if u["role"] != "owner" and cls.get("teacher_id") != u["user_id"]:
        raise HTTPException(403, "Kelas ini bukan kelas yang Anda ampu")
    return cls


async def assert_class_member(class_id: str, u: dict) -> dict:
    """Guru pengampu, murid terdaftar, atau owner."""
    cls = await class_or_404(class_id)
    if u["role"] == "owner":
        return cls
    if u["role"] == "teacher":
        if cls.get("teacher_id") != u["user_id"]:
            raise HTTPException(403, "Kelas ini bukan kelas yang Anda ampu")
        return cls
    if u["user_id"] not in (cls.get("student_ids") or []):
        raise HTTPException(403, "Anda tidak terdaftar di kelas ini")
    return cls


async def assert_student_access(student_id: str, u: dict):
    """Murid hanya data DIRINYA; guru hanya murid di kelas yang diampunya; owner bebas."""
    if u["role"] == "owner":
        return
    if u["role"] == "student":
        if student_id != u["user_id"]:
            raise HTTPException(403, "Hanya bisa melihat data sendiri")
        return
    cls = await db.classes.find_one(
        {"teacher_id": u["user_id"], "student_ids": student_id}, {"_id": 0, "id": 1})
    if not cls:
        raise HTTPException(403, "Murid ini tidak berada di kelas yang Anda ampu")


async def teacher_class_ids(u: dict) -> list[str]:
    rows = await db.classes.find({"teacher_id": u["user_id"]}, {"_id": 0, "id": 1}).to_list(500)
    return [r["id"] for r in rows]


def student_targeted(a: dict, u: dict) -> bool:
    return (u["user_id"] in (a.get("student_ids") or [])
            or bool(a.get("for_whole_class") and a.get("class_id") in (u.get("class_ids") or [])))


async def assert_assessment_access(a: dict, u: dict):
    """Murid: hanya asesmen yang ditujukan padanya. Guru: hanya asesmen di kelas yang diampu."""
    if u["role"] == "owner":
        return
    if u["role"] == "student":
        if not student_targeted(a, u):
            raise HTTPException(403, "Asesmen ini bukan untukmu")
        return
    await assert_class_teacher(a["class_id"], u)
