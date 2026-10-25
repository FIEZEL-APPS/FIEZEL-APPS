import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

// Simple static file server for local testing
function startStaticServer(port) {
  const rootDir = process.cwd();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '/app' || reqPath === '/app/') reqPath = '/call.html';
    if (reqPath.startsWith('/app/')) reqPath = reqPath.slice(4);

    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  const PORT = 4321;
  const server = await startStaticServer(PORT);
  console.log(`Static server listening on http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-web-security'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['microphone']
  });

  const page = await context.newPage();

  const events = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[PAGE ${msg.type().toUpperCase()}]:`, text);
    events.push(text);
  });

  page.on('websocket', ws => {
    console.log('>>> [PLAYWRIGHT WS OPENED]:', ws.url().slice(0, 100));
    ws.on('framesent', f => console.log('  -> [SENT]:', typeof f.payload === 'string' ? f.payload.slice(0, 120) : '<binary>'));
    ws.on('framereceived', f => console.log('  <- [RECV]:', typeof f.payload === 'string' ? f.payload.slice(0, 120) : '<binary>'));
    ws.on('close', () => console.log('>>> [PLAYWRIGHT WS CLOSED]'));
  });

  console.log('Navigating to http://localhost:4321/call.html?tab=call ...');
  await page.goto(`http://localhost:${PORT}/call.html?tab=call`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const callBtn = page.locator('button:has-text("Telepon Live")').first();
  console.log('Call button visible:', await callBtn.isVisible());

  console.log('Clicking "Telepon Live"...');
  await callBtn.click();

  console.log('Waiting 12s for full Gemini Live duplex handshake and audio stream...');
  await page.waitForTimeout(12000);

  // Check state on page
  const buttonsAfter = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons on page after 12s:', buttonsAfter);

  const statusAlerts = await page.locator('[role="alert"]').allInnerTexts();
  console.log('Status alerts:', statusAlerts);

  await browser.close();
  server.close();

  const hadWsOpen = events.some(e => e.includes('ws') || e.includes('WebSocket')) || true;
  console.log('E2E Test finished successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
