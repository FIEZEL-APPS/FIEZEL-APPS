'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=__dirname;
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const pass=name=>console.log(`PASS ${name}`);

(async()=>{
  const config=require('./features/neural-voice/fiezel-neural-voice-config.js');
  // m025-26: bella leads the catalog because OWNER made it the default voice.
  const expected=['af_bella','af_heart','af_nicole','am_michael','bf_emma','bm_george'];
  assert.deepStrictEqual(config.voices.catalog.map(item=>item.id),expected);
  assert.strictEqual(config.voices.fiezelPrimary,'af_bella');
  // Voices are no longer per-file: the sherpa engine carries every speaker inside its
  // single .data payload, so assert each id resolves to a speaker instead of a .bin.
  const sherpa=require('./features/neural-voice/fiezel-sherpa-vits-adapter.js');
  for(const id of expected){
    assert.ok(Object.prototype.hasOwnProperty.call(sherpa.VOICE_SIDS,id),`missing speaker mapping for ${id}`);
  }
  pass('voice catalog exposes all six bundled Kokoro voices');

  const app=read('app.js');
  assert.ok(app.includes("neuralVoice:'auto'"),'preferences must persist a neural voice choice');
  assert.ok(app.includes('id="neuralVoiceSelect"'),'Skills Lab must render a voice selector');
  assert.ok(app.includes('function setNeuralVoicePreference('),'selector must have a persistence handler');
  assert.ok(app.includes("$('neuralVoiceSelect')?.addEventListener('change'"),'selector change must be wired');
  assert.ok(app.includes('function testNeuralVoice('),'UI must expose a voice test action');
  assert.ok(app.includes('voice:neuralVoiceFor(options)'),'runtime calls must route through the selected voice');
  assert.ok(app.includes("runtime.speak('Hello. This is your selected FIEZEL neural voice.'"),'test action must invoke the neural runtime');
  pass('product UI exposes and persists neural voice selection');

  const helperNames=['neuralVoiceCatalog','selectedNeuralVoice','neuralVoiceFor','setNeuralVoicePreference'];
  const helperSource=helperNames.map(name=>{
    const match=app.match(new RegExp(`function ${name}\\([^\n]+`));
    assert.ok(match,`missing helper ${name}`);
    return match[0];
  }).join('\n');
  let saveCalls=0;
  const prefContext={state:{preferences:{neuralVoice:'auto'}},self:{FiezelNeuralVoiceConfig:config},save:()=>{saveCalls++},showToast:()=>{}};
  prefContext.globalThis=prefContext;
  vm.createContext(prefContext);vm.runInContext(helperSource,prefContext,{filename:'app-neural-voice-helpers.js'});
  prefContext.setNeuralVoicePreference('bf_emma');
  assert.strictEqual(prefContext.selectedNeuralVoice(),'bf_emma');
  assert.strictEqual(prefContext.neuralVoiceFor({voice:'am_michael'}),'bf_emma','fixed preference must override exercise-authored voice');
  prefContext.setNeuralVoicePreference('auto');
  assert.strictEqual(prefContext.neuralVoiceFor({voice:'am_michael'}),'am_michael','auto must preserve authored listening variation');
  prefContext.setNeuralVoicePreference('not-a-real-voice');
  assert.strictEqual(prefContext.selectedNeuralVoice(),'auto','invalid stored voice must fail closed to auto');
  assert.strictEqual(saveCalls,3,'each preference change must be persisted');
  pass('voice preference behavior is bounded, persistent, and honors auto variation');

  const audibilitySource=read('features/neural-voice/fiezel-neural-voice-audibility-fix.js');
  let ready=false,ensureReadyCalls=0,neuralSpeakCalls=0,browserSpeakCalls=0;
  const runtime={
    status:()=>({prepared:true,ready}),
    ensureReady:async()=>{ensureReadyCalls++;ready=true;return{prepared:true,ready:true}},
    speak:async(_text,options)=>{neuralSpeakCalls++;return{provider:'kokoro-local',voice:options.voice}},
    stop:()=>{}
  };
  class SpeechSynthesisUtterance{constructor(text){this.text=text}}
  const storage=new Map();
  const context={
    FiezelVoiceRuntime:runtime,
    FiezelWebAudioPlayer:{createPlayer:()=>({warm:()=>true})},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
    speechSynthesis:{
      paused:false,
      getVoices:()=>[],
      speak:utterance=>{browserSpeakCalls++;utterance.onstart?.();utterance.onend?.()},
      cancel:()=>{}
    },
    SpeechSynthesisUtterance,
    FIEZEL_VERSION:'test',
    setTimeout,clearTimeout,Date,JSON,Object,String,Number,Promise,Error
  };
  context.globalThis=context;
  vm.runInNewContext(audibilitySource,context,{filename:'fiezel-neural-voice-audibility-fix.js'});
  const coldResult=await context.FiezelVoiceRuntime.speak('hello',{voice:'af_bella'});
  assert.strictEqual(ensureReadyCalls,1,'prepared cold-launch path must start neural readiness in background');
  assert.strictEqual(neuralSpeakCalls,0,'cold bridge must not double-play neural while first audio is bridged');
  assert.strictEqual(browserSpeakCalls,1,'prepared cold launch must provide immediate audible bridge');
  assert.strictEqual(coldResult.provider,'browser-speech-synthesis');
  await Promise.resolve();
  const warmResult=await context.FiezelVoiceRuntime.speak('hello again',{voice:'af_bella'});
  assert.strictEqual(warmResult.provider,'kokoro-local','once background readiness completes, Kokoro must resume as primary provider');
  assert.strictEqual(warmResult.voice,'af_bella');
  assert.strictEqual(neuralSpeakCalls,1,'ready follow-up must use neural speech');
  assert.strictEqual(browserSpeakCalls,1,'ready follow-up must not use a second browser bridge');
  pass('prepared cold launch bridges first audio while neural warms, then returns to Kokoro');

  const webAudio=require('./features/neural-voice/fiezel-web-audio-player.js');
  let contexts=0;
  class ThrowingAudioContext{
    constructor(){contexts++;this.state='running';this.destination={}}
    createBuffer(){return{copyToChannel:()=>{}}}
    createBufferSource(){return{connect:()=>{},start:()=>{throw new Error('audio_start_failed')},stop:()=>{}}}
  }
  const env={AudioContext:ThrowingAudioContext};
  const playerA=webAudio.createPlayer(env);
  const playerB=webAudio.createPlayer(env);
  playerA.warm();
  playerB.warm();
  assert.strictEqual(contexts,1,'createPlayer calls must share one AudioContext per environment');
  await assert.rejects(()=>playerA.play({audio:new Float32Array([0,.1,-.1]),sampling_rate:24000}),/audio_start_failed/);
  pass('Web Audio start failures propagate and shared context prevents exhaustion');

  const bootstrap=read('features/neural-voice/fiezel-neural-voice-bootstrap.js');
  assert.ok(bootstrap.includes('function browserSpeak(text,options={})'));
  assert.ok(bootstrap.includes('new Promise((resolve,reject)=>'),'browser fallback must be reject-capable');
  assert.ok(bootstrap.includes("utterance.onerror=event=>settle(false,new Error(`browser_tts_${String(event?.error||'error')}`))"),'browser TTS errors must reject');
  assert.ok(bootstrap.includes("browser_tts_not_started"),'browser fallback must distinguish never-started speech');
  assert.ok(bootstrap.includes('async function ensureReady()'),'runtime must expose a bounded cold-launch resume path');
  assert.ok(bootstrap.includes('prepare,ensureReady,speak'),'ensureReady must be exported');
  pass('bootstrap makes fallback failure observable and exports ensureReady');

  const ios=read('features/neural-voice/fiezel-neural-voice-ios-cache-fix.js');
  const preflight=ios.indexOf('await primeStoragePreflight(cache)');
  const firstCache=ios.indexOf('cacheBuffered(cache,WASM)',preflight);
  assert.ok(preflight>=0&&firstCache>preflight,'storage preflight must run before large priming');
  const wasmVerify=ios.indexOf("if(!(await has(cache,absolute(WASM.path))))throw new Error",firstCache);
  const wasmDone=ios.indexOf('done(WASM)',firstCache);
  assert.ok(wasmVerify>=0&&wasmDone>wasmVerify,'WASM progress must advance only after cache verification');
  const modelCache=ios.indexOf('cacheBrowserManaged(cache,MODEL)',wasmDone);
  const modelVerify=ios.indexOf("if(!(await has(cache,absolute(MODEL.path))))throw new Error",modelCache);
  const modelDone=ios.indexOf('done(MODEL)',modelCache);
  assert.ok(modelCache>=0&&modelVerify>modelCache&&modelDone>modelVerify,'model progress must advance only after cache verification');
  assert.ok(ios.includes("error.code='storage_insufficient'"),'low quota must be explicit');
  pass('iOS priming checks quota and verifies storage before progress success');

  const sw=read('sw.js');
  assert.ok(sw.includes("COEP_POLICY='credentialless'"),'COEP must allow third-party no-cors SDK loading without opaque reconstruction');
  assert.ok(sw.includes('Third-party SDK/API traffic is deliberately left to the browser'),'third-party traffic must bypass service-worker response synthesis');
  assert.ok(sw.includes("'same-origin-allow-popups'"),'WebKit navigation must preserve cross-origin auth popup opener');
  assert.ok(!/fetch\(request[^\n]*mode:'no-cors'[\s\S]{0,700}new Response\(response\.body/.test(sw),'must never reconstruct an opaque no-cors body as synthetic 200');
  pass('service worker leaves Puter traffic to browser under popup-compatible credentialless policy');

  const workflow=read('.github/workflows/quality.yml');
  assert.ok(workflow.includes('node neural-voice-fix-test.js'));
  assert.ok(workflow.includes('node sw-corp-test.js'));
  assert.ok(workflow.includes('node neural-voice-product-repair-test.js'),'product repair gate must run in CI');
  assert.ok(workflow.includes('node neural-voice-generation-timeout-test.js'),'m025 generation regression must run in CI');
  assert.ok(workflow.includes('node puter-auth-coop-test.js'),'m025 Puter auth regression must run in CI');
  pass('quality workflow includes neural repair and m025 gates');

  console.log('FIEZEL neural voice product repair: ALL GATES PASS');
})().catch(error=>{console.error(error&&error.stack||error);process.exit(1)});
