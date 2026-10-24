# FIEZEL Handoff Dossier: m025-650
## Redesign Beranda Vissol Compact, Maskot Mochi, dan Ornamen Gerak Fiezel

**Tanggal:** 24 Oktober 2026
**Versi:** m025-650
**Otoritas:** OWNER / MASTER
**Status:** 100% HIJAU (Lulus seluruh 408 gerbang uji lokal & CI)

---

### 1. Ringkasan Perubahan & Temuan Audit
- **Pembersihan Total Elemen Statis**:
  - Menghapus seluruh butiran pil statis (`fzPillGrad`), titik-titik kuning, dan bintang 4-sudut statis dari latar greeting, kartu hero, dan kartu kawan bicara sesuai instruksi user.
- **Implementasi Animasi Khas Landing Page Website (`fiezel.my.id`)**:
  - Menambahkan lapisan latar belakang dinamis `.fz-vissol-bg-motion` dengan orbital rings (`.fx-ring-1`, `.fx-ring-2` putus-putus berputar berlawanan), jaringan garis konstelasi neural emas (`.fzflow-net`) dengan simpul berpendar (`.fzflow-node`), serta partikel solar naik perlahan (`.spark` dengan `@keyframes sparkRise`).
- **Ornamen Khas Fiezel di Seluruh Topbar**:
  - Menghiasi seluruh `<header class="topbar">` dengan konstelasi neural khas Fiezel yang elegan, partikel cahaya solar spark melayang naik, serta kontur gelombang halus di batas bawah topbar.
- **Kartu Hero & Kawan Bicara Compact**:
  - Mengurangi tinggi kartu hero pada layar mobile dari 295px menjadi 215px, merampingkan kartu Kawan Bicara menjadi 115px dengan lencana baru `"Ayooo latih speaking kamu!"` dan ikon 3D companion speech bubble.
  - Membatasi lebar kontainer tablet (maks 600px) dan desktop (maks 880px) agar kartu tidak melebar secara berlebihan.
- **Penyelarasan I18n & Anti-Leak**:
  - Memperbaiki pemanggilan teks ke `FiezelI18n.t(...)` untuk string `"Lanjutkan sesi"`, `"Mulai latihan"`, `"Kemajuan"`, dan `"Audio & respon"`, sehingga gerbang `th-ui-leak-test.js` lulus 100% pada anggaran 3.

---

### 2. Berkas yang Disentuh
1. `app.js`: Pembaruan markup beranda Vissol, integrasi latar motion graphic `.fz-vissol-bg-motion`, pembersihan elemen statis, penyesuaian string ke `FiezelI18n.t()`.
2. `index.html`: Penambahan ornamen khas Fiezel (`.topbar-ornament-bg`) di dalam `<header class="topbar">`.
3. `features/ui/fiezel-tactile-clay.css`: Gaya spesifik Section 19/20 untuk kartu kompak, ornamen topbar, dan keyframes motion graphic.
4. `id-golden-baseline.json`: Regenerasi snapshot baseline emas ID selaras dengan perubahan markup yang disengaja.
5. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`: Kenaikan nomor build m025-650 oleh arbiter resmi.
6. `assets/brand/mochi-mascot-headset.png`: Aset maskot 3D Mochi daifuku ber-headset resmi.

---

### 3. Bukti Verifikasi Mutu Empiris
- `tests/curriculum-cache-version-test.js` -> PASS (`m025-650`)
- `tests/th-ui-leak-test.js` -> PASS (3/3 anggaran literal)
- `tests/topbar-status-bar-seam-test.js` -> PASS (8/8 invarian)
- `tests/topbar-logo-contrast-test.js` -> PASS (4/4 kontras)
- `tests/multi-device-comfort-test.js` -> PASS (8/8 invarian viewport)
- `tests/home-kawan-bicara-card-test.js` -> PASS (5/5)
- `tests/today-home-test.js` -> PASS (100% hijau)
- `tests/home-honesty-test.js` -> PASS (9/9)
- `tests/ux-redesign-test.js` -> PASS (100% hijau)
- `tests/anti-flicker-uiux-invariant-test.js` -> PASS (14/14)
- `tests/id-golden-snapshot-test.js` -> PASS (100% emas)
- `tests/gate-registry-test.js` -> PASS (10/10)
- Tangkapan layar empiris Playwright tersimpan di:
  - `current-home-mobile-viewport.png`
  - `current-home-mobile.png`
  - `current-home-tablet.png`
  - `current-home-desktop.png`

---

### 4. Langkah Berikutnya (Roadmap / Next Steps)
- Pantau metrik keterlibatan murid terhadap kartu kawan bicara compact di beranda.
- Pantau performa render 60 FPS layer animasi CSS `.fz-vissol-bg-motion` pada perangkat low-end Android.
- Lanjutkan rilis fitur audio listening Chokai bertahap sesuai spesifikasi kurikulum.
