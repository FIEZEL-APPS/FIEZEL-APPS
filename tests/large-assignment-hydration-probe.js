// tests/large-assignment-hydration-probe.js
// Probe integration test for hydration and receipt of large subject assignments (30-40 IPA questions).
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); },
  clear: () => { store.clear(); }
};
global.window = global;
global.document = {
  activeElement: null,
  addEventListener: () => {},
  removeEventListener: () => {}
};

// Mock translations
global.FiezelI18n = {
  t: (k, fb) => fb || k,
  getLocale: () => 'id'
};

// Load modules
const TeacherStore = require('../features/teacher/fiezel-teacher-store.js');
global.FiezelTeacherStore = TeacherStore;

const ReviewBank = require('../features/learner-flow/fiezel-review-bank.js');
global.FiezelReviewBank = ReviewBank;

const LearnerFlow = require('../features/learner-flow/fiezel-learner-flow.js');
global.FiezelLearnerFlow = LearnerFlow;

const BraincoreReview = require('../features/class-hub/fiezel-braincore-review.js');
global.FiezelBraincoreReview = BraincoreReview;

require('../features/class-hub/fiezel-class-hub.js');
const ClassHub = globalThis.FiezelClassHub;

console.log('=== STARTING LARGE ASSIGNMENT HYDRATION PROBE ===');

// 1. Generate 35 IPA (Science) questions
const ipaItems = [];
for (let i = 1; i <= 35; i++) {
  ipaItems.push({
    id: `ipa-item-${i}`,
    prompt: `Soal IPA #${i}: Manakah yang termasuk komponen biotik dalam ekosistem perairan?`,
    options: ['Batu kali', 'Fitoplankton', 'Air tawar', 'Oksigen terlarut'],
    answer: 1,
    skill: 'IPA',
    context: `Konteks ekosistem bab ${Math.ceil(i / 5)}: Perhatikan interaksi antarkomponen di danau.`,
    why: {
      0: 'Batu adalah komponen abiotik (benda tak hidup).',
      2: 'Air adalah komponen abiotik.',
      3: 'Oksigen adalah gas terlarut, komponen abiotik.'
    },
    note: 'Fitoplankton adalah organisme hidup (produsen utama di perairan).'
  });
}

// Set up onboarding code
localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({
  classCode: 'FZ-IPA001',
  name: 'Budi Santoso'
}));

// Test 2: Stub update in acceptAssignmentPayload
console.log('\n--- Test 2: Stub update in acceptAssignmentPayload ---');
// Step 2a: Initial stub received (e.g. from inbox polling without full items)
const stubPayload = {
  v: 1,
  t: 'assign',
  id: 'tugas-ipa-35',
  title: 'Ulangan Harian Ekosistem & IPA Terpadu',
  skills: ['IPA'],
  itemIds: ipaItems.map(x => x.id),
  minutes: 45,
  mode: 'latihan',
  teacher: 'Ibu Endang S.Pd.',
  from: 'Kelas 7B',
  deadline: '2026-10-30',
  items: null, // Stub without items
  source: { subjectId: 'IPA', subjectName: 'Ilmu Pengetahuan Alam (IPA)' }
};

TeacherStore.acceptAssignmentPayload(stubPayload);
let savedAssignments = JSON.parse(localStorage.getItem('fiezel-learner-assignments-v1'));
assert.strictEqual(savedAssignments.length, 1);
assert.strictEqual(savedAssignments[0].id, 'tugas-ipa-35');
assert.strictEqual(savedAssignments[0].items, undefined);

// Step 2b: Full assignment payload arrives with 35 items
const fullPayload = Object.assign({}, stubPayload, { items: ipaItems });
TeacherStore.acceptAssignmentPayload(fullPayload);
savedAssignments = JSON.parse(localStorage.getItem('fiezel-learner-assignments-v1'));
assert.strictEqual(savedAssignments.length, 1, 'Stub was replaced/updated instead of duplicated');
assert.ok(Array.isArray(savedAssignments[0].items), 'Items array is now present');
assert.strictEqual(savedAssignments[0].items.length, 35, 'All 35 items hydrated');
console.log('✔ Stub successfully updated with full 35 items');

// Test 3: QuotaExceeded handling
console.log('\n--- Test 3: QuotaExceeded handling in TeacherStore ---');
// Inject a throwing setItem when length exceeds certain threshold
const origSetItem = localStorage.setItem;
let quotaTriggered = false;
localStorage.setItem = (k, v) => {
  if (k === 'fiezel-learner-assignments-v1' && !quotaTriggered && v.length > 5000) {
    quotaTriggered = true;
    const err = new Error('QuotaExceededError');
    err.name = 'QuotaExceededError';
    throw err;
  }
  return origSetItem.call(localStorage, k, v);
};

// Try accepting payload when quota is exceeded
const resQuota = TeacherStore.acceptAssignmentPayload(fullPayload);
assert.ok(resQuota, 'acceptAssignmentPayload handled quota error without crashing');
savedAssignments = JSON.parse(localStorage.getItem('fiezel-learner-assignments-v1'));
assert.strictEqual(savedAssignments[0].items.length, 35, 'Newest assignment kept all items despite quota');
console.log('✔ LocalStorage QuotaExceeded handled safely');

// Restore normal localStorage
localStorage.setItem = origSetItem;

// Test 4: tugasView rendering national subject
console.log('\n--- Test 4: ClassHub tugasView with national subject ---');
const hubUi = { tab: 'tugas', seg: 'semua' };
localStorage.setItem('fiezel-class-ui-v1', JSON.stringify(hubUi));

// Mount DOM stub container
const container = {
  innerHTML: '',
  querySelector: () => null,
  contains: () => false,
  addEventListener: () => {}
};

ClassHub.mountStudent(container, {});
console.log('CONTAINER INNER HTML FULL:', container.innerHTML);
assert.ok(container.innerHTML.includes('IPA'), 'IPA subject rendered');
assert.ok(container.innerHTML.includes('35 soal'), 'Item count rendered correctly');
console.log('✔ tugasView rendered 35-item IPA assignment card smoothly');

// Test 5: Open assignment and run in ClassHub
console.log('\n--- Test 5: ClassHub runner execution with custom IPA items ---');
const openSuccess = ClassHub.openAssignment('tugas-ipa-35');
assert.strictEqual(openSuccess, true, 'openAssignment returned true');

// Re-render
ClassHub.mountStudent(container, {});
assert.ok(container.innerHTML.includes('ch-runner'), 'Runner is active');
assert.ok(container.innerHTML.includes('Soal 1 dari 35'), 'Progress indicator shows Soal 1 dari 35');
assert.ok(container.innerHTML.includes('Fitoplankton'), 'Custom options rendered');
assert.ok(container.innerHTML.includes('Konteks ekosistem bab'), 'Context text rendered');

// Answer question 1 wrongly to verify distractor feedback in ClassHub runner
const studentUi = ClassHub._studentUi();
const currentQIndex = studentUi.runner.order[studentUi.runner.idx];
const currentItem = ipaItems[currentQIndex];
studentUi.runner.answers.push({ itemId: currentItem.id, skill: currentItem.skill, correct: false, chosen: 0 });
studentUi.runner.chosen = 0;
studentUi.runner.revealed = true;
ClassHub.mountStudent(container, {});
assert.ok(container.innerHTML.includes('ch-feedback is-no'), 'Feedback for wrong answer rendered');
assert.ok(container.innerHTML.includes('Batu adalah komponen abiotik'), 'Why/distractorWhy explanation rendered in ClassHub');
console.log('✔ ClassHub runner distractor explanation works correctly');

// Test 6: LearnerFlow handling national subject without throwing
console.log('\n--- Test 6: LearnerFlow custom items and non-English skills ---');
const lfHandlers = {};
const lfContainer = {
  innerHTML: '',
  querySelector: () => null,
  addEventListener: (type, fn) => { lfHandlers[type] = fn; }
};

LearnerFlow.mount(lfContainer, {});
const lfPlan = LearnerFlow.buildPlan(LearnerFlow.load());
const ipaBlock = lfPlan.blocks.find(b => b.id === 'assign-tugas-ipa-35');
assert.ok(ipaBlock, 'IPA assignment block found in plan');
assert.strictEqual(ipaBlock.items.length, 35, 'Block contains all 35 items');

// Test explain() in ReviewBank with custom IPA skill
const itemIpa = ipaItems[0];
const wrongExplain = ReviewBank.explain(itemIpa, 0); // chose 'Batu kali' (wrong)
assert.strictEqual(wrongExplain.correct, false);
assert.ok(wrongExplain.text.includes('Batu adalah komponen abiotik'), 'Explains misconception correctly');
assert.ok(!wrongExplain.text.includes('undefined'), 'Zero undefined in explanation');

const rightExplain = ReviewBank.explain(itemIpa, 1); // chose 'Fitoplankton' (correct)
assert.strictEqual(rightExplain.correct, true);
assert.ok(rightExplain.text.includes('Fitoplankton'), 'Explains correct answer');
assert.ok(!rightExplain.text.includes('undefined'), 'Zero undefined in correct explanation');
console.log('✔ ReviewBank explain() handles custom skills without crashing');

// Test running custom lesson in LearnerFlow directly
const origClassHub = global.FiezelClassHub;
delete global.FiezelClassHub;
delete globalThis.FiezelClassHub;

LearnerFlow.openAssignment('tugas-ipa-35');
const lfActive = LearnerFlow._state().activeLesson;
assert.ok(lfActive, 'LearnerFlow active lesson started');
assert.strictEqual(lfActive.items.length, 35, 'LearnerFlow hydrated 35 custom items');
assert.strictEqual(lfActive.itemIds.length, 35, 'LearnerFlow itemIds length is 35');

// Answer first question via simulated click
lfHandlers['click']({
  target: {
    closest: (sel) => ({
      getAttribute: (k) => (k === 'data-lf' ? 'lesson-answer' : k === 'data-choice' ? '0' : null)
    })
  }
});
assert.ok(lfActive.feedback, 'Feedback generated without crashing on undefined skill/area');
assert.strictEqual(lfActive.feedback.correct, false);
assert.ok(lfActive.feedback.text.includes('Batu adalah komponen abiotik'), 'Custom why feedback generated in LearnerFlow');

// Restore FiezelClassHub
global.FiezelClassHub = origClassHub;
globalThis.FiezelClassHub = origClassHub;
console.log('✔ LearnerFlow runner runs custom assignment with 35 items without crashing');

console.log('\n=== ALL PROBE TESTS PASSED SUCCESSFULLY! ===');
