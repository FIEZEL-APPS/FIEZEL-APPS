const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs=require('fs');
const SEED=fs.readFileSync(process.env.SP+'/ux/seed.json','utf8').trim();
const VIEWS=['home','vocab','grammar','reading','skills','listening','speaking','writing','test','progress','classroom','library'];
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await ctx.route('**js.puter.com/**',r=>r.abort());
 const p=await ctx.newPage();
 await p.addInitScript(s=>{localStorage.setItem('fiezel-v4-state',s);localStorage.setItem('fiezel-splash-seen-v1','2026-08-29');localStorage.setItem('fiezel-onboarding-v1',JSON.stringify({done:true,at:Date.now(),via:'finish',name:'Rara',goal:'general',level:'A2'}));localStorage.setItem('fiezel-tour-v1',JSON.stringify({done:true,seen:['home']}))},SEED);
 await p.goto('http://127.0.0.1:8931/index.html',{waitUntil:'load',timeout:60000});
 await p.waitForTimeout(3200);
 await p.evaluate(()=>{['authGate','welcome','fzRitual'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove()})});
 await p.addScriptTag({content:`
 window.__lum=function(c){const m=c.match(/[\\d.]+/g);if(!m)return null;const [r,g,bl]=m.slice(0,3).map(Number);const a=m.length>3?Number(m[3]):1;if(a===0)return null;const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(bl)};
 window.__bg=function(el){let n=el;while(n&&n!==document.documentElement){const c=getComputedStyle(n).backgroundColor;const m=c.match(/[\\d.]+/g);if(m&&(m.length<4||Number(m[3])>0.6))return c;n=n.parentElement}return 'rgb(255,249,238)'};
 window.__cr=function(el){const fg=window.__lum(getComputedStyle(el).color), bg=window.__lum(window.__bg(el));if(fg==null||bg==null)return null;const L=Math.max(fg,bg),D=Math.min(fg,bg);return (L+0.05)/(D+0.05)};
 `});
 const out={};
 for(const v of VIEWS){
  await p.evaluate(x=>window.go(x),v); await p.waitForTimeout(1300);
  await p.evaluate(()=>{['authGate','welcome','fzRitual'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove()})});
  out[v]=await p.evaluate(()=>{
   const app=document.getElementById('app');
   const vis=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>2&&r.height>2&&s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'};
   const isBox=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();const bd=parseFloat(s.borderTopWidth)>0;const bgm=s.backgroundColor.match(/[\d.]+/g);const bg=bgm&&(bgm.length<4||Number(bgm[3])>0.05)&&s.backgroundColor!=='rgba(0, 0, 0, 0)';const sh=s.boxShadow!=='none';return (bd||bg||sh)&&r.width>=100&&r.height>=44};
   const all=[...app.querySelectorAll('*')].filter(vis);
   // nesting depth of boxes
   let maxDepth=0, deepSamples=[];
   for(const el of all){ if(!isBox(el))continue; let d=0,n=el.parentElement; while(n&&n!==app){if(isBox(n))d++;n=n.parentElement} if(d>maxDepth)maxDepth=d; if(d>=2)deepSamples.push({cls:el.className.toString().slice(0,50),d,txt:(el.textContent||'').trim().slice(0,40)}); }
   // contrast failures on text
   const fails=[];
   for(const el of all){
     const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
     if(t.length<2)continue;
     const s=getComputedStyle(el); const fs=parseFloat(s.fontSize); const fw=parseInt(s.fontWeight)||400;
     const cr=window.__cr(el); if(cr==null)continue;
     const large=(fs>=24)||(fs>=18.66&&fw>=700); const need=large?3:4.5;
     if(cr<need) fails.push({txt:t.slice(0,44),cr:Math.round(cr*100)/100,fs:Math.round(fs*10)/10,fw,need,cls:el.className.toString().slice(0,40)});
   }
   // tiny text
   const tiny=[]; for(const el of all){const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').trim(); if(t.length<2)continue; const fs=parseFloat(getComputedStyle(el).fontSize); if(fs<12) tiny.push({txt:t.slice(0,34),fs:Math.round(fs*10)/10})}
   // touch targets
   const ctrls=all.filter(el=>['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(el.tagName)||el.getAttribute('role')==='button'||el.hasAttribute('onclick'));
   const small=ctrls.filter(el=>{const r=el.getBoundingClientRect();return r.height<44||r.width<44}).map(el=>({t:(el.textContent||'').trim().slice(0,26)||el.getAttribute('aria-label')||'',h:Math.round(el.getBoundingClientRect().height),w:Math.round(el.getBoundingClientRect().width),cls:el.className.toString().slice(0,36)}));
   // ALLCAPS eyebrows
   const caps=all.filter(el=>{const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();if(t.length<4)return false;const s=getComputedStyle(el);return s.textTransform==='uppercase'||(t===t.toUpperCase()&&/[A-Z]{4}/.test(t))}).map(el=>({t:(el.textContent||'').trim().slice(0,60)}));
   // headings
   const heads=[...app.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(h=>({tag:h.tagName,t:(h.textContent||'').trim().slice(0,48)}));
   // paragraphs > 100 chars
   const longs=all.filter(el=>{const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();return t.length>110}).map(el=>({t:(el.textContent||'').trim().slice(0,70),len:(el.textContent||'').trim().length}));
   return {boxes:all.filter(isBox).length,maxBoxDepth:maxDepth,deepBoxes:deepSamples.slice(0,8),contrastFails:fails.slice(0,10),contrastFailCount:fails.length,tiny:tiny.slice(0,6),tinyCount:tiny.length,smallTargets:small.slice(0,10),smallCount:small.length,capsCount:caps.length,caps:caps.slice(0,6),headings:heads,longParas:longs.slice(0,10),longCount:longs.length};
  });
  const o=out[v];
  console.log(`\n### ${v}: boxes=${o.boxes} maxDepth=${o.maxBoxDepth} contrastFails=${o.contrastFailCount} tiny=${o.tinyCount} smallTargets=${o.smallCount} caps=${o.capsCount} longParas=${o.longCount}`);
  if(o.contrastFails.length) console.log(' CONTRAST:',JSON.stringify(o.contrastFails.slice(0,4)));
  if(o.smallTargets.length) console.log(' SMALL:',JSON.stringify(o.smallTargets.slice(0,4)));
  if(o.tiny.length) console.log(' TINY:',JSON.stringify(o.tiny.slice(0,4)));
 }
 fs.writeFileSync(process.env.SP+'/ux/analysis.json',JSON.stringify(out,null,1));
 await b.close();
})();
