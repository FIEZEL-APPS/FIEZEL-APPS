# KelasKu — Kurikulum & Kompetensi: perbaikan lima gelombang

Otoritas: **OWNER**. Dokumen ini adalah kontrak berjalan untuk program perbaikan yang lahir
dari audit 20 September 2026,
`reports/AUDIT-UIUX-KELASKU-KURIKULUM-KOMPETENSI-2026-09-20.md` (35 temuan, 10 usulan fitur).
Auditnya sendiri tetap menjadi sumber rinci; yang ada di sini hanya keadaan sekarang, kontrak
yang wajib dijaga, dan langkah berikutnya.

Perintah OWNER (20 September 2026): kerjakan **seluruh** 35 temuan dan 10 fitur, bertahap
mengikuti lima gelombang di laporan audit.

## Status

| Gelombang | Isi | Keadaan |
|---|---|---|
| **1 — kejujuran layar** | K1, K2, K4, K8, K9, K14, G5, F5 (jalan cepat) | **SELESAI** · `m025-349` |
| **2 — pintu** | X2, X3, K10, G1 | **SELESAI** · `m025-349` |
| **3 — satu buku kompetensi** | X4, X5, F1 (sebagian) | **SELESAI** · `m025-349` |
| **4 — alat, bukan rapor** | F3, F4, F6, K3, K5, K6, K11, K13 | belum |
| **5 — jangkauan** | A1–A5, G2–G4, G6–G10, K12, F7–F10 | belum |

Di luar gelombang, sudah mendarat di program yang sama:
`tests/modal-assign-teacher-ux-test.js` didaftarkan di `quality.yml`, dan 32 kunci hantu
Ruang Guru didaftarkan dwibahasa (`m025-350`) — dua-duanya sudah merah di `main` sebelum
program ini dimulai.

## Kontrak yang harus dijaga

1. **Bukti penguasaan dikunci pada ID UNIT, tidak pernah pada genre.** Genre dipakai
   bersama lintas tingkat kelas — "Procedure Text" ada di Kelas 7 dan Kelas 9, "Narrative
   Text" di Kelas 8 dan Kelas 10. Mencocokkan lewat genre berarti mencap bab yang belum
   pernah dibuka murid (temuan K1). `tests/kelasku-paspor-kompetensi-test.js` menjaga ini
   dan sudah di-red-proof.

2. **Buku paspor (`fiezel-class-passport-v1`) TIDAK BOLEH dipotong.** Riwayat kiriman
   (`fiezel-class-submissions-v1`) memang dipotong `slice(-30)` dan itu disengaja — ia
   hanya memberi makan daftar "Selesai" di layar Tugas. Menyatukan keduanya kembali
   mengembalikan temuan K2: stempel yang hilang diam-diam.

3. **Tugas guru bukan bukti unit kurikulum.** Migrasi paspor sengaja hanya membaca kiriman
   `misi_<unitId>`. Membuka jalur dari tugas guru ke stempel unit adalah K1 lewat pintu
   belakang.

4. **Stempel memakai percobaan TERBAIK, layar menyebut yang TERAKHIR.** Kode lama membaca
   "terbaik" sementara menulis "terakhir", sehingga tombol "Ulangi Misi" diam-diam mencabut
   stempel. Kalau salah satu sisi diubah, ubah keduanya.

5. **Keadaan kosong tidak boleh dikarang.** Nol tugas bukan "Lengkap"; kelas tanpa guru
   mapel tidak memajang mapel contoh; daftar unit kosong berkata bahwa ia gagal memuat.
   Layar yang diam saat rusak membuat murid menyalahkan dirinya sendiri.

6. **Ruang lingkup disebut sebelum diketuk.** Misi Belajar hari ini hanya Bahasa Inggris
   Fase D–F sementara panel di sebelahnya menjanjikan 17 mapel. Baris ruang lingkup di
   `curriculumCard()` turun sendiri begitu mapel lain benar-benar menyusul — jangan
   dihapus sebelum itu.

7. **Setiap naskah lahir dwibahasa.** Berlaku penuh di program ini; lihat CLAUDE.md dan
   `docs/handoffs/I18N-TH-PARITY-HANDOFF.md`.

8. **Pintu digantung pada ALAMAT BACKEND, bukan pada bendera atau pada
   `kurikulumTersedia()`.** `kurikulum.html` dan `misi.html` dua-duanya mati tanpa backend;
   `kurikulumTersedia()` juga benar ketika hanya modul lokal yang ada, jadi memakainya
   sebagai syarat mengembalikan bug m025-296 — guru menekan tautan lalu menemukan halaman
   mati. Syarat yang benar: `konsolKurikulumSiap()` / `misiAdaptifSiap()`.

9. **Konsol guru memotret-lalu-memulihkan isian saat mengecat ulang.** `render()` menulis
   ulang `app.innerHTML` seutuhnya dan dipanggil dari setiap permintaan latar yang selesai.
   `potretIsian()`/`pulihkanIsian()` adalah yang membuat kotak "Tempel Banyak Soal" aman.
   Menghapusnya mengembalikan G1.

10. **Kotak masuk kurikulum membawa KABAR, bukan ISI.** `fiezel-curriculum-inbox.js`
    sengaja TIDAK menulis ke `fiezel-learner-assignments-v1`. Soal asesmen kurikulum hidup
    di server dan dipilih adaptif per murid saat sesi berjalan; menyalinnya menjadi tugas
    lokal membuat kartu yang, begitu diketuk, membuka runner yang tidak menemukan satu soal
    pun. Kartunya menyerahkan pengerjaan ke `misi.html`.

11. **Kotak masuk itu gagal dengan diam.** Backend kurikulum adalah layanan terpisah yang
    bisa mati. Tab Tugas berisi tugas dari jalur KelasKu dan tidak boleh pecah karenanya:
    setiap kegagalan berakhir sebagai daftar kosong, dan daftar kosong berarti bagiannya
    tidak dicetak sama sekali.

12. **`doneAssign` hanya untuk tugas yang benar-benar dikirim guru.** Ia adalah persis yang
    terkirim ke guru (lihat `tutorCode`: ruas `assign`). Misi mandiri memakai
    `selfDirected: true` dan tidak masuk ke sana — peta skill dan jurnal tetap terisi; yang
    tidak terjadi hanyalah pengakuan palsu atas penugasan.

## Yang BELUM selesai dari X4, dan kenapa

Separuh X4 yang lain — **bukti murid dari misi in-app mengalir ke cakupan guru** — sengaja
TIDAK dikerjakan, dan bukan karena kehabisan waktu.

Misi in-app berjalan di atas 15 unit statis `fiezel-teacher-curriculum.js`. Unit-unit itu
tidak punya `tp_id` maupun `competency_id` server; matriks cakupan guru dikunci pada TP dan
pada butir soal yang hidup di bank server. Tidak ada pemetaan jujur di antara keduanya, dan
mengarang pemetaan berarti mengirim bukti palsu ke layar yang dipakai guru untuk memutuskan
siapa yang perlu remedial. Bukti palsu lebih buruk daripada tidak ada bukti.

Jalan keluarnya bukan jembatan, melainkan arah: pekerjaan kurikulum yang BERBUKTI dikerjakan
lewat `misi.html`, yang memang menulis ke buku server; paspor lokal tetap jadi catatan
latihan mandiri. Pintu di Gelombang 2 (X3) dan kotak masuk di Gelombang 3 (X4) dua-duanya
mendorong ke arah itu. F1 penuh baru bisa ditutup kalau unit statis itu diberi padanan TP
server — pekerjaan konten, bukan pekerjaan kode.

## Langkah berikutnya (roadmap)

Gelombang 4 — **alat, bukan rapor**: F3 (paspor per sub-bab + "latih yang merah saja"),
F4 (retensi & jadwal ulang), F6 (kartu "Target minggu ini"), K3, K5, K6, K11, K13.
Sesudahnya Gelombang 5 (jangkauan): A1–A5, G2–G4, G6–G10, K12, F7–F10.
