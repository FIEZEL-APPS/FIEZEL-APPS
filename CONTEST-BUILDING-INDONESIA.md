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

## 1. Gerbang 0 — dikonfirmasi: submission dinilai sebagai SATU app Emergent utuh

**Temuan Owner, dua tahap:**

1. (2 September, sore) Syaratnya bukan "seluruh aplikasi wajib dibangun di
   app.emergent.sh", dan bukan pula "boleh 100% submit produk lama tanpa sentuhan
   Emergent" — minimal 15% dari submission harus benar-benar dibangun di Emergent.
2. (2 September, malam, dari tangkapan layar layar submission asli) Mekanismenya
   lebih ketat dari sekadar "15%": layar "Build it. Publish it. Submit it." punya
   kolom **"Select an app"** — dropdown yang hanya berisi app yang sudah dibangun
   di akun Emergent-mu. **Satu app itulah yang dipilih dan dikirim ke penjurian.**
   Tidak ada kolom untuk menambahkan link produk lain sebagai pelengkap.

Konsekuensinya: **app yang dibangun di Emergent bukan komponen kecil di samping
FIEZEL — app itu ADALAH keseluruhan yang dinilai juri.** Kalau app-nya cuma satu
form generate-teks, itulah yang dilihat juri sebagai "solusi bisnismu", terlepas
seberapa besar dan matang FIEZEL yang sebenarnya. Rencana komponen tunggal di
draf sebelumnya sudah diganti dengan spesifikasi app utuh di §7: FIEZEL untuk
Sekolah (versi Emergent) — dashboard guru, latihan murid dengan konten asli
FIEZEL, dan laporan orang tua sebagai fitur di dalamnya, bukan app itu sendiri.

FIEZEL yang sudah ada di produksi tetap berperan penting: ia sumber konten (bank
soal, contoh data) dan sumber kredibilitas ("dipakai lembaga sungguhan"), tapi
peran itu disampaikan lewat naskah di dalam app Emergent (layar pembuka, §7.2),
bukan lewat link yang dinilai terpisah.

Yang perlu Owner lakukan: mendaftar/login di app.emergent.sh dan membangun app
di §7 langsung di sana (builder no-code mereka), karena sesi Claude tidak bisa
membuka emergent.sh (diblokir egress proxy). Spesifikasinya sudah dirinci supaya
tinggal diikuti tanpa keputusan desain lagi di tempat.

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

Seluruh demo ini kini terjadi **di dalam satu app Emergent** (§7), karena itulah
yang dinilai juri — bukan berpindah ke FIEZEL asli di tengah rekaman. Urutannya
sengaja dibalik dari kebiasaan: **layar pembuka dulu, lalu guru, murid, dan
laporan orang tua di penutup.**

| Detik | Yang terlihat | Yang dikatakan |
|---|---|---|
| 0–8 | Layar pembuka app (§7.2 poin 1) | "Lembaga kursus tidak punya bukti kemajuan murid selain kesan. Ini FIEZEL untuk Sekolah." |
| 8–20 | Dashboard guru, satu kelas | "Delapan murid. Guru belum mengoreksi apa pun minggu ini." |
| 20–32 | Sorot satu murid mandek | "Rina berhenti tiga hari dan mandek di conditional. Guru tahu ini hari Selasa, bukan pas rapor." |
| 32–45 | Layar latihan murid, kerjakan 2 soal | "Dari sisi Rina cuma latihan biasa. Ini yang jadi datanya, dan statusnya di dashboard ikut berubah." |
| 45–55 | Kembali ke dashboard, tekan "Buat laporan" untuk Rina | "Satu tombol, jadi paragraf siap kirim ke orang tua Rina — tanpa guru mengetik ulang." |
| 55–60 | Layar penutup, satu kalimat | "Lembaga kursus akhirnya punya bukti, bukan kesan." |

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
| App Emergent-nya terlalu tipis, kalah bersaing dengan submission lain yang benar-benar solid | **Tinggi** | Ini alasan §7 ditulis ulang jadi empat layar (dashboard + latihan + laporan + pembuka), bukan satu form kecil. App harus meyakinkan berdiri sendiri, karena app itulah yang dinilai (§1). |
| Dropdown "Select an app" di Emergent hanya berisi app yang dibangun di sana — FIEZEL tidak bisa dipilih sama sekali | **Tinggi, dikonfirmasi** | Bukan risiko lagi, sudah jadi rancangan sejak awal (§7): app FIEZEL untuk Sekolah versi Emergent ITU SENDIRI yang disubmit lewat dropdown itu. FIEZEL asli disebut lewat layar pembuka + judul app + Description, bukan lewat link terpisah yang tidak tersedia. |
| Description dibatasi 180 karakter — naskah panjang §3 tidak muat | Sedang | Draf 161 karakter sudah disiapkan di §7.5, dipakai apa adanya; cerita lengkap dipindah ke layar pembuka di dalam app (§7.2 poin 1). |
| Naskah "personal" tidak cocok syarat "bisnis" | Sedang | Sudah dijawab: submit sebagai FIEZEL untuk Sekolah, dan bagian guru ditambahkan ke landing page pada commit ini. |
| Murid tidak punya sakelar menolak sinkronisasi bukti | Sedang | Keputusan Owner di `m025-236`, tercatat apa adanya. **Sebut sendiri di submission** sebelum orang lain menemukannya: yang tersimpan hanya nama + ringkasan berbucket, guru memberitahu murid di kelas. Menyembunyikannya jauh lebih mahal daripada menyebutkannya. |
| Suara neural belum terverifikasi di perangkat | Rendah untuk kontes | Tidak relevan lagi — app Emergent tidak memakai suara neural sama sekali (§7.4). |
| Delapan hari, satu orang, dan sekarang empat layar bukan satu | Sedang | Masih realistis lewat builder no-code: dua hari untuk empat layar (§7 anggaran waktu), bukan development konvensional dari nol. |

---

## 7. App yang dibangun di Emergent — FIEZEL untuk Sekolah (versi Emergent)

Ini app yang **dipilih langsung di dropdown "Select an app"** dan disubmit ke
penjurian (§1). Karena app inilah yang dinilai, ia harus berdiri sebagai solusi
bisnis yang meyakinkan dengan sendirinya — bukan satu fitur kecil yang mengasumsikan
juri sudah tahu FIEZEL. Prinsipnya: **irisan tertipis yang tetap menceritakan
keseluruhan cerita**, dibangun cepat lewat builder no-code Emergent, bukan FIEZEL
mini yang berusaha menandingi fitur aslinya.

### 7.1 Masalah yang dijawab

Sama seperti §3.3: lembaga kursus tidak punya bukti objektif kemajuan murid, dan
rantainya putus di tiga titik — guru tidak sempat mengoreksi semua murid tiap
minggu, guru tidak punya cara cepat melihat siapa yang mulai jenuh, dan bukti yang
ada di kepala guru tidak pernah sampai dalam bentuk siap kirim ke orang tua. App
ini menunjukkan ketiganya sekaligus dalam satu alur pendek.

### 7.2 Empat layar yang dibangun (tidak lebih)

1. **Layar pembuka / pitch.** Satu halaman singkat sebelum masuk dashboard:
   judul "FIEZEL untuk Sekolah", satu kalimat masalah (§3.3), satu kalimat solusi
   (§3.4), dan garis kecil "Versi lengkap FIEZEL — 180 lesson grammar, 312 bacaan,
   2.440 kosakata — sudah berjalan di produksi; ini pratinjau sisi guru dan orang
   tua yang dibangun di Emergent." Ini pengganti kolom link yang tidak tersedia:
   layar inilah yang menyambungkan submission ke FIEZEL asli.
2. **Dashboard guru.** Daftar murid satu kelas (cukup 5–8 murid demo), tiap baris:
   nama, level CEFR sekarang, latihan terakhir, satu penanda status (naik / jalan
   / mandek / berhenti). Ini meniru fungsi `workers/owner/index.js` yang sudah
   ada di FIEZEL, disederhanakan.
3. **Layar latihan murid.** Satu jenis soal saja — grammar pilihan ganda sudah
   cukup, diisi dari data asli (§7.3). Benar/salah langsung, dan hasilnya
   memengaruhi status di dashboard guru, supaya alurnya terasa hidup, bukan
   statis.
4. **Laporan orang tua otomatis.** Dari satu baris murid di dashboard, tombol
   "Buat laporan" memanggil AI Emergent untuk menyusun satu paragraf berbahasa
   Indonesia siap kirim WhatsApp — nada positif tapi jujur, tidak mengarang skor
   atau prediksi (aturan sama dengan §3.5 poin 1: yang belum terukur dilaporkan
   belum terukur, bukan diisi angka). Ini fitur yang paling baru dan paling
   layak didemokan (§4), tapi kini satu bagian dari app, bukan app itu sendiri.

### 7.3 Data seed

Ambil dari repo ini supaya isinya nyata sejak menit pertama, bukan dikarang:
`grammar-curriculum-v1.json` (180 lesson berformat rapi, cukup ambil 10–15 soal
A1–A2 untuk layar 3) dan pola nama/level pada tabel contoh di percakapan
sebelumnya (Rina/B1, Dimas/A2) untuk mengisi dashboard di layar 2. Konsistensi
angka ini juga membuat naskah §3 dan demo §4 tidak bertentangan dengan yang
tampil di app.

### 7.4 Yang sengaja TIDAK dibangun ulang

Neural voice, offline/PWA, maskot beranimasi, ujian IELTS/TOEFL, adaptivitas
penuh, multi-bahasa. Semuanya kekuatan nyata FIEZEL (§8), tapi membangunnya
ulang di Emergent hanya menghabiskan waktu tanpa menambah bobot ke keputusan
juri — layar pembuka di §7.2 poin 1 sudah menyebutkan keberadaannya sebagai
bukti kapasitas, tanpa perlu didemokan ulang di sini.

### 7.5 Judul dan Description untuk layar submit

**Judul app (di Emergent):** `FIEZEL untuk Sekolah`

**Description (kolom 180 karakter di layar "Build it. Publish it. Submit it."):**

> Dashboard guru + latihan bahasa Inggris murid + laporan otomatis ke orang tua.
> Bukti belajar per-murid untuk lembaga kursus, tanpa guru mengoreksi satu soal
> pun. (161/180 karakter)

Kalau setelah "Publish & Submit" muncul halaman showcase dengan kolom tambahan
(gambar, naskah panjang) — umum di platform kontes semacam ini — barulah naskah
lengkap §3 dipakai di sana. Kalau tidak ada kolom tambahan, judul app + layar
pembuka (§7.2 poin 1) + Description di atas adalah satu-satunya cerita yang
sampai ke juri, jadi ketiganya harus tetap konsisten menyebut FIEZEL secara
eksplisit.

**Anggaran waktu (8 hari):** 2 hari membangun keempat layar di Emergent, 1 hari
data seed dan penyesuaian naskah dalam app, 1 hari naskah submission dan gambar,
1 hari rekam demo (§4, kini seluruhnya terjadi di dalam satu app Emergent),
submit di hari ke-6. Dua hari sisanya untuk upvote — bukan untuk menambah fitur.

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

1. **Owner:** bangun keempat layar app "FIEZEL untuk Sekolah" langsung di
   app.emergent.sh mengikuti §7 (pembuka, dashboard guru, latihan murid,
   laporan orang tua). Ini app yang akan dipilih di dropdown "Select an app"
   dan dinilai apa adanya oleh juri — bukan komponen pelengkap lagi.
2. Isi data seed dari §7.3 supaya demo dan naskah konsisten satu sama lain.
3. Rekam demo enam babak (§4), seluruhnya di dalam app Emergent tersebut.
4. Di layar "Build it. Publish it. Submit it.": pilih app-nya, tempel Description
   dari §7.5, tekan Publish & Submit. Kalau ada halaman showcase lanjutan,
   tempel naskah §3 di sana.
5. Jalankan §5 (rencana upvote).
6. Submit paling lambat **8 September**, bukan 10 — sisakan ruang untuk upvote.
