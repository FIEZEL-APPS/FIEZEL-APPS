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
  const env={console,setTimeout,clearTimeout,Promise,globalThis:null,FiezelProsody:prosody,
    FiezelWebAudioPlayer:Object.freeze({createPlayer:()=>Object.freeze({play(){},stop(){},warm(){},close(){}})}),
    FiezelNeuralVoice:Object.freeze({createVoiceService:o=>{createdOpts=o;return Object.freeze(inner)},normalizeText:x=>x,splitIntoChunks:x=>[x]})};
  env.globalThis=env;
  vm.runInNewContext(fs.readFileSync('features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js','utf8'),env);
  const svc=env.FiezelNeuralVoice.createVoiceService({env:{navigator:{standalone:true},FiezelProsody:prosody},streamSentences:true,prosody});
  assert.equal(createdOpts.appleHardChunkChars,128,'M028.2 Apple integrity cap must be 128 chars');
  assert.equal(createdOpts.streamSentences,false,'M028.2 Apple integrity rollback must disable sentence streaming');
  assert.equal(createdOpts.prosody.punctuate('internal slice','en'),'internal slice','seam classifier must not invent terminal punctuation');
  assert.equal(createdOpts.prosody.gapAfter('internal slice','en'),0,'internal hard split must not receive sentence pause');
  assert.equal(createdOpts.prosody.gapAfter('real sentence.','en'),420,'real punctuation keeps prosody gap');
  const a=svc.speak('a'),b=svc.speak('b');
  assert.deepEqual(await Promise.all([a,b]),['a','b']);
  assert.equal(maxActive,1,'speech requests must never overlap the single-flight engine');
  assert.deepEqual(order.slice(0,4),['start:a','end:a','start:b','end:b']);

  // m025-95: blok verifikasi suara Indonesia dicabut bersama mesinnya. Yang tersisa di
  // berkas ini tetap berlaku: batas potongan Apple, aliran tunggal, dan urutan muat.

  const index=fs.readFileSync('index.html','utf8');
  const pre=index.indexOf('fiezel-m0281-prebootstrap-hotfix.js');
  const bootstrap=index.indexOf('fiezel-neural-voice-bootstrap.js');
  assert(pre>0&&pre<bootstrap,'prebootstrap hotfix must load before bootstrap');
  assert(index.indexOf('fiezel-m0281-runtime-guard.js')===-1,
    'penjaga runtime M028.2 sudah dihapus bersama verifikasi suara Indonesia');
  console.log('PASS M028.2 Apple continuity/arbitration/shared-verification/Classroom regression');
}
main().catch(error=>{console.error(error);process.exit(1);});