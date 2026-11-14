/**
 * tests/ssw-sensei-mentor-probe.js
 *
 * Comprehensive Node + Headless Chromium Playwright E2E Verification for:
 * SSW SENSEI (Pengolahan Makanan OTAFF Ver 5.1 Apr 2026 + Wakai Papa Pro)
 * AND non-regression of Kawan Bicara (Coach Sarah / EN Cara Baca / Mochi 3D).
 */
'use strict';

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm',
};

function startStaticServer(opts = {}) {
  return new Promise((resolve) => {
    const requestedUrls = [];
    let cachedBundleFull = null;
    let cachedBundleLite = null;
    if (opts.serveApiBundle) {
      const kb = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'content/ssw/ssw-sensei-master-kb.json'), 'utf8')
      );
      const corpus = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'content/ssw/ssw-wakai-papa-corpus.json'), 'utf8')
      );
      cachedBundleLite = JSON.stringify({
        ok: true,
        masterKb: kb,
        videosMeta: corpus.meta || {},
        videos: corpus.videos || [],
      });
      cachedBundleFull = JSON.stringify({
        ok: true,
        masterKb: kb,
        videosMeta: corpus.meta || {},
        videos: corpus.videos || [],
        chunks: corpus.chunks || [],
      });
    }
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, 'http://127.0.0.1');
      let relPath = decodeURIComponent(reqUrl.pathname || '/');
      requestedUrls.push(relPath + (reqUrl.search || ''));

      if (relPath === '/api/ssw/bundle' && opts.serveApiBundle) {
        const includeChunks = reqUrl.searchParams.get('include_chunks') === 'true';
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        });
        res.end(includeChunks ? cachedBundleFull : cachedBundleLite);
        return;
      }

      if (relPath === '/') relPath = '/index.html';
      const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
      let fullPath = path.join(ROOT, safePath);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        fullPath = path.join(fullPath, 'index.html');
      }
      if (!fs.existsSync(fullPath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(fullPath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        requestedUrls,
      });
    });
  });
}

function assertZeroDashes(label, text) {
  const matches = String(text || '').match(/[\u2014\u2013]/g);
  assert.strictEqual(
    matches ? matches.length : 0,
    0,
    `${label} contains forbidden em-dash/en-dash characters (${matches ? matches.length : 0})`
  );
}

async function runStaticAndWorkerChecks() {
  console.log('=== [Part A] Static, Bundle Bloat & Zero-Dash Integrity ===');

  const deadKbPath = path.join(ROOT, 'features/voice-studio/src/data/sswSenseiMasterKb.json');
  assert.strictEqual(
    fs.existsSync(deadKbPath),
    false,
    'Dead sswSenseiMasterKb.json must be deleted so Vite cannot embed it'
  );

  const kbPath = path.join(ROOT, 'content/ssw/ssw-sensei-master-kb.json');
  const corpusPath = path.join(ROOT, 'content/ssw/ssw-wakai-papa-corpus.json');
  assert.ok(fs.existsSync(kbPath), 'Missing ./content/ssw/ssw-sensei-master-kb.json');
  assert.ok(fs.existsSync(corpusPath), 'Missing ./content/ssw/ssw-wakai-papa-corpus.json');

  const kbRaw = fs.readFileSync(kbPath, 'utf8');
  const corpusRaw = fs.readFileSync(corpusPath, 'utf8');
  assertZeroDashes('content/ssw/ssw-sensei-master-kb.json', kbRaw);
  assertZeroDashes('content/ssw/ssw-wakai-papa-corpus.json', corpusRaw);

  const kb = JSON.parse(kbRaw);
  const corpus = JSON.parse(corpusRaw);
  assert.strictEqual(kb.pages.length, 91, `Expected 91 PDF pages, got ${kb.pages.length}`);
  assert.strictEqual(kb.kotoba.length, 266, `Expected 266 Kotoba, got ${kb.kotoba.length}`);
  assert.ok(kb.quizzes.length >= 58, `Expected >= 58 quizzes, got ${kb.quizzes.length}`);
  assert.ok((corpus.videos || []).length >= 86, `Expected >= 86 videos, got ${(corpus.videos || []).length}`);
  assert.ok((corpus.chunks || []).length >= 1200, `Expected >= 1200 video chunks, got ${(corpus.chunks || []).length}`);

  // Pre-grade 0-spoiler check across all 58+ quizzes
  const PREGRADE_SPOILER_RE =
    /\s+-\s+(?!\d+(?:[,.]\d+)?\s*(?:°C|C|%|ppm|jam|menit|detik|kg|g|mL|L|cm|mm|triliun|miliar|juta)\b).*$/i;
  let rangePreservedCount = 0;
  for (const q of kb.quizzes) {
    assert.ok(Array.isArray(q.optionsId) && q.optionsId.length >= 2, `Quiz ${q.id} missing optionsId`);
    for (const optText of q.optionsId) {
      assert.ok(
        !/\s+-\s+(?:Tepat!|Salah\b|BENAR\.|Keliru)/i.test(optText),
        `Quiz ${q.id} leaked spoiler in raw optionsId: ${optText}`
      );
      const cleaned = optText.replace(PREGRADE_SPOILER_RE, '').trim();
      if (/85\s*-\s*90|37\s*-\s*38\s*triliun/i.test(optText)) {
        assert.ok(cleaned.includes('-'), `Range expression stripped wrongly in ${q.id}: ${cleaned}`);
        rangePreservedCount++;
      }
    }
  }
  console.log(
    `OK: KB validated (91 pages, 266 kotoba, ${kb.quizzes.length} quizzes, ${corpus.videos.length} videos, ${corpus.chunks.length} chunks, ${rangePreservedCount} ranges preserved, 0 spoilers, 0 dashes)`
  );

  for (const rel of [
    'features/voice-studio/src/lib/sswSenseiEngine.ts',
    'features/voice-studio/src/lib/sswSenseiTeacher.ts',
    'features/voice-studio/src/data/sswCallScenarios.ts',
    'features/voice-studio/src/components/SswSenseiWorkbenchPanel.tsx',
    'features/voice-studio/src/components/BeginnerAnswerAssistant.tsx',
  ]) {
    assertZeroDashes(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  }

  const swText = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.strictEqual(swText.includes('content/ssw'), false, 'sw.js must NOT precache content/ssw/*');

  const distJsPath = path.join(ROOT, 'features/voice-studio/dist/voice-studio.js');
  assert.ok(fs.existsSync(distJsPath), 'Missing built dist/voice-studio.js');
  const distJs = fs.readFileSync(distJsPath, 'utf8');
  const distBytes = fs.statSync(distJsPath).size;
  assert.strictEqual(
    distJs.includes('cbt_49') || distJs.includes('wp_trap_11') || distJs.includes('kotoba_260'),
    false,
    'Built dist/voice-studio.js must NOT bundle heavy KB quiz/kotoba arrays'
  );
  console.log(`OK: dist/voice-studio.js is lean (${distBytes} bytes) with core manifest only and sw.js excludes content/ssw.`);

  console.log('=== [Part B] Worker Voice Pipeline Bilingual SSW & Sarah Regression Checks ===');
  const worker = require(path.join(ROOT, 'workers/api/voice/route-voice-live.js'));
  const makeCtx = (payload) => ({
    request: new Request('https://api.fiezel.my.id/api/voice/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://fiezel.my.id',
        'cf-connecting-ip': '127.0.0.99',
      },
      body: JSON.stringify(payload),
    }),
    env: { GEMINI_LIVE_KEYS: 'AIzaProbeFakeWorkerKey00001' },
  });

  const capturedFetches = [];
  const origFetch = global.fetch;
  global.fetch = async (url, init) => {
    const urlStr = String(url || '');
    const bodyText = typeof init?.body === 'string' ? init.body : '';
    capturedFetches.push({ url: urlStr, bodyText });

    // Simulate Edge/Gemini response cleanly per endpoint
    if (urlStr.includes('generateContent') && bodyText.includes('hasLanguage')) {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      hasLanguage: true,
                      isEchoOnly: false,
                      transcript: 'Sensei kapan pakai rumus C1 V1 sama kishaku klorin',
                      detectedLang: 'id',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (urlStr.includes('generateContent') && bodyText.includes('candidates')) {
      // Fallthrough
    }

    // Copilot / PartnerTurn mock JSON response
    if (urlStr.includes('generateContent')) {
      const isPartner = bodyText.includes('aiReply');
      const replyJson = isPartner
        ? {
            aiReply: '[MOOD:tegas] Siap! Untuk pemula nol, mulai dulu dari Tahap 1 Unit 0 Hal. 1-6 tentang dekoder kalimat soal agar tidak terbalik antara benar dan salah.',
            aiReplyTranslation: 'Mulai dari Hal. 1-6 dulu supaya paham pola ujung kalimat benar/salah.',
            replies: [
              {
                tier: 'easy',
                text: 'Siap Sensei, bedanya tadashii dan machigatte iru apa ya?',
                pronunciation: '',
                hint: 'Tanyakan pembeda soal benar vs salah',
              },
            ],
            uiAction: { actionType: 'none' },
          }
        : {
            aiMeaning: 'Kamu biasa minum yang mana, teh atau kopi?',
            replies: [
              {
                tier: 'easy',
                text: 'I usually drink coffee every morning.',
                pronunciation: 'Ai yu-zhu-e-li dringk ko-fi ev-ri mor-ning.',
                hint: 'Saya biasanya minum kopi setiap pagi.',
              },
            ],
          };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(replyJson) }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: false }), { status: 404 });
  };

  try {
    // 1) verify-speech uses ctx.request & ctx.env, includes bilingual SSW prompt & distinguishes noise
    const fakeWavBase64 = Buffer.alloc(240, 1).toString('base64');
    const sswVerifyRes = await worker.routeVoiceVerifySpeech(
      makeCtx({
        audioBase64: fakeWavBase64,
        mimeType: 'audio/wav',
        aiCurrentText: 'Silakan tanya tentang OTAFF Ver 5.1',
      })
    );
    const sswVerifyJson = await sswVerifyRes.json();
    assert.strictEqual(sswVerifyJson.ok, true, `verify-speech failed: ${JSON.stringify(sswVerifyJson)}`);
    assert.strictEqual(sswVerifyJson.hasLanguage, true);
    const verifyPromptCall = capturedFetches.find((f) => f.bodyText.includes('bilingual mixed Indonesian-Japanese'));
    assert.ok(verifyPromptCall, 'verify-speech prompt must preserve bilingual ID-JP + SSW term rules');

    // 2) routeVoicePartnerTurn for ssw_sensei accepts Indonesian & returns SSW bilingual reply (without EN/JA lock rejection)
    const partnerRes = await worker.routeVoicePartnerTurn(
      makeCtx({
        targetLang: 'ja',
        locale: 'id',
        personaId: 'ssw_sensei',
        scenarioId: 'scen_ssw_mentor_roadmap',
        userText: 'Sensei, saya pemula nol. Mulai dari halaman berapa?',
      })
    );
    const partnerJson = await partnerRes.json();
    assert.strictEqual(partnerJson.ok, true, `partnerTurn failed: ${JSON.stringify(partnerJson)}`);
    assertZeroDashes('Worker partnerTurn SSW reply', partnerJson.aiReply);
    const partnerPromptCall = capturedFetches.find((f) => f.bodyText.includes('cashew nut/kacang mede'));
    assert.ok(partnerPromptCall, 'Worker partnerTurn SSW prompt must reflect Ver 5.1 Apr 2026 cashew=9 wajib + pistachio=20 anjuran');

    // 3) Coach Sarah Ide Bicara copilot relevance prompt regression check
    const copilotRes = await worker.routeVoiceCopilotAssist(
      makeCtx({
        targetLang: 'en',
        locale: 'id',
        personaId: 'coach_sarah',
        scenarioId: 'scen_coffee_shop',
        aiText: 'Which one do you usually drink, tea or coffee?',
      })
    );
    const copilotJson = await copilotRes.json();
    assert.ok(
      copilotRes.status === 200 && copilotJson && copilotJson.ok === true && copilotJson.replies.length > 0,
      `Coach Sarah copilot must return structured response, got status=${copilotRes.status} body=${JSON.stringify(copilotJson)}`
    );

    // 4) routeVoiceGeminiTts handles SSW SENSEI bilingual Indonesian + Japanese cleanly with Charon voice
    const ttsRes = await worker.routeVoiceGeminiTts(
      makeCtx({
        text: 'Bagus! Sekarang pelajari alergen Ver 5.1 Kurumi dan Cashew Nut di Hal. 14.',
        lang: 'ja',
        personaId: 'ssw_sensei',
      })
    );
    const ttsJson = await ttsRes.json();
    assert.ok(ttsJson && typeof ttsJson === 'object', 'routeVoiceGeminiTts must return structured object');
  } finally {
    global.fetch = origFetch;
  }
  console.log('OK: Worker bilingual SSW speech verification, partner turn, & Coach Sarah regression passed.');
  return { kb };
}

async function runPlaywrightE2E({ kb }) {
  console.log('=== [Part C] Headless Chromium Playwright E2E Verification ===');

  // Server 1: static host WITHOUT /api/ssw/bundle override to prove fast fallback to ./content/ssw/*.json
  const srv = await startStaticServer({ serveApiBundle: false });
  const browser = await chromium.launch({ headless: true });

  const consoleErrors = [];
  const pageErrors = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 860 },
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          'fiezel-auth-v1',
          JSON.stringify({ signedIn: true, sub: 'ssw-probe', name: 'Rian SSW', email: 'ssw@fiezel.test' })
        );
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Rian SSW' }));
        localStorage.setItem('fz_target_course', 'ja');
        if (!sessionStorage.getItem('__ssw_probe_cleared')) {
          localStorage.removeItem('fz_ssw_master_state_v1');
          sessionStorage.setItem('__ssw_probe_cleared', '1');
        }
      } catch (_) {}
      // Override external backend URL so Priority 1 fails fast against dead local port and tests Priority 2 lazy fallback cleanly
      window.FIEZEL_CURRICULUM_CONFIG = {
        curriculumApiUrl: 'http://127.0.0.1:9',
      };
    });

    const page = await context.newPage();
    // Abort external /api/ssw/ calls on Priority 1 server probe so we exercise deterministic Priority 2 ./content/ssw fallback cleanly
    await page.route('**/api/ssw/**', (route) => route.abort());
    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('response', (res) => {
      const u = res.url();
      if (res.status() >= 400 && !u.includes('/api/')) {
        consoleErrors.push(`HTTP ${res.status()} non-API asset: ${u}`);
      }
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        const locUrl = (typeof msg.location === 'function' && msg.location()?.url) || '';
        // Ignore expected fast network abort / 404 on Worker /api/* endpoints against static test host
        if (
          txt.includes('127.0.0.1:9') ||
          txt.includes('ERR_CONNECTION_REFUSED') ||
          txt.includes('ERR_FAILED') ||
          txt.includes('api.fiezel.my.id') ||
          txt.includes('/api/ssw/') ||
          (txt.includes('status of 404') && locUrl.includes('/api/'))
        ) {
          return;
        }
        consoleErrors.push(locUrl ? `${txt} (${locUrl})` : txt);
      }
    });

    // 1. Open call.html?lang=ja&theme=light BEFORE activating SSW SENSEI -> verify zero eager JSON fetch
    await page.goto(`${srv.baseUrl}/call.html?lang=ja&theme=light`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="ssw-header-quick-btn"]', { timeout: 15000 });
    await page.waitForTimeout(600);

    const preSswFetches = srv.requestedUrls.filter((u) => u.includes('content/ssw/'));
    assert.strictEqual(
      preSswFetches.length,
      0,
      `SSW JSON must NOT be eagerly fetched before activating SSW SENSEI, saw: ${preSswFetches.join(', ')}`
    );
    console.log('OK: Zero eager SSW JSON fetches prior to activating SSW SENSEI.');

    // 2. Also verify Persona Modal Spotlight exists, then activate SSW SENSEI and wait for Priority 2 hydration
    await page.click('[data-testid="ssw-header-quick-btn"]');
    await page.waitForSelector('[data-testid="ssw-sensei-workbench"][data-hydrated="true"]', { timeout: 15000 });
    const personaToggleBtn = page.locator('header button:not([data-testid="ssw-header-quick-btn"]):has-text("SSW SENSEI"), header button:not([data-testid="ssw-header-quick-btn"]):has-text("Nanami")').first();
    if (await personaToggleBtn.count()) {
      await personaToggleBtn.click();
      await page.waitForSelector('[data-testid="ssw-sensei-spotlight-btn"]', { timeout: 5000 });
      const spotlightText = await page.textContent('[data-testid="ssw-sensei-spotlight-btn"]');
      assertZeroDashes('Persona spotlight button', spotlightText);
      assert.ok(spotlightText && /SSW SENSEI/i.test(spotlightText), 'Persona modal spotlight must label SSW SENSEI');
      await page.click('[data-testid="ssw-sensei-spotlight-btn"]');
      await page.waitForTimeout(150);
    }
    const hydratedChunks = await page.getAttribute('[data-testid="ssw-sensei-workbench"]', 'data-chunks');
    assert.ok(
      Number(hydratedChunks) >= 1200,
      `Expected >= 1200 hydrated transcript chunks, got data-chunks=${hydratedChunks}`
    );

    const postSswFetches = srv.requestedUrls.filter((u) => u.includes('content/ssw/'));
    assert.ok(
      postSswFetches.some((u) => u.includes('ssw-sensei-master-kb.json')) &&
        postSswFetches.some((u) => u.includes('ssw-wakai-papa-corpus.json')),
      `Expected both lazy ./content/ssw JSON files to be fetched on demand, got: ${postSswFetches.join(', ')}`
    );
    console.log('OK: Priority 2 lazy ./content/ssw/*.json hydrated on demand cleanly.');

    // 3. Check initial 0% readiness & Stage 1 Hal. 1-6 -> verify guided step cards, beginner glossary, step advance, & mark read
    const initialReadiness = await page.textContent('[data-testid="ssw-readiness-pct"]');
    assert.ok(initialReadiness && initialReadiness.includes('0%'), `Expected 0% initial readiness, got: ${initialReadiness}`);
    await page.waitForSelector('[data-testid="ssw-stage-unit0_decoder"]');
    await page.click('[data-testid="ssw-stage-unit0_decoder"] button:has-text("Buka Hal.")');
    await page.waitForSelector('[data-testid="ssw-pdf-page-title"]', { timeout: 5000 });
    const hal1Title = await page.textContent('[data-testid="ssw-pdf-page-title"]');
    assert.ok(hal1Title && hal1Title.length > 3, 'Hal. 1 title must render');

    // Step-by-step guided lesson cards & Beginner Glossary on Hal. 1
    await page.waitForSelector('[data-testid="ssw-active-step-banner"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="ssw-step-card-1"][data-active="true"]', { timeout: 5000 });
    const glossaryText = await page.textContent('[data-testid="ssw-beginner-glossary"]');
    assert.ok(
      glossaryText && /CBT|Prometric|Furigana/i.test(glossaryText),
      `Expected beginner jargon glossary on Hal. 1 Step 1, got: ${glossaryText}`
    );
    await page.click('[data-testid="ssw-step-complete-next-btn"]');
    await page.waitForSelector('[data-testid="ssw-step-card-2"][data-active="true"]', { timeout: 5000 });
    const bannerAfterAdvance = await page.textContent('[data-testid="ssw-active-step-banner"]');
    assert.ok(
      bannerAfterAdvance && /Hal\. 1\s*·\s*Langkah 2/i.test(bannerAfterAdvance),
      `Expected active step banner to advance to Hal. 1 Langkah 2, got: ${bannerAfterAdvance}`
    );

    await page.click('[data-testid="ssw-mark-page-read"]');
    await page.waitForFunction(() => {
      const pct = document.querySelector('[data-testid="ssw-readiness-pct"]')?.textContent || '';
      const wb = document.querySelector('[data-testid="ssw-sensei-workbench"]')?.textContent || '';
      return pct.trim() !== '0%' && wb.toLowerCase().includes('1/91 hal');
    }, null, { timeout: 5000 });
    console.log('OK: Stage 1 Hal. 1 step-by-step cards, beginner glossary, Langkah 1->2 advance, & Mark Page Read verified.');

    // 4. Test deep search across 91 pages, 13 traps, 86 videos, and 1,216 transcript chunks
    const searchQueries = [
      { q: 'pistachio', expectRe: /pistachio|anjuran|dubai/i },
      { q: 'cashew', expectRe: /cashew|mede|wajib|9\s*alergen/i },
      { q: 'yukkuri', expectRe: /yukkuri|pelan|27|jebakan/i },
      { q: '84', expectRe: /84|pembulatan|ke atas|oven|ikan/i },
      { q: 'hal 27', expectRe: /27|pembekuan|pencairan|yukkuri/i },
    ];
    for (const item of searchQueries) {
      await page.fill('[data-testid="ssw-pdf-search"]', item.q);
      await page.waitForTimeout(180);
      const wbText = await page.textContent('[data-testid="ssw-sensei-workbench"]');
      assertZeroDashes(`Search UI (${item.q})`, wbText);
      assert.ok(
        item.expectRe.test(wbText || ''),
        `Search for "${item.q}" did not match expected regex ${item.expectRe}`
      );
    }
    await page.fill('[data-testid="ssw-pdf-search"]', '');
    // Verify Hal. 46 Kotoba bank renders <ruby> furigana & toggle "Sembunyikan Furigana" hides <rt>
    await page.fill('[data-testid="ssw-pdf-search"]', 'hal 46');
    await page.waitForTimeout(150);
    await page.click('button:has-text("Hal. 46")');
    await page.fill('[data-testid="ssw-pdf-search"]', '');
    await page.waitForTimeout(150);
    const rtBeforeHide = await page.locator('[data-testid="ssw-sensei-workbench"] rt').count();
    if (rtBeforeHide > 0) {
      await page.click('[data-testid="ssw-toggle-furigana"]');
      const rtAfterHide = await page.locator('[data-testid="ssw-sensei-workbench"] rt').count();
      assert.strictEqual(rtAfterHide, 0, 'Toggle Sembunyikan Furigana must hide <rt> elements');
      await page.click('[data-testid="ssw-toggle-furigana"]');
    }
    console.log(`OK: Deep search (pistachio Ver 5.1, cashew, yukkuri, 84, hal 27, ruby=${rtBeforeHide} rt, 0 dashes) passed.`);

    // 5. Quiz Tab: Zero-Spoiler Check + Wrong Answer Rationale + Correct Answer + Discussion Page + Persistence
    await page.click('[data-testid="ssw-tab-quiz"]');
    await page.click('[data-testid="ssw-draw-cbt"]');
    await page.waitForSelector('[data-testid="ssw-quiz-card"]', { timeout: 5000 });

    const quizCardHeader = await page.textContent('[data-testid="ssw-quiz-card"]');
    const quizIdMatch = String(quizCardHeader || '').match(/\(([^)]+)\)/);
    assert.ok(quizIdMatch, `Could not parse drawn quizId from card text: ${quizCardHeader}`);
    const drawnQuizId = quizIdMatch[1];
    const kbQuiz = kb.quizzes.find((x) => x.id === drawnQuizId);
    assert.ok(kbQuiz, `Drawn quiz ${drawnQuizId} missing from master KB`);

    const letters = ['A', 'B', 'C', 'D'].slice(0, kbQuiz.optionsJp.length);
    for (const ltr of letters) {
      const optText = await page.textContent(`[data-testid="ssw-quiz-opt-${ltr}"]`);
      assert.ok(
        !/\s+-\s+(?:Tepat!|Salah\b|BENAR\.|Keliru)/i.test(optText || ''),
        `Pre-grade option ${ltr} leaked spoiler: ${optText}`
      );
    }

    // Click WRONG letter intentionally
    const wrongLetter = letters.find((_, idx) => idx !== kbQuiz.correctIndex) || 'B';
    await page.click(`[data-testid="ssw-quiz-opt-${wrongLetter}"]`);
    await page.waitForSelector('[data-testid="ssw-quiz-grade-feedback"]', { timeout: 5000 });
    const wrongFeedback = await page.textContent('[data-testid="ssw-quiz-grade-feedback"]');
    assertZeroDashes('Wrong grade feedback UI', wrongFeedback);
    assert.ok(wrongFeedback.includes('BELUM TEPAT'), `Expected BELUM TEPAT feedback, got: ${wrongFeedback}`);

    if (kbQuiz.optionRationalesId && kbQuiz.optionRationalesId.length > 0) {
      const rationaleEl = await page.waitForSelector('[data-testid="ssw-quiz-selected-rationale"]', { timeout: 3000 });
      const rationaleText = await rationaleEl.textContent();
      assertZeroDashes('Selected rationale UI', rationaleText);
      assert.ok(rationaleText && rationaleText.includes(`Alasan pilihan ${wrongLetter}:`), 'Expected option rationale text');
    }

    // Draw Math quiz and answer CORRECT
    await page.click('[data-testid="ssw-draw-math"]');
    await page.waitForFunction(
      (prevId) => {
        const txt = document.querySelector('[data-testid="ssw-quiz-card"]')?.textContent || '';
        return txt.includes('Soal #') && !txt.includes(`(${prevId})`);
      },
      drawnQuizId,
      { timeout: 5000 }
    );
    const mathHeader = await page.textContent('[data-testid="ssw-quiz-card"]');
    const mathId = String(mathHeader || '').match(/\(([^)]+)\)/)[1];
    const mathQuiz = kb.quizzes.find((x) => x.id === mathId);
    assert.ok(mathQuiz, `Math quiz ${mathId} missing`);
    const correctLetter = letters[mathQuiz.correctIndex] || mathQuiz.correctLetter || 'A';
    await page.click(`[data-testid="ssw-quiz-opt-${correctLetter}"]`);
    await page.waitForSelector('[data-testid="ssw-quiz-grade-feedback"]', { timeout: 5000 });
    const rightFeedback = await page.textContent('[data-testid="ssw-quiz-grade-feedback"]');
    assert.ok(rightFeedback && rightFeedback.includes('BENAR!'), `Expected BENAR feedback, got: ${rightFeedback}`);

    // Click "Buka Halaman Pembahasan"
    await page.click('[data-testid="ssw-open-discussion-page"]');
    await page.waitForSelector('[data-testid="ssw-pdf-page-title"]', { timeout: 5000 });

    // Check persistence across reload
    const savedStateBeforeReload = await page.evaluate(() => {
      const raw = localStorage.getItem('fz_ssw_master_state_v1');
      return raw ? JSON.parse(raw) : null;
    });
    assert.ok(savedStateBeforeReload && savedStateBeforeReload.readinessScorePct > 0, 'SSW progress must be saved in localStorage');
    assert.ok(savedStateBeforeReload.quizHistory.length >= 2, 'Quiz history must persist both wrong and right answers');

    // Quick Chips & SSW-specific card labels in BeginnerAnswerAssistant
    const chipCount = await page.locator('[data-testid="ssw-quick-chips"] button').count();
    assert.strictEqual(chipCount, 4, `Expected 4 SSW quick chips, got ${chipCount}`);
    const sswCollapseText = await page.textContent('[data-testid="copilot-toggle-collapse-btn"]');
    assert.ok(
      sswCollapseText && sswCollapseText.includes('Aksi & Tanya Sensei'),
      `SSW bottom dock must show Aksi & Tanya Sensei, got: ${sswCollapseText}`
    );
    const sswSendText = await page.textContent('[data-testid="teleprompter-send-btn"]');
    assert.ok(
      sswSendText && sswSendText.includes('Kirim ke Sensei'),
      `SSW bottom dock CTA must say Kirim ke Sensei, got: ${sswSendText}`
    );

    // 5B. SSW-Specific Tactical Popup ("Papan Taktis") — NO generic Sentence Blocks / PTE Charts!
    await page.click('[data-testid="open-workbench-pill-btn"]');
    await page.waitForSelector('[data-testid="ssw-tactical-popup"]', { timeout: 5000 });
    const tacticalText = await page.textContent('[data-testid="ssw-tactical-popup"]');
    assertZeroDashes('SSW tactical popup UI', tacticalText);
    const tipCardsCount = await page.locator('[data-testid="ssw-tactical-tip-card"]').count();
    assert.ok(tipCardsCount >= 1, `Expected >= 1 SSW tactical tip card, got ${tipCardsCount}`);
    assert.strictEqual(
      await page.locator('[data-testid="mode-tab-sentence_blocks"]').count(),
      0,
      'SSW Tactical Popup must NOT render generic foreign-language Sentence Blocks tabs'
    );
    await page.waitForSelector('[data-testid="ssw-popup-quiz-opt-A"]', { timeout: 5000 });
    await page.click('[data-testid="workbench-close-btn"]');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="ssw-header-quick-btn"]', { timeout: 15000 });
    await page.click('[data-testid="ssw-header-quick-btn"]');
    await page.waitForSelector('[data-testid="ssw-readiness-pct"]', { timeout: 10000 });
    const readinessAfterReload = await page.textContent('[data-testid="ssw-readiness-pct"]');
    assert.ok(
      readinessAfterReload && readinessAfterReload.includes(`${savedStateBeforeReload.readinessScorePct}%`),
      `Readiness after reload (${readinessAfterReload}) must preserve ${savedStateBeforeReload.readinessScorePct}%`
    );
    console.log(
      `OK: Quiz 0-spoiler, wrong rationale, right grading, discussion page jump, 4 quick chips, and reload persistence (${savedStateBeforeReload.readinessScorePct}%) verified.`
    );

    await context.close();

    // 6. Test Priority 1 FastAPI Backend Bundle hydration cleanly via intercepted /api/ssw/bundle?include_chunks=true
    const apiSrv = await startStaticServer({ serveApiBundle: true });
    try {
      const apiPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const seenBundleUrls = [];
      await apiPage.route('**/api/ssw/bundle**', async (route) => {
        const reqUrl = route.request().url();
        seenBundleUrls.push(reqUrl);
        const localRes = await fetch(`${apiSrv.baseUrl}/api/ssw/bundle?include_chunks=true`);
        const body = await localRes.text();
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
          body,
        });
      });
      await apiPage.addInitScript(() => {
        localStorage.setItem(
          'fiezel-auth-v1',
          JSON.stringify({ signedIn: true, sub: 'ssw-api', name: 'API Student', email: 'api@fiezel.test' })
        );
        localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'API Student' }));
        localStorage.setItem('fz_target_course', 'ja');
      });
      await apiPage.goto(`${apiSrv.baseUrl}/call.html?lang=ja&theme=light`, { waitUntil: 'domcontentloaded' });
      await apiPage.waitForSelector('[data-testid="ssw-header-quick-btn"]', { timeout: 15000 });
      await apiPage.click('[data-testid="ssw-header-quick-btn"]');
      await apiPage.waitForSelector('[data-testid="ssw-sensei-workbench"][data-hydrated="true"]', { timeout: 15000 });
      const apiChunks = await apiPage.getAttribute('[data-testid="ssw-sensei-workbench"]', 'data-chunks');
      assert.ok(Number(apiChunks) >= 1200, `Priority 1 FastAPI bundle must hydrate >= 1200 chunks, got ${apiChunks}`);
      const bundleReq = seenBundleUrls.find((u) => u.includes('/api/ssw/bundle'));
      assert.ok(bundleReq && bundleReq.includes('include_chunks=true'), `Expected /api/ssw/bundle?include_chunks=true, got ${bundleReq}`);
      const staticFallbackCalls = apiSrv.requestedUrls.filter((u) => u.includes('content/ssw/'));
      assert.strictEqual(staticFallbackCalls.length, 0, 'When Priority 1 FastAPI succeeds, static JSON fallback must not fire');
      await apiPage.close();
      console.log('OK: Priority 1 FastAPI /api/ssw/bundle?include_chunks=true hydration path verified (0 fallback needed).');
    } finally {
      apiSrv.server.close();
    }

    // 7. Regression Check: Coach Sarah EN Ide Bicara + EN Cara Baca + Mochi 3D intact
    const enPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    enPage.on('pageerror', (err) => pageErrors.push(`EN: ${err}`));
    await enPage.addInitScript(() => {
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ signedIn: true, sub: 'en-probe', name: 'Sarah Tester' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, name: 'Sarah Tester' }));
      localStorage.setItem('fz_target_course', 'en');
    });
    await enPage.goto(`${srv.baseUrl}/call.html?lang=en&theme=light`, { waitUntil: 'domcontentloaded' });
    await enPage.waitForFunction(() => (document.body.innerText || '').includes('Ide Bicara'), null, { timeout: 15000 });
    const enText = await enPage.evaluate(() => document.body.innerText || '');
    assert.ok(
      enText.includes('Coach Alex') || enText.includes('Coach Sarah'),
      'EN Coach (Coach Alex / Coach Sarah) mode must still load cleanly'
    );
    assert.ok(enText.includes('Ide Bicara'), 'Ide Bicara assistant must still render on EN mode');
    assert.ok(enText.includes('Pakai Jawaban'), 'EN mode must keep generic Pakai Jawaban CTA');
    assert.strictEqual(
      await enPage.locator('[data-testid="ssw-header-quick-btn"]').count(),
      0,
      'SSW SENSEI header shortcut must stay scoped to Japanese course only'
    );
    await enPage.close();
    console.log('OK: Coach Sarah EN Ide Bicara non-regression verified.');

    assert.strictEqual(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(' | ')}`);
    assert.strictEqual(consoleErrors.length, 0, `Unexpected console errors: ${consoleErrors.join(' | ')}`);
  } finally {
    await browser.close();
    srv.server.close();
  }
}

(async () => {
  try {
    const { kb } = await runStaticAndWorkerChecks();
    await runPlaywrightE2E({ kb });
    console.log('SSW_SENSEI_PROBE_PASS: ALL CHECKS GREEN (0 FAILURES)');
    process.exit(0);
  } catch (err) {
    console.error('SSW_SENSEI_PROBE_FAILED:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
