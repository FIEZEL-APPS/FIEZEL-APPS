'use strict';
/**
 * Gerbang PROGRES IKUT AKUN (m025-455) — docs/handoffs/PROGRES-IKUT-AKUN-HANDOFF.md.
 *
 * P1  allowlist server kembar dengan klien (fiezel-attempt-record.js ALLOWED)
 * P2  server menolak catatan berisi field asing (kalimat soal / jawaban tidak bisa tersimpan)
 * P3  POST jujur: galat tulis = 503, bukan success:true; yang sah dilaporkan `accepted`
 * P4  rute hapus hanya menghapus baris milik sub cookie, menolak tanpa identitas
 * P5  klien: tanpa izin tidak ada sinkron; brainSync:false menang atas izin
 * P6  klien: waktu "tersimpan" hanya ditulis sesudah jawaban server ok
 * P7  sinkron lewat Worker CF dengan cookie akun, bukan jalur Puter
 * P8  setiap kunci sinkron.* yang dipakai app.js ada di copy-id DAN copy-th
 * P9  lembar privasi sekolah tidak lagi menjanjikan "tidak pernah sampai ke server" untuk data
 *     yang memang dikirim
 */
const __fzRoot = require('path').join(__dirname, '..');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let pass = 0, fail = 0;
function check(name, fn) {
  return Promise.resolve().then(fn).then(() => { pass++; console.log('PASS', name); },
    (e) => { fail++; console.log('FAIL', name, '-', e && e.message); });
}
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

(async () => {
  const legacy = await import(path.join(__fzRoot, 'workers/api/route-legacy.js'));
  const client = require(path.join(__fzRoot, 'features/brain/fiezel-attempt-record.js'));
  const route = (m, p) => legacy.ROUTES.find((r) => r[0] === m && r[1] === p)[2];

  await check('P1 allowlist server = klien', () => {
    assert.deepStrictEqual([...legacy.BRAIN_ATTEMPT_FIELDS].sort(), [...client.ALLOWED].sort());
  });

  await check('P2 field asing ditolak, catatan sah lolos', () => {
    const ok = { schema: 'fiezel-attempt-record-v1', attemptId: 'att_1', at: 1700000000000, ok: true, item: 'gpi:07', misconception: 'TENSE_SWAP' };
    assert.ok(legacy.projectBrainAttempt(ok));
    assert.strictEqual(legacy.projectBrainAttempt({ ...ok, stem: 'She go to school' }), null);
    assert.strictEqual(legacy.projectBrainAttempt({ ...ok, item: 'kalimat dengan spasi' }), null);
    assert.strictEqual(legacy.projectBrainAttempt({ ...ok, ok: 'yes' }), null);
    // keluaran klien selalu diterima server
    const rec = client.project({ attemptId: 'att_2', at: 1700000000001, ok: false, type: 'grammar', id: 'g:1', question: 'secret', answer: 'secret' });
    assert.ok(rec && legacy.projectBrainAttempt(rec));
  });

  function fakeDb({ failBatch = false } = {}) {
    const log = [];
    return {
      log,
      prepare(sql) { return { sql, bind(...a) { const st = { sql, args: a, run: async () => { log.push({ sql, args: a }); return { meta: { changes: 7 } }; } }; return st; } }; },
      async batch(stmts) { if (failBatch) throw new Error('d1 down'); stmts.forEach((s) => log.push({ sql: s.sql, args: s.args })); return []; }
    };
  }
  const ctxOf = (db, body, sub = 'acct_A') => ({ identity: sub ? { sub } : null, corsHeaders: {}, env: { CORE_DB: db }, bodyText: JSON.stringify(body || {}), now: 5 });
  const goodRec = { schema: 'fiezel-attempt-record-v1', attemptId: 'att_9', at: 1700000000000, ok: true };

  await check('P3 POST jujur: accepted/rejected, 503 saat tulis gagal', async () => {
    const db = fakeDb();
    const res = await route('POST', '/api/brain/attempts')(ctxOf(db, { attempts: [goodRec, { ...goodRec, attemptId: 'att_x', stem: 'x' }] }));
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(body.accepted, ['att_9']);
    assert.strictEqual(body.rejected, 1);
    assert.strictEqual(db.log.length, 1);
    assert.ok(!db.log[0].args[2].includes('stem'));
    const bad = await route('POST', '/api/brain/attempts')(ctxOf(fakeDb({ failBatch: true }), { attempts: [goodRec] }));
    assert.strictEqual(bad.status, 503);
  });

  await check('P4 hapus hanya milik sub sendiri', async () => {
    const db = fakeDb();
    const res = await route('POST', '/api/brain/attempts/delete')(ctxOf(db, { sub: 'acct_B' }));
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).deleted, 7);
    assert.ok(/DELETE FROM brain_attempts WHERE sub = \?/.test(db.log[0].sql));
    assert.deepStrictEqual(db.log[0].args, ['acct_A']);
    const anon = await route('POST', '/api/brain/attempts/delete')(ctxOf(fakeDb(), {}, null));
    assert.strictEqual(anon.status, 401);
  });

  const app = read('app.js');
  const fnBody = (name) => { const i = app.indexOf('function ' + name + '('); assert.ok(i > 0, name + ' ada'); return app.slice(i, app.indexOf('\n}', i)); };

  await check('P5 tanpa izin tidak ada sinkron; brainSync:false menang', () => {
    const src = fnBody('brainSyncEnabled');
    const fn = new Function('state', 'progressSyncConsented', 'progressSyncSignedIn', 'activeAccountUuid', 'CORE_WORKER_URL', 'brainSyncModule',
      src.replace(/^function brainSyncEnabled\(\)\{/, ''));
    const M = () => ({ project() {} });
    const run = (prefs, consent) => fn({ preferences: prefs }, () => consent, () => true, '', 'https://api', M);
    assert.strictEqual(run({}, false), false, 'tanpa izin');
    assert.strictEqual(run({}, true), true, 'izin -> otomatis menyala');
    assert.strictEqual(run({ brainSync: false }, true), false, 'dimatikan menang');
    assert.strictEqual(run({ brainSync: true }, false), true, 'jalur manual lama');
  });

  await check('P6 lastPushedAt hanya sesudah r.ok', () => {
    const src = fnBody('brainSyncFlush');
    const okIdx = src.indexOf('if(!r||!r.ok)');
    const writeIdx = src.indexOf('lastPushedAt:Date.now()');
    assert.ok(okIdx > 0 && writeIdx > okIdx, 'penulisan waktu sesudah pemeriksaan r.ok');
    assert.strictEqual((app.match(/lastPushedAt:Date\.now\(\)/g) || []).length, 1, 'tidak ada penulisan waktu optimistis lain');
    const st = fnBody('progressSyncStatus');
    assert.ok(/lastErrorAt\)>okAt/.test(st), 'galat terbaru mengalahkan lencana hijau');
  });

  await check('P7 sinkron lewat Worker CF (cookie akun), bukan Puter', () => {
    const f = fnBody('progressSyncFetch');
    assert.ok(/cfWorkerFetch\(path,options\)/.test(f), 'lewat Worker CF dengan cookie akun');
    assert.ok(!/coreWorkerExec\('\/api\/brain\/attempts/.test(app), 'tidak ada panggilan brain lewat jalur Puter');
  });

  await check('P8 kunci sinkron.* dwibahasa', () => {
    const used = new Set((app.match(/'sinkron\.[a-z-]+'/g) || []).map((s) => s.slice(1, -1)).filter((k) => !k.endsWith('-')));
    for (const st of ['off', 'needs-consent', 'needs-login', 'other-account', 'saving', 'error']) used.add('sinkron.status-' + st);
    const reg = {};
    global.self = global; global.FiezelI18n = { registerCopy: (l, m) => { reg[l] = { ...(reg[l] || {}), ...m }; } };
    delete require.cache[require.resolve(path.join(__fzRoot, 'features/i18n/copy-id-google.js'))];
    delete require.cache[require.resolve(path.join(__fzRoot, 'features/i18n/copy-th-google.js'))];
    require(path.join(__fzRoot, 'features/i18n/copy-id-google.js'));
    require(path.join(__fzRoot, 'features/i18n/copy-th-google.js'));
    for (const k of used) {
      assert.ok(reg.id[k], 'id ' + k);
      assert.ok(reg.th[k] && /[฀-๿]/.test(reg.th[k]), 'th ' + k);
    }
  });

  await check('P9 lembar privasi jujur', () => {
    const sheet = read('docs/pilot/LEMBAR-PRIVASI-SEKOLAH.md');
    assert.ok(!/tidak ada salinan server/i.test(sheet));
    assert.ok(/Hapus dari server/.test(sheet));
    assert.ok(/pilihan jawaban \(A\/B\/C\/D\)/.test(sheet), 'w[] tugas guru disebutkan');
    assert.ok(/Hapus dari server/.test(read('docs/pilot/IZIN-ORANG-TUA.md')));
  });

  console.log(`\nprogress-sync-test: ${pass} lulus, ${fail} gagal`);
  process.exit(fail ? 1 : 0);
})();
