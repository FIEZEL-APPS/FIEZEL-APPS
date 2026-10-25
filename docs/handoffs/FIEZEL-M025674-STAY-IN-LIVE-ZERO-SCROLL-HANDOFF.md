# FIEZEL HANDOFF: m025-674 Stay-in-Live Zero-Scroll Stage & Segmented History View

## 1. Ringkasan Eksekutif & Permintaan Pengguna
- **Keluhan & Permintaan Pengguna**:
  - *"AKU INGIN FITURNYA UI DAN UX NYA ITU LEBIH BAGUS, SEPERTI SAAT MELAKUKAN LIVE MAKA USER TIDAK PERLU SCROLL KE CHAT PALING BAWAH, BISA STAY DI TAMPILAN LIVE"*
  - Pengguna melampirkan tangkapan layar kartu panggung live (Mochi 3D di tengah, status Siap bicara, subtitle AI furigana ruby + romaji + arti bahasa Indonesia, balon ucapan "Kamu: ...", dan tombol Telepon Live) serta menegaskan: *"STAY DISINI"*.
- **Akar Masalah Teknis**:
  1. Pada implementasi terdahulu, terdapat efek auto-scroll agresif di `App.tsx`:
     ```tsx
     useEffect(() => {
       if (activeTab === 'call' && turns.length > 1) {
         transcriptContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
       }
     }, [turns.length, activeTab]);
     ```
     Setiap kali AI atau murid selesai berbicara (`turns.length` bertambah), viewport peramban otomatis ditarik paksa ke bawah menuju kontainer bubble chat riwayat transkrip. Akibatnya, panggung Mochi 3D dan tombol kendali telepon live terdorong keluar dari layar atas.
  2. Panggung Live dan daftar puluhan bubble chat riwayat dirender secara vertikal beruntun dalam satu wadah scroll (`<main className="overflow-y-auto">`). Di layar smartphone, pengguna terpaksa harus terus-menerus men-scroll bolak-balik antara panggung Mochi dan riwayat chat di bawah.
- **Solusi yang Diterapkan**:
  1. **Dual-Mode Architectural Paradigm ("Live Stage" vs "Riwayat Chat")**:
     - Memperkenalkan state `callViewMode` (`'stage'` | `'history'`) dengan nilai default `'stage'`.
     - Saat sesi Telepon Live aktif (`isLiveConnected === true`) atau saat murid menekan tombol *Telepon Live*, sistem mengunci mode tampilan ke `'stage'` dan memastikan scroll tetap berlabuh di panggung atas (`scrollTop = 0`).
  2. **Zero-Scroll Invariant di Panggung Live**:
     - Auto-scroll ke bawah dinonaktifkan secara total saat berada di mode `'stage'`.
     - Konten daftar chat riwayat panjang disembunyikan (`hidden`) saat di mode panggung, sehingga ruang layar smartphone 100% didedikasikan untuk panggung live Mochi tanpa adanya scrollbar liar atau dorongan ke bawah.
  3. **Segmented Control Switcher yang Elegan & Intuitif**:
     - Menambahkan sakelar segmented pill di baris meta atas: `[Live]` dan `[Riwayat (N)]`.
     - Di bagian bawah panggung live, ditambahkan tombol taktil halus: *"Lihat Riwayat & Catatan Evaluasi (N) ↓"* untuk memudahkan murid beralih membaca evaluasi grammar saat sesi selesai.
     - Di mode Riwayat, disediakan tombol kembali mencolok: `[← Kembali ke Panggung Live]` yang membawa murid seketika kembali ke panggung Mochi.
  4. **Penyempurnaan Visual & Integrasi Subtitle Real-Time**:
     - Subtitle AI kanji dengan furigana ruby, romaji emas, dan terjemahan tertata rapi di tengah panggung.
     - Balon ucapan murid *"Kamu: ..."* tampil halus tepat di bawah teks AI saat murid berbicara, memberikan umpan balik visual instan tanpa perlu melirik ke alur chat bawah.

---

## 2. Bukti Pengujian Empiris & Headless Playwright Probe
1. **Probe Playwright di Layar Ponsel (`tools/dev/probe-live-stage-zero-scroll.mjs`)**:
   - Menjalankan uji pada viewport iPhone 390x844:
     * **Check 1: AI Call Stage Card rendered successfully? YES.**
     * **Check 2: Segmented Switcher (Live vs Riwayat) is active? YES.**
     * **Check 3: Live Stage is active and STAY ON SCREEN (Initial Scroll Top: 0)? YES.**
     * **Check 4: History View toggles cleanly (Card hidden in history mode)? YES.**
     * **Check 5: Restored back to Live Stage smoothly (Stage visible)? YES.**
   - Hasil: **ALL 5/5 CHECKS PASSED!**
2. **Quality Gates Lokal (PASS 100%)**:
   - `tests/voice-studio-ui-architecture-test.js`: PASS (5/5).
   - `tests/ios-pwa-mic-shadowing-test.js`: PASS (5/5).
   - `tests/id-golden-snapshot-test.js`: PASS (baseline emas m025-674).
   - `tests/th-ui-leak-test.js`: PASS.
   - `tests/curriculum-cache-version-test.js`: PASS (`m025-674`).
   - `tests/gate-registry-test.js`: PASS (10/10).

---

## 3. Berkas yang Diubah
1. `features/voice-studio/src/App.tsx`:
   - Penambahan state `callViewMode` ('stage' | 'history').
   - Guard zero-scroll pada `useEffect` auto-scroll transkrip.
   - Pemasangan Segmented Switcher Pill `[Live]` vs `[Riwayat]`.
   - Penyembunyian alur chat panjang saat mode panggung aktif agar layar 100% STAY di panggung Live.
   - Tombol navigasi dua arah antara Panggung Live dan Riwayat Evaluasi.
2. `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`:
   - Hasil kompilasi bundel produksi Voice Studio terbaru.
3. `id-golden-baseline.json`:
   - Pembaruan baseline snapshot resmi literal Indonesia.
4. Hexa-sync rilis `m025-674`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `call.html`
   - `features/voice-studio/call.html`
