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
 */

declare(strict_types=1);

const UPSTREAM      = 'https://fiezel-api.fitrajft.workers.dev';
const EDGE_SECRET   = '__EDGE_SECRET__';   // disuntik saat pemasangan; jangan pernah masuk repo
const MAX_BODY      = 131072;              // 128 KB; cap byte sesungguhnya tetap ditegakkan Worker
const TIMEOUT_S     = 25;
const CONNECT_S     = 8;

// Endpoint yang boleh lewat. Default TOLAK: jalur baru harus didaftarkan sadar.
const ALLOW = [
  '/health'            => ['GET'],
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

function fail(int $code, string $msg): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode(['error' => $msg], JSON_UNESCAPED_SLASHES);
  exit;
}

$path   = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$query  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_QUERY);
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

$fwd = [
  'X-Fiezel-Edge: ' . EDGE_SECRET,
  'X-Fiezel-Edge-Version: 1',
  'Accept: ' . ($_SERVER['HTTP_ACCEPT'] ?? 'application/json'),
];
if ($method === 'POST') $fwd[] = 'Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'application/json');
if (!empty($_SERVER['HTTP_COOKIE']))          $fwd[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
if (!empty($_SERVER['HTTP_ORIGIN']))          $fwd[] = 'Origin: ' . $_SERVER['HTTP_ORIGIN'];
if (!empty($_SERVER['HTTP_ACCEPT_LANGUAGE'])) $fwd[] = 'Accept-Language: ' . $_SERVER['HTTP_ACCEPT_LANGUAGE'];
if (!empty($_SERVER['HTTP_USER_AGENT']))      $fwd[] = 'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'];
// IP murni TIDAK diteruskan. Worker hanya butuh pengenal ber-hash untuk anti-abuse,
// dan meneruskan IP mentah lewat header memperbesar permukaan data pribadi.

$url = UPSTREAM . $path . ($query ? '?' . $query : '');

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER         => true,
  CURLOPT_HTTPHEADER     => $fwd,
  CURLOPT_TIMEOUT        => TIMEOUT_S,
  CURLOPT_CONNECTTIMEOUT => CONNECT_S,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_ENCODING       => '',
  CURLOPT_CUSTOMREQUEST  => $method,
]);
if ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$raw = curl_exec($ch);
if ($raw === false) {
  $err = curl_error($ch); curl_close($ch);
  // Galat mentah tidak pernah sampai ke murid; hanya dicatat.
  error_log('[fiezel-edge] upstream gagal: ' . $err);
  fail(502, 'upstream_unreachable');
}
$status     = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$rawHeaders = substr($raw, 0, $headerSize);
$payload    = substr($raw, $headerSize);

http_response_code($status);
$passThrough = ['content-type','cache-control','vary','etag','last-modified','retry-after',
                'access-control-allow-origin','access-control-allow-credentials',
                'access-control-expose-headers','x-fiezel-quota','x-fiezel-degraded'];
foreach (explode("\r\n", $rawHeaders) as $line) {
  $pos = strpos($line, ':');
  if ($pos === false) continue;
  $name = strtolower(trim(substr($line, 0, $pos)));
  $val  = trim(substr($line, $pos + 1));
  if ($name === 'set-cookie') { header('Set-Cookie: ' . $val, false); continue; }
  if (in_array($name, $passThrough, true)) header(ucfirst($name) . ': ' . $val, true);
}
if (!headers_sent()) header('X-Fiezel-Edge-Hop: 1');
echo $payload;
