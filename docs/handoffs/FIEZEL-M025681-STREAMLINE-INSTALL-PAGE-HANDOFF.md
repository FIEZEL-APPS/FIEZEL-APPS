# FIEZEL Handoff: Streamlined "Cara Install" Page (Instant Above-The-Fold)

- **Target Build**: `m025-681`
- **Tanggal**: 28 Oktober 2026
- **Cabang Git**: `feat/clean-install-page`
- **Tujuan**: Memangkas seluruh teks panjang lebar, masthead raksasa, dan perintang di `https://fiezel.my.id/install/` sehingga panduan pemasangan (Android, iPhone/iPad, Desktop) LANGSUNG MUNCUL di layar pertama (Above the Fold) tanpa sesak.

---

## 1. Ringkasan Perubahan

### Halaman `website/install/index.html`
- **Eliminasi 6 Perintang Teks**:
  1. Menghilangkan credit strip redundant.
  2. Menghilangkan masthead raksasa (ikon besar, wordmark 280px, slogan ganda, garis horizontal pemisah).
  3. Menghilangkan intro stage dan gambar maskot PAW (`paw-mascot-head.svg`).
  4. Menghilangkan teks lead panjang yang bertele-tele mengenai definisi PWA/APK.
  5. Menghilangkan kotak catatan tebal kuning berulang.
  6. Menghilangkan tumpukan tombol CTA ganda dan teks rilis GitHub yang panjang.
- **Penyajian Panduan Instan (Direct-to-Action)**:
  - Hero judul bersih: `<h1>Cara Install FIEZEL</h1>` + 1 kalimat petunjuk ringkas.
  - Tab pemilih platform (`[ Android ]`, `[ iPhone / iPad ]`, `[ Desktop ]`) langsung berada di bagian atas layar pertama.
  - Auto-deteksi perangkat cerdas (`isIOS` -> Safari iPhone, `Android` -> Android, `Desktop` -> Desktop) langsung membuka panel relevan detik pertama halaman dimuat.
  - Kartu Opsi Android memisahkan dengan tegas antara:
    - **Opsi 1 (Rekomendasi)**: Tombol unduh APK Android langsung + 4 langkah ringkas.
    - **Opsi 2**: Pasang via Google Chrome (PWA) + 4 langkah ringkas.
  - Kartu Opsi iPhone/iPad menyajikan 4 langkah Safari (Share -> Tambah ke Layar Utama).
  - Kartu Opsi Desktop menyajikan 4 langkah Chrome/Edge (Ikon install di address bar).
- **Pembersihan Klaim & Kepatuhan Aturan**:
  - Nol kemunculan maskot PAW.
  - Nol klaim palsu "latihan bisa offline" atau "tanpa internet".
  - Nol klaim akreditasi CEFR/JLPT dan klaim 100% gratis.
  - Landing page utama (`website/index.html`) tetap mempertahankan animasi maskot dan konten aslinya sesuai instruksi pengguna.

### Lembar Gaya `website/install/install.css`
- Menghapus aturan CSS usang (`.masthead`, `.intro-stage`, `.paw-idle`, keyframes `pawBreath`).
- Menambahkan tata letak responsif yang bernapas (*spacious*), bebas sesak, dengan padding yang proporsional di perangkat bergerak maupun desktop.
- Desain kartu opsi (`.install-opt-card`), tombol unduh APK (`.btn-apk`), dan badge penomoran langkah (`.num`).

---

## 2. Status Uji Mutu Lokal (Quality Gates)

Semua gerbang pengujian mutu lulus 100%:
- `node tests/seo-surface-gate-test.js`: 21/21 PASS
- `node tests/seo-hardening-audit-test.js`: 9/9 PASS
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS
- `node tests/gate-registry-test.js`: 10/10 PASS
- `node tools/bump-build.mjs --check`: Hexa-Sync `m025-681` 100% Selaras
