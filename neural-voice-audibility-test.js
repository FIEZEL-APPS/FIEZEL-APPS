'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const patch=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-neural-voice-audibility-fix.js'),'utf8');

function makeContext({ready=false,prepared=true,errorMode=false,ensureDelayMs=0}={}){
  const events=[];
  let ensureReadyCalls=0,originalSpeakCalls=0,originalStopCalls=0,cancelCalls=0;
  const runtime={
    status:()=>({ready,prepared}),
    ensureReady:async()=>{
      ensureReadyCalls++;
      events.push('ensure-ready-start');
      if(ensureDelayMs)await new Promise(resolve=>setTimeout(resolve,ensureDelayMs));
      ready=true;
      events.push('ensure-ready');
      return{ready:true,prepared};
    },
    speak:async()=>{originalSpeakCalls++;events.push('original-speak');return{provider:'neural'}},
    stop:()=>{originalStopCalls++;events.push('original-stop')}
  };
  const speechSynthesis={
    paused:false,speaking:false,pending:false,
    getVoices:()=>[{lang:'en-US',name:'English'}],
    resume:()=>events.push('resume'),
    cancel:()=>{cancelCalls++;events.push('cancel')},
    speak:u=>{
      events.push('browser-speak');
      if(errorMode)setTimeout(()=>u.onerror?.({error:'synthesis-failed'}),0);
      else setTimeout(()=>{u.onstart?.();events.push('browser-start');setTimeout(()=>{u.onend?.();events.push('browser-end')},0)},0);
    }
  };
  const localStorageData={};
  const ctx={
    console,setTimeout,clearTimeout,Date,Promise,
    FIEZEL_VERSION:'5.19.0',FiezelVoiceRuntime:runtime,
    FiezelWebAudioPlayer:{createPlayer:()=>({warm:()=>{events.push('warm');return true}})},
    speechSynthesis,
    SpeechSynthesisUtterance:function(text){this.text=text},
    localStorage:{getItem:k=>localStorageData[k]??null,setItem:(k,v)=>{localStorageData[k]=String(v)}}
  };
  vm.createContext(ctx);vm.runInContext(patch,ctx,{filename:'audibility-fix.js'});
  return{ctx,events,get ensureReadyCalls(){return ensureReadyCalls},get originalSpeakCalls(){return originalSpeakCalls},get originalStopCalls(){return originalStopCalls},get cancelCalls(){return cancelCalls}};
}

(async()=>{
  // P0 #48 UX contract: an already-downloaded but cold runtime must not hold the
  // first ordinary Listening utterance behind model initialization. Neural warms
  // in parallel; browser speech is a bounded audible bridge for that cold start.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:40});
    assert.equal(t.ctx.__fiezelTtsUnlocked,true,'silent bootstrap warmup must be disabled');
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello',{lang:'en-US'});
    assert.equal(result.provider,'browser-speech-synthesis','prepared cold launch must bridge immediately instead of blocking first audio on neural init');
    assert.equal(t.ensureReadyCalls,1,'prepared cold launch must start one background neural readiness attempt');
    assert.equal(t.originalSpeakCalls,0,'cold bridge must not double-play neural while browser audio is used');
    assert.ok(t.events.includes('browser-speak'),'cold bridge must enqueue browser audio');
    await new Promise(resolve=>setTimeout(resolve,55));
    assert.ok(t.events.includes('ensure-ready'),'background neural readiness must continue after bridge audio starts');
  }

  // Diagnostics/Tes suara remain strict neural-only: no bridge is allowed when
  // allowFallback=false, and the call waits for readiness before neural speech.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:10});
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello',{lang:'en-US',allowFallback:false});
    assert.equal(result.provider,'neural','neural-only path must remain neural');
    assert.equal(t.ensureReadyCalls,1,'neural-only cold path must ensure readiness');
    assert.equal(t.originalSpeakCalls,1,'neural-only cold path must speak after readiness');
    assert.ok(!t.events.includes('browser-speak'),'neural-only path must never use the browser bridge');
    assert.ok(t.events.indexOf('ensure-ready')<t.events.indexOf('original-speak'),'runtime must become ready before strict neural speech');
  }

  {
    const t=makeContext({ready:true,prepared:true});
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello');
    assert.equal(result.provider,'neural');
    assert.equal(t.originalSpeakCalls,1,'ready neural service should remain primary');
    assert.equal(t.ensureReadyCalls,0,'ready neural service must not reinitialize');
    assert.ok(!t.events.includes('browser-speak'),'ready neural service must not double-play browser TTS');
  }

  {
    const t=makeContext({ready:false,prepared:false,errorMode:true});
    await assert.rejects(()=>t.ctx.FiezelVoiceRuntime.speak('hello'),/browser_tts_synthesis-failed/);
    assert.equal(t.ensureReadyCalls,0,'unprepared neural engine must not start neural initialization');
  }

  {
    const t=makeContext({ready:false,prepared:false});
    t.ctx.FiezelVoiceRuntime.stop();
    assert.equal(t.originalStopCalls,0,'cold stop must not gratuitously cancel neural/browser pipelines');
    assert.equal(t.cancelCalls,0,'cold idle stop must not call speechSynthesis.cancel');
  }

  // Persisted-cache UX must stop telling an already-prepared user to download
  // offline voice again. The patch owns this narrow compatibility correction
  // without changing the large app.js surface.
  assert.ok(patch.includes('Aktifkan suara neural'),'prepared UI must distinguish activation from offline download');
  assert.ok(patch.includes("prepareNeuralVoice"),'patch must target the existing Skills Lab prepare control');
  assert.ok(patch.includes('stopImmediatePropagation'),'cached-state activation must bypass the legacy prepare/download handler');
  assert.ok(patch.includes('background_ready'),'background readiness must be explicitly diagnosed');

  console.log('FIEZEL neural voice audibility + persisted UX regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
