# Building Indonesia (Emergent) — Rencana Submission FIEZEL

**Status: DRAFT SIAP PAKAI.** Disusun 2 September 2026. Deadline submission
**10 September 2026, 23:59 WIB**; upvote ditutup **15 September 2026**.
Hanya **200 submission dengan upvote terbanyak** yang masuk penjurian.
Hadiah: 100 pemenang berbagi Rp800 juta.

Dokumen ini berisi empat hal, berurutan sesuai cara memakainya:

1. **Gerbang 0** — syarat platform yang sudah dikonfirmasi Owner, dan apa yang harus
   dibangun untuk memenuhinya.
2. **Positioning** — kenapa yang disubmit adalah *FIEZEL untuk Sekolah*, bukan FIEZEL utuh.
3. **Naskah submission** — siap tempel, bahasa Indonesia dan Inggris.
4. **Rencana B** — spesifikasi komponen kecil yang dibangun langsung di Emergent.

Semua angka di dokumen ini diambil dari berkas data repo pada commit ini, bukan dari
ingatan atau dari README (lihat §8 Lampiran angka). Kalau ada klaim yang tidak bisa
ditunjuk ke berkasnya, klaim itu dicoret, bukan dipoles.

---

## 1. Gerbang 0 — dikonfirmasi: 15% harus dibangun di Emergent

**Temuan Owner (2 September 2026):** syaratnya bukan "seluruh aplikasi wajib dibangun
di app.emergent.sh", dan bukan pula "boleh 100% submit produk lama tanpa sentuhan
Emergent". Titik tengahnya: **minimal 15% dari submission harus benar-benar dibangun
di Emergent.**

Ini mengubah keputusan di §7 dari pilihan biner (rebuild total vs. tidak sama sekali)
menjadi **model hybrid**: FIEZEL yang sudah ada dan sudah teruji tetap jadi produk inti
dan tetap yang didemokan di §4, tapi ditambah satu komponen nyata yang dibangun di
Emergent — bukan sekadar disebut di naskah, karena penjurian kemungkinan memeriksa
riwayat build di platform mereka, bukan cuma percaya klaim.

| Bagian | Porsi | Dibangun di mana |
|---|---|---|
| Aplikasi belajar murid (grammar, reading, listening, speaking) | ~70% | FIEZEL yang sudah ada, tidak disentuh |
| Dashboard/bukti belajar guru | ~15% | FIEZEL yang sudah ada, tidak disentuh |
| **Laporan orang tua otomatis** | **~15%** | **Dibangun baru, di Emergent** |

Spesifikasi komponen yang dibangun di Emergent ada di §7. Ini bukan komponen tempelan:
ia menjawab bagian paling lemah dari cerita FIEZEL saat ini — *bukti belajar sampai ke
guru, tapi belum ada apa pun yang sampai ke orang tua dalam bentuk siap kirim.* Jadi
syarat platform kontes justru menutup lubang nyata di produk, bukan menambah pekerjaan
yang tidak berarti.

Yang perlu Owner lakukan: mendaftar/login di app.emergent.sh dan membangun komponen
§7 di sana langsung (builder no-code mereka), karena sesi Claude tidak bisa membuka
emergent.sh (diblokir egress proxy). Spesifikasinya sudah dirinci supaya tinggal diikuti
tanpa keputusan desain lagi di tempat.

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

Urutannya sengaja dibalik dari kebiasaan: **guru dulu, murid belakangan, laporan
orang tua di penutup.** Yang dijual ke juri adalah nilai bisnisnya, bukan tur fitur —
dan babak terakhir sekaligus menunjukkan komponen Emergent (§7) sebagai bagian yang
hidup dari alur, bukan tempelan terpisah.

| Detik | Yang terlihat | Yang dikatakan |
|---|---|---|
| 0–10 | Dashboard guru, satu kelas | "Ini kelas 20 murid. Guru belum mengoreksi apa pun minggu ini." |
| 10–25 | Sorot satu murid mandek | "Rina berhenti tiga hari, dan mandek di conditional. Guru tahu ini hari Selasa, bukan pas rapor." |
| 25–40 | Pindah ke sisi murid, kerjakan 2 soal | "Dari sisi Rina cuma latihan biasa. Ini yang jadi datanya." |
| 40–50 | Kembali ke dashboard, lalu buka Laporan Orang Tua (dibangun di Emergent) | "Satu tombol, jadi paragraf siap kirim ke orang tua Rina." |
| 50–60 | Layar penutup, satu kalimat | "Lembaga kursus akhirnya punya bukti, bukan kesan — dan orang tua ikut melihatnya." |

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
| Komponen Emergent tidak jadi/telat | **Tinggi** | Kecil dan sempit by design (§7): satu alur tiga langkah, tanpa integrasi API. Kerjakan di hari 1–2, bukan hari terakhir. |
| Dropdown "Select an app" di Emergent hanya berisi app yang dibangun di sana — FIEZEL tidak bisa dipilih sama sekali | **Tinggi, dikonfirmasi** | Bukan risiko lagi, sudah jadi rancangan sejak awal (§7.4): app Laporan Orang Tua ITU SENDIRI yang disubmit lewat dropdown itu, FIEZEL disebut lewat judul app + Description (178 karakter), bukan lewat link terpisah. |
| Description dibatasi 180 karakter — naskah §3 tidak muat | Sedang | Draf 178 karakter sudah disiapkan di §7.4, dipakai apa adanya. |
| Naskah "personal" tidak cocok syarat "bisnis" | Sedang | Sudah dijawab: submit sebagai FIEZEL untuk Sekolah, dan bagian guru ditambahkan ke landing page pada commit ini. |
| Murid tidak punya sakelar menolak sinkronisasi bukti | Sedang | Keputusan Owner di `m025-236`, tercatat apa adanya. **Sebut sendiri di submission** sebelum orang lain menemukannya: yang tersimpan hanya nama + ringkasan berbucket, guru memberitahu murid di kelas. Menyembunyikannya jauh lebih mahal daripada menyebutkannya. |
| Suara neural belum terverifikasi di perangkat | Rendah untuk kontes | Jangan didemokan. Sudah tertulis di §4. |
| Delapan hari, satu orang | Sedang | Jangan tambah fitur di sisi FIEZEL. Komponen Emergent sengaja dibuat kecil supaya tidak menyita waktu itu. |

---

## 7. Komponen Emergent — Laporan Orang Tua Otomatis

Ini bagian yang **wajib dibangun langsung di app.emergent.sh**, bukan opsional dan
bukan disimulasikan. Dipilih karena tiga alasan sekaligus: cukup kecil untuk selesai
dalam 1–2 hari lewat builder no-code, cukup nyata untuk memenuhi porsi 15%, dan
menjawab lubang asli di produk (lihat §1) — bukan fitur tempelan yang dibuat cuma
untuk kontes.

### 7.1 Masalah spesifik yang dijawab komponen ini

Dashboard guru FIEZEL (`workers/owner/index.js`) menampilkan bukti belajar ke guru,
tapi berhenti di situ. Guru masih harus **menceritakan ulang** angka itu ke orang tua
secara manual — lewat WhatsApp, lewat rapat, lewat obrolan singkat saat jemput. Itu
pekerjaan tambahan yang tidak dibayar, persis masalah yang sama yang membuat lembaga
kursus tidak punya bukti sejak awal.

### 7.2 Yang dibangun di Emergent

Satu alur pendek, tiga langkah:

1. **Input.** Guru memasukkan (atau menempel) ringkasan bukti belajar satu murid:
   nama, level CEFR sekarang, jumlah latihan minggu ini, satu topik yang sudah
   dikuasai, satu topik yang masih perlu latihan. Ini cocok dengan bentuk data yang
   memang sudah ada di sisi FIEZEL — bukan struktur baru yang diarang.
2. **Generate.** AI builder Emergent menyusun satu paragraf laporan berbahasa
   Indonesia yang siap dikirim ke orang tua: nada positif tapi jujur, tidak
   mengarang skor atau prediksi (aturan yang sama dengan §3.5 poin 1 — tidak
   menebak apa yang belum terukur).
3. **Output.** Teks siap salin-tempel ke WhatsApp, atau diunduh sebagai satu
   halaman PDF/gambar sederhana.

Tidak perlu login murid, tidak perlu autentikasi rumit, tidak perlu integrasi API
ke FIEZEL — ini alat berdiri sendiri yang **melengkapi** alur FIEZEL, dipakai guru
di antara buka dashboard dan mengirim pesan ke orang tua.

### 7.3 Yang sengaja TIDAK dibangun di sini

Tidak ada latihan murid, tidak ada bank soal, tidak ada dashboard kelas — itu semua
sudah ada dan sudah teruji di FIEZEL (§8). Membangunnya ulang di Emergent hanya
mengulang pekerjaan tanpa menambah cerita. Komponen ini murni mengisi satu langkah
yang hilang: dari "guru tahu" ke "orang tua tahu".

### 7.4 Cara submission-nya bekerja di Emergent (dikonfirmasi dari layar app.emergent.sh)

Ini bukan detail kecil: layar "Build it. Publish it. Submit it." di Emergent punya
kolom **"Select an app"** berupa dropdown, dan dropdown itu hanya berisi app yang
sudah dibangun di akun Emergent-mu sendiri. Artinya **FIEZEL tidak bisa dipilih di
sana sama sekali** — yang dipilih dan disubmit langsung adalah app Laporan Orang
Tua ini. FIEZEL tidak "ditempelkan" ke submission; ia hanya disebut lewat naskah
dan judul app, bukan lewat link terpisah.

Konsekuensinya: **judul app di Emergent adalah satu-satunya tempat yang menyambungkan
submission ke FIEZEL**, jadi wajib diawali "FIEZEL —", dan halaman app itu sendiri
(lihat §7.2, teks pembuka "Bagian dari FIEZEL untuk Sekolah...") yang menanggung
penjelasan bahwa ini bagian dari produk yang lebih besar, bukan app berdiri sendiri.

Kolom **Description** di layar itu dibatasi **180 karakter** — terlalu pendek untuk
naskah panjang §3. Draf yang muat pas:

> Ubah bukti belajar bahasa Inggris murid jadi laporan siap kirim WhatsApp untuk
> orang tua. Bagian dari FIEZEL untuk Sekolah — bukti belajar per-murid, gratis
> untuk lembaga kursus. (178/180 karakter)

Kalau setelah menekan "Publish & Submit" muncul halaman showcase dengan kolom
tambahan (judul, gambar, naskah panjang) — yang umum di platform kontes semacam
ini — barulah naskah lengkap §3 dipakai di sana. Kalau ternyata tidak ada kolom
tambahan, satu-satunya cerita yang sampai ke juri adalah judul app + 178 karakter
di atas, jadi keduanya harus benar-benar menyebut "FIEZEL" secara eksplisit.

**Anggaran waktu (8 hari):** 1–2 hari membangun komponen ini di Emergent, 1 hari
data seed dari `grammar-curriculum-v1.json`/`reading-bank.json` untuk demo yang
konsisten dengan sisi FIEZEL, 1 hari naskah dan gambar, 1 hari rekam demo (kini
tiga babak: dashboard guru → laporan orang tua ter-generate → sisi murid), submit
di hari ke-7. Sisa waktu untuk upvote.

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

1. **Owner:** bangun komponen Laporan Orang Tua di app.emergent.sh mengikuti §7.
   Ini satu-satunya bagian yang harus dikerjakan langsung di platform mereka.
2. Rekam demo tiga babak (§4) yang menyambungkan FIEZEL asli dengan komponen
   Emergent tadi.
3. Tempel naskah §3, tambahkan poin §7.4, submit.
4. Jalankan §5 (rencana upvote).
5. Submit paling lambat **8 September**, bukan 10 — sisakan ruang untuk upvote.
