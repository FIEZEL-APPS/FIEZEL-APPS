# FIEZEL HANDOFF DOSSIER: BUILD m025-504
## UI/UX Anti-Flicker Invariant Quality Gate, Topbar Profile Settings Button Restoration, and 3D Mochi Bundle Tracking

**Tanggal Rilis**: 2026-10-07  
**Nomor Build**: `m025-504`  
**Branch Fitur**: `feat/m025-504-mochi-three-bundle-fix`  
**Otoritas Arbiter**: `coordination/BUILD-VERSION.json`  
**Status Gerbang Mutu**: 100% HIJAU (Seluruh Gerbang PASS)

---

### 1. Ringkasan Eksekutif & Permintaan Pengguna

Pengguna meminta dua hal mendesak terkait integritas aplikasi:
1. **Penguncian Permanen di Quality Gate**:
   *"jangan sampai pengaturan ui dan ux sekarang terkena bug lagi, jadi aku ingin fiezel quality gate yang menjaga ini, agar agent agent tolol tidak merusak kode tyang sudah bagus sekarang"*
2. **Pengembalian Tombol Pengaturan Topbar**:
   *"TOMBOL PANEL SETTING HILANG DI TOPBAR, MUNCULKAN KEMBALI, TEMPATKAN DI TOPBAR DI PANEL PROFIL"*

Rilis ini menyelesaikan kedua masalah tersebut secara tuntas, empiris, dan terkunci permanen di CI GitHub Actions.

---

### 2. Rincian Perubahan Teknis

#### A. Restorasi Tombol Pengaturan di Topbar Panel Profil
- **`index.html`**:
  - Mengeluarkan `<button type="button" class="icon-button" id="topSettingsBtn" onclick="openSettings()" aria-label="Buka pengaturan" data-i18n-aria-label="nav.open-settings-aria" title="Pengaturan" data-testid="topbar-settings-button"><i data-lucide="sliders-horizontal"></i></button>` dari slot tersembunyi ke `#topGamifyCluster`.
- **`features/ui/fiezel-tactile-clay.css`**:
  - Menetapkan aturan default: `#topSettingsBtn { display: none !important; }`.
  - Mengaktifkan tombol secara spesifik pada panel profil: `html body.fz-view-profile #topSettingsBtn { display: inline-flex !important; }`.
  - Menyembunyikan tombol ganti kursus saat berada di profil agar topbar tetap proporsional: `html body.fz-view-profile #fzCourseSwitchBtn { display: none !important; }`.
- **`app.js` (`renderInner`)**:
  - Menambahkan penyelarasan runtime di dalam try-block topbar:
    ```javascript
    const _isP = state.view === 'online' || state.view === 'profile',
          _setBtn = $('topSettingsBtn'),
          _cBtn = $('fzCourseSwitchBtn');
    if (_setBtn) _setBtn.style.display = _isP ? 'inline-flex' : 'none';
    if (_cBtn) _cBtn.style.display = _isP ? 'none' : 'inline-flex';
    ```

#### B. Gerbang Mutu Baru: `tests/anti-flicker-uiux-invariant-test.js`
Menjaga 14 invarian ketat:
1. `app.js`: `renderInner()` menyematkan `is-repaint` ke `appContainer`.
2. `app.js`: DILARANG KERAS mencabut `is-repaint` secara asinkron (`classList.remove('is-repaint')`).
3. `app.js`: `go()` dilarang mencabut `is-repaint` saat View Transition selesai.
4. `style.css`: `.is-repaint` mematikan animasi pada `#app`, `.fade`, dan `.card` (`animation: none !important`).
5. `fiezel-lux.css`: Tema Lux mematikan `luxRise` saat `is-repaint` aktif.
6. `fiezel-tactile-clay.css`: `header.topbar` wajib memegang `view-transition-name: topbar !important`.
7. `fiezel-tactile-clay.css`: `header.topbar` dilarang disetel `view-transition-name: none`.
8. `fiezel-tactile-clay.css`: `::view-transition-old(topbar)` dan `::view-transition-new(topbar)` mematikan animasi (`animation: none !important; mix-blend-mode: normal !important`).
9. `fiezel-tactile-clay.css`: `.bottomnav` wajib memegang `view-transition-name: bottomnav !important` dan supresi animasi.
10. `index.html`: Tombol `#topSettingsBtn` wajib ada, memanggil `openSettings()`, dan berlabel aksesibel.
11. `index.html`: `#topSettingsBtn` tidak boleh disembunyikan dalam display:none permanen di HTML.
12. `fiezel-tactile-clay.css`: `#topSettingsBtn` aktif pada panel profil (`fz-view-profile`).
13. `app.js`: `renderInner()` menyelaraskan display `#topSettingsBtn` untuk panel profil.
14. Negative Self-Test: Validator membuktikan diri menolak kode yang melanggar aturan-aturan di atas.

#### C. Integrasi CI & Gate Registry
- Mendaftarkan `node tests/anti-flicker-uiux-invariant-test.js` ke `.github/workflows/quality.yml` di blok Core validation.
- `node tests/gate-registry-test.js`: 10/10 PASS (372 berkas uji terdata dan terverifikasi).

---

### 3. Bukti Pengujian Empiris (Playwright Headless Chromium)

#### A. Verifikasi Status Topbar & Tombol Pengaturan Lintas Panel (`tools/dev/probe-tb2.mjs`)
```json
home:      { "h": 56, "w": 390, "disp": "flex", "pos": "fixed", "setBtnVis": "none", "crsBtnVis": "flex" }
latihan:   { "h": 56, "w": 390, "disp": "flex", "pos": "fixed", "setBtnVis": "none", "crsBtnVis": "flex" }
classroom: { "h": 56, "w": 390, "disp": "flex", "pos": "fixed", "setBtnVis": "none", "crsBtnVis": "inline-flex" }
progress:  { "h": 56, "w": 390, "disp": "flex", "pos": "fixed", "setBtnVis": "none", "crsBtnVis": "flex" }
online:    { "h": 56, "w": 390, "disp": "flex", "pos": "fixed", "setBtnVis": "flex", "crsBtnVis": "none" }
game:      { "h": 56, "w": 390, "disp": "flex", "pos": "fixed", "setBtnVis": "none", "crsBtnVis": "flex" }
```
- **Kesimpulan**: Seluruh panel memiliki tinggi topbar seragam 56px, terisolasi `fixed`, dan tombol pengaturan tampil khusus di panel Profil (`online`).

#### B. Verifikasi Interaksi Klik Tombol Pengaturan
```
Clicking #topSettingsBtn...
Settings Modal Status: {
  "modalFound": true,
  "modalHidden": false,
  "modalShow": true,
  "panelSnippet": "FIEZEL\nPengaturan\n\nKetuk kelompok untuk membuka pengaturannya.\n\nProfil & Level\nBelajar\nSuara & Notif"
}
```
- **Kesimpulan**: Tombol pengaturan `#topSettingsBtn` di panel Profil secara responsif dan sukses membuka modal dialog Pengaturan (`#modal.show`).

---

### 4. Verifikasi Hexa-Sync & Gerbang Mutu Lokal

1. `node tools/bump-build.mjs --check`: **Selaras** (Revisi `m025-504`).
2. `node tests/anti-flicker-uiux-invariant-test.js`: **14/14 PASS**.
3. `node tests/gate-registry-test.js`: **10/10 PASS**.
4. `node tests/id-golden-snapshot-test.js`: **PASS (Baseline emas utuh)**.
5. `node tests/th-ui-leak-test.js`: **PASS**.
6. `node tests/curriculum-cache-version-test.js`: **26/26 PASS**.
7. `node tests/test-jlpt-mochi-wire.js`: **100% PASS**.
8. `node tests/precache-covers-shell-test.js`: **5/5 PASS**.

---

### 5. Daftar Berkas yang Disentuh

1. `.github/workflows/quality.yml`: Mendaftarkan `tests/anti-flicker-uiux-invariant-test.js`.
2. `app.js`: Logika visibilitas `#topSettingsBtn` vs `#fzCourseSwitchBtn` di `renderInner()`.
3. `coordination/BUILD-VERSION.json`: Versi build bumped ke `m025-504`.
4. `core-config.js`: Versi build `m025-504`.
5. `features/neural-voice/fiezel-diag-panel.js`: Versi build `m025-504`.
6. `features/ui/fiezel-tactile-clay.css`: Aturan tampilan `#topSettingsBtn` di profil dan isolasi View Transition `.bottomnav`.
7. `index.html`: Menempatkan `#topSettingsBtn` di dalam `#topGamifyCluster`.
8. `kurikulum.html`: Cache busting build `m025-504`.
9. `misi.html`: Cache busting build `m025-504`.
10. `sw.js`: Revisi `SW_REV` `m025-504`.
11. `tests/anti-flicker-uiux-invariant-test.js`: Berkas uji invarian UI/UX anti-kedipan baru.
12. `docs/handoffs/FIEZEL-M025504-UIUX-INVARIANT-GATE-HANDOFF.md`: Dokumen serah terima resmi.
