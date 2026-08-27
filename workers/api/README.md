# `workers/api` — Worker API FIEZEL di Cloudflare (`api.fiezel.my.id`)

Worker ini adalah **API baru**, terpisah total dari Worker audio yang sudah jalan
(`workers/fiezel-audio-worker.js` + `workers/wrangler.toml`). Kedua berkas itu
**tidak boleh disentuh** dari sini.

Keputusan owner yang mengikat seluruh berkas di folder ini: **PLAN GRATIS.**
Setiap baris kode di sini ditulis dengan asumsi CPU 10 ms, tanpa Durable Object,
dan dengan anggaran tulis KV yang sangat sempit. Kalau ada kebutuhan yang
melewati batas itu, jawabannya bukan menyiasati kode — jawabannya adalah
**melaporkan ke owner** bahwa fitur tersebut butuh plan berbayar.

## Isi folder

| Berkas | Tugas |
|---|---|
| `wrangler.toml` | konfigurasi deploy: D1, KV, R2 (baca), AI binding, Analytics Engine, route custom domain |
| `index.js` | router manual + rantai middleware + slot registrasi rute paket kerja lain |
| `mw-guard.js` | CORS ketat, preflight, cap byte per endpoint, pembacaan body ber-batas |
| `mw-identity.js` | cookie `fz_id` bertanda HMAC-SHA256, penerbitan identitas anonim, verifikasi |
| `route-health.js` | `GET /health` → `protocol:'1.7'` |
| `route-auth.js` | `POST /api/auth/anon`, `POST /api/auth/claim` (verifikasi tiket Puter) |
| `route-user.js` | `GET /api/user/me` |
| `route-config.js` | `GET /api/config` — kill switch server-side untuk flag klien |
| `route-slots.js` | slot kosong bernomor untuk rute AI/TTS/quota/analytics (paket kerja lain) |
| `schema.js` | protokol, cap byte, atribut cookie, default flag, validasi bentuk payload |
| `util-hmac.js` | base64url + HMAC WebCrypto + cache kunci per-isolate |
| `errors.js` | bentuk galat tunggal (`{error:...}`) dan helper status |
| `migrations/0001_identity.sql` | skema `identity`, `session`, `anon_issue` |
| `STUB-PUTER-CLAIM-TICKET.md` | kontrak penerbit tiket di sisi Puter yang **belum ada** |

Gerbangnya: `cf-api-contract-test.js` di akar repo (terdaftar di
`.github/workflows/quality.yml`). Gerbang itu **mengeksekusi Worker sungguhan**
dengan stub binding, bukan membaca sumbernya saja.

## Kenapa tanpa dependency (tanpa Hono)

Repo ini nol dependency di jalur produksi, dan langkah `Syntax` di
`quality.yml` menjalankan `node --check` pada **semua** `*.js` kecuali
`node_modules/` dan `vendor/` di akar. Menambahkan `workers/api/node_modules/`
akan membuat CI mengunyah ribuan berkas pihak ketiga. Router manual di
`index.js` berukuran puluhan baris; ketergantungan framework tidak sebanding
dengan risikonya. Alasan ini juga tertulis di komentar `index.js` supaya orang
berikutnya tidak "memperbaiki"-nya dengan `npm i hono`.

## Cara deploy

```bash
npm i -g wrangler          # sekali saja, di mesin lokal owner
cd workers/api
wrangler login
wrangler deploy            # membaca workers/api/wrangler.toml
```

`wrangler deploy` **tidak** dijalankan dari CI di fase ini. Deploy manual oleh
owner adalah gerbang terakhir sebelum ada kill switch yang terbukti jalan.

## Membuat D1 dan menjalankan migrasi

```bash
# 1. Buat dua database (nama harus sama dengan yang ada di wrangler.toml)
wrangler d1 create fiezel-core
wrangler d1 create fiezel-stats

# 2. Tempelkan `database_id` hasil perintah di atas ke workers/api/wrangler.toml
#    (placeholder GANTI_DENGAN_ID_D1_... harus habis; deploy akan gagal kalau tidak)

# 3. Terapkan migrasi — lokal dulu, lalu remote.
#    PERHATIAN: `wrangler d1 migrations apply` TIDAK dipakai lagi dan
#    `migrations_dir` sudah dihapus dari wrangler.toml. Alasannya: satu
#    direktori migrasi hanya bisa menunjuk SATU database, sedangkan
#    migrations/ memuat migrasi untuk DUA database, dan menjalankan
#    0002_analytics.sql di fiezel-core akan menaruh tabel analytics satu
#    database dengan tabel kuota — JOIN yang dilarang kontrak privasi.
#    Perintah resmi (dan alasan lengkapnya) ada di migrations/MIGRATIONS.md:
wrangler d1 execute fiezel-core  --local  --file=migrations/0001_identity.sql
wrangler d1 execute fiezel-core  --local  --file=migrations/0001_quota.sql
wrangler d1 execute fiezel-stats --local  --file=migrations/0002_analytics.sql
wrangler d1 execute fiezel-core  --remote --file=migrations/0001_identity.sql
wrangler d1 execute fiezel-core  --remote --file=migrations/0001_quota.sql
wrangler d1 execute fiezel-stats --remote --file=migrations/0002_analytics.sql

# 4. Periksa
wrangler d1 execute fiezel-core --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

KV dan R2:

```bash
wrangler kv namespace create CFG          # tempel id-nya ke wrangler.toml
# Bucket R2 `fiezel-audio` SUDAH ADA. Jangan dibuat ulang, jangan ditulis dari Worker ini.
```

## Secret yang harus dipasang owner

Nilainya tidak pernah masuk repo. Pasang lewat `wrangler secret put` (dijalankan
di `workers/api/`):

```bash
wrangler secret put SESSION_HMAC_KEY_CURRENT     # >= 32 byte acak; penanda cookie fz_id
wrangler secret put SESSION_HMAC_KEY_PREVIOUS    # secret sebelumnya, supaya rotasi tidak melogout siapa pun
wrangler secret put PUTER_CLAIM_SECRET_CURRENT   # verifikasi tiket klaim dari Worker Puter
wrangler secret put PUTER_CLAIM_SECRET_PREVIOUS  # opsional, untuk rotasi
wrangler secret put IDENTITY_PEPPER              # pepper HMAC untuk pengenal turunan
wrangler secret put TURNSTILE_SECRET             # dipakai fase penahan penyalahgunaan
wrangler secret put EDGE_SHARED_SECRET           # header X-Fiezel-Edge dari proxy jembatan origin
```

`EDGE_SHARED_SECRET` menutup lubang khusus masa transisi: selama zona
`fiezel.my.id` belum di Cloudflare, `api.fiezel.my.id` adalah proxy PHP di origin
ArenHost (`deploy/edge/api-index.php`) yang meneruskan ke
`https://fiezel-api.fitrajft.workers.dev`. Alamat `*.workers.dev` itu publik.
Tanpa secret ini, siapa pun bisa memanggilnya langsung, melewati jembatan, dan
menerbitkan identitas anonim tanpa batas — tiap penerbitan menulis baris D1 dan
membawa jatah gratisnya sendiri. Dengan secret terpasang, `mw-edge.js` menolak
403 setiap permintaan tanpa header yang cocok (perbandingan waktu-konstan),
kecuali `/healthz`. Tanpa secret, Worker tetap jalan dan `/health` melaporkan
`edgeGuard:"off"` — keadaan itu hanya sah selama masa transisi. Nilainya harus
sama dengan yang disuntik ke proxy; lihat `deploy/edge/README.md`.

Cara membuat nilainya:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Aturan rotasi: pindahkan nilai `CURRENT` ke `PREVIOUS`, pasang nilai baru di
`CURRENT`, tunggu lebih lama dari umur cookie sebelum membuang yang lama.
Menghapus `PREVIOUS` terlalu cepat = semua murid kehilangan identitas dan
progres yang terikat padanya.

## BATAS PLAN GRATIS yang harus dipantau

| Batas | Angka (plan gratis) | Kenapa berbahaya di sini | Gejala kalau tidak cukup |
|---|---|---|---|
| CPU per request | **10 ms** | HMAC WebCrypto + JSON parse harus muat di dalamnya | `Error 1102: Worker exceeded CPU time`; klien lihat 5xx acak, biasanya di jam sibuk saja |
| Request harian | **100.000/hari** | seluruh sekolah memakai satu Worker | `Error 1027`, Worker berhenti melayani sampai tengah malam UTC; halaman terlihat "offline" walau situs statis hidup |
| KV tulis per key | **1 tulis/detik** | jangan pernah pakai satu key global untuk counter | tulis tertelan tanpa galat; kuota jadi salah tanpa jejak |
| KV tulis harian | **1.000 tulis/hari** | penanda anti-replay klaim dan cache konfigurasi ikut menghitung | tulis mulai gagal; kill switch berhenti bisa diubah, anti-replay berhenti menahan |
| KV baca harian | 100.000/hari | `/api/config` dibaca tiap muat halaman | `cacheTtl: 60` di `route-config.js` adalah yang menahan ini; jangan dihapus |
| Subrequest per request | **50** | satu request API tidak boleh berantai ke banyak layanan | `Too many subrequests`; muncul hanya pada jalur terpanjang, jadi lolos di uji ringan |
| D1 baca/tulis harian | 5 juta baca / 100.000 tulis | `last_seen_day` ditulis maksimum sekali per murid per hari | tulis D1 ditolak; identitas masih jalan, tapi statistik harian membeku |
| Workers AI | Neuron harian terbatas | fase ini **nol** panggilan AI; fase berikutnya wajib berpagar | galat 429/`neuron` di respons AI; rencana mitigasi: cap global di `GLOBAL_NEURON_CAP` |
| Durable Objects | **tidak tersedia** | tidak ada penghitung yang benar-benar atomik | dua tab bisa menembus kuota beberapa satuan; kalau owner butuh atomisitas ketat, itu **upgrade berbayar** dan harus disetujui owner lebih dulu |

Cara memantau, tanpa alat tambahan:

```bash
wrangler tail fiezel-api --format pretty     # galat waktu-nyata (1102 / 1027 / subrequest)
```
Dashboard Cloudflare → Workers → `fiezel-api` → Metrics untuk request harian,
CPU p99, dan tingkat galat. Yang perlu dipelototi tiap minggu: **CPU p99** dan
**tulis KV harian**, karena keduanya yang paling dulu menabrak.

## Kontrak untuk sisi klien

1. `GET /health` **wajib** menjawab `protocol:'1.7'`. Tiga jalur di `app.js`
   melempar `*_protocol_mismatch` kalau tidak; itu mematikan pembimbing adaptif
   dan coach di produksi. Ubah angka ini hanya bersamaan dengan klien.
2. Semua request lintas-origin harus memakai `credentials: 'include'`. Tanpa itu
   cookie `fz_id` tidak terkirim dan setiap request akan tampak sebagai murid
   baru.
3. `GET /api/user/me` di-cache di memori proses klien untuk satu sesi. Memanggil
   ulang per kartu latihan akan membakar anggaran request harian.
4. `GET /api/config` **selalu** `no-store`. `core-config.js` ter-precache service
   worker, jadi kill switch hanya bisa menembus lewat respons yang tidak
   ter-cache. Kalau `/api/config` gagal, klien wajib menganggap **semua flag
   mati** — jangan pernah gagal ke arah "nyala".
5. `POST /api/auth/claim` masih 401 sampai penerbit tiket sisi Puter dipasang.
   Lihat `STUB-PUTER-CLAIM-TICKET.md`.

## Yang BELUM ada di fase ini

`/api/ai/*`, `/api/tts/*`, `/api/quota`, `/api/usage/event`, dan jalur analitik
dikerjakan paket kerja lain. Titik pendaftarannya sudah disiapkan di
`route-slots.js`, satu slot per baris, supaya dua paket kerja tidak menulis baris
yang sama dan bertabrakan saat merge.
