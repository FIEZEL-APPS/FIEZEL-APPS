# D3 — gerbang masuk dashboard owner: dari 403 menyeluruh ke jalur hostname kanonik

Cabang `work/d3own`. Tidak di-push, versi build tidak dinaikkan.
Berkas yang disentuh: `workers/owner/index.js`, `workers/owner/DEPLOY.md`,
`owner-edge-guard-test.js`, `reports/g1-custom-domain-red-proof.mjs` (satu mutasi basi),
`reports/d3-owner-guard-red-proof.mjs` (baru). Tidak menyentuh `app.js`, `style.css`,
`index.html`, `features/`, `coordination/`, `workers/api/`.

## 1. Apa yang sebenarnya rusak

`https://owner.fiezel.my.id/` menjawab 403 `{"error":"forbidden"}` — bukan karena token,
bukan karena Secret, bukan karena binding. `edgeGuard()` di `workers/owner/index.js` menuntut
**setiap** permintaan membawa header `X-Fiezel-Edge` yang cocok dengan `EDGE_SHARED_SECRET`.
Satu-satunya yang pernah menyuntikkan header itu adalah proxy PHP `deploy/edge/owner-index.php`.
Proxy itu sudah tidak berada di jalur permintaan: `owner.fiezel.my.id` kini custom domain Worker,
jadi peramban owner memanggil Worker secara langsung. Penjaganya menegakkan syarat dari topologi
yang sudah dibongkar. Ini kelas bug yang sama dengan dua tambalan sebelumnya hari ini: **penjaga
yang benar untuk keadaan lama, dibiarkan menilai keadaan baru.**

Yang **tidak** dipakai untuk memperbaikinya: `ALLOW_NO_EDGE_SECRET=true`. Pembuka itu melepas
gerbang untuk *semua* hostname, termasuk `*.workers.dev`. Cloudflare Access dipasang **per
hostname**, jadi di alamat `workers.dev` lapis kedua itu tidak ada sama sekali, dan halaman masuk
owner bisa ditembak langsung. Itu menukar 403 dengan lubang, dan kode itu sendiri sudah
memperingatkannya.

## 2. Sinyal hostname yang dipilih, dan kenapa ia tidak bisa dipalsukan

**Dipakai: `new URL(request.url).hostname`**, dinormalkan (huruf kecil, trim, titik akhir
dibuang), lalu dicocokkan **PERSIS** terhadap `TRUSTED_EDGE_HOSTS = ['owner.fiezel.my.id']`.

Alasan, berurutan dari yang paling menentukan:

1. **Yang dipercaya bukan headernya, melainkan keputusan perutean Cloudflare.** Custom Domain
   mencocokkan hostname **persis**, tanpa wildcard, dan seluruh path-nya diarahkan ke Worker
   ([dokumentasi Custom Domains Cloudflare](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)).
   Permintaan tidak bisa tiba di Worker ini dengan hostname `owner.fiezel.my.id` kecuali
   Cloudflare sendiri yang mencocokkannya ke rute milik akun ini. Klien tidak memegang keputusan
   itu; ia hanya bisa memilih ke mana ia menyambung, dan pilihan itu menentukan Worker mana yang
   jalan — bukan mengubah nilai yang dilihat Worker yang sudah jalan.
2. **`request.headers.get('host')` DITOLAK sebagai sumber**, meski di Workers ia berasal dari
   sumber yang sama. Ia nilai **mentah**: bisa membawa port (`owner.fiezel.my.id:8443`), titik
   akhir FQDN, huruf besar/kecil campur, varian punycode/unicode, dan bila header dikirim ganda
   `Headers.get()` menggabungkan nilainya dengan `', '`. Gerbang otorisasi tidak boleh menanggung
   beban menalar semua bentuk itu — satu bentuk yang terlewat adalah satu jalan masuk.
3. **Arah pemalsuan dari Worker lain tertutup di lapisan lain juga:** `Host` adalah *forbidden
   header* di Fetch API, jadi Worker mana pun tidak bisa menyetelnya pada subrequest
   ([Cloudflare community: tidak bisa menimpa Host di Workers](https://community.cloudflare.com/t/not-possible-to-override-the-host-header-on-workers-requests/13077),
   [`request.headers.set('Host')` tidak berfungsi](https://community.cloudflare.com/t/workers-request-headers-set-host-something-not-work/133692));
   Transform Rules juga menolak operasi `set` pada `Host`
   ([community](https://community.cloudflare.com/t/allow-modification-of-the-http-host-header/408575)).
   `resolveOverride` pun hanya mengubah tujuan koneksi dalam zona yang sama dan **membiarkan**
   Host tetap cocok dengan host URL
   ([Request runtime API](https://developers.cloudflare.com/workers/runtime-apis/request/)).
   Pernyataan langsung dari pihak Cloudflare: Host tidak bisa dipalsukan di depan CF
   ([diskusi HN dengan tech lead Workers](https://news.ycombinator.com/item?id=26688390)).
4. **Yang TIDAK PERNAH dibaca penjaga ini:** `X-Forwarded-Host`, `X-Host`, `Forwarded`,
   `Origin`, `Referer`. Semuanya masukan klien murni. Butir gerbang `(g-a)` memindai sumber kode
   untuk memastikan tidak satu pun dari nama itu muncul di jalur keputusan.

Satu catatan kejujuran: Cloudflare menolak permintaan yang hostname-nya tidak cocok dengan SNI
koneksi dengan **421 Misdirected Request**, dan ini **tidak** ada di dokumentasi resmi — ia hanya
terdokumentasi di forum
([thread community 421/SNI](https://community.cloudflare.com/t/http-421-misdirected-request-server-name-indication-sni/821368)).
Jadi saya **tidak** menjadikannya dasar. Dasarnya butir 1 dan 3; 421 hanya penguat.

**RISIKO SISA, dan saya menolak menyembunyikannya.** Kalau suatu hari ada lapisan di depan Worker
yang meneruskan `Host` pilihan klien (jembatan PHP yang diubah, atau `workers_dev` dinyalakan lagi
di kondisi Host/SNI tidak dipaksa cocok), maka `url.hostname` ikut berpindah dan pemeriksaan
akhiran `.workers.dev` **tidak** akan menyala. Karena itu jalur hostname ini sah **hanya bersama**
tiga fakta di luar kode: `workers_dev = false`, Preview URL mati, dan Cloudflare Access di depan
`owner.fiezel.my.id`. Ini ditulis di komentar `index.js` bab RISIKO SISA (butir `(g-*)`
meng-assert kalimat itu tidak boleh hilang) dan di `DEPLOY.md` §5. Kode tidak bisa memaksa
Access, jadi kode tidak berpura-pura bisa.

Tambahan yang juga tidak bisa ditutup kode: **HTTP polos** di hostname kanonik lolos gerbang
(cookie sesi sudah `Secure`, jadi sesi tidak bocor, tapi halaman masuk terlayani di `http://`).
Owner perlu menyalakan Always Use HTTPS + HSTS.

## 3. Bentuk penjaga sesudah perubahan

Urutan keputusan di `edgeGuardDecision(request, env, pathname)`:

| # | Syarat | Jalur | Catatan |
|---|---|---|---|
| 0 | pathname ada di `EDGE_FREE_PATHS` | `free-path` | daftar ini **kosong** di owner; tidak ada `/healthz` publik |
| * | tidak ada secret **dan** `ALLOW_NO_EDGE_SECRET` persis `'true'` | `off` | pembuka darurat; **tidak lagi diperlukan**, dan tetap diperingatkan |
| 1 | hostname **persis** `owner.fiezel.my.id` | `custom-domain` | jalur UTAMA. Diperiksa **sebelum** ketersediaan secret, jadi dashboard hidup walau `EDGE_SHARED_SECRET` dicabut |
| 2 | hostname `*.workers.dev` **dan** `ctEq(header, secret)` | `header` | jalur **CADANGAN**; tanpa secret → fail-closed + `console.error` sekali per isolate |
| 3 | sisanya | `denied` | default-deny hostname asing |

Yang **tidak** diubah: `ctEq()`, `sha256Hex()`, HMAC sesi, `configured(env)` (menuntut **kedua**
`OWNER_TOKEN_HASH` dan `OWNER_SESSION_KEY`), bentuk `deny()`, dan alur masuk — sha256 **HEX** dari
token yang diketik dibandingkan **waktu-konstan** terhadap `OWNER_TOKEN_HASH`. Dua lapis tetap
dua lapis: lolos gerbang tepi tidak memberi satu baris angka pun tanpa sesi owner.

Jalur cadangan dipertahankan dengan tiga alasan tertulis di kode: (i) cache DNS lama dan
kemungkinan owner mengembalikan jembatan; (ii) `deploy/edge/owner-index.php` + `.htaccess`-nya
masih ada di repo dan masih dijaga gerbang ini, jadi menghapus jalurnya membuat artefak itu mati
diam-diam; (iii) sabuk dan bretel — header sah **tidak cukup** di hostname yang tidak dikenal,
sehingga hostname yang tersalah-pasang di masa depan tidak menjadi pintu kedua.

## 4. Lubang gerbang yang ketemu sambil jalan

**`allowNoSecretOverride()` menerima `"TRUE"` dan `"True"`.** Ia memakai
`raw.trim().toLowerCase() === 'true'`, sementara komentarnya sendiri dan `DEPLOY.md` menjanjikan
"string **persis** `true`", dan `workers/api/mw-edge.js` tidak melakukan `toLowerCase`. Efeknya
bukan sepele: nilai var yang tersalin dari dokumen lain, atau ditulis kapital oleh orang yang
mengira itu boolean, akan **membuka gerbang untuk `*.workers.dev`** tanpa ada yang menyadari.
`toLowerCase()` dibuang; butir `(g-e)` sekarang memaksa `'TRUE'`, `'True'`, `'tRue'`, `'1'`,
`'yes'`, `'on'`, dan nilai non-string semuanya ditolak, plus memindai badan fungsinya agar
`toLowerCase` tidak bisa kembali. Mutasi M9 di red-proof membuktikan assert itu memang merah.

**`DEPLOY.md` secara aktif menyuruh memasang lubangnya.** Bagian "Pilih SATU dari dua bentuk
penjaga edge → form A" menginstruksikan `wrangler deploy` dengan
`--var ALLOW_NO_EDGE_SECRET:true`. Jadi prosedur resminya mengembalikan lubang yang kodenya
peringatkan. Bagian itu dihapus dan diganti "tidak ada yang perlu dipilih; jangan pasang var itu;
kalau pernah dipasang, hapus dan deploy ulang". Butir `(g-e)` meng-assert dokumen tidak boleh lagi
memuat perintah itu (mutasi M17 merah).

**Satu mutasi red-proof jadi basi dan salah.** `reports/g1-custom-domain-red-proof.mjs` M11 dulu
menyuntikkan jalur hostname ke Worker owner dan menuntut butir `(f)` merah, karena saat itu owner
memang belum custom domain. Premis itu sudah mati. M11 dibalik menjadi "daftar hostname owner
bocor ke `api.fiezel.my.id`" → `(g-a)`/`(g-c)` merah. Parser tag di runner itu juga tidak mengenal
awalan `g-` sehingga melaporkan `(?)`; sudah diperbaiki.

**Cacat lain di jalur owner, DI LUAR wilayah klaim ini, tidak saya tambal:** `workers/owner/
queries.js` membaca `metrics_daily` dengan bentuk **lebar** (satu kolom per metrik), sedangkan
migrasi produksi `0002_analytics.sql` membuatnya bentuk **panjang** (`metric`/`value` per baris).
Selama tabel nol baris ini tidak kelihatan. Begitu rollup mengisi tabel, panel akan berbunyi
"pengukuran tidak tersedia" atau menampilkan nol yang salah. Perbaikannya menyentuh kontrak skema
dan `workers/api`, jadi bukan milik paket kerja ini. **Ini harus jadi paket kerja tersendiri
sebelum analytics dinyalakan**, bukan setelahnya.

## 5. Matriks merah

`node reports/d3-owner-guard-red-proof.mjs` → **RED-PROOF PASS**, 20/20 mutasi merah, gerbang
hijau lagi sesudah pemulihan (`reports/d3-owner-guard-red-proof.json`). Setiap mutasi disuntikkan
ke berkas sungguhan, satu per satu, dan dipulihkan di `finally`.

| Mutasi | Berkas | Butir yang jatuh | Kenapa ini lubang |
|---|---|---|---|
| M1 jalur hostname dimatikan | index.js | (g-a) (g-d) (g-e) | bug aslinya: owner.fiezel.my.id 403 di semua rute |
| M2 `*.workers.dev` diloloskan tanpa header | index.js | (g-b) (a) | pintu kedua yang tidak dilewati Access |
| M3 workers.dev masuk daftar tepercaya | index.js | (g-a) | daftar menyimpang dari route custom_domain |
| M4 pencocokan hostname jadi `includes` | index.js | (g-c) | `owner.fiezel.my.id.penyerang.com` lolos |
| M5 default-allow hostname asing | index.js | (g-c) | hostname karangan apa pun jadi pintu |
| M6 hostname dibaca dari `X-Forwarded-Host` | index.js | (g-a) | sinyal jadi masukan klien sepenuhnya |
| M7 hostname dibaca dari header `Host` mentah | index.js | (g-a) (g-b) (g-d) (b) (c) | nilai tak dinormalkan, bisa ganda |
| M8 header edge menaikkan hak di hostname kanonik | index.js | (g-d) (g-f) (b) | dua lapis runtuh jadi satu |
| M9 pembuka darurat menerima `TRUE` | index.js | (g-e) | **lubang nyata yang ditemukan**, lihat §4 |
| M10 pembuka darurat jadi truthy | index.js | (g-e) | salah ketik apa pun membuka gerbang |
| M11 fail-closed Secret dilemahkan jadi OR | index.js | (g-f) | tanpa `OWNER_SESSION_KEY`, sesi tak terverifikasi |
| M12 binding `fiezel-core` diselundupkan | wrangler.toml | (g-g) | insiden privasi: data per-orang terjangkau |
| M13 binding KV diselundupkan | wrangler.toml | (g-g) | radius ledakan melebar lewat jenis binding lain |
| M14 `workers_dev` dinyalakan lagi | wrangler.toml | (g-g) | pintu di luar Access hidup kembali |
| M15 route custom_domain menyimpang | wrangler.toml | (g-a) | kode dan konfigurasi menyebut hostname berbeda |
| M16 DEPLOY.md tak lagi menyebut "insiden" | DEPLOY.md | (g-g) | invarian tanpa alasan akan dilanggar |
| M17 DEPLOY.md menyuruh `--var ALLOW_NO_EDGE_SECRET` | DEPLOY.md | (g-e) | **lubang nyata yang ditemukan**, lihat §4 |
| M18 alasan jalur cadangan dihapus | index.js | (g-\*) | jalur tanpa alasan akan dihapus/dibiarkan buta |
| M19 bab RISIKO SISA disembunyikan | index.js | (g-\*) | syarat luar-kode hilang dari catatan |
| M20 `edgeGuardPath` selalu `custom-domain` | index.js | (g-b) | "lolos karena hostname" tak terbedakan dari "karena header" |

Pemetaan butir tugas → tag assert: (a)→`(g-a)`, (b)→`(g-b)`, (c)→`(g-c)`, (d)→`(g-d)`,
(e)→`(g-e)`, (f)→`(g-f)`, (g)→`(g-g)`. Namespace `(g-*)` sengaja dipisah dari blok `(a)`–`(e)`
lama di `owner-edge-guard-test.js` supaya dua penomoran tidak tertukar.

Blok `(f)` lama — yang meng-assert owner **tidak boleh** punya jalur hostname — dihapus, bukan
dilonggarkan diam-diam: premisnya (owner masih di balik proxy PHP) sudah tidak benar, dan justru
premis itulah yang membuat 403. Penggantinya lebih ketat: yang dilonggarkan hanya **satu**
hostname yang benar-benar terikat di Cloudflare, sementara `*.workers.dev` kini dijaga lebih rapat
(akhiran, bukan substring; huruf besar, titik akhir, dan bentuk Preview URL semuanya ditutup).

## 6. Verifikasi

Sepuluh gerbang, semuanya **exit 0**:

`owner-edge-guard-test.js` (941/941 assert), `owner-dashboard-test.js`,
`analytics-privacy-test.js`, `d1-schema-contract-test.js`, `no-network-test.js`,
`secret-scan-test.js`, `gate-registry-test.js`, `coordination-guard-test.js`,
`regression-test.js`, `install-health-test.js`.
Plus `reports/d3-owner-guard-red-proof.mjs` (20/20) dan
`reports/g1-custom-domain-red-proof.mjs` (11/11, sesudah M11 diperbaiki).

## 7. Yang masih harus owner kerjakan sendiri dari dashboard Cloudflare

1. **Cloudflare Access + MFA di depan `owner.fiezel.my.id`. Ini yang paling penting.**
   Perubahan hari ini membuat gerbang tepi meloloskan hostname kanonik, jadi yang berdiri di
   antara internet dan halaman masuk owner sekarang **hanya** token owner. Itu satu lapis.
   `workers/owner/README.md` §2 sudah menjanjikan Access sebagai lapis kedua; janji itu belum
   ditagih. Access adalah keputusan **identitas** (surel mana, faktor kedua apa, perangkat siapa),
   hidup di Zero Trust, dan tidak bisa dipasang dari kode Worker mana pun. Sampai ia terpasang,
   jalur hostname ini aman-secukupnya, bukan aman.
2. **Pastikan Preview URLs mati** untuk `fiezel-owner`. Preview URL berbentuk
   `<versi|alias>-<nama>.<sub>.workers.dev` dan sejak Okt 2025 **mengikuti** setelan
   `workers.dev` secara default
   ([dokumentasi Preview URLs](https://developers.cloudflare.com/workers/versions-and-deployments/preview-urls/),
   [changelog 23 Okt 2025](https://developers.cloudflare.com/changelog/post/2025-10-23-preview-url-default-behavior/),
   [changelog 17 Sep 2025](https://developers.cloudflare.com/changelog/post/2025-09-17-update-preview-url-setting/)).
   Karena `workers_dev = false`, seharusnya sudah mati — **verifikasi**, jangan asumsikan. Gerbang
   menolak semua bentuk `*.workers.dev` termasuk bentuk Preview URL, tapi hostname yang tidak
   pernah ada lebih baik daripada hostname yang ditolak.
3. **Always Use HTTPS + HSTS** untuk zona `fiezel.my.id`. Gerbang tidak memeriksa skema; ia tidak
   bisa membedakan HTTP polos yang tiba di hostname kanonik.
4. **Jangan pasang var `ALLOW_NO_EDGE_SECRET`**, dan kalau ia pernah dipasang di deploy
   sebelumnya, **hapus** dan deploy ulang. Sekarang ia tidak berguna dan hanya berisiko.
5. **Menyalakan analytics** kalau dashboard mau berisi angka. Ini bukan pekerjaan dashboard:
   `cfAnalyticsEnabled = false` di `workers/api/schema.js:113`, `ANALYTICS_ENABLED="off"`, cron
   rollup keluar dengan `{skipped:'flag_off'}`, dan `metrics_daily`/`usage_daily`/
   `retention_daily` nol baris (diverifikasi owner lewat D1 langsung). Dashboard yang hidup
   **akan kosong, dan itu benar** — dan sebelum ia diisi, baca dulu cacat skema `queries.js` di
   §4, karena mengisi tabel duluan akan menghasilkan panel yang salah, bukan panel yang kosong.
