import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = process.cwd();

// Simple static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/app/') reqPath = '/index.html';
  if (reqPath.startsWith('/app/')) reqPath = reqPath.replace('/app/', '/');

  const filePath = path.join(root, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.mp3': 'audio/mpeg',
  };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(4174, async () => {
  console.log('Static server listening on http://localhost:4174');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await context.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rani' }));
      localStorage.setItem('fiezel-state-v1', JSON.stringify({
        preferences: { learnerLocale: 'id', learnerLocaleExplicit: true, learningIntensity: 'santai', learningIntensityChosen: true, motion: false },
        level: 1,
        activeLevel: 'A1',
        history: [],
        grammar: {},
        toursSeen: { menu: true, library: true, listening: true }
      }));
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-reminder-invite-v1', JSON.stringify({ offers: 9, decided: true }));
      localStorage.setItem('fiezel-puter-auth-skipped', '1');
      localStorage.setItem('fiezel-tour-seen', '1');
      localStorage.setItem('fz_tour_menu', '1');
      localStorage.setItem('fz_tour_library', '1');
      localStorage.setItem('fz_tour_listening', '1');
      localStorage.setItem('fz_tour_seen', '1');
      localStorage.setItem('fz_tour_done', '1');
      window.FiezelTour = null;
    } catch (_) {}
  });
  const page = await context.newPage();

  try {
    console.log('--- 1. Navigating to /index.html (PWA Home) ---');
    await page.goto('http://localhost:4174/index.html', { waitUntil: 'networkidle' });

    // Wait for today-home-cockpit
    await page.waitForSelector('.today-home-cockpit', { timeout: 10000 });
    console.log('✓ .today-home-cockpit loaded');

    // Check voice-studio-home-card
    const studioCard = await page.locator('[data-testid="voice-studio-home-card"]').first();
    const isVisible = await studioCard.isVisible();
    console.log('Studio Card visible on Home screen:', isVisible);
    if (!isVisible) {
      throw new Error('Studio Suara AI card is not visible on Home screen!');
    }

    const titleText = await studioCard.locator('h3').textContent();
    console.log('Studio Card title:', titleText);

    const ctaBtn = await studioCard.locator('[data-testid="voice-studio-cta"]').first();
    const ctaHref = await ctaBtn.getAttribute('href');
    console.log('CTA href:', ctaHref);
    if (!ctaHref.includes('call.html')) {
      throw new Error('CTA href must point to call.html');
    }

    console.log('✓ Main PWA Home Studio Suara card verified successfully');
  } catch (err) {
    console.error('PROBE FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
});
