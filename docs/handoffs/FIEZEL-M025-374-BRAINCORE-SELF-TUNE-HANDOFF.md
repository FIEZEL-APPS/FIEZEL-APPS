# FIEZEL 5.19.0 — Braincore Autonomy Langkah 5 Self-Tune Handoff

Tanggal: 2026-09-27 WIB
Lane: roadmap otonomi (`BRAINCORE-AUTONOMY-ROADMAP.md`), Langkah 4 + 5 (Level 4: Menyetel-diri)
Release: `FIEZEL_PAGE_BUILD=m025-374`, `DIAG_BUILD=m025-374`, `SW_REV=m025-374-braincore-self-tune-20260927`
Bundle Brain: `3.11.0` → `3.12.0`
Base: `origin/main`
Otoritas: OWNER memberikan otorisasi penuh tertulis untuk mengaktifkan penyetelan-diri berbatas (`docs/BRAINCORE-OWNER-ACTIVATION.md`).

## STATUS

Machine-verified. Seluruh suite pengujian brain, wiring, pwa-release, install-health, dan regression lulus 100%:
- `tests/brain-manifest-test.js`: PASS
- `tests/brain-page-wiring-test.js`: PASS
- `tests/self-tune-test.js`: PASS
- `tests/param-ledger-test.js`: PASS
- `tests/brain-config-test.js`: PASS
- `tests/install-health-test.js`: PASS
- `tests/pwa-release-coherence-test.js`: PASS
- `tests/core-brain-v2-test.js`: PASS
- `tests/tutor-brain-v3-test.js`: PASS
- `tests/policy-verdict-test.js`: PASS
- `tests/nof1-test.js`: PASS
- `tests/braincore-living-system-test.js`: PASS
- `tests/regression-test.js`: PASS

## APA YANG BERUBAH

1. **Peta Otoritas Diaktifkan (Langkah 5 Roadmap)**:
   - `selfTune`: `off` → `active` (usulan parameter berbatas dengan 7 pagar)
   - `paramLedger`: `off` → `active` (rantai hash audit trail anti-sabotase)
   - `brainConfig`: `off` → `active` (registry parameter dibaca runtime oleh selfTune)
   - Bundle Version: `3.11.0` → `3.12.0`

2. **Wiring Aplikasi (`app.js`)**:
   - `selfTuneAfterOutcome()` disambungkan sesudah pencatatan policy outcome.
   - Fail-quiet: modul absen atau galat = perilaku identik dengan sebelumnya.
   - Kunci penyimpanan terisolasi: `fiezel-self-tune-v1` (`fiezel-sl-v1-state` tidak disentuh).

3. **Cangkang & PWA Offline-First (`index.html` & `sw.js`)**:
   - Memuat `fiezel-param-ledger.js` dan `fiezel-self-tune.js` secara `defer`.
   - Menambahkan kedua modul ke `ASSETS` precache cangkang service worker.

4. **Ritual Rilis Terkoordinasi**:
   - `FIEZEL_PAGE_BUILD`: `m025-373` → `m025-374` (`core-config.js`)
   - `DIAG_BUILD`: `m025-373` → `m025-374` (`features/neural-voice/fiezel-diag-panel.js`)
   - `SW_REV`: `m025-373-duolingo-edge-fit-20260926` → `m025-374-braincore-self-tune-20260927` (`sw.js`)

```yaml
files_added:
  - docs/BRAINCORE-OWNER-ACTIVATION.md
  - docs/handoffs/FIEZEL-M025-374-BRAINCORE-SELF-TUNE-HANDOFF.md
files_touched:
  - app.js
  - index.html
  - sw.js
  - core-config.js
  - features/neural-voice/fiezel-diag-panel.js
  - features/brain/fiezel-brain-manifest.js
  - docs/BRAINCORE-AUTONOMY-ROADMAP.md
  - tests/brain-manifest-test.js
```

## BATAS YANG DIJAGA

- **TUNABLE Tertutup**: Hanya `difficulty.targetSuccess` (0.70–0.90) dan `bkt.T` (0.05–0.35) yang boleh bergerak sendiri.
- **Dilarang Bergerak Sendiri**: `bkt.slip`, `bkt.guess`, seluruh blok `memory` (FSRS), dan `misconception.*`.
- **7 Pagar Keamanan**: BOUNDS, single-param, cooldown 5 sesi, verdict 'promote' Wilson/Newcombe, rollback pada regresi 3pp, kill-switch halt, fail-closed.
- **Pencabutan**: `halt: true` dapat disetel instan di klien tanpa perlu deploy ulang.
