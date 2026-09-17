"""Auth FIEZEL: SATU pintu, yaitu KelasKu.

Sampai m025-301 berkas ini memuat TIGA pintu yang berdiri sendiri — token undangan
`FZG-` untuk guru, email+sandi untuk murid, dan sesi Google — lengkap dengan daftar
gurunya sendiri di Mongo. Akibatnya persis yang dikeluhkan owner: guru yang sudah
terverifikasi di KelasKu tetap ditolak di konsol kurikulum, karena dashboard owner
menerbitkan kode ke D1 Worker sementara pintu ini membaca koleksi Mongo yang tidak
pernah dilihat dashboard mana pun. Token `FZG-` bahkan tidak punya SATU PUN
antarmuka penerbit; satu-satunya jalan adalah memanggil API dengan curl.

Ketiga pintu itu DICABUT. Yang tersisa satu: `POST /api/auth/kelasku`, yang menukar
tiket identitas KelasKu berumur dua menit (lihat kelasku.py) dengan sesi di sini.
Konsekuensinya disengaja:
  - tidak ada kata sandi yang disimpan mesin kurikulum, jadi tidak ada kata sandi
    yang bisa bocor darinya;
  - peran datang dari D1 lewat tiket, jadi guru yang dicabut owner di KelasKu
    kehilangan akses di sini pada tiket berikutnya — tanpa ada yang perlu ingat
    mencabutnya dua kali;
  - murid cukup memasukkan kode kelas KelasKu; tidak ada pendaftaran ketiga.

Semua route di bawah /api/auth."""
import os
import uuid

from datetime import datetime, timezone, timedelta

import jwt
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from pydantic import BaseModel

from db import db
from pymongo.errors import DuplicateKeyError

from kelasku import TICKET_CLOCK_SKEW_SECONDS, TicketError, role_for, verify_ticket

ALG = "HS256"
ACCESS_MIN = 720
REFRESH_DAYS = 7
router = APIRouter(prefix="/api/auth", tags=["auth"])
owner_router = APIRouter(prefix="/api/owner", tags=["owner"])


def now():
    return datetime.now(timezone.utc)


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
    """Owner = peran yang dibawa tiket KelasKu, titik.

    Versi lama menerima header `X-Owner-Token` berisi OWNER_MASTER_TOKEN. Itu kunci
    utama yang dikirim di setiap permintaan, tidak pernah berputar, dan nilainya
    sudah terpublikasi di repo (memory/test_credentials.md). Ia dicabut bersama
    seluruh pintu kedua: siapa yang owner sekarang diputuskan D1 KelasKu, satu
    tempat, dan pencabutan di sana berlaku di sini pada tiket berikutnya.
    """
    u = await current_user(request)
    if u.get("role") != "owner":
        raise HTTPException(403, "Owner only")
    return u


# ---------------- SATU-SATUNYA pintu: tiket KelasKu ----------------
class KelasKuIn(BaseModel):
    ticket: str
    class_code: str | None = None


# Tiket yang sudah dipakai tidak boleh dipakai lagi. Jendelanya hanya dua menit,
# jadi daftar ini tidak pernah tumbuh besar; ia dibersihkan indeks TTL Mongo
# (lihat db.ensure_indexes). Tanpa ini, tiket yang tercuri dari log masih bisa
# dipakai ulang selama sisa umurnya.
#
# BARIS INI HIDUP LEBIH LAMA DARIPADA TIKETNYA, dan selisih itu bukan kelebihan:
# verify_ticket menerima tiket sampai `exp + TICKET_CLOCK_SKEW_SECONDS` (toleransi jam
# antar-server). Kalau barisnya mati tepat di `exp`, ada jendela sampai 60 detik di mana
# tiketnya MASIH diterima sementara catatan "sudah dipakai"-nya sudah disapu TTL — dan
# di jendela itu tiket yang terpungut dari log bisa dipakai sekali lagi. Umur baris
# karena itu diikat ke batas PENERIMAAN, bukan ke batas tiket.
# (Temuan review gitar-bot di PR #428; diukur, bukan didugaan — lihat gerbangnya di
# tests/curriculum-single-door-test.js.)
async def _burn_ticket(jti: str, exp: int):
    try:
        await db.kelasku_tickets.insert_one({
            "jti": jti,
            "expires_at": datetime.fromtimestamp(exp + TICKET_CLOCK_SKEW_SECONDS, tz=timezone.utc),
        })
    except DuplicateKeyError:
        # SATU-SATUNYA kegagalan yang berarti "tiket ini sudah dipakai". Kalimatnya sama
        # dengan penolakan lain (anti-oracle).
        raise HTTPException(401, "Tiket KelasKu tidak berlaku. Muat ulang halaman dan coba lagi.")
    # Galat Mongo LAIN sengaja tidak ditangkap. Menelannya jadi 401 berarti saat MongoDB
    # tersendat setiap orang membaca "tiket tidak berlaku, muat ulang" — lalu memuat ulang,
    # mendapat tiket baru, dan gagal lagi. Gangguan infrastruktur yang menyamar sebagai
    # kesalahan pengguna adalah gangguan yang tidak akan pernah dicari orang di tempat yang
    # benar; biarkan ia menjadi 5xx yang jujur.


@router.post("/kelasku")
async def kelasku_login(body: KelasKuIn, response: Response):
    """Tukar tiket identitas KelasKu dengan sesi mesin kurikulum.

    Tidak ada kata sandi, tidak ada token kedua, tidak ada pendaftaran. Guru yang
    sudah masuk KelasKu menekan satu tombol; murid memasukkan kode kelasnya.

    SATU kalimat penolakan untuk semua sebab (tanda tangan salah, kedaluwarsa,
    sudah dipakai, kunci tidak dipasang). Membedakannya memberi tahu pemalsu mana
    yang hampir benar; sebab aslinya hanya masuk log server.
    """
    try:
        payload = verify_ticket(body.ticket)
    except TicketError as e:
        print(f"[kelasku] tiket ditolak: {e.reason}")
        raise HTTPException(401, "Tiket KelasKu tidak berlaku. Muat ulang halaman dan coba lagi.")

    await _burn_ticket(str(payload.get("jti") or ""), int(payload["exp"]))

    sub = str(payload["sub"])
    role = role_for(payload.get("role"))
    name = (str(payload.get("name") or "").strip() or "Pengguna FIEZEL")[:60]

    u = await db.users.find_one({"kelasku_sub": sub})
    if not u:
        u = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "kelasku_sub": sub, "email": None,
             "name": name, "role": role, "provider": "kelasku",
             "class_ids": [], "created_at": now()}
        await db.users.insert_one(dict(u))
    else:
        # Peran DISELARASKAN setiap kali, bukan hanya saat pembuatan. Guru yang
        # dicabut owner di KelasKu harus kehilangan akses di sini juga, dan satu-
        # satunya cara yang tidak bergantung pada ingatan siapa pun adalah menulis
        # ulang peran dari tiket pada setiap masuk.
        await db.users.update_one({"user_id": u["user_id"]},
                                  {"$set": {"role": role, "name": name, "provider": "kelasku"}})

    if body.class_code:
        await join_class(u, body.class_code)

    fresh = await db.users.find_one({"user_id": u["user_id"]}, {"_id": 0})
    token = _set_cookies(response, fresh)
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


# ---------------- tidak ada lagi yang perlu disemai ----------------
#
# Versi lama menyemai akun owner berkata-sandi dari ADMIN_EMAIL/ADMIN_PASSWORD, dan
# bootstrap.py punya bendera --reset-owner-password untuk menimpanya. Keduanya dicabut
# bersama pintu kata sandi: mesin kurikulum tidak menyimpan satu pun kata sandi sekarang,
# dan siapa yang owner diputuskan D1 KelasKu lewat peran di dalam tiket.
#
# Akibat yang disengaja: tidak ada lagi "sandi owner yang lupa" di sistem ini, karena
# tidak ada sandi. Pemulihan akses adalah urusan KelasKu, satu tempat.
