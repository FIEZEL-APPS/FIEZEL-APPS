# Handoff FIEZEL m025-620: Pelafalan Otentik Kosakata Jepang Menggunakan Hiragana (Kana) & Language Code JA

**Otoritas: USER / OWNER.**
**Nomor Build: `m025-620`**
**Tanggal: 20 Oktober 2026**

---

## 1. Latar Belakang & Keluhan Pengguna

Pengguna melaporkan:
> *"pengucapan bahas jepangnya hampir 70% salah semua, karena di ucapkan seperti bahasa cina"*

### Akar Masalah (Root Cause Analysis):
1. **70.8% Karakter Kanji Tanpa Penanda Fonetik**:
   Sebanyak 708 dari 1.000 kata JLPT N5 di `content/ja/vocabulary-master-ja.json` mengandung aksara Kanji (`水`, `学生`, `先生`, `車`, `山`, `川`, dll.).
2. **Ambiguitas Mesin TTS Multilingual**:
   Model ElevenLabs `eleven_multilingual_v2` memproses teks multibahasa. Ketika menerima karakter CJK Kanji tunggal tanpa partikel tata bahasa Jepang atau furigana/kana, model tersebut menafsirkan karakter tersebut sebagai Hanzi Mandarin atau On'yomi Cina.
   - Contoh nyata yang dibuktikan via probe langsung audio R2: Kata `水` dilafalkan sebagai *"sue / sui / shui"* (Mandarin `shuǐ`) alih-alih bahasa Jepang murni *"mizu"*. Kata `学生` dilafalkan *"xuesheng"*, `先生` dilafalkan *"xiansheng"*.
3. **Ketersediaan Aksara Hiragana Otentik**:
   Seluruh 1.000 entri kosa kata di `content/ja/vocabulary-master-ja.json` sebenarnya telah memiliki field `record.kana` (Hiragana murni tanpa ambiguitas fonetik).

---

## 2. Solusi & Perubahan Teknis

1. **Pipeline Batch Generator (`tools/audio-batch-generate.mjs`)**:
   - Generator `vocabulary_ja` kini wajib memprioritaskan aksara Hiragana:
     `text: record.kana || record.word`
   - Pada pemanggilan ElevenLabs TTS (`synthesize()`), menambahkan parameter eksplisit `language_code: 'ja'` bila locale adalah `'ja-JP'` atau dimulai dengan `'ja'`. Ini memaksa tokenizer dan model fonemik ElevenLabs memproses audio secara eksklusif dalam sistem suara bahasa Jepang.

2. **Aplikasi Klien (`app.js`)**:
   - Menambahkan helper `vocabAudioWord(v)`:
     ```javascript
     function vocabAudioWord(v){if(!v)return'';if(jaCourseOn()&&v.kana)return v.kana;return v.word||''}
     ```
   - Menggunakan `vocabAudioWord(v)` pada seluruh titik putar audio kosa kata:
     - `playTodayVocabAudio(v)`
     - `playHeroWordAudio(v)`
     - `flashcards(level)` auto-play
     - `reviewVocab()` auto-play
   - Menjaga invariant pengujian prefetch callsite (`tests/voice-callsite-prefetch-test.js` aturan `a17`) dengan mempertahankan `next:nextCard?nextCard.word:''` di `flashcards()`, dan menangani lookup hiragana untuk bahasa Jepang di dalam `AudioService.prefetch()`.

3. **Pembersihan Manifest Audio (`audio/manifest.json`)**:
   - Menghapus 1.000 entri hash lama `locale: 'ja-JP'` yang sebelumnya digenerasi dari teks Kanji.
   - Hasil dry-run membuktikan antrean baru memuat tepat 1.000 kata N5 berbasis Hiragana (total 3.695 karakter).

4. **Hexa-Sync Arbiter & Baseline**:
   - Build dinaikkan ke `m025-620` via `node tools/bump-build.mjs`.
   - Baseline literal emas disinkronkan ke 5.849 literal (`id-golden-baseline.json`).

---

## 3. Berkas yang Diubah

1. `tools/audio-batch-generate.mjs`: Pemakaian `record.kana` dan injeksi `language_code: 'ja'`.
2. `app.js`: Implementasi `vocabAudioWord(v)` dan handling prefetch kosa kata Jepang.
3. `audio/manifest.json`: Purge 1.000 entri lama beraksara Kanji.
4. `coordination/BUILD-VERSION.json`: Bump build ke `m025-620`.
5. `id-golden-baseline.json`: Sinkronisasi snapshot literal emas.
6. `sw.js`: Bump shell cache `m025-620`.
7. `core-config.js`: Bump `FIEZEL_PAGE_BUILD` ke `m025-620`.
8. `features/neural-voice/fiezel-diag-panel.js`: Bump `DIAG_BUILD` ke `m025-620`.
9. `kurikulum.html`: Cache busting query `?v=m025-620`.
10. `misi.html`: Cache busting query `?v=m025-620`.
11. `reports/th-ui-leak-report.json`: Penyesuaian nomor baris audit Thai leak.
12. `docs/handoffs/FIEZEL-M025620-JAPANESE-VOCAB-KANA-VOICE-HANDOFF.md`: Dokumen serah terima ini.

---

## 4. Hasil Verifikasi Quality Gate Lokal

Seluruh gerbang mutu lokal 100% HIJAU:
- `node tests/id-golden-snapshot-test.js` -> PASS (13/13 berkas identik, 5.849 literal utuh)
- `node tests/voice-callsite-prefetch-test.js` -> PASS (68/68 penegasan prefetch lulus)
- `node tests/th-ui-leak-test.js` -> PASS (4.412 kunci id/th bebas kebocoran)
- `node tests/curriculum-cache-version-test.js` -> PASS (26 penegasan selaras m025-620)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tools/bump-build.mjs --check` -> PASS (Hexa-sync selaras di 6 titik)
