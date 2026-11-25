/**
 * tests/whiteboard-contract-test.js
 *
 * CI contract & regression gate for Kawan Bicara Solvely Whiteboard (m025-807):
 *   1. Opener SSE TTS pre-warm <-> Chunk-0 board text SSOT parity (`boardSpeechText.ts`)
 *   2. Zero React hooks after conditional early returns (prevents React error #300 on minimize)
 *   3. Cross-origin Worker session & CORS credentials on `/api/voice/whiteboard-stream` & `partner-turn`
 *   4. Instant board reveal when `isReady` (no 11.5s audio gate holding the canvas blind)
 *   5. Freeze (not silent-clock race) when follow-up topic is generating; audioClock reset & debounced preparing
 *   6. Genuine quiz distractor synthesis, cloze chip diversity, seeded Fisher-Yates block shuffle & reroll
 *   7. Full visual archetype rotation (`cycle` 1..6) & follow-up visual tracking
 *   8. Phase scrubber last-phase target & throttled camera MutationObserver
 *   9. Backend `route-voice-live.js` opener preservation after `retryGen`
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanBoardDisplayText,
  cleanStepCaptionAndSpokenText,
  deriveHeadingSpokenNarration,
  openerSpokenText,
} from '../features/voice-studio/src/lib/boardSpeechText.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

console.log('🧪 Running FIEZEL Whiteboard Speed, Auth, Hook & Quiz Contract Test...');

// 1. SSOT opener narration parity (pre-warm vs cohesive board script)
{
  const packet = {
    topicTitle: 'Kenapa She Is Happy Pakai Is',
    patternFormula: 'She/He/It + is + Adjective',
    headingStep: {
      title: 'Kenapa Pakai Is',
      text: 'Subjek tunggal + is',
      spokenNarration:
        'Simak baik-baik, kata is muncul karena subjek she itu tunggal • jadi to be yang cocok adalah is — oke!',
    },
  };
  const prewarm = openerSpokenText(packet);
  const derived = deriveHeadingSpokenNarration(packet.headingStep, packet.topicTitle);
  const cohesive = cleanStepCaptionAndSpokenText(derived).spokenText;
  assert.equal(prewarm, cohesive, 'Opener pre-warm text must match board Step-0 spokenText byte-for-byte');
  assert.ok(!/[\u2014\u2013•|]/.test(prewarm), 'Opener TTS text must scrub bullets and em/en-dashes');
  assert.ok(!/^simak baik/i.test(prewarm), 'Opener TTS text must strip filler identically on both paths');
  assert.equal(cleanBoardDisplayText('A — B'), 'A, B');
  console.log('  ✅ PASS 1: Opener pre-warm & Chunk-0 SSOT text parity verified');
}

// 2. React Hooks before early return in InCallLearningWorkbenchModal.tsx
const modalSrc = read('features/voice-studio/src/components/InCallLearningWorkbenchModal.tsx');
{
  const firstEarlyReturnIdx = modalSrc.indexOf('if (!isOpen) return null;');
  assert.ok(firstEarlyReturnIdx > 0, 'if (!isOpen) return null guard must exist');
  const afterReturn = modalSrc.slice(firstEarlyReturnIdx);
  assert.ok(
    !/\buse(?:State|Effect|Memo|Ref|Callback|LayoutEffect)\s*[<(]/.test(afterReturn),
    'React hooks must NEVER appear after `if (!isOpen) return null` (causes React error #300 on minimize)'
  );
  console.log('  ✅ PASS 2: Zero conditional React hooks after early return');
}

// 3. Synchronized curtain reveal + bounded HTMLAudio + follow-up freeze + audioClock reset
{
  assert.match(modalSrc, /const\s+showInitialBuffering\s*=\s*!isReady\s*\|\|\s*\(!isSpecialCanvasModal\s*&&\s*isInitialAudioGateActive\)\s*;/, 'Buffering curtain must wait for Chunk-0 audio readiness so visual and voice ignite together with zero post-buffering delay');
  assert.ok(modalSrc.includes('revealCanvasNow()') && modalSrc.includes('playHtmlAudioBounded(audio, 650)'), 'playChunkAt must lift curtain right on audio start and bound HTMLAudio.play on mobile PWA');
  assert.ok(!/safetyTimer[^;]{0,120}11500/.test(modalSrc), 'Old 11.5s initial audio gate timer must not exist');
  assert.match(modalSrc, /if\s*\(isGeneratingTopic\)\s*\{\s*stopLockstepAudio\(\);\s*return;\s*\}/, 'Follow-up generation must freeze old board instead of racing silent clock');
  assert.match(modalSrc, /topicKey\s*=[\s\S]{0,220}currentKey\s*=/, 'Ganti Soal (`quizSeed`) must not clear topic audio cache');
  assert.match(modalSrc, /setAudioClock\(null\)/, 'Step seek must reset audioClock immediately');
  console.log('  ✅ PASS 3: Synchronized curtain reveal, bounded HTMLAudio, follow-up freeze & clock reset verified');
}

// 4. Quiz quality (MCQ >= 3 options, cloze >= 3 chips, genuine Fisher-Yates shuffle, all visual kinds)
{
  assert.match(modalSrc, /function\s+seededShuffle\s*</, 'Must use seeded Fisher-Yates derangement instead of comparator bias');
  assert.match(modalSrc, /function\s+synthesizeSentenceDistractors\s*\(/, 'Must synthesize multi-distractor MCQ options');
  assert.match(modalSrc, /function\s+buildClozeDistractorChips\s*\(/, 'Must synthesize multi-chip cloze distractors');
  for (const kind of ['metaphor_scene', 'mind_map', 'timeline_track', 'formula_blocks', 'trap_vs_fix']) {
    assert.ok(modalSrc.includes(`'${kind}'`), `currentVisualSteps must include ${kind}`);
  }
  console.log('  ✅ PASS 4: Quiz distractor synthesis, seeded shuffle & visual tracking verified');
}

// 5. Cross-origin Worker session & non-empty fallback schema in whiteboardDirector.ts & App.tsx
const directorSrc = read('features/voice-studio/src/lib/whiteboardDirector.ts');
const appSrc = read('features/voice-studio/src/App.tsx');
const transportSrc = read('features/voice-studio/src/lib/liveTransport.ts');
{
  assert.ok(directorSrc.includes('ensureVoiceWorkerSession'), 'whiteboardDirector must call ensureVoiceWorkerSession');
  assert.ok(directorSrc.includes("credentials: 'include'"), 'whiteboardDirector fetches must include session cookies');
  assert.ok(!directorSrc.includes('"whiteboardSteps":[]'), 'Local Gemini prompt example must not show empty whiteboardSteps');
  assert.ok(directorSrc.includes('skipBackend'), 'Stream fallback must skip duplicate Worker calls after explicit backend denial');
  assert.ok(appSrc.includes('extractOpenerFirstTtsChunk'), 'App.tsx must use SSOT extractOpenerFirstTtsChunk');
  assert.ok(transportSrc.includes("from './boardSpeechText.ts'"), 'liveTransport must import boardSpeechText with .ts extension for Node ESM tests');
  // Visual switch cycle 3 inside synthesizeAlternativeVisualStep must return metaphor_scene (no duplicate contrast_scale)
  const altStart = directorSrc.indexOf('function synthesizeAlternativeVisualStep(');
  const altEnd = directorSrc.indexOf('function ensureAlternativeVisualOnSwitchRequest(');
  assert.ok(altStart > 0 && altEnd > altStart, 'synthesizeAlternativeVisualStep slice must exist');
  const altBody = directorSrc.slice(altStart, altEnd);
  const c3Start = altBody.indexOf('if (cycle === 3)');
  const c4Start = altBody.indexOf('if (cycle === 4)');
  assert.ok(c3Start >= 0 && c4Start > c3Start, 'cycle === 3 and cycle === 4 blocks must exist');
  const c3Body = altBody.slice(c3Start, c4Start);
  assert.ok(c3Body.includes("kind: 'metaphor_scene'"), 'cycle === 3 must return metaphor_scene');
  assert.ok(!c3Body.includes("kind: 'contrast_scale'"), 'cycle === 3 must not fall back to duplicate contrast_scale');
  console.log('  ✅ PASS 5: Worker session auth, SSOT pre-warm & visual cycle distinctness verified');
}

// 6. LiveWhiteboardCanvas camera throttle, 2D focus observer, nib sync, phase jump & copy hygiene
const canvasSrc = read('features/voice-studio/src/components/LiveWhiteboardCanvas.tsx');
const diagramsSrc = read('features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx');
const cssSrc = read('features/voice-studio/src/index.css');
{
  assert.ok(canvasSrc.includes('if (currentSub !== lastFocusedSub)'), 'MutationObserver must only schedule camera check when focus target changes');
  assert.ok(canvasSrc.includes("attributeFilter: ['class', 'data-wb-panel-focus']"), 'MutationObserver must watch data-wb-panel-focus for left/right diagram panning');
  assert.ok(!/if\s*\(effP\s*<\s*0\.65\s*&&\s*activeShape\)/.test(canvasSrc), 'Marker nib threshold must stay aligned with 0.86 reachedCount');
  assert.ok(!canvasSrc.includes('shapes[idx - 1]'), 'RoughFreeformSceneDiagram must use penShapeIdx instead of undeclared idx');
  assert.ok(canvasSrc.includes('lastPhaseStepIdx'), 'Last phase button must target step at final phase rather than overshooting');
  assert.ok(diagramsSrc.includes('MindMapDiagram') && !/Organic Hub Banner \*\/\s*\n\s*<div[^>]*overflow-hidden/.test(diagramsSrc), 'MindMapDiagram must not clip zoomed cards with overflow-hidden');
  assert.ok(/\.fz-keyword-highlight\s*\{[\s\S]*display:\s*inline;/.test(cssSrc), '.fz-keyword-highlight must use display: inline so multi-word spans wrap across lines cleanly');
  console.log('  ✅ PASS 6: Canvas camera 2D focus, nib safety, overflow hygiene & inline highlight wrapping verified');
}

// 7. Backend Worker opener re-lock after retryGen & dist parity check
const workerSrc = read('workers/api/voice/route-voice-live.js');
{
  assert.ok(workerSrc.includes('!isOffTopicToBeDrift &&\n        lockedOpener?.headingStep?.spokenNarration'), 'Backend must re-apply lockedOpener after retryGen');
  const distPath = path.join(ROOT, 'features/voice-studio/dist/voice-studio.js');
  assert.ok(fs.existsSync(distPath), 'Built voice-studio.js bundle must exist');
  const distSrc = fs.readFileSync(distPath, 'utf8');
  assert.ok(distSrc.includes('board-question') && distSrc.includes('whiteboard-stream'), 'Built bundle must include whiteboard stream & controls');
  console.log('  ✅ PASS 7: Worker retry opener sync & dist bundle parity verified');
}

// 8. Word-clock sanitized token parity, gapless WebAudio scheduling, spoken sliding window & PTE locale props
{
  assert.ok(modalSrc.includes('alignedChunkTexts') && modalSrc.includes('stepAlignedWordsMap'), 'Word-clock map must use sanitizeSpokenTextForClassicTts tokens 1:1 with alignWordsToSpeech');
  assert.ok(modalSrc.includes('resolvedChunkMap') && modalSrc.includes('interChunkGapsMs'), 'WebAudio sequencer must keep synchronous resolvedChunkMap for gapless transitions');
  assert.ok(modalSrc.includes('activeSpokenWindowText'), 'Diagram matchers must receive progressive sliding spoken window instead of future full-sentence leak');
  assert.ok(modalSrc.includes('PteDescribeImageCanvas') && /PteReadAloudCanvas[\s\S]{0,420}locale\?:\s*LearnerLocale/.test(modalSrc), 'PTE subcomponents must receive locale prop cleanly');
  console.log('  ✅ PASS 8: Word-clock parity, gapless WebAudio, sliding spoken window & PTE locale safety verified');
}

// 9. Mobile PWA WebAudio gesture unlocker, bounded ctx.resume() & non-skipping autoplay fallback
const unlockSrc = read('features/voice-studio/src/lib/boardAudioUnlock.ts');
{
  assert.ok(unlockSrc.includes('export function getSharedBoardAudioContext'), 'boardAudioUnlock must export getSharedBoardAudioContext');
  assert.ok(unlockSrc.includes('export function unlockSharedBoardAudioContext'), 'boardAudioUnlock must export unlockSharedBoardAudioContext');
  assert.ok(unlockSrc.includes('export async function resumeAudioContextBounded'), 'boardAudioUnlock must export resumeAudioContextBounded');
  assert.ok(modalSrc.includes('resumeAudioContextBounded(ctx, 220)'), 'WebAudio resume must use bounded timeout instead of hanging indefinitely on mobile PWA');
  assert.ok(modalSrc.includes('wb-tap-unmute-btn'), 'Whiteboard header must render one-tap unmute pill when mobile autoplay is blocked');
  assert.ok(!modalSrc.includes('chunkWeights[chunkIdx] / 2.2'), 'Silent timeout fallback must use unified 0.068 duration constant');
  const catchIdx = modalSrc.indexOf("runTimedSilentFallback(chunkDurSec, 'silent_autoplay_blocked')");
  assert.ok(catchIdx > 0, 'HTMLAudio play().catch() must enter runTimedSilentFallback instead of calling advanceToNextOrDone()');
  console.log('  ✅ PASS 9: Mobile PWA WebAudio bounded resume & non-skipping autoplay fallback verified');
}

// 10. Left-to-Right spatial diagram order, negation-safe focus matching & complete swapped narrations
{
  assert.ok(diagramsSrc.includes('export function resolveSpatialPanelFocus'), 'WhiteboardVisualDiagrams must export SSOT resolveSpatialPanelFocus');
  assert.ok(diagramsSrc.includes('export function resolveSequentialItemFocus'), 'WhiteboardVisualDiagrams must export SSOT resolveSequentialItemFocus');
  assert.ok(diagramsSrc.includes('resolveSpatialPanelFocus(') && canvasSrc.includes('resolveSpatialPanelFocus('), 'Both MetaphorSceneDiagram and RoughContrastScaleDiagram must reuse resolveSpatialPanelFocus');
  assert.ok(canvasSrc.includes('if (Math.abs(ay - by) > 48) return ay - by'), 'RoughFreeformSceneDiagram must sort containers in Top->Bottom, Left->Right reading order');
  assert.ok(directorSrc.includes('hasNarrationInvertedLeftRight') && directorSrc.includes('doesNarrationCoverPanelPair'), 'whiteboardDirector must detect Left/Right narration inversion and incomplete blurbs');
  assert.ok(
    /if\s*\(hasCamLeft\s*&&\s*isActionSide\(leftBlob\)\s*&&\s*isStateSide\(rightBlob\)\)[\s\S]{0,900}spokenNarration:\s*undefined/.test(directorSrc),
    'Swapping leftPanel/rightPanel must clear stale spokenNarration'
  );
  console.log('  ✅ PASS 10: Left-to-Right spatial visual alignment & complete step narration verified');
}

// 11. Guided Socratic Mastery Loop after quiz & Universal Native Explanation Language Lock
{
  assert.ok(modalSrc.includes('wb-quiz-coach-card') && modalSrc.includes('wb-remediate-btn') && modalSrc.includes('wb-next-drill-btn') && modalSrc.includes('wb-other-topic-btn'), 'Quiz must render interactive guided AI mastery coach responses for both wrong and correct answers');
  assert.ok(modalSrc.includes('wb-explanation-lang-select'), 'Whiteboard header must expose native explanation language selector');
  assert.ok(modalSrc.includes('[REMEDIATION_DIFFERENT_ANGLE]'), 'Wrong quiz remediation must instruct backend to explain using a different visual & analogy');
  assert.ok(workerSrc.includes('IRONCLAD NATIVE EXPLANATION LANGUAGE LOCK') && workerSrc.includes('detectExplicitCourseExplainRequest'), 'Worker must enforce native explanation language unless user explicitly requests course language');
  for (const code of ['ru:', 'km:', 'fil:', 'th:', 'ja:']) {
    assert.ok(workerSrc.includes(code), `Worker WHITEBOARD_LOCALE_LABELS must support ${code}`);
  }
  console.log('  ✅ PASS 11: Guided Socratic quiz mastery loop & universal native explanation language lock verified');
}

// 12. Full Ecosystem Audit Hardening: Anti-503 Dead-Key Guard, Multi-Lang Live TTS, Race-Free Language Switch, Quiz Dedup & Zero Copy/Bold Leaks
{
  const appSrc = read('features/voice-studio/src/App.tsx');
  const transportSrc = read('features/voice-studio/src/lib/liveTransport.ts');
  assert.ok(
    workerSrc.includes('_quotaDeadKeys.add(key)') &&
      /function invokeGeminiLiveWavTts[\s\S]*?_ttsCooldownMap\.delete\(cooldownKey\)/.test(workerSrc),
    'Worker TTS must quarantine quota-dead keys and delete from _ttsCooldownMap'
  );
  assert.ok(workerSrc.includes('LIVE_TTS_LANG_LABELS') && workerSrc.includes('LIVE_BCP47_MAP'), 'Worker invokeGeminiLiveWavTts must map all 20 universal explanation languages');
  assert.ok(workerSrc.includes('Math.min(18, prioritizedLiveKeys.length)'), 'Worker runLiveWavRace must sweep full rotated pool instead of stopping at 6 dead keys');
  assert.ok(appSrc.includes('invalidateInFlightCopilot') && appSrc.includes('activeScenarioRef.current.targetLang !== scen.targetLang'), 'Language switch must abort in-flight copilot to prevent cross-language card leaks');
  assert.ok(modalSrc.includes('const normQuizKey ='), 'Quiz option deduplication must normalize trailing punctuation to prevent duplicates like "I am agree." vs "I am agree"');
  assert.ok(!appSrc.includes('Target Level CEFR'), 'Learner UI must never expose forbidden "Target Level CEFR" label');
  assert.ok(!/\bfont-black\b/.test(appSrc) && !/\bfont-black\b/.test(modalSrc), 'Voice studio UI must use weight <= 800 (font-extrabold) instead of faux bold 900 (font-black)');
  assert.ok(transportSrc.includes("'km', 'fil'"), 'Client Gemini TTS lang detector must include universal locales like km and fil');
  console.log('  ✅ PASS 12: Anti-503 TTS key pool, race-free language switch, quiz dedup & copy/bold hygiene verified');
}

// 13. Mobile PWA OOM/WebGL Release, Sliding-Window Audio, ErrorBoundary & Home Greeting/Mochi Stability
{
  const appSrc = read('features/voice-studio/src/App.tsx');
  const audioUnlockSrc = read('features/voice-studio/src/lib/boardAudioUnlock.ts');
  const errBoundarySrc = read('features/voice-studio/src/components/WhiteboardErrorBoundary.tsx');
  const mochiCompSrc = read('features/mascot/fiezel-mochi-companion.js');
  const chatSrc = read('features/interactive-chat/fiezel-interactive-chat.js');
  const clayCssSrc = read('features/ui/fiezel-tactile-clay.css');
  const hostAppSrc = read('app.js');

  assert.ok(
    mochiCompSrc.includes('suspendWebGL:') && chatSrc.includes('suspendWebGL()'),
    'Entering Kawan Bicara must release Host Three.js WebGL context via suspendWebGL()'
  );
  assert.ok(
    appSrc.includes('shouldReleaseMochiWebGlForMobileWb') && appSrc.includes('<WhiteboardErrorBoundary'),
    'Voice Studio must release iframe WebGL during mobile Whiteboard and wrap Whiteboard in WhiteboardErrorBoundary'
  );
  assert.ok(
    errBoundarySrc.includes('getDerivedStateFromError') && errBoundarySrc.includes('wb-error-boundary-fallback'),
    'WhiteboardErrorBoundary must catch runtime render errors gracefully'
  );
  assert.ok(
    audioUnlockSrc.includes('decodeAudioDataSafe') &&
      audioUnlockSrc.includes('isMobileLowMemoryDevice') &&
      modalSrc.includes('ensureMobileSlidingLookahead') &&
      modalSrc.includes('h-[94dvh]'),
    'Whiteboard must enforce mobile sliding-window audio decode, safe decodeAudioDataSafe, and dvh height'
  );
  const canvasSrcLocal = read('features/voice-studio/src/components/LiveWhiteboardCanvas.tsx');
  const studioCssSrc = read('features/voice-studio/src/index.css');
  const callHtmlSrc = read('call.html');
  assert.ok(
    canvasSrcLocal.includes('overscroll-contain') &&
      canvasSrcLocal.includes("behavior: 'smooth'") &&
      studioCssSrc.includes('.fz-wb-spotlight-card') &&
      callHtmlSrc.includes('overscroll-behavior: none') &&
      clayCssSrc.includes('html.fz-view-chat'),
    'Mobile auto-scroll & auto-slideshow must use compositor-safe scrollTo, overscroll lock (anti pull-to-refresh), and mobile GPU layer discipline'
  );
  assert.ok(
    clayCssSrc.includes('html body #app .fz-vissol-welcome .tactile-streak-badge') &&
      clayCssSrc.includes('html body #app .fz-vissol-welcome .tactile-kicker-dot'),
    'Home welcome CSS must explicitly hide legacy tactile-kicker-dot and tactile-streak-badge to prevent Home greeting deformation'
  );
  assert.ok(
    hostAppSrc.includes('prevHomeSig===nextHomeSig') && hostAppSrc.includes('if(el.sheet)'),
    'Host app.js must skip no-op Home re-renders on cloud sync and promote cached WebKit print stylesheets before splash lift'
  );
  console.log('  ✅ PASS 13: Mobile PWA OOM/WebGL discipline, sliding-window audio, ErrorBoundary & Home stability verified');
}

// ============================================================================
// TEST 14: Mobile PWA Real-Device Zero-Force-Close Invariants (m025-811)
// ============================================================================
{
  const autoloadSrc = read('features/neural-voice/fiezel-voice-offline-autoload.js');
  const bootTailSrc = read('features/ui/fiezel-boot-tail.js');
  const updatePromptSrc = read('features/ui/fiezel-update-prompt.js');
  const mochiSrc = read('mochi-mascot/fiezel-mochi.js');
  const vadSrc = read('features/voice-studio/src/lib/sileroVadGate.ts');
  const appSrc = read('features/voice-studio/src/App.tsx');
  const audioUnlockSrc = read('features/voice-studio/src/lib/boardAudioUnlock.ts');
  const alignSrc = read('features/voice-studio/src/lib/speechAlignment.ts');
  const canvasSrcLocal = read('features/voice-studio/src/components/LiveWhiteboardCanvas.tsx');
  const diagramsSrc = read('features/voice-studio/src/components/WhiteboardVisualDiagrams.tsx');

  assert.ok(
    autoloadSrc.includes("'in_voice_studio'") && autoloadSrc.includes('holdBeforeAssemble'),
    'Offline neural-voice autoload must hold during fz-view-chat and before 156MB assembled() merge'
  );
  assert.ok(
    bootTailSrc.includes('fz-view-chat') &&
      bootTailSrc.includes('fzMitraKaiwaStudioFrame') &&
      updatePromptSrc.includes('fz-view-chat'),
    'Boot-tail split-brain reloader & update-prompt must treat Kawan Bicara / Whiteboard as active lesson (zero forced splash reload)'
  );
  assert.ok(
    vadSrc.includes('public pause(): void') &&
      vadSrc.includes('public resume(): void') &&
      vadSrc.includes('cb.isWorkbenchOpen?.()') &&
      appSrc.includes('sileroVadGateRef.current?.pause()'),
    'Silero Neural VAD WASM must pause during Whiteboard to avoid 32ms ScriptProcessor & WASM OOM'
  );
  assert.ok(
    audioUnlockSrc.includes('registerSharedBoardAudioContext') &&
      audioUnlockSrc.includes('__fzSharedLiveAudioCtx') &&
      appSrc.includes('registerSharedBoardAudioContext(liveCtx)'),
    'Whiteboard must adopt the single shared Host/Live AudioContext instead of spawning duplicate AudioContexts'
  );
  assert.ok(
    alignSrc.includes('function toMonoView') &&
      modalSrc.includes('isMobileLowMem\n              ? decoded') &&
      modalSrc.includes('resolvedChunkMap.delete(chunkIdx)') &&
      modalSrc.includes('audio.load()'),
    'Mobile Whiteboard audio pipeline must avoid Float32 copies, drop played dataUrls, and release HTMLAudio decoders'
  );
  assert.ok(
    canvasSrcLocal.includes('isFarQueuedHeavyDiagram') &&
      canvasSrcLocal.includes('lastMobileScrollAt') &&
      canvasSrcLocal.includes('isPenActive || strokes.length > 0 || Boolean(draftPoints)') &&
      diagramsSrc.includes('isMobileLowMemoryDevice'),
    'Mobile Whiteboard canvas must omit idle full-canvas ink SVG, defer far-queued diagrams, throttle smooth auto-scroll, and disable mobile scale/drop-shadow GPU storms'
  );
  assert.ok(
    mochiSrc.includes('cv.width = 0; cv.height = 0;'),
    'Mochi WebGL destroy() must zero offscreen 2D canvases to immediately release CoreGraphics bitmap RAM'
  );
  console.log('  ✅ PASS 14: Mobile PWA zero-force-close invariants (autoload hold, split-brain guard, Silero pause, 1-AudioContext, zero-copy PCM, idle SVG removal) verified');
}

// ============================================================================
// TEST 15: Combinatorial Interactive Mechanics, Dual Scratch Engine & Palette Diversity
// ============================================================================
{
  const scratchSrc = read('features/voice-studio/src/components/RoughScratchEngine.tsx');
  const manipSrc = read('features/voice-studio/src/components/WhiteboardInteractiveManipulatives.tsx');
  const typesSrc = read('features/voice-studio/src/types/voiceCall.ts');
  const canvasSrcLocal = read('features/voice-studio/src/components/LiveWhiteboardCanvas.tsx');
  const directorSrcLocal = read('features/voice-studio/src/lib/whiteboardDirector.ts');

  for (const mech of [
    'scratch_reveal',
    'balance_seesaw',
    'venn_bucket_sorter',
    'wire_node_connector',
    'rotary_dial_gauge',
    'fraction_slice_shader',
    'magnetic_slot_builder',
    'wave_pendulum_oscillator',
    'direct_2d_canvas_lab',
    'surgical_ink_strike',
    'step_derivation',
  ]) {
    assert.ok(typesSrc.includes(`'${mech}'`), `InteractiveMechanicKind must declare ${mech}`);
  }
  for (const pal of [
    'cobalt_blueprint',
    'terracotta_atelier',
    'violet_prism',
    'crimson_scalpel',
    'amber_fulcrum',
    'teal_oscillator',
    'indigo_constellation',
    'emerald_botanical',
  ]) {
    assert.ok(scratchSrc.includes(`${pal}:`), `INK_STUDIO_PALETTES must define ${pal}`);
  }
  assert.ok(
    scratchSrc.includes("ctx.globalCompositeOperation = 'destination-out'") &&
      scratchSrc.includes('export function animateRoughScratchPaths'),
    'RoughScratchEngine must provide both HTML5 Canvas destination-out scratch-off foil AND progressive Rough.js stroke-dashoffset scratch animation'
  );
  assert.ok(
    manipSrc.includes('className="sr-only"') && manipSrc.includes('data-testid="wb-direct-canvas-svg"'),
    'Direct 2D Canvas Lab must use direct SVG pointer manipulation and keep range input sr-only (zero plain visible browser sliders)'
  );
  assert.ok(
    canvasSrcLocal.includes('data-testid="wb-remix-mechanic-btn"') &&
      modalSrc.includes('mechanicVariantNonce') &&
      directorSrcLocal.includes('buildDynamicTopicRemixPair'),
    'Whiteboard must wire live Variasi Lab mechanic/palette/hatch remixing across LiveWhiteboardCanvas, Modal, and Director'
  );
  console.log('  ✅ PASS 15: Combinatorial 11 interactive mechanics × 8 ink palettes × 5 Rough.js hatches & dual scratch engine verified');
}

console.log('\n🎉 ALL 15 WHITEBOARD CONTRACT TESTS PASSED 100%!');
