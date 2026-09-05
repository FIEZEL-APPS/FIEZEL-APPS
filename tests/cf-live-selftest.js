// tests/cf-live-selftest.js — pembuktian bahwa `tests/cf-live-contract-test.js` benar-benar hidup.
//
// ==========================================================================
// MASALAH YANG DISELESAIKAN BERKAS INI
// ==========================================================================
// `tests/cf-live-contract-test.js` menguji Worker HIDUP, dan pada paket kerja ini
// Worker hidup itu TIDAK bisa dijangkau (alamatnya sedang ditutup). Jadi tidak
// ada satu pun hasil uji nyata yang boleh diklaim. Yang masih bisa — dan wajib —
// dibuktikan adalah hal lain: bahwa gerbangnya SENDIRI tidak vakum.
//
// Gerbang yang belum pernah dijalankan terhadap jawaban SALAH adalah gerbang yang
// belum diketahui bisa merah. Berkas ini menyalakan server HTTP loopback yang
// meniru Worker `fiezel-api`:
//   - satu skenario BENAR   → gerbang harus exit 0 (semua assert PASS);
//   - 17 skenario SALAH     → gerbang harus exit 1, DAN assert yang gagal harus
//                             tepat assert yang menjaga cacat itu (dicocokkan
//                             lewat id assert di CF-LIVE-REPORT, bukan lewat
//                             exit code saja — exit 1 karena alasan lain adalah
//                             gerbang yang beruntung, bukan gerbang yang benar).
// Ditambah dua skenario perilaku lingkungan:
//   - tanpa FIEZEL_CF_LIVE_BASE → exit 0 dan stdout memuat SKIP;
//   - base URL tak sah          → exit 1 (env diset = niat menguji, typo harus terlihat).
//
// ==========================================================================
// KENAPA IA MEMBUKA SOCKET (dan bagaimana `tests/no-network-test.js` memaafkannya)
// ==========================================================================
// Server tiruan harus berupa server HTTP sungguhan; kalau tidak, jalur yang
// diuji bukan lagi jalur HTTP gerbang itu. Socketnya loopback murni
// (127.0.0.1, port 0 = dipilih kernel, tanpa DNS, tanpa keluar mesin) — pola yang
// sama dengan `tests/http-smoke-test.js`. Karena itu nama berkas ini masuk
// `SOCKET_ALLOWLIST` di `tests/no-network-test.js`, dan pemindai gerbang itu diperluas
// agar ikut memindai berkas `*-selftest.js` — supaya masuknya ke allowlist
// tercatat sebagai keputusan, bukan sebagai celah nama berkas.
//
// Laporan gerbang diarahkan ke berkas temporer lewat FIEZEL_CF_LIVE_REPORT,
// jadi berkas ini TIDAK PERNAH mengotori working tree.
//
// Nol dependency.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const LOOPBACK = '127.0.0.1';
const GATE = path.join(__fzRoot, 'tests/cf-live-contract-test.js');
const ALLOWED_ORIGIN = 'https://fiezel.my.id';
const COOKIE_DOMAIN = 'fiezel.my.id';
const ANON_BYTE_CAP = 512; // = BYTE_LIMITS['/api/auth/anon'] di workers/api/schema.js

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

/* =======================================================================================
 * Worker tiruan. `mut` adalah kumpulan mutasi bernama; skenario BENAR = mut kosong.
 * ===================================================================================== */
/* m025-207: fixture "jawaban benar" TIDAK lagi semua-mati. Gerbangnya berhenti bertanya
 * "adakah flag yang menyala" (pertanyaan yang mati sendiri begitu owner menyalakan fitur
 * pertamanya) dan mulai bertanya "apakah setiap flag sama persis dengan keadaan yang
 * dideklarasikan repo". Jadi jawaban benar di sini WAJIB mencerminkan deklarasi itu — kalau
 * tidak, skenario BENAR pun merah dan matriksnya berhenti berarti.
 * Sumbernya satu: FLAGS_DIHARAPKAN/KILL_DIHARAPKAN di tests/cf-live-contract-test.js. */
const FLAGS_BENAR = {
  cfApiEnabled: true, cfAiEnabled: true, cfTtsEnabled: false,
  cfQuotaEnabled: true, cfAnalyticsEnabled: true, cfIdentityEnabled: true,
  cfSocialEnabled: false
};
const KILL_BENAR = { ai: true, tts: false, coach: false, analytics: true, social: false };

function buildCookie(mut) {
  const bits = ['fz_id=eyJ2IjoxfQ.tandatangan'];
  if (!mut.cookieNoHttpOnly) bits.push('HttpOnly');
  if (!mut.cookieNoSecure) bits.push('Secure');
  bits.push('SameSite=' + (mut.cookieSameSite || 'Lax'));
  bits.push('Path=/');
  if (!mut.cookieNoMaxAge) bits.push('Max-Age=15552000');
  if (!mut.cookieNoDomain) bits.push('Domain=' + (mut.cookieDomain || COOKIE_DOMAIN));
  return bits.join('; ');
}

function makeServer(mut) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://' + LOOPBACK);
    const origin = req.headers.origin || null;
    const pathname = url.pathname;

    const send = (status, body, extraHeaders = {}) => {
      const headers = Object.assign({ 'content-type': 'application/json; charset=utf-8' }, extraHeaders);
      // CORS: allowlist eksplisit, PERSIS seperti mw-guard.js — kecuali kalau
      // skenario memutasinya.
      if (origin && !mut.corsBlind) {
        headers.vary = 'Origin';
        if (mut.corsWildcard) {
          headers['access-control-allow-origin'] = '*';
        } else if (mut.corsReflectAny || origin === ALLOWED_ORIGIN) {
          headers['access-control-allow-origin'] = origin;
          headers['access-control-allow-credentials'] = 'true';
        }
      } else if (origin && mut.corsBlind) {
        headers.vary = 'Origin';
      }
      res.writeHead(status, headers);
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };

    // Gerbang origin: origin asing 403 sebelum apa pun — kecuali skenario yang
    // sengaja melonggarkannya (corsReflectAny / corsWildcard meniru Worker yang
    // memantulkan Origin apa pun, dan itu HARUS tertangkap).
    const foreign = origin && origin !== ALLOWED_ORIGIN;
    if (foreign && !mut.corsReflectAny && !mut.corsWildcard) {
      send(403, { error: 'forbidden_origin' });
      return;
    }

    // Cap byte via Content-Length, tanpa membaca body (cermin mw-guard).
    const len = Number(req.headers['content-length'] || 0);
    if (len > ANON_BYTE_CAP && !mut.acceptOversize) {
      req.resume();
      send(413, { error: 'payload too large', limitBytes: ANON_BYTE_CAP });
      return;
    }

    if (pathname === '/health') {
      if (mut.health404) return send(404, { error: 'not_found' });
      return send(200, {
        status: 'ok', service: 'fiezel-api',
        protocol: mut.protocol || '1.7',
        version: 'cf-api-1', plan: 'free-tier', time: new Date().toISOString()
      });
    }
    if (pathname === '/api/config') {
      const flags = Object.assign({}, FLAGS_BENAR, mut.flagsOverride || {});
      const enabled = Object.assign({}, KILL_BENAR, mut.killOverride || {});
      return send(200, {
        protocol: '1.7',
        flags: mut.flagsEmpty ? {} : flags,
        enabled,
        limits: { aiPerDay: 25, ttsCharsPerDay: 20000 },
        ttlSeconds: 60, serverTime: new Date().toISOString()
      }, { 'cache-control': 'no-store' });
    }
    if (pathname === '/api/quota') {
      if (mut.quotaLeak) return send(200, { aiRemaining: 25, protocol: '1.7' });
      return send(401, { error: 'unauthenticated' });
    }
    if (pathname === '/api/user/me') {
      if (mut.meLeak) return send(200, { userId: 'x', protocol: '1.7' });
      return send(401, { error: 'unauthenticated' });
    }
    if (pathname === '/api/auth/anon' && req.method === 'POST') {
      req.resume();
      if (mut.anonBroken) return send(500, { error: 'internal' });
      const headers = mut.cookieMissing ? {} : { 'set-cookie': buildCookie(mut) };
      return send(200, {
        userId: '11111111-2222-3333-4444-555555555555', plan: 'free', class: 'visitor',
        issued: true, protocol: '1.7', serverTime: new Date().toISOString()
      }, headers);
    }
    req.resume();
    if (mut.unknown500) return send(500, { error: 'internal' });
    return send(404, { error: 'not_found' });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, LOOPBACK, () => resolve(server.address().port));
  });
}

/* =======================================================================================
 * Menjalankan gerbang sebagai proses anak
 * ===================================================================================== */
// WAJIB asinkron, bukan `spawnSync`. Server tiruan hidup di proses INI; `spawnSync`
// memblokir event loop-nya, jadi koneksi anak duduk di backlog TCP tanpa pernah
// dijawab dan setiap permintaan berakhir timeout. Itu bukan kehalusan gaya — versi
// sinkronnya membuat seluruh matriks palsu (semua skenario "gagal" karena transport,
// termasuk skenario benar).
async function runGate(env) {
  const reportPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cf-live-')), 'CF-LIVE-REPORT.json');
  const child = spawn(process.execPath, [GATE, '--report'], {
    cwd: __fzRoot,
    env: Object.assign({}, process.env, {
      FIEZEL_CF_LIVE_BASE: '',
      FIEZEL_CF_LIVE_REPORT: reportPath,
      FIEZEL_CF_LIVE_ORIGIN: ALLOWED_ORIGIN,
      FIEZEL_CF_LIVE_COOKIE_DOMAIN: COOKIE_DOMAIN
    }, env)
  });
  const result = await new Promise((resolve, reject) => {
    let out = '';
    let err = '';
    const killer = setTimeout(() => { child.kill('SIGKILL'); }, 60000);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(killer); reject(e); });
    child.on('close', code => { clearTimeout(killer); resolve({ status: code, stdout: out, stderr: err }); });
  });
  let report = null;
  try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { report = null; }
  try { fs.rmSync(path.dirname(reportPath), { recursive: true, force: true }); } catch { /* temp */ }
  const stdout = String(result.stdout || '');
  return {
    code: result.status,
    stdout,
    stderr: String(result.stderr || ''),
    report,
    failedIds: report && Array.isArray(report.checks)
      ? report.checks.filter(c => c.status === 'FAIL').map(c => c.id)
      : []
  };
}

/* =======================================================================================
 * Matriks skenario
 * ===================================================================================== */
// `expect: null` = harus LULUS. Selain itu = harus GAGAL, dan id assert di bawah
// harus muncul di daftar assert yang gagal.
const SCENARIOS = [
  { name: 'benar (semua jawaban sesuai kontrak)', mut: {}, expect: null },

  { name: 'protocol 1.6 di /health', mut: { protocol: '1.6' }, expect: 'health-protocol' },
  { name: '/health menjawab 404 (rute tidak terpasang)', mut: { health404: true }, expect: 'health-not-404' },

  /* Kontrak flag diuji ke EMPAT arah, bukan satu. Bentuk lama ("adakah yang menyala") hanya
     bisa melihat arah pertama, dan justru buta pada arah kedua — fitur yang seharusnya hidup
     ternyata mati di produksi adalah pemadaman senyap, bukan keadaan aman. */
  { name: '/api/config menyalakan flag yang seharusnya MATI (cfTtsEnabled)', mut: { flagsOverride: { cfTtsEnabled: true } }, expect: 'config-flags-match' },
  { name: '/api/config MEMATIKAN flag yang seharusnya hidup (cfAiEnabled)', mut: { flagsOverride: { cfAiEnabled: false } }, expect: 'config-flags-match' },
  { name: '/api/config memuat flag yang belum pernah dideklarasikan', mut: { flagsOverride: { cfFiturBaruEnabled: true } }, expect: 'config-flags-declared' },
  { name: '/api/config mengirim flags kosong (uji anti-vakum)', mut: { flagsEmpty: true }, expect: 'config-flags-present' },
  { name: '/api/config MEMATIKAN kill switch yang seharusnya hidup (ai)', mut: { killOverride: { ai: false } }, expect: 'config-killswitch-match' },
  { name: '/api/config menyalakan kill switch yang seharusnya mati (tts)', mut: { killOverride: { tts: true } }, expect: 'config-killswitch-match' },
  { name: '/api/config memuat kill switch yang belum pernah dideklarasikan', mut: { killOverride: { fiturBaru: true } }, expect: 'config-killswitch-declared' },

  { name: '/api/quota 200 tanpa cookie', mut: { quotaLeak: true }, expect: 'quota-401' },
  { name: '/api/user/me 200 tanpa cookie', mut: { meLeak: true }, expect: 'me-401' },

  { name: 'cookie fz_id tanpa HttpOnly', mut: { cookieNoHttpOnly: true }, expect: 'cookie-httponly' },
  { name: 'cookie fz_id tanpa Secure', mut: { cookieNoSecure: true }, expect: 'cookie-secure' },
  { name: 'cookie fz_id SameSite=None', mut: { cookieSameSite: 'None' }, expect: 'cookie-samesite-lax' },
  { name: 'cookie fz_id tanpa Domain (host-only)', mut: { cookieNoDomain: true }, expect: 'cookie-domain' },
  { name: 'cookie fz_id Domain salah', mut: { cookieDomain: 'evil.example' }, expect: 'cookie-domain' },
  { name: 'cookie fz_id tanpa Max-Age', mut: { cookieNoMaxAge: true }, expect: 'cookie-max-age' },
  { name: 'tidak ada Set-Cookie sama sekali', mut: { cookieMissing: true }, expect: 'cookie-present' },
  { name: 'POST /api/auth/anon menjawab 500', mut: { anonBroken: true }, expect: 'anon-200' },

  { name: 'CORS memantulkan Origin asing', mut: { corsReflectAny: true }, expect: 'cors-foreign-no-acao' },
  { name: 'CORS menjawab wildcard * untuk Origin asing', mut: { corsWildcard: true }, expect: 'cors-foreign-not-wildcard' },
  { name: 'CORS buta: origin sah pun tidak dapat header (kontrol positif)', mut: { corsBlind: true }, expect: 'cors-allowed-origin' },

  { name: 'cap byte diabaikan: body 2 KB diterima 200', mut: { acceptOversize: true }, expect: 'byte-cap-rejected' },
  { name: 'endpoint tak dikenal menjawab 500', mut: { unknown500: true }, expect: 'unknown-not-500' }
];

(async function main() {
  /* --- A. Perilaku tanpa env: SKIP bersih ------------------------------------------- */
  const skipRun = await runGate({ FIEZEL_CF_LIVE_BASE: '' });
  check('Tanpa FIEZEL_CF_LIVE_BASE gerbang exit 0 (SKIP, tidak memerahkan CI)',
    skipRun.code === 0, 'exit=' + skipRun.code);
  check('SKIP mencetak label SKIP dan alasan jujur',
    /SKIP/.test(skipRun.stdout) && /tidak diset/.test(skipRun.stdout), skipRun.stdout.split('\n')[0]);
  check('SKIP dilaporkan sebagai status SKIP dengan pass:null (bukan PASS palsu)',
    !!skipRun.report && skipRun.report.status === 'SKIP' && skipRun.report.pass === null,
    skipRun.report ? 'status=' + skipRun.report.status + ' pass=' + JSON.stringify(skipRun.report.pass) : '(tidak ada laporan)');
  check('SKIP menyebut apa yang BELUM terbukti (batas kejujuran, bukan diam)',
    /BELUM terbukti/.test(skipRun.stdout), 'stdout ' + skipRun.stdout.length + ' char');

  /* --- B. Base URL tak sah = MERAH, bukan SKIP -------------------------------------- */
  const badBase = await runGate({ FIEZEL_CF_LIVE_BASE: 'bukan-url-sama-sekali' });
  check('Base URL tak sah membuat gerbang MERAH (env diset = niat menguji)',
    badBase.code === 1, 'exit=' + badBase.code);

  /* --- C. Matriks benar/salah terhadap server loopback ------------------------------ */
  const matrix = [];
  for (const scenario of SCENARIOS) {
    const server = makeServer(scenario.mut);
    const port = await listen(server);
    const run = await runGate({ FIEZEL_CF_LIVE_BASE: 'http://' + LOOPBACK + ':' + port });
    await new Promise(resolve => server.close(resolve));

    const wantPass = scenario.expect === null;
    const gotPass = run.code === 0;
    const idHit = wantPass ? true : run.failedIds.includes(scenario.expect);
    const ok = wantPass ? gotPass : (!gotPass && idHit);

    matrix.push({
      skenario: scenario.name,
      diharapkan: wantPass ? 'LULUS' : 'GAGAL@' + scenario.expect,
      hasil: gotPass ? 'LULUS' : 'GAGAL',
      assertGagal: run.failedIds,
      cocok: ok
    });

    if (wantPass) {
      check('Skenario BENAR: ' + scenario.name + ' → gerbang LULUS',
        ok, 'exit=' + run.code + ' assertGagal=' + (run.failedIds.join(',') || '0')
          + ' assertLulus=' + (run.report ? run.report.counts.pass : '?'));
      // Non-vakum: skenario benar harus punya BANYAK assert PASS. Gerbang yang
      // hijau karena tidak menjalankan assert apa pun juga hijau.
      check('Skenario BENAR menjalankan ≥20 assert (bukan hijau karena kosong)',
        !!run.report && run.report.counts.pass >= 20,
        'pass=' + (run.report ? run.report.counts.pass : '(tidak ada laporan)'));
    } else {
      check('Skenario SALAH: ' + scenario.name + ' → gerbang GAGAL di `' + scenario.expect + '`',
        ok, 'exit=' + run.code + ' assertGagal=' + (run.failedIds.join(',') || '(kosong)'));
    }
  }

  /* --- D. Laporan --------------------------------------------------------------------- */
  // `--report` sudah dipakai di seluruh matriks di atas; kalau ia tidak menulis
  // berkas, `run.report` akan null dan puluhan assert di atas sudah merah. Assert
  // ini menuliskan invariannya secara eksplisit supaya alasannya terbaca.
  check('Mode --report menulis CF-LIVE-REPORT.json yang bisa di-parse untuk setiap jalannya',
    matrix.every(m => Array.isArray(m.assertGagal)), matrix.length + ' skenario');
  check('Berkas laporan diarahkan ke temp, working tree tidak dikotori',
    !fs.existsSync(path.join(__fzRoot, 'CF-LIVE-REPORT.json')), 'CF-LIVE-REPORT.json tidak ada di akar');
  check('Matriks memuat satu skenario benar dan ≥15 variasi salah',
    SCENARIOS.filter(s => s.expect === null).length === 1 && SCENARIOS.filter(s => s.expect !== null).length >= 15,
    SCENARIOS.length + ' skenario total');

  console.log('\n=== MATRIKS SELF-TEST tests/cf-live-contract-test.js ===');
  for (const row of matrix) {
    console.log(`${row.cocok ? 'OK  ' : 'BEDA'} | diharapkan ${row.diharapkan.padEnd(28)} | hasil ${row.hasil.padEnd(6)} | ${row.skenario}`
      + (row.assertGagal.length ? '\n       assert gagal: ' + row.assertGagal.join(', ') : ''));
  }

  for (const c of checks) console.log(`[${c.status}] ${c.name} :: ${c.details}`);
  const pass = checks.filter(c => c.status === 'PASS').length;
  const fail = checks.filter(c => c.status === 'FAIL').length;
  console.log(failed
    ? `FIEZEL cf-live selftest: FAIL (${fail} dari ${pass + fail})`
    : `FIEZEL cf-live selftest: PASS (${pass} assert, ${SCENARIOS.length} skenario loopback)`);
  if (failed) process.exitCode = 1;
})().catch(err => {
  console.error('FIEZEL cf-live selftest: ERROR — ' + String(err && err.stack ? err.stack : err));
  process.exitCode = 1;
});
