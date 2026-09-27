# Menyalakan "kesulitan soal dari semua murid" (Braincore langkah 2)

Panduan untuk Owner. Semua langkah dikerjakan sekali saja.

## Apa yang terjadi sebelum langkah ini dikerjakan

Aplikasi murid (build m025-377 ke atas) sudah mencatat **jawaban pertama** setiap murid
pada setiap soal. Catatan itu **disimpan di HP murid sampai 56 hari** sambil menunggu
server siap, lalu dikirim otomatis begitu server menyala. Tidak ada yang rusak selama
menunggu: tingkat kesulitan soal tetap memakai cara lama (per HP).

Catatan yang lebih tua dari 56 hari dibuang dari HP (server memang hanya memakai 56 hari
terakhir). Jadi makin cepat dinyalakan, makin sedikit jawaban pertama yang terbuang.

## 1. Buat tabelnya di database `fiezel-evidence`

Dari laptop, di folder repo (butuh `npx wrangler@3 login` seperti di
`reports/EVIDENCE_ACTIVATION.md` langkah 0):

```
cd workers/api
npx wrangler@3 d1 execute fiezel-evidence --remote --file=migrations/0015_item_pool.sql
```

Cek:
```
npx wrangler@3 d1 execute fiezel-evidence --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'item_pool%' ORDER BY name"
```
Harus muncul 3 baris: `item_pool_daily`, `item_pool_dedup`, `item_pool_table`.

Database `fiezel-evidence` sudah ada (dipakai lane bukti belajar), jadi **tidak perlu
membuat database atau binding baru**.

## 2. Nyalakan saklarnya

Minta Claude: *"nyalakan ITEM_POOL_ENABLED"*. Claude membuat PR yang mengubah satu baris
di `workers/api/wrangler.toml`:

```
ITEM_POOL_ENABLED = "on"
```

Merge PR itu.

## 3. Deploy Worker

GitHub → tab **Actions** → **FIEZEL API Worker Deploy** → **Run workflow**.

## 4. Cek

Buka di browser:

```
https://api.fiezel.my.id/api/braincore/item-difficulty
```

- Sebelum menyala: `{"schema":"fiezel-item-difficulty-v1","day":null,"items":{},"disabled":true}`
- Sesudah menyala: kata `disabled` **hilang**. `items` masih kosong untuk sementara — itu normal.

## Kapan hasilnya mulai terasa

- Server membangun ulang tabel **sekali sehari** (cron 00:05 WIB).
- Sebuah soal baru dikoreksi setelah **dijawab pertama kali oleh minimal 20 murid** dalam
  56 hari terakhir. Dengan murid sedikit, butuh beberapa minggu sebelum soal pertama masuk
  tabel. Soal yang labelnya sudah tepat memang tidak akan pernah muncul di tabel.
- Soal yang sudah masuk tabel memakai koreksi dari semua murid; soal lain tetap memakai
  kalibrasi per HP seperti sebelumnya.

## Mematikan lagi

Ubah kembali ke `ITEM_POOL_ENABLED = "off"` lalu deploy. HP murid berhenti memakai tabel
dalam paling lama satu hari (tabel kosong menggantikan tabel lama). Pembersihan data lama
tetap berjalan walau saklar mati: penghitung harian dihapus setelah 120 hari, catatan
anti-dobel setelah 60 hari.

## Apa yang dikirim HP murid (singkatnya)

Per soal: kode soal (mis. `PR-101:apply_form`), perkiraan peluang benar sebelum menjawab
(dibulatkan ke 20 tingkat), benar/salah, dan tanggal. **Tanpa** nama, akun, cookie, kode
perangkat, atau jawaban yang diketik. Rincian: `docs/BRAIN-DATA-PRIVACY.md` §7c.
