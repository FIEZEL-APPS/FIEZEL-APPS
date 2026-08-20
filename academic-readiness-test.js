/**
 * FIEZEL R4 gate — Academic and Scholarship Readiness.
 *
 * Dua hal yang paling mudah rusak di lane ini, dan keduanya merugikan murid:
 * menjanjikan skor ujian, dan menyatakan seseorang belum memenuhi syarat padahal FIEZEL
 * belum pernah mengukurnya. Keduanya diuji di sini, bukan sekadar ditulis di dokumen.
 */
const assert = require('assert');
const fs = require('fs');
const academic = require('./features/academic-readiness/fiezel-academic-readiness.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok - ' + name); }
  catch (e) { failures++; console.error('FAIL - ' + name + '\n    ' + e.message); }
}

const NOW = Date.parse('2026-08-20T05:00:00Z');
const bank = JSON.parse(fs.readFileSync('./reading-bank.json', 'utf8'));
const bankRows = Array.isArray(bank) ? bank : (bank.items || bank.passages || []);
const bankTopics = bankRows.map(r => ({ topic: r.topic, level: r.level }));

const snapshotKuat = {
  domains: {
    reading: { attempts: 30, accuracy: 72, recentAccuracy: 74, measured: 5, average: 70 },
    grammar: { attempts: 40, accuracy: 75, recentAccuracy: 78, measured: 6, average: 72 },
    vocabulary: { attempts: 50, accuracy: 80, recentAccuracy: 80, measured: 20, mastered: 12, average: 75 }
  }
};
const snapshotKosong = { domains: {} };
const spokenLengkap = {
  listening: { status: 'measured', attempts: 10, practiceScore: 70, completionRate: 80 },
  speaking: { status: 'measured', attempts: 8, practiceScore: 45, completionRate: 50 }
};

const foundation = academic.buildFoundationMap({ snapshot: snapshotKuat, evidence: { skills: { spoken: spokenLengkap } }, now: NOW });
const kosong = academic.buildFoundationMap({ snapshot: snapshotKosong, now: NOW });

test('now wajib diisi di semua entry point', () => {
  assert.throws(() => academic.buildFoundationMap({ snapshot: snapshotKuat }), /now wajib diisi/);
  assert.throws(() => academic.buildAcademicReadingPath({ bankTopics }), /now wajib diisi/);
  assert.throws(() => academic.buildScholarshipLab({}), /now wajib diisi/);
  assert.throws(() => academic.buildVocabularyPathway({}), /now wajib diisi/);
});

test('reproducible: input sama menghasilkan output identik', () => {
  const again = academic.buildFoundationMap({ snapshot: snapshotKuat, evidence: { skills: { spoken: spokenLengkap } }, now: NOW });
  assert.strictEqual(JSON.stringify(again), JSON.stringify(foundation));
});

test('tidak pernah memprediksi skor atau menyatakan siap ujian', () => {
  assert.strictEqual(foundation.scorePrediction, false);
  assert.strictEqual(foundation.readinessClaim, false);
  const dump = JSON.stringify([foundation, kosong,
    academic.buildScholarshipLab({ snapshot: snapshotKuat, now: NOW }),
    academic.buildAcademicReadingPath({ bankTopics, snapshot: snapshotKuat, now: NOW })]);
  // Angka berbentuk band IELTS atau skor TOEFL tidak boleh muncul dalam bentuk apa pun.
  assert.ok(!/\bband\b|\b[4-9]\.[05]\b|\bskor\s*\d|\bscore\s*\d|\b(1[0-9]{2}|[5-9][0-9])\s*(poin|points)\b/i.test(dump));
  assert.ok(/tidak memprediksi skor/i.test(foundation.note));
});

test('prasyarat tanpa bukti berstatus unknown, bukan gagal', () => {
  // Ini pembedaan yang paling penting di modul ini: belum diukur bukan berarti tidak mampu.
  assert.strictEqual(kosong.requirements.length, 5);
  for (const req of kosong.requirements) {
    assert.strictEqual(req.status, 'unknown', `${req.id} seharusnya unknown tanpa bukti`);
    assert.ok(/belum cukup/i.test(req.basis));
  }
  assert.strictEqual(kosong.metCount, 0);
  assert.strictEqual(kosong.unknownCount, 5);
});

test('prasyarat dengan bukti dinilai apa adanya', () => {
  const byId = Object.fromEntries(foundation.requirements.map(r => [r.id, r]));
  assert.strictEqual(byId.academic_reading.status, 'met', 'akurasi 74% dari 30 bacaan');
  assert.strictEqual(byId.grammar_accuracy.status, 'met');
  assert.strictEqual(byId.vocabulary_breadth.status, 'met', '12 dari 20 materi dikuasai');
  assert.strictEqual(byId.listening_notetaking.status, 'met', 'skor latihan 70%');
  // Speaking punya bukti tetapi belum cukup: ini not_met, bukan unknown.
  assert.strictEqual(byId.academic_speaking.status, 'not_met', 'skor latihan 45% di bawah ambang');
  assert.ok(/8 latihan tercatat/.test(byId.academic_speaking.basis));
});

test('bukti tipis tetap unknown, tidak dipaksa jadi penilaian', () => {
  const tipis = academic.buildFoundationMap({
    snapshot: { domains: { reading: { attempts: 3, accuracy: 90 }, grammar: { attempts: 4, accuracy: 90 } } },
    spoken: { listening: { attempts: 2, practiceScore: 90 }, speaking: { attempts: 1, practiceScore: 90 } },
    now: NOW
  });
  for (const req of tipis.requirements) {
    assert.strictEqual(req.status, 'unknown', `${req.id}: 3-4 jawaban belum cukup untuk menyimpulkan apa pun`);
  }
});

test('topik jalur akademik benar-benar ada di bank bacaan', () => {
  // Kalau bank berubah dan daftar topik tidak, jalur akan kosong tanpa suara. Gate ini yang
  // membuatnya bersuara.
  const adaDiBank = new Set(bankRows.map(r => r.topic));
  for (const topic of academic.ACADEMIC_READING_TOPICS) {
    assert.ok(adaDiBank.has(topic), `topik "${topic}" tidak ada lagi di reading-bank.json`);
  }
});

test('mini-path reading tersusun dari materi nyata', () => {
  const path = academic.buildAcademicReadingPath({ bankTopics, snapshot: snapshotKuat, now: NOW });
  assert.strictEqual(path.stages.length, 3);
  assert.ok(path.totalItems > 0, 'ada materi akademik nyata di bank');
  for (const stage of path.stages) {
    if (stage.items > 0) {
      assert.strictEqual(stage.status, 'available');
      assert.ok(stage.topics.length > 0);
      for (const topic of stage.topics) assert.ok(academic.ACADEMIC_READING_TOPICS.includes(topic));
    } else {
      assert.strictEqual(stage.status, 'content_pending');
    }
  }
  assert.strictEqual(path.locked, false, 'prasyarat adalah informasi, bukan gembok');
});

test('tanpa bank, jalur dinyatakan menunggu konten dan bukan dikarang', () => {
  const path = academic.buildAcademicReadingPath({ snapshot: snapshotKuat, now: NOW });
  assert.strictEqual(path.totalItems, 0);
  for (const stage of path.stages) {
    assert.strictEqual(stage.status, 'content_pending');
    assert.deepStrictEqual(stage.topics, []);
  }
});

test('jalur kosakata IT/kampus jujur bahwa kontennya belum ada', () => {
  const vocabTopics = [...new Set(JSON.parse(fs.readFileSync('./vocabulary-master.json', 'utf8'))
    .map(x => x.topic).filter(Boolean))];
  const pathway = academic.buildVocabularyPathway({ vocabTopics, now: NOW });
  assert.strictEqual(pathway.status, 'content_pending', 'bank kosakata baru bertopik general/advanced');
  assert.deepStrictEqual(pathway.availableTopics, []);
  assert.ok(/tidak akan melabeli ulang/i.test(pathway.note));
  // Begitu konten bertema benar-benar ada, jalurnya hidup tanpa mengubah modul.
  const nanti = academic.buildVocabularyPathway({ vocabTopics: ['general', 'it', 'campus'], now: NOW });
  assert.strictEqual(nanti.status, 'available');
  assert.deepStrictEqual(nanti.availableTopics, ['campus', 'it']);
});

test('lab beasiswa punya tugas nyata dengan prasyarat yang terbaca', () => {
  const lab = academic.buildScholarshipLab({ snapshot: snapshotKuat, now: NOW });
  assert.strictEqual(lab.tasks.length, 3);
  const ids = lab.tasks.map(t => t.id);
  assert.deepStrictEqual(ids, ['formal_email', 'self_introduction', 'interview_practice']);
  for (const task of lab.tasks) {
    assert.ok(task.practises.length >= 3, `${task.id} harus menjelaskan apa yang dilatih`);
    assert.ok(['met', 'not_met', 'unknown'].includes(task.supportedBy));
  }
  const labKosong = academic.buildScholarshipLab({ snapshot: snapshotKosong, now: NOW });
  assert.ok(labKosong.tasks.every(t => t.supportedBy === 'unknown'), 'tanpa bukti, statusnya unknown');
  assert.strictEqual(labKosong.scorePrediction, false);
});

test('tidak ada data pribadi atau jawaban mentah di keluaran', () => {
  const dump = JSON.stringify([foundation, academic.buildScholarshipLab({ snapshot: snapshotKuat, now: NOW })]);
  assert.ok(!/selectedAnswer|transcript|dictation|rawAudio/i.test(dump));
});

console.log('');
if (failures) { console.error('FIEZEL academic readiness: FAIL (' + failures + ')'); process.exit(1); }
console.log('FIEZEL academic readiness: PASS');
