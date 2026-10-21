/**
 * tests/friend-qr-contract-test.js
 * Gerbang Kontrak Generator Kode QR SVG MURNI (features/social/fiezel-qr.js).
 *
 * KENAPA GERBANG INI ADA. Fitur pertemanan ala LINE memakai Kode QR profil agar teman
 * bisa memindai langsung dari layar. Brief owner melarang pustaka pihak ketiga yang berat,
 * jadi FiezelQr ditulis sendiri. Tetapi "murni" TIDAK boleh berarti "tidak terverifikasi":
 * gerbang ini membandingkan matriks modul yang dihasilkan FiezelQr dengan matriks yang
 * dihasilkan qrcode.min.js pihak ketiga yang sudah terbukti benar dan memang ada di repo
 * ini (tools/fiezel-drop/public/qrcode.min.js) — MODUL DEMI MODUL, untuk seluruh versi
 * 1..10 dan seluruh level koreksi galat L/M/Q/H.
 *
 * Karena pustaka pihak ketiga memaksa versi minimum (bukan versi yang diminta), matriks
 * acuan dibaca dengan typeNumber dipaksa ke versi pilihan FiezelQr lewat satu penambalan
 * sumber yang sempit dan diperiksa ketat di bawah. Bila penambalan gagal (pustaka berubah
 * bentuk), gerbang GAGAL TERANG, bukan lulus diam-diam.
 *
 * Berkas ini hidup di repo-root tests/ dan hanya butuh Node + fs (tanpa DOM): pustaka
 * pihak ketiga dijalankan di atas DOM tiruan kecil.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const __fzRoot = path.join(__dirname, '..');

const results = [];
let failures = 0;
function assert(condition, message) {
  results.push({ ok: !!condition, message });
  if (!condition) { failures += 1; console.error(`  FAIL: ${message}`); }
  else console.log(`  PASS: ${message}`);
}

// --------------------------------------------------------------- muat FiezelQr
const qrSrc = fs.readFileSync(path.join(__fzRoot, 'features/social/fiezel-qr.js'), 'utf8');
const qrRoot = {};
new Function('self', qrSrc)(qrRoot);
const Qr = qrRoot.FiezelQr;

assert(Qr && typeof Qr.matrix === 'function' && typeof Qr.svg === 'function' && typeof Qr.dataUrl === 'function',
  'FiezelQr terpasang dengan API matrix()/svg()/dataUrl()');

// --------------------------------------------------------------- DOM tiruan + pustaka acuan
function fakeNode() {
  return {
    setAttribute() {}, setAttributeNS() {}, appendChild() {}, childNodes: [],
    offsetWidth: 0, offsetHeight: 0, style: {}, innerHTML: '',
    hasChildNodes() { return false; }, removeChild() {},
    getContext() { return { fillRect() {}, strokeRect() {}, clearRect() {} }; }
  };
}
const fakeDoc = {
  documentElement: { tagName: 'svg' },
  createElementNS: () => fakeNode(),
  createElement: () => fakeNode(),
  getElementById: () => fakeNode()
};

const libPath = path.join(__fzRoot, 'tools/fiezel-drop/public/qrcode.min.js');
assert(fs.existsSync(libPath), 'pustaka acuan qrcode.min.js ada di repo (sumber pembanding)');
let lib = fs.readFileSync(libPath, 'utf8');
/* Penambalan sempit: paksa typeNumber yang diminta alih-alih versi minimum pilihan pustaka.
   Kalau pola ini tidak ada, pustaka berubah bentuk dan gerbang harus tahu — bukan membandingkan
   dua versi berbeda lalu gagal dengan pesan yang menyesatkan. */
const NEEDLE = 'new b(r(a,this._htOption.correctLevel),this._htOption.correctLevel)';
const PATCHED = 'new b(this._htOption.typeNumber||r(a,this._htOption.correctLevel),this._htOption.correctLevel)';
assert(lib.indexOf(NEEDLE) >= 0, 'pola paksa-visi pustaka acuan ditemukan (penambalan tidak buta)');
lib = lib.replace(NEEDLE, PATCHED);
const QRCodeLib = new Function('document', 'navigator', 'window', lib + '\n;return QRCode;')(fakeDoc, { userAgent: 'node' }, {});

function refMatrix(text, levelChar, forceType) {
  const el = fakeNode();
  const opts = { text, correctLevel: QRCodeLib.CorrectLevel[levelChar] };
  if (forceType) opts.typeNumber = forceType;
  const q = new QRCodeLib(el, opts);
  const qr = q._oQRCode;
  const n = qr.getModuleCount();
  const m = [];
  for (let r = 0; r < n; r++) { m.push([]); for (let c = 0; c < n; c++) m[r][c] = qr.isDark(r, c) ? 1 : 0; }
  return { size: n, modules: m };
}
function diffCount(a, b) {
  if (a.size !== b.size) return -1;
  let d = 0;
  for (let r = 0; r < a.size; r++) for (let c = 0; c < a.size; c++) if (a.modules[r][c] !== b.modules[r][c]) d++;
  return d;
}

console.log('\n--- [GERBANG 1] Matriks FiezelQr identik dengan acuan, versi 1..10 x level L/M/Q/H ---');
{
  const text = 'FIEZEL';
  const levels = ['L', 'M', 'Q', 'H'];
  let total = 0, exact = 0;
  const mismatch = [];
  for (let v = 1; v <= 10; v++) for (const level of levels) {
    total++;
    try {
      const mine = Qr.matrix(text, { level, version: v });
      const ref = refMatrix(text, level, v);
      const d = diffCount(mine, ref);
      if (d === 0) exact++;
      else mismatch.push(`v${v}/${level}(diff=${d})`);
    } catch (e) { mismatch.push(`v${v}/${level}: ${e.message}`); }
  }
  assert(exact === total, `seluruh ${total} kombinasi versi x level identik modul demi modul (${exact}/${total})` + (mismatch.length ? ` — beda: ${mismatch.slice(0, 6).join(', ')}` : ''));
}

console.log('\n--- [GERBANG 2] URL undangan pertemanan nyata identik dengan acuan ---');
{
  const urls = [
    'https://fiezel.my.id/app/?friend=@ria',
    'https://fiezel.my.id/app/?friend=@murid17',
    'https://fiezel.my.id/app/?friend=@nama_samaran_panjang_123',
    'https://fiezel.my.id/app/?friend=@budi_santoso'
  ];
  let exact = 0;
  for (const url of urls) {
    const mine = Qr.matrix(url, { level: 'M' });
    const ref = refMatrix(url, 'M', mine.version);
    if (diffCount(mine, ref) === 0) exact++;
  }
  assert(exact === urls.length, `seluruh ${urls.length} URL ?friend= identik dengan acuan (${exact}/${urls.length})`);
}

console.log('\n--- [GERBANG 3] Struktur standar: finder, timing, modul gelap, ukuran ---');
{
  const m = Qr.matrix('https://fiezel.my.id/app/?friend=@ria', { level: 'M' });
  const n = m.size;
  assert(n === m.version * 4 + 17, 'ukuran matriks = versi x 4 + 17');

  function finder(row, col) { // 7x7 finder: cincin gelap, inti 3x3 gelap, cincin dalam terang
    const want = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1]
    ];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (m.modules[row + r][col + c] !== want[r][c]) return false;
    return true;
  }
  assert(finder(0, 0), 'pola finder kiri-atas benar');
  assert(finder(0, n - 7), 'pola finder kanan-atas benar');
  assert(finder(n - 7, 0), 'pola finder kiri-bawah benar');
  assert(m.modules[n - 8][8] === 1, 'modul gelap tetap (n-8,8) terpasang');

  let timingOk = true;
  for (let i = 8; i < n - 8; i++) {
    if (m.modules[6][i] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
    if (m.modules[i][6] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
  }
  assert(timingOk, 'pola timing baris/kolom 6 bergantian benar');
}

console.log('\n--- [GERBANG 4] Keluaran SVG: zona hening, crispEdges, aria, data URL ---');
{
  const svg = Qr.svg('https://fiezel.my.id/app/?friend=@ria', { level: 'M', label: 'QR @ria', px: 320 });
  assert(/^<svg[\s>]/.test(svg) && /<\/svg>$/.test(svg), 'SVG terbuka dan tertutup benar');
  assert(svg.indexOf('xmlns="http://www.w3.org/2000/svg"') >= 0, 'SVG punya namespace standar');
  assert(svg.indexOf('shape-rendering="crispEdges"') >= 0, 'modul tetap tajam (crispEdges)');
  assert(svg.indexOf('aria-label="QR @ria"') >= 0, 'aria-label diteruskan apa adanya');
  assert(svg.indexOf('fill="#111111"') >= 0 && svg.indexOf('fill="#ffffff"') >= 0, 'warna QR gelap di atas terang (kontras)');
  /* viewBox harus memuat zona hening 4 modul di kedua sisi. */
  const mm = Qr.matrix('https://fiezel.my.id/app/?friend=@ria', { level: 'M' });
  const expectVB = `viewBox="0 0 ${mm.size + 8} ${mm.size + 8}"`;
  assert(svg.indexOf(expectVB) >= 0, `zona hening 4 modul hadir (${expectVB})`);
  /* Escaping label: tanda kutip tidak boleh memutus atribut. */
  const esc = Qr.svg('X', { label: 'a"b<c>&d' });
  assert(esc.indexOf('aria-label="a&quot;b&lt;c&gt;&amp;d"') >= 0, 'label dengan kutip/tanda dibersihkan (anti-injeksi atribut)');
  const du = Qr.dataUrl('FIEZEL');
  assert(du.indexOf('data:image/svg+xml;charset=utf-8,') === 0 && decodeURIComponent(du.slice('data:image/svg+xml;charset=utf-8,'.length)).indexOf('<svg') === 0,
    'dataUrl menghasilkan data URL SVG yang bisa dibalik ke <svg>');
}

console.log('\n--- [GERBANG 5] UTF-8 & batas versi jujur ---');
{
  const bytes = Qr.utf8('@thai-ทดสอบ-ไทย');
  assert(bytes.length === 31, 'UTF-8 multi-byte dihitung per byte (31), bukan per karakter');
  let threw = false;
  try { Qr.matrix('x'.repeat(300), { level: 'H' }); } catch (_) { threw = true; }
  assert(threw, 'muatan melebihi versi 10 DITOLAK dengan jelas, bukan dipotong diam-diam');
}

const total = results.length;
if (failures) {
  console.error(`\nFIEZEL friend QR contract: GAGAL — ${failures}/${total} assert merah`);
  process.exit(1);
}
console.log(`\nFIEZEL friend QR contract: LULUS — ${total}/${total} assert hijau`);