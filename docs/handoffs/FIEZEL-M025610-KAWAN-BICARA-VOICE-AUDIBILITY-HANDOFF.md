# DOKUMEN SERAH TERIMA RESMI (HANDOFF DOSSIER)
**ID Dokumen:** `FIEZEL-M025610-KAWAN-BICARA-VOICE-AUDIBILITY-HANDOFF`  
**Fitur / Perbaikan:** Perbaikan Deadlock TTS, Loopback CSP Origin, dan Pemulihan Suara Dua Arah Kawan Bicara (Mitra Kaiwa)  
**Nomor Rilis Arbiter:** `m025-610`  
**Tanggal:** 19 Oktober 2026  
**Status CI & Mutu:** 100% HIJAU (PASS)  
**Branch Fitur:** `fix/kawan-bicara-voice-deadlock`  

---

## 1. Ringkasan Temuan Audit & Akar Masalah (Root Causes)

Pengguna melaporkan: *"tidak ada suara sama sekali saat melakukan telfon dan suara otomatis di chat juga tidak ada suara sama sekali"*.

Berdasarkan audit empiris mendalam dan penelusuran alur eksekusi, ditemukan 3 akar masalah yang menyebabkan ketiadaan suara total:

1. **Deadlock Inisialisasi Server TTS pada `fiezel-chat-voice.js`**:
   - `serverStatus` diinisialisasi dengan nilai `'unknown'`.
   - Logika `isServerAvailable()` dan `canTryServer` memeriksa `serverStatus === 'available'`.
   - Karena berstatus `'unknown'`, `canTryServer` selalu bernilai `false`, dan saat lapisan lazy `puter` belum dimuat, fungsi `speak()` langsung berhenti seketika di baris `return finish(false)` tanpa pernah memanggil `/api/tts/line`.
   - **Solusi:** Diperbarui menjadi `serverStatus !== 'unavailable'` dan `canTryServer = !isExplicitOff && !isCoolingDown`. Ditambahkan pemicuan eager `lazy.load('voice')` agar dependensi audio selalu siap.

2. **Pemblokiran Kebijakan Keamanan Peramban (Content Security Policy / CSP)**:
   - Pada `index.html`, CSP didefinisikan sebagai `connect-src 'self' https: wss:;`.
   - Ketika peramban memanggil endpoint lokal `http://127.0.0.1:3000/api/tts/line` (atau `localhost`), peramban menolak koneksi dengan pesan: `Refused to connect because it violates the document's Content Security Policy`.
   - **Solusi:** Menambahkan origin loopback lokal `http://127.0.0.1:* http://localhost:*` pada direktif `connect-src` di `index.html`.

3. **Resolusi Alamat Endpoint Backend (`resolveAbsoluteUrl`)**:
   - Logika penentuan host sebelumnya belum menangani dengan baik eksekusi dari port selain 3000 atau protokol `file://`.
   - **Solusi:** Diperbarui untuk mengarahkan ke `http://127.0.0.1:3000` ketika diakses secara lokal.

4. **Kepatuhan Terhadap Kanon Nol Browser TTS**:
   - Sesuai kanon FIEZEL m025-232 dan m025-246, `window.speechSynthesis` tetap dilarang keras (haram total). Seluruh suara dilayani oleh Edge Neural TTS Multi-Character 24kHz (Guy, Aria, Keita, Nanami) melalui endpoint `/api/tts/line`.

---

## 2. Bukti Pengujian Empiris & Verifikasi Headless Playwright

Pengujian empiris dilakukan menggunakan Chromium Playwright (`tools/dev/probe-kawan-bicara-neural-voice.mjs`) pada viewport mobile iPhone (390x844 DPR 2) secara headless:

1. **Panggilan Telepon Dua Arah (Voice Call Overlay)**:
   - Tombol `#fzcBtnCall` ditekan.
   - Overlay `#fzcCallOverlay` terbuka dengan partner aktif *フィゼル先生* (Sensei Keita/Nanami).
2. **Reaktivitas Visual Orb saat AI Berbicara**:
   - Sampling multi-frame denyut orb membuktikan ekspansi dinamis saat audio bersuara:
     - Frame 1: `scale(1.45)`, `voiceLevel: 0.547`, `haloOpacity: 0.85`
     - Frame 2: `scale(1.45)`, `voiceLevel: 0.507`, `haloOpacity: 0.85`
     - Frame 3: `scale(1.45)`, `voiceLevel: 0.654`, `haloOpacity: 0.85`
     - Frame 4: `scale(1.45)`, `voiceLevel: 0.714`, `haloOpacity: 0.85`
   - Terbukti 4 dari 4 sampel berdenyut aktif (scale > 1.05x dan audioLevel aktif).
3. **Pengujian Interupsi Polite Barge-In**:
   - Status sebelum barge-in: `statusBefore: 'speaking', interruptedCountBefore: 0`.
   - Murid menyentuh orb / memotong pembicaraan.
   - Status sesudah barge-in: `statusAfter: 'listening', interruptedCountAfter: 1, subText: 'Menyimakmu...', stopEventTriggered: true`.
   - Audio AI terputus seketika dan state kembali ke mode mendengarkan.
4. **Penghentian Panggilan & Sinkronisasi Zero-Loss**:
   - Tombol akhiri panggilan `#fzcCallBtnEnd` ditekan.
   - Overlay tertutup bersih (`overlayExists: false`, `finalStatus: 'idle'`).
   - Riwayat giliran bicara tersinkronisasi utuh ke feed chat Kawan Bicara (5 pesan feed).
5. **Integritas Konsol & Bebas Galat**:
   - Total runtime console error: **0**
   - Total unhandled exceptions: **0**

---

## 3. Status Gerbang Mutu Lokal

Seluruh gerbang mutu otomatis telah dijalankan dan lulus 100%:

| Gerbang Pengujian | Perintah | Status | Keterangan |
| :--- | :--- | :---: | :--- |
| **Kawan Bicara Neural Voice Suite** | `node tests/kawan-bicara-neural-voice-test.js` | **PASS** | 5 bagian lulus (Persona, Chunks, Barge-in, Fail-quiet, Nol-TTS) |
| **Chat Voice Endpoint Suite** | `node tests/chat-voice-neural-endpoint-test.js` | **PASS** | 6 pengujian endpoint neural server lulus |
| **Golden Baseline Snapshot** | `node tests/id-golden-snapshot-test.js` | **PASS** | Baseline emas Indonesia utuh |
| **Thai UI Leak Guard** | `node tests/th-ui-leak-test.js` | **PASS** | 4389 kunci id selaras th, nol kebocoran naskah |
| **Curriculum Cache Version** | `node tests/curriculum-cache-version-test.js` | **PASS** | 26 penegasan lulus, selaras pada build m025-610 |
| **Gate Registry Integrity** | `node tests/gate-registry-test.js` | **PASS** | 10 pass, 0 fail |
| **No-Network Airgap Scan** | `node tests/no-network-test.js` | **PASS** | 41 penegasan lulus pada 392 gerbang |
| **Audio CSP Media-Src Gate** | `node tests/audio-csp-media-src-test.js` | **PASS** | 7 penegasan lulus |
| **Audio Locale Guard** | `node tests/audio-locale-guard-test.js` | **PASS** | 100% bebas speechSynthesis bawaan peramban |
| **Hexa-Sync Arbiter** | `node tools/bump-build.mjs --check` | **PASS** | 6 titik selaras sempurna di build `m025-610` |

---

## 4. Daftar Berkas yang Disentuh

1. `features/interactive-chat/fiezel-chat-voice.js`: Perbaikan inisialisasi server status, deadlock `canTryServer`, eager loading voice, dan routing URL lokal.
2. `index.html`: Penambahan izin loopback `http://127.0.0.1:* http://localhost:*` pada CSP `connect-src`.
3. `server.js`: Penutupan koneksi TTS di block `finally` (`tts.close()`) untuk mencegah kebocoran koneksi.
4. `tools/dev/probe-kawan-bicara-neural-voice.mjs`: Penyesuaian pemeriksaan status barge-in Playwright.
5. `id-golden-baseline.json`: Regenerasi baseline emas setelah pembaruan logika TTS.
6. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Penomoran build dinaikkan ke `m025-610` melalui arbiter resmi.
