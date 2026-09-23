# Handoff — Tampilan khas kursus Bahasa Jepang

**OWNER:** fitrajft-ux · **Status:** selesai tahap 1 (m025-362), menunggu review OWNER.

## Yang dibangun

Kursus Jepang kini berbeda dari kursus Inggris di tiga lapis:

1. **Tema** (`fiezel-2.css`, `body.fz-lang-ja`): palet shu/ai/washi, motif seigaiha, judul
   Mincho, nav bawah nila dengan cap shu, sudut kartu tegas.
2. **Istilah** (`FiezelI18n.setCourse('ja')`, kunci `kursus-ja.*` di `copy-*-bahasa.js`):
   Renshū, Kyōshitsu, Kyō, Shinpo, Watashi, Kotoba, Bunpō, Dokkai, Sakubun, Toshokan.
3. **Fitur khas aplikasi Jepang** (`features/japanese/fiezel-ja-ui.js`):
   - Furigana `<ruby>` di atas kanji + romaji terpisah. Tombol ふりがな / ローマ字
     menyembunyikannya (disimpan di `fiezel-ja-display-v1`, diterapkan sebagai kelas body
     `fz-ja-no-furigana` / `fz-ja-no-romaji`, tanpa melukis ulang). Tampil di kuis
     kosakata, flashcard, dan kata hari ini.
   - Tabel kana (rute `kana`, diblokir di kursus Inggris): 46 gojūon + 25 dakuten,
     hiragana ↔ katakana.
   - Kata hari ini (今日の言葉) di Kyō, deterministik per hari dari bank level aktif.
   - Label level JLPT (A1 → N5 …) di tombol level dan keping level beranda. Data tetap CEFR.
   - Kartu **Segera hadir** di Renshū: Chōkai, Kaiwa, Kanji (urutan goresan), JLPT Moshi.
     Kartunya `aria-disabled`, tanpa `go()`, jadi tidak menjanjikan isi yang belum ada.

Referensi pola: LingoDeer & LingQ (kontrol furigana), Bunpro (tingkat furigana), tabel kana
StudyX/ToolV/Hanabira (tombol hiragana/katakana, mode romaji), Migii/Kanjijo (jalur JLPT).

## Gerbang

`tests/japanese-ja-ui-test.js` (terdaftar di `quality.yml`) mengikat J1–J7: ruby hanya untuk
kata ber-kanji, baris bacaan hanya romaji, preferensi → kelas body, 71 sel kana, kartu segera
hadir tidak bisa diketuk, label JLPT, rute kana diblokir di kursus Inggris.

## Berikutnya (next)

- Chōkai/Kaiwa: butuh suara dan pengenalan ucapan ja-JP (tumpukan audio masih dipaku en-US,
  lihat `tests/audio-locale-guard-test.js`). Saat siap, cabut kartunya dari `SOON` dan
  lepaskan `TARGET_LANG_BLOCKED_VIEWS.ja`.
- Kanji: butuh data urutan goresan (mis. KanjiVG) dan bank kanji N5.
- JLPT Moshi: butuh bank soal format JLPT.
- Furigana di kalimat contoh: bank belum menyimpan bacaan per kata; perlu segmentasi.
- Suara kana di tabel: menunggu suara ja-JP yang sama.
- Kostum PAW khas Jepang (hachimaki): registry outfit tertutup, butuh keputusan OWNER.
