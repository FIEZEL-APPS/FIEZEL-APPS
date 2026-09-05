/**
 * FIEZEL gate — Item Calibration (Braincore v3, C1).
 *
 * Elo sisi-item pada device SATU murid adalah tempat paling mudah untuk membuat
 * sistem yang terlihat belajar padahal sedang divergen: theta dan b_i diestimasi
 * dari pertandingan yang sama, jadi jawaban satu-arah yang panjang bisa menyeret
 * seluruh bank soal (risiko divergensi Sonnet §2.3, "Keeping Elo Alive"). Gate
 * ini karena itu tidak memeriksa "apakah rumusnya ada", melainkan:
 *
 *   - arah pergeseran BENAR (selalu benar -> item lebih mudah, dan sebaliknya);
 *   - pagar shrinkage MENAHAN serangan adversarial 500 jawaban satu arah;
 *   - delta TIDAK diterapkan sebelum bukti cukup (n >= 8);
 *   - kappa benar-benar mendiskon langkah, bukan sekadar diterima sebagai argumen;
 *   - compact membuang yang tak bernilai dan mempertahankan yang bernilai;
 *   - dan semuanya deterministik serta kebal state korup.
 *
 * JILID DUA (temuan simulator C6): shrinkage menghentikan divergensi tetapi
 * tidak menghentikan DRIFT SISTEMATIS — taksiran kemampuan yang tertinggal
 * membuat (y-p) bermean tidak nol dan ~86% item berlabel BENAR ikut terseret
 * ~0.22 satu arah (itemBiasRMSE keseluruhan naik meski mislabeled membaik).
 * Gate tambahan di bawah menguji obatnya: RECENTERING MEDIAN (drift bersama =
 * galat kemampuan, bukan properti item) + DEAD ZONE 0.3 (sisa deviasi kecil di
 * N=1 adalah derau; 0.3 dikalibrasi terhadap gate simulator — 0.2/0.25 masih
 * kalah baseline) — item mislabeled besar tetap terkoreksi, item sehat kembali
 * persis ke prior-nya.
 */
const assert = require('assert');
const fs = require('fs');
const cal = require('../features/brain/fiezel-item-calibration.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-27T12:00:00Z');
const DAY = 86400000;

/** Jalankan `count` jawaban identik pada satu item — deterministik, tanpa acak. */
function drill(state, count, ok, opts) {
  const o = opts || {};
  let s = state;
  for (let i = 0; i < count; i++) {
    s = cal.observe(s, {
      itemId: o.itemId || 'grammar:past_simple:apply_form:1',
      priorDifficulty: o.prior == null ? 3 : o.prior,
      ability: o.ability == null ? 3 : o.ability,
      ok: ok,
      kappa: o.kappa
    }, (o.startAt == null ? NOW : o.startAt) + i * 60000);
  }
  return s;
}

test('(a) murid selalu-benar -> delta turun (item lebih mudah dari prior)', () => {
  const s = drill(null, 20, true);
  const entry = s.items['grammar:past_simple:apply_form:1'];
  assert.ok(entry.delta < -0.05,
    'delta harus negatif setelah 20 jawaban benar, dapat ' + entry.delta);
  const eff = cal.effective(s, 'grammar:past_simple:apply_form:1', 3);
  assert.ok(eff.applied && eff.difficulty < 3,
    'kesulitan efektif harus di bawah prior untuk item yang selalu dijawab benar');
});

test('(a) murid selalu-salah -> delta naik (item lebih sulit dari prior)', () => {
  const s = drill(null, 20, false);
  const entry = s.items['grammar:past_simple:apply_form:1'];
  assert.ok(entry.delta > 0.05,
    'delta harus positif setelah 20 jawaban salah, dapat ' + entry.delta);
  const eff = cal.effective(s, 'grammar:past_simple:apply_form:1', 3);
  assert.ok(eff.applied && eff.difficulty > 3,
    'kesulitan efektif harus di atas prior untuk item yang selalu dijawab salah');
});

test('(b) ADVERSARIAL: 500 jawaban satu arah -> |delta| tetap <= 0.6', () => {
  // Skenario divergensi persis dari catatan risiko: murid satu-arah yang sangat
  // panjang tidak boleh menyeret item melewati pagar shrinkage dari prior.
  const sBenar = drill(null, 500, true);
  const sSalah = drill(null, 500, false);
  const dBenar = sBenar.items['grammar:past_simple:apply_form:1'].delta;
  const dSalah = sSalah.items['grammar:past_simple:apply_form:1'].delta;
  assert.ok(Math.abs(dBenar) <= 0.6 + 1e-12, '500x benar menembus pagar: ' + dBenar);
  assert.ok(Math.abs(dSalah) <= 0.6 + 1e-12, '500x salah menembus pagar: ' + dSalah);
  // Pagar harus benar-benar bekerja: skenario seekstrem ini memang harus
  // menyentuh batas, bukan berhenti jauh di bawahnya karena langkah mengecil.
  assert.ok(Math.abs(dBenar) > 0.55, 'skenario ekstrem seharusnya mendekati batas: ' + dBenar);
  const eff = cal.effective(sBenar, 'grammar:past_simple:apply_form:1', 3);
  assert.ok(eff.difficulty >= 3 - 0.6 - 1e-12,
    'kesulitan efektif tidak boleh lebih dari 0.6 di bawah prior');
});

test('(c) n=7 -> applied:false (prior apa adanya); n=8 -> applied:true', () => {
  const s7 = drill(null, 7, true);
  const e7 = cal.effective(s7, 'grammar:past_simple:apply_form:1', 3);
  assert.strictEqual(e7.applied, false, 'n=7 belum boleh menerapkan delta');
  assert.strictEqual(e7.difficulty, 3, 'di bawah gate, prior dikembalikan APA ADANYA');
  assert.strictEqual(e7.n, 7);
  assert.strictEqual(e7.rationale, 'brain3_item_calibration_prior_only');

  const s8 = drill(s7, 1, true);
  const e8 = cal.effective(s8, 'grammar:past_simple:apply_form:1', 3);
  assert.strictEqual(e8.applied, true, 'n=8 harus menerapkan delta');
  assert.strictEqual(e8.n, 8);
  assert.ok(e8.difficulty < 3, 'delta negatif harus terbaca setelah gate terbuka');
  assert.strictEqual(e8.rationale, 'brain3_item_calibration_applied');

  // Item yang belum pernah dilihat: prior murni, n=0, tidak diterapkan.
  const e0 = cal.effective(s8, 'item_yang_belum_ada', 4.2);
  assert.deepStrictEqual(
    { difficulty: e0.difficulty, n: e0.n, applied: e0.applied },
    { difficulty: 4.2, n: 0, applied: false });
});

/** State literal untuk menguji effective() pada kohort buatan yang presisi. */
function stateDari(entries) {
  const items = {};
  for (const [id, n, delta] of entries) items[id] = { n, delta, lastAt: NOW };
  return { schema: cal.SCHEMA, items };
}

test('(g) RECENTERING: drift sistematis (semua delta ~+0.22) -> semua kembali prior', () => {
  // Persis temuan C6: murid membaik cepat, taksiran kemampuan tertinggal,
  // SEMUA item berlabel benar terseret searah. Drift bersama bukan properti
  // item -> setelah dikurangi median, semuanya masuk dead zone.
  const entries = [];
  for (let i = 0; i < 12; i++) entries.push(['item' + i, 10 + i, 0.22 + (i % 5) * 0.01]);
  const s = stateDari(entries);
  for (let i = 0; i < 12; i++) {
    const eff = cal.effective(s, 'item' + i, 3);
    assert.strictEqual(eff.applied, false,
      'item' + i + ' berlabel benar tidak boleh digeser oleh drift bersama');
    assert.strictEqual(eff.difficulty, 3, 'item' + i + ' harus kembali persis ke prior');
    assert.strictEqual(eff.rationale, 'brain3_item_calibration_deadzone');
  }
  const pusat = cal.recenter(s);
  assert.strictEqual(pusat.cohortSize, 12);
  assert.ok(Math.abs(pusat.median - 0.24) < 0.03, 'median harus ~drift, dapat ' + pusat.median);
});

test('(g) RECENTERING: item mislabeled besar tetap terkoreksi setelah recentering', () => {
  // 11 item sehat terseret drift +0.22; satu item benar-benar mislabeled
  // (delta +0.58 karena label prior terlalu mudah). Median ~0.22 -> koreksi
  // mislabeled ~+0.36 selamat, item sehat kembali ke prior.
  const entries = [];
  for (let i = 0; i < 11; i++) entries.push(['sehat' + i, 12, 0.22]);
  entries.push(['mislabeled', 15, 0.58]);
  entries.push(['mislabeled_bawah', 15, -0.45]); // arah sebaliknya: prior terlalu sulit
  const s = stateDari(entries);

  const atas = cal.effective(s, 'mislabeled', 3);
  assert.strictEqual(atas.applied, true, 'mislabeled harus tetap terkoreksi');
  assert.ok(Math.abs(atas.difficulty - 3.36) < 0.01,
    'koreksi terpusat harus ~+0.36, dapat ' + (atas.difficulty - 3));

  const bawah = cal.effective(s, 'mislabeled_bawah', 3);
  assert.strictEqual(bawah.applied, true);
  assert.ok(bawah.difficulty < 3 - cal.DEAD_ZONE,
    'mislabeled arah bawah harus terkoreksi turun, dapat ' + bawah.difficulty);
  assert.ok(bawah.difficulty >= 3 - cal.SHRINKAGE - 1e-12,
    'koreksi terpusat tetap terpagar shrinkage dari prior');

  const sehat = cal.effective(s, 'sehat0', 3);
  assert.strictEqual(sehat.applied, false, 'item sehat harus kembali ke prior');
  assert.strictEqual(sehat.difficulty, 3);
});

test('(g) DEAD ZONE bekerja dua arah, batasnya tepat DEAD_ZONE', () => {
  // Kohort besar bermedian 0 supaya delta terpusat = delta mentah.
  const dz = cal.DEAD_ZONE;
  const entries = [];
  for (let i = 0; i < 9; i++) entries.push(['nol' + i, 10, 0]);
  entries.push(['plus_dalam', 10, dz - 0.01], ['minus_dalam', 10, -(dz - 0.01)],
    ['plus_luar', 10, dz + 0.01], ['minus_luar', 10, -(dz + 0.01)]);
  const s = stateDari(entries);
  const pd = cal.effective(s, 'plus_dalam', 3);
  const md = cal.effective(s, 'minus_dalam', 3);
  assert.strictEqual(pd.applied, false); assert.strictEqual(pd.difficulty, 3);
  assert.strictEqual(md.applied, false); assert.strictEqual(md.difficulty, 3);
  assert.strictEqual(pd.rationale, 'brain3_item_calibration_deadzone');
  assert.strictEqual(md.rationale, 'brain3_item_calibration_deadzone');
  const pl = cal.effective(s, 'plus_luar', 3);
  const ml = cal.effective(s, 'minus_luar', 3);
  assert.strictEqual(pl.applied, true); assert.ok(pl.difficulty > 3);
  assert.strictEqual(ml.applied, true); assert.ok(ml.difficulty < 3);
});

test('(g) kohort tunggal: recentering tidak membatalkan dirinya sendiri', () => {
  // Satu item ber-n>=8 di seluruh state (skenario probe/feature-detect C6):
  // median = delta sendiri akan selalu menghasilkan nol — karena itu kohort < 2
  // memakai delta apa adanya.
  const s = stateDari([['tunggal', 12, 0.5]]);
  const eff = cal.effective(s, 'tunggal', 3);
  assert.strictEqual(eff.applied, true, 'kohort tunggal tetap boleh koreksi');
  assert.ok(Math.abs(eff.difficulty - 3.5) < 1e-9);
  // recenter() tetap jujur melaporkan kohortnya.
  const pusat = cal.recenter(s);
  assert.strictEqual(pusat.cohortSize, 1);
  assert.strictEqual(pusat.median, 0.5);
  // recenter pada state korup: kohort kosong, median 0, tidak melempar.
  const korup = cal.recenter('sampah');
  assert.deepStrictEqual({ median: korup.median, cohortSize: korup.cohortSize },
    { median: 0, cohortSize: 0 });
});

test('(d) kappa 0.3 memperkecil langkah ~3x', () => {
  // Satu langkah dari state kosong: rasio delta harus 1/0.3 persis, karena
  // kappa mengalikan langkah secara linier. Toleransi longgar utk pembulatan.
  const sPenuh = drill(null, 1, false, { kappa: 1 });
  const sDiskon = drill(null, 1, false, { kappa: 0.3 });
  const dPenuh = sPenuh.items['grammar:past_simple:apply_form:1'].delta;
  const dDiskon = sDiskon.items['grammar:past_simple:apply_form:1'].delta;
  assert.ok(dPenuh > 0 && dDiskon > 0, 'kedua langkah harus searah (salah -> naik)');
  const rasio = dPenuh / dDiskon;
  assert.ok(rasio > 3.2 && rasio < 3.5,
    'rasio langkah kappa=1 vs kappa=0.3 harus ~3.33, dapat ' + rasio);
  // kappa=0 berarti bukti tanpa kredibilitas: delta tidak bergerak sama sekali,
  // tetapi n tetap dihitung (item memang tersaji).
  const sNol = drill(null, 1, false, { kappa: 0 });
  assert.strictEqual(sNol.items['grammar:past_simple:apply_form:1'].delta, 0);
  assert.strictEqual(sNol.items['grammar:past_simple:apply_form:1'].n, 1);
});

test('(e) compact memangkas entri tipis-dan-basi, mempertahankan yang aktif', () => {
  let s = null;
  // Tipis (n=2) dan basi (100 hari): layak dibuang.
  s = drill(s, 2, true, { itemId: 'tipis_basi', startAt: NOW - 100 * DAY });
  // Tipis (n=2) tapi baru disentuh kemarin: dipertahankan.
  s = drill(s, 2, true, { itemId: 'tipis_segar', startAt: NOW - 1 * DAY });
  // Bukti bermakna (n=10) meski basi 200 hari: pengetahuan, dipertahankan.
  s = drill(s, 10, false, { itemId: 'padat_basi', startAt: NOW - 200 * DAY });
  // Persis di ambang: n=2, idle TEPAT 90 hari -> dibuang (>= 90 hari).
  s = drill(s, 1, true, { itemId: 'tepat_ambang', startAt: NOW - 90 * DAY });
  // n=3 basi: di ambang bukti minimum -> dipertahankan (n<3 syaratnya).
  s = drill(s, 3, true, { itemId: 'ambang_bukti', startAt: NOW - 200 * DAY });

  const c = cal.compact(s, NOW);
  assert.ok(!c.items['tipis_basi'], 'n<3 dan idle 100 hari harus dipangkas');
  assert.ok(!c.items['tepat_ambang'], 'n<3 dan idle tepat 90 hari harus dipangkas');
  assert.ok(c.items['tipis_segar'], 'entri segar tidak boleh dipangkas meski tipis');
  assert.ok(c.items['padat_basi'], 'entri dengan n>=3 tidak boleh dipangkas meski basi');
  assert.ok(c.items['ambang_bukti'], 'n=3 bukan n<3 - harus dipertahankan');
  assert.strictEqual(c.schema, cal.SCHEMA);
  // compact tidak mengubah isi entri yang dipertahankan.
  assert.deepStrictEqual(c.items['padat_basi'], s.items['padat_basi']);
});

test('(f) determinisme: masukan sama -> state identik byte-per-byte', () => {
  const a = JSON.stringify(drill(drill(null, 5, true), 5, false, { kappa: 0.7 }));
  const b = JSON.stringify(drill(drill(null, 5, true), 5, false, { kappa: 0.7 }));
  assert.strictEqual(a, b, 'dua jalankan identik harus menghasilkan state identik');
});

test('(f) kemurnian: observe/compact tidak memutasi state masukan', () => {
  const s1 = drill(null, 3, true);
  const beku = JSON.stringify(s1);
  cal.observe(s1, { itemId: 'x', priorDifficulty: 2, ability: 3, ok: false }, NOW);
  cal.effective(s1, 'grammar:past_simple:apply_form:1', 3);
  cal.compact(s1, NOW + 400 * DAY);
  assert.strictEqual(JSON.stringify(s1), beku, 'state masukan berubah - modul tidak murni');
});

test('(f) korup aman: state/bukti rusak tidak melempar dan tidak bocor jadi keputusan liar', () => {
  // State bukan objek / schema asing -> diperlakukan kosong.
  for (const rusak of [null, undefined, 'sampah', 42, [], { schema: 'lain' }]) {
    const eff = cal.effective(rusak, 'apa_saja', 3);
    assert.deepStrictEqual(
      { difficulty: eff.difficulty, n: eff.n, applied: eff.applied },
      { difficulty: 3, n: 0, applied: false });
    const s = cal.observe(rusak, { itemId: 'a', priorDifficulty: 3, ability: 3, ok: true }, NOW);
    assert.strictEqual(s.schema, cal.SCHEMA);
    assert.strictEqual(s.items['a'].n, 1);
  }
  // Entri dengan angka rusak -> disembuhkan ke dalam kontrak, delta tetap terpagar.
  const korup = {
    schema: cal.SCHEMA,
    items: {
      liar: { n: 'NaN', delta: 99, lastAt: 'kemarin' },
      minus: { n: -5, delta: -99, lastAt: NOW },
      kosong: 'bukan objek'
    }
  };
  const sembuh = cal.observe(korup, { itemId: 'liar', priorDifficulty: 3, ability: 3, ok: true }, NOW);
  assert.ok(Math.abs(sembuh.items['liar'].delta) <= 0.6 + 1e-12,
    'delta korup 99 harus terpagar sebelum dipakai');
  assert.ok(sembuh.items['liar'].n >= 1);
  assert.ok(Math.abs(sembuh.items['minus'].delta) <= 0.6);
  assert.strictEqual(sembuh.items['kosong'].n, 0);
  const effKorup = cal.effective(korup, 'liar', 3);
  assert.ok(Math.abs(effKorup.difficulty - 3) <= 0.6 + 1e-12,
    'effective pada state korup tidak boleh keluar pagar dari prior');
  // Bukti rusak -> diabaikan, state tetap sehat.
  let s = drill(null, 2, true);
  const sebelum = JSON.stringify(s);
  for (const bukti of [null, {}, { itemId: '' }, { itemId: 'a' },
    { itemId: 'a', priorDifficulty: NaN, ability: 3, ok: true },
    { itemId: 'a', priorDifficulty: 3, ability: Infinity, ok: true },
    { itemId: 'a', priorDifficulty: 3, ability: 3, ok: 'ya' }]) {
    s = cal.observe(s, bukti, NOW);
  }
  assert.strictEqual(JSON.stringify(s), sebelum, 'bukti rusak tidak boleh mengubah apa pun');
});

test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam internal', () => {
  const source = fs.readFileSync('./features/brain/fiezel-item-calibration.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest',
    'window.', 'Math.random', 'Date.now']) {
    assert.ok(!source.includes(forbidden),
      'lapisan kalibrasi menyentuh ' + forbidden + ' - itu membuatnya tidak bisa diuji sebagai angka');
  }
});

console.log('');
if (failures) { console.error('FIEZEL Item Calibration: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Item Calibration: PASS');
