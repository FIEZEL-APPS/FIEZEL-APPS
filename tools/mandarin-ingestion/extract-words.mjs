import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('C:/Users/hp/Desktop/SUPERCHINESE_MANDARIN_RESEARCH_KIT/01_kurikulum_dan_silabus_192_lessons/superchinese_full_192_lessons_catalog.json', 'utf8'));
const levelMap = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 7 };
const allWords = new Set();
const levelWords = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

for (const l of raw) {
  const lvl = levelMap[l.level];
  if (!lvl) continue;
  const wordsCol = (l.collections || []).find(c => c.type === 'words');
  if (wordsCol && wordsCol.content) {
    const list = wordsCol.content.split(/[，,、\s]+/).map(s => s.trim()).filter(Boolean);
    for (const w of list) {
      if (!allWords.has(w)) {
        allWords.add(w);
        levelWords[lvl].push(w);
      }
    }
  }
}

fs.writeFileSync('tools/mandarin-ingestion/words-by-level.json', JSON.stringify(levelWords, null, 2), 'utf8');
console.log('Words per level:');
for (let i = 1; i <= 7; i++) {
  console.log(`Level ${i}: ${levelWords[i].length} words`);
}
