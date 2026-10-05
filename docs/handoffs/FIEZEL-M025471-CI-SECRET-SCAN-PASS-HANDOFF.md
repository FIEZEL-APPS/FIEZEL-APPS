# Berkas Serah Terima: FIEZEL-M025471-CI-SECRET-SCAN-PASS-HANDOFF.md
Tanggal: 2026-10-05
Versi Rilis: `m025-471`
Komponen: CI Quality Gate & Secret Scanner (`tools/fiezel-bot.mjs`, `tests/secret-scan-test.js`)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

Pada saat integrasi dan merge fitur Panel Game (bottom nav button Game, kartu poster game PAW ARENA, dan Bug Arena Boss Raid), workflow CI `FIEZEL Quality Gate` pada GitHub Actions runner gagal di langkah `Core validation`.

### Akar Masalah:
- Berkas `tools/fiezel-bot.mjs` baris 800 pada pengujian internal T4 sebelumnya menuliskan fixture pengujian dengan pola blok kunci privat PEM literal secara langsung (`[DASH5]BEGIN PRIVATE KEY[DASH5]`).
- `tests/secret-scan-test.js` mendeteksi pola `pemPrivateKey` sebagai hard secret invariant pada setiap berkas yang dilacak git.
- Sesuai prinsip *Zero False Positive and Self-Scanning Principle* di `secret-scan-test.js`, fixture pengujian dilarang memuat literal PEM secara langsung, melainkan harus dibangun secara dinamis melalui penggabungan string:
  `'+' + '-'.repeat(5) + 'BEGIN PRIVATE KEY' + '-'.repeat(5)`

---

## 2. Perubahan yang Dilakukan

1. **`tools/fiezel-bot.mjs`**:
   - Mengubah sintaks fixture `testSecrets` di self-test T4 menjadi dinamis menggunakan penggabungan string (`'+' + '-'.repeat(5) + 'BEGIN PRIVATE KEY' + '-'.repeat(5)`).
   - Mempertahankan verifikasi detektor pola rahasia tetap berfungsi 100% tanpa memicu positif palsu pemindai hard-secret repository.
2. **PWA Release Arbiter & Anti-Ghost-Deploy**:
   - Build dinaikkan ke `m025-471` via `node tools/bump-build.mjs "fix(ci): perbaiki pemPrivateKey scanner false positive di fiezel-bot"`.
   - Hexa-Sync 6 titik diverifikasi `Selaras`:
     - `coordination/BUILD-VERSION.json` (`m025-471`)
     - `sw.js` (`m025-471`)
     - `core-config.js` (`m025-471`)
     - `features/neural-voice/fiezel-diag-panel.js` (`m025-471`)
     - `kurikulum.html` (`m025-471`)
     - `misi.html` (`m025-471`)

---

## 3. Bukti Verifikasi Lokal

- `node tools/fiezel-bot.mjs self-test`: **PASS (8/8 tests)**
- `node tests/secret-scan-test.js`: **PASS (46/46 assert PASS, 0 temuan)**
- `node tests/id-golden-snapshot-test.js`: **PASS (20/20 assert PASS, baseline emas utuh)**
- `node tests/th-ui-leak-test.js`: **PASS**
- `node tests/curriculum-cache-version-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS**
- `node tests/audio-csp-media-src-test.js`: **PASS**
- `node tests/view-reachability-test.js`: **PASS (63/63 lulus)**
- `node tests/ui-structure-test.js`: **PASS**
- `node tests/ux-redesign-test.js`: **PASS**
- `node tools/bump-build.mjs --check`: **Selaras (m025-471)**
