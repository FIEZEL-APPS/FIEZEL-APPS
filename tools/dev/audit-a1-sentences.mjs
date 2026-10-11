import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('audio/manifest.json', 'utf8'));
const vocab = JSON.parse(fs.readFileSync('vocabulary-master.json', 'utf8'));

const refMap = {};
for (const [k, v] of Object.entries(manifest.assets || {})) {
  if (v.status === 'ready' || v.status === 'READY') {
    if (!refMap[v.sourceRef]) refMap[v.sourceRef] = [];
    refMap[v.sourceRef].push(v);
  }
}

const a1Items = vocab.filter(item => item.level === 'A1');
const missingSentences = [];
const readySentences = [];

a1Items.forEach(item => {
  const assets = refMap[item.id] || [];
  const hasSentence = assets.some(a => a.contentType === 'sentence' || a.contentType === 'example');
  if (hasSentence) {
    readySentences.push(item);
  } else {
    missingSentences.push(item);
  }
});

console.log('=== AUDIT CONTOH KALIMAT LEVEL A1 ===');
console.log('Total Kosa Kata A1:', a1Items.length);
console.log('Sudah Ada Suara Kalimat:', readySentences.length);
console.log('Belum Ada Suara Kalimat:', missingSentences.length);
console.log('Persentase Terpenuhi:', ((readySentences.length / a1Items.length) * 100).toFixed(1) + '%');
console.log('\nContoh 10 Kalimat A1 yang Belum Ada Suara:');
missingSentences.slice(0, 10).forEach((item, idx) => {
  console.log(`${idx + 1}. [${item.id}] ${item.word} -> "${item.example || (item.examples && item.examples[0] && item.examples[0].en)}"`);
});
