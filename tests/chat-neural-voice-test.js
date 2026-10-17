#!/usr/bin/env node
/**
 * tests/chat-neural-voice-test.js
 * Suara Ngobrol AI + Panggilan lewat pipeline Neural Voice resmi FIEZEL (m025-596).
 *
 * Menggantikan tests/speech-synthesis-engine-test.js, yang mengunci perilaku yang sudah DILARANG
 * owner: memilih suara bawaan peramban dan berbicara lewat speechSynthesis. Kanon m025-232/m025-246:
 * "tts browser harus mati total." Gerbang ini menegakkan kebalikannya:
 *   1. Kursus Inggris berbicara lewat FiezelVoiceSay (tangga resmi: aset R2 → Cloudflare TTS →
 *      Puter → neural lokal); kursus Jepang lewat Puter Voice ja-JP.
 *   2. speechSynthesis TIDAK PERNAH disentuh, walaupun tersedia dan semua lapisan neural gagal.
 *   3. Latensi telepon: balasan dipotong per kalimat, kalimat berikutnya dihangatkan (prefetch)
 *      selagi kalimat sekarang berbunyi; potongan terlalu pendek digabung.
 *   4. Barge-in: stop() memutus sisa kalimat seketika.
 *   5. Furigana dibuang sebelum diucapkan; autoplay unlock tetap jalan tanpa speechSynthesis.
 */
'use strict';
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..');
const tick = (ms) => new Promise((r) => setTimeout(r, ms || 0));

// speechSynthesis SENGAJA tersedia: gerbang ini membuktikan ia tidak dipakai walau ada.
let synthTouched = 0;
global.speechSynthesis = new Proxy({}, { get() { synthTouched++; return () => {}; } });
global.SpeechSynthesisUtterance = function () { synthTouched++; };

class MockAudioContext {
  constructor() { this.state = 'suspended'; this.destination = {}; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  createBuffer() { return {}; }
  createBufferSource() { return { connect() {}, start() {} }; }
}
global.AudioContext = MockAudioContext;
global.localStorage = { _s: {}, getItem(k) { return this._s[k] || null; }, setItem(k, v) { this._s[k] = String(v); }, removeItem(k) { delete this._s[k]; } };
global.FiezelI18n = { getCourse: () => 'en', getLocale: () => 'id', t: (k) => k };

const log = { say: [], sayPrefetch: [], puter: [], puterPrefetch: [], stops: 0 };
let sayResult = true;
let puterFails = {};
let sayDelay = 5;
global.FiezelVoiceSay = {
  say(text, opts) { log.say.push({ text, opts }); return tick(sayDelay).then(() => sayResult); },
  prefetch(text) { log.sayPrefetch.push(text); return Promise.resolve(true); },
  stop() { log.stops++; return true; }
};
global.FiezelPuterVoice = {
  speak(text, opts) {
    log.puter.push({ text, opts });
    if (puterFails[opts.engine]) return Promise.reject(new Error('engine_unsupported'));
    return tick(5).then(() => true);
  },
  prefetch(text, opts) { log.puterPrefetch.push({ text, opts }); return Promise.resolve(true); },
  stop() { log.stops++; }
};

const voice = require(path.join(root, 'features', 'interactive-chat', 'fiezel-chat-voice.js'));
global.FiezelChatVoice = voice;
const chat = require(path.join(root, 'features', 'interactive-chat', 'fiezel-interactive-chat.js'));
const call = require(path.join(root, 'features', 'interactive-chat', 'fiezel-voice-call.js'));

(async () => {
  console.log('--- 1. Pemotongan kalimat untuk latensi telepon ---');
  assert.deepStrictEqual(voice.splitSentences('Oh! That sounds fun. Which beach did you go to?', 'en'),
    ['Oh! That sounds fun.', 'Which beach did you go to?'], 'potongan pendek "Oh!" digabung ke kalimat berikutnya');
  assert.deepStrictEqual(voice.splitSentences('いいね！どこのビーチに行ったの？楽しかった？', 'ja'),
    ['いいね！どこのビーチに行ったの？', '楽しかった？']);
  assert.strictEqual(voice.cleanText('[今日](きょう)はいい[天気](てんき)ですね'), '今日はいい天気ですね', 'furigana dibuang');
  console.log('✓ kalimat dipotong dan potongan pendek digabung');

  console.log('--- 2. Inggris lewat FiezelVoiceSay, kalimat berikutnya dihangatkan ---');
  const okEn = await voice.speak('Nice to meet you, my friend. What do you like to do on weekends?', 'en');
  assert.strictEqual(okEn, true);
  assert.deepStrictEqual(log.say.map((x) => x.text), ['Nice to meet you, my friend.', 'What do you like to do on weekends?']);
  assert.ok(log.say.every((x) => x.opts && x.opts.suppressSubtitles === true), 'subtitle panggilan milik layar panggilan sendiri');
  assert.deepStrictEqual(log.sayPrefetch, ['What do you like to do on weekends?'], 'kalimat kedua dihangatkan selagi kalimat pertama berbunyi');
  console.log('✓ tangga resmi FiezelVoiceSay dipakai + prefetch');

  console.log('--- 3. Jepang lewat Puter Voice ja-JP, generative → neural ---');
  puterFails = { generative: true };
  const okJa = await voice.speak('こんにちは！元気ですか？今日は何をしましたか？', 'ja');
  assert.strictEqual(okJa, true);
  assert.ok(log.puter.every((x) => x.opts.lang === 'ja-JP'), 'bahasa Jepang dikirim sebagai ja-JP');
  assert.deepStrictEqual(log.puter.slice(0, 2).map((x) => x.opts.engine), ['generative', 'neural'], 'mesin generative yang menolak diganti neural');
  assert.ok(log.puter.slice(2).every((x) => x.opts.engine === 'neural'), 'mesin yang terbukti menjawab dipakai untuk kalimat berikutnya');
  puterFails = {};
  console.log('✓ Jepang memakai suara neural, bukan suara peramban');

  console.log('--- 4. Semua lapisan gagal = DIAM, bukan suara peramban ---');
  sayResult = false;
  const silent = await voice.speak('Hello there, how are you today?', 'en');
  assert.strictEqual(silent, false, 'lapisan habis dilaporkan sebagai diam');
  sayResult = true;
  console.log('✓ L5 diam tanpa cadangan peramban');

  console.log('--- 5. Barge-in memutus sisa balasan ---');
  log.say = [];
  sayDelay = 40;
  const p = voice.speak('First sentence is here. Second sentence follows. Third one ends it.', 'en');
  await tick(10);
  const stopsBefore = log.stops;
  voice.stop();
  const interrupted = await p;
  assert.strictEqual(interrupted, false, 'giliran yang diputus tidak dilaporkan selesai');
  assert.strictEqual(log.say.length, 1, 'kalimat sesudah interupsi tidak pernah dikirim');
  assert.ok(log.stops > stopsBefore, 'semua lapisan dibungkam');
  sayDelay = 5;
  console.log('✓ barge-in seketika');

  console.log('--- 6. Panggilan memakai pipeline neural ---');
  log.say = [];
  const engine = call.createEngine();
  const spoke = await engine.playSpeech('[Hello](heh-loh) friend! How was your day today?', 'en');
  assert.strictEqual(spoke, true);
  assert.ok(log.say.length >= 1 && !/\]\(/.test(log.say[0].text), 'panggilan berbicara lewat FiezelVoiceSay tanpa markup furigana');
  assert.strictEqual(typeof call.selectVoice, 'undefined', 'pemilih suara peramban sudah dihapus dari panggilan');
  console.log('✓ panggilan bersuara neural');

  console.log('--- 7. Chat: tombol Dengar + autoplay unlock ---');
  log.say = [];
  chat.getState().course = 'en';
  chat.playVoice('Nice to meet you, my friend. See you later!', 'msg-1');
  await tick(60);
  assert.ok(log.say.length >= 1, 'tombol Dengar memakai pipeline neural');
  assert.strictEqual(chat.getState().audioPlayingId, null, 'status putar dibersihkan sesudah selesai');
  assert.strictEqual(typeof chat.speakViaWebSpeech, 'undefined', 'jalur Web Speech sudah dihapus dari chat');
  const ctx = await chat.unlockAudioContext();
  assert.ok(ctx && ctx.state === 'running', 'AudioContext tetap dibuka saat sentuhan pertama');

  assert.strictEqual(synthTouched, 0, 'speechSynthesis tidak pernah disentuh oleh chat maupun panggilan');
  console.log('✓ nol sentuhan speechSynthesis');

  console.log('ALL CHAT NEURAL VOICE TESTS PASSED (7/7).');
})().catch((e) => { console.error(e); process.exit(1); });
