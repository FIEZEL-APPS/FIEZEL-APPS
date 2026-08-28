#!/usr/bin/env node
/**
 * ============================================================
 * PAW bbox regression probe (i8 rig-repair, 2026-08-28)
 * ============================================================
 *
 * KENAPA ADA: 27 dari 49 aset rig (13/16 pose, 11/14 ekspresi, 2/19 state)
 * pernah tampil cacat di produksi — pivot terpasang dua kali karena atribut
 * transform berpivot bake bertabrakan dengan transform-box/transform-origin
 * fiezel-motion.css (audit O3 §4: armR pose thinking terlempar ke x=542 pada
 * viewBox 320). TIDAK ADA gerbang CI yang me-render SVG, jadi kerusakannya
 * lolos diam-diam. Probe ini menutup lubang itu.
 *
 * APA YANG DIUKUR (headless Chromium, rig + motion.css NYATA dari repo):
 *   1. PARITAS A/B — setiap pose & ekspresi di-render DUA kali: dengan
 *      fiezel-motion.css (realita produksi) dan tanpa (geometri murni tuple).
 *      BBox per bagian (lengan, telinga, ekor, kaki, kepala, torso, fz-all)
 *      wajib identik ±2.5px. Kalau menyimpang, ada model origin yang
 *      terpasang dobel lagi.
 *   2. KEWARASAN STATE — 19 state (termasuk level-up/milestone yang lewat
 *      jalur applyFace) settle ±2.6s; bbox fz-all wajib berada di kotak
 *      [-24,-70]..[336,316] (kalibrasi: ekor & lompatan sah melebihi viewBox
 *      beberapa px karena overflow:visible).
 *
 * CARA PAKAI:  node features/mascot/qa/bbox-probe.mjs
 *   Exit 0 = semua lolos. Exit 1 = ada regresi (daftar di stdout).
 *   Butuh playwright ter-install (repo dev env sudah punya 1.59).
 *   TIDAK dipasang di quality.yml (butuh browser); jalankan manual pada
 *   setiap perubahan fiezel-mascot.js / fiezel-motion.css, atau dari QA.
 *   Kontrak statisnya (mekanisme styleAt) dijaga paw-mascot-test.js.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RIG = fs.readFileSync(path.join(ROOT, 'features/mascot/fiezel-mascot.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'features/mascot/fiezel-motion.css'), 'utf8');
const TOL = 2.5;
const BOX = { x0: -24, y0: -70, x1: 336, y1: 316 };

const PAGE = (withCss) => `<!DOCTYPE html><html><head><meta charset="utf-8">
${withCss ? `<style>${CSS}</style>` : ''}
<style>body{margin:0;background:#fff}.cell{display:inline-block;width:220px}
fiezel-mascot{width:200px;display:inline-block}
body.noanim *{animation:none!important;transition:none!important}</style>
</head><body><div id="root"></div><script>${RIG}<\/script><script>
window.buildGrid=function(mode,names){const r=document.getElementById('root');r.innerHTML='';
names.forEach(n=>{const c=document.createElement('div');c.className='cell';c.dataset.name=n;
const m=document.createElement('fiezel-mascot');c.appendChild(m);r.appendChild(c);
if(mode==='pose')m.applyPose(n);else if(mode==='face')m.applyFace(n);else m.setState(n,{hold:0});});};
window.probe=function(){const P=['fz-all','fz-head','fz-torso','fz-arm-l','fz-arm-r','fz-ear-l',
'fz-ear-r','fz-tail-base','fz-tail-tip','fz-foot-l','fz-foot-r'];const out=[];
document.querySelectorAll('.cell').forEach(c=>{const svg=c.querySelector('svg');
const sr=svg.getBoundingClientRect();const s=sr.width/320;const rec={name:c.dataset.name,parts:{}};
P.forEach(p=>{const el=svg.querySelector('.'+p);if(!el)return;const r=el.getBoundingClientRect();
rec.parts[p]={x:(r.left-sr.left)/s,y:(r.top-sr.top)/s,w:r.width/s,h:r.height/s};});out.push(rec);});
return out;};
window.rigInfo=function(){const C=customElements.get('fiezel-mascot');
return {states:C.states,poses:C.poses,expressions:C.expressions};};
<\/script></body></html>`;

const b = await chromium.launch();
const mk = async (withCss) => {
  const pg = await b.newPage({ viewport: { width: 1220, height: 980 } });
  await pg.setContent(PAGE(withCss), { waitUntil: 'load' });
  await pg.waitForFunction(() => !!customElements.get('fiezel-mascot'));
  await pg.evaluate(() => document.body.classList.add('noanim'));
  return pg;
};
const grid = async (pg, mode, names, delay) => {
  await pg.evaluate(({ mode, names }) => window.buildGrid(mode, names), { mode, names });
  await pg.waitForTimeout(delay);
  return pg.evaluate(() => window.probe());
};

const live = await mk(true);
const ref = await mk(false);
const info = await live.evaluate(() => window.rigInfo());
const fails = [];

for (const [mode, names] of [['pose', info.poses], ['face', info.expressions]]) {
  const a = await grid(live, mode, names, 700);
  const r = await grid(ref, mode, names, 700);
  a.forEach((rec, i) => {
    for (const p of Object.keys(rec.parts)) {
      if (!r[i].parts[p]) continue;
      const d = Math.max(...['x', 'y', 'w', 'h'].map(k => Math.abs(rec.parts[p][k] - r[i].parts[p][k])));
      if (d > TOL) fails.push(`${mode} ${rec.name}: ${p} menyimpang ${d.toFixed(1)}px dari geometri tuple (pivot dobel?)`);
    }
  });
  console.log(`ok - paritas A/B ${mode} (${names.length} item)` + (fails.length ? ' — LIHAT FAIL DI BAWAH' : ''));
}

await live.evaluate(() => document.body.classList.remove('noanim'));
const st = await (async () => { await grid(live, 'state', info.states, 0); await live.waitForTimeout(2600); return live.evaluate(() => window.probe()); })();
st.forEach(rec => {
  const a = rec.parts['fz-all'];
  if (a.x < BOX.x0 || a.y < BOX.y0 || a.x + a.w > BOX.x1 || a.y + a.h > BOX.y1) {
    fails.push(`state ${rec.name}: fz-all bbox liar (${a.x.toFixed(0)},${a.y.toFixed(0)} ${a.w.toFixed(0)}x${a.h.toFixed(0)})`);
  }
});
console.log(`ok - kewarasan bbox 19 state`);
await b.close();

console.log('');
if (fails.length) {
  fails.forEach(f => console.log('FAIL - ' + f));
  console.log(`PAW bbox probe: FAIL (${fails.length})`);
  process.exit(1);
}
console.log('PAW bbox probe: PASS');
