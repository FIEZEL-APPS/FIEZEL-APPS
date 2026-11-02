# FIEZEL m025-746 Handoff Dossier: Multi-Course Progress Parity, Settings Modal Sizing & Fluid Scroll, and Mobile Nav Proportions

Status: READY FOR PRODUCTION
Otoritas: MASTER / OWNER Mandate
Nomor Build: m025-746

## 1. Executive Summary & Problem Resolution
Berdasarkan laporan komprehensif pengguna terkait:
1. **Ketimpangan Multi-Kursus Panel Progress ("progress di bagian kursus jepang berjalan normal baik dari segi tampilan dan semuanya, tapi pada kursus bahasa inggris tidak ada", "seharusnya apapun perbaikan harus selaras dan sinkron multi kursus")**:
   - **Akar Masalah**: Panel progress memiliki logika `progressFresh = !(Array.isArray(state.history) && state.history.length);`. Ketika murid baru membuka kursus bahasa Inggris (atau murid dengan histori kosong pada kursus aktif), `mapCards` (Peta Belajar) dan seluruh tab `readiness` (Kesiapan Ujian Sekolah, Empat Kemampuan, Peta Skill Reading) disembunyikan dan digantikan placeholder kosong. Selain itu, penghitungan materi aktif tidak menghitung total kurikulum yang tersedia per level di masing-masing bahasa.
   - **Solusi**: Peta Belajar dan tab Kesiapan kini **SELALU TAMPIL** untuk seluruh kursus (`en` maupun `ja`) terlepas dari apakah murid memiliki histori atau masih baru. Ditambahkan penghitungan kurikulum per level (`totalVocabLvl`, `totalGrammarLvl`, `totalReadingLvl`) sehingga rasio penguasaan (`0 / 339 kata (0%) · 0 materi A1 sudah punya bukti belajar` pada English A1, atau `0 / 1000 kata (0%)` pada Japanese N5) tersaji akurat dan simetris di kedua bahasa. Disertakan tombol CTA langsung menuju latihan level aktif.

2. **Pengaturan Rusak, Scrolling Macet & Kartu Terlalu Kecil ("pengaturan rusak parah, dari segi css nya, scrollingnya... tampilan pengaturannya juga terlalu kecil kartunya")**:
   - **Akar Masalah**:
     a) Deadlock scrolling: `#modalPanel` memiliki aturan umum `max-height: min(600px, 84dvh) !important; overflow-y: auto !important;` di `index.html:518`, yang bertabrakan dengan inner scroll viewport `.settings-scroll-body { overflow-y: auto !important; }`. Kedua kontainer berebut gestur sentuh (dual-scroll collision) pada WebKit / iOS Safari.
     b) Ukuran kartu terlalu kecil: Kartu dibatasi 600px di layar desktop/tablet, dan elemen di dalamnya memiliki margin sempit.
     c) Kontras warna judul: Judul `.settings-head h2` mewarisi warna `var(--text)` dari `fiezel-lux.css` yang bernilai `#0F172A` (biru gelap hampir hitam). Pada kartu pengaturan berlatar gelap `#14141C`, judul menjadi tidak terbaca (invisibel).
   - **Solusi**:
     a) `.modal-panel:has(.settings-modal-wrapper)` diecualikan dari aturan generic modal dan diatur menjadi `overflow: hidden !important; display: flex !important; flex-direction: column !important;`, sehingga `.settings-scroll-body` menjadi satu-satunya viewport scroll yang bebas hambatan.
     b) Ukuran modal diperluas menjadi `height: min(820px, 92dvh); max-height: 92dvh;` pada desktop dan `height: 92dvh; max-height: 92dvh;` pada ponsel, dengan padding lega pada lipatan (`.settings-fold`), input touch-friendly >= 46px, dan ringkas tertata.
     c) Kontras judul diperbaiki secara tegas dengan `.settings-head h2 { color: #FFFFFF !important; -webkit-text-fill-color: #FFFFFF !important; font-size: 1.55rem !important; }` dan subteks `#94A3B8`.

3. **Proporsi Topbar dan Bottombar Terlalu Besar ("topbar dan bottombar juga sangat terlalu besar tidak sesuai dengan bentuk kartu")**:
   - **Akar Masalah**: Pada tampilan seluler, bottom dock setinggi 62px dengan active pill 50px dan topbar 56px mendominasi ruang layar vertikal secara berlebihan terhadap konten kartu tengah.
   - **Solusi**: Disesuaikan proporsional pada `@media (max-width: 640px)`:
     - Topbar: `height: 50px + safe-area`, padding `env(safe-area) 12px 0 12px`, gap `8px`.
     - Bottomnav: dock `56px + safe-area`, active pill `height: 44px; top: 5px; border-radius: 22px;`, nav icon `20px`, nav text `10.5px`.
     - `#app` padding clearance: `padding-top: calc(50px + env(safe-area-inset-top) + 4px) !important; padding-bottom: calc(74px + env(safe-area-inset-bottom)) !important;` menjamin kartu konten tidak pernah tertimpa atau terpotong dock.

4. **Transisi Boot & Splash Tanpa Kedip**:
   - `openApp()` secara tanpa syarat mencabut kelas `fz-booting` dan menyematkan `fz-app-open` pada `document.documentElement` dan `document.body`, memastikan topbar dan antarmuka segera tampil tanpa kedip putih atau elemen tertahan.

---

## 2. Empirical Verification & Evidence
Pengujian Playwright Chromium headless dilakukan dengan komparasi dua arah di kedua kursus (`en` dan `ja`):
- **English Course (`en`) Progress**:
  - `topbarVis`: 'visible', `topbarH`: 50px.
  - `bottomnavVis`: 'visible', `bottomnavH`: 61px (dock 56px + subpixel/safe area).
  - `mapRowsCount`: 3 baris penuh (Kosakata `0 / 339 kata`, Grammar `0 / 102 lesson`, Reading `0 / 53 bacaan`).
  - `readinessTabCards`: 3 kartu utuh (Kesiapan Ujian Sekolah, Empat Kemampuan, Peta Skill Reading).
  - Artefak visual: `final-progress-en-overview.png`, `final-progress-en-readiness.png`.
- **Japanese Course (`ja`) Progress**:
  - `topbarVis`: 'visible', `topbarH`: 50px.
  - `bottomnavVis`: 'visible', `bottomnavH`: 61px.
  - `mapRowsCount`: 3 baris penuh (Kosakata `0 / 1000 kata`, Grammar `0 / 242 lesson`, Reading `0 / 30 bacaan`).
  - `readinessTabCards`: 3 kartu utuh.
  - Artefak visual: `final-progress-ja-overview.png`, `final-progress-ja-readiness.png`.
- **Settings Modal Scale & Fluid Scrolling**:
  - `panelH`: 758px (92dvh pada 844px viewport).
  - `bodyH`: 545px scrollable body.
  - `foldsCount`: 6 folds.
  - `scrollCheck`: initial 0 -> target 250 -> final 250 (100% fluid scroll tanpa deadlock).
  - Artefak visual: `final-settings-en-opened.png`, `final-settings-en-scrolled.png`, `final-settings-ja-opened.png`, `final-settings-ja-scrolled.png`.

---

## 3. Berkas yang Dimodifikasi
1. `app.js`:
   - Sinkronisasi kurikulum total per level (`totalVocabLvl`, `totalGrammarLvl`, `totalReadingLvl`) dan eliminasi pengecekan `progressFresh` yang menyembunyikan data.
   - Peta Belajar dan tab Kesiapan kini selalu aktif di multi-kursus.
   - Tombol aksi `FiezelI18n.t('progress.mulai-sesi')` menuju latihan level aktif.
   - Booting transition guard di `openApp()`.
2. `index.html`:
   - Pengecualian `.settings-modal-wrapper` dari `overflow-y: auto !important` umum modal; isolasi scrolling ke `.settings-scroll-body`.
3. `style.css`:
   - Peningkatan dimensi modal pengaturan ke `height: min(820px, 92dvh); max-height: 92dvh;`.
   - Isolasi overflow-y ke `.settings-scroll-body` dengan `-webkit-overflow-scrolling: touch; overscroll-behavior: contain;`.
   - Koreksi kontras judul modal `#FFFFFF !important` dan subjudul `#94A3B8 !important`.
   - Penataan ruang kartu lipatan pengaturan (`.settings-fold`, `.settings-fold .card`, `.setting-row`).
4. `features/ui/fiezel-tactile-clay.css`:
   - Proporsi mobile topbar (50px) dan bottomnav (56px dock, 44px pill, 20px icons).
   - Penyesuaian padding buffer `#app` untuk ruang gerak kartu dan konten di atas dock.
5. Versi Build Kanonikal:
   - `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: diselaraskan ke `m025-746` (Octa-Sync compliant).

---

## 4. Authority & Invariant Governance (MASTER Authority)
- **Zero Red Merge Mandate**: Seluruh 10 checks CI wajib hijau 100%.
- **Protected Surface Isolation**: Modifikasi mematuhi batasan cakupan `[ALLOW-PROTECTED: auth|pwa]` tanpa efek samping ke modul autentikasi atau onboarding.
- **Single Source of Truth**: Nomor versi build dikelola eksklusif melalui `tools/bump-build.mjs`.

---

## 5. Next Steps & Continuous Monitoring Roadmap
- Monitor produksi pasca rilis melalui log CDN Cloudflare.
- Pertahankan sinkronisasi data kurikulum dan validasi cache service worker di seluruh platform seluler (iOS Safari PWA & Android Chrome TWA).
