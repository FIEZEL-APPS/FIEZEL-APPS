# FIEZEL M025-515: UNIVERSAL FIXED TOPBAR & DIRECT QUEST FLOW HANDOFF

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan audit langsung pada siklus sesi latihan (Grammar, Listening, Speaking, Reading, dan Ujian) serta masukan evaluasi pengguna:
1. **Prerequisite Gateway Sheet Diabaikan / Dihapus Total**:
   - Lembar dialog perantara *"Hafal Dulu Kosakata Ini!"* (`lesson-prereq-gateway-sheet`) sebelumnya menahan murid sebelum masuk ke mini-game.
   - Sesuai arahan pengguna, sheet perantara ini dihapus total. Fungsi `openLessonPrerequisiteGate(skill)` di `features/grammar/grammar-vocab-bridge.js` kini langsung mengeksekusi `startVocabMiniGame(skill)` secara mulus tanpa jeda modal konfirmasi.
2. **Fiezel Quest Layar Penuh (Zero-Void Top Space)**:
   - Sebelumnya, `#modalPanel:has(.modal-mini-game-sheet)` beroperasi sebagai modal bottom-sheet dengan tinggi `94vh` dan rounded corners di atas, menyisakan void hitam kosong di bagian atas layar.
   - Diperbarui menjadi `100vh / 100dvh`, `max-height: 100vh / 100dvh`, `border-radius: 0`, dan margin `0`. Header mini-game mendukung `env(safe-area-inset-top)` sehingga seluruh layar tertutupi penuh dan imersif.
3. **Universal Fixed Topbar di Semua Sesi Latihan (Zero-Void, Zero-Movement)**:
   - Ditemukan bahwa topbar latihan (`.quiz-topbar`, `.skill-page-topbar`) tampak melayang (*hanging/floating*) dan bergetar saat digulir.
   - Penyebab struktural:
     - `main.app.app` memiliki `padding-top: 12px !important` di `features/ui/fiezel-tactile-clay.css`.
     - `#app` memiliki `padding-left: 6px; padding-right: 6px` di `features/ui/mobile-edge-fit.css`.
     - Topbar diset `position: sticky` dengan `border-radius: 0 0 16px 16px`, menyisakan celah kosong beige di atas dan samping yang tampak seperti pulau menggantung.
   - Solusi komprehensif universal:
     - Menetapkan aturan override teratas di `index.html` (`#fz-contrast-guard`), `style.css`, dan `mobile-edge-fit.css`:
       - `.quiz-topbar` & `.skill-page-topbar`: `position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; border-radius: 0 !important; margin: 0 !important; border: none !important; border-bottom: 1.5px solid #E2E8F0 !important; background: rgba(253, 250, 243, 0.98) !important; backdrop-filter: blur(20px) !important; z-index: 1000 !important;`.
       - Container `.quiz-shell` diberi bantalan atas `calc(64px + max(10px, env(safe-area-inset-top, 10px))) !important;`.
       - `main.app.app` saat mode kuis/latihan aktif (`:has(.quiz-shell)`, `:has(.jlpt-listening-stage)`) diatur ke `padding-top: 0 !important` dan `padding-left: 0 !important; padding-right: 0 !important;`.
     - Hasilnya: Topbar menempel sempurna di bibir atas viewport, mengisi seluruh lebar layar tanpa celah kosong di atas, dan terkunci statis (tidak bergerak/menggantung sama sekali saat konten soal di-scroll).

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright)

Skrip audit empiris dijalankan melalui `tools/dev/verify-universal-topbar-probe.mjs`:
- **Pengujian 1: Direct Entry Mini-Game**:
  - `reports/universal-gallery/05-topbar-fix-verification/01-quest-direct-entry-fullscreen.png`
  - Hasil: Mini-game langsung terbuka secara otomatis tanpa modal gateway. Menutupi 100% viewport (`height: 844px`, `top: 0px`).
- **Pengujian 2: Topbar Terkunci di Posisi Nol**:
  - `reports/universal-gallery/05-topbar-fix-verification/02-quiz-topbar-clean-fixed.png`
  - Metrik bounding box: `top: 0, left: 0, width: 390px, height: 68px, position: 'fixed', borderRadius: '0px'`.
- **Pengujian 3: Topbar Tidak Bergerak Saat Scrolling**:
  - `reports/universal-gallery/05-topbar-fix-verification/03-quiz-topbar-scrolled-stationary.png`
  - Konten soal digulir `scrollTop = 320px`. Topbar tetap diam di `top: 0px, left: 0px` tanpa jitter maupun translasi.
- **Pengujian 4: Pembahasan Soal**:
  - `reports/universal-gallery/05-topbar-fix-verification/04-explanation-topbar-fixed.png`
  - Topbar tetap terkunci di bibir atas saat kartu pembahasan dibuka.

---

## 3. Daftar Berkas yang Disentuh

1. `features/grammar/grammar-vocab-bridge.js`: Menghapus markup sheet gateway prasyarat, bypass langsung ke `startVocabMiniGame(skill)`.
2. `features/grammar/grammar-vocab-bridge.css`: Mengubah `.modal-mini-game-sheet` menjadi 100vh / 100dvh full viewport cover.
3. `features/grammar/grammar-upgrade.css`: Penyesuaian margin dan layout kartu mini-game.
4. `features/ui/fiezel-tactile-clay.css`: Menimpa `padding-top: 0 !important` pada `main.app.app` saat latihan aktif.
5. `features/ui/mobile-edge-fit.css`: Standarisasi docked edge `.quiz-topbar` dan `.skill-page-topbar`.
6. `style.css`: Memastikan `.quiz-topbar` memiliki `position: fixed !important; top: 0 !important; width: 100% !important; border-radius: 0 !important`.
7. `index.html`: Menyuntikkan style guard canonical di `<style id="fz-contrast-guard">` untuk menjamin kepatuhan rendering di semua peramban.
8. `features/speaking-listening/fiezel-jlpt-listening.js`: Sinkronisasi topbar dan stage listening.
9. `features/speaking-listening/jlpt-listening.css`: Tata letak multi-speaker audio player dan docked bar.
10. `coordination/BUILD-VERSION.json`: Bump build ke `m025-515`.
11. `sw.js`: Sinkronisasi `SW_REV = 'm025-515'`.
12. `core-config.js`: Sinkronisasi `self.FIEZEL_PAGE_BUILD = 'm025-515'`.
13. `features/neural-voice/fiezel-diag-panel.js`: Sinkronisasi `var DIAG_BUILD = 'm025-515'`.
14. `kurikulum.html`: Cache bust `?v=m025-515`.
15. `misi.html`: Cache bust `?v=m025-515`.
16. `id-golden-baseline.json`: Pembaruan snapshot baseline teks bahasa Indonesia.
17. `reports/th-ui-leak-report.json`: Laporan leak test baseline terbaharui.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js`: **PASS (100% Hijau)**
- `node tests/th-ui-leak-test.js`: **PASS (0 kebocoran naskah)**
- `node tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, build m025-515)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **SELARAS (Hexa-Sync 6 titik identik)**
