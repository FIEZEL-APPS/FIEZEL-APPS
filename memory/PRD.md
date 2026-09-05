# FIEZEL 2.0 — Full UI/UX Redesign

## Problem statement (asli)
Redesign UI/UX FIEZEL menyeluruh: cheerful + premium + modern, palet pastel dipertahankan (light yellow, pastel pink, cream, mint, lilac, maroon), mobile-first PWA, navigasi sederhana, CTA jelas, feedback benar/salah natural. Revisi user: mock diterima; SEMUA maskot PAW tetap seperti sebelumnya; tambah panel Online & Teman yang mudah dilihat; fitur tambah teman lewat ID; tombol gabung kelas dengan kode guru.

## Arsitektur
- Static PWA di root repo (index.html, app.js, style.css, features/*), preview `tools/preview-server.mjs` :3000.
- Backend: Cloudflare Worker `workers/api` (D1). Sosial: `route-social.js`.

## Yang sudah diimplementasikan (Juni 2026, build m025-258)
- `fiezel-2.css` (lapisan redesign, dimuat terakhir + masuk cache SW): token radius/shadow, tipografi Jakarta (serif dihapus dari display), tombol pill tactile (sun 3D edge, CTA utama ink), bottom nav pill dengan tab aktif kuning, kartu Hari Ini gradasi kuning + eyebrow maroon, skill hub pastel per skill (pink/mint/lilac/peach/kuning/sky), tabs segmented, opsi kuis berhuruf A–D dengan state benar/salah 3D, feedback tinted, form input membulat.
- Panel **Online & Teman** di Home (`socialHomeBody`, data-testid `home-online-panel`): avatar teman + status online, tombol **Tambah teman** (`openAddFriendModal`) dan **Gabung kelas** (`openJoinClassModal`), tautan Lihat semua. Selalu tampil (juga saat offline/flag off).
- Tab Teman: kartu "Tambah teman lewat ID" (input @handle → `POST /api/social/friends/add`), kartu "Gabung kelas dengan kode guru", daftar teman, kode undangan lama dipindah ke `<details>` "Cara lain".
- Worker: route baru `POST /api/social/friends/add` {handle} (dua arah, idempoten, anti-oracle), schema.js size, client `api.friendAdd`.
- Gabung kelas: kode disimpan ke `fiezel-onboarding-v1.classCode` (jalur yang sama dengan onboarding), memicu `FiezelLearnerFlow.pushToClass`, bisa diganti/keluar.
- i18n: kunci `social2.*` id + th.
- Mock design HTML statis di `/app/mockups/` (referensi arah desain).
- Gate lokal hijau: pwa-release-coherence, install-health, boot-order, lucide-icon-coverage, th-coverage, social-frontend, social-api-contract.

- Jalur Grammar bernode (`grammar()`): ringkasan ring X/N di atas, node dot + kartu lesson, node aktif berbingkai kuning dengan progress bar + CTA `grammar-path-continue`, lesson selesai bertanda ✓, terkunci redup.
- Progres: `cefrRoadmapMarkup` → kartu level gelap (`progress-level-card`, % menuju level berikut dari lesson grammar yang tembus ambang, track A1–C2, streak); `weeklyActivityChartMarkup` → "Minggu ini" (`progress-week-card`) dari data nyata `skillTimeline()` (kotak per hari, hari ini putus-putus). Kunci i18n `progress2.*` id+th.

## Backlog
- P1: layar hasil sesi ala mock (skor besar, mastery naik, langkah berikutnya).
- P1: desktop layout sidebar (mock d1–d3) untuk ≥1024px.
- P2: deploy worker (`wrangler deploy`) supaya endpoint friends/add aktif di produksi.
