const fs = require('fs');
const path = require('path');

function mergeBatch(updateFile, expsId, templates, cloze) {
  if (!fs.existsSync(updateFile)) {
    console.log(`Skipping ${updateFile} (file not found)`);
    return 0;
  }

  const updates = JSON.parse(fs.readFileSync(updateFile, 'utf8'));
  let count = 0;

  for (const [skillKey, newRule] of Object.entries(updates)) {
    // 1. grammar-explanations-id.json
    for (const [id, item] of Object.entries(expsId.templates)) {
      if (item.concept === skillKey || item.concept?.includes(skillKey)) {
        item.rule = newRule;
        count++;
      }
    }

    // 2. grammar-templates.json
    for (const [id, item] of Object.entries(templates.templates)) {
      const s = item.concept || item.subskill || item.family;
      if (s === skillKey || s?.includes(skillKey)) {
        item.ruleId = newRule;
        count++;
      }
    }

    // 3. cloze-bank-v1.json
    for (const item of cloze.items) {
      if (item.skill === skillKey || item.skill?.includes(skillKey)) {
        if (item.explain) {
          item.explain.rule = newRule;
          count++;
        }
      }
    }
  }

  console.log(`Applied ${Object.keys(updates).length} skills from ${updateFile} -> affected ${count} places.`);
  return count;
}

function main() {
  const expsId = JSON.parse(fs.readFileSync('grammar-explanations-id.json', 'utf8'));
  const templates = JSON.parse(fs.readFileSync('grammar-templates.json', 'utf8'));
  const cloze = JSON.parse(fs.readFileSync('cloze-bank-v1.json', 'utf8'));

  let totalAffected = 0;
  totalAffected += mergeBatch('batch-2-updates.json', expsId, templates, cloze);
  totalAffected += mergeBatch('batch-3-updates.json', expsId, templates, cloze);
  totalAffected += mergeBatch('batch-4-updates.json', expsId, templates, cloze);
  totalAffected += mergeBatch('batch-5-updates.json', expsId, templates, cloze);

  fs.writeFileSync('grammar-explanations-id.json', JSON.stringify(expsId, null, 2) + '\n');
  fs.writeFileSync('grammar-templates.json', JSON.stringify(templates, null, 2) + '\n');
  fs.writeFileSync('cloze-bank-v1.json', JSON.stringify(cloze, null, 2) + '\n');

  console.log(`Master merge complete! Total items synchronized: ${totalAffected}`);
}

main();
