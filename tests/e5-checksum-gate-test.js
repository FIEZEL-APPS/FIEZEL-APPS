#!/usr/bin/env node
/**
 * Gerbang checksum E5 untuk redesign maskot PAW.
 *
 * Aturan G11/E5 (FIEZEL-PAW-REDESIGN-SPECIFICATION §2, §35, A-10 no.1): SATU sumber
 * rig kanonik — SVG inline di features/mascot/fiezel-mascot.js. Semua SVG statis,
 * berkas pose, dan salinan komponen website/assets/mascot/ adalah EKSPOR yang
 * dihasilkan dari rig itu, bukan garapan tangan. Sebelum gerbang ini ada, setiap
 * perubahan geometri adalah sinkronisasi manual 10 berkas — dan riwayatnya sudah
 * membuktikan itu gagal diam-diam (pose celebrating kehilangan cincin ekor, dua
 * warna headphone, drift koordinat mata proud).
 *
 * Dua lapis:
 *   1. KEMBAR BYTE: salinan website identik byte demi byte dengan sumbernya.
 *      Menyimpang satu byte = ada yang mengedit salinan, bukan sumbernya.
 *   2. MANIFEST: assets/brand/mascot-checksums.json — ditulis oleh pipeline ekspor
 *      (Wave II), berisi sha256 rig kanonik + sha256 tiap ekspor. Gerbang menghitung
 *      ulang semuanya.
 *
 * TODO(Wave II — pipeline ekspor aset): selama manifest BELUM ada, lapis 2 SKIP
 * dengan pengumuman keras, bukan FAIL — supaya gerbang ini bisa mendarat hari ini
 * bersama lapis kembarnya dan otomatis mengetat begitu manifest ditulis. Ini
 * pengecualian sadar terhadap A-10 no.1 ("gerbang yang diam saat pagarnya belum
 * dipasang adalah lubang"): lubangnya tercatat DI OUTPUT tiap run, tidak diam.
 * Begitu berkasnya ada, jalur SKIP mati sendiri tanpa disunting.
 */
'use strict';
const __fzRoot = require('path').join(__dirname, '..'); /* m025-254: berkas ini pindah dari root ke tests/. __dirname dulu BERARTI root repo, dan puluhan gerbang memakainya untuk menunjuk berkas produksi - alias ini menjaga makna itu tetap benar tanpa menyunting setiap pemakaian. */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const readBuf = (f) => fs.readFileSync(path.join(__fzRoot, f));
const read = (f) => fs.readFileSync(path.join(__fzRoot, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(__fzRoot, f));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

let pass = 0;
let skip = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('ok - ' + name); }
  catch (e) { failures.push(name); console.log('FAIL - ' + name + ': ' + e.message); }
}
/** SKIP yang berisik: tercatat di tiap run, tidak pernah jadi kelulusan diam-diam. */
function skipTest(name, why) {
  skip++;
  console.log('SKIP - ' + name + ' — ' + why);
}

/* ---------- Lapis 1: kembar byte ---------- */

// Pasangan sumber → salinan. Sumbernya selalu kolom kiri; kalau kembar menyimpang,
// yang diperbaiki adalah SALINANNYA (di-generate ulang), bukan sumbernya.
const TWINS = [
  ['assets/brand/fiezel-paw.svg',       'website/assets/brand/fiezel-paw.svg'],
  ['assets/brand/paw-mascot-full.svg',  'website/assets/brand/paw-mascot-full.svg'],
  ['assets/brand/paw-mascot-head.svg',  'website/assets/brand/paw-mascot-head.svg'],
  ['features/mascot/fiezel-mascot.js',  'website/assets/mascot/fiezel-mascot.js'],
  ['features/mascot/fiezel-motion.css', 'website/assets/mascot/fiezel-motion.css'],
];

test('salinan website identik byte demi byte dengan sumbernya', () => {
  const drift = [];
  for (const [src, copy] of TWINS) {
    if (!exists(src)) { drift.push(src + ' (sumber hilang)'); continue; }
    if (!exists(copy)) { drift.push(copy + ' (salinan hilang)'); continue; }
    if (sha256(readBuf(src)) !== sha256(readBuf(copy))) drift.push(copy);
  }
  if (drift.length) {
    throw new Error('kembar menyimpang: ' + drift.join(', ')
      + ' — jangan tambal salinannya dengan tangan; salin ulang dari sumbernya (kolom kiri)');
  }
});

/* ---------- Lapis 2: manifest ekspor ---------- */

const MANIFEST = 'assets/brand/mascot-checksums.json';

// Ekspor yang WAJIB terdaftar. Manifest boleh mendaftar lebih (pose baru §16),
// tidak boleh kurang — ekspor tak terdaftar adalah ekspor tak terjaga.
const REQUIRED_EXPORTS = [
  'assets/brand/fiezel-paw.svg',
  'assets/brand/paw-mascot-full.svg',
  'assets/brand/paw-mascot-head.svg',
  'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-listening.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-proud.svg',
];

/** Rig kanonik = template svgMarkup di fiezel-mascot.js, id mask dinormalkan
 *  (id-nya per-instance [P0-1], bukan bagian dari bentuk). Placeholder warna
 *  (${YEL} dsb.) TIDAK dinormalkan — warna adalah bagian dari rig. Kontrak ini
 *  wajib diadopsi alat ekspor saat menulis manifest.rig. */
function canonicalRig() {
  const src = read('features/mascot/fiezel-mascot.js');
  const m = /svgMarkup[\s\S]*?(<svg[\s\S]*?<\/svg>)/.exec(src);
  if (!m) throw new Error('template svgMarkup tidak ditemukan di fiezel-mascot.js');
  return m[1].replace(/\$\{maskId\}/g, 'MASKID').replace(/\s+/g, ' ');
}

const MANIFEST_TODO = 'TODO(Wave II — pipeline ekspor aset): ' + MANIFEST
  + ' belum ditulis; lapis manifest E5 belum menjaga apa-apa. Begitu pipeline ekspor'
  + ' menulisnya, keempat pemeriksaan ini menyala sendiri tanpa disunting.';

if (!exists(MANIFEST)) {
  skipTest('manifest checksum ada dan bentuknya benar', MANIFEST_TODO);
  skipTest('manifest diturunkan dari rig kanonik SAAT INI', MANIFEST_TODO);
  skipTest('setiap ekspor wajib terdaftar di manifest', MANIFEST_TODO);
  skipTest('setiap berkas ekspor cocok dengan checksumnya', MANIFEST_TODO);
} else {
  const loadManifest = () => JSON.parse(read(MANIFEST));

  test('manifest checksum ada dan bentuknya benar', () => {
    const man = loadManifest();
    if (typeof man.rig !== 'string' || !man.files || typeof man.files !== 'object') {
      throw new Error('manifest butuh { rig: sha256, files: { path: sha256 } }');
    }
  });

  test('manifest diturunkan dari rig kanonik SAAT INI', () => {
    const man = loadManifest();
    const rigHash = sha256(canonicalRig());
    if (man.rig !== rigHash) {
      throw new Error('rig berubah tetapi ekspor tidak di-generate ulang: manifest.rig '
        + String(man.rig).slice(0, 12) + '… vs rig kerja ' + rigHash.slice(0, 12)
        + '… — jalankan ulang alat ekspor, jangan edit manifestnya');
    }
  });

  test('setiap ekspor wajib terdaftar di manifest', () => {
    const man = loadManifest();
    const missing = REQUIRED_EXPORTS.filter((f) => !(f in man.files));
    if (missing.length) throw new Error('ekspor tak terdaftar (tak terjaga): ' + missing.join(', '));
  });

  test('setiap berkas ekspor cocok dengan checksumnya', () => {
    const man = loadManifest();
    const drift = [];
    for (const [f, want] of Object.entries(man.files)) {
      if (!exists(f)) { drift.push(f + ' (hilang)'); continue; }
      const got = sha256(readBuf(f));
      if (got !== want) drift.push(f + ' (' + got.slice(0, 12) + '… ≠ ' + String(want).slice(0, 12) + '…)');
    }
    if (drift.length) {
      throw new Error('ekspor menyimpang dari manifest: ' + drift.join('; ')
        + ' — ada yang mengedit ekspor dengan tangan, atau lupa menulis ulang manifest');
    }
  });
}

console.log('');
if (failures.length) {
  console.log('FIEZEL gerbang checksum E5: FAIL (' + failures.length + ')');
  process.exit(1);
}
console.log('FIEZEL gerbang checksum E5: PASS ' + pass
  + (skip ? ' (SKIP ' + skip + ' — lapis manifest menunggu pipeline ekspor Wave II)' : ''));
