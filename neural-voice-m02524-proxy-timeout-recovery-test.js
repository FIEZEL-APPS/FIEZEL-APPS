'use strict';
const assert=require('assert');
const fs=require('fs');
const core=require('./features/neural-voice/fiezel-neural-voice.js');

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function makeEnv({standalone=false,policy=''}={}){
  const data={};
  return{
    FIEZEL_VERSION:'5.19.0',
    navigator:{standalone},
    __fiezelNeuralWasmPolicy:policy,
    localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)}},
    _data:data
  };
}
function diagnostics(env){return JSON.parse(env._data['fiezel-neural-voice-diagnostics-v1']||'[]')}
function config(){return{voices:{fiezelPrimary:'af_heart'},limits:{maxInputChars:3600,targetChunkWords:140,hardChunkWords:190},fallback:{browserSpeechSynthesis:false}}}

(async()=>{
  // m025-23 regression reproducer: once ORT proxy-worker makes the document event
  // loop responsive, the old hard timer wins while inference is still running.
  // Apple proxy-worker must retain the neural result and report an over-budget
  // condition instead of abandoning the request into browser fallback/circuit-open.
  {
    const env=makeEnv({standalone:true,policy:'apple-standalone-single-thread-proxy-worker'});
    let calls=0;
    const adapter={kind:'neural-test',generate:async()=>{calls++;await sleep(45);return{data:new Float32Array([0,.1]),sampling_rate:24000}}};
    const service=core.createVoiceService({config:config(),adapter,env,generationTimeoutMs:20});
    const result=await service.speak('hello proxy worker',{allowFallback:false});
    assert.equal(result.provider,'neural-test');
    assert.equal(calls,1,'proxy over-budget path must not retry or duplicate inference');
    const log=diagnostics(env);
    assert.ok(log.some(x=>x.phase==='generation_timeout_policy_ready'&&x.policy==='proxy-worker-soft-budget-v1'));
    assert.ok(log.some(x=>x.phase==='generate_budget_exceeded'),'proxy over-budget inference must be explicitly diagnosed');
    assert.ok(log.some(x=>x.phase==='generate_budget_recovered'),'proxy over-budget completion must be explicit');
    assert.ok(log.some(x=>x.phase==='generate_ready'),'late-but-valid proxy inference must still be consumed');
    assert.ok(!log.some(x=>x.phase==='generate_timeout'),'proxy budget must not be mislabeled as hard cancellation');
  }

  // Preserve the hard timeout contract outside the Apple proxy-worker path.
  {
    const env=makeEnv();
    const adapter={kind:'neural-test',generate:async()=>new Promise(()=>{})};
    const service=core.createVoiceService({config:config(),adapter,env,generationTimeoutMs:20});
    await assert.rejects(()=>service.speak('hello',{allowFallback:false}),/neural_generation_timeout/);
    assert.ok(diagnostics(env).some(x=>x.phase==='generate_timeout'));
  }

  // The implementation must keep the default requested voice/speed propagation
  // unchanged while changing timeout semantics only for the proven proxy policy.
  {
    const env=makeEnv({standalone:true,policy:'apple-standalone-single-thread-proxy-worker'});
    const seen=[];
    const adapter={kind:'neural-test',generate:async(text,opts)=>{seen.push(opts);return{data:new Float32Array([0]),sampling_rate:24000}}};
    const service=core.createVoiceService({config:config(),adapter,env,generationTimeoutMs:20});
    await service.speak('voice contract',{allowFallback:false,voice:'af_heart'});
    assert.equal(seen.length,1);
    assert.equal(seen[0].voice,'af_heart');
    assert.equal(seen[0].speed,1);
  }

  // A hard timeout elsewhere must be classified as transient rather than becoming
  // the page-lifetime circuit brick seen in m025-23. Lifecycle release must also
  // clear a previously opened circuit.
  const bootstrap=fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js','utf8');
  assert.match(bootstrap,/generationTimeout=lastError==='neural_generation_timeout'/);
  // m025-29: assert the invariant, not the literal expression. Busy and timeout must
  // stay transient (the original m025-24 guarantee), and supersession/stop joined them
  // because cancelling an in-flight request by switching item is normal control flow,
  // not an engine fault. Only a real fault may latch the circuit.
  assert.match(bootstrap,/shouldOpenCircuit=!!service&&!transientFailure/);
  assert.match(bootstrap,/const transientFailure=generationBusy\|\|generationTimeout\|\|generationSuperseded\|\|generationStopped/);
  const classify=err=>{
    const busy=err==='neural_generation_busy';
    const timeout=err==='neural_generation_timeout';
    const superseded=/superseded/i.test(err);
    const stopped=err==='neural_generation_stopped';
    return !(busy||timeout||superseded||stopped);
  };
  assert.equal(classify('neural_generation_timeout'),false,'timeout must stay transient');
  assert.equal(classify('neural_generation_busy'),false,'busy must stay transient');
  assert.equal(classify('TTS request superseded'),false,'switching item must not latch the circuit');
  assert.equal(classify('neural_generation_stopped'),false,'explicit stop must not latch the circuit');
  assert.equal(classify('sherpa_worker_failed:boom'),true,'a real engine fault must still latch');
  assert.match(bootstrap,/lastFallbackReason='';circuitOpen=false;audibleVerified=false/);
  assert.match(bootstrap,/__fiezelNeuralWasmPolicy=wasmPolicy/,'core service must receive the effective proxy policy before construction');

  // Browser speech used because neural failed must be explicitly surfaced to the
  // visible neural status UI instead of masquerading as successful neural output.
  const audibility=fs.readFileSync('features/neural-voice/fiezel-neural-voice-audibility-fix.js','utf8');
  assert.match(audibility,/function showFallbackNotice\(reason\)/);
  assert.match(audibility,/Suara neural sedang bermasalah\. Audio sementara memakai suara perangkat/);
  assert.match(audibility,/phase:'fallback_notice'/);

  // Historical m025-24 timeout behavior must remain valid across later product releases.
  // Deployment identity is therefore checked for current coherence, not frozen to the
  // release number that happened to exist when this regression was first authored.
  const diag=fs.readFileSync('features/neural-voice/fiezel-diag-panel.js','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  const diagBuild=diag.match(/DIAG_BUILD\s*=\s*'m025-(\d+)'/);
  const swBuild=sw.match(/SW_REV='m025-(\d+)-/);
  assert.ok(diagBuild,'Diagnostics deployment marker must exist');
  assert.ok(swBuild,'Service-worker deployment marker must exist');
  assert.equal(swBuild[1],diagBuild[1],'DIAG_BUILD and SW_REV must identify the same product build');
  assert.ok(Number(diagBuild[1])>=24,'later releases must not regress behind the m025-24 boundary');

  console.log('FIEZEL m025-24 proxy timeout recovery regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
