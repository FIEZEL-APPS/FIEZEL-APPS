// tests/cf-client-timeout-test.js — gerbang BATAS WAKTU KLIEN di jalur Cloudflare (paket F6).
//
// MASALAH YANG DIJAGA BERKAS INI. F4 memperbaiki sisi proksi (hop-by-hop, timeout, sesi) dan
// A5 memasang gerbang E2E terhadap jembatan hidup. Sesudah keduanya hijau, empat assert E2E
// tetap merah — dan semuanya di SISI KLIEN, bukan di jembatan:
//   - `GET /api/config` dibatalkan aplikasi sendiri pada 2898 ms oleh
//     `setTimeout(() => controller.abort(), CF_REMOTE_TIMEOUT_MS)` di app.js, karena anggaran
//     `timeoutMs:2500` di core-config.js hanya menyisakan ~1,1 s di atas p95 terukur (1,41 s).
//     Bukti: tools/f6-client-timeout-probe.mjs merekam pemanggil `abort()` beserta tumpukannya
//     (`app.js:2211`), status jadi `unreachable`, dan SELURUH jalur CF mati sampai sesi baru.
//   - `cfWorkerFetch` sama sekali TIDAK punya batas waktu, jadi jawaban yang tidak pernah
//     datang menggantung selama peramban mau — di layar murid itu aplikasi yang membeku.
// Dua-duanya adalah kelas cacat yang sama: ANGKA BATAS WAKTU YANG TIDAK PERNAH DIUKUR. Gerbang
// ini menolak angka yang tidak punya alasan tertulis, dan menolak jalur tanpa angka sama sekali.
//
// EMPAT KEBENARAN YANG DIJAGA (persis kontrak paket F6):
//   (1) SETIAP batas waktu klien di jalur CF punya nilai EKSPLISIT — nol jalur yang menyerahkan
//       kesabarannya ke bawaan peramban.
//   (2) Nilainya >= latensi p95 TERUKUR + margin, dan margin itu DISEBUT di komentar sumber.
//       p95 = 1410 ms (10 sampel `GET /api/config` koneksi baru, 28 Agu 2026; rinci di
//       reports/fix-f6-client-timeout.md). Margin minimum yang diterima gerbang: 3000 ms.
//   (3) Jalur config TIDAK PERNAH menahan render: dijadwalkan lewat idle/timer, tidak di-await
//       di jalur boot, dan boot berlanjut sebelum satu byte pun jawaban server tiba.
//   (4) Kegagalan config jatuh ke SEMUA-OFF (bukan ke "anggap saja hidup"), termasuk saat
//       kegagalannya adalah batas waktu itu sendiri.
//
// CARA MEMBUKTIKANNYA. Dua lapis, dan lapis kedua yang membuat gerbang ini bukan pencocok teks:
//   - MATRIKS RACUN: setiap detektor dijalankan atas sumber ASLI (harus HIJAU) dan atas sumber
//     yang sudah DIRUSAK di memori (harus MERAH). Berkas di disk tidak pernah disentuh.
//   - EKSEKUSI: blok CF-KILLSWITCH + CF-TRANSPORT app.js dijalankan di `vm` dengan `fetch` MOCK
//     LOKAL, lalu perilakunya diukur: pembatalan benar-benar terjadi pada anggarannya, boot
//     tidak menunggu, dan kegagalan benar-benar mematikan semua jalur.
//
// Nol dependency, nol jaringan, nol berkas temporer (pola yang dikenali tests/no-network-test.js).
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __fzRoot;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const results = [];
let failures = 0;
const assert = (ok, name, details) => {
  results.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details === undefined ? '' : details) });
  if (!ok) failures += 1;
};

const stripComments = src => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');

/* =========================================================================================
 * 0. Angka acuan — diukur, bukan dikarang
 * ======================================================================================= */
// p95 `GET /api/config` dari koneksi baru terhadap https://api.fiezel.my.id (10 sampel):
// 1,123 1,201 1,161 1,193 1,137 1,361 1,405 1,405 1,161 1,153 s. Dibulatkan ke 1410 ms.
const P95_MS = 1410;
// Margin minimum. 3000 ms bukan angka manis: ia harus menampung satu handshake TLS penuh
// (terukur 0,48-0,72 s) plus satu percobaan ulang koneksi, karena itulah bentuk kegagalan
// nyata di jaringan seluler Indonesia yang jadi target aplikasi ini.
const MIN_MARGIN_MS = 3000;
const IDENTITY_MIN_MS = P95_MS + MIN_MARGIN_MS;   // 4410 ms
// Jalur media punya lomba (`Promise.race`) sendiri di lapis atasnya, dan angka transportnya
// harus SAMA dengan lomba itu — kalau transport memangkas lebih cepat, jalur jatuh-baliknya
// tidak pernah kebagian menjalankan tugasnya.
const AI_RACE_MS = 30000;
const TTS_RACE_MS = 12000;
// Batas waktu proksi tepi (deploy/edge/api-index.php `TIMEOUT_FAST_S`). Klien HARUS hidup
// lebih lama daripada proksinya sendiri, kalau tidak 504 diagnostik dari proksi tidak pernah
// terbaca dan setiap kelambatan tercatat sebagai "server mati".
const EDGE_FAST_MS = 6000;

const SOURCES = {
  config: read('core-config.js'),
  app: read('app.js'),
  tts: read('features/neural-voice/fiezel-cf-tts-transport.js'),
  workflow: read('.github/workflows/quality.yml')
};

assert(/node tests\/cf-client-timeout-test\.js/.test(SOURCES.workflow),
  'Gerbang ini terdaftar di .github/workflows/quality.yml', 'quality.yml');

/* =========================================================================================
 * 1. Detektor — fungsi murni atas TEKS SUMBER, dipakai dua kali (asli & diracun)
 * ======================================================================================= */
// Nilai tabel dibaca dengan MENJALANKAN core-config.js di vm, bukan dengan regex angka:
// yang dijaga adalah nilai yang benar-benar dilihat aplikasi, termasuk sesudah Object.freeze.
const evalConfig = src => {
  const box = { self: {}, Object, console: { log() {}, warn() {}, error() {}, debug() {} } };
  box.self.self = box.self;
  vm.createContext(box);
  try { vm.runInContext(src, box, { filename: 'core-config.js' }); } catch { return {}; }
  return box.self;
};
const IDENTITY_KEYS = ['health', 'config', 'auth', 'quota', 'usage'];
const ALL_KEYS = [...IDENTITY_KEYS, 'ai', 'tts'];

const DETECT = {
  // (1) nilai eksplisit untuk pengambil config
  remoteTimeoutExplicit: S => {
    const remote = evalConfig(S.config).FIEZEL_CF_REMOTE;
    return Boolean(remote) && Object.isFrozen(remote) && Number.isFinite(Number(remote.timeoutMs)) && Number(remote.timeoutMs) > 0;
  },
  // (2) nilainya jujur terhadap p95 + margin
  remoteTimeoutHonest: S => {
    const remote = evalConfig(S.config).FIEZEL_CF_REMOTE || {};
    return Number(remote.timeoutMs) >= IDENTITY_MIN_MS;
  },
  // (2) dan klien hidup lebih lama daripada proksinya sendiri
  remoteOutlivesEdge: S => {
    const remote = evalConfig(S.config).FIEZEL_CF_REMOTE || {};
    return Number(remote.timeoutMs) > EDGE_FAST_MS;
  },
  // (1) tabel transport ada, beku, dan menutup SEMUA kelas endpoint
  timeoutTableComplete: S => {
    const table = evalConfig(S.config).FIEZEL_CF_TIMEOUTS;
    if (!table || !Object.isFrozen(table)) return false;
    return ALL_KEYS.every(key => Number.isFinite(Number(table[key])) && Number(table[key]) > 0);
  },
  // (2) kelas identitas/kuota jujur
  timeoutTableIdentityHonest: S => {
    const table = evalConfig(S.config).FIEZEL_CF_TIMEOUTS || {};
    return IDENTITY_KEYS.every(key => Number(table[key]) >= IDENTITY_MIN_MS);
  },
  // (2) kelas media tidak memangkas lomba di lapis atasnya
  timeoutTableMediaMatchesRace: S => {
    const table = evalConfig(S.config).FIEZEL_CF_TIMEOUTS || {};
    return Number(table.ai) >= AI_RACE_MS && Number(table.tts) >= TTS_RACE_MS;
  },
  // (2) margin DITULIS, bukan hanya dipatuhi. Angka tanpa alasan tertulis adalah angka yang
  // akan dipangkas orang berikutnya karena "kelihatan besar".
  marginDocumented: S => {
    const src = S.config;
    return /p95/i.test(src) && /margin/i.test(src)
      && /1[.,]41|1410/.test(src) && /\b8000\b/.test(src)
      && /TIMEOUT_FAST_S/.test(src);
  },
  // (1) transport punya pembatal sendiri
  transportHasAbort: S => {
    const block = stripComments(S.app);
    const fn = block.slice(block.indexOf('function cfWorkerFetch'), block.indexOf('function cfShadowLog'));
    return /AbortController/.test(fn) && /setTimeout\(/.test(fn) && /signal:/.test(fn) && /clearTimeout/.test(fn);
  },
  // (1) angkanya diambil dari tabel core-config.js, bukan ditulis ulang di app.js
  transportReadsTable: S => {
    const code = stripComments(S.app);
    return /const CF_TIMEOUTS=self\.FIEZEL_CF_TIMEOUTS\|\|\{\}/.test(code)
      && /function cfTimeoutFor\(path\)\{[^}]*CF_TIMEOUTS\[cfEndpointKey\(path\)\]/.test(code);
  },
  // (1) nilai asing/nol TIDAK boleh berarti "tanpa batas"
  transportFallbackHonest: S => {
    const code = stripComments(S.app);
    const m = code.match(/const CF_TIMEOUT_FALLBACK_MS=(\d+)/);
    if (!m) return false;
    return Number(m[1]) >= IDENTITY_MIN_MS && /raw>0\?raw:CF_TIMEOUT_FALLBACK_MS/.test(code);
  },
  // (1) transport tidak merebut pembatalan milik pemanggil
  transportRespectsCallerSignal: S => {
    const code = stripComments(S.app);
    return /if\(!options\?\.signal&&typeof AbortController==='function'\)/.test(code)
      && /signal:controller\?controller\.signal:options\?\.signal/.test(code);
  },
  // (3) jalur config dijadwalkan, tidak di-await
  configScheduledNotAwaited: S => {
    const code = stripComments(S.app);
    const boot = code.slice(code.indexOf('function cfConfigBootOnce'), code.indexOf('function cfConfigBootOnce') + 1400);
    const scheduled = /requestIdleCallback/.test(boot) && /setTimeout\(/.test(boot);
    // `await` atas pengambil config di MANA PUN di app.js adalah jalur yang bisa menahan
    // pemanggilnya; satu-satunya `await` yang sah ada DI DALAM pengambil itu sendiri.
    const awaited = /await\s+cfConfigRefresh|await\s+cfConfigBootOnce|await\s+cfFetchServerConfig/.test(code);
    return scheduled && !awaited;
  },
  // (4) kegagalan = semua mati, dan itu terlihat dari bentuk kodenya juga
  failureFallsAllOff: S => {
    const code = stripComments(S.app);
    return /function cfConfigFailed\(reason\)\{cfRemoteState=\{status:'unreachable'/.test(code)
      && /error\?\.name==='AbortError'\?'timeout'/.test(code)
      && /if\(self\.FiezelCfKillSwitch\?\.allows\?\.\(key\)!==true\)return 'off'/.test(code);
  },
  // (1)+(2) jalur TTS: angka eksplisit dan sama dengan tabel
  ttsTimeoutExplicit: S => {
    const m = stripComments(S.tts).match(/RENDER_TIMEOUT_MS\s*=\s*(\d+)/);
    return Boolean(m) && Number(m[1]) >= TTS_RACE_MS;
  },
  // (1)+(2) jalur AI: angka eksplisit dan sama dengan tabel
  aiTimeoutExplicit: S => {
    const m = stripComments(S.app).match(/FIEZEL_AI_TIMEOUT_MS\s*=\s*(\d+)/);
    return Boolean(m) && Number(m[1]) >= AI_RACE_MS;
  }
};

for (const [name, detector] of Object.entries(DETECT)) {
  assert(detector(SOURCES) === true, 'DETEKTOR ' + name + ' HIJAU atas sumber asli', 'sumber repo apa adanya');
}

/* =========================================================================================
 * 2. Matriks racun — setiap assert dibuktikan BISA MERAH
 * ======================================================================================= */
const POISON = [
  { butir: '(1)', detector: 'remoteTimeoutExplicit', file: 'config', label: 'timeoutMs dihapus dari FIEZEL_CF_REMOTE',
    poison: s => s.replace(/timeoutMs:8000,\r?\n/, '') },
  { butir: '(2)', detector: 'remoteTimeoutHonest', file: 'config', label: 'timeoutMs dikembalikan ke 2500 ms',
    poison: s => s.replace('timeoutMs:8000', 'timeoutMs:2500') },
  { butir: '(2)', detector: 'remoteOutlivesEdge', file: 'config', label: 'timeoutMs dipangkas ke bawah TIMEOUT_FAST_S proksi',
    poison: s => s.replace('timeoutMs:8000', 'timeoutMs:5000') },
  { butir: '(1)', detector: 'timeoutTableComplete', file: 'config', label: 'satu kelas endpoint hilang dari tabel',
    poison: s => s.replace(/\n\s*quota:8000,/, '') },
  { butir: '(1)', detector: 'timeoutTableComplete', file: 'config', label: 'tabel tidak lagi dibekukan',
    poison: s => s.replace('self.FIEZEL_CF_TIMEOUTS=Object.freeze({', 'self.FIEZEL_CF_TIMEOUTS=({') },
  { butir: '(2)', detector: 'timeoutTableIdentityHonest', file: 'config', label: 'kuota dipangkas ke 2500 ms',
    poison: s => s.replace('quota:8000', 'quota:2500') },
  { butir: '(2)', detector: 'timeoutTableMediaMatchesRace', file: 'config', label: 'transport AI memangkas lomba 30 s di lapis atasnya',
    poison: s => s.replace('ai:30000', 'ai:8000') },
  { butir: '(2)', detector: 'timeoutTableMediaMatchesRace', file: 'config', label: 'transport TTS memangkas lomba 12 s',
    poison: s => s.replace('tts:12000', 'tts:4000') },
  { butir: '(2)', detector: 'marginDocumented', file: 'config', label: 'alasan p95 dihapus dari komentar',
    poison: s => s.replace(/p95/g, 'kira-kira') },
  { butir: '(2)', detector: 'marginDocumented', file: 'config', label: 'kaitan ke TIMEOUT_FAST_S proksi dihapus',
    poison: s => s.replace(/TIMEOUT_FAST_S/g, 'sesuatu') },
  { butir: '(1)', detector: 'transportHasAbort', file: 'app', label: 'cfWorkerFetch kembali tanpa batas waktu',
    poison: s => s.replace(/function cfWorkerFetch\(path,options=\{\}\)\{[\s\S]*?\n\}/,
      "function cfWorkerFetch(path,options={}){return fetch(CF_BASE+String(path),{...options,credentials:'include',mode:'cors',cache:'no-store'})}") },
  { butir: '(1)', detector: 'transportReadsTable', file: 'app', label: 'angka ditulis ulang di app.js, lepas dari core-config.js',
    poison: s => s.replace('const CF_TIMEOUTS=self.FIEZEL_CF_TIMEOUTS||{};', 'const CF_TIMEOUTS={quota:8000};') },
  { butir: '(1)', detector: 'transportFallbackHonest', file: 'app', label: 'nilai asing jatuh ke 0 (tanpa batas)',
    poison: s => s.replace('const CF_TIMEOUT_FALLBACK_MS=8000;', 'const CF_TIMEOUT_FALLBACK_MS=0;') },
  { butir: '(1)', detector: 'transportRespectsCallerSignal', file: 'app', label: 'transport merebut signal milik pemanggil',
    poison: s => s.replace("if(!options?.signal&&typeof AbortController==='function')", "if(typeof AbortController==='function')") },
  { butir: '(3)', detector: 'configScheduledNotAwaited', file: 'app', label: 'boot menunggu jawaban config',
    poison: s => s.replace('function cfConfigBootOnce(){', 'async function cfConfigBootOnce(){await cfConfigRefresh();') },
  { butir: '(4)', detector: 'failureFallsAllOff', file: 'app', label: 'kegagalan tidak lagi menandai status unreachable',
    poison: s => s.replace("cfRemoteState={status:'unreachable'", "cfRemoteState={status:'ok'") },
  { butir: '(4)', detector: 'failureFallsAllOff', file: 'app', label: 'AbortError tidak lagi dipetakan ke kegagalan config',
    poison: s => s.replace("error?.name==='AbortError'?'timeout'", "error?.name==='AbortError'?undefined") },
  { butir: '(1)', detector: 'ttsTimeoutExplicit', file: 'tts', label: 'batas waktu render TTS dihapus',
    poison: s => s.replace(/RENDER_TIMEOUT_MS\s*=\s*12000/, 'RENDER_TIMEOUT_MS = 0') },
  { butir: '(1)', detector: 'aiTimeoutExplicit', file: 'app', label: 'batas waktu AI dipangkas di bawah lomba 30 s',
    poison: s => s.replace(/FIEZEL_AI_TIMEOUT_MS=30000/, 'FIEZEL_AI_TIMEOUT_MS=9000') }
];

for (const p of POISON) {
  const poisoned = { ...SOURCES, [p.file]: p.poison(SOURCES[p.file]) };
  assert(poisoned[p.file] !== SOURCES[p.file],
    'MATRIKS ' + p.butir + ' racun benar-benar mengubah sumber: ' + p.label, p.file);
  assert(DETECT[p.detector](poisoned) === false,
    'MATRIKS ' + p.butir + ' detektor ' + p.detector + ' MERAH saat: ' + p.label, p.file);
}

/* =========================================================================================
 * 3. Eksekusi: perilaku, bukan teks
 * ======================================================================================= */
const KILL_BEGIN = '/* CF-KILLSWITCH-BEGIN';
const KILL_END = '/* CF-KILLSWITCH-END */';
const TRANSPORT_BEGIN = '/* CF-TRANSPORT-BEGIN';
const TRANSPORT_END = '/* CF-TRANSPORT-END */';
const killBlock = SOURCES.app.slice(SOURCES.app.indexOf(KILL_BEGIN), SOURCES.app.indexOf(KILL_END));
const transportBlock = SOURCES.app.slice(SOURCES.app.indexOf(TRANSPORT_BEGIN), SOURCES.app.indexOf(TRANSPORT_END));
assert(killBlock.length > 1000 && transportBlock.length > 1000,
  'Blok CF-KILLSWITCH dan CF-TRANSPORT bisa dipotong dari app.js lewat sentinel',
  `kill=${killBlock.length} transport=${transportBlock.length}`);

const CF_BASE = 'https://api.fiezel.my.id';
const ALL_ON = { health: 'on', config: 'on', auth: 'on', quota: 'on', ai: 'on', tts: 'on', usage: 'on' };
const ALL_FLAGS_TRUE = { cfApiEnabled: true, cfAiEnabled: true, cfTtsEnabled: true, cfQuotaEnabled: true, cfAnalyticsEnabled: true, cfIdentityEnabled: true };
const RUNNABLE = killBlock + '\n' + transportBlock + `
;globalThis.__cf={ coreWorkerExec, cfEndpointMode, cfMergedMode, cfConfigRefresh, cfConfigBootOnce,
  cfTimeoutFor, cfWorkerFetch, cfApplyServerConfig, state:()=>({...cfRemoteState}) };`;

// MOCK LOKAL. `fetch` di dalam vm dibentuk di sini; tidak ada satu pun panggilan yang keluar.
function makeHarness(options = {}) {
  const log = { fetches: [], puter: [], timers: [], idle: [], aborts: [] };
  const puterResponse = { ok: true, status: 200, __from: 'puter', json: async () => ({ protocol: '1.7' }) };
  const puter = { workers: { exec: (url, opts) => { log.puter.push(String(url)); return Promise.resolve(puterResponse); } } };
  const fetchMock = (url, opts) => {
    const at = Date.now();
    log.fetches.push({ url: String(url), at, hasSignal: Boolean(opts && opts.signal) });
    if (typeof options.fetchImpl === 'function') return options.fetchImpl(String(url), opts || {}, log);
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: {}, ttlSeconds: 60 }) });
  };
  const sandbox = {
    Object, Promise, String, Number, Boolean, Math, JSON, Error, Array, Set, Map, Date,
    AbortController,
    setTimeout: (fn, ms) => { log.timers.push(Number(ms) || 0); return setTimeout(fn, ms); },
    clearTimeout,
    console: { debug() {}, log() {}, warn() {}, error() {} },
    fetch: fetchMock,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    CORE_WORKER_URL: 'https://fiezel-core.puter.work',
    awaitPuter: async () => puter
  };
  sandbox.requestIdleCallback = (fn, opts) => { log.idle.push({ fn, opts }); return log.idle.length; };
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.puter = puter;
  sandbox.FIEZEL_CF_REMOTE = { ...(evalConfig(SOURCES.config).FIEZEL_CF_REMOTE || {}), ...(options.remote || {}) };
  sandbox.FIEZEL_CF_TIMEOUTS = { ...(evalConfig(SOURCES.config).FIEZEL_CF_TIMEOUTS || {}), ...(options.timeouts || {}) };
  sandbox.FIEZEL_CF_CONFIG = Object.freeze({ enabled: true, base: CF_BASE, endpoints: Object.freeze({ ...ALL_ON }) });
  vm.createContext(sandbox);
  vm.runInContext(RUNNABLE, sandbox, { filename: 'app.js#cf-killswitch+transport' });
  return { api: sandbox.__cf, gate: sandbox.FiezelCfKillSwitch, log };
}

(async () => {
  /* (1) tabel benar-benar terbaca transport, per kelas endpoint --------------------------- */
  {
    const h = makeHarness();
    const table = evalConfig(SOURCES.config).FIEZEL_CF_TIMEOUTS;
    const pairs = [['/api/quota', table.quota], ['/api/auth/anon', table.auth], ['/api/ai/chat', table.ai], ['/api/tts/say', table.tts], ['/api/usage/event', table.usage]];
    const got = pairs.map(([p, want]) => `${p}=${h.api.cfTimeoutFor(p)}/${want}`);
    assert(pairs.every(([p, want]) => h.api.cfTimeoutFor(p) === Number(want)),
      '(1) transport memakai angka kelas endpoint dari core-config.js, satu per satu', got.join(' '));
    // Path yang tidak dikenali kelasnya TETAP dapat batas waktu, bukan kesabaran tanpa batas.
    assert(h.api.cfTimeoutFor('/api/entah') >= IDENTITY_MIN_MS,
      '(1) path tak dikenal pun mendapat batas waktu >= p95+margin', h.api.cfTimeoutFor('/api/entah'));
  }
  /* (1) transport benar-benar MEMBATALKAN jawaban yang tidak pernah datang ---------------- */
  {
    // Anggaran ditimpa 120 ms HANYA supaya uji ini cepat; yang dibuktikan adalah bahwa
    // pembatalan terjadi pada angka tabel, apa pun angkanya.
    const h = makeHarness({
      timeouts: { quota: 120 },
      fetchImpl: (url, opts) => new Promise((_resolve, reject) => {
        if (opts.signal) opts.signal.addEventListener('abort', () => {
          const e = new Error('aborted'); e.name = 'AbortError'; reject(e);
        });
      })
    });
    h.api.cfApplyServerConfig({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: {} }, 'server');
    const started = Date.now();
    let name = '';
    try { await h.api.cfWorkerFetch('/api/quota', {}); } catch (error) { name = String(error && error.name); }
    const took = Date.now() - started;
    assert(name === 'AbortError' && took < 2000,
      '(1) jawaban yang tidak pernah datang DIBATALKAN transport pada anggarannya, bukan digantung',
      `galat=${name} setelah ${took} ms (anggaran 120 ms)`);
    assert(h.log.fetches.length === 1 && h.log.fetches[0].hasSignal === true,
      '(1) permintaan CF selalu dibawa dengan signal pembatal', JSON.stringify(h.log.fetches[0] || {}));
  }
  /* (1) pembatalan milik pemanggil tidak direbut ------------------------------------------ */
  {
    const h = makeHarness({ fetchImpl: (url, opts) => Promise.resolve({ ok: true, status: 200, __signal: opts.signal }) });
    const own = new AbortController();
    const response = await h.api.cfWorkerFetch('/api/quota', { signal: own.signal });
    assert(response.__signal === own.signal,
      '(1) signal milik pemanggil diteruskan apa adanya (transport tidak merebut pembatalan)', 'signal pemanggil dipakai');
  }
  /* (3) boot tidak menunggu jawaban config ------------------------------------------------ */
  {
    let releaseConfig = null;
    const h = makeHarness({
      fetchImpl: () => new Promise(resolve => { releaseConfig = () => resolve({ ok: true, status: 200, json: async () => ({ protocol: '1.7', flags: { ...ALL_FLAGS_TRUE }, enabled: {}, ttlSeconds: 60 }) }); })
    });
    const before = Date.now();
    const bootResult = h.api.cfConfigBootOnce();
    const returnedMs = Date.now() - before;
    assert(typeof bootResult === 'string' && returnedMs < 50,
      '(3) cfConfigBootOnce() KEMBALI seketika (sinkron), tidak mengembalikan Promise yang harus ditunggu',
      `hasil=${JSON.stringify(bootResult)} dalam ${returnedMs} ms`);
    assert(h.log.fetches.length === 0 && h.log.idle.length === 1,
      '(3) nol permintaan jaringan saat boot; pengambil hanya DIJADWALKAN lewat idle callback',
      `fetch=${h.log.fetches.length} idle=${h.log.idle.length}`);
    assert(h.log.idle[0].opts && Number(h.log.idle[0].opts.timeout) > 0,
      '(3) jadwal idle punya batas waktunya sendiri, jadi perangkat sibuk tidak menunda config selamanya',
      JSON.stringify(h.log.idle[0].opts));
    // Sekarang jalankan jadwalnya, dan buktikan aplikasi tetap bisa bekerja SEBELUM jawaban tiba.
    h.log.idle[0].fn();
    const modeSebelumJawaban = h.api.cfMergedMode('quota');
    assert(modeSebelumJawaban === 'off',
      '(3)+(4) selama jawaban belum tiba, jalur CF MATI (fail-safe), bukan diasumsikan hidup', `quota=${modeSebelumJawaban}`);
    if (releaseConfig) releaseConfig();
    await h.api.cfConfigRefresh();
    assert(h.api.state().status === 'ok' && h.api.cfMergedMode('quota') === 'on',
      '(3) sesudah jawaban tiba, flag baru dipakai tanpa perlu ada yang menunggunya',
      `status=${h.api.state().status} quota=${h.api.cfMergedMode('quota')}`);
  }
  /* (4) batas waktu config = SEMUA-OFF, dan pengambilnya tidak pernah melempar ------------ */
  {
    const h = makeHarness({
      remote: { timeoutMs: 100 },
      fetchImpl: (url, opts) => new Promise((_r, reject) => {
        if (opts.signal) opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
      })
    });
    let threw = false;
    let state = null;
    try { state = await h.api.cfConfigRefresh(); } catch { threw = true; }
    assert(threw === false && state && state.status === 'unreachable' && state.reason === 'timeout',
      '(4) batas waktu config TIDAK melempar; ia menjadi status unreachable dengan alasan "timeout"',
      JSON.stringify(state));
    const modes = ['health', 'config', 'auth', 'quota', 'ai', 'tts', 'usage'].map(key => `${key}=${h.api.cfMergedMode(key)}`);
    assert(modes.every(m => m.endsWith('=off')),
      '(4) sesudah config gagal, SEMUA kelas endpoint mati walau flag statisnya semua on', modes.join(' '));
    await h.api.coreWorkerExec('/api/quota', {});
    assert(h.log.puter.length === 1,
      '(4) aplikasi tetap melayani murid lewat jalur Puter sesudah config gagal', `puter=${h.log.puter.length}`);
  }
  /* (4) bentuk kegagalan lain (HTTP 500, jaringan mati) juga jatuh ke semua-off ----------- */
  {
    for (const [label, impl] of [
      ['HTTP 500', () => Promise.resolve({ ok: false, status: 500, json: async () => ({}) })],
      ['jaringan mati', () => Promise.reject(new Error('Failed to fetch'))],
      ['protokol salah', () => Promise.resolve({ ok: true, status: 200, json: async () => ({ protocol: '2.0', flags: { ...ALL_FLAGS_TRUE } }) })]
    ]) {
      const h = makeHarness({ fetchImpl: impl });
      let threw = false;
      try { await h.api.cfConfigRefresh(); } catch { threw = true; }
      const off = ['health', 'config', 'auth', 'quota', 'ai', 'tts', 'usage'].every(key => h.api.cfMergedMode(key) === 'off');
      assert(threw === false && off, `(4) kegagalan "${label}" jatuh ke semua-off tanpa melempar`, `threw=${threw}`);
    }
  }

  /* =======================================================================================
   * 4. Invarian rilis: paket ini tidak menaikkan versi build
   * ===================================================================================== */
  /* Assert ini SEMULA mengunci nilainya ke 'm025-172' sebagai pagar agar paket kerja ini tidak
   * menaikkan versi build. Itu keliru: begitu master menaikkan versi secara sah, pagar seperti
   * itu memerahkan gerbang tanpa ada yang rusak. Yang benar-benar merupakan kontrak adalah
   * KESAMAAN tiga penanda (SW_REV, DIAG_BUILD, FIEZEL_PAGE_BUILD) - naik bersama, bukan diam
   * bersama. Jadi yang dijaga sekarang itu, bukan satu angka tertentu. */
  {
    const page = (SOURCES.config.match(/FIEZEL_PAGE_BUILD='(m025-\d+)'/) || [])[1] || null;
    const sw = (read('sw.js').match(/SW_REV='(m025-\d+)/) || [])[1] || null;
    const diag = (read('features/neural-voice/fiezel-diag-panel.js')
      .match(/DIAG_BUILD = '(m025-\d+)'/) || [])[1] || null;
    assert(Boolean(page) && page === sw && page === diag,
      'Invarian build utuh: SW_REV, DIAG_BUILD, dan FIEZEL_PAGE_BUILD menunjuk versi yang sama ('
        + String(page) + ' / ' + String(sw) + ' / ' + String(diag) + ')', 'core-config.js + sw.js + diag-panel');
  }

  const passed = results.filter(r => r.status === 'PASS').length;
  fs.writeFileSync(path.join(root, 'CF-CLIENT-TIMEOUT-REPORT.json'), JSON.stringify({
    schema: 'fiezel-cf-client-timeout-v1',
    pass: failures === 0,
    acuan: { p95Ms: P95_MS, marginMinMs: MIN_MARGIN_MS, identityMinMs: IDENTITY_MIN_MS, edgeFastMs: EDGE_FAST_MS, aiRaceMs: AI_RACE_MS, ttsRaceMs: TTS_RACE_MS },
    counts: { pass: passed, fail: failures, total: results.length, poisonRows: POISON.length },
    checks: results
  }, null, 2) + '\n');
  console.log('cf-client-timeout-test: ' + passed + '/' + results.length + ' assert PASS'
    + ' (matriks racun ' + POISON.length + ' baris)');
  for (const r of results) if (r.status === 'FAIL') console.error('  MERAH: ' + r.name + ' | ' + r.details);
  if (failures) {
    console.error('cf-client-timeout-test GAGAL: ' + failures + ' assert merah');
    process.exitCode = 1;
  }
})().catch(error => {
  console.error('cf-client-timeout-test GAGAL (harness melempar)');
  console.error(error);
  process.exitCode = 1;
});
