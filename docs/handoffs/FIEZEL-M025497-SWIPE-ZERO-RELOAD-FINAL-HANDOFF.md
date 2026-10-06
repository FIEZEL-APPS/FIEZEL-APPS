# FIEZEL m025-497 — Investigasi & Perbaikan Tuntas "Swipe Back Splash & Freeze 3 Detik" (HANDOFF)

## Keluhan Pengguna
> "saat melakukan swipe back masih memunculkan background splash, dan jeda atau stuck sekitar kurang lebih 3 detik"

## Akar Masalah Teknis
1. **Kebocoran Canvas/DOM Root Gelap (#1B1418)**:
   - `index.html` inline critical CSS sebelumnya menetapkan `html.fz-booting, html.fz-booting body { background: #1B1418 }`.
   - Saat OS / WebKit / Chromium melakukan predictive back / overscroll gesture, canvas di balik WebView merender background root gelap tersebut.
2. **Riwayat Terkuras Keluar Dokumen (Cold Reboot 3.56 detik)**:
   - Pada saat tumpukan back-nav kosong (`!stack.length` di Home), `handlePop()` sebelumnya melepas penanda (`holding = false`) tanpa memasangnya kembali.
   - Gestur swipe-back kedua di Home melempar WebView ke entri di luar dokumen (`about:blank`), memicu `beforeunload` dan reload penuh dokumen `index.html`.
   - Booting ulang memicu timer minimum splash `VISIBLE_MS = 3560` (~3.5 detik freeze visual).

## Solusi yang Diterapkan
1. **Karantina Total Latar Gelap (Zero Dark Bleed)**:
   - Mengubah `html.fz-booting, html.fz-booting body { background: #FBF7F3 }` pada inline critical CSS `index.html`.
   - Mengubah fallback recovery dialog di `index.html` menjadi tema terang `#FBF7F3` / `#FFFFFF`.
   - Menyesuaikan `tests/splash-first-paint-test.js` untuk mengunci `#FBF7F3`.
2. **Kunci Riwayat Anti-Reload (Zero-Reload Invariant)**:
   - Pada `features/ui/fiezel-back-nav.js` fungsi `handlePop()`: saat `!stack.length`, panggil `notifyExit()` (toast "Tekan kembali sekali lagi...") dan panggil `holdMarker()`.
   - Penanda selalu dipasang ulang (`holding = true`), mencegah peramban keluar ke `about:blank` atau me-reload halaman dari Home.
   - Menyesuaikan asersi `tests/back-nav-test.js` untuk mengunci invarian anti-reload `holdsMarker() === true`.
3. **Audit Empiris Headless Playwright**:
   - `tools/dev/probe-swipe-zero-reload-audit.mjs` memvalidasi:
     - 0 dark bleed (canvas background #FBF7F3).
     - 0 beforeunload events / 0 reloads saat 5x swipe back beruntun di Home.
     - 0 kemunculan ulang `#fiezelBootSplash`.
     - Penutupan bertahap modal dan tab navigasi.
4. **Sinkronisasi 6 Titik Build Arbiter**:
   - Bump versi build m025-496 -> m025-497 pada `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`.
   - `node tools/bump-build.mjs --check` -> `Selaras`.

## Status Mutu
- `tests/pastel-field-contrast-test.js` PASS
- `tests/boot-order-test.js` PASS
- `tests/gate-registry-test.js` PASS
- `tests/th-ui-leak-test.js` PASS
- `tests/splash-first-paint-test.js` PASS
- `tests/back-nav-test.js` PASS
- `tests/regression-test.js` PASS
