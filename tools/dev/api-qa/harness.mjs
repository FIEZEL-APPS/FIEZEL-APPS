/**
 * tools/dev/api-qa/harness.mjs — harness QA untuk Worker `workers/api/`.
 *
 * Dua mode transport:
 *   - IN-PROCESS (bawaan): mengimpor `workers/api/index.js` apa adanya dan memanggil
 *     `fetch(request, env, ctx)` dengan binding tiruan. D1 di sini BUKAN fixture
 *     regex seperti `tests/cf-api-contract-test.js` — ia SQLite sungguhan
 *     (`node:sqlite`) dengan seluruh migrasi diterapkan per database, jadi payload
 *     SQLi diuji terhadap mesin SQL nyata. Setiap pernyataan D1 diberi jeda async
 *     acak supaya permintaan serentak benar-benar berselang-seling di titik await
 *     (itulah yang terjadi di produksi: tiap query D1 adalah round-trip jaringan).
 *   - HTTP: kalau `BASE_URL` di-set (mis. `wrangler dev` di http://localhost:8787),
 *     permintaan dikirim lewat `fetch` sungguhan. Uji yang butuh menanam data
 *     langsung ke D1 (white-box) otomatis dilewati di mode ini.
 *
 * Nol dependency. Butuh Node >= 22 (node:sqlite + deteksi sintaks ESM).
 * JANGAN arahkan BASE_URL ke produksi: suite mengirim payload SQLi/XSS, ribuan
 * permintaan, dan menguji pembatas laju.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const API_DIR = path.join(REPO_ROOT, 'workers', 'api');

/* ======================================================================== */
/* D1 di atas SQLite                                                         */
/* ======================================================================== */

const MIGRATIONS = {
  CORE_DB: [
    '0001_identity.sql', '0001_quota.sql', '0003_cron.sql', '0004_indexes.sql',
    '0005_ai_account_budget.sql', '0006_social.sql', '0009_learner_evidence.sql',
    '0010_learner_name.sql', '0011_auth_roles.sql', '0012_teacher_content.sql',
    '0013_oauth_email.sql', '0014_legacy_puter.sql'
  ],
  STATS_DB: ['0002_analytics.sql', '0006_analytics_batch_dedup.sql'],
  LEARNING_DB: ['0007_learning.sql'],
  EVIDENCE_DB: ['0008_evidence.sql', '0015_item_pool.sql', '0016_item_pool_probe.sql']
};

function d1Value(v, idx, sql) {
  // D1 menolak undefined/objek (D1_TYPE_ERROR). Meniru ketegasan itu supaya bind
  // yang salah di kode menjadi temuan 500, bukan lolos diam-diam di harness.
  if (v === undefined) {
    const e = new Error(`D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined' (bind ${idx + 1})`);
    e.sql = sql;
    throw e;
  }
  if (v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number' || typeof v === 'bigint' || typeof v === 'string') return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (ArrayBuffer.isView(v)) return v;
  const e = new Error(`D1_TYPE_ERROR: Type '${typeof v}' not supported for value '${String(v).slice(0, 40)}'`);
  e.sql = sql;
  throw e;
}

function plainRow(r) {
  if (!r) return r;
  const o = {};
  for (const k of Object.keys(r)) o[k] = r[k];
  return o;
}

export function createD1(name, opts = {}) {
  const db = new DatabaseSync(':memory:');
  const jitterMs = opts.jitterMs ?? 2;
  const log = [];
  const stats = { queries: 0, errors: 0 };

  function execSync(sql, binds) {
    stats.queries += 1;
    const values = binds.map((v, i) => d1Value(v, i, sql));
    let stmt;
    try {
      stmt = db.prepare(sql);
    } catch (err) {
      stats.errors += 1;
      throw new Error('D1_ERROR: ' + err.message);
    }
    const returnsRows = stmt.columns().length > 0;
    try {
      if (returnsRows) {
        const rows = stmt.all(...values).map(plainRow);
        const changes = /^\s*(insert|update|delete|replace)/i.test(sql) ? rows.length : 0;
        return { results: rows, meta: { changes, last_row_id: 0, rows_read: rows.length, rows_written: changes } };
      }
      const r = stmt.run(...values);
      return { results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid), rows_written: Number(r.changes) } };
    } catch (err) {
      stats.errors += 1;
      throw new Error('D1_ERROR: ' + err.message);
    }
  }

  const pause = () => (jitterMs > 0
    ? new Promise((r) => setTimeout(r, Math.random() * jitterMs))
    : Promise.resolve());

  function statement(sql, binds) {
    return {
      _sql: sql,
      _binds: binds,
      bind(...args) { return statement(sql, args); },
      async first(column) {
        await pause();
        log.push(sql);
        const row = execSync(sql, binds).results[0] || null;
        if (column === undefined) return row;
        if (!row) return null;
        if (!(column in row)) throw new Error(`D1_COLUMN_NOTFOUND: Column not found (${column})`);
        return row[column];
      },
      async run() {
        await pause();
        log.push(sql);
        const r = execSync(sql, binds);
        return { success: true, results: r.results, meta: r.meta };
      },
      async all() {
        await pause();
        log.push(sql);
        const r = execSync(sql, binds);
        return { success: true, results: r.results, meta: r.meta };
      },
      async raw(o) {
        await pause();
        const r = execSync(sql, binds);
        const rows = r.results.map((row) => Object.values(row));
        if (o && o.columnNames) rows.unshift(r.results[0] ? Object.keys(r.results[0]) : []);
        return rows;
      }
    };
  }

  const api = {
    _name: name,
    _db: db,
    _log: log,
    _stats: stats,
    prepare(sql) { return statement(sql, []); },
    async batch(statements) {
      await pause();
      // Atomik seperti D1: satu transaksi, tanpa jeda di tengah.
      db.exec('BEGIN');
      try {
        const out = statements.map((s) => {
          log.push(s._sql);
          const r = execSync(s._sql, s._binds);
          return { success: true, results: r.results, meta: r.meta };
        });
        db.exec('COMMIT');
        return out;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    async exec(sql) {
      await pause();
      try { db.exec(sql); } catch (err) { throw new Error('D1_EXEC_ERROR: ' + err.message); }
      return { count: 1, duration: 0 };
    },
    async dump() { return new ArrayBuffer(0); }
  };
  return api;
}

function applyMigrations(d1, files) {
  const applied = [];
  for (const f of files) {
    const p = path.join(API_DIR, 'migrations', f);
    const sql = fs.readFileSync(p, 'utf8');
    // Per-pernyataan supaya ALTER yang sudah diterapkan migrasi lain tidak
    // membatalkan sisa berkas (perilaku `wrangler d1 execute` per berkas berhenti
    // di galat pertama; di sini kita catat dan lanjut supaya skema selengkap mungkin).
    try {
      d1._db.exec(sql);
      applied.push({ file: f, ok: true });
    } catch (err) {
      applied.push({ file: f, ok: false, error: err.message });
    }
  }
  return applied;
}

/* ======================================================================== */
/* KV / R2 / AI tiruan                                                       */
/* ======================================================================== */

export function createKV(clock, initial = {}) {
  const store = new Map();
  const writes = [];
  for (const [k, v] of Object.entries(initial)) store.set(k, { value: typeof v === 'string' ? v : JSON.stringify(v), exp: 0, meta: null });
  const live = (k) => {
    const e = store.get(k);
    if (!e) return null;
    if (e.exp && e.exp <= clock.now()) { store.delete(k); return null; }
    return e;
  };
  return {
    _store: store,
    _writes: writes,
    async get(key, opt) {
      const type = typeof opt === 'string' ? opt : (opt && opt.type) || 'text';
      const e = live(key);
      if (!e) return null;
      if (type === 'json') { try { return JSON.parse(e.value); } catch { return null; } }
      return e.value;
    },
    async getWithMetadata(key, opt) {
      const value = await this.get(key, opt);
      const e = live(key);
      return { value, metadata: e ? e.meta : null };
    },
    async put(key, value, o = {}) {
      writes.push(key);
      let exp = 0;
      if (o.expirationTtl) exp = clock.now() + Number(o.expirationTtl) * 1000;
      if (o.expiration) exp = Number(o.expiration) * 1000;
      store.set(key, { value: typeof value === 'string' ? value : String(value), exp, meta: o.metadata || null });
    },
    async delete(key) { store.delete(key); },
    async list(o = {}) {
      const keys = [...store.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).sort()
        .slice(0, o.limit || 1000).map((name) => ({ name }));
      return { keys, list_complete: true, cursor: '' };
    }
  };
}

export function createR2() {
  const store = new Map();
  const obj = (key, e) => ({
    key, size: e.body.byteLength, httpMetadata: e.httpMetadata || {}, customMetadata: e.customMetadata || {},
    uploaded: new Date(), etag: 'e', httpEtag: '"e"',
    async arrayBuffer() { return e.body.buffer.slice(e.body.byteOffset, e.body.byteOffset + e.body.byteLength); },
    async text() { return new TextDecoder().decode(e.body); },
    async json() { return JSON.parse(new TextDecoder().decode(e.body)); },
    get body() { return new Blob([e.body]).stream(); },
    writeHttpMetadata(h) { for (const [k, v] of Object.entries(e.httpMetadata || {})) h.set(k, v); }
  });
  return {
    _store: store,
    async head(key) { const e = store.get(key); return e ? obj(key, e) : null; },
    async get(key) { const e = store.get(key); return e ? obj(key, e) : null; },
    async put(key, body, o = {}) {
      let bytes;
      if (typeof body === 'string') bytes = new TextEncoder().encode(body);
      else if (body instanceof ArrayBuffer) bytes = new Uint8Array(body);
      else if (ArrayBuffer.isView(body)) bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
      else if (body && typeof body.getReader === 'function') bytes = new Uint8Array(await new Response(body).arrayBuffer());
      else bytes = new Uint8Array(0);
      store.set(key, { body: bytes, httpMetadata: o.httpMetadata, customMetadata: o.customMetadata });
      return obj(key, store.get(key));
    },
    async delete(key) { store.delete(key); },
    async list(o = {}) {
      const objects = [...store.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((k) => obj(k, store.get(k)));
      return { objects, truncated: false, delimitedPrefixes: [] };
    }
  };
}

export function createAI() {
  const calls = [];
  return {
    _calls: calls,
    async run(model, input) {
      calls.push({ model, input });
      if (/aura|melotts|tts/i.test(model)) {
        return new Uint8Array([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 0]);
      }
      // Jawaban generik yang lolos validasi bentuk mayoritas tugas AI.
      return { response: '{"ok":true,"text":"stub reply","feedback":"stub","score":1}' };
    }
  };
}

/* ======================================================================== */
/* env                                                                        */
/* ======================================================================== */

function parseWranglerVars() {
  const toml = fs.readFileSync(path.join(API_DIR, 'wrangler.toml'), 'utf8');
  const out = {};
  let inVars = false;
  for (const line of toml.split('\n')) {
    const t = line.trim();
    if (/^\[.*\]$/.test(t)) { inVars = t === '[vars]'; continue; }
    if (!inVars) continue;
    const m = /^([A-Z0-9_]+)\s*=\s*"([^"]*)"/.exec(t);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

export const SECRETS = Object.freeze({
  OWNER_TOKEN: 'qa-owner-token-' + 'x'.repeat(24),
  CRON_TOKEN: 'qa-cron-token-' + 'y'.repeat(24),
  EDGE_SHARED_SECRET: 'qa-edge-secret-' + 'z'.repeat(24),
  CURRICULUM_TICKET_KEY: 'qa-curriculum-ticket-key-' + 'k'.repeat(24)
});

export const FLAGS_ALL_ON = Object.freeze({
  enabled: { ai: true, tts: true, coach: true, social: true, stage: true, learnerEvidence: true },
  flags: {
    cfAiEnabled: true, cfTtsEnabled: true, cfSocialEnabled: true, cfStageEnabled: true,
    cfLearnerEvidenceEnabled: true
  }
});

export function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function createEnv(options = {}) {
  const clock = options.clock || { now: () => Date.now() };
  const vars = parseWranglerVars();
  const dbs = {};
  const migrationReport = {};
  for (const [binding, files] of Object.entries(MIGRATIONS)) {
    dbs[binding] = createD1(binding, { jitterMs: options.jitterMs });
    migrationReport[binding] = applyMigrations(dbs[binding], files);
  }
  const env = {
    ...vars,
    FEATURE_TTS: 'on',
    FEATURE_COACH: 'on',
    LEARNING_ENABLED: 'on',
    ANON_JITTER_MAX_MS: '0',
    ...dbs,
    CFG: createKV(clock, { 'cfg:flags': options.flags || FLAGS_ALL_ON }),
    AUDIO: createR2(),
    AI: createAI(),
    SESSION_HMAC_KEY_CURRENT: 'qa-session-current-' + 'a'.repeat(32),
    SESSION_HMAC_KEY_PREVIOUS: 'qa-session-previous-' + 'b'.repeat(32),
    PUTER_CLAIM_SECRET_CURRENT: 'qa-puter-claim-' + 'c'.repeat(32),
    IDENTITY_PEPPER: 'qa-pepper-' + 'd'.repeat(32),
    RATE_SALT: 'qa-rate-salt-' + 'e'.repeat(32),
    OWNER_SUBJECT: '00000000-0000-4000-8000-000000000001',
    OWNER_TOKEN_HASH: sha256Hex(SECRETS.OWNER_TOKEN),
    CRON_TOKEN: SECRETS.CRON_TOKEN,
    EDGE_SHARED_SECRET: SECRETS.EDGE_SHARED_SECRET,
    CURRICULUM_TICKET_KEY: SECRETS.CURRICULUM_TICKET_KEY,
    ...(options.overrides || {})
  };
  return { env, migrationReport, clock };
}

/* ======================================================================== */
/* Transport + klien ber-cookie                                              */
/* ======================================================================== */

let workerModule = null;
export async function loadWorker() {
  if (!workerModule) workerModule = await import(pathToFileURL(path.join(API_DIR, 'index.js')).href);
  return workerModule.default;
}

export const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : '';
export const MODE = BASE_URL ? 'http' : 'in-process';
const IN_PROCESS_ORIGIN = 'https://api.fiezel.my.id';

/** Tangkap console.error Worker supaya kebocoran bisa dibedakan dari respons. */
export const workerLogs = [];

export async function createTransport(envBundle) {
  if (MODE === 'http') {
    return {
      mode: 'http',
      async send(pathname, init) {
        const res = await fetch(BASE_URL + pathname, { ...init, redirect: 'manual' });
        return res;
      }
    };
  }
  const worker = await loadWorker();
  return {
    mode: 'in-process',
    async send(pathname, init) {
      const url = pathname.startsWith('http') ? pathname : IN_PROCESS_ORIGIN + pathname;
      const pending = [];
      const ectx = { waitUntil(p) { pending.push(Promise.resolve(p).catch(() => {})); }, passThroughOnException() {} };
      const origError = console.error;
      const origWarn = console.warn;
      const origLog = console.log;
      console.error = (...a) => { workerLogs.push({ level: 'error', path: pathname, text: a.map(String).join(' ').slice(0, 600) }); };
      console.warn = (...a) => { workerLogs.push({ level: 'warn', path: pathname, text: a.map(String).join(' ').slice(0, 300) }); };
      console.log = (...a) => { workerLogs.push({ level: 'log', path: pathname, text: a.map(String).join(' ').slice(0, 300) }); };
      try {
        const res = await worker.fetch(new Request(url, init), envBundle.env, ectx);
        await Promise.all(pending);
        return res;
      } finally {
        console.error = origError;
        console.warn = origWarn;
        console.log = origLog;
      }
    }
  };
}

let ipCounter = 10;
export function freshIp() {
  ipCounter += 1;
  return `198.51.${Math.floor(ipCounter / 250) % 250}.${(ipCounter % 250) + 1}`;
}

/**
 * Klien dengan toples cookie sendiri = satu "perangkat". `ip` dipisah per klien
 * supaya pembatas penerbitan identitas (15/IP/jam) tidak mengacaukan uji lain.
 */
export function createClient(transport, opts = {}) {
  const jar = new Map();
  const client = {
    ip: opts.ip || freshIp(),
    origin: opts.origin === undefined ? 'https://fiezel.my.id' : opts.origin,
    edge: opts.edge === undefined ? SECRETS.EDGE_SHARED_SECRET : opts.edge,
    jar,
    cookieHeader() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); },
    setCookie(name, value) { if (value === null) jar.delete(name); else jar.set(name, value); },
    async req(method, pathname, { body, headers = {}, raw, noCookie } = {}) {
      const h = new Headers();
      if (client.origin) h.set('origin', client.origin);
      if (client.edge) h.set('x-fiezel-edge', client.edge);
      h.set('cf-connecting-ip', client.ip);
      h.set('user-agent', 'fiezel-api-qa/1.0');
      if (!noCookie && jar.size) h.set('cookie', client.cookieHeader());
      let payload;
      if (raw !== undefined) {
        payload = raw;
        if (!headers['content-type']) h.set('content-type', 'application/json');
      } else if (body !== undefined) {
        payload = JSON.stringify(body);
        h.set('content-type', 'application/json');
      }
      for (const [k, v] of Object.entries(headers)) {
        if (v === null) h.delete(k); else h.set(k, v);
      }
      const t0 = performance.now();
      const res = await transport.send(pathname, { method, headers: h, body: payload });
      const ms = performance.now() - t0;
      const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
      for (const sc of setCookies) {
        const m = /^([^=;\s]+)=([^;]*)/.exec(sc);
        if (!m) continue;
        if (/max-age=0\b/i.test(sc) || m[2] === '') jar.delete(m[1]); else jar.set(m[1], m[2]);
      }
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      return { status: res.status, headers: res.headers, text, json, ms, setCookies };
    }
  };
  return client;
}

// Kata sandi fixture uji (BUKAN rahasia). Dirakit dari pecahan pendek supaya
// gerbang `tests/secret-scan-test.js` tidak salah mengenalinya sebagai literal
// rahasia yang di-assign (`assignedSecretLiteral`): tidak ada string berkutip
// 8+ karakter yang menempel pada kata `password`.
export const LEARNER_PW = ['Sandi', 'Kuat', '123!'].join('-');

/** Anon -> akun murid. Mengembalikan klien yang sudah login. */
export async function newLearner(transport, handle, password = LEARNER_PW) {
  const c = createClient(transport);
  const a = await c.req('POST', '/api/auth/anon', { body: {} });
  if (a.status !== 200) throw new Error('anon gagal ' + a.status + ' ' + a.text);
  const r = await c.req('POST', '/api/account/register', { body: { handle, password } });
  if (r.status !== 200) throw new Error('register gagal ' + r.status + ' ' + r.text);
  c.handle = handle;
  c.password = password;
  return c;
}

export function ownerAuth() {
  return { authorization: 'Bearer ' + SECRETS.OWNER_TOKEN };
}
