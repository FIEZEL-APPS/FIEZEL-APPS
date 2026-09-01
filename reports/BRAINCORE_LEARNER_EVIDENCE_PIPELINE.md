# Braincore Learner Evidence Pipeline

Status: **BELUM production-ready.** Alur end-to-end belum pernah dijalankan sungguhan
(database `fiezel-evidence` belum dibuat, `database_id` masih placeholder, dan kedua
kill switch masih `off`). Yang sudah ada adalah seluruh jalur kode + gerbangnya, dan
dokumen ini menyebutkan dengan tepat apa yang bisa dan belum bisa diuji.

Alur yang dituju:

```
Learner -> FIEZEL (app.js) -> Braincore -> bounded evidence -> antrean offline (IndexedDB)
        -> batch upload -> D1 fiezel-evidence -> agregasi harian -> Owner Dashboard
```

---

## 1. Audit kode yang sudah ada (titik awal)

| Yang ditelusuri | Tempatnya | Temuan |
| --- | --- | --- |
| `fiezel-learner-evidence-v1` | `app.js:1897` `buildLearnerEvidenceModel()`, `app.js:1925` `remoteLearnerEvidenceSnapshot()` | Model bukti belajar LENGKAP sudah dihitung di perangkat, termasuk `learner: learnerName()` (NAMA MURID), `medianResponseMs`, `preferredStudyWindow`, dan daftar `skills.weakest` dengan nama skill mentah. Versi `remote*` sudah membuang nama, tetapi masih memuat angka mentah. |
| Ke mana bukti itu dikirim hari ini | `fiezel-core-worker.js:213` `boundedEvidence()`, dipanggil dari `boundedActivity()` di `POST /api/activity` | Worker Puter menyimpannya sebagai bagian dari record aktivitas PER-AKUN, bersama `learnerName`. Itu penyimpanan pribadi murid, bukan bahan analisis lintas-murid, dan TIDAK bisa dipakai Owner Dashboard tanpa membaca identitas. **Jalur ini tidak diubah.** |
| Attempt record | `features/brain/fiezel-attempt-record.js`, cermin allowlist di `fiezel-core-worker.js` (`ATTEMPT_ALLOWED`) | Per-percobaan, per-akun. Bukan satuan yang bisa diagregasi lintas murid tanpa identitas. Tidak diubah. |
| State Braincore | `features/brain/fiezel-core-brain.js` + `fiezel-mastery-bkt.js`, `fiezel-misconception-ledger.js`, `fiezel-item-calibration.js`, `fiezel-policy-verdict.js`; ringkasan di `app.js` `coreBrainDigest()`, `evaluatePolicyOutcome()` | Semua hidup di `localStorage` perangkat. **Tidak disentuh sama sekali** — Personal Brain tetap local-first. |
| Lane telemetri yang sudah ada | `workers/api/analytics/*` (DB `fiezel-stats`) dan `workers/api/learning/*` (DB `fiezel-learning`) | Dua lane yang menjawab pertanyaan berbeda (kehadiran perangkat; hasil satu jawaban). Keduanya utuh, tidak satu baris pun diubah selain penambahan pendaftaran rute lane baru. |
| Antrean + transport klien | `features/telemetry/fiezel-learning-queue.js`, `fiezel-learning-transport.js` | Sudah generik (persist-sebelum-upload, ack-sebelum-hapus, backoff+jitter seeded, Retry-After). **Dipakai ulang**, bukan disalin. |
| Owner Dashboard | Worker `fiezel-owner` — `workers/owner/index.js` (render HTML + rute JSON), `workers/owner/queries.js` (SQL agregat), host `owner.fiezel.my.id` | Satu dashboard, sesi cookie ber-HMAC, binding D1 TEPAT SATU (`ANALYTICS`). Bukti Braincore **diintegrasikan ke dashboard ini**, bukan ke halaman baru. |

Dua kesimpulan yang menentukan desain:

1. Bukti yang sudah dihitung perangkat **terlalu kaya** untuk dikirim apa adanya — ia
   memuat nama dan angka kontinu. Yang dikirim harus proyeksi berbucket.
2. Owner Dashboard butuh **jumlah murid**, dan itu mustahil dari penghitung event.
   Maka lane ini punya satu pengenal — dan pengenal itu harus dibatasi keras.

---

## 2. Data dibuat di file/fungsi mana

| Langkah | Berkas · fungsi |
| --- | --- |
| Keadaan belajar dihitung (sudah ada) | `app.js` `remoteLearnerEvidenceSnapshot()`, `recentPolicyOutcomes()`, `evaluatePolicyOutcome()` |
| Proyeksi ke bucket berenum tertutup | `features/telemetry/fiezel-braincore-evidence.js` — `fromSnapshot()`, `buildLearnerEvidenceEvent()`, `buildDecisionEvent()`, `bucket*()` |
| Pengenal murid | `features/telemetry/fiezel-braincore-evidence.js` `cohortState()` + `app.js` `braincoreEvidenceCohort()` |
| Emisi | `app.js` `braincoreEvidenceEmitSnapshot()` (maks 1×/hari), `braincoreEvidenceEmitDecision()` (1 per sesi selesai), keduanya lewat `braincoreEvidenceObserveSession()` yang dipanggil di dua jalur akhir sesi (`app.js:1418` dan `app.js:8795`) |
| Saklar | `features/telemetry/fiezel-telemetry-config.js` `CONFIG.evidence` (`mode:'off'`, `endpoint:''`) — **terpisah** dari saklar lane learning |

Yang dikirim (dua tipe event, seluruhnya enum tertutup):

- `learner_evidence`: `level`, `masteryBucket`, `masteryTrend`, `misconceptionBucket`,
  `misconceptionSkill` (famili, opsional), `difficultyCalibration`,
  `calibrationErrorBucket`, `consistencyBucket`, `retentionRiskBucket`,
  `evidenceVolumeBucket`, `improvementTrend`.
- `braincore_decision`: `level`, `policyId`, `decision`, `outcome`, `recommendation`,
  `masteryDeltaBucket`, `adherenceBucket`.

Yang **tidak pernah** keluar perangkat: nama murid, jawaban, riwayat, seluruh isi
`localStorage`, `medianResponseMs`, `preferredStudyWindow`, `streakDays`,
`todayAttempts`, nama skill mentah (`present_perfect` menjadi famili `tense-perfect`),
dan timestamp presisi apa pun. Satu-satunya waktu adalah `day` (YYYY-MM-DD) di amplop.

---

## 3. Data disimpan lokal di mana

| Apa | Tempat |
| --- | --- |
| Antrean event | IndexedDB `fiezel-braincore-evidence-v1`, object store `events` (`app.js` `braincoreEvidenceDb()` / `braincoreEvidenceIdb()`) — **database berbeda** dari antrean lane learning, supaya `ack()` satu lane tidak pernah menghapus event lane lain |
| Cohort | `localStorage['fiezel-ev-cohort-v1']` = `{cohort, epoch}` |
| Penanda emisi terakhir | `localStorage['fiezel-ev-last-v1']` |
| Hitungan gagal beruntun (backoff) | `localStorage['fiezel-ev-attempt-v1']` |

State belajar (`fiezel-v4-state` dkk.) **tidak disentuh**. Antrean memakai
`FiezelLearningQueue.makeQueue` yang sudah ada: plafon 2000 event / 2 MB / 45 hari,
drop-oldest, persist-sebelum-upload, hapus HANYA lewat `ack()`.

**Offline:** Braincore berfungsi penuh tanpa jaringan — tidak satu pun keputusan
belajar menunggu upload. Event ditulis ke antrean lebih dulu; tanpa `fetch`,
`flush()` mengembalikan `no_fetch` dan tidak menghapus apa pun.

---

## 4. Data dikirim melalui endpoint mana

`POST /api/braincore/evidence` di Worker `fiezel-api`
(`workers/api/evidence/route-evidence.js` `handleEvidenceEvents`).

Amplop: `{schema:'fiezel-braincore-evidence-v1', batchId:<uuid v4>, day:'YYYY-MM-DD', events:[...]}`
— dibentuk `FiezelLearningTransport.flush()` dengan opsi baru `batchSchema` / `day` /
`batchIdFn` (satu implementasi batch+backoff dipakai dua lane; default lane learning
tidak berubah).

Pagar di jalur ini:

- `EVIDENCE_ENABLED` default `off` → 202 `{disabled:true}`, nol tulis (bukan 404, yang
  akan membuat klien retry selamanya);
- rate limit ember sendiri (120/jam per hash-IP, hanya di memori isolate);
- batas byte 8 KB **sebelum** `JSON.parse` (`BYTE_LIMITS` di `workers/api/schema.js`);
- maksimum 20 event/batch;
- `batchId` wajib UUID v4; `day` harus dalam ±2 hari dari jam server;
- field asing / enum salah / field wajib hilang / cohort salah bentuk → **400**, bukan
  dibuang diam-diam;
- **retry**: hanya 2xx yang meng-`ack`. 5xx / timeout / offline meninggalkan event di
  antrean dengan `eventId` yang sama, sehingga percobaan berikutnya adalah kiriman
  ulang yang dide-dup server. `Retry-After` menang atas backoff.

---

## 5. Server menyimpan di mana

D1 **`fiezel-evidence`** (binding `EVIDENCE_DB`) — database KEEMPAT, terpisah dari
`fiezel-core`, `fiezel-quota`, `fiezel-stats`, dan `fiezel-learning`. D1 tidak bisa JOIN
lintas database, jadi pemisahan ini membuat penggabungan domain tidak bisa ditulis,
bukan sekadar dilarang.

Migrasi `workers/api/evidence/migrations/0008_evidence.sql` (salinan byte-identik di
`workers/api/migrations/0008_evidence.sql`, terdaftar di `MIGRATIONS.md`):

| Tabel | Isi | Umur |
| --- | --- | --- |
| `evidence_daily` | `(day, event, dim, n)` — penghitung agregat. NOL kolom identitas; `cohort` dilarang muncul di sini | permanen |
| `evidence_dedup` | `(event_id, batch_id, day)` — UUID v4 acak sekali pakai, idempotensi retry | 14 hari |
| `evidence_learner_day` | `(day, cohort)` — SATU-SATUNYA tempat cohort disimpan, tanpa satu pun dimensi belajar | 14 hari |

Pengenal privasi (`cohort`): 16 hex acak dari CSPRNG perangkat — **bukan** turunan
nama/akun/installId/waktu, jadi tidak ada yang bisa dibalik. Dirotasi tiap 14 hari dan
nilai lama tidak diarsipkan. Batas kemampuan yang jujur: **di dalam satu epoch 14 hari,
server bisa melihat bahwa dua hari kirim berasal dari cohort yang sama.** Itu harga dari
"jumlah murid" dan "tren", dan 14 hari adalah batas atasnya.

Kegagalan infrastruktur (binding absen, tabel belum dimigrasi, D1 melempar) dijawab
**202 tanpa tulis**, bukan 500 — kegagalan server bukan salah klien.

---

## 6. Bagaimana aggregation dilakukan

1. `markEvidenceEventsSeen()` (SINKRON, sebelum agregasi dijadwalkan — dedup di dalam
   `waitUntil` akan membuat retry cepat terhitung dua kali) menyaring event yang sudah
   pernah diterima. Replay penuh → **200 `duplicate`**, nol perubahan penghitung.
   Replay parsial → hanya event baru yang dihitung.
2. `markLearnerDay()` mencatat `(day, cohort)` dengan `INSERT OR IGNORE` dan
   mengembalikan jumlah murid BARU hari itu.
3. `aggregateEvidence(day, events)` (fungsi murni di `evidence-core.js`) menghasilkan
   satu baris per `(hari, tipe event, field:nilai)` plus satu baris `_:total` per tipe
   sebagai penyebut.
4. `applyEvidenceAggregate()` menulisnya lewat upsert `n = n + excluded.n`, dan
   membekukan hitungan murid ke baris `learners / measured:distinct` — supaya dashboard
   tidak pernah perlu menyentuh tabel yang memuat cohort.
5. `purgeEvidence(db, today)` membuang dedup + cohort yang lebih tua dari 14 hari.

---

## 7. Bagaimana Owner Dashboard membacanya

**Tidak ada dashboard kedua.** Bukti Braincore menjadi panel baru di dalam Owner
Dashboard yang sudah ada:

- **Berkas**: `workers/owner/index.js` (Worker `fiezel-owner`) — dashboard yang sama
  yang sudah memuat user growth, active users, retention, usage, dan cost.
- **Rute**: `GET /` (HTML) dan `GET /api/summary` (JSON) — keduanya rute lama, di
  belakang sesi owner (cookie ber-HMAC) dan penjaga edge yang sudah ada. **Nol rute
  baru, nol sistem auth baru.**
- **Komponen**: `renderEvidenceSection(m)` dipanggil di `renderDashboard()` sebagai
  `<section>` terakhir di dalam `<main>`, memakai helper (`row`, `esc`, `fmtInt`) dan
  palet/CSS dashboard yang sama. Model diisi `readEvidence()` yang dipanggil dari
  `readModel()`; hasilnya juga ikut di `/api/summary` sebagai `evidence`.
- **Sumber data**: subrequest ke `GET /api/owner/braincore-evidence?days=N` di Worker
  `fiezel-api` (`route-evidence.js` `handleOwnerEvidence`), owner-gated dengan pola
  `cron-status.js` (sha256 hex di `OWNER_TOKEN_HASH`, banding waktu-konstan,
  fail-closed), hanya `SELECT` atas `evidence_daily`.

**Kenapa subrequest, bukan binding D1 kedua**: `owner-edge-guard-test.js` butir (g-g)
mengunci Worker owner pada TEPAT SATU binding D1 (`ANALYTICS`), dan gerbang itu benar —
menambah `EVIDENCE_DB` akan menaruh database yang memuat satu-satunya pengenal perangkat
di isolate yang sama dengan seluruh kode dashboard. Dua secret opsional mengaktifkannya:
`EVIDENCE_API_BASE` dan `EVIDENCE_API_TOKEN`. Tanpa keduanya panel berbunyi "belum
dikonfigurasi" dan seluruh dashboard lama tetap utuh.

Yang terlihat di panel: **murid terukur**, **jumlah bukti** dan **jumlah keputusan**,
**tren mastery** + sebaran mastery, **tren miskonsepsi** + famili skill, **kalibrasi
kesulitan** + galat kalibrasi, **keputusan/hasil/rekomendasi Braincore**, **tren
perbaikan belajar**, dan tabel per hari.

Yang **tidak** terlihat, karena memang tidak pernah sampai: identitas murid apa pun.
Rute owner tidak boleh menyebut `evidence_learner_day` maupun `evidence_dedup` (larangan
yang sama dengan `dau_dedup` di dashboard analytics, diassert gerbang), dan
`sanitizeEvidenceSummary()` di Worker owner membuang apa pun di luar daftar putih.

Kejujuran angka mengikuti aturan dashboard yang sudah ada: "belum dikonfigurasi",
"belum dimigrasi", "pengukuran tidak tersedia", dan "belum ada pengukuran" dibedakan
satu sama lain dan dari **nol murid**.

---

## 8. Gerbang

`braincore-evidence-test.js` (138 pemeriksaan, terdaftar di `.github/workflows/quality.yml`):
privasi, malformed, offline, retry, duplicate, kegagalan server, kebenaran agregasi,
isolasi terhadap pipeline lama, dan paritas enum klien↔server. Ditambah
`d1-schema-contract-test.js` + `tools/d1-schema-check.mjs` yang kini mengenal database
keempat dan arah larangan tabelnya, serta `owner-dashboard-test.js` /
`owner-edge-guard-test.js` yang tetap hijau tanpa dilonggarkan.

---

## 9. Apa yang masih belum tersedia

1. **Belum pernah diuji end-to-end sungguhan.** Database `fiezel-evidence` belum dibuat,
   `database_id` di `workers/api/wrangler.toml` masih placeholder, migrasi belum
   dijalankan, dan `EVIDENCE_ENABLED` masih `off`. Semua bukti hijau berasal dari
   gerbang Node dengan D1 dan `fetch` tiruan.
2. **Klien belum pernah mengirim satu batch pun.** `CONFIG.evidence.mode` masih `off`
   dan `endpoint` masih kosong; urutan menyalakannya: migrasi → `EVIDENCE_ENABLED=on` →
   `mode:'local'` (verifikasi skema di perangkat nyata) → `mode:'on'`.
3. **Purge TTL belum terjadwal.** `purgeEvidence()` ada dan diuji, tetapi belum
   dipasang ke cron `route-wiring.js`. Sampai itu dipasang, cohort tidak akan pernah
   kedaluwarsa di produksi — dan cohort yang tidak pernah dipurge adalah identitas
   dengan nama lain. **Ini blocker rilis, bukan pekerjaan lanjutan.**
4. **Consent belum ada.** Belum ada pintu di UI tempat murid/wali menyetujui pengiriman
   bukti, dan belum ada tombol opt-out yang memanggil `queue.purge()`.
5. **Hanya grammar-adjacent.** Famili skill mengikuti taksonomi grammar; bukti dari
   listening/reading/speaking dipetakan ke `other` sampai taksonominya diperluas.
6. **Murid unik lintas-hari tidak dihitung.** Yang dilaporkan adalah murid BARU per
   hari, dijumlahkan. Menghitung unik lintas 30 hari menuntut menyimpan cohort lebih
   lama daripada yang dibenarkan.
7. **Tanpa backfill.** Bukti hanya lahir dari sesi yang selesai SETELAH lane menyala;
   riwayat lama tidak pernah dikirim.
8. **Belum ada rollup/retensi jangka panjang** untuk `evidence_daily`, dan belum ada
   panel di dashboard yang membandingkan periode.
