# Braincore → Autonomous Brain — Peta Posisi dan Sisa Langkah

**Basis:** FIEZEL 5.19.0 · build `m025-213` · bundle Brain `3.0.0` · **Tanggal:** 2026-08-31
**Pertanyaan yang dijawab:** kalau Braincore sudah v3, di mana persisnya kita berdiri hari ini,
dan berapa langkah lagi sampai otak ini benar-benar otonom?

Dokumen ini mengikuti aturan yang sama dengan [BRAINCORE-V3-REPORT.md](BRAINCORE-V3-REPORT.md)
dan [BRAIN-LEARNING-ARCHITECTURE-AUDIT.md](BRAIN-LEARNING-ARCHITECTURE-AUDIT.md): setiap klaim
posisi harus bisa ditunjuk ke berkas dan baris, dan yang belum terbukti ditulis sebagai belum
terbukti. Tidak ada satu pun langkah di bawah yang diklaim sudah selesai.

---

## 1. Vonis satu paragraf

Braincore v3 adalah otak yang **adaptif**, bukan otak yang **otonom**. Ia memodelkan murid
dengan baik — 21 modul, 8 di antaranya benar-benar memutuskan apa yang dilihat murid — dan ia
sudah punya satu lingkar umpan balik nyata di tingkat sesi (kebijakan → sesi → skor hasil →
kebijakan berikutnya, `app.js` `evaluatePolicyOutcome`/`deriveAdaptivePolicy`). Yang belum ada
adalah tiga hal yang membedakan adaptif dari otonom: **(a)** otak tidak mengukur efeknya sendiri
terhadap belajar jangka panjang (modul pengukurnya ada, dimuat, tapi nol pemanggil), **(b)**
keputusan otak atas dirinya sendiri masih diambil dari skor bobot-tangan lewat `if/else`, bukan
dari interval statistik — kelas cacat yang persis sama dengan gerbang promosi 8-attempt yang
sudah dibuktikan lempar-koin oleh council, dan **(c)** otak tidak boleh dan tidak bisa mengubah
parameternya sendiri: `fiezel-brain-config.js` secara eksplisit menyatakan dirinya tidak dibaca
runtime, dan seluruh perubahan parameter harus lewat commit. Sisa perjalanannya **enam langkah**:
lima bisa ditulis sebagai kode hari ini, satu adalah keputusan OWNER yang tidak bisa
digantikan kode apa pun.

---

## 2. Definisi: "autonomous" itu tingkat berapa?

"Berapa langkah lagi" tidak punya arti sebelum garis finisnya didefinisikan. Tangga di bawah
memakai satu kriteria per anak tangga: **apa yang bisa berubah tanpa manusia menyentuh apa pun.**

| Tingkat | Nama | Yang bisa berubah tanpa manusia | Status FIEZEL |
|---|---|---|---|
| L0 | Aturan tetap | tidak ada | terlampaui |
| L1 | **Adaptif** | pilihan soal, jadwal, kesulitan, scaffold — per murid | **tercapai** |
| L2 | **Sadar-diri** | otak mengukur efek keputusannya sendiri (gain, retensi, kalibrasi) | **parsial** |
| L3 | **Menilai-diri** | verdict statistik yang sah atas efeknya sendiri, boleh menjawab "belum tahu" | infrastruktur ada, jalur mati |
| L4 | **Menyetel-diri** | parameter otak (BKT/FSRS/ambang) berubah sendiri dalam batas, dengan rollback | belum |
| L5 | **Memperluas-diri** | konten/soal baru dibuat, diuji, dipromosikan sendiri | kerangka ada, kandidat-saja |
| L6 | Menerbitkan-diri | rilis/deploy tanpa manusia | **dilarang permanen** (§6) |

Garis finis yang jujur untuk FIEZEL adalah **L5**, bukan L6 — dan alasannya bukan kemalasan,
melainkan [MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §4–§5 yang menjadikan
otoritas rilis milik OWNER secara struktural.

---

## 3. Posisi hari ini, dengan bukti

### 3.1 L1 — tercapai, dan bisa diverifikasi

`FiezelBrainManifest.describe()` hari ini: **21 modul — 8 active, 6 shadow, 7 off**
(`features/brain/fiezel-brain-manifest.js:130`). Delapan yang `active` benar-benar menyentuh
murid: memori FSRS-lite, seleksi tutor, prior miskonsepsi, prior kesulitan item, bobot
kredibilitas bukti, target sukses dari afek, kalibrasi item Elo, dan perencana sesi SRL.

Gerbang yang saya jalankan pada pohon kerja ini, semuanya **PASS**:
`tests/core-brain-v3-upgrade-test.js`, `tests/tutor-brain-v3-test.js`, `tests/brain-manifest-test.js`,
`tests/brain-config-test.js`, `tests/mastery-bkt-test.js`, `tests/olm-test.js`, `tests/item-calibration-test.js`,
`tests/srl-coach-test.js`. (Delapan berkas ini, bukan seluruh 253 invokasi test di
`.github/workflows/quality.yml`.)

### 3.2 L2 — parsial, dan ini yang paling mengejutkan

Lingkar umpan balik tingkat sesi **sudah hidup**: `evaluatePolicyOutcome()` menilai tiap sesi,
`deriveAdaptivePolicy()` membacanya kembali dan benar-benar mengubah kebijakan berikutnya —
`recent_policy_outcome_negative` memotong `sessionSize` ×0,75 dan menurunkan `targetDifficulty`
satu tingkat; `recent_policy_outcome_positive` menaikkannya. Itu lingkar otonom yang nyata, dan
sudah berjalan di perangkat murid.

Tetapi **mesin pengukur belajarnya mati**:

| Modul | Dimuat halaman? | Dipanggil `app.js`? | Otoritas manifest |
|---|---|---|---|
| `fiezel-learning-metrics.js` (gain, retensi@gap, Brier, ketergantungan hint) | ya (`index.html:552`) | **0 referensi** | `off` |
| `fiezel-metrics-digest.js` (digest bucket aman-privasi) | ya (`index.html:553`) | **0 referensi** | `off` |
| `fiezel-brain-config.js` (registry parameter + BOUNDS) | ya (`index.html:551`) | **0 referensi** | `off` |
| `fiezel-retention-probe.js` (post-test tertunda 3/7/21 hari) | **tidak dimuat sama sekali** | 0 | `off` |

Artinya: otak tahu murid menjawab benar hari ini, tetapi **tidak pernah menanyakan apakah yang
dikuasai kemarin masih ada minggu depan** — padahal justru itu satu-satunya angka yang
membedakan "mastery" dari "pola jawaban yang menguap semalam" (alasan modul probe ditulis:
`features/brain/fiezel-retention-probe.js:1-22`).

### 3.3 L3 — infrastrukturnya sudah ada, tapi tidak dipakai otak

`fiezel-stat-gate.js` (Wilson, Newcombe, non-inferioritas, fail-safe ke `hold`) sudah ditulis
dan sudah dipakai — tetapi hanya oleh pipeline konten (`content-promotion.js:6`), **bukan** oleh
otak. Keputusan otak atas dirinya sendiri masih memakai skor komposit bobot-tangan
(`0,30·completion + 0,35·accuracy + 0,15·adherence + 0,10·calibration + 0,10·improvement`) dan
ambang `if/else` (`score<45 → negative`, `score≥72 → positive`). Bobot itu tidak pernah
divalidasi, dan ambangnya tidak membawa interval — persis bentuk cacat yang dibuktikan council
lewat 200.000 trial Monte Carlo pada gerbang lama: kandidat identik dipromosikan 53,9%,
kandidat 15pp lebih buruk masih lolos 27,5% (`features/brain/fiezel-stat-gate.js:1-20`).

### 3.4 L5 — kerangkanya utuh, tetapi lingkarnya terputus di dua tempat

Lapisan evolusi konten 5.18.0 lengkap dan lulus test: `fiezel-meta-learning.js`,
`fiezel-prompt-library.js`, `fiezel-evolution-ledger.js` (hash-chain), `fiezel-autonomy-config.js`
(advisory/canary/full + halt), `fiezel-self-refine.js`, `fiezel-evolution-loop.js`, plus tiga
endpoint owner-only di `fiezel-core-worker.js:781,789,794`. Terputusnya di sini:

1. **Tidak ada di aplikasi.** Enam modul itu **nol referensi** di `app.js`, `index.html`, dan
   `sw.js` — mereka hidup di Node dan di Worker, tidak di perangkat murid.
2. **Kandidat-saja secara desain.** Jalur produksi mengembalikan
   `authority:'candidate-only', gateStatus:'UNVERIFIED_LOCAL_GATES_REQUIRED'`
   (`fiezel-core-worker.js:820`) — gerbang lokal belum pernah dijalankan pada kandidat itu,
   jadi tidak ada kandidat yang bisa naik sendiri.

---

## 4. Tiga temuan yang mengubah hitungan langkah

**T1 — Peta otoritas sudah basi, dan tidak ada gerbang yang menangkapnya.**
Manifest menyatakan `stepTutor: 'off'` dan `productionGrader: 'off'` dengan alasan tertulis
"NOL referensi di app.js" (`features/brain/fiezel-brain-manifest.js:47,149,150`). Itu tidak lagi
benar: `stepTutorGuidance()` dipanggil dari jalur render jawaban (`app.js:7771`), dan
`FiezelProductionGrader.grade` menilai jawaban cloze murid (`app.js:7983`). Dua modul yang
dipeta sebagai "tidak pernah dipanggil" hari ini **mengubah apa yang dilihat dan bagaimana
dinilai murid**. `tests/brain-page-wiring-test.js` tidak menangkapnya karena ia hanya menguji arah
sebaliknya (yang berwenang harus dimuat), bukan "yang `off` ternyata dipanggil". Otonomi
dibangun di atas peta; peta yang bohong adalah fondasi yang bohong.

**T2 — Sensor jangka panjang belum terpasang** (§3.2). Otak tidak bisa menyetel dirinya menuju
sesuatu yang tidak ia ukur. Retensi 3/7/21 hari dan Brier adalah fungsi objektifnya; keduanya
belum pernah dihitung di perangkat.

**T3 — Statistik sudah ada di rumah, tapi otak tidak memakainya** (§3.3). Ini langkah termurah
dengan hasil terbesar: modulnya sudah ditulis, sudah diuji, sudah dimuat halaman
(`index.html:549`).

---

## 5. Enam langkah

Setiap langkah membawa **kriteria keluar** yang bisa dibantah. Urutannya mengikat: langkah N+1
tidak bermakna tanpa N, karena menyetel parameter sebelum bisa mengukur hasil adalah menebak
dengan lebih banyak langkah.

### Langkah 1 — Jujurkan peta, hidupkan sensor (L2 penuh)

- Perbaiki `authorityMap`: `stepTutor` dan `productionGrader` → `active` (bukti: `app.js:7771`,
  `app.js:7983`); beri catatan eksplisit bahwa `statGate` `off` di jalur aplikasi tetapi
  berwenang di jalur pipeline (`content-promotion.js:6`).
- Tambah gerbang arah-kedua di `tests/brain-page-wiring-test.js`: modul berotoritas `off` yang
  namanya muncul sebagai pemanggil di `app.js` = **FAIL**. Ini yang mencegah T1 terulang.
- Muat `fiezel-retention-probe.js` di `index.html` + precache `sw.js`, sambungkan penjadwal
  (offset 3/7/21 hari, jitter berseed) dan evaluatornya.
- Sambungkan `fiezel-learning-metrics.js` ke riwayat nyata; `predicted` sudah ditulis ke baris
  riwayat (`app.js:1982`), jadi Brier bisa dihitung hari ini juga.

**Kriteria keluar:** panel diagnostik bisa menyebut lima angka otak tentang dirinya sendiri —
learning gain, retensi@3/7/21 hari, Brier, ketergantungan hint, persistensi miskonsepsi — dan
`tests/brain-manifest-test.js` + gerbang baru hijau. Ritual bump `SW_REV`/`DIAG_BUILD`/`FIEZEL_PAGE_BUILD` ikut.

### Langkah 2 — Ganti vibes dengan interval (L3)

- `evaluatePolicyOutcome` berhenti memutuskan `positive/negative` dari ambang skor; verdict
  diambil `FiezelStatGate.verdict` atas selisih proporsi (lengan = kebijakan sebelumnya vs
  sekarang), non-inferioritas margin yang ditulis eksplisit.
- `hold` menjadi keluaran sah dan **tidak berbatas waktu**: saat bukti bisu, kebijakan lama
  dipertahankan — kontrak yang sudah ditegakkan `content-promotion.js` dan wajib ditiru di sini.
- Skor komposit lama tetap dilaporkan sebagai deskripsi, kehilangan status sebagai pemutus.

**Kriteria keluar:** tidak ada satu pun perubahan kebijakan yang terjadi pada bukti yang tidak
bisa melewati batas bawah CI; gerbang baru membuktikan bahwa data 8-attempt menghasilkan `hold`,
bukan keputusan.

### Langkah 3 — Eksperimen N-of-1 di dalam satu murid (L3 penuh)

A/B antar-murid sudah **dibatalkan dengan matematika** ([BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md)
§1): efek 0,2 SD butuh ~392 murid per lengan sedangkan kapasitas aplikasi di-hard-cap 250
(`fiezel-core-worker.js:5`, `workers/api/wrangler.toml:104`). Penggantinya yang sah sudah
tercatat berstatus `research` dan belum pernah dikontrak: **interleaved within-subject** dengan
assignment FNV deterministik per item, dievaluasi stat-gate, dengan simulasi berseed
(`adaptivity-simulation-v3.js`) sebagai prior.

**Kriteria keluar:** otak bisa menjawab "apakah perubahan INI menolong murid INI" dengan
interval yang bisa diaudit ulang (dua run seed sama = byte-identik), bukan dengan selisih titik.

### Langkah 4 — Parameter jadi permukaan yang bisa dikendalikan (prasyarat L4)

- Modul brain membaca `FiezelBrainConfig` saat runtime (hari ini file itu menyatakan sendiri
  bahwa ia **tidak** dibaca runtime — `features/brain/fiezel-brain-config.js:24`);
  `sanitize()` + `BOUNDS` sudah ada dan sudah menolak string/NaN/field asing.
- Bawa `fiezel-evolution-ledger.js` (hash-chain, `verifyChain`, `prune` re-chain) ke perangkat
  untuk mencatat perubahan parameter: setiap delta punya entri, alasan, hasil, dan jalur balik.
- Kontrak sinkronisasi `tests/brain-config-test.js` (default wajib identik dengan konstanta sumber)
  diperluas: yang dites bukan lagi kesamaan angka, melainkan bahwa modul benar-benar membaca
  registry.

**Kriteria keluar:** satu parameter bisa berubah tanpa commit, dan setiap perubahan bisa
diverifikasi rantainya serta dikembalikan.

### Langkah 5 — Penyetelan-diri berbatas + rollback otomatis (**L4 — ini titik "autonomous"**)

- Pengusul: dari KPI Langkah 1 + eksperimen Langkah 3, usulkan delta parameter **di dalam
  BOUNDS**; hanya dieksekusi bila stat-gate memberi `promote`.
- Rollback otomatis pada regresi; kill switch memakai `halt` yang sudah ada di
  `fiezel-autonomy-config.js`; rate limit keras (maksimum satu parameter per N sesi) supaya dua
  perubahan tidak pernah bersaing memperebutkan atribusi.
- Semua ke ledger Langkah 4.

**Kriteria keluar:** otak memperbaiki dirinya di antara dua rilis, di perangkat, dengan bukti —
dan gerbang membuktikan bahwa parameter di luar BOUNDS mustahil tercapai lewat jalur mana pun.

### Langkah 6 — Perpanjangan-diri konten + keputusan otoritas (L5)

Kode: jalankan gerbang lokal atas kandidat sehingga `gateStatus` bisa berpindah dari
`UNVERIFIED_LOCAL_GATES_REQUIRED`; sambungkan canary → stat-gate → resi adopsi (semua modulnya
sudah ada: `content-canary.js`, `content-promotion.js`, `content-adoption-receipt.js`).

Non-kode, dan ini blokirnya: [MASTER-ONLY-GOVERNANCE.md](MASTER-ONLY-GOVERNANCE.md) §4–§5
melarang promosi otomatis terpicu ambang secara struktural, sementara
`fiezel-autonomy-config.js` menyediakan level `full` yang butuh `ownerApproved` + `ownerRef` +
`approvedAt`. Keduanya tidak bisa benar sekaligus. **Yang harus OWNER putuskan, tertulis:**
kelas perubahan apa yang boleh terbit tanpa manusia (mis. "hanya penulisan ulang penjelasan
pada item yang sudah kanonik, tidak pernah kunci jawaban"), dengan otorisasi yang bertanda
tangan, berbatas waktu, dan bisa dicabut.

**Kriteria keluar:** satu kandidat konten menempuh insight → prompt → kandidat → gerbang →
canary → verdict stat-gate → adopsi, dengan rantai ledger utuh, tanpa manusia di tengahnya —
dalam kelas perubahan yang OWNER izinkan secara eksplisit.

---

## 6. Yang tidak akan pernah otonom, dan kenapa

Kejujuran ini bagian dari peta, bukan catatan kaki:

1. **Kalibrasi item permanen.** Estimasi kesulitan item baru reliabel di kisaran 200–250
   pelajar; kapasitas aplikasi 250 dengan aktif realistis jauh lebih kecil. Delta Elo C1
   sengaja dikekang (clamp 0,6, gerbang n≥8) justru karena alasan ini.
2. **Kualitas pelafalan.** C2 hidup tanpa ASR baru: yang bisa diukur jujur adalah *coverage*,
   dan κ bukti speaking dikunci ≤0,6 selamanya.
3. **Otoritas rilis (L6).** Milik OWNER, permanen. Otak boleh mengusulkan dan membuktikan;
   menerbitkan bukan wewenangnya.

---

## 7. Jawaban singkatnya *(posisi saat peta ini ditulis, 2026-08-30)*

**Posisi:** L1 penuh + L2 parsial. **Sisa: enam langkah** menuju L5 — lima kode, satu keputusan
OWNER. Titik di mana kata "autonomous brain" mulai jujur dipakai adalah **Langkah 5**; Langkah 6
menambahkan konten, bukan otonomi. Langkah 1 dan 2 bisa dimulai hari ini dan keduanya
mengaktifkan modul yang **sudah ditulis, sudah diuji, dan sudah dimuat halaman** — biaya
terbesarnya bukan menulis kode baru, melainkan menyambungkan yang sudah ada dan berhenti
memakai skor bobot-tangan sebagai pemutus.

---

## 8. Status pelaksanaan (diperbarui 2026-09-01)

Bagian ini dicatat DI PETA, bukan hanya di PR, supaya siapa pun yang membuka berkas ini tidak
membaca §7 sebagai keadaan hari ini.

| Langkah | Status | Bukti |
|---|---|---|
| 1 — jujurkan peta, hidupkan sensor | selesai | `tests/brain-manifest-test.js` (otoritas DITURUNKAN dari app.js, dua arah), `tests/brain-page-wiring-test.js` W8 |
| 2 — interval menggantikan vibes | selesai | `fiezel-policy-verdict.js` + `tests/policy-verdict-test.js`; verdict hanya menimpa saat ia punya bukti |
| 3 — eksperimen N-of-1 | selesai | `fiezel-nof1.js` + `tests/nof1-test.js` (blok RED: hash lama seimbang SEMPURNA dan tetap cacat) |
| 4 — parameter jadi permukaan + ledger | selesai | `fiezel-param-ledger.js` + `tests/param-ledger-test.js` |
| 5 — penyetelan-diri berbatas | **modulnya selesai, otoritasnya `off`** | `fiezel-self-tune.js` + `tests/self-tune-test.js` (7 pagar, tiap pagar terbukti bisa merah) |
| 6 — perpanjangan-diri konten | **diblokir keputusan OWNER, bukan kode** | lihat §5 Langkah 6 |

### Sisipan yang tidak ada di peta asli: sinkron antar-perangkat (S1–S6)

Peta ini ditulis sebelum OWNER menambahkan syarat "Braincore harus bisa sinkron antar-perangkat
sebelum masuk self-tuning lebih jauh". Enam sub-langkah itu selesai, dan satu hasilnya mengubah
cara memikirkan sisanya: **model otak tidak punya operasi merge yang bermakna, tetapi karena
modul v3 murni, model adalah fungsi deterministik dari aliran percobaan** — jadi yang di-merge
adalah ALIRANNYA, diurutkan waktu, lalu diputar ulang (`tests/brain-replay-equivalence-test.js`).
Sinkron tidak butuh identitas baru dan tidak menyentuh analytics anonim sama sekali.

S1b (sidecar Speaking/Listening) sengaja ditunda saat S1 karena satu-satunya penulisnya ada di
luar `app.js`; ia ditutup pada 2026-09-01, dan gerbangnya (`tests/side-state-scope-test.js` C7–C7d)
menjalankan penulis dan pembaca ASLI lalu menuntut keduanya bertemu di kunci yang sama.

### Rantai konten akhirnya berjalan atas data nyata

`fiezel-content-chain.js` menghitung posisi kandidat, tetapi ia modul murni: ia hanya menerima
laporan yang sudah jadi. Selama tidak ada yang memberinya laporan dari bank soal sungguhan, ia
hidup dari fixture — dan `gateStatus:'UNVERIFIED_LOCAL_GATES_REQUIRED'` yang dikembalikan
worker tetap menggantung dalam praktik.

`tools/content-chain-report.mjs` menutup itu. Ia menjalankan gerbang lokal deterministik atas
`vocabulary-master.json` asli lalu menyusun laporannya, dan hasilnya bisa dilihat siapa pun:

```
FIEZEL content chain — proof-vocab_00006-5.19.0
  gerbang lokal: LULUS (guarded-patch-v1, kanonik utuh: true)
  gateStatus  : LOCAL_GATES_PASSED
  tahap       : local_gate
  penghalang  : chain_canary_not_configured
  keputusan OWNER diperlukan: true
```

Alat itu HANYA MEMBACA, dan itu diperiksa dari luar: `tests/content-chain-report-test.js` menghitung
sha256 ketiga bank kanonik sebelum dan sesudah, karena jaminan yang dihitung oleh pihak yang
dijaga bukan jaminan. Blok RED-nya membuktikan pengukuran itu sensitif terhadap satu byte.

### Kenapa Langkah 5 berhenti di `off`

Modulnya siap dan pagarnya terbukti. Yang belum ada adalah **izinnya**. Menyalakan
penyetelan-diri berarti memutuskan kelas perubahan apa yang boleh berjalan tanpa manusia — itu
keputusan OWNER, bukan pekerjaan kode, dan ia satu-satunya langkah di peta ini yang tidak bisa
dibatalkan dengan `git revert`: parameter yang sudah bergeser di perangkat murid tidak ikut
kembali saat kodenya dikembalikan.
