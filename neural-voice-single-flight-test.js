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

  {
    const env=makeEnv();
    let generateCalls=0;
    const adapter={kind:'neural-test',generate:()=>{
      generateCalls++;
      const blockedUntil=Date.now()+45;
      while(Date.now()<blockedUntil){}
      return audio();
    }};
    const service=core.createVoiceService({
      config:config(),adapter,env,generationTimeoutMs:20,eventLoopWatchdogMs:5,
      playAudio:async()=>({done:Promise.resolve(),stop(){}})
    });

    const result=await service.speak('blocking request',{allowFallback:false});
    assert.equal(result.provider,'neural-test','blocking generate stub should still resolve under the current non-preemptive timer semantics');
    assert.equal(generateCalls,1);
    await sleep(10);
    const log=diagnostics(env);
    const watchdog=log.find(x=>x.phase==='generate_event_loop_watchdog');
    assert.ok(watchdog,'event-loop watchdog marker must be emitted');
    assert.equal(watchdog.expectedDelayMs,5);
    assert.ok(watchdog.observedDelayMs>=30,`blocking generate must produce a materially delayed watchdog callback, got ${watchdog.observedDelayMs}`);
    assert.ok(!log.some(x=>x.phase==='generate_timeout'),'blocked event loop should expose the current timeout-starvation behavior rather than fabricate a timeout');
    const overBudget=log.find(x=>x.phase==='generate_completed_over_budget');
    assert.ok(overBudget,'synchronous completion past the configured timeout must be observable without relying on the watchdog task');
    assert.ok(overBudget.elapsedMs>=30);
    assert.equal(overBudget.timeoutMs,20);
  }

  {
    const env=makeEnv();
    env.navigator={standalone:true};
    const generatedTexts=[];
    const adapter={kind:'neural-test',generate:async text=>{generatedTexts.push(text);return audio()}};
    const service=core.createVoiceService({
      config:config(),adapter,env,generationTimeoutMs:200,appleHardChunkChars:240,
      playAudio:async()=>({done:Promise.resolve(),stop(){}})
    });
    const longText=Array.from({length:120},(_,i)=>`word${i}`).join(' ')+'.';
    const result=await service.speak(longText,{allowFallback:false});
    assert.ok(result.chunks>=3,'Apple standalone long input must be split into additional bounded chunks');
    assert.equal(generatedTexts.length,result.chunks);
    assert.ok(generatedTexts.every(text=>text.length<=240),`Apple adapter input must stay <=240 chars, got ${generatedTexts.map(x=>x.length).join(',')}`);
    const log=diagnostics(env);
    const policy=log.find(x=>x.phase==='chunk_policy_ready');
    assert.ok(policy&&policy.policy==='apple-standalone-char-cap-v1','Apple char-cap policy must be explicitly observable');
    assert.equal(policy.hardChunkChars,240);
    const plan=log.find(x=>x.phase==='chunk_plan');
    assert.ok(plan&&plan.chunkCount===result.chunks);
    assert.ok(plan.maxChunkChars<=240,'chunk plan must expose the bounded maximum without logging text');
  }

  {
    const env=makeEnv();
    const generatedTexts=[];
    const adapter={kind:'neural-test',generate:async text=>{generatedTexts.push(text);return audio()}};
    const service=core.createVoiceService({
      config:config(),adapter,env,generationTimeoutMs:200,
      playAudio:async()=>({done:Promise.resolve(),stop(){}})
    });
    const longSentence=Array.from({length:80},(_,i)=>`item${i}`).join(' ')+'.';
    const expected=core.splitIntoChunks(longSentence,140,190);
    const result=await service.speak(longSentence,{allowFallback:false});
    assert.equal(result.chunks,expected.length,'non-Apple splitter behavior must remain unchanged');
    assert.deepEqual(generatedTexts,expected,'non-Apple adapter inputs must match existing sentence/word splitter');
    assert.ok(diagnostics(env).some(x=>x.phase==='chunk_policy_ready'&&x.policy==='default'&&x.hardChunkChars===null));
  }

  {
    const env=makeEnv();
    let generateCalls=0;
    let inFlight=0;
    let maxInFlight=0;
    let playCalls=0;
    let firstPlaybackStartedResolve;
    let firstPlaybackRelease;
    const firstPlaybackStarted=new Promise(resolve=>{firstPlaybackStartedResolve=resolve});
    const firstPlaybackDone=new Promise(resolve=>{firstPlaybackRelease=resolve});
    const cfg=config();
    cfg.limits={...cfg.limits,targetChunkWords:2,hardChunkWords:2};
    const adapter={kind:'neural-test',generate:async()=>{
      generateCalls++;
      inFlight++;
      maxInFlight=Math.max(maxInFlight,inFlight);
      await sleep(5);
      inFlight--;
      return audio();
    }};
    const service=core.createVoiceService({
      config:cfg,adapter,env,generationTimeoutMs:200,
      playAudio:async()=>{
        playCalls++;
        if(playCalls===1){
          firstPlaybackStartedResolve();
          return{done:firstPlaybackDone,stop(){}};
        }
        return{done:Promise.resolve(),stop(){}};
      }
    });

    const speaking=service.speak('one two three four.',{allowFallback:false});
    await firstPlaybackStarted;
    await sleep(20);
    assert.equal(generateCalls,2,'next chunk generation must begin while current chunk playback is still active');
    assert.equal(playCalls,1,'next chunk playback must wait for current playback completion');
    assert.equal(maxInFlight,1,'pipeline must preserve exactly one active neural inference');

    firstPlaybackRelease();
    const result=await speaking;
    assert.equal(result.chunks,2);
    assert.equal(generateCalls,2,'pipeline must call adapter.generate exactly once per chunk');
    assert.equal(playCalls,2,'both chunks must play exactly once and in order');
  }

  {
    const env=makeEnv();
    const cfg=config();
    cfg.limits={...cfg.limits,targetChunkWords:2,hardChunkWords:2};
    let generateCalls=0;
    let playCalls=0;
    let secondGenerateStartedResolve;
    let releaseSecondGenerate;
    let releaseFirstPlayback;
    const secondGenerateStarted=new Promise(resolve=>{secondGenerateStartedResolve=resolve});
    const secondGenerateGate=new Promise(resolve=>{releaseSecondGenerate=resolve});
    const firstPlaybackDone=new Promise(resolve=>{releaseFirstPlayback=resolve});
    const adapter={kind:'neural-test',generate:async()=>{
      generateCalls++;
      if(generateCalls===2){
        secondGenerateStartedResolve();
        await secondGenerateGate;
      }
      return audio();
    }};
    const service=core.createVoiceService({
      config:cfg,adapter,env,generationTimeoutMs:200,
      playAudio:async()=>{
        playCalls++;
        if(playCalls===1)return{done:firstPlaybackDone,stop(){releaseFirstPlayback()}};
        return{done:Promise.resolve(),stop(){}};
      }
    });

    const pipelined=service.speak('one two three four.',{allowFallback:false})
      .then(()=>({kind:'resolved'})).catch(error=>({kind:'rejected',error}));
    await secondGenerateStarted;
    assert.equal(playCalls,1,'second chunk must not play while first playback is active');
    service.stop();
    const stopped=await pipelined;
    assert.equal(stopped.kind,'rejected','stopped pipelined request must reject as superseded');
    assert.match(String(stopped.error&&stopped.error.message||stopped.error),/TTS request superseded/);

    const blocked=await service.speak('fresh now.',{allowFallback:false})
      .then(()=>({kind:'resolved'})).catch(error=>({kind:'rejected',error}));
    assert.equal(blocked.kind,'rejected','new request must remain blocked while superseded prefetched inference is unresolved');
    assert.match(String(blocked.error&&blocked.error.message||blocked.error),/neural_generation_busy/);
    assert.equal(generateCalls,2,'blocked request must not start hidden inference or retry');

    releaseSecondGenerate();
    await sleep(10);
    assert.equal(playCalls,1,'superseded prefetched chunk must never reach playback after it resolves');
    const fresh=await service.speak('fresh now.',{allowFallback:false});
    assert.equal(fresh.provider,'neural-test');
    assert.equal(generateCalls,3,'fresh request may start only after superseded inference settles');
    assert.equal(playCalls,2,'only the fresh request may add playback after supersede');
  }

  console.log('FIEZEL neural single-flight regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
