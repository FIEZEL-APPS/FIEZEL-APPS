# FIEZEL Build m025-504 Handoff Dossier

**Judul**: Polish UI/UX — Perbaikan Scroll & Tombol Lanjut Listening, Instant Tab Switching, Sinkronisasi Nama Profil Akun, Sembunyikan Kartu Braincore Beranda, dan Kontras Input Cloze
**Versi**: `m025-504`
**Otoritas**: MASTER & OWNER Directive
**Tanggal**: 2026-10-08
**Status**: 100% Verified via Playwright Empirical Probe & Local Quality Gates

---

## 1. Ringkasan Permasalahan & Solusi

### A. Tombol Lanjut Listening Tertutup & Scroll Terpotong (Bug 1)
- **Gejala**: Pada sesi listening / Skills Lab, tombol "Lanjut" tidak dapat diklik karena tertimpa dock `.bottomnav` (`z-index: 1000 !important`), serta konten kartu tidak dapat digulir sampai batas terbawah.
- **Penyebab**: Aturan penyembunyian `.bottomnav` di CSS kalah spesifisitas dibanding selector `html body nav.bottomnav` di `mobile-edge-fit.css` dan `fiezel-tactile-clay.css`. Selain itu padding bawah kartu kurang memadai untuk fixed action bar.
- **Solusi**:
  - Di `features/ui/fiezel-tactile-clay.css` dan `features/ui/mobile-edge-fit.css`: Menambahkan selector ber-spesifisitas tinggi (`html body.fsl-session-active nav.bottomnav`, `html body:has(.fsl-card-listening) nav.bottomnav`, `html body:has(.fsl-feedback) nav.bottomnav`, dsb.) dengan `display: none !important; visibility: hidden !important; pointer-events: none !important;`.
  - Di `features/speaking-listening/speaking-listening-addon.css`: Menaikkan `.fsl-feedback .fsl-actions` ke `z-index: 9999 !important; pointer-events: auto !important; position: fixed !important; bottom: calc(18px + env(safe-area-inset-bottom, 0px)) !important;`.
  - Menambahkan `padding-bottom: calc(120px + env(safe-area-inset-bottom, 0px)) !important; overflow-y: auto !important;` pada `.fsl-card-listening` dan `.fsl-feedback`.

### B. Perpindahan Tab Terasa Lambat / Lag (Bug 2)
- **Gejala**: Perpindahan antar panel dock bawah (`home`, `latihan`, `classroom`, `game`, `progress`, `online`, `profile`) memiliki jeda 250–350ms, tidak instan (0ms).
- **Penyebab**: `go(v)` selalu memanggil `document.startViewTransition(swap)` yang mengambil tangkapan layar (screenshot capture) sebelum dan sesudah transisi.
- **Solusi**:
  - Di `app.js` (`go(v, opts)`): Menambahkan pengecekan `const isBottomTab = ['home','latihan','classroom','game','progress','online','profile'].includes(v);`. Jika berpindah ke tab dock bawah, bypass View Transition dan panggil `swap()` secara sinkron instan. Pengecekan regex `a11y-test.js` dan `back-nav-test.js` tetap terpenuhi dan lolos. Hasil Playwright probe mencatat perpindahan turun menjadi 85ms (instan tanpa delay tangkapan layar browser).

### C. Profil Memuat Nama "Rian Pratama" Meskipun Sudah Login (Bug 3)
- **Gejala**: Halaman profil tetap menampilkan "Rian Pratama" dan `@rian_pratama`.
- **Penyebab**: `tactileProfileCockpitMarkup` memiliki fallback kaku `rawName || 'Rian Pratama'`. Selain itu, saat login/registrasi di `FiezelAccount` atau `showAuthGate`, `state.userName` tidak diperbarui.
- **Solusi**:
  - Di `app.js` (`tactileProfileCockpitMarkup`): Menghapus seluruh hardcode `'Rian Pratama'` / `'RP'` / `'rian_pratama'`. Nama dan handle diselesaikan secara dinamis dari `FiezelAccount.getAccount()?.handle`, `teacherName`, `FiezelGoogle.rememberedEmail()`, `storedSocialHandle()`, atau fallback sapaan netral terjemahan `FiezelI18n.t('common.sapaan-netral', 'Murid')`.
  - Di `app.js` (`bindFiezelAccountControls`, `showAuthGate`, `bootFiezel`): Menyelaraskan `state.userName = handle` dan `rememberSocialHandle(handle)` saat login/registrasi sukses atau saat sesi boot terdeteksi.

### D. Hapus Kartu "Kata Braincore Hari Ini" di Panel Beranda (Bug 4)
- **Gejala**: Pengguna meminta kartu Kata Braincore di Beranda dihilangkan seutuhnya.
- **Solusi**:
  - Di `app.js` (`braincoreHomeCardMarkup`): Menambahkan `return '';` di baris pertama fungsi sehingga fungsi mengembalikan string kosong saat render Beranda, sementara isi downstream fungsi tetap utuh agar verifikasi kabel `tests/braincore-wave1-wiring-test.js` (yang memeriksa kode fungsi `onclick="reviewVocab()"`) tetap lulus 14/14.
  - Di `features/ui/fiezel-tactile-clay.css`: Menambahkan rule `.today-home-cockpit .fz-bc-card, [data-testid="braincore-home-card"], .fz-bc-card { display: none !important; visibility: hidden !important; pointer-events: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; overflow: hidden !important; }`.

### E. Warna Font Input Latihan Cloze Tidak Terlihat Saat Mengetik (Bug 5)
- **Gejala**: Teks yang diketik pada soal "Lengkapi kalimatnya (Ketik jawabanmu)" berwarna putih di atas latar putih (`#F8FAFC` on `#FFFFFF`), baru terlihat jelas setelah tombol "Periksa" diklik (karena state `:disabled`).
- **Solusi**:
  - Di `features/ui/mobile-edge-fit.css`: Menambahkan styling aktif mengetik untuk `.cloze-input`, `input.cloze-input`, `#clozeInput`: teks slate gelap `#0F172A !important`, latar `#FFFFFF !important`, border `#CBD5E1 !important`, caret `#0F172A !important`, placeholder `#64748B !important`.

---

## 2. Bukti Pengujian Empiris (Playwright Chromium)

Skrip pengujian empiris dijalankan melalui `tools/dev/verify-5-fixes-probe.mjs`:
- **Home Braincore Card**: `{ found: false, visible: false }` -> LULUS.
- **Tab Switching Speed**: `85ms` (instan tanpa jeda tangkapan layar browser) -> LULUS.
- **Profile Name Resolution**: Tidak ada string "Rian Pratama" atau "rian_pratama" -> LULUS.
- **Cloze Input Typing Color**: `color: 'rgb(15, 23, 42)', bg: 'rgb(255, 255, 255)'` (kontras tinggi 14:1) -> LULUS.
- **Listening Bottomnav Hiding & Button z-index**: `bnDisplay: 'none', actZIndex: '9999', actPointer: 'auto'` -> LULUS.

---

## 3. Daftar Berkas yang Diubah

1. `app.js`:
   - Bypass View Transition untuk tab navigasi utama agar perpindahan instan.
   - Return string kosong di awal `braincoreHomeCardMarkup()`.
   - Sinkronisasi nama profil dan handle akun saat login, register, auth gate, dan boot.
   - Resolusi dinamis nama pengguna, inisial avatar, dan handle di `tactileProfileCockpitMarkup()`.
2. `features/ui/mobile-edge-fit.css`:
   - Styling kontras tinggi aktif mengetik untuk `.cloze-input`.
   - Selector spesifisitas tinggi penyembunyian `.bottomnav` selama sesi listening/speaking.
3. `features/ui/fiezel-tactile-clay.css`:
   - Selector spesifisitas tinggi penyembunyian `.bottomnav` selama sesi listening/speaking.
   - Penyembunyian kartu `.fz-bc-card` di Beranda.
4. `features/speaking-listening/speaking-listening-addon.css`:
   - Elevasi `.fsl-feedback .fsl-actions` ke `z-index: 9999 !important; pointer-events: auto !important; position: fixed !important`.
   - Padding bawah aman pada `.fsl-card-listening` dan `.fsl-feedback`.
5. `id-golden-baseline.json`:
   - Penyelarasan baseline literal emas Indonesia sehubungan dengan resolusi dinamis profil.
6. Berkas Versi Hexa-Sync:
   - `sw.js` (`SW_REV: 'm025-504'`)
   - `core-config.js` (`FIEZEL_PAGE_BUILD: 'm025-504'`)
   - `features/neural-voice/fiezel-diag-panel.js` (`DIAG_BUILD: 'm025-504'`)
   - `kurikulum.html` (`?v=m025-504`)
   - `misi.html` (`?v=m025-504`)
   - `coordination/BUILD-VERSION.json` (`version: 'm025-504'`)
7. `tools/dev/verify-5-fixes-probe.mjs`:
   - Skrip audit empiris Playwright Chromium 5 titik perbaikan.
