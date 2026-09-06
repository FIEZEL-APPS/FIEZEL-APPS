# Login Google: fondasi (skema + verifikasi token)

Otoritas: OWNER. Keputusan diambil 6 September 2026, dengan dua pilihan eksplisit:

1. **Yang tidak punya Google mendaftar dengan akun FIEZEL biasa** — jalur `login_handle` +
   kata sandi TETAP hidup berdampingan, tidak dipensiunkan.
2. **Email WAJIB disimpan**, dengan alasan yang owner nyatakan sendiri: **menghubungi orang
   tua atau sekolah**.

Dokumen ini menutup potongan PERTAMA: skema dan verifikasi token. Rute dan UI menyusul di
paket kerja terpisah — lihat "Yang belum" di bawah.

## Yang sudah ada sesudah paket ini

| Berkas | Isi |
| --- | --- |
| `workers/api/auth-schema.js` | `OAUTH_TABLES` + `OAUTH_DDL` (dua tabel) |
| `workers/api/migrations/0013_oauth_email.sql` | diturunkan otomatis; alasan keputusannya di kepalanya |
| `workers/api/auth/google-core.js` | verifikasi ID token, murni, tanpa jaringan |
| `tests/google-auth-core-test.js` | 21 assert dengan kunci RSA SUNGGUHAN |

## Kontrak yang harus dijaga

**1. `sub` yang sudah ada TIDAK PERNAH diganti saat menautkan Google.**
Ini aturan terpenting di seluruh paket. `sub` adalah kunci di **16 tabel**: keanggotaan
kelas, laporan yang sudah dilihat guru, daftar teman, notifikasi, tugas berjalan. Login
Google MENEMPEL pada identitas yang ada lewat `auth_oauth_identity`; ia bukan identitas
baru. Menerbitkan `sub` baru saat login Google = murid menjadi orang asing bagi gurunya,
dan progres lokalnya tetap ada tapi tidak lagi terhubung ke siapa pun.

**2. Email adalah ATRIBUT, bukan kunci.**
Kunci tautan adalah `provider_sub` (klaim `sub` Google): buram, stabil, tidak pernah dipakai
ulang orang lain. **Email bisa berganti pemilik** — alamat sekolah yang dilepas lalu
diberikan ke murid baru adalah kejadian biasa. Mencari akun berdasarkan email saat login
berarti murid baru itu mewarisi akun pendahulunya. `auth_email` sengaja TIDAK unik: dua
murid boleh berbagi email orang tua.

**3. Klien tidak pernah dipercaya menyebut siapa dirinya.**
Klien mengirim SATU string: ID token. Email, id akun, semuanya dibaca server dari token yang
tanda tangannya sudah diperiksa. Menerima `{email}` atau `{sub}` mentah dari klien akan
menjadi cara mengambil alih akun orang lain dengan mengetik alamatnya — kelas kerentanan
yang sama yang sudah ditulis panjang di kepala `route-auth.js` untuk jalur Puter.

**4. Enam pemeriksaan token, semuanya wajib.** Bentuk · `alg === RS256` (diperiksa SEBELUM
kunci disentuh, ini yang mematikan algorithm confusion) · tanda tangan terhadap `kid` yang
cocok · `iss` ∈ dua bentuk Google · `aud` === Client ID KITA · `exp`/`iat` termasuk umur
maksimum. Menghapus salah satu = lubang. `aud` khususnya: tanpa itu, token yang sah untuk
aplikasi Google ORANG LAIN bisa dipakai masuk ke FIEZEL.

**5. Yang tidak dibutuhkan tidak diambil.** Token Google membawa `name`, `picture`,
`given_name`, `locale`. Verifier sengaja hanya mengembalikan `sub` dan `email`; gerbang
menguji itu (`Object.keys` persis empat). FIEZEL dipakai anak-anak.

**6. Email yang belum diverifikasi Google DITOLAK.** Alamat yang belum terbukti milik
pemegang akun tidak berguna untuk menghubungi orang tua, dan berbahaya kalau dipercaya.

**7. Larangan email 0011 DIPERSEMPIT, bukan dihapus.**
`tests/auth-schema-contract-test.js` sekarang mengizinkan kolom `email` HANYA di tabel
`auth_email`. Di tabel lain mana pun ia tetap merah — dibuktikan dengan menambahkan
`email` ke `auth_account` dan melihat gerbang gagal. Sisa daftar keras (nama asli murid,
sekolah, umur, nomor HP, IP mentah, User-Agent, transkrip, teks bebas antar pengguna)
berlaku utuh.

## Dua penyalahgunaan yang ditutup skema

| Pagar | Menutup apa | Status |
| --- | --- | --- |
| `PRIMARY KEY (provider, provider_sub)` | satu akun Google tidak bisa tertaut ke dua akun FIEZEL — percobaan kedua GAGAL di tingkat basis data, bukan memindahkan tautan diam-diam ke akun penyerang | **ada** |
| `UNIQUE (sub, provider)` | satu akun FIEZEL tidak bisa menumpuk dua akun Google | **belum** |

Arah kedua sengaja belum dijaga indeks. `tests/d1-schema-contract-test.js` menuntut setiap
indeks punya kueri NYATA yang memakainya, dan rutenya belum ditulis — indeks tanpa pembaca
adalah baris tertulis sia-sia pada setiap INSERT selamanya. Ia ditambahkan **bersama
rutenya**, pola yang sama dengan enam indeks lain yang sengaja absen di 0011/0012.

Yang hilang sementara itu bukan lubang keamanan: menumpuk dua akun Google pada satu `sub`
berarti berbagi akun antara dua login yang pemiliknya buktikan sendiri, bukan
pengambilalihan. Arah yang berbahaya sudah ditutup PK.

## Yang belum — jangan anggap fitur ini hidup

- **Indeks `UNIQUE (sub, provider)`** — ditambahkan bersama rutenya, dengan entri
  `INDEX_PROOF` di `tools/gen-auth-migrations.mjs` yang mengutip kueri sungguhan.
- **Rute `POST /api/auth/google` belum ada.** Verifier sudah siap tetapi belum ada yang
  memanggilnya. Rute itu harus: mengambil JWKS dari `GOOGLE_JWKS_URL` **dengan cache**
  (jangan satu fetch per login), memakai `ctx.identity.sub` yang SUDAH ADA, menolak bila
  akun ini sudah tertaut ke Google lain, lalu menulis `auth_oauth_identity` + `auth_email`.
- **UI belum ada.** Tombol "Masuk dengan Google" dan teksnya wajib lahir dua bahasa
  (pasangan `copy-id-*` / `copy-th-*`) seperti aturan CLAUDE.md.
- **`GOOGLE_CLIENT_ID` belum masuk `wrangler.toml`.** Ia PUBLIK dan aman sebagai `[vars]`;
  jangan diperlakukan sebagai secret. Client secret TIDAK dipakai sama sekali di alur ini.
- **Jalur `/api/auth/claim` (Puter) masih ada dan masih mati** — penerbit tiketnya tidak
  pernah dibangun, jadi ia selalu 401. Kalau Google menggantikannya, cabut rutenya beserta
  `STUB-PUTER-CLAIM-TICKET.md` dan secret `PUTER_CLAIM_SECRET_*`; jangan tinggalkan dua
  sistem klaim setengah jadi.
- **Penghapusan akun 24 bulan** yang dijanjikan `/privacy/` tetap belum dibangun — lihat
  `PRIVACY-COMMITMENTS-HANDOFF.md`. Menambah email membuat utang itu lebih mendesak, bukan
  kurang: sekarang yang menumpuk pada akun mati adalah alamat email anak.

## Kalau halaman privasi berubah, kode ikut — dan sebaliknya

`/privacy/` bagian 3.2 menjelaskan persis dua hal yang diambil dari Google: pengenal akun
dan alamat email. Menambah klaim ketiga dari token (nama, foto) berarti halaman itu mulai
berbohong sejak commit itu. Aturan ini juga tertulis di `PRIVACY-COMMITMENTS-HANDOFF.md`.
