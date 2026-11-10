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

### Core Problem Solved & User Feedback Addressed:
1. "Untuk soal popup grafik Describe Image-nya masih sangat sedikit dan sangat template, tidak banyak."
2. "Seharusnya bank soal untuk Describe Image-nya dimuatkan lebih banyak lagi, diambil dari bank soal APEUni dan internet, karena saat ini terlihat tidak resmi dan terbatas."
3. "Kecerdasan / logika AI-nya belum pintar, ilmunya belum banyak untuk mengajari secara mendalam."

### Arsitektur Solusi & Peningkatan Signifikan:
1. **Bank Soal Master 50 Soal Asli Pearson & Prediksi APEUni (`pteDescribeImageBank.ts`)**:
   - Berisi **50 soal asli** terbagi ke dalam 6 kategori lengkap standar Pearson Academic:
     * **10 Bar Charts**: World Population 2050, Australian Wine Exports, Renewable Energy Share, Government Spending, Household Waste, Electric Vehicle Adoption, OECD Higher Education, Air Freight Volumes, Agricultural Water Use, Urbanization Rates.
     * **10 Line Graphs**: Atmospheric CO2 (1960-2024), Global Inflation, Southeast Asia E-Commerce ($32B-$120B), Average Global Temperature Anomaly, Crude Oil Price Volatility, Teleworking Rates, Solar PV Hardware Cost Deflation, Youth Unemployment, Clean Tech Patents, Life Expectancy.
     * **8 Pie Charts**: Global Smartphone OS Market Share (Android 71%, iOS 28%), Municipal Solid Waste Breakdown, Global Freshwater Withdrawal, Global Energy Generation Mix, Online vs Brick-and-Mortar Retail, Electric Vehicle Battery Chemistry, Cloud Infrastructure Market Share, World Land Usage.
     * **8 Process Diagrams**: Atlantic Salmon Biological Life Cycle, Industrial Glass Bottle Recycling, Potable Water Treatment Cycle, Coffee Processing from Cherry to Roasted Bean, Hydroelectric Dam Power Generation, Recycled Paperboard Cycle, Aluminium Can Closed-Loop Recycling, Solar Thermal Desalination.
     * **7 Maps & Geography**: Annual Rainfall and Climate Zones Across Australia, Global Tropical Deforestation Hotspots, Population Density Distribution Across Japan, Major Maritime Container Shipping Corridors, Seismic Hazards and Pacific Ring of Fire, Global Solar Irradiation Potentials, African Urbanization Corridors.
     * **7 Academic Tables**: University International Student Enrolment by Faculty, Hospital Bed Capacity per 1,000 Inhabitants, Public Transit vs Private Vehicle Modal Share, Global Renewable Energy Installed Capacity, R&D Expenditure as % of GDP, Average Annual Working Hours, Commercial Solar PV Hardware Cost Deflation.
2. **Kanvas Interaktif Describe Image Multi-Kategori (`InCallLearningWorkbenchModal.tsx`)**:
   - **Filter Kategori Cepat**: `[Semua (50)]`, `[📊 Bar (10)]`, `[📈 Line (10)]`, `[🥧 Pie (8)]`, `[🔄 Process (8)]`, `[🗺️ Map (7)]`, `[📋 Table (7)]`.
   - **Bilah Navigasi Soal**: `[◀ Prev]`, `[Soal X dari Y]`, `[Next ▶]`, serta tombol `[🎲 Acak Soal Ujian Asli]`.
   - **Render Visual Dinamis untuk 6 Kategori**:
     * Visualizer Bar & Line SVG dinamis dengan grid garis putus-putus, persentase nilai, dan sumbu waktu.
     * Visualizer Pie Donut SVG dinamis dengan potongan warna-warni dan legenda keterangan lengkap.
     * Visualizer Process Flow dengan kartu langkah terstruktur, nomor badge tahapan, dan panah aliran.
     * Visualizer Map & Geography dengan kompas mata angin `🧭 N • S • E • W`, kode status wilayah, dan catatan iklim/bahaya.
     * Visualizer Academic Table dengan tampilan layar komputer pusat ujian resmi Pearson, baris kepala tabel berlatar kontras, dan penyorotan baris kunci.
   - **Timers Resmi**: Timer 25 detik persiapan dan timer 40 detik rekam bicara (peringatan merah saat $\le 10$ detik) + peringatan Aturan 3 Detik Pearson.
   - **Checklist Kata Kunci**: Mengambil kata kunci dinamis sesuai soal aktif dengan interaksi centang bersuara tap.
   - **Rahasia Penguji (Dr. Julian)**: Kartu tips rahasia penguji (`examinerTips`) yang membedah trik pelafalan angka, perangkap konsonan jamak (-s), dan fokus frasa kunci pada setiap soal.
   - **Accordion Rumus Universal 5-Tahap FIEZEL**: Intro, Key Elements, Maximum Figure, Minimum Figure, Conclusion, dan tombol putar audio model native.
3. **Peningkatan Kecerdasan Pedagogis Dr. Julian (`callScenarios.ts` & `pteCallScenarios.ts`)**:
   - Penanaman rubrik mendalam algoritma Pearson AI: Oral Fluency 1-5 (anti jeda > 2 detik, larangan meralat diri sendiri / self-correction), Pronunciation 1-5 (penalti pelafalan jamak dropped 's' dan -ed, intonasi kata akademik multi-suku kata), dan Content 0-3 (pola lexical anchors).
   - Protokol waktu optimal bicara: Sweet spot 30-35 detik (tempo konstan 120-140 WPM).
   - Panduan spesifik penguraian untuk ke-6 jenis visual (Bar, Line, Pie, Process, Map, Table).
   - Perintah remedial wajib jika skor Fluency atau Pronunciation di bawah 3.

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
