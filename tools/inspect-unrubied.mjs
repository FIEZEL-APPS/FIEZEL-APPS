import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const jaUi = (await import('../features/japanese/fiezel-ja-ui.js')).default;
const readings = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/ja/reading-bank-ja.json'), 'utf8'));

const missing = new Map();
readings.forEach(r => {
  const ann = jaUi.annotateText(r.text);
  // Find any kanji not inside ruby
  const cleanNoRuby = ann.replace(/<ruby[^>]*>[\s\S]*?<\/ruby>/g, '');
  const m = cleanNoRuby.match(/[\u3400-\u4dbf\u4e00-\u9fff\u3005]/g) || [];
  m.forEach(k => missing.set(k, (missing.get(k) || 0) + 1));
});
console.log('Un-rubied kanji:', Array.from(missing.entries()));
