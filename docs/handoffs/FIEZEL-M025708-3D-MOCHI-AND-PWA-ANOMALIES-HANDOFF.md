# FIEZEL RELEASE HANDOFF: m025-708
## Pemulihan 3D Mochi Voice Studio & Perbaikan 7 Anomali Fatal Layar PWA

### 1. Ringkasan Eksekutif & Nomor Build
- **Nomor Build Kanonikal**: `m025-708`
- **Tipe Perubahan**: `fix(ui-voice)`
- **Alasan Bump**: `fix(ui-voice): restore 3d mochi companion and resolve 7 fatal pwa anomalies (m025-708)`
- **Arbiter & Hexa/Octa-Sync**:
  - `coordination/BUILD-VERSION.json`: m025-708
  - `sw.js`: m025-708
  - `core-config.js`: m025-708
  - `features/neural-voice/fiezel-diag-panel.js`: m025-708
  - `kurikulum.html`: m025-708 (5 rujukan)
  - `misi.html`: m025-708 (6 rujukan)
  - `call.html`: m025-708 (3 rujukan)
  - `features/voice-studio/call.html`: m025-708 (3 rujukan)

---

### 2. Tabel Kuantitatif Realisasi (Numeric Definition of Done)

| Item / Anomali Layar | Spesifikasi Target | Aktual Terealisasi | Status |
| :--- | :--- | :--- | :--- |
| **1. 3D Mochi Voice Studio (`call.html`)** | Panggung 3D Three.js Mochi aktif, gesture interaktif (hop, wave, wiggle), zero PAW cat fallback | Panggung responsif 140x130 (mobile) / 200x180 (desktop), Three.js WebGL canvas terikat, fallback resmi `./assets/brand/mochi-mascot-headset.png` | **100% CURED** |
| **2. Ghost Chōkai Modal Trap** | Penutupan modal membersihkan `inert` dan `aria-hidden` dari `#app` dan `.bottomnav` | `dismissAllModalsDefensive()` menutup modal JLPT Listening, mereset `body.style.overflow`, membersihkan `inert` & `aria-hidden` | **100% CURED** |
| **3. Blank Level Test Hub (Desktop)** | Tampilan `state.view === 'test'` memiliki back button, judul topbar, dan brand tag `TES` | Menambahkan `'test'` ke `_hasBack`, topbar title `Tes Kemampuan Dasar`, dan brand tag `_t = 'TES'` | **100% CURED** |
| **4. Romaji Leak on Level Test** | Zero romaji pada mode ujian/placement test (Anti-Leak Exam Purity) | `annotateRun` memblokir romaji jika `state.view === 'test'`, `fz-exam-mode`, atau `.quiz-shell`; CSS menyembunyikan `.ja-romaji` | **100% CURED** |
| **5. Old Yellow PAW Cat Fallback** | Nol kemunculan PAW cat kuning kuno di seluruh antarmuka | `pawFaceMarkup()` dialihkan ke aset resmi `./assets/brand/mochi-mascot-headset.png` | **100% CURED** |
| **6. Desktop Void >70% on Kotoba** | Lebar kontainer desktop $\ge 760\text{px}-960\text{px}$ dua kolom | Breakpoint `.vocab-hub-page` desktop 880px / 980px, 2-column split-screen layout | **100% CURED** |
| **7. Rhythm Modal Blocking Bunpō** | Modal ritme/latihan tidak tumpang tindih saat navigasi antar modul | `dismissAllModalsDefensive()` merontokkan seluruh modal mengambang pada pergantian view `go(v)` | **100% CURED** |
| **8. Telemetry Leak in Graded Readers** | Teks `Multi-Scene & BKT` diganti dengan copy resmi | `story.library_card_sub` ("Graded Readers N5 · Cerita Bergambar") terdaftar di copy-id dan copy-th | **100% CURED** |

---

### 3. Hasil Verifikasi Gerbang CI Lokal

- `node tools/bump-build.mjs --check`: **PASS (Selaras)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman, build m025-708)**
- `node tests/th-ui-leak-test.js`: **PASS (4578 kunci id, 0 bocor)**
- `node tests/i18n-kunci-hantu-test.js`: **PASS (5736 kunci id, 0 kunci hantu)**
- `node tests/id-golden-snapshot-test.js`: **PASS (13 berkas terkunci identik, 0 literal liar)**
- `node tests/content-integrity-gate.js`: **PASS (4 dari 4 gerbang integritas konten 100% hijau)**
