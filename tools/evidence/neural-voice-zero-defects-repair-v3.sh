#!/usr/bin/env bash
set -euo pipefail

V2="${1:?v2 repair script required}"
LISTENING_TEMPLATE="${2:?listening timeout test template required}"
WORK=/tmp/neural-voice-zero-defects-repair-v3-generated.sh
cp "$V2" "$WORK"
cp "$LISTENING_TEMPLATE" /tmp/listening-timeout-ownership-test.js

python - "$WORK" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
s=p.read_text()

def one(old,new,label):
    global s
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {n}')
    s=s.replace(old,new,1)

# Keep the legacy callsite gate literal intact: stop() must START with cancelVoicePrefetch().
one(
    'let playbackGeneration=0,activeDoorTimer=null;\\n const rateFor=options=>Number(options.speed??selectedNeuralRate())||1;',
    'let playbackGeneration=0,activeDoorTimer=null;\\n function invalidatePlaybackGeneration(){playbackGeneration++;if(activeDoorTimer){try{clearTimeout(activeDoorTimer)}catch{}activeDoorTimer=null}}\\n const rateFor=options=>Number(options.speed??selectedNeuralRate())||1;',
    'AudioService helper injection in repair script')
one(
    '"  stop(){playbackGeneration++;if(activeDoorTimer){try{clearTimeout(activeDoorTimer)}catch{}activeDoorTimer=null}cancelVoicePrefetch();self.FiezelVoiceSay?.stop?.();if(browserSupported)speechSynthesis.cancel()},"',
    '"  stop(){cancelVoicePrefetch();invalidatePlaybackGeneration();self.FiezelVoiceSay?.stop?.();if(browserSupported)speechSynthesis.cancel()},"',
    'AudioService stop source shape')

injection=r'''
# ---- RED proof 3 + repair: standalone/custom Listening timeout ownership -----------------
cp /tmp/listening-timeout-ownership-test.js listening-timeout-ownership-test.js
set +e
node listening-timeout-ownership-test.js > /tmp/listening-timeout-red.log 2>&1
listening_timeout_red=$?
set -e
cat /tmp/listening-timeout-red.log
test "$listening_timeout_red" -ne 0
grep -E "timeout failure stops|successful playback clears|immediate playback failure" /tmp/listening-timeout-red.log >/dev/null
echo "RED PROOF CONFIRMED: listening timeout does not own/stop its TTS before repair"

python - <<'PY_LISTENING'
from pathlib import Path
p=Path('features/speaking-listening/fiezel-speaking-listening-addon.js')
s=p.read_text()

def one(old,new,label):
    global s
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {n}')
    s=s.replace(old,new,1)

one(
    "        try{\n          const playing=this.tts.play(item.script,{voice:item.voice,rate:this.config.ttsRate,suppressSubtitles:true});",
    "        let playbackTimeout=null;\n        try{\n          const playing=this.tts.play(item.script,{voice:item.voice,rate:this.config.ttsRate,suppressSubtitles:true});",
    'listening timeout owner variable')
one(
    "          const result=await Promise.race([playing,new Promise((_,reject)=>setTimeout(()=>reject(new Error('tts_timeout')),TTS_TIMEOUT_MS))]);",
    "          const timeoutPromise=new Promise((_,reject)=>{playbackTimeout=setTimeout(()=>reject(new Error('tts_timeout')),TTS_TIMEOUT_MS)});\n          const result=await Promise.race([playing,timeoutPromise]);",
    'listening cancellable timeout')
one(
    "        }catch(_){\n          /* m026-BUG1 (cf-b4 §5.2, CF-MIGRATION §Ringkasan). Kegagalan pemutaran BUKAN",
    "        }catch(_){\n          // m025-213: timeout/failure owns cancellation; pending TTS may not revive later.\n          try{this.tts.stop()}catch{}\n          /* m026-BUG1 (cf-b4 §5.2, CF-MIGRATION §Ringkasan). Kegagalan pemutaran BUKAN",
    'listening stop on failure')
one(
    "        }finally{button.disabled=false}});",
    "        }finally{if(playbackTimeout&&typeof clearTimeout==='function')try{clearTimeout(playbackTimeout)}catch{}button.disabled=false}});",
    'listening timer cleanup')
p.write_text(s)
PY_LISTENING

python - <<'PY_QREG'
from pathlib import Path
p=Path('.github/workflows/quality.yml')
s=p.read_text()
needle='          node voice-fallback-chain-test.js\n'
if s.count(needle)!=1:
    raise SystemExit(f'quality listening-timeout registration anchor count={s.count(needle)}')
s=s.replace(needle,'          node listening-timeout-ownership-test.js\n'+needle,1)
p.write_text(s)
PY_QREG
'''
one(
    '# ---- GREEN behavioral / regression suite -----------------------------------------------',
    injection+'\n# ---- GREEN behavioral / regression suite -----------------------------------------------',
    'insert listening timeout repair')

turn_injection=r'''
# ---- RED proof 4 + repair: shared turn/subtitle ownership + local neural stop ------------
cat > voice-turn-ownership-test.js <<'JS_TURN'
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0, failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('PASS', name); passed += 1; }
  catch (err) { console.error('FAIL', name + ':', err && err.message || err); failed += 1; }
}

async function voiceFacadeChecks() {
  const modPath = path.join(__dirname, 'features/neural-voice/fiezel-voice-say.js');
  delete require.cache[require.resolve(modPath)];
  const begins = [];
  const pending = Object.create(null);
  let localStops = 0;
  global.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
  global.document = { dispatchEvent() {} };
  global.FiezelSubtitle = { create() { return { begin(line) { begins.push(line); }, end() {}, update() {} }; } };
  global.FiezelSubtitleTranslate = { translate(value) { return new Promise(resolve => { pending[value] = resolve; }); } };
  global.FiezelAudioResolver = { resolve() { return Promise.resolve(null); }, stop() {} };
  global.FiezelPuterVoice = null;
  global.FiezelVoiceRuntime = {
    status() { return { prepared: false, ready: false }; },
    speak() { return Promise.resolve(false); },
    stop() { localStops += 1; }
  };
  delete global.FiezelCfTtsTransport;
  delete global.speechSynthesis;
  delete global.SpeechSynthesisUtterance;

  const voice = require(modPath);
  voice.say('old');
  await Promise.resolve();
  voice.say('new');
  await Promise.resolve();
  pending.old('subtitle-lama');
  await Promise.resolve(); await Promise.resolve();
  assert(!begins.includes('subtitle-lama'), 'stale subtitle translation revived after newer say()');
  pending.new('subtitle-baru');
  await Promise.resolve(); await Promise.resolve();
  assert(begins.includes('subtitle-baru'), 'current subtitle translation was suppressed');
  voice.stop();
  assert.strictEqual(localStops, 1, 'local runtime stop was not forwarded exactly once');
}

function bridgeChecks() {
  let speechHandler = null;
  const reacts = [];
  let clock = 0;
  const doc = {
    addEventListener(type, fn) { if (type === 'fiezel-speech') speechHandler = fn; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    body: { classList: { contains() { return false; } } }
  };
  const context = {
    document: doc,
    console,
    performance: { now() { clock += 10; return clock; } },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    setTimeout() { return 1; },
    clearTimeout() {},
    addEventListener() {},
    FiezelPaw: {
      react(evt) { reacts.push(evt); return true; },
      setViseme() { return true; }
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'features/neural-voice/fiezel-speech-bridge.js'), 'utf8'), context);
  assert.strictEqual(typeof speechHandler, 'function', 'bridge did not attach fiezel-speech handler');
  const send = detail => speechHandler({ detail });
  const count = evt => reacts.filter(x => x === evt).length;

  send({ phase: 'progress', layer: 1, generation: 1, currentTime: 0.2, duration: 1 });
  assert.strictEqual(count('speak-start'), 1, 'first generation did not start');
  send({ phase: 'interrupt', layer: 0, generation: 2 });
  assert.strictEqual(count('speak-end'), 1, 'interrupt did not close first generation');
  send({ phase: 'progress', layer: 1, generation: 1, currentTime: 0.4, duration: 1 });
  assert.strictEqual(count('speak-start'), 1, 'stale progress reopened speech after interrupt');
  send({ phase: 'start', layer: 3, generation: 3, duration: 1 });
  assert.strictEqual(count('speak-start'), 2, 'new generation did not start');
  const endsBefore = count('speak-end');
  send({ phase: 'end', layer: 0, generation: 1 });
  assert.strictEqual(count('speak-end'), endsBefore, 'stale end closed the newer generation');
}

(async () => {
  await check('NV-08 stale subtitle translation is inert', voiceFacadeChecks);
  await check('NV-08 stale bridge events are inert', bridgeChecks);
  if (failed) { console.error(`RESULT ${passed} pass / ${failed} fail`); process.exit(1); }
  console.log(`RESULT ${passed} pass / 0 fail`);
})().catch(err => { console.error(err); process.exit(1); });
JS_TURN

set +e
node voice-turn-ownership-test.js > /tmp/voice-turn-red.log 2>&1
voice_turn_red=$?
set -e
cat /tmp/voice-turn-red.log
test "$voice_turn_red" -ne 0
grep -E "stale subtitle translation|local runtime stop|stale progress|stale end" /tmp/voice-turn-red.log >/dev/null
echo "RED PROOF CONFIRMED: shared turn ownership/local stop defects exist before repair"

python - <<'PY_TURN'
from pathlib import Path

def patch(path, edits, many_edits=()):
    p=Path(path); s=p.read_text()
    for old,new,label in edits:
        n=s.count(old)
        if n != 1: raise SystemExit(f'{path} {label}: expected 1 match, got {n}')
        s=s.replace(old,new,1)
    for old,new,count,label in many_edits:
        n=s.count(old)
        if n != count: raise SystemExit(f'{path} {label}: expected {count} matches, got {n}')
        s=s.replace(old,new)
    p.write_text(s)

patch('features/neural-voice/fiezel-voice-say.js', [
    ("  var browserBreakerUntil = 0;\n", "  var browserBreakerUntil = 0;\n  // m025-213: identity monotonik untuk semua efek async satu giliran shared voice.\n  var turnGeneration = 0;\n", 'turn generation state'),
    ("  function prepareSubtitle(english, indonesian) {", "  function prepareSubtitle(english, indonesian, generation) {", 'subtitle generation parameter'),
    ("    if (ready) { band_.begin(ready); return Promise.resolve(ready); }", "    if (ready) { if (generation === turnGeneration) band_.begin(ready); return Promise.resolve(ready); }", 'ready subtitle ownership'),
    ("      if (line) band_.begin(line);", "      if (line && generation === turnGeneration) band_.begin(line);", 'async subtitle ownership'),
    ("  function emitSpeech(phase, layer, extra) {\n    try {\n      var d = { phase: phase, layer: layer };", "  function emitSpeech(phase, layer, extra, generation) {\n    try {\n      var d = { phase: phase, layer: layer };\n      if (generation) d.generation = generation;", 'speech generation field'),
    ("  function reportTurn(spoke) { emitSpeech(spoke === true ? 'end' : 'silent', spoke === true ? 0 : 5); return spoke; }", "  function reportTurn(generation) { return function (spoke) { emitSpeech(spoke === true ? 'end' : 'silent', spoke === true ? 0 : 5, null, generation); return spoke; }; }", 'turn completion closure'),
    ("  function say(input, options) {\n    var opts = options || {};", "  function say(input, options) {\n    var sourceOpts = options || {};\n    var opts = {};\n    for (var optKey in sourceOpts) { if (Object.prototype.hasOwnProperty.call(sourceOpts, optKey)) opts[optKey] = sourceOpts[optKey]; }\n    var generation = ++turnGeneration;\n    opts._turnGeneration = generation;", 'say generation capture'),
    ("      prepareSubtitle(english, indonesian);", "      prepareSubtitle(english, indonesian, generation);", 'subtitle generation capture'),
    ("    if (!cfEnabled()) return speakFromAssets(english, opts, band_).then(reportTurn, function (e) { reportTurn(false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang\n    return cfCachedFirst(english, opts, band_).then(reportTurn, function (e) { reportTurn(false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang", "    var finishTurn = reportTurn(generation);\n    if (!cfEnabled()) return speakFromAssets(english, opts, band_).then(finishTurn, function (e) { finishTurn(false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang\n    return cfCachedFirst(english, opts, band_).then(finishTurn, function (e) { finishTurn(false); throw e; }); // FASE 11: pengamat resolusi, bukan cabang", 'turn completion binding'),
    ("  function stop() {\n    emitSpeech('interrupt', 0);", "  function stop() {\n    turnGeneration += 1;\n    emitSpeech('interrupt', 0, null, turnGeneration);", 'stop invalidates generation'),
    ("    var voice = engine();\n    if (voice && typeof voice.stop === 'function') { try { voice.stop(); } catch (_) {} }", "    var voice = engine();\n    if (voice && typeof voice.stop === 'function') { try { voice.stop(); } catch (_) {} }\n    // NV-09: stop facade must terminate an already-running local L3 runtime, without preparing it.\n    var local = root.FiezelVoiceRuntime;\n    if (local && typeof local.stop === 'function') { try { local.stop(); } catch (_) {} }", 'local runtime stop forwarding')
], [
    ("emitSpeech('progress', 1, { currentTime: currentTime, duration: duration });", "emitSpeech('progress', 1, { currentTime: currentTime, duration: duration }, opts._turnGeneration);", 2, 'L1 progress generation'),
    ("emitSpeech('progress', 2, { currentTime: currentTime, duration: duration });", "emitSpeech('progress', 2, { currentTime: currentTime, duration: duration }, opts._turnGeneration);", 1, 'L2 progress generation'),
    ("emitSpeech('start', 3, { duration: english.length / (14.5 * (Number(opts.speed) > 0 ? Number(opts.speed) : 1)) });", "emitSpeech('start', 3, { duration: english.length / (14.5 * (Number(opts.speed) > 0 ? Number(opts.speed) : 1)) }, opts._turnGeneration);", 1, 'L3 start generation'),
    ("emitSpeech('start', 4);", "emitSpeech('start', 4, null, opts._turnGeneration);", 1, 'L4 start generation')
])

patch('features/neural-voice/fiezel-speech-bridge.js', [
    ("  var raf = 0;\n", "  var raf = 0;\n  // m025-213 / NV-08: bridge hanya menerima efek dari generasi turn terbaru.\n  var activeGeneration = 0;\n", 'bridge generation state'),
    ("  /* ---------- terjemahan kabel R-2a → kosakata react() ---------- */\n  function onSpeech(ev) {\n    var d = (ev && ev.detail) || {};", "  /* ---------- terjemahan kabel R-2a → kosakata react() ---------- */\n  function claimGeneration(value) {\n    var generation = Number(value) || 0;\n    if (!generation) return true; // kompatibilitas event legacy tanpa identity\n    if (generation < activeGeneration) return false;\n    if (generation > activeGeneration) {\n      activeGeneration = generation;\n      degradedLatch = false;\n      if (turn) closeTurn(true);\n    }\n    return true;\n  }\n\n  function onSpeech(ev) {\n    var d = (ev && ev.detail) || {};\n    if (!claimGeneration(d.generation)) return;", 'bridge generation guard')
])
PY_TURN

python - <<'PY_QTURN'
from pathlib import Path
p=Path('.github/workflows/quality.yml')
s=p.read_text()
needle='          node voice-audio-race-test.js\n'
if s.count(needle)!=1:
    raise SystemExit(f'quality turn ownership anchor count={s.count(needle)}')
s=s.replace(needle,needle+'          node voice-turn-ownership-test.js\n',1)
p.write_text(s)
PY_QTURN

node --check features/neural-voice/fiezel-voice-say.js
node --check features/neural-voice/fiezel-speech-bridge.js
node voice-turn-ownership-test.js
'''
one(
    '# ---- GREEN behavioral / regression suite -----------------------------------------------',
    turn_injection+'\n# ---- GREEN behavioral / regression suite -----------------------------------------------',
    'insert NV-08/NV-09 turn ownership repair')

one(
    'node tutor-voice-chat-race-test.js\nnode listening-subtitle-suppression-test.js',
    'node tutor-voice-chat-race-test.js\nnode listening-timeout-ownership-test.js\nnode voice-turn-ownership-test.js\nnode listening-subtitle-suppression-test.js',
    'run listening/turn ownership regressions')

one(
    'voice-audio-race-test.js features/tutor-classroom/fiezel-tutor-voice-chat.js',
    'voice-audio-race-test.js listening-timeout-ownership-test.js features/speaking-listening/fiezel-speaking-listening-addon.js features/tutor-classroom/fiezel-tutor-voice-chat.js',
    'stage listening timeout repair')

# Do not commit workflow changes from inside Actions: GITHUB_TOKEN cannot push workflow-file mutations.
# The working-tree quality.yml still registers every new gate so the 604-check harness exercises them.
one(
    'tutor-voice-chat-race-test.js .github/workflows/quality.yml sw.js',
    'tutor-voice-chat-race-test.js features/neural-voice/fiezel-voice-say.js features/neural-voice/fiezel-speech-bridge.js voice-turn-ownership-test.js sw.js',
    'stage NV-08/NV-09 without workflow mutation')

handoff_patch=r'''
python - <<'PY_HANDOFF'
from pathlib import Path
p=Path('FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md')
s=p.read_text()
needle='## Red/green evidence\n'
extra=(
'5. **Listening timeout ownership.** The 25-second Controller timeout could mark an item `no_audio` without stopping a still-pending standalone/custom TTS source, and successful playback left the timeout alive until expiry. The failure path now stops its TTS owner and every settled path clears the timer.\n\n'
'6. **NV-08 shared turn/subtitle ownership.** Every `say()` now owns a monotonic generation. Late subtitle translations and stale `fiezel-speech` progress/start/end/silent events are inert after `stop()` or a newer turn.\n\n'
'7. **NV-09 local neural stop forwarding.** `FiezelVoiceSay.stop()` now forwards directly to an already-loaded `FiezelVoiceRuntime.stop()` without invoking prepare/ensureReady, so L3 WebAudio cannot continue after Stop/Keluar.\n\n'
)
if s.count(needle)!=1:
    raise SystemExit('handoff evidence anchor missing')
s=s.replace(needle,extra+needle,1)
p.write_text(s)
PY_HANDOFF
'''
one(
    'EOF\n\ngit config user.name "FIEZEL-APPS"',
    'EOF\n'+handoff_patch+'\ngit config user.name "FIEZEL-APPS"',
    'extend release handoff')

p.write_text(s)
PY

bash "$WORK" /tmp/voice-audio-race-test.js /tmp/tutor-voice-chat-race-test.js
