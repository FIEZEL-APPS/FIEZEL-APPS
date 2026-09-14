# Sertifikat CEFR: kenapa modul ini lebih keras kepala dari yang lain

Otoritas: OWNER. Dokumen ini mencatat fondasi subsistem sertifikat — apa yang sudah berdiri,
apa yang sengaja belum, dan kontrak apa yang tidak boleh dilunakkan siapa pun yang
melanjutkannya.

## Status

**Fondasi selesai, belum tersambung ke aplikasi.** Inti penilaian, penandatanganan, naskah
dua bahasa, dan gerbangnya sudah ada dan hijau. UI asesmen, route API penerbitan, halaman
verifikasi publik, dan pembayaran **belum dikerjakan**.

| Bagian | Berkas | Status |
| --- | --- | --- |
| Inti penilaian | `features/certificate/fiezel-certificate-core.js` | selesai, 38 assert |
| Tanda tangan + ID | `workers/api/certificate/certificate-sign.js` | selesai, 26 assert |
| Naskah id + th | `features/i18n/copy-{id,th}-certificate.js` | selesai, 42 kunci, paritas penuh |
| Route API penerbitan | — | **belum** |
| UI alur asesmen | — | **belum** |
| Halaman verifikasi publik | — | **belum** |
| Pembayaran | — | **belum**, terhalang akun Midtrans/Xendit |

Modul **sengaja belum dipasang ke `index.html`** dan belum masuk daftar precache `sw.js`.
Memasang modul yang belum dipakai hanya menambah berat cangkang tanpa fungsi. Saat UI-nya
dibuat nanti, keduanya wajib disunting bersamaan — `tests/pwa-cache-test.js` menuntut setiap
berkas yang dimuat `index.html` benar-benar diprecache.

## Kenapa subsistem ini ada

FIEZEL gratis dan akan tetap gratis. Yang dijual bukan pelajarannya, melainkan **bukti** —
dokumen yang bisa dilampirkan ke lamaran kerja. Bertarung sebagai "aplikasi belajar Inggris
gratis" melawan Duolingo adalah pertarungan yang kalah sebelum dimulai; yang tidak Duolingo
isi di Indonesia adalah celah antara "belajar sendiri" dan "TOEFL Rp 2–3 juta".

## Tiga aturan yang dikunci di kode

Sertifikat adalah satu-satunya keluaran FIEZEL yang dibawa murid **keluar** dari aplikasi, ke
tangan orang yang tidak pernah melihat layarnya. Begitu sehelai sertifikat mengklaim "B2",
klaim itu berdiri sendiri — tanpa konteks, tanpa catatan kaki, tanpa kesempatan meralat.
Maka ketiganya hidup sebagai kode dan gerbang, bukan sebagai konvensi yang bisa lupa dipatuhi.

### 1. Level tidak pernah melampaui bukti

Level global dibatasi skill **terlemah** yang terukur, dengan kelonggaran tepat satu skill
sejauh satu tingkat. Ia **bukan rata-rata**, dan gerbangnya secara eksplisit menolak
rata-rata: C2 di grammar + A1 di reading menghasilkan **A2**, bukan B1.

Rata-rata menyembunyikan lubang. Sertifikat yang menyembunyikan lubang adalah sertifikat
yang berbohong kepada pembacanya, dan yang menanggung akibatnya adalah murid yang
melampirkannya.

### 2. Yang tidak diuji ditulis tidak diuji

Skill tanpa soal bernilai `null`, **bukan `0`** dan bukan `'A1'`. Aturan yang sama dengan
`features/skills-evidence/fiezel-skills-evidence.js`, di sini dengan taruhan lebih tinggi.
Naskahnya pun menolak menampilkannya sebagai `-` atau kosong sampai pembaca mengiranya nol —
lihat kunci `cert.skill.notMeasured` dan `notMeasuredHint`.

### 3. Klaim berjenjang

Untuk mengklaim B2, murid harus juga lolos ambang di A1..B1. Tanpa aturan ini, menebak
beruntung di segelintir soal sulit bisa melompati seluruh tangga. Level yang tidak punya
cukup soal **dilewati** sebagai "tidak diuji", tidak memutus rantai — ketiadaan soal bukan
kegagalan.

## Yang juga tidak boleh dilunakkan

**Penafian.** `cert.disclaimer.body` menyatakan FIEZEL bukan lembaga asesmen terakreditasi
dan sertifikat ini tidak setara TOEFL/IELTS. Kalimat itu ikut tercetak di dokumen. Menghapus
atau mengaburkannya demi pemasaran membuat murid membawa sertifikat ke tempat yang tidak
menerimanya — kerugian yang ditanggung murid, bukan kita.

**Bukti tipis tidak menerbitkan apa pun.** Di bawah 25 soal total atau kurang dari 2 skill
terukur, `issue()` menolak dan menyebut alasannya lewat enum tertutup. Menolak menerbitkan
selalu lebih murah daripada menerbitkan klaim yang tidak bisa dipertahankan.

**Kebekuan harus sedalam klaimnya.** `Object.freeze` itu dangkal. Versi pertama modul ini
membekukan objek sertifikat tapi membiarkan `skills`, `itemsBySkill`, dan `measuredSkills`
mutable — sehingga `cert.skills.reading = 'C2'` berhasil, tepat pada jendela antara
penerbitan dan penandatanganan server. Kontrak **C9** sekarang mengunci ini. Jangan
melonggarkannya.

## Keputusan rancangan yang perlu diketahui

**ID pendek + catatan di DB, bukan token mandiri.** Sertifikat diverifikasi manusia yang
**mengetik** kodenya — staf HRD, panitia kampus. Token bergaya JWT panjangnya ratusan
karakter: mustahil diketik, mustahil dibacakan lewat telepon, dan **tidak bisa dicabut**.
Asesmen yang belakangan terbukti curang akan hidup selamanya. Maka bentuknya `FZ-XXXX-XXXX`
dengan alfabet tanpa `0 O 1 I L 5 S 8 B`.

Tanda tangan tetap wajib meski datanya ada di DB kita sendiri: ia menutup kasus seseorang
menulis langsung ke tabel tanpa lewat jalur penerbitan. ID **ikut ditandatangani**, jadi
catatan sah tidak bisa dipindah ke ID lain.

**Klien mengirim jawaban, server yang menilai.** Saat route API dibuat nanti, jangan
menerima skor dari klien — perangkat murid tidak bisa dipercaya menilai dirinya sendiri.
Server tahu kunci jawabannya; biarkan server yang menghitung, lalu jalankan
`fiezel-certificate-core.js` yang sama di sisi server.

## UTANG

**Naskah Thai (`copy-th-certificate.js`) adalah draft AI dan WAJIB direview penutur asli
sebelum sertifikat berbahasa Thai diterbitkan ke murid.** Dicatat 14 September 2026.

Taruhannya lebih tinggi dari domain mana pun di aplikasi: naskah ini ikut tercetak pada
dokumen yang dibawa ke pemberi kerja, dan kalimat penafian yang salah terjemah bukan sekadar
canggung — ia menghapus perlindungan yang justru jadi alasan kalimat itu ada. Saat direview,
`cert.disclaimer.body` dan `cert.skill.notMeasured` tidak boleh dilunakkan.

## Langkah berikutnya

Urutan ini disengaja — tiap langkah mengurangi risiko langkah sesudahnya:

1. **Route API penerbitan** (`workers/api/certificate/route-certificate.js`) + tabel D1.
   Penilaian di sisi server, pemeriksaan tabrakan ID sebelum menyimpan.
2. **Halaman verifikasi publik** di `fiezel.my.id/verify/`. Tanpa ini sertifikatnya tidak
   kredibel — HRD harus punya cara memeriksa keaslian.
3. **Alur asesmen bersertifikat** di aplikasi, memakai `features/ui/fiezel-exam-lock.js`
   yang sudah menangani deteksi keluar layar dan penguncian AI.
4. **Terbitkan gratis dua minggu**, ukur berapa yang benar-benar mengunduh dan membagikan.
   Kalau sedikit yang peduli, harga berapa pun tidak akan menolong — dan ini menjawabnya
   sebelum alur pembayaran dibangun.
5. **Pembayaran** (Midtrans/Xendit) baru setelah langkah 4 memberi angka. Terhalang akun
   bisnis yang harus didaftarkan OWNER.

Roadmap distribusi yang menaungi semua ini ada di `docs/PLAYSTORE-TWA-RUNBOOK.md` untuk
sisi Play Store.
