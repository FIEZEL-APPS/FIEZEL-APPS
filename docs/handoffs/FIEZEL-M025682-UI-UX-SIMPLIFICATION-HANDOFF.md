# FIEZEL M025-682 Handoff Dossier: Simplifikasi UI/UX Kawan Bicara & Eliminasi Build Badge Header

## 1. Ringkasan Masalah & Permintaan Pengguna
1. **Instruksi Visual Langsung ("BAGIAN INI HAPUS SAJA")**:
   - Pengguna mengunggah tangkapan layar `media_1792979331695_c49e2127.png` dengan coretan merah tegas "BAGIAN INI HAPUS SAJA" yang mengarah langsung ke pill versi build teknis `🔄 m025-680` di bilah atas (header kanan).
   - Bagi murid/learner, melihat angka kode build internal (`m025-680`) dengan ikon refresh menimbulkan kesan membingungkan, seolah aplikasi sedang dalam status debug atau ada kesalahan teknis.
2. **Penyebab Utama Kebingungan Murid pada Fitur Kawan Bicara (Akar Masalah UI/UX)**:
   - **Decision Paralysis (Kompetisi 5 Tombol Komunikasi)**: Ketika pertama kali membuka Kawan Bicara, murid dihadapkan pada terlalu banyak kontrol yang bertentangan:
     * Tombol `Telepon Live` di pojok kanan atas kartu panggung AI.
     * Tombol `Dengar` (Volume2) pada kartu bantuan jawaban.
     * Tombol `Ucapkan` (Mic) pada kartu bantuan jawaban.
     * Tombol `Pakai` (Send) pada kartu bantuan jawaban.
     * Tombol `Bicara` (Mic) pada bilah bawah (bottom dock).
     * Tombol `Kirim` (Send) dan bilah ketik `Ketik atau bicara...` di dock.
   - **Ambiguitas Status Panggilan ("Apakah AI sedang mendengarkan saya?")**:
     * Pada saat masuk pertama kali, status hanya menampilkan teks statis `Siap bicara`. Murid mengira mikrofon sudah aktif lalu mulai berbicara, padahal mikrofon belum aktif sebelum tombol `Telepon Live` ditekan atau tombol `Bicara` ditekan.
     * Murid merasa AI "tidak merespons/rusak" karena tidak ada indikator yang menegaskan bahwa panggilan belum tersambung atau mic belum dibuka.
   - **Ambiguitas Giliran Bicara (Turn-Taking Visibility)**:
     * Saat AI selesai berbicara dalam mode live duplex, status sebelumnya hanya mencetak `LIVE · 00:15` tanpa sinyal visual yang menginstruksikan bahwa sekarang adalah giliran murid berbicara.
   - **Revisi Copy Tulisan Bantuan Jawaban**:
     * Judul bantuan sebelumnya `"Sini, biar Fiezel bantuin kamu jawab lebih natural"` terlalu panjang dan terkesan informal di layar sempit ponsel.

## 2. Perubahan yang Dilakukan
1. **Eliminasi Total Pill Build Header**:
   - Menghapus tombol `handleForceFlushPwaCache` (`<RefreshCw /> m025-xxx`) dari header `features/voice-studio/src/App.tsx`.
   - Mengikat fungsi pembersihan cache ke `window.__fzForceFlushPwaCache` untuk kebutuhan diagnosa teknis tanpa mengotori UI murid.
2. **Perbaikan Hierarki & Kejelasan Aksi Utama**:
   - Mempertegas tombol `Telepon Live` dengan ikon telepon beraksen emerald (`text-emerald-400`) serta tooltip deskriptif agar murid langsung mengenali cara memulai panggilan suara dua arah hands-free.
   - Mengatur status kehadiran secara proaktif:
     * Saat AI berbicara: `Mochi berbicara... (00:12)`
     * Saat AI menyiapkan respons: `Mochi sedang berpikir…`
     * Saat murid berbicara live: `Mendengarkan... (00:14)`
     * Saat giliran murid: `LIVE · 00:15` dengan indikator aktif hands-free hijau berdenyut di dock bawah: *"Mikrofon handsfree aktif — Bicara langsung tanpa tekan tombol"*.
3. **Penyempurnaan Salinan Teks (UX Copy) Bantuan Jawaban**:
   - Memperbarui judul di `BeginnerAnswerAssistant.tsx`:
     * Desktop: `Bantuan Jawaban Natural · Fiezel Copilot`
     * Mobile: `Bantuan Jawaban · Fiezel`
     * Thai Desktop: `แนวทางตอบธรรมชาติ · Fiezel Copilot`
     * Thai Mobile: `แนวทางตอบ · Fiezel`
   - Memberikan tooltip dan interaksi visual klik yang jelas pada kartu teleprompter (`hover:bg-[#FAF6EE] p-0.5 rounded-xl`) dengan petunjuk *"Ketuk untuk memilih balasan ini"*.

## 3. Bukti Pengujian Empiris (Headless Chromium Playwright)
1. **Probe Realtime Copilot**:
   - `node tools/dev/probe-kawan-bicara-realtime-copilot.mjs`
   - Hasil: **LULUS 100%**.
   - Geometri Mobile (390×844): StageBottom=457px, CopilotBottom=695px, DockTop=777px (Zero overlap, sisa ruang lega 82px).
   - Telemetri Braincore: tercatat `historyCount: 2, competencyCount: 12`.
2. **Probe Voice Pacing & VAD**:
   - `node tools/dev/probe-voice-pacing-anti-glitch-vad.mjs`
   - Hasil: **LULUS 100%**.
3. **Voice Studio Architecture Test**:
   - `node tests/voice-studio-ui-architecture-test.js`
   - Hasil: **LULUS 5/5**.

## 4. Status Gerbang Mutu Lokal (Hexa-Sync & Quality Gates)
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (4501 kunci id selaras dengan th)**
- `node tests/curriculum-cache-version-test.js`: **PASS (33 penegasan, 3 halaman, build m025-682)**
- `node tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik wajib)**
