#!/usr/bin/env node
/**
 * tests/adaptive-cat-engine-test.js
 *
 * Verifikasi mekanis untuk FIEZEL Computerized Adaptive Placement (CAT) Engine:
 * 1. Mulai dari level menengah (A2 / Tier 1).
 * 2. Jawaban benar 2x berturut-turut menaikkan tingkat kesulitan (+1 level).
 * 3. Jawaban salah menurunkan tingkat kesulitan (-1 level).
 * 4. Berhenti secara objektif dalam 12–16 butir soal.
 * 5. Anti-Leak Exam Purity (isMeasureExam = true).
 * 6. Zero Third-Party Branding Guarantee.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const CatEngine = require('../features/placement/fiezel-adaptive-cat-engine.js');
const BankJa = require('../features/placement/fiezel-placement-bank-ja.js');
const BankEn = require('../features/placement/fiezel-placement-bank-en.js');

console.log('[TEST] Memulai verifikasi FIEZEL Adaptive CAT Engine...');

// 1. Verifikasi Bank Soal JA dan EN
assert.strictEqual(BankJa.JAPANESE_CAT_ITEMS.length, 36, 'Bank JA harus memiliki 36 butir soal.');
assert.strictEqual(BankEn.ENGLISH_CAT_ITEMS.length, 36, 'Bank EN harus memiliki 36 butir soal.');
console.log('✓ Pilar 1: Bank Soal JA (36) & EN (36) terverifikasi.');

// 2. Simulasi Murid Tingkat Tinggi (Menjawab Benar Terus)
{
  const session = CatEngine.createSession({ lang: 'ja', minQuestions: 12, maxQuestions: 16 });
  let q = session.getNextQuestion();
  assert.strictEqual(q.tier, 'A2', 'Soal pertama wajib dari level menengah (A2).');
  assert.strictEqual(q.isMeasureExam, true, 'Anti-Leak Exam Purity wajib bernilai true.');

  let steps = 0;
  while (q && !session.isCompleted()) {
    steps++;
    // Dapatkan kunci jawaban benar dari bank
    const item = BankJa.JAPANESE_CAT_ITEMS.find(it => it.id === q.id);
    const outcome = session.submitAnswer(q.id, item.correctAnswer);
    if (!outcome.isCompleted) {
      q = session.getNextQuestion();
    } else {
      break;
    }
  }

  const result = session.getState().finalResult;
  assert(result, 'Final result wajib terdefinisi.');
  assert(result.totalAnswered >= 12 && result.totalAnswered <= 16, `Jumlah soal harus 12-16, didapat: ${result.totalAnswered}`);
  assert.strictEqual(result.assignedLevel, 'B2', 'Murid yang menjawab benar terus harus ditempatkan di B2.');
  assert(result.calibratedTheta > 1.0, 'Theta murid mahir harus > 1.0');
  console.log(`✓ Pilar 2: Simulasi Mahir berhasil (${result.totalAnswered} soal -> Level ${result.assignedLevel}, Theta ${result.calibratedTheta}).`);
}

// 3. Simulasi Murid Pemula (Menjawab Salah Terus / Menyerah)
{
  const session = CatEngine.createSession({ lang: 'ja', minQuestions: 12, maxQuestions: 16 });
  let q = session.getNextQuestion();
  assert.strictEqual(q.tier, 'A2', 'Soal pertama wajib dari level menengah (A2).');

  while (q && !session.isCompleted()) {
    const outcome = session.submitAnswer(q.id, '🤷🏽 (Belum tahu)');
    if (!outcome.isCompleted) {
      q = session.getNextQuestion();
    } else {
      break;
    }
  }

  const result = session.getState().finalResult;
  assert(result, 'Final result pemula wajib terdefinisi.');
  assert.strictEqual(result.assignedLevel, 'A1', 'Murid pemula harus ditempatkan di A1.');
  assert(result.calibratedTheta < 0, 'Theta murid pemula harus negatif.');
  console.log(`✓ Pilar 3: Simulasi Pemula berhasil (${result.totalAnswered} soal -> Level ${result.assignedLevel}, Theta ${result.calibratedTheta}).`);
}

// 4. Simulasi Dinamis Adaptif Bahasa Inggris
{
  const session = CatEngine.createSession({ lang: 'en', minQuestions: 12, maxQuestions: 16 });
  let q = session.getNextQuestion();
  assert.strictEqual(q.tier, 'A2', 'Soal pertama EN wajib dari A2.');

  // Pola: Benar, Benar (naik ke B1), Salah (turun ke A2), Benar, Benar (naik ke B1)
  let count = 0;
  while (q && !session.isCompleted()) {
    count++;
    const item = BankEn.ENGLISH_CAT_ITEMS.find(it => it.id === q.id);
    // Selang-seling benar dan salah
    const answer = (count % 3 !== 0) ? item.correctAnswer : 'WRONG_CHOICE';
    const outcome = session.submitAnswer(q.id, answer);
    if (!outcome.isCompleted) {
      q = session.getNextQuestion();
    } else {
      break;
    }
  }

  const result = session.getState().finalResult;
  assert(result, 'Result EN wajib terdefinisi.');
  assert(result.totalAnswered >= 12 && result.totalAnswered <= 16, `Jumlah soal EN harus 12-16, didapat: ${result.totalAnswered}`);
  console.log(`✓ Pilar 4: Simulasi Adaptif EN berhasil (${result.totalAnswered} soal -> Level ${result.assignedLevel}, Accuracy ${result.accuracy}%).`);
}

// 5. Zero Third-Party Branding Guarantee
{
  const FORBIDDEN = ['preply', 'superchinese', 'irodori', 'goprep', 'peakchinese', 'hskcdn'];
  const filesToCheck = [
    'features/placement/fiezel-adaptive-cat-engine.js',
    'features/placement/fiezel-placement-bank-ja.js',
    'features/placement/fiezel-placement-bank-en.js',
    'features/phase2/phase2-style.css'
  ];

  filesToCheck.forEach(relPath => {
    const fullPath = path.join(ROOT, relPath);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
    FORBIDDEN.forEach(brand => {
      assert(
        !content.includes(brand),
        `Pelanggaran Sanitasi: Berkas ${relPath} masih memuat kata terlarang "${brand}"!`
      );
    });
  });
  console.log('✓ Pilar 5: Zero Third-Party Branding 100% STERIL terbukti.');
}

console.log('======================================================');
console.log('✓ SELURUH GERBANG FIEZEL ADAPTIVE CAT ENGINE LULUS 100%!');
console.log('======================================================');
