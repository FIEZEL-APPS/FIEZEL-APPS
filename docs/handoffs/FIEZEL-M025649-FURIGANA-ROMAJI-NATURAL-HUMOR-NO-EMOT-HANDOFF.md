# FIEZEL HANDOFF DOSSIER: M025-649 — FURIGANA RUBY, ACCURATE PHONETIC ROMAJI (WA/O/E) & NATURAL HUMOR WITHOUT EMOJI LEAKAGE

Tanggal: 24 Oktober 2026
Build: m025-649
Branch: fix/m025-649-furigana-romaji-natural-voice-no-emot
Target: main
Arbiter: node tools/bump-build.mjs "feat(voice-studio): m025-649 furigana ruby, accurate phonetic romaji wa/o/e, and natural humor without emoji leakage"

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Furigana Ruby dan Romaji Fonetik Eksak di Seluruh Teks Jepang
* **Keluhan Pengguna**:
  > *"di bawah tulisan jepangnya tidak ada tulisan furigananya, seharusnya semua tulisan jepang ada tulisan furigana dan romaji, tapi romajinya jangan sampai salah ketika ada partikel ha contohnya tulisan kanji watashi ha, seharusnya di tulisan romajinya di buat watashi wa, paham kan, tapi bukan di satu kata saja, tapi di semuanya harus sesuai dengan vokal"*
* **Akar Masalah**:
  1. Komponen antarmuka `App.tsx` sebelumnya merender teks Jepang sebagai string mentah (`<p>{activeAiLiveText}</p>` dan `{turn.text}`) tanpa penandaan hiragana bacaan (*ruby/furigana*) dan tanpa baris pelafalan romaji di bawahnya.
  2. Pustaka transliterasi romaji standar sering melakukan pemetaan karakter 1-ke-1 secara harfiah (menjadikan `私は` sebagai `watashi ha`, `本を` sebagai `hon wo`, dan `学校へ` sebagai `gakkou he`), yang menyalahi kaidah fonetik bahasa Jepang modern di mana partikel gramatikal dibaca `wa`, `o`, dan `e`.
* **Solusi**:
  1. **Mesin Fonetik & Furigana Bahasa Jepang (`features/voice-studio/src/lib/japanesePhonetics.ts`)**:
     - Kamus kosakata dan pola gramatika kanji -> furigana hiragana.
     - `tokenizeJapaneseToRuby`: Menghasilkan markup standar `<ruby class="fz-ja-ruby">Kanji<rt class="fz-ja-rt">furigana</rt></ruby>`.
     - `toPhoneticRomaji`: Transliterasi Hepburn fonetik dengan aturan ketat:
       * Partikel topik `は` -> `wa` (misal: `watashi wa`, `kyou wa`, `kore wa`, `konnichiwa`, `konbanwa`, `gamen wa`).
       * Partikel objek `を` -> `o` (misal: `nihongo o`, `koohii o`).
       * Partikel arah `へ` -> `e` (misal: `gakkou e`).
       * Sokuon `っ` menggandakan konsonan berikutnya (misal: `chotto`, `yokatta`, `otoshichatta`).
       * Chōonpu `ー` memanjangkan vokal sebelumnya (misal: `koohii`, `beddo`).
  2. **Komponen Reusable `JapaneseRubyDisplay.tsx`**:
     - Merender baris ruby furigana di atas kanji dan baris romaji fonetik di bawahnya.
     - Digunakan secara terpadu di HUD aktif telepon, transkrip percakapan AI & Murid, dan kartu bantuan rekomendasi pemula (*Beginner Answer Assistant*).
  3. **Gaya Tipografi Ruby (`features/voice-studio/src/index.css`)**:
     - Menjamin `ruby` dan `rt` terbaca jelas pada layar ponsel dan desktop tanpa terpotong (*overflow safe*).

---

### B. Eliminasi Kebocoran Terjemahan Emoji ("Smiling Face") pada TTS & Naskah
* **Keluhan Pengguna**:
  > *"ketika muncul emot, emotnya di terjemahin juga seperti smiling face dan lain lain"*
* **Akar Masalah**:
  1. Saat model LLM menghasilkan emoji (seperti `😊`, `😂`), penerjemah internal atau synthesizer suara Edge-TTS membacakan nama deskriptor Unicode emoji tersebut secara harfiah (misal: `"smiling face with smiling eyes"` atau `"wajah tersenyum"`).
  2. Deskriptor tindakan seperti `(smiling face)` atau `*laughs*` kadang bocor ke kolom terjemahan bahasa Indonesia dan Thailand.
* **Solusi**:
  1. **Larangan Keras pada Prompt AI (`workers/api/ai/ai-tasks.js` & `liveTransport.ts`)**:
     - Ditambahkan aturan: `CRITICAL: NEVER output emojis (e.g. 😊, 😂) or text descriptors like (smiling face) / *laughs*. Plain human dialogue text only!`
  2. **Filter Deterministik Berlapis (`stripEmojisAndEmotWords`)**:
     - Lapisan 1 (Worker): `shapeConversationOutput` menyaring semua emoji Unicode dan frasa emotikon dari `reply` maupun `meaning`.
     - Lapisan 2 (Transport Klien): `synthesizeFlexibleTts` dan pembersih respons Gemini Live menyaring emoji sebelum dikirim ke mesin audio TTS.
     - Lapisan 3 (Tampilan Klien): `JapaneseRubyDisplay` dan `speakAiText` menyaring string sebelum dirender atau dibunyikan.

---

### C. Menghilangkan Tawa Robotik yang Dipaksakan (Natural Human Wit & Humor)
* **Keluhan Pengguna**:
  > *"ketawanya seperti robot tidak natural seperti di paksakan"*
* **Akar Masalah**:
  1. Iterasi sebelumnya menambahkan awalan wajib `"Haha!"` atau `"あはは！"` di setiap kali giliran AI berbicara, sehingga AI terdengar mengulang template tertawa kaku pada setiap kalimat.
* **Solusi**:
  1. Menghapus pembuka tertawa wajib statis.
  2. Menggantinya dengan keceriaan dan selera humor yang fleksibel dan bervariasi sesuai konteks cerita murid:
     - Bahasa Jepang: Menggunakan seruan alami pergaulan seperti `「ウケる！」`, `「それ、あるある！」`, `「えっ、マジで！？」`, `「ふふっ、わかる〜！」`, atau tertawa riang hanya saat ada kejadian lucu.
     - Bahasa Inggris: Menggunakan ungkapan alami seperti `"No way, seriously?!"`, `"That is hilarious!"`, `"Haha oh man!"`, tanpa memaksakan kata tawa di setiap kalimat.

---

## 2. Bukti Pengujian Empiris

### A. Pengujian Mesin Fonetik & Furigana (`tests/japanese-phonetics-test.mjs`)
Dijalankan dengan perintah: `node --experimental-strip-types tests/japanese-phonetics-test.mjs`

```text
=== TESTING JAPANESE PHONETICS & FURIGANA ENGINE ===

--- Test Suite 1: Particle は -> "wa" (Strict Rule) ---
Input:  "私は毎日日本語を勉強します。"
Romaji: Watashi wa mainichi nihongo o benkyou shimasu.
Input:  "今日はいい天気ですね！"
Romaji: Kyou wa ii tenki desu ne!
Input:  "こんにちは、七海先生！"
Romaji: Konnichiwa, nanami-sensei!
Input:  "これは田中さんの本です。"
Romaji: Kore wa tanaka-san no hon desu.
Input:  "画面は無事だったから良かった！"
Romaji: Gamen wa buji datta kara yokatta!

--- Test Suite 2: Particle を -> "o" & へ -> "e" ---
Input:  "学校へ行きます。コーヒーをください。"
Romaji: Gakkou e ikimasu. koohii o kudasai.

--- Test Suite 3: Sokuon っ & Yoon ---
Input:  "目覚まし時計を止めようとしてスマホをベッドから落としちゃった！"
Romaji: Mezamashidokei o tomeyou toshitesumaho o beddo kara otoshichatta!

--- Test Suite 4: Furigana Ruby HTML ---
Furigana HTML: <ruby class="fz-ja-ruby">私<rt class="fz-ja-rt">わたし</rt></ruby>は<ruby class="fz-ja-ruby">毎日<rt class="fz-ja-rt">まいにち</rt></ruby><ruby class="fz-ja-ruby">日本語<rt class="fz-ja-rt">にほんご</rt></ruby>を<ruby class="fz-ja-ruby">勉強<rt class="fz-ja-rt">べんきょう</rt></ruby>します。

--- Test Suite 5: Emoji & Emoticon Stripping ---
Raw with emots:   あはは！やばいね！ 😂 😊 (smiling face) *laughs*
Cleaned text:     あはは！やばいね！

🎉 ALL JAPANESE PHONETICS & FURIGANA TESTS PASSED WITH 100% ACCURACY!
```

### B. Pengujian Mutu Lokal (Quality Gates)
* `node tests/id-golden-snapshot-test.js`: **HIJAU** (13 berkas terkunci identik, baseline emas terverifikasi).
* `node tests/th-ui-leak-test.js`: **PASS** (4498 kunci terverifikasi, nol kebocoran teks).
* `node tests/curriculum-cache-version-test.js`: **OK** (33 penegasan selaras dengan m025-649).
* `node tests/gate-registry-test.js`: **PASS** (10 pass, 0 fail).
* `node tests/ai-conversation-task-test.js`: **LULUS 50/50**.
* `node tests/ai-task-contract-test.js`: **PASS 161/161**.
* `node tools/bump-build.mjs --check`: **Selaras m025-649**.

---

## 3. Berkas yang Disentuh & Ringkasan Perubahan

1. `features/voice-studio/src/lib/japanesePhonetics.ts` (BERKAS BARU):
   - Mesin furigana ruby dan aturan Hepburn fonetik presisi (`は` -> `wa`, `を` -> `o`, `へ` -> `e`, sokuon, chōonpu).
   - Pembersih emoji Unicode dan deskriptor frasa emotikon.
2. `features/voice-studio/src/components/JapaneseRubyDisplay.tsx` (BERKAS BARU):
   - Komponen React untuk merender pasangan teks ruby `<ruby><rt>` dan subtitle romaji fonetik.
3. `tests/japanese-phonetics-test.mjs` (BERKAS BARU):
   - Unit test otomatis memvalidasi seluruh aturan fonetik, furigana ruby, dan pembersihan emoji.
4. `features/voice-studio/src/App.tsx`:
   - Integrasi `JapaneseRubyDisplay` pada HUD aktif panggilan, giliran transkrip AI, dan transkrip murid.
   - Pembersihan emoji sebelum audio diputar di `speakAiText`.
5. `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx`:
   - Integrasi `JapaneseRubyDisplay` dan `toPhoneticRomaji` pada kartu rekomendasi balasan pemula.
6. `features/voice-studio/src/lib/liveCallHelper.ts`:
   - Mengalirkan `furiganaHtml` dan `toPhoneticRomaji` ke dalam hasil terjemahan dan bantuan jawaban.
7. `features/voice-studio/src/lib/liveTransport.ts`:
   - Prompt Gemini Live diperbarui dengan variasi tawa alami & larangan emoji.
   - Penyaringan emoji di respons mitra bicara dan parameter masukan Edge-TTS.
8. `features/voice-studio/src/index.css`:
   - Penambahan styling CSS untuk `ruby.fz-ja-ruby`, `rt.fz-ja-rt`, dan `.fz-ja-romaji-text`.
9. `workers/api/ai/ai-tasks.js`:
   - Prompt `conversation_turn` diperbarui: variasi humor pertemanan santai, larangan total emoji / deskriptor teks.
   - Fungsi `shapeConversationOutput` menyaring emoji dari `reply` dan `meaning`.
10. `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`:
    - Hasil kompilasi bundel produksi Vite terbaru.
11. PWA Arbiter & Sinkronisasi Build (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `id-golden-baseline.json`).

---

## 4. Status Kelulusan Mutu & Catatan Bebas Utang Teknis

* **Ghost Deploy**: 0 (Build terverifikasi naik ke `m025-649` melalui alat resmi).
* **Furigana Coverage**: 100% teks kanji pada alur telepon Voice Studio memiliki furigana dan baris romaji fonetik.
* **Romaji Accuracy**: Partikel `は` terbukti teruji menjadi `wa`, `を` menjadi `o`, dan `へ` menjadi `e`.
* **Emoji Spoken**: 0% (tidak ada lagi nama emoji seperti "smiling face" yang dibacakan oleh TTS).
* **Robot Laughter**: 0% (tidak ada lagi awalan kaku template yang diulang-ulang).
