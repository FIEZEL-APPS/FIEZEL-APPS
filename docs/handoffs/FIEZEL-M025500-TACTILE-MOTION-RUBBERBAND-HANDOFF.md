# FIEZEL Handoff Dossier: Native Scroll Rubber-Band Elasticity & Tactile Flashcard Physics Engine (Build m025-500)

## 1. Executive Summary & Audit Background
- **User Directive**:
  *"tapi seperti masih ada yang kurang, semacam sudah tidak ada effek gitu, saat melakukan scrolling, saat menyentuh paling bawah atau paling atas tidak mental, saat melakuakn swipe nflashcard juga tidak ada effeck, dan masih banyak lagi"*
- **Root Cause Analysis**:
  1. **Scroll Boundary Rigidity ("Tidak Mental")**:
     `index.html` dan `style.css` sebelumnya mengunci `overscroll-behavior: none !important` secara global. Hal ini mematikan physics momentum vertical di browser engine. Selain itu, webview PWA memerlukan JavaScript elastic tension engine aktif untuk menghasilkan tarikan fisik bergaya iOS di boundary atas (`scrollTop <= 0`) dan bawah (`scrollTop >= maxScroll`).
  2. **Dead Flashcard Dragging**:
     Fungsi `bindSwipe` di `app.js` sebelumnya hanya mendengarkan `touchstart` dan `touchend` pasif tanpa melacak pergerakan jari (`touchmove`). Kartu sama sekali tidak bergerak saat digeser (0 tracking, 0 tilt, 0 scaling). Saat dilepas, kartu berganti seketika tanpa animasi fly-out keluar layar atau spring snap-back jika dibatalkan. Selain itu, drag jari memicu event `click` yang menyebabkan kartu terbalik sendiri (*ghost flip*) saat murid sedang menggeser.
  3. **Suppressed Entrance Motion ("Tidak Ada Efek")**:
     Kelas `#app.is-repaint` diterapkan secara permanen di awal `renderInner()` tanpa pernah dibersihkan. CSS `#app.is-repaint .fade { animation: none !important; }` mematikan seluruh animasi transisi layar masuk (`pageIn`) di seluruh panel aplikasi.

---

## 2. Architectural Implementations

### A. Dynamic Scroll Rubber-Band Tension Engine (`installScrollRubberBand()`)
- Mengimplementasikan model resistensi asimptotik Apple:
  $$d_{\text{resisted}} = \text{sign}(\Delta y) \cdot \frac{|\Delta y| \cdot 300 \cdot 0.52}{300 + |\Delta y| \cdot 0.52}$$
- Berjalan aktif saat scroll menyentuh batas atas (`scrollTop <= 1 && dy > 0`) atau batas bawah (`scrollTop >= maxScroll - 2 && dy < 0`).
- Saat jari dilepas, kartu/layar memantul kembali (*"mental"*) menggunakan kurva spring overshoot:
  `cubic-bezier(0.175, 0.885, 0.32, 1.275)` selama 420ms dengan umpan balik getar haptik `haptic('tap')`.
- Restorasi CSS `overscroll-behavior-y: auto !important` dan `overscroll-behavior-x: none !important` di `index.html` dan `style.css` untuk mencegah tabrakan dengan gesture swipe navigasi horizontal.

### B. Full Tactile Flashcard Gesture & Physics Engine
- **1:1 Finger Tracking**: Kartu mengikuti posisi sentuhan jari secara real-time pada sumbu X dan mikro-pergerakan pada sumbu Y ($dy \times 0.22$).
- **Dynamic Angular Rotation Tilt**: Menghitung kemiringan realistis kartu secara proporsional:
  `rotate((dx * 0.08).toFixed(2) + 'deg')`
- **Dynamic Scale & Fade**: Menurunkan skala sedikit (`scale(0.93 - 1.0)`) dan transparansi (`opacity(0.55 - 1.0)`) seiring jauhnya tarikan.
- **Velocity-Aware Flick Commit**: Mendeteksi flick berkecepatan tinggi ($vx > 0.35\text{ px/ms}$) atau jarak geser $> 75\text{px}$.
- **Directional Fly-Out Animation**: Kartu meluncur mulus keluar layar (`translate3d(±510px, ...)`, rotasi $\pm 24^\circ$) saat swipe diselesaikan maupun saat tombol *"Masih Belajar"* (kiri) / *"Sudah Dikuasai"* (kanan) ditekan.
- **Overshoot Spring Snap-Back**: Jika swipe dibatalkan, kartu memantul kembali ke tengah dengan kurva `cubic-bezier(0.175, 0.885, 0.32, 1.275)`.
- **Anti-Ghost Flip Lock**: Menangkap fase `click` saat kartu digerakkan (`hasMoved === true`) dan memblokirnya agar tidak membalikkan kartu secara tidak sengaja.
- **Entrance Spring**: Setiap kartu baru yang muncul memiliki entrance animation `fzCardSpringIn` (`scale(0.93) translateY(16px)` ke posisi normal).

### C. Restorasi Entrance Transitions & Bottom Nav Tactile Pop
- Pembersihan asynchronous `#app.is-repaint` pasca render sehingga transisi `.fade` (`pageIn`) dapat bernafas dan hidup kembali di semua perpindahan tab dan panel.
- Penambahan efek kompresi tekan aktif (`:active { transform: scale(0.92); }`) dan pop spring saat tab dipilih (`@keyframes fzTabBounce`) pada `.bottomnav .nav.active`.

---

## 3. Empirical Verification Evidence (Playwright Headless Probe)
- Dijalankan melalui `tools/dev/probe-tactile-physics.mjs`:
  - **Test 1 (Computed Overscroll Styles)**:
    `{ htmlX: 'none', htmlY: 'auto', bodyX: 'none', bodyY: 'auto' }` -> PASS.
  - **Test 2 (Rubber-band Bounce at Top Edge)**:
    - Tarikan $\Delta y = 150\text{px}$ menghasilkan transformasi peregangan: `translate3d(0px, 61.9px, 0px)`.
    - Transisi pelepasan (*"mental"*): `transform 0.42s cubic-bezier(0.175, 0.885, 0.32, 1.275)` menuju `translate3d(0px, 0px, 0px)`.
    -> PASS.
  - **Test 3 (Flashcard Drag & Swipe Physics)**:
    - Drag $-100\text{px}$: `translate3d(-100px, 2.2px, 0px) rotate(-8deg) scale(0.944)`, opacity: `0.88`.
    - Commit fly-out: `translate3d(-510px, 3px, 0px) rotate(-24deg) scale(0.9)`, transition: `transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1)`.
    -> PASS.

---

## 4. Local Quality Gates Matrix
- `tests/regression-test.js`: PASS
- `tests/id-golden-snapshot-test.js`: PASS
- `tests/th-ui-leak-test.js`: PASS
- `tests/curriculum-cache-version-test.js`: PASS (26 penegasan, build `m025-500`)
- `tests/gate-registry-test.js`: PASS
- `tests/pastel-field-contrast-test.js`: PASS
- `tests/boot-order-test.js`: PASS
- `tests/splash-choreography-test.js`: PASS
- `tools/bump-build.mjs --check`: SELARAS (6 titik sinkron penuh)
