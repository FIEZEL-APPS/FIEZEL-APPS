/**
 * tools/dev/quick-screenshot.mjs
 *
 * Fast-Track Single-Command Screenshot Capture for FIEZEL PWA
 * Usage:
 *   node tools/dev/quick-screenshot.mjs [--view=home|kana|chat|vocab|grammar] [--device=mobile|desktop|tablet] [--course=ja|en] [--name=custom-name.png] [--live]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const rootDir = process.cwd();
const req = createRequire(import.meta.url);
let pwPkg = null;
for (const cand of [
  'playwright',
  path.join(rootDir, 'node_modules/playwright'),
  path.resolve(rootDir, '../fiezel-apps/node_modules/playwright')
]) {
  try { pwPkg = req(cand); break; } catch (_) {}
}
if (!pwPkg) throw new Error('playwright module not found in workspace or sibling fiezel-apps');
const { chromium } = pwPkg;
const artifactDir = process.env.ARTIFACT_DIR || 'C:/Users/hp/.gemini/antigravity/brain/4c759766-7170-46d2-b12f-2017cc49bf5f';

// Load latest build version from single source of truth
let latestBuild = 'unknown';
try {
  const buildJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'coordination', 'BUILD-VERSION.json'), 'utf8'));
  latestBuild = buildJson.version || 'unknown';
} catch (_) {}

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(prefix, def) {
  const hit = args.find(a => a.startsWith(`--${prefix}=`));
  return hit ? hit.split('=')[1] : def;
}
const hasFlag = (flag) => args.includes(`--${flag}`);

const targetView = getArg('view', 'home');
const targetCourse = getArg('course', 'ja');
const targetDevice = getArg('device', 'mobile'); // 'mobile' | 'desktop' | 'tablet'
const targetStory = getArg('story', '');
const targetScene = getArg('scene', '');
const isLive = hasFlag('live');
const customName = getArg('name', `${targetCourse}-${targetView}-${targetDevice}.png`);

const VIEWPORTS = {
  mobile: { width: 390, height: 844, scale: 2 },
  desktop: { width: 1280, height: 800, scale: 1 },
  tablet: { width: 768, height: 1024, scale: 2 }
};

const vp = VIEWPORTS[targetDevice] || VIEWPORTS.mobile;

function startStaticServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0];
      let filePath = path.join(rootDir, reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, ''));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg'
        };
        res.writeHead(200, {
          'Content-Type': mime[ext] || 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function main() {
  const startTime = Date.now();
  let server = null;
  let targetUrl = 'https://fiezel.my.id/app/';

  if (!isLive) {
    const s = await startStaticServer();
    server = s.server;
    targetUrl = `http://127.0.0.1:${s.port}/index.html`;
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.scale
  });

  await ctx.addInitScript(({ course, view }) => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ token: 'mock-token', user: { id: 'u1', name: 'Rian' } }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Rian Pratama', locale: 'id', course: course }));
    localStorage.setItem('fz_tour_done', 'true');
    localStorage.setItem('fz_auth_guest', 'true');
    localStorage.setItem('fiezel_lang_chosen', 'id');
    localStorage.setItem('fz_target_course', course);
    localStorage.setItem('fz_target_lang', course);
    localStorage.setItem(`fz_state_v1@${course}`, JSON.stringify({
      level: 1, jaLevel: 'KANA', placementDone: true, view: 'home',
      ritualMeta: { lastDay: today }
    }));
    localStorage.setItem('fz_state_v1', JSON.stringify({
      level: 1, jaLevel: 'KANA', placementDone: true, view: view,
      ritualMeta: { lastDay: today }
    }));
  }, { course: targetCourse, view: targetView });

  const page = await ctx.newPage();

  // Abort slow external tracking/3rd party scripts & heavy ONNX models to load instantly in < 2 seconds
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('puter.com') || url.includes('google-analytics') || url.includes('googletagmanager') || url.includes('clarity.ms') || url.endsWith('.onnx') || url.includes('/vendor/supertonic')) {
      return route.abort();
    }
    return route.continue();
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(300);

  await page.evaluate(async ({ course, view, story, scene }) => {
    const style = document.createElement('style');
    style.textContent = '.fiezel-ob, .ob-onboarding-layer, #onboardingHost, .fz-auth, .fiezel-splash, #fiezelBootSplash, .fz-tour, #fzRitual, .fz-ritual, #modal, #modalPanel, .modal-backdrop, .modal { display: none !important; pointer-events: none !important; }';
    document.head.appendChild(style);
    document.querySelectorAll('#fiezelBootSplash, #fiezelSplash, .fiezel-splash, .fz-auth, #authModal, .modal-backdrop, .fiezel-ob, .ob-onboarding-layer, #onboardingHost, #authGate, .ob-language-dialog, #authScreen, #fzRitual, .fz-tour, #modal, #modalPanel').forEach(el => el.remove());
    document.documentElement.classList.remove('fz-booting');
    document.body.classList.remove('fz-auth-open');
    document.documentElement.classList.add('fz-app-open');
    if (window.switchTargetLangStorage) window.switchTargetLangStorage(course);
    if (window.FiezelI18n?.setCourse) window.FiezelI18n.setCourse(course);
    if (window.go) window.go(view);
    if (story && window.FiezelStoryReader) {
      await new Promise(r => setTimeout(r, 300));
      window.FiezelStoryReader.openStory(story);
      if (scene !== '') {
        window.FiezelStoryReader.gotoScene(Number(scene));
      }
    }
    document.querySelectorAll('#fzRitual, .fz-ritual, #modal, #modalPanel, .modal-backdrop, .modal').forEach(el => el.remove());
  }, { course: targetCourse, view: targetView, story: targetStory, scene: targetScene });

  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(res => {
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
        setTimeout(res, 3000);
      });
    }));
  });

  if (targetView === 'chat') {
    try {
      const frameEl = await page.waitForSelector('#fzMitraKaiwaStudioFrame', { timeout: 5000 });
      if (frameEl) {
        const frame = await frameEl.contentFrame();
        if (frame) {
          await frame.waitForSelector('[data-testid="mochi-3d-stage"] canvas', { timeout: 7000 });
          await page.waitForTimeout(600);
        }
      }
    } catch (_) {}
  }
  await page.waitForTimeout(600);

  const outPath = path.isAbsolute(customName) ? customName : path.join(artifactDir, customName);
  await page.screenshot({ path: outPath, fullPage: false });

  await browser.close();
  if (server) server.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[QUICK-SCREENSHOT] Done in ${elapsed}s (Build: ${latestBuild}, Target: ${isLive ? 'LIVE PWA' : 'LOCAL PWA'}) -> ${outPath}`);
}

main().catch(err => {
  console.error('[QUICK-SCREENSHOT] Error:', err);
  process.exit(1);
});
