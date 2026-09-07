# KURIKULUM SEKOLAH — bab, sub-bab, dan soal yang benar-benar dari materi ajar (m025-291)

Wewenang: OWNER. Status: cakupan kelas 7–12 dua semester LENGKAP; kedalaman soal masih
tahap pertama (lihat Langkah berikutnya).

## Tiga cacat yang ditemukan saat audit

**1. Soal tugas kurikulum sebagian besar BUKAN dari kurikulum.** Ini yang paling merusak,
dan tidak terlihat dari layar mana pun. Guru memilih "Descriptive Text — About Me" kelas 7
lalu meminta lima soal; yang terkirim ke murid adalah tiga soal kurikulum **ditambah lima
soal Past Tense dari bank umum** — materi kelas 8 — dan tugasnya dilabeli skill
`past_tense`.

Rantainya berlapis, dan tiap mata rantainya masuk akal sendiri-sendiri:
`skills` berisi nama GENRE (`'Descriptive Text'`), penyaring di `buildAssignment` membuangnya
karena bukan nama skill bank, baris berikutnya memaksa `skills = ['past_tense']` sebagai
default, lalu penambal menarik soal dari bank untuk memenuhi jumlah yang diminta. Karena
satu bab hanya berisi 2–3 soal sementara pilihan jumlahnya 2/3/5/8/10, pencemaran itu
terjadi pada **hampir setiap** tugas kurikulum.

Ditutup dengan `curriculumOnly` di `buildAssignment`: kalau pemanggil menyatakan set ini
berasal dari materi ajar, bank umum tidak pernah disentuh dan jumlah soalnya apa adanya.
Lebih baik guru melihat "3 soal" yang jujur daripada delapan soal yang setengahnya
mengajarkan bab yang salah.

**2. Guru tidak bisa memilih detail materi.** Pilihan terkecil adalah satu bab utuh,
padahal guru tidak mengajar "Descriptive Text" sekaligus — ia mengajar To Be hari Senin dan
Simple Present hari Rabu. `languageFeatures` hanya label yang ditampilkan; butirnya tidak
ditandai, jadi tidak bisa disaring.

**3. Materinya terlalu sedikit dan setengah semester kosong.** Sembilan bab, 19 soal, untuk
enam tingkat kelas. Deskripsi Fase E bahkan menjanjikan lima genre padahal hanya satu yang
punya bab — guru membaca janji yang tidak ada isinya.

## Yang dikerjakan

**Struktur sub-bab.** Tiap bab dipecah menjadi tiga sub-bab bernomor (1.1, 1.2, 1.3), dan
**tiap butir soal ditandai** `subChapterId` + `feature`. Dua saringan baru di `pickItems`:
`subChapter` dan `features`. Saringan yang menghabiskan kolam mengembalikan **kosong**, tidak
diisi ulang diam-diam — penambalan senyap itulah cacat nomor satu di atas.

**UI pemilihan bertingkat.** Guru memilih Fase → Bab → Sub-bab (opsional) → centang fitur
bahasa. Yang ditawarkan hanya fitur yang **benar-benar punya soal**, diturunkan dari butirnya
lewat `getFeatures()`, bukan dari daftar `languageFeatures`. Menawarkan janji kurikulum
sebagai pilihan akan menghasilkan tugas kosong saat guru mencentangnya. Pilihan jumlah soal
juga dipotong sesuai isi bab, dan jumlah tersedia ditampilkan di sebelah labelnya.

**Cakupan dan kedalaman.** Dari 9 bab / 19 soal menjadi **15 bab / 115 soal**. Setiap kelas
7–12 kini punya materi di kedua semester:

| kelas | semester 1 | semester 2 |
|---|---|---|
| 7 | Descriptive (About Me), Procedure (Resep) | Descriptive (Home Sweet Home) |
| 8 | Recount (17 Agustus), Narrative (Fabel) | Notice & Instruction (Rambu, Aturan) |
| 9 | Information Report (Fauna) | Procedure (Manual & How-To) |
| 10 | Narrative (Legenda Nusantara) | Analytical Exposition |
| 11 | Hortatory Exposition | Explanation |
| 12 | Discussion, News Item & Caption | Application Letter & CV |

Tiap bab baru membawa perangkat mengajar lengkap: apersepsi 5 menit, rumus papan tulis,
miskonsepsi khas siswa beserta contoh kesalahannya, diferensiasi untuk yang tertinggal dan
yang sudah maju, serta kosakata kunci.

**Frasa ambigu di dashboard guru.** Nama internal dan istilah asing yang tidak berarti apa
pun bagi guru diganti, semuanya lewat copy-map dwibahasa:

| sebelum | sesudah |
|---|---|
| Kelas — Guru · Murid · **Braincore** | Ruang Kelas — guru, murid, dan hasil belajar dalam satu layar |
| **Briefing** / Briefing hari ini | Ringkasan Hari Ini |
| Analitik & **Deteksi Dini** | Analitik — siapa yang perlu dibantu |
| Bank **Skill Kilat** (A2) | Latihan cepat per skill (A2) |
| **Waktu terhemat** | Waktu administrasi yang dihemat |
| **Teaching Brief** | Panduan mengajar |
| Perlu perhatian | Perlu dibantu |

Dua tab yang sama-sama bernama "Kelas" juga dibedakan: tab hub menjadi **Ruang Kelas**.

## Bukti

`tests/kurikulum-integritas-test.js` menguji enam rantai K1–K6 dan setiap rantai dibuktikan
merah lebih dulu lewat mutasi: penambalan bank umum dikembalikan (K1 merah), saringan kosong
diisi ulang diam-diam (K3 merah), satu butir kehilangan penanda fitur (K6 merah).

K1 sengaja meminta **40 soal** dari bab berisi sembilan — persis keadaan yang dulu memicu
penambalan — lalu membuktikan tidak satu pun butir asing masuk.

## Langkah berikutnya

- **Kedalaman soal.** 115 soal untuk 15 bab berarti rata-rata 7–8 soal per bab. Cukup untuk
  satu tugas, belum cukup untuk satu semester penuh tanpa pengulangan. Target berikutnya
  12–15 soal per bab, ditambah per sub-bab yang paling sering diajarkan.
- **Bab kedua per semester.** Beberapa semester baru punya satu bab (kelas 9 semester 2,
  kelas 11 semester 1). Kurikulum Merdeka biasanya memuat dua sampai tiga bab per semester.
- **Teks bacaan panjang.** Semua butir saat ini berbentuk kalimat rumpang. Genre seperti
  Report dan Discussion menuntut soal berbasis teks utuh; itu perubahan bentuk data
  tersendiri (`context` per butir sudah didukung bank soal, belum dipakai di sini).
- **Sisi Thai.** Isi kurikulum ini nasional Indonesia dan sengaja tidak diterjemahkan
  (alasannya di `tests/th-ui-leak-test.js`). Kalau FIEZEL kelak masuk kurikulum negara lain,
  jalannya paket kurikulum per-negara — bukan menerjemahkan paket Indonesia.
