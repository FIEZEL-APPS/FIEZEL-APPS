# `tools/dev/api-qa` — harness QA backend FIEZEL

Pengujian mendalam (black-box + white-box) untuk **dua** backend repo ini:

| Backend | Lokasi kode | Transport uji | Skrip |
|---|---|---|---|
| Cloudflare Worker API (`api.fiezel.my.id`) | `workers/api/**` | in-process `fetch(req, env, ctx)` dengan **D1 = SQLite nyata** (`node:sqlite`), atau HTTP ke `wrangler dev` | `run-worker.mjs` + `harness.mjs` |
| FastAPI "mesin kurikulum" | `backend/**` | in-process Starlette TestClient, **MongoDB = `mongomock_motor`** | `run_backend.py` |

Keduanya **nol jaringan** secara default, idempoten, dan aman dijalankan berulang.
Bukan gerbang CI — ini harness audit satu-kali (lihat `CLAUDE.md`: harness di
`tools/dev/`). Hasil ditulis ke `reports/api-qa-*-results.json`.

## Menjalankan

```bash
# Worker (D1 SQLite nyata, dengan migrasi diterapkan):
node tools/dev/api-qa/run-worker.mjs
node tools/dev/api-qa/run-worker.mjs --json

# Worker melawan server hidup (JANGAN arahkan ke produksi):
BASE_URL=http://127.0.0.1:8787 node tools/dev/api-qa/run-worker.mjs

# FastAPI (butuh paket uji sekali pasang):
pip install fastapi starlette "httpx<0.28" bcrypt pyjwt python-dotenv \
            email-validator mongomock_motor motor
python3 tools/dev/api-qa/run_backend.py
```

Kode keluar `2` bila ada temuan HIGH/CRITICAL, selain itu `0`.

## Apa yang diuji (mengikuti brief QA)

1. **Endpoint discovery & contract** — 119 rute Worker / seluruh router FastAPI
   dipukul; 404 router dibedakan dari 404 semantik; protokol `/health`; 405+Allow.
2. **Boundary & negative input** — body kosong `""`/`{}`, JSON rusak, array/skalar/
   `null` di tempat objek, SQLi/NoSQLi/XSS ke tiap field string, payload raksasa
   (cap byte → 413). White-box: verifikasi tabel `auth_account` selamat dari
   `'; DROP TABLE`.
3. **Auth & RBAC/IDOR** — tanpa identitas, cookie/JWT palsu, tiket kedaluwarsa/
   `aud` salah/replay (anti-oracle), owner-gate tanpa/dengan token salah, murid→
   rute guru, murid→data murid lain (`?student_id=`), guru→kelas/roster guru lain.
4. **Concurrency & idempotency** — balapan klaim handle, stabilitas identitas anon,
   undangan guru sekali-pakai, replay tiket KelasKu, dedup `event_id`/`idempotency_key`.
5. **Error leaks & resilience** — body respons dipindai untuk stack trace, teks SQL,
   path filesystem, nama secret/hash; 5xx harus tetap generik.

## Harness (`harness.mjs`)

- `createEnv()` merakit `env` lengkap: empat D1 (CORE/STATS/LEARNING/EVIDENCE) di atas
  SQLite dengan migrasi `workers/api/migrations/*` diterapkan per-database, KV/R2/AI
  tiruan, dan semua secret uji. Setiap pernyataan D1 diberi jitter async kecil supaya
  permintaan serentak benar-benar berselang di titik `await` (meniru round-trip D1).
- `createClient()` = satu "perangkat" dengan toples cookie + IP sendiri.
- `newLearner()` / `makeTeacher()` menempuh alur produksi (anon → register, atau
  owner-invite → teacher-activate).

Catatan: `BASE_URL` (mode HTTP) melewati uji white-box yang butuh akses langsung D1.
