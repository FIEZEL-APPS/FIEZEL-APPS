#!/usr/bin/env node
/**
 * m025-124 — sidak menyeluruh bank soal.
 *
 * Menjawab dua keluhan pemilik sekaligus:
 *  1. soal ambigu / bocoran template ("Target: ...", "In the case at ...")
 *  2. teks belajar berbahasa Inggris di bagian yang seharusnya Bahasa Indonesia
 *
 * Aturan bahasa yang dipakai audit ini:
 *  - materi target boleh Inggris  : passage bacaan, script listening, stem soal grammar,
 *                                   pilihan yang memang berupa bentuk Inggris yang diuji
 *  - selain itu wajib Indonesia   : pertanyaan, penjelasan, aturan, alasan distraktor,
 *                                   pilihan yang berupa pernyataan pemahaman
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

// Penanda Inggris yang tidak pernah muncul di kalimat Indonesia yang wajar.
const EN_MARKERS = /\b(the|is|are|was|were|of|that|this|which|because|before|after|and|with|to|from|for|not|does|do|did|has|have|will|would|should|could|it|they|you|when|where|why|how|but|use|used|take|takes|comes|stands|cannot|must)\b/gi;
const ID_MARKERS = /\b(yang|dan|di|ke|dari|itu|ini|untuk|dengan|pada|adalah|karena|tidak|bukan|kata|kalimat|jawaban|pilihan|soal|bisa|dapat|akan|harus|sudah|saat|waktu|lalu|jika|supaya|agar|makna|arti|bentuk)\b/gi;

// Bentuk Inggris yang memang sedang diajarkan boleh dikutip di dalam kalimat Indonesia
// ("Must" dan "have to" menyatakan kewajiban). Kutipan dan istilah bentuk grammar dibuang
// dulu supaya tidak terhitung sebagai bukti bahwa kalimatnya berbahasa Inggris.
const GRAMMAR_TERMS = /\b(present|past|future|simple|continuous|perfect|progressive|passive|active|gerund|infinitive|participle|modal|conditional|superlative|comparative|subjunctive|auxiliary|clause|tense|aspect)\b/gi;

function stripTargetLanguage(text) {
  return String(text || '')
    .replace(/[“"][^”"]*[”"]/g, ' ')   // kutipan bentuk Inggris
    .replace(/[‘'][^’']*[’']/g, ' ')
    .replace(GRAMMAR_TERMS, ' ');
}

function looksEnglish(text) {
  const s = stripTargetLanguage(text).trim();
  if (s.length < 12) return false;
  const en = (s.match(EN_MARKERS) || []).length;
  const id = (s.match(ID_MARKERS) || []).length;
  // Satu penanda Indonesia saja sudah cukup membuktikan kalimatnya Indonesia: penjelasan
  // yang menyebut bentuk Inggris tanpa tanda kutip ("pakai must have, bukan can't have")
  // tetap kalimat Indonesia, sedangkan kalimat Inggris utuh tidak pernah memuat satu pun.
  return en >= 2 && id === 0;
}

const LEAK = [
  { re: /Target:\s*[“"]/, why: 'bocoran template: menempelkan daftar kata kunci "Target:"' },
  { re: /In the case at /i, why: 'bocoran template: pembuka generik "In the case at ..."' },
  { re: /patternId/, why: 'metadata generator bocor ke teks siswa' },
  { re: /\b(lorem ipsum|placeholder|TBD|TODO)\b/i, why: 'teks penampung belum diganti' },
];

const findings = [];
const add = (bank, id, kind, detail, sample) =>
  findings.push({ bank, id, kind, detail, sample: String(sample || '').slice(0, 160) });

// ---------------------------------------------------------------- vocabulary
const V = read('vocabulary-master.json');
const POS_ID = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'determiner', 'interjection'];
for (const v of V) {
  if (!POS_ID.includes(String(v.partOfSpeech))) {
    add('vocab', v.id, 'pos-tak-berlabel-indonesia',
      'partOfSpeech "' + v.partOfSpeech + '" tidak punya padanan Bahasa Indonesia; label mentah Inggris akan tampil di pilihan jawaban', v.word);
  }
  if (!v.example) {
    add('vocab', v.id, 'soal-tanpa-konteks',
      'tidak ada kalimat contoh, sehingga soal jenis kata menjadi ambigu', v.word);
  } else {
    const stem = v.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp('\\b' + stem, 'i').test(v.example)) {
      add('vocab', v.id, 'contoh-tidak-memuat-kata',
        'kalimat contoh tidak memuat kata target, jadi tidak bisa dipakai menjelaskan jenis kata', v.word + ' :: ' + v.example);
    }
  }
}

// ------------------------------------------------------------------- grammar
const G = read('grammar-templates.json').templates;
// Teks Inggris asli sengaja tetap disimpan sebagai rujukan penulis. Yang diperiksa adalah
// apakah versi Bahasa Indonesia-nya ADA, karena runtime membaca varian "...Id" lebih dulu;
// selama versi itu ada, siswa tidak pernah melihat kalimat Inggrisnya.
const TITLES = (() => {
  try { return require('../grammar-labels-id.js').GRAMMAR_SKILL_TITLES_ID || {}; }
  catch (e) { return {}; }
})();

for (const t of G) {
  const ex = t.explanation || {};
  const bag = {
    rule: [ex.ruleId, ex.rule], whyCorrect: [ex.whyCorrectId, ex.whyCorrect],
    whyOthersFail: [ex.whyOthersFailId, ex.whyOthersFail],
    howToAvoid: [ex.howToAvoidId, ex.howToAvoid], memoryCue: [ex.memoryCueId, ex.memoryCue],
    objective: [t.pedagogicalObjectiveId, t.pedagogicalObjective],
    misconception: [t.misconceptionTargetedId, t.misconceptionTargeted],
    reasoning: [t.reasoningOperationId, t.reasoningOperation],
  };
  // memoryCue dikecualikan dari pemeriksaan bahasa: pengingatnya memang berupa pola Inggris
  // yang sedang dihafal ("There are + jamak; there is + tunggal"), jadi wajar kalau isinya
  // didominasi bentuk Inggris. Yang tetap diperiksa adalah keberadaannya.
  const LANG_EXEMPT = new Set(['memoryCue']);

  for (const f of Object.keys(bag)) {
    const [id, en] = bag[f];
    if (!en) continue;
    if (id && LANG_EXEMPT.has(f)) continue;
    if (!id) {
      add('grammar', t.id, 'penjelasan-belum-diterjemahkan',
        'field "' + f + '" belum punya versi Bahasa Indonesia dan akan tampil dalam Bahasa Inggris sebagai pilihan/penjelasan', en);
    } else if (looksEnglish(id)) {
      add('grammar', t.id, 'terjemahan-masih-berbahasa-inggris',
        'field "' + f + '" sudah punya varian Indonesia tetapi isinya masih Bahasa Inggris', id);
    }
  }
  for (const d of t.distractors || []) {
    if (d.whyFails && !d.whyFailsId) {
      add('grammar', t.id, 'alasan-distraktor-belum-diterjemahkan',
        'alasan untuk pilihan "' + d.option + '" belum punya versi Bahasa Indonesia', d.whyFails);
    }
    if (d.misconception && !d.misconceptionId) {
      add('grammar', t.id, 'label-miskonsepsi-belum-diterjemahkan',
        'label miskonsepsi untuk "' + d.option + '" belum punya versi Bahasa Indonesia', d.misconception);
    }
  }
  if (!TITLES[t.subskill]) {
    add('grammar', t.id, 'judul-lesson-berbahasa-inggris',
      'nama subskill dipakai langsung sebagai judul lesson di layar siswa', t.subskill);
  }
}

// ------------------------------------------------------------------- reading
const R = read('reading-bank.json');
for (const p of R) {
  for (let i = 0; i < (p.qs || []).length; i++) {
    const q = p.qs[i];
    const key = p.id + '#' + i;
    const stem = String(q[0] || '');
    for (const l of LEAK) if (l.re.test(stem)) add('reading', key, 'bocoran-template', l.why, stem);
    if (looksEnglish(stem)) {
      add('reading', key, 'pertanyaan-berbahasa-inggris', 'pertanyaan pemahaman harus Bahasa Indonesia', stem);
    }
    const opts = q[1] || [];
    for (const o of opts) {
      if (looksEnglish(o) && !String(p.text).includes(String(o).replace(/[.]$/, ''))) {
        add('reading', key, 'pilihan-berbahasa-inggris',
          'pilihan berupa pernyataan pemahaman berbahasa Inggris, bukan kutipan teks', o);
        break;
      }
    }
    const ev = String(q[3] && q[3].evidence || '');
    if (ev && !String(p.text).includes(ev.slice(0, 40))) {
      add('reading', key, 'bukti-tidak-ada-di-teks',
        'evidence yang dijanjikan tidak ditemukan di dalam bacaan', ev);
    }
  }
}

// ----------------------------------------------------------------- listening
const L = read('features/speaking-listening/listening-bank-v1.json').items;
for (const it of L) {
  if (looksEnglish(it.question)) {
    add('listening', it.id, 'pertanyaan-berbahasa-inggris',
      'mode ' + it.mode + ': pertanyaan pemahaman harus Bahasa Indonesia', it.question);
  }
  for (const o of it.options || []) {
    if (looksEnglish(o)) {
      add('listening', it.id, 'pilihan-berbahasa-inggris',
        'mode ' + it.mode + ': pilihan pemahaman berbahasa Inggris', o);
      break;
    }
  }
  if (!it.explain && !it.rationale) {
    add('listening', it.id, 'tanpa-penjelasan',
      'tidak ada penjelasan Bahasa Indonesia setelah menjawab', it.mode);
  }
}

// ------------------------------------------------------------------ speaking
const S = read('features/speaking-listening/speaking-bank-v1.json').items;
for (const it of S) {
  const t = [it.question, it.prompt, it.instruction].filter(Boolean).join(' ');
  if (looksEnglish(t)) {
    add('speaking', it.id, 'instruksi-berbahasa-inggris', 'instruksi tugas bicara harus Bahasa Indonesia', t);
  }
}

// -------------------------------------------------------------------- report
const byKind = {};
for (const f of findings) {
  const k = f.bank + '/' + f.kind;
  if (!byKind[k]) byKind[k] = { count: 0, sample: f };
  byKind[k].count++;
}
const summary = Object.keys(byKind)
  .map(k => ({ kind: k, count: byKind[k].count, contoh: byKind[k].sample.sample, sebab: byKind[k].sample.detail }))
  .sort((a, b) => b.count - a.count);

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    vocab: V.length,
    grammar: G.length,
    reading: R.length,
    readingQuestions: R.reduce((n, p) => n + (p.qs || []).length, 0),
    listening: L.length,
    speaking: S.length,
  },
  findingCount: findings.length,
  summary,
};
fs.writeFileSync(path.join(ROOT, 'audit', 'BANK-SOAL-AUDIT.json'),
  JSON.stringify(Object.assign({}, report, { findings: findings }), null, 2));
console.log(JSON.stringify(report, null, 2));
