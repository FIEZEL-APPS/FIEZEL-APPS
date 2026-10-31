/**
 * tests/mochi-voice-sos-test.js
 * Comprehensive verification of In-Quiz Mochi Live Voice SOS Lifeline Engine.
 * Strict compliance with AGENTS.md:
 * - Rule 2: Anti-Stub & Numeric Definition of Done (Zero Mock-Passing Illusion).
 * - Rule 4: Braincore Engine Authority & Anti-Leak Exam Invariant.
 * - Rule 13: Zero-Crash DOM Defensive Guards.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

console.log('[TEST] Starting Mochi Voice SOS Comprehensive Unit Tests...');

const ROOT = (typeof import.meta.dirname === 'string') ? path.resolve(import.meta.dirname, '..') : process.cwd();
const SOS_PATH = path.join(ROOT, 'features', 'mascot', 'fiezel-mochi-voice-sos.js');

assert.ok(fs.existsSync(SOS_PATH), 'fiezel-mochi-voice-sos.js must exist on disk at ' + SOS_PATH);

const code = fs.readFileSync(SOS_PATH, 'utf8');

// Ensure no mojibake corruption in code file
assert.ok(!code.includes("dY'Z"), 'Code must not contain corrupted mojibake emoji dY\'Z');
assert.ok(!code.includes('dYZ%'), 'Code must not contain corrupted mojibake emoji dYZ%');
assert.ok(!code.includes('dY?_'), 'Code must not contain corrupted mojibake emoji dY?_');

// 1. Sandbox Environment
const mockElement = (tag) => {
  const classListSet = new Set();
  return {
    tagName: String(tag || '').toUpperCase(),
    style: {},
    className: '',
    setAttribute: () => {},
    classList: {
      add: (c) => classListSet.add(c),
      remove: (c) => classListSet.delete(c),
      contains: (c) => classListSet.has(c)
    },
    appendChild: () => {},
    remove: () => {}
  };
};

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch: () => Promise.resolve({ ok: false }),
  navigator: {},
  WebSocket: undefined,
  Date,
  Math,
  Number,
  String,
  RegExp,
  Object,
  state: {
    gems: { balance: 100 },
    level: 2,
    mochiIntroSeenCount: 0
  },
  location: { hostname: 'localhost' },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: mockElement,
    body: { appendChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  FiezelI18n: {
    getLocale: () => 'id',
    t: (key) => key,
    registerCopy: () => {}
  }
};

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const MochiSos = sandbox.FiezelMochiVoiceSos;
assert.ok(MochiSos, 'FiezelMochiVoiceSos must be exported');

// 2. API Contract Check
const methods = [
  'isCallActive', 'canCall', 'spendForCall', 'refundMisTap', 'awardCashback',
  'buildSocraticGuidance', 'startCall', 'closeCall', 'toggleCall',
  'onQuestionAnswered', 'mountThoughtBubble', 'removeThoughtBubble',
  'renderUnderMochiVoiceVisualizer', 'showIntroIfNeeded', 'updateTopbarGem'
];
methods.forEach(m => {
  assert.strictEqual(typeof MochiSos[m], 'function', `Method ${m} must be a function`);
});
console.log('  ✓ API Contract verified (15 methods)');

// 3. Localhost non-destructive dev mode (Zero-State-Pollution)
const initialGems = sandbox.state.gems.balance;
const localCheck = MochiSos.canCall();
assert.strictEqual(localCheck.allowed, true, 'Localhost dev mode must allow call');
assert.strictEqual(localCheck.cost, 0, 'Localhost dev mode cost must be 0');
assert.strictEqual(sandbox.state.gems.balance, initialGems, 'Local dev check must NOT overwrite persistent state balance');
console.log('  ✓ canCall localhost non-destructive dev mode verified');

// 4. canCall in Non-Local mode with gems
sandbox.location.hostname = 'fiezel.my.id';
sandbox.state.gems.balance = 50;
const prodAllowed = MochiSos.canCall();
assert.strictEqual(prodAllowed.allowed, true, 'Production call with 50 gems must be allowed');
assert.strictEqual(prodAllowed.cost, 20, 'Standard call cost is 20 gems');

sandbox.state.gems.balance = 5;
const prodDenied = MochiSos.canCall();
assert.strictEqual(prodDenied.allowed, false, 'Production call with 5 gems must be denied');
assert.strictEqual(prodDenied.reason, 'insufficient_gems', 'Reason must be insufficient_gems');
console.log('  ✓ canCall gem wallet balance enforcement verified');

// 5. Anti-Leak Exam Invariant (Rule 4 §5)
const placementDenied = MochiSos.canCall({ isPlacement: true });
assert.strictEqual(placementDenied.allowed, false, 'Placement test must strictly deny SOS call');
assert.strictEqual(placementDenied.reason, 'exam_lock', 'Reason must be exam_lock');

const measureDenied = MochiSos.canCall({ measureMode: true });
assert.strictEqual(measureDenied.allowed, false, 'Measure mode must strictly deny SOS call');
assert.strictEqual(measureDenied.reason, 'exam_lock', 'Reason must be exam_lock');
console.log('  ✓ Anti-Leak Exam Invariant verified (Placement & Measure Mode locked)');

// 6. Socratic Scaffolding Guidance (Zero Spoiling)
const sampleQuestion = {
  stem: '公園____散歩します。',
  concept: 'Partikel で vs に',
  options: ['に', 'で', 'へ', 'を'],
  answerIndex: 1,
  explain: { rule: 'Gunakan で untuk tempat terjadinya aktivitas gerak.' }
};

const idHint = MochiSos.buildSocraticGuidance(sampleQuestion);
assert.ok(idHint.includes('Gunakan で') || idHint.includes('Tips dari Mochi'), 'ID guidance must contain rule hint');
assert.ok(!idHint.includes('Pilih opsi B'), 'Zero Spoiling: Must not tell user to pick option letter');

sandbox.FiezelI18n.getLocale = () => 'th';
const thHint = MochiSos.buildSocraticGuidance(sampleQuestion);
assert.ok(typeof thHint === 'string' && thHint.length > 5, 'TH guidance must return valid text');
assert.ok(!thHint.includes("dY'Z"), 'TH guidance must not contain corrupted bytes');
console.log('  ✓ Socratic Scaffolding (Indonesian & Thai) verified without spoiling');

// 7. Gem Economy: Spend, Refund, and Cashback
sandbox.location.hostname = 'fiezel.my.id';
sandbox.state.gems.balance = 40;
const spendRes = MochiSos.spendForCall('test-session', false);
assert.strictEqual(spendRes.ok, true, 'Spend call must succeed');
assert.strictEqual(spendRes.spent, 20, 'Must spend 20 gems');
assert.strictEqual(sandbox.state.gems.balance, 20, 'Balance must be deducted to 20');

// Award Cashback
MochiSos.awardCashback();
assert.strictEqual(sandbox.state.gems.balance, 25, 'Balance must increase by cashback (+5 gems)');
console.log('  ✓ Gem Economy (Spend 20 & Cashback +5) verified');

// 8. Gemini Live Duplex Voice Protocol & Puck Voice Setup Invariants
assert.ok(code.includes('models/gemini-3.8-live'), 'Must use models/gemini-3.8-live for duplex live voice');
assert.ok(code.includes("'Puck'"), 'Mochi voice config must use Puck prebuilt voice');
assert.ok(code.includes('BidiGenerateContentConstrained'), 'Must target GenerativeService.BidiGenerateContentConstrained');
assert.ok(code.includes('realtimeInput:') && code.includes('audio:'), 'Must use realtimeInput.audio schema for mic input streaming');
assert.ok(!code.includes('mediaChunks'), 'Must not use broken deprecated mediaChunks format');
assert.ok(code.includes('fz_gemini_api_key'), 'Must prioritize reading student personal Gemini API key from localStorage');
console.log('  ✓ Gemini Live Duplex Protocol & Puck Voice Invariants verified');

// 9. API kontrak baru (lifecycle, tap binding, konteks, leak guard)
['onQuizSessionStart','onQuizSessionEnd','setActiveQuestion','noteAttempt','greetOnEntry','bindMascotTap','handleMascotTap','prewarm']
  .forEach(m => assert.strictEqual(typeof MochiSos[m], 'function', `Method ${m} must be a function`));
console.log('  ✓ Lifecycle & tap API verified (8 new methods)');

// 10. Prompt generator: konteks dalam & zero-answer-key
assert.ok(code.includes('buildQuizContextSnapshot'), 'Deep context extractor must exist');
assert.ok(code.includes('NASKAH AUDIO'), 'Listening script must be injected to system prompt');
assert.ok(code.includes('Teks bacaan acuan'), 'Reading passage must be injected to system prompt');
assert.ok(!/answerIndex[^\n]*systemInstruction|systemInstruction[^\n]*answerIndex/.test(code), 'answerIndex must never reach systemInstruction');
assert.ok(code.includes('transcriptLeaks') && code.includes('outputTranscription'), 'Runtime leak guard on output transcription must exist');
console.log('  ✓ Deep context & zero-answer-key prompt verified');

// 11. Exam lock via examLockActive()
sandbox.examLockActive = () => true;
const lockedViaCore = MochiSos.canCall();
assert.strictEqual(lockedViaCore.allowed, false, 'examLockActive() must lock SOS');
assert.strictEqual(lockedViaCore.reason, 'exam_lock');
sandbox.examLockActive = () => false;
sandbox.state.quizType = 'level-exam';
assert.strictEqual(MochiSos.canCall().allowed, false, 'state.quizType=level-exam must lock SOS');
sandbox.state.quizType = 'practice';
console.log('  ✓ Exam lock via examLockActive()/state.quizType verified');

// 12. Session start on exam cfg → false (locked), on practice → true
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'placement', placement: true }), false, 'Placement session must lock');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'adaptive', measure: false }), true, 'Practice session must arm SOS');
MochiSos.onQuizSessionEnd('test');
console.log('  ✓ Session lifecycle lock semantics verified');

// 13. Mascot tap plumbing
assert.ok(code.includes("'mochi-tap'"), 'Must listen to mochi-tap CustomEvent from 3D renderer');
assert.ok(/addEventListener\('pointerdown'[\s\S]{0,400}true\)/.test(code), 'pointerdown must be capture-phase');
assert.ok(code.includes('fz-mochi-tap-bounce'), 'Tap bounce feedback class must be applied');
console.log('  ✓ Direct mascot tap plumbing verified');

// 14. Zero Browser TTS & Pure Gemini Live Silence Prompt Invariant
assert.ok(!code.includes('speechSynthesis'), 'Must eliminate all browser speechSynthesis robot TTS');
assert.ok(!code.includes('SpeechSynthesisUtterance'), 'Must eliminate all SpeechSynthesisUtterance robot TTS');
assert.ok(code.includes('Silakan bicara jika ingin bantuan dari aku'), 'Silence prompt must invite learner to speak');
assert.ok(code.includes('Segera buka suaramu, '), 'Silence prompt must include registered user name greeting');
assert.strictEqual(MochiSos._SILENCE_PROMPT_MS, 2000, 'Silence prompt delay must be strictly 2000ms (2 seconds)');
assert.ok(typeof MochiSos.triggerSilencePrompt === 'function', 'triggerSilencePrompt must be exposed');
console.log('  ✓ Zero Browser TTS & 2-Second Silence Prompt Invariant verified');

// 15. Instant Auto-Active Duplex on Practice Entry & Session-Long Persistence
sandbox.location.hostname = 'localhost';
sandbox.FiezelI18n.getLocale = () => 'id';
sandbox.state.userName = 'Fitra Pratama';
assert.strictEqual(MochiSos.getRegisteredLearnerName(), 'Fitra Pratama', 'Must resolve registered user name from PWA state');

const sentFrames = [];
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1;
  }
  send(data) {
    sentFrames.push(JSON.parse(data));
  }
  close() {
    this.readyState = 3;
  }
}
sandbox.WebSocket = MockWebSocket;
sandbox.localStorage = {
  getItem: (k) => (k === 'fz_gemini_api_key' ? 'AIzaSyTestKeyForUnitVerification12345' : null)
};

MochiSos.onQuizSessionStart({ type: 'grammar', measure: false });
MochiSos.setActiveQuestion(sampleQuestion, { cfgType: 'grammar' });
MochiSos.greetOnEntry(sampleQuestion, { cfgType: 'grammar' });
assert.strictEqual(MochiSos.isCallActive(), true, 'Duplex Live must activate automatically upon entering practice session');

// Verify call stays active across questions (does NOT close on question answered)
MochiSos.onQuestionAnswered(true, sampleQuestion);
assert.strictEqual(MochiSos.isCallActive(), true, 'Duplex Live must remain active after answering a question correctly');
MochiSos.onQuestionAnswered(false, sampleQuestion);
assert.strictEqual(MochiSos.isCallActive(), true, 'Duplex Live must remain active after answering a question wrongly');

// Verify 2-second silence prompt includes registered learner name
MochiSos.triggerSilencePrompt();
assert.strictEqual(MochiSos.getLastSilencePrompt(), 'Segera buka suaramu, Fitra Pratama!', 'Silence prompt must address user by registered PWA name');
const lastSent = sentFrames[sentFrames.length - 1];
assert.ok(
  lastSent &&
  lastSent.clientContent &&
  JSON.stringify(lastSent.clientContent).includes('Segera buka suaramu, Fitra Pratama!'),
  'WebSocket frame must transmit personalized 2-second silence prompt'
);

MochiSos.onQuizSessionEnd('test_complete');
assert.strictEqual(MochiSos.isCallActive(), false, 'Duplex Live must close cleanly when practice session ends');
console.log('  ✓ Auto-Entry Activation, Session-Long Persistence & Personalized 2s Silence Prompt verified');

console.log('\n>>> ALL MOCHI VOICE SOS UNIT TESTS PASSED (15/15)! <<<');
