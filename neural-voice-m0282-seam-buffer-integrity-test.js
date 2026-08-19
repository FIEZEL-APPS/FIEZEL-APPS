'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

async function main(){
  const preSource=fs.readFileSync('features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js','utf8');
  const guardSource=fs.readFileSync('features/neural-voice/fiezel-m0281-runtime-guard.js','utf8');
  const bundleSource=fs.readFileSync('features/neural-voice/fiezel-voice-bundle-gate.js','utf8');
  const indexSource=fs.readFileSync('index.html','utf8');

  // 1) Apple standalone creation must roll sentence buffering back to a larger bounded render.
  let lastVoiceOptions=null;
  const service=Object.freeze({speak:async t=>t,stop(){},prefetch:async()=>true,splitIntoChunks(){return[];}});
  const basePlayerReturn=Object.freeze({play(){},stop(){},warm(){},close(){}});
  let basePlayerCalls=0;
  const basePlayer=Object.freeze({createPlayer(){basePlayerCalls++;return basePlayerReturn;}});
  const root={console,Promise,setTimeout,clearTimeout,FiezelWebAudioPlayer:basePlayer,
    FiezelNeuralVoice:Object.freeze({createVoiceService:o=>{lastVoiceOptions=o;return service;},normalizeText:x=>x,splitIntoChunks:x=>[x]})};
  root.globalThis=root;
  vm.runInNewContext(preSource,root);
  root.FiezelNeuralVoice.createVoiceService({env:{navigator:{standalone:true}},streamSentences:true});
  assert.equal(lastVoiceOptions.streamSentences,false,'Apple standalone must disable sentence-at-a-time streaming');
  assert.equal(lastVoiceOptions.appleHardChunkChars,128,'Apple standalone integrity cap must be 128 chars');
  root.FiezelNeuralVoice.createVoiceService({env:{navigator:{standalone:false}},streamSentences:true});
  assert.equal(lastVoiceOptions.streamSentences,true,'non-Apple streaming policy must remain unchanged');
  assert.equal(lastVoiceOptions.appleHardChunkChars,undefined,'non-Apple must not inherit Apple hard cap');

  // 2) The player wrapper must touch ordinary enqueue edges only on Apple standalone.
  const messages=[];
  class FakeAudioWorkletNode{
    constructor(){
      this.port={postMessage:(message,transfer)=>messages.push({message,transfer})};
    }
  }
  const playerSentinel=Object.freeze({play(){},stop(){},warm(){},close(){}});
  const edgeRoot={console,Promise,setTimeout,clearTimeout,
    FiezelNeuralVoice:Object.freeze({createVoiceService:()=>service,normalizeText:x=>x,splitIntoChunks:x=>[x]}),
    FiezelWebAudioPlayer:Object.freeze({
      createPlayer(env){
        const node=new env.AudioWorkletNode();
        node.port.postMessage({type:'enqueue',fadeInFrames:265,fadeOutFrames:353},['pcm']);
        node.port.postMessage({type:'clear',fadeOutFrames:794});
        return playerSentinel;
      }
    })};
  edgeRoot.globalThis=edgeRoot;
  vm.runInNewContext(preSource,edgeRoot);
  const appleEnv={navigator:{standalone:true},AudioWorkletNode:FakeAudioWorkletNode};
  const returned=edgeRoot.FiezelWebAudioPlayer.createPlayer(appleEnv);
  assert.strictEqual(returned,playerSentinel,'wrapper must preserve the exact base player object');
  assert.equal(messages[0].message.type,'enqueue');
  assert.equal(messages[0].message.fadeInFrames,0,'ordinary Apple enqueue must preserve model-native head');
  assert.equal(messages[0].message.fadeOutFrames,0,'ordinary Apple enqueue must preserve model-native tail');
  assert.equal(messages[0].message.edgePolicy,'model-native');
  assert.equal(messages[1].message.type,'clear');
  assert.equal(messages[1].message.fadeOutFrames,794,'explicit cancellation fade must pass through unchanged');
  messages.length=0;
  edgeRoot.FiezelWebAudioPlayer.createPlayer({navigator:{standalone:false},AudioWorkletNode:FakeAudioWorkletNode});
  assert.equal(messages[0].message.fadeInFrames,265,'non-Apple player must remain untouched');
  assert.equal(messages[0].message.fadeOutFrames,353,'non-Apple player must remain untouched');

  // 3) Indonesian verification must terminate from shared readiness without a second worker.
  let originalPrepareCalls=0;
  let timer=null;
  const stable=Object.freeze({
    speak:async()=>({provider:'stable'}), stop(){},
    status:()=>({prepared:true,assetsCached:true,ready:true,audibleVerified:true}),
    prepare:async()=>({}), ensureReady:async()=>({})
  });
  const verifyRoot={console,Promise,FiezelVoiceRuntime:stable,
    FiezelIndonesianVoice:Object.freeze({
      status:()=>({prepared:false,ready:false,error:''}),
      prepare:async()=>{originalPrepareCalls++;return{};},
      speak:async()=>({provider:'id'})
    }),
    document:{getElementById:()=>null},setTimeout:fn=>{timer=fn;return 1;}}
  verifyRoot.globalThis=verifyRoot;
  vm.runInNewContext(guardSource,verifyRoot);
  const idStatus=verifyRoot.FiezelIndonesianVoice.status();
  assert.equal(idStatus.prepared,true);
  assert.equal(idStatus.ready,false,'M028.2 must not fabricate Indonesian generation readiness');
  assert.equal(idStatus.sharedRuntimeReady,true);
  assert.equal(idStatus.verificationComplete,true);
  assert.equal(idStatus.generationDeferred,true);
  assert.equal(idStatus.verificationState,'shared-base-verified');
  const prepared=await verifyRoot.FiezelIndonesianVoice.prepare();
  assert.equal(prepared.verificationComplete,true,'prepare must settle as shared verification complete');
  assert.equal(originalPrepareCalls,0,'shared verification must not create Indonesian Supertonic worker');
  if(timer) timer();

  // 4) Mandatory voice gate completion is based on prepared state, not generation-ready.
  assert.match(bundleSource,/return\s+!\(s\.englishPrepared\s*&&\s*s\.indonesianPrepared\)/,
    'voice bundle sheet must close when both shared bundles are prepared');
  assert.doesNotMatch(bundleSource,/function indonesianPrepared\(\)[\s\S]{0,260}\.ready/,
    'bundle preparation gate must not wait for Indonesian generation ready');

  // 5) No dead staging module or extra load-order mutation may remain.
  assert.equal(fs.existsSync('features/neural-voice/fiezel-m0282-audioedge-hotfix.js'),false,'unwired staging module must be removed');
  assert.doesNotMatch(indexSource,/fiezel-m0282-audioedge-hotfix\.js/,'index must not carry an extra hotfix script');
  assert.match(preSource,/fiezel-m0282-prebootstrap-integrity-v2/);
  assert.match(guardSource,/fiezel-m0282-runtime-guard-v2/);

  console.log('PASS M028.2 seam/buffer/PCM-edge/Indonesian-verification integrity');
}
main().catch(error=>{console.error(error);process.exit(1);});