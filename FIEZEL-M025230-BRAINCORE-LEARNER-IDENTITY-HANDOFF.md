# Handoff m025-230 — Bukti belajar Braincore PER-MURID (SLOT 9)

**Kewenangan: OWNER.** Dikerjakan dari permintaan "Implement Non-Anonymous Individual
Braincore Learner Evidence": Owner harus bisa membuka SATU murid dan melihat bukti
Braincore-nya, sementara lane agregat yang anonim tetap berjalan berdampingan. Dokumen ini
mencatat apa yang berubah, apa yang **sengaja tidak** diubah, apa yang **belum**
diverifikasi, dan langkah berikutnya — supaya sesi berikutnya tidak menebak.

## Status

**KODE SELESAI. DUA SAKELAR SUDAH DINYALAKAN DI KODE (m025-234), DUA LANGKAH INFRASTRUKTUR
MASIH MENUNGGU OWNER. PRODUKSI BELUM DIVERIFIKASI.**

- Rantai penuh (murid → identitas → Braincore → bukti → D1 → API owner → Owner Dashboard)
  terpasang dan terbukti lewat gerbang `braincore-learner-identity-test.js` (177 assert,
  Worker penuh + D1 palsu), termasuk nama murid dari perkenalan (§3).
- **m025-234 menyalakan langkah 2 dan 4** dari §7: `FEATURE_LEARNER_EVIDENCE="on"` dan klien
  `identityEvidence.mode:'on'`. **Rilis ini TIDAK boleh mendarat sebelum langkah 1 dan 3
  dijalankan** — lihat peringatan urutan di §7.
- Lane tetap menulis **nol baris** sampai langkah 1 dan 3 selesai: tanpa migrasi 0009/0010
  tabelnya tidak ada, dan tanpa KV `cfg:flags` gerbangnya fail-closed menolak. Di atas itu
  semua, tiap murid tetap harus memberi persetujuannya sendiri (langkah 5).
- **NOT VERIFIED di produksi.** Migrasi `0009_learner_evidence.sql` dan
  `0010_learner_name.sql` belum dijalankan
  (token CI tidak bisa `wrangler d1 execute --remote`), jadi belum ada satu baris pun yang
  benar-benar ditulis atau dibaca di Cloudflare. Semua klaim di bawah **SOURCE VERIFIED**.

Urutan aktivasi ada di §7 dan wajib dijalankan berurutan.

## Sentuhan pada `features/neural-voice/`

**Hanya nomor build** (`DIAG_BUILD` m025-229 → **m025-231**; angka 230 diambil `main`
untuk sapu bersih bank soal Thai (#307) di menit yang sama, jadi cabang ini menaikkannya lagi
lewat `tools/bump-build.mjs` — persis prosedur yang dijanjikan `coordination/BUILD-VERSION.json`). **Nol baris logika suara neural
berubah.** Bump-nya wajib, bukan kosmetik: `app.js`, `core-config.js`, dan tiga berkas
`features/telemetry/` ikut ter-precache shell service worker. Tanpa `SW_REV` naik, PWA yang
sudah terpasang tetap menyajikan Lane D versi lama — dan sakelar persetujuan di Pengaturan
tidak akan pernah muncul di perangkat murid.

(Berkas ini juga menjawab gerbang **A13 Handoff Keeper**, yang memerah pada dorongan
pertama karena `features/neural-voice/` tersentuh tanpa handoff. Gerbangnya benar dan
tidak dilemahkan: yang dilakukan adalah menulis handoff-nya, bukan mengubah pemicunya.)

## 1. Keputusan arsitektur, dan alasannya

### Lane KEEMPAT, bukan perubahan pada lane agregat

`fiezel-evidence` (`evidence_daily` / `evidence_dedup` / `evidence_learner_day`) **tidak
disentuh satu baris pun**. Seluruh kontrak `0008_evidence.sql` bergantung pada satu-satunya
pengenal di sana berupa `cohort` 16-hex acak ber-TTL 14 hari. Menambahkan `sub` ke database
itu membatalkan anonimitas lane agregat untuk **semua** murid dalam satu kolom — termasuk
murid yang tidak menyetujui apa pun.

Maka lane per-murid dibangun di **`fiezel-core`**, tempat `identity` dan `social_profile`
sudah tinggal. Tiga tabel baru (`0009_learner_evidence.sql`):

| Tabel | Isi | Kunci |
|---|---|---|
| `learner_evidence` | satu baris per event bukti/keputusan | `(sub, event_id)` |
| `learner_evidence_state` | keadaan ringkas + penghitung, satu baris per murid | `sub` |
| `learner_evidence_consent` | persetujuan + versi teksnya | `sub` |

### Kenapa `learner_evidence_state` ada

Bukan denormalisasi demi kecepatan. Direktori owner harus bisa menjawab "siapa saja yang
ada" **tanpa** memindai baris bukti seluruh murid — membangun daftar nama dengan memindai
riwayat belajar semua orang adalah cara termurah membuat satu halaman dashboard membaca
segalanya sekaligus.

### Nol kunci bersama antar-lane

`toIdentityEvent()` (`features/telemetry/fiezel-braincore-evidence.js`) **membuang `cohort`**
dan **menerbitkan `eventId` BARU**. Kalau `eventId` dipakai bersama, `evidence_dedup.event_id`
(database agregat) bisa dicocokkan baris-per-baris dengan `learner_evidence.event_id`
(database inti) — dan lane anonim berhenti anonim tanpa satu kolom pun ditambahkan.
Fungsinya menolak `eventId` yang sama dengan lane agregat, dan gerbang meng-assert itu.

Cacat sejenis yang ditemukan saat membaca ulang klaim komentar sendiri, dan sudah ditutup:
`braincoreEvidenceCohortForBuild()`. Sebelumnya pembangun event memanggil
`braincoreEvidenceCohort()` yang **menulis** cohort berotasi ke localStorage — jadi
menyalakan Lane D saat lane agregat mati diam-diam menyalakan pengenal lane anonim untuk
nilai yang tidak akan pernah dikirim. Sekarang: lane agregat hidup → cohort sungguhan
(persisten, berotasi, perilaku lama persis); lane agregat mati → 16 hex sekali pakai yang
tidak pernah disimpan.

## 2. Identitas: server yang menentukan, bukan klien

```
POST /api/auth/anon  →  identity.sub (crypto.randomUUID, mw-identity.js:174)
        ↓ cookie fz_id (HttpOnly, HMAC — kode klien tidak bisa membacanya)
Lane D klien  →  toIdentityEvent(): buang cohort, eventId baru
        ↓ POST /api/braincore/learner-evidence  (credentials:'include')
server: sub = ctx.identity.sub          ← BUKAN dari body
        ↓ learner_evidence(sub, …) + learner_evidence_state(sub, …)
```

`allowedTop` event = `['eventId','type','payload']`. Body yang menitipkan
`sub`/`userId`/`cohort` ditolak **400 `foreign_field`** — bukan diabaikan. Perbedaan itu
penting: field yang diabaikan hari ini adalah field yang dibaca kode baru besok.

## 3. Nama murid — nama perkenalan, dikirim ke server

**Diputuskan OWNER 2 Sep 2026, sesudah versi pertama handoff ini.** Versi pertama melaporkan
bahwa nama hanya bisa datang dari `social_profile`, dan bahwa sebagian besar murid akan
muncul tanpa nama. Owner menolak konsekuensi itu, jadi jalurnya diubah:

Nama panggilan yang **wajib** diisi murid di langkah pertama perkenalan sekarang **dikirim
ke server** dan disimpan di `learner_name(sub, name, name_day, updated_at)`
(`0010_learner_name.sql`).

- Langkah nama di perkenalan **sudah** wajib sebelum perubahan ini — `topbar(false, false)`
  (tanpa Kembali, tanpa Lewati), tombol lanjut mati sampai nama diisi, dan jalur Enter pada
  papan ketik ikut dijaga. **Tidak ada alur baru yang dibuat**; yang ditambahkan hanya
  pengiriman ke server.
- **Tabel sendiri, bukan kolom di `identity`.** `0001_identity.sql` melarang nama masuk ke
  sana, dan larangan itu punya alasan operasional yang masih berlaku (tabel jalur-panas,
  jarang berubah). Nama boleh berubah kapan saja; `sub` tidak.
- **Mengganti nama tidak memutus bukti** — yang mengikat bukti adalah `sub`, dan `sub` tidak
  ikut berubah. Gerbang membuktikannya: hitungan bukti sama, direktori tidak memunculkan
  murid kedua.
- **Urutan nama di dashboard:** `learner_name` → `social_profile.display_name` → `.handle` →
  tidak ada. Tiga terakhir cadangan untuk murid lama. Baris `murid <8 hex sub>` sekarang
  adalah keadaan **legacy/galat**, bukan perilaku normal untuk murid baru.
- **Naskah privasi langkah nama diperbarui (id + th).** Naskah lama berjanji "Nggak dibagi ke
  siapa pun" — janji yang menjadi tidak benar begitu nama sampai ke server dan terlihat
  Owner. Ini bukan detail kosmetik: janji privasi yang tidak diperbarui bersama kodenya
  adalah kebohongan yang ditandatangani murid.
- **Rem tulis:** klien menyegarkan nama maksimum sekali sehari; perubahan nama didorong
  segera (`force`). Penyegaran itu juga penanda "masih dipakai" untuk retensi 180 hari.
- **Pencabutan persetujuan bukti tidak menghapus nama** (dua data, dua alasan). Penghapusan
  atas permintaan ada di `docs/D1-RETENTION.md` §4.

## 4. Persetujuan & retensi

> **DIGANTIKAN m025-236.** Dua butir pertama di bawah ini **sudah tidak berlaku**: gerbang
> persetujuan dihapus atas keputusan OWNER, dan murid yang memasang FIEZEL langsung
> tersinkron. Alasan, konsekuensi, dan pagar yang tetap berdiri ada di
> `FIEZEL-M025236-LEARNER-EVIDENCE-OTOMATIS-HANDOFF.md`. Butir retensi di bawah tetap benar.

- ~~Tanpa baris aktif di `learner_evidence_consent` (dengan `policy` =
  `learner-evidence-consent-v1`): **403 `consent_required`, NOL baris**.~~
- ~~Sakelarnya di Pengaturan (`preferences.learnerEvidenceConsent`), bawaan `false`,
  fail-closed di klien **dan** server.~~
- **Penghapusan atas permintaan tetap ada.** `revokeConsent()` menghapus baris bukti murid
  itu, bukan menandainya, dan barisnya hilang dari direktori Owner — sekarang lewat
  `window.forgetLearnerEvidence()`, bukan sakelar.
- **Retensi 180 hari** (`LEARNER_EVIDENCE_LIMITS.RETENTION_DAYS`) — bukan 14 hari seperti
  lane agregat, bukan pula tak terbatas. Purge **sudah terpasang** di cron 00:05 WIB lewat
  `runLearnerEvidencePurge()` (`route-wiring.js`), berdiri di luar `withCronRun` rollup
  supaya kegagalan purge tidak menandai rollup gagal. Dokumen: `docs/D1-RETENTION.md` §2.7,
  `BRAIN-DATA-PRIVACY.md` §7b.

## 5. Owner Dashboard — satu, bukan dua

Panel "Murid per orang" ditempel ke dashboard yang **sudah ada**, di bawah panel Braincore
agregat. Pemilihan murid adalah tautan biasa `/?period=…&learner=<sub>` pada rute `/`.

Konsekuensinya disengaja: `OWNER_ROUTES` **tidak berubah**, allowlist proxy
`deploy/edge/owner-index.php` **tidak berubah**, dan Worker owner tetap **nol binding
`fiezel-core`** (butir (g-g) `owner-edge-guard-test.js` tetap hijau, 1117/1117). Data dibaca
lewat subrequest owner-gated ke Worker `fiezel-api`, pola `readEvidence` yang sudah ada,
memakai `EVIDENCE_API_TOKEN` yang sudah ada — **nol Secret baru**.

Yang **tidak** dicetak: "68% → 78%". Yang meninggalkan perangkat adalah bucket, jadi yang
ditampilkan `m60-80 → m80-100` plus kalibrasi dalam persen (punya penyebut nyata).
Distribusi kosong dicetak "belum ada pengukuran", bukan "0" — pola kejujuran yang sama
dengan panel agregat.

## 6. Gerbang

`braincore-learner-identity-test.js` — **177/177**, terdaftar di `quality.yml`. Ia
membangkitkan Worker penuh dengan D1 palsu dan membuktikan dua murid nyata: kepemilikan
terpisah, isolasi lintas-murid (cookie murid → 403 di rute owner, dengan atau tanpa `?sub=`
orang lain), spoofing `sub` → 400 tanpa satu baris pun tertulis untuk korban, idempotensi
replay, direktori + pilih murid, nama dari `social_profile`, pencabutan menghapus,
fail-closed tiga sakelar, lane agregat utuh, render HTML dashboard, dan seluruh rantai nama
(§3): nama wajib di perkenalan, normalisasi klien == server yang diadu langsung, spoof nama
orang lain ditolak, ganti nama tidak memutus bukti, dan naskah privasi yang sudah benar.

Regresi yang ikut diperiksa dan hijau: `braincore-evidence`, `d1-schema-contract` (41/41),
`cf-wiring`, `cf-api-contract`, `config-consistency`, `owner-dashboard`, `owner-edge-guard`
(1117/1117), `social-api-contract`, `social-schema-contract`, `app-telemetry-wiring`,
`brain-sync-failclosed`, `install-health`, `pwa-release-coherence`,
`build-number-uniqueness`, `cf-config-killswitch`, `analytics-privacy`,
`analytics-server-only`, `learning-lane`, `braincore-purity`.

### Tiga cacat yang ditemukan gerbang penuh sesudah dorongan pertama

Suite lengkap (229 gerbang `quality.yml`) dijalankan sesudah dorongan pertama dan
menemukan tiga hal yang gerbang terpilih belum melihatnya:

1. **`q.clear` tidak pernah ada.** `setLearnerEvidenceConsent()` memanggil
   `q.clear&&q.clear()` untuk mengosongkan antrean saat persetujuan dicabut — tetapi
   `makeQueue()` (`features/telemetry/fiezel-learning-queue.js`) mengembalikan
   `{put, peekBatch, ack, purge, stats, limits}`. Tidak ada `clear`. Panggilannya diam-diam
   tidak melakukan apa pun, jadi janji "cabut = tidak ada sisa yang terkirim" hanya benar
   di komentar: event yang sudah antre tetap terkirim begitu murid menyalakan
   persetujuannya lagi. Sekarang `purge()`. Gerbangnya ikut diperbaiki: versi pertamanya
   meng-assert TEKS `q.clear` dan karena itu LULUS pada kode yang tidak bekerja — sekarang
   nama metodenya diadu langsung ke daftar yang benar-benar dikembalikan `makeQueue()`.
2. **Reset progres melewatkan dua kunci lane D** (`reset-side-state-test.js` merah).
   `IDENTITY_EVIDENCE_ATTEMPT_KEY` dan `LEARNER_NAME_SYNC_KEY` ditulis app.js tetapi tidak
   ikut dihapus. Karena event lane D terikat `sub` yang TIDAK berubah saat reset, sisa
   antrean dari sebelum reset akan mendarat di Owner Dashboard sesudahnya sebagai bukti
   murid yang sama. Keduanya sekarang dihapus, antrean lane D ikut di-`purge()` seperti
   lane C, dan keduanya masuk daftar kontrak gerbang supaya tidak bisa hilang lagi.
3. **Tabrakan nomor build dengan `main`.** Sesudah perbaikan di butir 4, `main` memakai
   m025-230 untuk #307. Cabang ini karena itu naik lagi ke **m025-231** lewat
   `tools/bump-build.mjs` (keempat tempat sekaligus), dan `defaultPreferences` digabung
   dua sisi: `learnerLocaleExplicit`/`localeAutoDetected` (GEO-IP dari main) DAN
   `learnerEvidenceConsent` (SLOT 9). Memilih salah satu sisi akan menghapus bawaan milik
   sisi lain tanpa satu gerbang pun merah.
4. **Gerbang OWNER_ROUTES membekukan BENTUK, bukan klaimnya.** `(E) NOL rute owner baru`
   meng-assert literal satu baris `const OWNER_ROUTES = [...];`. Ia hijau lokal dan MERAH di
   CI — bukan karena lane per-murid menambah rute, melainkan karena ekspor CSV owner
   (m025-229, sudah di `main`) memperpanjang inventaris itu dan memecahnya ke beberapa baris.
   Gerbangnya sekarang memeriksa klaimnya: enam rute dasar masih ada dan TIDAK ADA satu pun
   entri rute yang menyebut `learner`. `main` ikut di-merge ke cabang ini supaya yang
   dijalankan lokal sama dengan yang dijalankan CI (CI menguji hasil merge, bukan HEAD PR).
5. **`coordination/BUILD-VERSION.json` tertinggal di m025-229** sementara tiga penanda
   build sudah m025-230 (`coordination-guard-test.js` merah). Sumber tunggal nomor build
   disamakan; tiga penanda tidak diutak-atik.

`id-golden-baseline.json` di-regenerate di commit yang sama, dan itu WAJIB dibaca sebagai
bagian dari cacat #2: lexer `id-golden-snapshot-test.js` membaca blok komentar di sekitar
`resetProgress()` sebagai satu literal panjang, jadi menambah dua nama kunci ke daftar
`removeItem` mengubah satu "literal" itu. Delta baselinenya persis satu entri, isinya
komentar + daftar kunci — **nol kata yang dibaca murid berubah**, dan jumlah literal tetap
2.146.

Dua gerbang yang **diubah dengan sadar**, dan alasannya ditulis di tempatnya:

1. `config-consistency-test.js` — hitungan flag 7→8 dan kill switch 5→6. Gerbang itu memang
   dirancang supaya penambahan flag tidak bisa lewat tanpa dilihat orang.
2. `brain-sync-failclosed-test.js` — jangkar racunnya (`brainSync:false}`) sudah tidak ada
   di `app.js` sejak `learnerEvidenceConsent:false` berdiri di belakangnya. Gerbang itu
   **memerah dengan benar**; jangkarnya digeser ke `brainSync:false,`, yang tetap
   satu-satunya tempat bawaan itu ditulis, jadi bukti "detektor bisa merah" tidak berkurang.

## 7. Langkah berikut (urutan wajib, dijalankan OWNER)

1. `wrangler d1 execute fiezel-core --remote --file=migrations/0009_learner_evidence.sql`
   **dan** `wrangler d1 execute fiezel-core --remote --file=migrations/0010_learner_name.sql`
2. ~~`FEATURE_LEARNER_EVIDENCE = "on"` di `workers/api/wrangler.toml`~~ **SUDAH di kode
   (m025-234)** — tinggal deploy Worker api sesudah langkah 1.
3. KV `cfg:flags`: `enabled.learnerEvidence = true` **dan**
   `flags.cfLearnerEvidenceEnabled = true`.
4. ~~`identityEvidence.mode = 'on'` di `features/telemetry/fiezel-telemetry-config.js` + bump
   build~~ **SUDAH di kode (m025-233 → m025-234)** — tinggal rilis sesudah langkah 1 dan 3.

**URUTAN ITU BUKAN FORMALITAS.** Kalau rilis m025-234 mendarat sebelum langkah 1/3: setiap
perangkat murid memanggil endpoint yang menjawab 403 `learner_evidence_disabled` (fail-closed,
jadi tidak ada data yang bocor dan tidak ada pelajaran yang terganggu), TETAPI sakelar
persetujuan sudah muncul di Pengaturan. Murid yang menyalakannya akan melihat sakelarnya
menyala di perangkatnya sementara server menolak mencatatnya — persetujuan yang tampak
diterima padahal tidak. Itu sebabnya langkah 1 dan 3 dulu, rilis belakangan.
5. Murid menyalakan persetujuan di Pengaturan → Bukti belajar per murid.

Selama satu langkah pun belum dilakukan, lane ini menulis **nol baris**. Verifikasi produksi
(§Status) baru bisa diklaim setelah langkah 1–3 dan satu batch nyata mendarat.

## 8. Utang terbuka yang diketahui

- **Kegagalan `runLearnerEvidencePurge` tidak muncul di `/api/owner/cron-status`** — batas
  yang persis sama dengan `runEvidencePurge` yang sudah ada, dan diwarisi dengan sadar,
  bukan ditemukan belakangan.
- **Murid yang mendaftar SEBELUM aktivasi tidak punya baris `learner_name`** sampai mereka
  membuka aplikasi lagi (penyegaran harian mengirimkannya). Sampai saat itu mereka jatuh ke
  nama profil sosial, atau ke `murid <8 hex>`. Ini keadaan transisi yang hilang sendiri,
  bukan keadaan tetap.
- **Direktori dibatasi 200 murid per halaman** (`DIRECTORY_MAX`) tanpa paginasi. Cukup untuk
  populasi hari ini; menambah paginasi adalah pekerjaan berikutnya kalau angkanya terlampaui,
  bukan sekarang.
- **Belum ada jalur Owner untuk menghapus bukti satu murid dari sisi dashboard.** Hari ini
  penghapusan hanya lewat pencabutan persetujuan oleh murid itu sendiri, atau purge retensi.
