# FIEZEL m025-633: Mitra Kaiwa Full Audit Fixes & Game Hub Elimination Handoff Dossier

## 1. Ringkasan Eksekutif & Alasan Perubahan
Rilis `m025-633` menyelesaikan audit komprehensif dua arah pada fitur **Mitra Kaiwa / Kawan Bicara** (Voice Studio) sekaligus mengeliminasi panel game/arcade dan interseptor fiezel quest:
1. **Braincore Engine Authority & Zero-Dumbing Invariant**:
   - Evaluator klien `evaluateUtteranceClientSide` dirombak untuk Bahasa Jepang (`ja`) dan Bahasa Inggris (`en`). Miskonsepsi partikel `に`/`が`, bentuk kamus + `です` (`×飲むです`), pola `〜たら` non-Ta-form (`×勉強するたら`), kalimat tanpa predikat, *double verb* (`I am want`), *double conjunction* (`Although ... but`), ketiadaan kata kerja bantu sebelum `-ing`, dan urutan kata VSO terbalik kini ditangkap secara presisi dengan ID miskonsepsi spesifik dan evaluasi `ok: false`.
   - Mengeliminasi riwayat palsu `hist_1`..`hist_5` dan miskonsepsi palsu awal.
   - Mengintegrasikan BKT host PWA (`localStorage['fiezel-mastery-bkt-v1']`) ke dalam Voice Studio sehingga murid yang telah menguasai kosakata prasyarat otomatis membuka skenario N4/B1/B2 (*Smart Prerequisite Bypass*).
   - Menghubungkan telemetri giliran bicara kembali ke host PWA via pesan iframe dan sync endpoint `/api/braincore/sync`.
2. **Audio & Persona Routing**:
   - Memperbaiki routing persona TTS untuk membedakan `Sensei Nanami` (`sensei_nanami`) dan `Keita Senpai` (`keita`).
   - Mengganti circuit breaker permanen dengan sistem memory cache audio dan temporary retry cooldown.
3. **UI/UX & Anti-Leak Mode Ujian**:
   - Teks instruksi/pertanyaan AI selalu tampil di panggung utama, namun terjemahan dan bantuan jawaban otomatis disembunyikan dalam mode *Sembunyikan Arti* maupun *Mode Ujian*.
   - Badge BKT di scenario bar kini dapat diklik untuk membuka tampilan *Open Learner Model (OLM)* dan kembali dengan mudah ke panggilan.
   - Menghubungkan tombol "Ide Lain" ke rotasi saran kalimat offline.
4. **Offline PWA Precache**:
   - Menambahkan `./call.html`, bundel `./features/voice-studio/dist/*`, dan aset PAW Mochi ke daftar precache `ASSETS` di `sw.js`.
5. **Eliminasi Panel Game / Undercover & Fiezel Quest**:
   - Mengeliminasi panel game dari bottom navigation dan `app.js` serta interseptor fiezel quest pada pembukaan sesi grammar.

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)
- Jalur probe: `C:\Users\hp\.gemini\antigravity\brain\a5f38e12-0e4e-45b1-ba19-0c32d563651b\scratch\mitra-kaiwa-audit-probe.mjs`
- Hasil eksekusi Chromium:
  - `swPrecacheAudit`: `hasCallHtmlInAssets: true`, `hasVoiceStudioDistInAssets: true`
  - `backendEndpoints`: `assistHasSuggestionsArray: true`, `syncHasAcceptedIdsArray: true`
  - `hostIntegration`: `seededBraincoreStateBeforeAnyAction` bersih dari data fiktif; prereq membaca BKT host.
  - `personaTtsRouting`: N5 merutekan ke `sensei_nanami`, N4 merutekan ke `keita`, circuit breaker tidak membunuh request berikutnya.
  - `evaluatorAudit`: 7 kalimat miskonsepsi/gibberish menghasilkan `evaluatedOk: false` dengan ID miskonsepsi akurat; 2 kalimat valid menghasilkan `evaluatedOk: true`.
  - `uiUxAudit`: Navigasi OLM berfungsi (`braincoreViewOpened: true`), latency inisiasi <300ms, zero dead websocket timeouts.
  - `measureModeAudit`: Teks AI tampil di panggung, terjemahan & bantuan jawaban disembunyikan.

## 3. Daftar Berkas yang Disentuh
- `features/voice-studio/src/lib/liveTransport.ts`
- `features/voice-studio/src/lib/braincore.ts`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/dist/voice-studio.js`
- `features/voice-studio/dist/voice-studio.css`
- `features/interactive-chat/fiezel-interactive-chat.js`
- `backend/tts.py`
- `server.js`
- `app.js`
- `style.css`
- `features/ui/fiezel-tactile-clay.css`
- `sw.js`
- `coordination/BUILD-VERSION.json`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `id-golden-baseline.json`
- `reports/th-ui-leak-report.json`

## 4. Status Gerbang Mutu Lokal
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS (m025-633)
- `node tests/gate-registry-test.js`: PASS
- `node tests/pwa-cache-test.js`: PASS
- `node tests/boot-order-test.js`: PASS
- `node tests/voice-studio-ui-architecture-test.js`: PASS
- `node tests/home-kawan-bicara-card-test.js`: PASS
- `node tests/interactive-chat-test.js`: PASS
- `node tests/voice-call-two-way-test.js`: PASS
- `node tools/bump-build.mjs --check`: Selaras (m025-633)
