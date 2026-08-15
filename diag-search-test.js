'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const source=fs.readFileSync(path.join(__dirname,'features/neural-voice/fiezel-diag-panel.js'),'utf8');
const buildMatch=source.match(/var DIAG_BUILD = '(m025-\d+)'/);
assert.ok(buildMatch,'Diagnostics source must expose an m025-N build marker');
const expectedBuild=buildMatch[1];

function element(tag){
  return{
    tagName:tag,children:[],listeners:{},dataset:{},id:'',className:'',type:'',textContent:'',value:'',
    readOnly:false,spellcheck:true,placeholder:'',autocomplete:'',selectionStart:0,selectionEnd:0,focused:false,
    classList:{_set:new Set(),add(n){this._set.add(n)},remove(n){this._set.delete(n)},contains(n){return this._set.has(n)}},
    setAttribute(k,v){this.dataset[k]=String(v)},appendChild(x){this.children.push(x);return x},
    addEventListener(k,v){this.listeners[k]=v},focus(){this.focused=true},
    setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b}
  };
}
function find(node,id){
  if(!node)return null;
  if(node.id===id)return node;
  for(const child of node.children||[]){const hit=find(child,id);if(hit)return hit}
  return null;
}

const body=element('body');
const diag=[
  {phase:'wasm_policy',policy:'apple-standalone-single-thread-direct-default',numThreads:1,proxy:false},
  {phase:'adapter_generate_dispatched',requestId:'a'},
  {phase:'adapter_generate_resolved',requestId:'a'},
  {phase:'adapter_generate_dispatched',requestId:'b'}
];
const ctx={
  console,Promise,JSON,Date,Object,String,setTimeout,
  document:{readyState:'complete',body,createElement:element,addEventListener(){}},
  location:{origin:'https://fitrajft-ux.github.io',href:'https://fitrajft-ux.github.io/FIEZEL-APPS/'},
  navigator:{userAgent:'iPhone',standalone:true},
  matchMedia:()=>({matches:true}),
  // Keep the raw localStorage target absent so this test measures exactly the
  // two runtimeDiagnostics occurrences. Real exports may legitimately contain
  // the same phase in both target and runtimeDiagnostics; search counts all
  // visible occurrences by design.
  localStorage:{getItem:()=>null},
  FIEZEL_VERSION:'5.19.0',
  FiezelVoiceRuntime:{status:()=>({wasmPolicy:'apple-standalone-single-thread-direct-default'}),diagnostics:()=>diag}
};
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(source,ctx,{filename:'fiezel-diag-panel.js'});

const host=find(body,'fiezelDiagHost');
const open=find(body,'fiezelDiagOpen');
const text=find(body,'fiezelDiagText');
const search=find(body,'fiezelDiagSearch');
const count=find(body,'fiezelDiagSearchCount');
const searchBar=find(body,'fiezelDiagSearchBar');
assert.ok(host&&open&&text&&search&&count&&searchBar,`${expectedBuild} search controls must mount`);
assert.equal(host.dataset['data-diag-build'],expectedBuild);

open.listeners.click();
const before=text.value;
assert.ok(before.includes(`"diagBuild": "${expectedBuild}"`),'export must identify the current Diagnostics build');
assert.ok(before.includes('adapter_generate_dispatched'));

search.value='adapter_generate_dispatched';
search.listeners.input();
assert.equal(count.textContent,'1/2','first search result should be selected');
assert.equal(text.value.slice(text.selectionStart,text.selectionEnd).toLowerCase(),'adapter_generate_dispatched');
const previous=searchBar.children.find(x=>x.textContent==='↑ Sebelumnya');
const next=searchBar.children.find(x=>x.textContent==='↓ Berikutnya');
assert.ok(previous&&next,'previous/next controls must exist');
next.listeners.click();
assert.equal(count.textContent,'2/2','next must advance');
next.listeners.click();
assert.equal(count.textContent,'1/2','next must wrap');
previous.listeners.click();
assert.equal(count.textContent,'2/2','previous must wrap');

search.value='WASM_POLICY';
search.listeners.input();
assert.equal(count.textContent,'1/1','search must be case-insensitive');
assert.equal(text.value,before,'search must never mutate exported diagnostics payload');

search.value='not-present-sentinel';
search.listeners.input();
assert.equal(count.textContent,'0 hasil');

console.log(`FIEZEL diagnostics ${expectedBuild} search regression: PASS`);