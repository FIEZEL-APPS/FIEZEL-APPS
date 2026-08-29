#!/usr/bin/env node
/* app-interaction-policy-test.js — PENEGAK kebijakan interaksi app-like.
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
 * DAN SATU HAL YANG DIJAGA DARI ARAH SEBALIKNYA. Cara termudah "memperbaiki" zoom adalah
 * `user-scalable=no` / `maximum-scale=1`. Itu melanggar WCAG 1.4.4 & 1.4.10 dan mencabut
 * kemampuan murid low-vision membaca sama sekali - persis cacat yang sudah dicabut audit
 * D16/D5-T1. Gerbang ini MEMERAH kalau ada yang mengembalikannya, sehingga perbaikan
 * kenyamanan tidak bisa diam-diam menjadi regresi aksesibilitas.
 *
 * Nol jaringan, nol peramban: ia membaca berkas repo dan MENJALANKAN modul kebijakannya,
 * jadi aman di CI publik.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
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
check('C user-scalable=no TIDAK dikembalikan (WCAG 1.4.4/1.4.10)',
  !/user-scalable\s*=\s*(no|0)/i.test(viewport),
  'mengunci zoom mencabut kemampuan murid low-vision membaca');
const maxScale = Number((/maximum-scale\s*=\s*([0-9.]+)/i.exec(viewport) || [])[1] || 0);
check('C maximum-scale >= 5 (perbesaran nyata masih mungkin)',
  maxScale >= 5, 'maximum-scale=' + (maxScale || 'tidak diset'));

const policy = ada(POLICY) ? baca(POLICY) : '';
check('C modul kebijakan TIDAK memblok pinch/gesture',
  !/addEventListener\(\s*['"](gesturestart|gesturechange|gestureend)['"]/.test(policy),
  'pinch-zoom adalah hak murid, bukan bug');
check('C modul kebijakan TIDAK memblok ctrl+wheel atau Cmd/Ctrl +/-/0',
  !/addEventListener\(\s*['"]wheel['"]/.test(policy) && !/ctrlKey[\s\S]{0,40}preventDefault/.test(policy),
  'zoom desktop juga hak aksesibilitas');
check('C double-tap guard MASIH ada (kalau hilang, cacat lama kembali)',
  /addEventListener\(\s*['"]touchend['"]/.test(policy) && /isDoubleTap/.test(policy));

/* ------------------------------------------------------------------ (D) MENU KONTEKS ---- */
check('D ada kebijakan menu konteks di modul kebijakan',
  /addEventListener\(\s*['"]contextmenu['"]/.test(policy), POLICY);

let Policy = null;
try { Policy = require('./' + POLICY); } catch (e) { check('D modul kebijakan dapat dimuat', false, e.message); }
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
check('E cincin fokus dipasang lewat :focus-visible, bukan :focus telanjang',
  /button:focus-visible\{outline:/.test(css),
  'ini yang mencegah kotak muncul saat murid MENGETUK atau saat fokus dipindah program');
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
