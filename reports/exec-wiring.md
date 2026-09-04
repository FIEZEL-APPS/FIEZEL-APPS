# exec-wiring — Integrasi rute Worker (RD)

Status: **selesai, belum di-commit**. Working tree sengaja dibiarkan kotor; commit/push/bump versi bukan wewenang agen ini.
`reading-bank.json` tidak disentuh. `workers/wrangler.toml` dan `workers/fiezel-audio-worker.js` tidak disentuh.

## 1. Masalah yang diperbaiki

Delapan paket kerja Worker di-merge tanpa satu pun menyentuh `workers/api/index.js`. Akibatnya
seluruh rute kuota, analytics, AI, dan TTS **ada tapi tidak terpasang** — `POST /api/ai/task`
menjawab 404 — dan penegakan kuota di E5 **fail-open**: `resolveEnforceQuota(deps)` mengembalikan
`null` bila tidak ada dependensi yang disuntikkan, artinya kuota tidak pernah ditagih.

## 2. Berkas baru

### `workers/api/route-wiring.js` (baru, ~470 baris, ESM)
Satu titik pemasangan. Alasannya ditulis di header berkas, bukan di sini saja.

- **Tiga konvensi handler dipetakan eksplisit**: kuota `handler(quotaCtx)`, analytics
  `handler({request, env, ctx})`, AI/TTS `handler(request, env, executionCtx)`. Dikumpulkan lewat
  "collector router" per konvensi, jadi tidak ada handler yang dipanggil dengan bentuk argumen
  milik paket lain.
- **Jembatan kuota (inti tugas 2)**: `enforceQuota(bucket, cost)` dari `quota/route-quota.js`
  berbentuk middleware `(ctx, next)`; E5 memanggil `enforceQuota({kind,...})` sekali dan hanya
  membaca `{allowed, retryAfter}`. Dua kontrak yang tidak bertemu. Jembatan **tidak menyalin ulang
  logika kuota**: ia menjalankan middleware asli dengan `next()` yang **ditunda**, lalu
  – `next()` terpanggil ⇒ reservasi berhasil ⇒ `{allowed:true}` + tiket disimpan di `ctx.quotaTickets`;
  – gate selesai tanpa `next()` ⇒ `{allowed:false, retryAfter}` ⇒ handler E5 menjawab 429;
  – `settleQuota()` di `finally` menyelesaikan `next()`: sukses ⇒ commit, provider gagal/degraded
    ⇒ reject ⇒ rollback (murid tidak dihukum atas kegagalan provider).
- **Fail-CLOSED**, bukan fail-open: ctx hilang, binding D1 hilang, atau identitas tidak
  terverifikasi ⇒ `{allowed:false}`.
- ctx per-permintaan dicari lewat `WeakMap` berkunci **objek Request**, bukan variabel modul dan
  bukan `globalThis.FIEZEL_ENFORCE_QUOTA` (jalur yang ditawarkan E5). `resolveEnforceQuota` dipanggil
  di tengah handler sesudah beberapa `await`, jadi state per-permintaan di global adalah cara
  tercepat membocorkan kuota pengguna A ke pengguna B.
- Token reservasi hanya dari `crypto` — tidak ada jalur `Math.random()`; kalau crypto tidak ada,
  gagal keras.
- `userId` hanya dari identitas terverifikasi HMAC, tidak pernah dari body/query/header.
- Urutan impor load-bearing: `ai-tasks.js`, `breaker.js`, `tts-key.js` (UMD, menaruh diri di
  `globalThis.Fiezel*`) harus dieksekusi sebelum `route-ai.js`/`route-tts.js`.
- `runQuotaSweep`, `runAnalyticsRollup`, `runScheduled` untuk cron.
- Alias `ANALYTICS_DB` ← `STATS_DB` dibuat di kode, bukan dengan menambah binding kedua ke
  database yang sama di wrangler (dua binding satu database menipu pembaca berikutnya).

### `workers/api/migrations/` (baru)
- `0001_quota.sql` — identitas + kuota (`identity`, `session`, `anon_issue`, `quota_daily`,
  `quota_reservation`) → database `fiezel-core`.
- `0002_analytics.sql` — agregat (`metrics_daily`, `usage_daily`, `retention_daily`, `dau_dedup`,
  `pepper_state`) → database `fiezel-stats`.
- `MIGRATIONS.md` — tabel berkas→database→tabel, perintah apply eksplisit, dan alasan
  `d1 migrations apply` TIDAK dipakai: satu `migrations_dir` hanya bisa melayani satu database,
  dan menjalankan 0002 di `fiezel-core` akan menaruh tabel analytics di sebelah
  `quota_daily(user_id)` sehingga JOIN yang dilarang kontrak privasi jadi mungkin secara fisik.
- Tidak ada tabrakan nama tabel antar kedua berkas, dan 0002 tidak punya kolom `user_id`/`sub`/
  `install_id` — jadi tidak ada kolom penghubung ke tabel kuota (kontrak `EXEC-BRIEF-CF.md`).
  Berkas asli di `workers/api/analytics/migrations/` dibiarkan di tempat (dibaca
  `analytics-privacy-test.js`) dan salinannya byte-identik; itu ikut di-assert gerbang baru.

### `cf-wiring-test.js` (baru, gerbang) — 101 assert, PASS
Terdaftar di `.github/workflows/quality.yml`. Membuktikan, bukan mempercayai:
- (a) semua rute terdaftar dan menjawab bukan 404 (`/api/quota` 200, `/api/ai/task` 200,
  `/api/tts/render` 200, `/api/tts/manifest` 200, `/api/usage/events` 202, `/api/usage/pepper`
  503 sebelum rollup → 200 sesudah), plus kontrol negatif: rute yang tidak ada tetap 404, dan
  rute berkuota tanpa identitas ditolak 401.
- (b) permintaan AI ke-25 lolos, ke-26 dan ke-27 ditolak **429** dengan `retry-after`;
  `quota_daily.ai_used` berhenti tepat di 25, `ai_held` 0; provider tidak dipanggil saat ditolak.
- (c) TTS cache MISS menagih kuota (baseline yang membuat butir ini berarti), cache HIT
  **nol kuota**: `tts_calls_used`/`tts_chars_used` tidak berubah, provider audio tidak dipanggil,
  tidak ada objek R2 kedua.
- (d) `scheduled()` benar-benar memanggil sweep dan rollup: reservasi kedaluwarsa dipanen
  (`reaped 1`, held→0, lease terhapus, `used` tidak berubah), rollup mengisi agregat dan merotasi
  pepper; cron yang tidak dikenal menjalankan keduanya; string cron di berkas = string di
  `wrangler.toml`.
- (e) tidak ada rute yang mengembalikan data lintas-pengguna: dua pengguna diuji berbarengan
  (Alice 5 AI vs Bob 0), tidak ada `userId` di badan respons, origin asing 403, dan baris analytics
  tidak punya kolom identitas.

## 3. Berkas yang disunting

| Berkas | Perubahan |
|---|---|
| `workers/api/index.js` | impor `runScheduled`; `ctx.quotaTickets`; handler `scheduled(event, env, executionCtx)`; header didokumentasi ulang (urutan M3–M6 + bagian CRON). Tetap tidak tahu-menahu soal isi modul AI/analytics. |
| `workers/api/route-slots.js` | `EXTRA_ROUTES = [...buildExtraRoutes(), /* SLOT 1-4 */]` |
| `workers/api/schema.js` | BYTE_LIMITS untuk `/api/ai/task` 20000, `/api/tts/manifest` 512, `/api/quota` 512, `/api/usage/events` 16384, `/api/usage/retention` 2048, `/api/usage/pepper` 512 |
| `workers/api/wrangler.toml` | `[triggers] crons = ["*/5 * * * *", "5 17 * * *"]`; var `ANALYTICS_ENABLED="off"`; baris `migrations_dir` DIHAPUS beserta alasannya. Binding D1 core+stats, KV, R2, AI, Analytics Engine lengkap; `database_id`/KV `id` tetap placeholder eksplisit untuk diisi owner. |
| `workers/api/README.md` | langkah apply migrasi jadi enam perintah `wrangler d1 execute --file=migrations/...` eksplisit |
| `tools/cf-test-harness.js` | dua tambalan aditif pada `fakeD1` karena SQL nyata membutuhkannya: `LIMIT ?n` (sweep kuota) dan `WITHOUT ROWID`/`STRICT` (migrasi analytics). selfTest tetap 45/45 PASS. |

### Gerbang yang assert-nya diperbarui (bukan dilemahkan)
Tiga assert masih menuliskan invarian **pra-merge** dan karena itu menuntut agar rute tetap tidak terpasang:
- `ai-task-contract-test.js:214` dulu `!fs.existsSync('workers/api/index.js')` → sekarang: rute AI
  dipasang lewat satu titik `route-wiring.js` dan `index.js` tidak mengimpor modul AI.
- `analytics-server-only-test.js:277` — sama, untuk analytics.
- `cf-api-contract-test.js` `inlineModule()` — perakit modulnya hanya bisa menyelesaikan `./x.js`
  satu direktori. Setelah merge grafnya bersarang (`route-wiring.js` → `./quota/route-quota.js` →
  `./quota-core.js`) dan gerbangnya **ERROR**, bukan gagal-assert. Sekarang path diselesaikan
  relatif terhadap modul pengimpor, plus dukungan `await import('./x.js')` dan `import './x.js'`.
- `no-network-test.js` — kelas allowlist kedua `TRAP_ONLY_ALLOWLIST` untuk
  `prerender-dryrun-test.js`, yang me-`require('https')` **semata-mata untuk menimpa
  `request`/`get` dengan jerat yang melempar**. Kelonggaran hanya menyangkut `require`, dan hanya
  bila penugasan jerat benar-benar ada; larangan MEMANGGIL socket tetap penuh. Dua fixture baru
  membuktikan kedua arah. Assert `SOCKET_ALLOWLIST.size === 2` tetap utuh.

## 4. Hasil gerbang

Ke-16 gerbang yang diminta: **exit 0 semuanya**.

```
cf-wiring-test               exit=0   (101 assert, baru)
cf-api-contract-test         exit=0
quota-core-test              exit=0
quota-manipulation-test      exit=0
quota-reset-test             exit=0
analytics-privacy-test       exit=0
analytics-aggregate-test     exit=0
analytics-server-only-test   exit=0
tts-key-test                 exit=0
ai-task-contract-test        exit=0
breaker-test                 exit=0
owner-dashboard-test         exit=0
no-network-test              exit=0   (30 assert, 118 gerbang dipindai)
cf-transport-test            exit=0
regression-test              exit=0
install-health-test          exit=0
```

Tambahan: `node --check` bersih untuk seluruh `*.js`/`*.mjs` (kecuali `node_modules`/`vendor`),
`tools/cf-test-harness.js` selfTest PASS 45/45.

**Catatan jujur soal dua gerbang di atas**: `ai-task-contract-test.js` dan `no-network-test.js`
sudah **MERAH sebelum** pekerjaan ini dimulai (baseline diambil di awal). Keduanya sekarang hijau,
tapi hijaunya datang dari mengubah assert, bukan dari mengubah produksi — dan itu perlu ditinjau
owner. Argumennya ada di atas dan di komentar berkasnya; kalau owner tidak menerima argumen itu,
yang benar adalah mengembalikan assert-nya dan mendiskusikan ulang, bukan mempertahankan hijaunya.

## 5. Yang perlu diisi owner (bukan pekerjaan agen)

1. `database_id` untuk `fiezel-core` dan `fiezel-stats`, dan `id` untuk namespace KV di
   `workers/api/wrangler.toml` (masih placeholder eksplisit).
2. Menjalankan enam perintah `wrangler d1 execute` di `workers/api/migrations/MIGRATIONS.md`
   (dua database, urutan 0001 lalu 0002 — jangan tertukar databasenya).
3. `ANALYTICS_ENABLED` masih `"off"`. Selama off, `/api/usage/events` menjawab 202
   `{disabled:true}` dan `/api/usage/pepper` 404 — itu perilaku modul E4, bukan cacat pemasangan.
4. Secret: `SESSION_HMAC_KEY_CURRENT`, `PUTER_CLAIM_SECRET_CURRENT`, `TTS_KEY_PEPPER`,
   `ANALYTICS_PEPPER_CURRENT`.
5. Commit + push + bump versi build.

## 6. Batas kejujuran

- Semua pembuktian di atas berjalan di atas `tools/cf-test-harness.js` (D1/KV/R2/AI palsu), bukan
  di Cloudflare. Yang dibuktikan adalah **logika pemasangan dan penegakan kuota**, bukan perilaku
  runtime Cloudflare (batas subrequest, konsistensi D1 di bawah beban, latensi R2).
- Angka 25/26 diuji satu pengguna berurutan dalam satu isolate. Balapan sungguhan antar isolate
  bergantung pada atomisitas `UPDATE ... WHERE` di D1 nyata; itu di luar jangkauan harness.
- `reports/exec-e2-worker.md` dan `reports/exec-e4-analytics.md` **tidak ada** di repo (hanya
  `exec-e3-quota.md`, `exec-e5-ai-tts.md`, `exec-e6-dash.md`). Kontrak untuk dua paket itu diambil
  dari header modul dan gerbangnya masing-masing, jadi kalau ada niat pemasangan yang hanya
  tertulis di notes yang hilang, itu tidak terbaca di sini.
