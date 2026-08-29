# Runbook Aktivasi Loop Belajar — Urutan Eksekusi untuk MASTER

**Basis:** FIEZEL 5.19.0 · branch `brain-learning-infra-v1` (PR #226) · **Tanggal:** 2026-08-29
**Sifat dokumen:** advisory-only. Setiap langkah di bawah ini adalah operasi tulis repo atau
produksi, dan karena itu **hanya boleh dieksekusi MASTER** per
[MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §1 (baris 7–16). Dokumen ini menyusun
urutannya supaya tidak ada langkah yang terlewat atau terbalik; ia tidak memberi otoritas apa pun.

Aturan penulisan sama dengan [BRAIN-LEARNING-ARCHITECTURE-AUDIT.md](BRAIN-LEARNING-ARCHITECTURE-AUDIT.md):
setiap klaim membawa bukti `file:baris` yang diverifikasi di working tree saat dokumen ditulis,
dan yang belum ada ditulis sebagai belum ada.

---

## Langkah 0 — Status saat ini per komponen (baca dulu, jangan lompati)

Legenda: **IMPLEMENTED** = kode ada + gate Node PASS · **WIRED** = dimuat shell
(script tag `index.html` + precache `sw.js`) · **OFF** = tidak menghasilkan efek runtime apa pun ·
**TIDAK ADA** = belum ada di tree.

| Komponen | Status | Bukti |
|---|---|---|
| Telemetri klien (events, queue, transport) | IMPLEMENTED + WIRED, **OFF** | `features/telemetry/fiezel-learning-{events,queue,transport}.js`; dimuat `index.html:354–357`, precache `sw.js:79`; gate `learning-telemetry-test.js` → `LearningTelemetry: PASS` (dieksekusi ulang saat runbook ini ditulis) |
| Saklar telemetri klien | IMPLEMENTED, mode `'off'` | `features/telemetry/fiezel-telemetry-config.js:25–28` (`enabled:false`, `mode:'off'`, `endpoint:''`) — saklar BEKU, hanya berubah lewat release train, bukan lewat server |
| Emitter di `app.js` (titik commit jawaban) | IMPLEMENTED + WIRED, **OFF** | Blok "Gelombang 4 (Lane B)" mulai `app.js:1219`; `learningTelemetryEmitAnswer` (`app.js:1311`) dipanggil dari cabang grammar `record()` (`app.js:1395`, guarded try/catch); cabang mode `'off'` keluar PALING DULU dan PALING MURAH (`app.js:1314`) sehingga default rilis ini nol efek runtime; identitas bundle Brain tampil di panel diagnostik via `brainManifestMarkup` (`app.js:7587`, tampilan saja); gate `app-telemetry-wiring-test.js` → `AppTelemetryWiring: PASS` (10 asersi statis, dieksekusi ulang 2026-08-29) |
| Dedup idempoten server (per-`batchId`) | IMPLEMENTED, **UNDEPLOYED** | `workers/api/analytics/route-events.js:46` (`BATCH_ID_PATTERN`), `:156,:191` (dedup sinkron, `202` baru / `200 duplicate:true` di `:295,:315`); migrasi `workers/api/migrations/0006_analytics_batch_dedup.sql`; gate `analytics-dedup-test.js` → `AnalyticsDedup: PASS` |
| Dedup per-`eventId` (kontrak [BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md) §5, baris 150–170) | IMPLEMENTED di lane learning, **UNDEPLOYED** | Tabel `learning_dedup` (`workers/api/migrations/0007_learning.sql:57`, indeks TTL `:68`); `INSERT OR IGNORE` per-event (`workers/api/learning/learning-store-d1.js:53`); dedup sinkron SEBELUM agregasi, replay batch penuh → `200 duplicate:true` (`workers/api/learning/route-learning-events.js:17,177`); gate `learning-lane-test.js` → 44/44 `LearningLane: PASS`. Lane analytics TETAP dedup per-batch saja — by design, bukan celah: event analytics tidak membawa `eventId` (grep `event_dedup\|eventId` di `workers/api/analytics/*.js` tetap 0 hit) |
| Lane ingest learning server (`/api/learning/events`) | IMPLEMENTED, flag `"off"`, **UNDEPLOYED** | Modul `workers/api/learning/` (`learning-core.js`, `route-learning-events.js`, `learning-store-d1.js`); rute POST terdaftar via `registerLearningRoutes` (`workers/api/route-wiring.js:74,549`; env terisolasi `learningEnv` tanpa fallback binding, `:154`); `LEARNING_ENABLED = "off"` (`workers/api/wrangler.toml:99`); binding `LEARNING_DB` dengan `database_id` masih placeholder (`wrangler.toml:145–147`); migrasi `0007_learning.sql` terdaftar di `MIGRATIONS.md:19` (perintah penerapan `:83`); gate `learning-lane-test.js` → 44/44 pemeriksaan, `LearningLane: PASS` (dieksekusi ulang 2026-08-29). Transport klien default menunjuk ke sana (`features/telemetry/fiezel-learning-transport.js:221`) — sisi terima kini ada di tree, tinggal deploy |
| Analytics produk server | IMPLEMENTED, flag `"on"` di repo, **UNDEPLOYED** | `ANALYTICS_ENABLED = "on"` (`workers/api/wrangler.toml:92`); ketiga `database_id` D1 masih placeholder (`wrangler.toml:112,129,147` — bergeser dari `105,122` karena blok `LEARNING_DB` mendarat) — worker belum pernah deploy |
| Modul infra brain (stat-gate, manifest, config, learning-metrics, metrics-digest) | IMPLEMENTED + WIRED, otoritas `off` | Dimuat `index.html:344–348`, precache `sw.js:78`; 4 dari 5 tetap tanpa pemanggil di `app.js` (grep `FiezelStatGate\|FiezelBrainConfig\|FiezelLearningMetrics\|FiezelMetricsDigest` = 0 hit); `FiezelBrainManifest` kini dibaca `app.js` untuk TAMPILAN/ATRIBUSI saja — panel diagnostik `brainManifestMarkup` (`app.js:7587`) dan `bundleVersion` opsional di ctx event (`app.js:1342`) — tetap tanpa otoritas keputusan; kelima gate PASS (dieksekusi ulang: `StatGate`, `BrainManifest`, `BrainConfig`, `LearningMetrics`, `MetricsDigest`) |
| Simulator (bukti primer pengganti A/B) | IMPLEMENTED, dikeraskan, **verdict FAIL jujur** | `node adaptivity-simulation-v3.js` → exit 1, `GAGAL (gate kalibrasi): itemBiasRMSE TIDAK turun (0.2694 → 0.2622)` (dieksekusi ulang saat runbook ini ditulis); rincian di adendum audit |
| Ritual rilis (triple-bump build) | HIJAU pada m025-186 | `core-config.js:19`, `sw.js:35`, `fiezel-diag-panel.js:18`, `coordination/BUILD-VERSION.json`; `install-health-test.js` + `pwa-release-coherence-test.js` → PASS (dieksekusi ulang) |

Konsekuensi yang harus dipahami sebelum mulai: **langkah 5c–5e (mode `'shadow'`/`'on'`)
terblokir sampai lane ingest learning server benar-benar DEPLOY dan flag server `"on"`** —
kode lane + flag `LEARNING_ENABLED` kini SUDAH ada di tree (lihat Langkah 0), tetapi worker
belum pernah deploy dan `database_id` `LEARNING_DB` masih placeholder; menyalakan upload
sebelum itu hanya menghasilkan antrean yang retry selamanya (aman, tapi sia-sia).

## Langkah 1 — Merge PR #226

- PR #226 (`brain-learning-infra-v1` → `main`) berstatus OPEN saat runbook ini ditulis.
- MASTER mereview state repo + bukti gate secara independen (alur wajib
  [MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §5, baris 35–44), lalu merge lewat
  kanal owner-authenticated. Tidak ada helper yang boleh melakukan ini.
- Prasyarat merge: sweep gate Node hijau di kepala branch (commit `8ae4358` mencatat sweep
  23 gerbang PASS; jalankan ulang bila ada commit baru di atasnya).

## Langkah 2 — Verifikasi Pages deploy + install-health di perangkat

1. Tunggu GitHub Pages selesai deploy `main` (deploy Pages = operasi MASTER,
   [MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §1 baris 14).
2. Di perangkat nyata: buka aplikasi, buka panel diagnostik, dan cocokkan tiga penanda build —
   `DIAG_BUILD` (`features/neural-voice/fiezel-diag-panel.js:18`) == `FIEZEL_PAGE_BUILD`
   (`core-config.js:19`) == awalan `SW_REV` (`sw.js:35`), semuanya `m025-186` di tree ini.
   Ketiganya tidak cocok = shell lama masih dipegang service worker; tunggu update SW atau
   reload dua kali.
3. Verifikasi sisi repo: `node install-health-test.js` → `FIEZEL install health: PASS` dan
   `node pwa-release-coherence-test.js` → PASS (keduanya dieksekusi ulang PASS saat runbook
   ini ditulis).
4. Verifikasi wiring baru ikut terangkut: di DevTools console perangkat, kesembilan global
   modul baru harus terdefinisi (`FiezelStatGate`, `FiezelBrainManifest`, `FiezelBrainConfig`,
   `FiezelLearningMetrics`, `FiezelMetricsDigest`, `FiezelTelemetryConfig`,
   `FiezelLearningEvents`, `FiezelLearningQueue`, `FiezelLearningTransport`) — dan
   `FiezelTelemetryConfig.CONFIG.mode === 'off'`.

## Langkah 3 — Buat D1 + isi `database_id` + terapkan migrasi

Ikuti [workers/api/migrations/MIGRATIONS.md](workers/api/migrations/MIGRATIONS.md) baris 55–84
apa adanya — per berkas, per database, **JANGAN** `wrangler d1 migrations apply` (alasan keras
di MIGRATIONS.md baris 42–53: satu direktori migrasi hanya bisa menempel ke satu database, dan
salah tempel berarti tabel analytics bersebelahan dengan `quota_daily` — JOIN yang diharamkan
kontrak privasi jadi mungkin).

```bash
cd workers/api
wrangler d1 create fiezel-core
wrangler d1 create fiezel-stats
wrangler d1 create fiezel-learning
# tempelkan ketiga database_id yang keluar ke wrangler.toml:112, :129, dan :147 (commit via release train)

wrangler d1 execute fiezel-core  --remote --file=migrations/0001_identity.sql
wrangler d1 execute fiezel-core  --remote --file=migrations/0001_quota.sql
wrangler d1 execute fiezel-stats --remote --file=migrations/0002_analytics.sql
wrangler d1 execute fiezel-core  --remote --file=migrations/0003_cron.sql
wrangler d1 execute fiezel-core  --remote --file=migrations/0004_indexes.sql
wrangler d1 execute fiezel-core  --remote --file=migrations/0005_ai_account_budget.sql
wrangler d1 execute fiezel-stats --remote --file=migrations/0006_analytics_batch_dedup.sql
wrangler d1 execute fiezel-learning --remote --file=migrations/0007_learning.sql
```

Lalu dua verifikasi wajib dari MIGRATIONS.md: query pemisahan database (baris 113–135 — kini
EMPAT blok pemeriksaan termasuk silang lane learning, SEMUA query HARUS kosong) dan bukti
skema produksi == repo via `tools/d1-schema-check.mjs` (baris 222–233, keluar 0 = identik;
skrip kini mengenal `--db learning`). Catatan perilaku: tanpa `0006`, dedup batch fail-soft —
batch diperlakukan baru seperti sebelum fitur ada (`analytics-dedup-test.js` mengujinya) —
jadi migrasi 0006 bukan opsional bila idempotency mau ditagih. Hal yang sama berlaku untuk
`0007`: sebelum diterapkan (atau bila flag off), `POST /api/learning/events` menjawab
`202 {disabled:true}` tanpa menulis apa pun (MIGRATIONS.md baris 93–95).

## Langkah 4 — Deploy worker

```bash
cd workers/api
wrangler deploy
```

Verifikasi pasca-deploy minimum: `GET /api/health` menjawab; `GET /api/usage/pepper`
menerbitkan pepper (rute terdaftar di `route-wiring.js:514–515`); cron terpasang
(`wrangler.toml` blok `triggers`). Deploy worker adalah operasi MASTER
([MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §1 baris 14).

## Langkah 5 — Urutan saklar (server dulu, klien belakangan, satu tahap per rilis)

Prinsip yang tidak boleh dibalik: **sisi terima harus hidup dan terbukti idempoten sebelum
sisi kirim menyala** (kontrak [BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md) §5,
baris 150: "WAJIB sebelum emitter pertama").

### 5a. `LEARNING_ENABLED=on` di server — prasyarat kode **SUDAH DI TREE**, tinggal deploy + flip

Semua prasyarat implementasi yang dulu ditandai "belum ada" kini mendarat (bukti di Langkah 0):
rute ingest `/api/learning/events` (fail-soft saat flag off — `202 {disabled:true}`,
`route-learning-events.js:146`; validasi enum tertutup; dedup per-`eventId` sesuai skema §5
via tabel `learning_dedup`), flag `LEARNING_ENABLED` default `"off"` di
`workers/api/wrangler.toml:99`, dan gate idempotensinya — mendarat dengan nama
`learning-lane-test.js` (44/44 PASS; cakupannya memenuhi tuntutan
`learning-events-idempotency-test.js` di BRAIN-TELEMETRY-SCHEMA.md baris 170, termasuk replay
batch penuh dan replay parsial lintas-batch). Urutan eksekusi MASTER yang tersisa:
merge (Langkah 1) → `wrangler d1 create fiezel-learning` + isi `database_id`
(`wrangler.toml:147`) + terapkan `0007_learning.sql` (Langkah 3) → deploy worker (Langkah 4) →
baru ubah flag ke `"on"` lewat commit `wrangler.toml` + `wrangler deploy` (atau var override
dashboard, pola yang sama dengan `ANALYTICS_ENABLED`, `wrangler.toml:87–92`). Sisi klien tetap
`'off'` sampai 5b lulus — server dulu, klien belakangan.

### 5b. Verifikasi ingest dengan batch uji

Sebelum satu klien pun mengirim: kirim batch uji sintetis dua kali dengan `batchId` sama
(curl), dan tagih perilaku dedup yang sudah dibuktikan gate di jalur analytics —
kiriman pertama `202 {accepted:N}`, replay `200 {duplicate:true}` tanpa agregasi ulang
(`route-events.js:191,295`). Untuk lane learning, tagih juga dedup per-`eventId`: replay
event yang sama di batch BERBEDA tidak boleh menaikkan counter (kontrak skema §5.2 —
ini yang membedakannya dari dedup batch analytics). Perilaku ini kini terimplementasi dan
teruji di gate (`learning-store-d1.js:53` `INSERT OR IGNORE` per-event;
`route-learning-events.js:177` replay penuh → `200 duplicate:true`; `learning-lane-test.js`
menguji replay penuh DAN parsial terhadap potret seluruh penghitung) — 5b menagih bahwa
perilaku produksi sama dengan yang gate buktikan lokal. Gagal di sini = berhenti;
jangan lanjut ke 5c.

### 5c–5e. Saklar klien: `'local'` → `'shadow'` → `'on'`, masing-masing satu release train

Saklar klien hidup di `features/telemetry/fiezel-telemetry-config.js:26` dan BEKU di bundle —
server tidak bisa mengubahnya (disengaja; komentar header file itu menjelaskan kenapa).
Setiap transisi = 1 commit + sweep gate + merge MASTER + `node tools/bump-build.mjs "<alasan>"`
(protokol di `coordination/BUILD-VERSION.json`: jangan pernah mengetik nomor build manual).

| Tahap | Yang berubah | Kriteria naik ke tahap berikutnya |
|---|---|---|
| `'local'` | Event dibangun + antre LOKAL, tidak pernah upload (`fiezel-telemetry-config.js:11–13`) | Di perangkat nyata: antrean terisi event yang lolos validator enum tertutup, tanpa error console, ukuran antrean di bawah batas (2000 event / 2 MB / 45 hari, `fiezel-learning-queue.js`); TIDAK butuh server hidup |
| `'shadow'` | Antre + upload, respons diabaikan (pola `cf-shadow-mode`) | Server menerima batch (counter naik), replay tidak double-count, rate limit tidak terpicu; klien tidak menunjukkan regresi UX; minimal satu siklus retensi antrean diamati |
| `'on'` | Lane penuh | HANYA setelah kriteria consent Langkah 6 terpenuhi seluruhnya |

`endpoint` di config (`fiezel-telemetry-config.js:28`) diisi pada rilis yang sama dengan
transisi ke `'shadow'` — sengaja kosong sampai lane server terbukti.

## Langkah 6 — Kriteria consent sebelum `'on'` (rujukan: BRAIN-DATA-PRIVACY.md)

Mode `'on'` menuntut "consent tercatat + endpoint live" (header
`fiezel-telemetry-config.js:17`). Konkretnya, SEMUA butir ini harus hijau:

1. **Review manusia yang berwenang** atas aktivasi telemetri pada populasi nyata —
   [BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §8 (baris 141–147) eksplisit: dokumen
   privasi bukan opini hukum, keputusan aktivasi butuh review per MASTER-ONLY-GOVERNANCE.md.
2. **Postur anak/usia dicek** — aplikasi tidak punya gerbang usia dan mungkin dipakai anak
   <13 tahun ([BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §6, baris 104–109); UU 27/2022
   memperlakukan data anak lebih ketat (baris 117–118). Telemetri v1 tanpa identifier stabil
   membuat posisi ini kuat by default — dan karena itu setiap deviasi dari skema v1 membatalkan
   kesimpulan review.
3. **Yang dikirim tetap persis kontrak §1 BRAIN-DATA-PRIVACY.md**: enum/bucket kasar,
   grammar-only, tanpa timestamp presisi, tanpa ID stabil (§7, baris 121–137 — permanen).
4. **Supresi k=20 aktif di jalur pelaporan** sebelum ada angka yang dilihat manusia
   ([BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §4, baris 69–86).
5. **Jalur opt-out teruji di perangkat**: `purge()` mengosongkan antrean total tanpa syarat
   (`fiezel-learning-queue.js:271–275`), dan murid tahu cara memicunya.
6. Larangan istilah: jangan pernah menyebut apa pun di UI/dokumen sebagai "anonymous ID"
   ([BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §6, baris 110–113).

## Langkah 7 — Rollback per langkah

| Langkah yang di-rollback | Cara | Sifat |
|---|---|---|
| 5a (flag server) | `LEARNING_ENABLED`/`ANALYTICS_ENABLED` → `"off"` via commit + deploy, atau var override dashboard (pola `wrangler.toml:87–92` untuk analytics, `:93–99` untuk learning). Rute tetap terdaftar dan menjawab diam — klien lama tidak melihat 404 (komentar desain `wrangler.toml:87–98`; perilaku learning: `route-learning-events.js:144–146`) | Menit; fail-soft by design |
| 5c–5e (mode klien) | Revert commit mode di `fiezel-telemetry-config.js` + bump build BARU lewat release train (m025-N+1, bukan deploy ulang build lama — kontrak monotonik `install-health-test.js`) | 1 siklus rilis; klien mengambil shell baru saat SW update |
| Antrean klien yang sudah terisi | `FiezelLearningQueue`-instance di perangkat: `purge()` (`fiezel-learning-queue.js:271–275`) — total, tanpa syarat; alternatif kasar: hapus data situs | Per perangkat |
| 4 (worker) | `wrangler rollback` ke versi worker sebelumnya, atau deploy ulang commit lama — keputusan MASTER | Menit |
| 3 (migrasi) | TIDAK di-rollback otomatis. Semua migrasi `CREATE TABLE IF NOT EXISTS` (idempoten, MIGRATIONS.md baris 110–111); tabel yang telanjur ada tapi tidak dipakai tidak membahayakan — menghapus tabel adalah operasi manual MASTER dengan backup dulu (`docs/D1-BACKUP-RESTORE.md`) | Jam; jarang perlu |
| 1 (merge) | Revert merge commit di `main` lewat kanal owner + Pages deploy ulang | 1 siklus rilis |

Properti yang menyelamatkan di semua jalur: setiap komponen fail-to-OFF — config klien beku
default `'off'`, transport tanpa endpoint hanya diam, dedup tanpa tabel berperilaku seperti
sebelum fitur ada, dan flag server off menjawab 202 kosong.

## Langkah 8 — Yang TIDAK otomatis, dan kenapa

1. **Merge, deploy Pages, deploy worker, ubah flag, terapkan migrasi** — semuanya manual
   MASTER. [MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §1 (baris 7–16) memberi
   otoritas tulis hanya ke satu identitas; §4 (baris 31–32) melarang deploy terpicu-push;
   §5 (baris 35–44) mewajibkan review independen MASTER di antara proposal dan eksekusi.
   Helper apa pun (termasuk penulis runbook ini) advisory-only (§2).
2. **Transisi mode telemetri tidak bisa dari server** — saklar sengaja dibekukan di bundle
   (`fiezel-telemetry-config.js`, header baris 3–4): server yang bisa menyalakan pengumpulan
   data di klien adalah persis permukaan serangan yang keputusan council #8
   ([BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md) §8) larang permanen.
3. **Promosi kebijakan Brain tidak otomatis** — gate statistik memberi verdict
   `promote/hold/reject`, tapi eksekusinya tetap keputusan MASTER; promosi otomatis terpicu
   ambang secara struktural haram ([BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md)
   §2, temuan Sonnet).
4. **Refit parameter dari telemetri tidak otomatis dan tidak akan otomatis di N≤250** —
   BKT dibekukan sampai N > 1.000 ([BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md)
   §5); telemetri v1 hanya untuk evaluasi kelas kebijakan, bukan tuning per-murid.
5. **Keputusan atas temuan simulator** — verdict FAIL simulator (censoring, kalibrasi
   inconclusive) adalah bukti untuk MASTER, bukan trigger perbaikan otomatis; melonggarkan
   gate supaya hijau adalah anti-pola yang dilarang eksplisit di laporan wave.

## Batas kejujuran runbook ini

Semua path dan nomor baris diverifikasi di working tree `brain-learning-infra-v1` pada
2026-08-29, TERMASUK perubahan wiring yang belum di-commit (modifikasi `index.html`, `sw.js`,
`core-config.js`, `fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` dan file baru
`fiezel-telemetry-config.js` ada di working tree, bukan di HEAD) — nomor baris bisa bergeser
saat parent merapikan commit. Hasil PASS yang dikutip di Langkah 0 dieksekusi ulang oleh
penulis runbook ini pada tanggal yang sama (9 gate: learning-telemetry, analytics-dedup,
brain-config, learning-metrics, metrics-digest, stat-gate, brain-manifest, install-health,
pwa-release-coherence — semua exit 0), kecuali sweep 23 gerbang commit `8ae4358` yang
adalah klaim commit message. Sinkronisasi 2026-08-29: emitter `app.js` dan lane ingest
learning server yang semula ditandai TIDAK ADA kini MENDARAT di tree yang sama — Langkah 0,
3, dan 5a diperbarui dengan bukti file:baris baru, dan dua gate tambahan dieksekusi ulang
PASS saat sinkronisasi (`app-telemetry-wiring-test.js` → `AppTelemetryWiring: PASS`;
`learning-lane-test.js` → 44/44, `LearningLane: PASS`).
