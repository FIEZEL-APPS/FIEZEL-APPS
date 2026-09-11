#!/usr/bin/env node
/**
 * ============================================================
 * FIEZEL — generator TABEL SENI KARAKTER (state → aset Nusa/Mira/team)
 * ============================================================
 *
 * Komponen maskot tidak boleh mem-fetch manifest saat boot: berkas lama sengaja
 * menaruh SVG-nya inline justru supaya wajah maskot tidak menunggu jaringan
 * (features/mascot/README.md). Aset Nusa/Mira adalah gambar, jadi gambarnya
 * memang diunduh — tetapi PETA "state mana memakai berkas mana" tidak boleh ikut
 * menunggu. Maka peta itu ditanam di dalam modul, dan berkas ini yang menanamnya.
 *
 * Yang dijaga dengan meng-generate, bukan menulis tangan:
 *   - Setiap state menunjuk pose yang BENAR-BENAR ada di manifest. Salah ketik
 *     nama pose berhenti di sini, bukan di layar murid sebagai gambar rusak.
 *   - Ukuran (w/h) ikut dari manifest, jadi rasio aspek tidak pernah ditebak dan
 *     tata letak tidak bergeser saat gambar selesai dimuat.
 *   - Ketersediaan frame KEDIP diukur dari disk, bukan diasumsikan. Hanya
 *     sebagian pose punya frame blink; state yang hidup lama (idle, speaking,
 *     listening) sengaja dipetakan ke pose yang punya, dan gerbang menuntutnya.
 *   - Kotak mata/mulut dari face-rig.json ikut tertanam untuk pose yang punya,
 *     supaya viseme bisa menukar mulut tanpa membaca berkas kedua saat bicara.
 *
 * PEMBAGIAN PERAN (keputusan OWNER, sesi m025-303):
 *   NUSA  — maskot utama: seluruh state harian.
 *   MIRA  — momen mengajar/menyemangati/bangga.
 *   TEAM  — momen besar: sapaan, mulai pelajaran, selesai, tonggak.
 *
 * Pemakaian:
 *   node tools/gen-character-art-table.mjs           # tulis modul tabel
 *   node tools/gen-character-art-table.mjs --check   # verifikasi tanpa menulis
 * ============================================================
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'features/mascot/fiezel-character-art.js';
const CHECK = process.argv.includes('--check');

const abs = (f) => path.join(ROOT, f);
const read = (f) => fs.readFileSync(abs(f), 'utf8');

const manifest = JSON.parse(read('assets/characters/manifest.json'));
const faceRig = JSON.parse(read('assets/characters/face-rig.json'));
/* Warna moncong DIUKUR dari aset oleh tools/sample-muzzle.py, bukan ditulis di
   sini. Lapisan viseme memerlukannya untuk menutup mulut yang sudah tergambar
   sebelum menggambar mulut barunya — tanpa itu ada dua mulut di satu wajah. */
const muzzle = JSON.parse(read('assets/characters/muzzle.json')).warna;

/* 19 state komponen (cermin STATES di rig lama). Peta ini WAJIB menutup
   seluruhnya — gerbang membandingkan kedua daftar. */
const STATE_ART = {
  idle:           ['nusa', 'full-neutral'],
  greeting:       ['team', 'shoulder-wave'],
  curious:        ['nusa', 'head-curious'],
  thinking:       ['nusa', 'full-thinking'],
  listening:      ['nusa', 'full-neutral'],
  encouraging:    ['mira', 'full-explain'],
  celebrating:    ['nusa', 'full-celebrate'],
  confused:       ['nusa', 'full-oops'],
  hinting:        ['mira', 'full-explain'],
  completion:     ['team', 'highfive'],
  proud:          ['mira', 'head-proud'],
  sleepy:         ['nusa', 'full-sleep'],
  sad:            ['nusa', 'head-oops'],
  love:           ['mira', 'full-cheer'],
  speaking:       ['nusa', 'head-happy'],
  'welcome-back': ['team', 'shoulder-wave'],
  'lesson-start': ['team', 'teaching'],
  'level-up':     ['mira', 'full-cheer'],
  milestone:      ['team', 'highfive'],
};

/* State yang hidup lama WAJIB punya frame kedip: tanpa itu karakter membeku di
   layar selama puluhan detik dan terbaca sebagai gambar tempel, bukan makhluk. */
const NEEDS_BLINK = ['idle', 'listening', 'speaking', 'greeting'];

function entryFor(char, pose) {
  const c = manifest.characters[char];
  if (!c) throw new Error('karakter "' + char + '" tidak ada di manifest');
  const e = c[pose];
  if (!e) throw new Error('pose "' + char + '/' + pose + '" tidak ada di manifest');
  return e;
}

function build() {
  const art = {};
  const problems = [];

  for (const [state, [char, pose]] of Object.entries(STATE_ART)) {
    const e = entryFor(char, pose);
    const webp = e.webp;
    if (!fs.existsSync(abs(webp))) problems.push(state + ': ' + webp + ' tidak ada di disk');

    const blinkRel = 'assets/characters/' + char + '/png/blink/' + pose + '.png';
    const hasBlink = fs.existsSync(abs(blinkRel));
    if (!hasBlink && NEEDS_BLINK.includes(state)) {
      problems.push(state + ': state hidup-lama tanpa frame kedip (' + char + '/' + pose + ')');
    }

    const rig = (faceRig[char] || {})[pose] || null;
    art[state] = {
      char, pose,
      src: webp,
      w: e.w, h: e.h,
      blink: hasBlink ? blinkRel : null,
      mouth: rig && rig.faces && rig.faces[0] ? rig.faces[0].mouth : null,
      eyes: rig && rig.faces && rig.faces[0] ? rig.faces[0].eyes : null,
      muzzle: (muzzle[char + '/' + pose] || {}).hex || null,
    };
  }
  if (problems.length) throw new Error('\n  - ' + problems.join('\n  - '));
  return art;
}

function render(art) {
  const lines = Object.entries(art).map(([state, a]) => {
    const box = (v) => (v ? '[' + v.map((n) => +n.toFixed(5)).join(',') + ']' : 'null');
    return '    ' + JSON.stringify(state) + ': { char: ' + JSON.stringify(a.char)
      + ', pose: ' + JSON.stringify(a.pose) + ', src: ' + JSON.stringify(a.src)
      + ', w: ' + a.w + ', h: ' + a.h
      + ', blink: ' + (a.blink ? JSON.stringify(a.blink) : 'null')
      + ', mouth: ' + box(a.mouth) + ', eyes: ' + box(a.eyes)
      + ', muzzle: ' + (a.muzzle ? JSON.stringify(a.muzzle) : 'null') + ' }';
  });
  return `/* HASIL GENERATE - jangan diedit tangan.
   Sumber: assets/characters/manifest.json + assets/characters/face-rig.json
   Regenerasi: node tools/gen-character-art-table.mjs

   Peta 19 state komponen ke seni Nusa/Mira/team. Ditanam (bukan di-fetch) supaya
   wajah karakter tidak menunggu jaringan untuk tahu gambar mana yang harus dipakai;
   gambarnya sendiri tetap dimuat malas oleh <img>.

   w/h ikut manifest supaya rasio aspek tidak pernah ditebak dan tata letak tidak
   bergeser saat gambar selesai dimuat. 'blink' null = pose itu tidak punya frame
   kedip. 'mouth'/'eyes' = kotak ternormalisasi [x,y,w,h] dari face-rig, dipakai
   lapisan viseme; null = pose itu belum diukur. 'muzzle' = warna kulit sekitar
   mulut, DIUKUR dari aset (tools/sample-muzzle.py), dipakai menutup mulut lama
   sebelum viseme menggambar yang baru. */
(function (global) {
  'use strict';
  if (!global) return;
  var ART = {
${lines.join(',\n')}
  };
  global.FiezelCharacterArt = Object.freeze({
    art: ART,
    states: Object.keys(ART),
    /** Aset satu state, atau null kalau namanya tidak dikenal. */
    forState: function (name) { return ART[name] || null; },
    /** Berkas yang wajib ikut precache supaya boot pertama tidak berkedip kosong. */
    bootSrcs: ['idle', 'greeting', 'speaking'].map(function (s) { return ART[s].src; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; })
  });
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this));
`;
}

const art = build();
const text = render(art);

if (CHECK) {
  if (!fs.existsSync(abs(OUT))) { console.log('FAIL - ' + OUT + ' belum ada'); process.exit(1); }
  if (read(OUT) !== text) {
    console.log('FAIL - ' + OUT + ' menyimpang dari manifest/face-rig — jalankan: node tools/gen-character-art-table.mjs');
    process.exit(1);
  }
  console.log('gen-character-art-table --check: PASS (' + Object.keys(art).length + ' state)');
} else {
  fs.writeFileSync(abs(OUT), text);
  console.log('js   - ' + OUT + ' (' + Object.keys(art).length + ' state)');
  const nb = Object.entries(art).filter(([, a]) => a.blink).length;
  const nm = Object.entries(art).filter(([, a]) => a.mouth).length;
  console.log('       ' + nb + ' state punya frame kedip, ' + nm + ' punya kotak mulut (viseme)');
}
