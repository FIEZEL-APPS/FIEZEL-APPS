# Berkas Serah Terima: FIEZEL-M025622-MOCHI-MASCOT-AUDIO-REPAIR-HANDOFF.md
**Nomor Build:** `m025-622`
**Tanggal:** 20 Oktober 2026
**Cakupan:** Pemulihan 3D Mochi Companion Mascot, Perbaikan Bug Audio Playback (Pembersihan ReferenceError syncPlayingTurnHighlight), dan Pemuatan Modul Three.js PWA

---

## 1. Ringkasan Temuan Audit & Masalah yang Dilaporkan
Pengguna melaporkan:
1. **Animasi Mochi Hilang:** Maskot 3D Mochi tidak muncul saat sesi latihan Chōkai dibuka.
2. **Suara Hilang:** Tombol pemutar audio tidak bersuara saat diklik di modul Chōkai.

### Investigasi Mendalam & Root Cause Analysis:
1. **Penyebab Hilangnya Maskot 3D Mochi:**
   - Di `features/speaking-listening/jlpt-listening.css`, terdapat deklarasi `.jlpt-mascot-slot { display: none !important; }` yang menyembunyikan slot maskot secara paksa.
   - Di `features/mascot/fiezel-mochi-companion.js` fungsi `ensureMochiModule()`, dynamic import modul `FiezelMochi` sebelumnya dinonaktifkan (`moduleLoading = true;` tanpa memanggil `import()`), sehingga objek `window.FiezelMochi` tidak pernah terdefinisi.
   - Di `index.html`, berkas `./mochi-mascot/fiezel-mochi.js` belum dimuat sebagai script module pendamping.

2. **Penyebab Hilangnya Audio Playback:**
   - Di `features/speaking-listening/fiezel-jlpt-listening.js`, terdapat duplikasi deklarasi fungsi `playAudioStream` pada baris 968 yang menimpa deklarasi `playAudioStreamWithTarget` pada baris 761.
   - Duplikasi fungsi lama tersebut memanggil `audioObj.ontimeupdate = syncPlayingTurnHighlight;`, padahal fungsi `syncPlayingTurnHighlight` tidak pernah didefinisikan (berganti nama menjadi `syncAudioScrubberAndTurns`), sehingga melempar galat fatal `ReferenceError: syncPlayingTurnHighlight is not defined` seketika saat tombol Play diklik.

---

## 2. Perbaikan yang Diterapkan
1. **Pemulihan Slot 3D Mochi di CSS (`features/speaking-listening/jlpt-listening.css`):**
   - Mengembalikan styling responsif `.jlpt-mascot-slot` dengan tinggi 165px (min-height 145px di desktop/tablet, 140px di mobile), latar gradasi radial travertine hangat, dan kontainer `.fz-mochi-viewport`.
2. **Pemulihan Dynamic Import Module (`features/mascot/fiezel-mochi-companion.js`):**
   - Mengaktifkan kembali fallback candidate paths (`./mochi-mascot/fiezel-mochi.js`, base URL, dan `/app/mochi-mascot/fiezel-mochi.js`) dalam `ensureMochiModule()`.
3. **Pemuatan Modul Dinamis Non-Blocking:**
   - Memastikan pemuatan modul ES Three.js dan FiezelMochi berjalan secara dinamis di latar belakang (`ensureMochiModule`) tanpa skrip parser-blocking di `index.html`, sehingga mematuhi kontrak `tests/boot-order-test.js`.
4. **Pembersihan Galat Audio (`features/speaking-listening/fiezel-jlpt-listening.js`):**
   - Menghapus blok duplikat usang `playAudioStream` yang mengandung `syncPlayingTurnHighlight`.
   - Menjaga saluran pemutaran audio bersih melalui `playAudioStreamWithTarget` yang terhubung ke sinkronisasi `requestAnimationFrame` (`startAudioRafSync()`) dan pembaruan UI `playAudioStream`.

---

## 3. Bukti Verifikasi Empiris
1. **Pengujian Mochi Companion (`tests/test-all-practices-mochi-wire.js`):**
   - TEST 1 (JLPT Chōkai Listening Mascot): **PASS** (badge `chat_purple`, aura `purple`, ear wiggle `1.3`).
   - TEST 2 (Standard Quiz Container): **PASS** (toddler pout pada salah, joyful hop pada benar).
   - TEST 3 (Writing Stage): **PASS** (`attached: true`, `hasMochi: true`).
   - TEST 4 (Skills Lab Player): **PASS** (`attached: true`, `hasMochi: true`).
   - TEST 5 (Global Event Funnel): **PASS** (`wakeWiggle: true`, zero console errors).
2. **Pengujian Boot Order (`tests/boot-order-test.js`):**
   - **PASS** (seluruh skrip lokal mematuhi defer, nol parser-blocking).
3. **Pengujian Audio Click Playwright (`tools/dev/probe-audio-click-test.mjs`):**
   - Tombol audio diklik -> ikon berubah menjadi `❚❚` (pause) dan teks berubah menjadi `Jeda Audio`.
   - Nol galat `ReferenceError` pada browser console log.
4. **Pengujian Multi-Device Layout (`tools/dev/probe-chokai-multidevice.mjs`):**
   - Mobile (390×844), Tablet (820×1180), Desktop (1280×800) **100% PASS** (nol overflow, nol tumpukan opsi).
5. **Hexa-Sync Arbiter (`node tools/bump-build.mjs --check`):**
   - Selaras pada build `m025-622` di seluruh 6 titik wajib.

---

## 4. Berkas yang Diubah
- `coordination/BUILD-VERSION.json`
- `core-config.js`
- `sw.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `features/mascot/fiezel-mochi-companion.js`
- `features/speaking-listening/jlpt-listening.css`
- `features/speaking-listening/fiezel-jlpt-listening.js`
- `docs/handoffs/FIEZEL-M025622-MOCHI-MASCOT-AUDIO-REPAIR-HANDOFF.md`
- `misi.html`
- `index.html`
- `features/mascot/fiezel-mochi-companion.js`
- `features/speaking-listening/jlpt-listening.css`
- `features/speaking-listening/fiezel-jlpt-listening.js`
- `docs/handoffs/FIEZEL-M025622-MOCHI-MASCOT-AUDIO-REPAIR-HANDOFF.md`
