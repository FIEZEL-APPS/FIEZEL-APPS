# FIEZEL Handoff: Universal Furigana Ruby & Phonetic Hepburn Romaji Parity in AI Voice Studio (m025-710)

## 1. Ringkasan Eksekutif & Akar Masalah
- **Latar Belakang**:
  Pengguna melaporkan anomali fatal pada fitur **Mitra Kaiwa / Free Talk (Sensei Nanami)** (`call.html`):
  1. Pengucapan, kanji, hiragana, romaji, dan katakana meleset dibandingkan audio suara AI/TTS.
  2. Contoh empiris pada kalimat:
     `Ã£Ââ€šÃ£â€šÅ’Ã¯Â¼Å¸Ã£ÂÂ¾Ã£ÂÅ¸Ã©Ââ€¢Ã£Ââ€ Ã¨Â¨â‚¬Ã¨ÂªÅ¾Ã£ÂÂ Ã£â€šË†Ã¯Â¼ÂÃ¦â€”Â¥Ã¦Å“Â¬Ã¨ÂªÅ¾Ã£ÂÂ§Ã¨Â©Â±Ã£ÂÂÃ£Ââ€ Ã£ÂÂ£Ã£ÂÂ¦Ã§Â´â€žÃ¦ÂÅ¸Ã£ÂÂ§Ã£Ââ€”Ã£â€šâ€¡Ã¯Â¼Å¸RPGÃ£ÂÂ®Ã¨Â©Â±Ã£â€šâ€™Ã§Â¶Å¡Ã£Ââ€˜Ã£â€šË†Ã£Ââ€ Ã£â€šË†Ã£â‚¬â€šÃ£ÂÂ©Ã£â€šâ€œÃ£ÂÂªÃ£Æ’Â¢Ã£Æ’Â³Ã£â€šÂ¹Ã£â€šÂ¿Ã£Æ’Â¼Ã£ÂÅ’Ã©Æ’Â¨Ã¥Â±â€¹Ã£ÂÂ«Ã£Ââ€žÃ£ÂÅ¸Ã£ÂÂ®Ã¯Â¼Å¸`
     - `Ã©Ââ€¢Ã£Ââ€ Ã¨Â¨â‚¬Ã¨ÂªÅ¾`: `Ã©Ââ€¢` di-ruby `Ã£ÂÂ¡Ã£ÂÅ’`, namun `Ã¨Â¨â‚¬` salah di-ruby `Ã£Ââ€ž` (dari `Ã¨Â¨â‚¬Ã£Ââ€ `) dan `Ã¨ÂªÅ¾` gundul tanpa ruby sama sekali.
     - `Ã§Â´â€žÃ¦ÂÅ¸`: Kanji gundul (0 furigana ruby)!
     - `Ã§Â¶Å¡Ã£Ââ€˜Ã£â€šË†Ã£Ââ€ `: `Ã§Â¶Å¡` gundul (0 furigana ruby)!
     - Romaji: `chiga u i dayo!` (`gengo` lenyap dan terkorupsi), `RPGno` (tanpa spasi partikel), `keyouyo.` (`tsuzu` hilang tertelan), `donnamonsutaaga heya niitano?` (spasi antar-kata lebur).
     - Kartu Copilot: `<ruby>Ã¥Â¤Â§Ã£ÂÂÃ£Ââ€ž<rt>Ã£ÂÅ Ã£ÂÅ Ã£ÂÂÃ£Ââ€ž</rt></ruby>` menyandera okurigana di dalam tag `<ruby>` alih-alih meletakkannya di luar `<ruby>Ã¥Â¤Â§<rt>Ã£ÂÅ Ã£ÂÅ </rt></ruby>Ã£ÂÂÃ£Ââ€ž`.
- **Akar Masalah**:
  1. Sub-aplikasi `call.html` (`features/voice-studio`) sebelumnya menggunakan berkas kamus stub terisolasi `features/voice-studio/src/lib/japanesePhonetics.js` yang hanya berisi ~100 kata statis, terpisah total dari kamus master FIEZEL (6,128 kata).
  2. Akibatnya, setiap kata majemuk percakapan di luar 100 kata stub tersebut jatuh ke *fallback single-kanji* yang salah memilih bacaan kun'yomi/on'yomi dan menelan okurigana.
  3. Mesin fonetik di Voice Studio belum mengikat kaidah pemisahan okurigana, pemisah kata partikel latin/katakana, dan aturan Hepburn murni (*ja/ju/jo* bukan *jya/jyu/jyo*, sokuon *tch* sebelum *ch*).

---

## 2. Solusi Arsitektural & Realisasi Teknis
1. **ESM Master Lexicon Adapter (`features/voice-studio/src/lib/masterLexicon.js`)**:
   - Mengintegrasikan langsung `tools/lexicon_dump.json` (6,234 kata majemuk, 1,563 batang konjugasi, 1,653 kanji tunggal) ke dalam bundle Vite Voice Studio (`dist/voice-studio.js`).
   - Tidak lagi bergantung pada kamus stub kerdil; 100% kosakata master tersedia di dalam memori Voice Studio.
2. **Universal Furigana Ruby Engine (`features/voice-studio/src/lib/japanesePhonetics.js`)**:
   - Implementasi greedy longest-match (terpanjang ke terpendek).
   - Pemisahan okurigana otomatis: tag `<ruby>` hanya membungkus batang kanji (`<ruby class="fz-ja-ruby">Ã¥Â¤Â§<rt class="fz-ja-rt">Ã£ÂÅ Ã£ÂÅ </rt></ruby>Ã£ÂÂÃ£Ââ€ž`).
   - Penanganan konjugasi verba & adjektiva (`STEMS` + `tail`).
3. **Pure Hepburn Phonetic Romaji Transliteration**:
   - Spasi batas kata alami sebelum dan sesudah partikel (`RPG no`, `suraimu ga`).
   - Eliminasi total anomalistik `jy` (selalu `ja`, `ju`, `jo`).
   - Sokuon sebelum `ch` selalu `tch` (`matchi`, `suitchi`, `chotto`, `botchan`).
   - Zero-Kanji-Leakage Invariant: pencegahan 100% bocoran karakter kanji ke string romaji.
4. **Pembaruan Kamus Master (`tools/lexicon_dump.json` & `tools/build-dictionary-module.mjs`)**:
   - Menambahkan 106+ kata percakapan umum, konjugasi verba tak beraturan (`Ã¦ÂÂ¥Ã£â€šâ€¹`/`Ã¨Â¡Å’Ã£ÂÂ`), ungkapan santun (`Ã£ÂÅ Ã§â€“Â²Ã£â€šÅ’Ã¦Â§ËœÃ£ÂÂ§Ã£Ââ€”Ã£ÂÅ¸`, `Ã£ÂÅ Ã©â€šÂªÃ©Â­â€Ã£Ââ€”Ã£ÂÂ¾Ã£Ââ„¢`, `Ã§Å¸Â¥Ã£ÂÂ£Ã£ÂÂ¦Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ„¢`, `Ã¥Â°â€˜Ã£â‚¬â€¦Ã£ÂÅ Ã¥Â¾â€¦Ã£ÂÂ¡Ã£ÂÂÃ£ÂÂ Ã£Ââ€¢Ã£Ââ€ž`, dll.), dan pasangan transitif/intransitif (`Ã¥â€¦Â¥Ã£â€šâ€¹`/`Ã¥â€¦Â¥Ã£â€šÅ’Ã£â€šâ€¹`, `Ã¥â€¡ÂºÃ£â€šâ€¹`/`Ã¥â€¡ÂºÃ£Ââ„¢`, `Ã¦Â¶Ë†Ã£Ââ„¢`/`Ã¦Â¶Ë†Ã£ÂË†Ã£â€šâ€¹`, `Ã¦â€™Â®Ã£â€šâ€¹`/`Ã¦â€™Â®Ã£â€šÅ Ã£ÂÂ¾Ã£Ââ„¢`).

---

## 3. Tabel Verifikasi Kuantitatif (Zero-Potemkin Invariant)

| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **Master Lexicon Volume** | $\ge 6,000$ kata | **6,234 kata** | **LULUS (100%)** |
| **Kanji Stems Volume** | $\ge 1,500$ batang | **1,563 batang** | **LULUS (100%)** |
| **Single Kanji Coverage** | $\ge 1,640$ kanji | **1,653 kanji** | **LULUS (100%)** |
| **Voice Studio Bundle** | Master Lexicon embedded | **dist/voice-studio.js (1,348 KB)** | **LULUS (100%)** |
| **Kalimat Uji Pengguna (S1 Furigana)** | Ruby akurat pada 100% kanji | `<ruby>Ã©Ââ€¢Ã£Ââ€ Ã¨Â¨â‚¬Ã¨ÂªÅ¾<rt>Ã£ÂÂ¡Ã£ÂÅ’Ã£Ââ€ Ã£Ââ€™Ã£â€šâ€œÃ£Ââ€</rt></ruby>...<ruby>Ã§Â´â€žÃ¦ÂÅ¸<rt>Ã£â€šâ€žÃ£ÂÂÃ£ÂÂÃ£ÂÂ</rt></ruby>...<ruby>Ã§Â¶Å¡<rt>Ã£ÂÂ¤Ã£ÂÂ¥</rt></ruby>Ã£Ââ€˜Ã£â€šË†Ã£Ââ€ ` | **LULUS (100%)** |
| **Kalimat Uji Pengguna (S1 Romaji)** | Hepburn word-spaced, zero leak | `Are? Mata chigau gengo da yo! Nihongo de hanasou tte yakusoku de sho? RPG no hanashi o tsuzukeyou yo. Donna monsutaa ga heya ni ita no?` | **LULUS (100%)** |
| **Kartu Copilot (S2 Furigana)** | Okurigana di luar `<ruby>` | `<ruby>Ã¥Â¤Â§<rt>Ã£ÂÅ Ã£ÂÅ </rt></ruby>Ã£ÂÂÃ£Ââ€žÃ£â€šÂ¹Ã£Æ’Â©Ã£â€šÂ¤Ã£Æ’Â Ã£ÂÅ’Ã£Ââ€žÃ£ÂÂ¾Ã£Ââ€”Ã£ÂÅ¸Ã£â‚¬â€š` | **LULUS (100%)** |
| **Kartu Copilot (S2 Romaji)** | Hepburn word-spaced | `Ookii suraimu ga ima shita.` | **LULUS (100%)** |
| **Hepburn Parity Suite** | 28 kata uji identik | **28/28 kata (100% parity)** | **LULUS (100%)** |
| **Zero Kanji Leakage Suite** | 13 dialog percakapan kompleks | **0 kanji bocor** | **LULUS (100%)** |
| **Hexa-Sync Build Version** | 7 titik selaras sempurna | **m025-710** | **LULUS (100%)** |

---

## 4. Hasil Audit Otomatis Gerbang Uji
1. `node tests/japanese-phonetics-test.js` -> **8 Test Suites PASSED (100%)**
2. `node tests/japanese-dictionary-test.js` -> **30/30 Tests PASSED (100%)**
3. `node tests/japanese-universal-furigana-test.js` -> **26/26 Tests PASSED (100%)**
4. `node tests/content-integrity-gate.js` -> **4/4 Gates PASSED (100%)**
5. `node tests/story-voice-autoplay-test.js` -> **Semua Pengujian Audio & Autoplay PASSED (100%)**
6. `node tests/curriculum-cache-version-test.js` -> **33 penegasan PASSED (m025-710)**
7. `node tools/bump-build.mjs --check` -> **Selaras (m025-710)**

---

## 5. Next Steps & Roadmap
1. **Pemantauan Pasca-Rilis**: Memantau telemetri live session Mitra Kaiwa di produksi (`https://fiezel.my.id/call.html`) untuk memverifikasi akurasi transkripsi dan subtitle langsung secara visual.
2. **Ekspansi Leksikon N2/N1**: Menambahkan kosakata idiomatis dan dialek regional (Kansai-ben) ke Master Lexicon pada gelombang rilis berikutnya.
