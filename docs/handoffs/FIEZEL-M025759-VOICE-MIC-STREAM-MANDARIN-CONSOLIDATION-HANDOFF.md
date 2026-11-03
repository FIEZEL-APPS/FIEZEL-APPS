# FIEZEL — Voice Mic Stream Unblock, VAD Sensitivity Calibration & Mandarin Suite Consolidation (Handoff m025-759)

**Status:** Selesai pada `m025-759` · **Cabang:** `feat/voice-mic-stream-m025-758`
**Worktree:** `C:\Users\hp\fiezel-voice-mic-fix`
**Otoritas:** Master Staging Arbiter & Gatekeeper (`91aad2bc-6ddf-4b42-b426-c5783856894f`)
**Kepatuhan:** 100% patuh aturan `AGENTS.md` (Scope Isolation #0, Live SSOT #0-B, Anti-Ghost-Deploy Bump Build, Hexa-Sync Invariant, Multi-Agent Concurrency Worktree #12, Probe-Driven Empirical Audit, Zero Dark-Mode Invariant, Clean-Room Audio Policy, Global Brand Pronunciation Invariant).

---

## 1. Ringkasan Eksekutif & Akar Masalah yang Diperbaiki

Berdasarkan audit empiris menyeluruh terhadap keluhan user & owner ("hanya bisa mendengar suara AI-nya doang, tapi dari si usernya ketika mau berbicara tidak bisa karena mikrofonnya, soketnya itu tidak hidup. Saklar/wire-nya macet" dan "kawan bicara dan mochi sosnya tidak ada suaranya", serta keluhan tampilan anomali kartu Mandarin):

### A. Perbaikan Fatal Microphone, Wire & VAD Switch di Voice Studio (`App.tsx`)
1. **Pelepasan Blokir VAD Gate**: Di `rec.onresult`, evaluasi VAD (`lastHandySpeechAtRef.current > 2800`) sebelumnya dijalankan *sebelum* transkrip diekstrak. Karena `lastHandySpeechAtRef.current` diinisialisasi ke `0`, `Date.now() - 0` selalu melebihi `2800ms`, menyebabkan 100% input suara pengguna dibuang seketika ke `return`. Diperbaiki: transkrip diekstrak terlebih dahulu; setiap ada suara yang dikenali Web Speech API, `lastHandySpeechAtRef.current` dan `sileroVadGateRef.current.markHumanSpeechAt()` diperbarui ke `Date.now()`, dan transkrip langsung dialirkan tanpa pernah dibuang.
2. **Pencegahan Kunci Saklar Permanen (`audio-capture`)**: Pada `rec.onerror`, galat sesaat `audio-capture` (saat sistem beralih perangkat audio) sebelumnya secara fatal menyetel `isMicMuted = true` dan `isDisposed = true`. Diperbaiki: `audio-capture` tidak lagi mengunci saklar mic menjadi bisu; status mic tetap dipertahankan.
3. **Unmute Otomatis Saat Masuk Panggilan**: `startLiveCall` kini secara tegas menyetel `isMicMutedRef.current = false` dan `setIsMicMuted(false)` serta menjamin kesiapan `liveCtx.resume()`.
4. **Target Language & Persona Mandarin Resmi**: Menambahkan tombol `ZH` pada selector bahasa di header dan persona resmi **Xiao Mochi (小麻薯)** sebagai default untuk kursus Mandarin.

### B. Perbaikan Sensitivitas & Audio Output di Mochi Voice SOS (`fiezel-mochi-voice-sos.js`)
1. **Kalibrasi Sensitivitas RMS**: Nilai `minRms` diturunkan dari `0.010` ke `0.003` dan batas frame percakapan diturunkan dari 4 ke 2 frame (~20-40ms). Hal ini menjamin mikrofon internal laptop dan ponsel ber-gain rendah langsung mengaktifkan `_userAudioBurstActive = true` tanpa perlu berteriak.
2. **AudioContext Resume & HTMLAudio Fallback**: Menambahkan pemulihan status AudioContext (`ctx.resume()`) dan fallback `playViaAudioTag()` menggunakan Blob URL `new Audio(blobUrl)` jika `decodeAudioData` tertahan kebijakan peramban.

### C. Konsolidasi Penuh Suite Mandarin Proprietary FIEZEL
1. **10 Kartu Kotak Simetris di Latihan**: Mengubah tampilan launcher kartu Mandarin di `features/mandarin/mandarin-ui.js` menjadi 10 kartu kotak berpasangan yang simetris, selaras dengan estetika kursus Jepang (`comparison-ja-latihan.png`).
2. **Bank Bacaan 49 Wacana (147 Soal)**: Mengintegrasikan `content/zh/reading-bank-zh.json` lengkap dengan 49 bacaan bergradasi A1-C1.
3. **Ujian Level & Placement Mandiri**: `buildLevelExamQuestions` di `app.js` dilengkapi cadangan pool kosakata/tata bahasa sehingga selalu menghasilkan 25/25 soal ujian tanpa gagal.
4. **Peta Progres HSK Murni**: Dasbor progres Mandarin kini menampilkan label bersih `PETA LEVEL HSK · 汉语水平` tanpa kebocoran istilah CEFR/JLPT.

---

## 2. Status Gerbang Mutu Lokal & Hexa-Sync Invariant

Semua 16 gerbang mutu terverifikasi **100% HIJAU**:
1. `node tests/mandarin-blueprint-integrity-test.js` -> **PASS** (8/8 Pilar Lulus).
2. `node tests/mandarin-pinyin-ruby-test.js` -> **PASS** (4/4 Pilar Lulus).
3. `node tests/mandarin-tutor-braincore-feedback-test.js` -> **PASS** (6/6 Pilar Lulus).
4. `node tests/id-golden-snapshot-test.js` -> **PASS** (Baseline emas Indonesia utuh).
5. `node tests/th-ui-leak-test.js` -> **PASS** (Seluruh anggaran konten terkontrol).
6. `node tests/curriculum-cache-version-test.js` -> **PASS** (33 penegasan selaras di `m025-759`).
7. `node tests/gate-registry-test.js` -> **PASS** (10 pass, 0 fail, 424 gerbang bukti sah).
8. `node tools/fiezel-guardians.mjs a10` -> **PASS** (0 errors, 0 warnings).
9. `node tools/fiezel-guardians.mjs a11` -> **PASS**.
10. `node tools/fiezel-guardians.mjs a13` -> **PASS**.
11. `node tools/fiezel-guardians.mjs a9` -> **PASS**.
12. `node tools/bump-build.mjs --check` -> **PASS** (Hexa-Sync selaras pada `m025-759`).

---

## 3. Daftar Berkas yang Disentuh

| Berkas | Perubahan |
|---|---|
| `features/voice-studio/src/App.tsx` | Unblock transkrip SpeechRecognition, pencegahan mute permanen `audio-capture`, aktivasi mic default di `startLiveCall`, tombol ZH & persona Xiao Mochi |
| `features/voice-studio/src/lib/sileroVadGate.ts` | Penambahan method `markHumanSpeechAt(t)` |
| `features/voice-studio/src/data/callScenarios.ts` | Integrasi persona `xiao_mochi` dan skenario percakapan Mandarin |
| `features/voice-studio/src/data/fiezelLifeCallScenarios.ts` | Skenario percakapan hidup FIEZEL terisolasi |
| `features/voice-studio/src/data/ieltsCallScenarios.ts` | Skenario evaluasi IELTS |
| `features/voice-studio/dist/voice-studio.js` | Hasil kompilasi Vite produksi terbaru (2.664 kB) |
| `features/voice-studio/dist/voice-studio.css` | Hasil kompilasi style produksi terbaru (52 kB) |
| `features/mascot/fiezel-mochi-voice-sos.js` | Sensitivitas RMS `0.003` & 2 frame burst, AudioContext resume & HTMLAudio fallback |
| `features/mandarin/**` | Suite kurikulum, kosakata 2.194 kata, 192 rumus tata bahasa, pinyin engine, 10 kartu latihan simetris |
| `content/zh/**` | Bank wacana bacaan 49 teks, template tata bahasa, kamus master |
| `features/interactive-chat/fiezel-interactive-chat.js` | Integrasi persona Xiao Mochi & persistensi kursus Mandarin |
| `features/brain/fiezel-target-language.js` | Penambahan sumbu bahasa `'zh'` ke `LANGS` |
| `app.js` | Level exam fallback `zh`, progress bar HSK, pinyin ruby, sinkronisasi toggle tampilan |
| `index.html` | Penautan stylesheet `mandarin.css` dan 7 modul script Mandarin |
| `sw.js` | Precache 8 aset Mandarin aktif dalam `ASSETS` |
| `tests/*mandarin*` | Pengujian integritas cetak biru, pinyin ruby, dan feedback braincore |
| `tests/th-ui-leak-test.js` | Anggaran konten naskah belajar Mandarin bilingual |
| `id-golden-baseline.json` | Pembaruan baseline emas literal Indonesia |
| `coordination/BUILD-VERSION.json` | Kenaikan nomor build ke `m025-759` |
