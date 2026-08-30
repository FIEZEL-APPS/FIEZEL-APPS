#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const a=src.indexOf('function AudioService(){');
const b=src.indexOf('}const audio=AudioService();');
const code=a>=0&&b>a?src.slice(a,b+1):'';
const checks=[];let failed=false;
function check(name,ok,details=''){checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok){failed=true;console.error('FAIL - '+name+(details?' :: '+details:''))}else console.log('ok   - '+name)}
const tick=()=>new Promise(r=>setImmediate(r));

function harness(){
  const pending=[],speaks=[],timers=new Map();
  let nextTimer=1,stopCalls=0,cancelCalls=0,toasts=0;
  function Utterance(text){this.text=String(text);this.lang='';this.rate=1}
  const speechSynthesis={
    speak(u){speaks.push(String(u&&u.text||''))},
    cancel(){cancelCalls++}
  };
  const fakeSetTimeout=(fn,ms)=>{const id=nextTimer++;timers.set(id,{id,fn,ms,cleared:false,fired:false});return id};
  const fakeClearTimeout=id=>{const t=timers.get(id);if(t)t.cleared=true};
  const sandbox={
    window:{speechSynthesis},speechSynthesis,SpeechSynthesisUtterance:Utterance,
    self:{FiezelVoiceSay:{
      say:(text,options)=>new Promise(resolve=>pending.push({text,options,resolve})),
      stop:()=>{stopCalls++}
    }},
    selectedNeuralRate:()=>1,
    prefetchNextVoice:()=>Promise.resolve(false),
    cancelVoicePrefetch:()=>{},
    showToast:()=>{toasts++},
    setTimeout:fakeSetTimeout,clearTimeout:fakeClearTimeout,console
  };
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code+'\nvar raceAudio=AudioService();',sandbox,{filename:'app.js#voice-audio-race'});
  return {
    audio:sandbox.raceAudio,pending,speaks,timers,
    stopCalls:()=>stopCalls,cancelCalls:()=>cancelCalls,toasts:()=>toasts,
    timer9000:()=>[...timers.values()].filter(t=>t.ms===9000).at(-1),
    fire:(t,force=false)=>{if(!t)return false;if(t.cleared&&!force)return false;t.fired=true;t.fn();return true}
  };
}

(async()=>{
  check('AudioService production block is extractable',!!code,'start='+a+' end='+b);
  check('source owns playback generation token',/playbackGeneration/.test(code));
  check('source owns cancellable door timeout',/activeDoorTimer/.test(code));

  {
    const h=harness();
    const old=h.audio.play('old sentence',{contentType:'sentence'});await tick();
    const newer=h.audio.play('new sentence',{contentType:'sentence'});await tick();
    check('interrupt harness has two independent neural promises',h.pending.length===2,'pending='+h.pending.length);
    h.pending[1].resolve(true);const nr=await newer;
    h.pending[0].resolve(false);const or=await old;await tick();
    check('new playback remains the owner',nr&&nr.provider==='fiezel-voice-say',JSON.stringify(nr));
    check('stale false completion resolves inert',or===null,'old='+JSON.stringify(or));
    check('stale completion starts zero browser speech and zero silence toast',h.speaks.length===0&&h.toasts()===0,'speaks='+h.speaks.length+' toasts='+h.toasts());
  }

  {
    const h=harness();
    const p=h.audio.play('explicitly stopped');await tick();
    h.audio.stop();h.pending[0].resolve(false);const r=await p;await tick();
    check('explicit stop invalidates later completion',r===null&&h.speaks.length===0&&h.toasts()===0,'result='+JSON.stringify(r)+' speaks='+h.speaks.length);
  }

  {
    const h=harness();
    const p=h.audio.play('current false fallback');await tick();
    const t=h.timer9000();h.pending[0].resolve(false);const r=await p;
    check('current-generation neural failure still falls back exactly once',r&&r.provider==='browser-speech-synthesis'&&h.speaks.length===1,'result='+JSON.stringify(r)+' speaks='+h.speaks.length);
    check('door timer is cleared when neural settles first',!!t&&t.cleared===true,'timer='+JSON.stringify(t));
  }

  {
    const h=harness();
    const p=h.audio.play('timeout fallback');await tick();
    const t=h.timer9000(),before=h.stopCalls();
    check('9000ms timeout is armed only for an active neural door',!!t&&!t.cleared,'timer='+JSON.stringify(t));
    h.fire(t);const r=await p;
    check('timeout stops neural door before browser fallback',h.stopCalls()===before+1&&h.speaks.length===1,'stops='+h.stopCalls()+' before='+before+' speaks='+h.speaks.length);
    check('timeout fallback returns browser provider',r&&r.provider==='browser-speech-synthesis',JSON.stringify(r));
    h.pending[0].resolve(true);await tick();
    check('late neural completion after timeout cannot create a second fallback effect',h.speaks.length===1&&h.toasts()===0,'speaks='+h.speaks.length+' toasts='+h.toasts());
  }

  {
    const h=harness();
    const p=h.audio.play('fast neural success');await tick();
    const t=h.timer9000();h.pending[0].resolve(true);const r=await p;
    check('fast neural success preserves neural provider',r&&r.provider==='fiezel-voice-say'&&h.speaks.length===0,JSON.stringify(r));
    check('fast success clears its 9s timeout',!!t&&t.cleared===true,'timer='+JSON.stringify(t));
  }

  {
    const h=harness();
    const old=h.audio.play('old timer owner');await tick();const oldTimer=h.timer9000();
    const newer=h.audio.play('new timer owner');await tick();const newTimer=h.timer9000();
    const stopsBefore=h.stopCalls();
    h.fire(oldTimer,true);const oldResult=await old;await tick();
    check('forced stale timeout is inert and cannot stop the new neural generation',oldResult===null&&h.stopCalls()===stopsBefore,'old='+JSON.stringify(oldResult)+' stops='+h.stopCalls()+' before='+stopsBefore);
    check('stale cleanup does not clear the new generation timer',!!newTimer&&newTimer.cleared===false,'newTimer='+JSON.stringify(newTimer));
    h.pending[1].resolve(true);const nr=await newer;
    check('new generation completes normally after stale timer race',nr&&nr.provider==='fiezel-voice-say'&&newTimer.cleared===true,JSON.stringify(nr));
  }

  fs.writeFileSync(path.join(__dirname,'VOICE-AUDIO-RACE-REPORT.json'),JSON.stringify({schema:'fiezel-voice-audio-race-v1',pass:!failed,checks},null,2));
  console.log(`voice-audio-race-test: ${checks.filter(x=>x.status==='PASS').length}/${checks.length} ${failed?'FAIL':'PASS'}`);
  process.exit(failed?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
