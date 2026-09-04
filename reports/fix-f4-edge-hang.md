# F4 — jembatan gantung: permintaan ke-3 menggantung di `api.fiezel.my.id`

Cabang: `fix/f4edge`. Tanpa bump versi build. Tanpa push.

## 1. Cacatnya, apa adanya

Gerbang E2E browser (`tools/fiezel-e2e-bridge.mjs`, skenario `bridge-hop-stable`)
menembak `/api/quota` beruntun dari satu halaman kosong pada **satu koneksi** dan
mengukur:

```
#1 200 1853ms | #2 200 943ms | #3 TIMEOUT 8002ms
```

Reproducible pada HTTP/2 **maupun** HTTP/1.1. **Tidak terlihat oleh `curl`** apa adanya,
karena satu proses `curl` = satu koneksi baru; ia tidak pernah menganyam tiga permintaan
di atas satu koneksi keep-alive seperti browser. Itu juga sebabnya
`cf-live-contract-test.js` (33 assert hijau) tidak menangkapnya — ia menguji hal lain, dan
itu bukan kelemahannya.

Akibat nyatanya: aplikasi murid yang menembak `/api/config` → `/api/user/me` →
`/api/quota` berurutan menggantung pada panggilan ketiga. Murid tidak melihat galat; ia
melihat layar menunggu. `8002 ms` adalah kesabaran klien yang habis (`HOP_TIMEOUT` di
gerbang E2E), bukan jawaban server.

Jembatannya: reverse proxy PHP di cPanel ArenHost (LiteSpeed + PHP 8.2.33),
`deploy/edge/api-index.php` dan `deploy/edge/owner-index.php`, meneruskan ke
`https://fiezel-api.fitrajft.workers.dev` dengan header rahasia `X-Fiezel-Edge`.

## 2. Lima hipotesis — diuji, bukan dipercaya

Tidak ada SSH/cPanel dari sini (`MASTER-ONLY-GOVERNANCE.md`), dan **tidak ada biner PHP**
di sandbox (`php -l` tidak tersedia). Jadi setiap hipotesis dinilai dari kode, dan yang
tidak bisa dinilai dari kode **dikatakan begitu**, bukan dikarang.

| # | Hipotesis | Bisa dinilai dari kode? | Putusan | Perbaikan |
|---|---|---|---|---|
| 1 | Lock sesi PHP menyeriakan permintaan | sebagian | Nol `session_start()` di kedua berkas. **Tapi** `session.auto_start=1` di `php.ini`/`.user.ini` origin memulai sesi sebelum baris pertama berjalan, dan sesi = lock berkas per cookie: #2 menunggu #1, #3 menunggu dua-duanya — **tepat pola yang terukur**. Tidak bisa dibantah dari repo, jadi ditutup tanpa syarat. | `[F4-1]` `session_write_close()` bila `session_status() === PHP_SESSION_ACTIVE`, di baris pertama eksekusi, **sebelum** kerja jaringan apa pun |
| 2 | cURL tanpa timeout / menggantung sampai batas atas | **ya** | Timeout **sudah** ada. Yang salah **angkanya**: `/api/user/me` dan `/api/quota` mewarisi `TIMEOUT_S = 25 s` sementara browser menyerah pada **8 s**. Proxy yang lebih sabar dari kliennya **memproduksi gantungan**: murid tidak pernah menerima 504. Ini penyebab yang paling kuat buktinya dari kode. | `[F4-2]` keduanya masuk `FAST_TIMEOUT_PATHS`; `TIMEOUT_FAST_S` 8 → **6 s**; `const CLIENT_ABANDON_S = 8` (dibaca dari `HOP_TIMEOUT` gerbang E2E, tidak ditulis dua kali) + **klem** yang memaksa batas jalur cepat tetap di bawahnya walau konstantanya dinaikkan nanti; owner `CONNECT_S` 8 → **4 s** |
| 3 | Badan tidak di-flush / `Content-Length` salah diteruskan | **ya** | `Content-Length` upstream tidak ada di `$passThrough`, tetapi itu **kebetulan daftar**, bukan larangan. Panjang hitungan hulu tidak berlaku lagi sesudah hop PHP; panjang yang lebih besar dari byte terkirim = browser menunggu sisa yang tidak ada, lalu permintaan **berikutnya** di koneksi itu ikut menggantung. `output_buffering` hosting juga bisa menahan badan. | `[F4-4]` + `[F4-5]`: buffer nyasar dibuang di awal (`while (ob_get_level() > 0)`), badan di-`echo` **sekali**, lalu `flush()` + `fastcgi_finish_request()` |
| 4 | Header hop-by-hop diteruskan apa adanya | **ya** | Allowlist lama membuat nol hop-by-hop lolos **hari ini**, tapi tidak ada satu baris pun yang **mencegah** `transfer-encoding` masuk daftar itu besok, dan arah **naik** tidak disaring sama sekali. | `[F4-3]` satu `const HOP_BY_HOP` + `hopByHop()` (tidak peka huruf, awalan `proxy-`), dipakai **dua arah**; denylist menang atas allowlist; ditutup `header_remove()` tanpa syarat |
| 5 | Batas proses PHP per pengguna cPanel (`LSAPI_CHILDREN`/entry process) | **TIDAK** | Hidup di konfigurasi origin. Tidak bisa dinilai maupun dibantah dari repo. Yang bisa dilakukan hanya **mempersempit**. | `[F4-5]` `fastcgi_finish_request()` melepas slot proses segera sesudah badan terkirim, bukan menahannya sampai proses mati. Sisanya harus dibaca dari cPanel → Resource Usage → Entry Processes/Faults |

Dua sakelar transport A7 juga dimatikan sementara, karena bentuk cacatnya cocok, bukan
karena selera:

- `[F4-6]` **`ENABLE_TCP_FASTOPEN = false`** — satu-satunya opsi di berkas itu yang bisa
  **menambah** detik (middlebox membuang SYN berisi data ⇒ pemulihan lewat retransmit)
  **dan** yang perilakunya berubah **sesudah beberapa koneksi**, karena cookie TFO baru ada
  di kernel setelah koneksi pertama berhasil. "Dua lolos, ketiga menggantung" adalah bentuk
  khas kelas itu. Risiko ini sudah tertulis di README §5b.2 sejak awal.
- `[F4-7]` **`ENABLE_GZIP_PASSTHROUGH = false`** — meneruskan badan gzip mentah benar
  **hanya** bila lapisan web origin tidak meng-gzip ulang, dan itu tidak bisa dibuktikan
  dari PHP (`zlib.output_compression` hanya tahu kompresi PHP, bukan modul LiteSpeed).
  Kompresi ganda = badan gagal di-dekode, gejalanya menggantung, dan `curl` yang tidak
  mengiklankan gzip **tidak pernah melihatnya** — persis pola F4. Kode jalurnya tetap ada;
  yang berubah satu konstanta, supaya bisa dinyalakan lagi dengan **bukti**.

Ini **menurunkan** target latensi A7; kedua sakelar itu penghematannya nyata.
Pertukarannya disengaja: respons yang benar lebih penting daripada respons yang cepat.
Nyalakan lagi satu per satu, masing-masing dengan satu jalannya gerbang E2E browser +
satu pengukuran `tools/edge-latency-probe.mjs`.

## 3. Gerbang baru: `edge-proxy-hopbyhop-test.js`

Node murni, **nol jaringan**, nol berkas temporer. Memuat **kedua** sumber PHP sebagai
teks (komentar dibuang tapi jumlah baris dipertahankan, pola yang sama dengan
`edge-proxy-contract-test.js` — kedua berkas menyebut nama header hop-by-hop di dalam
prosanya, dan detektor yang membaca komentar akan menghukum dokumentasi yang benar).
**133/133 assert PASS.** Laporan: `EDGE-PROXY-HOPBYHOP-REPORT.json`.

Yang di-assert:

- **(a)** daftar hop-by-hop lengkap (`Connection`, `Keep-Alive`, `Proxy-*`,
  `Transfer-Encoding`, `TE`, `Trailer`, `Upgrade`, `Content-Length`); helper tidak peka
  huruf + memeriksa keluarga `proxy-` sebagai awalan; disaring **arah naik** sebelum curl
  disentuh; diperiksa **arah turun** sebelum allowlist dan sebelum `Set-Cookie`; ditutup
  `header_remove()` tanpa syarat; nol nama hop-by-hop di `$passThrough`; nol header
  hop-by-hop yang disusun tangan.
- **(b)** `CURLOPT_TIMEOUT`/`CURLOPT_CONNECTTIMEOUT` diset dan **bukan 0**; batas jalur
  cepat **lebih pendek** dari batas klien dengan sisa ≥ 2 s; batas klien itu **dibaca dari
  `tools/fiezel-e2e-bridge.mjs`** (`HOP_TIMEOUT === 8000`) supaya angkanya tidak bisa
  menyimpang dari gerbang yang mengukur cacatnya; `/api/config`, `/api/user/me`,
  `/api/quota` wajib memakai batas pendek; jalur model wajib **tidak**; klem penegaknya ada
  di kode, bukan hanya di komentar; owner `CONNECT_S` 2..5 s dan `TIMEOUT_S` terbatas.
- **(c)** nol `session_start()` tanpa `session_write_close()`; pelepasan lock terjadi
  **sebelum** `curl_init()`.
- **(d)** `content-length` ada di daftar wajib-buang; proxy tidak pernah mengarang
  `Content-Length` sendiri.
- **(e)** `EDGE_SECRET === '__EDGE_SECRET__'`, tepat sekali; **nol literal berentropi
  tinggi** di seluruh berkas termasuk komentar; nol `EDGE_SHARED_SECRET=<nilai>` dan nol
  nilai `X-Fiezel-Edge:` di berkas mana pun di `deploy/edge/`.
- **(f)** badan ditulis **sekali** lalu di-flush, buffer nyasar dibuang lebih dulu.
- README `deploy/edge` memuat diagnosis + langkah verifikasi (termasuk perintah `curl`
  dengan ≥ 4 `--next`, cara membacanya, dan pernyataan jujurnya), dan `quality.yml`
  benar-benar memanggil gerbang ini.

### 3a. Matriks merah — dibuktikan, bukan diklaim

Matriksnya hidup **di dalam** gerbang (`const POISON`), jalan setiap kali CI jalan, dan
menyuntikkan pelanggaran ke salinan **di memori** — berkas repo tidak pernah disentuh,
jadi tidak ada yang perlu "dipulihkan" setelahnya dan tidak ada kemungkinan lupa
memulihkan. Setiap baris menuntut dua hal: detektor **hijau** atas berkas asli **dan**
**merah** atas salinan yang diracun.

| Butir | Detektor | Racun yang disuntikkan | Hasil |
|---|---|---|---|
| (a) | `hopListComplete` | `'upgrade'` dihapus dari daftar | MERAH |
| (a) | `hopHelperSound` | helper berhenti memeriksa `proxy-*` | MERAH |
| (a) | `hopFilteredUpstream` | saringan arah naik dihapus | MERAH |
| (a) | `hopFilteredDownstream` | `if (hopByHop($name)) continue;` dihapus | MERAH |
| (a) | `hopHeaderRemoved` | sapuan `header_remove()` dihapus | MERAH |
| (a) | `passThroughClean` | `transfer-encoding` diselipkan ke allowlist | MERAH |
| (a) | `noHopHeaderComposed` | `Connection: keep-alive` disusun tangan untuk upstream | MERAH |
| (b) | `curlTimeoutsSet` | `CURLOPT_TIMEOUT => 0` (tanpa batas) | MERAH |
| (c) | `sessionSafe` | `session_start()` disisipkan, penutupnya dihapus | MERAH |
| (d) | `contentLengthDropped` | `content-length` dikeluarkan dari daftar | MERAH |
| (d) | `noSelfContentLength` | `header('Content-Length: ' . strlen(...))` dipasang | MERAH |
| (f) | `bodyWrittenOnceAndFlushed` | badan di-`echo` dua kali, `flush()` hilang | MERAH |
| (e) | `secretPlaceholderIntact` | nilai secret sungguhan menggantikan placeholder | MERAH |
| (e) | `noHighEntropyLiteral` | nilai berentropi tinggi ter-commit | MERAH |
| (e) | `noHighEntropyLiteral` | nilai itu "hanya" ditinggalkan di **komentar** | MERAH |

Butir (b) yang berupa hubungan angka (`TIMEOUT_FAST_S < CLIENT_ABANDON_S`, sisa ≥ 2 s,
jalur cepat memuat 3 jalur boot, klem ada di kode) memerah dengan sendirinya begitu salah
satu konstanta atau salah satu jalur diubah — itu perbandingan langsung atas nilai yang
dibaca dari sumber, bukan pencocokan pola yang bisa lolos setengah.

## 4. Perubahan berkas

- `deploy/edge/api-index.php` — docblock F4 + `[F4-1]`…`[F4-7]`.
- `deploy/edge/owner-index.php` — docblock F4 + `[F4-1]`, `[F4-3]`, `[F4-4]`, `[F4-5]`,
  `CONNECT_S` 8 → 4.
- `edge-proxy-hopbyhop-test.js` — **baru**.
- `.github/workflows/quality.yml` — gerbang baru terdaftar tepat sesudah
  `edge-proxy-contract-test.js`, dengan alasan penempatannya.
- `deploy/edge/README.md` — **§5e baru**: pengukuran, tabel lima hipotesis, batas gerbang,
  dan **§5e.4 langkah verifikasi pemilik** (5 permintaan berurutan pada satu koneksi via
  `--next`, cadangan `-H 'Connection: keep-alive'`, cara membaca `http_code`/`time_total`/
  `num_connects`, pembacaan `Server-Timing`, bukti header hop-by-hop hilang, dan kapan
  hipotesis 5 baru masuk giliran).
- `reports/add-a5-data/e2e-bridge-live-2026-08-28.json` — **temuan sampingan yang harus
  disebut**: berkas bukti dari commit `c1ee32e` memuat **nilai cookie sungguhan**
  (`fz_id=` JWT identitas + `AWSALB`/`AWSALBCORS`), dan `secret-scan-test.js` sudah merah
  karena itu **sebelum** kerja ini dimulai (dipastikan dengan `git stash` di tree bersih).
  Nilai-nilai itu **diredaksi**; struktur JSON, jumlah entri, dan makna buktinya utuh, dan
  `e2e-bridge-selftest.js` tetap hijau. Nilai `fz_id` yang ter-commit itu **tetap harus
  dianggap bocor**: redaksi menutup repo ke depan, ia tidak menarik kembali apa yang sudah
  ada di riwayat git. Kalau token itu masih berlaku, master perlu memutar `AUTH_PEPPER`/
  kunci penanda tangan sesi. Itu keputusan master, bukan keputusan agen.

## 5. Verifikasi yang dijalankan di sini

Semua exit 0:

| Gerbang | Hasil |
|---|---|
| `edge-proxy-hopbyhop-test.js` (baru) | 133/133 assert PASS |
| `edge-proxy-contract-test.js` | 120/120 assert PASS |
| `edge-guard-test.js` | 119/119 assert PASS |
| `owner-edge-guard-test.js` | 576/576 assert PASS |
| `secret-scan-test.js` | 46/46 assert PASS, 0 temuan |
| `no-network-test.js` | PASS (38 assert, 146 gerbang dipindai) |
| `e2e-bridge-selftest.js` | PASS (32 assert, 21 skenario loopback) |
| `regression-test.js` | PASS |
| `install-health-test.js` | PASS |

## 6. Yang BELUM terbukti — batas jujurnya

1. **Cacat F4 belum terbukti tertutup.** Yang ada di commit ini: penyebab yang bisa
   dinilai dari kode sudah ditutup, dan gerbang yang mencegahnya kembali. Assert atas
   teks tidak pernah menutup cacat runtime. Yang menutupnya hanya satu hal:
   `FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id node tools/fiezel-e2e-bridge.mjs`
   dijalankan **ulang** terhadap jembatan yang **sudah diunggah** (README §5e.4 langkah 5).
   Status yang benar sampai itu terjadi: **"penyebab yang bisa dinilai dari kode sudah
   ditutup; gantungan belum terbukti hilang"**.
2. **Hipotesis mana yang benar-benar penyebabnya, belum diketahui.** Empat perbaikan
   dikirim sekaligus karena keempatnya nyata sebagai cacat kode dan rollout sedang
   diblokir. Konsekuensinya: kalau gantungan hilang, **tidak akan diketahui perbaikan mana
   yang menyembuhkannya.** Itu pertukaran yang diambil sadar; kalau master mau atribusi,
   nyalakan ulang satu per satu (`[F4-6]` dan `[F4-7]` paling mudah dibalik) dengan satu
   jalan E2E per perubahan.
3. **Nol pengukuran "sesudah" boleh diklaim** dari sesi ini. Tidak ada SSH/cPanel, dan
   tidak ada biner PHP di sandbox — jadi bahkan `php -l` atas kedua berkas belum pernah
   dijalankan. Sintaksisnya dijaga hanya oleh pembacaan manusia dan pola gerbang; **`php -l`
   di origin sebelum menimpa berkas hidup adalah langkah yang tidak boleh dilewati.**
4. **Hipotesis 5 masih terbuka sepenuhnya.** Kalau §5e.4 langkah (1) masih merah sesudah
   unggah, penyebabnya kemungkinan besar di sana, dan itu ranah paket hosting —
   di luar jangkauan repo ini.
