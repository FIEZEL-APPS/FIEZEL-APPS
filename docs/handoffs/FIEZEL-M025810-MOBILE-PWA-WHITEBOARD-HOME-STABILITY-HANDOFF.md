# FIEZEL m025-810 Handoff Dossier — Mobile PWA Whiteboard Crash/OOM Elimination & Home Greeting/Mochi Stability Lock

- **Build**: `m025-810` (bumped from `m025-809` via `node tools/bump-build.mjs`)
- **Status**: COMPLETE / VERIFIED (100% PASS on iPhone 14 + Android Pixel 8 Mobile PWA probes, 31/31 strict Whiteboard probe, 13/13 contract suite)
- **Authority**: OWNER/MASTER authority
- **Branch**: `fix/mobile-pwa-whiteboard-home-stability`
- **Scope**: Zero-collateral-damage surgical fixes for Mobile PWA (iOS Safari Standalone & Android Chrome PWA) Whiteboard OOM/force-close/splash-stuck crashes and Home menu greeting card & 3D Mochi stage morphing/shifting.

---

## 1. Ringkasan Temuan Audit Empiris & Akar Penyebab

### A. Crash / Force Close / Refresh ke Splash & Stuck saat Masuk Papan Tulis di PWA Mobile (iPhone & Android)
1. **Dual Simultaneous High-Perf MSAA Three.js WebGL Contexts (Jetsam / Renderer OOM Killer)**:
   - Host `index.html` (`features/mascot/fiezel-mochi-companion.js`) mempertahankan konteks WebGL #1 (`SKIN_RES=1024`, MSAA, DPR `3.0` di iPhone) saat masuk Kawan Bicara karena `FiezelMochiCompanion.pause()` hanya menghentikan loop RAF tanpa `destroyPool()` / `forceContextLoss()`.
   - Iframe `call.html` (`features/voice-studio/src/App.tsx`) membuat konteks WebGL #2 (`SKIN_RES=1024`, MSAA, `powerPreference: 'high-performance'`, DPR `2.25`) dan hanya memanggil `inst.pause()` ketika Papan Tulis layar penuh terbuka di mobile. Dua konteks Three.js HD aktif bersamaan + lonjakan audio langsung memicu pembunuhan proses WebContent (iOS Jetsam / Android OOM) -> memuat ulang PWA kembali ke `#fiezelBootSplash`.
2. **Lonjakan Memori Audio 5x Paralel + Cache Ganda (`InCallLearningWorkbenchModal.tsx`, `liveTransport.ts`)**:
   - Membuka Papan Tulis memicu `Chunk 0` + 4 `lookaheadWorkers` paralel dalam 20ms, mengunduh & mendekode 9–13 chunk Float32 PCM 48kHz secara serentak (salinan ganda `decodeAudioData` + `processSpeechBuffer`) ditambah cache ganda base64 WAV (`trackCacheRef` max 20 + `_ttsMemoryCache` max 32) tanpa eviksi buffer yang sudah diputar.
3. **Ketiadaan `ErrorBoundary`, `backdrop-blur` & `will-change` Berlapis, `92vh` iOS, dan Kartu Buffering Mobile Terjepit**:
   - Belum ada React `ErrorBoundary` di sekeliling `InCallLearningWorkbenchModal` maupun `LiveWhiteboardCanvas`.
   - `backdrop-blur-[5px]` / `backdrop-blur-md` / `will-change` statis memaksa WebKit membuat banyak backing-store texture GPU di layar kecil; `h-[92vh]` meleset terhadap dynamic viewport PWA iOS (`dvh`); dan kartu buffering mobile 3 kolom menjepit judul *"Fiezel sedang menyiapkan penjelasan untukmu"* menjadi 5 baris sempit.
4. **WebKit Cached `<link media="print">` Quirk pada Boot Splash (`app.js`)**:
   - Saat reload pasca-recovery di iOS Safari, `<link data-fz-shell-css media="print">` yang sudah ada di cache dapat memiliki `el.sheet` tanpa memicu `onload`, membuat `shellCssSettled()` tertahan sampai 4 detik dan membuka splash sebelum `fiezel-tactile-clay.css` dipromosikan ke `media="all"`.

### B. Kartu Sapaan User & Panggung 3D Mochi di Menu Utama (Home) Berubah-ubah / Bergeser
1. **Override `!important` Menyalakan Titik Hijau Liar & Lencana Streak Oranye di `.fz-vissol-welcome`**:
   - `features/ui/fiezel-tactile-clay.css` memasang `.tactile-kicker-dot { display: inline-block !important; }` dan `.tactile-streak-badge { display: inline-flex !important; }` yang menimpa `style="display:none;"` di `app.js`. Setiap kali akun memiliki `streak > 0` (atau selesai cloud sync), titik hijau liar dan lencana streak oranye tiba-tiba muncul dan menekan kartu sapaan serta panggung Mochi.
2. **Konflik Tipografi & Layout Shift**:
   - Konflik ukuran font (`24px` vs `32px` weight `900` vs `26px` weight `800`) dan margin tidak konsisten di `.fz-vissol-welcome`, ditambah `mountOn()` menimpa `host.style.display = 'block'` pada `.fz-vissol-mascot-wrap` dan sempat menampilkan mood `'dots'` tanpa headset sebelum berpindah ke `'happy'` + headset.
3. **Re-render Penuh oleh Cloud Sync & Pencurian Mochi oleh Overlay Non-Kuis**:
   - `applyAccountCloudSnapshot()` di `app.js` memanggil `render()` penuh dan menghancurkan DOM Home meskipun data visual Home tidak berubah, membuat 3D Mochi berkedip ulang ke 2D SVG (`paw-mochi-idle.svg`) lalu kembali ke 3D. Selain itu `outranks()` di `fiezel-mochi-companion.js` mengizinkan modal/overlay non-kuis mencuri 3D Mochi dari Home.

---

## 2. Daftar Berkas & Perubahan

- `mochi-mascot/fiezel-mochi.js`:
  - Membatasi DPR WebGL mobile maksimal `2.0` (menghemat ~56% VRAM framebuffer di iPhone 3x Retina sambil menjaga ketajaman HD) dan memakai `powerPreference: 'default'` di perangkat sentuh mobile.
- `features/mascot/fiezel-mochi-companion.js`:
  - Menambah `suspendWebGL()` dan `pause({ releaseWebGL: true })` untuk membuang konteks WebGL Host (`destroyPool()` + `forceContextLoss()`) saat masuk Kawan Bicara, plus `isFailed()`.
  - Mempertahankan `display: flex` pada `.fz-vissol-mascot-wrap`, menerapkan `applySessionAccessories()` SEBELUM `m.resume()`, hanya resize pada `280ms` bila ukuran berubah `>= 2px`, dan mencegah overlay non-kuis mencuri Mochi dari Home.
- `features/interactive-chat/fiezel-interactive-chat.js`:
  - Memanggil `FiezelMochiCompanion.suspendWebGL()` sebelum memuat iframe `call.html`, dan memanggil `FiezelMochiCompanion.resume()` SETELAH iframe dibongkar (Single-WebGL-Context Invariant).
- `features/voice-studio/src/components/WhiteboardErrorBoundary.tsx` (BARU):
  - React `ErrorBoundary` dwibahasa (`id`/`th`/`en`) dengan pemulihan *"Muat Ulang Papan"* / *"Tutup"* agar error papan tulis tidak pernah meruntuhkan Voice Studio.
- `features/voice-studio/src/lib/boardAudioUnlock.ts`:
  - Menambah `isMobileLowMemoryDevice()` dan `decodeAudioDataSafe()` (tahan iOS Safari callback/Promise + fresh ArrayBuffer copy + bounded timeout).
- `features/voice-studio/src/lib/liveTransport.ts`:
  - Menurunkan batas cache WAV memori mobile menjadi `8` entri (`24` desktop) dan menambah `pruneTtsMemoryCache()`.
- `features/voice-studio/src/components/LiveWhiteboardCanvas.tsx`:
  - Memindahkan auto-scroll mobile ke compositor thread native (`container.scrollTo({ behavior: 'smooth' })`) dengan deduplikasi target scroll & debounce `MutationObserver` (`110ms`), mengunci `overscroll-behavior: contain` pada `solvely-dotgrid-whiteboard`, mematikan `ResizeObserver` `innerEl` saat `zoomLevel === 1`, dan mengganti `rough-notation` pada mobile ke dekorasi CSS ink ringan bebas `ResizeObserver` loop.
- `features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx`:
  - Sliding-window audio mobile ketat (`1` lookahead worker, maksimal `activePlayChunk + 1`, eviksi `audioBuffer` segera setelah selesai diputar, clear `trackCacheRef` saat modal ditutup) + throttle `applyTrackFraction` mobile (`~14 fps` alih-alih `36 fps`) agar slideshow otomatis tidak membanjiri main thread & GC.
  - Mengganti `h-[92vh]` ke `h-[94dvh] sm:h-[92dvh]`, merapikan kartu buffering mobile agar tidak terjepit 5 baris, membatasi `backdrop-blur` hanya pada `sm:`, dan membungkus `LiveWhiteboardCanvas` dalam `WhiteboardErrorBoundary`.
- `features/voice-studio/src/App.tsx`, `features/voice-studio/src/index.css`, `call.html`, `features/voice-studio/call.html`:
  - Membongkar konteks WebGL Mochi iframe (`destroy()` + `forceContextLoss()`) selama Papan Tulis layar penuh terbuka di mobile (0 konteks WebGL aktif bersamaan!), lalu memulihkannya mulus saat papan ditutup.
  - Membungkus `InCallLearningWorkbenchModal` dalam `WhiteboardErrorBoundary`, membatasi `backdrop-blur` ke `sm:`, menonaktifkan `will-change` statis & nested `transform: scale` pada kartu spotlight mobile (`< 768px`) agar CoreAnimation tidak kehabisan VRAM saat auto-scroll, serta mengunci `overscroll-behavior: none` pada `call.html` dan `html.fz-view-chat` untuk mencegah pull-to-refresh saat auto-scrolling.
- `features/ui/fiezel-tactile-clay.css`:
  - Mengunci `.fz-vissol-welcome .tactile-kicker-dot`, `.tactile-kicker-text`, dan `.tactile-streak-badge` tetap `display: none !important;`, menghapus weight `900` -> `800`, serta mengunci dimensi stabil `min-height: 142px` & `flex` pada `.fz-vissol-mascot-wrap`.
- `app.js`:
  - Mempromosikan `<link data-fz-shell-css media="print">` yang sudah memiliki `el.sheet` di `shellCssSettled()` serta safety-promote sebelum `dismissBootSplash()`.
  - Melewati `render()` destruktif di `applyAccountCloudSnapshot()` ketika `state.view === 'home'` dan tanda tangan visual Home tidak berubah.
  - Menyembunyikan fallback 2D `.fz-vissol-mascot-img` secara konsisten pada `todayHomeMarkup` selama WebGL aktif dan reduced-motion tidak menyala.
- `tests/whiteboard-contract-test.js`:
  - Menambah `PASS 13` untuk mengunci seluruh invarian Mobile PWA OOM/WebGL/Sliding-Window/ErrorBoundary & Home Stability.
- `features/voice-studio/dist/voice-studio.{js,css}` & 9 berkas sinkronisasi build `m025-810`.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu

1. **Mobile PWA End-to-End Headless Playwright Probe (iPhone 14 `390×844` 3x Retina Safari & Android Pixel 8 `412×915` Chrome, `streak: 7`)**:
   - **iPhone 14 PWA**: **15/15 PASS** (`welcomeRect` konstan `y=58, h=166`, `titleStyle: 26px/800`, `dotVisible: false`, `streakBadgeVisible: false`, `mascotRect: 142×142 flex`, `canvasAttrW: 284`, `hostCanvasCount: 0` saat di Kawan Bicara, `iframeCanvasCount: 0` saat Papan Tulis terbuka, `chunksSucceeded: 2`, `docLoadCount: 1`, `errors: []`).
   - **Android Pixel 8 PWA**: **15/15 PASS** (seluruh metrik stabil identik, 0 crash, 0 reload, 0 error).
   - Inspeksi visual tangkapan layar fresh memastikan kartu buffering mobile lega (2 baris), papan tulis aktif bebas overflow, dan kartu sapaan + panggung Mochi 3D di Home bersih tanpa titik hijau maupun badge oranye.
2. **Official Strict Whiteboard Speed, Quiz & Mobile Autoplay Probe (`node tests/whiteboard-speed-quiz-probe.cjs --strict`)**:
   - **31/31 PASS** (`boardToAudioMs: 86ms`, `pwaUnmutedMs: 318ms`, `interChunkGapsMs: [0]`, `Z0: []`).
3. **Contract & Regression Suites**:
   - `tests/whiteboard-contract-test.js`: **13/13 PASS**
   - `tests/boot-first-paint-nonblocking-test.js`: **13/13 PASS**
   - `tests/pwa-cold-boot-seamless-test.js`, `tests/alasan-soal-test.js` (39/39), `tests/id-golden-snapshot-test.js`, `tests/th-ui-leak-test.js`, `tests/account-cloud-sync-test.js`, `tests/splash-first-paint-test.js`, `tests/pwa-cache-test.js`, `tests/view-reachability-test.js` (72/72), `tests/curriculum-cache-version-test.js` (33/33), `tests/gate-registry-test.js` (10/10), `tests/tri-core-invariants-gate-test.js` (25/25): **100% PASS**.
   - `node tools/bump-build.mjs --check`: **Selaras (`m025-810`)**.

---

## 4. Next Steps & Follow-Up Verification

- Pantau seluruh 10 gerbang wajib CI PR (`quality`, `A6`, `A7`, `A9`, `A10`, `A11`, `A13`, `A14`, `Auto PR Review & Invariant Audit`, `MASTER-only authority`) sampai 100% HIJAU sebelum squash-merge ke `main`.
- Pantau `FIEZEL Deploy Site` setelah merge hingga `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` menyajikan `m025-810` secara live di perangkat murid.
