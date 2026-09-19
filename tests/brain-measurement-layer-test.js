const __fzRoot = require('path').join(__dirname, '..');
/**
 * FIEZEL gate — lapisan UKUR Braincore (m025-341, Langkah 1 roadmap otonomi).
 *
 * Sebelum gelombang ini otak FIEZEL MEMUTUSKAN tanpa pernah MENGUKUR. Penjadwal probe
 * retensi sudah lama jalan di bktRecord(), tetapi jadwalnya tidak pernah dibaca siapa pun
 * kecuali panel diagnostik — jadi tidak satu pun lesson benar-benar diuji ulang, dan kata
 * 'mastery' tetap berarti "benar 5x berturut di satu sesi". learningMetrics menghitung
 * kalibrasi Brier sejak lama, lalu memajangnya dan berhenti di situ.
 *
 * Dua jalur baru yang diuji di sini:
 *   - retentionProbe  → probe jatuh tempo masuk kolam review; vonis 'rapuh' mencabut KLAIM
 *                       penguasaan (bukan akses);
 *   - learningMetrics → Brier Skill Score <= 0 menaikkan ambang bukti mastery BKT.
 *
 * KENAPA GATE INI MENJALANKAN, BUKAN MEMBACA. Wiring otoritas adalah kelas cacat yang
 * tidak bisa dilihat regex: fungsinya ada, namanya benar, dan tetap tidak mengubah apa pun
 * kalau satu syarat di dalamnya salah. Setiap assert memanggil fungsi app.js yang sungguhan
 * di dalam vm, di atas modul otak yang sungguhan.
 *
 * DUA PAGAR YANG PALING PENTING DI BERKAS INI, dan keduanya diuji DUA ARAH:
 *   P1. Vonis rapuh TIDAK PERNAH mengunci ulang lesson (klaim boleh ditarik, akses tidak).
 *   P2. Kalibrasi TIDAK PERNAH melonggarkan apa pun — hanya bisa memperketat.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const app = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');
const PostTest = require('../features/brain/fiezel-retention-probe.js');
const Metrics = require('../features/brain/fiezel-learning-metrics.js');
const BKT = require('../features/brain/fiezel-mastery-bkt.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

/** Sandbox minimal: hanya yang memang milik DOM/app, sisanya modul otak asli. */
function sandboxOf({ postTest = PostTest, metrics = Metrics, bkt = BKT, store = {}, state = {} } = {}) {
  const self = {};
  if (postTest) self.FiezelPostTest = postTest;
  if (metrics) self.FiezelLearningMetrics = metrics;
  if (bkt) self.FiezelMasteryBKT = bkt;
  const sb = {
    self, state,
    MASTERY_THRESHOLD: 80,
    GRAMMAR_UNLOCK_MASTERY: 70,
    GRAMMAR_ITEMS: [],
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    sideStateKey: (b) => b,
    RETENTION_PROBE_KEY: 'fiezel-post-test-v1',
    grammarCurriculumEntry: () => null,
    console,
    Date,
    JSON, Math, Number, String, Array, Object, Set, isFinite,
  };
  sb.globalThis = sb;
  return sb;
}

function run(names, sandbox, expr) {
  const blocks = names.map(n => {
    const b = sourceBlock(n);
    assert.ok(b, `fungsi ${n} tidak ditemukan di app.js`);
    return b;
  });
  vm.createContext(sandbox);
  vm.runInContext(blocks.join('\n'), sandbox, { timeout: 4000 });
  return vm.runInContext(expr, sandbox, { timeout: 4000 });
}

const DAY = 86400000;
const KEY = 'fiezel-post-test-v1';

/** State probe: satu lesson dengan tiga probe, offset relatif terhadap `now`. */
function probeState(lesson, offsetsMs, now) {
  return {
    schema: 'fiezel-post-test-v1', userSeed: 0,
    probes: { [lesson]: { masteredAt: now - 30 * DAY, probes: offsetsMs.map(o => ({ offsetDays: 3, jitterDays: 0, dueAt: now + o })) } },
  };
}

/** Riwayat ber-`predicted` untuk memaksa kalibrasi bagus / buruk secara deterministik. */
function historyFor(quality, now) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const ok = i % 2 === 0;
    const predicted = quality === 'buruk' ? (ok ? 0.1 : 0.9) : (ok ? 0.9 : 0.1);
    rows.push({ at: now - (20 - i) * DAY, ok, predicted, type: 'grammar', skill: 'l1', target: 'l1' });
  }
  for (let i = 0; i < 6; i++) {
    const ok = i % 2 === 1;
    const predicted = quality === 'buruk' ? (ok ? 0.1 : 0.9) : (ok ? 0.9 : 0.1);
    rows.push({ at: now - (14 - i) * DAY, ok, predicted, type: 'grammar', skill: 'l1', target: 'l1' });
  }
  return rows;
}

// =====================================================================================
// A. PENYAJI — probe jatuh tempo benar-benar sampai ke kolam review
// =====================================================================================

test('A1 probe yang JATUH TEMPO menandai lessonnya', () => {
  const now = Date.now();
  const store = { [KEY]: JSON.stringify(probeState('l1', [-DAY], now)) };
  const sb = sandboxOf({ store });
  const out = run(['retentionProbeAvailable', 'retentionProbeRead', 'retentionProbeDueLessons'],
    sb, 'JSON.stringify([...retentionProbeDueLessons(' + now + ')])');
  assert.deepStrictEqual(JSON.parse(out), ['l1'], 'probe lewat jatuh tempo harus muncul');
});

test('A2 probe yang BELUM jatuh tempo tidak menandai apa pun', () => {
  const now = Date.now();
  const store = { [KEY]: JSON.stringify(probeState('l1', [+3 * DAY], now)) };
  const sb = sandboxOf({ store });
  const out = run(['retentionProbeAvailable', 'retentionProbeRead', 'retentionProbeDueLessons'],
    sb, 'JSON.stringify([...retentionProbeDueLessons(' + now + ')])');
  assert.deepStrictEqual(JSON.parse(out), [], 'probe masa depan tidak boleh disajikan');
});

test('A3 FAIL-QUIET: tanpa FiezelPostTest, himpunan jatuh tempo kosong', () => {
  const now = Date.now();
  const store = { [KEY]: JSON.stringify(probeState('l1', [-DAY], now)) };
  const sb = sandboxOf({ postTest: null, store });
  const out = run(['retentionProbeAvailable', 'retentionProbeRead', 'retentionProbeDueLessons'],
    sb, 'JSON.stringify([...retentionProbeDueLessons(' + now + ')])');
  assert.deepStrictEqual(JSON.parse(out), [], 'modul absen = kolam persis seperti sebelumnya');
});

test('A4 state rusak tidak melempar dan tidak menandai apa pun', () => {
  const now = Date.now();
  const sb = sandboxOf({ store: { [KEY]: '{bukan json' } });
  const out = run(['retentionProbeAvailable', 'retentionProbeRead', 'retentionProbeDueLessons'],
    sb, 'JSON.stringify([...retentionProbeDueLessons(' + now + ')])');
  assert.deepStrictEqual(JSON.parse(out), [], 'state korup harus senyap');
});

test('A5 kolam review BENAR-BENAR membaca kedua himpunan (wiring buildAdaptivePool)', () => {
  const src = sourceBlock('buildAdaptivePool');
  assert.ok(src, 'buildAdaptivePool tidak ditemukan');
  assert.ok(/retentionProbeDueLessons\s*\(/.test(src), 'kolam tidak memanggil retentionProbeDueLessons');
  assert.ok(/retentionFragileLessons\s*\(/.test(src), 'kolam tidak memanggil retentionFragileLessons');
  assert.ok(/probeHit/.test(src) && /due=.*probeHit/.test(src),
    'hasil probe tidak ikut menentukan `due` — jadwalnya dihitung lalu dibuang');
});

// =====================================================================================
// B. KEWENANGAN RAPUH — klaim ditarik, akses TIDAK (pagar P1)
// =====================================================================================

test('B1 lesson RAPUH kehilangan klaim penguasaannya di tampilan', () => {
  const sb = sandboxOf({ state: { grammar: { l1: { mastery: 95 } } } });
  const out = run(['grammarMastery', 'grammarMasteryShown'], sb,
    'grammarMasteryShown("l1", new Set(["l1"]))');
  assert.ok(out < 80, 'penguasaan lesson rapuh harus turun di bawah ambang, dapat ' + out);
});

test('B2 lesson SEHAT tidak tersentuh sama sekali', () => {
  const sb = sandboxOf({ state: { grammar: { l1: { mastery: 95 } } } });
  const out = run(['grammarMastery', 'grammarMasteryShown'], sb,
    'grammarMasteryShown("l1", new Set(["lain"]))');
  assert.strictEqual(out, 95, 'lesson tanpa vonis rapuh harus identik dengan sebelumnya');
});

test('B3 PAGAR P1: vonis rapuh TIDAK mengunci ulang lesson', () => {
  // Prasyarat l1 sudah dikuasai penuh. Kalau vonis rapuh sampai bocor ke jalur unlock,
  // l2 akan terkunci kembali — dan murid kehilangan lesson yang kemarin terbuka.
  const sb = sandboxOf({ state: { grammar: { l1: { mastery: 95 }, l2: { mastery: 10 } } } });
  sb.GRAMMAR_ITEMS = [{ skill: 'l2', prerequisites: ['l1'] }];
  sb.grammarCurriculumEntry = (k) => (k === 'l2' ? { skill: 'l2', prerequisites: ['l1'] } : null);
  const res = run(['grammarMastery', 'lessonUnlockState'], sb,
    'JSON.stringify(lessonUnlockState("l2", state, new Set()))');
  assert.strictEqual(JSON.parse(res).locked, false, 'prasyarat terpenuhi harus tetap terbuka');
  // Jalur unlock memakai grammarMastery MENTAH, bukan yang sudah didiskon.
  const unlockSrc = sourceBlock('lessonUnlockState');
  assert.ok(!/grammarMasteryShown/.test(unlockSrc),
    'lessonUnlockState memakai nilai terdiskon — ini akan MENGUNCI ULANG lesson');
});

test('B4 FAIL-QUIET: himpunan rapuh kosong = tampilan identik', () => {
  const sb = sandboxOf({ state: { grammar: { l1: { mastery: 95 } } } });
  const a = run(['grammarMastery', 'grammarMasteryShown'], sb, 'grammarMasteryShown("l1", null)');
  assert.strictEqual(a, 95, 'tanpa vonis apa pun, nilainya mentah');
});

// =====================================================================================
// C. KALIBRASI — otak menilai ramalannya, lalu memperketat (pagar P2)
// =====================================================================================

test('C1 kalibrasi BURUK (Brier Skill Score <= 0) menaikkan ambang bukti', () => {
  const now = Date.now();
  const sb = sandboxOf({ state: { history: historyFor('buruk', now) } });
  const bump = run(['brierEvidenceBump'], sb, 'brierEvidenceBump(' + now + ')');
  assert.ok(bump > 0, 'kalibrasi yang kalah dari tebakan base-rate harus memperketat, dapat ' + bump);
});

test('C2 kalibrasi BAIK tidak mengubah apa pun', () => {
  const now = Date.now();
  const sb = sandboxOf({ state: { history: historyFor('baik', now) } });
  const bump = run(['brierEvidenceBump'], sb, 'brierEvidenceBump(' + now + ')');
  assert.strictEqual(bump, 0, 'model yang kalibrasinya sehat tidak boleh menambah tuntutan');
});

test('C3 FAIL-QUIET: riwayat tipis (< brierMinTotal) = nol perubahan', () => {
  const now = Date.now();
  const sb = sandboxOf({ state: { history: historyFor('buruk', now).slice(0, 4) } });
  const bump = run(['brierEvidenceBump'], sb, 'brierEvidenceBump(' + now + ')');
  assert.strictEqual(bump, 0, 'di bawah ambang bukti modul menahan diri — gate harus ikut diam');
});

test('C4 FAIL-QUIET: tanpa FiezelLearningMetrics = nol perubahan', () => {
  const now = Date.now();
  const sb = sandboxOf({ metrics: null, state: { history: historyFor('buruk', now) } });
  const bump = run(['brierEvidenceBump'], sb, 'brierEvidenceBump(' + now + ')');
  assert.strictEqual(bump, 0, 'modul absen = perilaku lama');
});

test('C5 PAGAR P2: kembalian TIDAK PERNAH negatif — mustahil melonggarkan', () => {
  const now = Date.now();
  for (const q of ['buruk', 'baik']) {
    for (const n of [0, 3, 12]) {
      const sb = sandboxOf({ state: { history: historyFor(q, now).slice(0, n) } });
      const bump = run(['brierEvidenceBump'], sb, 'brierEvidenceBump(' + now + ')');
      assert.ok(bump >= 0, `bump negatif (${bump}) akan MELONGGARKAN gerbang — q=${q} n=${n}`);
    }
  }
});

// =====================================================================================
// D. AMBANG BUKTI TERPASANG di jalur otoritas unlock BKT
// =====================================================================================

/** BKT state dengan n percobaan benar beruntun untuk satu lesson. */
function bktWith(lesson, n) {
  let st = null;
  for (let i = 0; i < n; i++) st = BKT.update(st, { lesson, correct: true, weight: 1 }, Date.now());
  return st;
}

test('D1 bump > 0 menahan lesson yang buktinya pas-pasan', () => {
  const now = Date.now();
  const bktState = bktWith('l1', 5);
  const lolosTanpaBump = BKT.masteryGate(bktState, 'l1');
  assert.ok(lolosTanpaBump, 'prasyarat uji: 5 bukti harus lolos gerbang BKT apa adanya');
  const sb = sandboxOf({ state: { history: historyFor('buruk', now) } });
  sb.bktRead = () => bktState;
  const out = run(['brierEvidenceBump', 'bktMasteredSkills'], sb,
    'JSON.stringify([...bktMasteredSkills(' + JSON.stringify(bktState) + ')])');
  assert.deepStrictEqual(JSON.parse(out), [], 'kalibrasi buruk harus menuntut bukti lebih dari minN');
});

test('D2 bump = 0 berperilaku PERSIS seperti sebelum kewenangan kalibrasi ada', () => {
  const now = Date.now();
  const bktState = bktWith('l1', 5);
  const sb = sandboxOf({ state: { history: historyFor('baik', now) } });
  sb.bktRead = () => bktState;
  const out = run(['brierEvidenceBump', 'bktMasteredSkills'], sb,
    'JSON.stringify([...bktMasteredSkills(' + JSON.stringify(bktState) + ')])');
  assert.deepStrictEqual(JSON.parse(out), ['l1'], 'tanpa vonis buruk, hasilnya harus identik masteryGate()');
});

test('D3 bukti berlimpah tetap lolos walau kalibrasi buruk (memperketat, bukan memblokir)', () => {
  const now = Date.now();
  const bktState = bktWith('l1', 12);
  const sb = sandboxOf({ state: { history: historyFor('buruk', now) } });
  sb.bktRead = () => bktState;
  const out = run(['brierEvidenceBump', 'bktMasteredSkills'], sb,
    'JSON.stringify([...bktMasteredSkills(' + JSON.stringify(bktState) + ')])');
  assert.deepStrictEqual(JSON.parse(out), ['l1'], 'ambang yang naik harus bisa dilampaui bukti yang cukup');
});

test('D4 PAGAR P2 (arah kedua): bump tidak pernah MENAMBAH lesson', () => {
  const now = Date.now();
  const bktState = bktWith('l1', 2); // jauh di bawah gerbang
  assert.ok(!BKT.masteryGate(bktState, 'l1'), 'prasyarat uji: 2 bukti tidak lolos');
  for (const q of ['buruk', 'baik']) {
    const sb = sandboxOf({ state: { history: historyFor(q, now) } });
    sb.bktRead = () => bktState;
    const out = run(['brierEvidenceBump', 'bktMasteredSkills'], sb,
      'JSON.stringify([...bktMasteredSkills(' + JSON.stringify(bktState) + ')])');
    assert.deepStrictEqual(JSON.parse(out), [], `kalibrasi (${q}) tidak boleh membuka lesson yang gagal gerbang`);
  }
});

console.log('');
console.log(failures
  ? `LapisanUkur: GAGAL (${failures})`
  : 'LapisanUkur: PASS — probe sampai ke murid, kalibrasi memperketat, dan dua pagarnya utuh');
process.exit(failures ? 1 : 0);
