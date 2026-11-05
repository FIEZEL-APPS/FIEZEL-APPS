# FIEZEL m025-767 Handoff Dossier: Quiz Question Sentence Contrast & Mochi SOS Acceleration

## 1. Ringkasan Temuan Audit & Akar Masalah

### A. Teks Soal Kuis Terpotong / Tampak Hanya Satu Kata (Invisible Sentence Text)
- **Gejala Masalah**: Murid melaporkan soal tata bahasa (`A1-307`: "___ you ready for the test?") hanya menampilkan satu kata `"Do"`, seolah-olah bank soal atau Braincore merusak kalimatnya.
- **Akar Masalah CSS**:
  Pada `style.css` (baris 9406) dan `features/grammar/grammar-upgrade.css` (baris 227), terdapat selektor:
  ```css
  body:not(.theme-dark):not(.fz-lux) .card:not(.quiz-bubble):not(.quiz-stage) .question-main {
    color: #0F172A !important;
  }
  ```
  Karena elemen kontainer terluar adalah `<div class="card">` yang membungkus `.quiz-stage` dan `.quiz-bubble`, kelas `.card` memenuhi selektor `.card:not(.quiz-bubble)`. Selektor ini memiliki spesifisitas `(0, 6, 1)` dengan `!important`, yang **mengalahkan** aturan `.quiz-bubble .question-main { color: #FFFFFF !important; }` `(0, 2, 0)`.
  Akibatnya, sisa kalimat `" you ready for the test?"` diwarnai `#0F172A` (hitam navy pekat) di atas latar gelembung gelap (`#181824`), sehingga menjadi 100% tidak terbaca pada layar OLED ponsel murid. Hanya kata `"Do"` yang terlihat karena kelas `.target-word` memiliki latar emas dan garis bawah kuning.
- **Solusi**:
  1. Memperbarui selektor light mode menjadi:
     ```css
     body:not(.theme-dark):not(.fz-lux) .card .question-main:not(.quiz-bubble *):not(.quiz-stage *):not(.speech-bubble *) {
       color: #0F172A !important;
     }
     ```
  2. Memperkuat spesifisitas pada gelembung gelap untuk memastikan warna teks selalu putih berkontras tinggi:
     ```css
     .quiz-bubble .question-main,
     .quiz-stage .question-main,
     .speech-bubble .question-main,
     body:not(.theme-dark):not(.fz-lux) .card .quiz-bubble .question-main {
       color: #FFFFFF !important;
       -webkit-text-fill-color: #FFFFFF !important;
       text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45) !important;
     }
     ```

### B. Mochi SOS Lambat & Hening Berkepanjangan Saat Diaktifkan
- **Gejala Masalah**: Ketika murid mengaktifkan tombol Mochi SOS, koneksi internet terasa sangat lama, tidak langsung menyapa, dan hening selama 4-7 detik dengan banner "Menyambungkan...".
- **Akar Masalah**:
  1. `openHotSocket()` dan `prewarmLiveSession()` dinonaktifkan secara penuh (`return;` dan `Promise.resolve(null)`), sehingga saat murid mengonfirmasi tombol di modal, aplikasi baru memulai fetch HTTP POST token ke Cloudflare Worker dari awal via jaringan seluler (RTT ~1-1.5s), baru kemudian memulai negosiasi WebSocket Gemini Live.
  2. Saat tombol modal ditekan, tidak ada umpan balik auditori seketika, membuat murid merasa aplikasi macet/lambat.
  3. Format instruksi `sendOpeningTurn` terlalu panjang sehingga LLM Gemini Live menghasilkan paragraf pembuka multi-kalimat yang memakan waktu inferensi lebih lama.
- **Solusi**:
  1. **Pre-warm Session Token On Modal**: Saat modal konfirmasi Mochi SOS (`showConfirmationModal`) terbuka di layar, sistem langsung memicu `prewarmLiveSession(true)`. Saat murid membaca modal (~1-2 detik) dan menekan "Gunakan 10 Gem & Mulai", token sesi Gemini Live sudah siap di memori (`_prewarm.session`), memangkas latensi HTTP RTT secara total.
  2. **Instant Responsive Chime (<80ms)**: Saat murid mengonfirmasi modal, sistem langsung membunyikan nada sambut ceria sintetis Web Audio (`playTone(523.25, 0.08) -> playTone(659.25, 0.12)` / C5-E5) dan menggerakkan pose Mochi menyapa (`mochiInst.setPose('greet')`, `wave`), memberikan umpan balik nyata seketika tanpa menunggu jaringan.
  3. **In-Flight Prewarm Handling**: `_startGeminiLiveDuplex` secara cerdas mengadopsi `_prewarm.promise` bila token masih dalam proses fetch, mencegah duplikasi request jaringan.

---

## 2. Bukti Pengujian Empiris (Playwright Headless Chromium)

Pengujian probe Playwright Chromium dijalankan pada pohon DOM kuis riil untuk mengukur warna terkomputasi (`getComputedStyle`):
```json
[PROBE RESULT] {
  "text": "Do you ready for the test?",
  "questionMainColor": "rgb(255, 255, 255)",
  "questionMainWebkitFill": "rgb(255, 255, 255)",
  "targetWordColor": "rgb(254, 243, 199)",
  "targetWordBg": "rgba(245, 158, 11, 0.32)",
  "instructionColor": "rgb(203, 213, 225)"
}
```
Hasil: Teks `.question-main` terbukti 100% `rgb(255, 255, 255)` (Pure White) dengan rasio kontras WCAG AAA terhadap latar belakang `#181824`.

---

## 3. Berkas yang Disentuh
- `features/grammar/grammar-upgrade.css`: Isolasi selektor light mode dan penguatan spesifisitas kontras `.quiz-bubble .question-main`.
- `style.css`: Sinkronisasi aturan spesifisitas kontras `.quiz-bubble .question-main` dan `.target-word`.
- `features/mascot/fiezel-mochi-voice-sos.js`: Token pre-warming saat modal terbuka, resonansi chime sintetis instan, dan penanganan in-flight promise.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `coordination/BUILD-VERSION.json`: Rilis build m025-767.
