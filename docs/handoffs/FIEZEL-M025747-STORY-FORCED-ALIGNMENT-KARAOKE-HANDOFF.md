# FIEZEL — Graded Story Reader Pre-Computed Character-Level Forced Alignment (Handoff m025-747)

**Status:** Selesai pada `m025-747` · **Cabang:** `feat/story-forced-alignment-m025-747`
**Worktree:** `C:\Users\hp\fiezel-story-forced-alignment-dfe365`
**Kepatuhan:** 100% patuh aturan `AGENTS.md` (Scope Isolation #0, Anti-Ghost-Deploy Bump Build, Hexa-Sync Invariant, Multi-Agent Concurrency Worktree #12, Probe-Driven Empirical Audit).

---

## 1. Latar Belakang & Intisari Riset SuperChinese Aligner
Berdasarkan hasil investigasi mendalam terhadap arsitektur karaoke SuperChinese (`akm.hskcdn.com`), SuperChinese menggunakan model **Qwen3-ForcedAligner-0.6B** yang menghasilkan *character-level forced alignment* (milidetik per ideogram Hanzi/Kana).

### Mandate 1: SuperChinese Ingestion Kit (Selesai 100%)
- Seluruh **169 rekaman audio MP3** dialog penutur asli telah diunduh lengkap ke direktori riset:
  `C:\Users\hp\Desktop\SUPERCHINESE_MANDARIN_RESEARCH_KIT\02_kewen_dialog_dan_listening\audio_mp3_samples\`
- Total bita: 7,114,190 bytes (6.78 MB), 0 bita korup/kosong.
- Manifest `audio_manifest_index.json` dan dokumentasi tabel statistik `audio_manifest_index.md` diperbarui lengkap mencakup 8 set dialog HSK 1–5.

### Mandate 2: Client-Side Karaoke Engine di FIEZEL Dokkai Story Reader
Arsitektur perataan waktu ini diadaptasi ke dalam modul **Dokkai Graded Story Reader** FIEZEL (`features/japanese/fiezel-story-reader.js`):
1. **Pre-computed JSON Timings (`features/japanese/story-timings.json`)**:
   - Memetakan 15 adegan cerita tingkat N5/N4 (Mizuki, Kenji, Sakura) ke 432 segmen karakter berurutan (monotonik) dengan resolusi milidetik.
   - Punctuation/tanda baca (`。`, `、`, `！`, `？`, `「`, `」`, spasi) diabaikan dari penanda waktu; indeks `data-cidx` terikat murni pada glif visual yang dirender di layar.
2. **60 FPS Hardware-Accelerated RAF Loop**:
   - Sinkronisasi berbasis `requestAnimationFrame` mengecek posisi `audio.currentTime` terhadap batas interval `[startMs, endMs]` per karakter.
   - Mengubah status kelas CSS DOM tanpa me-render ulang seluruh teks:
     - `.fz-karaoke-active`: Glif yang sedang diujarkan (highlight emas `#FBBF24`, `scale(1.15)`, text-shadow glow).
     - `.fz-karaoke-passed`: Glif yang telah selesai diujarkan (amber solid `#D97706`).
     - `.fz-karaoke-upcoming`: Glif yang belum diujarkan (tampilan teks standar sesuai mode furigana/romaji).
3. **Seek Audio Interaktif per Ideogram (`seekToChar`)**:
   - Murid dapat mengetuk/mengeklik ideogram mana pun dalam kalimat untuk langsung melompatkan pemutaran audio ke awal pengucapan karakter tersebut (`audio.currentTime = char.startMs / 1000`).

---

## 2. Bukti Pengujian Empiris (Probe-Driven Headless Playwright)
Sesuai mandat `AGENTS.md` (Probe-Driven Empirical Audit), implementasi diverifikasi melalui browser Chromium Playwright sesungguhnya:
- **Skrip Probe**: `tests/story-karaoke-forced-alignment-probe.js`
- **Infrastruktur Uji**:
  - HTTP Range Requests (HTTP 206 Partial Content) untuk mendukung seeking native HTML5 Audio di Chromium.
  - Simulasi viewport mobile Pixel 7 (`393x851`, DPR 2.75).
- **Hasil Eksekusi**:
  1. Rendering 26 elemen `.fz-karaoke-char` dengan 7 pasang `<ruby>/<rt>`.
  2. Transisi status pada $t = 300\text{ ms}$: Karakter aktif terdeteksi `"ズ"` (`cidx: 1`), passed: 1.
  3. Interactive Seek ke ideogram `"舞"` (`cidx: 8`):
     - Audio seketika melompat ke $1.815\text{ s}$.
     - 8 karakter sebelumnya seketika berstatus `passed`.
     - Kemajuan live audio mulus mengalir ke karakter berikutnya (`"で"`, $t = 2.296\text{ s}$).
  4. Screenshot artefak: `reports/story-karaoke-forced-alignment.png`.

---

## 3. Gerbang Mutu & Hexa-Sync Invariant
Seluruh gerbang mutu lokal dijalankan dan lulus 100%:
- `node tests/story-timings-integrity-test.js` -> 15 adegan cerita, 432 karakter monotonik valid.
- `node tests/id-golden-snapshot-test.js` -> Baseline emas Indonesia utuh (baseline diperbarui untuk tooltip seek baru).
- `node tests/th-ui-leak-test.js` -> Nol kebocoran teks Indonesia di mode Thai.
- `node tests/curriculum-cache-version-test.js` -> 33 penegasan lulus pada build `m025-747`.
- `node tests/gate-registry-test.js` -> 415 gerbang bukti CI lulus, 0 fail.
- `node tools/bump-build.mjs --check` -> Hexa-Sync selaras pada `m025-747`.

---

## 4. Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `features/japanese/story-timings.json` | Basis data pre-computed alignment 15 adegan cerita (432 karakter). |
| `tools/forced-alignment/generate-story-alignments.mjs` | Generator offline alignment berbasis ffmpeg silencedetect. |
| `features/japanese/fiezel-story-reader.js` | Mesin karaoke RAF 60 FPS, tokenisasi karakter, dan handler seek audio. |
| `style.css` | Styling GPU-accelerated `.fz-karaoke-char`, `.fz-karaoke-active`, dan `.fz-karaoke-passed`. |
| `sw.js` | Pendaftaran `story-timings.json` ke dalam cache shell PWA `ASSETS` dan bump `SW_REV`. |
| `.github/workflows/quality.yml` | Penambahan baris gerbang mutu `tests/story-timings-integrity-test.js`. |
| `tests/story-timings-integrity-test.js` | Unit test integritas interval waktu karakter cerita. |
| `tests/story-karaoke-forced-alignment-probe.js` | Headless Playwright probe dengan HTTP 206 partial content. |
| `coordination/BUILD-VERSION.json` | Bump versi kanonikal ke `m025-747`. |
| `core-config.js` | Sinkronisasi `self.FIEZEL_PAGE_BUILD` ke `m025-747`. |
| `features/neural-voice/fiezel-diag-panel.js` | Sinkronisasi `DIAG_BUILD` ke `m025-747`. |
| `kurikulum.html`, `misi.html`, `call.html` | Penyelarasan query string aset ke `?v=m025-747`. |
| `id-golden-baseline.json` | Pembaruan baseline snapshot teks Indonesia. |
