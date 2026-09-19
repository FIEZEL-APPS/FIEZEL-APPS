const __fzRoot = require('path').join(__dirname, '..');
/**
 * FIEZEL gate — gelombang kedua otoritas Braincore (m025-337).
 *
 * Tiga modul yang selama ini MENGHITUNG tanpa pernah MEMUTUSKAN kini memutuskan:
 *   - confusionMap  → isi kartu AI Booster (pasangan lesson yang tertukar);
 *   - olmInsight    → blok nasihat kalibrasi di ringkasan akhir sesi;
 *   - bktUnlock     → frontier ZPD memilih simpul aktif jalur Grammar.
 *
 * KENAPA GATE INI MENJALANKAN, BUKAN MEMBACA. Wiring otoritas adalah persis kelas cacat
 * yang tidak bisa dilihat regex: fungsinya ADA, namanya benar, dan ia tetap tidak pernah
 * mengubah apa pun kalau satu syarat di dalamnya salah. Maka setiap assert di bawah
 * MEMANGGIL fungsi produksi yang sungguhan di dalam vm, di atas modul otak yang sungguhan
 * (require dari features/brain/), dengan stub hanya untuk yang memang milik DOM/app.
 *
 * DUA ARAH SELALU DIUJI. Untuk tiap modul: (1) dengan bukti yang layak ia benar-benar
 * mengubah keluaran, dan (2) tanpa modul / tanpa bukti / dengan vonis netral, keluarannya
 * PERSIS seperti sebelum m025-337. Arah kedua itu yang menjaga janji "modul absen =
 * perilaku lama", dan ia gagal lebih dulu kalau wiringnya bocor.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const app = fs.readFileSync(path.join(__fzRoot, 'app.js'), 'utf8');
const ConfusionMatrix = require('../features/brain/fiezel-confusion-matrix.js');
const OLM = require('../features/brain/fiezel-olm.js');
const BKT = require('../features/brain/fiezel-mastery-bkt.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Ambil satu fungsi utuh dari app.js (pola yang sama dengan grammar-unlock-test). */
function sourceBlock(name, source = app) {
  const start = source.search(new RegExp(`(?:function|async function)\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const next = source.slice(start + 10).search(/\n(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/);
  return source.slice(start, next < 0 ? source.length : start + 10 + next);
}

function ambang(nama) {
  const m = app.match(new RegExp(`const\\s+${nama}\\s*=\\s*([\\d.]+)`));
  assert.ok(m, `konstanta ${nama} tidak ditemukan di app.js`);
  return Number(m[1]);
}

/** Jalankan daftar fungsi app.js di vm dengan sandbox yang disediakan pemanggil. */
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

const NOW = Date.parse('2026-09-19T00:00:00Z');
const t = key => key; // penerjemah identitas: gate menguji KEPUTUSAN, bukan naskahnya.

// =====================================================================================
// 1) confusionMap → kartu AI Booster
// =====================================================================================

/** Matriks nyata, dibangun lewat record() modul asli — bukan objek karangan. */
function matriksKebingungan(pasangan, kali) {
  let m = null;
  for (let i = 0; i < kali; i++) {
    m = ConfusionMatrix.record(m, {
      activeLesson: pasangan[0], sourceLesson: pasangan[1],
      activeFamily: 'fa', sourceFamily: 'fb', picked: true, correct: false
    }, NOW);
  }
  return m;
}

function sandboxBooster(matrix, opts = {}) {
  return {
    self: opts.tanpaModul ? {} : { FiezelConfusionMatrix: ConfusionMatrix },
    confusionMatrixRead: () => matrix,
    friendlySkillName: s => (opts.namaKosong ? '' : 'Nama ' + s),
    esc: s => String(s),
    FiezelI18n: { t: (k, p) => (p ? k + ':' + JSON.stringify(p) : k) },
    aiBoosterTerlemah: () => opts.weak ?? null,
    AI_BOOSTER_MENIT: 10,
    CONFUSION_REMEDIATION_MIN_SHARE: ambang('CONFUSION_REMEDIATION_MIN_SHARE'),
    // Pintu yang sama dengan yang diketuk kartunya: level aktif + status kunci.
    GRAMMAR_ITEMS: [
      { skill: 'present_perfect', level: opts.levelLain ? 'B2' : 'A1' },
      { skill: 'simple_past', level: 'A1' },
      { skill: 'a', level: 'A1' }, { skill: 'b', level: 'A1' }, { skill: 'x', level: 'A1' },
      { skill: 's1', level: 'A1' }, { skill: 's2', level: 'A1' },
      { skill: 's3', level: 'A1' }, { skill: 's4', level: 'A1' }
    ],
    getActiveLevel: () => 'A1',
    state: { grammar: {} },
    bktMasteredSkills: () => new Set(),
    lessonUnlockState: () => ({ locked: !!opts.terkunci })
  };
}

test('confusionRemediationTarget menunjuk pasangan yang tertukar terarah', () => {
  const out = run(['confusionRemediationTarget'], sandboxBooster(matriksKebingungan(['present_perfect', 'simple_past'], 5)),
    'confusionRemediationTarget()');
  assert.ok(out, 'lima bukti terarah harus cukup untuk dianggap pola');
  assert.strictEqual(out.from, 'present_perfect');
  assert.strictEqual(out.to, 'simple_past');
  assert.ok(out.persen >= 34 && out.persen <= 100, 'persen=' + out.persen);
});

test('bukti tipis (< min modul) TIDAK menyalakan remediasi', () => {
  const out = run(['confusionRemediationTarget'], sandboxBooster(matriksKebingungan(['a', 'b'], 2)),
    'confusionRemediationTarget()');
  assert.strictEqual(out, null, 'dua kali salah adalah kebisingan, bukan pola');
});

test('kebingungan yang menyebar rata TIDAK menyalakan remediasi (share di bawah ambang)', () => {
  // Satu lesson aktif, empat lesson sumber berbeda, masing-masing 3x: tiap sel share 0,25.
  let m = null;
  for (const sumber of ['s1', 's2', 's3', 's4']) {
    for (let i = 0; i < 3; i++) {
      m = ConfusionMatrix.record(m, { activeLesson: 'x', sourceLesson: sumber, picked: true, correct: false }, NOW);
    }
  }
  const share = ConfusionMatrix.topConfusions(m)[0].share;
  assert.ok(share < ambang('CONFUSION_REMEDIATION_MIN_SHARE'), 'prasyarat skenario: share=' + share);
  assert.strictEqual(run(['confusionRemediationTarget'], sandboxBooster(m), 'confusionRemediationTarget()'), null,
    'salah ke mana-mana = belum paham lesson ini, bukan tertukar dengan satu lesson');
});

test('kartu AI Booster menyebut KEDUA lesson saat kebingungan layak', () => {
  const html = run(['confusionRemediationTarget', 'aiBoosterCard'],
    sandboxBooster(matriksKebingungan(['present_perfect', 'simple_past'], 6),
      { weak: { key: 'other_skill', view: 'grammar', akurasi: 40 } }),
    'aiBoosterCard()');
  assert.ok(html.includes('booster-tag-tertukar'), 'kartu harus memakai naskah pasangan tertukar');
  assert.ok(html.includes('Nama present_perfect'), 'lesson yang aturannya tergeser harus disebut');
  assert.ok(html.includes('simple_past'), 'lesson lawan harus ikut disebut — itu inti kartunya');
  assert.ok(html.includes("openGrammarLesson('present_perfect')"), 'kartu harus menautkan ke lesson yang perlu dilatih');
});

test('tanpa bukti kebingungan, kartu AI Booster PERSIS seperti sebelum m025-337', () => {
  const weak = { key: 'other_skill', view: 'grammar', akurasi: 40 };
  const html = run(['confusionRemediationTarget', 'aiBoosterCard'], sandboxBooster(null, { weak }), 'aiBoosterCard()');
  assert.ok(html.includes('latihan.booster-sub'), 'harus jatuh ke kartu akurasi-mentah yang lama');
  assert.ok(!html.includes('booster-tag-tertukar'));
  assert.ok(html.includes("go('grammar')"), 'jalur lama menautkan ke view, bukan lesson');
});

test('pasangan di LEVEL LAIN tidak dijadikan kartu (ketukannya akan ditolak pintunya)', () => {
  const out = run(['confusionRemediationTarget'],
    sandboxBooster(matriksKebingungan(['present_perfect', 'simple_past'], 6), { levelLain: true }),
    'confusionRemediationTarget()');
  assert.strictEqual(out, null, 'kartu yang ketukannya hanya memunculkan toast penolakan = kartu yang merugikan');
});

test('pasangan yang lessonnya masih TERKUNCI prasyarat juga tidak dijadikan kartu', () => {
  const out = run(['confusionRemediationTarget'],
    sandboxBooster(matriksKebingungan(['present_perfect', 'simple_past'], 6), { terkunci: true }),
    'confusionRemediationTarget()');
  assert.strictEqual(out, null, 'menyuruh murid melatih lesson yang belum boleh ia buka adalah jalan buntu');
});

test('modul confusion absen = kartu lama, tanpa melempar', () => {
  const weak = { key: 'x', view: 'grammar', akurasi: 30 };
  const html = run(['confusionRemediationTarget', 'aiBoosterCard'],
    sandboxBooster(matriksKebingungan(['a', 'b'], 9), { weak, tanpaModul: true }), 'aiBoosterCard()');
  assert.ok(html.includes('latihan.booster-sub'));
  assert.ok(!html.includes('booster-tag-tertukar'));
});

// =====================================================================================
// 2) olmInsight → nasihat kalibrasi di ringkasan sesi
// =====================================================================================

/** Riwayat percaya-diri yang benar-benar menghasilkan nada tertentu dari modul OLM. */
function kalibrasi(tone) {
  const rows = [];
  for (let i = 0; i < 40; i++) {
    // overconfidence: sangat yakin tapi sering salah. underconfidence: ragu tapi benar.
    if (tone === 'overconfidence') rows.push({ confidence: 0.9, correct: i % 5 === 0 });
    else if (tone === 'underconfidence') rows.push({ confidence: 0.3, correct: i % 5 !== 0 });
    else rows.push({ confidence: 0.8, correct: i % 5 !== 0 });
  }
  return rows;
}

function sandboxRingkas(tone, opts = {}) {
  return {
    self: opts.tanpaModul ? {} : { FiezelOLM: OLM },
    olmSummarizeInput: () => ({ bkt: null, ledger: null, memory: [], calibration: tone ? kalibrasi(tone) : [] }),
    uxOff: () => false,
    sessionMasteryGains: () => [],
    dueTomorrowCount: () => 0,
    esc: s => String(s),
    FiezelI18n: { t: (k, p) => (p ? k + ':' + JSON.stringify(p) : k) }
  };
}

test('nada overconfidence memunculkan blok kalibrasi di ringkasan sesi', () => {
  const sb = sandboxRingkas('overconfidence');
  const nudge = run(['olmCalibrationNudge'], sb, `olmCalibrationNudge(${NOW})`);
  assert.ok(nudge, 'bukti cukup + nada tidak netral harus menghasilkan nasihat');
  assert.strictEqual(nudge.tone, 'overconfidence');
  const html = run(['olmCalibrationNudge', 'sessionSummaryMarkup'], sandboxRingkas('overconfidence'),
    `sessionSummaryMarkup(null,${NOW})`);
  assert.ok(html.includes('summary-calib'), 'blok kalibrasi harus benar-benar dirender');
  assert.ok(html.includes('ringkas.kalibrasi'), 'blok harus berjudul naskah kalibrasi');
  assert.ok(html.includes('data-tone="overconfidence"'));
});

test('nada underconfidence juga memunculkan nasihat (dua arah, bukan cuma menegur)', () => {
  const nudge = run(['olmCalibrationNudge'], sandboxRingkas('underconfidence'), `olmCalibrationNudge(${NOW})`);
  assert.ok(nudge && nudge.tone === 'underconfidence', 'murid yang terlalu ragu juga berhak tahu');
});

test('kalibrasi sehat (netral) TIDAK menambah blok apa pun', () => {
  assert.strictEqual(run(['olmCalibrationNudge'], sandboxRingkas('netral'), `olmCalibrationNudge(${NOW})`), null,
    'nasihat tanpa masalah membuat nasihat berikutnya ikut diabaikan');
  const html = run(['olmCalibrationNudge', 'sessionSummaryMarkup'], sandboxRingkas('netral'),
    `sessionSummaryMarkup(null,${NOW})`);
  assert.ok(!html.includes('summary-calib'));
});

test('bukti kalibrasi kosong / modul OLM absen = ringkasan PERSIS seperti sebelumnya', () => {
  for (const sb of [sandboxRingkas(null), sandboxRingkas('overconfidence', { tanpaModul: true })]) {
    const html = run(['olmCalibrationNudge', 'sessionSummaryMarkup'], sb, `sessionSummaryMarkup(null,${NOW})`);
    assert.ok(!html.includes('summary-calib'));
    assert.ok(html.includes('ringkas.naik') && html.includes('ringkas.besok'), 'dua blok lama harus tetap ada');
  }
});

// =====================================================================================
// 3) bktUnlock → frontier ZPD memilih simpul aktif jalur Grammar
// =====================================================================================

const GRAF = {
  schema: 'fiezel-grammar-curriculum-v1',
  lessons: [
    { lessonId: 'akar', level: 'A1', sequence: 1, prerequisites: [] },
    { lessonId: 'cabang_a', level: 'A1', sequence: 2, prerequisites: [] },
    { lessonId: 'cabang_b', level: 'A1', sequence: 3, prerequisites: [] }
  ]
};

function sandboxZpd(opts = {}) {
  return {
    self: {
      FiezelMasteryBKT: opts.tanpaBkt ? undefined : BKT,
      FiezelCoreBrain: opts.tanpaBrain ? undefined : {
        // Peluang benar: hanya cabang_b yang berada di jendela ZPD [0,55..0,90].
        successProbability: () => 0.7
      }
    },
    coreBrainSnapshot: () => (opts.tanpaAbility ? {} : { ability: { ability: 3 } }),
    bktRead: () => opts.bkt ?? null,
    GRAMMAR_CURRICULUM: GRAF,
    grammarCurriculumEntry: id => GRAF.lessons.find(l => l.lessonId === id) || null,
    LEVELS: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  };
}

test('frontier memilih di antara simpul terbuka, bukan urutan kurikulum', () => {
  const pick = run(['zpdFrontierPick'], sandboxZpd(), `zpdFrontierPick(['cabang_b','cabang_a'])`);
  assert.ok(pick, 'frontier harus punya pilihan saat prasyarat kosong dan prediksi di jendela');
  assert.ok(['cabang_a', 'cabang_b'].includes(pick), 'pilihan harus salah satu kandidat: ' + pick);
});

test('frontier TIDAK PERNAH memilih lesson di luar daftar terbuka', () => {
  const pick = run(['zpdFrontierPick'], sandboxZpd(), `zpdFrontierPick(['cabang_b'])`);
  assert.strictEqual(pick, 'cabang_b', 'hanya satu kandidat terbuka -> hanya itu yang boleh terpilih');
  assert.strictEqual(run(['zpdFrontierPick'], sandboxZpd(), `zpdFrontierPick([])`), '',
    'tanpa kandidat terbuka, frontier tidak boleh mengarang simpul');
});

test('prediksi di luar jendela ZPD tidak memilih apa pun (terlalu mudah / terlalu sulit)', () => {
  for (const p of [0.97, 0.3]) {
    const sb = sandboxZpd();
    sb.self.FiezelCoreBrain = { successProbability: () => p };
    assert.strictEqual(run(['zpdFrontierPick'], sb, `zpdFrontierPick(['akar','cabang_a'])`), '',
      'p=' + p + ' berada di luar jendela 0,55-0,90');
  }
});

test('tanpa BKT / tanpa model kemampuan / state rusak = urutan kurikulum lama', () => {
  for (const opts of [{ tanpaBkt: true }, { tanpaBrain: true }, { tanpaAbility: true }]) {
    assert.strictEqual(run(['zpdFrontierPick'], sandboxZpd(opts), `zpdFrontierPick(['cabang_a','cabang_b'])`), '',
      'guard hilang: ' + JSON.stringify(opts));
  }
  const sb = sandboxZpd();
  sb.bktRead = () => { throw new Error('storage rusak'); };
  assert.strictEqual(run(['zpdFrontierPick'], sb, `zpdFrontierPick(['cabang_a'])`), '',
    'pembacaan yang melempar harus jatuh ke urutan lama, bukan menjatuhkan layar');
});

test('grammar() memakai zpdFrontierPick dan tetap punya cadangan urutan kurikulum', () => {
  const blok = sourceBlock('grammar');
  assert.ok(/zpdFrontierPick\s*\(/.test(blok), 'hub Grammar harus benar-benar memanggil frontier');
  assert.ok(/openRows\[0\]/.test(blok), 'cadangan urutan kurikulum wajib tetap ada');
  assert.ok(/openRows=rows\.filter\(r=>!r\.unlock\.locked/.test(blok),
    'kandidat tetap diturunkan dari lessonUnlockState — frontier tidak boleh membuka simpul terkunci');
});

console.log('');
if (failures) { console.error('Braincore authority wave 2: FAIL (' + failures + ')'); process.exit(1); }
console.log('Braincore authority wave 2: PASS');
