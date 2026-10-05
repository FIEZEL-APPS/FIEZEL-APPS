import fs from 'fs';

const gt = JSON.parse(fs.readFileSync('grammar-templates.json', 'utf8'));
const templates = gt.templates || [];

const leaks = [];
const shortLeaks = [];
const jargon = [];

const JARGON_TERMS = [
  'subjunctive', 'irrealis', 'correlative', 'inversi', 'inversion', 'asindeton', 'elipsis',
  'klausa non-finit', 'non-finite', 'konsesif', 'participle', 'gerunds and infinitives',
  'nominal clause', 'adverbial clause', 'fronting', 'dangling modifier',
  'past subjunctive', 'hypothetical past', 'epistemic', 'anteriority'
];

templates.forEach((t) => {
  const cue = (t.explanation?.memoryCueId || t.explanation?.memoryCue || '').trim();
  const cueLower = cue.toLowerCase();
  const rule = (t.explanation?.ruleId || t.explanation?.rule || '').toLowerCase();
  const correct = (t.options?.[t.correctIndex] || '').trim();
  const correctLower = correct.toLowerCase();
  
  // 1. Check answer leaks in memoryCue
  let isLeak = false;
  let leakReason = '';

  if (correctLower.length > 2 && cueLower.includes(correctLower)) {
    isLeak = true;
    leakReason = 'exact_answer_key_mentioned';
  } else if (/\b(-ed|-ing|-s|-es)\b/.test(cueLower)) {
    isLeak = true;
    leakReason = 'inflectional_suffix_spoil';
  } else if (/\b(pakai|pilih|gunakan)\s+[“"']?[a-z]+[”"']?/i.test(cueLower)) {
    isLeak = true;
    leakReason = 'direct_choice_instruction';
  } else if (correctLower.length <= 2 && new RegExp(`\\b(pakai|pilih|ingat|gunakan|use|choose)\\s+[“"']?${correctLower}[”"']?\\b`, 'i').test(cueLower)) {
    isLeak = true;
    leakReason = 'short_key_direct_instruction';
  }

  if (isLeak) {
    leaks.push({
      id: t.id,
      level: t.cefr,
      subskill: t.subskill,
      correct,
      cue,
      leakReason
    });
  }

  // 2. Check university jargon in rule / ruleId
  const matchedJargon = JARGON_TERMS.filter(term => rule.includes(term));
  if (matchedJargon.length > 0) {
    jargon.push({
      id: t.id,
      level: t.cefr,
      subskill: t.subskill,
      terms: matchedJargon,
      ruleSnippet: (t.explanation?.ruleId || t.explanation?.rule).slice(0, 160)
    });
  }
});

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTemplates: templates.length,
    totalMemoryCueLeaks: leaks.length,
    totalJargonOccurrences: jargon.length,
    leakBreakdown: {
      exact_answer_key_mentioned: leaks.filter(l => l.leakReason === 'exact_answer_key_mentioned').length,
      direct_choice_instruction: leaks.filter(l => l.leakReason === 'direct_choice_instruction').length,
      inflectional_suffix_spoil: leaks.filter(l => l.leakReason === 'inflectional_suffix_spoil').length,
      short_key_direct_instruction: leaks.filter(l => l.leakReason === 'short_key_direct_instruction').length
    }
  },
  diagnoseDistractorAnalysis: {
    issue: "Munculnya soal 'Temanmu memilih [X]. Kenapa pilihan itu salah?'",
    rootCause: "Mode diagnose_distractor_1..3 (variant 9-11 di app.js:911) memanggil FiezelI18n.t('grammar.mode-diagnose-stem') yang memformat stem 'Temanmu memilih {opsiDikutip}. Kenapa pilihan itu salah?'. Di PR #512 (commit 97a84524), mode ini sempat dikembalikan ke GRAMMAR_LESSON_MODES dan makeGrammarQuestionForMode.",
    solution: "Keluarkan secara permanen diagnose_distractor_* dari seluruh mode sesi grammar (GRAMMAR_LESSON_MODES, GRAMMAR_WHY_SLOT_MODES, makeGrammarQuestionForMode) sehingga 100% soal adalah latihan bentuk bahasa alami (apply_form, complete_sentence, repair_distractor_*), dan perbarui copy-id-app-a.js serta copy-th-app-a.js agar string stem tidak lagi memuat narasi teman/kenapa salah."
  },
  memoryCueLeaks: leaks,
  universityJargon: jargon
};

fs.writeFileSync('reports/empiris-audit-pedagogi-smp.json', JSON.stringify(report, null, 2));
console.log('Empirical audit report written to reports/empiris-audit-pedagogi-smp.json');
console.log(`- Total Leaks Found: ${leaks.length}`);
console.log(`- Total Jargon Entries Found: ${jargon.length}`);
