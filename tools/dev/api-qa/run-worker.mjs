/**
 * tools/dev/api-qa/run-worker.mjs — SUITE QA Worker API (`workers/api/`).
 *
 * Jalankan dari akar repo:
 *     node tools/dev/api-qa/run-worker.mjs                # in-process (D1 = SQLite nyata)
 *     node tools/dev/api-qa/run-worker.mjs --json         # + dump JSON mentah
 *     BASE_URL=http://127.0.0.1:8787 node tools/dev/api-qa/run-worker.mjs   # lawan wrangler dev
 *
 * Cakupan (mengikuti brief QA backend):
 *   1. Endpoint discovery & contract  — tiap rute dipukul, status dikelompokkan.
 *   2. Boundary & negative input      — body kosong, tipe salah, SQLi, XSS, raksasa.
 *   3. Auth & RBAC/IDOR               — tanpa/dengan token palsu, lintas-penyewa.
 *   4. Concurrency & idempotency      — balapan pada mutasi penting.
 *   5. Error leaks & resilience       — stack/SQL/kunci tidak bocor ke klien.
 *
 * Nol dependency. Keluar kode 0 kalau tidak ada temuan severitas >= HIGH.
 */
import {
  createEnv, createTransport, createClient, newLearner, ownerAuth, loadWorker,
  workerLogs, MODE, SECRETS, FLAGS_ALL_ON
} from './harness.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');

/* ---------------------------------------------------------------------- */
/* Pelaporan                                                               */
/* ---------------------------------------------------------------------- */

const matrix = [];   // { endpoint, test, expected, got, pass, detail }
const findings = []; // { severity, endpoint, title, payload, detail }
let bundle;          // env bundle in-process (null di mode http)

const SEV = { CRIT: 'CRITICAL', HIGH: 'HIGH', MED: 'MEDIUM', LOW: 'LOW', INFO: 'INFO' };

function record(endpoint, test, pass, expected, got, detail) {
  matrix.push({ endpoint, test, pass, expected, got: String(got), detail: detail || '' });
  return pass;
}
function finding(severity, endpoint, title, payload, detail) {
  findings.push({ severity, endpoint, title, payload: payload || '', detail: detail || '' });
}

/* Payload jahat standar. */
const SQLI = [
  "x' OR '1'='1",
  "'; DROP TABLE auth_account;--",
  "' UNION SELECT sub,pass_hash,0,0,0 FROM auth_credential--",
  "admin'--",
  "1'; UPDATE auth_account SET role='owner' WHERE '1'='1"
];
const XSS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  'javascript:alert(document.cookie)',
  '{{constructor.constructor("alert(1)")()}}'
];

/* Kata/pola yang TIDAK BOLEH muncul di body respons ke klien. */
const LEAK_PATTERNS = [
  { re: /\bat\s+\w+\s+\(/, name: 'stack-frame' },
  { re: /data:text\/javascript;base64/i, name: 'module-data-uri' },
  { re: /D1_(ERROR|TYPE_ERROR|EXEC_ERROR)/i, name: 'd1-driver-error' },
  { re: /SQLITE_|no such table|syntax error|unrecognized token/i, name: 'sqlite-internal' },
  { re: /SELECT\s+\w+.*FROM\s+\w+/i, name: 'sql-text' },
  { re: /pbkdf2\$|pass_hash|SESSION_HMAC|PUTER_CLAIM|IDENTITY_PEPPER|EDGE_SHARED_SECRET|OWNER_TOKEN_HASH/i, name: 'secret-or-hash' },
  { re: /\/home\/user\/|workers\/api\//, name: 'filesystem-path' },
  { re: /node:internal|node_modules/i, name: 'node-internal-path' }
];

function scanLeak(endpoint, label, res, payload) {
  const body = res.text || '';
  for (const { re, name } of LEAK_PATTERNS) {
    if (re.test(body)) {
      finding(res.status >= 500 ? SEV.HIGH : SEV.MED, endpoint,
        `Kebocoran "${name}" di body respons (${label})`, payload,
        `status=${res.status} cuplikan=${JSON.stringify(body.slice(0, 180))}`);
      record(endpoint, `leak:${label}`, false, 'no internal detail', `${name} leaked`, body.slice(0, 120));
      return true;
    }
  }
  return true;
}

/* ---------------------------------------------------------------------- */
/* Pemuat daftar rute                                                      */
/* ---------------------------------------------------------------------- */

async function allRoutes() {
  const worker = await loadWorker();
  const mod = await import(path.join(REPO_ROOT, 'workers', 'api', 'index.js'));
  return mod.ROUTES.map(([method, p]) => ({ method, path: p }));
}

/* ====================================================================== */
/* 1. ENDPOINT DISCOVERY & CONTRACT                                        */
/* ====================================================================== */

async function suiteContract(transport, routes) {
  const anon = createClient(transport);
  await anon.req('POST', '/api/auth/anon', { body: {} }); // dapat cookie identitas

  // Health kontrak protokol 1.7 (tiga jalur frontend bergantung padanya).
  const h = await anon.req('GET', '/health');
  record('/health', 'protocol==1.7', h.json && h.json.protocol === '1.7', '1.7', h.json && h.json.protocol);
  const hz = await anon.req('GET', '/healthz');
  record('/healthz', 'reachable w/o edge header', hz.status === 200, 200, hz.status);

  // 404 vs 405: path asing -> 404; metode salah di path nyata -> 405.
  const bogus = await anon.req('GET', '/api/does-not-exist-xyz');
  record('/api/does-not-exist-xyz', 'unknown path -> 404', bogus.status === 404, 404, bogus.status);
  const wrongMethod = await anon.req('DELETE', '/api/config');
  record('/api/config', 'wrong method -> 405', wrongMethod.status === 405, 405, wrongMethod.status);
  if (wrongMethod.status === 405) {
    record('/api/config', '405 carries Allow', wrongMethod.headers.has('allow'), 'Allow header', wrongMethod.headers.get('allow'));
  }

  // Tiap rute terjangkau: 404 hanya dihitung "tidak terjangkau" kalau itu 404
  // ROUTER (`{"error":"not_found"}`). 404 semantik (mis. `profile_required`,
  // kelas tak ada) berarti handler-nya hidup dan menolak dengan benar.
  for (const r of routes) {
    if (r.path === '/healthz' || r.path === '/health') continue;
    const res = await anon.req(r.method, r.path, r.method === 'GET' ? {} : { body: {} });
    const routerMiss = res.status === 404 && res.json && res.json.error === 'not_found';
    record(r.path, `${r.method} reachable`, !routerMiss, 'handler present', routerMiss ? 'router-404' : res.status);
    scanLeak(r.path, 'contract', res, '{}');
  }
}

/* ====================================================================== */
/* 2. BOUNDARY & NEGATIVE INPUT                                            */
/* ====================================================================== */

async function suiteNegative(transport, routes) {
  const learner = await newLearner(transport, 'neg_learner_' + Date.now().toString(36));
  const postRoutes = routes.filter((r) => r.method === 'POST');

  const nullCrash = []; // rute yang 5xx pada body JSON non-objek
  for (const r of postRoutes) {
    // (a) body benar-benar kosong (bukan {} tapi "") — harus 400/401/403, bukan 500.
    const empty = await learner.req('POST', r.path, { raw: '' });
    record(r.path, 'empty body no-5xx', empty.status < 500, '<500', empty.status);
    scanLeak(r.path, 'empty-body', empty, '""');

    // (b) JSON rusak.
    const broken = await learner.req('POST', r.path, { raw: '{"a":' });
    record(r.path, 'malformed json no-5xx', broken.status < 500, '<500', broken.status);
    scanLeak(r.path, 'malformed-json', broken, '{"a":');

    // (c) tipe salah: array di tempat object.
    const arr = await learner.req('POST', r.path, { raw: '[1,2,3]' });
    record(r.path, 'array body no-5xx', arr.status < 500, '<500', arr.status);
    scanLeak(r.path, 'array-body', arr, '[1,2,3]');

    // (d) JSON skalar/null di tempat object — body-parser meloloskan `null`
    // sebagai `value` yang sah, lalu handler mengakses `value.field` -> TypeError.
    const nul = await learner.req('POST', r.path, { raw: 'null' });
    const scal = await learner.req('POST', r.path, { raw: '42' });
    const crashed = nul.status >= 500 || scal.status >= 500;
    record(r.path, 'scalar/null body no-5xx', !crashed, '<500', `null=${nul.status} 42=${scal.status}`);
    scanLeak(r.path, 'null-body', nul, 'null');
    // 500 = crash tak tertangani (deref `null`). 502 = respons breaker yang
    // SENGAJA (jalur AI saat provider/breaker menolak) — itu tertangani, bukan temuan.
    if (nul.status === 500 || scal.status === 500) nullCrash.push(r.path);
  }
  if (nullCrash.length) {
    finding(SEV.MED, nullCrash.join(', '),
      'Body JSON non-objek (`null`) -> HTTP 500 tak tertangani, bukan 400',
      'null',
      `${nullCrash.length} rute POST. Akar: readJsonLimited()/readJsonFromCtx (workers/api/mw-guard.js) ` +
      `mengembalikan {ok:true,value:JSON.parse(text)} tanpa memastikan value adalah objek; handler lalu mengakses ` +
      `value.field pada null -> TypeError. Tiap hit mencetak "fiezel-api unhandled" + stack ke log Worker ` +
      `(observability noise; murid ber-identitas bisa memancingnya berulang). Perbaikan di satu titik: ` +
      `di readJsonLimited/readJsonFromCtx, bila hasil JSON.parse bukan objek-biasa, kembalikan {ok:true,value:{}} ` +
      `(atau 400) sehingga setiap handler memakai jalur validasi 400-nya sendiri.`);
  }

  // SQLi/XSS disuntik ke setiap field string yang masuk akal pada rute terpilih
  // yang menyentuh D1 dengan parameter string dari body.
  const injTargets = [
    { path: '/api/account/login', fields: ['handle', 'password'] },
    { path: '/api/account/register', fields: ['handle', 'password'] },
    { path: '/api/account/teacher-activate', fields: ['code', 'handle'] },
    { path: '/api/social/profile/create', fields: ['handle', 'name'] },
    { path: '/api/social/profile/check', fields: ['handle'] },
    { path: '/api/social/friends/add', fields: ['code', 'handle'] },
    { path: '/api/learner/class-report', fields: ['cls', 'name'] },
    { path: '/api/teacher/class/claim', fields: ['code', 'title', 'teacherName'] }
  ];
  for (const t of injTargets) {
    for (const bad of [...SQLI, ...XSS]) {
      const body = {};
      for (const f of t.fields) body[f] = bad;
      // beberapa rute butuh field pendamping bertipe benar
      if (t.path === '/api/learner/class-report') { body.skills = {}; body.at = Date.now(); }
      const res = await learner.req('POST', t.path, { body });
      const no5xx = res.status < 500;
      record(t.path, `inject ${JSON.stringify(bad).slice(0, 24)}`, no5xx, '<500 (no SQL break)', res.status);
      if (!no5xx) {
        finding(SEV.HIGH, t.path, 'Input berbahaya memicu 5xx (kemungkinan error SQL/parse tak tertangani)', bad, `status=${res.status}`);
      }
      scanLeak(t.path, 'inject', res, bad);
    }
  }

  // Verifikasi white-box: tak ada tabel yang hilang akibat DROP (hanya in-process).
  if (MODE === 'in-process' && bundle) {
    const row = bundle.env.CORE_DB._db.prepare(
      "SELECT count(*) n FROM sqlite_master WHERE type='table' AND name='auth_account'").get();
    record('CORE_DB', 'auth_account survives SQLi DROP', row.n === 1, 1, row.n);
    if (row.n !== 1) finding(SEV.CRIT, '/api/*', 'SQLi berhasil menjatuhkan tabel auth_account', "'; DROP TABLE", 'tabel hilang');
  }

  // Payload raksasa -> 413 sebelum routing (cap byte di mw-guard).
  const big = 'A'.repeat(300000);
  for (const p of ['/api/ai/chat', '/api/auth/anon', '/api/feedback']) {
    const res = await learner.req('POST', p, { raw: JSON.stringify({ x: big }), headers: { 'content-length': String(big.length + 20) } });
    record(p, 'oversized -> 413', res.status === 413, 413, res.status);
    if (res.status !== 413 && res.status >= 500) finding(SEV.MED, p, 'Payload raksasa tidak ditolak 413 (5xx)', 'A*300000', `status=${res.status}`);
  }
}

/* ====================================================================== */
/* 3. AUTH & RBAC / IDOR                                                   */
/* ====================================================================== */

// Rute yang SENGAJA publik (dibaca sebelum murid punya identitas, atau aset
// publik tanpa PII). Diverifikasi terpisah: boleh 200, tapi tidak boleh PII.
const PUBLIC_READS = new Set([
  '/api/auth/anon', '/api/auth/claim', '/api/auth/google', '/api/auth/session',
  '/api/config', '/api/user/me', '/api/push/public-key',
  '/api/tts/manifest', '/api/usage/pepper', '/api/braincore/item-difficulty'
]);
function requiresAuth(p) {
  return p.startsWith('/api/') && !PUBLIC_READS.has(p);
}
const PII_RE = /pass_hash|pbkdf2\$|"email"|"sub"\s*:\s*"[0-9a-f-]{36}"|login_handle|teacher_name|institution_id/i;

async function suiteAuth(transport, routes) {
  // (1) Tanpa cookie identitas sama sekali -> rute terlindung tidak boleh 200.
  const noAuth = createClient(transport); // tidak memanggil /api/auth/anon
  for (const r of routes) {
    if (!requiresAuth(r.path)) continue;
    const res = await noAuth.req(r.method, r.path, r.method === 'GET' ? { noCookie: true } : { body: {}, noCookie: true });
    const ok = res.status === 401 || res.status === 403 || res.status === 400 || res.status === 404 || res.status === 429 || res.status === 503;
    record(r.path, `${r.method} no-identity rejected`, ok && res.status !== 200, 'not 200', res.status);
    if (res.status === 200) finding(SEV.HIGH, r.path, 'Rute terlindung menjawab 200 tanpa identitas', '(no cookie)', `status=200`);
  }

  // (1b) Rute publik-by-design: boleh 200 tanpa identitas, TAPI tidak boleh membawa PII.
  for (const p of PUBLIC_READS) {
    if (!routes.find((r) => r.path === p && r.method === 'GET')) continue;
    const res = await noAuth.req('GET', p, { noCookie: true });
    const clean = !PII_RE.test(res.text || '');
    record(p, 'public GET carries no PII', clean, 'no PII', clean ? 'clean' : 'PII!', `status=${res.status}`);
    if (!clean) finding(SEV.HIGH, p, 'Rute publik membocorkan PII tanpa identitas', '', res.text.slice(0, 160));
  }

  // (2) Cookie fz_id palsu (tanda tangan dikarang) -> ditolak, identitas tidak terverifikasi.
  const forged = createClient(transport);
  const fakePayload = Buffer.from(JSON.stringify({ v: 1, kid: 2, sub: '11111111-1111-4111-8111-111111111111', iat: Math.floor(Date.now() / 1000) })).toString('base64url');
  forged.setCookie('fz_id', `${fakePayload}.deadbeefdeadbeefdeadbeefdeadbeef`);
  const me = await forged.req('GET', '/api/account/me');
  record('/api/account/me', 'forged cookie rejected', me.status === 401 || me.status === 403, '401/403', me.status);
  if (me.status === 200) finding(SEV.CRIT, '/api/account/me', 'Cookie identitas palsu diterima (HMAC tidak diverifikasi)', fakePayload, 'status=200');

  // (3) Owner gate: tanpa Bearer / token salah -> 403; rute owner tidak bocor data.
  const stranger = await newLearner(transport, 'stranger_' + Date.now().toString(36));
  for (const p of ['/api/owner/cron-status', '/api/owner/teachers', '/api/owner/schools', '/api/owner/braincore-evidence', '/api/owner/learners']) {
    const noTok = await stranger.req('GET', p);
    record(p, 'owner route w/o token -> 403', noTok.status === 403 || noTok.status === 401, '403/401', noTok.status);
    const badTok = await stranger.req('GET', p, { headers: { authorization: 'Bearer totally-wrong-token' } });
    record(p, 'owner route bad token -> 403', badTok.status === 403 || badTok.status === 401, '403/401', badTok.status);
    if (noTok.status === 200 || badTok.status === 200) finding(SEV.CRIT, p, 'Rute owner dapat diakses tanpa token owner yang sah', 'Bearer wrong', `noTok=${noTok.status} badTok=${badTok.status}`);
  }

  // (4) RBAC: murid menembak rute guru -> 403 (bukan kelas yang diampu / bukan peran).
  for (const p of ['/api/teacher/tree', '/api/teacher/progress', '/api/teacher/class/list']) {
    const res = await stranger.req('GET', p);
    record(p, 'learner hits teacher route -> 403', res.status === 403 || res.status === 401, '403/401', res.status);
    if (res.status === 200) finding(SEV.HIGH, p, 'Murid memperoleh 200 pada rute khusus guru (RBAC bocor)', '(learner cookie)', 'status=200');
  }

  // (5) IDOR lintas-murid: nama panggilan satu murid tidak boleh dibaca murid lain.
  const alice = await newLearner(transport, 'alice_' + Date.now().toString(36));
  await alice.req('POST', '/api/learner/name', { body: { name: 'AliceSecret' } });
  const aliceName = await alice.req('GET', '/api/learner/name');
  const bob = await newLearner(transport, 'bob_' + Date.now().toString(36));
  const bobSeesAlice = await bob.req('GET', '/api/learner/name');
  const leaked = bobSeesAlice.text.includes('AliceSecret');
  record('/api/learner/name', 'name isolated per identity', !leaked, 'no cross-read', leaked ? 'LEAK' : 'isolated',
    `alice=${aliceName.text.slice(0, 40)} bobSaw=${bobSeesAlice.text.slice(0, 40)}`);
  if (leaked) finding(SEV.HIGH, '/api/learner/name', 'IDOR: murid lain membaca nama panggilan milik murid berbeda', '', '');

  // (6) IDOR kelas guru: guru B tidak boleh membaca laporan kelas guru A.
  const teacherA = await makeTeacher(transport, 'guruA');
  const teacherB = await makeTeacher(transport, 'guruB');
  if (teacherA && teacherB) {
    const codeA = classCode();
    await teacherA.req('POST', '/api/teacher/class/claim', { body: { code: codeA, title: 'Kelas A', level: 'A1', subjectId: 'ENG' } });
    // murid lapor ke kelas A
    const pupil = await newLearner(transport, 'pupilA_' + Date.now().toString(36));
    await pupil.req('POST', '/api/learner/class-report', { body: { cls: codeA, name: 'Caca', skills: { vocab: { c: 2, t: 3 } }, at: Date.now() } });
    const aReports = await teacherA.req('GET', '/api/teacher/class/reports', { headers: {} });
    // guru B mencoba membaca laporan kelas A lewat query/param apa pun yang didukung
    const bReports = await teacherB.req('GET', '/api/teacher/class/reports?code=' + codeA);
    const bLeak = bReports.status === 200 && bReports.text.includes('Caca');
    record('/api/teacher/class/reports', 'teacher cannot read other class reports', !bLeak, 'isolated', bLeak ? 'LEAK' : 'ok',
      `A=${aReports.status} B=${bReports.status}`);
    if (bLeak) finding(SEV.HIGH, '/api/teacher/class/reports', 'IDOR: guru membaca laporan kelas milik guru lain', 'code=' + codeA, '');

    // (7) Tabrakan kunci laporan: dua MURID BERBEDA dengan nama depan sama di satu
    // kelas. Baris disimpan dengan kunci (class_code, learnerKey=firstName), jadi
    // murid kedua MENIMPA laporan murid pertama (termasuk learner_sub).
    const budi1 = await newLearner(transport, 'budione_' + Date.now().toString(36));
    const budi2 = await newLearner(transport, 'buditwo_' + Date.now().toString(36));
    await budi1.req('POST', '/api/learner/class-report', { body: { cls: codeA, name: 'Budi', skills: { vocab: { c: 9, t: 9 } }, at: Date.now() } });
    await budi2.req('POST', '/api/learner/class-report', { body: { cls: codeA, name: 'Budi', skills: { vocab: { c: 1, t: 9 } }, at: Date.now() } });
    if (MODE === 'in-process' && bundle) {
      const rows = bundle.env.CORE_DB._db.prepare(
        "SELECT learner_key, learner_sub FROM tc_class_report WHERE class_code=? AND learner_key='budi'").all('FZ-' + codeA);
      const collided = rows.length === 1; // dua murid -> satu baris = timpa
      record('/api/learner/class-report', 'same first-name learners kept separate', !collided, '2 rows', rows.length + ' row(s)');
      if (collided) finding(SEV.LOW, '/api/learner/class-report',
        'Tabrakan kunci: dua murid dengan nama depan sama di satu kelas saling menimpa laporan (learner_key = firstName)',
        'name="Budi" x2',
        `teacher/class-sync-core.js learnerKey(name)=firstName; kunci (class_code, learner_key) menimpa baris murid pertama termasuk learner_sub. Dampak: progres satu murid hilang dari layar guru.`);
    }
  }
}

// Kode kelas sah: FZ-XXXXXX dengan alfabet [A-HJ-NP-Z2-9] (tanpa I/O/0/1).
function classCode() {
  const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) s += AL[Math.floor(Math.random() * AL.length)];
  return s;
}

async function makeTeacher(transport, label) {
  // Perlu undangan owner -> aktivasi. Hanya bisa penuh in-process (butuh tanam D1
  // atau owner token). Pakai alur owner-invite yang sah.
  if (MODE !== 'in-process') return null;
  const t = createClient(transport);
  await t.req('POST', '/api/auth/anon', { body: {} });
  // Owner mencetak undangan guru.
  const owner = createClient(transport);
  const inv = await owner.req('POST', '/api/owner/teacher-invite', {
    headers: ownerAuth(),
    body: { teacherName: label, institution: 'SMP QA', institutionType: 'school', subjectId: 'ENG', gradeId: 'D' }
  });
  if (inv.status !== 200 || !inv.json || !(inv.json.code || (inv.json.invite && inv.json.invite.code))) return null;
  const code = inv.json.code || inv.json.invite.code;
  const act = await t.req('POST', '/api/account/teacher-activate', { body: { code } });
  if (act.status !== 200) return null;
  t.role = 'teacher';
  return t;
}

/* ====================================================================== */
/* 4. CONCURRENCY & IDEMPOTENCY                                            */
/* ====================================================================== */

async function suiteConcurrency(transport) {
  // (1) Pendaftaran handle unik: dua perangkat berbeda, handle sama, serentak.
  const handle = 'race_' + Date.now().toString(36);
  const dev1 = createClient(transport); await dev1.req('POST', '/api/auth/anon', { body: {} });
  const dev2 = createClient(transport); await dev2.req('POST', '/api/auth/anon', { body: {} });
  const [r1, r2] = await Promise.all([
    dev1.req('POST', '/api/account/register', { body: { handle, password: 'Sandi-Kuat-123!' } }),
    dev2.req('POST', '/api/account/register', { body: { handle, password: 'Sandi-Kuat-123!' } })
  ]);
  const wins = [r1, r2].filter((r) => r.status === 200).length;
  record('/api/account/register', 'handle race -> exactly 1 winner', wins === 1, 1, wins, `r1=${r1.status} r2=${r2.status}`);
  if (wins > 1) finding(SEV.HIGH, '/api/account/register', 'Race pendaftaran: satu handle diklaim dua akun', handle, `${r1.status}/${r2.status}`);

  // (2) Idempotensi identitas: dua /api/auth/anon dengan cookie sama = satu userId, tanpa Set-Cookie kedua.
  const dev = createClient(transport);
  const a1 = await dev.req('POST', '/api/auth/anon', { body: {} });
  const a2 = await dev.req('POST', '/api/auth/anon', { body: {} });
  const sameId = a1.json && a2.json && a1.json.userId === a2.json.userId;
  record('/api/auth/anon', 'stable identity across calls', sameId, 'same userId', sameId ? 'stable' : 'CHANGED');
  record('/api/auth/anon', 'no 2nd Set-Cookie on existing identity', a2.setCookies.length === 0, '0 set-cookie', a2.setCookies.length);
  if (!sameId) finding(SEV.HIGH, '/api/auth/anon', 'Identitas tidak stabil: muat ulang menggandakan identitas (dan kuota)', '', '');

  // (3) Teacher-invite sekali-pakai: aktivasi serentak dengan kode sama hanya satu yang lolos.
  if (MODE === 'in-process') {
    const owner = createClient(transport);
    const inv = await owner.req('POST', '/api/owner/teacher-invite', {
      headers: ownerAuth(),
      body: { teacherName: 'Race Guru', institution: 'SMP QA', institutionType: 'school', subjectId: 'ENG', gradeId: 'D' }
    });
    const code = inv.json && (inv.json.code || (inv.json.invite && inv.json.invite.code));
    if (code) {
      const c1 = createClient(transport); await c1.req('POST', '/api/auth/anon', { body: {} });
      const c2 = createClient(transport); await c2.req('POST', '/api/auth/anon', { body: {} });
      const [t1, t2] = await Promise.all([
        c1.req('POST', '/api/account/teacher-activate', { body: { code } }),
        c2.req('POST', '/api/account/teacher-activate', { body: { code } })
      ]);
      const teacherWins = [t1, t2].filter((r) => r.status === 200).length;
      record('/api/account/teacher-activate', 'single-use invite race -> <=1 winner', teacherWins <= 1, '<=1', teacherWins, `${t1.status}/${t2.status}`);
      if (teacherWins > 1) finding(SEV.CRIT, '/api/account/teacher-activate', 'Undangan guru sekali-pakai ditukar menjadi >1 akun guru (race)', code, `${t1.status}/${t2.status}`);
    }
  }
}

/* ====================================================================== */
/* 5. ERROR LEAKS & RESILIENCE                                             */
/* ====================================================================== */

async function suiteLeaks(transport) {
  const learner = await newLearner(transport, 'leak_' + Date.now().toString(36));

  // Paksa jalur yang rawan 500: tipe nyeleneh pada field yang dipakai sebagai angka/objek.
  const weird = [
    { path: '/api/learner/class-report', body: { cls: 123, name: {}, skills: 'x', at: 'soon' } },
    { path: '/api/social/profile/create', body: { handle: 999, name: [] } },
    { path: '/api/brain/attempts', body: { attempts: 'not-an-array' } },
    { path: '/api/policy/outcome', body: { outcome: { nested: { deep: Array(50).fill('x') } } } },
    { path: '/api/ai/task', body: { task: null, prompt: 12345 } }
  ];
  for (const w of weird) {
    const res = await learner.req('POST', w.path, { body: w.body });
    scanLeak(w.path, 'type-confusion', res, JSON.stringify(w.body).slice(0, 60));
    record(w.path, 'type confusion no leak', res.status < 500 || !/\bat\s+\w+\s+\(/.test(res.text), 'no stack', res.status);
  }

  // Semua error sebelumnya yang 5xx harus tetap generik.
  // Tangkap juga: apakah console.error Worker membawa detail (itu BENAR untuk log,
  // tapi body ke klien harus tetap generik) — di sini kita hanya memeriksa body.
  const internal = workerLogs.filter((l) => l.level === 'error' && /unhandled/i.test(l.text));
  record('(worker)', 'unhandled errors logged server-side only', true, 'info', internal.length + ' logged');
}

/* ====================================================================== */
/* Runner                                                                  */
/* ====================================================================== */

async function main() {
  const wantJson = process.argv.includes('--json');
  console.log(`# FIEZEL Worker API — QA suite (mode: ${MODE})\n`);

  const transport = await buildTransport();
  const routes = await allRoutes();
  console.log(`Rute terdaftar: ${routes.length}\n`);

  const sections = [
    ['1. Endpoint discovery & contract', () => suiteContract(transport, routes)],
    ['2. Boundary & negative input', () => suiteNegative(transport, routes)],
    ['3. Auth & RBAC/IDOR', () => suiteAuth(transport, routes)],
    ['4. Concurrency & idempotency', () => suiteConcurrency(transport)],
    ['5. Error leaks & resilience', () => suiteLeaks(transport)]
  ];
  for (const [name, fn] of sections) {
    process.stdout.write(`## ${name} ... `);
    try { await fn(); console.log('selesai'); }
    catch (e) { console.log('GAGAL HARNESS'); finding(SEV.INFO, '(suite)', 'Harness error di ' + name, '', e.message); console.error(e); }
  }

  // Matriks ringkas (gagal saja + ringkasan).
  const fails = matrix.filter((m) => !m.pass);
  console.log(`\n## Matriks: ${matrix.length} pemeriksaan, ${matrix.length - fails.length} PASS, ${fails.length} FAIL`);
  for (const f of fails.slice(0, 80)) {
    console.log(`  FAIL  ${f.endpoint}  [${f.test}]  harap=${f.expected} dapat=${f.got}  ${f.detail}`);
  }

  // Temuan.
  const order = [SEV.CRIT, SEV.HIGH, SEV.MED, SEV.LOW, SEV.INFO];
  findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  console.log(`\n## Temuan: ${findings.length}`);
  for (const f of findings) {
    console.log(`  [${f.severity}] ${f.endpoint} — ${f.title}`);
    if (f.payload) console.log(`         payload: ${JSON.stringify(f.payload).slice(0, 100)}`);
    if (f.detail) console.log(`         ${f.detail}`);
  }

  // Tulis JSON untuk laporan.
  const out = {
    mode: MODE, generatedAt: new Date().toISOString(),
    routeCount: routes.length,
    checks: matrix.length, passed: matrix.length - fails.length, failed: fails.length,
    findings, matrix
  };
  const outPath = path.join(REPO_ROOT, 'reports', 'api-qa-worker-results.json');
  try { fs.writeFileSync(outPath, JSON.stringify(out, null, 2)); console.log(`\nJSON -> reports/api-qa-worker-results.json`); } catch (_) {}
  if (wantJson) console.log(JSON.stringify(out, null, 2));

  const severe = findings.filter((f) => f.severity === SEV.CRIT || f.severity === SEV.HIGH).length;
  process.exit(severe > 0 ? 2 : 0);
}

async function buildTransport() {
  if (MODE === 'in-process') {
    bundle = createEnv({ flags: FLAGS_ALL_ON });
    for (const [b, rep] of Object.entries(bundle.migrationReport)) {
      const bad = rep.filter((r) => !r.ok);
      if (bad.length) console.log(`  (migrasi ${b}: ${bad.length} pernyataan gagal — ${bad.map((x) => x.file).join(',')})`);
    }
    return createTransport(bundle);
  }
  return createTransport(null);
}

main().catch((e) => { console.error(e); process.exit(1); });
