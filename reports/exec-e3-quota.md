# E3 Kuota — catatan eksekusi

Branch `exec/quota` · worktree `wt-quota` · tanpa push, tanpa bump build (SW_REV / DIAG_BUILD / FIEZEL_PAGE_BUILD tidak disentuh).

Desain yang dijalankan: `reports/cf-b3-quota.md` (lengkap), angka dari `cf-a10-cost.md §6`, kontrak endpoint dari `cf-b1-arch-worker.md §1`, pola gerbang dari `cf-b7-testing-strategy.md §3.0`. Keputusan owner yang mengikat: `EXEC-BRIEF-CF.md` — **plan gratis saja, biaya dibatasi ketat, pembayaran mati**.

## 1. Yang dibangun

| Berkas | Baris | Isi |
|---|---|---|
| `workers/api/quota/quota-config.js` | 181 | satu sumber semua konstanta, `Object.freeze`, tanpa import, tanpa `Date`, tanpa `env` |
| `workers/api/quota/quota-core.js` | 443 | fungsi murni: `dayKeyFor`, `reserve`, `commit`, `rollback`, `snapshot`, `sweepExpired` |
| `workers/api/quota/quota-store-d1.js` | 347 | `UPDATE … WHERE used + held < limit RETURNING` + tabel lease + sweep |
| `workers/api/quota/route-quota.js` | 308 | `GET /api/quota`, `enforceQuota(bucket, cost)`, amplop 429/413/503/502 |
| `workers/api/quota/migrations/0001_quota.sql` | 65 | DDL `quota_daily` + `quota_reservation` + indeks |
| `tools/quota-module-loader.js` | 92 | pemuat ESM → sandbox `vm` tanpa dependency, dipakai ketiga gerbang |

`workers/api/index.js` **tidak dibuat dan tidak disentuh** (agen Worker lain memilikinya). Modul ini menyediakan `registerQuotaRoutes(router)`; lihat §5 untuk instruksi pemasangan.

## 2. Angka kuota yang dipatok (semua di `quota-config.js`, tiap satu diberi komentar ALASAN)

`FREE_AI_DAILY_LIMIT=25`, `FREE_AI_TRANSLATE_DAILY=15` (sub-kuota **di dalam** 25, bukan tambahan), `FREE_TTS_DAILY_LIMIT=120`, `FREE_TTS_DAILY_CHARS=12000`, `FREE_MAX_OUTPUT_TOKENS=400`, `FREE_MAX_PROMPT_CHARS=4000`, `FREE_MAX_INPUT_TOKENS=1200`, laju `8/menit` AI · `20/menit` TTS · `60/menit` total, konkurensi `1` AI · `2` TTS, `AI_TIMEOUT_MS=20000`, `TTS_TIMEOUT_MS=25000`, `RESERVATION_TTL_MS=30000` (= timeout TTS + 5 s), `PAYMENT_ENABLED=false`, `ASSIGNABLE_PLANS=['free']`.

Plafon biaya per murid per hari yang dijaga angka-angka itu: **US$0,1855** (12.000 char TTS + 25 panggilan AI pada 1.200 token masuk / 400 keluar).

## 3. Empat keputusan yang perlu diketahui master

1. **Kuota tidak dipotong saat `reserve`.** Yang naik hanya `held`. Counter baru naik di `commit`. Invarian yang diuji: `used_effective = counter + Σ reservasi terbuka`.
2. **Kegagalan provider = `rollback`, bukan 429.** Timeout/error provider → 502, anggaran neuron akun habis → 503, kuota habis → 429, payload → 413. Kegagalan kuota tidak pernah 5xx; kegagalan provider tidak pernah 429. `quotaCharged` selalu ada di badan penolakan.
3. **Cache hit gratis, dan hanya server yang berwenang menyatakannya** (`env.R2.head(key)` → `ctx.serverCacheHit`). 500 replay aset yang sudah ada = nol konsumsi kuota. Klaim `cacheHit` dari klien diabaikan; ini diuji eksplisit.
4. **Dua jam, dua tujuan.** Kuota murid reset 00:00 **Asia/Jakarta**; anggaran neuron tingkat akun memakai hari **UTC** karena Cloudflare mereset jatah gratisnya 00:00 UTC (= 07:00 WIB). `preferences.timeZone` dari klien tidak pernah dipakai — itulah lubang manipulasi termurah yang ditutup.

## 4. Kejujuran soal D1 (dibaca sebelum menganggap ini selesai)

Header `quota-store-d1.js` memuat versinya panjang; ringkasnya:

- Gerbangnya atomik **per pernyataan** (`UPDATE … WHERE used + held + :amount <= limit RETURNING`), jadi dua permintaan bersamaan tidak bisa dua-duanya lolos pada baris yang sama. Itu cukup untuk mencegah over-grant pada kasus lomba yang wajar.
- Ini **bukan** serializable seketat Durable Object. Skenario yang masih mungkin: `commit`/`rollback` yang gagal setengah jalan sesudah `UPDATE` berhasil (dijaring `sweep` + `reconcileHeld`), lease yang kedaluwarsa saat provider masih berjalan (murid diuntungkan, bukan dirugikan), dan replika read-only D1 yang bisa menyajikan `GET /api/quota` sedikit basi (tampilan saja, bukan gerbang).
- **Durable Object adalah upgrade berbayar**, bukan pilihan gratis: butuh Workers Paid (US$5/bulan) walau biaya DO-nya sendiri sen-senan. Kalau owner suatu saat butuh jaminan serializable, jalur upgrade-nya sudah disiapkan: ganti isi `quota-store-d1.js` saja, `quota-core.js` dan `route-quota.js` tidak berubah karena keputusannya murni.

## 5. Instruksi pemasangan rute untuk MASTER

`workers/api/index.js` belum ada di branch ini. Saat master merangkainya:

```js
import { registerQuotaRoutes, enforceQuota, checkPromptSize } from './quota/route-quota.js';

registerQuotaRoutes(router);                       // GET /api/quota (selalu 200, no-store)

router.post('/api/ai/chat',      enforceQuota('ai', 1),          handleChat);
router.post('/api/ai/translate', enforceQuota('aiTranslate', 1), handleTranslate);
router.post('/api/tts/render',   enforceQuota('tts', (ctx) => ctx.serverText.length), handleTts);
```

Kontrak `ctx` yang harus disediakan middleware identitas sebelum gerbang kuota jalan:

`ctx.db` (D1), `ctx.userId`, `ctx.limits` (dari `QUOTA_CONFIG.plans.free`), `ctx.now` (ms), `ctx.nowAfter()` (waktu sesudah provider), `ctx.newToken()` (id reservasi buatan server), `ctx.json(body, status, headers)`, `ctx.serverCacheHit` (hasil `R2.head`, hanya untuk TTS), `ctx.serverText` (teks ternormalisasi yang **diukur server**), `ctx.degraded` (opsional).

Tiga hal yang belum bisa saya kerjakan dari sini dan wajib dilakukan master:

1. **Migrasi D1**: `wrangler d1 execute <DB> --file workers/api/quota/migrations/0001_quota.sql`.
2. **Binding D1 di `workers/wrangler.toml`** — berkas itu terlarang saya sentuh (EXEC-BRIEF). Butuh `[[d1_databases]] binding = "DB"`.
3. **Cron sweep**: panggil `sweepExpiredReservations(db, now)` dan `reconcileHeld(db, now)` dari `scheduled()`, interval ±60 s.

Ukuran payload dipasang terpisah dari kuota: panggil `checkPromptSize(teksTernormalisasiServer)` di awal handler AI; kalau mengembalikan amplop, kirim apa adanya (413) — penolakan itu terjadi **sebelum** `reserve`, jadi tidak menyentuh kuota.

## 6. Gerbang (semua `node` polos, tanpa dependency, terdaftar di `.github/workflows/quality.yml`)

| Gerbang | Lolos | Laporan |
|---|---|---|
| `tests/quota-core-test.js` | 65/65 | `QUOTA-CORE-REPORT.json` |
| `tests/quota-manipulation-test.js` | 39/39 | `QUOTA-MANIPULATION-REPORT.json` |
| `tests/quota-reset-test.js` | 26/26 | `QUOTA-RESET-REPORT.json` |

Regresi lama tetap hijau: `tests/regression-test.js` exit 0, `tests/install-health-test.js` exit 0, `node --check` lolos untuk semua berkas baru.

**Cara ketiga gerbang menguji modul ESM tanpa dependency** (ini bagian yang paling berguna untuk agen lain): `tools/quota-module-loader.js` membaca sumbernya, membuang baris `import`, menurunkan `export`, lalu menjalankannya di konteks `vm` yang **sengaja kosong** — tanpa `Date`, `fetch`, `document`, `localStorage`, `crypto`, `process`. Artinya kemurnian bukan diperiksa dengan regex saja: kalau ada yang menyelipkan jam atau jaringan ke dalam aturan kuota, gerbangnya gagal **saat memuat**.

Yang benar-benar dibuktikan, bukan sekadar diklaim:

- `reserve` tidak menaikkan counter; `commit` menaikkan tepat sekali; commit kedua dengan token sama ditolak `reservation_expired`.
- 30 `reserve` pada limit 25 → tepat 25 lolos, tidak pernah over-grant, invarian tetap utuh.
- Reservasi kedaluwarsa dipanen, dan `commit` sesudahnya **tidak** menagih (kalau harus salah, salah ke arah murid).
- 15 terjemahan menghabiskan sub-kuota tetapi **tidak** memblokir 10 penjelasan tutor yang tersisa.
- Jam palsu 23:59:59 → 00:00:01 WIB mereset semua bucket; 00:00 UTC (= 07:00 WIB) **tidak** mereset apa pun; 400 hari berurutan berjarak tepat 86.400.000 ms (Indonesia tanpa DST).
- Muatan bermusuhan berisi 25 field (`aiUsedToday:0`, `plan:'plus'`, `cacheHit:true`, `promptChars:10`, `timeZone:'Etc/GMT+12'`, `reservationId:'forged-token'`, …) dikirim ke `GET /api/quota` → badan respons **identik byte-per-byte** dengan permintaan bersih; dikirim ke rute AI saat kuota penuh → tetap 429 dan provider **tidak dipanggil sekali pun**.
- Token reservasi palsu tidak bisa dipakai `commit` maupun `rollback`.
- Respons tidak membawa PII (tanpa userId, tanpa IP) dan **tanpa satu kata prosa Indonesia** dari server; klien hanya menerima kode + `copyKey`.

## 7. Satu perubahan desain yang saya lakukan sendiri, dan alasannya

`reserve(state, bucket, amount, now, options)` sekarang menghormati `options.token` bila diisi pemanggil sisi server. Sebelumnya inti mencetak tokennya sendiri sementara rute mencetak token lain lewat `ctx.newToken()` — dua otoritas id untuk satu reservasi. Akibatnya nyata dan senyap: `commit` tidak akan pernah menemukan reservasi yang dibuatnya, setiap panggilan berakhir `reservation_expired`, dan **seluruh pemakaian AI/TTS jadi gratis tanpa satu pun error muncul**. Bug ini tertangkap oleh gerbang manipulasi, bukan oleh pembacaan ulang kode. Tanpa `options.token`, id tetap dicetak deterministik dari `seq` state server, jadi sifat "tak bisa dikarang dari luar" tidak hilang.

## 8. Yang BELUM selesai dan tidak boleh dianggap selesai

- **Laju dan konkurensi baru berupa angka di config**, penegakannya belum ada. Rencana cf-b3 memakai jendela geser per IP-hash; itu butuh penyimpanan yang sama dan sebaiknya menyusul di rute yang sama.
- **`POST /api/quota/preflight`** (cf-b1 §1) belum dibuat. Kontraknya: tidak pernah mengurangi apa pun. Belum ada karena frontend belum memanggilnya.
- **Anggaran neuron tingkat akun** hanya punya konstanta dan hari UTC-nya; pembacaan pemakaian nyata dari Cloudflare belum tersambung. `classifyFailure` sudah memetakan pesan bernuansa neuron ke 503 supaya jalur degradasi tidak salah kode.
- Tidak ada satu pun rute yang benar-benar hidup sampai master memasang §5 dan menjalankan migrasi D1.
