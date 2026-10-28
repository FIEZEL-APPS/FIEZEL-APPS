import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const ARTIFACT_DIR = 'C:/Users/hp/.gemini/antigravity/brain/55ac9eeb-d45f-439c-ae32-477fd732acc0';

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  let f = path.join(ROOT, rel);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (fs.existsSync(f)) {
    const ext = path.extname(f);
    const mime = ext === '.html' ? 'text/html' : (ext === '.js' ? 'text/javascript' : (ext === '.css' ? 'text/css' : (ext === '.json' ? 'application/json' : 'application/octet-stream')));
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
    res.end(fs.readFileSync(f));
  } else {
    res.writeHead(404);
    res.end();
  }
});

async function main() {
  const port = 28990;
  server.listen(port, async () => {
    console.log(`Server listening at http://127.0.0.1:${port}`);
    const browser = await chromium.launch({ headless: true });

    try {
      // ==========================================
      // 1. DESKTOP ONBOARDING (Split-screen anti-void)
      // ==========================================
      console.log('--- Capturing Desktop Onboarding ---');
      const dPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await dPage.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('fz_user_registered', '1');
        localStorage.setItem('fz_auth_mode', 'guest');
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ locale: 'id' }));
        setInterval(() => {
          document.querySelectorAll('.fz-tour, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
        }, 50);
      });
      await dPage.goto(`http://127.0.0.1:${port}/index.html`);
      await dPage.waitForTimeout(1000);
      await dPage.evaluate(() => {
        window.validateLearnerNameAvailability = async () => ({ ok: true });
        window.showOnboarding(window, { force: true });
      });
      await dPage.waitForSelector('[data-ob-name]', { timeout: 5000 });
      await dPage.waitForTimeout(300);

      // Desktop Step 1
      await dPage.screenshot({ path: `${ARTIFACT_DIR}/ob-step1-desktop.png` });
      console.log('Saved ob-step1-desktop.png');

      // Advance to Step 4
      const nameInput = await dPage.$('[data-ob-name]');
      if (nameInput) {
        await nameInput.fill('Rian');
        await dPage.click('[data-ob-advance]');
        await dPage.waitForTimeout(400);
      }
      const courseBtn = await dPage.$('[data-ob-course="ja"]');
      if (courseBtn) {
        await courseBtn.click();
        await dPage.waitForTimeout(300);
        await dPage.click('[data-ob-advance]');
        await dPage.waitForTimeout(400);
      }
      const goalBtn = await dPage.$('[data-ob-goal]');
      if (goalBtn) {
        await goalBtn.click();
        await dPage.waitForTimeout(300);
        await dPage.click('[data-ob-advance]');
        await dPage.waitForTimeout(400);
      }
      await dPage.waitForTimeout(400);
      await dPage.screenshot({ path: `${ARTIFACT_DIR}/ob-step4-desktop.png` });
      console.log('Saved ob-step4-desktop.png');
      await dPage.close();

      // ==========================================
      // 2. MOBILE ONBOARDING STEP 4 (Compact spacing & 1:1 mascot)
      // ==========================================
      console.log('--- Capturing Mobile Onboarding Step 4 ---');
      const mPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await mPage.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('fz_user_registered', '1');
        localStorage.setItem('fz_auth_mode', 'guest');
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ locale: 'id' }));
        setInterval(() => {
          document.querySelectorAll('.fz-tour, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
        }, 50);
      });
      await mPage.goto(`http://127.0.0.1:${port}/index.html`);
      await mPage.waitForTimeout(1000);
      await mPage.evaluate(() => {
        window.validateLearnerNameAvailability = async () => ({ ok: true });
        window.showOnboarding(window, { force: true });
      });
      await mPage.waitForSelector('[data-ob-name]', { timeout: 5000 });
      const mName = await mPage.$('[data-ob-name]');
      if (mName) {
        await mName.fill('Rian');
        await mPage.click('[data-ob-advance]');
        await mPage.waitForTimeout(400);
      }
      const mCourse = await mPage.$('[data-ob-course="ja"]');
      if (mCourse) {
        await mCourse.click();
        await mPage.waitForTimeout(300);
        await mPage.click('[data-ob-advance]');
        await mPage.waitForTimeout(400);
      }
      const mGoal = await mPage.$('[data-ob-goal]');
      if (mGoal) {
        await mGoal.click();
        await mPage.waitForTimeout(300);
        await mPage.click('[data-ob-advance]');
        await mPage.waitForTimeout(400);
      }
      await mPage.waitForTimeout(400);
      await mPage.screenshot({ path: `${ARTIFACT_DIR}/ob-step4-mobile.png` });
      console.log('Saved ob-step4-mobile.png');
      await mPage.close();

      // ==========================================
      // 3. SHINOBI STORY LIBRARY (Desktop 1280x800)
      // ==========================================
      console.log('--- Capturing Shinobi Story Library on Desktop ---');
      const storyLibPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await storyLibPage.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('fz_user_registered', '1');
        localStorage.setItem('fz_auth_mode', 'guest');
        localStorage.setItem('fz_target_course', 'ja');
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true, targetCourse: 'ja' }));
        setInterval(() => {
          document.querySelectorAll('.fz-tour, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
        }, 50);
      });
      await storyLibPage.goto(`http://127.0.0.1:${port}/index.html`);
      await storyLibPage.waitForTimeout(1200);
      // Navigate to Latihan then Story Library
      await storyLibPage.evaluate(() => {
        if (typeof window.go === 'function') window.go('story');
      });
      await storyLibPage.waitForTimeout(600);
      await storyLibPage.screenshot({ path: `${ARTIFACT_DIR}/shinobi-library-desktop.png` });
      console.log('Saved shinobi-library-desktop.png');

      // Open Story 1 on Desktop and inspect word to show BKT popover
      await storyLibPage.evaluate(() => {
        if (window.FiezelStoryReader) {
          window.FiezelStoryReader.openStory('mizuki-maiko');
          window.FiezelStoryReader.inspectWord('舞妓', 'まいこ', 'calon geisha / maiko');
        }
      });
      await storyLibPage.waitForTimeout(600);
      await storyLibPage.screenshot({ path: `${ARTIFACT_DIR}/shinobi-story-desktop.png` });
      console.log('Saved shinobi-story-desktop.png');
      await storyLibPage.close();

      // ==========================================
      // 4. SHINOBI STORY READER ON MOBILE (390x844)
      // ==========================================
      console.log('--- Capturing Shinobi Story Reader on Mobile ---');
      const storyMobPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await storyMobPage.addInitScript(() => {
        localStorage.clear();
        localStorage.setItem('fz_user_registered', '1');
        localStorage.setItem('fz_auth_mode', 'guest');
        localStorage.setItem('fz_target_course', 'ja');
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true, targetCourse: 'ja' }));
        setInterval(() => {
          document.querySelectorAll('.fz-tour, #fzPrasasti, #fzRitual, .fz-auth, #fiezelBootSplash, #fiezelSplash, .fiezel-splash').forEach(e => e.remove());
        }, 50);
      });
      await storyMobPage.goto(`http://127.0.0.1:${port}/index.html`);
      await storyMobPage.waitForTimeout(1200);

      // Open Story directly
      await storyMobPage.evaluate(() => {
        if (typeof window.go === 'function') {
          window.go('story');
          if (window.FiezelStoryReader) {
            window.FiezelStoryReader.openStory('mizuki-maiko');
          }
        }
      });
      await storyMobPage.waitForTimeout(800);

      // Scene 1 screenshot on mobile
      await storyMobPage.screenshot({ path: `${ARTIFACT_DIR}/shinobi-story-mobile.png` });
      console.log('Saved shinobi-story-mobile.png');

      // Advance to Scene 2 on mobile to show multi-scene progression
      await storyMobPage.evaluate(() => {
        if (window.FiezelStoryReader) {
          window.FiezelStoryReader.gotoScene(1);
        }
      });
      await storyMobPage.waitForTimeout(600);
      await storyMobPage.screenshot({ path: `${ARTIFACT_DIR}/shinobi-story-scene2-mobile.png` });
      console.log('Saved shinobi-story-scene2-mobile.png');

      await storyMobPage.close();
      console.log('--- ALL SCREENSHOTS CAPTURED CLEANLY DIRECTLY FROM INDEX.HTML ---');

    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      await browser.close();
      server.close();
      process.exit(0);
    }
  });
}

main();
