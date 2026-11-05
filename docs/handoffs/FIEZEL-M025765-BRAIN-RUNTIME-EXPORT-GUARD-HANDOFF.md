# Handoff Dossier: FIEZEL-M025765 — Braincore Runtime UMD Export Guard

- **Build Version:** `m025-765`
- **Scope:** `refactor(brain-cleanup)`
- **Date:** 2026-11-05

## 1. Ringkasan Perubahan & Alasan Rekayasa
Menindaklanjuti kompaksi modul runtime `features/brain/*.js` pada `m025-764`, rilis `m025-765` menyertakan helper normalisasi ekspor UMD (`_fzG`) pada seluruh 33 modul Braincore untuk memastikan objek API yang diekspor ke konteks global peramban maupun CommonJS tervalidasi terhadap konfigurasi runtime inti (`core-config.js`) dan tetap berada di bawah anggaran *precache* Service Worker (`220,0 KB` total < batas `240,0 KB`).

## 2. Bukti Pengujian Empiris & Gerbang Mutu
- `node tests/brain-runtime-compact-gate-test.js`: **PASS** (33/33 modul memiliki header revisi runtime, token integritas, dan guard ekspor UMD `_fzG`).
- `node tests/braincore-purity-test.js`: **PASS** (33/33 modul murni).
- `node tests/brain-manifest-test.js`: **PASS**.
- `node tests/brain-config-test.js`: **PASS**.
- `node tests/braincore-runtime-e2e-proof.js`: **PASS** (10/10 invarian E2E).
- `node tests/id-golden-snapshot-test.js`: **PASS**.
- `node tests/th-ui-leak-test.js`: **PASS**.
- `node tools/bump-build.mjs --check`: **Selaras (`m025-765`)**.

## 3. Daftar Berkas yang Disentuh
- `features/brain/*.js` (33 modul runtime Braincore)
- `tests/brain-runtime-compact-gate-test.js`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`
- `docs/handoffs/FIEZEL-M025765-BRAIN-RUNTIME-EXPORT-GUARD-HANDOFF.md`
