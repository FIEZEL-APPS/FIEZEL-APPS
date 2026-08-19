'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

async function main(){
  let createdOpts=null,active=0,maxActive=0,order=[];
  const inner={
    async speak(text){active++;maxActive=Math.max(maxActive,active);order.push('start:'+text);await new Promise(r=>setTimeout(r,12));order.push('end:'+text);active--;return text;},
    stop(){order.push('stop');},async prefetch(){return true;},splitIntoChunks(){return[];}
  };
  const prosody={gapAfter:t=>/[.]$/.test(t)?420:200,punctuate:t=>String(t)+'.'};
  const env={console,setTimeout,clearTimeout,Promise,globalThis:null,FiezelProsody:prosody,FiezelNeuralVoice:Object.freeze({createVoiceService:o=>{createdOpts=o;return Object.freeze(inner)},normalizeText:x=>x,splitIntoChunks:x=>[x]})};
  env.globalThis=env;
  vm.runInNewContext(fs.readFileSync('features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js','utf8'),env);
  const svc=env.FiezelNeuralVoice.createVoiceService({env:{navigator:{standalone:true},FiezelProsody:prosody},streamSentences:true,prosody});
  assert.equal(createdOpts.appleHardChunkChars,80,'Apple emergency slice must roll back 32 -> 80 chars');
  assert.equal(createdOpts.prosody.punctuate('internal slice','en'),'internal slice','seam classifier must not invent terminal punctuation');
  assert.equal(createdOpts.prosody.gapAfter('internal slice','en'),0,'internal hard split must not receive sentence pause');
  assert.equal(createdOpts.prosody.gapAfter('real sentence.','en'),420,'real punctuation keeps prosody gap');
  const a=svc.speak('a'),b=svc.speak('b');
  assert.deepEqual(await Promise.all([a,b]),['a','b']);
  assert.equal(maxActive,1,'speech requests must never overlap the single-flight engine');
  assert.deepEqual(order.slice(0,4),['start:a','end:a','start:b','end:b']);

  let stableCalls=[],originalIndoPrepare=0,indoSpeak=0,timer=null;
  const stable=Object.freeze({
    speak:(text,o)=>{stableCalls.push({text,o});return Promise.resolve({provider:'stable'});},
    stop:()=>{stableCalls.push({stop:true});},
    prepare:()=>Promise.resolve({}),status:()=>({prepared:true,assetsCached:true})
  });
  const tutor={speak:(text,o)=>Promise.resolve({provider:'tutor',text,o}),stop(){},status:stable.status};
  const root={console,Promise,document:{getElementById:()=>({querySelector:s=>s==='.classroom-v3'?{}:null})},FiezelVoiceRuntime:stable,
    FiezelIndonesianVoice:Object.freeze({status:()=>({prepared:false,ready:false}),prepare:()=>{originalIndoPrepare++;return Promise.resolve({})},speak:()=>{indoSpeak++;return Promise.resolve({})}}),
    setTimeout:fn=>{timer=fn;return 1;}};
  root.globalThis=root;
  vm.runInNewContext(fs.readFileSync('features/neural-voice/fiezel-m0281-runtime-guard.js','utf8'),root);
  const status=root.FiezelIndonesianVoice.status();
  assert.equal(status.prepared,true,'shared base bundle must count as prepared');
  assert.equal(status.ready,false,'shared cache must not fabricate Indonesian worker readiness');
  await root.FiezelIndonesianVoice.prepare();
  assert.equal(originalIndoPrepare,0,'prepare must not instantiate second Indonesian Supertonic worker when shared bundle exists');
  root.FiezelVoiceRuntime=Object.freeze(Object.assign({},tutor,{__tutorIndonesianPatched:true}));
  timer();
  const out=await root.FiezelVoiceRuntime.speak('Original English teaching line',{lang:'id-ID'});
  assert.equal(out.provider,'stable');
  assert.equal(stableCalls[0].text,'Original English teaching line','Classroom rollback must preserve original English teaching text');
  assert.equal(stableCalls[0].o.lang,'en-US');
  assert.equal(indoSpeak,0,'Classroom emergency path must not spin Indonesian worker');

  const index=fs.readFileSync('index.html','utf8');
  const pre=index.indexOf('fiezel-m0281-prebootstrap-hotfix.js');
  const bootstrap=index.indexOf('fiezel-neural-voice-bootstrap.js');
  const guard=index.indexOf('fiezel-m0281-runtime-guard.js');
  const audibility=index.indexOf('fiezel-neural-voice-audibility-fix.js');
  const tutor=index.indexOf('fiezel-tutor-v3.js');
  assert(pre>0&&pre<bootstrap,'prebootstrap hotfix must load before bootstrap');
  assert(guard>audibility&&guard<tutor,'runtime guard must capture final base runtime before tutor override');
  console.log('PASS M028.1 seam/arbitration/shared-prepare/Classroom regression');
}
main().catch(error=>{console.error(error);process.exit(1);});