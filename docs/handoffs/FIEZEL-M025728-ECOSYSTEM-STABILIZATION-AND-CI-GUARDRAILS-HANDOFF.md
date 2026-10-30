# FIEZEL RELEASE HANDOFF: m025-728
## Stabilisasi Ekosistem, Penjaga Anti-Senggol Lintas-Domain (A10), Penguncian Branch Protection, & Verifikasi Live PWA Standalone

### 1. Ringkasan Eksekutif & Otoritas Rilis
- **Nomor Build Kanonikal**: `m025-728`
- **Otoritas Rilis**: `OWNER` & `MASTER` approved stabilization protocol
- **Status**: `VERIFIED_READY_FOR_DEPLOY`
- **Cabang**: `feat/stabilize-guardrails-m025-728`
- **Alasan Bump**: `feat(stabilize-auth-pwa-ci): harden CI gates, collateral scope guard, and live PWA verification (m025-728)`

---

### 2. Akar Masalah yang Ditutup
1. **Regresi Lintas-Domain ("Perbaiki A, Bagian C Ikut Rusak")**:
   - Sebelumnya tidak ada penjaga otomatis yang menolak PR fitur (mis. `fix(grammar)` atau `feat(quiz)`) ketika agent diam-diam ikut menyunting fungsi login/boot (`authGateNeeded`, `isLocalTestServer`), manifest PWA, atau workflow CI.
   - `node --check` di CI hanya memeriksa berkas `.js`, sehingga kurung kurawal `{` atau `}` yang tidak seimbang di `style.css` dapat merusak tata letak UI/UX layar lain tanpa terdeteksi.
2. **PR dengan Pemeriksaan Merah Tetap Bisa Di-merge**:
   - Branch protection `main` sebelumnya hanya mewajibkan 1 check (`Auto PR Review & Invariant Audit`), `enforce_admins: false`, dan `strict: false`.
   - Workflow `a9-a14-autonomous-guardians.yml` memicu ulang pada event `edited` dan menjalankan `a14-autonomous-review` dengan `if: always()`, sehingga pembatalan run lama menghasilkan status `FAILURE` palsu dan komentar tanpa rincian baris error.
3. **Ketiadaan Mode Uji Login Asli di Server Lokal & Verifikasi PWA Pasca-Deploy**:
   - Server lokal otomatis melewati login sesuai mandat owner (`m025-723`), namun belum menyediakan sakelar eksplisit untuk mengetes layar login/onboarding produksi secara utuh tanpa menyentuh kode auth.
   - `tools/deploy-site-verify.mjs` belum memeriksa `manifest.json` dan standalone redirect guard di domain akar `https://fiezel.my.id/` sesudah deploy.

---

### 3. Solusi & Perubahan Teknis
1. **A10 Cross-Domain Collateral Scope Guard (`tools/fiezel-guardians.mjs`)**:
   - Memblokir otomatis (`ERROR`, exit code `1`) setiap PR yang menyentuh permukaan terproteksi (`auth`, `onboarding`, `pwa`, `ci-governance`, atau penghapusan > 500 baris runtime inti) tanpa scope conventional commit yang sah atau token `[ALLOW-PROTECTED: ...]`.
   - Mengizinkan bump-build resmi (`SW_REV`, `BUILD-VERSION.json`, `core-config.js`, `fiezel-diag-panel.js`, `?v=m025-XXX`) serta pendaftaran tes baru di `.github/workflows/quality.yml`.
2. **Perbaikan A9–A14 & Pelaporan Balik Otomatis (`.github/workflows/a9-a14-autonomous-guardians.yml`)**:
   - Menghapus trigger `edited` yang memicu pembatalan silang, menyelaraskan `concurrency` per branch kepala, mengubah kondisi `a14-autonomous-review` ke `if: ${{ !cancelled() }}`, dan menyertakan rincian baris `ERROR:`/`WARN:` langsung di komentar PR.
3. **Sakelar Uji Login Produksi Lokal (`app.js`)**:
   - Menambahkan pengecekan `?fz_real_auth=1` di awal `isLocalTestServer()` sehingga pengujian E2E Playwright lokal dapat memverifikasi layar Onboarding dan Login produksi 100% asli, sambil tetap mempertahankan kenyamanan bypass lokal bawaan owner (`m025-723`) dan keamanan 100% di `fiezel.my.id`.
4. **Dua Gerbang Regresi Baru di CI (`quality.yml` & `a10-regression-watcher`)**:
   - `tests/critical-surface-protection-test.js`: Mengunci kemurnian auth produksi, sakelar `?fz_real_auth=1`, ketiadaan tombol bypass tamu, kontrak PWA Standalone (`/app/` & `website/`), keseimbangan kurung `{}` seluruh stylesheet CSS `index.html`, dan kemurnian Kawan Bicara (`#fzMitraKaiwaStudioFrame` -> `call.html`).
   - `tests/collateral-scope-guard-test.js`: 8 skenario positif & negatif atas penjaga cakupan A10.
5. **Verifikasi Live PWA Standalone Pasca-Deploy (`tools/deploy-site-verify.mjs`)**:
   - Memverifikasi `/app/manifest.json`, akar `https://fiezel.my.id/manifest.json` (`display: "standalone"`, `start_url: "/app/"`), serta standalone redirect guard di halaman depan pada setiap deploy produksi.
6. **Perbaikan 2 Korupsi Kurung CSS Produksi yang Tertangkap Gerbang Baru**:
   - `features/ui/fiezel-tactile-clay.css` (baris 1085-1104): Deklarasi ukuran `.btn-course-selector` terpotong keluar blok dengan `}` berlebih akibat sisipan aturan sebelumnya.
   - `features/speaking-listening/panggung-suara.css` (baris 1139-1155): Blok `@keyframes fzStageRise` belum ditutup dengan `}`, sehingga menelan aturan kontras putih `.listening-modal` di bawahnya.
7. **Aturan Mutlak #0 di `AGENTS.md` & Perbaikan Path Windows di `tools/dev/serve-static.js`**.

---

### 4. Bukti Pengujian Empiris & Gerbang Mutu
- `node tools/fiezel-guardians.mjs self-test` -> **PASS**
- `node tests/critical-surface-protection-test.js` -> **PASS**
- `node tests/collateral-scope-guard-test.js` -> **PASS**
- `node tests/pwa-standalone-ecosystem-test.js` -> **PASS**
- `node tests/boot-auth-verdict-test.js` -> **PASS**
- `node tests/auth-screen-test.js` -> **PASS**
- `node tests/onboarding-test.js` -> **PASS**
- `node tests/workflow-timeout-gate-test.js` -> **PASS**
- `node tests/workflow-actor-gate-test.js` -> **PASS**
- `node tests/deploy-site-gate-test.js` -> **PASS**
- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS**
- `node tools/dev/probe-critical-surfaces.mjs` (Playwright Chromium Headless) -> **5/5 Permukaan Kritis PASS + 5 Baseline Screenshot**

---

### 5. Daftar Berkas yang Disentuh
- `AGENTS.md`
- `.github/workflows/a9-a14-autonomous-guardians.yml`
- `.github/workflows/quality.yml`
- `app.js`
- `features/ui/fiezel-tactile-clay.css`
- `features/speaking-listening/panggung-suara.css`
- `tools/fiezel-guardians.mjs`
- `tools/deploy-site-verify.mjs`
- `tools/dev/serve-static.js`
- `tools/dev/probe-critical-surfaces.mjs`
- `tests/critical-surface-protection-test.js`
- `tests/collateral-scope-guard-test.js`
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`
- `docs/handoffs/FIEZEL-M025728-ECOSYSTEM-STABILIZATION-AND-CI-GUARDRAILS-HANDOFF.md`

---

### 6. Status Branch Protection & Utang Teknis Lanjutan
1. **GitHub Branch Protection `main` (AKTIF)**: `strict: true`, `enforce_admins: true`, `allow_force_pushes: false`, `allow_deletions: false`, dengan 10 required status checks (`quality`, `MASTER-only authority`, `A6 Automated Verification`, `A7 Automated Release Safety`, `A9 Security Sentinel`, `A10 Regression Watcher`, `A11 Release Readiness Auditor`, `A13 Handoff Keeper`, `A14 Autonomous Review`, `Auto PR Review & Invariant Audit`).
2. **Utang Teknis Lanjutan (Fase 4)**: Memecah `app.js` dan `style.css` secara bertahap per modul fitur di bawah perlindungan gerbang permukaan kritis dan A10 Collateral Scope Guard yang kini telah aktif.
