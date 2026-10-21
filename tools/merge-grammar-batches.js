const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const ALIASES = {
  prepositions_in_on_at_time: 'time_prepositions_in_on_at',
  prepositions_in_on_at_place: 'place_prepositions_at_in_on',
  connectors_contrast_although_however_despite: 'contrast_connectors_although_despite_however_distinction',
  connectors_reason_because_since_due_to: 'cause_result_connectors_because_vs_so',
  used_to_vs_be_used_to_get_used_to: 'past_habitual_used_to_vs_would_vs_past_simple',
  preposition_plus_gerund: 'gerund_after_preposition_vs_infinitive_of_purpose',
  passive_voice_present_past: 'agent_omission_when_irrelevant',
  relative_clauses_defining_who_which_that: 'defining_vs_nondefining',
  reported_speech_statements_backshift: 'backshift_statement',
  reported_speech_questions_if_whether: 'reported_yes_no_questions_if_whether',
  reported_speech_commands_imperatives: 'reported_commands_infinitive',
  inversion_negative_adverbials: 'negative_adverbial_inversion_never_rarely_not_only',
  gerund_vs_infinitive: 'like_love_hate_plus_gerund_preferences',
  dependent_prepositions_verb_prep: 'reporting_verb_pattern_deny_admit_apologize_for'
};

function loadBatch(fileName) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`[WARN] Batch file not found: ${fileName}`);
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  console.log('Loading databases...');
  const gtPath = path.join(ROOT, 'grammar-templates.json');
  const expIdPath = path.join(ROOT, 'grammar-explanations-id.json');
  const clozeExplainsPath = path.join(ROOT, 'cloze-explains-v1.json');

  const gt = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
  const expId = JSON.parse(fs.readFileSync(expIdPath, 'utf8'));
  const clozeExp = JSON.parse(fs.readFileSync(clozeExplainsPath, 'utf8'));

  // Load batches 1 to 5
  const b1 = loadBatch('batch-1-updates.json');
  const b2 = loadBatch('batch-2-updates.json');
  const b3 = loadBatch('batch-3-updates.json');
  const b4 = loadBatch('batch-4-updates.json');
  const b5 = loadBatch('batch-5-updates.json');

  const allUpdates = Object.assign({}, b1, b2, b3, b4, b5);
  console.log(`Total update rules loaded: ${Object.keys(allUpdates).length}`);

  // Build lookup map including aliases
  const ruleBySkill = new Map();
  for (const [skill, rule] of Object.entries(allUpdates)) {
    ruleBySkill.set(skill, rule);
    if (ALIASES[skill]) {
      ruleBySkill.set(ALIASES[skill], rule);
    }
  }

  let templatesUpdated = 0;
  let topLevelRemoved = 0;
  let expIdUpdated = 0;
  let clozeExpUpdated = 0;
  const updatedTemplateIds = new Set();

  for (const t of gt.templates) {
    // 1. Clean up rogue top-level ruleId
    if ('ruleId' in t) {
      delete t.ruleId;
      topLevelRemoved++;
    }

    // 2. Check match by subskill
    const skill = t.subskill || t.concept || t.family;
    const newRule = ruleBySkill.get(skill);

    if (newRule) {
      t.explanation = t.explanation || {};
      t.explanation.ruleId = newRule;
      templatesUpdated++;
      updatedTemplateIds.add(t.id);

      // Update grammar-explanations-id.json
      if (expId.templates && expId.templates[t.id]) {
        expId.templates[t.id].rule = newRule;
        expIdUpdated++;
      }
    }
  }

  // 3. Update cloze-explains-v1.json
  if (clozeExp.explains) {
    for (const [czId, item] of Object.entries(clozeExp.explains)) {
      const templateId = czId.replace(/-cz\d+$/, '');
      if (updatedTemplateIds.has(templateId)) {
        const t = gt.templates.find(x => x.id === templateId);
        if (t && t.explanation && t.explanation.ruleId) {
          item.rule = t.explanation.ruleId;
          clozeExpUpdated++;
        }
      }
    }
  }

  console.log(`Templates explanation.ruleId updated: ${templatesUpdated}`);
  console.log(`Rogue top-level ruleId deleted: ${topLevelRemoved}`);
  console.log(`grammar-explanations-id.json entries updated: ${expIdUpdated}`);
  console.log(`cloze-explains-v1.json entries updated: ${clozeExpUpdated}`);

  // Save intermediate files
  fs.writeFileSync(gtPath, JSON.stringify(gt, null, 2) + '\n');
  fs.writeFileSync(expIdPath, JSON.stringify(expId, null, 2) + '\n');
  fs.writeFileSync(clozeExplainsPath, JSON.stringify(clozeExp, null, 2) + '\n');

  console.log('\n--- Running Synchronization Tools ---');
  console.log('1. node tools/sync-grammar-explanations-id.js --write');
  execSync('node tools/sync-grammar-explanations-id.js --write', { cwd: ROOT, stdio: 'inherit' });

  console.log('2. node audit/merge-grammar-id.js');
  execSync('node audit/merge-grammar-id.js', { cwd: ROOT, stdio: 'inherit' });

  console.log('3. node tools/build-cloze-bank.js --write');
  execSync('node tools/build-cloze-bank.js --write', { cwd: ROOT, stdio: 'inherit' });

  console.log('\n=== MASTER GRAMMAR MERGE COMPLETE & SYNCHRONIZED ===');
}

main();
