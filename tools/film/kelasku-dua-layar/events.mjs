// node events.mjs — ekspor naskah waktu film (T, VO, shot, penerbangan kapsul) ke audio/events.json.
// Jalankan ulang setiap kali web/film.js diubah, lalu bangun ulang audio (lihat README).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { serve } from './serve.mjs';
import { launchOpts } from './chrome.mjs';
const port = Number(process.env.FZ_PORT || 8931) + 3;
const srv = await serve(port);
const b = await chromium.launch(launchOpts());
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto(`http://127.0.0.1:${port}/web/index.html`);
await p.waitForFunction('window.ready === true', null, { timeout: 120000 });
const fz = await p.evaluate(() => JSON.parse(JSON.stringify(window.FZ)));
fs.mkdirSync('audio', { recursive: true });
fs.writeFileSync('audio/events.json', JSON.stringify(fz, null, 1));
console.log('audio/events.json:', Object.keys(fz.T).length, 'kunci T,', fz.VO.length, 'baris VO,', fz.FLIGHTS.length, 'kapsul,', fz.SHOTS.length, 'shot');
await b.close(); srv.close();
