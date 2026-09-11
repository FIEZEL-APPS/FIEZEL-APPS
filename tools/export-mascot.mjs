#!/usr/bin/env node
/**
 * ============================================================
 * FIEZEL PAW — pipeline ekspor aset maskot (Wave II, Fase 1.3 code-plan)
 * ============================================================
 *
 * Aturan E5/G11 (FIEZEL-PAW-REDESIGN-SPECIFICATION §2/§35): SATU sumber rig
 * kanonik — SVG inline di features/mascot/fiezel-mascot.js. Semua berkas
 * statis di bawah ini adalah HASIL GENERATE dari rig itu, bukan garapan
 * tangan. Skrip ini:
 *
 *   1. Membaca sumber komponen sebagai TEKS, lalu mengevaluasi irisan
 *      rig-nya (svgMarkup + tabel PIVOTS/EXPRESSIONS/POSES) di sandbox
 *      node:vm — komponen TIDAK diubah, guard SSR-nya tidak perlu ditembus,
 *      dan tidak ada dependensi selain builtin Node.
 *   2. Menghasilkan kembar statis:
 *        assets/brand/paw-mascot-full.svg          (netral, pose idle 08 §1.1)
 *        assets/brand/paw-mascot-head.svg          (crop kepala netral)
 *        assets/marketing/mascot-poses/*.svg       (3 pose marketing dari
 *                                                   tabel pose/ekspresi rig)
 *      Pose = rig + tuple transform yang dibake sebagai atribut — semantik
 *      persis _applyTuple() komponen, sehingga ekspor tidak pernah drift
 *      dari rig (E5). Cincin ekor r=15 + mask-nya SELALU ikut fz-tail-tip
 *      (defect fix D1 08 §3); headphone satu colorway master (D2); emblem
 *      dada = glyph fiezel-paw.svg apa adanya (ditagih pawprint-geometry-
 *      gate-test.js); palet tertutup G1 diverifikasi ulang di sini.
 *   3. Merender PNG 512px (sharp bila ter-resolve, atau rsvg-convert bila
 *      ada di PATH; kalau keduanya absen, langkah PNG dilewati dengan
 *      pengumuman keras — jalankan manual: lihat pesan di output).
 *   4. Menyinkronkan kembar website byte-demi-byte (kontrak lapis 1 gerbang
 *      tests/e5-checksum-gate-test.js): website/assets/mascot/{fiezel-mascot.js,
 *      fiezel-motion.css} + website/assets/brand/{fiezel-paw,paw-mascot-full,
 *      paw-mascot-head}.svg.
 *   5. Menulis assets/brand/mascot-checksums.json — kontrak manifest lapis 2
 *      gerbang E5: { rig: sha256(canonicalRig), files: { path: sha256 } };
 *      canonicalRig = template <svg> svgMarkup dengan ${maskId}→MASKID dan
 *      whitespace di-collapse (algoritme DISALIN persis dari gerbang).
 *
 * Pemakaian:
 *   node tools/export-mascot.mjs            # generate semua + tulis manifest
 *   node tools/export-mascot.mjs --check    # mode CI: verifikasi tanpa menulis
 *
 * npm: `npm run mascot:export` / `npm run mascot:check` (package.json).
 * Catatan design/redesign-v1: salinan maskot di sana TIDAK dicakup gerbang
 * E5 (bukan TWINS, bukan REQUIRED_EXPORTS) — sengaja tidak disentuh di sini.
 * ============================================================
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RIG_FILE = 'features/mascot/fiezel-mascot.js'; // dicerminkan tools/lib/mascot-rig.mjs
const MANIFEST = 'assets/brand/mascot-checksums.json';

const abs = (f) => path.join(ROOT, f);
const read = (f) => fs.readFileSync(abs(f), 'utf8');
const readBuf = (f) => fs.readFileSync(abs(f));
const exists = (f) => fs.existsSync(abs(f));
const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
const CHECK = process.argv.includes('--check');

/* Bagian 1-4 (ekstraksi rig, XML mini, bake tuple, pembangun dokumen) tinggal di
   tools/lib/mascot-rig.mjs sejak sistem karakter merek lahir: dua pipeline ekspor
   memakai semantik bake yang sama, dan dua salinan semantik itu adalah drift E5
   yang menunggu terjadi. Pindahnya byte-netral — dibuktikan `--check` di bawah. */
import {
  G1, extractRig, canonicalRig, parseXml, buildFull, buildHead,
} from './lib/mascot-rig.mjs';

/* ============================================================
   5. RASTER PNG 512 — sharp (bila ter-resolve) → rsvg-convert (PATH) → manual
   ============================================================ */
async function renderPngs(jobs) {
  let sharp = null;
  try { sharp = createRequire(import.meta.url)('sharp'); } catch { /* tidak ada */ }
  if (sharp) {
    for (const { svg, png, size } of jobs) {
      const buf = await sharp(readBuf(svg), { density: 300 })
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png().toBuffer();
      fs.writeFileSync(abs(png), buf);
      console.log('png  - ' + png + ' (' + size + 'px, sharp)');
    }
    return true;
  }
  const probe = spawnSync('rsvg-convert', ['--version'], { encoding: 'utf8' });
  if (!probe.error) {
    for (const { svg, png, size } of jobs) {
      const r = spawnSync('rsvg-convert',
        ['--keep-aspect-ratio', '-w', String(size), '-h', String(size), '-o', abs(png), abs(svg)],
        { encoding: 'utf8' });
      if (r.status !== 0) throw new Error('rsvg-convert gagal untuk ' + svg + ': ' + r.stderr);
      console.log('png  - ' + png + ' (' + size + 'px, rsvg-convert)');
    }
    return true;
  }
  console.log('PERINGATAN - tidak ada sharp maupun rsvg-convert; PNG TIDAK diregenerasi.');
  console.log('  Langkah manual: rsvg-convert --keep-aspect-ratio -w 512 -h 512 -o <out.png> <in.svg>');
  console.log('  lalu jalankan ulang skrip ini agar manifest memuat hash PNG terbaru.');
  return false;
}

/* ============================================================
   6. DEFINISI EKSPOR
   ============================================================ */
// Kembar byte website (kontrak lapis 1 gerbang E5) — sumber selalu kolom kiri.
const TWINS = [
  ['assets/brand/fiezel-paw.svg',       'website/assets/brand/fiezel-paw.svg'],
  ['assets/brand/paw-mascot-full.svg',  'website/assets/brand/paw-mascot-full.svg'],
  ['assets/brand/paw-mascot-head.svg',  'website/assets/brand/paw-mascot-head.svg'],
  ['features/mascot/fiezel-mascot.js',  'website/assets/mascot/fiezel-mascot.js'],
  ['features/mascot/fiezel-motion.css', 'website/assets/mascot/fiezel-motion.css'],
];

// PNG 512 (kanvas persegi transparan, karakter fit-contain — sama dengan aset lama).
const PNGS = [
  { svg: 'assets/brand/paw-mascot-full.svg', png: 'assets/brand/paw-mascot-full-512.png', size: 512 },
  { svg: 'assets/brand/paw-mascot-head.svg', png: 'assets/brand/paw-mascot-head-512.png', size: 512 },
];

// Berkas yang dicantumkan di manifest (semua ekspor + kembar + PNG; enam
// pertama = REQUIRED_EXPORTS gerbang E5).
const MANIFEST_FILES = [
  'assets/brand/fiezel-paw.svg',
  'assets/brand/paw-mascot-full.svg',
  'assets/brand/paw-mascot-head.svg',
  'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-listening.svg',
  'assets/marketing/mascot-poses/paw-mascot-head-proud.svg',
  'assets/brand/paw-mascot-full-512.png',
  'assets/brand/paw-mascot-head-512.png',
  'website/assets/brand/fiezel-paw.svg',
  'website/assets/brand/paw-mascot-full.svg',
  'website/assets/brand/paw-mascot-head.svg',
  'website/assets/mascot/fiezel-mascot.js',
  'website/assets/mascot/fiezel-motion.css',
];

/* ============================================================
   7. VERIFIKASI MANDIRI PASCA-GENERATE (cermin gerbang, gagal keras)
   ============================================================ */
function selfCheckSvg(file, text, { needEmblem, needRing }) {
  parseXml(text); // well-formedness
  // palet tertutup G1 — cermin tests/palette-gate-test.js
  const bad = new Map();
  for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    const h = m[1].toLowerCase();
    if (!G1.has(h)) bad.set(h, (bad.get(h) || 0) + 1);
  }
  if (bad.size) throw new Error(file + ': hex di luar palet G1: '
    + [...bad].map(([h, n]) => '#' + h + ' ×' + n).join(', '));
  if (/fz-pads/.test(text)) throw new Error(file + ': fz-pads muncul kembali (keputusan OWNER: glyph hanya di dada)');
  if (needEmblem && !/class="fz-emblem"/.test(text)) throw new Error(file + ': emblem dada fz-emblem hilang');
  if (needRing && !(/class="fz-ring"/.test(text) && /<mask /.test(text))) {
    throw new Error(file + ': cincin ekor r=15 / mask-nya hilang (defect D1 — ekspor tidak sah)');
  }
}

/* ============================================================
   8. MAIN
   ============================================================ */
async function main() {
  const src = read(RIG_FILE);
  const rig = extractRig(src);
  const rigHash = sha256(canonicalRig(src));

  // Pose marketing (08 §1 + peta §2; proud = ekspresi 8 dari 07 §2 — crop
  // kepala, kanal badan pada tuple tidak tampak; bintang fz-stars emas/soft-red
  // per defect fix D2 08 §3 menggantikan bintang #FFC700/#E6A800 lama).
  const POSE_EXPORTS = [
    {
      file: 'assets/marketing/mascot-poses/paw-mascot-head-listening.svg',
      kind: 'head', uid: 'x-listening', tuple: rig.POSES.listening,
      frame: { viewBox: '36 -18 248 232', label: 'PAW sedang mendengarkan' },
    },
    {
      file: 'assets/marketing/mascot-poses/paw-mascot-head-proud.svg',
      kind: 'head', uid: 'x-proud',
      tuple: { ...rig.EXPRESSIONS.proud, acc: ['fz-stars'] },
      frame: { viewBox: '22 -22 276 244', label: 'PAW bangga' },
    },
    {
      file: 'assets/marketing/mascot-poses/paw-mascot-full-celebrating.svg',
      kind: 'full', uid: 'x-celebrating', tuple: rig.POSES.celebrating,
      frame: { viewBox: '0 -32 320 332', label: 'PAW merayakan' }, // ruang lompatan ty-12 × sy1.05
    },
  ];

  // ---------- mode --check: verifikasi tanpa menulis apa pun ----------
  if (CHECK) {
    const errs = [];
    if (!exists(MANIFEST)) errs.push(MANIFEST + ' belum ada — jalankan tanpa --check dulu');
    else {
      const man = JSON.parse(read(MANIFEST));
      if (man.rig !== rigHash) errs.push('rig berubah tetapi ekspor belum di-generate ulang (manifest.rig basi)');
      for (const [f, want] of Object.entries(man.files || {})) {
        if (!exists(f)) { errs.push(f + ' hilang'); continue; }
        if (sha256(readBuf(f)) !== want) errs.push(f + ' menyimpang dari manifest');
      }
      for (const f of MANIFEST_FILES) if (!(f in (man.files || {}))) errs.push(f + ' tidak terdaftar di manifest');
    }
    for (const [s, c] of TWINS) {
      if (!exists(s) || !exists(c)) { errs.push('kembar hilang: ' + c); continue; }
      if (sha256(readBuf(s)) !== sha256(readBuf(c))) errs.push('kembar menyimpang: ' + c);
    }
    if (errs.length) {
      errs.forEach((e) => console.log('FAIL - ' + e));
      console.log('\nexport-mascot --check: FAIL (' + errs.length + ') — jalankan: node tools/export-mascot.mjs');
      process.exit(1);
    }
    console.log('export-mascot --check: PASS (manifest segar, kembar identik)');
    return;
  }

  // ---------- generate SVG ----------
  const outputs = new Map(); // file → text

  outputs.set('assets/brand/paw-mascot-full.svg', buildFull(rig, 'x-static', rig.POSES.idle,
    { viewBox: '0 0 320 300', label: 'PAW — maskot FIEZEL' }));
  outputs.set('assets/brand/paw-mascot-head.svg', buildHead(rig, 'x-head', { mouth: 'smile' },
    { viewBox: '56 -10 208 216', label: 'PAW — ikon kepala maskot FIEZEL' }));
  for (const p of POSE_EXPORTS) {
    outputs.set(p.file, (p.kind === 'full' ? buildFull : buildHead)(rig, p.uid, p.tuple, p.frame));
  }

  // verifikasi mandiri sebelum menulis — ekspor cacat tidak pernah menyentuh disk
  for (const [file, text] of outputs) {
    selfCheckSvg(file, text, {
      needEmblem: /full/.test(file),
      needRing: /full/.test(file), // badan penuh wajib bawa cincin ekor + mask
    });
  }
  for (const [file, text] of outputs) {
    fs.writeFileSync(abs(file), text);
    console.log('svg  - ' + file);
  }

  // ---------- PNG 512 ----------
  await renderPngs(PNGS);

  // ---------- sinkron kembar website (byte-demi-byte) ----------
  for (const [srcF, copy] of TWINS) {
    fs.mkdirSync(path.dirname(abs(copy)), { recursive: true });
    fs.copyFileSync(abs(srcF), abs(copy));
    console.log('twin - ' + copy);
  }

  // ---------- manifest (kontrak gerbang E5: { rig, files }) ----------
  const files = {};
  for (const f of MANIFEST_FILES) {
    if (!exists(f)) throw new Error('berkas manifest hilang: ' + f);
    files[f] = sha256(readBuf(f));
  }
  const manifest = { generator: 'tools/export-mascot.mjs', rig: rigHash, files };
  fs.writeFileSync(abs(MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
  console.log('man  - ' + MANIFEST + ' (rig ' + rigHash.slice(0, 12) + '…, ' + Object.keys(files).length + ' berkas)');
  console.log('\nexport-mascot: SELESAI');
}

main().catch((e) => { console.error('export-mascot: GAGAL — ' + e.message); process.exit(1); });
