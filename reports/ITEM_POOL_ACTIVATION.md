# Menyalakan "kesulitan soal dari semua murid" + penyetelan angka rumus (Braincore langkah 2–3)

Panduan untuk Owner. Semua langkah dikerjakan sekali saja.

## Status sekarang (m025-378)

- ✅ Migrasi `0015_item_pool.sql` sudah diterapkan, saklar `ITEM_POOL_ENABLED = "on"` (#474).
- ⏳ **Yang tersisa untukmu** setelah PR langkah 3 di-merge:
  1. jalankan satu migrasi baru, `0016_item_pool_probe.sql` (langkah 1 di bawah, perintah kedua saja);
  2. deploy Worker (langkah 3 di bawah).
  Sampai migrasi 0016 diterapkan, jawaban soal tetap tercatat seperti biasa; hanya hasil probe
  ingatan yang belum tersimpan.
- Mulai m025-378, tabel kesulitan soal dibangun **GitHub Actions** (workflow
  **Braincore Item Pool**), bukan server lagi. Tidak perlu langkah apa pun — rahasia yang dipakai
  sama dengan workflow deploy.

## Apa yang terjadi sebelum langkah ini dikerjakan

Aplikasi murid (build m025-377 ke atas) sudah mencatat **jawaban pertama** setiap murid
pada setiap soal. Catatan itu **disimpan di HP murid sampai 56 hari** sambil menunggu
server siap, lalu dikirim otomatis begitu server menyala. Tidak ada yang rusak selama
menunggu: tingkat kesulitan soal tetap memakai cara lama (per HP).

Catatan yang lebih tua dari 56 hari dibuang dari HP (server memang hanya memakai 56 hari
terakhir). Jadi makin cepat dinyalakan, makin sedikit jawaban pertama yang terbuang.

## 1. Buat tabelnya di database `fiezel-evidence`

Dari laptop, di folder repo (butuh `npx wrangler@3 login` seperti di
`reports/EVIDENCE_ACTIVATION.md` langkah 0). **Dua perintah**, berurutan:

```
cd workers/api
npx wrangler@3 d1 execute fiezel-evidence --remote --file=migrations/0015_item_pool.sql
npx wrangler@3 d1 execute fiezel-evidence --remote --file=migrations/0016_item_pool_probe.sql
```

Cek:
```
npx wrangler@3 d1 execute fiezel-evidence --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'item_pool%' ORDER BY name"
```
Harus muncul 4 baris: `item_pool_daily`, `item_pool_dedup`, `item_pool_probe_daily`,
`item_pool_table`.

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

- Tabel dibangun ulang **sekali sehari** oleh GitHub Actions: workflow **Braincore Item Pool**
  (01:20 WIB, bisa juga dijalankan manual lewat **Run workflow**). Ia memakai rahasia
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` yang SAMA dengan workflow deploy — tidak ada
  rahasia baru. Kalau run pertama gagal dengan pesan izin, token perlu izin **D1 (edit)**
  (`docs/CF-MIGRATION-RUNBOOK.md` §3.4).
- Sebuah soal baru dikoreksi setelah **dijawab pertama kali oleh minimal 20 murid** dalam
  56 hari terakhir. Dengan murid sedikit, butuh beberapa minggu sebelum soal pertama masuk
  tabel. Soal yang labelnya sudah tepat memang tidak akan pernah muncul di tabel.
- Soal yang sudah masuk tabel memakai koreksi dari semua murid; soal lain tetap memakai
  kalibrasi per HP seperti sebelumnya.

## Usulan penyetelan angka rumus (Braincore langkah 3)

Job yang sama juga menghitung apakah tiga angka rumus Braincore — **ketajaman soal (a)**,
**peluang tebak (c)**, dan **paruh-waktu ingatan** — sebaiknya diubah. Hasilnya ada di
halaman run: GitHub → **Actions** → **Braincore Item Pool** → run terakhir → bagian
**Summary**.

- Biasanya tertulis **"Tidak ada usulan"** — itu normal. Usulan baru muncul kalau datanya
  cukup (±3.000 jawaban untuk a/c, ±600 jawaban probe untuk ingatan) **dan** angka baru
  terbukti memprediksi lebih baik secara meyakinkan.
- Kalau ada usulan: minta Claude **"terapkan usulan penyetelan Braincore"**. Claude membuat PR;
  angka tidak pernah berubah sendiri (keputusanmu: rumus inti tidak boleh bergerak tanpa
  persetujuan).

## Mematikan lagi

Ubah kembali ke `ITEM_POOL_ENABLED = "off"` lalu deploy. HP murid berhenti memakai tabel
dalam paling lama satu hari (tabel kosong menggantikan tabel lama). Pembersihan data lama
tetap berjalan walau saklar mati: penghitung harian dihapus setelah 120 hari, catatan
anti-dobel setelah 60 hari.

## Apa yang dikirim HP murid (singkatnya)

Per soal: kode soal (mis. `PR-101:apply_form`), perkiraan peluang benar sebelum menjawab
(dibulatkan ke 20 tingkat), benar/salah, dan tanggal. **Tanpa** nama, akun, cookie, kode
perangkat, atau jawaban yang diketik. Rincian: `docs/BRAIN-DATA-PRIVACY.md` §7c.
