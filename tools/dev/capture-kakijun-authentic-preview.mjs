// tools/dev/capture-kakijun-authentic-preview.mjs
// Captures high-res visual verification of authentic KanjiVG Hiragana 'あ',
// animated stroke guide, and Character Selector Drawer.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 8091;
const ROOT = path.resolve('.');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/app/') reqPath = '/index.html';
  const filePath = path.join(ROOT, reqPath.replace(/^\//, ''));
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

async function main() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Server running at http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('fz_target_course', 'ja');
    localStorage.setItem('fz_course_selected', 'ja');
    localStorage.setItem('fiezel_onboarding_completed', 'true');
    localStorage.setItem('fiezel_lang_chosen', 'id');
    localStorage.setItem('fiezel_auth_session', JSON.stringify({ role: 'murid', via: 'test' }));
    localStorage.setItem('fz_auth_session', JSON.stringify({ role: 'murid', via: 'test' }));
    localStorage.setItem('fiezel_auth_done', 'true');
    localStorage.setItem('fz_state_v1@ja', JSON.stringify({
      level: 1, jaLevel: 'KANA', placementDone: true, view: 'kana',
      preferences: { learnerLocale: 'id', role: 'murid', activeLevel: 'KANA' }
    }));
    localStorage.setItem('fz_state_v1', JSON.stringify({
      level: 1, jaLevel: 'KANA', placementDone: true, view: 'kana',
      preferences: { learnerLocale: 'id', role: 'murid', activeLevel: 'KANA' }
    }));
  });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Setup view and open Studio
  await page.evaluate(async () => {
    const style = document.createElement('style');
    style.textContent = '.fiezel-ob, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-auth-open');
    if (window.switchTargetLangStorage) window.switchTargetLangStorage('ja');
    if (window.FiezelI18n?.setCourse) window.FiezelI18n.setCourse('ja');
    if (window.load) await window.load({ kontenSaja: true });
    if (window.dismissWelcome) window.dismissWelcome();
    if (window.go) window.go('kana');
    // Open Kakijun studio on 'あ'
    if (window.FiezelKakijunStudio) {
      window.FiezelKakijunStudio.open('あ');
    }
  });

  await page.waitForTimeout(600);

  // Capture 'あ' initial guided view (with KanjiVG ghost trace & number badge 1)
  const shotA = path.join(ROOT, 'reports/kakijun-authentic-a-guided.png');
  await page.screenshot({ path: shotA });
  console.log(`Saved screenshot of 'あ': ${shotA}`);

  // Now click "Pilih Huruf" to verify the Character Grid Picker Drawer
  await page.evaluate(() => {
    const btn = document.getElementById('kakijunOpenPickerBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(400);

  const shotDrawer = path.join(ROOT, 'reports/kakijun-drawer-picker.png');
  await page.screenshot({ path: shotDrawer });
  console.log(`Saved screenshot of character drawer: ${shotDrawer}`);

  // Switch to Kanji tab in drawer
  await page.evaluate(() => {
    const tab = document.querySelector('[data-picker-tab="kanji"]');
    if (tab) tab.click();
  });
  await page.waitForTimeout(300);

  const shotKanjiDrawer = path.join(ROOT, 'reports/kakijun-kanji-picker.png');
  await page.screenshot({ path: shotKanjiDrawer });
  console.log(`Saved screenshot of Kanji drawer: ${shotKanjiDrawer}`);

  await browser.close();
  server.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
