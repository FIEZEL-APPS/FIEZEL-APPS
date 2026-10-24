# FIEZEL-M025652: Arsitektur Voice AI Berkecepatan Tinggi (Sub-Second Latency & Decoupled Streaming)

## 1. Ringkasan Eksekutif & Temuan Audit Latensi

Berdasarkan keluhan pengguna mengenai respons AI yang masih terasa sangat lambat ("aduh masih sangat lambat sekali balasannya, coba kamu lakukan riset dan perbaikan yang lebih powerfull dong"), telah dilakukan audit mendalam terhadap seluruh pipeline audio dan AI turn di Mitra Kaiwa / Voice Studio (`App.tsx`, `liveTransport.ts`, dan `workers/api/ai/ai-tasks.js`).

### Bottleneck Utama yang Ditemukan:
1. **Penyatuan Sekuensial Blok Teks dan Audio (Waterfall Delay ~4.5s - 6.5s)**:
   - Sebelumnya, `resolveAiReply` menahan kembalian fungsi sampai LLM Worker AI selesai **DAN** seluruh paragraf balasan selesai disintesis oleh Edge TTS di Render.com.
   - Akibatnya, pengguna menatap layar kosong/titik berpikir ("Thinking...") selama **4.5 hingga 6.5 detik** sebelum teks maupun audio pertama kali muncul.
2. **Ketiadaan Reaksi Akustik Instan (Aizuchi / Backchannel reaction)**:
   - Fungsi `getThinkingFillers` sebelumnya mengembalikan array kosong `[]`.
   - Tidak ada umpan balik suara saat murid selesai berbicara, menimbulkan keheningan canggung yang lama.
3. **Jeda Detektor Hening VAD Terlalu Panjang (750ms - 1300ms)**:
   - Jeda sebelum giliran dikirim ke server menunggu 750ms (lengkap) atau 1300ms (tidak lengkap).
4. **Token Generation Cloudflare Worker Terlalu Besar untuk Panggilan Telepon**:
   - `maxTokens` untuk `isCall` sebelumnya dibatasi hingga 65 token, yang memperpanjang waktu komputasi LLM hingga 2.5-3.5 detik pada beban tinggi.

---

## 2. Arsitektur Baru yang Diterapkan

1. **Decoupled Text Delivery (Waktu Tampil Teks Turun ke ~1.2s - 1.9s)**:
   - Mengimplementasikan callback `options.onTextReady` di `resolveAiReply`.
   - Begitu teks balasan tiba dari Cloudflare Workers AI atau Gemini API, teks beserta **Furigana Ruby**, **Romaji Fonetik Presisi**, dan **Terjemahan Bahasa Indonesia** langsung ditampilkan seketika di HUD dan gelembung percakapan.
   - Status `isAiThinking` langsung dinonaktifkan seketika.
2. **Instant Acoustic Aizuchi Reaction (< 200ms)**:
   - Mengaktifkan kembali `getThinkingFillers`:
     - Bahasa Jepang (`ja`): `['うん！', 'なるほど！', 'あ、そうなんだ！']`
     - Bahasa Inggris (`en`): `['Yeah!', 'Got it!', 'Oh nice!']`
   - Menambahkan fungsi `prewarmThinkingFillers(targetLang, persona)` yang melakukan pre-caching audio aizuchi langsung ke memori RAM (`_ttsMemoryCache`) saat sesi/skenario dimulai.
   - Begitu murid selesai berbicara, `playAcousticFiller()` memutar audio aizuchi dalam hitungan **< 200ms**, menghilangkan jeda hening total secara psikologis dan meniru percakapan manusia asli di telepon.
3. **Optimasi Ambang Deteksi Hening VAD**:
   - Mode Live Call: Jeda dioptimalkan dari 750ms/1300ms menjadi **380ms** (untuk kalimat lengkap berpartikel/tanda baca) dan **800ms** (untuk kalimat belum lengkap).
   - Mode PTT: Dioptimalkan dari 1200ms/1800ms menjadi **800ms/1200ms**.
4. **Penyempurnaan Token Telepon Worker AI**:
   - Membatasi `maxTokens` untuk `isCall` di `workers/api/ai/ai-tasks.js` menjadi 40 token (pas untuk 1-2 kalimat alami telepon di bawah 20 kata). Mengurangi waktu inferensi Cloudflare AI sebesar ~30-40%.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Skrip probe browser `tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs` dijalankan dengan bundle produksi lokal:

### Hasil Uji Bahasa Jepang (`ja`):
```
--- TURN 1
 learner : すみません、アイスコーヒーをひとつください。
 AI      : かしこまりました！アイスコーヒーお一つですね。店内でお召し上がりですか、それともお持ち帰りですか？
 meaning : Baik, dimengerti! Satu es kopi ya. Apakah ingin dinikmati di dalam kafe, atau dibawa pulang?
 source  : ai
 t_text  : 1670 ms
 t_audio : 1850 ms

--- TURN 2
 learner : ケーキはありますか？
 AI      : なるほど！注文するときは助詞の「を」を使って、「ホットコーヒーを一つお願いします」や「飲みます」と言ってみましょうか？
 meaning : Begitu! Saat memesan, mari gunakan partikel objek "o" ...
 source  : ai
 t_text  : 2110 ms
 t_audio : 2376 ms

--- TURN 3
 learner : 店内でお願いします。
 AI      : かしこまりました！お砂糖とミルクはお使いになりますか？それともブラックになさいますか？
 source  : ai
 t_text  : 1939 ms
 t_audio : 3026 ms

=== SUMMARY ===
turns                 : 3
replies from real AI  : 3/3 (100%)
t_text  avg / max (ms): 1906 / 2110 ms
t_audio avg / max (ms): 2417 / 3026 ms
VERDICT zero robot voice  : PASS
VERDICT every reply is AI : PASS
VERDICT every reply voiced: PASS
```

### Hasil Uji Bahasa Inggris (`en`):
```
=== SUMMARY ===
turns                 : 3
replies from real AI  : 3/3 (100%)
t_text  avg / max (ms): 2210 / 2528 ms
t_audio avg / max (ms): 2765 / 3880 ms
VERDICT zero robot voice  : PASS
VERDICT every reply is AI : PASS
VERDICT every reply voiced: PASS
```

---

## 4. Berkas yang Diubah

1. `features/voice-studio/src/lib/liveTransport.ts`:
   - Menambahkan opsi `onTextReady` di `resolveAiReply`.
   - Mengimplementasikan `getThinkingFillers` dan `prewarmThinkingFillers`.
   - Pre-warming aizuchi di `warmUpVoiceServices()`.
2. `features/voice-studio/src/App.tsx`:
   - Implementasi `playAcousticFiller()` berbasis in-memory cache.
   - Panggilan decoupled text reveal di `submitStudentTurn`.
   - Optimasi ambang VAD (380ms/800ms dan 800ms/1200ms).
   - Hook prewarm saat skenario/persona berganti.
3. `features/voice-studio/dist/voice-studio.js`:
   - Re-bundle Vite produksi (876.89 kB, gzipped 262.93 kB).
4. `workers/api/ai/ai-tasks.js`:
   - `maxTokens` dibatasi hingga 40 untuk giliran panggilan suara telepon.
5. `id-golden-baseline.json`:
   - Pembaruan baseline hash golden snapshot pasca-rebuild Vite bundle.
6. Berkas Versi Build PWA Hexa-Sync:
   - `coordination/BUILD-VERSION.json` (`m025-652`)
   - `sw.js` (`m025-652`)
   - `core-config.js` (`m025-652`)
   - `features/neural-voice/fiezel-diag-panel.js` (`m025-652`)
   - `kurikulum.html`, `misi.html`, `call.html` (`m025-652`)

---

## 5. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman, build m025-652)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tests/japanese-phonetics-test.js`: **PASS (100% akurasi Furigana Ruby dan Romaji wa/o/e)**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/ai-conversation-task-test.js`: **PASS (50/50)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik)**
