/**
 * FIEZEL gerbang — quota-manipulation-test.js
 *
 * Satu klaim yang diuji: **tidak ada satu pun angka kuota yang berasal dari klien.**
 * Desain: reports/cf-b3-quota.md §7 (daftar nilai klien yang harus berhenti dipercaya).
 *
 * Model penyerangnya realistis, bukan hipotetis: seluruh state kuota versi lama hidup di
 * localStorage perangkat murid, jadi "menyerang" berarti membuka devtools dan menulis satu
 * baris. Gerbang ini memaksa server memutuskan sendiri, dan mengunci dua arah:
 *
 *   M1  statis  — modul keputusan tidak pernah MEMBACA body/query/header untuk angka kuota
 *   M2  statis  — tidak ada nama field klien yang dipercaya (used, remaining, plan, tz, dst.)
 *   M3  dinamis — `GET /api/quota` dengan body/query/header bermusuhan = identik dengan bersih
 *   M4  dinamis — mengaku `used:0` saat server penuh → tetap 429, provider tidak dipanggil
 *   M5  dinamis — mengaku `plan:'plus'` → respons tetap `plan:'free'`, paymentEnabled false
 *   M6  dinamis — mengaku `cacheHit:true` → TTS tetap ditagih (hanya R2.head yang berwenang)
 *   M7  dinamis — bucket ditentukan titik pasang; label `kind` dari klien tidak menggeser
 *   M8  dinamis — token reservasi palsu tidak bisa dipakai commit/rollback
 *   M9  dinamis — `promptChars` palsu tidak berarti; panjang diukur server → 413
 *   M10 dinamis — kegagalan provider = rollback + 502/503, BUKAN 429, dan tidak menagih
 *   M11 privasi — badan respons tidak membawa PII maupun prosa Indonesia dari server
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadQuotaModules, stripComments } = require('./tools/quota-module-loader.js');

const root = __dirname;
const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: String(details) });
  if (!ok) failed = true;
};
function finish(SCHEMA, REPORT, extra = {}) {
  const report = {
    schema: SCHEMA,
    pass: !failed,
    counts: { pass: checks.filter((c) => c.status === 'PASS').length, fail: checks.filter((c) => c.status === 'FAIL').length },
    ...extra,
    checks
  };
  fs.writeFileSync(path.join(root, REPORT), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
}

const mod = loadQuotaModules();
const SOURCES = mod.sources;

/* ============================================================ M1/M2 statis ========== */

const DECISION_FILES = ['quota-config.js', 'quota-core.js', 'quota-store-d1.js', 'route-quota.js'];
const READ_PATTERNS = [
  [/\bawait\s+\w*(?:req|request)\w*\.json\s*\(/i, 'membaca body permintaan'],
  [/\breq(?:uest)?\.body\b/i, 'req.body'],
  [/\bctx\.body\b/i, 'ctx.body'],
  [/\bsearchParams\b/i, 'query string'],
  [/\bnew\s+URL\s*\(/i, 'parsing URL'],
  [/\.headers\s*\.\s*get\s*\(/i, 'membaca header mentah'],
  [/\bformData\s*\(/i, 'formData'],
  [/\bJSON\.parse\s*\(\s*(?:body|payload|raw|input)/i, 'parse body']
];
for (const file of DECISION_FILES) {
  const code = stripComments(SOURCES[file]);
  const hits = READ_PATTERNS.filter(([re]) => re.test(code)).map(([, label]) => label);
  check('M1 ' + file + ': tidak ada pembacaan body/query/header untuk keputusan kuota',
    hits.length === 0, hits.length ? hits.join(', ') : 'bersih');
}

// Nama-nama field yang DULU dipercaya dari klien (cf-b3 §7). Tidak boleh muncul sebagai
// pembacaan properti di jalur keputusan. `stripComments` dipakai supaya dokumentasi jujur
// tentang penyerangnya tidak ikut menggagalkan gerbangnya sendiri.
const CLIENT_FIELDS = [
  'aiUsedToday', 'ttsUsedToday', 'ttsCharsToday', 'aiTranslateUsedToday',
  'usedToday', 'quotaUsed', 'quotaRemaining', 'remainingToday',
  'promptChars', 'charCount', 'estimatedChars', 'cacheHit', 'clientCacheHit',
  'timeZone', 'tzOffset', 'clientTime', 'clientNow', 'localDay',
  'reservationId', 'quotaToken', 'plan', 'tier', 'isPremium', 'maxOutputTokens', 'limitOverride'
];
const combined = DECISION_FILES.map((f) => stripComments(SOURCES[f])).join('\n');
const trusted = [];
for (const field of CLIENT_FIELDS) {
  // Pola berbahaya = pembacaan dari sesuatu yang datang dari luar: x.body.field, ctx.field,
  // payload.field, input.field, client.field, request.field.
  const re = new RegExp('\\b(?:body|payload|input|client|request|req|query|params|headers|untrusted)\\s*(?:\\.\\w+\\s*)*\\.\\s*' + field + '\\b');
  if (re.test(combined)) trusted.push(field);
}
check('M2 tidak satu pun dari ' + CLIENT_FIELDS.length + ' field klien (cf-b3 §7) dibaca sebagai sumber angka',
  trusted.length === 0, trusted.length ? trusted.join(', ') : 'nol field dipercaya');
check('M2 batas kuota hanya datang dari quota-config.js (bukan literal di rute/penyimpanan)',
  !/\b(?:FREE_AI_DAILY_LIMIT|FREE_TTS_DAILY_CHARS)\s*=/.test(stripComments(SOURCES['route-quota.js']) + stripComments(SOURCES['quota-store-d1.js'])),
  'single source');
check('M2 id reservasi dibuat SERVER (`newToken`), tidak pernah diterima dari luar',
  /newToken\s*\(\s*\)/.test(stripComments(SOURCES['route-quota.js'])) &&
  !/token\s*=\s*(?:body|payload|input|client|req)/.test(stripComments(SOURCES['route-quota.js'])),
  'server-minted token');
check('M2 gerbang D1 memakai penjaga atomik `used + held < limit` di SQL, bukan cek di JS',
  /used[\s\S]{0,80}held[\s\S]{0,40}<[\s\S]{0,20}limit|\+\s*:amount\s*<=/.test(SOURCES['quota-store-d1.js']) &&
  /RETURNING/.test(SOURCES['quota-store-d1.js']),
  'guarded UPDATE ... RETURNING');

/* ============================================================ dudukan uji =========== */

const WIB = 7 * 3600000;
const NOW = Date.UTC(2026, 7, 27, 3, 0, 0);         // 10:00 WIB
const LIMITS = { ai: 25, aiTranslate: 15, ttsCalls: 120, ttsChars: 12000 };

const core = {
  createState: mod.get('createState'),
  reserve: mod.get('reserve'),
  commit: mod.get('commit'),
  rollback: mod.get('rollback'),
  snapshot: mod.get('snapshot')
};

/**
 * Penyimpanan tiruan: bukan tiruan ATURAN, tetapi tiruan D1 saja. Keputusan tetap dihitung
 * oleh `quota-core.js` yang asli, jadi yang diuji di sini adalah kabel rutenya.
 */
function makeStore(initialCounters) {
  let state = core.createState(NOW, LIMITS);
  if (initialCounters) Object.assign(state.counters, initialCounters);
  return {
    get state() { return state; },
    loadStateD1: async () => state,
    reserveD1: async (db, args) => {
      const out = core.reserve(state, args.bucket, args.amount, args.now, { token: args.token, ttlMs: args.ttlMs });
      state = out.state;
      return out.ok ? { ok: true, token: args.token } : { ok: false, error: out.error, scope: out.scope };
    },
    commitD1: async (db, args) => {
      const out = core.commit(state, args.token, args.actual);
      state = out.state;
      return out;
    },
    rollbackD1: async (db, args) => {
      const out = core.rollback(state, args.token, args.reason);
      state = out.state;
      return out;
    }
  };
}
function installStore(store) {
  mod.set('loadStateD1', store.loadStateD1);
  mod.set('reserveD1', store.reserveD1);
  mod.set('commitD1', store.commitD1);
  mod.set('rollbackD1', store.rollbackD1);
}

let tokenSeq = 0;
function makeCtx(extra) {
  const captured = [];
  const ctx = {
    db: { name: 'fake-d1' },
    userId: 'u_server_side_only',
    limits: LIMITS,
    now: NOW,
    nowAfter: () => NOW + 1200,
    newToken: () => 'srv-' + (++tokenSeq),
    json: (body, status, headers) => { captured.push({ body, status, headers }); return { body, status, headers }; },
    captured
  };
  return Object.assign(ctx, extra || {});
}

/** Muatan bermusuhan yang dipakai di semua kasus di bawah. */
const HOSTILE = Object.freeze({
  aiUsedToday: 0, ttsUsedToday: 0, ttsCharsToday: 0, aiTranslateUsedToday: 0,
  quotaUsed: 0, quotaRemaining: 9999, remainingToday: 9999, limitOverride: 100000,
  plan: 'plus', tier: 'premium', isPremium: true, paymentEnabled: true,
  cacheHit: true, clientCacheHit: true, promptChars: 10, charCount: 1,
  timeZone: 'Etc/GMT+12', tzOffset: -720, clientTime: 0, localDay: '1970-01-01',
  reservationId: 'forged-token', quotaToken: 'forged-token', maxOutputTokens: 8192,
  userId: 'someone_else', kind: 'ai'
});

const handleGetQuota = mod.get('handleGetQuota');
const enforceQuota = mod.get('enforceQuota');
const checkPromptSize = mod.get('checkPromptSize');
const registerQuotaRoutes = mod.get('registerQuotaRoutes');

/* ============================================================ M3 GET /api/quota ===== */

const fullStore = makeStore({ ai: 25, aiTranslate: 15, ttsCalls: 120, ttsChars: 12000 });
installStore(fullStore);

(async () => {
  const clean = makeCtx();
  await handleGetQuota(clean);
  const cleanBody = clean.captured[0];

  const dirty = makeCtx({
    body: HOSTILE, payload: HOSTILE, query: HOSTILE, params: HOSTILE,
    headers: { get: () => 'x-quota-used: 0' },
    serverCacheHit: false
  });
  await handleGetQuota(dirty);
  const dirtyBody = dirty.captured[0];

  check('M3 GET /api/quota selalu 200 dan no-store',
    cleanBody.status === 200 && cleanBody.headers['cache-control'] === 'private, no-store',
    cleanBody.status + '/' + cleanBody.headers['cache-control']);
  check('M3 badan respons IDENTIK dengan/ tanpa muatan bermusuhan',
    JSON.stringify(cleanBody.body) === JSON.stringify(dirtyBody.body), 'byte-identical');
  check('M3 skema fiezel-quota-v1 dan bucket lengkap (ai/aiTranslate/ttsCalls/ttsChars)',
    cleanBody.body.schema === 'fiezel-quota-v1' &&
    ['ai', 'aiTranslate', 'ttsCalls', 'ttsChars'].every((b) => cleanBody.body.buckets[b]),
    cleanBody.body.schema);
  check('M5 plan tetap free dan paymentEnabled false walau klien mengaku plus/premium',
    dirtyBody.body.plan === 'free' && dirtyBody.body.paymentEnabled === false,
    dirtyBody.body.plan + '/' + dirtyBody.body.paymentEnabled);
  check('M5 remaining dihitung server: nol, bukan 9999 seperti klaim klien',
    dirtyBody.body.buckets.ai.remaining === 0 && dirtyBody.body.buckets.ttsChars.remaining === 0 &&
    dirtyBody.body.state === 'exhausted',
    JSON.stringify({ ai: dirtyBody.body.buckets.ai.remaining, state: dirtyBody.body.state }));
  check('M5 limit yang dikirim = angka config, bukan limitOverride klien',
    dirtyBody.body.buckets.ai.limit === 25 && dirtyBody.body.limits.maxOutputTokens === 400,
    dirtyBody.body.buckets.ai.limit + '/' + dirtyBody.body.limits.maxOutputTokens);
  check('M3 resetAt/resetTimezone dari server (WIB), bukan dari tz klien',
    dirtyBody.body.resetTimezone === 'Asia/Jakarta' && dirtyBody.body.resetAt === Date.UTC(2026, 7, 28, 0, 0, 0) - WIB,
    dirtyBody.body.resetTimezone);

  /* ========================================================== M4 429 tetap 429 ====== */

  let providerCalled = 0;
  const gate = enforceQuota('ai', 1);
  const denyCtx = makeCtx({ body: HOSTILE, query: HOSTILE });
  const denied = await gate(denyCtx, async () => { providerCalled++; return { ok: true }; });
  check('M4 mengaku used:0 saat server penuh → 429 quota_exhausted scope ai_daily',
    denied.status === 429 && denied.body.error === 'quota_exhausted' && denied.body.scope === 'ai_daily',
    denied.status + '/' + denied.body.scope);
  check('M4 provider TIDAK dipanggil sama sekali saat kuota habis (nol biaya)',
    providerCalled === 0, 'calls=' + providerCalled);
  check('M4 penolakan membawa quotaCharged:false + retryAfterMs + copyKey (tanpa prosa)',
    denied.body.quotaCharged === false && Number.isFinite(denied.body.retryAfterMs) &&
    denied.body.copyKey === 'quota.ai.exhausted',
    denied.body.copyKey);

  /* ========================================================== M6 cache hit ========== */

  const ttsStore = makeStore();
  installStore(ttsStore);
  const ttsGate = enforceQuota('tts', (ctx) => ctx.serverText.length);
  const fakeHit = makeCtx({ body: HOSTILE, serverCacheHit: false, serverText: 'x'.repeat(438) });
  await ttsGate(fakeHit, async () => ({ ok: true }));
  check('M6 klaim cacheHit:true dari klien TIDAK menggratiskan TTS (438 char ditagih)',
    ttsStore.state.counters.ttsChars === 438 && ttsStore.state.counters.ttsCalls === 1 && fakeHit.quota.charged === true,
    ttsStore.state.counters.ttsChars);

  const realHit = makeCtx({ body: {}, serverCacheHit: true, serverText: 'x'.repeat(438) });
  await ttsGate(realHit, async () => ({ ok: true }));
  check('M6 cache hit yang ditentukan SERVER benar-benar gratis (counter tak bergerak)',
    ttsStore.state.counters.ttsChars === 438 && realHit.quota.charged === false && realHit.quota.reason === 'cache_hit',
    realHit.quota.reason);
  check('M6 panjang ditagih dari teks yang DIUKUR server, bukan charCount:1 dari klien',
    ttsStore.state.counters.ttsChars !== 1, ttsStore.state.counters.ttsChars);

  /* ========================================================== M7 bucket ============= */

  const trStore = makeStore({ ai: 15, aiTranslate: 15 });
  installStore(trStore);
  // Klien mengirim kind:'ai' berharap dinilai dengan limit 25, padahal rutenya translate.
  const trGate = enforceQuota('aiTranslate', 1);
  const trDeny = await trGate(makeCtx({ body: HOSTILE }), async () => ({ ok: true }));
  check('M7 label kind:"ai" dari klien tidak menggeser bucket: tetap ai_translate_daily',
    trDeny.status === 429 && trDeny.body.scope === 'ai_translate_daily', String(trDeny.body.scope));
  const tutorGate = enforceQuota('ai', 1);
  const tutorOk = await tutorGate(makeCtx({ body: {} }), async () => ({ ok: true, actual: null }));
  check('M7 rute tutor tetap jalan (sub-kuota habis ≠ AI mati) dan menagih ai saja',
    tutorOk.ok === true && trStore.state.counters.ai === 16 && trStore.state.counters.aiTranslate === 15,
    trStore.state.counters.ai + '/' + trStore.state.counters.aiTranslate);

  /* ========================================================== M8 token palsu ======== */

  const forgeStore = makeStore();
  installStore(forgeStore);
  const forgedCommit = core.commit(forgeStore.state, HOSTILE.reservationId, { ai: 1 });
  check('M8 commit dengan reservationId palsu ditolak dan tidak menagih siapa pun',
    forgedCommit.ok === false && forgedCommit.reason === 'reservation_expired' &&
    forgedCommit.state.counters.ai === 0, forgedCommit.reason);
  const forgedRollback = core.rollback(forgeStore.state, HOSTILE.quotaToken, 'klaim klien');
  check('M8 rollback dengan token palsu tidak bisa mengembalikan kuota orang lain',
    forgedRollback.ok === false && forgedRollback.reason === 'already_reaped', forgedRollback.reason);
  const realGate = enforceQuota('ai', 1);
  const realCtx = makeCtx({ body: HOSTILE });
  await realGate(realCtx, async () => ({ ok: true }));
  check('M8 token yang dipakai adalah token server (srv-*), bukan forged-token',
    /^srv-\d+$/.test(realCtx.quota.token), realCtx.quota.token);

  /* ========================================================== M9 payload =========== */

  const tooLong = 'a'.repeat(4001);
  const envelope = checkPromptSize(tooLong);
  check('M9 promptChars:10 dari klien tidak berarti: 4.001 char server → 413 payload_too_large',
    envelope && envelope.status === 413 && envelope.body.error === 'payload_too_large' &&
    envelope.body.actual === 4001 && envelope.body.limit === 4000,
    envelope && envelope.body.actual);
  check('M9 penolakan 413 terjadi SEBELUM reserve → quotaCharged:false',
    envelope.body.quotaCharged === false, String(envelope.body.quotaCharged));
  check('M9 tepat 4.000 char diterima (batas inklusif, tidak menghukum salah)',
    checkPromptSize('a'.repeat(4000)) === null, 'boundary ok');

  /* ========================================================== M10 kegagalan ======== */

  const failStore = makeStore();
  installStore(failStore);
  const failGate = enforceQuota('ai', 1);
  const timeoutRes = await failGate(makeCtx({ body: HOSTILE }), async () => { throw new Error('provider timeout after 20000ms'); });
  check('M10 provider timeout → 502 provider_error, BUKAN 429 (bukan salah murid)',
    timeoutRes.status === 502 && timeoutRes.body.error === 'provider_error', timeoutRes.status + '/' + timeoutRes.body.error);
  check('M10 kegagalan provider = rollback: kuota TIDAK terpotong',
    failStore.state.counters.ai === 0 && failStore.state.rolledBack === 1 && failStore.state.reservations.length === 0,
    'counter=' + failStore.state.counters.ai + ' rolledBack=' + failStore.state.rolledBack);
  const budgetRes = await failGate(makeCtx({ body: {} }), async () => { throw new Error('daily neuron budget exceeded'); });
  check('M10 anggaran neuron akun habis → 503 service_degraded, tanpa menagih murid',
    budgetRes.status === 503 && budgetRes.body.error === 'service_degraded' && failStore.state.counters.ai === 0,
    budgetRes.status + '/' + budgetRes.body.scope);
  const okRes = await failGate(makeCtx({ body: {} }), async () => ({ ok: true }));
  check('M10 permintaan sukses menagih tepat satu (jalur bahagia tetap jujur)',
    okRes.ok === true && failStore.state.counters.ai === 1 && failStore.state.committed === 1,
    failStore.state.counters.ai);

  /* ========================================================== M11 privasi/naskah ==== */

  const bodyJson = JSON.stringify(cleanBody.body);
  check('M11 respons tidak membawa userId/IP/nama (privasi-maks, EXEC-BRIEF)',
    !bodyJson.includes('u_server_side_only') && !/\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(bodyJson) &&
    !/learnerName|email|deviceId/i.test(bodyJson), 'no PII');
  const INDONESIAN = /\b(?:kuota|habis|besok|coba|lagi|Anda|kamu|maaf|silakan|sudah|tunggu|batas|harian)\b/i;
  const bodies = [cleanBody.body, denied.body, envelope.body, timeoutRes.body, budgetRes.body];
  const prosa = bodies.filter((b) => INDONESIAN.test(JSON.stringify(b)));
  check('M11 tidak ada prosa Indonesia dari server; hanya kode + copyKey (naskah milik klien)',
    prosa.length === 0, prosa.length ? JSON.stringify(prosa[0]) : 'kunci saja');
  check('M11 setiap amplop penolakan membawa copyKey yang bisa dipetakan klien',
    [denied.body, envelope.body, timeoutRes.body, budgetRes.body].every((b) => typeof b.copyKey === 'string' && b.copyKey.length > 0),
    'copyKey lengkap');

  /* ========================================================== pemasangan rute ====== */

  const routes = [];
  registerQuotaRoutes({ get: (p, h) => routes.push({ method: 'GET', path: p, handler: typeof h }) });
  check('registerQuotaRoutes mendaftarkan GET /api/quota tanpa menyentuh index.js',
    routes.length === 1 && routes[0].path === '/api/quota' && routes[0].handler === 'function',
    JSON.stringify(routes));
  check('tidak ada rute POST kuota yang bisa dipakai klien menurunkan pemakaian',
    !/router\.post|\.post\s*\(/.test(stripComments(SOURCES['route-quota.js'])), 'read-only');

  const quality = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
  check('quality.yml memanggil node quota-manipulation-test.js',
    quality.includes('node quota-manipulation-test.js'), 'quality.yml');

  finish('fiezel-quota-manipulation-v1', 'QUOTA-MANIPULATION-REPORT.json', {
    hostileFieldsSent: Object.keys(HOSTILE).length,
    clientFieldsChecked: CLIENT_FIELDS.length
  });
})().catch((error) => {
  check('gerbang manipulasi selesai tanpa pengecualian', false, String((error && error.stack) || error));
  finish('fiezel-quota-manipulation-v1', 'QUOTA-MANIPULATION-REPORT.json', {});
});
