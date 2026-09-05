# m025-146 — Listening berformat ujian, dan audio yang boleh dibagikan

Listening adalah skill terakhir yang belum punya jalur ujian. Writing, Reading, dan Speaking
sudah; Listening — kira-kira seperempat dari kedua ujian — masih nol.

**Status: SELESAI di branch, menunggu penerimaan fisik OWNER.**

---

## 1. Kenapa bank Listening lama tidak cukup

Bank harian memuat **1.407 item**, dan untuk latihan decoding itu bagus. Tetapi skripnya
rata-rata **54 kata** (maksimum 98). IELTS memutar percakapan dan monolog 500–900 kata per
bagian; TOEFL memutar kuliah sekitar lima menit. Bedanya bukan kalibrasi, melainkan jenis
latihan — sama persis dengan temuan Reading di m025-139.

Ada satu hal lagi yang lebih tajam: bank harian memberi `maxReplays: 2`. **IELTS dan TOEFL
tidak pernah mengulang audio.** Latihan yang mengizinkan pengulangan melatih kebiasaan yang
justru menghancurkan skor di ruang ujian — kesalahan sejenis dengan target 120 kata untuk esai
250 kata yang ditutup m025-138.

## 2. Yang dibangun

`listening-exam-v1.json`: **enam set, 43 soal, 3.232 kata skrip orisinal.**

| Set | Bentuk | Level | Kata | Soal |
|---|---|---|---:|---:|
| Mendaftar program renang | IELTS Listening Section 1 | B1 | 522 | 10 |
| Pengarahan relawan kebun raya | IELTS Listening Section 2 | B2 | 523 | 6 |
| Diskusi proyek suhu perkotaan | IELTS Listening Section 3 | B2 | 545 | 8 |
| Kuliah: sejarah waktu standar | IELTS Listening Section 4 | C1 | 552 | 7 |
| Percakapan perpustakaan kampus | TOEFL Listening – Conversation | B2 | 465 | 6 |
| Kuliah biologi: warna peringatan | TOEFL Listening – Lecture | C1 | 625 | 6 |

Tipe soalnya asli: form/note completion, location, detail, attitude, speaker opinion,
organization, gist-purpose, function, inference.

**Tiga aturan ujian ditegakkan, bukan disarankan:**

1. **Audio diputar sekali.** Batasnya diambil dari kontrak format, dan renderer-nya sengaja
   TIDAK membaca `maxListeningReplays` milik konfigurasi harian — kontrak ujian tidak boleh
   tunduk pada setelan yang mengizinkan dua kali putar.
2. **TOEFL menyembunyikan soalnya sampai audio habis**, dan menyediakan tempat mencatat;
   IELTS menampilkan soal selama audio berjalan, karena membaca-mendengar-menulis serentak
   memang keterampilan yang diuji IELTS.
3. **Audio yang gagal diputar tidak membuka soal**, dan tidak menghabiskan jatah putar.
   Menjawab tanpa mendengar bukan latihan.

## 3. Audionya: skrip orisinal + TTS

OWNER meminta berkas listening IELTS/TOEFL asli. Dua hal menghalanginya, dan keduanya saya
sampaikan sebelum mulai: sesi ini tidak punya akses internet sama sekali (ets.org, British
Council, VOA, LibriVox semuanya gagal dihubungi), dan — lebih menentukan — rekaman resmi itu
hak cipta ETS dan Cambridge/British Council/IDP. Menaruhnya di repo berarti FIEZEL
mendistribusikan ulang materi berhak cipta ke murid.

Jadi skripnya ditulis orisinal dan diputar lewat pipeline TTS yang sudah ada. Keuntungannya
bukan hanya legal: saya bisa merancang soalnya supaya tepat mengikuti tipe asli.

**Batasnya dinyatakan di banknya sendiri, bukan disembunyikan:** percakapan multi-pembicara
diputar dengan **satu suara**, tanpa ragam aksen yang dipakai ujian sebenarnya. Yang dilatih
di sini bentuk soal, tekanan sekali dengar, dan mencatat — **bukan** pembiasaan aksen. Untuk
aksen, materi latihan resmi gratis dari penyelenggara ujian tetap tak tergantikan.

Soal denah/peta IELTS Section 2 butuh gambar, jadi digantikan pertanyaan lokasi berbentuk
pilihan — dan kontrak formatnya menyebut itu **adaptasi**, bukan bentuk penuhnya.

## 4. Gate yang memeriksa penulisnya sendiri

`tests/listening-exam-test.js`, **38 pemeriksaan**. Yang paling penting bukan pemeriksaan bentuk
berkas, melainkan yang menguji kunci jawabannya:

- **Kunci resmi wajib mencetak 100 di setiap set**, dijalankan lewat penilai yang asli.
- **Setiap varian yang dijanjikan diterima wajib benar-benar diterima** — 43 soal, semua
  variannya dicoba satu per satu.
- **Setiap jawaban isian wajib tertelusur ke skripnya.**
- Huruf besar dan spasi berlebih tidak boleh mengubah nilai; jawaban salah wajib bernilai 0;
  jawaban kosong wajib 0 tanpa nilai parsial.

Dua pemeriksaan gagal saat pertama dijalankan, dan keduanya nyata:

**Pertama:** jawaban kode pos dan nomor telepon tidak ditemukan di skrip. Sebabnya justru
benar — di IELTS keduanya **dieja** ("L S nine, four T P"), dan mentranskripsikannya itulah
soalnya. Alih-alih melonggarkan pemeriksaan, soal semacam itu sekarang wajib mengutip frasa
yang mendiktekannya lewat `spokenAs`, dan gate memverifikasi frasa itu ada di skrip.

**Kedua:** pemeriksaan "tidak mengonversi band" mencocokkan kata "band" — dan kata itu muncul
di komentar yang menjelaskan kenapa konversi tidak dilakukan. Pemeriksaannya diperbaiki agar
menguji perilaku (metric yang dikembalikan, tidak ada field band/skor), bukan kata.

## 5. Bukti

- Seluruh **91 gate** `.github/workflows/quality.yml`: PASS, termasuk E2E Chromium.
- `tests/listening-exam-test.js`: **38/38 PASS**.
- Versi naik bersama ke `m025-146`; bank masuk precache service worker.

## 6. Sisa

- **Enam set saja.** Satu ujian IELTS penuh berisi empat bagian dalam satu sesi 30 menit;
  di sini tiap bagian berdiri sendiri. Menyusun sesi penuh adalah langkah berikutnya.
- **Aksen dan multi-suara** tetap tidak tersedia lewat TTS satu suara.
- Kalibrasi 300 bacaan lama (B-08/B-09) masih terbalik.
- Set Reading masih dua, Speaking sebelas.
