# m025-129 — Diagnosis miskonsepsi berbahasa Indonesia

OWNER bertanya apa kelebihan FIEZEL sekarang, lalu: "berarti kalau PR #171 sudah di merge
FIEZEL udah bisa pintar mengajar?" Jawaban jujurnya diukur, bukan dikira-kira — dan
pengukurannya menemukan satu celah yang paling murah ditutup. OWNER menjawab "LANJUTKAN".

---

## 0. Angka yang memicu pekerjaan ini

Setelah Tutor Brain v3 masuk, tutor sudah menyebut **sebab** kesalahan, bukan sekadar
benar/salah. Tetapi sebabnya diambil dengan mencocokkan pola regex pada teks Inggris
`whyFails` milik bank soal, dan cakupannya diukur begini:

```
$ node -e "…pats.some(p=>p.test(whyFails))…"
distraktor grammar total : 387
dapat diagnosis SPESIFIK : 168 (43%)
jatuh ke kalimat generik  : 219 (57%)
```

57% kesalahan dijawab dengan satu kalimat yang sama — *"belum cocok dengan waktu, fungsi,
atau susunan yang dibutuhkan kalimat"*. Murid yang keliru tiga kali dalam satu sesi mendengar
kalimat itu tiga kali. Tutor yang mengulang satu kalimat untuk tiga kesalahan berbeda tidak
sedang mendiagnosis apa pun; ia sedang menyembunyikan bahwa ia tidak tahu.

**Bahannya ternyata sudah lengkap.** Setiap distraktor membawa nama miskonsepsinya sendiri:

```
$ node -e "…"
distraktor punya NAMA miskonsepsi : 387/387
nama miskonsepsi unik             : 386
```

386 nama unik untuk 387 distraktor — praktis satu diagnosis presisi per distraktor, jauh
lebih tepat daripada apa pun yang bisa ditebak dari 14 pola regex. Yang menghalangi
pemakaiannya cuma satu: namanya berbahasa Inggris
(`"habitual-aspect overgeneralization"`), dan naskah FIEZEL tidak pernah boleh berpindah
bahasa.

## 1. Yang dikerjakan

**`grammar-misconception-id.json` (baru, 386 entri).** Kunci = nama miskonsepsi apa adanya
dari bank soal — **tidak pernah ditampilkan ke murid**, hanya dipakai sebagai kunci pencarian.
Nilai = klausa Indonesia yang boleh dibacakan.

Bentuk klausanya dipilih supaya satu kalimat yang sama bekerja di **dua tempat**:

```
panel jawaban : “prepares” membacanya sebagai kebiasaan, padahal penanda di kalimat
                menunjuk kejadian yang sedang terlihat berlangsung.
mulut tutor   : Ini yang bikin pilihan tadi gagal - membacanya sebagai kebiasaan, padahal
                penanda di kalimat menunjuk kejadian yang sedang terlihat berlangsung.
```

Karena itu setiap klausa diawali huruf kecil dan diakhiri titik, dan gate menjaga keduanya.

**`app.js`:**
- `grammarMisconceptionReason(nama)` — pencarian per-nama, **dicoba lebih dulu** dari
  pencocokan pola. Urutannya penting dan diuji: nama jauh lebih tepat daripada regex.
- `grammarOptionReason` menerima parameter keempat, nama miskonsepsi.
- `grammarMisconceptionKeys(item)` — mendaftarkan tiap pilihan dalam **semua bentuk** ia
  mungkin muncul di layar (lihat §3).
- `loadMisconceptionDiagnoses(root)` — dimuat **terpisah dari `DATA`** dan ber-`try/catch`
  sendiri. Di `DATA`, kegagalan `fetch` melempar dan mematikan seluruh `load()`; berkas data
  yang hilang tidak boleh pernah mematikan sesi belajar. Kalau berkasnya hilang, diagnosis
  turun ke pola lama lalu ke kalimat umum, dan kuisnya tetap jalan.

## 2. Hasil terukur

```
distraktor: 387 | diagnosis spesifik lewat NAMA: 387 (100%)
```

Pada varian tempat murid memilih **bentuk grammar** — yaitu varian 0, 1, dan 15-17:

```
varian pilih-bentuk (0,1,15-17): 1935/1935 => 100%
```

Naik dari 43% ke 100%.

## 3. Satu kegagalan senyap yang nyaris lolos

Pengukuran pertama setelah penyambungan memberi hasil aneh: varian 1 hanya **24 dari 387**.

Sebabnya: bank menyimpan pilihan sebagai potongan (`"prepares"`), tetapi varian 1
menampilkannya sebagai **kalimat utuh** dengan rumpang sudah terisi
(`"Look! The chef prepares a new dish…"`). Kunci petanya potongan, teks yang dicari kalimat
utuh — pencariannya meleset, dan diagnosis spesifiknya hilang **tanpa ada yang gagal**.
Itu jenis kegagalan paling mahal, karena tidak kelihatan dari mana pun kecuali diukur.

`grammarMisconceptionKeys` mendaftarkan kedua bentuk. Varian 1 naik dari 24/387 ke 387/387,
dan sekarang ada gate yang menghitung ulang kedua bentuk untuk seluruh bank.

## 4. Gate — `misconception-diagnosis-test.js` (16 gate, terdaftar di `quality.yml`)

Bukan memeriksa "apakah berkasnya ada", melainkan:

- cakupan **100%**, tanpa kecuali, dan tidak ada entri yatim;
- tidak satu pun diagnosis tertinggal dalam bahasa Inggris, dan nama Inggrisnya tidak pernah
  bocor ke naskah;
- bentuknya benar-benar merangkai jadi kalimat di **kedua** tempat pemakaian — huruf kecil di
  awal, titik di akhir, tanpa titik ganda;
- **tidak ada dua nama berbeda yang berbagi satu kalimat** — kalau ada, diagnosisnya kembali
  jadi generik, persis masalah yang gate ini ada untuk mencegahnya;
- nama dicoba **lebih dulu** dari pola teks;
- kedua bentuk pilihan (potongan dan kalimat utuh) ketemu diagnosisnya;
- pemuatnya berpenjaga dan **tidak** ada di `DATA`.

Dua gate di antaranya langsung menemukan cacat pada tulisan pertama saya: tiga diagnosis
memakai istilah yang memicu penjaga bahasa, dan dua sebab berbeda kebetulan diberi kalimat
yang sama persis. Keduanya sudah diperbaiki.

## 5. Yang **belum** tercakup — dan angkanya

Dari 25 varian latihan, 20 di antaranya **metakognitif**: pilihannya bukan bentuk grammar,
melainkan kalimat penjelasan ("Alasan mana yang paling tepat menjelaskan…"). Di sana bank
memang tidak punya miskonsepsi per-pilihan, dan mengarangnya akan jadi fabrikasi.

```
varian pilih-bentuk (5 dari 25) : 100%
seluruh 25 varian               :  20%
```

Angka 20% itu bukan kegagalan penyambungan ini — itu batas bahan yang tersedia. Menutupnya
menuntut pekerjaan yang berbeda jenisnya: menerjemahkan 129 `misconceptionTargeted` tingkat
lesson, dan memikirkan ulang apa arti "diagnosis" ketika yang keliru adalah penalaran murid
tentang grammar, bukan grammar-nya sendiri. Itu langkah berikutnya, bukan bagian cabang ini.

## 6. Verifikasi

Seluruh **74 perintah** di `.github/workflows/quality.yml` dijalankan lokal — hijau, termasuk
pemeriksaan sintaks seluruh berkas. Gelung tutor diverifikasi di Chromium (emulasi Pixel 5):
tutor kini menyebut sebab spesifik, seluruhnya Indonesia, tanpa `pageerror`.

Penanda rilis `FIEZEL_PAGE_BUILD` / `DIAG_BUILD` / `SW_REV` ketiganya **m025-129**.

Seluruh 18 check di CI hijau, termasuk `audiobook-safari`.

## 7. Koreksi atas diagnosis di m025-120 (#171)

Handoff m025-120 menyatakan `audiobook-safari` "merah secara struktural" karena
`vendor/supertonic-3/` tidak dilacak git "di setiap commit di repo ini", dan memperkirakan
"setiap rilis di masa depan akan memerahkan gate ini". **Generalisasinya salah.**

Pengukurannya benar untuk saat itu — pada `f2cb6be` (m025-119, basis cabang itu) direktorinya
memang belum ada. Yang keliru adalah menyimpulkan keadaan itu berlaku selamanya. Direktori
itu masuk lewat **#173 (m025-121)**:

```
$ git log --oneline --diff-filter=A -1 -- vendor/supertonic-3/sherpa-onnx-wasm-main-tts.wasm
a327872 m025-121: kartu akun Puter, dan suara cadangan yang menyiapkan dirinya sendiri (#173)

$ git ls-tree -r --name-only origin/main | grep -c '^vendor/'
14
```

Celahnya sementara, bukan struktural, dan sudah tertutup sendiri oleh jalan yang waktu itu
saya sebut sebagai opsi 1. Tidak ada keputusan governance yang perlu diambil soal ini.

Pelajarannya untuk handoff berikutnya: pengukuran satu titik waktu adalah bukti tentang titik
waktu itu, bukan tentang seluruh sejarah repo. Kalimat "di setiap commit" menuntut pemeriksaan
lintas commit — dan saya tidak melakukannya sebelum menuliskannya.

Cabang ini dibuat dari m025-126; sementara berjalan main maju dua kali — ke m025-127 (#179
kontras logo topbar), lalu ke m025-128 (#181 maskot PAW). Keduanya sudah disatukan, dan
penanda rilis diselesaikan ke **m025-129**.

Penyatuan kedua membawa konflik yang patut dicatat: **daftar `ASSETS` di `sw.js`**. main
menambahkan `./assets/brand/fiezel-paw.svg`, cabang ini menambahkan
`./grammar-misconception-id.json` — keduanya di baris yang sama, jadi git menandainya konflik.
Memilih salah satu sisi akan **diam-diam membuang precache milik sisi lain**, dan akibatnya
baru terasa saat offline: entah maskotnya hilang, entah diagnosis spesifiknya hilang. Kedua
penambahan digabung; daftarnya kini 94 aset, dan keduanya diperiksa ada.

Juga diperiksa masih utuh setelah penyatuan: pendaftaran gate di `quality.yml`.
