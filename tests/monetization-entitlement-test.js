#!/usr/bin/env node
/**
 * FIEZEL gate — MESIN HAK AKSES (features/monetization/fiezel-entitlement.js).
 *
 * Aturan uang adalah aturan yang paling mahal kalau salah, dan salahnya punya DUA arah
 * yang sama-sama merusak: membuka pintu untuk yang belum membayar (pendapatan bocor),
 * atau mengunci pintu untuk yang sudah membayar (kepercayaan hilang, dan itu tidak bisa
 * dibeli kembali). Gerbang ini menembak keduanya, dan sengaja menembak dari sudut
 * penyerang — bukan sekadar "apakah fungsi ini mengembalikan true".
 *
 * Empat serangan yang benar-benar dijaga di sini, masing-masing punya alasan lapangan:
 *   1. KODE KELAS PALSU. app.js:13890 menerima kode kelas hanya dengan memeriksa
 *      bentuknya, tanpa bertanya ke server. Kalau mesin ini memberi akses atas dasar kode
 *      tersimpan, mengetik "AAA" membuka seluruh isi berbayar. Gerbang menuntut: kode
 *      tanpa verifikasi TIDAK PERNAH menghasilkan rencana sekolah.
 *   2. JAM DIPUTAR MUNDUR. Perangkat murid memegang jamnya sendiri. Memundurkan tanggal
 *      tidak boleh mengisi ulang jatah 3 sesi, dan tidak boleh menghidupkan masa Pro yang
 *      sudah lewat.
 *   3. TUGAS GURU TERHALANG JATAH KONSUMEN. Kalau PR dari guru bisa diblokir batas B2C,
 *      satu kelas berhenti bekerja dan sekolah berhenti membayar. Ini pagar yang
 *      melindungi jalur B2B, jadi ia diuji sebagai aturan, bukan sebagai kebetulan.
 *   4. NASKAH HILANG. Mesin mengembalikan copyKey; kalau kunci itu tidak ada di copy-map,
 *      murid membaca kunci mentah ("akses.sesi.habis") di layar yang meminta uang. Gerbang
 *      mengumpulkan copyKey dari PEMAKAIAN NYATA mesin, lalu menuntut keduanya ada di
 *      copy-id DAN copy-th dengan placeholder yang sama persis.
 *
 * Print-only: tidak menulis berkas apa pun; exit 1 bila ada FAIL.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..');

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const E = require('../features/monetization/fiezel-entitlement.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 20, 3, 0, 0); // 2026-09-20, pagi WIB

// ======================================================================================
// A. RESOLUSI RENCANA — urutan kekuatan dan masa berlaku
// ======================================================================================

test('tanpa catatan apa pun, rencananya gratis', () => {
  const r = E.resolve({ now: NOW });
  assert.strictEqual(r.plan, E.PLANS.FREE);
  assert.ok(r.reasons.includes('no_entitlement_record'), 'alasan disebut, bukan diam');
});

test('langganan pro yang masih berlaku menghasilkan rencana pro', () => {
  const r = E.resolve({ now: NOW, pro: { until: NOW + 5 * DAY } });
  assert.strictEqual(r.plan, E.PLANS.PRO);
  assert.strictEqual(r.inGrace, false);
  assert.ok(r.reasons.includes('pro_active'));
});

test('langganan pro yang sudah lewat TIDAK diberi tenggang (PRO_GRACE_MS = 0)', () => {
  assert.strictEqual(E.PRO_GRACE_MS, 0, 'tenggang pro = kebocoran pendapatan; harus tetap 0');
  const r = E.resolve({ now: NOW, pro: { until: NOW - 1 } });
  assert.strictEqual(r.plan, E.PLANS.FREE);
  assert.ok(r.reasons.includes('pro_expired'));
});

test('lisensi sekolah aktif mengalahkan pro yang sudah lewat (murid tidak membayar dua kali)', () => {
  const r = E.resolve({
    now: NOW,
    pro: { until: NOW - 30 * DAY },
    school: { classCode: '8A-ENG', verifiedAt: NOW - 60 * DAY, licenseUntil: NOW + 30 * DAY }
  });
  assert.strictEqual(r.plan, E.PLANS.SCHOOL);
  assert.strictEqual(r.source, 'school_license');
});

test('lisensi sekolah yang baru lewat tetap membuka pintu selama tenggang 14 hari', () => {
  assert.strictEqual(E.SCHOOL_GRACE_MS, 14 * DAY);
  const r = E.resolve({
    now: NOW,
    school: { classCode: '8A-ENG', verifiedAt: NOW - 200 * DAY, licenseUntil: NOW - 3 * DAY }
  });
  assert.strictEqual(r.plan, E.PLANS.SCHOOL, 'bendahara telat 3 hari tidak boleh mengunci 30 murid');
  assert.strictEqual(r.inGrace, true, 'tapi keadaannya harus JUJUR terbaca, supaya bisa ditagih');
  assert.ok(r.reasons.includes('school_license_grace'));
});

test('lisensi sekolah yang lewat melampaui tenggang benar-benar menutup', () => {
  const r = E.resolve({
    now: NOW,
    school: { classCode: '8A-ENG', verifiedAt: NOW - 400 * DAY, licenseUntil: NOW - 15 * DAY }
  });
  assert.strictEqual(r.plan, E.PLANS.FREE);
  assert.ok(r.reasons.includes('school_license_expired'));
});

// ======================================================================================
// B. SERANGAN 1 — kode kelas yang belum diverifikasi
// ======================================================================================

test('kode kelas TANPA verifikasi server tidak membuka apa pun', () => {
  const r = E.resolve({ now: NOW, classCode: 'AAA' });
  assert.strictEqual(r.plan, E.PLANS.FREE, 'mengetik kode sembarang tidak boleh = Pro gratis');
  assert.strictEqual(r.schoolPending, true, 'tapi murid berhak tahu kodenya sedang diperiksa');
});

test('objek sekolah tanpa verifiedAt tetap ditolak walau licenseUntil-nya jauh di depan', () => {
  const r = E.resolve({
    now: NOW,
    school: { classCode: '8A-ENG', licenseUntil: NOW + 999 * DAY } // verifiedAt hilang
  });
  assert.strictEqual(r.plan, E.PLANS.FREE);
  assert.ok(r.reasons.includes('school_unverified'));
});

test('level B1-C2 tetap terkunci untuk pemegang kode yang belum diverifikasi', () => {
  const r = E.resolve({ now: NOW, classCode: '8A-ENG' });
  assert.strictEqual(E.levelGate('B1', { plan: r.plan }).allowed, false);
  assert.strictEqual(E.levelGate('C2', { plan: r.plan }).allowed, false);
});

// ======================================================================================
// C. SERANGAN 2 — jam perangkat diputar mundur
// ======================================================================================

test('hari baru mengisi ulang jatah', () => {
  const after = E.advanceDay({ day: '2026-09-19', used: 3, maxDay: '2026-09-19' }, '2026-09-20');
  assert.deepStrictEqual(after, { day: '2026-09-20', used: 0, maxDay: '2026-09-20' });
});

test('memundurkan jam TIDAK mengisi ulang jatah', () => {
  const book = { day: '2026-09-20', used: 3, maxDay: '2026-09-20' };
  const after = E.advanceDay(book, '2026-09-18'); // jam diputar dua hari ke belakang
  assert.strictEqual(after.used, 3, 'pemakaian dipertahankan');
  assert.strictEqual(after.day, '2026-09-20', 'hari dikunci ke hari tertinggi yang pernah terlihat');
  const gate = E.sessionGate({ plan: E.PLANS.FREE, ledger: after, dayKey: '2026-09-18' });
  assert.strictEqual(gate.allowed, false, 'dan pintunya tetap tertutup');
});

test('maju lalu mundur lagi tidak menghasilkan jatah gratis', () => {
  let book = { day: '2026-09-20', used: 3, maxDay: '2026-09-20' };
  book = E.advanceDay(book, '2026-09-25'); // lompat maju: hari baru, jatah sah terisi
  assert.strictEqual(book.used, 0);
  book = E.recordSession(book, '2026-09-25');
  book = E.advanceDay(book, '2026-09-21'); // mundur ke antara
  assert.strictEqual(book.used, 1, 'pemakaian hari tertinggi tetap terbawa');
  assert.strictEqual(book.maxDay, '2026-09-25');
});

test('sanitizeLedger menolak nilai rusak tanpa melempar', () => {
  assert.deepStrictEqual(E.sanitizeLedger(null), { day: '', used: 0, maxDay: '' });
  assert.deepStrictEqual(E.sanitizeLedger({ day: 'x', used: -9, maxDay: '' }), { day: 'x', used: 0, maxDay: 'x' });
  assert.strictEqual(E.sanitizeLedger({ used: '3' }).used, 3);
  assert.strictEqual(E.sanitizeLedger({ used: 'abc' }).used, 0);
});

// ======================================================================================
// D. GERBANG SESI HARIAN
// ======================================================================================

test('gratis mendapat tepat 3 sesi terukur per hari', () => {
  assert.strictEqual(E.LIMITS.free.dailyAdaptiveSessions, 3);
  let book = { day: '2026-09-20', used: 0, maxDay: '2026-09-20' };
  const remaining = [];
  for (let i = 0; i < 3; i++) {
    const g = E.sessionGate({ plan: E.PLANS.FREE, ledger: book, dayKey: '2026-09-20' });
    assert.strictEqual(g.allowed, true, 'sesi ke-' + (i + 1) + ' harus boleh');
    remaining.push(g.remaining);
    book = E.recordSession(book, '2026-09-20');
  }
  assert.deepStrictEqual(remaining, [3, 2, 1]);
  const closed = E.sessionGate({ plan: E.PLANS.FREE, ledger: book, dayKey: '2026-09-20' });
  assert.strictEqual(closed.allowed, false);
  assert.strictEqual(closed.copyKey, 'akses.sesi.habis');
});

test('peringatan hanya muncul pada sesi terakhir, bukan sebagai hitungan mundur', () => {
  const keyAt = (used) => E.sessionGate({
    plan: E.PLANS.FREE, ledger: { day: 'd', used: used, maxDay: 'd' }, dayKey: 'd'
  }).copyKey;
  assert.strictEqual(keyAt(0), '', 'sesi pertama tidak menakuti');
  assert.strictEqual(keyAt(1), '', 'sesi kedua juga tidak');
  assert.strictEqual(keyAt(2), 'akses.sesi.terakhir');
});

test('pro dan sekolah tidak pernah dibatasi jumlah sesi', () => {
  for (const plan of [E.PLANS.PRO, E.PLANS.SCHOOL]) {
    const g = E.sessionGate({ plan: plan, ledger: { day: 'd', used: 9999, maxDay: 'd' }, dayKey: 'd' });
    assert.strictEqual(g.allowed, true, plan + ' harus tanpa batas');
    assert.strictEqual(g.limit, null);
    assert.strictEqual(g.remaining, null);
  }
});

// ======================================================================================
// E. SERANGAN 3 — tugas guru dan ujian tidak boleh terhalang jatah konsumen
// ======================================================================================

test('tugas guru, ujian, penempatan, dan ulangan tidak pernah dihitung', () => {
  const habis = { day: 'd', used: 99, maxDay: 'd' };
  for (const type of ['assignment', 'classroom', 'exam', 'placement', 'review']) {
    const g = E.sessionGate({ plan: E.PLANS.FREE, ledger: habis, dayKey: 'd', session: { type: type } });
    assert.strictEqual(g.allowed, true, type + ' harus tetap terbuka walau jatah habis');
    assert.strictEqual(g.metered, false, type + ' harus ditandai tidak terukur');
  }
});

test('latihan biasa tetap terukur (kalau tidak, batasnya tidak ada artinya)', () => {
  const g = E.sessionGate({
    plan: E.PLANS.FREE, ledger: { day: 'd', used: 99, maxDay: 'd' }, dayKey: 'd', session: { type: 'practice' }
  });
  assert.strictEqual(g.allowed, false);
  assert.strictEqual(g.metered, true);
});

test('jenis sesi tak dikenal dihitung sebagai latihan (aman ke arah yang benar)', () => {
  assert.strictEqual(E.countsAsAdaptive({ type: 'sesuatu-yang-baru' }), true);
  assert.strictEqual(E.countsAsAdaptive({}), true, 'default = practice');
});

test('countAdaptiveOn hanya menghitung hari yang diminta dan melewati jenis tak terukur', () => {
  const sessions = [
    { type: 'practice', day: '2026-09-20' },
    { type: 'practice', day: '2026-09-20' },
    { type: 'assignment', day: '2026-09-20' },
    { type: 'practice', day: '2026-09-19' }
  ];
  assert.strictEqual(E.countAdaptiveOn(sessions, '2026-09-20', (s) => s.day), 2);
});

test('countAdaptiveOn tidak pernah melempar walau dayKeyOf rusak', () => {
  const boom = () => { throw new Error('rusak'); };
  assert.strictEqual(E.countAdaptiveOn([{ type: 'practice' }], 'd', boom), 0);
});

// ======================================================================================
// F. GERBANG LEVEL, SUARA, FITUR
// ======================================================================================

test('gratis membuka tepat A1 dan A2, tidak lebih', () => {
  const allowed = E.LEVELS.filter((l) => E.levelGate(l, { plan: E.PLANS.FREE }).allowed);
  assert.deepStrictEqual(allowed, ['A1', 'A2']);
});

test('pro dan sekolah membuka seluruh A1-C2', () => {
  for (const plan of [E.PLANS.PRO, E.PLANS.SCHOOL]) {
    const allowed = E.LEVELS.filter((l) => E.levelGate(l, { plan: plan }).allowed);
    assert.deepStrictEqual(allowed, E.LEVELS, plan + ' harus membuka semua level');
  }
});

test('level terkunci menunjuk Pro, bukan menuduh murid belum lulus ujian', () => {
  const g = E.levelGate('B1', { plan: E.PLANS.FREE });
  assert.strictEqual(g.requiredPlan, E.PLANS.PRO);
  assert.strictEqual(g.reason, 'level_requires_pro', 'sebab komersial, bukan sebab pedagogis');
  assert.strictEqual(g.copyKey, 'akses.level.terkunci');
});

test('level tak dikenal ditolak tanpa melempar', () => {
  assert.strictEqual(E.levelGate('D9', { plan: E.PLANS.PRO }).allowed, false);
  assert.strictEqual(E.levelGate('', { plan: E.PLANS.PRO }).reason, 'unknown_level');
});

test('suara neural hanya untuk pro dan sekolah; gratis tetap bersuara lewat jalur lain', () => {
  assert.strictEqual(E.voiceGate({ plan: E.PLANS.FREE }).allowed, false);
  assert.strictEqual(E.voiceGate({ plan: E.PLANS.PRO }).allowed, true);
  assert.strictEqual(E.voiceGate({ plan: E.PLANS.SCHOOL }).allowed, true);
});

test('ujian latihan dan sertifikat hanya untuk pro dan sekolah', () => {
  for (const f of ['examSim', 'certificate']) {
    assert.strictEqual(E.featureGate(f, { plan: E.PLANS.FREE }).allowed, false, f + ' gratis harus tertutup');
    assert.strictEqual(E.featureGate(f, { plan: E.PLANS.PRO }).allowed, true);
    assert.strictEqual(E.featureGate(f, { plan: E.PLANS.SCHOOL }).allowed, true);
  }
});

test('fitur tak dikenal ditolak, bukan dibuka (fail-closed)', () => {
  const g = E.featureGate('fitur-yang-belum-ada', { plan: E.PLANS.SCHOOL });
  assert.strictEqual(g.allowed, false);
  assert.strictEqual(g.reason, 'unknown_feature');
});

test('rencana tak dikenal diperlakukan sebagai gratis (fail-closed)', () => {
  assert.strictEqual(E.levelGate('C1', { plan: 'enterprise' }).allowed, false);
  assert.strictEqual(E.sessionGate({ plan: 'enterprise', ledger: { day: 'd', used: 3, maxDay: 'd' }, dayKey: 'd' }).allowed, false);
  assert.strictEqual(E.voiceGate({ plan: undefined }).allowed, false);
});

// ======================================================================================
// G. HARGA
// ======================================================================================

test('harga sesuai spesifikasi produk §5 dan disimpan sebagai bilangan bulat rupiah', () => {
  assert.strictEqual(E.PRICING.currency, 'IDR');
  assert.strictEqual(E.PRICING.pro.monthly, 29000);
  assert.strictEqual(E.PRICING.pro.yearly, 199000);
  assert.strictEqual(E.PRICING.school.perClassPerSemester, 500000);
  for (const v of [E.PRICING.pro.monthly, E.PRICING.pro.yearly, E.PRICING.school.perClassPerSemester]) {
    assert.ok(Number.isInteger(v), 'harga harus bilangan bulat, bukan string berformat');
  }
});

test('klaim hemat tahunan dihitung dari harga, bukan diketik', () => {
  const persen = E.yearlySavingPercent();
  assert.strictEqual(persen, Math.round((29000 * 12 - 199000) / (29000 * 12) * 100));
  assert.ok(persen > 0 && persen < 100, 'klaim hemat harus masuk akal: ' + persen);
});

// ======================================================================================
// H. SERANGAN 4 — naskah hilang di layar yang meminta uang
// ======================================================================================

/** Muat satu copy-map tanpa peramban, kembalikan objeknya. */
function loadCopy(file) {
  const map = {};
  const sandbox = { self: { FiezelI18n: { registerCopy: (loc, m) => Object.assign(map, m) } } };
  sandbox.self.self = sandbox.self;
  const src = fs.readFileSync(path.join(__fzRoot, 'features', 'i18n', file), 'utf8');
  require('vm').runInNewContext(src, sandbox);
  return map;
}

/** Kumpulkan setiap copyKey yang BISA dikeluarkan mesin, dari pemakaian nyata. */
function emittedCopyKeys() {
  const keys = new Set();
  const take = (r) => { if (r && r.copyKey) keys.add(r.copyKey); };
  const plans = [E.PLANS.FREE, E.PLANS.PRO, E.PLANS.SCHOOL, 'entah'];
  for (const plan of plans) {
    for (let used = 0; used <= 4; used++) {
      take(E.sessionGate({ plan: plan, ledger: { day: 'd', used: used, maxDay: 'd' }, dayKey: 'd' }));
    }
    for (const level of E.LEVELS) take(E.levelGate(level, { plan: plan }));
    take(E.voiceGate({ plan: plan }));
    for (const f of Object.keys(E.FEATURES)) take(E.featureGate(f, { plan: plan }));
  }
  return Array.from(keys).sort();
}

test('setiap copyKey yang dikeluarkan mesin punya .judul dan .pesan di copy-id DAN copy-th', () => {
  const id = loadCopy('copy-id-monetization.js');
  const th = loadCopy('copy-th-monetization.js');
  const emitted = emittedCopyKeys();
  assert.ok(emitted.length >= 5, 'gerbang harus benar-benar menemukan copyKey, bukan nol: ' + emitted.length);
  const hilang = [];
  for (const base of emitted) {
    for (const suffix of ['.judul', '.pesan']) {
      if (!Object.prototype.hasOwnProperty.call(id, base + suffix)) hilang.push('id ' + base + suffix);
      if (!Object.prototype.hasOwnProperty.call(th, base + suffix)) hilang.push('th ' + base + suffix);
    }
  }
  assert.deepStrictEqual(hilang, [], 'naskah hilang di layar yang meminta uang: ' + hilang.join(', '));
});

test('copy-id dan copy-th monetization punya kunci dan placeholder yang sama persis', () => {
  const id = loadCopy('copy-id-monetization.js');
  const th = loadCopy('copy-th-monetization.js');
  assert.deepStrictEqual(Object.keys(th).sort(), Object.keys(id).sort(), 'himpunan kunci harus identik');
  const ph = (s) => (String(s).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
  const beda = Object.keys(id).filter((k) => ph(id[k]) !== ph(th[k]));
  assert.deepStrictEqual(beda, [], 'placeholder berbeda antar locale: ' + beda.join(', '));
});

test('setiap nilai th benar-benar ber-aksara Thai', () => {
  const th = loadCopy('copy-th-monetization.js');
  const bukanThai = Object.keys(th).filter((k) => !/[฀-๿]/.test(th[k]));
  assert.deepStrictEqual(bukanThai, [], 'nilai th tanpa aksara Thai = layar campur bahasa: ' + bukanThai.join(', '));
});

test('naskah harga memakai placeholder, bukan angka yang diketik tangan', () => {
  for (const file of ['copy-id-monetization.js', 'copy-th-monetization.js']) {
    const map = loadCopy(file);
    for (const key of Object.keys(map)) {
      assert.ok(!/29[.,]?000|199[.,]?000|500[.,]?000/.test(map[key]),
        file + ' menuliskan harga langsung di kunci ' + key + '; harga hanya boleh lewat {harga}');
    }
  }
});

// ======================================================================================
// I. KEMURNIAN — mesin ini tidak boleh diam-diam membaca dunia
// ======================================================================================

test('modul tidak membaca penyimpanan, jaringan, atau jamnya sendiri', () => {
  const src = fs.readFileSync(path.join(__fzRoot, 'features', 'monetization', 'fiezel-entitlement.js'), 'utf8');
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const dilarang of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'Date.now', 'new Date']) {
    assert.ok(body.indexOf(dilarang) < 0,
      'mesin hak akses harus murni; ditemukan "' + dilarang + '" di luar komentar');
  }
});

test('modul tidak memuat satu pun kalimat yang dibaca murid', () => {
  const src = fs.readFileSync(path.join(__fzRoot, 'features', 'monetization', 'fiezel-entitlement.js'), 'utf8');
  const body = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  /* Kalimat murid selalu punya spasi DAN huruf; kode di sini hanya memakai string pendek
     tanpa spasi (kunci, nama rencana, kode alasan). Dua pengecualian sah: copyKey
     berawalan 'akses.' (itu kunci, bukan kalimat) dan direktif 'use strict' (itu perintah
     mesin JavaScript, tidak pernah sampai ke mata murid). */
  const SAH = ['use strict'];
  const strings = body.match(/'[^']*'/g) || [];
  const kalimat = strings
    .map((s) => s.slice(1, -1))
    .filter((s) => /\s/.test(s) && /[a-zA-Z]/.test(s) && s.indexOf('akses.') !== 0 && SAH.indexOf(s) < 0);
  assert.deepStrictEqual(kalimat, [], 'kalimat murid harus tinggal di copy-map: ' + kalimat.join(' | '));
});

test('advanceDay dan recordSession tidak menyunting argumennya', () => {
  const asli = { day: '2026-09-20', used: 2, maxDay: '2026-09-20' };
  const beku = JSON.stringify(asli);
  E.advanceDay(asli, '2026-09-21');
  E.recordSession(asli, '2026-09-20');
  assert.strictEqual(JSON.stringify(asli), beku, 'fungsi murni tidak boleh mengubah masukannya');
});

test('snapshot menjawab seluruh pertanyaan satu layar dalam satu panggilan', () => {
  const s = E.snapshot({
    now: NOW,
    school: { classCode: '8A-ENG', verifiedAt: NOW - DAY, licenseUntil: NOW + 90 * DAY },
    ledger: { day: '2026-09-20', used: 7, maxDay: '2026-09-20' },
    dayKey: '2026-09-20'
  });
  assert.strictEqual(s.plan, E.PLANS.SCHOOL);
  assert.strictEqual(s.session.allowed, true);
  assert.strictEqual(s.levels.C2, true);
  assert.strictEqual(s.neuralVoice, true);
  assert.strictEqual(s.certificate, true);
});

test('snapshot murid gratis jujur tentang apa yang masih terbuka', () => {
  const s = E.snapshot({ now: NOW, ledger: { day: 'd', used: 3, maxDay: 'd' }, dayKey: 'd' });
  assert.strictEqual(s.plan, E.PLANS.FREE);
  assert.strictEqual(s.session.allowed, false);
  assert.deepStrictEqual([s.levels.A1, s.levels.A2, s.levels.B1], [true, true, false]);
  assert.strictEqual(s.neuralVoice, false);
});

console.log(failures === 0 ? '\nSEMUA GERBANG HIJAU' : '\n' + failures + ' GERBANG MERAH');
process.exit(failures === 0 ? 0 : 1);
