# FIEZEL-M025570 — Perbaikan Lompatan Logo Ganda Saat Splash & Jeda Layar Kuning Menuju Home (`m025-570`)

## 1. Ringkasan Temuan Audit & Akar Masalah

Menindaklanjuti laporan pengguna pasca-rilis `m025-567`:
> *"kenpa saat splash logonya muncul dua kali di atas dan di bawah, dan saat selesai splash ada jeda dengan latar warna kuning, bukan langsung masuk home"*

Melalui audit empiris frame-demi-frame menggunakan Chromium Playwright (`390x844`, DPR 2/3), ditemukan dua akar masalah mekanis yang presisi:

### A. Mengapa Logo Muncul Dua Kali (Di Atas dan Di Bawah) Saat Splash
1. **Ketidakselarasan Koordinat CSS Grid vs JS `layout()` (`top: 241px` vs `top: 301px`)**:
   - Pada fase pra-klaim (`#fiezelBootSplash:not([data-fiezel-boot-claimed="shown"])`), posisi `<svg class="fiezel-logo">` diatur oleh grid `.fiezel-splash-brand` (`grid-template-rows: 1fr auto auto; padding: 24px 24px 17vh;`), yang menempatkan logo **60px lebih tinggi di bagian atas (`top = 241.0px` pada layar tinggi `844px`)**.
   - Ketika `FiezelSplash.show()` mengklaim `#fiezelBootSplash` dan menjalankan `layout()`, posisi `.fiezel-logo` diubah menjadi `position: absolute; top: ((h - 512 * scale) / 2) + 'px'` (**`top = 301.1px`, 60px lebih rendah di bagian bawah**).
2. **Kedipan & Penggambaran Ulang Partikel Saat Klaim (`adoptedRevealed` & `skipBuild`)**:
   - Di `features/brand/fiezel-splash.js`, `adoptedRevealed` sebelumnya dibatasi `ctl.startOffset >= 500`, sementara `particles.init` hanya mengaktifkan `skipBuild` jika `ctl.startOffset >= 1320`.
   - Akibatnya, setelah CSS memunculkan logo di posisi atas (`top = 241px`), saat `FiezelSplash.show()` mengklaim splash (`< 1320ms`), kanvas partikel dan/atau `layout()` memunculkan logo kedua kalinya di posisi bawah (`top = 301px`).

### B. Mengapa Ada Jeda Berlatar Warna Kuning (`#FBF7F3`) Saat Selesai Splash Sebelum Masuk Home
1. **Penahanan Asinkron `roleResolutionPromise` Selama 1.200 ms Sesudah Splash Tutup**:
   - Di `app.js` (`startWelcomeExperience()`), callback penutupan splash (`showBrandSplash(..., at => { ... })`) selalu menunggu `Promise.race([roleResolutionPromise, new Promise(r => setTimeout(r, 1200))]).then(proceed)` meskipun tidak ada token undangan guru di URL (`?token=...`).
   - Sementara itu, `close()` di `features/brand/fiezel-splash.js` sudah mencopot kelas `html.fz-booting` (`endBootBackground(target)`) dan memulai animasi keluar `.is-leaving`.
2. **Isolasi `content-visibility: hidden; contain: strict` pada `main.app`**:
   - Aturan `html.fz-booting main.app, html.fz-booting #globalSky { content-visibility: hidden; contain: strict }` di `index.html` ditambah penundaan `render()` hingga `openApp()` menyebabkan `#app` masih kosong (`innerHTML.length === 0`) ketika tirai splash menghilang.
   - Hasilnya, murid menatap layar kosong berwarna krem/kuning (`#FBF7F3` + bilah navigasi bawah kuning) selama ±800–1.200 ms sebelum `proceed()` → `openApp()` → `render()` menggambar beranda (`Home`).

---

## 2. Solusi yang Diterapkan

1. **Penyelarasan Piksel-Persis Posisi Logo CSS & JS (`0.0px` Pergeseran)**:
   - Di `index.html` (`#fiezelBootCritical`), menambahkan `#fiezelBootSplash .fiezel-logo { position: absolute; left: calc(50% - 31vmin); top: calc(50% - 31vmin); width: 62vmin; height: 62vmin }` yang secara matematis identik dengan rumus `layout()` di `fiezel-splash.js` (`box = Math.min(w, h) * 0.62`), serta menghapus `content-visibility: hidden; contain: strict` pada `main.app`.
2. ** Eliminasi Render Ganda Partikel & Sinkronisasi Instan Saat Adopsi**:
   - Di `features/brand/fiezel-splash.js` (`startMotion`), mengaktifkan `adoptedRevealed = !!(ctl.adopted && !frozenMode)` untuk seluruh splash boot yang diadopsi, memanggil `layout()` secara sinkron bersama `applyVisualState(ctl.startOffset)` sebelum `requestAnimationFrame`, dan meneruskan `skipBuild: !frozenMode && (adoptedRevealed || ctl.startOffset >= ...)` ke `particles.init()` agar kanvas tidak menggambar logo partikel kedua di atas logo SVG yang sudah tampil.
3. **Render Beranda Sinkron di Balik Splash Sebelum Tirai Turun (`0 ms` Jeda Layar Kuning)**:
   - Di `features/brand/fiezel-splash.js` (`close()`), memanggil `opts.onClose({ via: 'close' })` **sebelum** `endBootBackground(target)` dan `host.classList.add('is-leaving')` sehingga DOM beranda/gerbang selesai dirender selagi tirai splash masih menutup layar.
   - Di `app.js` (`startRoleResolution()` & `startWelcomeExperience()`), menjalankan `proceed()` secara **sinkron** begitu splash selesai (kecuali terdapat parameter URL token guru `?token=...` yang sedang diverifikasi), dan memastikan bila resolusi peran guru selesai di latar belakang sesudah `appOpened`, aplikasi langsung berpindah ke `'tutor'`.

---

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Pengukuran linimasa frame di Chromium Playwright (`390x844`, skenario murid masuk ke `Home`):

| Metrik Empiris | Sebelum (`m025-567`) | Sesudah (`m025-570`) | Status |
|---|---|---|---|
| Posisi vertikal `.fiezel-logo` pra-klaim (`spClaimed: null`) | `top = 241.0px` (di atas) | **`top = 301.1px`** | **Stabil (`0.0px` lompatan)** |
| Posisi vertikal `.fiezel-logo` pasca-klaim (`spClaimed: "shown"`) | `top = 301.1px` (lompat +60px ke bawah) | **`top = 301.1px`** | **Stabil (`0.0px` lompatan)** |
| Penggambaran ulang partikel saat adopsi | Aktif bila `startOffset < 1320ms` | **Dilewati (`skipBuild: true`)** | **Nol logo ganda** |
| Isi `#app` (`appLen`) tepat saat splash lepas (`spPresent: false`) | `0` selama 800–1.200 ms (layar kuning kosong) | **`44.960` karakter (`Home` langsung tampil)** | **Nol jeda layar kuning** |

---

## 4. Daftar Berkas yang Disentuh

- `index.html` — Penyelarasan koordinat `#fiezelBootSplash .fiezel-logo` (`calc(50% - 31vmin)`) dan pencabutan `content-visibility: hidden` pada `main.app`.
- `features/brand/fiezel-splash.js` — Penyelarasan `adoptedRevealed`, `skipBuild`, pemanggilan sinkron `layout()`, dan urutan `opts.onClose` sebelum `endBootBackground` + `is-leaving`.
- `app.js` — Eksekusi sinkron `proceed()` pada `startWelcomeExperience()` tanpa penahanan asinkron 1.200 ms ketika tidak ada token guru di URL.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html` — Kenaikan nomor build ke `m025-570` melalui arbiter `node tools/bump-build.mjs`.
- `docs/handoffs/FIEZEL-M025570-SPLASH-DUAL-LOGO-YELLOW-GAP-FIX-HANDOFF.md` — Dokumen serah terima ini.

---

## 5. Status Kelulusan Gerbang Mutu Lokal & Utang Teknis

- `node tools/bump-build.mjs --check` → **PASS (`Selaras` 6 titik ke `m025-570`)**
- `node tests/splash-first-paint-test.js` → **PASS**
- `node tests/splash-choreography-test.js` → **PASS**
- `node tests/teacher-instant-boot-test.js` → **PASS (6/6)**
- `node tests/boot-order-test.js` → **PASS**
- `node tests/id-golden-snapshot-test.js` → **PASS**
- `node tests/th-ui-leak-test.js` → **PASS**
- `node tests/curriculum-cache-version-test.js` → **PASS (`m025-570`)**
- `node tests/gate-registry-test.js` → **PASS (10/10)**
- **Catatan Utang Teknis**: Rekomendasi struktural P1 dari laporan audit performa boot (pemisahan cache konten 26 MB dari cangkang `sw.js` dan pemangkasan CSS global) tetap tercatat untuk gelombang optimasi struktural berikutnya.
