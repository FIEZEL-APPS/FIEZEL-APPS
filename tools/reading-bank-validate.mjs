/**
 * Validator bank reading (m025-150, disinkronkan ke bank produksi pasca m025-163/168).
 *
 * Dipakai penulis konten untuk memeriksa hasilnya SENDIRI sebelum diserahkan, supaya
 * kesalahan bentuk tidak baru ketahuan di gerbang CI.
 *
 * Pakai: node tools/reading-bank-validate.mjs <berkas.json> <LEVEL|ALL>
 *   LEVEL = A1..C2 untuk berkas satu level, atau ALL untuk bank campuran
 *   (tiap bacaan diperiksa terhadap level yang tertulis di record-nya sendiri).
 */
import fs from 'node:fs';

const [, , file, level] = process.argv;
if (!file || !level) { console.error('Pakai: node tools/reading-bank-validate.mjs <berkas.json> <LEVEL|ALL>'); process.exit(2); }

// Rentang kata disinkronkan dengan bank yang benar-benar dipakai runtime
// (A07-F5): batas bawah dari spec m025-150, batas atas mengikuti isi bank live.
const WORDS = { A1: [35, 65], A2: [55, 95], B1: [100, 190], B2: [150, 280], C1: [200, 400], C2: [265, 500] };
// TYPES = union tipe yang benar-benar dikonsumsi app.js (stems{} + readingFocusLabel),
// sinkron per A07-F5. Tipe lama 'supporting_detail'/'author_purpose' tidak pernah
// dipakai bank dan sudah dihapus dari daftar.
const TYPES = ['main_idea','detail','inference','vocabulary','vocabulary_context','purpose','sequence','cause_effect','comparison','evidence','tone','paraphrase','conclusion','reference','true_false_not_stated','why','how','likely','relationship','detail2','location','time','people','quantity','process','action','record'];
// Tipe faktual: runtime merender stem generik per tipe (bukan stem Inggris bank),
// jadi SEMUA pengecoh soal tipe ini tidak boleh muncul verbatim di teks bacaan —
// kalau muncul, dua jawaban sama-sama bisa dibela (A07-F1, P0).
const FACT_TYPES = ['detail','time','quantity','people','location','action','record'];
const TFNS_OPTS = ['true', 'false', 'not stated'];

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => String(s).trim().split(/\s+/).filter(Boolean);
const errs = [];
const warn = [];
const E = (id, m) => errs.push(`${id}: ${m}`);
// Cocokkan frasa utuh berbatas kata, plus varian jamak/tunggal sederhana
// ("his friend" harus kena walau teks menulis "his friends").
const inBody = (body, s) => {
  const n = norm(s);
  if (!n) return false;
  const cands = [n];
  if (n.endsWith('s')) cands.push(n.slice(0, -1)); else cands.push(n + 's');
  return cands.some(c => body.includes(` ${c} `));
};

let bank;
try { bank = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error('JSON tidak valid:', e.message); process.exit(1); }
if (!Array.isArray(bank)) { console.error('Berkas harus berisi ARRAY bacaan.'); process.exit(1); }

const mixed = level === 'ALL';
if (!mixed && !WORDS[level]) { console.error('LEVEL tidak dikenal:', level); process.exit(2); }

const ids = new Set(), titles = new Set(), passageNorm = new Map(), qStems = new Map();
const typeCount = Object.create(null);
// Sidik jari struktur: kata-kata pendek di awal tiap kalimat. Dua bacaan yang memakai
// kerangka kalimat sama akan bertabrakan di sini walaupun topiknya ditukar.
const shapes = new Map();

for (const r of bank) {
  const id = r?.id || '(tanpa id)';
  for (const f of ['id', 'level', 'title', 'text', 'qs', 'topic']) if (!r?.[f]) E(id, `field "${f}" kosong`);
  const rLevel = mixed ? r?.level : level;
  if (!mixed && r.level !== level) E(id, `level "${r.level}" bukan ${level}`);
  const [lo, hi] = WORDS[rLevel] || [];
  if (!lo) E(id, `level "${r.level}" tidak dikenal`);
  if (ids.has(r.id)) E(id, 'id dipakai dua kali'); else ids.add(r.id);
  if (titles.has(norm(r.title))) E(id, `judul kembar dengan bacaan lain: "${r.title}"`); else titles.add(norm(r.title));

  const wc = words(r.text).length;
  if (lo && (wc < lo || wc > hi)) E(id, `panjang ${wc} kata, di luar ${lo}-${hi} untuk ${rLevel}`);

  const pn = norm(r.text);
  if (passageNorm.has(pn)) E(id, `teks identik dengan ${passageNorm.get(pn)}`); else passageNorm.set(pn, id);

  const sig = String(r.text).split(/(?<=[.!?])\s+/).map(s => words(norm(s)).filter(w => w.length <= 4).slice(0, 6).join(' ')).join('|');
  if (shapes.has(sig)) E(id, `kerangka kalimat sama dengan ${shapes.get(sig)} — ini persis cacat yang sedang diperbaiki`); else shapes.set(sig, id);

  const qs = Array.isArray(r.qs) ? r.qs : [];
  if (qs.length !== 5) E(id, `harus 5 soal, ada ${qs.length}`);

  const keysInPassage = new Set();
  const seenType = new Set();
  qs.forEach((q, i) => {
    const qid = `${id}#${i}`;
    const stem = q?.[0], opts = Array.isArray(q?.[1]) ? q[1] : [], ci = q?.[2], meta = q?.[3] || {};
    const isTFNS = meta.type === 'true_false_not_stated';
    if (!stem) E(qid, 'stem kosong');
    // Runtime membuang stem Inggris bank dan merender stem generik sendiri, jadi stem
    // kembar antar-bacaan tidak terlihat murid (PERINGATAN saja). Kembar di bacaan
    // yang SAMA tetap galat: menandakan soal hasil salin-tempel.
    const stemKey = norm(stem);
    if (qStems.has(stemKey)) {
      const other = qStems.get(stemKey);
      if (String(other).split('#')[0] === id) E(qid, `stem soal kembar dengan ${other} di bacaan yang sama`);
      else warn.push(`${qid}: stem soal kembar dengan ${other}`);
    } else qStems.set(stemKey, qid);
    // TFNS memakai 3 opsi tetap True/False/Not stated (m025-163); tipe lain wajib 4.
    if (isTFNS) {
      if (opts.map(norm).join('|') !== TFNS_OPTS.join('|')) E(qid, 'soal TFNS harus persis 3 opsi True/False/Not stated');
    } else if (opts.length !== 4) E(qid, `harus 4 pilihan, ada ${opts.length}`);
    const n = opts.map(norm);
    if (new Set(n).size !== n.length) E(qid, 'ada pilihan kembar');
    if (n.some(x => !x)) E(qid, 'ada pilihan kosong');
    if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length) { E(qid, `correctIndex ${ci} tidak sah`); return; }
    if (!meta.type) E(qid, 'meta.type kosong');
    else {
      if (!TYPES.includes(meta.type)) E(qid, `meta.type "${meta.type}" di luar daftar`);
      // Tipe kembar dalam satu bacaan = dua stem render identik berurutan (A07-F4).
      // Masih banyak di konten legacy A1-B1, jadi PERINGATAN dulu, bukan galat.
      if (seenType.has(meta.type)) warn.push(`${qid}: type "${meta.type}" dipakai dua kali dalam satu bacaan`);
      seenType.add(meta.type); typeCount[meta.type] = (typeCount[meta.type] || 0) + 1;
    }
    // Dua invarian yang meruntuhkan bank lama:
    if (!meta.answer) E(qid, 'meta.answer kosong');
    else if (norm(meta.answer) !== norm(opts[ci])) E(qid, `meta.answer TIDAK sama dengan options[${ci}] — perender akan menimpa satu pengecoh`);
    if (!meta.evidence) E(qid, 'meta.evidence kosong');
    else if (!String(r.text).includes(String(meta.evidence))) E(qid, 'meta.evidence tidak ada PERSIS di dalam teks bacaan');
    if (!meta.patternId) E(qid, 'meta.patternId kosong');
    // Dua soal berkunci sama dalam satu bacaan berarti murid menghafal satu kalimat,
    // bukan membaca. Di bank lama ini terjadi di 225 dari 300 bacaan.
    const keyNorm = norm(opts[ci]);
    if (keyNorm) { if (keysInPassage.has(keyNorm)) E(qid, 'kuncinya sama persis dengan soal lain di bacaan yang sama'); keysInPassage.add(keyNorm); }
    // --- KEBENARAN, bukan sekadar bentuk -------------------------------------
    //
    // Gerbang lama hanya memastikan meta.evidence ADA di dalam teks. Bank lama lolos
    // 1.500/1.500 di situ dan tetap rusak: soal-soal punya lebih dari satu opsi yang
    // sama-sama kalimat verbatim teks (dua-duanya bisa dibela) dan pengecoh soal
    // faktual ikut tertulis di bacaan. Keduanya diperiksa di sini.
    const bodyNorm = norm(r.text);
    const bodyPad = ` ${bodyNorm} `;
    const verbatim = opts.filter(o => words(o).length >= 6 && bodyNorm.includes(norm(o)));
    if (verbatim.length > 1) E(qid, `${verbatim.length} pilihan sama-sama kalimat verbatim dari bacaan — lebih dari satu jawaban bisa dibela`);
    // Gerbang A07-F1: di bawah stem generik runtime, pengecoh soal faktual yang
    // tertulis di bacaan ikut "benar". Tolak setiap pengecoh yang muncul di teks.
    if (FACT_TYPES.includes(meta.type)) {
      opts.forEach((o, j) => {
        if (j !== ci && inBody(bodyPad, o)) E(qid, `pengecoh "${o}" tertulis di bacaan — ganda kunci di bawah stem generik tipe "${meta.type}"`);
      });
    }
    // Kunci reference idealnya frasa yang benar-benar ada di teks; bank live memakai
    // deskripsi rujukan ("Dimas and his mother"), jadi ini PERINGATAN, bukan galat.
    if (meta.type === 'reference' && !bodyNorm.includes(norm(opts[ci]))) {
      warn.push(`${qid}: kunci reference bukan frasa verbatim dari teks (deskripsi rujukan)`);
    }
    // Entitas yang dikutip stem harus benar-benar ada di bacaan — kecuali TFNS,
    // yang memang mengutip klaim False/Not stated yang sengaja tidak ada di teks.
    if (!isTFNS) {
      // Kutipan bergaya “...” dipasangkan langsung; kutipan lurus "..." dipasangkan
      // lewat pembelahan (segmen ganjil), supaya "it" ... "it ought..." tidak salah pasang.
      const quotedSpans = [...String(stem).matchAll(/“([^”]{1,80})”/g)].map(m => m[1])
        .concat(String(stem).split('"').filter((_, k) => k % 2 === 1));
      for (const rawQuote of quotedSpans) {
        if (rawQuote.length < 4 || rawQuote.length > 60) continue;
        const quoted = norm(rawQuote);
        if (quoted && quoted !== norm(r.title) && !bodyNorm.includes(quoted)) {
          E(qid, `stem mengutip “${rawQuote}” yang tidak ada di bacaan maupun judulnya`);
        }
      }
    }
    // Bahasa: stem dan pilihan harus konsisten, tidak boleh separuh Inggris separuh Indonesia.
    const idw = /\b(yang|tidak|karena|dengan|untuk|adalah|pada|dari|itu|ini|bukan|akan|apa|mana|siapa|kapan|mengapa|bagaimana|dalam|oleh)\b/i;
    const enw = /\b(the|of|and|that|this|with|for|because|which|from|their|about)\b/i;
    for (const o of opts) if (idw.test(o) && enw.test(o) && words(o).length >= 6) E(qid, `pilihan campur Indonesia+Inggris: "${String(o).slice(0, 70)}"`);
  });
}

for (const t of TYPES) if (!typeCount[t]) warn.push(`type "${t}" tidak dipakai sama sekali di berkas ini`);

const wcs = bank.map(r => words(r.text).length).sort((a, b) => a - b);
console.log(`${file} — ${bank.length} bacaan, median ${wcs[Math.floor(wcs.length / 2)] || 0} kata (${mixed ? 'bank campuran' : `target ${WORDS[level][0]}-${WORDS[level][1]}`})`);
console.log(`tipe soal terpakai: ${Object.keys(typeCount).length}/${TYPES.length}`);
for (const w of warn) console.log('  PERINGATAN ' + w);
if (errs.length) { console.log(`\n${errs.length} GALAT:`); for (const e of errs.slice(0, 40)) console.log('  ' + e); if (errs.length > 40) console.log(`  ... dan ${errs.length - 40} lagi`); process.exit(1); }
console.log('\nLOLOS');
