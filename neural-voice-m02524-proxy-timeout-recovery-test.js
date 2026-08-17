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
  // loop responsive, the old 30s hard timer wins Promise.race while inference is
  // still running. For Apple proxy-worker this must be a budget signal, not an
  // abandonment of valid neural output.
  {
    const env=makeEnv({standalone:true,policy:'apple-standalone-single-thread-proxy-worker'});
    let calls=0;
    const adapter={kind:'neural-test',generate:async()=>{calls++;await sleep(45);return{data:new Float32Array([0,.1]),sampling_rate:24000}}};
    const service=core.createVoiceService({config:config(),adapter,env,generationTimeoutMs:20});
    const result=await service.speak('hello proxy worker',{allowFallback:false});
    assert.equal(result.provider,'neural-test');
    assert.equal(calls,1,'proxy over-budget path must not retry or duplicate inference');
    const log=diagnostics(env);
    assert.ok(log.some(x=>x.phase==='generate_budget_exceeded'),'proxy over-budget inference must be explicitly diagnosed');
    assert.ok(log.some(x=>x.phase==='generate_ready'),'late-but-valid proxy inference must still be consumed');
    assert.ok(!log.some(x=>x.phase==='generate_timeout'),'proxy budget must not be mislabeled as hard cancellation');
  }

  // Preserve the existing hard timeout contract outside the Apple proxy-worker
  // path. This prevents the P0 recovery from silently removing all hang bounds.
  {
    const env=makeEnv();
    const adapter={kind:'neural-test',generate:async()=>new Promise(()=>{})};
    const service=core.createVoiceService({config:config(),adapter,env,generationTimeoutMs:20});
    await assert.rejects(()=>service.speak('hello',{allowFallback:false}),/neural_generation_timeout/);
    assert.ok(diagnostics(env).some(x=>x.phase==='generate_timeout'));
  }

  // Bootstrap must treat a hard generation timeout as transient. The underlying
  // inference promise can still be active after Promise.race, so permanent circuit
  // latching converts one timeout into a page-lifetime brick as observed on m025-23.
  const bootstrap=fs.readFileSync('features/neural-voice/fiezel-neural-voice-bootstrap.js','utf8');
  assert.match(bootstrap,/generationTimeout\s*=\s*lastError==='neural_generation_timeout'/,'bootstrap must classify neural_generation_timeout explicitly');
  assert.match(bootstrap,/shouldOpenCircuit\s*=\s*!!service&&!generationBusy&&!generationTimeout/,'generation timeout must not permanently open circuit');

  // Release identity must advance exactly one build from m025-23.
  const diag=fs.readFileSync('features/neural-voice/fiezel-diag-panel.js','utf8');
  const sw=fs.readFileSync('sw.js','utf8');
  assert.match(diag,/DIAG_BUILD\s*=\s*'m025-24'/);
  assert.match(sw,/SW_REV='m025-24-proxy-timeout-recovery-20260817-1'/);

  console.log('FIEZEL m025-24 proxy timeout recovery regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
