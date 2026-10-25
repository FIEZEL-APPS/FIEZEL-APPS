# FIEZEL HANDOFF: m025-672 Mandatory Microphone Permission Gate & Live Duplex Protection

## 1. Ringkasan Eksekutif & Permintaan Pengguna
- **Permintaan Pengguna**: Mengaktifkan sistem gerbang izin mikrofon wajib (popup/modal izin mikrofon) sehingga jika pengguna belum/tidak menghidupkan mikrofon, panggilan Telepon Live tidak boleh dilanjutkan sama sekali.
- **Akar Masalah Sebelumnya**:
  Pada alur sebelumnya, jika fungsi `navigator.mediaDevices.getUserMedia()` gagal atau ditolak atau belum diizinkan oleh pengguna, blok `catch` hanya mencetak pesan log di console dan langsung melanjutkan eksekusi `connectDuplex()`. Akibatnya, koneksi WebSocket Gemini Live tetap tersambung, suara Gemini terdengar membalas, namun aliran data mikrofon murid kosong (*null*) sehingga murid tidak bisa berbicara.
- **Solusi yang Diterapkan**:
  1. **Mandatory Microphone Gate Invariant**:
     - Sistem mewajibkan keberadaan track audio hidup (`track.readyState === 'live' && track.enabled`) sebelum menginisialisasi Web Audio dan WebSocket duplex.
     - Jika mikrofon belum diizinkan, ditolak, atau gagal diakses:
       * Eksekusi panggilan live langsung dihentikan (*hard return*).
       * Dilarang keras menghubungkan WebSocket ke server Gemini.
       * Memunculkan **Modal Izin Mikrofon Wajib** di layar.
  2. **Modal Izin Mikrofon Wajib Khusus iPhone & Mobile**:
     - Dilengkapi penjelasan mengapa mikrofon wajib untuk percakapan AI live.
     - Dilengkapi petunjuk langkah demi langkah khusus pengguna iPhone (Safari) jika akses mic sebelumnya pernah tertolak (buka ikon `aA` di bilah alamat -> *Pengaturan Situs Web* -> *Mikrofon: Izinkan*).
     - Tombol aksi: *"Aktifkan Mikrofon Sekarang"* yang mengeksekusi permintaan izin mikrofon langsung dari gestur sentuhan pengguna, serta tombol *"Batalkan Panggilan"*.
  3. **Indikator Real-Time Mikrofon & Deteksi Bicara**:
     - Menghitung RMS volume sinyal mikrofon secara real-time.
     - Menampilkan indikator visual saat panggilan berlangsung: badge *"Mic Aktif"* saat hening dan berdenyut *"Mendengarkan..."* saat suara pengguna masuk.

---

## 2. Bukti Pengujian Empiris & Headless Playwright Audit
1. **Uji Penolakan Izin (`tools/dev/probe-mic-permission-modal.mjs`)**:
   - Menyimulasikan peramban tanpa izin mic (`NotAllowedError`).
   - Hasil: Modal *"Izin Mikrofon Wajib Diaktifkan"* langsung muncul di layar.
   - Verifikasi Kritis: WebSocket Gemini Live **0% tersambung** (panggilan diblokir secara mutlak).
2. **Uji Pemberian Izin (`tools/dev/probe-mic-permission-modal.mjs`)**:
   - Menyimulasikan izin mic diberikan.
   - Hasil: Modal tidak muncul / tertutup, koneksi duplex WebSocket sukses tersambung ke `wss://generativelanguage.googleapis.com/...`, dan badge *"Mic Aktif"* aktif di bilah kendali panggilan.
3. **Uji Mutu Lokal (PASS 100%)**:
   - Golden snapshot test: PASS.
   - Thai UI leak test: PASS.
   - Curriculum cache version test: PASS (`m025-672`).
   - Gate registry test: PASS.

---

## 3. Berkas yang Diubah
1. `features/voice-studio/src/App.tsx`:
   - Implementasi `acquireLiveMicrophoneStream` dengan dua lapis percobaan (high-fidelity & pure audio constraint).
   - Gerbang blokir mutlak di `startLiveCall` jika mic gagal didapatkan.
   - State `showMicPermissionModal`, `isRequestingMic`, `micPermissionError`, `isUserSpeakingLive`.
   - Komponen UI Modal Wajib Izin Mikrofon & Indikator Volume Bicara.
2. `features/voice-studio/dist/voice-studio.js`:
   - Kompilasi bundel produksi Voice Studio terbaru.
3. `id-golden-baseline.json`:
   - Penyelarasan snapshot hash baseline literal Indonesia.
4. Hexa-sync rilis `m025-672`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `call.html`
   - `features/voice-studio/call.html`
