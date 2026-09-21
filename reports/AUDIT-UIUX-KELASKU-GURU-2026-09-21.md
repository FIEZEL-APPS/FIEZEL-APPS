# Audit UI/UX KelasKu (sisi guru) — 21 September 2026

Otoritas: **OWNER**. Lingkup yang diminta: audit dan perbaikan UI/UX KelasKu, cabut panel
Kurikulum & Kompetensi dari dasbor, integrasikan sistemnya ke halaman dasbor KelasKu,
"tidak boleh ada yang kurang, semua sistem harus hidup, dan saling terhubung ke semuanya
frontend dan backend". Keputusan owner menyusul: **sisi guru saja, sisi murid dipertahankan.**

Rilis: `m025-357`. Gerbang baru: `tests/kelasku-kurikulum-dashboard-test.js` (21 assert).

---

## 0. Apa yang sebenarnya dipindahkan

Sebelum rilis ini, "Kurikulum & Kompetensi" adalah **butir nav kedelapan** di sidebar Ruang
Guru (`tg-nav-curriculum`), membuka view `curriculum` tersendiri. Isi view itu tepat dua hal:
pohon kurikulum, dan satu kartu pintu keluar ke `kurikulum.html`.

Artinya guru **meninggalkan dasbor KelasKu** justru untuk sampai ke pekerjaan yang paling
dekat dengan kelasnya — menyemai bank, membaca kompetensi, dan mengubah kompetensi menjadi
tugas. Butir nav itu dicabut; sistemnya kini tab di dalam hub KelasKu, sejajar dengan
Kelas Saya / Tugas / Buat Tugas / Hasil / Braincore.

Pembagian kerjanya sengaja **tidak** memindahkan mesinnya: FZEngine, alamat backend, keadaan
muat, dan ketiga penyemai tetap milik `features/teacher/fiezel-teacher-shell.js`. Yang
menyeberang ke hub lewat `env` hanya tiga fungsi — penjaga, perender, pemicu muat. Hub
menyediakan TEMPATNYA, shell menyediakan ISINYA. Dua salinan mesin adalah dua tempat yang
akan menyimpang.

---

## 1. Temuan

### T1 — MERAH · Mesin penyemai terpasang lengkap, tanpa satu pun tombol yang memanggilnya

`fiezel-teacher-shell.js` punya `runSeedEnglish()`, `runSeedMapel()`, dan `runSeedSoal()` —
masing-masing memuat FZEngine, masuk sebagai guru, memanggil `/seed/*`, menoast hasilnya,
lalu memuat ulang pohon. Ketiganya ditangani pengirim aksi berkas itu:

```
case 'seed-mapel':   runSeedMapel();   return;
case 'seed-english': runSeedEnglish(); return;
case 'seed-soal':    runSeedSoal();    return;
```

Disisir ke seluruh repo, **nol** tombol di Ruang Guru yang mengirimkan ketiga aksi itu.
Satu-satunya pemancarnya ada di `features/curriculum/teacher-console.js`, yaitu di
**halaman yang lain** (`kurikulum.html`). Jadi ~60 baris mesin penyemai duduk mati di
teacher shell sejak dipasang.

Kerusakan keduanya lebih halus dan lebih merugikan. Naskah `guru.kurikulum-sumber-lokal`
yang tampil di layar itu berbunyi:

> "Sumber: katalog cadangan perangkat — server belum menyemai kurikulum mapel ini.
> **Tekan kartu penyemai** agar papan ini terisi dari server KelasKu."

Kartu penyemai yang disuruhnya tekan tidak ada di layar itu. Layar yang menyuruh menekan
sesuatu yang tidak ada membuat guru mengira dirinya yang tidak becus mencari.

**Perbaikan.** Panel memasang ketiga kartu penyemai, dengan pola jujur yang sama dengan
`kartuSemai()` di konsol penuh: **status dibaca lebih dulu**, tombolnya baru ditawarkan
sesudahnya. Tiga keadaan dibedakan tegas — "sedang memeriksa", "belum tersemai", dan
"status gagal dibaca". Yang ketiga TIDAK jatuh ke yang kedua: gagal-baca berarti angkanya
tidak diketahui, bukan berarti banknya kosong, dan menyamakannya membuat guru menyemai
ulang bank yang sebenarnya sudah penuh. Keadaan sibuk dibuat **per kartu** (`ui.seedBusy`),
bukan satu bendera global — menekan satu penyemai tidak lagi mematikan tombol dua kartu
lainnya. Sesudah penyemaian sukses, status dan kedalaman bank **dipaksa** dibaca ulang:
kartu yang masih memajang angka sebelum penyemaian adalah kartu yang berbohong tepat pada
detik guru paling memperhatikannya.

Kalimat `guru.kurikulum-sumber-lokal` kini menunjuk kartu yang benar-benar ada di layar
yang sama. Naskahnya tidak diubah — yang diubah adalah kenyataannya.

### T2 — MERAH · Empat belas kelas CSS dipancarkan sejak m025-294, tidak satu pun pernah ditulis

Perender kurikulum memancarkan `.tg-comp-head`, `.tg-comp-code`, `.tg-comp-desc`,
`.tg-comp-actions`, `.tg-bloom-badge`, `.tg-tp-head`, `.tg-tp-children`,
`.tg-curriculum-card-head`, `.tg-curriculum-card-body`, `.tg-curriculum-actions`,
`.tg-label-inline`, `.tg-select`, `.tg-seed-badge`, dan `.tg-center`.

Dicari di `features/teacher/teacher-shell.css`: **nol** aturan untuk keempat belasnya.
Layarnya karena itu tergambar dengan bawaan peramban — kode kompetensi sebesar judulnya,
dua tombol aksi menempel tanpa jarak, dan pemilih mapel sebagai `<select>` telanjang di
tengah papan bernada kertas.

Selama panel itu tersembunyi di balik butir nav kedelapan, kerusakannya jarang terlihat.
Sejak ia menjadi tab dasbor, ia harus terbaca seperti bagian dasbor yang lain.

**Perbaikan.** Keempat belas kelas ditulis memakai token yang sudah ada
(`--tg-paper`, `--tg-line`, `--tg-sage-soft`, `--tg-amber-soft`, `--tg-mono`), jadi tidak
ada warna baru yang perlu diuji kontras ulang. Ditambah: baris kompetensi **menumpuk di
ponsel** (`max-width:720px`) — judul kompetensi yang panjang sebelumnya akan meremas dua
tombol aksinya menjadi pita setinggi tiga baris.

### T3 — MERAH · `t()` di teacher shell tidak pernah mengisi `{placeholder}`

Tanda tangannya `t(k, fb)` — dua argumen. `FiezelI18n.t()` menerima `params`, dan
`t()` di `features/class-hub/fiezel-class-hub.js` sudah meneruskannya sejak lama; yang di
teacher shell tidak.

Akibatnya: setiap kalimat berlubang yang jatuh ke **jalur cadangan** (FiezelI18n belum
termuat, atau kuncinya belum terdaftar) tercetak lengkap dengan kurung kurawalnya —
`Sudah tersemai: {tp} tujuan pembelajaran`. Bug ini tidak terlihat selama tidak ada
kalimat berlubang di shell; panel ini membawa enam.

**Perbaikan.** Tanda tangannya disejajarkan menjadi `t(k, fb, params)`, dengan substitusi
diulang di sisi klien supaya jalur cadangan dan jalur terdaftar menghasilkan kalimat yang
sama. Dikunci assert **yang dijalankan** (E2 di gerbang baru): fungsinya diekstrak dari
sumber dan benar-benar dipanggil.

### T4 — KUNING · "Kompetensi" tanpa satu pun angka di belakangnya

Baris kompetensi lama hanya membawa kode, nama, dan badge Bloom. Guru tidak punya cara tahu
kompetensi mana yang **benar-benar bisa dilatih hari ini** dan mana yang baru judul —
padahal itu tepat pertanyaan yang ia bawa ke layar ini sebelum menekan "+ Buat Tugas".

**Perbaikan.** Setiap baris kompetensi membawa kedalaman banknya, dihitung dari
`/questions?subject_id=…` — bank yang **sama** yang akan dipakai tugasnya, jadi angkanya
menjawab persis pertanyaan itu. Kompetensi tanpa soal memakai nada bata, bukan abu-abu: ia
bukan sekadar "tidak ada angka", ia kompetensi yang belum bisa dilatih.

Tiga kejujuran dikunci gerbang:

1. **Dicocokkan lewat ID SIMPUL, bukan kode.** Kode kompetensi dipakai bersama lintas mapel
   dan tingkat; mencocokkan lewat kode akan menempelkan soal mapel lain ke kompetensi ini.
   Aturan yang sama dengan kontrak §1 di handoff (bukti dikunci pada ID, tidak pernah pada
   label yang dipakai bersama).
2. **Batas 1000 dinyatakan**, bukan disembunyikan. Kalau jawabannya menyentuh batas, panel
   memasang penanda bahwa hitungannya terpotong halaman — angka terpotong yang diam akan
   membuat guru menyimpulkan kompetensi tertentu kosong padahal hanya tidak terbawa. Pola
   penanda ini sama dengan `bank-capped-note` di konsol penuh.
3. **Tidak pernah tergambar untuk mapel yang salah.** `bankDepthSubject` dibandingkan dengan
   mapel aktif sebelum satu angka pun dicetak; ganti mapel memaksa hitungan dibaca ulang.
   Tanpa ini, pindah mapel meninggalkan hitungan mapel sebelumnya menempel pada kompetensi
   mapel baru — angka yang salah tetapi terlihat meyakinkan.

Kedalaman bank adalah **hiasan yang berguna, bukan syarat**: kalau permintaannya gagal,
pohon tetap terbaca dan tombol "+ Buat Tugas" tetap hidup, yang hilang hanya angkanya.

### T5 — KUNING · Satu tombol Muat Ulang yang hanya menyegarkan sepertiga layar

`refresh-curriculum` dulu hanya memanggil `loadCurriculumTree()`. Sejak panel membawa tiga
sumber (pohon, status penyemai, kedalaman bank), tombol yang menyegarkan satu sumber
meninggalkan dua lainnya pada angka lama — dan guru tidak punya cara menebak bagian mana
yang basi.

**Perbaikan.** Satu tombol menyegarkan ketiganya, sekaligus membersihkan
`ui.curriculumError` supaya layar gagal-muat punya jalan keluar yang benar-benar mencoba lagi.

### T6 — KUNING · Gagal muat dan pohon kosong sama-sama berakhir sebagai ruang putih

Versi lama merender `tree.map(renderNode).join('')` tanpa cabang untuk daftar kosong, dan
`ui.curriculumError` tidak pernah dipakai perender sama sekali — ia diisi `loadCurriculumTree`
lalu tidak dibaca siapa pun. Kurikulum yang gagal dimuat dan mapel yang memang belum disemai
menghasilkan layar yang **identik**: kosong, diam.

**Perbaikan.** Tiga keadaan dibedakan: gagal-muat menyebutkan pesannya dan menawarkan
Muat Ulang; pohon kosong berkata bahwa mapel ini belum disemai dan menunjuk kartu penyemai
yang ada di layar yang sama; sedang-memuat tetap memajang kartu penyemai (yang tidak
menunggu pohon) alih-alih menyembunyikan seluruh layar.

### T7 — KUNING · `st.view` tersimpan, dan viewnya baru saja dihapus

`st.view` ikut ke localStorage lewat `FiezelTeacherStore`. Guru yang menutup aplikasi di
layar Kurikulum akan membukanya kembali di `st.view === 'curriculum'` — view yang sejak
rilis ini tidak ada lagi. `render()` jatuh ke `views.briefing`, jadi ia mendarat di
Ringkasan Hari Ini tanpa satu pun petunjuk ke mana perginya layar yang ia tinggalkan.

**Perbaikan.** Migrasi di `mount()`: view lama dibawa ke `hub` dengan tab `kurikulum`
sudah terbuka. Kalau penjaganya padam (backend dicabut), ia jatuh ke `briefing` —
bukan ke hub dengan tab yang tidak akan terpasang.

### T8 — KUNING · Panel kurikulum dulu bisa dibuka tanpa kelas; tab biasanya tidak

Gerbang render lama meloloskan `st.view === 'curriculum'` walau guru belum punya kelas sama
sekali. Memindahkan panel ke dalam hub berisiko diam-diam menghilangkan itu, karena
`views.hub` hanya dirender saat `st.classes.length`.

**Perbaikan.** Gerbangnya kini meloloskan `st.view === 'hub'`, dan tab Kurikulum adalah
**satu-satunya** tab yang dirender tanpa kelas aktif. Alasannya bukan kenyamanan:
menyemai bank, membaca kompetensi, dan menghitung kedalaman bank tidak menyentuh satu pun
kelas. Mengunci pekerjaan persiapan di balik "Buat kelas dulu" memaksa guru membuat kelas
yang belum tentu ia butuhkan hari itu. Layar pembuka guru baru tidak berubah — bawaan
`st.view` tetap `briefing`, jadi `welcome()` tetap yang pertama ia lihat.

### T9 — MERAH · Tiga puluh ikon di KelasKu merender kotak kosong, dan gerbangnya tidak bisa melihatnya

Temuan terbesar audit ini, dan ia ditemukan justru karena panel kurikulum dipindah: ikon
`sprout` yang dipakai kartu penyemai baru ternyata tidak ada di mana pun.

`lucide.min.js` di repo ini **bukan** pustaka penuh — ia subset yang dikurasi tangan.
`createIcons()` melewati simpul yang namanya tidak dikenal (`if(!data)return;`), jadi yang
tersisa di layar adalah `<i>` kosong: tanpa error, tanpa log, tanpa satu pun gerbang yang
melihatnya. Itu persis kelas bug yang melahirkan `tests/lucide-icon-coverage-test.js`
pada m025-254.

Gerbang itu **tidak pernah memeriksa dua permukaan terbesar KelasKu.** Pemindainya hanya
membaca `data-lucide="nama"` yang tertulis literal di sumber, sedangkan baik
`features/class-hub/fiezel-class-hub.js` maupun `features/teacher/fiezel-teacher-shell.js`
memusatkan ikonnya di satu pembantu:

```js
function icon(n) { return '<i data-lucide="' + n + '" aria-hidden="true"></i>'; }
```

Di sumbernya yang ada hanyalah `data-lucide="' + n + '"` — mengandung kutip, jadi regex
pemindai menolaknya, dan **seluruh** pemanggilan di kedua berkas itu lolos tanpa diperiksa
satu pun. Gerbangnya hijau selama berbulan-bulan sambil melewati 98 pemanggilan.

Disisir tangan pada 21 September 2026:

| Permukaan | Ikon dipanggil | Merender KOSONG |
|---|---:|---:|
| `fiezel-class-hub.js` (murid **dan** guru) | 43 | **21** |
| `fiezel-teacher-shell.js` | 55 | **9** |

Tiga puluh nama berbeda. Di antaranya `brain` — **ikon tab Braincore itu sendiri** —
lalu `clock`, `calendar`, `target`, `inbox`, `plus`, `trash-2`, `pencil`, `user-check`,
`compass`, `rotate-cw`, `qr-code`, `life-buoy`, `bar-chart-3`. Enam di antaranya duduk
tepat di panel kurikulum yang dipindahkan rilis ini (`compass` di pintu konsol,
`rotate-cw` di tombol Muat Ulang, `bookmark`, `inbox`, `hard-drive`, `layers`).

Teacher shell punya registry inline sendiri (`features/teacher/fiezel-teacher-icons.js`,
50 glyph) karena "lucide.min.js repo hanya memuat ikon cangkang murid" — `icon()` di sana
memeriksanya lebih dulu lalu jatuh ke `data-lucide`. Itu yang menyelamatkan sebagian besar
Ruang Guru; class-hub tidak punya jaring itu sama sekali.

**Perbaikan, dua lapis.**

1. **26 glyph ditambahkan** ke subset `lucide.min.js` (92 → 118), memakai definisi Lucide
   ISC yang sama dengan isi subset yang sudah ada. Satu berkas menutup kedua permukaan
   sekaligus, karena teacher shell memang jatuh ke `data-lucide` untuk glyph yang tidak
   ada di registry-nya. Sesudahnya: **0 dari 98** pemanggilan yang merender kosong.

2. **Titik butanya ditutup di gerbang**, dan ini yang membuatnya tidak bisa kembali.
   `lucide-icon-coverage-test.js` kini ikut memindai pemanggilan `icon('nama')` — hanya di
   berkas yang pembantunya benar-benar memancarkan `data-lucide` (nama `icon(` terlalu
   lazim untuk dipindai buta) — dengan **dua himpunan penyelesaian yang berbeda**: class-hub
   diuji terhadap subset lucide saja, teacher shell terhadap subset **ditambah** registry
   inline-nya. Menyamakan keduanya akan melahirkan merah palsu di class-hub untuk glyph
   yang memang hanya dipunyai Ruang Guru. Cakupan gerbang naik dari 75 menjadi 173 nama.

   Red-proof: glyph `brain` dicabut dari subset → gerbang **MERAH** dengan nama berkas dan
   nama ikonnya; dipulihkan → hijau.

---

## 2. Yang SENGAJA tidak dibawa, dan kenapa

**Matriks cakupan per kelas** (`/coverage`, `/braincore/tp-detail`) tidak dibawa ke panel
ini, dan itu bukan karena kehabisan waktu.

Endpoint itu menuntut `class_id` milik **backend kurikulum**. Kelas di dasbor ini adalah
kelas **KelasKu lokal** — ruang identitas yang berbeda. Tidak ada pemetaan jujur di antara
keduanya; ini persis yang sudah tercatat di bagian "Yang BELUM selesai dari X4" pada
`docs/handoffs/KELASKU-KURIKULUM-KOMPETENSI-HANDOFF.md`. Mengarang pemetaan berarti
mengirim **bukti palsu** ke layar yang dipakai guru memutuskan siapa yang perlu remedial,
dan bukti palsu lebih buruk daripada tidak ada bukti.

Cakupan per kelas karena itu tetap dikerjakan di konsol penuh, yang memang memegang
kelas backend itu — dan pintunya ada di dalam panel ini, dijaga alamat backend yang sama.
Larangan ini **dikunci gerbang** (C4): panel akan merah kalau suatu saat ada yang
memanggil `/coverage` atau `/tp-detail` dari sini.

---

## 3. Yang diperiksa dan ternyata BUKAN temuan

Dicatat supaya tidak diaudit ulang.

- **`prefers-reduced-motion` di `teacher-shell.css` dan `class-hub.css`.** Keduanya punya
  animasi (10 dan 8) dan nol blok `prefers-reduced-motion`, jadi sekilas terlihat seperti
  lubang a11y di permukaan yang justru diaudit. Ternyata tidak: `style.css` baris 757
  memasang aturan semesta `*{animation-duration:.001ms!important;…}` di bawah
  `@media(prefers-reduced-motion:reduce)`, dan `style.css` dimuat di `index.html` tempat
  cangkang guru berjalan. Keduanya sudah tercakup.

---

## 4. Gerbang

`tests/kelasku-kurikulum-dashboard-test.js` — **21 assert**, terdaftar di `quality.yml`.
Sebagian besar **dijalankan**, bukan dibaca: hub benar-benar dipasang dengan `env` tiruan,
tabnya benar-benar diketuk, dan yang diperiksa adalah HTML yang keluar.

Yang dijaga: butir nav tidak kembali (A1–A2); migrasi view lama ada (A3); ketiga penyemai
punya tombol **dan** penangan (B1) dan memaksa baca ulang sesudah sukses (B3); status dibaca
sebelum tombol ditawarkan (B2); kedalaman bank lewat ID simpul (C1), batasnya dinyatakan
(C2), tidak pernah lintas mapel (C3); cakupan per kelas tidak dikarang (C4); tab bersyarat
dan panel tergambar hanya sesudah diketuk (D1–D3); **cat ulang tidak memicu permintaan
jaringan** (D4); tab bekerja tanpa kelas (D5); panel kosong / panel yang melempar berakhir
sebagai kalimat jujur, bukan hub yang jatuh (D6); penjaga yang padam di tengah sesi tidak
meninggalkan tab tergantung (D7); naskah dwibahasa (E1); `t()` benar-benar mengisi lubang
(E2); keempat belas kelas CSS punya aturan (E3).

**Red-proof** (empat kerusakan disuntikkan, gerbang wajib merah, lalu dipulihkan):

| Kerusakan disuntikkan | Hasil |
|---|---|
| `depth[node.id]` → `depth[node.code]` | MERAH (C1) ✓ |
| kartu `seed-soal` dihapus dari tabel | MERAH (B1) ✓ |
| penjaga tab dicabut (`if (true)`) | MERAH (D1, D2, D7) ✓ |
| pemuatan dipindah ke perender | MERAH (D3, D4) ✓ |

`tests/lucide-icon-coverage-test.js` diperluas menutup titik buta pembantu `icon()` (T9):
cakupannya naik dari 75 menjadi 173 nama ikon.

`tests/curriculum-console-gate-test.js` mengikuti pintunya yang berpindah: satu assert lama
(penjagaan di sekitar butir nav sidebar) diganti empat assert yang mengikuti **rantai
penjaga** dari tab di hub → `env.kurikulum.siap` → `konsolKurikulumSiap()` →
`curriculumApiUrl`. Lebih ketat daripada aslinya: dulu cukup ada kata `konsolKurikulumSiap`
di dekat tautannya.

---

## 5. Naskah

24 kunci baru lahir **dwibahasa id + th** di pasangan `copy-id-feat-d.js` /
`copy-th-feat-d.js`, placeholder sama persis, nilai th ber-aksara Thai. Nol utang dicatat
di `UTANG_TANPA_TH` / `UTANG_KUNCI` — tidak ada kunci yang dikirim tanpa th.
