# FIEZEL HANDOFF DOSSIER: M025-690
**Penyelesaian Kunci Hantu Quick-Win & Finalisasi Keselarasan Hexa-Sync Build m025-690**

- **Nomor Build**: `m025-690`
- **Tanggal**: 28 Oktober 2026
- **Status Gerbang Mutu**: 100% LULUS (Hexa-Sync Selaras, Seluruh Gerbang Hijau)

---

## 1. Ringkasan Perubahan Tambahan

1. **Resolusi Kunci Hantu Quick-Win (`tests/i18n-kunci-hantu-test.js`)**:
   - Pendaftaran 16 kunci translasi `quiz.quickwin-*` yang dipanggil di `app.js:startQuickWinLesson` ke `copy-id-feat-b.js` dan `copy-th-feat-b.js`.
   - Hal ini memastikan murid jalur pemula (*beginner track*) menerima teks lokal yang benar (baik dalam Bahasa Indonesia maupun Thai) tanpa risiko kebocoran nama kunci mentah ke layar.
2. **Pembaruan Nomor Build**:
   - Nomor build dinaikkan dari `m025-689` ke `m025-690` via arbiter resmi `tools/bump-build.mjs`.
   - Sinkronisasi terbukti pada 6 titik: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`.
3. **Pembaruan Baseline Literal Emas**:
   - `id-golden-baseline.json` disinkronkan dengan literal emas terkini via `node tests/id-golden-snapshot-test.js --write-baseline`.

---

## 2. Status Kelulusan Pengujian Lokal

- `node tools/bump-build.mjs --check`: **Selaras (HIJAU)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (HIJAU)**
- `node tests/i18n-kunci-hantu-test.js`: **PASS (HIJAU)**
- `node tests/curriculum-cache-version-test.js`: **PASS (HIJAU)**
- `node tests/gate-registry-test.js`: **PASS (HIJAU)**
- `node tests/japanese-ja-ui-test.js`: **PASS (HIJAU)**
