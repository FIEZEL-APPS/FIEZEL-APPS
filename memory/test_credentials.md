# FIEZEL — Kredensial uji (lingkungan preview lokal; JANGAN dipakai di produksi)

## Model auth (origin/main, sejak m025-318): SATU pintu = tiket KelasKu
Tidak ada email/sandi, tidak ada token owner. Klien menukar tiket HMAC berumur 2 menit:
`POST /api/auth/kelasku` body `{"ticket": "<tiket>", "class_code": "<opsional>"}` →
`{access_token, user_id, role, ...}`; pakai header `Authorization: Bearer <access_token>`.

### Menerbitkan tiket uji (lokal)
Kunci ada di `/app/backend/.env` → `CURRICULUM_TICKET_KEY` (acak, dibuat 2026-06; server preview
memakai nilai yang sama). Contoh:
```bash
cd /app/backend && set -a && . ./.env && set +a && /root/.venv/bin/python - <<'EOF'
import os, time, uuid
from kelasku import sign_ticket, TICKET_AUDIENCE, TICKET_VERSION
now = int(time.time())
for role in ("owner", "teacher", "learner"):   # learner -> role "student" di server
    print(role, sign_ticket(os.environ["CURRICULUM_TICKET_KEY"], {"v": TICKET_VERSION, "aud": TICKET_AUDIENCE,
        "sub": f"qa-{role}-{uuid.uuid4().hex[:6]}", "role": role, "name": f"QA {role}",
        "iat": now, "exp": now + 120, "jti": uuid.uuid4().hex}))
EOF
```
Tiket sekali pakai (jti dibakar) dan kedaluwarsa 2 menit — terbitkan baru untuk tiap login.

| Peran | Cara masuk | Catatan |
| --- | --- | --- |
| Owner | tiket `role: owner` | bebas akses semua kelas |
| Guru | tiket `role: teacher` | hanya kelas dengan `classes.teacher_id` = dirinya |
| Murid | tiket `role: learner` + `class_code` | hanya data dirinya & kelas tempat ia terdaftar |

## Kelas & data demo
* `POST /api/seed/bootstrap` (sebagai guru) → membuat kelas demo MILIK guru itu (kode `FZ-DEMO7A`
  untuk guru pertama, `FZ-DEMOxxxx` untuk berikutnya), 18 murid roster + 180 evidence sintetis.
* Kurikulum seed: `KURMER` → `FASE-D` → `KELAS-7` → `MAT-7` / `ENG-7`.
* TP contoh: `TP-MAT-D-7-BIL-01`, `TP-MAT-D-7-BIL-02` (GAP), `TP-MAT-D-7-BIL-03` (MISSING).

## Env lokal (`/app/backend/.env`, tidak di-commit)
`MONGO_URL=mongodb://localhost:27017`, `DB_NAME=fiezel_dev`, `JWT_SECRET`, `CURRICULUM_TICKET_KEY`, `CORS_ORIGINS=*`.

## Suite uji
* `python unit_test.py` (61 cek) · `python probe.py` (15 cek) — tanpa server.
* `API_URL=http://localhost:8001 python -m pytest tests/test_idor_e2e.py -q` — anti-IDOR 2 guru/2 kelas/2 murid.
* `REACT_APP_BACKEND_URL=http://localhost:8001 python -m pytest tests/test_fiezel_backend.py -q` — regresi.
  (Keduanya butuh env `.env` ter-export: `set -a && . ./.env && set +a`.)
