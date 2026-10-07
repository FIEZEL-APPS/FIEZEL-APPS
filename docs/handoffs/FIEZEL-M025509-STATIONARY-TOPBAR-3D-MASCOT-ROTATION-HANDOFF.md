# FIEZEL HANDOFF DOSSIER: M025-509
## Stationary Topbar & Touch-Isolated 3D Mascot Drag Rotation Across Practice Sessions

- **Build Version**: `m025-509`
- **Tanggal**: 2026-10-08
- **Tipe**: `fix(ui)`
- **Status Mutu**: 100% HIJAU (Semua Gerbang Mutu Lokal & Playwright Lulus)
- **Hexa-Sync**: Selaras di 6 titik kanonik (`m025-509`)

---

### 1. Ringkasan Eksekutif & Latar Belakang Perubahan

Pengguna melaporkan masalah interaksi dan kenyamanan visual yang mengganggu pada sesi latihan:
> *"aku sangat terganggu dengan topbar di dalam semua sesi latihan, karna saat aku scroll, saat aku memainkan mascot 3d nya untuk aku lakukan rotasi 3d, semua kartu, dan topbarnya ikut bergerak gerak, itu sangat menggaggu"*

#### Temuan Akar Masalah (Root Cause Analysis):
1. **Interferensi Rubber-Band Transform pada `#app`**:
   - Di `app.js` fungsi `installScrollRubberBand()`, event `touchmove` pada batas scroll atas/bawah menerapkan transform langsung ke root: `appEl.style.transform = translate3d(0, ${resisted}px, 0)`.
   - Karena maskot 3D dan topbar berada di area atas, setiap kali murid menyentuh maskot atau menggeser layar di sesi latihan, `#app` bergeser turun-naik dan memantul (*overshoot spring bounce* via cubic-bezier `(0.175, 0.885, 0.32, 1.275)`).
   - Akibatnya, seluruh kartu soal, pilihan jawaban, dan topbar ikut bergetar/bergerak tak terkendali.

2. **Ketiadaan Touch Isolation pada Maskot 3D**:
   - Berkas `features/ui/mobile-edge-fit.css` sebelumnya secara eksplisit mendeklarasikan `touch-action: pan-y !important;` pada `.fz-mochi-viewport canvas`.
   - Browser memperlakukan gesture sentuhan pada maskot sebagai gesture scroll halaman (*vertical panning*). Akibatnya, alih-alih maskot berotasi 3D, gesture tersebut justru menyeret halaman ke atas/bawah.
   - Di `mochi-mascot/fiezel-mochi.js`, rotasi hanya mengandalkan event `pointermove` tanpa *pointer capture* dan tanpa `stopPropagation`/`preventDefault`.

3. **Perilaku Floating Sticky Capsule Topbar**:
   - Pada `body.fz-stage-quiz .quiz-topbar`, styling lama menggunakan `top: 8px; margin: 0 0 6px; border-radius: 18px;` sebagai kapsul melayang.
   - Saat mulai di-scroll, posisinya bergeser (melompat dari `y: 18px` ke `y: 8px`), dan kartu soal meluncur di bawahnya dengan teks/header yang bertabrakan menembus celah tepi transparan kapsul.

---

### 2. Solusi & Resolusi Teknis

1. **Perlindungan Sesi Latihan dari Rubber-Band**:
   - Di `app.js` (`installScrollRubberBand`), ditambahkan proteksi ketat:
     ```javascript
     if (document.body.classList.contains('fz-lesson-mode') ||
         document.body.classList.contains('fz-stage-quiz') ||
         document.body.classList.contains('fz-stage-sl') ||
         (e.target && e.target.closest && e.target.closest('.quiz-shell, .quiz-stage, fiezel-mascot, .fz-mochi-viewport, canvas, .card, .fsl-player, .jlpt-mobile-card, .jlpt-mascot-slot, .fsl-shell, .writing-stage'))) return;
     ```
   - Di semua sesi latihan dan interaksi maskot, `#app` dijamin 100% rigid, stabil, dan bebas guncangan transform.

2. **Touch Isolation & Rotasi 3D Drag yang Halus**:
   - Di `features/ui/mobile-edge-fit.css`, diubah menjadi:
     ```css
     .fz-mochi-viewport,
     .fz-mochi-viewport canvas {
       overflow: visible !important;
       touch-action: none !important;
       user-select: none !important;
       -webkit-user-select: none !important;
       pointer-events: auto !important;
       display: block !important;
     }
     ```
   - Di `features/mascot/fiezel-mochi-companion.js`, dipasang `touch-action: none; cursor: grab;` pada viewport.
   - Di `mochi-mascot/fiezel-mochi.js` (`bindEvents`):
     - Mengimplementasikan pointer capture (`setPointerCapture`/`releasePointerCapture`).
     - Menghitung delta geser ($dx, dy$) untuk rotasi yaw (sumbu Y) dan pitch (sumbu X) 3D yang interaktif, responsif, dan buttery-smooth.
     - Menghentikan propagasi sentuhan (`stopPropagation`, `preventDefault`) sehingga halaman sama sekali tidak ikut tergulir saat murid memutar maskot 3D.

3. **Topbar Bersih & Stationary Flush**:
   - Di `style.css` (`body.fz-stage-quiz .quiz-topbar, body.fz-lux.fz-stage-quiz .quiz-topbar`):
     - Di-anchor kokoh di `top: 0 !important; width: 100% !important; margin: 0 0 14px 0 !important;`.
     - Latar belakang solid putih `#FFFFFF` dengan batas bawah rapi `border-bottom: 1.5px solid #E2E8F0;` dan sudut bawah membulat `border-radius: 0 0 16px 16px;`.
     - Saat halaman digulir, topbar tetap kokoh di `top: 0` tanpa melompat atau bergetar, dan konten soal masuk rapi di balik bilah header tanpa bocor/tabrakan teks.

---

### 3. Bukti Pengujian Empiris (Headless Chromium Playwright)

Skrip probe empiris Playwright `tests/test_interactive_mascot_topbar.mjs` dijalankan secara mandiri:
```
Static server ready on http://127.0.0.1:8129
Navigating to http://127.0.0.1:8129/index.html...
Starting level practice quiz...

Initial Diag:
  topbarBox: { x: 6, y: 0, width: 378, height: 70, top: 0, right: 384, bottom: 70, left: 6 }
  topbarStyle: { position: "sticky", top: "0px", transform: "none" }
  mascotBox: { x: 120.9, y: 548.5, width: 148.2, height: 140.4 }
  canvasStyle: { touchAction: "none", pointerEvents: "auto" }

--- TEST 1: Touch dragging on 3D mascot ---
Mascot Drag Result: {
  "downRot": { "x": 0, "y": 0 },
  "moveRot": { "x": 0, "y": 1.44 },
  "appTransformDuringDrag": "",
  "topbarYDuringDrag": 0
}

--- VERIFYING ASSERTIONS ---
✅ PASS: Mascot successfully rotated in 3D during drag (rotY increased from 0 to 1.44)
✅ PASS: #app transform remained stationary (appTransform = "")
✅ PASS: Topbar stayed rock-solid at top: 0 (topbarY = 0)

--- TEST 2: Scrolling test ---
Scroll Result: {
  "scrollY": 200,
  "topbarRect": { "x": 6, "y": 0, width: 378, height: 70, top: 0, right: 384, bottom: 70, left: 6 },
  "appTransform": ""
}
✅ PASS: Topbar stays firmly pinned at top: 0 during scrolling (top = 0) without jumping or jittering!
Screenshot saved to: tests/output/topbar_stationary_verified.png

--- ALL TEST ASSERTIONS PASSED 100% ---
```

---

### 4. Daftar Berkas yang Disentuh & Perubahan

| Berkas | Aksi | Ringkasan Perubahan |
|---|---|---|
| `app.js` | Update | Mengecualikan sesi latihan, panggung kuis, dan interaksi maskot dari efek rubber band `#app`. |
| `mochi-mascot/fiezel-mochi.js` | Update | Menambahkan pointer capture, drag-to-rotate 3D yaw/pitch, dan isolasi gesture sentuhan agar tidak memicu scroll browser. |
| `features/mascot/fiezel-mochi-companion.js` | Update | Mengunci `touchAction: 'none'`, kursor `grab`, dan isolasi event sentuh pada `.fz-mochi-viewport`. |
| `features/ui/mobile-edge-fit.css` | Update | Mengubah `touch-action: pan-y` menjadi `touch-action: none` pada canvas viewport maskot. |
| `style.css` | Update | Memaku `.quiz-topbar` di `top: 0` penuh dengan background solid, border bawah rapi, dan margin presisi tanpa gap mengambang. |
| `tests/test_interactive_mascot_topbar.mjs` | Create | Pengujian Playwright otomatis memvalidasi rotasi 3D maskot dan kestabilan posisi topbar/kartu. |
| `sw.js` | Update | Build version bump ke `m025-509`. |
| `core-config.js` | Update | Build version bump ke `m025-509`. |
| `features/neural-voice/fiezel-diag-panel.js` | Update | Diag version bump ke `m025-509`. |
| `kurikulum.html` & `misi.html` | Update | Cache version query bump ke `m025-509`. |
| `coordination/BUILD-VERSION.json` | Update | Sinkronisasi metadata build ke `m025-509`. |

---

### 5. Laporan Verifikasi Gerbang Mutu Lokal

1. `tests/id-golden-snapshot-test.js`: **PASS (Baseline emas Indonesia utuh)**
2. `tests/th-ui-leak-test.js`: **PASS (3956 kunci i18n selaras)**
3. `tests/curriculum-cache-version-test.js`: **PASS (Build m025-509 selaras)**
4. `tests/gate-registry-test.js`: **PASS (10/10 assertions)**
5. `tests/test_interactive_mascot_topbar.mjs`: **PASS (100% assertions Playwright)**
6. `tools/bump-build.mjs --check`: **PASS (Selaras di 6 titik wajib)**
