'use strict';

/**
 * Regression contract for grammar memory-cue provenance.
 *
 * A recall/memory cue is pedagogical material attached to the ACTIVE grammar lesson.
 * It may contrast a misconception, but it must not silently borrow the rule/lesson identity
 * of another grammar point. This test is intentionally stricter than family/CEFR proximity.
 *
 * The runtime is allowed to expose provenance as sourceId / conceptId / lessonSkill on the
 * question or on each option. If provenance is exposed, every recall-memory option must
 * resolve to the active lesson identity. Missing provenance is treated as a failure: a
 * memory cue whose origin cannot be established is not safe to render.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
const elements = {};
const element = id => elements[id] ||= { id, innerHTML:'', textContent:'', className:'', dataset:{}, style:{setProperty(){}}, classList:classList(), setAttribute(){}, addEventListener(){}, append(){}, focus(){}, onclick:null, disabled:false };
const store = {};
const fileIndex = new Map();
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes:true })) {
    if (['node_modules','.git','vendor','assets','docs'].includes(e.name)) continue;
    const full = path.join(dir,e.name);
    if (e.isDirectory()) walk(full); else if (!fileIndex.has(e.name)) fileIndex.set(e.name,full);
  }
})(root);
const context = {
  console:{log(){},warn(){},error(){},info(){}},
  document:{baseURI:'http://localhost/',body:{classList:classList()},visibilityState:'visible',getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>element('generated'),addEventListener(){}},
  localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>delete store[k]},
  fetch:async url=>{const f=fileIndex.get(String(url).split('/').pop());return f?{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(f,'utf8'))}:{ok:false,status:404,json:async()=>{throw new Error('404')}}},
  Notification:Object.assign(function(){},{permission:'granted',requestPermission:async()=> 'granted'}),
  window:null,self:null,navigator:{vibrate:()=>true},Date,Intl,Math,URL,Error,Promise,JSON,
  setTimeout,clearTimeout,setInterval:()=>({unref(){}}),clearInterval(){},
  SpeechSynthesisUtterance:function(){},speechSynthesis:{cancel(){},speak(){}},
  AudioContext:class{constructor(){this.currentTime=0;this.state='running';this.destination={}}createGain(){return{gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}createOscillator(){return{type:'sine',frequency:{value:0,setValueAtTime(){}},connect(){},start(){},stop(){}}}resume(){}suspend(){}close(){}},
};
context.window=context;context.self=context;
context.FIEZEL_VERSION=JSON.parse(fs.readFileSync(path.join(root,'VERSION.json'),'utf8')).version;
context.window.scrollTo=()=>{};context.window.requestAnimationFrame=fn=>fn();
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),context,{filename:'app.js'});

const templates=JSON.parse(fs.readFileSync(path.join(root,'grammar-templates.json'),'utf8')).templates;
const state=context.__getFiezelState();

function identity(x) {
  if (!x || typeof x !== 'object') return '';
  return String(x.sourceId || x.conceptId || x.lessonSkill || x.skill || '').trim();
}
function assert(ok,msg){if(!ok)throw new Error(msg)}

setTimeout(() => {
  let checked=0, failures=[];
  const previous={activeLevel:state.preferences.activeLevel||'',levelMode:state.preferences.levelMode||'placement'};
  for (const lesson of templates) {
    state.preferences={...state.preferences,activeLevel:lesson.cefr,levelMode:'manual'};
    const qs=context.buildGrammarLessonQuestions(lesson.subskill,25);
    for (const q of qs) {
      if (q.practiceMode!=='recall_memory_cue' && q.mode!=='recall_memory_cue') continue;
      checked++;
      const expected=String(q.lessonSkill||q.skill||lesson.subskill).trim();
      const sources=[];
      if (Array.isArray(q.optionSources)) sources.push(...q.optionSources);
      if (Array.isArray(q.options)) {
        for (const o of q.options) if (o && typeof o==='object') sources.push(o);
      }
      if (!sources.length) {
        failures.push(`${lesson.id}/${lesson.subskill}: recall_memory_cue exposes no option provenance`);
        continue;
      }
      for (const source of sources) {
        const actual=identity(source);
        if (!actual || actual!==expected) failures.push(`${lesson.id}/${lesson.subskill}: expected ${expected}, got ${actual||'(missing)'} in ${JSON.stringify(source).slice(0,180)}`);
      }
    }
  }
  state.preferences={...state.preferences,...previous};
  assert(checked>0,'no recall_memory_cue questions were generated; test cannot establish the invariant');
  assert(!failures.length,`recall-memory provenance leaks detected (${failures.length}):\n${failures.slice(0,20).join('\n')}`);
  console.log(`PASS grammar-memory-scope: ${checked} recall_memory_cue questions are source-bound`);
},0);
