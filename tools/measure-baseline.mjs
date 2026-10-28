import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const readings = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/ja/reading-bank-ja.json'), 'utf8'));
const vm = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/ja/vocabulary-master-ja.json'), 'utf8'));
import jaUi from '../features/japanese/fiezel-ja-ui.js';

const a1Words = vm.words.filter(w => w.level === 'A1');
console.log('Testing with A1 vocabulary pool (' + a1Words.length + ' words)...');

let totalKanji = 0;
let rubyKanji = 0;
let passagesWithRomaji = 0;

readings.forEach(r => {
  const annotated = jaUi.annotateText(r.text, a1Words);
  const kanjiMatches = r.text.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3005]/g) || [];
  totalKanji += kanjiMatches.length;

  const rubyMatches = annotated.match(/<ruby[^>]*>([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)<rp>/g) || [];
  rubyMatches.forEach(rm => {
    const km = rm.match(/<ruby[^>]*>([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)<rp>/);
    if (km) rubyKanji += km[1].length;
  });

  if (annotated.includes('class="ja-romaji ja-run-romaji"')) {
    passagesWithRomaji++;
  }
});

console.log('BASELINE (BEFORE):');
console.log('Total kanji in 180 passages:', totalKanji);
console.log('Ruby kanji:', rubyKanji, `(${((rubyKanji / totalKanji) * 100).toFixed(1)}%)`);
console.log('Passages with romaji:', passagesWithRomaji, 'out of', readings.length, `(${((passagesWithRomaji / readings.length) * 100).toFixed(1)}%)`);
