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

const ROOT = process.cwd();
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
    body: { appendChild: () => {} }
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

console.log('\n>>> ALL MOCHI VOICE SOS UNIT TESTS PASSED (8/8)! <<<');
