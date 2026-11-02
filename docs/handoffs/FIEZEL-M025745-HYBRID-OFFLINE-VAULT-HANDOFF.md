# FIEZEL m025-745: Arsitektur Hybrid Offline-Vault & Cryptographic Lease

Otoritas: OWNER / FIEZEL ARCHITECTURE & GOVERNANCE
Build: `m025-745`
Tanggal: 2 November 2026

Dokumen ini merangkum penyelesaian implementasi arsitektur **Hybrid Offline-Vault** untuk FIEZEL, yang menjamin perlindungan tingkat tinggi terhadap bank soal dan otorisasi level tanpa mengorbankan hak belajar murid yang berada di daerah pelosok tanpa koneksi internet (*zero-network learning*).

---

## 1. Latar Belakang & Prinsip Arsitektur

FIEZEL memiliki komitmen mutlak terhadap murid di daerah minim sinyal (daerah 3T, kereta, pelosok, atau kuota habis). Mewajibkan setiap kuis meminta otorisasi ke server secara online akan menghancurkan kemampuan belajar offline. Namun, meletakkan berkas bank soal dalam bentuk JSON terbuka di peramban membuat konten rentan disedot massal.

Pendekatan **Hybrid Offline-Vault** menyelesaikan dilema ini dengan meniru model enkripsi offline industri besar (seperti Netflix dan Spotify):
1. **Encrypted Bank Cache (AES-256-GCM)**: Bank soal disimpan secara terenkripsi di IndexedDB lokal (`fiezel-vault-v1`).
2. **RAM-Only Decryption**: Dekripsi hanya dilakukan sesaat di dalam memori RAM saat materi dibutuhkan di layar. Tidak ada teks JSON terbuka yang disimpan di disk perangkat.
3. **Cryptographic Lease (14 Hari)**: Murid memegang tiket belajar offline bertanda tangan digital selama 14 hari tanpa butuh internet.
4. **Zero-Lockout Guarantee**: Level A1 dijamin **selalu bisa dibuka** bahkan saat tiket habis, memastikan murid tidak pernah terkunci dari aplikasinya.
5. **Deferred Sync**: Kemajuan kuis dan kelulusan level offline dicatat secara lokal dan direkonsiliasi otomatis ke server saat internet kembali terdeteksi.

---

## 2. Rincian Modul & Implementasi

| Berkas | Peran & Tanggung Jawab |
|---|---|
| `features/security/fiezel-offline-vault.js` | Modul enkripsi AES-256-GCM berbasis Web Crypto API & Node.js crypto. Menyediakan `saveBank()`, `getBank()`, dan `decryptIfEncrypted()`. Menyimpan amplop terenkripsi ke IndexedDB. |
| `features/security/fiezel-offline-lease.js` | Pengelola tiket offline 14 hari. Menyediakan `createLease()`, `verifyLease()`, `isLevelAccessibleOffline()`, serta rekonsiliasi `reconcileOfflineAttempt()`. |
| `app.js` | Mengintegrasikan `load()` dengan `FiezelOfflineVault.getBank()`, menghubungkan `ensureSearchIndex()` ke cache RAM/vault, menandai `syncStatus: 'pending_reconciliation'` pada kelulusan ujian offline, dan merekonsiliasi serta memperbarui lisensi saat `brainSyncFlush()`. |
| `index.html` & `sw.js` | Pendaftaran modul ke cangkang aplikasi dan precache shell Service Worker. |
| `.github/workflows/quality.yml` | Pendaftaran gerbang uji baru `node tests/offline-vault-and-lease-test.js` ke dalam pipeline CI resmi. |
| `tests/offline-vault-and-lease-test.js` | Uji mutu menyeluruh (8/8 PASS) untuk round-trip AES-256-GCM, IndexedDB RAM decryption, manipulasi lease, zero lockout A1, dan precache. |

---

## 3. Bukti Pengujian Mutu (100% HIJAU)

1. `node tests/offline-vault-and-lease-test.js` (8/8 PASS)
2. `node tests/anti-tamper-and-watermark-test.js` (11/11 PASS)
3. `node tests/level-guard-test.js` (51/51 PASS)
4. `node tests/critical-surface-protection-test.js` (9/9 PASS)
5. `node tests/collateral-scope-guard-test.js` (8/8 PASS)
6. `node tests/gate-registry-test.js` (10/10 PASS)
7. `node tests/precache-covers-shell-test.js` (5/5 PASS)
8. `node tests/id-golden-snapshot-test.js` (PASS, baseline emas utuh)
9. `node tests/th-ui-leak-test.js` (PASS, 4674 kunci th selaras)
10. `node tools/bump-build.mjs --check` (Hexa-Sync m025-745 PASS)
11. `node tests/curriculum-cache-version-test.js` (Octa-Sync m025-745 PASS)
