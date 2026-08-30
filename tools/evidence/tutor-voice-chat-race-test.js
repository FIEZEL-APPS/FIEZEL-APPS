#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const SRC=fs.readFileSync(path.join(__dirname,'features/tutor-classroom/fiezel-tutor-voice-chat.js'),'utf8');
const DIALOG=fs.readFileSync(path.join(__dirname,'features/tutor-classroom/fiezel-tutor-dialog.js'),'utf8');
const checks=[];let failed=false;
const check=(name,ok,details='')=>{checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok){failed=true;console.error('FAIL - '+name+(details?' :: '+details:''))}else console.log('ok   - '+name)};
const tick=()=>new Promise(r=>setImmediate(r));

function makeNode(){return{textContent:'',innerHTML:'',classList:{add(){},remove(){}},addEventListener(){},remove(){},focus(){}}}
function harness(){
  let active=true,nextTimer=1,stopCalls=0;
  const timers=new Map(),pendingAi=[],spoken=[];
  const subtitle=makeNode(),hint=makeNode(),button=makeNode(),dock=makeNode();
  const app={querySelector(sel){return active&&sel==='.classroom-v3'?{}:null}};
  const doc={
    documentElement:{lang:'id'},body:{appendChild(){}},
    getElementById(id){if(id==='app')return app;if(id==='tutorTalkDock')return dock;if(id==='tutorSubtitle')return subtitle;if(id==='tutorTalkHint')return hint;if(id==='tutorTalkButton')return button;return null},
    createElement(){return makeNode()}
  };
  const fakeSetTimeout=(fn,ms)=>{const id=nextTimer++;timers.set(id,{id,fn,ms,cleared:false});return id};
  const fakeClearTimeout=id=>{const t=timers.get(id);if(t)t.cleared=true};
  const sandbox={
    document:doc,
    FiezelTutorDialog:{
      createMemory:()=>({}),
      aiPrompt:q=>'PROMPT '+q,
      respond:q=>({id:'ID '+q,en:'EN '+q,intent:'open'})
    },
    askFiezelAI:prompt=>new Promise(resolve=>pendingAi.push({prompt,resolve})),
    FiezelVoiceSay:{say:input=>{spoken.push(input);return Promise.resolve(true)},stop:()=>{stopCalls++}},
    setTimeout:fakeSetTimeout,clearTimeout:fakeClearTimeout,console
  };
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC,sandbox,{filename:'fiezel-tutor-voice-chat.js'});
  return{
    api:sandbox.FiezelTutorVoiceChat,pendingAi,spoken,subtitle,hint,timers,
    setActive:v=>{active=!!v},stopCalls:()=>stopCalls,
    timer12:()=>[...timers.values()].filter(t=>t.ms===12000).at(-1),
    fire:t=>{if(!t||t.cleared)return false;t.fn();return true}
  };
}

(async()=>{
  check('tutor source owns question generation token',/questionGeneration/.test(SRC));
  check('busy cancel path invalidates pending answer',/if \(busy\) \{ cancelPendingAnswer\(true\)/.test(SRC));
  check('leaving Classroom invalidates pending answer',/else \{ cancelPendingAnswer\(true\); stopListening\(\); removeUi\(\); \}/.test(SRC));
  check('Core AI prompt explicitly requests spoken-English output',/Answer in clear, natural English/.test(DIALOG));

  {
    const h=harness();
    const old=h.api.ask('old');await tick();const oldTimer=h.timer12();
    const newer=h.api.ask('new');await tick();const newTimer=h.timer12();
    check('two questions own independent AI waits',h.pendingAi.length===2,'pending='+h.pendingAi.length);
    h.fire(oldTimer);const oldResult=await old;await tick();
    check('stale timeout/local fallback is inert',oldResult===false&&h.spoken.length===0&&!/ID old/.test(h.subtitle.textContent),'result='+oldResult+' spoken='+h.spoken.length+' subtitle='+h.subtitle.textContent);
    h.fire(newTimer);const newResult=await newer;await tick();
    check('current timeout/local fallback still speaks',newResult===true&&h.spoken.length===1&&h.spoken[0].en==='EN new','result='+newResult+' spoken='+JSON.stringify(h.spoken));
    check('current local answer still paints the current subtitle plus its intentional availability note',h.subtitle.textContent.startsWith('ID new')&&!/ID old/.test(h.subtitle.textContent),'subtitle='+h.subtitle.textContent);
  }

  {
    const h=harness();
    const p=h.api.ask('leave');await tick();const timer=h.timer12();
    h.setActive(false);h.api.sync();const stops=h.stopCalls();
    h.fire(timer);const r=await p;await tick();
    check('leaving Classroom kills late answer side effects',r===false&&h.spoken.length===0&&h.subtitle.textContent===''&&h.stopCalls()===stops,'result='+r+' spoken='+h.spoken.length+' subtitle='+h.subtitle.textContent);
  }

  {
    const h=harness();
    const p=h.api.ask('ai success');await tick();const timer=h.timer12();
    h.pendingAi[0].resolve('A clear English AI answer.');const r=await p;await tick();
    check('current core-AI answer is actually sent to shared voice door',r===true&&h.spoken.length===1&&h.spoken[0].en==='A clear English AI answer.','result='+r+' spoken='+JSON.stringify(h.spoken));
    check('core-AI reply leaves id empty so shared voice door owns subtitle translation',h.spoken[0]&&h.spoken[0].id==='','input='+JSON.stringify(h.spoken[0]));
    check('fast AI success clears its 12s timeout',!!timer&&timer.cleared===true,'timer='+JSON.stringify(timer));
  }

  fs.writeFileSync(path.join(__dirname,'TUTOR-VOICE-CHAT-RACE-REPORT.json'),JSON.stringify({schema:'fiezel-tutor-voice-chat-race-v1',pass:!failed,checks},null,2));
  console.log(`tutor-voice-chat-race-test: ${checks.filter(x=>x.status==='PASS').length}/${checks.length} ${failed?'FAIL':'PASS'}`);
  process.exit(failed?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
