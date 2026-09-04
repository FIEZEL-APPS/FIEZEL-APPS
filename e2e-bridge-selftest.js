// e2e-bridge-selftest.js — pembuktian bahwa `tools/fiezel-e2e-bridge.mjs` bisa MERAH.
//
// ==========================================================================================
// MASALAH YANG DISELESAIKAN BERKAS INI
// ==========================================================================================
// `tools/fiezel-e2e-bridge.mjs` menjalankan Chromium sungguhan terhadap jembatan HIDUP. Hasil
// hijau dari gerbang seperti itu tidak berarti apa-apa sampai terbukti gerbangnya MERAH
// ketika aplikasi atau jembatannya salah. Berkas ini yang membuktikannya, seluruhnya di
// loopback:
//
//   - satu APLIKASI TIRUAN + JEMBATAN TIRUAN yang BENAR   → gerbang harus exit 0;
//   - 20 varian SALAH (cookie tanpa Domain, protocol 1.6, flag server diabaikan, kebocoran
//     saat flag mati, aplikasi menembak *.workers.dev, boot diblokir jawaban config, ...)
//     → gerbang harus exit 1, DAN assert yang gagal harus TEPAT assert yang menjaga cacat
//     itu (dicocokkan lewat id assert di laporan JSON, bukan lewat exit code saja: exit 1
//     karena alasan lain adalah gerbang yang beruntung, bukan gerbang yang benar).
//
// Ditambah dua perilaku lingkungan:
//   - tanpa FIEZEL_E2E_BRIDGE_BASE → exit 0 dan stdout memuat SKIP (CI tidak ditembakkan);
//   - base URL tak sah             → exit 1 (env diset = niat menguji, typo harus terlihat).
//
// ==========================================================================================
// APLIKASI TIRUAN, BUKAN APLIKASI SUNGGUHAN — DAN BATASNYA
// ==========================================================================================
// Yang diuji di sini adalah GERBANGNYA, bukan FIEZEL. Karena itu aplikasi tiruannya sengaja
// minimal: ia hanya memenuhi kontrak yang dijaga gerbang (`window.coreWorkerExec`, satu
// panggilan /api/config per boot, flag server menang, render lewat JS). Kalau aplikasi
// sungguhan melanggar salah satunya, gerbang yang sudah terbukti tajam di sini akan
// menangkapnya — dan itulah yang terjadi pada jalan hidup pertama (lihat
// reports/add-a5-e2e.md). Berkas ini TIDAK membuktikan apa pun tentang jembatan produksi.
//
// ==========================================================================================
// KENAPA IA MEMBUKA SOCKET (dan bagaimana `no-network-test.js` memaafkannya)
// ==========================================================================================
// Jembatan tiruan harus berupa server HTTPS sungguhan: browser sungguhan hanya mau menyimpan
// cookie `Secure` dari konteks aman, dan seluruh bukti terpenting gerbang ini adalah soal
// cookie. Socketnya loopback murni (127.0.0.1, port 0 = dipilih kernel). Nama semua host uji
// (`fiezel-e2e.test`, `api.fiezel-e2e.test`, bahkan alamat workers.dev tiruannya) DIPETAKAN ke
// loopback lewat `--host-resolver-rules`, jadi tidak ada satu byte pun keluar mesin dan tidak
// ada satu pun kueri DNS. Karena itu nama berkas ini masuk `SOCKET_ALLOWLIST` di
// `no-network-test.js` dengan alasan yang diperiksa, bukan dengan pelonggaran pemindai.
//
// Laporan gerbang diarahkan ke berkas temporer, jadi working tree tidak pernah dikotori.
//
// SKIP JUJUR: kalau `playwright`, biner Chromium, atau `openssl` tidak ada, berkas ini
// mencetak SKIP dan exit 0 — karena ketiadaan browser di runner BUKAN cacat produk. SKIP-nya
// menyebut apa yang jadi TIDAK terbukti.
//
// Nol dependency runtime di luar playwright (yang sengaja TIDAK masuk package.json: ia alat
// pengembangan, bukan bagian aplikasi yang dikirim ke murid).
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const { spawn, spawnSync } = require('node:child_process');

const LOOPBACK = '127.0.0.1';
const GATE = path.join(__dirname, 'tools', 'fiezel-e2e-bridge.mjs');
const APP_HOST = 'fiezel-e2e.test';
const BRIDGE_HOST = 'api.fiezel-e2e.test';
const WORKERS_HOST = 'fiezel-api-tiruan.workers.dev';
const COOKIE_VALUE = 'uji-e2e-selftest';
const PROTOCOL = '1.7';
const GATE_TIMEOUT_MS = 240000;

// Penyaring untuk PENGEMBANGAN saja: menjalankan sebagian matriks. Jalan yang disaring
// SELALU berakhir exit 1 dan diberi label MODE DEBUG - kalau tidak, seseorang (termasuk saya)
// akan memakainya untuk menghijaukan CI dengan satu skenario.
const CASE_FILTER = String(process.env.FIEZEL_E2E_SELFTEST_CASE || '').trim();

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};

/* =========================================================================================
 * 0. Dependensi — kalau tidak ada, SKIP jujur (bukan PASS, bukan merah palsu)
 * ======================================================================================= */
// Dicek dengan MENYALAKAN browsernya, bukan dengan menebak nama berkasnya. Versi pertama
// membaca `chromium.executablePath()` dan melaporkan "Chromium tidak terpasang" padahal
// gerbangnya berjalan mulus: Playwright headless memakai paket `chromium-headless-shell` yang
// alamatnya BUKAN executablePath(). Menebak lokasi biner = SKIP palsu, dan SKIP palsu jauh
// lebih berbahaya daripada merah.
async function missingDependency() {
  if (!fs.existsSync(GATE)) return 'berkas gerbang tidak ada: ' + GATE;
  let playwright = null;
  try { playwright = require('playwright'); } catch (error) { return 'modul playwright tidak bisa dimuat (' + String(error.message).slice(0, 120) + ')'; }
  const openssl = spawnSync('openssl', ['version'], { encoding: 'utf8' });
  if (openssl.status !== 0) return 'openssl tidak tersedia (dipakai membuat sertifikat loopback)';
  let browser = null;
  try {
    browser = await playwright.chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  } catch (error) {
    return 'Chromium tidak bisa dijalankan (' + String(error.message).split('\n')[0].slice(0, 160) + ')';
  }
  try { await browser.close(); } catch { /* biarkan */ }
  return '';
}

/* =========================================================================================
 * 1. Sertifikat loopback untuk jembatan tiruan
 * ======================================================================================= */
function makeCert(dir) {
  const key = path.join(dir, 'mock-key.pem');
  const cert = path.join(dir, 'mock-cert.pem');
  const san = [BRIDGE_HOST, WORKERS_HOST, APP_HOST, 'localhost'].map(h => 'DNS:' + h).join(',') + ',IP:127.0.0.1';
  const run = spawnSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '2',
    '-subj', '/CN=' + BRIDGE_HOST, '-addext', 'subjectAltName=' + san
  ], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error('openssl gagal: ' + String(run.stderr || '').slice(0, 300));
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

/* =========================================================================================
 * 2. Jembatan tiruan. `mut` = kumpulan mutasi bernama; BENAR = mut kosong.
 * ======================================================================================= */
function buildSetCookie(mut) {
  if (mut.cookieMissing) return null;
  const bits = ['fz_id=' + COOKIE_VALUE, 'Path=/', 'Max-Age=15552000'];
  if (!mut.cookieNoHttpOnly) bits.push('HttpOnly');
  bits.push('Secure');
  bits.push('SameSite=' + (mut.cookieSameSite || 'Lax'));
  if (!mut.cookieNoDomain) bits.push('Domain=' + (mut.cookieDomain || APP_HOST));
  return bits.join('; ');
}

function makeBridge(mut, tls) {
  // Hitungan permintaan PER SOCKET, dipakai mutasi `hopStall` untuk meniru cacat yang
  // benar-benar ditemukan di jembatan hidup: permintaan ke-3 pada satu koneksi menggantung.
  const perSocket = new WeakMap();
  const stalled = [];
  const server = https.createServer(tls, (request, response) => {
    const url = new URL(request.url, 'https://' + BRIDGE_HOST);
    const origin = request.headers.origin || '';
    const cookie = String(request.headers.cookie || '');
    const count = (perSocket.get(request.socket) || 0) + 1;
    perSocket.set(request.socket, count);

    const send = (status, body, extra) => {
      const headers = Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, extra || {});
      if (origin) {
        headers['access-control-allow-origin'] = origin;
        headers['access-control-allow-credentials'] = 'true';
        headers.vary = 'Origin';
      }
      response.writeHead(status, headers);
      response.end(typeof body === 'string' ? body : JSON.stringify(body));
    };

    if (request.method === 'OPTIONS') {
      return send(204, '', { 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' });
    }
    if (mut.hopStall && count >= 3) {
      // Sengaja TIDAK dijawab: inilah bentuk cacat yang harus membuat `bridge-hop-stable`
      // merah. Socketnya ditutup belakangan supaya proses tidak tergantung selamanya.
      stalled.push(setTimeout(() => { try { request.socket.destroy(); } catch (e) { /* sudah tutup */ } }, 12000));
      return;
    }

    if (url.pathname === '/api/config') {
      return send(200, {
        schema: 'fiezel-config-v1',
        protocol: mut.protocol || PROTOCOL,
        // Bawaan MENIRU keadaan KV produksi tahap R2-R3, dan itu bukan kebetulan: assert
        // presedensi dua arah gerbang (`server-flag-wins-off` + `server-flag-wins-on`) hanya
        // punya premis kalau flag server TIDAK seragam. Kalau bawaan di sini semuanya false
        // (seperti versi pertama berkas ini), skenario BENAR pun akan berakhir INCONCLUSIVE
        // dan matriks jadi bohong.
        flags: mut.flagsEmpty ? {} : Object.assign({
          cfApiEnabled: true,
          cfIdentityEnabled: true,
          cfQuotaEnabled: true,
          cfAiEnabled: false,
          cfTtsEnabled: false,
          cfAnalyticsEnabled: false
        }, mut.flagsAllTrue ? { cfAiEnabled: true, cfTtsEnabled: true, cfAnalyticsEnabled: true } : {},
        mut.flagsAllFalse ? { cfApiEnabled: false, cfIdentityEnabled: false, cfQuotaEnabled: false } : {},
        mut.flagsOverride || {}),
        // Lapis `enabled` server: hanya bisa MEMATIKAN. Dibuat konsisten dengan flags supaya
        // partisi yang dihitung gerbang tidak dibelokkan lapis ini.
        enabled: mut.flagsAllTrue
          ? { ai: true, tts: true, coach: true, analytics: true }
          : { ai: false, tts: false, coach: false, analytics: false }
      });
    }
    if (url.pathname === '/api/auth/anon') {
      if (mut.anonBroken) return send(500, { error: 'internal' });
      const setCookie = buildSetCookie(mut);
      return send(200, { userId: 'tiruan-1', plan: 'free', class: 'visitor', issued: true }, setCookie ? { 'set-cookie': setCookie } : {});
    }
    // Endpoint yang HANYA disentuh ketika flag servernya true (atau ketika aplikasi tiruan
    // sengaja tuli terhadap flag). Jawaban 200 kosong cukup: yang diukur gerbang di sini
    // adalah ADA/TIDAK ADA permintaan, bukan isinya.
    if (url.pathname === '/api/ai/task' || url.pathname === '/api/tts' || url.pathname === '/api/usage') {
      return send(200, { ok: true, jalur: url.pathname });
    }
    if (url.pathname === '/api/quota') {
      const authed = mut.quotaLeak || /(^|;\s*)fz_id=/.test(cookie);
      if (!authed) return send(401, { error: 'unauthenticated' });
      return send(200, { schema: 'fiezel-quota-v1', plan: 'free', day: '2026-01-01', cookieDilihat: cookie.slice(0, 40) });
    }
    if (url.pathname === '/health' || url.pathname === '/healthz') return send(200, { ok: true, protocol: mut.protocol || PROTOCOL });
    return send(404, { error: 'not_found' });
  });
  server.on('close', () => { for (const t of stalled) clearTimeout(t); });
  return server;
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, LOOPBACK, () => resolve(server.address().port));
  });
}

/* =========================================================================================
 * 3. Aplikasi tiruan. Satu index.html; perilakunya dipilih lewat nama mutasi.
 * ======================================================================================= */
// >= 200 karakter, karena ambang `BOOT_MIN_TEXT` gerbang adalah 200. Teks ini DIRENDER LEWAT
// JS pada varian benar; pada varian `staticOnly` teks yang sama ditaruh di HTML statis, dan
// gerbang WAJIB tetap bilang "tidak boot" — itu kontrol negatif untuk probe bootnya sendiri.
const LONG_TEXT = 'Halo, ini aplikasi tiruan untuk menguji gerbang E2E jembatan FIEZEL. '
  + 'Teksnya dibuat panjang dengan sengaja supaya melewati ambang dua ratus karakter yang '
  + 'dipakai gerbang untuk memutuskan bahwa isi halaman benar-benar dicat oleh JavaScript, '
  + 'bukan dikirim sebagai markup statis.';

function appHtml(mut) {
  const flags = {
    ignoresServerFlags: !!mut.ignoresServerFlags,
    deafToServerTrue: !!mut.deafToServerTrue,
    noConfigCall: !!mut.noConfigCall,
    configTwice: !!mut.configTwice,
    blocksBoot: !!mut.blocksBoot,
    leakWhenOff: !!mut.leakWhenOff,
    ignoresEnabledFalse: !!mut.ignoresEnabledFalse,
    hitsWorkersDev: !!mut.hitsWorkersDev,
    noCredentials: !!mut.noCredentials,
    dead: !!mut.dead,
    staticOnly: !!mut.staticOnly
  };
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>FIEZEL tiruan</title></head>
<body>
<p id="statis">Splash statis pendek.</p>
<div id="app">${flags.staticOnly ? LONG_TEXT : ''}</div>
<script>
(function () {
  var MUT = ${JSON.stringify(flags)};
  var LONG = ${JSON.stringify(LONG_TEXT)};
  var WORKERS_BASE = ${JSON.stringify('https://' + WORKERS_HOST)};
  var cfg = window.FIEZEL_CF_CONFIG || { enabled: false, base: '', endpoints: {} };
  var serverFlags = null;
  var fetchOpts = MUT.noCredentials
    ? { mode: 'cors', cache: 'no-store' }
    : { credentials: 'include', mode: 'cors', cache: 'no-store' };

  // Peta flag server per endpoint: SALINAN CF_SERVER_FLAG_FOR di app.js. Aplikasi tiruan
  // versi pertama memakai aturan "semua flag false = mati", dan aturan itu tidak bisa dipakai
  // membuktikan presedensi DUA ARAH: ia tidak punya pendapat tentang endpoint per-endpoint.
  var FLAG_FOR = { auth: 'cfIdentityEnabled', quota: 'cfQuotaEnabled', ai: 'cfAiEnabled', tts: 'cfTtsEnabled', usage: 'cfAnalyticsEnabled' };
  function serverAllows(name) {
    // Flag belum tiba = tiruan ini belum berpendapat (skenario C/C0/D memang tidak memanggil
    // /api/config). Mutasi ignoresServerFlags = aplikasi yang tuli total pada lapis server.
    if (!serverFlags || MUT.ignoresServerFlags) return true;
    if (serverFlags.cfApiEnabled !== true) return false;
    // Mutasi deafToServerTrue: server MEMBOLEHKAN, tetapi aplikasi tetap tidak memanggil.
    // Inilah cacat yang hanya bisa ditangkap arah kedua (server-flag-wins-on) — versi lama
    // assert itu buta terhadapnya, karena diam selalu dinilai lulus.
    if (MUT.deafToServerTrue) return false;
    var named = FLAG_FOR[name];
    if (named && serverFlags[named] !== true) return false;
    return true;
  }
  function endpointMode(name) {
    if (cfg.enabled !== true || !cfg.base) return MUT.ignoresEnabledFalse ? String((cfg.endpoints || {})[name] || 'off') : 'off';
    var m = String((cfg.endpoints || {})[name] || 'off');
    if (m !== 'on') return 'off';
    if (!serverAllows(name)) return 'off';
    return 'on';
  }
  function keyFor(p) {
    if (p.indexOf('/api/config') === 0) return 'config';
    if (p.indexOf('/api/auth') === 0) return 'auth';
    if (p.indexOf('/api/quota') === 0) return 'quota';
    if (p.indexOf('/api/tts') === 0) return 'tts';
    if (p.indexOf('/api/usage') === 0) return 'usage';
    if (p.indexOf('/health') === 0) return 'health';
    return 'ai';
  }
  // Kontrak yang dipakai gerbang: satu fungsi transport di window yang MENGHORMATI flag.
  window.coreWorkerExec = function (p, opts) {
    if (endpointMode(keyFor(p)) !== 'on') {
      return Promise.resolve(new Response('{"jalur":"non-CF"}', { status: 599, headers: { 'content-type': 'application/json' } }));
    }
    return fetch(cfg.base + p, Object.assign({}, fetchOpts, opts || {}));
  };

  function render() {
    if (MUT.dead || MUT.staticOnly) return;
    var host = document.getElementById('app');
    var card = document.createElement('section');
    card.textContent = LONG;
    host.appendChild(card);
  }
  function loadConfig() {
    if (MUT.noConfigCall) return Promise.resolve();
    if (endpointMode('config') !== 'on') return Promise.resolve();
    var once = fetch(cfg.base + '/api/config', fetchOpts)
      .then(function (r) { return r.json(); })
      .then(function (j) { serverFlags = (j && j.flags) || null; })
      .catch(function () { serverFlags = null; });
    if (MUT.configTwice) fetch(cfg.base + '/api/config', fetchOpts).catch(function () {});
    return once;
  }
  function boot() {
    // URL disusun dari konstanta, bukan literal di dalam fetch(): pemindai no-network-test.js
    // menghukum fetch dengan URL literal https, dan melonggarkan pemindai demi berkas uji
    // adalah harga yang tidak layak dibayar. Hostnya tetap dipetakan ke loopback.
    if (MUT.hitsWorkersDev) fetch(WORKERS_BASE + '/health', { mode: 'cors', cache: 'no-store' }).catch(function () {});
    if (MUT.leakWhenOff) fetch(cfg.base + '/api/quota', fetchOpts).catch(function () {});
    if (MUT.ignoresEnabledFalse && String((cfg.endpoints || {}).quota || 'off') === 'on') fetch(cfg.base + '/api/quota', fetchOpts).catch(function () {});
    if (MUT.blocksBoot) { loadConfig().then(render); return; }
    loadConfig();
    setTimeout(render, 120);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>
</body></html>
`;
}

function writeApp(mut) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiezel-e2e-app-'));
  fs.writeFileSync(path.join(dir, 'index.html'), appHtml(mut));
  return dir;
}

/* =========================================================================================
 * 4. Menjalankan gerbang sebagai proses anak
 * ======================================================================================= */
// WAJIB asinkron (bukan spawnSync): jembatan tiruan hidup di proses INI, jadi memblokir event
// loop berarti tidak ada satu pun permintaan anak yang terjawab dan seluruh matriks jadi
// palsu — semua skenario "gagal" karena transport, termasuk yang benar.
async function runGate(env) {
  const reportDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiezel-e2e-report-'));
  const reportPath = path.join(reportDir, 'E2E-BRIDGE-REPORT.json');
  const child = spawn(process.execPath, [GATE], {
    cwd: __dirname,
    env: Object.assign({}, process.env, {
      FIEZEL_E2E_BRIDGE_BASE: '',
      FIEZEL_E2E_REPORT: reportPath,
      FIEZEL_E2E_SHOT_DIR: ''
    }, env)
  });
  const result = await new Promise((resolve, reject) => {
    let out = '';
    let err = '';
    const killer = setTimeout(() => { try { child.kill('SIGKILL'); } catch (e) { /* sudah mati */ } }, GATE_TIMEOUT_MS);
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('error', e => { clearTimeout(killer); reject(e); });
    child.on('close', code => { clearTimeout(killer); resolve({ code, stdout: out, stderr: err }); });
  });
  let report = null;
  try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { report = null; }
  try { fs.rmSync(reportDir, { recursive: true, force: true }); } catch { /* temp */ }
  return {
    code: result.code,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    report,
    failedIds: report && Array.isArray(report.checks) ? report.checks.filter(c => c.status === 'FAIL').map(c => c.id) : [],
    // INCONCLUSIVE dibaca terpisah, dan TIDAK dilebur ke failedIds: matriks di bawah menuntut
    // status yang TEPAT, supaya "tidak bisa disimpulkan" tidak pernah tertukar dengan "merah"
    // dan keduanya tidak pernah tertukar dengan "lulus".
    inconclusiveIds: report && Array.isArray(report.checks) ? report.checks.filter(c => c.status === 'INCONCLUSIVE').map(c => c.id) : [],
    status: report ? String(report.status || '') : '',
    reportPass: report ? report.pass : undefined,
    passCount: report && report.counts ? report.counts.pass : 0
  };
}

/* =========================================================================================
 * 5. Matriks
 * ======================================================================================= */
// `expect: null` = gerbang harus LULUS. Selain itu = harus GAGAL, dan id assert itu harus
// muncul di daftar assert yang gagal. `only` membatasi skenario gerbang yang perlu dijalankan
// untuk kasus itu (tanpa itu matriks ini memakan belasan menit).
const SCENARIOS = [
  { name: 'benar (aplikasi + jembatan sesuai kontrak)', mut: {}, only: '', expect: null },

  // --- Cacat JEMBATAN --------------------------------------------------------------------
  { name: 'cookie fz_id tanpa Domain (host-only)', mut: { cookieNoDomain: true }, only: 'C-,D-', expect: 'cookie-domain' },
  { name: 'cookie fz_id Domain salah (evil.example)', mut: { cookieDomain: 'evil.example' }, only: 'C-,D-', expect: 'cookie-domain' },
  { name: 'cookie fz_id tanpa HttpOnly', mut: { cookieNoHttpOnly: true }, only: 'C-,D-', expect: 'cookie-httponly' },
  { name: 'cookie fz_id SameSite=None', mut: { cookieSameSite: 'None' }, only: 'C-,D-', expect: 'cookie-samesite-lax' },
  { name: 'tidak ada Set-Cookie sama sekali', mut: { cookieMissing: true }, only: 'C-,D-', expect: 'cookie-present' },
  { name: 'POST /api/auth/anon menjawab 500', mut: { anonBroken: true }, only: 'C-,D-', expect: 'anon-200' },
  { name: '/api/config membawa protocol 1.6', mut: { protocol: '1.6' }, only: 'B-', expect: 'config-protocol' },
  { name: '/api/config mengirim flags kosong', mut: { flagsEmpty: true }, only: 'B-', expect: 'config-flags-present' },
  { name: '/api/quota menjawab 200 TANPA cookie (kebocoran identitas)', mut: { quotaLeak: true }, only: 'C0', expect: 'quota-401-before-auth' },
  { name: 'jembatan menggantung permintaan ke-3 di satu koneksi', mut: { hopStall: true }, only: 'C-,D-', expect: 'bridge-hop-stable' },

  // --- Cacat APLIKASI --------------------------------------------------------------------
  { name: 'aplikasi menembak jembatan walau semua flag off', mut: { leakWhenOff: true }, only: 'A-', expect: 'off-no-bridge-request' },
  { name: 'aplikasi mengabaikan enabled:false', mut: { ignoresEnabledFalse: true }, only: 'A2', expect: 'disabled-no-bridge-request' },
  { name: 'aplikasi tidak pernah memanggil /api/config', mut: { noConfigCall: true }, only: 'B-', expect: 'config-called-once' },
  { name: 'aplikasi memanggil /api/config dua kali per boot', mut: { configTwice: true }, only: 'B-', expect: 'config-called-once' },
  { name: 'aplikasi MENAHAN boot sampai /api/config datang', mut: { blocksBoot: true }, only: 'B-', expect: 'config-non-blocking' },
  // Presedensi flag server, DUA ARAH. Tiga kasus di bawah menutup ketiga cara assert ini bisa
  // bohong: bocor ke arah mati, bisu ke arah hidup, dan premis yang tidak tersedia.
  { name: 'aplikasi mengabaikan flag server yang false (bocor ke endpoint yang dimatikan server)', mut: { ignoresServerFlags: true }, only: 'B-', expect: 'server-flag-wins-off' },
  { name: 'aplikasi bisu walau flag server true (endpoint yang DIIZINKAN server tidak pernah dipanggil)', mut: { deafToServerTrue: true }, only: 'B-', expect: 'server-flag-wins-on' },
  { name: 'flag server SERAGAM true ⇒ gerbang harus INCONCLUSIVE, bukan lulus', mut: { flagsAllTrue: true }, only: 'B-', expect: 'server-flag-partition', expectStatus: 'INCONCLUSIVE' },
  { name: 'flag server SERAGAM false ⇒ gerbang harus INCONCLUSIVE, bukan lulus', mut: { flagsAllFalse: true }, only: 'B-', expect: 'server-flag-partition', expectStatus: 'INCONCLUSIVE' },
  { name: 'aplikasi menembak *.workers.dev langsung', mut: { hitsWorkersDev: true }, only: 'A-', expect: 'no-workers-dev' },
  { name: 'aplikasi membuang credentials:include (cookie tidak dikirim ulang)', mut: { noCredentials: true }, only: 'C-,D-', expect: 'cookie-replayed' },
  { name: 'aplikasi tidak me-render apa pun', mut: { dead: true }, only: 'A-', expect: 'off-app-boots' },
  { name: 'isi HANYA markup statis, nol render JS (kontrol negatif untuk probe boot)', mut: { staticOnly: true }, only: 'A-', expect: 'off-app-boots' }
];

/* =========================================================================================
 * 6. Jalan
 * ======================================================================================= */
(async function main() {
  const missing = await missingDependency();
  if (missing) {
    console.log('FIEZEL e2e-bridge selftest: SKIP — ' + missing);
    console.log('SKIP bukan PASS. Yang jadi TIDAK terbukti oleh jalan ini:');
    console.log('  - bahwa tools/fiezel-e2e-bridge.mjs benar-benar MERAH untuk cookie tanpa Domain, protocol salah,');
    console.log('    flag server yang diabaikan, kebocoran saat flag mati, dan tembakan langsung ke *.workers.dev;');
    console.log('  - bahwa probe bootnya tidak bisa ditipu markup statis.');
    console.log('Untuk membuktikannya: pasang playwright + Chromium (npx playwright install chromium) lalu ulangi.');
    return;
  }

  /* --- A. Tanpa env: SKIP bersih ------------------------------------------------------- */
  const skipRun = await runGate({ FIEZEL_E2E_BRIDGE_BASE: '' });
  // Probe TANPA FIEZEL_E2E_REPORT: begitulah no-network-test.js menjalankannya, dan pada jalur
  // itu gerbang tidak boleh meninggalkan artefak apa pun di akar repo.
  const skipTanpaReport = await runGate({ FIEZEL_E2E_REPORT: '' });
  check('SKIP tanpa FIEZEL_E2E_REPORT tetap exit 0 dan tidak menulis artefak ke akar repo',
    skipTanpaReport.code === 0 && !fs.existsSync(path.join(__dirname, 'E2E-BRIDGE-REPORT.json')),
    'exit=' + skipTanpaReport.code);
  check('Tanpa FIEZEL_E2E_BRIDGE_BASE gerbang exit 0 (SKIP, tidak menembak jaringan dari CI)',
    skipRun.code === 0, 'exit=' + skipRun.code);
  check('SKIP mencetak label SKIP dan alasannya',
    /SKIP/.test(skipRun.stdout) && /tidak diset/.test(skipRun.stdout), skipRun.stdout.split('\n').filter(Boolean).pop() || '(stdout kosong)');
  check('SKIP dilaporkan status SKIP dengan pass:null (bukan PASS palsu)',
    !!skipRun.report && skipRun.report.status === 'SKIP' && skipRun.report.pass === null,
    skipRun.report ? 'status=' + skipRun.report.status + ' pass=' + JSON.stringify(skipRun.report.pass) : '(tidak ada laporan)');
  check('SKIP menyebut apa yang BELUM terbukti (batas kejujuran, bukan diam)',
    /BELUM terbukti/.test(skipRun.stdout), 'stdout ' + skipRun.stdout.length + ' char');

  /* --- B. Base URL tak sah = MERAH, bukan SKIP ----------------------------------------- */
  const badBase = await runGate({ FIEZEL_E2E_BRIDGE_BASE: 'bukan-url-sama-sekali' });
  check('Base URL tak sah membuat gerbang MERAH (env diset = niat menguji)',
    badBase.code === 1, 'exit=' + badBase.code);

  /* --- C. Nama skenario tak dikenal juga MERAH ----------------------------------------- */
  const badOnly = await runGate({ FIEZEL_E2E_BRIDGE_BASE: 'https://' + BRIDGE_HOST, FIEZEL_E2E_ONLY: 'Z-tidak-ada' });
  check('FIEZEL_E2E_ONLY dengan nama skenario tak dikenal membuat gerbang MERAH (bukan menguji nol skenario diam-diam)',
    badOnly.code === 1, 'exit=' + badOnly.code);

  /* --- D. Matriks benar/salah ---------------------------------------------------------- */
  const certDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiezel-e2e-cert-'));
  const tls = makeCert(certDir);
  const matrix = [];
  const running = CASE_FILTER ? SCENARIOS.filter(s => s.name.includes(CASE_FILTER)) : SCENARIOS;
  if (CASE_FILTER) console.log('MODE DEBUG: hanya ' + running.length + ' skenario dijalankan (FIEZEL_E2E_SELFTEST_CASE=' + CASE_FILTER + '). Jalan ini TIDAK pernah dianggap PASS.');
  for (const scenario of running) {
    const bridge = makeBridge(scenario.mut, tls);
    const port = await listen(bridge);
    const appDir = writeApp(scenario.mut);
    const run = await runGate({
      FIEZEL_E2E_BRIDGE_BASE: 'https://' + BRIDGE_HOST,
      FIEZEL_E2E_APP_DIR: appDir,
      FIEZEL_E2E_APP_HOST: APP_HOST,
      FIEZEL_E2E_COOKIE_DOMAIN: APP_HOST,
      FIEZEL_E2E_PROTOCOL: PROTOCOL,
      // Semua host uji dipetakan ke jembatan tiruan: nol egress, nol DNS.
      FIEZEL_E2E_HOST_MAP: BRIDGE_HOST + '=' + LOOPBACK + ':' + port + ',' + WORKERS_HOST + '=' + LOOPBACK + ':' + port,
      FIEZEL_E2E_CONFIG_DELAY: '1200',
      FIEZEL_E2E_BOOT_TIMEOUT: '15000',
      FIEZEL_E2E_ONLY: scenario.only
    });
    try { fs.rmSync(appDir, { recursive: true, force: true }); } catch { /* temp */ }
    await new Promise(resolve => bridge.close(resolve));

    const wantPass = scenario.expect === null;
    const wantInconclusive = scenario.expectStatus === 'INCONCLUSIVE';
    const gotPass = run.code === 0;
    const idHit = wantPass
      ? true
      : (wantInconclusive
        // INCONCLUSIVE harus terbaca sebagai INCONCLUSIVE di ketiga tempat: id assertnya,
        // status laporan, dan `pass:false`. Kalau salah satunya bilang lulus, gerbangnya
        // mengubah "tidak terbukti" menjadi "terbukti" — justru cacat yang dilarang.
        ? (run.inconclusiveIds.includes(scenario.expect) && run.status === 'INCONCLUSIVE' && run.reportPass === false && !run.failedIds.length)
        : run.failedIds.includes(scenario.expect));
    const ok = wantPass ? gotPass : (!gotPass && idHit);
    matrix.push({
      skenario: scenario.name,
      diharapkan: wantPass ? 'LULUS' : (wantInconclusive ? 'INCONCLUSIVE@' + scenario.expect : 'GAGAL@' + scenario.expect),
      hasil: gotPass ? 'LULUS' : (run.status === 'INCONCLUSIVE' ? 'INCONCLUSIVE' : 'GAGAL'),
      assertGagal: run.failedIds.concat(run.inconclusiveIds.map(id => id + '(INCONCLUSIVE)')),
      assertLulus: run.passCount,
      cocok: ok,
      // Rincian assert yang gagal ikut dibawa: kalau matriks tidak cocok, penyebabnya harus
      // bisa dibaca dari keluaran ini saja, tanpa harus menjalankan ulang gerbang manual.
      rincian: !ok && run.report && Array.isArray(run.report.checks)
        ? run.report.checks.filter(c => c.status !== 'PASS').map(c => c.status + ' ' + c.id + ' :: ' + String(c.details).slice(0, 200))
        : []
    });

    if (wantPass) {
      check('Skenario BENAR: ' + scenario.name + ' → gerbang LULUS',
        ok, 'exit=' + run.code + ' assertGagal=' + (run.failedIds.join(',') || '0') + ' assertLulus=' + run.passCount
          + (run.failedIds.length ? '\n         stderr: ' + run.stderr.slice(0, 300) : ''));
      // Hijau karena kosong juga hijau. Gerbang penuh punya 24 assert (22 + dua arah
      // presedensi flag server); 22 adalah ambang aman yang tetap menangkap jalan yang
      // berhenti di tengah.
      check('Skenario BENAR menjalankan ≥22 assert (bukan hijau karena tidak menguji apa-apa)',
        run.passCount >= 22, 'assertLulus=' + run.passCount);
    } else if (wantInconclusive) {
      check('Skenario TAK TERSIMPULKAN: ' + scenario.name + ' → gerbang INCONCLUSIVE di `' + scenario.expect + '` dan exit ≠ 0',
        ok, 'exit=' + run.code + ' status=' + run.status + ' pass=' + JSON.stringify(run.reportPass)
          + ' inconclusive=' + (run.inconclusiveIds.join(',') || '(kosong)')
          + ' assertGagal=' + (run.failedIds.join(',') || '(kosong)'));
    } else {
      check('Skenario SALAH: ' + scenario.name + ' → gerbang GAGAL di `' + scenario.expect + '`',
        ok, 'exit=' + run.code + ' assertGagal=' + (run.failedIds.join(',') || '(kosong)'));
    }
  }
  try { fs.rmSync(certDir, { recursive: true, force: true }); } catch { /* temp */ }

  /* --- E. Invarian matriks ------------------------------------------------------------- */
  check('Matriks memuat satu skenario benar dan ≥14 varian salah',
    SCENARIOS.filter(s => s.expect === null).length === 1 && SCENARIOS.filter(s => s.expect !== null).length >= 14,
    SCENARIOS.length + ' skenario total');
  check('Varian salah menutup id assert yang berbeda-beda (bukan satu assert yang sama berulang)',
    new Set(SCENARIOS.filter(s => s.expect).map(s => s.expect)).size >= 12,
    [...new Set(SCENARIOS.filter(s => s.expect).map(s => s.expect))].join(', '));
  // Presedensi flag server WAJIB ditutup dari tiga sisi. Kalau salah satu hilang, assert itu
  // kembali bisa hijau karena diam — persis cacat yang membuatnya harus dirancang ulang.
  check('Presedensi flag server ditutup dua arah PLUS kasus tak tersimpulkan (off, on, INCONCLUSIVE)',
    SCENARIOS.some(s => s.expect === 'server-flag-wins-off')
    && SCENARIOS.some(s => s.expect === 'server-flag-wins-on')
    && SCENARIOS.filter(s => s.expectStatus === 'INCONCLUSIVE' && s.expect === 'server-flag-partition').length >= 2,
    'off/on/INCONCLUSIVE×' + SCENARIOS.filter(s => s.expectStatus === 'INCONCLUSIVE').length);
  check('Laporan gerbang tidak pernah ditulis ke akar repo (working tree bersih)',
    !fs.existsSync(path.join(__dirname, 'E2E-BRIDGE-REPORT.json')), 'E2E-BRIDGE-REPORT.json tidak ada di akar');

  console.log('\n=== MATRIKS SELF-TEST tools/fiezel-e2e-bridge.mjs ===');
  for (const row of matrix) {
    console.log(`${row.cocok ? 'OK  ' : 'BEDA'} | diharapkan ${row.diharapkan.padEnd(30)} | hasil ${row.hasil.padEnd(6)} | ${row.skenario}`
      + (row.assertGagal.length ? '\n       assert gagal: ' + row.assertGagal.join(', ') : '')
      + (row.rincian && row.rincian.length ? '\n       ' + row.rincian.join('\n       ') : ''));
  }
  for (const c of checks) console.log(`[${c.status}] ${c.name} :: ${c.details}`);
  const pass = checks.filter(c => c.status === 'PASS').length;
  const fail = checks.filter(c => c.status === 'FAIL').length;
  if (CASE_FILTER) {
    console.log(`FIEZEL e2e-bridge selftest: MODE DEBUG (${pass} lulus, ${fail} gagal dari ${running.length} skenario) — bukan PASS.`);
    process.exitCode = 1;
    return;
  }
  console.log(failed
    ? `FIEZEL e2e-bridge selftest: FAIL (${fail} dari ${pass + fail})`
    : `FIEZEL e2e-bridge selftest: PASS (${pass} assert, ${SCENARIOS.length} skenario loopback)`);
  if (failed) process.exitCode = 1;
})().catch(error => {
  console.error('FIEZEL e2e-bridge selftest: ERROR — ' + String(error && error.stack ? error.stack : error));
  process.exitCode = 1;
});
