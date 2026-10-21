# FIEZEL m025-463: kabel BrainCore terakhir (D8, K4) dan sisa polesan UX grammar

Tanggal: 2026-10-04. Menutup sisa dua audit hari ini:
`reports/BRAINCORE-WIRING-AUDIT-2026-10-04.md` (D8, K4) dan
`reports/GRAMMAR-SESSION-UX-AUDIT-2026-10-04.md` (U13, U15 sampai U18, ditambah temuan baru dari
probe ulang).

## Yang berubah

### D8: Belajar mandiri menampilkan ingatan per soal
- `features/learner-flow/fiezel-learner-flow.js`: `conceptStates(st, nowMs)` membaca
  `FiezelQuestionMemory.stateOf` untuk setiap butir yang pernah dijawab murid, lalu
  mengelompokkannya: `mastered` = kuat, `weak` + `repeated-error` = goyah, `due-for-review` =
  waktunya diulang. Butir `recently-seen` dibaca ulang tanpa jam (keadaan dasarnya), supaya butir
  yang baru saja dijawab salah tetap terhitung goyah.
- `conceptStatesMarkup(st)` menampilkan satu baris di Rencana hari ini (sebelum "Alasan sesi ini"),
  hanya bila sudah ada minimal 5 butir. Bila ada yang goyah, baris itu menambahkan bahwa sesi
  berikutnya mendahulukannya (itu memang yang dilakukan alokator: prioritas `repeated-error` dan
  `weak` paling tinggi).
- Kunci baru: `flow.konsep-ringkas`, `flow.konsep-dahulu` (copy-id/th-feat-d.js).

### K4: tugas remedial khusus per murid
- `features/class-hub/fiezel-class-hub.js`: `remedialSkillsFor(s)` memilih sampai dua skill bank
  untuk SATU murid: skill bank dengan akurasi murid itu di bawah 70%, urut dari yang terlemah,
  ditambah skill yang ditunjuk pelajaran lemah BrainCore (`bc.weak`) yang menyangkut past tense
  (`past` + `question`/`did` = `past_questions`, `past` lainnya = `past_tense`).
- Baris murid di kartu "Kata Braincore tentang muridmu" (tab Saran Braincore guru) kini punya tombol
  "Remedial khusus" bila daftar itu tidak kosong. Tombolnya (`data-ch="remedial-murid"`) membuka
  langkah Buat Tugas dengan sumber bank, skill milik murid itu, 8 soal, tenggat 3 hari, dan
  `targets = [id murid]`. Jadi tugasnya HANYA terkirim ke murid itu, lewat jalur `targets` yang
  sudah ada sejak lama.
- Kunci baru: `kelas.bc-remedial-murid`, `kelas.bc-remedial-judul` (copy-id/th-classjoin.js).
- Batas jujur: bank review hanya punya lima skill (past_tense, past_questions, vocab_a2,
  listening_detail, reading_inference). Pelajaran lemah BrainCore di luar past tense belum punya
  pasangan di bank, jadi tidak ikut menunjuk skill. Memperluas bank adalah pekerjaan konten
  tersendiri.

### Polesan UX grammar (U13, U15 sampai U17) dan temuan probe ulang
Semua di `features/ui/fiezel-tactile-clay.css` (blok paling bawah, berkomentar):
- U13: toast di sesi pelajaran pindah ke atas (menutupi bilah keluar dan hitungan soal saja) dan
  tidak lagi menutupi pilihan jawaban atau bar "Lanjut".
- U15: penyebabnya dua desain yang bertabrakan. `fiezel-2.css` membuat simpul jalur berupa titik
  16px tanpa nomor (`.path-ring>b{display:none}`), lalu tactile-clay membesarkan tombolnya menjadi
  kotak 44px dengan padding tombol umum. Hasilnya kotak putih kosong. Kotaknya dipertahankan dan
  diisi: lingkaran 34px, nomor pelajaran, ikon kunci atau centang. Ikon pil "Ujian Naik Level" dulu
  tercat krem di atas putih (aturan `body.fz-lux .exam-entry-chip *{color:#fff}`), kini cokelat tua.
- U16: chip "Sudah dicoba" 2,24:1, sekarang di atas 7:1.
- U17: petunjuk "Ketuk keping di bawah..." 2,45:1, sekarang di atas 5:1.
- Temuan baru dari probe ulang:
  - **Dua judul yang tidak terlihat sama sekali**: judul modal "Misi Kosakata Kunci" (misalnya
    "I, me, my: tiga wujud kata ganti") dan judul kemenangan FIEZEL QUEST tercat putih di atas kartu
    putih (aturan umum `.modal-panel h2` untuk panel gelap). Keduanya dipaku gelap.
  - Kalimat pegangan ingatan tutor (`.tutor-ladder .tutor-turn-ask`) kuning di kartu terang, 1,19:1.
  - Kartu "Trik Cepat Ingat" bertinta cokelat di panel pembahasan gelap, 1,56:1. Kartunya kini
    berlatar krem padat.
  - "Daftar kata tersedia" 1,48:1, "PRASASTI BARU" 1,29:1, serta enam label kecil di 2,86 sampai
    4,1:1 ("A1" di Latihan, badge misi, arti kosakata misi, "Tahap N", badge "TATA BAHASA · A1",
    "Petunjuk Guru").
- U18 (mode gelap identik dengan terang): tidak diubah. Itu keputusan desain yang konsisten di
  seluruh aplikasi; dicatat di laporan audit sebagai disengaja.

### U19: label jalur terkunci di bawah 4,5:1 setelah opasitas dihitung
Probe audit membaca warna teks dan latar apa adanya, jadi ia buta pada peredupan yang datang dari
opasitas `:disabled`/leluhur. Dua kelas cacat lolos karena itu:
- chip "Sudah dicoba" (U16) hidup di dalam `.option.was-tried:disabled{opacity:.78}`, jadi 7,63:1
  mentah hanya terender ~4,3:1;
- baris meta kartu pelajaran terkunci (`"pola grammar dasar · Dikuasai 0%"`, `#64748B` di atas
  `#F8FAFC`) hidup di dalam `.path-step.is-locked .path-label{opacity:.82}`, jadi 4,62:1 mentah
  terender ~3,3:1.

Perbaikannya di `features/ui/fiezel-tactile-clay.css` (blok paling bawah):
- opasitas pilihan "Sudah dicoba" dikembalikan (`opacity:1`) selama chip tampil;
- nada baris meta jalur terkunci dinaikkan ke `#3F4A5A` (terender ~5,3:1 pada .82); judul dan
  catatan kunci sudah lolos dan tidak disentuh.

Sekaligus `tools/dev/grammar-ux-audit-2026-10-04-probe.js` dibuat sadar-opasitas: kontras dihitung
dari seluruh rantai `opacity` (gaya elemen sendiri diabaikan terpisah karena `getComputedStyle` anak
selalu melaporkan 1), warna teks dibaca dari `-webkit-text-fill-color`, dan elemen yang sedang
bertransisi opasitas (toast yang baru muncul) atau bertinta gradien/potong dilewati alih-alih
divonis palsu. Setelah itu sisa temuan di bawah ambang sama dengan yang sudah didokumentasikan:
judul ber-teks gradien, tombol nonaktif "Hapus"/"Periksa" (dikecualikan WCAG), dan layar hasil yang
tertutup modal Prasasti.

### Ikut terbawa
- `app.js`: tombol live stage memakai ikon `audio-lines` alih-alih `radio`, yang tidak ada di subset
  `lucide.min.js` dan membuat `tests/lucide-icon-coverage-test.js` merah di main.

## Gerbang
- `tests/braincore-wave4-concepts-remedial-test.js` (11 cek): penghitungan D8 dengan
  QuestionMemory sungguhan, posisi barisnya, batas 5 butir; pemilihan skill K4 per murid, pemetaan
  past, tanpa tombol bila tanpa bukti, `targets = [sid]`; bilingual id/th, tanpa tanda pisah, tanpa
  istilah mesin.
- `tests/grammar-ux-p3-2026-10-04-test.js` (23 cek): aturan U13, U15 sampai U17, U19 dan dua judul
  ada, dan setiap pasangan warna yang ditulisnya lolos 4,5:1 (dihitung, bukan ditebak). U19 dihitung
  pada opasitas `.82` yang sama, karena di situlah cacatnya lahir.
- Keduanya terdaftar di `.github/workflows/quality.yml` sesudah gerbang gelombang 3.

## Diverifikasi di browser
`tools/dev/grammar-ux-audit-2026-10-04-probe.js` diputar ulang di Chromium 390x844. Yang tersisa
di bawah ambang hanya judul ber-teks gradien (alat ukur membaca warna transparan), tombol
"Periksa" yang nonaktif (dikecualikan WCAG), dan layar hasil yang tertutup modal Prasasti (teks di
belakang lapisan redup).
