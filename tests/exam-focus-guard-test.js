'use strict';
/**
 * tests/exam-focus-guard-test.js — GERBANG: PENDETEKSI KELUAR LAYAR SAAT UJIAN.
 *
 * Yang dijaga berkas ini adalah satu janji: selama murid mengerjakan UJIAN dari guru,
 * meninggalkan layar (Home ditekan, pindah tab, pindah aplikasi) tercatat dan sampai ke
 * guru saat ujian masih berjalan. Rantainya diuji ujung ke ujung karena setiap mata
 * rantai bisa putus sendiri-sendiri tanpa satu pun error terlihat di layar murid:
 *
 *   1. inti murni  — features/class-hub/fiezel-focus-guard.js (masa tenggang, idempotensi,
 *      episode yang masih berjalan, ringkasan);
 *   2. klien       — class-hub memasang pendengar HANYA di mode 'ujian', menyimpan
 *      hitungannya di ui() (tahan muat ulang halaman), dan melapor pada tiap episode;
 *   3. transport   — learner-flow.recordAssignmentFocus -> assign.f pada class-report;
 *   4. gerbang server — class-sync-core menerima f = tiga bilangan dan menolak yang lain;
 *   5. sisi guru   — ingest menyimpan f, membangunkan kabar HANYA saat angkanya naik.
 *
 * Yang SENGAJA ikut diuji sebagai batas: latihan (mode 'latihan') tidak dipantau, dan
 * kepergian di bawah masa tenggang tidak dihitung. Keduanya keputusan produk, bukan
 * detail teknis — kalau seseorang melonggarkannya, gerbang ini harus merah.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const ROOT = process.env.FIEZEL_ROOT || __fzRoot;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const FG = require('../features/class-hub/fiezel-focus-guard.js');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* ---------------------------------------------------------------- 1 · inti murni --- */

test('guard: kepergian di bawah masa tenggang dibuang, di atasnya dihitung', () => {
  const s = FG.start('a1', 0);
  FG.leave(s, 1000, 'hidden');
  assert.strictEqual(FG.back(s, 1000 + FG.GRACE_MS - 1), null, 'gangguan sistem tidak dihitung');
  assert.strictEqual(s.n, 0);
  FG.leave(s, 5000, 'hidden');
  const ep = FG.back(s, 5000 + FG.GRACE_MS);
  assert.ok(ep && ep.ms === FG.GRACE_MS && ep.r === 'hidden');
  assert.strictEqual(s.n, 1);
  assert.strictEqual(s.episodes.length, 1);
});

test('guard: blur + visibilitychange untuk satu kepergian hanya dihitung sekali', () => {
  const s = FG.start('a1', 0);
  FG.leave(s, 1000, 'blur');
  FG.leave(s, 1010, 'hidden');   // pasangan event yang sama, bukan kepergian kedua
  FG.back(s, 11000);
  assert.strictEqual(s.n, 1);
  assert.strictEqual(s.ms, 10000);
  assert.strictEqual(FG.back(s, 12000), null, 'kembali tanpa episode terbuka = tidak ada apa-apa');
});

test('guard: episode yang MASIH berjalan sudah masuk ringkasan (bagian realtime)', () => {
  const s = FG.start('a1', 0);
  FG.leave(s, 1000, 'hidden');
  const belum = FG.summary(s, 1000 + FG.GRACE_MS - 1);
  assert.strictEqual(belum.n, 0); assert.strictEqual(belum.away, true);
  const jalan = FG.summary(s, 41000);
  assert.strictEqual(jalan.n, 1);
  assert.strictEqual(jalan.ms, 40000);
  assert.deepStrictEqual(FG.payload(s, 41000), { n: 1, s: 40, x: 40 });
});

test('guard: restore mengembalikan hitungan setelah halaman dimuat ulang; bentuk asing ditolak', () => {
  const s = FG.start('a1', 0);
  FG.leave(s, 1000, 'hidden'); FG.back(s, 21000);
  const kembali = FG.restore(JSON.parse(JSON.stringify(s)));
  assert.strictEqual(kembali.n, 1); assert.strictEqual(kembali.ms, 20000); assert.strictEqual(kembali.aid, 'a1');
  assert.strictEqual(FG.restore({ n: 9 }), null);
  assert.strictEqual(FG.restore(null), null);
});

test('guard: severity bersih / ringan / berat', () => {
  assert.strictEqual(FG.severity({ n: 0, ms: 0 }), 'bersih');
  assert.strictEqual(FG.severity({ n: 1, ms: 4000 }), 'ringan');
  assert.strictEqual(FG.severity({ n: 1, ms: 45000 }), 'berat');
  assert.strictEqual(FG.severity({ n: 3, ms: 6000 }), 'berat');
});

test('guard: modul murni — tanpa DOM, jaringan, penyimpanan, atau jam internal', () => {
  const src = read('features/class-hub/fiezel-focus-guard.js');
  // Komentar dibuang dulu: berkas ini MENYEBUT localStorage/DOM justru untuk menjelaskan
  // kenapa ia tidak menyentuhnya, dan penyebutan itu bukan pelanggaran.
  const body = src.slice(src.indexOf('function num(')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  [/\bdocument\b/, /\bwindow\./, /localStorage/, /fetch\(/, /Date\.now\(/, /setTimeout\(/].forEach((re) => {
    assert.ok(!re.test(body), 'inti harus murni, melanggar: ' + re);
  });
});

/* ------------------------------------------------------- 2 · klien (class-hub DOM) --- */

test('class-hub: ujian dipantau ujung ke ujung; latihan TIDAK dipantau', () => {
  const store = {};
  globalThis.window = globalThis;
  globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true, writable: true });
  const docHandlers = {}, winHandlers = {};
  globalThis.document = {
    visibilityState: 'visible',
    body: { classList: { add() {}, remove() {} } },
    getElementById: () => null,
    addEventListener(t, fn) { (docHandlers[t] = docHandlers[t] || []).push(fn); },
    removeEventListener(t, fn) { docHandlers[t] = (docHandlers[t] || []).filter((f) => f !== fn); }
  };
  globalThis.addEventListener = (t, fn) => { (winHandlers[t] = winHandlers[t] || []).push(fn); };
  globalThis.removeEventListener = (t, fn) => { winHandlers[t] = (winHandlers[t] || []).filter((f) => f !== fn); };
  globalThis.fetch = () => Promise.reject(new Error('offline'));
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

  require('../features/learner-flow/fiezel-review-bank.js');
  require('../features/brain/fiezel-item-prior.js');
  require('../features/teacher/fiezel-teacher-store.js');
  require('../features/learner-flow/fiezel-learner-flow.js');
  require('../features/class-hub/fiezel-focus-guard.js');
  require('../features/class-hub/fiezel-braincore-review.js');
  require('../features/class-hub/fiezel-class-hub.js');
  const Hub = globalThis.FiezelClassHub, TS = globalThis.FiezelTeacherStore, LF = globalThis.FiezelLearnerFlow, Bank = globalThis.FiezelReviewBank;
  assert.ok(Hub && TS && LF && Bank && globalThis.FiezelFocusGuard);

  const mkEl = () => { const el = { innerHTML: '', _h: {}, addEventListener(t, fn) { (el._h[t] = el._h[t] || []).push(fn); }, querySelector: () => null, fire(t, target) { (el._h[t] || []).forEach((fn) => fn({ target, preventDefault() {} })); } }; return el; };
  const btn = (attrs) => { const b = { getAttribute: (k) => (k in attrs ? attrs[k] : null) }; b.closest = (sel) => (sel === '[data-ch]' ? b : null); return b; };
  const fire = (bag, type) => (bag[type] || []).slice().forEach((fn) => fn({}));
  const ids = Bank.pick('past_tense', 3, 7).map((x) => x.id);

  store['fiezel-onboarding-v1'] = JSON.stringify({ name: 'Ani', classCode: 'FZ-AB2C3D' });
  assert.ok(TS.acceptAssignmentPayload({ v: 1, t: 'assign', id: 'ujian-1', title: 'Ujian mini', skills: ['past_tense'], itemIds: ids, minutes: 5, from: 'Kelas 8A', cls: 'FZ-AB2C3D', mode: 'ujian', timer: 5 }));
  const sEl = mkEl(); const senv = { toast(t) { senv.last = t; }, go() {}, afterRender() {} };
  Hub.mountStudent(sEl, senv);
  Hub.openAssignment('ujian-1');
  assert.ok(sEl.innerHTML.includes('class-proctor-notice'), 'murid diberi tahu layar dipantau SEBELUM keluar');
  assert.ok(docHandlers.visibilitychange && docHandlers.visibilitychange.length, 'pendengar layar terpasang saat ujian');

  // Keluar layar 20 detik: hitungan naik, kabar terkirim, pita berubah jadi peringatan.
  const u = Hub._studentUi();
  globalThis.document.visibilityState = 'hidden';
  fire(docHandlers, 'visibilitychange');
  assert.ok(u.focus.awaySince, 'episode terbuka');
  u.focus.awaySince -= 20000;                       // 20 detik berlalu di luar layar
  globalThis.document.visibilityState = 'visible';
  fire(docHandlers, 'visibilitychange');
  assert.strictEqual(u.focus.n, 1);
  assert.ok(u.focus.ms >= 20000);
  assert.ok(/keluar dari layar ujian/i.test(String(senv.last || '')), 'murid diberi tahu catatannya terkirim');
  assert.ok(sEl.innerHTML.includes('class-proctor-warn'), 'pita berubah jadi catatan tercatat');
  const laporan = (LF._state().doneAssign || []).filter((x) => x.id === 'ujian-1')[0];
  assert.ok(laporan && laporan.f && laporan.f.n === 1 && laporan.f.s >= 20, 'assign.f siap dikirim ke guru: ' + JSON.stringify(laporan));

  // Muat ulang halaman di tengah ujian tidak menghapus jejak.
  const disimpan = JSON.parse(store['fiezel-class-hub-v1']);
  assert.ok(disimpan.focus && disimpan.focus.n === 1, 'hitungan ikut tersimpan ke localStorage');

  // Selesai mengerjakan: catatan ikut ke hasil akhir, pendengar dilepas.
  for (let i = 0; i < ids.length; i++) sEl.fire('click', btn({ 'data-ch': 'answer', 'data-i': '0' }));
  const hasil = (LF._state().doneAssign || []).filter((x) => x.id === 'ujian-1')[0];
  assert.ok(hasil && hasil.t === ids.length, 'hasil tercatat');
  assert.ok(hasil.f && hasil.f.n === 1, 'catatan keluar layar TIDAK hilang saat hasil menimpa entri');
  assert.ok(!docHandlers.visibilitychange.length, 'pendengar dilepas setelah ujian selesai');

  // ---- LATIHAN: tidak dipantau sama sekali ----------------------------------------------
  sEl.fire('click', btn({ 'data-ch': 'close-runner' }));
  assert.ok(TS.acceptAssignmentPayload({ v: 1, t: 'assign', id: 'latihan-1', title: 'Latihan', skills: ['past_tense'], itemIds: ids, minutes: 5, from: 'Kelas 8A', cls: 'FZ-AB2C3D', mode: 'latihan' }));
  Hub.openAssignment('latihan-1');
  assert.ok(!sEl.innerHTML.includes('class-proctor-notice'), 'latihan harian tidak berubah jadi pengawasan');
  assert.strictEqual(Hub._studentUi().focus, null);
  assert.ok(!docHandlers.visibilitychange.length, 'tidak ada pendengar layar di mode latihan');
});

/* ------------------------------------------------------------- 3 · gerbang server --- */

test('class-sync-core: f = tiga bilangan diterima; bentuk lain ditolak', async () => {
  const core = await import('../workers/api/teacher/class-sync-core.js');
  const now = Date.now();
  const base = { cls: 'FZ-AB2C3D', name: 'Ani', skills: { past_tense: { c: 2, t: 3 } } };
  const ok = core.normalizeReport(Object.assign({ assign: [{ id: 'ujian-1', s: 1, f: { n: 2, s: 95, x: 60 } }] }, base), now);
  assert.ok(ok.ok, JSON.stringify(ok));
  assert.deepStrictEqual(ok.report.assign[0].f, { n: 2, s: 95, x: 60 });
  const tanpaF = core.normalizeReport(Object.assign({ assign: [{ id: 'ujian-1', c: 3, t: 5 }] }, base), now);
  assert.ok(tanpaF.ok && tanpaF.report.assign[0].f === undefined, 'kompatibel mundur: klien lama tanpa f tetap diterima');
  [
    { n: 2, s: 10, x: 40 },                    // terlama > total = mustahil
    { n: -1, s: 10, x: 1 },
    { n: 2, s: 10 * 3600, x: 1 },              // di luar batas tertutup
    { n: 1, s: 10, x: 1, catatan: 'buka google' }, // teks bebas TIDAK boleh menyelinap
    'dua kali'
  ].forEach((f, i) => {
    if (i === 3) return; // field asing di dalam f cukup diabaikan; yang dijaga: ia tidak ikut tersimpan
    const r = core.normalizeReport(Object.assign({ assign: [{ id: 'ujian-1', f: f }] }, base), now);
    assert.ok(!r.ok && r.reason === 'bad_assign_focus', 'ditolak: ' + JSON.stringify(f));
  });
  const asing = core.normalizeReport(Object.assign({ assign: [{ id: 'ujian-1', f: { n: 1, s: 10, x: 1, catatan: 'buka google' } }] }, base), now);
  assert.ok(asing.ok && asing.report.assign[0].f.catatan === undefined, 'tanpa teks bebas: field asing tidak tersimpan');
});

/* ------------------------------------------- 3b · kiriman yang ditolak server --- */

test('learner-flow: laporan yang ditolak server DIULANG, tidak hilang diam-diam', async () => {
  const LF = globalThis.FiezelLearnerFlow, TS = globalThis.FiezelTeacherStore;
  assert.ok(LF && TS, 'modul sudah dimuat oleh gerbang DOM-stub di atas');
  const asli = TS.reportToClass;
  let kiriman = 0;
  try {
    // Urutan yang menghasilkan keluhan nyata: murid membuka ujian (laporan #1), lalu keluar
    // layar beberapa detik kemudian — laporan #2 jatuh di bawah lantai 15 detik server (429).
    TS.reportToClass = function () { kiriman++; return Promise.resolve({ ok: false, status: 429, error: 'rate_limited' }); };
    LF.recordAssignmentFocus('ujian-1', { n: 1, s: 20, x: 20 });
    await new Promise((r) => setTimeout(r, 0));
    assert.strictEqual(kiriman, 1, 'percobaan pertama terkirim');
    const tunggu = LF._retryState();
    assert.ok(tunggu.pending, 'penolakan server menjadwalkan percobaan ulang');
    assert.ok(tunggu.delay >= 16000, 'jedanya di atas lantai server, bukan langsung menghujani: ' + tunggu.delay);

    TS.reportToClass = function () { kiriman++; return Promise.resolve({ ok: true }); };
    LF.pushToClass();
    await new Promise((r) => setTimeout(r, 0));
    assert.strictEqual(kiriman, 2);
    assert.ok(!LF._retryState().pending, 'kiriman yang berhasil menghentikan pengulangan');
  } finally { TS.reportToClass = asli; }
});

/* ----------------------------------------------------------------- 4 · sisi guru --- */

test('teacher store: f tersimpan per murid dan kabar hanya lahir saat angkanya naik', () => {
  const TS = globalThis.FiezelTeacherStore || require('../features/teacher/fiezel-teacher-store.js');
  const c = TS.normalizeClass({ id: 'c1', code: 'FZ-AB2C3D', name: 'Kelas 8A', level: 'A2', students: [TS.newStudent('Ani')], assignments: [] });
  const a = TS.buildAssignment({ title: 'Ujian mini', skills: ['past_tense'], itemIds: ['x1', 'x2'], mode: 'ujian' });
  c.assignments.push(a);
  const laporan = (f) => TS.parseLearnerPayload({ v: 1, name: 'Ani', at: Date.now(), skills: { past_tense: { c: 1, t: 2 } }, lessons: 1, cls: 'FZ-AB2C3D', assign: [{ id: a.id, s: 1, f: f }] });

  const r1 = TS.ingest(c, laporan({ n: 1, s: 20, x: 20 }));
  assert.strictEqual(r1.focusEvents.length, 1, 'kepergian pertama membangunkan guru');
  assert.strictEqual(r1.focusEvents[0].kind, 'focus_exit');
  assert.deepStrictEqual([c.assignments[0].focus[r1.student.id].n, c.assignments[0].focus[r1.student.id].s], [1, 20]);

  const r2 = TS.ingest(c, laporan({ n: 1, s: 20, x: 20 }));
  assert.strictEqual(r2.focusEvents.length, 0, 'laporan yang sama dikirim ulang tidak membangunkan guru dua kali');

  const r3 = TS.ingest(c, laporan({ n: 2, s: 75, x: 55 }));
  assert.strictEqual(r3.focusEvents.length, 1, 'angka naik = kabar baru');
  assert.strictEqual(TS.focusLevel(c.assignments[0].focus[r1.student.id]), 'berat');
  assert.ok(/2×/.test(TS.focusLabel(c.assignments[0].focus[r1.student.id])));
  assert.strictEqual(TS.focusLabel({ n: 0, s: 0, x: 0 }), 'Tidak keluar layar');
  const kabar = TS.inboxText(Object.assign({ at: Date.now() }, r3.focusEvents[0]));
  assert.ok(/^⚠/.test(kabar), 'kabar dibaca sebagai PERINGATAN, bukan catatan administratif: ' + kabar);
  assert.ok(/Ani/.test(kabar) && /Ujian mini/.test(kabar) && /2×/.test(kabar), 'menyebut siapa, sedang apa, seberapa sering: ' + kabar);
  assert.ok(!/curang|menyontek/i.test(kabar), 'menyebut fakta, tidak memvonis');

  // Kabar generik tidak boleh lahir bersama peringatan untuk murid yang sama — dulu ia yang
  // terbaca duluan di kotak masuk, dan peringatannya tertutup.
  const src = read('features/teacher/fiezel-teacher-store.js');
  assert.ok(/!\(res\.focusEvents \|\| \[\]\)\.length\) events\.push\(\{ kind: 'report_in'/.test(src), 'report_in ditahan saat ada focus_exit');
});

test('sisi guru: chip keluar-layar muncul di daftar status murid, cangkang mendahulukan kabarnya', () => {
  const hub = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(/function focusChip/.test(hub) && /focusChip\(a, s\) \+ statusChip\(st\)/.test(hub), 'chip di baris murid');
  assert.ok(/tclass-focus-count-/.test(hub), 'ringkasan per tugas');
  assert.ok(/REPORT_GAP_MS/.test(hub) && /focusTrailTimer/.test(hub), 'kiriman yang kena pembatas laju server disusulkan, tidak dibuang');
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  assert.ok(/function focusPanel/.test(shell) && /tg-focus-list/.test(shell), 'laci murid memuat catatan keluar layar (tujuan ketukan kabar)');
  assert.ok(/if \(!rows\.length\) return '';/.test(shell), 'murid tanpa catatan tidak memunculkan bagian apa pun');
  assert.ok(/kind === 'focus_exit'; \}\)\[0\] \|\| total\.events\.filter/.test(shell), 'toast mendahulukan kabar keluar layar');
  assert.ok(/'focus_exit' \? 'eye-off'/.test(shell), 'ikon kabar di kotak masuk guru');
});

test('realtime: detak murid tidak boleh jauh lebih lambat daripada detak guru', () => {
  const app = read('app.js'), inbox = read('features/notify/fiezel-inbox.js'), shell = read('features/teacher/fiezel-teacher-shell.js');
  const murid = Number((app.match(/const NOTIF_POLL_MS=(\d+)/) || [])[1]);
  const remKlien = Number((inbox.match(/var MIN_GAP_MS = (\d+)/) || [])[1]);
  const guru = Number((shell.match(/var SYNC_EVERY_MS = (\d+)/) || [])[1]);
  assert.ok(murid && remKlien && guru, 'ketiga detak terbaca');
  /* Keluhan yang menutup angka lama: papan guru hidup sendiri tiap 10 detik sementara layar
     murid menunggu satu menit penuh, jadi murid harus menutup-buka aplikasi. Batas 1,5×
     membuat jarak itu tidak bisa melebar lagi tanpa seseorang menyadarinya. */
  assert.ok(murid <= guru * 1.5, 'detak murid (' + murid + ') tidak boleh jauh di atas detak guru (' + guru + ')');
  assert.ok(remKlien <= murid, 'rem klien (' + remKlien + ') tidak boleh membuang tanya yang sudah dijadwalkan (' + murid + ')');
  assert.ok(murid >= 5000 && remKlien >= 5000, 'tetap di atas lantai server 5 detik');
});

/* --------------------------------------------------------- 5 · pemasangan & i18n --- */

test('pemasangan: modul terdaftar di index.html + sw.js, dan teks murid lahir dua bahasa', () => {
  const html = read('index.html'), sw = read('sw.js');
  assert.ok(html.indexOf('fiezel-focus-guard.js') > -1 && html.indexOf('fiezel-focus-guard.js') < html.indexOf('fiezel-class-hub.js'), 'inti dimuat sebelum class-hub');
  assert.ok(sw.includes('./features/class-hub/fiezel-focus-guard.js'), 'ikut precache: ujian sering dikerjakan tanpa jaringan');
  assert.ok(html.includes('copy-id-proctor.js') && sw.includes('./features/i18n/copy-id-proctor.js'));
  assert.ok(read('features/i18n/fiezel-th-loader.js').includes('copy-th-proctor.js'), 'pasangan th ikut dimuat saat locale th');
  const idKeys = (read('features/i18n/copy-id-proctor.js').match(/'proctor\.[a-z-]+'/g) || []).sort();
  const thKeys = (read('features/i18n/copy-th-proctor.js').match(/'proctor\.[a-z-]+'/g) || []).sort();
  assert.ok(idKeys.length >= 3);
  assert.deepStrictEqual(thKeys, idKeys, 'kunci id dan th sama persis');
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); } catch (e) { fail++; console.log('FAIL - ' + name + '\n  ' + (e && e.stack || e)); }
  }
  console.log(fail ? `\n${fail} gagal` : '\nSemua gerbang pendeteksi keluar layar lulus');
  process.exit(fail ? 1 : 0);
})();
