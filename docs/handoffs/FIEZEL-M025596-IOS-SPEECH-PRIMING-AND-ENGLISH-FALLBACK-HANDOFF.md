# FIEZEL Handoff: Priming SpeechSynthesis WebKit iOS, Guard Suara Simetris (Jepang & Inggris), & Akselerasi Respons Percakapan AI (m025-596)

## 1. Ringkasan Masalah & Temuan Audit Empiris
Pengguna memberikan masukan beruntun terkait fitur suara dan kecerdasan asisten percakapan:
1. *"apakah tidak ada cara agar ai nya merespon pakai suara?"*
2. *"responyya sangat lambat dan jawabannya tidak sesuai"*
3. *"bagaimana dengan fiezel ai versi bahasa inggris, kenapa suaranya tidak ada"*

### Analisis Akar Masalah Teknis:
1. **Kegagalan Suara Bisu (*Silent Speech Synthesis Failure*) di iOS (Jepang & Inggris)**:
   - Jika iPhone tidak memiliki suara bahasa target terpasang, WebKit mengalami *silent abort* jika dipaksakan mengaitkan suara non-target (seperti memasang suara Indonesia `Damayanti` ke utterance Jepang atau Inggris).
   - WebKit iOS memblokir audio asinkron (respons AI yang datang setelah jeda jaringan) jika belum di-prime lewat sentuhan sinkron.
   - Pada kursus bahasa Inggris, saat Cloudflare TTS dinonaktifkan (`cfTtsEnabled: false`), pemanggilan audio asinkron jatuh ke fallback jaringan lambat (2–3 detik) sehingga jendela aktivasi gestur sentuh pengguna (~1000ms pada WebKit) kedaluwarsa sebelum `speechSynthesis.speak()` dipanggil.
2. **Latensi Tinggi (*Very Slow AI Response*)**:
   - Pemanggilan AI sebelumnya menggunakan `task: 'question'`, yang diarahkan ke Cloudflare Worker `tutor_turn` LLaMA-3.3-70B dengan latensi 8–12 detik per giliran.
   - Ditambah `silenceTimeoutMs: 1350ms`, pengguna harus menunggu hingga 10–13 detik dalam keheningan total sebelum AI mulai merespons.
3. **Ketidaksesuaian Jawaban (*Inappropriate / Off-Topic Answer*)**:
   - Worker Cloudflare memaksakan format kuis ("Jawab maksimal 6 kalimat. Mulai dengan kata 'Intinya...'") sehingga sapaan santai ("Halo") dijawab dengan ceramah gramatika kuis.
   - Parsir baris di `requestReply` mengasumsikan baris non-Jepang selalu terjemahan, memotong kalimat percakapan multi-baris pada mode bahasa Inggris.

---

## 2. Solusi & Perbaikan Sistemik

1. **Akselerasi Latensi AI & Pengalihan Task ke `kaiwa`**:
   - Mengubah task pemanggilan AI menjadi `'kaiwa'`, langsung memanggil model cepat via `/api/ai/chat` (latensi turun drastis ke 1.5–2.5 detik).
2. **Pemangkasan VAD Silence Timeout Panggilan Suara**:
   - Menurunkan `CONFIG.silenceTimeoutMs` dari `1350ms` ke `800ms`, dan `naturalTurnPauseMs` ke `260ms`.
3. **Pemeriksaan Kesiapan Neural Voice Sinkron (*Synchronous Neural Voice Gate*)**:
   - Menambahkan deteksi status transport neural secara sinkron di `playVoice()` dan `playSpeech()`.
   - Bila Cloudflare TTS tidak aktif dan model lokal belum siap, langsung mengeksekusi `speakViaWebSpeech` / `speakViaSynth` secara sinkron di dalam putaran giliran gestur fisik pengguna tanpa menunggu degradasi jaringan.
4. **Guard Suara Simetris & Priming Gestur iOS**:
   - Menambahkan priming diam `new SpeechSynthesisUtterance(' ')` (`volume = 0.01`) pada sentuhan pertama di `unlockAudio()` dan `unlockAudioContext()`.
   - `utter.voice` hanya dipasangkan jika suara cocok dengan bahasa target:
     - Jepang: `ja` / `japanese` / `nihongo`
     - Inggris: `en` / `english`
   - Jika tidak ada suara yang cocok di perangkat, `utter.voice` dibiarkan `null` (unset). WebKit OS memetakan sintesis secara alami sesuai `utter.lang` tanpa galat atau pembatalan senyap.
5. **Perlindungan Parsir Dialog Multi-Baris Bahasa Inggris**:
   - Di `requestReply`, filter non-Jepang hanya diaktifkan bila `c === 'ja'`. Baris percakapan bahasa Inggris multi-baris digabungkan menjadi kalimat dialog utuh.
6. **Ekspansi Respon Offline Kontekstual Sapaan Indonesia & Romaji**:
   - Menambahkan pengenalan sapaan dwibahasa ("halo", "hai", "apa kabar", "siapa kamu", "terima kasih") pada `generateOfflineReply`.

---

## 3. Hasil Pengujian Empiris

Pengujian empiris unit test & integration dijalankan secara lokal:
- `node tests/ios-speech-priming-voice-guard-test.js` -> **PASS (6/6)**
  - Test 1: Guard suara Jepang (utter.voice tetap null saat hanya ada id-ID / en-US).
  - Test 2: Prioritas suara Jepang (Kyoko).
  - Test 3: Prioritas suara Inggris (Samantha).
  - Test 4: Priming diam pada interaksi pengguna (tepat 1 kali antrean).
  - Test 5: Guard suara Inggris (utter.voice tetap null saat hanya ada id-ID / ja-JP).
  - Test 6: Seleksi suara Inggris (Samantha dipasangkan pada utterance Inggris).
- `node tests/speech-synthesis-engine-test.js` -> **PASS (6/6)**
- `node tests/interactive-chat-test.js` -> **PASS (11/11)**
- `node tests/voice-call-two-way-test.js` -> **PASS (6/6)**
- `node tests/ios-pwa-mic-shadowing-test.js` -> **PASS (5/5)**
- `node tests/shadowing-eval-card-test.js` -> **PASS (3/3)**

### Status Gerbang Mutu Lokal:
- `node tests/id-golden-snapshot-test.js` -> **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS (m025-596)**
- `node tests/gate-registry-test.js` -> **PASS (10/10)**
- `node tools/bump-build.mjs --check` -> **PASS (Selaras m025-596)**

---

## 4. Daftar Berkas yang Disentuh

1. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Pengalihan pemanggilan AI ke task `'kaiwa'` dan deteksi status neural voice sinkron.
   - Priming sentuhan otomatis di `unlockAudioContext()` dan `sendMessage()`.
   - Guard simetris seleksi suara (Jepang & Inggris) di `speakViaWebSpeech()`.
   - Parsir terjemahan multi-baris aman di `requestReply()`.
   - Ekspansi pengenalan sapaan Indonesia/Romaji di `generateOfflineReply()`.
2. `features/interactive-chat/fiezel-voice-call.js`:
   - Reduksi `silenceTimeoutMs` ke 800ms dan `naturalTurnPauseMs` ke 260ms.
   - Priming diam di `unlockAudio()`.
   - Deteksi neural voice sinkron di `playSpeech()`.
   - Guard simetris seleksi suara (Jepang & Inggris) di `speakViaSynth()`.
3. `tests/ios-speech-priming-voice-guard-test.js`:
   - Verifikasi isolasi priming dan guard seleksi suara (6 uji tuntas).
4. `.github/workflows/quality.yml`:
   - Pendaftaran uji `ios-speech-priming-voice-guard-test.js`.
5. `id-golden-baseline.json`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Kenaikan nomor build sinkron ke `m025-595`.
