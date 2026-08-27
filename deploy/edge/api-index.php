<?php
/**
 * FIEZEL edge bridge — api.fiezel.my.id (origin ArenHost) -> Worker Cloudflare.
 *
 * KENAPA INI ADA. Rancangan aslinya memakai custom domain Cloudflare untuk
 * `api.fiezel.my.id`, tapi itu mensyaratkan zona `fiezel.my.id` ada di Cloudflare,
 * dan nameserver domain dipegang reseller (ArenHost -> PT Digital Registra) yang
 * belum mengubahnya. Zona subdomain sendiri butuh paket Enterprise, jadi tertutup.
 *
 * Jembatan ini menyelesaikan satu hal yang tidak bisa dikompromikan: cookie identitas
 * murid harus PIHAK PERTAMA di `fiezel.my.id`. Kalau aplikasi memanggil
 * `*.workers.dev` langsung, `workers.dev` ada di public suffix list => lintas situs =>
 * cookie `SameSite=Lax` TIDAK terkirim, dan seluruh model identitas + kuota runtuh
 * menjadi token di localStorage yang bisa direset murid dengan menghapus data.
 *
 * SIFAT YANG DISENGAJA
 * - Hanya meneruskan; nol logika bisnis. Semua penegakan tetap di Worker.
 * - Hanya endpoint yang di-allowlist yang boleh lewat (default tolak).
 * - Header rahasia `X-Fiezel-Edge` dikirim supaya Worker bisa menolak akses langsung
 *   ke `workers.dev` yang tidak lewat jembatan ini.
 * - Audio TIDAK lewat sini. Aset suara dilayani langsung dari R2/Worker audio supaya
 *   satu proses PHP di hosting bersama tidak menjadi leher botol untuk berkas besar.
 * - Ini SEMENTARA. Begitu nameserver pindah ke Cloudflare, custom domain menggantikan
 *   berkas ini dan jembatan ini harus dihapus, bukan dibiarkan menua.
 *
 * ==========================================================================
 * A7 — ANGGARAN LATENSI HOP INI (diukur, bukan ditebak)
 * ==========================================================================
 * Terukur pada `/health`: 2.214 ms dingin, lalu 847-1.163 ms hangat. `/healthz`
 * dingin sempat 2.071 ms. Untuk JSON beberapa ratus byte, itu mahal. Uraian biaya
 * per permintaan, dari yang terbesar:
 *
 *  1. HANDSHAKE TLS BARU KE UPSTREAM, SETIAP PERMINTAAN. Ini biaya terbesar dan
 *     tidak bisa dihapus dari dalam berkas ini. Setiap permintaan HTTP masuk =
 *     satu proses/worker PHP baru = handle curl baru = TCP + TLS penuh ke
 *     `*.workers.dev`. Tidak ada reuse koneksi ANTAR proses: cache sesi TLS curl
 *     hidup di dalam handle (`CURLOPT_SSL_SESSIONID_CACHE`), dan handle itu mati
 *     bersama proses. Jadi 1x RTT TCP + 1-2x RTT TLS terbayar ulang, selalu.
 *  2. RESOLUSI DNS. Sama nasibnya: cache DNS curl juga hidup di handle/share
 *     handle, jadi ia mati bersama proses. Karena itu `CURLOPT_DNS_CACHE_TIMEOUT`
 *     SENGAJA TIDAK DIPASANG di bawah — ia tidak akan pernah kena hit di model
 *     satu-permintaan-satu-proses, dan opsi yang menghemat 0 ms tetapi terlihat
 *     seperti optimasi adalah komentar yang bohong. Yang benar-benar meredam
 *     biaya ini adalah resolver OS/nscd di origin, di luar kendali PHP.
 *  3. DEKOMPRESI LALU KOMPRESI ULANG. `CURLOPT_ENCODING => ''` (sebelum A7)
 *     membuat curl meminta gzip lalu MENDEKOMPRESI badan di origin, padahal badan
 *     itu hanya diteruskan apa adanya ke murid — dan lapisan web origin lalu
 *     berpeluang meng-gzip ULANG. Dua kali kerja CPU untuk nol manfaat.
 *  4. HTTP/1.1 vs HTTP/2 ke upstream. Tanpa dipaksa, curl bisa memakai 1.1 ke
 *     Cloudflare; header 1.1 tidak terkompresi (tanpa HPACK) dan badan datang
 *     ber-`chunked`.
 *  5. STARTUP PHP. Menyalakan interpreter + parse berkas ini ada harganya
 *     (puluhan ms bila opcache mati). Berkas ini nol dependency, nol autoloader,
 *     nol include — dan itu memang disengaja. Sisanya urusan konfigurasi origin
 *     (opcache), dicatat di README §5b, bukan sesuatu yang bisa ditulis di sini.
 *
 * Kesimpulan jujur: perbaikan di bawah menekan poin 3, 4, dan sebagian 1;
 * poin 1 secara struktural TIDAK BISA dihapus selama hop ini ada. Satu-satunya
 * perbaikan besar adalah MENGHAPUS hop ini (README §6, PEMBONGKARAN).
 *
 * ==========================================================================
 * CACHE: TIDAK ADA CACHE DI BERKAS INI. Itu keputusan, bukan kelalaian.
 * ==========================================================================
 * Kandidat satu-satunya adalah `GET /healthz` dan `GET /api/config` (jalur lain
 * menyentuh identitas/kuota atau membawa `Set-Cookie`, jadi haram di-cache).
 * Keduanya ternyata TIDAK BOLEH:
 *   - `/api/config` mengirim `Cache-Control: no-store` secara eksplisit
 *     (`workers/api/route-config.js`), karena ia adalah kill switch runtime:
 *     men-cache-nya berarti "matikan AI sekarang" tertunda selama TTL cache —
 *     tepat kelas kegagalan yang endpoint itu diciptakan untuk mencegah.
 *   - `/healthz` juga ber-`no-store`: `jsonResponse` di `workers/api/errors.js`
 *     memasang `cache-control: no-store` bila rute tidak memasang sendiri. Dan
 *     men-cache probe kesehatan berarti monitor melaporkan "hidup" dari berkas
 *     cache saat Worker sudah mati. Cache pada probe = monitor yang berbohong.
 * Karena `Cache-Control` upstream dihormati MUTLAK, dan kedua kandidat berkata
 * `no-store`, hasil akhirnya nol jalur yang boleh di-cache. Memasang mesin cache
 * yang tidak pernah boleh menyala hanya menambah permukaan gagal (berkas cache di
 * hosting bersama, risiko keracunan, risiko menyimpan `Set-Cookie`) demi 0 ms.
 * Jadi tidak dipasang. Kalau suatu hari Worker mengirim `Cache-Control: public,
 * max-age=N` pada satu jalur bebas-identitas, cache boleh dipertimbangkan lagi —
 * dan `edge-proxy-contract-test.js` butir (c) sudah menunggu untuk menuntut
 * penjaganya (denylist identitas/kuota + bypass `Set-Cookie`).
 */

declare(strict_types=1);

const UPSTREAM      = 'https://fiezel-api.fitrajft.workers.dev';
const EDGE_SECRET   = '__EDGE_SECRET__';   // disuntik saat pemasangan; jangan pernah masuk repo
const MAX_BODY      = 131072;              // 128 KB; cap byte sesungguhnya tetap ditegakkan Worker

// TIMEOUT — dua angka, bukan satu, karena dua kelas permintaan yang sangat berbeda
// tidak boleh berbagi batas kesabaran.
//   TIMEOUT_S      : jalur lambat yang sah (`/api/ai/task`, `/api/tts/render`).
//                    Model bisa berpikir belasan detik; memotongnya = jawaban hilang.
//   TIMEOUT_FAST_S : GET JSON kecil. Terukur 847-2.214 ms end-to-end, jadi 8 s
//                    adalah ~4x kali margin terhadap ekor terburuk yang pernah
//                    terlihat. Kalau `/healthz` belum menjawab dalam 8 s, ia TIDAK
//                    akan menjawab dengan berguna — dan membiarkan murid menunggu
//                    25 s untuk kegagalan yang sudah pasti adalah kekejaman UX.
const TIMEOUT_S      = 25;
const TIMEOUT_FAST_S = 8;

// CONNECT_S: 8 s -> 4 s. Alasan angkanya, dan trade-off-nya:
// Batas ini HANYA mengatur leg origin(Jakarta/ArenHost) -> tepi Cloudflare, BUKAN
// leg murid -> origin. Jaringan murid Indonesia yang lambat (3G di kabupaten, paket
// data tersendat) mempengaruhi leg pertama, dan leg itu diatur oleh timeout server
// web/browser, bukan oleh konstanta ini. Leg yang diatur di sini adalah datacenter
// -> tepi Cloudflare terdekat (CGK/SIN), yang RTT-nya puluhan ms; total permintaan
// terukur pun hanya 2.214 ms pada kasus terburuk. Connect yang belum selesai dalam
// 4 s berarti DNS mati atau jalur keluar origin tersumbat — bukan "murid lambat".
// TRADE-OFF, dicatat jujur: 4 s masih memberi ruang untuk satu retry DNS (biasanya
// ~1 s + ~1 s) plus satu handshake. Tetapi bila resolver origin sedang sangat sakit
// (>4 s), permintaan yang dulu akhirnya berhasil pada detik ke-6 sekarang akan gagal
// 502. Itu pertukaran yang disengaja: gagal cepat dan jujur (murid melihat pesan
// jaringan dan bisa mencoba lagi) lebih baik daripada 8 detik layar menunggu yang
// berakhir sama gagalnya. Jangan turunkan lagi ke bawah ~3 s tanpa angka baru:
// di bawah itu retry DNS tunggal saja sudah tidak kebagian waktu.
const CONNECT_S      = 4;

// TCP Fast Open: satu-satunya sakelar di bawah yang punya risiko nyata, jadi ia
// punya sakelar sendiri supaya master bisa mematikannya tanpa mengutak-atik blok curl.
// Lihat komentar di tempat pemakaiannya.
const ENABLE_TCP_FASTOPEN = true;

// Endpoint yang boleh lewat. Default TOLAK: jalur baru harus didaftarkan sadar.
const ALLOW = [
  '/health'            => ['GET'],
  // `/healthz` ikut di-allowlist supaya monitor eksternal bisa memakai domain sendiri
  // (api.fiezel.my.id) alih-alih alamat workers.dev yang akan ditolak penjaga edge.
  '/healthz'           => ['GET'],
  '/api/config'        => ['GET'],
  '/api/auth/anon'     => ['POST'],
  '/api/auth/claim'    => ['POST'],
  '/api/user/me'       => ['GET'],
  '/api/quota'         => ['GET'],
  '/api/ai/task'       => ['POST'],
  '/api/tts/render'    => ['POST'],
  '/api/tts/manifest'  => ['GET'],
  '/api/usage/events'  => ['POST'],
  '/api/usage/retention' => ['POST'],
  '/api/usage/pepper'  => ['GET'],
];

// Jalur yang boleh memakai batas kesabaran pendek: GET JSON kecil saja. Jalur yang
// TIDAK terdaftar di sini otomatis memakai TIMEOUT_S penuh — default-nya sabar,
// jadi menambah rute baru tidak bisa diam-diam memotong jawaban model.
const FAST_TIMEOUT_PATHS = ['/health', '/healthz', '/api/config', '/api/tts/manifest'];

function fail(int $code, string $msg): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['error' => $msg], JSON_UNESCAPED_SLASHES);
  exit;
}

// Satu kali parse, dua nilai. Sebelumnya `parse_url` dipanggil dua kali atas string
// yang sama; bukan penghematan besar, tetapi kerja yang tidak perlu tetap kerja.
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$parts  = parse_url($requestUri);
$path   = (is_array($parts) && isset($parts['path'])) ? $parts['path'] : '/';
$query  = (is_array($parts) && isset($parts['query'])) ? $parts['query'] : null;
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Normalisasi: hanya path bersih, tanpa traversal.
$path = '/' . ltrim(preg_replace('#/+#', '/', $path), '/');
if (str_contains($path, '..')) fail(400, 'bad_path');

if ($method === 'OPTIONS') {
  // Preflight dijawab di sini supaya tidak membuang satu hop ke Worker.
  header('Access-Control-Allow-Origin: https://fiezel.my.id');
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Max-Age: 600');
  header('Vary: Origin');
  http_response_code(204);
  exit;
}

if (!isset(ALLOW[$path]))               fail(404, 'not_found');
if (!in_array($method, ALLOW[$path], true)) fail(405, 'method_not_allowed');

$body = '';
if ($method === 'POST') {
  $body = file_get_contents('php://input', false, null, 0, MAX_BODY + 1) ?: '';
  if (strlen($body) > MAX_BODY) fail(413, 'payload_too_large');
}

// ---------------------------------------------------------------------------
// KOMPRESI: teruskan apa adanya, jangan bongkar-pasang.
// Badan respons di sini SELALU hanya diteruskan — origin tidak pernah membacanya.
// Jadi mendekompresi di origin lalu membiarkan lapisan web meng-gzip ulang adalah
// dua kali kerja CPU untuk hasil byte yang sama. Dua cabang, keduanya nol kompresi
// di origin:
//   (1) murid mengiklankan gzip  -> minta gzip ke upstream, TERUSKAN terkompresi
//       (header `content-encoding` ikut diteruskan di daftar passThrough di bawah);
//   (2) murid tidak mengiklankan -> minta `identity`, jadi tidak ada yang perlu
//       dibongkar sama sekali.
// `CURLOPT_ENCODING` SENGAJA tidak dipakai lagi: memasangnya membuat curl otomatis
// mendekompresi, yang justru biaya yang sedang dihapus.
// SATU BAHAYA yang harus dijaga: kalau origin menyalakan `zlib.output_compression`,
// ia akan meng-gzip badan yang SUDAH gzip => murid menerima sampah. Jadi cabang (1)
// hanya dipakai bila kompresi otomatis PHP terbukti mati.
$zlibSetting = (string) ini_get('zlib.output_compression');
$zlibOn = $zlibSetting !== '' && $zlibSetting !== '0' && strtolower($zlibSetting) !== 'off';
$clientAcceptsGzip = str_contains(strtolower($_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''), 'gzip');
$passThroughGzip = $clientAcceptsGzip && !$zlibOn;

$fwd = [
  'X-Fiezel-Edge: ' . EDGE_SECRET,
  'X-Fiezel-Edge-Version: 1',
  'Accept: ' . ($_SERVER['HTTP_ACCEPT'] ?? 'application/json'),
  // Hanya `gzip` yang diminta, bukan `br`: badan diteruskan mentah, jadi origin
  // harus yakin murid bisa membacanya. `gzip` adalah satu-satunya encoding yang
  // pasti dipahami setiap klien yang mengiklankannya.
  'Accept-Encoding: ' . ($passThroughGzip ? 'gzip' : 'identity'),
];
if ($method === 'POST') $fwd[] = 'Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'application/json');
if (!empty($_SERVER['HTTP_COOKIE']))          $fwd[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
if (!empty($_SERVER['HTTP_ORIGIN']))          $fwd[] = 'Origin: ' . $_SERVER['HTTP_ORIGIN'];
if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) $fwd[] = 'Accept-Language: ' . $_SERVER['HTTP_ACCEPT_LANGUAGE'];
if (!empty($_SERVER['HTTP_USER_AGENT']))      $fwd[] = 'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'];
// IP murni TIDAK diteruskan. Worker hanya butuh pengenal ber-hash untuk anti-abuse,
// dan meneruskan IP mentah lewat header memperbesar permukaan data pribadi.

$url = UPSTREAM . $path . ($query !== null && $query !== '' ? '?' . $query : '');
$timeout = in_array($path, FAST_TIMEOUT_PATHS, true) ? TIMEOUT_FAST_S : TIMEOUT_S;

$ch = curl_init($url);
$opts = [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER         => true,
  CURLOPT_HTTPHEADER     => $fwd,
  CURLOPT_TIMEOUT        => $timeout,
  CURLOPT_CONNECTTIMEOUT => CONNECT_S,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_CUSTOMREQUEST  => $method,
  // KEAMANAN, bukan latensi — ditulis eksplisit karena default yang tidak terlihat
  // adalah default yang bisa hilang saat orang lain menyunting blok ini.
  // Hemat: 0 ms. Risiko kalau dihapus: MITM antara origin dan Cloudflare.
  CURLOPT_SSL_VERIFYPEER => true,
  CURLOPT_SSL_VERIFYHOST => 2,
];

// `CURLOPT_PROTOCOLS`: kunci ke HTTPS saja.
// Hemat: 0 ms. Yang dijaga: `UPSTREAM` sudah https dan FOLLOWLOCATION tetap false,
// jadi ini ikat pinggang kedua — tidak ada jalan bagi berkas ini untuk berbicara
// http/ftp/file kalau suatu hari konstanta URL salah sunting.
// Risiko: nol selama upstream tetap https; kalau suatu hari upstream sengaja http
// (tidak boleh terjadi), gejalanya galat langsung, bukan diam-diam tanpa TLS.
if (defined('CURLPROTO_HTTPS')) {
  $opts[CURLOPT_PROTOCOLS] = CURLPROTO_HTTPS;
}

// `CURL_HTTP_VERSION_2TLS`: pakai HTTP/2 bila ALPN berhasil, jatuh otomatis ke 1.1
// bila tidak (itu arti akhiran `2TLS`).
// Hemat: header permintaan terkompresi HPACK alih-alih teks penuh 1.1 (setiap
// permintaan membawa Cookie + User-Agent, jadi ini bukan nol), dan respons tidak
// datang ber-`Transfer-Encoding: chunked` sehingga tidak ada overhead framing per
// potong. Bukan penghematan ratusan ms — ia puluhan-an ms, dan itu jujur.
// Risiko: praktis nol; `2TLS` sudah berarti "turun ke 1.1 kalau h2 tidak tersedia".
if (defined('CURL_HTTP_VERSION_2TLS')) {
  $opts[CURLOPT_HTTP_VERSION] = CURL_HTTP_VERSION_2TLS;
}

// `CURLOPT_IPRESOLVE = CURL_IPRESOLVE_V4`: hanya cari A, jangan AAAA.
// Hemat: satu query DNS (AAAA) per permintaan, dan — ini yang mahal — menghindari
// "happy eyeballs" mencoba IPv6 lebih dulu pada hosting bersama yang IPv6-nya tidak
// benar-benar berfungsi; kegagalan senyap itu menambah ratusan ms sebelum jatuh ke
// IPv4. Upstream `*.workers.dev` selalu punya record A, jadi tidak ada jalur yang
// hilang.
// Risiko: kalau suatu hari origin dipindah ke jaringan IPv6-only, baris ini menjadi
// pemutus total. Itu perubahan infrastruktur besar yang tidak akan lolos diam-diam,
// dan gejalanya langsung terlihat (502 seragam), bukan halus.
if (defined('CURL_IPRESOLVE_V4')) {
  $opts[CURLOPT_IPRESOLVE] = CURL_IPRESOLVE_V4;
}

// `CURLOPT_TCP_KEEPALIVE`: kirim probe keepalive di koneksi ke upstream.
// Hemat: 0 ms pada GET kecil — dan itu bukan alasan ia ada. Alasannya `/api/ai/task`
// dan `/api/tts/render`: koneksi bisa MENGANGGUR belasan detik menunggu model
// selesai berpikir. NAT operator dan firewall stateful membuang pemetaan yang
// menganggur secara SENYAP; hasilnya bukan galat, tetapi timeout 25 s dan jawaban
// yang sudah dibayar kuotanya hilang. Probe tiap 15 s menjaga pemetaan itu hidup.
// Risiko: nol berarti; beberapa paket kecil per permintaan panjang.
if (defined('CURLOPT_TCP_KEEPALIVE')) {
  $opts[CURLOPT_TCP_KEEPALIVE] = 1;
  if (defined('CURLOPT_TCP_KEEPIDLE'))  $opts[CURLOPT_TCP_KEEPIDLE]  = 15;
  if (defined('CURLOPT_TCP_KEEPINTVL')) $opts[CURLOPT_TCP_KEEPINTVL] = 15;
}

// `CURLOPT_TCP_FASTOPEN`: kirim data aplikasi bersama SYN bila kernel masih menyimpan
// cookie TFO untuk tujuan ini.
// Hemat: sampai satu RTT penuh pada pembuatan koneksi — satu-satunya cara berkas ini
// bisa menyentuh biaya nomor 1 di kepala berkas tanpa menghapus hop-nya, karena cookie
// TFO tinggal di KERNEL dan karena itu BERTAHAN antar proses PHP (berbeda dari cache
// sesi TLS dan cache DNS curl yang mati bersama handle).
// Risiko NYATA, dan ini kenapa ia punya sakelar `ENABLE_TCP_FASTOPEN` sendiri:
// sebagian middlebox/firewall membuang SYN yang membawa data, dan pemulihannya adalah
// timeout retransmit yang bisa MENAMBAH ratusan ms, bukan mengurangi. Kalau angka
// `tools/edge-latency-probe.mjs` justru memburuk sesudah baris ini menyala, matikan
// dengan mengubah satu konstanta di atas — jangan menebak-nebak di blok ini.
if (ENABLE_TCP_FASTOPEN && defined('CURLOPT_TCP_FASTOPEN')) {
  $opts[CURLOPT_TCP_FASTOPEN] = true;
}

// CATATAN SENGAJA TIDAK DIPASANG — `CURLOPT_DNS_CACHE_TIMEOUT`.
// Cache DNS curl hidup di dalam handle (atau share handle) dan mati bersama proses
// PHP. Karena setiap permintaan HTTP di sini = proses baru = handle baru, cache itu
// tidak pernah bisa kena hit: nilai berapa pun menghemat 0 ms. Menuliskannya akan
// memberi kesan optimasi yang tidak ada. Pengurangan biaya DNS yang sesungguhnya ada
// di resolver origin (nscd/systemd-resolved) dan di baris IPRESOLVE di atas.

curl_setopt_array($ch, $opts);
if ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$raw = curl_exec($ch);
if ($raw === false) {
  $err = curl_error($ch);
  $errno = curl_errno($ch);
  curl_close($ch);
  // Galat mentah tidak pernah sampai ke murid; hanya dicatat.
  error_log('[fiezel-edge] upstream gagal: ' . $err);
  // Bedakan HABIS WAKTU dari TIDAK TERJANGKAU: 504 memberi tahu klien bahwa
  // mencoba lagi masuk akal, sedangkan 502 berarti jalurnya yang rusak. Keduanya
  // pesan generik — tidak ada satu byte pun dari `curl_error()` yang keluar.
  $timedOut = defined('CURLE_OPERATION_TIMEOUTED') && $errno === CURLE_OPERATION_TIMEOUTED;
  fail($timedOut ? 504 : 502, $timedOut ? 'upstream_timeout' : 'upstream_unreachable');
}
$status     = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
// Uraian waktu untuk PENGUKURAN, bukan hiasan: tanpa ini "hop PHP mahal" hanya
// bisa dilihat sebagai satu angka total, dan tidak ada cara membuktikan bagian mana
// (DNS / TCP / TLS / tunggu upstream) yang sesungguhnya membayar. Dipakai oleh
// `tools/edge-latency-probe.mjs`.
$t = [
  'dns' => (float) curl_getinfo($ch, CURLINFO_NAMELOOKUP_TIME),
  'tcp' => (float) curl_getinfo($ch, CURLINFO_CONNECT_TIME),
  'tls' => (float) curl_getinfo($ch, CURLINFO_APPCONNECT_TIME),
  'ttfb' => (float) curl_getinfo($ch, CURLINFO_STARTTRANSFER_TIME),
  'total' => (float) curl_getinfo($ch, CURLINFO_TOTAL_TIME),
];
curl_close($ch);

$rawHeaders = substr($raw, 0, $headerSize);
$payload    = substr($raw, $headerSize);

http_response_code($status);
$passThrough = ['content-type','cache-control','vary','etag','last-modified','retry-after',
                'access-control-allow-origin','access-control-allow-credentials',
                'access-control-expose-headers','x-fiezel-quota','x-fiezel-degraded'];
// `content-encoding` HANYA boleh diteruskan pada cabang pass-through: badan yang
// diteruskan masih terkompresi, jadi murid wajib diberi tahu. Pada cabang `identity`
// badan sudah polos dan meneruskan header ini akan merusak respons.
if ($passThroughGzip) $passThrough[] = 'content-encoding';
foreach (explode("\r\n", $rawHeaders) as $line) {
  $pos = strpos($line, ':');
  if ($pos === false) continue;
  $name = strtolower(trim(substr($line, 0, $pos)));
  $val  = trim(substr($line, $pos + 1));
  if ($name === 'set-cookie') { header('Set-Cookie: ' . $val, false); continue; }
  if (in_array($name, $passThrough, true)) header(ucfirst($name) . ': ' . $val, true);
}
if (!headers_sent()) {
  header('X-Fiezel-Edge-Hop: 1');
  // Format standar Server-Timing supaya angka hop ini bisa dibaca alat apa pun.
  // Isinya hanya durasi milik jembatan sendiri — nol data murid, nol identitas.
  header(sprintf(
    'Server-Timing: edge_dns;dur=%.1f, edge_tcp;dur=%.1f, edge_tls;dur=%.1f, upstream_ttfb;dur=%.1f, edge_total;dur=%.1f',
    $t['dns'] * 1000,
    max(0.0, $t['tcp'] - $t['dns']) * 1000,
    max(0.0, $t['tls'] - $t['tcp']) * 1000,
    max(0.0, $t['ttfb'] - $t['tls']) * 1000,
    $t['total'] * 1000
  ));
  // Hemat: 0 ms; mengurangi sidik jari versi PHP origin yang bocor cuma-cuma.
  header_remove('X-Powered-By');
}
echo $payload;
