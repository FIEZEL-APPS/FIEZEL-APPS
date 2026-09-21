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
| **6 — satu dasbor** | T1–T9 (audit sisi guru 21 Sep 2026) | **SELESAI** · build `m025-357` |

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

18. **Kurikulum & Kompetensi hidup DI DALAM dasbor KelasKu, bukan sebagai butir nav.**
    Instruksi owner 21 September 2026. Butir nav kedelapan (`tg-nav-curriculum`) dan
    kembarannya di nav ponsel DICABUT, beserta view `curriculum` di peta views. Sistemnya
    menjadi tab `kurikulum` di hub KelasKu guru. Memasang lagi butir nav itu berarti dua
    pintu ke sistem yang sama — salah satunya akan menyimpang.
    Dijaga `tests/kelasku-kurikulum-dashboard-test.js` (A1–A2) dan
    `tests/curriculum-console-gate-test.js`.

19. **Pembagiannya: hub menyediakan TEMPAT, shell menyediakan ISI.** FZEngine, alamat
    backend, keadaan muat, dan ketiga penyemai tetap milik `fiezel-teacher-shell.js`.
    Yang menyeberang lewat `env.kurikulum` hanya tiga fungsi — `siap`, `panel`, `buka`.
    Menyalin mesinnya ke `fiezel-class-hub.js` melahirkan salinan kedua yang akan
    menyimpang. Tombol di panel memakai `data-tg` dan itu BUKAN kelalaian: hub dipasang
    di dalam DOM shell (`#tgClassHub`), jadi pengirim aksi shell sudah menanganinya.

20. **Pemuatan dipicu KETUKAN TAB, tidak pernah dari perender.** `rerender()` dipanggil
    dari setiap sinkron latar yang selesai; memicu permintaan jaringan dari perender
    berarti menembaki backend kurikulum sepanjang guru membuka tab itu. Dikunci gerbang
    (D4) yang mengecat ulang tiga kali lalu menuntut `buka()` tetap terpanggil sekali.

21. **Tab Kurikulum bekerja TANPA kelas aktif, dan itu disengaja.** Menyemai bank,
    membaca kompetensi, dan menghitung kedalaman bank tidak menyentuh satu pun kelas.
    Gerbang render shell karena itu meloloskan `st.view === 'hub'`. Layar pembuka guru
    baru tidak berubah — bawaan `st.view` tetap `briefing`.

22. **Kedalaman bank per kompetensi dicocokkan lewat ID SIMPUL, tidak pernah lewat kode.**
    Aturan yang sama dengan kontrak §1, alasan yang sama: kode dipakai bersama lintas
    mapel dan tingkat. Batas halaman 1000 DINYATAKAN di layar, dan hitungan tidak pernah
    tergambar untuk mapel yang tidak cocok (`bankDepthSubject`).

23. **Cakupan per kelas TIDAK boleh masuk panel ini.** `/coverage` dan
    `/braincore/tp-detail` menuntut `class_id` backend kurikulum; kelas di dasbor ini
    kelas KelasKu lokal. Ini kasus yang sama dengan "Yang BELUM selesai dari X4" di bawah.
    Dikunci gerbang (C4).

24. **Ikon dipanggil lewat pembantu `icon('nama')`, dan pembantu itu punya titik buta.**
    `lucide.min.js` adalah subset kurasi tangan; `createIcons()` melewati nama yang tidak
    dikenal tanpa error, menyisakan `<i>` KOSONG. Sampai m025-357,
    `tests/lucide-icon-coverage-test.js` hanya membaca `data-lucide="literal"`, sehingga
    98 pemanggilan di class-hub dan teacher shell tidak pernah diperiksa — 30 di antaranya
    memang kosong, termasuk `brain`, ikon tab Braincore. Gerbangnya kini ikut memindai
    `icon('nama')`, dengan DUA himpunan penyelesaian: class-hub terhadap subset lucide
    saja, teacher shell terhadap subset + registry inline `fiezel-teacher-icons.js`.
    Menyamakan keduanya melahirkan merah palsu. Ikon baru wajib ditambahkan ke subset
    di commit yang sama dengan pemanggilnya.

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

---

## Gelombang 6 — satu dasbor (`m025-357`)

Lahir dari audit sisi guru 21 September 2026,
`reports/AUDIT-UIUX-KELASKU-GURU-2026-09-21.md` (9 temuan). Perintah owner: cabut panel
Kurikulum & Kompetensi dari dasbor, integrasikan sistemnya ke halaman dasbor KelasKu,
tidak boleh ada yang kurang — **sisi guru saja, sisi murid dipertahankan**.

- ✅ **T1** — tiga penyemai (`seed-english`/`seed-mapel`/`seed-soal`) punya tombolnya.
  Penanganannya dan `runSeed*()` sudah ada sejak lama dengan **nol** tombol di Ruang Guru
  yang memanggilnya, sementara naskah `guru.kurikulum-sumber-lokal` menyuruh guru menekan
  kartu penyemai yang tidak ada di layar itu. Status dibaca lebih dulu; gagal-baca
  dibedakan dari belum-tersemai; sibuk per-kartu.
- ✅ **T2** — 14 kelas CSS yang dipancarkan perender kurikulum sejak m025-294 tanpa satu
  pun aturan akhirnya ditulis, berikut penumpukan baris kompetensi di ponsel.
- ✅ **T3** — `t()` di teacher shell menerima `params`; kalimat berlubang di jalur cadangan
  berhenti mencetak kurung kurawalnya.
- ✅ **T4** — setiap kompetensi membawa kedalaman banknya (kontrak §22).
- ✅ **T5** — satu tombol Muat Ulang menyegarkan ketiga sumber panel.
- ✅ **T6** — gagal-muat, pohon kosong, dan sedang-memuat dibedakan tegas.
- ✅ **T7** — `st.view === 'curriculum'` yang tersimpan dimigrasikan ke hub + tab.
- ✅ **T8** — tab Kurikulum bekerja tanpa kelas aktif (kontrak §21).
- ✅ **T9** — 26 glyph ditambahkan ke subset lucide (92 → 118) dan titik buta gerbang
  ikon ditutup (kontrak §24). 30 ikon kosong di KelasKu murid **dan** guru, hilang.

Gerbang baru: `tests/kelasku-kurikulum-dashboard-test.js` (21 assert, red-proof 4 kerusakan),
terdaftar di `quality.yml`. `tests/lucide-icon-coverage-test.js` dan
`tests/curriculum-console-gate-test.js` diperluas.

### Langkah berikutnya

F1 penuh masih menunggu pekerjaan KONTEN, bukan kode: 15 unit statis
`fiezel-teacher-curriculum.js` perlu padanan TP server sebelum bukti misi in-app boleh
mengalir ke cakupan guru. Sampai itu ada, kontrak §23 berlaku — cakupan per kelas tetap
di konsol penuh.
