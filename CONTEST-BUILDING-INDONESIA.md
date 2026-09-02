# Building Indonesia (Emergent) — Rencana Submission FIEZEL

**Status: DRAFT SIAP PAKAI.** Disusun 2 September 2026. Deadline submission
**10 September 2026, 23:59 WIB**; upvote ditutup **15 September 2026**.
Hanya **200 submission dengan upvote terbanyak** yang masuk penjurian.
Hadiah: 100 pemenang berbagi Rp800 juta.

Dokumen ini berisi empat hal, berurutan sesuai cara memakainya:

1. **Gerbang 0** — satu hal yang harus Owner cek sendiri sebelum apa pun dikerjakan.
2. **Positioning** — kenapa yang disubmit adalah *FIEZEL untuk Sekolah*, bukan FIEZEL utuh.
3. **Naskah submission** — siap tempel, bahasa Indonesia dan Inggris.
4. **Rencana B** — spesifikasi versi ramping kalau ternyata wajib dibangun di Emergent.

Semua angka di dokumen ini diambil dari berkas data repo pada commit ini, bukan dari
ingatan atau dari README (lihat §8 Lampiran angka). Kalau ada klaim yang tidak bisa
ditunjuk ke berkasnya, klaim itu dicoret, bukan dipoles.

---

## 1. Gerbang 0 — yang harus dicek Owner lebih dulu

**Pertanyaan: apakah submission WAJIB berupa aplikasi yang dibangun di app.emergent.sh?**

Kontesnya dipromosikan sebagai "selesaikan masalah bisnis nyata dengan AI builder
Emergent, tanpa perlu koding". Kalau kalimat itu adalah *syarat*, bukan sekadar ajakan,
maka FIEZEL apa adanya **tidak bisa disubmit** — ia vanilla JS, PWA, service worker,
dan neural voice lokal, dibangun di luar Emergent.

Konsekuensinya bercabang, dan cabangnya menentukan seluruh sisa pekerjaan:

| Temuan di halaman resmi | Yang dikerjakan |
|---|---|
| Boleh submit produk yang sudah ada | Pakai §3 (naskah) + §4 (demo) apa adanya. Selesai. |
| Wajib dibangun di Emergent | Pakai §7 (Rencana B): rebuild irisan tipis di Emergent, naskah §3 tetap dipakai. |

Cek ini butuh lima menit dan menghemat delapan hari. **Jangan lewati.**
Sesi Claude tidak bisa membuka emergent.sh (diblokir egress proxy), jadi ini hanya bisa
dilakukan Owner.

---

## 2. Positioning — kenapa "FIEZEL untuk Sekolah", bukan FIEZEL

Syarat kontes menyebut peserta adalah "penduduk Indonesia yang menjalankan atau bekerja
dekat dengan sebuah bisnis", dan yang dinilai adalah solusi atas **masalah bisnis nyata**.

Landing page FIEZEL hari ini berbunyi *"Ruang belajar bahasa Inggris personal milikmu"*.
Itu naskah untuk murid perorangan, dan sebagai jawaban kontes ia lemah: juri tidak bisa
menunjuk siapa pembelinya.

Yang menarik: **repo ini sebenarnya sudah bergerak ke arah kelas**, jauh sebelum kontes
ini ada. Handoff `m025-236` (2 September 2026) menyatakannya terang-terangan —
*"FIEZEL adalah aplikasi kelas; guru memberitahu seluruh muridnya sebelum mereka
memasang; bukti belajar ini adalah data guru."* Lane bukti belajar per-murid sudah
menyala di produksi sejak `m025-234`, lengkap dengan dashboard owner sebagai Worker
terpisah.

Jadi ini **bukan pivot**. Ini menamai apa yang sudah dibangun.

**Masalah bisnis yang diangkat:**

> Lembaga kursus dan sekolah bahasa Inggris di Indonesia tidak punya bukti objektif
> bahwa muridnya berkembang. Yang ada cuma absensi, nilai ulangan buatan guru sendiri,
> dan kesan subjektif. Saat orang tua bertanya *"anak saya sudah maju berapa?"*,
> jawabannya adalah perasaan, bukan data. Akibatnya murid berhenti di tengah jalan,
> dan lembaga kehilangan pendapatan berulang yang seharusnya bisa dipertahankan.

Itu masalah yang punya pembeli, punya anggaran, dan bisa dijelaskan dalam satu kalimat.

**Kenapa FIEZEL bisa menjawabnya hari ini:** mesin pengukurnya sudah jadi dan sudah
lulus gerbang. Yang kurang cuma penamaan dan satu halaman untuk guru.

---

## 3. Naskah submission (siap tempel)

### 3.1 Judul

> **FIEZEL untuk Sekolah — bukti belajar bahasa Inggris yang bisa ditunjukkan ke orang tua**

Alternatif kalau kolom judul pendek: **FIEZEL for Schools**.

### 3.2 Satu kalimat

> Aplikasi kelas bahasa Inggris yang mengubah latihan harian murid menjadi bukti
> kemajuan per-murid yang bisa dibuka guru kapan saja — tanpa guru mengoreksi satu soal pun.

### 3.3 Masalah

> Lembaga kursus bahasa Inggris menjual satu janji: "anak Anda akan bisa berbahasa
> Inggris." Tapi hampir tidak ada lembaga yang bisa membuktikannya. Guru menilai dari
> kesan, rapor diisi manual di akhir semester, dan saat orang tua bertanya kemajuan
> anaknya, jawabannya bergantung ingatan guru.
>
> Yang hilang bukan semangat mengajar — yang hilang adalah **alat ukur**. Membuat soal
> berjenjang A1–C2, mengoreksinya, dan merangkumnya per murid setiap minggu adalah
> pekerjaan penuh waktu yang tidak dibayar. Jadi tidak dikerjakan. Dan karena tidak
> terukur, murid yang mulai jenuh baru ketahuan setelah ia berhenti bayar.

### 3.4 Solusi

> FIEZEL untuk Sekolah memasang satu aplikasi di ponsel setiap murid. Murid berlatih
> seperti biasa — grammar, membaca, kosakata, mendengarkan, berbicara. Setiap jawaban
> otomatis menjadi bukti belajar yang tersinkron ke dashboard guru.
>
> Guru tidak mengoreksi. Guru tidak menyiapkan soal. Guru membuka satu halaman dan
> melihat: siapa naik level, siapa berhenti tiga hari, siapa mandek di satu topik dan
> perlu ditemui minggu ini.
>
> Isinya bukan demo kosong. Yang berjalan hari ini: **180 lesson grammar A1–C2**
> (25 soal terfokus per lesson), **312 bacaan dengan 1.560 soal**, **2.440 kosakata**,
> **1.407 butir listening**, **36 sesi speaking**, plus format ujian bergaya IELTS/TOEFL.
> Semuanya jalan di browser, bisa dipasang ke Home Screen, dan latihannya tetap terbuka
> tanpa internet.

### 3.5 Yang membuatnya berbeda

Tiga hal, dan ketiganya keputusan teknis yang sudah dikunci gerbang test — bukan slogan:

> **1. Tidak menebak skor.** FIEZEL menolak mengarang "kamu setara IELTS 6.5". Modul
> kesiapan akademiknya hanya menyatakan prasyarat mana yang sudah punya bukti dan mana
> yang belum. Yang belum pernah diukur ditulis *belum terukur*, bukan diisi nol —
> karena menyatakan seseorang gagal padahal belum pernah diuji itu tuduhan, bukan
> asesmen. Aturan ini dipagari test otomatis.
>
> **2. Privasi bukan janji, tapi batasan bentuk data.** Yang tersinkron ke guru cuma
> nama murid dan ringkasan kemajuan berbucket. Rekaman suara, transkrip, dan isi
> jawaban tidak pernah keluar dari perangkat murid — bukan karena kebijakan, tapi
> karena datanya memang tidak dikirim.
>
> **3. Angka yang jujur soal dirinya sendiri.** Dashboard guru mencantumkan bahwa
> hitungannya adalah estimasi perangkat, bukan orang: satu murid dengan dua ponsel
> terhitung dua. Label itu wajib tampil dan diassert test — tidak boleh disembunyikan
> supaya angkanya terlihat lebih bagus.

### 3.6 Model bisnis

> Gratis untuk murid perorangan, selamanya. Lembaga membayar per kelas untuk dashboard
> guru, bukti belajar tersinkron, dan laporan yang bisa diberikan ke orang tua.
>
> Biaya runtime-nya mendekati nol: latihan dan penilaian berjalan di perangkat murid,
> bukan di server. Jadi harga per kelas bisa masuk akal untuk lembaga kursus di kota
> kecil — bukan cuma untuk sekolah internasional di Jakarta.

### 3.7 Status

> Sudah berjalan, bukan mockup. Lane bukti belajar per-murid aktif di produksi.
> Bank soal, adaptivitas, dan integritas konten dijaga gerbang otomatis yang berjalan
> setiap commit. Yang belum selesai disebut apa adanya: verifikasi suara neural di
> perangkat nyata masih tertunda, dan suara bawaan perangkat dipakai sampai itu tuntas.

### 3.8 Versi Inggris (kalau kolomnya minta Inggris)

> **FIEZEL for Schools — proof of English progress you can show a parent**
>
> English course providers in Indonesia sell one promise: your child will speak English.
> Almost none can prove it. Teachers grade on impression, report cards are filled in by
> hand, and when a parent asks how far their child has come, the answer depends on what
> the teacher remembers.
>
> FIEZEL for Schools puts one app on every student's phone. Students practise as usual —
> grammar, reading, vocabulary, listening, speaking — and every answer becomes per-student
> evidence that syncs to the teacher's dashboard. No marking. No prep. One page that shows
> who levelled up, who stopped three days ago, and who is stuck and needs a conversation
> this week.
>
> Running today: 180 graded grammar lessons (A1–C2, 25 focused items each), 312 reading
> passages with 1,560 questions, 2,440 vocabulary entries, 1,407 listening items, 36
> speaking sessions, plus IELTS/TOEFL-style exam formats. It installs to the home screen
> and keeps working offline.
>
> Three things make it different, all enforced by automated gates rather than promised in
> copy: it never invents a score (unmeasured is reported as unmeasured, not as zero); raw
> audio, transcripts and answer content never leave the student's device; and the teacher
> dashboard states on its face that its counts are device estimates, not people.

---

## 4. Naskah demo 60 detik

Urutannya sengaja dibalik dari kebiasaan: **guru dulu, murid belakangan.** Yang dijual
ke juri adalah nilai bisnisnya, bukan tur fitur.

| Detik | Yang terlihat | Yang dikatakan |
|---|---|---|
| 0–10 | Dashboard guru, satu kelas | "Ini kelas 20 murid. Guru belum mengoreksi apa pun minggu ini." |
| 10–25 | Sorot satu murid mandek | "Rina berhenti tiga hari, dan mandek di conditional. Guru tahu ini hari Selasa, bukan pas rapor." |
| 25–40 | Pindah ke sisi murid, kerjakan 2 soal | "Dari sisi Rina cuma latihan biasa. Ini yang jadi datanya." |
| 40–50 | Kembali ke dashboard, angka berubah | "Tanpa guru menyentuh apa pun." |
| 50–60 | Layar penutup, satu kalimat | "Lembaga kursus akhirnya punya bukti, bukan kesan." |

**Aturan keras demo:**

- **Jangan** demokan unduhan suara neural 119 MB. Juri kemungkinan besar membuka dari
  HP dengan jaringan seadanya, dan itu titik paling rapuh di produk. Repo sendiri sudah
  mencatat verifikasi perangkat nyata belum tuntas.
- **Jangan** buka dengan splash dan maskot. Maskot PAW itu bagus, tapi ia bukan jawaban
  atas masalah bisnis, dan detik pertama adalah detik termahal.
- **Jangan** tur fitur. Satu murid, satu masalah, satu keputusan guru.

---

## 5. Rencana upvote

Hanya 200 teratas yang masuk penjurian, jadi ini bukan pelengkap — ini separuh lomba.

- **Judul harus bisa dipahami tanpa membuka apa pun.** "Bukti belajar yang bisa
  ditunjukkan ke orang tua" mengalahkan "Personal English OS berbasis adaptivitas".
- **Gambar pertama = dashboard guru**, bukan splash screen. Yang mengambang di feed
  adalah gambar, bukan paragraf.
- **Sasar orang yang punya masalahnya**: guru, pemilik kursus, orang tua. Mereka
  meng-upvote karena mengenali masalahnya, bukan karena kagum teknologinya.
- **Submit lebih awal, jangan tanggal 10.** Upvote butuh waktu mengendap; submission
  hari terakhir bersaing dengan seluruh gelombang akhir sekaligus.
- **Satu kalimat pembuka yang menyebut angka**: "180 lesson A1–C2, 1.560 soal membaca,
  dan guru tidak mengoreksi satu pun."

---

## 6. Risiko, apa adanya

| Risiko | Berat | Sikap |
|---|---|---|
| Submission wajib dibangun di Emergent | **Tinggi** | Gerbang 0 (§1). Kalau iya, jalankan §7. |
| Naskah "personal" tidak cocok syarat "bisnis" | Sedang | Sudah dijawab: submit sebagai FIEZEL untuk Sekolah, dan bagian guru ditambahkan ke landing page pada commit ini. |
| Murid tidak punya sakelar menolak sinkronisasi bukti | Sedang | Keputusan Owner di `m025-236`, tercatat apa adanya. **Sebut sendiri di submission** sebelum orang lain menemukannya: yang tersimpan hanya nama + ringkasan berbucket, guru memberitahu murid di kelas. Menyembunyikannya jauh lebih mahal daripada menyebutkannya. |
| Suara neural belum terverifikasi di perangkat | Rendah untuk kontes | Jangan didemokan. Sudah tertulis di §4. |
| Delapan hari, satu orang | Sedang | Jangan tambah fitur. Naskah, demo, dan halaman guru sudah cukup. |

---

## 7. Rencana B — spesifikasi ramping untuk dibangun ulang di Emergent

Dipakai **hanya kalau** Gerbang 0 menyatakan submission wajib dibangun di platform mereka.
Prinsipnya: bangun **irisan tertipis yang masih menceritakan keseluruhan cerita**, bukan
FIEZEL mini.

**Yang dibangun (empat layar, tidak lebih):**

1. **Dashboard guru.** Daftar murid satu kelas, tiap baris: nama, level sekarang,
   latihan terakhir, satu penanda status (naik / jalan / mandek / berhenti).
2. **Halaman satu murid.** Peta skill sederhana, riwayat singkat, dan satu kalimat
   rekomendasi tindakan untuk guru.
3. **Layar latihan murid.** Satu jenis soal saja — grammar pilihan ganda sudah cukup.
   Benar/salah langsung, dan skornya masuk ke dashboard.
4. **Laporan orang tua.** Satu halaman ringkas yang bisa dikirim ke orang tua.

**Yang TIDAK dibangun ulang:** neural voice, offline/PWA, maskot beranimasi, ujian
IELTS/TOEFL, adaptivitas penuh, multi-bahasa. Semuanya kekuatan FIEZEL, dan semuanya
tidak menambah nilai dalam demo 60 detik.

**Data seed:** ambil dari repo ini supaya isinya nyata sejak menit pertama —
`grammar-curriculum-v1.json` (180 lesson) dan `reading-bank.json` (312 bacaan) sudah
berformat rapi. Cukup 20–30 butir untuk demo; sisanya diceritakan sebagai kapasitas
yang sudah ada, dengan link ke aplikasi asli sebagai bukti.

**Anggaran waktu (8 hari):** 2 hari empat layar, 1 hari data seed, 1 hari naskah dan
gambar, 1 hari rekam demo, submit di hari ke-6. Dua hari sisanya untuk upvote —
bukan untuk menambah fitur.

---

## 8. Lampiran — angka terverifikasi

Dihitung langsung dari berkas data pada commit ini, bukan disalin dari README:

| Materi | Jumlah | Sumber |
|---|---|---|
| Kosakata | 2.440 entri | `vocabulary-master.json` |
| Grammar lesson | 180 lesson | `grammar-curriculum-v1.json` |
| Grammar template | 249 template | `grammar-templates.json` |
| Reading | 312 bacaan / 1.560 soal | `reading-bank.json` |
| Cloze | 210 item | `cloze-bank-v1.json` |
| Listening | 1.407 butir bank + 36 Skills Lab | `features/speaking-listening/listening-bank-v1.json` |
| Speaking | 36 sesi | `features/speaking-listening/speaking-bank-v1.json` |
| Sebaran reading | A1 53 · A2 53 · B1 52 · B2 52 · C1 51 · C2 51 | `reading-bank.json` |

Catatan: README 5.19.0 menyebut 248 template / 179 lesson dan 209 cloze. Angka itu
tertinggal satu gelombang konten; dikoreksi pada commit ini.

**Gerbang yang hijau saat dokumen ini ditulis:** `validator.js`, `regression-test.js`
(PASS), `content-audit.js` (0 temuan), `product-audit.js` (48 pass / 0 fail).

---

## 9. Urutan kerja

1. **Owner:** jalankan Gerbang 0 (§1). Lima menit.
2. Kalau produk yang ada boleh disubmit → tempel §3, rekam §4, submit, jalankan §5.
3. Kalau wajib Emergent → jalankan §7 dengan naskah §3 yang sama.
4. Submit paling lambat **8 September**, bukan 10 — sisakan ruang untuk upvote.
