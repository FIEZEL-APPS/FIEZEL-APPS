# A7 — Latensi jembatan edge `api.fiezel.my.id`

**Cabang:** `add/a7latency` · **Tanggal:** 27 Agustus 2026 · **Tidak ada push, tidak ada bump versi build.**

Berkas yang disentuh (dan hanya ini):

| Berkas | Sifat |
|---|---|
| `deploy/edge/api-index.php` | transport + timeout + kompresi + `Server-Timing` |
| `deploy/edge/README.md` | §5b/5c/5d — analisis, cara ukur, pengakuan angka sesudah |
| `edge-proxy-contract-test.js` | **baru** — gerbang kontrak proxy (a)–(h) |
| `tools/edge-latency-probe.mjs` | **baru** — alat ukur p50/p95, node murni |
| `.github/workflows/quality.yml` | mendaftarkan gerbang baru |
| `reports/add-a7-latency.md` | catatan ini |

`workers/**` dan `app.js` **tidak disentuh** (dikonfirmasi lewat `git status`).

---

## 1. Telaah dulu — dari mana 847–2.214 ms itu datang

Angka awal: `/health` **2.214 ms** dingin, **847–1.163 ms** hangat; `/healthz` dingin
**2.071 ms**. Uraian biaya, urut dari yang terbesar (lengkap di `deploy/edge/README.md` §5b.1):

1. **Handshake TLS baru ke upstream, setiap permintaan — biaya terbesar, dan tidak bisa
   dihapus dari dalam PHP.** Satu permintaan HTTP = satu proses/worker PHP = satu handle
   curl baru = TCP + TLS penuh ke `*.workers.dev`. Cache sesi TLS curl hidup **di dalam
   handle** (`CURLOPT_SSL_SESSIONID_CACHE`) dan mati bersama proses ⇒ tidak ada reuse
   koneksi antar proses, dan `keep-alive` tidak punya siapa pun untuk dipegang.
2. **DNS berulang.** Nasib sama: cache DNS curl hidup di handle/share handle. Karena itu
   `CURLOPT_DNS_CACHE_TIMEOUT` **sengaja tidak dipasang** — nilai berapa pun menghemat
   0 ms di model satu-permintaan-satu-proses, dan opsi yang terlihat seperti optimasi
   tetapi tidak menghemat apa pun adalah komentar yang berbohong. Yang menolong: resolver
   OS origin (di luar kendali PHP) + `CURLOPT_IPRESOLVE`.
3. **`CURLOPT_ENCODING => ''` = dekompresi lalu kompresi ulang.** Badan di sini hanya
   diteruskan; mendekompresinya di origin lalu membiarkan lapisan web meng-gzip ulang
   adalah dua kali kerja CPU untuk byte yang sama, di mesin yang CPU-nya paling langka.
4. **HTTP/1.1 vs HTTP/2 ke upstream.** Tanpa dipaksa, header (`Cookie` + `User-Agent`
   setiap permintaan) dikirim teks penuh tanpa HPACK dan respons datang ber-`chunked`.
   Nilainya puluhan-an ms, bukan ratusan — ditulis apa adanya.
5. **Startup PHP.** Nol dependency/autoloader/include sudah dipenuhi berkas itu; sisanya
   konfigurasi origin (opcache, PHP-FPM alih-alih CGI) = **saran untuk master**, bukan
   klaim beres.

## 2. Yang diterapkan (setiap sakelar punya komentar hemat + risiko di kode)

| Sakelar | Hemat | Risiko |
|---|---|---|
| `CURL_HTTP_VERSION_2TLS` (bila `defined`) | HPACK, tanpa framing `chunked` | ~nol; `2TLS` jatuh otomatis ke 1.1 |
| `CURLOPT_TCP_FASTOPEN` (bila `defined`) | sampai **1 RTT**; cookie TFO di **kernel** ⇒ bertahan antar proses — satu-satunya cara menyentuh biaya #1 tanpa menghapus hop | **nyata**: middlebox bisa membuang SYN berisi data ⇒ retransmit **menambah** ratusan ms. Punya sakelar sendiri `ENABLE_TCP_FASTOPEN` |
| `CURLOPT_TCP_KEEPALIVE` + `KEEPIDLE/KEEPINTVL` 15 s | 0 ms pada GET kecil; gunanya `/api/ai/task` — NAT/firewall membuang pemetaan idle **senyap**, hasilnya timeout 25 s dengan kuota sudah terbakar | beberapa paket kecil |
| `CURLOPT_IPRESOLVE = V4` | 1 query AAAA hilang + tidak ada "happy eyeballs" ke IPv6 yang tidak berfungsi di hosting bersama | origin IPv6-only kelak = pemutus total, tapi gejalanya 502 seragam |
| Pass-through gzip (tanpa `CURLOPT_ENCODING`) | nol dekompresi **dan** nol kompresi ulang | hanya bila klien mengiklankan gzip **dan** `zlib.output_compression` mati (kalau tidak: gzip ganda = sampah) |
| `CURLPROTO_HTTPS`, `SSL_VERIFYPEER/HOST` eksplisit | 0 ms | 0 — ikat pinggang agar optimasi berikutnya tidak menggerus TLS |
| `Server-Timing` (`edge_dns/tcp/tls/upstream_ttfb/total`) | 0 ms; ia yang membuat klaim latensi bisa **dibantah** | nol data murid, nol identitas |

## 3. Cache — kesimpulan: **tidak ada yang boleh di-cache**, jadi tidak dipasang

Kandidat hanya `GET /healthz` dan `GET /api/config`. Keduanya **gagal syarat**:

- `/api/config` mengirim `Cache-Control: no-store` eksplisit
  (`workers/api/route-config.js:80`) — ia **kill switch runtime**; men-cache-nya berarti
  "matikan AI sekarang" tertunda selama TTL cache.
- `/healthz` juga `no-store`: `jsonResponse` (`workers/api/errors.js:45`) memasangnya bila
  rute tidak memasang sendiri. Men-cache probe = monitor melaporkan "hidup" saat Worker
  sudah mati.

`Cache-Control` upstream dihormati **mutlak**, jadi hasilnya **nol jalur cacheable**.
Memasang mesin cache yang tidak boleh menyala hanya menambah permukaan gagal (berkas
cache di hosting bersama, keracunan, risiko menyimpan `Set-Cookie`) demi 0 ms. Tidak
dipaksakan. Keputusannya tertulis di kode (blok `TIDAK ADA CACHE`) dan gerbang butir (c)
sudah menunggu untuk menuntut penjaganya kalau suatu hari cache datang.

## 4. Jalur gagal

- `CURLOPT_CONNECTTIMEOUT` **8 s → 4 s.** Batas ini hanya mengatur leg **origin → tepi
  Cloudflare** (RTT puluhan ms), **bukan** leg murid → origin yang dipengaruhi jaringan
  Indonesia yang lambat. 4 s masih memberi ruang satu retry DNS + satu handshake.
  **Trade-off:** bila resolver origin sakit >4 s, permintaan yang dulu berhasil di detik
  ke-6 sekarang gagal 502 — pertukaran disengaja: gagal cepat dan jujur > 8 detik
  menunggu yang berakhir sama gagalnya. Jangan turun di bawah ~3 s tanpa angka baru.
- **Batas total dipecah:** `TIMEOUT_FAST_S = 8` untuk GET JSON kecil, `TIMEOUT_S = 25`
  tetap untuk jalur model. Default-nya **sabar** (jalur tak terdaftar dapat 25 s), jadi
  rute baru tidak bisa diam-diam memotong jawaban model.
- **504 vs 502:** habis-waktu → `504 upstream_timeout` (mencoba lagi masuk akal),
  tidak-terjangkau → `502 upstream_unreachable`. Keduanya generik; nol byte `curl_error()`.

## 5. Pengukuran — angka SESUDAH **belum ada**

`tools/edge-latency-probe.mjs`: node murni, nol dependency, **nol rahasia** (tidak membaca
env secret, tidak mengirim cookie, tidak mengirim header jembatan), target **dari argumen**
(tanpa argumen: cara pakai + exit 2, jadi ia tidak bisa tersangkut di CI dan menembak
produksi). Melaporkan **p50/p95** atas N permintaan untuk `/healthz`, `/health`,
`/api/config`; permintaan pertama dilaporkan tersendiri sebagai `cold` dan **tidak** masuk
p50/p95. Merangkum `Server-Timing` jembatan bila proxy versi baru sudah terpasang.
Terbukti jalan: diuji terhadap server loopback (bukan produksi), termasuk mode
`--baseline` yang mencetak delta.

**Angka sesudah belum ada.** Memasang versi baru proxy butuh SSH/cPanel ke origin
ArenHost — **hanya master yang punya** (`MASTER-ONLY-GOVERNANCE.md`). Perintah untuk master:

```bash
# (1) SEBELUM — sebelum mengunggah proxy baru
node tools/edge-latency-probe.mjs https://api.fiezel.my.id --n=30 --json=A7-SEBELUM.json

# (2) simpan salinan lama, lalu pasang versi baru (README §4: secret disuntik ke /tmp)
ssh <USER>@<HOST> 'cp ~/public_html/api/index.php ~/api-index.php.a7-sebelum'
SECRET="<nilai yang sudah dipasang di Worker>"
sed "s|__EDGE_SECRET__|$SECRET|" deploy/edge/api-index.php > /tmp/fz-api-index.php
grep -c '__EDGE_SECRET__' /tmp/fz-api-index.php   # HARUS 0
git status --short deploy/edge/                   # HARUS kosong
scp /tmp/fz-api-index.php <USER>@<HOST>:~/public_html/api/index.php
shred -u /tmp/fz-api-index.php 2>/dev/null || rm -f /tmp/fz-api-index.php
ssh <USER>@<HOST> 'chmod 644 ~/public_html/api/index.php'

# (3) SESUDAH — bandingkan
node tools/edge-latency-probe.mjs https://api.fiezel.my.id --n=30 \
  --baseline=A7-SEBELUM.json --json=A7-SESUDAH.json

# (4) verifikasi kontrak masih utuh setelah versi baru terpasang
curl -s https://api.fiezel.my.id/health | grep -o '"edgeGuard":"[a-z]*"'   # HARUS "on"
curl -s https://fiezel-api.fitrajft.workers.dev/healthz                    # {"ok":true,"protocol":"1.7"}
FIEZEL_CF_LIVE_BASE=https://api.fiezel.my.id node cf-live-contract-test.js
```

Kalau p95 **memburuk**, tersangka pertama TCP Fast Open: ubah `ENABLE_TCP_FASTOPEN = false`,
unggah ulang, ukur lagi. Kalau `edge_tls` mendominasi `edge_total`, itu konfirmasi biaya #1 —
yang menghapusnya bukan PHP, melainkan **pembongkaran jembatan** (README §6).

Status yang benar hari ini: **"diperkirakan membaik, belum terbukti"** — bukan "lebih cepat".

## 6. Gerbang `edge-proxy-contract-test.js` — 120 assert PASS

Node murni, nol dependency, nol jaringan; **memindai berkas PHP sebagai teks** (tidak ada
PHP di runner CI, dan batas itu ditulis di kepala gerbang, bukan disembunyikan).
Terdaftar di `.github/workflows/quality.yml` tepat sesudah `edge-guard-test.js`, dan
gerbang itu **menjaga pendaftarannya sendiri**.

| Butir | Yang dijaga |
|---|---|
| (a) | allowlist default-TOLAK; **tepat 13 jalur** yang sah + metode masing-masing; gerbang berjalan sebelum upstream disentuh; traversal 400 |
| (b) | `X-Fiezel-Edge` dikirim tanpa syarat; `EDGE_SECRET` masih placeholder, muncul tepat sekali; nilainya tidak pernah dicetak/dicatat |
| (c) | nol primitif cache; keputusan tertulis; `cache-control` upstream tetap diteruskan; `Set-Cookie` bertumpuk (`replace=false`); proxy tidak pernah mengarang izin cache |
| (d) | `REMOTE_ADDR`, `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, `True-Client-IP`, `Forwarded` — semuanya tidak ada |
| (e) | `curl_error()` dipakai di satu tempat, hanya ke `error_log`; tidak pernah lewat `echo`/`header`/`json_encode`/`fail`; pesan klien selalu kode literal; badan permintaan murid tidak ikut dicatat |
| (f) | `CURLOPT_FOLLOWLOCATION => false`, tidak pernah true, tanpa `MAXREDIRS`/`UNRESTRICTED_AUTH` |
| (g) | setiap opsi curl **baru** wajib punya komentar **hemat + risiko** di atasnya; opsi opsional wajib dibungkus `defined()`; `CURLOPT_ENCODING` tidak boleh kembali; TLS tidak boleh dilemahkan |
| (h) | `CONNECT_S` 2–5 s, `TIMEOUT_S` ≥ 20 s, `TIMEOUT_FAST_S` di antaranya; batas pendek hanya untuk GET di allowlist; jalur model tidak ikut; default sabar; 504/502 dibedakan |

**Setiap detektor dibuktikan bisa MERAH.** Selain lima suntikan in-memory di dalam gerbang,
sembilan mutasi dijalankan terhadap berkas sungguhan (lalu dipulihkan) dan **semuanya
ditangkap**: hapus satu jalur allowlist, `FOLLOWLOCATION => true`, bocorkan `$err` ke
klien, teruskan `X-Forwarded-For`+`REMOTE_ADDR`, opsi curl baru tanpa komentar,
`CONNECT_S` kembali 8, cache berkas naif, hilangkan `X-Fiezel-Edge`, kembalikan
`CURLOPT_ENCODING`.

## 7. Verifikasi

| Gerbang | Hasil |
|---|---|
| `edge-proxy-contract-test.js` | **exit 0** — 120/120 assert |
| `edge-guard-test.js` | **exit 0** — 119/119 assert |
| `regression-test.js` | **exit 0** |
| `install-health-test.js` | **exit 0** |
| `no-network-test.js` | **exit 0** |
| `secret-scan-test.js` | **belum ada di repo** — instruksinya "bila sudah ada", jadi tidak dijalankan dan tidak dibuat-buat |
| tambahan: `workflow-actor-gate-test.js`, `cf-wiring-test.js`, `cf-api-contract-test.js` | exit 0 |

`node --check` lulus untuk kedua berkas JS/MJS baru (step `Syntax` di `quality.yml`
memindai seluruh `*.js`/`*.mjs`). **PHP tidak bisa di-lint di sandbox ini** (`php` tidak
terpasang) — itu keterbatasan yang jujur, dan alasan kedua kenapa gerbangnya berupa
pemindai teks; `php -l deploy/edge/api-index.php` sebaiknya dijalankan master sebelum
mengunggah.

## 8. Batas yang tidak dilewati

- Nol perubahan di `workers/**` dan `app.js`.
- **Tidak ada bump versi build.**
- **Tidak ada push.** Commit hanya ke `add/a7latency`.
- Nol nilai secret masuk repo (`edge-guard-test.js` butir (g) + butir (b) gerbang baru).
- Tidak ada pemasangan ke server; tidak ada klaim angka "sesudah".

## Sumber

- `workers/api/route-config.js` (`Cache-Control: no-store` eksplisit) dan
  `workers/api/errors.js` (`no-store` bawaan `jsonResponse`) — dasar kesimpulan §3.
- `workers/api/route-health.js` — kenapa `/health` dilindungi dan `/healthz` minimal.
- `deploy/edge/README.md` §5–§5d, §6 — angka, analisis, pembongkaran.
- `MASTER-ONLY-GOVERNANCE.md` — kenapa pemasangan ke origin bukan wewenang agen.
- PHP manual, `curl_setopt` (`CURLOPT_TCP_FASTOPEN`, `CURLOPT_TCP_KEEPALIVE`,
  `CURLOPT_IPRESOLVE`, `CURLOPT_DNS_CACHE_TIMEOUT`, `CURLOPT_SSL_SESSIONID_CACHE`):
  https://www.php.net/manual/en/function.curl-setopt.php
- curl, `CURLOPT_DNS_CACHE_TIMEOUT` (cache DNS milik handle/share, bukan global):
  https://curl.se/libcurl/c/CURLOPT_DNS_CACHE_TIMEOUT.html
- curl, `CURLOPT_TCP_FASTOPEN` (dan catatan dukungan platform):
  https://curl.se/libcurl/c/CURLOPT_TCP_FASTOPEN.html
- curl, `CURLOPT_HTTP_VERSION` (arti `CURL_HTTP_VERSION_2TLS`):
  https://curl.se/libcurl/c/CURLOPT_HTTP_VERSION.html
- MDN, `Server-Timing` (format `nama;dur=angka`):
  https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
- RFC 9111 §5.2.2.5, `no-store` (respons tidak boleh disimpan):
  https://www.rfc-editor.org/rfc/rfc9111.html#section-5.2.2.5
