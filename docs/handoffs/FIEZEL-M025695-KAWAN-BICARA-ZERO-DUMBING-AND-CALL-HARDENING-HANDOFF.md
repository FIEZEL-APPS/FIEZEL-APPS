# FIEZEL-M025695 — Kawan Bicara (Mitra Kaiwa) Zero-Dumbing Invariant, Secure Nonce Protocol Bridge, and Audio Pipeline Hardening (`m025-695`)

**Status:** Siap review OWNER & Merge via Pull Request.
**Build:** `m025-695` (Hexa-Sync Selaras di 6 titik rilis resmi).
**Branch:** `feat/kawan-bicara-zero-dumbing-and-audio-hardening-m025-694`
**Pull Request:** [PR #756](https://github.com/FIEZEL-APPS/FIEZEL-APPS/pull/756)

---

## 1. Ringkasan Eksekutif & Temuan Audit

Berdasarkan audit komprehensif terhadap fitur **Kawan Bicara (Mitra Kaiwa)** di FIEZEL yang mencakup 36 temuan bug dan 6 deliverable perbaikan arsitektural, ditemukan sejumlah titik kelemahan sistemik yang mempengaruhi integritas pedagogis, konsistensi data Braincore, serta stabilitas audio real-time:

1. **Zero-Dumbing Invariant & Linguistic Analyzer Palsu (Bug #1, #2, #15)**:
   - Analyzer deterministik sebelumnya memvonis salah secara sewenang-wenang berdasarkan panjang kalimat semata (Inggris < 5 kata, Jepang < 10 karakter tanpa partikel). Akibatnya ungkapan percakapan wajar seperti *"Hi there!"*, *"Yes, please"*, *"こんにちは"*, dan pesanan sah *"ホットコーヒーにします"* divonis salah dengan miskonsepsi palsu.
   - Sebaliknya, kalimat lain apa pun yang tidak cocok dengan regex diberi pujian kalengan 94–95% tanpa verifikasi bukti (canned praise).
   - Analyzer menulis langsung ke BKT secara sepihak dengan skema lokal tanpa melalui Braincore gateway host.
2. **Mastery Palsu Sekali Klik (Bug #4)**:
   - Tombol *"Saya Siap, Mulai Percakapan!"* pada prerequisite drawer menyuntikkan `{ p: 0.75, attempts: 2, correct: 2 }` langsung ke `localStorage.getItem('fiezel-mastery-bkt-v1')`, memalsukan data mastery murid tanpa ada latihan nyata.
3. **Kerentanan Komunikasi Iframe Voice Studio & Signature Mismatch (Bug #3)**:
   - `interactiveChatView` meng-embed `call.html` (bundle React Voice Studio) dalam `<iframe>`.
   - Voice Studio memanggil `window.parent.updateMastery(compId, ok, { source })`, yang tidak sesuai dengan signature 6-argumen host FIEZEL `(bucket, key, ok, ms, confidence, attemptAt)`, sehingga telemetri gagal tanpa jejak.
   - Tidak ada pemeriksaan origin dan token keamanan (nonce) pada pendengar `window.addEventListener('message')`.
4. **Kegagalan Acoustic Barge-In & Isolasi Audio (Bug #5, #7, #24)**:
   - Variabel `CONFIG.interruptConsecutiveFrames` tidak pernah terdefinisi di `fiezel-voice-call.js`, menyebabkan perbandingan `loudFramesCount >= undefined` selalu bernilai `false`, melumpuhkan fitur interupsi suara (barge-in) akustik.
   - Panggilan `chatVoice.stop()` menggunakan selektor blanket `document.querySelectorAll('audio')`, mematikan dan me-reset seluruh audio di luar sesi percakapan.
5. **Watchdog Gantung & Phrase Hallucination (Bug #6, #13, #22, #34)**:
   - Tidak adanya timeout watchdog saat audio AI berbicara menyebabkan status tersangkut permanen jika pemutaran audio gagal memicu event `ended`.
   - Fungsi `commitUserTurn` mengarang kalimat fiktif *"Hello, can you hear me?"* jika transkrip kosong.
   - Pemotongan kalimat memecah tanda intonasi bahasa Jepang `〜~`.

---

## 2. Tindakan Perbaikan Arsitektur & Rekayasa Kode

### A. Penegakan Zero-Dumbing Invariant & Tri-State Verdict (`fiezel-voice-pedagogy.js`)
- Mengganti vonis biner paksa dengan **Tri-State Verdict** (`ok: true | false | null`):
  - `ok: false`: Hanya diberikan untuk pola miskonsepsi morfologi/sintaksis nyata yang teridentifikasi secara presisi (misal overregularization *goed*, stative *I am agree*, double predicate *飲むです*).
  - `ok: true`: Hanya diberikan bila murid **terbukti** memenuhi target pola pembelajaran skenario (misal permintaan sopan *would like* + *am meeting* di kafe, partikel *を* + *ください* di kissaten).
  - `ok: null` (`undecided(text)`): Kalimat umum, sapaan pendek, atau kalimat bebas diserahkan seutuhnya ke LLM/AI Partner tanpa vonis atau pujian fiktif.
- Menghapus batasan panjang kata artifisial (`words.length < 5` dan `length < 10`).
- Memperbaiki regex pencegah salah kaprah `/コーヒーに/` $\rightarrow$ `/コーヒーにください/` agar pesanan wajar seperti *"ホットコーヒーにします"* tidak divonis salah.
- `recordPedagogicalAttempt` secara tegas menolak verdict non-boolean (`ok: null`), serta menyalurkan telemetri resmi ke `root.updateMastery` dan `root.bktRecord`.

### B. Smart Prerequisite Bypass & Anti-Fake Mastery (`fiezel-voice-scenarios.js`)
- Menghapus injeksi fiktif `{ p: 0.75, attempts: 2, correct: 2 }` dari BKT.
- Memisahkan rekaman pengakuan murid ke dalam kunci tersendiri `fiezel-kaiwa-prereq-ack-v1` via fungsi `acknowledgeVocabPrereq`.
- Konsultasi prasyarat tetap membaca mastery nyata dari Braincore/OLM atau prior baseline ($P(L_0)$), dan membuka akses percakapan saat murid menyatakan siap tanpa merusak riwayat BKT.

### C. Protokol postMessage Ber-Nonce & Gateway Host (`features/voice-studio/` & `fiezel-interactive-chat.js`)
- Mengimplementasikan spesifikasi **Bagian 3A (Secure Nonce Protocol Bridge)**:
  - Nonce acak 16-byte base64url dihasilkan oleh shell via `crypto.getRandomValues` dan disimpan di `sessionStorage['fz.studio.nonce']`.
  - Disuntikkan ke URL iframe: `<iframe src="call.html?embed=1&nonce=<nonce>">`.
  - Handshake 2 arah (`fz.studio.hello` $\rightarrow$ `fz.shell.ready`).
  - Verifikasi ketat: `event.origin === location.origin`, window source cocok, dan nonce tervalidasi.
  - Perlindungan Replay: Pemeriksaan `turnId` unik dan nomor urut monoton `seq`.
  - Rate-limit perolehan XP: cooldown 20 detik, batas 10 XP/turn, maksimum 100 XP/sesi.
  - Penyelarasan signature host: disalurkan ke `updateMastery('speaking', cid, ok, latency, confidence, timestamp)`.
  - Multi-tab storage sync listener untuk memastikan keselarasan kursus dan status antar tab peramban.
  - Kompilasi ulang bundel React Voice Studio via `npm --prefix features/voice-studio run build` $\rightarrow$ `features/voice-studio/dist/voice-studio.js`.

### D. Audio Pipeline Hardening & Acoustic Barge-In (`fiezel-voice-call.js` & `fiezel-chat-voice.js`)
- **Acoustic Barge-In Berbasis Waktu**: Menggantikan frame counter yang hilang dengan akumulasi waktu RMS (`loudSince >= 120ms`), dynamic pre-ducking ke volume 0.25 (`chatVoice().duck(0.25)`), dan timer konfirmasi interupsi (650ms).
- **Dual-Layer Barge-In Audio Protection**: `chatVoice.stop()` membungkam `ownedAudios` dan elemen audio dokumen HTML5 (`document.querySelectorAll('audio')`), mereset volume ke 0 dan `currentTime` ke 0 seketika untuk mencegah kebocoran audio saat interupsi.
- **Watchdog Timer**: Menambahkan watchdog timer (15s di `chatVoice`, 18s di `voiceCall`) untuk mencegah status macet saat audio gagal menyelesaikan event `ended`.
- **Anti-Ghost Utterance**: Menghapus teks fiktif *"Hello, can you hear me?"* saat ucapan tidak tertangkap, menggantinya dengan notifikasi ramah `"call_not_caught"`.
- **Echo Discrimination**: Memperbaiki ambang deteksi echo agar jawaban pendek murid (*"Yes"*, *"Hai"*, *"OK"*) tidak terbuang secara salah.
- **Preservasi Intonasi Jepang**: Regex pemotong kalimat diperbarui agar tidak memenggal tanda gelombang intonasi `〜~`.
- **Fallback Dock**: Menyediakan UI fallback pengetikan teks otomatis bila `SpeechRecognition` tidak tersedia di peramban (misal Android WebView lama).

---

## 3. Daftar Berkas yang Disentuh

1. `features/interactive-chat/fiezel-voice-pedagogy.js`: Tri-state verdict (`undecided`), penghapusan batasan panjang kata, perbaikan regex pesanan, routing telemetri ke host gateway.
2. `features/interactive-chat/fiezel-voice-scenarios.js`: Pemisahan acknowledge prasyarat ke `fiezel-kaiwa-prereq-ack-v1`, penghapusan injeksi palsu ke BKT.
3. `features/interactive-chat/fiezel-chat-voice.js`: Fungsi `duck(level)`, pelacakan `ownedAudios` + proteksi global HTML5 audio di `stop()`, watchdog 15s, regex split tanpa memenggal `〜~`.
4. `features/interactive-chat/fiezel-voice-call.js`: Acoustic barge-in dengan ducking, watchdog 18s, idempotensi `setStatus` & `end()`, anti-ghost utterance, WebView fallback.
5. `features/interactive-chat/fiezel-voice-orb.js`: Guard defensive terhadap `undefined`/`null` state, idempotensi detach stream audio.
6. `features/voice-studio/src/lib/braincore.ts`: Pengiriman envelope ber-nonce `fz.studio.attempt`, pencegahan pemanggilan langsung parent `updateMastery`.
7. `features/voice-studio/dist/voice-studio.js`: Hasil build produksi bundle React Voice Studio.
8. `features/interactive-chat/fiezel-interactive-chat.js`: Implementasi `FzStudioBridge`, integrasi nonce, verifikasi origin dan replay, multi-tab sync.
9. `tests/kawan-bicara-hardening-test.js`: Suite pengujian otomatis baru (6 skenario uji).
10. `.github/workflows/quality.yml`: Penambahan `tests/kawan-bicara-hardening-test.js` ke alur CI.
11. `id-golden-baseline.json`: Regenerasi baseline emas setelah pembaruan string perbaikan.
12. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Kenaikan nomor build atomik ke `m025-695`.

---

## 4. Hasil Verifikasi Mutu Lokal

Semua gerbang pengujian mutu lokal berhasil diselesaikan dengan hasil **100% HIJAU**:

- `node tests/audio-latency-barge-in-test.js`: **PASS (100% SUKSES)**
- `node tests/kawan-bicara-hardening-test.js`: **PASS (6/6 SUKSES)**
- `node tests/voice-call-ai-studio-port-test.js`: **PASS (100% SUKSES)**
- `node tests/interactive-chat-test.js`: **PASS (11/11)**
- `node tests/interactive-chat-braincore-telemetry-test.js`: **PASS (7/7)**
- `node tests/voice-call-two-way-test.js`: **PASS (6/6)**
- `node tests/kawan-bicara-neural-voice-test.js`: **PASS (100%)**
- `node tests/interactive-chat-correction-test.js`: **PASS (8/8)**
- `node tests/voice-call-studio-integration-test.js`: **PASS (8/8)**
- `node tests/voice-studio-ui-architecture-test.js`: **PASS (5/5)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman, build m025-695)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras di semua 6 titik)**
