'use strict';
/**
 * class-sync-test.js — gerbang SINKRON RUANG GURU (workers/api/route-class-sync.js
 * + teacher/class-sync-core.js). Menguji inti murni DAN handler di atas D1 palsu
 * dalam memori: klaim kode, penolakan kode milik guru lain, laporan murid hanya ke
 * kode yang sudah diklaim, tarikan inkremental ber-`since`, dan IDOR antar guru.
 */
const path = require('path');
const API = path.join(__dirname, 'workers', 'api');
const results = []; let failures = 0;
function assert(c, m) { results.push({ ok: !!c, message: m }); if (!c) failures += 1; }

/** D1 palsu: cukup untuk kueri yang dipakai lane ini. */
function fakeD1() {
  const cls = new Map(), rep = new Map(), accounts = new Map(), asg = new Map();
  function stmt(sql) {
    let args = [];
    const s = sql.replace(/\s+/g, ' ');
    const api = {
      bind(...a) { args = a; return api; },
      async run() {
        if (/CREATE /.test(s)) return { success: true };
        if (/INSERT INTO tc_class \(/.test(s)) { cls.set(args[0], { code: args[0], teacher_sub: args[1], title: args[2], level: args[3], created_at: args[4], updated_at: args[4] }); return { meta: { changes: 1 } }; }
        if (/UPDATE tc_class SET/.test(s)) { const c = cls.get(args[0]); if (c && c.teacher_sub === args[4]) { c.title = args[1]; c.level = args[2]; c.updated_at = args[3]; } return { meta: { changes: 1 } }; }
        if (/INSERT INTO tc_class_assignment/.test(s)) { asg.set(args[0] + '|' + args[1], { class_code: args[0], id: args[1], teacher_sub: args[2], payload_json: args[3], targets_json: args[4], created_at: args[5], updated_at: args[5] }); return { meta: { changes: 1 } }; }
        if (/INSERT INTO tc_class_report/.test(s)) { rep.set(args[0] + '|' + args[1], { class_code: args[0], learner_key: args[1], display_name: args[2], learner_sub: args[3], reported_at: args[4], report_json: args[5], updated_at: args[6] }); return { meta: { changes: 1 } }; }
        throw new Error('run tak dikenal: ' + s);
      },
      async first() {
        if (/FROM auth_account WHERE sub/.test(s)) return accounts.get(args[0]) || null;
        if (/SELECT code FROM tc_class WHERE code = \?1 AND teacher_sub = \?2/.test(s)) { const c = cls.get(args[0]); return c && c.teacher_sub === args[1] ? { code: c.code } : null; }
        if (/SELECT code, teacher_sub FROM tc_class WHERE code/.test(s)) { const c = cls.get(args[0]); return c ? { code: c.code, teacher_sub: c.teacher_sub } : null; }
        if (/SELECT code FROM tc_class WHERE code = \?1/.test(s)) { const c = cls.get(args[0]); return c ? { code: c.code } : null; }
        throw new Error('first tak dikenal: ' + s);
      },
      async all() {
        if (/FROM tc_class c WHERE c.teacher_sub/.test(s)) return { results: [...cls.values()].filter((c) => c.teacher_sub === args[0]).map((c) => ({ ...c, reports: [...rep.values()].filter((r) => r.class_code === c.code).length })) };
        if (/FROM tc_class_assignment WHERE class_code/.test(s)) return { results: [...asg.values()].filter((a) => a.class_code === args[0] && a.updated_at > args[1]).sort((a, b) => a.updated_at - b.updated_at).slice(0, args[2]) };
        if (/FROM tc_class_report r/.test(s)) { const c = cls.get(args[0]); if (!c || c.teacher_sub !== args[1]) return { results: [] }; return { results: [...rep.values()].filter((r) => r.class_code === args[0] && r.updated_at > args[2]).sort((a, b) => a.updated_at - b.updated_at).slice(0, args[3]) }; }
        throw new Error('all tak dikenal: ' + s);
      }
    };
    return api;
  }
  return { prepare: stmt, batch: async (xs) => Promise.all(xs.map((x) => x.run())), _accounts: accounts, _cls: cls, _rep: rep, _asg: asg };
}

function ctxOf(db, { sub, method, pathname, body, query, now }) {
  return {
    env: { CORE_DB: db }, now: now || 1_700_000_000_000, pathname, method,
    url: new URL('https://api.test' + pathname + (query ? '?' + new URLSearchParams(query) : '')),
    identity: sub ? { sub, verified: true } : { sub: null, verified: false },
    corsHeaders: {}, bodyText: body === undefined ? '' : JSON.stringify(body), byteLimit: 20000
  };
}
async function json(res) { return { status: res.status, body: JSON.parse(await res.text()) }; }

(async () => {
  const core = await import('file://' + path.join(API, 'teacher', 'class-sync-core.js'));
  const routes = await import('file://' + path.join(API, 'route-class-sync.js'));

  /* ---------- 1. inti murni ------------------------------------------------------- */
  assert(core.normalizeClassCode('fz-ab2c3d') === 'FZ-AB2C3D', 'kode dinormalisasi huruf besar + strip');
  assert(core.normalizeClassCode('FZ-AB2C3O') === null, 'huruf O (ambigu) ditolak — alfabet kode tanpa O/I/0/1');
  assert(core.normalizeClassCode('FZ-AB2C') === null, 'kode pendek ditolak');
  const good = core.normalizeReport({ cls: 'FZ-AB2C3D', name: 'Rina Kartika', at: 1_700_000_000_000, skills: { past_tense: { c: 4, t: 5 } }, lessons: 3, assign: [{ id: 'as-1', c: 4, t: 5 }] }, 1_700_000_000_000);
  assert(good.ok && good.name === 'Rina' && good.key === 'rina', 'hanya NAMA DEPAN yang disimpan');
  assert(good.ok && good.report.assign[0].id === 'as-1' && good.report.skills.past_tense.t === 5, 'skills + assign lolos utuh');
  assert(!core.normalizeReport({ cls: 'FZ-AB2C3D', name: 'X', skills: { past_tense: { c: 6, t: 5 } } }, 1).ok, 'benar > total ditolak');
  assert(!core.normalizeReport({ cls: 'FZ-AB2C3D', name: 'X', skills: { 'DROP TABLE': { c: 1, t: 5 } } }, 1).ok, 'kunci skill di luar [a-z0-9_] ditolak');
  assert(!core.normalizeReport({ cls: 'FZ-AB2C3D', name: 'X', skills: {}, assign: new Array(9).fill({ id: 'a' }) }, 1).ok, 'assign > 8 ditolak');
  const rep = core.normalizeReport({ cls: 'FZ-AB2C3D', name: 'X', skills: {}, note: 'jawaban mentah', answers: ['a'] }, 1);
  assert(rep.ok && !('note' in rep.report) && !('answers' in rep.report), 'bidang liar (note/answers) TIDAK ikut tersimpan — hanya bidang yang dikenal');
  const allow = core.makeRateLimiter(1000);
  assert(allow('k', 1000) && !allow('k', 1500) && allow('k', 2100), 'pembatas laju per kunci');

  /* ---------- 2. handler di atas D1 palsu ----------------------------------------- */
  const db = fakeD1();
  db._accounts.set('t1', { sub: 't1', role: 'teacher', status: 'active' });
  db._accounts.set('t2', { sub: 't2', role: 'teacher', status: 'active' });
  db._accounts.set('l1', { sub: 'l1', role: 'learner', status: 'active' });

  let r = await json(await routes.routeClassClaim(ctxOf(db, { sub: 't1', method: 'POST', pathname: '/api/teacher/class/claim', body: { code: 'FZ-AB2C3D', title: 'Kelas 10A', level: 'A2' } })));
  assert(r.status === 200 && r.body.claimed === true, 'guru t1 mengklaim kode');
  r = await json(await routes.routeClassClaim(ctxOf(db, { sub: 't2', method: 'POST', pathname: '/api/teacher/class/claim', body: { code: 'FZ-AB2C3D', title: 'Curian' } })));
  assert(r.status === 409, 'guru t2 TIDAK bisa mengklaim kode milik t1 (409)');
  r = await json(await routes.routeClassClaim(ctxOf(db, { sub: 'l1', method: 'POST', pathname: '/api/teacher/class/claim', body: { code: 'FZ-XYZ234' } })));
  assert(r.status === 403, 'murid ditolak di rute guru (roleGate)');

  r = await json(await routes.routeLearnerClassReport(ctxOf(db, { method: 'POST', pathname: '/api/learner/class-report', body: { cls: 'FZ-AB2C3D', name: 'Rina', skills: {} } })));
  assert(r.status === 401, 'laporan murid tanpa identitas -> 401');
  r = await json(await routes.routeLearnerClassReport(ctxOf(db, { sub: 'anon-0', method: 'POST', pathname: '/api/learner/class-report', body: { cls: 'FZ-ZZZ999', name: 'Rina', skills: {} } })));
  assert(r.status === 404, 'kode yang belum diklaim guru -> 404');
  r = await json(await routes.routeLearnerClassReport(ctxOf(db, { sub: 'anon-1', method: 'POST', pathname: '/api/learner/class-report', body: { cls: 'fz-ab2c3d', name: 'Rina Kartika', at: 1_700_000_000_000, skills: { past_tense: { c: 4, t: 5 } }, lessons: 2 }, now: 1_700_000_001_000 })));
  assert(r.status === 202 && r.body.name === 'Rina', 'laporan murid diterima (202) untuk kode yang diklaim');
  r = await json(await routes.routeLearnerClassReport(ctxOf(db, { sub: 'anon-1', method: 'POST', pathname: '/api/learner/class-report', body: { cls: 'FZ-AB2C3D', name: 'Rina', skills: {} }, now: 1_700_000_002_000 })));
  assert(r.status === 429, 'laporan kedua dalam 15 detik dari identitas yang sama -> 429');
  r = await json(await routes.routeLearnerClassReport(ctxOf(db, { sub: 'anon-2', method: 'POST', pathname: '/api/learner/class-report', body: { cls: 'FZ-AB2C3D', name: 'Dimas', skills: { vocab_a2: { c: 9, t: 10 } } }, now: 1_700_000_005_000 })));
  assert(r.status === 202, 'murid kedua diterima');

  r = await json(await routes.routeClassReports(ctxOf(db, { sub: 't1', method: 'GET', pathname: '/api/teacher/class/reports', query: { code: 'FZ-AB2C3D', since: '0' }, now: 1_700_000_010_000 })));
  assert(r.status === 200 && r.body.reports.length === 2 && r.body.reports[0].name === 'Rina' && r.body.reports[0].report.skills.past_tense.c === 4, 'guru pemilik menarik 2 laporan lengkap');
  const cursor = r.body.cursor;
  r = await json(await routes.routeClassReports(ctxOf(db, { sub: 't1', method: 'GET', pathname: '/api/teacher/class/reports', query: { code: 'FZ-AB2C3D', since: String(cursor) }, now: 1_700_000_020_000 })));
  assert(r.status === 200 && r.body.reports.length === 0 && r.body.cursor === cursor, 'tarikan inkremental ber-since: tidak ada yang baru -> kosong, kursor tetap');
  r = await json(await routes.routeClassReports(ctxOf(db, { sub: 't2', method: 'GET', pathname: '/api/teacher/class/reports', query: { code: 'FZ-AB2C3D' }, now: 1_700_000_030_000 })));
  assert(r.status === 404, 'guru t2 TIDAK bisa menarik laporan kelas t1 (IDOR ditahan, jawaban 404 identik dengan kode tak ada)');
  r = await json(await routes.routeClassList(ctxOf(db, { sub: 't1', method: 'GET', pathname: '/api/teacher/class/list' })));
  assert(r.status === 200 && r.body.classes.length === 1 && r.body.classes[0].reports === 2, 'daftar kelas guru + jumlah laporan');
  r = await json(await routes.routeClassList(ctxOf(db, { sub: 't2', method: 'GET', pathname: '/api/teacher/class/list' })));
  assert(r.status === 200 && r.body.classes.length === 0, 'guru t2 melihat daftar kosong');

  /* ---------- 2b. kirim tugas (guru) -> tarik tugas (murid) ------------------------ */
  const asgBody = { id: 'as-77', title: 'Review Past Tense', skills: ['past_tense'], itemIds: ['pt-1', 'pt-2', 'pt-3'], minutes: 4, mode: 'latihan', deadline: '2026-09-10', from: 'Kelas 10A' };
  const na = core.normalizeAssignment({ code: 'fz-ab2c3d', assignment: asgBody, targets: ['Rina Kartika', 'Dimas', 'rina'] });
  assert(na.ok && na.payload.cls === 'FZ-AB2C3D' && na.payload.t === 'assign' && na.targets.join(',') === 'rina,dimas', 'tugas dinormalisasi; target = learner_key unik');
  assert(!core.normalizeAssignment({ code: 'FZ-AB2C3D', assignment: { ...asgBody, itemIds: [] } }).ok, 'tugas tanpa soal ditolak');
  assert(!core.normalizeAssignment({ code: 'FZ-AB2C3D', assignment: { ...asgBody, id: 'bad id!' } }).ok, 'id tugas liar ditolak');
  r = await json(await routes.routeClassAssign(ctxOf(db, { sub: 't2', method: 'POST', pathname: '/api/teacher/class/assign', body: { code: 'FZ-AB2C3D', assignment: asgBody }, now: 1_700_000_040_000 })));
  assert(r.status === 404, 'guru t2 tidak bisa mengirim tugas ke kelas guru t1');
  r = await json(await routes.routeClassAssign(ctxOf(db, { sub: 't1', method: 'POST', pathname: '/api/teacher/class/assign', body: { code: 'FZ-AB2C3D', assignment: asgBody, targets: ['Rina'] }, now: 1_700_000_040_000 })));
  assert(r.status === 200 && r.body.ok && r.body.targets === 1, 'guru t1 mengirim tugas ke 1 murid terpilih');
  r = await json(await routes.routeClassAssign(ctxOf(db, { sub: 't1', method: 'POST', pathname: '/api/teacher/class/assign', body: { code: 'FZ-AB2C3D', assignment: { ...asgBody, id: 'as-78', title: 'Untuk semua' } }, now: 1_700_000_041_000 })));
  assert(r.status === 200 && r.body.targets === 'all', 'guru t1 mengirim tugas ke seluruh kelas');
  r = await json(await routes.routeLearnerClassAssignments(ctxOf(db, { sub: 'anon-1', method: 'GET', pathname: '/api/learner/class-assignments', query: { cls: 'FZ-AB2C3D', name: 'Rina Kartika', since: '0' }, now: 1_700_000_050_000 })));
  assert(r.status === 200 && r.body.assignments.length === 2 && r.body.assignments[0].assignment.id === 'as-77' && r.body.cursor === 1_700_000_041_000, 'Rina menerima tugas terpilih + tugas kelas, kursor maju');
  r = await json(await routes.routeLearnerClassAssignments(ctxOf(db, { sub: 'anon-2', method: 'GET', pathname: '/api/learner/class-assignments', query: { cls: 'FZ-AB2C3D', name: 'Dimas' }, now: 1_700_000_051_000 })));
  assert(r.status === 200 && r.body.assignments.length === 1 && r.body.assignments[0].assignment.id === 'as-78', 'Dimas hanya menerima tugas seluruh kelas');
  r = await json(await routes.routeLearnerClassAssignments(ctxOf(db, { sub: 'anon-2', method: 'GET', pathname: '/api/learner/class-assignments', query: { cls: 'FZ-AB2C3D', name: 'Dimas', since: '1700000041000' }, now: 1_700_000_060_000 })));
  assert(r.status === 200 && r.body.assignments.length === 0, 'kursor since menyaring tugas yang sudah ditarik');
  r = await json(await routes.routeLearnerClassAssignments(ctxOf(db, { sub: 'anon-3', method: 'GET', pathname: '/api/learner/class-assignments', query: { cls: 'FZ-ZZZ234', name: 'X' }, now: 1_700_000_061_000 })));
  assert(r.status === 404, 'kode kelas tak dikenal -> 404');

  /* ---------- 3. kontrak statis -------------------------------------------------- */
  const fs = require('fs');
  const src = fs.readFileSync(path.join(API, 'route-class-sync.js'), 'utf8');
  for (const m of src.matchAll(/'(SELECT|UPDATE|INSERT)[^;]*?tc_class[^;]*?'\s*\)?\s*\n?\s*\.bind/g)) {
    const q = m[0];
    if (/routeLearnerClassReport/.test(src.slice(0, m.index)) && !/roleGate/.test(src.slice(0, m.index).split('export async function').pop())) continue;
    assert(/teacher_sub/.test(q) || /INSERT INTO tc_class_report|SELECT code FROM tc_class WHERE code = \?1'/.test(q), 'kueri lane guru ber-teacher_sub: ' + q.slice(0, 60));
  }
  const rc = await import('file://' + path.join(API, 'auth', 'role-core.js'));
  for (const p of ['/api/teacher/class/claim', '/api/teacher/class/list', '/api/teacher/class/reports', '/api/teacher/class/assign']) assert(rc.ROUTE_CAPABILITY[p], 'rute ' + p + ' terdaftar di ROUTE_CAPABILITY');
  assert(!rc.ROUTE_CAPABILITY['/api/learner/class-report'] && !rc.ROUTE_CAPABILITY['/api/learner/class-assignments'], 'lane murid TIDAK lewat matriks peran (murid lokal-dulu tanpa akun)');

  for (const r2 of results) console.log((r2.ok ? 'ok   - ' : 'FAIL - ') + r2.message);
  console.log('\n' + (results.length - failures) + '/' + results.length + ' PASS · class-sync-test.js');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('FAIL - gerbang melempar: ' + (e && e.stack || e)); process.exit(1); });
