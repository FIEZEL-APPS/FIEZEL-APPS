// node tools/shot.mjs <url-path> <out.png> [w] [h] — tangkapan halaman uji.
import { chromium } from 'playwright-core';
import { serve } from '../serve.mjs';
const [,, u, out, w = 1080, h = 1920] = process.argv;
const srv = await serve(8933);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await p.goto('http://127.0.0.1:8933' + u); await p.waitForFunction('window.ready', null, { timeout: 60000 });
await p.screenshot({ path: out, fullPage: true }); await b.close(); srv.close();
