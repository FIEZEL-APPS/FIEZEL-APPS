// Probe: Mitra Kaiwa live call — voice (TTS) + AI reply, clicked like a real learner.
// Usage: node tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs [baseUrl]
// Default baseUrl = https://fiezel.my.id/app
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'https://fiezel.my.id/app').replace(/\/$/, '');
const LANG = process.env.PROBE_LANG || 'en';
const USER_LINE =
  process.env.PROBE_LINE ||
  (LANG === 'ja' ? 'すみません、アイスコーヒーをひとつください' : 'Hi, I would like an iced latte please');
const LOCAL_BUNDLE = process.env.PROBE_LOCAL_BUNDLE || '';

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, permissions: ['microphone'] });
// Instrument audio playback BEFORE the app loads: count real <audio> plays and speechSynthesis calls.
await context.addInitScript(() => {
  window.__probe = { audioPlays: [], speechCalls: [], playErrors: [] };
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const src = String(this.currentSrc || this.src || '');
    window.__probe.audioPlays.push({ t: Date.now(), kind: src.slice(0, 22), len: src.length });
    const p = origPlay.call(this);
    if (p && p.catch) p.catch((e) => window.__probe.playErrors.push(String(e && e.name)));
    return p;
  };
  if (window.speechSynthesis) {
    const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u) => {
      window.__probe.speechCalls.push({ t: Date.now(), text: String(u.text).slice(0, 60), lang: u.lang });
      return origSpeak(u);
    };
  }
});

const page = await context.newPage();
if (LOCAL_BUNDLE && fs.existsSync(LOCAL_BUNDLE)) {
  const bundleBody = fs.readFileSync(LOCAL_BUNDLE);
  await page.route('**/features/voice-studio/dist/voice-studio.js*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: bundleBody,
    })
  );
  const cssCandidate = LOCAL_BUNDLE.replace(/voice-studio\.js$/, 'voice-studio.css');
  if (fs.existsSync(cssCandidate)) {
    const cssBody = fs.readFileSync(cssCandidate);
    await page.route('**/features/voice-studio/dist/voice-studio.css*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/css; charset=utf-8',
        body: cssBody,
      })
    );
  }
  console.log('Injected candidate bundle:', LOCAL_BUNDLE, `(${bundleBody.length} bytes)`);
}
const net = [];
page.on('response', async (res) => {
  const url = res.url();
  if (/\/api\/(tts|ai|auth|voice-call)/.test(url)) {
    net.push({ url: url.replace(/\?.*$/, ''), status: res.status(), method: res.request().method() });
  }
});
page.on('requestfailed', (req) => {
  if (/\/api\//.test(req.url())) net.push({ url: req.url(), status: 'FAILED ' + (req.failure()?.errorText || ''), method: req.method() });
});
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

await page.goto(`${BASE}/call.html?tab=call&lang=${encodeURIComponent(LANG)}&probe=${Date.now()}`, { waitUntil: 'commit', timeout: 90000 });
await page.waitForSelector('#fiezel-voice-studio-root *', { timeout: 90000 });
await page.waitForTimeout(1500);

// Bottom nav "Panggilan"/call tab (2nd button in main nav)
const nav = page.locator('nav[aria-label="Navigasi utama"] button');
if ((await nav.count()) >= 2 && (await nav.nth(1).isVisible())) await nav.nth(1).click();
await page.waitForTimeout(800);

const liveBtn = page.getByRole('button', { name: /Telepon Live/ });
await liveBtn.first().click();
console.log('Clicked "Telepon Live"');
await page.waitForTimeout(9000); // opening line TTS

const opening = await page.evaluate(() => ({ ...window.__probe }));
console.log('After opening line: audioPlays=', opening.audioPlays.length, 'speechCalls=', opening.speechCalls.length, 'playErrors=', opening.playErrors);

const turnsBefore = await page.locator('[data-testid="user-exact-transcript"]').count();
await page.locator('[data-testid="voice-turn-input"]').fill(USER_LINE);
const t0 = Date.now();
await page.locator('[data-testid="send-turn-btn"]').click();
console.log(`Sent learner line: "${USER_LINE}"`);
await page.waitForFunction((n) => document.querySelectorAll('[data-testid="user-exact-transcript"]').length > n, turnsBefore, { timeout: 30000 });
const replyLatency = Date.now() - t0;
await page.waitForTimeout(9000); // reply TTS

const result = await page.evaluate(() => {
  const hudAi = document.querySelector('[data-testid="live-hud-ai-text"]')?.textContent?.trim() || '';
  const hudTr = document.querySelector('[data-testid="live-hud-ai-translation"]')?.textContent?.trim() || '';
  return { hudAi, hudTr, probe: window.__probe };
});

console.log('\n=== RESULT ===');
console.log('Reply latency (ms):', replyLatency);
console.log('AI reply text (HUD):', result.hudAi);
console.log('AI reply translation:', result.hudTr);
console.log('Audio <audio>.play() calls:', result.probe.audioPlays.length, result.probe.audioPlays.map((a) => a.kind));
console.log('speechSynthesis.speak() calls:', result.probe.speechCalls.length, result.probe.speechCalls.map((s) => s.text));
console.log('play() rejections:', result.probe.playErrors);
console.log('Network (api):');
for (const n of net) console.log('  ', n.method, n.status, n.url);

const neuralPlays = result.probe.audioPlays.filter((a) => a.kind.startsWith('data:audio/mpeg') && a.len > 1000).length;
const zeroRobotOk = result.probe.speechCalls.length === 0;
const ttsOk = net.some((n) => /\/api\/tts\/line/.test(n.url) && n.status === 200) && neuralPlays >= 2 && zeroRobotOk;
const aiOk = net.some((n) => /\/api\/ai\/task/.test(n.url) && n.status === 200);
console.log('\nVERDICT neural MP3 plays    :', neuralPlays, '(expected >= 2)');
console.log('VERDICT zero robot voice    :', zeroRobotOk ? 'PASS' : 'FAIL');
console.log('VERDICT neural TTS audible  :', ttsOk ? 'PASS' : 'FAIL');
console.log('VERDICT real AI reply       :', aiOk ? 'PASS' : 'FAIL');
await page.screenshot({ path: process.env.PROBE_SHOT || 'mitra-kaiwa-live-probe.png' });
await browser.close();
process.exit(ttsOk && aiOk && zeroRobotOk ? 0 : 1);
