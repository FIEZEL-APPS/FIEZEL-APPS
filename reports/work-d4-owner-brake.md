# D4 — Rem token owner: rem yang benar-benar berdiri di depan token

Branch `work/d4own`. Tidak di-push. Tidak ada versi build yang dinaikkan (`SW_REV`, `DIAG_BUILD`,
`FIEZEL_PAGE_BUILD` tidak disentuh). Berkas terlarang (`app.js`, `style.css`, `index.html`,
`core-config.js`, `sw.js`, `features/`, `coordination/`, `workers/api/`) tidak disentuh.

Yang berubah:

| Berkas | Isi perubahan |
|---|---|
| `workers/owner/index.js` | rem login baru (KV, per-sumber, jendela bergulir) + `GET /` → 303 `/login` |
| `workers/owner/wrangler.toml` | binding KV `CFG` → `fiezel-CFG`, plus koreksi klaim "Nol tulis KV" yang kini salah |
| `workers/owner/README.md` | §1, §4, §5 #12/#13 ditulis ulang supaya cocok dengan perilaku yang sebenarnya |
| `tests/owner-edge-guard-test.js` | butir `(b-a)`…`(b-g)` baru; butir `(g-g)` diperketat untuk KV; `(b)`/`(g-a)`/`(g-f)` menilai pengalihan, bukan dilonggarkan |
| `tests/owner-dashboard-test.js` | empat titik yang mengassert 403 di `GET /` kini mengassert pengalihan secara ketat |
| `reports/d4-owner-brake-red-proof.mjs` + `.json` | 24 mutasi terarah, semuanya terbukti merah |

## 1. Apa yang sebenarnya salah

Dua cacat yang diberikan di tugas, dan keduanya cocok dengan kode yang saya baca sebelum menyunting:

1. `loginAttempts = new Map()` di lingkup modul `index.js`. Itu memori PER-ISOLATE. Cloudflare
   menjalankan banyak isolate per colo dan mendaur ulangnya sesuka runtime, jadi hitungannya tidak
   pernah menumpuk. Batas efektifnya bukan 8, melainkan 8 × jumlah isolate — yang praktis berarti
   tanpa batas.
2. `loginThrottled('login', now)` memakai string tetap `'login'`: satu ember global. Kalau remnya
   benar-benar bekerja, delapan kegagalan dari siapa pun akan mengunci owner keluar dari
   satu-satunya pintunya.

**Batas kejujuran bukti:** angka "12 percobaan token salah → 403 dua belas kali, nol 429" berasal
dari pengujian lapangan yang diberikan bersama tugas ini. Saya TIDAK memverifikasinya ulang;
gerbang repo dijalankan tanpa jaringan (`tests/no-network-test.js` memang melarangnya). Yang saya
verifikasi sendiri adalah sebabnya di kode (Map lingkup modul), dan saya mereproduksi POLANYA di
gerbang: butir `(b-a)` menjalankan 8 permintaan token salah lewat 8 modul yang diimpor terpisah
TANPA penyimpanan bersama dan mendapat 403 delapan kali, nol 429. Jadi klaim mekanismenya berdiri
di atas bukti yang bisa dijalankan ulang, bukan di atas ingatan.

Cacat ketiga juga nyata di kode: `GET /` tanpa sesi jatuh ke `deny()` yang sama dengan rute API,
jadi owner yang membuka bookmark disambut `{"error":"forbidden"}`. Karena sesi hanya berumur 30
menit, itu kejadian harian, bukan kasus tepi.

## 2. Penyimpanan yang dipilih: KV `fiezel-CFG`, dengan angkanya

**Kenapa bukan D1 `fiezel-stats`** meski sudah terikat sebagai `ANALYTICS`:

- Ia database ANALYTICS. `tests/analytics-privacy-test.js` menguncinya pada lima tabel agregat dan
  `DEPLOY.md` melarang mencampur data auth ke sana. Penghitung rem login adalah data auth.
- Worker owner HANYA-BACA terhadap database itu, dan sifat itu ditegakkan gerbang (`queries.js`
  menolak memuat kata tulis). Rem yang menulis akan mengubah pembaca menjadi penulis: satu
  invarian hilang demi satu penghitung.
- D1 single-threaded per database (cf-a11 risiko 5). Tulis rem auth akan berebut dengan rollup
  analytics.

Saya tidak mengklaim ini "bukan pelanggaran pemisahan" — saya menghindari pelanggarannya.

**Kenapa KV `fiezel-CFG` (id `6386fc9752e14afd8a8f76a8d45e47d1`)**, dan harga yang dibayar:

- **Kuota tulis.** Plan gratis: 1.000 tulis/hari untuk kunci berbeda, 1 tulis/detik untuk kunci
  yang sama ([Cloudflare KV limits](https://developers.cloudflare.com/kv/platform/limits/)).
  Karena itu yang menulis HANYA percobaan yang gagal: login berhasil nol tulis, permintaan yang
  sudah ditolak 429 nol tulis. Batas atas satu sumber yang menyerang tanpa henti = 5 tulis per 10
  menit = **720/hari**, yaitu 72% kuota, menyisakan ~280 tulis untuk flag owner dan penanda
  anti-replay yang juga hidup di namespace itu. Angka lama (8) akan memberi 8 × 6 × 24 = **1.152
  tulis/hari** — melewati kuota dari SATU penyerang. Itu salah satu dari dua alasan batasnya
  turun ke 5. Ketiga sifat "nol tulis" ini diassert di `(b-a)`/`(b-b)`, bukan hanya diklaim.
- **Konsistensi eventual — ini harga sebenarnya.** Perubahan KV bisa butuh 60 detik atau lebih
  untuk terlihat di lokasi lain, dan lebih lama di lokasi yang baru saja membaca versi sebelumnya,
  termasuk pembacaan yang menyatakan kunci tidak ada
  ([how KV works](https://developers.cloudflare.com/kv/concepts/how-kv-works/)). `cacheTtl` default
  60 detik dengan minimum 30 detik
  ([read key-value pairs](https://developers.cloudflare.com/kv/api/read-key-value-pairs/)), jadi
  rem ini meminta 30 — jendela lag tersempit yang diizinkan.
  **Berapa yang lolos di jendela lag:** selama satu jendela cache (≤30 detik) sebuah lokasi bisa
  membaca hitungan basi, paling buruk "kunci tidak ada". Di jendela itu yang menegakkan batas
  hanyalah lapis memori per-isolate: 5 percobaan per isolate per 30 detik. Satu klien lewat satu
  koneksi umumnya dilayani isolate yang sama (≈5 per 30 detik ≈ 10/menit); penyerang yang
  benar-benar mendapat isolate baru setiap permintaan bisa melewatkan lebih banyak selama 30 detik
  pertama. Sesudah itu hitungan terkumpul terlihat dan sumbernya terkunci untuk sisa 10 menit.
  Nama kunci juga berputar tiap 2 menit, jadi kerusakan cache basi kira-kira selebar satu ember,
  bukan seluruh jendela.
  **Kenapa itu masih dapat diterima:** yang dilindungi bukan invarian akuntansi, ini rem banjir,
  dan pembandingnya adalah keadaan hari ini di mana 12 dari 12 percobaan lolos tanpa batas apa
  pun. Dari "tanpa batas" menjadi "beberapa percobaan per 30 detik lalu terkunci" adalah
  perubahan kelas, bukan penyetelan.
- **Kuota baca.** 100.000/hari. Satu percobaan = 5 baca. Sumber yang sudah diketahui terkunci di
  isolate ini ditolak dengan NOL operasi KV (lapis memori menjadi cache-negatif), jadi banjir
  panjang tidak menguras kuota baca 5× jumlah permintaan.
- **Nol binding ke `fiezel-core`.** Yang ditambahkan hanya `CFG`. Butir `(g-g)` sekarang
  mengassert: TEPAT satu binding KV, binding `CFG`, id `fiezel-CFG` yang benar, nol binding jenis
  lain, nol jejak `fiezel-core`, `workers_dev = false` tetap, dan klaim "Nol tulis KV" tidak boleh
  kembali ke `wrangler.toml`/README.

## 3. Kunci rem: per-sumber, IP tidak pernah mentah

Sumber = `CF-Connecting-IP`, header yang ditulis Cloudflare; apa pun yang dikirim klien dengan nama
itu ditimpa sebelum Worker melihatnya. Ia dipakai HANYA sebagai kunci ember, tidak pernah sebagai
pemberi hak. Kunci = `HMAC-SHA256(salt, 'owner-login|v1|<indeks-hari>|<lingkup>|<ip>')` dipotong
128 bit — pola `workers/api/rate-anon.js:ipHmacOf()`, bukan pola baru. Salt: `RATE_SALT`, lalu
`OWNER_SESSION_KEY` sebagai lantai kedua, lalu konstanta sebagai lantai terakhir supaya IP tidak
pernah menjadi kunci mentah bahkan sebelum owner memasang secret. Indeks hari ikut ditandatangani
supaya hash yang sama tidak bisa dipakai melacak satu jaringan antar hari.

Jalur jembatan PHP (`edgePath === 'header'`) tidak membawa IP pemanggil — `deploy/edge/*.php`
sengaja tidak meneruskannya. Di jalur itu embernya memang BERSAMA, jadi batasnya dipisah dan
dilonggarkan (`LOGIN_MAX_SHARED = 20`), sama seperti cabang jembatan di `rate-anon.js` yang
menjadi anggaran global. Granularitas per-sumber di belakang jembatan mustahil tanpa meneruskan
IP; itu batas nyata, bukan kelalaian. Jalur hidup hari ini adalah custom domain.

## 4. Angka jendela, untuk satu manusia yang kadang salah tempel token

`LOGIN_MAX = 5` percobaan gagal per sumber per **10 menit bergulir** (5 ember × 2 menit).

- Satu manusia yang salah tempel: 1–2 kali (token terpotong, spasi ikut tersalin, salah entri di
  password manager). 3 kali sudah hari yang buruk. 5 ≈ dua kali hari terburuk itu.
- Owner tidak bisa terkunci selamanya oleh kesalahannya sendiri: ember tertua keluar dari jendela
  tiap 2 menit, jadi sesudah kehabisan percobaan ia mendapat **satu percobaan lagi dalam 2 menit**
  dan **jendela penuh bersih dalam 10 menit**. Bukan "tunggu sampai jam berganti". Butir `(b-c)`
  membuktikan keduanya dengan jam palsu.
- Kunci KV berumur jendela + satu ember lalu hilang sendiri: tidak ada baris menumpuk, tidak ada
  cron pembersih, tidak ada keadaan terkunci yang bisa macet karena sesuatu lupa dihapus.
- Jendela BERGULIR, bukan reset di menit ke-0. Dengan ember tetap, penyerang cukup menunggu
  pergantian jendela untuk kuota penuh, dan dua ember berdampingan memberi 2× batas dalam dua
  menit.

`Retry-After` konstan 120 detik. Nilai yang dihitung dari ember tertua akan memberi tahu penyerang
kapan ia terakhir mencoba; badan 429 juga tidak memuat sisa kuota dan identik di setiap penolakan.

**Apakah `LOGIN_MAX = 8` per 10 menit masih benar sesudah remnya nyata?** Tidak, dan bukan karena
alasan keamanan. Token 32 byte acak tidak realistis ditebak pada 8 maupun 5 percobaan per 10
menit; perbedaan 720 versus 1.152 percobaan/hari tidak mengubah apa pun terhadap penebakan. Yang
mengubah keputusan adalah dua hal lain: (1) 1.152 tulis/hari MELEWATI kuota 1.000/hari dari satu
sumber saja, jadi 8 membuat rem menjadi cara membakar kuota namespace yang juga dipakai flag dan
anti-replay; (2) untuk satu pengguna manusia, 5 sudah dua kali lipat hari terburuknya, jadi
kelonggaran ekstra itu tidak membeli apa pun untuk owner. Turun ke 5 dibayar dari sisi yang tidak
penting dan menghasilkan angka kuota yang aman.

## 5. Yang rem ini TIDAK cegah — katakan terus terang

Rem ini menahan penebakan dan credential stuffing berlaju tinggi dari satu sumber. Ia **tidak
menolong sedikit pun terhadap token yang bocor**, dan token login owner memang sudah bocor lewat
percakapan. Penyerang yang memegang tokennya masuk pada percobaan PERTAMA; rem apa pun akan
meloloskannya, karena satu percobaan yang benar tidak pernah tampak seperti serangan. Rem ini juga
tidak menghentikan serangan tersebar dari banyak IP (tiap IP punya embernya sendiri — itu memang
harga dari "tidak bisa mengunci owner"), tidak melindungi dari pencurian cookie sesi, dan tidak
melindungi apa pun kalau `*.workers.dev` dinyalakan lagi.

Yang benar-benar menutup jalur itu: **(1) rotasi token owner** (belum saya lakukan, bukan
kewenangan branch ini), **(2) Cloudflare Access + MFA di depan `owner.fiezel.my.id`** — lapis kedua
yang dijanjikan README §2, masih menunggu satu klik owner di dashboard Zero Trust dan hari ini
BELUM AKTIF, **(3)** umur sesi 30 menit. Jangan membaca 429 di halaman masuk sebagai "dashboard
sudah aman".

## 6. Keputusan kegagalan penyimpanan: FAIL-OPEN, dan kenapa berbeda dari jalur murid

Galat KV (kuota habis, KV tersendat, binding belum dipasang) **tidak pernah, dengan sendirinya,
menghasilkan 429**. Remnya tidak hilang: ia jatuh ke lapis memori per-isolate dengan batas YANG
SAMA, tidak diperketat. Ini sengaja kebalikan dari `workers/api/rate-anon.js`, yang memilih
fail-closed terhadap pembatas dan malah memperketat batasnya ke 5. Tiga alasan, dan semuanya
tentang perbedaan yang nyata, bukan selera:

1. **Yang dilindungi berbeda.** Di jalur murid, di belakang pintu ada UANG: setiap identitas baru
   membawa jatah AI/TTS, jadi penyerang yang membuat penyimpanan gagal MENDAPAT sesuatu. Di sini
   di belakang pintu ada token acak 32 byte; penyerang yang membuat KV gagal tidak mendapat apa
   pun yang bisa dipakai — ia masih harus menebak yang tak bisa ditebak.
2. **Siapa yang menanggung salah-ketat berbeda.** Di jalur murid, batas yang terlalu rapat menunda
   AI/TTS satu murid dan pelajarannya tetap jalan. Di sini pintunya satu dan penggunanya satu:
   kalau rem mengunci owner karena KV tersendat, yang terkunci adalah satu-satunya orang yang bisa
   memperbaiki apa pun, dan ia tidak punya cara mengosongkan ember dari luar. Kegagalan
   penyimpanan tidak boleh menjadi kunci gembok.
3. **Arah penyalahgunaannya berbeda.** Membuat rem ini gagal ke arah terbuka memberi penyerang
   paling banyak beberapa percobaan tambahan per isolate. Membuat rem murid gagal ke arah terbuka
   memberi identitas tak terbatas, dan itu tagihan.

Butir `(b-g)` mengassert keduanya: KV rusak → owner tetap bisa masuk dan tidak ada 429 yang lahir
dari galat itu, TETAPI lapis memori tetap mengerem di dalam satu isolate.

## 7. `GET /` → `/login` tanpa melemahkan apa pun

`GET /` tanpa sesi kini 303 ke `/login`. Yang dijaga:

- Pengalihan berada **di belakang penjaga tepi lapis 1**. Di `*.workers.dev` dan hostname asing,
  `GET /` tetap 403 seperti sebelumnya (`(b-f)`).
- Hanya `GET /`. Semua rute lain, semua metode lain, dan semua rute yang belum ada tetap 403
  default-deny.
- **Byte-identik** entah Secret sudah dipasang atau belum: tanpa badan, tanpa `Set-Cookie` (cookie
  basi sengaja tidak dihapus di sini — menghapusnya membuat respons berbeda antara "punya cookie"
  dan "tidak", dan itu oracle gratis), tanpa nama Secret, tanpa kunci metrik. `(g-f)` dan
  `tests/owner-dashboard-test.js` membandingkan sidik jari respons kedua keadaan itu, jadi kalau
  seseorang menambahkan pesan "belum dikonfigurasi", gerbangnya merah.
- Halaman masuk tetap dapat diakses sumber yang sedang terkunci: rem hanya di `POST /login`. Kalau
  `GET /` ikut kena 429, statusnya sendiri menjadi oracle riwayat sumber (`(b-e)`).

## 8. Gerbang dan bukti merah

Butir baru di `tests/owner-edge-guard-test.js` (satu berkas, tidak ada duplikat):

| Butir | Yang dibuktikan |
|---|---|
| `(b-a)` | percobaan ke-6 dari sumber yang SAMA = 429 walau setiap permintaan dilayani modul yang baru diimpor (isolate baru sungguhan); plus kontrol: tanpa penyimpanan bersama, delapan percobaan = nol 429 (cacat lapangan direproduksi) |
| `(b-b)` | sumber berbeda = ember terpisah; owner tetap bisa masuk saat penyerang terkunci; kunci tidak bisa dipecah dengan `x-forwarded-for`; salt dan indeks hari benar-benar berpengaruh; login berhasil nol tulis |
| `(b-c)` | jendela bergulir pulih penuh dalam 10 menit dan pulih satu percobaan tiap 2 menit; angka-angka konstanta terikat |
| `(b-d)` | IP mentah nol kali di kunci/nilai/opsi penyimpanan dan nol kali di console (termasuk jalur galat); pindai SUMBER: `loginClientIp()` hanya dipanggil pembuat HMAC, nol `console.*` di seluruh jalur rem, `cf-connecting-ip` dibaca di tepat satu tempat |
| `(b-e)` | `GET /` → 303 `/login`, nol badan, nol cookie, nol kunci metrik, nol kebocoran keadaan konfigurasi, dan tidak bisa di-429 |
| `(b-f)` | lapis 1 tetap menolak `*.workers.dev` (403, nol operasi KV, tidak dialihkan) dan `edgeGuard()` dipanggil sebelum `loginBrakeCheck()` di sumber |
| `(b-g)` | galat penyimpanan tidak mengunci owner, tetapi lapis memori tetap mengerem; alasan fail-open dan pengakuan "token bocor" wajib ada di wilayah kodenya masing-masing |

`node reports/d4-owner-brake-red-proof.mjs` menyuntikkan **24 mutasi** ke berkas sungguhan satu per
satu, menjalankan gerbang, lalu memulihkan di `finally`. Hasil: **24/24 merah**, dan gerbang hijau
lagi sesudah pemulihan (`reports/d4-owner-brake-red-proof.json`).

**Lubang gerbang yang saya temukan sendiri dan perbaiki:** mutasi M23 dan M24 awalnya tetap
HIJAU. Sebabnya assert saya mencari frasa "FAIL-OPEN terhadap PENGUNCIAN" dan "token yang BOCOR"
di SELURUH `index.js`, sedangkan keduanya muncul dua kali, jadi menghapus salah satu kemunculan
tidak tertangkap. Assert-nya sekarang mengunci per wilayah: bab KEPUTUSAN, baris `catch` yang
benar-benar melakukan fail-open, dan bab KEJUJURAN diperiksa masing-masing. Sesudah perbaikan itu
M23 dan M24 merah. Ini contoh persis mengapa bukti merah dijalankan: dua assert saya sendiri tadi
adalah gerbang dekoratif, kelas cacat yang sama dengan rem yang sedang saya ganti.

## 9. Verifikasi

Semua exit 0:

```
tests/owner-edge-guard-test.js       exit=0   (1117/1117 assert)
tests/owner-dashboard-test.js        exit=0
tests/analytics-privacy-test.js      exit=0
tests/d1-schema-contract-test.js     exit=0
tests/no-network-test.js             exit=0
tests/secret-scan-test.js            exit=0
tests/gate-registry-test.js          exit=0
tests/coordination-guard-test.js     exit=0
tests/regression-test.js             exit=0
tests/install-health-test.js         exit=0
reports/d4-owner-brake-red-proof.mjs   exit=0 (24/24 mutasi merah, pulih hijau)
```

## 10. Yang masih menunggu owner

1. **Rotasi `OWNER_TOKEN_HASH`.** Token lama sudah bocor lewat percakapan; rem tidak menolong
   terhadap itu. `printf '%s' "$TOKEN" | openssl dgst -sha256 -hex`, lalu
   `wrangler secret put OWNER_TOKEN_HASH`.
2. **Cloudflare Access + MFA di `owner.fiezel.my.id`** — lapis kedua yang dijanjikan README §2 dan
   satu-satunya lapis yang benar-benar menutup token bocor. Belum aktif; butuh satu tindakan owner
   di dashboard Zero Trust. Sampai itu terjadi, rem inilah satu-satunya yang berdiri di depan
   token, dan bab 5 di atas menyebutkan apa artinya.
3. **`wrangler secret put RATE_SALT`** (`openssl rand -hex 32`). Belum dipasang = rem tetap jalan
   memakai `OWNER_SESSION_KEY` sebagai salt, dan IP tetap tidak pernah tersimpan mentah; ini
   pengerasan, bukan prasyarat.
4. **Binding KV baru butuh `wrangler deploy`** dari `workers/owner/` supaya `CFG` benar-benar ada
   di produksi. Sebelum deploy itu, rem berjalan hanya di lapis memori — yaitu keadaan hari ini.
