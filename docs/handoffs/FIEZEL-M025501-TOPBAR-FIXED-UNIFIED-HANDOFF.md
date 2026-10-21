# FIEZEL m025-501 Topbar Fixed + Unified Dimensions Handoff

- Build: `m025-501`, branch `feat/m025-501-unify-topbar-jitter-fix`

## Temuan
- `header.topbar` memakai `position: sticky` di dalam `main.app` (jitter saat scroll), sedangkan `.bottomnav` `fixed` (diam). Banyak aturan bertabrakan di style.css / fiezel-tactile-clay.css / mobile-edge-fit.css / fiezel-vivid.css sehingga tinggi beda antar panel.

## Perubahan
- `features/ui/fiezel-tactile-clay.css`: blok otoritas akhir: topbar `fixed`, tinggi 56px + safe-area identik semua panel, `view-transition-name: none`; `main.app` diberi `padding-top` setara agar konten tidak tertutup; disembunyikan pada lesson/teacher/auth/sesi SL.
- Bump build via arbiter (sw.js, core-config.js, diag-panel, kurikulum.html, misi.html, BUILD-VERSION.json).

## Bukti empiris (Playwright headless, `tools/dev/probe-tb2.mjs`)
home/latihan/classroom/progress/online/game: topbar `fixed`, h=56, w=390, main.app padding-top=68px — identik di semua panel.

## Gerbang lokal
id-golden, th-ui-leak, curriculum-cache-version, gate-registry, topbar-logo-contrast, splash-choreography: PASS.

## Utang
- Kartu ganda di KelasKu belum dibuktikan terpisah; perlu verifikasi visual di perangkat.
