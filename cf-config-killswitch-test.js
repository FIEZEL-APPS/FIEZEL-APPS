// cf-config-killswitch-test.js — gerbang KILL SWITCH SERVER (`GET /api/config`).
//
// MASALAH YANG DIJAGA BERKAS INI. Sampai paket kerja ini, `FIEZEL_CF_CONFIG` di
// `core-config.js` adalah satu-satunya sakelar klien — dan berkas itu ikut precache service
// worker (`sw.js:35`, daftar ASSETS) lalu dilayani cache-first. Artinya mengubah flag statis
// TIDAK menjangkau perangkat yang sudah memasang PWA sampai `SW_REV` naik dan generasi shell
// baru menyebar. Jadi kill switch sesungguhnya belum ada, dan tanpa itu tidak ada satu pun
// flag yang boleh dinyalakan. Worker produksi sudah menjawab `GET /api/config`
// (`workers/api/route-config.js`, `Cache-Control: no-store`); yang kurang adalah klien yang
// membacanya, dan MEMBACANYA DENGAN ARAH YANG BENAR.
//
// Tujuh kebenaran yang dijaga — semuanya dengan MENJALANKAN kode di dalam `vm`, bukan
// mencocokkan teks (kecuali (f) dan (g) yang memang pernyataan tentang bentuk kode):
//   (a) server TIDAK BISA menyalakan flag yang statisnya 'off'. Penggabungannya AND: satu
//       server yang disusupi tidak boleh bisa menyalakan fitur di perangkat murid.
//   (b) server BISA mematikan flag yang statisnya 'on' — kalau tidak, ini bukan kill switch.
//   (c) server tak terjangkau (jaringan mati, HTTP 500, timeout) = seluruh jalur CF mati DAN
//       aplikasi tetap jalan lewat jalur Puter. Pengambilnya tidak pernah menolak (reject).
//   (d) `protocol` bukan '1.7' = SELURUH jalur CF mati, bukan diteruskan.
//   (e) cermin berumur pendek: maks 5 menit, dan batas itu dipaksa di klien walau server
//       mengaku `ttlSeconds` lebih panjang.
//   (f) nol penulisan localStorage untuk flag ini (cermin hidup di `sessionStorage`).
//   (g) boot tidak diblokir: tidak ada `await` pengambil config di jalur boot kritis, dan
//       diukur — kelanjutan boot berjalan sebelum jawaban server tiba.
//
// Nol dependency, nol jaringan, nol berkas temporer. `fetch` di dalam vm adalah MOCK LOKAL
// (`fetchMock`, didefinisikan sebelum disuntikkan) — pola yang dikenali no-network-test.js.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};
// Buang komentar sebelum memindai (pola audio-asset-pipeline-test.js:290-292).
const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

const app = read('app.js');
const config = read('core-config.js');
const workflow = read('.github/workflows/quality.yml');
const diagPanel = read('features/neural-voice/fiezel-diag-panel.js');

check('Gerbang ini terdaftar di quality.yml', workflow.includes('node cf-config-killswitch-test.js'), 'quality.yml');

/* =======================================================================================
 * 0. Potong kedua blok dari app.js APA ADANYA
 * ===================================================================================== */
const KILL_BEGIN = '/* CF-KILLSWITCH-BEGIN';
const KILL_END = '/* CF-KILLSWITCH-END */';
const TRANSPORT_BEGIN = '/* CF-TRANSPORT-BEGIN';
const TRANSPORT_END = '/* CF-TRANSPORT-END */';
const killAt = app.indexOf(KILL_BEGIN);
const killEndAt = app.indexOf(KILL_END);
const transportAt = app.indexOf(TRANSPORT_BEGIN);
const transportEndAt = app.indexOf(TRANSPORT_END);
check('Blok kill switch bisa dipotong dari app.js lewat sentinel CF-KILLSWITCH-BEGIN/END',
  killAt >= 0 && killEndAt > killAt, `begin=${killAt} end=${killEndAt}`);
// Urutan penting: transport meminta izin ke kill switch, jadi kill switch harus sudah ada
// saat transport pertama kali dipakai.
check('Blok kill switch berada SEBELUM blok transport di app.js',
  killAt >= 0 && transportAt > killEndAt, `kill=${killAt}..${killEndAt} transport=${transportAt}`);

const killBlock = killAt >= 0 && killEndAt > killAt ? app.slice(killAt, killEndAt) : '';
const transportBlock = transportAt >= 0 && transportEndAt > transportAt ? app.slice(transportAt, transportEndAt) : '';
const killCode = stripComments(killBlock);
const transportCode = stripComments(transportBlock);
const appCode = stripComments(app);

check('Blok transport meminta izin lapis server (FiezelCfKillSwitch.allows) sebelum memakai CF',
  /FiezelCfKillSwitch\?\.allows\?\.\(key\)!==true\)return 'off'/.test(transportCode),
  'cari FiezelCfKillSwitch?.allows?.(key)!==true di blok transport');

/* =======================================================================================
 * 1. Harness: jalankan KEDUA blok dengan flag statis + jawaban server yang ditentukan uji
 * ===================================================================================== */
const PUTER_URL = 'https://fiezel-core.puter.work';
const CF_BASE = 'https://api.fiezel.my.id';
const ALL_ON = { health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on', tts: 'on', usage: 'on' };
const ALL_OFF = { health: 'off', config: 'off', auth: 'off', quota: 'off', ai: 'off', tts: 'off', usage: 'off' };
const ALL_FLAGS_TRUE = {
  cfApiEnabled: true, cfAiEnabled: true, cfTtsEnabled: true,
  cfQuotaEnabled: true, cfAnalyticsEnabled: true, cfIdentityEnabled: true
};
const KILL_ALL_TRUE = { ai: true, tts: true, coach: true, analytics: true };
const ENDPOINT_KEYS = ['health', 'config', 'auth', 'quota', 'ai', 'tts', 'usage'];

// Parameter pengambil dibaca dari core-config.js REPO, bukan disalin ke sini: kalau nilainya
// diubah diam-diam, gerbang ini ikut berubah dan (e) tetap menjaga batas 5 menit.
const repoGlobals = (() => {
  const box = { self: {}, Object, console };
  box.self.self = box.self;
  vm.createContext(box);
  vm.runInContext(config, box, { filename: 'core-config.js' });
  return box.self;
})();
const REPO_CF = repoGlobals.FIEZEL_CF_CONFIG || null;
const REPO_REMOTE = repoGlobals.FIEZEL_CF_REMOTE || null;

check('core-config.js: FIEZEL_CF_REMOTE terpasang dan beku (parameter pengambil, bukan rahasia)',
  Boolean(REPO_REMOTE) && Object.isFrozen(REPO_REMOTE) && REPO_REMOTE.path === '/api/config'
  && REPO_REMOTE.protocol === '1.7' && Number(REPO_REMOTE.timeoutMs) > 0,
  JSON.stringify(REPO_REMOTE));
/* =======================================================================================
 * (b) BERKAS YANG BENAR-BENAR TERPASANG — bukan harness sintetis
 * =====================================================================================
 * Assert lama di titik ini: "flag statis repo MASIH semua off (paket ini tidak menyalakan
 * apa pun)". Itu kontrak paket kill switch, dan sudah kedaluwarsa: paket A6 (28 Agu 2026)
 * MEMANG menyalakan, dan penyalaan itu yang sekarang harus dijaga bentuknya. Yang berubah
 * bukan ketegasannya melainkan sasarannya — dari "nol yang hidup" menjadi "hanya dua yang
 * hidup, dan dua yang menghabiskan uang wajib mati".
 *
 * Assert ini sengaja dua lapis: NILAI hasil evaluasi berkas (yang benar-benar dibaca app.js)
 * DAN TEKS berkasnya (menangkap perubahan yang tersembunyi di balik cabang atau komentar).
 * Berkas inilah yang ikut precache service worker dan dilayani cache-first, jadi salah di
 * sini artinya salah di perangkat murid selama satu generasi shell penuh. */
const A6_LIVE = ['config', 'usage'];
const A6_MUST_OFF = ['health', 'auth', 'quota', 'ai', 'tts'];
const repoLive = Object.entries(REPO_CF?.endpoints || {}).filter(([, v]) => v !== 'off').map(([k]) => k);
check('(b) core-config.js terpasang: enabled:true + base api.fiezel.my.id (jalur CF benar-benar hidup)',
  Boolean(REPO_CF) && REPO_CF.enabled === true && REPO_CF.base === CF_BASE
  && Object.isFrozen(REPO_CF) && Object.isFrozen(REPO_CF.endpoints),
  JSON.stringify(REPO_CF));
check('(b) core-config.js terpasang: ai dan tts BENAR-BENAR off — nol neuron, nol rupiah',
  REPO_CF?.endpoints?.ai === 'off' && REPO_CF?.endpoints?.tts === 'off',
  `ai=${REPO_CF?.endpoints?.ai} tts=${REPO_CF?.endpoints?.tts}`);
check('(b) core-config.js terpasang: yang hidup HANYA config+usage (tahap rilis tidak dilampaui)',
  repoLive.length === A6_LIVE.length && A6_LIVE.every(k => REPO_CF?.endpoints?.[k] === 'on')
  && A6_MUST_OFF.every(k => REPO_CF?.endpoints?.[k] === 'off'),
  `hidup=${repoLive.join(',') || '0'}`);
{
  // Lapis TEKS: dibaca dari berkas apa adanya, jadi mutasi sekecil satu kata pun merah.
  const cfgText = stripComments(config);
  const blok = (cfgText.match(/FIEZEL_CF_CONFIG\s*=\s*Object\.freeze\(\{[\s\S]*?\}\);/) || [])[0] || '';
  check('(b) teks core-config.js: blok FIEZEL_CF_CONFIG ada, dan ai/tts tertulis off di dalamnya',
    /ai:'off'/.test(blok) && /tts:'off'/.test(blok)
    && !/ai:'(?:on|shadow)'/.test(blok) && !/tts:'(?:on|shadow)'/.test(blok),
    blok.replace(/\s+/g, ' ').slice(0, 200) || 'blok tidak ditemukan');
  check('(b) teks core-config.js: NOL endpoint hidup selain config dan usage',
    (blok.match(/(health|config|auth|quota|ai|tts|usage):'(?:on|shadow)'/g) || [])
      .map(s => s.split(':')[0]).every(k => A6_LIVE.includes(k)),
    (blok.match(/(health|config|auth|quota|ai|tts|usage):'(?:on|shadow)'/g) || []).join(','));
}

const RUNNABLE = killBlock + '\n' + transportBlock + `
;globalThis.__cf={
  coreWorkerExec, cfEndpointMode, cfStaticMode, cfMergedMode, cfServerAllows,
  cfConfigRefresh, cfConfigBootOnce, cfKillSwitchSnapshot, cfApplyServerConfig,
  cfMirrorRead, state:()=>({...cfRemoteState})
};`;

// MOCK LOKAL. Semua jawaban dibentuk di sini; tidak ada satu pun panggilan yang keluar.
function makeHarness(options = {}) {
  const cfConfig = options.cfConfig === undefined
    ? { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } }
    : options.cfConfig;
  const log = { fetches: [], puter: [], localWrites: [], sessionWrites: [], idle: [], timers: [] };
  const puterResponse = { ok: true, status: 200, __from: 'puter', json: async () => ({ protocol: '1.7' }) };
  const puter = {
    workers: {
      exec: (url, opts) => { log.puter.push({ url: String(url), options: opts }); return Promise.resolve(puterResponse); }
    }
  };
  const cfResponse = { ok: true, status: 200, __from: 'cloudflare', json: async () => ({ protocol: '1.7' }) };

  // Jawaban default untuk /api/config: protokol cocok, semua flag true. Uji yang ingin
  // keadaan lain memberi `configBody`/`fetchImpl` sendiri.
  const configBody = options.configBody === undefined
    ? { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE }, limits: {}, ttlSeconds: 60 }
    : options.configBody;

  const fetchMock = async (url, opts) => {
    const at = Date.now();
    log.fetches.push({ url: String(url), options: opts || {}, at });
    if (typeof options.fetchImpl === 'function') return options.fetchImpl(String(url), opts || {}, { configBody, cfResponse });
    if (String(url).endsWith('/api/config')) {
      if (options.configDelayMs) await new Promise(r => setTimeout(r, options.configDelayMs));
      return { ok: true, status: 200, json: async () => configBody };
    }
    return cfResponse;
  };

  const sessionData = { ...(options.sessionStore || {}) };
  const sessionStorage = {
    getItem: key => (key in sessionData ? sessionData[key] : null),
    setItem: (key, value) => { log.sessionWrites.push(key); sessionData[key] = String(value); },
    removeItem: key => { delete sessionData[key]; }
  };
  const localStorage = {
    getItem: () => null,
    setItem: (key, value) => { log.localWrites.push(`set:${key}`); },
    removeItem: key => { log.localWrites.push(`remove:${key}`); }
  };

  const sandbox = {
    Object, Promise, String, Number, Boolean, Math, JSON, Error, Array, Set, Map, Date,
    AbortController: typeof AbortController === 'function' ? AbortController : undefined,
    setTimeout: (fn, ms) => { log.timers.push(Number(ms) || 0); return setTimeout(fn, ms); },
    clearTimeout,
    console: { debug: () => {}, log: () => {}, warn: () => {}, error: () => {} },
    fetch: fetchMock,
    localStorage,
    CORE_WORKER_URL: PUTER_URL,
    awaitPuter: async () => puter
  };
  // requestIdleCallback DIREKAM, tidak dijalankan otomatis: itulah cara (g) membuktikan boot
  // tidak menunggu apa pun.
  if (options.idle !== false) sandbox.requestIdleCallback = (fn, opts) => { log.idle.push({ fn, opts }); return log.idle.length; };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.puter = puter;
  sandbox.sessionStorage = sessionStorage;
  sandbox.FIEZEL_CF_REMOTE = REPO_REMOTE ? { ...REPO_REMOTE, ...(options.remote || {}) } : (options.remote || {});
  sandbox.FIEZEL_CF_CONFIG = cfConfig
    ? Object.freeze({ ...cfConfig, endpoints: Object.freeze({ ...cfConfig.endpoints }) })
    : undefined;
  vm.createContext(sandbox);
  vm.runInContext(RUNNABLE, sandbox, { filename: 'app.js#cf-killswitch+transport' });
  return {
    api: sandbox.__cf,
    gate: sandbox.FiezelCfKillSwitch,
    // Konteks vm-nya dibuka supaya blok LAIN dari app.js (mis. pemancar analytics) bisa
    // dijalankan di atas fungsi gerbang yang SAMA, bukan atas tiruan.
    sandboxRef: sandbox,
    log,
    sessionData,
    puterResponse,
    cfResponse,
    runIdle: () => { const pending = log.idle.slice(); log.idle.length = 0; pending.forEach(entry => entry.fn()); },
    configCalls: () => log.fetches.filter(f => f.url.endsWith('/api/config')),
    cfDataCalls: () => log.fetches.filter(f => !f.url.endsWith('/api/config'))
  };
}
// Jalankan pengambil config sampai selesai dari keadaan boot.
async function boot(harness) { harness.runIdle(); await harness.api.cfConfigRefresh(); }

(async () => {
  /* ===================================================================================
   * (a) SERVER TIDAK BISA MENYALAKAN apa pun yang statisnya off
   * ================================================================================= */
  // Server menjawab semua true, dengan protokol yang cocok — jawaban paling "mengundang"
  // yang mungkin. Flag statis di sini ditulis EKSPLISIT semua-off. Sebelum A6 nilainya dipinjam dari repo
  // (yang memang seluruhnya off); sesudah A6 pinjaman itu akan menguji hal lain dan assert
  // "semua gabungan tetap off" jadi bohong. Keadaan repo yang sebenarnya diuji terpisah di
  // bagian A6 di bawah.
  const staticOff = makeHarness({ cfConfig: { enabled: false, base: '', endpoints: { ...ALL_OFF } }, configBody: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 60 } });
  // Suntikkan jawaban server itu langsung supaya (a) diuji pada keadaan server = ok,
  // bukan pada keadaan "belum dijawab" yang mati karena alasan lain.
  staticOff.api.cfApplyServerConfig({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE } }, 'server');
  const mergedStaticOff = ENDPOINT_KEYS.map(key => `${key}=${staticOff.api.cfMergedMode(key)}`);
  check('(a) server status ok + semua flag true, tapi statis off ⇒ SEMUA gabungan tetap off',
    staticOff.api.state().status === 'ok' && mergedStaticOff.every(m => m.endsWith('=off')),
    mergedStaticOff.join(', '));
  const PATHS = ['/health', '/api/config', '/api/auth/session', '/api/quota/state', '/api/ai/chat', '/api/tts/say', '/api/usage/event'];
  for (const p of PATHS) await staticOff.api.coreWorkerExec(p, { method: 'POST' });
  check('(a) tujuh path tetap dilayani jalur Puter, nol permintaan data ke CF',
    staticOff.cfDataCalls().length === 0 && staticOff.log.puter.length === PATHS.length,
    `cf=${staticOff.cfDataCalls().length} puter=${staticOff.log.puter.length}`);
  // Bentuk kedua dari "statis off": endpoint 'on' tetapi sakelar induk statis mati.
  const inducMati = makeHarness({ cfConfig: { enabled: false, base: CF_BASE, endpoints: { ...ALL_ON } } });
  inducMati.api.cfApplyServerConfig({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE } }, 'server');
  check('(a) enabled:false statis tidak bisa dibatalkan server (server bukan atasan berkas)',
    ENDPOINT_KEYS.every(key => inducMati.api.cfMergedMode(key) === 'off'),
    ENDPOINT_KEYS.map(key => `${key}=${inducMati.api.cfMergedMode(key)}`).join(', '));
  // Bentuk ketiga: satu endpoint off di tengah endpoint lain yang on.
  const sebagian = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON, ai: 'off' } } });
  await boot(sebagian);
  await sebagian.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  await sebagian.api.coreWorkerExec('/api/tts/say', { method: 'POST' });
  check("(a) endpoint 'off' statis tetap off walau server mengizinkannya, tetangganya tetap hidup",
    sebagian.api.cfMergedMode('ai') === 'off' && sebagian.api.cfMergedMode('tts') === 'on'
    && sebagian.log.puter.length === 1 && sebagian.cfDataCalls().length === 1
    && sebagian.cfDataCalls()[0].url === `${CF_BASE}/api/tts/say`,
    `ai=${sebagian.api.cfMergedMode('ai')} tts=${sebagian.api.cfMergedMode('tts')} puter=${sebagian.log.puter.length}`);
  // Anti-vakum: mode statis 'shadow' pun tidak boleh dinaikkan server menjadi 'on'.
  const bayangan = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON, usage: 'shadow' } } });
  await boot(bayangan);
  check("(a) statis 'shadow' + server on ⇒ tetap 'shadow' (server tidak bisa menaikkan mode)",
    bayangan.api.cfMergedMode('usage') === 'shadow' && bayangan.api.cfEndpointMode('/api/usage/event') === 'shadow',
    `usage=${bayangan.api.cfMergedMode('usage')}`);

  /* ===================================================================================
   * (b) SERVER BISA MEMATIKAN flag yang statisnya on — kalau tidak, ini bukan kill switch
   * ================================================================================= */
  const kill = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    configBody: {
      protocol: '1.7',
      flags: { ...ALL_FLAGS_TRUE, cfAiEnabled: false },
      enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 60
    }
  });
  await boot(kill);
  await kill.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  await kill.api.coreWorkerExec('/api/tts/say', { method: 'POST' });
  check('(b) cfAiEnabled:false mematikan endpoint ai yang statisnya on',
    kill.api.cfMergedMode('ai') === 'off' && kill.log.puter.length === 1
    && kill.log.puter[0].url === `${PUTER_URL}/api/ai/chat`,
    `ai=${kill.api.cfMergedMode('ai')} puter=${kill.log.puter.map(p => p.url).join(',')}`);
  check('(b) endpoint lain TIDAK ikut mati (kill switch presisi, bukan pemadaman total)',
    kill.api.cfMergedMode('tts') === 'on' && kill.cfDataCalls().some(f => f.url === `${CF_BASE}/api/tts/say`),
    `tts=${kill.api.cfMergedMode('tts')} cf=${kill.cfDataCalls().map(f => f.url).join(',')}`);
  // Sakelar induk server: satu nilai mematikan ketujuh endpoint.
  const killAll = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    configBody: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE, cfApiEnabled: false }, enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 60 }
  });
  await boot(killAll);
  for (const p of PATHS) await killAll.api.coreWorkerExec(p, { method: 'POST' });
  check('(b) cfApiEnabled:false = sakelar induk server, mematikan ketujuh endpoint sekaligus',
    ENDPOINT_KEYS.every(key => killAll.api.cfMergedMode(key) === 'off')
    && killAll.cfDataCalls().length === 0 && killAll.log.puter.length === PATHS.length,
    `cf=${killAll.cfDataCalls().length} puter=${killAll.log.puter.length}`);
  // Lapis `enabled:{...}` (kill switch tingkat server) juga hanya bisa mematikan.
  const killFeature = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    configBody: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE, tts: false, coach: false }, ttlSeconds: 60 }
  });
  await boot(killFeature);
  check('(b) enabled:{tts:false,coach:false} mematikan tts dan ai walau flags-nya true',
    killFeature.api.cfMergedMode('tts') === 'off' && killFeature.api.cfMergedMode('ai') === 'off'
    && killFeature.api.cfMergedMode('quota') === 'on',
    `tts=${killFeature.api.cfMergedMode('tts')} ai=${killFeature.api.cfMergedMode('ai')} quota=${killFeature.api.cfMergedMode('quota')}`);
  // Flag yang HILANG dari jawaban server = mati, bukan diwarisi dari statis.
  const flagHilang = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    configBody: { protocol: '1.7', flags: { cfApiEnabled: true }, enabled: {}, ttlSeconds: 60 }
  });
  await boot(flagHilang);
  check('(b) flag yang tidak dikirim server berarti MATI (fail-closed), bukan warisan statis',
    ['auth', 'quota', 'ai', 'tts', 'usage'].every(key => flagHilang.api.cfMergedMode(key) === 'off')
    && flagHilang.api.cfMergedMode('health') === 'on',
    ENDPOINT_KEYS.map(key => `${key}=${flagHilang.api.cfMergedMode(key)}`).join(', '));
  // Nilai non-boolean ('true', 1, 'on') ditolak: flag yang ambigu harus berarti mati.
  const ambigu = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    configBody: { protocol: '1.7', flags: { cfApiEnabled: 'true', cfAiEnabled: 1, cfTtsEnabled: 'on' }, enabled: {}, ttlSeconds: 60 }
  });
  await boot(ambigu);
  check("(b) nilai flag non-boolean ('true', 1, 'on') ditolak, seluruh jalur mati",
    ENDPOINT_KEYS.every(key => ambigu.api.cfMergedMode(key) === 'off'),
    ENDPOINT_KEYS.map(key => `${key}=${ambigu.api.cfMergedMode(key)}`).join(', '));

  /* ===================================================================================
   * ANTI-VAKUM: jalur "hidup" harus benar-benar bisa hidup
   * ================================================================================= */
  const hidup = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } } });
  await boot(hidup);
  const answer = await hidup.api.coreWorkerExec('/api/quota/state', { method: 'GET' });
  check('anti-vakum: statis on + server on ⇒ CF benar-benar menyajikan jawaban (dua suara = hidup)',
    answer === hidup.cfResponse && hidup.cfDataCalls().length === 1
    && hidup.cfDataCalls()[0].url === `${CF_BASE}/api/quota/state` && hidup.log.puter.length === 0,
    `from=${answer?.__from} cf=${hidup.cfDataCalls().length} puter=${hidup.log.puter.length}`);
  check('anti-vakum: permintaan /api/config dikirim GET dengan cache:no-store dan tanpa cookie',
    hidup.configCalls().length === 1 && hidup.configCalls()[0].options.method === 'GET'
    && hidup.configCalls()[0].options.cache === 'no-store'
    && hidup.configCalls()[0].options.credentials === 'omit'
    && hidup.configCalls()[0].url === `${CF_BASE}/api/config`,
    JSON.stringify(hidup.configCalls().map(f => ({ url: f.url, method: f.options.method, cache: f.options.cache, credentials: f.options.credentials }))));

  /* ===================================================================================
   * (c) SERVER TAK TERJANGKAU = jalur CF mati, aplikasi tetap jalan
   * ================================================================================= */
  const mati = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    fetchImpl: async url => { if (String(url).endsWith('/api/config')) throw new Error('network_down'); return { ok: true, status: 200 }; }
  });
  let refreshThrew = false;
  mati.runIdle();
  const stateAfterFail = await mati.api.cfConfigRefresh().catch(() => { refreshThrew = true; return null; });
  check('(c) server tak terjangkau: pengambil tidak pernah menolak (boot mustahil gagal karenanya)',
    refreshThrew === false && stateAfterFail?.status === 'unreachable',
    `threw=${refreshThrew} status=${stateAfterFail?.status} reason=${stateAfterFail?.reason}`);
  for (const p of PATHS) await mati.api.coreWorkerExec(p, { method: 'POST' });
  check('(c) server tak terjangkau: seluruh jalur CF mati dan ketujuh path dilayani Puter',
    ENDPOINT_KEYS.every(key => mati.api.cfMergedMode(key) === 'off')
    && mati.cfDataCalls().length === 0 && mati.log.puter.length === PATHS.length,
    `cf=${mati.cfDataCalls().length} puter=${mati.log.puter.length}`);
  // HTTP 500 dan 403 juga harus berarti mati, bukan "anggap saja boleh".
  const limaRatus = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    fetchImpl: async url => (String(url).endsWith('/api/config') ? { ok: false, status: 500, json: async () => ({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE } }) } : { ok: true, status: 200 })
  });
  await boot(limaRatus);
  check('(c) HTTP 500 di /api/config: body TIDAK dipercaya, seluruh jalur CF mati',
    limaRatus.api.state().status === 'unreachable'
    && ENDPOINT_KEYS.every(key => limaRatus.api.cfMergedMode(key) === 'off'),
    `status=${limaRatus.api.state().status} reason=${limaRatus.api.state().reason}`);
  // Timeout: server yang menggantung tidak boleh menahan apa pun, dan hasilnya tetap mati.
  const gantung = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    remote: { timeoutMs: 40 },
    fetchImpl: (url, opts) => new Promise((resolve, reject) => {
      const signal = opts?.signal;
      if (signal) signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
      setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE } }) }), 5000);
    })
  });
  const t0 = Date.now();
  gantung.runIdle();
  const gantungState = await gantung.api.cfConfigRefresh();
  const gantungMs = Date.now() - t0;
  check('(c) server menggantung: permintaan dibatalkan oleh timeout dan hasilnya MATI',
    gantungState.status === 'unreachable' && gantungState.reason === 'timeout' && gantungMs < 2000,
    `status=${gantungState.status} reason=${gantungState.reason} ms=${gantungMs}`);
  const gantungAnswer = await gantung.api.coreWorkerExec('/api/ai/chat', { method: 'POST' });
  check('(c) setelah timeout, aplikasi tetap jalan lewat Puter (bukan galat yang dilihat murid)',
    gantungAnswer === gantung.puterResponse, String(gantungAnswer?.__from));
  // JSON rusak (HTML halaman galat, misalnya) = mati juga.
  const jsonRusak = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    fetchImpl: async url => (String(url).endsWith('/api/config') ? { ok: true, status: 200, json: async () => { throw new Error('invalid_json'); } } : { ok: true, status: 200 })
  });
  await boot(jsonRusak);
  check('(c) jawaban bukan JSON: seluruh jalur CF mati, tanpa pengecualian yang naik ke boot',
    jsonRusak.api.state().status === 'unreachable' && ENDPOINT_KEYS.every(key => jsonRusak.api.cfMergedMode(key) === 'off'),
    `status=${jsonRusak.api.state().status}`);
  // Keadaan SEBELUM jawaban tiba juga harus mati: jendela ketidakpastian berjalan di Puter.
  const belumJawab = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } } });
  check("(c) sebelum jawaban server tiba, status 'idle' dan seluruh jalur CF masih mati",
    belumJawab.api.state().status === 'idle' && ENDPOINT_KEYS.every(key => belumJawab.api.cfMergedMode(key) === 'off'),
    `status=${belumJawab.api.state().status}`);

  /* ===================================================================================
   * (d) PROTOKOL TIDAK COCOK = SELURUH CF MATI
   * ================================================================================= */
  for (const badProtocol of ['1.6', '1.8', '', '2.0']) {
    const beda = makeHarness({
      cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
      configBody: { protocol: badProtocol, flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 60 }
    });
    await boot(beda);
    for (const p of PATHS) await beda.api.coreWorkerExec(p, { method: 'POST' });
    check(`(d) protocol '${badProtocol || '(kosong)'}' ≠ 1.7 ⇒ ketujuh endpoint mati walau semua flag true`,
      beda.api.state().status === 'protocol_mismatch'
      && ENDPOINT_KEYS.every(key => beda.api.cfMergedMode(key) === 'off')
      && beda.cfDataCalls().length === 0 && beda.log.puter.length === PATHS.length,
      `status=${beda.api.state().status} cf=${beda.cfDataCalls().length} puter=${beda.log.puter.length}`);
  }
  check('(d) protokol yang diharapkan dibaca dari core-config.js, bukan ditulis ulang di app.js',
    /CF_REMOTE_PROTOCOL=String\(CF_REMOTE\.protocol\|\|'1\.7'\)/.test(killCode)
    && /protocol!==CF_REMOTE_PROTOCOL/.test(killCode),
    'cari CF_REMOTE_PROTOCOL di blok kill switch');

  /* ===================================================================================
   * (e) CERMIN BERUMUR PENDEK: MAKS 5 MENIT
   * ================================================================================= */
  const FIVE_MIN = 300000;
  check('(e) core-config.js: mirrorTtlMs tidak lebih dari 5 menit',
    Number(REPO_REMOTE?.mirrorTtlMs) > 0 && Number(REPO_REMOTE.mirrorTtlMs) <= FIVE_MIN,
    `mirrorTtlMs=${REPO_REMOTE?.mirrorTtlMs}`);
  check('(e) batas 5 menit dipaksa di app.js (nilai core-config.js pun dipangkas)',
    /CF_MIRROR_TTL_CAP_MS=300000/.test(killCode) && /Math\.min\([\s\S]{0,120}CF_MIRROR_TTL_CAP_MS\)/.test(killCode),
    'cari CF_MIRROR_TTL_CAP_MS di blok kill switch');

  const cermin = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } } });
  await boot(cermin);
  const MIRROR_KEY = REPO_REMOTE?.mirrorKey || 'fiezel-cf-flags-mirror-v1';
  const mirrorBox = JSON.parse(cermin.sessionData[MIRROR_KEY] || 'null');
  check('(e) hasil server dicerminkan ke sessionStorage dengan cap waktu dan TTL ≤ 5 menit',
    Boolean(mirrorBox) && mirrorBox.v === 1 && Number(mirrorBox.at) > 0 && Number(mirrorBox.ttl) <= FIVE_MIN
    && mirrorBox.data?.protocol === '1.7',
    JSON.stringify(mirrorBox && { v: mirrorBox.v, ttl: mirrorBox.ttl, at: mirrorBox.at > 0 }));

  // Cermin masih segar (4 menit) ⇒ boot berikutnya tidak menembak server sama sekali.
  const freshBox = JSON.stringify({ v: 1, at: Date.now() - 4 * 60 * 1000, ttl: FIVE_MIN, data: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 60 } });
  const segar = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } }, sessionStore: { [MIRROR_KEY]: freshBox } });
  segar.runIdle();
  await segar.api.coreWorkerExec('/api/tts/say', { method: 'POST' });
  check('(e) cermin umur 4 menit dipakai: NOL permintaan /api/config, flag tetap berlaku',
    segar.configCalls().length === 0 && segar.api.state().source === 'mirror'
    && segar.api.state().status === 'ok' && segar.api.cfMergedMode('tts') === 'on',
    `config=${segar.configCalls().length} source=${segar.api.state().source}`);
  // Navigasi antar layar: berkali-kali memakai transport tidak menambah satu pun permintaan.
  for (let i = 0; i < 12; i++) await segar.api.coreWorkerExec('/api/usage/event', { method: 'POST' });
  check('(e) 13 panggilan transport sesudahnya tetap NOL permintaan /api/config (navigasi tidak menembak server)',
    segar.configCalls().length === 0, `config=${segar.configCalls().length}`);

  // Cermin 5 menit + 1 detik ⇒ kedaluwarsa, dibuang, dan server ditembak lagi.
  const staleBox = JSON.stringify({ v: 1, at: Date.now() - (FIVE_MIN + 1000), ttl: FIVE_MIN, data: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE } } });
  const basi = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } }, sessionStore: { [MIRROR_KEY]: staleBox } });
  check('(e) cermin umur 5 menit 1 detik DIBUANG (tidak dipakai sebagai kebenaran)',
    basi.api.cfMirrorRead() === null && basi.api.state().status === 'idle',
    `status=${basi.api.state().status}`);
  await boot(basi);
  check('(e) sesudah cermin kedaluwarsa, server ditembak ulang sekali',
    basi.configCalls().length === 1 && basi.api.state().source === 'server',
    `config=${basi.configCalls().length} source=${basi.api.state().source}`);
  // Server yang mengaku ttlSeconds sehari tidak boleh memperpanjang cermin.
  const ttlPanjang = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    configBody: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 86400 }
  });
  await boot(ttlPanjang);
  const longBox = JSON.parse(ttlPanjang.sessionData[MIRROR_KEY] || 'null');
  check("(e) server mengaku ttlSeconds 86400 ⇒ cermin tetap dipangkas ke 5 menit (klien yang memutuskan)",
    Number(longBox?.ttl) === FIVE_MIN, `ttl=${longBox?.ttl}`);
  // Cermin dengan ttl karangan (satu hari) juga dipangkas saat DIBACA, bukan hanya saat ditulis.
  const cerminCurang = makeHarness({
    cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } },
    sessionStore: { [MIRROR_KEY]: JSON.stringify({ v: 1, at: Date.now() - 10 * 60 * 1000, ttl: 86400000, data: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE } } }) }
  });
  check('(e) cermin yang membawa ttl karangan (1 hari) tetap dianggap kedaluwarsa pada 5 menit',
    cerminCurang.api.cfMirrorRead() === null && cerminCurang.api.state().status !== 'ok',
    `status=${cerminCurang.api.state().status}`);

  /* ===================================================================================
   * (f) NOL PENULISAN localStorage BERUMUR PANJANG
   * ================================================================================= */
  check('(f) blok kill switch tidak menyebut localStorage sama sekali',
    !/localStorage/.test(killCode), 'cari localStorage di blok kill switch');
  check('(f) cermin memakai sessionStorage (mati bersama tab), bukan penyimpanan permanen',
    /sessionStorage\?\.getItem/.test(killCode) && /sessionStorage\?\.setItem/.test(killCode),
    'cari sessionStorage di blok kill switch');
  const localWrites = [staticOff, kill, killAll, mati, cermin, segar, basi, ttlPanjang, hidup, gantung]
    .flatMap(h => h.log.localWrites);
  check('(f) sepuluh skenario dijalankan: NOL panggilan localStorage.setItem/removeItem',
    localWrites.length === 0, localWrites.join(', ') || '0');
  const sessionKeys = new Set([...cermin.log.sessionWrites, ...ttlPanjang.log.sessionWrites]);
  check('(f) hanya SATU kunci sessionStorage yang ditulis, dan namanya yang dideklarasikan',
    sessionKeys.size === 1 && sessionKeys.has(MIRROR_KEY), [...sessionKeys].join(', '));
  check('(f) app.js tidak menulis flag CF ke localStorage di tempat lain',
    !/localStorage\.setItem\((?:'|")fiezel-cf/.test(appCode), 'cari localStorage.setItem("fiezel-cf...") di app.js');

  /* ===================================================================================
   * (g) BOOT TIDAK DIBLOKIR
   * ================================================================================= */
  // Pernyataan tentang bentuk kode: tidak ada satu pun `await` pada pengambil config.
  const awaitedFetcher = /await\s+(?:self\.)?(?:cfConfigRefresh|cfFetchServerConfig|cfConfigBootOnce|FiezelCfKillSwitch\.refresh)/.test(appCode);
  check('(g) tidak ada `await` pada pengambil config di seluruh app.js',
    !awaitedFetcher, 'cari await cfConfigRefresh/cfFetchServerConfig/cfConfigBootOnce');
  const loadAt = app.indexOf('async function load(){');
  const loadBody = loadAt >= 0 ? app.slice(loadAt, app.indexOf('\n// m025-115: dua sistem ikon', loadAt)) : '';
  check('(g) fungsi boot load() tidak menyebut pengambil config sama sekali',
    loadBody.length > 0 && !/cfConfigRefresh|cfFetchServerConfig|cfConfigBootOnce|FiezelCfKillSwitch/.test(loadBody),
    `panjang load()=${loadBody.length}`);
  check('(g) pengambil dijadwalkan lewat requestIdleCallback (fallback setTimeout), bukan dipanggil langsung',
    /requestIdleCallback\(run,\{timeout:3000\}\)/.test(killCode) && /setTimeout\(run,1500\)/.test(killCode),
    'cari penjadwalan di blok kill switch');

  // DIUKUR, bukan diasumsikan: saat blok dievaluasi (= boot), belum ada satu pun permintaan.
  const bootProbe = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } }, configDelayMs: 300 });
  check('(g) pada saat blok selesai dievaluasi: NOL permintaan jaringan, hanya satu tugas idle terjadwal',
    bootProbe.log.fetches.length === 0 && bootProbe.log.idle.length === 1,
    `fetch=${bootProbe.log.fetches.length} idle=${bootProbe.log.idle.length}`);
  // Kelanjutan boot (tugas mikro/makro sesudahnya) harus selesai SEBELUM jawaban server tiba.
  const bootStart = Date.now();
  bootProbe.runIdle();
  let bootContinuationMs = -1;
  await new Promise(resolve => setTimeout(() => { bootContinuationMs = Date.now() - bootStart; resolve(); }, 0));
  const configState = await bootProbe.api.cfConfigRefresh();
  const configMs = Date.now() - bootStart;
  /* 2026-08-30: ambang bawah configMs diberi toleransi 15ms terhadap configDelayMs.
     Bentuk lama menuntut `configMs >= 300` untuk penundaan 300ms, dan itu FLAKY: setTimeout
     dijamin menunggu SEKURANG-KURANGNYA durasinya menurut jam timer, tetapi diukur dengan
     Date.now() ia sah tiba di 299ms karena pembulatan/koalesensi timer. Terbukti di CI
     2026-08-30 pada satu commit yang sama: run push HIJAU, run pull_request MERAH dengan
     `boot=1ms config=299ms` - selisih 1ms, bukan perubahan perilaku.
     Yang dijaga tidak berubah dan tetap berjarak ratusan milidetik: kelanjutan boot (<100ms)
     selesai JAUH sebelum jawaban config tiba (~300ms). Gerbang yang merah karena undian
     mengajari orang menjalankan ulang sampai hijau. */
  const CONFIG_DELAY_MS = 300;
  const TOLERANSI_TIMER_MS = 15;
  check('(g) diukur: kelanjutan boot selesai jauh sebelum jawaban /api/config tiba',
    bootContinuationMs >= 0 && bootContinuationMs < 100
      && configMs >= CONFIG_DELAY_MS - TOLERANSI_TIMER_MS
      && configMs > bootContinuationMs + 100
      && configState.status === 'ok',
    `boot=${bootContinuationMs}ms config=${configMs}ms`);
  /* Keadaan repo hari ini. Bentuk lama assert ini: "semua statis off ⇒ NOL permintaan dan
   * NOL tugas terjadwal". Sejak A6 justru KEBALIKANNYA yang harus benar, dan ini inti
   * paketnya: karena ada endpoint hidup, pengambil kill switch WAJIB terjadwal — kalau tidak,
   * jalur CF hidup tanpa sakelar mati dari server. Yang tetap dijaga: satu permintaan saja,
   * dan tidak ada permintaan DATA yang jalan sebelum ada pemanggil. */
  const hariIni = makeHarness({ cfConfig: REPO_CF });
  check('(g) keadaan repo hari ini: pengambil kill switch terjadwal (jalur hidup = sakelar wajib terpasang)',
    hariIni.log.idle.length === 1 && hariIni.log.fetches.length === 0
    && hariIni.api.state().status === 'idle',
    `fetch=${hariIni.log.fetches.length} idle=${hariIni.log.idle.length} status=${hariIni.api.state().status}`);
  await boot(hariIni);
  check('(g) keadaan repo hari ini: TEPAT satu permintaan, dan itu /api/config — nol permintaan data',
    hariIni.log.fetches.length === 1 && hariIni.configCalls().length === 1
    && hariIni.cfDataCalls().length === 0 && hariIni.api.state().status === 'ok',
    `fetch=${hariIni.log.fetches.map(f => f.url).join(',')} status=${hariIni.api.state().status}`);
  // Boot dipanggil dua kali (mis. modul dimuat ulang) tetap satu permintaan.
  const duaKali = makeHarness({ cfConfig: { enabled: true, base: CF_BASE, endpoints: { ...ALL_ON } } });
  check('(g) cfConfigBootOnce() hanya sekali per boot walau dipanggil lagi',
    duaKali.api.cfConfigBootOnce() === 'already' && duaKali.log.idle.length === 1,
    `idle=${duaKali.log.idle.length}`);
  duaKali.runIdle();
  await Promise.all([duaKali.api.cfConfigRefresh(), duaKali.api.cfConfigRefresh()]);
  check('(g) dua refresh serentak dibagi satu permintaan (tanpa badai permintaan)',
    duaKali.configCalls().length === 1, `config=${duaKali.configCalls().length}`);

  /* ===================================================================================
   * 5. Panel diagnostik bisa membaca keadaan gabungan
   * ================================================================================= */
  const snap = kill.api.cfKillSwitchSnapshot();
  check('panel: snapshot memuat flag statis, flag server, hasil gabungan, dan waktu pengambilan',
    snap && snap.statis && snap.server && snap.gabungan && typeof snap.terakhirDiambil === 'string'
    && snap.statis.endpoints.ai === 'on' && snap.server.flags.cfAiEnabled === false
    && snap.gabungan.ai === 'off' && snap.server.protokolDiharapkan === '1.7'
    && snap.cermin.penyimpanan === 'sessionStorage' && snap.cermin.umurMaksMs === FIVE_MIN,
    JSON.stringify({ statis: snap?.statis?.endpoints?.ai, server: snap?.server?.flags?.cfAiEnabled, gabungan: snap?.gabungan?.ai, at: snap?.terakhirDiambil }));
  check('panel: snapshot tidak membawa alamat server atau nilai rahasia apa pun',
    !JSON.stringify(snap).includes(CF_BASE) && !/token|secret|kunci[A-Z]/.test(JSON.stringify(snap).replace(/"kunci":"fiezel-cf-flags-mirror-v1"/, '')),
    'snapshot hanya membawa boolean, mode, dan waktu');
  check('panel diagnostik membaca snapshot dari sumbernya (FiezelCfKillSwitch), bukan memparse ulang',
    /cfKillSwitch:\s*safe\(/.test(diagPanel) && /root\.FiezelCfKillSwitch/.test(diagPanel)
    && /gate\.snapshot\(\)/.test(diagPanel),
    'cari cfKillSwitch di features/neural-voice/fiezel-diag-panel.js');
  check('panel: keadaan sebelum modul termuat dijawab kalimat, bukan galat',
    /kill switch CF belum dimuat/.test(diagPanel), 'cari kalimat cadangan di panel diagnostik');

  /* ===================================================================================
   * A6. PENYALAAN KLIEN TAHAP 1 — analytics saja, dan buktinya dengan MENJALANKAN
   * =================================================================================
   * Bagian ini menjawab lima pertanyaan yang tidak boleh dijawab dengan klaim:
   *   (a) `enabled:false` mengalahkan SETIAP endpoint 'on' dan menghasilkan NOL fetch CF;
   *   (c) dua endpoint yang dinyalakan benar-benar CUKUP untuk membuat pemancar analytics
   *       jalan — diuji dengan MENJALANKAN blok pemancar app.js atas config repo, bukan
   *       dengan membacanya;
   *   (d) `base` kosong diperlakukan sama dengan off;
   *   (e) invarian precache sw.js yang menjadi dasar jawaban latensi di laporan;
   *   + kill switch server tetap bisa mematikan jalur ini TANPA deploy klien. */

  /* --- (a) rollback klien: satu nilai mengalahkan tujuh endpoint, dan NOL fetch --------- */
  {
    const mati = makeHarness({ cfConfig: { enabled: false, base: CF_BASE, endpoints: { ...ALL_ON } } });
    mati.api.cfApplyServerConfig({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE } }, 'server');
    for (const p of PATHS) await mati.api.coreWorkerExec(p, { method: 'POST' });
    check('(a-A6) enabled:false + ketujuh endpoint on + server semua true ⇒ ketujuh gabungan off',
      ENDPOINT_KEYS.every(key => mati.api.cfMergedMode(key) === 'off'),
      ENDPOINT_KEYS.map(key => `${key}=${mati.api.cfMergedMode(key)}`).join(', '));
    check('(a-A6) enabled:false ⇒ NOL fetch ke CF sama sekali (termasuk /api/config), semua ke Puter',
      mati.log.fetches.length === 0 && mati.log.puter.length === PATHS.length && mati.log.idle.length === 0,
      `fetch=${mati.log.fetches.length} puter=${mati.log.puter.length} idle=${mati.log.idle.length}`);
  }

  /* --- (d) base kosong = off, walau enabled:true dan semua endpoint 'on' --------------- */
  for (const [nama, baseValue] of [['base kosong', ''], ['base spasi', '   '], ['base hilang', undefined]]) {
    const tanpaBase = makeHarness({ cfConfig: { enabled: true, base: baseValue, endpoints: { ...ALL_ON } } });
    tanpaBase.api.cfApplyServerConfig({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE } }, 'server');
    for (const p of PATHS) await tanpaBase.api.coreWorkerExec(p, { method: 'POST' });
    check(`(d-A6) ${nama} diperlakukan sama dengan off: ketujuh gabungan off, NOL fetch`,
      ENDPOINT_KEYS.every(key => tanpaBase.api.cfMergedMode(key) === 'off')
      && tanpaBase.log.fetches.length === 0 && tanpaBase.log.puter.length === PATHS.length,
      `fetch=${tanpaBase.log.fetches.length} puter=${tanpaBase.log.puter.length} modes=${ENDPOINT_KEYS.map(k => tanpaBase.api.cfMergedMode(k)).join(',')}`);
  }

  /* --- kill switch server masih menjangkau jalur baru TANPA deploy klien --------------- */
  {
    const dimatikanServer = makeHarness({
      cfConfig: REPO_CF,
      configBody: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE, cfAnalyticsEnabled: false }, enabled: { ...KILL_ALL_TRUE }, ttlSeconds: 60 }
    });
    await boot(dimatikanServer);
    await dimatikanServer.api.coreWorkerExec('/api/usage/events', { method: 'POST' });
    check('(A6) cfAnalyticsEnabled:false mematikan usage yang statisnya on — tanpa deploy klien',
      dimatikanServer.api.cfMergedMode('usage') === 'off'
      && dimatikanServer.cfDataCalls().length === 0 && dimatikanServer.log.puter.length === 1,
      `usage=${dimatikanServer.api.cfMergedMode('usage')} cf=${dimatikanServer.cfDataCalls().length}`);
    const matiFitur = makeHarness({
      cfConfig: REPO_CF,
      configBody: { protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: { ...KILL_ALL_TRUE, analytics: false }, ttlSeconds: 60 }
    });
    await boot(matiFitur);
    check('(A6) enabled:{analytics:false} juga mematikan jalur usage (dua tuas server, bukan satu)',
      matiFitur.api.cfMergedMode('usage') === 'off', `usage=${matiFitur.api.cfMergedMode('usage')}`);
  }

  /* --- kopling rute 'usage' SUDAH DIPUTUS (T-030) ---------------------------------------
   *
   * Bentuk lama assert ini menuntut koplingnya TETAP ADA: ia lulus bila keempat path pergi
   * ke Cloudflare. Maksudnya baik — mendokumentasikan cacat yang diketahui — tetapi akibatnya
   * ia berubah menjadi PENJAGA CACAT: merah pada perbaikan, hijau pada kerusakan. Ini kejadian
   * KETIGA dari pola yang sama dalam satu hari (dua sebelumnya: gerbang analytics yang menuntut
   * app.js TIDAK memuat pemancar, dan rate-anon-test yang menuntut celah tarif tetap ada).
   *
   * Yang benar diassert adalah AKIBATNYA ke murid: hanya /api/usage/* yang pindah ke Cloudflare,
   * dan tiga path yang Worker-nya belum ada (SLOT 5 = BELUM; diuji ke produksi: 404, 404, 404)
   * TETAP di jalur lama. Kalau seseorang menggabungkan lagi keempatnya sebelum SLOT 5 ada,
   * assert ini merah — dan itulah gunanya, karena /api/feedback yang 404 TERLIHAT MURID sebagai
   * toast "Gagal mengirim".
   */
  {
    const repoHidup = makeHarness({ cfConfig: REPO_CF });
    await boot(repoHidup);
    await repoHidup.api.coreWorkerExec('/api/usage/events', { method: 'POST' });
    check('(A6) hanya /api/usage/* pindah ke CF',
      repoHidup.cfDataCalls().length === 1 && repoHidup.log.puter.length === 0,
      repoHidup.cfDataCalls().map(f => f.url.replace(CF_BASE, '')).join(','));

    const takTerpetakan = makeHarness({ cfConfig: REPO_CF });
    await boot(takTerpetakan);
    for (const p of ['/api/activity', '/api/feedback', '/api/policy/next']) {
      await takTerpetakan.api.coreWorkerExec(p, { method: 'POST' });
    }
    check('(A6/T-030) activity, feedback, policy TETAP di jalur lama — nol permintaan CF',
      takTerpetakan.cfDataCalls().length === 0 && takTerpetakan.log.puter.length === 3,
      `cf=${takTerpetakan.cfDataCalls().length} puter=${takTerpetakan.log.puter.length}`);
    const puterTetap = makeHarness({ cfConfig: REPO_CF });
    await boot(puterTetap);
    for (const p of ['/api/ai/chat', '/api/tts/say', '/api/auth/session', '/api/quota/state', '/health']) {
      await puterTetap.api.coreWorkerExec(p, { method: 'POST' });
    }
    check('(A6) murid TETAP memakai Puter untuk ai, tts, auth, quota, health — nol permintaan CF',
      puterTetap.cfDataCalls().length === 0 && puterTetap.log.puter.length === 5,
      `cf=${puterTetap.cfDataCalls().length} puter=${puterTetap.log.puter.length}`);
  }

  /* --- (c) PEMANCAR ANALYTICS DIJALANKAN atas config repo ------------------------------ */
  {
    const EMIT_BEGIN = '/* A1-ANALYTICS-EMITTER-BEGIN';
    const EMIT_END = '/* A1-ANALYTICS-EMITTER-END */';
    const emitAt = app.indexOf(EMIT_BEGIN);
    const emitEndAt = app.indexOf(EMIT_END);
    check('(c-A6) blok pemancar analytics bisa dipotong dari app.js lewat sentinelnya',
      emitAt > 0 && emitEndAt > emitAt, `begin=${emitAt} end=${emitEndAt}`);
    const emitBlock = emitAt > 0 && emitEndAt > emitAt ? app.slice(emitAt, emitEndAt) : '';

    // Harness pemancar: blok kill switch + transport + pemancar, dijalankan bersama supaya
    // `cfStaticMode`/`cfServerAllows` yang dipakai pemancar adalah yang ASLI, bukan tiruan.
    const runEmitter = (cfConfig, flags, killed) => {
      const h = makeHarness({
        cfConfig,
        configBody: { protocol: '1.7', flags, enabled: killed, ttlSeconds: 60 }
      });
      // Timer yang dipasang SEBELUM blok pemancar (milik pengambil kill switch) dicatat dulu,
      // supaya yang diukur adalah timer pemancar itu sendiri — bukan warisan tetangganya.
      const idleSebelum = h.log.idle.length;
      // Blok pemancar dijalankan di konteks yang SAMA supaya ia memakai fungsi gerbang asli.
      vm.runInContext(
        'const LEVELS=' + JSON.stringify(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) + ';'
        + 'var state={daily:{attempts:3}};'
        + emitBlock
        + '\n;globalThis.__an=self.FiezelAnalyticsEmitter;',
        h.sandboxRef, { filename: 'app.js#a1-analytics-emitter' });
      return { h, an: h.sandboxRef.__an, timerPemancar: h.log.idle.length - idleSebelum };
    };

    // 1. Config REPO + server mengizinkan analytics ⇒ gerbang pemancar TERBUKA.
    const hidupPemancar = runEmitter(REPO_CF, { ...ALL_FLAGS_TRUE }, { ...KILL_ALL_TRUE });
    await boot(hidupPemancar.h);
    check('(c-A6) config repo + server izin ⇒ anGateOpen() BENAR-BENAR true (dijalankan, bukan dibaca)',
      hidupPemancar.an && hidupPemancar.an.gateOpen() === true,
      `gateOpen=${hidupPemancar.an && hidupPemancar.an.gateOpen()}`);
    check('(c-A6) config repo ⇒ pemancar memasang TEPAT satu timernya sendiri saat blok dimuat',
      hidupPemancar.timerPemancar === 1, `timer pemancar=${hidupPemancar.timerPemancar}`);
    check('(c-A6) pemancar memakai base yang sama dengan core-config.js (satu alamat, bukan dua)',
      hidupPemancar.h.api.cfEndpointMode('/api/usage/events') === 'on',
      `mode=${hidupPemancar.h.api.cfEndpointMode('/api/usage/events')}`);

    // 2. Anti-vakum: kalau `usage` statis off, pemancar mati walau server mengizinkan semua.
    const matiPemancar = runEmitter({ enabled: true, base: CF_BASE, endpoints: { ...ALL_ON, usage: 'off' } },
      { ...ALL_FLAGS_TRUE }, { ...KILL_ALL_TRUE });
    await boot(matiPemancar.h);
    check('(c-A6) anti-vakum: usage statis off ⇒ gerbang pemancar TERTUTUP dan NOL timer dipasang',
      matiPemancar.an && matiPemancar.an.gateOpen() === false && matiPemancar.timerPemancar === 0,
      `gateOpen=${matiPemancar.an && matiPemancar.an.gateOpen()} timer pemancar=${matiPemancar.timerPemancar}`);

    // 3. Anti-vakum kedua: config repo tapi server MEMATIKAN analytics ⇒ gerbang tertutup.
    const serverMatikan = runEmitter(REPO_CF, { ...ALL_FLAGS_TRUE, cfAnalyticsEnabled: false }, { ...KILL_ALL_TRUE });
    await boot(serverMatikan.h);
    check('(c-A6) config repo tapi server mematikan analytics ⇒ pemancar ikut mati',
      serverMatikan.an && serverMatikan.an.gateOpen() === false,
      `gateOpen=${serverMatikan.an && serverMatikan.an.gateOpen()}`);

    // 4. Anti-vakum ketiga: sebelum jawaban server tiba, gerbang WAJIB tertutup (arah aman).
    const belumDijawab = runEmitter(REPO_CF, { ...ALL_FLAGS_TRUE }, { ...KILL_ALL_TRUE });
    check('(c-A6) sebelum jawaban /api/config tiba, gerbang pemancar tertutup (fail-closed)',
      belumDijawab.an && belumDijawab.an.gateOpen() === false,
      `gateOpen=${belumDijawab.an && belumDijawab.an.gateOpen()}`);
  }

  /* --- (e) INVARIAN PRECACHE sw.js yang menjadi dasar jawaban latensi ------------------ */
  {
    const sw = read('sw.js');
    const swCode = stripComments(sw);
    const swRev = (swCode.match(/SW_REV\s*=\s*'([^']+)'/) || [])[1] || '';
    check('(e) sw.js: core-config.js memang ikut precache (jadi flag baru TIDAK instan)',
      /['"]\.?\/?core-config\.js['"]/.test(swCode) && /ASSETS\s*=/.test(swCode),
      'daftar ASSETS sw.js');
    check('(e) sw.js: nama cache shell diturunkan dari SW_REV (generasi baru = SW_REV baru)',
      Boolean(swRev) && /SHELL_CACHE\s*=\s*`fiezel-shell-\$\{SW_REV\}`/.test(swCode),
      `SW_REV=${swRev}`);
    /* Assert ini pernah LOLOS dari mutasi terarah: bentuk pertamanya hanya mencari
     * `new Request(..., {cache:'reload'})` di mana pun di sw.js, dan sw.js punya DUA tempat
     * memakai pola itu (precache shell + revalidasi navigasi). Mengubah yang precache jadi
     * 'default' tetap hijau karena yang navigasi masih cocok. Sekarang yang dipatok adalah
     * jalur PRECACHE-nya sendiri: `shellRequests()` memetakan ASSETS dengan cache:'reload',
     * dan install memakai fungsi itu lewat addAll. */
    check('(e) sw.js: precache shell mengunduh ulang ASSETS dengan cache:\'reload\' (bukan cache HTTP)',
      /shellRequests\s*=\s*\(\)\s*=>\s*ASSETS\.map\(\s*\w+\s*=>\s*new Request\(\s*\w+\s*,\s*\{\s*cache:\s*'reload'\s*\}\s*\)\s*\)/.test(swCode)
      && /addAll\(\s*shellRequests\(\)\s*\)/.test(swCode)
      && /caches\.open\(\s*SHELL_CACHE\s*\)/.test(swCode),
      "cari shellRequests()=ASSETS.map(...cache:'reload') + addAll(shellRequests()) di sw.js");
    check('(e) sw.js: activate MENGHAPUS generasi shell lama (fiezel-shell-*)',
      /caches\.keys\(\)/.test(swCode) && /fiezel-shell-/.test(swCode) && /caches\.delete\(/.test(swCode),
      'pembersihan cache lama di activate');
    /* Assert ini juga pernah lolos mutasi: bentuk pertamanya menuntut tanda kurung
     * (`skipWaiting(`), jadi penyisipan `self.skipWaiting;` — atau `const f=self.skipWaiting`
     * yang dipanggil belakangan lewat alias — tetap hijau. Sekarang SETIAP penyebutan nama
     * itu di kode (komentar sudah dibuang) merah. */
    check('(e) sw.js: NOL penyebutan skipWaiting/clients.claim — inilah sebabnya config baru menunggu',
      !/skipWaiting/.test(swCode) && !/clients\s*\.\s*claim/.test(swCode),
      'sw.js tidak mengambil alih klien yang sedang jalan');
    check('(e) sw.js: ada jalur pemeriksaan pembaruan (registration.update) supaya SW_REV baru terdeteksi',
      /registration\.update\(\)/.test(swCode), 'cari registration.update() di sw.js');
    // Invarian penanda versi: config baru hanya sampai kalau SW_REV naik, dan yang menaikkan
    // adalah tools/bump-build.mjs (bukan tangan). Keberadaan arbiter itu ikut dijaga.
    check('(e) arbiter versi ada dan menyentuh ketiga penanda (SW_REV, PAGE_BUILD, DIAG_BUILD)',
      fs.existsSync(path.join(root, 'tools', 'bump-build.mjs'))
      && /SW_REV/.test(read('tools/bump-build.mjs'))
      && /FIEZEL_PAGE_BUILD/.test(read('tools/bump-build.mjs'))
      && /DIAG_BUILD/.test(read('tools/bump-build.mjs')),
      'tools/bump-build.mjs');
  }

  /* ===================================================================================
   * 6. Invarian build tidak ikut naik (wewenang MASTER saat merge)
   * ================================================================================= */
  /* Dulu: "FIEZEL_PAGE_BUILD tetap m025-172" - pagar agar paket kerja tidak menaikkan versi.
   * Pagar itu memerahkan gerbang begitu master menaikkan versi secara sah, padahal tidak ada
   * yang rusak. Kontrak sesungguhnya adalah tiga penanda menunjuk versi yang SAMA. */
  {
    const page = (config.match(/FIEZEL_PAGE_BUILD='(m025-\d+)'/) || [])[1] || null;
    const swSrc = read('sw.js');
    const diagSrc = read('features/neural-voice/fiezel-diag-panel.js');
    const sw = (swSrc.match(/SW_REV='(m025-\d+)/) || [])[1] || null;
    const diag = (diagSrc.match(/DIAG_BUILD = '(m025-\d+)'/) || [])[1] || null;
    check('invarian build utuh: SW_REV = DIAG_BUILD = FIEZEL_PAGE_BUILD',
      Boolean(page) && page === sw && page === diag,
      String(page) + ' / ' + String(sw) + ' / ' + String(diag));
  }

  /* ================================================================================= */
  const report = {
    schema: 'fiezel-cf-config-killswitch-v1',
    pass: !failed,
    counts: {
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length
    },
    measured: { bootContinuationMs, configArrivalMs: configMs, hangTimeoutMs: gantungMs },
    checks
  };
  fs.writeFileSync(path.join(root, 'CF-CONFIG-KILLSWITCH-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) {
    console.log(`FIEZEL cf-config-killswitch gate: FAIL (${report.counts.fail} assert merah)`);
    process.exitCode = 1;
  } else {
    console.log(`FIEZEL cf-config-killswitch gate: PASS (${report.counts.pass} assert)`);
  }
})().catch(error => {
  console.error('FIEZEL cf-config-killswitch gate: FAIL (harness melempar)');
  console.error(error);
  process.exitCode = 1;
});
