# FIEZEL Handoff Dossier — Build m025-529: Audit Penyelesaian Temuan Sosial D1, Pemuatan Malas jsQR, i18n Thai, dan Gerbang Deploy

Otoritas: OWNER / CI Arbiter
Tanggal: 9 Oktober 2026
Branch: `fix/m025-528-audit-social-qr-cleanup`
Target Merge: `main` via PR (sesuai Git Protection Rule)
Build Version: `m025-529` (Hexa-Sync Arbiter Verified, base `origin/main` @ m025-528)

---

## 1. Ringkasan Eksekutif & Temuan yang Dituntaskan

Melanjutkan penyelesaian temuan audit komprehensif tertanggal 9 Oktober 2026 (Audit FIEZEL build m025-526), rilis build `m025-529` ini menuntaskan rangkaian temuan di area Worker D1, performa pemuatan pustaka pihak ketiga, kepatuhan lisensi, paritas bahasa Thai pada modal QR, serta tata kelola berkas pada deployment:

| # | Temuan Audit | Dampak Lapangan | Solusi yang Diimplementasikan di m025-529 |
|---|---|---|---|
| 2 (Server) | **Kueri D1 N+1 di Worker (`/friends/requests`)** | Setiap panggilan `/friends/requests` melakukan perulangan `readProfile` sequential untuk setiap request pending, memakan hingga ~50 kueri D1 per hit. | **SELESAI**: Mengubah kueri di `workers/api/route-social.js` (`routeFriendsRequests`) menjadi single batched query `SELECT ... WHERE sub IN (...)` memanfaatkan `placeholders()`, selaras dengan pola di `routeFriendsList`. |
| 5 | **Literal Bahasa Indonesia di Modal QR (`app.js`)** | Teks tab, tombol aksi, dan label di modal QR ditulis string mentah (hardcoded) sehingga murid Thai melihat UI campur aduk. | **SELESAI**: Semua literal diganti dengan pemanggilan `FiezelI18n.t(...)`, dengan penambahan 8 kunci baru di `copy-id-friend.js` dan terjemahan resmi bahasa Thai di `copy-th-friend.js`. |
| 6 | **jsQR Tanpa Header Lisensi & Dependensi npm Basi** | Berkas vendor `features/social/jsqr.js` tidak memuat notice Apache-2.0, tidak tercantum di `THIRD-PARTY-LICENSES.md`, dan `package.json` memiliki dependensi `jsqr` yang tidak terpakai. | **SELESAI**: Header lisensi Apache-2.0 disematkan resmi di kepala `features/social/jsqr.js`, dicatat di `THIRD-PARTY-LICENSES.md`, dan dependensi npm `jsqr` yang tidak terpakai dibersihkan dari `package.json`. |
| 7 | **jsQR Dimuat di Setiap Booting Aplikasi** | Berkas `jsqr.js` (257 KB) dimuat secara eager di `index.html` menggunakan `defer` dan diprecache di cangkang shell awal. | **SELESAI**: Tag script diubah menjadi `type="fiezel/lazy" data-fiezel-lazy="qr"`, dimuat secara malas (*lazy-loaded*) via `FiezelLazyLoader.load('qr')` hanya saat tab/modal pemindai dibuka atau file galeri dipilih. |
| 9 | **Deploy Menerbitkan Berkas Internal** | File internal seperti `.emergent/`, `.gitconfig`, `.cpanel.yml`, `batch-*.json`, `id-golden-baseline.json`, dan `*-state.json` berpotensi ikut terbit ke produksi. | **SELESAI**: Memperluas aturan `deploy/site-exclude.txt` untuk mengecualikan berkas-berkas internal tersebut tanpa melanggar daftar `ASSETS` sw.js. |
| 14 | **Tidak Ada Gerbang Otomatis untuk Scanner QR** | Temuan regresi scanner QR dan notif throttle sebelumnya tidak memiliki berkas pengujian otomatis di direktori `tests/`. | **SELESAI**: Dibuat gerbang mutu resmi `tests/qr-scanner-test.js` (19 assertions) dan didaftarkan ke pipeline `quality.yml` serta divalidasi oleh `gate-registry-test.js`. |

---

## 2. Bukti Pengujian Empiris & Gerbang Mutu Lokal

Seluruh rangkaian pengujian lokal berhasil dieksekusi dengan hasil 100% HIJAU:

1. **Probe Empiris Playwright (`tools/dev/qr-notif-audit-m025-527-probe.mjs`)**:
   - 10/10 assertions **PASS** (Regex validasi handle, penolakan email/url acak, throttle pertemanan, camera track safety).
2. **Gerbang Mutu QR Baru (`tests/qr-scanner-test.js`)**:
   - 19/19 assertions **PASS** (Unit & contract test regex, timer debounce, gap throttle, lisensi, dan lazy-loading).
3. **Kontrak API Sosial Worker (`tests/social-api-contract-test.js`)**:
   - 107/107 assertions **PASS**.
4. **Cakupan Shell Precache (`tests/precache-covers-shell-test.js`)**:
   - 5/5 assertions **PASS**.
5. **Gerbang Deployment Filter (`tests/deploy-site-gate-test.js`)**:
   - 32/32 assertions **PASS**.
6. **Kebocoran Teks Thai (`tests/th-ui-leak-test.js`)**:
   - **PASS** (0 kebocoran, 3975 kunci ID memiliki padanan TH).
7. **Pendaftaran Gerbang CI (`tests/gate-registry-test.js`)**:
   - **PASS** (10 pass, 0 fail; 365 gerbang bukti sah).
8. **Sinkronisasi Versi Kurikulum (`tests/curriculum-cache-version-test.js`)**:
   - **PASS** (26 penegasan pada build m025-529).
9. **Baseline Emas Indonesia (`tests/id-golden-snapshot-test.js`)**:
   - **HIJAU** (Baseline emas utuh).
10. **Pemeriksaan Hexa-Sync Arbiter (`node tools/bump-build.mjs --check`)**:
    - **Selaras** pada build `m025-529`.

---

## 3. Berkas yang Diubah

- `workers/api/route-social.js`: Optimasi batching `WHERE sub IN (...)` pada kueri profil pending.
- `features/social/jsqr.js`: Penyematan header lisensi resmi Apache-2.0.
- `THIRD-PARTY-LICENSES.md`: Entri atribusi pustaka jsQR 1.4.0.
- `package.json`: Pembersihan dependensi `jsqr`.
- `index.html`: Perubahan pemuatan `jsqr.js` menjadi `type="fiezel/lazy" data-fiezel-lazy="qr"`.
- `app.js`: Integrasi `ensureQrDecoderLoaded()`, perbaikan `async` handler `img.onload`, dan i18n modal QR.
- `features/i18n/copy-id-friend.js`: Penambahan 8 kunci teks `social3.*`.
- `features/i18n/copy-th-friend.js`: Penambahan 8 padanan terjemahan bahasa Thai `social3.*`.
- `deploy/site-exclude.txt`: Penambahan pola exclude berkas internal (.emergent/, .git*, .assetsignore, dll).
- `tests/qr-scanner-test.js`: Berkas gerbang otomatis baru untuk QR scanner & notif.
- `.github/workflows/quality.yml`: Pendaftaran `tests/qr-scanner-test.js` ke alur CI.
- Berkas Hexa-Sync (`m025-529`):
  - `coordination/BUILD-VERSION.json`
  - `sw.js`
  - `core-config.js`
  - `features/neural-voice/fiezel-diag-panel.js`
  - `kurikulum.html`
  - `misi.html`
