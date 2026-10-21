'use strict';
// m025-39 regression for two production defects OWNER hit after the tutor v3 handover:
// session pages loading slowly, and Classroom failing on reload.
const assert = require('assert');
const fs = require('fs');

const selftests = require('../features/diagnostics/fiezel-module-selftests.js');
const targets = require('../features/diagnostics/fiezel-diagnostic-targets.js');

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('PASS', name); };

(async () => {
  // m025-95: cacat 1 dan 2 hidup di fiezel-tutor-indonesian-voice-fix.js, yang dihapus
  // bersama seluruh jalur suara Indonesia. Regresinya tidak bisa kembali karena
  // berkasnya tidak ada - yang dijaga sekarang adalah itu tetap begitu.
  test('tambalan suara Indonesia tetap terhapus', () => {
    assert.ok(!fs.existsSync('features/tutor-classroom/fiezel-tutor-indonesian-voice-fix.js'),
      'berkas tambalan harus tetap tidak ada');
    const chat = fs.readFileSync('features/tutor-classroom/fiezel-tutor-voice-chat.js', 'utf8');
    assert.ok(!/FiezelIndonesianVoice/.test(chat), 'tutor tidak boleh memanggil mesin Indonesia');
    assert.ok(/FiezelVoiceSay/.test(chat), 'tutor bicara lewat pintu bersama Inggris+subtitle');
  });

  test('adaptive accepts the numeric level index the app actually stores', () => {
    // state.level is a 1-based index into LEVELS, resolved as LEVELS[state.level-1].
    [1, 2, 3, 4, 5, 6].forEach(index => {
      assert.deepStrictEqual(selftests.adaptive({ level: index }, targets), [],
        'index ' + index + ' is valid app data, not a defect');
    });
    ['A1', 'C2'].forEach(cefr => {
      assert.deepStrictEqual(selftests.adaptive({ level: cefr }, targets), [],
        'a CEFR string stays acceptable');
    });
  });

  test('adaptive still catches a genuinely out-of-range level', () => {
    [0, 7, 'Z9'].forEach(bad => {
      const codes = selftests.adaptive({ level: bad }, targets).map(f => f.code);
      assert.ok(codes.includes('ADAPTIVE_INVALID_LEVEL'), 'must still flag ' + JSON.stringify(bad));
    });
    assert.deepStrictEqual(selftests.adaptive({ level: '' }, targets), [], 'unset level is not a defect');
    assert.ok(selftests.adaptive({ level: 1, stuck: true }, targets).map(f => f.code).includes('ADAPTIVE_STUCK'));
  });


  // ---- defect 4 (m025-40): a Proxy over the frozen runtime killed ALL speech --------
  test('the mechanism: proxying a frozen object with substituted members throws', () => {
    const frozen = Object.freeze({ speak: function () { return 'base'; } });
    const proxied = new Proxy(frozen, {
      get(t, p, r) { if (p === 'speak') return function () { return 'other'; }; return Reflect.get(t, p, r); }
    });
    assert.throws(() => proxied.speak,
      /non-configurable|read-only/i,
      'a get trap must return the frozen target value, so substitution is a hard TypeError');
    // The supported idiom: copy the surface, override on the copy.
    const wrapped = Object.freeze(Object.assign({}, frozen, { speak: function () { return 'other'; } }));
    assert.strictEqual(wrapped.speak(), 'other', 'spread-and-freeze substitutes cleanly');
  });

  // m025-95: tes ini memeriksa idiom di dalam tambalan yang sudah dihapus. Mekanismenya
  // - bahwa mem-proxy objek beku itu merusak - tetap diuji di tes sebelum dan sesudah ini.

  test('the override preserves the rest of the runtime surface', () => {
    // A wrapper that forgets a member silently removes capability from every caller.
    const base = Object.freeze({
      schema: 's', speak() { return 'b'; }, stop() { return 'bs'; },
      status() { return { prepared: true }; }, prepare() { return 'p'; },
      ensureReady() { return 'e'; }, totalBytes: 7
    });
    const patched = Object.freeze(Object.assign({}, base, { speak: () => 'c', stop: () => 'cs' }));
    Object.keys(base).forEach(key => {
      assert.ok(key in patched, 'member ' + key + ' must survive the override');
    });
    assert.strictEqual(patched.prepare(), 'p');
    assert.strictEqual(patched.ensureReady(), 'e');
    assert.strictEqual(patched.totalBytes, 7);
    assert.strictEqual(patched.speak(), 'c');
  });

  console.log(`FIEZEL tutor classroom regression: PASS ${pass}/0`);
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
