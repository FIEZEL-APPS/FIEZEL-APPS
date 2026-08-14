const path = require('path');
const crypto = require('crypto');
const meta = require('./fiezel-meta-learning.js');
const library = require('./fiezel-prompt-library.js');
const config = require('./fiezel-autonomy-config.js');
const ledger = require('./fiezel-evolution-ledger.js');
const refine = require('./fiezel-self-refine.js');
const patchGate = require('./content-patch-gate.js');
const promotion = require('./content-promotion.js');
const sha = v => crypto.createHash('sha256').update(v).digest('hex');
const root = process.cwd();
const fileSha = f => sha(require('fs').readFileSync(path.join(root, f)));
const before = { grammar: fileSha('grammar-templates.json'), vocabulary: fileSha('vocabulary-master.json'), reading: fileSha('reading-bank.json') };
const line = t => console.log(`\n=== ${t} ===`);
const canonical = patchGate.loadCanonical();
const LIB = library.loadLibrary(path.join(__dirname, 'fiezel-prompt-library.json'));
const OWNER = '123e4567-e89b-12d3-a456-426614174000';
const AT = '2026-08-14T00:00:00Z';
const T = '2026-08-14T00:00:00Z';

line('STEP 1 - META-LEARNING: aggregate outcomes -> insight');
const target = canonical.vocabulary.find(v => v.status === 'active') || canonical.vocabulary[0];
const leaderboard = {
  schema: 'fiezel-policy-outcome-v1', version: '5.18.0', generatedAt: T,
  privacy: { rawAnswersIncluded: false, rawHistoryIncluded: false },
  bySubskill: [
    { subskill: `vocab-${target.id}`, domain: 'vocabulary', cefr: target.cefr || 'B1', attempts: 12, correct: 7, trendDelta: -3, daysSinceLast: 2 },
    { subskill: 'vocab-other', domain: 'vocabulary', cefr: 'A2', attempts: 6, correct: 4, trendDelta: 1, daysSinceLast: 1 }
  ]
};
const analysis = meta.analyze(leaderboard);
console.log(JSON.stringify(analysis, null, 1).slice(0, 900));
const insight = analysis.insights.find(i => i.domain === 'vocabulary');
insight.itemId = String(insight.subskill).replace(/^vocab-/, '');
insight.id = insight.insightId;
insight.templateId = 'expand_context';
insight.finding = 'accuracy 58% di bawah threshold 70%; perluas konteks contoh kalimat agar makna jelas tanpa mengubah sense.';

line('STEP 2 - PROMPT LIBRARY: render template untuk insight');
const found = canonical.vocabulary.find(v => v.id === insight.itemId);
const promptVars = { word: found.id, cefr: found.cefr, meaning: found.meaning, example: found.example, finding: insight.finding };
const rendered = library.renderPrompt(LIB, 'vocabulary', 'expand_context', promptVars);
console.log('INSIGHT   :', insight.id, '|', insight.finding);
console.log('CANONICAL :', found.id, '| CEFR', found.cefr, '| example =', JSON.stringify(found.example));
console.log('PROMPT    :', rendered.prompt.slice(0, 220) + '...');

line('STEP 3 - SELF-REFINE: aiGenerate (SINTETIS utk demo) -> candidate -> GATE');
let calls = 0;
const aiGenerate = ({ prompt }) => {
  calls++;
  const base = found.example.replace(/[.!?]+$/, '');
  const example = `${base}, which gives the sentence clearer context.`;
  return { ok: true, output: { text: 'ok', model: 'synthetic-demo', generatedAt: T, meaning: found.meaning, example, meanings: found.meanings, examples: found.examples.map((x, i) => i === 0 ? { en: example, id: x.id } : x), synonyms: found.synonyms, antonyms: found.antonyms, collocations: found.collocations, topic: found.topic, status: found.status, needsReviewReason: found.needsReviewReason, rationale: 'expand context while preserving sense' } };
};
const r = refine.run({ config: { autonomyLevel: 'canary' }, patchGate, library: LIB, promotion, insight, aiGenerate, timestamp: T });
console.log('prompt sent to AI  :', calls, 'x | model = synthetic-demo');
console.log('patchId            :', r.patchId);
console.log('GATE               :', r.gate.ok ? 'PASS' : 'FAIL', '| canonicalImmutable =', r.gate.canonicalImmutable);
console.log('  errors           :', JSON.stringify(r.gate.errors || []));
console.log('  baselineQa       :', JSON.stringify(r.gate.baselineQa));
console.log('  patchedQa        :', JSON.stringify(r.gate.patchedQa));

line('STEP 4 - PROMOTION: threshold evidence -> decision');
console.log('PROMOTION          :', r.promotion.status, '|', r.promotion.reason);
console.log('  metrics          :', JSON.stringify(r.promotion.metrics));
console.log('  adoptionReady    :', r.adoptionReady, '(harus false: belum ada bukti canary real)');
console.log('artinya: FIEZEL bikin kandidat perbaikan, tapi TIDAK pernah menulis ke canonical tanpa bukti.');

line('STEP 5 - EVOLUTION LEDGER: rantai hash tidak bisa dipalsukan');
let chain = [ledger.genesis()];
chain = ledger.append(chain, { event: 'insight', patchId: '', insightId: insight.id, target: insight.itemId, decision: 'observe', timestamp: T }).entries;
chain = ledger.append(chain, { event: 'candidate_created', patchId: r.patchId, insightId: insight.id, target: insight.itemId, decision: 'created', timestamp: T }).entries;
chain = ledger.append(chain, { event: 'gate_result', patchId: r.patchId, insightId: insight.id, target: insight.itemId, decision: r.decision, metrics: { gatePassed: 1, promotionStatus: r.promotionStatus }, timestamp: T }).entries;
const v = ledger.verifyChain(chain);
console.log('entries            :', chain.length, '| chain verifies =', v.ok);
for (const e of chain) console.log(`  seq=${e.seq} event=${e.event.padEnd(18)} decision=${e.decision.padEnd(8)} hash=${e.entryHash.slice(0, 16)}...`);

line('STEP 6 - BUKTI CANONICAL TIDAK BERUBAH');
const after = { grammar: fileSha('grammar-templates.json'), vocabulary: fileSha('vocabulary-master.json'), reading: fileSha('reading-bank.json') };
for (const k of Object.keys(before)) console.log(`  ${k.padEnd(22)} ${before[k] === after[k] ? 'IDENTIK ✓' : 'BERUBAH!!'}`);
console.log('\nDEMO SELESAI - semua langkah berjalan di memori; tidak ada file canonical yang disentuh.');