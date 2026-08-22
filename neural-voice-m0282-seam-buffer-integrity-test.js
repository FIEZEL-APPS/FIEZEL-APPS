'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

async function main(){
  const preSource=fs.readFileSync('features/neural-voice/fiezel-m0281-prebootstrap-hotfix.js','utf8');
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


  // 3) Audiobook prefetch must still reach the inner warm cache while a serialized speak is playing.
  let resolveSpeak;
  const warmCalls=[];
  const serialRoot={console,Promise,setTimeout,clearTimeout,
    FiezelNeuralVoice:Object.freeze({
      createVoiceService:()=>Object.freeze({
        speak:()=>new Promise(resolve=>{resolveSpeak=resolve;}),
        stop(){},
        prefetch:(text,options)=>{warmCalls.push({text,options});return Promise.resolve(true);}
      }),
      normalizeText:x=>x,
      splitIntoChunks:x=>[x]
    })};
  serialRoot.globalThis=serialRoot;
  vm.runInNewContext(preSource,serialRoot);
  const serialized=serialRoot.FiezelNeuralVoice.createVoiceService({env:{navigator:{standalone:false}}});
  const speaking=serialized.speak('Current sentence.');
  assert.equal(await serialized.prefetch('Next sentence.',{voice:'test'}),true,
    'warm-up must not be blocked for the whole playback lifetime of serialized speak()');
  assert.deepEqual(warmCalls.map(x=>x.text),['Next sentence.']);
  resolveSpeak({provider:'done'});
  await speaking;
  assert.doesNotMatch(preSource,/pending\s*>\s*0\s*\|\|\s*typeof inner\.prefetch/,
    'the emergency serializer must not starve audiobook next-line prefetch');

  // 4) m025-95: verifikasi suara Indonesia dihapus bersama mesinnya, dan penjaga
  //    runtime M028.2 ikut dihapus karena seluruh isinya adalah blok itu. Yang dijaga
  //    sekarang adalah keduanya benar-benar tidak kembali diam-diam.
  assert.equal(fs.existsSync('features/neural-voice/fiezel-m0281-runtime-guard.js'),false,
    'penjaga runtime M028.2 harus tetap terhapus');
  assert.doesNotMatch(indexSource,/fiezel-m0281-runtime-guard\.js/,
    'index tidak boleh memuat penjaga yang sudah dihapus');

  // 5) m025-96: gerbang unduhan tidak lagi dimatikan melainkan DIHAPUS. Suara dirender
  //    di server, jadi tidak ada bundel yang perlu disiapkan sebelum FIEZEL bisa bicara.
  assert.equal(fs.existsSync('features/neural-voice/fiezel-voice-bundle-gate.js'),false,
    'gerbang unduhan harus tetap terhapus');
  assert.doesNotMatch(indexSource,/fiezel-voice-bundle-gate\.js/,
    'index tidak boleh memuat gerbang yang sudah dihapus');

  // 6) No dead staging module or extra load-order mutation may remain.
  assert.equal(fs.existsSync('features/neural-voice/fiezel-m0282-audioedge-hotfix.js'),false,'unwired staging module must be removed');
  assert.doesNotMatch(indexSource,/fiezel-m0282-audioedge-hotfix\.js/,'index must not carry an extra hotfix script');
  assert.match(preSource,/fiezel-m0282-prebootstrap-integrity-v2/);

  console.log('PASS M028.2 seam/buffer/PCM-edge integrity + m025-95 pembongkaran suara Indonesia');
}
main().catch(error=>{console.error(error);process.exit(1);});