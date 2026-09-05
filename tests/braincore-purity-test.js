// tests/braincore-purity-test.js — modul Braincore wajib MURNI, dan itu diperiksa, bukan dijanjikan.
//
// KENAPA GERBANG INI ADA
// ----------------------
// Seluruh kontrak Braincore v3 berdiri di atas satu sifat: keputusan brain adalah FUNGSI
// dari argumennya. Input sama -> output sama, selalu. Sifat itu yang membuat 21 modul di
// `features/brain/` bisa diuji, bisa disimulasikan (adaptivity-simulation-v3), dan bisa
// dibantah dengan angka alih-alih dengan pendapat.
//
// Sifat itu juga yang paling gampang bocor tanpa ada yang sadar. Satu `Date.now()` yang
// diselipkan ke dalam penjadwal memori mengubah gerbang FSRS menjadi bom waktu: hijau hari
// ini, merah tiga hari lagi, tanpa satu baris kode pun berubah. Ini BUKAN skenario
// hipotetis — `tests/social-frontend-test.js` merah persis begitu (satu-satunya fungsi outbox
// yang memanggil `Date.now()` sendiri alih-alih menerima `nowMs`), dan butuh pembongkaran
// untuk menemukan penyebabnya. Satu `Math.random()` melakukan hal yang lebih buruk: ia
// membuat kegagalan tidak bisa direproduksi sama sekali.
//
// Header tiap modul sudah MENJANJIKAN kemurnian itu dengan kalimat yang enak dibaca.
// Janji di komentar tidak menghentikan apa pun. Gerbang ini yang menghentikannya.
//
// YANG DILARANG, DAN ALASANNYA SATU PER SATU
// ------------------------------------------
//   Math.random     - keputusan tidak bisa direproduksi; bug tidak bisa dikejar. RNG harus
//                     di-seed dan dioper sebagai argumen, sehingga jejaknya bisa diputar ulang.
//   Date.now        - jam tersembunyi. Waktu SELALU argumen (`nowMs`), sehingga gerbang bisa
//                     membekukan waktunya dan simulasi bisa memajukannya.
//   new Date()      - bentuk lain dari jam tersembunyi yang sama.
//   document/window - modul brain berjalan di Worker dan di Node (gerbang + simulator).
//                     Menyentuh DOM berarti modul mati di dua dari tiga tempat ia dipakai.
//   localStorage    - state dioper masuk dan dikembalikan sebagai nilai. Modul yang menulis
//                     storage sendiri tidak bisa diuji tanpa memalsukan storage, dan tidak
//                     bisa dipakai dua kali dalam satu proses tanpa saling menimpa.
//   fetch/XHR/WS    - nol biaya runtime adalah kendala keras produk ini: tidak ada model
//                     neural cloud di jalur keputusan. Panggilan jaringan di modul brain
//                     melanggarnya secara harfiah, dan membuat sesi offline kehilangan otaknya.
//
// CARA MEMBACANYA (penting supaya gerbang ini tidak dimatikan orang)
// -----------------------------------------------------------------
// Pemindai naif atas teks mentah akan MERAH pada hari pertama: header modul-modul ini
// memang menyebut "tidak pernah memanggil Date.now()" dan "tanpa Math.random" sebagai
// dokumentasi kontraknya. Gerbang yang menghukum kalimat itu adalah gerbang yang akan
// dimatikan, dan gerbang yang dimatikan tidak melindungi apa pun.
//
// Karena itu berkas ini memakai lexer kecil (pola `tests/id-golden-snapshot-test.js`) yang
// membuang komentar dan ISI string literal lebih dulu, lalu mencari pola hanya pada KODE.
// Konsekuensinya juga disengaja: menulis `root['Date']['now']` tidak akan lolos, karena
// nama propertinya muncul sebagai string dan lexer menghapusnya menjadi spasi — sehingga
// `root[ ][ ]` tetap tidak cocok dengan pola apa pun, tetapi juga tidak bisa dipakai untuk
// menyembunyikan panggilan. Itulah sebabnya assert ke-2 di bawah ada: ia membuktikan lexer
// benar-benar memisahkan komentar dari kode, dengan kasus uji yang dibawa sendiri.
//
// Nol dependency, nol jaringan, nol berkas temporer.
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const BRAIN_DIR = path.join(ROOT, 'features', 'brain');

let failed = 0;
const check = (name, ok, detail) => {
  if (ok) { console.log('  ok   ' + name); return; }
  failed++;
  console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
};

/**
 * Buang komentar dan isi string literal; sisakan kode.
 * Setiap string diganti SATU spasi supaya posisi token di sekitarnya tidak menempel
 * (`a+"x"+b` tidak boleh berubah menjadi `a++b` yang menyesatkan pola lain).
 */
function stripCommentsAndStrings(src) {
  let out = '', i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const j = src.indexOf('\n', i); if (j < 0) break; i = j; continue; }
    if (c === '/' && d === '*') { const j = src.indexOf('*/', i + 2); if (j < 0) break; i = j + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c; let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === quote) break;
        j++;
      }
      out += ' '; i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

// Pola terlarang. Ditulis longgar terhadap spasi (`Date . now`) supaya tidak bisa dilewati
// dengan pemformatan.
const FORBIDDEN = [
  ['Math.random', /\bMath\s*\.\s*random\b/g, 'RNG harus di-seed dan dioper sebagai argumen'],
  ['Date.now', /\bDate\s*\.\s*now\b/g, 'waktu harus dioper sebagai argumen nowMs'],
  ['new Date()', /\bnew\s+Date\s*\(\s*\)/g, 'jam tersembunyi; pakai argumen nowMs'],
  ['document.*', /\bdocument\s*\./g, 'modul brain juga berjalan di Worker dan Node'],
  ['window.*', /\bwindow\s*\./g, 'modul brain juga berjalan di Worker dan Node'],
  ['localStorage', /\blocalStorage\b/g, 'state dioper masuk dan dikembalikan sebagai nilai'],
  ['sessionStorage', /\bsessionStorage\b/g, 'idem localStorage'],
  ['indexedDB', /\bindexedDB\b/g, 'idem localStorage'],
  ['fetch(', /\bfetch\s*\(/g, 'nol biaya runtime: tidak ada panggilan jaringan di jalur keputusan'],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/g, 'idem fetch'],
  ['WebSocket', /\bWebSocket\b/g, 'idem fetch'],
  ['sendBeacon', /\bsendBeacon\b/g, 'idem fetch'],
  ['importScripts', /\bimportScripts\s*\(/g, 'pemuatan dinamis = ketergantungan runtime tersembunyi']
];

console.log('braincore-purity-test');

// ---------------------------------------------------------------------------------------
// 1. Daftar modul tidak boleh kosong / menyusut diam-diam.
// Gerbang yang memindai nol berkas selalu hijau. Ambangnya ditulis sebagai angka supaya
// modul yang terhapus tanpa keputusan sadar terlihat sebagai merah, bukan sebagai sunyi.
// ---------------------------------------------------------------------------------------
const modules = fs.existsSync(BRAIN_DIR)
  ? fs.readdirSync(BRAIN_DIR).filter(n => n.endsWith('.js')).sort()
  : [];
const MIN_MODULES = 21;
check('folder features/brain berisi modul (>= ' + MIN_MODULES + ')',
  modules.length >= MIN_MODULES,
  'ditemukan ' + modules.length + ' modul; kalau ada yang sengaja dihapus, turunkan MIN_MODULES di commit yang sama');

// ---------------------------------------------------------------------------------------
// 2. Lexer-nya sendiri dibuktikan, bukan dipercaya.
// Tanpa assert ini, lexer yang rusak (mis. membuang seluruh berkas) membuat SEMUA modul
// tampak murni dan gerbang ini menjadi hijau permanen yang tidak menguji apa pun.
// ---------------------------------------------------------------------------------------
const probe = [
  '// Math.random di komentar baris — harus DIABAIKAN',
  '/* Date.now di komentar blok — harus DIABAIKAN */',
  'var pesan = "jangan panggil localStorage di sini"; // string — harus DIABAIKAN',
  'var nyata = Math.random();'
].join('\n');
const probeCode = stripCommentsAndStrings(probe);
check('lexer membuang komentar dan string, tetapi TIDAK membuang kode',
  !/localStorage/.test(probeCode)
    && (probeCode.match(/Math\s*\.\s*random/g) || []).length === 1
    && !/Date\s*\.\s*now/.test(probeCode),
  'hasil lexer: ' + JSON.stringify(probeCode.replace(/\s+/g, ' ').trim()));

// ---------------------------------------------------------------------------------------
// 3. Pemindaian sesungguhnya.
// ---------------------------------------------------------------------------------------
const violations = [];
for (const name of modules) {
  const src = fs.readFileSync(path.join(BRAIN_DIR, name), 'utf8');
  const code = stripCommentsAndStrings(src);
  for (const [label, re, why] of FORBIDDEN) {
    re.lastIndex = 0;
    const hits = code.match(re);
    if (hits) violations.push(`${name}: ${label} x${hits.length} (${why})`);
  }
}
check('nol Math.random / Date.now / DOM / storage / jaringan di ' + modules.length + ' modul brain',
  violations.length === 0,
  violations.slice(0, 12).join(' | '));

// ---------------------------------------------------------------------------------------
// 4. Kemurnian tanpa jam yang bisa dioper hanya memindahkan masalahnya: modul yang tidak
// pernah menerima waktu tidak bisa menjadwalkan apa pun. Jadi mesin yang MEMANG bergantung
// pada waktu wajib menerimanya sebagai argumen bernama.
// ---------------------------------------------------------------------------------------
const TIME_AWARE = [
  'fiezel-core-brain.js',
  'fiezel-misconception-ledger.js',
  'fiezel-mastery-bkt.js',
  'fiezel-retention-probe.js'
];
// DUA EJAAN yang sah, dan keduanya diterima dengan sadar:
//   `nowMs`     - parameter posisional (ledger, BKT, retention probe)
//   `opts.now`  - field di objek opsi (core-brain: `resolveNow(opts.now, ...)`)
// Yang ditagih di sini BUKAN nama variabelnya melainkan sifatnya: jam masuk lewat
// ARGUMEN, bukan diambil sendiri dari lingkungan. Menyempitkannya ke satu ejaan akan
// membuat gerbang ini merah pada modul yang justru sudah benar — dan gerbang yang merah
// karena alasan salah adalah gerbang yang akan dilonggarkan orang sampai tidak berarti.
// Larangan `Date.now`/`new Date()` di atas yang menutup pintu satunya lagi: sebuah modul
// tidak bisa lulus keduanya sambil diam-diam membaca jam sistem.
const CLOCK_ARG = /\bnowMs\b|\bopts\s*\.\s*now\b|\bresolveNow\s*\(/;
const noClockArg = TIME_AWARE.filter(name => {
  const file = path.join(BRAIN_DIR, name);
  if (!fs.existsSync(file)) return true;
  return !CLOCK_ARG.test(stripCommentsAndStrings(fs.readFileSync(file, 'utf8')));
});
check('mesin yang bergantung waktu menerima jamnya lewat argumen (nowMs / opts.now)',
  noClockArg.length === 0,
  'tanpa jalur jam ber-argumen di kode: ' + noClockArg.join(', '));

console.log(failed === 0
  ? `\nFIEZEL braincore purity: PASS (${modules.length} modul murni)`
  : `\nFIEZEL braincore purity: FAIL (${failed} pemeriksaan merah)`);
process.exit(failed === 0 ? 0 : 1);
