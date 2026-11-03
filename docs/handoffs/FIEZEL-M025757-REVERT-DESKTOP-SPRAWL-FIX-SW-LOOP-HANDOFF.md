# FIEZEL m025-757 Handoff: Emergency Hotfix Revert Desktop Layout Sprawl, Deduplicate SW Precache Assets & Eliminate Update Loop

## Authority & Mandate
- **Authority**: OWNER & MASTER Emergency Hotfix Mandate
- **Status**: PRODUCTION READY (m025-757)
- **Scope**: Revert desktop layout sprawl & giant wordmark bug, fix `Cache.addAll()` duplicate request exception in Service Worker, fix update banner reload loop.

---

## 1. Root Cause Diagnosis & Executive Summary
Pada rilis `m025-756` (PR #830), terjadi 2 regresi fatal pada antarmuka desktop dan siklus rilis Service Worker:

1. **Regresi Tampilan Desktop (Giant FIEZEL Wordmark & Layout Breakage)**:
   - PR #830 menambahkan elemen `#fzUniversalLayout`, `#fzDesktopSidebar`, dan `#fzDesktopCompanion` langsung ke dalam `index.html`.
   - Di dalam sidebar terdapat `<svg class="fiezel-wordmark">`. Karena `index.html` critical CSS mendefinisikan `.fiezel-wordmark { width: 100%; display: block; }`, ketika browser memuat dokumen baru dengan `style.css` lama atau saat rendering desktop, logo SVG FIEZEL membesar hingga 100% lebar viewport (~1920px), merusak seluruh tata letak halaman utama (*Home*).
   - Solusi: Menghapus `#fzUniversalLayout`, `#fzDesktopSidebar`, dan `#fzDesktopCompanion` dari `index.html`, mengembalikan `<main class="app">` sebagai wadah langsung, menghapus 1.383 baris tata letak eksperimental dari `style.css`, mengembalikan `app.js` (menghapus `syncDesktopLayout`), dan mengembalikan `features/ui/mobile-edge-fit.css` serta `features/onboarding/fiezel-onboarding.js` ke baseline stabil.

2. **Loop Tombol Pembaruan ("Perbarui sekarang") & Kegagalan Service Worker**:
   - Di dalam `sw.js`, entri `./assets/brand/paw-mochi-idle.svg` tidak sengaja tercantum dua kali di array `ASSETS` (baris 100 dan baris 163).
   - Menurut spesifikasi W3C Cache API, pemanggilan `c.addAll(requests)` akan melempar `InvalidStateError: duplicate requests` jika terdapat URL yang duplikat dalam array permintaan.
   - Akibat error tersebut, instalasi Service Worker baru (`m025-756`) langsung gagal dan beralih ke state `redundant`. Peramban tetap memakai Service Worker versi lama (`m025-753`).
   - Setiap kali murid menekan tombol "Perbarui sekarang", `sw.js` mencoba menginstal ulang, gagal lagi pada `addAll()`, beralih ke `redundant`, memuat ulang halaman dengan cangkang cache lama `m025-753`, dan kembali memunculkan kartu pembaruan secara tanpa henti (*infinite loop*).
   - Solusi:
     a) Menghapus entri duplikat `./assets/brand/paw-mochi-idle.svg` dari `ASSETS` di `sw.js`.
     b) Memperkuat `shellRequests()` dengan `Array.from(new Set(ASSETS))` agar kebal permanen dari duplikasi di masa depan.
     c) Memperbaiki penanganan `w.state === 'redundant'` di `fiezel-update-prompt.js` agar memanggil `finishReload(true)` guna membersihkan shell usang saat murid meminta update darurat.

---

## 2. Verification & Empirical Audit
- **Service Worker Installation Test**: Terbukti berhasil `ok: true, state: 'installed'` via headless Playwright probe (sebelumnya `InvalidStateError: duplicate requests`).
- **Visual Inspection Desktop & Mobile**:
  - `hotfix-home-desktop.png`: Tata letak desktop kembali rapi, bersih, tanpa logo raksasa.
  - `hotfix-home-mobile.png`: Tampilan mobile konsisten dan pixel-perfect.
- **id-golden-snapshot-test.js**: 100% PASS (Baseline emas Indonesia utuh).
- **th-ui-leak-test.js**: 100% PASS (Nol kebocoran naskah).
- **curriculum-cache-version-test.js**: 33 penegasan PASS (build m025-757).
- **gate-registry-test.js**: 10/10 PASS.
- **app-interaction-policy-test.js**: 34/34 PASS.
- **a11y-test.js**: PASS.
- **deploy-site-gate-test.js**: 33/33 PASS.
- **A10 Regression Watcher**: PASS (errors=0).
- **bump-build.mjs --check**: Selaras pada seluruh 6 titik rilis (`m025-757`).

---

## 3. Berkas yang Disentuh
- `sw.js`: Menghapus duplikasi asset di `ASSETS`, menambahkan deduplikasi set defensif di `shellRequests()`, bump ke `m025-757`.
- `index.html`: Menghapus `#fzUniversalLayout`, `#fzDesktopSidebar`, dan `#fzDesktopCompanion`.
- `style.css`: Menghapus blok 3-column layout sprawl (1.383 baris) di akhir berkas.
- `app.js`: Menghapus fungsi `syncDesktopLayout` dan panggilannya di `renderInner()`.
- `features/ui/fiezel-update-prompt.js`: Menjamin penghapusan shell usang bila worker redundant saat murid klik "Perbarui sekarang".
- `features/ui/mobile-edge-fit.css`: Revert layout overrides ke baseline stabil.
- `features/onboarding/fiezel-onboarding.js`: Revert onboarding overrides ke baseline stabil.
- `coordination/BUILD-VERSION.json`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`: Bump versi selaras ke `m025-757`.
- `id-golden-baseline.json`: Regenerasi baseline emas.
- `docs/handoffs/FIEZEL-M025757-REVERT-DESKTOP-SPRAWL-FIX-SW-LOOP-HANDOFF.md`: Berkas serah terima resmi ini.
