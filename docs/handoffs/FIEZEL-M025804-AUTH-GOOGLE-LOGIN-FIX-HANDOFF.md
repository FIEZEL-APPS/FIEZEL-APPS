# FIEZEL m025-804 — Handoff Perbaikan Login Google & Login Akun FIEZEL

- **Status**: SIAP_PR_DAN_CI (lulus 100% uji unit, kontrak skema, CSS/DOM, guardian A10/A11/A13 lokal, dan Playwright e2e; menunggu CI PR, merge ke `main`, deploy site + deploy Cloudflare API Worker, serta verifikasi live pasca-deploy).
- **Build Target**: `m025-804` (naik +1 dari `origin/main` `054a012d` / `m025-803`).
- **Otoritas**: OWNER / MASTER (`[ALLOW-PROTECTED: auth, pwa]`, cakupan eksplisit `fix(auth):`).
- **Cabang / Worktree**: `fix/auth-google-and-account` (worktree terisolasi di luar root workspace).

---

## 1. Ringkasan Temuan Audit Empiris & Akar Masalah

Dua regresi autentikasi produksi yang melumpuhkan baik **Masuk dengan Google** maupun **Masuk dengan Akun FIEZEL** terbukti disebabkan oleh dua bug terpisah:

### Akar Masalah #1 — Backend Cloudflare Workers: Cross-Request Promise Trap (`HTTP 500 {"error":"internal_error"}`)
1. **Bukti Empiris Produksi (`wrangler tail fiezel-api` + probe `POST /api/account/login`)**:
   - Commit `c97b5d6f` (`m025-797`, di-deploy ke `fiezel-api` pada `2026-11-17T14:33:40Z`) mengubah `ensureAuthSchema(db)` di `workers/api/auth-schema.js` dari penanda boolean menjadi `WeakMap` yang menyimpan **objek `Promise`** (`pending`) bersama dengan `workers/api/social-schema.js` dan `workers/api/legacy-schema.js`.
   - Karena `workers/api/wrangler.toml` memakai `compatibility_date = "2026-06-01"` (mengaktifkan `handle_cross_request_promise_resolution`), binding D1 `env.CORE_DB` dipakai ulang lintas permintaan pada isolate yang sama. Begitu permintaan pertama berakhir, setiap permintaan berikutnya yang `await` Promise cache tersebut (`POST /api/account/login`, `POST /api/auth/google`, `GET /api/auth/session`, `/api/account/me`, `/api/account/register`, `/api/account/teacher-activate`) langsung melempar exception di runtime Workers:
     `Error: This promise was created by a request that has since ended, so it can never settle.`
   - Telemetry live pada node edge `CGK` menunjukkan 100% HTTP `500 internal_error`, sementara isolate dingin (`SIN`) menghabiskan ~6.4–7.2 detik menjalankan 25 DDL berurutan satu per satu.
2. **Perbaikan (`workers/api/auth-schema.js`, `workers/api/social-schema.js`, `workers/api/legacy-schema.js`)**:
   - Mengganti `WeakMap` penyimpan `Promise` menjadi `WeakSet` penanda penyelesaian boolean (`APPLIED` / `ENSURED`), yang **hanya** ditandai sesudah eksekusi sukses (`APPLIED.add(db)` setelah `await`), sehingga kegagalan DDL tetap fail-closed tanpa meracuni permintaan berikutnya dan tidak ada `Promise` lintas-permintaan yang pernah disimpan.
   - Menggunakan eksekusi `db.batch(DDL.map((s) => db.prepare(s)))` (satu round-trip D1 pada isolate dingin) dengan fallback sekuensial hanya bila `db.batch` tidak tersedia pada stub/lingkungan uji.

### Akar Masalah #2 — Frontend Auth Screen & Google Identity (`gsi/client`)
1. **Bukti Empiris Playwright**:
   - `.fz-auth-google-overlay` di `features/auth/fiezel-auth-screen.js` memakai `pointer-events: auto` menutupi `inset: 0`. Akibatnya, saat `gsi/client` belum selesai memuat atau di tepi kanan/kiri tombol pil desktop (`460x52` tombol native vs iframe GSI max width `400px` terpusat), klik mendarat di `DIV.fz-auth-google-overlay` dan tertelan (tidak mencapai `nativeBtn.onclick` maupun iframe Google).
   - `features/ui/mobile-edge-fit.css` menetapkan `.fz-auth-google { display: flex !important; }`, menimpa atribut `[hidden]` (`display: none`) sehingga wadah tombol tetap tampak saat Google diblokir/disembunyikan.
   - `features/auth/fiezel-google.js` memakai `LOAD_TIMEOUT_MS = 8000` (terlalu singkat pada pemuatan dingin) dan tidak memetakan `internal_error` sebagai gangguan server; `fiezel-auth-screen.js` mengunci `googleGagal = true` di scope modul secara permanen dan belum memanggil `preload()` pada layar Selamat datang.
2. **Perbaikan (`features/auth/fiezel-google.js`, `features/auth/fiezel-auth-screen.js`, `style.css`, `features/ui/mobile-edge-fit.css`)**:
   - `.fz-auth-google-overlay` diubah ke `pointer-events: none; border-radius: 9999px;`, dan CSS mengaktifkan `pointer-events: auto !important` khusus pada anak/iframe di dalam overlay, serta `.fz-auth-google[hidden] { display: none !important; }` di `style.css` & `features/ui/mobile-edge-fit.css`.
   - `FiezelGoogle.preload()` ditambahkan & dipanggil saat `FiezelAuthScreen.show()` terbuka; `LOAD_TIMEOUT_MS` dinaikkan ke `15000`; `messageFor` memetakan `internal_error`; `renderButton` membersihkan `host.innerHTML` sebelum render dan menjaga lebar `200..400px`.
   - `googleGagal` & `mountSeq` dipindah per-sesi `show()`, mencegah race async lintas switch tab Daftar/Masuk/Guru, mereset catatan error saat render berhasil, dan mengizinkan retry saat klik tombol native sebelum SDK siap.

---

## 2. Daftar Berkas yang Disentuh

- Backend Worker:
  - `workers/api/auth-schema.js`
  - `workers/api/social-schema.js`
  - `workers/api/legacy-schema.js`
- Frontend Auth & CSS:
  - `features/auth/fiezel-google.js`
  - `features/auth/fiezel-auth-screen.js`
  - `style.css`
  - `features/ui/mobile-edge-fit.css`
- Regresi, Golden Baseline, Build Sync & Handoff:
  - `tests/auth-cross-request-regression-test.js` (uji regresi baru: W1/W2 cross-request Worker isolate + F1/F2 CSS/preload + F3 Chromium e2e login Google & akun)
  - `.github/workflows/quality.yml` (pendaftaran `node tests/auth-cross-request-regression-test.js`)
  - `id-golden-baseline.json` (regenerasi checksum 8139 literal Indonesia; jumlah literal & makna naskah murid 100% identik)
  - `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `index.html`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` (bumpbuild resmi ke `m025-804`)
  - `docs/handoffs/FIEZEL-M025804-AUTH-GOOGLE-LOGIN-FIX-HANDOFF.md`

---

## 3. Hasil Uji Pasca-Bump (`m025-804`)

Seluruh gerbang mutu di bawah dijalankan **setelah** `node tools/bump-build.mjs` ke `m025-804` dan **semuanya PASS (exit 0)**:
- `node tools/bump-build.mjs --check` → `Selaras` (`m025-804` di 6 titik + halaman berversi)
- `node tests/auth-cross-request-regression-test.js` → `5/5 PASS` (`W1`, `W2`, `F1`, `F2`, `F3` Playwright Chromium e2e)
- `node tests/curriculum-cache-version-test.js` → `PASS` (33 penegasan, 3 halaman, build `m025-804`)
- `node tests/install-health-test.js` → `PASS`
- `node tests/pwa-release-coherence-test.js` → `PASS`
- `node tests/android-asset-bundle-test.js` → `PASS` (5169 penegasan, 982 berkas, `m025-804`)
- `node tests/id-golden-snapshot-test.js` → `PASS` (`8139` literal, `13` file terkunci)
- `node tests/th-ui-leak-test.js` → `PASS` (`4751` kunci `id` bersesuaian `th`)
- `node tests/gate-registry-test.js` → `PASS` (10 pass, 0 fail; `454` berkas uji, `441` invokasi workflow)
- `node tests/auth-schema-contract-test.js` → `195/195 PASS`
- `node tests/social-schema-contract-test.js` → `79/79 PASS`
- `node tests/google-auth-route-test.js` → `15/15 PASS`
- `node tests/google-auth-core-test.js` → `21/21 PASS`
- `node tests/google-auth-ui-test.js` → `12/12 PASS`
- `node tests/account-auth-client-test.js` → `41/41 PASS`
- `node tests/auth-screen-test.js` → `11/11 Node + C1-C4 Playwright PASS`
- `node tests/csp-header-superset-gate-test.js` → `8/8 PASS`
- `node tests/precache-covers-shell-test.js` → `5/5 PASS`
- `node tests/css-keyframe-uniq-test.js` → `135/135 PASS`
- `node tests/caller-reacts-test.js` → `13/13 PASS`
- `node tools/fiezel-guardians.mjs self-test` → `PASS`

*(Catatan: `release-audit.py` 1541 checks, `tests/release-audit-gate-test.js` 12 checks, `validator.js`, `tests/subagent1-backend-audit-test.js`, `tests/social-api-contract-test.js`, `tests/auth-role-test.js`, dan `tests/role-security-test.js` juga berjalan PASS.)*

---

## 4. Langkah Berikutnya (Next Steps / Roadmap Rilis)

1. Buka Pull Request `fix/auth-google-and-account` → `main` dengan judul:
   `fix(auth): fix Worker cross-request schema 500s and Google login button reliability (m025-804) [ALLOW-PROTECTED: auth, pwa]`
2. Pantau seluruh 10+ gerbang CI (`quality`, `A6`–`A14`, `Auto PR Review & Invariant Audit`) sampai 100% hijau, lalu merge ke `main`.
3. Setelah merge:
   - Pantau `FIEZEL Deploy Site` (`deploy-site.yml`) sampai selesai dan verifikasi `https://fiezel.my.id/app/` menyajikan `m025-804`.
   - Picu & pantau `FIEZEL API Worker Deploy` (`deploy-api-worker.yml`) di branch `main` (karena workflow Worker deploy dipicu `workflow_dispatch` atau sesuai pemicunya) agar `workers/api/*` yang baru benar-benar aktif di `https://api.fiezel.my.id`.
4. Jalankan probe verifikasi produksi langsung ke `https://api.fiezel.my.id` (`0` error `500` berulang kali + alur `anon -> register -> login -> me -> session -> logout`) serta Playwright ke `https://fiezel.my.id/app/?fz_real_auth=1` untuk memastikan tombol Google & login FIEZEL pulih sepenuhnya.
