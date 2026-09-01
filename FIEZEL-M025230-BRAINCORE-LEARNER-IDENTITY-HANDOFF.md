# Handoff m025-230 — Bukti belajar Braincore PER-MURID (SLOT 9)

**Kewenangan: OWNER.** Dikerjakan dari permintaan "Implement Non-Anonymous Individual
Braincore Learner Evidence": Owner harus bisa membuka SATU murid dan melihat bukti
Braincore-nya, sementara lane agregat yang anonim tetap berjalan berdampingan. Dokumen ini
mencatat apa yang berubah, apa yang **sengaja tidak** diubah, apa yang **belum**
diverifikasi, dan langkah berikutnya — supaya sesi berikutnya tidak menebak.

## Status

**KODE SELESAI, LANE MASIH MATI, PRODUKSI BELUM DIVERIFIKASI.**

- Rantai penuh (murid → identitas → Braincore → bukti → D1 → API owner → Owner Dashboard)
  terpasang dan terbukti lewat gerbang `braincore-learner-identity-test.js` (120 assert,
  Worker penuh + D1 palsu).
- Lane **lahir mati**: `FEATURE_LEARNER_EVIDENCE="off"`, KV belum ditulis, klien
  `identityEvidence.mode:'off'`, dan tiap murid tetap harus memberi persetujuannya sendiri.
- **NOT VERIFIED di produksi.** Migrasi `0009_learner_evidence.sql` belum dijalankan
  (token CI tidak bisa `wrangler d1 execute --remote`), jadi belum ada satu baris pun yang
  benar-benar ditulis atau dibaca di Cloudflare. Semua klaim di bawah **SOURCE VERIFIED**.

Urutan aktivasi ada di §7 dan wajib dijalankan berurutan.

## Sentuhan pada `features/neural-voice/`

**Hanya nomor build** (`DIAG_BUILD` m025-229 → m025-230). **Nol baris logika suara neural
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

## 3. Nama murid — batas yang harus diketahui sesi berikutnya

Nama untuk dashboard dibaca dari **`social_profile.display_name` / `.handle`** lewat `sub`,
dan **tidak disalin** ke lane ini. Satu sumber nama.

**`state.userName` (nama perkenalan) TIDAK dipakai, dan itu keputusan, bukan kelalaian.**
Nama itu hidup di `localStorage` perangkat (`app.js` `setLearnerName`) dan tidak pernah
sampai ke server sama sekali — memperlakukannya sebagai otoritatif berarti mengarang. Murid
tanpa profil sosial karena itu tampil sebagai `murid <8 hex sub>` di dashboard, bukan
disembunyikan: menyembunyikan yang tak bernama akan membuat Owner mengira murid itu tidak ada.

Konsekuensi praktis yang perlu diputuskan Owner: **selama lapisan sosial belum dipakai luas,
sebagian besar murid akan muncul tanpa nama.** Kalau itu tidak bisa diterima, jalur yang
paling kecil adalah membuat pembuatan profil sosial menjadi bagian dari perkenalan — bukan
menambah tabel nama kedua di lane ini.

## 4. Persetujuan & retensi

- Tanpa baris aktif di `learner_evidence_consent` (dengan `policy` =
  `learner-evidence-consent-v1`): **403 `consent_required`, NOL baris**.
- Sakelarnya di Pengaturan (`preferences.learnerEvidenceConsent`), bawaan `false`,
  fail-closed di klien **dan** server. Panel-nya tidak dirender sama sekali selama
  `identityEvidence.mode === 'off'`: menawarkan persetujuan untuk sesuatu yang tidak bisa
  menyala hanya melatih orang menyetujui hal yang tidak ia pahami.
- **Mencabut = menghapus.** `revokeConsent()` menghapus baris bukti murid itu, bukan
  menandainya, dan barisnya hilang dari direktori Owner.
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

`braincore-learner-identity-test.js` — **120/120**, terdaftar di `quality.yml`. Ia
membangkitkan Worker penuh dengan D1 palsu dan membuktikan dua murid nyata: kepemilikan
terpisah, isolasi lintas-murid (cookie murid → 403 di rute owner, dengan atau tanpa `?sub=`
orang lain), spoofing `sub` → 400 tanpa satu baris pun tertulis untuk korban, idempotensi
replay, direktori + pilih murid, nama dari `social_profile`, pencabutan menghapus,
fail-closed tiga sakelar, lane agregat utuh, dan render HTML dashboard.

Regresi yang ikut diperiksa dan hijau: `braincore-evidence`, `d1-schema-contract` (41/41),
`cf-wiring`, `cf-api-contract`, `config-consistency`, `owner-dashboard`, `owner-edge-guard`
(1117/1117), `social-api-contract`, `social-schema-contract`, `app-telemetry-wiring`,
`brain-sync-failclosed`, `install-health`, `pwa-release-coherence`,
`build-number-uniqueness`, `cf-config-killswitch`, `analytics-privacy`,
`analytics-server-only`, `learning-lane`, `braincore-purity`.

Dua gerbang yang **diubah dengan sadar**, dan alasannya ditulis di tempatnya:

1. `config-consistency-test.js` — hitungan flag 7→8 dan kill switch 5→6. Gerbang itu memang
   dirancang supaya penambahan flag tidak bisa lewat tanpa dilihat orang.
2. `brain-sync-failclosed-test.js` — jangkar racunnya (`brainSync:false}`) sudah tidak ada
   di `app.js` sejak `learnerEvidenceConsent:false` berdiri di belakangnya. Gerbang itu
   **memerah dengan benar**; jangkarnya digeser ke `brainSync:false,`, yang tetap
   satu-satunya tempat bawaan itu ditulis, jadi bukti "detektor bisa merah" tidak berkurang.

## 7. Langkah berikut (urutan wajib, dijalankan OWNER)

1. `wrangler d1 execute fiezel-core --remote --file=migrations/0009_learner_evidence.sql`
2. `FEATURE_LEARNER_EVIDENCE = "on"` di `workers/api/wrangler.toml`, lalu deploy Worker api.
3. KV `cfg:flags`: `enabled.learnerEvidence = true` **dan**
   `flags.cfLearnerEvidenceEnabled = true`.
4. `identityEvidence.mode = 'on'` di `features/telemetry/fiezel-telemetry-config.js`, lalu
   bump build (m025-230 → m025-231) dan rilis.
5. Murid menyalakan persetujuan di Pengaturan → Bukti belajar per murid.

Selama satu langkah pun belum dilakukan, lane ini menulis **nol baris**. Verifikasi produksi
(§Status) baru bisa diklaim setelah langkah 1–3 dan satu batch nyata mendarat.

## 8. Utang terbuka yang diketahui

- **Kegagalan `runLearnerEvidencePurge` tidak muncul di `/api/owner/cron-status`** — batas
  yang persis sama dengan `runEvidencePurge` yang sudah ada, dan diwarisi dengan sadar,
  bukan ditemukan belakangan.
- **Nama murid hanya ada untuk yang punya `social_profile`** (lihat §3). Keputusan produk,
  bukan bug.
- **Direktori dibatasi 200 murid per halaman** (`DIRECTORY_MAX`) tanpa paginasi. Cukup untuk
  populasi hari ini; menambah paginasi adalah pekerjaan berikutnya kalau angkanya terlampaui,
  bukan sekarang.
- **Belum ada jalur Owner untuk menghapus bukti satu murid dari sisi dashboard.** Hari ini
  penghapusan hanya lewat pencabutan persetujuan oleh murid itu sendiri, atau purge retensi.
