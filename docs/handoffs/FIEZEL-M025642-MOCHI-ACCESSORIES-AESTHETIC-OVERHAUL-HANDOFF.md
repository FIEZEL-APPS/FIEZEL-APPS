# FIEZEL HANDOFF DOSSIER: BUILD m025-642
## Aesthetic Overhaul of 3D Mochi Headset, Glasses, Pencil & Anti-Nausea Lofi Listening Motion

**Tanggal:** 24 Oktober 2026
**Build Target:** `m025-642`
**Status:** VALIDATED & READY FOR PULL REQUEST
**Author:** Antigravity AI Engine

---

### 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Animasi Listening Membuat Pusing (Root Cause Analysis)**:
   - Ditemukan bug akumulasi rotasi pada loop animasi: `this.targetRot.x += headBop`. Karena tidak di-reset per frame, nilai rotasi terus terakumulasi dan menyebabkan Mochi berguncang tanpa henti.
   - Selain itu, frekuensi bop `4.6 rad/s` dan getaran `this.earPhys.L.tip += headBop * 0.4` menghasilkan gerakan kejang/spastik yang memicu motion sickness pada pengguna ("bikin pusing").
   - **Solusi**:
     - Sistem akumulator dihapus total dan digantikan oleh `this.accessoryMotionOffset = { rotX, rotY, rotZ, posY }` murni yang dihitung ulang setiap frame dari fungsi gelombang mulus dan terikat.
     - Tempo diubah menjadi **65 BPM lofi chill beat (~0.35 Hz)**: anggukan kepala mikro lembut (maks $\pm 1.4^\circ$), kemiringan kepala santai (maks $\pm 2.0^\circ$), dan nafas melayang lembut.
     - LED ring earcup diubah dari kedipan cepat menjadi denyut nafas lembut (*soothing breathing glow*).
2. **Headset Terkubur & Tidak Terlihat (Root Cause Analysis)**:
   - Pada build sebelumnya, headband ditempatkan pada $y = 0.15$ dan earcup pada $x = \pm 1.20$, sementara kontur pipi dan kepala Mochi berada pada $x \approx \pm 1.55$ dan $y \approx 1.25$. Akibatnya earcup 100% terkubur di dalam pipi dan headband terpotong di dalam kepala.
   - **Solusi**:
     - Headband diangkat menjadi busur megah di atas kepala ($y = 1.58$ di apex) dengan bantalan empuk marshmallow di bagian bawah dan slider logam perak.
     - Earcup diposisikan menempel pas di sisi pipi ($x = \pm 1.54$, $y = 0.16$), dimiringkan $24^\circ$ menghadap kamera depan sehingga piringan LED neon cyan (`0x00E5FF`) dan aksen not balok putih terlihat jelas dan menawan.
     - Boom mic studio dipertegas melengkung elegan ke sudut kiri mulut dengan ujung filter busa dan lampu indikator cyan.
3. **Kacamata Buram & Tangkai Kacamata Melayang (Root Cause Analysis)**:
   - Tangkai kacamata sebelumnya mencuat lurus ke samping seperti antena lalat karena Mochi adalah makhluk bulat tanpa daun telinga samping. Rims juga berwarna cokelat gelap kusam.
   - **Solusi**:
     - Tangkai antena panjang dihapus total dan diganti dengan engsel emas mini (*discreet gold hinges*) di sudut luar frame, mengadopsi standar desain figurin chibi profesional (Sanrio/Animal Crossing).
     - Warna frame diubah menjadi **Honey Amber & Polished Gold** yang hangat, mewah, dan berkilau.
     - Rim dibesarkan dengan proporsi manis dan dilengkapi pantulan kilau kacamata anime (*anime glasses gleam highlight*) di sudut kiri atas tiap lensa.
4. **Pensil Menulis Melayang di Luar Jangkauan (Root Cause Analysis)**:
   - Pensil sebelumnya tidak terikat pada koordinat cakar dan tersembunyi di balik pipi.
   - **Solusi**:
     - Pensil dikaitkan langsung ke inti cakar kanan (`this.handR.userData.core`).
     - Proporsi pensil diatur menjadi pensil heksagonal chibi yang proporsional (panjang $0.55$, bodi kuning, ferrule perak, penghapus pink, dan ujung grafit hitam).
     - Cakar kanan diangkat ke depan secara anggun memegang pensil dalam gestur menulis yang menggemaskan dan 100% berada di dalam batas kanvas kamera.

---

### 2. Bukti Pengujian Empiris (Playwright Browser Probes)
1. **Automated Unit & Integration Test**: `tests/test-all-practices-mochi-wire.js`
   - Melakukan eksekusi browser headless via Chromium Playwright.
   - Memvalidasi seluruh 5 seksi:
     - JLPT Chōkai Listening integration (aksesoris headset aktif, badge ungu null).
     - Standard Quiz (idle bersih, thinking badge terisolasi, mouth flap berbicara).
     - Writing Stage (aksesoris pensil aktif di cakar kanan).
     - Skills Lab Player (aksesoris headset aktif).
     - Global pawReact funnel & error console monitor (0 error).
   - **Hasil**: 5/5 PASSED (100% Hijau).
2. **Visual Proof Snapshot Inspection**: `tools/dev/probe-mochi-visual-snapshot.mjs`
   - Seluruh 5 snapshot diperbarui dengan simulasi fisika penuh (30 frame settle) dan diinspeksi secara visual:
     - `tests/output/mochi_headset_listening.png` (40,065 bytes) — Headset indigo cyan neon terlihat megah, bando melengkung sempurna di atas kepala, mic studio terarah rapi.
     - `tests/output/mochi_glasses_reading.png` (31,011 bytes) — Kacamata bulat honey amber emas melingkari mata dengan kilau reflektif jernih tanpa tangkai antena liar.
     - `tests/output/mochi_pencil_writing.png` (30,917 bytes) — Pensil kuning digenggam erat oleh cakar kanan marshmallow di depan dada.
     - `tests/output/mochi_thinking_badge.png` (39,276 bytes) — Badge ungu eksklusif saat berpikir.
     - `tests/output/mochi_talking_mouth.png` (21,275 bytes) — Artikulasi mulut terbuka saat bersuara.

---

### 3. Daftar Seluruh Berkas yang Disentuh & Perubahannya
1. **`mochi-mascot/fiezel-mochi.js`**:
   - Mendesain ulang `createHeadsetAccessory()` dengan busur CatmullRom 3D, bantalan bawah, earcup sudut depan, cincin neon cyan, dan boom mic.
   - Mendesain ulang `createGlassesAccessory()` dengan rim honey amber, bridge emas melengkung, lensa kristal, dan engsel emas mini.
   - Menghubungkan `createPencilAccessory()` langsung ke `this.handR.userData.core`.
   - Mengubah `updateAccessoriesMotion()` menjadi sistem non-akumulatif berbasis `accessoryMotionOffset` berirama 65 BPM lofi chill.
   - Menyelaraskan pose cakar menulis pada `updatePaws()`.
2. **`android/app/src/main/assets/public/mochi-mascot/fiezel-mochi.js`**:
   - Disinkronkan dengan file web untuk keselarasan runtime APK Android.
3. **`tools/dev/probe-mochi-visual-snapshot.mjs`**:
   - Menambahkan settling loop 30 frame agar penangkapan visual mencakup konvergensi fisika pegas.
4. **Hexa-Sync Release Arbiter**:
   - `coordination/BUILD-VERSION.json` -> `m025-642`
   - `sw.js` -> `m025-642`
   - `core-config.js` -> `m025-642`
   - `features/neural-voice/fiezel-diag-panel.js` -> `m025-642`
   - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` -> cache bust `m025-642`.

---

### 4. Status Kelulusan Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js` : **PASS**
- `node tests/th-ui-leak-test.js` : **PASS**
- `node tests/curriculum-cache-version-test.js` : **PASS**
- `node tests/gate-registry-test.js` : **PASS**
- `node tests/test-all-practices-mochi-wire.js` : **PASS**
- `node tests/build-number-uniqueness-test.js` : **PASS**
- **Utang Teknis yang Tersisa**: Nihil.
