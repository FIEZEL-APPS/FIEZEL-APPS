'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const patch=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-neural-voice-audibility-fix.js'),'utf8');

function makeContext({ready=false,prepared=true,errorMode=false}={}){
  const events=[];
  let ensureReadyCalls=0,originalSpeakCalls=0,originalStopCalls=0,cancelCalls=0;
  const runtime={
    status:()=>({ready,prepared}),
    ensureReady:async()=>{ensureReadyCalls++;ready=true;events.push('ensure-ready');return{ready:true,prepared}},
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
  {
    const t=makeContext({ready:false,prepared:true});
    assert.equal(t.ctx.__fiezelTtsUnlocked,true,'silent bootstrap warmup must be disabled');
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello',{lang:'en-US'});
    assert.equal(result.provider,'neural','prepared cold launch must resume neural before fallback');
    assert.equal(t.ensureReadyCalls,1,'prepared neural engine must run the no-download ensureReady path');
    assert.equal(t.originalSpeakCalls,1,'speech must be retried through neural after resume');
    assert.ok(!t.events.includes('browser-speak'),'browser TTS must not preempt a prepared neural runtime');
    assert.ok(t.events.indexOf('ensure-ready')<t.events.indexOf('original-speak'),'runtime must become ready before neural speech');
  }
  {
    const t=makeContext({ready:true,prepared:true});
    const result=await t.ctx.FiezelVoiceRuntime.speak('hello');
    assert.equal(result.provider,'neural');
    assert.equal(t.originalSpeakCalls,1,'ready neural service should remain primary');
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
  console.log('FIEZEL neural voice audibility regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
