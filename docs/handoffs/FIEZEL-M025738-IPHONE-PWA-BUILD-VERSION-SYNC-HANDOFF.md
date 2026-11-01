# FIEZEL HANDOFF DOSSIER: M025-738 — IPHONE 15+ PWA BUILD-VERSION SYNC, STALE SHELL PURGE & MOCHI SOS SINGLE-VOICE GREETING

**Author / Authority**: FIEZEL Release Arbiter & Deploy Sentinel (MASTER-only governance)
**Date**: 2026-11-02
**Target Release**: `m025-738`
**Supercedes**: `m025-737`

---

## 1. Ringkasan Eksekutif & Temuan Audit Empiris

Rilis `m025-738` menyelesaikan dua masalah kritis di lingkungan iOS Safari / PWA Standalone dan interaksi suara AI Mochi SOS:

1. **Perbaikan Deteksi Update & Pembersihan Cache Cangkang Lama di PWA iPhone 15 Ke Atas (`m025-734` -> `m025-738`)**:
   - `deploy/site-exclude.txt`: Sebelumnya seluruh direktori `coordination/` dikecualikan dari rsync, sehingga `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` di server hosting produksi tertinggal di `m025-732`. Akibatnya, PWA iPhone 15+ yang berada di build `m025-734` saat mem-fetch `./coordination/BUILD-VERSION.json` menyimpulkan bahwa tidak ada versi baru dan tidak pernah memunculkan dialog update banner.
   - Pengecualian dipersempit: Hanya `coordination/CLAIMS.json` dan `coordination/braincore-contract.json` yang dikecualikan, sedangkan `coordination/BUILD-VERSION.json` ikut terbit ke produksi dan divalidasi oleh `tools/deploy-site-verify.mjs` serta `tests/deploy-site-gate-test.js`.
   - `features/ui/fiezel-update-prompt.js`: Memperbaiki logika `fetchRemoteVersion()` agar sinyal `liveConfigBuild` dari `./core-config.js` tidak tertimpa oleh nilai `BUILD-VERSION.json` yang lebih tua (`isNewerBuild(liveConfigBuild, _b)` selalu menang).
   - `website/.htaccess` & `sw.js` & `features/ui/fiezel-boot-tail.js` & `index.html`:
     - Menambahkan header `Cache-Control: no-cache, must-revalidate` pada `.js/.mjs/.css/.html` serta `no-store, no-cache` pada berkas konfigurasi versi (`sw.js`, `core-config.js`, `version.js`, `VERSION.json`, `BUILD-VERSION.json`, `manifest.json`, `index.html`) di `website/.htaccess`.
     - Membebaskan `VERSION.json` dan `BUILD-VERSION.json` dari blokir hotlink.
     - Di `sw.js`: Menambahkan `ensureShellCoherence()` saat `FIEZEL_HEALTH_PING` (menghapus semua `fiezel-shell-* !== SHELL_CACHE` dan mengisi ulang cangkang bila `./index.html` atau `./app.js` hilang), menghapus `SHELL_CACHE` parsial bila `install` gagal, serta memastikan fallback `isShellRequest` memakai `new Request(e.request, {cache: 'reload'})` agar bebas dari WebKit HTTP disk cache.
     - Di `features/ui/fiezel-boot-tail.js` & `index.html`: Memicu `reg.update()` + `FiezelUpdatePrompt.check(true)` saat `load`, `pageshow`, dan `visibilitychange`.

2. **Perbaikan Tabrakan Suara Ganda (*Dual-Voice Collision*) Saat Pertama Kali Mengaktifkan Mochi SOS**:
   - `features/mascot/fiezel-mochi-voice-sos.js`:
     - Menghapus pemanggilan `playInstantGreeting()` dari `showConfirmationModal` (`btnOk.onclick`) dan menonaktifkan pemutaran MP3 statis (`./assets/audio/sfx/mochi_greet_id.mp3` / `mochi_greet_th.mp3`) serta `getPrewarmedGreetingChunks()` yang sebelumnya berbunyi tumpang-tindih dengan intonasi berbeda di atas suara pembuka Gemini Live (`Puck`) pada `sendOpeningTurn()`.
     - Menambahkan `stopAllActiveAudioSources()`, `root.stopSpeaking()`, dan `_fallbackTtsAbort` (`AbortController`) agar fallback TTS Edge (`/api/tts/line`) tidak pernah berbunyi bersamaan dengan Gemini Live.
     - Memastikan `_startParallelSpeechRecognition()` (`webkitSpeechRecognition`) tidak berjalan bersamaan dengan streaming PCM hardware mic live (`_micStream`).

---

## 2. Bukti Pengujian Empiris & Gerbang Mutu Lokal

Seluruh test suite gerbang mutu telah diverifikasi dan 100% LULUS (PASS):
- `node tests/deploy-site-gate-test.js`: PASS (33/33 assertions)
- `node tests/mochi-voice-sos-test.js`: PASS (27/27 tests)
- `node tests/curriculum-cache-version-test.js`: PASS (33 assertions, build m025-738)
- `node tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras di `m025-738`)

---

## 3. Daftar Berkas yang Disentuh (Total 17 Berkas)

1. `deploy/site-exclude.txt` — Membuka jalur rsync untuk `coordination/BUILD-VERSION.json`.
2. `features/mascot/fiezel-mochi-voice-sos.js` — Eliminasi dual-voice collision & greeting overlap.
3. `features/ui/fiezel-boot-tail.js` — Shell coherence auto-recovery saat event lifecycle.
4. `features/ui/fiezel-update-prompt.js` — Perbaikan seleksi sinyal build teranyar.
5. `index.html` — Pengikatan update prompt pada siklus boot.
6. `sw.js` — `ensureShellCoherence()` & `SW_REV = 'm025-738-unified-grammar-20261002'`.
7. `tests/deploy-site-gate-test.js` — Penegasan rsync dan pemutakhiran BUILD-VERSION.json live.
8. `tests/mochi-voice-sos-test.js` — Verifikasi anti-dual-voice collision (27/27 pass).
9. `tools/deploy-site-verify.mjs` — Pemeriksaan live endpoint BUILD-VERSION.json.
10. `website/.htaccess` — Header no-cache agresif & pembukaan akses BUILD-VERSION.json.
11. `call.html` — Cache buster `?v=m025-738`.
12. `coordination/BUILD-VERSION.json` — Nomor build kanonikal `m025-738`.
13. `core-config.js` — `self.FIEZEL_PAGE_BUILD = 'm025-738'`.
14. `features/neural-voice/fiezel-diag-panel.js` — `var DIAG_BUILD = 'm025-738'`.
15. `features/voice-studio/call.html` — Cache buster `?v=m025-738`.
16. `kurikulum.html` & `misi.html` — Cache buster `?v=m025-738`.
17. `docs/handoffs/FIEZEL-M025738-IPHONE-PWA-BUILD-VERSION-SYNC-HANDOFF.md` — Berkas ini.

---

## 4. Next Steps & Roadmap

1. Memantau telemetri pembaruan perangkat murid (khususnya pengguna iOS Safari PWA standalone) saat membuka aplikasi.
2. Memverifikasi bahwa endpoint `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` terbit dengan status HTTP 200 dan menyajikan JSON `{"version": "m025-738"}`.
3. Mengamati interaksi suara Mochi SOS di detik ke-0 pada perangkat murid sungguhan untuk mengonfirmasi suara Puck Gemini Live terdengar jernih tanpa gema tumpang-tindih.

---

## 5. Authority & Governance Verification

- **Governance Compliance**: 100% mematuhi Aturan Mutlak #0, Hexa-Sync, Octa-Sync, Anti-Theft Watermark, dan Git Protection Rule.
- **PWA Scope Token**: Disertai `[ALLOW-PROTECTED: pwa]` untuk memvalidasi perbaikan cache service worker (`sw.js`) dan konfigurasi deploy di gerbang `A10 Regression Watcher`.
- **Approved by**: MASTER / OWNER Authority Engine (`@fitrarustqi`).
