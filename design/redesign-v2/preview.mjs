/* Pratinjau lokal: render tiap artboard di Chromium untuk memeriksa luberan.
   Hanya menyentuh SALINAN di direktori scratchpad — berkas kerja tidak diubah. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = '/home/user/FIEZEL-APPS/design/redesign-v2';
const REPO = '/home/user/FIEZEL-APPS';
const OUT = process.env.PREVIEW_DIR || '/tmp/claude-0/-home-user/07652769-322a-5d8e-91f1-f2d820b3f3c1/scratchpad/preview';
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'shot'), { recursive: true });

export const GAMBAR = [
  'assets/characters/team/webp/shoulder-wave.webp',
  'assets/characters/team/webp/hat-peek.webp',
  'assets/characters/team/webp/teaching.webp',
  'assets/characters/team/webp/highfive.webp',
  'assets/characters/nusa/webp/head-happy.webp',
  'assets/characters/nusa/webp/full-thinking.webp',
  'assets/characters/nusa/webp/full-oops.webp',
  'assets/characters/mira/webp/full-cheer.webp',
  'assets/characters/mira/webp/head-explain.webp'
];

for (const g of GAMBAR) copyFileSync(join(REPO, g), join(OUT, g.split('/').pop()));

/* huruf lokal supaya pratinjau tidak bergantung jaringan */
const FDIR = join(REPO, 'design/redesign-v1/prototype/fonts');
let faces = '';
for (const f of readdirSync(FDIR)) {
  copyFileSync(join(FDIR, f), join(OUT, f));
  const w = f.match(/-(\d+)\.woff2$/);
  if (w) faces += `@font-face{font-family:'Plus Jakarta Sans';src:url('${f}') format('woff2');`
    + `font-weight:${w[1]};font-style:normal;font-display:block;}\n`;
}

const canvas = JSON.parse(readFileSync(join(SRC, 'canvas.json'), 'utf8'));
const SUNTIK = `<style>\n${faces}x-dc{display:block;}helmet{display:none;}</style>`;

for (const ab of canvas.artboards) {
  const html = readFileSync(join(SRC, ab.file), 'utf8').replace('</helmet>', SUNTIK + '\n</helmet>');
  writeFileSync(join(OUT, ab.file.replace('.dc.html', '.html')), html);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const laporan = [];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const ab of canvas.artboards) {
  const nama = ab.file.replace('.dc.html', '');
  if (ONLY && !ONLY.includes(nama)) continue;
  const page = await browser.newPage({ viewport: { width: ab.w, height: ab.h }, deviceScaleFactor: 1 });
  await page.route('**fonts.googleapis.com**', (r) => r.abort());
  await page.route('**fonts.gstatic.com**', (r) => r.abort());
  await page.goto('file://' + join(OUT, nama + '.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  /* akar artboard = anak pertama x-dc; cek apakah isinya meluber keluar bingkai */
  const luber = await page.evaluate((h) => {
    const akar = document.querySelector('x-dc > div');
    if (!akar) return { err: 'akar tidak ketemu' };
    const terpotong = (el) => {
      for (let n = el.parentElement; n && n !== akar; n = n.parentElement) {
        if (getComputedStyle(n).overflow !== 'visible') return true;
      }
      return false;
    };
    let bawah = 0, kanan = 0;
    for (const el of akar.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width || terpotong(el)) continue;
      bawah = Math.max(bawah, r.bottom); kanan = Math.max(kanan, r.right);
    }
    return { bawah: Math.round(bawah), kanan: Math.round(kanan), tinggi: h };
  }, ab.h);
  await page.screenshot({ path: join(OUT, 'shot', nama + '.png') });
  await page.close();
  laporan.push({ nama, ...luber, w: ab.w, h: ab.h });
}

/* lembar kontak per halaman */
for (const pg of (ONLY ? [] : canvas.pages)) {
  const ab = canvas.artboards.filter((a) => a.page === pg.id);
  const skala = 0.42;
  const kartu = ab.map((a) => {
    const nama = a.file.replace('.dc.html', '');
    return `<div style="display:flex;flex-direction:column;gap:8px;">
      <div style="font:700 15px/1 system-ui;color:#22190F;">${nama}</div>
      <img src="shot/${nama}.png" style="width:${Math.round(a.w * skala)}px;height:auto;
        border:1px solid #DCCFB8;border-radius:8px;background:#fff;">
    </div>`;
  }).join('');
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:24px;background:#EDE4D4;">
    <div style="font:800 22px/1 system-ui;margin-bottom:18px;color:#22190F;">${pg.name}</div>
    <div style="display:flex;gap:20px;align-items:flex-start;">${kartu}</div></body>`;
  writeFileSync(join(OUT, 'sheet-' + pg.id + '.html'), html);
  const page = await browser.newPage({ viewport: { width: 2400, height: 1200 } });
  await page.route('**fonts.googleapis.com**', (r) => r.abort());
  await page.goto('file://' + join(OUT, 'sheet-' + pg.id + '.html'), { waitUntil: 'load' });
  await page.screenshot({ path: join(OUT, 'sheet-' + pg.id + '.png'), fullPage: true });
  await page.close();
}

await browser.close();
console.log('artboard'.padEnd(14), 'bingkai'.padEnd(12), 'isi-bawah', ' status');
for (const r of laporan) {
  const lebih = r.bawah - r.h;
  const st = lebih > 2 ? `LUBER ${lebih}px` : lebih > -8 ? 'pas' : 'ok';
  console.log(r.nama.padEnd(14), `${r.w}x${r.h}`.padEnd(12), String(r.bawah).padStart(9), ' ', st);
}
