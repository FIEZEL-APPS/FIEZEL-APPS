# tests/ — gerbang mutu FIEZEL

Seluruh gerbang (`*-test.js`, `*-selftest.js`) tinggal di sini sejak m025-254. Sebelumnya
mereka berada di akar repo bersama `index.html`, `app.js`, dan `style.css`, sehingga siapa pun
yang mau menyentuh UI harus menyaring 243 berkas uji lebih dulu.

## Menjalankannya

Selalu dari AKAR repo, bukan dari dalam folder ini:

```bash
node tests/regression-test.js
node tests/m02542-experience-test.js
```

Daftar lengkap yang dijalankan CI ada di `.github/workflows/quality.yml`, dan
`tests/gate-registry-test.js` menjaga agar setiap gerbang di repo memang terdaftar di sana
(atau punya pengecualian beralasan).

## Kenapa `__fzRoot`

Puluhan gerbang memakai `__dirname` untuk menunjuk berkas produksi — waktu berkasnya masih di
akar, `__dirname` MEMANG berarti akar repo. Setelah pindah, tiap berkas yang memakainya
mendapat satu baris di dekat `'use strict'`:

```js
const __fzRoot = require('path').join(__dirname, '..');
```

dan seluruh pemakaian `__dirname` lama menunjuk ke sana. Artinya tidak berubah, hanya alamatnya.
Berkas produksi tetap di-`require` dengan `'../'` (mis. `require('../features/ui/fiezel-zoom-lock.js')`),
sementara pembacaan relatif-cwd (`fs.readFileSync('app.js')`) tetap benar karena gerbang
dijalankan dari akar.

## Menambah gerbang baru

1. Simpan di sini dengan akhiran `-test.js`.
2. Daftarkan di `.github/workflows/quality.yml` sebagai `node tests/<nama>-test.js`.
3. Kalau gerbang membaca berkas produksi lewat `__dirname`, pakai pola `__fzRoot` di atas.
