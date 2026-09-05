// tests/cf-live-contract-test.js — gerbang kontrak untuk Worker `fiezel-api` yang HIDUP.
//
// ==========================================================================
// KENAPA BERKAS INI ADA
// ==========================================================================
// Seluruh gerbang CF yang sudah ada (`tests/cf-api-contract-test.js`,
// `tests/cf-wiring-test.js`, `quota-*`, `analytics-*`, `tests/tts-key-test.js`, ...) menguji
// Worker di atas STUB `tools/cf-test-harness.js`: D1, KV, R2, dan Workers AI
// palsu di dalam satu proses Node. Batas kejujuran itu ditulis sendiri di
// `reports/exec-wiring.md` §6:
//
//   "Semua pembuktian di atas berjalan di atas tools/cf-test-harness.js
//    (D1/KV/R2/AI palsu), bukan di Cloudflare. Yang dibuktikan adalah logika
//    pemasangan dan penegakan kuota, bukan perilaku runtime Cloudflare."
//
// Artinya sejumlah hal yang justru paling mudah salah di produksi TIDAK PERNAH
// diuji oleh satu pun gerbang: apakah rute benar-benar terpasang di edge (bukan
// hanya di router yang di-import), apakah `Set-Cookie` sungguhan lolos melewati
// Cloudflare dengan atribut yang utuh, apakah `ALLOWED_ORIGINS` di
// `wrangler.toml` sudah benar-benar ter-deploy, apakah cap byte ditegakkan
// sebelum body masuk, apakah `COOKIE_DOMAIN` terisi (kalau kosong, cookie jadi
// host-only dan identitas murid patah antara fiezel.my.id dan api.fiezel.my.id).
// Berkas ini menutup celah itu dengan cara yang tidak bisa dipalsukan stub:
// HTTP nyata ke Worker nyata.
//
// ==========================================================================
// KENAPA IA TIDAK BOLEH MEMERAHKAN CI — DAN KENAPA ITU BUKAN KEMALASAN
// ==========================================================================
// CI tidak punya alamat Worker (dan pada paket kerja ini alamatnya memang belum
// dibuka). Gerbang yang merah karena lingkungannya belum siap akan dimatikan
// orang dalam seminggu, dan gerbang yang dimatikan tidak melindungi apa pun.
// Karena itu:
//   - tanpa `FIEZEL_CF_LIVE_BASE` → cetak ALASAN JUJUR lalu exit 0 (SKIP).
//     SKIP bukan PASS: ia dilabeli SKIP di stdout dan di CF-LIVE-REPORT.json
//     (`status:"SKIP"`, `pass:null`), supaya tidak ada yang mengutipnya sebagai
//     bukti runtime.
//   - dengan `FIEZEL_CF_LIVE_BASE` → jalan sungguhan dan MERAH kalau kontraknya
//     patah. Tidak ada mode "jalan tapi maafkan".
// Tidak ada nilai bawaan berupa URL: menaruh `|| 'https://api.fiezel.my.id'` di
// sini akan membuat CI publik menembak produksi pada setiap push. Dilarang, dan
// `tests/no-network-test.js` ikut memeriksanya.
//
// ==========================================================================
// HUBUNGAN DENGAN `tests/no-network-test.js`
// ==========================================================================
// Berkas ini SATU-SATUNYA gerbang yang sengaja boleh menyentuh host non-loopback.
// Ia tidak memerlukan SOCKET_ALLOWLIST (ia tidak me-`require` modul socket dan
// tidak memuat URL literal), tapi lolos-diam-diam dari pemindai teks adalah
// justru yang tidak boleh terjadi. Karena itu namanya didaftarkan eksplisit di
// `tests/no-network-test.js` sebagai kelas `ENV_GATED_LIVE_ALLOWLIST`, dengan syarat
// yang diperiksa di sana: harus membaca `FIEZEL_CF_LIVE_BASE`, harus exit 0
// tanpa env itu, dan tidak boleh punya URL remote bawaan.
//
// ==========================================================================
// KEBENARANNYA DIBUKTIKAN OLEH `tests/cf-live-selftest.js`
// ==========================================================================
// Gerbang yang tidak pernah dijalankan terhadap jawaban SALAH adalah gerbang
// yang belum terbukti hidup. `tests/cf-live-selftest.js` menyalakan server HTTP
// loopback yang meniru jawaban benar DAN 17 variasi jawaban salah (cookie tanpa
// HttpOnly, protocol 1.6, CORS memantulkan origin asing, /api/quota 200 tanpa
// cookie, dst), lalu membuktikan gerbang ini LULUS pada yang benar dan GAGAL
// pada setiap variasi — dengan id assert yang tepat, bukan sekadar exit 1.
//
// Nol dependency. Nol berkas temporer di working tree.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const ENV_BASE = 'FIEZEL_CF_LIVE_BASE';
const ENV_ORIGIN = 'FIEZEL_CF_LIVE_ORIGIN';
const ENV_COOKIE_DOMAIN = 'FIEZEL_CF_LIVE_COOKIE_DOMAIN';
const ENV_REPORT = 'FIEZEL_CF_LIVE_REPORT';

const PROTOCOL_EXPECTED = '1.7';
// Origin sah dan domain cookie sengaja punya nilai bawaan PRODUKSI (bukan URL
// bawaan untuk base): keduanya cuma dipakai sebagai NILAI YANG DIHARAPKAN di
// dalam assert, bukan sebagai alamat yang ditembak. Keduanya bisa ditimpa untuk
// deploy sementara di *.workers.dev.
const DEFAULT_ORIGIN = 'https://fiezel.my.id';
const DEFAULT_COOKIE_DOMAIN = 'fiezel.my.id';
// Origin yang HARUS ditolak. Bukan domain yang bisa dibeli orang secara nyata:
// `.example` dijamin RFC 2606 tidak pernah teregistrasi.
/* =======================================================================================
 * KEADAAN FLAG PRODUKSI YANG DIDEKLARASIKAN
 * =====================================================================================
 * Sampai m025-207 blok 2 gerbang ini berbunyi "semua flag klien masih false (FEATURE_* off)".
 * Itu benar ketika berkas ini ditulis — peluncuran Cloudflare masih gelap dan alamat Worker-nya
 * belum dibuka. Sejak 28 Agustus 2026 repo sendiri meninggalkan asumsi itu, di dua tempat yang
 * dapat diperiksa: `docs/MASTER-BROADCAST.md` §"Keadaan 28 Ags 18:20 — AI Cloudflare HIDUP"
 * (`flags.cfAiEnabled=true`, 47 assert, 5 panggilan model) dan commit `692bc5c`
 * "nyalakan ANALYTICS_ENABLED" (`workers/api/wrangler.toml` → `ANALYTICS_ENABLED = "on"`).
 * Bahkan `wrangler.toml:52` menuliskannya sendiri: "Baris ini dulu berbunyi SEMUA MATI — sudah
 * tidak benar sejak FEATURE_AI dinyalakan."
 *
 * Jadi gerbangnya yang basi, bukan produksinya yang menyimpang. Yang DILARANG di sini adalah
 * melonggarkan assert supaya hijau (MASTER-BROADCAST §"Yang TIDAK boleh dilakukan" butir 3).
 * Karena itu asumsi lama diganti dengan properti yang LEBIH KETAT, bukan yang lebih longgar:
 *
 *   lama : "tidak ada flag yang menyala"      -> hanya bisa melihat satu arah, dan mati sendiri
 *                                                begitu owner menyalakan fitur pertamanya.
 *   baru : "setiap flag sama persis dengan     -> melihat KEDUA arah (fitur menyala tanpa izin
 *          keadaan yang dideklarasikan repo"      DAN fitur yang seharusnya hidup ternyata mati),
 *                                                plus flag BARU yang belum pernah diputuskan.
 *
 * Nilainya sengaja HANYA bisa diubah dengan mengedit repo — tidak ada env override. Flag hidup
 * di KV `cfg:flags` yang disetel owner dari dashboard, jadi tanpa aturan ini sebuah fitur bisa
 * menyala di produksi tanpa satu baris pun tercatat di mana saja. Dengan aturan ini, setiap
 * pemutaran sakelar wajib meninggalkan jejak di sini, berikut alasannya.
 */
const FLAGS_DIHARAPKAN = Object.freeze({
  cfApiEnabled: true,       // docs/MASTER-BROADCAST.md:97 — gateway CF hidup untuk /api/*
  cfIdentityEnabled: true,  // docs/MASTER-BROADCAST.md:97 — identitas cookie hidup
  cfQuotaEnabled: true,     // docs/MASTER-BROADCAST.md:97 — kuota server hidup
  cfAiEnabled: true,        // docs/MASTER-BROADCAST.md:124 — dinyalakan 28 Ags 18:20, terverifikasi
  cfTtsEnabled: false,      // docs/MASTER-BROADCAST.md:127 — TETAP mati; korpus penuh +-US$9,07
  cfAnalyticsEnabled: true, // commit 692bc5c + wrangler.toml ANALYTICS_ENABLED="on"
  cfSocialEnabled: false    // SLOT 7 belum diputuskan owner
});
const KILL_DIHARAPKAN = Object.freeze({
  ai: true,        // sepadan dengan cfAiEnabled
  tts: false,      // sepadan dengan cfTtsEnabled
  coach: false,    // belum diputuskan owner
  analytics: true, // sepadan dengan cfAnalyticsEnabled
  social: false    // sepadan dengan cfSocialEnabled
});

const FOREIGN_ORIGIN = 'https://evil.example';
const REQUEST_TIMEOUT_MS = 15000;

const wantReport = process.argv.slice(2).includes('--report');
const reportPath = process.env[ENV_REPORT]
  ? path.resolve(process.env[ENV_REPORT])
  : path.join(__fzRoot, 'CF-LIVE-REPORT.json');

const rawBase = String(process.env[ENV_BASE] || '').trim();
const expectedOrigin = String(process.env[ENV_ORIGIN] || DEFAULT_ORIGIN).trim();
const expectedCookieDomain = String(process.env[ENV_COOKIE_DOMAIN] || DEFAULT_COOKIE_DOMAIN).trim();

/* =======================================================================================
 * Pencatat assert
 * ===================================================================================== */
const checks = [];
const notes = [];
let failed = false;
function check(id, name, ok, details) {
  checks.push({ id, name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
}

function writeReport(payload) {
  if (!wantReport) return;
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2) + '\n');
  console.log('CF-LIVE-REPORT ditulis: ' + reportPath);
}

/* =======================================================================================
 * SKIP — jalur bawaan di CI
 * ===================================================================================== */
if (!rawBase) {
  const reason = [
    'FIEZEL cf-live contract gate: SKIP',
    '',
    'Alasan jujur (bukan PASS):',
    '  ' + ENV_BASE + ' tidak diset, jadi tidak ada Worker hidup untuk diuji.',
    '  Gerbang ini menguji Worker `fiezel-api` lewat HTTP NYATA. Tanpa base URL ia',
    '  tidak menguji apa pun, dan ia TIDAK BOLEH memerahkan CI karena itu.',
    '',
    'Yang BELUM terbukti selama gerbang ini SKIP:',
    '  - rute benar-benar terpasang di edge Cloudflare (yang terbukti baru routernya di Node)',
    '  - `Set-Cookie fz_id` lolos utuh melewati Cloudflare (HttpOnly/Secure/SameSite/Domain/Max-Age)',
    '  - `ALLOWED_ORIGINS` dan `COOKIE_DOMAIN` di wrangler.toml sudah ter-deploy dengan benar',
    '  - cap byte ditegakkan di edge sebelum body dibaca',
    '  Semua di atas saat ini hanya diuji di atas stub (reports/exec-wiring.md §6).',
    '',
    'Cara menjalankannya sungguhan:',
    '  ' + ENV_BASE + '=https://api.fiezel.my.id node tests/cf-live-contract-test.js --report',
    '  (atau alamat *.workers.dev sementara — lihat tools/cf-live-runner.md)'
  ].join('\n');
  console.log(reason);
  writeReport({
    schema: 'fiezel-cf-live-v1',
    status: 'SKIP',
    pass: null,
    base: null,
    reason: ENV_BASE + ' tidak diset',
    generatedAt: new Date().toISOString(),
    counts: { pass: 0, fail: 0, skipped: 1 },
    checks: []
  });
  process.exit(0);
}

/* =======================================================================================
 * Base URL wajib sah. Env yang diset TAPI salah = MERAH, bukan SKIP:
 * owner sudah menyatakan niat menguji, jadi typo harus terlihat.
 * ===================================================================================== */
let baseUrl = null;
try {
  const parsed = new URL(rawBase);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('skema harus http/https');
  baseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, '');
} catch (err) {
  console.error('FIEZEL cf-live contract gate: FAIL');
  console.error('  ' + ENV_BASE + ' diset tetapi bukan URL yang sah: ' + JSON.stringify(rawBase));
  console.error('  ' + String(err && err.message ? err.message : err));
  writeReport({
    schema: 'fiezel-cf-live-v1',
    status: 'FAIL',
    pass: false,
    base: rawBase,
    reason: 'base_url_invalid',
    generatedAt: new Date().toISOString(),
    counts: { pass: 0, fail: 1, skipped: 0 },
    checks: [{ id: 'base-url-valid', name: ENV_BASE + ' adalah URL http/https yang sah', status: 'FAIL', details: rawBase }]
  });
  process.exit(1);
}

/* =======================================================================================
 * Transport
 * ===================================================================================== */
const observed = []; // dipakai assert agregat "tak ada 5xx di mana pun"

async function call(method, routePath, opt = {}) {
  const url = baseUrl + routePath;
  const headers = Object.assign({ accept: 'application/json' }, opt.headers || {});
  const init = {
    method,
    headers,
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  };
  if (opt.body !== undefined) {
    init.body = opt.body;
    if (!headers['content-type']) headers['content-type'] = 'application/json';
  }
  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    const failure = {
      ok: false,
      transportError: String(err && err.message ? err.message : err),
      status: 0,
      method,
      path: routePath,
      headers: new Map(),
      setCookie: [],
      text: '',
      json: null
    };
    observed.push({ method, path: routePath, status: 0, note: failure.transportError });
    return failure;
  }
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  const setCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  observed.push({ method, path: routePath, status: response.status, origin: headers.origin || null });
  return {
    ok: true,
    transportError: null,
    status: response.status,
    method,
    path: routePath,
    header: name => response.headers.get(name),
    setCookie,
    text,
    json
  };
}

/* =======================================================================================
 * Pembantu cookie — parsing atribut Set-Cookie tanpa dependency.
 * ===================================================================================== */
function pickCookie(setCookieList, name) {
  for (const line of setCookieList) {
    if (new RegExp('^\\s*' + name + '=').test(line)) return line;
  }
  return null;
}
function cookieAttrs(line) {
  const out = { flags: new Set(), values: {} };
  for (const part of String(line).split(';').slice(1)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) out.flags.add(trimmed.toLowerCase());
    else out.values[trimmed.slice(0, eq).trim().toLowerCase()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

/* =======================================================================================
 * Assert
 * ===================================================================================== */
async function run() {
  /* --- 1. /health ------------------------------------------------------------------- */
  const health = await call('GET', '/health');
  check('health-reachable', '/health bisa dihubungi (tanpa galat transport)',
    health.ok, health.transportError || 'ok');
  // "bukan 404" ditulis sebagai assert TERSENDIRI, bukan disimpulkan dari 200:
  // 404 di sini berarti rute tidak terpasang di edge, dan itu penyakit yang
  // berbeda dari 500 (terpasang tapi rusak). Keduanya harus punya nama sendiri
  // supaya laporan bisa dibaca tanpa menebak.
  check('health-not-404', '/health BUKAN 404 (rute terpasang di edge)',
    health.status !== 404, 'status=' + health.status);
  check('health-200', '/health mengembalikan 200', health.status === 200, 'status=' + health.status);
  check('health-json', '/health mengembalikan JSON yang bisa di-parse',
    health.json !== null && typeof health.json === 'object', health.text.slice(0, 120));
  check('health-protocol', '/health mengembalikan protocol="' + PROTOCOL_EXPECTED + '"',
    !!health.json && health.json.protocol === PROTOCOL_EXPECTED,
    'protocol=' + JSON.stringify(health.json && health.json.protocol));

  /* --- 2. /api/config: keadaan flag SESUAI YANG DIDEKLARASIKAN ---------------------- */
  const config = await call('GET', '/api/config');
  check('config-not-404', '/api/config BUKAN 404', config.status !== 404, 'status=' + config.status);
  check('config-200', '/api/config mengembalikan 200', config.status === 200, 'status=' + config.status);
  const flags = config.json && config.json.flags && typeof config.json.flags === 'object' ? config.json.flags : null;
  const kill = config.json && config.json.enabled && typeof config.json.enabled === 'object' ? config.json.enabled : null;
  // Non-vakum lebih dulu: `flags` kosong akan membuat pencocokan apa pun benar
  // secara hampa. Objek kosong = gerbang merah, bukan gerbang senang.
  check('config-flags-present', '/api/config memuat objek `flags` yang tidak kosong',
    !!flags && Object.keys(flags).length > 0, flags ? Object.keys(flags).join(',') : '(tidak ada)');

  // Kunci yang muncul di produksi tetapi tidak dideklarasikan di atas adalah flag
  // yang belum pernah diputuskan siapa pun. Ia MERAH, bukan diabaikan: flag baru
  // yang lolos diam-diam persis cara sebuah fitur menyala tanpa ada yang tahu.
  const flagsAsing = flags ? Object.keys(flags).filter(k => !(k in FLAGS_DIHARAPKAN)) : [];
  check('config-flags-declared', 'Setiap flag klien produksi sudah dideklarasikan di gerbang ini',
    flagsAsing.length === 0, flagsAsing.length ? 'tak dideklarasikan: ' + flagsAsing.join(',') : 'semua dikenal');
  const flagsBeda = flags
    ? Object.keys(FLAGS_DIHARAPKAN).filter(k => flags[k] !== FLAGS_DIHARAPKAN[k])
        .map(k => k + '=' + JSON.stringify(flags[k]) + ' (diharapkan ' + FLAGS_DIHARAPKAN[k] + ')')
    : ['(tidak ada objek flags)'];
  check('config-flags-match', 'Setiap flag klien sama dengan keadaan yang dideklarasikan repo',
    !!flags && flagsBeda.length === 0, flagsBeda.length ? 'selisih: ' + flagsBeda.join(' | ') : 'sepadan');

  const killAsing = kill ? Object.keys(kill).filter(k => !(k in KILL_DIHARAPKAN)) : [];
  check('config-killswitch-declared', 'Setiap kill switch produksi sudah dideklarasikan di gerbang ini',
    killAsing.length === 0, killAsing.length ? 'tak dideklarasikan: ' + killAsing.join(',') : 'semua dikenal');
  const killBeda = kill
    ? Object.keys(KILL_DIHARAPKAN).filter(k => kill[k] !== KILL_DIHARAPKAN[k])
        .map(k => k + '=' + JSON.stringify(kill[k]) + ' (diharapkan ' + KILL_DIHARAPKAN[k] + ')')
    : ['(tidak ada objek enabled)'];
  check('config-killswitch-match', 'Setiap kill switch sama dengan keadaan yang dideklarasikan repo',
    !!kill && killBeda.length === 0, killBeda.length ? 'selisih: ' + killBeda.join(' | ') : 'sepadan');
  check('config-protocol', '/api/config mengembalikan protocol="' + PROTOCOL_EXPECTED + '"',
    !!config.json && config.json.protocol === PROTOCOL_EXPECTED,
    'protocol=' + JSON.stringify(config.json && config.json.protocol));

  /* --- 3. Rute berkuota/identitas menolak permintaan tanpa cookie -------------------- */
  const quota = await call('GET', '/api/quota');
  check('quota-not-404', '/api/quota BUKAN 404 (rute kuota terpasang)',
    quota.status !== 404, 'status=' + quota.status);
  check('quota-401', '/api/quota mengembalikan 401 tanpa cookie',
    quota.status === 401, 'status=' + quota.status);
  const me = await call('GET', '/api/user/me');
  check('me-not-404', '/api/user/me BUKAN 404', me.status !== 404, 'status=' + me.status);
  check('me-401', '/api/user/me mengembalikan 401 tanpa cookie',
    me.status === 401, 'status=' + me.status);

  /* --- 4. POST /api/auth/anon + bentuk cookie ---------------------------------------- */
  // Permintaan ini juga menjadi KONTROL POSITIF untuk cap byte di butir 6:
  // body kecil harus 200, jadi 413 di sana tidak bisa datang dari "semua POST
  // ditolak".
  const anon = await call('POST', '/api/auth/anon', { body: '{}' });
  check('anon-200', 'POST /api/auth/anon mengembalikan 200', anon.status === 200, 'status=' + anon.status);
  const cookieLine = pickCookie(anon.setCookie, 'fz_id');
  check('cookie-present', 'POST /api/auth/anon memasang Set-Cookie fz_id',
    !!cookieLine, cookieLine ? 'ada' : 'set-cookie=' + JSON.stringify(anon.setCookie));
  const attrs = cookieLine ? cookieAttrs(cookieLine) : { flags: new Set(), values: {} };
  const redacted = cookieLine ? cookieLine.replace(/^([^=]+)=[^;]*/, '$1=<disunting>') : '(tidak ada)';
  check('cookie-httponly', 'Cookie fz_id memuat HttpOnly',
    attrs.flags.has('httponly'), redacted);
  check('cookie-secure', 'Cookie fz_id memuat Secure',
    attrs.flags.has('secure'), redacted);
  check('cookie-samesite-lax', 'Cookie fz_id memuat SameSite=Lax',
    String(attrs.values.samesite || '').toLowerCase() === 'lax', 'SameSite=' + (attrs.values.samesite || '(tidak ada)'));
  check('cookie-domain', 'Cookie fz_id memuat Domain=' + expectedCookieDomain,
    String(attrs.values.domain || '').replace(/^\./, '').toLowerCase() === expectedCookieDomain.toLowerCase(),
    'Domain=' + (attrs.values.domain || '(tidak ada — cookie jadi host-only dan identitas patah antar subdomain)'));
  const maxAge = Number(attrs.values['max-age']);
  check('cookie-max-age', 'Cookie fz_id memuat Max-Age yang positif',
    Object.prototype.hasOwnProperty.call(attrs.values, 'max-age') && Number.isFinite(maxAge) && maxAge > 0,
    'Max-Age=' + (attrs.values['max-age'] === undefined ? '(tidak ada)' : attrs.values['max-age']));
  // Nilai cookie TIDAK pernah dicetak ke laporan: ia identitas bertanda HMAC.
  // Yang dicatat hanya bentuk atributnya.

  /* --- 5. CORS ---------------------------------------------------------------------- */
  // Kontrol POSITIF lebih dulu. Tanpa ini, "origin asing tidak mendapat
  // access-control-allow-origin" juga benar untuk Worker yang tidak pernah
  // memasang header CORS untuk siapa pun — yaitu Worker yang patah bagi murid.
  const corsOk = await call('GET', '/health', { headers: { origin: expectedOrigin } });
  const acaoOk = corsOk.ok ? corsOk.header('access-control-allow-origin') : null;
  check('cors-allowed-origin', 'Origin sah (' + expectedOrigin + ') MENDAPAT access-control-allow-origin yang tepat',
    acaoOk === expectedOrigin, 'access-control-allow-origin=' + JSON.stringify(acaoOk));
  check('cors-vary-origin', 'Respons ber-CORS memuat Vary: Origin (cache bersama tidak boleh mencampur origin)',
    /origin/i.test(String(corsOk.ok ? corsOk.header('vary') : '')), 'vary=' + JSON.stringify(corsOk.ok ? corsOk.header('vary') : null));

  const corsForeign = await call('GET', '/health', { headers: { origin: FOREIGN_ORIGIN } });
  const acaoForeign = corsForeign.ok ? corsForeign.header('access-control-allow-origin') : null;
  check('cors-foreign-no-acao', 'Origin asing (' + FOREIGN_ORIGIN + ') TIDAK mendapat access-control-allow-origin',
    acaoForeign === null || acaoForeign === undefined,
    'access-control-allow-origin=' + JSON.stringify(acaoForeign));
  check('cors-foreign-not-wildcard', 'Origin asing tidak dijawab dengan wildcard `*` (ilegal bersama credentials)',
    acaoForeign !== '*', 'access-control-allow-origin=' + JSON.stringify(acaoForeign));
  check('cors-foreign-rejected', 'Origin asing ditolak 403 oleh gerbang origin',
    corsForeign.status === 403, 'status=' + corsForeign.status);

  /* --- 6. Cap byte ------------------------------------------------------------------ */
  // Cap `/api/auth/anon` = 512 byte (workers/api/schema.js BYTE_LIMITS), jadi
  // 2 KB harus ditolak 413 — dan ditolak TANPA membaca body (mw-guard memeriksa
  // Content-Length lebih dulu). Kontrol positifnya sudah ada di butir 4.
  const oversize = JSON.stringify({ pad: 'x'.repeat(2000) });
  const capped = await call('POST', '/api/auth/anon', { body: oversize });
  check('byte-cap-rejected', 'Permintaan melebihi cap byte DITOLAK (bukan diterima)',
    capped.status >= 400 && capped.status < 500, 'status=' + capped.status + ' bytes=' + oversize.length);
  check('byte-cap-413', 'Penolakan cap byte memakai 413, bukan 400/500',
    capped.status === 413, 'status=' + capped.status);

  /* --- 7. Endpoint tak dikenal ------------------------------------------------------ */
  // 500 di sini berarti ada jalur galat yang tidak tertangani di router — persis
  // jenis kebocoran yang menyeret pesan upstream ke murid.
  const unknown = await call('GET', '/api/tidak-ada-rute-ini-' + Date.now().toString(36));
  check('unknown-4xx', 'Endpoint tak dikenal mengembalikan 404/403',
    unknown.status === 404 || unknown.status === 403, 'status=' + unknown.status);
  check('unknown-not-500', 'Endpoint tak dikenal BUKAN 5xx',
    unknown.status < 500, 'status=' + unknown.status);

  /* --- 8. Agregat: nol 5xx di seluruh percakapan ------------------------------------ */
  const fivex = observed.filter(o => o.status >= 500);
  check('no-5xx-anywhere', 'Tak ada satu pun respons 5xx di seluruh percakapan gerbang ini',
    fivex.length === 0, fivex.map(o => `${o.method} ${o.path} → ${o.status}`).join(' | ') || '0');
  const transportErrors = observed.filter(o => o.status === 0);
  check('no-transport-error', 'Tak ada galat transport (DNS/TLS/timeout) ke Worker',
    transportErrors.length === 0, transportErrors.map(o => `${o.method} ${o.path}: ${o.note}`).join(' | ') || '0');

  notes.push('Base yang diuji: ' + baseUrl);
  notes.push('Origin sah yang diharapkan: ' + expectedOrigin + ' (timpa dengan ' + ENV_ORIGIN + ')');
  notes.push('Domain cookie yang diharapkan: ' + expectedCookieDomain + ' (timpa dengan ' + ENV_COOKIE_DOMAIN + ')');
  notes.push('Gerbang ini TIDAK menguji kuota 25/26, cache TTS, atau cron: ketiganya menulis state '
    + 'nyata pada database murid. Buktinya tetap di tests/cf-wiring-test.js di atas stub, dan itu batas '
    + 'kejujuran yang tetap terbuka sampai owner menyediakan lingkungan staging terpisah.');

  const counts = {
    pass: checks.filter(c => c.status === 'PASS').length,
    fail: checks.filter(c => c.status === 'FAIL').length,
    skipped: 0
  };
  writeReport({
    schema: 'fiezel-cf-live-v1',
    status: failed ? 'FAIL' : 'PASS',
    pass: !failed,
    base: baseUrl,
    expectedOrigin,
    expectedCookieDomain,
    protocolExpected: PROTOCOL_EXPECTED,
    generatedAt: new Date().toISOString(),
    counts,
    notes,
    requests: observed,
    checks
  });

  for (const c of checks) console.log(`[${c.status}] ${c.id} — ${c.name} :: ${c.details}`);
  for (const n of notes) console.log('catatan: ' + n);
  console.log(failed
    ? `FIEZEL cf-live contract gate: FAIL (${counts.fail} dari ${counts.pass + counts.fail}) base=${baseUrl}`
    : `FIEZEL cf-live contract gate: PASS (${counts.pass} assert) base=${baseUrl}`);
  if (failed) process.exitCode = 1;
}

run().catch(err => {
  // Galat tak terduga TIDAK boleh menjadi hijau. Ia juga tidak boleh menjadi
  // SKIP: env sudah diset, jadi seseorang memang meminta pengujian nyata.
  console.error('FIEZEL cf-live contract gate: ERROR — ' + String(err && err.stack ? err.stack : err));
  writeReport({
    schema: 'fiezel-cf-live-v1',
    status: 'ERROR',
    pass: false,
    base: baseUrl,
    generatedAt: new Date().toISOString(),
    error: String(err && err.message ? err.message : err),
    counts: {
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length + 1,
      skipped: 0
    },
    checks
  });
  process.exitCode = 1;
});
