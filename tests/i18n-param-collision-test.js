'use strict';
/**
 * tests/i18n-param-collision-test.js — GERBANG: t('kunci', {a:…, a:…}) YANG MENELAN NILAI.
 *
 * Objek literal JavaScript dengan nama properti kembar TIDAK melempar error: yang terakhir
 * menang, yang pertama hilang tanpa suara. Di pemanggilan i18n akibatnya dua placeholder
 * yang semestinya berbeda terisi nilai yang SAMA, dan kalimatnya tetap tampak utuh — tidak
 * ada `{placeholder}` mentah yang tertinggal untuk ditangkap mata atau gerbang lain.
 *
 * Berkas ini lahir dari kejadian nyata (audit braincore 2026-09-26). Kartu "Cara FIEZEL
 * menilai" di layar Progres memanggil
 *
 *   t('progress.kesulitan-kemungkinan-besar-berasal-jadi',
 *     {skillName: <gejala>, skillName: <akar prasyarat>})
 *
 * sehingga murid membaca "kesulitan di Past Perfect kemungkinan besar berasal dari Past
 * Perfect" — diagnosis akar masalah Core Brain (rootCause) sampai ke layar tanpa gejalanya.
 * Kembarannya lahir dari ekstraksi literal massal: dua interpolasi berbeda diberi nama
 * placeholder yang sama. Gerbang th-coverage hijau (kunci dan placeholder id/th memang
 * sejajar), gerbang kunci-hantu hijau (kuncinya terdaftar) — cacatnya ada di PEMANGGIL.
 *
 * Cakupan: pemanggilan `FiezelI18n.t(...)` dan alias `t(...)` dengan kunci LITERAL dan
 * argumen kedua berupa objek literal. Yang diperiksa hanya nama properti tingkat atas;
 * spread (`...x`) dilewati karena isinya tidak bisa dibaca statis.
 *
 * Konvensi repo: tanpa dependensi, exit 1 saat gagal, baris akhir '<Nama>: PASS'.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/node_modules|\.git|vendor/.test(p)) walk(p, out); }
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

/*
 * Pemindai kecil yang sadar string, template literal (termasuk ${…} bersarang), komentar,
 * dan kurung. Regex polos tidak cukup: nilai placeholder di app.js sering berupa template
 * literal yang memuat `{`, `}`, dan `,` — pemotongan naif akan membaca koma di dalam
 * template sebagai pemisah properti dan melahirkan merah palsu.
 */
function skipString(src, i) {
  const q = src[i];
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (q === '`' && c === '$' && src[i + 1] === '{') { i = skipBalanced(src, i + 1); continue; }
    if (c === q) return i + 1;
    i++;
  }
  return i;
}
function skipComment(src, i) {
  if (src[i + 1] === '/') { const n = src.indexOf('\n', i); return n < 0 ? src.length : n + 1; }
  const n = src.indexOf('*/', i + 2);
  return n < 0 ? src.length : n + 2;
}
function isCommentStart(src, i) { return src[i] === '/' && (src[i + 1] === '/' || src[i + 1] === '*'); }
function skipBalanced(src, i) {
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(src, i); continue; }
    if (isCommentStart(src, i)) { i = skipComment(src, i); continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return i;
}

/** Nama properti tingkat atas dari objek literal yang dibuka di src[open] === '{'. */
function topLevelKeys(src, open) {
  const keys = [];
  let i = open + 1, expectKey = true;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (isCommentStart(src, i)) { i = skipComment(src, i); continue; }
    if (c === '}') return keys;
    if (c === ',') { expectKey = true; i++; continue; }
    if (expectKey) {
      expectKey = false;
      if (src.startsWith('...', i)) { i += 3; continue; }
      const m = /^(?:([A-Za-z_$][\w$]*)|'([^'\\]*)'|"([^"\\]*)")\s*(?=[:,}])/.exec(src.slice(i, i + 120));
      if (m) { keys.push(m[1] || m[2] || m[3]); i += m[0].length; continue; }
    }
    if (c === '"' || c === "'" || c === '`') { i = skipString(src, i); continue; }
    if (c === '{' || c === '(' || c === '[') { i = skipBalanced(src, i); continue; }
    i++;
  }
  return keys;
}

/** Temuan kembar dalam satu sumber: [{line, key, dup}]. */
function collisions(src) {
  const out = [];
  const re = /(?:FiezelI18n\.t|(?:^|[^A-Za-z0-9_$.])t)\(\s*(['"])([^'"\n]+)\1\s*,\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    const seen = new Set(), dup = [];
    for (const k of topLevelKeys(src, open)) { if (seen.has(k)) dup.push(k); seen.add(k); }
    if (dup.length) out.push({ line: src.slice(0, m.index).split('\n').length, key: m[2], dup: [...new Set(dup)] });
  }
  return out;
}

const berkas = [path.join(__fzRoot, 'app.js')]
  .concat(walk(path.join(__fzRoot, 'features'), []))
  .filter((f) => !f.includes(path.join('features', 'i18n')));

let failures = 0;
function test(n, fn) { try { fn(); console.log('ok - ' + n); } catch (e) { failures++; console.error('FAIL - ' + n + '\n    ' + e.message); } }

test('tidak ada pemanggilan t() yang mengirim nama placeholder kembar', () => {
  const temuan = [];
  for (const f of berkas) {
    for (const h of collisions(fs.readFileSync(f, 'utf8'))) {
      temuan.push(path.relative(__fzRoot, f) + ':' + h.line + ' ' + h.key + ' → {' + h.dup.join(', ') + '} kembar');
    }
  }
  assert.deepStrictEqual(temuan, [],
    'placeholder kembar: nilai pertama hilang tanpa suara, kalimat tampil dengan isi yang salah:\n      ' +
    temuan.join('\n      '));
});

test('kartu akar masalah Core Brain menyebut gejala DAN prasyaratnya dengan nama berbeda', () => {
  const key = 'progress.kesulitan-kemungkinan-besar-berasal-jadi';
  for (const lang of ['id', 'th']) {
    const s = fs.readFileSync(path.join(__fzRoot, 'features', 'i18n', 'copy-' + lang + '-app-d.js'), 'utf8');
    const m = s.match(new RegExp("'" + key.replace(/[.-]/g, '\\$&') + "'\\s*:\\s*'([^']*)'"));
    assert.ok(m, lang + ': kunci ' + key + ' tidak ditemukan');
    const ph = (m[1].match(/\{(\w+)\}/g) || []);
    assert.strictEqual(new Set(ph).size, 2, lang + ': kalimat akar masalah butuh DUA placeholder berbeda, dapat ' + ph.join(' '));
  }
});

// BUKTI-BISA-MERAH: detektor terbukti menangkap bentuk cacat aslinya, dan tidak merah pada
// template literal yang penuh kurung kurawal dan koma.
test('RED · detektor merah pada bentuk cacat asli, hijau pada nilai template yang rumit', () => {
  const racun = "x=FiezelI18n.t('progress.k',{skillName:esc(a.b||a.c),skillName:esc(d)})";
  assert.deepStrictEqual(collisions(racun).map((h) => h.dup), [['skillName']], 'racun kembar tidak tertangkap');
  const alias = "y=t('guru.k',{n:1,/* n: bukan kunci */m:2,'n':3})";
  assert.deepStrictEqual(collisions(alias).map((h) => h.dup), [['n']], 'kunci berkutip / alias t() tidak tertangkap');
  const bersih = "z=FiezelI18n.t('a.b',{name:`${x?`{a,b}`:'}'}`,nilai:f({name:1},[2,3]),...rest,total:'a,b'})";
  assert.deepStrictEqual(collisions(bersih), [], 'merah palsu pada template/objek bersarang');
});

console.log('\nI18nParamCollision: ' + (failures ? 'FAIL (' + failures + ')' : 'PASS') + ' — ' + berkas.length + ' berkas dipindai');
process.exit(failures ? 1 : 0);
