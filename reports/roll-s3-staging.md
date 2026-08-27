# roll/s3staging — uji staging NYATA: kuota 25/26, cache TTS, cron

Tanggal jalan: 27 Agustus 2026, 16:18–17:18 UTC (23:18 WIB s/d 00:18 WIB 28 Agu).
Sasaran: Worker `fiezel-api-staging` (D1 `fiezel-core-staging`/`fiezel-stats-staging`),
`FEATURE_AI=on`, `FEATURE_TTS=on`, `ANALYTICS_ENABLED=on`. Produksi TIDAK disentuh.
Gerbang baru: `staging-live-test.js` (SKIP bersih tanpa `FIEZEL_STAGING_BASE` +
`FIEZEL_STAGING_EDGE`). Nilai rahasia header edge tidak ada di repo, tidak ada di
laporan, dan tidak ada di berkas ini — gerbang membacanya dari env saat jalan dan
memindai laporannya sendiri sebelum menulis.

Hasil jalan terakhir: **30 PASS, 10 FAIL dari 40 assert.** Gerbangnya MERAH, dan itu
memang hasilnya.

Ringkasan tiga lubang bukti:

| Lubang bukti | Status sesudah paket kerja ini |
|---|---|
| Kuota AI 25 lolos / ke-26 ditolak 429 | **TUTUP** — terbukti dengan angka di runtime Cloudflare |
| Cache TTS gratis saat cache hit | **MASIH TERBUKA** — tidak bisa dibuktikan karena jalur render TTS rusak di runtime; invariansi kunci terhadap `speed` sudah terbukti |
| Cron sweep + rollup analytics | **MASIH TERBUKA, dan sekarang ada bukti NEGATIF**: 13 menit sesudah jadwal rollup, `pepper_state` tetap kosong |

Empat cacat runtime nyata ditemukan (tiga di antaranya sudah dikunci sebagai assert
gerbang), dan tidak satu pun bisa dilihat oleh gerbang stub yang ada.

---

## 1. Kuota AI 25/26 — TERBUKTI DI RUNTIME (lubang bukti #1 TUTUP)

Angka nyata, identitas anonim baru, D1 staging sungguhan:

| Yang diukur | Angka |
|---|---|
| Permintaan `POST /api/ai/task` yang menagih kuota | **25** (dibaca dari `GET /api/quota` sesudah tiap permintaan) |
| Permintaan pertama yang ditolak | **ke-26**, tepat saat `buckets.ai.used = 25` |
| Status penolakan | **429** dengan `error:"quota_exceeded"` |
| Header `retry-after` pada penolakan | ada, **1829 detik** (= sisa waktu ke tengah malam Jakarta) |
| `buckets.ai.used` sesudah penolakan | tetap **25** — penolakan tidak menagih |
| `buckets.ai.held` sesudah semua selesai | **0** — tidak ada reservasi menggantung |
| Waktu per permintaan | 63–1706 ms (rata-rata 516 ms) |

Reset harian juga terbukti dihitung Worker nyata, bukan stub: `resetTimezone` =
`Asia/Jakarta`, `day` = tanggal sipil Jakarta (bukan UTC), dan `resetAt` =
`1787850000000` = 2026-08-27T17:00:00Z = tepat tengah malam Jakarta berikutnya.
Gerbang menghitung nilai itu sendiri lalu membandingkannya, jadi ini bukan
"respons dipercaya".

Catatan pemilihan task: `tutor_turn` TIDAK bisa dipakai untuk menghitung 25. Di
runtime staging keluarannya ditolak `checkOutputContract()`
(`reason:"sentence_limit_exceeded"`, sesekali `timeout`), dan permintaan yang
ditolak mutunya di-rollback sehingga TIDAK menagih kuota. Yang dipakai
`writing_feedback` — dan justru dari situ muncul temuan #3 di bawah.

### FAIL 1 — amplop penolakan AI tidak punya `quotaCharged`

`quotaCharged` diperintahkan SELALU ada di amplop penolakan (cf-b3 §4.3;
`denyEnvelope()` di `quota/route-quota.js` memang selalu memasangnya). Tetapi
jalur 429 di `ai/route-ai.js:263-274` tidak memakai `denyEnvelope()` — ia merakit
amplopnya sendiri lewat `baseResponse()` dan **field `quotaCharged` tidak ada sama
sekali**. `tts/route-tts.js:288` pada kasus yang sama memasang
`quotaCharged: false`. Jadi dua rute yang menolak karena alasan identik menjawab
dengan dua bentuk berbeda, dan klien yang membaca `quotaCharged` untuk memutuskan
"apakah saya sudah terlanjur ditagih" akan mendapat `undefined` di jalur AI.
Bukti: assert `ai-429-quota-charged-false`, detail `quotaCharged=(FIELD TIDAK ADA)`.

---

## 2. Cache TTS — TIDAK BISA DIBUKTIKAN, karena render TTS memang RUSAK di runtime (lubang bukti #2 SEPARUH)

### Yang berhasil dibuktikan

`speed` dan `pitch` **tidak** mengubah kunci cache. Empat permintaan dengan teks
identik dan `settings` sintesis identik (`container/sampleRate/bitRate`), hanya
`speed`/`pitch` yang berbeda, semuanya menghasilkan `audioKey` yang sama persis
(`862b4d9495afacea…`). Menghapus `settings` mengubah kunci — itu benar, karena
`container/sampleRate/bitRate` memang materi sintesis. Perbaikan cf-a5/a10 jadi
terbukti di runtime, bukan hanya di stub.

Catatan metodologi: percobaan pertama saya salah dan sempat "menemukan" bug yang
tidak ada. Saya menambahkan `settings` pada permintaan `speed` tetapi tidak pada
permintaan dasar, jadi dua variabel berubah sekaligus. Gerbang sekarang memaksa
`settings` identik di keempat permintaan, dan alasannya ditulis di komentarnya.

### FAIL 2 — `POST /api/tts/render` GAGAL 100% di runtime staging

Tiga permintaan, tiga kali sama: HTTP 200, `source:"unavailable"`, `failed:true`,
`bytes:0`, dalam ~540 ms. Kuota TTS tidak bergerak sedikit pun
(`Δcalls=0`, `Δchars=0`), jadi tidak ada objek yang pernah masuk R2 dari jalur
runtime. Akibatnya rantai bukti yang diminta — MISS menagih lalu HIT gratis —
**tidak bisa dibangun**: yang kedua memang gratis, tetapi hanya karena yang
pertama juga gratis. Assert `tts-cache-chain-provable` sengaja ada supaya
`tts-hit-free` yang hijau itu tidak bisa dikutip sebagai bukti; ia hampa.

Akar masalah, dari kode dan bukan dari dugaan: `tts/route-tts.js:165` memanggil
`env.AI.run(engineId, { text: text }, options)`. Payloadnya hanya `text`.
`tools/prerender-tts.mjs` memanggil engine yang SAMA (`@cf/deepgram/aura-1`)
dengan `{ text, speaker }`, dan 598 objek yang ada di R2 staging (`GET
/api/tts/manifest`) semuanya dibuat oleh jalur prerender itu, bukan oleh runtime.
Artinya `voiceId` dipakai untuk menghitung kunci cache tetapi tidak pernah dikirim
ke provider. Assert `tts-engine-payload-carries-voice` mengunci temuan ini di
gerbang.

Yang BELUM saya buktikan tentang ini: pesan galat persis dari Workers AI. Itu
butuh `wrangler tail` pada Worker staging — saya tidak punya akses log/D1 dari
lingkungan ini. Jadi "payload tanpa suara" adalah sebab yang didukung kode dan
kontras dengan jalur prerender, bukan sebab yang sudah dibaca dari log.
Verifikasi owner: `wrangler tail fiezel-api-staging` lalu satu `POST
/api/tts/render`, atau tambahkan `speaker` lalu jalankan ulang gerbang ini —
kalau `tts-render-succeeds` berubah hijau, sebabnya terkonfirmasi dan lima FAIL
TTS lainnya ikut selesai.

Saya juga sudah mencoba jalan pintas untuk membuktikan cache hit tanpa render:
menghitung ulang `audioKey` secara lokal untuk 6.640 teks korpus
(`tools/prerender-tts.mjs → collectCorpus`) dengan empat kombinasi
voiceId/engine/settings, lalu memotongnya dengan 598 kunci yang hidup di manifest
staging. **Nol kecocokan.** Objek di R2 staging dibuat dengan parameter yang tidak
bisa saya tebak, dan kunci itu SHA-256 — tidak bisa dibalik menjadi teks. Jadi
tidak ada cara jujur membuktikan cache HIT selama jalur render mati.

### FAIL 3 — `quotaCharged: true` pada respons yang tidak menagih apa pun

Respons render yang gagal mengaku `quotaCharged: true` sementara `GET /api/quota`
sebelum dan sesudahnya identik. Sebabnya `tts/route-tts.js` (baris 317 dan 342)
meneruskan `quotaChecked` ke dalam field `quotaCharged` — dua hal yang berbeda:
yang pertama berarti "kuota diperiksa", yang kedua berarti "kuota ditagih". Untuk
permintaan yang di-rollback, jawabannya bohong. Assert
`tts-quota-charged-truthful` membandingkan klaim itu dengan pergerakan
`/api/quota` yang nyata, jadi klaim ini tidak bisa lolos lagi.

---

## 3. Temuan tambahan yang tidak saya cari: tagihan kosong

`writing_feedback` menagih kuota untuk keluaran KOSONG. Dari 25 permintaan yang
menagih, **22 mengembalikan `text:"{}"`** dengan `usage.outputTokens: 1`,
`source:"provider"`, `degraded:false` — dinyatakan sukses penuh. Hanya 3 yang
mengembalikan umpan balik berisi. `checkOutputContract()` memeriksa batas kalimat
dan kata gaya; untuk task `jsonMode` ia tidak memeriksa bahwa JSON-nya punya isi,
jadi `{}` lulus. Murid membayar satu dari 25 jatah hariannya untuk nol umpan
balik, dan neuron tetap terbakar di sisi akun.

Ini kebalikan dari cacat `tutor_turn` dan lebih berbahaya: `tutor_turn` menolak
keluarannya sendiri lalu TIDAK menagih (murid dapat fallback, gratis), sedangkan
`writing_feedback` menerima keluaran kosong lalu MENAGIH. Assert
`ai-charged-output-not-empty` sekarang menangkapnya: `22/25 tagihan berisi
keluaran kosong`.

Konsekuensi yang perlu diakui untuk paket kerja sebelumnya: `tutor_turn` yang
selalu jatuh ke fallback berarti sepanjang hari bisa ada panggilan provider nyata
(3–12 detik, neuron terbakar) yang **tidak pernah menagih kuota siapa pun** —
tidak ada pengaman biaya di jalur itu selain `GLOBAL_NEURON_CAP`. Saya tidak
mengukur biayanya di sini; itu pekerjaan terpisah.

---

## 4. Cron — TETAP TIDAK TERBUKTI DI RUNTIME (lubang bukti #3 TERBUKA)

Cron Cloudflare tidak bisa dipicu dari luar Worker. Saya **tidak** menambahkan
endpoint pemicu, dan itu keputusan sadar: satu pintu yang ada hanya supaya gerbang
hijau adalah permukaan serang baru di produksi. Yang dilakukan gerbang:

- `cron-no-open-endpoint`: `/api/cron/sweep`, `/api/cron/rollup`,
  `/api/internal/cron`, `/__scheduled`, `/cdn-cgi/handler/scheduled` → semuanya
  **404**. Tidak ada pintu cron terbuka di deployment staging (jadi juga tidak ada
  di produksi, karena kodenya identik).
- `cron-triggers-declared`: `wrangler.toml` benar memuat
  `crons = ["*/5 * * * *", "5 17 * * *"]` (sweep 5 menit, rollup 00:05 WIB).
- `analytics-ingest-live`: `POST /api/usage/events` → **202 `{"ok":true,"accepted":1}`.**
  Jalur masuk analytics hidup di runtime, jadi rollup punya bahan untuk dikerjakan.
- `pepper-state-observed`: `GET /api/usage/pepper` → **503 `unavailable`**. Ini
  observasi, bukan kegagalan: `pepper_state` baru terisi setelah rollup harian
  jalan, dan pada saat gerbang jalan (16:32 UTC) jadwal `5 17 * * *` belum tiba.
  503 berarti rollup **belum pernah** jalan sejak deploy staging.

### FAIL 4 (temuan runtime, bukan assert gerbang) — rollup harian tampaknya TIDAK jalan

Saya menunggu melewati jadwalnya dan mengukurnya, bukan menyimpulkannya. Cron
rollup dijadwalkan `5 17 * * *` UTC = 00:05 WIB. Hasil pemantauan
`GET /api/usage/pepper` pada Worker staging yang sama:

| Waktu UTC | Waktu WIB | `GET /api/usage/pepper` |
|---|---|---|
| 16:32 (sebelum jadwal) | 23:32 | 503 `unavailable` (wajar: belum jadwalnya) |
| 17:07 (+2 menit) | 00:07 | **503 `unavailable`** |
| 17:18 (+13 menit) | 00:18 | **503 `unavailable`** |

`pepper_state` seharusnya terisi pada rollup pertama: `runDailyRollup()` langkah 4
memanggil `rotatePepperDue(now, state?.rotated_at)` dan state yang belum pernah ada
jatuh tempo, jadi satu kali rollup sukses sudah cukup untuk membuat endpoint itu
200. Tiga belas menit sesudah jadwal ia masih 503. Kemungkinan yang tersisa, dan
saya tidak bisa memilih di antaranya tanpa log: (a) deployment staging tidak
membawa `[triggers] crons`, (b) `scheduled()` jalan tetapi `runAnalyticsRollup()`
melempar dan galatnya ditelan `try/catch` di `runScheduled()`, atau (c) binding D1
yang dipakai rollup (`analyticsEnv(env)`) bukan database yang sama dengan yang
ditulis `POST /api/usage/events` — yang jelas hidup, karena ia menjawab 202.

Bukti sampingan yang IKUT terukur di jam yang sama: batas hari kuota memang
berputar dengan benar di runtime. Pada 17:07 UTC `GET /api/quota` menjawab
`day: "2026-08-28"` dengan `resetAt: 1787936400000` (2026-08-28T17:00:00Z), yaitu
tengah malam WIB berikutnya. Jadi reset harian Asia/Jakarta bukan hanya benar
secara aritmetika, ia benar melintasi batas hari sungguhan.

Yang tetap belum terbukti dan cara owner memverifikasinya:

1. **Sweep reservasi benar-benar dieksekusi tiap 5 menit.** Verifikasi:
   `wrangler d1 execute fiezel-core-staging --command "SELECT COUNT(*) FROM quota_reservation WHERE expires_at < unixepoch()*1000"`
   → harus 0 setelah menunggu >5 menit; atau `wrangler tail fiezel-api-staging`
   dan lihat event `scheduled`. Bukti tidak langsung yang sudah ada dari gerbang
   ini: `buckets.ai.held = 0` setelah 26 permintaan, jadi tidak ada reservasi yang
   menggantung untuk disapu.
2. **Rollup harian + rotasi pepper benar-benar dieksekusi.** Sudah diukur di atas
   dan hasilnya NEGATIF sampai +13 menit. Langkah owner berikutnya: buka
   Cloudflare dashboard → Worker `fiezel-api-staging` → Settings → Trigger Events,
   pastikan dua cron memang terpasang pada deployment itu; lalu
   `wrangler tail fiezel-api-staging` melewati jadwal berikutnya untuk melihat
   event `scheduled` dan galatnya. Pemeriksaan D1:
   `wrangler d1 execute fiezel-stats-staging --command "SELECT * FROM metrics_daily ORDER BY day DESC LIMIT 3"`
   dan `SELECT rotated_at FROM pepper_state WHERE id = 1`.
3. **Idempotensi** kedua job tetap terbukti hanya di atas stub
   (`cf-wiring-test.js`), dan itu tidak berubah dari paket kerja ini.

---

## 5. Yang berubah di repo

| Berkas | Perubahan |
|---|---|
| `staging-live-test.js` | BARU. 40 assert terhadap runtime staging. SKIP bersih (exit 0, cetak alasan) tanpa `FIEZEL_STAGING_BASE`/`FIEZEL_STAGING_EDGE`. Menolak jalan kalau `/health` tidak mengaku staging — pengaman supaya ia tidak pernah menulis state di produksi. Rahasia hanya dari env; laporan dipindai dulu dan tidak ditulis kalau rahasianya muncul. |
| `.github/workflows/quality.yml` | Langkah `node staging-live-test.js` sesudah `cf-live-contract-test.js`, dengan komentar bahwa ia SKIP sampai owner menyetel base URL Worker STAGING dan bahwa rahasia edge harus lewat repository secret, bukan berkas repo. |
| `.gitignore` | `STAGING-LIVE-REPORT.json` diabaikan, dengan alasan tertulis. |
| `no-network-test.js` | `ENV_GATED_LIVE_ALLOWLIST` diubah dari Set (satu env global) menjadi Map berkas→env, supaya `staging-live-test.js` diperiksa terhadap `FIEZEL_STAGING_BASE` dan bukan terhadap env milik gerbang lain. Syarat lamanya tetap penuh (baca env, tanpa URL bawaan, tidak dobel-kelas, dan benar-benar dijalankan untuk membuktikan exit 0 + cetak `SKIP`). Satu assert baru: langkah staging harus terdaftar di `quality.yml` sebagai langkah yang mati secara bawaan. |

Versi build TIDAK dinaikkan. Commit di `roll/s3staging`, tidak di-push.

Verifikasi: `regression-test.js` PASS, `install-health-test.js` PASS,
`no-network-test.js` PASS (36 assert, 128 gerbang), `cf-live-contract-test.js`
SKIP bersih (exit 0). `staging-live-test.js` FAIL 10/40 terhadap staging — itu
temuan, bukan kerusakan gerbang; tanpa env ia SKIP dan tidak memerahkan CI publik.

## 6. Data uji di staging

Identitas anonim baru dibuat setiap kali gerbang jalan (4 identitas per jalan),
dan barisnya tertinggal di D1 `fiezel-core-staging` bersama ~75 baris kuota dan
satu event analytics per jalan. Saya **tidak** menghapusnya: dari lingkungan ini
saya tidak punya akses `wrangler`/D1 API ke staging, dan database staging memang
terpisah dari data murid. Kalau owner ingin bersih:
`DELETE FROM quota_daily WHERE user_id IN (SELECT id FROM users WHERE created_at > <epoch 27 Agu 2026 16:00 UTC>)`
dan padanannya di tabel identitas.

## 7. Batas kejujuran yang tersisa

`reports/exec-wiring.md` §6 sekarang bisa dipersempit, bukan dihapus:

- kuota 25/26 + reset Asia/Jakarta: **terbukti di runtime Cloudflare** (bagian 1).
- invariansi kunci cache TTS terhadap `speed`: **terbukti di runtime** (bagian 2).
- cache TTS menagih pada MISS dan gratis pada HIT: **masih belum terbukti**, dan
  penyebabnya bukan alat uji melainkan jalur render yang rusak (bagian 2).
- cron sweep + rollup: **masih hanya stub**, dan bukti runtime yang ada justru
  menunjukkan rollup TIDAK jalan di staging (bagian 4). Ini harus diselesaikan
  sebelum ada yang menulis "analytics harian jalan" di dokumen mana pun.
- reset harian melintasi batas hari WIB: **terbukti di runtime** (bagian 4, tabel
  jam 17:07 UTC).
