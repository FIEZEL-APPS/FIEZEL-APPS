/*
 * FIEZEL Whiteboard (Kawan Bicara / Papan Belajar) empirical probe.
 *
 * Headless Chromium drives call.html against a local server that mocks the
 * Worker endpoints with REAL streaming SSE + delayed neural TTS so the probe
 * measures the same client code paths that run in production:
 *   A. Canvas reveal latency vs. TTS latency (initial audio gate)
 *   B. Quiz integrity (MCQ option count/duplicates, cloze chips, blocks shuffle, reroll)
 *   C. Minimize/restore crash (rules-of-hooks)
 *   D. Follow-up question: old board must not race while generating, opener
 *      pre-warm must hit the exact Chunk-0 TTS text, no duplicate fallback requests.
 *
 * Usage: node tests/whiteboard-speed-quiz-probe.cjs [--strict]
 *   --strict exits 1 when any invariant fails (used after the fix).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../node_modules/playwright'));

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const TTS_DELAY_MS = 2400;
const OPENER_DELAY_MS = 300;
const BOARD_DELAY_MS = 3200;

const log = { tts: [], stream: [], partnerTurn: [], anon: 0 };

function wavBase64(seconds) {
  const sr = 24000;
  const n = Math.floor(sr * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    // syllable-like amplitude envelope so the word aligner finds voiced regions
    const env = Math.abs(Math.sin((i / sr) * Math.PI * 3.2));
    buf.writeInt16LE(Math.round(Math.sin((i / sr) * 2 * Math.PI * 220) * 9000 * env), 44 + i * 2);
  }
  return buf.toString('base64');
}

const BOARD_A = {
  actionType: 'open_learning_popup',
  topicTitle: 'Beda To Be dan Verb Biasa',
  focusType: 'grammar',
  patternFormula: 'Subject + am/is/are + Adjective/Noun',
  explanationText: 'To be dipakai sebelum kata sifat, kata benda, atau lokasi. Verb biasa dipakai untuk aksi.',
  coachSpokenScript: 'To be dipakai sebelum kata sifat, kata benda, atau lokasi. Verb biasa dipakai untuk aksi.',
  sampleTarget: 'She is happy today.',
  trapWrongSentence: 'She happy today.',
  trapWrongReason: 'Kata sifat butuh to be "is" sebagai penghubung.',
  drillMeaningPrompt: 'Pilih kalimat yang benar untuk "Dia senang hari ini".',
  bankTopicId: 'custom_dynamic',
  sourceLayer: 'ai_dynamic',
  phaseLabels: ['0 Mulai', '1 Logika', '2 Visual', '3 Contoh', '4 Latihan'],
  whiteboardSteps: [
    {
      id: 's0', kind: 'heading', column: 'left', phaseIndex: 0,
      title: 'To Be vs Verb Biasa', text: 'Kapan pakai is, kapan pakai kata kerja',
      spokenNarration: 'Perhatikan baik-baik ya, kita akan bedah beda To Be dan Verb biasa supaya kamu tidak tertukar lagi saat bicara.',
    },
    {
      id: 's1', kind: 'note', column: 'left', phaseIndex: 1, title: 'Aturan Inti',
      bullets: [
        'To be (am, is, are) dipakai sebelum kata sifat seperti happy atau tired.',
        'To be juga dipakai sebelum kata benda dan lokasi seperti a teacher atau at home.',
        'Verb biasa dipakai untuk aksi nyata seperti eat, go, atau study tanpa to be.',
      ],
      spokenNarration: 'To be seperti am, is, dan are dipakai sebelum kata sifat seperti happy atau tired. To be juga dipakai sebelum kata benda dan lokasi seperti a teacher atau at home. Verb biasa dipakai untuk aksi nyata seperti eat, go, atau study tanpa to be.',
    },
    {
      id: 's2', kind: 'contrast_scale', column: 'right', phaseIndex: 2, title: 'Kondisi vs Aksi',
      termA: 'is + happy', descA: 'menyatakan kondisi', termB: 'eats rice', descB: 'menyatakan aksi',
      analogy: 'Kondisi pakai to be, aksi pakai verb.',
      spokenNarration: 'Di sisi kiri ada is plus happy yang menyatakan kondisi. Di sisi kanan ada eats rice yang menyatakan aksi. Jadi kondisi memakai to be, sedangkan aksi memakai verb biasa.',
    },
    {
      id: 's3', kind: 'table', column: 'left', phaseIndex: 3, title: 'Contoh Nyata',
      tableHeaders: ['Kalimat', 'Jenis', 'Arti'],
      tableRows: [['She is happy.', 'To be', 'Dia senang.'], ['She eats rice.', 'Verb', 'Dia makan nasi.']],
      spokenNarration: 'Contoh pertama, she is happy, artinya dia senang. Contoh kedua, she eats rice, artinya dia makan nasi.',
    },
    {
      id: 's4', kind: 'trap_vs_fix', column: 'right', phaseIndex: 4, title: 'Jebakan',
      wrongText: 'She happy today.', rightText: 'She is happy today.', reason: 'Kata sifat butuh is.',
      spokenNarration: 'Hindari kalimat she happy today tanpa is. Yang benar adalah she is happy today karena kata sifat butuh is.',
    },
    {
      id: 's5', kind: 'highlight_callout', column: 'left', phaseIndex: 4, title: 'Kunci',
      highlightPhrase: 'Kondisi = to be, Aksi = verb',
      spokenNarration: 'Ingat kuncinya, kondisi memakai to be, dan aksi memakai verb biasa.',
    },
  ],
};

const BOARD_B = JSON.parse(JSON.stringify(BOARD_A));
BOARD_B.topicTitle = 'Kenapa She Is Happy Pakai Is';
BOARD_B.patternFormula = 'She/He/It + is + Adjective';
BOARD_B.explanationText = 'Subjek tunggal she memakai is, bukan am atau are.';
BOARD_B.coachSpokenScript = BOARD_B.explanationText;
BOARD_B.whiteboardSteps[0] = {
  id: 'b0', kind: 'heading', column: 'left', phaseIndex: 0,
  title: 'Kenapa Pakai Is', text: 'Subjek tunggal + is',
  spokenNarration: 'Simak baik-baik, kata is muncul karena subjek she itu tunggal • jadi to be yang cocok adalah is.',
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b));
  });
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const p = url.pathname;
      if (p.startsWith('/api/')) {
        const body = await readBody(req);
        let json = {};
        try { json = JSON.parse(body || '{}'); } catch {}
        if (p === '/api/auth/anon') {
          log.anon += 1;
          res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'fz_id=probe; Path=/' });
          return res.end('{"ok":true}');
        }
        if (p === '/api/voice/gemini-tts') {
          const text = String(json.text || '');
          log.tts.push({ t: Date.now(), text });
          await new Promise((r) => setTimeout(r, TTS_DELAY_MS));
          const sec = Math.max(1.2, Math.min(9, text.split(/\s+/).length * 0.33));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ audioBase64: wavBase64(sec), audioMimeType: 'audio/wav', model: 'probe-tts' }));
        }
        if (p === '/api/voice/whiteboard-stream') {
          const isFollow = /kenapa/i.test(String(json.text || ''));
          const board = isFollow ? BOARD_B : BOARD_A;
          log.stream.push({ t: Date.now(), text: json.text, hasBoardContext: Boolean(json.boardContext), visualKinds: json.boardContext?.currentVisualKinds || null });
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
          res.write(': open\n\n');
          setTimeout(() => {
            res.write(`event: opener\ndata: ${JSON.stringify({ topicTitle: board.topicTitle, patternFormula: board.patternFormula, headingStep: board.whiteboardSteps[0] })}\n\n`);
          }, OPENER_DELAY_MS);
          setTimeout(() => {
            res.write(`event: board\ndata: ${JSON.stringify({ uiAction: board, aiReply: board.explanationText })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          }, BOARD_DELAY_MS);
          return;
        }
        if (p === '/api/voice/partner-turn') {
          log.partnerTurn.push({ t: Date.now(), text: json.text });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ uiAction: BOARD_A, aiReply: 'ok' }));
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end('{"error":"probe_not_mocked"}');
      }
      let fp = path.join(ROOT, decodeURIComponent(p === '/' ? '/call.html' : p));
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404);
        return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache, no-store, must-revalidate' });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
}

async function waitFor(fn, timeoutMs, stepMs = 40) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn()) return Date.now() - t0;
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return -1;
}

(async () => {
  const { server, port } = await startServer();
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  await context.addInitScript(() => {
    localStorage.setItem('fz_target_course', 'en');
    localStorage.setItem('fiezel_voice_target_lang', 'en');
    localStorage.setItem('fiezel-auth-v1', JSON.stringify({ userId: 'probe', name: 'Probe' }));
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ completed: true }));
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /hook|Rendered (fewer|more)/i.test(m.text())) pageErrors.push(m.text());
  });

  await page.goto(`http://127.0.0.1:${port}/call.html`, { waitUntil: 'domcontentloaded' });
  await waitFor(() => page.evaluate(() => Boolean(window.__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__)), 15000);

  // ---------- A. Reveal latency ----------
  log.tts.length = 0;
  const tOpen = Date.now();
  await page.evaluate((a) => window.__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__.openWorkbench(a), BOARD_A);
  const revealMs = await waitFor(
    () =>
      page.evaluate(
        () =>
          !document.querySelector('[data-testid="workbench-buffering-state"]') &&
          Boolean(document.querySelector('[data-testid="solvely-dotgrid-whiteboard"]'))
      ),
    20000
  );
  check(`A1 canvas reveals well before neural TTS returns (<= 1650ms, TTS=${TTS_DELAY_MS}ms)`, revealMs >= 0 && revealMs <= 1650 && revealMs < TTS_DELAY_MS - 400, `${revealMs}ms`);
  const firstAudioMs = await waitFor(
    () => page.evaluate(() => (window.__fzWbAudioDebug?.playedChunks || []).length > 0),
    20000
  );
  check('A2 first narration chunk plays', firstAudioMs >= 0, `${firstAudioMs + revealMs}ms after open`);
  void tOpen;

  // ---------- B. Quiz integrity ----------
  const quizCard = await waitFor(() => page.evaluate(() => Boolean(document.querySelector('[data-testid^="quiz-option-"]'))), 6000);
  const readOptions = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="quiz-option-"]')).map((b) => b.querySelector('span')?.textContent?.trim() || ''));
  const opts = quizCard >= 0 ? await readOptions() : [];
  check('B1 MCQ has >= 3 options', opts.length >= 3, opts);
  check('B2 MCQ options are unique', new Set(opts).size === opts.length, opts);
  const correctIdx = opts.indexOf('She is happy today.');
  await page.click('[data-testid="wb-reroll-btn"]').catch(() => {});
  await page.waitForTimeout(250);
  const optsAfter = await readOptions();
  const correctIdxAfter = optsAfter.indexOf('She is happy today.');
  const sameOrder = JSON.stringify(opts) === JSON.stringify(optsAfter);
  check('B3 "Ganti Soal" reshuffles the challenge', !sameOrder, { before: opts, after: optsAfter, correctIdx, correctIdxAfter });

  await page.click('[data-testid="mode-tab-cloze_gap"]').catch(() => {});
  await page.waitForTimeout(200);
  const chips = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="cloze-chip-"]')).map((b) => b.textContent.trim()));
  check('B4 cloze gap offers >= 3 distinct chips', new Set(chips).size >= 3, chips);

  await page.click('[data-testid="mode-tab-sentence_blocks"]').catch(() => {});
  await page.waitForTimeout(200);
  const pool = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="available-block-"]')).map((b) => b.textContent.trim()));
  const correct = ['She', 'is', 'happy', 'today'];
  const norm = (arr) => JSON.stringify(arr.map((w) => w.replace(/[.!?]$/, '')));
  check(
    'B5 sentence blocks are genuinely shuffled (not answer order, not plain reverse)',
    pool.length >= 3 && norm(pool) !== norm(correct) && norm(pool) !== norm([...correct].reverse()),
    pool
  );
  await page.click('[data-testid="mode-tab-multiple_choice"]').catch(() => {});

  // ---------- B6/B7/B8. Pause, Resume, Phase Scrubber & Screenshot ----------
  const scrubberBtns = page.locator('[data-testid="wb-phase-scrubber"] button');
  const scrubberCount = await scrubberBtns.count();
  if (scrubberCount >= 5) {
    // Click Phase 2 (visual diagram)
    await scrubberBtns.nth(2).click();
    await page.waitForTimeout(450);
    const activeAfterPhase2 = await page.evaluate(() => {
      const activeEl = document.querySelector('[data-wb-step-state="active"]');
      return activeEl ? activeEl.getAttribute('data-wb-step-id') : null;
    });
    check('B6 Phase Scrubber seeks to Phase 2 (visual diagram)', activeAfterPhase2 === 's2', activeAfterPhase2);

    // Pause, wait 500ms, verify no step jumps, then Resume
    await page.click('[data-testid="wb-play-pause-btn"]');
    await page.waitForTimeout(150);
    const snapPause1 = await page.evaluate(() => document.querySelector('[data-testid="wb-lockstep-timer"]')?.textContent?.trim() || '');
    await page.waitForTimeout(500);
    const snapPause2 = await page.evaluate(() => document.querySelector('[data-testid="wb-lockstep-timer"]')?.textContent?.trim() || '');
    check('B7 Pause freezes whiteboard & audio clock cleanly', snapPause1 === snapPause2 && Boolean(snapPause1), { snapPause1, snapPause2 });

    await page.click('[data-testid="wb-play-pause-btn"]');
    const resumedAudio = await waitFor(
      () => page.evaluate(() => Boolean(window.__fzWbLockstepActive) && window.__fzWbAudioDebug?.mode === 'webaudio'),
      5000
    );
    check('B8 Resume continues WebAudio playback immediately', resumedAudio >= 0, `${resumedAudio}ms`);

    // Click last phase dot ("4 Latihan") -> should target the final phase step (wb_checkpoint), NOT overshoot out of board
    await scrubberBtns.nth(4).click();
    await page.waitForTimeout(350);
    const activeAfterPhase4 = await page.evaluate(() => {
      const activeEl = document.querySelector('[data-wb-step-state="active"]');
      return activeEl ? activeEl.getAttribute('data-wb-step-id') : null;
    });
    check('B9 Last Phase Scrubber button jumps to final step instead of overshooting', ['s4', 's5', 'wb_checkpoint'].includes(activeAfterPhase4), activeAfterPhase4);
  }

  // Capture Desktop screenshot while active
  const shotDir = path.resolve(__dirname, '../coordination/screenshots');
  if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, 'whiteboard-desktop-verify.png'), fullPage: false });

  // ---------- C. Minimize / restore ----------
  const errBefore = pageErrors.length;
  await page.click('[data-testid="workbench-minimize-btn"]').catch(() => {});
  await page.waitForTimeout(300);
  const minimizedVisible = await page.evaluate(() => Boolean(document.querySelector('[data-testid="in-call-workbench-minimized"]')));
  await page.click('[data-testid="workbench-restore-btn"]').catch(() => {});
  await page.waitForTimeout(400);
  const restoredVisible = await page.evaluate(() => Boolean(document.querySelector('[data-testid="solvely-dotgrid-whiteboard"]')));
  check('C1 minimize + restore without React hook crash', minimizedVisible && restoredVisible && pageErrors.length === errBefore, { minimizedVisible, restoredVisible, errors: pageErrors.slice(errBefore) });

  // ---------- D. Follow-up question ----------
  // Fresh page so a crash in C cannot mask D.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitFor(() => page.evaluate(() => Boolean(window.__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__)), 15000);
  await page.evaluate((a) => window.__FIEZEL_VOICE_STUDIO_TEST_BRIDGE__.openWorkbench(a), BOARD_A);
  await waitFor(() => page.evaluate(() => (window.__fzWbAudioDebug?.playedChunks || []).length > 0), 20000);
  await page.waitForTimeout(600);
  log.tts.length = 0;
  log.stream.length = 0;
  log.partnerTurn.length = 0;
  const capBefore = await page.evaluate(() => window.__fzWbAudioDebug?.activeChunk ?? null);
  const scriptCharsBefore = await page.evaluate(() => window.__fzWbAudioDebug?.scriptChars ?? null);
  await page.fill('[data-testid="wb-board-question-input"]', 'kenapa she is happy pakai is?');
  const tAsk = Date.now();
  await page.click('[data-testid="wb-board-question-submit"]');
  const progressSamples = [];
  for (let i = 0; i < 8; i++) {
    if (Date.now() - tAsk > BOARD_DELAY_MS - 450) break;
    await page.waitForTimeout(220);
    if (Date.now() - tAsk > BOARD_DELAY_MS - 250) break;
    const sample = await page.evaluate(() => ({
      caption: (document.querySelector('[data-testid="wb-lockstep-caption"]')?.textContent || '').trim().slice(0, 40),
      timer: (document.querySelector('[data-testid="wb-lockstep-timer"]')?.textContent || '').trim(),
      playing: Boolean(window.__fzWbLockstepActive),
      landed: /Subjek tunggal \+ is|Kenapa Pakai Is/i.test(document.querySelector('[data-testid="solvely-dotgrid-whiteboard"]')?.textContent || ''),
    }));
    if (sample.landed) break;
    progressSamples.push(sample);
  }
  const distinctCaptions = new Set(progressSamples.map((s) => s.caption)).size;
  const distinctTimers = new Set(progressSamples.map((s) => s.timer)).size;
  const racedWhileGenerating = distinctCaptions > 1 || distinctTimers > 2;
  check('D1 old board does not race/narrate while follow-up is generating', progressSamples.length >= 3 && !racedWhileGenerating && !progressSamples.slice(2).some((s) => s.playing), { capBefore, distinctCaptions, distinctTimers, progressSamples: progressSamples.filter((_, i) => i % 2 === 0) });

  const newBoardMs = await waitFor(
    () => page.evaluate(() => /Subjek tunggal \+ is|Kenapa Pakai Is/i.test(document.querySelector('[data-testid="solvely-dotgrid-whiteboard"]')?.textContent || '')),
    15000
  );
  const tBoardSeen = Date.now();
  const newAudioMs = await waitFor(
    () =>
      page.evaluate(
        (before) =>
          window.__fzWbAudioDebug?.scriptChars !== before &&
          window.__fzWbAudioDebug?.mode === 'webaudio' &&
          (window.__fzWbAudioDebug?.playedChunks || []).length > 0,
        scriptCharsBefore
      ),
    15000
  );
  const askToAudio = Date.now() - tAsk;
  const boardToAudio = Date.now() - tBoardSeen;
  check('D2 follow-up board audio starts <= 1200ms after the board lands (opener pre-warm hit)', newBoardMs >= 0 && newAudioMs >= 0 && boardToAudio <= 1200, { askToAudioMs: askToAudio, boardToAudioMs: boardToAudio, boardDelayMs: BOARD_DELAY_MS, newBoardMs });
  const followTexts = log.tts.map((x) => x.text);
  const firstFollowText = followTexts[0] || '';
  const reqForFirst = followTexts.filter((t) => t === firstFollowText).length;
  check('D3 pre-warmed opener text == Chunk-0 text (no duplicate TTS for opener)', followTexts.length > 0 && reqForFirst === 1 && /^Kata is muncul/i.test(firstFollowText), { prewarmText: firstFollowText, allTts: followTexts.slice(0, 4) });
  check('D4 exactly one stream request, no duplicate partner-turn fallback', log.stream.length === 1 && log.partnerTurn.length === 0, { stream: log.stream.length, partnerTurn: log.partnerTurn.length });
  const kinds = log.stream[0]?.visualKinds || [];
  check('D5 follow-up context reports all on-screen visual kinds', kinds.includes('contrast_scale') && kinds.includes('table') && kinds.includes('trap_vs_fix'), kinds);

  // ---------- E. Mobile Responsive Layout (390x844) ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  const mobileMetrics = await page.evaluate(() => {
    const modal = document.querySelector('[data-testid="in-call-learning-workbench"] > div');
    const mRect = modal ? modal.getBoundingClientRect() : null;
    const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    const wbInput = document.querySelector('[data-testid="wb-board-question-input"]')?.getBoundingClientRect() || null;
    return {
      docOverflow,
      modalWidth: mRect ? Math.round(mRect.width) : 0,
      hasInput: Boolean(wbInput && wbInput.width > 80),
      emDashLeak: /[\u2014\u2013]/.test(document.querySelector('[data-testid="in-call-learning-workbench"]')?.textContent || ''),
    };
  });
  check(
    'E1 Mobile 390x844 fits without overflow or UI em-dash leak',
    !mobileMetrics.docOverflow && mobileMetrics.modalWidth <= 390 && mobileMetrics.hasInput && !mobileMetrics.emDashLeak,
    mobileMetrics
  );
  await page.screenshot({ path: path.join(shotDir, 'whiteboard-mobile-verify.png'), fullPage: false });

  check('Z0 zero page errors overall', pageErrors.length === 0, pageErrors.slice(0, 5));

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} invariants passed.`);
  if (STRICT && failed.length) process.exit(1);
})().catch((e) => {
  console.error('PROBE CRASH', e);
  process.exit(2);
});
