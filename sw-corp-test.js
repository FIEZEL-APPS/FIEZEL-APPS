const fs=require('fs');
const vm=require('vm');
const path=require('path');
let failures=0;
const check=(label,ok,detail)=>{if(ok)console.log('  ok   '+label);else{failures++;console.log('  FAIL '+label+(detail?' — '+detail:''))}};
const src=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
class H{constructor(init){this.m=init instanceof H?new Map(init.m):new Map(Object.entries(init||{}).map(([k,v])=>[k.toLowerCase(),v]))}get(k){return this.m.get(String(k).toLowerCase())||null}set(k,v){this.m.set(String(k).toLowerCase(),v)}}
class R{constructor(body,init={}){this.body=body;this.status=init.status??200;this.statusText=init.statusText||'';this.headers=init.headers instanceof H?init.headers:new H(init.headers);this.ok=this.status>=200&&this.status<300}clone(){return new R(this.body,{status:this.status,statusText:this.statusText,headers:this.headers})}}
function run(){const listeners={};let fetchCalls=0;const s={console,URL,Promise,Symbol,setTimeout,clearTimeout,Headers:H,Response:R,fetch:()=>{fetchCalls++;return Promise.resolve(new R('x'))},caches:{open:()=>Promise.resolve({addAll:()=>Promise.resolve(),put:()=>Promise.resolve(),match:()=>Promise.resolve()}),keys:()=>Promise.resolve([]),delete:()=>Promise.resolve(true),match:()=>Promise.resolve()},clients:{matchAll:()=>Promise.resolve([])},importScripts:()=>{s.self.FIEZEL_VERSION='5.19.0'},self:null};s.self=s;s.globalThis=s;s.location={origin:'https://fitrajft-ux.github.io'};s.registration={showNotification:()=>{},update:()=>Promise.resolve()};s.addEventListener=(n,f)=>(listeners[n]=listeners[n]||[]).push(f);vm.createContext(s);vm.runInContext(src,s);return{listeners,get fetchCalls(){return fetchCalls}}}
console.log('sw-corp-test');
check('COEP uses credentialless',src.includes("COEP_POLICY='credentialless'"));
check('WebKit popup-compatible COOP exists',src.includes("'same-origin-allow-popups'"));
check('SW revision marker exists',/const SW_REV='[^']+';/.test(src));
check('shell reinstall forces reload',src.includes("new Request(asset,{cache:'reload'})"));
const t=run();let captured=false;const req={url:'https://js.puter.com/v2/',method:'GET',mode:'no-cors'};(t.listeners.fetch||[]).forEach(fn=>fn({request:req,respondWith:()=>{captured=true}}));
check('cross-origin Puter request is not intercepted',captured===false);
check('cross-origin Puter request triggers no synthetic fetch',t.fetchCalls===0,'fetchCalls='+t.fetchCalls);
check('opaque synthetic 200 regression remains absent',!/new Response\(response\.body,\{status:200/.test(src));
check('version remains 5.19.0',fs.readFileSync(path.join(__dirname,'version.js'),'utf8').includes("'5.19.0'"));
if(failures){console.log(failures+' gate GAGAL');process.exit(1)}console.log('semua gate sw-corp LOLOS');