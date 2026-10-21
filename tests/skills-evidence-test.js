/**
 * FIEZEL R3 gate — Unified Skills Evidence.
 *
 * Yang dijaga di sini adalah hal-hal yang kalau salah akan membuat dashboard berbohong:
 * angka yang tidak diketahui diisi nol, coverage disamakan dengan nilai, skor latihan
 * disebut skor pengucapan, atau bukti mentah ikut terbawa keluar dari sidecar.
 */
const assert = require('assert');
const skills = require('../features/skills-evidence/fiezel-skills-evidence.js');

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
  // Fixture ini memakai bentuk event LAMA, dari sebelum sidecar menyimpan `replays`. Untuk
  // event seperti itu tidak ada angka yang jujur, jadi jawabannya tetap "belum terukur".
  // Bentuk event baru diuji terpisah di bawah.
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

test('replay yang benar-benar tercatat dilaporkan, bukan disembunyikan', () => {
  // Sidecar kini menyimpan `replays` pada event. Selama datanya ada, angkanya nyata dan boleh
  // ditampilkan.
  const dengan = skills.projectSkillsEvidence({
    state: {
      schema: 'fiezel-sl-v1',
      events: [event({ id: 'r1', replays: 2 }), event({ id: 'r2', replays: 0 }), event({ id: 'r3', replays: 1 })]
    }, now: NOW
  });
  assert.strictEqual(dengan.domains.listening.replayCount, 3, 'total pengulangan dijumlahkan');
  assert.strictEqual(dengan.domains.listening.replayAverage, 1, 'rata-rata per latihan');
  assert.strictEqual(dengan.domains.listening.replayEvidence, 3, 'berapa event yang membawa datanya');
  assert.ok(!dengan.domains.listening.unmeasurable.includes('replayCount'));
});

test('event lama tanpa replay tetap dinyatakan belum terukur, bukan nol', () => {
  // Nol berarti murid tidak pernah mengulang audio. Tidak tahu berarti kita tidak tahu, dan
  // menuliskannya sebagai nol akan membuat laporan berbohong tentang event lama.
  const lama = skills.projectSkillsEvidence({ state, now: NOW });
  assert.strictEqual(lama.domains.listening.replayCount, null);
  assert.strictEqual(lama.domains.listening.replayEvidence, 0);
  assert.ok(lama.domains.listening.unmeasurable.includes('replayCount'));
});

test('replay campuran hanya menghitung event yang membawa datanya', () => {
  const campur = skills.projectSkillsEvidence({
    state: { schema: 'fiezel-sl-v1', events: [event({ id: 'a', replays: 4 }), event({ id: 'b' })] }, now: NOW
  });
  assert.strictEqual(campur.domains.listening.attempts, 2);
  assert.strictEqual(campur.domains.listening.replayEvidence, 1, 'hanya satu event yang punya datanya');
  assert.strictEqual(campur.domains.listening.replayCount, 4);
  assert.ok(!campur.domains.listening.unmeasurable.includes('replayCount'));
});

test('replay tidak wajar dibatasi, bukan diteruskan apa adanya', () => {
  const aneh = skills.projectSkillsEvidence({
    state: { schema: 'fiezel-sl-v1', events: [event({ id: 'x', replays: 9999 }), event({ id: 'y', replays: -5 })] }, now: NOW
  });
  assert.strictEqual(aneh.domains.listening.replayCount, 20, '20 + 0 setelah dibatasi');
});

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

test('penyebut coverage di config tidak boleh basi terhadap bank soal', () => {
  // app.js merender Home secara sinkron dan tidak bisa menunggu bank dimuat, jadi jumlahnya
  // disimpan sebagai konstanta di config. Gate ini yang membuat konstanta itu tetap jujur:
  // begitu bank soal berubah dan konstanta tidak, coverage akan salah dan test ini gagal.
  const fs = require('fs');
  const source = fs.readFileSync('./features/speaking-listening/speaking-listening-config.js', 'utf8');
  const declared = {};
  const block = source.match(/bankCounts:Object\.freeze\(\{([^}]*)\}\)/);
  assert.ok(block, 'config wajib mendeklarasikan bankCounts');
  for (const pair of block[1].split(',')) {
    const [k, v] = pair.split(':').map(x => x.trim());
    if (k) declared[k] = Number(v);
  }
  for (const domain of skills.DOMAINS) {
    const bank = JSON.parse(fs.readFileSync(`./features/speaking-listening/${domain}-bank-v1.json`, 'utf8'));
    assert.strictEqual(bank.count, bank.items.length, `${domain}: count bank tidak cocok dengan isinya`);
    assert.strictEqual(declared[domain], bank.count,
      `${domain}: config menyebut ${declared[domain]} item, bank berisi ${bank.count}`);
  }
});

test('dengan penyebut nyata, coverage terukur dan tetap bukan nilai', () => {
  const p = skills.projectSkillsEvidence({ state, now: NOW, bankCounts: { listening: 36, speaking: 36 } });
  const cov = p.domains.listening.targetCoverage;
  assert.strictEqual(cov.measured, true);
  assert.strictEqual(cov.itemsAvailable, 36);
  assert.strictEqual(cov.percent, 6, '2 dari 36 item');
  assert.ok(!p.domains.listening.unmeasurable.includes('targetCoverage'));
  // Coverage rendah tidak boleh menurunkan skor latihan, dan sebaliknya.
  assert.strictEqual(p.domains.listening.practiceScore, 60);
});

console.log('');
if (failures) { console.error('FIEZEL skills evidence: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL skills evidence: PASS');
