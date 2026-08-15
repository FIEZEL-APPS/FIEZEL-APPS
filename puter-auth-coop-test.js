'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');

class HeadersMock{
  constructor(init){
    this.map=new Map();
    if(init instanceof HeadersMock){for(const [k,v] of init.map)this.map.set(k,v);return}
    for(const [k,v] of Object.entries(init||{}))this.map.set(String(k).toLowerCase(),String(v));
  }
  get(k){return this.map.get(String(k).toLowerCase())||null}
  set(k,v){this.map.set(String(k).toLowerCase(),String(v))}
}
class ResponseMock{
  constructor(body,init={}){this.body=body;this.status=init.status??200;this.statusText=init.statusText||'';this.headers=init.headers instanceof HeadersMock?init.headers:new HeadersMock(init.headers);this.ok=this.status>=200&&this.status<300}
  clone(){return new ResponseMock(this.body,{status:this.status,statusText:this.statusText,headers:this.headers})}
}
function load(userAgent){
  const listeners={};
  const cached=new ResponseMock('cached',{'headers':{'content-type':'text/html'}});
  const sandbox={console,URL,Promise,Symbol,setTimeout,clearTimeout,Headers:HeadersMock,Response:ResponseMock,Request:function(){},navigator:{userAgent},fetch:async()=>new ResponseMock('network'),caches:{match:async()=>cached,open:async()=>({addAll:async()=>{},put:async()=>{}}),keys:async()=>[],delete:async()=>true},clients:{matchAll:async()=>[]},importScripts:()=>{sandbox.self.FIEZEL_VERSION='5.19.0'},self:null};
  sandbox.self=sandbox;sandbox.globalThis=sandbox;sandbox.location={origin:'https://fitrajft-ux.github.io'};sandbox.registration={showNotification:()=>{},update:async()=>{}};sandbox.skipWaiting=async()=>{};sandbox.addEventListener=(name,fn)=>(listeners[name]=listeners[name]||[]).push(fn);
  vm.createContext(sandbox);vm.runInContext(src,sandbox,{filename:'sw.js'});
  return{listeners};
}
async function navigationHeaders(userAgent){
  const t=load(userAgent);let promise=null;
  const request={url:'https://fitrajft-ux.github.io/FIEZEL-APPS/',method:'GET',mode:'navigate'};
  for(const fn of t.listeners.fetch||[])fn({request,respondWith:value=>{promise=value}});
  assert.ok(promise,'same-origin navigation must be handled by the service worker');
  return(await promise).headers;
}

(async()=>{
  const safari='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
  const chrome='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
  const safariHeaders=await navigationHeaders(safari);
  assert.equal(safariHeaders.get('Cross-Origin-Opener-Policy'),'same-origin-allow-popups','WebKit navigation must preserve the Puter popup opener channel');
  assert.equal(safariHeaders.get('Cross-Origin-Embedder-Policy'),'credentialless');
  const chromeHeaders=await navigationHeaders(chrome);
  assert.equal(chromeHeaders.get('Cross-Origin-Opener-Policy'),'same-origin','Chromium must retain the isolation-capable opener policy');

  const t=load(safari);let intercepted=false;
  const puterRequest={url:'https://js.puter.com/v2/',method:'GET',mode:'no-cors'};
  for(const fn of t.listeners.fetch||[])fn({request:puterRequest,respondWith:()=>{intercepted=true}});
  assert.equal(intercepted,false,'third-party Puter SDK traffic must remain outside the service worker');
  assert.ok(/const SW_REV='[^']+';/.test(src),'service worker must retain a non-empty byte revision marker for shell refresh');
  assert.ok(src.includes("new Request(asset,{cache:'reload'})"),'service-worker reinstall must reload shell files instead of reusing stale HTTP cache bytes');
  assert.ok(fs.readFileSync(path.join(__dirname,'version.js'),'utf8').includes("'5.19.0'"),'cache version must stay 5.19.0 so the neural asset cache is preserved');
  console.log('FIEZEL Puter auth/COOP regression: PASS');
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});