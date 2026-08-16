'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const path=require('path');
const patch=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-neural-voice-audibility-fix.js'),'utf8');

function makeContext({ready=false,prepared=true,errorMode=false,ensureDelayMs=0,withUi=false}={}){
  const events=[];
  let ensureReadyCalls=0,prepareCalls=0,originalSpeakCalls=0,originalStopCalls=0,cancelCalls=0;
  const runtime={
    status:()=>({ready,prepared}),
    prepare:async()=>{prepareCalls++;events.push('prepare');return{ready,prepared}},
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
  const documentEvents={};
  const ui=withUi?{
    prepareButton:{id:'prepareNeuralVoice',disabled:false,innerHTML:'Siapkan suara offline'},
    testButton:{id:'testNeuralVoice',disabled:false,innerHTML:'Tes suara'},
    hint:{id:'neuralVoiceProgress',textContent:'Model tersimpan lokal. Siapkan suara offline.'}
  }:null;
  const document=withUi?{
    readyState:'complete',documentElement:{},body:{},
    getElementById:id=>id==='prepareNeuralVoice'?ui.prepareButton:id==='testNeuralVoice'?ui.testButton:id==='neuralVoiceProgress'?ui.hint:null,
    addEventListener:(name,fn,capture)=>{(documentEvents[name]||(documentEvents[name]=[])).push({fn,capture:!!capture})}
  }:undefined;
  const ctx={
    console,setTimeout,clearTimeout,Date,Promise,
    FIEZEL_VERSION:'5.19.0',FiezelVoiceRuntime:runtime,
    FiezelWebAudioPlayer:{createPlayer:()=>({warm:()=>{events.push('warm');return true}})},
    speechSynthesis,
    SpeechSynthesisUtterance:function(text){this.text=text},
    localStorage:{getItem:k=>localStorageData[k]??null,setItem:(k,v)=>{localStorageData[k]=String(v)}}
  };
  if(document)ctx.document=document;
  vm.createContext(ctx);vm.runInContext(patch,ctx,{filename:'audibility-fix.js'});
  return{
    ctx,events,ui,documentEvents,
    get ensureReadyCalls(){return ensureReadyCalls},
    get prepareCalls(){return prepareCalls},
    get originalSpeakCalls(){return originalSpeakCalls},
    get originalStopCalls(){return originalStopCalls},
    get cancelCalls(){return cancelCalls}
  };
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

  // Execute the persisted Skills Lab UI path, not merely source-string checks.
  // A cached reload must identify the assets as already stored, start exactly one
  // background activation, and consume the legacy "prepare/download" click before
  // the app's old target handler can run.
  {
    const t=makeContext({ready:false,prepared:true,ensureDelayMs:40,withUi:true});
    assert.match(t.ui.prepareButton.innerHTML,/Aktifkan suara neural/,'cached reload must not render Siapkan suara offline as the required action');
    assert.equal(t.ui.testButton.disabled,true,'strict neural test stays disabled while the cold service warms');
    assert.match(t.ui.hint.textContent,/sudah tersimpan/i,'cached reload copy must explicitly recognize persisted offline assets');
    assert.equal(t.ensureReadyCalls,1,'mounting cached Skills Lab controls should start one background readiness attempt');
    assert.equal(t.prepareCalls,0,'cached mount must never invoke runtime.prepare or redownload assets');

    let prevented=false,stopped=false;
    const event={
      target:{closest:selector=>selector==='#prepareNeuralVoice'?t.ui.prepareButton:null},
      preventDefault:()=>{prevented=true},
      stopImmediatePropagation:()=>{stopped=true}
    };
    for(const entry of t.documentEvents.click||[])entry.fn(event);
    assert.equal(prevented,true,'cached activation click must prevent legacy default handling');
    assert.equal(stopped,true,'cached activation click must stop the legacy prepare/download target handler');
    assert.equal(t.ensureReadyCalls,1,'cached activation click must coalesce with existing background readiness');
    assert.equal(t.prepareCalls,0,'cached activation click must not call runtime.prepare or fetch assets again');

    await new Promise(resolve=>setTimeout(resolve,55));
    assert.match(t.ui.prepareButton.innerHTML,/Suara neural aktif/,'UI must transition to ready after background activation');
    assert.equal(t.ui.prepareButton.disabled,true,'ready state must not offer another prepare action');
    assert.equal(t.ui.testButton.disabled,false,'strict neural test becomes available only after readiness');
    assert.equal(t.prepareCalls,0,'the entire cached activation path must remain download-free');
  }

  assert.ok(patch.includes('background_ready'),'background readiness must be explicitly diagnosed');

  console.log('FIEZEL neural voice audibility + persisted UX regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});
