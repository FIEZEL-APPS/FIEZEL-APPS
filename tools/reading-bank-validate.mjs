/**
 * Validator satu berkas level bank reading (m025-150).
 *
 * Dipakai penulis konten untuk memeriksa hasilnya SENDIRI sebelum diserahkan, supaya
 * kesalahan bentuk tidak baru ketahuan di gerbang CI. Semua ambang di sini adalah
 * ambang yang benar-benar dipakai content-qa-agent.js dan content-integrity-audit.js.
 *
 * Pakai: node tools/reading-bank-validate.mjs <berkas.json> <LEVEL>
 */
import fs from 'node:fs';

const [, , file, level] = process.argv;
if (!file || !level) { console.error('Pakai: node tools/reading-bank-validate.mjs <berkas.json> <LEVEL>'); process.exit(2); }

const WORDS = { A1: [45, 65], A2: [70, 95], B1: [105, 135], B2: [150, 190], C1: [200, 250], C2: [265, 330] };
const TYPES = ['main_idea','detail','inference','purpose','sequence','cause_effect','comparison','evidence','tone','vocabulary_context','paraphrase','conclusion','reference','true_false_not_stated','why','how','likely','relationship','supporting_detail','author_purpose'];

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => String(s).trim().split(/\s+/).filter(Boolean);
const errs = [];
const warn = [];
const E = (id, m) => errs.push(`${id}: ${m}`);

let bank;
try { bank = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error('JSON tidak valid:', e.message); process.exit(1); }
if (!Array.isArray(bank)) { console.error('Berkas harus berisi ARRAY bacaan.'); process.exit(1); }

const [lo, hi] = WORDS[level] || [];
if (!lo) { console.error('LEVEL tidak dikenal:', level); process.exit(2); }

const ids = new Set(), titles = new Set(), passageNorm = new Map(), qStems = new Map();
const typeCount = Object.create(null);
// Sidik jari struktur: kata-kata pendek di awal tiap kalimat. Dua bacaan yang memakai
// kerangka kalimat sama akan bertabrakan di sini walaupun topiknya ditukar.
const shapes = new Map();

for (const r of bank) {
  const id = r?.id || '(tanpa id)';
  for (const f of ['id', 'level', 'title', 'text', 'qs', 'topic']) if (!r?.[f]) E(id, `field "${f}" kosong`);
  if (r.level !== level) E(id, `level "${r.level}" bukan ${level}`);
  if (ids.has(r.id)) E(id, 'id dipakai dua kali'); else ids.add(r.id);
  if (titles.has(norm(r.title))) E(id, `judul kembar dengan bacaan lain: "${r.title}"`); else titles.add(norm(r.title));

  const wc = words(r.text).length;
  if (wc < lo || wc > hi) E(id, `panjang ${wc} kata, di luar ${lo}-${hi} untuk ${level}`);

  const pn = norm(r.text);
  if (passageNorm.has(pn)) E(id, `teks identik dengan ${passageNorm.get(pn)}`); else passageNorm.set(pn, id);

  const sig = String(r.text).split(/(?<=[.!?])\s+/).map(s => words(norm(s)).filter(w => w.length <= 4).slice(0, 6).join(' ')).join('|');
  if (shapes.has(sig)) E(id, `kerangka kalimat sama dengan ${shapes.get(sig)} — ini persis cacat yang sedang diperbaiki`); else shapes.set(sig, id);

  const qs = Array.isArray(r.qs) ? r.qs : [];
  if (qs.length !== 5) E(id, `harus 5 soal, ada ${qs.length}`);

  const seenType = new Set();
  qs.forEach((q, i) => {
    const qid = `${id}#${i}`;
    const stem = q?.[0], opts = Array.isArray(q?.[1]) ? q[1] : [], ci = q?.[2], meta = q?.[3] || {};
    if (!stem) E(qid, 'stem kosong');
    if (qStems.has(norm(stem))) E(qid, `stem soal kembar dengan ${qStems.get(norm(stem))}`); else qStems.set(norm(stem), qid);
    if (opts.length !== 4) E(qid, `harus 4 pilihan, ada ${opts.length}`);
    const n = opts.map(norm);
    if (new Set(n).size !== n.length) E(qid, 'ada pilihan kembar');
    if (n.some(x => !x)) E(qid, 'ada pilihan kosong');
    if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length) { E(qid, `correctIndex ${ci} tidak sah`); return; }
    if (!meta.type) E(qid, 'meta.type kosong');
    else { if (!TYPES.includes(meta.type)) E(qid, `meta.type "${meta.type}" di luar daftar`); if (seenType.has(meta.type)) E(qid, `type "${meta.type}" dipakai dua kali dalam satu bacaan`); seenType.add(meta.type); typeCount[meta.type] = (typeCount[meta.type] || 0) + 1; }
    // Dua invarian yang meruntuhkan bank lama:
    if (!meta.answer) E(qid, 'meta.answer kosong');
    else if (norm(meta.answer) !== norm(opts[ci])) E(qid, `meta.answer TIDAK sama dengan options[${ci}] — perender akan menimpa satu pengecoh`);
    if (!meta.evidence) E(qid, 'meta.evidence kosong');
    else if (!String(r.text).includes(String(meta.evidence))) E(qid, 'meta.evidence tidak ada PERSIS di dalam teks bacaan');
    if (!meta.patternId) E(qid, 'meta.patternId kosong');
    // Bahasa: stem dan pilihan harus konsisten, tidak boleh separuh Inggris separuh Indonesia.
    const idw = /\b(yang|tidak|karena|dengan|untuk|adalah|pada|dari|itu|ini|bukan|akan|apa|mana|siapa|kapan|mengapa|bagaimana|dalam|oleh)\b/i;
    const enw = /\b(the|of|and|that|this|with|for|because|which|from|their|about)\b/i;
    for (const o of opts) if (idw.test(o) && enw.test(o) && words(o).length >= 6) E(qid, `pilihan campur Indonesia+Inggris: "${String(o).slice(0, 70)}"`);
  });
}

for (const t of TYPES) if (!typeCount[t]) warn.push(`type "${t}" tidak dipakai sama sekali di level ini`);

const wcs = bank.map(r => words(r.text).length).sort((a, b) => a - b);
console.log(`${file} — ${bank.length} bacaan, median ${wcs[Math.floor(wcs.length / 2)] || 0} kata (target ${lo}-${hi})`);
console.log(`tipe soal terpakai: ${Object.keys(typeCount).length}/20`);
for (const w of warn) console.log('  PERINGATAN ' + w);
if (errs.length) { console.log(`\n${errs.length} GALAT:`); for (const e of errs.slice(0, 40)) console.log('  ' + e); if (errs.length > 40) console.log(`  ... dan ${errs.length - 40} lagi`); process.exit(1); }
console.log('\nLOLOS');
