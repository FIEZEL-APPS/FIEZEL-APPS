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
| **4 — alat, bukan rapor** | F3, F4, F6, K3, K5, K6, K11, K13 | **SELESAI** · `m025-349` |
| **5 — jangkauan** | A1–A5, G2–G4, G6–G10, K12, F7, F8, F10, F9 | **SELESAI** · build `m025-355` (seluruh butir gelombang + 5 gerbang baru terdaftar di CI) |

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
   Fase D–F. Baris ruang lingkup di `curriculumCard()` turun sendiri begitu mapel lain
   benar-benar menyusul — jangan dihapus sebelum itu.

   Alasannya berubah di `m025-356`, kewajibannya tidak. Sampai rilis itu baris ini
   dibenarkan oleh tetangganya: panel "Kurikulum Merdeka (17 Mapel)" duduk persis di
   sebelahnya dan menjanjikan tujuh belas mapel, jadi kartu di sampingnya wajib menyebut
   bahwa isinya satu mapel. Panel itu kini **DIHAPUS TOTAL** atas instruksi owner — ia
   memenuhi tab KelasKu dan mendorong konten berguna ke bawah, sementara kebanyakan
   barisnya hanya berbunyi "Menunggu penugasan". Yang menggantikannya di tab KelasKu
   adalah satu baris ringkas jumlah guru terdaftar (`class-teachers-line`) plus tombol
   lompat ke tab Tugas (`class-jump-tugas`), tempat kartu filter per mapel memang berada.

   Baris ruang lingkup TETAP WAJIB tanpa panel itu: janji tujuh belas mapel tidak hilang
   bersama panelnya. Ia hanya pindah ke tempat lain yang masih dilihat murid — daftar
   mapel di kartu filter tab Tugas, dan hitungan guru mapel di baris ringkas tadi. Murid
   yang membuka Misi Belajar untuk mencari Matematika tetap berhak tahu sebelum mengetuk.

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

13. **Stempel memudar berjadwal, dan meluruh BUKAN gagal.** `JARAK_ULANG = [7, 21, 60]`
    hari, melebar setiap kali bab itu tuntas lagi; gagal mematahkan runtun sehingga
    jaraknya kembali ke awal. `perluUlang` menandai tanpa mencabut `tuntas`. Angka-angka
    itu bukan hasil kalibrasi FIEZEL dan tidak berpura-pura begitu — ia jarak yang lazim
    dipakai pengulangan berjarak.

14. **`streak` sudah dinaikkan saat `jadwalBerikutnya()` dipanggil.** Karena itu ada `-1`
    di dalamnya. Tanpa itu, tuntas PERTAMA langsung dijadwalkan 21 hari — jarak yang
    pantas untuk bab yang sudah dua kali tuntas.

15. **Sub-bab dicatat dari percobaan TERAKHIR, bukan terbaik.** Yang ingin dijawab layar
    "latih yang belum kuat" adalah "apa yang masih goyah SEKARANG"; sub-bab yang dulu benar
    lalu kini salah justru yang paling perlu diulang. Ini berbeda dengan stempel bab, yang
    memang memakai yang terbaik — dan perbedaannya disengaja.

16. **Penyaringan sub-bab yang menyisakan nol soal jatuh kembali ke bab penuh.** Sesi kosong
    lebih buruk daripada latihan yang terlalu banyak.

17. **Target mingguan selalu menyebut ALASAN, dan mendahulukan pengulangan.** Kartu yang
    berkata "kerjakan ini" tanpa mengatakan kenapa hanya memindahkan pilihan, tidak
    menghapusnya. Bab yang meluruh didahulukan karena meluruhnya tidak terlihat sampai ia
    benar-benar hilang.

## Langkah berikutnya (roadmap)

Gelombang 5 — **jangkauan**. Butir teknisnya sudah selesai dan terkunci gerbang
`tests/kurikulum-jangkauan-test.js` (terdaftar di `quality.yml` sejak `m025-351`):

- ✅ **A1–A5** — kebocoran naskah Indonesia di zona kurikulum (kosakata zona masuk
  `ID_WORDS` di `tests/th-ui-leak-test.js`), tanggal mengikuti locale, naskah tenggat
  dan label fase lewat `t()`, `role="tablist"` ber-`aria-selected` + tabpanel.
- ✅ **G2–G4** — matriks cakupan dibungkus gulir di ponsel, drawer/modal bisa Escape +
  focus trap + scrim tombol, `prefers-reduced-motion` sendiri di `console.css`.
- ✅ **G6–G10** — judul asesmen mengikuti mapel aktif, JSON mentah pensiun dari layar
  guru, blueprint C1–C6 sejajar form soal, batas 60 bank berpenanda, cadangan katalog
  lokal berpenanda asal data.
- ✅ **K12** — layar kurikulum adalah lapisan `FiezelBackNav` (pushLayer + dismiss),
  bukan modal kertas.
- ✅ **F8+F10** — tab Wali Kelas (agregat `/coverage` per mapel, spanduk tertinggal) dan
  tab Papan Kelas (grid TP × murid dari `/tp-detail`, sel tombol ber-aria-label).
- ✅ **F9 fase 1** — misi luring sesuai keputusan owner (penuh-luring bertahap, sesi
  terakhir + konfirmasi, seluruh bank teks otomatis).

Status build `m025-351`: **F7 selesai** — modul bersama `features/curriculum/rapor-share.js`
merender dokumen yang sama untuk guru (drawer paspor konsol) dan murid (kartu rapor di
paspor Belajar); format PNG via Canvas + Cetak/PDF via `window.print`, render sisi klien
sesuai keputusan owner; 17 kunci `kurikulum.rapor-*` baru lahir dwibahasa (id+th);
gerbang `tests/kurikulum-rapor-ortu-test.js` (10 asersi) terdaftar di `quality.yml`.

Status build `m025-354`: **F9 fase 1 selesai** — precache shell misi (misi.html, console.css,
learning-mission.js, rapor-share.js; bank unit sudah di-cache), pintu luring di layar masuk
(hanya bila ada sesi terakhir bernama), sesi dibekukan saat masuk + dilupakan saat keluar,
runner lokal 6 butir acak dari 23 unit dengan umpan balik kunci, antrean `question_answered`
idempoten (event_id stabil, payload bertanda offline:true) yang terkirim otomatis saat
online/kembali-sinyal/tombol; layar menyatakan antrean belum masuk bukti penguasaan
(penguasaan tetap dihitung server — fase 2). 21 kunci `luring-*`/`antre-*` dwibahasa;
gerbang `tests/kurikulum-luring-test.js` (8 asersi) terdaftar di `quality.yml`.

Status `m025-355`: **F9 fase 2 selesai** — `POST /api/learning/offline-batch`: validasi ketat
(200/batch, event_id + cap waktu waras), hanya murid pemilik tiket (guru 403), kompetensi
dipetakan server via `backend/offline_static_map.py` (31/214 kecocokan prompt EKSak,
generator `tools/build-offline-map.mjs`), `bc.mark_exposure` untuk yang terpetakan,
skor klien disimpan berlabel `client_correct` dan TIDAK PERNAH menyentuh
grade/diagnose/apply_attempt (dikunci gerbang + 4 pytest backend: 403, 400, idempoten,
tanpa-gerakan-mastery, unmapped-terekam). Klien mengirim batch dulu, jatuh ke `/events`
warisan bila backend tua (404). 4 gerbang luring terdaftar di `quality.yml`.

Status build `m025-352`: **F8+F10 selesai sepaket** — tab Wali Kelas (`vWali`: agregat
`/coverage` per subject_id untuk 21 pilihan mapel nyata, antrean berbatas 4 dengan
kemajuan jujur, spanduk mapel tertinggal, gagal-muat dibedakan dari tanpa-data) dan tab
Papan Kelas (`vPapan`: grid TP × murid dari `/braincore/tp-detail` + roster, sel berupa
tombol ber-aria-label M/B/R/E/· dengan legenda kata, klik sel membuka drawer intervensi,
TP dibatasi 40 dengan penanda); tanpa endpoint baru; 21 kunci `wali-*`/`papan-*` lahir
dwibahasa; gerbang `tests/kurikulum-wali-papan-test.js` (10 asersi) terdaftar di
`quality.yml`.

Status `m025-351`: butir A1–A5, G2–G4, G6–G10, K12, dan F7 **selesai** (lihat tabel Status,
`tests/kurikulum-jangkauan-test.js`, dan `tests/kurikulum-rapor-ortu-test.js`). A1 memakai
prinsip yang sama dengan gelombang m025-314/m025-290: kosakata zona kurikulum masuk
`ID_WORDS` penjaga `th-ui-leak-test`, dan pukulan sampingan di zona Merdeka yang di-SK-kan
owner 7 September 2026 (konsol guru, misi Belajar, bank konten, layar guru) naik
anggarannya di `ALLOWLIST` dengan alasan tertulis, bukan pelonggaran diam-diam.
Gelombang 5 kini **SELESAI seluruhnya** (F9 fase 1 = butir terakhir); fase 2 F9 (pipa
penilaian bukti luring di backend) adalah pekerjaan backend di luar pintu klien ini.
