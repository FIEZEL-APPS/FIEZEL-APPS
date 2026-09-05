# Class Hub: Kelas sebagai ruang Guru ↔ Murid ↔ Braincore

Otoritas: OWNER. Dokumen ini adalah kontrak singkat untuk subsistem `features/class-hub/`
yang masuk di build `m025-259`. Auditnya — kondisi sebelum, delapan gap (G1–G8), dan
arsitektur yang dipilih — hidup lengkap di `docs/class-hub-audit.md`; yang ada di sini
hanya hal-hal yang wajib dijaga siapa pun yang menyentuhnya berikutnya.

## Status

Tahap 1 SELESAI dan terpasang: `features/class-hub/fiezel-class-hub.js`,
`fiezel-braincore-review.js`, `class-hub.css`, dimuat dari `index.html`, dengan gerbang
sendiri di `tests/class-hub-test.js`.

## Kontrak yang harus dijaga

1. **Tab "Kelas" adalah kelas, bukan tutor suara.** Gap G1/G8 lahir justru karena global
   `classroom` ditimpa `tutor-v3` dan pembungkus di `app.js` membandingkan dirinya
   sendiri. Siapa pun yang menambah layar bernama sama wajib memastikan pintu bottom nav
   tetap menunjuk hub kelas.

2. **Bukti per-soal, bukan hanya `{c,t}`.** Laporan murid diperluas supaya guru bisa
   melihat miskonsepsi, bukan sekadar skor. Menyempitkannya kembali ke agregat berarti
   mengembalikan G5, dan tahap Braincore di atasnya kehilangan masukannya.

3. **Braincore hanya MENYARANKAN.** Alur `Original → Analysis → Suggested → Final`
   berakhir di keputusan guru. Tidak boleh ada jalur yang menyimpan hasil Braincore
   sebagai final tanpa persetujuan itu.

4. **Gerbang DOM-stub jalan di Node 22+.** `tests/class-hub-test.js` memalsukan
   `window`, `localStorage`, dan `navigator`. Sejak Node 22, `navigator` adalah getter
   global tanpa setter: `globalThis.navigator = {...}` melempar `TypeError` dan gerbang
   ini merah di CI walau hijau di mesin lama. Pakai `Object.defineProperty`. Aturan yang
   sama berlaku untuk setiap global baru yang dipalsukan di gerbang mana pun.

## Yang belum, dan tidak dikerjakan di tahap ini

- Status *sedang mengerjakan* dan *terlambat* (G4) belum dihitung dari deadline.
- Identitas guru ke murid (G7) masih memakai nama kelas pada sebagian jalur.
- Tulis/impor soal sendiri oleh guru (G3) belum ada; sumbernya tetap bank soal.

## Kaitan dengan pipa notifikasi

Kabar tugas guru ke murid tetap lewat `features/notify/fiezel-inbox.js` dan tunduk pada
kontrak di `docs/handoffs/NOTIFY-PIPELINE-HANDOFF.md` — termasuk bahwa `inbox.poll()`
diam total tanpa pesan bila murid belum memasukkan kode kelas. Class Hub tidak mengubah
syarat itu, jadi murid yang belum bergabung tetap tidak menerima apa pun.
