# FIEZEL HANDOFF DOSSIER: BUILD m025-752 (OWNER / MASTER DIRECTIVE)

## 1. Identitas & Status Rilis
- **Build Nomor**: `m025-752`
- **Tanggal Rilis**: 3 November 2026
- **Otoritas**: OWNER & MASTER Exclusive Mandate
- **Status**: SIAP MERGE & DEPLOY (100% HIJAU)
- **Cakupan Scope**: `fix(ci,quality): [ALLOW-PROTECTED: ci]`

---

## 2. Mandat Khusus Owner: Penguncian Mesin Tiga Invarian Krusial
Atas perintah eksplisit OWNER, tiga kesalahan fatal sebelumnya dikunci secara mekanis agar tidak akan pernah bisa terulang di masa depan:

1. **Invarian 1: Wire Dashboard Owner <-> Akun PWA Murid (Owner-Learner Wire Invariant)**:
   - Pengiriman permata (`grant-gems`) dan pengiriman pesan (`send-message`) dari Dashboard Owner ke murid via email Google atau handle sosial wajib menemukan `sub` kanonikal murid dari tabel `auth_email`.
   - Skema saldo `state.gems` murid wajib dipertahankan melalui `sanitizeGems()` dan struktur `{ balance: number }` tanpa korupsi.
   - Penegak Mutu: `tests/owner-gem-wire-e2e-test.js` dan `tests/tri-core-invariants-gate-test.js` (Pilar 1).

2. **Invarian 2: Shell PWA Bebas Tersangkut & Rehidrasi Progres (Zero-Stale-Shell & Offline Vault Invariant)**:
   - Navigasi update PWA (`?fz_upd=...`, `?__fz_fresh=...`, `?fz_healed=...`) wajib dilayani dengan strategi *network-first* (`isUpdateNav`) di `sw.js`.
   - Cache materi IndexedDB `features/security/fiezel-offline-vault.js` wajib menolak materi dengan nomor build berbeda dan membersihkannya via `purgeStaleBuilds()`.
   - Normalisasi riwayat sinkronisasi di `app.js` (`normalizeHistoryRow`) wajib menjaga nilai numerik `at` agar tidak menghasilkan `NaN`.
   - Penegak Mutu: `tests/progress-legacy-upgrade-gate-test.js` dan `tests/tri-core-invariants-gate-test.js` (Pilar 2).

3. **Invarian 3: Auth Login Google & Registrasi Bebas Blokir (Auth CSP Superset Invariant)**:
   - Header `Content-Security-Policy` di server cPanel (`website/.htaccess`) wajib menjadi SUPERSET dari `<meta>` CSP di `index.html`.
   - `accounts.google.com` dilarang keras dihilangkan dari `script-src`, `style-src`, dan `frame-src`.
   - `connect-src` wajib mengizinkan `api.fiezel.my.id` (atau `https: wss:`).
   - Penegak Mutu: `tests/csp-header-superset-gate-test.js` dan `tests/tri-core-invariants-gate-test.js` (Pilar 3).

---

## 3. Berkas yang Diperbarui
1. `tests/tri-core-invariants-gate-test.js`: Gerbang komposit baru yang memvalidasi ketiga pilar krusial secara serentak (25/25 PASS).
2. `.github/workflows/quality.yml`: Pendaftaran `node tests/tri-core-invariants-gate-test.js` di Meja 1 Quality Gate.
3. `tools/fiezel-guardians.mjs`: Penambahan pengawasan otomatis di Bagian 6 `auditCollateralScope()` A10 untuk mendeteksi penghapusan CSP superset, penghapusan `isUpdateNav`, penghapusan `purgeStaleBuilds`, atau penghapusan resolusi sub `auth_email`.
4. `AGENTS.md`: Dokumentasi aturan baku Bagian 18 bagi seluruh agent masa depan.
5. `coordination/BUILD-VERSION.json` & seluruh titik Hexa/Octa-Sync: Build kanonikal `m025-752`.

---

## 4. Langkah Berikut & Roadmap Lanjutan (Next Steps / Roadmap)
1. Commit dan push branch `feat/invariants-lock-m025-752`.
2. Buka Pull Request berlabel `[ALLOW-PROTECTED: ci]`.
3. Verifikasi penggabungan ke branch `main`.
4. Lakukan teardown worktree lokal.
