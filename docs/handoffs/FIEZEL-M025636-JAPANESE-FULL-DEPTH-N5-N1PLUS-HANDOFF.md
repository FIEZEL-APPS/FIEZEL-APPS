# FIEZEL Handoff Dossier — m025-636: Perluasan Kedalaman Kursus Bahasa Jepang Penuh 6 Tingkat (`N5–N1+` / `A1–C2`)

- **Nomor Build**: `m025-636`
- **Cabang**: `feat/ja-full-depth-n5-n1plus`
- **Tanggal**: 2026-10-24
- **Status Hexa-Sync**: `Selaras` (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Sebelum rilis `m025-636`, jalur Bahasa Jepang di FIEZEL belum simetris dengan jalur Bahasa Inggris (`A1–C2`):
1. **Bunpō (Tata Bahasa) & Graf Keluarga Braincore**: Hanya mencakup `A1/N5` dan `A2/N4` (422 butir di 27 keluarga). Murid yang memilih level `B1 (N3)` hingga `C2 (N1+)` tidak memiliki bank soal tata bahasa maupun graf prasyarat Braincore di tingkat tersebut.
2. **Sakubun (Menulis)**: Hanya mencakup `A1/N5` dan `A2/N4` (54 prompt). Level `B1–C2` kosong.
3. **Kotoba (Kosakata) & Dokkai (Bacaan)**: Mencakup `A1 (N5)` sampai `C1 (N1)` (1.884 kata dan 150 wacana), tetapi tingkat `C2 (N1+ Jōkyū)` masih kosong (`0` kata dan `0` wacana) serta dipetakan ganda ke `'N1'` di `FiezelJaUi.JLPT_BY_LEVEL`.
4. **Chōkai (Menyimak Multi-Suara)**: Hanya mencakup `N5` dan `N4` (30 soal), dan antarmuka `#jlptFilterModal` hanya menampilkan 2 tombol level (`#btnLvlN5`, `#btnLvlN4`).
5. **Label UIBeranda (`app.js`)**: Kartu beranda untuk bahasa Jepang sebelumnya menampilkan label statis `'N5 · 言葉'` dan `'N5 · 文法'` meskipun murid telah berpindah ke level `N4`–`N1+`.

Dalam `m025-636`, seluruh 6 tingkat `A1=N5`, `A2=N4`, `B1=N3`, `B2=N2`, `C1=N1`, dan `C2=N1+ (Jōkyū)` dilengkapi secara menyeluruh dan terhubung langsung ke **Braincore Engine** (BKT, IRT 3PL, OLM, FSRS, dan Misconception Ledger).

---

## 2. Bukti Pengujian Empiris Dua Arah (Playwright Headless Chromium)

Pengujian dilakukan menggunakan probe peramban Chromium Playwright terhadap server lokal (`probe-ja-depth.mjs`, `probe-ja-after-e2e.mjs`, dan `tests/jlpt-interactive-features-probe.js`).

### Tabel Perbandingan Empiris (`SEBELUM` vs `SESUDAH m025-636`)

| Dimensi / Modul | Sebelum (`m025-634`) | Sesudah (`m025-636`) | Status |
| :--- | :--- | :--- | :--- |
| **Pemetaan Level `FiezelJaUi.JLPT_BY_LEVEL`** | `A1:N5, A2:N4, B1:N3, B2:N2, C1:N1, C2:N1` (C1/C2 kolaps) | `A1:N5, A2:N4, B1:N3, B2:N2, C1:N1, C2:N1+` (6 tingkat unik) | LULUS |
| **Graf Keluarga Braincore (`family-graph-ja.json`)** | 27 keluarga (`N5–N4`) | **50 keluarga** (`12 N5 + 15 N4 + 8 N3 + 6 N2 + 5 N1 + 4 N1+`) | LULUS |
| **Bank Tata Bahasa (`grammar-templates-ja.json`)** | 422 butir (`A1:242, A2:180, B1..C2:0`) | **698 butir** (`A1:242, A2:180, B1:96, B2:72, C1:60, C2:48`) | LULUS |
| **Taksonomi Miskonsepsi (`japanese-misconception-taxonomy.json`)** | 9 kode (`N5–N4`) | **24 kode** (`N5–N1+`) | LULUS |
| **Bank Menulis (`writing-prompts-ja.json`)** | 54 prompt (`A1:24, A2:30, B1..C2:0`) | **100 prompt** (`A1:24, A2:30, B1:16, B2:12, C1:10, C2:8`, 2/keluarga) | LULUS |
| **Bank Kosakata (`vocabulary-master-ja.json`)** | 1.884 kata (`C2: 0`) | **1.984 kata** (`A1:1000, A2:327, B1:278, B2:202, C1:77, C2:100`) | LULUS |
| **Bank Bacaan (`reading-bank-ja.json`)** | 150 wacana / 750 soal (`C2: 0`) | **180 wacana / 900 soal** (`30 wacana × 5 soal` di tiap level `A1..C2`) | LULUS |
| **Bank Chōkai Multi-Suara (`jlpt-listening-bank-v1.json`)** | 30 soal (`N5:15, N4:15`) | **62 soal / 305 turns** (`N5:15, N4:15, N3:8, N2:8, N1:8, N1+:8`) + 62 MP3 | LULUS |
| **Tombol Level `#jlptFilterModal` (Viewport 390px)** | 2 tombol (`N5`, `N4`) | **6 tombol responsif** (`#btnLvlN5`..`#btnLvlN1Plus`, grid 2 kolom, tinggi `44px`) | LULUS |
| **Telemetri Braincore Chōkai `N1+`** | Hanya `difficulty: 1..2` | Mengalirkan `level: "N1+"`, `difficulty: 6`, `skill: "listening_comprehension"` ke `state.history` | LULUS |

---

## 3. Daftar Berkas yang Disentuh & Perubahannya

1. **Bank Konten & Kurikulum Bahasa Jepang (`content/ja/` & `docs/japanese/`)**:
   - `content/ja/family-graph-ja.json` & `docs/japanese/n5-a1-family-graph.json`: Diperluas menjadi 50 keluarga tata bahasa beserta rantai prasyarat lintas tingkat `N5 -> N4 -> N3 -> N2 -> N1 -> N1+`.
   - `content/ja/grammar-templates-ja.json`: Ditambahkan 276 butir baru (`B1/N3`: 96, `B2/N2`: 72, `C1/N1`: 60, `C2/N1+`: 48) menjadi total **698 butir** ber-pengecoh diagnostik dan penjelasan dwibahasa (`en`/`id`).
   - `content/ja/writing-prompts-ja.json`: Ditambahkan 46 prompt latihan menulis (`B1/N3`: 16, `B2/N2`: 12, `C1/N1`: 10, `C2/N1+`: 8) menjadi total **100 prompt**.
   - `content/ja/japanese-misconception-taxonomy.json`: Ditambahkan 15 kode miskonsepsi tingkat menengah-mahir menjadi total **24 kode**.
   - `docs/japanese/kosakata-jlpt.json` & `content/ja/vocabulary-master-ja.json`: Ditambahkan 100 entri kosakata `C2 / N1+` (`ja_vocab_01886` s/d `ja_vocab_01985`) menjadi total **1.984 kata** di bank utama.
   - `content/ja/reading-bank-ja.json`: Ditambahkan 30 wacana `C2 / N1+` (`rja0151` s/d `rja0180`, 150 pertanyaan) menjadi total **180 wacana (900 pertanyaan)**.
2. **Modul Chōkai Multi-Suara (`features/speaking-listening/` & `index.html`)**:
   - `features/speaking-listening/jlpt-listening-bank-v1.json`: Diperluas dari 30 menjadi **62 butir** (`N5`, `N4`, `N3`, `N2`, `N1`, `N1+`) lengkap dengan `turnTimestamps` dan `allTurnTimestamps`.
   - `features/speaking-listening/audio-jlpt/jlpt-{n3,n2,n1,c2}-m{1..4}-0{1..2}.mp3`: 32 berkas audio MP3 multi-karakter baru yang disintesis melalui `tools/chokai-audio-pipeline/pipeline-orchestrator.mjs`.
   - `features/speaking-listening/fiezel-jlpt-listening.js`: Penambahan 516 entri kamus furigana (`JLPT_KANJI_DICT`), dukungan 6 tab level (`N5`–`N1+`), pembukaan panel sesuai level aktif, dan kalibrasi `difficulty: 1..6` ke Braincore.
   - `features/speaking-listening/jlpt-listening.css` & `index.html`: Penataan 6 tombol pemilih level `#btnLvlN5`..`#btnLvlN1Plus` dalam grid 2 kolom responsif (`min-height: 44px`).
3. **Antarmuka & Lokalisasi (`features/japanese/`, `features/i18n/`, `app.js`)**:
   - `features/japanese/fiezel-ja-ui.js`: Pemetaan `JLPT_BY_LEVEL.C2 = 'N1+'` dan pembaruan kartu Chōkai.
   - `app.js`: Label level dinamis pada kartu beranda bahasa Jepang, kartu pemilih level `N5 · A1` s/d `N1+ · C2`, dan banner Chōkai N5–N1+.
   - `features/i18n/copy-id-bahasa.js` & `features/i18n/copy-th-bahasa.js`: Penambahan 23 judul keluarga tata bahasa baru (`N3–N1+`), label level Chōkai `N3–N1+`, dan deskripsi level Jepang di pemilih level.
4. **Gerbang Mutu & Konfigurasi Rilis**:
   - `tests/japanese-content-test.js`, `tests/japanese-vocab-bank-test.js`, `tests/japanese-reading-bank-test.js`, `tests/japanese-ja-ui-test.js`, `tests/japanese-th-parity-test.js`.
   - `id-golden-baseline.json`, `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal & Utang Teknis

### Hasil Eksekusi Gerbang Mutu Lokal
- `node tools/bump-build.mjs --check` → **PASS (`Selaras` di 6 titik: `m025-636`)**
- `node tests/japanese-content-test.js` → **PASS (14/14 assert, 708 butir)**
- `node tests/japanese-surface-honesty-test.js` → **PASS (7/7 assert)**
- `node tests/japanese-course-wiring-test.js` → **PASS (9/9 assert)**
- `node tests/japanese-vocab-bank-test.js` → **PASS (9/9 assert, 1.984 kata)**
- `node tests/japanese-reading-bank-test.js` → **PASS (10/10 assert, 180 wacana)**
- `node tests/japanese-ja-ui-test.js` → **PASS (29/29 assert)**
- `node tests/japanese-th-parity-test.js` → **PASS (8/8 assert, sensus 20.372 medan cocok)**
- `node tests/japanese-bank-survives-load-test.js` → **PASS (5/5 assert)**
- `node tests/chokai-multi-voice-protocol-test.js` → **PASS (62 soal, 305 turns)**
- `node tests/jlpt-interactive-features-probe.js` → **PASS 100%**
- `node tests/id-golden-snapshot-test.js` → **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js` → **PASS (4.476 kunci id/th selaras)**
- `node tests/curriculum-cache-version-test.js` → **PASS (`m025-636`)**
- `node tests/precache-covers-shell-test.js` → **PASS (5/5 assert)**
- `node tests/audio-asset-pipeline-test.js` → **PASS (51/51 assert)**
- `node tests/gate-registry-test.js` → **PASS (10/10 assert)**

### Catatan Utang Teknis yang Tersisa
1. **Sidecar Terjemahan Thai Isi Bank Jepang (`content/ja/*-th.json`)**: Antarmuka (`copy-th-bahasa.js`) telah 100% memiliki terjemahan Thai, namun isi internal bank Jepang (20.372 medan yang tercatat resmi di `SENSUS` `tests/japanese-th-parity-test.js`) masih menggunakan penjelasan bahasa Indonesia dan belum memiliki sidecar Thai.
2. **Peninjauan Penutur Asli (Native Speaker Review)**: Sebagaimana dideklarasikan secara jujur pada `kursus-ja.peringatan` dan metadata `statusNaskah`, seluruh kalimat Jepang dan penjelasan tingkat `N5–N1+` berstatus draf tervalidasi skema dan dapat terus dipoles bersama penutur asli.
