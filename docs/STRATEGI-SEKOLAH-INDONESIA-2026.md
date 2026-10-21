# Strategi FIEZEL untuk Sekolah Indonesia — masalah nyata guru & murid, dan apa yang harus dibangun

Wewenang: OWNER. Dokumen per 5 Oktober 2026. Cakupan: **Indonesia saja** (permintaan owner).
Basis: riset publik (sumber di akhir) + pemetaan kode di build terbaru `main`.

---

## 0. Kesimpulan lebih dulu

FIEZEL sudah kuat di **mesin belajar** (BrainCore, adaptif, offline) dan cukup lengkap di
**alat guru** (KelasKu, tugas, analitik, rapor ortu). Yang kurang bukan "fitur lagi", tetapi
**kecocokan dengan tiga kenyataan sekolah Indonesia 2026** yang sedang berlaku sekarang:

1. **HP murid sedang dibatasi di sekolah** (Jawa Barat sejak Mei 2025, DKI dan surat edaran
   Kemendikdasmen untuk 2026). Produk yang hanya hidup di HP murid akan berhenti dipakai
   di jam pelajaran. → FIEZEL butuh **Mode Kelas Tanpa HP**.
2. **Guru dinilai lewat administrasi Kurikulum Merdeka + pembelajaran mendalam** (KKTP,
   asesmen tingkat pemahaman, diferensiasi, rapor deskriptif). Rekap FIEZEL masih memakai
   **"KKM 75"**, istilah yang sudah tidak dipakai. → **Rapor KKTP + deskripsi capaian**.
3. **Bahasa Inggris di ujian nasional = membaca** (TKA SMA: pemahaman tekstual, inferensial,
   evaluasi fakta/opini; TKA SD–SMP 2027 diwacanakan menambah Bahasa Inggris). Bank ujian
   membaca FIEZEL baru 8 bacaan. → **Jalur Membaca TKA**.

Delapan rekomendasi di §3 diurutkan menurut tenggat nyata (kalender sekolah), bukan selera.

---

## 1. Masalah nyata — dengan angka

### Murid

| # | Masalah | Bukti |
|---|---|---|
| M1 | Kemampuan bahasa Inggris rendah | EF EPI 2025: Indonesia peringkat **80 dari 123**, skor 471, kategori *Low* |
| M2 | Literasi membaca lemah | PISA 2022 membaca **359** (rata-rata OECD 476). Asesmen Nasional 2024: **29,66%** murid SMP di bawah kompetensi minimum literasi |
| M3 | Takut salah & malu berbicara bahasa Inggris | Penelitian kelas SMP: faktor dominan = kurang percaya diri, takut gagal, kurang latihan |
| M4 | Tidak bisa memakai HP di sekolah | Larangan/pembatasan gawai Jabar 2025, DKI 2026, SE Kemendikdasmen 2026 |
| M5 | Akses internet timpang | Akses internet sekolah wilayah Barat **82,1%** vs Timur **45,2%** |
| M6 | Godaan menyalin jawaban AI | SKB 7 Menteri (Maret 2026) mengatur AI di sekolah; riset: ketergantungan ChatGPT menurunkan kemandirian belajar |

### Guru

| # | Masalah | Bukti |
|---|---|---|
| G1 | Beban administrasi | Permendikdasmen 11/2025: beban kerja 37,5 jam/minggu dihitung dari seluruh aktivitas; riset: beban administrasi berkorelasi negatif dengan kinerja |
| G2 | Bingung menerapkan pembelajaran mendalam | Berlaku TA 2025/2026 (mindful, meaningful, joyful); implementasi cenderung prosedural karena pemahaman guru terbatas |
| G3 | Diferensiasi di kelas 30+ murid | Capaian Pembelajaran menuntut diferensiasi; guru memberi soal yang sama ke semua |
| G4 | Contek PR (WA & AI) | Kekhawatiran guru soal PR disalin AI; SKB melarang menyalin jawaban AI untuk tugas yang dinilai |
| G5 | Kelas tanpa perangkat | Kebijakan HP (M4) + ketimpangan perangkat (M5) |

---

## 2. Apa yang sudah dimiliki FIEZEL — dan celahnya

| Masalah | Sudah ada | Celah |
|---|---|---|
| M1 kemampuan | Jalur adaptif A1–A2 (~1.150 soal), BrainCore (BKT, FSRS-lite, miskonsepsi), duel & Paw Arena | — (inti produk) |
| M2 literasi | `reading-bank.json` 312 butir, ujian membaca 8 bacaan | Tidak ada jalur berlabel **tekstual / inferensial / evaluatif** seperti kisi-kisi TKA |
| M3 malu bicara | Bank speaking 36 butir, pengenalan suara, Panggung Suara (siaran langsung) | Bank kecil; ruang bicara yang ada justru **publik** — tidak ada latihan privat bertahap |
| M4/G5 tanpa HP | PWA offline, Mode Papan proyektor, cetak rekap & laporan mingguan | **Tidak bisa mencetak lembar soal/tugas**; Mode Papan belum jadi jalur kelas utama |
| M5 akses | Offline setelah terpasang, antrean sinkron | Tugas guru ditarik satu per satu saat online; tidak ada **paket mingguan** sekali unduh |
| M6/G4 contek | Focus guard ujian, sebagian besar soal pilihan (bukan teks bebas) | Semua murid dapat **soal & urutan opsi yang sama** → kunci "1B 2C 3A" bisa disebar di WA |
| G1 admin | Rekap e-Rapor, rapor naratif ortu (WA), laporan mingguan, jurnal | Rekap memakai **KKM 75** (seharusnya KKTP per tujuan pembelajaran); belum ada deskripsi capaian per murid |
| G2/G3 mendalam & diferensiasi | Kelompok belajar otomatis, remedial per murid (m025-463), miskonsepsi kelas | Hasil tidak dibahasakan sebagai **tingkat pemahaman per TP**, padahal itu yang diminta asesmen pembelajaran mendalam |

Catatan mesin (dari audit sebelumnya, tetap berlaku):
- **Kalibrasi soal masih per HP (N=1).** `features/brain/fiezel-item-calibration.js` sendiri
  menyatakan kalibrasi hanya sahih bila soal dijawab banyak murid. Sekarang hasil tugas dan
  catatan latihan sudah sampai server, jadi kalibrasi lintas murid **sudah mungkin**.
- **Kapasitas terpasang 250 pengguna** (`workers/api/wrangler.toml` `MAX_USERS`). Satu kelas
  aman; satu sekolah (600–900 murid) tidak muat.
- Progres yang ikut akun baru catatan latihan (Sprint 1, m025-464). Streak, gems, Prasasti,
  jadwal ulang kosakata, dan level belum ikut (Sprint 1b).

---

## 3. Rekomendasi — urut menurut tenggat

### R1. Mode Kelas Tanpa HP — *paling mendesak (kebijakan sudah berlaku)*
- **Papan Kelas jadi jalur utama di jam pelajaran:** pemanasan 5 menit di proyektor dari
  kesalahan tugas semalam (miskonsepsi kelas yang sudah dihitung), jawaban murid lewat
  angkat tangan/kartu A-B-C-D, guru mengetuk hasil.
- **Cetak lembar soal A4:** tugas → PDF/cetak dengan 2 varian, kunci jawaban, dan kolom nilai.
  Guru memasukkan skor per murid dengan cepat di KelasKu, supaya BrainCore tetap mendapat bukti.
- HP murid dipakai **di rumah** (PR malam), sejalan dengan arahan Mendikdasmen bahwa HP
  dipakai di kelas hanya bila dibutuhkan pembelajaran.

### R2. Rapor KKTP + deskripsi capaian — *tenggat: sebelum rapor semester ganjil (Desember)*
- Ganti "KKM 75" dengan **KKTP per tujuan pembelajaran** (guru boleh mengatur ambangnya).
- Per murid: status ketercapaian per TP + **kalimat deskripsi capaian** siap tempel ke e-Rapor,
  dibangun dari bukti per soal yang sudah ada.
- Sekalian: label **tingkat pemahaman** (belum / mulai / cakap / mahir) per TP untuk guru —
  bahasa yang dipakai asesmen pembelajaran mendalam.

### R3. Jalur Membaca TKA — *tenggat: TKA SMA (2025 digelar November)*
- Soal membaca berlabel tiga level kognitif sesuai kisi-kisi TKA Bahasa Inggris:
  **tekstual** (informasi eksplisit, ringkasan), **inferensial** (ide pokok, tujuan penulis),
  **evaluatif** (fakta vs opini).
- Peta Kesiapan jujur: "dari N kompetensi kisi-kisi, X kuat, Y sedang, Z belum" — **tanpa**
  prediksi skor atau peluang lulus.
- Ini **pekerjaan konten** (bank 8 bacaan → target ≥60 bacaan bertingkat), bukan kode.

### R4. Tugas varian per murid (anti-contek)
- Tujuan sama, kumpulan soal berbeda per murid + urutan opsi diacak.
- Ke guru katakan "contek jauh lebih sulit", bukan "mustahil".

### R5. Paket tugas mingguan offline
- Murid mengunduh semua tugas seminggu saat ada sinyal (di sekolah/wifi), mengerjakan
  offline, hasil terkirim otomatis begitu online. Penting untuk wilayah Timur (M5).

### R6. BrainCore: kalibrasi soal lintas murid
- Server menghitung kesulitan nyata tiap soal dari **agregat** hasil seluruh murid
  (tanpa identitas), lalu mengirim balik ke HP. Mengganti tebakan editorial `fiezel-item-prior`
  dengan data. Hanya untuk soal yang dijawab ≥ 30 murid; batas pergeseran tetap.
- Efek: adaptif lebih tepat, remedial lebih tepat sasaran, dan guru melihat soal mana yang
  ternyata terlalu sulit/terlalu mudah.

### R7. Latihan bicara privat bertahap (untuk M3)
- Bicara ke Pau dulu, **tanpa nilai dan tanpa penonton**; kemudian rekaman ke guru; baru
  Panggung Suara. Tambah bank speaking dari 36 ke ≥150 butir A1–A2.
- Tidak ada skor pelafalan per fonem (masih dilarang roadmap) — umpan balik berupa
  "kata yang tertangkap" saja.

### R8. Kapasitas & kepatuhan sekolah
- Rencana kapasitas di atas 250 pengguna sebelum menawarkan ke satu sekolah penuh.
- Audit kepatuhan **SKB 7 Menteri AI**: label jelas setiap jawaban yang dibuat AI (Tanya
  FIEZEL), dan AI tidak dipakai untuk mengerjakan tugas yang dinilai.

### Yang sengaja TIDAK disarankan
- **Menambah konten 16 mapel lain.** Masih 15 soal per mapel dan tidak membedakan tingkat
  kelas (lihat `PILOT-SEKOLAH-SMP.md` §0b). Fokus bahasa Inggris sampai pilot membuktikan pemakaian.
- **Prediksi skor TKA / peluang lulus.** Tidak ada instrumen tervalidasi; dilarang roadmap.
- **Leaderboard individu sekelas.** Memperparah M3 (malu & takut gagal).

---

## 4. Urutan kerja yang disarankan

| Urutan | Pekerjaan | Jenis | Kenapa sekarang |
|---|---|---|---|
| 1 | R1 Mode Kelas Tanpa HP | kode | Kebijakan HP sudah berlaku; tanpa ini FIEZEL hilang dari jam pelajaran |
| 2 | R2 Rapor KKTP | kode | Rapor semester ganjil Desember |
| 3 | R3 Jalur Membaca TKA | konten + kode kecil | TKA SMA akhir tahun; Bahasa Inggris di TKA SD–SMP masih wacana 2027 |
| 4 | R4 Varian per murid | kode | Murah, langsung dirasakan guru |
| 5 | R6 Kalibrasi lintas murid | kode server | Data sudah mengalir sejak m025-464 |
| 6 | R5 Paket offline | kode | Penting untuk perluasan ke luar Jawa |
| 7 | R7 Bicara privat | kode + konten | Dampak besar, tapi butuh konten |
| 8 | R8 Kapasitas & SKB AI | infra + audit | Prasyarat sebelum satu sekolah penuh |

Sebelum R1–R2 dibangun penuh, jalankan dulu wawancara guru (`docs/pilot/WAWANCARA-GURU.md`)
— pertanyaan 5 ("5 menit pertama") dan 6 ("rapor") langsung menguji R1 dan R2.

---

## Sumber

- EF EPI 2025 — Indonesia: <https://www.ef.edu/epi/regions/asia/indonesia/>, <https://jakartaglobe.id/news/ef-report-indonesia-placed-80th-worldwide-in-english-proficiency-index>
- PISA 2022 Indonesia: <https://en.tempo.co/read/1806908/education-ministry-talks-of-drop-in-indonesias-pisa-2022-score>, <https://www.polibatam.ac.id/en/indonesias-ranking-in-pisa-2022-has-increased-by-5-to-6-positions-compared-to-2018/>
- Rapor Pendidikan / AN 2024: <https://www.ntvnews.id/news/0140244/kemendikdasmen-rilis-rapor-pendidikan-2022-2024-capaian-literasi-dan-numerasi-meningkat-ketimpangan-masih-jadi-pr>
- TKA (kisi-kisi Bahasa Inggris, jadwal): <https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474902769689-Kenali-Tes-Kemampuan-Akademik-TKA>, <https://primakara.ac.id/blog/berita/tes-kemampuan-akademik-tka-sma-2025>
- TKA SD–SMP 2026 (hanya B. Indonesia & Matematika; wacana 2027): <https://www.medcom.id/pendidikan/news-pendidikan/VNxAJgab-tka-sd-smp-2026-hanya-menguji-mapel-bahasa-indonesia-dan-matematika-ini-alasannya>, <https://www.kompas.com/edu/read/2026/05/21/142657571/tka-sd-smp-2027-bakal-tambah-mapel-ujian-ipa-dan-bahasa-inggris-benarkah>
- Beban kerja guru (Permendikdasmen 11/2025): <https://tirto.id/aturan-beban-kerja-guru-2025-dan-kegiatannya-hd9Q>, <https://guruinovatif.id/artikel/aturan-beban-kerja-guru-terbaru-2025-durasi-kegiatan-dan-tugas-tambahan-berdasarkan-permendikdasmen-no-11>
- Pembelajaran mendalam: <https://www.tempo.co/politik/bedah-deep-learning-yang-diterapkan-mulai-tahun-ajaran-2025-2026-2049737>
- Pembatasan HP di sekolah: <https://www.cnbcindonesia.com/lifestyle/20251202155500-33-690417/mulai-2026-siswa-tak-boleh-bawa-hp-smartwach-ke-sekolah>, <https://bangka.tribunnews.com/news/1691137/aturan-baru-penggunaan-hp-di-sekolah-2026-ini-ketentuan-kemendikdasmen>
- SKB 7 Menteri AI & teknologi digital: <https://www.menpan.go.id/site/berita-terkini/berita-daerah/pemerintah-terbitkan-skb-tujuh-menteri-tentang-pemanfaatan-ai-dan-teknologi-digital-di-dunia-pendidikan>
- Kekhawatiran contek AI: <https://infokomputer.grid.id/read/123888227/survei-guru-cemas-penggunaan-chatgpt-bikin-siswa-tak-berpikir-kritis?page=all>
- Kesenjangan akses digital 3T: <https://journalwbl.com/index.php/jupensal/article/view/542>
- Kecemasan berbicara bahasa Inggris (SMP): <https://repository.ub.ac.id/id/eprint/197057/>, <https://www.researchgate.net/publication/372730355_Students'_Speaking_Anxiety_in_English_Classroom_Kecemasan_Berbicara_Siswa_di_Kelas_Bahasa_Inggris>
