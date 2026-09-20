# 🏛️ FIEZEL Personal English OS — Acquisition & Investor Memorandum
**Confidential Information Memorandum (CIM) · Valuasi & Potensi Akuisisi**

---

## 1. Executive Summary

| Parameter | Detail |
|---|---|
| **Nama Produk** | FIEZEL (Personal English OS) |
| **Versi Produksi** | v5.19.0 (Live di [fiezel.my.id](https://fiezel.my.id/)) |
| **Kategori** | EdTech / Adaptive Language Learning / B2B School SaaS |
| **Target Pasar** | Siswa SMP/SMA Indonesia (25M+ siswa), Guru Bahasa Inggris, Pelajar Mandiri Asia Tenggara |
| **Model Lisensi** | B2C Freemium (Rp 29.000/bln) + B2B School Licensing (Rp 500.000/kelas/semester) |
| **Valuasi Target** | **Rp 560 Juta – Rp 1 Miliar** (As-is Assets & IP) · **Rp 1,5 Miliar – Rp 3 Miliar** (dengan 5.000 MAU + 20 Kelas B2B) |

---

## 2. Mengapa FIEZEL Bernilai Tinggi di Era AI? (The "AI-Proof Moat")

Banyak orang beranggapan: *"Jika software dibuat menggunakan AI, nilainya nol."* **FIEZEL membuktikan sebaliknya.** Di era kecerdasan buatan, kode memang komoditas, tetapi **FIEZEL memiliki 4 pilar pertahanan (MOAT) yang tidak bisa di-copy dalam semalam**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIEZEL DEFENSIVE MOAT                           │
├──────────────────┬──────────────────┬─────────────────┬────────────────┤
│ 1. CURATED DATA  │ 2. ALGORITHMIC   │ 3. LOCAL-FIRST  │ 4. B2B LOCK-IN │
│    ASSETS        │    INTELLIGENCE  │    NEURAL VOICE │    (KELASKU)   │
│                  │                  │                 │                │
│ • 4.500+ Grammar │ • BKT Engine     │ • Kokoro.js     │ • Live Demo    │
│ • 2.440 Vocab    │ • IRT Difficulty │ • ONNX Runtime  │ • 18-Student   │
│ • 1.560 Reading  │ • Misconception  │ • Rp 0 Cloud    │   Mock State   │
│ • 1.407 Listening│   Taxonomy       │   API Cost      │ • Zero-Contek  │
│ • CEFR A1-C2     │ • Multi-arm Band │ • Offline Full  │   Exams        │
└──────────────────┴──────────────────┴─────────────────┴────────────────┘
```

### Pilar 1: Bank Soal & Aset Konten Terkalibrasi (Curated Content IP)
- **180 Lesson Grammar** × 25 varian soal = **4.500 soal berpenjelasan lengkap**.
- **2.440 Entri Kosakata** bertingkat CEFR (A1 hingga C2) dengan terjemahan kontekstual, part of speech, dan kalimat contoh.
- **312 Reading Passages & 1.560 Soal Pemahaman** berjenjang.
- **1.407 Audio Bank Items** bergaya IELTS/TOEFL.
- **Taxonomy Miskonsepsi Bahasa Ibu**: Dirancang spesifik untuk penutur Bahasa Indonesia & Thai (bukan sekadar terjemahan mesin).

### Pilar 2: Mesin Pembelajaran Adaptif (BKT + IRT)
FIEZEL bukan kuis linear statis. Di dalamnya tertanam:
- **Bayesian Knowledge Tracing (BKT)**: Melacak probabilitas penguasaan sub-skill secara matematis ($p(L)$).
- **Item Response Theory (IRT)**: Mengkalibrasi tingkat kesulitan butir soal secara dinamis terhadap kemampuan riil siswa.
- **Automatic Misconception Diagnosis**: Mendeteksi pola salah murid dan langsung memberikan *Reteach Intervention Card* sebelum lanjut ke soal berikutnya.

### Pilar 3: Suara Neural On-Device (Zero Inference Cost)
- Didukung oleh model ONNX WebAssembly lokal (Kokoro.js).
- **Biaya Server = Rp 0**: Pengguna mendapatkan audio neural alami langsung di browser mereka tanpa membebani biaya API Cloud (ElevenLabs/OpenAI) bagi pemilik aplikasi!

### Pilar 4: Ekosistem B2B Guru (KelasKu & Ruang Guru)
- Guru dapat membuat kelas dalam 10 detik, membagikan kode 6 huruf, dan menerbitkan tugas Kurikulum Merdeka (Fase D SMP & Fase E/F SMA).
- Mode Ujian Anti-Contek (soal diacak per murid, timer berjalan, laporan kecurangan otomatis).
- Fitur live demo siap pakai di `?teacher=preview` yang memukau calon kepala sekolah dan dinas pendidikan.

---

## 3. Disiplin Mutu Rekayasa Perangkat Lunak (QA & Engineering Health)

FIEZEL dibangun dengan standar rekayasa perangkat lunak setara institusi perbankan/misi-kritis:
- **296 Berkas Pengujian Hermetis** (`tests/*`).
- **279 Gerbang Kualitas Mutlak (Quality Gates)** di pipeline CI/CD GitHub Actions.
- **Audit Rilis**: 145 PASS / 0 FAIL.
- **Audit Kualitas Grammar**: 24 PASS / 0 FAIL.
- **Audit Suara Neural**: 28 PASS / 0 FAIL.
- **Zero Cross-Origin Data Leak**: Sesuai regulasi kepatuhan privasi anak (COPPA & GDPR compliant by design, tanpa pengumpulan PII).

---

## 4. Proyeksi Keuangan & Model Monetisasi

### Skenario 1: B2C Freemium SaaS
- **Target Konversi**: 3,5% dari pengguna aktif bulanan (MAU) ke paket Pro (Rp 29.000 / bulan).
- **Nilai Tambah Pro**: Akses level B2-C2, neural voice tanpa batas, sertifikat resmi CEFR terverifikasi, dan modul IELTS/TOEFL intensif.

| Metrik | Bulan 3 | Bulan 6 | Bulan 12 |
|---|---|---|---|
| **MAU** | 5.000 | 25.000 | 100.000 |
| **Pengguna Berbayar** | 175 | 875 | 3.500 |
| **MRR (Pendapatan Bulanan)** | Rp 5.075.000 | Rp 25.375.000 | Rp 101.500.000 |
| **ARR (Pendapatan Tahunan)** | Rp 60.900.000 | Rp 304.500.000 | Rp 1.218.000.000 |
| **Valuasi (Multiple 4x ARR)** | **Rp 243.600.000** | **Rp 1.218.000.000** | **Rp 4.872.000.000** |

### Skenario 2: B2B School Licensing (KelasKu Enterprise)
- **Harga per Kelas**: Rp 500.000 / semester (Rp 1.000.000 / tahun).
- **1 Sekolah SMP/SMA**: Rata-rata 18–24 kelas = Rp 9.000.000 – Rp 12.000.000 / semester.
- **Target 1 Tahun Pertama**:
  - 30 Sekolah mitra × 15 kelas = 450 kelas.
  - Pendapatan B2B = 450 kelas × Rp 1.000.000/tahun = **Rp 450.000.000 ARR**.
  - Margin Bersih: **>88%** (karena infrastruktur serverless Cloudflare Workers + D1 berbiaya sangat rendah).

---

## 5. Rincian Penyerahan Akuisisi (What Buyer Gets)

1. **Repositori Sumber Penuh (100% Hak Milik IP)**:
   - 2.660 file kode & aset terverifikasi.
   - PWA Shell, 34 Modul Fitur, Cloudflare Workers API, Python backend Kurikulum.
2. **Domain & Identitas Merek**:
   - Kepemilikan domain `fiezel.my.id` & zona Cloudflare aktif.
   - Aset visual maskot PAW lengkap (14 ekspresi SVG + CSS keyframe choreography).
3. **Database Konten Lengkap**:
   - 25+ MB database JSON terstruktur rapi (Grammar, Vocabulary, Reading, Listening, Speaking).
4. **Harness & Dokumentasi Operasional**:
   - 296 test scripts, runbooks migrasi, runbook deployment cPanel/Cloudflare, dan instrumen audit kepatuhan.
5. **Transisi & Pendampingan Teknis**:
   - Dokumentasi serah-terima arsitektur dan panduan scaling hingga 500.000 pengguna.

---

## 6. Kesimpulan & Rekomendasi Tawaran

Bagi perusahaan EdTech, lembaga bimbingan belajar, penerbit buku pelajaran, atau venture studio:
> **Membangun aplikasi dengan kedalaman kurikulum dan ketahanan arsitektur seperti FIEZEL dari nol memerlukan waktu minimal 14–18 bulan dan biaya tim dev >Rp 1,5 Miliar.**

Membeli FIEZEL pada valuasi saat ini (**Rp 560 Juta – Rp 1 Miliar**) memberikan jalan pintas teknologi instan (time-to-market 0 hari) dengan basis kode yang telah terbukti kuat di lapangan.
