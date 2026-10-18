# FIEZEL M025-605 Handoff Dossier: Pemulihan Arsitektur Topbar & Bottombar Kawan Bicara (Chat)

**Nomor Rilis**: `m025-605`
**Cakupan**: `fix(chat): pulihkan arsitektur topbar dan bottombar kawan bicara (m025-605)`
**Tanggal**: 18 Oktober 2026
**Status CI & Mutu**: 100% HIJAU (PASS)

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Berdasarkan keluhan pengguna dan audit empiris, ditemukan bahwa implementasi layar obrolan interaktif (**Kawan Bicara**) mengalami masalah tata letak (*layout*) dan navigasi:

1. **Anti-Pattern Double-Header (Dua Topbar Bertumpuk)**:
   - Sebelumnya, topbar global aplikasi (`header.topbar` menampilkan `< Kawan Bicara`) dipaksa tampil bersamaan dengan header mitra obrolan (`.fzc-header` menampilkan `< Coach Alex`).
   - Hal ini menghasilkan dua tombol kembali bertumpuk dan memakan lebih dari 230px ruang vertikal di layar smartphone.
2. **Kekacauan Bottom Navigation Bar di Dalam Obrolan**:
   - `nav.bottomnav` (6 tab: Hari ini, KelasKu, Latihan, Game, Progres, Profil) sempat dipaksa tampil di dalam obrolan, mengimpit *typing dock* (`.fzc-dock`). Pada standar mobile chat (WhatsApp/Telegram/ChatGPT/Duolingo), ruang bawah murni milik *typing dock* (mikrofon, input, tombol kirim).
3. **Bottom Navigation Bar Hilang Permanen Saat Kembali ke Home**:
   - Fungsi `unmount()` pada `FiezelInteractiveChat` tidak dipanggil saat berpindah *view*, meninggalkan *inline style* `display: none !important;` pada `.bottomnav`.
   - Selektor CSS `html body:has(.fzc-container) .bottomnav` juga menyembunyikan `.bottomnav` setelah keluar dari obrolan, memaksa murid menutup/me-restart PWA.
4. **Scrolling Layar Terkunci**:
   - Kelas `html.fz-view-chat` dengan properti `height: 100dvh !important; overflow: hidden !important;` tidak dicabut saat meninggalkan *view* `chat`, sehingga dokumen *root* terkunci dan tidak bisa di-scroll.
5. **Celah Kosong 60px di Atas Obrolan**:
   - Selektor `html body.fz-lux main.app.app` di `features/ui/fiezel-tactile-clay.css:7107` memiliki spesifisitas tinggi yang memaksakan `padding-top: calc(56px + env(safe-area-inset-top, 0px) + 4px) !important;` (60px), menyisakan ruang kosong di atas obrolan ketika topbar disembunyikan.

---

## 2. Solusi Arsitektur & Perubahan Sistemik

1. **Pemisahan Peran Bersih (*Single Canonical Header*)**:
   - Dalam mode obrolan (`body.fz-view-chat`), `header.topbar` global disembunyikan (`display: none !important;`).
   - `.fzc-header` bertindak sebagai satu-satunya *header*, memuat tombol kembali mandiri `#fzcBtnBack` berspesifikasi Apple HIG ($\ge 44 \times 44\text{px}$ tactile clay) di sebelah avatar Coach Alex.
   - Mengatur `padding-top: calc(10px + env(safe-area-inset-top, 0px))` pada `.fzc-header` agar menempel rapi pada *safe area* atas perangkat bernotch / Dynamic Island.
2. **Penghapusan Chrome Luar & Eliminasi Celah 60px**:
   - Menggunakan selektor berkekuatan tinggi di `interactive-chat.css` dan menambahkan kelas `html body.fz-view-chat main.app.app, html body.fz-lux.fz-view-chat main.app.app` pada aturan `padding-top: 0 !important;` di `features/ui/fiezel-tactile-clay.css:7110`.
   - Mengatur `padding-bottom: 0 !important;` sehingga `.fzc-dock` menempel di dasar layar dengan *safe-area inset* yang proporsional.
3. **Penyembunyian Tab Dok Selama Obrolan & Restorasi Mutlak Saat Keluar**:
   - `.bottomnav` disembunyikan hanya saat `body.fz-view-chat` aktif. Menghapus selektor rentan `:has(.fzc-container)`.
   - `unmount()` di `fiezel-interactive-chat.js` dan pemulihan di `app.js:renderInner()` membersihkan seluruh properti *inline* `display`, `visibility`, dan `opacity` pada `.bottomnav`.
   - Mencabut kelas `fz-view-chat` dari `document.documentElement` dan `document.body` saat murid keluar, memulihkan *scrolling* *root* seketika.
4. **Navigasi Mundur Deterministik**:
   - Menyimpan `state._previousView` pada `window.go(v)`.
   - Pada `handleChatBack()` dan `handleTopbarBack()`, aplikasi memprioritaskan kembali ke `state._previousView` (misalnya `home`), lalu `FiezelBackNav.back()`, dan default ke `home`.

---

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Uji empiris dijalankan melalui `tools/dev/probe-topbar-bottombar.mjs`:

```json
--- Home Metrics (Awal) ---
Topbar: display: "flex", height: 56px
Bottomnav: display: "flex", height: 62px

--- Chat Metrics (Dalam Sesi Kawan Bicara) ---
Topbar: display: "none", height: 0px (NOL double header)
Bottomnav: display: "none", height: 0px (NOL tab clutter di chat)
fzcHeader: rect.top: 0px, height: 173.28px (NOL celah kosong 60px)
fzcBtnBack: exists: true, display: "flex", touch target: 44x44px

--- After Back Metrics (Kembali ke Home) ---
fzcContainerExists: false
Topbar: display: "flex", height: 56px (PULIH 100%)
Bottomnav: display: "flex", height: 62px, styleAttr: null (PULIH 100%)
htmlClasses: ["fz-app-open"] (fz-view-chat DICABUT, SCROLLING NORMAL)
bodyClasses: ["fz-lux", "fz-stage-home", "scene-day"] (SCROLLING NORMAL)
```

Tangkapan layar verifikasi visual:
- `tools/dev/screen-2-chat.png`: Obrolan bersih satu *header*, *typing dock* di dasar, tanpa tab bar luar.
- `tools/dev/screen-3-after-back.png`: Beranda pulih sempurna dengan *bottom navigation bar* aktif bercahaya pada tab `Hari ini`.

---

## 4. Berkas yang Disentuh

1. `features/interactive-chat/interactive-chat.css`:
   - Aturan penyembunyian `header.topbar` dan `nav.bottomnav` berspesifisitas tinggi.
   - Nol *padding-top* dan *padding-bottom* pada `main.app.app` saat `body.fz-view-chat`.
   - Pengaturan *safe area padding* pada `.fzc-header` dan pembersihan blok usang `.fzc-btn-back`.
2. `features/ui/fiezel-tactile-clay.css`:
   - Memasukkan `html body.fz-view-chat main.app.app, html body.fz-lux.fz-view-chat main.app.app` ke dalam aturan penolakan `padding-top` (0 !important).
3. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Pemanggilan `api.unmount()` sebelum navigasi keluar pada `handleChatBack()`.
   - Pembersihan menyeluruh kelas `fz-view-chat` dan *inline style* `.bottomnav` & `.topbar` pada `unmount()`.
4. `app.js`:
   - Pencatatan `state._previousView` pada `go(v)`.
   - Pemulihan *inline style* `.bottomnav` pada `renderInner()`.
   - Navigasi mundur deterministik pada `handleTopbarBack()`.
5. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `coordination/BUILD-VERSION.json`:
   - Sinkronisasi Hexa-Sync ke versi rilis `m025-605`.
6. `id-golden-baseline.json`:
   - Pembaruan baseline emas literal Indonesia.

---

## 5. Status Gerbang Mutu Lokal

- `node tests/id-golden-snapshot-test.js` : **PASS** (baseline emas utuh)
- `node tests/th-ui-leak-test.js` : **PASS** (4389 kunci selaras)
- `node tests/curriculum-cache-version-test.js` : **PASS** (build m025-605 selaras)
- `node tests/gate-registry-test.js` : **PASS** (10 pass, 0 fail)
- `node tests/interactive-chat-test.js` : **PASS** (11/11 lulus)
- `node tests/chat-neural-voice-test.js` : **PASS** (7/7 lulus)
- `node tests/interactive-chat-braincore-telemetry-test.js` : **PASS** (7/7 lulus)
- `node tests/interactive-chat-correction-test.js` : **PASS** (8/8 lulus)
- `git diff --check` : **PASS** (0 trailing whitespace)
