/**
 * tests/mochi-voice-sos-test.js
 * Comprehensive verification of In-Quiz Mochi Live Voice SOS Lifeline Engine.
 * Strict compliance with AGENTS.md:
 * - Rule 2: Anti-Stub & Numeric Definition of Done (Zero Mock-Passing Illusion).
 * - Rule 4: Braincore Engine Authority & Anti-Leak Exam Invariant.
 * - Rule 13: Zero-Crash DOM Defensive Guards.
 */
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
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

// 5. Placement Welcome Pass (First Impression) & Anti-Leak Exam Invariant
const placementAllowed = MochiSos.canCall({ isPlacement: true });
assert.strictEqual(placementAllowed.allowed, true, 'Placement test after onboarding must allow Mochi Voice SOS with Welcome Pass');
assert.strictEqual(placementAllowed.isWelcomePass, true, 'Placement test must grant Welcome Pass');
assert.strictEqual(placementAllowed.cost, 0, 'Placement test Welcome Pass cost must be 0');

const measureDenied = MochiSos.canCall({ measureMode: true });
assert.strictEqual(measureDenied.allowed, false, 'Measure mode must strictly deny SOS call');
assert.strictEqual(measureDenied.reason, 'exam_lock', 'Reason must be exam_lock');
console.log('  ✓ Placement Welcome Pass & Anti-Leak Exam Invariant verified');

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

// 12. Session start on placement/practice → true (armed), on level-exam → false (locked)
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'placement', placement: true }), true, 'Placement session after onboarding must arm Mochi SOS');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'level-exam', measure: true }), false, 'Level exam session must lock');
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
const localStore = { fz_gemini_api_key: 'fz-mock-test-key-01' };
sandbox.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(localStore, k) ? localStore[k] : null),
  setItem: (k, v) => { localStore[k] = String(v); },
  removeItem: (k) => { delete localStore[k]; }
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

// 16. Strict Domain Eligibility (ONLY grammar, reading, writing — NEVER vocab, listening, kana)
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'grammar', options: ['a', 'b'] }, { cfgType: 'grammar' }), true, 'Grammar must be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'reading', passage: 'Text' }, { cfgType: 'reading' }), true, 'Reading must be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'writing' }, { cfgType: 'writing' }), true, 'Writing must be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'vocab', options: ['a', 'b'] }, { cfgType: 'vocab' }), false, 'Vocabulary must NOT be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'listening', script: 'audio' }, { cfgType: 'listening' }), false, 'Listening must NOT be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'kana' }, { cfgType: 'kana' }), false, 'Kana must NOT be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'hiragana' }, { cfgType: 'hiragana' }), false, 'Hiragana must NOT be eligible');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'kanji' }, { cfgType: 'kanji' }), false, 'Kanji flashcard must NOT be eligible');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'vocab', measure: false }), false, 'Vocab session must not arm Mochi SOS');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'listening', measure: false }), false, 'Listening session must not arm Mochi SOS');
console.log('  ✓ Strict Domain Eligibility (grammar/reading/writing ONLY) verified');

// 17. Corner Card Toggle Persistence (fz_mochi_sos_enabled)
assert.strictEqual(MochiSos.isMochiEnabled(), true, 'Mochi SOS enabled by default');
MochiSos.setMochiEnabled(false, { silent: true });
assert.strictEqual(MochiSos.isMochiEnabled(), false, 'Mochi SOS disabled when toggled off');
assert.strictEqual(localStore.fz_mochi_sos_enabled, '0', 'localStorage persists 0');
assert.strictEqual(MochiSos.canCall().allowed, false, 'canCall denied when user toggled Mochi off');
assert.strictEqual(MochiSos.canCall().reason, 'mochi_disabled', 'Reason is mochi_disabled');
MochiSos.toggleMochiEnabled();
assert.strictEqual(MochiSos.isMochiEnabled(), true, 'toggleMochiEnabled restores active state');
assert.strictEqual(localStore.fz_mochi_sos_enabled, '1', 'localStorage persists 1');
console.log('  ✓ Corner Card Toggle persistence (#fzMochiCardToggle) verified');

// 18. Zero-Answer-Leak Redaction & Runtime Transcript Leak Guard
const spoilerQ = {
  stem: 'Yesterday she ____ to Tokyo.',
  options: ['go', 'went', 'goes', 'going'],
  answerIndex: 1,
  blankAnswer: 'went',
  explain: {
    rule: 'Karena ada penanda waktu Yesterday (lampau), gunakan bentuk V2 yaitu "went".',
    why: 'Kata went menunjukkan aksi masa lampau yang sudah selesai.'
  }
};
const redactedRule = MochiSos.redactAnswerFromHint(spoilerQ.explain.rule, spoilerQ);
assert.ok(!/\bwent\b/i.test(redactedRule), 'redactAnswerFromHint must scrub exact answer key from explain.rule');
const safeGuidance = MochiSos.buildSocraticGuidance(spoilerQ);
assert.ok(!/\bwent\b/i.test(safeGuidance), 'buildSocraticGuidance must never leak the answer key');
assert.strictEqual(MochiSos.transcriptLeaks('Jawabannya adalah went ya!', spoilerQ), true, 'transcriptLeaks must catch spoken answer key');
assert.strictEqual(MochiSos.transcriptLeaks('Coba perhatikan kata keterangan waktu di awal kalimatnya!', spoilerQ), false, 'transcriptLeaks must allow pure Socratic clue');
console.log('  ✓ Zero-Answer-Leak Redaction & Transcript Guard verified');

// 19. Gemini Live Socratic Tool Calling Anti-Spoiler Guard
const blockedTool = MochiSos._executeSocraticToolCall({
  name: 'highlight_quiz_clue',
  args: { clue_text: 'went', pedagogical_reason: 'spoiler test' }
}, spoilerQ);
assert.strictEqual(blockedTool.status, 'rejected_spoiler', 'highlight_quiz_clue must reject highlighting the answer key');
console.log('  ✓ Socratic Tool Calling (highlight_quiz_clue) anti-spoiler guard verified');

// 20. Self-Hosted Silero VAD v5 Bundle + Human Vocal-Band Noise Rejection
const vadDir = path.join(ROOT, 'vendor', 'silero-vad');
['bundle.min.js', 'vad.worklet.bundle.min.js', 'silero_vad_v5.onnx', 'ort-wasm-simd-threaded.js', 'ort-wasm-simd-threaded.wasm', 'LICENSE'].forEach(f => {
  assert.ok(fs.existsSync(path.join(vadDir, f)), `Silero VAD asset ${f} must exist in vendor/silero-vad`);
});
// Low-frequency rumble / passing vehicle engine noise (~75 Hz) must NOT pass human voice band check
const rumbleFrame = new Float32Array(2048);
for (let i = 0; i < rumbleFrame.length; i++) {
  rumbleFrame[i] = 0.25 * Math.sin((2 * Math.PI * 65 * i) / 16000);
}
const rumbleAnalysis = MochiSos.analyzeHumanVoiceBandFrame(rumbleFrame, 16000);
assert.strictEqual(rumbleAnalysis.isHumanSpeech, false, '65Hz vehicle engine rumble must be rejected as non-human noise');

// Broadband high-frequency hiss/clatter (>45% ZCR) must NOT pass human voice band check
const clatterFrame = new Float32Array(2048);
for (let i = 0; i < clatterFrame.length; i++) {
  clatterFrame[i] = (i % 2 === 0 ? 0.2 : -0.2);
}
const clatterAnalysis = MochiSos.analyzeHumanVoiceBandFrame(clatterFrame, 16000);
assert.strictEqual(clatterAnalysis.isHumanSpeech, false, 'High-ZCR mechanical clatter/wind hiss must be rejected as non-human noise');

// Voiced vowel harmonic signal (~420 Hz F1 + 980 Hz F2 + 1650 Hz F3) MUST pass human voice band check
const humanVowelFrame = new Float32Array(2048);
for (let i = 0; i < humanVowelFrame.length; i++) {
  const t = i / 16000;
  humanVowelFrame[i] = 0.08 * Math.sin(2 * Math.PI * 220 * t) +
                        0.15 * Math.sin(2 * Math.PI * 520 * t) +
                        0.10 * Math.sin(2 * Math.PI * 1180 * t);
}
const humanAnalysis = MochiSos.analyzeHumanVoiceBandFrame(humanVowelFrame, 16000);
assert.strictEqual(humanAnalysis.isHumanSpeech, true, 'Voiced human harmonic speech must pass vocal-band analysis');
console.log('  ✓ Silero VAD v5 assets & Human Vocal-Band Noise Rejection verified');

// 21. Wawa-Lipsync & Strict 2-Motion Open-Eyes Mochi Rule
const mochiSrc = fs.readFileSync(path.join(ROOT, 'mochi-mascot', 'fiezel-mochi.js'), 'utf8');
assert.ok(mochiSrc.includes('WawaLipsyncAnalyzer') && mochiSrc.includes('attachAudioAnalyser'), '3D Mochi must expose WawaLipsyncAnalyzer & attachAudioAnalyser');
assert.ok(code.includes('attachAudioAnalyser'), 'Mochi Voice SOS must wire real-time formant viseme lipsync');
assert.ok(!code.includes('paw_greet') && !code.includes('paw_encourage') && !code.includes('paw_celebrate'), 'Mochi Voice SOS must emit zero paw_* mascot vocalizations');
console.log('  ✓ Wawa-Lipsync & Strict Zero-PAW Vocalization Rule verified');

// 22. Home Front-Page Session Eligibility (level, adaptive, quick_win)
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'vocab', options: ['a', 'b'] }, { cfgType: 'level' }), true, 'Home level practice session must enable Mochi Voice SOS across all items');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'grammar', options: ['a', 'b'] }, { cfgType: 'adaptive' }), true, 'Home adaptive practice session must enable Mochi Voice SOS');
assert.strictEqual(MochiSos.isMochiSosEligible({ type: 'vocab', options: ['a', 'b'] }, { cfgType: 'quick_win' }), true, 'Home quick_win practice session must enable Mochi Voice SOS');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'level', measure: false }), true, 'onQuizSessionStart({ type: level }) must arm Mochi SOS');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'adaptive', measure: false }), true, 'onQuizSessionStart({ type: adaptive }) must arm Mochi SOS');
assert.strictEqual(MochiSos.onQuizSessionStart({ type: 'quick_win', measure: false }), true, 'onQuizSessionStart({ type: quick_win }) must arm Mochi SOS');
MochiSos.onQuizSessionEnd('home_test_done');
console.log('  ✓ Home Front-Page Session Eligibility (level/adaptive/quick_win) verified');

// 23. Full Question, Options & Explanation Connection in Snapshot & System Prompt
const fullExplainQ = {
  id: 'g-present-perfect-1',
  type: 'grammar',
  question: 'She ____ in Kyoto since 2021.',
  options: ['live', 'lives', 'has lived', 'lived'],
  answerIndex: 2,
  explain: {
    rule: 'Present Perfect (has/have + V3) digunakan bersama penanda "since + titik waktu awal".',
    why: 'Kalimat memiliki kata "since 2021" yang menandakan aksi dimulai di masa lalu dan masih berlangsung hingga sekarang.',
    distractor: 'Bentuk V2 "lived" hanya untuk kejadian masa lampau yang sudah selesai (misal: in 2021, bukan since 2021).',
    distractors: {
      live: 'Subjek "She" tunggal dan ada penanda durasi "since 2021".',
      lived: 'Past simple tidak dipakai bersama "since 2021".'
    },
    memory: 'Ingat: SINCE + tahun awal -> HAS/HAVE + V3!'
  }
};
const fullSnap = MochiSos.buildQuizContextSnapshot(fullExplainQ, { cfgType: 'grammar' });
assert.strictEqual(fullSnap.stem, 'She ____ in Kyoto since 2021.', 'Snapshot must capture exact question stem');
assert.deepStrictEqual(fullSnap.options, ['A) live', 'B) lives', 'C) has lived', 'D) lived'], 'Snapshot must capture all answer options');
assert.ok(fullSnap.rule.includes('Present Perfect'), 'Snapshot must preserve full pedagogical rule for mentor');
assert.ok(fullSnap.why.includes('since 2021'), 'Snapshot must preserve full pedagogical why-explanation');
assert.ok(fullSnap.distractor.includes('lived'), 'Snapshot must preserve distractor explanation');
assert.ok(fullSnap.distractorNotes.join(' ').includes('Past simple'), 'Snapshot must preserve per-option distractor breakdown');
const fullSysPrompt = MochiSos.buildMochiSystemPrompt(fullExplainQ, 'id', { cfgType: 'grammar' });
assert.ok(fullSysPrompt.includes('She ____ in Kyoto since 2021.'), 'System prompt must embed exact question stem');
assert.ok(fullSysPrompt.includes('Present Perfect'), 'System prompt must embed pedagogical rule');
assert.ok(fullSysPrompt.includes('since 2021'), 'System prompt must embed pedagogical why-explanation');
assert.ok(fullSysPrompt.includes('HARAM MUTLAK'), 'System prompt must enforce anti-spoiler Socratic rule');
console.log('  ✓ Full Question, Options & Explanation Connection verified');

// 24. Top Connection Status Banner (offline, reconnecting, quota, error, connected)
MochiSos.setConnectionStatus('offline', 'Koneksi internet terputus');
assert.strictEqual(MochiSos.getConnectionStatus().state, 'offline', 'Connection status state must update to offline');
MochiSos.setConnectionStatus('quota', 'Kuota API AI penuh');
assert.strictEqual(MochiSos.getConnectionStatus().state, 'quota', 'Connection status state must update to quota');
MochiSos.setConnectionStatus('connected', '');
assert.strictEqual(MochiSos.getConnectionStatus().state, 'connected', 'Connection status state must update to connected');
MochiSos.removeConnectionBanner();
console.log('  ✓ Top Connection Status Banner state machine verified');

// 25. 3-Stage Braincore × Mochi SOS Collaboration, Anti-Instant-Hint, & SMP-Level Language
MochiSos.onQuizSessionStart({ type: 'grammar', measure: false });
MochiSos.setActiveQuestion(fullExplainQ, { cfgType: 'grammar' });
const stage1Collab = MochiSos.evaluateBraincoreStruggleState(fullExplainQ);
assert.strictEqual(stage1Collab.stage, 1, 'Initial question entry with 0 wrong attempts must be Stage 1');
assert.strictEqual(stage1Collab.isStruggling, false, 'Stage 1 must not mark learner as struggling');
assert.strictEqual(stage1Collab.allowClueHighlight, false, 'Stage 1 must block direct clue highlighting so learner thinks first');
const stage1Prompt = MochiSos.buildMochiSystemPrompt(fullExplainQ, 'id', { cfgType: 'grammar' });
assert.ok(stage1Prompt.includes('SMP') && stage1Prompt.includes('istilah linguistik/akademik rumit'), 'System prompt must enforce SMP-level language and forbid academic jargon');
const stage1ClueRes = MochiSos._executeSocraticToolCall({
  name: 'highlight_quiz_clue',
  args: { clue_text: 'since 2021', pedagogical_reason: 'Cek waktu' }
}, fullExplainQ);
assert.strictEqual(stage1ClueRes.status, 'deferred_think_first', 'Stage 1 must defer narrow clue highlighting so learner reads and thinks independently first');

// Trigger 1st wrong attempt -> Stage 2 (SMP general concept explanation, still no narrow clue pointing)
MochiSos.noteAttempt(fullExplainQ, 0, false, { misconceptionId: 'present-simple-vs-perfect' });
const stage2Collab = MochiSos.evaluateBraincoreStruggleState(fullExplainQ);
assert.strictEqual(stage2Collab.stage, 2, 'After 1st wrong attempt, Braincore collaboration must advance to Stage 2');
assert.strictEqual(stage2Collab.isStruggling, false, 'Stage 2 still encourages concept understanding before intensive rescue');
const stage2ClueRes = MochiSos._executeSocraticToolCall({
  name: 'highlight_quiz_clue',
  args: { clue_text: 'since 2021', pedagogical_reason: 'Cek waktu' }
}, fullExplainQ);
assert.strictEqual(stage2ClueRes.status, 'deferred_think_first', 'Stage 2 still defers narrow clue highlighting');

// Trigger 2nd wrong attempt -> Stage 3 (Braincore × Mochi SOS Intensive Rescue unlocked)
MochiSos.noteAttempt(fullExplainQ, 3, false, { misconceptionId: 'past-simple-with-since' });
const stage3Collab = MochiSos.evaluateBraincoreStruggleState(fullExplainQ);
assert.strictEqual(stage3Collab.stage, 3, 'After 2nd wrong attempt, Braincore collaboration must escalate to Stage 3');
assert.strictEqual(stage3Collab.isStruggling, true, 'Stage 3 must mark learner as struggling');
assert.strictEqual(stage3Collab.allowClueHighlight, true, 'Stage 3 must unlock targeted clue guidance');
assert.ok(stage3Collab.diagnosticPacket.includes('KOLABORASI BRAINCORE × MOCHI SOS AKTIF'), 'Stage 3 diagnostic packet must include Braincore telemetry');
const stage3Prompt = MochiSos.buildMochiSystemPrompt(fullExplainQ, 'id', { cfgType: 'grammar' });
assert.ok(stage3Prompt.includes('KOLABORASI BRAINCORE × MOCHI SOS AKTIF'), 'System prompt in Stage 3 must inject Braincore diagnostic packet');
const stage3SpoilerRes = MochiSos._executeSocraticToolCall({
  name: 'highlight_quiz_clue',
  args: { clue_text: 'has lived', pedagogical_reason: 'Jawaban benar' }
}, fullExplainQ);
assert.strictEqual(stage3SpoilerRes.status, 'rejected_spoiler', 'Even in Stage 3, highlighting the exact answer key must be rejected');
const stage3ClueRes = MochiSos._executeSocraticToolCall({
  name: 'highlight_quiz_clue',
  args: { clue_text: 'since 2021', pedagogical_reason: 'Perhatikan kata penanda waktu ini ya!' }
}, fullExplainQ);
assert.ok(stage3ClueRes.status !== 'deferred_think_first' && stage3ClueRes.status !== 'rejected_spoiler', 'Stage 3 must unlock clue highlighting without deferring');
MochiSos.onQuizSessionEnd('collab_test_done');
console.log('  ✓ 3-Stage Braincore × Mochi SOS Collaboration & SMP-Level Language verified');

execFileSync(process.execPath, [path.join(ROOT, 'tests', 'brain-fsrs-oracle.suite.cjs')], { stdio: 'inherit' });
execFileSync(process.execPath, [path.join(ROOT, 'tests', 'japanese-grammar-conjugator.suite.cjs')], { stdio: 'inherit' });

console.log('\n>>> ALL MOCHI VOICE SOS UNIT TESTS PASSED (25/25)! <<<');
