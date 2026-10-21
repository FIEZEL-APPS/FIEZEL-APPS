# FIEZEL Handoff Dossier: Butter Yellow Glossy Floating Bottom Navigation Bar

- **Build Version**: `m025-522`
- **Tanggal**: 2026-10-08
- **Tipe Perubahan**: `feat(ui): butter yellow glossy floating bottomnav with liquid active pill`

---

## 1. Ringkasan Permintaan & Temuan

1. **Permintaan Pengguna**:
   - Menghapus tampilan bottom bar gelap/hitam (`rgba(22, 22, 26, 0.88)`).
   - Mengganti palet warna menjadi **Kuning Mentega (Butter Yellow)** yang hangat dan mewah dengan sentuhan **Glossy**.
   - Menjaga dock melayang (*floating capsule dock*) dengan sudut membulat penuh (`border-radius: 9999px`), melayang $\ge 14\text{px}$ di atas dasar layar.
   - Indikator tab aktif berupa kapsul geser cairan (*liquid sliding active pill indicator*) yang meluncur mulus instan saat disentuh antar-tab tanpa kedip atau jeda layar kosong (*zero flicker*).
   - Urutan tab tetap selaras: 1. Hari ini (`home`), 2. KelasKu (`classroom`), 3. Latihan (`latihan`), 4. Game (`game`), 5. Progres (`progress`), 6. Profil (`online`).
   - Tombol bahasa di pojok kanan atas (`[🇬🇧 English ▾]`) bersih tanpa noda/lingkaran hitam bertumpuk.

---

## 2. Arsitektur & Spesifikasi Desain (Butter Yellow & Glossy)

### A. Floating Capsule Dock (`.bottomnav`)
- **Posisi & Geometri**:
  - `position: fixed !important; bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important;`
  - `left: 50% !important; transform: translateX(-50%) !important;`
  - `width: min(440px, calc(100% - 24px)) !important; height: 64px !important;`
  - `border-radius: 9999px !important;`
- **Material Kuning Mentega Frosted Glass**:
  - `background: linear-gradient(180deg, rgba(255, 253, 240, 0.94) 0%, rgba(254, 243, 199, 0.90) 100%) !important;`
  - `backdrop-filter: blur(28px) saturate(190%) !important;`
- **Glossy Specular Bevel & Tactile Shadow**:
  - `border: 1.5px solid rgba(255, 255, 255, 0.85) !important;`
  - `box-shadow: inset 0 2px 2px rgba(255, 255, 255, 0.9), inset 0 -2px 3px rgba(217, 119, 6, 0.15), 0 16px 36px -4px rgba(180, 83, 9, 0.18), 0 6px 16px rgba(0, 0, 0, 0.08) !important;`

### B. Sliding Liquid Active Pill (`#navActivePill`)
- **Kapsul Kilau Mentega & Efek Kaca**:
  - `background: linear-gradient(180deg, #FFFFFF 0%, #FEF08A 65%, #FDE047 100%) !important;`
  - `border: 1px solid rgba(255, 255, 255, 0.95) !important;`
  - `box-shadow: inset 0 2px 3px #FFFFFF, inset 0 -1.5px 2px rgba(217, 119, 6, 0.3), 0 4px 12px rgba(217, 119, 6, 0.22) !important;`
  - `border-radius: 9999px !important; box-sizing: border-box !important;`
- **Dinamika Luncuran Cair (Liquid Glide)**:
  - `transition: transform 0.32s cubic-bezier(0.25, 1, 0.5, 1), width 0.28s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease !important;`

### C. Tipografi & Ikon
- **Inaktif**: Warm deep amber `#78350F` (opacity 0.70, font-weight 700), ikon `#78350F`.
- **Aktif**: Deep golden amber `#78350F` / `#92400E` (font-weight 800) dengan `text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8)`, ikon `--fz-i-fill: #FEF08A; --fz-i-line: #92400E;`.
- **KelasKu Aktif**: Emerald Signature `#065F46` / `#047857` (font-weight 800) dengan ikon `--fz-i-fill: #A7F3D0; --fz-i-line: #047857;`.

---

## 3. Berkas yang Dimodifikasi

1. `features/ui/mobile-edge-fit.css`:
   - Mengganti gaya dock menjadi Kuning Mentega Glossy.
   - Menghapus circular blob conflict pada tombol `#fzCourseSwitchBtn`.
2. `features/ui/fiezel-tactile-clay.css`:
   - Menyelaraskan gaya Kuning Mentega Glossy dan `#navActivePill`.
3. `style.css`:
   - Menyelaraskan gaya Kuning Mentega Glossy dan fallback dock.
4. `index.html`:
   - Memastikan order 1. Hari ini, 2. KelasKu, 3. Latihan, 4. Game, 5. Progres, 6. Profil.
   - Menempatkan elemen `#navActivePill`.
5. `app.js`:
   - Mengoptimalkan `syncNavActivePill()`, menambahkan guard pencegah infinite RAF pada nav tersembunyi.
   - Menghubungkan pre-emptive glide pada `go(v)`.
   - Mengeliminasi `setApp('')` wiper agar transisi view bebas flicker.

---

## 4. Bukti Verifikasi Empiris (Playwright Headless Probe)

- **Skrip Probe**: `tools/dev/probe-nav-butter.js`
- **Hasil Telemetri Kapsul Geser**:
  - `home`: width `57.0px`, X `8.0px`
  - `classroom`: width `57.0px`, X `67.0px`
  - `latihan`: width `57.0px`, X `126.0px`
  - `game`: width `57.0px`, X `185.0px`
  - `progress`: width `57.0px`, X `244.0px`
  - `online`: width `57.0px`, X `303.0px`
  - `home` (kembali): width `57.0px`, X `8.0px`
- **Tangkapan Layar Bukti Visual**:
  - `tools/dev/screenshots/butter_01_home.png`
  - `tools/dev/screenshots/butter_02_kelasku.png`
  - `tools/dev/screenshots/butter_03_latihan.png`
  - `tools/dev/screenshots/butter_04_game.png`
  - `tools/dev/screenshots/butter_05_progres.png`
  - `tools/dev/screenshots/butter_06_profil.png`

---

## 5. Status Gerbang Mutu Lokal (Quality Gates)

- `node tests/anti-flicker-uiux-invariant-test.js`: **PASS (14/14)**
- `node tests/ui-structure-test.js`: **PASS**
- `node tests/contrast-test.js`: **PASS**
- `node tests/id-golden-snapshot-test.js`: **PASS (20/20)**
- `node tests/curriculum-cache-version-test.js`: **PASS**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail, 364 gates)**
- `node tools/bump-build.mjs --check`: **PASS (m025-522 Hexa-Sync Selaras)**
