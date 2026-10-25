# FIEZEL HANDOFF DOSSIER: OVERHAUL UI/UX FIT LAYAR & ANTI-OVERLAP LISTENING & SPEAKING
**Build ID**: `m025-675`
**Tanggal**: 26 Oktober 2026
**Cakupan Fitur**: Skills Lab (`features/speaking-listening/` — English Listening & Speaking)
**Status Gerbang Mutu**: 100% HIJAU (Lolos 6 gerbang lokal + Hexa-Sync Arbiter m025-675)

---

## 1. Ringkasan Eksekutif & Temuan Audit Empiris

Pengguna mengajukan keluhan mendasar mengenai fitur latihan Bahasa Inggris di Skills Lab:
> *"coba audit uidan ux di fitur listening english, karena tidak fit ke layar, banyak ruang kosong"*
> *"PERBAIKI JUGA SESI SPEAKING"*

### Diagnosa Akar Masalah:
1. **Double Topbar / Ruang Kosong Melayang 156px**:
   - Saat sesi menyimak/berbicara aktif (`fsl-session-active`), `.topbar` global disembunyikan oleh stylesheet, namun `.skill-page-topbar` (`← Kembali` dan `?`) tetap dirender dengan `position: fixed` dan padding 64px di `.skills-page`.
   - Hal ini menekan kartu sesi ke bawah sebesar **156px**, memicu efek "banyak ruang kosong di atas" serta menyebabkan soal dan opsi terdorong ke luar lipatan layar bawah (*vertical overflow*).
   - Di sisi lain, kartu sesi telah menyediakan tombol navigasi keluar resmi pojok kanan atas `✕` (`.fsl-exit-btn`), sehingga tombol kembali di topbar ganda bersifat redundan dan memakan ruang berharga.
2. **Defek Tabrakan Tombol "Lanjut" Mengambang (*Floating Next Collision*)**:
   - Aturan CSS `.fsl-feedback .fsl-actions` dipatok `position: fixed` pada bagian bawah layar untuk memenuhi kontrak pengujian `tests/speaking-listening-test.js`.
   - Namun, tidak ada batas ruang aman (*safe-bottom clearance*) yang cukup pada container umpan balik. Akibatnya, pada perangkat mobile pendek/standar, tombol "Lanjut" mengambang tepat di atas baris transkrip naskah audio (`.fsl-script-text`) dan menutupi 100% dari widget toggle gem (`.fsl-gem-footer`).
3. **Inkonsistensi Visual Sesi Speaking vs Listening**:
   - Sesi Speaking menggunakan markup default `<article class="fsl-card">` tanpa sentuhan desain *Tactile Travertine* Fiezel.
   - Tombol "Keluar" diletakkan sejajar di baris aksi bersama "Mulai bicara", merusak ergonomi satu jempol.
   - Status pengenalan ucapan dan frasa target belum terbungkus dalam kartu aksen tactile yang nyaman dibaca.
4. **Desktop Wasteland Effect**:
   - Pada layar monitor/laptop desktop ($\ge 768\text{px}$ hingga 1280x800), wadah `.fsl-shell` dibatasi hanya `max-width: 720px` dalam format 1 kolom memanjang.
   - Hal ini menyisakan lebih dari 60% ruang kosong hampa di sisi kiri dan kanan, serta memaksa scrollbar vertikal muncul karena konten bertumpuk ke bawah.
5. **Ruang Hampa Bawah pada Layar Tinggi (Pixel 7 235px Void)**:
   - Pada layar tinggi dengan rasio 20:9 (Pixel 7 412x915), kartu sesi terdorong ke atas dengan `justify-content: flex-start`, meninggalkan ruang kosong tak terpakai di bawah sebesar 235px.

---

## 2. Solusi Teknis & Rancang Bangun

### A. Eliminasi Topbar Ganda & Centering Simetris
- Menyembunyikan `.skill-page-topbar` secara otomatis saat sesi aktif (`body.fsl-session-active .skill-page-topbar`, `body:has(.fsl-card-listening) .skill-page-topbar`, `body:has(.fsl-card-speaking) .skill-page-topbar`).
- Menata ulang `.skills-page` dengan padding-top minimalis `max(8px, env(safe-area-inset-top, 8px))`.
- Menerapkan flexbox vertical centering yang adaptif (`justify-content: center` dengan margin auto) sehingga pada layar tinggi (Pixel 7), kartu berada di posisi tengah layar yang ergonomis dan elegan.

### B. Anti-Collision Bottom Clearance untuk Tombol "Lanjut"
- Mempertahankan `position: fixed` pada `.fsl-feedback .fsl-actions` (sesuai kontrak invarian pengujian).
- Menambahkan bantalan pengaman:
  - `padding-bottom: calc(96px + env(safe-area-inset-bottom, 16px)) !important` pada `.fsl-card:has(.fsl-feedback)`.
  - `margin-bottom: calc(76px + env(safe-area-inset-bottom, 16px)) !important` pada `.fsl-card-listening:has(.fsl-feedback) .fsl-gem-footer`.
  - `margin-bottom: calc(76px + env(safe-area-inset-bottom, 16px)) !important` pada `.fsl-card-speaking .fsl-feedback`.
- Memastikan naskah transkrip dan `.fsl-gem-footer` selalu 100% terlihat dan dapat diklik di atas tombol "Lanjut".

### C. Penyelarasan Total Sesi Speaking (*Tactile Travertine*)
- Mengangkat markup Speaking ke `<article class="fsl-card fsl-card-speaking">`.
- Menambahkan tombol keluar melingkar `✕` (`.fsl-exit-btn`) di pojok kanan atas kartu, menghapus tombol "Keluar" redundan dari bilah aksi.
- Menerapkan tema *Tactile Travertine*:
  - Kartu: background `#FFFDF9`, border `1.5px solid #E8DFD3`, border-radius `24px`, shadow `0 12px 32px rgba(36,26,17,0.08)`.
  - Prompt target frasa: bubble tactile `#FFF8EB` dengan kutipan tipografis dan border `1.5px solid #F0E4CF`.
  - Tombol aksi bicara: pill hero tombol hitam pekat `#1E1B18` bertekstur haptik (tinggi 52px).

### D. Tata Letak Studio 2 Kolom untuk Desktop ($\ge 768\text{px}$)
- Melebarkan `.fsl-shell` desktop ke `min(980px, 92vw)`.
- Mengimplementasikan CSS Grid 2-kolom:
  - **Kolom Kiri**: Panggung maskot / companion 3D + tombol Audio Hero / Record Hero + counter replay.
  - **Kolom Kanan**: Pertanyaan + pilihan jawaban / input dikte + umpan balik transkrip.
- Menjamin seluruh konten muat 1 layar penuh ($< 540\text{px}$ tinggi kartu) tanpa scrollbar pada resolusi 1280x800.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Pengujian diverifikasi menggunakan skrip audit Playwright headless:
- `tools/dev/probe-english-listening-ux-audit.mjs`
- `tools/dev/probe-speaking-audit.mjs`

### Hasil Metrik Komparatif:

| Parameter Pengukuran | Sebelum Perbaikan (Baseline) | Sesudah Perbaikan (Build m025-675) | Status |
|---|---|---|---|
| **Android Compact (360x780)**: | | | |
| - Overflow Vertikal Awal | `overflowY: true` (+40px) | `overflowY: false` (0px) | **TERSELESAIKAN** |
| - Posisi Kartu (Top / Bottom) | Top: 156px, Bottom: 732px | Top: 117px, Bottom: 661px (Simetris) | **TERSELESAIKAN** |
| - Tabrakan Tombol "Lanjut" | Overlap Naskah: `true` | Overlap Naskah: `false` | **TERSELESAIKAN** |
| **iPhone 14 (390x844)**: | | | |
| - Overflow Vertikal Awal | `overflowY: false` | `overflowY: false` (Zero Scroll) | **TERSELESAIKAN** |
| - Posisi Kartu (Top / Bottom) | Top: 156px, Bottom: 692px | Top: 155px, Bottom: 687px (Simetris) | **TERSELESAIKAN** |
| - Tabrakan Tombol "Lanjut" | Overlap Naskah: `true` | Overlap Naskah: `false` | **TERSELESAIKAN** |
| **Pixel 7 (412x915)**: | | | |
| - Ruang Hampa Bawah | Void: 235px di dasar | Void Tereliminasi (Top: 192px, Bottom: 194px) | **TERSELESAIKAN** |
| - Tabrakan Tombol "Lanjut" | Overlap Footer: `true` | Overlap Footer: `false` | **TERSELESAIKAN** |
| **Desktop (1280x800)**: | | | |
| - Lebar Kartu | 720px (sempit di tengah) | 824px (Studio 2-Kolom Seimbang) | **TERSELESAIKAN** |
| - Tinggi Kartu & Overflow | Tinggi 580px+ | Tinggi 382px (`overflowY: false`) | **TERSELESAIKAN** |
| **Sesi Speaking**: | | | |
| - Konsistensi Travertine | `fsl-card` polos tanpa tema | `fsl-card-speaking` Travertine resmi | **TERSELESAIKAN** |
| - Tombol Keluar Ergonomis | Redundan di action row | Circular `✕` 44px di pojok kanan atas | **TERSELESAIKAN** |
| - Tabrakan Tombol "Lanjut" | Tabrakan transkrip | `nextBtnOverlapsTranscript: false` | **TERSELESAIKAN** |

Tangkapan layar hasil uji tersimpan pada direktori `reports/english-listening-ux-audit/`:
- `android_compact-02-listening-initial.png`, `android_compact-04-listening-answered.png`
- `iphone14-02-listening-initial.png`, `iphone14-04-listening-answered.png`
- `pixel7-02-listening-initial.png`, `pixel7-04-listening-answered.png`
- `desktop_1280-02-listening-initial.png`, `desktop_1280-04-listening-answered.png`
- `iphone14-speaking-initial.png`, `iphone14-speaking-answered.png`
- `desktop-speaking-initial.png`, `desktop-speaking-answered.png`
- `pixel7-speaking-answered.png`

---

## 4. Berkas yang Dimodifikasi

1. `index.html`:
   - Menambahkan aturan display/padding khusus saat sesi aktif (`body.fsl-session-active`) untuk menghilangkan topbar dan padding statis `74px`.
2. `features/speaking-listening/speaking-listening-addon.css`:
   - Mengintegrasikan kelas `.fsl-card-speaking` ke dalam styling Tactile Travertine yang seragam dengan `.fsl-card-listening`.
   - Menambahkan tata letak studio 2 kolom untuk viewport desktop ($\ge 768\text{px}$).
   - Menerapkan safe-bottom clearances untuk mengisolasi tombol "Lanjut" mengambang dari naskah dan gem footer.
   - Mengoptimalkan ukuran dan spasi elemen pada viewport compact ($\le 480\text{px}$).
3. `features/speaking-listening/fiezel-speaking-listening-addon.js`:
   - Memperbarui markup `renderSpeaking` dengan kelas `.fsl-card-speaking` dan tombol keluar `✕` (`.fsl-exit-btn`).
   - Menghapus tombol "Keluar" redundan dari bilah aksi `fsl-actions`.
4. Sinkronisasi Build Hexa-Sync (via `tools/bump-build.mjs`):
   - `coordination/BUILD-VERSION.json` -> `m025-675`
   - `sw.js` -> `m025-675`
   - `core-config.js` -> `m025-675`
   - `features/neural-voice/fiezel-diag-panel.js` -> `m025-675`
   - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html` -> `m025-675`

---

## 5. Status Gerbang Mutu Lokal

Semua gerbang mutu telah dieksekusi secara lokal dan dinyatakan **100% HIJAU**:
- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS** (10 pass, 0 fail)
- `node tests/speaking-listening-test.js` -> **PASS** (45/45 pass)
- `node tests/gems-test.js` -> **PASS** (34/34 pass)
- `node tools/bump-build.mjs --check` -> **Selaras** (6 titik sinkron pada build `m025-675`)

Catatan utang teknis: Tidak ada utang teknis baru yang diperkenalkan. Seluruh penyesuaian mematuhi *Zero-Dumbing Invariant*, *Anti-Ghost Answer*, dan *Tactile Travertine Design System*.
