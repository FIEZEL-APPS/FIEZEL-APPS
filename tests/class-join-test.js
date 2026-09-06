'use strict';
/**
 * tests/class-join-test.js — GERBANG: MURID MENGETIK KODE KELAS → GURU TAHU SEKARANG JUGA.
 *
 * Sebelum m025-272, menekan "Gabung" hanya menulis kode ke localStorage murid. Guru baru
 * tahu muridnya ada saat murid itu menyelesaikan tugas pertamanya — dan murid yang salah
 * ketik kode mengira dirinya sudah tergabung padahal tidak ada siapa pun di ujung sana.
 * Dua kebisuan, satu momen.
 *
 * Rantai yang dijaga berkas ini:
 *   1. murid       — setClassCode memanggil announceJoin (ketukan dikirim SEKARANG);
 *   2. transport   — penanda `j` bertahan sampai satu kiriman BERHASIL (tahan offline/429);
 *   3. server      — `j` diterima hanya sebagai nilai tunggal 1; bentuk lain ditolak;
 *   4. sisi guru   — ketukan dari nama BARU berhenti sebagai PERMINTAAN, bukan pendaftaran
 *                    diam-diam; laporan dengan HASIL tetap mendaftar otomatis seperti dulu;
 *   5. keputusan   — guru menambahkan atau mengabaikan, dan yang ditambahkan jadi murid biasa.
 *
 * Batas yang ikut dikunci: kode kelas enam huruf bisa salah ketik dan bisa ditebak, jadi
 * ketukan bergabung TIDAK boleh langsung memasukkan orang ke kelas. Kalau seseorang
 * melonggarkannya, gerbang ini merah.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');
const ROOT = process.env.FIEZEL_ROOT || __fzRoot;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const tests = [];
const test = (n, fn) => tests.push([n, fn]);

/* -------------------------------------------------------------- 3 · gerbang server --- */

test('server: penanda gabung diterima sebagai nilai tunggal; bentuk lain ditolak', async () => {
  const core = await import('../workers/api/teacher/class-sync-core.js');
  const now = Date.now();
  const base = { cls: 'FZ-AB2C3D', name: 'Ani', skills: {} };
  const ok = core.normalizeReport(Object.assign({ j: 1 }, base), now);
  assert.ok(ok.ok && ok.report.j === 1, JSON.stringify(ok));
  const tanpa = core.normalizeReport(Object.assign({}, base), now);
  assert.ok(tanpa.ok && tanpa.report.j === undefined, 'klien lama tanpa penanda tetap diterima');
  [2, 'ya', {}, [1]].forEach((j) => {
    const r = core.normalizeReport(Object.assign({ j: j }, base), now);
    assert.ok(!r.ok && r.reason === 'bad_join_flag', 'ditolak: ' + JSON.stringify(j));
  });
});

/* ----------------------------------------------------- 4 & 5 · sisi guru (murni) --- */

function kelasBaru(TS) {
  return TS.normalizeClass({ id: 'c1', code: 'FZ-AB2C3D', name: 'Kelas 8A', level: 'A2', students: [], assignments: [] });
}
function laporan(TS, opts) {
  return TS.parseLearnerPayload(Object.assign({ v: 1, name: 'Ani', at: Date.now(), skills: {}, lessons: 0, cls: 'FZ-AB2C3D' }, opts));
}

test('guru: ketukan gabung dari nama baru = PERMINTAAN, bukan pendaftaran diam-diam', () => {
  const TS = require('../features/teacher/fiezel-teacher-store.js');
  const c = kelasBaru(TS);
  const r = TS.ingest(c, laporan(TS, { j: 1 }));
  assert.ok(r.pending && r.isNewPending, 'berhenti sebagai permintaan');
  assert.strictEqual(c.students.length, 0, 'kode kelas bisa salah ketik dan bisa ditebak — guru yang memutuskan');
  assert.strictEqual(TS.pendingJoins(c).length, 1);
  assert.strictEqual(TS.pendingJoins(c)[0].name, 'Ani');

  // Ketukan yang sama datang lagi (murid menekan Gabung dua kali) tidak menggandakan antrean.
  const ulang = TS.ingest(c, laporan(TS, { j: 1 }));
  assert.ok(ulang.pending && !ulang.isNewPending, 'ketukan kedua bukan kabar baru');
  assert.strictEqual(TS.pendingJoins(c).length, 1);
});

test('guru: laporan yang membawa HASIL tetap mendaftar otomatis (perilaku lama dijaga)', () => {
  const TS = require('../features/teacher/fiezel-teacher-store.js');
  const c = kelasBaru(TS);
  const r = TS.ingest(c, laporan(TS, { skills: { past_tense: { c: 3, t: 5 } } }));
  assert.ok(!r.pending && r.isNew, 'murid yang sudah mengerjakan tugas kelas ini jelas bukan orang asing');
  assert.strictEqual(c.students.length, 1);
});

test('guru: murid yang menunggu lalu mengirim hasil tidak muncul dua kali', () => {
  const TS = require('../features/teacher/fiezel-teacher-store.js');
  const c = kelasBaru(TS);
  TS.ingest(c, laporan(TS, { j: 1 }));
  assert.strictEqual(TS.pendingJoins(c).length, 1);
  TS.ingest(c, laporan(TS, { skills: { past_tense: { c: 1, t: 2 } } }));
  assert.strictEqual(c.students.length, 1);
  assert.strictEqual(TS.pendingJoins(c).length, 0, 'entri tunggunya dibersihkan');
});

test('guru: menambahkan dan mengabaikan permintaan', () => {
  const TS = require('../features/teacher/fiezel-teacher-store.js');
  const c = kelasBaru(TS);
  TS.ingest(c, laporan(TS, { j: 1 }));
  const s = TS.acceptJoin(c, 'Ani');
  assert.strictEqual(c.students.length, 1);
  assert.strictEqual(s.name, 'Ani');
  assert.strictEqual(TS.pendingJoins(c).length, 0);
  // Menambahkan dua kali tidak melahirkan murid kembar.
  TS.acceptJoin(c, 'Ani');
  assert.strictEqual(c.students.length, 1);

  const c2 = kelasBaru(TS);
  TS.ingest(c2, laporan(TS, { j: 1 }));
  assert.strictEqual(TS.rejectJoin(c2, 'Ani'), true);
  assert.strictEqual(TS.pendingJoins(c2).length, 0);
  assert.strictEqual(c2.students.length, 0, 'yang diabaikan tidak pernah masuk kelas');
});

test('guru: kabar permintaan menyebut nama dan menanyakan keputusan', () => {
  const TS = require('../features/teacher/fiezel-teacher-store.js');
  const teks = TS.inboxText({ kind: 'join_request', student: 'Ani', cls: 'Kelas 8A', at: Date.now() });
  assert.ok(/Ani/.test(teks) && /Kelas 8A/.test(teks) && /\?$/.test(teks), 'kabar terbaca sebagai pertanyaan: ' + teks);
});

/* ------------------------------------------------------------ 1 & 2 · sisi murid --- */

test('murid: menekan Gabung mengirim ketukan sekarang, dan penandanya tahan gagal', () => {
  const hub = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(/function setClassCode[\s\S]{0,600}announceJoin\(\)/.test(hub), 'setClassCode memanggil announceJoin');
  const lf = read('features/learner-flow/fiezel-learner-flow.js');
  assert.ok(/function announceJoin\(\)[\s\S]{0,200}pendingJoin = 1/.test(lf), 'penanda dipasang saat murid menekan Gabung');
  assert.ok(/if \(st\.pendingJoin\) payload\.j = 1;/.test(lf), 'penanda ikut di setiap laporan sampai mendarat');
  assert.ok(/if \(r && r\.ok && st\.pendingJoin\) st\.pendingJoin = 0;/.test(lf), 'penanda dilepas HANYA oleh kiriman yang berhasil');
  assert.ok(/announceJoin: announceJoin/.test(lf), 'diekspor');
});

test('layar guru: kartu permintaan hanya muncul saat ada yang menunggu', () => {
  const hub = read('features/class-hub/fiezel-class-hub.js');
  assert.ok(/function pendingCard\(c\)[\s\S]{0,320}if \(!list\.length\) return '';/.test(hub), 'kelas tanpa pendatang tidak melihat kotak kosong');
  assert.ok(/data-ch="join-accept"/.test(hub) && /data-ch="join-reject"/.test(hub), 'dua keputusan tersedia langsung di kartunya');
  assert.ok(/case 'join-accept'[\s\S]{0,400}acceptJoin/.test(hub) && /case 'join-reject'[\s\S]{0,200}rejectJoin/.test(hub), 'penanganannya tersambung ke store');
  const shell = read('features/teacher/fiezel-teacher-shell.js');
  assert.ok(/'join_request'/.test(shell), 'kabarnya dikenali cangkang guru');
});

test('naskah kedua sisi lahir dua bahasa', () => {
  const idKeys = (read('features/i18n/copy-id-classjoin.js').match(/'kelas\.[a-z-]+'/g) || []).sort();
  const thKeys = (read('features/i18n/copy-th-classjoin.js').match(/'kelas\.[a-z-]+'/g) || []).sort();
  assert.ok(idKeys.length >= 6, 'naskahnya terdaftar: ' + idKeys.length);
  assert.deepStrictEqual(thKeys, idKeys, 'kunci id dan th sama persis');
  const html = read('index.html');
  assert.ok(html.includes('copy-id-classjoin.js'), 'copy id dimuat');
  assert.ok(read('features/i18n/fiezel-th-loader.js').includes('copy-th-classjoin.js'), 'copy th ikut dimuat saat locale th');
  assert.ok(read('sw.js').includes('./features/i18n/copy-id-classjoin.js'), 'ikut precache');
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('ok - ' + name); } catch (e) { fail++; console.log('FAIL - ' + name + '\n  ' + (e && e.stack || e)); }
  }
  console.log(fail ? `\n${fail} gagal` : '\nSemua gerbang gabung kelas lulus');
  process.exit(fail ? 1 : 0);
})();
