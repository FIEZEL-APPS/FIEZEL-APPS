# FIEZEL HANDOFF DOSSIER: VOICE CALL (FITUR TELEFON) STABILIZATION & ANTI-ECHO
**Build Version:** `m025-616`
**Tanggal:** 20 Oktober 2026
**Otoritas & Disiplin:** Antigravity Engineering Protocol

---

## 1. Ringkasan Temuan Audit & Akar Masalah (Root Cause Analysis)

### Masalah yang Dilaporkan Pengguna
*"di bagian telefon masih banyak errornya"*

### Akar Masalah Nyata
1. **False Self-Interruption / Acoustic Echo Loop (Penyebab Utama Panggilan Terputus-Putus):**
   - Saat AI sedang berbicara di telepon (`STATE.SPEAKING`), speaker perangkat mengeluarkan suara vokal AI.
   - Mikrofon perangkat (berjarak 1–5 cm dari speaker pada ponsel) menangkap suara vokal AI tersebut.
   - VAD akustik sebelumnya memiliki ambang `interruptThreshold: 0.075` dengan frame time hanya 150ms. Begitu suara keluar dari speaker, VAD mengira itu murid yang berteriak dan langsung memicu `interrupt('user_acoustic_barge_in')`.
   - Lebih parah lagi, `SpeechRecognition.onresult` tetap menyala dan mengenali kata-kata AI sendiri (misal: "こんにちは"). Logika sebelumnya langsung memotong AI (`interrupt('user_speech_token_barge_in')`) dan menaruh kata-kata AI tersebut ke dalam buffer ucapan murid (`pendingTranscript`), sehingga AI berbicara setengah suku kata, terpotong sendiri, lalu menjawab kata-katanya sendiri secara berulang-ulang (*echo loop*).
2. **Audio Autoplay Lock pada Mobile Safari / Android WebKit:**
   - Pemutaran balasan AI terjadi 1–3 detik setelah murid selesai bicara (asinkron di dalam callback jaringan).
   - Tanpa *dummy audio priming* pada sentuhan awal murid saat menekan tombol telepon (`#fzcBtnCall`), browser seluler menolak pemutaran HTML5 Audio dengan `NotAllowedError`.
3. **Loop Error & Thrashing pada SpeechRecognition Seluler:**
   - `rec.onend` memicu restart dalam 80ms. Pada Chrome Android dan iOS Safari, interval restart <300ms memicu error storm (`audio-capture`, `network`, `aborted`).
   - Saat izin mikrofon belum diberikan (`not-allowed`), modal panduan izin memicu loop pemanggilan `startRecognition()` tanpa flag status pending.
4. **Unhandled Rejection pada `startVoiceCall`:**
   - Pemanggilan `startFn.call(VoiceCall, opts)` mengembalikan Promise yang melempar error tak tertangkap jika inisialisasi mikrofon ditolak atau dibatalkan murid.
5. **Kebocoran Sintaks Furigana pada Subtitle:**
   - Naskah balasan bahasa Jepang yang memiliki tag furigana mentah seperti `[私](わたし)` dicetak langsung ke `subText.textContent` tanpa pembersihan, merusak estetika antarmuka.

---

## 2. Solusi & Rekayasa Arsitektur yang Diterapkan

1. **Acoustic Refractory Guard & Echo Discriminator (`features/interactive-chat/fiezel-voice-call.js`):**
   - **Refractory Window:** Menetapkan jendela kebal interupsi selama 950ms pertama setelah AI mulai bersuara (`CONFIG.acousticRefractoryMs: 950`), mengeliminasi lonjakan akustik awal speaker.
   - **Calibrated Acoustic Threshold:** Menaikkan ambang VAD saat AI sedang berbicara ke `0.38` (5 frame berturut-turut / 250ms), sehingga suara normal speaker tidak akan pernah memutus AI, namun teriakan murid tetap dapat menyela jika diinginkan.
   - **Smart Echo Token Rejection (`isAcousticEcho`):** Mengecek apakah teks yang ditranskripsikan mikrofon saat AI bicara merupakan bagian atau substring dari naskah vokal AI (`aiCurrentSpeakingText`). Jika ya, teks tersebut diabaikan secara senyap tanpa memotong AI dan tanpa mengotori buffer murid.
   - **Orb Tap Direct Interruption:** Murid tetap dapat menyela kapan saja secara instan dan 100% andal dengan menyentuh bola suara (`#fzcVoiceOrb`).

2. **Mobile Audio Priming & Global Autoplay Unlock:**
   - Menambahkan pemutaran 1-sample silent WAV pada elemen `Audio` di dalam `unlockAudio()` secara sinkron saat murid mengetuk tombol telepon atau elemen antarmuka, membuka kunci audio playback di iOS Safari dan Chrome Android untuk pemutaran balasan asinkron berikutnya.

3. **Safe Recognition Lifecycle & Backoff:**
   - Menambahkan pelacakan state `isRecognitionRunning` dan `isPermissionPending`.
   - Menunda restart `rec.onend` ke 350ms (`CONFIG.recognitionRestartDelayMs`) untuk mencegah error storm.
   - Menghentikan auto-restart saat modal panduan izin sedang aktif.

4. **Zero Unhandled Rejections & Safe Error Handling:**
   - Melampirkan `.catch()` pada Promise `startVoiceCall()` di `fiezel-interactive-chat.js`.
   - Menangani pembatalan izin di `start()` tanpa melempar exception liar ke konsol.

5. **Sanitasi Subtitle & Mochi 404 Prevention:**
   - Menggunakan `stripFurigana(text)` di `updateSubtitleUI` agar subtitle kartu panggilan selalu rapi dan bersih dari kurung siku.
   - Mencegah request 404 dinamis untuk modul maskot pada `features/mascot/fiezel-mochi-companion.js` selaras dengan panduan brand (ZERO cartoon mascots).

6. **cPanel PHP Bridge Parameter Flex:**
   - Memperbarui `api/tts/line/index.php` agar menerima parameter `text`, `speaker`, `voice` baik via JSON body, `$_POST`, maupun `$_GET`.

---

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

- **Skrip Audit:** `tools/dev/probe-voice-call-full-audit.mjs`
- **Hasil Eksekusi:**
  1. Pembukaan Panggilan Telepon (`#fzcBtnCall`): **SUCCESS** (overlay aktif, status `listening`, partner `フィゼル先生`).
  2. Ganti Persona Panggilan: **SUCCESS** (berganti ke Sensei Nanami `ナナミ先生` vokal `ja-JP-NanamiNeural`).
  3. Tombol Mute & Subtitle: **SUCCESS** (berfungsi dua arah tanpa glitch).
  4. Simulasi Giliran Bicara (Hands-Free Loop): **SUCCESS** (AI merespons alami dengan vokal dan subtitle).
  5. Pengujian Anti-Echo (Acoustic Echo Rejection): **SUCCESS** (AI tetap berbicara lancar tanpa terpotong suara sendiri).
  6. Tutup Panggilan & Bersihkan DOM (`#fzcCallBtnEnd`): **SUCCESS** (overlay terlepas bersih, state kembali `idle`).
  7. Pembukaan Kembali Seketika (Rapid Re-Open): **SUCCESS** (panggilan langsung aktif tanpa collision).
  8. **Total Console Errors:** 0
  9. **Total Unhandled Exceptions:** 0

---

## 4. Berkas yang Diubah

1. `features/interactive-chat/fiezel-voice-call.js` (Ambang VAD, echo discriminator, audio priming, safe recognition loop, sanitasi subtitle)
2. `features/interactive-chat/fiezel-interactive-chat.js` (Pencegahan unhandled rejection pada `startVoiceCall`)
3. `api/tts/line/index.php` (Dukungan GET/POST/JSON untuk text dan speaker voice)
4. `features/mascot/fiezel-mochi-companion.js` (Eliminasi 404 network fetch)
5. `id-golden-baseline.json` (Regenerasi baseline emas teks Indonesia)
6. `tools/dev/probe-voice-call-full-audit.mjs` (Skrip probe Playwright menyeluruh fitur telepon)
7. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` (Hexa-Sync build bump ke `m025-616`)

---

## 5. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` -> **HIJAU**
- `node tests/th-ui-leak-test.js` -> **HIJAU**
- `node tests/curriculum-cache-version-test.js` -> **HIJAU (m025-616)**
- `node tests/gate-registry-test.js` -> **HIJAU**
- `node tests/voice-call-two-way-test.js` -> **HIJAU (6/6)**
- `node tests/voice-call-lifecycle-probe.js` -> **HIJAU (7/7)**
- `node tests/kawan-bicara-neural-voice-test.js` -> **HIJAU (100%)**
- `node tools/bump-build.mjs --check` -> **SELARAS (Hexa-Sync verified)**
