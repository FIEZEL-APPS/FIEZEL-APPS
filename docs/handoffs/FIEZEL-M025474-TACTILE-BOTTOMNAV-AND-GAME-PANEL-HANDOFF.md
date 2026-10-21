# FIEZEL HANDOFF DOSSIER: M025-474
## Harmonisasi Tactile Clay Floating Bottom Navigation & Perbaikan Antarmuka Game Panel

**Build:** `m025-474`  
**Waktu Rilis:** 2026-10-05 10:20 WIB  
**Status Validasi:** 100% PASS (Hexa-Sync Selaras, Local Quality Gates Green)

---

### 1. Ringkasan Temuan & Tindakan Perbaikan
Pengguna melaporkan bahwa tampilan bottom bar dan antarmuka game mengalami kerusakan:
1. **Bottom Navigation Bar Kerusakan**:
   - Selector dengan specificity tinggi di `features/ui/mobile-edge-fit.css` dan `style.css` memaksakan warna hitam gelap (`rgba(14, 14, 20, 0.96) !important`), border-radius 0 (`border-radius: 0 !important`), dan posisi menempel ke lantai bawah tanpa jarak floating.
   - Properti `overflow: hidden` dan `max-height: 48px` serta `line-height: 1.1` memotong huruf bertangkai bawah (*descender clipping* seperti huruf 'g', 'j', 'p' pada label "Hari ini", "Game", "Progres", "Profil").
   - **Tindakan Perbaikan**: Menghapus seluruh override bilah gelap di `mobile-edge-fit.css` dan `style.css`. Menyelaraskan seluruh styling navigasi ke standar **Tactile Clay Floating Dock**:
     - Background putih mewah `rgba(255, 255, 255, 0.96)` dengan blur `20px`.
     - Border 2px `#E2E8F0` dengan sudut melengkung `24px` dan bayangan 3D `#CBD5E1`.
     - Mengambang elegan di atas tepi bawah layar (`bottom: max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px))`).
     - Grid 6 kolom seimbang dengan `overflow: visible` dan `line-height: 1.25`, menjamin 100% bebas dari pemotongan teks.

2. **Antarmuka Game & Poster Card**:
   - Pita statistik 4 pil (`game-stats-ribbon`) telah sepenuhnya dihilangkan dari panel Game sesuai instruksi pengguna.
   - Bug Arena telah dibersihkan dari halaman Beranda/Home dan kini berada eksklusif di panel Game sebagai tantangan Boss Raid.
   - Rule `button:not(...)` dengan selector specificity 1-24-1 di `features/ui/fiezel-tactile-clay.css` sebelumnya menimpa tombol aksi poster game menjadi kotak putih polos dan menyebabkan teks putih pada tombol Bug Raid menjadi tidak terbaca.
   - **Tindakan Perbaikan**:
     - Menambahkan pengecualian `:not(.poster-action-btn):not(.paw-action-btn):not(.bug-raid-action-btn):not(.game-back-pill)` pada selector tombol umum.
     - Memperkuat styling tombol CTA PAW Arena menjadi tombol 3D Solar Magma Gold (`#FFE033` -> `#FF8000`) dengan teks gelap tegas.
     - Memperkuat styling tombol CTA Bug Arena menjadi tombol 3D Volcanic Magma Crimson (`#EF4444` -> `#DC2626` -> `#991B1B`) dengan teks putih tebal, ikon petir, dan tanda panah.
     - Mengganti ikon kartu Sentence Puzzle menjadi ikon `layers` resmi Lucide.

---

### 2. Bukti Pengujian Empiris (Headless Chromium Playwright)
Pengujian dilakukan menggunakan `tools/dev/probe-game-panel.mjs`:
- `home-bottomnav-mobile-view.png`: Menampilkan bilah navigasi floating Tactile Clay di Beranda dengan 6 tab presisi dan tanpa pemotongan huruf.
- `game-panel-mobile-view.png`: Menampilkan kartu PAW Arena dengan CTA 3D Solar Magma Gold dan tab Game aktif.
- `game-panel-mobile-scrolled.png`: Menampilkan kartu Boss Raid Bug Arena dengan meteran HP dan tombol 3D Magma Crimson aktif.
- `game-panel-mobile-arcade.png`: Menampilkan 4 kartu mini-game arcade (Mochi Crunch, Sentence Puzzle, Panggung Suara, Nujum) dengan ikon dan gradien lengkap.
- `game-panel-desktop-view.png`: Menampilkan centering dan responsivitas pada resolusi desktop 1200x800.

---

### 3. Berkas yang Diubah
1. `features/ui/fiezel-tactile-clay.css`: Pengecualian tombol aksi poster, perbaikan tinggi & overflow bottom nav, penguatan styling tombol Paw dan Bug Raid.
2. `features/ui/mobile-edge-fit.css`: Penyelarasan bottom nav dari bilah hitam flat menjadi floating dock Tactile Clay.
3. `style.css`: Pembersihan blok bilah hitam duplikat dan harmonisasi bottom nav.
4. `app.js`: Pembaruan ikon Sentence Puzzle ke `layers`.
5. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump versi ke `m025-474`.
