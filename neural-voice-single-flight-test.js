'use strict';
const assert=require('assert');
const core=require('./features/neural-voice/fiezel-neural-voice.js');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function makeEnv(){
  const data={};
  return{
    FIEZEL_VERSION:'5.19.0',
    localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)}},
    _data:data
  };
}
function diagnostics(env){return JSON.parse(env._data['fiezel-neural-voice-diagnostics-v1']||'[]')}
function config(){return{voices:{fiezelPrimary:'af_heart'},limits:{maxInputChars:3600,targetChunkWords:140,hardChunkWords:190},fallback:{browserSpeechSynthesis:false}}}
function audio(){return{data:new Float32Array([0,.1]),sampling_rate:24000}}

(async()=>{
  {
    const env=makeEnv();
    let generateCalls=0;
    let releaseFirst;
    const firstGate=new Promise(resolve=>{releaseFirst=resolve});
    let playCalls=0;
    const adapter={kind:'neural-test',generate:async()=>{
      generateCalls++;
      if(generateCalls===1)await firstGate;
      return audio();
    }};
    const service=core.createVoiceService({
      config:config(),adapter,env,generationTimeoutMs:200,
      playAudio:async()=>{playCalls++;return{done:Promise.resolve(),stop(){}}}
    });
    assert.ok(diagnostics(env).some(x=>x.phase==='single_flight_ready'&&x.patch==='m026-single-flight-v1'),'m026 runtime marker must be exported');

    const first=service.speak('first request',{allowFallback:false})
      .then(()=>({kind:'resolved'})).catch(error=>({kind:'rejected',error}));
    await sleep(10);
    const second=await service.speak('second request',{allowFallback:false})
      .then(()=>({kind:'resolved'})).catch(error=>({kind:'rejected',error}));

    assert.equal(second.kind,'rejected','overlapping request must be rejected while inference is active');
    assert.match(String(second.error&&second.error.message||second.error),/neural_generation_busy/);
    assert.equal(generateCalls,1,'overlapping request must not call adapter.generate a second time');
    assert.ok(diagnostics(env).some(x=>x.phase==='generate_busy'),'busy request must be observable');

    releaseFirst();
    const firstOutcome=await first;
    assert.equal(firstOutcome.kind,'rejected','superseded first request must not play after the newer request');
    assert.match(String(firstOutcome.error&&firstOutcome.error.message||firstOutcome.error),/TTS request superseded/);
    assert.equal(playCalls,0,'superseded inference must not reach playback');
  }

  {
    const env=makeEnv();
    let generateCalls=0;
    const adapter={kind:'neural-test',generate:async()=>{
      generateCalls++;
      if(generateCalls===1)await sleep(55);
      return audio();
    }};
    const service=core.createVoiceService({
      config:config(),adapter,env,generationTimeoutMs:20,
      playAudio:async()=>({done:Promise.resolve(),stop(){}})
    });

    const first=await service.speak('slow request',{allowFallback:false})
      .then(()=>({kind:'resolved'})).catch(error=>({kind:'rejected',error}));
    assert.equal(first.kind,'rejected');
    assert.match(String(first.error&&first.error.message||first.error),/neural_generation_timeout/);
    assert.equal(generateCalls,1);

    const blocked=await service.speak('blocked request',{allowFallback:false})
      .then(()=>({kind:'resolved'})).catch(error=>({kind:'rejected',error}));
    assert.equal(blocked.kind,'rejected','timed-out underlying inference must keep the single-flight lock until it actually settles');
    assert.match(String(blocked.error&&blocked.error.message||blocked.error),/neural_generation_busy/);
    assert.equal(generateCalls,1,'no second inference may start while timed-out ONNX work is still unresolved');

    await sleep(60);
    const log=diagnostics(env);
    assert.ok(log.some(x=>x.phase==='generate_late_ready'),'late underlying completion must be observable');
    assert.ok(!log.some(x=>x.phase==='generate_ready'&&x.requestId===log.find(y=>y.phase==='generate_timeout')?.requestId),'timed-out request must not become generate_ready later');

    const third=await service.speak('fresh request',{allowFallback:false});
    assert.equal(third.provider,'neural-test','single-flight lock must release after underlying inference settles');
    assert.equal(generateCalls,2);
  }

  console.log('FIEZEL neural single-flight regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
