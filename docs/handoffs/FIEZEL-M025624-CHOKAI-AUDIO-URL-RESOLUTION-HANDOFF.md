# FIEZEL HANDOFF DOSSIER: PENYELARASAN RESOLUSI URL ASET AUDIO CHOKAI & 3D MOCHI MASCOT (BUILD M025-624)

## 1. Ringkasan Temuan Audit & Alasan Perubahan
1. **Resolusi Relative Path Audio di Jalur Produksi Subfolder (`/app`):**
   - Saat modul Chōkai listening dijalankan di lingkungan produksi (`https://fiezel.my.id/app`), browser atau skrip yang merujuk `./features/speaking-listening/audio-jlpt/*.mp3` tanpa normalisasi base directory dapat terpotong menjadi `https://fiezel.my.id/features/...` (menghasilkan status HTTP 404).
   - Diimplementasikan fungsi `resolveJlptAssetUrl(relPath)` yang secara cerdas mendeteksi konteks URL, mengunci prefix `/app/` pada subpath aplikasi atau origin yang sesuai, dan menormalkan seluruh jalur pemutaran audio (`primary`, `jees`, seek dialog turn) serta pemuatan bank soal (`getBankUrl()`).
2. **Pemulihan Penuh 3D Mochi Companion:**
   - Wadah maskot `.jlpt-mascot-slot` dan custom element `fiezel-mascot` terbukti aktif 100% dengan status:
     - `slotStyle: "flex"`
     - `slotVisibility: "visible"`
     - `hasMochiInstance: true`
     - `badge: "chat_purple"`
     - `aura: "purple"`
     - `mood: "dots"`
3. **Penyelarasan Pemutaran Audio Stream:**
   - Tombol audio `#jlptMainPlayBtn` terbukti beralih status secara mulus ke `❚❚ Jeda Audio` saat diputar, sinkron dengan frame animation RAF dan event visual maskot `listening-start` / `listening-stop`.

---

## 2. Bukti Pengujian Empiris (Probe-Driven Verification)
1. **Pengujian Integrasi Mochi & Audio Playback (`tools/dev/probe-mochi-and-audio.mjs`):**
   - Hasil eksekusi Playwright headless:
     ```json
     {
       "hasPlayBtn": true,
       "playIcon": "❚❚",
       "playText": "Jeda Audio",
       "waveActive": false,
       "hasMochiInstance": true,
       "mochiStatus": {
         "badge": "chat_purple",
         "aura": "purple",
         "mood": "dots"
       }
     }
     ```
   - Nol galat fungsional pada runtime JavaScript.
2. **Pengujian Semua Wire Maskot Latihan (`tests/test-all-practices-mochi-wire.js`):**
   - TEST 1 (JLPT Chōkai): **PASS**.
   - TEST 2 (Standard Quiz): **PASS**.
   - TEST 3 (Writing Stage): **PASS**.
   - TEST 4 (Skills Lab Player): **PASS**.
   - TEST 5 (Global Funnel `pawReact`): **PASS**.
3. **Pengujian Boot Order (`tests/boot-order-test.js`):**
   - **PASS** (100% skrip lokal ber-defer, nol parser-blocking script).
4. **Hexa-Sync Arbiter (`node tools/bump-build.mjs --check`):**
   - Selaras pada build `m025-624` di seluruh 6 titik wajib.

---

## 3. Daftar Berkas yang Disentuh
- `features/speaking-listening/fiezel-jlpt-listening.js`: Menambahkan `resolveJlptAssetUrl` untuk resolusi otomatis path relatif `/app/`, memperbarui `getBankUrl` dan `playAudioStreamWithTarget`.
- `sw.js`: Kenaikan `SW_REV` ke `m025-624`.
- `core-config.js`: Kenaikan `FIEZEL_PAGE_BUILD` ke `m025-624`.
- `coordination/BUILD-VERSION.json`: Kenaikan build ke `m025-624`.
- `features/neural-voice/fiezel-diag-panel.js`: Kenaikan `DIAG_BUILD` ke `m025-624`.
- `kurikulum.html`: Sinkronisasi query param cache `?v=m025-624`.
- `misi.html`: Sinkronisasi query param cache `?v=m025-624`.
- `docs/handoffs/FIEZEL-M025624-CHOKAI-AUDIO-URL-RESOLUTION-HANDOFF.md`: Berkas serah terima resmi rilis.

---

## 4. Status Gerbang Mutu Lokal & Catatan Utang
- `tests/id-golden-snapshot-test.js`: **PASS**.
- `tests/th-ui-leak-test.js`: **PASS**.
- `tests/curriculum-cache-version-test.js`: **PASS**.
- `tests/gate-registry-test.js`: **PASS**.
- Zero trailing whitespace (`git diff --check origin/main`: bersih).
