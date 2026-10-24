# FIEZEL HANDOFF DOSSIER: BUILD m025-640
## 3D Mochi Session Accessories, Dynamic Mouth Motion & Isolated Thinking Badge

**Tanggal:** 24 Oktober 2026
**Build Target:** `m025-640`
**Status:** VALIDATED & READY FOR PULL REQUEST
**Author:** Antigravity AI Engine

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Badge Ungu Menempel Saat Idle (User Pain Point)**:
   - Sebelumnya, badge `'chat_purple'` di-hardcode di berbagai event siklus hidup maskot (`mountOn`, `idle`, `question-shown`, `welcome-back`, serta timeout pemulihan `correct` dan `wrong`).
   - Akibatnya, badge warna ungu terus-menerus muncul melayang di samping Mochi meski Mochi dalam keadaan santai/idle.
   - **Solusi**: Default badge diubah menjadi `null`. Badge ungu HANYA muncul saat Mochi sedang berpikir (`thinking`), mengevaluasi (`evaluating`), menganalisis (`analyzing`), atau memuat materi (`loading`). Begitu selesai berpikir atau kembali idle, badge langsung hilang (`setBadge(null)`).
2. **Ketiadaan Aksesoris Tematik Antar Sesi (User Pain Point)**:
   - Sesi Listening, Membaca, dan Menulis menampilkan Mochi yang sama tanpa diferensiasi konteks kegiatan belajar.
   - **Solusi**: Dibuat sistem aksesoris modular 3D `createAccessories()` dan motion spesifik:
     - **Sesi Listening (Chōkai / JLPT / FSL)**: Mochi memakai **Headset 3D** (bando busa lembut, dual earcup kulit gelap, pelat metalik violet, cincin LED cyan bercahaya `0x00E5FF`, dan boom mikrofon melengkung). Gerakan animasi: rhythmic head bop mengangguk santai, getaran telinga, dan denyut cahaya LED audio ring.
     - **Sesi Membaca (Reading)**: Mochi memakai **Kacamata Baca 3D** bulat frame emas tipis dengan lensa reflektif. Gerakan animasi: mata men-scan teks horizontal kiri-ke-kanan secara berkala dan tilt kepala fokus.
     - **Sesi Menulis (Writing / Renshū)**: Mochi memegang **Pensil 3D** heksagonal kuning dengan graphite tip hitam dan penghapus pink. Gerakan animasi: cakar kanan membuat gestur mencatat/scribbling di udara secara periodik.
3. **Mulut Mochi Kaku/Statis (User Pain Point)**:
   - Mochi sebelumnya tidak menunjukkan artikulasi bicara ketika ada audio bersuara.
   - **Solusi**: Dibuat sistem `updateMouthMotion(dt)` dan audio watcher speech loop yang membaca `voiceIsSpeaking()`, `FiezelSpeechBridge.speaking()`, atau `FiezelPuterVoice.status().speaking`. Saat audio berbicara aktif, mulut Mochi bergerak membuka-tutup secara multi-harmonik (14Hz dan 22Hz) dengan bentuk vokal dinamis (`mouthW` dan `mouthO`). Saat santai/idle, mulut melakukan micro-breathing halus.

---

### 2. Bukti Pengujian Empiris (Playwright Browser Probes)
1. **Automated Unit & Integration Test**: `tests/test-all-practices-mochi-wire.js`
   - Melakukan bootstrap HTTP server lokal, merender Three.js canvas headless via Playwright Chromium.
   - Memverifikasi:
     - Sesi Idle: `badge === null`.
     - Sesi JLPT Chōkai / FSL: `activeAccessory === 'headset'` & node 3D headset terpasang di kepala.
     - Sesi Writing: `activeAccessory === 'pencil'` & node 3D pensil terpasang di cakar.
     - State Thinking: `setThinking(true)` memunculkan `badge === 'chat_purple'` dan tilt kepala.
     - End Thinking: `setThinking(false)` menghilangkan badge kembali ke `null`.
     - Mouth Motion: `setTalking(true)` mengaktifkan flag `isTalking` dan animasi deformasi bibir.
   - **Hasil**: 5/5 PASSED (100% Hijau).
2. **Visual Proof Snapshot Inspection**: `tools/dev/probe-mochi-visual-snapshot.mjs`
   - Mengambil tangkapan snapshot kanvas WebGL 3D dengan `preserveDrawingBuffer: true`:
     - `tests/output/mochi_headset_listening.png` (23,494 bytes) — Terlihat headset cyan glowing dan rhythmic bop.
     - `tests/output/mochi_glasses_reading.png` (23,483 bytes) — Terlihat kacamata baca emas dan eye-scan.
     - `tests/output/mochi_pencil_writing.png` (25,304 bytes) — Terlihat pensil kuning dan scribbling gesture.
     - `tests/output/mochi_thinking_badge.png` (37,724 bytes) — Terlihat badge ungu dan aura ungu saat berpikir.
     - `tests/output/mochi_talking_mouth.png` (19,313 bytes) — Terlihat artikulasi mulut terbuka-tutup saat berbicara.

---

### 3. Daftar Seluruh Berkas yang Disentuh & Perubahannya
1. **`mochi-mascot/fiezel-mochi.js`**:
   - Ditambahkan `createAccessories()`: `createHeadsetAccessory()`, `createGlassesAccessory()`, `createPencilAccessory()`.
   - Ditambahkan API `setAccessory(name)`, `setThinking(isThinking)`, `setTalking(isTalking, duration)`.
   - Ditambahkan kalkulasi gerak periodik di loop `update()`: `updateAccessoriesMotion(dt)` dan `updateMouthMotion(dt)`.
   - Diatur `preserveDrawingBuffer: true` pada `WebGLRenderer` untuk keandalan screenshot/snapshot Playwright.
2. **`features/mascot/fiezel-mochi-companion.js`**:
   - Default badge diubah dari `'chat_purple'` ke `null`.
   - Menghilangkan badge pada `idle`, `question-shown`, `welcome-back`, `correct`, `wrong`.
   - Membatasi kemunculan badge ungu HANYA pada state berpikir: `'thinking'`, `'evaluating'`, `'analyzing'`, `'loading'`.
   - Ditambahkan fungsi pendeteksi sesi otomatis `detectSession(host)` dan `applySessionAccessories(m, host)` yang mengenali container Listening, Writing, dan Reading.
   - Ditambahkan watcher speech interval (100ms) untuk sinkronisasi artikulasi mulut Mochi saat audio berbicara.
   - Diekspos fungsi kontrol instance: `getInstance()`, `setAccessory()`, `setThinking()`, `setTalking()`.
3. **`android/app/src/main/assets/public/...`**:
   - Disinkronkan file mirror maskot dan companion untuk menjaga keselarasan runtime APK Android.
4. **`tests/test-all-practices-mochi-wire.js`**:
   - Diperbarui assertion suite agar menguji ketiadaan badge saat idle, keberadaan headset di Listening, pensil di Writing, integrasi thinking badge, dan mouth flap bicara.
5. **Hexa-Sync Release Arbiter**:
   - `coordination/BUILD-VERSION.json` -> `m025-640`
   - `sw.js` -> `m025-640`
   - `core-config.js` -> `m025-640`
   - `features/neural-voice/fiezel-diag-panel.js` -> `m025-640`
   - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` -> cache bust `m025-640`.

---

### 4. Status Kelulusan Gerbang Mutu Lokal & Catatan
- `node tests/id-golden-snapshot-test.js` : **PASS**
- `node tests/th-ui-leak-test.js` : **PASS**
- `node tests/curriculum-cache-version-test.js` : **PASS**
- `node tests/gate-registry-test.js` : **PASS**
- `node tests/test-all-practices-mochi-wire.js` : **PASS**
- **Utang Teknis yang Tersisa**: Nihil. Seluruh interaksi kompatibel mundur dengan canvas 2D fallback jika WebGL Three.js tidak didukung pada perangkat low-end.
