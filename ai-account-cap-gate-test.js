/**
 * ai-account-cap-gate-test.js — GERBANG: PLAFON NEURON TINGKAT AKUN ITU WAJIB.
 *
 * Node murni, nol dependency, nol jaringan. Memakai `tools/cf-test-harness.js`
 * dan MENGEKSEKUSI Worker sungguhan (graf ESM `workers/api/**` dirakit jadi
 * data-URL lalu diimpor), sama seperti `cf-wiring-test.js`.
 *
 * ==========================================================================
 * KENAPA GERBANG INI ADA
 * ==========================================================================
 * Paket S1 melaporkan celah ini dan tidak menambalnya: penegakan plafon neuron
 * tingkat AKUN bersifat OPSIONAL per pemanggil —
 * `if (typeof deps.accountBudget === 'function')`. Pemanggil yang lupa
 * menyuntikkan dep itu MELEWATI plafon tanpa satu pun galat, dan TIDAK ADA
 * gerbang yang menjaga penyambungannya. Lebih buruk: `route-tts.js` memanggil
 * `env.AI.run()` pada binding Workers AI yang SAMA dan sama sekali tidak punya
 * pagar akun.
 *
 * Batas per-IP (15/jam di `rate-anon.js`) TIDAK menutup serangan dari banyak IP.
 * Plafon akun adalah satu-satunya yang menahan penyerang tersebar menghabiskan
 * 8.000 neuron/hari lalu mematikan AI untuk murid sungguhan.
 *
 * ==========================================================================
 * KENAPA PENEMUANNYA PROGRAMATIK, BUKAN DAFTAR YANG DIKETIK TANGAN
 * ==========================================================================
 * Daftar rute yang diketik tangan basi begitu rute baru lahir, dan itu PERSIS
 * cara celah ini muncul (P3 menyuntik dep ke `aiDeps`, lupa `ttsDeps`). Jadi:
 *
 *   1. Modul yang bisa memanggil model ditemukan dari SUMBER: graf impor/require
 *      `workers/api/**` ditelusuri sampai ke chokepoint `ai/model-call-gate.js`
 *      (satu-satunya berkas yang boleh mengeja `env.AI.run(`).
 *   2. Rute konkret ditemukan dengan MENJALANKAN `register*Routes()` tiap modul
 *      itu ke router pengumpul — jadi path-nya datang dari kode, bukan dari
 *      berkas gerbang ini.
 *   3. Setiap rute hasil temuan WAJIB punya fixture di sini. Rute model baru
 *      tanpa fixture = MERAH, dengan pesan yang menyuruh menambahkannya. Itu
 *      satu-satunya bentuk daftar yang tidak bisa basi diam-diam.
 *   4. Untuk setiap rute yang benar-benar menyentuh binding AI, urutan dibuktikan
 *      dari LOG D1 + LOG BINDING: `UPDATE ai_account_day ... WHERE ... <= cap`
 *      harus terjadi SEBELUM `AI.run` pertama. Tersambung saja tidak cukup;
 *      urutannya yang menentukan apakah plafon mengikat.
 *
 * Dijalankan langsung: `node ai-account-cap-gate-test.js` (exit 0 = hijau).
 * Matriks mutasi merahnya: `node tools/account-cap-red-matrix.mjs`.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const API_DIR = path.join(root, 'workers', 'api');
const H = require(path.join(root, 'tools', 'cf-test-harness.js'));

/* ============================================================ pelaporan ============ */

const checks = [];
let failed = false;

function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details === undefined ? '' : String(details) });
  if (!ok) failed = true;
}

function finish(extra) {
  const report = {
    schema: 'fiezel-ai-account-cap-gate-v1',
    pass: !failed,
    counts: {
      pass: checks.filter((c) => c.status === 'PASS').length,
      fail: checks.filter((c) => c.status === 'FAIL').length
    },
    ...extra,
    checks
  };
  fs.writeFileSync(path.join(root, 'AI-ACCOUNT-CAP-GATE.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

/* ============================================================ util sumber ========== */

function mustRead(relative) {
  const file = path.join(API_DIR, relative);
  if (!fs.existsSync(file)) throw new Error('berkas wajib tidak ada: workers/api/' + relative);
  return fs.readFileSync(file, 'utf8');
}

/**
 * Komentar dibuang SEBELUM pemindaian. Tanpa ini, prosa yang MENJELASKAN kenapa
 * `env.AI.run` tidak boleh dieja di sebuah berkas akan dihitung sebagai pelanggaran —
 * gerbang yang merah karena dokumentasinya sendiri mengajari orang menghapus dokumentasi.
 */
function stripComments(source) {
  return String(source)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1 ');
}

function walkJs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJs(full, out);
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const API_FILES = walkJs(API_DIR).map((f) => path.relative(API_DIR, f).replace(/\\/g, '/'));

/* ============================================================ perakit modul ======== */
/** Sama teknik dengan cf-wiring-test.js: graf ESM -> satu data-URL yang bisa diimpor. */
const MODULE_CACHE = new Map();
const REL = '(\\.\\.?\\/[A-Za-z0-9_.\\/-]+\\.js)';

function inlineModule(relative, stack = []) {
  const rel = relative.replace(/\\/g, '/');
  if (MODULE_CACHE.has(rel)) return MODULE_CACHE.get(rel);
  if (stack.includes(rel)) throw new Error('impor sirkular: ' + stack.concat(rel).join(' -> '));
  const source = mustRead(rel);
  const dir = path.posix.dirname(rel);
  const resolve = (dep) => inlineModule(path.posix.normalize(path.posix.join(dir, dep)), stack.concat(rel));
  const transformed = source.split('\n').map((line) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return line;
    return line
      .replace(new RegExp("(from\\s+')" + REL + "(')", 'g'), (a, p, d, s) => p + resolve(d) + s)
      .replace(new RegExp("(import\\s*\\(\\s*')" + REL + "('\\s*\\))", 'g'), (a, p, d, s) => p + resolve(d) + s)
      .replace(new RegExp("(^\\s*import\\s+')" + REL + "(')", 'g'), (a, p, d, s) => p + resolve(d) + s);
  }).join('\n');
  const url = 'data:text/javascript;base64,' + Buffer.from(transformed, 'utf8').toString('base64');
  MODULE_CACHE.set(rel, url);
  return url;
}

/* ============================================================ lingkungan uji ======= */

const ORIGIN = 'https://fiezel.my.id';
const CLOCK_ISO = '2026-08-27T03:00:00.000Z';
const DAY = '2026-08-27';
const AI_FLAGS_ON = JSON.stringify({
  flags: { cfAiEnabled: true, cfTtsEnabled: true },
  enabled: { ai: true, tts: true }
});

function migrationStatements(relative) {
  return fs.readFileSync(path.join(API_DIR, relative), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function applyMigration(db, relative) {
  for (const statement of migrationStatements(relative)) await db.prepare(statement).run();
}


/**
 * Migrasi yang WAJIB ada supaya jalur permintaan hidup. Kegagalan migrasi TIDAK
 * ditelan: skema yang tidak terpasang membuat setiap probe menjawab 500 dan gerbang
 * akan "hijau karena tidak pernah sampai ke plafon" - kegagalan paling mahal untuk
 * didiagnosis, jadi ia dibuat berisik di sini.
 */
async function prepareDb(booted) {
  for (const mig of ['0001_identity.sql', '0001_quota.sql', '0005_ai_account_budget.sql']) {
    await applyMigration(booted.core, 'migrations/' + mig);
  }
  await applyMigration(booted.stats, 'migrations/0002_analytics.sql');
}

/** AI palsu yang juga bisa TTS (byte audio >= 512 supaya jalur SUKSES yang teruji). */
function ttsCapableAi(clock, behaviour) {
  const base = H.fakeAI({ clock });
  const calls = [];
  const mode = behaviour || {};
  return {
    calls,
    binding: {
      async run(model, input, options) {
        calls.push({ model, input, at: Date.now() });
        if (typeof mode.onRun === 'function') {
          const forced = await mode.onRun(model, input);
          if (forced !== undefined) return forced;
        }
        if (/aura|melotts|tts/i.test(String(model))) {
          const seed = 'audio-palsu-' + String((input && input.text) || '').slice(0, 24);
          return { audio: Buffer.alloc(4096, seed).toString('base64') };
        }
        return base.binding.run(model, input, options);
      }
    }
  };
}

/**
 * D1 dengan LOG SQL yang diberi cap urutan bersama log binding AI. Satu larik
 * `timeline` dipakai dua-duanya, jadi "reservasi sebelum panggilan model" bisa
 * dibuktikan sebagai URUTAN, bukan sebagai keberadaan.
 */
function instrument(db, timeline, options) {
  const opt = options || {};
  const inner = db.prepare.bind(db);
  db.prepare = (sql) => {
    const text = String(sql);
    if (/ai_account_day/i.test(text)) {
      if (opt.throwOnAccountDay) throw new Error('D1_DOWN: ai_account_day');
      timeline.push({ kind: 'sql', sql: text.replace(/\s+/g, ' ').trim() });
    }
    return inner(sql);
  };
  return db;
}

function boot(worker, options = {}) {
  const clock = H.fakeClock(CLOCK_ISO);
  const core = H.fakeD1();
  const stats = H.fakeD1();
  const audioObjects = new Map();
  const r2 = H.fakeR2({ objects: audioObjects, writable: true });
  const timeline = [];
  const ai = ttsCapableAi(clock, {
    onRun: async (model, input) => {
      timeline.push({ kind: 'ai', model: String(model) });
      if (typeof options.onRun === 'function') return options.onRun(model, input);
      return undefined;
    }
  });
  const kv = H.fakeKV({ clock, entries: options.kvEntries === null ? {} : (options.kvEntries || { 'cfg:flags': AI_FLAGS_ON }) });

  const env = {
    SERVICE_NAME: 'fiezel-api',
    API_VERSION: 'cf-api-1',
    AI_GATEWAY_MODE: 'core-only',
    ALLOWED_ORIGINS: ORIGIN,
    COOKIE_DOMAIN: 'fiezel.my.id',
    FEATURE_AI: 'on',
    FEATURE_TTS: 'on',
    FEATURE_COACH: 'off',
    ANALYTICS_ENABLED: 'on',
    ALLOW_NO_EDGE_SECRET: 'true',
    ANON_JITTER_MAX_MS: '0',
    AI_LIMIT_PER_DAY: '25',
    AI_LIMIT_PER_HOUR: '40',
    TTS_CHARS_PER_DAY: '12000',
    GLOBAL_NEURON_CAP: options.neuronCap === undefined ? '8000' : options.neuronCap,
    SESSION_HMAC_KEY_CURRENT: 'uji-secret-cookie-current-0123456789',
    SESSION_HMAC_KEY_PREVIOUS: 'uji-secret-cookie-previous-0123456789',
    PUTER_CLAIM_SECRET_CURRENT: 'uji-secret-klaim-puter-0123456789',
    TTS_KEY_PEPPER: 'uji-pepper-tts-0123456789',
    ANALYTICS_PEPPER_CURRENT: 'uji-pepper-analytics-0123456789',
    TEST_CLOCK_MS: String(clock.now()),
    CORE_DB: core,
    STATS_DB: stats,
    CFG: kv,
    AUDIO: r2.bucket || r2,
    AI: ai.binding,
    ANALYTICS: (H.fakeAnalyticsEngine().dataset) || H.fakeAnalyticsEngine(),
    ...options.vars
  };

  const call = async (method, pathname, opt = {}) => {
    const headers = new Headers(opt.headers || {});
    if (opt.origin !== null) headers.set('origin', opt.origin || ORIGIN);
    if (opt.cookie) headers.set('cookie', opt.cookie);
    const init = { method, headers };
    if (opt.body !== undefined) {
      init.body = opt.body;
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
    const request = new Request('https://api.fiezel.my.id' + pathname, init);
    const response = await worker.fetch(request, env, H.fakeExecutionContext());
    const text = await response.clone().text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: response.status, json, text };
  };

  const newUser = async () => {
    const r = await call('POST', '/api/auth/anon', { body: '{}' });
    const raw = await (async () => r)();
    void raw;
    return r;
  };

  return { clock, core, stats, kv, r2, ai, env, call, newUser, timeline, audioObjects };
}

/** Identitas anon: cookie diambil dari header Set-Cookie jawaban `/api/auth/anon`. */
async function issueIdentity(worker, env) {
  const request = new Request('https://api.fiezel.my.id/api/auth/anon', {
    method: 'POST', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: '{}'
  });
  const response = await worker.fetch(request, env, H.fakeExecutionContext());
  const setCookie = response.headers.get('set-cookie') || '';
  const m = /fz_id=([^;]*)/.exec(setCookie);
  if (!m) throw new Error('gagal menerbitkan identitas uji: ' + response.status);
  return 'fz_id=' + m[1];
}

/* ============================================================ fixture rute ========= */
/**
 * FIXTURE, bukan daftar rute. Bedanya penting: daftar rute menentukan APA yang
 * diperiksa (dan karena itu bisa basi tanpa suara); fixture hanya menyediakan
 * BADAN PERMINTAAN untuk rute yang sudah ditemukan dari kode. Rute model baru yang
 * belum ada fixture-nya membuat gerbang MERAH, bukan lewat.
 *
 * `expectModel` diverifikasi DUA ARAH: `true` harus benar-benar menyentuh binding AI
 * (kalau tidak, buktinya kosong dan assert-nya hampa), `false` harus benar-benar TIDAK
 * menyentuhnya (kalau ternyata menyentuh, deklarasi ini tidak bisa dipakai menyembunyikan
 * jalur berbayar).
 */
const ROUTE_FIXTURES = {
  'POST /api/ai/task': {
    expectModel: true,
    needsIdentity: true,
    body: JSON.stringify({
      schema: 'fiezel-ai-task-v2', task: 'tutor_turn',
      input: { question: 'Apa beda "in" dan "on"?', surface: 'ask', level: 'A2' }
    })
  },
  'POST /api/tts/render': {
    expectModel: true,
    needsIdentity: true,
    body: JSON.stringify({
      text: 'The cat is on the table.', locale: 'en-US', voiceId: 'asteria',
      engineId: '@cf/deepgram/aura-1', engineVersion: 'cf-aura-1@v1'
    })
  },
  // Katalog publik. Tidak menyentuh model, dan itu DIBUKTIKAN, bukan dipercaya.
  'GET /api/tts/manifest': { expectModel: false, needsIdentity: false }
};

/* ============================================================ MAIN ================= */

(async () => {
  /* ---------- 0. Berkas wajib -------------------------------------------- */
  for (const required of [
    'ai/model-call-gate.js', 'ai/ai-account-budget.js', 'ai/route-ai.js',
    'tts/route-tts.js', 'route-wiring.js', 'index.js',
    'migrations/0005_ai_account_budget.sql', 'quota/quota-config.js', 'wrangler.toml'
  ]) {
    check('berkas wajib ada: ' + required, fs.existsSync(path.join(API_DIR, required)), required);
  }
  if (failed) return finish({ stage: 'berkas wajib' });

  const ModelCallGate = require(path.join(API_DIR, 'ai/model-call-gate.js'));
  const Budget = await import(inlineModule('ai/ai-account-budget.js'));
  const RouteAi = require(path.join(API_DIR, 'ai/route-ai.js'));
  const RouteTts = require(path.join(API_DIR, 'tts/route-tts.js'));

  /* ---------- A. CHOKEPOINT: `env.AI.run` hanya dieja di SATU berkas ----- */
  const spellers = API_FILES.filter((rel) => {
    const src = stripComments(fs.readFileSync(path.join(API_DIR, rel), 'utf8'));
    return /\bAI\s*\.\s*run\s*\(/.test(src);
  });
  check('A1. Binding Workers AI dieja HANYA di ai/model-call-gate.js (dipindai dari sumber)',
    spellers.length === 1 && spellers[0] === 'ai/model-call-gate.js',
    spellers.join(', ') || 'tidak ada berkas yang menyentuh binding — chokepoint hilang');
  check('A2. route-ai.js dan tts/route-tts.js TIDAK lagi menyentuh binding sendiri',
    !spellers.includes('ai/route-ai.js') && !spellers.includes('tts/route-tts.js'),
    spellers.join(', '));

  /* ---------- B. Chokepoint MENOLAK tanpa tanda terima yang sah ---------- */
  {
    let touched = 0;
    const env = { AI: { run: async () => { touched += 1; return { response: 'x' }; } } };
    const bad = [
      ['tanpa tanda terima (null)', null],
      ['objek permisif karangan', { allowed: true, neurons: 5 }],
      ['merek salah', { brand: 'palsu', neurons: 5, release: async () => true }],
      ['neuron < 1', { brand: ModelCallGate.RESERVATION_BRAND, neurons: 0, release: async () => true }],
      ['tanpa release()', { brand: ModelCallGate.RESERVATION_BRAND, neurons: 5 }]
    ];
    const refused = [];
    for (const [label, receipt] of bad) {
      let threw = '';
      try {
        await ModelCallGate.runReservedModel({ env, modelId: '@cf/meta/llama', input: {}, reservation: receipt });
      } catch (e) { threw = e && e.message; }
      refused.push(label + '=' + (threw || 'TIDAK MELEMPAR'));
    }
    check('B1. runReservedModel MENOLAK setiap tanda terima tidak sah',
      refused.every((r) => /model_call_unreserved/.test(r)), refused.join(' | '));
    check('B2. Penolakan terjadi SEBELUM binding disentuh (nol panggilan model)',
      touched === 0, String(touched));

    const good = ModelCallGate.makeReservation({ neurons: 3, cap: 8000, usedBefore: 10, release: async () => true });
    const out = await ModelCallGate.runReservedModel({ env, modelId: '@cf/meta/llama', input: {}, reservation: good });
    check('B3. Tanda terima yang sah DILEWATKAN ke binding', touched === 1 && !!out, String(touched));
    let noRelease = '';
    try { ModelCallGate.makeReservation({ neurons: 3, cap: 8000, usedBefore: 0 }); } catch (e) { noRelease = e.message; }
    check('B4. makeReservation menolak dibuat tanpa release() (pelepasan tidak boleh opsional)',
      /reservation_needs_release/.test(noRelease), noRelease || 'tidak melempar');
  }

  /* ---------- C. Penemuan PROGRAMATIK modul yang bisa memanggil model ---- */
  const depsOf = new Map();
  for (const rel of API_FILES) {
    const src = stripComments(fs.readFileSync(path.join(API_DIR, rel), 'utf8'));
    const found = new Set();
    const patterns = [
      /from\s+'(\.[^']+\.js)'/g,
      /import\s+'(\.[^']+\.js)'/g,
      /import\s*\(\s*'(\.[^']+\.js)'\s*\)/g,
      /require\s*\(\s*'(\.[^']+\.js)'\s*\)/g,
      /require\s*\(\s*'([^']*route-)'\s*\+\s*'([^']*\.js)'\s*\)/g
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(src))) {
        const spec = m[2] ? m[1] + m[2] : m[1];
        found.add(path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)));
      }
    }
    depsOf.set(rel, [...found]);
  }

  const CHOKEPOINT = 'ai/model-call-gate.js';
  const reachesChokepoint = (rel, seen = new Set()) => {
    if (rel === CHOKEPOINT) return true;
    if (seen.has(rel)) return false;
    seen.add(rel);
    return (depsOf.get(rel) || []).some((d) => reachesChokepoint(d, seen));
  };

  // Modul PENDAFTAR rute = yang MENDEFINISIKAN `register…Routes(`. `route-wiring.js`
  // hanya MEMANGGILnya, jadi ia bukan pendaftar dan tidak ikut terhitung.
  const registrars = API_FILES.filter((rel) => {
    const src = stripComments(fs.readFileSync(path.join(API_DIR, rel), 'utf8'));
    return /function\s+register[A-Za-z]*Routes\s*\(/.test(src);
  });
  const modelCapable = registrars.filter((rel) => reachesChokepoint(rel));
  check('C1. Penemuan modul model-capable berjalan dan tidak kosong',
    registrars.length >= 2 && modelCapable.length >= 2,
    'pendaftar=' + registrars.join(',') + ' | model-capable=' + modelCapable.join(','));
  check('C2. Kedua jalur berbayar ikut ditemukan (AI DAN TTS)',
    modelCapable.includes('ai/route-ai.js') && modelCapable.includes('tts/route-tts.js'),
    modelCapable.join(','));

  // Path konkret diambil dengan MENJALANKAN pendaftarnya.
  const discovered = [];
  for (const rel of modelCapable) {
    const mod = require(path.join(API_DIR, rel));
    const sink = [];
    const router = {
      post: (p, h) => sink.push(['POST', p, h]), get: (p, h) => sink.push(['GET', p, h]),
      put: (p, h) => sink.push(['PUT', p, h]), delete: (p, h) => sink.push(['DELETE', p, h]),
      patch: (p, h) => sink.push(['PATCH', p, h])
    };
    const registerFns = Object.keys(mod).filter((k) => /^register[A-Za-z]*Routes$/.test(k) && typeof mod[k] === 'function');
    check('C3[' + rel + '] pendaftar rute bisa dipanggil', registerFns.length >= 1, registerFns.join(','));
    for (const fn of registerFns) mod[fn](router, {});
    for (const [method, p] of sink) discovered.push({ key: method + ' ' + p, method, path: p, module: rel });
  }
  const missingFixture = discovered.filter((r) => !ROUTE_FIXTURES[r.key]);
  check('C4. Setiap rute dari modul model-capable punya fixture di gerbang ini',
    missingFixture.length === 0,
    missingFixture.length
      ? 'TAMBAHKAN fixture untuk: ' + missingFixture.map((r) => r.key + ' (' + r.module + ')').join(', ')
      : discovered.map((r) => r.key).join(', '));

  /* ---------- C5. Probe SETIAP rute hasil temuan pada Worker terpasang --- */
  const worker = (await import(inlineModule('index.js'))).default;
  for (const route of discovered) {
    const fixture = ROUTE_FIXTURES[route.key];
    if (!fixture) continue;
    const booted = boot(worker);
    await prepareDb(booted);
    instrument(booted.core, booted.timeline);
    const cookie = fixture.needsIdentity ? await issueIdentity(worker, booted.env) : null;
    const res = await booted.call(route.method, route.path, {
      cookie: cookie || undefined,
      body: fixture.body === undefined ? undefined : fixture.body
    });
    const firstAi = booted.timeline.findIndex((e) => e.kind === 'ai');
    const firstReserve = booted.timeline.findIndex(
      (e) => e.kind === 'sql' && /UPDATE ai_account_day/i.test(e.sql) && /<=/.test(e.sql)
    );
    const ranModel = firstAi >= 0;

    check('C5[' + route.key + '] perilaku model cocok dengan deklarasi fixture',
      ranModel === !!fixture.expectModel,
      'expectModel=' + !!fixture.expectModel + ' ranModel=' + ranModel + ' status=' + res.status);

    if (fixture.expectModel) {
      check('C6[' + route.key + '] reservasi neuron akun terjadi SEBELUM panggilan model',
        ranModel && firstReserve >= 0 && firstReserve < firstAi,
        'reserve@' + firstReserve + ' ai@' + firstAi + ' status=' + res.status);
      // Kunci harinya TIDAK dicocokkan ke tanggal yang diketik di sini: `dayKeyUtc()`
      // memakai jam runtime, dan gerbang yang mengunci tanggal akan merah setiap hari
      // berganti - itu gerbang yang mengajari orang mengabaikannya.
      const rows = booted.core._rows('ai_account_day');
      check('C7[' + route.key + '] penghitung ai_account_day benar-benar bergerak',
        rows.length === 1 && Number(rows[0].neurons) > 0, JSON.stringify(rows));
    } else {
      check('C6[' + route.key + '] rute non-model TIDAK menyentuh binding AI', !ranModel, 'ai@' + firstAi);
    }
  }

  /* ---------- D. Dep opsional TIDAK lagi diterima secara senyap ---------- */
  {
    let touched = 0;
    const env = {
      AI: { run: async () => { touched += 1; return { response: 'Jawaban model.' }; } },
      TEST_CLOCK_MS: String(Date.parse(CLOCK_ISO))
    };
    const request = new Request('https://api.fiezel.my.id/api/ai/task', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        schema: 'fiezel-ai-task-v2', task: 'tutor_turn',
        input: { question: 'Apa beda "in" dan "on"?', surface: 'ask', level: 'A2' }
      })
    });
    const res = await RouteAi.handleAiTask({ request, env, ctx: null, deps: {} });
    const body = await res.json();
    check('D1. /api/ai/task TANPA deps.accountBudget = 503, BUKAN dilayani',
      res.status === 503 && body.reason === 'ai_budget_dep_missing', res.status + ' ' + body.reason);
    check('D2. Penolakan itu tidak menagih jatah murid (quotaChecked:false, quotaCharged:false)',
      body.quotaChecked === false && body.quotaCharged === false,
      JSON.stringify({ quotaChecked: body.quotaChecked, quotaCharged: body.quotaCharged }));
    check('D3. Nol panggilan model saat dep hilang', touched === 0, String(touched));
    check('D4. Murid tetap mendapat teks materi, dan pesannya JUJUR (bukan "jatah penuh")',
      typeof body.text === 'string' && body.text.length > 30
      && body.message === RouteAi.POLITE.ai_budget_missing
      && body.message !== RouteAi.POLITE.ai_account_budget,
      JSON.stringify(body.message || ''));

    // Tanda terima karangan (allowed:true tanpa merek) juga ditolak.
    const request2 = new Request('https://api.fiezel.my.id/api/ai/task', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        schema: 'fiezel-ai-task-v2', task: 'tutor_turn',
        input: { question: 'Apa beda "in" dan "on"?', surface: 'ask', level: 'A2' }
      })
    });
    const res2 = await RouteAi.handleAiTask({
      request: request2, env, ctx: null,
      deps: { accountBudget: async () => ({ allowed: true, usedBefore: 0, cap: 8000 }) }
    });
    const body2 = await res2.json();
    check('D5. Izin tanpa tanda terima sah = 503 ai_budget_receipt_invalid',
      res2.status === 503 && body2.reason === 'ai_budget_receipt_invalid' && touched === 0,
      res2.status + ' ' + body2.reason + ' run=' + touched);

    // TTS: jalur yang SEBELUM S2 tidak punya pagar akun sama sekali.
    const ttsReq = new Request('https://api.fiezel.my.id/api/tts/render', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'The cat is on the table.', locale: 'en-US', voiceId: 'asteria',
        engineId: '@cf/deepgram/aura-1', engineVersion: 'cf-aura-1@v1'
      })
    });
    const ttsRes = await RouteTts.handleRender({
      request: ttsReq, env: Object.assign({ TTS_KEY_PEPPER: 'uji-pepper-tts-0123456789' }, env),
      ctx: null, deps: {}
    });
    const ttsBody = await ttsRes.json();
    check('D6. /api/tts/render TANPA deps.accountBudget = 503 + quotaCharged:false',
      ttsRes.status === 503 && ttsBody.reason === 'ai_budget_dep_missing' && ttsBody.quotaCharged === false,
      ttsRes.status + ' ' + ttsBody.reason);
    check('D7. Nol panggilan mesin TTS saat dep hilang', touched === 0, String(touched));
  }

  /* ---------- E. Angka plafonnya NYATA ----------------------------------- */
  {
    const cap8000 = Budget.accountCapNeurons({ GLOBAL_NEURON_CAP: '8000' });
    const capHuge = Budget.accountCapNeurons({ GLOBAL_NEURON_CAP: '80000' });
    const capNone = Budget.accountCapNeurons({});
    const QuotaConfig = await import(inlineModule('quota/quota-config.js'));
    const budgetSrc = stripComments(mustRead('ai/ai-account-budget.js'));
    const wrangler = fs.readFileSync(path.join(API_DIR, 'wrangler.toml'), 'utf8');
    check('E1. GLOBAL_NEURON_CAP dipakai apa adanya saat <= jatah gratis akun',
      cap8000 === 8000, String(cap8000));
    check('E2. Nilai di atas jatah gratis DIPOTONG ke ACCOUNT_DAILY_NEURON_BUDGET',
      capHuge === QuotaConfig.QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET, String(capHuge));
    check('E3. Tanpa var, plafonnya TETAP ADA (fail-closed ke jatah gratis, bukan tak terbatas)',
      capNone === QuotaConfig.QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET, String(capNone));
    check('E4. Angkanya datang dari QUOTA_CONFIG, bukan dari konstanta yang dikarang di modul',
      /QUOTA_CONFIG\s*\.\s*ACCOUNT_DAILY_NEURON_BUDGET/.test(budgetSrc), 'referensi QUOTA_CONFIG');
    check('E5. wrangler.toml benar-benar menyetel GLOBAL_NEURON_CAP',
      /GLOBAL_NEURON_CAP\s*=\s*"\d+"/.test(wrangler),
      (/GLOBAL_NEURON_CAP\s*=\s*"(\d+)"/.exec(wrangler) || [])[1] || 'tidak ada');
    check('E6. Plafon ditegakkan DI DALAM WHERE (atomik), bukan dibandingkan setelah dibaca',
      /WHERE day = \?1 AND neurons \+ \?2 <= \?4/.test(Budget.ACCOUNT_SQL.reserve),
      Budget.ACCOUNT_SQL.reserve);
  }

  /* ---------- F. Reservasi ATOMIK ---------------------------------------- */
  {
    const db = H.fakeD1();
    await applyMigration(db, 'migrations/0005_ai_account_budget.sql');
    const now = Date.parse(CLOCK_ISO);
    const env = { GLOBAL_NEURON_CAP: '10' };
    // Ambang: 8 dari 10 terpakai, dua permintaan 2 neuron datang bersamaan. Satu lolos.
    await db.prepare(Budget.ACCOUNT_SQL.ensureDay).bind(DAY, now).run();
    await db.prepare(Budget.ACCOUNT_SQL.reserve).bind(DAY, 8, now, 10).all();
    const [a, b] = await Promise.all([
      Budget.reserveAccountNeurons({ db, env, neurons: 2, now }),
      Budget.reserveAccountNeurons({ db, env, neurons: 2, now })
    ]);
    const allowed = [a, b].filter((r) => r.allowed === true).length;
    const row = db._rows('ai_account_day').find((r) => r.day === DAY);
    check('F1. Dua reservasi bersamaan di ambang: TEPAT SATU lolos',
      allowed === 1, JSON.stringify([a, b]));
    check('F2. Penghitung tidak pernah melampaui plafon',
      Number(row.neurons) <= 10, JSON.stringify(row));
    check('F3. Yang ditolak memberi alasan plafon (bukan galat generik)',
      [a, b].some((r) => r.allowed === false && r.reason === Budget.BUDGET_REASONS.capReached),
      JSON.stringify([a.reason, b.reason]));
  }

  /* ---------- G. D1 galat = FAIL-CLOSED ---------------------------------- */
  {
    const now = Date.parse(CLOCK_ISO);
    const dead = { prepare: () => { throw new Error('D1_DOWN'); } };
    const noDb = await Budget.reserveAccountNeurons({ db: null, env: {}, neurons: 1, now });
    const broken = await Budget.reserveAccountNeurons({ db: dead, env: {}, neurons: 1, now });
    check('G1. Tanpa binding D1: DITOLAK (ai_budget_store_missing)',
      noDb.allowed === false && noDb.reason === Budget.BUDGET_REASONS.store, JSON.stringify(noDb));
    check('G2. D1 melempar: DITOLAK (ai_budget_unreadable), bukan diizinkan',
      broken.allowed === false && broken.reason === Budget.BUDGET_REASONS.unreadable, JSON.stringify(broken));

    // End-to-end: hanya statement `ai_account_day` yang mati, sisanya sehat.
    const booted = boot(worker);
    await prepareDb(booted);
    const cookie = await issueIdentity(worker, booted.env);
    instrument(booted.core, booted.timeline, { throwOnAccountDay: true });
    const res = await booted.call('POST', '/api/ai/task', { cookie, body: ROUTE_FIXTURES['POST /api/ai/task'].body });
    const ranModel = booted.timeline.some((e) => e.kind === 'ai');
    check('G3. D1 mati di jalur permintaan: 503 dan NOL panggilan model',
      res.status === 503 && !ranModel,
      res.status + ' reason=' + ((res.json && res.json.reason) || '') + ' ai=' + ranModel);
    check('G4. Penolakan D1-mati tidak menagih jatah murid',
      res.json && res.json.quotaCharged === false && res.json.quotaChecked === false,
      JSON.stringify(res.json && { c: res.json.quotaChecked, ch: res.json.quotaCharged }));
  }

  /* ---------- H. Reservasi DILEPAS kalau panggilan model gagal ----------- */
  {
    const booted = boot(worker, {
      onRun: async () => { const e = new Error('provider menolak'); e.status = 500; throw e; }
    });
    await prepareDb(booted);
    const cookie = await issueIdentity(worker, booted.env);
    instrument(booted.core, booted.timeline);
    const res = await booted.call('POST', '/api/ai/task', { cookie, body: ROUTE_FIXTURES['POST /api/ai/task'].body });
    const row = booted.core._rows('ai_account_day')[0] || { neurons: -1 };
    const releaseSql = booted.timeline.some((e) => e.kind === 'sql' && /neurons\s*=\s*MAX\(0, neurons - /i.test(e.sql));
    check('H1. Panggilan model yang GAGAL melepas reservasinya kembali',
      releaseSql && Number(row.neurons) === 0,
      'releaseSql=' + releaseSql + ' row=' + JSON.stringify(row));
    check('H2. Amplopnya melaporkan pelepasan itu, dan murid tetap dilayani 200',
      res.status === 200 && res.json && res.json.accountNeuronsReleased === true,
      res.status + ' ' + JSON.stringify(res.json && res.json.accountNeuronsReleased));

    // TIMEOUT bukan alasan melepas: model sudah bekerja, neuronnya sudah terbelanja.
    const timedOut = boot(worker, {
      onRun: async () => { const e = new Error('provider_timeout'); e.fiezelTimeout = true; throw e; }
    });
    await prepareDb(timedOut);
    const cookie2 = await issueIdentity(worker, timedOut.env);
    instrument(timedOut.core, timedOut.timeline);
    await timedOut.call('POST', '/api/ai/task', { cookie: cookie2, body: ROUTE_FIXTURES['POST /api/ai/task'].body });
    const row2 = timedOut.core._rows('ai_account_day')[0] || { neurons: 0 };
    const released2 = timedOut.timeline.some((e) => e.kind === 'sql' && /neurons\s*=\s*MAX\(0, neurons - /i.test(e.sql));
    check('H3. TIMEOUT tidak melepas neuron (model sudah bekerja, biayanya nyata)',
      !released2 && Number(row2.neurons) > 0, 'released=' + released2 + ' row=' + JSON.stringify(row2));
    check('H4. Keputusan boleh-dilepas tinggal di SATU tempat (releasableFailure)',
      ModelCallGate.releasableFailure({ status: 500 }) === true
      && ModelCallGate.releasableFailure({ fiezelTimeout: true }) === false
      && ModelCallGate.releasableFailure({ name: 'AbortError' }) === false,
      'klasifikasi tunggal');
  }

  /* ---------- I. Gerbang ini terdaftar di CI ------------------------------ */
  {
    const wfPath = path.join(root, '.github', 'workflows', 'quality.yml');
    const wf = fs.existsSync(wfPath) ? fs.readFileSync(wfPath, 'utf8') : '';
    check('I1. Gerbang terdaftar di .github/workflows/quality.yml',
      /ai-account-cap-gate-test\.js/.test(wf),
      !wf ? 'quality.yml tidak ada' : (/ai-account-cap-gate-test\.js/.test(wf) ? 'terdaftar' : 'BELUM terdaftar di quality.yml'));
  }

  finish({
    discoveredRoutes: discovered.map((r) => r.key + ' <- ' + r.module),
    modelCapableModules: modelCapable
  });
})().catch((error) => {
  check('Gerbang selesai tanpa galat tak tertangani', false, error && error.stack ? error.stack.split('\n').slice(0, 4).join(' | ') : String(error));
  finish({ stage: 'crash' });
});
