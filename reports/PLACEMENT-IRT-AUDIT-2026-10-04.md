# Audit tes penempatan level & IRT 3PL — 2026-10-04

> **Status 2026-10-04:** P-A dan P-B **diperbaiki** di PR yang sama (lihat §5). P-C dan P-D belum.

**Basis:** branch `claude/inspiring-franklin-xml8hz` @ `cce82e55` (build `m025-442`), dibandingkan
dengan `main` @ `1dff4b6d` bila perilakunya berbeda. **Pertanyaan owner:** apakah algoritma IRT
3PL benar-benar mengukur kesulitan soal secara matematis, atau ada celah yang membuat jawaban
acak meloloskan murid ke level tinggi?

**Bukti yang bisa diulang:** `node tools/dev/placement-irt-audit-2026-10-04-probe.js [run] [strategi]`
- **A** — matematika 3PL langsung dari `features/brain/fiezel-core-brain.js`.
- **B** — aturan level tes penempatan *persis* seperti `app.js`, diekstrak dari sumbernya dan
  dijalankan di VM, 200.000 run Monte Carlo.
- **C** — tes penempatan sungguhan di Chromium, dijawab dengan strategi tanpa pengetahuan.

> Catatan lokasi. Level hasil tes penempatan **tidak** dihitung oleh IRT 3PL Core Brain. Ia dihitung
> oleh tangga bukti per band di `app.js` (`placementBandTally`/`placementBandLevel`, lulus band
> ≥ 0,625 dengan minimal 2 soal) ditambah plafon akurasi
> (`state.level=accuracy<45?1:Math.min(bandLevel, …<60?2:<72?3:<82?4:<92?5:6)`). Model 3PL Core Brain
> (`successProbability`, `estimateAbility`) dipakai sesudahnya untuk kesulitan adaptif, prediksi
> tutor, dan jendela tantangan. Audit ini memeriksa keduanya.

---

## 1. Vonis singkat

- **Matematika 3PL benar** (A1, A2). Kurva sesuai klaim komentar, dan informasi Fisher modul
  cocok dengan turunan numerik sampai 5 desimal.
- **Jawaban acak TIDAK meloloskan murid.** Penebak murni berakhir di A1 pada **99,74%** run (tes
  ringkas 12 soal) dan 99,97% (tes penuh 25 soal); ≥ B1 hanya 0,013%. Strategi tanpa pengetahuan
  di tes sungguhan (acak, selalu A, terpanjang, terpendek) bertahan di ±25%. Ujian lompat level
  (25 soal, ≥ 80%) dengan menebak: peluang lulus **1,2 × 10⁻⁸**.
- **Celah yang nyata ada di tempat lain:** tombol **petunjuk tata bahasa tetap tampil di mode ukur**
  (tes penempatan, ujian lompat level, gerbang lewati materi) di 100% layar soal. Membaca petunjuk
  saja memberi akurasi **77%** (85% di `main`); murid yang menguasai A1–A2 lalu membaca petunjuk
  untuk sisanya bisa ditempatkan di C1/C2 — lihat C.
- **Masalah sebaliknya lebih besar:** tes ringkas (bawaan, 12 soal) **menempatkan murid sejati
  terlalu rendah**, dan penaksir kemampuan Core Brain dari 12 jawaban tidak bisa melewati B1.

---

## 2. Ringkasan temuan

| ID | Tingkat | Temuan | Bukti |
|----|---------|--------|-------|
| P-A | **Tinggi** | Tombol petunjuk grammar tampil di mode ukur; petunjuk tingkat 1–3 menyebut jawaban | C |
| P-B | **Tinggi** | Tes ringkas menempatkan murid sejati 1–2 level terlalu rendah: plafon akurasi tes penuh dipakai di tes ringkas, dan 2 soal per band menuntut 2/2 | B2, B3 |
| P-C | Sedang | `estimateAbility()` (Elo, prior 1,5, K mengecil) dari 12 jawaban menaksir murid C2 sebagai B1; 15% penebak murni ditaksir A2 | A3 |
| P-D | Info | "Kesulitan soal" = indeks CEFR + prior per mode; kalibrasi dari murid nyata baru berlaku sesudah n ≥ 8 jawaban per soal — bukan IRT yang dikalibrasi | kode |
| — | Bersih | Rumus 3PL & informasi Fisher benar; tebakan acak tidak lolos penempatan maupun ujian | A1, A2, B1, C |

---

## 3. Yang terukur

**A1 — kurva** P = 0,25 + 0,75·σ(1,5·(θ−b)): P(θ=b) = 0,6250; satu tingkat di atas 0,8632; satu
di bawah 0,3868; empat di bawah 0,2519 (≈ lantai tebakan). Sesuai komentar `successProbability`.

**A2 — informasi Fisher** `a²·(Q/P)·((P−c)/(1−c))²` vs `(dP/dθ)²/(P·Q)` numerik pada θ−b ∈
{−3, −1,5, −0,5, 0, 0,5, 1,5, 3}: identik di semua titik (mis. 0,33750 vs 0,33750 di θ=b).

**A3 — `estimateAbility()` dari 12 jawaban** (2 per level, urutan acak, 4.000 run): rerata
taksiran θ=1 → 1,35; θ=3 → 2,01; θ=6 → **3,01** (97% ditaksir B1); penebak → 1,08 (15% ditaksir
A2). Langkah `k = 0,62/√(1+bukti)` dari prior 1,5 tidak sempat menempuh jarak ke atas dalam 12
jawaban. Tidak menentukan level penempatan, tetapi menyetir kesulitan adaptif sesi-sesi awal.

**B1 — penebak acak (p=0,25), 200.000 run:**

| Tes | A1 | A2 | B1 | ≥ B2 |
|-----|----|----|----|------|
| Ringkas 12 soal (bawaan) | 99,742% | 0,245% | 0,012% | 0,001% |
| Penuh 25 soal | 99,969% | 0,030% | 0,001% | 0,000% |

**B2 — murid sejati di tes ringkas** (peluang benar per band dari kurva 3PL yang sama, 50.000
run): murid **B1** (θ=3) ditempatkan A1 38%, A2 46%, **B1 13%**; murid **B2** (θ=4) A1 9%, A2 34%,
B1 35%, **B2 17%**; murid **C2** (θ=6) **C2 26%**, C1 42%. Penyebab pertama: plafon akurasi
45/60/72/82/92 dikalibrasi untuk blueprint penuh yang berat di pangkal (11 dari 25 soal A1–A2),
lalu dipakai juga untuk blueprint ringkas yang rata (2 per band). Murid B1 sejati berekspektasi
±56% benar di tes ringkas → plafon A2.

**B3 — tangga band saja (tanpa plafon akurasi), tes ringkas:** penebak tetap A1 **99,60%**
(≥ B1 0,03%), dan murid sejati naik (B1: 23% tepat, B2: 23%, C2: 26%). Penyebab kedua tetap
tersisa: dengan 2 soal per band dan ambang 0,625, murid harus benar **2/2** di band levelnya
sendiri, padahal peluangnya 0,625² ≈ 39%. Komentar kode menyebut ini "ongkos yang diterima" dan
bahwa "mesin adaptif terus mengoreksi level" — tetapi level terverifikasi hanya naik lewat
penempatan atau ujian lompat level (`app.js:1569`, `:1595`); tidak ada koreksi otomatis.

**C — tes penempatan sungguhan** (Chromium, tes ringkas 12 soal, ±20 run per strategi; konteks
browser baru tiap 10 run karena ingatan-soal app sengaja menolak mengulang soal):

| Strategi tanpa pengetahuan | Branch: akurasi | Branch: level | `main`: akurasi | `main`: level |
|---|---|---|---|---|
| acak | 25,4% | A1 19/19 | 23,2% | A1 19/19 |
| selalu A | 21,8% | A1 18/18 | — | — |
| pilihan terpanjang | 26,8% | A1 19/19 | — | — |
| pilihan terpendek | 21,3% | A1 20/20 | — | — |
| **baca petunjuk** (lampu tingkat 1–4, pilih yang disebut) | **77,2%** | A1 16, A2 2, **C2 1** | **85,5%** | A1 15, A2 1, **C2 3** |

Tombol petunjuk tampil di **108 dari 108** layar soal tes penempatan. Run rinci (`DBG=1`)
menunjukkan polanya: pembaca-petunjuk benar 2/2 di band B1–C2 (soal grammar ber-petunjuk) tetapi
1/2 di A1–A2 (soal kosakata/listening tanpa petunjuk), jadi tangga band berhenti di A1 **hanya
karena** band bawahnya tidak punya petunjuk. Murid yang jujur menguasai A1–A2 lalu membaca
petunjuk untuk sisanya melewati setiap band → C1/C2. Perbaikan G8 (tingkat 4 tidak lagi membuka
`explain.why`) menurunkan kebocoran 85,5% → 77,2%, tetapi tingkat 1–3 masih cukup menyebut
bentuk yang benar.

---

## 4. Rekomendasi

1. **P-A** — sembunyikan tombol petunjuk (dan popover-nya) saat `MEASURE` (tes penempatan, ujian
   lompat level, gerbang lewati materi). Satu syarat di `quizLoop` (`app.js`, topbar kuis).
2. **P-B** — untuk tes ringkas: buang plafon akurasi (tangga band sudah menahan tebakan: 99,6% A1)
   atau kalibrasi plafon per blueprint; dan pertimbangkan 3 soal per band dengan ambang 2/3 untuk
   band yang sedang diuji, atau tes adaptif bertingkat (naik band selama lulus, berhenti saat gagal).
3. **P-C** — `estimateAbility` mulai dari prior = level hasil penempatan (bukan 1,5), atau ganti
   langkah Elo dengan taksiran EAP/MAP 3PL untuk n kecil.
4. **P-D** — dokumentasikan bahwa "kesulitan soal" adalah prior + kalibrasi online, supaya tidak
   dibaca sebagai IRT yang sudah dikalibrasi.

---

## 5. Status perbaikan (2026-10-04, disetujui owner)

**P-A — diperbaiki.** Tombol petunjuk tata bahasa tidak dirender lagi di mode ukur (`MEASURE`
atau `cfg.noHints`: tes penempatan, ujian lompat level, gerbang lewati materi); "intip arti" di
susun kata ikut hilang di mode ukur, dan popover petunjuk yang masih terbuka ditutup saat sesi ukur
dimulai. Sesi belajar biasa tidak berubah. Probe C diulang sesudah perbaikan (10 run):

| Strategi | Sebelum (branch) | Sesudah |
|---|---|---|
| baca petunjuk | 77,2% benar; A1 16, A2 2, C2 1 | **17,5% benar; A1 10/10** |
| acak | 25,4%; A1 19/19 | 25,8%; A1 10/10 |
| layar dengan tombol petunjuk | 108/108 | **0/120** |

**P-B — diperbaiki untuk tes ringkas** (`placementLiteBandLevel`). Plafon akurasi tidak dipakai
lagi di tes ringkas; band yang lulus 2/2 tetap dinaiki seperti biasa; satu band dasar (A1 atau A2)
yang hanya separuh benar dimaafkan SEKALI, dan hanya bila band berikutnya membuktikannya. Tes penuh
25 soal tidak berubah. Probe B (kurva 3PL, 50.000 run per murid, 200.000 untuk penebak):

| Murid | Tertahan di A1 sebelum | Tertahan di A1 sesudah | Tepat di levelnya sebelum → sesudah |
|---|---|---|---|
| θ=3 (B1) | 38,0% | **6,5%** | 13,4% → 31,9% |
| θ=4 (B2) | 9,4% | **0,4%** | 17,2% → 24,4% |
| θ=5 (C1) | 2,0% | **0,0%** | 22,6% → 23,0% |
| θ=6 (C2) | 0,5% | **0,0%** | 26,2% → 26,3% |
| penebak acak | A1 99,74%, ≥ B1 0,013% | A1 96,24%, ≥ B1 0,32% | — |

Ongkosnya dicatat terang: penebak murni kini A2 pada 3,4% run (dulu 0,25%), dan murid A1 tepat-di-
ambang (θ=1) naik ke A2 pada 19% run. Penempatan satu tingkat terlalu tinggi dikoreksi otomatis oleh
masa percobaan `levelTrust` (kesalahan di level baru menurunkannya); tertahan di A1 tidak punya
koreksi otomatis, jadi pertukaran ini sengaja ke arah itu. Dua soal per band tetap batas presisi tes
ringkas - tes 25 soal tetap tersedia. Gerbang: `tests/placement-accuracy-test.js` bagian L1-L6.

**P-C, P-D — belum dikerjakan.**
