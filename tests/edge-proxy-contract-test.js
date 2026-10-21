/**
 * tests/edge-proxy-contract-test.js — GERBANG kontrak proxy PHP `deploy/edge/api-index.php`.
 *
 * Node murni, nol dependency, nol jaringan, nol berkas temporer. Ia MEMINDAI berkas
 * PHP sebagai TEKS. Itu batasnya, dan batas itu ditulis di sini supaya tidak ada yang
 * salah paham: gerbang ini TIDAK menjalankan PHP (tidak ada PHP di runner CI, dan
 * memasangnya demi satu berkas 300 baris bukan pertukaran yang sehat). Karena itu ia
 * menjaga hal-hal yang MEMANG bisa dijaga dari teks — keberadaan, ketiadaan, dan
 * bentuk — dan setiap detektornya dibuktikan bisa MERAH dengan menyuntikkan
 * pelanggaran ke salinan DI MEMORI (berkas di repo tidak pernah disentuh).
 *
 * KENAPA ADA. Tugas A7 mengubah blok transport proxy (HTTP/2, TCP keepalive, TCP Fast
 * Open, IPRESOLVE, kompresi diteruskan apa adanya, timeout dipendekkan). Setiap
 * sakelar itu adalah kesempatan baru untuk merusak sesuatu yang tidak ada
 * hubungannya dengan latensi: allowlist bisa longgar, header rahasia bisa hilang,
 * cache bisa muncul di jalur beridentitas, galat mentah bisa bocor. `tests/edge-guard-test.js`
 * menjaga sisi Worker + ketiadaan nilai secret; gerbang INI menjaga sisi kontrak
 * proxy-nya.
 *
 * ==========================================================================
 * APA YANG DIJAGA
 * ==========================================================================
 * (a) Allowlist endpoint masih DEFAULT TOLAK dan memuat tepat 13 jalur yang sah.
 * (b) `X-Fiezel-Edge` masih dikirim, dan nilainya masih placeholder (bukan secret).
 * (c) TIDAK ADA cache untuk jalur beridentitas/berkuota, dan tidak ada cache untuk
 *     respons ber-`Set-Cookie`. Keadaan berkas saat ini: nol cache sama sekali
 *     (keputusan yang tertulis di berkas). Kalau suatu hari cache dipasang, butir
 *     ini berubah dari "buktikan tidak ada" menjadi "buktikan penjaganya ada".
 * (d) IP mentah TIDAK diteruskan ke Worker.
 * (e) Galat curl mentah TIDAK PERNAH dikirim ke klien — hanya ke `error_log`.
 * (f) `CURLOPT_FOLLOWLOCATION` tetap false.
 * (g) SETIAP opsi curl baru punya komentar alasan (hemat apa, risikonya apa) tepat
 *     di atasnya. Sakelar transport tanpa alasan tertulis adalah sakelar yang orang
 *     berikutnya akan cabut atau gandakan tanpa tahu harganya.
 * (h) Angka timeout masuk akal dan terikat pada jalurnya (batas pendek hanya untuk
 *     GET JSON kecil; jalur model tetap sabar).
 *
 * Gagal memuat sumber = FAIL, bukan SKIP (aturan gerbang repo).
 */

'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const PHP_PATH = path.join(ROOT, 'deploy', 'edge', 'api-index.php');

const results = [];
let failures = 0;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) failures += 1;
}

function mustRead(absolute, label) {
  if (!fs.existsSync(absolute)) throw new Error('berkas wajib tidak ada: ' + label);
  return fs.readFileSync(absolute, 'utf8');
}

/**
 * Buang komentar PHP TETAPI PERTAHANKAN jumlah baris. Dua alasan, keduanya penting:
 *  1. Berkas ini menyebut nama opsi di dalam komentar (mis. opsi yang SENGAJA tidak
 *     dipasang). Detektor yang membaca komentar akan menganggapnya terpasang.
 *  2. Nomor baris harus tetap sama supaya butir (g) bisa melihat ke ATAS dari baris
 *     pemakaian untuk mencari komentar alasannya di berkas ASLI.
 */
function stripPhpComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
  out = out.replace(/^\s*#[^\n]*/gm, (m) => ' '.repeat(m.length));
  return out;
}

const PHP_RAW = mustRead(PHP_PATH, 'deploy/edge/api-index.php');
const PHP = stripPhpComments(PHP_RAW);
const RAW_LINES = PHP_RAW.split('\n');

assert(PHP_RAW.split('\n').length === PHP.split('\n').length,
  'penghapus komentar mempertahankan jumlah baris (prasyarat butir g)');
assert(!/CURLOPT_DNS_CACHE_TIMEOUT/.test(PHP),
  'penghapus komentar TERBUKTI bekerja: nama opsi yang hanya disebut di komentar tidak terbaca sebagai pemakaian');

/* =======================================================================
 * (a) Allowlist: default TOLAK + tepat 13 jalur yang sah
 * ===================================================================== */
const EXPECTED_ALLOW = {
  '/health': ['GET'],
  '/healthz': ['GET'],
  '/api/config': ['GET'],
  '/api/auth/anon': ['POST'],
  '/api/auth/claim': ['POST'],
  '/api/user/me': ['GET'],
  '/api/quota': ['GET'],
  '/api/ai/task': ['POST'],
  '/api/tts/render': ['POST'],
  '/api/tts/manifest': ['GET'],
  '/api/usage/events': ['POST'],
  '/api/usage/retention': ['POST'],
  '/api/usage/pepper': ['GET']
};

function parseAllow(source) {
  const block = /const\s+ALLOW\s*=\s*\[([\s\S]*?)\n\];/.exec(source);
  if (!block) return null;
  const map = {};
  const entry = /'((?:\/[A-Za-z0-9_\-/]*)+)'\s*=>\s*\[([^\]]*)\]/g;
  let m;
  while ((m = entry.exec(block[1])) !== null) {
    map[m[1]] = (m[2].match(/'([A-Z]+)'/g) || []).map((s) => s.replace(/'/g, ''));
  }
  return map;
}

const allow = parseAllow(PHP);
assert(!!allow, '(a) blok `const ALLOW` bisa dibaca gerbang');
if (allow) {
  const got = Object.keys(allow).sort();
  const want = Object.keys(EXPECTED_ALLOW).sort();
  assert(got.length === 13, '(a) allowlist memuat tepat 13 jalur, dapat ' + got.length + ': ' + got.join(','));
  assert(got.join(',') === want.join(','),
    '(a) 13 jalur itu PERSIS yang sah; selisih: '
    + [...got.filter((p) => !want.includes(p)).map((p) => '+' + p),
       ...want.filter((p) => !got.includes(p)).map((p) => '-' + p)].join(' ') || 'nol');
  for (const [p, methods] of Object.entries(EXPECTED_ALLOW)) {
    if (!allow[p]) continue;
    assert(allow[p].join(',') === methods.join(','),
      '(a) metode untuk ' + p + ' tetap ' + methods.join(',') + ', dapat ' + allow[p].join(','));
  }
  // Jalur yang bukan GET tidak boleh diam-diam menerima GET (dan sebaliknya): itu
  // cara paling halus membuat penerbitan identitas bisa dipicu dari <img src>.
  assert(Object.values(allow).every((ms) => ms.length === 1 && (ms[0] === 'GET' || ms[0] === 'POST')),
    '(a) setiap jalur mengizinkan tepat SATU metode (GET atau POST)');
}

// Default TOLAK, dibaca dari kode: path tak terdaftar -> 404, metode salah -> 405,
// dan pemeriksaannya terjadi SEBELUM badan dibaca / curl disiapkan.
assert(/if\s*\(!isset\(ALLOW\[\$path\]\)\)[\s\S]{0,80}fail\(404,\s*'not_found'\)/.test(PHP),
  '(a) path yang tidak di-allowlist dijawab 404 not_found (default TOLAK)');
assert(/in_array\(\$method,\s*ALLOW\[\$path\],\s*true\)[\s\S]{0,80}fail\(405,\s*'method_not_allowed'\)/.test(PHP),
  '(a) metode yang tidak diizinkan dijawab 405');
const allowGateAt = PHP.indexOf('fail(404, \'not_found\')');
const curlInitAt = PHP.indexOf('curl_init(');
assert(allowGateAt > 0 && curlInitAt > allowGateAt,
  '(a) gerbang allowlist berjalan SEBELUM upstream disentuh');
assert(!/\$path\s*=~|preg_match\([^)]*ALLOW/.test(PHP),
  '(a) allowlist dicocokkan PERSIS (bukan pola/prefiks yang bisa meloloskan jalur tak terduga)');
assert(/str_contains\(\$path,\s*'\.\.'\)[\s\S]{0,60}fail\(400/.test(PHP),
  '(a) traversal `..` ditolak 400 sebelum pencocokan');

// Detektor (a) dibuktikan bisa merah.
{
  const poisoned = PHP_RAW.replace("  '/api/quota'         => ['GET'],", "  '/api/quota'         => ['GET'],\n  '/api/owner/flags'   => ['PUT'],");
  const p = parseAllow(stripPhpComments(poisoned));
  assert(!!p && Object.keys(p).length === 14,
    '(a) pembaca allowlist TERBUKTI melihat jalur baru yang diselipkan (14 != 13)');
}

/* =======================================================================
 * (b) `X-Fiezel-Edge` masih dikirim, dan masih placeholder
 * ===================================================================== */
assert(/'X-Fiezel-Edge:\s*'\s*\.\s*EDGE_SECRET/.test(PHP),
  '(b) header X-Fiezel-Edge dikirim dengan nilai konstanta EDGE_SECRET');
assert(/const\s+EDGE_SECRET\s*=\s*'__EDGE_SECRET__'/.test(PHP),
  '(b) EDGE_SECRET masih placeholder __EDGE_SECRET__, bukan nilai sungguhan');
assert((PHP_RAW.match(/__EDGE_SECRET__/g) || []).length === 1,
  '(b) placeholder muncul TEPAT SEKALI di seluruh berkas');
assert(/X-Fiezel-Edge-Version:\s*1/.test(PHP), '(b) versi header jembatan tetap dikirim');
// Header rahasia harus masuk daftar yang SELALU dikirim, bukan bersyarat: satu
// `if` di depannya membuat ada jalur yang lolos ke Worker tanpa header dan mendapat
// 403 yang membingungkan.
{
  const fwdBlock = /\$fwd\s*=\s*\[([\s\S]*?)\n\];/.exec(PHP);
  assert(!!fwdBlock, '(b) blok $fwd bisa dibaca gerbang');
  if (fwdBlock) {
    assert(/X-Fiezel-Edge:/.test(fwdBlock[0]),
      '(b) X-Fiezel-Edge ada di daftar header AWAL (tanpa syarat), bukan ditambahkan bersyarat');
  }
}
// Nilai secret tidak boleh dicetak, dicatat, atau dikirim balik ke klien.
assert(!/(echo|print|error_log|json_encode)\s*\(?[^\n;]*EDGE_SECRET/.test(PHP),
  '(b) EDGE_SECRET tidak pernah dicetak/dicatat/dikirim balik');

/* =======================================================================
 * (c) Cache: nol untuk identitas/kuota, nol untuk respons ber-Set-Cookie
 * ===================================================================== */
// Jalur yang haram di-cache dalam keadaan apa pun.
const IDENTITY_PATHS = ['/api/auth/anon', '/api/auth/claim', '/api/user/me', '/api/quota',
  '/api/ai/task', '/api/tts/render', '/api/usage/events', '/api/usage/retention', '/api/usage/pepper'];

// Primitif yang dipakai orang untuk mem-cache di PHP hosting bersama. Daftar ini
// adalah DEFINISI "cache" bagi gerbang ini, jadi ia ditulis eksplisit.
const CACHE_PRIMITIVES = [
  [/\bfile_put_contents\s*\(/, 'file_put_contents'],
  [/\bfopen\s*\([^)]*['"][waxc]\+?['"]/, 'fopen mode tulis'],
  [/\bapcu_(?:store|fetch|add)\s*\(/, 'APCu'],
  [/\bmemcach(?:e|ed)\b/i, 'memcache'],
  [/\bnew\s+Redis\b/i, 'Redis'],
  [/\bshm_(?:attach|put_var)\s*\(/, 'shared memory'],
  [/\bsem_acquire\s*\(/, 'semaphore (penanda cache berkas)'],
  [/\bserialize\s*\(\s*\$payload/, 'serialize payload'],
  [/\bsys_get_temp_dir\s*\(/, 'direktori temp']
];
const cacheHits = CACHE_PRIMITIVES.filter(([re]) => re.test(PHP)).map(([, label]) => label);

// KEADAAN SAAT INI: nol cache. Itu keputusan, dan keputusan itu WAJIB tertulis di
// berkas — kalau tidak, orang berikutnya akan menganggapnya kelalaian dan "memperbaiki".
assert(/TIDAK ADA CACHE/.test(PHP_RAW),
  '(c) berkas menuliskan keputusan cache secara eksplisit (blok "TIDAK ADA CACHE")');
assert(/no-store/.test(PHP_RAW) && /route-config\.js/.test(PHP_RAW),
  '(c) keputusan itu menyebut bukti no-store dari upstream (route-config.js), bukan opini');

if (cacheHits.length === 0) {
  assert(true, '(c) nol primitif cache di proxy — tidak ada apa pun yang bisa mem-cache identitas/kuota/Set-Cookie');
} else {
  // Kalau suatu hari cache dipasang, ia harus datang bersama TIGA penjaga ini.
  assert(IDENTITY_PATHS.every((p) => new RegExp('NO_CACHE[\\s\\S]{0,600}' + p.replace(/\//g, '\\/')).test(PHP)),
    '(c) cache terpasang (' + cacheHits.join(', ') + ') => harus ada denylist NO_CACHE yang memuat SEMUA jalur identitas/kuota');
  assert(/set-cookie[\s\S]{0,200}(?:no_cache|skipCache|\$cacheable\s*=\s*false)/i.test(PHP),
    '(c) cache terpasang => respons ber-Set-Cookie WAJIB melewati cache');
  assert(/cache-control[\s\S]{0,200}no-store|no-store[\s\S]{0,200}cache-control/i.test(PHP),
    '(c) cache terpasang => `Cache-Control: no-store` upstream WAJIB dihormati');
}

// Tanpa syarat, apa pun keadaan cache: proxy tidak boleh MENGARANG izin cache.
assert(!/header\s*\(\s*['"]Cache-Control:\s*(?:public|max-age|s-maxage)/i.test(PHP),
  '(c) proxy tidak pernah memasang Cache-Control yang mengizinkan cache atas namanya sendiri');
// Dan `cache-control` upstream harus tetap diteruskan apa adanya: itu satu-satunya
// cara Worker bisa melarang cache di hilir (browser, CDN, proxy sekolah).
{
  const pass = /\$passThrough\s*=\s*\[([\s\S]*?)\];/.exec(PHP);
  assert(!!pass && /'cache-control'/.test(pass[1]),
    '(c) header `cache-control` upstream tetap diteruskan ke klien');
  assert(!!pass && !/'set-cookie'/.test(pass[1]),
    '(c) `set-cookie` TIDAK ikut daftar passThrough biasa (ia butuh replace=false sendiri)');
  assert(/if\s*\(\$name\s*===\s*'set-cookie'\)[\s\S]{0,120}header\('Set-Cookie:\s*'\s*\.\s*\$val,\s*false\)/.test(PHP),
    '(c) Set-Cookie diteruskan utuh dan BERTUMPUK (replace=false), bukan ditimpa satu sama lain');
}

// Detektor (c) dibuktikan bisa merah: satu cache berkas naif disuntikkan.
{
  const poisoned = PHP_RAW.replace('echo $payload;',
    "file_put_contents('/tmp/fz-cache-' . md5($path), $payload);\necho $payload;");
  const stripped = stripPhpComments(poisoned);
  const hits = CACHE_PRIMITIVES.filter(([re]) => re.test(stripped));
  assert(hits.length > 0, '(c) detektor cache TERBUKTI menangkap cache berkas naif yang disuntikkan');
}

/* =======================================================================
 * (d) IP mentah tidak diteruskan
 * ===================================================================== */
const IP_LEAKS = [
  [/REMOTE_ADDR/, '$_SERVER[REMOTE_ADDR]'],
  [/X-Forwarded-For/i, 'X-Forwarded-For'],
  [/X-Real-IP/i, 'X-Real-IP'],
  [/CF-Connecting-IP/i, 'CF-Connecting-IP'],
  [/True-Client-IP/i, 'True-Client-IP'],
  [/HTTP_X_FORWARDED/i, 'HTTP_X_FORWARDED*'],
  [/HTTP_CLIENT_IP/i, 'HTTP_CLIENT_IP'],
  [/'Forwarded:\s*/i, 'header Forwarded RFC 7239']
];
for (const [re, label] of IP_LEAKS) {
  assert(!re.test(PHP), '(d) IP mentah tidak diteruskan lewat ' + label);
}
assert(/IP\s*(?:murni|mentah)\s*TIDAK diteruskan/i.test(PHP_RAW),
  '(d) alasan kenapa IP tidak diteruskan tertulis di berkas');
// Detektor (d) dibuktikan bisa merah.
{
  const poisoned = PHP_RAW.replace('$url = UPSTREAM',
    "$fwd[] = 'X-Forwarded-For: ' . ($_SERVER['REMOTE_ADDR'] ?? '');\n$url = UPSTREAM");
  const stripped = stripPhpComments(poisoned);
  assert(/REMOTE_ADDR/.test(stripped) && /X-Forwarded-For/i.test(stripped),
    '(d) detektor TERBUKTI menangkap penerusan IP yang disuntikkan');
}

/* =======================================================================
 * (e) Galat curl mentah tidak pernah sampai ke klien
 * ===================================================================== */
{
  const errorLines = PHP.split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter((o) => /curl_error\s*\(/.test(o.line));
  assert(errorLines.length === 1,
    '(e) `curl_error()` dipakai di TEPAT SATU tempat, dapat ' + errorLines.length);
  if (errorLines.length === 1) {
    assert(/^\s*\$err\s*=\s*curl_error\(\$ch\);\s*$/.test(errorLines[0].line),
      '(e) hasil curl_error hanya ditampung variabel lokal, bukan dipakai langsung');
  }
  // Satu-satunya tujuan sah nilai itu: log server.
  assert(/error_log\('\[fiezel-edge\][^']*'\s*\.\s*\$err\)/.test(PHP),
    '(e) galat mentah dicatat ke error_log server');
  // Dan TIDAK boleh keluar lewat jalur apa pun yang menyentuh klien.
  for (const [re, label] of [
    [/echo[^\n;]*\$err\b/, 'echo'],
    [/print[^\n;]*\$err\b/, 'print'],
    [/header\([^\n;]*\$err\b/, 'header()'],
    [/json_encode\([^\n;]*\$err\b/, 'json_encode'],
    [/fail\([^)]*\$err\b/, 'fail()'],
    [/fail\([^)]*curl_error/, 'fail() memanggil curl_error langsung'],
    [/echo[^\n;]*curl_/, 'echo nilai curl_*']
  ]) {
    assert(!re.test(PHP), '(e) galat mentah tidak pernah keluar lewat ' + label);
  }
  // Semua pesan yang SAMPAI ke klien harus literal string, bukan interpolasi.
  const failCalls = PHP.match(/fail\(\s*[0-9]{3}\s*,\s*[^)]*\)/g) || [];
  assert(failCalls.length >= 4, '(e) ada beberapa jalur gagal berkode literal yang diperiksa, dapat ' + failCalls.length);
  const nonLiteral = failCalls.filter((c) => !/fail\(\s*[0-9]{3}\s*,\s*'[a-z_]+'\s*\)/.test(c)
    && !/fail\(\s*\$[A-Za-z]+\s*\?/.test(c));
  assert(nonLiteral.length === 0,
    '(e) setiap pesan fail() adalah kode literal snake_case, bukan teks dinamis: ' + nonLiteral.join(' | '));
  assert(/\$body\b/.test(PHP) && !/error_log[^\n;]*\$body/.test(PHP),
    '(e) badan permintaan murid TIDAK ikut dicatat ke log (itu bisa memuat jawaban murid)');
  // Detektor (e) dibuktikan bisa merah.
  const poisoned = stripPhpComments(PHP_RAW.replace("fail($timedOut ? 504 : 502,", "fail(502, 'upstream: ' . $err); fail($timedOut ? 504 : 502,"));
  assert(/fail\([^)]*\$err\b/.test(poisoned),
    '(e) detektor TERBUKTI menangkap kebocoran galat mentah ke klien');
}

/* =======================================================================
 * (f) CURLOPT_FOLLOWLOCATION tetap false
 * ===================================================================== */
{
  const uses = PHP.match(/CURLOPT_FOLLOWLOCATION[^\n,;]*/g) || [];
  assert(uses.length === 1, '(f) FOLLOWLOCATION disetel di tepat satu tempat, dapat ' + uses.length);
  assert(/CURLOPT_FOLLOWLOCATION\s*=>\s*false/.test(PHP),
    '(f) CURLOPT_FOLLOWLOCATION => false');
  assert(!/CURLOPT_FOLLOWLOCATION\s*(?:=>|,)\s*(?:true|1)\b/.test(PHP),
    '(f) FOLLOWLOCATION tidak pernah true/1');
  assert(!/CURLOPT_MAXREDIRS/.test(PHP),
    '(f) tidak ada MAXREDIRS — kalau redirect tidak diikuti, angka batasnya tidak punya arti');
  assert(!/CURLOPT_UNRESTRICTED_AUTH/.test(PHP),
    '(f) tidak ada UNRESTRICTED_AUTH (ia hanya berarti bila redirect diikuti)');
}

/* =======================================================================
 * (g) Setiap opsi curl BARU punya komentar alasan
 * ===================================================================== */
{
  // Opsi yang sudah ada sebelum A7. Semuanya sudah punya konteks di tempat lain;
  // yang dituntut komentar adalah yang BARU, karena itulah yang orang berikutnya
  // tidak punya sejarahnya.
  const BASELINE_OPTS = new Set([
    'CURLOPT_RETURNTRANSFER', 'CURLOPT_HEADER', 'CURLOPT_HTTPHEADER', 'CURLOPT_TIMEOUT',
    'CURLOPT_CONNECTTIMEOUT', 'CURLOPT_FOLLOWLOCATION', 'CURLOPT_CUSTOMREQUEST', 'CURLOPT_POSTFIELDS'
  ]);
  const strippedLines = PHP.split('\n');
  const firstUse = new Map();
  strippedLines.forEach((line, i) => {
    for (const m of line.match(/\bCURLOPT_[A-Z0-9_]+/g) || []) {
      if (!firstUse.has(m)) firstUse.set(m, i + 1);
    }
  });
  const newOpts = [...firstUse.keys()].filter((o) => !BASELINE_OPTS.has(o)).sort();
  assert(newOpts.length >= 5,
    '(g) gerbang benar-benar melihat opsi baru A7 (>=5), dapat ' + newOpts.length + ': ' + newOpts.join(','));

  /** Kumpulkan komentar `//` yang berdiri tepat di atas baris `n` (blok kontinu). */
  function rationaleAbove(n, maxBack) {
    const out = [];
    let i = n - 2; // indeks 0-based baris di atas
    let hops = 0;
    while (i >= 0 && hops < maxBack) {
      const raw = RAW_LINES[i];
      const t = raw.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) out.unshift(t);
      else if (t === '' || /^(if|\{|\$opts\[|\}|const)/.test(t) || /=>/.test(t)) {
        // baris kode/kosong di antara komentar dan pemakaian masih boleh dilewati:
        // opsi kerap dibungkus `if (defined(...)) {`.
        if (out.length) break;
      } else if (out.length) break;
      i -= 1;
      hops += 1;
    }
    return out.join(' ');
  }

  const missing = [];
  for (const opt of newOpts) {
    const text = rationaleAbove(firstUse.get(opt), 18);
    const hasSaving = /hemat/i.test(text);
    const hasRisk = /risiko/i.test(text);
    if (!(hasSaving && hasRisk)) {
      missing.push(opt + (hasSaving ? '' : ' [tanpa "Hemat:"]') + (hasRisk ? '' : ' [tanpa "Risiko:"]'));
    }
  }
  assert(missing.length === 0,
    '(g) setiap opsi curl baru punya komentar alasan (hemat + risiko) di atasnya; kurang: ' + (missing.join(' | ') || 'nol'));

  // Detektor (g) dibuktikan bisa merah: opsi baru tanpa komentar apa pun.
  {
    const poisoned = PHP_RAW.replace('curl_setopt_array($ch, $opts);',
      '$opts[CURLOPT_VERBOSE] = true;\ncurl_setopt_array($ch, $opts);');
    const pl = stripPhpComments(poisoned).split('\n');
    const rl = poisoned.split('\n');
    let ln = -1;
    pl.forEach((line, i) => { if (ln < 0 && /CURLOPT_VERBOSE/.test(line)) ln = i + 1; });
    let txt = '';
    for (let i = ln - 2; i >= 0 && i > ln - 8; i -= 1) {
      const t = rl[i].trim();
      if (t.startsWith('//')) txt = t + ' ' + txt; else break;
    }
    assert(ln > 0 && !(/hemat/i.test(txt) && /risiko/i.test(txt)),
      '(g) detektor TERBUKTI menangkap opsi curl baru tanpa komentar alasan');
  }

  // Setiap opsi yang tidak dijamin ada di semua build curl harus dibungkus `defined()`,
  // kalau tidak proxy mati total pada hosting dengan curl tua — kegagalan 100%, bukan
  // kegagalan latensi.
  for (const opt of ['CURLOPT_TCP_FASTOPEN', 'CURLOPT_TCP_KEEPALIVE', 'CURLOPT_HTTP_VERSION', 'CURLOPT_IPRESOLVE']) {
    if (!firstUse.has(opt)) continue;
    const guard = opt === 'CURLOPT_HTTP_VERSION' ? 'CURL_HTTP_VERSION_2TLS'
      : (opt === 'CURLOPT_IPRESOLVE' ? 'CURL_IPRESOLVE_V4' : opt);
    assert(new RegExp("defined\\('" + guard + "'\\)").test(PHP),
      '(g) ' + opt + ' dipasang hanya bila didukung (dibungkus defined(' + guard + '))');
  }
  // HTTP/2 harus varian `2TLS` (turun otomatis ke 1.1), bukan `2_0` yang bisa gagal keras.
  assert(!/CURL_HTTP_VERSION_2_0\b/.test(PHP),
    '(g) memakai CURL_HTTP_VERSION_2TLS (jatuh otomatis ke 1.1), bukan 2_0 yang bisa gagal keras');
  // Kompresi: tidak boleh kembali memaksa dekompresi badan yang hanya diteruskan.
  assert(!/CURLOPT_(?:ENCODING|ACCEPT_ENCODING)\s*=>/.test(PHP),
    '(g) CURLOPT_ENCODING tidak dipakai lagi (ia memaksa dekompresi badan yang hanya diteruskan)');
  assert(/Accept-Encoding:\s*'\s*\.\s*\(\$passThroughGzip\s*\?\s*'gzip'\s*:\s*'identity'\)/.test(PHP),
    '(g) Accept-Encoding upstream mengikuti kemampuan klien (gzip diteruskan, atau identity)');
  assert(/zlib\.output_compression/.test(PHP),
    '(g) pass-through gzip menjaga diri dari kompresi ganda (zlib.output_compression)');
  assert(/if\s*\(\$passThroughGzip\)\s*\$passThrough\[\]\s*=\s*'content-encoding';/.test(PHP),
    '(g) `content-encoding` HANYA diteruskan pada cabang pass-through');
  // Keamanan transport tidak boleh ikut terbawa arus optimasi.
  assert(/CURLOPT_SSL_VERIFYPEER\s*=>\s*true/.test(PHP), '(g) SSL_VERIFYPEER tetap true');
  assert(/CURLOPT_SSL_VERIFYHOST\s*=>\s*2/.test(PHP), '(g) SSL_VERIFYHOST tetap 2');
  assert(!/CURLOPT_SSL_VERIFY(?:PEER|HOST)\s*=>\s*(?:false|0)\b/.test(PHP),
    '(g) tidak ada verifikasi TLS yang dimatikan demi kecepatan');
}

/* =======================================================================
 * (h) Angka timeout: pendek untuk GET kecil, tetap sabar untuk model
 * ===================================================================== */
{
  const num = (name) => {
    const m = new RegExp('const\\s+' + name + '\\s*=\\s*([0-9]+)').exec(PHP);
    return m ? Number(m[1]) : null;
  };
  const connect = num('CONNECT_S');
  const slow = num('TIMEOUT_S');
  const fast = num('TIMEOUT_FAST_S');
  assert(connect !== null && connect >= 2 && connect <= 5,
    '(h) CONNECT_S dipendekkan ke 2..5 s (leg origin->Cloudflare, bukan leg murid), dapat ' + connect);
  assert(slow !== null && slow >= 20,
    '(h) TIMEOUT_S untuk jalur model tetap >= 20 s, dapat ' + slow);
  assert(fast !== null && fast >= 5 && fast < slow,
    '(h) TIMEOUT_FAST_S untuk GET kecil >= 5 s dan lebih pendek dari jalur model, dapat ' + fast);
  assert(connect !== null && fast !== null && connect < fast,
    '(h) batas connect lebih pendek dari batas total (kalau tidak, connect tidak pernah jadi batas)');
  // Alasan angkanya WAJIB tertulis, termasuk trade-off jaringan Indonesia yang lambat.
  assert(/leg murid|jaringan murid Indonesia/i.test(PHP_RAW) && /TRADE-OFF/i.test(PHP_RAW),
    '(h) alasan angka connect + trade-off jaringan lambat tertulis di berkas');

  const fastList = /const\s+FAST_TIMEOUT_PATHS\s*=\s*\[([^\]]*)\]/.exec(PHP);
  assert(!!fastList, '(h) FAST_TIMEOUT_PATHS bisa dibaca gerbang');
  if (fastList && allow) {
    const paths = (fastList[1].match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));
    assert(paths.length > 0 && paths.every((p) => allow[p] && allow[p].join(',') === 'GET'),
      '(h) batas pendek HANYA dipakai jalur GET yang ada di allowlist: ' + paths.join(','));
    assert(!paths.includes('/api/ai/task') && !paths.includes('/api/tts/render'),
      '(h) jalur model TIDAK ikut batas pendek (jawaban model tidak boleh dipotong)');
    assert(/\$timeout\s*=\s*in_array\(\$path,\s*FAST_TIMEOUT_PATHS,\s*true\)\s*\?\s*TIMEOUT_FAST_S\s*:\s*TIMEOUT_S/.test(PHP),
      '(h) pilihan timeout memakai daftar itu, dan DEFAULT-nya sabar (TIMEOUT_S)');
  }
  // Jalur gagal harus membedakan habis-waktu dari tidak-terjangkau, tanpa membocorkan apa pun.
  assert(/fail\(\$timedOut\s*\?\s*504\s*:\s*502,\s*\$timedOut\s*\?\s*'upstream_timeout'\s*:\s*'upstream_unreachable'\)/.test(PHP),
    '(h) habis-waktu dijawab 504 dan tidak-terjangkau 502, keduanya dengan pesan generik');
}

/* =======================================================================
 * Alat ukur: ada, murni node, nol rahasia, target dari argumen
 * ===================================================================== */
{
  const probePath = path.join(ROOT, 'tools', 'edge-latency-probe.mjs');
  assert(fs.existsSync(probePath), 'alat ukur tools/edge-latency-probe.mjs ada');
  if (fs.existsSync(probePath)) {
    const probeRaw = mustRead(probePath, 'tools/edge-latency-probe.mjs');
    // Komentar dibuang lebih dulu: berkas itu MENJELASKAN bahwa ia tidak mengirim
    // header jembatan, dan penjelasan itu memuat nama headernya. Memeriksa teks
    // mentah akan menghukum dokumentasi yang benar.
    const probe = probeRaw
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
    assert(/X-Fiezel-Edge/i.test(probeRaw),
      'alat ukur MENJELASKAN kenapa ia tidak mengirim header jembatan');
    assert(/p50/.test(probe) && /p95/.test(probe), 'alat ukur melaporkan p50 dan p95');
    for (const p of ['/healthz', '/health', '/api/config']) {
      assert(probe.includes("'" + p + "'"), 'alat ukur mengukur ' + p);
    }
    assert(/process\.argv/.test(probe), 'target datang dari argumen');
    assert(!/process\.env\.[A-Z_]*(?:SECRET|TOKEN|KEY)/.test(probe), 'alat ukur nol rahasia (tidak membaca env secret)');
    assert(!/X-Fiezel-Edge/i.test(probe),
      'alat ukur TIDAK mengirim header jembatan di KODE-nya (ia menembak dari luar seperti murid)');
    assert(!/api\.fiezel\.my\.id['"`]/.test(probe.replace(/^.*node tools.*$/gm, '').replace(/^\s*\*.*$/gm, '')),
      'alat ukur tidak punya target produksi bawaan di kode (hanya di contoh pemakaian)');
    assert(/require\s*\(|import\s+\{[^}]*\}\s+from\s+'node:fs'/.test(probe)
      && !/from\s+'(?!node:)/.test(probe), 'alat ukur nol dependency eksternal');
    assert(/baseline/i.test(probe), 'alat ukur bisa membandingkan sebelum-sesudah (--baseline)');
    assert(!/credentials\s*:\s*'include'/.test(probe) && !/cookie\s*:/i.test(probe),
      'alat ukur tidak pernah mengirim cookie (ia tidak boleh bisa membuat identitas)');
  }
}

/* =======================================================================
 * README: analisis + perintah pengukuran untuk master
 * ===================================================================== */
{
  const readme = mustRead(path.join(ROOT, 'deploy', 'edge', 'README.md'), 'deploy/edge/README.md');
  for (const [re, label] of [
    [/handshake TLS/i, 'sumber biaya handshake TLS per permintaan'],
    [/reuse koneksi|antar proses/i, 'ketiadaan reuse koneksi antar proses'],
    [/HTTP\/2/i, 'HTTP/2 ke upstream'],
    [/opcache/i, 'overhead startup PHP / opcache'],
    [/CURLOPT_DNS_CACHE_TIMEOUT/, 'kenapa DNS cache curl tidak menolong'],
    [/TCP Fast Open/i, 'TCP Fast Open'],
    [/no-store/i, 'kesimpulan cache berdasar no-store upstream'],
    [/edge-latency-probe/, 'alat ukur dan cara memakainya'],
    [/SESUDAH.*belum|belum ada angka sesudah|angka sesudah belum/i, 'pengakuan bahwa angka SESUDAH belum ada'],
    [/2\.214|1\.051|1\.163/, 'angka latensi terukur (dijaga juga oleh edge-guard-test)']
  ]) {
    assert(re.test(readme), 'README menjelaskan ' + label);
  }
  assert(/847/.test(readme), 'README memuat angka hangat terukur terbaru (847 ms)');
}

/* =======================================================================
 * Gerbang ini benar-benar terdaftar di CI
 * ===================================================================== */
{
  const workflow = mustRead(path.join(ROOT, '.github', 'workflows', 'quality.yml'), '.github/workflows/quality.yml');
  assert(/node tests\/edge-proxy-contract-test\.js/.test(workflow),
    'quality.yml memanggil node tests/edge-proxy-contract-test.js');
  assert(/node tests\/edge-guard-test\.js/.test(workflow),
    'quality.yml masih memanggil tests/edge-guard-test.js (gerbang ini melengkapinya, bukan menggantikannya)');
}

/* ---------------------------- Laporan --------------------------------- */
const passed = results.filter((r) => r.ok).length;
for (const r of results) if (!r.ok) console.error('FAIL: ' + r.message);
fs.writeFileSync(path.join(ROOT, 'EDGE-PROXY-CONTRACT-REPORT.json'), JSON.stringify({
  schema: 'fiezel-edge-proxy-contract-report-v1',
  generatedAt: new Date().toISOString(),
  pass: failures === 0,
  scope: 'deploy/edge/api-index.php dipindai sebagai TEKS (tidak ada PHP di runner CI)',
  cacheDecision: {
    implemented: false,
    reason: 'Kandidat satu-satunya (/healthz, /api/config) keduanya ber-Cache-Control: no-store dari Worker; '
      + 'Cache-Control upstream dihormati mutlak, jadi nol jalur yang boleh di-cache.'
  },
  counts: { pass: passed, fail: failures, total: results.length },
  checks: results
}, null, 2) + '\n');
console.log('edge-proxy-contract-test: ' + passed + '/' + results.length + ' assert PASS');
if (failures) {
  console.error('edge-proxy-contract-test GAGAL: ' + failures + ' assert merah');
  process.exit(1);
}
