#!/usr/bin/env node
/**
 * Gerbang rotasi keyframe untuk redesign maskot PAW.
 *
 * Aturan G4 (rotation-free body, FIEZEL-PAW-REDESIGN-SPECIFICATION §35 baris
 * "New regression nets"; systems/10 §0): TIDAK ADA rotate pada massa tubuh —
 * fz-all, fz-body, fz-head, fz-face, fz-eyes. Rotasi anggota badan di sekitar
 * porosnya sendiri (telinga, lengan, alis, ekor, aksesori) tetap legal (A-5).
 *
 * Kenapa gerbang, bukan review: rotasi tubuh adalah cara paling halus bahasa
 * gerak Direction C rusak — satu keyframe "biar lebih hidup" dan siluet
 * karakternya miring di semua halaman sekaligus. Gerbang ini ditulis mengikuti
 * SPEC, bukan CSS lama: ia MERAH sampai penulisan ulang fiezel-motion.css
 * (subagent Motion CSS PAW, Wave I) mendarat, lalu hijau selamanya — dan itu
 * tugasnya.
 *
 * Lingkup sengaja HANYA features/mascot/fiezel-motion.css: kembar website-nya
 * dijaga byte demi byte oleh tests/e5-checksum-gate-test.js, dan fzPawSettle −5° di
 * style.css legal per A-10 no.2 (itu marka tapak, bukan tubuh karakter).
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}

// Massa tubuh yang dijaga. fz-head belum tentu ada di rig lama (kepala menempel
// di fz-body); rig Direction C menambahkannya, dan gerbang ini sudah menunggunya.
const GUARDED = ['fz-all', 'fz-body', 'fz-head', 'fz-face', 'fz-eyes'];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Parser blok sadar-kurung (regex saja tidak cukup: @media membungkus rule, dan
 * @keyframes membungkus blok persen yang BUKAN rule). Mengembalikan:
 *   keyframes: { nama: isi }   rules: [{ sel, decl }]  (rule di dalam @media ikut)
 */
function parseCss(css) {
  const keyframes = {}, rules = [];
  (function walk(s) {
    let i = 0;
    while (i < s.length) {
      const open = s.indexOf('{', i);
      if (open === -1) break;
      const head = s.slice(i, open).trim();
      // cari kurung tutup pasangannya
      let depth = 1, j = open + 1;
      while (j < s.length && depth) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') depth--;
        j++;
      }
      const body = s.slice(open + 1, j - 1);
      if (/^@keyframes\s/.test(head)) {
        keyframes[head.replace(/^@keyframes\s+/, '').trim()] = body;
      } else if (head.startsWith('@')) {
        walk(body); // @media, @supports — rule di dalamnya tetap dihitung
      } else {
        rules.push({ sel: head, decl: body });
      }
      i = j;
    }
  })(css);
  return { keyframes, rules };
}

/** rotate dengan sudut BUKAN nol. rotate(0)/rotate(0deg) legal — itu pose netral. */
function hasNonZeroRotate(text) {
  for (const m of text.matchAll(/rotate[XYZ]?\(\s*(-?[\d.]+)(deg|rad|grad|turn)?\s*\)/g)) {
    if (Number(m[1]) !== 0) return true;
  }
  return /rotate3d\([^)]*,\s*(-?(?!0(deg|rad|grad|turn)?\s*\))[\d.]+)(deg|rad|grad|turn)?\s*\)/.test(text);
}

/** Subjek rule = compound TERAKHIR tiap selektor. `.st-curious .fz-brow-l` boleh
 *  berputar; `.st-greeting .fz-body` tidak. */
function guardedSubjects(sel) {
  const hit = [];
  for (const one of sel.split(',')) {
    const subject = one.trim().split(/[\s>+~]+/).pop() || '';
    for (const g of GUARDED) if (subject.includes('.' + g)) hit.push(one.trim());
  }
  return hit;
}

// Kembar byte dijaga e5-checksum-gate; di sini cukup parse sumbernya.
const CSS = stripComments(read('features/mascot/fiezel-motion.css'));
const { keyframes, rules } = parseCss(CSS);

test('parser membaca CSS yang sebenarnya, bukan berkas kosong', () => {
  if (Object.keys(keyframes).length < 20 || rules.length < 40) {
    throw new Error('hanya ' + Object.keys(keyframes).length + ' keyframes / '
      + rules.length + ' rule terbaca — struktur berkas berubah, parsernya buta');
  }
});

test('tidak ada transform:rotate statis pada massa tubuh', () => {
  const bad = [];
  for (const r of rules) {
    const subjects = guardedSubjects(r.sel);
    if (!subjects.length) continue;
    for (const d of r.decl.matchAll(/transform\s*:\s*([^;]+)/g)) {
      if (hasNonZeroRotate(d[1])) bad.push(subjects.join(', ') + ' → transform:' + d[1].trim());
    }
  }
  if (bad.length) {
    throw new Error('rotasi tubuh statis:\n      ' + bad.join('\n      ')
      + '\n      — G4: tubuh mengungkap emosi lewat squash/stretch/translate, bukan kemiringan');
  }
});

test('tidak ada keyframes ber-rotate yang dipasang ke massa tubuh', () => {
  const rotating = new Set(
    Object.entries(keyframes).filter(([, body]) => hasNonZeroRotate(body)).map(([n]) => n));
  const bad = [];
  for (const r of rules) {
    const subjects = guardedSubjects(r.sel);
    if (!subjects.length) continue;
    for (const d of r.decl.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) {
      for (const name of d[1].matchAll(/\b(fz[A-Za-z\d]+)\b/g)) {
        if (rotating.has(name[1])) bad.push(subjects.join(', ') + ' → ' + name[1]);
      }
    }
  }
  if (bad.length) {
    throw new Error('keyframes ber-rotate menempel pada tubuh:\n      ' + bad.join('\n      ')
      + '\n      — pindahkan rotasinya ke anggota badan, atau tulis ulang keyframenya tanpa rotate');
  }
});

test('anggota badan MASIH boleh berputar (gerbang tidak kelewat rakus)', () => {
  // Kontrol negatif: kalau tidak ada satu pun rotate legal yang tersisa di berkas,
  // kemungkinan besar gerbangnya (atau refactor CSS-nya) menyapu terlalu lebar —
  // telinga/lengan/ekor yang membeku bukan kemenangan G4, itu maskot yang mati.
  const rotating = Object.entries(keyframes).filter(([, b]) => hasNonZeroRotate(b));
  if (!rotating.length) {
    throw new Error('tidak ada keyframes ber-rotate sama sekali; fzWave/fzEarTwitch/ekor ikut hilang?');
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang rotasi keyframe: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang rotasi keyframe: PASS ' + pass);
