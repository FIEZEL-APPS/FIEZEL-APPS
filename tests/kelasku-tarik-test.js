#!/usr/bin/env node
'use strict';
/**
 * GERBANG TARIK TUGAS (tests/kelasku-tarik-test.js) — m025-365.
 *
 * Audit KelasKu K2 (24 September 2026): tombol hapus di Ruang Guru hanya membuang tugas dari
 * data guru, lewat confirm() dan tanpa jalan kembali. Salinan di HP murid hidup selamanya —
 * lama-lama berlabel "Terlambat" — dan murid tidak punya cara menyingkirkannya. Kotak masuk
 * murid hanya pernah MENAMBAH tugas; tidak ada satu jalur pun yang bisa mengurangi.
 *
 * Yang dijaga di sini (sisi klien; sisi server di tests/class-sync-test.js §2b):
 *   1. Penanda { t:'retract' } dari server mengeluarkan tugas dari antrean murid, memindahkannya
 *      ke Arsip KelasKu bertanda oleh:'guru', dan membuang kabar "tugas baru"-nya.
 *   2. Tugas yang sudah SELESAI dikerjakan tidak disentuh — hasilnya milik murid dan laporan.
 *   3. Guru mengirim ulang = tugasnya hidup lagi, tanda tarikan di Arsip dicabut.
 *   4. Kunci Arsip di kotak masuk sama persis dengan milik class hub.
 *   5. Ruang Guru: hapus hanya dari Arsip dan dua langkah; tidak ada confirm() lagi; tarik
 *      lewat server; tugas yang diarsipkan keluar dari agenda.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(__fzRoot, p), 'utf8');

const store = {};
globalThis.window = globalThis;
globalThis.self = globalThis; // modul browser menempel ke `self`; tanpa ini kotak masuk menempel ke module.exports
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
let balasan = null, panggilan = [];
globalThis.FiezelAccount = { api: (p, body) => { panggilan.push({ p, body }); return Promise.resolve(typeof balasan === 'function' ? balasan(p, body) : balasan); }, isTeacher: () => false, role: () => 'teacher' };
require('../features/teacher/fiezel-teacher-store.js');
require('../features/notify/fiezel-inbox.js');
const TS = globalThis.FiezelTeacherStore, Inbox = globalThis.FiezelInbox;
const ARCH_KEY = 'fiezel-class-archive-v1';

const tugas = (id, extra) => Object.assign({ v: 1, t: 'assign', id, title: 'Tugas ' + id, skills: ['past_tense'], itemIds: ['q1'], minutes: 5, from: '7B', teacher: 'Bu Sari', cls: 'FZ-7B2026', mode: 'latihan' }, extra || {});
function segar() {
  Object.keys(store).forEach((k) => delete store[k]);
  store['fiezel-onboarding-v1'] = JSON.stringify({ name: 'Ani', classCode: 'FZ-7B2026' });
  panggilan = [];
}
const T0 = Date.now();
const baris = (a, dt) => ({ id: a.id, at: T0 + dt, assignment: a }); // kotak masuk memangkas kabar > 30 hari, jadi waktunya harus sungguhan
const antrean = () => JSON.parse(store[TS.ASSIGN_KEY] || '[]').map((a) => a.id);
const arsip = () => JSON.parse(store[ARCH_KEY] || '{"missed":[]}');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

test('Penanda tarikan mengeluarkan tugas dari antrean dan memasukkannya ke Arsip sebagai "ditarik guru"', async () => {
  segar();
  balasan = { ok: true, data: { assignments: [baris(tugas('X'), 10), baris(tugas('Y'), 11)], cursor: 11 } };
  await Inbox.poll(true);
  assert.deepStrictEqual(antrean(), ['X', 'Y'], 'dua tugas diterima');
  assert.ok(Inbox.get('ta-X'), 'kabar tugas baru X ada di lonceng');
  balasan = { ok: true, data: { assignments: [baris({ v: 1, t: 'retract', id: 'X', cls: 'FZ-7B2026', title: 'Tugas X' }, 12)], cursor: 12 } };
  const r = await Inbox.poll(true);
  assert.deepStrictEqual(antrean(), ['Y'], 'X keluar dari antrean, Y tetap');
  assert.ok(r && r.retracted.length === 1 && r.retracted[0].title === 'Tugas X', 'pemanggil diberi ringkasan untuk pesan singkat ke murid');
  const m = arsip().missed;
  assert.ok(m.length === 1 && m[0].id === 'X' && m[0].oleh === 'guru', 'X tercatat di Arsip sebagai ditarik guru');
  assert.ok(!Inbox.get('ta-X'), 'kabar "tugas baru" X dibuang — ia tidak bisa dibuka lagi');
  assert.ok(!r.added.length, 'penanda tarikan tidak dibaca sebagai tugas baru');
});

test('Tugas yang sudah selesai tidak disentuh oleh tarikan', async () => {
  segar();
  balasan = { ok: true, data: { assignments: [baris({ v: 1, t: 'retract', id: 'Z', cls: 'FZ-7B2026', title: 'Sudah dikerjakan' }, 20)], cursor: 20 } };
  const r = await Inbox.poll(true);
  assert.strictEqual(r.retracted.length, 0, 'tidak ada yang ditarik — tidak ada pesan kosong untuk murid');
  assert.strictEqual(arsip().missed.length, 0, 'Arsip tidak diisi tugas yang tidak pernah menunggu');
});

test('Guru mengirim ulang: tanda tarikan dicabut dan tugasnya kembali', async () => {
  segar();
  store[ARCH_KEY] = JSON.stringify({ v: 1, ids: {}, missed: [Object.assign(tugas('X'), { arsipAt: 1, oleh: 'guru' })] });
  balasan = { ok: true, data: { assignments: [baris(tugas('X'), 30)], cursor: 30 } };
  await Inbox.poll(true);
  assert.deepStrictEqual(antrean(), ['X'], 'X kembali ke antrean');
  assert.strictEqual(arsip().missed.length, 0, 'tanda "ditarik guru" dicabut');
});

test('Kunci Arsip di kotak masuk sama dengan milik class hub', () => {
  const kunci = (src) => (src.match(/var ARCH_KEY = '([^']+)'/) || [])[1];
  assert.ok(kunci(read('features/notify/fiezel-inbox.js')), 'kotak masuk punya ARCH_KEY');
  assert.strictEqual(kunci(read('features/notify/fiezel-inbox.js')), kunci(read('features/class-hub/fiezel-class-hub.js')));
});

test('Store guru: retractAssignment lewat server; 404 = tarikan lokal; gagal jaringan = tidak ditandai', async () => {
  const c = { code: 'FZ-7B2026', students: [] };
  let a = { id: 'as-1' };
  balasan = { ok: true };
  let r = await TS.retractAssignment(c, a);
  assert.ok(r.ok && r.remote && a.retractedAt, 'ditarik lewat server');
  assert.ok(panggilan.some((x) => x.p === '/api/teacher/class/retract' && x.body.id === 'as-1' && x.body.code === 'FZ-7B2026'), 'rute dan badan yang benar');
  a = { id: 'as-2' }; balasan = { ok: false, error: 'not_found' };
  r = await TS.retractAssignment(c, a);
  assert.ok(r.ok && !r.remote && a.retractedAt, 'tugas yang hanya dibagikan lewat kode ditarik lokal saja');
  a = { id: 'as-3' }; balasan = { ok: false, error: 'unavailable' };
  r = await TS.retractAssignment(c, a);
  assert.ok(!r.ok && !a.retractedAt, 'gagal jaringan tidak pura-pura berhasil');
});

test('Store guru: tugas yang diarsipkan keluar dari agenda dan daftar tunggu murid', () => {
  const s = { id: 's1', name: 'Ani' };
  const c = { students: [s], assignments: [{ id: 'a1', deadline: '2000-01-01' }, { id: 'a2', deadline: '2000-01-01', archivedAt: 5 }] };
  assert.deepStrictEqual(TS.pendingAssignments(c, s).map((x) => x.a.id), ['a1']);
  assert.ok(!JSON.stringify(TS.agenda(c)).includes('a2'), 'agenda tidak lagi menagih tugas yang sudah diarsipkan');
});

test('Ruang Guru: hapus hanya dari Arsip, dua langkah, tanpa confirm(); tarik lewat server', () => {
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  assert.ok(!/confirm\(t\('guru\.konfirm-hapus-tugas'/.test(shell), 'confirm() hapus tugas kembali');
  assert.strictEqual((shell.match(/data-tg="delete-assign"/g) || []).length, 1, 'tombol hapus hanya ada di kartu Arsip');
  const kartu = shell.slice(shell.indexOf('function kartuArsip'), shell.indexOf('function assignments(c)'));
  assert.ok(/data-tg="delete-assign"/.test(kartu), 'tombol hapus berada di kartu Arsip');
  assert.ok(/case 'delete-assign': ui\.confirmDelete = id/.test(shell), 'ketukan pertama hanya membuka konfirmasi');
  assert.ok(/case 'retract-yes':[\s\S]{0,400}T\.retractAssignment\(c, rtA\)/.test(shell), 'tarik memanggil server');
  assert.ok(/data-testid="tg-life-tabs"/.test(shell) && /\['aktif'/.test(shell) && /\['lewat'/.test(shell) && /\['arsip'/.test(shell), 'tab Aktif / Lewat tenggat / Arsip');
  assert.ok(!/'Tenggat ' \+ esc\(a\.deadline\)/.test(shell), 'tanggal mentah ISO kembali di kartu tugas guru');
});

test('Aplikasi memberi murid satu kalimat saat tugas ditarik, dua bahasa', () => {
  const app = read('app.js');
  assert.ok(/r\.retracted&&r\.retracted\.length/.test(app) && /FiezelI18n\.t\('notif\.tugas-ditarik'/.test(app), 'inboxPoll menampilkan pesan tarikan');
  const s2 = { id: {}, th: {} };
  const root = { FiezelI18n: { registerCopy: (l, m) => Object.assign(s2[l], m) } };
  for (const f of fs.readdirSync(path.join(__fzRoot, 'features/i18n')).filter((f) => /^copy-(id|th)-.*\.js$/.test(f))) new Function('self', read('features/i18n/' + f))(root);
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  const kunci = ['notif.tugas-ditarik', ...new Set([...shell.matchAll(/t\('(guru\.siklus\.[a-z-]+)'/g)].map((m) => m[1]))];
  assert.ok(kunci.length > 20, 'kunci siklus guru terbaca');
  kunci.forEach((k) => {
    assert.ok(s2.id[k], 'id hilang: ' + k);
    assert.ok(/[฀-๿]/.test(s2.th[k] || ''), 'th hilang: ' + k);
    assert.deepStrictEqual((s2.id[k].match(/\{\w+\}/g) || []).sort(), (s2.th[k].match(/\{\w+\}/g) || []).sort(), 'placeholder beda: ' + k);
  });
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); } catch (e) { fail++; console.log('FAIL - ' + name + '\n  ' + (e && e.stack || e)); }
  }
  console.log(fail ? `\nFIEZEL tarik tugas: ${fail} gagal` : '\nFIEZEL tarik tugas: PASS');
  process.exit(fail ? 1 : 0);
})();
