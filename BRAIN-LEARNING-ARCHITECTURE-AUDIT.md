# Brain Learning Architecture — Audit Realitas

**Basis:** FIEZEL 5.19.0 (`package.json:4`) · branch `brain-learning-infra-v1` · **Tanggal:** 2026-08-28
**Sumber:** audit independen empat model council (Claude Fable 5, Claude Opus 5, Claude Sonnet 5.0,
GPT-5.6 Sol — laporan lengkap di `../model-council-*.md`) + verifikasi grep langsung ke repo ini
saat dokumen ditulis. Ditulis dengan aturan yang sama seperti
[BRAINCORE-V3-REPORT.md](BRAINCORE-V3-REPORT.md): klaim harus berupa angka yang bisa dibantah,
dan yang belum terbukti ditulis sebagai belum terbukti.

Dokumen ini adalah deliverable Fase 1 master prompt "Brain Learning Architecture v1.0" §3
(audit wajib sebelum implementasi), dan jawabannya berbeda dari yang spec asumsikan.

---

## 1. Vonis satu paragraf

**Kira-kira 60–70% mesin yang diminta spec sudah ada di repo — tetapi diarahkan ke objek yang
salah:** separuh ingestion/agregasi dibangun untuk analitik produk, separuh
canary/promotion/rollback dibangun untuk patch konten, bukan algoritma Brain (kesepakatan bulat
empat model, `../model-council-synthesis.md`). Yang benar-benar hilang justru kecil: emitter
telemetri sisi klien dan antrean offline — **0% terbangun** (nol referensi `/api/usage/events`
di `app.js`, diverifikasi ulang dengan grep saat audit ini). Dan backend yang "~80% terbangun"
itu **0% operasional**: `ANALYTICS_ENABLED = "off"` (`workers/api/wrangler.toml:65`) dan kedua
field D1 `database_id` masih placeholder `"<isi setelah: wrangler d1 create ...>"`
(`workers/api/wrangler.toml:78,95`) — backend belum pernah dideploy. Konsekuensinya, instruksi
§42 spec "jangan lompati fase" tidak bisa dijalankan sebagaimana tertulis: Fase 2 (emitter) 0%
sementara Fase 3–4 (ingestion/agregasi) ~80–85%.

Angka 60–70% adalah penilaian tumpang-tindih fungsional, bukan metrik hitung-baris — batas
kejujurannya dicatat eksplisit oleh Opus (`../model-council-claude_opus_5_0.md` §7).

---

## 2. Matriks status: spec vs repo

Legenda: **TERIMPLEMENTASI** = kode ada, diuji gate Node, terhubung runtime ·
**PARSIAL** = ada tapi untuk objek lain / dengan celah material · **HANYA-DOKUMEN** = desain
tertulis tanpa kode · **TIDAK ADA** = tidak ada sama sekali · **MATI** = kode ada tapi tidak
berfungsi/yatim.

| § Spec | Kebutuhan | Status | Bukti |
|---|---|---|---|
| §5–6 | Skema telemetri, 17 tipe event | **PARSIAL (beda objek)** | `workers/api/analytics/analytics-core.js:170` `EVENT_SPEC`: 8 event klien + 10 server-only, semua enum tertutup, tanpa free-text — event produk, bukan event belajar |
| §7 | Antrean offline klien + retry | **TIDAK ADA** | Nol emitter di `app.js` (grep `usage/events\|retention_ping\|visitor_token` = 0 hit); IndexedDB tidak dipakai di produksi — `analysis/idb-migration-design.md` bertanda "DESIGN ONLY" |
| §8 | Privasi by design | **TERIMPLEMENTASI, melampaui spec** | Pepper harian dirotasi, pepper N-2 dihapus permanen (`analytics-core.js:10–20`); `visitor_token = HMAC-SHA256(pepper, installId)` dipotong 128 bit (`analytics-core.js:66–75`); nol tabel per-orang (`workers/api/analytics/PRIVACY.md:104–108`); 3 gate CI hijau (54/45/69 cek, dieksekusi ulang oleh keempat model council) |
| §9 | Ingestion server + validasi | **PARSIAL (~85%)** | `route-events.js:29–33`: batch maks 8 KB / 20 event, 60 batch/jam; **tanpa idempotency** — nol hit grep `eventId\|batchId\|batch_id` di `workers/api/analytics/*.js`; retry ambigu = hitung ganda (temuan Sol, `../model-council-gpt_5_6_sol.md` §4.3) |
| §10–11 | Agregasi + rollup | **PARSIAL (~85%, belum deploy)** | `rollup.js`, cron `5 17 * * *` (`wrangler.toml:159`); 5 tabel agregat saja; belum pernah jalan di produksi |
| §12 | 11 metrik belajar longitudinal | **TIDAK ADA (server); PARSIAL (lokal)** | Linkage lintas-hari mustahil secara kriptografis by design (lihat §4.1); ledger miskonsepsi lokal ada (`features/brain/fiezel-misconception-ledger.js`) |
| §13 | Mesin riset model / generator kandidat | **PARSIAL (konten, bukan Brain)** | `fiezel-meta-learning.js` insight weak_skill dari agregat lokal; tidak ada generator algoritma — dan memang tidak boleh ada (lihat [BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md)) |
| §14, §27 | Brain Model Registry sebagai layanan | **TIDAK ADA; disubstitusi** | Registry de-facto = repo git + tag rilis + SW_REV; analog konten ada di `content-canary.js` + `content-promotion.js` |
| §15 | Jangan pernah hot-patch Brain | **TERIMPLEMENTASI (by omission)** | Tidak ada rute `/api/content/qa/apply` atau `/publish`; adopsi hanya saat rilis (`content-adoption.js`); MASTER-ONLY-GOVERNANCE.md memberi otoritas tulis ke satu manusia |
| §16 | Evolusi via konfigurasi | **TERBLOKIR** | `TARGET_SUCCESS` dkk. adalah konstanta level-modul di `fiezel-core-brain.js`; BKT dibekukan `Object.freeze({L0:0.2,T:0.15,slip:0.1,guess:0.25})` (`features/brain/fiezel-mastery-bkt.js:70`); tidak ada seam `configure(overrides)` — §16 vs §43 adalah kontradiksi internal spec yang keempat model tandai |
| §17 | Simulasi deterministik berseed | **TERIMPLEMENTASI (~80%)** | `adaptivity-simulation-v3.js` (662 baris): mulberry32 berseed, gate determinisme byte-identik; kelemahan: 3 profil, 1 seed, tanpa CI bootstrap, bug censoring `timeToMasteryDays=36.00` pada horizon 36 hari (Opus §1.5) |
| §18 | Evaluasi kandidat | **PARSIAL (~50%)** | Gate ada tapi mentoleransi kalah 2 dari 5 metrik; tanpa interval kepercayaan |
| §19–20 | Gate regresi + shadow mode | **TERIMPLEMENTASI (konten/transport)** | `content-patch-gate.js` (`guarded-patch-v1`); mode `off/shadow/canary` di `content-canary.js`; `cf-shadow-mode-test.js` (36 cek) — shadow transport, BUKAN shadow kebijakan Brain |
| §21 | Assignment A/B | **DUA VERSI, SATU MATI** | FNV-1a deterministik di `content-canary.js` (benar); `Math.random()` tak berseed di `features/ui/fiezel-ab-testing.js:20` (salah) |
| §22–23 | Guardrail + gate persetujuan manusia | **TERIMPLEMENTASI, tapi ambangnya noise** | `fiezel-autonomy-config.js:9`: level advisory/canary/full, `full` butuh `ownerApproved`+UUID+timestamp; ambang 8 attempt/lengan terbukti coin-flip (lihat §4.3) |
| §24 | Rollback | **TERIMPLEMENTASI (jalur konten)** | `rollbackCount`, fail-closed pada mismatch hash di `content-canary.js` |
| §25 | Protokol update klien | **PARSIAL (~60%)** | `GET /api/config` KV boolean-only, `no-store`, TTL 60 dtk, fail-to-OFF — aset terkuat repo untuk §16/§25 (Opus §6); belum bertanda tangan, belum numerik |
| §26–28 | Semver + changelog Brain | **TERFRAGMENTASI** | Empat identitas versi independen: schema modul (`fiezel-core-brain-v2`), `FIEZEL_PAGE_BUILD='m025-173'` (`core-config.js:19`), `DIAG_BUILD`, `SW_REV`; tidak ada manifest yang memetakan gabungannya |
| §30–31 | Data quality + confidence gate | **PARSIAL** | Confidence gate Brain 0,25 ada; kualitas konten non-grammar belum beres (lihat §4.4) |
| §36 | Keamanan/signing | **PRIMITIF SAJA** | `workers/api/util-hmac.js` HMAC-SHA256 (simetris — tidak bisa diverifikasi klien tanpa membocorkan kunci); Ed25519 evidence envelope ada di tooling Node (`content-evidence-origin.js`), bukan verifikasi runtime browser |
| §40 | 8+1 dokumen wajib | **SEBELUMNYA TIDAK ADA** | Kesembilan dokumen bernama di spec absen saat audit council (Sol §2.5); dokumen ini + 3 saudaranya adalah yang pertama |
| §42 | 10 fase berurutan | **TIDAK BISA DIJALANKAN** | Fase 3–4 ~80% jadi, Fase 2 = 0%; urutan sekuensial memaksa menurunkan ulang pekerjaan selesai |

---

## 3. Jawaban delapan pertanyaan audit (master prompt §3)

### 3.1 Apa yang benar-benar terimplementasi?

- **12 modul Brain murni** di `features/brain/` (4.939 baris total per hitungan Sonnet,
  `../model-council-claude_sonnet_5_0.md` §1.1): core brain 1.203 baris, tutor brain 766 baris,
  plus BKT, ledger miskonsepsi, OLM, confusion matrix, affect, item prior, evidence credibility,
  step tutor, production grader, listening adaptive. Semua UMD, `nowMs` sebagai argumen, gate
  Node per modul. Gate yang dieksekusi PASS oleh council: `core-brain-v2-test.js`,
  `core-brain-v3-upgrade-test.js`, `tutor-brain-v3-test.js`, `mastery-bkt-test.js`,
  `regression-test.js` (Sol §1).
- **Stack analitik server** `workers/api/analytics/` (analytics-core 485 baris, route-events,
  store-d1, rollup, PRIVACY.md, migrasi SQL) — code-complete untuk kontrak penghitung produk,
  teruji lokal terhadap fake D1/KV, **belum pernah deploy**.
- **Mesin evolusi konten** end-to-end: `content-patch-gate.js` → `content-canary.js` (exposure
  maks 10% / 20 sesi / 30 hari, `content-canary.js:11–13`) → `content-promotion.js` →
  `content-adoption.js`, dengan ledger audit hash-chain (`fiezel-evolution-ledger.js`) dan
  level otonomi (`fiezel-autonomy-config.js`). `content-canary-test.js` PASS.
- **Simulator berseed** `adaptivity-simulation-v3.js` dengan gate determinisme.
- **Ritual rilis koheren**: SW_REV + DIAG_BUILD + FIEZEL_PAGE_BUILD naik bersama, ditegakkan
  `install-health-test.js` dan `pwa-release-coherence-test.js`.

### 3.2 Apa yang hanya terdokumentasi?

- **Antrean IndexedDB**: `analysis/idb-migration-design.md` bertanda "DESIGN ONLY"; produksi
  100% localStorage.
- **Registry model Brain, protokol rilis Brain, protokol eksperimen** — sebelum dokumen wave
  ini, hanya ada di master prompt, tidak di repo.
- **Verifikasi tanda tangan runtime di browser** — Ed25519 hanya ada di rehearsal Node sisi
  build (`content-evidence-origin.js`); tidak ada satu baris pun verifikasi di klien.

### 3.3 Apa yang parsial?

- **Ingestion tanpa idempotency**: agregasi berbasis increment; hanya DAU yang dideduplikasi;
  `retention_ping` tanpa token, bisa direplay dan menaikkan counter kohort setiap kiriman
  (Sol §4.3). Retry setelah timeout ambigu = hitung ganda semua counter.
- **Simulator dengan inferensi lemah**: 3 profil, 1 seed, `EPS=1e-9` sebagai ambang tie, tanpa
  bootstrap CI, bug censoring pada `timeToMasteryDays` (Opus §1.5).
- **Config seam terblokir**: parameter Brain adalah konstanta beku; `GET /api/config` baru
  boolean-only.
- **Empat identitas versi** yang belum dipetakan jadi satu bundle Brain yang koheren (Sol §2.1).

### 3.4 Apa yang saat ini mencapai pipeline pemilihan soal?

`buildAdaptivePool()` (`app.js:1925`) mem-skor kandidat dengan penalti
`|difficulty − targetD| × 1.4` di mana `targetD = policy.exactDifficulty ?? policy.targetDifficulty`
— komentar in-line di fungsi itu merujuk temuan T2/T3 council v3, artinya defek D1
("targetDifficulty no-op", dulunya di `app.js:1599`, `../model-council-claude_sonnet_5_0.md`
§1.2) **sudah ditutup di wiring v3 menurut pembacaan kode**. Catatan jujur: penutupan ini
diverifikasi dengan membaca kode, bukan probe numerik runtime — probe ulang adalah pekerjaan
gate, bukan klaim dokumen ini. Selain itu yang mencapai pemilihan soal: item prior kontinu
(`FiezelItemPrior.difficultyFor`), skor due-review dari model memori, dan bobot domain/skill
kebijakan.

### 3.5 Output Brain mana yang memengaruhi pengalaman murid nyata?

- **Penjadwalan memori**: `scheduleNext` memakai stability FSRS-lite sebagai penulis tunggal
  `nextReview` bila modul tersedia (kontrak B3, [BRAINCORE-V3-REPORT.md](BRAINCORE-V3-REPORT.md) §6.1).
- **Target difficulty / pool adaptif**: via `exactDifficulty` (§3.4).
- **Tutor**: `decideMove` (intervensi afek, scaffolding/fading), `selectNext` softmax berseed.
- **Fatigue**: ukuran sesi turun 12 → 6 saat perlambatan + penurunan akurasi terjadi bersamaan
  (`ADAPTIVITY-READINESS-REPORT.md`, diverifikasi runtime oleh Sonnet §1.1).
- **BKT: TIDAK** — eksplisit shadow-only, label diagnostik "bayangan — tanpa otoritas unlock"
  (Sol §2.1). Ini contoh otoritas bertahap yang benar.

### 3.6 Data apa yang sudah ada secara lokal?

29 kunci `fiezel-*` di `app.js` saja (grep saat audit ini; council menghitung 40+ lintas semua
modul, Opus §1.7), antara lain: `fiezel-v4-state` (state utama), `fiezel-adaptive-policy-v1`,
`fiezel-mastery-bkt-v1`, `fiezel-misconception-ledger-v1`, `fiezel-confusion-matrix-v1`,
`fiezel-learner-evidence-v1`, `fiezel-policy-outcome-v1`, `fiezel-learning-snapshot-v1`, kunci
canary/promotion, plus state core brain `fiezel-core-brain-v2`. Riwayat belajar penuh — attempt,
timing, prediksi, miskonsepsi — hidup lengkap di perangkat. **Inilah alasan metrik longitudinal
harus dihitung on-device**: datanya sudah di sana secara sah.

### 3.7 Data apa yang aman menjadi telemetri?

Hanya yang lolos empat saringan sekaligus (dikodifikasi di
[BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md) dan
[BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md)):
1. **Enum tertutup / bucket kasar** — tanpa free-text, tanpa nilai kontinu presisi, meneruskan
   disiplin `EVENT_SPEC` yang ada;
2. **Kardinalitas rendah** — keputusan per-sinyal ala Sonnet: sinyal yang terlalu mengidentifikasi
   tidak dikumpulkan sama sekali (`../model-council-claude_sonnet_5_0.md` §2.4);
3. **Grammar saja** — satu-satunya domain yang datanya bisa dipercaya (§3.8 dan §4.4);
4. **Nilai turunan, bukan mentah** — perangkat menghitung metrik longitudinal sendiri dan
   mengunggah digest bucket, meniru pola `retention_daily` yang sudah terbukti (klien kirim
   `cohort_day` + `day_index`, server hanya menyimpan nilai turunan — `analytics-core.js:178`).

### 3.8 State apa yang tidak boleh ditransmisikan?

- `installId` — **tidak pernah meninggalkan perangkat**, kontrak eksisting yang ditegakkan CI
  (`analytics-core.js:16`; server menerbitkan pepper via `GET /api/usage/pepper` justru supaya
  HMAC dihitung di perangkat, `route-events.js:6,13`).
- **Identifier stabil apa pun** (larangan permanen, argumen lengkap di
  [BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §7).
- `fiezel-v4-state` / `fiezel-sl-v1-state` dan state utama lain — profil belajar personal utuh.
- Ledger miskonsepsi penuh, vektor ability, array riwayat, state memori — server boleh
  mengevaluasi kelas kebijakan, tidak boleh merekonstruksi seorang anak (Sol §5.3).
- Jawaban mentah, teks opsi, prompt, audio, transkrip; timestamp presisi milidetik (`at` diterima
  tapi TIDAK PERNAH disimpan — `analytics-core.js:197`); GPS; data akun/quota (`user_id` — join
  analitik×quota diharamkan dan ditegakkan `FORBIDDEN_TABLES` di `analytics-store-d1.js`).

---

## 4. Empat fakta keras yang mengubah rencana

### 4.1 Paradoks linkabilitas: §12 spec tidak bisa dihitung dari telemetri §5–8 spec

Semua metrik longitudinal §12 (retensi tertunda, kurva lupa, transfer, learning gain) butuh tahu
bahwa murid hari-30 = murid hari-1. Kontrak yang sudah dikapalkan membuat itu **mustahil secara
matematis dan disengaja**: pepper dirotasi 24 jam, pepper N-2 dihapus permanen — materi kunci
untuk me-link tidak ada lagi (`analytics-core.js:10–20`), sampai-sampai WAU/MAU hanya bisa
dilaporkan sebagai rentang [max, sum] (`PRIVACY.md`). Resolusi yang dipilih: relokasi on-device
(keputusan #4 di [BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md)).

### 4.2 `features/ui/fiezel-ab-testing.js` adalah kode mati yang menyaru infrastruktur

POST ke `/api/analytics` yang **tidak terdaftar di backend mana pun**; session ID dari
`Math.random()` tak berseed (`fiezel-ab-testing.js:20,121`); tidak pernah dipanggil `app.js` —
tapi masih di-precache `sw.js:40` dan dimuat `index.html:386`, jadi terkirim ke setiap perangkat
untuk tidak melakukan apa-apa. Keempat model sepakat: karantina atau cabut, jangan diperluas.
Ini kategori ketiga yang tidak dinamai master prompt: bukan "terimplementasi" atau
"hanya-dokumen", melainkan **"terkirim tapi mati fungsional"** (Sonnet §1.5).

### 4.3 Gate promosi eksisting terbukti coin-flip

`content-promotion.js:10–13`: minimal 8 attempt kontrol + 8 canary, toleransi regresi 5 pp.
Monte Carlo Opus (200.000 trial/skenario, `../model-council-claude_opus_5_0.md` §3.2): kandidat
**identik** dipromosikan 53,9% — kandidat **15 pp lebih buruk** tetap lolos 27,5% — kandidat
**15 pp lebih baik** dibunuh 18,7%. Setengah-lebar CI 95% pada n=8 adalah ±30 pp; ambang 5 pp
pada pengukuran ±30 pp bukan gate. Ledger hash-chain dengan setia merekam keputusan yang tidak
membawa informasi. Ambang ini boleh hidup sebagai "ambang keselamatan runtime", tidak pernah
sebagai "bukti promosi pembelajaran" (Sol Fase 1).

### 4.4 Prasyarat yang tidak ditulis spec: konten

`ADAPTIVITY-READINESS-REPORT.md` §7: 842 soal listening masih bahasa Inggris, 1.091 opsi
listening + 1.050 opsi reading belum dilokalkan, 170 item reading berflag `evidence_mismatch`.
Grammar (129 template, 100% Indonesia, 139 lesson di graf kurikulum) adalah satu-satunya domain
yang layak dipercaya. Seluruh kerja brain-learning di-scope **grammar-only** sampai backlog QA
konten tertutup — mengoptimalkan kebijakan di atas item berbahasa salah berarti mengoptimalkan
error pengukuran. Deskripsi project ini sendiri mengatakannya: "perbaiki semua kesalahan yang
ada di grammar lesson".

---

## 5. Batas kejujuran dokumen ini

Semua path file, nomor baris, dan nilai konfigurasi di atas diverifikasi grep/baca langsung di
working tree branch `brain-learning-infra-v1` pada 2026-08-28. Hasil PASS test yang dikutip
adalah hasil eksekusi para model council pada audit mereka (didokumentasikan di laporan
masing-masing), bukan eksekusi ulang oleh penulis dokumen ini — dokumen ini tidak mengklaim
satu pun hasil PASS baru. Angka statistik (Monte Carlo, power, ICC) adalah komputasi council
yang sumbernya dikutip in-line; ICC 0,05–0,20 adalah rentang plausibel dari literatur, bukan
terukur dari FIEZEL — belum ada data per-murid untuk mengukurnya, dan itu sendiri bagian dari
argumen.
