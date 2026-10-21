# FIEZEL M025-468 Handoff Dossier: Game Bottom Nav Panel & PAW ARENA Poster Redesign

## 1. Ringkasan Eksekutif & Permintaan Pengguna
- **Permintaan 1 (Top Bar Game):** Hilangkan topbar header bawaan (wordmark `FIEZEL`, indikator streak, gems, bendera kursus, lonceng notifikasi, dan tombol pengaturan) pada tampilan panel Game agar menjadi kanvas penuh bergaya arcade.
- **Permintaan 2 (Poster Game PAW ARENA):** Ubah kartu PAW ARENA menjadi poster game bernuansa esports/cyber 3D berenergi tinggi dengan estetika visual poster (gradien kosmik-neon, border emas ganda dengan bayangan bloom, tipografi emas metalik, cyber grid, dan tombol arcade tactile 3D).
- **Permintaan 3 (Bug Arena Migration):** Pindahkan kartu Bug Arena (Tactical Boss Raid Tracker) dari Home (`todayHomeMarkup`) ke panel Game (`gameHubMarkup`), dan hapus sepenuhnya dari Beranda Home.
- **Permintaan 4 (Bottom Nav Bar Panel):** Tambahkan tab navigasi `Game` di bottom navigation bar mobile & desktop dengan ikon gamepad duotone resmi FIEZEL dan status active styling yang serasi.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Probe)
Pengujian dieksekusi secara otomatis via skrip probe `tools/dev/probe-game-panel.mjs` di lingkungan peramban Chromium Playwright pada dua viewport:
1. **Mobile Viewport (390 x 844, scale 2x):**
   - Bottom Nav Bar memuat 6 item: `Latihan`, `KelasKu`, `Hari ini`, `Game`, `Progres`, `Profil`.
   - Klik tab `Game` (`[data-testid="nav-game"]`) berhasil memicu transisi rute `state.view = 'game'`.
   - Status tab `Game` mendapatkan kelas `.active` dengan kapsul latar kuning menyala.
   - Topbar header bawaan tersembunyi (`display: none !important`).
   - Kartu Poster Game PAW ARENA tampil memukau dengan grafis piala 3D SVG, cyber grid, pill live, dan tombol 3D CTA "MULAI DUEL ARENA →".
   - Kartu Bug Arena (Boss Raid Tracker) tampil kokoh di bawah poster game dengan HP bar indikator pola lemah ("Past Tense Irregular" & "Present Perfect vs Past").
   - Tangkapan layar: `game-panel-mobile-view.png` & `game-panel-mobile-scrolled.png`.
2. **Desktop Viewport (1200 x 800):**
   - Ditata rapi dalam shell cockpit berbingkai tengah yang responsif.
   - Tangkapan layar: `game-panel-desktop-view.png`.

---

## 3. Daftar Berkas Yang Dimodifikasi & Rincian Perubahan
1. **[app.js](file:///c:/Users/hp/fiezel-apps/app.js):**
   - Menghapus `${bugArenaCard}` dari kembalian `todayHomeMarkup()` sehingga Home bersih dari Bug Arena.
   - Mengekspor `function bugArenaCardMarkup()` ke level modul sebelum `gameHubMarkup()`.
   - Mengarahkan `gameView()` ke `<div class="game-view-shell fade">${gameHubMarkup()}</div>` untuk mengeliminasi header/level selector bawaan.
   - Memperkaya `gameHubMarkup()` dengan header arcade khusus, stat ribbon, Poster Game PAW ARENA, Boss Raid Bug Arena, dan grid mini-game arcade.
2. **[index.html](file:///c:/Users/hp/fiezel-apps/index.html):**
   - Menambahkan tombol `<button type="button" class="nav nav-game" data-view="game" data-testid="nav-game" onclick="go('game')" aria-label="Game" data-i18n-aria-label="nav.game-aria">` di dalam `<nav class="bottomnav">`.
3. **[style.css](file:///c:/Users/hp/fiezel-apps/style.css):**
   - Menambahkan aturan `body.fz-view-game header.topbar, body.fz-view-game .topbar { display: none !important; }`.
   - Menyesuaikan `grid-template-columns: repeat(6, 1fr)` pada `.bottomnav` agar 6 item terdistribusi simetris tanpa wrapping.
4. **[features/ui/fiezel-tactile-clay.css](file:///c:/Users/hp/fiezel-apps/features/ui/fiezel-tactile-clay.css):**
   - Menambahkan styling lengkap `.game-poster-card` (multi-layer radial gradient kosmik violet-indigo-gold, border emas ganda dengan bayangan bloom, animasi float piala SVG emas, tipografi judul metalik gradient dengan drop-shadow, pill mode holografis, dan tombol arcade tactile 3D `.poster-action-btn`).
   - Penyesuaian layout `.game-view-shell`, `.game-hub-top-bar`, `.game-brand-cluster`, dan `.game-hub-container .bug-arena-card`.
5. **[features/ui/fiezel-icons.js](file:///c:/Users/hp/fiezel-apps/features/ui/fiezel-icons.js):**
   - Memastikan ikon duotone `game` (gamepad dengan D-pad dan tombol aksi) terdaftar.
6. **[features/i18n/copy-id-redesign.js](file:///c:/Users/hp/fiezel-apps/features/i18n/copy-id-redesign.js) & [copy-th-redesign.js](file:///c:/Users/hp/fiezel-apps/features/i18n/copy-th-redesign.js):**
   - Menambahkan kunci lokalisasi `nav.game`, `nav.game-aria`, dan serangkaian teks pendukung game hub.
7. **[id-golden-baseline.json](file:///c:/Users/hp/fiezel-apps/id-golden-baseline.json):**
   - Memperbarui baseline emas literal Indonesia untuk memuat naskah baru Game Hub.
8. **Hexa-Sync Bump Version:**
   - Versi dinaikkan dari `m025-467` ke `m025-468` selaras di 6 titik wajib via `tools/bump-build.mjs`.

---

## 4. Status Gerbang Mutu (Quality Gates)
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (HIJAU)**
- `node tests/curriculum-cache-version-test.js`: **PASS (HIJAU)**
- `node tests/gate-registry-test.js`: **PASS (HIJAU)**
- `node tests/ui-structure-test.js`: **PASS (HIJAU)**
- `node tests/ux-redesign-test.js`: **PASS (HIJAU)**
- `node tests/view-reachability-test.js`: **PASS (HIJAU)**
- `node tools/bump-build.mjs --check`: **Selaras (m025-468)**
