/**
 * FIEZEL gate — Misconception Ledger v1 (braincore v3, P1).
 *
 * Ledger miskonsepsi adalah tempat paling berbahaya untuk salah arah: ia MENUDUH murid
 * memegang kesalahan berpikir tertentu, dan tuduhan itu mengarahkan reteach berminggu-
 * minggu. Karena itu gate ini tidak memeriksa "apakah angkanya keluar", melainkan APAKAH
 * TUDUHANNYA ADIL pada kasus-kasus yang bisa dinilai tanpa berdebat:
 *
 *   (a) pola yang KEMBALI lintas sesi layak disebut miskonsepsi — 3 bukti timing normal
 *       dari 2 sesi harus aktif;
 *   (b) tiga tebakan asal BUKAN pola — semuanya guess tidak boleh aktif;
 *   (c) murid yang memperbaiki diri harus DIAKUI — benar berturut-turut menurunkan belief
 *       sampai resolved, bukan dihukum selamanya;
 *   (d) diam 60 hari berarti bukti basi — belief kembali mendekati prior;
 *   (e) state korup tidak boleh mematikan pelajaran — tidak melempar, ledger kosong;
 *   (f) nama miskonsepsi sama pada dua konsep berbeda adalah DUA masalah — tidak saling
 *       menimpa.
 */
const assert = require('assert');
const ledgerApi = require('../features/brain/fiezel-misconception-ledger.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-22T12:00:00Z');
const DAY = 86400000;

/** Bukti buatan yang DITENTUKAN penuh — gate harus deterministik, tanpa keacakan. */
function evid(overrides) {
  return Object.assign({
    concept: 'article-usage',
    family: 'articles',
    misconception: 'article-before-possessive',
    correct: false,
    timing: 'normal',
    sessionId: 's1'
  }, overrides || {});
}

function feed(events) {
  let ledger = null;
  for (const [evidence, atMs] of events) ledger = ledgerApi.update(ledger, evidence, atMs);
  return ledger;
}

// ---- kontrak dasar ---------------------------------------------------------------------

test('skema dan konstanta kontrak diekspor sesuai tanda tangan FINAL', () => {
  assert.strictEqual(ledgerApi.SCHEMA, 'fiezel-misconception-ledger-v1');
  assert.strictEqual(ledgerApi.PRIOR_BELIEF, 0.1, 'prior logit(0.1) sesuai desain P1');
  assert.strictEqual(ledgerApi.TIMING_WEIGHT.guess, 0.3, 'tebakan didiskon x0.3');
  assert.strictEqual(ledgerApi.TIMING_WEIGHT.struggled, 1.0, 'struggled bernilai penuh');
  assert.strictEqual(ledgerApi.DECAY_HALF_LIFE_DAYS, 14, 'paruh-waktu decay 14 hari');
});

test('update murni: ledger argumen tidak disentuh', () => {
  const before = feed([[evid(), NOW]]);
  const frozen = JSON.stringify(before);
  ledgerApi.update(before, evid({ sessionId: 's2' }), NOW + DAY);
  assert.strictEqual(JSON.stringify(before), frozen,
    'update harus mengembalikan ledger BARU, bukan memutasi argumen');
});

// ---- (a) pola lintas sesi -> aktif -------------------------------------------------------

test('(a) 3 bukti distraktor timing normal lintas 2 sesi -> aktif', () => {
  // prior logit(0.1) = -2.197; tiga bukti +ln(10) (dikurangi sedikit decay 1 hari)
  // mendorong belief ~0.99 — jauh di atas gerbang 0.7, dengan 3 bukti dari 2 sesi.
  const ledger = feed([
    [evid({ sessionId: 's1' }), NOW],
    [evid({ sessionId: 's1' }), NOW + 10 * 60000],
    [evid({ sessionId: 's2' }), NOW + DAY]
  ]);
  const act = ledgerApi.active(ledger, NOW + DAY);
  assert.strictEqual(act.length, 1, 'tepat satu miskonsepsi aktif');
  assert.strictEqual(act[0].concept, 'article-usage');
  assert.strictEqual(act[0].misconception, 'article-before-possessive');
  assert.ok(act[0].belief >= 0.7, 'belief ' + act[0].belief + ' harus >= 0.7');
  assert.strictEqual(act[0].evidenceCount, 3);
  assert.deepStrictEqual(act[0].sessions.slice().sort(), ['s1', 's2']);
  assert.strictEqual(act[0].rationale, 'brain3_misconception_active');
});

test('(a-kontra) 3 bukti kuat tapi SATU sesi saja -> belum aktif', () => {
  // Belief-nya tinggi, tapi gerbang >=2 sesi menahannya: satu hari buruk bukan pola.
  const ledger = feed([
    [evid(), NOW],
    [evid(), NOW + 60000],
    [evid(), NOW + 120000]
  ]);
  assert.strictEqual(ledgerApi.active(ledger, NOW + 120000).length, 0,
    'pola satu sesi tidak boleh dituduhkan sebagai miskonsepsi');
});

// ---- (b) tebakan bukan bukti --------------------------------------------------------------

test('(b) 3 bukti semuanya guess -> tidak aktif', () => {
  // Diskon x0.3: logit = -2.197 + 3*0.3*ln(10) = -0.125 -> belief ~0.47 < 0.7.
  // Murid yang menjawab asal sedang tidak menunjukkan keyakinan apa pun.
  const ledger = feed([
    [evid({ timing: 'guess', sessionId: 's1' }), NOW],
    [evid({ timing: 'guess', sessionId: 's1' }), NOW + 60000],
    [evid({ timing: 'guess', sessionId: 's2' }), NOW + DAY]
  ]);
  const act = ledgerApi.active(ledger, NOW + DAY);
  assert.strictEqual(act.length, 0, 'tiga tebakan cepat tidak boleh jadi tuduhan');
  const sum = ledgerApi.summarize(ledger, NOW + DAY);
  assert.strictEqual(sum.active.length, 0);
  assert.strictEqual(sum.total, 1, 'entri tetap dilacak sebagai digest, hanya tidak aktif');
});

// ---- (c) benar berturut -> resolved --------------------------------------------------------

test('(c) miskonsepsi aktif lalu 4 benar berturut pada konsep itu -> resolved', () => {
  // Lini masa realistis: aktif di minggu pertama, dua minggu hening (decay separuh jarak
  // ke prior, belief ~0.76 — masih aktif), lalu 4 jawaban benar (-ln 2 masing-masing)
  // menjatuhkan belief ke ~0.16 <= 0.3. Histeresis 0.7/0.3 memastikan status resolved,
  // dan flag "pernah aktif" yang membuatnya masuk daftar resolved, bukan sekadar hilang.
  let ledger = feed([
    [evid({ sessionId: 's1' }), NOW],
    [evid({ sessionId: 's1' }), NOW + 10 * 60000],
    [evid({ sessionId: 's2' }), NOW + DAY]
  ]);
  assert.strictEqual(ledgerApi.active(ledger, NOW + DAY).length, 1, 'prasyarat: aktif dulu');

  const later = NOW + 15 * DAY;
  assert.strictEqual(ledgerApi.active(ledger, later).length, 1,
    'setelah 14 hari hening belief masih di atas 0.7 — belum resolved oleh waktu saja');
  for (let i = 0; i < 4; i++) {
    ledger = ledgerApi.update(ledger,
      evid({ correct: true, timing: 'normal', sessionId: 's3' }), later + i * 60000);
  }
  const at = later + 4 * 60000;
  const sum = ledgerApi.summarize(ledger, at);
  assert.strictEqual(sum.active.length, 0, 'tidak lagi aktif setelah bukti perbaikan');
  assert.strictEqual(sum.resolved.length, 1, 'harus tercatat sebagai resolved');
  assert.ok(sum.resolved[0].belief <= 0.3,
    'belief ' + sum.resolved[0].belief + ' harus <= 0.3');
  assert.strictEqual(sum.resolved[0].rationale, 'brain3_misconception_resolved');
});

test('(c-arah) satu jawaban benar menurunkan belief tapi TIDAK langsung resolved', () => {
  // Bukti negatif (ln 2) sengaja lebih lemah dari positif (ln 10): benar bisa dari
  // eliminasi opsi. Satu benar tidak boleh menghapus tiga salah yang konsisten.
  let ledger = feed([
    [evid({ sessionId: 's1' }), NOW],
    [evid({ sessionId: 's1' }), NOW + 60000],
    [evid({ sessionId: 's2' }), NOW + DAY]
  ]);
  ledger = ledgerApi.update(ledger, evid({ correct: true }), NOW + DAY + 60000);
  const sum = ledgerApi.summarize(ledger, NOW + DAY + 60000);
  assert.strictEqual(sum.resolved.length, 0, 'satu benar belum cukup untuk resolved');
  assert.strictEqual(sum.active.length, 1, 'masih aktif — beliefnya baru turun sedikit');
});

// ---- (d) decay menuju prior ----------------------------------------------------------------

test('(d) 60 hari tanpa aktivitas -> belief mendekati prior', () => {
  const ledger = feed([
    [evid({ sessionId: 's1' }), NOW],
    [evid({ sessionId: 's1' }), NOW + 60000],
    [evid({ sessionId: 's2' }), NOW + DAY]
  ]);
  // 60/14 ~= 4.3 paruh-waktu: jarak log-odds ke prior tinggal ~5%. Belief harus jatuh
  // dari ~0.99 ke dekat 0.1 — model yang tidak bisa lupa menghukum murid selamanya.
  const sum = ledgerApi.summarize(ledger, NOW + DAY + 60 * DAY);
  assert.strictEqual(sum.active.length, 0, 'tidak boleh masih aktif setelah 60 hari hening');
  const all = ledgerApi.active(ledger, NOW + DAY); // belief saat masih segar, pembanding
  assert.ok(all[0].belief > 0.9, 'pembanding: belief segar memang tinggi');
  // Baca belief kini lewat summarize (entri pernah aktif dan kini <= 0.3 -> resolved).
  assert.strictEqual(sum.resolved.length, 1);
  const beliefNow = sum.resolved[0].belief;
  assert.ok(Math.abs(beliefNow - 0.1) < 0.05,
    'belief ' + beliefNow + ' harus mendekati prior 0.1 (selisih < 0.05)');
});

test('(d-murni) decay dihitung dari argumen nowMs, bukan jam sistem', () => {
  const ledger = feed([[evid(), NOW]]);
  // Dua pembacaan pada nowMs BERBEDA harus memberi belief berbeda dari ledger yang SAMA —
  // bukti bahwa waktu adalah argumen, bukan state tersembunyi.
  const early = ledgerApi.summarize(ledger, NOW).total;
  const lateSum = ledgerApi.summarize(ledger, NOW + 200 * DAY);
  assert.strictEqual(early, 1);
  assert.strictEqual(lateSum.total, 1, 'entri tidak dihapus oleh waktu, hanya meluruh');
});

// ---- (e) ketahanan state korup --------------------------------------------------------------

test('(e) state korup -> tidak melempar, ledger kosong', () => {
  const garbage = [null, undefined, 42, 'rusak', [], { schema: 'asing' },
    { schema: 'fiezel-misconception-ledger-v1', entries: 'bukan-objek' },
    { schema: 'fiezel-misconception-ledger-v1', entries: { x: null, y: 'sampah', z: 7 } }];
  for (const bad of garbage) {
    const summed = ledgerApi.summarize(bad, NOW);
    assert.strictEqual(summed.total, 0, 'state korup harus terbaca sebagai ledger kosong');
    assert.deepStrictEqual(ledgerApi.active(bad, NOW), []);
    const revived = ledgerApi.update(bad, evid(), NOW);
    assert.strictEqual(revived.schema, 'fiezel-misconception-ledger-v1',
      'update di atas state korup harus memulai ledger sehat, bukan melempar');
    assert.strictEqual(ledgerApi.summarize(revived, NOW).total, 1);
  }
});

test('(e-lanjutan) bukti korup diabaikan tanpa merusak ledger sehat', () => {
  let ledger = feed([[evid(), NOW]]);
  for (const bad of [null, 'x', 9, {}, { correct: false }, { concept: '' }]) {
    ledger = ledgerApi.update(ledger, bad, NOW + 60000);
  }
  assert.strictEqual(ledgerApi.summarize(ledger, NOW + 60000).total, 1,
    'bukti tanpa concept/misconception bukan alamat yang sah — dibuang diam-diam');
});

// ---- (f) isolasi antar konsep ---------------------------------------------------------------

test('(f) nama miskonsepsi sama di dua konsep berbeda tidak saling menimpa', () => {
  // 'overgeneralization' di tenses dan di articles adalah dua masalah pedagogis berbeda.
  const ledger = feed([
    [evid({ concept: 'past-simple', misconception: 'overgeneralization', sessionId: 's1' }), NOW],
    [evid({ concept: 'past-simple', misconception: 'overgeneralization', sessionId: 's1' }), NOW + 60000],
    [evid({ concept: 'past-simple', misconception: 'overgeneralization', sessionId: 's2' }), NOW + DAY],
    [evid({ concept: 'article-usage', misconception: 'overgeneralization', sessionId: 's3', timing: 'guess' }), NOW + DAY]
  ]);
  const sum = ledgerApi.summarize(ledger, NOW + DAY);
  assert.strictEqual(sum.total, 2, 'dua konsep = dua entri terpisah');
  const act = ledgerApi.active(ledger, NOW + DAY);
  assert.strictEqual(act.length, 1, 'hanya entri past-simple yang lolos gerbang');
  assert.strictEqual(act[0].concept, 'past-simple');
  // Bukti benar pada satu konsep TIDAK boleh menyentuh konsep lain.
  const after = ledgerApi.update(ledger,
    evid({ concept: 'article-usage', correct: true }), NOW + DAY + 60000);
  const actAfter = ledgerApi.active(after, NOW + DAY + 60000);
  assert.strictEqual(actAfter.length, 1, 'entri past-simple tidak tersentuh');
  assert.ok(actAfter[0].belief >= 0.7);
});

// ---- canonical (integrasi taksonomi A5) ------------------------------------------------------

test('canonical opsional: agregasi per nama kanonik saat tersedia', () => {
  // Dua label lokal berbeda pada dua konsep, satu nama kanonik dari taksonomi A5:
  // byCanonical harus menyatukannya jadi satu masalah dengan belief kasus terparah.
  const events = [];
  for (const [concept, m] of [['past-simple', 'ed-everywhere'], ['irregular-verbs', 'ed-on-irregular']]) {
    events.push([evid({ concept, misconception: m, canonical: 'overregularize-past', sessionId: 's1' }), NOW]);
    events.push([evid({ concept, misconception: m, canonical: 'overregularize-past', sessionId: 's1' }), NOW + 60000]);
    events.push([evid({ concept, misconception: m, canonical: 'overregularize-past', sessionId: 's2' }), NOW + DAY]);
  }
  const ledger = feed(events);
  const sum = ledgerApi.summarize(ledger, NOW + DAY);
  assert.strictEqual(sum.active.length, 2, 'dua entri lokal aktif');
  assert.strictEqual(sum.active[0].canonical, 'overregularize-past');
  assert.strictEqual(sum.byCanonical.length, 1, 'teragregasi jadi satu masalah kanonik');
  assert.strictEqual(sum.byCanonical[0].canonical, 'overregularize-past');
  assert.strictEqual(sum.byCanonical[0].concepts.length, 2);
  assert.strictEqual(sum.byCanonical[0].evidenceCount, 6);
  // Tanpa canonical, field-nya null dan agregasi kanonik kosong — degradasi anggun.
  const plain = feed([
    [evid({ sessionId: 's1' }), NOW],
    [evid({ sessionId: 's1' }), NOW + 60000],
    [evid({ sessionId: 's2' }), NOW + DAY]
  ]);
  const plainSum = ledgerApi.summarize(plain, NOW + DAY);
  assert.strictEqual(plainSum.active[0].canonical, null);
  assert.strictEqual(plainSum.byCanonical.length, 0);
});

// ---- penutup ---------------------------------------------------------------------------------

if (failures > 0) {
  console.error('Misconception Ledger: GAGAL (' + failures + ' kegagalan)');
  process.exit(1);
}
console.log('Misconception Ledger: PASS');
