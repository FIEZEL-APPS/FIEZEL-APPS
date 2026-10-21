/* F6 — di HALAMAN APLIKASI yang sama: mana yang menggantung, coreWorkerExec atau fetch mentah? */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import https from 'node:https'; import { spawnSync } from 'node:child_process';
const BRIDGE='https://api.fiezel.my.id', APP_HOST='fiezel.my.id', APP_DIR='/home/user/workspace/wt-f6client';
const FZ=fs.readFileSync('/tmp/fzid.txt','utf8').trim();
const { chromium } = await import('playwright');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'f6a-')); const k=path.join(tmp,'k.pem'), c=path.join(tmp,'c.pem');
spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',k,'-out',c,'-days','2','-subj',`/CN=${APP_HOST}`,'-addext',`subjectAltName=DNS:${APP_HOST},IP:127.0.0.1`]);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.wasm':'application/wasm','.mp3':'audio/mpeg','.wav':'audio/wav','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8'};
const server=https.createServer({key:fs.readFileSync(k),cert:fs.readFileSync(c)},(req,res)=>{let p='/';try{p=decodeURIComponent(new URL(req.url,'https://l').pathname)}catch{};const t=path.resolve(APP_DIR,p==='/'?'index.html':p.replace(/^\/+/,''));fs.readFile(t,(e,b)=>{if(e){res.writeHead(404);return res.end('nf')}res.writeHead(200,{'Content-Type':MIME[path.extname(t)]||'application/octet-stream','Cache-Control':'no-store'});res.end(b)})});
await new Promise(r=>server.listen(0,'127.0.0.1',r)); const port=server.address().port;
const OFF={health:'off',config:'off',auth:'off',quota:'off',ai:'off',tts:'off',usage:'off'};
const browser=await chromium.launch({args:[`--host-resolver-rules=MAP ${APP_HOST}:443 127.0.0.1:${port}`,'--ignore-certificate-errors']});
const ctx=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.addCookies([{name:'fz_id',value:FZ,domain:'.fiezel.my.id',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
const page=await ctx.newPage();
await page.addInitScript(({cfg})=>{let v=cfg;Object.defineProperty(window,'FIEZEL_CF_CONFIG',{configurable:true,get:()=>v,set:()=>{}})},{cfg:{enabled:true,base:BRIDGE,endpoints:{...OFF,quota:'on'}}});
const ev=[]; page.on('response',r=>{if(r.url().startsWith(BRIDGE))ev.push('resp '+r.status()+' '+r.url().replace(BRIDGE,''))});
page.on('requestfailed',r=>{if(r.url().startsWith(BRIDGE))ev.push('failed '+(r.failure()?.errorText||'')+' '+r.url().replace(BRIDGE,''))});
page.on('console',m=>{const t=m.text(); if(/quota|cf|fetch|error/i.test(t)&&ev.length<80)ev.push('con '+m.type()+': '+t.slice(0,140))});
await page.goto(`https://${APP_HOST}/`,{waitUntil:'domcontentloaded'}).catch(e=>ev.push('nav '+e.message));
await page.waitForTimeout(6000);
const info=await page.evaluate(async ([b])=>{
  const res={};
  res.sw={didukung:'serviceWorker' in navigator, controller:!!(navigator.serviceWorker&&navigator.serviceWorker.controller), reg:0};
  try{const rs=await navigator.serviceWorker.getRegistrations();res.sw.reg=rs.length}catch(e){res.sw.regErr=String(e.message)}
  const timed=(label,fn)=>{const t0=Date.now();return Promise.race([fn().then(v=>({label,...v,ms:Date.now()-t0}),e=>({label,err:String(e.name)+':'+String(e.message),ms:Date.now()-t0})),new Promise(r=>setTimeout(()=>r({label,gantung:true,ms:Date.now()-t0}),9000))])};
  res.raw=await timed('fetch mentah',async()=>{const r=await fetch(b+'/api/quota',{credentials:'include',mode:'cors',cache:'no-store'});return {status:r.status}});
  res.app=await timed('coreWorkerExec',async()=>{const r=await window.coreWorkerExec('/api/quota',{});return {status:r.status}});
  res.raw2=await timed('fetch mentah lagi',async()=>{const r=await fetch(b+'/api/quota',{credentials:'include',mode:'cors',cache:'no-store'});return {status:r.status}});
  res.mode=window.FiezelCfKillSwitch?window.FiezelCfKillSwitch.mode('quota'):null;
  res.state=window.FiezelCfKillSwitch?window.FiezelCfKillSwitch.state().status:null;
  res.fetchNative=String(window.fetch).slice(0,80);
  return res;
},[BRIDGE]);
console.log(JSON.stringify(info,null,1));
console.log('EVENTS:',ev.join(' ; ').slice(0,3000));
await browser.close(); await new Promise(r=>server.close(r)); try{fs.rmSync(tmp,{recursive:true,force:true})}catch{}
