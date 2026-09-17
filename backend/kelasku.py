"""Pembaca TIKET IDENTITAS KelasKu — pasangan Python dari
`workers/api/auth/curriculum-ticket.js`.

Konsol kurikulum tidak punya daftar gurunya sendiri lagi. Satu-satunya cara
masuk adalah membawa tiket berumur dua menit yang diterbitkan Worker KelasKu
untuk pemegang cookie identitasnya. Berkas ini yang membacanya.

KENAPA BENTUKNYA DISALIN, BUKAN DIPAKAI BERSAMA
-----------------------------------------------
Penerbitnya berjalan di runtime Workers (WebCrypto), pembacanya di CPython. Tidak
ada satu berkas yang bisa dijalankan keduanya, jadi bentuknya WAJIB didefinisikan
dua kali — dan dua definisi yang menyimpang adalah kelas cacat yang paling sulit
dilihat, karena ia baru muncul saat tiket sungguhan menyeberang di produksi.
Karena itu `tests/curriculum-ticket-parity-test.js` MENJALANKAN kedua sisi atas
vektor yang sama dan menuntut hasilnya identik bit per bit; konstanta di bawah
dibaca gerbang itu langsung dari kedua berkas.

TIGA PENOLAKAN YANG TIDAK PERNAH DIBEDAKAN DI RESPONS
-----------------------------------------------------
Tanda tangan salah, tiket kedaluwarsa, dan tiket yang sudah dipakai menghasilkan
SATU kalimat penolakan yang sama. Membedakannya memberi tahu penyerang mana dari
ketiganya yang hampir benar. Alasan sebenarnya hanya masuk log server.
"""
import base64
import hashlib
import hmac
import json
import os
import time

TICKET_VERSION = 1
TICKET_AUDIENCE = "fiezel-curriculum"
TICKET_CLOCK_SKEW_SECONDS = 60
TICKET_KEY_ENV = "CURRICULUM_TICKET_KEY"
TICKET_KEY_MIN_LENGTH = 32


class TicketError(Exception):
    """Kegagalan membaca tiket. `reason` untuk log, TIDAK untuk pengguna."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def ticket_key() -> str:
    """Kunci bersama. Absen atau terlalu pendek = fitur MATI, bukan nilai cadangan.

    Nilai cadangan di sini berarti siapa pun yang menebak nilai cadangan itu bisa
    menerbitkan identitas guru. Mati terang-terangan bisa diperbaiki; tanda tangan
    yang bisa ditebak tidak pernah ketahuan.
    """
    key = os.environ.get(TICKET_KEY_ENV, "")
    if len(key) < TICKET_KEY_MIN_LENGTH:
        raise TicketError("key_weak")
    return key


def _b64url_decode(text: str) -> bytes:
    pad = "=" * ((4 - len(text) % 4) % 4)
    return base64.urlsafe_b64decode(text + pad)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def sign_ticket(secret: str, payload: dict) -> str:
    """Penerbit sisi Python. HANYA dipakai gerbang paritas dan uji; produksi
    menerbitkannya di Worker, tempat cookie identitasnya berada."""
    encoded = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    return encoded + "." + _b64url_encode(sig)


def verify_ticket(ticket: str, now: float | None = None) -> dict:
    """Kembalikan payload tiket yang sah, atau lempar `TicketError`."""
    secret = ticket_key()
    raw = str(ticket or "")
    dot = raw.find(".")
    if dot < 1 or dot == len(raw) - 1:
        raise TicketError("malformed")
    encoded, sig = raw[:dot], raw[dot + 1:]

    expected = hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest()
    try:
        given = _b64url_decode(sig)
    except Exception:
        raise TicketError("malformed")
    # compare_digest, bukan '==': perbandingan yang berhenti di byte pertama yang
    # berbeda membocorkan berapa banyak byte awal yang sudah benar.
    if not hmac.compare_digest(expected, given):
        raise TicketError("bad_signature")

    try:
        payload = json.loads(_b64url_decode(encoded).decode("utf-8"))
    except Exception:
        raise TicketError("malformed")
    if not isinstance(payload, dict):
        raise TicketError("malformed")
    if payload.get("v") != TICKET_VERSION:
        raise TicketError("version")
    if payload.get("aud") != TICKET_AUDIENCE:
        raise TicketError("audience")
    if not payload.get("sub") or not payload.get("role"):
        raise TicketError("claims")

    now_sec = int(now if now is not None else time.time())
    exp = payload.get("exp")
    iat = payload.get("iat")
    if not isinstance(exp, int) or now_sec > exp + TICKET_CLOCK_SKEW_SECONDS:
        raise TicketError("expired")
    if not isinstance(iat, int) or iat > now_sec + TICKET_CLOCK_SKEW_SECONDS:
        raise TicketError("future")
    return payload


# Peta peran Worker -> peran mesin kurikulum. Peran yang tidak dikenal jatuh ke
# murid, BUKAN ke guru: kegagalan pemetaan harus menutup pintu, bukan membukanya.
ROLE_MAP = {"owner": "owner", "teacher": "teacher", "learner": "student"}


def role_for(worker_role: str) -> str:
    return ROLE_MAP.get(str(worker_role or "").strip().lower(), "student")
