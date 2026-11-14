#!/usr/bin/env node
'use strict';

/**
 * GERBANG KUNCI PERMANEN KAWAN BICARA (tests/kawan-bicara-lock-in-gate-test.js)
 *
 * Mengunci seluruh perbaikan Batch 1 s/d Batch 4 pada modul Kawan Bicara
 * (Worker backend & local proxy, host bridge & Braincore/Gem sync,
 *  Silero/Handy VAD & Speech Alignment & SSW Sensei & Workbench sync, serta
 *  Copilot HTTP parity, multi-locale phonetics, Mochi PNG assets, mobile wrap,
 *  dan kebersihan skenario IELTS/FIEZEL Life) agar tidak pernah mengalami regresi
 * oleh perubahan agen di masa depan.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');

function readRel(relPath) {
  const full = path.join(ROOT, relPath);
  assert(fs.existsSync(full), `Berkas wajib tidak ditemukan: ${relPath}`);
  return fs.readFileSync(full, 'utf8');
}

async function run() {
  let checks = 0;
  function ok(cond, msg) {
    assert(cond, `[kawan-bicara-lock-in-gate] GAGAL: ${msg}`);
    checks += 1;
  }

  // ===== BATCH 1: Worker, Local Proxy, Schema & Fail-Closed Security =====
  const schemaSrc = readRel('workers/api/schema.js');
  for (const route of [
    '/api/voice/live-session',
    '/api/voice/copilot-assist',
    '/api/voice/partner-turn',
    '/api/voice/translate',
    '/api/voice/gemini-tts',
    '/api/voice/verify-speech',
    '/api/voice/sync-keys',
    '/api/braincore/sync',
  ]) {
    ok(schemaSrc.includes(`'${route}'`), `schema.js harus mendaftarkan body limit untuk ${route}`);
  }

  const roleCore = await import(pathToFileURL(path.join(ROOT, 'workers/api/auth/role-core.js')).href);
  ok(roleCore.hasCapability(null, 'voice:live') === false, 'hasCapability harus fail-closed untuk role null');
  const unknownRouteAuth = roleCore.authorizeRoute({ role: 'murid', pathname: '/api/voice/nonexistent-route-999' });
  ok(unknownRouteAuth.ok === false && unknownRouteAuth.reason === 'route_not_governed', 'authorizeRoute wajib menolak rute tak dikenal secara fail-closed');

  const gemGrantSrc = readRel('workers/api/route-gem-grant.js');
  ok(
    gemGrantSrc.includes('if (!db)') && gemGrantSrc.includes('jsonError(503, ERR.UNAVAILABLE, opt)'),
    'route-gem-grant.js wajib fail-closed 503 bila DB tidak tersedia'
  );
  ok(gemGrantSrc.includes('unauthenticated(opt)'), 'route-gem-grant.js wajib menolak pemanggil tanpa sesi terverifikasi');

  const learnerMsgSrc = readRel('workers/api/route-learner-messages.js');
  ok(
    (learnerMsgSrc.match(/if \(!db\) return jsonError\(503, ERR\.UNAVAILABLE, opt\);/g) || []).length >= 5,
    'route-learner-messages.js wajib fail-closed 503 di seluruh endpoint bila DB absen'
  );

  const voiceLiveSrc = readRel('workers/api/voice/route-voice-live.js');
  ok(voiceLiveSrc.includes('export function stripFiezelDashes'), 'route-voice-live.js wajib mengekspor stripFiezelDashes');

  const localServerSrc = readRel('tools/local-server.js');
  ok(
    localServerSrc.includes("rel.startsWith('/api/')") &&
      localServerSrc.includes("Origin: 'https://fiezel.my.id'") &&
      localServerSrc.includes("upstreamRes.headers['set-cookie']") &&
      localServerSrc.includes("upstreamReq.destroy()"),
    'tools/local-server.js wajib mem-proxy /api/ dengan Origin, Set-Cookie rewrite, dan destroy cleanup'
  );

  const buildMeta = JSON.parse(readRel('coordination/BUILD-VERSION.json'));
  const callHtmlSrc = readRel('call.html');
  ok(
    callHtmlSrc.includes(`./features/voice-studio/dist/voice-studio.js?v=${buildMeta.version}`) &&
      callHtmlSrc.includes(`./features/voice-studio/dist/voice-studio.css?v=${buildMeta.version}`) &&
      callHtmlSrc.includes('window.top.FiezelUpdatePrompt.check(false)'),
    `call.html wajib memuat bundle v=${buildMeta.version} dan mendelegasikan update check ke FiezelUpdatePrompt`
  );

  // ===== BATCH 2: Host Shell Bridge, Braincore Persistence & Lifecycle Cleanup =====
  const interactiveChatSrc = readRel('features/interactive-chat/fiezel-interactive-chat.js');
  ok(
    interactiveChatSrc.includes('var FzStudioBridge = (function ()') &&
      interactiveChatSrc.includes('var isSameOrigin =') &&
      interactiveChatSrc.includes("sessionStorage.getItem('fz.studio.turns')") &&
      interactiveChatSrc.includes("if (p.course !== 'en' && p.course !== 'ja' && p.course !== 'zh') return 'schema'") &&
      interactiveChatSrc.includes('seenTurnIds[p.turnId]') &&
      interactiveChatSrc.includes('FzStudioBridge.end()') &&
      interactiveChatSrc.includes('root.__fzStopSharedMicBridge()'),
    'fiezel-interactive-chat.js FzStudioBridge wajib menegakkan nonce, same-origin, validasi kursus en/ja/zh, anti-replay, dan cleanup mic saat unmount'
  );

  const braincoreSrc = readRel('features/voice-studio/src/lib/braincore.ts');
  ok(
    braincoreSrc.includes('function mergeHostBraincoreMastery') &&
      braincoreSrc.includes('mergeHostBraincoreMastery(parsed.competencies || {})') &&
      braincoreSrc.includes('mergeHostBraincoreMastery(state.competencies || {})') &&
      braincoreSrc.includes('if (res.status === 401)'),
    'braincore.ts wajib mempertahankan penggabungan kompetency host dan menangani 401 cleanly'
  );

  // ===== BATCH 3: Silero/Handy VAD, Barge-In, Speech Alignment, Workbench Sync & SSW Sensei =====
  const sileroSrc = readRel('features/voice-studio/src/lib/sileroVadGate.ts');
  const warmDeclIdx = sileroSrc.indexOf('function warmSileroVendorCache');
  const loadDeclIdx = sileroSrc.indexOf('function loadSileroBundle');
  ok(
    warmDeclIdx > 0 && loadDeclIdx > warmDeclIdx && (sileroSrc.match(/function warmSileroVendorCache/g) || []).length === 1,
    'sileroVadGate.ts wajib mendeklarasikan warmSileroVendorCache satu kali di level modul sebelum loadSileroBundle'
  );
  ok(
    sileroSrc.includes('700') &&
      sileroSrc.includes('preRollBase64.length = 0;') &&
      sileroSrc.includes('if (speechStreak >= 2)') &&
      sileroSrc.includes('burstOpen = true;'),
    'sileroVadGate.ts wajib memakai cooldown >= 700ms, membersihkan preRollBase64, dan membuka burstOpen hanya setelah speechStreak >= 2'
  );

  const handySrc = readRel('features/voice-studio/src/lib/handyVad.ts');
  ok(
    handySrc.includes('isCalmAmbientDrift') &&
      handySrc.includes('Math.max(-75.0, Math.min(-26.0, nextFloor))') &&
      handySrc.includes('hasDynamicSpeechModulation') &&
      handySrc.includes('resampleFloat32To16k'),
    'handyVad.ts wajib mempertahankan noiseFloor adaptif [-75, -26], isCalmAmbientDrift, dan resampler 16kHz'
  );

  const alignSrc = readRel('features/voice-studio/src/lib/speechAlignment.ts');
  ok(
    alignSrc.includes('function expandEnglishContractions') &&
      alignSrc.includes('function extractEnglishVowelCore'),
    'speechAlignment.ts wajib mendukung ekspansi kontraksi Inggris dan penalti minimal-pair vokal'
  );

  const sswTeacherSrc = readRel('features/voice-studio/src/lib/sswSenseiTeacher.ts');
  ok(
    sswTeacherSrc.includes('pageObj?.summary') && !sswTeacherSrc.includes('pageObj?.body'),
    'sswSenseiTeacher.ts wajib membaca pageObj?.summary, bukan pageObj?.body yang tidak ada'
  );

  const wbModalSrc = readRel('features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx');
  const pteRaSectionStart = wbModalSrc.indexOf('const PteReadAloudCanvas');
  const pteRaSectionEnd = wbModalSrc.indexOf('const PteScorecardCanvas');
  const pteRaSlice = pteRaSectionStart > 0 && pteRaSectionEnd > pteRaSectionStart
    ? wbModalSrc.slice(pteRaSectionStart, pteRaSectionEnd)
    : '';
  ok(
    wbModalSrc.includes('export interface WorkbenchEvaluationMeta') &&
      wbModalSrc.includes('export interface WorkbenchPracticeCheckResult') &&
      wbModalSrc.includes('isQuizSuccess: false, isQuizFailure: true') &&
      wbModalSrc.includes('isQuizFailure: true') &&
      wbModalSrc.includes('PteDescribeImageCanvas') &&
      wbModalSrc.includes('onActiveQuestionChange={') &&
      pteRaSlice.includes('passageText: activeQuestion.passageText') &&
      !pteRaSlice.includes('activeQuestion.keywords') &&
      !pteRaSlice.includes('activeQuestion.dataSummary') &&
      !wbModalSrc.includes("playFiezelSfx('tap')") &&
      !wbModalSrc.includes("playFiezelSfx('bell_ring')") &&
      wbModalSrc.includes('openNonce !== lastOpenNonceRef.current'),
    'InCallLearningWorkbenchModal.tsx wajib mengekspor tipe workbench, menyalurkan isQuizFailure pada klik salah, menyinkronkan PTE active question, bebas crash keywords/dataSummary di PteReadAloudCanvas, memakai SFX valid, dan membuka kembali modal saat openNonce berubah'
  );

  const appTsxSrc = readRel('features/voice-studio/src/App.tsx');
  ok(
    appTsxSrc.includes('meta?.isQuizFailure') &&
      appTsxSrc.includes('const freshBrain = loadBraincoreState();') &&
      appTsxSrc.includes('turnsRef.current.slice(-6)') &&
      appTsxSrc.includes('turnsRef.current.slice(-7)') &&
      appTsxSrc.includes('brainStateRef.current = attemptOutcome.nextState;') &&
      appTsxSrc.includes('w-full min-w-0 max-w-2xl lg:max-w-4xl') &&
      appTsxSrc.includes('data-testid="docked-copilot-container" className="w-full min-w-0 max-w-full pb-1"') &&
      appTsxSrc.includes('opts?: { forceOpen?: boolean }') &&
      (appTsxSrc.match(/setLearningWorkbench\(null\)/g) || []).length >= 9,
    'App.tsx wajib menegakkan isQuizFailure, fresh loadBraincoreState + turnsRef pada submitStudentTurn, wrapper min-w-0, forceOpen Papan Tulis, dan pembersihan workbench saat ganti bahasa/persona/skenario'
  );

  // ===== BATCH 4: Copilot Parity, Multi-Locale Phonetics, Mobile Wrapping, Scenarios & Bundle =====
  const transportSrc = readRel('features/voice-studio/src/lib/liveTransport.ts');
  ok(
    transportSrc.includes("params.persona.id === 'cambridge_examiner'") &&
      transportSrc.includes("params.persona.id === 'dr_julian'") &&
      transportSrc.includes('clampCambridgeCards') &&
      transportSrc.includes('activePopupTargetText') &&
      transportSrc.includes('activePopupMode'),
    'liveTransport.ts wajib menyalurkan target popup aktif dan pembatasan 1 kartu untuk Cambridge/PTE'
  );

  const helperSrc = readRel('features/voice-studio/src/lib/liveCallHelper.ts');
  ok(
    helperSrc.includes("if (loc === 'id') {") &&
      helperSrc.includes("if (activeLocale !== 'id') {") &&
      helperSrc.includes('learnerLocale?: string') &&
      helperSrc.includes('export async function ensureSharedAnonSession') &&
      helperSrc.includes('res.status === 429') &&
      (helperSrc.match(/fetch\([^)]*\/api\/auth\/anon/g) || []).length === 1 &&
      (transportSrc.match(/\/api\/auth\/anon/g) || []).length === 0 &&
      (braincoreSrc.match(/\/api\/auth\/anon/g) || []).length === 0,
    'liveCallHelper.ts wajib membatasi fonetik Inggris bergaya Indonesia & menyatukan bootstrap /api/auth/anon via ensureSharedAnonSession dengan backoff 429'
  );

  const copilotSrc = readRel('features/voice-studio/src/components/BeginnerAnswerAssistant.tsx');
  ok(
    copilotSrc.includes('w-full max-w-full min-w-0 flex flex-wrap sm:flex-nowrap') &&
      wbModalSrc.includes('max-w-[calc(100vw-24px)]'),
    'BeginnerAnswerAssistant.tsx & InCallLearningWorkbenchModal.tsx wajib menjaga wrapping mobile tanpa overflow 390px'
  );

  const homeRedesignSrc = readRel('features/voice-studio/src/components/HomeRedesignView.tsx');
  ok(
    !homeRedesignSrc.includes('paw-mochi-') &&
      homeRedesignSrc.includes('mochi-mascot-headset.png') &&
      homeRedesignSrc.includes('mochi-mascot-idle.png'),
    'HomeRedesignView.tsx wajib memakai aset Mochi resmi PNG, bebas aset PAW kucing kuning lama'
  );

  const fiezelLifeSrc = readRel('features/voice-studio/src/data/fiezelLifeCallScenarios.ts');
  ok(!/"อิโรโดริ/.test(fiezelLifeSrc), 'fiezelLifeCallScenarios.ts tidak boleh membocorkan string merek lama di titleTh');

  const ieltsSrc = readRel('features/voice-studio/src/data/ieltsCallScenarios.ts');
  ok(!/(?<![/.])\.\.(?![./])/.test(ieltsSrc), 'ieltsCallScenarios.ts tidak boleh memiliki typo titik ganda (..)');
  ok(/\.\.\//.test(ieltsSrc) && ieltsSrc.includes('...'), 'ieltsCallScenarios.ts wajib mempertahankan import ../ dan elipsis ...');
  ok(
    !ieltsSrc.includes('"subtitleTh": "Cambridge Part 2 Cue Card & Part 3 Analytical Discussion"') &&
      !ieltsSrc.includes('"titleTh": "IELTS Speaking: '),
    'ieltsCallScenarios.ts wajib memiliki titleTh & subtitleTh berbahasa Thai'
  );

  const distBundleSrc = readRel('features/voice-studio/dist/voice-studio.js');
  ok(distBundleSrc.length > 100000, 'Bundle produksi features/voice-studio/dist/voice-studio.js wajib terbangun');
  ok(
    distBundleSrc.includes('mochi-mascot-headset.png') && distBundleSrc.includes('mochi-mascot-idle.png'),
    'Bundle produksi dist/voice-studio.js wajib membawa aset Mochi PNG resmi'
  );
  ok(!distBundleSrc.includes('อิโรโดริ '), 'Bundle produksi dist/voice-studio.js tidak boleh mengandung string merek lama di skenario Thai');

  console.log(`PASS: ${checks} kawan-bicara lock-in invariants verified cleanly.`);
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
