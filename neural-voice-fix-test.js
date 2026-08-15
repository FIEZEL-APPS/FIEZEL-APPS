// Gate untuk perbaikan neural voice (rekonstruksi dari
// fiezel-neural-voice-unified-final.patch yang rusak).
//
// Menguji empat hal yang tidak bisa diuji di device:
//   1. AudioContext singleton per env
//   2. lastFallbackReason terdeklarasi dan muncul di status()
//   3. metadata provider eksplisit di kedua jalur fallback
//   4. fallback browser menolak, bukan resolve diam-diam, saat gagal
// Plus gate anti-regresi terhadap cacat patch aslinya.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failures = 0;
function check(label, condition, detail) {
  if (condition) { console.log('  ok   ' + label); return; }
  failures++;
  console.log('  FAIL ' + label + (detail ? ' — ' + detail : ''));
}

const read = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');
const PLAYER = 'features/neural-voice/fiezel-web-audio-player.js';
const VOICE = 'features/neural-voice/fiezel-neural-voice.js';
const BOOTSTRAP = 'features/neural-voice/fiezel-neural-voice-bootstrap.js';
const AUDIBILITY = 'features/neural-voice/fiezel-neural-voice-audibility-fix.js';

function loadModule(rel, extraGlobals) {
  const sandbox = Object.assign({ module: { exports: {} }, console, setTimeout, clearTimeout, Promise }, extraGlobals || {});
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read(rel), sandbox);
  return { sandbox, api: sandbox.module.exports };
}

// --- AudioContext tiruan yang menghitung instansiasi -------------------------
function makeAudioEnv() {
  const env = { created: 0, closed: 0 };
  env.AudioContext = function () {
    env.created++;
    this.state = 'suspended';
    this.close = () => { env.closed++; this.state = 'closed'; return Promise.resolve(); };
    this.resume = () => { this.state = 'running'; return Promise.resolve(); };
    this.createBuffer = () => ({ copyToChannel() {} });
    this.createBufferSource = () => ({ connect() {}, start() {}, stop() {}, onended: null });
    this.destination = {};
  };
  return env;
}

function makeSpeechEnv(behaviour) {
  const env = {
    spoken: [],
    SpeechSynthesisUtterance: function (text) { this.text = text; },
    speechSynthesis: {
      cancel() {},
      speak(u) {
        env.spoken.push(u.text);
        behaviour(u);
      }
    }
  };
  return env;
}

const tick = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('neural-voice-fix-test');

  console.log('\n1 — AudioContext singleton per env');
  {
    const { api } = loadModule(PLAYER);
    const env = makeAudioEnv();
    const a = api.createPlayer(env);
    const b = api.createPlayer(env);
    const c = api.createPlayer(env);
    a.warm(); b.warm(); c.warm();
    check('tiga createPlayer + tiga warm hanya membuat 1 AudioContext',
      env.created === 1, 'created=' + env.created);
    check('konteks tersimpan di env untuk dibagi', !!env.__fiezelWebAudioContext);

    await a.play({ audio: Float32Array.from([0, 0.1, 0]), sampling_rate: 24000 });
    await b.play({ audio: Float32Array.from([0, 0.1, 0]), sampling_rate: 24000 });
    check('play() dari dua player tetap 1 AudioContext',
      env.created === 1, 'created=' + env.created);

    const env2 = makeAudioEnv();
    api.createPlayer(env2).warm();
    check('env berbeda tetap dapat konteksnya sendiri', env2.created === 1);

    const bare = api.createPlayer({});
    check('env tanpa AudioContext tidak meledak saat warm', bare.warm() === false);
  }

  console.log('\n2 — lastFallbackReason terdeklarasi (regresi patch asli)');
  {
    const src = read(BOOTSTRAP);
    const voiceSrc = read(VOICE);
    check('ada deklarasi let/var/const untuk lastFallbackReason',
      /(?:let|var|const)[^;\n]*\blastFallbackReason\b/.test(src));
    check('lastFallbackReason dipakai di status()',
      /initializeTimeoutMs:INITIALIZE_TIMEOUT_MS,lastFallbackReason,wasmPolicy/.test(src));
    check('lastFallbackReason ditulis di jalur catch neural()',
      /lastError=errorText\(error\);lastFallbackReason=lastError/.test(src));
    check('generation timeout eksplisit dan diarahkan ke catch neural()',
      voiceSrc.includes("new Error('neural_generation_timeout')") &&
      voiceSrc.includes("phase: 'generate_timeout'") &&
      /catch\(error\)\{\s*lastError=errorText\(error\);lastFallbackReason=lastError;/.test(src));

    // Simulasi semantik strict-mode: variabel yang dipakai tapi tak dideklarasikan
    // melempar ReferenceError. Ini yang membuat patch asli mematikan suara.
    // Dijalankan di realm ini, bukan lewat vm — global proxy vm menelan
    // pembacaan properti yang tidak ada, jadi tidak merepresentasikan browser.
    let threw = false;
    try {
      (function () { 'use strict'; return { a: 1, b: undeclaredOnPurposeXYZ }; })();
    } catch (error) { threw = error instanceof ReferenceError; }
    check('kontrol: variabel tak dideklarasikan memang ReferenceError di strict mode', threw);
  }

  console.log('\n3 — metadata provider eksplisit di jalur fallback');
  {
    const { api } = loadModule(VOICE);
    const env = makeSpeechEnv(u => setTimeout(() => u.onend && u.onend(), 5));
    const config = { fallback: { browserSpeechSynthesis: true }, voices: { fiezelPrimary: 'af_heart' } };

    const noAdapter = api.createVoiceService({ config, adapter: null, env });
    const r1 = await noAdapter.speak('halo');
    check('tanpa adapter → provider browser-speech-synthesis', r1.provider === 'browser-speech-synthesis', JSON.stringify(r1));
    check('tanpa adapter → chunks & outputs terisi', r1.chunks === 1 && Array.isArray(r1.outputs));
    check('tanpa adapter → voice ikut dilaporkan', r1.voice === 'af_heart', String(r1.voice));
    check('tanpa adapter → started ikut terbawa', r1.started === true);

    const badAdapter = { kind: 'neural-local', generate: () => Promise.reject(new Error('adapter meledak')) };
    const withAdapter = api.createVoiceService({ config, adapter: badAdapter, env });
    const r2 = await withAdapter.speak('halo lagi', { allowFallback: true });
    check('adapter gagal → jatuh ke browser dengan provider eksplisit',
      r2.provider === 'browser-speech-synthesis', JSON.stringify(r2));
    check('adapter gagal → chunks dilaporkan dari pemecahan asli', typeof r2.chunks === 'number');

    const okAdapter = { kind: 'neural-local', generate: () => Promise.resolve({ audio: Float32Array.from([0]), sampling_rate: 24000 }) };
    const good = api.createVoiceService({ config, adapter: okAdapter, env, playAudio: () => ({ done: Promise.resolve(), stop() {} }) });
    const r3 = await good.speak('sukses');
    check('jalur neural sukses tetap melapor neural-local', r3.provider === 'neural-local', String(r3.provider));
  }

  console.log('\n4 — fallback browser melapor gagal, bukan resolve diam-diam');
  {
    const { api } = loadModule(VOICE);
    const config = { fallback: { browserSpeechSynthesis: true }, voices: { fiezelPrimary: 'af_heart' } };

    const errEnv = makeSpeechEnv(u => setTimeout(() => u.onerror && u.onerror({ error: 'not-allowed' }), 5));
    const svc = api.createVoiceService({ config, adapter: null, env: errEnv });
    let rejected = null;
    await svc.speak('gagal').then(() => {}, e => { rejected = e; });
    // Error dibuat di dalam sandbox vm, jadi realm-nya berbeda dan `instanceof
    // Error` di realm ini selalu false. Pakai tag objek.
    const isError = (v) => Object.prototype.toString.call(v) === '[object Error]';
    check('onerror → promise ditolak, bukan resolve', isError(rejected), String(rejected));
    check('alasan penolakan bisa dibaca', rejected && /browser_tts_not-allowed/.test(rejected.message), rejected && rejected.message);

    // Kontrol perilaku lama: dulu onerror memanggil resolve, jadi ucapan yang
    // tidak pernah berbunyi tetap dianggap sukses.
    const src = read(VOICE);
    check('tidak ada lagi onerror yang resolve diam-diam',
      !/u\.onerror\s*=\s*\(\)\s*=>\s*finish\(\)/.test(src));
    check('semua jalur terminal lewat settle() bersama', /const settle\s*=/.test(src));
  }

  console.log('\n5 — gate anti-regresi terhadap cacat patch asli');
  {
    for (const rel of [PLAYER, VOICE, BOOTSTRAP, AUDIBILITY]) {
      const src = read(rel);
      check('tidak ada blok rusak "}){" di ' + path.basename(rel), !/^\s*\}\)\{/m.test(src));
    }
    const audibility = read(AUDIBILITY);
    check('browserSpeakImmediate hanya didefinisikan sekali',
      (audibility.match(/function browserSpeakImmediate/g) || []).length === 1);
    check('speak di audibility-fix hanya didefinisikan sekali',
      (audibility.match(/async function speak\(/g) || []).length === 1);
    const bootstrap = read(BOOTSTRAP);
    check('speak di bootstrap hanya didefinisikan sekali',
      (bootstrap.match(/async function speak\(/g) || []).length === 1);
    check('version.js tidak ikut diubah oleh perbaikan ini',
      read('version.js').indexOf("'5.19.0'") !== -1);
  }

  console.log('\n6 — T-023 lifecycle release/close (ADDITIVE)');
  {
    const playerSrc = read(PLAYER);
    check('player mengekspos close() di API publik',
      /Object\.freeze\(\{ play, stop, warm, close \}\)/.test(playerSrc));
    check('close() menutup konteks bersama via env.__fiezelWebAudioContext',
      /env\.__fiezelWebAudioContext\s*=\s*null/.test(playerSrc));

    const { api } = loadModule(PLAYER);
    const env = makeAudioEnv();
    const p1 = api.createPlayer(env);
    p1.warm();
    check('sebelum close: 1 konteks dibuat', env.created === 1);
    p1.close();
    check('close() menutup konteks bersama', env.closed === 1, 'closed=' + env.closed);
    check('close() menghapus referensi konteks dari env', !env.__fiezelWebAudioContext);
    const p2 = api.createPlayer(env);
    p2.warm();
    check('setelah close: warm() membuat konteks baru (re-init on demand)',
      env.created === 2, 'created=' + env.created);
    check('player baru tetap bisa stop() setelah close', typeof p2.stop === 'function');

    const bootstrap = read(BOOTSTRAP);
    check('bootstrap mengekspos release() di FiezelVoiceRuntime',
      /speak,stop,release,verifyCachedAssets/.test(bootstrap));
    check('release() memanggil stop service + cancel browser TTS',
      /function release\(\)\{[\s\S]*?service\?\.stop\?\.\(\)[\s\S]*?speechSynthesis\?\.cancel\?\.\(\)/.test(bootstrap));
    check('release() menutup player via FiezelWebAudioPlayer.createPlayer().close()',
      /FiezelWebAudioPlayer\?\.createPlayer\?\.\(root\)\?\.close\?\.\(\)/.test(bootstrap));
    check('release() melepas service/adapter/playerRef agar memori WASM bisa di-GC',
      /playerRef=null;service=null;adapter=null;/.test(bootstrap));
    check('release() mengembalikan status() dan mencatat diag released',
      /diag\(\{phase:'released'\}\);[\s\S]*?return status\(\);/.test(bootstrap));

    const appSrc = read('app.js');
    check('app.js lifecycle handler memanggil FiezelVoiceRuntime.release saat hidden',
      /visibilityState==='hidden'[\s\S]*?FiezelVoiceRuntime\.release\(\)/.test(appSrc));
  }

  console.log('');
  if (failures) { console.log(failures + ' gate GAGAL'); process.exit(1); }
  console.log('semua gate neural-voice-fix LOLOS');
}

main().catch(error => { console.error(error); process.exit(1); });
