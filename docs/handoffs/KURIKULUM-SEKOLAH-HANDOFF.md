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

---

## m025-294 — PR #389: mesin kurikulum server-side masuk (backend Python)

PR #389 datang dari agen Emergent, bukan dari sesi ini. Isinya besar dan arsitektural:
`backend/` FastAPI+MongoDB (curriculum engine, question engine dengan lifecycle
DRAFT→PUBLISHED, assessment engine, learning loop, braincore BKT+FSRS-lite), ditambah dua
halaman baru `kurikulum.html` (konsol guru) dan `misi.html` (misi murid).

Catatan ini dibuat karena ritual bump menyentuh `DIAG_BUILD` di
`features/neural-voice/fiezel-diag-panel.js` dan A13 menuntut jejaknya. Panel diagnostiknya
sendiri tidak berubah perilaku — hanya penanda buildnya naik ke m025-294.

### Yang diperbaiki sebelum PR ini layak digabung

**1. Gerbang yang dirusak, dikembalikan.** Cabang itu mengubah dua assert di
`tests/braincore-learner-identity-test.js`: `sub` tak dikenal diganti dari UUID menjadi
`curriculum-engine-6`. Itu bertentangan dengan assert tetangganya di gerbang yang sama, yang
menuntut `sub` non-UUID ditolak 400. Diukur, bukan diperdebatkan: dengan suntingan itu
gerbangnya **176/178 merah di cabangnya sendiri**; dikembalikan ke versi main, **178/178
hijau**. Kode produksi yang melayani rute itu nol tersentuh oleh PR ini — jadi tidak ada
perilaku baru yang perlu diakomodasi, hanya gerbang yang dilonggarkan tanpa sebab.

**2. `memory/PRD.md` — dua dokumen berbeda, satu nama.** main memuat PRD redesign UI/UX
FIEZEL 2.0; PR memuat PRD mesin kurikulum. Keduanya sah. PRD main dipulihkan, PRD kurikulum
dipindah ke `memory/PRD-CURRICULUM-ENGINE.md`. Nol dokumen dibuang.

**3. Tautan sidebar Ruang Guru.** PR menambahkannya dengan teks Indonesia langsung. Tautannya
dipertahankan, labelnya dipindah ke `t('guru.nav-kurikulum')` dengan kunci id + th — kerangka
Ruang Guru dilihat guru Thai juga, dan biayanya hanya satu kunci.

**4. `.emergent/*`** (job id lingkungan): sisi main dipertahankan supaya PR tidak menimpa
pendaftaran job milik main.

### Utang yang dinyatakan terbuka, bukan disembunyikan

**75 literal Indonesia** di `features/curriculum/teacher-console.js` (56) dan
`features/curriculum/learning-mission.js` (19) didaftarkan sebagai anggaran di
`tests/th-ui-leak-test.js`, mengikuti keputusan owner 7 September 2026: **kurikulum Indonesia
tidak perlu Thai**. Alasannya sama dengan entri Kurikulum Merdeka yang sudah ada di gerbang
itu — guru Thai tidak mengajar di bawah Kurikulum Merdeka, jadi menerjemahkan "Tujuan
Pembelajaran" dan nama Fase resmi ke Thai bukan sia-sia melainkan menyesatkan.

Yang harus tetap terlihat: **19 dari 75 ada di layar MURID** (`misi.html`), bukan layar guru.
Kalau kelak ada murid Thai yang dibukakan konsol ini, sembilan belas kalimat itu sampai
kepadanya dalam bahasa Indonesia. Itu konsekuensi yang diterima sadar, bukan kebocoran yang
terlewat. Angka anggarannya menyatakan utang: naik satu tetap merah.

### Yang BELUM diputuskan owner, dan sengaja tidak kusentuh

`memory/test_credentials.md` dan `auth_testing.md` memuat nilai token owner master dan sandi
owner. Kode produksinya bersih — `backend/auth.py` membaca `OWNER_MASTER_TOKEN`, `JWT_SECRET`,
`ADMIN_PASSWORD` dari environment tanpa nilai cadangan tertanam. Tetapi kalau server yang
berjalan memakai nilai yang tertulis di kedua berkas itu, mempublikasikannya di repo sama
dengan membocorkannya. Menggantinya jadi placeholder adalah keputusan owner, bukan keputusan
sesi ini.

---

## m025-296 — pintu konsol kurikulum ditutup sampai backend benar-benar berjalan

m025-294 memasang tautan **"Kurikulum & Kompetensi"** di sidebar Ruang Guru. Tautan itu
menuju `./kurikulum.html`, dan seluruh isi halaman itu dilayani
`features/curriculum/fz-api.js` yang memanggil **`/api/...` relatif ke origin yang sama** —
artinya halaman itu menuntut server FastAPI berjalan di domain yang sama dengan PWA-nya.

**Diperiksa owner sendiri di fiezel.my.id, 7 September 2026:**

| Alamat | Jawaban |
|---|---|
| `/api/health` | **404** |
| `/kurikulum.html` | **404** |

Repo juga tidak memuat satu pun berkas yang memberi tahu hosting cara menjalankan Python:
tidak ada `passenger_wsgi.py`, tidak ada `Procfile`, `requirements.txt` hanya ada di dalam
`backend/` dan bukan di akar, dan tidak ada dokumen pemasangan. Jadi bukan kebetulan
backend-nya mati — memang belum pernah ada yang memasangnya.

Akibatnya di produksi: guru menekan tautan di sidebar, `kurikulum.html` terbuka, dan setiap
panggilan API gagal. Itu **lebih buruk daripada fitur yang belum ada** — fitur yang belum ada
tidak menjanjikan apa-apa, sedangkan pintu yang terbuka ke ruangan kosong menghabiskan
kepercayaan guru pada seluruh aplikasi.

### Yang dilakukan, dan yang sengaja TIDAK dilakukan

Bendera `curriculumConsole` ditambahkan ke `fiezel-ux-flags.js` dengan bawaan **mati**, plus
kembarannya di peta cadangan `app.js` — dua jalur, keduanya mati, sesuai konvensi bendera yang
sudah ada di repo. Tautan sidebar hanya dirender saat benderanya menyala.

**Mesinnya tidak disentuh sama sekali.** `backend/`, `kurikulum.html`, `misi.html`, dan
seluruh `features/curriculum/` tetap utuh dan tetap diuji. Ini menutup pintu, bukan membakar
ruangannya: begitu backend benar-benar berjalan, **satu bendera membalikkannya** dan tidak ada
kode yang perlu ditulis ulang. `tests/curriculum-console-gate-test.js` justru menuntut
berkas-berkas itu TETAP ADA — supaya "perbaikan" berikutnya tidak menghapus mesinnya.

Pembaca bendera di `fiezel-teacher-shell.js` mengikuti aturan yang sama dengan `uxOn()` di
`app.js`: nama tak dikenal dan FiezelUX yang absen sama-sama menjawab **false**. Diukur dengan
menjalankan fungsinya: bendera mati → `false`, bendera nyala → `true`, FiezelUX tidak ada →
`false`. Kegagalannya menyembunyikan pintu, bukan membukanya.

### Kalau kelak backend dipasang

Yang dibutuhkan bukan mengunggah berkas: hosting yang bisa menjalankan Python, MongoDB, dan
variabel rahasia (`OWNER_MASTER_TOKEN`, `JWT_SECRET`, `ADMIN_PASSWORD`, `MONGO_URL`). Hosting
cPanel bersama umumnya tidak bisa. Itu keputusan biaya dan waktu milik owner — dan sampai
keputusan itu diambil, benderanya tetap mati.
