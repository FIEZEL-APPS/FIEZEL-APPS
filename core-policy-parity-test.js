#!/usr/bin/env node
/**
 * GERBANG PARITAS KEBIJAKAN INTI (core-policy-parity-test.js) — m025-201
 *
 * ==========================================================================
 * KENAPA BERKAS INI ADA
 * ==========================================================================
 * Kebijakan belajar FIEZEL ditulis DUA KALI: sekali di `app.js` (dipakai saat
 * offline / Core Worker mati) dan sekali di `fiezel-core-worker.js` (dipakai
 * saat murid online). Dua salinan yang seharusnya identik, tanpa satu pun
 * gerbang yang membandingkannya — jadi setiap perbaikan yang hanya mendarat di
 * satu sisi menghasilkan murid yang mendapat rencana berbeda tergantung ada
 * tidaknya sinyal, dan TIDAK ADA yang bisa melihatnya. Audit m025-201
 * menemukan lima celah yang lahir persis dari kelas itu:
 *
 *   (1) otak tidak bernalar di sisi server — kalau ringkasan Core Brain dari
 *       perangkat murid tidak sampai, kebijakan jatuh PENUH ke lapisan v1,
 *       sehingga menyalakan Core Worker bisa membuat murid dapat kebijakan
 *       lebih tumpul daripada kalau ia offline;
 *   (2) pelatih AI menjelaskan rencana yang bukan rencana murid —
 *       `/api/policy/next` memakai kebijakan yang sudah lewat lapisan otak,
 *       `/api/coach/context` memakai `deriveAdaptivePolicy` MENTAH, padahal
 *       system prompt-nya sendiri memerintahkan agar kebijakan deterministik
 *       yang berwenang dan pelatih hanya menjelaskannya;
 *   (3) `highRiskCount` dikirim murid dan tidak pernah dibaca — kebijakan cuma
 *       melihat panjang antrean jatuh tempo, bukan berapa materi yang
 *       benar-benar rawan lupa;
 *   (4) alasan Core Brain terpotong sebelum sampai ke layar — Worker mengirim
 *       sampai 12 kode, klien memotong di 8, dan pemotongannya POSISIONAL
 *       sehingga yang terbuang selalu `brain_*`;
 *   (5) sepuluh hasil kebijakan di KV dipakai untuk satu hal saja — hanya label
 *       sesi terakhir yang dibaca.
 *
 * Gerbang ini menutup kelas cacatnya, bukan cuma kelima instansinya:
 *
 *   P — PARITAS. `deriveAdaptivePolicy` di kedua sisi dijalankan atas matriks
 *       skenario yang sama dan hasilnya dituntut IDENTIK sampai ke seluruh
 *       bidang, termasuk judul/ringkasan/langkah (naskah id memang byte-identik
 *       dengan naskah Worker — kalau salah satunya bergeser, gerbang merah).
 *   R — RUTE. Tidak ada rute Worker yang boleh memanggil `deriveAdaptivePolicy`
 *       langsung; semuanya wajib lewat `resolvePolicyForRequest`, supaya celah
 *       (2) tidak bisa lahir kembali dari rute BARU yang belum ada hari ini.
 *   S — SINYAL. `highRiskCount` dan `todayAttempts` wajib benar-benar MENGUBAH
 *       keluaran, dibuktikan dengan dua masukan yang hanya berbeda di sinyal itu.
 *   K — KODE. Pemotong kode rasional wajib berprioritas dan berkapasitas sama
 *       di app.js, Worker, dan features/brain/fiezel-core-brain.js.
 *   T — TREN. Efektivitas kebijakan wajib dihitung atas SELURUH riwayat, dan
 *       ambangnya wajib menolak sampel kecil.
 *   M — CERMIN. Cermin server wajib menyala saat ringkasan otak tidak ada,
 *       wajib PADAM saat ringkasan otak sah ada (supaya tidak menghitung ganda),
 *       dan wajib tidak pernah mengaku `brain_`.
 *
 * BUKTI-BISA-MERAH. Setiap detektor di atas dijalankan sekali lagi terhadap
 * salinan sumber yang SENGAJA DIRUSAK di memori (bukan di disk), dan gerbang
 * menuntut detektornya MERAH. Gerbang yang tidak pernah dibuktikan bisa merah
 * adalah gerbang yang tidak diketahui menguji apa pun.
 *
 * NOL JARINGAN, NOL TULIS BERKAS. app.js dijalankan di `vm` dengan DOM/localStorage
 * tiruan (pola adaptive-policy-test.js); Worker dijalankan di `vm` dengan router/KV
 * tiruan (pola core-worker-contract-test.js).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = __dirname;
let failures = 0;
const results = [];
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); results.push([name, true]); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); results.push([name, false]); }
}
/* Uji yang menembak rute Worker sungguhan bersifat async. Ia DITUNDA lalu ditunggu di ujung
   berkas: uji async yang dijalankan lewat test() sinkron akan lulus tanpa pernah dinilai —
   dan gerbang yang paling berbahaya adalah gerbang yang hijau karena tidak sempat memeriksa. */
const deferred = [];
function testAsync(name, fn) { deferred.push([name, fn]); }

// ==========================================================================
// 1. WORKER di dalam vm (router + KV tiruan)
// ==========================================================================
const workerSource = fs.readFileSync(path.join(root, 'fiezel-core-worker.js'), 'utf8');
function bootWorker(source) {
  const routes = { GET: new Map(), POST: new Map() }, store = new Map();
  const router = { get: (p, f) => routes.GET.set(p, f), post: (p, f) => routes.POST.set(p, f) };
  const kv = {
    get: async k => store.get(k),
    set: async (k, v) => { store.set(k, v); return true; },
    list: async ({ pattern = '', returnValues = false } = {}) => {
      const prefix = pattern.replace('*', '');
      return [...store.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, value]) => (returnValues ? { key, value } : { key }));
    }
  };
  const me = { puter: { kv, auth: { getUser: async () => ({ uuid: 'owner-uuid', username: 'owner' }) } } };
  const context = { router, me, Response, Intl, Date, Math, console, crypto: require('crypto').webcrypto, TextEncoder, TextDecoder };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'fiezel-core-worker.js' });
  return { context, routes, store };
}
const W = bootWorker(workerSource);

// ==========================================================================
// 2. app.js di dalam vm (DOM + localStorage tiruan, pola adaptive-policy-test.js)
// ==========================================================================
function bootApp() {
  const store = {}, els = {};
  const el = id => els[id] || (els[id] = { id, innerHTML: '', textContent: '', classList: { add() {}, remove() {}, toggle() {} }, style: {}, append() {}, appendChild() {}, addEventListener() {}, focus() {} });
  const document = {
    baseURI: 'http://localhost/', getElementById: el, querySelectorAll: () => [], querySelector: () => null,
    createElement: () => ({ classList: { add() {}, remove() {} }, append() {}, appendChild() {}, addEventListener() {} }),
    addEventListener() {}, body: { classList: { add() {}, remove() {}, toggle() {} } }
  };
  const localStorage = {
    getItem: k => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k]
  };
  const fetch = async u => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, String(u).split('/').pop()), 'utf8')) });
  const context = {
    console, document, localStorage, fetch, location: { href: 'http://localhost/' }, navigator: {}, window: null, self: null,
    Date, Intl, Math, URL, Error, Promise, setTimeout, clearTimeout, setInterval: () => ({ unref() {} }), clearInterval() {},
    Notification: { permission: 'denied' }, SpeechSynthesisUtterance: function () {}, speechSynthesis: { cancel() {}, speak() {} }
  };
  context.window = context; context.self = context; context.window.scrollTo = () => {};
  vm.createContext(context);
  // Runtime i18n + naskah id WAJIB dimuat lebih dulu: app.js memanggil FiezelI18n.t saat
  // evaluasi. Naskah id inilah yang paritasnya diuji terhadap string Worker.
  const i18n = path.join(root, 'features', 'i18n', 'fiezel-i18n.js');
  if (fs.existsSync(i18n)) {
    vm.runInContext(fs.readFileSync(i18n, 'utf8'), context, { filename: 'fiezel-i18n.js' });
    for (const n of fs.readdirSync(path.join(root, 'features', 'i18n')).filter(x => /^copy-id-.*\.js$/.test(x)).sort()) {
      vm.runInContext(fs.readFileSync(path.join(root, 'features', 'i18n', n), 'utf8'), context, { filename: n });
    }
  }
  vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), context, { filename: 'app.js' });
  return context;
}
const APP = bootApp();
const A = APP.__fiezelAudit;

/**
 * Nilai yang lahir di dalam `vm` memakai Array.prototype milik realm-nya sendiri, dan
 * assert.deepStrictEqual membandingkan prototipe. Tanpa penyalinan ini gerbang bisa MERAH
 * karena realm, bukan karena isi — kegagalan yang menyesatkan lebih buruk daripada tidak
 * ada gerbang, karena ia mengirim pembacanya ke arah yang salah.
 */
const host = list => Array.prototype.slice.call(list);

// ==========================================================================
// 3. MATRIKS SKENARIO — dipakai ulang oleh seluruh pemeriksaan paritas.
//    `now` dipaku supaya policyId/generatedAt deterministik di kedua sisi.
// ==========================================================================
const NOW = Date.parse('2026-08-30T09:00:00Z');
const outcome = (o) => Object.assign({
  schema: 'fiezel-policy-outcome-v1', outcomeId: 'o-' + Math.random().toString(36).slice(2, 8), sessionId: 's-1',
  policyId: 'p-1', evaluatedAt: new Date(NOW).toISOString(), policyMode: 'repair', targetSkill: 'present_perfect',
  primaryDomain: 'grammar', completed: true, abandoned: false, planned: 10, answered: 10, completionRate: 100,
  accuracy: 60, targetAttempts: 6, targetAccuracy: 60, targetAdherence: 100, medianResponseMs: 8000,
  confidenceGap: 10, masteryBefore: 40, masteryAfter: 45, masteryDelta: 5, baselineTargetAccuracy: 55,
  accuracyDelta: 5, score: 60, status: 'mixed', recommendation: 'adjust',
  privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false }
}, o);

const declineRun = [82, 74, 66, 58, 44, 36].map((score, i) =>
  outcome({ outcomeId: 'dec-' + i, sessionId: 'sd-' + i, score, status: 'mixed' }));
const climbRun = [30, 38, 46, 58, 70, 78].map((score, i) =>
  outcome({ outcomeId: 'inc-' + i, sessionId: 'si-' + i, score, status: 'mixed' }));

const SCENARIOS = [
  {
    name: 'diagnostic — murid baru, nol bukti',
    snapshot: { adaptiveReady: false, totalAttempts: 0, estimatedLevel: 'A1', domains: {} },
    evidence: { behavior: {}, memory: {}, confidence: {}, skills: { weakest: [] } }, outcomes: []
  },
  {
    name: 'review — antrean pendek, risiko tinggi (highRiskCount dilaporkan)',
    snapshot: { adaptiveReady: true, totalAttempts: 90, estimatedLevel: 'B1', dueReviews: 6, domains: { grammar: { attempts: 40, accuracy: 52, recentAccuracy: 48 }, vocabulary: { attempts: 25, accuracy: 78 }, reading: { attempts: 20, accuracy: 72 } } },
    evidence: { behavior: { consistency14d: 55, abandonmentRate: 10, medianResponseMs: 7000, todayAttempts: 4, activeDays14: 8 }, confidence: { evidence: 20, gap: 12 }, memory: { dueReviews: 6, maxForgettingRisk: 84, highRiskCount: 5 }, skills: { measured: 6, recurringErrorSkills: 2, weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 12, accuracy: 42, errorRate: 58, recurringErrors: 3 }] } },
    outcomes: []
  },
  {
    name: 'review — antrean PANJANG tapi hampir semua aman (celah 3)',
    snapshot: { adaptiveReady: true, totalAttempts: 200, estimatedLevel: 'B1', dueReviews: 100, domains: { grammar: { attempts: 80, accuracy: 74, recentAccuracy: 76 }, vocabulary: { attempts: 60, accuracy: 82 }, reading: { attempts: 60, accuracy: 80 } } },
    evidence: { behavior: { consistency14d: 70, abandonmentRate: 5, medianResponseMs: 6000, todayAttempts: 6, activeDays14: 12 }, confidence: { evidence: 40, gap: 8 }, memory: { dueReviews: 100, maxForgettingRisk: 88, highRiskCount: 2 }, skills: { measured: 8, recurringErrorSkills: 0, weakest: [{ skill: 'articles', type: 'grammar', attempts: 10, accuracy: 74, errorRate: 26, recurringErrors: 0 }] } },
    outcomes: []
  },
  {
    name: 'recovery — sering ditinggalkan',
    snapshot: { adaptiveReady: true, totalAttempts: 60, estimatedLevel: 'A2', dueReviews: 2, domains: { grammar: { attempts: 30, accuracy: 40 }, reading: { attempts: 15, accuracy: 55 }, vocabulary: { attempts: 15, accuracy: 60 } } },
    evidence: { behavior: { consistency14d: 18, abandonmentRate: 48, medianResponseMs: 21000, todayAttempts: 2, activeDays14: 3 }, confidence: { evidence: 8, gap: 30 }, memory: { dueReviews: 2, maxForgettingRisk: 40, highRiskCount: 0 }, skills: { measured: 3, recurringErrorSkills: 1, weakest: [{ skill: 'past_simple', type: 'grammar', attempts: 9, accuracy: 38, errorRate: 62, recurringErrors: 2 }] } },
    outcomes: []
  },
  {
    name: 'repair — pola salah berulang, riwayat MENURUN (celah 5)',
    snapshot: { adaptiveReady: true, totalAttempts: 140, estimatedLevel: 'B1', dueReviews: 0, domains: { grammar: { attempts: 70, accuracy: 46, recentAccuracy: 44 }, vocabulary: { attempts: 40, accuracy: 80 }, reading: { attempts: 30, accuracy: 76 } } },
    evidence: { behavior: { consistency14d: 62, abandonmentRate: 8, medianResponseMs: 7500, todayAttempts: 5, activeDays14: 11 }, confidence: { evidence: 30, gap: 9 }, memory: { dueReviews: 0, maxForgettingRisk: 20, highRiskCount: 0 }, skills: { measured: 7, recurringErrorSkills: 2, weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 14, accuracy: 40, errorRate: 60, recurringErrors: 4 }] } },
    outcomes: declineRun
  },
  {
    name: 'balance — riwayat MENAIK',
    snapshot: { adaptiveReady: true, totalAttempts: 260, estimatedLevel: 'B2', dueReviews: 1, domains: { grammar: { attempts: 100, accuracy: 82, recentAccuracy: 84 }, vocabulary: { attempts: 90, accuracy: 86 }, reading: { attempts: 70, accuracy: 84 } } },
    evidence: { behavior: { consistency14d: 80, abandonmentRate: 4, medianResponseMs: 5200, todayAttempts: 7, activeDays14: 13 }, confidence: { evidence: 60, gap: 6 }, memory: { dueReviews: 1, maxForgettingRisk: 18, highRiskCount: 0 }, skills: { measured: 9, recurringErrorSkills: 0, weakest: [{ skill: 'conditionals', type: 'grammar', attempts: 12, accuracy: 82, errorRate: 18, recurringErrors: 0 }] } },
    outcomes: climbRun
  },
  {
    name: 'bukti lama — highRiskCount TIDAK dikirim sama sekali (kompatibilitas)',
    snapshot: { adaptiveReady: true, totalAttempts: 90, estimatedLevel: 'B1', dueReviews: 6, domains: { grammar: { attempts: 40, accuracy: 52 }, vocabulary: { attempts: 25, accuracy: 78 }, reading: { attempts: 20, accuracy: 72 } } },
    evidence: { behavior: { consistency14d: 55, abandonmentRate: 10, medianResponseMs: 7000 }, confidence: { evidence: 20, gap: 12 }, memory: { dueReviews: 6, maxForgettingRisk: 84 }, skills: { weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 12, accuracy: 42, errorRate: 58, recurringErrors: 3 }] } },
    outcomes: []
  }
];

// ==========================================================================
// P — PARITAS PENUH ANTARA app.js DAN fiezel-core-worker.js
// ==========================================================================
test('P1 · deriveAdaptivePolicy app.js dan Worker IDENTIK di seluruh matriks skenario', () => {
  for (const s of SCENARIOS) {
    const input = { snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW };
    const client = A.deriveAdaptivePolicy(input);
    const server = W.context.deriveAdaptivePolicy(input);
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(client)), JSON.parse(JSON.stringify(server)),
      'kebijakan berbeda antara klien dan Worker pada skenario: ' + s.name
    );
  }
});

test('P2 · paritas mencakup naskah (judul/ringkasan/cta/langkah), bukan cuma angka', () => {
  // Kalau naskah id bergeser sendirian, murid online dan murid offline membaca kalimat
  // berbeda untuk rencana yang sama. Diuji eksplisit supaya P1 tidak lulus hanya karena
  // kebetulan kedua sisi sama-sama kosong.
  const s = SCENARIOS[1];
  const client = A.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW });
  assert.ok(client.title && client.summary && client.cta, 'naskah kebijakan kosong — paritas jadi tidak berarti');
  assert.ok(Array.isArray(client.steps) && client.steps.length >= 2, 'langkah kebijakan kosong');
  const server = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW });
  assert.strictEqual(client.title, server.title, 'judul kebijakan berbeda');
  assert.strictEqual(client.summary, server.summary, 'ringkasan kebijakan berbeda');
  assert.deepStrictEqual(host(client.steps), host(server.steps), 'langkah kebijakan berbeda');
});

// ==========================================================================
// R — RUTE: satu jalan menuju kebijakan (celah 2)
// ==========================================================================
/** Ambil badan setiap `router.post('/…', …)` / `router.get(…)` dari sumber Worker. */
function workerRouteBodies(source) {
  const bodies = [];
  const re = /router\.(?:post|get)\(\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(source))) {
    const start = m.index;
    // Badan rute berakhir pada penanda rute berikutnya (atau akhir berkas).
    re.lastIndex = m.index + m[0].length;
    const nextIdx = source.slice(re.lastIndex).search(/router\.(?:post|get)\(\s*'/);
    const end = nextIdx === -1 ? source.length : re.lastIndex + nextIdx;
    bodies.push({ path: m[1], body: source.slice(start, end) });
  }
  return bodies;
}
function routesCallingDeriveDirectly(source) {
  return workerRouteBodies(source).filter(r => /\bderiveAdaptivePolicy\s*\(/.test(r.body)).map(r => r.path);
}
test('R1 · NOL rute Worker memanggil deriveAdaptivePolicy langsung — semua lewat resolvePolicyForRequest', () => {
  const offenders = routesCallingDeriveDirectly(workerSource);
  assert.deepStrictEqual(offenders, [],
    'rute ini memakai kebijakan MENTAH tanpa lapisan otak (celah 2 lahir kembali): ' + offenders.join(', '));
  const bodies = workerRouteBodies(workerSource);
  for (const p of ['/api/policy/next', '/api/coach/context']) {
    const r = bodies.find(x => x.path === p);
    assert.ok(r, 'rute hilang dari Worker: ' + p);
    assert.ok(/resolvePolicyForRequest\s*\(/.test(r.body), p + ' tidak memakai resolvePolicyForRequest');
    assert.ok(/boundedBrainDigest\s*\(\s*body\.brain\s*\)/.test(r.body), p + ' tidak menerima ringkasan otak dari murid');
  }
});

testAsync('R2 · pelatih dan pemilih kebijakan menghasilkan policyId YANG SAMA untuk murid yang sama', async () => {
  // Inti celah 2 diuji sebagai perilaku, bukan sebagai pola teks: dua rute, satu murid,
  // satu bukti — kalau rencananya berbeda, pelatih menjelaskan rencana yang bukan miliknya.
  const s = SCENARIOS[1];
  const brain = {
    schema: 'fiezel-core-brain-v2', ability: 3.2, abilityLevel: 'B1', abilityConfidence: 0.8,
    momentum: 'declining', fatigue: 'fatigued', targetDifficulty: 2, difficultyBand: 'foundation',
    sessionSize: 8, reviewShare: 0.6, pace: 'calm', atRiskReviews: 5, rootCauseSkill: 'past_simple'
  };
  const body = { snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, brain, profile: { goal: 'general' } };
  const req = () => ({ json: async () => body, headers: { get: () => '' } });
  const user = {
    puter: {
      auth: { getUser: async () => ({ uuid: 'parity-uuid', username: 'Parity' }) },
      ai: { chat: async () => ({ message: { content: 'aman' } }) }
    }
  };
  const boot = bootWorker(workerSource);
  {
    const policyRes = await boot.routes.POST.get('/api/policy/next')({ request: req(), user });
    const coachRes = await boot.routes.POST.get('/api/coach/context')({ request: req(), user });
    assert.ok(policyRes && policyRes.policy, 'rute kebijakan tidak mengembalikan kebijakan');
    assert.ok(coachRes && coachRes.policyId, 'rute pelatih tidak mengembalikan policyId');
    assert.strictEqual(coachRes.policyId, policyRes.policy.policyId,
      'pelatih menjelaskan rencana yang BUKAN rencana murid (celah 2)');
    assert.strictEqual(coachRes.brainSource, 'client-digest', 'pelatih tidak memakai ringkasan otak murid');
    assert.strictEqual(policyRes.brainSource, 'client-digest', 'rute kebijakan tidak memakai ringkasan otak murid');
    assert.ok(policyRes.policy.rationaleCodes.includes('brain_root_cause'),
      'lapisan otak tidak terpakai di rute kebijakan');
  }
});

// ==========================================================================
// S — SINYAL YANG DULU DIKIRIM DAN TIDAK PERNAH DIBACA
// ==========================================================================
test('S1 · highRiskCount BENAR-BENAR mengubah kebijakan (celah 3)', () => {
  const base = SCENARIOS[2]; // antrean 100, hanya 2 yang rawan
  const heavy = JSON.parse(JSON.stringify(base));
  heavy.evidence.memory.highRiskCount = 40; // satu-satunya perbedaan
  const lowRisk = W.context.deriveAdaptivePolicy({ snapshot: base.snapshot, evidence: base.evidence, outcomes: [], now: NOW });
  const highRisk = W.context.deriveAdaptivePolicy({ snapshot: heavy.snapshot, evidence: heavy.evidence, outcomes: [], now: NOW });
  assert.ok(lowRisk.reviewShare < highRisk.reviewShare,
    'highRiskCount tidak mengubah porsi review: ' + lowRisk.reviewShare + ' vs ' + highRisk.reviewShare);
  assert.ok(lowRisk.rationaleCodes.includes('due_backlog_low_risk'),
    'antrean panjang dengan risiko rendah tidak dinyatakan apa adanya');
  assert.ok(highRisk.rationaleCodes.includes('memory_high_risk_load'),
    'beban rawan yang berat tidak dinyatakan');
  // Sisi klien wajib bergerak sama.
  const clientLow = A.deriveAdaptivePolicy({ snapshot: base.snapshot, evidence: base.evidence, outcomes: [], now: NOW });
  const clientHigh = A.deriveAdaptivePolicy({ snapshot: heavy.snapshot, evidence: heavy.evidence, outcomes: [], now: NOW });
  assert.strictEqual(clientLow.reviewShare, lowRisk.reviewShare, 'klien tidak ikut membaca highRiskCount');
  assert.strictEqual(clientHigh.reviewShare, highRisk.reviewShare, 'klien tidak ikut membaca highRiskCount');
});

test('S2 · bukti TANPA highRiskCount berperilaku persis seperti sebelum m025-201', () => {
  // Klien lama tidak mengirim sinyal ini. Kebijakannya harus utuh, bukan runtuh ke 0.
  const s = SCENARIOS[6];
  const p = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: [], now: NOW });
  assert.strictEqual(p.mode, 'review', 'bukti lama kehilangan mode review — kompatibilitas patah');
  assert.strictEqual(p.reviewShare, 0.65, 'bukti lama tidak lagi memakai porsi review lama');
  assert.ok(!p.rationaleCodes.includes('memory_high_risk_load') && !p.rationaleCodes.includes('due_backlog_low_risk'),
    'kode beban rawan muncul padahal sinyalnya tidak pernah dikirim');
});

test('S3 · todayAttempts dibaca cermin server — sinyal kedua yang dulu tak pernah dibaca (celah 1)', () => {
  const evidence = {
    behavior: { consistency14d: 80, abandonmentRate: 4, medianResponseMs: 5000, todayAttempts: 30 },
    confidence: { evidence: 40, gap: 6 }, memory: { dueReviews: 0, maxForgettingRisk: 10, highRiskCount: 0 },
    skills: { weakest: [] }
  };
  const rested = JSON.parse(JSON.stringify(evidence));
  rested.behavior.todayAttempts = 3;
  const mirrorTired = W.context.serverBrainMirror({ evidence, effectiveness: null });
  const mirrorFresh = W.context.serverBrainMirror({ evidence: rested, effectiveness: null });
  assert.strictEqual(mirrorTired.fatigue, 'fatigued', '30 soal hari ini tidak terbaca sebagai kelelahan');
  assert.strictEqual(mirrorFresh.fatigue, 'fresh', '3 soal hari ini tidak terbaca sebagai segar');
  // Lapisan v1 sendiri buta terhadap ini: buktikan dengan menjalankannya.
  const snapshot = { adaptiveReady: true, totalAttempts: 300, estimatedLevel: 'B2', dueReviews: 0, domains: { grammar: { attempts: 100, accuracy: 82 }, vocabulary: { attempts: 100, accuracy: 84 }, reading: { attempts: 100, accuracy: 83 } } };
  const v1Tired = W.context.deriveAdaptivePolicy({ snapshot, evidence, outcomes: [], now: NOW });
  const v1Fresh = W.context.deriveAdaptivePolicy({ snapshot, evidence: rested, outcomes: [], now: NOW });
  assert.strictEqual(v1Tired.sessionSize, v1Fresh.sessionSize,
    'lapisan v1 ternyata sudah membaca todayAttempts — komentar cermin server jadi bohong');
  const refinedTired = W.context.refinePolicyWithServerMirror(v1Tired, mirrorTired);
  assert.ok(refinedTired.sessionSize < v1Tired.sessionSize, 'cermin server tidak memperkecil sesi murid yang lelah');
  assert.strictEqual(refinedTired.pace, 'calm', 'cermin server tidak menenangkan tempo murid yang lelah');
});

// ==========================================================================
// M — CERMIN SERVER: menyala saat perlu, padam saat tidak, dan tidak mengaku brain_
// ==========================================================================
test('M1 · cermin server MENYALA saat ringkasan otak tidak sampai, PADAM saat ringkasannya sah', () => {
  const s = SCENARIOS[1];
  const shared = { snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW };
  const withoutBrain = W.context.resolvePolicyForRequest(shared);
  assert.strictEqual(withoutBrain.brainSource, 'server-mirror', 'cermin server tidak menyala tanpa ringkasan otak');
  const usable = {
    schema: 'fiezel-core-brain-v2', ability: 3, abilityLevel: 'B1', abilityConfidence: 0.7, momentum: 'plateau',
    fatigue: 'fresh', targetDifficulty: 4, difficultyBand: 'stretch', sessionSize: 12, reviewShare: 0.3,
    pace: 'normal', atRiskReviews: 1, rootCauseSkill: ''
  };
  const withBrain = W.context.resolvePolicyForRequest(Object.assign({ brain: usable }, shared));
  assert.strictEqual(withBrain.brainSource, 'client-digest', 'cermin server merebut giliran ringkasan otak');
  assert.ok(!withBrain.rationaleCodes.some(c => c.indexOf('server_') === 0),
    'kode cermin server muncul padahal ringkasan otak murid yang berwenang — sinyal dihitung dua kali');
  // Ringkasan otak dengan keyakinan DI BAWAH ambang harus jatuh ke cermin, bukan ke v1 telanjang.
  const weak = Object.assign({}, usable, { abilityConfidence: 0.05 });
  const withWeakBrain = W.context.resolvePolicyForRequest(Object.assign({ brain: weak }, shared));
  assert.strictEqual(withWeakBrain.brainSource, 'server-mirror',
    'ringkasan otak lemah menjatuhkan kebijakan ke lapisan v1 telanjang — persis celah 1');
});

test('M2 · cermin server tidak pernah mengaku sebagai Core Brain', () => {
  const s = SCENARIOS[3];
  const p = W.context.resolvePolicyForRequest({ snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW });
  assert.ok(!p.rationaleCodes.some(c => c.indexOf('brain_') === 0),
    'cermin server memakai prefiks brain_ — mengklaim penalaran yang tidak terjadi');
  assert.ok(p.serverMirror && p.serverMirror.schema === 'fiezel-server-brain-mirror-v1', 'cermin tidak membawa schema-nya');
  assert.ok(p.serverMirror.confidence <= 0.6, 'cermin ringkasan mengaku lebih yakin daripada haknya');
});

test('M3 · cermin server hanya MEMPERKECIL sesi, tidak pernah memperbesarnya', () => {
  const small = { sessionSize: 6, pace: 'calm', rationaleCodes: [] };
  for (const fatigue of ['fatigued', 'tiring', 'fresh', 'unknown']) {
    const out = W.context.refinePolicyWithServerMirror(small, { fatigue, atRiskReviews: 0, momentum: 'unknown', source: 'server-mirror' });
    assert.ok(out.sessionSize <= small.sessionSize, 'cermin memperbesar sesi pada fatigue=' + fatigue);
  }
});

// ==========================================================================
// K — KODE RASIONAL: kapasitas dan prioritas yang sama di tiga berkas
// ==========================================================================
const CAP_FILES = ['app.js', 'fiezel-core-worker.js', 'features/brain/fiezel-core-brain.js'];
test('K1 · kapasitas 12 dan prefiks prioritas identik di app.js, Worker, dan fiezel-core-brain.js', () => {
  for (const f of CAP_FILES) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(/\(brain_\|server_\|policy_trend_\|recent_policy_outcome_\)/.test(src),
      f + ': daftar prefiks prioritas tidak ditemukan / berbeda');
    assert.ok(/12/.test(src), f + ': kapasitas kode rasional tidak terbaca');
    assert.ok(!/rationaleCodes\s*=\s*codes\.slice\(\s*0\s*,\s*12\s*\)/.test(src),
      f + ': masih memotong kode secara POSISIONAL — kode otak tetap yang terbuang');
  }
  const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(!/rationaleCodes\.slice\(\s*0\s*,\s*8\s*\)/.test(appSrc),
    'app.js masih memotong kode Worker di 8 sementara Worker mengirim 12 (celah 4)');
});

test('K2 · pemotong berprioritas: kode otak SELALU selamat, kode v1 generik yang dibuang', () => {
  const v1 = ['due_reviews', 'forgetting_risk', 'weak_skill', 'recurring_error', 'abandonment_risk',
    'consistency_risk', 'confidence_gap', 'calm_pacing', 'memory_high_risk_load', 'due_backlog_low_risk'];
  const reasoning = ['recent_policy_outcome_negative', 'policy_trend_declining', 'brain_optimal_challenge',
    'brain_trend_declining', 'brain_cognitive_load', 'brain_memory_at_risk', 'brain_root_cause'];
  const all = v1.concat(reasoning); // 17 kode, jauh di atas kapasitas
  for (const cap of [W.context.capRationaleCodes, A.capRationaleCodes]) {
    const out = host(cap(all));
    assert.strictEqual(out.length, 12, 'kapasitas kode rasional bukan 12');
    for (const c of reasoning) assert.ok(out.includes(c), 'kode penalaran dibuang oleh pemotong: ' + c);
    assert.ok(out.filter(c => v1.includes(c)).length === 5, 'kode v1 yang dipertahankan bukan sisa kapasitas');
  }
  // Duplikat dibuang, urutan pertama menang, dan daftar pendek tidak disentuh.
  assert.deepStrictEqual(host(W.context.capRationaleCodes(['a', 'a', 'b'])), ['a', 'b'], 'duplikat tidak dibuang');
  assert.deepStrictEqual(host(W.context.capRationaleCodes(['a', 'b', 'c'])), ['a', 'b', 'c'], 'daftar pendek ikut dipotong');
});

test('K3 · sanitizer klien MELOLOSKAN kode otak dari Worker, bukan memotongnya (celah 4)', () => {
  const fallback = A.buildAdaptivePolicy(NOW);
  const fromWorker = Object.assign({}, fallback, {
    rationaleCodes: ['due_reviews', 'forgetting_risk', 'weak_skill', 'recurring_error', 'abandonment_risk',
      'consistency_risk', 'confidence_gap', 'calm_pacing', 'recent_policy_outcome_negative',
      'brain_optimal_challenge', 'brain_cognitive_load', 'brain_root_cause'],
    source: 'core-worker'
  });
  const clean = A.sanitizeAdaptivePolicy(fromWorker, fallback);
  for (const c of ['brain_optimal_challenge', 'brain_cognitive_load', 'brain_root_cause']) {
    assert.ok(clean.rationaleCodes.includes(c), 'sanitizer klien membuang kode otak: ' + c);
  }
});

test('K4 · alasan Core Brain benar-benar SAMPAI KE LAYAR lewat personal-journey', () => {
  // Pemotongan di app.js/Worker tidak berarti apa-apa kalau lapisan yang MENAMPILKANNYA
  // membuang kodenya lagi — dan sampai m025-201 RATIONALE_TEXT memang tidak punya satu pun
  // entri brain_/server_/policy_trend_/recent_policy_outcome_.
  const journeySrc = fs.readFileSync(path.join(root, 'features', 'personal-journey', 'fiezel-personal-journey.js'), 'utf8');
  const idCopy = fs.readFileSync(path.join(root, 'features', 'i18n', 'copy-id-feat-b.js'), 'utf8');
  const thCopy = fs.readFileSync(path.join(root, 'features', 'i18n', 'copy-th-feat-b.js'), 'utf8');
  const NEEDED = ['brain_optimal_challenge', 'brain_trend_improving', 'brain_trend_plateau', 'brain_trend_declining',
    'brain_cognitive_load', 'brain_memory_at_risk', 'brain_root_cause',
    'server_cognitive_load', 'server_pacing_watch', 'server_memory_at_risk',
    'server_trend_improving', 'server_trend_plateau', 'server_trend_declining',
    'policy_trend_declining', 'policy_trend_improving', 'policy_trend_flat',
    'recent_policy_outcome_negative', 'recent_policy_outcome_mixed', 'recent_policy_outcome_positive',
    'memory_high_risk_load', 'due_backlog_low_risk'];
  for (const code of NEEDED) {
    const m = new RegExp('\\b' + code + '\\s*:\\s*\'([^\']+)\'').exec(journeySrc);
    assert.ok(m, 'kode tanpa padanan teks — tidak akan pernah tampil ke murid: ' + code);
    assert.ok(idCopy.includes("'" + m[1] + "'"), 'kunci naskah id hilang untuk ' + code + ' (' + m[1] + ')');
    assert.ok(thCopy.includes("'" + m[1] + "'"), 'kunci naskah th hilang untuk ' + code + ' (' + m[1] + ')');
  }
  assert.ok(!/policy\.rationaleCodes\s*\.slice\(\s*0\s*,\s*6\s*\)/.test(journeySrc),
    'personal-journey masih memotong kode secara posisional');
});

// ==========================================================================
// T — TREN EFEKTIVITAS ATAS SELURUH RIWAYAT (celah 5)
// ==========================================================================
test('T1 · policyEffectiveness menolak sampel kecil dan setuju di kedua sisi', () => {
  for (const eff of [W.context.policyEffectiveness, A.policyEffectiveness]) {
    assert.strictEqual(eff([]).trend, 'unknown', 'riwayat kosong mengaku punya tren');
    assert.strictEqual(eff(declineRun.slice(0, 3)).trend, 'unknown', 'tiga hasil sudah dianggap tren');
    assert.strictEqual(eff(declineRun).trend, 'declining', 'runtun menurun tidak terbaca');
    assert.strictEqual(eff(climbRun).trend, 'improving', 'runtun menaik tidak terbaca');
    const flat = [55, 57, 54, 56, 55, 57].map((score, i) => outcome({ outcomeId: 'f' + i, score }));
    assert.strictEqual(eff(flat).trend, 'flat', 'riwayat datar mengaku bergerak');
    assert.ok(eff(declineRun).confidence <= 0.9, 'tren mengaku lebih yakin daripada haknya');
  }
});

test('T2 · status insufficient tidak dinilai tetapi tetap dihitung', () => {
  const rows = declineRun.concat([outcome({ outcomeId: 'ins', status: 'insufficient', score: 0 })]);
  const eff = W.context.policyEffectiveness(rows);
  assert.strictEqual(eff.sampled, rows.length, 'sampel tidak jujur');
  assert.strictEqual(eff.scored, declineRun.length, 'sesi terlalu pendek ikut dinilai sebagai kegagalan kebijakan');
  assert.strictEqual(eff.insufficient, 1, 'hasil insufficient tidak dihitung');
});

test('T3 · tren MENGUBAH kebijakan, dan tidak menghitung penurunan dua kali', () => {
  const s = SCENARIOS[4];
  const withTrend = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: declineRun, now: NOW });
  const withoutTrend = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: [], now: NOW });
  assert.ok(withTrend.rationaleCodes.includes('policy_trend_declining'), 'tren menurun tidak dinyatakan');
  assert.ok(withTrend.targetDifficulty < withoutTrend.targetDifficulty, 'tren menurun tidak menurunkan kesulitan');
  assert.strictEqual(withTrend.avoidNewContent, true, 'tren menurun tidak menahan materi baru');
  assert.ok(withTrend.policyEffectiveness && withTrend.policyEffectiveness.trend === 'declining',
    'kebijakan tidak membawa tren efektivitasnya');
  // Hasil TERAKHIR negatif + tren menurun tidak boleh menurunkan kesulitan dua tingkat.
  const negTail = declineRun.slice(0, -1).concat([outcome({ outcomeId: 'neg', score: 20, status: 'negative', recommendation: 'reduce_load' })]);
  const both = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: negTail, now: NOW });
  assert.ok(withoutTrend.targetDifficulty - both.targetDifficulty <= 1,
    'penurunan kesulitan dihitung dua kali untuk bukti yang sama');
});

test('T4 · sepuluh hasil benar-benar dipakai — jendela klien dan Worker sama-sama 10', () => {
  const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(/\.map\(sanitizePolicyOutcome\)\.filter\(Boolean\)\.slice\(-10\)/.test(appSrc),
    'app.js masih menilai kebijakan hanya atas 5 hasil terakhir sementara Worker memakai 10');
  assert.ok(/outcomes:recentPolicyOutcomes\(10\)/.test(appSrc),
    'payload kebijakan masih mengirim 5 hasil — Worker tidak pernah melihat riwayat penuh');
  // Perilaku, bukan pola: hasil ke-6 sampai ke-10 harus bisa membalik kesimpulan.
  const s = SCENARIOS[5];
  const shortWindow = climbRun.slice(-3);
  const full = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: climbRun, now: NOW });
  const clipped = W.context.deriveAdaptivePolicy({ snapshot: s.snapshot, evidence: s.evidence, outcomes: shortWindow, now: NOW });
  assert.ok(full.rationaleCodes.includes('policy_trend_improving'), 'riwayat penuh tidak menghasilkan tren');
  assert.ok(!clipped.rationaleCodes.includes('policy_trend_improving'), 'riwayat terpotong tetap mengaku punya tren');
});

// ==========================================================================
// BUKTI-BISA-MERAH — setiap detektor diuji terhadap sumber yang sengaja dirusak
// ==========================================================================
function expectRed(label, fn) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert.ok(threw, 'detektor TIDAK merah pada racun: ' + label);
}
test('RED · setiap detektor terbukti bisa MERAH terhadap sumber yang sengaja dirusak', () => {
  // (R) rute yang kembali memanggil deriveAdaptivePolicy langsung
  const poisonedRoute = workerSource.replace(
    /policy=resolvePolicyForRequest\(\{snapshot,evidence,outcomes,brain,now:Date\.now\(\)\}\),latestOutcome/,
    'policy=deriveAdaptivePolicy({snapshot,evidence,outcomes,now:Date.now()}),latestOutcome');
  assert.notStrictEqual(poisonedRoute, workerSource, 'racun rute tidak menempel — pola gerbang sudah basi');
  expectRed('rute memakai kebijakan mentah', () => {
    assert.deepStrictEqual(routesCallingDeriveDirectly(poisonedRoute), []);
  });

  // (K) pemotong kembali posisional
  const poisonedCap = workerSource.replace(
    'const keep=list.filter(c=>RATIONALE_PRIORITY.test(c)),rest=list.filter(c=>!RATIONALE_PRIORITY.test(c));\r\n  return [...rest.slice(0,Math.max(0,limit-keep.length)),...keep].slice(0,limit);',
    'return list.slice(0,limit);').replace(
    'const keep=list.filter(c=>RATIONALE_PRIORITY.test(c)),rest=list.filter(c=>!RATIONALE_PRIORITY.test(c));\n  return [...rest.slice(0,Math.max(0,limit-keep.length)),...keep].slice(0,limit);',
    'return list.slice(0,limit);');
  assert.notStrictEqual(poisonedCap, workerSource, 'racun pemotong tidak menempel — pola gerbang sudah basi');
  const poisonedCapWorker = bootWorker(poisonedCap);
  expectRed('pemotong posisional membuang kode otak', () => {
    const out = poisonedCapWorker.context.capRationaleCodes(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'brain_root_cause']);
    assert.ok(out.includes('brain_root_cause'));
  });

  // (S) highRiskCount kembali diabaikan
  const poisonedSignal = workerSource.replace(
    "if(mode==='review'&&highRiskCount!=null&&sessionSize>0)reviewShare=Math.max(.35,Math.min(.65,Math.round((riskyReviews/sessionSize)*100)/100));",
    '');
  assert.notStrictEqual(poisonedSignal, workerSource, 'racun sinyal tidak menempel — pola gerbang sudah basi');
  const poisonedSignalWorker = bootWorker(poisonedSignal);
  expectRed('highRiskCount kembali diabaikan', () => {
    const base = SCENARIOS[2];
    const heavy = JSON.parse(JSON.stringify(base));
    heavy.evidence.memory.highRiskCount = 40;
    const low = poisonedSignalWorker.context.deriveAdaptivePolicy({ snapshot: base.snapshot, evidence: base.evidence, outcomes: [], now: NOW });
    const high = poisonedSignalWorker.context.deriveAdaptivePolicy({ snapshot: heavy.snapshot, evidence: heavy.evidence, outcomes: [], now: NOW });
    assert.ok(low.reviewShare < high.reviewShare);
  });

  // (T) ambang sampel tren dilonggarkan sampai dua hasil sudah dianggap tren
  const poisonedTrend = workerSource.replace('const POLICY_TREND_MIN_SAMPLE=4;', 'const POLICY_TREND_MIN_SAMPLE=2;');
  assert.notStrictEqual(poisonedTrend, workerSource, 'racun tren tidak menempel — pola gerbang sudah basi');
  const poisonedTrendWorker = bootWorker(poisonedTrend);
  expectRed('dua hasil sudah dianggap tren', () => {
    assert.strictEqual(poisonedTrendWorker.context.policyEffectiveness(declineRun.slice(0, 3)).trend, 'unknown');
  });

  // (M) cermin server berjalan bersamaan dengan ringkasan otak yang sah
  const poisonedMirror = workerSource.replace(
    'if(brainDigestUsable(input.brain))return refinePolicyWithBrain(base,input.brain);',
    'if(false)return refinePolicyWithBrain(base,input.brain);');
  assert.notStrictEqual(poisonedMirror, workerSource, 'racun cermin tidak menempel — pola gerbang sudah basi');
  const poisonedMirrorWorker = bootWorker(poisonedMirror);
  expectRed('cermin server merebut giliran ringkasan otak', () => {
    const s = SCENARIOS[1];
    const p = poisonedMirrorWorker.context.resolvePolicyForRequest({
      snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW,
      brain: { schema: 'fiezel-core-brain-v2', abilityConfidence: 0.7, targetDifficulty: 4, difficultyBand: 'stretch', sessionSize: 12, reviewShare: 0.3, pace: 'normal', momentum: 'plateau', fatigue: 'fresh', atRiskReviews: 0, rootCauseSkill: '' }
    });
    assert.strictEqual(p.brainSource, 'client-digest');
  });

  // (P) paritas: satu sisi diubah sendirian
  const poisonedParity = workerSource.replace(
    "let sessionSize=12;if(mode==='diagnostic')sessionSize=10;",
    "let sessionSize=11;if(mode==='diagnostic')sessionSize=10;");
  assert.notStrictEqual(poisonedParity, workerSource, 'racun paritas tidak menempel — pola gerbang sudah basi');
  const poisonedParityWorker = bootWorker(poisonedParity);
  expectRed('kebijakan klien dan Worker menyimpang diam-diam', () => {
    for (const s of SCENARIOS) {
      const input = { snapshot: s.snapshot, evidence: s.evidence, outcomes: s.outcomes, now: NOW };
      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(A.deriveAdaptivePolicy(input))),
        JSON.parse(JSON.stringify(poisonedParityWorker.context.deriveAdaptivePolicy(input))));
    }
  });
});

test('gate ini terdaftar di CI', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'quality.yml'), 'utf8');
  assert.ok(workflow.includes('node core-policy-parity-test.js'), 'gate yang tidak berjalan di CI bukan gate');
});

// core-policy-parity-test.js tidak menulis satu berkas pun: laporannya adalah keluaran ini.
(async () => {
  for (const [name, fn] of deferred) {
    try { await fn(); console.log('ok - ' + name); results.push([name, true]); }
    catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); results.push([name, false]); }
  }
  console.log('');
  if (failures) { console.error('FIEZEL core policy parity: FAIL (' + failures + '/' + results.length + ')'); process.exit(1); }
  console.log('FIEZEL core policy parity: PASS (' + results.length + ' uji)');
})();
