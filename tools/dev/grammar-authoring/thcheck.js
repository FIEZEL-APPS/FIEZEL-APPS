// Periksa setiap string Thai di paket: residu Indonesia + jejak kata-per-kata (heuristik repo).
const fs = require('fs'), path = require('path');
const ROOT = process.env.FZ_ROOT || path.join(__dirname, '..', '..', '..');
const { buildLexicon, residuIndonesia, thaiKataPerKata } = require(path.join(ROOT, 'th-purity-lexicon.js'));
const lex = buildLexicon(ROOT);
const pack = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = [];
const visit = (where, v) => {
  if (typeof v === 'string') {
    const r = residuIndonesia(v, lex);
    if (r.length) out.push(`${where} :: residu Indonesia ${JSON.stringify(r)} :: ${v}`);
    if (thaiKataPerKata(v)) out.push(`${where} :: kata-per-kata :: ${v}`);
  } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(where + '.' + k, x);
};
for (const t of pack.templates) visit(t.id + '.th', t.th);
for (const [k, v] of Object.entries(pack.newLabels)) visit('label[' + k + '].th', v.th);
console.log(JSON.stringify(out));
