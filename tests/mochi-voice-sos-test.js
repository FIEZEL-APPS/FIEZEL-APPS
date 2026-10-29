/**
 * FIEZEL · tests/mochi-voice-sos-test.js
 * Comprehensive Unit Test Suite for Mochi In-Quiz Live Voice SOS Lifeline.
 */
'use strict';
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const MochiVoiceSos = require(path.join(root, 'features', 'brain', 'fiezel-mochi-voice-sos.js'));
const FiezelGems = require(path.join(root, 'features', 'speaking-listening', 'gems-core.js'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ PASS: ' + name);
  } catch (err) {
    failed++;
    console.error('✗ FAIL: ' + name + '\n  ' + (err && err.stack ? err.stack : err));
  }
}

console.log('=== [FIEZEL MOCHI VOICE SOS UNIT TESTS] ===\n');

// 1. First-Touch Placement Welcome Pass
test('canCall: First placement test gets Welcome Pass (0 Gem)', () => {
  global.__getFiezelState = () => ({
    view: 'test',
    placementDone: false,
    placementVoicePassUsed: false,
    gems: { schema: 'fiezel-gems-v1', balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] }
  });

  const res = MochiVoiceSos.canCall({ isPlacement: true });
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.isWelcomePass, true);
  assert.strictEqual(res.cost, 0);
  assert.strictEqual(res.badge, 'Tiket Perdana Gratis');
});

// 2. Welcome Pass Consumed
test('spendForCall: Consumes welcome pass and sets placementVoicePassUsed=true', () => {
  const state = {
    view: 'test',
    placementDone: false,
    placementVoicePassUsed: false,
    gems: { schema: 'fiezel-gems-v1', balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] }
  };
  global.__getFiezelState = () => state;

  const res = MochiVoiceSos.spendForCall('test-session-1', true);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.spent, 0);
  assert.strictEqual(state.placementVoicePassUsed, true);
});

// 3. Regular Gem Cost Check
test('canCall: Regular session with sufficient gems allows call (cost: 20)', () => {
  global.__getFiezelState = () => ({
    view: 'grammar',
    placementDone: true,
    placementVoicePassUsed: true,
    gems: { schema: 'fiezel-gems-v1', balance: 45, earnedTotal: 45, spentTotal: 0, ledger: [] }
  });

  const res = MochiVoiceSos.canCall();
  assert.strictEqual(res.allowed, true);
  assert.strictEqual(res.isWelcomePass, false);
  assert.strictEqual(res.cost, 20);
});

// 4. Insufficient Gem Check
test('canCall: Rejects when gems < 20 with polite educational message', () => {
  global.__getFiezelState = () => ({
    view: 'vocab',
    placementDone: true,
    placementVoicePassUsed: true,
    gems: { schema: 'fiezel-gems-v1', balance: 12, earnedTotal: 12, spentTotal: 0, ledger: [] }
  });

  const res = MochiVoiceSos.canCall();
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.reason, 'insufficient_gems');
  assert.ok(res.message.includes('Gem kamu belum cukup'));
});

// 5. Anti-Leak Exam Purity Guard
test('canCall: Strict exam / skip-level exam locks voice assistance', () => {
  global.__getFiezelState = () => ({
    view: 'latihan',
    placementDone: true,
    gems: { schema: 'fiezel-gems-v1', balance: 100, earnedTotal: 100, spentTotal: 0, ledger: [] }
  });

  const res = MochiVoiceSos.canCall({ cfg: { measureMode: true } });
  assert.strictEqual(res.allowed, false);
  assert.strictEqual(res.reason, 'exam_lock');
  assert.ok(res.message.includes('mode ujian resmi'));
});

// 6. Gem Deduction and Persistence
test('spendForCall: Accurately spends 20 gems via FiezelGems', () => {
  global.FiezelGems = FiezelGems;
  const state = {
    gems: { schema: 'fiezel-gems-v1', balance: 50, earnedTotal: 50, spentTotal: 0, ledger: [] }
  };
  global.__getFiezelState = () => state;

  const res = MochiVoiceSos.spendForCall('sos-session-2', false);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.spent, 20);
  assert.strictEqual(state.gems.balance, 30);
  assert.strictEqual(state.gems.spentTotal, 20);
});

// 7. Cashback Award
test('awardCashback: Awards 5 gems when assisted question is answered correctly', () => {
  global.FiezelGems = FiezelGems;
  const state = {
    gems: { schema: 'fiezel-gems-v1', balance: 30, earnedTotal: 50, spentTotal: 20, ledger: [] }
  };
  global.__getFiezelState = () => state;

  MochiVoiceSos.awardCashback('sos-session-2');
  assert.strictEqual(state.gems.balance, 35);
  assert.strictEqual(state.gems.earnedTotal, 55);
});

// 8. Socratic Prompting & Zero-Spoiling Invariant
test('buildSocraticPrompt: Enforces anti-spoiling and pedagogical scaffolding', () => {
  const q = {
    question: '日曜日に図書館（　）本を読みます。',
    concept: 'Partikel で vs に',
    misconceptionId: 'locative_particle_confusion',
    failWhy: 'Murid sering tertukar antara に dan で untuk lokasi aksi.',
    options: ['に', 'で', 'を', 'へ']
  };

  const promptObj = MochiVoiceSos.buildSocraticPrompt(q, false);
  assert.ok(promptObj.systemPrompt.includes('ZERO-SPOILING'));
  assert.ok(promptObj.systemPrompt.includes('Never blurt out the direct correct option'));
  assert.ok(promptObj.systemPrompt.includes('Partikel で vs に'));
  assert.ok(promptObj.systemPrompt.includes('locative_particle_confusion'));
  assert.ok(promptObj.greeting.includes('Mochi siap bantu'));
});

// 9. Null-dereference safety
test('Null safety: Defensive guards prevent crashes on undefined inputs', () => {
  global.__getFiezelState = () => null;
  const res = MochiVoiceSos.canCall(null);
  assert.strictEqual(res.allowed, false);

  assert.doesNotThrow(() => {
    MochiVoiceSos.startIdleNudgeTimer(null, null, false);
    MochiVoiceSos.clearIdleNudge();
    MochiVoiceSos.onQuestionAnswered(true, null);
    MochiVoiceSos.closeCall('test');
  });
});

// 10. Intro Pop-up 2-Session Lifetime Enforcement
test('checkAndShowIntroModal: Enforces max 2 displays across entire user lifetime', () => {
  const dummyState = {
    mochiIntroSeenCount: 0
  };
  global.__getFiezelState = () => dummyState;
  global.save = () => {};

  let modalRendered = false;
  const originalRender = MochiVoiceSos._renderIntroModal;
  MochiVoiceSos._renderIntroModal = () => { modalRendered = true; };

  // First session: count 0 -> 1, shows modal
  modalRendered = false;
  MochiVoiceSos.checkAndShowIntroModal();
  assert.strictEqual(dummyState.mochiIntroSeenCount, 1);
  assert.strictEqual(modalRendered, true);

  // Second session: count 1 -> 2, shows modal
  modalRendered = false;
  MochiVoiceSos.checkAndShowIntroModal();
  assert.strictEqual(dummyState.mochiIntroSeenCount, 2);
  assert.strictEqual(modalRendered, true);

  // Third session: count 2 -> stays 2, NEVER shows modal again!
  modalRendered = false;
  MochiVoiceSos.checkAndShowIntroModal();
  assert.strictEqual(dummyState.mochiIntroSeenCount, 2);
  assert.strictEqual(modalRendered, false, 'Modal MUST NOT appear when count >= 2');

  // Fourth session: stays suppressed
  MochiVoiceSos.checkAndShowIntroModal();
  assert.strictEqual(dummyState.mochiIntroSeenCount, 2);
  assert.strictEqual(modalRendered, false);

  MochiVoiceSos._renderIntroModal = originalRender;
});

// 11. Bilingual Adaptation (Thai vs Indonesian)
test('Bilingual support: Correctly adapts spoken prompts and labels for Thai (th)', () => {
  global.FiezelI18n = { getLocale: () => 'th' };
  global.__getFiezelState = () => ({
    view: 'test',
    placementDone: false,
    placementVoicePassUsed: false,
    gems: { schema: 'fiezel-gems-v1', balance: 0, earnedTotal: 0, spentTotal: 0, ledger: [] }
  });

  const res = MochiVoiceSos.canCall({ isPlacement: true });
  assert.strictEqual(res.badge, 'ตั๋วทดลองฟรี');

  const q = { question: 'これはペンです。', concept: 'Copula です' };
  const thaiPrompt = MochiVoiceSos.buildSocraticPrompt(q, true);
  assert.strictEqual(thaiPrompt.locale, 'th');
  assert.ok(thaiPrompt.greeting.includes('สวัสดี'));
  assert.ok(thaiPrompt.systemPrompt.includes('THAI'));

  // Reset locale back to Indonesian
  global.FiezelI18n = { getLocale: () => 'id' };
  const idPrompt = MochiVoiceSos.buildSocraticPrompt(q, true);
  assert.strictEqual(idPrompt.locale, 'id');
  assert.ok(idPrompt.greeting.includes('Halo!'));
  assert.ok(idPrompt.systemPrompt.includes('INDONESIAN'));
});

console.log(`\n====================================================`);
console.log(`HASIL AKHIR: ${passed} DARI ${passed + failed} PENGUJIAN LULUS`);
console.log(`====================================================\n`);

if (failed > 0) {
  process.exit(1);
}
