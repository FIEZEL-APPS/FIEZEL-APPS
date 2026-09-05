'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/**
 * tests/css-keyframe-uniq-test.js — gerbang NAMA @keyframes KEMBAR.
 *
 * Nama keyframe adalah ruang nama GLOBAL satu dokumen: ia tidak dibatasi berkas, selektor,
 * atau komponen. Dua blok bernama sama = definisi belakangan MENANG, dan yang lebih dulu
 * lenyap tanpa satu pun peringatan dari browser, linter, atau build.
 *
 * Bug ini sudah dua kali menembus produksi FIEZEL:
 *
 *   1. `pageIn` di style.css (tombstone audit 12-003, 2026-08-29) — kembaran opacity-saja
 *      mematikan animasi masuk rise+fade untuk 15 layar `.fade`.
 *   2. `tg-pop` di features/teacher/teacher-shell.css (m025-263) — blok inbox membajak
 *      animasi modal. Modal dipusatkan lewat `transform:translate(-50%,-50%)`, sedangkan
 *      keyframe inbox berakhir di `transform:none`. Selama 0,24 detik animasinya berjalan,
 *      pemusatan itu HILANG: modal ("Tugas baru", "Susun soal dari bank soal") muncul di
 *      bawah-kanan titik tengah lalu menjentik balik. Owner melaporkannya sebagai panel yang
 *      "bergerak dari bawah kanan layar".
 *
 * Yang pertama hanya meninggalkan komentar. Komentar tidak menahan siapa pun. Gerbang ini
 * yang menahannya.
 */
const fs = require('fs');
const path = require('path');
const results = []; let failures = 0;
function assert(c, m) { results.push({ ok: !!c, message: m }); if (!c) failures += 1; }

/**
 * Nama keyframe bertabrakan hanya bila kedua berkasnya masuk ke DOKUMEN yang sama. Dua
 * halaman berbeda boleh memakai nama yang sama tanpa saling mengganggu — website/ memang
 * menyalin fiezel-motion.css milik PWA, dan design/redesign-v1/ adalah prototipe yang tidak
 * pernah dimuat. Jadi gerbang ini memeriksa PER HALAMAN: hanya CSS yang benar-benar
 * ditautkan dari sebuah .html yang diadu satu sama lain.
 */
function linkedCss(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const base = path.dirname(htmlPath);
  const out = [];
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const href = (tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1];
    if (!href || /^(https?:)?\/\//.test(href) || href.startsWith('data:')) continue;
    const file = path.join(base, href.split('?')[0].split('#')[0]);
    if (fs.existsSync(file) && out.indexOf(file) === -1) out.push(file);
  }
  return out;
}

/** Buang komentar dulu: tombstone audit 12-003 MENYEBUT `@keyframes pageIn` dalam prosa. */
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ' '); }

function keyframesIn(file) {
  const out = [];
  stripComments(fs.readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/@(?:-webkit-)?keyframes\s+("[^"]+"|'[^']+'|[A-Za-z_][\w-]*)/g)) {
      out.push({ name: m[1].replace(/^["']|["']$/g, ''), at: path.relative(__fzRoot, file) + ':' + (i + 1) });
    }
  });
  return out;
}

/* Setiap halaman yang benar-benar dikirim ke pengguna. */
const PAGES = ['index.html', path.join('website', 'index.html'), path.join('website', 'install', 'index.html')]
  .map((p2) => path.join(__fzRoot, p2)).filter((p2) => fs.existsSync(p2));
assert(PAGES.length > 0, 'ada halaman HTML yang diperiksa (' + PAGES.length + ')');

let totalNames = 0;
const seen = new Map(); // dipakai pagar khusus di bawah: nama -> lokasi di index.html
for (const page of PAGES) {
  const rel = path.relative(__fzRoot, page);
  const sheets = linkedCss(page);
  assert(sheets.length > 0, rel + ' menautkan CSS yang bisa dibaca (' + sheets.length + ' berkas)');
  const here = new Map();
  for (const sheet of sheets) {
    for (const k of keyframesIn(sheet)) {
      if (!here.has(k.name)) here.set(k.name, []);
      here.get(k.name).push(k.at);
    }
  }
  totalNames += here.size;
  if (rel === 'index.html') for (const [n, w] of here) seen.set(n, w);
  const clashes = [...here.entries()].filter(([, where]) => where.length > 1);
  for (const [name, where] of clashes) {
    assert(false, rel + ': nama @keyframes KEMBAR "' + name + '" di ' + where.join(' dan ') +
      ' — definisi belakangan menang dan yang lebih dulu lenyap diam-diam; beri nama berbeda');
  }
  assert(clashes.length === 0, rel + ': tidak ada nama @keyframes kembar di antara CSS yang dimuatnya');
}
assert(totalNames > 0, 'ada @keyframes yang ditemukan (' + totalNames + ' nama)');

/* Pagar khusus untuk kembaran yang SUDAH pernah lolos, supaya keduanya tidak bisa kembali. */
assert((seen.get('tg-pop') || []).length === 1, '@keyframes tg-pop hanya satu (regresi m025-263)');
assert((seen.get('pageIn') || []).length === 1, '@keyframes pageIn hanya satu (tombstone audit 12-003)');

/*
 * Modal dipusatkan oleh transform, jadi keyframe-nya WAJIB membawa pemusatan itu di kedua
 * ujungnya. Keyframe yang berakhir di `transform:none` akan melepas pemusatannya selama
 * animasi berjalan — itulah bentuk persis bug m025-263, dan ia bisa kembali tanpa nama kembar.
 */
const shell = stripComments(fs.readFileSync(path.join(__fzRoot, 'features', 'teacher', 'teacher-shell.css'), 'utf8'));
const modalAnim = (shell.match(/\.tg-modal\{[^}]*animation:\s*([\w-]+)/) || [])[1];
assert(modalAnim, '.tg-modal memakai animasi bernama (' + modalAnim + ')');
if (modalAnim) {
  const block = (shell.match(new RegExp('@keyframes\\s+' + modalAnim + '\\s*\\{([\\s\\S]*?)\\}\\s*\\}')) || [])[1] || '';
  assert(/translate\(-50%,\s*-4[0-9]%\)/.test(block) && /translate\(-50%,\s*-50%\)/.test(block),
    'keyframes ' + modalAnim + ' menjaga pemusatan translate(-50%,…) di kedua ujungnya');
  assert(!/transform:\s*none/.test(block),
    'keyframes ' + modalAnim + ' TIDAK berakhir di transform:none (itu melepas pemusatan modal)');
}

for (const r of results) console.log((r.ok ? 'ok   - ' : 'FAIL - ') + r.message);
console.log('\n' + (results.length - failures) + '/' + results.length + ' PASS · tests/css-keyframe-uniq-test.js');
process.exit(failures ? 1 : 0);
