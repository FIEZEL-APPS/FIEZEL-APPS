# Hotfix Onboarding Safe-Area Header & Mochi SOS Cross-Origin Session Auth (m025-798)

Otoritas: OWNER / MASTER (`FIEZEL-APPS`).

Status: **SIAP RILIS (`m025-798`)** — memperbaiki tumpukan header/topbar onboarding pada status bar / Dynamic Island iOS standalone PWA serta memulihkan koneksi AI Gemini Live dan banner coba-lagi Mochi Voice SOS di worktree terisolasi `fix/onboarding-topbar-and-mochi-sos-m025-798`.

---

## 1. Ringkasan Temuan Audit & Perbaikan

1. **Header & Topbar Onboarding Menabrak Status Bar / Dynamic Island & Telinga Mochi (`features/ui/fiezel-tactile-clay.css`)**:
   - **Akar masalah**: Aturan `.fiezel-ob .fiezel-ob-reveal` (`#9869`, `#11227`, `#11278`) dan `.fiezel-ob .fiezel-stage` (`#10186`, `#11312`) pada `features/ui/fiezel-tactile-clay.css` memakai tinggi tetap (`204px`/`142px`), `padding-top` kecil (`10px`/`14px`/`18px`), serta posisi absolut `top: 38px`/`62px` tanpa memperhitungkan `env(safe-area-inset-top, 0px)`. Pada PWA standalone iOS (`viewport-fit=cover`, safe-area ~59px), logo `FIEZEL`, tagline *"Learn Beyond Languages."*, dan tombol `< Kembali` bertabrakan langsung dengan jam/status bar serta telinga maskot Mochi.
   - **Perbaikan**: Menambahkan variabel `--fz-ob-safe-top: env(safe-area-inset-top, 0px)` serta menyelaraskan seluruh `padding-top`, `height`/`min-height`/`max-height` `.fiezel-ob-reveal` (baik dengan `.fiezel-stage` maupun `:not(:has(.fiezel-stage))`) dan `top` `.fiezel-stage` (termasuk jarak ekstra pada step awal `:has(.fz-ob-header-row)` agar *"Learn Beyond Languages."* selalu terpisah bersih dari telinga Mochi).
2. **Mochi Voice SOS Gagal Menghubungkan AI Gemini Live (`features/mascot/fiezel-mochi-voice-sos.js`)**:
   - **Akar masalah**:
     - `fetchLiveSessionToken()` mengirim `POST https://api.fiezel.my.id/api/voice/live-session` tanpa `credentials: 'include'`, `mode: 'cors'`, dan `cache: 'no-store'`. Karena cookie sesi `fz_id` berada pada domain saudara (`fiezel.my.id` / `.fiezel.my.id`), seluruh permintaan produksi ditolak Worker dengan **HTTP 401 (`unauthenticated`)** tanpa pemulihan sesi anonim (`/api/auth/anon`). Hal yang sama juga terjadi pada `reportDrop()`.
     - `renderConnectionBannerInternal()` menghapus `#fzMochiConnBanner` seketika saat `st === 'error'`, membuat tombol `#fzMochiConnRetryBtn` (*"Coba lagi"*) hilang di produksi sementara panggilan tetap menggantung.
     - Bila panggilan ditutup sebelum ada audio AI (`turnsDelivered === 0 && !firstAudioAt`), gem prabayar dari modal konfirmasi belum dikembalikan otomatis, dan pengguna dengan sisa saldo < 2 pasca-prabayar tidak bisa menekan coba-lagi (`canCall()`).
   - **Perbaikan**:
     - Menambahkan `credentials: 'include'`, `cache: 'no-store'`, serta `mode: 'cors'` untuk origin Worker eksternal pada `fetchLiveSessionToken()` dan `reportDrop()`.
     - Menambahkan `ensureAnonSessionForBase()` *single-flight* dengan proteksi cooldown 429 untuk memulihkan sesi melalui `/api/auth/anon` dan mencoba ulang `/api/voice/live-session` sekali bila mendapat HTTP `401`, plus jeda 15 detik pada *background prewarm* gagal agar tidak membombardir Worker.
     - Mempertahankan render `#fzMochiConnBanner` beserta `#fzMochiConnRetryBtn` ketika status `'error'` (auto-hide 10 detik untuk error/quota), membedakan status `'quota'` (HTTP 429) vs `'error'`, memperbolehkan retry lewat status prabayar di `canCall()`, mengembalikan gem prabayar di `closeCall()` bila belum ada audio AI yang terputar, serta menghindari duplikasi endpoint Render pada `_fallbackSpeechTurn()`.

---

## 2. Daftar Berkas yang Disentuh

- `features/ui/fiezel-tactile-clay.css`
- `features/mascot/fiezel-mochi-voice-sos.js`
- `tests/mochi-voice-sos-test.js`
- `tests/onboarding-test.js`
- Sinkronisasi build `m025-798`: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `call.html`, `features/voice-studio/call.html`, `kurikulum.html`, `misi.html`, `android/app/src/main/assets/public/**`
- `docs/handoffs/FIEZEL-M025798-ONBOARDING-MOCHI-SOS-HOTFIX-HANDOFF.md`

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu (`m025-798`)

- **Mochi Voice SOS (`tests/mochi-voice-sos-test.js`)**: **28/28 LULUS** (termasuk verifikasi `credentials: 'include'`, `mode: 'cors'`, pemulihan `401 -> /api/auth/anon -> WebSocket`, dan tampilan banner coba-lagi saat error) + `brain-fsrs-oracle` (**30/30**) + `japanese-grammar-conjugator` (**36/36**).
- **Onboarding & Safe-Area (`tests/onboarding-test.js` + Playwright Layout Probe)**: **LULUS** pada viewport iPhone `390x844` (`safeTop: 59px`), Android `390x844` (`safeTop: 0px`), dan Desktop `1280x800` untuk Step 0–3 dengan nol tumpang tindih status bar maupun telinga Mochi.
- **Playwright End-to-End Hotfix Verification**: **LULUS** — membuktikan pemulihan `401 -> /api/auth/anon -> 200 -> WebSocket setupComplete` pada `models/gemini-3.8-live`, tampilan `#fzMochiConnBanner` + `#fzMochiConnRetryBtn`, serta pengembalian 10 gem prabayar saat panggilan ditutup sebelum audio AI berjalan.
- **PWA, Konten, & Android (`m025-798`)**:
  - `node tools/bump-build.mjs --check`: **Selaras** (`m025-798`)
  - `tests/curriculum-cache-version-test.js`: **PASS** (`33 penegasan, 3 halaman, m025-798`)
  - `tests/precache-covers-shell-test.js`: **5/5 PASS**
  - `tests/pwa-release-coherence-test.js`: **PASS**
  - `tests/android-asset-bundle-test.js`: **4.679 penegasan LULUS** (`884 berkas`, `89,66 MB`, `m025-798`)
  - `tests/android-app-integrity-test.js`: **7/7 PASS**
  - `tests/kawan-mic-update-probe.mjs`: **100% PASS** (Kawan Bicara PCM 16kHz & update banner SW bersih)
  - `tests/ui-render-audit-test.js`: **PASS** (`T1–T8 hijau`)
  - `tests/id-golden-snapshot-test.js`, `tests/th-ui-leak-test.js` (`4751/4751`), `tests/gate-registry-test.js` (`10/10`), `tests/grammar-feedback-regression-test.js` (`24/24`), `tests/deploy-site-gate-test.js` (`33/33`), `tests/secret-scan-test.js` (`46/46`), serta `release-audit.py` + `tests/release-audit-gate-test.js` (`1.254 check PASS, 0 FAIL, 0 blockers`): **HIJAU**.

---

## 4. Langkah Berikutnya (Next Steps / Roadmap)

1. Membuat Pull Request ke branch `main` dengan cakupan `[ALLOW-PROTECTED: onboarding, pwa, auth]`, memantau seluruh gerbang CI (`FIEZEL Quality Gate`, `A6/A7/A9/A10/A11/A13/A14`, `Auto PR Review & Invariant Audit`, `MASTER-only authority`) hingga 100% hijau.
2. Setelah merge ke `main`, memantau workflow `FIEZEL Deploy Site` hingga selesai, lalu memverifikasi situs produksi `https://fiezel.my.id/app/` (`deploy-site-verify.mjs` `m025-798`), tampilan onboarding iOS viewport, dan konektivitas Mochi Voice SOS langsung di produksi.
