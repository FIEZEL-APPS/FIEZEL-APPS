/**
 * FIEZEL gate — Affect v3 (Braincore v3, modul A9).
 *
 * Council (opus C8) menyebut satu-satunya gate yang penting di sini: empat pola sintetis
 * (gaming, bosan, frustrasi, lelah) HARUS menghasilkan empat keputusan yang BERBEDA —
 * dan gate itu gagal hari ini karena hanya ada satu jalur (fatigue -> breathe).
 * Maka gate ini tidak memeriksa "apakah ada detektornya", melainkan:
 *
 *   - empat pola klasik terklasifikasi menjadi EMPAT keadaan dan EMPAT saran berbeda;
 *   - sesi pendek tidak pernah ditebak (neutral, confidence 0);
 *   - histeresis menahan keadaan setelah satu perubahan per sesi;
 *   - prioritas gaming > frustrated > fatigued > bored ditegakkan;
 *   - input korup tidak pernah membuat modul melempar.
 */
const assert = require('assert');
const affect = require('../features/brain/fiezel-affect.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

// ---- fixture sintetis -------------------------------------------------------------------
// Setiap fixture dibangun DETERMINISTIK dari deskripsi klinisnya, bukan dari data acak,
// supaya kegagalan gate selalu bisa dibaca ulang sebagai cerita murid yang jelas.

/** Frustrasi klasik: gagal beruntun >=3, berjuang keras, menembak ulang cepat pasca-salah,
 *  tapi TIDAK cepat menjawab secara umum (bukan gaming) dan temponya stabil (bukan lelah). */
const FRUSTRATED = [
  { ok: true, ms: 5000, concept: 'conditionals', timing: 'struggled' },
  { ok: false, ms: 6000, concept: 'conditionals', timing: 'struggled' },
  { ok: false, ms: 5500, concept: 'conditionals', timing: 'struggled', sinceMissMs: 900 },
  { ok: false, ms: 6000, concept: 'conditionals', timing: 'struggled', sinceMissMs: 800 },
  { ok: true, ms: 5000, concept: 'past_perfect', timing: 'struggled', sinceMissMs: 1000 },
  { ok: false, ms: 6500, concept: 'past_perfect', timing: 'struggled' },
  { ok: false, ms: 6000, concept: 'past_perfect', timing: 'struggled', sinceMissMs: 700 },
  { ok: false, ms: 6200, concept: 'conditionals', timing: 'struggled', sinceMissMs: 900 },
  { ok: true, ms: 5000, concept: 'conditionals', timing: 'normal', sinceMissMs: 1200 },
  { ok: false, ms: 6000, concept: 'conditionals', timing: 'struggled' },
  { ok: false, ms: 5800, concept: 'conditionals', timing: 'struggled', sinceMissMs: 600 },
  { ok: false, ms: 6000, concept: 'conditionals', timing: 'struggled', sinceMissMs: 800 }
];

/** Bosan klasik: nyaris sempurna, semua dari hafalan, dua konsep diulang-ulang, dan waktu
 *  respons MEMANJANG justru di item mudah — perhatian mengembara, bukan pikiran bekerja. */
const BORED = [];
for (let i = 0; i < 12; i++) {
  BORED.push({
    ok: true,
    ms: 3000 + (i >= 6 ? 600 + i * 50 : 0), // paruh kedua melambat ~1.2x, tanpa salah
    concept: i % 2 === 0 ? 'past_simple' : 'present_perfect',
    timing: 'retrieved'
  });
}

/** Gaming klasik: separuh lebih respons di bawah 1800ms TANPA akurasi yang membenarkannya. */
const GAMING = [
  { ok: false, ms: 900, concept: 'articles', timing: 'guess' },
  { ok: true, ms: 1100, concept: 'articles', timing: 'guess' },
  { ok: false, ms: 800, concept: 'articles', timing: 'guess' },
  { ok: false, ms: 1000, concept: 'prepositions', timing: 'guess' },
  { ok: true, ms: 950, concept: 'prepositions', timing: 'guess' },
  { ok: false, ms: 1200, concept: 'prepositions', timing: 'guess' },
  { ok: false, ms: 850, concept: 'articles', timing: 'guess' },
  { ok: true, ms: 1000, concept: 'articles', timing: 'guess' },
  { ok: false, ms: 900, concept: 'articles', timing: 'guess' },
  { ok: false, ms: 1100, concept: 'prepositions', timing: 'guess' },
  { ok: true, ms: 950, concept: 'prepositions', timing: 'guess' },
  { ok: false, ms: 1000, concept: 'prepositions', timing: 'guess' }
];

/** Lelah klasik: paruh kedua melambat 1.75x DAN akurasi turun — dua sinyal wajib fatigue() v2.
 *  Tanpa miss-streak panjang, tanpa struggled dominan, tanpa respons tembakan. */
const FATIGUED = [
  { ok: true, ms: 4000, concept: 'modals', timing: 'normal' },
  { ok: true, ms: 4000, concept: 'gerunds', timing: 'normal' },
  { ok: true, ms: 4100, concept: 'modals', timing: 'normal' },
  { ok: true, ms: 3900, concept: 'gerunds', timing: 'normal' },
  { ok: true, ms: 4000, concept: 'modals', timing: 'normal' },
  { ok: false, ms: 4200, concept: 'gerunds', timing: 'normal' },
  { ok: true, ms: 7000, concept: 'modals', timing: 'normal' },
  { ok: false, ms: 7200, concept: 'gerunds', timing: 'normal' },
  { ok: true, ms: 6900, concept: 'modals', timing: 'normal' },
  { ok: false, ms: 7100, concept: 'gerunds', timing: 'normal' },
  { ok: false, ms: 7000, concept: 'modals', timing: 'normal' },
  { ok: true, ms: 7000, concept: 'gerunds', timing: 'normal' }
];

// ---- empat pola, empat keadaan, empat saran ------------------------------------------------

test('empat pola sintetis klasik menghasilkan EMPAT keadaan berbeda', () => {
  const results = {
    frustrated: affect.assess(FRUSTRATED, {}),
    bored: affect.assess(BORED, {}),
    gaming: affect.assess(GAMING, {}),
    fatigued: affect.assess(FATIGUED, {})
  };
  assert.strictEqual(results.frustrated.state, 'frustrated', 'pola frustrasi -> frustrated');
  assert.strictEqual(results.bored.state, 'bored', 'pola bosan -> bored');
  assert.strictEqual(results.gaming.state, 'gaming', 'pola gaming -> gaming');
  assert.strictEqual(results.fatigued.state, 'fatigued', 'pola lelah -> fatigued');
  const states = new Set(Object.values(results).map(r => r.state));
  assert.strictEqual(states.size, 4, 'keempat keadaan harus berbeda, bukan satu jalur');
});

test('empat keadaan membawa EMPAT saran intervensi berbeda (bukan satu obat empat penyakit)', () => {
  const suggestions = [FRUSTRATED, BORED, GAMING, FATIGUED].map(fx =>
    JSON.stringify(affect.assess(fx, {}).suggestion));
  assert.strictEqual(new Set(suggestions).size, 4, 'saran harus berbeda per keadaan');
});

test('peta intervensi sesuai kontrak per keadaan', () => {
  const fr = affect.assess(FRUSTRATED, {}).suggestion;
  assert.strictEqual(fr.move, 'breathe', 'frustrasi -> breathe');
  assert.strictEqual(fr.scaffold, 'dini', 'frustrasi -> scaffold dini');
  assert.ok(fr.targetSuccess > 0.8, 'frustrasi -> target sukses dinaikkan (kesulitan turun)');
  const bo = affect.assess(BORED, {}).suggestion;
  assert.strictEqual(bo.interleave, true, 'bosan -> interleave');
  assert.ok(bo.targetSuccess < 0.8, 'bosan -> tantangan naik (target sukses turun)');
  const ga = affect.assess(GAMING, {}).suggestion;
  assert.ok(Array.isArray(ga.modes) && ga.modes.indexOf('teach_back') !== -1,
    'gaming -> mode tak bisa ditebak');
  assert.ok(ga.evidenceDiscount < 1, 'gaming -> bukti didiskon');
  const fa = affect.assess(FATIGUED, {}).suggestion;
  assert.ok(fa.sessionSize <= 6, 'lelah -> sesi diperpendek');
});

test('setiap keputusan membawa rationale brain3_affect_* dan confidence', () => {
  [FRUSTRATED, BORED, GAMING, FATIGUED].forEach(fx => {
    const r = affect.assess(fx, {});
    assert.ok(/^brain3_affect_/.test(r.rationale), 'rationale berprefix brain3_affect_');
    assert.ok(r.confidence > 0 && r.confidence <= 1, 'confidence dalam (0, 1]');
  });
});

// ---- gerbang bukti tipis ---------------------------------------------------------------------

test('sesi pendek (< 8 attempt) selalu neutral dengan confidence 0', () => {
  const short = GAMING.slice(0, 5); // sinyal gaming keras pun tidak boleh dipercaya
  const r = affect.assess(short, {});
  assert.strictEqual(r.state, 'neutral');
  assert.strictEqual(r.confidence, 0);
  assert.strictEqual(r.rationale, 'brain3_affect_insufficient_evidence');
  const seven = GAMING.slice(0, 7);
  assert.strictEqual(affect.assess(seven, {}).state, 'neutral', 'tepat di bawah ambang tetap neutral');
});

test('pola netral (akurasi sedang, tempo stabil, konsep bervariasi) tetap neutral', () => {
  const neutral = [];
  for (let i = 0; i < 12; i++) {
    neutral.push({ ok: i % 4 !== 0, ms: 4000, concept: 'c' + i, timing: 'normal' });
  }
  const r = affect.assess(neutral, {});
  assert.strictEqual(r.state, 'neutral');
  assert.strictEqual(r.rationale, 'brain3_affect_neutral');
});

// ---- histeresis ------------------------------------------------------------------------------

test('histeresis: setelah satu perubahan per sesi, keadaan sebelumnya dipertahankan', () => {
  // Sinyal gaming berteriak keras, tetapi keadaan SUDAH berubah sekali di sesi ini ->
  // kebijakan tidak boleh berbelok dua kali (council: hysteresis wajib, bukan opsional).
  const held = affect.assess(GAMING, { previous: 'frustrated', changedAlready: true });
  assert.strictEqual(held.state, 'frustrated', 'keadaan sebelumnya ditahan');
  assert.strictEqual(held.rationale, 'brain3_affect_hysteresis_hold');
  assert.strictEqual(held.suggestion.move, 'breathe', 'saran ikut keadaan yang ditahan');
});

test('histeresis: tanpa changedAlready, perubahan pertama diizinkan', () => {
  const r = affect.assess(GAMING, { previous: 'frustrated', changedAlready: false });
  assert.strictEqual(r.state, 'gaming', 'perubahan pertama sesi boleh terjadi');
});

test('histeresis: changedAlready dengan keadaan yang sama tidak menahan apa pun', () => {
  const r = affect.assess(GAMING, { previous: 'gaming', changedAlready: true });
  assert.strictEqual(r.state, 'gaming');
  assert.strictEqual(r.rationale, 'brain3_affect_gaming', 'bukan hold, deteksi asli');
});

// ---- prioritas -------------------------------------------------------------------------------

test('prioritas: pola yang gaming SEKALIGUS frustrasi diputuskan sebagai gaming', () => {
  // Cepat, salah beruntun, struggled, retry kilat: dua detektor terpicu sekaligus.
  // Gaming menang karena ia mengkontaminasi bukti — keadaan lain belum layak disimpulkan.
  const both = FRUSTRATED.map(a => Object.assign({}, a, { ms: 900 }));
  const r = affect.assess(both, {});
  assert.strictEqual(r.state, 'gaming');
});

test('cepat TAPI akurat bukan gaming (fluency dibebaskan dari tuduhan)', () => {
  const fluent = [];
  for (let i = 0; i < 12; i++) {
    fluent.push({ ok: true, ms: 1000, concept: 'c' + (i % 6), timing: 'normal' });
  }
  assert.notStrictEqual(affect.assess(fluent, {}).state, 'gaming');
});

test('melambat TANPA akurasi turun bukan fatigued (dua sinyal wajib)', () => {
  const thinking = [];
  for (let i = 0; i < 12; i++) {
    thinking.push({ ok: true, ms: i < 6 ? 3000 : 6000, concept: 'c' + (i % 6), timing: 'normal' });
  }
  assert.notStrictEqual(affect.assess(thinking, {}).state, 'fatigued',
    'berpikir lebih dalam tanpa salah bukan kelelahan');
});

// ---- input korup -----------------------------------------------------------------------------

test('input korup tidak pernah melempar dan jatuh ke neutral', () => {
  assert.strictEqual(affect.assess(null, {}).state, 'neutral');
  assert.strictEqual(affect.assess(undefined).state, 'neutral');
  assert.strictEqual(affect.assess('bukan array', {}).state, 'neutral');
  assert.strictEqual(affect.assess(42, null).state, 'neutral');
  const garbage = [null, 'x', 42, { ms: 'abc', ok: 'y' }, {}, { ok: true, ms: -5, concept: null }];
  const r = affect.assess(garbage, { previous: 'zzz', changedAlready: 'maybe' });
  assert.strictEqual(r.state, 'neutral', 'baris korup dibuang, sisanya di bawah ambang');
  assert.strictEqual(r.confidence, 0);
});

test('baris korup di tengah sesi valid dibuang tanpa merusak deteksi', () => {
  const mixed = GAMING.concat([null, 'x', { ms: 'abc' }]);
  assert.strictEqual(affect.assess(mixed, {}).state, 'gaming');
});

// ---- kontrak modul ----------------------------------------------------------------------------

test('modul murni: UMD, konstanta diekspor, tanpa efek samping', () => {
  assert.strictEqual(affect.SCHEMA, 'fiezel-affect-v1');
  assert.strictEqual(affect.MIN_ATTEMPTS, 8);
  assert.strictEqual(affect.FAST_MS, 1800);
  assert.deepStrictEqual([...affect.STATES], ['neutral', 'frustrated', 'bored', 'gaming', 'fatigued']);
  // Determinisme: input sama -> keluaran sama (tanpa Math.random, tanpa Date.now).
  assert.deepStrictEqual(affect.assess(FRUSTRATED, {}), affect.assess(FRUSTRATED, {}));
});

if (failures > 0) {
  console.error('FiezelAffect: GAGAL (' + failures + ' gate)');
  process.exit(1);
}
console.log('FiezelAffect: PASS');
