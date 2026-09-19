# LAPORAN AUDIT MENYELURUH BRAINCORE FIEZEL & PETA UPGRADE

**Basis Sistem:** FIEZEL 5.19.0 · Build `m025-337` · Bundle Brain `3.10.0` · Branch `main`  
**Objek Audit:** 31 Modul di [`features/brain/`](file:///c:/Users/hp/fiezel-apps/features/brain), Pengait di [`app.js`](file:///c:/Users/hp/fiezel-apps/app.js), Backend Kurikulum [`backend/braincore.py`](file:///c:/Users/hp/fiezel-apps/backend/braincore.py), serta Jembatan Edge di [`workers/api/`](file:///c:/Users/hp/fiezel-apps/workers/api).  
**Karakter Dokumen:** **Laporan Audit & Peta Strategis Saja** (tanpa perubahan kode produksi, tanpa perubahan versi).

---

## 1. PETA ARSITEKTUR BRAINCORE SAAT INI

Braincore FIEZEL beroperasi dengan filosofi **Local-First & Zero Runtime Cloud Cost**: seluruh keputusan pedagogis siswa detik demi detik dihitung langsung di peramban murid secara deterministik tanpa bergantung pada API LLM eksternal.

### 1.1 Diagram Aliran Data Belajar Murid (Siklus Nyata)

```
 [Interaksi Murid: Jawaban, Waktu (ms), Hint, Keyakinan, Opsi Terpilih]
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │  FiezelEvidenceCredibility (kappa: 0.3..1.5) │
        │  - Tebakan cepat (<1.8s): kappa = 0.3        │
        │  - Produksi mandiri (cloze): weight = 1.5    │
        └──────────────────────┬───────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────────┐     ┌───────────────────────────────────┐
│     FiezelMasteryBKT (L)      │     │  FiezelCoreBrain (Kemampuan Laten)│
│ • Update posterior Bayes per  │     │ • IRT 3PL (a=1.5, c=0.25)         │
│   lesson (L0, T, slip, guess) │     │ • Ketidakpastian Fisher-Glicko    │
│ • Gerbang mastery: L>=0.95 &  │     │ • Regresi momentum residual       │
│   n>=5 -> Buka lesson lanjut  │     │ • Peluang sukses target ~85%      │
└───────────────┬───────────────┘     └─────────────────┬─────────────────┘
                │                                       │
                ├───────────────────┬───────────────────┘
                ▼                   ▼
┌───────────────────────────────┐ ┌───────────────────────────────────────┐
│  FiezelMisconceptionLedger    │ │   FiezelAffect & FiezelSrlCoach       │
│ • DINA log-odds via opsi      │ │ • Deteksi frustrasi / bosan / fatigue │
│   distraktor berpola          │ │ • Pergeseran targetSuccess (0.75-0.9) │
│ • Histeresis 0.7 masuk/0.3 out│ │ • Kalibrasi prediksi Brier & refleksi │
└───────────────┬───────────────┘ └─────────────────┬─────────────────────┘
                │                                   │
                └───────────────────┬───────────────┘
                                    ▼
        ┌────────────────────────────────────────────────────────┐
        │       FiezelTutorBrain v3 (Pemilih Soal & Scaffold)     │
        │ • Titik frontier ZPD & penalti frekuensi (-0.3*seen)   │
        │ • Softmax sampling suhu 0.35 di atas 4 kandidat        │
        │ • Scaffold fading: probe -> worked -> guided -> free   │
        └───────────────────────────┬────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────┐
│ FiezelCoreBrain.updateMemory  │               │   UI / Umpan Balik    │
│ • Model FSRS-lite             │               │ • Tuntunan StepTutor  │
│ • Retrievability eksponensial │               │ • Kartu AI Booster    │
│ • Penjadwal tunggal review    │               │ • Nudge Kalibrasi OLM │
└───────────────────────────────┘               └───────────────────────┘
```

---

### 1.2 Status Inventaris 31 Modul Braincore (Bundle 3.10.0)

Berdasarkan inspeksi langsung pada [`features/brain/fiezel-brain-manifest.js`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-brain-manifest.js), [`app.js`](file:///c:/Users/hp/fiezel-apps/app.js), dan suite pengujian:

| No | Modul (`features/brain/`) | Peran Utama | Otoritas Manifest | Status Nyata di Produksi |
|---|---|---|:---:|:---:|
| 1 | `fiezel-core-brain.js` | Kemampuan laten IRT 3PL, memori FSRS, ZPD | **active** | **Berjalan Penuh** (penulis jadwal review tunggal) |
| 2 | `fiezel-tutor-brain.js` | Seleksi soal adaptif, tangga scaffold | **active** | **Berjalan Penuh** (pemilih soal utama) |
| 3 | `fiezel-mastery-bkt.js` | Pelacak penguasaan per-lesson BKT | **active** | **Berjalan Penuh** (membuka prasyarat grammar) |
| 4 | `fiezel-misconception-ledger.js` | Memori miskonsepsi longitudinal | **active** | **Berjalan Penuh** (umpan prior createSession) |
| 5 | `fiezel-item-prior.js` | Prior kesulitan kontinu per level/mode | **active** | **Berjalan Penuh** (menimpa q.difficulty) |
| 6 | `fiezel-item-calibration.js` | Kalibrasi kesulitan item Elo lokal | **active** | **Berjalan Penuh** (dipakai buildAdaptivePool) |
| 7 | `fiezel-evidence-credibility.js` | Pembobotan kredibilitas bukti (kappa) | **active** | **Berjalan Penuh** (mengalikan langkah BKT/IRT) |
| 8 | `fiezel-affect.js` | Deteksi emosi belajar (frustrated/bored) | **active** | **Berjalan Penuh** (menggeser targetSuccess) |
| 9 | `fiezel-srl-coach.js` | Pelatih regulasi mandiri & prediksi | **active** | **Berjalan Penuh** (perencana sesi awal) |
| 10 | `fiezel-step-tutor.js` | Pengurai langkah bernalar bertahap | **active** | **Berjalan Penuh** (tampil saat scaffold 'worked') |
| 11 | `fiezel-production-grader.js` | Penilai ketikan cloze bebas (Levenshtein) | **active** | **Berjalan Penuh** (penilai utama mode cloze) |
| 12 | `fiezel-confusion-matrix.js` | Pelacak pasangan konsep tertukar | **active** | **Berjalan Penuh** (menentukan kartu AI Booster) |
| 13 | `fiezel-olm.js` | Open Learner Model & coaching kalibrasi | **active** | **Berjalan Penuh** (nudge kalibrasi di akhir sesi) |
| 14 | `fiezel-target-language.js` | Sumbu pemisah namespace bahasa (en / ja) | **active** | **Berjalan Penuh** (kunci isolasi data multi-bahasa) |
| 15 | `fiezel-arena-bot.js` | Bot simulasi lawan permainan arena | **active** | **Berjalan Penuh** (menentukan langkah bot arena) |
| 16 | `fiezel-policy-verdict.js` | Pemutus kebijakan berbasis interval statistik | **active** | **Berjalan Penuh** (menilai outcome kebijakan) |
| 17 | `fiezel-question-memory.js` | Memori butir soal bankor per siswa | **active** | **Berjalan Penuh** (latihan mandiri bankor) |
| 18 | `fiezel-question-allocator.js` | Mesin alokasi butir soal bankor | **active** | **Berjalan Penuh** (memilih butir bankor) |
| 19 | `fiezel-retention-probe.js` | Uji retensi tertunda (3/7/21 hari) | **shadow** | **Bayangan** (mengukur, tapi jadwal tetap FSRS) |
| 20 | `fiezel-learning-metrics.js` | Metrik gain longitudinal (Brier, hint) | **shadow** | **Bayangan** (hanya tampil di panel diagnostik) |
| 21 | `fiezel-listening-adaptive.js` | Kebijakan audio adaptif (speed/replay) | **shadow** | **Bayangan** (policy dihitung, audio tidak berubah) |
| 22 | `fiezel-speaking-adaptive.js` | Kebijakan speaking tanpa ASR | **shadow** | **Bayangan** (hanya agregat durasi/coverage) |
| 23 | `fiezel-attempt-record.js` | Pembatas proyeksi bukti sinkron | **shadow** | **Bayangan** (sinkronisasi Cloudflare mati default) |
| 24 | `fiezel-brain-manifest.js` | Sumber kebenaran bundle & status modul | **shadow** | **Bayangan** (deskriptif diagnostik) |
| 25 | `fiezel-nof1.js` | Alokasi lengan mikro-eksperimen FNV-1a | **off** | **Dorman** (modul siap, belum ada pemanggil di app.js) |
| 26 | `fiezel-param-ledger.js` | Rantai hash perubahan parameter | **off** | **Dorman** (belum ada parameter bergerak sendiri) |
| 27 | `fiezel-self-tune.js` | Pengusul tala parameter mandiri | **off** | **Dorman** (menunggu izin tata kelola owner) |
| 28 | `fiezel-content-chain.js` | Pelacak siklus promosi konten | **off** | **Dorman** (belum disambung ke app.js) |
| 29 | `fiezel-metrics-digest.js` | Pengunggah digest metrik agregat | **off** | **Dorman** (sengaja off demi batas privasi) |
| 30 | `fiezel-stat-gate.js` | Gerbang statistik Wilson/Newcombe | **off** | **Dorman di Klien** (hanya aktif di pipeline konten) |
| 31 | `fiezel-brain-config.js` | Batas batas nilai parameter (BOUNDS) | **off** | **Dorman** (hanya sebagai referensi tooling/manusia) |

---

## 2. KARTU SKOR (SCORECARD 8 DIMENSI)

Skala penilaian: **0 (Absen/Rusak)** hingga **5 (Tingkat Dunia / Standar Riset Emas)**.

| Dimensi Evaluasi | Skor | Ringkasan Status |
|---|:---:|---|
| **1. Model Murid** | **3.8 / 5** | Pemodelan BKT dan IRT 3PL sangat solid di Grammar; namun BKT belum memiliki parameter forgetting waktu ($F$) dan belum mencakup skill non-grammar. |
| **2. Diagnosis Kesalahan** | **4.0 / 5** | Taksonomi miskonsepsi distraktor berbasis Bayesian Likelihood Ratio sangat tajam; namun terbatas di grammar, belum ada di vocab/reading. |
| **3. Keputusan Pengajaran** | **3.7 / 5** | Seleksi ZPD dan FSRS-lite bekerja mulus; namun evaluasi outcome kebijakan di `app.js` masih memakai skor bobot-tangan lama. |
| **4. Tutor & Umpan Balik** | **3.2 / 5** | Scaffolding bertahap (Step-Tutor) bekerja rapi saat 'worked'; namun penjelasan masih berasal dari template statis tanpa alternatif analogi. |
| **5. Pembelajaran Mesin (Autonomy)** | **2.4 / 5** | Fondasi N-of-1, Stat Gate, dan Param Ledger sudah lulus uji; namun modul self-tuning masih berstatus `off` (L3-L5 terputus). |
| **6. Cakupan Skill** | **2.6 / 5** | Grammar mendapat 80% kecerdasan Braincore; Listening & Speaking masih berstatus shadow; Vocab belum memakai graf prasyarat. |
| **7. Ketahanan & Performa** | **4.5 / 5** | Arsitektur 100% murni (*pure functional*), nol kebocoran jam tersembunyi, non-blocking boot, offline-first luar biasa tangguh. |
| **8. Keterjelasan (Explainability)** | **3.6 / 5** | OLM memaparkan penguasaan dan kalibrasi metakognitif; backend menyajikan 'why' pada tiap rekomendasi guru. |
| **RATA-RATA KESELURUHAN** | **3.48 / 5** | **Sistem Adaptif Kategori Sangat Baik (Level L1–L2 Penuh, Menuju L3)** |

---

## 3. DAFTAR KEKURANGAN (DEFECT & BOTTLENECK INVENTORY)

Berikut adalah daftar kelemahan spesifik yang ditemukan dari inspeksi mendalam terhadap kode dan eksekusi:

### K-01: BKT Tidak Memiliki Parameter Lupa Berbasis Waktu (*BKT Forgetting Blindspot*)
- **Gejala yang dirasakan murid:** Murid yang sudah mencapai mastery pada suatu lesson ($L \ge 0.95$) 3 bulan lalu dan tidak pernah berlatih lagi, status BKT-nya tetap dianggap "Mastered" penuh di pengait kurikulum.
- **Lokasi Kode:** [`features/brain/fiezel-mastery-bkt.js:28-48`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-mastery-bkt.js)
- **Tingkat Dampak:** **TINGGI**. Pembaruan BKT hanya terjadi saat ada observasi jawaban baru (`update()`). Tanpa latihan, posterior $L$ membeku selamanya, berbeda dengan FSRS di `core-brain` yang menyusutkan retrievability. Akibatnya, jalur unlock kurikulum menganggap siswa masih menguasai prasyarat yang sebenarnya sudah terlupakan.

### K-02: Kebijakan Listening dan Speaking Berstatus Bayangan (*Shadow Stagnation*)
- **Gejala yang dirasakan murid:** Kecepatan pemutaran audio listening (slow vs natural) dan kuota replay tidak pernah berubah secara adaptif meskipun murid kesulitan. Pada speaking, tidak ada umpan balik ketepatan lafal kata.
- **Lokasi Kode:** [`features/brain/fiezel-brain-manifest.js:214,196`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-brain-manifest.js) dan [`app.js:2045-2048`](file:///c:/Users/hp/fiezel-apps/app.js)
- **Tingkat Dampak:** **SEDANG**. `fiezel-listening-adaptive.js` menghitung `rateBand` dan `replayQuota` lalu menempelkannya ke `q.__listeningPolicy`, namun pemutar audio audio tidak pernah membaca kembali objek tersebut untuk mengatur playback rate. Modul berjalan, memakan CPU, tetapi efeknya dibuang.

### K-03: Kesenjangan Pemodelan Klien vs Backend (*Parity Asymmetry*)
- **Gejala yang dirasakan guru:** Dashboard guru dan paspor belajar di backend menampilkan estimasi BKT sederhana dan aturan tangga kesulitan diskrit 1–4, berbeda dengan apa yang dihitung oleh IRT 3PL dan Glicko di gawai siswa.
- **Lokasi Kode:** [`backend/braincore.py:51-69, 229-245`](file:///c:/Users/hp/fiezel-apps/backend/braincore.py) vs [`features/brain/fiezel-core-brain.js:120-160`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-core-brain.js)
- **Tingkat Dampak:** **TINGGI**. Keputusan rekomendasi kelas di backend tidak memanfaatkan diskriminasi soal ($a=1.5$), deviasi ketidakpastian ($sd$), atau kurva FSRS penuh yang ada di klien.

### K-04: Kalibrasi Item Terkunci di Gawai Individu (*Cold-Start Silo*)
- **Gejala yang dirasakan murid/guru:** Soal baru buatan guru membutuhkan minimal 8 kali pengerjaan oleh *murid yang sama* sebelum tingkat kesulitannya terkalibrasi (`applied: true`).
- **Lokasi Kode:** [`features/brain/fiezel-item-calibration.js:45-60`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-item-calibration.js)
- **Tingkat Dampak:** **SEDANG**. Belum ada mekanisme agregasi anonim berbasis Empirical Bayes di Cloudflare Worker D1 untuk mengumpulkan delta kalibrasi dari 30 siswa di satu kelas guna memperbarui prior soal secara kolektif.

### K-05: Modul Otonomi L3–L5 Masih Terputus (*Dormant Autonomy Loop*)
- **Gejala yang dirasakan sistem:** Seluruh parameter pembelajaran (ambang ZPD, faktor FSRS, slip/guess) bersifat statis dan tidak pernah menyetel diri (*self-tune*) berdasarkan keberhasilan belajar jangka panjang siswa.
- **Lokasi Kode:** `fiezel-brain-manifest.js` (entri `nof1: 'off'`, `paramLedger: 'off'`, `selfTune: 'off'`).
- **Tingkat Dampak:** **SEDANG**. Modul canggih seperti N-of-1 trial dan tamper-evident param ledger sudah dibuat dan lulus tes unit, namun belum ada kabel integrator yang mengaktifkannya di `app.js`.

### K-06: Asimetri Bahasa Target (Inggris Maju vs Jepang Terbatas)
- **Gejala yang dirasakan murid:** Saat memilih bahasa target Jepang (`ja`), murid mendapatkan isolasi namespace yang aman (`@ja`), tetapi bank pelajaran Jepang belum memiliki DAG prasyarat kanonik dan taksonomi miskonsepsi distraktor selengkap bahasa Inggris.
- **Lokasi Kode:** [`features/brain/fiezel-target-language.js:46-52`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-target-language.js)
- **Tingkat Dampak:** **SEDANG**.

---

## 4. PETA UPGRADE BERPRIORITAS (THE UPGRADE ROADMAP)

Setiap butir dirancang dengan batasan produk yang mutlak: **inti Braincore tetap lokal, offline-first, dan zero runtime cloud cost**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          PETA UPGRADE STRATEGIS BRAINCORE                              │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│       P0: FONDASI        │  P1: LOMPATAN KECERDASAN    │       P2: KEKUATAN BARU       │
│ • Sambungkan Listening   │ • BKT-FSRS Hybrid Decay     │ • Bahasa Jepang Setara        │
│   Adaptive ke Playback   │ • Empirical Bayes D1 Item   │ • Edge On-Device ASR (WASM)   │
│ • Ganti Bobot Tangan dgn │   Calibration Pooling       │ • Two-Way Bayesian State Sync │
│   Policy Verdict         │ • Socratic Scaffolding saat │ • L5 Remedial Generation      │
│ • State Cleanup & Purge  │   Affect 'Frustrated'       │   Loop dengan Human Gate      │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

### KELOMPOK P0 — FONDASI (Wiring & Menghidupkan Potensi Dorman)

#### P0.1 — Eksekusi Nyata Kebijakan Listening Adaptive
- **Apa yang dibangun:** Hubungkan keluaran `FiezelListeningAdaptive.policy()` di `app.js` ke elemen audio atau pemutar Web Audio API. Jika `rateBand === 'slow'`, set `audio.playbackRate = 0.85`. Jika `replayQuota` habis, nonaktifkan tombol putar ulang dengan pesan edukatif.
- **Manfaat bagi murid:** Murid pemula tidak lagi kewalahan mendengar audio penutur asli yang terlalu cepat; siswa mahir ditantang dengan kecepatan alami.
- **Usaha / Risiko:** `S` (Kecil) / Sangat Rendah.
- **Ketergantungan:** Tidak ada (`fiezel-listening-adaptive.js` sudah siap).
- **Kemampuan Offline:** 100% Offline.

#### P0.2 — Penggantian Heuristik Bobot Tangan Sesi dengan `FiezelPolicyVerdict`
- **Apa yang dibangun:** Hapus rumus komposit bobot manual di `evaluatePolicyOutcome()` (`0.30*completion + 0.35*accuracy...`). Ganti pemutusan outcome kebijakan adaptif dengan interval statistik Wilson/Newcombe non-inferioritas dari [`features/brain/fiezel-policy-verdict.js`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-policy-verdict.js).
- **Manfaat bagi murid:** Kebijakan sesi berikutnya (menaikkan/menurunkan kesulitan) didasarkan pada signifikansi statistik nyata, bukan fluktuasi acak dari sesi pendek.
- **Usaha / Risiko:** `M` (Sedang) / Rendah (modul dan test sudah terbukti hijau).
- **Ketergantungan:** `fiezel-policy-verdict.js`.
- **Kemampuan Offline:** 100% Offline.

#### P0.3 — Pembersihan & Kompresi State Penyimpanan Klien (*State Hygiene*)
- **Apa yang dibangun:** Mekanisme pembersihan otomatis (*garbage collection*) di `app.js` untuk memangkas rekaman attempt usang di `localStorage` / `IndexedDB` yang lebih dari 90 hari tanpa kehilangan parameter ringkasan BKT dan FSRS.
- **Manfaat bagi murid:** Menjamin aplikasi tetap ringan, tidak mengalami *quota exceeded error* di perangkat ponsel dengan memori terbatas.
- **Usaha / Risiko:** `S` (Kecil) / Rendah.
- **Ketergantungan:** Tidak ada.
- **Kemampuan Offline:** 100% Offline.

---

### KELOMPOK P1 — LOMPATAN KECERDASAN (Penyempurnaan Psikometrik)

#### P1.1 — BKT-FSRS Hybrid Decay (Model Lupa pada Penguasaan BKT)
- **Apa yang dibangun:** Tambahkan parameter peluruhan waktu pada posterior BKT di [`features/brain/fiezel-mastery-bkt.js`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-mastery-bkt.js). Jika jeda sejak pengerjaan terakhir $\Delta t$ melebihi ambang batas, posterior $L$ meluruh menuju prior $L_0$ mengikuti kurva retensi FSRS:
  $$L(t) = L_0 + (L_{\text{last}} - L_0) \cdot e^{-\frac{\Delta t}{S}}$$
- **Manfaat bagi murid:** Murid yang absen belajar berbulan-bulan tidak langsung disodori materi tingkat lanjut; sistem secara cerdas meminta review penyegaran sebelum membuka bab baru.
- **Usaha / Risiko:** `M` (Sedang) / Sedang (perlu migrasi state dan penyesuaian gerbang unlock).
- **Ketergantungan:** `fiezel-mastery-bkt.js`, `fiezel-core-brain.js`.
- **Kemampuan Offline:** 100% Offline.

#### P1.2 — Agregasi Kalibrasi Item Kolektif (*Empirical Bayes Pooling via Worker D1*)
- **Apa yang dibangun:** Manfaatkan rute telemetri bukti anonim di Worker Cloudflare untuk mengumpulkan delta kalibrasi soal dari seluruh murid. Worker menghitung prior kesulitan global yang terkalibrasi secara empiris (*Empirical Bayes*), lalu membagikannya kembali ke klien saat pembaruan manifest/bank soal.
- **Manfaat bagi murid & guru:** Soal baru buatan guru otomatis memiliki tingkat kesulitan yang presisi setelah dikerjakan oleh satu rombongan belajar, mencegah soal terlalu sulit atau terlalu mudah bagi kelas lain.
- **Usaha / Risiko:** `M` (Sedang) / Rendah (menggunakan jalur telemetri D1 yang sudah ada).
- **Ketergantungan:** `workers/api/teacher/braincore-bridge.js`, `features/telemetry/fiezel-braincore-evidence.js`.
- **Kemampuan Offline:** Klien tetap menghitung secara lokal saat offline; agregasi terjadi saat online.

#### P1.3 — Intervensi Bimbingan Sokrates Otomatis saat Emosi *Frustrated*
- **Apa yang dibangun:** Hubungkan deteksi afek `frustrated` pada [`features/brain/fiezel-affect.js`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-affect.js) dengan [`features/brain/fiezel-step-tutor.js`](file:///c:/Users/hp/fiezel-apps/features/brain/fiezel-step-tutor.js). Ketika murid salah beruntun dengan waktu pengerjaan tinggi, alihkan antarmuka secara adaptif ke mode bimbingan bertahap (*Worked Example* $\rightarrow$ *Guided Sub-Steps*) alih-alih menyajikan soal serupa yang membuat frustrasi semakin parah.
- **Manfaat bagi murid:** Mengurangi tingkat *churn* dan putus asa murid secara dramatis ketika menemui materi sulit.
- **Usaha / Risiko:** `M` (Sedang) / Rendah.
- **Ketergantungan:** `fiezel-affect.js`, `fiezel-step-tutor.js`, `app.js`.
- **Kemampuan Offline:** 100% Offline.

---

### KELOMPOK P2 — KEKUATAN BARU (Ekspansi Kapabilitas)

#### P2.1 — Ekosistem Adaptif Penuh untuk Bahasa Jepang (JLPT N5–N1)
- **Apa yang dibangun:** Susun graf prasyarat kurikulum bertingkat untuk tata bahasa Jepang (Bunpou) lengkap dengan pemetaan distraktor partikel (`wa/ga`, `ni/de`, bentuk konjugasi `te/ta/nai`). Terapkan BKT dan Misconception Ledger ke namespace `@ja`.
- **Manfaat bagi murid:** Pembelajar bahasa Jepang mendapatkan tingkat kecerdasan adaptif dan diagnostik miskonsepsi yang identik dengan pembelajar bahasa Inggris.
- **Usaha / Risiko:** `L` (Besar, fokus pada penyusunan metadata konten) / Rendah.
- **Ketergantungan:** `fiezel-target-language.js`, bank konten bahasa Jepang.
- **Kemampuan Offline:** 100% Offline.

#### P2.2 — Rekonsiliasi State Klien-Server Dua Arah (*Bayesian Passport Sync*)
- **Apa yang dibangun:** Buat endpoint sinkronisasi probabilistik di [`backend/braincore.py`](file:///c:/Users/hp/fiezel-apps/backend/braincore.py) yang menerima vektor ringkasan status belajar siswa $\langle \theta, sd, S, R, \text{misconceptions} \rangle$. Server menggunakan algoritma rekonsiliasi Bayes untuk menggabungkan data dari multi-gawai siswa tanpa konflik.
- **Manfaat bagi murid & guru:** Siswa dapat berpindah dari HP ke laptop sekolah tanpa kehilangan riwayat adaptif; paspor belajar yang dilihat guru di dashboard kelas mencerminkan kondisi riil murid 100%.
- **Usaha / Risiko:** `M` (Sedang) / Sedang.
- **Ketergantungan:** `backend/learning.py`, `backend/braincore.py`.
- **Kemampuan Offline:** Sinkronisasi terjadi saat online; belajar tetap lancar saat offline.

#### P2.3 — Evaluasi Pelafalan & Esai Singkat On-Device (WASM Zero-Cost AI)
- **Apa yang dibangun:** Integrasikan model *Whisper-Tiny quantized* via WebAssembly / ONNX Runtime Web (~39 MB yang di-cache service worker) untuk memeriksa pelafalan kata per kata pada mode Speaking Lab secara lokal tanpa biaya API cloud.
- **Manfaat bagi murid:** Siswa mendapatkan umpan balik langsung mengenai kata mana yang salah diucapkan secara privat, aman, dan tanpa kuota internet.
- **Usaha / Risiko:** `L` (Besar) / Sedang (harus menjaga anggaran memori perangkat rendah).
- **Ketergantungan:** Service worker cache, `fiezel-speaking-adaptive.js`.
- **Kemampuan Offline:** 100% Offline setelah model terunduh pertama kali.

#### P2.4 — Generator Soal Remedial Mandiri dengan Human Policy Gate (L5 Autonomy)
- **Apa yang dibangun:** Sambungkan lingkar evolusi [`fiezel-evolution-loop.js`](file:///c:/Users/hp/fiezel-apps/fiezel-evolution-loop.js) dengan deteksi gap kurikulum di backend. Ketika satu kelas mengalami miskonsepsi massal dan bank soal habis, sistem secara mandiri menyusun draf paket remedial terkalibrasi yang langsung disajikan ke konsol guru: *"Setujui Paket Soal Remedial Ini"*.
- **Manfaat bagi guru & murid:** Guru menghemat waktu berjam-jam dalam membuat soal remedial; siswa langsung mendapatkan materi penanganan yang tepat sasaran.
- **Usaha / Risiko:** `L` (Besar) / Rendah (prinsip Human Policy Gate tetap terjaga; tidak ada konten terbit tanpa persetujuan guru).
- **Ketergantungan:** `backend/braincore.py`, `fiezel-evolution-loop.js`.
- **Kemampuan Offline:** Pembuatan draf di sisi server/guru; penyajian ke siswa tetap offline-first.

---

## 5. REKOMENDASI URUTAN IMPLEMENTASI (3 GELOMBANG KERJA)

Untuk menjaga stabilitas sistem dan memastikan tidak ada regresi pada pengujian yang sudah ada, implementasi disarankan mengikuti 3 gelombang terencana:

```
GELOMBANG 1 (Fondasi & Efisiensi)
├── P0.1 Sambungkan playback rate Listening Adaptive
├── P0.2 Ganti rumus bobot sesi dengan FiezelPolicyVerdict
└── P0.3 State hygiene & garbage collection attempt usang

GELOMBANG 2 (Lompatan Kognitif & Psikometrik)
├── P1.1 BKT-FSRS Hybrid Decay (lupa berwaktu)
├── P1.3 Socratic Scaffolding saat Affect Frustrated
└── P1.2 Empirical Bayes Pooling di Cloudflare Worker D1

GELOMBANG 3 (Ekspansi Platform & Multimodal)
├── P2.2 Rekonsiliasi State Klien-Server Dua Arah
├── P2.1 Ekosistem Adaptif Penuh untuk Bahasa Jepang
└── P2.4 Generator Remedial Mandiri (L5 Human-in-the-loop)
```

---

## 6. KESIMPULAN AUDIT

> **Status Saat Ini:**  
> Braincore FIEZEL adalah salah satu implementasi sistem tutor adaptif lokal paling elegan dan disiplin secara matematika di kelas web/PWA. Aturan kemurnian modul (*pure modules*), isolasi waktu, dan ketiadaan ketergantungan API cloud berbayar menjadikannya aset teknologi yang sangat bernilai tinggi.

> **Arah Langkah Berikutnya:**  
> Kelemahan terbesar FIEZEL saat ini bukanlah pada rumus dasarnya, melainkan pada **kabel penyambung (*wiring*)** yang belum menyalakan seluruh modul yang sudah selesai dibangun (seperti *listening policy* yang masih bayangan dan *self-tune* yang masih dorman), serta ketiadaan **peluruhan waktu pada BKT**.  
> 
> Dengan mengeksekusi **Gelombang 1 & 2**, FIEZEL akan langsung melompat dari sistem yang sekadar *adaptif* menjadi sistem kecerdasan kognitif yang **mandiri, sadar-waktu, dan presisi tinggi**.
