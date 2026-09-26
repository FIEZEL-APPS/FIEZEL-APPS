# FIEZEL Braincore — Autonomous Content Governance Charter (Level 5)

**Status:** ENFORCED GOVERNANCE PROTOCOL
**Dokumen Induk:** [`docs/MASTER-ONLY-GOVERNANCE.md`](MASTER-ONLY-GOVERNANCE.md) & [`docs/BRAINCORE-AUTONOMY-ROADMAP.md`](BRAINCORE-AUTONOMY-ROADMAP.md)
**Otorisasi:** OWNER (2026-09-27)
**Tingkat Otonomi:** Level 5 (Memperluas-Diri / Autonomous Content Self-Extension)

---

## 1. Latar Belakang & Rekonsiliasi Konstitusional

[`docs/MASTER-ONLY-GOVERNANCE.md`](MASTER-ONLY-GOVERNANCE.md) §1–§5 menegaskan bahwa kedaulatan repositori dan keputusan promosi produksi mutlak berada di bawah identitas `FIEZEL-APPS` (MASTER). Di sisi lain, [`fiezel-autonomy-config.js`](../fiezel-autonomy-config.js) menyediakan tingkat otonomi `full` yang memungkinkan adopsi kanonik otomatis (*auto-canonical adoption*).

Piagam ini merekonsiliasi keduanya:
1. **Otoritas Bukan Cek Kosong:** Otonomi Level 5 HANYA berlaku di dalam koridor pedagogis tertutup yang secara eksplisit diizinkan di dokumen ini.
2. **Kanonik Runtime Tetap Tak Tersentuh Langsung:** Bank soal kanonik di repositori (`grammar-templates.json`, `vocabulary-master.json`, `reading-bank.json`) tetap berstatus *immutable* saat runtime di perangkat murid.
3. **Mekanisme Adopsi Berresi Kriptografis:** Setiap materi yang diperluas oleh AI wajib melewati 5 gerbang berurutan: `candidate` $\to$ `local_gate` $\to$ `canary` $\to$ `stat_verdict` $\to$ `adoption_receipt`.

---

## 2. Klasifikasi Perubahan Konten: Boleh vs Dilarang

Untuk menjamin **100% bebas halusinasi** dan mencegah degradasi pedagogis, ruang gerak perbaikan konten otonom dibagi menjadi dua zona mutlak:

### A. KELAS YANG DIIZINKAN OTONOM (Permitted Zone)
Hanya perbaikan pada lapisan penjelasan dan metakognitif butir soal yang sudah ada:
- **Penulisan Ulang Penjelasan Tata Bahasa:** Memperbaiki teks `explanation.whyCorrect`, `explanation.rule`, `explanation.whyOthersFail`, `explanation.howToAvoid`.
- **Pengayaan Petunjuk Memori (`memoryCue`):** Menambahkan jembatan keledai mnemonik untuk membantu retensi FSRS murid.
- **Klarifikasi Alasan Distraktor:** Memperjelas field `whyFails` pada opsi pengecoh yang terbukti membingungkan murid berdasarkan *confusion matrix*.
- **Contoh Kalimat Kosakata:** Menambahkan kalimat contoh kontekstual baru (`examples`) pada butir kosakata yang tipis.

### B. KELAS YANG DILARANG KERAS (Strictly Prohibited Zone)
AI DILARANG KERAS mengubah properti berikut tanpa tinjauan langsung MASTER:
- 🚫 **Kunci Jawaban (`correctIndex`):** Tidak boleh bergeser atau berubah.
- 🚫 **Teks Soal / Premis Pokok (`stem`):** Tidak boleh mengubah fakta atau premis latihan.
- 🚫 **Opsi Pilihan Ganda (`options`):** Tidak boleh menambah atau menghapus opsi.
- 🚫 **Peta Miskonsepsi (`misconceptionTargeted`):** Taksonomi pedagogis tidak boleh dimutasi.
- 🚫 **Level Kemampuan (`cefr` / `difficulty` prior):** Label kurikulum resmi tidak boleh digeser sepihak oleh model generatif.

---

## 3. Protokol Gerbang Pengujian (The 5-Stage Gate)

Sebuah kandidat materi HANYA boleh diadopsi bila memenuhi seluruh rantai berikut secara berurutan:

```
[1. Candidate] ──> [2. Local Gate] ──> [3. Canary Test] ──> [4. Stat Verdict] ──> [5. Adoption Receipt]
 (Validasi AI)     (8 Aturan Patch)    (Maks 10% Murid)    (Wilson/Newcombe)    (Rantai Hash Ledg.)
```

1. **Local Gate (`content-patch-gate.js`):**
   - Menjamin integritas skema `fiezel-content-patch-v1`.
   - Menguji bahwa patch tidak memutasi berkas kanonik lokal secara destruktif (`canonicalImmutable === true`).
2. **Canary Exposure (`content-canary.js`):**
   - Paparan dibatasi ketat: maksimum **10%** dari total sesi belajar dan maksimal **20 sesi**.
   - Masa uji kedaluwarsa otomatis dalam 30 hari.
3. **Statistical Promotion Verdict (`content-promotion.js`):**
   - Memakai uji non-inferioritas **FiezelStatGate** (Wilson score + Newcombe hybrid CI).
   - Margin batas non-inferioritas $\le 5\text{pp}$.
   - Lantai sampel $n \ge 25$ per lengan. Status `hold` adalah hasil yang sah saat bukti belum konklusif.
4. **Adoption Receipt Ledger (`content-adoption-receipt.js`):**
   - Mencegah *replay attack*: setiap adopsi memiliki bukti tanda tangan kriptografis unik (`receiptId`).
   - Replay basi atau adopsi ganda seketika ditolak oleh rantai ledger.

---

## 4. Mekanisme Kill Switch & Pencabutan

OWNER dapat mencabut atau mematikan seluruh pipa otonomi ini kapan saja:

1. **Instan (Tanpa Deploy):** Setel `halt: true` pada konfigurasi otonomi. Seluruh rantai `fiezel-evolution-loop.js` seketika berhenti total dan kembali ke mode pasif.
2. **Tingkat Penurunan (Fallback):** Bila level diturunkan ke `advisory`, AI hanya menghasilkan laporan usulan di dashboard guru/OWNER tanpa pernah merilis uji *canary*.

---

## 5. Pernyataan Risiko yang Diterima

Pemberian otorisasi Level 5 berarti OWNER menerima risiko bahwa:
* Murid pada kelompok *canary* (maksimum 10%) dapat membaca penjelasan alternatif yang dihasilkan model generatif sebelum evaluasi statistik selesai.
* Pagar pembatas di dokumen ini menjamin bahwa **kunci jawaban tidak pernah salah** dan **konten kanonik repositori tidak pernah rusak**.
