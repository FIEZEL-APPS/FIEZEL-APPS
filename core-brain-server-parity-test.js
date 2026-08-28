#!/usr/bin/env node
/**
 * GERBANG PARITAS CORE BRAIN: KLIEN vs CERMIN SERVER (m025-180)
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Mulai m025-180 `fiezel-core-worker.js` memuat CERMIN dari matematika
 * `features/brain/fiezel-core-brain.js`: peluang benar 3PL, kesulitan optimal,
 * pita tantangan, label pita, dan regresi tren. Cermin itu tidak bisa
 * meng-`import` aslinya - worker di-deploy sebagai SATU berkas ke Puter, tanpa
 * bundler dan tanpa modul - jadi angkanya memang ditulis dua kali.
 *
 * Duplikasi tanpa gerbang paritas adalah dua sistem yang berpisah diam-diam:
 * seseorang menyetel DISCRIMINATION di modul klien enam bulan dari sekarang,
 * semua gerbang klien tetap hijau, dan sejak saat itu murid yang sama menerima
 * dua kebijakan berbeda tergantung apakah ringkasannya sempat terkirim.
 * Kegagalan seperti itu tidak punya gejala - kebijakannya tetap masuk akal,
 * cuma tidak sama - jadi ia hanya bisa ditangkap oleh gerbang yang MENJALANKAN
 * kedua implementasi atas masukan yang sama dan menuntut angkanya identik.
 *
 * Polanya bukan hal baru di repo ini: blok PARITY di
 * `core-worker-contract-test.js` sudah melakukan persis ini untuk
 * `evolutionSanitizeConfig`. Berkas ini memperluasnya ke lapisan penalaran.
 *
 * ==========================================================================
 * APA YANG DIJAGA
 * ==========================================================================
 *   (P1) KONSTANTA. Nilai a, c, target sukses, dan keempat ambang arah belajar
 *        di worker sama persis dengan yang DIEKSPOR modul klien - dibaca dari
 *        sumbernya, bukan dari komentar.
 *   (P2) FUNGSI. successProbability / abilityFromAccuracy / optimalDifficulty /
 *        difficultyBand / challengeWindow / trend menjawab angka yang IDENTIK
 *        atas matriks masukan yang sama, termasuk masukan rusak (NaN, null,
 *        di luar rentang) - tempat dua implementasi paling sering berpisah.
 *   (P3) BISA MERAH. Paritas dibuktikan bisa gagal: satu konstanta worker
 *        dirusak di memori, dan gerbang menuntut perbandingannya MELEDAK.
 *   (P4) EFEKTIVITAS KEBIJAKAN. Deret hasil kebijakan dibaca sebagai tren
 *        (basis residual bila targetnya tercatat), tiga titik minimum, dan
 *        ambang turun yang asimetris - kemunduran harus curam DAN nyata.
 *   (P5) REKONSTRUKSI. Ringkasan otak sisi server lahir dari bukti yang sudah
 *        ada, lewat jepitan yang sama, tanpa field baru, dan `null` saat memang
 *        tidak ada yang bisa dikatakan.
 *   (P6) KLIEN YANG YAKIN SELALU MENANG. Cermin tidak pernah menggantikan
 *        ringkasan klien yang keyakinannya di atas ambang.
 *   (P7) REGRESI YANG DITUTUP RILIS INI. Permintaan kebijakan TANPA `brain`
 *        tidak lagi jatuh ke lapisan v1 polos.
 *   (P8) PELATIH MENJELASKAN KEBIJAKAN YANG SAMA. /api/coach/context dan
 *        /api/policy/next wajib menghasilkan kebijakan yang identik.
 *
 * Nol jaringan: worker dijalankan di dalam `vm` dengan KV di memori.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = __dirname;
const brain = require('./features/brain/fiezel-core-brain.js');
const WORKER_SOURCE = fs.readFileSync(path.join(root, 'fiezel-core-worker.js'), 'utf8');

let failures = 0;
/* Uji didaftarkan dulu, dijalankan berurutan di akhir. Bentuk `try { fn() } catch` yang
 * biasa dipakai gerbang lain di repo ini MENELAN kegagalan uji async: fn() async
 * mengembalikan promise yang sudah terlanjur dicetak 'ok', lalu penolakannya muncul sebagai
 * unhandled rejection dengan exit code yang benar tapi laporan yang berbohong. Dua uji jalur
 * rute di bawah memang async, jadi runner-nya yang menyesuaikan, bukan ujinya. */
const QUEUE = [];
function test(name, fn) { QUEUE.push({ name, fn }); }
async function run() {
  for (const item of QUEUE) {
    try { await item.fn(); console.log('ok - ' + item.name); }
    catch (e) { failures++; console.error('FAIL - ' + item.name + '\n    ' + (e && e.message ? e.message : String(e))); }
  }
  if (failures) { console.error(`\nFIEZEL core brain server parity: FAIL (${failures})`); process.exit(1); }
  console.log(`\nFIEZEL core brain server parity: PASS (${QUEUE.length} uji)`);
}

/** Menjalankan sumber worker di dalam sandbox dan mengembalikan konteksnya. */
function loadWorker(source) {
  const routes = { GET: new Map(), POST: new Map() };
  const store = new Map();
  const router = { get: (p, f) => routes.GET.set(p, f), post: (p, f) => routes.POST.set(p, f) };
  const kv = {
    get: async k => store.get(k),
    set: async (k, v) => { store.set(k, v); return true },
    list: async ({ pattern = '', returnValues = false } = {}) => {
      const prefix = pattern.replace('*', '');
      return [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, value]) => returnValues ? { key, value } : { key });
    }
  };
  const me = { puter: { kv, auth: { getUser: async () => ({ uuid: 'owner-uuid', username: 'owner' }) } } };
  const context = { router, me, Response, Intl, Date, Math, console, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'fiezel-core-worker.js' });
  context.__routes = routes;
  context.__store = store;
  return context;
}
const W = loadWorker(WORKER_SOURCE);

/**
 * Objek yang dibuat DI DALAM `vm` mewarisi `Object.prototype` milik konteks itu, bukan milik
 * proses uji. `assert.deepStrictEqual` membandingkan prototipe juga, jadi tanpa penyalinan
 * ini setiap perbandingan objek lintas sandbox gagal dengan selisih yang tidak kelihatan -
 * kedua sisi tercetak identik. Yang dijaga gerbang ini adalah ANGKANYA, bukan dari sandbox
 * mana objeknya lahir; menyalin properti sendiri ke objek tuan rumah membuat kegagalan yang
 * tersisa benar-benar berarti "angkanya berbeda".
 */
const plain = value => (value && typeof value === 'object') ? Object.assign({}, value) : value;

/** Konstanta worker dibaca dari SUMBER: `const` tingkat atas tidak mendarat di global vm. */
function workerConst(name, source) {
  const hit = new RegExp('const\\s+' + name + '\\s*=\\s*(-?[0-9.]+)\\s*;').exec(source || WORKER_SOURCE);
  assert.ok(hit, 'konstanta ' + name + ' tidak ditemukan di sumber worker');
  return Number(hit[1]);
}

// =====================================================================================
// P1 — KONSTANTA
// =====================================================================================
test('P1 konstanta model 3PL worker == modul klien', () => {
  assert.strictEqual(workerConst('BRAIN_DISCRIMINATION'), brain.DISCRIMINATION, 'DISCRIMINATION berpisah');
  assert.strictEqual(workerConst('BRAIN_GUESS_FLOOR'), brain.GUESS_FLOOR, 'GUESS_FLOOR berpisah');
  assert.strictEqual(workerConst('BRAIN_TARGET_SUCCESS'), brain.TARGET_SUCCESS, 'TARGET_SUCCESS berpisah');
});

test('P1 keempat ambang arah belajar worker == modul klien', () => {
  assert.strictEqual(workerConst('BRAIN_MOMENTUM_ACCURACY_SLOPE'), brain.MOMENTUM_ACCURACY_SLOPE);
  assert.strictEqual(workerConst('BRAIN_MOMENTUM_RESIDUAL_SLOPE'), brain.MOMENTUM_RESIDUAL_SLOPE);
  assert.strictEqual(workerConst('BRAIN_MOMENTUM_RESIDUAL_DECLINE_SLOPE'), brain.MOMENTUM_RESIDUAL_DECLINE_SLOPE);
  assert.strictEqual(workerConst('BRAIN_MOMENTUM_RESIDUAL_DECLINE_R2'), brain.MOMENTUM_RESIDUAL_DECLINE_R2);
});

// =====================================================================================
// P2 — FUNGSI
// =====================================================================================
/* Matriks sengaja memuat masukan RUSAK (NaN, null, undefined, di luar rentang): di situlah
 * dua implementasi paling sering berpisah, karena jalur normalnya selalu diuji dan jalur
 * cacatnya tidak pernah. */
const ABILITIES = [-3, -0.4, 0, 0.5, 1, 1.5, 2.4, 3, 4.75, 6, 9, NaN, null, undefined];
const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 0, 7, -2, NaN, null];
const ACCURACIES = [0, 0.1, 0.24, 0.25, 0.27, 0.5, 0.62, 0.8, 0.85, 0.97, 1, 1.4, NaN, null, undefined];
const TARGETS = [0.55, 0.6, 0.8, 0.9, 0.97, 0.99, 0.2, NaN, null, undefined];

test('P2 successProbability identik atas seluruh matriks', () => {
  for (const a of ABILITIES) for (const d of DIFFICULTIES) {
    const expected = brain.successProbability(a, d);
    const actual = W.brainSuccessProbability(a, d);
    assert.strictEqual(actual, expected, `successProbability(${a},${d}): ${actual} != ${expected}`);
  }
});

test('P2 abilityFromAccuracy identik atas seluruh matriks', () => {
  for (const p of ACCURACIES) for (const d of DIFFICULTIES) {
    const expected = brain.abilityFromAccuracy(p, d);
    const actual = W.brainAbilityFromAccuracy(p, d);
    assert.strictEqual(actual, expected, `abilityFromAccuracy(${p},${d}): ${actual} != ${expected}`);
  }
});

test('P2 optimalDifficulty identik atas seluruh matriks', () => {
  for (const a of ABILITIES) for (const t of TARGETS) {
    const expected = brain.optimalDifficulty(a, t);
    const actual = W.brainOptimalDifficulty(a, t);
    assert.strictEqual(actual, expected, `optimalDifficulty(${a},${t}): ${actual} != ${expected}`);
  }
});

test('P2 challengeWindow identik lapangan per lapangan (termasuk band)', () => {
  for (const a of ABILITIES) {
    const expected = brain.challengeWindow(a);
    const actual = W.brainChallengeWindow(a);
    assert.deepStrictEqual(plain(actual), plain(expected), `challengeWindow(${a}) berpisah`);
  }
});

test('P2 difficultyBand identik, termasuk saat batas bulatnya bertabrakan', () => {
  for (const a of ABILITIES) {
    const w = brain.challengeWindow(a);
    for (const pick of [1, 2, 3, 4, 5, 6]) {
      assert.strictEqual(W.brainDifficultyBand(pick, w), brain.difficultyBand(pick, w), `difficultyBand(${pick},window(${a}))`);
    }
  }
});

test('P2 trend identik: deret kosong, satu titik, datar, naik, turun, berderau', () => {
  const SERIES = [
    [], [0.5], [0.5, 0.5], [0.4, 0.5, 0.6], [0.9, 0.6, 0.3],
    [0.5, 0.5, 0.5, 0.5], [0.1, 0.9, 0.2, 0.8, 0.3], [-0.2, -0.1, 0.05, 0.2],
    [0, 0, 0], [1, 2, 3, 4, 5, 6, 7], [NaN, 0.5, 0.6]
  ];
  for (const s of SERIES) {
    assert.deepStrictEqual(plain(W.brainTrend(s)), plain(brain.trend(s)), 'trend berpisah untuk ' + JSON.stringify(s));
  }
});

// =====================================================================================
// P3 — BISA MERAH
// =====================================================================================
test('P3 paritas MELEDAK saat satu konstanta worker dirusak', () => {
  const poisoned = WORKER_SOURCE.replace('const BRAIN_DISCRIMINATION=1.5;', 'const BRAIN_DISCRIMINATION=1.7;');
  assert.notStrictEqual(poisoned, WORKER_SOURCE, 'racun tidak tertanam - pola konstanta berubah?');
  const P = loadWorker(poisoned);
  assert.strictEqual(workerConst('BRAIN_DISCRIMINATION', poisoned), 1.7, 'pembaca konstanta tidak melihat racun');
  let diverged = false;
  for (const a of [0.5, 2.4, 4.75]) {
    if (P.brainSuccessProbability(a, 3) !== brain.successProbability(a, 3)) diverged = true;
  }
  assert.ok(diverged, 'cermin yang diracun tetap dinyatakan sama - detektor paritas tidak menguji apa pun');
});

test('P3 pembaca konstanta MELEDAK untuk nama yang tidak ada', () => {
  assert.throws(() => workerConst('BRAIN_TIDAK_ADA_KONSTANTA_INI'), /tidak ditemukan/);
});

// =====================================================================================
// P4 — EFEKTIVITAS KEBIJAKAN
// =====================================================================================
const outcome = (accuracy, targetAccuracy) => ({ accuracy, targetAccuracy: targetAccuracy === undefined ? null : targetAccuracy });

test('P4 dua titik BUKAN bukti arah (regresi dua titik selalu r2=1)', () => {
  const eff = W.policyEffectiveness([outcome(60, 80), outcome(90, 80)]);
  assert.strictEqual(eff.state, 'unknown', 'dua sesi tidak boleh melahirkan klaim arah');
  assert.strictEqual(eff.confidence, 0);
});

test('P4 basis residual dipilih saat >=60% sesi membawa target', () => {
  const rows = [outcome(70, 80), outcome(78, 80), outcome(86, 80), outcome(60, null)];
  const eff = W.policyEffectiveness(rows);
  assert.strictEqual(eff.basis, 'residual');
  assert.strictEqual(eff.points, 3, 'baris tanpa target dilewati, bukan ditambal tebakan');
});

test('P4 basis akurasi saat target tidak tercatat', () => {
  const eff = W.policyEffectiveness([outcome(50), outcome(60), outcome(70), outcome(80)]);
  assert.strictEqual(eff.basis, 'accuracy');
  assert.strictEqual(eff.state, 'improving', 'naik 10 poin per sesi jelas di atas ambang 0.04');
});

test('P4 target tercapai persis berulang kali = plateau, bukan kemajuan', () => {
  const eff = W.policyEffectiveness([outcome(80, 80), outcome(80, 80), outcome(80, 80), outcome(80, 80)]);
  assert.strictEqual(eff.state, 'plateau', 'menempel di target bukan kemajuan');
});

test('P4 mengalahkan target makin jauh = improving', () => {
  const eff = W.policyEffectiveness([outcome(76, 80), outcome(82, 80), outcome(88, 80), outcome(94, 80)]);
  assert.strictEqual(eff.state, 'improving');
  assert.ok(eff.slope >= brain.MOMENTUM_RESIDUAL_SLOPE, 'slope harus melewati ambang naik');
});

test('P4 ambang turun ASIMETRIS: melorot landai yang rapi BUKAN declining', () => {
  /* Slope -0.04 per sesi dengan r2 sempurna: cukup untuk basis akurasi, TIDAK cukup untuk
   * basis residual - persis keasimetrisan yang dikalibrasi simulator B5 di sisi klien. */
  const eff = W.policyEffectiveness([outcome(84, 80), outcome(80, 80), outcome(76, 80), outcome(72, 80)]);
  assert.strictEqual(eff.r2, 1, 'deret ini memang garis lurus');
  assert.strictEqual(eff.state, 'plateau', 'kemunduran landai tidak boleh langsung dicap declining');
});

test('P4 kemunduran CURAM dan NYATA = declining', () => {
  const eff = W.policyEffectiveness([outcome(95, 80), outcome(85, 80), outcome(72, 80), outcome(58, 80)]);
  assert.strictEqual(eff.state, 'declining');
  assert.ok(eff.slope <= brain.MOMENTUM_RESIDUAL_DECLINE_SLOPE && eff.r2 >= brain.MOMENTUM_RESIDUAL_DECLINE_R2);
});

test('P4 deret DATAR: keyakinan datang dari jumlah titik, bukan dari r2=0', () => {
  /* Titik buta yang ditemukan gerbang ini: deret tanpa ragam ber-r2 0 menurut definisi, jadi
   * rumus keyakinan yang mengalikan r2 paling tidak yakin justru saat buktinya paling bersih. */
  const flat = W.policyEffectiveness([outcome(80, 80), outcome(80, 80), outcome(80, 80), outcome(80, 80)]);
  assert.strictEqual(flat.r2, 0, 'deret tanpa ragam memang ber-r2 nol');
  assert.strictEqual(flat.flat, true);
  assert.ok(flat.confidence >= 0.5, 'empat sesi identik adalah kemandekan paling pasti yang bisa diukur');
});

test('P4 tiga sesi datar MENYATAKAN mandek tapi belum cukup untuk BERTINDAK', () => {
  const three = W.policyEffectiveness([outcome(80, 80), outcome(80, 80), outcome(80, 80)]);
  assert.strictEqual(three.state, 'plateau');
  assert.strictEqual(three.flat, false, 'jalur datar butuh empat titik');
  assert.ok(three.confidence < 0.5, 'tiga titik tidak boleh cukup untuk menaikkan kesulitan');
});

test('P4 datar yang BERDERAU bukan deret datar', () => {
  const noisy = W.policyEffectiveness([outcome(80, 80), outcome(88, 80), outcome(72, 80), outcome(82, 80), outcome(78, 80)]);
  assert.strictEqual(noisy.state, 'plateau');
  assert.strictEqual(noisy.flat, false, 'sebaran 16 poin bukan "identik sampai pembulatan"');
  assert.ok(noisy.confidence < 0.5, 'derau tidak boleh dibaca sebagai kemandekan yang meyakinkan');
});

test('P4 bentuk keluaran SAMA di kedua cabang, termasuk deret yang terlalu pendek', () => {
  const short = W.policyEffectiveness([outcome(70, 80)]);
  const full = W.policyEffectiveness([outcome(70, 80), outcome(78, 80), outcome(86, 80)]);
  assert.deepStrictEqual(Object.keys(plain(short)).sort(), Object.keys(plain(full)).sort(),
    'cabang yang membuang satu field memaksa pemanggil menebak bentuknya');
  assert.strictEqual(short.flat, false);
});

test('P4 sesi tanpa akurasi tidak dihitung sebagai titik', () => {
  const eff = W.policyEffectiveness([{ accuracy: null, targetAccuracy: 80 }, outcome(70, 80), outcome(80, 80)]);
  assert.strictEqual(eff.points, 2);
  assert.strictEqual(eff.state, 'unknown');
});

// =====================================================================================
// P5 — REKONSTRUKSI RINGKASAN OTAK DI SISI SERVER
// =====================================================================================
const DIGEST_KEYS = ['schema', 'ability', 'abilityLevel', 'abilityConfidence', 'momentum', 'fatigue',
  'targetDifficulty', 'difficultyBand', 'sessionSize', 'reviewShare', 'pace', 'atRiskReviews', 'rootCauseSkill'];

test('P5 nol bukti = null, bukan ringkasan kosong yang lolos `if (brain)`', () => {
  assert.strictEqual(W.reconstructBrainDigest({ snapshot: {}, evidence: {}, outcomes: [] }), null);
});

test('P5 bentuk ringkasan server IDENTIK dengan kontrak ringkasan klien', () => {
  const digest = W.reconstructBrainDigest({
    snapshot: { totalAttempts: 120, estimatedLevel: 'B1', domains: { grammar: { attempts: 60, recentAccuracy: 62 }, reading: { attempts: 40, accuracy: 71 } } },
    evidence: { behavior: { abandonmentRate: 10, medianResponseMs: 9000 }, memory: { dueReviews: 20, highRiskCount: 7 } },
    outcomes: []
  });
  assert.ok(digest, 'ringkasan tidak terbentuk');
  assert.deepStrictEqual(Object.keys(digest).sort(), DIGEST_KEYS.slice().sort(), 'field ringkasan server berbeda dari kontrak');
  assert.strictEqual(digest.schema, 'fiezel-core-brain-v2');
});

test('P5 keyakinan cermin DIBATASI di bawah 1 walau buktinya melimpah', () => {
  const digest = W.reconstructBrainDigest({
    snapshot: { totalAttempts: 1000000, estimatedLevel: 'B2', domains: { grammar: { attempts: 5000, recentAccuracy: 80 } } },
    evidence: {}, outcomes: []
  });
  assert.ok(digest.abilityConfidence <= 0.85, 'keyakinan server harus tetap di bawah keyakinan klien penuh');
  assert.ok(digest.abilityConfidence > 0.25, 'bukti melimpah harus tetap melewati ambang pakai');
});

test('P5 kemampuan dibaca dari akurasi: akurasi tinggi -> kesulitan target naik', () => {
  const base = { totalAttempts: 200, estimatedLevel: 'B1' };
  const low = W.reconstructBrainDigest({ snapshot: { ...base, domains: { grammar: { attempts: 100, recentAccuracy: 40 } } }, evidence: {}, outcomes: [] });
  const high = W.reconstructBrainDigest({ snapshot: { ...base, domains: { grammar: { attempts: 100, recentAccuracy: 92 } } }, evidence: {}, outcomes: [] });
  assert.ok(high.ability > low.ability, 'akurasi 92% harus membaca kemampuan lebih tinggi daripada 40%');
  assert.ok(high.targetDifficulty >= low.targetDifficulty, 'kesulitan target harus ikut arah kemampuan');
});

test('P5 akurasi gabungan DITIMBANG jumlah percobaan, bukan rata-rata polos', () => {
  const many = W.reconstructBrainDigest({
    snapshot: { totalAttempts: 210, estimatedLevel: 'B1', domains: { grammar: { attempts: 200, recentAccuracy: 45 }, reading: { attempts: 10, recentAccuracy: 95 } } },
    evidence: {}, outcomes: []
  });
  const flat = W.reconstructBrainDigest({
    snapshot: { totalAttempts: 210, estimatedLevel: 'B1', domains: { grammar: { attempts: 105, recentAccuracy: 45 }, reading: { attempts: 105, recentAccuracy: 95 } } },
    evidence: {}, outcomes: []
  });
  assert.ok(many.ability < flat.ability, '200 soal berakurasi 45% tidak boleh kalah suara oleh 10 soal berakurasi 95%');
});

test('P5 highRiskCount akhirnya DIPAKAI: porsi review naik, bukan diabaikan', () => {
  const snapshot = { totalAttempts: 200, estimatedLevel: 'B1', domains: { grammar: { attempts: 100, recentAccuracy: 70 } } };
  const calm = W.reconstructBrainDigest({ snapshot, evidence: { memory: { dueReviews: 30, highRiskCount: 0 } }, outcomes: [] });
  const risky = W.reconstructBrainDigest({ snapshot, evidence: { memory: { dueReviews: 30, highRiskCount: 12 } }, outcomes: [] });
  assert.strictEqual(calm.atRiskReviews, 0);
  assert.strictEqual(risky.atRiskReviews, 12);
  assert.ok(risky.reviewShare > calm.reviewShare, '12 materi di ambang lupa harus menaikkan porsi review');
  assert.ok(risky.reviewShare >= 0.55, 'atRisk >= 6 mencermin lantai 0.55 planSession');
});

test('P5 kelelahan dibaca dari tempo jawab dan sesi yang ditinggalkan', () => {
  const snapshot = { totalAttempts: 200, estimatedLevel: 'B1', domains: { grammar: { attempts: 100, recentAccuracy: 70 } } };
  const fresh = W.reconstructBrainDigest({ snapshot, evidence: { behavior: { medianResponseMs: 5000, abandonmentRate: 0 } }, outcomes: [] });
  const tiring = W.reconstructBrainDigest({ snapshot, evidence: { behavior: { medianResponseMs: 17000, abandonmentRate: 0 } }, outcomes: [] });
  const spent = W.reconstructBrainDigest({ snapshot, evidence: { behavior: { medianResponseMs: 25000, abandonmentRate: 40 } }, outcomes: [] });
  assert.strictEqual(fresh.fatigue, 'fresh');
  assert.strictEqual(tiring.fatigue, 'tiring');
  assert.strictEqual(spent.fatigue, 'fatigued');
  assert.ok(spent.sessionSize <= 6, 'murid yang kelelahan mendapat sesi terpendek');
  assert.strictEqual(spent.pace, 'calm');
});

test('P5 akar masalah TIDAK ditebak dari daftar skill terlemah', () => {
  const digest = W.reconstructBrainDigest({
    snapshot: { totalAttempts: 200, estimatedLevel: 'B1', domains: { grammar: { attempts: 100, recentAccuracy: 40 } } },
    evidence: { skills: { weakest: [{ skill: 'third_conditional', type: 'grammar', attempts: 12, accuracy: 30, errorRate: 70, recurringErrors: 4 }] } },
    outcomes: []
  });
  assert.strictEqual(digest.rootCauseSkill, '', 'graf prasyarat tidak ada di server - diagnosis tidak boleh dikarang');
});

// =====================================================================================
// P6/P7/P8 — JALUR KEBIJAKAN UTUH
// =====================================================================================
const SNAPSHOT = { adaptiveReady: true, totalAttempts: 160, estimatedLevel: 'B1', dueReviews: 8, domains: { grammar: { attempts: 90, recentAccuracy: 58 }, reading: { attempts: 40, recentAccuracy: 74 }, vocabulary: { attempts: 30, recentAccuracy: 81 } } };
const EVIDENCE = { behavior: { consistency14d: 60, abandonmentRate: 8, medianResponseMs: 9000 }, memory: { dueReviews: 8, maxForgettingRisk: 40, highRiskCount: 5 }, skills: { measured: 12, weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 14, accuracy: 44, errorRate: 56, recurringErrors: 3 }] } };
const CLIENT_DIGEST = { schema: 'fiezel-core-brain-v2', ability: 2.9, abilityLevel: 'B1', abilityConfidence: 0.8, momentum: 'improving', fatigue: 'fresh', targetDifficulty: 4, difficultyBand: 'stretch', sessionSize: 14, reviewShare: 0.3, pace: 'normal', atRiskReviews: 2, rootCauseSkill: 'past_perfect' };

test('P6 ringkasan klien yang YAKIN tidak pernah dikalahkan cermin server', () => {
  const resolved = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: [], clientBrain: CLIENT_DIGEST, now: Date.parse('2026-08-28T03:00:00Z') });
  assert.strictEqual(resolved.brainSource, 'client');
  assert.strictEqual(resolved.policy.targetSkill, 'past_perfect', 'akar masalah milik klien harus menang');
  assert.ok(resolved.policy.rationaleCodes.includes('brain_root_cause'));
});

test('P6 ringkasan klien yang RAGU digantikan cermin server', () => {
  const timid = { ...CLIENT_DIGEST, abilityConfidence: 0.1 };
  const resolved = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: [], clientBrain: timid, now: Date.parse('2026-08-28T03:00:00Z') });
  assert.strictEqual(resolved.brainSource, 'server-reconstructed');
  assert.notStrictEqual(resolved.policy.targetSkill, 'past_perfect', 'akar masalah dari ringkasan yang ragu tidak boleh dipakai');
});

test('P6 brainSource melaporkan yang DIPAKAI, bukan yang sempat dihitung', () => {
  /* Bukti tipis: ringkasan tetap lahir, tetapi refinePolicyWithBrain() tidak mengambil satu
   * keputusan pun di bawah ambang - jadi melaporkannya sebagai sumber akan menyesatkan tepat
   * orang yang membaca field ini untuk mencari tahu kenapa kebijakan terlihat tumpul. */
  const thin = { adaptiveReady: false, totalAttempts: 4, estimatedLevel: 'A1', domains: { grammar: { attempts: 4, recentAccuracy: 50 } } };
  const resolved = W.resolveAdaptivePolicyServerSide({ snapshot: thin, evidence: {}, outcomes: [], clientBrain: null, now: Date.parse('2026-08-28T03:00:00Z') });
  assert.ok(resolved.brain, 'ringkasan tetap dihitung');
  assert.ok(resolved.brain.abilityConfidence < 0.25, 'empat percobaan tidak boleh melahirkan keyakinan');
  assert.strictEqual(resolved.brainSource, 'none', 'ringkasan yang tidak dipakai tidak boleh dilaporkan sebagai sumber');
  assert.ok(!resolved.policy.rationaleCodes.includes('brain_optimal_challenge'), 'bukti tipis berarti hanya melapor, bukan memutuskan');
});

test('P7 REGRESI YANG DITUTUP: tanpa `brain`, kebijakan tidak lagi jatuh ke v1 polos', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  const raw = W.deriveAdaptivePolicy({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: [], now });
  const resolved = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: [], clientBrain: null, now });
  assert.strictEqual(resolved.brainSource, 'server-reconstructed');
  assert.ok(resolved.policy.rationaleCodes.includes('brain_optimal_challenge'), 'kebijakan tanpa ringkasan klien tetap harus melewati model kemampuan');
  assert.notDeepStrictEqual(resolved.policy.rationaleCodes, raw.rationaleCodes, 'kebijakan cermin tidak boleh identik dengan lapisan v1 polos');
});

test('P7 mode dan pagar keselamatan v1 TETAP dipegang v1', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  const fragile = { ...EVIDENCE, behavior: { consistency14d: 10, abandonmentRate: 45, medianResponseMs: 22000 } };
  const resolved = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: fragile, outcomes: [], clientBrain: null, now });
  assert.strictEqual(resolved.policy.mode, 'recovery', 'cermin tidak boleh menghapus mode pemulihan milik v1');
  assert.strictEqual(resolved.policy.avoidNewContent, true);
  assert.strictEqual(resolved.policy.pace, 'calm');
});

test('P7 tren efektivitas menurun menurunkan kesulitan SEKALI, bukan dua kali', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  const declining = [
    { schema: 'fiezel-policy-outcome-v1', outcomeId: 'o1', sessionId: 's1', accuracy: 95, targetAccuracy: 80, status: 'positive', recommendation: 'keep_or_progress' },
    { schema: 'fiezel-policy-outcome-v1', outcomeId: 'o2', sessionId: 's2', accuracy: 85, targetAccuracy: 80, status: 'mixed', recommendation: 'adjust' },
    { schema: 'fiezel-policy-outcome-v1', outcomeId: 'o3', sessionId: 's3', accuracy: 72, targetAccuracy: 80, status: 'mixed', recommendation: 'adjust' },
    { schema: 'fiezel-policy-outcome-v1', outcomeId: 'o4', sessionId: 's4', accuracy: 58, targetAccuracy: 80, status: 'negative', recommendation: 'reduce_load' }
  ];
  const withTrend = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: declining, clientBrain: null, now });
  const noTrend = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: declining.slice(-1), clientBrain: null, now });
  assert.strictEqual(withTrend.effectiveness.state, 'declining');
  assert.ok(withTrend.policy.rationaleCodes.includes('policy_effect_declining'));
  assert.ok(withTrend.policy.rationaleCodes.includes('recent_policy_outcome_negative'));
  assert.strictEqual(withTrend.policy.targetDifficulty, noTrend.policy.targetDifficulty,
    'hasil terakhir sudah menurunkan kesulitan - tren yang sama tidak boleh menurunkannya lagi');
});

test('P7 kemandekan yang meyakinkan memecah kebuntuan HANYA pada mode balance', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  const flat = [80, 80, 80, 80, 80].map((a, i) => ({ schema: 'fiezel-policy-outcome-v1', outcomeId: 'p' + i, sessionId: 'ps' + i, accuracy: a, targetAccuracy: 80, status: 'mixed', recommendation: 'adjust' }));
  const steady = { ...EVIDENCE, skills: { measured: 12, weakest: [] }, memory: { dueReviews: 0, maxForgettingRisk: 0, highRiskCount: 0 } };
  const balanced = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: steady, outcomes: flat, clientBrain: null, now });
  assert.strictEqual(balanced.policy.mode, 'balance');
  assert.strictEqual(balanced.effectiveness.state, 'plateau');
  assert.ok(balanced.policy.rationaleCodes.includes('policy_effect_plateau_break'), 'mandek yang meyakinkan harus mengubah kesulitan, bukan mengulang lebih banyak');

  const fragile = { ...steady, behavior: { consistency14d: 10, abandonmentRate: 45, medianResponseMs: 22000 } };
  const recovery = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: fragile, outcomes: flat, clientBrain: null, now });
  assert.strictEqual(recovery.policy.mode, 'recovery');
  assert.ok(!recovery.policy.rationaleCodes.includes('policy_effect_plateau_break'), 'ritme yang rapuh bukan tempat menaikkan kesulitan');
});

test('P7 label pita DIHITUNG ULANG sesudah kesulitan digeser, tidak diwarisi', () => {
  /* Batas yang sama sudah ditulis di difficultyBand() sisi klien: memakai label dari jendela
   * awal berarti sesi yang sengaja diturunkan tetap berbunyi "stretch" kepada murid. */
  const window_ = brain.challengeWindow(4.097);
  for (const [from, to] of [[3, 4], [4, 3], [2, 1], [5, 6]]) {
    const shifted = W.shiftedDifficultyBand('standard', from, to, { ability: 4.097 });
    assert.strictEqual(shifted, brain.difficultyBand(to, window_), `pita untuk kesulitan ${to} tidak dihitung dari jendela murid`);
  }
  assert.strictEqual(W.shiftedDifficultyBand('stretch', 3, 3, { ability: 4.097 }), 'stretch', 'tanpa pergeseran, label tidak boleh berubah');
});

test('P7 tanpa ringkasan otak, label pita tetap bergerak SEARAH keputusan', () => {
  assert.strictEqual(W.shiftedDifficultyBand('stretch', 4, 3, null), 'standard', 'kesulitan turun, label harus ikut turun');
  assert.strictEqual(W.shiftedDifficultyBand('standard', 3, 4, null), 'stretch');
  assert.strictEqual(W.shiftedDifficultyBand('foundation', 2, 1, null), 'foundation', 'label tidak boleh keluar dari ujung skala');
  assert.strictEqual(W.shiftedDifficultyBand('stretch', 5, 6, null), 'stretch');
});

test('P7 pemecah kemandekan yang menaikkan kesulitan tidak meninggalkan label basi', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  const flat = [80, 80, 80, 80, 80].map((a, i) => ({ schema: 'fiezel-policy-outcome-v1', outcomeId: 'b' + i, sessionId: 'bs' + i, accuracy: a, targetAccuracy: 80, status: 'mixed', recommendation: 'adjust' }));
  const steady = { ...EVIDENCE, skills: { measured: 12, weakest: [] }, memory: { dueReviews: 0, maxForgettingRisk: 0, highRiskCount: 0 } };
  const r = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: steady, outcomes: flat, clientBrain: null, now });
  assert.ok(r.policy.rationaleCodes.includes('policy_effect_plateau_break'));
  assert.strictEqual(r.policy.difficultyBand, brain.difficultyBand(r.policy.targetDifficulty, brain.challengeWindow(r.brain.ability)),
    'label pita kebijakan akhir harus cocok dengan kesulitan akhirnya');
});

test('P7 estimatedMinutes tetap konsisten dengan sessionSize dan pace sesudah koreksi', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  for (const outcomes of [[], [{ schema: 'fiezel-policy-outcome-v1', outcomeId: 'x', sessionId: 'y', accuracy: 40, targetAccuracy: 80, status: 'negative', recommendation: 'reduce_load' }]]) {
    const r = W.resolveAdaptivePolicyServerSide({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes, clientBrain: null, now });
    const expected = Math.max(5, Math.round(r.policy.sessionSize * (r.policy.pace === 'calm' ? 1.25 : 1)));
    assert.strictEqual(r.policy.estimatedMinutes, expected, 'menit perkiraan berpisah dari ukuran sesi');
    assert.ok(r.policy.sessionSize >= 5 && r.policy.sessionSize <= 16, 'ukuran sesi keluar batas');
    assert.ok(r.policy.targetDifficulty >= 1 && r.policy.targetDifficulty <= 6, 'kesulitan keluar batas');
    assert.ok(r.policy.reviewShare >= 0 && r.policy.reviewShare <= 1, 'porsi review keluar batas');
  }
});

const POLICY_FIELDS = ['policyId', 'mode', 'sessionSize', 'estimatedMinutes', 'targetDifficulty', 'difficultyBand', 'reviewShare', 'pace', 'avoidNewContent', 'targetSkill', 'primaryDomain'];

/**
 * Menjalankan KEDUA rute atas badan permintaan yang sama, lalu membongkar kebijakan yang
 * benar-benar DIBAWA prompt pelatih - bukan kebijakan yang dikirim klien, yang memang tidak
 * dipercaya worker dan dihitung ulang.
 */
async function bothRoutes(body) {
  const routes = W.__routes;
  let coachPrompt = '';
  const user = {
    puter: {
      auth: { getUser: async () => ({ uuid: 'murid-uuid', username: 'Jahran' }) },
      ai: { chat: async msgs => { coachPrompt = JSON.stringify(msgs); return { message: { content: 'aman' } } } }
    }
  };
  const request = () => ({ json: async () => body, headers: { get: () => '' } });
  const policyResponse = await routes.POST.get('/api/policy/next')({ request: request(), user });
  const coachResponse = await routes.POST.get('/api/coach/context')({ request: request(), user });
  assert.strictEqual(coachResponse.text, 'aman', 'jalur pelatih gagal');
  assert.ok(policyResponse.policy, 'kebijakan tidak terbentuk');
  const userTurn = JSON.parse(coachPrompt).find(m => m.role === 'user');
  assert.ok(userTurn, 'prompt pelatih tidak memuat giliran user');
  const MARKER = 'Use only this bounded evidence JSON as evidence: ';
  const from = userTurn.content.indexOf(MARKER);
  const to = userTurn.content.indexOf('. Write ');
  assert.ok(from !== -1 && to > from, 'bentuk prompt pelatih berubah - penanda bukti tidak ditemukan');
  const carried = JSON.parse(userTurn.content.slice(from + MARKER.length, to));
  return { policy: policyResponse.policy, response: policyResponse, coachPolicy: carried.policy, carried };
}

test('P8 pelatih menjelaskan kebijakan yang SAMA - TANPA ringkasan klien', async () => {
  const { policy, response, coachPolicy } = await bothRoutes({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: [] });
  for (const key of POLICY_FIELDS) {
    assert.deepStrictEqual(coachPolicy[key], policy[key], `pelatih menjelaskan ${key} yang berbeda dari kebijakan murid`);
  }
  assert.ok(coachPolicy.rationaleCodes.includes('brain_optimal_challenge'), 'kebijakan yang dijelaskan pelatih harus sudah lewat Core Brain');
  assert.strictEqual(response.brainSource, 'server-reconstructed');
  assert.strictEqual(response.effectiveness.schema, 'fiezel-policy-effectiveness-v1');
});

test('P8 pelatih menjelaskan kebijakan yang SAMA - DENGAN ringkasan klien', async () => {
  /* Kasus inilah yang benar-benar gigit. Kalau satu rute melihat `brain` dan satunya tidak,
   * keduanya berangkat dari masukan berbeda dan pelatih kembali menjelaskan rencana yang
   * bukan rencana murid - cacat yang sama, hanya berpindah rute. */
  const { policy, response, coachPolicy } = await bothRoutes({ snapshot: SNAPSHOT, evidence: EVIDENCE, outcomes: [], brain: CLIENT_DIGEST });
  assert.strictEqual(response.brainSource, 'client', 'ringkasan klien yang yakin harus dipakai');
  for (const key of POLICY_FIELDS) {
    assert.deepStrictEqual(coachPolicy[key], policy[key], `pelatih menjelaskan ${key} yang berbeda dari kebijakan murid`);
  }
  assert.strictEqual(coachPolicy.targetSkill, 'past_perfect', 'akar masalah milik klien harus sampai ke pelatih juga');
});

test('P8 batas kode alasan klien tidak lebih kecil daripada batas worker', () => {
  /* Kalau klien memotong lebih pendek daripada worker, yang terbuang SELALU kode terakhir -
   * dan kode terakhir selalu milik Core Brain, karena lapisan v1 mengisi daftar lebih dulu.
   * Akibatnya bukan keputusan yang salah (semuanya sudah terpanggang di field kebijakan)
   * melainkan penjelasan yang hilang tepat pada murid yang paling banyak masalahnya. */
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const clientCap = /const POLICY_RATIONALE_CODE_CAP=(\d+)/.exec(app);
  assert.ok(clientCap, 'batas kode alasan klien tidak ditemukan sebagai konstanta bernama');
  const workerCaps = [...WORKER_SOURCE.matchAll(/rationaleCodes=codes\.slice\(0,(\d+)\)/g)].map(m => Number(m[1]));
  assert.ok(workerCaps.length >= 2, 'batas kode alasan worker tidak ditemukan');
  const workerCap = Math.max(...workerCaps);
  assert.ok(Number(clientCap[1]) >= workerCap,
    `klien memotong kode alasan di ${clientCap[1]} sementara worker mengirim sampai ${workerCap} - selisihnya membuang alasan Core Brain diam-diam`);
  assert.ok(new Set(workerCaps).size === 1, 'dua tempat di worker memakai batas berbeda: ' + JSON.stringify(workerCaps));
});

test('P8 jalur penuh: kebijakan tersibuk pun tidak kehilangan alasan Core Brain di klien', () => {
  const now = Date.parse('2026-08-28T03:00:00Z');
  const busySnapshot = { adaptiveReady: true, totalAttempts: 300, estimatedLevel: 'B1', dueReviews: 40, domains: { grammar: { attempts: 120, recentAccuracy: 35 }, reading: { attempts: 60, recentAccuracy: 40 }, vocabulary: { attempts: 60, recentAccuracy: 45 } } };
  const busyEvidence = { behavior: { consistency14d: 12, abandonmentRate: 40, medianResponseMs: 24000 }, memory: { dueReviews: 40, maxForgettingRisk: 90, highRiskCount: 20 }, confidence: { evidence: 30, gap: 60 }, skills: { measured: 20, weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 20, accuracy: 30, errorRate: 70, recurringErrors: 5 }] } };
  const busyOutcomes = [95, 85, 72, 58].map((a, i) => ({ schema: 'fiezel-policy-outcome-v1', outcomeId: 'busy' + i, sessionId: 'busys' + i, accuracy: a, targetAccuracy: 80, status: i === 3 ? 'negative' : 'mixed', recommendation: i === 3 ? 'reduce_load' : 'adjust' }));
  const r = W.resolveAdaptivePolicyServerSide({ snapshot: busySnapshot, evidence: busyEvidence, outcomes: busyOutcomes, clientBrain: null, now });
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const cap = Number(/const POLICY_RATIONALE_CODE_CAP=(\d+)/.exec(app)[1]);
  const survivors = r.policy.rationaleCodes.slice(0, cap);
  assert.ok(r.policy.rationaleCodes.length >= 10, 'kasus ini memang harus menghasilkan daftar kode yang panjang');
  assert.ok(survivors.some(c => c.startsWith('brain_')), 'alasan Core Brain terbuang oleh batas klien');
  assert.deepStrictEqual(survivors, r.policy.rationaleCodes, 'batas klien masih memotong kebijakan tersibuk');
});

test('P8 klien BENAR-BENAR mengirim ringkasan otak ke jalur pelatih', () => {
  /* Dua uji di atas membuktikan worker konsisten SELAMA kedua rute menerima masukan yang
   * sama. Yang membuat masukannya sama adalah app.js - dan sampai m025-180 ia hanya
   * mengirim `brain` ke /api/policy/next, jadi konsistensi worker saja tidak cukup untuk
   * menjamin pelatih menjelaskan rencana yang benar di perangkat sungguhan. */
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const call = app.indexOf("coreWorkerExec('/api/coach/context'");
  assert.ok(call !== -1, 'pemanggilan /api/coach/context tidak ditemukan di app.js');
  const payload = app.slice(call, call + 400);
  assert.ok(/body:JSON\.stringify\(\{[^}]*\bbrain\b/.test(payload), 'payload pelatih tidak membawa ringkasan otak');
  assert.ok(/brain=coreBrainDigest\(\)/.test(app.slice(Math.max(0, call - 3000), call)), 'ringkasan otak jalur pelatih tidak dihitung dari coreBrainDigest()');
});

test('P8 /health mengumumkan kedua kemampuan baru', async () => {
  const health = await W.__routes.GET.get('/health')({ request: { headers: { get: () => '' } } });
  assert.ok(health.capabilities.includes('policy-effectiveness-v1'), 'kemampuan efektivitas kebijakan tidak diumumkan');
  assert.ok(health.capabilities.includes('server-brain-mirror-v1'), 'kemampuan cermin otak tidak diumumkan');
});

// =====================================================================================
// PRIVASI — cermin ini tidak boleh menjadi pintu belakang bagi data mentah
// =====================================================================================
test('privasi: field mentah yang diselipkan ke masukan tidak pernah muncul di ringkasan', () => {
  const digest = W.reconstructBrainDigest({
    snapshot: { totalAttempts: 200, estimatedLevel: 'B1', domains: { grammar: { attempts: 100, recentAccuracy: 70 } }, rawHistory: ['SHOULD_NOT_SURVIVE'] },
    evidence: { memory: { highRiskCount: 3 }, rawAnswers: ['SHOULD_NOT_SURVIVE'], learnerName: 'SHOULD_NOT_SURVIVE' },
    outcomes: [{ accuracy: 70, targetAccuracy: 80, rawAnswers: ['SHOULD_NOT_SURVIVE'] }]
  });
  assert.ok(!JSON.stringify(digest).includes('SHOULD_NOT_SURVIVE'), 'ringkasan server membocorkan field mentah');
});

run();
