# FIEZEL Handoff Dossier: m025-498 — Native In-App Interactive Swipe-Back Gesture Engine

## 1. Ringkasan Eksekutif & Akar Masalah
- **Keluhan Pengguna**:
  *"saat menggunakan aplikasi di ponsel (mobile), setiap kali saya melakukan gestur 'SWIPE BACK' (kembali) dari layar, panel, menu, atau latihan soal, layarnya MASIH SAJA memunculkan background hitam/splash gelap, lalu macet/freeze/stuck sekitar 3 detik baru normal kembali. Aplikasi ini harusnya terasa mulus seperti aplikasi natif (iOS/Android), bukan terasa seperti web murahan yang reload dan patah-patah setiap kali di-back!"*
  *"intinya aku mau saat aku lakukan swipe back kembali natural seperti apliaksi natif, bukan menampilkan backgroun hitam, cream, atau apapun, pookoknya saat aku lakukan swipeback harus natural"*
- **Akar Masalah Utama (Root Cause)**:
  1. **Browser Viewport Peeling Bawaan Safari/Chrome**:
     Pada peramban mobile (iOS Safari & Android Chrome), saat ada entri riwayat (`history.length > 1`), peramban memiliki gestur navigasi bawaan yang menyeret seluruh dokumen WebView ke kanan dan memperlihatkan kanvas browser di belakang dokumen (yang sebelumnya hitam pekat `#1B1418`, dan kemudian krem `#FBF7F3`).
  2. **Pendengar Sentuh Pasif Tidak Menghentikan Peeling**:
     `installEdgeSwipe` sebelumnya dipasang dengan `{ passive: true }`, dan pada peramban mobile biasa (`standalone === false`) atau Android bahkan tidak dipasang sama sekali (`needsEdgeSwipe` mengembalikan `false`). Akibatnya, `e.preventDefault()` tidak pernah terpanggil, peramban bebas menyeret viewport keluar layar, dan jika gestur dilepas di Home, peramban terlempar keluar dokumen ke `about:blank`, memicu muat ulang penuh (cold reboot) dengan timer splash minimum 3,56 detik (`VISIBLE_MS = 3560`).
  3. **Absennya Animasi Fisik 1:1 In-App**:
     Di aplikasi natif (iOS `UINavigationController` / Android predictive transition), panel atas atau modal secara fisik bergeser mengikuti jempol pengguna (`translateX(dx)`), meredupkan latar, lalu meluncur keluar jika dilepas melampaui batas (atau membal kembali jika dibatalkan).

---

## 2. Solusi Teknis & Implementasi Arsitektur
1. **Interactive In-App Native Gesture Engine (`features/ui/fiezel-back-nav.js`)**:
   - `installEdgeSwipe` kini mendeteksi target teratas secara otomatis (`findActiveSwipeTarget`):
     - Modal reguler (`#modalPanel`, backdrop `#modal`)
     - Panggung Suara Live drawer (`#fzStageDrawerMount`, backdrop)
     - JLPT Listening modal (`.listening-modal-box`, backdrop `#listeningPanelModal`)
     - Dialog Selamat Datang / Notifikasi (`.welcome-panel`, backdrop)
     - Dialog Autentikasi (`.auth-panel`, backdrop)
     - Kontainer view / stage (`#app`)
   - Pendengar sentuh didaftarkan dengan `{ passive: false }` pada `touchmove` di seluruh perangkat sentuh (`hasTouch`).
   - Saat gestur mendatar ke kanan terdeteksi dari zona tepi (`startX <= 32px`, `dx > 6 && dx > Math.abs(dy)`):
     - Memanggil `event.preventDefault()`! Ini mematikan overscroll peeling browser secara total di iOS Safari dan Chrome. Viewport dokumen tetap terkunci di layar, bebas bocor kanvas.
     - Menerjemahkan panel target secara fisik 1:1 mengikuti jemari: `transform: translate3d(dx, 0, 0)` dengan bayangan tepi lembut (`boxShadow: -8px 0 28px rgba(0,0,0,0.22)`).
     - Meredupkan backdrop modal secara proporsional.
   - Di Home (akar aplikasi, `depth === 0`), menerapkan resistensi pegas (rubber-band resistance) maksimal 24–26px yang membal kembali ke 0 secara elastis, tanpa me-reload aplikasi dan tanpa menembus ke `about:blank`.
2. **Pelepasan Gestur & Snap Transisi**:
   - Jika dilepas melampaui ambang (`dx >= 64px`):
     - Meluncurkan target keluar layar dengan kurva halus: `transition: transform 0.20s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.18s ease; transform: translate3d(100%, 0, 0)`.
     - Mengubah opacity backdrop menjadi 0.
     - Setelah 180ms, membersihkan inline style dan mengeksekusi penutupan layer/view via `fire()` -> `onBack()`.
   - Jika dibatalkan (`dx < 64px`):
     - Membal kembali ke posisi 0: `transition: transform 0.18s cubic-bezier(0.25, 1, 0.5, 1); transform: translate3d(0, 0, 0)`.
     - Mengembalikan opacity backdrop.
3. **Penyalaan Global di `app.js`**:
   - `installBackNav()` kini menyalakan `edgeSwipe: true` secara eksplisit, memastikan engine gestur aktif di semua perangkat mobile (baik mode browser maupun standalone PWA).

---

## 3. Bukti Pengujian Empiris (Playwright Headless Audit)
Skrip probe Playwright mobile touch:
1. `tools/dev/probe-native-interactive-swipe.mjs`:
   - Viewport iPhone 390x844 dengan emulasi sentuh (`hasTouch: true`).
   - TEST 1 (Modal Swipe Drag): Modal terbuka, di-drag dari x=12 ke x=240, tertutup mulus pada release -> **PASS**.
   - TEST 2 (Sub-View Swipe Drag): Masuk ke Perpustakaan, di-swipe kembali ke Beranda tanpa muat ulang -> **PASS**.
   - TEST 3 (Stage / Quiz Practice): Membuka 2 stage berjenjang (vocab-review -> quiz), swipe pertama menutup kuis ke vocab-review, swipe kedua menutup vocab-review ke base screen -> **PASS**.
   - TEST 4 (Home Rubber-Band & Anti-Reload): 3x swipe berturut-turut di Home, `splash=false`, `isBooting=false`, `unloads=0` -> **PASS**.
2. `tools/dev/probe-swipe-zero-reload-audit.mjs`:
   - 5x swipe back beruntun di Home: 0 dark bleed, 0 unloads, 0 splash reappearance -> **PASS**.

---

## 4. Gerbang Mutu Lokal (Quality Gates)
- `node tests/back-nav-test.js`: **PASS 61/61 asersi**
- `node tests/pastel-field-contrast-test.js`: **PASS 9/9**
- `node tests/boot-order-test.js`: **PASS 15/15**
- `node tests/gate-registry-test.js`: **PASS 10/10**
- `node tests/th-ui-leak-test.js`: **PASS 3945 kunci**
- `node tests/rollout-plan-test.js`: **PASS 142 asersi**
- `node tests/curriculum-cache-version-test.js`: **PASS 26 asersi (m025-498)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**
- `node tools/bump-build.mjs --check`: **Selaras (6 titik sinkron ke m025-498)**

---

## 5. Berkas yang Dimodifikasi
- `features/ui/fiezel-back-nav.js`: Penambahan engine gestur interaktif 1:1, pelacak target overlay/stage/view, pencegah overscroll browser (`preventDefault` non-pasif), dan pembal elastis.
- `app.js`: Pengaktifan `edgeSwipe: true` pada `installBackNav()`.
- `tools/dev/probe-native-interactive-swipe.mjs`: Skrip audit empiris Playwright mobile gesture.
- `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`: Bump build terorkestrasikan ke `m025-498`.
