'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const patch=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-neural-voice-audibility-fix.js'),'utf8');

function makeContext({ready=false,prepared=true,errorMode=false}={}){
  const events=[];
  let prepareCalls=0,originalSpeakCalls=0,originalStopCalls=0,cancelCalls=0;
  const runtime={
    status:()=>({ready,prepared}),
    prepare:async()=>{prepareCalls++;ready=true;events.push('prepare')},
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
  return{ctx,events,get prepareCalls(){return prepareCalls},get originalSpeakCalls(){return originalSpeakCalls},get originalStopCalls(){return originalStopCalls},get cancelCalls(){return cancelCalls}};
}

(async()=>{
  {
    const t=makeContext({ready:false,prepared:true});
    assert.equal(t.ctx.__fiezelTtsUnlocked,true,'silent bootstrap warmup must be disabled');
    const p=t.ctx.FiezelVoiceRuntime.speak('hello',{lang:'en-US'});
    assert.ok(t.events.includes('browser-speak'),'browser TTS must be enqueued synchronously on cold neural state');
    assert.equal(t.prepareCalls,0,'neural warmup must wait until audible fallback finishes');
    const result=await p;
    assert.equal(result.provider,'browser-speech-synthesis');
    await new Promise(r=>setTimeout(r,10));
    assert.equal(t.prepareCalls,1,'prepared neural engine may warm after browser audio completes');
    assert.ok(t.events.indexOf('browser-speak')<t.events.indexOf('prepare'),'audibility must precede neural warmup');
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
    assert.equal(t.prepareCalls,0,'unprepared neural engine must not start background preparation');
  }
  {
    const t=makeContext({ready:false,prepared:false});
    t.ctx.FiezelVoiceRuntime.stop();
    assert.equal(t.originalStopCalls,0,'cold stop must not gratuitously cancel neural/browser pipelines');
    assert.equal(t.cancelCalls,0,'cold idle stop must not call speechSynthesis.cancel');
  }
  console.log('FIEZEL neural voice audibility regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
