const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test 1: Verify fiezel-2.css contains data-choice locking
const fiezel2Css = fs.readFileSync('fiezel-2.css', 'utf8');
assert.ok(fiezel2Css.includes('body .option[data-choice="0"]::before{content:"A"}'), 'data-choice 0 locked to A');
assert.ok(fiezel2Css.includes('body .option[data-choice="1"]::before{content:"B"}'), 'data-choice 1 locked to B');
assert.ok(fiezel2Css.includes('body .option[data-choice="2"]::before{content:"C"}'), 'data-choice 2 locked to C');
assert.ok(fiezel2Css.includes('body .option[data-choice="3"]::before{content:"D"}'), 'data-choice 3 locked to D');
assert.ok(fiezel2Css.includes('body .option.correct::before{background:var(--good-bright)!important;color:#fff!important;content:"✓"!important}'), 'correct has checkmark');
assert.ok(fiezel2Css.includes('body .option.wrong::before{background:var(--bad)!important;color:#fff!important;content:"✕"!important}'), 'wrong has x');
console.log('PROBE 1 PASS: Option letters locked immutably to data-choice indices');

// Test 2: Verify style.css contains expanded retry padding
const styleCss = fs.readFileSync('style.css', 'utf8');
assert.ok(styleCss.includes('.quiz-shell.has-retry-active'), '.quiz-shell.has-retry-active defined');
assert.ok(styleCss.includes('padding-bottom:calc(220px + env(safe-area-inset-bottom, 0px))!important'), 'padding-bottom 220px defined');
console.log('PROBE 2 PASS: 220px bottom clearance for tutor turn against floating bar');

// Test 3: Verify tutor-brain anti-leak with keyGuard and suffix checks
const tutorBrain = require(path.join(__dirname, '../features/brain/fiezel-tutor-brain.js'));
const leakTurn = tutorBrain.composeTurn({
  move: 'hint',
  scaffold: 'hint',
  keyGuard: 'watched',
  options: ['watch', 'watched', 'did watched', 'watching'],
  explanation: {
    memoryCue: 'Ada “last night”? Kata kerjanya pakai -ed.'
  }
});
assert.ok(!leakTurn.ask.includes('pakai -ed'), 'anti-leak prevented leaking suffix -ed: ' + leakTurn.ask);
assert.ok(!leakTurn.ask.includes('watched'), 'anti-leak prevented leaking key watched: ' + leakTurn.ask);
assert.ok(leakTurn.ask.includes('Petunjuknya ada di kata-kata di sekitar bagian yang kosong'), 'safe hint fallback served: ' + leakTurn.ask);
console.log('PROBE 3 PASS: Tutor brain anti-leak suppresses suffix and word leaks');

// Test 4: Verify memory cues sanitized in templates
const templates = JSON.parse(fs.readFileSync('grammar-templates.json', 'utf8')).templates;
const a1_203 = templates.find(t => t.id === 'A1-203');
assert.ok(!a1_203.explanation.memoryCueId.includes('-ed'), 'A1-203 sanitized');
const co_002 = templates.find(t => t.id === 'CO-002');
assert.ok(!co_002.explanation.memoryCueId.includes('maknanya bukan lampau'), 'CO-002 sanitized');
console.log('PROBE 4 PASS: Templates A1-203 and CO-002 memory cues sanitized for SMP students');

// Test 5: Verify diagnose_distractor removed from GRAMMAR_LESSON_MODES and fallback
const appJs = fs.readFileSync('app.js', 'utf8');
assert.ok(!/const GRAMMAR_LESSON_MODES=\[[^\]]*diagnose_distractor/.test(appJs), 'diagnose_distractor removed from GRAMMAR_LESSON_MODES');
assert.ok(!/const GRAMMAR_WHY_SLOT_MODES=\[[^\]]*diagnose_distractor/.test(appJs), 'diagnose_distractor removed from GRAMMAR_WHY_SLOT_MODES');
console.log('PROBE 5 PASS: diagnose_distractor removed from active pools');

console.log('\nALL 5 EMPIRICAL PROBES PASSED 100%!');
