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

## Sudah selesai di gelombang m025-270

- **Indeks `UNIQUE (sub, provider)`** ada, bersama entri `INDEX_PROOF` di
  `tools/gen-auth-migrations.mjs` yang mengutip kueri sungguhan dari rutenya.
- **Rute `POST /api/auth/google`** hidup (`workers/api/route-auth-google.js`, SLOT 12).
  JWKS di-cache di Cache API — bukan KV, karena plan gratis hanya 1.000 tulis/hari —
  ditambah salinan dalam-isolate dan `stale-if-error`. Gerbangnya:
  `tests/google-auth-route-test.js`.
- **UI** ada: `features/auth/fiezel-google.js` + pasangan `copy-id-google.js` /
  `copy-th-google.js`, digambar di modal akun `app.js`. Gerbangnya:
  `tests/google-auth-ui-test.js`.
- **`GOOGLE_CLIENT_ID`** ada di `wrangler.toml` `[vars]` dan `FIEZEL_GOOGLE_AUTH` di
  `core-config.js`. Keduanya PUBLIK dengan sengaja; client secret tidak dipakai sama
  sekali di alur ini, jadi tidak ada secret yang perlu disimpan di mana pun.

## Gelombang m025-272 — tombolnya pindah ke depan

Sampai m025-270 tombol masuk hidup TIGA ketukan di dalam Pengaturan (Pengaturan → kartu
Akun FIEZEL → Masuk/Daftar). Owner melaporkan tidak menemukannya, dan itu gejala dari
kerugian yang lebih mahal daripada sekadar sulit dicari.

Murid yang ganti HP: buka aplikasi → pilih bahasa → ketik nama → pilih tujuan → tes
penempatan → **baru** menemukan tombol masuk. Saat itu ia sudah terlanjur menjadi murid
BARU bagi gurunya: `sub` perangkat ini bukan `sub` akunnya, jadi kelas, tugas guru, teman,
dan notifikasinya tidak ada. **Tombol masuk yang baru bisa ditemukan sesudah kerugian itu
terjadi adalah tombol yang datang terlambat.**

Sekarang blok "Sudah punya akun?" berdiri di pra-langkah pemilih bahasa
(`features/onboarding/fiezel-onboarding.js`, `LANGUAGE_STEP`), **di bawah** kedua pilihan
bahasa. Gerbangnya: `tests/onboarding-test.js` (enam kasus, tiga mutasi terbukti merah).

Tiga hal yang tidak boleh diubah tanpa membaca alasannya:

1. **Sekunder, bukan aksi utama.** Mayoritas yang membuka layar itu murid BARU yang memang
   harus memilih bahasa. Gerbangnya menegakkan urutan markup: blok masuk wajib berada
   SESUDAH `data-ob-locale`.
2. **`locale:'auto'`, bukan `'id'`.** Memaksa `id` pada layar yang JUSTRU sedang menanyakan
   bahasa akan menyodorkan tombol berbahasa Indonesia kepada murid Thai. Mudah dibuat,
   sulit terlihat dari Indonesia.
3. **Naskahnya dwibahasa harfiah, bukan copy-map.** Pada cat PERTAMA belum ada locale
   pilihan dan copy Thai memang belum diunduh. Anggaran `th-ui-leak` untuk berkas itu naik
   1 → 3; setiap kalimat yang dihitung punya padanan Thai di baris yang sama.

Digambar dari `bind()`, bukan sekali saat mount: `paint()` menulis ulang `innerHTML`, jadi
tombol yang digambar skrip Google ikut terhapus tiap cat ulang.

**BATASAN YANG HARUS DISEBUT KE MURID DAN KE OWNER:** masuk di layar ini memulihkan AKUN
(kelas, tugas guru, teman, notifikasi — semuanya berkunci `sub` di server), TETAPI BUKAN
profil belajar (nama, tujuan, level). Profil itu hidup di perangkat dan tidak pernah
dikirim ke server, jadi di HP baru tetap diisi ulang. Kalimat status sesudah berhasil masuk
karena itu tidak menjanjikan onboarding terlewat — ia berkata "pilih bahasamu untuk lanjut".

## Langkah berikutnya — jangan anggap fitur ini selesai

Urut dari yang paling mahal kalau dibiarkan:

1. **Murid yang masuk HANYA dengan Google belum punya baris `auth_account`**, jadi
   `/api/account/me` menjawab anonim untuknya dan layar akun tidak bisa menyapa dengan
   handle. Sesi, kelas, dan tugas guru TETAP pulih (semuanya berkunci `sub` dari cookie);
   yang hilang hanya handle. Memperbaikinya berarti menambah tempat KETIGA yang membuat
   `auth_account`, dan `tests/role-security-test.js` menuntut tepat dua — pagar itu benar,
   jadi perubahannya harus berdiri sendiri dan ditinjau, bukan disisipkan ke gelombang lain.
   Handle turunan email JANGAN dipakai: handle bisa terlihat murid lain, dan email anak
   bukan nama panggilan.
2. **Menautkan Google dari Pengaturan** untuk pemilik akun sandi yang sudah ada. Rutenya
   sudah mendukung (kasus B menautkan ke `sub` yang sedang dipakai); yang belum ada hanya
   pintunya di layar Pengaturan.
3. **Melepas tautan Google** (hapus baris `auth_oauth_identity`). Hari ini murid yang salah
   menautkan akun Google harus meminta owner, dan tidak ada jalur owner untuk itu.
4. **Profil belajar ikut pulih.** Lihat batasan di gelombang m025-272 di atas. Ini butuh
   menyimpan profil onboarding (nama, tujuan, level) di server berkunci `sub` — keputusan
   privasi tersendiri, karena nama murid hari ini TIDAK pernah meninggalkan perangkat
   kecuali lewat jalur kelas yang sudah punya kontraknya sendiri. Jangan kerjakan sebagai
   tambahan diam-diam pada perubahan lain.
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
