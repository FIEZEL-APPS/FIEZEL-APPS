#!/usr/bin/env node
/**
 * tools/dev/probe-voice-call-ai-studio.mjs
 * Empirical Headless Playwright Probe for Google AI Studio Voice Call UI Capabilities:
 * - Prerequisite Warmup Drawer (#fzcCallPrereqOverlay & #fzcCallBtnUnlockPrereq)
 * - Smart Prerequisite Bypass & BKT verification (vocab_travel_a2 < 0.60 -> unlocked)
 * - Scenario Badge & Title rendering ("CEFR A2 · LATIHAN TERBIMBING")
 * - Real-Time Pedagogical Misconception Diagnosis (.fzc-call-diag-card.is-error)
 * - Zero-Dumbing Invariant verification (exact whyFailsId, syntacticCorrection "went", zero false praise)
 * - Strict Anti-Leak Exam Purity ("CEFR B2 · EXAM · MODE UJIAN MURNI (TANPA BANTUAN)", locked chips, pure note)
 * - Clean call termination (FiezelVoiceCall.end())
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

async function main() {
  console.log('================================================================');
  console.log('  EMPIRICAL HEADLESS AUDIT: VOICE CALL AI STUDIO CAPABILITIES');
  console.log('================================================================\n');

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/index.html`;

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

  // Mock upstream network calls for 100% offline determinism
  await context.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.hostname.includes('fiezel.my.id') || url.hostname.includes('onrender.com') || url.hostname.includes('puter.com') || url.hostname.includes('workers.dev')) {
      const origin = req.headers()['origin'] || `http://127.0.0.1:${port}`;
      if (url.pathname.includes('/api/tts/line') || url.pathname.includes('/tts')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Credentials': 'true'
          },
          body: JSON.stringify({
            ok: true,
            audioBase64: 'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA',
            mimeType: 'audio/wav',
            speaker: 'puck'
          })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Credentials': 'true'
        },
        body: JSON.stringify({ ok: true, user: { name: 'Audit Student' }, data: [] })
      });
    }
    return route.continue();
  });

  // Pre-seed storage state
  await context.addInitScript(() => {
    try {
      localStorage.setItem('fz_user_registered', '1');
      localStorage.setItem('fz_auth_mode', 'guest');
      localStorage.setItem('fz_auth_completed', '1');
      localStorage.setItem('fz_user_name', 'Audit Student');
      localStorage.setItem('fiezel_course', 'en');
      localStorage.setItem('fiezel_target_lang', 'en');
      localStorage.setItem('fz_target_course', 'en');
      localStorage.setItem('fz_onboarding_done', '1');
      localStorage.setItem('fz_auth_skip', '1');
      localStorage.setItem('fiezel-auth-v1', JSON.stringify({ v: 1, signedIn: true, at: Date.now(), role: 'murid', via: 'akun' }));
      localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({ done: true, at: Date.now(), via: 'finish', locale: 'id', name: 'Audit Student', goal: 'general', level: 'A2', role: 'murid', course: 'en' }));
      localStorage.setItem('fiezel-tour-v1', 'finish');
      sessionStorage.setItem('fiezel_boot_count', '2');
      sessionStorage.setItem('fz_tour_done', '1');
      // Ensure clean BKT state so vocab_travel_a2 is not yet mastered (< 0.60)
      localStorage.removeItem('fiezel-mastery-bkt-v1');
    } catch (_) {}

    setInterval(() => {
      try {
        document.querySelectorAll('.fz-tour, .fz-tour-scrim, #fzPrasasti, #fzRitual, .fz-auth').forEach(e => e.remove());
        document.documentElement.classList.remove('fz-booting');
        document.body.classList.remove('fz-booting', 'fz-auth-open');
      } catch (_) {}
    }, 50);
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`  [PAGE CONSOLE ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`  [PAGE UNHANDLED EXCEPTION] ${err.message}`);
  });

  const probeResults = [];
  function assertProbe(id, condition, detail) {
    probeResults.push({ id, ok: Boolean(condition), detail });
    console.log(`${condition ? '✓ PASS' : '✗ FAIL'}: [${id}] ${detail}`);
    if (!condition) {
      throw new Error(`Probe assertion failed: [${id}] ${detail}`);
    }
  }

  try {
    console.log(`[1] Membuka aplikasi di ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    console.log('[2] Memastikan FiezelVoiceCall, FiezelVoiceScenarios & FiezelVoicePedagogy terpasang...');
    const globals = await page.evaluate(() => {
      return {
        hasVoiceCall: typeof window.FiezelVoiceCall !== 'undefined',
        hasVoiceScenarios: typeof window.FiezelVoiceScenarios !== 'undefined',
        hasVoicePedagogy: typeof window.FiezelVoicePedagogy !== 'undefined',
        scenariosCount: window.FiezelVoiceScenarios ? window.FiezelVoiceScenarios.getScenarios().length : 0
      };
    });
    assertProbe('globals.ready', globals.hasVoiceCall && globals.hasVoiceScenarios && globals.hasVoicePedagogy, 'Semua modul Voice Call AI Studio aktif di runtime');
    assertProbe('scenarios.count', globals.scenariosCount === 5, '5 skenario kanonikal terdaftar');

    // ─────────────────────────────────────────────────────────────
    // TEST 1: FiezelVoiceCall.start({ scenarioId: 'scen_en_a2_past_trip', course: 'en' })
    //         Verify Prerequisite Warmup Drawer (#fzcCallPrereqOverlay) appears in DOM
    // ─────────────────────────────────────────────────────────────
    console.log('\n[3] TEST 1: Memulai skenario scen_en_a2_past_trip...');
    await page.evaluate(async () => {
      await window.FiezelVoiceCall.start({ scenarioId: 'scen_en_a2_past_trip', course: 'en' });
    });
    await page.waitForTimeout(600);

    const prereqInitial = await page.evaluate(() => {
      const status = window.FiezelVoiceScenarios.checkPrerequisiteStatus('vocab_travel_a2');
      const overlay = document.getElementById('fzcCallPrereqOverlay');
      const unlockBtn = document.getElementById('fzcCallBtnUnlockPrereq');
      return {
        isReady: status.isReady,
        pMastery: status.pMastery,
        hasPrereqOverlay: Boolean(overlay),
        hasUnlockBtn: Boolean(unlockBtn)
      };
    });

    console.log('  -> Prereq Initial State:', prereqInitial);
    assertProbe('prereq.seed.locked', prereqInitial.isReady === false && prereqInitial.pMastery < 0.60, `vocab_travel_a2 belum dikuasai (P=${prereqInitial.pMastery} < 0.60)`);
    assertProbe('prereq.drawer.visible', prereqInitial.hasPrereqOverlay && prereqInitial.hasUnlockBtn, 'Prerequisite Warmup Drawer (#fzcCallPrereqOverlay & #fzcCallBtnUnlockPrereq) hadir di DOM');

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Click #fzcCallBtnUnlockPrereq
    //         Verify drawer disappears and checkPrerequisiteStatus('vocab_travel_a2') isReady === true
    // ─────────────────────────────────────────────────────────────
    console.log('\n[4] TEST 2: Klik #fzcCallBtnUnlockPrereq...');
    await page.click('#fzcCallBtnUnlockPrereq');
    await page.waitForTimeout(400);

    const prereqAfterUnlock = await page.evaluate(() => {
      const status = window.FiezelVoiceScenarios.checkPrerequisiteStatus('vocab_travel_a2');
      const overlay = document.getElementById('fzcCallPrereqOverlay');
      return {
        isReady: status.isReady,
        pMastery: status.pMastery,
        hasPrereqOverlay: Boolean(overlay)
      };
    });

    console.log('  -> Prereq After Unlock:', prereqAfterUnlock);
    assertProbe('prereq.drawer.closed', prereqAfterUnlock.hasPrereqOverlay === false, 'Prerequisite Warmup Drawer (#fzcCallPrereqOverlay) hilang dari DOM');
    assertProbe('prereq.unlocked.ready', prereqAfterUnlock.isReady === true && prereqAfterUnlock.pMastery >= 0.60, `FiezelVoiceScenarios.checkPrerequisiteStatus('vocab_travel_a2') menjadi isReady === true (P=${prereqAfterUnlock.pMastery})`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Verify scenario badge "CEFR A2 · LATIHAN TERBIMBING" and title are rendered
    // ─────────────────────────────────────────────────────────────
    console.log('\n[5] TEST 3: Verifikasi Scenario Badge & Title...');
    const scenarioMeta = await page.evaluate(() => {
      const badge = document.querySelector('.fzc-call-scenario-badge');
      const title = document.querySelector('.fzc-call-scenario-title');
      return {
        badgeText: badge ? badge.textContent.trim() : '',
        titleText: title ? title.textContent.trim() : ''
      };
    });

    console.log('  -> Scenario Meta:', scenarioMeta);
    assertProbe('badge.a2.guided', scenarioMeta.badgeText.includes('CEFR A2 · LATIHAN TERBIMBING'), `Scenario badge memuat "CEFR A2 · LATIHAN TERBIMBING" (didapat: "${scenarioMeta.badgeText}")`);
    assertProbe('title.rendered', scenarioMeta.titleText.length > 0 && scenarioMeta.titleText.includes('Perjalanan Akhir Pekan'), `Scenario title ter-render di DOM (didapat: "${scenarioMeta.titleText}")`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Simulate student saying "Last weekend I goed to Bandung"
    //         Verify diagnosis card (.fzc-call-diag-card.is-error) rendered with whyFailsId
    //         and syntacticCorrection ("went"). Verify zero false praise.
    // ─────────────────────────────────────────────────────────────
    console.log('\n[6] TEST 4: Simulasikan ucapan murid "Last weekend I goed to Bandung"...');
    await page.evaluate(async () => {
      await window.FiezelVoiceCall._testSimulateTurn('Last weekend I goed to Bandung');
    });
    await page.waitForTimeout(600);

    const diagCardAudit = await page.evaluate(() => {
      const errorCard = document.querySelector('.fzc-call-diag-card.is-error');
      const successCard = document.querySelector('.fzc-call-diag-card.is-success');
      const whyEl = document.querySelector('.fzc-call-diag-why');
      const fixEl = document.querySelector('.fzc-call-diag-fix');
      const latestDiag = window.FiezelVoiceCall.getState().latestDiagnosis;
      return {
        hasErrorCard: Boolean(errorCard),
        hasSuccessCard: Boolean(successCard),
        errorCardText: errorCard ? errorCard.textContent.trim() : '',
        whyText: whyEl ? whyEl.textContent.trim() : '',
        fixText: fixEl ? fixEl.textContent.trim() : '',
        latestDiag: latestDiag
      };
    });

    console.log('  -> Diagnosis Card Audit:', {
      hasErrorCard: diagCardAudit.hasErrorCard,
      hasSuccessCard: diagCardAudit.hasSuccessCard,
      whyText: diagCardAudit.whyText,
      fixText: diagCardAudit.fixText,
      misconceptionId: diagCardAudit.latestDiag ? diagCardAudit.latestDiag.misconceptionId : null
    });

    assertProbe('diag.card.rendered', diagCardAudit.hasErrorCard === true, 'Kartu diagnosis error (.fzc-call-diag-card.is-error) muncul di DOM');
    assertProbe('diag.whyFailsId.present', diagCardAudit.whyText.includes('goed') && (diagCardAudit.whyText.includes('Overregularization') || diagCardAudit.whyText.includes('tak beraturan')), 'Kartu diagnosis memuat whyFailsId penjelas miskonsepsi morfologi irregular verb');
    assertProbe('diag.syntacticCorrection.went', diagCardAudit.fixText.includes('went'), 'Kartu diagnosis memuat syntacticCorrection ("went")');
    assertProbe('diag.zero.false.praise', diagCardAudit.hasSuccessCard === false && !diagCardAudit.errorCardText.toLowerCase().includes('sudah tepat') && !diagCardAudit.errorCardText.toLowerCase().includes('tata bahasa tepat'), 'Zero False Praise terbukti: tidak ada kartu sukses maupun pujian palsu pada tata bahasa keliru');

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Start exam scenario FiezelVoiceCall.start({ scenarioId: 'scen_en_b2_ielts_exam', course: 'en' })
    //         Verify badge "CEFR B2 · EXAM · MODE UJIAN MURNI (TANPA BANTUAN)"
    //         and that sample utterance chips are locked / hidden and exam pure note is present.
    // ─────────────────────────────────────────────────────────────
    console.log('\n[7] TEST 5: Mulai skenario ujian FiezelVoiceCall.start({ scenarioId: "scen_en_b2_ielts_exam", course: "en" })...');
    await page.evaluate(async () => {
      await window.FiezelVoiceCall.start({ scenarioId: 'scen_en_b2_ielts_exam', course: 'en' });
    });
    await page.waitForTimeout(600);

    const examAudit = await page.evaluate(() => {
      const badge = document.querySelector('.fzc-call-scenario-badge');
      const chips = document.querySelectorAll('.fzc-call-sample-chip');
      const pureNote = document.querySelector('.fzc-call-exam-pure-note');
      return {
        badgeText: badge ? badge.textContent.trim() : '',
        chipCount: chips.length,
        hasPureNote: Boolean(pureNote),
        pureNoteText: pureNote ? pureNote.textContent.trim() : ''
      };
    });

    console.log('  -> Exam Mode Audit:', examAudit);
    assertProbe('exam.badge.pure', examAudit.badgeText.includes('CEFR B2 · EXAM · MODE UJIAN MURNI (TANPA BANTUAN)'), `Badge ujian memuat "CEFR B2 · EXAM · MODE UJIAN MURNI (TANPA BANTUAN)" (didapat: "${examAudit.badgeText}")`);
    assertProbe('exam.chips.locked', examAudit.chipCount === 0, 'Sample utterance chips terkunci/disembunyikan (0 chips di DOM)');
    assertProbe('exam.pureNote.present', examAudit.hasPureNote && examAudit.pureNoteText.includes('Mode Ujian Aktif'), 'Exam Pure Note (.fzc-call-exam-pure-note) hadir di DOM');

    // ─────────────────────────────────────────────────────────────
    // TEST 6: End the call FiezelVoiceCall.end()
    // ─────────────────────────────────────────────────────────────
    console.log('\n[8] TEST 6: Mengakhiri panggilan via FiezelVoiceCall.end()...');
    const endAudit = await page.evaluate(() => {
      window.FiezelVoiceCall.end();
      return {
        status: window.FiezelVoiceCall.getState().status,
        hasOverlay: Boolean(document.getElementById('fzcCallOverlay'))
      };
    });

    console.log('  -> End State Audit:', endAudit);
    assertProbe('call.end.status', endAudit.status === 'idle', 'Status panggilan kembali ke idle');
    assertProbe('call.end.overlay', endAudit.hasOverlay === false, 'Overlay panggilan (#fzcCallOverlay) di-unmount dari DOM');

    console.log('\n================================================================');
    console.log('  🎉 SEMUA 12 GERBANG MUTU AUDIT VOICE CALL AI STUDIO 100% LULUS!');
    console.log('================================================================\n');

  } finally {
    await browser.close();
    server.close();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ AUDIT EMPIRIS GAGAL DENGAN KESALAHAN:', err);
  if (server.listening) server.close();
  process.exit(1);
});
