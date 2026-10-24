// Probe: Mitra Kaiwa live call — HONEST latency + provenance + relevance (m025-637).
// Clicks like a real learner, sends several varied lines, and for EACH turn measures:
//   t_text   = send click -> AI reply text visible in the HUD
//   t_audio  = send click -> first neural MP3 play() of THAT reply (fillers excluded)
//   source   = data-reply-source of the HUD line ('ai' | 'ai-gemini-key' | 'offline-template')
// and prints learner line + AI reply side by side so a human can judge relevance.
// Usage: node tools/dev/mitra-kaiwa-live-voice-ai-probe.mjs [baseUrl]
// Env: PROBE_LANG=en|ja, PROBE_LOCAL_BUNDLE=<path to dist/voice-studio.js>, PROBE_SHOT=<png>
import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'https://fiezel.my.id/app').replace(/\/$/, '');
const LANG = process.env.PROBE_LANG || 'en';
const LINES = process.env.PROBE_LINE
  ? [process.env.PROBE_LINE]
  : LANG === 'ja'
    ? ['すみません、アイスコーヒーをひとつください。', 'ケーキはありますか？', '店内でお願いします。']
    : [
        'Hi, I would like an iced latte please.',
        'Do you have something without sugar? I am on a diet.',
        'My friend is coming later, can we sit by the window?',
      ];
const LOCAL_BUNDLE = process.env.PROBE_LOCAL_BUNDLE || '';

const browser = await chromium.launch({
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const context = await browser.newContext({ viewport: { width: 412, height: 915 }, permissions: ['microphone'] });
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
    route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: bundleBody })
  );
  const cssCandidate = LOCAL_BUNDLE.replace(/voice-studio\.js$/, 'voice-studio.css');
  if (fs.existsSync(cssCandidate)) {
    const cssBody = fs.readFileSync(cssCandidate);
    await page.route('**/features/voice-studio/dist/voice-studio.css*', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: cssBody })
    );
  }
  console.log('Injected candidate bundle:', LOCAL_BUNDLE, `(${bundleBody.length} bytes)`);
}

const aiCalls = [];
page.on('request', (req) => {
  if (/\/api\/ai\/task/.test(req.url()) && req.method() === 'POST') {
    try {
      const body = JSON.parse(req.postData() || '{}');
      aiCalls.push({ t: Date.now(), mode: body?.input?.mode || '-', scenarioId: body?.input?.scenarioId || '-' });
    } catch {
      // ignore
    }
  }
});
const net = [];
page.on('response', async (res) => {
  const url = res.url();
  if (/\/api\/(tts|ai|auth|voice-call)/.test(url)) {
    let detail = '';
    if (/\/api\/ai\/task/.test(url)) {
      try {
        const j = await res.json();
        detail = ` degraded=${j?.degraded} reason=${j?.reason || j?.error || '-'} reply=${String(j?.turn?.reply || '').slice(0, 40)}`;
      } catch {}
    }
    net.push({ t: Date.now(), url: url.replace(/\?.*$/, ''), status: res.status(), method: res.request().method(), detail });
  }
});
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));

await page.goto(`${BASE}/call.html?tab=call&lang=${encodeURIComponent(LANG)}&probe=${Date.now()}`, { waitUntil: 'commit', timeout: 90000 });
await page.waitForSelector('#fiezel-voice-studio-root *', { timeout: 90000 });
await page.waitForTimeout(1500);
const nav = page.locator('nav[aria-label="Navigasi utama"] button');
if ((await nav.count()) >= 2 && (await nav.nth(1).isVisible())) await nav.nth(1).click();
await page.waitForTimeout(800);

await page.getByRole('button', { name: /Telepon Live/ }).first().click();
console.log('Clicked "Telepon Live"');
await page.waitForTimeout(9000); // opening line TTS + filler pre-render

const results = [];
for (const line of LINES) {
  const before = await page.evaluate(() => ({
    hud: document.querySelector('[data-testid="live-hud-ai-text"]')?.textContent?.trim() || '',
    plays: window.__probe.audioPlays.length,
  }));
  await page.locator('[data-testid="voice-turn-input"]').fill(line);
  const t0 = Date.now();
  await page.locator('[data-testid="send-turn-btn"]').click();

  // Wait for the thinking indicator to finish and a NEW AI line to be shown.
  await page.waitForFunction(
    (prev) => {
      if (document.querySelector('[data-testid="live-hud-ai-thinking"]')) return false;
      const el = document.querySelector('[data-testid="live-hud-ai-text"]');
      const txt = el?.textContent?.trim() || '';
      return Boolean(txt) && txt !== prev;
    },
    before.hud,
    { timeout: 30000, polling: 50 }
  );
  const tText = Date.now();
  const shown = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="live-hud-ai-text"]');
    return {
      text: el?.textContent?.trim() || '',
      source: el?.getAttribute('data-reply-source') || '?',
      meaning: document.querySelector('[data-testid="live-hud-ai-translation"]')?.textContent?.trim() || '',
      offlineLabel: Boolean(document.querySelector('[data-testid="live-hud-offline-label"]')),
    };
  });

  // First neural play() AFTER the reply text appeared = the reply itself (fillers play before).
  let tAudio = null;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const first = await page.evaluate(
      ({ from, after }) =>
        window.__probe.audioPlays
          .slice(from)
          .find((a) => a.t >= after - 30 && a.kind.startsWith('data:audio/mpeg') && a.len > 1000) || null,
      { from: before.plays, after: tText }
    );
    if (first) {
      tAudio = first.t;
      break;
    }
    await page.waitForTimeout(50);
  }
  const fillerPlays = await page.evaluate(
    ({ from, after, until }) =>
      window.__probe.audioPlays.slice(from).filter((a) => a.t >= after && a.t < until && a.kind.startsWith('data:audio/mpeg')).length,
    { from: before.plays, after: t0, until: tText }
  );
  const r = {
    learner: line,
    reply: shown.text,
    meaning: shown.meaning,
    source: shown.source,
    offlineLabel: shown.offlineLabel,
    tTextMs: tText - t0,
    tAudioMs: tAudio ? tAudio - t0 : null,
    fillerPlays,
  };
  results.push(r);
  console.log(
    `\n--- TURN ${results.length}\n learner : ${r.learner}\n AI      : ${r.reply}\n meaning : ${r.meaning}\n source  : ${r.source}${r.offlineLabel ? ' (offline label shown)' : ''}\n t_text  : ${r.tTextMs} ms\n t_audio : ${r.tAudioMs ?? 'NO AUDIO'} ms\n fillers : ${r.fillerPlays}`
  );
  await page.waitForTimeout(7000); // let the reply finish speaking
}

const probe = await page.evaluate(() => window.__probe);
console.log('\nAI requests (mode sent):', aiCalls.map((c) => c.mode).join(', '));
console.log('AI responses:', net.filter((n) => /ai\/task/.test(n.url)).map((n) => `${n.status}${n.detail || ''}`).join(' | '));
console.log('speechSynthesis.speak() calls:', probe.speechCalls.length);

const aiTurns = results.filter((r) => r.source === 'ai' || r.source === 'ai-gemini-key').length;
const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const textTimes = results.map((r) => r.tTextMs);
const audioTimes = results.map((r) => r.tAudioMs).filter((x) => x != null);
console.log('\n=== SUMMARY ===');
console.log('turns                 :', results.length);
console.log('replies from real AI  :', `${aiTurns}/${results.length}`);
console.log('t_text  avg / max (ms):', avg(textTimes), '/', Math.max(...textTimes));
console.log('t_audio avg / max (ms):', avg(audioTimes), '/', audioTimes.length ? Math.max(...audioTimes) : null);
console.log('VERDICT zero robot voice  :', probe.speechCalls.length === 0 ? 'PASS' : 'FAIL');
console.log('VERDICT every reply is AI :', aiTurns === results.length ? 'PASS' : 'FAIL');
console.log('VERDICT every reply voiced:', audioTimes.length === results.length ? 'PASS' : 'FAIL');
await page.screenshot({ path: process.env.PROBE_SHOT || 'mitra-kaiwa-live-probe.png' });
await browser.close();
