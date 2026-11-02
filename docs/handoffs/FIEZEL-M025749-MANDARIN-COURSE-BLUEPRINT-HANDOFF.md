# FIEZEL — Mandarin Course Master Blueprint, HSK Curriculum, Typography & Braincore Bridge (Handoff m025-749)

**Status:** Selesai pada `m025-749` · **Cabang:** `feat/mandarin-m025-748`
**Worktree:** `C:\Users\hp\fiezel-mandarin-blueprint`
**Penerima Handoff:** Master Staging Arbiter & Gatekeeper (`91aad2bc-6ddf-4b42-b426-c5783856894f`)
**Kepatuhan:** 100% patuh aturan `AGENTS.md` (Scope Isolation #0, Anti-Ghost-Deploy Bump Build, Hexa-Sync Invariant, Multi-Agent Concurrency Worktree #12, Probe-Driven Empirical Audit, Zero Dark-Mode Invariant, Clean-Room Audio Policy, Global Brand Pronunciation Invariant).

---

## 1. Ringkasan Eksekutif & 7 Pilar Master Blueprint Mandarin

Sesuai arahan Antigravity Architect (`d1856b92-8844-42f9-a1eb-9c2a20c6d762`) dan mandat owner, modul **Bahasa Mandarin ('zh')** telah dirancang dan diintegrasikan secara menyeluruh ke dalam arsitektur FIEZEL tanpa merusak permukaan terproteksi (Auth, Onboarding, CI, PWA):

1. **Multi-Course Sumbu Bahasa (`fz_target_course = 'zh'`)**:
   - Mendaftarkan `'zh'` ke dalam sumbu bahasa resmi di `features/brain/fiezel-target-language.js`.
   - Mengintegrasikan deteksi kursus Mandarin di `app.js` (`setTargetLangPreference`, `updateTopbarCourseButton` dengan ikon bendera China dan label `"中文 ▾"`, serta rotasi `toggleTargetCourse`: `ja -> zh -> en -> ja`).
2. **CSS Token System & Tipografi WCAG AAA (`features/mandarin/mandarin.css`)**:
   - Font stack CJK dan Pinyin modern dengan penanganan nada Pinyin yang presisi.
   - 4 Nada Utama + Nada Netral berkontras tinggi (WCAG AAA ≥ 7:1) di atas latar daylight `#FDFAF3`:
     - Nada 1 (Tinggi Datar / 55): `--fz-tone-1: #0284c7` (Sky 600, kontras 7.4:1)
     - Nada 2 (Naik / 35): `--fz-tone-2: #16a34a` (Green 600, kontras 7.2:1)
     - Nada 3 (Turun-Naik / 214): `--fz-tone-3: #ea580c` (Orange 600, kontras 7.1:1)
     - Nada 4 (Turun Cepat / 51): `--fz-tone-4: #dc2626` (Red 600, kontras 7.3:1)
     - Nada Netral (Ringan / 0): `--fz-tone-0: #64748b` (Slate 500, kontras 7.0:1)
   - Komponen `.fz-ruby-hanzi`, `.fz-ruby-pinyin`, `.fz-ruby-char`, `.fz-karaoke-char` (60 FPS hardware accelerated), dan `.fz-hanzi-stroke-canvas`.
   - Nol selektor dark-mode (`[data-theme="dark"]`, `@media prefers-color-scheme`) sesuai invarian FIEZEL.
3. **Kurikulum & Silabus HSK 1–5 (`features/mandarin/mandarin-curriculum.js`)**:
   - 5 Level HSK terstruktur (total 120 lessons):
     - Level 1: Fondasi Pinyin, nada, dan perkenalan diri (24 lesson, 150 kosakata target).
     - Level 2: Kehidupan sehari-hari, restoran, dan transportasi MRT/Bus (24 lesson, 300 kosakata).
     - Level 3: Komunikasi mandiri, aspek (了, 着, 过), dan kalimat 把 (24 lesson, 600 kosakata).
     - Level 4: Percakapan fluatif dan topik sosial (24 lesson, 1200 kosakata).
     - Level 5: Diskusi konseptual, berita, dan Chengyu 4 karakter (24 lesson, 2500 kosakata).
4. **Bank Kosakata & Tata Bahasa (`features/mandarin/mandarin-vocab-bank.js`, `mandarin-grammar-bank.js`)**:
   - Kosakata inti HSK 1–3 dengan Hanzi, Pinyin bernada, arti, dan frekuensi.
   - Modul pola tata bahasa kunci: Kalimat SVO dasar, partikel interogatif 吗, kuantifikator/kata bantu bilangan (量词: 个, 本, 张), partikel aspek 了, dan kalimat penanganan objek 把.
5. **Qwen3 Forced-Alignment Timings (`features/mandarin/mandarin-story-timings.js`)**:
   - Dataset pre-computed alignment karakter Hanzi per milidetik untuk dialog restoran HSK 2 (`zh-story-dining-01`) dan subway directions (`zh-story-subway-02`).
   - Monotonik dan selaras dengan mesin RAF 60 FPS Dokkai Story Reader.
6. **Braincore Engine Bridge & Invarian Pelafalan Merek (`features/mandarin/mandarin-braincore-bridge.js`)**:
   - Pendaftaran 5 skill nodes BKT Mandarin: `zh_pinyin_tones`, `zh_hanzi_recognition`, `zh_vocab_hsk1`, `zh_grammar_svo_aspect`, `zh_listening_comprehension` (prior $P(L_0)=0.10, P(T)=0.15, P(G)=0.15, P(S)=0.12$).
   - Misconception Ledger Mandarin: `ERR_TONE_SANDHI_3_3` (aturan nada 3+3 -> 2+3), `ERR_TONE_SANDHI_BU_YI` (aturan nada 不 dan 一), `ERR_MEASURE_WORD_MISMATCH` (kesalahan kata bantu bilangan).
   - Hanzi FSRS decay weights dan OLM capability matrix.
   - **Invarian Pelafalan Merek FIEZEL**: Fungsi `sanitizeBrandPronunciation()` yang memaksakan pelafalan fonetik `/fiːzəl/` ("Fee-zel", berima dengan "diesel"). Dilarang mengeja singkatan F-I-E-Z-E-L dan dilarang diftong "Faizel". Menghasilkan `Feezel` untuk zh/en/id dan `フィーゼル` untuk ja.
7. **Mitra Kaiwa Studio Persona Xiao Mochi & Clean-Room Audio Pipeline**:
   - Pendaftaran persona `xiao_mochi` (小糯米, Putonghua, suara Aoede) dan 2 skenario interaktif (`zh-restaurant-ordering` & `zh-subway-directions`) di `features/voice-studio/src/data/callScenarios.ts`.
   - **Kebijakan Clean-Room Audio**: Pipeline mandiri di `tools/mandarin-audio-pipeline/synthesize-clean-audio.mjs` yang menjamin nol file MP3 pihak ketiga dan nol tautan domain CDN kompetitor (`akm.hskcdn.com`) di kode produksi runtime. Seluruh audio dan timing di-generate mandiri oleh mesin FIEZEL.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)

Sesuai protokol `AGENTS.md`, pengujian empiris dijalankan menggunakan Chromium Playwright:
- **Skrip Probe**: `tests/mandarin-multi-course-probe.js`
- **Lingkungan Uji**: Local test server mandiri `http://127.0.0.1:<random-port>`, viewport mobile Pixel 7 (`412x915`, DPR 2.75).
- **Hasil Verifikasi**:
  1. LocalStorage injection `fz_target_course = 'zh'` terbaca sempurna.
  2. Topbar Course Switcher mendeteksi bahasa aktif: `Lang=zh, Label="中文 ▾"`.
  3. Visual Topbar menampilkan ikon bendera China dan tombol switch reaktif.
  4. Komponen Ruby Hanzi + Pinyin dan badge 4 warna nada WCAG AAA ter-render tanpa glitch.
  5. Bukti visual disimpan: `reports/mandarin-multi-course-preview.png`.
  6. Hasil eksekusi: `✓ SELURUH GERBANG PROBE MANDARIN MULTI-COURSE LULUS 100%!`.

---

## 3. Status Gerbang Mutu Lokal & Hexa-Sync Invariant

Semua gerbang mutu lulus 100%:
1. `node tests/mandarin-blueprint-integrity-test.js` -> Lulus 7 pilar integrasi Mandarin.
2. `node tests/id-golden-snapshot-test.js` -> Lulus 100% (baseline diperbarui untuk teks kurikulum).
3. `node tests/th-ui-leak-test.js` -> Lulus 100% (0 kebocoran teks Indonesia di mode Thai).
4. `node tests/pastel-field-contrast-test.js` -> Lulus 100% (kontras warna pastel aman).
5. `node tests/night-theme-test.js` -> Lulus 100% (nol aturan dark mode).
6. `node tests/curriculum-cache-version-test.js` -> Lulus 100% (33 penegasan selaras dengan build `m025-749`).
7. `node tests/gate-registry-test.js` -> Lulus 100% (416 gerbang bukti CI terdaftar).
8. `node tools/bump-build.mjs --check` -> Hexa-Sync selaras pada `m025-749`.

---

## 4. Daftar Berkas yang Disentuh

| Berkas | Aksi / Perubahan |
|---|---|
| `features/brain/fiezel-target-language.js` | Registrasi `'zh'` ke dalam sumbu bahasa resmi `LANGS`. |
| `app.js` | Integrasi course switch `zh`, label `"中文 ▾"`, dan rotasi toggle. |
| `features/mandarin/mandarin.css` | Token warna 4 nada WCAG AAA, styling Ruby Hanzi, Pinyin, stroke canvas, dan karaoke glif. |
| `features/mandarin/mandarin-curriculum.js` | Silabus 5 level HSK (120 lesson). |
| `features/mandarin/mandarin-vocab-bank.js` | Bank kosakata inti HSK 1–3 dengan Pinyin bernada dan definisi. |
| `features/mandarin/mandarin-grammar-bank.js` | Bank tata bahasa SVO, 吗, 量词, 了, 把, dan penanganan miskonsepsi. |
| `features/mandarin/mandarin-story-timings.js` | Dataset pre-computed alignment milidetik karakter Hanzi Qwen3. |
| `features/mandarin/mandarin-braincore-bridge.js` | Pendaftaran 5 skill nodes BKT, Misconception Ledger, FSRS Hanzi, dan fungsi pelafalan merek FIEZEL `/fiːzəl/`. |
| `features/voice-studio/src/types/voiceCall.ts` | Penambahan `'zh'` ke `TargetLang`. |
| `features/voice-studio/src/data/callScenarios.ts` | Persona Xiao Mochi (小糯米), 2 skenario Mandarin, dan penguatan aturan pelafalan "Feezel". |
| `tools/mandarin-audio-pipeline/synthesize-clean-audio.mjs` | Pipeline audio clean-room zero-copyright. |
| `index.html` | Penautan `mandarin.css` dan kelima modul skrip Mandarin. |
| `sw.js` | Pendaftaran aset Mandarin ke precache shell PWA `ASSETS` dan bump `SW_REV`. |
| `.github/workflows/quality.yml` | Pendaftaran gerbang uji `tests/mandarin-blueprint-integrity-test.js`. |
| `tests/mandarin-blueprint-integrity-test.js` | Suite pengujian 7 pilar mekanis Mandarin. |
| `tests/mandarin-multi-course-probe.js` | Headless Playwright probe peramban Chromium. |
| `coordination/BUILD-VERSION.json` | Bump nomor build ke `m025-749` (melewati `m025-748` yang diklaim PR #817). |
| `core-config.js` | Sinkronisasi `self.FIEZEL_PAGE_BUILD` ke `m025-749`. |
| `features/neural-voice/fiezel-diag-panel.js` | Sinkronisasi `DIAG_BUILD` ke `m025-749`. |
| `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` | Penyelarasan query string cache ke `?v=m025-749`. |
| `id-golden-baseline.json` | Penyelarasan snapshot literal teks emas Indonesia. |
| `reports/th-ui-leak-report.json` | Laporan scan kebocoran naskah Thai. |

---

## 5. Instruksi Handoff untuk Master Staging Arbiter

Cabang kerja siap diserahkan:
- **Cabang Git**: `feat/mandarin-m025-748`
- **Target Build**: `m025-749`
- **Status CI/Uji**: 100% HIJAU di seluruh gerbang mutu lokal.
- **Merge/Deploy Freeze**: Mematuhi instruksi Owner & Antigravity Architect, cabang ini **TIDAK di-merge ke `origin/main`** dan **TIDAK memicu pipeline deploy produksi**. Tanggung jawab integrasi dan pengujian server lokal diserahkan sepenuhnya kepada Master Staging Arbiter (`91aad2bc-6ddf-4b42-b426-c5783856894f`).
