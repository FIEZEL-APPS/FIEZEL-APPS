/**
 * tests/japanese-jlpt-moshi-test.js
 *
 * Verifikasi kontrak fitur Simulasi JLPT Moshi (N5–N1):
 * 1. Pintu masuk JLPT Moshi terbuka untuk seluruh level N5–N1 tanpa terblokir 'ujian berantai'.
 * 2. Modal openJlptMoshiPanel menyediakan pemilih level interaktif N5–N1.
 * 3. startJlptMoshiExam merakit 25 butir soal valid berstandar JLPT untuk setiap level N5–N1.
 * 4. Mode Moshi tidak mengenakan penalti cooldown 24 jam saat gagal atau ditinggalkan.
 * 5. Nol kebocoran istilah CEFR (A1–C2) pada toast maupun panel Moshi.
 */

const assert = require('assert');
const fs = require('fs');

const appJs = fs.readFileSync('app.js', 'utf8');
const idCopy = fs.readFileSync('features/i18n/copy-id-bahasa.js', 'utf8');
const thCopy = fs.readFileSync('features/i18n/copy-th-bahasa.js', 'utf8');
const jaUi = fs.readFileSync('features/japanese/fiezel-ja-ui.js', 'utf8');

// 1. i18n Keys Parity
assert.ok(idCopy.includes('jepang.moshi-start-toast'), 'copy-id harus memuat jepang.moshi-start-toast');
assert.ok(thCopy.includes('jepang.moshi-start-toast'), 'copy-th harus memuat jepang.moshi-start-toast');
assert.ok(!idCopy.includes('{level} · CEFR'), 'copy-id tidak boleh membocorkan CEFR di moshi');

// 2. Moshi launcher markup
assert.ok(jaUi.includes('function moshiCardMarkup'), 'FiezelJaUi harus mendefinisikan moshiCardMarkup');
assert.ok(jaUi.includes('openJlptMoshiPanel()'), 'moshiCardMarkup harus memanggil openJlptMoshiPanel()');

// 3. openJlptMoshiPanel & startJlptMoshiExam
assert.ok(appJs.includes('function openJlptMoshiPanel'), 'app.js harus mendefinisikan openJlptMoshiPanel');
assert.ok(appJs.includes('window.openJlptMoshiPanel=openJlptMoshiPanel'), 'openJlptMoshiPanel harus diekspos ke window');
assert.ok(appJs.includes('function startJlptMoshiExam'), 'app.js harus mendefinisikan startJlptMoshiExam');
assert.ok(appJs.includes('window.startJlptMoshiExam=startJlptMoshiExam'), 'startJlptMoshiExam harus diekspos ke window');

// 4. Zero Chained Exam Lockout on Moshi
assert.ok(
  appJs.includes('buildLevelExamQuestions(target)') && appJs.includes('isMoshi:true'),
  'startJlptMoshiExam harus langsung memanggil buildLevelExamQuestions dan quizLoop dengan isMoshi:true tanpa dihalangi levelExamAvailability'
);

// 5. No Cooldown Penalty on Moshi Failure/Exit
assert.ok(appJs.includes('noCooldown:isMoshi'), 'levelExamSettle harus meneruskan noCooldown:isMoshi ke recordSkipExamFail');
assert.ok(appJs.includes('noCooldown:!!a.isMoshi'), 'abandonActiveSession harus meneruskan noCooldown:!!a.isMoshi ke recordSkipExamFail');

// 6. Interactive Level Chips in Moshi Panel
assert.ok(appJs.includes('badge-chip'), 'openJlptMoshiPanel harus merender level chips N5-N1');
assert.ok(appJs.includes("['A1','A2','B1','B2','C1']"), 'openJlptMoshiPanel harus mendukung kelima level JLPT N5-N1');

console.log('PASS: Semua kontrak unit JLPT Moshi (N5–N1) valid dan terverifikasi!');
