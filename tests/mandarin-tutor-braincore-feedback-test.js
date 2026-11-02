/**
 * tests/mandarin-tutor-braincore-feedback-test.js
 *
 * Uji Mutu Mekanis Penyelarasan Tutor Character & Braincore Feedback Mandarin 1:1 dengan Jepang & Inggris.
 *
 * Memverifikasi:
 * 1. Skema Distraktor Presisi: Setiap distraktor memiliki 'option' persis yang ada di options template.
 * 2. Mengapa Salah & Miskonsepsi: Setiap distraktor memiliki whyFailsId dan misconceptionId non-empty.
 * 3. Kelengkapan Penjelasan: explanation memiliki rule, ruleId, why, whyCorrect, whyCorrectId, memory, avoid.
 * 4. Step Tutor Triples: pedagogicalObjectiveId, misconceptionTargetedId, reasoningOperationId (3 langkah ->).
 * 5. Sinkronisasi Bank Konten content/zh/: grammar-templates-zh.json, family-graph-zh.json, vocabulary-master-zh.json.
 * 6. Zero Third-Party Branding & Clean Room Invariant.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

console.log('[TEST] Menjalankan verifikasi Tutor Character & Braincore Feedback Mandarin 1:1...');

// 1. Verifikasi Modul Mandarin Grammar Bank
const gb = require(path.join(ROOT, 'features/mandarin/mandarin-grammar-bank.js'));
assert.ok(gb, 'Modul mandarin-grammar-bank harus ada');
assert.strictEqual(typeof gb.getTemplates, 'function', 'Harus memiliki method getTemplates()');

const templates = gb.getTemplates();
assert.strictEqual(templates.length, 192, 'Harus ada tepat 192 templates');

// 2. Verifikasi Tiap Template
for (let i = 0; i < templates.length; i++) {
  const t = templates[i];
  assert.ok(t.id, `Template #${i + 1} harus punya id`);
  assert.ok(t.lessonId, `Template #${i + 1} harus punya lessonId`);
  assert.ok(t.family, `Template #${i + 1} harus punya family`);
  assert.ok(Array.isArray(t.options), `Template #${i + 1} options harus array`);
  assert.strictEqual(t.options.length, 4, `Template #${i + 1} options harus tepat 4 pilihan`);
  assert.ok(Number.isInteger(t.correctIndex), `Template #${i + 1} correctIndex harus integer`);
  assert.ok(t.correctIndex >= 0 && t.correctIndex < 4, `Template #${i + 1} correctIndex harus 0..3`);

  // Distraktor: tepat 3 distraktor dan string opsi WAJIB cocok persis dengan pilihan salah
  assert.ok(Array.isArray(t.distractors), `Template #${i + 1} distractors harus array`);
  assert.strictEqual(t.distractors.length, 3, `Template #${i + 1} harus punya tepat 3 distractors`);

  for (const d of t.distractors) {
    assert.ok(d.option, `Template #${i + 1} distractor harus punya option non-empty`);
    assert.ok(t.options.includes(d.option), `Template #${i + 1} option "${d.option}" harus ada di options`);
    assert.notStrictEqual(d.option, t.options[t.correctIndex], `Template #${i + 1} distractor tidak boleh opsi benar`);
    assert.ok(d.whyFailsId, `Template #${i + 1} distractor harus punya whyFailsId`);
    assert.ok(d.misconception, `Template #${i + 1} distractor harus punya misconception`);
    assert.ok(d.misconceptionId, `Template #${i + 1} distractor harus punya misconceptionId`);
  }

  // Explanation: wajib lengkap dengan alias rule, why, whyCorrect
  assert.ok(t.explanation, `Template #${i + 1} harus punya explanation`);
  assert.ok(t.explanation.rule, `Template #${i + 1} explanation.rule harus ada`);
  assert.ok(t.explanation.ruleId, `Template #${i + 1} explanation.ruleId harus ada`);
  assert.ok(t.explanation.why, `Template #${i + 1} explanation.why harus ada`);
  assert.ok(t.explanation.whyCorrect, `Template #${i + 1} explanation.whyCorrect harus ada`);
  assert.ok(t.explanation.whyCorrectId, `Template #${i + 1} explanation.whyCorrectId harus ada`);
  assert.ok(t.explanation.memory, `Template #${i + 1} explanation.memory harus ada`);
  assert.ok(t.explanation.avoid, `Template #${i + 1} explanation.avoid harus ada`);

  // Step Tutor Triples
  assert.ok(t.pedagogicalObjectiveId, `Template #${i + 1} harus punya pedagogicalObjectiveId`);
  assert.ok(t.misconceptionTargetedId, `Template #${i + 1} harus punya misconceptionTargetedId`);
  assert.ok(t.reasoningOperationId, `Template #${i + 1} harus punya reasoningOperationId`);

  // Verifikasi dekomposisi langkah logis Step Tutor (format ->)
  const steps = t.reasoningOperationId.split(/\s*->\s*/);
  assert.strictEqual(steps.length, 3, `Template #${i + 1} reasoningOperationId harus terdekomposisi menjadi tepat 3 langkah via "->"`);
}
console.log('✓ Pilar 1 & 2: 192 Templates dengan Distraktor Presisi & Step Tutor Triples terverifikasi.');

// 3. Verifikasi content/zh/grammar-templates-zh.json
const zhBankPath = path.join(ROOT, 'content/zh/grammar-templates-zh.json');
assert.ok(fs.existsSync(zhBankPath), 'content/zh/grammar-templates-zh.json harus ada');
const zhBank = JSON.parse(fs.readFileSync(zhBankPath, 'utf8'));
assert.strictEqual(zhBank.target, 'zh');
assert.strictEqual(zhBank.templates.length, 192);
console.log('✓ Pilar 3: content/zh/grammar-templates-zh.json terverifikasi.');

// 4. Verifikasi content/zh/family-graph-zh.json
const zhGraphPath = path.join(ROOT, 'content/zh/family-graph-zh.json');
assert.ok(fs.existsSync(zhGraphPath), 'content/zh/family-graph-zh.json harus ada');
const zhGraph = JSON.parse(fs.readFileSync(zhGraphPath, 'utf8'));
assert.strictEqual(zhGraph.target, 'zh');
assert.ok(Object.keys(zhGraph.families).length >= 10, 'Graf keluarga Mandarin harus memuat minimal 10 keluarga gramatika');
console.log('✓ Pilar 4: content/zh/family-graph-zh.json terverifikasi.');

// 5. Verifikasi content/zh/vocabulary-master-zh.json
const zhVocabPath = path.join(ROOT, 'content/zh/vocabulary-master-zh.json');
assert.ok(fs.existsSync(zhVocabPath), 'content/zh/vocabulary-master-zh.json harus ada');
const zhVocab = JSON.parse(fs.readFileSync(zhVocabPath, 'utf8'));
assert.strictEqual(zhVocab.words.length, 2194, 'Vocabulary master zh harus memuat 2.194 kata unik');
for (let j = 0; j < 20; j++) {
  const w = zhVocab.words[j];
  assert.ok(w.word, 'Kata harus punya word');
  assert.ok(w.kana, 'Kata harus punya kana/pinyin');
  assert.ok(w.meaning, 'Kata harus punya meaning');
  assert.strictEqual(w.status, 'complete');
}
console.log('✓ Pilar 5: content/zh/vocabulary-master-zh.json terverifikasi.');

// 6. Zero Third-Party Branding Invariant
const bankContent = fs.readFileSync(path.join(ROOT, 'features/mandarin/mandarin-grammar-bank.js'), 'utf8');
assert.ok(!/SuperChinese/i.test(bankContent), 'Dilarang memuat SuperChinese');
assert.ok(!/akm\.hskcdn\.com/i.test(bankContent), 'Dilarang memuat CDN pihak ketiga');
assert.ok(!/\bChao\b/.test(bankContent), 'Dilarang memuat Chao');
console.log('✓ Pilar 6: Zero Third-Party Branding terverifikasi.');

console.log('======================================================');
console.log('✓ SELURUH UJI MUTU TUTOR CHARACTER & BRAINCORE FEEDBACK MANDARIN LULUS 100%!');
console.log('======================================================');
