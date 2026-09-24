import { chromium } from 'playwright-core';
import { serve } from '../serve.mjs';
import { launchOpts } from '../chrome.mjs';
const srv = await serve(8951); const b = await chromium.launch(launchOpts()); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('ERR', e.message));
await p.goto('http://127.0.0.1:8951/web/index.html'); await p.waitForFunction('window.ready===true', null, { timeout: 120000 });
const expr = process.argv[2]; console.log(JSON.stringify(await p.evaluate(expr), null, 0));
await b.close(); srv.close();
