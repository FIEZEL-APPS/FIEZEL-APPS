/* Pratinjau lokal + gerbang render untuk arah "Lembut".
   Memeriksa tiga hal yang tidak bisa dilihat dari kode saja:
     1. isi yang meluber keluar bingkai artboard,
     2. maskot yang terpotong wadahnya,
     3. maskot yang dirender di bawah ambang MIN_MASKOT.
   Hanya menulis ke direktori scratchpad — berkas kerja tidak disentuh. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { siapkanHuruf } from './fonts.mjs';
import { HURUF, MIN_MASKOT } from './b-kit.mjs';

const SRC = '/home/user/FIEZEL-APPS/design/redesign-v2';
const REPO = '/home/user/FIEZEL-APPS';
const OUT = process.env.PREVIEW_DIR
  || '/tmp/claude-0/-home-user/07652769-322a-5d8e-91f1-f2d820b3f3c1/scratchpad/lembut';
mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'shot'), { recursive: true });

export const GAMBAR = [
  'team/shoulder-wave', 'team/hat-peek', 'team/teaching', 'team/highfive',
  'nusa/head-happy', 'nusa/full-thinking', 'nusa/full-oops',
  'mira/full-cheer', 'mira/head-explain'
];
for (const g of GAMBAR) {
  const [c, p] = g.split('/');
  copyFileSync(join(REPO, `assets/characters/${c}/webp/${p}.webp`), join(OUT, `${p}.webp`));
}

const faces = await siapkanHuruf(HURUF, OUT);
const canvas = JSON.parse(readFileSync(join(SRC, 'canvas.json'), 'utf8'));
const SUNTIK = `<style>\n${faces}x-dc{display:block;}helmet{display:none;}</style>`;

const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const daftar = canvas.artboards.filter(
  (a) => !ONLY || ONLY.includes(a.file.replace('.dc.html', '')));

for (const ab of daftar) {
  const html = readFileSync(join(SRC, ab.file), 'utf8').replace('</helmet>', SUNTIK + '\n</helmet>');
  writeFileSync(join(OUT, ab.file.replace('.dc.html', '.html')), html);
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});
const laporan = [];

for (const ab of daftar) {
  const nama = ab.file.replace('.dc.html', '');
  const page = await browser.newPage({ viewport: { width: ab.w, height: ab.h }, deviceScaleFactor: 1 });
  await page.route('**fonts.googleapis.com**', (r) => r.abort());
  await page.route('**fonts.gstatic.com**', (r) => r.abort());
  await page.goto('file://' + join(OUT, nama + '.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);

  const cek = await page.evaluate((min) => {
    const akar = document.querySelector('x-dc > div');
    const pemotong = (el) => {
      for (let n = el.parentElement; n && n !== akar; n = n.parentElement) {
        if (getComputedStyle(n).overflow !== 'visible') return n;
      }
      return null;
    };
    let bawah = 0, kanan = 0;
    for (const el of akar.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.height || !r.width || pemotong(el)) continue;
      bawah = Math.max(bawah, r.bottom);
      kanan = Math.max(kanan, r.right);
    }
    const bocor = [], kecil = [];
    for (const img of akar.querySelectorAll('img')) {
      const r = img.getBoundingClientRect();
      const p = pemotong(img);
      const batas = (p || akar).getBoundingClientRect();
      const sisi = [];
      if (r.left < batas.left - 0.5) sisi.push('kiri');
      if (r.right > batas.right + 0.5) sisi.push('kanan');
      if (r.top < batas.top - 0.5) sisi.push('atas');
      if (r.bottom > batas.bottom + 0.5) sisi.push('bawah');
      const src = (img.getAttribute('src') || '?');
      if (sisi.length) bocor.push(src + ' → ' + sisi.join('+'));
      if (Math.max(r.width, r.height) < min) {
        kecil.push(`${src} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    return { bawah: Math.round(bawah), kanan: Math.round(kanan), bocor, kecil };
  }, MIN_MASKOT);

  await page.screenshot({ path: join(OUT, 'shot', nama + '.png') });
  await page.close();
  laporan.push({ nama, w: ab.w, h: ab.h, ...cek });
}

/* lembar kontak per halaman */
if (!ONLY) {
  for (const pg of canvas.pages) {
    const ab = canvas.artboards.filter((a) => a.page === pg.id);
    const skala = 0.44;
    const kartu = ab.map((a) => {
      const nama = a.file.replace('.dc.html', '');
      return `<div style="display:flex;flex-direction:column;gap:9px;">
        <div style="font:600 15px/1 system-ui;color:#6E635C;">${nama}</div>
        <img src="shot/${nama}.png" style="width:${Math.round(a.w * skala)}px;height:auto;
          border-radius:16px;box-shadow:0 10px 28px rgba(0,0,0,.12);">
      </div>`;
    }).join('');
    const html = `<!doctype html><meta charset="utf-8">
      <body style="margin:0;padding:38px;background:#EFE8E1;">
        <div style="font:800 34px/1 system-ui;letter-spacing:-0.02em;color:#2E2724;">${pg.name}</div>
        <div style="display:flex;gap:26px;margin-top:24px;align-items:flex-start;">${kartu}</div>
      </body>`;
    writeFileSync(join(OUT, 'sheet-' + pg.id + '.html'), html);
    const page = await browser.newPage({ viewport: { width: 2400, height: 1200 } });
    await page.goto('file://' + join(OUT, 'sheet-' + pg.id + '.html'), { waitUntil: 'load' });
    await page.screenshot({ path: join(OUT, 'sheet-' + pg.id + '.png'), fullPage: true });
    await page.close();
  }
}

await browser.close();

let luber = 0, bocor = 0, kecil = 0;
console.log('artboard'.padEnd(13), 'bingkai'.padEnd(11), 'status');
for (const r of laporan) {
  const lebihB = r.bawah - r.h, lebihK = r.kanan - r.w;
  const st = [];
  if (lebihB > 2) { st.push(`LUBER-BAWAH ${lebihB}px`); luber++; }
  if (lebihK > 2) { st.push(`LUBER-KANAN ${lebihK}px`); luber++; }
  if (r.bocor.length) { st.push('MASKOT BOCOR: ' + r.bocor.join(' | ')); bocor += r.bocor.length; }
  if (r.kecil.length) { st.push('MASKOT TERLALU KECIL: ' + r.kecil.join(' | ')); kecil += r.kecil.length; }
  console.log(r.nama.padEnd(13), `${r.w}x${r.h}`.padEnd(11), st.length ? st.join(' · ') : 'ok');
}
const total = luber + bocor + kecil;
console.log(`\n${laporan.length} layar · ${luber} luberan · ${bocor} maskot bocor · `
  + `${kecil} maskot di bawah ${MIN_MASKOT}px`);
if (total > 0) {
  console.error('GAGAL: gerbang render menolak.');
  process.exit(1);
}
