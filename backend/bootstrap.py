"""Penyiapan sekali-jalan untuk pemasangan permanen: indeks, owner, semaian awal.

KENAPA BERKAS INI ADA
─────────────────────
`server.py` mengerjakan ketiganya di `@app.on_event("startup")`, dan itu benar
ketika dijalankan uvicorn. Di bawah Passenger (cPanel) lifespan ASGI TIDAK PERNAH
dijalankan — diukur, bukan dikira — sehingga ketiganya diam-diam dilewati sementara
API tetap menjawab 200. Lihat catatan panjang di `passenger_wsgi.py`.

Jadi jalankan berkas ini SEKALI sesudah memasang, dan setiap kali sesudah menaikkan
versi yang menambah indeks:

    cd ~/fiezel-api && source ~/virtualenv/fiezel-api/3.11/bin/activate
    python bootstrap.py

AMAN DIJALANKAN BERULANG:
  - `create_index` pada indeks yang sudah ada adalah no-op di MongoDB;
  - tidak ada owner yang disemai. Sejak m025-318 peran owner datang dari tiket KelasKu
    dan mesin kurikulum tidak menyimpan satu pun kata sandi, jadi seluruh urusan
    "sandi owner berbeda dari .env" — beserta bendera --reset-owner-password —
    hilang bersama pintunya;
  - penyemaian kurikulum hanya berjalan kalau koleksinya benar-benar kosong.

KEHILANGAN AKSES: tidak ada sandi yang bisa dipulihkan di sini. Akses guru dan owner
dipulihkan di KelasKu (dashboard owner), satu tempat, lalu berlaku di sini pada tiket
berikutnya.

Keluarannya sengaja menyebut ANGKA, bukan "selesai": pemasangan yang gagal separuh
harus terbaca dari layar, bukan dari tebakan.
"""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Ketujuh env TIDAK sama daruratnya, dan menyamakannya adalah cacat: versi pertama
# berkas ini menuntut semuanya, sehingga pemasang yang belum punya alamat login Google
# terhalang memasang apa pun — padahal alamat itu hanya dibaca ketika rute
# /google/session benar-benar dipanggil. Diperiksa satu per satu di kode, bukan diduga:
#
#   MONGO_URL, DB_NAME          db.py tingkat MODUL  -> server mati saat impor
#   JWT_SECRET                  saat menandatangani  -> tanpa ini TIDAK ADA yang bisa login
#   CURRICULUM_TICKET_KEY       pembaca tiket KelasKu-> tanpa ini TIDAK ADA yang bisa masuk
#
# CURRICULUM_TICKET_KEY masuk daftar WAJIB sejak m025-318, dan bukan sebagai formalitas:
# sejak pintu token `FZG-`, email+sandi, dan Google dicabut, tiket KelasKu adalah
# SATU-SATUNYA cara masuk. Nilainya WAJIB sama persis dengan nilai di Worker KelasKu
# (wrangler secret CURRICULUM_TICKET_KEY) — dua nilai berbeda berarti setiap tiket
# ditolak, dan pesan penolakannya sengaja tidak menyebut sebabnya.
#
# ADMIN_EMAIL/ADMIN_PASSWORD dan OWNER_MASTER_TOKEN TIDAK lagi disebut di mana pun:
# mesin kurikulum tidak menyimpan kata sandi, dan peran owner datang dari D1 KelasKu.
WAJIB = ("MONGO_URL", "DB_NAME", "JWT_SECRET", "CURRICULUM_TICKET_KEY")

# Kurang salah satu ini TIDAK menghalangi pemasangan; ia mematikan satu fitur saja.
# Diperingatkan keras, bukan diblokir — supaya pemasangan tetap bisa jalan hari ini
# dan pemasang TAHU persis apa yang belum hidup, bukan menemukannya sebagai 500.
OPSIONAL = {
    "CORS_ORIGINS": "tidak ada origin lintas-situs yang diizinkan (konsol di domain lain akan ditolak)",
}


def periksa_env():
    """Gagal untuk yang benar-benar menghalangi; peringatkan untuk yang mematikan satu fitur.

    Tanpa ini, env yang kurang muncul sebagai KeyError telanjang dari kedalaman impor —
    pesan yang tidak memberi tahu pemasang apa pun tentang apa yang kurang.
    """
    hilang = [n for n in WAJIB if not os.environ.get(n)]
    if hilang:
        print("GAGAL: env wajib belum diisi -> " + ", ".join(hilang), file=sys.stderr)
        print("Isi di berkas .env (lihat .env.example), lalu jalankan lagi.", file=sys.stderr)
        raise SystemExit(2)

    for nama, akibat in OPSIONAL.items():
        if not os.environ.get(nama):
            print(f"PERINGATAN: {nama} kosong -> {akibat}", file=sys.stderr)


async def main():
    periksa_env()

    # Diimpor SESUDAH periksa_env(): db.py membaca os.environ[...] saat diimpor,
    # jadi impor lebih dulu akan meledak sebelum pesan yang berguna sempat tercetak.
    from db import db, ensure_indexes
    from seed import seed_curriculum, seed_questions
    from seed_english import seed_english_curriculum

    print(f"MongoDB   : {os.environ['DB_NAME']}")

    await ensure_indexes()
    print("indeks    : terpasang")

    # Tidak ada owner yang perlu disemai. Sejak m025-318 peran owner datang dari tiket
    # KelasKu, dan mesin kurikulum tidak menyimpan satu pun kata sandi — jadi tidak ada
    # pula sandi owner yang bisa "berbeda dari .env".
    kunci = os.environ["CURRICULUM_TICKET_KEY"]
    if len(kunci) < 32:
        print("GAGAL: CURRICULUM_TICKET_KEY terlalu pendek (minimal 32 karakter).", file=sys.stderr)
        print("       Kunci pendek bisa ditebak, dan tanda tangan yang tertebak tidak", file=sys.stderr)
        print("       pernah ketahuan. Pakai nilai acak yang sama dengan Worker KelasKu.", file=sys.stderr)
        raise SystemExit(2)
    print("tiket     : kunci KelasKu terpasang (panjang " + str(len(kunci)) + ")")

    if await db.curriculum_nodes.count_documents({}) == 0:
        await seed_curriculum()
        await seed_questions()
        print("kurikulum : disemai (sebelumnya kosong)")
    else:
        print("kurikulum : sudah ada, semaian dilewati")

    if await db.curriculum_nodes.count_documents({"id": {"$regex": "^TP-ENG-1-"}}) == 0:
        await seed_english_curriculum()
        print("Inggris   : disemai")
    else:
        print("Inggris   : sudah ada, semaian dilewati")

    nodes = await db.curriculum_nodes.count_documents({})
    soal = await db.questions.count_documents({"is_current": True})
    print(f"\nSIAP. curriculum_nodes={nodes} questions={soal}")
    print("Cocokkan angka ini dengan /api/health sesudah situsnya hidup.")
    if nodes == 0:
        print("PERINGATAN: nol node kurikulum — konsol akan tampak kosong.", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
