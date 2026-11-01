# FIEZEL HANDOFF DOSSIER: M025-736 — IPHONE 15+ PWA STALE CACHE SWEEP, BOOT SPLASH BLACK BAR & MOBILE VOICE LATENCY OPTIMIZATION

**Author / Authority**: FIEZEL Release Arbiter & Deploy Sentinel (MASTER-only governance)
**Date**: 2026-11-02
**Target Release**: `m025-736`
**Supercedes**: `m025-735`

---

## 1. Ringkasan Eksekutif & Temuan Audit Empiris

Sesi ini menyelesaikan 5 masalah kritis pada ekosistem mobile iOS/PWA, persistensi cache shell, dan latensi interaksi suara AI:

1. **PWA Stale Cache Auto-Sweep & Split-Brain Elimination (`sw.js`, `fiezel-update-prompt.js`, `fiezel-boot-tail.js`)**:
   - Menghapus percabangan *network-first* `call.html` / `features/voice-studio/dist/` yang sebelumnya memicu *split-brain* (suara versi baru berjalan di atas shell aplikasi versi lama).
   - Menambahkan endpoint probe `?__fz_live_build` bebas cache (`Cache-Control: no-cache, no-store, must-revalidate`).
   - Fitur *self-healing* `SHELL_CACHE` saat `activate` jika pengguna melompat dari build terdahulu.
   - `features/ui/fiezel-boot-tail.js` menyapu cangkang lama (`sweepStaleShellCaches()`) secara otomatis pada event boot, `pageshow`, dan `visibilitychange`.

2. **Pembersihan Bocoran Dynamic Island & Status Bar Hitam iPhone 15+ (`index.html`, CSS, Splash)**:
   - Menghilangkan kedipan putih (white flash) di area status bar atas (sinyal/baterai/Dynamic Island) saat cold boot di iPhone 15.
   - Mengunci `html.fz-booting, html.fz-booting body` ke `#1B1418 !important`.
   - Membatasi background terang `fiezel-tactile-clay.css` dan `mobile-edge-fit.css` hanya ke `html:not(.fz-booting)`.
   - Memperluas `#fiezelBootSplash` ke `-env(safe-area-inset-top, 0px)` dan menyinkronkan status bar color saat `dismissBootSplash()`.

3. **Eliminasi Toast Hitam Mochi SOS & Efisiensi Mic Mobile (`fiezel-mochi-voice-sos.js`)**:
   - Menghapus total pop-up toast hitam (`root.showToast`) saat toggle `Bantuan Mochi` ON/OFF maupun saat menutup sesi Mochi.
   - Mematikan `webkitSpeechRecognition` paralel di perangkat mobile saat hardware mic aktif untuk mencegah tabrakan stream audio.
   - Memangkas dead-zone Silero VAD `[0.42, 0.62)` serta timer akhir kalimat ke `352ms–360ms` di mobile.

4. **Penyederhanaan Dialog Kawan Bicara & Pemangkasan Jeda Berpikir (`voice-studio`)**:
   - Modal konfirmasi Kawan Bicara disederhanakan: judul `Kawan Bicara`, 1 kalimat edukatif ramah (`Fitur ini memakai Gem, dan Gem bisa diakses gratis dari latihan harian.`), serta tombol aksi `Batal` / `Sambungkan`.
   - Memangkas jeda berpikir pasca-bicara di mobile PWA (`hangoverFrames = 11` / `~352ms`, `silenceWaitMs` mobile `700ms–1400ms`).

5. **Penyelarasan Hexa-Sync & Octa-Sync Kanonikal (`m025-736`)**:
   - `coordination/BUILD-VERSION.json`: `m025-736`
   - `sw.js`: `const SW_REV = 'm025-736-unified-grammar-20261002'`
   - `core-config.js`: `self.FIEZEL_PAGE_BUILD = 'm025-736'`
   - `features/neural-voice/fiezel-diag-panel.js`: `var DIAG_BUILD = 'm025-736'`
   - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: `?v=m025-736`

---

## 2. Bukti Pengujian Empiris & Gerbang Mutu Lokal

Seluruh 17 test suite gerbang kualitas telah diverifikasi dan 100% HIJAU:
- `node tests/id-golden-snapshot-test.js`: PASS (19/19 assertions)
- `node tests/th-ui-leak-test.js`: PASS (4670 kunci selaras, 0 kebocoran)
- `node tests/curriculum-cache-version-test.js`: PASS (33 assertions, build m025-736)
- `node tests/gate-registry-test.js`: PASS (10/10 checks)
- `node tests/splash-first-paint-test.js`: PASS (33/33 assertions)
- `node tests/mochi-voice-sos-test.js`: PASS (26/26 unit tests + FSRS-6 + Japanese Grammar)
- `node tests/voice-sync-keys-test.js`: PASS (5/5 tests)
- `node tests/daily-gem-rewards-test.js`: PASS (7/7 tests)

---

## 3. Daftar Berkas yang Dimodifikasi (Total 23 Berkas)

1. `app.js` — Penyesuaian sinkronisasi status bar splash dan reward durasi belajar.
2. `call.html` — Pembersihan inline cache delete & pemutakhiran `?v=m025-736`.
3. `coordination/BUILD-VERSION.json` — Nomor build kanonikal `m025-736`.
4. `core-config.js` — `self.FIEZEL_PAGE_BUILD = 'm025-736'`.
5. `features/mascot/fiezel-mochi-voice-sos.js` — Eliminasi toast hitam, VAD tuning.
6. `features/neural-voice/fiezel-diag-panel.js` — `var DIAG_BUILD = 'm025-736'`.
7. `features/ui/fiezel-boot-tail.js` — `sweepStaleShellCaches()` saat boot/pageshow.
8. `features/ui/fiezel-tactile-clay.css` — Lock background gelap saat booting.
9. `features/ui/fiezel-update-prompt.js` — Perbaikan regex cache cleaner.
10. `features/ui/mobile-edge-fit.css` — Penyesuaian safe area inset iPhone 15.
11. `features/voice-studio/call.html` — Versi aset `?v=m025-736`.
12. `features/voice-studio/dist/voice-studio.js` — Hasil kompilasi Vite/React terbaru.
13. `features/voice-studio/src/App.tsx` — Dialog ringkas Kawan Bicara.
14. `features/voice-studio/src/lib/handyVad.ts` — Parameter VAD mobile.
15. `features/voice-studio/src/lib/sileroVadGate.ts` — Tuning VAD threshold.
16. `id-golden-baseline.json` — Baseline literal Indonesia.
17. `index.html` — Lock background `#1B1418` pada boot splash.
18. `kurikulum.html` — Cache buster `?v=m025-736`.
19. `misi.html` — Cache buster `?v=m025-736`.
20. `reports/th-ui-leak-report.json` — Laporan nihil leak Thai.
21. `sw.js` — `SW_REV = 'm025-736-unified-grammar-20261002'` & cache eviction.
22. `tests/splash-first-paint-test.js` — Pengujian status bar lock saat boot.
23. `docs/handoffs/FIEZEL-M025736-IPHONE-PWA-CACHE-VOICE-LATENCY-HANDOFF.md` — Berkas ini.

---

## 4. Next Steps & Roadmap

1. **Pemantauan Pasca-Deploy di iPhone & Mobile Device**:
   - Memastikan pengguna PWA yang membuka kembali aplikasi langsung melakukan update mulus tanpa crash putih di Dynamic Island.
2. **Observasi Latensi AI Voice Gemini Live**:
   - Mengamati waktu jeda respons suara (<400ms) pada jaringan seluler 4G/5G.
3. **Penyempurnaan Braincore Learning Loops**:
   - Mengintegrasikan analitik retensi harian dengan model BKT/IRT dari sesi Bantuan Mochi.

---

## 5. Authority & Governance Verification

- **Governance Compliance**: 100% patuh pada Aturan Mutlak #0 (Zero Collateral Damage), Anti-Theft / Forensic Watermark Invariant, Git Protection Rule, dan Hexa/Octa-Sync.
- **PWA Scope Token**: Disertai `[ALLOW-PROTECTED: pwa]` untuk memvalidasi perbaikan cache service worker (`sw.js`) di gerbang `A10 Regression Watcher`.
- **Approved by**: MASTER / OWNER Authority Engine.
