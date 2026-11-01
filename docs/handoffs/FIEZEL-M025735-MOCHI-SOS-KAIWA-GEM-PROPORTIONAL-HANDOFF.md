# FIEZEL RELEASE HANDOFF DOSSIER: M025-735

**Release Scope**: `fix(voice): mochi voice sos micro switch, proportional gems, and 18-key dynamic pool`
**Build Version**: `m025-735` (Hexa-Sync & Octa-Sync Aligned)
**Date**: 2026-11-02
**Status**: VERIFIED & READY FOR MERGE

---

## 1. Executive Summary & Audit Background

Rilis ini merupakan penggabungan menyeluruh dari dua inisiatif kritis arsitektur suara AI interaktif dan ekonomi Gem FIEZEL:
1. **Mochi Voice SOS Lifeline**:
   - Saklar kartu mikro (`#fzMochiCardToggle` / `.fz-mochi-card-toggle`) berdimensi micro (28px × 15px), kapsul hitam legam `#18181B` dengan label "Bantuan Mochi" (9px) dan indikator teks `OFF`/`ON` (6px) di dalam lintasan saklar.
   - Peniadaan total balon komik petunjuk statis "Ketuk aku".
   - Penyelarasan modal konfirmasi interaktif berbingkai emas tipis `2px solid #FDE047` dengan icon Mochi lembut (`#FEF3C7`), tombol 36px berdampingan (`Batal` dan `Gunakan Gem & Mulai`).
   - Sapaan instan Mochi Puck Voice Web Audio detik ke-0 (<100ms) via audio asset resmi.
   - Reaktivitas visualizer audio akustik yang seketika berubah warna merah coral gradien vibran saat murid berbicara.
2. **Dynamic 18-Key Gemini Live Pool & KV Sentinel**:
   - Backend Cloudflare Worker (`workers/api/voice/route-voice-live.js`) dilengkapi sinkronisasi kunci dinamis KV Sentinel lintas worker dengan rate limit 30 koneksi/menit dan circuit breaker anti-kehabisan kuota.
3. **Daily Gem Rewards Economy**:
   - Murid yang belajar minimal 10 menit sehari mendapatkan reward +20 Gem gratis (maksimal 1x per hari).
   - Bonus login harian +5 Gem saat pertama kali membuka aplikasi di hari yang bersangkutan.
4. **Mitra Kaiwa Voice Studio StudioBridge Purity**:
   - Integrasi `call.html` sub-aplikasi Vite/React dengan meteran kuota adil (0 Gem connect, pemotongan proporsional saat suara diputar).
   - Transisi cold-boot `safeWatchdog: 6500ms` dan glass blur pada backdrop `#fzRitual`.

---

## 2. Empirical Verification & Probe Evidence

Pengujian empiris dilakukan menggunakan Chromium Headless Playwright:
- **`tools/dev/probe-mochi-switch-modal-gem-wire.mjs`**:
  - Stage 1: Saklar terpasang default `OFF` dengan label `Bantuan Mochi` dan saldo Gem terbaca.
  - Stage 2: Klik saklar memicu modal konfirmasi emas tanpa memulai sesi sebelum disetujui.
  - Stage 3: Klik `Gunakan Gem & Mulai` menutup modal, mengubah saklar menjadi `ON`, mengaktifkan aksesori Mochi (kacamata & headset), visualizer, dan mengurangi Gem.
  - Stage 4: Deteksi suara murid mengubah visualizer menjadi merah coral (`is-user-speaking`).
  - Stage 5: Klik saklar saat `ON` mematikannya kembali ke `OFF` secara bersih tanpa modal konfirmasi baru.
- **Unit & System Gate Results**:
  - `tests/mochi-voice-sos-test.js`: PASS (26/26 tests, 30 FSRS assertions, 36 Grammar assertions)
  - `tests/daily-gem-rewards-test.js`: PASS (7/7 tests)
  - `tests/voice-sync-keys-test.js`: PASS (5/5 tests)
  - `tests/voice-studio-ui-architecture-test.js`: PASS (5/5 tests)
  - `tests/gate-registry-test.js`: PASS (10 pass, 0 fail, 415 active gates)
  - `tests/curriculum-cache-version-test.js`: PASS (Octa-Sync aligned at `m025-735`)
  - `tests/critical-surface-protection-test.js`: PASS (9 pass, 0 fail)
  - `tests/secret-scan-test.js`: PASS (46/46 assert pass, 0 findings)
  - `tests/i18n-kunci-hantu-test.js`: PASS (5834 keys pass, 0 ghost keys)
  - `tests/id-golden-snapshot-test.js`: PASS (100% baseline emas utuh)
  - `tests/th-ui-leak-test.js`: PASS (4670 keys aligned, 0 leak)

---

## 3. Touched Files & Architecture Scope

- **Core & Runtime Shell**:
  - `coordination/BUILD-VERSION.json` (m025-735)
  - `sw.js` (SW_REV m025-735)
  - `core-config.js` (FIEZEL_PAGE_BUILD m025-735)
  - `app.js` (Daily gem reward tracker & topbar integration)
  - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` (Query param sync)
- **Mochi Voice SOS & Visuals**:
  - `features/mascot/fiezel-mochi-voice-sos.js`
  - `features/mascot/mochi-voice-sos.css`
  - `features/mascot/fiezel-mochi-companion.js`
  - `mochi-mascot/fiezel-mochi.js`
  - `features/ui/fiezel-tactile-clay.css`
  - `features/ui/fiezel-vivid.css`
- **Mitra Kaiwa Voice Studio**:
  - `features/voice-studio/src/App.tsx`
  - `features/voice-studio/src/lib/liveTransport.ts`
  - `features/voice-studio/dist/voice-studio.js`
  - `features/voice-studio/dist/voice-studio.css`
- **Backend & Gemini Pool**:
  - `workers/api/voice/route-voice-live.js`
  - `workers/api/schema.js`
  - `server.js`
- **Audio Assets & Tests**:
  - `assets/audio/sfx/mochi_greet_id.mp3`, `assets/audio/sfx/mochi_greet_th.mp3`
  - `tests/mochi-voice-sos-test.js`
  - `tests/daily-gem-rewards-test.js`
  - `tests/voice-sync-keys-test.js`
  - `.github/workflows/quality.yml`
