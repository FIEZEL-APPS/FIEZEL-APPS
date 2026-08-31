# AUDIT/17 — Demonstrasi Pembeli (Fase 2 / Phase Q)

**Perintah fase:** empat skenario yang menunjukkan Braincore bekerja — murid berkinerja baik →
tantangan dinaikkan; murid berulang kali kesulitan → terdeteksi dan jalurnya berubah; murid lupa →
jadwal ulangan berubah; bukti tidak bisa dipercaya → keyakinan diturunkan. Dengan syarat keras:
**"The demonstration must use real Braincore code. No fake screenshots. No simulated UI pretending
to be Braincore."**

**Berkas:** `braincore-demo.js` · `braincore-demo-test.js` · `SALE/BRAINCORE_DEMONSTRATION.md`

---

## 1. Apa yang dibangun

Satu program yang menjawab keempat pertanyaan itu dengan **menjalankan Braincore**, lewat pintu
depan yang akan dipakai pembeli (`braincore-runtime.js` → `braincore-pipeline.js` → 23 modul asli
di `features/brain/`). Tidak ada tiruan modul, tidak ada UI, tidak ada tangkapan layar, dan tidak
ada satu pun angka yang ditulis tangan.

```
node braincore-demo.js            transkrip lengkap (keluar 1 bila ada klaim yang gagal)
node braincore-demo.js --json     keluaran mesin
node braincore-demo.js --write-doc  perbarui transkrip di dokumen jual
node braincore-demo-test.js       gerbang: 63 assert
```

Hasil hari ini: **15 klaim, seluruhnya benar, pada Braincore 3.0.0.**

---

## 2. Keputusan bentuk: setiap skenario adalah PASANGAN, bukan satu murid

Ini bagian yang paling menentukan apakah demonstrasi ini bukti atau iklan.

Cara paling gampang membuat demonstrasi adalah menjalankan satu murid dan mencetak apa yang
terjadi. Masalahnya: itu cuma membuktikan mesinnya **mengeluarkan sesuatu**. Pertanyaan pembeli
lebih sempit dan lebih sulit — *apakah ia memutuskan **berbeda karena** yang diamatinya?* — dan
satu lengan tidak bisa menjawabnya, berapa pun rapinya angkanya.

Jadi setiap skenario adalah dua (atau tiga) lengan yang berangkat dari keadaan kosong yang sama
dan **berbeda pada satu hal saja**. Yang paling telak Q1: dua murid menjawab tujuh soal yang sama
dan **ketujuh-tujuhnya benar**, berakhir pada **angka mastery yang persis sama** (`1.0`, `n=7`),
dan hanya satu yang dinaikkan tingkatnya. Perbedaan keputusannya **tidak mungkin** datang dari
nilai, karena nilainya identik. Ia datang dari *bagaimana* jawabannya tiba.

Gerbangnya menegakkan bentuk ini: skenario dengan satu lengan ditolak.

---

## 3. Demonstrasi ini BISA gagal — dan itu dibuktikan, bukan dijanjikan

Dokumen jual yang tidak bisa salah adalah brosur. Setiap skenario membawa **klaim** yang diperiksa
terhadap jalannya saat itu juga; klaim yang tidak lagi benar membuat `braincore-demo.js` keluar
dengan kode 1 dan CI merah.

Klaimnya ditulis sebagai **relasi** — "A dinaikkan dan B tidak", "bukti tebakan bernilai lebih
kecil daripada bukti yang dipikirkan" — bukan sebagai angka rekaman. Angka rekaman akan merah
setiap kali mesin bergerak untuk alasan yang baik, dan gerbang yang sering merah tanpa sebab
akan dilonggarkan orang. Relasi tetap berarti.

Bahwa klaim itu benar-benar memeriksa sesuatu **dibuktikan dengan empat mutasi**, masing-masing
mematikan satu kontras dan wajib membuat klaim yang bersangkutan merah:

| Mutasi | Yang dimatikan | Klaim yang wajib merah |
|---|---|---|
| 1 | lengan "lamban" Q1 dijadikan identik dengan lengan "lancar" | *yang lamban TIDAK dinaikkan* |
| 2 | lengan "tersebar" Q2 diberi pola berulang yang sama | *murid tersebar TIDAK dituduh* |
| 3 | lengan "tebakan" Q4 dijawab pada kecepatan wajar | *bukti tebakan bernilai lebih kecil* |
| 4 | satu skenario diganti klaim yang sengaja salah | `runAll().failed` wajib memuatnya |

Mutasi 4 ada karena pelajaran Fase M: sebuah uji mutasi bisa **diam-diam tidak memutasi apa pun**
dan tetap hijau. Di sini setiap mutasi diperiksa mendarat sebelum hasilnya dipercaya.

---

## 4. Tiga pagar tambahan yang dipasang, dan alasannya

**(a) Angkanya wajib datang dari mesin yang diaudit.** Demonstrasi berjalan lewat
`braincore-runtime.js`; gerbangnya menjalankan ulang satu lengan lewat `braincore-pipeline.js`
**langsung** — jalur yang diukur seluruh Fase C–J — dan menuntut hasilnya sama persis. Kalau suatu
hari runtime menumbuhkan jalur khusus demonstrasi yang lebih ramah, selisihnya muncul di sini.

**(b) Dokumen jual tidak boleh basi.** `SALE/BRAINCORE_DEMONSTRATION.md` memuat transkrip yang akan
dibaca pembeli. Kalau mesinnya berubah dan dokumennya tidak, pembeli membaca angka yang tidak lagi
benar — dan tidak ada gerbang lain yang bisa melihatnya, karena dokumen itu cuma teks. Jadi blok
transkripnya **dibangkitkan** dari perender yang sama dengan terminal, lewat satu pintu
(`--write-doc`), dan gerbangnya menuntut isi dokumen sama persis dengan jalan hari ini. Diuji
dengan menyunting satu angka di dokumen menjadi lebih bagus: gerbangnya merah dan menunjuk baris
yang disunting. Prosa di sekelilingnya tetap ditulis tangan — yang dijaga hanya angkanya, karena
hanya angka yang bisa basi tanpa terlihat.

**(c) Keempat pertanyaan pembeli diperiksa dari PERILAKU, bukan dari judul.** Gerbangnya tidak
mencocokkan kata-kata di judul skenario — judul bisa ditulis ulang tanpa mengubah apa pun yang
dijalankan. Yang diperiksa: pernah ada keputusan menaikkan tingkat, pernah ada mengajar ulang,
pernah ada miskonsepsi yang menjadi aktif, jadwal ingatan pernah bergeser lebih dari 100×, bukti
pernah didiskon, dan bukti pernah dibuang seluruhnya. Ini pelajaran dari empat kali kesalahan yang
sama sepanjang Fase 2: **assert yang menguji ejaan, bukan makna.**

---

## 5. Satu cacat ditemukan di gerbang ini sendiri

Pemeriksaan "tidak ada jam atau acak di sumber demonstrasi" awalnya memakai bentuk pembuang
komentar yang dipakai gerbang-gerbang lain di repo ini: buang blok `/* */`, lalu buang baris yang
**seluruhnya** komentar. Ia langsung merah — pada komentar **ekor** yang berbunyi
`// epoch tetap; tidak ada Date.now() di berkas ini`. Kalimat yang menyatakan **ketiadaan** jam
terbaca sebagai **pemakaian** jam.

Godaannya adalah menulis ulang komentar di berkas yang diuji supaya gerbangnya diam. Itu menyetel
sumber agar cocok dengan pemeriksa yang rusak, dan cacatnya tetap ada — pemeriksa yang salah baca
akan salah baca lagi besok, kali ini mungkin dengan **melewatkan** pemakaian jam sungguhan di ekor
sebuah baris. Jadi yang diperbaiki pemeriksanya: pemindai berkeadaan (kode / string / komentar
baris / komentar blok) yang membaca ekor baris dengan benar, **dibuktikan bekerja pada empat kasus
uji sebelum hasilnya dipercaya**, termasuk kasus sebaliknya (`x = Date.now();` wajib tetap terbaca)
supaya ia tidak sekadar membuang segalanya. Batasnya ditulis apa adanya: ia tidak mengenali literal
regex, dan ada assert yang menjaga `braincore-demo.js` tidak menumbuhkan literal seperti itu.

Perlu dicatat: yang membuktikan determinisme bukan pemeriksaan teks itu, melainkan uji perilaku di
atasnya — dua jalan penuh dengan masukan identik, keluaran wajib identik.

---

## 6. Yang ditunjukkan demonstrasi ini, dan yang TIDAK

**Ditunjukkan:** Braincore mengamati murid, memperbarui keadaan internalnya dari yang diamatinya,
dan **sampai pada keputusan yang berbeda karena itu**. Alasannya disebutkan namanya, bukan
disimpulkan belakangan oleh pencatat.

**TIDAK ditunjukkan, dan tidak boleh dikutip seolah ditunjukkan:** bahwa keputusan-keputusan itu
**mengajar lebih baik** daripada pendekatan lain. Muridnya sintetis. Tidak ada data di repo ini
yang bisa membuktikan efek pedagogis — hanya murid nyata yang bisa, dan kesiapan untuk itu adalah
Fase K, bukan berkas ini. Kalimat ini dicetak di akhir setiap jalan demonstrasi, bukan hanya
disimpan di dokumen, supaya ia ikut ke mana pun keluarannya dibawa.

Tiga dari empat skenario memuat **non-reaksi yang disengaja** — Q1 lengan B, Q2 lengan B, Q4 lengan
B — yaitu kasus ketika Braincore diminta bereaksi dan dengan benar tidak bereaksi. Mesin yang
bereaksi terhadap segala hal bukan adaptif, ia gelisah, dan ongkosnya ditanggung murid.

---

## 7. Ringkasan untuk pemilik (bahasa biasa)

Sekarang ada satu perintah yang bisa dijalankan siapa pun di depan calon pembeli:
`node braincore-demo.js`. Ia menjalankan mesin yang sesungguhnya dan mencetak apa yang mesin itu
putuskan, lengkap dengan alasannya — bukan gambar, bukan video, bukan angka yang disalin.

Empat cerita yang ditunjukkannya:

1. **Dua murid sama-sama benar tujuh kali.** Yang satu lancar, yang satu harus berpikir keras.
   Nilai mereka **sama persis**. Hanya yang lancar yang dinaikkan tingkatnya.
2. **Dua murid sama-sama salah empat kali.** Yang satu salah dengan cara yang sama terus, yang satu
   salah pada empat hal berbeda. Hanya yang pertama yang materinya diulang — dan tuduhannya baru
   keluar setelah pola itu muncul di **dua sesi berbeda**, bukan setelah satu sore yang buruk.
3. **Murid hilang 30 hari lalu kembali.** Kalau ia masih ingat, ulangan berikutnya dijadwalkan 102
   hari lagi. Kalau ia sudah lupa, 0,4 hari lagi. Tanggal kembalinya sama; yang membedakan adalah
   apakah ia masih ingat.
4. **Tiga murid sama-sama menjawab benar.** Yang berpikir dihitung penuh. Yang mengklik terlalu
   cepat untuk sempat membaca soal dihitung 0,3 — dan **tidak dinaikkan tingkatnya**, dengan alasan
   yang disebutkan terang-terangan (`streak_but_guessing`). Yang menjawab soal yang sudah ditandai
   rusak dihitung **nol**.

Dan yang tetap harus dikatakan apa adanya kepada pembeli: semua ini membuktikan mesinnya
**memperhatikan dan memutuskan berbeda**. Ia belum membuktikan bahwa cara itu **membuat murid lebih
pintar**. Untuk itu perlu murid sungguhan.
