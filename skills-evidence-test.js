/**
 * FIEZEL R3 gate — Unified Skills Evidence.
 *
 * Yang dijaga di sini adalah hal-hal yang kalau salah akan membuat dashboard berbohong:
 * angka yang tidak diketahui diisi nol, coverage disamakan dengan nilai, skor latihan
 * disebut skor pengucapan, atau bukti mentah ikut terbawa keluar dari sidecar.
 */
const assert = require('assert');
const skills = require('./features/skills-evidence/fiezel-skills-evidence.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-20T05:00:00Z');

function event(over) {
  return Object.assign({
    id: 'sl-1', at: NOW - 3600000, domain: 'listening', itemId: 'L-1', level: 'A2',
    mode: 'gist', score: 70, passed: true, responseMs: 8000, metric: 'keyword_coverage',
    rawAudioStored: false, rawTranscriptStored: false
  }, over || {});
}

const state = {
  schema: 'fiezel-sl-v1', version: 1, updatedAt: NOW - 1800000,
  events: [
    event({ id: 'a', itemId: 'L-1', score: 80, passed: true, responseMs: 9000 }),
    event({ id: 'b', itemId: 'L-2', score: 40, passed: false, responseMs: 15000 }),
    event({ id: 'c', itemId: 'L-1', score: 60, passed: true, responseMs: 7000, level: 'B1' }),
    event({ id: 'd', domain: 'speaking', itemId: 'S-1', score: 55, passed: false, responseMs: 12000, mode: 'response' }),
    event({ id: 'e', domain: 'speaking', itemId: 'S-2', score: 75, passed: true, responseMs: 11000, mode: 'response' })
  ],
  listening: { attempts: 3, passed: 2, scoreSum: 180 },
  speaking: { attempts: 2, passed: 1, scoreSum: 130 }
};

const projection = skills.projectSkillsEvidence({ state, now: NOW, bankCounts: { listening: 8, speaking: 4 } });

test('proyeksi agregat membaca kedua skill dari sidecar', () => {
  assert.strictEqual(projection.schema, 'fiezel-skills-evidence-v1');
  assert.strictEqual(projection.domains.listening.status, 'measured');
  assert.strictEqual(projection.domains.listening.attempts, 3);
  assert.strictEqual(projection.domains.listening.practiceScore, 60, '(80+40+60)/3');
  assert.strictEqual(projection.domains.listening.completionRate, 67, '2 dari 3 lulus');
  assert.strictEqual(projection.domains.speaking.attempts, 2);
  assert.strictEqual(projection.domains.speaking.practiceScore, 65);
});

test('now wajib diisi, sama seperti modul R2', () => {
  assert.throws(() => skills.projectSkillsEvidence({ state }), /now wajib diisi/);
  assert.throws(() => skills.migrateProjection({}), /now wajib diisi/);
});

test('proyeksi reproducible', () => {
  const again = skills.projectSkillsEvidence({ state, now: NOW, bankCounts: { listening: 8, speaking: 4 } });
  assert.strictEqual(JSON.stringify(again), JSON.stringify(projection));
});

test('coverage target adalah cakupan item, bukan nilai', () => {
  const cov = projection.domains.listening.targetCoverage;
  // Tiga event listening, tetapi hanya dua item berbeda.
  assert.strictEqual(cov.itemsAttempted, 2);
  assert.strictEqual(cov.itemsAvailable, 8);
  assert.strictEqual(cov.percent, 25);
  assert.notStrictEqual(cov.percent, projection.domains.listening.practiceScore, 'coverage bukan skor');
});

test('tanpa jumlah bank, coverage tidak ditebak', () => {
  const p = skills.projectSkillsEvidence({ state, now: NOW });
  assert.strictEqual(p.domains.listening.targetCoverage.measured, false);
  assert.strictEqual(p.domains.listening.targetCoverage.percent, null, 'penyebut tidak diketahui');
  assert.ok(p.domains.listening.unmeasurable.includes('targetCoverage'));
});

test('replay count dinyatakan tidak terukur, bukan nol', () => {
  // `replays` dihitung di controller latihan tetapi tidak pernah disimpan ke event, jadi
  // angka apa pun di sini akan karangan.
  assert.strictEqual(projection.domains.listening.replayCount, null);
  assert.ok(projection.domains.listening.unmeasurable.includes('replayCount'));
  assert.ok(projection.domains.speaking.unmeasurable.includes('replayCount'));
});

// Nilai teks yang benar-benar bisa sampai ke layar. Nama field boleh menyebut konsep yang
// dilarang (`pronunciationScore: false` justru penyangkalannya); yang tidak boleh adalah
// labelnya muncul sebagai teks.
function stringValues(value, out) {
  const rows = out || [];
  if (typeof value === 'string') rows.push(value);
  else if (value && typeof value === 'object') for (const key of Object.keys(value)) stringValues(value[key], rows);
  return rows;
}

test('skor latihan tidak pernah disebut skor pengucapan', () => {
  assert.strictEqual(projection.terminology.pronunciationScore, false, 'penyangkalan eksplisit');
  assert.strictEqual(projection.terminology.practiceScore, 'skor latihan');
  for (const text of stringValues(projection)) {
    assert.ok(!/pronunciation|pengucapan/i.test(text), `label terlarang muncul sebagai teks: ${text}`);
  }
  assert.ok(Object.prototype.hasOwnProperty.call(projection.domains.speaking, 'practiceScore'));
});

test('tidak ada audio, transcript, atau jawaban mentah yang ikut keluar', () => {
  const dump = JSON.stringify(projection);
  // Yang berbahaya bukan kata "transcript" pada flag privasi, melainkan isi event itu
  // sendiri: id item, mode, metrik, dan stempel waktu per jawaban.
  for (const itemId of ['L-1', 'L-2', 'S-1', 'S-2']) {
    assert.ok(dump.indexOf(itemId) === -1, `id item ${itemId} bocor ke proyeksi`);
  }
  assert.ok(dump.indexOf('keyword_coverage') === -1, 'nama metrik per jawaban tidak ikut keluar');
  assert.strictEqual(projection.events, undefined, 'event mentah tidak pernah diteruskan');
  assert.strictEqual(projection.privacy.aggregateOnly, true);
  assert.strictEqual(projection.privacy.rawTranscriptIncluded, false);
  assert.strictEqual(projection.privacy.rawAudioIncluded, false);
});

test('state kosong, rusak, atau tidak ada menghasilkan belum terukur', () => {
  for (const bad of [null, undefined, {}, { events: 'bukan array' }, { events: [{ domain: 'x' }] }]) {
    const p = skills.projectSkillsEvidence({ state: bad, now: NOW });
    assert.strictEqual(p.domains.listening.status, 'not_measured');
    assert.strictEqual(p.domains.speaking.attempts, 0);
    assert.strictEqual(p.domains.speaking.practiceScore, null, 'jangan menulis 0 untuk yang belum ada');
  }
});

test('event dengan skor tidak valid dibuang, bukan ditambal', () => {
  const kotor = { schema: 'fiezel-sl-v1', events: [event({ score: 'abc' }), event({ id: 'ok', score: 90 })] };
  const p = skills.projectSkillsEvidence({ state: kotor, now: NOW });
  assert.strictEqual(p.domains.listening.attempts, 1);
  assert.strictEqual(p.domains.listening.practiceScore, 90);
});

test('migrasi versioned dan idempotent', () => {
  const sekali = skills.migrateProjection(projection, NOW);
  assert.strictEqual(sekali, projection, 'yang sudah v1 tidak disentuh');
  const lama = { schema: 'fiezel-skills-evidence-v0', domains: { listening: { attempts: 5, averageScore: 72, passRate: 60 }, speaking: {} } };
  const naik = skills.migrateProjection(lama, NOW);
  assert.strictEqual(naik.schema, 'fiezel-skills-evidence-v1');
  assert.strictEqual(naik.version, 1);
  assert.strictEqual(naik.domains.listening.attempts, 5);
  assert.strictEqual(naik.domains.listening.practiceScore, 72, 'averageScore lama terbawa');
  assert.strictEqual(naik.domains.speaking.status, 'not_measured');
  assert.strictEqual(JSON.stringify(skills.migrateProjection(naik, NOW)), JSON.stringify(naik), 'migrasi dua kali sama');
});

test('penggabungan ke Learner Evidence idempotent dan tidak merusak isi lama', () => {
  const evidence = { schema: 'fiezel-learner-evidence-v1', skills: { measured: 3, weakest: [{ skill: 'present_perfect' }] }, behavior: { streakDays: 2 } };
  const sekali = skills.mergeIntoLearnerEvidence(evidence, projection);
  const duakali = skills.mergeIntoLearnerEvidence(sekali, projection);
  assert.strictEqual(JSON.stringify(sekali), JSON.stringify(duakali));
  assert.strictEqual(sekali.skills.measured, 3, 'bukti lama tetap utuh');
  assert.strictEqual(sekali.behavior.streakDays, 2);
  assert.strictEqual(sekali.skills.spoken.listening.attempts, 3);
  assert.notStrictEqual(sekali, evidence, 'input tidak dimutasi');
  assert.strictEqual(evidence.skills.spoken, undefined);
});

test('proyeksi yang bukan schema ini ditolak saat digabung', () => {
  const evidence = { skills: { measured: 1 } };
  assert.strictEqual(skills.mergeIntoLearnerEvidence(evidence, { schema: 'lain' }), evidence);
  assert.strictEqual(skills.mergeIntoLearnerEvidence(evidence, null), evidence);
});

test('pembacaan storage tidak pernah melempar', () => {
  assert.strictEqual(skills.readSidecarState(null), null);
  assert.strictEqual(skills.readSidecarState({}), null);
  assert.strictEqual(skills.readSidecarState({ localStorage: { getItem: () => 'bukan json' } }), null);
  const env = { localStorage: { getItem: k => (k === skills.SOURCE_KEY ? JSON.stringify(state) : null) } };
  assert.strictEqual(skills.readSidecarState(env).schema, 'fiezel-sl-v1');
});

console.log('');
if (failures) { console.error('FIEZEL skills evidence: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL skills evidence: PASS');
