# A1 — Pemancar analytics sisi klien

Cabang `work/a1emit`. Tidak di-push. Versi build tidak dinaikkan. Tidak menyentuh
`features/neural-voice/`, `features/library/`, `workers/owner/`, `workers/api/ai/`,
`coordination/`, `sw.js`.

---

## 1. Apa yang SUDAH ADA, dan apa yang sebenarnya hilang

Klaim audit "analytics mati dua lapis" perlu dipersempit, karena kalau tidak, paket kerja
ini akan menulis ulang ~1.900 baris yang sudah benar.

**Yang sudah ada, lengkap, dan hijau sebelum A1** — semuanya siap dan hanya menunggu
pemanggil:

| Berkas | Baris | Status sebelum A1 |
| --- | --- | --- |
| `features/analytics/fiezel-analytics-client.js` | 900 | Modul klien privasi-maksimal LENGKAP. Ada `track/flush/start/markActive/sendRetention/attachLifecycle/visitorToken`, sanitasi allowlist, HMAC-pepper, antrean bercap, `scanForPii`. Komentar kepalanya sendiri sudah menyatakan pemanggil "BELUM dipasang — sengaja". |
| `workers/api/analytics/analytics-core.js` | 485 | Skema event + agregasi. Sumber kebenaran bentuk event. |
| `workers/api/analytics/route-events.js` | 325 | `processClientBatch()` / `processRetentionPing()`. |
| `workers/api/analytics/analytics-store-d1.js` | 227 | Tulis agregat. |
| `workers/api/analytics/rollup.js` | 255 | Rollup harian. |
| `migrations/0002_analytics.sql` | — | `metrics_daily`, `usage_daily`, `retention_daily`. |
| `tests/analytics-client-test.js` | 635 | Gerbang sisi klien. |
| `tests/analytics-privacy-test.js` | 311 | Gerbang kontrak privasi. |
| `tests/analytics-server-only-test.js` | 299 | Gerbang event server-only. |
| `tests/analytics-aggregate-test.js` | 348 | Gerbang agregat-saja. |

**Yang benar-benar hilang: pemanggil, dan hanya pemanggil.** `grep` untuk
`installId`/`visitor_token` memang nol hasil di `app.js`, dan itu benar — bukan karena
modulnya tidak ada, tapi karena `app.js` belum pernah menyentuhnya. Konsekuensinya
persis seperti yang ditulis audit: kuota dipatok tanpa satu angka pengguna, dashboard
owner cangkang. Tapi ukuran pekerjaan yang tersisa bukan 1.960 baris, melainkan satu blok
pemanggil dan tiga titik sambung.

Gerbang `tests/analytics-client-test.js` bahkan MENGUNCI keadaan itu: assert terakhirnya adalah
`!appSrc.includes('FiezelAnalytics')` — "app.js TIDAK disentuh paket kerja ini". Assert itu
saya balik di A1. Assert semacam itu benar sebagai penanda serah-terima, tapi ia juga
alasan struktural mengapa analytics bisa hijau tiga gerbang selama itu dengan nol event.

---

## 2. Apa yang A1 tambahkan

### 2.1 Blok pemancar di `app.js` (~178 baris, termasuk komentar)

Disisipkan tepat setelah `/* CF-KILLSWITCH-END */`, dibatasi penanda
`/* A1-ANALYTICS-EMITTER-BEGIN */ … /* A1-ANALYTICS-EMITTER-END */` supaya gerbang bisa
mengambil dan MENJALANKAN blok itu di `vm` tanpa memuat seluruh `app.js`.

Mengekspor `self.FiezelAnalyticsEmitter` (pola yang sama dengan `self.FiezelCfKillSwitch`
yang sudah ada) dengan `boot, sessionStarted, sessionEnded, markActive, gateOpen, fields,
mode, schedule, stats, _resetForGate`.

### 2.2 Tepat TIGA titik pemanggil di luar blok

Semuanya bertanda `/*A1-EMIT*/` supaya bisa dihitung gerbang:

| Lokasi | Pemanggil |
| --- | --- |
| `beginLearningSession()` (app.js ~1152) | `anSessionStarted(state.activeSession)` |
| `abandonActiveSession()` (app.js ~1163) | `anSessionEnded(session)` |
| jalur sesi tuntas (app.js ~6798) | `anSessionEnded(session)` |

Ketiganya di siklus-hidup SESI. Nol di jalur jawaban.

### 2.3 Dua perbaikan — keduanya TEMUAN, lihat §6

- Kunci single-flight pada `flush()` di modul (+19 baris, `fiezel-analytics-client.js`).
  Ini satu-satunya perubahan pada modul.
- `anSwallow()` di pemancar: menelan setiap janji yang keluar dari modul.

---

## 3. Bagaimana tiga pertanyaan owner dijawab

Mandat: *"analytic, privai akssimal dan angka pengguna juga"*. Dua-duanya, bukan salah satu.

| Pertanyaan owner | Event | Privasi |
| --- | --- | --- |
| Berapa pengguna aktif harian | `day_active{attempts_bucket, platform, visitor_token}` | `visitor_token` = HMAC-SHA256(pepper hari ini, installId) dipotong 128 bit. Pepper dirotasi, pepper lama dihapus. Dedup DAU jalan di dalam satu hari, penautan lintas hari mati. |
| Berapa yang kembali | `retention_ping{cohort_day, day_index}` | Tanpa token sama sekali. `day_index` dihitung KLIEN dari `cohort_day` miliknya sendiri. Server cuma menaikkan penghitung agregat. |
| Fitur apa yang dipakai | `session_started{mode, level}` dan `session_ended{mode, level, completed, answered, duration_bucket}` | `mode` dari peta TERTUTUP; tipe internal tak dikenal jatuh ke `practice`, tidak pernah diteruskan sebagai teks bebas. Durasi dalam ember, bukan milidetik. |

Ambang "hari aktif" = `MEANINGFUL_ATTEMPTS = 5`, ambang yang SAMA dengan cincin misi yang
dilihat murid. Ini bukan detail: kalau owner memakai ambang lain, angka dashboard akan
membantah angka yang dilihat murid di layarnya sendiri, dan salah satu dari keduanya akan
dianggap bohong.

### Empat event, dan mengapa `question_answered` SENGAJA tidak ada

Modul mengizinkan `question_answered`, `lesson_started`, `lesson_completed`. A1 tidak
memancarkan ketiganya. Alasannya struktural, bukan hemat kuota: satu-satunya tempat untuk
memancarkan `question_answered` adalah `record()` / `answer()` / `answerCloze()` — persis
fungsi yang memegang `q.options`, `correctAnswer`, dan `selectedAnswer`. Menaruh pemancar
di sana berarti jaminan "nol isi belajar terkirim" berhenti menjadi sifat struktur dan
mulai bergantung pada kehati-hatian penyunting `app.js` berikutnya.

`session_ended.answered` — bilangan bulat yang SUDAH diagregasi aplikasi — menjawab
"seberapa banyak dipakai" tanpa pernah menyentuh satu soal. Itu yang membuat assert (e)
bisa berupa pemeriksaan struktur ("nol pemancar di badan tiga fungsi ini") dan bukan
imbauan.

---

## 4. Gerbang dua lapis, dua arah

`anGateOpen()` menuntut KEDUANYA:

- lapis statis: `FIEZEL_CF_CONFIG.endpoints.usage === 'on'` (`core-config.js`, hari ini `off`)
- lapis server: `cfServerAllows('usage')` = `cfAnalyticsEnabled === true` DAN `enabled.analytics !== false`

Salah satu mati ⇒ nol permintaan, nol akses penyimpanan, nol `installId` dibuat, nol
`<script>` disuntik. `'shadow'` BUKAN izin mengirim.

Gerbang tidak dibaca sekali lalu di-cache. Ia diberikan ke modul sebagai objek
BER-GETTER (`AN_CONFIG_VIEW`); modul memanggil `gateOpen()` di awal setiap jalur publiknya,
jadi kalau kill switch server berbalik di tengah sesi, permintaan berikutnya berhenti
tanpa reload.

**Nol biaya saat mati.** Modul TIDAK ada di `index.html` dan TIDAK di-precache `sw.js`
(`sw.js` terlarang di paket kerja ini, dan `tests/boot-order-test.js` akan memerahkan skrip
lazy yang tidak di-precache). Ia disuntik sebagai `<script async>` hanya kalau gerbang
sudah terbuka. Kalau lapis statis `off`, bahkan TIMER-nya tidak dipasang — keadaan hari
ini adalah nol timer, nol byte, nol kunci penyimpanan.

**Tidak menahan boot.** Nol `await` di seluruh blok (diassert). Boot dijadwalkan di
`requestIdleCallback` (fallback `setTimeout 2000`) SESUDAH `cfConfigInFlight` selesai.
Jendela sebelum `/api/config` menjawab berjalan dengan gerbang TERTUTUP — arah yang aman.
Semua pemancar mengembalikan `boolean`, bukan `Promise`, jadi pemanggil tidak punya cara
untuk menunggunya walau ia mau.

---

## 5. Byte per sesi (diukur, bukan ditebak)

Diukur di dalam gerbang, dari badan permintaan yang benar-benar keluar. Artefak mentahnya
ditulis ke `ANALYTICS-EMITTER-BYTES-REPORT.json` setiap kali gerbang jalan.

| Yang diukur | Byte badan | Permintaan |
| --- | --- | --- |
| Hari pertama: `retention_ping` + batch (`app_open` + `day_active` + satu sesi) | **625** | 2 |
| `retention_ping` sendiri | 103 | 1 |
| Marginal tiap sesi tambahan | **~321** | 1 |
| Hari 4 sesi (diukur) | 1.388 | 5 |
| 30 hari @ 3 sesi/hari (perkiraan) | ~**37 KB/bulan** | ~120 |

Tambahkan overhead header HTTP ~300–500 byte per permintaan; itu di luar angka di atas dan
di praktiknya lebih besar daripada badannya sendiri. Perkiraan realistis termasuk header:
**~1 KB/hari untuk murid yang belajar 3 sesi**. Batas keras yang sudah dipegang modul:
`MAX_BODY_BYTES = 8192`, `MAX_EVENTS_PER_BATCH = 20`, satu batch per flush, flush hanya di
akhir sesi dan `pagehide`.

---

## 6. TEMUAN: `flush()` mengirim batch yang SAMA dua kali

Ini bukan temuan kosmetik dan bukan hasil memaksa klien mengirim bentuk aneh supaya server
senang. Ini bug hitung.

`flush()` memotret antrean (`var q = queue()`), lalu MENUNGGU `visitorToken()` (yang
sendiri bisa menunggu `GET /api/usage/pepper`), dan baru membuang antrean SETELAH kirim
sukses. Tidak ada kunci apa pun di antaranya. Dua pemanggil yang tumpang-tindih — dan A1
membuat kombinasi itu jadi normal: `start()` masih menunggu pepper ketika `sessionEnded()`
memanggil `flush()` — memotret antrean yang sama, keduanya menunggu token yang sama,
keduanya mengirim batch yang sama.

Diamati langsung di harness `vm`: **3 permintaan untuk 4 event, dengan badan yang identik
byte-per-byte terkirim dua kali.** Akibatnya di produksi: satu sesi dihitung dua kali,
DAU dan pemakaian gembung. Angka gembung lebih buruk daripada tidak ada angka, karena ia
dipercaya.

**Diperbaiki di sisi yang benar** (modul, bukan klien): kunci single-flight di `flush()`.
Pemanggil kedua ikut menunggu janji pemanggil pertama, tidak memulai pengiriman baru.
`memory.flushing` juga dibersihkan `_resetMemory()`. Sesudahnya: 2 permintaan, nol
duplikat. Dijaga assert
`(b) NOL batch ganda: tidak ada badan permintaan yang identik terkirim dua kali`.

### TEMUAN KEDUA: janji modul yang tidak ditangkap menjadi `unhandledRejection`

Ditemukan justru karena gerbangnya sendiri flaky, dan itu petunjuknya. `start()`,
`flush()`, dan `sendRetention()` mengembalikan Promise. Pemancar SENGAJA tidak
menunggunya (fire-and-forget), tapi versi pertama pemancar juga tidak menangkapnya. Janji
yang tidak ditunggu DAN tidak ditangkap menjadi `unhandledRejection`: di browser itu galat
konsol yang bisa dilihat murid, dan di Node ia bisa mematikan proses. `try/catch` di
`anEmit` tidak menutupnya, karena lemparannya terjadi ASINKRON, setelah `fn(c)` selesai.

Gejalanya: assert `(d) NOL unhandledRejection` kadang hijau kadang merah antar-jalan,
tergantung berapa lama harness menunggu. Assert yang flaky bukan assert yang lemah — ia
assert yang sedang menunjuk bug nyata dan diabaikan karena tidak konsisten.

Diperbaiki dengan `anSwallow(p)` yang memasang `then(noop, noop)` pada setiap nilai kembali
modul tanpa membuatnya bisa di-`await` pemanggil. Gerbang lalu stabil 5 dari 5 jalan
berurutan.

**Sisi server TIDAK menolak bentuk event yang wajar.** Semua batch dan `retention_ping`
yang keluar dari pemancar diterima `processClientBatch()` / `processRetentionPing()`
dengan status 202, dibandingkan secara programatik terhadap skema server yang sungguhan
(`await import('./workers/api/analytics/route-events.js')`), bukan diketik ulang di
gerbang. Tidak ada satu pun kompromi bentuk di sisi klien.

---

## 7. Gerbang `tests/analytics-client-test.js` — dari 635 ke 984 baris

Registrasi CI: sudah terdaftar di `.github/workflows/quality.yml` baris 117
(`node tests/analytics-client-test.js`), dan `tests/gate-registry-test.js` hijau. Tidak perlu
registrasi baru; blok komentar di sekitarnya saya biarkan karena masih akurat untuk sisi
modul.

Bagian §10 diganti seluruhnya. Yang lama meng-assert `app.js` TIDAK disentuh; yang baru
mengekstrak blok `A1-ANALYTICS-EMITTER-BEGIN…END` dari `app.js` dan MENJALANKANNYA di `vm`
bersama modul analytics yang sungguhan, dengan mock hanya di tepi paling luar
(`localStorage`, `navigator.sendBeacon`, `fetch`, `document`, `cfStaticMode`,
`cfServerAllows`). **167 assert, semuanya hijau. Nol jaringan** (`tests/no-network-test.js` exit 0).

Enam tuntutan mandat:

| | Tuntutan | Bagaimana diassert |
| --- | --- | --- |
| (a) | flag mati ⇒ nol permintaan | Tiga kombinasi dijalankan: statis `off`+server on, statis `on`+server off, statis `shadow`. Tiap kombinasi diassert nol beacon, nol POST, nol panggilan pepper, nol akses `localStorage`, nol `<script>`, dan semua pemancar mengembalikan `false`. Ditambah: statis `off` ⇒ nol timer, statis `on` ⇒ tepat satu. |
| (b) | flag hidup ⇒ event terkirim dengan bentuk yang DITERIMA server | Payload nyata dari pemancar diumpankan ke `processClientBatch()`/`processRetentionPing()` yang sungguhan. Skema server tidak diketik ulang di gerbang. Ditambah assert nama event, ember durasi, peta `mode` tertutup, dan nol batch ganda. |
| (c) | nol isi belajar | Dua lapis. Daftar kata terlarang (21 kata, termasuk `correctAnswer`, `selectedAnswer`, `transcript`, `jawaban`, `kalimat`, `itemId`, `puter`, `uuid`) DAN assert struktural: kunci setiap event harus subset `FiezelAnalytics.CLIENT_EVENT_SPEC` — allowlist dibaca dari kontrak modul, bukan diketik ulang. Ditambah uji langsung allowlist pemancar: field asing dan string >16 karakter dibuang sebelum menyentuh modul. |
| (d) | kegagalan jaringan tidak melempar ke pemanggil | Delapan skenario: fetch menolak, fetch melempar sinkron, server 500, `sendBeacon` gagal + POST gagal, modul gagal dimuat, `localStorage.setItem` melempar, modul melempar sinkron di `track()`, modul menolak asinkron di `flush()`. Tiap skenario: nol lemparan, pemanggil menerima `boolean`. Ditambah assert global nol `unhandledRejection`. |
| (e) | pemancar tidak pernah di jalur ujian/latihan | Badan `record()`, `answer()`, `answerCloze()` diekstrak lewat pencocokan kurung dan diassert NOL kemunculan `anSessionStarted\|anSessionEnded\|anMarkActive\|anBoot\|anEmit\|anLoad\|FiezelAnalytics*`. Ditambah: tepat 3 titik pemanggil di luar blok, semuanya bertanda `/*A1-EMIT*/`, tepat 2 di antaranya `session_ended`, dan tidak ada baris pemanggil yang menyentuh `q.options`/`correctAnswer`/`selectedAnswer`/`prompt`/`transcript`. Pemindainya sendiri diuji anti-vakum. |
| (f) | identitas tidak bisa ditautkan lintas periode pepper | Satu perangkat, penyimpanan yang SAMA (jadi `installId` tidak berubah), tiga periode pepper. Diassert tiga token berbeda, semuanya 128 bit hex, nol potongan `installId` di dalam token, dan nol field selain token yang unik-per-perangkat (hanya `platform` dan `app_version` yang kasar/bersama). |

---

## 8. Matriks bukti-merah

Skripnya: `tools/_a1_redproof.sh` (dapat dijalankan ulang; memulihkan berkas lewat `trap`).
Hijau dasar sebelum dan sesudah seluruh matriks: identik.

| # | Mutasi | Assert yang memerah |
| --- | --- | --- |
| 1 | Lapis statis dilewati di `anGateOpen()` | (a) lapis STATIS mati |
| 2 | Lapis server dilewati di `anGateOpen()` | (a) lapis SERVER mati |
| 3 | `'shadow'` diperlakukan sebagai izin kirim | (a) `shadow` bukan izin mengirim |
| 4 | Timer dipasang walau lapis statis mati | (a) statis mati ⇒ nol timer |
| 5 | Field asing (`debug_note`) disisipkan di pemancar | (c) allowlist pemancar membuang field asing |
| 6 | Skema SERVER digeser (`duration_bucket` dicabut dari `analytics-core.js`) | (b) SEMUA batch diterima server (202) |
| 7 | Tipe sesi tak dikenal diteruskan apa adanya | (b) tipe tak dikenal jatuh ke `practice` |
| 8 | Durasi mentah menggantikan ember | (b) `session_ended` membawa ember durasi |
| 9 | Kunci single-flight dicabut dari `flush()` | (b) NOL batch ganda |
| 10 | Loop allowlist pemancar dicabut | (c) allowlist pemancar membuang field asing |
| 11 | Teks jawaban disisipkan DAN kedua pagar allowlist dijebol (pemancar + sanitizer modul) | Hanya field allowlist yang lolos sanitasi (pagar modul menangkapnya lebih dulu daripada daftar kata terlarang) |
| 12 | Batas panjang string dicabut dari `anFields()` | (c) allowlist membuang string panjang |
| 13 | KEDUA penangkap galat di `anEmit` dicabut sekaligus | (d) NOL `unhandledRejection` |
| 14 | `anSwallow()` dilumpuhkan (janji modul dibiarkan menolak) | (d) NOL `unhandledRejection` |
| 15 | `anMarkActive()` diselipkan ke `record()` | Tepat tiga titik pemanggil (4) |
| 16 | Tanda `/*A1-EMIT*/` dihapus dari satu titik | Setiap titik pemanggil ditandai |
| 17 | Satu titik `session_ended` dihapus | Tepat tiga titik pemanggil (2) |
| 18 | Baris pemanggil menyentuh `q.options` | Titik pemanggil ada di `beginLearningSession` |
| 19 | Kunci HMAC dilepas dari pepper (jadi konstanta) | Token BERUBAH saat pepper berubah |
| 20 | Blok pemancar dihapus dari `app.js` | Blok pemancar ada (penanda BEGIN/END) |
| 21 | `await` disisipkan ke blok pemancar | Blok tidak pernah `await` apa pun |

Dua catatan jujur, karena matriks yang dilaporkan lebih rapi daripada kenyataannya adalah
matriks yang menipu:

- Mutasi #5 dan #11 memerah pada assert allowlist STRUKTURAL, bukan pada assert daftar
  kata terlarang. Itu karena pagar allowlist berdiri lebih dulu di jalurnya: field asing
  tidak pernah sampai ke payload untuk dibaui daftar kata. Daftar kata terlarang tetap
  punya bukti-merahnya sendiri, tapi lewat uji anti-vakum di dalam gerbang
  (`'jawaban: dia menulis kalimat itu'` dan `'{"correctAnswer":2,"selectedAnswer":3}'`
  harus cocok), bukan lewat mutasi berkas. Saya tidak menemukan mutasi satu-baris yang
  menjebol kedua pagar allowlist DAN tetap menghasilkan payload valid; kalau ada, assert
  itu belum punya bukti-merah dari mutasi nyata.
- Mutasi #13 harus mencabut KEDUA penangkap galat di `anEmit` sekaligus. Mencabut hanya
  satu tetap hijau, karena keduanya saling menutupi: galat sinkron di dalam `.then()`
  berubah menjadi penolakan yang ditangkap `.catch()` luar, dan sebaliknya. Itu pertahanan
  berlapis yang memang saya inginkan, tapi konsekuensinya jujur: masing-masing penangkap
  itu sendiri TIDAK punya bukti-merah tunggal.
- Assert `(e)` bekerja pada TEKS `app.js`, bukan pada eksekusi. Ia menangkap pemancar yang
  diselipkan ke tiga fungsi jalur jawaban dan pemanggil keempat mana pun. Ia TIDAK
  menangkap jalan memutar berlapis, misalnya `record()` memanggil helper baru yang
  memanggil `anEmit`. Yang menutup celah itu bukan gerbang ini melainkan keputusan desain
  untuk tidak pernah memancarkan `question_answered` sama sekali.

---

## 9. Verifikasi

Semua exit 0, dijalankan di `wt-a1emit`:

```
tests/analytics-client-test.js        167/167 PASS   (gerbang A1, diperluas)
tests/analytics-privacy-test.js       exit 0
tests/analytics-server-only-test.js   exit 0
tests/analytics-aggregate-test.js     exit 0
tests/no-network-test.js              exit 0
tests/secret-scan-test.js             exit 0
tests/boot-order-test.js              exit 0
tests/install-health-test.js          exit 0
tests/regression-test.js              exit 0
tests/gate-registry-test.js           exit 0
tests/coordination-guard-test.js      exit 0
tests/ui-structure-test.js            exit 0
```

`app.js` lolos `new Function(...)` (sintaks valid). Versi build tidak diubah.

---

## 10. LANGKAH PENYALAAN — untuk kamu, bukan untuk saya

Saya TIDAK menyalakan `cfAnalyticsEnabled` maupun `ANALYTICS_ENABLED`. Hari ini pemancar
terpasang dan diam total. Urutannya penting: nyalakan server DULU, klien BELAKANGAN,
supaya tidak ada jendela di mana klien mengirim ke endpoint yang menjawab
`202 {disabled:true}` dan event pertama hilang tanpa jejak.

1. **Server dulu.** Set `ANALYTICS_ENABLED=on` dan pastikan `ANALYTICS_PEPPER` terpasang di
   Worker. Verifikasi `GET /api/usage/pepper` menjawab `{ok:true, day, pepper}` dan bukan
   `{disabled:true}`. Kalau pepper tidak ada, modul menahan event penyumbang DAU dan tidak
   mengirimnya tanpa token — jadi kamu akan melihat retensi jalan tapi DAU nol. Itu gejala
   pepper, bukan gejala pemancar.
2. **Cek rotasi pepper benar-benar jalan** sebelum pengguna nyata masuk. Kontraknya:
   pepper dirotasi dan pepper lama DIHAPUS. Kalau pepper lama masih tersimpan di mana pun,
   penautan lintas periode berubah dari "mustahil" menjadi "menunggu siapa pun yang punya
   akses ke penyimpanan itu", dan seluruh klaim privasi di §3 gugur. Ini yang harus kamu
   periksa sendiri; gerbang saya hanya bisa membuktikan KLIEN tidak bisa menautkan.
3. **Klien belakangan.** Ubah `core-config.js`: `endpoints.usage` dari `'off'` ke `'on'`.
   Ini rilis berkas statis, jadi ia butuh bump versi build — yang dilarang di paket kerja
   ini, dan sengaja saya tinggalkan untukmu.
4. **Konfirmasi kill switch masih menang.** Dengan `usage:'on'` di klien, matikan
   `cfAnalyticsEnabled` di server dan pastikan permintaan berhenti tanpa reload. Itu jalur
   yang paling mungkin kamu butuhkan dalam keadaan darurat, dan satu-satunya cara tahu ia
   jalan adalah mencobanya sebelum darurat.

### Yang harus diperiksa SETELAH event pertama masuk

- **`retention_daily` day_index 0 naik, `metrics_daily` DAU naik, `usage_daily` terisi.**
  Kalau retensi naik tapi DAU tidak: masalah pepper/token, bukan pemancar.
- **DAU harus ≤ jumlah sesi hari itu, dan `day_active` per hari harus ≈ jumlah perangkat
  unik.** Kalau DAU melonjak mendadak melebihi sesi, curigai duplikasi kirim lagi
  (§6) — assert nol-batch-ganda menjaga satu jalur, bukan setiap jalur.
- **`session_ended.answered` harus konsisten dengan angka yang dilihat murid.** Kalau
  tidak, ambang aktif di dua tempat sudah bergeser dan salah satu angka mulai bohong.
- **Nol baris di tabel analytics yang punya kolom penghubung ke tabel kuota.** Kontraknya
  melarang join itu; `tests/analytics-aggregate-test.js` menjaga skemanya, tapi migrasi berikutnya
  bisa merusaknya.
- **Byte nyata vs perkiraan §5.** Kalau jauh lebih besar, cari flush yang terlalu sering.

---

## 11. Apa yang analytics ini TIDAK bisa jawab — dan mengapa itu pilihan sadar

Ini bukan daftar keterbatasan yang minta maaf. Ini daftar hal yang saya tolak untuk diukur.

- **Berapa ORANG.** DAU di sini adalah perkiraan PERANGKAT, bukan orang. Satu murid dengan
  ponsel dan laptop = 2. Satu ponsel dipakai dua saudara = 1. Ini konsekuensi langsung dari
  `installId` per-perangkat tanpa identitas, dan kontrak privasi memerintahkan konsekuensi
  ini didokumentasikan tanpa dipoles. Jangan pernah menyebut angka ini "jumlah pengguna" di
  dokumen apa pun.
- **Perjalanan satu murid lintas hari.** Justru itu tujuan rotasi pepper. Tidak ada
  funnel per-orang, tidak ada kohort per-orang, tidak ada "murid X berhenti di hari ke-3".
  Retensi hanya tersedia sebagai penghitung agregat per `day_index`.
- **Soal mana yang sulit, skill mana yang macet, di mana murid menyerah.** Nol
  `question_answered`, jadi nol data per-item. Ini yang paling mahal dan paling sengaja
  (§3). Kalau nanti benar-benar dibutuhkan, jawabannya BUKAN memasang pemancar di
  `record()`, melainkan event agregat terpisah yang dihitung aplikasi dari datanya sendiri
  dan tidak pernah memegang objek soal.
- **Durasi belajar yang presisi.** Hanya 4 ember. Durasi presisi adalah pola kehadiran.
- **Geografi, jaringan, model perangkat.** Hanya `android`/`ios`/`desktop`. Nol IP mentah,
  nol User-Agent penuh.
- **Rasio pengguna login vs anonim.** `has_identity` didukung modul, tidak dipakai
  pemancar. Alasannya minimalisme dan tidak ingin menyentuh lapisan identitas.
- **Apa pun yang terjadi sebelum penyalaan.** Analytics ini tidak retroaktif. Nol angka
  historis. Jangan berharap kuota bisa dikalibrasi ulang dari data masa lalu, karena tidak
  ada data masa lalu.

---

## 12. Pernyataan jujur: apa yang BELUM terbukti

Ini bagian yang paling penting untuk dibaca dengan sinis.

**Yang sudah terbukti:** 167 assert hijau, tanpa satu paket jaringan, di harness `vm` yang
menjalankan blok pemancar SUNGGUHAN bersama modul analytics SUNGGUHAN dan membandingkan
payloadnya ke fungsi validasi server SUNGGUHAN. 21 mutasi terbukti memerahkan gerbang.

**Yang BELUM terbukti, dan tidak bisa dibuktikan sampai event nyata masuk:**

1. **Nol event pernah terkirim dari perangkat nyata.** Semua bukti di atas berasal dari
   `vm` dengan `localStorage`, `sendBeacon`, `fetch`, dan `document` yang saya tiru. Mock
   yang salah menghasilkan gerbang yang percaya diri dan salah. Khususnya: `sendBeacon`
   sungguhan di Android punya batas ukuran dan perilaku `pagehide` yang tidak saya tiru.
2. **Pipeline sisi server belum pernah menulis satu baris dari klien nyata.** Saya
   membuktikan `processClientBatch()` mengembalikan 202 untuk payload saya. Saya TIDAK
   membuktikan D1 menerima tulisan itu, rollup jalan, atau dashboard owner menampilkan
   angkanya. Rantai dari 202 sampai angka di layar owner masih belum diuji ujung-ke-ujung.
3. **Rotasi pepper di produksi belum pernah saya lihat.** Klaim "penautan lintas periode
   mustahil" bergantung pada pepper lama benar-benar dihapus di sisi Worker. Gerbang saya
   membuktikan klien menghitung ulang token saat pepper berubah. Ia TIDAK bisa membuktikan
   Worker tidak menyimpan pepper lama. Kalau pepper lama tersimpan, klaim privasi terkuat
   di dokumen ini gugur, dan itu tidak akan terlihat dari sisi klien sama sekali.
4. **Angka yang masuk belum tentu benar, hanya belum terbukti salah.** Bug duplikasi di §6
   adalah contoh persis dari kelas kesalahan yang lolos empat gerbang hijau selama
   berminggu-minggu karena tidak ada yang pernah memanggil kodenya. Sekarang ada yang
   memanggilnya. Anggap angka minggu pertama sebagai tersangka, bukan sebagai data.
5. **Perkiraan byte di §5 adalah badan permintaan, bukan byte nyata di kuota murid.**
   Header HTTP, TLS handshake, dan DNS tidak terhitung. Angka nyata lebih besar, mungkin
   dua kali.
6. **Assert `(e)` adalah pemeriksaan teks.** Lihat catatan kedua di §8. Ia tidak kebal
   terhadap jalan memutar berlapis.

7. **Assert `(d)` bergantung pada waktu.** Deteksi `unhandledRejection` di Node terjadi
   setelah antrean microtask kosong; gerbang menunggunya dengan hitungan `setImmediate`
   yang tetap. Hitungan itu cukup hari ini (stabil 5/5 jalan), tapi ia bukan jaminan
   deterministik. Kalau assert ini flaky lagi di CI, JANGAN naikkan hitungan tunggu — cari
   janji yang tidak ditangkap, karena itu yang terjadi pertama kali (§6).

Sampai poin 1–3 dijawab dengan event nyata, satu-satunya kesimpulan yang jujur adalah:
pemancarnya terpasang, gerbangnya ketat, dan analytics masih belum menghasilkan satu angka
pengguna yang boleh dipakai untuk memutuskan apa pun — termasuk kuota.

---

## Berkas yang diubah

| Berkas | Δ |
| --- | --- |
| `app.js` | +184 (blok pemancar + `anSwallow` + 3 titik pemanggil) |
| `tests/analytics-client-test.js` | 635 → 984 (§10 diganti, +8 skenario kegagalan) |
| `features/analytics/fiezel-analytics-client.js` | +19 (kunci single-flight `flush()`) |
| `reports/work-a1-analytics-emitter.md` | baru |
| `tools/_a1_redproof.sh` | baru (skrip matriks bukti-merah) |

Tidak diubah: `core-config.js`, `index.html`, `sw.js`, `.github/workflows/quality.yml`
(gerbang sudah terdaftar di baris 117), seluruh direktori terlarang.
