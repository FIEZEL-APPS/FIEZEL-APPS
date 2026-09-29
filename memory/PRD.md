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
  CURRICULUM_TICKET_KEY, CORS_ORIGINS. Preview: https://grammar-no-theory.preview.emergentagent.com/api/health
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
