import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path';
const ROOT=process.cwd();
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
await ctx.route('**/*',r=>{const u=new URL(r.request().url());const rel=decodeURIComponent(u.pathname).replace(/^\/+/,'');const p=path.resolve(ROOT,rel||'index.html');if(!fs.existsSync(p)||fs.statSync(p).isDirectory())return r.abort();r.fulfill({body:fs.readFileSync(p),contentType:p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':'text/html'})});
const page=await ctx.newPage();
await page.goto('http://localhost:4173/index.html');await page.waitForTimeout(1500);
await page.evaluate(()=>{document.querySelectorAll('#fiezelBootSplash,.fz-auth').forEach(e=>e.remove());document.documentElement.classList.remove('fz-booting');document.body.classList.remove('fz-auth-open')});
for (const v of ['home','latihan','classroom','progress','online','game']){
await page.evaluate(v=>window.go(v),v);await page.waitForTimeout(400);await page.evaluate(()=>document.body.classList.remove('fz-auth-open'));await page.waitForTimeout(300);
console.log(v, JSON.stringify(await page.evaluate(()=>{const t=document.querySelector('header.topbar');const c=getComputedStyle(t);const r=t.getBoundingClientRect();return{h:r.height,w:r.width,disp:c.display,pos:c.position,maxh:c.maxHeight,ov:c.overflow,body:document.body.className,pt:getComputedStyle(document.querySelector('main.app')).paddingTop,off:t.offsetHeight}})));}
await b.close();
