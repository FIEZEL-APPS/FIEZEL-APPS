/**
 * FIEZEL gate — Speaking Adaptive v3 (Braincore v3, modul C2).
 *
 * Speaking adalah tempat paling mudah untuk berbohong tanpa ketahuan: recognizer browser
 * bukan penilai pengucapan, dan skor coverage yang "kebetulan bagus" bisa menggeser
 * mastery lebih jauh daripada yang pantas. Karena itu gate ini tidak memeriksa "apakah
 * ada kebijakannya", melainkan APAKAH KEJUJURANNYA DIJAGA pada kasus yang bisa dinilai
 * tanpa berdebat:
 *
 *   (a) coverage tinggi stabil harus menaikkan TEPAT SATU dimensi, tidak dua;
 *   (b) coverage rendah harus mengembalikan scaffold SAMPAI model_first dulu —
 *       kompleksitas baru boleh turun setelah bantuan penuh pun tidak cukup;
 *   (c) kappa TIDAK PERNAH > 0.6, pada kombinasi input APA PUN — bukti speaking
 *       selalu didiskon karena recognizer tidak bisa dipercaya penuh;
 *   (d) "sempurna dalam sekejap" (coverage tinggi + latency mustahil pendek) harus
 *       terdeteksi sebagai noise, bukan dirayakan sebagai kemajuan;
 *   (e) weakLessons harus memengaruhi targetSkill — yang lemah dan prasyaratnya sehat
 *       dipilih, yang prasyaratnya sakit dilewati;
 *   (f) input kosong/korup harus jatuh ke default aman, bukan melempar exception;
 *   (g) masukan yang sama harus SELALU menghasilkan keputusan yang sama.
 */
const assert = require('assert');
const sa = require('../features/brain/fiezel-speaking-adaptive.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

/** Riwayat buatan: n baris dengan coverage dan latency DITENTUKAN — gate harus deterministik. */
function history(n, coverage, latencyMs) {
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ coverage, latencyMs });
  return rows;
}

/** Hitung berapa dimensi kesulitan yang berbeda antara dua keputusan — inti klaim "satu langkah". */
function dimsChanged(a, b) {
  let changed = 0;
  if (a.promptComplexity !== b.promptComplexity) changed++;
  if (a.scaffold !== b.scaffold) changed++;
  return changed;
}

// Baseline mastery menengah yang dipakai sebagai titik banding di banyak gate.
const BASE = { promptComplexity: 'phrase', scaffold: 'cue_only' };

// ---------------------------------------------------------------------------
// (a) Coverage tinggi stabil -> naik TEPAT SATU dimensi (scaffold dilepas dulu).
// ---------------------------------------------------------------------------
test('(a) coverage tinggi stabil menaikkan tepat SATU dimensi (scaffold dilepas dulu)', () => {
  const d = sa.policy({ mastery: 50, coverageHistory: history(6, 0.95, 4000) });
  assert.strictEqual(dimsChanged(BASE, d), 1, 'harus tepat satu dimensi yang berubah, bukan ' + dimsChanged(BASE, d));
  assert.strictEqual(d.scaffold, 'free', 'dimensi pertama yang naik harus scaffold (cue_only -> free)');
  assert.strictEqual(d.promptComplexity, 'phrase', 'kompleksitas TIDAK boleh ikut naik di langkah yang sama');
  assert.ok(d.rationale.includes('brain3_speaking_step_up_scaffold'), 'rationale harus menyebut step_up_scaffold');
});

test('(a) setelah free, giliran kompleksitas yang naik satu tingkat', () => {
  // stepUp dipakai langsung supaya semua kombinasi teruji, bukan hanya yang dijangkau baseline.
  const up = sa.stepUp({ promptComplexity: 'phrase', scaffold: 'free' });
  assert.strictEqual(up.dims.promptComplexity, 'sentence');
  assert.strictEqual(up.dims.scaffold, 'free');
  assert.strictEqual(up.rationale, 'brain3_speaking_step_up_complexity');
});

test('(a) urutan tangga kompleksitas kontrak: word -> phrase -> sentence -> open', () => {
  assert.deepStrictEqual(sa.COMPLEXITIES, ['word', 'phrase', 'sentence', 'open']);
  let dims = { promptComplexity: 'word', scaffold: 'free' };
  const seen = [dims.promptComplexity];
  for (let i = 0; i < 3; i++) { dims = sa.stepUp(dims).dims; seen.push(dims.promptComplexity); }
  assert.deepStrictEqual(seen, ['word', 'phrase', 'sentence', 'open'], 'naik harus SATU tingkat per langkah tanpa lompatan');
});

test('(a) stepUp/stepDown SELALU mengubah maksimal satu dimensi, di SEMUA kombinasi', () => {
  for (const c of sa.COMPLEXITIES) {
    for (const s of sa.SCAFFOLDS) {
      const dims = { promptComplexity: c, scaffold: s };
      assert.ok(dimsChanged(dims, sa.stepUp(dims).dims) <= 1, 'stepUp mengubah >1 dimensi pada ' + c + '/' + s);
      assert.ok(dimsChanged(dims, sa.stepDown(dims).dims) <= 1, 'stepDown mengubah >1 dimensi pada ' + c + '/' + s);
    }
  }
});

test('(a) ceiling: semua dimensi mentok -> dims tidak berubah, rationale ceiling', () => {
  const up = sa.stepUp({ promptComplexity: 'open', scaffold: 'free' });
  assert.deepStrictEqual(up.dims, { promptComplexity: 'open', scaffold: 'free' });
  assert.strictEqual(up.rationale, 'brain3_speaking_ceiling');
});

// ---------------------------------------------------------------------------
// (b) Coverage rendah -> scaffold kembali ke model_first DULU sebelum kompleksitas turun.
// ---------------------------------------------------------------------------
test('(b) coverage rendah menurunkan scaffold dulu (cue_only -> model_first), materi tetap', () => {
  const d = sa.policy({ mastery: 50, coverageHistory: history(6, 0.3, 4000) });
  assert.strictEqual(dimsChanged(BASE, d), 1, 'harus tepat satu dimensi yang berubah');
  assert.strictEqual(d.scaffold, 'model_first', 'scaffold harus turun dulu');
  assert.strictEqual(d.promptComplexity, 'phrase', 'kompleksitas TIDAK boleh turun selama scaffold belum model_first');
  assert.ok(d.rationale.includes('brain3_speaking_step_down_scaffold'));
});

test('(b) dari free, turun tetap ke scaffold dulu — bukan langsung memangkas materi', () => {
  const d = sa.policy({ mastery: 80, coverageHistory: history(6, 0.3, 4000) });
  assert.strictEqual(d.scaffold, 'cue_only', 'free harus turun ke cue_only dulu');
  assert.strictEqual(d.promptComplexity, 'sentence', 'kompleksitas baseline high tidak boleh ikut turun');
});

test('(b) kompleksitas baru turun SETELAH scaffold mentok di model_first', () => {
  const down = sa.stepDown({ promptComplexity: 'phrase', scaffold: 'model_first' });
  assert.strictEqual(down.dims.promptComplexity, 'word');
  assert.strictEqual(down.dims.scaffold, 'model_first');
  assert.strictEqual(down.rationale, 'brain3_speaking_step_down_complexity');
});

test('(b) floor: semua dimensi termudah -> dims tidak berubah, rationale floor', () => {
  const down = sa.stepDown({ promptComplexity: 'word', scaffold: 'model_first' });
  assert.deepStrictEqual(down.dims, { promptComplexity: 'word', scaffold: 'model_first' });
  assert.strictEqual(down.rationale, 'brain3_speaking_floor');
});

// ---------------------------------------------------------------------------
// (c) kappa TIDAK PERNAH > 0.6 — sapuan kombinasi input, termasuk yang korup.
// ---------------------------------------------------------------------------
test('(c) kappa <= 0.6 pada SEMUA kombinasi coverage x latency x replays', () => {
  const latencies = [-500, 0, 100, 799, 800, 3000, 15000, 15001, 1e9, NaN, Infinity];
  const replaysList = [0, 1, 2, 3, 10, -5, NaN];
  for (let cov = -0.5; cov <= 1.5; cov += 0.05) {
    for (const lat of latencies) {
      for (const rep of replaysList) {
        const ev = sa.evidence({ coverage: cov, latencyMs: lat, replays: rep });
        assert.ok(ev.kappa <= sa.KAPPA_MAX + 1e-12,
          'kappa ' + ev.kappa + ' > 0.6 pada coverage=' + cov + ' latency=' + lat + ' replays=' + rep);
        assert.ok(ev.kappa >= 0, 'kappa negatif: ' + ev.kappa);
        assert.ok(['strong', 'weak', 'noise'].includes(ev.signal), 'signal tidak dikenal: ' + ev.signal);
      }
    }
  }
});

test('(c) bahkan bukti terbaik (coverage 1.0, latency ideal, tanpa replay) tetap didiskon ke 0.6', () => {
  const ev = sa.evidence({ coverage: 1, latencyMs: 5000, replays: 0 });
  assert.strictEqual(ev.signal, 'strong');
  assert.strictEqual(ev.kappa, 0.6, 'bukti speaking terbaik pun harus tetap di plafon diskon 0.6');
});

test('(c) replay banyak memotong kappa lebih jauh (bergantung contoh bukan kemampuan yang sama)', () => {
  const clean = sa.evidence({ coverage: 1, latencyMs: 5000, replays: 0 });
  const leaned = sa.evidence({ coverage: 1, latencyMs: 5000, replays: 3 });
  assert.ok(leaned.kappa < clean.kappa, 'replay >= 2 harus menurunkan kappa');
  assert.ok(leaned.rationale.includes('brain3_speaking_evidence_replay_discount'));
});

// ---------------------------------------------------------------------------
// (d) Noise terdeteksi: coverage tinggi + latency mustahil pendek.
// ---------------------------------------------------------------------------
test('(d) evidence: coverage tinggi + latency mustahil pendek = noise dengan kappa nyaris nol', () => {
  const ev = sa.evidence({ coverage: 0.95, latencyMs: 200, replays: 0 });
  assert.strictEqual(ev.signal, 'noise', '"sempurna dalam sekejap" harus dibaca sebagai salah baca recognizer');
  assert.ok(ev.kappa <= 0.1, 'kappa noise harus nyaris nol, bukan ' + ev.kappa);
});

test('(d) evidence: coverage sama dengan latency wajar = strong — pembedanya memang latency', () => {
  const ev = sa.evidence({ coverage: 0.95, latencyMs: 4000, replays: 0 });
  assert.strictEqual(ev.signal, 'strong');
});

test('(d) evidence: coverage tinggi tapi latency sangat panjang = weak (produksi belum lancar)', () => {
  const ev = sa.evidence({ coverage: 0.95, latencyMs: 20000, replays: 0 });
  assert.strictEqual(ev.signal, 'weak');
  assert.ok(ev.kappa < 0.6);
});

test('(d) policy: jendela yang didominasi noise DITAHAN, tidak naik di atas bukti palsu', () => {
  const d = sa.policy({ mastery: 50, coverageHistory: history(6, 0.95, 200) });
  assert.strictEqual(dimsChanged(BASE, d), 0, 'dims harus ditahan saat bukti didominasi noise');
  assert.ok(d.rationale.includes('brain3_speaking_noisy_evidence'));
});

test('(d) policy: coverage tinggi dengan latency sangat panjang = usaha tersembunyi, kenaikan ditahan', () => {
  const d = sa.policy({ mastery: 50, coverageHistory: history(6, 0.95, 20000) });
  assert.strictEqual(dimsChanged(BASE, d), 0, 'kenaikan harus ditahan saat latency menandakan usaha tersembunyi');
  assert.ok(d.rationale.includes('brain3_speaking_hidden_effort'));
});

// ---------------------------------------------------------------------------
// (e) weakLessons memengaruhi targetSkill.
// ---------------------------------------------------------------------------
test('(e) lesson lemah dengan prasyarat sehat dipilih sebagai targetSkill', () => {
  const d = sa.policy({ mastery: 50, coverageHistory: history(6, 0.8, 4000), weakLessons: ['speaking_a1_ordering'] });
  assert.strictEqual(d.targetSkill, 'speaking_a1_ordering');
  assert.ok(d.rationale.includes('brain3_speaking_target_weak'));
});

test('(e) prasyarat sakit dilewati — yang sehat berikutnya yang dipilih', () => {
  const d = sa.policy({
    weakLessons: [
      { skill: 'speaking_b1_debate', prereqHealthy: false },
      { skill: 'speaking_a1_introduction', prereqHealthy: true }
    ]
  });
  assert.strictEqual(d.targetSkill, 'speaking_a1_introduction', 'lesson dengan prasyarat sakit tidak boleh jadi target');
});

test('(e) di antara yang sehat, mastery terendah menang (paling butuh latihan)', () => {
  const d = sa.policy({
    weakLessons: [
      { skill: 'speaking_a1_asking', prereqHealthy: true, mastery: 55 },
      { skill: 'speaking_a1_ordering', prereqHealthy: true, mastery: 20 }
    ]
  });
  assert.strictEqual(d.targetSkill, 'speaking_a1_ordering');
});

test('(e) semua prasyarat sakit -> tidak ada target dipaksakan, rationale menjelaskan blokirnya', () => {
  const d = sa.policy({ weakLessons: [{ skill: 'speaking_b2_report', prereqHealthy: false }] });
  assert.strictEqual(d.targetSkill, null);
  assert.ok(d.rationale.includes('brain3_speaking_target_prereq_blocked'));
});

test('(e) tanpa weakLessons -> targetSkill null dengan rationale target_none', () => {
  const d = sa.policy({ mastery: 50 });
  assert.strictEqual(d.targetSkill, null);
  assert.ok(d.rationale.includes('brain3_speaking_target_none'));
});

// ---------------------------------------------------------------------------
// (f) Input kosong/korup -> default aman, tanpa exception.
// ---------------------------------------------------------------------------
test('(f) policy tanpa argumen -> default aman (phrase / cue_only), tanpa exception', () => {
  const d = sa.policy();
  assert.strictEqual(d.promptComplexity, sa.DEFAULTS.promptComplexity);
  assert.strictEqual(d.scaffold, sa.DEFAULTS.scaffold);
  assert.strictEqual(d.targetSkill, null);
  assert.ok(Array.isArray(d.rationale) && d.rationale.length > 0, 'keputusan default pun wajib membawa rationale');
});

test('(f) input korup total tidak melempar dan tetap menghasilkan bentuk keluaran sah', () => {
  const corrupt = [
    null, undefined, 42, 'rusak',
    { coverageHistory: 'bukan array', weakLessons: 123, mastery: 'NaN' },
    { coverageHistory: [null, 'x', { coverage: NaN, latencyMs: -1 }, { coverage: 99, latencyMs: Infinity }], weakLessons: [null, 7, {}, { skill: '' }] },
    { mastery: -999, targetSuccess: 47 }
  ];
  for (const input of corrupt) {
    const d = sa.policy(input);
    assert.ok(sa.COMPLEXITIES.includes(d.promptComplexity), 'promptComplexity tidak sah untuk input korup');
    assert.ok(sa.SCAFFOLDS.includes(d.scaffold), 'scaffold tidak sah untuk input korup');
    const ev = sa.evidence(input);
    assert.ok(ev.kappa >= 0 && ev.kappa <= sa.KAPPA_MAX, 'kappa keluar batas untuk input korup');
  }
});

test('(f) bukti tipis (< 3 baris) menahan baseline, tidak menebak arah', () => {
  const d = sa.policy({ mastery: 50, coverageHistory: history(2, 1, 4000) });
  assert.strictEqual(dimsChanged(BASE, d), 0, 'dua baris bukti tidak cukup untuk bergerak');
  assert.ok(d.rationale.includes('brain3_speaking_insufficient_evidence'));
});

test('(f) explain mengembalikan kalimat Indonesia untuk semua kode yang dipakai', () => {
  const codes = [
    'brain3_speaking_default', 'brain3_speaking_step_up_scaffold', 'brain3_speaking_step_down_scaffold',
    'brain3_speaking_noisy_evidence', 'brain3_speaking_hidden_effort', 'brain3_speaking_target_weak',
    'brain3_speaking_evidence_noise', 'brain3_speaking_evidence_strong'
  ];
  for (const code of codes) {
    const text = sa.explain(code);
    assert.ok(typeof text === 'string' && text.length > 20 && !text.includes('tanpa penjelasan terdaftar'),
      'kode ' + code + ' tidak punya penjelasan terdaftar');
  }
  // explain() juga menerima keputusan utuh.
  assert.ok(sa.explain(sa.policy()).length > 20);
});

// ---------------------------------------------------------------------------
// (g) Determinisme: masukan sama -> keputusan sama, selalu.
// ---------------------------------------------------------------------------
test('(g) policy dan evidence deterministik untuk masukan yang sama', () => {
  const input = {
    mastery: 62,
    coverageHistory: [
      { coverage: 0.9, latencyMs: 3000 }, { coverage: 0.7, latencyMs: 5000 },
      { coverage: 0.95, latencyMs: 400 }, { coverage: 0.85, latencyMs: 6000 },
      { coverage: 0.6, latencyMs: 9000 }, { coverage: 1, latencyMs: 2500 }
    ],
    weakLessons: [{ skill: 'speaking_a1_asking', prereqHealthy: true, mastery: 40 }]
  };
  const a = sa.policy(input);
  const b = sa.policy(input);
  assert.deepStrictEqual(a, b, 'policy harus deterministik');
  const evA = sa.evidence({ coverage: 0.83, latencyMs: 4321, replays: 1 });
  const evB = sa.evidence({ coverage: 0.83, latencyMs: 4321, replays: 1 });
  assert.deepStrictEqual(evA, evB, 'evidence harus deterministik');
});

test('(g) policy tidak memutasi masukan pemanggil', () => {
  const rows = history(6, 0.95, 4000);
  const snapshot = JSON.stringify(rows);
  sa.policy({ mastery: 50, coverageHistory: rows });
  assert.strictEqual(JSON.stringify(rows), snapshot, 'riwayat pemanggil tidak boleh dimutasi');
});

// ---------------------------------------------------------------------------
// Hasil akhir.
// ---------------------------------------------------------------------------
if (failures > 0) {
  console.error('\nSpeakingAdaptive: ' + failures + ' gagal');
  process.exit(1);
}
console.log('SpeakingAdaptive: PASS');
