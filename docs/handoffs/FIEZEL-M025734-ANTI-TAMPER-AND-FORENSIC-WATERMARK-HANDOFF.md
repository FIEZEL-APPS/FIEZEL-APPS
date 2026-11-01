# FIEZEL Handoff Dossier: Anti-Tamper & Forensic Watermark (m025-734)

## Authority & Scope
- **AUTHORITY:** Explicitly authorized under OWNER mandate for Zero-Theft & IP-Shield protection (Pilihan A & Pilihan B).
- **BUILD:** Canonical build incremented from `m025-733` to `m025-734` across 8 canonical release points.
- **SCOPE:** Client-side tamper prevention, quiz anti-copy, devtools shortcut blocker, domain origin lock, and steganographic invisible zero-width watermarking.

---

## Ringkasan Implementasi

### 1. Steganografi Forensik (`features/ui/fiezel-watermark.js`)
* **Encoding Biner Unicode:** Mengonversi identitas murid/perangkat (`getLearnerSignature()`) menjadi string biner dan memetakannya ke karakter Unicode Zero-Width:
  - `\u200B` = bit 0 (Zero-Width Space)
  - `\u200C` = bit 1 (Zero-Width Non-Joiner)
  - `\u200D` = Delimiter awal (Zero-Width Joiner)
  - `\uFEFF` = Delimiter akhir (Zero-Width No-Break Space)
* **Injeksi Pertanyaan Kuis:** Setiap stem soal (`renderQuizQuestionContent` di `app.js`) otomatis disisipi watermark tak terlihat. Teks di mata murid terlihat 100% normal dan bersih.
* **Ekstraktor Forensik:** `FiezelWatermark.decode(text)` dapat membedah teks curian untuk melacak ID akun/perangkat yang membocorkannya.
* **Pembersihan TTS:** `features/neural-voice/fiezel-voice-say.js` membersihkan karakter zero-width sebelum sintesis audio agar pengucapan suara tetap 100% fasih dan tanpa hambatan.

### 2. Anti-Copy & Origin Shield (`features/ui/fiezel-anti-tamper.js`)
* **Domain Origin Boundary:** Memverifikasi `location.hostname` dan `location.protocol`. Mengizinkan domain resmi (`fiezel.my.id`, `fiezel-apps.github.io`), lingkungan APK Android (`capacitor:`, `file:`, `window.Capacitor`), dan lingkungan uji lokal (`localhost`, `127.0.0.1`, `navigator.webdriver`). Menolak dan mengunci diri jika dibuka di domain kloning pihak ketiga.
* **Aturan Anti-Seleksi CSS:** Menginjeksi `-webkit-user-select: none !important; user-select: none !important;` pada kartu soal (`.quiz-shell`, `.quiz-stage`, `.quiz-bubble`, `#quizStem`, `.token-rail`). Form input dan textarea tetap bebas diseleksi.
* **Pencegahan Klik Kanan & Copy:** Memblokir `contextmenu` pada area kuis dan mengganti data clipboard dengan pemberitahuan hak cipta resmi saat ada upaya menyalin.
* **Pintasan Keyboard Shield:** Memblokir `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `Ctrl+U`, dan `Ctrl+S` di lingkungan produksi.

---

## Status Pengujian Empiris & Invarian Mutu
- `tests/anti-tamper-and-watermark-test.js` -> PASS (7/7 assertions)
- `tests/id-golden-snapshot-test.js` -> PASS (Baseline emas Indonesia utuh)
- `tests/th-ui-leak-test.js` -> PASS (Nol kebocoran naskah)
- `tests/curriculum-cache-version-test.js` -> PASS (33/33 assertions, m025-734)
- `tests/gate-registry-test.js` -> PASS (10/10 assertions)
- `tests/precache-covers-shell-test.js` -> PASS (5/5 assertions)
- `tests/boot-order-test.js` -> PASS (15/15 assertions)
- `tools/bump-build.mjs --check` -> PASS (Selaras m025-734)

---

## Roadmap & Langkah Berikutnya
1. **Fase Berikutnya (Roadmap Pilar 1):** Migrasi bank soal bertahap menuju Just-In-Time (JIT) micro-batch streaming via Cloudflare D1.
2. **Monitoring Proteksi:** Pantau feedback dan performa murid di perangkat nyata untuk memastikan nol dampak terhadap kelancaran belajar.
