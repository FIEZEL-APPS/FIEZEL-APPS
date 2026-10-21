# FIEZEL Handoff Dossier: m025-499 Dashboard & Panel UI/UX Polish

- **Versi Build**: `m025-499`
- **Branch**: `feat/m025-499-dashboard-uiux-polish`
- **Target**: `main`
- **Tanggal**: 2026-10-07

---

## 1. Ringkasan Eksekutif & Temuan Audit

Menindaklanjuti audit empiris komprehensif pada seluruh 15 layar antarmuka dashboard dan panel serta arahan langsung dari user (8 anotasi visual spesifik):
1. **Latihan Topbar (Image 0)**: Topbar pada layar Latihan diselaraskan dengan Home dan KelasKu (logo FIEZEL, pil streak & XP, pemilih kursus, lonceng notifikasi, dan tombol pengaturan).
2. **KelasKu Tugas Tab Badge (Image 1)**: Memperbaiki badge dummy `Tugas (2)` saat murid memiliki 0 tugas tertunda (sebelumnya `pend.length || 2` yang selalu menampilkan angka 2 palsu).
3. **Game Center Topbar (Image 2)**: Mengintegrasikan topbar persisten terpadu dan menghapus navigasi mini ad-hoc (`← Hari ini`, `🏆 450`) sehingga Game Center selaras 100% dengan Home & Latihan.
4. **Profile Topbar (Image 3)**: Menampilkan topbar persisten terpadu pada layar Profil murid lengkap dengan kontrol pengaturan dan identitas brand.
5. **Native Docked Bottom Navigation Bar (Image 4)**: Menghapus bentuk *floating island* dan celah 14px di bawah/samping navigasi bawah yang menyebabkan konten layar bocor/bergeser di baliknya saat di-scroll. Mengubah `.bottomnav` menjadi bilah tab natif (`bottom: 0`, lebar 100% edge-to-edge, frosted daylight travertine background, padding safe-area) seperti `UITabBar` iOS / Material NavigationBar Android.
6. **Karantina Rogue `#fzRitual` Overlay (Image 5)**: Mengganti wajah kartun PAW pada kartu ritual rencana harian dengan ikon arah emas FIEZEL, memastikan `#fzRitual` dibersihkan seketika saat murid berpindah layar, dan melengkapi pendaftaran aset kurikulum di Service Worker.
7. **Account Sheet Links Overlap (Image 6)**: Memperbaiki benturan selektor tombol 3D dan margin negatif pada `.setup-link` di lembar akun modal, membungkus kedua tautan ke dalam flex column terstruktur sehingga tidak bertumpuk atau keluar dari kartu modal.
8. **Level Progression Panel Redesign (Image 7)**: Menghapus tema gelap dan teks abu-abu pudar kontras rendah ($1.4:1$) pada kartu level modal, menggantinya dengan kartu Tactile Daylight bersih berlatar putih dengan kontras tinggi ($>7:1$), tipografi tajam, serta sorotan aktif bernuansa emas hangat.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

- Pengujian visual dijalankan melalui:
  - `tools/dev/comprehensive-dashboard-audit.mjs` (layar 01-15)
  - `tools/dev/audit-additional-panels.mjs` (layar 16-20)
- Hasil visual diverifikasi frame-by-frame via `view_file` pada direktori `reports/dashboard-audit/stills/`:
  - `01-home-dashboard.png`: Bilah navigasi bawah terkunci di dasar layar, kartu ritual bersih dari maskot.
  - `02-latihan-dashboard.png`: Topbar persisten resmi FIEZEL tampil sempurna di atas grid modul.
  - `03-kelasku-dashboard.png`: Tab Tugas tidak lagi menampilkan angka 2 palsu saat tugas bernilai 0.
  - `04-game-dashboard.png`: Topbar terpadu tampil di atas Arcade & Game, judul diubah menjadi FIEZEL ARENA.
  - `06-profile-dashboard.png`: Topbar persisten resmi FIEZEL tampil konsisten di atas profil Rian Pratama.
  - `16-level-progression-panel.png`: Kartu pilihan level berlatar putih bersih dengan teks slate kontras tinggi.
  - `20-account-sheet.png`: Tautan pendaftaran dan kode undangan guru tertata rapi vertikal tanpa tumpang tindih.

---

## 3. Daftar Berkas yang Dimodifikasi

1. `features/class-hub/fiezel-class-hub.js`:
   - Mengganti `pend.length || 2` menjadi `(pend && pend.length) ? pend.length : 0` pada tab bar KelasKu.
2. `features/ui/fiezel-tactile-clay.css`:
   - Membuka display `header.topbar` untuk `fz-view-latihan`, `fz-view-grammar`, dan `fz-view-profile`.
   - Mengubah docking `.bottomnav` ke `bottom: 0`, lebar 100%, border-top 1px, background frosted daylight travertine.
   - Mengecualikan `.setup-link` dan `.level-picker-card` dari selektor tombol 3D umum.
   - Menambahkan aturan kartu level Daylight bersih dan kontras tinggi.
3. `features/ui/mobile-edge-fit.css`:
   - Menyelaraskan docking `.bottomnav` ke `bottom: 0` edge-to-edge.
   - Memperbarui gaya kartu modal level menjadi Daylight Tactile dengan kontras tinggi.
4. `style.css`:
   - Membuka display `header.topbar` untuk `fz-view-game`.
   - Menyembunyikan navigasi ad-hoc `.game-hub-top-nav`.
   - Menyelaraskan docking `.bottomnav` ke `bottom: 0`.
   - Membatasi margin negatif `.setup-link` hanya untuk tautan `a.setup-link`.
5. `app.js`:
   - Menghapus rendering ad-hoc top-nav di `gameHubMarkup()`.
   - Membersihkan elemen `#fzRitual` saat navigasi berpindah dari Home.
   - Mengganti elemen kartun maskot PAW di `#fzRitual` dengan ikon brand bersih.
   - Membungkus tombol `.setup-link` di `accountSheetMarkup()` ke dalam container flex terstruktur.
6. `features/i18n/copy-id-redesign.js` & `features/i18n/copy-th-redesign.js`:
   - Menyelaraskan naskah `game.paw-arena-title` menjadi `FIEZEL ARENA`.
7. `id-golden-baseline.json`:
   - Memperbarui baseline literal emas pasca-penghapusan markup duplikat header game.
8. Berkas sinkronisasi build arbiter:
   - `sw.js` (SW_REV: `m025-499`)
   - `core-config.js` (`m025-499`)
   - `features/neural-voice/fiezel-diag-panel.js` (`m025-499`)
   - `kurikulum.html` (`m025-499`)
   - `misi.html` (`m025-499`)
   - `coordination/BUILD-VERSION.json` (`m025-499`)

---

## 4. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js`: **PASS (100% HIJAU)**
- `node tests/th-ui-leak-test.js`: **PASS (3945/3945 kunci selaras)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26/26 penegasan build m025-499)**
- `node tests/gate-registry-test.js`: **PASS (10/10 penegasan)**
- `node tests/pastel-field-contrast-test.js`: **PASS (9/9 penegasan)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik)**
