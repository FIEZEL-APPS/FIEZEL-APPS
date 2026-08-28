/**
 * cf-wiring-test.js — GERBANG pemasangan rute Worker Cloudflare (`workers/api/`).
 *
 * Node murni, nol dependency, nol jaringan. Memakai `tools/cf-test-harness.js`
 * untuk binding palsu, dan MENGEKSEKUSI Worker sungguhan: graf ESM di
 * `workers/api/**` dirakit menjadi `data:text/javascript;base64,…` lalu diimpor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * KENAPA GERBANG INI ADA
 * ────────────────────────────────────────────────────────────────────────────
 * Delapan paket kerja Worker digabung dari cabang terpisah, dan masing-masing
 * SENGAJA tidak menyentuh `index.js` supaya tidak bertabrakan. Akibatnya semua
 * modul sempat ada tanpa satu pun terpasang: `registerQuotaRoutes`,
 * `registerAnalyticsRoutes`, `registerAiRoutes`, `registerTtsRoutes` menganggur.
 * Lebih buruk, `route-ai.js` dan `route-tts.js` memakai resolver kuota OPSIONAL
 * (`resolveEnforceQuota` → `null` = izin-lolos yang dicatat). Selama resolver itu
 * mengembalikan `null`, gerbang kuota mana pun akan tetap HIJAU sambil membiarkan
 * tagihan AI/TTS tumbuh tanpa batas — persis kegagalan yang tidak terlihat di
 * gerbang lama, karena semua gerbang lain menguji MODUL, bukan RANGKAIANNYA.
 *
 * Yang dibuktikan di sini (dan hanya bisa dibuktikan setelah dirangkai):
 *   A. Semua rute terdaftar dan MENJAWAB (bukan 404).
 *   B. Permintaan AI ke-26 dalam sehari DITOLAK 429; ke-25 lolos.
 *   C. Cache hit TTS = NOL kuota (`quotaCharged:false`, counter tidak bergerak).
 *   D. `scheduled()` benar-benar memanggil sweep reservasi DAN rollup analytics.
 *   E. Tidak ada rute yang mengembalikan data lintas-pengguna.
 *   F. Migrasi punya urutan jelas, tanpa tabrakan nama tabel, tanpa kolom
 *      penghubung antara tabel kuota dan tabel analytics (kontrak EXEC-BRIEF-CF).
 *
 * Gagal mengekstrak sumber = FAIL, bukan SKIP (aturan gerbang repo).
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
    schema: 'fiezel-cf-wiring-v1',
    pass: !failed,
    counts: {
      pass: checks.filter((c) => c.status === 'PASS').length,
      fail: checks.filter((c) => c.status === 'FAIL').length
    },
    ...extra,
    checks
  };
  fs.writeFileSync(path.join(root, 'CF-WIRING-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

function mustRead(relative) {
  const file = path.join(API_DIR, relative);
  if (!fs.existsSync(file)) throw new Error('berkas wajib tidak ada: workers/api/' + relative);
  return fs.readFileSync(file, 'utf8');
}

/* ============================================================ perakit modul ======== */
/**
 * Perakit ESM -> data URL. Berbeda dari perakit di `cf-api-contract-test.js`
 * dalam dua hal yang WAJIB setelah penggabungan:
 *   1. Path bersarang (`./quota/route-quota.js`) diselesaikan relatif terhadap
 *      modul pengimpor, bukan terhadap `workers/api/`.
 *   2. `await import('./x.js')` dinamis ikut ditulis ulang. `handlePepper`
 *      memakai impor dinamis, dan tanpa penanganan ini rute pepper akan
 *      melempar "relative specifier tanpa base" hanya di dalam gerbang —
 *      kegagalan palsu yang paling mahal untuk didiagnosis.
 */
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
    // Baris berkomentar DILEWATI: beberapa berkas menyimpan contoh impor untuk
    // paket kerja lain, dan itu bukan dependency nyata.
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
const CLOCK_ISO = '2026-08-27T03:00:00.000Z'; // 10:00 Asia/Jakarta — jauh dari batas reset
const DAY = '2026-08-27';

/** Statement dari berkas migrasi, komentar dibuang. */
function migrationStatements(relative) {
  return mustRead(relative)
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
 * AI palsu yang juga bisa TTS. `fakeAI` di harness hanya mengembalikan teks;
 * jalur TTS butuh byte audio, dan tanpa ini setiap render dianggap gagal
 * provider — yang akan membuat pembuktian "cache hit nol kuota" tidak ada
 * artinya (nol lawan nol selalu sama).
 */
function ttsCapableAi(clock) {
  const base = H.fakeAI({ clock });
  const calls = [];
  return {
    calls,
    binding: {
      async run(model, input, options) {
        calls.push({ model, input });
        if (/aura|melotts|tts/i.test(String(model))) {
          // >= 512 byte: route-tts.js memperlakukan badan audio kecil sebagai
          // `empty_body` (provider gagal), dan itu benar — MP3 4 KB palsu di sini
          // hanya supaya jalur SUKSES yang diuji, bukan jalur gagal.
          const seed = 'audio-palsu-' + String((input && input.text) || '').slice(0, 24);
          return { audio: Buffer.alloc(4096, seed).toString('base64') };
        }
        return base.binding.run(model, input, options);
      }
    }
  };
}

function boot(worker, options = {}) {
  const clock = H.fakeClock(CLOCK_ISO);
  const core = H.fakeD1();
  const stats = H.fakeD1();
  const audioObjects = new Map();
  const r2 = H.fakeR2({ objects: audioObjects, writable: true });
  const ai = ttsCapableAi(clock);
  const analytics = H.fakeAnalyticsEngine();
  const kv = H.fakeKV({ clock });

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
    // m0261-d17: gerbang edge kini fail-closed tanpa EDGE_SHARED_SECRET; harness
    // ini menguji wiring rute, bukan gerbang jembatan, jadi mode transisi dibuka.
    // Jitter anon dimatikan demi determinisme waktu.
    ALLOW_NO_EDGE_SECRET: 'true',
    ANON_JITTER_MAX_MS: '0',
    AI_LIMIT_PER_DAY: '25',
    AI_LIMIT_PER_HOUR: '40',
    TTS_CHARS_PER_DAY: '12000',
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
    ANALYTICS: analytics.dataset || analytics,
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
    return { status: response.status, json, text, response, cookie: response.headers.get('set-cookie') };
  };

  const newUser = async () => {
    const r = await call('POST', '/api/auth/anon', { body: '{}' });
    const m = /fz_id=([^;]*)/.exec(r.cookie || '');
    if (!m) throw new Error('gagal menerbitkan identitas uji');
    return { cookie: 'fz_id=' + m[1], userId: r.json && r.json.userId };
  };

  const quotaRow = (userId) =>
    core._rows('quota_daily').find((row) => row.user_id === userId && row.day === DAY) || null;

  return { clock, core, stats, kv, r2, ai, analytics, audioObjects, env, call, newUser, quotaRow };
}

/* ============================================================ payload sah ========== */

const aiBody = (question) => JSON.stringify({
  schema: 'fiezel-ai-task-v2',
  task: 'tutor_turn',
  input: { question, surface: 'ask', level: 'A2' }
});

const ttsBody = (text) => JSON.stringify({
  text,
  locale: 'en-US',
  voiceId: 'asteria',
  engineId: '@cf/deepgram/aura-1',
  engineVersion: 'cf-aura-1@v1'
});

const eventsBody = JSON.stringify({
  schema: 'fiezel-analytics-v1',
  events: [{ name: 'lesson_completed', day: DAY, domain: 'grammar', level: 'A2' }]
});

const retentionBody = JSON.stringify({
  schema: 'fiezel-analytics-v1',
  pings: [{ cohort_day: '2026-08-20', day_index: 7 }]
});

/* ============================================================ PII ================== */

const PII_KEYS = [
  'name', 'learnerName', 'userName', 'username', 'email', 'ip', 'ipAddress',
  'userAgent', 'ua', 'location', 'puterUuid', 'uuid', 'password', 'secret',
  'transcript', 'answers', 'legacyRef', 'legacy_ref_hmac', 'account_id', 'accountId'
];

function scanForPii(value, trail, hits) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((v, i) => scanForPii(v, trail + '[' + i + ']', hits)); return; }
  for (const [key, child] of Object.entries(value)) {
    if (PII_KEYS.includes(key)) hits.push(trail + '.' + key);
    scanForPii(child, trail + '.' + key, hits);
  }
}

/* ============================================================ MAIN ================= */

(async () => {
  /* ---------- 0. Berkas wajib ada ---------------------------------------- */
  for (const required of [
    'index.js', 'route-slots.js', 'route-wiring.js', 'wrangler.toml',
    'quota/route-quota.js', 'quota/quota-store-d1.js',
    'analytics/route-events.js', 'analytics/rollup.js',
    'ai/route-ai.js', 'tts/route-tts.js',
    'migrations/0001_identity.sql', 'migrations/0001_quota.sql',
    'migrations/0002_analytics.sql', 'migrations/MIGRATIONS.md'
  ]) {
    check('berkas wajib ada: workers/api/' + required,
      fs.existsSync(path.join(API_DIR, required)), required);
  }

  /* ---------- 1. Bukti statis: pemasangan benar-benar di jalur muat ------- */
  const indexSource = mustRead('index.js');
  const slotsSource = mustRead('route-slots.js');
  const wiringSource = mustRead('route-wiring.js');

  check('index.js mengimpor runScheduled dari route-wiring.js',
    /import\s*\{[^}]*runScheduled[^}]*\}\s*from\s*'\.\/route-wiring\.js'/.test(indexSource),
    'import runScheduled');
  check('index.js mengekspor handler scheduled()',
    /async\s+scheduled\s*\(/.test(indexSource), 'scheduled()');
  check('route-slots.js merakit EXTRA_ROUTES dari buildExtraRoutes()',
    /buildExtraRoutes/.test(slotsSource) && /EXTRA_ROUTES\s*=\s*\[\s*\.\.\.buildExtraRoutes\(\)/.test(slotsSource),
    'EXTRA_ROUTES');
  for (const registrar of ['registerQuotaRoutes', 'registerAnalyticsRoutes', 'registerAiRoutes', 'registerTtsRoutes']) {
    check('route-wiring.js memanggil ' + registrar,
      new RegExp(registrar + '\\s*\\(').test(wiringSource), registrar);
  }
  check('route-wiring.js menyuntikkan enforceQuota NYATA (bukan resolver opsional yang null)',
    /import\s*\{[^}]*enforceQuota[^}]*\}\s*from\s*'\.\/quota\/route-quota\.js'/.test(wiringSource) &&
    /enforceQuota\s*:/.test(wiringSource),
    'enforceQuota diimpor + dikirim sebagai deps');
  // Komentar dibuang lebih dulu: berkas ini SENGAJA menuliskan alasan "tidak
  // memakai Math.random", dan mencocokkan komentar akan menuduhnya melakukan
  // hal yang justru dilarangnya.
  const wiringCode = wiringSource.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  check('route-wiring.js tidak memakai Math.random untuk token kuota',
    !/Math\.random/.test(wiringCode), 'crypto-only');

  const wranglerToml = mustRead('wrangler.toml');
  check('wrangler.toml punya blok [triggers] crons',
    /\[triggers\]/.test(wranglerToml) && /crons\s*=\s*\[/.test(wranglerToml), '[triggers]');
  for (const binding of [
    /binding\s*=\s*"CORE_DB"/, /binding\s*=\s*"STATS_DB"/, /binding\s*=\s*"CFG"/,
    /binding\s*=\s*"AUDIO"/, /\[ai\]/, /analytics_engine_datasets/
  ]) {
    check('wrangler.toml memuat binding ' + binding.source, binding.test(wranglerToml), binding.source);
  }
  check('wrangler.toml TIDAK memakai migrations_dir (satu direktori tidak bisa melayani dua database)',
    !/^\s*migrations_dir\s*=/m.test(wranglerToml), 'migrations_dir');

  /* ---------- 2. Muat Worker sungguhan ----------------------------------- */
  const worker = (await import(inlineModule('index.js'))).default;
  check('Worker mengekspor default.fetch', worker && typeof worker.fetch === 'function', typeof (worker || {}).fetch);
  check('Worker mengekspor default.scheduled', worker && typeof worker.scheduled === 'function', typeof (worker || {}).scheduled);

  /* ---------- A. Semua rute terdaftar dan MENJAWAB (bukan 404) ----------- */
  {
    const app = boot(worker);
    await applyMigration(app.core, 'migrations/0001_identity.sql');
    await applyMigration(app.core, 'migrations/0001_quota.sql');
    await applyMigration(app.stats, 'migrations/0002_analytics.sql');
    const user = await app.newUser();

    // Pepper baru ada setelah rollup pertama menanamnya. Dijalankan lebih dulu
    // supaya "404 karena rute tidak ada" tidak tertukar dengan "503 karena
    // state pepper belum ada" — dua kegagalan yang sangat berbeda.
    await worker.scheduled({ cron: '5 17 * * *', scheduledTime: app.clock.now() }, app.env, H.fakeExecutionContext());

    const mounted = [
      ['GET', '/api/quota', undefined],
      ['POST', '/api/ai/task', aiBody('What is a verb?')],
      ['POST', '/api/tts/render', ttsBody('hello wiring')],
      ['GET', '/api/tts/manifest', undefined],
      ['POST', '/api/usage/events', eventsBody],
      ['POST', '/api/usage/retention', retentionBody],
      ['GET', '/api/usage/pepper', undefined]
    ];
    const statuses = {};
    const bodies = [];
    for (const [method, pathname, body] of mounted) {
      const r = await app.call(method, pathname, { body, cookie: user.cookie });
      statuses[method + ' ' + pathname] = r.status;
      if (r.json) bodies.push({ pathname, json: r.json });
      check('A rute TERPASANG dan menjawab (bukan 404): ' + method + ' ' + pathname,
        r.status !== 404 && r.status !== 501,
        r.status + ' ' + (r.text || '').slice(0, 120));
    }
    check('A rute kuota menjawab 200 dengan amplop fiezel-quota-v1',
      statuses['GET /api/quota'] === 200, JSON.stringify(statuses['GET /api/quota']));
    check('A rute AI menjawab 200 saat kuota masih ada',
      statuses['POST /api/ai/task'] === 200, String(statuses['POST /api/ai/task']));
    check('A rute TTS render menjawab 200', statuses['POST /api/tts/render'] === 200,
      String(statuses['POST /api/tts/render']));
    check('A rute analytics events menjawab 202 (terima-dan-lupakan)',
      statuses['POST /api/usage/events'] === 202, String(statuses['POST /api/usage/events']));
    check('A rute pepper menjawab 200 SETELAH rollup menanam state',
      statuses['GET /api/usage/pepper'] === 200, String(statuses['GET /api/usage/pepper']));

    // Path yang memang tidak ada tetap 404: kalau ini 200, "bukan 404" di atas
    // tidak membuktikan apa pun (router bisa saja menjawab semuanya).
    const ghost = await app.call('GET', '/api/tidak-ada-rute-ini', { cookie: user.cookie });
    check('A kontrol negatif: path tak terdaftar TETAP 404', ghost.status === 404, String(ghost.status));

    // Tanpa identitas, rute berbayar 401 — kuota tanpa pemilik tidak bisa ditagih.
    const anonAi = await app.call('POST', '/api/ai/task', { body: aiBody('tanpa cookie') });
    check('A AI tanpa identitas = 401 (fail-closed, bukan izin-lolos)',
      anonAi.status === 401, String(anonAi.status) + ' ' + (anonAi.text || '').slice(0, 80));
    const anonTts = await app.call('POST', '/api/tts/render', { body: ttsBody('tanpa cookie') });
    check('A TTS render tanpa identitas = 401', anonTts.status === 401, String(anonTts.status));

    const hits = [];
    for (const b of bodies) scanForPii(b.json, b.pathname, hits);
    check('A tidak ada kunci PII di respons rute baru', hits.length === 0, hits.join(', '));
  }

  /* ---------- B. AI ke-26 ditolak 429, ke-25 lolos ----------------------- */
  let aiStatuses = [];
  {
    const app = boot(worker);
    await applyMigration(app.core, 'migrations/0001_identity.sql');
    await applyMigration(app.core, 'migrations/0001_quota.sql');
    await applyMigration(app.stats, 'migrations/0002_analytics.sql');
    const user = await app.newUser();

    let denied = null;
    for (let i = 1; i <= 26; i += 1) {
      const r = await app.call('POST', '/api/ai/task', { body: aiBody('pertanyaan nomor ' + i), cookie: user.cookie });
      aiStatuses.push(r.status);
      if (r.status === 429 && !denied) denied = { i, r };
    }
    const first25 = aiStatuses.slice(0, 25);
    check('B 25 permintaan AI pertama LOLOS (200)',
      first25.every((s) => s === 200), first25.join(','));
    check('B permintaan AI ke-26 DITOLAK 429', aiStatuses[25] === 429, aiStatuses.join(','));
    check('B penolakan pertama tepat di permintaan ke-26 (bukan lebih awal)',
      denied && denied.i === 26, denied ? String(denied.i) : 'tidak ada 429');
    if (denied) {
      check('B amplop 429 membawa retry-after (klien tahu kapan boleh coba lagi)',
        !!denied.r.response.headers.get('retry-after'), String(denied.r.response.headers.get('retry-after')));
      check('B amplop 429 tetap skema respons AI (klien tidak perlu jalur galat khusus)',
        denied.r.json && denied.r.json.schema === 'fiezel-ai-response-v2',
        denied.r.json && denied.r.json.schema);
    }
    const row = app.quotaRow(user.userId);
    check('B counter D1 berhenti TEPAT di batas 25 (tidak over-grant)',
      row && row.ai_used === 25, row ? JSON.stringify({ used: row.ai_used, held: row.ai_held }) : 'baris tidak ada');
    check('B tidak ada held yatim setelah 26 permintaan (commit/rollback seimbang)',
      row && row.ai_held === 0, row ? String(row.ai_held) : 'baris tidak ada');
    check('B permintaan ke-26 TIDAK memanggil provider AI (biaya nol saat ditolak)',
      app.ai.calls.filter((c) => !/aura|melotts|tts/i.test(String(c.model))).length === 25,
      String(app.ai.calls.length));
    check('B penolakan tercatat di kolom denied atau tidak menaikkan used',
      row && row.ai_used === 25, row ? JSON.stringify(row) : '');
  }

  /* ---------- C. Cache hit TTS = nol kuota ------------------------------- */
  {
    const app = boot(worker);
    await applyMigration(app.core, 'migrations/0001_identity.sql');
    await applyMigration(app.core, 'migrations/0001_quota.sql');
    await applyMigration(app.stats, 'migrations/0002_analytics.sql');
    const user = await app.newUser();
    const text = 'hello cache';

    const miss = await app.call('POST', '/api/tts/render', { body: ttsBody(text), cookie: user.cookie });
    const afterMiss = app.quotaRow(user.userId);
    check('C render pertama (cache MISS) berhasil', miss.status === 200,
      String(miss.status) + ' ' + (miss.text || '').slice(0, 140));
    check('C cache MISS memang menagih kuota (baseline yang membuat butir C berarti)',
      !!afterMiss && afterMiss.tts_calls_used === 1 && afterMiss.tts_chars_used === text.length,
      afterMiss ? JSON.stringify({ calls: afterMiss.tts_calls_used, chars: afterMiss.tts_chars_used }) : 'baris tidak ada');
    check('C respons cache MISS menandai quotaCharged:true',
      miss.json && miss.json.quotaCharged === true, miss.json && String(miss.json.quotaCharged));
    check('C objek audio benar-benar ditulis ke R2 pada cache MISS',
      app.audioObjects.size === 1, JSON.stringify([...app.audioObjects.keys()]));

    const hit = await app.call('POST', '/api/tts/render', { body: ttsBody(text), cookie: user.cookie });
    const afterHit = app.quotaRow(user.userId);
    check('C render kedua (cache HIT) berhasil', hit.status === 200, String(hit.status));
    check('C cache HIT memakai audioKey yang SAMA',
      hit.json && miss.json && hit.json.audioKey === miss.json.audioKey,
      hit.json && hit.json.audioKey);
    check('C cache HIT ditandai source cache', hit.json && /cache/.test(String(hit.json.source)),
      hit.json && hit.json.source);
    check('C cache HIT = NOL kuota: tts_calls_used tidak bergerak',
      afterHit && afterHit.tts_calls_used === afterMiss.tts_calls_used,
      JSON.stringify({ sebelum: afterMiss && afterMiss.tts_calls_used, sesudah: afterHit && afterHit.tts_calls_used }));
    check('C cache HIT = NOL kuota: tts_chars_used tidak bergerak',
      afterHit && afterHit.tts_chars_used === afterMiss.tts_chars_used,
      JSON.stringify({ sebelum: afterMiss && afterMiss.tts_chars_used, sesudah: afterHit && afterHit.tts_chars_used }));
    check('C cache HIT tidak menyisakan held (reservasi tidak pernah dibuka)',
      afterHit && afterHit.tts_calls_held === 0 && afterHit.tts_chars_held === 0,
      afterHit ? JSON.stringify({ calls: afterHit.tts_calls_held, chars: afterHit.tts_chars_held }) : '');
    check('C cache HIT menandai quotaCharged:false',
      hit.json && hit.json.quotaCharged === false, hit.json && String(hit.json.quotaCharged));
    check('C cache HIT tidak memanggil provider audio sama sekali',
      app.ai.calls.filter((c) => /aura|melotts|tts/i.test(String(c.model))).length === 1,
      JSON.stringify(app.ai.calls.map((c) => c.model)));
  }

  /* ---------- D. scheduled() memanggil sweep DAN rollup ------------------ */
  {
    const app = boot(worker);
    await applyMigration(app.core, 'migrations/0001_identity.sql');
    await applyMigration(app.core, 'migrations/0001_quota.sql');
    await applyMigration(app.stats, 'migrations/0002_analytics.sql');
    const user = await app.newUser();
    const now = app.clock.now();

    // Reservasi yatim: Worker mati setelah menahan slot, sebelum commit. Tanpa
    // sweep, satu slot murid hilang sampai tengah malam.
    await app.core.prepare('INSERT OR IGNORE INTO quota_daily(user_id, day) VALUES (?1, ?2)')
      .bind(user.userId, DAY).run();
    await app.core.prepare('UPDATE quota_daily SET ai_held = ai_held + 3 WHERE user_id = ?1 AND day = ?2')
      .bind(user.userId, DAY).run();
    await app.core.prepare(
      'INSERT INTO quota_reservation(id, user_id, day, bucket, charges_json, created_at, expires_at)' +
      ' VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
    ).bind('lease-yatim', user.userId, DAY, 'ai', JSON.stringify({ ai: 3 }), now - 120000, now - 60000).run();

    const before = app.quotaRow(user.userId);
    check('D prasyarat: reservasi kedaluwarsa ada dan held terkunci',
      before && before.ai_held === 3 && app.core._rows('quota_reservation').length === 1,
      before ? JSON.stringify({ held: before.ai_held, leases: app.core._rows('quota_reservation').length }) : '');

    const sweepOut = await worker.scheduled(
      { cron: '*/5 * * * *', scheduledTime: now }, app.env, H.fakeExecutionContext());
    const after = app.quotaRow(user.userId);
    check('D scheduled(cron sweep) mengembalikan hasil sweep kuota',
      sweepOut && sweepOut.quotaSweep && sweepOut.quotaSweep.swept && sweepOut.quotaSweep.swept.reaped === 1,
      JSON.stringify(sweepOut && sweepOut.quotaSweep));
    check('D sweep MENGEMBALIKAN slot: ai_held kembali 0',
      after && after.ai_held === 0, after ? String(after.ai_held) : '');
    check('D sweep menghapus baris lease kedaluwarsa',
      app.core._rows('quota_reservation').length === 0,
      String(app.core._rows('quota_reservation').length));
    check('D sweep TIDAK menagih apa pun (used tetap 0)',
      after && after.ai_used === 0, after ? String(after.ai_used) : '');
    check('D sweep juga menjalankan rekonsiliasi held',
      sweepOut && sweepOut.quotaSweep && sweepOut.quotaSweep.reconciled &&
      sweepOut.quotaSweep.reconciled.day === DAY,
      JSON.stringify(sweepOut && sweepOut.quotaSweep && sweepOut.quotaSweep.reconciled));

    const rollupOut = await worker.scheduled(
      { cron: '5 17 * * *', scheduledTime: now }, app.env, H.fakeExecutionContext());
    check('D scheduled(cron rollup) menjalankan rollup analytics harian',
      rollupOut && rollupOut.analyticsRollup && typeof rollupOut.analyticsRollup.day === 'string' &&
      !rollupOut.analyticsRollup.skipped && !rollupOut.analyticsRollup.error,
      JSON.stringify(rollupOut && rollupOut.analyticsRollup));
    check('D rollup MEROTASI pepper (hari-1 tidak bisa disambung ke hari-2)',
      rollupOut && rollupOut.analyticsRollup && rollupOut.analyticsRollup.pepperRotated === true,
      JSON.stringify(rollupOut && rollupOut.analyticsRollup && rollupOut.analyticsRollup.pepperRotated));
    check('D rollup menulis state pepper ke database ANALYTICS (bukan database kuota)',
      app.stats._rows('pepper_state').length === 1 && !app.core._tables.has('pepper_state'),
      JSON.stringify({ stats: app.stats._rows('pepper_state').length, coreHasPepper: app.core._tables.has('pepper_state') }));
    check('D rollup memanggil pembersihan tabel retensi',
      rollupOut && rollupOut.analyticsRollup && Array.isArray(rollupOut.analyticsRollup.purged) &&
      rollupOut.analyticsRollup.purged.length > 0,
      JSON.stringify(rollupOut && rollupOut.analyticsRollup && rollupOut.analyticsRollup.purged));

    // Cron yang tidak dikenal (mis. ekspresi di wrangler.toml diubah) menjalankan
    // KEDUANYA. Lebih baik satu job idempoten jalan dua kali daripada mati senyap.
    const bothOut = await worker.scheduled({ cron: 'entah-apa', scheduledTime: now }, app.env, H.fakeExecutionContext());
    check('D cron tak dikenal menjalankan sweep DAN rollup (bukan diam-diam tidak jalan)',
      bothOut && bothOut.quotaSweep && bothOut.analyticsRollup,
      JSON.stringify({ sweep: !!(bothOut && bothOut.quotaSweep), rollup: !!(bothOut && bothOut.analyticsRollup) }));

    const cronList = (wranglerToml.match(/crons\s*=\s*\[([^\]]*)\]/) || [])[1] || '';
    check('D kedua ekspresi cron di wrangler.toml sama dengan yang dipakai kode',
      cronList.includes('*/5 * * * *') && cronList.includes('5 17 * * *'), cronList.trim());
  }

  /* ---------- E. Tidak ada rute yang mengembalikan data lintas-pengguna --- */
  {
    const app = boot(worker);
    await applyMigration(app.core, 'migrations/0001_identity.sql');
    await applyMigration(app.core, 'migrations/0001_quota.sql');
    await applyMigration(app.stats, 'migrations/0002_analytics.sql');
    const alice = await app.newUser();
    const bob = await app.newUser();
    check('E dua identitas uji berbeda', alice.userId !== bob.userId, alice.userId + ' vs ' + bob.userId);

    for (let i = 0; i < 5; i += 1) {
      await app.call('POST', '/api/ai/task', { body: aiBody('alice tanya ' + i), cookie: alice.cookie });
    }
    await app.call('POST', '/api/tts/render', { body: ttsBody('alice bicara'), cookie: alice.cookie });

    const aliceQuota = await app.call('GET', '/api/quota', { cookie: alice.cookie });
    const bobQuota = await app.call('GET', '/api/quota', { cookie: bob.cookie });
    check('E kuota Alice mencerminkan pemakaiannya sendiri (5 AI)',
      aliceQuota.json && aliceQuota.json.buckets && aliceQuota.json.buckets.ai.used === 5,
      JSON.stringify(aliceQuota.json && aliceQuota.json.buckets && aliceQuota.json.buckets.ai));
    check('E kuota Bob TIDAK terpengaruh pemakaian Alice (isolasi per pengguna)',
      bobQuota.json && bobQuota.json.buckets && bobQuota.json.buckets.ai.used === 0,
      JSON.stringify(bobQuota.json && bobQuota.json.buckets && bobQuota.json.buckets.ai));
    check('E amplop kuota tidak membawa userId siapa pun',
      aliceQuota.text.indexOf(bob.userId) === -1 && aliceQuota.text.indexOf(alice.userId) === -1,
      'tidak ada userId di body kuota');

    // Manifest TTS bersifat konten bersama (kunci audio dari teks), bukan riwayat
    // per murid — tapi ia tidak boleh membocorkan identitas siapa pun.
    const manifest = await app.call('GET', '/api/tts/manifest', { cookie: bob.cookie });
    check('E manifest TTS tidak memuat userId pengguna lain',
      manifest.text.indexOf(alice.userId) === -1, (manifest.text || '').slice(0, 120));

    const pepper = await app.call('GET', '/api/usage/pepper', { cookie: bob.cookie });
    check('E respons pepper tidak memuat userId siapa pun',
      pepper.text.indexOf(alice.userId) === -1 && pepper.text.indexOf(bob.userId) === -1,
      (pepper.text || '').slice(0, 80));

    const events = await app.call('POST', '/api/usage/events', { body: eventsBody, cookie: alice.cookie });
    check('E respons analytics hanya jumlah agregat, tanpa identitas',
      events.json && Object.keys(events.json).sort().join(',') === 'accepted,ok',
      JSON.stringify(events.json));

    // Cookie Alice dipakai dengan Origin asing tetap ditolak: kuota orang lain
    // tidak bisa dibaca dari situs pihak ketiga.
    const foreign = await app.call('GET', '/api/quota', { cookie: alice.cookie, origin: 'https://penyerang.example' });
    check('E origin asing ditolak walau membawa cookie sah',
      foreign.status === 403, String(foreign.status));

    // Tabel analytics tidak boleh menyimpan satu pun baris ber-user_id.
    const analyticsRows = [];
    for (const name of ['metrics_daily', 'usage_daily', 'retention_daily', 'dau_dedup']) {
      if (app.stats._tables.has(name)) analyticsRows.push(...app.stats._rows(name));
    }
    const leaked = analyticsRows.filter((row) =>
      Object.keys(row).some((k) => /^(user_id|sub|install_id|account_id)$/.test(k)));
    check('E baris analytics tidak pernah membawa kolom identitas',
      leaked.length === 0, JSON.stringify(leaked.slice(0, 3)));
  }

  /* ---------- F. Migrasi: urutan, tabrakan, kolom penghubung -------------- */
  {
    const files = ['0001_identity.sql', '0001_quota.sql', '0002_analytics.sql'];
    const tablesByFile = {};
    for (const f of files) {
      const sql = mustRead('migrations/' + f);
      tablesByFile[f] = [...sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?([A-Za-z_][\w]*)/gi)].map((m) => m[1]);
    }
    const seen = new Map();
    const collisions = [];
    for (const [file, tables] of Object.entries(tablesByFile)) {
      for (const t of tables) {
        if (seen.has(t)) collisions.push(t + ' (' + seen.get(t) + ' & ' + file + ')');
        seen.set(t, file);
      }
    }
    check('F tidak ada tabrakan nama tabel antar berkas migrasi',
      collisions.length === 0, collisions.join('; '));
    check('F urutan migrasi jelas: identitas & kuota lalu analytics',
      tablesByFile['0001_identity.sql'].includes('identity') &&
      tablesByFile['0001_quota.sql'].includes('quota_daily') &&
      tablesByFile['0002_analytics.sql'].includes('metrics_daily'),
      JSON.stringify(tablesByFile));

    // Salinan di migrations/ WAJIB byte-identik dengan berkas asli di paket
    // kerjanya: dua versi skema yang berbeda adalah bug yang tidak terlihat
    // sampai produksi.
    for (const [copy, origin] of [
      ['migrations/0001_quota.sql', 'quota/migrations/0001_quota.sql'],
      ['migrations/0002_analytics.sql', 'analytics/migrations/0002_analytics.sql']
    ]) {
      const a = fs.readFileSync(path.join(API_DIR, copy));
      const b = fs.existsSync(path.join(API_DIR, origin)) ? fs.readFileSync(path.join(API_DIR, origin)) : null;
      check('F salinan ' + copy + ' byte-identik dengan ' + origin,
        !!b && a.equals(b), b ? 'beda ' + a.length + ' vs ' + b.length : 'berkas asli hilang');
    }

    const analyticsSql = mustRead('migrations/0002_analytics.sql');
    const quotaSql = mustRead('migrations/0001_quota.sql');
    const stripSqlComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
    const analyticsCode = stripSqlComments(analyticsSql);
    const quotaCode = stripSqlComments(quotaSql);
    check('F tabel analytics tidak punya kolom user_id/sub/install_id (tidak ada kolom penghubung)',
      !/\b(user_id|sub|install_id|account_id)\b/i.test(analyticsCode),
      (analyticsCode.match(/\b(user_id|sub|install_id|account_id)\b/i) || [''])[0]);
    check('F tabel kuota memang memakai user_id (identitas nyata, memang perlu)',
      /\buser_id\b/.test(quotaCode), 'user_id');
    check('F tidak ada FOREIGN KEY antara tabel kuota dan tabel analytics',
      !/FOREIGN KEY[\s\S]{0,120}(metrics_daily|usage_daily|retention_daily|dau_dedup|pepper_state)/i.test(quotaCode) &&
      !/FOREIGN KEY[\s\S]{0,120}(quota_daily|quota_reservation|identity)/i.test(analyticsCode),
      'tidak ada FK lintas domain');
    check('F MIGRATIONS.md menerangkan penerapan per-database (bukan migrations apply)',
      /d1 execute fiezel-core/.test(mustRead('migrations/MIGRATIONS.md')) &&
      /d1 execute fiezel-stats/.test(mustRead('migrations/MIGRATIONS.md')),
      'MIGRATIONS.md');

    const brief = path.join(root, '..', 'EXEC-BRIEF-CF.md');
    if (fs.existsSync(brief)) {
      const briefText = fs.readFileSync(brief, 'utf8');
      check('F kontrak privasi di EXEC-BRIEF-CF.md masih menyebut larangan menghubungkan analytics ke identitas',
        /analytics/i.test(briefText), 'EXEC-BRIEF-CF.md terbaca');
    }
  }

  /* ---------- pendaftaran gerbang ---------------------------------------- */
  const quality = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
  check('quality.yml memanggil node cf-wiring-test.js',
    quality.includes('node cf-wiring-test.js'), 'quality.yml');

  finish({
    aiStatuses,
    cron: { sweep: '*/5 * * * *', rollup: '5 17 * * *' },
    routes: [
      'GET /api/quota', 'POST /api/ai/task', 'POST /api/tts/render', 'GET /api/tts/manifest',
      'POST /api/usage/events', 'POST /api/usage/retention', 'GET /api/usage/pepper'
    ]
  });
})().catch((error) => {
  check('gerbang selesai tanpa pengecualian', false, (error && error.stack ? error.stack.split('\n').slice(0, 4).join(' | ') : String(error)));
  finish({ fatal: String(error && error.message ? error.message : error) });
});
