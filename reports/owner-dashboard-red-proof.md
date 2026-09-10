# Matriks bukti merah — tests/owner-dashboard-test.js (paket D1-owner)

Dihasilkan `tools/owner-dashboard-red-proof.js`. Setiap baris: satu invarian dirusak di
`workers/owner/index.js`, gerbang dijalankan, lalu berkas dipulihkan (hash sha256 dicek identik).

| Mutasi | Invarian yang dirusak | Cara merusak | exit | assert gugur | contoh assert yang merah |
|---|---|---|---|---|---|
| M1 | (f) "belum ada pengukuran" dirender BEDA dari "nol terukur" | paksa state selalu "measured" (nol tanpa data disamakan dengan nol terukur) | 1 | 4 | spanduk "belum ada pengukuran" tidak dirender |
| M2 | (f) spanduk keadaan dirender di ATAS panel | hapus render spanduk keadaan dari HTML | 1 | 3 | spanduk "belum ada pengukuran" tidak dirender |
| M3 | (f) kegagalan baca D1 tidak menyamar jadi nol | label keadaan "unavailable" diganti menjadi "nol terukur" | 1 | 2 | kegagalan baca D1 harus berbunyi "pengukuran tidak tersedia" |
| M4 | (f) nol terukur ditandai eksplisit, bukan angka telanjang | fmtCount() kembali menjadi format angka biasa | 1 | 1 | keadaan kosong merender angka 0 telanjang — owner akan membacanya sebagai fakta |
| M5 | (g) default deny untuk rute tak dikenal | rute tak dikenal dijawab 200 (fallthrough) alih-alih 403 | 1 | 1 | rute tak dikenal harus 403 bahkan untuk sesi owner yang sah (default deny): /api → 200, /api/ → 200, /api/summary2 → 200, /api/owner → 200, /api/owner/summary → 200, /api/cost/detail → 200, /api/students → 200, /api/murid → 200, /api/export → 200, /api/debug → 200, /admin → 200, /admin/ → 200, /dashboard → 200, /owner → 200, /metrics → 200, /health → 200, /healthz → 200, /status → 200, /.env → 200, /.git/config → 200, /wrangler.toml → 200, /queries.js → 200, /index.js → 200, /favicon.ico → 200, /robots.txt → 200, /sitemap.xml → 200, /logout/x → 200, /api/summary.json → 200, /api//summary → 200 |
| M6 | (h) nol rute owner yang bisa diakses tanpa gerbang | rute JSON /api/summary dipindah ke daftar publik | 1 | 8 | hanya /login yang boleh publik; rute publik lain = kebocoran |
| M7 | (i) identitas murid perorangan tidak pernah tampil | sanitizeRow() meloloskan seluruh kolom apa adanya | 1 | 65 | /api/summary menampilkan NILAI identitas murid (user_id) |
| M8 | (i) JSON tidak mengulang NAMA kolom asing keluar | daftar nama kolom yang dibuang dikirim kembali di payload JSON | 1 | 37 | /api/summary menampilkan NAMA kolom identitas murid (user_id) |

Baseline sebelum mutasi: exit 0. Pasca seluruh pemulihan: exit 0.
