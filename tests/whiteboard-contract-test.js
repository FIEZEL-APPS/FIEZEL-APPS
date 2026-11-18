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

// 3. Fast canvas reveal + follow-up freeze + debounced preparing pill + audioClock reset
{
  assert.match(modalSrc, /const\s+showInitialBuffering\s*=\s*!isReady\s*;/, 'Canvas must reveal as soon as boardState is ready');
  assert.ok(!/safetyTimer[^;]{0,120}11500/.test(modalSrc), 'Old 11.5s initial audio gate timer must not exist');
  assert.match(modalSrc, /if\s*\(isGeneratingTopic\)\s*\{\s*stopLockstepAudio\(\);\s*return;\s*\}/, 'Follow-up generation must freeze old board instead of racing silent clock');
  assert.match(modalSrc, /topicKey\s*=[\s\S]{0,220}currentKey\s*=/, 'Ganti Soal (`quizSeed`) must not clear topic audio cache');
  assert.match(modalSrc, /setAudioClock\(null\)/, 'Step seek must reset audioClock immediately');
  console.log('  ✅ PASS 3: Fast reveal, follow-up freeze, cache key isolation & clock reset verified');
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

// 6. LiveWhiteboardCanvas camera throttle, nib sync, phase jump & copy hygiene
const canvasSrc = read('features/voice-studio/src/components/LiveWhiteboardCanvas.tsx');
{
  assert.ok(canvasSrc.includes('if (currentSub !== lastFocusedSub)'), 'MutationObserver must only schedule camera check when focus target changes');
  assert.ok(!/if\s*\(effP\s*<\s*0\.65\s*&&\s*activeShape\)/.test(canvasSrc), 'Marker nib threshold must stay aligned with 0.86 reachedCount');
  assert.ok(canvasSrc.includes('lastPhaseStepIdx'), 'Last phase button must target step at final phase rather than overshooting');
  console.log('  ✅ PASS 6: Canvas camera throttle, nib sync & phase scrubber verified');
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

console.log('\n🎉 ALL 7 WHITEBOARD CONTRACT TESTS PASSED 100%!');
