# Audit & Perbaikan Ekosistem FIEZEL (m025-797) — Performa Render, Braincore, Kawan Bicara & Mikrofon, Mochi SOS, Worker, dan APK Android

Otoritas: OWNER / MASTER (`FIEZEL-APPS`).

Status: **SIAP RILIS (`m025-797`)** — seluruh perbaikan performa, stabilitas UI, integritas Braincore, sinkronisasi Mochi 3D & Voice SOS, kontinuitas mikrofon Kawan Bicara (`call.html`), hardening Cloudflare Workers & FastAPI backend, serta aset APK Android telah diverifikasi di worktree terisolasi `fix/ecosystem-perf-bugs-m025-797`.

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Audit end-to-end ekosistem FIEZEL menemukan dan memperbaiki lima akar masalah utama:

1. **Kebocoran Interval & Stutter Render Maskot 3D (`mochi-mascot/fiezel-mochi.js`, `features/mascot/fiezel-mochi-companion.js`)**:
   - **Akar masalah**: Properti `this.earTwitchTimer` bertipe float countdown (`3.0 - dt` pada `createFoxEars`/`updateEarsAndTail`) bertabrakan nama dengan ID `setInterval` yang disimpan ke properti yang sama (`startEarTwitchLoop`/`stopEarTwitchLoop`). Akibatnya `clearInterval(timer)` menerima pecahan float acak (`ToInt32`) sehingga salah membatalkan timer lain di halaman dan membocorkan interval telinga di setiap transisi layar.
   - **Perbaikan**: Memisahkan ID interval ke `this._earTwitchInterval`, menonaktifkan mipmap dinamis pada `CanvasTexture`, menambahkan tanda perubahan render wajah/efek (`_faceRenderSig` & kuantisasi `_fxRenderSig` `12/24 Hz`), pooling tekstur partikel, penanganan `webglcontextlost`/`webglcontextrestored`, mode `isCompactCard` untuk kartu kuis (`<=180px`, ~15 fps saat idle), serta mem-pause Mochi companion (`pause()` / `resume()`) ketika Kawan Bicara (`call.html`) aktif.
2. **Alur Belajar, Placement Purity, Status Bar, & Idle CPU (`app.js`, `index.html`, `style.css`, `features/ui/`)**:
   - **Placement Mode Purity**: Menambahkan guard `&& !cfg.placement` pada penjadwalan kartu `reteach` (`app.js`) agar modal `"JEDA MENGAJAR — ULAS BARENG"` tidak menyela tes penempatan (*placement test*).
   - **Session & Boot Guard**: Menjaga `openApp()` agar `render()` tidak menimpa sesi kuis yang sedang aktif sekaligus mempertahankan kontrak boot order (`notifyAppUpdateIfNew()`), menapis mutasi `statusBarObserver` dengan `lastSbSurfaceSig`, serta menghentikan polling identik berulang (`identityEvidenceEnsureAnon`, `pollStageInvites`, `socialNotifyPoll`, `startNotifPolling`).
   - **CSS & Scroll Compositor**: Menggantikan selektor `:has(...)` mahal pada jalur hot (`fz-ob-open`, `fz-auth-open`, `has-settings-wrapper`), menghapus `backdrop-filter` berat berlapis yang membebani GPU mobile saat modal/topbar menggulir, serta menjaga Zoom Lock terkunci (`features/ui/fiezel-zoom-lock.js`).
3. **Kawan Bicara, Mikrofon PWA Mobile, & Mochi SOS (`features/voice-studio/`, `features/mascot/fiezel-mochi-voice-sos.js`, `features/interactive-chat/fiezel-interactive-chat.js`)**:
   - Mempertahankan penuh arsitektur kontinuitas mikrofon PWA & Android/iOS duplex + AEC barge-in (`App.tsx`, `handyVad.ts`, `sileroVadGate.ts`, `fiezel-ui-sfx.js`) tanpa merendahkan `navigator.audioSession`.
   - Mengurangi beban gesture listener (`{ capture: true, passive: true }`) dan mencegah re-warming `AudioContext` berulang saat sudah `running` & `_fzWarmed`.
   - Memperbaiki scope durasi audio pada `fiezel-mochi-voice-sos.js` (`audioEl.duration` di jalur `playViaAudioTag` dan `decoded.duration` di jalur `ctx.decodeAudioData`), serta memperkuat pengecekan origin WebSocket & CORS pada `features/voice-studio/worker/cloudflare-live-call-worker.js` termasuk dukungan asal `https://appassets.androidplatform.net` untuk APK luring.
4. **Auth, Service Worker, Worker API, & FastAPI Backend (`sw.js`, `features/auth/`, `features/security/`, `workers/`, `backend/`)**:
   - Memperkuat `withCoopCoep` agar tidak memproses response opaque/status `0`/`204`/`304`, batch precache instalasi di `sw.js`, dan menunggu `caches.put` sebelum mengembalikan respons navigasi update.
   - Menambahkan `AbortController` timeout di auth Google/akun, deduplikasi `ensureAuthSchema` di `workers/api/auth-schema.js`, kueri paralel di `route-social.js` & `backend/` (`assessment.py`, `learning.py`), serta `LRU OrderedDict` & `ClientSession` reuse di `backend/tts.py`.
5. **Sinkronisasi Aset APK Android (`android/`, `tools/sync-android-assets.mjs`)**:
   - Menambahkan `call.html` ke `CORE_ROOT_FILES` pada `tools/sync-android-assets.mjs` agar bundle luring Android menyertakan Kawan Bicara, menggunakan `LAYER_TYPE_NONE` (kompositor native WebView), memperketat validasi host OAuth/Intent di `MainActivity.java` & `FiezelWebViewClient.java`, dan menyinkronkan aset ke build `m025-797`.

---

## 2. Daftar Permukaan Utama yang Disentuh

- Core & PWA Shell: `index.html`, `app.js`, `style.css`, `sw.js`, `core-config.js`, `coordination/BUILD-VERSION.json`, `kurikulum.html`, `misi.html`, `call.html`, `undercover.html`
- Maskot 3D & Mochi SOS: `mochi-mascot/fiezel-mochi.js`, `features/mascot/fiezel-mochi-companion.js`, `features/mascot/fiezel-mochi-voice-sos.js`, `features/mascot/fiezel-paw-outfit.js`
- Kawan Bicara & Voice Studio: `features/interactive-chat/fiezel-interactive-chat.js`, `features/voice-studio/call.html`, `features/voice-studio/src/App.tsx`, `features/voice-studio/dist/voice-studio.js`, `features/voice-studio/fiezel-voice-studio-embed.js`, `features/voice-studio/worker/cloudflare-live-call-worker.js`
- Auth, Onboarding, Security, UI & Bahasa: `features/auth/*`, `features/onboarding/*`, `features/security/fiezel-offline-vault.js`, `features/ui/*`, `features/brain/*` (`_fzG` localhost/local testing hardening), `features/pte/fiezel-pte-ui.js`, `features/japanese/fiezel-ja-ui.js`, `features/mandarin/mandarin-ui.js`, `features/audio/*`, `features/audio-assets/*`, `features/neural-voice/*`
- Worker, Backend, Landing & Android: `workers/api/*`, `workers/owner/index.js`, `backend/*`, `website/index.html`, `website/site.js`, `android/app/src/main/java/**`, `android/app/src/main/assets/public/**`, `tools/sync-android-assets.mjs`
- Baseline & Pengujian: `id-golden-baseline.json`, `tests/paket-offline-test.js`, `tests/progress-sync-test.js`, `reports/*`

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu (`m025-797`)

- **Seluruh gerbang lokal `quality.yml` pasca-bump (`432/432`)**:
  - Sapuan paralel + serial (`429/432` lulus pada sapuan utama) + `3/3` verifikasi ulang individual untuk 3 skrip yang mengalami batas waktu/port dinamis saat beban paralel (`ui-render-audit-test.js` PASS seluruh T1–T8, `deploy-site-gate-test.js` 33/33 PASS, `adaptivity-simulation-v3-extended-selftest.js` PASS) -> **432/432 LULUS (0 gagal)**.
  - Audit Rilis (`python release-audit.py` + `tests/release-audit-gate-test.js`): **1.538 PASS / 0 FAIL**, **0 blockers**, versi `5.19.0`.
  - Backend Braincore (`python backend/unit_test.py`): **67 PASS / 0 FAIL**.
  - Sinkronisasi Build & Cangkang PWA (`node tools/bump-build.mjs --check`, `tests/curriculum-cache-version-test.js`, `tests/precache-covers-shell-test.js`, `tests/pwa-release-coherence-test.js`): **Selaras `m025-797`** (33 penegasan cache version + 5 penegasan precache LULUS).
  - Kontrak Golden Bahasa & Anti-Kebocoran (`tests/id-golden-snapshot-test.js`, `tests/th-ui-leak-test.js`, `tests/gate-registry-test.js`): **HIJAU** (`4.751` kunci `id` memiliki padanan `th`, `10/10` gate registry PASS).
  - Bundel Aset APK Android (`node tools/sync-android-assets.mjs --clean && --verify`, `tests/android-asset-bundle-test.js`, `tests/android-app-integrity-test.js`): **884 berkas (89,65 MB)** terikat `m025-797`, **4.679 penegasan LULUS**, **7/7 cek integritas native Android LULUS**.
  - Probe Playwright Kawan Bicara & Update SW (`tests/kawan-mic-update-probe.mjs`): **LULUS 100%** pada `m025-797` (Stage 1 & Stage 2 mic stream PCM16 16 kHz aktif tanpa sentuhan iframe, Mochi menyapa otomatis, `#updateBanner` tampil, cache shell lama dibersihkan).
  - Kontrak Mikrofon Mobile PWA & AEC Barge-In (`tests/mobile-pwa-mic-duplex-test.js`): **LULUS**.
  - Mochi Voice SOS (`tests/mochi-voice-sos-test.js`): **LULUS 27/27**.
  - Regresi Grammar & Placement Purity (`tests/grammar-feedback-regression-test.js`): **24/24 LULUS** (tanpa jeda modal `reteach` saat tes penempatan).

---

## 4. Langkah Berikutnya (Next Steps / Roadmap)

1. Menjalankan verifikasi pasca-bump penuh di `m025-797` (`release-audit.py`, `curriculum-cache-version-test.js`, `id-golden-snapshot-test.js`, `th-ui-leak-test.js`, `gate-registry-test.js`, `mobile-pwa-mic-duplex-test.js`, `kawan-mic-update-probe.mjs`, `mochi-voice-sos-test.js`, Android asset bundle gates, dan guardians `A9/A10/A11/A13`).
2. Membuka Pull Request menuju `main`, memantau seluruh check CI hingga 100% hijau sebelum merge sekuensial.
3. Mengonfirmasi terbitnya build `m025-797` pada situs produksi `https://fiezel.my.id/app/` dan mencatat status target deploy sekunder (`workers/api`, `workers/owner`, `backend`, `build-android-apk`) sesuai pemicu workflow masing-masing.
