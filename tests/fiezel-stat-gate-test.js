/**
 * FIEZEL gate — Stat Gate: inferensi statistik pengganti gate promosi coin-flip.
 *
 * Council (model-council-claude_opus_5_0.md §3.2) membuktikan gate lama (8 attempt
 * per lengan, ambang 5pp) mempromosikan kandidat IDENTIK 53,9% dan kandidat 15pp
 * LEBIH BURUK 27,5%. Gate ini karena itu tidak menguji "apakah fungsinya ada",
 * melainkan APAKAH KESIMPULAN STATISTIKNYA BENAR pada skenario yang kebenarannya
 * kita kendalikan sendiri lewat Monte Carlo berseed (deterministik antar-run):
 *
 *   (a) kandidat identik p=0.75 vs p=0.75 pada n=8/arm -> 'hold' >= 95% dari
 *       10.000 trial (gate baru MENOLAK berjudi di rezim derau);
 *   (b) kandidat 15pp lebih buruk -> 'promote' <= 5% (diuji pada n=8 DAN n=200);
 *   (c) sanity Wilson CI dan MDE terhadap nilai buku teks (905/arm untuk 5pp pada
 *       baseline 0.80, alpha 0.05, power 0.80).
 *
 * Plus: gate tidak boleh jadi "selalu hold" — kandidat yang sungguh lebih baik
 * pada n memadai HARUS bisa promote; bootstrap wajib deterministik per seed;
 * masukan rusak wajib jatuh ke 'hold' (fail-safe); modul wajib murni.
 */
const assert = require('assert');
const fs = require('fs');
const sg = require('../features/brain/fiezel-stat-gate.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Binomial(n, p) deterministik dari rng berseed. */
function binomial(rng, n, p) {
  let s = 0;
  for (let i = 0; i < n; i++) if (rng() < p) s++;
  return s;
}

/** Jalankan Monte Carlo verdict: kembalikan tally {promote, hold, reject}. */
function monteCarlo(seed, trials, nPerArm, pControl, pCandidate) {
  const rng = sg.mulberry32(seed);
  const tally = { promote: 0, hold: 0, reject: 0 };
  for (let t = 0; t < trials; t++) {
    const v = sg.verdict({
      control: { successes: binomial(rng, nPerArm, pControl), n: nPerArm },
      candidate: { successes: binomial(rng, nPerArm, pCandidate), n: nPerArm }
    });
    tally[v.decision]++;
    if (t === 0) {
      assert.ok(/^brain3_stat_/.test(v.rationale), 'rationale wajib berprefix brain3_stat_: ' + v.rationale);
      assert.ok(typeof v.confidence === 'number' && v.confidence >= 0 && v.confidence <= 1,
        'confidence wajib angka 0..1');
    }
  }
  return tally;
}

// ===================================================================================
// (a) Monte Carlo regresi: kandidat identik pada n=8/arm -> hold >= 95% / 10.000 trial
// ===================================================================================
test('MC-a: kandidat identik (p=0.75 vs p=0.75, n=8/arm) -> hold >=95% dari 10.000 trial', () => {
  const t = monteCarlo(20260828, 10000, 8, 0.75, 0.75);
  const holdRate = t.hold / 10000;
  assert.ok(holdRate >= 0.95,
    'gate lama promote 53.9% di skenario ini; gate baru wajib hold >=95%, dapat ' +
    (holdRate * 100).toFixed(2) + '% (promote=' + t.promote + ', reject=' + t.reject + ')');
  assert.strictEqual(t.promote, 0,
    'pada n=8 tidak boleh ada satu pun promote (lantai fail-safe): dapat ' + t.promote);
});

// ===================================================================================
// (b) Monte Carlo regresi: kandidat 15pp lebih buruk tidak boleh promote > 5%
// ===================================================================================
test('MC-b1: kandidat 15pp lebih buruk (0.80 vs 0.65, n=8/arm) -> promote <=5% dari 10.000 trial', () => {
  const t = monteCarlo(424242, 10000, 8, 0.80, 0.65);
  const promoteRate = t.promote / 10000;
  assert.ok(promoteRate <= 0.05,
    'gate lama meloloskan kandidat berbahaya ini 27.5%; gate baru dapat ' + (promoteRate * 100).toFixed(2) + '%');
});

test('MC-b2: kandidat 15pp lebih buruk (0.80 vs 0.65, n=200/arm) -> promote <=5%, reject mayoritas', () => {
  // Di atas lantai minNPerArm keputusan diambil murni oleh CI — regresi 15pp yang
  // nyata harus tertangkap sebagai reject, bukan lolos lewat celah statistik.
  const t = monteCarlo(777, 4000, 200, 0.80, 0.65);
  const promoteRate = t.promote / 4000;
  assert.ok(promoteRate <= 0.05, 'promote rate=' + (promoteRate * 100).toFixed(2) + '% > 5%');
  assert.ok(t.reject / 4000 >= 0.5,
    'regresi 15pp pada n=200/arm seharusnya mayoritas reject; dapat ' + t.reject + '/4000');
});

// ===================================================================================
// Gate tidak boleh degenerasi jadi "selalu hold": kandidat lebih baik harus promote
// ===================================================================================
test('MC-power: kandidat 10pp lebih baik (0.80 vs 0.90, n=905/arm) -> promote >=90%', () => {
  const t = monteCarlo(1337, 1000, 905, 0.80, 0.90);
  assert.ok(t.promote / 1000 >= 0.90,
    'gate yang tidak pernah promote sama tidak bergunanya dengan gate coin-flip; promote=' + t.promote + '/1000');
});

// ===================================================================================
// (c) Sanity Wilson CI dan MDE terhadap nilai buku teks
// ===================================================================================
test('Wilson: 75/100 pada 95% -> CI ~(0.657, 0.825), nilai buku teks', () => {
  const w = sg.wilsonInterval(75, 100, 1.959964);
  assert.ok(Math.abs(w.p - 0.75) < 1e-12, 'p titik harus 0.75');
  assert.ok(Math.abs(w.lo - 0.6570) < 0.005, 'lo=' + w.lo.toFixed(4) + ' vs buku teks ~0.6570');
  assert.ok(Math.abs(w.hi - 0.8245) < 0.005, 'hi=' + w.hi.toFixed(4) + ' vs buku teks ~0.8245');
});

test('Wilson: batas ekstrem 0/8 dan 8/8 tetap di dalam [0,1] dan lebar (rezim derau)', () => {
  const lo = sg.wilsonInterval(0, 8);
  const hi = sg.wilsonInterval(8, 8);
  assert.ok(lo.lo === 0 && lo.hi > 0.3, '0/8: CI harus mulai di 0 dan tetap lebar');
  assert.ok(hi.hi === 1 && hi.lo < 0.7, '8/8: CI harus berakhir di 1 dan tetap lebar');
  // Temuan inti council: lebar-setengah ±~30pp pada n=8 — pastikan modul mengakuinya.
  const mid = sg.wilsonInterval(6, 8);
  assert.ok((mid.hi - mid.lo) / 2 > 0.20, 'lebar-setengah CI pada n=8 wajib > 20pp: ' + ((mid.hi - mid.lo) / 2).toFixed(3));
});

test('MDE/ukuran sampel: 5pp pada baseline 0.80 (alpha .05, power .80) -> ~905/arm', () => {
  const n = sg.sampleSizeForProportion(0.80, 0.05, 0.05, 0.80);
  assert.ok(Math.abs(n - 905) <= 15,
    'nilai buku teks (kalkulator Evan Miller, council §3.3) adalah 905; dapat ' + n);
  const mde = sg.mdeForProportion(0.80, 905, 0.05, 0.80);
  assert.ok(Math.abs(mde - 0.05) <= 0.003,
    'mde(0.80, n=905) harus ~0.05; dapat ' + mde.toFixed(5));
});

test('MDE: pada n=8/arm TIDAK ADA efek yang terdeteksi jujur (akar defek gate lama)', () => {
  assert.strictEqual(sg.mdeForProportion(0.75, 8, 0.05, 0.80), null,
    'mde(0.75, 8) wajib null — 8 attempt tidak cukup untuk efek apa pun');
});

test('normalQuantile: z(0.975) ~= 1.959964 (presisi rumus ukuran sampel)', () => {
  assert.ok(Math.abs(sg.normalQuantile(0.975) - 1.959964) < 1e-5);
  assert.ok(Math.abs(sg.normalQuantile(0.80) - 0.8416212) < 1e-5);
});

// ===================================================================================
// twoProportionTest: arah, CI, dan p-value masuk akal
// ===================================================================================
test('twoProportionTest: arah selisih = kandidat - kontrol, CI memuat selisih titik', () => {
  const r = sg.twoProportionTest({ successes: 160, n: 200 }, { successes: 130, n: 200 });
  assert.ok(Math.abs(r.diff - (-0.15)) < 1e-12, 'diff harus -0.15 (kandidat lebih buruk)');
  assert.ok(r.ciLo < r.diff && r.diff < r.ciHi, 'CI harus memeluk selisih titik');
  assert.ok(r.ciHi < 0, 'regresi 15pp pada n=200/arm harus signifikan (ciHi<0), dapat ciHi=' + r.ciHi.toFixed(4));
  assert.ok(r.pValue < 0.01, 'p-value harus kecil, dapat ' + r.pValue);
});

test('twoProportionTest: lengan identik -> CI memuat 0, p-value besar', () => {
  const r = sg.twoProportionTest({ successes: 6, n: 8 }, { successes: 6, n: 8 });
  assert.ok(r.ciLo < 0 && r.ciHi > 0, 'CI lengan identik wajib memuat 0');
  assert.ok(r.pValue > 0.5, 'p-value lengan identik wajib besar');
});

// ===================================================================================
// pairedBootstrap: deterministik per seed, fail-safe saat pasangan kurang
// ===================================================================================
test('pairedBootstrap: seed sama -> hasil byte-identik; seed beda -> boleh beda', () => {
  const pairs = [];
  const rng = sg.mulberry32(7);
  for (let i = 0; i < 40; i++) { const a = rng(); pairs.push([a, a + 0.05 + (rng() - 0.5) * 0.1]); }
  const r1 = sg.pairedBootstrap(pairs, 2000, 99);
  const r2 = sg.pairedBootstrap(pairs, 2000, 99);
  assert.deepStrictEqual(r1, r2, 'dua run seed sama wajib identik — determinisme adalah kontrak');
  const r3 = sg.pairedBootstrap(pairs, 2000, 100);
  assert.ok(r1.ciLo !== r3.ciLo || r1.ciHi !== r3.ciHi, 'seed beda seharusnya menggeser CI');
  assert.ok(r1.ciLo <= r1.meanDiff && r1.meanDiff <= r1.ciHi, 'meanDiff wajib di dalam CI');
  assert.ok(r1.ciLo > 0, 'efek +5pp pada 40 pasangan seharusnya CI positif; ciLo=' + r1.ciLo.toFixed(4));
});

test('pairedBootstrap: pasangan < 2 atau rusak -> {insufficient:true} (fail-safe)', () => {
  assert.strictEqual(sg.pairedBootstrap([], 2000, 1).insufficient, true);
  assert.strictEqual(sg.pairedBootstrap(null, 2000, 1).insufficient, true);
  assert.strictEqual(sg.pairedBootstrap([[0.5, NaN], ['x', 1]], 2000, 1).insufficient, true);
});

// ===================================================================================
// verdict: fail-safe ke hold pada semua masukan rusak / kurang
// ===================================================================================
test('verdict fail-safe: masukan rusak/kurang selalu hold dengan rationale brain3_stat_', () => {
  const cases = [
    undefined, null, 42, 'x', {},
    { control: { successes: 5, n: 8 } },                                        // kandidat hilang
    { control: { successes: 9, n: 8 }, candidate: { successes: 4, n: 8 } },     // successes > n
    { control: { successes: -1, n: 8 }, candidate: { successes: 4, n: 8 } },    // negatif
    { control: { successes: 2.5, n: 8 }, candidate: { successes: 4, n: 8 } },   // pecahan
    { control: { successes: 4, n: 0 }, candidate: { successes: 0, n: 0 } }      // n=0
  ];
  for (const ev of cases) {
    const v = sg.verdict(ev);
    assert.strictEqual(v.decision, 'hold', 'masukan rusak wajib hold: ' + JSON.stringify(ev));
    assert.ok(/^brain3_stat_/.test(v.rationale), 'rationale: ' + v.rationale);
    assert.ok(typeof v.confidence === 'number', 'confidence wajib angka');
  }
});

test('verdict: n=8/arm selalu hold_underpowered + menyertakan kebutuhan sampel', () => {
  const v = sg.verdict({ control: { successes: 6, n: 8 }, candidate: { successes: 8, n: 8 } });
  assert.strictEqual(v.decision, 'hold');
  assert.strictEqual(v.rationale, 'brain3_stat_hold_underpowered');
  assert.ok(v.needPerArm > 100, 'hold underpowered wajib memberi tahu kebutuhan n; dapat ' + v.needPerArm);
});

test('verdict: bukti kuat memutus dengan benar (promote saat non-inferior, reject saat pasti buruk)', () => {
  const promote = sg.verdict({ control: { successes: 720, n: 900 }, candidate: { successes: 790, n: 900 } });
  assert.strictEqual(promote.decision, 'promote');
  assert.strictEqual(promote.rationale, 'brain3_stat_promote_noninferior');
  assert.ok(promote.confidence > 0.9, 'kandidat +~8pp pada n=900 wajib confidence tinggi');

  const reject = sg.verdict({ control: { successes: 720, n: 900 }, candidate: { successes: 580, n: 900 } });
  assert.strictEqual(reject.decision, 'reject');
  assert.strictEqual(reject.rationale, 'brain3_stat_reject_significant_regression');
  assert.ok(reject.confidence > 0.9);

  // Kandidat PASTI sedikit lebih buruk (CI seluruhnya di (-margin, 0)) -> reject,
  // bukan promote: murid tidak boleh menerima konten yang terbukti lebih buruk.
  const worseCertain = sg.verdict({ control: { successes: 8000, n: 10000 }, candidate: { successes: 7700, n: 10000 } });
  assert.strictEqual(worseCertain.decision, 'reject',
    'regresi 3pp yang pasti (n=10k) wajib reject meski di dalam margin 5pp; dapat ' + worseCertain.decision);
});

// ===================================================================================
// Kemurnian modul — kontrak keras Braincore v3
// ===================================================================================
test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam/PRNG tanpa seed', () => {
  const source = fs.readFileSync('./features/brain/fiezel-stat-gate.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.', 'Date.now', 'Math.random']) {
    assert.ok(!source.includes(forbidden),
      'modul stat gate menyentuh ' + forbidden + ' — itu merusak auditabilitas statistiknya');
  }
});

test('UMD: global FiezelStatGate terpasang dan sama dengan ekspor modul', () => {
  assert.strictEqual(globalThis.FiezelStatGate, sg, 'wrapper UMD wajib memasang global');
});

console.log('');
if (failures) { console.error('StatGate: FAIL (' + failures + ')'); process.exit(1); }
console.log('StatGate: PASS');
