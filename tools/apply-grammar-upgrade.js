#!/usr/bin/env node
/**
 * apply-grammar-upgrade.js — Grammar Quality Upgrade A1-B2 (Braincore).
 *
 * Menerapkan dua patch data dari tools/grammar-upgrade/ ke bank soal beserta
 * seluruh berkas turunannya yang dijaga gerbang CI:
 *   1. stem-rewrites.json    -> stem A1-B2 disederhanakan (opsi/kunci/ID tetap).
 *   2. new-templates-*.json  -> template kedua untuk lesson yang masih satu template
 *                              (en + id + th sekaligus; label miskonsepsi baru ikut
 *                              didaftarkan ke diagnosis id + peta th).
 * Berkas yang ditulis: grammar-templates.json, grammar-explanations-th.json,
 * grammar-misconception-id.json, tools/th-strings/misconception-diagnosis.json,
 * tools/th-strings/cloze.json. Berkas turunan lain diregenerasi oleh alat resminya
 * (lihat urutan di bagian bawah). Idempoten: template yang sudah ada dilewati.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const write = (p, v) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(v, null, 2) + '\n');

const bank = read('grammar-templates.json');
const th = read('grammar-explanations-th.json');
const diag = read('grammar-misconception-id.json');
const diagTh = read('tools/th-strings/misconception-diagnosis.json');
const clozeTh = read('tools/th-strings/cloze.json');
const rewrites = read('tools/grammar-upgrade/stem-rewrites.json');
const packs = ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => read('tools/grammar-upgrade/new-templates-' + k + '.json'));

const byId = new Map(bank.templates.map((t) => [t.id, t]));
let stemChanged = 0, added = 0, labelsAdded = 0, clozeMapped = 0;

/* 1. stem rewrites */
for (const [id, stem] of Object.entries(rewrites.stems)) {
  const t = byId.get(id);
  if (!t) throw new Error('stem rewrite menunjuk template yang tidak ada: ' + id);
  if (t.stem !== stem) { t.stem = stem; stemChanged++; }
}
for (const [id, map] of Object.entries(rewrites.whyFails || {})) {
  const t = byId.get(id);
  for (const [option, text] of Object.entries(map)) {
    const d = (t.distractors || []).find((x) => x.option === option);
    if (!d) throw new Error('whyFails override: opsi tidak ada ' + id + ' / ' + option);
    d.whyFails = text;
  }
}

/* 2. new templates */
const newLabels = Object.assign({}, ...packs.map((p) => p.newLabels || {}));
for (const pack of packs) {
  for (const n of pack.templates) {
    if (byId.has(n.id)) continue;
    const en = n.en, id_ = n.id_, tth = n.th;
    /* '@sibling:N' -> label/miskonsepsi distraktor ke-N dari template pertama lesson yang sama */
    const sib = bank.templates.find((t) => t.subskill === n.subskill && t.id !== n.id);
    const resolve = (v, pick) => { const m = /^@sibling:(\d)$/.exec(String(v || '')); if (!m) return v; if (!sib) throw new Error(n.id + ': tidak ada template saudara'); return pick(sib.distractors[Number(m[1])]); };
    for (const d of en.distractors) {
      d.misconception = resolve(d.misconception, (x) => x.misconception);
      id_.distractors[d.option].misconception = resolve(id_.distractors[d.option].misconception, (x) => x.misconceptionId);
      tth.distractors[d.option].misconception = resolve(tth.distractors[d.option].misconception, (x) => th.templates[sib.id].distractors[x.option].misconception);
    }
    if (en.options.length !== 4 || en.distractors.length !== 3) throw new Error(n.id + ': opsi/distraktor tidak 4/3');
    const wrong = en.options.filter((_, i) => i !== en.correctIndex);
    for (const d of en.distractors) {
      if (!wrong.includes(d.option)) throw new Error(n.id + ': distraktor bukan opsi salah: ' + d.option);
      if (!id_.distractors[d.option] || !tth.distractors[d.option]) throw new Error(n.id + ': distraktor tanpa id/th: ' + d.option);
      if (!diag.diagnoses[d.misconception]) {
        const nl = newLabels[d.misconception];
        if (!nl) throw new Error(n.id + ': label miskonsepsi belum punya diagnosis: ' + d.misconception);
        diag.diagnoses[d.misconception] = nl.id;
        if (!diagTh[nl.id]) diagTh[nl.id] = nl.th;
        labelsAdded++;
      }
    }
    const tpl = {
      id: n.id, family: n.family, subskill: n.subskill, cefr: n.cefr, questionType: n.questionType,
      pedagogicalObjective: en.objective, misconceptionTargeted: en.misconception, reasoningOperation: en.reasoning,
      stem: en.stem, options: en.options, correctIndex: en.correctIndex,
      distractors: en.distractors.map((d) => ({
        option: d.option, misconception: d.misconception, whyFails: d.whyFails,
        whyFailsId: id_.distractors[d.option].whyFails, misconceptionId: id_.distractors[d.option].misconception
      })),
      explanation: {
        whyCorrect: en.explanation.whyCorrect, rule: en.explanation.rule, whyOthersFail: en.explanation.whyOthersFail,
        howToAvoid: en.explanation.howToAvoid, memoryCue: en.explanation.memoryCue,
        ruleId: id_.rule, whyCorrectId: id_.whyCorrect, whyOthersFailId: id_.whyOthersFail, howToAvoidId: id_.howToAvoid, memoryCueId: id_.memoryCue
      },
      pedagogicalObjectiveId: id_.objective, misconceptionTargetedId: id_.misconception, reasoningOperationId: id_.reasoning
    };
    bank.templates.push(tpl); byId.set(tpl.id, tpl); added++;
    th.templates[n.id] = {
      objective: tth.objective, misconception: tth.misconception, reasoning: tth.reasoning, rule: tth.rule,
      whyCorrect: tth.whyCorrect, whyOthersFail: tth.whyOthersFail, howToAvoid: tth.howToAvoid, memoryCue: tth.memoryCue,
      distractors: Object.fromEntries(en.distractors.map((d) => [d.option, { misconception: tth.distractors[d.option].misconception, whyFails: tth.distractors[d.option].whyFails }]))
    };
    /* peta th untuk cloze (kunci = teks Indonesia persis) */
    const pairs = [[id_.whyCorrect, tth.whyCorrect], [id_.rule, tth.rule], [id_.memoryCue, tth.memoryCue], [id_.howToAvoid, tth.howToAvoid]];
    for (const d of en.distractors) pairs.push([id_.distractors[d.option].whyFails, tth.distractors[d.option].whyFails], [id_.distractors[d.option].misconception, tth.distractors[d.option].misconception]);
    for (const [k, v] of pairs) if (k && v && !clozeTh[k]) { clozeTh[k] = v; clozeMapped++; }
  }
}

/* 3. urutan th mengikuti bank, hitung ulang count */
const orderedTh = {};
for (const t of bank.templates) { if (!th.templates[t.id]) throw new Error('th hilang untuk ' + t.id); orderedTh[t.id] = th.templates[t.id]; }
th.templates = orderedTh;
bank.count = bank.templates.length;
bank.indonesianCoverage = { translated: bank.templates.length, total: bank.templates.length, updatedAt: new Date().toISOString().slice(0, 10) };
diag.count = Object.keys(diag.diagnoses).length;

write('grammar-templates.json', bank);
write('grammar-explanations-th.json', th);
write('grammar-misconception-id.json', diag);
write('tools/th-strings/misconception-diagnosis.json', diagTh);
write('tools/th-strings/cloze.json', clozeTh);
console.log(`apply-grammar-upgrade: stem=${stemChanged} template baru=${added} label baru=${labelsAdded} peta cloze th=${clozeMapped} total template=${bank.count}`);
console.log('Lanjutkan: node tools/sync-grammar-explanations-id.js --write && node tools/build-misconception-taxonomy.js --write && node tools/generate-th-misconception.js && node tools/build-cloze-bank.js --write && node tools/generate-th-cloze.js && node id-golden-snapshot-test.js --write-baseline');
