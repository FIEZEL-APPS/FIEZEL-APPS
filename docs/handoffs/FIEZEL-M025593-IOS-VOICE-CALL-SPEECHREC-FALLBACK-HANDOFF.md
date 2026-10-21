# FIEZEL Handoff: iOS PWA Voice Call SpeechRecognition Pipeline & Flex Cutoff Resolution (m025-593)

## 1. Ringkasan Masalah & Temuan Akar Masalah (Root Causes)
Pengguna melaporkan keanehan empiris penting:
> *"masalahnya shadowing bisa, tapi voice call tidak bisa, aneh sekali"*

### Analisis Akar Masalah Teknis:
1. **Perbedaan Pipeline Audio Shadowing vs Voice Call**:
   - **Mode Shadowing**: Hanya mengandalkan mesin `SpeechRecognition` (`webkitSpeechRecognition`). Di iOS WebKit (Safari & PWA Standalone), browser mengizinkan speech recognition bawaan tanpa memerlukan media stream terpisah.
   - **Mode Voice Call Sebelumnya**: Mewajibkan `initMediaStream()` memanggil `navigator.mediaDevices.getUserMedia({ audio: true })`. Pada lingkungan iOS WebKit PWA, `getUserMedia` sering kali ditolak/dibatasi oleh isolasi izin WebKit.
   - Karena kegagalan `getUserMedia` dianggap fatal (*fatal error*), `VoiceCall.start()` langsung meloncat ke `.catch()`, menutup overlay panggilan, dan membuang sesi sebelum `setupSpeechRecognition()` sempat diinisialisasi.
2. **Konflik Keras AVAudioSession di iOS**:
   - Di iOS WebKit, menjalankan `getUserMedia` secara simultan bersamaan dengan `webkitSpeechRecognition` mengunci hardware controller `AVAudioSession`, yang memicu penolakan mikrofon atau mematikan salah satu engine.
3. **Flexbox Scroll Cutoff Bug pada Horizontal Rail**:
   - `.fzc-call-quick-chips` menggunakan `justify-content: center` dengan `overflow-x: auto`. Pada CSS flexbox, perataan tengah pada kontainer scrollable memotong kartu sebelah kiri sehingga tidak bisa digeser (*unreachable left scroll*).
   - `.fzc-scenarios-rail` dan `.fzc-suggestions-row` terpotong di tepi kanan ponsel karena ketiadaan spacer penutup di ujung kontainer scroll.

---

## 2. Solusi & Perbaikan Sistemik (Architectural Fixes)

1. **SpeechRecognition Pipeline Non-Fatal Fallback di `fiezel-voice-call.js`**:
   - Di lingkungan iOS, sistem mendeteksi `isIOS && hasSpeechRec`. Karena `webkitSpeechRecognition` sudah terbukti bekerja (seperti pada Shadowing), `initMediaStream` langsung mengaktifkan pipeline `SpeechRecognition` tanpa memaksakan `getUserMedia` yang memicu kunci hardware `AVAudioSession`.
   - Di platform lain, jika `getUserMedia` ditolak tetapi `SpeechRecognition` tersedia, sistem tidak lagi membatalkan panggilan, melainkan beralih secara mulus (*graceful fallback*) ke pipeline `SpeechRecognition`.
2. **Kinetic Speech-Reactive Visualizer Loop**:
   - Diperkenalkan `kineticSpeechLevel` di `startVadLoop()` yang merespons event `rec.onaudiostart`, `rec.onsoundstart`, `rec.onspeechstart`, dan `rec.onresult`.
   - Voice Orb berdenyut responsif terhadap amplitudo kata yang diucapkan murid meskipun tanpa hardware analyser stream.
3. **Safe Hands-Free Restart di iOS**:
   - `rec.onend` kini menggunakan jeda aman `setTimeout(..., 80)` untuk mencegah tabrakan `InvalidStateError` saat me-restart pengenalan suara secara otomatis di iOS.
4. **Perbaikan Tampilan Flexbox Scrollable Rail di `interactive-chat.css`**:
   - `.fzc-call-quick-chips`: Mengganti `justify-content: center` menjadi `justify-content: flex-start`, menambahkan padding horizontal `16px` dan `::after` spacer sehingga seluruh kartu dapat digeser tanpa terpotong.
   - `.fzc-scenarios-rail` & `.fzc-suggestions-row`: Menambahkan pseudo-element `::after` dengan `min-width: 16px` dan `flex-shrink: 0` agar kartu terakhir di ujung kanan memiliki margin nafas yang lega dan tidak terpotong tepi layar.

---

## 3. Hasil Pengujian Empiris & Gerbang Mutu Lokal

- `node tests/ios-pwa-mic-shadowing-test.js` -> **PASS (5/5)**
  - Test 1: FiezelVoiceCall.showMicPermissionModal export
  - Test 2: iPhone Standalone PWA Settings guide
  - Test 3: Media stream preservation
  - Test 4: FiezelInteractiveChat loading
  - Test 5: VoiceCall connects successfully on iOS via SpeechRecognition pipeline
- `node tests/voice-call-two-way-test.js` -> **PASS (6/6)**
- `node tests/id-golden-snapshot-test.js` -> **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS (m025-593)**
- `node tests/gate-registry-test.js` -> **PASS (10/10)**
- `node tools/bump-build.mjs --check` -> **PASS (Selaras m025-593)**

---

## 4. Daftar Berkas yang Disentuh

1. `features/interactive-chat/fiezel-voice-call.js`:
   - Penambahan deteksi `isIOS && hasSpeechRec` untuk memotong `getUserMedia` yang bermasalah di iOS dan mengandalkan `SpeechRecognition`.
   - Penambahan `kineticSpeechLevel` di `startVadLoop()`.
   - Peningkatan event listener `rec` (`onaudiostart`, `onsoundstart`, `onspeechstart`, `onspeechend`, `onresult`).
   - Ekspor `endCall: end` pada engine dan root API.
2. `features/interactive-chat/interactive-chat.css`:
   - Perbaikan `.fzc-call-quick-chips` (`justify-content: flex-start`, padding, spacer).
   - Penambahan spacer `::after` pada `.fzc-scenarios-rail` dan `.fzc-suggestions-row`.
3. `tests/ios-pwa-mic-shadowing-test.js`:
   - Penambahan Test 5 memvalidasi koneksi panggilan sukses di iOS tanpa kegagalan `getUserMedia`.
4. `id-golden-baseline.json`:
   - Sinkronisasi baseline literal emas Indonesia.
5. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`:
   - Kenaikan nomor build Hexa-Sync resmi ke `m025-593`.
