import { chromium } from 'playwright';
import http from 'http';
import path from 'path';
import fs from 'fs';

const PORT = 8139;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.mjs': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    await page.goto('http://127.0.0.1:' + PORT + '/index.html');
    await page.waitForTimeout(1500);

    // Setup a clean container
    await page.evaluate(async () => {
      document.body.innerHTML = '<div id="previewMochi" style="width:340px;height:340px;margin:40px auto;background:#FDFAF3;border-radius:24px;box-shadow:0 12px 36px rgba(0,0,0,0.08);"></div>';
      const mod = await import('./mochi-mascot/fiezel-mochi.js');
      const mochi = new mod.FiezelMochi('#previewMochi', { width: 340, height: 340 });
      mochi.isVisible = true;
      window.__previewMochi = mochi;
    });

    await page.waitForTimeout(400);

    const saveCanvas = async (outPath) => {
      const dataUrl = await page.evaluate(() => {
        const c = document.querySelector('canvas');
        return c ? c.toDataURL('image/png') : null;
      });
      if (dataUrl) {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
        console.log('Saved ' + outPath + ' (' + fs.statSync(outPath).size + ' bytes)');
      }
    };

    // 1. Listening Headset Snapshot
    await page.evaluate(() => {
      const m = window.__previewMochi;
      m.isVisible = true;
      m.setAccessory('headset');
      m.setBadge(null);
      m.setAura('blue');
      for (let i = 0; i < 30; i++) {
        m.update(0.033);
      }
      m.render();
    });
    await page.waitForTimeout(100);
    await saveCanvas('tests/output/mochi_headset_listening.png');

    // 2. Reading Glasses Snapshot
    await page.evaluate(() => {
      const m = window.__previewMochi;
      m.setAccessory('glasses');
      m.setAura(null);
      for (let i = 0; i < 30; i++) {
        m.update(0.033);
      }
      m.render();
    });
    await page.waitForTimeout(100);
    await saveCanvas('tests/output/mochi_glasses_reading.png');

    // 3. Writing Pencil Snapshot
    await page.evaluate(() => {
      const m = window.__previewMochi;
      m.setAccessory('pencil');
      for (let i = 0; i < 30; i++) {
        m.update(0.033);
      }
      m.render();
    });
    await page.waitForTimeout(100);
    await saveCanvas('tests/output/mochi_pencil_writing.png');

    // 4. Thinking Badge Snapshot
    await page.evaluate(() => {
      const m = window.__previewMochi;
      m.setAccessory(null);
      m.setThinking(true);
      for (let i = 0; i < 30; i++) {
        m.update(0.033);
      }
      m.render();
    });
    await page.waitForTimeout(100);
    await saveCanvas('tests/output/mochi_thinking_badge.png');

    // 5. Talking Mouth Snapshot
    await page.evaluate(() => {
      const m = window.__previewMochi;
      m.setThinking(false);
      m.setTalking(true, 5.0);
      m.talkTimer = 0.12; // peak mouth opening
      m.update(0.033);
      m.render();
    });
    await page.waitForTimeout(100);
    await saveCanvas('tests/output/mochi_talking_mouth.png');

    await browser.close();
    server.close();
    console.log('Visual snapshots complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    server.close();
    process.exit(1);
  }
});
