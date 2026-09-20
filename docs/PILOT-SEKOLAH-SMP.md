# Pilot Sekolah SMP — Playbook Lengkap (Fase D, satu kelas)

Wewenang: OWNER. Status: rencana kerja, belum dieksekusi.
Basis bukti: `m025-337`, produksi di [fiezel.my.id](https://fiezel.my.id/).

Dokumen ini untuk owner yang **belum pernah melakukan pilot sekolah**. Urutannya sengaja
dibuat bisa diikuti dari atas ke bawah tanpa perlu tahu istilah edtech.

---

## 0. Kesimpulan lebih dulu

**Produknya siap untuk pilot satu kelas. Produknya BELUM siap untuk satu sekolah.**

Tiga angka yang menentukan kalimat itu:

| Angka | Nilai | Artinya untuk pilot |
|---|---|---|
| Kapasitas terpasang | **250 pengguna** (hard cap `MAX_USERS`) | Satu kelas (~30) aman. Satu sekolah (600–900 murid) **tidak muat** — jangan pernah menjanjikannya. |
| Konten inti bahasa Inggris | 46 lesson A1–A2 × 25 soal ≈ **1.150 soal** | Cukup untuk 6 minggu, bahkan berlebih. Ini mesin sebenarnya. |
| Modul Kurikulum Nasional Fase D | **8 bab / 62 soal** untuk SMP kelas 7–9 | ~16–23 soal per angkatan. Ini **alat guru menerbitkan tugas**, BUKAN mesin konten. |

### Konsekuensi strategis yang paling penting di seluruh dokumen ini

Kalau kamu menjual FIEZEL sebagai **"aplikasi Kurikulum Nasional"**, gurunya akan
menghabiskan seluruh materi kelas 8 dalam **dua minggu**, lalu pilotmu mati di minggu
ketiga dengan kesimpulan "kontennya kurang".

Kalau kamu menjualnya sebagai **"aplikasi bahasa Inggris adaptif yang tugasnya bisa
disambungkan ke Fase D"**, murid punya 1.150 soal untuk dikerjakan dan guru punya alat
untuk menyambungkannya ke RPP-nya. Ini yang benar, dan ini yang harus kamu ucapkan.

> Satu kalimat untuk kepala sekolah:
> **"Murid belajar bahasa Inggris adaptif setiap hari; gurunya bisa menerbitkan tugas yang
> menempel pada Fase D dan melihat hasilnya tanpa mengoreksi manual."**

---

## 0b. Mata pelajaran lain — JANGAN dipakai di pilot ini

FIEZEL punya tab **KelasKu** dengan **17 mata pelajaran** (Matematika, IPA, IPS,
Informatika, Pancasila, Agama, Fisika, Kimia, Biologi, Ekonomi, Geografi, Sosiologi,
Sejarah, PJOK, Seni Budaya, Bahasa Indonesia, Bahasa Inggris). Kelihatannya produk ini
sudah melayani seluruh sekolah. **Belum.**

### Angka sebenarnya

| | Bahasa Inggris | 16 mapel lainnya |
|---|---|---|
| Soal | **≈1.150** (adaptif A1–A2) + **62** kurikulum Fase D | **15 soal per mapel**, 255 total |
| Menyesuaikan kemampuan murid? | Ya | Tidak |
| Berubah menurut kelas? | Ya (kelas 7/8/9 beda bab) | **Tidak** |
| Berubah menurut kompetensi yang dipilih guru? | Ya (bab → sub-bab → fitur bahasa) | **Tidak** |

### Cacat yang membuatnya tidak layak dipamerkan

Kode kompetensi dan tingkat kelas yang dipilih guru **diabaikan sepenuhnya** oleh penyedia
soal 17-mapel. Kolam soalnya sama persis untuk kelas 1 SD sampai kelas 12 SMA.

Diuji langsung pada `synthesizeMapelQuestions()`:

```
kolam "Matematika · kelas 7 · Bilangan Bulat"      -> 15 soal
kolam "Matematika · kelas 11 · Kalkulus Turunan"   -> 15 soal
irisan keduanya: 15 dari 15  -> IDENTIK
```

Guru Matematika kelas 11 yang menerbitkan tugas "Kalkulus Turunan" mengirimkan ini ke
muridnya:

> *"Hasil dari operasi hitung campuran −15 + (−8) × 3 − (−20) adalah…"*
> *"Sebuah resep membutuhkan perbandingan tepung dan gula 5 : 2…"*

Itu materi kelas 7. Ini penyakit yang **sama persis** dengan cacat nomor satu yang sudah
ditutup untuk Bahasa Inggris di `handoffs/KURIKULUM-SEKOLAH-HANDOFF.md` ("soal tugas
kurikulum sebagian besar BUKAN dari kurikulum") — hanya saja di jalur 17-mapel belum
ditutup.

Jalur ini **bisa dijangkau guru di produksi**, bukan demo: tab Kurikulum → sumber
`mapel` → Terbitkan.

### Aturan untuk pilot

1. **Pilot dijalankan sebagai pilot Bahasa Inggris.** Satu guru bahasa Inggris, satu kelas.
2. **Jangan tunjukkan tab 17 mapel di rapat kepala sekolah.** Kalau kepala sekolah
   melihatnya, ia akan menanyakan Matematika — dan jawaban jujurnya akan merusak rapat.
3. **Kalau ditanya "mapel lain ada?"**, jawab apa adanya:
   > "Ada rangkanya, tapi isinya belum layak dipakai — baru 15 soal per mapel dan belum
   > menyesuaikan tingkat kelas. Yang sudah matang dan saya tawarkan hari ini hanya Bahasa
   > Inggris."
   Kalimat itu menyelamatkan kredibilitasmu; menyembunyikannya menghancurkannya di minggu
   kedua ketika ada guru yang mencoba.
4. **Minta guru pilot tidak membuka tab mapel** selama 6 minggu. Satu tugas Matematika
   salah tingkat sudah cukup membuat seluruh ruang guru menyimpulkan "aplikasinya
   ngawur".

### Kalau mau mapel lain benar-benar siap

Itu **proyek konten, bukan perbaikan kode**. Perkiraan kasar: 17 mapel × 6 tingkat ×
3 kompetensi × 8 soal ≈ **2.400 soal** yang harus ditulis dan diperiksa guru bidang studi.
Jangan dimulai sebelum pilot Bahasa Inggris memberi bukti bahwa produknya memang dipakai —
menulis 2.400 soal untuk produk yang ditinggalkan di minggu 3 adalah kerugian terbesar
yang bisa kamu buat sekarang.

---

## 1. Kenapa pilot sekolah gagal (baca ini sebelum apa pun)

Enam sebab, hampir selalu. Semuanya bisa dicegah sebelum hari pertama:

1. **Terlalu besar.** "Sekalian saja semua kelas 8." Satu guru yang antusias jauh lebih
   berharga daripada delapan guru yang disuruh atasan. Mulai dari SATU.
2. **Tidak ada pemilik di sekolah.** Kalau tidak ada satu nama yang merasa ini proyeknya,
   tidak ada yang mengingatkan murid membuka aplikasi.
3. **Tidak ada rencana perangkat.** Kamu berasumsi semua murid punya HP. Sering tidak.
4. **Izin orang tua tidak diurus.** Satu orang tua bertanya "data anak saya ke mana?" dan
   tidak ada jawaban tertulis → kepala sekolah menghentikan semuanya. Ini pembunuh
   tercepat, dan paling mudah dicegah (§6).
5. **Guru tidak dilatih.** Guru bingung di depan kelas → yang disalahkan produknya.
6. **Waktunya salah.** Mulai di minggu ujian/PTS = pilot mati sebelum jalan.

---

## 2. Bentuk pilot yang direkomendasikan

| Aspek | Keputusan | Alasan |
|---|---|---|
| Jumlah guru | **1** | Yang kamu cari adalah satu pendukung, bukan kepatuhan. |
| Jumlah kelas | **1** (kelas 8, ~30 murid) | Kelas 8 paling aman: kelas 7 masih adaptasi sekolah baru, kelas 9 sibuk ujian. |
| Durasi | **6 minggu** | 4 minggu terlalu pendek untuk melihat retensi; 8 minggu terlalu lama untuk komitmen pertama. |
| Biaya ke sekolah | **Rp 0** | Kamu sedang membeli bukti, bukan menjual lisensi. Katakan ini terang-terangan. |
| Yang kamu minta | 1 guru, 1 kelas, 1 jam pelatihan, izin sebar formulir ortu | Sekecil ini supaya "ya" jadi murah. |
| Yang kamu berikan | Aplikasi gratis + laporan akhir tertulis milik sekolah | Laporan itu yang membuat mereka merasa mendapat sesuatu. |

### Kelas 8 punya berapa materi kurikulum?

Semester 1: *Recount — Independence Day* (8 soal) + *Narrative — Fables* (8 soal).
Semester 2: *Signs, Notices & School Rules* (7 soal). **Total 23 soal.**

Itu cukup untuk **3–4 tugas kelas**, bukan untuk 6 minggu belajar. Enam minggu belajarnya
datang dari jalur adaptif A1–A2. Pastikan gurunya paham pembagian ini di hari pertama,
supaya dia tidak merasa dibohongi di minggu kedua.

---

## 3. Linimasa: dari hari ini sampai laporan akhir

### Minggu −1 — Persiapan (ini yang kamu kerjakan beberapa hari ke depan)

- [ ] **Cari GURUnya dulu, bukan kepala sekolahnya.** Guru bahasa Inggris yang kamu kenal,
      atau kenalan dari kenalan. Kepala sekolah yang didatangi tanpa guru pendukung akan
      menjawab "nanti saya pelajari" — dan itu artinya tidak.
- [ ] Tunjukkan **Demo Guru** ke guru itu: <https://fiezel.my.id/app/?teacher=preview>
      (papan langsung terisi 18 murid contoh; apa pun yang dia coba hilang saat tab ditutup).
- [ ] Kalau dia tertarik: minta dia ikut menemui kepala sekolah. Itu mengubah rapat dari
      "orang asing menawarkan aplikasi" menjadi "guru kami mau mencoba ini".
- [ ] Cetak: pitch deck, lembar privasi (§6), formulir izin (§6), panduan guru (§7).
- [ ] **Sensus perangkat** — tanyakan ke guru: dari 30 murid, berapa yang pegang HP Android
      sendiri? Ada wifi sekolah? Ini menentukan pilot jalan atau tidak (§5).

### Minggu 0 — Rapat + persiapan teknis

- [ ] Rapat kepala sekolah (20 menit, naskahnya di §4).
- [ ] Kalau setuju: sebar formulir izin orang tua. **Tunggu sampai kembali.** Jangan mulai
      sebelum terkumpul.
- [ ] Latih guru 1 jam (pakai §7). Minta dia **menerbitkan satu tugas di depanmu** — kalau
      dia belum pernah melakukannya sendiri, dia tidak akan melakukannya saat kamu pergi.
- [ ] Guru buat kelas → dapat **kode kelas 6 huruf**.
- [ ] Catat **angka awal**: berapa menit/minggu guru menyiapkan + mengoreksi tugas sekarang
      (tanya dan tulis). Tanpa angka ini, klaim "hemat waktu" tidak bisa dibuktikan.

### Minggu 1 — Pemasangan di kelas (jam pelajaran, jangan PR)

- [ ] Satu jam pelajaran, semua murid pasang bersama. Pemasangan yang dijadikan PR akan
      menghasilkan setengah kelas yang tidak pernah mulai.
- [ ] Murid buka <https://fiezel.my.id/app/> → pasang ke layar depan → onboarding 6 langkah
      → **tes penempatan CEFR 25 soal**.
- [ ] Murid masukkan kode kelas → guru menyetujui dari antrean.
- [ ] **Catat hasil tes penempatan seluruh kelas.** Ini garis dasar (baseline) kamu.
- [ ] Guru terbitkan tugas pertama hari itu juga, selagi semua orang masih di ruangan.

### Minggu 2–5 — Jalan

- [ ] Guru terbitkan **1–2 tugas per minggu**. Lebih dari itu membuat murid jenuh.
- [ ] Kamu cek angka tiap Jumat (§8) dan catat setiap insiden.
- [ ] **Telepon guru tiap minggu, 10 menit.** Bukan kirim pesan — telepon. Guru yang
      kesulitan hampir tidak pernah mengeluh lebih dulu; dia hanya berhenti memakai.

### Minggu 6 — Penutup

- [ ] Tes penempatan CEFR **diulang** (deskriptif saja — baca §8 sebelum mengklaim apa pun).
- [ ] Wawancara guru 30 menit + kuesioner singkat ke murid.
- [ ] Tulis laporan, serahkan ke sekolah, minta izin memakainya sebagai rujukan.

---

## 4. Naskah rapat kepala sekolah (20 menit)

**Menit 0–2 — Kenapa kamu di sini.**
> "Saya membangun aplikasi belajar bahasa Inggris bernama FIEZEL. Saya tidak menjual apa
> pun hari ini. Saya ingin satu guru dan satu kelas mencobanya selama enam minggu, gratis,
> dan saya akan serahkan laporan hasilnya ke Bapak/Ibu."

**Menit 2–7 — Tunjukkan, jangan jelaskan.** Buka demo guru **di HP-mu**, di depan mereka.
Tunjukkan tiga hal saja: papan kelas, menerbitkan satu tugas, layar hasil per murid.

**Menit 7–12 — Masalah yang diselesaikan.** Bicarakan dunia gurunya, bukan fiturmu:
> "Guru bahasa Inggris memegang 30 murid dengan kemampuan yang berbeda-beda, memberi soal
> yang sama ke semuanya, lalu mengoreksi 30 lembar dengan tangan. FIEZEL menyesuaikan soal
> per murid, mengoreksi otomatis, dan menunjukkan siapa yang tertinggal di bagian mana."

**Menit 12–16 — Jawab pertanyaan data sebelum ditanya.** Ini yang membuat kamu dipercaya:
> "Data lengkap murid tersimpan di HP murid, bukan di server saya. Yang sampai ke saya
> hanya **nama depan** dan ringkasan hasil — tanpa email, tanpa nomor HP, tanpa lokasi,
> tanpa jawaban mentah. Ini lembar privasinya, dan ini formulir izin orang tua."
> **Serahkan kertasnya saat itu juga.**

**Menit 16–20 — Minta yang kecil.**
> "Yang saya minta: satu guru, satu kelas, enam minggu, dan satu jam untuk melatih gurunya.
> Kalau tidak berjalan, hentikan kapan saja tanpa konsekuensi apa pun."

### Pertanyaan yang pasti muncul

| Pertanyaan | Jawaban jujur |
|---|---|
| "Berapa biayanya nanti?" | "Selama pilot nol. Sesudahnya saya belum menentukan harga — dan sekolah pertama tidak akan saya tagih atas pilotnya." |
| "Data anak-anak aman?" | Lihat §6. Tunjukkan kertasnya. Jangan mengarang. |
| "Kalau murid tidak punya HP?" | Lihat §5. **Jangan bilang "pasti bisa diatur"** kalau kamu belum tahu angkanya. |
| "Ini bikinan siapa?" | Jawab jujur bahwa kamu membangunnya sendiri. Itu kekuatan, bukan kelemahan — artinya perbaikan bisa cepat. |
| "Sudah dipakai sekolah mana?" | **"Belum. Sekolah Bapak/Ibu yang pertama."** Jangan pernah mengarang referensi. Tawarkan justru keistimewaan jadi yang pertama. |
| "Apa buktinya anak jadi lebih pintar?" | "Belum ada, dan saya tidak akan mengklaimnya. Pilot ini justru untuk mengukur apakah anak-anak memakainya dan apakah guru terbantu." Kejujuran ini yang membedakanmu dari vendor lain. |

---

## 5. Realitas perangkat — periksa SEBELUM menjanjikan apa pun

FIEZEL adalah PWA: jalan di browser HP Android/iOS, bisa dipasang ke layar depan, dan
**bekerja offline setelah terpasang**. Tidak perlu Play Store, tidak perlu akun, tidak
perlu email.

Yang tetap harus kamu pastikan ke guru sebelum rapat:

- [ ] Dari ~30 murid, berapa yang punya HP sendiri? **Kalau di bawah 60%, pilot jangan
      dipaksakan** — pindah ke kelas lain atau pakai lab komputer.
- [ ] Ada wifi sekolah? Unduhan pertama butuh internet; sesudahnya bisa offline.
- [ ] Apakah sekolah melarang HP? Kalau ya, itu **kebijakan**, bukan masalah teknis —
      selesaikan dengan kepala sekolah di rapat, jangan di hari pemasangan.

---

## 6. Data, privasi, dan izin orang tua

Ini bagian yang paling sering diremehkan dan paling cepat membunuh pilot. Kabar baiknya,
posisi FIEZEL di sini **kuat dan benar**.

### Apa yang benar-benar terjadi pada data

| Data | Di mana | Sampai ke servermu? |
|---|---|---|
| Riwayat belajar lengkap (jawaban, waktu, penguasaan, miskonsepsi) | **HP murid** (localStorage) | **Tidak pernah.** |
| Nama depan murid (maks 24 huruf) + ringkasan hasil per skill | Papan guru + server kelas | Ya — hanya ini. |
| Nama lengkap, email, nomor HP, NISN, lokasi, jawaban mentah | — | **Tidak dikumpulkan sama sekali.** |
| Statistik pemakaian | Server | Hanya hitungan agregat, tanpa identitas. |

Menghapus data = murid menghapus data situs / uninstal aplikasi. Tuntas, tanpa perlu
meminta izin siapa pun. Latar teknis lengkapnya ada di [`BRAIN-DATA-PRIVACY.md`](BRAIN-DATA-PRIVACY.md).

### Yang WAJIB kamu lakukan

**UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi** mewajibkan persetujuan
**orang tua/wali** untuk pemrosesan data anak. Murid SMP adalah anak. Jadi:

- [ ] Sebar **formulir izin** ([`pilot/IZIN-ORANG-TUA.md`](pilot/IZIN-ORANG-TUA.md)) sebelum murid memasang.
- [ ] Serahkan **lembar privasi** ([`pilot/LEMBAR-PRIVASI-SEKOLAH.md`](pilot/LEMBAR-PRIVASI-SEKOLAH.md)) ke kepala sekolah.
- [ ] **Murid tanpa izin kembali = tidak ikut.** Tanpa pengecualian, tanpa "nanti menyusul".
      Satu pelanggaran di sini membatalkan seluruh kredibilitasmu.
- [ ] Minta murid memakai **nama depan saja** saat mendaftar. Kalau ada dua "Rizki",
      pakai "Rizki A" — jangan nama lengkap.

---

## 7. Pelatihan guru

Satu jam, tatap muka, dan **guru yang memegang HP-nya, bukan kamu**. Materinya:
[`pilot/PANDUAN-GURU.md`](pilot/PANDUAN-GURU.md) — cetak, jangan kirim PDF saja.

Sebelum kamu pulang, guru harus sudah **berhasil sendiri**: membuat kelas, menerima satu
murid dari antrean, menerbitkan satu tugas, dan membuka layar hasil. Kalau salah satu belum
pernah dia lakukan dengan tangannya sendiri, anggap dia belum terlatih.

---

## 8. Apa yang diukur — dan apa yang HARAM diklaim

### Yang boleh diklaim

| # | Metrik | Cara mengukur | Target |
|---|---|---|---|
| 1 | **Pemasangan** | murid terpasang ÷ murid berizin | ≥ 80% |
| 2 | **Pemakaian aktif** | murid dengan ≥3 sesi/minggu | ≥ 60% di minggu 2 |
| 3 | **Retensi minggu 4** | masih aktif di minggu 4 ÷ terpasang | **≥ 50%** |
| 4 | **Penyelesaian tugas** | tugas selesai ÷ tugas terbit | ≥ 70% |
| 5 | **Waktu guru** | menit/minggu menyiapkan + mengoreksi, minggu 0 vs 6 | turun |
| 6 | **Ketepatan penempatan** | guru menilai level CEFR tiap murid "masuk akal?" | ≥ 80% setuju |
| 7 | **Insiden** | catat tiap kegagalan saat dipakai di kelas | 0 yang menghentikan pelajaran |

**Metrik #3 adalah metrik terpenting.** Aplikasi belajar mudah dipasang dan mudah
ditinggalkan. Kalau retensi minggu 4 di bawah 30%, produkmu belum siap dan tidak ada
angka lain yang bisa menutupinya.

### Yang HARAM diklaim

**Jangan pernah mengatakan pilot ini membuktikan murid jadi lebih pandai.** Alasannya
aritmetika, bukan kerendahan hati: mendeteksi efek belajar berukuran sedang butuh **~392
murid per kelompok**, sementara kapasitas aplikasi 250 dan pilotmu 30 — tanpa kelompok
pembanding. Analisisnya tertulis di [`BRAIN-EVOLUTION-DECISIONS.md`](BRAIN-EVOLUTION-DECISIONS.md).

Tes penempatan ulang di minggu 6 boleh **dilaporkan sebagai angka deskriptif**, dengan
kalimat ini menempel padanya:

> "Angka ini menggambarkan kelas tersebut selama enam minggu. Tanpa kelas pembanding,
> perubahan ini tidak dapat dikaitkan secara kausal dengan FIEZEL."

Kelihatannya melemahkan. Sebenarnya sebaliknya: kepala sekolah dan dinas sudah sering
mendengar klaim yang tidak bisa dipertanggungjawabkan. Orang yang menyebutkan sendiri batas
buktinya adalah orang yang angka-angkanya layak dipercaya.

---

## 9. Kapan pilot dihentikan

Sepakati ini **sebelum mulai**, supaya penghentian bukan kegagalan melainkan prosedur:

- Retensi minggu 2 **< 25%** → hentikan, cari tahu sebabnya, ulangi nanti.
- Guru berhenti menerbitkan tugas 2 minggu berturut-turut → hentikan, wawancara.
- Insiden yang menghentikan jam pelajaran **≥ 2 kali** → hentikan, perbaiki dulu.
- Ada keberatan orang tua yang tidak bisa kamu jawab dengan lembar privasi → hentikan hari
  itu juga, selesaikan, baru lanjut.

---

## 10. Utang yang diketahui (jujur, sebelum ada yang menemukannya)

| Utang | Dampak ke pilot | Rencana |
|---|---|---|
| Kapasitas 250 pengguna | Tidak ada untuk 1 kelas. **Fatal kalau menjanjikan 1 sekolah.** | Jangan dijanjikan. Titik. |
| Kurikulum Fase D hanya 62 soal | Guru bisa kehabisan materi kurikulum di minggu 3 | Jelaskan pembagian peran di hari pertama (§0). Tambah soal setelah pilot. |
| Belum ada bukti beban 30 murid serentak | Sinkronisasi kelas saat satu jam pelajaran belum diuji | Uji di minggu 1 dengan guru hadir; catat sebagai insiden kalau gagal. |
| Belum ada sekolah rujukan | "Sudah dipakai di mana?" | Jawab jujur: belum ada. Tawarkan keistimewaan sekolah pertama. |
| Belum ada saluran dukungan resmi | Guru bingung jam 9 malam | Berikan nomor WhatsApp pribadimu selama pilot. Enam minggu, satu kelas — masih sanggup. |

---

## 11. Daftar periksa sebelum hari pertama

- [ ] Guru pendukung sudah ada dan sudah melihat demo
- [ ] Kepala sekolah setuju (lisan cukup untuk pilot gratis)
- [ ] Formulir izin orang tua **kembali** dan terkumpul
- [ ] Lembar privasi diserahkan ke sekolah
- [ ] Guru sudah dilatih dan berhasil menerbitkan tugas sendirinya
- [ ] Kode kelas dibuat dan dicatat
- [ ] Sensus perangkat selesai, ≥60% murid punya HP
- [ ] Angka awal waktu guru sudah dicatat
- [ ] Nomor WhatsApp dukungan diberikan ke guru
- [ ] Tanggal mulai **bukan** minggu ujian/PTS
