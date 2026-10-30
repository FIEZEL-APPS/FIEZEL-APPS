# FIEZEL Build m025-719 Handoff: Perbaikan Interaktivitas Lembar Umpan Balik Grammar & Bypass Auth Uji Lokal

**Versi Build:** `m025-719` (Berdasarkan `origin/main` commit `bf121662` `m025-718`)  
**Tanggal:** 30 Oktober 2026  
**Otoritas:** FIEZEL-APPS Core Engineering & Pedagogical Standard  

---

## 1. Ringkasan Eksekutif & Akar Masalah (Root Cause Analysis)

Pengguna melaporkan kendala kritis pada sesi latihan Grammar saat menguji di perangkat PWA:
1. **Tombol Terkunci (Soft-Lock / Unclickable):** Saat popup umpan balik muncul, pengguna tidak dapat menekan satu tombol pun (baik tombol keluar `#quizSheetExit`, tombol lanjutkan `#quizSheetNext`, tombol silang `#feedbackSheetClose`, maupun tombol buka pembahasan `#quizSheetExplain`).
2. **Konten Kosong / Blank Takeaway:** Ketika pengguna menjawab benar dan menekan "Lihat Pembahasan", layar hanya menampilkan `Jawabanmu tepat: ` (tanpa teks kata) dan kotak kartu `INTINYA: ` yang kontennya kosong melompong.
3. **Kebutuhan Bypass Auth Uji Lokal:** Server lokal pengujian (`localhost`, `127.0.0.1`, port 3000/3005/4173) terhalang auth login modal akun, sedangkan pengujian membutuhkan akses langsung ke layar utama tanpa merusak proteksi auth di server produksi `fiezel.my.id`.

### Analisis Akar Masalah:
- **Penyebab Tombol Tidak Dapat Diklik:**
  1. Pada kesalahan pertama, `showTutorHintModal()` memunculkan `#tutorHintModalBackdrop` dan modal di `z-index: 99998` yang tidak dibersihkan saat lembar feedback dibuka.
  2. Lembar feedback `#feedback.feedback-sheet` awalnya berada di `z-index: 10000`, sehingga backdrop modal tutor yang transparan/tak terlihat berada di atasnya dan mencegat 100% ketukan (pointer events).
  3. `closeConfidencePop()` menyisakan jendela 220ms di mana `#app` masih berstatus `inert="true"` akibat timeout CSS `is-out`.
  4. Handler gestur swipe dismiss `onSheetTouchStart` menganggap setiap sentuhan di atas lembar sebagai drag, sehingga membatalkan klik/tap pada tombol footer.
  5. Pemindahan `#feedback` ke `document.body` tanpa pembersihan menyebabkan duplikasi elemen `#feedback` di DOM saat soal berikutnya dirender.
- **Penyebab Konten "Jawabanmu tepat:" dan "INTINYA:" Kosong:**
  1. Pada tipe soal `token-order` dan beberapa modus grammar, resolusi `cleanCorrect` hanya mencari `q.options?.[q.answerIndex]`. Ketika nilai tersebut undefined atau string kosong, `cleanCorrect` bernilai `""`.
  2. `finalTakeaway` hanya mengandalkan `whyText` yang jatuh ke fallback konteks netral tanpa menyediakan kalimat penjelas tata bahasa yang padat makna.
- **Penyebab Auth Block di Lokal:**
  `bootAuthVerdict()` mengevaluasi sesi lokal yang belum login sebagai `'signed-out'`, memanggil `showAuthGate()` yang memblokir layar utama.

---

## 2. Tabel Verifikasi Kuantitatif (Rule 2.2 AGENTS.md)

| Item/Fitur | Spesifikasi Target | Aktual Terealisasi | Status |
|---|---|---|---|
| **Interaktivitas Tombol Feedback Sheet** | 4 tombol (`#feedbackSheetClose`, `#quizSheetExit`, `#quizSheetExplain`, `#quizSheetNext`) 100% responsif terhadap tap & klik | 4/4 tombol responsif seketika, `touch-action: manipulation !important`, `z-index: 2147482500` di atas semua scrim | **LULUS** |
| **Drawer Pembahasan Buka/Tutup** | Tombol "Buka Pembahasan" membuka `.feedback-drawer-details` tanpa memicu navigasi keluar | Teruji otomatis di Playwright Chromium (Drawer open: `true`) | **LULUS** |
| **Konten "Jawabanmu Tepat:"** | Wajib menampilkan teks jawaban nyata (panjang > 0 karakter) untuk semua mode | Resolusi multi-sumber (`cleanCorrect`, `fullSentence`, `tokens`, `clozeAnswer`) menjamin teks non-kosong | **LULUS** |
| **Konten Kartu "INTINYA:"** | Wajib berisi ringkasan pedagogis bermakna, dilarang kosong | Kaskade 11 kandidat + fallback kontekstual dwibahasa (ID & TH) menjamin string terisi | **LULUS** |
| **Pembersihan Elemen DOM Tunggal** | Maksimal tepat 1 elemen `#feedback` di seluruh dokumen peramban | Pembersihan otomatis `body > #feedback` di `draw()`, `advanceToNextQuestion()`, dan `closeFeedbackSheet()` menjamin count = 1 | **LULUS** |
| **Local Test Auth Bypass** | Akses langsung ke Beranda/Latihan tanpa modal auth di server lokal, aman di produksi | `isLocalTestServer()` hanya aktif pada `localhost`, `127.0.0.1`, `3000`, `3005`, `4173`, `fiezel.my.id` tetap 100% terproteksi | **LULUS** |
| **Grammar Feedback Regression Test** | Seluruh seksi A, B, dan C wajib lulus 100% | 24/24 pengujian lulus (`PASS (24)`) tanpa skip atau error | **LULUS** |
| **Content Integrity Gate** | `node tests/content-integrity-gate.js` | 4 dari 4 gerbang lulus 100% hijau | **LULUS** |
| **View Reachability Gate** | `node tests/view-reachability-test.js` | 67 dari 67 pemeriksaan lulus (20 layar, 24 nama view) | **LULUS** |
| **Mochi Voice SOS Unit Tests** | `node tests/mochi-voice-sos-test.js` | 8 dari 8 unit test lulus 100% | **LULUS** |
| **Penyelarasan Build Version (Hexa-Sync & Octa-Sync)** | `m025-719` selaras di seluruh berkas PWA | `node tools/bump-build.mjs --check` dan `curriculum-cache-version-test.js` valid 100% | **LULUS** |

---

## 3. Rincian Perubahan Kode

1. **`style.css`:**
   - Menaikkan `z-index` `#feedback.feedback-sheet` dan `body > #feedback.feedback-sheet` ke `2147482500 !important;`
   - `.feedback-sheet-backdrop` dinaikkan ke `2147482400 !important;`
   - Menambahkan aturan tegas pada seluruh tombol footer dan header: `pointer-events: auto !important; cursor: pointer !important; touch-action: manipulation !important; user-select: none !important;`
   - Memastikan `#feedback` memiliki batas tinggi maksimal `85vh` dengan `display: flex; flex-direction: column; overflow: hidden;` dan area isi yang dapat digulir mandiri (`.feedback-sheet-body`).
2. **`app.js`:**
   - **`isLocalTestServer()`**: Mendeteksi `localhost`, `127.0.0.1`, IP private, dan port dev (3000, 3005, 4173, 5173).
   - **`authGateNeeded()` & `startWelcomeExperience()`**: Melewati auth gate secara otomatis saat dijalankan di server lokal, sambil membiarkan domain produksi `fiezel.my.id` tetap terkunci aman.
   - **`closeConfidencePop(now=true)`**: Menghilangkan popup secara instan dan memanggil `syncDialogContainment()` untuk membersihkan atribut `inert` dari cangkang kuis secara sinkron.
   - **`reveal()`**:
     - Pembersihan menyeluruh `#tutorHintModalBackdrop`, `#tutorHintModal`, dan kelas `has-tutor-modal`.
     - Resolusi robust `resolvedCorrect`, `cleanCorrect`, dan `cleanUserPick` pada semua mode susun kata, cloze, dan pilihan ganda.
     - Kaskade pedagogis 11 tingkat untuk kartu `INTINYA:`.
     - Pengikatan event handler tombol via `bindSheetBtn` yang mendukung `ontouchend` dan `onclick` dengan `e.stopPropagation()`.
     - Pengecualian elemen interaktif pada `onSheetTouchStart` agar gestur geser tidak mencegat klik tombol.
     - Pembersihan elemen ganda di `draw()`, `advanceToNextQuestion()`, dan `closeFeedbackSheet()`.
   - **`answer()`**: Mengembalikan pemanggilan `speak(turn, {retry:true, similar:!!mirip})` sehingga tangga bantuan BrainCore (`.tutor-ladder`) dan bimbingan guru tampil bersih di antarmuka tanpa memunculkan modal backdrop yang mengunci layar.
3. **`features/ui/fiezel-boot-tail.js`:**
   - Pada server lokal pengujian, service worker lama otomatis di-unregister dan cache dibersihkan agar pengujian browser selalu memuat kode JavaScript dan CSS terbaru tanpa jeda cache.
4. **`tests/view-reachability-test.js`:**
   - Mengabaikan direktori `node_modules`, `dist`, dan `.git` saat melakukan traversal berkas, mempercepat waktu eksekusi dari timeout menjadi < 1 detik.

---

## 4. Bukti Verifikasi Visual

Screenshot pengujian Playwright Chromium tersimpan pada repositori artefak:
- **Mobile (`390 × 844 px`):** `grammar-feedback-sheet-mobile-m025719.png`
  - Lembar feedback slide-up muncul di bagian bawah dengan pill status charcoal jelas.
  - Baris jawaban menampilkan: `Jawabanmu I • Jawaban yang paling tepat adalah mine.`
  - Kartu "INTINYA:" menampilkan penjelasan pedagogis utuh.
  - Keempat tombol ("Keluar", "Buka Pembahasan", "Lanjut", dan "X") terpasang dan dapat ditekan seketika.
- **Desktop (`1280 × 800 px`):** `grammar-feedback-sheet-desktop-m025719.png`
  - Format kartu tunggal terpusat dengan padding proporsional dan kontras daylight tajam.
