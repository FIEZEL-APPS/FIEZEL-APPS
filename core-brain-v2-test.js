/**
 * FIEZEL gate — Core Brain v2 (m025-116).
 *
 * OWNER: "tingkatkan inti otak core FIEZEL agar lebih pintar dan semakin jenius dari pada
 * sebelumnya."
 *
 * Lapisan penalaran adalah tempat paling mudah untuk terdengar pintar tanpa benar-benar
 * pintar: sebuah rumus yang mengeluarkan angka selalu terlihat meyakinkan, dan tidak ada
 * yang akan menyadari kalau arah pengaruhnya terbalik. Karena itu gate ini tidak memeriksa
 * "apakah ada modelnya", melainkan APAKAH KEPUTUSANNYA BENAR pada kasus-kasus yang bisa
 * dinilai tanpa berdebat:
 *
 *   - murid yang membaik dan murid yang memburuk TIDAK boleh mendapat keputusan yang sama;
 *   - soal yang terlalu mudah dan terlalu sulit sama-sama harus ditolak;
 *   - materi yang baru saja dilupakan harus kembali ke jarak pendek;
 *   - skill lemah yang punya prasyarat lebih lemah harus mengarah ke prasyaratnya;
 *   - dan tidak satu pun dari itu boleh dipercaya di atas bukti yang tipis.
 */
const assert = require('assert');
const fs = require('fs');
const brain = require('./features/brain/fiezel-core-brain.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-22T12:00:00Z');
const DAY = 86400000;

/** Riwayat buatan dengan peluang benar yang DITENTUKAN, bukan acak - gate harus deterministik. */
function attemptsFrom(pattern, options) {
  const opts = options || {};
  return pattern.map((ok, i) => ({
    at: NOW - (pattern.length - i) * (opts.spacingMs || DAY / 4),
    ok: !!ok,
    ms: (opts.baseMs || 6000) + i * (opts.msStep || 0),
    type: opts.type || 'grammar',
    skill: opts.skill || 'past_simple_vs_present_perfect',
    family: opts.family || 'tense_aspect',
    difficulty: opts.difficulty == null ? 3 : opts.difficulty
  }));
}
const rising = [];
for (let i = 0; i < 40; i++) rising.push(i % 5 < Math.min(5, Math.floor(i / 8) + 1));
const falling = rising.slice().reverse();
const flat = [];
for (let i = 0; i < 40; i++) flat.push(i % 2 === 0);

// ---- A. model kemampuan --------------------------------------------------------------

test('lantai tebakan pilihan ganda ikut dimodelkan, bukan diabaikan', () => {
  // Tanpa parameter tebakan, murid yang menjawab asal (25% benar) terbaca sebagai "sedikit
  // tahu", dan kekeliruan itu merambat ke SETIAP keputusan lain di modul ini.
  assert.strictEqual(brain.GUESS_FLOOR, 0.25, 'empat opsi berarti lantai 25%');
  const hopeless = brain.successProbability(1, 6);
  assert.ok(hopeless >= 0.25 && hopeless < 0.3,
    'soal yang jauh di atas kemampuan tetap punya peluang tebakan, tidak pernah mendekati nol');
  assert.ok(brain.successProbability(6, 1) > 0.97, 'soal yang jauh di bawah kemampuan nyaris pasti benar');
});

test('kemampuan naik saat benar pada soal sulit, dan hampir tidak bergerak pada soal mudah', () => {
  // Ini yang membuat taksiran tidak bisa dinaikkan dengan mengulang soal gampang.
  const base = brain.estimateAbility([], { prior: 3 }).ability;
  const hard = brain.estimateAbility(attemptsFrom([1], { difficulty: 6 }), { now: NOW, prior: 3 }).ability;
  const easy = brain.estimateAbility(attemptsFrom([1], { difficulty: 1 }), { now: NOW, prior: 3 }).ability;
  assert.ok(hard > base, 'benar pada soal sulit harus menaikkan taksiran');
  assert.ok(easy > base, 'benar tetap benar');
  assert.ok(hard - base > (easy - base) * 3, 'benar pada soal mudah nyaris tidak membawa informasi');
});

test('taksiran mengendap, tidak berayun mengikuti jawaban terakhir', () => {
  const many = brain.estimateAbility(attemptsFrom(flat, { difficulty: 3 }), { now: NOW, prior: 3 });
  const plusOne = brain.estimateAbility(attemptsFrom(flat.concat([0]), { difficulty: 3 }), { now: NOW, prior: 3 });
  assert.ok(Math.abs(plusOne.ability - many.ability) < 0.12,
    'satu jawaban di atas 40 bukti tidak boleh menggeser level murid');
});

test('bukti lama dihitung lebih ringan daripada bukti minggu ini', () => {
  const fresh = brain.estimateAbility(attemptsFrom(rising, { spacingMs: DAY / 6 }), { now: NOW, prior: 3 });
  const stale = brain.estimateAbility(
    attemptsFrom(rising, { spacingMs: DAY / 6 }).map(x => ({ ...x, at: x.at - 120 * DAY })),
    { now: NOW, prior: 3 });
  assert.ok(stale.confidence < fresh.confidence, 'kemampuan empat bulan lalu bukan kemampuan hari ini');
});

test('keyakinan nol saat belum ada bukti sama sekali', () => {
  const cold = brain.estimateAbility([], { now: NOW });
  assert.strictEqual(cold.evidence, 0);
  assert.strictEqual(cold.confidence, 0, 'model yang percaya diri tanpa bukti lebih berbahaya daripada tidak ada model');
});

// ---- B. kesulitan optimal --------------------------------------------------------------

test('kesulitan yang dipilih benar-benar menghasilkan peluang mendekati target', () => {
  // Ini pemeriksaan yang sesungguhnya: bukan "ada rumusnya", tetapi "rumusnya membalik".
  for (const ability of [1.2, 2.4, 3.5, 4.8, 5.9]) {
    const b = brain.optimalDifficulty(ability, 0.8);
    assert.ok(Math.abs(brain.successProbability(ability, b) - 0.8) < 0.001,
      'θ=' + ability + ': kesulitan pilihan tidak mengembalikan peluang target');
  }
});

test('soal terlalu mudah dan terlalu sulit sama-sama ditolak', () => {
  const w = brain.challengeWindow(3);
  assert.ok(brain.successProbability(3, w.floorExact) > brain.successProbability(3, w.exactDifficulty));
  assert.ok(brain.successProbability(3, w.ceilingExact) < brain.successProbability(3, w.exactDifficulty));
  assert.strictEqual(brain.difficultyBand(w.floor - 1, w), 'foundation');
  assert.strictEqual(brain.difficultyBand(w.ceiling + 1, w), 'stretch');
  assert.strictEqual(brain.difficultyBand(w.targetDifficulty, w), 'standard',
    'titik optimal harus berlabel standard - label yang selalu sama tidak memberi tahu apa pun');
});

test('kesulitan tidak pernah keluar dari tingkat soal yang benar-benar ada', () => {
  for (const ability of [0.2, 1, 3, 6, 9]) {
    const w = brain.challengeWindow(ability);
    assert.ok(w.targetDifficulty >= 1 && w.targetDifficulty <= 6, 'θ=' + ability);
    assert.ok(w.floor >= 1 && w.ceiling <= 6);
  }
});

// ---- C. model ingatan -------------------------------------------------------------------

test('pengulangan berhasil melebarkan jarak; kesalahan memendekkannya tajam', () => {
  const fresh = brain.halfLife({ successes: 0, lapses: 0, difficulty: 3 });
  const practised = brain.halfLife({ successes: 4, lapses: 0, difficulty: 3 });
  const lapsed = brain.halfLife({ successes: 4, lapses: 2, difficulty: 3 });
  assert.ok(practised > fresh * 5, 'jarak antar-ulangan harus melebar eksponensial, bukan bertambah tetap');
  assert.ok(lapsed < practised / 2, 'materi yang baru dilupakan harus kembali ke jarak pendek');
  assert.ok(brain.halfLife({ successes: 3, lapses: 0, difficulty: 6 })
    < brain.halfLife({ successes: 3, lapses: 0, difficulty: 1 }), 'materi sulit lebih cepat luntur');
});

test('retensi turun mulus dan tepat setengah pada satu paruh-waktu', () => {
  assert.strictEqual(brain.retrievability(10, 0), 1);
  assert.ok(Math.abs(brain.retrievability(10, 10) - 0.5) < 0.001);
  assert.ok(Math.abs(brain.retrievability(10, 20) - 0.25) < 0.001);
});

test('jadwal ulang dipilih dari target retensi, bukan dari tabel jarak', () => {
  const h = brain.halfLife({ successes: 3, lapses: 0, difficulty: 3 });
  const gap = brain.nextReviewGapDays(h, 0.9);
  assert.ok(Math.abs(brain.retrievability(h, gap) - 0.9) < 0.002,
    'jarak yang dipilih harus mendaratkan retensi tepat di targetnya');
  assert.ok(brain.nextReviewGapDays(h, 0.95) < gap, 'target retensi lebih tinggi berarti diulang lebih cepat');
});

test('yang diprioritaskan adalah materi di AMBANG lupa, bukan yang paling lama tidak disentuh', () => {
  // Materi yang retensinya masih 0.99 belum perlu disentuh; yang sudah 0.05 praktis harus
  // dipelajari ulang. Keduanya bukan "review" yang efisien.
  const ranked = brain.reviewPriority([
    { id: 'masih-segar', successes: 5, lapses: 0, difficulty: 2, lastSeenAt: NOW - DAY },
    { id: 'ambang-lupa', successes: 2, lapses: 0, difficulty: 3, lastSeenAt: NOW - 3 * DAY },
    { id: 'sudah-hilang', successes: 0, lapses: 3, difficulty: 6, lastSeenAt: NOW - 60 * DAY }
  ], { now: NOW });
  assert.strictEqual(ranked[0].id, 'ambang-lupa');
  assert.ok(ranked[0].score > ranked[1].score * 1.5);
  assert.strictEqual(ranked[ranked.length - 1].id, 'sudah-hilang');
});

// ---- D. tren dan momentum ---------------------------------------------------------------

test('regresi mengembalikan kemiringan dan kecocokan yang benar', () => {
  const up = brain.trend([0, 1, 2, 3, 4]);
  assert.ok(Math.abs(up.slope - 1) < 1e-9);
  assert.ok(Math.abs(up.r2 - 1) < 1e-9);
  const flatFit = brain.trend([2, 2, 2, 2]);
  assert.strictEqual(flatFit.slope, 0);
  assert.strictEqual(brain.trend([]).n, 0, 'deret kosong tidak boleh melempar');
  assert.strictEqual(brain.trend([5]).intercept, 5);
});

test('murid yang membaik dan yang memburuk tidak mendapat pembacaan yang sama', () => {
  // Inilah yang tidak bisa dilihat oleh rata-rata: kedua deret ini punya akurasi rata-rata
  // yang IDENTIK, karena yang satu adalah kebalikan urutan dari yang lain.
  const upAttempts = attemptsFrom(rising);
  const downAttempts = attemptsFrom(falling);
  const upAccuracy = upAttempts.filter(x => x.ok).length;
  const downAccuracy = downAttempts.filter(x => x.ok).length;
  assert.strictEqual(upAccuracy, downAccuracy, 'prasyarat tes: rata-ratanya memang sama');
  assert.strictEqual(brain.momentum(upAttempts).state, 'improving');
  assert.strictEqual(brain.momentum(downAttempts).state, 'declining');
});

test('mandek terbaca sebagai mandek, bukan sebagai membaik atau memburuk', () => {
  assert.strictEqual(brain.momentum(attemptsFrom(flat)).state, 'plateau');
});

test('momentum menolak menyimpulkan di atas bukti tipis', () => {
  const thin = brain.momentum(attemptsFrom([1, 0, 1, 0, 1]));
  assert.strictEqual(thin.state, 'unknown');
  assert.strictEqual(thin.confidence, 0, 'lima jawaban adalah lemparan koin, bukan sinyal');
});

// ---- E. graf prasyarat --------------------------------------------------------------------

test('rantai prasyarat menelusuri ke atas dan tidak pernah berputar', () => {
  const chain = brain.prerequisiteChain('conditionals');
  assert.ok(chain.includes('tense_aspect'));
  assert.ok(chain.includes('modals'));
  assert.deepStrictEqual(brain.prerequisiteChain('tense_aspect'), [], 'akar tidak punya prasyarat');
  assert.ok(brain.prerequisiteChain('advanced_grammar').length > 3, 'materi lanjutan mewarisi rantai di bawahnya');
  assert.ok(new Set(brain.prerequisiteChain('advanced_grammar')).size
    === brain.prerequisiteChain('advanced_grammar').length, 'tidak boleh ada pengulangan/siklus');
  assert.strictEqual(brain.prerequisiteChain('tidak-ada-keluarga-ini').length, 0);
});

test('gejala diganti akar masalah HANYA bila prasyaratnya terukur dan nyata lebih lemah', () => {
  const target = { family: 'conditionals', skill: 'third_conditional', mastery: 40 };
  const withWeakRoot = brain.rootCause(target, [
    { family: 'conditionals', skill: 'third_conditional', attempts: 10, mastery: 40 },
    { family: 'tense_aspect', skill: 'past_perfect', attempts: 9, mastery: 18 }
  ]);
  assert.strictEqual(withWeakRoot.isRoot, false);
  assert.strictEqual(withWeakRoot.family, 'tense_aspect');
  assert.strictEqual(withWeakRoot.skill, 'past_perfect');

  const healthyRoot = brain.rootCause(target, [
    { family: 'conditionals', skill: 'third_conditional', attempts: 10, mastery: 40 },
    { family: 'tense_aspect', skill: 'past_perfect', attempts: 9, mastery: 88 }
  ]);
  assert.strictEqual(healthyRoot.isRoot, true, 'prasyarat yang sudah dikuasai tidak boleh dilatih ulang');
  assert.strictEqual(healthyRoot.skill, 'third_conditional');
});

test('prasyarat tanpa cukup bukti tidak boleh menggantikan gejala', () => {
  // Melatih materi dasar berdasarkan dua jawaban akan terasa seperti dihukum karena salah
  // di materi sulit.
  const guessy = brain.rootCause({ family: 'conditionals', skill: 'third_conditional', mastery: 40 }, [
    { family: 'conditionals', skill: 'third_conditional', attempts: 10, mastery: 40 },
    { family: 'tense_aspect', skill: 'past_perfect', attempts: 2, mastery: 0 }
  ]);
  assert.strictEqual(guessy.isRoot, true);
  assert.strictEqual(guessy.rationale, 'prerequisites_healthy');
});

// ---- F. profil waktu belajar ----------------------------------------------------------------

test('jam produktif hanya disimpulkan dari bukti yang cukup di kedua sisi', () => {
  const hourOf = at => new Date(at).getUTCHours();
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push({ at: Date.parse('2026-08-1' + (i % 8) + 'T07:00:00Z'), ok: true });
  for (let i = 0; i < 20; i++) rows.push({ at: Date.parse('2026-08-1' + (i % 8) + 'T21:00:00Z'), ok: i % 4 === 0 });
  const profile = brain.studyWindows(rows, { hourOf });
  assert.strictEqual(profile.best.id, 'pagi');
  assert.strictEqual(profile.confident, true);

  const thin = brain.studyWindows(rows.slice(0, 6), { hourOf });
  assert.strictEqual(thin.best, null, 'memindahkan pengingat ke jam yang salah lebih merugikan daripada tidak memindahkannya');
  assert.strictEqual(thin.confident, false);
});

// ---- G. beban kognitif -----------------------------------------------------------------------

test('kelelahan menuntut DUA sinyal sekaligus: melambat DAN makin sering salah', () => {
  const tired = brain.fatigue([
    ...[1, 1, 1, 1, 1, 1].map((ok, i) => ({ ok: !!ok, ms: 5000 + i * 50 })),
    ...[0, 0, 1, 0, 0, 0].map((ok, i) => ({ ok: !!ok, ms: 14000 + i * 50 }))
  ]);
  assert.strictEqual(tired.state, 'fatigued');

  // Melambat saja bisa berarti murid sedang berpikir lebih dalam - itu bukan alasan
  // menyudahi sesi.
  const thinkingHarder = brain.fatigue([
    ...[1, 1, 1, 1, 1, 1].map((ok, i) => ({ ok: !!ok, ms: 5000 + i * 50 })),
    ...[1, 1, 1, 1, 1, 1].map((ok, i) => ({ ok: !!ok, ms: 15000 + i * 50 }))
  ]);
  assert.strictEqual(thinkingHarder.state, 'fresh');

  assert.strictEqual(brain.fatigue([{ ok: true, ms: 1000 }]).state, 'unknown');
});

// ---- perencana sesi ---------------------------------------------------------------------------

test('arah belajar mengubah keputusan, bukan hanya laporannya', () => {
  const base = { ability: { ability: 3, confidence: 0.8 }, dueReviews: 0, atRiskReviews: 0 };
  const declining = brain.planSession({ ...base, momentum: { state: 'declining', confidence: 0.8 } });
  const plateau = brain.planSession({ ...base, momentum: { state: 'plateau', confidence: 0.8 } });
  const improving = brain.planSession({ ...base, momentum: { state: 'improving', confidence: 0.8 } });
  assert.ok(declining.targetDifficulty < plateau.targetDifficulty, 'yang memburuk harus direm');
  assert.ok(improving.sessionSize > declining.sessionSize, 'yang membaik boleh diberi ruang lebih');
  assert.ok(plateau.rationale.includes('plateau_break'),
    'mengulang persis yang sudah mandek adalah definisi mandek itu sendiri');
});

test('kelelahan memperpendek sesi, dan itu terlihat di alasannya', () => {
  const base = { ability: { ability: 3, confidence: 0.8 }, momentum: { state: 'plateau', confidence: 0.8 } };
  const fresh = brain.planSession(base);
  const spent = brain.planSession({ ...base, fatigue: { state: 'fatigued', level: 0.7 } });
  assert.ok(spent.sessionSize < fresh.sessionSize);
  assert.strictEqual(spent.pace, 'calm');
  assert.ok(spent.rationale.includes('cognitive_load_high'));
});

test('porsi review dihitung dari materi yang benar-benar rawan, bukan dari jumlah jatuh tempo', () => {
  const base = { ability: { ability: 3, confidence: 0.8 }, momentum: { state: 'plateau', confidence: 0.8 } };
  const manyDueNoneAtRisk = brain.planSession({ ...base, dueReviews: 100, atRiskReviews: 0 });
  const fewButAtRisk = brain.planSession({ ...base, dueReviews: 8, atRiskReviews: 7 });
  assert.ok(fewButAtRisk.reviewShare > manyDueNoneAtRisk.reviewShare,
    'seratus item "due" yang retensinya masih 0.95 bukan seratus alasan untuk mengulang');
  assert.ok(fewButAtRisk.rationale.includes('memory_at_risk'));
});

test('bukti tipis membuat rencana berhati-hati, bukan percaya diri', () => {
  const cold = brain.planSession({ ability: { ability: 1.5, confidence: 0.05 }, momentum: { state: 'unknown', confidence: 0 } });
  assert.ok(cold.reviewShare <= 0.15, 'murid baru butuh bukti baru, bukan mengulang yang belum pernah ada');
  assert.strictEqual(cold.interleave, false, 'mencampur materi terlalu dini menaikkan beban tanpa menaikkan retensi');
  assert.ok(cold.rationale.includes('building_evidence'));
});

test('setiap keputusan membawa alasan yang bisa dibaca, tidak pernah kosong', () => {
  const plan = brain.planSession({});
  assert.ok(Array.isArray(plan.rationale) && plan.rationale.length > 0);
  assert.strictEqual(plan.schema, 'fiezel-core-brain-v2');
  assert.ok(plan.sessionSize >= 5 && plan.sessionSize <= 16);
  assert.ok(plan.targetDifficulty >= 1 && plan.targetDifficulty <= 6);
  assert.ok(plan.reviewShare >= 0 && plan.reviewShare <= 1);
});

// ---- potret utuh ---------------------------------------------------------------------------------

test('analyze() menerima riwayat aplikasi apa adanya dan tidak melempar pada masukan kosong', () => {
  const empty = brain.analyze({});
  assert.strictEqual(empty.schema, 'fiezel-core-brain-v2');
  assert.strictEqual(empty.ability.evidence, 0);
  assert.ok(empty.plan.sessionSize >= 5);
  assert.strictEqual(empty.rootCause, null);
  for (const bad of [null, undefined, { attempts: null, memory: 'bukan-array' }]) {
    assert.ok(brain.analyze(bad).schema === 'fiezel-core-brain-v2');
  }
});

test('analyze() memisahkan arah belajar per domain, bukan satu angka untuk semuanya', () => {
  const attempts = [
    ...attemptsFrom(rising, { type: 'grammar' }),
    ...attemptsFrom(falling, { type: 'reading' })
  ].sort((a, b) => a.at - b.at);
  const out = brain.analyze({ now: NOW, attempts });
  assert.strictEqual(out.domains.grammar.momentum.state, 'improving');
  assert.strictEqual(out.domains.reading.momentum.state, 'declining');
});

test('modul murni: tanpa DOM, tanpa jaringan, tanpa penyimpanan', () => {
  const source = fs.readFileSync('./features/brain/fiezel-core-brain.js', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of ['document', 'localStorage', 'fetch(', 'XMLHttpRequest', 'window.']) {
    assert.ok(!source.includes(forbidden), 'lapisan penalaran menyentuh ' + forbidden + ' - itu membuatnya tidak bisa diuji sebagai angka');
  }
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync('./.github/workflows/quality.yml', 'utf8');
  assert.ok(workflow.includes('node core-brain-v2-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

console.log('');
if (failures) { console.error('FIEZEL Core Brain v2: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL Core Brain v2: PASS');
