import fs from 'fs';

const gt = JSON.parse(fs.readFileSync('grammar-templates.json', 'utf8'));
const templates = gt.templates || [];

const leaks = [];
const jargon = [];

const JARGON_TERMS = [
  'subjunctive', 'irrealis', 'correlative', 'inversi', 'asindeton', 'elipsis',
  'klausa non-finit', 'konsesif', 'participle', 'gerunds and infinitives',
  'nominal clause', 'adverbial clause', 'fronting', 'dangling modifier',
  'past subjunctive', 'hypothetical past'
];

templates.forEach((t, i) => {
  const cue = (t.explanation?.memoryCueId || t.explanation?.memoryCue || '').toLowerCase();
  const rule = (t.explanation?.ruleId || t.explanation?.rule || '').toLowerCase();
  const correct = (t.options?.[t.correctIndex] || '').toLowerCase().trim();
  
  // Check leak
  const leaksKey = correct.length > 2 && cue.includes(correct);
  const leaksPattern = /\b(-ed|-ing|-s|-es)\b/.test(cue) || /pakai\s+["']?[a-z]+["']?|pilih\s+["']?[a-z]+["']?/.test(cue);
  if (leaksKey || leaksPattern) {
    leaks.push({
      id: t.id,
      level: t.cefr,
      subskill: t.subskill,
      correct,
      cue: t.explanation?.memoryCueId || t.explanation?.memoryCue
    });
  }

  // Check jargon
  const matchedJargon = JARGON_TERMS.filter(term => rule.includes(term));
  if (matchedJargon.length > 0) {
    jargon.push({
      id: t.id,
      level: t.cefr,
      subskill: t.subskill,
      terms: matchedJargon,
      ruleSnippet: (t.explanation?.ruleId || t.explanation?.rule).slice(0, 140)
    });
  }
});

console.log('Total templates audited:', templates.length);
console.log('Templates with memoryCue leaks:', leaks.length);
console.log('Sample leaks (first 15):');
console.log(JSON.stringify(leaks.slice(0, 15), null, 2));

console.log('Templates with university jargon:', jargon.length);
console.log('Sample jargon (first 15):');
console.log(JSON.stringify(jargon.slice(0, 15), null, 2));

fs.writeFileSync('reports/audit-smp-pedagogy-findings.json', JSON.stringify({
  totalTemplates: templates.length,
  leakCount: leaks.length,
  leaks,
  jargonCount: jargon.length,
  jargon
}, null, 2));
