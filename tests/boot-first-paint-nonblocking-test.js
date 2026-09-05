// m025-199 — gerbang: style.css tidak boleh kembali memblokir cat pertama.
//
// LAPORAN OWNER: "saat boot memasukin splash sangat lama sekali hingga akhirnya muncul splash."
//
// DIUKUR sebelum disentuh (Slow 4G, CPU 4x, median 3 kali jalan, Chromium):
//
//   apa adanya ................................... FCP 2304 ms
//   tiga CSS fitur dibuat non-blokir ............. FCP 2668 ms   <- NOL perbaikan
//   style.css juga non-blokir .................... FCP  272 ms
//
// Jadi penahannya BUKAN jumlah stylesheet, melainkan style.css sendirian: 286 KB yang wajib
// tiba, terurai, dan berlaku sebelum peramban boleh mencat satu piksel. Pada boot penuh,
// perbaikan ini terukur 6472 ms -> 1588 ms, dan permintaan sebelum cat 48 -> 13.
//
// m025-84 sudah pernah memindahkan splash ke frame pertama untuk cacat yang SAMA GEJALANYA.
// Itu menyelesaikan separuhnya - markup-nya memang sudah di atas - tetapi peramban tetap
// menahan cat sampai lembar gaya terakhir berlaku, jadi separuh lainnya bertahan sampai
// pemilik melaporkannya lagi. Gerbang ini menjaga separuh yang kedua.
//
// YANG DIJAGA, dan urutannya penting:
//   (A) style.css dimuat non-blokir, dengan cadangan <noscript> untuk peramban tanpa JS.
//   (B) tirai splash TIDAK BOLEH terangkat sebelum lembarnya berlaku - kilatan HTML telanjang
//       lebih buruk daripada layar kosong yang baru saja dibuang.
//   (C) penantian itu BERPAGAR: lembar yang gagal atau lambat tidak boleh mengunci murid.
// (B) dan (C) diuji sebagai PERILAKU dengan menjalankan fungsinya, bukan mencocokkan teks.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __fzRoot;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

const checks = [];
let failed = false;
const check = (name, ok, details) => {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details || '' });
  if (!ok) failed = true;
};

/* ------------------------------------------------------------------ (A) muat non-blokir -- */
check('A style.css dimuat sebagai preload lalu ditukar ke stylesheet (bukan link pemblokir)',
  /<link rel="preload" as="style" href="\.\/style\.css"/.test(html) &&
  /this\.rel='stylesheet'/.test(html),
  'link stylesheet biasa menahan cat sampai 286 KB tiba dan terurai');
check('A ada cadangan <noscript> supaya peramban tanpa JS tetap dapat lembar penuh',
  /<noscript><link rel="stylesheet" href="\.\/style\.css"><\/noscript>/.test(html));
check('A kegagalan lembar ditandai (onerror), bukan didiamkan',
  /onerror="window\.__fzShellCss='error'"/.test(html),
  'tanpa ini, penantian tirai menunggu sesuatu yang tidak akan pernah datang');
check('A angka pengukurannya tercatat di berkas, bukan jadi cerita lisan',
  /272 ms/.test(html) && /2304 ms/.test(html),
  'keputusan tanpa angkanya akan dibalik orang berikutnya karena "kelihatan aneh"');

/* ------------------------------------------------------------------ (B)(C) tirai ---------- */
check('B pembubaran tirai menunggu kesiapan lembar',
  /if\(!shellCssSettled\(\)/.test(app),
  'tanpa ini murid bisa melihat HTML telanjang, kilatan yang lebih buruk daripada layar kosong');
check('C penantiannya BERPAGAR waktu (lembar gagal tidak boleh mengunci murid)',
  /<4000\)\{[\s\S]{0,80}setTimeout\(dismissBootSplash/.test(app),
  'aturan ini sudah tertulis di kepala dismissBootSplash sejak sebelum m025-199');

/* Perilaku shellCssSettled dijalankan sungguhan atas dokumen tiruan. */
const mulai = app.indexOf('function shellCssSettled(){');
const tutup = app.indexOf('function dismissBootSplash(){');
check('B/C fungsi kesiapan ditemukan di app.js', mulai !== -1 && tutup > mulai);

if (mulai !== -1 && tutup > mulai) {
  const kode = app.slice(mulai, tutup);
  const jalankan = (fzShellCss, relLembar) => {
    const sandbox = { console };
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.__fzShellCss = fzShellCss;
    sandbox.document = relLembar === '(tidak ada)'
      ? { querySelector: () => null }
      : { querySelector: () => ({ rel: relLembar }) };
    vm.createContext(sandbox);
    vm.runInContext(kode + '\nvar hasil = shellCssSettled();', sandbox, { filename: 'app.js#shellCssSettled' });
    return sandbox.hasil;
  };

  check('B lembar BELUM berlaku (rel masih preload) => tirai ditahan',
    jalankan(undefined, 'preload') === false,
    'inilah satu-satunya keadaan yang boleh menahan tirai');
  check('B lembar sudah berlaku (rel bertukar jadi stylesheet) => tirai boleh naik',
    jalankan(undefined, 'stylesheet') === true);
  check('C lembar GAGAL (onerror) => tirai boleh naik segera, tanpa menunggu pagar',
    jalankan('error', 'preload') === true,
    'menunggu lembar yang sudah gagal adalah menunggu selamanya');
  check('C penanda ready dihormati walau DOM belum menyusul',
    jalankan('ready', 'preload') === true);
  check('C elemen lembar TIDAK KETEMU => tirai boleh naik (ragu tidak boleh mengunci murid)',
    jalankan(undefined, '(tidak ada)') === true);
  check('C dokumen tanpa querySelector pun tidak mengunci murid',
    (() => {
      const sandbox = { console };
      sandbox.self = sandbox; sandbox.globalThis = sandbox; sandbox.document = {};
      vm.createContext(sandbox);
      vm.runInContext(kode + '\nvar hasil = shellCssSettled();', sandbox, { filename: 'app.js#shellCssSettled' });
      return sandbox.hasil === true;
    })());
}

fs.writeFileSync(path.join(ROOT, 'BOOT-FIRST-PAINT-REPORT.json'),
  JSON.stringify({ schema: 'fiezel-boot-first-paint-v1', pass: !failed, checks }, null, 2));
for (const c of checks) if (c.status === 'FAIL') console.error('FAIL ' + c.name + (c.details ? ' — ' + c.details : ''));
console.log('boot-first-paint-nonblocking-test: ' + checks.filter(c => c.status === 'PASS').length + '/' + checks.length +
  ' assert ' + (failed ? 'ADA YANG FAIL' : 'PASS'));
process.exit(failed ? 1 : 0);
