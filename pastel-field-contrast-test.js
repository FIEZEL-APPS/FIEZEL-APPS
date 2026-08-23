#!/usr/bin/env node
/**
 * m025-117 gerbang bidang pastel.
 *
 * KENAPA BERKAS INI ADA. Ini keluhan kontras KETIGA berturut-turut dari OWNER:
 * m025-85, m025-113, lalu m025-116. Ketiganya bentuknya identik, dan itulah yang membuat
 * berkas ini perlu ada - bukan warnanya yang salah, melainkan satu pola yang terus lolos:
 *
 *   Sebuah bidang memakai token yang TIDAK punya pasangan gelap, sehingga ia tetap
 *   terang di mode gelap. Tinta di atasnya diwarisi dari halaman, dan tinta ITU punya
 *   pasangan gelap, sehingga ia berbalik menjadi terang juga.
 *
 *   Hasilnya terang di atas terang. Di m025-116 ada lima permukaan seperti itu, dan yang
 *   terparah 1,01:1 - benar-benar tidak terlihat.
 *
 * contrast-test.js yang sudah ada memeriksa PASANGAN WARNA yang sudah diketahui. Ia tidak
 * bisa menangkap pola ini karena masalahnya bukan pada satu pasangan, melainkan pada
 * bidang dan tinta yang mengambil keputusan gelap-terang dari sumber yang BERBEDA.
 *
 * ATURAN YANG DIJAGA:
 *   Bila sebuah aturan memasang background dari token yang tidak punya pasangan gelap,
 *   maka tinta di atasnya juga harus tidak berbalik - dipasang eksplisit ke token beku
 *   (--ink), ke literal, atau diwarisi dari aturan dasar yang melakukannya.
 *
 * Bidang pastel PEKAT (--yellow, --coral) memang sengaja beku: ia selalu berpasangan
 * dengan --ink coklat di kedua tema, persis seperti tombol chunky. Yang tidak boleh beku
 * adalah bidang LEMBUT yang menampung teks biasa.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CSS = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
const LINES = CSS.split('\n');

let pass = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name + ': ' + e.message); console.log('FAIL - ' + name + ': ' + e.message); }
}

/** Mengambil satu blok CSS utuh mulai dari baris tertentu (1-indexed). */
function blockAt(start) {
  let depth = 0, out = [];
  for (let i = start - 1; i < LINES.length; i++) {
    depth += (LINES[i].match(/{/g) || []).length;
    depth -= (LINES[i].match(/}/g) || []).length;
    out.push(LINES[i]);
    if (depth <= 0 && out.length > 1) break;
  }
  return out.join('\n');
}

function declarations(text) {
  const out = {}, re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(text))) out[m[1]] = m[2].trim();
  return out;
}

/** Token tema terang: gabungan SEMUA blok :root, karena style.css punya lebih dari satu. */
function lightTokens() {
  let out = {};
  LINES.forEach((line, i) => {
    if (/^:root\s*{/.test(line)) out = { ...out, ...declarations(blockAt(i + 1)) };
  });
  return out;
}

/** Token tema gelap: media query preferensi sistem DAN atribut data-theme manual. */
function darkTokens() {
  const blocks = [];
  LINES.forEach((line, i) => {
    if (/prefers-color-scheme:\s*dark/.test(line) || /:root\[data-theme="dark"\]\s*{/.test(line)) {
      blocks.push(blockAt(i + 1));
    }
  });
  return declarations(blocks.join('\n'));
}

const LIGHT = lightTokens();
const DARK = darkTokens();
const isColor = (v) => /#[0-9a-f]{3,8}\b|rgba?\(/i.test(String(v || ''));

function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const c = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * Bidang yang boleh beku, beserta alasannya. Setiap entri di sini adalah keputusan
 * desain yang sadar, bukan kelalaian - dan harus tetap begitu.
 */
const FROZEN_BY_DESIGN = {
  '--yellow': 'bidang CTA chunky; selalu berpasangan dengan --ink coklat di kedua tema',
  '--yellow-deep': 'bayangan tombol dan bidang hover CTA; tintanya diwarisi --ink, 7,93:1',
  '--coral': 'bidang aksi kedua; selalu berpasangan dengan --ink coklat di kedua tema',
  '--coral-deep': 'hanya bayangan tombol, tidak pernah menampung teks',
  '--mint': 'pembeda skill, dipakai sebagai isian ikon bukan bidang teks',
  '--lilac': 'pembeda skill, dipakai sebagai isian ikon bukan bidang teks',
  '--teal-pastel': 'pembeda skill, dipakai sebagai isian ikon bukan bidang teks',
  '--ink': 'tinta coklat yang memang harus tetap coklat di atas bidang pastel',
  '--accent-on-glass': 'alias, bukan warna tersendiri'
};

/**
 * Aturan yang bidangnya beku TETAPI tidak menampung teks sama sekali. Statis tidak bisa
 * membedakan bidang berteks dari bidang berisi SVG, jadi pengecualiannya ditulis dengan
 * alasannya supaya bisa ditinjau, bukan disembunyikan.
 */
const NO_TEXT_INSIDE = {
  '.fz-coach-avatar': 'lingkaran wajah pembimbing; isinya SVG, tidak pernah teks'
};

/** Aturan yang mewarisi tinta beku dari aturan dasarnya. */
const INHERITS_FROZEN_INK = {
  '.primary.is-coral': 'mewarisi color:var(--ink) dari button.primary',
  '.primary.is-coral:hover': 'mewarisi color:var(--ink) dari button.primary',
  '.primary.is-coral:active': 'mewarisi color:var(--ink) dari button.primary',
  // m025-120: hover CTA menggelapkan bidangnya saja; tintanya tetap --ink dari aturan
  // dasar .primary / .auth-primary, yang beku di kedua tema (7,93:1).
  '.primary:hover': 'mewarisi color:var(--ink) dari .primary',
  '.auth-gate .auth-primary:hover': 'mewarisi color:var(--ink) dari .auth-gate .auth-primary'
};

test('style.css punya lebih dari satu blok :root, dan tes ini membaca semuanya', () => {
  // Ini bukan gaya - inilah yang membuat bug palet terus lolos. Blok kedua menang, tetapi
  // seluruh palet pastel justru hanya hidup di blok pertama. Siapa pun yang mengubah palet
  // harus menyentuh keduanya, dan tes ini harus membaca keduanya.
  const roots = LINES.filter((l) => /^:root\s*{/.test(l)).length;
  if (roots < 2) throw new Error('struktur berubah: hanya ' + roots + ' blok :root ditemukan');
  if (!LIGHT['--yellow'] || !LIGHT['--panel']) {
    throw new Error('penggabungan blok :root gagal; token dari salah satu blok hilang');
  }
});

test('setiap bidang pastel lembut punya pasangan gelap', () => {
  const soft = ['--cream', '--cream-deep', '--yellow-soft', '--coral-soft', '--mint-soft', '--lilac-soft'];
  const missing = soft.filter((k) => LIGHT[k] && !DARK[k]);
  if (missing.length) {
    throw new Error('beku di mode gelap: ' + missing.join(', ')
      + ' — bidangnya tetap terang sementara tintanya berbalik, dan itu bug m025-113 lagi');
  }
});

test('token warna beku hanya yang memang disengaja', () => {
  const frozen = Object.keys(LIGHT).filter((k) => isColor(LIGHT[k]) && !DARK[k]);
  const unexpected = frozen.filter((k) => !FROZEN_BY_DESIGN[k]);
  if (unexpected.length) {
    throw new Error('token warna tanpa pasangan gelap dan tanpa alasan tertulis: '
      + unexpected.join(', ') + ' — beri pasangan gelap, atau daftarkan alasannya di FROZEN_BY_DESIGN');
  }
});

test('bidang beku tidak pernah dipasangkan tinta yang berbalik', () => {
  const frozenColorTokens = Object.keys(LIGHT).filter((k) => isColor(LIGHT[k]) && !DARK[k]);
  const flippingInk = Object.keys(DARK);
  const offenders = [];

  for (const chunk of CSS.split('}')) {
    const parts = chunk.split('{');
    if (parts.length < 2) continue;
    if (/prefers-color-scheme|data-theme="dark"/.test(chunk)) continue;

    const selector = (parts[0].split('\n').filter((x) => x.trim()).pop() || '').trim();
    const body = parts[1];
    const bg = /(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/.exec(body);
    if (!bg) continue;
    const bgToken = (bg[1].match(/--[a-z0-9-]+/) || [])[0];
    if (!bgToken || !frozenColorTokens.includes(bgToken)) continue;

    if (NO_TEXT_INSIDE[selector] || INHERITS_FROZEN_INK[selector]) continue;

    const fg = /(?:^|[;\s])color\s*:\s*([^;]+)/.exec(body);
    if (!fg) { offenders.push(selector + ' (bg ' + bgToken + ', tinta diwarisi)'); continue; }
    const fgToken = (fg[1].match(/--[a-z0-9-]+/) || [])[0];
    if (fgToken && flippingInk.includes(fgToken)) {
      offenders.push(selector + ' (bg ' + bgToken + ' beku, tinta ' + fgToken + ' berbalik)');
    }
  }

  if (offenders.length) {
    throw new Error(offenders.length + ' permukaan terang-di-atas-terang di mode gelap:\n    '
      + offenders.join('\n    '));
  }
});

test('tinta coklat tetap terbaca di atas setiap bidang pastel pekat', () => {
  const ink = (LIGHT['--ink'] || '').match(/#[0-9a-f]{3,8}/i);
  if (!ink) throw new Error('--ink tidak ditemukan');
  const fields = ['--yellow', '--coral', '--mint', '--lilac', '--teal-pastel'];
  const weak = [];
  for (const f of fields) {
    const hex = (LIGHT[f] || '').match(/#[0-9a-f]{3,8}/i);
    if (!hex) continue;
    const r = ratio(ink[0], hex[0]);
    if (r < 4.5) weak.push(f + ' ' + hex[0] + ' = ' + r.toFixed(2) + ':1');
  }
  if (weak.length) throw new Error('tinta di bawah 4,5:1: ' + weak.join('; '));
});

test('bidang pastel lembut terbaca oleh teks tema, di kedua tema', () => {
  const soft = ['--cream', '--cream-deep', '--yellow-soft', '--coral-soft', '--mint-soft', '--lilac-soft'];
  const weak = [];
  for (const key of soft) {
    for (const [theme, tokens] of [['terang', LIGHT], ['gelap', { ...LIGHT, ...DARK }]]) {
      const field = (tokens[key] || '').match(/#[0-9a-f]{3,8}/i);
      const text = (tokens['--text'] || '').match(/#[0-9a-f]{3,8}/i);
      if (!field || !text) continue;
      const r = ratio(field[0], text[0]);
      if (r < 4.5) weak.push(key + ' @' + theme + ' = ' + r.toFixed(2) + ':1');
    }
  }
  if (weak.length) throw new Error('teks tema tidak terbaca di atasnya: ' + weak.join('; '));
});

/**
 * Palet resmi dari FIEZEL_Instruksi_Redesign_UIUX.pdf bagian 3, dipaku apa adanya.
 *
 * KENAPA INI DIPAKU. Kelima warna ini pernah melenceng SEMUANYA sekaligus: dasar, tinta,
 * aksen utama, aksen kedua, dan gold. Yang terjadi bukan satu kekeliruan, melainkan
 * instruksi susulan OWNER ("semua warnanya harus pastel") diterapkan ke AKSEN, padahal
 * brief sendiri sudah menjawabnya: kuning dipakai sebagai aksen DI ATAS dasar cream,
 * bukan pengganti seluruh background. Rasa pastelnya datang dari dominasi cream, bukan
 * dari memudarkan aksennya - dan memudarkan aksen justru membunuh "ceria" yang diminta.
 *
 * Kelimanya juga lolos kontras terhadap tinta brief sendiri, jadi tidak pernah ada
 * alasan teknis untuk mengubahnya.
 */
const BRIEF_PALETTE = {
  '--cream': '#FFF8ED',   // dasar utama
  '--ink': '#2B2118',     // teks utama dan outline
  '--yellow': '#FFD23F',  // aksen utama: CTA, progress, ikon aktif
  '--coral': '#EE5D4A',   // aksen kedua: notifikasi, badge, streak
  '--gold': '#C9A24B'     // detail premium, dipakai hemat
};

/** Palet lama yang pernah menggantikannya. Tidak boleh muncul lagi di mana pun. */
const SUPERSEDED = ['#FFF9F0', '#33281C', '#FFE07E', '#F5A091', '#D9BC7E'];

test('palet mengikuti brief OWNER, kelima warnanya persis', () => {
  const wrong = [];
  for (const [token, want] of Object.entries(BRIEF_PALETTE)) {
    const got = (LIGHT[token] || '').trim().toUpperCase();
    if (got !== want) wrong.push(token + ' = ' + (got || 'hilang') + ', brief minta ' + want);
  }
  if (wrong.length) throw new Error('menyimpang dari brief bagian 3:\n    ' + wrong.join('\n    '));
});

test('palet lama tidak tertinggal di berkas mana pun', () => {
  const scan = ['style.css', 'features/tutor-classroom/tutor-v3.css', 'app.js', 'index.html', 'manifest.json'];
  const found = [];
  for (const file of scan) {
    let text;
    try { text = fs.readFileSync(path.join(__dirname, file), 'utf8'); } catch { continue; }
    for (const hex of SUPERSEDED) {
      // Komentar boleh menyebut warna lama untuk menjelaskan sejarahnya; yang dilarang
      // adalah nilainya masih dipakai.
      const lines = text.split('\n').filter((l) => l.toUpperCase().includes(hex) && !/^\s*(\/\*|\*|\/\/)/.test(l));
      if (lines.length) found.push(file + ' masih memakai ' + hex + ' (' + lines.length + ' baris)');
    }
  }
  if (found.length) throw new Error('palet yang sudah diganti masih hidup:\n    ' + found.join('\n    '));
});

test('tinta brief terbaca di atas setiap warna brief', () => {
  const ink = BRIEF_PALETTE['--ink'];
  const weak = [];
  for (const [token, hex] of Object.entries(BRIEF_PALETTE)) {
    if (token === '--ink') continue;
    const r = ratio(ink, hex);
    if (r < 4.5) weak.push(token + ' ' + hex + ' = ' + r.toFixed(2) + ':1');
  }
  if (weak.length) throw new Error('di bawah 4,5:1 terhadap tinta brief: ' + weak.join('; '));
});

/**
 * m025-120. Keluhan warna KEEMPAT dari OWNER, dan kali ini dua hal sekaligus:
 *   1. "MODE GELAP ATAU TIDAK GELAP TIDAK BERFUNGSI DI APLIKASI, INTINYA AKU TETAP MAU
 *      DASAR CREAM"
 *   2. "UNTUK SEMUA PALET WARNA COKLAT, MINIMALKAN SEMINIMAL MUNGKIN, KARENA KALAU WARNA
 *      COKLAT TERLALU DOMINAN, AKAN MEMBUAT TAMPILAN KURANG CERIA"
 *
 * Keduanya punya satu penyebab yang bisa dijaga secara statis, jadi dijaga di sini.
 */

const THEME_JS = fs.readFileSync(path.join(__dirname, 'features/ui/fiezel-dark-mode.js'), 'utf8');

test('memilih tema terang benar-benar menyatakan terang', () => {
  // Aturan gelapnya `:root:not([data-theme="light"])`. Menghapus atributnya karena itu
  // TIDAK keluar dari mode gelap - ia hanya berhenti melawannya.
  if (/removeAttribute\(\s*['"]data-theme['"]\s*\)/.test(THEME_JS)) {
    throw new Error('applyTheme masih menghapus data-theme; di ponsel bermode gelap, '
      + 'memilih terang tidak mengubah apa pun karena :not([data-theme="light"]) tetap cocok');
  }
  if (!/setAttribute\(\s*['"]data-theme['"]\s*,\s*['"]light['"]\s*\)/.test(THEME_JS)) {
    throw new Error('tidak ada yang memasang data-theme="light" secara eksplisit');
  }
});

test('dasar cream tidak tergantung mode perangkat', () => {
  // OWNER: "INTINYA AKU TETAP MAU DASAR CREAM". Preferensi sistem boleh dibaca, tetapi
  // tidak boleh menjadi tema awal.
  const init = /initDarkMode\(\)\s*{[\s\S]*?\n  }/.exec(THEME_JS);
  if (!init) throw new Error('initDarkMode tidak ditemukan');
  if (/getSystemPreference\(\)/.test(init[0])) {
    throw new Error('initDarkMode masih jatuh ke preferensi perangkat; ponsel bermode gelap '
      + 'akan memaksa aplikasi gelap pada kunjungan pertama, padahal dasarnya harus cream');
  }
});

test('coklat hanya jadi tinta dan garis, tidak pernah jadi bidang', () => {
  // Coklat sebagai LATAR tombol besar adalah cara coklat mendominasi layar. Brief memberi
  // coklat peran tinta dan outline; bidangnya milik kuning dan koral.
  const BROWN_FIELD = /(?:^|[;\s{])background(?:-color)?\s*:\s*(?:[^;{}]*\s)?var\(\s*--(?:black|ink)\s*\)/;
  const offenders = [];
  for (const file of ['style.css', 'features/tutor-classroom/tutor-v3.css']) {
    let text;
    try { text = fs.readFileSync(path.join(__dirname, file), 'utf8'); } catch { continue; }
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\*|\*)/.test(line)) return;
      if (BROWN_FIELD.test(line)) offenders.push(file + ':' + (i + 1) + ' ' + line.trim().slice(0, 90));
    });
  }
  if (offenders.length) {
    throw new Error('coklat dipakai sebagai bidang:\n    ' + offenders.join('\n    '));
  }
});

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang bidang pastel: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang bidang pastel: PASS ' + pass + '/0');
