/**
 * FIEZEL gate — SRL Coach v1 (Braincore v3, modul C4).
 *
 * Kontrak yang dijaga gate ini datang dari konsensus council (opus C9, gpt_5_6_sol §7.8):
 * scaffold SRL hanya berguna kalau JARANG, spesifik-konten, tidak menambah beban saat
 * murid frustrasi, dan tahu kapan harus pergi (fading). Maka yang diuji bukan "apakah ada
 * fungsinya", melainkan apakah kebijakannya benar pada kasus yang bisa dinilai:
 *
 *   (a) prompt keyakinan muncul TEPAT SEKALI per sesi, dan hanya di jendela item ke-2..4;
 *   (b) frustrasi -> prompt tidak pernah muncul (menambah beban saat gagal adalah kesalahan);
 *   (c) tiga sesi kalibrasi baik -> prompt tidur 5 sesi (brain3_srl_faded); memburuk -> bangun;
 *   (d) pesan refleksi menyebut NAMA KONTEN dan ANGKA, bukan pesan generik;
 *   (e) tidak ada pujian-orang ('pintar', 'hebat', ...) atau label ('malas', 'lambat', ...)
 *       di naskah mana pun — yang dinilai selalu tindakan;
 *   (f) state korup tidak melempar, dan keluaran deterministik tanpa memutasi argumen.
 */
const assert = require('assert');
const fs = require('fs');
const coach = require('./features/brain/fiezel-srl-coach.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-27T12:00:00Z');

/** Refleksi dengan bias yang DITENTUKAN: confidence 0.75 pada semua baris, akurasi diatur. */
function reflectWith(state, opts) {
  const o = opts || {};
  const n = o.n == null ? 4 : o.n;
  const correctCount = o.correctCount == null ? 3 : o.correctCount;
  const predictions = [];
  for (let i = 0; i < n; i++) {
    predictions.push({
      confidence: o.confidence == null ? 0.75 : o.confidence,
      correct: i < correctCount,
      concept: o.concept || 'past_simple'
    });
  }
  return coach.reflect(state, { predictions, sessionAccuracy: correctCount / n }, o.at || NOW);
}

/** Sesi kalibrasi BAIK: yakin 0.75, benar 3 dari 4 (bias 0) -> |bias| < 0.1. */
function goodSession(state, at) { return reflectWith(state, { at }); }

// ---- (a) tepat sekali per sesi, hanya item ke-2..4 ------------------------------------

test('prompt keyakinan muncul tepat SEKALI per sesi, di dalam jendela item ke-2..4', () => {
  // Coba beberapa sesi berbeda (jendela digilir dari sessionsCompleted) — di setiap sesi,
  // menyapu seluruh itemIndex harus menghasilkan TEPAT SATU prompt, selalu di 2..4.
  let state = null;
  for (let session = 0; session < 6; session++) {
    const hits = [];
    for (let itemIndex = 1; itemIndex <= 12; itemIndex++) {
      const prompt = coach.predictPrompt(state, { itemIndex, sessionSize: 12 });
      if (prompt) hits.push(itemIndex);
    }
    assert.strictEqual(hits.length, 1, 'sesi ' + session + ': prompt harus tepat satu, dapat ' + hits.length);
    assert.ok(hits[0] >= 2 && hits[0] <= 4, 'sesi ' + session + ': prompt di item ' + hits[0] + ', di luar jendela 2..4');
    state = goodSession(state, NOW + session).state;
    // Streak baik memicu fading — bangunkan lagi supaya uji jendela tetap berjalan.
    if (state.fadedRemaining > 0) state = reflectWith(state, { correctCount: 1, at: NOW + session }).state;
  }
});

test('bentuk prompt sesuai kontrak: skala [0.25, 0.5, 0.75, 0.95] dan pertanyaan keyakinan', () => {
  let prompt = null;
  for (let itemIndex = 2; itemIndex <= 4 && !prompt; itemIndex++) {
    prompt = coach.predictPrompt(null, { itemIndex, sessionSize: 10 });
  }
  assert.ok(prompt, 'harus ada prompt pada state segar');
  assert.deepStrictEqual(prompt.scale, [0.25, 0.5, 0.75, 0.95], 'skala kontrak FINAL');
  assert.ok(/seberapa yakin/i.test(prompt.ask), 'pertanyaannya menaksir keyakinan');
  assert.strictEqual(prompt.rationale, 'brain3_srl_predict_once');
});

test('sesi yang terlalu pendek untuk jendela tidak pernah memunculkan prompt', () => {
  for (let itemIndex = 0; itemIndex <= 4; itemIndex++) {
    assert.strictEqual(coach.predictPrompt(null, { itemIndex, sessionSize: 1 }), null);
  }
});

// ---- (b) frustrasi -> null --------------------------------------------------------------

test('affect frustrated mematikan prompt di SEMUA item — beban tidak ditambah saat gagal', () => {
  for (let itemIndex = 1; itemIndex <= 10; itemIndex++) {
    const prompt = coach.predictPrompt(null, { itemIndex, sessionSize: 10, affect: 'frustrated' });
    assert.strictEqual(prompt, null, 'item ' + itemIndex + ' masih memunculkan prompt saat frustrasi');
  }
  // Afek lain TIDAK mematikan prompt — larangan ini khusus frustrasi, bukan semua afek.
  let seen = 0;
  for (let itemIndex = 1; itemIndex <= 10; itemIndex++) {
    if (coach.predictPrompt(null, { itemIndex, sessionSize: 10, affect: 'bored' })) seen++;
  }
  assert.strictEqual(seen, 1, 'afek bored tetap mendapat tepat satu prompt');
});

// ---- (c) fading: 3 sesi baik -> tidur 5 sesi; memburuk -> bangun --------------------------

test('tiga sesi kalibrasi baik berturut-turut memicu fading dengan rationale brain3_srl_faded', () => {
  let state = null;
  let out = null;
  for (let i = 0; i < 3; i++) {
    out = goodSession(state, NOW + i);
    state = out.state;
  }
  assert.strictEqual(out.rationale, 'brain3_srl_faded', 'sesi baik ketiga harus memicu fading');
  assert.strictEqual(state.fadedRemaining, coach.FADE_SESSIONS, 'prompt tidur ' + coach.FADE_SESSIONS + ' sesi');
  // Selama faded: tidak ada prompt di item mana pun.
  for (let itemIndex = 1; itemIndex <= 10; itemIndex++) {
    assert.strictEqual(coach.predictPrompt(state, { itemIndex, sessionSize: 10 }), null,
      'prompt masih muncul saat faded (item ' + itemIndex + ')');
  }
});

test('fading berakhir setelah 5 sesi tanpa data — prompt bangun sendiri', () => {
  let state = null;
  for (let i = 0; i < 3; i++) state = goodSession(state, NOW + i).state;
  // Lima sesi berlalu tanpa taksiran (karena prompt tidur): sisa tidur berkurang tiap refleksi.
  for (let i = 0; i < coach.FADE_SESSIONS; i++) {
    state = coach.reflect(state, { predictions: [], sessionAccuracy: 0.8 }, NOW + 10 + i).state;
  }
  assert.strictEqual(state.fadedRemaining, 0, 'tidur harus habis setelah ' + coach.FADE_SESSIONS + ' sesi');
  let seen = 0;
  for (let itemIndex = 1; itemIndex <= 10; itemIndex++) {
    if (coach.predictPrompt(state, { itemIndex, sessionSize: 10 })) seen++;
  }
  assert.strictEqual(seen, 1, 'setelah tidur habis, prompt kembali tepat satu per sesi');
});

test('kalibrasi memburuk membangunkan prompt lagi walau fading belum habis', () => {
  let state = null;
  for (let i = 0; i < 3; i++) state = goodSession(state, NOW + i).state;
  assert.ok(state.fadedRemaining > 0, 'prasyarat: sedang faded');
  // Bukti kalibrasi buruk masuk (mis. dari setConfidence yang tetap diisi murid):
  // yakin 0.75 tapi hanya benar 1 dari 4 -> bias +0.5.
  const woke = reflectWith(state, { correctCount: 1, at: NOW + 20 });
  assert.strictEqual(woke.state.fadedRemaining, 0, 'tidur dibatalkan saat kalibrasi memburuk');
  assert.strictEqual(woke.state.goodStreak, 0, 'streak baik gugur');
  let seen = 0;
  for (let itemIndex = 1; itemIndex <= 10; itemIndex++) {
    if (coach.predictPrompt(woke.state, { itemIndex, sessionSize: 10 })) seen++;
  }
  assert.strictEqual(seen, 1, 'prompt bangun lagi setelah kalibrasi memburuk');
});

test('sesi buruk di tengah memutus streak — fading butuh TIGA baik BERTURUT-TURUT', () => {
  let state = null;
  state = goodSession(state, NOW).state;
  state = goodSession(state, NOW + 1).state;
  state = reflectWith(state, { correctCount: 0, at: NOW + 2 }).state; // buruk: bias +0.75
  state = goodSession(state, NOW + 3).state;
  state = goodSession(state, NOW + 4).state;
  assert.strictEqual(state.fadedRemaining, 0, 'dua baik + buruk + dua baik belum boleh fading');
  const third = goodSession(state, NOW + 5);
  assert.strictEqual(third.rationale, 'brain3_srl_faded', 'baik ketiga berturut-turut baru memicu fading');
});

// ---- (d) pesan spesifik-konten: nama + angka ---------------------------------------------

test('pesan overconfident menyebut nama konten dan kedua angkanya (yakin 95%, benar 60%)', () => {
  const predictions = [];
  for (let i = 0; i < 5; i++) predictions.push({ confidence: 0.95, correct: i < 3, concept: 'conditionals' });
  const out = coach.reflect(null, { predictions, sessionAccuracy: 0.6 }, NOW);
  assert.ok(out.message.indexOf('conditionals') >= 0, 'nama konten wajib disebut: ' + out.message);
  assert.ok(out.message.indexOf('95%') >= 0, 'angka keyakinan wajib disebut: ' + out.message);
  assert.ok(out.message.indexOf('60%') >= 0, 'angka hasil wajib disebut: ' + out.message);
  assert.strictEqual(out.rationale, 'brain3_srl_reflect_overconfident');
  assert.ok(out.bias > 0.1, 'bias positif = terlalu yakin');
});

test('pesan underconfident juga bernama dan berangka, dengan arah saran yang berlawanan', () => {
  const predictions = [];
  for (let i = 0; i < 5; i++) predictions.push({ confidence: 0.25, correct: i < 4, concept: 'articles' });
  const out = coach.reflect(null, { predictions, sessionAccuracy: 0.8 }, NOW);
  assert.ok(out.message.indexOf('articles') >= 0, 'nama konten wajib disebut');
  assert.ok(out.message.indexOf('25%') >= 0 && out.message.indexOf('80%') >= 0, 'kedua angka wajib disebut');
  assert.strictEqual(out.rationale, 'brain3_srl_reflect_underconfident');
});

test('nama konten teknis dimanusiakan (underscore jadi spasi) di pesan', () => {
  const out = reflectWith(null, { concept: 'past_simple_vs_present_perfect', correctCount: 0 });
  assert.ok(out.message.indexOf('past simple vs present perfect') >= 0, out.message);
});

test('riwayat kalibrasi per sesi tersimpan di state (at, n, bias, accuracy, good)', () => {
  let state = null;
  state = reflectWith(state, { correctCount: 3, at: NOW }).state;
  state = reflectWith(state, { correctCount: 0, at: NOW + 1 }).state;
  assert.strictEqual(state.history.length, 2);
  assert.strictEqual(state.history[0].at, NOW);
  assert.strictEqual(state.history[0].good, true);
  assert.strictEqual(state.history[1].good, false);
  assert.ok(Math.abs(state.history[1].bias - 0.75) < 1e-9, 'bias sesi buruk tercatat apa adanya');
  assert.strictEqual(state.sessionsCompleted, 2);
});

test('goalPrompt menawarkan tiga pilihan dengan kelemahan BERNAMA dari suggestedFocus', () => {
  const out = coach.sessionPlan(null, { suggestedFocus: 'passive_voice', sessionSize: 10 }, NOW);
  assert.strictEqual(out.rationale, 'brain3_srl_goal_choice');
  const ids = out.goalPrompt.options.map((o) => o.id);
  assert.deepStrictEqual(ids, ['focus_weak', 'review_due', 'free'], 'tiga pilihan tetap: fokus/review/bebas');
  assert.ok(out.goalPrompt.options[0].label.indexOf('passive voice') >= 0, 'titik rawan disebut namanya');
  assert.strictEqual(out.goalPrompt.options[0].target, 'passive voice');
  assert.ok(/jadwal lupa/.test(out.goalPrompt.options[1].label), 'pilihan review menjelaskan kenapa');
  // Tanpa suggestedFocus pun tetap tiga pilihan, tanpa melempar.
  const bare = coach.sessionPlan(null, {}, NOW);
  assert.strictEqual(bare.goalPrompt.options.length, 3);
  assert.strictEqual(bare.goalPrompt.options[0].target, null);
});

// ---- (e) tidak ada pujian-orang atau label sifat di naskah apa pun ------------------------

test('semua naskah bebas pujian-orang dan label sifat', () => {
  // Kumpulkan SEMUA naskah yang bisa dihasilkan modul: goal prompt, prompt keyakinan,
  // dan pesan refleksi di keempat kuadran kalibrasi + fading + tanpa data.
  const scripts = [];
  const plan = coach.sessionPlan(null, { suggestedFocus: 'conditionals', sessionSize: 8 }, NOW);
  scripts.push(plan.goalPrompt.ask);
  plan.goalPrompt.options.forEach((o) => scripts.push(o.label));
  for (let i = 2; i <= 4; i++) {
    const p = coach.predictPrompt(null, { itemIndex: i, sessionSize: 8 });
    if (p) scripts.push(p.ask);
  }
  scripts.push(reflectWith(null, { correctCount: 0 }).message);          // overconfident
  scripts.push(reflectWith(null, { correctCount: 4 }).message);          // underconfident (0.75 vs 1.0)
  scripts.push(reflectWith(null, { correctCount: 3 }).message);          // terkalibrasi
  let st = null;
  for (let i = 0; i < 3; i++) {
    const out = goodSession(st, NOW + i);
    st = out.state;
    scripts.push(out.message);                                           // termasuk pesan fading
  }
  scripts.push(coach.reflect(null, { predictions: [] }, NOW).message);   // tanpa data

  // Larangan council: jangan puji sifat orang, jangan tempel label sifat.
  const forbidden = ['pintar', 'hebat', 'jenius', 'cerdas', 'rajin', 'malas', 'lambat', 'bodoh', 'lemah'];
  for (const script of scripts) {
    const low = String(script).toLowerCase();
    for (const word of forbidden) {
      assert.ok(low.indexOf(word) < 0, "naskah memuat kata terlarang '" + word + "': " + script);
    }
  }
  // Dan sumbernya sendiri (setelah komentar dibuang) juga tidak menyimpan kata-kata itu.
  const source = fs.readFileSync('./features/brain/fiezel-srl-coach.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').toLowerCase();
  for (const word of forbidden) {
    assert.ok(source.indexOf(word) < 0, "sumber modul memuat kata terlarang '" + word + "'");
  }
});

// ---- (f) tahan korup, murni, deterministik -------------------------------------------------

test('state korup tidak pernah melempar dan diganti state sehat', () => {
  const corrupts = [null, undefined, 42, 'rusak', [], { schema: 'asing' },
    { schema: coach.SCHEMA, sessionsCompleted: 'x', goodStreak: -9, fadedRemaining: 9e9, history: 'bukan-array' },
    { schema: coach.SCHEMA, history: [null, 7, 'x', { at: 'y' }] }];
  for (const bad of corrupts) {
    const plan = coach.sessionPlan(bad, { suggestedFocus: 'tenses' }, NOW);
    assert.ok(plan.goalPrompt.options.length === 3, 'sessionPlan tetap hidup di state korup');
    coach.predictPrompt(bad, { itemIndex: 3, sessionSize: 10 }); // tidak boleh melempar
    const out = coach.reflect(bad, { predictions: [{ confidence: 0.75, correct: true }] }, NOW);
    assert.strictEqual(out.state.schema, coach.SCHEMA, 'state keluaran selalu ber-schema sah');
  }
  // fadedRemaining liar dari storage korup di-clamp, tidak membuat prompt tidur selamanya.
  const wild = { schema: coach.SCHEMA, sessionsCompleted: 0, goodStreak: 0, fadedRemaining: 9e9, history: [] };
  const out = coach.reflect(wild, { predictions: [] }, NOW);
  assert.ok(out.state.fadedRemaining <= coach.FADE_SESSIONS - 1, 'sisa tidur di-clamp lalu berkurang');
});

test('baris prediksi korup dibuang diam-diam, bukan ikut dihitung', () => {
  const out = coach.reflect(null, {
    predictions: [
      { confidence: 0.75, correct: true, concept: 'tenses' },
      { confidence: 7, correct: true },      // di luar 0..1: buang
      { confidence: 'x', correct: false },   // bukan angka: buang
      null, 'rusak', 42                       // bukan objek: buang
    ]
  }, NOW);
  assert.strictEqual(out.state.history[0].n, 1, 'hanya baris sah yang dihitung');
});

test('deterministik dan tidak memutasi argumen', () => {
  const state = coach.reflect(null, {
    predictions: [{ confidence: 0.95, correct: false, concept: 'conditionals' }]
  }, NOW).state;
  const args = { predictions: [{ confidence: 0.5, correct: true, concept: 'articles' }], sessionAccuracy: 1 };
  const frozenArgs = JSON.stringify(args);
  const frozenState = JSON.stringify(state);
  const a = coach.reflect(state, args, NOW + 5);
  const b = coach.reflect(state, args, NOW + 5);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'dua panggilan identik = hasil identik');
  assert.strictEqual(JSON.stringify(args), frozenArgs, 'argumen tidak disentuh');
  assert.strictEqual(JSON.stringify(state), frozenState, 'state masukan tidak disentuh');
  const p1 = coach.predictPrompt(state, { itemIndex: 3, sessionSize: 10 });
  const p2 = coach.predictPrompt(state, { itemIndex: 3, sessionSize: 10 });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(p1)), JSON.parse(JSON.stringify(p2)), 'prompt deterministik');
});

test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan, tanpa jam internal', () => {
  const source = fs.readFileSync('./features/brain/fiezel-srl-coach.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.', 'Date.now', 'Math.random']) {
    assert.ok(source.indexOf(forbidden) < 0, 'modul menyentuh ' + forbidden + ' — itu membuatnya tidak bisa diuji sebagai angka');
  }
});

console.log('');
if (failures) { console.error('FIEZEL SRL Coach: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL SRL Coach: PASS');
