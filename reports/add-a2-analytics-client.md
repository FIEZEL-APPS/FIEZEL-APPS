# A2 — Analytics sisi KLIEN (`features/analytics/fiezel-analytics-client.js`)

Branch: `add/a2analytics` · worktree `wt-a2analytics` · tanpa push, tanpa bump build.
Otoritas: `EXEC-BRIEF-CF.md` bagian **KONTRAK ANALYTICS PRIVASI-MAKSIMAL**.

---

## 1. Masalah yang ditutup paket ini

Sisi Worker sudah lengkap sebelum paket ini: tabel agregat saja
(`workers/api/analytics/analytics-tables.js`), rollup harian (`rollup.js`), rotasi
pepper 24 jam dengan penghapusan pepper lama (`analytics-core.js`
`rotatePepper()`), dan penolakan event server-only di gerbang HTTP
(`route-events.js` `processClientBatch()` → `400 server_only`).

Yang tidak ada sama sekali adalah **sisi yang mengirim**. Nol dari 15 event bab 19
pernah benar-benar berangkat dari perangkat, sehingga:

- `metrics_daily` tidak pernah menerima `app_open`/`day_active` → **DAU = 0**,
- `retention_daily` tidak pernah menerima `retention_ping` → **D1/D7/D30 mustahil**,
- `usage_daily` hanya berisi bucket yang diterbitkan Worker sendiri (AI/TTS).

Server yang sempurna di belakang klien yang tidak ada tetap menghasilkan dashboard
kosong. Paket ini membuat satu berkas baru yang mengisi lubang itu, dan satu
gerbang yang menjaganya.

## 2. Yang dibuat

| Berkas | Status | Isi |
|---|---|---|
| `features/analytics/fiezel-analytics-client.js` | BARU | modul klien, UMD, 0 dependency, 0 DOM |
| `tests/analytics-client-test.js` | BARU | gerbang node murni + `vm`, 90 assert, nol jaringan |
| `.github/workflows/quality.yml` | +1 langkah | `node tests/analytics-client-test.js` sesudah `tests/analytics-server-only-test.js` |
| `ANALYTICS-CLIENT-REPORT.json` | BARU | bukti jalan gerbang (90/90 PASS) |

**TIDAK disentuh:** `app.js`, `features/neural-voice/**`, `workers/**`,
`core-config.js`, `sw.js`, `index.html`, dan tiga penanda build
(`SW_REV`, `DIAG_BUILD`, `FIEZEL_PAGE_BUILD`) — sesuai aturan bahwa hanya MASTER
yang menaikkannya saat merge.

## 3. Keputusan desain (dan alasannya, bukan sekadar apa)

### 3.1 `installId` tidak pernah dikirim — dan tidak pernah bisa

`installId` = `crypto.randomUUID()`, disimpan di
`localStorage['fiezel-analytics-install-v1']`. Satu-satunya pemakaiannya di
seluruh berkas adalah masukan HMAC di `visitorToken()`. Yang dikirim adalah
`visitor_token = HMAC-SHA256(pepper_hari_ini, installId)` dipotong 128 bit (32
hex), **dihitung di perangkat dengan WebCrypto**, pepper dari
`GET /api/usage/pepper`.

Gerbang tidak memercayai klaim itu: ia membaca `installId` dari penyimpanan
palsu lalu mencari substring itu di **setiap byte** yang pernah dikirim
(`installId TIDAK PERNAH muncul di payload mana pun`), dan menghitung ulang token
dengan `crypto.createHmac` Node serta dengan `visitorToken()` sisi Worker —
ketiganya harus sama persis.

### 3.2 Daftar hitam eksplisit, bukan "semua yang bukan allowlist"

`SERVER_ONLY_EVENTS` ditulis apa adanya (10 nama: `user_created` + seluruh jalur
AI/TTS/kuota/breaker) dan gerbang menuntut daftar itu **identik** dengan
`SERVER_ONLY_EVENTS` di `workers/api/analytics/analytics-core.js`. Kalau suatu
hari Worker menambah event server-only dan klien tidak, gerbang merah — bukan
diam-diam mengizinkan.

Ada dua lapis penolakan yang berbeda maknanya, dan itu disengaja:
`server_only` (event ini ada, tapi bukan milik klien) diperiksa **sebelum**
`unknown_event`, supaya alasan penolakan jujur dan bisa dibaca di `stats()`.

### 3.3 Allowlist field + jaring PII sebagai lapis terakhir

Delapan event klien, allowlist field per event, semua bertipe enum tertutup /
boolean / integer berbatas. **Nol field teks bebas** — teks bebas adalah pintu
masuk nama, email, isi soal, dan transkrip.

Tiga hal yang lebih ketat daripada sisi Worker:

1. `visitor_token`, `cohort_day`, `day_index` ditandai `managed:true` → nilai dari
   pemanggil **dibuang seperti field asing**. Kalau UI boleh mengirim token
   sendiri, jaminan "token selalu HMAC hari ini" berhenti menjadi sifat sistem.
2. `app_version` dibatasi tiga komponen (Worker mengizinkan empat): `5.19.0.1`
   tidak bisa dibedakan dari alamat IPv4 oleh pemindai PII, dan jaring PII tidak
   dilonggarkan demi sebuah nomor versi.
3. Baris yang datang dari **penyimpanan** disanitasi ULANG di `flush()`
   (`resanitize()`). localStorage bukan wilayah yang bisa dipercaya: skrip lain di
   origin yang sama bisa menulisnya dan versi modul lama bisa meninggalkan bentuk
   lain. Yang dipertahankan hanya `day`-nya (itulah gunanya antrean offline);
   baris di luar toleransi ±2 hari dibuang di klien karena satu baris kedaluwarsa
   membuat Worker menolak SELURUH batch (`day_out_of_range`) dan memacetkan
   antrean selamanya.

Sebelum byte berangkat, `transmit()` memindai payload lengkap terhadap pola
email / UUID / IPv4 / User-Agent / token bearer + nilai `installId`. Kalau
menyala, **batch dibuang, bukan dikirim**. Kegagalan analytics jauh lebih murah
daripada satu email murid yang terkirim.

`platform` hanya `android`/`ios`/`desktop`: User-Agent dibaca sekali, diperas jadi
satu kata, lalu dilupakan — tidak disimpan, tidak dikirim.

### 3.4 Gerbang flag bersifat mutlak (dan mencakup penyimpanan)

`gateOpen()` = `FIEZEL_CF_CONFIG.enabled === true && endpoints.usage === 'on'`.
Selama itu tidak benar, modul tidak mengirim apa pun **dan tidak membuka
penyimpanan sama sekali**: tidak ada `installId` yang dibuat, tidak ada antrean,
tidak ada `cohort_day`. Flag mati berarti modul ini tidak meninggalkan jejak apa
pun di perangkat murid — bukan sekadar diam. Gerbang mengukurnya dengan
penyimpanan yang MENGHITUNG akses dan menuntut angkanya **nol**, termasuk untuk
`usage:'shadow'` (mode shadow tidak boleh menulis analytics: efek sampingnya
bukan dry-run).

Singleton dibuat malas (`instance()`), bukan saat berkas dimuat — modul yang
membuka penyimpanan pada waktu muat melanggar jaminan ini tanpa satu pun
pemanggil.

### 3.5 Antrean offline: dua cap, yang tertua dibuang

`MAX_QUEUE_EVENTS = 60` dan `MAX_QUEUE_BYTES = 12 KB`. Dua cap karena keduanya
gagal berbeda: cap jumlah menahan banjir event kecil, cap byte menahan antrean
gemuk warisan versi lain. Yang dibuang selalu yang **tertua** (`shift`) — data
lama bernilai paling kecil, dan analytics tidak boleh menjadi kebocoran
penyimpanan di ponsel murah. `setItem` yang gagal (kuota penuh) membuang antrean,
bukan melempar ke jalur belajar.

Pengiriman: `navigator.sendBeacon` lebih dulu; kalau tidak tersedia **atau
menolak** (kuota beacon browser), jatuh ke `fetch(..., {keepalive:true})`. Batch
maksimal 20 event / 8 KB agar cocok dengan `LIMITS` di `route-events.js`. Gagal
kirim = antrean **tetap utuh** (hari offline tidak hilang); berhasil = dibuang
dari antrean sebelum batch berikutnya (tidak pernah dobel).

### 3.6 Retensi dihitung di klien

`cohort_day` = hari pertama perangkat ini (ditulis sekali ke
`fiezel-analytics-meta-v1`), `day_index` = selisih hari. Yang dikirim ke
`POST /api/usage/retention` **hanya** `{day, cohort_day, day_index}` — tanpa
token, tanpa identitas. Maksimal sekali per hari. Server cuma menaikkan satu
penghitung agregat, persis seperti kontrak.

`day_active` juga sekali per hari, dan hanya kalau hari itu **berarti** (≥5
percobaan). Ambang itu bukan hiasan: "membuka aplikasi" bukan "belajar", dan DAU
yang menghitung pembukaan tanpa aktivitas adalah angka yang menipu ownernya
sendiri.

## 4. Titik pemanggil yang DISARANKAN (belum dipasang — sengaja)

Paket ini dilarang menyentuh `app.js`. Daftar di bawah juga hidup sebagai
`RECOMMENDED_CALL_SITES` di dalam modul, dan gerbang menuntut `app.js` **belum**
menyebut `FiezelAnalytics` (kalau suatu hari dipasang, assert itu yang perlu
diubah sadar-sadar, bukan lolos diam-diam).

| Event | Titik pemanggil usulan di `app.js` | Panggilan |
|---|---|---|
| `app_open` | akhir boot, sesudah shell tampil | `FiezelAnalytics.start({hasIdentity})` |
| `day_active` | sesudah `recordAnswer()`, dengan jumlah percobaan hari itu | `FiezelAnalytics.markActive(state.daily.attempts)` |
| `session_started` | `startSession()` | `FiezelAnalytics.track('session_started',{mode,level})` |
| `session_ended` | `endSession()` dan `abandonSession()` | `FiezelAnalytics.track('session_ended',{mode,level,completed,answered,duration_bucket})` |
| `lesson_started` | `openLesson()` | `FiezelAnalytics.track('lesson_started',{domain,level})` |
| `lesson_completed` | `finishLesson()` | `FiezelAnalytics.track('lesson_completed',{domain,level})` |
| `question_answered` | `recordAnswer()` | `FiezelAnalytics.track('question_answered',{domain,level,ok})` |
| `retention_ping` | otomatis di `start()` | — |

Dua langkah pemasangan yang **belum** dilakukan dan harus dilakukan MASTER saat
merge, karena keduanya menyentuh berkas yang dikunci paket lain:

1. `index.html` — tambahkan `<script src="features/analytics/fiezel-analytics-client.js" defer></script>`.
2. `sw.js` daftar `ASSETS` — tambahkan jalur yang sama, lalu naikkan `SW_REV`
   (satu-satunya cara flag statis menjangkau PWA yang sudah terpasang).
3. `FIEZEL_CF_CONFIG.endpoints.usage` tetap `'off'` sampai owner memutar flagnya
   dan `base` terisi; sampai saat itu modul ini benar-benar inert.

## 5. Verifikasi (dijalankan di worktree ini)

| Gerbang | Hasil |
|---|---|
| `tests/analytics-client-test.js` (BARU) | **90/90 PASS**, exit 0 |
| `tests/observability-privacy-test.js` (tidak dilemahkan) | exit 0 |
| `tests/analytics-privacy-test.js` | exit 0 |
| `tests/analytics-server-only-test.js` | exit 0 |
| `tests/analytics-aggregate-test.js` | exit 0 |
| `tests/regression-test.js` | exit 0 |
| `tests/install-health-test.js` | exit 0 |
| `tests/no-network-test.js` | exit 0 |
| `tests/ui-structure-test.js` | exit 0 |
| `tests/cf-transport-test.js`, `tests/cf-wiring-test.js`, `tests/workflow-actor-gate-test.js`, `tests/pwa-cache-test.js` | exit 0 |

Gerbang barunya sengaja membuktikan dirinya bisa merah (anti-vakum): pemindai PII
diuji terhadap payload sintetis yang bocor dan harus menangkapnya, dan payload
klien yang sah dijalankan lewat `processClientBatch()` / `processRetentionPing()`
Worker sungguhan dan harus menjawab **202** — privasi yang benar tapi ditolak
server tetap berarti DAU nol.

`tests/no-network-test.js` menerima berkas baru ini karena transportnya adalah mock
lokal bernama sendiri (`transport.http`, disuntik lewat `fetchImpl:`), bukan
`fetch` global; tidak ada `require('http')`, tidak ada URL literal non-loopback
yang dipanggil.

## 6. Catatan jujur untuk owner (jangan dipoles)

- Angka DAU/retensi dari modul ini adalah **estimasi PERANGKAT**, bukan orang.
  Satu orang dua perangkat = dua hitungan. Hapus data browser = perangkat baru
  (installId baru, `cohort_day` baru, cohort retensi baru).
- Event sesi/pelajaran/jawaban **self-reported**: klien yang melaporkannya. Itu
  memang syarat kontrak (klien hanya boleh mengirim event yang tidak bernilai
  untuk dipalsukan), tapi konsekuensinya harus ditulis di dashboard, bukan
  disembunyikan.
- `day_active` hanya terbit kalau hari itu ≥5 percobaan, jadi DAU di sini berarti
  **hari belajar**, bukan **hari membuka aplikasi**. Angkanya akan LEBIH KECIL
  daripada definisi DAU yang biasa dipakai vendor analytics. Itu disengaja.
- Kalau `GET /api/usage/pepper` mati, event penyumbang DAU **ditahan di antrean**
  (tidak dikirim tanpa token) dan bisa hilang kalau cap antrean terlampaui
  duluan. Artinya: pemadaman Worker analytics = lubang di angka DAU hari itu,
  bukan angka yang salah.
- `*-REPORT.json` yang tersentuh gerbang lain (`CF-TRANSPORT`, `CF-WIRING`,
  `NO-NETWORK`) **direstore** sebelum commit sesuai aturan fase ini. Konsekuensi
  jujurnya: `NO-NETWORK-REPORT.json` yang tercommit masih menyebut
  `scanned: 127` sementara jumlah gerbang sebenarnya kini 128 (berkas baru ini).
  Nilainya akan benar sendiri saat MASTER menjalankan ulang suite waktu merge.
- `release-audit.py` dan `validator.js` TIDAK dijalankan sampai selesai di
  worktree ini (durasinya menit-menitan dan melewati batas waktu lingkungan
  kerja). Keduanya tidak menyentuh berkas yang diubah paket ini
  (`release-audit.py` memeriksa `app.js`, `core-config.js`,
  `features/neural-voice/**`, `features/speaking-listening/**` — semuanya tidak
  disentuh), tetapi ini dicatat sebagai batas kejujuran, bukan diklaim lulus.
