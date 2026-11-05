# FIEZEL m025-769 Handoff Dossier: Kawan Bicara Voice Revolution, Unified Stream, and Quiz Clarity Audit

## 1. Ringkasan Eksekutif & Permintaan Pengguna
Rilis ini menyelesaikan audit menyeluruh pada fitur **Kawan Bicara** (`call.html` / `features/voice-studio`) serta menjawab tuntas kebingungan pengguna mengenai tampilan soal kuis kosa kata/tata bahasa (`A1-307`: "Do you ready for the test?"):

1. **Penghapusan Batas Waktu 5 Menit**:
   - Menghapus pembatasan `MAX_CALL_DURATION_SEC = 300` dan auto-disconnect timer. Murid bebas berlatih percakapan tanpa tertekan hitung mundur.
2. **Inversi Hierarki Tipografi (Bahasa Asing Menjadi Bintang Utama)**:
   - Teks bahasa target (Inggris, Jepang, Mandarin) kini berada di **posisi teratas dengan font tebal dan tegas** (`text-[17px] sm:text-[19px] font-bold text-[#1C1611]`).
   - Terjemahan bahasa ibu (Indonesia / Thai / dll.) berada di bawah dengan warna sekunder yang lembut (`text-[#5C4E3C]`).
   - Tombol interaktif `[👁️ Sembunyikan / Tampilkan Arti]` dipasang langsung di kartu ucapan agar murid bisa melatih pemahaman menyimak mandiri.
3. **Penyempurnaan Streaming Terjemahan**:
   - Mengeliminasi tebakan terjemahan liar kata-demi-kata dan deretan tanda baca Morse (` , ! , : `) selama AI berbicara.
   - Sistem kini menampilkan status bersih `"Sedang memuat terjemahan..."` / `"กำลังแปล..."` saat AI berbicara aktif, dan baru menyajikan terjemahan final yang akurat setelah kalimat selesai diucapkan.
4. **Alur Percakapan Terpadu (Unified Stream WhatsApp-Style) & Copilot Teleprompter Paten**:
   - Menghapus pemisahan tab buatan antara "Panggung/Stage" dan "Riwayat/History" pada perangkat seluler.
   - Riwayat gelembung percakapan mengalir mulus ke bawah (`flex-1 overflow-y-auto`).
   - Komponen **Bantuan Jawaban (Copilot Teleprompter)** kini dipatok permanen sebagai dermaga tetap (`shrink-0`) persis di atas bar input pesan. Murid dapat melihat 3 opsi balasan (`1 · Singkat`, `2 · Alami`, `3 · + Tanya Balik`) tanpa perlu menggulir (scroll) layar sama sekali.
5. **Akar Masalah Soal Kuis "Do you ready for the test?" & Pertanyaan SRL**:
   - **Teks Kalimat Terlihat Hanya Satu Kata**: Pada soal perbaikan kalimat `A1-307`, kata `"Do"` berada dalam badge `.target-word`, sedangkan sisa kalimat `" you ready for the test?"` sebelumnya tertimpa warna navy gelap `#0F172A` di atas kartu gelap `#181824`. Hal ini kini telah tuntas diperbaiki sehingga seluruh kalimat tampil putih bersih `#FFFFFF` dengan kontras WCAG AAA.
   - **Pertanyaan "Seberapa yakin jawabanmu akan benar?"**: Teks ini berasal dari modul SRL Coach (Self-Regulated Learning) untuk mengukur metakognisi murid. Karena sebelumnya teks tersebut diletakkan melayang tepat di atas opsi jawaban `Are / Is / Am / Do` saat sisa kalimat tidak terbaca, murid mengira bahwa "Seberapa yakin..." adalah pertanyaan soal yang harus dijawab dengan "Are/Is/Am/Do".
6. **Perbaikan CORS Cloudflare Worker**:
   - `workers/api/mw-guard.js` kini mengizinkan header `authorization`, `x-requested-with`, `accept` pada preflight OPTIONS, menghilangkan pesan error CORS pada panggilan API.

---

## 2. Berkas yang Disentuh
- `features/voice-studio/src/App.tsx`: Penghapusan batas waktu, inversi hierarki HUD & transkrip, streaming terjemahan "Sedang memuat...", dan docking Copilot di atas input bar.
- `features/voice-studio/src/lib/liveTransport.ts`: Penambahan tipe intent `clarification_repeat` dan `wh_what_action` serta perluasan template balasan EN/JA/ZH.
- `features/voice-studio/src/index.css`: Peniadaan margin horizontal furigana ruby (`margin-inline: 0`) dan perbesaran font ukuran furigana (`0.65em`).
- `features/voice-studio/dist/voice-studio.js` & `voice-studio.css`: Hasil kompilasi Vite terbaru.
- `workers/api/mw-guard.js`: Penambahan header CORS.
- `id-golden-baseline.json`: Pembaruan snapshot baseline teks Indonesia.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `coordination/BUILD-VERSION.json`: Rilis build m025-769.

---

## 3. Hasil Pengujian Mutu (100% HIJAU)
- `tests/id-golden-snapshot-test.js`: PASS (Baseline emas Indonesia utuh)
- `tests/th-ui-leak-test.js`: PASS (Nol kebocoran teks)
- `tests/curriculum-cache-version-test.js`: PASS (33 penegasan selaras m025-769)
- `tests/gate-registry-test.js`: PASS (10/10 gerbang mutu valid)
- `tests/role-security-test.js`: PASS (185/185 otentikasi role aman)
- `tools/bump-build.mjs --check`: PASS (Hexa-Sync selaras m025-769)
