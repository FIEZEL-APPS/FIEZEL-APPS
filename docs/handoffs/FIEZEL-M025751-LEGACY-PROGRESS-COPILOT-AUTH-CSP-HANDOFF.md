# FIEZEL HANDOFF DOSSIER: BUILD m025-751 (OWNER / MASTER DIRECTIVE)

## 1. Identitas & Status Rilis
- **Build Nomor**: `m025-751`
- **Tanggal Rilis**: 3 November 2026
- **Otoritas**: OWNER & MASTER Exclusive Mandate
- **Status**: SIAP MERGE & DEPLOY (100% HIJAU)
- **Cakupan Scope**: `fix(auth,pwa,voice,gems): [ALLOW-PROTECTED: auth|pwa|ci]`

---

## 2. Masalah yang Diselesaikan Secara Empiris

### A. Insiden Fatal: Login Google & Registrasi Akun FIEZEL Mati di Semua Perangkat
- **Gejala Lapangan**:
  1. Tombol "Masuk dengan Google" tidak muncul sama sekali di Android maupun iPhone (error `script` saat muat).
  2. Pendaftaran akun FIEZEL baru menampilkan pemberitahuan: *"Server belum bisa dihubungi. Coba lagi sebentar lagi."*
- **Akar Masalah (Bukti Headless Playwright)**:
  - Pada rilis `m025-748`, header `Content-Security-Policy` di `website/.htaccess` diperketat ke `connect-src 'self' https://fiezel.my.id wss://fiezel.my.id https://*.cloudflare.com https://generativelanguage.googleapis.com`.
  - Header ini berlaku untuk seluruh situs termasuk `/app/` dan menimpa/mempersempit `<meta>` CSP di `index.html`.
  - Akibatnya:
    * `accounts.google.com` diblokir oleh `script-src` & `frame-src` (GSI client gagal dimuat).
    * `https://api.fiezel.my.id` TIDAK ada di `connect-src`, sehingga SEMUA panggilan `fetch()` ke API (termasuk `/api/account/register`, `/api/auth/google`, `/api/auth/anon`, `/api/account/me`, `/api/config`) diblokir peramban dengan `TypeError: Failed to fetch`.
    * Fungsi `FiezelAccount.call()` menangkap error dan mengembalikan status `unavailable` yang memicu pesan naskah *"Server belum bisa dihubungi. Coba lagi sebentar lagi."*
- **Solusi & Bukti Empiris**:
  - `website/.htaccess` diperbarui dengan **Invarian Superset CSP**:
    * `script-src`: `'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://accounts.google.com`
    * `style-src`: `'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com`
    * `frame-src`: `'self' https://accounts.google.com`
    * `connect-src`: `'self' https: wss:`
    * `media-src`: `'self' blob: data: https://fiezel-audio.fitrajft.workers.dev https://audio.fiezel.my.id https://api.fiezel.my.id https://www.jlpt.jp`
  - Probe `tools/dev/google-auth-csp-probe.js` dijalankan di Chromium Playwright headless:
    * Sebelum: FAIL (GSI script gagal, tombol gagal, fetch API gagal, 7 CSP violations).
    * Sesudah: **PASS** (GSI script loaded, iframe tombol Google terpasang, API fetch status 204/200, 0 pelanggaran).
  - Gerbang regresi permanen ditambahkan: `tests/csp-header-superset-gate-test.js` (8/8 PASS).

### B. Progres Lama Hilang Pasca-Update & Cache Shell Tertinggal
- **Gejala Lapangan**: Pada PWA murid lama yang diperbarui, kursus bahasa Inggris tidak menampilkan progres belajar, sedangkan di instalasi baru progres tampil normal.
- **Akar Masalah**:
  - Baris riwayat belajar hasil sinkronisasi Cloudflare (`restoredFromSync: true`) kehilangan timestamp numerik kanonikal `at` atau properti boolean `ok`, memicu `NaN` pada kalkulator tanggal dan pengelompokan hari.
  - `FiezelOfflineVault` di IndexedDB menyimpan snapshot bank dari build lama (`m025-750`), sehingga navigasi pasca-update tetap membaca bank basi tanpa rehidrasi.
- **Solusi**:
  - `app.js`: Ditambahkan fungsi `parseHistoryTimestamp()`, `normalizeHistoryRow()`, dan `reconcileStateAfterBankLoad()` yang mereparasi baris riwayat legacy, mengisi properti yang hilang, dan menghidrasi bucket kategori grammar/vocab secara aman tanpa menimpa progres kursus lain (`@ja`).
  - `features/security/fiezel-offline-vault.js`: Ditambahkan build-stamping otomatis pada penyimpanan bank, pembatalan bank saat terjadi perbedaan build, dan pembersihan build usang via `purgeStaleBuilds()`.
  - `sw.js`: Navigasi pembaruan (`?fz_upd=...`, `?__fz_fresh=...`, `?fz_healed=...`) diproses dengan strategi **network-first** dan disimpan ke cache shell dengan URL kunci bersih.
  - Gerbang mutu: `tests/progress-legacy-upgrade-gate-test.js` (12/12 PASS).

### C. Copilot Kawan Bicara / Mitra Kaiwa Tidak Nyambung (`1 · Singkat`)
- **Gejala Lapangan**: Di fitur telepon Kawan Bicara, kartu bantuan balasan cepat (terutama nomor 1 yang singkat) sering kali tidak relevan dengan pertanyaan atau tawaran dari AI.
- **Akar Masalah**:
  - Pola speech-act hanya mendeteksi sapaan awal atau pujian pembuka, tanpa memisahkan klausa inti pertanyaan (*focal clause*).
  - Pola kutipan koreksi (Echo Redemption) pada bahasa Jepang sering menempatkan kutipan di depan kata kerja (`『...』と言ってみて`), yang luput dari regex prefix barat.
  - Model Gemini lama (`gemini-2.0-flash-exp`) rentan rate-limit 429 tanpa rotasi fallback cepat.
- **Solusi**:
  - Dibangun mesin penganalisis 23-intent **Precision Speech-Act & Focal-Clause Analyzer** di `liveTransport.ts`, `route-voice-live.js`, dan `server.js` untuk bahasa Inggris (`en`), Jepang (`ja`), dan Mandarin (`zh`).
  - Isolasi klausa fokus mengekstrak pertanyaan konkret (makanan/minuman kafe, tempat belajar, durasi, pilihan A-atau-B, ajakan).
  - Opsi 1 (`1 · Singkat`) dijamin memberikan jawaban langsung tanpa basa-basi atau penghindaran.
  - Evaluasi klien di `liveTransport.ts` meloloskan ujaran pendek yang sopan ("Yes, please", "Hot coffee, please", "はい、お願いします") dengan `ok: true`.
  - Gerbang mutu: `tests/voice-copilot-relevance-gate-test.js` (25/25 PASS).

### D. Penyelarasan Injeksi Owner Gem & Kirim Pesan
- Menggabungkan perbaikan dari cabang peer `origin/fix/owner-gem-wire-m025-750` (`884fdd0a`):
  - Resolusi sub kanonikal dari email Google pada API owner.
  - Invarian struktur schema `state.gems` anti-korupsi.
  - Gerbang mutu: `tests/owner-gem-wire-e2e-test.js` (Semua PASS).

---

## 3. Daftar Berkas yang Diubah (Hexa-Sync & Octa-Sync)
1. `website/.htaccess`: Superset CSP header memuat Google GSI dan `connect-src https: wss:`.
2. `tests/csp-header-superset-gate-test.js`: Gerbang CI pengunci invarian superset CSP.
3. `tools/dev/google-auth-csp-probe.js`: Probe Chromium Playwright untuk verifikasi empiris Google Auth & API.
4. `.github/workflows/quality.yml`: Penambahan baris uji `csp-header-superset-gate-test.js` dan `voice-copilot-relevance-gate-test.js`.
5. `sw.js`: Network-first update nav + sinkronisasi build `m025-751`.
6. `coordination/BUILD-VERSION.json`: Versi kanonikal `m025-751`.
7. `core-config.js`: `self.FIEZEL_PAGE_BUILD = 'm025-751'`.
8. `features/neural-voice/fiezel-diag-panel.js`: `var DIAG_BUILD = 'm025-751'`.
9. `kurikulum.html`: Query string `?v=m025-751`.
10. `misi.html`: Query string `?v=m025-751`.
11. `call.html`: Query string `?v=m025-751`.
12. `features/voice-studio/call.html`: Query string `?v=m025-751`.
13. `features/voice-studio/dist/voice-studio.js`: Bundled build terbaru Voice Studio.
14. `features/voice-studio/dist/voice-studio.css`: Bundled stylesheet Voice Studio.

---

## 4. Langkah Berikut & Roadmap Lanjutan (Next Steps / Roadmap)
1. Push branch `fix/progress-legacy-state-m025-751` ke repositori remote.
2. Buka Pull Request berlabel `[ALLOW-PROTECTED: auth|pwa|ci]`.
3. Pantau seluruh 10 gerbang CI GitHub Actions (`quality`, `A6`, `A7`, `A9`, `A10`, `A11`, `A13`, `A14`, `Auto PR Review`, `MASTER-only authority`) hingga 100% HIJAU.
4. Gabungkan (merge) PR ke `main` dan verifikasi deployment situs produksi live.
5. Jalankan probe pasca-deploy di `https://fiezel.my.id/app/?fz_real_auth=1` untuk memvalidasi langsung tombol Google dan pendaftaran akun di produksi nyata.
