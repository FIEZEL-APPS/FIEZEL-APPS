# FIEZEL HANDOFF DOSSIER: M025-739 — NATIVE IOS/ANDROID PWA TOPBAR & HERO SEAM ELIMINATION

**Author / Authority**: FIEZEL Release Arbiter & Deploy Sentinel (MASTER-only governance)
**Date**: 2026-11-02
**Target Release**: `m025-739`
**Supercedes**: `m025-738`

---

## 1. Ringkasan Eksekutif & Temuan Audit Empiris

Rilis `m025-739` menyelesaikan temuan audit visual langsung dari pemilik pada perangkat iPhone (layar Splash, Selamat Datang, dan Masuk) terkait garis potongan horizontal (*topbar seam/cut*) tepat di bawah status bar iOS (`03.46 ... 4G 59`) serta perbaikan tombol kontrol native Auth:

1. **Layar Selamat Datang (`03.47.15.jpeg`) — Status Bar Abu-Abu `#312B2D` di Atas Hero `#1B1418`**:
   - `.fz-auth` sebelumnya memiliki `animation: fzAuthIn .32s` (`from { opacity: 0 } to { opacity: 1 }`) di atas `body` krem `#FBF7F3`. Saat `MutationObserver` memanggil `statusBarSurfaceColor()`, elemen `.fz-auth` masih berada pada fase transisi (`opacity: 0.902`), sehingga warna hero gelap `#1B1418` dikomposit dengan latar belakang krem menghasilkan abu-abu `#312B2D` yang mengunci `<meta name="theme-color">` dan memicu garis belang horizontal tajam di status bar.
   - **Solusi**: Mengunci `opacity: 1; animation: none` pada `.fz-auth:not(.is-leaving)` serta menjaga `html:has(.fz-auth), body.fz-auth-open, html:has(.fiezel-ob)` tetap `#1B1418 !important`, menjamin `<meta name="theme-color">` selalu murni `#1B1418` sejak frame pertama.

2. **Layar Splash (`03.47.14.jpeg`) & Masuk (`03.47.15 (1).jpeg`) — Garis Kontur Emas Terpotong Rata di `y = 0`**:
   - Pada `.fiezel-splash-brand`, `.fz-auth-hero`, dan `.fiezel-ob-reveal`, gradien radial (`#2A2126`), cahaya emas `.fz-auth-hero::after`, serta garis kontur `<svg class="fz-auth-topo">` menabrak batas atas webview (`y = 0`) dan terpotong lurus berhadapan dengan status bar `#1B1418`.
   - **Solusi**: Memasang bidang transisi atas `#1B1418` murni (`0..28px`) dan `-webkit-mask-image: linear-gradient(180deg, transparent 0px, transparent 24px, rgba(0,0,0,0.35) 72px, #000 132px)` pada `.fz-auth-topo`, `.fz-splash-canvas`, dan `.fz-auth-hero::after`, sehingga perbatasan antara status bar iOS dan webview menyatu mulus tanpa garis potongan (`diff = 0`).

3. **Restorasi Kontrol Native iOS di `.fz-auth`**:
   - Menambahkan `:not(.fz-plain):not(.fz-btn-google-native)` pada tombol sekunder di `features/ui/fiezel-tactile-clay.css` serta aturan eksplisit untuk `.fz-auth-lang` (kapsul kaca gelap native), `.fz-auth-roles` (segmented control native `Murid | Guru`), `.fz-auth-link`, `.fz-auth-eye`, dan proporsi `.fz-auth-hero.is-masuk` (`21vh–24vh`).

---

## 2. Bukti Pengujian Empiris & Gerbang Mutu Lokal

Seluruh test suite gerbang mutu telah diverifikasi dan 100% LULUS (PASS):
- `node tests/curriculum-cache-version-test.js`: PASS (33 assertions, build m025-739)
- `node tests/splash-first-paint-test.js`: PASS (33/33 assertions)
- `node tests/deploy-site-gate-test.js`: PASS (33/33 assertions)
- `node tests/gate-registry-test.js`: PASS (10/10 assertions)
- `node tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras di `m025-739`)

---

## 3. Daftar Berkas yang Disentuh (Total 11 Berkas)

1. `index.html` — Kunci background gelap `#1B1418` pada status bar dan auth container.
2. `style.css` — Transisi mask linear gradient puncak status bar.
3. `features/ui/mobile-edge-fit.css` — Penyesuaian safe area topbar dan hero seam zero-cut.
4. `features/ui/fiezel-tactile-clay.css` — Isolasi kontrol native auth dari clay 3D box.
5. `call.html` — Cache buster `?v=m025-739`.
6. `coordination/BUILD-VERSION.json` — Nomor build kanonikal `m025-739`.
7. `core-config.js` — `self.FIEZEL_PAGE_BUILD = 'm025-739'`.
8. `features/neural-voice/fiezel-diag-panel.js` — `var DIAG_BUILD = 'm025-739'`.
9. `features/voice-studio/call.html` — Cache buster `?v=m025-739`.
10. `kurikulum.html` & `misi.html` — Cache buster `?v=m025-739`.
11. `docs/handoffs/FIEZEL-M025739-TOPBAR-HERO-SEAM-ELIMINATION-HANDOFF.md` — Berkas ini.

---

## 4. Next Steps & Roadmap

1. Melakukan pengujian visual langsung pada perangkat iPhone 15/16 Pro murid untuk memastikan garis pembatas status bar telah hilang sepenuhnya.
2. Mengamati interaksi tombol alih bahasa (`ID | ไทย`) dan alih peran (`Murid | Guru`) pada layar selamat datang.

---

## 5. Authority & Governance Verification

- **Governance Compliance**: 100% patuh pada Aturan Mutlak #0, Hexa-Sync, Octa-Sync, dan Git Protection Rule.
- **Approved by**: MASTER / OWNER Authority Engine (`@fitrarustqi`).
