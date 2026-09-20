# 🤖 FIEZEL REBUILD & VALUATION MULTIPLIER — MASTER AGENT PROMPT
**Dokumen Orkestrasi Instruksi Lengkap untuk AI Coding Agent (Cursor / Devin / Claude / Antigravity / Windsurf)**

---

## CARA PENGGUNAAN:
Salin teks di bawah ini (mulai dari tanda `=== START MASTER PROMPT ===` sampai `=== END MASTER PROMPT ===`) dan berikan ke AI Agent pilihan Anda sebagai instruksi tunggal yang utuh.

---

```markdown
=== START MASTER PROMPT ===

# ROLE & MISSION
Anda bertindak sebagai Principal EdTech Software Architect & Elite Full-Stack Product Engineer.
Misi Anda adalah merancang, merekayasa, dan membangun ulang ekosistem aplikasi pembelajaran bahasa Inggris adaptif bernama **"FIEZEL Personal English OS"** (Production Grade, CEFR A1–C2, PWA Local-First, B2B School Ready).

Aplikasi ini BUKAN sekadar web kuis biasa, melainkan sebuah platform edtech berharga tinggi (Valuasi target: Rp 1 Miliar+) yang memiliki:
1. Curated Content Data Moat (Ribuan item bank terstruktur rapi).
2. Algoritma Pembelajaran Adaptif Riil (BKT + IRT + Taksonomi Miskonsepsi).
3. Zero-Inference Cost Voice Engine (Suara Neural On-Device WASM).
4. Mesin Monetisasi B2B Sekolah (KelasKu untuk Kurikulum Merdeka).
5. Disiplin Mutu Tertinggi (200+ Hermetic Quality Gates di CI/CD).

Ikuti spesifikasi arsitektur, data, algoritma, dan alur eksekusi berikut secara presisi:

---

## 1. CORE ARCHITECTURE SPECIFICATIONS

### A. Frontend Shell & PWA (Local-First Architecture)
* **Teknologi**: Pure Vanilla Modern JS (ES6+), Semantic HTML5, Modular CSS Design System (`fiezel-2.css` / CSS Custom Properties), tanpa dependensi framework berat (React/Vue) agar instan dimuat di perangkat HP murah.
* **PWA & Offline Capability**:
  * Service Worker (`sw.js`) dengan strategi `cache-first` untuk shell dan `stale-while-revalidate` untuk data JSON.
  * PWA Web App Manifest lengkap (`display: "standalone"`, icons maskable, shortcuts, share target).
  * Pengguna tidak diwajibkan login/membuat akun untuk mulai belajar. Semua progres lokal disimpan di `localStorage` dan `IndexedDB` dengan skema versi (`fiezel-v5-state`).
  * Dukungan multi-bahasa antarmuka (i18n): Bahasa Indonesia (`id`) dan Thai (`th`).

### B. On-Device Local Neural Voice Engine (Zero Cloud Cost)
* **Teknologi**: Kokoro.js 1.2.1 + ONNX Runtime Web / WebAssembly (WASM).
* **Mekanisme**:
  * Bobot model terkuantisasi (q8 ONNX, ~119 MB) diunduh secara *explicit user opt-in* dengan progress bar transparan.
  * Streaming audio disintesis langsung di memori perangkat browser murid.
  * Tidak menggunakan kuota API ElevenLabs atau OpenAI. Biaya cloud audio = **Rp 0**.
  * Fallback berjenjang: Kokoro WASM -> Web Speech API -> Silent mode yang jujur (teks tetap bisa dibaca).

### C. Backend Edge Serverless & Database
* **Edge Worker**: Cloudflare Workers (`workers/api/`) melayani routing `/api/usage`, `/api/config`, `/api/auth`, `/api/quota`.
* **Database**: Cloudflare D1 (Serverless SQLite di edge) dengan tabel agregat:
  * `metrics_daily(day TEXT, metric TEXT, value INTEGER, PRIMARY KEY(day, metric))`
  * `usage_daily(day TEXT, bucket TEXT, count INTEGER, PRIMARY KEY(day, bucket))`
  * `retention_daily(cohort_day TEXT, day_index INTEGER, count INTEGER)`
  * `dau_dedup(day TEXT, token TEXT)`
* **Privasi Mutlak (Privacy-by-Design)**:
  * Klien TIDAK PERNAH mengirim `installId`.
  * Klien menghitung `visitor_token = HMAC-SHA256(pepper_hari_ini, installId)` dengan WebCrypto di perangkat. Pepper dirotasi otomatis setiap hari.
  * Tidak ada PII (Nama, Email, IP, Jawaban Siswa) yang keluar ke server analytics.

---

## 2. CURATED CONTENT DATA MOAT (CEFR A1–C2)

Bangun struktur data JSON terstandardisasi berikut:

1. **Grammar Curriculum (180 Lesson × 25 Soal = 4.500 Soal)**:
   * Pemetaan level: A1 (17 lesson), A2 (29 lesson), B1 (52 lesson), B2 (39 lesson), C1 (24 lesson), C2 (19 lesson).
   * 21 Keluarga Grammar (`tense_aspect`, `modals`, `conditionals`, `passive`, `reported_speech`, dll.).
   * Tiap butir memiliki: `stem`, `options`, `correctIndex`, `ruleId`, `whyCorrect`, `misconceptionId`, `whyOthersFail`, `howToAvoid`, dan `memoryCue`.
2. **Vocabulary Master Bank (2.440 Entri)**:
   * Level CEFR, part of speech, translasi Bahasa Indonesia & Thai, kalimat contoh bilingual.
3. **Reading Comprehension Bank (312 Passage / 1.560 Soal)**:
   * Teks bacaan naratif, ekspositori, akademik berjenjang A1–C2 dengan soal tipe IELTS/TOEFL (Main Idea, Detail, Inference, Vocab in Context).
4. **Listening & Speaking Bank (1.407 Items)**:
   * Audio scripts, aksen dialog, prompt latihan pengucapan dengan Web Speech Recognition API.
5. **Taksonomi Miskonsepsi Lokal (Misconception Taxonomy)**:
   * Mengidentifikasi 80+ pola kesalahan khas penutur bahasa Indonesia (misal: *subject-verb agreement*, penggunaan *to be* berlebih, *past tense* tanpa penanda waktu).

---

## 3. ADAPTIVE LEARNING ENGINE (BKT + IRT)

Aplikasi WAJIB menerapkan algoritma cerdas, bukan pemilihan soal acak:
* **Bayesian Knowledge Tracing (BKT)**:
  * Hitung probabilitas penguasaan siswa $p(L_t)$ per konsep/sub-skill.
  * Parameter: $p(L_0)$ (prior), $p(T)$ (transisi belajar), $p(G)$ (tebakan beruntung/guess), $p(S)$ (kesalahan ceroboh/slip).
  * Update state $p(L_{t+1})$ setiap kali murid menjawab benar atau salah.
  * Syarat kelulusan lesson: $p(L) \ge 0.80$.
* **Item Response Theory (IRT)**:
  * Tiap soal memiliki parameter kesulitan ($b$) dan daya pembeda ($a$).
  * Menyesuaikan bobot soal selanjutnya dengan estimasi kemampuan siswa saat ini ($\theta$).
* **Reteach Intervention Card**:
  * Jika siswa terdeteksi mengulang miskonsepsi yang sama 2x beruntun, hentikan sementara kuis dan tampilkan kartu *Reteach*: penjelasan esensi aturan + isyarat visual (*memory cue*) sebelum soal berikutnya disajikan.

---

## 4. B2B SCHOOL ENGINE: KELASKU & RUANG GURU

Fitur pengungkit valuasi B2B untuk sekolah dan guru:
1. **Teacher Dashboard (Ruang Guru)**:
   * Aktivasi akun guru via invitation token.
   * Buat kelas baru dalam 1 click -> menghasilkan **Kode Kelas 6 Karakter** (misal: `8A-ENG`).
   * Antrean persetujuan (*Pending Approval*) saat siswa memasukkan kode kelas.
2. **Penerbitan Tugas Kurikulum Merdeka**:
   * Penyelarasan langsung ke **Fase D (SMP: Kelas 7, 8, 9)** dan **Fase E/F (SMA: Kelas 10, 11, 12)**.
   * Pilihan mode: **Latihan Mandiri** (pembahasan instan) vs **Ujian / Kuis** (timer berjalan, anti-contek, acak urutan soal).
3. **Analisis Diagnostik Kelas**:
   * Rekapitulasi otomatis: murid yang sudah tuntas vs murid yang tertinggal (*struggling*).
   * Ringkasan miskonsepsi terbanyak dalam 1 kelas untuk bahan remedial guru di kelas tatap muka.
4. **Interactive Demo Preview**:
   * Route `?teacher=preview` yang menyemai 18 siswa simulasi agar calon kepala sekolah/guru bisa langsung mencoba dashboard tanpa setup akun awal.

---

## 5. MONETIZATION & VALUE-GATING SYSTEM

Rancang sistem monetisasi freemium non-intrusif:
* **Freemium Limits (Free Tier)**:
  * 3 sesi latihan adaptif per hari.
  * Akses bebas ke seluruh level A1 dan A2.
  * Suara audio standar sintetis.
* **Pro Tier (Rp 29.000 / bulan atau Rp 199.000 / tahun)**:
  * Sesi latihan tanpa batas (*unlimited daily practice*).
  * Akses level B1, B2, C1, C2.
  * Akses penuh ke Suara Neural Lokal (Kokoro.js).
  * Simulasi Lengkap Tes IELTS / TOEFL + Sertifikat Digital CEFR Terverifikasi.
* **B2B School Gate (Kunci Moat)**:
  * Murid yang memasukkan Kode Kelas Guru yang valid dari sekolah mitra otomatis mendapatkan status **Akses Sekolah Penuh (Bypass Quota Gratis)**!
  * Sekolah membayar lisensi B2B tahunan: Rp 500.000 / kelas / semester.

---

## 6. QUALITY ASSURANCE & DEFENSIVE VERIFICATION

Terapkan standar zero-defect engineering:
1. **Hermetic Unit & Integration Tests**:
   * Tulis minimal 50+ script test Node.js di folder `tests/` tanpa dependensi eksternal.
   * `regression-test.js`: Verifikasi konsistensi pool soal, alokator BKT, dan IRT.
   * `seo-surface-gate-test.js`: Validasi canonical, sitemap.xml, robots.txt, dan JSON-LD schema (8 schema per halaman).
   * `precache-covers-shell-test.js`: Memastikan setiap file yang dimuat `index.html` terdaftar di Service Worker precache.
2. **Security & Data Sanitization**:
   * Pindai semua payload untuk mencegah kebocoran PII, secret API keys, atau token otentikasi.
   * Jalankan CI/CD pipeline otomatis di GitHub Actions yang mengunci rilis jika ada 1 assertion pun yang FAIL.

---

## 7. LANGKAH EKSEKUSI PEMBANGUNAN (STEP-BY-STEP)

* **Tahap 1**: Siapkan arsitektur folder, `manifest.json`, `index.html`, dan shell PWA `style.css`.
* **Tahap 2**: Buat bank data kurikulum JSON (`grammar-curriculum.json`, `vocabulary.json`, `reading-bank.json`, `misconception-taxonomy.json`).
* **Tahap 3**: Implementasikan mesin logika adaptif (`BKT`, `IRT`, `quizLoop`, dan `Reteach`).
* **Tahap 4**: Integrasikan Kokoro.js ONNX WASM untuk sintesis suara lokal offline.
* **Tahap 5**: Bangun modul B2B KelasKu (`class-hub`, manajemen kelas, tugas Kurikulum Merdeka, demo preview).
* **Tahap 6**: Pasang modul analitik privasi (Cloudflare D1 & HMAC token).
* **Tahap 7**: Jalankan seluruh regression test suites dan pastikan 100% PASS.

Mulai eksekusi dari Tahap 1 sekarang juga dengan kode yang bersih, terdokumentasi, modular, dan siap produksi!

=== END MASTER PROMPT ===
```
