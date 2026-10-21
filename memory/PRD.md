# FIEZEL Character Universe — PR #398 Mascot Review + Motion Preview

## Original request (Indonesian)
Cek PR #398 (repo FIEZEL-APPS), analisa gambar mascot (Nusa & Mira) agar anatomi/detail
konsisten dengan reference sheet (ukuran badan, tangan, rambut, topi, logo, dll). Perbaiki
anomali secara maksimal, jaga gaya flat design / vector / 2D. Lalu buat animasi motion
menggunakan **Remotion**, dan berikan preview. Nusa (monyet) harus lebih kecil dari Mira (manusia).

## Context
- `/app` IS the live FIEZEL-APPS repo (served statically on :3000 via `tools/preview-server.mjs`).
- PR #398 = branch `agent/a3-m02514-cache-integrity` (SHA a2d567b). Adds `assets/characters/`
  (Nusa monkey, Mira explorer, team, scenes) as PNG/WebP/auto-traced SVG + reference sheets.

## Anomaly audit (vs reference sheets)
- Nusa: consistent across all poses — OK.
- Mira: (1) all `head-*` close-ups were MISSING the pith hat; (2) `full-thinking` had a
  malformed hand holding a redundant dangling compass.

## What was done (2026-06)
- Fixed 5 Mira assets via targeted Gemini image-edit (hat added to head-happy/explain/proud/thinking;
  compass+hand fixed on full-thinking), background flood-filled back to transparent PNG.
  Fixed files copied over originals in `/app/assets/characters/mira/png/`; originals kept in
  `/app/assets/characters/_orig/`.
- Remotion project at `/app/remotion` (src/Root.jsx, Scene.jsx). Rendered 7 clips to
  `/app/assets/motion/` in **MP4 (H.264) + WebM (VP8)** + poster JPEGs:
  hero, nusa-wave, nusa-celebrate, nusa-sleep, mira-cheer, mira-wave, team-walk.
  Hero composites Nusa smaller than Mira (height 48 vs 72) for realistic scale.
- Showcase page: `/app/character-preview.html` — hero, Remotion motion reel (codec auto-detect
  mp4→webm fallback + posters), before/after anomaly sliders, expression gallery, consistency checklist.

## Preview
Open the platform Preview button, then append `/character-preview.html` to the URL.

## Re-render motion
`cd /app/remotion && node_modules/.bin/remotion render src/index.js <CompId> /app/assets/motion/<name>.<mp4|webm>`

## Update 2026-06 — hair bun consistency + blink/mouth + full Nusa pose set

### Anomaly #6: Mira's hair bun (sanggul) — reported by user "letaknya tidak konsisten"
Audit vs `_reference/mira-sheet.jpg`: bun MISSING in `full-explain` + `full-wave`, and its
position/size drifted up to ~17% of head width across the other poses.
Fix = `tools/mira-bun-fix.py`:
- canonical bun sprite extracted once to `assets/characters/mira/png/parts/bun.png`
  (taken from `full-neutral`, which is pixel-identical to the reference sheet),
- blush-cheek pair used as the rigid head landmark (works on closed-eye poses too),
- old/misplaced bun art erased (any brown/green pixel outside the hat crown, incl. AA halo),
- sprite re-stamped BEHIND the character layer so the hat always overlaps it,
- canvas padded where needed; `manifest.json` w/h + png@1x + webp regenerated.
Applied to 13 poses (all mira full-*/head-* + team walking/shoulder-wave/highfive/hat-peek).
`team/teaching` keeps its original bun (cheek landmark undetectable, looks correct).

### Blink + mouth motion
`tools/face-rig.py` detects the pupil pair + mouth box per pose, writes
`assets/characters/face-rig.json`, and bakes a closed-eye variant to
`<char>/png/blink/<pose>.png` (skin-filled eyeball + drawn lid arc, glasses/fur preserved).
`remotion/src/Scene.jsx`: 3-frame blink every 2.7s (occasional double blink, per-character
seed offset) + a feathered mouth patch that re-scales subtly (breathing / soft talking).
Poses with closed/squinting eyes by design have no blink asset (celebrate, sleep, cheer,
head-proud, highfive).

### New Nusa clips
`NusaOops` (startled hop), `NusaCurious` (head-shot, centre anchor, sway + "!" bubbles),
`NusaThinking` ("?" bubbles). Motion Lab is now 10 clips; `tools/render-motion.sh` renders
mp4 + webm + poster for all of them.

### Preview page
`character-preview.html`: 10-clip reel, new "Mira · Sanggul (Hair Bun)" before/after slider,
hero fixed so Nusa (300px) is smaller than Mira (430px), copy updated, data-testids added.
Verified by testing agent (iteration_2.json): all clips play, bun present in all 13 poses,
scale rule holds, no console errors / broken images / overflow.

## Backlog / next
- P1: Interactive @remotion/player embed for scrubbing + pose toggling.
- P2: Hat band inconsistency — `head-*` and `team/*` poses show a green ribbon band on the
  pith hat, `full-*` poses and the reference sheet do not. Needs a decision before fixing.
- P2: No blink asset for the `*-thinking` / `head-curious` poses (pupil detection ambiguous
  with the eyebrows); would need hand-placed eye boxes.
- P2: Commit fixed assets + motion back to PR branch (via "Save to GitHub").

---

# Catatan sesi platform Emergent (dipindah dari PRD lama /app, 2026-06)

## Problem statement asli
"https://github.com/FIEZEL-APPS/FIEZEL-APPS — analisa braincore enginenya, apa yang tidak
berfungsi, apa yang perlu ditingkatkan dan lain-lain" → lalu: "P0: tutup IDOR + perbaiki B7.
P1: paritas BKT klien-server, CI backend tests, hapus dead code. P2: refactor N+1" → lalu:
"perbaiki semua yang perlu diperbaiki, tingkatkan semua yang perlu ditingkatkan".

## Arsitektur
- `/app` = clone repo FIEZEL-APPS. `/app/backend` (FastAPI + Motor/MongoDB) **disinkronkan ke
  `origin/main`** pada 2026-06 (sebelumnya tertinggal ~2.300 commit) lalu dipatch.
- Auth: satu pintu tiket KelasKu (`POST /api/auth/kelasku`, HMAC `CURRICULUM_TICKET_KEY`).
- Env lokal `/app/backend/.env` (tidak di-commit): MONGO_URL, DB_NAME, JWT_SECRET,
  CURRICULUM_TICKET_KEY, CORS_ORIGINS. Preview: https://nujum-prophecy.preview.emergentagent.com/api/health
- Frontend repo = halaman statis (kurikulum.html, misi.html, features/*) — tidak disentuh.

## Yang sudah dikerjakan
- 2026-09-29: audit statis + probe (laporan `/app/memory/braincore-analysis-2026-09.md`).
- 2026-06 (sesi lalu): patch drop-in di salinan lokal (kini dihapus, digantikan patch langsung).
- 2026-06 (sesi ini) — diterapkan di `/app/backend`, rincian di `/app/memory/braincore-fixes/PATCH-NOTES.md`:
  - P0 IDOR: `access.py` baru; guard di SEMUA endpoint guru/murid (coverage, recommendations,
    groups, lesson-plan, tp-detail, passport, evidence-graph, student-state, classes/{id}, roster,
    assessments create/list/get/analytics/from-recommendation, blueprints, learning events,
    sessions). Bootstrap tidak lagi mencuri kelas demo guru lain (kelas demo per guru).
  - P0 B7: note GAP = proporsi murid nyata.
  - P1: dead code dihapus; copy murid baru selaras IRT; `bkt_step()` + `test_client_parity`
    (bentuk rumus identik dengan klien; konstanta server dipertahankan, disetel dari data).
  - P1 CI: `.github/workflows/backend-tests.yml` (unit → probe → uvicorn+Mongo → E2E IDOR →
    kasus tepi → regresi).
  - P2: N+1 → batch `$in` di coverage/recommendations/tp-detail/passport/due_reviews/
    misconceptions/next_best_item/list_assessments/analytics/build_mission; `POOL_CAP` eksplisit;
    fail-fast MONGO_URL & DB_NAME; `p_mastery_decayed` tidak bocor ke DB (sync_state, migrasi).
  - Uji: unit 61/61, probe 15/15, pytest `test_idor_e2e` 7, `test_edge_cases` 15 (testing agent),
    `test_fiezel_backend` 23 pass/1 skip. Laporan: `/app/test_reports/iteration_3.json`.

## Backlog
- P1 (keputusan owner): `POST /api/learning/sync-state` mempercayai `p_mastery` klien → murid
  bisa menyetel dirinya MASTERED. Opsi: hitung ulang BKT dari delta attempts/correct di server.
- P2: satukan gerbang mastery klien (0,95 & n≥5) vs server (0,80 & 3 benar) bila owner ingin satu angka.
- P2: `mastery_pct` di coverage = rerata posterior (bukan proporsi murid) — pertimbangkan rename
  `avg_posterior_pct` di API + konsol guru (saran testing agent, bukan bug).
- Ops: jalankan workflow di GitHub setelah "Save to GitHub"; pasang `.env` produksi sesuai
  `backend/.env.example` (DB_NAME kini wajib).

---
## Audit UI/UX 2026-09-29 (sesi Emergent) — m025-384
Permintaan: audit & tingkatkan UI/UX FIEZEL; peningkatan sedang, identitas dipertahankan, warna lebih eye-catching, mobile + desktop.
Workspace disinkronkan dari GitHub main terbaru (rsync) sebelum mulai.

### Website landing (website/)
- `website/vivid.css` (dimuat setelah style.css, id + th): hero sinar solar, judul besar + sorotan, chip kepercayaan, kartu "stiker" berwarna per skill (aksen dari palet PAW), statistik berwarna, ticker solar, FAQ & CTA akhir solar penuh, ritme seksi dipadatkan, reveal lebih cepat.
- Perbaikan: sub-judul hero terpotong di mobile, lubang grid fitur (KelasKu sendirian), jarak kosong antar seksi.
- UX: dok CTA melayang di mobile (site.js) setelah hero lewat, sembunyi di CTA akhir.

### PWA (akar)
- `features/ui/fiezel-vivid.css` (dimuat terakhir, di-precache sw.js): warna per skill pada kartu peluncur & latihan singkat, panah pojok (bukan melayang), kisi seragam, judul sejajar kartu, aurora latar, CTA hero berkilau, hierarki satu CTA utama, bottom nav melayang di desktop.
- BUG kritis: header global menutupi tombol Keluar + progres kuis (mobile-edge-fit memaksa display:flex) → dipulihkan.
- Kata target kuis jatuh ke Times (font tak dimuat) → font display besar kuning; opsi was-tried rose, correct teal.
- Profil kosong total saat fitur online mati → kartu keadaan kosong ramah + CTA "Lanjut latihan" (i18n id+th: social.segera-body/cta).
- Copy motivasi bernada menakut-nakuti (home.motivasi-2) diganti positif (id+th). Baseline emas id diregenerasi.
- Build dinaikkan m025-383 → m025-384 via tools/bump-build.mjs.

### Backlog
- P1: tur coach-mark menutupi kartu Rencana belajar di 390px.
- P1: pengatur ukuran teks di dalam aplikasi (utang WCAG zoom-lock).
- P2: chip "Coba Bahasa Jepang" tanpa ikon; toast "Hampir!" menimpa soal.

## Audit warna KelasKu untuk Guru (2026-09-29) — m025-385
Lingkup: HANYA warna teks & latar (arahan: latar bersih cerah, tanpa redesign).
- Akar masalah: mobile-edge-fit.css memaksa tema gelap murid global (:root --panel/--text !important, body #0A0A0E, h1–h6 #fff) → bocor ke Ruang Guru.
- Perbaikan di akhir features/teacher/teacher-shell.css (scope body.fz-teacher-mode): latar #F6F4EE, kartu putih, sidebar & nav bawah mobile putih, kartu "ink" jadi sage lembut, judul tinta gelap, status chip/pill/avatar dipergelap ≥4,5:1, tombol ghost-light terlihat, bottom nav murid disembunyikan (niat asli CSS guru).
- Hasil audit otomatis: 0 teks < 4,5:1 di 10 tab desktop + mobile (sebelumnya puluhan elemen gelap/tak terbaca).

## Chip Kursus Jepang (2026-09-29) — m025-386
- Ikon graduation-cap (tidak ada di set fz-i → kosong) diganti lencana あ merah-sakura; saat kursus Jepang aktif jadi lencana A biru (kembali ke Inggris). Kartu berwarna sendiri + panah; data-testid home-target-lang-chip.

## Hero Feature Baru: BUG × Sarang (2026-09-30) — strategi + prototype
- Keputusan OWNER: NUJUM direframe menjadi "BUG" — miskonsepsi (taksonomi + optionMisconceptions) jadi makhluk bernama dengan HP (BKT) yang pulih mengikuti kurva lupa; PAW = pemburu. Home "Hari Ini" diganti adegan "Sarang" (panel tinta di kertas hangat, 1 CTA). Antagonisnya adalah LUPA, bukan mesin.
- Prototype standalone: `mockups/sarang-prototype.html` (Vanilla JS/CSS/Canvas/WebAudio, tanpa dependensi, 360px). Berisi Sarang (3 bug dummy + ring HP + PAW + kata hari ini), Beat Prediksi (mata menyala + counter %), 3 soal dummy, Bug Pecah (partikel Canvas + crack), Digigit (shake + lunge + vibrate + ejekan berbasis distraktor), hasil buruan, HP diperbarui saat kembali.
- Backlog berurutan: (P0) integrasi ke engine NUJUM nyata + template ejekan per miskonsepsi; (P1) kartu share Canvas → Web Share API; (P1) "Bug kelas minggu ini" di KelasKu; (P2) Soal Sekelas harian (seed tanggal); (P2) Duel Bayangan via kode WA.

## Prototype v2 — game-feel (2026-09-30)
- `mockups/sarang-prototype.html` diperbarui: Beat Prediksi dengan aura denyut + "mengunci target… 73%!"; arena gelap-hangat; Crucible timer 8 s (panik <3 s: bar merah berkedip, vignette, detak jantung, vibrate); Umpan 2× (timer 5 s, damage/gems 2×, gigitan 2×); "PAW, bantu!" (jawaban + penjelasan tanpa roasting, tidak dihitung gigitan); pecahan kristal Canvas + ring kejut + flash emas + shake; digigit = red flash + shake + lunge + ejekan 1–2 kalimat; Sarang: whisper kecil, PAW melirik ke bug target (pupil), kedip, kuping, ekor; bug target berdenyut; Laporan Perburuan (stempel SEMPURNA/PEMBURU/BERTAHAN/DIGIGIT HABIS, akurasi, gems, daftar bug) + Bagikan ke WhatsApp (Canvas 1080×1350 → Web Share API, fallback unduh PNG).
- Workspace disinkronkan (merge) ke origin/main m025-387 — `features/nujum/` kini ada di workspace. Integrasi engine (Ledger/BKT/IRT) ke app.js belum dimulai; menunggu setelah game-feel disetujui.
