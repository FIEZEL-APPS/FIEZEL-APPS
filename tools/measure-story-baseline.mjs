import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const storyCode = fs.readFileSync(path.join(ROOT, 'features/japanese/fiezel-story-reader.js'), 'utf8');

// Match all jp: '...' lines
const jpMatches = storyCode.match(/jp:\s*'([^']+)'/g) || [];
console.log('Total story sentences:', jpMatches.length);

let totalStoryKanji = 0;
let rubyStoryKanji = 0;
let sentencesWithRomaji = 0;

jpMatches.forEach(line => {
  const text = line.replace(/^jp:\s*'/, '').replace(/'$/, '');
  // strip existing ruby tags to get raw sentence
  const raw = text.replace(/<ruby[^>]*>([\s\S]*?)<\/ruby>/g, (m, inner) => {
    return inner.replace(/<rt>[\s\S]*?<\/rt>/g, '').replace(/<rp>[\s\S]*?<\/rp>/g, '');
  }).replace(/<[^>]+>/g, '');

  const kanjiMatches = raw.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3005]/g) || [];
  totalStoryKanji += kanjiMatches.length;

  const rubyMatches = text.match(/<ruby[^>]*>([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)<rt>/g) || [];
  rubyMatches.forEach(rm => {
    const km = rm.match(/<ruby[^>]*>([\u3400-\u4dbf\u4e00-\u9fff\u3005]+)<rt>/);
    if (km) rubyStoryKanji += km[1].length;
  });

  if (text.includes('fz-sentence-romaji')) {
    sentencesWithRomaji++;
  }
});

console.log('STORY BASELINE (BEFORE):');
console.log('Total kanji across stories:', totalStoryKanji);
console.log('Ruby kanji:', rubyStoryKanji, `(${((rubyStoryKanji / totalStoryKanji) * 100).toFixed(1)}%)`);
console.log('Sentences with romaji row:', sentencesWithRomaji, 'out of', jpMatches.length, `(${((sentencesWithRomaji / jpMatches.length) * 100).toFixed(1)}%)`);
