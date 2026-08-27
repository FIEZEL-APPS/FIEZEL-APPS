<?php
/**
 * FIEZEL edge bridge — owner.fiezel.my.id (origin ArenHost) -> Worker Cloudflare `fiezel-owner`.
 *
 * KENAPA INI ADA. Worker `fiezel-owner` SUDAH ter-deploy, tetapi ia TIDAK BISA DIAKSES:
 * `workers/owner/wrangler.toml` meminta `owner.fiezel.my.id` sebagai custom domain, dan custom
 * domain Worker hanya bisa dibuat kalau zona `fiezel.my.id` ada + `Active` di akun Cloudflare
 * yang sama. Zona itu masih `pending` (nameserver dipegang reseller ArenHost -> PT Digital
 * Registra, menunggu tiket; `docs/CF-MIGRATION-RUNBOOK.md` Bagian 1(c)), dan jalur "zona
 * subdomain saja" sudah diuji: butuh Enterprise (Bagian 1(a1)). Jadi hostname-nya belum ada,
 * dan dashboard tanpa hostname sama dengan dashboard yang tidak dibangun.
 *
 * Yang dipakai di sini BUKAN pola baru: ia SALINAN pola yang sudah terbukti hidup untuk
 * `api.fiezel.my.id` (`deploy/edge/api-index.php`, 33 assert cf-live PASS) — subdomain cPanel di
 * origin ArenHost + satu proxy PHP yang meneruskan ke alamat `*.workers.dev`.
 *
 * BEDANYA DENGAN api-index.php — dan alasannya, bukan selera:
 *  - Upstream-nya Worker owner, dan allowlist-nya rute dashboard owner (SUMBER: daftar rute
 *    sungguhan di `workers/owner/index.js` -> `OWNER_ROUTES` + `PUBLIC_ROUTES`; tidak ada rute
 *    yang dikarang di sini, dan gerbang `owner-edge-guard-test.js` membandingkan dua daftar itu
 *    baris per baris).
 *  - Jawaban utamanya HTML, bukan JSON. Karena itu `Content-Type: text/html` harus lewat utuh,
 *    dan header keamanan yang sudah dipasang Worker (`Content-Security-Policy`, `X-Robots-Tag:
 *    noindex`, `Referrer-Policy`, `X-Content-Type-Options`) WAJIB ikut lewat. Proxy yang
 *    "cuma" menjatuhkan CSP mengubah halaman ber-CSP ketat menjadi halaman tanpa CSP, dan
 *    kehilangan itu tidak terlihat di mata (halamannya tetap tampil benar).
 *  - `Location` ikut diteruskan dan redirect TIDAK diikuti proxy: `/login` yang berhasil
 *    menjawab 303 -> `/`, dan `/logout` 303 -> `/login`. Kalau proxy mengikuti redirect sendiri,
 *    `Set-Cookie` sesi owner hilang di tengah jalan dan login berhasil terlihat seperti gagal.
 *  - TIDAK ADA header CORS di sini. Dashboard owner adalah HTML pihak pertama; nol fetch lintas
 *    asal. Menambahkan CORS hanya memperluas permukaan yang tidak dipakai siapa pun.
 *
 * SIFAT YANG DISENGAJA (sama seperti jembatan api)
 * - Hanya meneruskan; nol logika bisnis. SELURUH penegakan (gate owner, sesi, SQL agregat) tetap
 *   di Worker. Proxy ini TIDAK tahu apa itu token owner dan tidak boleh pernah tahu.
 * - Hanya endpoint yang di-allowlist yang boleh lewat (default TOLAK).
 * - Header rahasia `X-Fiezel-Edge` dikirim pada setiap permintaan supaya Worker bisa menolak
 *   akses langsung ke `fiezel-owner.fitrajft.workers.dev` yang tidak lewat jembatan ini.
 * - Cookie `fz_owner` dan `Set-Cookie` diteruskan apa adanya (tanpa itu tidak ada sesi owner).
 * - IP mentah TIDAK diteruskan.
 * - Galat mentah (curl/upstream) tidak pernah sampai ke pengguna; hanya `error_log`.
 * - Ini SEMENTARA. Begitu nameserver pindah ke Cloudflare, custom domain menggantikan berkas ini
 *   dan jembatan ini harus DIHAPUS (deploy/edge/README.md §7 PEMBONGKARAN), bukan dibiarkan menua.
 */

declare(strict_types=1);

const UPSTREAM      = 'https://fiezel-owner.fitrajft.workers.dev';
const EDGE_SECRET   = '__EDGE_SECRET__';   // disuntik saat pemasangan; jangan pernah masuk repo
const MAX_BODY      = 8192;                // dashboard owner hanya menerima satu form login
const TIMEOUT_S     = 25;
const CONNECT_S     = 8;

// Endpoint yang boleh lewat. Default TOLAK: rute baru harus didaftarkan sadar.
// SUMBER daftar ini: `workers/owner/index.js` (OWNER_ROUTES + PUBLIC_ROUTES). Kalau Worker
// menambah rute dan daftar ini tidak, gerbang `owner-edge-guard-test.js` MERAH — bukan diam.
const ALLOW = [
  '/'                => ['GET'],          // HTML dashboard (?period=today|7d|30d|90d)
  '/login'           => ['GET', 'POST'],  // satu-satunya rute publik Worker; POST = form token
  '/logout'          => ['GET'],
  '/api/summary'     => ['GET'],
  '/api/series'      => ['GET'],
  '/api/retention'   => ['GET'],
  '/api/cost'        => ['GET'],
];

/**
 * Galat proxy dijawab sebagai HTML minimal DENGAN header keamanan yang sama seperti Worker.
 * Alasannya: halaman galat yang lahir di PHP tidak boleh menjadi satu-satunya halaman di
 * hostname ini yang tanpa CSP dan tanpa `noindex`. Dan pesannya satu kata — sebab
 * sesungguhnya hanya masuk log server.
 */
function fail(int $code, string $msg): never {
  http_response_code($code);
  header('Content-Type: text/html; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Robots-Tag: noindex, nofollow');
  header('Referrer-Policy: no-referrer');
  header('X-Content-Type-Options: nosniff');
  header("Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  echo '<!doctype html><html lang="id"><head><meta charset="utf-8">'
     . '<meta name="robots" content="noindex,nofollow"><title>FIEZEL</title></head>'
     . '<body><p>' . htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') . '</p></body></html>';
  exit;
}

$path   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$query  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_QUERY);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Normalisasi: hanya path bersih, tanpa traversal. Slash di ujung dibuang supaya `/login/`
// tidak lolos allowlist sebagai path yang "tidak terdaftar" lalu jadi 404 yang membingungkan;
// Worker sendiri juga menormalkan `\/+$`.
$path = '/' . ltrim(preg_replace('#/+#', '/', $path), '/');
if (str_contains($path, '..')) fail(400, 'Permintaan tidak sah.');
if ($path !== '/') $path = rtrim($path, '/');
if ($path === '') $path = '/';

if (!isset(ALLOW[$path]))                   fail(404, 'Halaman tidak ada.');
if (!in_array($method, ALLOW[$path], true)) fail(405, 'Metode tidak diizinkan.');

$body = '';
if ($method === 'POST') {
  $body = file_get_contents('php://input', false, null, 0, MAX_BODY + 1) ?: '';
  if (strlen($body) > MAX_BODY) fail(413, 'Permintaan terlalu besar.');
}

$fwd = [
  'X-Fiezel-Edge: ' . EDGE_SECRET,
  'X-Fiezel-Edge-Version: 1',
  'Accept: ' . ($_SERVER['HTTP_ACCEPT'] ?? 'text/html'),
];
// Content-Type diteruskan apa adanya: halaman masuk mengirim form
// `application/x-www-form-urlencoded`, dan Worker memilih formData/json dari header ini.
if ($method === 'POST') $fwd[] = 'Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'application/x-www-form-urlencoded');
if (!empty($_SERVER['HTTP_COOKIE']))          $fwd[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
if (!empty($_SERVER['HTTP_ORIGIN']))          $fwd[] = 'Origin: ' . $_SERVER['HTTP_ORIGIN'];
if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) $fwd[] = 'Accept-Language: ' . $_SERVER['HTTP_ACCEPT_LANGUAGE'];
if (!empty($_SERVER['HTTP_USER_AGENT']))      $fwd[] = 'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'];
// IP murni TIDAK diteruskan. Worker owner tidak memakai IP untuk apa pun (rem login-nya
// per-isolate, jejak auditnya tanpa IP), jadi meneruskannya hanya memperbesar permukaan data
// pribadi tanpa satu pun manfaat.

$url = UPSTREAM . $path . ($query ? '?' . $query : '');

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER         => true,
  CURLOPT_HTTPHEADER     => $fwd,
  CURLOPT_TIMEOUT        => TIMEOUT_S,
  CURLOPT_CONNECTTIMEOUT => CONNECT_S,
  // Redirect TIDAK diikuti: 303 dari /login membawa Set-Cookie sesi owner yang harus sampai ke
  // browser. Kalau curl yang mengikutinya, cookie itu mati di proses PHP.
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_ENCODING       => '',
  CURLOPT_CUSTOMREQUEST  => $method,
]);
if ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$raw = curl_exec($ch);
if ($raw === false) {
  $err = curl_error($ch); curl_close($ch);
  // Galat mentah tidak pernah sampai ke pengguna; hanya dicatat.
  error_log('[fiezel-edge-owner] upstream gagal: ' . $err);
  fail(502, 'Dashboard sedang tidak bisa dihubungi.');
}
$status     = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($raw, 0, $headerSize);
$payload    = substr($raw, $headerSize);

http_response_code($status);

/**
 * Daftar pass-through. Empat nama pertama adalah HEADER KEAMANAN yang dipasang Worker owner
 * (`html()` di `workers/owner/index.js`). Mereka ada di daftar ini secara SADAR:
 *  - `content-security-policy` — CSP ketat (`default-src 'none'`) satu-satunya alasan halaman
 *    ini tidak bisa menarik apa pun dari luar. Menjatuhkannya = melonggarkan halaman tanpa
 *    seorang pun melihat perubahan.
 *  - `x-robots-tag` — dashboard owner TIDAK BOLEH terindeks. Tag `<meta robots>` di HTML tetap
 *    ada, tapi header ini yang berlaku untuk respons non-HTML (JSON) dan untuk perayap yang
 *    membaca header lebih dulu.
 *  - `referrer-policy`, `x-content-type-options` — sama: dipasang Worker, harus tetap ada di
 *    jawaban yang dilihat browser, bukan hanya di jawaban yang dilihat proxy.
 * `content-type` wajib lewat utuh supaya `text/html; charset=utf-8` tetap HTML (kalau hilang,
 * browser menebak, dan halaman bisa tampil sebagai teks mentah).
 * `location` wajib lewat supaya 303 login/logout berfungsi.
 * Gerbang `owner-edge-guard-test.js` butir (c) mengambil header dari respons HTML Worker yang
 * SUNGGUHAN lalu menuntut setiap satu di antaranya ada di daftar ini — jadi header baru yang
 * dipasang Worker tidak bisa hilang diam-diam di jembatan.
 */
$passThrough = ['content-security-policy','x-robots-tag','referrer-policy','x-content-type-options',
                'content-type','cache-control','location','vary','etag','last-modified','retry-after'];
foreach (explode("\r\n", $rawHeaders) as $line) {
  $pos = strpos($line, ':');
  if ($pos === false) continue;
  $rawName = trim(substr($line, 0, $pos));
  $name    = strtolower($rawName);
  $val     = trim(substr($line, $pos + 1));
  // `Set-Cookie` boleh muncul berkali-kali, jadi ia TIDAK menimpa (replace=false).
  if ($name === 'set-cookie') { header('Set-Cookie: ' . $val, false); continue; }
  // Nama header dikirim ulang dengan ejaan ASLI dari upstream, bukan hasil ucfirst(): HTTP
  // memang tidak peka huruf, tetapi `Content-security-policy` di log/alat audit terlihat
  // seperti header lain, dan itu membuang waktu orang yang sedang menelusuri masalah.
  if (in_array($name, $passThrough, true)) header($rawName . ': ' . $val, true);
}
if (!headers_sent()) header('X-Fiezel-Edge-Hop: 1');
echo $payload;
