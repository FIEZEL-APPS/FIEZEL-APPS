# A5 — Cold start pepper: analytics tidak lagi buta di hari pertama

Cabang: `work/a5pep`. Tidak di-push. Tidak ada bump versi build.
Berkas yang disentuh: `workers/api/analytics/analytics-core.js`,
`analytics-store-d1.js`, `route-events.js`, `rollup.js` (komentar saja),
`PRIVACY.md`, `tests/analytics-privacy-test.js`, `tools/_a5_redproof.sh` (baru).
Tidak ada berkas klien, `app.js`, `style.css`, `index.html`, `core-config.js`,
`sw.js`, `features/`, `coordination/`, `workers/owner/`, `workers/api/ai/`,
`workers/api/rate-anon.js` yang disentuh.

---

## 1. Cacat yang diperbaiki

`GET /api/usage/pepper` membaca `pepper_state` dan menjawab 503
`{"ok":false,"error":"unavailable"}` kalau barisnya tidak ada. Baris itu **hanya**
dibuat oleh rollup harian (`rollup.js` langkah 4), yang terikat cron
`5 17 * * *` (00:05 WIB). Klien butuh pepper untuk menurunkan `visitor_token`,
jadi selama pepper belum ada, tidak ada satu pun token yang bisa dibuat, dan
`dau_dedup` tetap kosong.

Konsekuensinya bukan "hari ini datanya belum masuk". Konsekuensinya: **setiap
basis data analytics yang baru selalu buta pada hari pertama pemakaiannya**, dan
tidak ada gerbang yang menangkapnya, karena semua gerbang yang menguji jalur
pepper lebih dulu menanam `pepper_state` lewat rollup (mis. `tests/cf-wiring-test.js`
memanggil rollup sebelum memanggil rute pepper). Kasus "basis data benar-benar
kosong" tidak pernah diuji sekali pun.

## 2. Rancangan inisialisasi malas dan mengapa ia tidak bisa balapan

Tambahan di `analytics-store-d1.js`:

```
SQL.initPepper =
  'INSERT INTO pepper_state (id, rotated_at, current, previous)
   VALUES (1, ?1, ?2, NULL) ON CONFLICT(id) DO NOTHING'
```

`ensurePepperState(db, now)`:

1. baca `pepper_state`; kalau `current` sudah ada, langsung kembalikan (nol tulis);
2. kalau belum ada, susun calon lewat `initialPepperState(now, newPepper())`;
3. jalankan `SQL.initPepper` — **satu pernyataan**, tanpa cek terpisah;
4. **baca ulang**, dan yang dikembalikan ke pemanggil adalah hasil baca ulang itu.

**(a) Kenapa dua permintaan bersamaan tidak mungkin membuat dua pepper berbeda.**
Yang mencegah balapan bukan urutan langkah 1–3, tetapi bahwa langkah 3 adalah
satu pernyataan tunggal dengan `ON CONFLICT(id) DO NOTHING` pada
`pepper_state(id INTEGER PRIMARY KEY CHECK (id=1))`. Kunci utamanya tunggal, jadi
penulis kedua bertabrakan dan **tidak menulis apa pun** — bukan menimpa, bukan
gagal dengan galat. Itu jaminan level mesin penyimpanan, bukan jaminan waktu.
Cek-lalu-tulis (`readPepperState` → `if (!state) writePepperState`) tidak punya
jaminan itu: kedua permintaan bisa membaca "kosong" pada saat yang sama, lalu
keduanya menulis, dan yang terakhir menang. Dua perangkat identik kemudian
menurunkan token dari pepper berbeda dan DAU menggelembung.

Langkah 4 yang menutup celah kedua: penulis yang **kalah** tidak boleh menyajikan
calonnya sendiri, karena calon itu tidak pernah masuk basis data. Karena itu
`ensurePepperState` membuang calon dan menyajikan hasil baca ulang. Yang kalah
melayani pepper milik yang menang. Gerbang mengunci dua hal ini secara terpisah:
jumlah perubahan baris tepat satu walau dua percobaan insert, dan pepper yang
disajikan **kedua** pemanggil sama dengan yang tersimpan.

Baris yang rusak (ada tetapi `current` kosong/janggal) **tidak** diperbaiki paksa
di dalam permintaan. Perbaikan paksa di jalur permintaan sama dengan memberi
setiap permintaan izin menulis pepper, dan itu jalan pintas menuju rotasi liar.
Baris rusak diserahkan ke rotasi terjadwal, yang `rotatePepperDue()` sudah
tangani (jam mundur / `rotated_at` janggal dianggap jatuh tempo).

**(b) Kenapa inisialisasi tidak bisa menjadi rotasi tengah hari.**
`initialPepperState(now, pepper)` mengembalikan
`{ rotated_at: pepperWindowStart(now), current: pepper, previous: null }` —
bentuk tiga kunci yang identik dengan keluaran `rotatePepper()`, jadi tidak ada
bentuk state baru yang beredar di sistem.

`pepperWindowStart(now)` adalah batas cron 17:05 UTC (= 00:05 WIB) terakhir yang
sudah lewat, dihitung dari epoch dengan langkah `PEPPER_ROTATION_MS`. Jadi
`rotated_at` **dimundurkan** ke awal jendela yang sedang berjalan, bukan diisi
`now`. Tiga akibat yang semuanya disengaja:

- Inisialisasi tidak berpura-pura "baru saja dirotasi". Kalau `rotated_at = now`,
  pepper yang dibuat pukul 06:00 WIB akan berumur 18 jam saat cron berikutnya
  lewat, `rotatePepperDue` menjawab `false`, dan pepper itu hidup sampai cron
  hari **berikutnya** lagi — hampir 48 jam. Janji "dirotasi tiap 24 jam" yang
  ditulis dashboard ke owner langsung bohong pada hari pertama.
- Tidak ada rotasi tengah hari. Satu-satunya penulis yang bisa menggeser
  `current` tetap rollup; jalur permintaan hanya bisa mengisi baris yang belum
  ada. Rotasi tengah hari akan membuat satu perangkat menyumbang dua token pada
  `day` yang sama.
- Cron pertama sesudah inisialisasi melihat umur **tepat** 24 jam, jadi ia
  merotasi tepat waktu dan irama harian tidak pernah bergeser.

**(c) `previous` saat inisialisasi.** Tidak ada pendahulu, jadi `previous` adalah
`NULL` — dan itu ditegakkan di dua lapis: fungsi murni mengembalikan
`previous: null`, dan `SQL.initPepper` menulis `NULL` sebagai literal, bukan
parameter, sehingga pemanggil bahkan tidak punya cara mengirim nilai. Mengisi
`previous` dengan `current` akan mengarang riwayat: dashboard membaca `previous`
sebagai "pepper kemarin", dan token kemarin yang sebenarnya tidak ada.

## 3. Pepper sebagai rahasia, dan soal siapa yang boleh memintanya

Pepper hanya muncul di satu tempat: field `pepper:` pada jawaban 200 dari
`handlePepper`. Gerbang memindai **sumber** (bukan cuma menjalankan) untuk
memastikan: tidak ada `console.*` yang menyebut pepper atau `state.current`,
tidak ada amplop galat yang memuat field pepper, dan field `pepper:` hanya ada
satu kali di seluruh `workers/api/analytics/`. Selain itu ia mencegat `console`
saat menjalankan jalur sukses, 503, 404, 400, dan rollup.

**Endpoint-nya terbuka: siapa pun boleh memintanya** (hanya ada rem laju
`checkRateLimit`, tidak ada sesi, tidak ada cookie). Penilaian saya: **ini tidak
perlu diubah, dan menambah syarat baru justru merugikan** — tetapi bukan karena
endpoint terbuka itu ideal. Alasannya:

1. Membatasi endpoint pepper **tidak** mencegah penggembungan DAU. `visitor_token`
   secara desain tidak bisa diverifikasi server: server tidak pernah memegang
   `installId`, jadi satu-satunya validasi yang mungkin adalah bentuk,
   `VISITOR_TOKEN_PATTERN = /^[0-9a-f]{32}$/` (`analytics-core.js:35`, dipakai di
   `normalizeEvent`). Artinya 32 karakter heksa acak apa pun diterima masuk
   `dau_dedup` **tanpa perlu pepper sama sekali**. Penyerang yang mau
   menggembungkan DAU tidak perlu meminta pepper; ia cukup mengarang token.
   Jadi mengunci `/api/usage/pepper` menutup pintu yang bukan pintu masuknya.
2. Klien membutuhkan pepper pada pemuatan pertama, sebelum ada sesi apa pun
   (`features/analytics/fiezel-analytics-client.js`, TTL 6 jam, gagal → 
   `lastError='pepper_unavailable'`). Menambahkan syarat autentikasi akan
   memblokir murid asli di detik pertama, dan itu tepat yang dilarang di brief.
3. Yang benar-benar melindungi angka adalah rem laju pada penulisan event dan
   sifat `dau_dedup` (primary key `(day, token)` + `INSERT OR IGNORE`), bukan
   kerahasiaan pepper terhadap murid. Pepper tetap rahasia dalam arti tidak
   pernah bocor ke log atau ke jalur lain, karena kebocoran ke log berarti
   siapa pun yang bisa membaca log bisa **menurunkan ulang token historis** dan
   menghubungkan perangkat lintas hari — itulah risiko sebenarnya, dan itulah
   yang digerbangi.

Kesimpulan yang jujur: DAU FIEZEL tidak tahan terhadap penyerang yang niat
mengarang token. Itu harga dari "installId tidak pernah dikirim". `PRIVACY.md`
sudah menyebut angka ini sebagai estimasi perangkat; ia sebaiknya juga menyebut
bahwa angka ini tidak tahan penyalahgunaan sengaja. Saya **tidak** menambahkan
syarat baru pada endpoint.

## 4. Rotasi harian dan janji "tidak bisa disambungkan"

Rotasi tetap milik rollup saja; `rollup.js` hanya menerima tambahan komentar.
Gerbang membuktikan urutan penuh pada basis data yang benar-benar kosong:
permintaan pertama pukul 03:00 UTC menginisialisasi → rollup di tengah jendela
yang sama **tidak** merotasi → cron 17:05 UTC berikutnya merotasi (dan pada
17:04 belum jatuh tempo) → `previous` berisi pepper hari-1, `current` berganti,
`rotated_at` maju tepat ke batas cron → token hari-1 dan hari-2 dari `installId`
yang **sama** berbeda → cron putaran berikutnya merotasi lagi dan pepper hari-1
hilang dari `current` maupun `previous` (hilang permanen).

Satu cacat lama yang saya temukan tetapi **tidak** perbaiki, dan sekarang saya
tuliskan di `PRIVACY.md` bagian kejujuran: batas rotasi (17:05 UTC) ada di
tengah hari UTC, sedangkan `day` dihitung UTC tengah malam. Perangkat yang aktif
di kedua sisi 17:05 UTC menghasilkan dua token untuk `day` yang sama, dan
keduanya terhitung. Memperbaikinya menuntut mengubah makna `dayKey` atau jadwal
cron — dua-duanya mengguncang banyak gerbang dan bukan lingkup A5.

## 5. Temuan kedua: `app_open` sekarang menyumbang DAU

Sebelumnya `dau_dedup` hanya diisi dari `day_active` (`analytics-core.js`),
padahal `app_open` **mewajibkan** dan **mengirim** `visitor_token`
(`normalizeEvent` menolak `app_open` tanpa token: `missing_visitor_token`).

Keputusan: **`app_open` ikut menyumbang DAU.** Perubahannya murni server
(`aggregate()` memanggil `noteDau(day, e.visitor_token)` untuk `app_open` dan
`day_active`); tidak ada berkas klien yang disentuh.

Alasan dari sudut **makna angka ke owner**, bukan kemudahan implementasi:
`day_active` dikirim klien setelah perangkat mencapai ambang aktivitas
(kontraknya membawa `attempts_bucket`). Artinya angka yang selama ini bernama
"DAU" sebenarnya berarti "perangkat yang mengerjakan cukup banyak latihan hari
itu" — angka **keterlibatan** yang memakai nama angka **kehadiran**. Owner yang
melihat "DAU turun" akan menyimpulkan lebih sedikit murid datang, padahal bisa
saja jumlah yang datang sama dan yang bertahan sampai ambang lebih sedikit. Dua
pertanyaan itu menuntut tindakan yang berbeda: yang pertama soal distribusi dan
akses, yang kedua soal materi dan motivasi. Menyatukannya di satu angka membuat
keduanya tidak terbaca.

Sekarang: DAU = perangkat yang **membuka aplikasi** (`app_open` ∪ `day_active`),
dan `day_active_reports` tetap ada sebagai angka keterlibatan yang terpisah. Rasio
keduanya langsung menjadi angka yang berguna: berapa bagian yang datang lalu
benar-benar belajar. Tidak ada yang terhitung dua kali: dedup terjadi dua kali,
di `aggregate()` (`dauSeen`) dan di D1 (`dau_dedup` primary key + `INSERT OR
IGNORE`).

Alternatifnya — `app_open` berhenti meminta token — saya tolak dua kali: ia
menuntut perubahan berkas klien (dilarang di brief), dan ia menyelesaikan
masalah biaya privasi dengan cara mempertahankan angka yang salah nama. Yang
tidak boleh terjadi adalah keadaan sebelum ini: token diminta, dikirim, disimpan
sebentar, lalu dibuang tanpa dipakai. Itu biaya privasi tanpa manfaat.

## 6. Gerbang: perluasan `tests/analytics-privacy-test.js` (bagian 8)

Tanpa berkas gerbang baru. 90 pemeriksaan, exit 0. Isi bagian 8: fake D1 sendiri
(mendukung seluruh pernyataan rollup/aggregate, menghormati `DO NOTHING`,
menghitung perubahan baris **nyata**, dan punya penghalang dua-kedatangan untuk
memaksa balapan pada dua `readPepper` pertama), lalu assert (a)–(f) sesuai brief.

Bukti merah lewat `tools/_a5_redproof.sh` — 12 mutasi terarah, semuanya merah, semuanya
dipulihkan, gerbang hijau kembali sesudahnya:

| mutasi | assert yang merah |
|---|---|
| inisialisasi malas dibatalkan (kembali `readPepperState`) | (a) permintaan pertama di DB kosong 200 |
| `initPepper` diganti tulis tanpa syarat | (b) baris pepper berubah tepat sekali |
| calon lokal dikembalikan tanpa baca ulang | (b) `ensurePepperState` membaca ulang |
| `DO NOTHING` dilemahkan jadi `DO UPDATE` | (b) penulisan idempoten yang dijamin D1 |
| `rotated_at = now` | (c) `rotated_at` = awal jendela |
| `previous: current` | (c) `initialPepperState()` murni |
| jangkar jendela digeser ke tengah malam UTC | (d) cron berikutnya merotasi |
| rotasi di rollup dimatikan | (d) cron berikutnya merotasi |
| `console.log(state.current)` di `handlePepper` | (e) tidak ada console menyebut pepper |
| pepper diselipkan ke amplop 429 | (e) tidak ada amplop galat memuat pepper |
| `noteDau` dihapus dari `app_open` | (f) perangkat app_open-saja terhitung DAU |
| dedup di `aggregate()` dilepas | (f) `aggregate()` men-dedup `(day, token)` |

**Dua lubang gerbang yang saya temukan sendiri dalam proses ini dan tutup:**

1. Beberapa mutasi awalnya membuat gerbang **meledak** (exception) alih-alih
   memerahkan assert, sehingga `ANALYTICS-PRIVACY-REPORT.json` yang lama masih
   tergeletak dan mutasi **terlihat hijau**. Diperbaiki dua sisi: bagian 8
   memakai pembungkus `safe()` dan nilai bawaan yang aman sehingga kegagalan
   dini memerahkan assert-nya sendiri, dan `tools/_a5_redproof.sh` menghapus laporan
   lebih dulu lalu melaporkan "TANPA-LAPORAN" kalau gerbang meledak.
2. Assert `previous === null` yang hanya membaca fake D1 **tidak bisa** merah,
   karena `SQL.initPepper` memang menulis `NULL` literal — mutasi di
   `initialPepperState` tak terlihat. Ditambah dua assert langsung: fungsi
   murninya, dan bentuk pernyataan SQL-nya.
3. (Bukan lubang, tetapi hampir jadi) `cron1` awalnya dihitung dari
   `core.pepperWindowStart()`, jadi menggeser jangkar jendela akan menggeser
   ekspektasi ikut-ikutan dan mutasi tetap hijau. Sekarang batas cron ditulis
   sebagai konstanta literal `2026-08-26T17:05:00Z`.

Verifikasi (semua exit 0): `analytics-privacy`, `analytics-client`,
`d1-schema-contract`, `owner-dashboard`, `cf-api-contract`, `cf-wiring`,
`no-network`, `secret-scan`, `gate-registry`, `coordination-guard`, `regression`,
`install-health`, ditambah `analytics-aggregate`, `analytics-server-only`,
`cron-contract`, `observability-privacy`, `event-vocabulary-gate`.

## 7. Apa yang masih TIDAK bisa dibuktikan sampai murid sungguhan memakai jalur ini

- **Balapan yang nyata.** Yang saya buktikan adalah balapan yang **disimulasikan**
  di fake D1 dengan penghalang buatan. Yang menjamin di produksi adalah semantik
  `ON CONFLICT DO NOTHING` D1/SQLite, bukan test saya. Bukti produksi hanya bisa
  datang dari `pepper_state` yang tetap satu baris dan `dau_dedup` yang tidak
  meloncat pada menit-menit pertama hari pertama.
- **Bahwa hari pertama benar-benar tidak lagi nol.** Saya tidak menjalankan ini
  terhadap D1 produksi. Yang bisa dibuktikan sekarang: rute menjawab 200 pada
  basis data kosong. Yang belum: klien asli memakai pepper itu, `POST
  /api/usage/events` mencatatnya, dan `metrics_daily.dau` hari itu > 0.
- **Besarnya efek keputusan `app_open`.** Rasio `app_open` : `day_active` tidak
  diketahui. DAU akan **naik** setelah perubahan ini, dan kenaikan itu bukan
  pertumbuhan — itu koreksi definisi. Owner harus diberi tahu tanggal
  pergantiannya, kalau tidak grafiknya terbaca sebagai lonjakan palsu.
- **Ketahanan terhadap penyalahgunaan sengaja.** Belum pernah diuji terhadap
  penyerang nyata; argumen di bagian 3 bersifat struktural (token tidak bisa
  diverifikasi), bukan hasil pengukuran.
- **Perangkat yang aktif melintasi batas 17:05 UTC.** Besar hitungan gandanya
  tidak diketahui sampai ada trafik nyata sepanjang hari.
