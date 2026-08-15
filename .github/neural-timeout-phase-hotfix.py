from pathlib import Path


def replace_once(path, old, new, label):
    p=Path(path)
    s=p.read_text()
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    p.write_text(s.replace(old,new,1))

# 1) Bootstrap: TTS timeout must begin only after initialization completes.
replace_once(
    'features/neural-voice/fiezel-neural-voice-bootstrap.js',
    "const NEURAL_TTS_TIMEOUT_MS=Number(root.FIEZEL_TTS_TIMEOUT_MS)||(root.navigator?.standalone===true?12000:20000);",
    "const NEURAL_TTS_TIMEOUT_MS=Number(root.FIEZEL_TTS_TIMEOUT_MS)||(root.navigator?.standalone===true?30000:20000);",
    'standalone tts timeout')

replace_once(
    'features/neural-voice/fiezel-neural-voice-bootstrap.js',
    """      phase='initializing';lastError='';
      const dynamicImport=typeof root.__fiezelDynamicImport==='function'?root.__fiezelDynamicImport:(url)=>import(url);""",
    """      phase='initializing';lastError='';
      const initStartedAt=Date.now();
      diag({phase:'init_start'});
      const dynamicImport=typeof root.__fiezelDynamicImport==='function'?root.__fiezelDynamicImport:(url)=>import(url);""",
    'init timing start')

replace_once(
    'features/neural-voice/fiezel-neural-voice-bootstrap.js',
    """      phase='ready';lastError='';initFailedThisSession=false;initTimedOutThisSession=false;diag({phase:'init_ready'});return service;""",
    """      phase='ready';lastError='';initFailedThisSession=false;initTimedOutThisSession=false;diag({phase:'init_ready',elapsedMs:Date.now()-initStartedAt});return service;""",
    'init timing ready')

old_speak="""    const timeout=Symbol('fiezel-tts-timeout');
    let neuralError=null;
    const neural=async()=>{
      const local=await initialize();
      return local.speak(text,{voice:options.voice||root.FiezelNeuralVoiceConfig.voices.fiezelPrimary,speed:options.speed||options.rate||1,lang:options.lang||'en-US',allowFallback:false});
    };
    const result=await Promise.race([neural().catch(error=>{lastError=errorText(error);lastFallbackReason=lastError;neuralError=error;return null}),delay(NEURAL_TTS_TIMEOUT_MS).then(()=>timeout)]);
    if(result===null||result===timeout){
      lastError=result===timeout?'neural_tts_timeout':lastError;
      const shouldOpenCircuit=!!service;
      lastFallbackReason=lastError;
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:shouldOpenCircuit});
      circuitOpen=shouldOpenCircuit;audibleVerified=false;if(circuitOpen)phase='error';
      try{service?.stop?.()}catch{}
      return fallbackOrThrow(neuralError||new Error(lastError));
    }
    circuitOpen=false;audibleVerified=true;lastError='';lastFallbackReason='';phase='ready';
    diag({phase:'speak_neural_success',provider:String(result?.provider||'neural'),voice:String(result?.voice||options.voice||'')});
    return result;"""
new_speak="""    let local;
    const speakInitStartedAt=Date.now();
    try{
      local=await initialize();
      diag({phase:'speak_init_ready',elapsedMs:Date.now()-speakInitStartedAt});
    }catch(error){
      lastError=errorText(error);lastFallbackReason=lastError;audibleVerified=false;
      diag({phase:'speak_init_error',error:lastError,elapsedMs:Date.now()-speakInitStartedAt});
      return fallbackOrThrow(error);
    }
    const timeout=Symbol('fiezel-tts-timeout');
    let neuralError=null;
    const voice=options.voice||root.FiezelNeuralVoiceConfig.voices.fiezelPrimary;
    const generationStartedAt=Date.now();
    diag({phase:'speak_generate_start',voice:String(voice),timeoutMs:NEURAL_TTS_TIMEOUT_MS});
    const neural=()=>local.speak(text,{voice,speed:options.speed||options.rate||1,lang:options.lang||'en-US',allowFallback:false});
    const result=await Promise.race([neural().catch(error=>{lastError=errorText(error);lastFallbackReason=lastError;neuralError=error;return null}),delay(NEURAL_TTS_TIMEOUT_MS).then(()=>timeout)]);
    if(result===null||result===timeout){
      lastError=result===timeout?'neural_tts_timeout':lastError;
      const shouldOpenCircuit=!!service;
      lastFallbackReason=lastError;
      diag({phase:'speak_fallback',reason:lastError,circuitOpen:shouldOpenCircuit,elapsedMs:Date.now()-generationStartedAt,voice:String(voice)});
      circuitOpen=shouldOpenCircuit;audibleVerified=false;if(circuitOpen)phase='error';
      try{service?.stop?.()}catch{}
      return fallbackOrThrow(neuralError||new Error(lastError));
    }
    circuitOpen=false;audibleVerified=true;lastError='';lastFallbackReason='';phase='ready';
    diag({phase:'speak_neural_success',provider:String(result?.provider||'neural'),voice:String(result?.voice||voice||''),elapsedMs:Date.now()-generationStartedAt});
    return result;"""
replace_once('features/neural-voice/fiezel-neural-voice-bootstrap.js',old_speak,new_speak,'split init and speech timeout')

# 2) Voice service: stage-level generate/playback timings for physical-device evidence.
replace_once(
    'features/neural-voice/fiezel-neural-voice.js',
    """    let generation = 0;
    let activeStop = null;

    function stop() {""",
    """    let generation = 0;
    let activeStop = null;
    function diag(entry) {
      try {
        const key = 'fiezel-neural-voice-diagnostics-v1';
        const list = JSON.parse(env.localStorage && env.localStorage.getItem(key) || '[]');
        list.push({ t: Date.now(), v: String(env.FIEZEL_VERSION || '5.19.0'), ...entry });
        env.localStorage && env.localStorage.setItem(key, JSON.stringify(list.slice(-200)));
      } catch (_) {}
    }

    function stop() {""",
    'voice service diag helper')

replace_once(
    'features/neural-voice/fiezel-neural-voice.js',
    """          const audio = await adapter.generate(chunk, { voice, speed: speakOptions.speed || 1 });
          if (callGeneration !== generation) throw new Error('TTS request superseded');
          outputs.push(audio);
          if (typeof playAudio === 'function') {
            const playback = await playAudio(audio, { signalGeneration: callGeneration });
            activeStop = playback && typeof playback.stop === 'function' ? playback.stop : null;
            if (playback && playback.done && typeof playback.done.then === 'function') await playback.done;
            activeStop = null;
            if (callGeneration !== generation) throw new Error('TTS request superseded');
          }""",
    """          const generateStartedAt = Date.now();
          diag({ phase: 'generate_start', voice, chars: chunk.length });
          const audio = await adapter.generate(chunk, { voice, speed: speakOptions.speed || 1 });
          const samples = audio && (audio.audio || audio.data);
          diag({ phase: 'generate_ready', voice, elapsedMs: Date.now() - generateStartedAt, samples: samples && typeof samples.length === 'number' ? samples.length : null });
          if (callGeneration !== generation) throw new Error('TTS request superseded');
          outputs.push(audio);
          if (typeof playAudio === 'function') {
            const playbackStartedAt = Date.now();
            diag({ phase: 'playback_start', voice });
            const playback = await playAudio(audio, { signalGeneration: callGeneration });
            activeStop = playback && typeof playback.stop === 'function' ? playback.stop : null;
            if (playback && playback.done && typeof playback.done.then === 'function') await playback.done;
            diag({ phase: 'playback_done', voice, elapsedMs: Date.now() - playbackStartedAt });
            activeStop = null;
            if (callGeneration !== generation) throw new Error('TTS request superseded');
          }""",
    'generate playback timing')

replace_once(
    'features/neural-voice/fiezel-neural-voice.js',
    """      } catch (error) {
        if (callGeneration !== generation) throw error;""",
    """      } catch (error) {
        diag({ phase: 'voice_service_error', voice, error: String(error && (error.message || error.name) || error) });
        if (callGeneration !== generation) throw error;""",
    'voice service error timing')

# 3) New visible build markers without changing app/cache version.
replace_once('features/neural-voice/fiezel-diag-panel.js',"var DIAG_BUILD = 'm023-1';","var DIAG_BUILD = 'm024-1';",'diag build')
replace_once('sw.js',"const SW_REV='m023-device-hotfix-20260815-1';","const SW_REV='m024-neural-timeout-phase-20260815-1';",'sw rev')
replace_once('sw-corp-test.js',"SW_REV='m023-device-hotfix-20260815-1'","SW_REV='m024-neural-timeout-phase-20260815-1'",'sw test rev')
replace_once('features/neural-voice/fiezel-diag-panel.js',"Diagnostics · m022-1","Diagnostics · m022-1",'noop impossible') if False else None
replace_once('neural-voice-device-hotfix-test.js',"var DIAG_BUILD = 'm023-1'","var DIAG_BUILD = 'm024-1'",'device test diag marker')

# Extend existing hotfix regression contract.
p=Path('neural-voice-device-hotfix-test.js')
s=p.read_text()
needle="assert.ok(boot.includes(\"apple-standalone-single-thread-proxy\"));\n"
insert="assert.ok(boot.includes(\"apple-standalone-single-thread-proxy\"));\nassert.ok(boot.includes(\"root.navigator?.standalone===true?30000:20000\"),'standalone neural generation timeout must allow slower device inference');\nassert.ok(boot.includes(\"phase:'speak_init_ready'\")&&boot.includes(\"phase:'speak_generate_start'\"),'init and speech timing must be diagnosed separately');\n"
if s.count(needle)!=1: raise SystemExit('device hotfix assertion insertion mismatch')
p.write_text(s.replace(needle,insert,1))

# Dedicated regression test for the exact m023 false-timeout class.
Path('neural-voice-timeout-phase-test.js').write_text(r'''const fs=require('fs');
const assert=require('assert');
const boot=fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js','utf8');
const voice=fs.readFileSync('features/neural-voice/fiezel-neural-voice.js','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const diag=fs.readFileSync('features/neural-voice/fiezel-diag-panel.js','utf8');
const start=boot.indexOf("const speakInitStartedAt=Date.now()");
const init=boot.indexOf("local=await initialize()",start);
const timer=boot.indexOf("const timeout=Symbol('fiezel-tts-timeout')",start);
const race=boot.indexOf('Promise.race([neural()',start);
assert.ok(start>=0&&init>start&&timer>init&&race>timer,'speech timeout must start only after initialize() resolves');
assert.ok(boot.includes("root.navigator?.standalone===true?30000:20000"));
assert.ok(boot.includes("phase:'speak_init_ready'")&&boot.includes("phase:'speak_generate_start'")&&boot.includes("elapsedMs:Date.now()-generationStartedAt"));
assert.ok(voice.includes("phase: 'generate_start'")&&voice.includes("phase: 'generate_ready'")&&voice.includes("phase: 'playback_start'")&&voice.includes("phase: 'playback_done'"));
assert.ok(sw.includes("SW_REV='m024-neural-timeout-phase-20260815-1'"));
assert.ok(diag.includes("var DIAG_BUILD = 'm024-1'"));
assert.ok(fs.readFileSync('version.js','utf8').includes("'5.19.0'"));
assert.equal(JSON.parse(fs.readFileSync('VERSION.json','utf8')).version,'5.19.0');
console.log('FIEZEL neural timeout phase hotfix: PASS');
''')
