"""Titik masuk Passenger (cPanel "Setup Python App") untuk API FIEZEL.

Passenger berbicara WSGI; FastAPI berbicara ASGI. `a2wsgi` menjembatani keduanya.

═══════════════════════════════════════════════════════════════════════════════
YANG PALING PENTING DI BERKAS INI: LIFESPAN TIDAK PERNAH JALAN DI SINI
═══════════════════════════════════════════════════════════════════════════════

`server.py` punya `@app.on_event("startup")` yang mengerjakan tiga hal yang tidak
opsional: `ensure_indexes()`, `seed_owner()`, dan penyemaian kurikulum awal.

Di bawah Passenger, ketiganya TIDAK PERNAH terjadi. `a2wsgi` menerjemahkan
per-request dan tidak menjalankan protokol lifespan ASGI sama sekali. Ini diukur,
bukan dikira — dijalankan di Chromium-less Python 3.11 dengan a2wsgi 1.10.10:

    status : 200 OK
    body   : {"ok":true,"startup_sudah_jalan":false}

Perhatikan statusnya: **200 OK**. Inilah yang membuatnya berbahaya. API-nya tampak
sehat sementara:

  - indeks unik tidak pernah dibuat. `users.email`, `users.user_id`,
    `attempts.idempotency_key` semuanya UNIQUE di `db.py`. Tanpa indeks itu,
    MongoDB dengan patuh menerima email ganda dan percobaan jawaban ganda —
    tidak ada galat, hanya data yang pelan-pelan rusak;
  - akun owner tidak pernah lahir, jadi kamu tidak bisa masuk ke konsolmu sendiri;
  - kurikulum dan bank soal tidak pernah disemai, jadi databasenya kosong.

Karena itu ketiganya dipindahkan ke `bootstrap.py`, yang dijalankan SEKALI sebagai
proses tersendiri (lihat dokumennya). Berkas ini hanya melayani permintaan.

JANGAN "memperbaiki" ini dengan memanggil `server.startup()` dari sini. Motor
(`AsyncIOMotorClient`) mengikat diri ke event loop yang pertama memakainya;
memanggil startup di loop lain membuat setiap query sesudahnya gagal dengan
"attached to a different loop". Loop milik a2wsgi sendiri sudah diperiksa
konsisten antar-request (tiga request berturut-turut melaporkan id loop yang sama),
jadi jalur request aman — selama tidak ada yang menyentuh Motor di luarnya.
"""

import os
import sys

# cPanel menjalankan Passenger dengan cwd yang tidak dijamin = direktori ini,
# sedangkan server.py memakai impor datar (`from db import db`). Tanpa baris ini
# aplikasinya mati saat impor dengan ModuleNotFoundError yang membingungkan.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from a2wsgi import ASGIMiddleware  # noqa: E402
from server import app  # noqa: E402

# Nama `application` adalah yang DICARI Passenger. Mengubahnya = 503 tanpa petunjuk.
application = ASGIMiddleware(app)
