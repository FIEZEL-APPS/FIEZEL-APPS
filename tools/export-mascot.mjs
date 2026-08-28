#!/usr/bin/env node
/**
 * ============================================================
 * FIEZEL PAW — pipeline ekspor aset maskot (Wave II, Fase 1.3 code-plan)
 * ============================================================
 *
 * Aturan E5/G11 (FIEZEL-PAW-REDESIGN-SPECIFICATION §2/§35): SATU sumber rig
 * kanonik — SVG inline di features/mascot/fiezel-mascot.js. Semua berkas
 * statis di bawah ini adalah HASIL GENERATE dari rig itu, bukan garapan
 * tangan. Skrip ini:
 *
 *   1. Membaca sumber komponen sebagai TEKS, lalu mengevaluasi irisan
 *      rig-nya (svgMarkup + tabel PIVOTS/EXPRESSIONS/POSES) di sandbox
 *      node:vm — komponen TIDAK diubah, guard SSR-nya tidak perlu ditembus,
 *      dan tidak ada dependensi selain builtin Node.
 *   2. Menghasilkan kembar statis:
 *        assets/brand/paw-mascot-full.svg          (netral, pose idle 08 §1.1)
 *        assets/brand/paw-mascot-head.svg          (crop kepala netral)
 *        assets/marketing/mascot-poses/*.svg       (3 pose marketing dari
 *                                                   tabel pose/ekspresi rig)
 *      Pose = rig + tuple transform yang dibake sebagai atribut — semantik
 *      persis _applyTuple() komponen, sehingga ekspor tidak pernah drift
 *      dari rig (E5). Cincin ekor r=15 + mask-nya SELALU ikut fz-tail-tip
 *      (defect fix D1 08 §3); headphone satu colorway master (D2); emblem
 *      dada = glyph fiezel-paw.svg apa adanya (ditagih pawprint-geometry-
 *      gate-test.js); palet tertutup G1 diverifikasi ulang di sini.
 *   3. Merender PNG 512px (sharp bila ter-resolve, atau rsvg-convert bila
 *      ada di PATH; kalau keduanya absen, langkah PNG dilewati dengan
 *      pengumuman keras — jalankan manual: lihat pesan di output).
 *   4. Menyinkronkan kembar website byte-demi-byte (kontrak lapis 1 gerbang
 *      e5-checksum-gate-test.js): website/assets/mascot/{fiezel-mascot.js,
 *      fiezel-motion.css} + website/assets/brand/{fiezel-paw,paw-mascot-full,
 *      paw-mascot-head}.svg.
 *   5. Menulis assets/brand/mascot-checksums.json — kontrak manifest lapis 2
 *      gerbang E5: { rig: sha256(canonicalRig), files: { path: sha256 } };
 *      canonicalRig = template <svg> svgMarkup dengan ${maskId}→MASKID dan
 *      whitespace di-collapse (algoritme DISALIN persis dari gerbang).
 *
 * Pemakaian:
 *   node tools/export-mascot.mjs            # generate semua + tulis manifest
 *   node tools/export-mascot.mjs --check    # mode CI: verifikasi tanpa menulis
 *
 * npm: `npm run mascot:export` / `npm run mascot:check` (package.json).
 * Catatan design/redesign-v1: salinan maskot di sana TIDAK dicakup gerbang
 * E5 (bukan TWINS, bukan REQUIRED_EXPORTS) — sengaja tidak disentuh di sini.
 * ============================================================
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RIG_FILE = 'features/mascot/fiezel-mascot.js';
const MANIFEST = 'assets/brand/mascot-checksums.json';

const abs = (f) => path.join(ROOT, f);
const read = (f) => fs.readFileSync(abs(f), 'utf8');
const readBuf = (f) => fs.readFileSync(abs(f));
const exists = (f) => fs.existsSync(abs(f));
const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
const CHECK = process.argv.includes('--check');

/* ---------- palet tertutup G1 (verifikasi mandiri, cermin palette-gate) ---------- */
const G1 = new Set([
  'ffd94f', 'edb93a', 'fff4da', '8c2233', '33201f', 'f0a0ac', 'd8b36b', 'd9536a',
  '9cc7e8', 'fff', 'ffffff', '000', '000000',
]);

/* ============================================================
   1. EKSTRAKSI RIG — sandbox vm, tanpa menyentuh berkas komponen
   ============================================================ */
function extractRig(src) {
  // Irisan data murni: dari deklarasi palet sampai sebelum class custom
  // element (tidak butuh DOM). Semua const yang dibutuhkan ekspor ada di sini:
  // svgMarkup, PIVOTS, EXPRESSIONS, POSES, helper rotAt/trXY/scaleAt.
  const a = src.indexOf('const YEL');
  const b = src.indexOf('class FiezelMascot');
  if (a === -1 || b === -1 || b < a) {
    throw new Error('struktur fiezel-mascot.js berubah — irisan rig tidak ditemukan (const YEL … class FiezelMascot)');
  }
  const slice = src.slice(a, b);
  const sandbox = vm.createContext({}); // tanpa window/document — irisan tidak memerlukannya
  return vm.runInContext(
    `(() => { ${slice}; return { svgMarkup, PIVOTS, EXPRESSIONS, POSES, rotAt, trXY, scaleAt }; })()`,
    sandbox, { filename: 'fiezel-mascot-rig-slice.js' }
  );
}

/** Rig kanonik — algoritme DISALIN dari e5-checksum-gate-test.js (kontrak
 *  manifest.rig): template <svg> pertama sesudah token svgMarkup, id mask
 *  dinormalkan, whitespace di-collapse. Warna TIDAK dinormalkan. */
function canonicalRig(src) {
  const m = /svgMarkup[\s\S]*?(<svg[\s\S]*?<\/svg>)/.exec(src);
  if (!m) throw new Error('template svgMarkup tidak ditemukan di ' + RIG_FILE);
  return m[1].replace(/\$\{maskId\}/g, 'MASKID').replace(/\s+/g, ' ');
}

/* ============================================================
   2. PARSER/SERIALIZER XML MINI — builtin-only, cukup untuk markup rig
   (elemen + atribut ber-kutip-ganda + komentar; tanpa CDATA/PI/entity aneh)
   ============================================================ */
function parseXml(s) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt === -1) break; // sisa teks di luar elemen: hanya whitespace di rig
    if (s.startsWith('<!--', lt)) {           // komentar dibuang (ekspor bersih)
      const end = s.indexOf('-->', lt);
      if (end === -1) throw new Error('komentar tidak tertutup');
      i = end + 3; continue;
    }
    if (s[lt + 1] === '/') {                  // tag penutup
      const end = s.indexOf('>', lt);
      const name = s.slice(lt + 2, end).trim();
      const top = stack.pop();
      if (!top || top.tag !== name) throw new Error('XML tidak seimbang di </' + name + '>');
      i = end + 1; continue;
    }
    const end = s.indexOf('>', lt);
    if (end === -1) throw new Error('tag tidak tertutup');
    let tagStr = s.slice(lt + 1, end);
    const selfClose = tagStr.endsWith('/');
    if (selfClose) tagStr = tagStr.slice(0, -1);
    const nameM = /^([A-Za-z][\w:.-]*)/.exec(tagStr);
    if (!nameM) throw new Error('nama tag tidak valid: ' + tagStr.slice(0, 30));
    const node = { tag: nameM[1], attrs: {}, children: [] };
    const attrRe = /([A-Za-z][\w:.-]*)="([^"]*)"/g;
    let am;
    while ((am = attrRe.exec(tagStr))) node.attrs[am[1]] = am[2];
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
    i = end + 1;
  }
  if (stack.length !== 1) throw new Error('XML tidak seimbang (sisa ' + stack.length + ' level)');
  return root;
}

function serialize(node, depth = 0) {
  const pad = '  '.repeat(depth);
  const attrs = Object.entries(node.attrs).map(([k, v]) => ` ${k}="${v}"`).join('');
  if (!node.children.length) return `${pad}<${node.tag}${attrs}/>`;
  const kids = node.children.map((c) => serialize(c, depth + 1)).join('\n');
  return `${pad}<${node.tag}${attrs}>\n${kids}\n${pad}</${node.tag}>`;
}

/* ---------- util pohon ---------- */
function walk(node, fn) { fn(node); node.children.forEach((c) => walk(c, fn)); }
function hasClass(node, cls) {
  return typeof node.attrs.class === 'string' &&
    node.attrs.class.split(/\s+/).includes(cls);
}
function findAll(tree, cls) {
  const out = [];
  walk(tree, (n) => { if (hasClass(n, cls)) out.push(n); });
  return out;
}
function findOne(tree, cls) { return findAll(tree, cls)[0] || null; }
function prune(node, pred) { // buang anak (rekursif) yang memenuhi pred
  node.children = node.children.filter((c) => !pred(c));
  node.children.forEach((c) => prune(c, pred));
}

/* ============================================================
   3. BAKE TUPLE POSE/EKSPRESI — semantik persis _applyTuple() komponen
   (nilai literal 17 R-3; rotasi hanya anggota badan pada pivotnya sendiri)
   ============================================================ */
function bakeTuple(tree, t, rig) {
  const { PIVOTS: P, rotAt, trXY, scaleAt } = rig;
  const setT = (cls, v) => findAll(tree, cls).forEach((n) => { n.attrs.transform = v; });
  if (t.earL != null) setT('fz-ear-l', rotAt(t.earL, P.earL));
  if (t.earR != null) setT('fz-ear-r', rotAt(t.earR, P.earR));
  if (t.armL != null) setT('fz-arm-l', rotAt(t.armL, P.armL));
  if (t.armR != null) setT('fz-arm-r', rotAt(t.armR, P.armR));
  if (t.tailB != null) setT('fz-tail-base', rotAt(t.tailB, P.tailBase));
  if (t.tailT != null) setT('fz-tail-tip', rotAt(t.tailT, P.tailTip)); // cincin ikut (D1)
  if (t.head) setT('fz-head', trXY(t.head[0], t.head[1]));             // kepala: HANYA translate (P2)
  if (t.lidUp != null) setT('fz-lid-up', trXY(0, t.lidUp));
  if (t.lidLow != null) setT('fz-lid-low', trXY(0, t.lidLow));
  if (t.pupil) setT('fz-pupil', trXY(t.pupil[0], t.pupil[1]));
  if (t.pop != null) setT('fz-eye-open', scaleAt(P.eyeCenter, t.pop, t.pop));
  if (t.chest != null) setT('fz-chest', scaleAt(P.chest, t.chest, t.chest));
  if (t.blush != null) {
    const bl = findAll(tree, 'fz-blush');
    if (bl[0]) bl[0].attrs.transform = scaleAt(P.blushL, t.blush, t.blush);
    if (bl[1]) bl[1].attrs.transform = scaleAt(P.blushR, t.blush, t.blush);
  }
  if (t.browL || t.browR) {
    const g = findOne(tree, 'fz-brows');
    if (g) g.attrs.opacity = '1';
    if (t.browL) setT('fz-brow-l', `${trXY(0, t.browL[0])} ${rotAt(t.browL[1], P.browL)}`);
    if (t.browR) setT('fz-brow-r', `${trXY(0, t.browR[0])} ${rotAt(t.browR[1], P.browR)}`);
  }
  if (t.gaze) setT('fz-eyes', trXY(t.gaze[0], t.gaze[1])); // padanan statis --lx/--ly
  if (t.all) {
    const a = findOne(tree, 'fz-all');
    if (a) a.attrs.transform =
      `${trXY(t.all.tx || 0, t.all.ty || 0)} ${scaleAt(P.ground, t.all.sx ?? 1, t.all.sy ?? 1)}`;
  }
  const foot = (cls, f, p) => {
    if (!f) return;
    setT(cls, `${trXY(f.tx || 0, f.ty || 0)} ${scaleAt(p, f.sx ?? 1, f.sy ?? 1)}`);
  };
  foot('fz-foot-l', t.footL, P.footL);
  foot('fz-foot-r', t.footR, P.footR);
  if (t.shadow) {
    const sh = findOne(tree, 'fz-shadow');
    if (sh) {
      sh.attrs.transform = scaleAt(P.ground, t.shadow.s ?? 1, t.shadow.s ?? 1);
      if (t.shadow.o != null) sh.attrs.opacity = String(t.shadow.o);
    }
  }
  if (t.acc) t.acc.forEach((cls) => {
    const el = findOne(tree, cls);
    if (el) el.attrs.opacity = '1';
  });
  // mulut: tepat SATU bentuk fz-m-* tersisa di ekspor (P13)
  const shape = t.mouth || 'smile';
  walk(tree, (n) => {
    if (!hasClass(n, 'fz-m')) return;
    if (hasClass(n, 'fz-m-' + shape)) { delete n.attrs.style; n.attrs['data-keep'] = '1'; }
  });
  prune(tree, (n) => hasClass(n, 'fz-m') && !n.attrs['data-keep']);
  walk(tree, (n) => { delete n.attrs['data-keep']; });
}

/** Buang node runtime-only dari ekspor statis: layer kedip, set mata varian
 *  yang tidak aktif, aksesori tersembunyi, jangkar outfit kosong. */
function stripRuntime(tree) {
  prune(tree, (n) =>
    n.attrs.opacity === '0' ||                    // acc/brows/mata varian yang tidak diaktifkan pose
    hasClass(n, 'fz-lids') ||                     // layer kedip (statis: tersembunyi)
    hasClass(n, 'fz-outfit-back') || hasClass(n, 'fz-outfit'));
}

/* ============================================================
   4. PEMBANGUN DOKUMEN EKSPOR
   ============================================================ */
const GEN_NOTE = '<!-- HASIL GENERATE - jangan diedit tangan. Sumber tunggal: '
  + RIG_FILE + ' (aturan E5/G11). Regenerasi: node tools/export-mascot.mjs -->';

function svgDoc(rootAttrs, children) {
  const svg = { tag: 'svg', attrs: rootAttrs, children };
  return GEN_NOTE + '\n' + serialize(svg) + '\n';
}

/** Pohon rig segar dari svgMarkup(uid) — hanya bagian <svg> (div confetti
 *  adalah runtime-only dan berada di luar SVG). */
function freshTree(rig, uid) {
  const markup = rig.svgMarkup(uid);
  const a = markup.indexOf('<svg');
  const b = markup.indexOf('</svg>');
  if (a === -1 || b === -1) throw new Error('svgMarkup tidak mengandung <svg>…</svg>');
  return parseXml(markup.slice(a, b + 6)).children[0];
}

/** Ekspor badan penuh: seluruh rig (shadow + fz-all) dalam frame penuh. */
function buildFull(rig, uid, tuple, { viewBox, label }) {
  const svg = freshTree(rig, uid);
  bakeTuple(svg, tuple, rig);
  stripRuntime(svg);
  return svgDoc(
    { xmlns: 'http://www.w3.org/2000/svg', viewBox, role: 'img', 'aria-label': label },
    svg.children
  );
}

/** Ekspor crop kepala: defs clip mata + grup fz-head (+ aksesori level kepala
 *  yang diaktifkan tuple: headphone di atas kepala, bintang di layer atas —
 *  urutan tumpukan sama dengan runtime). */
function buildHead(rig, uid, tuple, { viewBox, label }) {
  const svg = freshTree(rig, uid);
  bakeTuple(svg, tuple, rig);
  stripRuntime(svg);
  const defs = { tag: 'defs', attrs: {}, children: [] };
  walk(svg, (n) => {
    if (n.tag === 'clipPath' && /^fzcEye/.test(n.attrs.id || '')) defs.children.push(n);
  });
  const head = findOne(svg, 'fz-head');
  if (!head) throw new Error('grup fz-head tidak ditemukan di rig');
  const kids = [defs, head];
  for (const cls of ['fz-headphones', 'fz-stars']) { // hanya yang diaktifkan pose (lolos stripRuntime)
    const acc = findOne(svg, cls);
    if (acc) kids.push(acc);
  }
  return svgDoc(
    { xmlns: 'http://www.w3.org/2000/svg', viewBox, role: 'img', 'aria-label': label },
    kids
  );
}

/* ============================================================
   5. RASTER PNG 512 — sharp (bila ter-resolve) → rsvg-convert (PATH) → manual
   ============================================================ */
async function renderPngs(jobs) {
  let sharp = null;
  try { sharp = createRequire(import.meta.url)('sharp'); } catch { /* tidak ada */ }
  if (sharp) {
    for (const { svg, png, size } of jobs) {
      const buf = await sharp(readBuf(svg), { density: 300 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png().toBuffer();
      fs.writeFileSync(abs(png), buf);
      console.log('png  - ' + png + ' (' + size + 'px, sharp)');
    }
    return true;
  }
  const probe = spawnSync('rsvg-convert', ['--version'], { encoding: 'utf8' });
  if (!probe.error) {
    for (const { svg, png, size } of jobs) {
      const r = spawnSync('rsvg-convert',
        ['--keep-aspect-ratio', '-w', String(size), '-h', String(size), '-o', abs(png), abs(svg)],
        { encoding: 'utf8' });
      if (r.status !== 0) throw new Error('rsvg-convert gagal untuk ' + svg + ': ' + r.stderr);
      console.log('png  - ' + png + ' (' + size + 'px, rsvg-convert)');
    }
    return true;
  }
  console.log('PERINGATAN - tidak ada sharp maupun rsvg-convert; PNG TIDAK diregenerasi.');
  console.log('  Langkah manual: rsvg-convert --keep-aspect-ratio -w 512 -h 512 -o <out.png> <in.svg>');
  console.log('  lalu jalankan ulang skrip ini agar manifest memuat hash PNG terbaru.');
  return false;
}

/* ============================================================
   6. DEFINISI EKSPOR
   ============================================================ */
// Kembar byte website (kontrak lapis 1 gerbang E5) — sumber selalu kolom kiri.
const TWINS = [
  ['assets/brand/fiezel-paw.svg',       'website/assets/brand/fiezel-paw.svg'],
  ['assets/brand/paw-mascot-full.svg',  'website/assets/brand/paw-mascot-full.svg'],
  ['assets/brand/paw-mascot-head.svg',  'website/assets/brand/paw-mascot-head.svg'],
  ['features/mascot/fiezel-mascot.js',  'website/assets/mascot/fiezel-mascot.js'],
  ['features/mascot/fiezel-motion.css', 'website/assets/mascot/fiezel-motion.css'],
];

// PNG 512 (kanvas persegi transparan, karakter fit-contain — sama dengan aset lama).
const PNGS = [
  { svg: 'assets/brand/paw-mascot-full.svg', png: 'assets/brand/paw-mascot-full-512.png', size: 512 },
  { svg: 'assets/brand/paw-mascot-head.svg', png: 'assets/brand/paw-mascot-head-512.png', size: 512 },
];

// Berkas yang dicantumkan di manifest (semua ekspor + kembar + PNG; enam
// pertama = REQUIRED_EXPORTS gerbang E5).
const MANIFEST_FILES = [
  'assets/brand/fiezel-paw.svg',
  'assets/brand/paw-mascot-full.svg',
  'assets/brand/paw-mascot-head.svg',
  'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-listening.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-proud.svg',
  'assets/brand/paw-mascot-full-512.png',
  'assets/brand/paw-mascot-head-512.png',
  'website/assets/brand/fiezel-paw.svg',
  'website/assets/brand/paw-mascot-full.svg',
  'website/assets/brand/paw-mascot-head.svg',
  'website/assets/mascot/fiezel-mascot.js',
  'website/assets/mascot/fiezel-motion.css',
];

/* ============================================================
   7. VERIFIKASI MANDIRI PASCA-GENERATE (cermin gerbang, gagal keras)
   ============================================================ */
function selfCheckSvg(file, text, { needEmblem, needRing }) {
  parseXml(text); // well-formedness
  // palet tertutup G1 — cermin palette-gate-test.js
  const bad = new Map();
  for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    const h = m[1].toLowerCase();
    if (!G1.has(h)) bad.set(h, (bad.get(h) || 0) + 1);
  }
  if (bad.size) throw new Error(file + ': hex di luar palet G1: '
    + [...bad].map(([h, n]) => '#' + h + ' ×' + n).join(', '));
  if (/fz-pads/.test(text)) throw new Error(file + ': fz-pads muncul kembali (keputusan OWNER: glyph hanya di dada)');
  if (needEmblem && !/class="fz-emblem"/.test(text)) throw new Error(file + ': emblem dada fz-emblem hilang');
  if (needRing && !(/class="fz-ring"/.test(text) && /<mask /.test(text))) {
    throw new Error(file + ': cincin ekor r=15 / mask-nya hilang (defect D1 — ekspor tidak sah)');
  }
}

/* ============================================================
   8. MAIN
   ============================================================ */
async function main() {
  const src = read(RIG_FILE);
  const rig = extractRig(src);
  const rigHash = sha256(canonicalRig(src));

  // Pose marketing (08 §1 + peta §2; proud = ekspresi 8 dari 07 §2 — crop
  // kepala, kanal badan pada tuple tidak tampak; bintang fz-stars emas/soft-red
  // per defect fix D2 08 §3 menggantikan bintang #FFC700/#E6A800 lama).
  const POSE_EXPORTS = [
    {
      file: 'assets/marketing/mascot-poses/paw-mascot-head-listening.svg',
      kind: 'head', uid: 'x-listening', tuple: rig.POSES.listening,
      frame: { viewBox: '36 -18 248 232', label: 'PAW sedang mendengarkan' },
    },
    {
      file: 'assets/marketing/mascot-poses/paw-mascot-head-proud.svg',
      kind: 'head', uid: 'x-proud',
      tuple: { ...rig.EXPRESSIONS.proud, acc: ['fz-stars'] },
      frame: { viewBox: '22 -22 276 244', label: 'PAW bangga' },
    },
    {
      file: 'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
      kind: 'full', uid: 'x-celebrating', tuple: rig.POSES.celebrating,
      frame: { viewBox: '0 -32 320 332', label: 'PAW merayakan' }, // ruang lompatan ty-12 × sy1.05
    },
  ];

  // ---------- mode --check: verifikasi tanpa menulis apa pun ----------
  if (CHECK) {
    const errs = [];
    if (!exists(MANIFEST)) errs.push(MANIFEST + ' belum ada — jalankan tanpa --check dulu');
    else {
      const man = JSON.parse(read(MANIFEST));
      if (man.rig !== rigHash) errs.push('rig berubah tetapi ekspor belum di-generate ulang (manifest.rig basi)');
      for (const [f, want] of Object.entries(man.files || {})) {
        if (!exists(f)) { errs.push(f + ' hilang'); continue; }
        if (sha256(readBuf(f)) !== want) errs.push(f + ' menyimpang dari manifest');
      }
      for (const f of MANIFEST_FILES) if (!(f in (man.files || {}))) errs.push(f + ' tidak terdaftar di manifest');
    }
    for (const [s, c] of TWINS) {
      if (!exists(s) || !exists(c)) { errs.push('kembar hilang: ' + c); continue; }
      if (sha256(readBuf(s)) !== sha256(readBuf(c))) errs.push('kembar menyimpang: ' + c);
    }
    if (errs.length) {
      errs.forEach((e) => console.log('FAIL - ' + e));
      console.log('\nexport-mascot --check: FAIL (' + errs.length + ') — jalankan: node tools/export-mascot.mjs');
      process.exit(1);
    }
    console.log('export-mascot --check: PASS (manifest segar, kembar identik)');
    return;
  }

  // ---------- generate SVG ----------
  const outputs = new Map(); // file → text

  outputs.set('assets/brand/paw-mascot-full.svg', buildFull(rig, 'x-static', rig.POSES.idle,
    { viewBox: '0 0 320 300', label: 'PAW — maskot FIEZEL' }));
  outputs.set('assets/brand/paw-mascot-head.svg', buildHead(rig, 'x-head', { mouth: 'smile' },
    { viewBox: '56 -10 208 216', label: 'PAW — ikon kepala maskot FIEZEL' }));
  for (const p of POSE_EXPORTS) {
    outputs.set(p.file, (p.kind === 'full' ? buildFull : buildHead)(rig, p.uid, p.tuple, p.frame));
  }

  // verifikasi mandiri sebelum menulis — ekspor cacat tidak pernah menyentuh disk
  for (const [file, text] of outputs) {
    selfCheckSvg(file, text, {
      needEmblem: /full/.test(file),
      needRing: /full/.test(file), // badan penuh wajib bawa cincin ekor + mask
    });
  }
  for (const [file, text] of outputs) {
    fs.writeFileSync(abs(file), text);
    console.log('svg  - ' + file);
  }

  // ---------- PNG 512 ----------
  await renderPngs(PNGS);

  // ---------- sinkron kembar website (byte-demi-byte) ----------
  for (const [srcF, copy] of TWINS) {
    fs.mkdirSync(path.dirname(abs(copy)), { recursive: true });
    fs.copyFileSync(abs(srcF), abs(copy));
    console.log('twin - ' + copy);
  }

  // ---------- manifest (kontrak gerbang E5: { rig, files }) ----------
  const files = {};
  for (const f of MANIFEST_FILES) {
    if (!exists(f)) throw new Error('berkas manifest hilang: ' + f);
    files[f] = sha256(readBuf(f));
  }
  const manifest = { generator: 'tools/export-mascot.mjs', rig: rigHash, files };
  fs.writeFileSync(abs(MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
  console.log('man  - ' + MANIFEST + ' (rig ' + rigHash.slice(0, 12) + '…, ' + Object.keys(files).length + ' berkas)');
  console.log('\nexport-mascot: SELESAI');
}

main().catch((e) => { console.error('export-mascot: GAGAL — ' + e.message); process.exit(1); });
