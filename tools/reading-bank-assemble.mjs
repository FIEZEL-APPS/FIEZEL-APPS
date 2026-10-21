/**
 * Menggabungkan enam berkas level hasil penulisan ulang menjadi reading-bank.json (m025-150).
 *
 * Penulisan ulang dipecah per level supaya bisa digarap paralel, tetapi beberapa invarian
 * hanya bisa diperiksa SETELAH digabung: id yang bertabrakan antar level, judul kembar
 * lintas level, dan gradasi panjang antar-CEFR yang justru jadi alasan penulisan ulang ini.
 */
import fs from 'node:fs';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const dir = '.reading-new';
const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => String(s).trim().split(/\s+/).filter(Boolean);

const all = [];
for (const lv of LEVELS) {
  const p = `${dir}/${lv}.json`;
  if (!fs.existsSync(p)) { console.error(`BELUM ADA: ${p}`); process.exit(1); }
  const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(rows) || rows.length !== 50) { console.error(`${p}: harus 50 bacaan, ada ${rows?.length}`); process.exit(1); }
  all.push(...rows);
}

const errs = [];
const ids = new Map(), titles = new Map(), texts = new Map(), stems = new Map(), shapes = new Map();
for (const r of all) {
  if (ids.has(r.id)) errs.push(`id ${r.id} dipakai dua kali (${ids.get(r.id)})`); else ids.set(r.id, r.level);
  const t = norm(r.title);
  if (titles.has(t)) errs.push(`judul kembar lintas level: ${r.id} ~ ${titles.get(t)}`); else titles.set(t, r.id);
  const x = norm(r.text);
  if (texts.has(x)) errs.push(`teks kembar lintas level: ${r.id} ~ ${texts.get(x)}`); else texts.set(x, r.id);
  const sig = String(r.text).split(/(?<=[.!?])\s+/).map(s => words(norm(s)).filter(w => w.length <= 4).slice(0, 6).join(' ')).join('|');
  if (shapes.has(sig)) errs.push(`kerangka kalimat kembar lintas level: ${r.id} ~ ${shapes.get(sig)}`); else shapes.set(sig, r.id);
  for (const [i, q] of (r.qs || []).entries()) {
    const s = norm(q?.[0]);
    if (stems.has(s)) errs.push(`stem soal kembar lintas level: ${r.id}#${i} ~ ${stems.get(s)}`); else stems.set(s, `${r.id}#${i}`);
  }
}

// Gradasi CEFR: content-qa-agent menandai bank yang panjang bacaannya nyaris tidak
// membedakan A1 dari C2. Bank lama median 57 kata di SEMUA level - itulah sebabnya.
const med = a => { const x = [...a].sort((m, n) => m - n); return x.length ? x[Math.floor(x.length / 2)] : 0; };
const medians = LEVELS.map(lv => med(all.filter(r => r.level === lv).map(r => words(r.text).length)));
const spread = Math.max(...medians) - Math.min(...medians);
console.log('median kata per level: ' + LEVELS.map((lv, i) => `${lv}=${medians[i]}`).join('  '));
console.log(`rentang A1..C2: ${spread} kata (harus > 18)`);
if (spread <= 18) errs.push(`gradasi CEFR terlalu datar: rentang ${spread} kata`);
for (let i = 1; i < medians.length; i++) if (medians[i] <= medians[i - 1]) errs.push(`${LEVELS[i]} tidak lebih panjang dari ${LEVELS[i - 1]}`);

if (errs.length) { console.error(`\n${errs.length} GALAT:`); for (const e of errs.slice(0, 30)) console.error('  ' + e); process.exit(1); }

fs.writeFileSync('reading-bank.json', JSON.stringify(all, null, 2) + '\n');
console.log(`\nDITULIS reading-bank.json — ${all.length} bacaan, ${all.reduce((n, r) => n + r.qs.length, 0)} soal`);
