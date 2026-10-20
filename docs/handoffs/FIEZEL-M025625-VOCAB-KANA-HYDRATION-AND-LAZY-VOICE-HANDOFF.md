# FIEZEL-M025625: Pemulihan Hidrasi Kana Kosakata dan Lazy Voice Load di AudioService

**Tanggal Serah Terima**: 2026-10-20  
**Build Release**: `m025-625`  
**Cakupan**: `app.js`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `kurikulum.html`, `misi.html`, `features/neural-voice/fiezel-diag-panel.js`, `id-golden-baseline.json`  

---

## 1. Ringkasan Audit & Akar Masalah

Pengguna melaporkan: *"kok ga ada suaranya?"* (mengapa tidak ada suara audio yang berbunyi pada materi kosakata bahasa Jepang).

Melalui audit empiris mendalam, ditemukan 3 akar masalah yang saling berkelindan:
1. **Pelepasan Field (Stripping) pada Normalisasi `V.map` (`app.js` line 6312)**:
   - Saat memuat master kosakata bahasa Jepang (`vocabulary-master-ja.json`), fungsi `V.map` sebelumnya merekonstruksi objek secara eksplisit hanya dengan `{ id, word, phonetic, partOfSpeech, level, meaning, ... }` dan **membuang** atribut `kana`, `kanji`, `romaji`, dan `jlpt`.
   - Akibatnya, seluruh 1.884 kosakata bahasa Jepang dalam memori memiliki `v.kana === undefined`.
2. **Mismatch Kunci Kanji vs Hiragana pada Manifest Audio**:
   - Manifest audio `audio/manifest.json` pada PR #683 (`m025-623`) dikurasi murni berisi 1.000 entri teks Hiragana kanonik (`"みず"`, `"がくせい"`, dll.).
   - Fungsi `vocabAudioWord(v)` sebelumnya gagal mengekstrak kana karena `v.kana` hilang dan fallback ke raw Kanji (`"水"`, `"学生"`).
   - Saat Kanji dikirim ke `FiezelAudioResolver.resolve({ text: "水", locale: "ja-JP" })`, resolver menghasilkan status `ABSENT` (`not_generated`) sehingga sistem jatuh ke hening (silent failure) tanpa bunyi.
3. **Pemuatan Malas (Lazy Load) Pintu Suara Neural**:
   - Skrip neural voice (`features/neural-voice/fiezel-voice-say.js`) dimuat secara malas (`<script type="fiezel/lazy" data-fiezel-lazy="voice">`).
   - `AudioService.play()` sebelumnya hanya mengecek `const say = self.FiezelVoiceSay?.say`. Jika kartu flashcard dibuka atau tombol suara ditekan sebelum idle loader selesai, `say` bernilai `undefined`, yang langsung memicu `noteSilence()` tanpa pernah memanggil `FiezelLazy.load('voice')`.

---

## 2. Perubahan yang Diterapkan

1. **`app.js` - Normalisasi `V.map` (Baris 6312)**:
   - Memulihkan dan memvalidasi keberadaan `kana`, `kanji`, `romaji`, dan `jlpt`.
   - Mengimplementasikan fallback tangguh: jika `v.kana` absen, kana diekstrak otomatis dari `v.phonetic` (memisahkan tanda `·` pada naskah `"みず · mizu"`).
2. **`app.js` - Resolusi Cerdas `vocabAudioWord(v)`**:
   - Mendukung argumen berupa objek kata maupun string Kanji/kata. Jika berupa string, mencari padanan kana di master memori `V`.
3. **`app.js` - AudioService.play() & prefetch()**:
   - Mendeteksi teks Kanji pada locale `ja-JP` dan secara otomatis memetakan teks ke bentuk Kana sebelum memanggil pipeline suara.
   - Mengintegrasikan penantian asinkron `self.FiezelLazy?.load('voice')` di dalam rantai `viaDoor` sehingga `FiezelVoiceSay` dipastikan siap ketika dipanggil.
   - Menjaga seluruh invarian pengujian prefetch callsite (`tests/voice-callsite-prefetch-test.js`) dan penekanan subtitle listening (`tests/listening-subtitle-suppression-test.js`).
4. **`app.js` - Eager Prewarm**:
   - Menambahkan penanda `self.FiezelLazy?.load?.('voice')` pada inisiasi `flashcards()`, `vocab()`, dan `reviewVocab()` agar tumpukan audio siap sebelum tombol diklik.

---

## 3. Bukti Verifikasi Empiris & Quality Gates

1. **Pengujian Probe Playwright Headless**:
   - Menjalankan skrip browser probe: kata Kanji `"水"` dipetakan menjadi `"みず"` (`ja_vocab_00267`), kata Kanji `"学生"` dipetakan menjadi `"がくせい"` (`ja_vocab_00149`).
   - Resolver menemukan SHA256 key kanonik di manifest dan mengunduh berkas Cloudflare R2 worker `.mp3` secara nyata (`https://fiezel-audio.fitrajft.workers.dev/a/61ce968e...mp3` & `https://fiezel-audio.fitrajft.workers.dev/a/19157ef...mp3`).
   - Playback provider tercatat valid: `{ provider: 'fiezel-voice-say' }`.
2. **Kelulusan Quality Gates Lokal**:
   - `node tests/voice-callsite-prefetch-test.js`: **PASS (68 pass, 0 fail)**
   - `node tests/listening-subtitle-suppression-test.js`: **PASS (9/9 assert PASS)**
   - `node tests/id-golden-snapshot-test.js`: **PASS (baseline emas utuh)**
   - `node tests/th-ui-leak-test.js`: **PASS (nol kebocoran)**
   - `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, build m025-625)**
   - `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
   - `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync 100%)**

---

## 4. Status Rilis

- **Build Version**: `m025-625`
- **Tipe Perubahan**: `fix(audio)`
- **Kesiapan Deploy**: Siap diajukan melalui Pull Request ke branch `main`.
