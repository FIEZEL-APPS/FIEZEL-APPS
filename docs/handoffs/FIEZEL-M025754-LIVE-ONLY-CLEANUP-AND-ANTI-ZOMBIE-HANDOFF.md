# FIEZEL Handoff: M025-754 Live-Only Cleanup & Anti-Zombie Invariant

**Build ID:** `m025-754`
**PR:** #826
**Scope:** `chore(pwa): [ALLOW-PROTECTED: pwa,ci]`
**Date:** 2026-11-03

---

## 1. Ringkasan & Alasan Perubahan (Context & Rationale)
Workspace dan repositori FIEZEL mengalami penumpukan artefak mati, berkas mockup usang, aset 2D lama (Nusa & Mira), serta direktori eksperimental yang sudah lama tidak dipakai di aplikasi live. Penumpukan ini menyebabkan:
1. Agen AI lokal mengalami kebingungan (*hallucination / zombie code resurrection*) karena memindai dan membaca kode yang sudah dipensiunkan.
2. Ukuran repositori dan kuota GitHub Actions terbebani oleh artefak sampah.
3. Kerancuan terkait maskot: di mana string `paw-mascot-full.svg` masih tertinggal di pre-cache `sw.js` dan tag modal login `index.html` meskipun secara visual UI murid sudah 100% menggunakan Mochi 3D Three.js.

## 2. Rincian Pembersihan (Changes Made)
1. **Pemusnahan 249 Berkas Sampah (-63.317 Baris Kode)**:
   - `mockups/` (26 berkas)
   - `remotion/` (8 berkas konfigurasi video)
   - `assets/characters/` (120+ gambar/rig 2D usang Nusa & Mira)
   - `assets/motion/` (30+ klip video mp4/webm/posters lama)
   - `analysis/`, `audit/`, `plan/`, `ecohero-quest/`, `test_reports/`, `.reading-new/`, `frontend/`, `api/`
   - Berkas batch sisa: `batch-1-updates.json` s.d. `batch-5-updates.json`
   - Berkas demo terisolasi: `character-preview.html`, `test-mochi.html`

2. **Eliminasi Total Jejak PAW Lama di Runtime PWA**:
   - `index.html` (baris 1225): Diganti dari `./assets/brand/paw-mascot-full.svg` ke `./assets/brand/paw-mochi-idle.svg`.
   - `sw.js` (precache `ASSETS`): Diganti dari `./assets/brand/paw-mascot-full.svg` ke `./assets/brand/paw-mochi-idle.svg`.
   - Berkas fisik `paw-mascot-full.svg` dipertahankan hanya sebagai fixture inert internal untuk `palette-gate-test.js` dan `pawprint-geometry-gate-test.js`.

3. **Penegakan Tata Kelola Agen Anti-Zombie (`AGENTS.md` §0-B)**:
   - Menambahkan aturan mutlak larangan pemindaian atau regenerasi direktori di luar whitelist live runtime.
   - Mengatur pola ignore di `.gitignore` untuk mencegah berkas sampah lokal masuk kembali ke repo.

4. **Penaikan Build Kanonikal**:
   - Menjalankan `tools/bump-build.mjs` untuk menaikkan build ke `m025-754`.
   - Hexa-sync dan Octa-sync terverifikasi selaras (`sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`).

---

## 3. Hasil Pengujian Mutu (Verification)
- `tests/deploy-site-gate-test.js`: PASS (33/33)
- `tests/id-golden-snapshot-test.js`: PASS
- `tests/curriculum-cache-version-test.js`: PASS (33/33)
- `tests/gate-registry-test.js`: PASS (10/10)
- `tests/palette-gate-test.js`: PASS (5/5)
- `tests/pawprint-geometry-gate-test.js`: PASS (5/5)
- `git diff --check`: PASS (0 whitespace errors)
- `tools/fiezel-guardians.mjs` (A9, A10, A11): PASS
