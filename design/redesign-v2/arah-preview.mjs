/* Render empat ARAH DESAIN jadi satu gambar per arah, untuk dipilih owner. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { siapkanHuruf, KELUARGA } from './fonts.mjs';
import * as A from './arah-a.mjs';
import * as B from './arah-b.mjs';
import * as C from './arah-c.mjs';
import * as D from './arah-d.mjs';

const REPO = '/home/user/FIEZEL-APPS';
const OUT = process.env.ARAH_DIR
  || '/tmp/claude-0/-home-user/07652769-322a-5d8e-91f1-f2d820b3f3c1/scratchpad/arah';
mkdirSync(OUT, { recursive: true });

const GAMBAR = [
  'team/shoulder-wave', 'team/hat-peek', 'team/teaching', 'team/highfive',
  'nusa/head-happy', 'nusa/full-thinking', 'nusa/full-oops',
  'mira/full-cheer', 'mira/head-explain'
];
for (const g of GAMBAR) {
  const [c, p] = g.split('/');
  copyFileSync(join(REPO, `assets/characters/${c}/webp/${p}.webp`), join(OUT, `${p}.webp`));
}

const faces = await siapkanHuruf(KELUARGA, OUT);

const ARAH = [
  ['A', 'Kartu Tebal', A, 'Kartu bergaris tebal, bayangan padat, huruf Fredoka. Paling ramai, paling ramah anak.'],
  ['B', 'Lembut', B, 'Tanpa garis tepi, bayangan halus, ruang lapang, huruf Quicksand. Paling tenang.'],
  ['C', 'Editorial Rimba', C, 'Hijau rimba sebagai permukaan, garis rambut emas, judul serif Lora. Paling dewasa.'],
  ['D', 'Blok Warna', D, 'Tanpa kartu: pita warna penuh dari tepi ke tepi, huruf Archivo tebal. Paling berani.']
];
const LAYAR = ['Home', 'Latihan', 'Soal'];
const JUDUL_LAYAR = { Home: 'Hari ini', Latihan: 'Latihan', Soal: 'Soal' };

const SUNTIK = `<style>\n${faces}x-dc{display:block;}helmet{display:none;}</style>`;
for (const [kode, , mod] of ARAH) {
  for (const layar of LAYAR) {
    const html = mod[layar]().replace('</helmet>', SUNTIK + '\n</helmet>');
    writeFileSync(join(OUT, `${kode}-${layar}.html`), html);
  }
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
});
const laporan = [];

for (const [kode, , mod] of ARAH) {
  for (const layar of LAYAR) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**fonts.googleapis.com**', (r) => r.abort());
    await page.route('**fonts.gstatic.com**', (r) => r.abort());
    await page.goto('file://' + join(OUT, `${kode}-${layar}.html`), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    /* Luberan isi keluar bingkai, dan maskot yang terpotong wadahnya. */
    const cek = await page.evaluate(() => {
      const akar = document.querySelector('x-dc > div');
      const terpotong = (el) => {
        for (let n = el.parentElement; n && n !== akar; n = n.parentElement) {
          if (getComputedStyle(n).overflow !== 'visible') return n;
        }
        return null;
      };
      let bawah = 0;
      for (const el of akar.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (!r.height || !r.width || terpotong(el)) continue;
        bawah = Math.max(bawah, r.bottom);
      }
      /* Maskot: apakah ada sisi gambar yang jatuh di luar wadah pemotongnya? */
      const bocor = [];
      for (const img of akar.querySelectorAll('img')) {
        const r = img.getBoundingClientRect();
        const pemotong = terpotong(img);
        const batas = pemotong ? pemotong.getBoundingClientRect()
          : akar.getBoundingClientRect();
        const sisi = [];
        if (r.left < batas.left - 0.5) sisi.push('kiri');
        if (r.right > batas.right + 0.5) sisi.push('kanan');
        if (r.top < batas.top - 0.5) sisi.push('atas');
        if (r.bottom > batas.bottom + 0.5) sisi.push('bawah');
        if (sisi.length) bocor.push((img.getAttribute('src') || '?') + ' → ' + sisi.join('+'));
      }
      return { bawah: Math.round(bawah), bocor };
    });
    await page.screenshot({ path: join(OUT, `${kode}-${layar}.png`) });
    await page.close();
    laporan.push({ kode, layar, ...cek });
  }
}

/* Satu lembar per arah: tiga layar berjajar + judul dan penjelasan. */
for (const [kode, nama, , catatan] of ARAH) {
  const kartu = LAYAR.map((l) => `<div style="display:flex;flex-direction:column;gap:10px;">
      <div style="font:600 15px/1 system-ui;color:#5B5149;">${JUDUL_LAYAR[l]}</div>
      <img src="${kode}-${l}.png" style="width:390px;height:844px;border-radius:22px;
        box-shadow:0 10px 30px rgba(0,0,0,.13);">
    </div>`).join('');
  const html = `<!doctype html><meta charset="utf-8">
    <link rel="stylesheet" href="_sheet.css">
    <body style="margin:0;padding:40px;background:#EFE8DE;width:1460px;">
      <div style="font:800 40px/1 system-ui;letter-spacing:-0.02em;color:#1F1912;">
        Arah ${kode} — ${nama}</div>
      <div style="font:500 17px/1.5 system-ui;color:#5B5149;margin-top:12px;max-width:900px;">
        ${catatan}</div>
      <div style="display:flex;gap:36px;margin-top:30px;">${kartu}</div>
    </body>`;
  writeFileSync(join(OUT, `_lembar-${kode}.html`), html);
  writeFileSync(join(OUT, '_sheet.css'), '');
  const page = await browser.newPage({ viewport: { width: 1460, height: 1100 } });
  await page.goto('file://' + join(OUT, `_lembar-${kode}.html`), { waitUntil: 'load' });
  await page.screenshot({ path: join(OUT, `arah-${kode}.png`), fullPage: true });
  await page.close();
}

await browser.close();

let bocorTotal = 0;
for (const r of laporan) {
  const lebih = r.bawah - 844;
  const st = lebih > 2 ? `LUBER ${lebih}px` : 'ok';
  bocorTotal += r.bocor.length;
  console.log(`${r.kode}-${r.layar}`.padEnd(14), String(r.bawah).padStart(5), ' ', st.padEnd(12),
    r.bocor.length ? 'MASKOT BOCOR: ' + r.bocor.join(' | ') : 'maskot utuh');
}
console.log(`\n${laporan.length} layar · ${bocorTotal} maskot bocor`);
