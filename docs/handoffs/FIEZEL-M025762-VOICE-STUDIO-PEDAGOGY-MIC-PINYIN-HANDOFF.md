# FIEZEL HANDOFF DOSSIER: M025-762
**Tanggal & Waktu**: 2026-11-04
**Topik**: Restorasi Pedagogis "Guru Galak Tapi Penuh Perhatian", Pembebasan Soket Mikrofon Duplex Gemini Live, Eliminasi Kebocoran Aksara Kanji/Hanzi pada Baris Cara Baca & Terjemahan, dan Resolusi Overlap Visual Ruby Layer di Kawan Bicara (Mitra Kaiwa Studio)
**Nomor Build**: `m025-762`
**Status Audit**: 100% HIJAU (Lulus Seluruh Pengujian Mutu)

---

## 1. Ringkasan Keluhan Pengguna & Akar Masalah (Root Cause)

| Masalah yang Dilaporkan Pengguna | Akar Masalah Teknis | Solusi yang Diterapkan |
| :--- | :--- | :--- |
| **1. Suara Pengguna Tidak Masuk / Mikrofon Macet** ("hanya bisa dengar AI, user tidak bisa merespon karena socket/saklar mic tidak hidup") | (a) Protokol WebSocket `BidiGenerateContentConstrained` menuntut payload `{ realtimeInput: { mediaChunks: [{ mimeType, data }] } }`. Kode lama hanya mengirimkan `{ audio: { mimeType, data } }`, sehingga server Google menolak paket audio tanpa error log.<br>(b) `SileroNeuralVadGate` mematok ambang batas vokal terlalu tinggi (`pSpeech >= 0.58`, `rms >= 0.004`, streak 4 frame), mengabaikan input suara normal dari headset/laptop.<br>(c) Pada speech recognition fallback, `rec.lang` hanya mengecek `ja` vs `en-US` (mengabaikan `zh-CN`). | (a) Memasang pengiriman ganda `mediaChunks` + `audio` di `App.tsx` dan `fiezel-mochi-voice-sos.js`, serta menyertakan `clientContent` turn marker saat vokal selesai.<br>(b) Mengkalibrasi ulang `SileroNeuralVadGate` menjadi `pSpeech >= 0.45`, `rms >= 0.002`, streak 2 frame.<br>(c) Memasang `rec.lang = targetLang === 'ja' ? 'ja-JP' : targetLang === 'zh' ? 'zh-CN' : 'en-US'`. |
| **2. Kebocoran Karakter Kanji / Hanzi di Cara Baca & Terjemahan** ("di kursus Mandarin dan Jepang, cara baca atau terjemahan masih terbawa kanji, membingungkan user") | (a) Tidak ada mesin Pinyin Mandarin terdedikasi di Voice Studio sehingga teks Hanzi dialirkan ke furigana generator Jepang.<br>(b) `toPhoneticRomaji` dan Gemini Live terkadang menyisakan karakter kanji/kana dalam field `pronunciation`.<br>(c) `sanitizeMotherTongueHint` hanya membersihkan karakter CJK di dalam tanda kutip. | (a) Membangun kamus leksikon Mandarin `mandarinLexicon.json` (2.228 kata + 528 karakter tunggal) dan engine `mandarinPhonetics.ts` (`toPhoneticPinyin`, `renderMandarinRubyHtml`).<br>(b) Menegakkan filter anti-leak ketat: seluruh baris cara baca dibersihkan 100% dari aksara Asia Timur.<br>(c) Sanitasi terjemahan bahasa Indonesia/Thai membasmi seluruh karakter Hanzi/Kanji mentah. |
| **3. Terjemahan & Elemen Teks Saling Menimpa / Bertumpuk** ("seperti ada terjemahan beruntun menimpa, seperti bukan satu layer") | (a) Tag `<ruby>` dan `<rt>` terkungkung di dalam kontainer ber-`line-height: 1.375` (`leading-snug`) dan `rt` memiliki `transform: translateY(-0.1em)`, menyebabkan teks melipat menabrak baris di atasnya.<br>(b) `updateLiveAiTranslationDraft` memicu rerender beruntun setiap token streaming tiba dan menjalankan translasi parsial pada potongan kata yang belum selesai. | (a) Menetapkan `line-height: 2.2 !important` pada container `.fz-ja-ruby-text` dan `.fz-zh-ruby-text`, mencabut `transform: translateY`, serta memberi `space-y-2` dan padding vertikal lega.<br>(b) Membatasi translasi live streaming hanya untuk kalimat lengkap bertanda baca atau berbobot >= 8 karakter. |
| **4. Pedagogis AI Kaku & Bantuan Jawaban Tidak Nyambung** ("sarkastiknya tidak ada, kaku banget kayak AI biasa, bantuan jawaban tidak sesuai pertanyaan") | (a) `route-voice-live.js` mengunci `temperature: 0.55` dan membatasi respon maksimal 25 kata.<br>(b) Setup WebSocket Gemini Live tidak menyertakan instruksi nada bahasa (Mandarin) dan tidak menyuntikkan arahan tough-love "Guru Galak Tapi Penuh Perhatian". | (a) Menaikkan `temperature` ke `0.72`, melonggarkan batas ke 2-4 kalimat (maks 45 kata), dan mengaktifkan persona pendidik tegas berwibawa.<br>(b) Menyuntikkan prompt mentor tajam yang menuntut **Echo Redemption** saat ada kesalahan tata bahasa/partikel/nada. |

---

## 2. Bukti Pengujian Empiris & Kelulusan Gerbang Mutu

1. **`node tests/voice-cjk-phonetics-anti-leak-test.js`**: **PASS 100%**
   - Transliterasi Pinyin Mandarin bertanda nada bebas dari Hanzi.
   - Anotasi `<ruby class="zh-ruby">` dan `<rt class="zh-rt">` terbukti presisi.
   - Transliterasi Romaji Hepburn Jepang bebas dari Kanji dan Kana.
   - Terjemahan bahasa Indonesia dan Thai bebas dari kebocoran aksara CJK.
2. **`node tests/voice-copilot-relevance-gate-test.js`**: **PASS 100% (25/25 skenario)**
3. **`node tests/voice-duplex-fullphone-contract-test.js`**: **PASS 100% (7/7 kontrak)**
4. **`node tests/voice-studio-reformulation-translation-test.js`**: **PASS 100%**
5. **`node tests/voice-studio-ui-architecture-test.js`**: **PASS 100% (8/8 audit)**
6. **`node tests/id-golden-snapshot-test.js`**: **PASS 100% HIJAU**
7. **`node tests/th-ui-leak-test.js`**: **PASS 100% HIJAU**
8. **`node tests/curriculum-cache-version-test.js`**: **PASS 100% HIJAU (m025-762)**
9. **`node tools/bump-build.mjs --check`**: **Selaras 6 Titik Wajib**

---

## 3. Berkas yang Dimodifikasi

- `features/voice-studio/src/lib/mandarinLexicon.json` (Baru: Leksikon Mandarin)
- `features/voice-studio/src/lib/mandarinPhonetics.ts` (Baru: Mesin Pinyin & Ruby)
- `tests/voice-cjk-phonetics-anti-leak-test.js` (Baru: Uji Mutu Anti-Leak CJK)
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`
- `features/voice-studio/src/components/JapaneseRubyDisplay.tsx`
- `features/voice-studio/src/index.css`
- `features/voice-studio/src/lib/japanesePhonetics.js`
- `features/voice-studio/src/lib/liveCallHelper.ts`
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/sileroVadGate.ts`
- `features/voice-studio/src/lib/braincore.ts`
- `features/voice-studio/src/data/callScenarios.ts`
- `features/voice-studio/src/data/fiezelLifeCallScenarios.ts`
- `features/voice-studio/src/data/ieltsCallScenarios.ts`
- `features/voice-studio/dist/voice-studio.js`
- `features/voice-studio/dist/voice-studio.css`
- `features/mascot/fiezel-mochi-voice-sos.js`
- `workers/api/voice/route-voice-live.js`
- `id-golden-baseline.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `coordination/BUILD-VERSION.json`
- `call.html`
- `kurikulum.html`
- `misi.html`
- `features/voice-studio/call.html`
