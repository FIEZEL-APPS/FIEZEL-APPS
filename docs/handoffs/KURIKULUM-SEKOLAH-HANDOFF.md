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

---

## m025-298 — konsol kurikulum disiapkan untuk BENAR-BENAR hidup

m025-296 menutup pintunya. Owner memutuskan sebaliknya: **kerja agen itu harus hidup dan
aktif**. Keberatan sudah disampaikan (FIEZEL sudah punya backend hidup di
`fiezel-core.puter.work`; menambah FastAPI+MongoDB berarti tumpukan kedua, sistem login
ketiga, dua tempat data murid) dan owner tetap memilih menghidupkannya. Catatan ini
menyiapkan jalannya, bukan memperdebatkannya lagi.

### Akar teknis kenapa ia mati, dan bukan cuma "belum di-deploy"

`features/curriculum/fz-api.js` memanggil `fetch('/api' + path)` — **same-origin**. Itu benar
di lingkungan tempat berkas itu lahir (ingress mengarahkan `/api` ke FastAPI port 8001) dan
salah di produksi FIEZEL, karena `fiezel.my.id` hosting statis. Jadi memasang backend saja
TIDAK akan menghidupkannya: panggilannya tetap menembak domain yang salah.

Backend FIEZEL yang sudah hidup tidak pernah memakai asumsi itu — `fiezel-core-worker`
dipanggil lewat `CORE_CONFIG.workerUrl`, alamat **absolut dari konfigurasi**. `fz-api.js`
kini mengikuti pola yang sama, karena pola itu yang terbukti bekerja di produksi ini.

### Pintu diturunkan dari alamat, bukan dari bendera

Bendera manual bisa dinyalakan orang yang lupa memasang backend-nya — dan itu mengembalikan
persis bug yang ditutup m025-296. Karena itu penjaga pintu kini membaca
`FIEZEL_CURRICULUM_CONFIG.curriculumApiUrl`:

| Alamat | Bendera | Pintu |
|---|---|---|
| kosong | nyala | **tertutup** |
| terisi | nyala | terbuka |
| terisi | mati | **tertutup** (sakelar mati paksa tetap ada) |

Diukur dengan menjalankan fungsinya, bukan membaca kodenya. Bendera dinaikkan ke `true`
("fitur diizinkan"); yang menentukan tetap alamatnya, yang bawaannya **kosong**. Satu hal
yang perlu diisi owner, bukan dua.

Bawaan kosong itu juga kontrak distribusi: salinan repo ini tidak boleh mengirim data murid
ke server milik pemasang pertama.

### Gagal cepat, dengan kalimat yang menyebut sebabnya

Tanpa alamat, `fz-api` menolak SEBELUM menyentuh jaringan dan mengatakan alasannya. Versi
lama menembak halaman statis lalu memunculkan galat penguraian JSON — pesan yang tidak
memberi tahu siapa pun apa yang sebenarnya salah.

### Gerbangku sendiri tertipu komentarku, lagi

`curriculum-api-base-test` versi pertama menuduh `fz-api.js` masih memakai pola lama —
padahal yang ia baca adalah **kutipan pola lama di komentar** yang menjelaskan apa yang
pernah salah. Komentar kini dibuang sebelum diperiksa. Ini kesalahan yang sama persis dengan
m025-285 (`targetLanguage: 'off'` terbaca dari prosa); dicatat di sini supaya polanya
dikenali lebih cepat lain kali: **setiap gerbang yang mencari pola kode wajib membuang
komentar dulu.**

### Yang MASIH harus dikerjakan owner, dan tanpa itu pintunya tetap tertutup

1. MongoDB Atlas M0 (gratis) → dapatkan `MONGO_URL`
2. Render Web Service, root `backend/`, start `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Delapan variabel lingkungan; `OWNER_MASTER_TOKEN` dan `ADMIN_PASSWORD` **wajib nilai baru**
   — yang tertulis di `memory/test_credentials.md` sudah terpublikasi di repo
4. `CORS_ORIGINS=https://fiezel.my.id`
5. Alamat hasilnya ditempel ke `curriculumApiUrl` di `core-config.js`

Catatan jujur untuk owner: Render paket gratis tidur setelah 15 menit menganggur, jadi guru
yang membuka konsol setelah jeda menunggu ~50 detik. Untuk dipakai guru sungguhan, paketnya
berbayar.

---

## m025-301 — mesinnya DIJALANKAN, dan kabel yang hilang ketahuan

m025-298 menyiapkan jalannya tanpa pernah menjalankannya. Sesi ini menjalankannya sungguhan
— MongoDB 7.0.34 dan FastAPI hidup berdampingan, konsol dibuka di Chromium — dan justru di
situ ketahuan bahwa **mengisi `curriculumApiUrl` saja TIDAK akan menghidupkan konsolnya.**

### Kabel yang hilang

`kurikulum.html` dan `misi.html` hanya memuat dua skrip: `features/curriculum/fz-api.js` dan
modul layarnya. **`core-config.js` tidak pernah disebut di kedua halaman itu.** Padahal di
sanalah `FIEZEL_CURRICULUM_CONFIG.curriculumApiUrl` tinggal — satu-satunya tempat `fz-api.js`
mencari alamat backend.

Diukur di peramban sebelum perbaikan, dengan backend benar-benar hidup dan alamatnya sudah
ditempel: `kurikulum.html` melaporkan `FIEZEL_CURRICULUM_CONFIG = null`. Jadi setiap
panggilan ditolak sebelum menyentuh jaringan, dengan kalimat yang **menuduh owner belum
mengonfigurasi apa pun** — padahal owner sudah melakukan tepat apa yang diminta daftar
m025-298. Kegagalan yang menyalahkan orang yang benar adalah kegagalan yang paling mahal
dicari.

Perbaikannya satu baris per halaman: `<script src="./core-config.js"></script>` **sebelum**
`fz-api.js` (skrip klasik dieksekusi berurutan; terbalik = sama saja tidak dimuat).

`tests/curriculum-config-wiring-test.js` mengunci keduanya. Daftar halamannya tidak ditulis
tangan: gerbang memindai seluruh `*.html` di akar dan menuntut setiap halaman yang memuat
`fz-api.js` ikut memuat `core-config.js` lebih dulu — halaman konsol berikutnya terjaga
sendiri. Arah sebaliknya ikut dijaga: alamat bawaan di repo WAJIB tetap kosong.

### Yang benar-benar dijalankan, dan hasilnya

| Lapis | Hasil |
|---|---|
| MongoDB 7.0.34 (127.0.0.1:27017) | hidup, `dbpath` lokal |
| FastAPI `uvicorn server:app` (:8001) | `/api/health` → `{"ok":true, curriculum_nodes:731, questions:21}` |
| `backend/smoke_test.py` | **35 PASS / 0 FAIL** |
| `backend/unit_test.py` | **36 PASS / 0 FAIL** |
| `backend/tests/` (pytest) | **21 passed** |
| `kurikulum.html` di Chromium | login token guru tembus; Kopilot Guru terisi evidence nyata (8 TP dipantau, 7 belum diajarkan, rata-rata penguasaan 15%), nol `pageerror` |
| `misi.html` di Chromium | konfigurasi terbaca, layar murid tampil, nol `pageerror` |

Alamat lokal itu **tidak ditempel ke `core-config.js`**. Ia disuntikkan di peramban saat
pengujian, karena `http://127.0.0.1:8001` di dalam repo sama dengan pintu ke ruangan kosong
bagi setiap orang lain — persis bug m025-294 dalam bentuk baru.

### Catatan pemasangan yang baru ketahuan

* `backend/tests/test_fiezel_backend.py` membaca `REACT_APP_BACKEND_URL`; tanpa variabel itu
  ia gagal saat *collection*, bukan saat assert. Untuk pengujian lokal isi dengan alamat
  uvicorn-nya.
* `backend/unit_test.py` memanggil `asyncio.run` sendiri di akhir berkas. Dijalankan sebagai
  skrip (`python unit_test.py`) ia hijau; lewat `pytest` dua fungsinya dilaporkan merah
  karena `pytest-asyncio` memang tidak ada di `requirements.txt`. Itu cara pakainya, bukan
  kerusakan.
* Token owner yang dipakai suite adalah `FZ-OWNER-2026-MASTER` dari
  `memory/test_credentials.md` — nilai yang **sudah terpublikasi di repo**. Di produksi
  `OWNER_MASTER_TOKEN` dan `ADMIN_PASSWORD` wajib nilai baru; ini tetap keputusan owner yang
  belum diambil (lihat catatan m025-296 di atas).

### Yang MASIH milik owner

Daftar m025-298 tetap berlaku utuh (MongoDB Atlas → Render → delapan variabel →
`CORS_ORIGINS` → tempel alamatnya). Yang berubah: sekarang langkah ke-5 itu benar-benar
membuka pintunya, karena kabel yang membuatnya sia-sia sudah tersambung dan dijaga gerbang.

---

## m025-303 — alamat backend disambungkan, DAN DIVERIFIKASI

`curriculumApiUrl` diisi `https://fiezel-apps.onrender.com`, sehingga penjaga pintu
(m025-298) membuka tautan "Kurikulum & Kompetensi" di sidebar Ruang Guru.

Ini menuntaskan PR #395 (8 Sep), yang sengaja dibiarkan draf dengan satu syarat:

> Syarat gabung: owner membuka `https://fiezel-apps.onrender.com/api/health` di browser
> dan melihat balasan JSON.

**Syarat itu terpenuhi 12 Sep 2026.** Owner membukanya dan menempelkan jawabannya:

```json
{"ok":true,"service":"fiezel-learning-engine","curriculum_nodes":731,"questions":21,"attempts":0}
```

Angka `731` itu bukan sekadar "hidup": ia **sama persis** dengan yang dicetak
`backend/bootstrap.py` saat menyemai Atlas pada hari yang sama
(`SIAP. curriculum_nodes=731 questions=21`). Jadi yang dibuktikan bukan cuma servernya
menjawab, melainkan servernya menunjuk **database yang benar**. Pintu ini tidak dibuka
atas dasar tebakan.

### Jalan yang ditempuh sebelum sampai ke sini

Pemasangan backend permanen dicoba lebih dulu di cPanel ArenHost dan **gagal** — bukan
karena kodenya, melainkan karena Passenger tidak pernah dijalankan server itu walau menu
"Setup Python App" tersedia. Tiga lokasi dicoba, ketiganya 404 dalam 1-2 milidetik.
Catatan lengkapnya, berikut tes 30 detik yang membuktikannya sebelum orang membuang
waktu berjam-jam, ada di `docs/BACKEND-CPANEL-DEPLOY.md` §0a.

Render sendiri gagal tiga hari sebelumnya karena tidak ada berkas yang menentukan versi
Python — akar yang sudah dicatat PR #395 sebagai utang dan baru ditutup m025-318
(`backend/.python-version` = 3.11.9, dijaga dua assert di
`tests/backend-env-contract-test.js`). Sesudah itu deploy-nya bersih: wheel `cp311`,
`Application startup complete`, live.

### Gerbang ketiga ikut diselaraskan

PR #395 melonggarkan dua gerbang yang menuntut `curriculumApiUrl` **selalu kosong**
(`curriculum-api-base-test.js`, `curriculum-console-gate-test.js`), dengan alasan yang
masih berlaku: `CORE_CONFIG.workerUrl` di berkas yang sama sudah lama berisi alamat
operator, dan FIEZEL tanpa langkah build tidak punya tempat lain menaruh alamat.

Yang tidak bisa diketahui PR #395: `curriculum-config-wiring-test.js` lahir **sesudahnya**
(PR #403, 11 Sep) dan mewarisi tuntutan lama itu. Ia karena itu satu-satunya yang merah
saat alamatnya benar-benar diisi, dan kini diselaraskan dengan dua yang lain —
**kosong ATAU https tanpa ekor garis miring**. Dibuktikan masih bisa merah:
alamat `http://` -> merah, ekor `/` -> merah.

Yang menjaga bug pintu-ke-ruangan-kosong tetap **tidak** dilonggarkan di mana pun: ia
assert di `curriculum-console-gate-test.js` yang MENJALANKAN penjaganya
(alamat kosong -> pintu tertutup).

### Yang harus owner tahu

**Render paket gratis tidur setelah 15 menit menganggur.** Guru yang membuka konsol
sesudah jeda menunggu ~50 detik sebelum halamannya hidup. Untuk dipakai guru sungguhan
sehari-hari, paketnya perlu berbayar.

**Login Google belum hidup** (`EMERGENT_AUTH_SESSION_URL` ada di Render, pastikan
diawali `https://`). Login email+sandi jalan penuh, termasuk akun owner.

**Sandi owner yang berlaku** adalah yang tersimpan di `.env` pemasangan, bukan nilai
`ADMIN_PASSWORD` di Render: `seed_owner()` sengaja tidak menimpa sandi owner yang sudah
ada (perbaikan dari review PR #405).

---

## m025-318 — tiga pintu dicabut, tersisa satu: KelasKu

Keputusan owner, 14 September 2026, setelah menemukan sendiri bahwa layar
`kurikulum.html` meminta token `FZG-XXXXXXXX` yang **tidak bisa dibuat dari dashboard
mana pun**: *"cabut seluruhnya, cukup token KelasKu saja; begitu juga dengan murid,
cukup dengan memasukkan kode KelasKu."*

### Kenapa dua daftar guru bisa ada sekaligus

FIEZEL punya dua server, dan sampai commit ini keduanya punya daftar penggunanya
sendiri:

| | KelasKu (aplikasi) | Mesin kurikulum (konsol) |
|---|---|---|
| Server | Worker `fiezel-api` | FastAPI + MongoDB |
| Daftar undangan | D1 `teacher_invite` | Mongo `teacher_invites` |
| Ditukar di | `POST /api/account/teacher-activate` | `POST /api/auth/teacher/token` |
| Diterbitkan dari | dashboard owner | **tidak ada antarmuka — hanya curl** |

Dashboard owner menulis ke D1; konsol kurikulum membaca Mongo. Dua kotak yang tidak
pernah saling melihat, jadi token dari dashboard memang tidak akan pernah dikenali di
konsol. Ditambah `OWNER_MASTER_TOKEN` — kunci utama yang dikirim di setiap permintaan,
tidak pernah berputar, dan nilainya sudah terpublikasi di repo.

### Yang dicabut, beserta rutenya

`POST /auth/teacher/token`, `POST /auth/register`, `POST /auth/login`,
`POST /auth/google/session`, `POST|GET /owner/teacher-invites`, header `X-Owner-Token`,
seluruh penyimpanan `password_hash`/bcrypt, `seed_owner()`, dan bendera
`--reset-owner-password`. Empat env ikut mati: `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`OWNER_MASTER_TOKEN`, `EMERGENT_AUTH_SESSION_URL`.

Dicabut **beserta rutenya**, bukan hanya dari layar: pintu yang hilang dari layar tetapi
hidup di server bukan pintu tertutup — ia pintu yang tidak terlihat.

### Yang menggantikannya: tiket, bukan kata sandi

Cookie identitas KelasKu HttpOnly dan terikat `.fiezel.my.id`, jadi ia tidak akan pernah
terkirim ke mesin kurikulum yang berdiri di domain lain. Yang menyeberang karena itu
bukan cookie dan bukan kata sandi, melainkan **tiket sekali-pakai berumur dua menit**:

1. `POST /api/account/curriculum-ticket` di Worker (dijaga `roleGate`, peran dibaca dari
   D1 pada permintaan itu juga) menerbitkan tiket ber-HMAC;
2. `POST /api/auth/kelasku` di FastAPI memverifikasinya, membakar `jti`-nya, dan
   menukarnya dengan sesi mesin kurikulum.

Konsekuensi yang disengaja:

* **Peran diselaraskan setiap masuk**, bukan hanya saat akun dibuat. Guru yang dicabut
  owner di KelasKu kehilangan akses di sini pada tiket berikutnya — tanpa ada yang perlu
  ingat mencabutnya dua kali.
* **Peran tak dikenal jatuh ke murid**, bukan guru. Kegagalan pemetaan menutup pintu.
* **Tiket sekali pakai.** `jti` unik + indeks TTL di `kelasku_tickets`: tiket yang
  terpungut dari log tidak bisa dipakai ulang, dan barisnya membuang dirinya sendiri.
* **Murid cukup kode kelas.** Tidak ada pendaftaran, tidak ada sandi ketiga.

### Kunci bersama, dan satu-satunya cara ia bisa salah

`CURRICULUM_TICKET_KEY` wajib **sama persis** di `.env` backend dan di
`wrangler secret` Worker. Berbeda = setiap tiket ditolak, dan penolakannya sengaja tidak
menyebut sebabnya (membedakan "tanda tangan salah" dari "kedaluwarsa" memberi peta kepada
pemalsu). Karena itu `bootstrap.py` menolak kunci yang absen atau lebih pendek dari 32
karakter: gagal saat pemasangan, bukan 401 misterius pada guru pertama.

Bentuk tiket ditulis dua kali (WebCrypto di Worker, CPython di backend) karena tidak ada
satu berkas yang bisa dijalankan keduanya. `tests/curriculum-ticket-parity-test.js`
MENJALANKAN kedua sisi atas vektor yang sama, dua arah, plus penolakan — kalau salah satu
sisi mengubah urutan ruas JSON atau padding base64url, gerbang itu merah sebelum
produksi.

### Yang masih milik owner

Satu nilai baru di Worker: `wrangler secret put CURRICULUM_TICKET_KEY` dengan nilai yang
sama seperti di `.env` backend. Tanpa itu tombol "Masuk dengan akun KelasKu" menjawab
"jembatan belum dinyalakan" — terang-terangan, bukan diam.

## m025-326 — rilis yang terbit tanpa pernah terlihat

Sesudah seluruh rantai pintu KelasKu selesai dan terbit, owner membuka
`fiezel.my.id/app/kurikulum.html` dan melihat **layar login token `FZG-`** — layar yang
dicabut tiga rilis sebelumnya di PR #428. Kesimpulan yang wajar saat itu: "deploy-nya
gagal". Kesimpulan itu SALAH, dan jarak antara gejala dan sebabnya adalah isi catatan ini.

Pada menit yang sama:

* `deploy-site-verify` membaca produksi: `FIEZEL_PAGE_BUILD` **m025-325**, `SW_REV`
  **m025-325-paw-kembali-20260913**, keduanya sepadan dengan `main`.
* Berkasnya sendiri dibaca langsung lewat `?v=999` (melewati cache) — isinya **sudah**
  kode berpintu-KelasKu, lengkap dengan `data-testid="teacher-login-btn"`.

Servernya benar. Yang salah: peramban tidak pernah memintanya lagi.

### Kenapa halaman-halaman ini tidak terlindungi, padahal cangkang murid terlindungi

Cangkang murid punya penjaga generasi yang ketat — nama cache berkunci `SW_REV`, generasi
lain dibuang saat `activate`, dokumen pun dilayani dari `SHELL_CACHE` supaya tidak pernah
ada `index.html` build N+1 berjalan di atas JavaScript build N.

`kurikulum.html` dan `misi.html` **tidak ikut satu pun dari itu**, dan bukan karena
kelalaian: keduanya memang bukan bagian cangkang murid. Nol entri di `ASSETS` `sw.js` —
termasuk `fz-api.js`, `teacher-console.js`, `learning-mission.js`:

```
$ git show origin/main:sw.js | grep -o "'\./[^']*'" \
    | grep -cE "curriculum/(fz-api|teacher-console|learning-mission)|kurikulum\.html|misi\.html"
0
```

Jadi service worker tidak pernah menyentuhnya, dan seluruh kesegarannya diserahkan pada
cache HTTP biasa. Sementara rujukan skripnya telanjang — `./features/curriculum/teacher-console.js`,
URL yang sama persis untuk setiap rilis, selamanya. Tidak ada satu pun sinyal di URL itu
yang memberitahu peramban isinya sudah berubah, jadi peramban menyajikan salinan lama dan
ia **benar** melakukannya.

### Pelajaran yang berlaku di luar halaman ini

Repo ini punya banyak gerbang yang membuktikan isi berkas benar, dan satu verifier yang
membuktikan server menyajikan build yang benar. **Tidak ada satu pun** yang bisa melihat
celah di antaranya: repo hijau, server benar, layar salah. Setiap halaman yang berada di
LUAR `ASSETS` `sw.js` punya celah ini secara bawaan — kalau kelak lahir halaman ketiga di
luar cangkang, ia lahir dengan cacat yang sama sampai penandanya dipasang.

### Penjaganya sekarang

`?v=<build>` pada tiap rujukan lokal di kedua halaman, dan nomor itu wajib SAMA dengan
`FIEZEL_PAGE_BUILD`. `tools/bump-build.mjs` menulis ulang SEMUA kemunculannya pada setiap
bump (global — satu halaman memanggil empat berkas, dan satu yang tertinggal mengembalikan
cacat yang sama) dan menolak jalan kalau penandanya hilang.
`tests/curriculum-cache-version-test.js` menegakkan ketiganya, dan ketiga mode kegagalannya
dibuktikan merah lebih dulu: rujukan telanjang, penanda tertinggal satu rilis, dan halaman
yang dicabut dari `HALAMAN_BERVERSI`.

Header cache di server SENGAJA tidak dipakai sebagai jawaban: `.htaccess` ada di
`deploy/site-exclude.txt` sebagai milik server — repo tidak pernah mengirimkannya supaya
`rsync --delete` tidak menghapus aturan yang dipasang owner langsung di cPanel. Repo tidak
bisa menjamin header; ia bisa menjamin bentuk URL. Yang bisa dijamin itulah yang dijadikan
gerbang.
