# m025-493 — Eliminasi Total Kedipan, Blank White Flash, dan Double-Fade Saat Beralih Tab Panel PWA

## 1. Ringkasan Temuan Audit & Akar Masalah (Empiris, Bukan Asumsi)

### Gejala
Pengguna melaporkan bahwa setiap kali berpindah tab panel di aplikasi PWA (baik navigasi utama di bawah seperti Home, Latihan, KelasKu, Progres, Profil maupun subtab internal di Progres dan KelasKu), layar tampak berkedip/flicker putih seolah-olah sedang melakukan refresh halaman penuh (*"setiap kali beralih tab panel, berkedip kedip, seperti sedang melakukan refresh, itu sangat mengganggu, itu adalah BUG TERBESAR SEKARANG INI"*).

### Diagnosis Empiris (Headless Chromium Playwright Probe)
Pengujian empiris dilakukan dengan membaca `state`, `getComputedStyle(el).opacity`, dan `getComputedStyle(el).animation` per 16ms (frame-by-frame) pada:
1. `tools/dev/probe-flicker-empirical.mjs` (transisi tab utama)
2. `tools/dev/probe-subtabs-empirical.mjs` (transisi subtab internal)

Ditemukan **4 akar masalah struktural**:

1. **Desinkronisasi View Transition & Penghapusan `is-repaint`**:
   `document.startViewTransition` melakukan cross-fade default 500ms (`--dur-l`). Ketika transisi selesai di $t \approx 600\text{ms}$, fungsi `__done()` di `app.js:9228` memanggil `$('app')?.classList?.remove?.('is-repaint')`. Penghapusan kelas `is-repaint` ini seketika melepaskan proteksi CSS `.fade` (`animation: pageIn .5s`) dan `body.fz-lux .fade > *` (`animation: luxRise .5s`), yang langsung menjatuhkan opacity elemen dari 1.0 ke 0.0 pada $t = 677\text{ms}\text{--}775\text{ms}$. Murid melihat kilatan putih kedua ("double-blink") yang terasa seperti reload halaman.

2. **Kebocoran App Shell (`.topbar` & `.bottomnav`)**:
   Baik bilah atas (`.topbar`) maupun navigasi bawah (`.bottomnav`) tidak memiliki `view-transition-name` terisolasi. Akibatnya, seluruh cangkang navigasi ikut larut (*cross-fade/blur*) bersama seluruh isi halaman saat transisi berjalan, bukan diam kokoh di tempatnya.

3. **Penghancuran Pohon DOM pada Subtab Progres**:
   Setiap kali murid memilih tab internal di Progres (Ringkasan, Keterampilan, Tata Bahasa, Membaca), `switchProgressTab()` memanggil fungsi `progress()` yang mengeksekusi `shell(...) -> setApp(...)`. Ini menghancurkan dan mencetak ulang seluruh elemen `#app` dari awal, memicu animasi masuk `.fade` dan `luxRise` dari opacity 0.0 (tercatat di probe: `tabsOp: 0`, `fadeOp: 0`).

4. **Trigger Ulang Animasi `chIn` pada Tab Ruang Kelas**:
   Di `features/class-hub/fiezel-class-hub.js`, pemilihan tab murid (Tugas, Kelas, Progres) mengubah `lastStudentPaintKey`, menyebabkan `repaint = false`. Ini memicu animasi CSS `.ch-student { animation: chIn .4s }` dan `.ch-body { animation: chIn .35s }`, menghasilkan efek loncat dan berkedip.

---

## 2. Solusi Perbaikan

### 2a. Isolasi Navigasi & Percepatan Transisi (`style.css` & `features/ui/fiezel-lux.css`)
- **Isolasi Shell**: Menambahkan `view-transition-name: topbar` pada `.topbar` dan `view-transition-name: bottomnav` pada `.bottomnav`, dilengkapi aturan `animation: none; mix-blend-mode: normal;`. Bilah navigasi kini tetap diam solid dan tidak ikut berkedip atau larut.
- **Transisi Responsif**: Menyesuaikan durasi `::view-transition-old(root)` dan `::view-transition-new(root)` dari 500ms menjadi 160ms (`0.16s linear`), menghilangkan jeda lambat yang menyerupai muat ulang browser.
- **Supresi Re-fade Menyeluruh**: Memperluas selektor penekan animasi `.is-repaint` pada `#app.is-repaint .fade, #app.is-repaint .fade > *, .is-repaint *` serta aturan spesifik tema Lux `body.fz-lux .is-repaint .fade > *, body.fz-lux #app.is-repaint .fade > * { animation: none !important; }`.

### 2b. Retensi State & Pembedahan In-Place Subtab (`app.js`)
- Di fungsi `go()`: `__done()` tidak lagi mencabut `is-repaint` setelah transisi selesai, memastikan elemen tidak pernah jatuh ke opacity 0.0.
- Di fungsi `renderInner()`: Mempertahankan penambahan kelas `is-repaint` ke container aplikasi.
- Di fungsi `progress()`: Menyediakan kontainer `<div id="progressTabPane" class="progress-tab-pane">`. Ketika berpindah subtab, fungsi memperbarui `pane.innerHTML` secara in-place tanpa merusak DOM shell atau tab bar.
- Di fungsi `switchOnlineTab()` & `switchOnlineBoard()`: Memperbarui tombol aktif dan memanggil `renderOnlineTab()` secara in-place bila kontainer sudah terpasang.

### 2c. Stabilisasi Tab Ruang Kelas (`features/class-hub/fiezel-class-hub.js`)
- Menandai pergantian subtab murid sebagai `repaint = true` bila elemen `.ch-student` sudah ada di dalam DOM.
- Menyematkan kelas `is-repaint` pada render guru (`.ch.ch-teacher.is-repaint`).

---

## 3. Bukti Pengujian Empiris Headless Playwright

### Transisi Tab Utama (Bottom Nav)
- **Sebelum**:
  - Opacity drop di bawah 0.95: **1 kali per perpindahan tab** (jatuh ke 0.0 pada $t \approx 677\text{ms}$).
  - Durasi transisi lambat: 500ms cross-fade root.
- **Sesudah**:
  - Opacity drop di bawah 0.95: **0 kali** (selalu konstan di 1.0 sepanjang 74 frame sample sampling per transisi).
  - Animasi fade / luxRise: `none`.

### Transisi Subtab Internal (Progres & KelasKu)
- **Sebelum**:
  - `minFade`: 0.12 (mulai dari 0.0).
  - `tabsOp`: 0.0 (tab bar ikut hancur dan dirender ulang).
- **Sesudah**:
  - Progres Subtabs: `minFade: 1.0`, `minTabs: 1.0`, `fadeAnim: none`, `tabsAnim: none`.
  - KelasKu Subtabs: `minCh: 1.0`, `chAnim: none`, `tabsOp: 1.0`, `panelOp: 1.0`.

---

## 4. Status Kelulusan Gerbang Mutu Lokal & Hexa-Sync

1. `node tests/id-golden-snapshot-test.js` -> **PASS** (13 berkas terkunci, 4937 literal, 5 jangkar).
2. `node tests/th-ui-leak-test.js` -> **PASS** (3945 kunci id memiliki padanan th lengkap).
3. `node tests/curriculum-cache-version-test.js` -> **PASS** (26 penegasan, 2 halaman, build m025-493).
4. `node tests/gate-registry-test.js` -> **PASS** (371 berkas uji, 10 pass, 0 fail).
5. `node tools/bump-build.mjs --check` -> **Selaras** (6 titik: `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`).
