# FIEZEL Handoff Dossier: PTE Master Tutor & Strict Examiner Engine (Dr. Julian)

**Build Version**: `m025-806`<br/>
**Branch**: `feat/voice-pte-master-tutor`<br/>
**Target Component**: `features/voice-studio/` (`call.html` / Kawan Bicara)<br/>
**Coordinator Session**: `a91b3a79-13cf-443d-8f8f-d3a0860668c8`<br/>
**Executor Agent**: `8979cd84-d320-4043-80cf-c591935cf8b2`<br/>
**Compliance Protocol**: AGENTS.md (Scope Isolation #0, Live SSOT #0-B, CSS Integrity #0-C, Voice Studio Purity #11, Multi-Agent Concurrency #12)<br/>
**Deployment Policy**: **LOCAL TEST ONLY (UNMERGED / NO LIVE DEPLOY)** per explicit user directive.

---

## 1. Executive Summary & Problem Resolution

### Core Problem Solved & User Directives Addressed:
1. **Landscape Side-by-Side (Split Screen) Describe Image**:
   - *Masalah Sebelumnya*: Gambar diagram berada di atas, template jawaban berada di bawah di dalam accordion tertutup. Murid harus scroll bolak-balik antara gambar dan template, mengorbankan Oral Fluency dan konsentrasi.
   - *Solusi Sempurna*: Melebarkan modal ke wadah lanskap `max-w-5xl xl:max-w-6xl` dengan tata letak 2-kolom berdampingan (*side-by-side*). Sisi kiri memuat diagram visual SVG interaktif, timer persiapan 25d & rekam 40d, indikator *Zona Berhenti Ideal 25–28 Detik*, peringatan Aturan 3 Detik Pearson, dan checklist kata kunci. Sisi kanan menampilkan **Rumus Universal Nakul (5-Baris Anti-Pause)** yang SELALU terbuka (tanpa accordion) berdampingan langsung dengan diagram, preview audio native, dan trik rahasia penguji (*examiner secret hacks*). NOL SCROLLING diperlukan!
2. **Koreksi Tata Bahasa Lisan Real-Time Ketat (Zero-Tolerance Grammar Interception)**:
   - *Masalah Sebelumnya*: Dr. Julian terlalu pasif dan tidak pernah mengoreksi kesalahan grammar murid saat berbicara.
   - *Solusi Sempurna*: Penegakan aturan *Zero-Tolerance Grammar Interception*. Ketika murid melakukan kesalahan tata bahasa (subject-verb agreement, salah tenses, konsonan jamak -s/-ed yang hilang, atau salah preposisi), Dr. Julian secara sopan namun otoriter langsung memotong, menjelaskan letak kesalahan dalam 1 kalimat presisi, dan mewajibkan *Echo Redemption* (murid mengulangi kalimat yang sudah dibenarkan).
3. **Proactive Automated Drilling (Tanpa Perlu Diperintah / Pengalaman Guru Private Asli)**:
   - *Masalah Sebelumnya*: Pada sesi Repeat Sentence atau drilling, AI berhenti dan pasif menunggu murid mengetik "coba lanjut" baru memberikan soal berikutnya.
   - *Solusi Sempurna*: Dr. Julian memandu sesi secara proaktif dan otonom layaknya tutor privat senior Australia. Dr. Julian langsung membacakan kalimat target dan memerintahkan: *"Giliranmu, ulangi dalam 5 detik!"*, mengevaluasi kepatuhan Aturan 50% Nakul, dan segera melontarkan soal berikutnya dalam putaran yang sama tanpa bertanya *"Mau lanjut?"*.
4. **Penyelarasan Silabus Dinamis (Dynamic Syllabus Alignment)**:
   - *Masalah Sebelumnya*: AI kaku ketika murid meminta materi atau mode latihan tertentu di luar urutan kaku.
   - *Solusi Sempurna*: Menyelaraskan roadmap latihan dengan keinginan murid (misalnya maraton Describe Image atau Repeat Sentence) sambil tetap mempertahankan tolok ukur standar kelulusan PTE Academic 42 untuk Visa Pelajar Australia (Subclass 500) di AILFE Perth.
5. **Bank Soal Read Aloud Multi-Topik & Chunking Nafas (`pteReadAloudBank.ts`)**:
   - *Masalah Sebelumnya*: Hanya ada 1 teks statis yang berulang tanpa variasi, trik, atau tips pemenggalan nafas.
   - *Solusi Sempurna*: Disediakan bank soal multi-topik otentik (11+ teks) lintas kategori *Cookery & Hospitality* (persiapan AILFE Perth), *Western Australia / Perth Ecology*, dan *Academic Science*. Setiap teks dilengkapi penanda jeda nafas sintaksis (`// jeda`), spidometer target tempo 120–140 WPM, kartu bor fonetik dengan IPA, dan spanduk *Trik 1-Kalimat APEUni*.

---

## 2. Berkas yang Dimodifikasi & Dibuat

1. `features/voice-studio/src/data/pteReadAloudBank.ts` *(Baru)*:
   - Bank soal 11+ teks otentik Pearson Academic lengkap dengan pemenggalan sintaksis (`chunkedSegments`), target WPM, kartu fonetik IPA, tips penguji, dan Trik 1-Kalimat APEUni.
2. `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx` *(Dimodifikasi)*:
   - Pembongkaran kanvas Describe Image menjadi tata letak 2-kolom lanskap berdampingan.
   - Rumus Universal Nakul 5-baris terbuka permanen di sisi kanan berdampingan dengan grafik di sisi kiri.
   - Penghilangan kuis ganda generik yang mengacaukan bagian bawah kanvas PTE.
   - Pembuatan `PteReadAloudCanvas` interaktif lengkap dengan navigasi soal, kategori, dan visualisasi pemenggalan nafas.
3. `features/voice-studio/src/App.tsx` *(Dimodifikasi)*:
   - Penyempurnaan `pteMasterDirective` dan instruksi sistem Dr. Julian untuk penegakan koreksi tata bahasa lisan seketika, pemanduan latihan otomatis tanpa jeda kosong (*zero dead air*), dan sinkronisasi preferensi skenario `fiezel_voice_scenario_pref`.
   - Penyediaan jembatan tes `window.__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__` dan pendengar event kustom `fiezel:open-learning-workbench`.
4. `features/voice-studio/src/data/callScenarios.ts` *(Dimodifikasi)*:
   - Pembaruan persona Dr. Julian dengan mandat penguji ketat dan rubrik penilaian Pearson AI.
5. `tests/dev-probe-pte-landscape-workbench.cjs` *(Baru)*:
   - Skrip pengujian Playwright Chromium headless beresolusi 1280x800 yang memverifikasi wadah modal lanskap (`max-w-5xl`), tampilan berdampingan diagram dan 5 baris template Nakul, perputaran soal Describe Image & Read Aloud, dan penyimpanan tangkapan layar visual.
6. `coordination/screenshots/` *(Aset Pembuktian Visual)*:
   - `pte-describe-image-landscape-split.png`: Tangkapan layar empiris Describe Image split screen.
   - `pte-read-aloud-landscape-split.png`: Tangkapan layar empiris Read Aloud dengan penanda jeda nafas.
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `index.html`:
   - Sinkronisasi build resmi `m025-806`.

---

## 3. Bukti Verifikasi Gerbang Mutu Lokal

| Gerbang Pengujian | Perintah | Status |
|---|---|---|
| Empirical Playwright Landscape Probe | `node tests/dev-probe-pte-landscape-workbench.cjs` | **PASS 100% (Screenshots Saved)** |
| Voice Studio UI Architecture | `node tests/voice-studio-ui-architecture-test.js` | **PASS (8/8)** |
| Voice Call Studio Integration | `node tests/voice-call-studio-integration-test.js` | **PASS (8/8)** |
| PTE Bank Integrity | `node tests/pte-bank-integrity-test.js` | **PASS (12/12)** |
| PTE Academic Engine Unit Tests | `node tests/pte-academic-engine-test.js` | **PASS (18/18)** |
| Indonesian Golden Snapshot | `node tests/id-golden-snapshot-test.js` | **PASS (HIJAU baseline emas utuh)** |
| Thai UI Leak Guard | `node tests/th-ui-leak-test.js` | **PASS (4751 kunci utuh)** |
| Curriculum Cache Version | `node tests/curriculum-cache-version-test.js` | **PASS (33 penegasan, m025-806)** |
| Gate Registry Audit | `node tests/gate-registry-test.js` | **PASS (10 pass, 0 fail)** |
| Hexa-Sync Version Check | `node tools/bump-build.mjs --check` | **PASS (Selaras: true, m025-806)** |
| Git Whitespace Audit | `git diff --check origin/main` | **PASS (0 warnings)** |

---

## 4. Panduan Pengujian Lokal Pengguna (Localhost Test Walkthrough)

Build aktif disajikan pada port lokal 4173:

1. Buka URL Studio Kawan Bicara di peramban:
   ```
   http://127.0.0.1:4173/call.html
   ```
2. Pastikan Persona **Dr. Julian** aktif di header atas.
3. Ketuk tombol **Papan Tulis / Papan Belajar** di kanan atas:
   - Amati jendela modal yang kini **jauh lebih lebar (Landscape Split Screen)**.
   - Perhatikan **Sisi Kiri**: Grafik diagram SVG interaktif dengan timer 25d/40d, indikator hijau 25–28 detik, dan checklist kata kunci.
   - Perhatikan **Sisi Kanan**: **Rumus Universal Nakul (5-Baris Anti-Pause)** yang langsung terbuka penuh (Intro, Key Elements, Maximum, Minimum, Conclusion) tanpa perlu di-scroll ke bawah!
   - Uji tombol **Next ▶** untuk mengganti soal grafik secara instan.
4. Uji pergantian ke Skenario **Level 2: Read Aloud**:
   - Amati penanda jeda nafas sintaksis (`// jeda`), spidometer 120–140 WPM, kartu fonetik IPA, dan spanduk Trik 1-Kalimat APEUni.
5. Bicara dengan sengaja membuat kesalahan grammar (misal: *"Yesterday I go to market"*) saat mikrofon terhubung, dan saksikan Dr. Julian langsung memotong dengan koreksi tata bahasa lisan presisi.
