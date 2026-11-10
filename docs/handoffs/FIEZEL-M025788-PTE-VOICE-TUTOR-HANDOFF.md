# FIEZEL Handoff Dossier: PTE Master Tutor & Strict Examiner Engine (Dr. Julian)

**Build Version**: `m025-788`  
**Branch**: `feat/voice-pte-master-tutor`  
**Target Component**: `features/voice-studio/` (`call.html` / Kawan Bicara)  
**Coordinator Session**: `a91b3a79-13cf-443d-8f8f-d3a0860668c8`  
**Executor Agent**: `8979cd84-d320-4043-80cf-c591935cf8b2`  
**Compliance Protocol**: AGENTS.md (Scope Isolation #0, Live SSOT #0-B, CSS Integrity #0-C, Voice Studio Purity #11, Multi-Agent Concurrency #12)  
**Deployment Policy**: **LOCAL TEST ONLY (UNMERGED / NO LIVE DEPLOY)** per explicit user directive.

---

## 1. Executive Summary & Problem Resolution

### Core Problem Solved:
Sebelum revisi ini, fitur Kawan Bicara (`call.html`) hanya berfungsi sebagai mitra percakapan kasual santai (*casual chat companion*). Ketika kandidat mencoba berlatih soal ujian formal (seperti PTE Academic), AI tidak memiliki rubrik penilaian formal, tidak mengoreksi kesalahan lafal/tata bahasa secara terstruktur, memotong ucapan kandidat, dan tidak memiliki kurikulum persiapan bertingkat dari nol.

### Arsitektur Solusi:
1. **Persona Dr. Julian (`dr_julian`)**:
   - Pearson Certified Master Coach & Strict Examiner.
   - Menggunakan model suara `Charon` / `en-AU-WilliamNeural`.
   - Menegakkan protokol 4-tahap tanpa basa-basi: *Briefing Rumus ➔ AI Hening saat Kandidat Berbicara ➔ Rapor Skor Formal ➔ Remedial Wajib*.
2. **Kurikulum Bertingkat 4-Stage Ladder (`PTE_CALL_SCENARIOS`)**:
   - `scen_pte_coach_intro`: Orientasi kurikulum & tes diagnostik awal.
   - `scen_pte_di_level1`: Describe Image Master (5-Part Universal Formula & Kelancaran Bicara).
   - `scen_pte_ra_level2`: Read Aloud (Syntax Chunking & Pacing 120–140 WPM).
   - `scen_pte_rs_level3`: Repeat Sentence (50% Acoustic Memory & Unbroken Rhythm).
   - `scen_pte_wfd_level4`: Write from Dictation & Ejaan Akademis.
3. **Dynamic In-Call Visual Workbench (`InCallLearningWorkbenchModal.tsx`)**:
   - `focusType: 'pte_describe_image'`: Generator 4 jenis grafik SVG interaktif (Bar Chart, Line Graph, Pie Chart, Process Diagram), timer persiapan 25 detik & bicara 40 detik, peringatan Aturan 3 Detik Pearson, checklist kata kunci interaktif, dan accordion Rumus Universal 5-Tahap FIEZEL.
   - `focusType: 'pte_read_aloud'`: Teks akademik dengan penanda intonasi dan pemenggalan jeda nafas (`// jeda`), speedometer target 120–140 WPM, dan pil artikulasi fonetik IPA dengan audio dengar lafal.
   - `focusType: 'pte_scorecard'`: Rapor resmi Pearson dengan lingkaran nilai komposit (/90), rincian Enabling Skills (Fluency 1-5, Pronunciation 1-5, Content 0-3), status kelulusan, dan latihan remedial kata yang keliru.
4. **Persistent Learning Memory (`fz_pte_master_state_v1`)**:
   - Menyimpan stage aktif murid (1–4), target skor (42/58), estimasi Pearson bergulir, riwayat kartu nilai, dan miskonsepsi kronis di `localStorage` melalui `braincore.ts`.
   - Sesi berikutnya otomatis menyapa kandidat sesuai tingkat aktifnya tanpa mengulang orientasi dari awal.

---

## 2. Berkas yang Dimodifikasi & Dibuat

1. `features/voice-studio/src/types/voiceCall.ts`:
   - Penambahan interface `PteMasterScorecard` dan `PteMasterState`.
   - Perluasan `focusType` untuk `'pte_describe_image' | 'pte_read_aloud' | 'pte_scorecard'`.
2. `features/voice-studio/src/lib/braincore.ts`:
   - Implementasi kunci penyimpanan `PTE_MASTER_STORAGE_KEY` (`fz_pte_master_state_v1`).
   - Fungsi `getDefaultPteMasterState()`, `loadPteMasterState()`, `savePteMasterState()`, `recordPteMasterAttempt()`, dan `resetPteMasterState()`.
3. `features/voice-studio/src/data/pteCallScenarios.ts`:
   - Pembuatan data skenario kurikulum PTE 5-level lengkap dengan tujuan, kosakata prasyarat, target pola, dan ujaran model.
4. `features/voice-studio/src/data/callScenarios.ts`:
   - Pendaftaran persona Dr. Julian (`dr_julian`) dengan prompt sistem penguji ketat.
   - Penggabungan skenario `PTE_CALL_SCENARIOS` ke dalam daftar `CALL_SCENARIOS`.
5. `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`:
   - Implementasi `PteDescribeImageCanvas` (SVG Bar, Line, Pie, Process, Timer 25s & 40s, Aturan 3 Detik, Checklist, Accordion Formula).
   - Implementasi `PteReadAloudCanvas` (Chunking Marks, 120-140 WPM, Articulation Pills).
   - Implementasi `PteScorecardCanvas` (Circle Score /90, Enabling Skills, Remedial Words).
   - Integrasi ke `deriveContextualPedagogicalBoard`.
6. `features/voice-studio/src/App.tsx`:
   - Pengambilan stage aktif murid dari `loadPteMasterState()` ke dalam instruksi sistem Dr. Julian (`pteMasterDirective`).
   - Pencatatan telemetri evaluasi ke `recordPteMasterAttempt` saat latihan dinilai.
   - Dukungan `focusType` PTE pada `buildDefaultWorkbenchPayload`.
7. `features/voice-studio/dist/` (`voice-studio.js` & `voice-studio.css`):
   - Kompilasi produksi Vite sukses tanpa eror.
8. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `index.html`:
   - Sinkronisasi nomor build resmi `m025-788`.

---

## 3. Bukti Verifikasi Gerbang Mutu Lokal

| Gerbang Pengujian | Perintah | Status |
|---|---|---|
| Gate Registry Audit | `node tests/gate-registry-test.js` | **PASS (10 pass, 0 fail)** |
| Indonesian Golden Snapshot | `node tests/id-golden-snapshot-test.js` | **PASS (HIJAU baseline emas utuh)** |
| Thai UI Leak Guard | `node tests/th-ui-leak-test.js` | **PASS (4751 kunci utuh)** |
| Hexa-Sync Version Check | `node tools/bump-build.mjs --check` | **PASS (Selaras: true, m025-788)** |
| Curriculum Cache Version | `node tests/curriculum-cache-version-test.js` | **PASS (33 penegasan, m025-788)** |
| Vite Production Bundle | `npm run build` | **PASS (2,985.45 kB, 0 errors)** |

---

## 4. Panduan Pengujian Lokal Pengguna (Localhost Test Walkthrough)

Sesuai instruksi mutlak pengguna, build ini **TIDAK DI-DEPLOY KE SERVER LIVE**.
Untuk menguji di mesin lokal:

1. Jalankan web server statis di root workspace (atau buka worktree `C:\Users\hp\fiezel-voice-pte-tutor`):
   ```bash
   npx serve -p 4173 C:\Users\hp\fiezel-voice-pte-tutor
   ```
2. Buka peramban di URL:
   ```
   http://127.0.0.1:4173/call.html?v=m025-788
   ```
   (Atau buka `http://127.0.0.1:4173/` lalu pilih menu Kawan Bicara / Mitra Kaiwa).
3. Pilih Persona: **Dr. Julian (Pearson Certified Master Coach & Strict Examiner)**.
4. Pilih Skenario: **Level 1: Describe Image Master** atau **Level 2: Read Aloud**.
5. Buka Papan Belajar untuk menguji Kanvas Visual:
   - Ketuk tab **Bar / Line / Pie / Process** untuk melihat 4 grafik SVG.
   - Ketuk **Mulai (25d)** untuk menguji timer persiapan 25 detik dan Aturan 3 Detik Pearson.
   - Buka accordion **Rumus Universal FIEZEL (5-Tahap)** dan ketuk tombol dengar audio.
   - Selesaikan kuis formula di bagian bawah untuk melihat umpan balik Braincore.
6. Periksa `localStorage.getItem('fz_pte_master_state_v1')` di DevTools Console untuk membuktikan persistensi stage, target skor, dan riwayat rapor Pearson.
