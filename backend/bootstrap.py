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

AMAN DIJALANKAN BERULANG. Ketiga langkahnya idempoten dan itu disengaja:
  - `create_index` pada indeks yang sudah ada adalah no-op di MongoDB;
  - `seed_owner()` hanya membuat kalau belum ada, dan kalau sudah ada ia
    MENYELARASKAN sandinya dengan ADMIN_PASSWORD — env adalah sumber kebenaran,
    jadi menjalankan ulang berkas ini juga cara sah memulihkan sandi owner;
  - penyemaian kurikulum hanya berjalan kalau koleksinya benar-benar kosong.

Keluarannya sengaja menyebut ANGKA, bukan "selesai": pemasangan yang gagal separuh
harus terbaca dari layar, bukan dari tebakan.
"""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

WAJIB = (
    "MONGO_URL",
    "DB_NAME",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "JWT_SECRET",
    "OWNER_MASTER_TOKEN",
    "EMERGENT_AUTH_SESSION_URL",
)


def periksa_env():
    """Gagal di sini, dengan nama yang hilang disebutkan.

    Tanpa ini, env yang kurang muncul sebagai KeyError telanjang dari kedalaman
    impor — pesan yang tidak memberi tahu pemasang apa pun tentang apa yang kurang.
    """
    hilang = [n for n in WAJIB if not os.environ.get(n)]
    if hilang:
        print("GAGAL: env wajib belum diisi -> " + ", ".join(hilang), file=sys.stderr)
        print("Isi di berkas .env (lihat .env.example), lalu jalankan lagi.", file=sys.stderr)
        raise SystemExit(2)


async def main():
    periksa_env()

    # Diimpor SESUDAH periksa_env(): db.py membaca os.environ[...] saat diimpor,
    # jadi impor lebih dulu akan meledak sebelum pesan yang berguna sempat tercetak.
    from db import db, ensure_indexes
    import auth
    from seed import seed_curriculum, seed_questions
    from seed_english import seed_english_curriculum

    print(f"MongoDB   : {os.environ['DB_NAME']}")

    await ensure_indexes()
    print("indeks    : terpasang")

    await auth.seed_owner()
    print(f"owner     : {os.environ['ADMIN_EMAIL']} (sandi diselaraskan dengan ADMIN_PASSWORD)")

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
