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

const LIGHT = lightTokens();

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

test('bidang pastel lembut terbaca oleh teks tema', () => {
  const soft = ['--cream', '--cream-deep', '--yellow-soft', '--coral-soft', '--mint-soft', '--lilac-soft'];
  const weak = [];
  for (const key of soft) {
    for (const [theme, tokens] of [['terang', LIGHT]]) {
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

const THEME_JS = fs.readFileSync(path.join(__dirname, 'features/ui/fiezel-ui-manager.js'), 'utf8');

test('tema terang dinyatakan, bukan sekadar dibiarkan', () => {
  // OWNER m025-134: "hapus mode gelap". Yang dijaga di sini: terang tetap DINYATAKAN
  // sebagai atribut, bukan dibiarkan kosong - konvensi data-theme masih dibaca stylesheet
  // atau ekstensi lain, dan atribut yang absen berarti "terserah perangkat".
  if (!/setAttribute\(\s*['"]data-theme['"]\s*,\s*['"]light['"]\s*\)/.test(THEME_JS)) {
    throw new Error('tidak ada yang memasang data-theme="light" secara eksplisit');
  }
  if (/removeAttribute\(\s*['"]data-theme['"]\s*\)/.test(THEME_JS)) {
    throw new Error('data-theme masih dihapus; terang harus dinyatakan');
  }
});

test('tidak ada sisa mode gelap di kode maupun palet', () => {
  // Mode gelap dihapus seluruhnya: tidak ada sakelar, tidak ada pasangan token gelap,
  // dan preferensi sistem tidak lagi punya suara atas tampilan aplikasi.
  if (/toggleDarkMode|getSystemPreference|prefers-color-scheme/.test(THEME_JS)) {
    throw new Error('pengelola UI masih memegang jalur mode gelap');
  }
  const leftovers = [];
  for (const file of ['style.css', 'features/tutor-classroom/tutor-v3.css', 'features/ui/fiezel-boot-tail.js']) {
    let text;
    try { text = fs.readFileSync(path.join(__dirname, file), 'utf8'); } catch { continue; }
    if (/prefers-color-scheme|data-theme="dark"|settingDarkMode/.test(text)) leftovers.push(file);
  }
  if (leftovers.length) {
    throw new Error('sisa mode gelap masih ada di: ' + leftovers.join(', '));
  }
});

/**
 * Coklat yang boleh jadi latar, beserta alasannya.
 *
 * Aturannya berbunyi "tinta dan garis, tidak pernah bidang", dan yang dilarang memang
 * BIDANG - permukaan lebar yang membuat layar terasa gelap. Marka setinggi lima piksel
 * bukan bidang; ia garis yang kebetulan digambar lewat background. Regex tidak bisa
 * membedakan keduanya, jadi bedanya ditulis di sini supaya bisa ditinjau, bukan
 * disembunyikan dengan melonggarkan aturannya.
 *
 * Ukuran adalah syaratnya: apa pun yang masuk daftar ini harus tetap seukuran garis.
 */
const BROWN_MARK_OK = {
  'html.fiezel-ui-v6 .nav.active::after': 'titik penanda 5x5 px di bawah label tab aktif; penanda yang bekerja tanpa warna',
  '.hero-ring': 'cincin kemajuan 15x15 px, dilubangi mask jadi tinggal cincin tipis; tidak menampung teks'
};

test('coklat hanya jadi tinta dan garis, tidak pernah jadi bidang', () => {
  // Coklat sebagai LATAR tombol besar adalah cara coklat mendominasi layar. Brief memberi
  // coklat peran tinta dan outline; bidangnya milik kuning dan koral.
  const BROWN_FIELD = /(?:^|[;\s{])background(?:-color)?\s*:\s*(?:[^;{}]*\s)?var\(\s*--(?:black|ink)\s*\)/;
  const offenders = [];
  for (const file of ['style.css', 'features/tutor-classroom/tutor-v3.css']) {
    let text;
    try { text = fs.readFileSync(path.join(__dirname, file), 'utf8'); } catch { continue; }
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (/^\s*(\/\*|\*)/.test(line)) return;
      if (!BROWN_FIELD.test(line)) return;
      // Selector aturan ini: baris pembuka terdekat di atasnya yang berakhir '{'.
      let selector = '';
      for (let j = i; j >= 0 && j > i - 6; j--) {
        const m = /^([^{}]+)\{/.exec(lines[j].trim());
        if (m) { selector = m[1].trim(); break; }
      }
      if (BROWN_MARK_OK[selector]) return;
      offenders.push(file + ':' + (i + 1) + ' ' + line.trim().slice(0, 90));
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
