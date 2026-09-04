#!/usr/bin/env node
/**
 * m025-125 — menyuntikkan terjemahan Bahasa Indonesia ke grammar-templates.json.
 *
 * Sumber kebenaran terjemahan ada di grammar-explanations-id.json (satu berkas terpisah
 * supaya mudah ditinjau). Skrip ini menyalinnya menjadi field "...Id" di dalam bank soal
 * yang benar-benar dimuat aplikasi, tanpa menyentuh teks Inggris aslinya — teks Inggris
 * tetap disimpan sebagai rujukan penulis dan sebagai cadangan terakhir runtime.
 *
 * Jalankan ulang setiap kali terjemahan bertambah:  node audit/merge-grammar-id.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BANK = path.join(ROOT, 'grammar-templates.json');
const SOURCE = path.join(ROOT, 'grammar-explanations-id.json');

const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));
const id = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

const byId = {};
for (const t of bank.templates) byId[t.id] = t;

const unknown = Object.keys(id.templates).filter(k => !byId[k]);
if (unknown.length) {
  console.error('Terjemahan menunjuk template yang tidak ada: ' + unknown.join(', '));
  process.exit(1);
}

let patched = 0;
for (const [key, tr] of Object.entries(id.templates)) {
  const t = byId[key];
  t.explanation = t.explanation || {};

  if (tr.rule) t.explanation.ruleId = tr.rule;
  if (tr.whyCorrect) t.explanation.whyCorrectId = tr.whyCorrect;
  if (tr.whyOthersFail) t.explanation.whyOthersFailId = tr.whyOthersFail;
  if (tr.howToAvoid) t.explanation.howToAvoidId = tr.howToAvoid;
  if (tr.memoryCue) t.explanation.memoryCueId = tr.memoryCue;
  if (tr.objective) t.pedagogicalObjectiveId = tr.objective;
  if (tr.misconception) t.misconceptionTargetedId = tr.misconception;
  if (tr.reasoning) t.reasoningOperationId = tr.reasoning;

  for (const [option, d] of Object.entries(tr.distractors || {})) {
    const target = (t.distractors || []).find(x => String(x.option) === option);
    if (!target) {
      console.error('Template ' + key + ': distraktor "' + option + '" tidak ada di bank soal');
      process.exit(1);
    }
    if (d.whyFails) target.whyFailsId = d.whyFails;
    if (d.misconception) target.misconceptionId = d.misconception;
  }
  patched++;
}

bank.indonesianCoverage = {
  translated: patched,
  total: bank.templates.length,
  updatedAt: new Date().toISOString().slice(0, 10),
};

fs.writeFileSync(BANK, JSON.stringify(bank, null, 2) + '\n');
console.log(patched + '/' + bank.templates.length + ' template grammar sudah punya penjelasan Bahasa Indonesia');
