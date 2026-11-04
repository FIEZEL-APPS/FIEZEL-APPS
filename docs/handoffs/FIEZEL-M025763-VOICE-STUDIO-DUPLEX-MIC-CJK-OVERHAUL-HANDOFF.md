# FIEZEL M025-763 Handoff Dossier — Perombakan Total Kawan Bicara (Gemini Live Duplex, Mikrofon 16kHz, Fonetik CJK & Copilot)

- **Versi Build**: `m025-763`
- **Otoritas Rilis**: `OWNER / MASTER`
- **Cakupan**: `features/voice-studio/**`, `workers/api/voice/route-voice-live.js`, `workers/api/schema.js`, `backend/tts.py`, `tests/voice-copilot-relevance-gate-test.js`
- **Permukaan Terproteksi (Auth, Onboarding, Manifest, Website, CI Workflows)**: **0 berkas disentuh** (100% patuh Aturan #0 & A10 Guardian).

---

## 1. Ringkasan Temuan Audit Empiris & Akar Masalah

Melalui audit empiris peramban Chromium Playwright pada sesi nyata Kawan Bicara (`call.html` untuk Bahasa Jepang, Mandarin, dan Inggris), ditemukan 8 akar masalah sistemik yang menyebabkan fitur Kawan Bicara gagal bekerja secara utuh pada `m025-760..762`:

1. **Kematian Sesi WebSocket Gemini Live (`code=1007 Invalid JSON payload`) & Kebocoran *Internal Thought***:
   - Protokol Gemini Live (`BidiGenerateContentRealtimeInput`) memberlakukan aturan ketat `oneof`: setiap bingkai hanya boleh memuat `{ realtimeInput: { audio: ... } }` ATAU `{ realtimeInput: { audioStreamEnd: true } }`, serta tidak boleh digabung dengan `clientContent`. Pelanggaran skema ini memutus WebSocket (`code=1007`) tepat saat murid mulai berbicara.
   - `modelTurn.parts[].text` ikut digabungkan ke transkrip layar, sehingga teks penalaran bahasa Inggris internal Gemini (`{ thought: true }`) bocor menimpa kalimat percakapan asli (`outputTranscription.text`).
   - Penutupan sisi klien (`1000`/`1005`/`1007`) ikut dilaporkan ke `/api/voice/report-drop`, memicu *cooldown* palsu pada kolam kunci API yang sehat.

2. **Mikrofon Murid Terkunci & VAD Gagal Membuka Gerbang Suara**:
   - `startLiveCall()` belum membuka status pendengaran (`interruptAiAndStartListening()`) secara deterministik setelah sapaan pembuka selesai, dan belum memasang *safety timer* berbasis jam dinding bila `AudioBufferSourceNode.onended` tertahan.
   - Pada `handyVad.ts`, perhitungan `rumbleEnergy` sebelumnya menjumlahkan bin frekuensi fundamental suara manusia (`93–156 Hz`), sehingga ucapan murid diklasifikasikan sebagai derau mikrofon. Diperbaiki menjadi bin sub-vokal `1..2` (`31–62.5 Hz`) serta ditambahkan pengiriman kontinu PCM 16kHz (`resampleFloat32To16kPcmBase64`) ke VAD otomatis Gemini Live saat AI selesai berbicara dan *barge-in* akustik saat AI sedang berbicara.
   - `sileroVadGate.ts` dijaga agar tidak memicu galat jaringan apabila runtime `window.ort` tidak dimuat.

3. **Korupsi Pinyin Mandarin (`"zh"` di 222 karakter + 1.481 kata) & Suara TTS Mandarin Salah Bahasa**:
   - `mandarinLexicon.json` sebelumnya memiliki entri korup bernilai `"zh"` pada ratusan karakter dan ribuan kata (termasuk `还是`, `只要`, `耐心`), sehingga tampilan `<rt>` dan baris Pinyin dipenuhi suku kata `"zh"`. Seluruh kamus dibangun ulang menggunakan `pinyin-pro` (1.854 kata + 3.854 karakter HSK 1–6/GB2312) dengan *override* polifon percakapan alami.
   - `tokenizeMandarin` diperluas agar mempertahankan huruf vokal Pinyin bernada (`āáǎà...`) sebagai satu kata utuh tanpa terpecah spasi.
   - `backend/tts.py` dan `liveTransport.ts` diperbaiki agar teks Hanzi Mandarin (`0x4E00..0x9FFF`) selalu diarahkan ke suara Mandarin (`zh-CN-XiaoxiaoNeural` / Gemini Live `Aoede` Mandarin), tidak pernah bocor ke suara Jepang (`ja-JP-NanamiNeural`).

4. **Kesalahan Bacaan Kanji Jepang (`来た` -> `kuta`, `助詞` -> `tasukekotoba`, `出来事` -> `dekikoto`)**:
   - Ditambahkan kosakata pedagogis prioritas (`助詞`, `活用`, `把握`, `覚悟`, `変な`, `直訳`, `出来事`, `後輩`) dan aturan konjugasi verba tidak beraturan Ka-hen `来る` (`来た -> き`, `来て -> き`, `来ます -> き`, `来ない -> こ`, `来る -> く`) di `japanesePhonetics.js`.

5. **Endpoint Terjemahan `translate.googleapis.com` Mati (`HTTP 500`) & Tumpukan Baris Terjemahan**:
   - Endpoint tidak resmi `translate.googleapis.com` yang mengembalikan `HTTP 500` diganti sepenuhnya dengan rute resmi `POST /api/voice/translate` pada Cloudflare Worker (`workers/api/voice/route-voice-live.js` & `workers/api/schema.js`) menggunakan kolam multi-key Gemini bebas kebocoran Kanji/Hanzi.
   - Detektor `isGenericPlaceholderTranslation` di `App.tsx` dilengkapi untuk mengenali seluruh kalimat penyangga sementara (ID & TH) agar tidak pernah menumpuk atau menghalangi pembaruan terjemahan asli.
   - Perbaikan 5 titik salah ketik properti `openingGreetingTransId` -> `openingGreetingTranslationId` di `App.tsx` sehingga sapaan awal setiap persona langsung menampilkan terjemahan yang 100% sesuai.

6. **Tumpang Tindih Visual `<ruby>/<rt>` & Relevansi Opsi Bantuan Jawaban (Copilot)**:
   - CSS `.ja-ruby`, `.zh-ruby`, dan `rt` di `features/voice-studio/src/index.css` diatur ke `line-height: 2.6` dengan ruang horizontal antarkata agar Furigana/Pinyin di atas aksara tidak pernah bertabrakan antarbaris.
   - `liveTransport.ts` dan `route-voice-live.js` ditingkatkan (`maxOutputTokens` hingga `850–950`, `budgetMs` `7500ms`, serta *intent* `wh_what_talk` untuk pertanyaan pembuka topik bebas seperti `今日は何から話す？` dan `今天你想聊点儿什么？`), memastikan ketiga kartu bantuan jawaban selalu relevan, alami, dan bebas kebocoran Kanji/Hanzi di cara baca maupun arti.

---

## 2. Bukti Pengujian Empiris (Playwright Headless & Unit Gate)

Pengujian empiris dijalankan melalui peramban Chromium Playwright dengan aliran mikrofon WAV suara manusia (`--use-file-for-fake-audio-capture`) pada skrip probe penuh:
- **Japanese (`call.html?lang=ja&locale=id`)**:
  - Romaji: `"Ara, kitawane. Anata no tokui na to koro mo, joshi ya katsuyou de tsumazukiyasui kuse mo chan to haaku shiteruwa yo..."` (0 Kanji/Kana bocor, `来た -> kita`, `助詞 -> joshi`).
  - Panggilan *Live Duplex*: WebSocket `BidiGenerateContentConstrained` tersambung mulus, menerima `37` chunk audio suara AI pembuka, mengalirkan `177` frame audio PCM 16kHz dari mikrofon murid secara kontinu, `closes: []` (**0 error `1007`**), **0 kebocoran thought Inggris**, dan **0 terjemahan generik menumpuk**.
  - Copilot `1 · Singkat`: `最近の出来事について話したいです。` (`saikin no dekigoto ni tsuite hanashitai desu.` — *"Aku ingin cerita tentang kejadian belakangan ini."*).
- **Mandarin (`call.html?lang=zh&locale=id`)**:
  - Pinyin: `"Nǐhǎo! Wǒ shì Xiǎo Nuòmǐ (Xiao Mochi)... Bùguǎn shì shēngdiào háishì shēngcí, zhǐyào yǒu bù quèdìng de dìfang, wǒ dōu huì nàixīn de bāng nǐ jiūzhèng..."` (**0 korupsi `"zh"`**, **0 kebocoran Hanzi** di Pinyin & terjemahan).
  - Copilot `1 · Singkat`: `我想聊聊我最近的日常生活。` (`Wǒ xiǎng liáoliao wǒ zuìjìn de rìcháng shēnghuó.` — *"Aku ingin ngobrol soal keseharianku belakangan ini."*).
- **English (`call.html?lang=en&locale=id`) & Embedded `index.html` (`#fzMitraKaiwaStudioFrame`)**:
  - Sapaan Coach Alex, terjemahan Indonesia, kartu Copilot AI Realtime, dan pemasangan iframe studio dari `index.html` terverifikasi `0 pageerror` dan `0 HTTP 500`.

---

## 3. Daftar Berkas yang Disentuh

1. `features/voice-studio/src/App.tsx` — Perbaikan protokol WebSocket Gemini Live (`oneof`), aliran kontinu mikrofon PCM 16kHz + *barge-in*, pembukaan kunci mikrofon pasca-sapaan, deduplikasi Copilot, perbaikan `openingGreetingTranslationId`, dan filter anti-tumpuk terjemahan.
2. `features/voice-studio/src/lib/liveTransport.ts` — Dukungan penuh Mandarin (`zh`) di seluruh evaluasi/TTS/partner-turn, *intent* `wh_what_talk`, pembersihan topik & petunjuk bebas CJK, serta anggaran waktu Copilot CJK.
3. `features/voice-studio/src/lib/liveCallHelper.ts` — Migrasi `fetchLiveTranslation` ke `POST /api/voice/translate` dan kamus sapaan pembuka persona instan.
4. `features/voice-studio/src/lib/mandarinLexicon.json` — Pembangunan ulang penuh 1.854 kata + 3.854 karakter Pinyin bernada akurat bebas korupsi `"zh"`.
5. `features/voice-studio/src/lib/mandarinPhonetics.ts` — Perbaikan tokenisasi kata Latin/Pinyin bernada, kapitalisasi kalimat, dan erhua.
6. `features/voice-studio/src/lib/japanesePhonetics.js` — Penambahan kosakata pedagogis Mitra Kaiwa & konjugasi Ka-hen `来る`.
7. `features/voice-studio/src/lib/handyVad.ts` — Perbaikan bin frekuensi sub-vokal `rumbleEnergy` & ekspor `resampleFloat32To16kPcmBase64`.
8. `features/voice-studio/src/lib/sileroVadGate.ts` — Pengaman pemuatan opsional `window.ort`.
9. `features/voice-studio/src/components/JapaneseRubyDisplay.tsx` — Tata letak bersih tiga lapis (`<ruby>` + panduan baca Latin + arti).
10. `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx` — Penjagaan keutuhan panduan pengucapan Pinyin/Romaji & pencegahan duplikasi baris bahasa Inggris.
11. `features/voice-studio/src/index.css` — Jarak vertikal `line-height: 2.6` untuk `<ruby>/<rt>` Jepang & Mandarin agar bebas tumpang tindih.
12. `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css` — Bundel produksi hasil kompilasi Vite terbaru.
13. `workers/api/voice/route-voice-live.js` & `workers/api/schema.js` — Penambahan rute `POST /api/voice/translate`, dukungan penuh Mandarin, perlindungan kolam kunci dari penutupan klien `1000/1005/1007`, dan kenaikan batas token output JSON CJK.
14. `backend/tts.py` — Penambahan pemetaan suara neural Mandarin (`zh-CN-XiaoxiaoNeural`, `zh-CN-YunxiNeural`) dan deteksi skrip Hanzi.
15. `tests/voice-copilot-relevance-gate-test.js` — Pengujian regresi baru untuk sapaan topik terbuka Jepang/Mandarin & kemurnian Pinyin/Romaji.
16. Berkas sinkronisasi versi 6 titik via `tools/bump-build.mjs` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`).

---

## 4. Status Kelulusan Gerbang Mutu Lokal & Catatan Teknis

- `node tests/voice-cjk-phonetics-anti-leak-test.js`: **LULUS 100%**
- `node tests/voice-copilot-relevance-gate-test.js`: **LULUS 100%**
- `node tests/voice-duplex-fullphone-contract-test.js`: **LULUS 100%**
- `node tests/voice-studio-reformulation-translation-test.js`: **LULUS 100%**
- `node tests/voice-studio-ui-architecture-test.js`: **LULUS 100%**
- `node tests/mochi-voice-sos-test.js`: **LULUS 100%**
- `node tests/cf-wiring-test.js`: **117/117 LULUS**
- `node tests/id-golden-snapshot-test.js`, `node tests/th-ui-leak-test.js`, `node tests/curriculum-cache-version-test.js`, `node tests/gate-registry-test.js`, `node tools/fiezel-guardians.mjs a10`: **LULUS 100%**
- **Catatan Deploy Produksi & Langkah Berikutnya (Next Steps)**: Rilis ini menyentuh kode halaman statis (`features/voice-studio/dist/*`) sekaligus Cloudflare API Worker (`workers/api/**`), sehingga workflow `FIEZEL Deploy Site` DAN `FIEZEL API Worker Deploy` (`deploy-api-worker.yml`) keduanya dijalankan hingga hijau di produksi, dilanjutkan dengan verifikasi probe Playwright langsung ke `https://fiezel.my.id/app/`.
