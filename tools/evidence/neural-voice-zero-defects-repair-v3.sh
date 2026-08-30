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

one(
    'node tutor-voice-chat-race-test.js\nnode listening-subtitle-suppression-test.js',
    'node tutor-voice-chat-race-test.js\nnode listening-timeout-ownership-test.js\nnode listening-subtitle-suppression-test.js',
    'run listening timeout regression')

one(
    'voice-audio-race-test.js features/tutor-classroom/fiezel-tutor-voice-chat.js',
    'voice-audio-race-test.js listening-timeout-ownership-test.js features/speaking-listening/fiezel-speaking-listening-addon.js features/tutor-classroom/fiezel-tutor-voice-chat.js',
    'stage listening timeout repair')

handoff_patch=r'''
python - <<'PY_HANDOFF'
from pathlib import Path
p=Path('FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md')
s=p.read_text()
needle='## Red/green evidence\n'
extra='5. **Listening timeout ownership.** The 25-second Controller timeout could mark an item `no_audio` without stopping a still-pending standalone/custom TTS source, and successful playback left the timeout alive until expiry. The failure path now stops its TTS owner and every settled path clears the timer.\n\n'
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
