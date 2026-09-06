# BANKOR — dari lemari soal menjadi mesin alokasi

**Status:** mesinnya ADA dan berotoritas `off`. Belum ada satu pun murid yang soalnya
dipengaruhi berkas-berkas ini. Otoritas: OWNER (fitrajft-ux). Build lahir: m025-271.

## Masalah yang dikejar

Guru menekan "beri tugas: 20 soal Past Tense". Bank punya ratusan butir, dan guru tidak
punya cara tahu butir mana yang sudah dikuasai murid tertentu — apalagi butir yang murid
itu sudah kerjakan sendiri di dasbornya. Akibatnya satu paket yang sama dikirim ke 30
murid.

Kerugiannya dua lapis, dan lapis kedua lebih mahal:

1. Waktu belajar terbakar untuk mengulang yang sudah bisa.
2. Jawaban benar atas soal yang sudah hafal MASUK ke bukti sebagai "menguasai" —
   padahal yang diukur cuma ingatan atas butir itu. Braincore lalu merekomendasikan
   berdasarkan pengukuran yang tercemar.

## Apa yang SUDAH ada sebelum ini (jangan dibangun ulang)

Dua dari tiga potong sudah lama ada, dan audit awal yang bilang "belum ada riwayat soal
per murid" itu **tidak akurat**:

| Yang ada | Di mana | Batasnya |
|---|---|---|
| `st.seen[skill]` — id yang pernah tampil | `fiezel-learner-flow.js` (localStorage) | tanpa hasil: butir yang selalu salah dan yang sudah dikuasai terlihat sama |
| `tc_lesson_evidence` — benar/salah per soal per murid | D1 `fiezel-core` | hanya soal dari tugas guru; latihan mandiri tidak pernah ke sana |
| `pickFresh(skill, n, {avoid, seed})` | `fiezel-review-bank.js` | `avoid` yang dipakai hari ini adalah `c.sentItemIds` — daftar SATU KELAS, bukan per murid |

Yang benar-benar hilang hanya potongan ketiga: **keadaan per butir yang menggabungkan
keduanya, dan langkah memilih yang membacanya.**

## Yang ditambahkan m025-271

- `features/brain/fiezel-question-memory.js` — keadaan per butir per murid:
  `unseen · seen · practiced · mastered · weak · repeated-error · due-for-review ·
  recently-seen`. Murni; waktu selalu argumen.
- `features/brain/fiezel-question-allocator.js` — `allocate()` dan `resolve()`.
- `tests/question-allocator-test.js` — 18 kasus, tujuh mutasi terbukti merah.

### Tiga keputusan yang menentukan

**1. Alokasi terjadi di PERANGKAT MURID, bukan di server.**
Bukan pilihan kenyamanan. Riwayat per-butir per-murid di server berarti satu tulis D1 per
jawaban per murid — 30 murid × 20 soal = 600 tulis untuk SATU tugas, pada plan gratis,
selamanya. Dan `fiezel-attempt-record.js` beserta `tests/observability-privacy-test.js`
berdiri di atas janji yang berlawanan: riwayat jawaban mentah tidak boleh keluar dari
perangkat. Perangkat juga punya data yang paling lengkap — ia melihat latihan mandiri
yang tidak pernah dilaporkan ke mana pun.

**2. "Pernah dikerjakan → jangan pernah lagi" adalah aturan yang SALAH.**
Butir yang salah tiga kali justru yang paling perlu kembali. Butir yang dikuasai enam
bulan lalu bukan lagi butir yang dikuasai — ia butir yang belum diuji ulang. Karena itu
yang disimpan adalah keadaan, bukan boolean "pernah".

**3. Kebaruan KONSEP, bukan cuma kebaruan id.**
`gpt:3:0:1` dan `gpt:3:5:2` adalah dua id berbeda yang menguji kata kerja yang SAMA.
Murid yang menerima dua puluh id berbeda dengan lima konsep yang sama sedang mengulang
lima soal empat kali, dan tidak ada pemeriksaan berbasis id yang akan melihatnya.
`conceptOf()` menurunkan konsep dari `marker` — bidang yang setiap butir bank punya dan
isinya memang petunjuk linguistik yang sedang diuji.

### Aturan yang tidak boleh dilanggar

**Soal manual adalah perintah.** Kalau guru memilih sendiri butirnya, Bankor tidak
menambah, tidak membuang, tidak menukar, tidak mengurutkan ulang. Guru yang memilih empat
soal tertentu sedang mengajar sesuatu yang spesifik; sistem yang "memperbaiki" pilihan itu
membatalkan keputusan pengajaran.

Aturan ini tidak berdiri sebagai komentar. `resolve()` mencabangkannya sebagai cabang
PERTAMA, dan gerbangnya membuktikannya dengan tiga mutasi terpisah: membuang yang
dikuasai, membuang yang baru lewat, dan **sekadar mengurutkan ulang** — ketiganya merah.

### Kekurangan tidak pernah ditambal diam-diam

Murid yang sudah menguasai hampir seluruh bank membuat kolam calon habis. Godaannya
mengisi sisanya dengan pengulangan lalu berpura-pura set itu utuh — kebohongan yang mahal:
guru melihat "20 soal", murid mengerjakan pengulangan, buktinya masuk seolah pengukuran
baru. Karena itu tiap tahap pelonggaran dilaporkan di hasil: `relaxed`, `repeated`, `short`.

## Langkah berikutnya — urut dari yang paling menentukan

1. **Sambungkan ke latihan mandiri murid.** `fiezel-learner-flow.js:116` masih memakai
   `avoid: seenFor(skill)`. Ganti dengan alokator, dan catat hasil per butir ke ingatan di
   `answerLesson()` — hari ini hanya `markSeen` (tanpa hasil) yang dicatat. Ini langkah
   yang paling murah dan paling cepat terasa, karena tidak menyentuh guru sama sekali.
2. **Tugas guru mode adaptif.** `fiezel-teacher-store.js:buildAssignment` hari ini
   mengunci `itemIds` di perangkat GURU. Untuk personalisasi, tugas harus membawa RESEP
   (skill + jumlah + batasan) alih-alih daftar tetap, lalu `fiezel-class-hub.js:startRunner`
   memekarkannya dengan ingatan murid. Mode manual WAJIB tetap mengirim `itemIds` seperti
   hari ini — itu jalur yang aturannya melarang disentuh.
3. **Beri tahu murid kenapa soalnya begini.** `summary()` sudah menyediakan angkanya.
   Naskahnya wajib lahir dua bahasa (`copy-id-*` / `copy-th-*`).
4. **Laporan guru.** Guru perlu melihat bahwa 30 murid mendapat set berbeda, dan berapa
   yang setnya terpaksa dilonggarkan (`relaxed`/`repeated`) — itu sinyal bank soalnya
   kurang, bukan muridnya bermasalah.

## Yang TIDAK boleh dilakukan

- Jangan pindahkan ingatan per-butir ke D1 tanpa membaca ulang keputusan 1 di atas.
- Jangan pakai id butir sebagai cadangan kunci konsep. Konsep palsu yang unik per butir
  membuat pembatas konsep tampak bekerja padahal ia tidak membatasi apa pun; gerbangnya
  menjaga ini.
- Jangan naikkan otoritas kedua modul di `fiezel-brain-manifest.js` sebelum pemanggilnya
  benar-benar ada. `tests/brain-page-wiring-test.js` W8 memerahkan drift arah balik.
