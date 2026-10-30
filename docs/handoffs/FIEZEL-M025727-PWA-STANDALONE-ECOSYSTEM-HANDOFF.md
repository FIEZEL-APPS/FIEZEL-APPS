# FIEZEL RELEASE HANDOFF: m025-727
## Perbaikan Ekosistem PWA Standalone & Eliminasi Anomali Tampilan Web (Zero-Browser Trap)

### 1. Ringkasan Eksekutif & Nomor Build
- **Nomor Build Kanonikal**: `m025-727`
- **Otoritas Rilis**: `OWNER` & `MASTER` approved protocol
- **Status Rilis**: `READY_FOR_DEPLOY`
- **Tipe Perubahan**: `fix(pwa)`
- **Alasan Bump**: `fix(pwa): ecosystem standalone web app manifest, redirect guard, and service worker parity (m025-727)`
- **Arbiter & Hexa/Octa-Sync**:
  - `coordination/BUILD-VERSION.json`: m025-727
  - `sw.js`: m025-727
  - `core-config.js`: m025-727
  - `features/neural-voice/fiezel-diag-panel.js`: m025-727
  - `kurikulum.html`: m025-727 (5 rujukan)
  - `misi.html`: m025-727 (6 rujukan)
  - `call.html`: m025-727 (3 rujukan)
  - `features/voice-studio/call.html`: m025-727 (3 rujukan)

---

### 2. Akar Masalah & Temuan Audit Empiris
1. **Root Domain (`https://fiezel.my.id/`) Ketiadaan Konfigurasi PWA**:
   - `website/index.html` tidak memiliki `<link rel="manifest">`, `<meta name="apple-mobile-web-app-capable">`, dan pendaftaran service worker.
   - Panggilan `curl.exe -ILs https://fiezel.my.id/manifest.json` menghasilkan `404 Not Found`.
   - Akibatnya, penekanan "Tambahkan ke layar utama" di beranda `fiezel.my.id` oleh pengguna hanya menghasilkan bookmark web shortcut URL, yang ketika diketuk membuka browser Chrome/Safari ("terakses tampilan web") alih-alih PWA standalone.
2. **Ketiadaan Standalone Redirect Guard**:
   - Ketika pengguna membuka shortcut web yang tersimpan, tidak ada deteksi `display-mode: standalone` / `window.navigator.standalone` untuk langsung melompat ke `/app/`.
3. **Ketiadaan Meta Title iOS**:
   - Tag `<meta name="apple-mobile-web-app-title" content="FIEZEL">` absen, menyebabkan Web Clip iOS menggunakan judul dokumen panjang alih-alih nama aplikasi ringkas.

---

### 3. Solusi & Perubahan yang Diterapkan
1. **Penerbitan `website/manifest.json`**:
   - Konfigurasi Web App Manifest kanonikal dengan `id: "/app/"`, `start_url: "/app/"`, `scope: "/"`, `display: "standalone"`, `theme_color: "#1B1418"`, dan ikon brand 192/512px.
2. **Penyelarasan PWA di Seluruh Halaman Landing**:
   - `website/index.html`, `website/th/index.html`, `website/install/index.html`, `website/th/install/index.html` kini dilengkapi:
     - `<link rel="manifest" href="...">`
     - `<meta name="mobile-web-app-capable" content="yes">`
     - `<meta name="apple-mobile-web-app-capable" content="yes">`
     - `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
     - `<meta name="apple-mobile-web-app-title" content="FIEZEL">`
     - Standalone redirect guard instan: otomatis berpindah ke `/app/` jika dibuka dari home screen PWA.
     - Pendaftaran `/app/sw.js` dengan scope `/app/` saat event `window.load`.
3. **Penyelarasan `index.html`**:
   - Ditambahkan `<meta name="apple-mobile-web-app-title" content="FIEZEL">`.
4. **Gerbang Mutu Baru (`tests/pwa-standalone-ecosystem-test.js`)**:
   - 5/5 pengujian otomatis memastikan seluruh berkas manifest, meta tags, redirect guard, dan service worker terpasang utuh tanpa whitespace liar.

---

### 4. Daftar Berkas yang Dimodifikasi
1. `website/manifest.json` (Baru: manifest PWA landing page)
2. `website/index.html` (Manifest, standalone meta, redirect guard, SW reg)
3. `website/th/index.html` (Manifest, standalone meta, redirect guard, SW reg)
4. `website/install/index.html` (Manifest, standalone meta, redirect guard, SW reg)
5. `website/th/install/index.html` (Manifest, standalone meta, redirect guard, SW reg)
6. `index.html` (Apple mobile web app title FIEZEL)
7. `tests/pwa-standalone-ecosystem-test.js` (Baru: gerbang regresi PWA ecosystem)
8. `.github/workflows/quality.yml` (Pendaftaran gerbang pwa-standalone-ecosystem-test)
9. Titik Arbiter Build `m025-727`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `call.html`
   - `features/voice-studio/call.html`
10. `docs/handoffs/FIEZEL-M025727-PWA-STANDALONE-ECOSYSTEM-HANDOFF.md` (Handoff dossier ini)

---

### 5. Hasil Verifikasi Gerbang CI Lokal
- `node tools/bump-build.mjs --check`: **PASS (Selaras, build m025-727)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman, build m025-727)**
- `node tests/id-golden-snapshot-test.js`: **PASS (13 berkas terkunci identik, 0 literal liar)**
- `node tests/th-ui-leak-test.js`: **PASS (4629 kunci id, 0 bocor)**
- `node tests/gate-registry-test.js`: **PASS (10/10 checks, 409 invokasi)**
- `node tests/pwa-standalone-ecosystem-test.js`: **PASS (5/5 checks)**
- `node tests/social-invite-link-test.js`: **PASS (80/80 assert PASS)**
- `node tests/topbar-status-bar-seam-test.js`: **PASS (8/8 invarian terjaga)**

---

### 6. Langkah Berikut / Roadmap
1. Gabungkan PR #789 ke `main` setelah seluruh checks CI berstatus hijau.
2. Pantau deployment workflow `FIEZEL Deploy Site` di `main`.
3. Lakukan verifikasi live bita produksi via `curl` pada endpoint `https://fiezel.my.id/manifest.json` dan `https://fiezel.my.id/app/manifest.json`.
4. Bersihkan worktree terisolasi `../fiezel-pwa-standalone-m025727`.
