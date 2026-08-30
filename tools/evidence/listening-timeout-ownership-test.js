#!/usr/bin/env node
'use strict';
const path=require('path');
const addon=require(path.join(__dirname,'features','speaking-listening','fiezel-speaking-listening-addon.js'));
const checks=[];let failed=false;
const check=(name,ok,details='')=>{checks.push({name,status:ok?'PASS':'FAIL',details});if(!ok){failed=true;console.error('FAIL - '+name+(details?' :: '+details:''))}else console.log('ok   - '+name)};

function fakeNode(selector,owner){
  let markup='';
  return{
    selector,disabled:selector==='[data-work]',textContent:'',handlers:{},dataset:{},hidden:false,className:'',
    get innerHTML(){return markup},
    set innerHTML(v){markup=String(v);if(owner)owner.dropDetached()},
    addEventListener(type,fn){(this.handlers[type]=this.handlers[type]||[]).push(fn)},
    click(){return Promise.all((this.handlers.click||[]).map(fn=>fn({currentTarget:this})))},
    setAttribute(){},getAttribute(){return null},hasAttribute(){return false},querySelector(){return null},querySelectorAll(){return[]},append(){},remove(){}
  };
}
function fakeRoot(){
  let markup='';const nodes=new Map();
  const host={
    get innerHTML(){return markup},
    set innerHTML(v){markup=String(v);nodes.clear()},
    dropDetached(){for(const selector of [...nodes.keys()]){const attribute=selector.replace(/^\[|\]$/g,'');if(!markup.includes(attribute))nodes.delete(selector)}},
    node(selector){if(!nodes.has(selector))nodes.set(selector,fakeNode(selector,host));return nodes.get(selector)},
    querySelector(selector){return host.node(selector)},querySelectorAll(){return[]}
  };
  return host;
}
const item=Object.freeze({id:'listen_timeout_1',level:'A2',mode:'gist',question:'Q',script:'secret audio script',options:['a','b'],answerIndex:0,voice:'af_bella',maxReplays:2});
function controllerWith(tts){
  const c=new addon.__test.Controller({tts,config:{storageKey:'fiezel-listening-timeout-proof'}});
  c.store.save=()=>c.store.state;c.root=fakeRoot();c.domain='listening';c.items=[item];c.index=0;c.renderSession();return c;
}
function timerHarness(){
  let next=1;const timers=new Map();
  const set=(fn,ms)=>{const id=next++;timers.set(id,{id,fn,ms,cleared:false,fired:false});return id};
  const clear=id=>{const t=timers.get(id);if(t)t.cleared=true};
  return{set,clear,timers,last25:()=>[...timers.values()].filter(t=>t.ms===25000).at(-1),fire:t=>{if(!t||t.cleared)return false;t.fired=true;t.fn();return true}};
}
async function withFakeTimers(run){
  const realSet=global.setTimeout,realClear=global.clearTimeout;const h=timerHarness();
  global.setTimeout=h.set;global.clearTimeout=h.clear;
  try{return await run(h)}finally{global.setTimeout=realSet;global.clearTimeout=realClear}
}

(async()=>{
  {
    let resolvePlay;const calls={play:0,stop:0};
    const tts={play(){calls.play++;return new Promise(r=>{resolvePlay=r})},stop(){calls.stop++}};
    const c=controllerWith(tts);const play=c.root.querySelector('[data-play]');
    await withFakeTimers(async timers=>{
      const click=play.click();const timeout=timers.last25();
      check('listening arms named 25s timeout for pending playback',!!timeout,'timer='+JSON.stringify(timeout));
      timers.fire(timeout);await click;
      check('timeout failure stops the still-owned TTS source',calls.stop===1,'stop='+calls.stop);
      check('timeout keeps answer locked and records no_audio',c.noAudio===true&&c.root.querySelector('[data-work]').disabled===true,'noAudio='+c.noAudio);
      resolvePlay({provider:'late-provider'});await Promise.resolve();
      check('late completion after timeout cannot reclaim UI ownership',c.noAudio===true&&c.root.querySelector('[data-work]').disabled===true,'noAudio='+c.noAudio);
    });
  }
  {
    const calls={stop:0};const tts={play(){return Promise.resolve({provider:'ok'})},stop(){calls.stop++}};
    const c=controllerWith(tts);const play=c.root.querySelector('[data-play]');
    await withFakeTimers(async timers=>{
      await play.click();const timeout=timers.last25();
      check('successful playback clears its 25s timeout',!!timeout&&timeout.cleared===true,'timer='+JSON.stringify(timeout));
      check('successful playback does not stop the source after completion',calls.stop===0,'stop='+calls.stop);
      check('successful playback still unlocks the listening work',c.root.querySelector('[data-work]').disabled===false,'disabled='+c.root.querySelector('[data-work]').disabled);
    });
  }
  {
    const calls={stop:0};const tts={play(){return Promise.reject(new Error('provider_failed'))},stop(){calls.stop++}};
    const c=controllerWith(tts);const play=c.root.querySelector('[data-play]');
    await withFakeTimers(async timers=>{
      await play.click();const timeout=timers.last25();
      check('immediate playback failure also cancels its pending timeout',!!timeout&&timeout.cleared===true,'timer='+JSON.stringify(timeout));
      check('immediate playback failure stops partial TTS state',calls.stop===1,'stop='+calls.stop);
    });
  }
  console.log(`listening-timeout-ownership-test: ${checks.filter(x=>x.status==='PASS').length}/${checks.length} ${failed?'FAIL':'PASS'}`);
  process.exit(failed?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
