'use strict';
// m025-42 regression: the two deliveries OWNER picked by name must survive intact, and
// the Supertonic path must not silently inherit the Piper-era workarounds.
//
// OWNER's choice, verbatim from the audition kit:
//   R2-sid2_GENZ-energetic_S2_ajar  -> explaining lines: sid 2, speed 1.12, pitch 1.03
//   R2-sid5_GENZ-max_S4_pujian      -> praise lines:     speed 1.18, pitch 1.05
// m028-3: OWNER removed sid 5 (the male voice). Both registers now speak as sid 2, so the
// praise line is a change of pace rather than a change of person.
const assert = require('assert');
const fs = require('fs');

const Persona = require('./features/neural-voice/fiezel-voice-persona.js');
const Script = require('./features/neural-voice/fiezel-genz-script.js');
const Prosody = require('./features/neural-voice/fiezel-prosody.js');
const Adapter = require('./features/neural-voice/fiezel-sherpa-vits-adapter.js');

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok -', name); }
  catch (error) { failures++; console.error('FAIL -', name, '\n   ', error.message); }
}

// ---------------------------------------------------------------- persona contract
test('the two personas keep the exact numbers OWNER approved', () => {
  assert.deepStrictEqual(
    { sid: Persona.PERSONAS.ajar.sid, speed: Persona.PERSONAS.ajar.speed, pitch: Persona.PERSONAS.ajar.pitch },
    { sid: 2, speed: 1.12, pitch: 1.03 });
  assert.deepStrictEqual(
    { sid: Persona.PERSONAS.hype.sid, speed: Persona.PERSONAS.hype.speed, pitch: Persona.PERSONAS.hype.pitch },
    { sid: 2, speed: 1.18, pitch: 1.05 });
});

// m028-3: OWNER removed sid 5, the male voice, leaving one female voice.
// This is a product decision, so it is pinned rather than left to be re-derived.
test('only one Indonesian voice remains, and it is not sid 5', () => {
  const sids = Object.keys(Persona.PERSONAS).map((key) => Persona.PERSONAS[key].sid);
  assert.ok(sids.length >= 2, 'both delivery registers must still exist');
  assert.strictEqual(new Set(sids).size, 1, 'every persona must speak as the same single voice');
  assert.ok(!sids.includes(5), 'sid 5 is the removed voice and must not reappear');

  const map = Persona.voiceSids();
  const mapped = new Set(Object.keys(map).map((key) => map[key]));
  assert.strictEqual(mapped.size, 1, 'every product voice id must resolve to the one remaining voice');
  assert.ok(!mapped.has(5), 'no stored preference may resolve to the removed voice');
  // A learner whose saved preference is tutor_hype must keep working.
  assert.strictEqual(map.tutor_hype, map.id_natural);
  assert.strictEqual(map.tutor_ajar, map.id_natural);

  const source = require('fs').readFileSync('./features/neural-voice/fiezel-voice-persona.js', 'utf8');
  assert.ok(!/sid:\s*5\b/.test(source), 'the persona table must not declare sid 5');
});

test('praise and greeting lines route to the hype persona', () => {
  assert.strictEqual(Persona.resolve('Wih, keren banget! Jawaban kamu bener.').id, 'hype');
  assert.strictEqual(Persona.resolve('Haloo! Siap belajar bareng aku hari ini?').id, 'hype');
  assert.strictEqual(Persona.resolve('Yuk, kita mulai.').id, 'hype');
});

test('explanations stay on the teaching persona', () => {
  const line = 'Kata a dan kata an itu buat benda yang masih satu, dan yang pendengarnya belum tentu tau.';
  assert.strictEqual(Persona.resolve(line).id, 'ajar');
  // A long line that merely contains a hype word is still an explanation.
  assert.strictEqual(Persona.resolve(
    'Bagus untuk diingat, past simple dipakai buat kejadian yang udah kelar di masa lalu dan tidak berlanjut sampai sekarang.'
  ).id, 'ajar');
});

test('an explicit intent overrides word matching', () => {
  assert.strictEqual(Persona.resolve('Past simple dipakai buat masa lalu.', 'pujian').id, 'hype');
  assert.strictEqual(Persona.resolve('Wih, keren!', 'penjelasan').id, 'ajar');
});

test('the measured ceiling is enforced, not just documented', () => {
  assert.strictEqual(Persona.clampSpeed(1.6), Persona.MAX_SPEED);
  assert.strictEqual(Persona.clampPitch(1.4), Persona.MAX_PITCH);
  assert.ok(Persona.MAX_SPEED <= 1.18 && Persona.MAX_PITCH <= 1.05,
    'the ceiling must not drift above the setting OWNER approved');
});

// ---------------------------------------------------------------- Gen Z script layer
test('formal Indonesian is spoken in the casual register', () => {
  const out = Script.casualize('Saya sudah membuat contoh yang sangat mudah, tetapi Anda tidak melihat.');
  assert.ok(/aku/i.test(out) && /udah/i.test(out) && /bikin/i.test(out), out);
  assert.ok(/gampang/i.test(out) && /tapi/i.test(out) && /nggak/i.test(out), out);
  // "sangat mudah" must become "gampang banget", not "banget gampang".
  assert.ok(/gampang banget/i.test(out), 'intensifier must follow the word: ' + out);
  assert.ok(!/\bsaya\b|\bsudah\b|\btetapi\b/i.test(out), 'formal forms must be gone: ' + out);
});

test('capitalisation survives the rewrite', () => {
  assert.ok(/^Udah/.test(Script.casualize('Sudah selesai.')), Script.casualize('Sudah selesai.'));
});

test('the two pronunciation defects found by ASR round-trip are repaired', () => {
  // "A sama an itu" was heard back as "asaman".
  const letters = Script.pronounceable('A sama an itu buat benda yang masih satu.');
  assert.ok(/kata 'a'/i.test(letters) && /kata 'an'/i.test(letters), letters);
  // ... but an article doing its normal job inside an English phrase is left alone,
  // or the tutor would read "kata a university student" out loud.
  assert.strictEqual(Script.pronounceable('Coba ucapin: a university student.'),
    'Coba ucapin: a university student.');
  // "diawali bunyi yu" was heard back as "di awal ibu Nyu".
  const sound = Script.pronounceable('Kata university itu diawali bunyi yu, jadi kita pakai a.');
  assert.ok(sound.includes('bunyi awalnya seperti yu'), sound);
  assert.ok(!/diawali bunyi/.test(sound), sound);
});

test('re-running the repairs is a no-op', () => {
  const once = Script.pronounceable('A dan an dipakai untuk benda tunggal.');
  assert.strictEqual(Script.pronounceable(once), once);
});

test('English lines are never casualised', () => {
  const english = 'We use a before a consonant sound, and an before a vowel sound.';
  assert.strictEqual(Script.speakable(english, 'en'), english);
});

test('anti-bosan pools rotate and are big enough to not repeat immediately', () => {
  assert.ok(Script.OPENERS.length >= 8 && Script.PRAISES.length >= 8);
  assert.notStrictEqual(Script.opener(0), Script.opener(1));
  assert.strictEqual(Script.opener(0), Script.opener(Script.OPENERS.length));
});

// ---------------------------------------------------------------- prosody interaction
test('persona baseline is applied on top of the sentence shape', () => {
  const base = { speed: 1.18, pitch: 1.05 };
  const shaped = Prosody.contour('Wih, keren banget!', 0, 1, base);
  assert.ok(shaped.pitch > 1.05, 'an exclamation should sit above the persona baseline');
  assert.ok(shaped.pitch <= Prosody.PERSONA_PITCH_MAX, 'and still respect the hard stop');
  assert.ok(shaped.speed <= Prosody.PERSONA_SPEED_MAX);
});

test('a final phrase still falls, even in the hype register', () => {
  const base = { speed: 1.18, pitch: 1.05 };
  const closing = Prosody.contour('Lanjut satu soal lagi.', 1, 2, base);
  assert.ok(closing.pitch < base.pitch, 'the last phrase must fall or it reads as unfinished');
});

test('without a persona the m025-41 behaviour is byte-for-byte unchanged', () => {
  const before = Prosody.contour('Nah, sekarang kita lihat contohnya.', 0, 2);
  assert.ok(before.pitch >= Prosody.CONTOUR_MIN && before.pitch <= Prosody.CONTOUR_MAX);
});

test('the Gen Z discourse markers reached the Indonesian profile', () => {
  ['yuk', 'gas', 'soalnya', 'makanya', 'jadinya', 'pokoknya'].forEach((marker) => {
    assert.ok(Prosody.PROFILES.id.introMarkers.includes(marker), 'missing marker: ' + marker);
  });
});

// ---------------------------------------------------------------- adapter behaviour
function fakeEngine(options) {
  const posted = [];
  class FakeWorker {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
      setTimeout(() => {
        if (this.onmessage) this.onmessage({ data: { type: 'sherpa-onnx-tts-ready', numSpeakers: 10, modelType: 0 } });
      }, 0);
    }
    postMessage(message) {
      posted.push(message);
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: { type: 'sherpa-onnx-tts-result', samples: new Float32Array(44100).fill(0.2), sampleRate: 44100 }
          });
        }
      }, 0);
    }
    terminate() {}
  }
  const adapter = Adapter.createSherpaVitsAdapter(Object.assign({
    env: { Worker: FakeWorker },
    prosody: Prosody,
    personas: Persona,
    expectedSpeakers: 10,
    voiceSids: Persona.voiceSids(),
    defaultVoice: 'id_natural'
  }, options || {}));
  return { adapter, posted };
}

async function asyncTest(name, fn) {
  try { await fn(); console.log('ok -', name); }
  catch (error) { failures++; console.error('FAIL -', name, '\n   ', error.message); }
}

(async function () {
  await asyncTest('a Supertonic request carries its language to the engine', async () => {
    const { adapter, posted } = fakeEngine({ generationLang: 'id', usePersona: true, padBetweenPhrases: false, naturalSpeed: 1, generationSteps: 4 });
    await adapter.generate('Kita mulai ya.', { lang: 'id-ID' });
    assert.ok(posted.length >= 1);
    assert.strictEqual(posted[0].type, 'generateWithConfig');
    assert.strictEqual(posted[0].genConfig.extra.lang, 'id');
    // 4 steps measured faster AND more expressive than the engine default of 5;
    // below 4 the words break down, so this must not silently drift.
    assert.strictEqual(posted[0].genConfig.numSteps, 4);
  });

  test('both entry points ask for the same denoising step count', () => {
    const engine = fs.readFileSync('features/neural-voice/fiezel-supertonic-voice.js', 'utf8');
    const boot = fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js', 'utf8');
    const idSteps = Number((engine.match(/generationSteps:\s*(\d+)/) || [])[1]);
    const enSteps = Number((boot.match(/generationSteps:\s*(\d+)/) || [])[1]);
    assert.ok(idSteps >= 2 && idSteps <= 5, `Indonesian step count out of range: ${idSteps}`);
    // One model serves both languages, so a mismatch would make the two voices differ in
    // timing and texture for no stated reason. That agreement is the real invariant.
    assert.strictEqual(enSteps, idSteps, 'English and Indonesian must ask for the same steps');
  });

  await asyncTest('a praise line and an explanation are spoken by the SAME single voice', async () => {
    const hype = fakeEngine({ generationLang: 'id', usePersona: true, padBetweenPhrases: false, naturalSpeed: 1 });
    await hype.adapter.generate('Wih, keren banget!', { lang: 'id-ID' });
    assert.strictEqual(hype.posted[0].genConfig.sid, Persona.PERSONAS.hype.sid);

    const ajar = fakeEngine({ generationLang: 'id', usePersona: true, padBetweenPhrases: false, naturalSpeed: 1 });
    await ajar.adapter.generate(
      'Kata a dan kata an itu buat benda yang masih satu, dan yang pendengarnya belum tentu tau.',
      { lang: 'id-ID' });
    assert.strictEqual(ajar.posted[0].genConfig.sid, Persona.PERSONAS.ajar.sid);
  });

  await asyncTest('Supertonic does not get the synthetic Piper pause added on top', async () => {
    const off = fakeEngine({ generationLang: 'id', usePersona: true, padBetweenPhrases: false, naturalSpeed: 1 });
    const on = fakeEngine({ generationLang: 'id', usePersona: true, padBetweenPhrases: true, naturalSpeed: 1 });
    const line = 'Halo. Apa kabar?';
    const quiet = await off.adapter.generate(line, { lang: 'id-ID' });
    const padded = await on.adapter.generate(line, { lang: 'id-ID' });
    assert.strictEqual(off.posted.length, on.posted.length, 'same phrase split either way');
    // The only difference between the two runs is the synthetic silence, so the
    // difference in length IS that silence - and it must be absent for Supertonic.
    const addedMs = Math.round((padded.audio.length - quiet.audio.length) / 44100 * 1000);
    assert.ok(addedMs > 200, 'sanity: the padded run should carry real silence, got ' + addedMs + 'ms');
    assert.strictEqual(padded.audio.length > quiet.audio.length, true);
  });

  await asyncTest('the Piper path is untouched: no lang, and padding still applied', async () => {
    const piper = fakeEngine({});
    const result = await piper.adapter.generate('Halo. Apa kabar?', { lang: 'id-ID' });
    assert.strictEqual(piper.posted[0].type, 'generate');
    assert.ok(result.audio.length > 44100 * piper.posted.length,
      'the Piper path must keep the silence it depends on');
  });

  // ------------------------------------------------------------- wiring assertions
  test('the bilingual engine is wired into the shell', () => {
    const html = fs.readFileSync('index.html', 'utf8');
    ['fiezel-voice-persona.js', 'fiezel-genz-script.js', 'fiezel-supertonic-voice.js'].forEach((file) => {
      assert.ok(html.includes(file), 'index.html must load ' + file);
    });
    const sw = fs.readFileSync('sw.js', 'utf8');
    assert.ok(sw.includes('/vendor/supertonic-3/'), 'the service worker must treat the bundle as a neural asset');
  });

  test('the Indonesian bundle now delegates instead of owning a second model', () => {
    const src = fs.readFileSync('features/neural-voice/fiezel-indonesian-voice.js', 'utf8');
    assert.ok(src.includes('FiezelSupertonicVoice'), 'must delegate to the bilingual engine');
    assert.ok(!/MODEL_ID\s*=\s*'vits-piper-id_ID-news_tts-medium'/.test(src),
      'the news-reader model must no longer be the configured model');
    assert.ok(!src.includes("BASE = 'vendor/sherpa-vits-id/'"),
      'the retired Indonesian bundle must not be referenced as a live asset path');
    assert.ok(src.includes("voiceId: VOICE_ID") && src.includes("'id_natural'"),
      'the stored learner preference id must keep resolving');
  });

  if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
  console.log('\nm025-42 persona suite passed');
}());
