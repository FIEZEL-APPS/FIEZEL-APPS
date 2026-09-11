#!/usr/bin/env node
/**
 * ============================================================
 * FIEZEL PAW — inti rig bersama (dipakai dua pipeline ekspor)
 * ============================================================
 *
 * Berkas ini BUKAN fitur baru. Isinya persis bagian 1-4 yang dulu tinggal di
 * dalam tools/export-mascot.mjs: ekstraksi irisan rig dari
 * features/mascot/fiezel-mascot.js lewat node:vm, parser/serializer XML mini,
 * bake tuple pose/ekspresi (semantik persis _applyTuple() komponen), dan
 * pembangun dokumen ekspor.
 *
 * Alasannya dipindah: tools/export-character-system.mjs (sistem karakter merek
 * — ekspresi, pose, badge, ilustrasi) harus MEMBANGUN dari rig yang sama persis.
 * Menyalin 200 baris ini ke sana berarti dua salinan semantik pose yang bisa
 * drift diam-diam, dan aturan E5 ada justru untuk melarang drift itu. Jadi:
 * satu sumber bentuk (fiezel-mascot.js), satu sumber semantik bake (berkas ini),
 * dua pipeline ekspor yang memakainya.
 *
 * Pindahnya WAJIB byte-netral untuk aset yang sudah ada — dibuktikan dengan
 * `node tools/export-mascot.mjs --check` yang tetap PASS atas manifest lama.
 * ============================================================
 */
'use strict';

import vm from 'node:vm';

/** Sumber bentuk TUNGGAL. Dinamai di sini supaya kedua pipeline menyebut berkas
 *  yang sama, dan supaya catatan kepala hasil generate tidak pernah salah tunjuk. */
const RIG_FILE = 'features/mascot/fiezel-mascot.js';

/** Catatan kepala berkas hasil generate. `tool` = skrip yang meregenerasinya. */
const genNote = (tool) => '<!-- HASIL GENERATE - jangan diedit tangan. Sumber tunggal: '
  + RIG_FILE + ' (aturan E5/G11). Regenerasi: node ' + tool + ' -->';

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

/** Rig kanonik — algoritme DISALIN dari tests/e5-checksum-gate-test.js (kontrak
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
function svgDoc(rootAttrs, children, tool = 'tools/export-mascot.mjs') {
  const svg = { tag: 'svg', attrs: rootAttrs, children };
  return genNote(tool) + '\n' + serialize(svg) + '\n';
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
function buildFull(rig, uid, tuple, { viewBox, label, tool }) {
  const svg = freshTree(rig, uid);
  bakeTuple(svg, tuple, rig);
  stripRuntime(svg);
  return svgDoc(
    { xmlns: 'http://www.w3.org/2000/svg', viewBox, role: 'img', 'aria-label': label },
    svg.children, tool
  );
}

/** Ekspor crop kepala: defs clip mata + grup fz-head (+ aksesori level kepala
 *  yang diaktifkan tuple: headphone di atas kepala, bintang di layer atas —
 *  urutan tumpukan sama dengan runtime). */
function buildHead(rig, uid, tuple, { viewBox, label, tool }) {
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
    kids, tool
  );
}


export {
  G1, RIG_FILE, genNote,
  extractRig, canonicalRig,
  parseXml, serialize,
  walk, hasClass, findAll, findOne, prune,
  bakeTuple, stripRuntime,
  svgDoc, freshTree, buildFull, buildHead,
};
