'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-neural-voice-audibility-fix.js'),'utf8');
const key='fiezel-neural-voice-diagnostics-v1';
const seeded=Array.from({length:80},(_,i)=>({t:i+1,phase:'seed_'+(i+1)}));
const store={[key]:JSON.stringify(seeded)};
const runtime={status:()=>({ready:true,prepared:true}),speak:async()=>({provider:'neural'}),stop(){}};
const ctx={
  console,Date,Promise,setTimeout,clearTimeout,
  FIEZEL_VERSION:'5.19.0',FiezelVoiceRuntime:runtime,
  FiezelWebAudioPlayer:{createPlayer:()=>({warm:()=>true})},
  localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)}}
};
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'audibility-retention.js'});
const afterLoad=JSON.parse(store[key]);
assert.equal(afterLoad.length,81,'audibility diagnostics must not truncate the shared trace to 30 entries');
assert.equal(afterLoad[0].phase,'seed_1','old diagnostic context must survive an audibility write');
assert.equal(afterLoad[80].phase,'audibility_patch_loaded');
console.log('FIEZEL neural diagnostics retention regression: PASS');
