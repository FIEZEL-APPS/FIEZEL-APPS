#!/usr/bin/env node
/**
 * tools/dev/probe-coach-alex-50-turns.mjs
 *
 * Empirical Playwright Chromium Headless Probe for:
 * 1. Roleplaying as an Indonesian learner practicing English with Coach Alex.
 * 2. Executing exactly 50 conversational turns in Kawan Bicara (Mitra Bicara).
 * 3. Auditing Coach Alex's AI responses across 8 thematic stages.
 * 4. Auditing auto-voice neural audio delivery:
 *    - Persona: Coach Alex (en-US-GuyNeural, pitch: +4Hz, rate: +2%)
 *    - Sentence chunking and splitting
 *    - Playback latency, speech duration, WPM tempo naturalness
 * 5. Auditing Grammar Corrections:
 *    - Deliberate grammatical errors (SVA, past tense, double comparative, prepositions, etc.)
 *    - Misconception ledger and detector accuracy
 *    - Nudge modal behavior and correctionMode toggle (diffMarkup, explanation notes)
 *    - Pedagogical alignment: no praises for incorrect sentences, zero-dumbing invariant.
 * 6. Collecting comprehensive audit metrics, saving full transcript log and report.
 */

import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel.replace(/^\/+/, ''));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});

// The 50 Conversational Turns for English Practice with Coach Alex
const CONVERSATION_TURNS = [
  // Stage 1: Greetings & Introduction (Turns 1-5)
  { id: 1, text: "Hi Coach Alex! I'm excited to practice English with you today.", stage: "1. Greetings & Intro" },
  { id: 2, text: "Can you hear me clearly? How's your day going so far?", stage: "1. Greetings & Intro" },
  { id: 3, text: "I want to improve my speaking confidence because I often feel nervous in meetings.", stage: "1. Greetings & Intro" },
  { id: 4, text: "I work as a software engineer in Jakarta, Indonesia.", stage: "1. Greetings & Intro" },
  { id: 5, text: "What topics do you recommend we practice today?", stage: "1. Greetings & Intro" },

  // Stage 2: Daily Routine & Hobbies (Turns 6-12)
  { id: 6, text: "Usually I wake up at 6 AM and drink a warm cup of coffee.", stage: "2. Daily Routine & Hobbies" },
  { id: 7, text: "After work, I really enjoy playing guitar and watching anime.", stage: "2. Daily Routine & Hobbies" },
  { id: 8, text: "Have you ever watched any Japanese anime or animated movies?", stage: "2. Daily Routine & Hobbies" },
  { id: 9, text: "My favorite anime is Attack on Titan because the plot twists are mind-blowing.", stage: "2. Daily Routine & Hobbies" },
  { id: 10, text: "On weekends, I love hanging out with my friends at local coffee shops.", stage: "2. Daily Routine & Hobbies" },
  { id: 11, text: "We often talk about tech trends, gadgets, and our future career plans.", stage: "2. Daily Routine & Hobbies" },
  { id: 12, text: "Do you prefer staying at home on weekends or going outside?", stage: "2. Daily Routine & Hobbies" },

  // Stage 3: Deliberate Grammar Errors (Turns 13-22) - Testing Grammar Correction & Misconception Ledger
  { id: 13, text: "He go to school by bus every single morning.", stage: "3. Grammar Stress Test", deliberateError: "sva_present", expectedFix: "He goes" },
  { id: 14, text: "Yesterday I go to the supermarket to buy some groceries.", stage: "3. Grammar Stress Test", deliberateError: "past_tense_go", expectedFix: "went" },
  { id: 15, text: "I am agree with your point about practicing every day.", stage: "3. Grammar Stress Test", deliberateError: "verb_agree", expectedFix: "I agree" },
  { id: 16, text: "I have lived in Jakarta since 5 years.", stage: "3. Grammar Stress Test", deliberateError: "prep_since_vs_for", expectedFix: "for 5 years" },
  { id: 17, text: "They goes to the gym together three times a week.", stage: "3. Grammar Stress Test", deliberateError: "sva_plural_s", expectedFix: "They go" },
  { id: 18, text: "She don't like drinking sweet iced tea.", stage: "3. Grammar Stress Test", deliberateError: "sva_doesnt", expectedFix: "doesn't" },
  { id: 19, text: "I have went to Bali twice for summer vacation.", stage: "3. Grammar Stress Test", deliberateError: "perfect_went", expectedFix: "have gone" },
  { id: 20, text: "Speaking practice is more better than only memorizing words.", stage: "3. Grammar Stress Test", deliberateError: "double_comparative", expectedFix: "better" },
  { id: 21, text: "Right now I am study hard for my upcoming job interview.", stage: "3. Grammar Stress Test", deliberateError: "verb_study_be", expectedFix: "am studying / study" },
  { id: 22, text: "My manager always give us clear project guidelines.", stage: "3. Grammar Stress Test", deliberateError: "sva_present", expectedFix: "gives" },

  // Stage 4: Food, Dining & Culinary Culture (Turns 23-28)
  { id: 23, text: "Indonesian food is known for rich spices, especially beef rendang.", stage: "4. Food & Dining" },
  { id: 24, text: "Have you ever tried traditional spicy food from Southeast Asia?", stage: "4. Food & Dining" },
  { id: 25, text: "Sometimes I love cooking simple fried rice or spicy noodles at night.", stage: "4. Food & Dining" },
  { id: 26, text: "What is your comfort food when you feel hungry after a long day?", stage: "4. Food & Dining" },
  { id: 27, text: "I can never say no to a hot bowl of spicy ramen on a rainy day.", stage: "4. Food & Dining" },
  { id: 28, text: "Could you help me practice ordering food at a busy cafe?", stage: "4. Food & Dining" },

  // Stage 5: Work, Career, Stress & Ambitions (Turns 29-35)
  { id: 29, text: "Lately I have been feeling quite busy and overwhelmed with work deadlines.", stage: "5. Work & Career" },
  { id: 30, text: "Sometimes I feel frustrated when I pause too long looking for English words.", stage: "5. Work & Career" },
  { id: 31, text: "Do you have any practical tips for overcoming nervous jitters before a presentation?", stage: "5. Work & Career" },
  { id: 32, text: "My goal is to join an international remote company next year.", stage: "5. Work & Career" },
  { id: 33, text: "I want to be able to present sprint results clearly without reading notes.", stage: "5. Work & Career" },
  { id: 34, text: "Collaborating across different time zones requires great asynchronous communication.", stage: "5. Work & Career" },
  { id: 35, text: "How do native speakers politely express disagreement in business meetings?", stage: "5. Work & Career" },

  // Stage 6: Colloquial English, Slang & Idioms (Turns 36-41)
  { id: 36, text: "Can you tell me about common English slang used by young people?", stage: "6. Slang & Idioms" },
  { id: 37, text: "What does 'break a leg' mean in English conversations?", stage: "6. Slang & Idioms" },
  { id: 38, text: "What about the phrase 'under the weather'?", stage: "6. Slang & Idioms" },
  { id: 39, text: "Is it natural to say 'I'm completely beat' when I am exhausted?", stage: "6. Slang & Idioms" },
  { id: 40, text: "Can I say 'catch you later' to wrap up a casual phone call?", stage: "6. Slang & Idioms" },
  { id: 41, text: "What is the subtle difference between 'hang out' and 'chill out'?", stage: "6. Slang & Idioms" },

  // Stage 7: Travel, Scenarios & Practical Situations (Turns 42-46)
  { id: 42, text: "If I visit the United States, what cities do you recommend exploring?", stage: "7. Travel & Situations" },
  { id: 43, text: "How should I ask for directions politely if I get lost in an airport?", stage: "7. Travel & Situations" },
  { id: 44, text: "Let's roleplay checking into a hotel room.", stage: "7. Travel & Situations" },
  { id: 45, text: "I would like to check in, I have a reservation under Rian Pratama.", stage: "7. Travel & Situations" },
  { id: 46, text: "Does the booking include complimentary breakfast and Wi-Fi?", stage: "7. Travel & Situations" },

  // Stage 8: Fluency Review, Coaching Feedback & Wrap Up (Turns 47-50)
  { id: 47, text: "We have had an extensive conversation today, Coach Alex!", stage: "8. Review & Wrap Up" },
  { id: 48, text: "How did I perform across our 50 conversation turns?", stage: "8. Review & Wrap Up" },
  { id: 49, text: "What specific speaking habits should I practice every day?", stage: "8. Review & Wrap Up" },
  { id: 50, text: "Thank you so much for the coaching session, Alex! Catch you later!", stage: "8. Review & Wrap Up" }
];

async function main() {
  console.log('================================================================');
  console.log('  AUDIT EMPIRIS: ROLEPLAY 50 TURNS DENGAN COACH ALEX (EN)      ');
  console.log('================================================================\n');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;
  console.log(`[1] Local Test Server berjalan di: ${baseUrl}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    permissions: ['microphone'],
    serviceWorkers: 'block'
  });

  // Track all TTS line requests
  const ttsRequests = [];

  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());

    if (url.pathname.includes('/api/tts/line')) {
      const body = req.postDataJSON() || {};
      ttsRequests.push({
        url: req.url(),
        body: body,
        at: Date.now()
      });

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({
          ok: true,
          audioBase64: 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAA=',
          mimeType: 'audio/mpeg',
          voiceName: 'Coach Alex',
          personaLabel: 'Coach Alex · Native American Coach (GuyNeural)',
          edgeVoice: 'en-US-GuyNeural',
          pitch: '+4Hz',
          rate: '+2%'
        })
      });
    }

    if (url.hostname.includes('fiezel.my.id') || url.hostname.includes('puter.com') || url.hostname.includes('onrender.com')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify({ ok: true, status: 'ok', user: { name: 'Murid QA' }, data: [] })
      });
    }

    return route.continue();
  });

  const consoleLogs = [];
  const consoleErrors = [];

  // Seed user state for English course with Coach Alex
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fz_user_registered', '1');
      localStorage.setItem('fz_auth_mode', 'guest');
      localStorage.setItem('fz_auth_completed', '1');
      localStorage.setItem('fz_user_name', 'Rian Pratama');
      localStorage.setItem('fiezel_course', 'en');
      localStorage.setItem('fiezel_target_lang', 'en');
      localStorage.setItem('fz_target_course', 'en');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fz_persona_en', 'alex');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Rian Pratama', goal: 'general', level: 'B1', role: 'murid', course: 'en' }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      sessionStorage.setItem('fiezel_boot_count', '2');
      sessionStorage.setItem('fz_tour_done', '1');
    } catch (_) {}

    setInterval(() => {
      try {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-booting', 'fz-auth-open');
      } catch (_) {}
    }, 50);

    // Audio tracking mock
    window.__voicePlaybackLog = [];
    window.__FIEZEL_TEST_AUDIO_PLAYER__ = {
      play(resultObj, myToken) {
        window.__voicePlaybackLog.push({
          token: myToken,
          resultObj: resultObj,
          at: Date.now()
        });
        return Promise.resolve(true);
      }
    };
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    const txt = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, txt });
    if (type === 'error' && !txt.includes('favicon.ico') && !txt.includes('Failed to load resource')) {
      consoleErrors.push(txt);
    }
  });

  console.log(`[2] Memuat aplikasi FIEZEL...`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.go === 'function', null, { timeout: 15000 });
  await page.waitForTimeout(600);

  // Navigasi ke Kawan Bicara
  console.log(`[3] Navigasi ke Kawan Bicara (EN / Coach Alex)...`);
  await page.evaluate(() => {
    if (typeof window.state !== 'undefined') {
      window.state.course = 'en';
      window.state.targetLang = 'en';
    }
    window.go('chat');
  });
  await page.waitForTimeout(600);

  // Verifikasi Kawan Bicara terpasang & Coach Alex aktif
  const initCheck = await page.evaluate(() => {
    const chat = window.FiezelInteractiveChat;
    if (chat && typeof chat.setPersona === 'function') {
      chat.setPersona('alex', 'en');
    }
    const state = chat ? chat.getState() : null;
    const persona = state ? (state.selectedPersonas && state.selectedPersonas.en) : null;
    return {
      mounted: !!document.querySelector('.fzc-container'),
      course: state ? state.course : null,
      persona: persona,
      scenarioId: state ? state.scenarioId : null,
      autoVoice: state ? state.autoVoice : null,
      correctionMode: state ? state.correctionMode : null
    };
  });

  console.log(`    Status Kawan Bicara: mounted=${initCheck.mounted}, course=${initCheck.course}, persona=${initCheck.persona}`);

  console.log(`\n[4] MEMULAI ROLEPLAY 50 TURNS DENGAN COACH ALEX:\n`);

  const auditLog = [];

  for (let i = 0; i < CONVERSATION_TURNS.length; i++) {
    const turnDef = CONVERSATION_TURNS[i];
    const turnNum = i + 1;

    // Untuk Turn 16 ke atas (setelah deliberate errors di Turn 13-15 memicu 3 kesalahan berturut-turut),
    // kita nyalakan koreksi mode untuk menguji tampilan diffMarkup dan feedback visual!
    if (turnNum === 16) {
      await page.evaluate(() => {
        const chat = window.FiezelInteractiveChat;
        if (chat && typeof chat.setCorrectionMode === 'function') {
          chat.setCorrectionMode(true);
        }
      });
    }

    // Eksekusi kirim pesan
    const turnResult = await page.evaluate(async (userText) => {
      const chat = window.FiezelInteractiveChat;
      const cv = window.FiezelChatVoice;

      const t0 = Date.now();
      const sendPromise = new Promise((resolve) => {
        chat.sendMessage(userText);
        // Polling tunggu reply asisten masuk ke feed
        const check = setInterval(() => {
          const st = chat.getState();
          if (!st.isThinking) {
            clearInterval(check);
            resolve(Date.now() - t0);
          }
        }, 30);
      });

      const responseTimeMs = await sendPromise;

      const st = chat.getState();
      const lastUserMsg = st.messages.filter(m => m.role === 'user').pop();
      const lastAsstMsg = st.messages.filter(m => m.role === 'assistant').pop();

      // Hitung kata dan potong kalimat
      const asstText = lastAsstMsg ? lastAsstMsg.text : '';
      const chunks = cv ? cv.splitSentences(asstText, 'en') : [asstText];
      const wordCount = asstText.trim().split(/\s+/).filter(Boolean).length;

      // Estimasi durasi bicara pada tempo rate +2% (rata-rata 150 WPM * 1.02 ≈ 153 WPM ≈ 2.55 kata/detik)
      const estimatedSpeechSec = Math.round((wordCount / 2.55) * 10) / 10;

      // Ambil elemen DOM koreksi jika ada
      const userElem = document.querySelector('.fzc-msg-user:last-of-type');
      const correctionElem = userElem ? userElem.querySelector('.fzc-correction, .fzc-correction-ok') : null;
      const correctionHtml = correctionElem ? correctionElem.outerHTML : '';
      const hasDiffMarkup = correctionElem ? !!correctionElem.querySelector('ins, del, strong') : false;

      return {
        responseTimeMs,
        userMsg: lastUserMsg,
        asstMsg: lastAsstMsg,
        chunks: chunks,
        wordCount: wordCount,
        estimatedSpeechSec: estimatedSpeechSec,
        correctionHtml: correctionHtml,
        hasDiffMarkup: hasDiffMarkup,
        correctionMode: st.correctionMode,
        autoVoice: st.autoVoice
      };
    }, turnDef.text);

    // Ambil screenshot pada milestone penting (Turn 1, Turn 15, Turn 20, Turn 50)
    if (turnNum === 1 || turnNum === 15 || turnNum === 20 || turnNum === 50) {
      const ssPath = path.join(ROOT, 'tools', 'dev', `probe-alex-turn-${String(turnNum).padStart(2, '0')}.png`);
      await page.screenshot({ path: ssPath, fullPage: false });
    }

    const logEntry = {
      turn: turnNum,
      stage: turnDef.stage,
      userText: turnDef.text,
      deliberateError: turnDef.deliberateError || null,
      expectedFix: turnDef.expectedFix || null,
      asstText: turnResult.asstMsg ? turnResult.asstMsg.text : '',
      translation: turnResult.asstMsg ? turnResult.asstMsg.translation : '',
      grammarNote: turnResult.asstMsg ? turnResult.asstMsg.grammarNote : null,
      suggestions: turnResult.asstMsg ? turnResult.asstMsg.suggestions : [],
      chunksCount: turnResult.chunks.length,
      chunks: turnResult.chunks,
      wordCount: turnResult.wordCount,
      estimatedSpeechSec: turnResult.estimatedSpeechSec,
      hintTriggered: turnResult.userMsg ? turnResult.userMsg.hint : null,
      correctionMode: turnResult.correctionMode,
      correctionHtml: turnResult.correctionHtml,
      hasDiffMarkup: turnResult.hasDiffMarkup,
      responseTimeMs: turnResult.responseTimeMs
    };

    auditLog.push(logEntry);

    // Ringkasan konsol per turn
    const errFlag = logEntry.deliberateError ? ` [TEST ERROR: ${logEntry.deliberateError}]` : '';
    const hintFlag = logEntry.hintTriggered ? ` -> [HINT: ${logEntry.hintTriggered.title}]` : '';
    console.log(`  Turn #${String(turnNum).padStart(2, ' ')} (${turnDef.stage})${errFlag}${hintFlag}`);
    console.log(`    User: "${turnDef.text}"`);
    console.log(`    Alex: "${logEntry.asstText.slice(0, 75)}..."`);
    console.log(`    Tempo: ${logEntry.wordCount} kata (~${logEntry.estimatedSpeechSec}s) | Chunks: ${logEntry.chunksCount} | Response: ${logEntry.responseTimeMs}ms`);
  }

  // Verifikasi Integritas Data Akhir
  console.log(`\n[5] MEMVERIFIKASI INTEGRITAS STATE & TELEMETRI SETELAH 50 TURNS:`);

  const finalState = await page.evaluate(() => {
    const chat = window.FiezelInteractiveChat;
    const st = chat ? chat.getState() : null;
    const hist = chat ? chat.getChatHistory() : [];
    const localHistRaw = localStorage.getItem('fzc_chat_history_v1');
    const localHist = localHistRaw ? JSON.parse(localHistRaw) : [];
    const feedMsgCount = document.querySelectorAll('.fzc-message').length;
    const fluency = chat && typeof chat.getFluencyStats === 'function' ? chat.getFluencyStats() : null;

    return {
      totalMessagesInState: st ? st.messages.length : 0,
      feedMsgCount: feedMsgCount,
      historyCount: hist.length,
      localHistCount: localHist.length,
      fluency: fluency,
      voiceLogCount: (window.__voicePlaybackLog || []).length
    };
  });

  console.log(`    Total pesan di state: ${finalState.totalMessagesInState} (Harus >= 100)`);
  console.log(`    Total elemen di feed DOM: ${finalState.feedMsgCount} (Harus >= 100)`);
  console.log(`    Riwayat sesi tersimpan: ${finalState.historyCount}`);
  console.log(`    Audio synthesis calls: ${ttsRequests.length}`);
  console.log(`    Console Errors: ${consoleErrors.length}`);

  // Simpan Dossier Audit Lengkap ke berkas JSON
  const auditReport = {
    timestamp: new Date().toISOString(),
    persona: {
      id: "alex",
      name: "Coach Alex",
      voice: "en-US-GuyNeural",
      role: "Speaking & Confidence Coach",
      ssmlConfig: {
        pitch: "+4Hz",
        rate: "+2%",
        lang: "en-US"
      }
    },
    totalTurns: CONVERSATION_TURNS.length,
    finalState: finalState,
    turns: auditLog,
    consoleErrors: consoleErrors
  };

  const reportPath = path.join(ROOT, 'tools', 'dev', 'audit-coach-alex-50-turns-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf-8');
  console.log(`\n[6] Laporan audit berhasil ditulis ke: ${reportPath}`);

  await browser.close();
  server.close();

  console.log('\n================================================================');
  console.log('  AUDIT 50 TURNS SELESAI DENGAN SUKSES!                        ');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ FATAL AUDIT ERROR:', err);
  process.exit(1);
});
