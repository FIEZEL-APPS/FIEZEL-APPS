#!/usr/bin/env bash
set -euo pipefail

AUDIO_RACE_TEMPLATE="${1:?audio-race template path required}"
TUTOR_RACE_TEMPLATE="${2:?tutor-race template path required}"
TARGET=fix/neural-voice-multichunk-prefetch
EXPECTED=f2e70145bdf98d33548e2b85cbfa4db0b9d724ca

git fetch origin main "$TARGET" fix/neural-voice-continuous-playback --no-tags
git checkout -B repair "origin/$TARGET"
test "$(git rev-parse HEAD)" = "$EXPECTED"

# ---- RED proof 1: AudioService stale completion ----------------------------------------
git show origin/fix/neural-voice-continuous-playback:listening-subtitle-suppression-test.js > listening-subtitle-suppression-test.js
set +e
node listening-subtitle-suppression-test.js > /tmp/stale-red.log 2>&1
stale_red=$?
set -e
cat /tmp/stale-red.log
test "$stale_red" -ne 0
grep -F "completion dari play LAMA sesudah interrupt DIABAIKAN" /tmp/stale-red.log
echo "RED PROOF CONFIRMED: AudioService stale completion is live before repair"

# ---- RED proof 2: tutor pending answer ownership + core-AI spoken language --------------
cp "$TUTOR_RACE_TEMPLATE" tutor-voice-chat-race-test.js
set +e
node tutor-voice-chat-race-test.js > /tmp/tutor-red.log 2>&1
tutor_red=$?
set -e
cat /tmp/tutor-red.log
test "$tutor_red" -ne 0
grep -E "question generation token|spoken-English output|core-AI answer is actually sent|stale timeout/local fallback" /tmp/tutor-red.log >/dev/null
echo "RED PROOF CONFIRMED: tutor async ownership / core-AI voice contract is defective before repair"

# ---- Repair AudioService ---------------------------------------------------------------
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

# Keep stop() on one source line because voice-callsite-prefetch-test extracts this method by
# line shape. The old contract call cancelVoicePrefetch() remains intact and visible.
one(
    "  stop(){cancelVoicePrefetch();self.FiezelVoiceSay?.stop?.();if(browserSupported)speechSynthesis.cancel()},",
    "  stop(){playbackGeneration++;if(activeDoorTimer){try{clearTimeout(activeDoorTimer)}catch{}activeDoorTimer=null}cancelVoicePrefetch();self.FiezelVoiceSay?.stop?.();if(browserSupported)speechSynthesis.cancel()},",
    'AudioService stop')
one(
    "   this.stop();\n   /* m025-198",
    "   this.stop();\n   const generation=playbackGeneration;\n   /* m025-198",
    'AudioService generation capture')
one(
    "   const timeoutPromise=typeof setTimeout==='function'?new Promise(r=>setTimeout(()=>r(false),9000)):new Promise(()=>{});\n",
    "   let doorTimer=null;\n",
    'AudioService old timeout')

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
    if(activeDoorTimer===doorTimer)activeDoorTimer=null;
    if(doorTimer&&typeof clearTimeout==='function')try{clearTimeout(doorTimer)}catch{}
    if(generation!==playbackGeneration)return null;
    // Timeout winner gives up ownership of the neural door BEFORE browser fallback starts.
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

# ---- Repair tutor voice chat ownership and m025-95 English spoken-output contract -------
python - <<'PY'
from pathlib import Path
p=Path('features/tutor-classroom/fiezel-tutor-voice-chat.js')
s=p.read_text()

def one(old,new,label):
    global s
    n=s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {n}')
    s=s.replace(old,new,1)

one(
    "  var listening = false;\n  var busy = false;\n  var recognition = null;",
    "  var listening = false;\n  var busy = false;\n  var recognition = null;\n  // m025-213: async jawaban punya pemilik generasi, sama seperti pintu audio utama.\n  // Completion lama setelah cancel/pindah Classroom tidak boleh menulis UI atau bicara.\n  var questionGeneration = 0;\n  var answerActive = false;",
    'tutor generation state')

one(
    "  function stopSpeaking() {\n    try { root.FiezelVoiceSay && root.FiezelVoiceSay.stop && root.FiezelVoiceSay.stop(); } catch (_) {}\n  }",
    "  function stopSpeaking() {\n    try { root.FiezelVoiceSay && root.FiezelVoiceSay.stop && root.FiezelVoiceSay.stop(); } catch (_) {}\n  }\n\n  function cancelPendingAnswer(stopVoice) {\n    questionGeneration += 1;\n    var owned = answerActive || busy;\n    busy = false;\n    answerActive = false;\n    if (stopVoice && owned) stopSpeaking();\n    return owned;\n  }",
    'tutor cancel helper')

old_ai="""    var prompt = dialog.aiPrompt(question, lessonContext());
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, AI_TIMEOUT_MS); });
    var request = Promise.resolve()
      .then(function () { return root.askFiezelAI(prompt); })
      .then(function (text) { return String(text || '').trim() || null; })
      .catch(function () { return null; });
    return Promise.race([request, timeout]);"""
new_ai="""    var prompt = dialog.aiPrompt(question, lessonContext());
    var timer = null;
    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () { resolve(null); }, AI_TIMEOUT_MS);
    });
    var request = Promise.resolve()
      .then(function () { return root.askFiezelAI(prompt); })
      .then(function (text) { return String(text || '').trim() || null; })
      .catch(function () { return null; });
    return Promise.race([request, timeout]).then(function (value) {
      if (timer && typeof clearTimeout === 'function') { try { clearTimeout(timer); } catch (_) {} }
      return value;
    });"""
one(old_ai,new_ai,'tutor cancellable AI timeout')

one(
    "      if (aiText) return { id: aiText, en: '', intent: 'ai', source: 'core-ai' };",
    "      // m025-95: Core AI must feed the same English spoken door as every tutor answer.\n      // id stays empty so FiezelVoiceSay owns the Indonesian/Thai subtitle translation.\n      if (aiText) return { id: '', en: aiText, intent: 'ai', source: 'core-ai' };",
    'tutor core AI spoken field')

old_handle="""  function handleQuestion(question) {
    var text = String(question || '').trim();
    if (!text) { setHint(T('tutor.no-voice-captured')); return; }
    busy = true;
    setState('is-thinking');
    setHint(T('tutor.answering'));
    answer(text).then(function (reply) {
      busy = false;
      setState('');
      showAnswer(reply.id);
      setHint(reply.source === 'core-ai' ? T('tutor.answered-by-ai') : T('tutor.talk-hint'));
      return speak(reply);
    }).catch(function () {
      busy = false;
      setState('');
      setHint(T('tutor.ask-retry'));
    });
  }"""
new_handle="""  function handleQuestion(question) {
    var text = String(question || '').trim();
    if (!text) { setHint(T('tutor.no-voice-captured')); return Promise.resolve(false); }
    var generation = ++questionGeneration;
    busy = true;
    answerActive = true;
    setState('is-thinking');
    setHint(T('tutor.answering'));
    return answer(text).then(function (reply) {
      if (generation !== questionGeneration || !classroomActive()) return false;
      busy = false;
      setState('');
      showAnswer(reply.id || reply.en);
      setHint(reply.source === 'core-ai' ? T('tutor.answered-by-ai') : T('tutor.talk-hint'));
      return Promise.resolve(speak(reply)).then(function (spoke) {
        if (generation === questionGeneration) answerActive = false;
        return generation === questionGeneration ? spoke : false;
      });
    }).catch(function () {
      if (generation !== questionGeneration || !classroomActive()) return false;
      busy = false;
      answerActive = false;
      setState('');
      setHint(T('tutor.ask-retry'));
      return false;
    });
  }"""
one(old_handle,new_handle,'tutor handle ownership')

one(
    "    if (busy) { stopSpeaking(); busy = false; setState(''); setHint(T('tutor.talk-hint')); return; }",
    "    if (busy) { cancelPendingAnswer(true); setState(''); setHint(T('tutor.talk-hint')); return; }",
    'tutor busy cancel')

one(
    "    else { stopListening(); removeUi(); }",
    "    else { cancelPendingAnswer(true); stopListening(); removeUi(); }",
    'tutor leave cancel')

p.write_text(s)
PY

python - <<'PY'
from pathlib import Path
p=Path('features/tutor-classroom/fiezel-tutor-dialog.js')
s=p.read_text()
old="""      ctx.name ? ('Kamu adalah FIEZEL, asisten belajar berbahasa Indonesia milik ' + ctx.name + '.')
        : 'Kamu adalah FIEZEL, asisten belajar berbahasa Indonesia.',
      'Jawab pertanyaan APA PUN yang ditanyakan, termasuk yang tidak berhubungan dengan pelajaran bahasa Inggris.',"""
new="""      ctx.name ? ('You are FIEZEL, ' + ctx.name + "'s learning assistant.")
        : 'You are FIEZEL, a learning assistant.',
      'The learner may ask in Indonesian or Thai. Understand the question, but Answer in clear, natural English.',
      'Jawab pertanyaan APA PUN yang ditanyakan, termasuk yang tidak berhubungan dengan pelajaran bahasa Inggris.',"""
if s.count(old)!=1:
    raise SystemExit(f'tutor dialog prompt anchor count={s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s)
PY

# Copy behavioral gates into the product candidate and register them in the real CI.
cp "$AUDIO_RACE_TEMPLATE" voice-audio-race-test.js
cp "$TUTOR_RACE_TEMPLATE" tutor-voice-chat-race-test.js
python - <<'PY'
from pathlib import Path
p=Path('.github/workflows/quality.yml')
s=p.read_text()
for needle,extra in [
    ('          node listening-subtitle-suppression-test.js\n','          node voice-audio-race-test.js\n'),
    ('          node m02542-experience-test.js\n','          node tutor-voice-chat-race-test.js\n')
]:
    if s.count(needle)!=1:
        raise SystemExit(f'quality registration anchor count={s.count(needle)} for {needle!r}')
    s=s.replace(needle,needle+extra,1)
p.write_text(s)
PY

# ---- GREEN behavioral / regression suite -----------------------------------------------
node --check app.js
node --check features/neural-voice/fiezel-neural-voice.js
node --check features/tutor-classroom/fiezel-tutor-voice-chat.js
node --check features/tutor-classroom/fiezel-tutor-dialog.js
node voice-audio-race-test.js
node tutor-voice-chat-race-test.js
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
node tutor-classroom-regression-test.js
node m02542-experience-test.js

# ---- Release claim, handoff, guardians --------------------------------------------------
node tools/bump-build.mjs "voice continuity: multi-chunk prefetch + async playback ownership"
node tools/bump-build.mjs --check
BUILD="$(node -e "process.stdout.write(require('./coordination/BUILD-VERSION.json').version)")"
test "$BUILD" = "m025-213"

cat > FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md <<EOF
# FIEZEL ${BUILD} — Neural Voice Continuity Handoff

## Status

**READY FOR OWNER/MASTER REVIEW after CI.** This release closes every code defect reproduced in the audited voice-continuity path while preserving the m025-95 shared English-voice contract.

## Defects closed

1. **Multi-chunk prefetch rejection.** Long Library/Classroom narration asked for look-ahead, but the runtime returned false whenever the next utterance had more than one chunk. The runtime now warms only chunk 0 and keys it with the real \`position.total\`.
2. **AudioService stale completion and timeout ownership.** An interrupted old neural promise could later resolve false and start browser fallback after a newer utterance had taken ownership. Its 9-second timeout also remained alive after early success and could fall back without stopping the unresolved neural door. Playback generations and cancellable timer ownership now make old completions inert, while a current timeout stops the neural door before browser fallback.
3. **Tutor async ghost answers.** Press-to-talk cancellation and leaving Classroom stopped current audio but did not invalidate the pending AI/local answer promise. A late answer could repaint the subtitle and speak after cancellation. Tutor questions now carry their own generation ownership and stale completions are inert.
4. **Core-AI tutor answers were text-only under m025-95.** The Core AI prompt still requested Indonesian output, then \`aiAnswer()\` stored that output in \`id\` and left \`en\` empty. \`speak()\` correctly refuses an object without English, so open-domain AI replies could never be spoken. The prompt now requests natural English, Core AI fills \`en\`, and the existing shared voice door owns Indonesian/Thai subtitle translation.

## Red/green evidence

- Multi-chunk prefetch: defective runtime **33 pass / 4 fail**, repaired runtime **37 pass / 0 fail**.
- AudioService PR #280 red proof: **10/11** before repair, **11/11** after repair.
- \`voice-audio-race-test.js\` covers interrupt, explicit stop, current fallback, timeout cancellation, fast-success cleanup, stale timer ownership, and no double fallback.
- \`tutor-voice-chat-race-test.js\` covers stale question timeout, leaving Classroom, current local fallback, current Core-AI speech, and timeout cleanup.

## Preserved invariants

- No prefetch path triggers \`prepare()\`, \`ensureReady()\`, or a 152 MB model download.
- Prefetch remains bounded by the existing warm slot.
- Browser fallback still occurs for a **current** failed neural utterance; only obsolete generations are suppressed.
- Listening exam subtitles remain suppressed.
- Core-AI and local tutor answers use the single m025-95 English voice door. No Indonesian speech path is reintroduced.
- \`FiezelVoiceSay.say()\` completion semantics are unchanged.

## Release boundary

All build markers are written by \`tools/bump-build.mjs\`, never by hand. Runtime, service worker, page build, diagnostics marker, and \`coordination/BUILD-VERSION.json\` must all remain coherent at ${BUILD}.

## Remaining evidence boundary

T-026 physical iOS raw-vs-conditioned evidence remains a **device evidence task**. It is not a reproduced code defect and is not falsely closed by deterministic CI. The audited code path may reach zero verified code defects while physical device evidence remains separately pending.
EOF

git config user.name "FIEZEL-APPS"
git config user.email "fitrajft@gmail.com"
git add app.js features/neural-voice/fiezel-neural-voice.js voice-prefetch-neural-test.js listening-subtitle-suppression-test.js voice-audio-race-test.js features/tutor-classroom/fiezel-tutor-voice-chat.js features/tutor-classroom/fiezel-tutor-dialog.js tutor-voice-chat-race-test.js .github/workflows/quality.yml sw.js core-config.js features/neural-voice/fiezel-diag-panel.js coordination/BUILD-VERSION.json FIEZEL-M025213-NEURAL-VOICE-CONTINUITY-HANDOFF.md
git diff --cached --check
git commit -m "fix(voice): close async continuity races and silent tutor AI"

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

# Only a fully green candidate updates the product branch.
git push origin HEAD:"$TARGET"
