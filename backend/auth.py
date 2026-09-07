"""Auth FIEZEL: guru masuk dengan token undangan dari owner, murid dengan email+sandi
FIEZEL atau Google (Emergent-managed). Semua route di bawah /api/auth."""
import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import httpx
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel, EmailStr

from db import db

ALG = "HS256"
ACCESS_MIN = 720
REFRESH_DAYS = 7
router = APIRouter(prefix="/api/auth", tags=["auth"])
owner_router = APIRouter(prefix="/api/owner", tags=["owner"])


def now():
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def _secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, role: str) -> str:
    return jwt.encode({"sub": user_id, "role": role, "type": "access",
                       "exp": now() + timedelta(minutes=ACCESS_MIN)}, _secret(), algorithm=ALG)


def create_refresh_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "type": "refresh",
                       "exp": now() + timedelta(days=REFRESH_DAYS)}, _secret(), algorithm=ALG)


def _set_cookies(response: Response, user: dict) -> str:
    token = create_access_token(user["user_id"], user["role"])
    response.set_cookie("access_token", token,
                        httponly=True, secure=True, samesite="none", max_age=ACCESS_MIN * 60, path="/")
    response.set_cookie("refresh_token", create_refresh_token(user["user_id"]),
                        httponly=True, secure=True, samesite="none", max_age=REFRESH_DAYS * 86400, path="/")
    return token


def public_user(u: dict) -> dict:
    return {"user_id": u["user_id"], "email": u.get("email"), "name": u.get("name"),
            "role": u.get("role"), "picture": u.get("picture"), "class_ids": u.get("class_ids", []),
            "provider": u.get("provider", "fiezel")}


async def _token_user(token: str):
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALG])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    return await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})


async def current_user_optional(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        u = await _token_user(token)
        if u:
            return u
    st = request.cookies.get("session_token") or request.headers.get("X-Session-Token")
    if st:
        sess = await db.user_sessions.find_one({"session_token": st}, {"_id": 0})
        if sess:
            exp = sess["expires_at"]
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp > now():
                return await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return None


async def current_user(request: Request):
    u = await current_user_optional(request)
    if not u:
        raise HTTPException(401, "Not authenticated")
    return u


async def teacher_user(request: Request):
    u = await current_user(request)
    if u.get("role") not in ("teacher", "owner"):
        raise HTTPException(403, "Teacher role required")
    return u


async def owner_guard(request: Request):
    tok = request.headers.get("X-Owner-Token", "")
    if tok and secrets.compare_digest(tok, os.environ["OWNER_MASTER_TOKEN"]):
        return {"user_id": "owner", "role": "owner", "name": "Owner"}
    u = await current_user_optional(request)
    if u and u.get("role") == "owner":
        return u
    raise HTTPException(403, "Owner only")


# ---------------- murid: email + sandi FIEZEL ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    class_code: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


MAX_FAILED = 5
LOCK_MIN = 15


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    if len(body.password) < 6:
        raise HTTPException(400, "Sandi minimal 6 karakter")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email sudah terdaftar")
    user = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": body.name.strip()[:60],
            "role": "student", "password_hash": hash_password(body.password), "provider": "fiezel",
            "class_ids": [], "created_at": now()}
    await db.users.insert_one(dict(user))
    if body.class_code:
        await join_class(user, body.class_code)
    token = _set_cookies(response, user)
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {**public_user(fresh), "access_token": token}


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for") or request.headers.get("x-real-ip") or ""
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "na"


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower().strip()
    # dihitung per-email (tahan rotasi IP) + per-IP sebagai lapisan kedua
    idents = [f"email:{email}", f"ip:{client_ip(request)}:{email}"]
    for ident in idents:
        att = await db.login_attempts.find_one({"identifier": ident}, {"_id": 0})
        if att and att.get("count", 0) >= MAX_FAILED:
            last = att["last_at"]
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if now() - last < timedelta(minutes=LOCK_MIN):
                raise HTTPException(429, "Terlalu banyak percobaan. Coba lagi 15 menit.")
            await db.login_attempts.delete_one({"identifier": ident})
    u = await db.users.find_one({"email": email})
    if not u or not u.get("password_hash") or not verify_password(body.password, u["password_hash"]):
        for ident in idents:
            await db.login_attempts.update_one({"identifier": ident},
                                               {"$inc": {"count": 1}, "$set": {"last_at": now()}},
                                               upsert=True)
        raise HTTPException(401, "Email atau sandi salah")
    await db.login_attempts.delete_many({"identifier": {"$in": idents}})
    token = _set_cookies(response, u)
    return {**public_user(u), "access_token": token}


# ---------------- guru: token undangan dari owner ----------------
class TeacherTokenIn(BaseModel):
    token: str
    name: str | None = None


@router.post("/teacher/token")
async def teacher_token_login(body: TeacherTokenIn, response: Response):
    tok = body.token.strip().upper()
    invite = await db.teacher_invites.find_one({"token": tok})
    if not invite and not secrets.compare_digest(tok, os.environ["OWNER_MASTER_TOKEN"].upper()):
        raise HTTPException(401, "Token guru tidak dikenal. Minta token dari owner FIEZEL.")
    if invite and invite.get("revoked"):
        raise HTTPException(401, "Token guru sudah dinonaktifkan")
    if invite and invite.get("user_id"):
        u = await db.users.find_one({"user_id": invite["user_id"]}, {"_id": 0})
        if u:
            token = _set_cookies(response, u)
            return {**public_user(u), "access_token": token}
    name = (body.name or (invite or {}).get("name") or "Guru FIEZEL").strip()[:60]
    is_owner = not invite
    user = {"user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": (invite or {}).get("email") or f"guru-{uuid.uuid4().hex[:6]}@fiezel.local",
            "name": name, "role": "owner" if is_owner else "teacher", "provider": "token",
            "invite_token": tok, "class_ids": [], "created_at": now()}
    await db.users.insert_one(dict(user))
    if invite:
        await db.teacher_invites.update_one({"token": tok},
                                            {"$set": {"user_id": user["user_id"], "used_at": now()}})
    token = _set_cookies(response, user)
    return {**public_user(user), "access_token": token}


class InviteIn(BaseModel):
    name: str
    email: str | None = None


@owner_router.post("/teacher-invites")
async def mint_invite(body: InviteIn, owner=Depends(owner_guard)):
    tok = "FZG-" + secrets.token_hex(4).upper()
    doc = {"token": tok, "name": body.name[:60], "email": (body.email or "").lower() or None,
           "created_by": owner["user_id"], "created_at": now(), "user_id": None, "revoked": False}
    await db.teacher_invites.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@owner_router.get("/teacher-invites")
async def list_invites(owner=Depends(owner_guard)):
    return await db.teacher_invites.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


# ---------------- murid: Google (Emergent-managed) ----------------
class SessionIn(BaseModel):
    session_id: str
    class_code: str | None = None


@router.post("/google/session")
async def google_session(body: SessionIn, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    url = os.environ["EMERGENT_AUTH_SESSION_URL"]
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(url, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Sesi Google tidak valid")
    data = r.json()
    email = (data.get("email") or "").lower()
    u = await db.users.find_one({"email": email})
    if not u:
        u = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": data.get("name") or email,
             "picture": data.get("picture"), "role": "student", "provider": "google",
             "class_ids": [], "created_at": now()}
        await db.users.insert_one(dict(u))
    else:
        await db.users.update_one({"user_id": u["user_id"]},
                                   {"$set": {"picture": data.get("picture"), "provider": u.get("provider", "google")}})
    await db.user_sessions.insert_one({"user_id": u["user_id"], "session_token": data["session_token"],
                                       "expires_at": now() + timedelta(days=7), "created_at": now()})
    response.set_cookie("session_token", data["session_token"], httponly=True, secure=True,
                        samesite="none", max_age=7 * 86400, path="/")
    token = _set_cookies(response, u)
    if body.class_code:
        await join_class(u, body.class_code)
    fresh = await db.users.find_one({"user_id": u["user_id"]}, {"_id": 0})
    return {**public_user(fresh), "access_token": token}


# ---------------- umum ----------------
async def join_class(user: dict, code: str):
    code = code.strip().upper()
    cls = await db.classes.find_one({"code": code}, {"_id": 0})
    if not cls:
        return None
    await db.classes.update_one({"id": cls["id"]}, {"$addToSet": {"student_ids": user["user_id"]}})
    await db.users.update_one({"user_id": user["user_id"]}, {"$addToSet": {"class_ids": cls["id"]}})
    return cls


class JoinIn(BaseModel):
    class_code: str


@router.post("/join-class")
async def join_class_route(body: JoinIn, u=Depends(current_user)):
    cls = await join_class(u, body.class_code)
    if not cls:
        raise HTTPException(404, "Kode kelas tidak ditemukan")
    return {"ok": True, "class": cls}


@router.get("/me")
async def me(u=Depends(current_user)):
    return public_user(u)


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    if not tok:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(tok, _secret(), algorithms=[ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    u = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0})
    if not u:
        raise HTTPException(401, "User not found")
    token = _set_cookies(response, u)
    return {**public_user(u), "access_token": token}


@router.post("/logout")
async def logout(request: Request, response: Response):
    st = request.cookies.get("session_token")
    if st:
        await db.user_sessions.delete_many({"session_token": st})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


async def seed_owner():
    email = os.environ["ADMIN_EMAIL"].lower()
    pwd = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email,
                                   "name": "Owner FIEZEL", "role": "owner", "provider": "fiezel",
                                   "password_hash": hash_password(pwd), "class_ids": [], "created_at": now()})
    elif not verify_password(pwd, existing.get("password_hash") or ""):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pwd),
                                                              "role": "owner"}})
