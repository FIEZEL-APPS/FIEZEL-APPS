#!/usr/bin/env bash
set -euo pipefail

RACE_TEMPLATE="${1:?race-test template path required}"
TARGET=fix/neural-voice-multichunk-prefetch
EXPECTED=f2e70145bdf98d33548e2b85cbfa4db0b9d724ca

git fetch origin main "$TARGET" fix/neural-voice-continuous-playback --no-tags
git checkout -B repair "origin/$TARGET"
test "$(git rev-parse HEAD)" = "$EXPECTED"

# Absorb PR #280's behavioural proof first and require it to be RED on the defective door.
git show origin/fix/neural-voice-continuous-playback:listening-subtitle-suppression-test.js > listening-subtitle-suppression-test.js
set +e
node listening-subtitle-suppression-test.js > /tmp/stale-red.log 2>&1
red_code=$?
set -e
cat /tmp/stale-red.log
test "$red_code" -ne 0
grep -F "completion dari play LAMA sesudah interrupt DIABAIKAN" /tmp/stale-red.log
echo "RED PROOF CONFIRMED: stale completion reaches fallback on defective AudioService"

python - <<'PY'
from pathlib import Path
p=Path('app.js')
s=p.read_text()

def one(old,new,label):
    global s
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {n}')
    s=s.replace(old,new,1)

one(
    " let silenceNoticed=false;\n const rateFor=options=>Number(options.speed??selectedNeuralRate())||1;",
    " let silenceNoticed=false;\n // m025-213: satu generasi playback per giliran. Promise neural lama boleh selesai kapan saja,\n // tetapi setelah stop()/play() baru ia tidak lagi berhak memulai fallback atau toast.\n let playbackGeneration=0,activeDoorTimer=null;\n const rateFor=options=>Number(options.speed??selectedNeuralRate())||1;",
    'AudioService generation state')
one(
    "  stop(){cancelVoicePrefetch();self.FiezelVoiceSay?.stop?.();if(browserSupported)speechSynthesis.cancel()},",
    "  stop(){\n   playbackGeneration++;\n   if(activeDoorTimer){try{clearTimeout(activeDoorTimer)}catch{}activeDoorTimer=null}\n   cancelVoicePrefetch();self.FiezelVoiceSay?.stop?.();if(browserSupported)speechSynthesis.cancel()\n  },",
    'AudioService stop')
one(
    "   this.stop();\n   /* m025-198",
    "   this.stop();\n   const generation=playbackGeneration;\n   /* m025-198",
    'AudioService play generation capture')
one(
    "   const timeoutPromise=typeof setTimeout==='function'?new Promise(r=>setTimeout(()=>r(false),9000)):new Promise(()=>{});\n",
    "   let doorTimer=null;\n",
    'old uncancellable timeout')
old_via="""   const viaDoor=typeof say==='function'
    ?Promise.race([
      Promise.resolve().then(()=>say.call(self.FiezelVoiceSay,text,{speed:options.speed??selectedNeuralRate(),contentType:options.contentType,locale:options.locale,suppressSubtitles:noSubtitles})).catch(()=>false),
      timeoutPromise
    ])
    :Promise.resolve(false);"""
new_via="""   const doorPromise=typeof say==='function'
    ?Promise.resolve()
      .then(()=>say.call(self.FiezelVoiceSay,text,{speed:options.speed??selectedNeuralRate(),contentType:options.contentType,locale:options.locale,suppressSubtitles:noSubtitles}))
      .then(value=>({kind:'door',value}),()=>({kind:'door',value:false}))
    :Promise.resolve({kind:'door',value:false});
   const timeoutPromise=typeof say==='function'&&typeof setTimeout==='function'
    ?new Promise(resolve=>{
      doorTimer=setTimeout(()=>resolve({kind:'timeout',value:false}),9000);
      activeDoorTimer=doorTimer;
     })
    :new Promise(()=>{});
   const viaDoor=typeof say==='function'?Promise.race([doorPromise,timeoutPromise]):doorPromise;"""
one(old_via,new_via,'AudioService door race')
old_return="""   return viaDoor.then(result=>{
    if(result!==false&&result!==null&&result!==undefined)return result===true?{provider:'fiezel-voice-say'}:result;
    return Promise.resolve(browserPlay(text,options)).then(fallback=>{
     if(fallback)return fallback;
     noteSilence();
     return null;
    });
   });"""
new_return="""   return viaDoor.then(outcome=>{
    // Timer milik giliran ini dibersihkan, tetapi completion lama tidak pernah boleh
    // menghapus timer milik giliran baru yang sudah mengambil alih activeDoorTimer.
    if(activeDoorTimer===doorTimer)activeDoorTimer=null;
    if(doorTimer&&typeof clearTimeout==='function')try{clearTimeout(doorTimer)}catch{}
    if(generation!==playbackGeneration)return null;
    // Bila timeout yang menang, hentikan pintu neural SEBELUM browser fallback. Tanpa ini
    // neural yang terlambat bisa ikut berbunyi sesudah fallback dan menghasilkan dua suara.
    if(outcome?.kind==='timeout')try{self.FiezelVoiceSay?.stop?.()}catch{}
    const result=outcome?.value;
    if(result!==false&&result!==null&&result!==undefined)return result===true?{provider:'fiezel-voice-say'}:result;
    if(generation!==playbackGeneration)return null;
    return Promise.resolve(browserPlay(text,options)).then(fallback=>{
     if(generation!==playbackGeneration)return null;
     if(fallback)return fallback;
     noteSilence();
     return null;
    });
   });"""
one(old_return,new_return,'AudioService stale completion guard')
p.write_text(s)
PY

cp "$RACE_TEMPLATE" voice-audio-race-test.js
python - <<'PY'
from pathlib import Path
p=Path('.github/workflows/quality.yml')
s=p.read_text()
needle='          node listening-subtitle-suppression-test.js\n'
if s.count(needle)!=1:
    raise SystemExit(f'quality registration anchor count={s.count(needle)}')
s=s.replace(needle,needle+'          node voice-audio-race-test.js\n',1)
p.write_text(s)
PY

# Product/race proof before claiming a release number.
node --check app.js
node --check features/neural-voice/fiezel-neural-voice.js
node voice-audio-race-test.js
node listening-subtitle-suppression-test.js
node voice-chunker-test.js
node prosody-test.js
node voice-pipeline-gap-test.js
node voice-prefetch-neural-test.js
node voice-callsite-prefetch-test.js
node voice-fallback-chain-test.js
node voice-offline-fallback-test.js
node tts-provider-contract-test.js
node tts-transport-switch-test.js
node speaking-listening-test.js
node listening-exam-test.js
node speaking-exam-test.js

# The only permitted release-number path.
node tools/bump-build.mjs "neural voice multi-chunk prefetch + stale playback guard"
node tools/bump-build.mjs --check
BUILD="$(node -e "process.stdout.write(require('./coordination/BUILD-VERSION.json').version)")"
test "$BUILD" = "m025-213"

cat > FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md <<EOF
# FIEZEL ${BUILD} — Neural Voice Continuity Handoff

## Status

**READY FOR OWNER/MASTER REVIEW after CI.** This handoff closes two independently reproduced continuity defects without changing the public \`FiezelVoiceSay.say()\` completion contract.

## Defects closed

1. Multi-chunk prefetch was rejected whenever \`planChunks()\` returned more than one chunk. Library and other long narration therefore paid a cold first-chunk synthesis cost even though callers already requested look-ahead. The runtime now warms only chunk 0 and keys that warm result by the utterance's \`position.total\`.
2. \`AudioService.play()\` had no playback generation token. An interrupted neural promise could settle \`false\` after a newer utterance took ownership and start stale browser fallback. Its 9-second timeout was also uncancellable and could begin browser fallback without stopping the still-running neural door. The door now has generation ownership, a cancellable timeout, and timeout-before-fallback cancellation.

## Red/green evidence

- Multi-chunk prefetch: defective runtime **33 pass / 4 fail**; repaired runtime **37 pass / 0 fail**.
- Stale completion: PR #280 behavioural red proof fails on the pre-repair \`AudioService\`; the same proof passes after this repair.
- \`voice-audio-race-test.js\` additionally covers explicit stop, current-generation fallback, timeout cancellation, fast-success timer cleanup, stale timeout ownership, and no double fallback.

## Preserved invariants

- No \`prepare()\`, \`ensureReady()\`, or model download is introduced by prefetch.
- Prefetch concurrency remains bounded by the existing single warm slot.
- Listening subtitles remain suppressed while Reading/Vocabulary subtitles remain available.
- Fallback browser speech still runs for a **current** neural failure; only obsolete generations are suppressed.
- \`say()\` still resolves when its audio path completes; callers do not receive an early-completion semantic change.

## Release boundary

Build markers are changed only by \`tools/bump-build.mjs\`; no marker is hand-edited. Product runtime, service-worker generation, page build, diagnostics build, and \`coordination/BUILD-VERSION.json\` must remain coherent at ${BUILD}.

## Evidence limits / next

Automated deterministic Web Audio and provider regressions are mandatory and run in CI. Physical iOS raw-vs-conditioned T-026 evidence remains a separate **device evidence task**, not silently reclassified as a code defect or as proof supplied by this patch. OWNER/MASTER should keep that diagnostic task open until a physical device observation exists.
EOF

git config user.name "FIEZEL-APPS"
git config user.email "fitrajft@gmail.com"
git add app.js features/neural-voice/fiezel-neural-voice.js voice-prefetch-neural-test.js listening-subtitle-suppression-test.js voice-audio-race-test.js .github/workflows/quality.yml sw.js core-config.js features/neural-voice/fiezel-diag-panel.js coordination/BUILD-VERSION.json FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md
git diff --cached --check
git commit -m "fix(voice): close multi-chunk prefetch and stale playback races"

export BASE_SHA="$(git rev-parse origin/main)"
export PR_BODY="Handoff: FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md"
node tools/fiezel-guardians.mjs a9
node tools/fiezel-guardians.mjs a10
node tools/fiezel-guardians.mjs a11
node tools/fiezel-guardians.mjs a13
node secret-scan-test.js
node coordination-guard-test.js
node gate-registry-test.js
node build-number-uniqueness-test.js --strict
node pwa-release-coherence-test.js
node pwa-cache-test.js
node install-health-test.js
node no-network-test.js
python release-audit.py

# Only a fully green candidate is allowed to update the product branch.
git push origin HEAD:"$TARGET"
