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

/**
 * CSS yang dikirim LANGSUNG di dalam halaman lewat <style>. Halaman landing website/
 * memakai bentuk ini (satu blok, nol permintaan tambahan) alih-alih menautkan berkas.
 * Tanpa dibaca di sini, @keyframes-nya tidak pernah terlihat gerbang — jadi menambahkannya
 * MEMPERLUAS jangkauan, bukan melonggarkan syarat.
 */
function inlineCss(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const out = [];
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const isi = m[1];
    if (isi && isi.trim()) out.push({ css: isi, at: path.relative(__fzRoot, htmlPath) + ' <style>' });
  }
  return out;
}

/**
 * Isi sebuah @keyframes, dinormalkan. Dipakai untuk membedakan dua hal yang sangat berbeda:
 *
 *   - kembar BERBEDA  -> bahaya. Definisi belakangan menang dan yang lebih dulu lenyap
 *                        diam-diam. Ini bentuk persis bug m025-263.
 *   - kembar IDENTIK  -> sah. Halaman menyalin sebagian CSS kritisnya ke dalam <style>
 *                        supaya splash beranimasi sebelum style.css tiba. Menghukumnya
 *                        berarti gerbang merah karena alasan salah — dan gerbang yang merah
 *                        karena alasan salah akan dilonggarkan orang sampai tidak berarti.
 */
function bodyAt(css, start) {
  const buka = css.indexOf('{', start);
  if (buka < 0) return '';
  let d = 0;
  for (let i = buka; i < css.length; i++) {
    if (css[i] === '{') d++;
    else if (css[i] === '}') { d--; if (!d) return css.slice(buka, i + 1).replace(/\s+/g, ''); }
  }
  return '';
}

function keyframesInText(css, label) {
  const bersih = stripComments(css);
  const out = [];
  const re = /@(?:-webkit-)?keyframes\s+("[^"]+"|'[^']+'|[A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(bersih)) !== null) {
    const baris = bersih.slice(0, m.index).split('\n').length;
    out.push({
      name: m[1].replace(/^["']|["']$/g, ''),
      at: label + ':' + baris,
      body: bodyAt(bersih, m.index + m[0].length)
    });
  }
  return out;
}

function keyframesIn(file) {
  return keyframesInText(fs.readFileSync(file, 'utf8'), path.relative(__fzRoot, file));
}

/* Setiap halaman yang benar-benar dikirim ke pengguna. */
/* DAFTAR HALAMAN DITEMUKAN, TIDAK DITULIS TANGAN (m025-301).
   Versi sebelumnya menyebut tiga halaman dengan tangan: index.html, website/index.html,
   website/install/index.html. Itu benar saat ditulis dan diam-diam berhenti benar: repo
   sekarang punya kurikulum.html dan misi.html yang masing-masing menautkan CSS dengan
   empat @keyframes, dan keduanya di luar pengawasan gerbang ini. Tabrakan nama di sana
   akan lolos hijau — persis dua bug yang membuat gerbang ini ada.

   Gerbang yang memeriksa daftar tulisan tangan hanya sekuat ingatan orang yang terakhir
   menyuntingnya. Jadi halamannya kini DITEMUKAN dari isi direktori, dan yang ditulis
   tangan bukan lagi "apa yang diperiksa" melainkan "apa yang SENGAJA tidak diperiksa" —
   satu daftar pendek dengan alasan, yang salah kalau kosong dan kelihatan kalau tumbuh.

   Yang dikecualikan hanya yang TIDAK BISA DINAVIGASI siapa pun — empat direktori,
   masing-masing dengan alasannya di sebelah namanya di daftar di bawah: design/ dan
   mockups/ (prototipe & gambar rancangan, sejalan dengan kepala berkas ini), tools/
   (harness pengembang), reports/ (keluaran bukti audit). Tabrakan @keyframes di sana
   nyata tetapi tak berakibat, dan membiarkannya bisa memerahkan CI atas berkas yang
   tidak pernah dilihat murid. Sisanya — termasuk halaman baru yang belum ada saat
   kalimat ini ditulis — otomatis masuk pengawasan. */
const DILUAR_LINGKUP = [
  'design/',            // prototipe redesign-v1, tidak pernah ditautkan produksi
  'mockups/',           // gambar rancangan statis, bukan halaman yang dikirim
  'tools/',             // harness pengembang (probe TTS, pratinjau sfx) — tidak dinavigasi siapa pun
  'reports/',           // keluaran bukti audit, bukan halaman
  'node_modules/',
  'vendor/',
];
function temukanHalaman(dir, keluar) {
  keluar = keluar || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const abs = path.join(dir, e.name);
    const rel = path.relative(__fzRoot, abs).split(path.sep).join('/');
    if (DILUAR_LINGKUP.some((x) => rel === x.replace(/\/$/, '') || rel.startsWith(x))) continue;
    if (e.isDirectory()) temukanHalaman(abs, keluar);
    else if (e.name.endsWith('.html')) keluar.push(abs);
  }
  return keluar;
}
/* Halaman yang tidak punya CSS sama sekali (404.html, halaman setup creator) tidak
   menyimpan @keyframes, jadi tidak bisa bertabrakan. Ia disaring DI SINI, bukan lewat
   daftar nama, supaya penyaringnya tetap benar kalau halaman itu suatu hari diberi CSS. */
const SEMUA_HALAMAN = temukanHalaman(__fzRoot);
const PAGES = SEMUA_HALAMAN.filter((p2) => linkedCss(p2).length + inlineCss(p2).length > 0);
assert(PAGES.length > 0, 'ada halaman HTML yang diperiksa (' + PAGES.length + ')');
/* Pagar atas pagar: kalau suatu hari penemuannya rusak (pola diubah, direktori pindah),
   jumlahnya jatuh dan gerbang ini akan lolos karena tidak memeriksa apa-apa. Tiga halaman
   adalah yang PASTI ada sejak versi tulisan tangan; kurang dari itu berarti penemunya
   patah, bukan reponya menyusut. */
assert(PAGES.length >= 3,
  'penemu halaman hanya menemukan ' + PAGES.length + ' halaman ber-CSS — dulu tiga ' +
  'halaman diperiksa dengan tangan, jadi angka di bawah itu berarti penemunya patah');

let totalNames = 0;
const seen = new Map(); // dipakai pagar khusus di bawah: nama -> lokasi di index.html
for (const page of PAGES) {
  const rel = path.relative(__fzRoot, page);
  const sheets = linkedCss(page);
  const inline = inlineCss(page);
  // Syaratnya BUKAN "harus menautkan berkas" melainkan "CSS halaman ini harus bisa dibaca".
  // Halaman yang mengirim CSS-nya inline tetap wajib terperiksa; halaman tanpa CSS sama
  // sekali yang tidak boleh lolos, sebab itu berarti gerbang ini tidak memeriksa apa pun.
  assert(sheets.length + inline.length > 0,
    rel + ' punya CSS yang bisa dibaca (' + sheets.length + ' berkas tertaut, ' + inline.length + ' blok inline)');
  const here = new Map();
  for (const sheet of sheets) {
    for (const k of keyframesIn(sheet)) {
      if (!here.has(k.name)) here.set(k.name, []);
      here.get(k.name).push(k);
    }
  }
  for (const blok of inline) {
    for (const k of keyframesInText(blok.css, blok.at)) {
      if (!here.has(k.name)) here.set(k.name, []);
      here.get(k.name).push(k);
    }
  }
  totalNames += here.size;
  // Pagar khusus di bawah menghitung DEFINISI YANG BERBEDA, bukan salinan identik: satu nama
  // yang disalin apa adanya ke CSS kritis inline tetap satu perilaku.
  if (rel === 'index.html') {
    for (const [n, w] of here) seen.set(n, [...new Set(w.map((k) => k.body))]);
  }
  const clashes = [...here.entries()]
    .filter(([, ks]) => new Set(ks.map((k) => k.body)).size > 1);
  for (const [name, ks] of clashes) {
    assert(false, rel + ': nama @keyframes KEMBAR dengan ISI BERBEDA "' + name + '" di ' +
      ks.map((k) => k.at).join(' dan ') +
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
