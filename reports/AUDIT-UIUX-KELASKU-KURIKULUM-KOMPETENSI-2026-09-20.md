# Audit UI/UX — Dashboard KelasKu, fokus **Kurikulum & Kompetensi**

Tanggal: 2026-09-20 · Build saat audit: `m025-348` · Sifat: **audit statis** (pembacaan kode),
belum ada satu baris pun yang diubah.

Pemicu: permintaan OWNER — *"audit UI dan UX bagian dashboard KelasKu, terutama bagian
kurikulum dan kompetensi, apa yang perlu diperbaiki, dan fitur apa yang perlu ditambahkan."*

Catatan batas: backend kurikulum (`https://fiezel-apps.onrender.com`, `core-config.js:52`)
**tidak bisa dihubungi dari lingkungan audit ini** — proksi menolak dengan 403. Jadi semua
temuan di bawah adalah temuan yang bisa dibuktikan dari kode; tidak ada satu pun klaim di
sini yang bergantung pada tebakan tentang jawaban server.

---

## 0. Ringkasan

| # | Temuan | Permukaan | Keparahan |
|---|---|---|---|
| **X1** | Empat permukaan kurikulum hidup berdampingan dan tidak satu pun sepakat | lintas | **P0** |
| **X2** | Konsol "Kurikulum & Kompetensi" (`kurikulum.html`) tidak punya pintu di produk | guru | **P0** |
| **X3** | Mesin misi adaptif (`misi.html`) tidak punya pintu untuk murid | murid | **P0** |
| **X4** | Dua buku kompetensi yang tidak pernah bertemu; kuis guru tidak sampai ke tab Tugas | lintas | **P0** |
| **X5** | Misi mandiri murid dilaporkan ke guru sebagai "Tugas dari guru" | lintas | **P1** |
| **K1** | Paspor memakai *genre* sebagai kunci penguasaan → stempel bocor lintas kelas | murid | **P0** |
| **K2** | Paspor bisa lupa: riwayat dipotong 30 kiriman terakhir | murid | **P0** |
| **K3** | "Tuntas" ditetapkan satu percobaan 8 soal, tanpa retensi | murid | **P1** |
| **K4** | "Ulangi Misi" menimpa hasil lama — stempel bisa turun | murid | **P1** |
| **K5** | Urutan soal misi tidak pernah diacak | murid | **P1** |
| **K6** | Sub-bab dipajang tapi tidak bisa dilatih terpisah | murid | **P1** |
| **K7** | Layar menjanjikan "17 Mapel", isi paspor hanya Bahasa Inggris | murid | **P1** |
| **K8** | Badge **"Lengkap"** untuk mapel yang belum punya apa pun | murid | **P1** |
| **K9** | Lima mapel dikarang saat kelas masih kosong | murid | **P1** |
| **K10** | "Peta skill" murid adalah kode mati — tidak ada tab yang membukanya | murid | **P1** |
| **K11** | Misi mencemari peta skill dengan nama genre berbahasa Inggris | murid | **P2** |
| **K12** | Layar kurikulum menyebut dirinya "modal" tetapi mengganti seluruh halaman | murid | **P2** |
| **K13** | Seluruh isi unit misi disalin ke localStorage tiap kali misi dibuka | murid | **P2** |
| **K14** | Bila modul kurikulum gagal dimuat, dua tab mengecat layar kosong tanpa penjelasan | murid | **P2** |
| **G1** | `render()` mengecat ulang seluruh halaman → isian guru hilang saat mengetik | guru | **P0** |
| **G2** | Tabel Cakupan 6 kolom tanpa pembungkus gulir — hancur di ponsel | guru | **P1** |
| **G3** | Drawer & modal tanpa Escape, tanpa focus trap, scrim tak terjangkau keyboard | guru | **P1** |
| **G4** | Nol `prefers-reduced-motion` di seluruh `console.css` | guru | **P1** |
| **G5** | Cakupan, daftar murid, dan asesmen tanpa empty state | guru | **P1** |
| **G6** | Judul asesmen bawaan "Formatif Bilangan" muncul di ruang mapel apa pun | guru | **P2** |
| **G7** | JSON mentah dicetak ke layar guru | guru | **P2** |
| **G8** | Blueprint hanya C1–C4, form soal manual C1–C6 | guru | **P2** |
| **G9** | Bank soal dipotong 60 tanpa paginasi maupun penanda | guru | **P2** |
| **G10** | Ruang Guru diam-diam jatuh ke katalog lokal tanpa penanda asal data | guru | **P2** |
| **A1** | Zona Kurikulum & Kompetensi justru titik buta gerbang kebocoran Thai | th | **P1** |
| **A2** | Tanggal dipaksa `id-ID` untuk semua murid | th | **P1** |
| **A3** | Seluruh naskah tenggat literal Indonesia | th | **P1** |
| **A4** | Label fase kurikulum hardcoded | th | **P1** |
| **A5** | `role="tablist"` tanpa `aria-selected`/`aria-controls` | a11y | **P2** |

---

## 1. Peta permukaan — apa yang sebenarnya ada hari ini

Sebelum temuan, ini dulu, karena hampir semua masalah berat lahir dari peta ini.

| # | Permukaan | Berkas | Sumber data | Siapa yang bisa membukanya |
|---|---|---|---|---|
| 1 | KelasKu → **Misi Belajar & Paspor Kompetensi** | `features/class-hub/fiezel-class-hub.js:497,626,776` | 15 unit **statis** di `features/teacher/fiezel-teacher-curriculum.js` | murid, dari dalam aplikasi |
| 2 | **Misi Belajar** halaman penuh | `misi.html` + `features/curriculum/learning-mission.js` | backend kurikulum (adaptif) | **tidak ada pintu untuk murid** |
| 3 | Ruang Guru → **Kurikulum & Materi** | `features/teacher/fiezel-teacher-shell.js:2889,3037` | backend, dengan cadangan katalog lokal | guru, dari dalam aplikasi |
| 4 | **Kurikulum & Kompetensi** (konsol penuh) | `kurikulum.html` + `features/curriculum/teacher-console.js` | backend kurikulum | **tidak ada pintu di produk** |

Empat permukaan, tiga sumber data berbeda, dua bahasa visual yang tidak berhubungan
(cangkang Ruang Guru vs konsol hijau-gelap `console.css`).

### X1 — Empat permukaan kurikulum, tidak satu pun sepakat · **P0**

Permukaan 1 dan permukaan 2 dua-duanya bernama **"Misi Belajar"** dan dua-duanya
menampilkan **"Paspor"**, tetapi keduanya menghitung penguasaan dari basis yang berbeda dan
tidak pernah saling membaca. Permukaan 1 memakai 15 unit lokal; permukaan 2 memakai mesin
adaptif berbasis server dengan fase `warm-up → example → practice → challenge → transfer →
check`, penilaian keyakinan, petunjuk bertingkat, dan diagnosis miskonsepsi
(`learning-mission.js:14-15`).

Yang lebih lemah justru yang dipasang di jalan utama. Murid melihat permukaan 1; mesin yang
sebenarnya dibangun untuk pekerjaan ini tidak pernah mereka temui.

### X2 — Konsol "Kurikulum & Kompetensi" tanpa pintu · **P0**

`kurikulum.html` adalah permukaan kurikulum paling lengkap di repo ini: Beranda Guru dengan
rekomendasi harian, Kemajuan Belajar (matriks cakupan per TP), Standar Kurikulum (learning
graph), Bank Soal, Kuis & Ulangan (blueprint 8 jenis asesmen), dan Nilai & Rapor dengan draf
narasi e-Rapor.

Satu-satunya tautan ke sana di seluruh repo ada di `features/curriculum/learning-mission.js:66`
— yaitu di layar **murid**. Cangkang Ruang Guru tidak menautkannya
(`fiezel-teacher-shell.js:2889` mengarah ke view in-app `curriculum`, bukan ke halaman ini),
`index.html` tidak, `app.js` tidak. Guru hanya bisa sampai ke sana dengan mengetik alamatnya.

Pintunya pernah sengaja ditutup — dan alasannya masih tercatat rapi di
`fiezel-ux-flags.js:38-52`: pada 7 September 2026 backend-nya 404. Tetapi alamat backend
sekarang **terisi** (`core-config.js:52`) dan `konsolKurikulumSiap()` karena itu bernilai
benar. Yang tertinggal bukan keputusan, melainkan tautannya.

### X3 — Mesin misi adaptif tanpa pintu untuk murid · **P0**

Cermin dari X2. `misi.html` hanya ditautkan dari konsol **guru**
(`teacher-console.js:128,244`). Murid tidak punya jalan ke sana dari dalam aplikasi.

### X4 — Dua buku kompetensi yang tidak pernah bertemu · **P0**

| | Buku murid | Buku guru |
|---|---|---|
| Disimpan di | `localStorage['fiezel-class-submissions-v1']` | server: `/braincore/passport/<sid>`, `/coverage` |
| Diisi oleh | `finishRunner` (`fiezel-class-hub.js:402-419`) | asesmen yang dikerjakan lewat `misi.html` |
| Dibaca oleh | `curriculumModalView` (`:776`) | `vCoverage`, `openPassport` (`teacher-console.js:346,810`) |

Keduanya tidak punya satu pun titik temu. Akibat yang bisa dilihat langsung:

- Murid menuntaskan sembilan misi di KelasKu; matriks **Kemajuan Belajar** guru tetap
  berbunyi "Belum Diajarkan" untuk TP yang sama.
- Guru menekan **"🚀 Terbitkan Kuis untuk Murid"** (`teacher-console.js:747`); kuis itu
  mendarat di backend kurikulum dan **tidak pernah muncul di tab Tugas KelasKu**. Penulis
  `fiezel-learner-assignments-v1` di seluruh repo hanya dua —
  `features/teacher/fiezel-teacher-store.js:404` dan
  `features/tutor-action-center/fiezel-tutor-action-center.js:415` — dan tak satu pun
  berasal dari jalur kurikulum.

Ini bukan bug tampilan. Ini janji "bukti penguasaan" yang tidak punya pembaca.

Catatan sampingan dari jalur yang sama: `ASSIGN_KEY` dipotong `slice(-12)` di teacher-store
dan `slice(-5)` di tutor-action-center — dua batas berbeda untuk satu daftar yang sama,
jadi tugas lama menghilang tanpa pemberitahuan.

### X5 — Misi mandiri dilaporkan sebagai "Tugas dari guru" · **P1**

`startMissionAssignment` menyusun tugas semu dengan `teacher: 'Kurikulum Merdeka · …'`
(`fiezel-class-hub.js:759-760`), lalu `finishRunner` mengirimnya lewat
`recordAssignmentResult` (`:409`) yang mencatatnya di jurnal murid dengan label
`'Tugas dari guru'` (`features/learner-flow/fiezel-learner-flow.js:393`) **dan** mendorongnya
ke laporan kelas (`pushToClass`, `:403`).

Jadi: inisiatif belajar mandiri murid tercatat — kepada murid maupun kepada guru — sebagai
tugas yang diberikan guru. Layar hasilnya bahkan berbunyi *"Hasil ini dikirim ke **Kurikulum
Merdeka · English**"* (`fiezel-class-hub.js:912`), sebuah "guru" yang tidak ada.

---

## 2. KelasKu (murid) — Kurikulum & Kompetensi

### K1 — Paspor memakai *genre* sebagai kunci penguasaan · **P0**

```js
// features/class-hub/fiezel-class-hub.js:781-783
var found = allSubs.filter(function (s) {
  return s.id === 'misi_' + u.id || (s.skills && s.skills.indexOf(u.genre) !== -1);
});
```

`u.genre` bukan kunci unik. Dari 15 unit, tiga genre dipakai dua kali:

| Genre | Unit |
|---|---|
| `Descriptive Text` | `d_g7_descriptive_me` (kls 7), `d_g7_home_sweet_home` (kls 7) |
| `Procedure Text` | `d_g7_procedure_culinary` (kls 7), `d_g9_procedure_manual` (**kls 9**) |
| `Narrative Text` | `d_g8_narrative_fables` (kls 8), `e_g10_narrative_legend` (**kls 10**) |

Akibatnya murid kelas 7 yang menuntaskan *Procedure: Culinary* langsung mendapat stempel
**"Tuntas"** pada *Procedure Manual kelas 9* dan — lewat jalur yang sama — *Narrative kelas
10*. Paspor kompetensi yang mencap kompetensi yang belum pernah disentuh adalah paspor yang
tidak bisa dipercaya, dan ini persis dokumen yang paling menuntut kepercayaan.

### K2 — Paspor bisa lupa · **P0**

```js
// features/class-hub/fiezel-class-hub.js:414
writeJson(SUB_KEY, list.slice(-30));
```

Riwayat kiriman dipotong 30 entri terakhir. Karena `unitMastery` membaca daftar yang sama,
stempel "Tuntas" **menghilang diam-diam** begitu murid melewati 30 kiriman (tugas guru +
misi, bercampur). Murid rajin dihukum lebih cepat daripada murid pasif.

### K3 — "Tuntas" dari satu percobaan, tanpa retensi · **P1**

Ambangnya `m.acc >= 0.7` (`:809,817,864`) atas 7–9 soal per unit. Tujuh soal benar dari
sembilan, sekali, selamanya "Tuntas" — tanpa peluruhan, tanpa jadwal ulang, tanpa
pemeriksaan di konteks baru. Kartu induknya menjanjikan *"diagnosis otomatis, dan bukti
penguasaan materi"* (`:504`); yang dikirimkan adalah satu potret akurasi.

Bandingkan dengan `misi.html` yang sudah punya `due_reviews` + retrievability
(`teacher-console.js:831`). Kemampuan itu ada di repo — hanya tidak di permukaan yang
dilihat murid.

### K4 — "Ulangi Misi" bisa menurunkan stempel · **P1**

`finishRunner` membuang kiriman lama dengan id sama sebelum menambahkan yang baru (`:414`),
jadi yang tersimpan adalah **percobaan terakhir**. Tetapi `unitMastery` mereduksi dengan
`acc > max.acc` — bahasa "ambil yang terbaik". Dua aturan yang saling bertentangan di satu
layar: tombol **"Ulangi Misi"** (`:835`) yang tampak tanpa risiko sebenarnya bisa mencabut
stempel yang sudah diperoleh.

### K5 — Urutan soal misi tidak pernah diacak · **P1**

```js
// features/class-hub/fiezel-class-hub.js:369
if (a.shuffle || a.mode === 'ujian') order = shuffle(...)
```

Misi dibuat dengan `mode: 'latihan'` dan tanpa `shuffle` (`:762-765`). Mengulang misi berarti
menghadapi soal yang sama dalam urutan yang sama — yang dilatih adalah ingatan urutan, bukan
kompetensinya. Padahal "Ulangi Misi" adalah satu-satunya tombol yang ditawarkan pada unit
yang sudah tuntas.

### K6 — Sub-bab dipajang, tetapi tidak bisa dilatih · **P1**

Kartu misi menampilkan daftar sub-bab lengkap dengan nomor (`:881`), dan setiap butir soal
membawa `subChapterId` + `feature`. Tetapi `startMissionAssignment` (`:736-770`) selalu
mengirim **seluruh** item unit. Tidak ada jalan untuk "latih 1.2 Simple Present saja",
padahal datanya sudah ada dan justru itu yang dibutuhkan murid yang gagal di satu fitur
bahasa.

### K7 — "17 Mapel" di satu kartu, hanya Bahasa Inggris di kartu sebelahnya · **P1**

`fullClassSubjectsView` mengumumkan **"Kurikulum Merdeka (17 Mapel)"** (`:572`) dan
mendaftar ketujuh belasnya. Di layar yang sama, "Misi Belajar & Paspor Kompetensi" (`:504`)
berisi 15 unit yang **semuanya Bahasa Inggris** — tidak satu pun unit punya ruas mata
pelajaran sama sekali (diperiksa langsung: `subjectId` tidak ada pada 15/15 unit).

Murid kelas 8 yang membuka "Paspor Kompetensi" karena ingin melihat Matematika-nya akan
menemukan *Narrative Text*, dan tidak ada satu kalimat pun yang menjelaskan mengapa.

### K8 — Badge "Lengkap" untuk mapel yang belum punya apa pun · **P1**

```js
// features/class-hub/fiezel-class-hub.js:552
(taskCount ? '…' + taskCount + ' tugas</span>' : '<span class="ch-badge is-ok">Lengkap</span>')
```

Nol tugas dibaca sebagai "Lengkap", berwarna hijau. Murid yang gurunya belum mengirim apa
pun melihat sebelas mapel bertanda **selesai**.

### K9 — Lima mapel dikarang saat kelas masih kosong · **P1**

```js
// features/class-hub/fiezel-class-hub.js:528-530
if (!activeSubjects.length) activeSubjects = SUBJECTS_17.slice(0, 5);
```

Tanpa guru mapel dan tanpa tugas, layar tetap memajang Matematika, IPA, IPS, B. Indonesia,
B. Inggris — lengkap dengan badge hijau "Lengkap" dari K8. Kelas kosong ditampilkan sebagai
kelas yang sudah berjalan.

### K10 — "Peta skill" adalah kode mati · **P1**

`progresView()` (`:628-634`) menyusun KPI + peta skill murid. Tab bar hanya punya
`tugas · papan · kelas` (`:465`), dan tidak ada satu pun `data-tab="progres"` di seluruh
berkas. Satu-satunya ringkasan kompetensi lintas-skill yang dimiliki murid tidak punya
pintu, sementara Paspor yang lebih lemah (K1–K4) punya dua.

### K11 — Misi mencemari peta skill dengan nama genre Inggris · **P2**

`skills: [u.genre || 'curriculum']` (`:761`) → `record(s, 'Descriptive Text', …)` di
learner-flow → `skillLabel()` jatuh ke kunci mentah (`:36`). Peta skill karenanya mencampur
label Indonesia dengan "Descriptive Text", dan bagi murid Thai keduanya sama-sama asing.

### K12 — "Modal" yang bukan modal · **P2**

`curriculumModalView` menggantikan seluruh isi hub dan **menyembunyikan tab bar** (`:465`).
Tidak ada `popstate`, tidak ada pendaftaran ke `FiezelBackNav` (nol rujukan di berkas ini),
jadi tombol Back perangkat tidak mengembalikan murid ke KelasKu — ia meninggalkan aplikasi.
Satu-satunya jalan keluar adalah tombol "‹ Kembali ke KelasKu" di sudut atas.

### K13 — Seluruh unit disalin ke localStorage tiap misi dibuka · **P2**

`ui().activeMission = missionAssign` (`:769`) menyimpan seluruh item unit — prompt, opsi,
pembahasan `why`, catatan — ke dalam `fiezel-class-hub-v1`, dan `saveUi()` menuliskannya
ulang pada setiap perubahan UI.

### K14 — Layar kosong tanpa penjelasan · **P2**

`var units = FC ? FC.allUnits() : []` (`:777`). Bila `fiezel-teacher-curriculum.js` gagal
dimuat sementara alamat backend terisi, `kurikulumTersedia()` tetap benar (`:223`) sehingga
kartunya tampil — lalu kedua tabnya mengecat daftar kosong tanpa empty state, tanpa pesan
galat, tanpa tawaran memuat ulang. Paspor bahkan tetap memasang penyebut palsu:
`units.length || 15` (`:797`) → **"0/15 Bab Dikuasai"** di atas kisi kosong.

---

## 3. Konsol Ruang Guru — `kurikulum.html`

### G1 — Isian guru hilang saat mengetik · **P0**

`render()` menulis ulang `app.innerHTML` seutuhnya (`teacher-console.js:228-250`), dan
render dipanggil dari setiap penyelesaian permintaan latar: `loadCoverage`, `loadRecs`
(`:337-344`), health-check dan tiga kartu penyemai (`:421,528-531`), `loadBank` (`:689`),
`loadAssessments` (`:764`), serta `errToast` (`:1210`).

Semua isian di konsol ini adalah elemen DOM polos tanpa cadangan state:

| Isian | Baris | Yang hilang |
|---|---|---|
| `ndType` / `ndParent` / `ndName` (Tambah simpul) | `:447-453` | rumusan kompetensi yang sedang diketik |
| `pasteText` (Tempel Banyak Soal) | `:592` | tempelan puluhan soal |
| `mqStem`…`mqHint` (Tulis Manual) | `:575-584` | satu soal penuh beserta pembahasan |
| `roster` (Tambah murid) | `:775` | satu daftar kelas |

Jalur yang paling mudah dipicu: buka **Standar Kurikulum**, mulai mengetik nama simpul —
tiga permintaan status penyemai sedang berjalan di kartu tepat di sebelahnya, dan yang
pertama selesai menghapus yang sedang diketik.

### G2 — Matriks cakupan hancur di ponsel · **P1**

Tabel Kemajuan Belajar punya enam kolom (`:353-359`) di dalam `table{width:100%}`
(`console.css:112`) dan `.card` yang tidak punya `overflow-x` (`console.css:71`).
Satu-satunya `@media` di seluruh berkas (`console.css:169-173`) hanya menumpuk sidebar.
Layar matriks — bagian yang paling dibutuhkan guru di sela mengajar, dari ponsel — adalah
yang paling tidak siap untuk ponsel.

### G3 — Drawer & modal tanpa keyboard · **P1**

Drawer (detail TP, paspor murid) dan modal dipasang di `:249-250`. Tidak ada satu pun
`keydown`/`Escape` di seluruh berkas (hanya `click` di `:844` dan `change` di `:1167`),
tidak ada focus trap, dan scrim-nya `<div data-a="close">` — tidak bisa difokus, tidak bisa
ditekan dengan keyboard.

### G4 — Nol `prefers-reduced-motion` · **P1**

`console.css` mendefinisikan `rise`, `slide`, `pop`, `fade` (`:132-136`) dan `.rise` dipakai
pada setiap kartu KPI dengan penundaan bertingkat. Tidak ada satu blok
`@media (prefers-reduced-motion: reduce)` pun — padahal `style.css` aplikasi utama punya
tiga (`:418,757,915`). Halaman ini tidak memuat `style.css`, jadi tidak ada yang menutupinya.

### G5 — Tanpa empty state · **P1**

`vCoverage` memetakan `S.coverage.rows` langsung tanpa pemeriksaan panjang (`:359`). Kelas
baru menampilkan tabel berkepala tanpa isi dan tanpa satu kalimat pun tentang langkah
berikutnya. `vStudents` (`:782`) dan daftar asesmen mengulang pola yang sama, meski
pasangannya di Bank Soal sudah mengerjakannya dengan benar ("Antrean bersih.", "Belum ada
soal.").

### G6 — "Formatif Bilangan" di ruang mapel apa pun · **P2**

`<input id="bpTitle" value="Formatif Bilangan">` (`:727`) adalah judul khas Matematika yang
muncul juga di ruang Bahasa Inggris, IPA, dan seterusnya, walaupun `activeSubj()` sudah
diketahui di baris yang sama.

### G7 — JSON mentah di layar guru · **P2**

```js
// teacher-console.js:749
'<p class="mono muted">' + esc(JSON.stringify(S.blueprintCheck.availability)) + '</p>'
```

Keluaran mesin dicetak apa adanya ke layar yang dibaca guru.

### G8 — C1–C4 vs C1–C6 · **P2**

Distribusi kognitif blueprint hanya menawarkan C1–C4 (`:711-716`), sementara form soal
manual menawarkan C1–C6 (`:579`). Soal ber-C5/C6 bisa dibuat tetapi tidak bisa diminta.

### G9 — Bank soal dipotong 60 tanpa penanda · **P2**

`'/questions?limit=60'` (`:685`) lalu judulnya berbunyi "`S.questions.length` soal aktif"
(`:612`) — angka yang dibaca guru sebagai jumlah seluruh bank. Tidak ada paginasi dan tidak
ada keterangan "60 pertama".

### G10 — Cadangan diam-diam tanpa penanda asal data · **P2**

Ruang Guru in-app jatuh ke katalog kompetensi lokal saat pohon server kosong
(`fiezel-teacher-shell.js:3056-3066`) tanpa satu penanda pun. Guru tidak bisa membedakan
"kurikulum saya sudah tersemai di server" dari "saya sedang melihat contoh bawaan" — dan
justru perbedaan itulah yang menentukan apakah kartu penyemai perlu ditekan.

---

## 4. Bahasa Thai & aksesibilitas

### A1 — Zona ini justru titik buta gerbangnya · **P1**

`tests/th-ui-leak-test.js` menyatakan `fiezel-class-hub.js` punya utang 5 literal dan
**PASS**. Gerbang itu mendeteksi lewat `ID_WORDS` — dan daftar katanya tidak memuat satu pun
kosakata zona ini: *Menunggu, Tenggat, Mapel, Fase, Kurikulum, Merdeka, Tuntas, Misi,
Paspor, Kompetensi, Lengkap, Terdaftar, Penugasan*.

Yang lolos, dengan barisnya:

| Baris | Naskah | Terbaca murid Thai sebagai |
|---|---|---|
| `:552` | `Lengkap` | teks Indonesia |
| `:555` | `Menunggu guru` | teks Indonesia |
| `:572` | `Kurikulum Merdeka (17 Mapel)` | teks Indonesia |
| `:573` | `… Guru Terdaftar` | teks Indonesia |
| `:576` | `Satu kode kelas menghubungkan seluruh guru mata pelajaran…` | satu paragraf penuh |
| `:586` | `Menunggu penugasan` | teks Indonesia |
| `:819`, `:865` | `Fase D (SMP)` / `Fase E (SMA 10)` / `Fase F (SMA 11-12)` | teks Indonesia |
| `:759-760` | `Kurikulum Merdeka` sebagai nama "guru" | teks Indonesia |
| `:912` | `Lihat pembahasan`, `Hasil ini dikirim ke …` | teks Indonesia |

Ini bukan tuduhan bahwa gerbangnya salah dibuat — ia memang bekerja pada kosakata yang
diberikan padanya. Yang perlu dicatat adalah **ke mana kosakata itu belum sampai**, dan
jawabannya persis area yang sedang diaudit.

### A2 — Tanggal dipaksa `id-ID` · **P1**

```js
// features/class-hub/fiezel-class-hub.js:35
d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
```

Setiap tenggat, setiap tanggal selesai, setiap stempel paspor — "Sen, 3 Mar" untuk murid
yang memilih ภาษาไทย. Locale-nya dipaku, bukan diturunkan dari `learnerLocale`.

### A3 — Naskah tenggat seluruhnya literal Indonesia · **P1**

`deadlineText` (`:41`): `'Tanpa tenggat'`, `'Lewat N hari'`, `'Tenggat hari ini'`,
`'Tenggat besok'`, `'Tenggat N hari lagi'` — lima kalimat, nol panggilan `t()`. Ditambah
`' (terlambat)'` di `statusChip` (`:42`).

### A4 — Label fase hardcoded · **P1**

`:819` dan `:865` menuliskan label fase dua kali, sebagai literal, di dua fungsi berbeda —
satu-satunya konteks jenjang yang dimiliki kartu paspor.

### A5 — `role="tablist"` tanpa kontraknya · **P2**

Tab murid (`:465`), tab guru (`:994`), dan segmen sumber soal (`:1051`) memakai
`role="tablist"` + `role="tab"` tanpa `aria-selected`, tanpa `aria-controls`, tanpa
pengelolaan `tabindex`, dan badan tabnya bukan `role="tabpanel"`. Pembaca layar mengumumkan
"tab" lalu tidak bisa mengatakan tab mana yang aktif. Pengalih Misi/Paspor (`:791`) bahkan
tidak punya peran sama sekali — dua `<button>` polos.

---

## 5. Fitur yang perlu ditambahkan

Diurutkan menurut yang paling mengubah nilai produk, bukan yang paling mudah.

### F1 — **Satu buku kompetensi** (prasyarat semua yang lain)

Satu sumber kebenaran untuk "apa yang sudah dikuasai murid ini", dibaca oleh keempat
permukaan. Paspor murid berhenti menjadi cache localStorage 30-entri dan menjadi cermin dari
paspor yang sama yang dibaca guru. Tanpa ini, setiap fitur di bawah dibangun dua kali.

### F2 — **Pintu Kurikulum & Kompetensi di Ruang Guru**

Satu butir navigasi ke konsol yang sudah jadi (X2). Modalnya nyaris nol; yang didapat guru:
rekomendasi harian, matriks cakupan, rencana 45 menit, pembentukan kelompok, dan draf narasi
e-Rapor — semuanya sudah ditulis dan sudah diuji.

### F3 — **Paspor per sub-bab + "latih yang merah saja"**

Data sub-bab sudah lengkap di setiap unit dan setiap butir soal (K6). Yang belum ada adalah
tampilannya: baris per sub-bab dengan status sendiri, dan satu tombol yang menyusun latihan
dari sub-bab yang merah saja. Ini mengubah paspor dari rapor menjadi alat.

### F4 — **Retensi & jadwal ulang di paspor murid**

`due_reviews` + retrievability sudah hidup di sisi server (`teacher-console.js:831`). Yang
dibutuhkan murid: stempel yang memudar dan kartu **"Perlu diulang minggu ini"**. Ini yang
membuat "Tuntas" berarti tuntas (K3).

### F5 — **Kurikulum untuk 16 mapel lain — atau jujur menyebut ruang lingkupnya**

Dua jalan yang sah, satu yang tidak. Yang tidak: membiarkan layar menjanjikan 17 mapel
sementara paspornya hanya Bahasa Inggris (K7). Jalan cepat: beri ruang lingkup pada kartunya
("Bahasa Inggris · Fase D–F") dan beri mapel lain status jujur "belum tersedia". Jalan
panjang: penyemai 17 mapel sudah ada di konsol guru (`teacher-console.js:502-512`, 210 TP /
420 kompetensi) — yang belum ada adalah jembatannya ke paspor murid, yaitu F1.

### F6 — **Kartu "Target minggu ini"**

Lima belas kartu misi sejajar adalah daftar, bukan panduan. Satu kartu di atas KelasKu yang
menyebut satu kompetensi berikutnya beserta alasannya ("karena 1.2 Simple Present masih
merah") mengubah layar ini dari katalog menjadi jalur. Mesin pemilihnya sudah ada di
`learning-mission.js`.

### F7 — **Rapor kompetensi yang bisa dibagikan**

`makeRaporNarrative` (`teacher-console.js:787`) sudah menyusun draf narasi e-Rapor per murid.
Yang belum ada: ekspor ke PDF/gambar untuk orang tua, dan versi murid dari dokumen yang sama.
Ini pekerjaan kecil di atas fondasi yang sudah berdiri.

### F8 — **Cakupan per mapel untuk wali kelas**

Matriks cakupan hari ini satu mapel per layar. Wali kelas perlu satu halaman: 17 mapel × status
cakupan, untuk tahu mapel mana yang tertinggal. Datanya sudah tersedia dari `/coverage` per
`subject_id`.

### F9 — **Misi kurikulum yang bisa dikerjakan luring**

KelasKu sudah PWA dengan service worker dan bank soal ter-cache. Misi kurikulum belum ikut:
unit statis ada di cache (`sw.js`), tetapi jalur backend `misi.html` tidak. Untuk pilot
sekolah (`docs/pilot/`), ini menentukan apakah fiturnya bisa dipakai sama sekali.

### F10 — **Papan "kelas saya vs kurikulum"**

Satu layar untuk guru mapel: seluruh TP di sumbu tegak, seluruh murid di sumbu datar, warna
per penguasaan. Cakupan hari ini menjawab "TP mana yang lemah"; papan ini menjawab "siapa
yang tertinggal di TP mana" dalam satu pandangan. Data `/coverage` + `/braincore/tp-detail`
sudah cukup.

---

## 6. Urutan kerja yang disarankan

| Gelombang | Isi | Alasan |
|---|---|---|
| **1 — kejujuran layar** | K1, K2, K8, K9, K14, G5, F5 (jalan cepat) | Tidak ada yang lebih merusak kepercayaan daripada stempel dan badge yang salah. Semua ini perbaikan lokal, tanpa sentuhan backend. |
| **2 — pintu** | X2, X3, K10, G1 | Fitur yang sudah selesai tetapi tidak bisa dibuka adalah nilai yang sudah dibayar dan belum diambil. G1 masuk di sini karena tidak ada gunanya membuka pintu ke konsol yang menghapus ketikan gurunya. |
| **3 — satu buku** | X4, X5, F1 | Pekerjaan terberat, dan prasyarat semua yang bermakna sesudahnya. |
| **4 — alat, bukan rapor** | F3, F4, F6, K3–K6 | Di sinilah "kurikulum & kompetensi" berhenti menjadi tampilan dan mulai menjadi pengajaran. |
| **5 — jangkauan** | A1–A5, G2–G4, F7–F10 | Bahasa Thai, ponsel, keyboard, dan wali kelas. Berdiri sendiri, bisa dikerjakan paralel. |

---

## 7. Catatan metode

- Seluruh temuan dibaca dari kode pada `main` di build `m025-348`; tidak ada perubahan kode
  di PR ini.
- Klaim tentang isi unit kurikulum (15 unit, semua Bahasa Inggris, tabrakan genre)
  diverifikasi dengan memuat `features/teacher/fiezel-teacher-curriculum.js` langsung di
  Node dan memeriksa `allUnits()`.
- Klaim tentang penulis `fiezel-learner-assignments-v1` diverifikasi dengan penyisiran
  seluruh `features/**` dan `app.js`.
- Klaim tentang ketiadaan pintu ke `kurikulum.html` / `misi.html` diverifikasi dengan
  penyisiran seluruh `*.html` dan `*.js` di luar `tests/`.
- Backend kurikulum tidak bisa dihubungi dari lingkungan audit (proksi 403), jadi tidak ada
  temuan di sini yang bergantung pada perilaku server saat dijalankan.
