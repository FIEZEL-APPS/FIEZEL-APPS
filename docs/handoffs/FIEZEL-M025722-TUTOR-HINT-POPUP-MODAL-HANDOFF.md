# FIEZEL m025-722 Handoff: Restorasi Petunjuk Guru Popup Modal Melayang & Eliminasi Scrap Inline Di Bawah Jawaban

## 1. Ringkasan Temuan & Permasalahan
- **Keluhan Pengguna**:
  Pada saat murid memilih jawaban yang kurang tepat pada percobaan pertama kuis, petunjuk guru tampil sebagai kartu inline (`#tutorTurn`) di bagian bawah deretan pilihan ganda (`#options`), sehingga mendorong tata letak halaman ke bawah dan memaksa murid melakukan scrolling vertikal. Pengguna menuntut agar **Petunjuk Guru wajib muncul sebagai kartu pop-up melayang / bottom sheet slide-up** lengkap dengan latar blur (backdrop), serupa dengan lembar pembahasan dan kartu dialog keyakinan.
- **Akar Masalah**:
  1. Pada iterasi sebelumnya, `showTutorHintModal(q, j, clueReason)` sempat terlewat dipanggil dan digantikan oleh panggilan langsung ke `speak(turn, {retry: true})` yang membuka `#tutorTurn`. Karena `#tutorTurn` secara bawaan berada di dalam aliran DOM normal di bawah `#options`, elemen ini merender kartu inline yang memanjang ke bawah.
  2. `#tutorTurn` memiliki margin, padding, border, dan tinggi nyata saat unhidden sehingga memperpanjang layout kuis.

## 2. Solusi & Perubahan Arsitektur (m025-722)
1. **Restorasi `showTutorHintModal` pada Percobaan Pertama (`answer()`)**:
   - Diaktifkan kembali pemanggilan `showTutorHintModal(q, j, hintClueReason || nudgeText)` pada cabang retry percobaan pertama di `app.js`.
   - Menggunakan dialog modal pop-up mewah dengan backdrop blur ber-z-index tinggi (`z-index: 2147482500` untuk modal, `2147482400` untuk backdrop), sehingga berada di atas seluruh lapisan antarmuka.
2. **Arsitektur Responsif Dua Arah (Mobile Slide-Up Sheet vs Desktop Centered Modal)**:
   - **Mobile (`max-width: 639px`)**: Tampil sebagai slide-up bottom sheet (`bottom: 0`, `animation: fzSheetSlideUp`, `border-radius: 24px 24px 0 0`, `max-width: 680px`).
   - **Desktop (`min-width: 640px`)**: Tampil sebagai dialog tengah (`top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`, `animation: fzModalPopIn`, `border-radius: 24px`).
3. **Aksi Ganda Interaktif**:
   - Tombol utama: **"Coba Lagi"** (`#tutorModalRetryBtn`) dengan ikon `rotate-ccw` — menutup modal, mendisable opsi yang salah, dan membiarkan murid langsung memilih jawaban lain tanpa perlu scrolling layar.
   - Tombol sekunder: **"Buka Pembahasan"** (`#tutorModalGiveUpBtn`) dengan ikon `help-circle` — menutup modal dan langsung mengeksekusi `reveal(q, lastPick, false, {forced: true})` untuk membuka pembahasan lengkap.
   - Tombol tutup pojok kanan atas: `#tutorModalCloseX`.
   - Tombol dilengkapi handler ganda `ontouchend` dan `onclick` dengan `e.stopPropagation()`, `e.preventDefault()`, dan `haptic('tap')`.
4. **Eliminasi Total Scrap Inline `#tutorTurn`**:
   - Di `style.css`, ditambahkan aturan kuat:
     ```css
     .quiz-shell #tutorTurn,
     body.has-tutor-modal #tutorTurn {
       position: absolute !important;
       opacity: 0 !important;
       height: 0 !important;
       overflow: hidden !important;
       pointer-events: none !important;
       margin: 0 !important;
       padding: 0 !important;
       border: none !important;
     }
     ```
   - `#tutorTurn` memiliki tinggi `0px` dan tidak pernah lagi merender kartu inline di bawah pilihan jawaban, sementara teks dan data ladder tetap dapat diakses oleh tes internal upstream jika diperlukan.
5. **Penyempurnaan Kontras Lembar Umpan Balik (Feedback Sheet)**:
   - Teks "Mengapa kurang tepat?" menggunakan font `#9F1239` tebal 800 di atas latar mawar lembut `#FEF2F2` dengan border kiri `4px solid #E11D48`.
   - Kartu "INTINYA:" menggunakan lencana `#92400E` dengan teks penjelasan `#0F172A` (deep midnight slate, tebal 600, ukuran 14px) di atas latar amber `#FFFDF5`, menjamin tidak ada teks kosong atau pudar.

## 3. Bukti Verifikasi Empiris (Playwright Telemetry)
Dijalankan melalui probe otomatis `tools/dev/probe-tutor-hint-popup.mjs`:
- **Mobile Viewport (390x844)**:
  - `hasModal: true`, `hasBackdrop: true`
  - Modal rect: `y: 392.6px`, `height: 451.4px`, `width: 390px` (docked to bottom).
  - `tutorTurn` rect: `height: 0px`, `opacity: 0` (zero visual footprint).
  - Interaksi klik "Coba Lagi": modal tertutup mulus, 3 pilihan jawaban tersisa siap diklik tanpa scrolling.
  - Tangkapan layar: `tutor-hint-popup-mobile-verified.png`.
- **Desktop Viewport (1280x800)**:
  - `hasModal: true`, `hasBackdrop: true`
  - Modal rect: `x: 420px`, `y: 165.5px`, `width: 440px`, `height: 468.9px` (presisi tengah layar: `(1280 - 440) / 2 = 420px`).
  - `tutorTurn` rect: `height: 0px`, `opacity: 0`.
  - Tangkapan layar: `tutor-hint-popup-desktop-verified.png`.

## 4. Daftar Berkas Diperbarui
- `app.js`: Panggilan `showTutorHintModal`, tombol ganda `#tutorModalRetryBtn` & `#tutorModalGiveUpBtn`, touch event handlers.
- `style.css`: Layering z-index `2147482500` & `2147482400`, styling sheet/modal responsif, zero-height guard `#tutorTurn`.
- `id-golden-baseline.json`: Pembaruan snapshot emas literal UI.
- `coordination/BUILD-VERSION.json`: Bump build ke `m025-722`.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Sinkronisasi Hexa/Octa-Sync `m025-722`.
- `tools/dev/probe-tutor-hint-popup.mjs`: Probe harness Playwright untuk pengujian otomatis.
