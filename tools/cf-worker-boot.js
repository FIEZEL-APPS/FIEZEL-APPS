/**
 * tools/cf-worker-boot.js — MENJALANKAN WORKER SUNGGUHAN DI NODE MURNI.
 *
 * KENAPA BERKAS INI ADA (S3). Gerbang yang ingin membuktikan "amplop tidak boleh mengaku
 * menagih kalau buku jatah tidak bergerak" TIDAK BISA membuktikannya dengan memanggil
 * handler langsung: yang benar-benar menggerakkan buku jatah adalah `settleQuota()` di
 * `workers/api/route-wiring.js`, dan itu hanya jalan kalau permintaannya lewat Worker.
 * Sebelum ini satu-satunya gerbang yang bisa melakukan itu (`ai-account-cap-gate-test.js`)
 * memuat perakit graf ESM + boot env-nya sendiri, ~200 baris, di dalam berkasnya. Menyalin
 * 200 baris itu ke gerbang kedua adalah cara paling pasti membuat dua versi lingkungan uji
 * yang perlahan berbeda, lalu dua gerbang yang menguji dua Worker berbeda tanpa ada yang
 * tahu. Jadi mekanismenya dipindah ke satu tempat.
 *
 * `ai-account-cap-gate-test.js` SENGAJA belum diubah untuk memakainya: gerbang itu hijau
 * hari ini, dan memindahkan pijakannya di paket yang sama dengan perbaikan produksi berarti
 * kalau ia merah kita tidak tahu penyebabnya yang mana. Utang itu dicatat terbuka di
 * `reports/work-s3-tts-honest.md`, bukan disembunyikan.
 *
 * Nol jaringan: seluruh binding palsu datang dari `tools/cf-test-harness.js`.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const H = require('./cf-test-harness.js');

const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT, 'workers', 'api');

/* =============================================== perakit graf ESM -> satu data-URL === */
const MODULE_CACHE = new Map();
const REL = '(\\.\\.?\\/[A-Za-z0-9_.\\/-]+\\.js)';

function mustRead(relative) {
  const file = path.join(API_DIR, relative);
  if (!fs.existsSync(file)) throw new Error('berkas wajib tidak ada: workers/api/' + relative);
  return fs.readFileSync(file, 'utf8');
}

/**
 * Impor relatif diganti data-URL modul yang sudah dirakit, rekursif. Baris komentar
 * dilewati supaya prosa yang MENYEBUT nama berkas tidak ikut ditulis ulang.
 */
function inlineModule(relative, stack = []) {
  const rel = String(relative).replace(/\\/g, '/');
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

async function importApiModule(relative) {
  return import(inlineModule(relative));
}

async function loadWorker() {
  return (await importApiModule('index.js')).default;
}

/* ================================================================== migrasi D1 ====== */
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
 * Migrasi WAJIB. Kegagalannya tidak ditelan: skema yang tidak terpasang membuat setiap
 * probe menjawab 500, dan gerbang akan hijau "karena tidak pernah sampai ke pagarnya".
 */
async function prepareDb(booted) {
  for (const mig of ['0001_identity.sql', '0001_quota.sql', '0005_ai_account_budget.sql']) {
    await applyMigration(booted.core, 'migrations/' + mig);
  }
  await applyMigration(booted.stats, 'migrations/0002_analytics.sql');
}

/* ============================================================== binding palsu ======== */
const ORIGIN = 'https://fiezel.my.id';

/** AI palsu yang juga bisa TTS: byte audio >= 512 supaya jalur SUKSES yang teruji. */
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
          const seed = 'audio-palsu-' + String((input && input.text) || (input && input.prompt) || '').slice(0, 24);
          return { audio: Buffer.alloc(4096, seed).toString('base64') };
        }
        return base.binding.run(model, input, options);
      }
    }
  };
}

const FLAGS_ALL_ON = JSON.stringify({
  flags: { cfAiEnabled: true, cfTtsEnabled: true },
  enabled: { ai: true, tts: true }
});

/**
 * Boot satu Worker lengkap dengan binding palsu.
 *
 * options:
 *   clockIso     — jam tetap (bawaan 2026-08-27T03:00:00.000Z)
 *   onRun        — cegat panggilan binding AI (kembalikan undefined = perilaku bawaan)
 *   kvEntries    — isi KV `CFG`; `null` = KV KOSONG (flag tidak terbaca)
 *   vars         — timpa/tambah env var
 *   objects      — Map objek R2 awal (untuk menguji cache hit)
 *   r2Writable   — false = setiap PUT melempar (menguji jalur `stored:false`)
 */
function bootWorker(worker, options = {}) {
  const clock = H.fakeClock(options.clockIso || '2026-08-27T03:00:00.000Z');
  const core = H.fakeD1();
  const stats = H.fakeD1();
  const audioObjects = options.objects || new Map();
  const r2 = H.fakeR2({ objects: audioObjects, writable: options.r2Writable !== false });
  const timeline = [];
  const ai = ttsCapableAi(clock, {
    onRun: async (model, input) => {
      timeline.push({ kind: 'ai', model: String(model) });
      if (typeof options.onRun === 'function') return options.onRun(model, input);
      return undefined;
    }
  });
  const kv = H.fakeKV({
    clock,
    entries: options.kvEntries === null ? {} : (options.kvEntries || { 'cfg:flags': FLAGS_ALL_ON })
  });

  const env = Object.assign({
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
    AUDIO_PUBLIC_BASE: 'https://audio.fiezel.my.id',
    TEST_CLOCK_MS: String(clock.now()),
    CORE_DB: core,
    STATS_DB: stats,
    CFG: kv,
    AUDIO: r2.bucket || r2,
    AI: ai.binding,
    ANALYTICS: (H.fakeAnalyticsEngine().dataset) || H.fakeAnalyticsEngine()
  }, options.vars || {});

  const call = async (method, pathname, opt = {}) => {
    const headers = new Headers(opt.headers || {});
    if (opt.origin !== null) headers.set('origin', opt.origin || ORIGIN);
    if (opt.cookie) headers.set('cookie', opt.cookie);
    const init = { method, headers };
    if (opt.body !== undefined) {
      init.body = typeof opt.body === 'string' ? opt.body : JSON.stringify(opt.body);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
    const request = new Request('https://api.fiezel.my.id' + pathname, init);
    const response = await worker.fetch(request, env, H.fakeExecutionContext());
    const text = await response.clone().text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
    return { status: response.status, json, text, headers: response.headers };
  };

  /** Identitas anon. Cookie dibaca dari Set-Cookie, sama seperti klien sungguhan. */
  const issueIdentity = async () => {
    const res = await call('POST', '/api/auth/anon', { body: '{}' });
    const setCookie = res.headers.get('set-cookie') || '';
    const m = /fz_id=([^;]*)/.exec(setCookie);
    if (!m) throw new Error('gagal menerbitkan identitas uji: ' + res.status);
    return 'fz_id=' + m[1];
  };

  return { clock, core, stats, kv, r2, ai, env, call, issueIdentity, timeline, audioObjects };
}

module.exports = {
  ROOT,
  API_DIR,
  ORIGIN,
  FLAGS_ALL_ON,
  mustRead,
  inlineModule,
  importApiModule,
  loadWorker,
  applyMigration,
  prepareDb,
  bootWorker,
  harness: H
};
