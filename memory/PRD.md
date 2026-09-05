# FIEZEL 2.0 — Full UI/UX Redesign

## Problem statement (asli)
Redesign UI/UX FIEZEL menyeluruh: cheerful + premium + modern, pertahankan palet pastel (light yellow, pastel pink, cream, mint, lilac, maroon), PAW jadi bagian UX, mobile-first PWA, navigasi sederhana, CTA jelas, feedback benar/salah natural. User minta MOCK DESIGN dulu (belum coding) untuk dinilai.

## Status (Juni 2026)
- Repo: static PWA (index.html + app.js + style.css di root), preview server `tools/preview-server.mjs` port 3000. Working tree di-checkout dari origin/main.
- Mock design dibuat sebagai HTML statis TERPISAH di `/app/mockups/` (tidak menyentuh kode app):
  - Mobile 390px: 01 onboarding, 02 tes level, 03 hari ini, 04 latihan, 05 jalur grammar, 06 quiz benar, 07 quiz salah, 08 hasil, 09 progres, 10 kelas, 11 tanya PAW
  - Desktop 1440px: d1 home, d2 grammar+lesson, d3 quiz
  - Galeri: `/mockups/index.html`, screenshot `out-*.png`
- Arah desain mock: Fredoka (display) + Plus Jakarta Sans (body), tombol pill tactile (bayangan 3D tipis), 5-tab bottom nav pill, satu fokus/CTA di home, sheet feedback hijau/merah dengan PAW kontekstual, path grammar bernode, kartu level gelap (ink) sebagai aksen.

## Backlog
- P0: Tunggu penilaian user atas mock → revisi arah → implementasi ke style.css/index.html/app.js (tanpa rewrite arsitektur)
- P1: Thai locale di UI baru, PWA safe-area, motion purposeful (fiezel-motion)
