#!/usr/bin/env node
/**
 * ============================================================
 * FIEZEL PAW — pipeline ekspor SISTEM KARAKTER MEREK
 * ============================================================
 *
 * Saudara dari tools/export-mascot.mjs, aturan yang sama (E5/G11): satu sumber
 * bentuk. Yang itu meng-generate lima aset merek inti; yang ini meng-generate
 * PUSTAKA yang dipakai desainer — ekspresi, pose, gestur, prop, badge telapak,
 * dan kit ilustrasi UI (kosong / berhasil / galat / onboarding / pemasaran).
 *
 * Semua yang menyangkut TUBUH PAW dibaca dari rig lewat tools/lib/mascot-rig.mjs.
 * Semua yang menyangkut benda & komposisi dibaca dari
 * tools/character-system/library.mjs. Tidak ada koordinat karakter yang
 * ditulis tangan di mana pun di jalur ini — itulah inti kontraknya.
 *
 * Badge telapak: glyph-nya DISALIN mentah dari assets/brand/fiezel-paw.svg pada
 * saat ekspor. Kalau glyph merek berubah, seluruh lencana ikut berubah pada
 * regenerasi berikutnya, dan gerbang menuntut regenerasi itu terjadi.
 *
 * Keluaran:
 *   assets/brand/character-system/master/         1 berkas  (master, pose idle)
 *   assets/brand/character-system/expressions/   14 berkas  (crop kepala)
 *   assets/brand/character-system/poses/         16 berkas  (badan penuh)
 *   assets/brand/character-system/props/         12 berkas  (kotak 100×100)
 *   assets/brand/character-system/badge/          4 berkas  (kotak 96×96)
 *   assets/brand/character-system/illustrations/ 17 berkas  (bingkai 480×360)
 *   assets/brand/character-system/character-system.json     (manifest + sha256)
 *   mockups/character-system.html                           (lembar kontak)
 *
 * Pemakaian:
 *   node tools/export-character-system.mjs           # generate + tulis manifest
 *   node tools/export-character-system.mjs --check   # verifikasi tanpa menulis
 * ============================================================
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  G1, extractRig, canonicalRig, parseXml, serialize,
  buildFull, buildHead, svgDoc,
} from './lib/mascot-rig.mjs';
import { C, PROPS, BADGES, BADGE_BOX, BADGE_SCALE, SCENES } from './character-system/library.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = 'tools/export-character-system.mjs';
const OUT = 'assets/brand/character-system';
const MANIFEST = OUT + '/character-system.json';
const CONTACT = 'mockups/character-system.html';
const PAW_FILE = 'assets/brand/fiezel-paw.svg';
const RIG_FILE = 'features/mascot/fiezel-mascot.js';

const abs = (f) => path.join(ROOT, f);
const read = (f) => fs.readFileSync(abs(f), 'utf8');
const readBuf = (f) => fs.readFileSync(abs(f));
const exists = (f) => fs.existsSync(abs(f));
const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex');
const CHECK = process.argv.includes('--check');

/* ============================================================
   1. GLYPH TELAPAK — disalin, tidak digambar ulang
   ============================================================ */
/** Isi <g fill="…">…</g> dari berkas merek, apa adanya (whitespace dirapikan).
 *  Kalau strukturnya berubah, ini GAGAL KERAS: lebih baik pipeline berhenti
 *  daripada diam-diam mengekspor lencana tanpa telapak di dalamnya. */
function pawGlyph() {
  const src = read(PAW_FILE);
  const m = /<g fill="[^"]*">([\s\S]*?)<\/g>/.exec(src);
  if (!m) throw new Error(PAW_FILE + ': grup glyph <g fill="…"> tidak ditemukan');
  const inner = m[1].trim();
  const bars = (inner.match(/<rect\b/g) || []).length;
  const pads = (inner.match(/<path\b/g) || []).length;
  if (bars !== 4 || pads !== 1) {
    throw new Error(PAW_FILE + ': glyph telapak bukan 4 jari + 1 bantalan (dapat '
      + bars + ' rect, ' + pads + ' path) — lencana tidak diekspor atas tebakan');
  }
  return inner.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

/* ============================================================
   2. PEMBANGUN — badge, prop, adegan
   ============================================================ */
const NOTE = (what) => '<!-- HASIL GENERATE - jangan diedit tangan. ' + what
  + ' Regenerasi: node ' + TOOL + ' -->';

function buildBadge(name, glyph) {
  const b = BADGES[name];
  const o = +((BADGE_BOX - 24 * BADGE_SCALE) / 2).toFixed(2);
  return NOTE('Sumber glyph: ' + PAW_FILE + ' (disalin apa adanya).') + '\n'
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BADGE_BOX} ${BADGE_BOX}" role="img" aria-label="${b.label}">\n`
    + `  <g class="fz-badge-bg">${b.bg}</g>\n`
    + `  <g class="fz-badge-glyph" fill="${b.ink}" transform="translate(${o},${o}) scale(${BADGE_SCALE})">\n`
    + glyph.split('\n').map((l) => '    ' + l).join('\n') + '\n'
    + '  </g>\n</svg>\n';
}

function buildProp(name) {
  const p = PROPS[name];
  return NOTE('Sumber: tools/character-system/library.mjs (PROPS).') + '\n'
    + `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="${p.label}">\n`
    + `  <g class="fz-prop fz-prop-${name}">`
    + p.body.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => '\n    ' + l).join('')
    + '\n  </g>\n</svg>\n';
}

/** Adegan = bingkai 480×360 berisi, dari belakang ke depan:
 *  bidang pastel → PAW (rig, diskala) → prop → badge pojok.
 *  PAW memakai pohon rig yang SUDAH dibake (buildFull), lalu disisipkan
 *  sebagai sub-<svg> ber-viewBox sendiri: itu menjaga koordinat rig utuh,
 *  jadi adegan tidak pernah perlu tahu di mana mata PAW berada. */
function buildScene(scene, rig, glyph) {
  const tuple = rig.POSES[scene.pose] || rig.EXPRESSIONS[scene.pose];
  if (!tuple) throw new Error(scene.id + ': pose/ekspresi "' + scene.pose + '" tidak ada di rig');

  const pauDoc = buildFull(rig, 'cs-' + scene.id, tuple,
    { viewBox: '0 -32 320 332', label: scene.label, tool: TOOL });
  const pauTree = parseXml(pauDoc.slice(pauDoc.indexOf('<svg')))?.children[0];
  if (!pauTree) throw new Error(scene.id + ': pohon PAW gagal diurai');

  // PAW: tinggi 300 dari 332 unit rig → 268 px di bingkai 360 (tersisa 46 px
  // ruang kepala, 46 px alas). Poros x yang sama untuk SEMUA adegan (§kit).
  const s = 268 / 332;
  const pau = { tag: 'g', attrs: { class: 'fz-scene-pau', transform: `translate(30,46) scale(${s.toFixed(4)})` },
    children: [{ tag: 'svg', attrs: { x: '0', y: '0', width: '320', height: '332', viewBox: '0 -32 320 332', overflow: 'visible' }, children: pauTree.children }] };

  const kids = [];
  if (scene.bidang === 'pastel') {
    kids.push({ tag: 'rect', attrs: { class: 'fz-scene-field', x: '0', y: '0', width: '480', height: '360', rx: '28', fill: C.krem }, children: [] });
    kids.push({ tag: 'ellipse', attrs: { class: 'fz-scene-ground', cx: '176', cy: '312', rx: '132', ry: '18', fill: C.tan, opacity: '.35' }, children: [] });
  }
  kids.push(pau);

  if (scene.prop) {
    const p = PROPS[scene.prop.nama];
    if (!p) throw new Error(scene.id + ': prop "' + scene.prop.nama + '" tidak ada di pustaka');
    const g = parseXml(`<g class="fz-scene-prop fz-prop-${scene.prop.nama}">${p.body}</g>`).children[0];
    g.attrs.transform = `translate(${scene.prop.x},${scene.prop.y}) scale(${scene.prop.s})`;
    kids.push(g);
  }
  if (scene.badge) {
    const badgeDoc = buildBadge(scene.badge, glyph);
    const bt = parseXml(badgeDoc.slice(badgeDoc.indexOf('<svg'))).children[0];
    kids.push({ tag: 'g', attrs: { class: 'fz-scene-badge', transform: 'translate(396,24) scale(0.625)' }, children: bt.children });
  }

  return NOTE('Sumber: ' + RIG_FILE + ' + tools/character-system/library.mjs.') + '\n'
    + serialize({ tag: 'svg', attrs: {
        xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 480 360',
        role: 'img', 'aria-label': scene.label,
      }, children: kids }) + '\n';
}

/* ============================================================
   3. VERIFIKASI MANDIRI — cermin gerbang, gagal sebelum menyentuh disk
   ============================================================ */
function selfCheck(file, text) {
  parseXml(text.slice(text.indexOf('<svg'))); // well-formed
  const bad = new Map();
  for (const m of text.matchAll(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)) {
    const h = m[1].toLowerCase();
    if (!G1.has(h)) bad.set(h, (bad.get(h) || 0) + 1);
  }
  if (bad.size) {
    throw new Error(file + ': hex di luar palet G1: '
      + [...bad].map(([h, n]) => '#' + h + ' ×' + n).join(', '));
  }
  for (const larangan of [/url\(#?[^)]*gradient/i, /<linearGradient/, /<radialGradient/, /<filter/, /<image/]) {
    if (larangan.test(text)) throw new Error(file + ': gradien/filter/raster dilarang di sistem karakter');
  }
  if (!/aria-label="/.test(text)) throw new Error(file + ': aria-label hilang');
}

/* ============================================================
   4. LEMBAR KONTAK — satu halaman untuk melihat seluruh sistem
   ============================================================ */
function contactSheet(files) {
  const kel = (pre) => files.filter((f) => f.startsWith(OUT + '/' + pre + '/'));
  const kartu = (f) => '      <figure><img src="../' + f + '" alt=""><figcaption>'
    + f.split('/').pop().replace(/\.svg$/, '') + '</figcaption></figure>';
  const blok = (judul, pre, lebar) => '    <section>\n      <h2>' + judul + '</h2>\n'
    + '      <div class="grid" style="--w:' + lebar + 'px">\n'
    + kel(pre).map(kartu).join('\n') + '\n      </div>\n    </section>';
  return '<!DOCTYPE html>\n<!-- HASIL GENERATE - jangan diedit tangan. Regenerasi: node ' + TOOL + ' -->\n'
    + '<html lang="id">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
    + '<title>FIEZEL - sistem karakter PAW</title>\n<style>\n'
    + 'body{margin:0;padding:24px;background:#FFF4DA;color:#33201F;'
    + 'font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}\n'
    + 'h1{font-size:22px;margin:0 0 4px}p.sub{margin:0 0 24px;opacity:.7}\n'
    + 'h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;margin:32px 0 12px;'
    + 'padding-bottom:6px;border-bottom:2px solid #D8B36B}\n'
    + '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--w),1fr));gap:14px}\n'
    + 'figure{margin:0;background:#fff;border-radius:14px;padding:12px;text-align:center}\n'
    + 'img{width:100%;height:auto;display:block}\n'
    + 'figcaption{margin-top:8px;font-size:12px;opacity:.7;word-break:break-word}\n'
    + '</style>\n</head>\n<body>\n  <main>\n'
    + '    <h1>FIEZEL — sistem karakter PAW</h1>\n'
    + '    <p class="sub">Lembar kontak hasil generate. Sumber bentuk: '
    + RIG_FILE + '. Jangan menyunting berkas ini.</p>\n'
    + [blok('Master', 'master', 200), blok('Ekspresi', 'expressions', 120),
       blok('Pose &amp; gestur', 'poses', 130), blok('Prop', 'props', 90),
       blok('Badge telapak', 'badge', 90), blok('Kit ilustrasi', 'illustrations', 230)].join('\n')
    + '\n  </main>\n</body>\n</html>\n';
}

/* ============================================================
   5. MAIN
   ============================================================ */
function main() {
  const src = read(RIG_FILE);
  const rig = extractRig(src);
  const rigHash = sha256(canonicalRig(src));
  const glyph = pawGlyph();
  const pawHash = sha256(readBuf(PAW_FILE));

  const outputs = new Map();
  const put = (f, text) => { selfCheck(f, text); outputs.set(f, text); };

  // --- master + pose (badan penuh) ---
  put(OUT + '/master/paw-master.svg', buildFull(rig, 'cs-master', rig.POSES.idle,
    { viewBox: '0 0 320 300', label: 'PAW — karakter master FIEZEL', tool: TOOL }));
  for (const [nama, tuple] of Object.entries(rig.POSES)) {
    put(OUT + '/poses/paw-pose-' + nama + '.svg', buildFull(rig, 'cs-p-' + nama, tuple,
      { viewBox: '0 -32 320 332', label: 'PAW — pose ' + nama, tool: TOOL }));
  }
  // --- ekspresi (crop kepala) ---
  for (const [nama, tuple] of Object.entries(rig.EXPRESSIONS)) {
    put(OUT + '/expressions/paw-expr-' + nama + '.svg', buildHead(rig, 'cs-e-' + nama, tuple,
      { viewBox: '22 -22 276 244', label: 'PAW — ekspresi ' + nama, tool: TOOL }));
  }
  // --- prop + badge + adegan ---
  for (const nama of Object.keys(PROPS)) put(OUT + '/props/paw-prop-' + nama + '.svg', buildProp(nama));
  for (const nama of Object.keys(BADGES)) put(OUT + '/badge/paw-badge-' + nama + '.svg', buildBadge(nama, glyph));
  for (const sc of SCENES) put(OUT + '/illustrations/paw-' + sc.id + '.svg', buildScene(sc, rig, glyph));

  const files = [...outputs.keys()].sort();
  const sheet = contactSheet(files);

  const manifest = {
    generator: TOOL,
    sumber: { rig: RIG_FILE, rigHash, glyph: PAW_FILE, glyphHash: pawHash },
    ringkasan: {
      master: 1,
      expressions: Object.keys(rig.EXPRESSIONS).length,
      poses: Object.keys(rig.POSES).length,
      props: Object.keys(PROPS).length,
      badge: Object.keys(BADGES).length,
      illustrations: SCENES.length,
    },
    adegan: SCENES.map((s) => ({ id: s.id, grup: s.grup, pose: s.pose,
      prop: s.prop ? s.prop.nama : null, badge: s.badge || null, label: s.label })),
    files: Object.fromEntries(files.map((f) => [f, sha256(Buffer.from(outputs.get(f)))])
      .concat([[CONTACT, sha256(Buffer.from(sheet))]])),
  };
  const manText = JSON.stringify(manifest, null, 2) + '\n';

  // ---------- mode --check ----------
  if (CHECK) {
    const errs = [];
    if (!exists(MANIFEST)) errs.push(MANIFEST + ' belum ada — jalankan tanpa --check dulu');
    else {
      const lama = JSON.parse(read(MANIFEST));
      if (lama.sumber?.rigHash !== rigHash) errs.push('rig berubah tetapi sistem karakter belum di-generate ulang');
      if (lama.sumber?.glyphHash !== pawHash) errs.push('glyph telapak berubah tetapi lencana belum di-generate ulang');
      for (const [f, want] of Object.entries(manifest.files)) {
        if (!exists(f)) { errs.push(f + ' hilang'); continue; }
        if (sha256(readBuf(f)) !== want) errs.push(f + ' menyimpang dari hasil generate');
      }
      for (const f of Object.keys(lama.files || {})) {
        if (!(f in manifest.files)) errs.push(f + ' masih terdaftar di manifest tetapi tidak lagi di-generate');
      }
    }
    if (errs.length) {
      errs.forEach((e) => console.log('FAIL - ' + e));
      console.log('\nexport-character-system --check: FAIL (' + errs.length + ') — jalankan: node ' + TOOL);
      process.exit(1);
    }
    console.log('export-character-system --check: PASS (' + Object.keys(manifest.files).length + ' berkas segar)');
    return;
  }

  // ---------- tulis ----------
  for (const [f, text] of outputs) {
    fs.mkdirSync(path.dirname(abs(f)), { recursive: true });
    fs.writeFileSync(abs(f), text);
  }
  fs.mkdirSync(path.dirname(abs(CONTACT)), { recursive: true });
  fs.writeFileSync(abs(CONTACT), sheet);
  fs.writeFileSync(abs(MANIFEST), manText);
  console.log('svg  - ' + files.length + ' berkas di ' + OUT + '/');
  console.log('html - ' + CONTACT);
  console.log('man  - ' + MANIFEST + ' (rig ' + rigHash.slice(0, 12) + '…, glyph ' + pawHash.slice(0, 12) + '…)');
  console.log('\nexport-character-system: SELESAI');
}

try { main(); } catch (e) {
  console.error('export-character-system: GAGAL — ' + e.message);
  process.exit(1);
}
