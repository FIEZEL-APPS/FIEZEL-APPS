/**
 * FIEZEL R2 gate — Personal Learning Journey (Weekly Mission, Today Plan, recovery, skill map).
 *
 * Gate ini menguji sifat yang membuat rencana belajar boleh dipercaya: reproducible, bounded,
 * tidak menebak skill yang belum diukur, dan tidak pernah menjanjikan skor ujian.
 */
const assert = require('assert');
const journey = require('./features/personal-journey/fiezel-personal-journey.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

// Rabu 2026-08-19 12:00 WIB. Minggu belajarnya dimulai Senin 2026-08-17.
const NOW = Date.parse('2026-08-19T05:00:00Z');
const DAY = 86400000;

const evidence = {
  behavior: { activeDays14: 6, consistency14d: 43, streakDays: 2, abandonmentRate: 20, medianResponseMs: 9000 },
  confidence: { evidence: 12, gap: 18 },
  memory: { dueReviews: 5, maxForgettingRisk: 72, highRiskCount: 3, topRisks: [{ domain: 'grammar', risk: 72 }, { domain: 'vocab', risk: 61 }] },
  skills: { measured: 3, recurringErrorSkills: 1, weakest: [{ skill: 'present_perfect', type: 'grammar', attempts: 10, accuracy: 40, errorRate: 60, recurringErrors: 3 }] }
};
const snapshot = {
  estimatedLevel: 'B1', totalAttempts: 60, adaptiveReady: true,
  domains: {
    vocabulary: { attempts: 20, accuracy: 70, recentAccuracy: 72, measured: 4, average: 65 },
    grammar: { attempts: 24, accuracy: 45, recentAccuracy: 40, measured: 3, average: 41 },
    reading: { attempts: 16, accuracy: 60, recentAccuracy: 58, measured: 2, average: 55 }
  }
};
const policy = {
  schema: 'fiezel-adaptive-policy-v1', policyId: '2026-08-19-repair-present_perfect', mode: 'repair',
  sessionSize: 12, estimatedMinutes: 12, primaryDomain: 'grammar', secondaryDomain: 'reading',
  targetSkill: 'present_perfect', reviewShare: 0.45, pace: 'normal', avoidNewContent: true,
  rationaleCodes: ['due_reviews', 'forgetting_risk', 'weak_skill', 'recurring_error']
};

const mission = journey.buildWeeklyMission({ evidence, policy, snapshot, now: NOW, goal: 'exam_foundation' });
const plan = journey.buildTodayPlan({ mission, evidence, policy, now: NOW });

test('minggu belajar dikunci ke Senin WIB, bukan timezone perangkat', () => {
  assert.strictEqual(mission.weekStart, '2026-08-17');
  assert.strictEqual(mission.weekEnd, '2026-08-23');
  // Senin dini hari WIB tetap masuk minggu yang sama, bukan minggu sebelumnya.
  const senin = journey.buildWeeklyMission({ evidence, policy, snapshot, now: Date.parse('2026-08-16T18:00:00Z') });
  assert.strictEqual(senin.weekStart, '2026-08-17');
});

test('misi reproducible: input sama menghasilkan output identik', () => {
  const again = journey.buildWeeklyMission({ evidence, policy, snapshot, now: NOW, goal: 'exam_foundation' });
  assert.strictEqual(JSON.stringify(again), JSON.stringify(mission));
  const laterSameDay = journey.buildWeeklyMission({ evidence, policy, snapshot, now: NOW + 3600000, goal: 'exam_foundation' });
  assert.strictEqual(laterSameDay.missionId, mission.missionId, 'missionId tidak boleh berganti di tengah minggu');
});

test('now wajib diisi, supaya tidak ada jam tersembunyi di dalam modul', () => {
  assert.throws(() => journey.buildWeeklyMission({ evidence, policy, snapshot }), /now wajib diisi/);
  assert.throws(() => journey.buildTodayPlan({ mission, evidence, policy }), /now wajib diisi/);
});

test('target mingguan realistis: tidak melompat jauh dari ritme nyata', () => {
  // 6 hari aktif dalam 14 hari -> 3 sesi per minggu yang benar-benar terjadi, target 4.
  assert.strictEqual(mission.sessionsTarget, 4);
  const rajin = journey.buildWeeklyMission({
    evidence: { ...evidence, behavior: { ...evidence.behavior, activeDays14: 14 } }, policy, snapshot, now: NOW
  });
  assert.ok(rajin.sessionsTarget <= 6, 'target mingguan tetap terbatas');
  const rapuh = journey.buildWeeklyMission({
    evidence: { ...evidence, behavior: { ...evidence.behavior, activeDays14: 2, abandonmentRate: 60 } }, policy, snapshot, now: NOW
  });
  assert.ok(rapuh.sessionsTarget <= 2, 'abandonment tinggi tidak boleh dijawab dengan target lebih besar');
});

test('skill map tidak menebak skill yang belum pernah diukur', () => {
  const byName = Object.fromEntries(mission.skillMap.map(r => [r.skill, r]));
  assert.strictEqual(mission.skillMap.length, 5);
  assert.strictEqual(byName.listening.accuracy, null, 'skill tanpa bukti tidak boleh punya angka');
  assert.strictEqual(byName.grammar.status, 'measured');
  assert.strictEqual(byName.grammar.accuracy, 40);
});

test('Listening/Speaking berstatus menunggu R3, bukan diklaim tanpa bukti', () => {
  const byName = Object.fromEntries(mission.skillMap.map(r => [r.skill, r]));
  // fiezel-sl-v1-state sudah menyimpan bukti agregat untuk kedua skill ini; yang belum ada
  // adalah proyeksinya ke Learner Evidence. Mengklaim "belum ada bukti" akan salah terhadap
  // murid yang sudah mengerjakan latihannya.
  assert.strictEqual(byName.listening.status, 'pending_r3');
  assert.strictEqual(byName.speaking.status, 'pending_r3');
  assert.strictEqual(byName.listening.attempts, null, 'jangan menyatakan 0 percobaan yang tidak diketahui');
  assert.ok(!/belum ada bukti/i.test(byName.speaking.basis));
});

test('proyeksi R3 membuat Speaking/Listening terukur di peta skill', () => {
  const denganSpoken = {
    ...evidence,
    skills: {
      ...evidence.skills,
      spoken: {
        schema: 'fiezel-skills-evidence-v1', version: 1,
        listening: { status: 'measured', attempts: 6, practiceScore: 72, completionRate: 67, targetCoverage: { measured: true, percent: 25 } },
        speaking: { status: 'not_measured', attempts: 0, practiceScore: null, completionRate: null, targetCoverage: { measured: false, percent: null } }
      }
    }
  };
  const m = journey.buildWeeklyMission({ evidence: denganSpoken, policy, snapshot, now: NOW });
  const byName = Object.fromEntries(m.skillMap.map(r => [r.skill, r]));
  assert.strictEqual(byName.listening.status, 'measured');
  assert.strictEqual(byName.listening.attempts, 6);
  assert.strictEqual(byName.listening.accuracy, 72, 'skor latihan, bukan skor pengucapan');
  assert.strictEqual(byName.listening.targetCoverage.percent, 25);
  // Speaking punya proyeksi tetapi belum ada latihan: tetap tidak boleh diklaim 0%.
  assert.strictEqual(byName.speaking.status, 'pending_r3');
  assert.strictEqual(byName.speaking.accuracy, null);
});

test('identitas misi terkunci ke minggu, perubahan isi terlihat lewat revision', () => {
  // Bukti baru di tengah minggu tidak boleh diam-diam melahirkan misi baru.
  const policyBerubah = { ...policy, mode: 'review', targetSkill: 'reading_inference', primaryDomain: 'reading' };
  const geser = journey.buildWeeklyMission({ evidence, policy: policyBerubah, snapshot, now: NOW + 2 * DAY, goal: 'exam_foundation' });
  assert.strictEqual(geser.missionId, mission.missionId, 'satu minggu, satu identitas misi');
  assert.notStrictEqual(geser.missionRevision, mission.missionRevision, 'pergeseran fokus harus terlihat');
  // Minggu berikutnya tetap misi yang berbeda.
  const mingguDepan = journey.buildWeeklyMission({ evidence, policy, snapshot, now: NOW + 7 * DAY, goal: 'exam_foundation' });
  assert.notStrictEqual(mingguDepan.missionId, mission.missionId);
});

test('review wajib mingguan tidak pernah melebihi kapasitas sesinya sendiri', () => {
  // Kasus dari audit: sesi pendek + antrian review besar. Batas lama menjanjikan 16 review
  // wajib padahal empat sesi berisi 4 soal hanya sanggup menjadwalkan 8 tanpa melanggar
  // aturan setengah-sesi di buildTodayPlan.
  const padat = {
    ...evidence,
    behavior: { ...evidence.behavior, activeDays14: 6, abandonmentRate: 20 },
    memory: { ...evidence.memory, dueReviews: 400 }
  };
  const kecil = { ...policy, sessionSize: 4 };
  const m = journey.buildWeeklyMission({ evidence: padat, policy: kecil, snapshot, now: NOW });
  const kapasitas = m.sessionsTarget * Math.floor(4 / 2);
  assert.strictEqual(m.mustReview, kapasitas, 'review wajib dibatasi kapasitas nyata');
  assert.strictEqual(m.reviewBacklog, 400 - kapasitas, 'sisanya tetap tercatat, tidak hilang');

  // Properti yang harus berlaku untuk seluruh rentang, bukan satu contoh: jumlah review wajib
  // harian yang benar-benar bisa dijadwalkan minimal sama dengan janji mingguan.
  for (let size = 4; size <= 20; size++) {
    for (let due = 0; due <= 60; due += 7) {
      const mm = journey.buildWeeklyMission({
        evidence: { ...padat, memory: { ...padat.memory, dueReviews: due } },
        policy: { ...policy, sessionSize: size }, snapshot, now: NOW
      });
      const pp = journey.buildTodayPlan({
        mission: mm, evidence: { ...padat, memory: { ...padat.memory, dueReviews: due } },
        policy: { ...policy, sessionSize: size }, now: NOW
      });
      assert.ok(mm.mustReview <= mm.sessionsTarget * Math.floor(size / 2),
        `janji mingguan melebihi kapasitas pada sessionSize=${size} due=${due}`);
      assert.ok(pp.mandatoryReview <= Math.floor(pp.questionsTarget / 2),
        `rencana harian melanggar batas setengah sesi pada sessionSize=${size} due=${due}`);
    }
  }
});

test('goal profile menyebut prasyarat dan tidak pernah memprediksi skor', () => {
  assert.strictEqual(mission.goalProfile.id, 'exam_foundation');
  assert.strictEqual(mission.goalProfile.scorePrediction, false);
  assert.ok(mission.goalProfile.prerequisites.length >= 3);
  const dump = JSON.stringify(mission);
  assert.ok(!/band\s*\d|skor\s*\d|score\s*\d|\b[5-9]\.[05]\b/i.test(dump), 'tidak boleh ada angka skor ujian');
  // Goal yang tidak dikenal jatuh ke default, bukan melempar atau membuat profil kosong.
  assert.strictEqual(journey.buildGoalProfile('tidak-ada').id, 'school');
});

test('today plan: review wajib didahulukan tapi tidak memakan seluruh sesi', () => {
  assert.strictEqual(plan.date, '2026-08-19');
  assert.ok(plan.mandatoryReview >= 1, 'ada 5 review jatuh tempo, minimal satu wajib');
  assert.ok(plan.mandatoryReview <= Math.floor(plan.questionsTarget / 2), 'review tidak boleh lebih dari separuh sesi');
  const total = plan.blocks.reduce((n, b) => n + b.questions, 0);
  assert.strictEqual(total, plan.questionsTarget, 'jumlah blok harus sama dengan target sesi');
  assert.ok(plan.blocks.every(b => b.questions > 0), 'tidak boleh ada blok kosong');
  assert.ok(plan.blocks.some(b => b.kind === 'focus'), 'selalu ada blok fokus');
});

test('tanpa review jatuh tempo, tidak ada review wajib yang dikarang', () => {
  const bersih = { ...evidence, memory: { ...evidence.memory, dueReviews: 0 } };
  const p = journey.buildTodayPlan({ mission, evidence: bersih, policy, now: NOW });
  assert.strictEqual(p.mandatoryReview, 0);
  assert.ok(!p.blocks.some(b => b.kind === 'review'));
});

test('avoidNewContent dihormati: tidak ada blok transfer saat materi baru ditahan', () => {
  assert.ok(!plan.blocks.some(b => b.kind === 'transfer'), 'policy.avoidNewContent aktif');
  const bebas = journey.buildTodayPlan({
    mission, evidence, policy: { ...policy, avoidNewContent: false, reviewShare: 0.25 }, now: NOW
  });
  assert.ok(bebas.blocks.some(b => b.kind === 'transfer'));
});

test('sesi terputus memicu recovery plan yang lebih pendek dan tenang', () => {
  const p = journey.buildTodayPlan({ mission, evidence, policy, now: NOW, interruptedSession: true });
  assert.strictEqual(p.mode, 'recovery');
  assert.strictEqual(p.pace, 'calm');
  assert.strictEqual(p.avoidNewContent, true);
  assert.ok(p.questionsTarget <= 8, 'sesi comeback harus pendek');
  assert.ok(p.rationale.codes.includes('session_interrupted'));
});

test('lama tidak belajar juga memicu recovery', () => {
  const r = journey.buildRecoveryPlan({ evidence, policy, now: NOW, lastLearningAt: NOW - 5 * DAY });
  assert.strictEqual(r.needed, true);
  assert.strictEqual(r.daysAway, 5);
  assert.ok(r.rationale.codes.includes('consistency_risk'));
  const segar = journey.buildRecoveryPlan({ evidence, policy, now: NOW, lastLearningAt: NOW - DAY });
  assert.strictEqual(segar.needed, false);
});

test('penjelasan dibangun dari rationale code, bukan teks bebas', () => {
  assert.strictEqual(journey.explainSelection(plan), plan.rationale.explanation);
  assert.ok(/jatuh tempo review/.test(mission.rationale.explanation));
  // Kode yang tidak dikenal diabaikan, tidak dicetak mentah ke layar pengguna.
  const asing = journey.buildTodayPlan({ mission, evidence, policy: { ...policy, rationaleCodes: ['kode_ngawur'] }, now: NOW });
  assert.ok(!/kode_ngawur/.test(asing.rationale.explanation));
});

test('input kosong tetap menghasilkan rencana yang aman dan terbatas', () => {
  const m = journey.buildWeeklyMission({ now: NOW });
  const p = journey.buildTodayPlan({ mission: m, now: NOW });
  assert.strictEqual(m.schema, journey.SCHEMA);
  assert.ok(m.sessionsTarget >= 2 && m.sessionsTarget <= 6);
  assert.ok(p.questionsTarget >= 1 && p.questionsTarget <= 20);
  assert.strictEqual(p.mandatoryReview, 0);
  assert.strictEqual(m.goalProfile.id, 'school');
});

test('tidak ada jawaban mentah, teks soal, atau data pribadi yang ikut terbawa', () => {
  const dump = JSON.stringify({ mission, plan });
  assert.ok(!/selectedAnswer|rawHistory|transcript|dictation/i.test(dump));
});

console.log('');
if (failures) { console.error('FIEZEL personal journey: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL personal journey: PASS');
