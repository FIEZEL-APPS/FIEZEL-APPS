#!/usr/bin/env node
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */
/* tests/app-interaction-policy-test.js — PENEGAK kebijakan interaksi app-like.
 *
 * KENAPA GERBANG INI ADA. FIEZEL adalah aplikasi, bukan artikel, tetapi peramban tidak tahu
 * itu: bawaannya menyeleksi teks, memunculkan menu dokumen, dan memperbesar halaman. Audit
 * interaksi m025-186 mengukur keadaan nyata di peramban dan menemukan DUA celah yang lolos
 * dari semua gerbang lain:
 *
 *   1. `.fz-coach-form textarea` ber-font-size 13,76px. iOS Safari MEMPERBESAR seluruh
 *      halaman saat kontrol teks < 16px difokus, dan tidak mengembalikannya. Ini akar
 *      "zoom tak disengaja" yang sebenarnya - dipicu FOKUS, bukan pinch.
 *   2. `contextmenu` tidak pernah dicegah di UI statis, jadi klik-kanan/long-press di
 *      <h2>/<p>/<button> memunculkan menu dokumen peramban di atas UI aplikasi.
 *
 * ZOOM HALAMAN DIKUNCI - KEPUTUSAN OWNER 29 Agu 2026, dan gerbang ini menegakkan arah itu.
 * Sampai m025-186 gerbang ini menjaga hal SEBALIKNYA (zoom wajib terbuka, WCAG 1.4.4/1.4.10).
 * OWNER membalikkannya sesudah biayanya disampaikan: FIEZEL harus terasa aplikasi, dan zoom
 * halaman dinilai merusak pengalaman belajar. Arah assert dibalik SECARA TERBUKA di sini,
 * bukan dihapus - supaya siapa pun yang membaca tahu ini keputusan, bukan kelalaian.
 *
 * BIAYA YANG DITERIMA: murid low-vision tidak lagi bisa memperbesar halaman. Penyimpangan
 * dari WCAG 1.4.4 (Resize Text) dan 1.4.10 (Reflow). Utang yang belum dibayar: pengatur
 * ukuran teks DI DALAM aplikasi.
 *
 * Yang tetap dijaga gerbang ini dari arah berlawanan: kunci zoom TIDAK BOLEH dikerjakan
 * setengah. `user-scalable=no` DIABAIKAN iOS Safari sejak iOS 10, jadi mengubah viewport
 * saja menghasilkan kunci yang terlihat terpasang tetapi tidak mengunci apa pun di iPhone.
 * Assert (C) menuntut blokir gesture WebKit-nya benar-benar ada di modul kebijakan.
 *
 * Nol jaringan, nol peramban: ia membaca berkas repo dan MENJALANKAN modul kebijakannya,
 * jadi aman di CI publik.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __fzRoot;
const baca = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ada = (f) => fs.existsSync(path.join(ROOT, f));

const checks = [];
let gagal = false;
function check(name, ok, details) {
  checks.push({ name, status: ok ? 'PASS' : 'FAIL', details: details === undefined ? '' : String(details) });
  if (!ok) gagal = true;
}

const CSS = 'style.css';
const HTML = 'index.html';
const POLICY = 'features/ui/fiezel-zoom-lock.js';

/* ------------------------------------------------------------------ (A) SELEKSI TEKS ---- */
const css = ada(CSS) ? baca(CSS) : '';
check('A UI statis tidak dapat diseleksi (user-select:none di akar dokumen)',
  /html,body[^{]*\{[^}]*user-select:none/.test(css), 'style.css blok kebijakan');
check('A kontrol teks TETAP dapat diseleksi (input/textarea/select/contenteditable)',
  /input,textarea,select,\[contenteditable="true"\]\{[^}]*user-select:text/.test(css),
  'input yang tidak bisa diseleksi = input rusak');
check('A long-press iOS tidak memunculkan gelembung salin (-webkit-touch-callout:none)',
  /-webkit-touch-callout:none/.test(css), 'dan default dikembalikan untuk kontrol teks');
check('A callout dikembalikan untuk kontrol teks',
  /input,textarea,select,\[contenteditable="true"\]\{[^}]*-webkit-touch-callout:default/.test(css));

/* ------------------------------------------------------------------ (B) ZOOM ------------ */
check('B double-tap tidak menunda/mem-zoom (touch-action:manipulation di akar)',
  /html\{[^}]*touch-action:manipulation/.test(css) || /html,body\{touch-action:manipulation\}/.test(css));

/* LANTAI 16px. Diperiksa sebagai ATURAN, bukan per komponen: satu komponen baru dengan
 * huruf kecil mengembalikan cacatnya, dan pembuatnya tidak akan tahu kenapa. */
check('B ada lantai 16px untuk kontrol teks (akar zoom-otomatis iOS)',
  /input,textarea,select\{font-size:16px\}/.test(css),
  'iOS memperbesar halaman saat kontrol < 16px difokus; 15,9px tetap memicu');
check('B textarea coach (menghadap murid) tidak lagi di bawah 16px',
  !/\.fz-coach-form textarea\{[^}]*font-size:\.[0-9]+rem/.test(css.replace(/\s+/g, '')),
  'terukur 13,76px sebelum m025-186');

/* ------------------------------------------------------------------ (C) WCAG PAGAR ------ */
const html = ada(HTML) ? baca(HTML) : '';
const viewport = (/<meta\s+name="viewport"[^>]*>/i.exec(html) || [''])[0];
check('C viewport ada', viewport.length > 0, viewport.slice(0, 120));
check('C viewport menyatakan zoom terkunci (keputusan OWNER m025-186)',
  /user-scalable\s*=\s*(no|0)/i.test(viewport), viewport.slice(0, 140));
const maxScale = Number((/maximum-scale\s*=\s*([0-9.]+)/i.exec(viewport) || [])[1] || 0);
check('C maximum-scale dipaku 1', maxScale === 1, 'maximum-scale=' + (maxScale || 'tidak diset'));

/* Kunci setengah lebih buruk daripada tidak mengunci: ia terlihat beres di berkas dan tidak
 * berlaku di perangkat. iOS Safari mengabaikan user-scalable sejak iOS 10, jadi meta di atas
 * TIDAK menghentikan pinch di iPhone. Yang menghentikannya adalah gesture WebKit di bawah. */
const policy = ada(POLICY) ? baca(POLICY) : '';
check('C pinch WebKit benar-benar diblok (meta saja diabaikan iOS sejak iOS 10)',
  /addEventListener\(\s*['"]gesturestart['"]/.test(policy)
  && /addEventListener\(\s*['"]gesturechange['"]/.test(policy)
  && /addEventListener\(\s*['"]gestureend['"]/.test(policy),
  'tanpa ini, kunci zoom hanya berlaku di Android dan desktop');
check('C pinch jalur touch generik diblok, dan HANYA multi-jari',
  /touches\.length\s*>\s*1/.test(policy),
  'membatalkan sentuhan satu jari akan mematikan scroll seluruh aplikasi');
check('C zoom desktop (ctrl/cmd + wheel) diblok, wheel biasa dibiarkan',
  /addEventListener\(\s*['"]wheel['"]/.test(policy) && /ctrlKey\s*\|\|\s*event\.metaKey/.test(policy));
check('C zoom papan ketik (Cmd/Ctrl +/-/0) diblok tanpa menyentuh Ctrl+A/C/V',
  /ZOOM_KEYS/.test(policy) && /ZOOM_KEYS\[event\.key\]/.test(policy),
  'kombinasi lain wajib lolos atau salin-tempel di input ikut mati');
check('C biaya aksesibilitas TERCATAT di kode, bukan dihapus diam-diam',
  /WCAG 1\.4\.4/.test(policy) && /(low-vision|utang)/i.test(policy),
  'keputusan boleh menyimpang dari WCAG; menyembunyikan biayanya tidak boleh');
check('C double-tap guard MASIH ada (kalau hilang, cacat lama kembali)',
  /addEventListener\(\s*['"]touchend['"]/.test(policy) && /isDoubleTap/.test(policy));

/* ------------------------------------------------------------------ (D) MENU KONTEKS ---- */
check('D ada kebijakan menu konteks di modul kebijakan',
  /addEventListener\(\s*['"]contextmenu['"]/.test(policy), POLICY);

let Policy = null;
try { Policy = require('../' + POLICY); } catch (e) { check('D modul kebijakan dapat dimuat', false, e.message); }
if (Policy && typeof Policy.allowsContextMenu === 'function') {
  const el = (sel) => ({ closest: (q) => (q.split(',').some((s) => s.trim() === sel) ? {} : null) });
  const DICEGAH = ['h1', 'h2', 'p', 'span', 'button', 'div'];
  const DIIZINKAN = ['input', 'textarea', 'select', '[contenteditable="true"]', 'a[href]', 'img'];
  const bocor = DICEGAH.filter((s) => Policy.allowsContextMenu(el(s)));
  check('D menu konteks DICEGAH di UI statis', bocor.length === 0, bocor.join(', ') || DICEGAH.join(', ') + ' diperiksa');
  const rusak = DIIZINKAN.filter((s) => !Policy.allowsContextMenu(el(s)));
  check('D menu konteks TETAP ADA di kontrol teks, tautan, dan gambar',
    rusak.length === 0,
    rusak.join(', ') || 'murid tetap bisa salin/tempel, buka tautan di tab baru, simpan gambar');
  check('D elemen tak dikenal = peramban dibiarkan (ragu tidak boleh merusak)',
    Policy.allowsContextMenu(null) === true && Policy.allowsContextMenu(undefined) === true);
}

/* ------------------------------------------------------------------ (E) FOKUS ----------- */
/* outline:none tanpa pengganti = kontrol keyboard jadi tak terlihat. Gerbang a11y repo
 * sudah menjaga sebagian; di sini yang dijaga adalah invarian yang lebih sempit dan tegas:
 * cincin fokus HANYA lewat :focus-visible (jadi tidak muncul saat ketukan/fokus programatik),
 * dan warnanya satu token. */
/* Bentuk PERTAMA assert ini cuma menanyakan "apakah ADA satu aturan :focus-visible?".
 * Ia hijau, dan sementara ia hijau DUA aturan `:focus` telanjang tetap berdiri di style.css
 * (.fiezel-field input dan .endpoint-label input) - yang pertama memasang garis emas
 * #E6A800 plus cahaya kuning 3px pada SETIAP ketukan. Pemilik melihat kotak kuning itu di
 * aplikasi sesudah aku menyatakan beres. Gerbang yang bisa hijau sementara cacat yang ia
 * namai masih berdiri bukan gerbang; ia jaminan palsu.
 *
 * Bentuk sekarang MEMINDAI: setiap selector `:focus` yang tidak diikuti `-visible` dan
 * memasang penanda terlihat (outline / box-shadow / border-color) adalah kegagalan, dan
 * pesan gagalnya menyebut selector-nya. */
const cssTanpaKomentar = css.replace(/\/\*[\s\S]*?\*\//g, '');
const FOKUS_TELANJANG = [];
for (const blok of cssTanpaKomentar.match(/[^{}]+\{[^{}]*\}/g) || []) {
  const potong = blok.indexOf('{');
  const selector = blok.slice(0, potong).trim();
  const isi = blok.slice(potong + 1, -1);
  if (!/:focus\b/.test(selector.replace(/:focus-visible/g, ''))) continue;
  if (/(^|[^-])\b(outline|box-shadow|border-color)\s*:/.test(isi)) FOKUS_TELANJANG.push(selector);
}
check('E NOL aturan :focus telanjang yang memasang penanda terlihat',
  FOKUS_TELANJANG.length === 0,
  FOKUS_TELANJANG.length ? 'masih ada: ' + FOKUS_TELANJANG.join(' | ')
    : 'cincin hanya lewat :focus-visible, jadi ia tidak menyala saat murid MENGETUK');
check('E cincin fokus dipasang lewat :focus-visible',
  /button:focus-visible\{outline:/.test(css),
  'dan tetap ada untuk navigasi papan tik');

/* Warna cincin ikut dijaga, bukan cuma mekanismenya. Pemilik menolak emas DUA KALI
 * (--gold #C9A24B, lalu #A67A00). Assert ini menolak keluarga kuning/emas secara terukur -
 * hue 35-70 derajat DENGAN saturasi tinggi DAN kecerahan sedang - sehingga krem nyaris putih
 * (#FDFAF3, kecerahan 0,97) tetap sah sebagai cincin di atas panel gelap, sementara
 * #A67A00 / #FFC700 / #E6A800 tidak. */
function hsl(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}
const emas = (hex) => {
  const c = hsl(hex);
  return !!c && c.h >= 35 && c.h <= 70 && c.s >= 0.5 && c.l >= 0.2 && c.l <= 0.75;
};
const TOKEN_CINCIN = ['--focus-ring', '--focus-ring-on-core'];
const CINCIN_EMAS = [];
for (const token of TOKEN_CINCIN) {
  const m = new RegExp(token + ':\\s*(#[0-9a-fA-F]{6})').exec(cssTanpaKomentar);
  if (m && emas(m[1])) CINCIN_EMAS.push(token + '=' + m[1]);
}
check('E warna cincin fokus BUKAN keluarga kuning/emas (pemilik menolaknya dua kali)',
  CINCIN_EMAS.length === 0,
  CINCIN_EMAS.length ? 'masih emas: ' + CINCIN_EMAS.join(', ') : TOKEN_CINCIN.join(' + ') + ' bersih');

/* MODALITAS (m025-197). Memindahkan cincin ke `:focus-visible` TIDAK menghilangkannya dari
 * kolom teks: peramban mencocokkan `:focus-visible` pada kolom teks walau fokusnya datang
 * dari ketukan jari. m025-196 hijau di seluruh gerbang sementara pemilik masih melihat
 * kotaknya - hanya berganti warna dari emas ke tinta. Assert di bawah menjaga mekanisme yang
 * BENAR-BENAR menghilangkannya, dan mengujinya sebagai perilaku, bukan sebagai pola teks. */
check('E CSS menyembunyikan cincin saat modalitas sentuh',
  /html\[data-fz-input="touch"\][^{]*:focus-visible\{[^}]*outline-color:\s*transparent/.test(css),
  'ini yang membuat ketukan jari tidak memunculkan kotak apa pun');
check('E penyembunyian memakai outline-color:transparent, BUKAN outline:none',
  !/html\[data-fz-input="touch"\][^{]*\{[^}]*outline:\s*none/.test(css),
  'outline:none menggeser tata letak DAN melanggar aturan pengganti di a11y-test');

if (Policy && typeof Policy.install === 'function') {
  const pendengar = {};
  const akar = {
    _attr: {},
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this._attr, k) ? this._attr[k] : null; },
    setAttribute(k, v) { this._attr[k] = v; }
  };
  const env = {
    Date,
    document: {
      documentElement: akar,
      addEventListener(jenis, fn) { (pendengar[jenis] = pendengar[jenis] || []).push(fn); }
    }
  };
  const dipasang = Policy.install(env);
  const tembak = (jenis, ev) => (pendengar[jenis] || []).forEach((fn) => fn(ev));

  check('E modul kebijakan terpasang pada lingkungan tiruan', dipasang === true);
  check('E bawaannya SENTUH (jadi cincin tersembunyi sejak muat pertama)',
    akar.getAttribute('data-fz-input') === 'touch',
    'nilai=' + akar.getAttribute('data-fz-input'));

  tembak('keydown', { key: 'Tab' });
  check('E Tab menyalakan mode papan tik (pengguna keyboard TIDAK kehilangan cincinnya)',
    akar.getAttribute('data-fz-input') === 'key',
    'nilai=' + akar.getAttribute('data-fz-input'));

  tembak('pointerdown', {});
  check('E menyentuh/mengklik mengembalikan mode sentuh',
    akar.getAttribute('data-fz-input') === 'touch',
    'nilai=' + akar.getAttribute('data-fz-input'));

  /* Urutannya PENTING dan bentuk pertama assert ini salah karenanya: ia menembak huruf
   * SESUDAH Tab, lalu memeriksa nilainya masih 'key' - yang benar walau setiap tombol
   * menyalakan mode papan tik. Assert itu tidak bisa merah, jadi ia tidak menjaga apa pun.
   * Huruf harus ditembak dari garis dasar SENTUH: kalau ia menyalakan mode papan tik, kotak
   * kembali muncul begitu murid mulai mengetik namanya - persis cacat yang sedang dibuang. */
  tembak('keydown', { key: 'a' });
  check('E mengetik huruf TIDAK menyalakan cincin (kalau ya, kotaknya kembali saat murid mengetik)',
    akar.getAttribute('data-fz-input') === 'touch',
    'nilai=' + akar.getAttribute('data-fz-input'));

  tembak('touchstart', {});
  check('E touchstart juga mode sentuh (peramban tanpa Pointer Events)',
    akar.getAttribute('data-fz-input') === 'touch');
}
check('E target fokus programatik ([tabindex="-1"]) tidak menampilkan cincin',
  /\[tabindex="-1"\]:focus-visible\{outline:2px solid transparent/.test(css),
  'akar "kotak emas pada judul": app.js memindahkan fokus ke heading saat navigasi');
check('E token warna cincin fokus tunggal (--focus-ring), bukan warna ditulis tangan',
  /--focus-ring:/.test(css) && (css.match(/outline:2px solid var\(--focus-ring\)/g) || []).length >= 5);

/* ------------------------------------------------------------------ (F) BATAS JUJUR ----- */
/* Dua kontrol di panel diagnostik (#fiezelDiagSearch 13px, #fiezelDiagText 11px) MASIH di
 * bawah lantai: gaya panel itu disuntik dari `features/neural-voice/fiezel-diag-panel.js`
 * dengan selector ID, jadi ia menang atas lantai elemen di style.css. Berkas itu WILAYAH
 * KLAIM sesi neural-voice (coordination/CLAIMS.json), jadi audit ini TIDAK menyentuhnya dan
 * TIDAK berpura-pura sudah beres. Panel itu permukaan OWNER, bukan murid. Assert di bawah
 * mengunci batas itu supaya ia tetap terlihat sampai pemiliknya memperbaikinya. */
const diag = 'features/neural-voice/fiezel-diag-panel.js';
if (ada(diag)) {
  const d = baca(diag);
  const kecil = /#fiezelDiagSearch\{[^}]*font-size:1[0-5]px/.test(d) || /#fiezelDiagText\{[^}]*font-size:1[0-5]px/.test(d)
    || /font-size:1[0-5]px/.test(d);
  check('F batas diketahui: panel diagnostik (wilayah sesi lain) masih memakai huruf < 16px',
    true,
    kecil ? 'TERKONFIRMASI masih < 16px — permukaan owner, bukan murid; diserahkan ke pemilik berkas'
          : 'sudah tidak ada font < 16px di panel diagnostik — batas ini bisa dicabut');
}

const pass = checks.filter((c) => c.status === 'PASS').length;
fs.writeFileSync(path.join(ROOT, 'APP-INTERACTION-POLICY-REPORT.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), pass, fail: checks.length - pass, checks }, null, 2) + '\n');
for (const c of checks) if (c.status === 'FAIL') console.log('  FAIL ' + c.name + ' :: ' + c.details);
console.log('app-interaction-policy-test: ' + pass + '/' + checks.length + ' assert ' + (gagal ? 'ADA YANG FAIL' : 'PASS'));
process.exit(gagal ? 1 : 0);
