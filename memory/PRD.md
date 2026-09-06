# PAW ARENA — FIEZEL-APPS (external repo task)

## Repo
- Clone: `/app/FIEZEL-APPS` (from https://github.com/FIEZEL-APPS/FIEZEL-APPS, branch `main`).
- Branch dibuat: `feature/paw-arena-m025-277` (1 commit). BELUM di-push (public clone, tanpa kredensial).
- Build dinaikkan +1 → **m025-277** di 4 tempat (core-config, sw.js, diag-panel, BUILD-VERSION.json).

## Problem statement (ringkas)
Rancang ulang fitur "duel" jadi **PAW ARENA**: satu ruang permainan tersendiri, 3 permainan
(termasuk Story Chain), solo lawan bot Braincore offline, nol server, dwibahasa id+th, kartu
aturan muncul SETIAP sesi, animasi/SFX pakai sistem yang ada, gerbang baru dibuktikan bisa MERAH.

## Keputusan (owner delegasikan ke agen)
1. Tiga permainan: Story Chain (owner) + Sinyal (beri-petunjuk & tebak) + Taruhan (bertaruh keyakinan).
2. Duel lama diganti; semangatnya diserap ke Taruhan; `?duel=KODE` tetap hidup.
3. Navigasi: opsi (a) — view `arena` sendiri, tanpa tab baru.
4. Kartu aturan: kartu penuh per-sesi + tombol `?` di tengah ronde.

## Sudah diimplementasi (2026-06, verified lokal)
- `features/brain/fiezel-arena-bot.js` — bot murni (lolos braincore-purity, brain-manifest, page-wiring).
- `features/learner-flow/fiezel-paw-arena.js` — engine sesi + kartu aturan per-sesi + help + `?duel=` compat.
- `features/i18n/copy-id-pawarena.js` + `copy-th-pawarena.js` — dwibahasa (th DRAFT AI); th-coverage & th-ui-leak PASS.
- `tests/paw-arena-rules-card-test.js` — gerbang DIBUKTIKAN merah (stub M1/M2); terdaftar di quality.yml; gate-registry PASS.
- `docs/handoffs/PAW-ARENA-HANDOFF.md`.

## Verifikasi lokal (Node 20 sandbox; CI pakai 22)
Hijau: paw-arena-rules-card, braincore-purity, brain-manifest, brain-config, brain-page-wiring,
th-coverage(186), th-bank-purity, th-ui-leak, locale-enum, install-health, pwa-release-coherence,
build-number-uniqueness, pwa-cache, regression, http-smoke, a11y, contrast, secret-scan,
coordination-guard, view-reachability, boot-order, ui-structure, splash-first-paint,
lucide-icon-coverage, pwa-startup, sw-nav-shell-first, update-prompt, gate-registry.
id-golden-snapshot: dibuktikan MERAH → baseline ditulis ulang → HIJAU.
Suite penuh 259 gerbang (~24mnt, butuh Python/Chromium/jaringan) hanya bisa dijalankan di CI.

## Backlog / DITUNDA (P0 berikutnya)
- P0: wiring `app.js` — `VALID_VIEWS += 'arena'`, cabang render view, kartu masuk di Home + Profil.
- P0: UI ronde Signal & Stakes (engine + keputusan bot sudah ada; renderer kartu/panel menyusul).
- P1: hapus `fiezel-duel.js` setelah arena penuh; coach-mark kali-pertama opsional (§3.3).
