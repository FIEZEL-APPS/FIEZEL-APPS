# FIEZEL m025-742 Release & Handoff Dossier: iOS PWA Cache Invalidation & Native UI Audit

## 1. Executive Summary & Audit Background
Berdasarkan investigasi empiris mendalam atas bukti video (`rekaman 1.mp4`, `rekaman 2.mp4`), tangkapan layar (`capture 2.jpeg`), serta frame-by-frame audit pada perangkat iPhone 15+ (iOS WebKit Standalone PWA), ditemukan beberapa isu kritis:
1. **PWA Update Cache Invalidation**: Pada iOS WebKit Standalone mode, panggilan `location.reload()` secara default memuat ulang dokumen dari *WebKit Process Page Cache* (memory cache), mengabaikan Service Worker baru yang telah aktif. Akibatnya, murid yang menekan tombol *"Perbarui sekarang"* tetap terjebak pada shell antarmuka lama hingga browser Safari di-clear total.
2. **Progres Tab Blank / Crash**: Navigasi ke tab *"Progres"* membeku atau merender kosong pada akun baru/cache bersih karena dereferensi tak aman `state.daily.attempts` saat `state.daily` berstatus `undefined`.
3. **Kartu Pengaturan White-Box Anomaly**: Footer tombol aksi (`.modal-panel .modal-actions`) pada dialog Pengaturan menampilkan latar persegi putih pekat yang kontras dan merusak tema gelap `#14141C`.
4. **Kawan Bicara (`call.html`) Safe Area Inset**: Dynamic Island dan status bar iPhone menimpa elemen header dan tombol kembali pada tampilan Voice Studio Kawan Bicara karena ketiadaan `viewport-fit=cover` dan insets `env(safe-area-inset-top)`.
5. **Topographic Splash Cutoff**: Garis ornamen kontur topografis pada splash screen terpotong di bagian atas akibat `-webkit-mask-image` linier.
6. **Topbar Seam Line**: Garis horizontal abu-abu (`#E2E8F0`) di bawah topbar saat belum di-scroll merusak kesan seamless layaknya aplikasi native iOS.
7. **Ritual Modal Header Overlap**: Judul *"Pilih Ritme Belajarmu"* bertabrakan dengan tombol silang penutup modal (`.modal-close-icon`).
8. **Profile Sub-Tabs Truncation**: Teks *"Papan Peringkat"* terpotong menjadi *"...gkat"* pada layar mobile dengan viewport sempit.

---

## 2. Technical Modifications & Empirical Resolution

### A. PWA Update & WebKit Memory Cache Invalidation (`features/ui/fiezel-update-prompt.js`, `features/ui/fiezel-boot-tail.js`, `index.html`)
- Pemicu pembaruan pada `reloadIfApproved()` dialihkan dari `location.reload()` menjadi `window.location.replace(window.location.pathname + curSearch + window.location.hash)` dengan menyuntikkan parameter cache-buster `?fz_upd=<timestamp>` dan membersihkan `sessionStorage` (`fiezel-apply-update`, `fiezel-target-build`, dll.).
- Parameter query `fz_upd` langsung diakomodasi oleh Service Worker (`sw.js`) melalui `{ ignoreSearch: true }` pada pre-cached shell navigation.
- Di `index.html`, sebelum splash screen dieksekusi, skrip inline membersihkan parameter `fz_upd` / `fz_healed` via `history.replaceState` sehingga URL bilah peramban tetap steril dan rapi tanpa query string.
- Automatic Split-Brain Healer di `fiezel-boot-tail.js` diperbarui agar menyuntikkan `?fz_healed=<timestamp>` alih-alih `location.reload()`.

### B. Progres View Robustness & Zero-Crash Dispatch (`app.js`)
- `progress()`: Mengamankan `state.daily.attempts` dengan fallback aman `Number(state.daily?.attempts) || 0`.
- `renderInner()`: Membungkus seluruh pemanggilan router tampilan dalam blok `try { ... } catch (viewErr) { ... }`. Jika terjadi kegagalan pada salah satu view, tab navigasi bawah dan topbar tetap tersinkronisasi, dan layar menyajikan kartu pemulihan graceful alih-alih layar beku tanpa navigasi.
- `syncNavActivePill()`: Menambahkan `requestAnimationFrame` sekunder pasca-render untuk menjamin presisi subpixel pil navigasi `#navActivePill`.

### C. Visual & Styling Native Polish (`style.css`, `features/ui/fiezel-tactile-clay.css`, `features/grammar/grammar-vocab-bridge.js`)
- **Settings Modal Action Footer**: Menambahkan aturan styling `.modal-panel .modal-actions.settings-actions` bertema gelap `rgba(20, 20, 28, 0.95)`, border `rgba(255, 255, 255, 0.08)`, tombol batal putih, dan tombol simpan gradien emas.
- **Topbar Seam**: Mengubah border bawah `header.topbar` pada posisi default (unscrolled) menjadi `1px solid transparent !important`. Border dan elevasi hanya muncul ketika pengguna melakukan scrolling (`header.topbar.is-scrolled`).
- **Splash Topography**: Menghapus mask linier dari `#fiezelBootSplash .fz-auth-topo` agar ornamen kontur membentang mulus hingga tepi atas layar.
- **Ritual Header**: Memberikan padding horizontal `44px` dan margin aman pada `h2` modal ritual belajar untuk memberi ruang bebas bagi tombol tutup `x`.
- **Profile Sub-Tabs**: Menyesuaikan padding `.progress-tab` menjadi `8px 12px` dan font size `11.5px` dengan `min-width: 0` agar teks *"Papan Peringkat"* tidak terpotong.

### D. Kawan Bicara Safe Area & Viewport (`call.html`, `features/voice-studio/call.html`, `features/voice-studio/src/App.tsx`)
- Menambahkan `viewport-fit=cover` pada meta viewport `call.html` dan `features/voice-studio/call.html`.
- Menginjeksi CSS inline untuk `header, .studio-topbar, #fiezel-voice-studio-root header { padding-top: max(14px, env(safe-area-inset-top, 0px)) !important; }`.
- Menambahkan kelas Tailwind `pt-[max(0.75rem,env(safe-area-inset-top))]` pada `<header>` di `features/voice-studio/src/App.tsx`.

---

## 3. Test & Verification Matrix
Seluruh rangkaian pengujian unit dan invarian kualitas lulus 100%:
1. `node tests/update-prompt-test.js` $\rightarrow$ PASS (13/13)
2. `node tests/update-prompt-signal-test.js` $\rightarrow$ PASS (7/7)
3. `node tests/pwa-release-coherence-test.js` $\rightarrow$ PASS
4. `node tests/curriculum-cache-version-test.js` $\rightarrow$ PASS (33/33, build m025-742)
5. `node tests/id-golden-snapshot-test.js` $\rightarrow$ PASS (identik, baseline emas terjaga)
6. `node tests/th-ui-leak-test.js` $\rightarrow$ PASS (4674 kunci th selaras)
7. `node tests/gate-registry-test.js` $\rightarrow$ PASS (413 gerbang terdaftar)
8. `node tests/boot-order-test.js` $\rightarrow$ PASS
9. `node tests/anti-flicker-uiux-invariant-test.js` $\rightarrow$ PASS (14/14)
10. `node tests/topbar-status-bar-seam-test.js` $\rightarrow$ PASS (8/8)
11. `node tests/mochi-voice-sos-test.js` $\rightarrow$ PASS (27/27)
12. `node tests/view-reachability-test.js` $\rightarrow$ PASS (67/67)
13. `node tools/fiezel-guardians.mjs a10` $\rightarrow$ PASS_WITH_RISK_REPORT (0 errors, 0 warnings)

---

## 4. Release Synchronization (Hexa-Sync / Octa-Sync)
Semua titik referensi build telah diselaraskan ke **m025-742**:
- `coordination/BUILD-VERSION.json`: `m025-742`
- `sw.js`: `m025-742-unified-grammar-20261002`
- `core-config.js`: `m025-742`
- `features/neural-voice/fiezel-diag-panel.js`: `m025-742`
- `kurikulum.html`: `?v=m025-742`
- `misi.html`: `?v=m025-742`
- `call.html`: `?v=m025-742`
- `features/voice-studio/call.html`: `?v=m025-742`
