# FIEZEL-M025602: KAWAN BICARA NAVIGATION LIFECYCLE & BOTTOMNAV RESTORATION HANDOFF

**Tanggal**: 18 Oktober 2026<br>
**Build Target**: `m025-602`<br>
**Branch**: `fix/kawan-bicara-nav-lifecycle-and-back-home`<br>
**Status**: HIJAU / LULUS SEMUA GERBANG MUTU & AUDIT EMPIRIS PLAYWRIGHT

---

## 1. Ringkasan Temuan Audit dan Akar Masalah

Pengguna melaporkan masalah kritis pada fitur "Kawan Bicara" (Mitra Kaiwa / Speaking Companion):
> *"ketika masuk ke sesi chat featur ini, tidak bisa kembali ke Home, walaupun bisa kembali, navigation barnya hilang, mesti ditutup pwa agar semuanya kembali normal, dan masih banyak bug bug lainnya"*

Berdasarkan orkestrasi 15 subagent spesialis dan audit empiris Playwright headless Chromium, ditemukan 4 akar masalah utama:

1. **Destructive Inline Style Mutation pada Bottomnav**:
   - Di `features/interactive-chat/fiezel-interactive-chat.js` fungsi `mount()` memasang `bottomNav.style.setProperty('display', 'none', 'important')`.
   - Mutasi inline style ini tidak dibersihkan saat murid berpindah view karena `app.js` tidak memanggil `unmount()` ketika meninggalkan `state.view === 'chat'`. Akibatnya, `.bottomnav` tetap `display: none !important` di semua layar lain sampai PWA di-restart.
2. **Ketiadaan Unmount Hook di `renderInner()` `app.js`**:
   - `app.js` me-render `chat` secara dinamis, namun saat berpindah ke tab lain (`home`, `latihan`, dll.), tidak ada hook pembersihan siklus hidup (`self.FiezelInteractiveChat?.unmount?.()`).
   - Class `fz-view-chat` pada `<html>` dan `<body>` tidak dibersihkan dengan benar saat keluar dari chat.
3. **Salah Rute Tombol Kembali (`handleTopbarBack`)**:
   - Fungsi `handleTopbarBack()` di `app.js:9707` mendaftarkan `'chat'` ke dalam array `subViews = ['grammar','vocab',...,'chat']`.
   - Logika tersebut memaksa navigasi kembali ke `go('latihan')`, padahal murid membuka Kawan Bicara dari kartu beranda (`home`).
   - Antarmuka chat penuh tidak memiliki tombol kembali (Back Button) tersendiri di header kontainer chat jika topbar aplikasi tersembunyi.
4. **Kebocoran Sumber Daya Audio & Mikrofon (Microphone Privacy Indicator Leak)**:
   - Saat murid keluar dari chat atau panggilan suara (`VoiceCall`) tanpa menekan hangup, indikator lampu mikrofon di bilah status OS tetap menyala karena `MediaStreamTrack` tidak dimatikan dengan `track.enabled = false` sebelum `track.stop()`.
   - Pemutaran suara neural voice tidak dihentikan saat unmount atau saat murid melakukan barge-in.

---

## 2. Solusi Perbaikan Sistemik

### A. Navigasi & Siklus Hidup Bersih (`app.js`)
- Memperbarui `handleTopbarBack()`: ketika `state.view === 'chat'`, sistem mengarahkan kembali ke `go('home')` (atau mendelegasikan ke `self.FiezelInteractiveChat.handleChatBack()`).
- Mendaftarkan `TAB_PARENT.chat = 'home'` agar active pill bottomnav sinkron saat navigasi kembali.
- Menambahkan hook unmount di `renderInner()`: saat view berpindah dari `chat`, memanggil `self.FiezelInteractiveChat?.unmount?.()`.
- Menjamin pembersihan class `fz-view-chat` dari `<html>` dan `<body>` serta menghapus sisa inline style pada `.bottomnav`.

### B. In-Chat Header Back Button & Ergonomi Sentuhan Apple HIG (`fiezel-interactive-chat.js` & `interactive-chat.css`)
- Menambahkan tombol kembali `#fzcBtnBack` dengan ikon `chevron-left` SVG pada header chat `.fzc-header`.
- Area sentuh memenuhi standar Apple HIG $\ge 44 \times 44\text{px}$ dengan padding dan tactile clay response.
- Menghubungkan klik `#fzcBtnBack` ke `handleChatBack()` yang mengarahkan kembali ke `home` secara instan dan aman.
- Menghapus aturan CSS brittle `:has(.fzc-container)` dan mengisolasi visibilitas dock secara eksklusif ke selector `html.fz-view-chat body.fz-view-chat`.

### C. Pembersihan Sumber Daya Audio & Mikrofon Tanpa Bocor (`fiezel-chat-voice.js` & `fiezel-voice-call.js`)
- Menerapkan penutupan agresif pada seluruh `MediaStreamTrack` (`track.enabled = false; track.stop();`).
- Memutuskan `callSourceNode` dan `shadowingSourceNode` dari Web Audio context tanpa merusak shared audio context.
- Menghentikan pemutaran audio (`FiezelChatVoice.stop()`) seketika saat unmount, reset skenario, atau barge-in pengguna.
- Menambahkan listener event global (`pagehide`, `beforeunload`, `popstate`, `visibilitychange`) untuk pelepasan hardware mikrofon otomatis.

---

## 3. Bukti Pengujian Empiris Nyata (Playwright & Probe Test)

1. **`tools/dev/probe-chat-navigation-lifecycle.mjs`** (Playwright Chromium Headless 412x915px):
   - **Tahap 1**: Home view aktif, bottomnav `computed display: flex`, `inline: ""` -> **LULUS**.
   - **Tahap 2**: Navigasi ke `state.view = 'chat'` -> **LULUS**.
   - **Tahap 3**: Klik tombol `#fzcBtnBack` -> Kembali ke `home`, bottomnav `computed display: flex` -> **LULUS**.
   - **Tahap 4**: Klik bottomnav tab `latihan`, `game`, `home` -> Semua tab responsif dan beralih normal -> **LULUS**.
   - **Tahap 5**: Browser popstate / OS back button -> Bersih kembali ke `home`, bottomnav pulih 100% -> **LULUS**.
2. **`tests/audio-resource-leak-audit-test.js`** (5/5 PASS):
   - Uji pemutusan seluruh engine suara neural & web audio.
   - Uji pelepasan media track mikrofon dan penanganan race condition late `getUserMedia`.
   - Uji unmount cascade dari chat ke `VoiceCall`.
3. **`tests/voice-call-lifecycle-probe.js`** (7/7 PASS):
   - Uji siklus hidup panggilan dua arah, BackNav layer registration, dan penghapusan overlay DOM.
4. **`tests/interactive-chat-dark-contrast-probe.js`** (100% WCAG AAA PASS):
   - Kontras teks kanji, furigana ruby, dan tactile clay pada light mode dan dark theme.

---

## 4. Berkas yang Dimodifikasi & Ditambahkan

- `app.js`: Routing `chat -> home`, unmount hook di `renderInner()`, teardown class & inline style.
- `features/interactive-chat/fiezel-interactive-chat.js`: Tombol kembali `#fzcBtnBack`, eliminasi inline style destructive, unmount lifecycle, pembersihan audio.
- `features/interactive-chat/interactive-chat.css`: Styling tactile clay `#fzcBtnBack`, perbaikan scoping `.fz-view-chat`.
- `features/interactive-chat/fiezel-chat-icons.js`: Penambahan vektor SVG `chevron-left` dan `arrow-left`.
- `features/interactive-chat/fiezel-chat-voice.js`: Multi-layer playback abort dan barge-in.
- `features/interactive-chat/fiezel-voice-call.js`: Pelepasan track hardware mikrofon, Web Audio disconnect, listener lifecycle.
- `features/interactive-chat/fiezel-voice-orb.js`: Pembersihan RAF visualizer.
- `.github/workflows/quality.yml`: Pendaftaran `tests/audio-resource-leak-audit-test.js`.
- `tests/audio-resource-leak-audit-test.js`: Gerbang mutu anti-kebocoran audio.
- `tools/dev/probe-chat-navigation-lifecycle.mjs`: Script pengujian Playwright.
- Hexa-Sync Bump: `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.

---

## 5. Status Gerbang Mutu Lokal & Invarian

- `tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)** (397 gerbang di repo, 388 invokasi di workflow, 386 gerbang bukti).
- `tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**.
- `tests/th-ui-leak-test.js`: **PASS (4389 kunci, 0 kebocoran)**.
- `tests/curriculum-cache-version-test.js`: **PASS (26 penegasan, build m025-602)**.
- `tools/bump-build.mjs --check`: **Selaras (m025-602)**.
- Git Protection Rule: Wajib Pull Request ke `main`. Zero push langsung ke `main`.
- Catatan Utang Teknis: **NOL (0)**.
