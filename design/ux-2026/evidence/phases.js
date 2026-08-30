const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs=require('fs');
const SEED=fs.readFileSync(process.env.SP+'/ux/seed.json','utf8').trim();
const HOURS={dawn:'06:30',day:'12:00',dusk:'17:30',night:'21:00'};
const lum=c=>{const m=c.match(/[\d.]+/g).slice(0,3).map(Number);const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2])};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
 for(const [phase,hhmm] of Object.entries(HOURS)){
  const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await ctx.route('**js.puter.com/**',r=>r.abort());
  const p=await ctx.newPage();
  const [H,M]=hhmm.split(':').map(Number);
  await p.addInitScript(({s,H,M})=>{
    const RealDate=Date; const fixed=new RealDate(2026,7,29,H,M,0);
    // freeze wall-clock hour only; keep Date arithmetic working
    class D extends RealDate{ constructor(...a){ if(a.length===0) super(fixed.getTime()); else super(...a);} static now(){return fixed.getTime()} }
    window.Date=D;
    localStorage.setItem('fiezel-v4-state',s);
    localStorage.setItem('fiezel-splash-seen-v1','2026-08-29');
    localStorage.setItem('fiezel-onboarding-v1',JSON.stringify({done:true,at:1,via:'finish',name:'Rara',goal:'general',level:'A2'}));
    localStorage.setItem('fiezel-tour-v1',JSON.stringify({done:true,seen:['home']}));
  },{s:SEED,H,M});
  await p.goto('http://127.0.0.1:8931/index.html',{waitUntil:'load',timeout:60000});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>{['authGate','welcome','fzRitual'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove()})});
  await p.evaluate(()=>window.go('grammar')); await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{
    const h=document.querySelector('#app .section-head h1');
    let n=h, bg='rgb(255,249,238)';
    while(n&&n!==document.documentElement){const c=getComputedStyle(n).backgroundColor;const m=c.match(/[\d.]+/g);if(m&&(m.length<4||Number(m[3])>0.6)){bg=c;break}n=n.parentElement}
    return {color:getComputedStyle(h).color,bg,body:document.body.className.match(/scene-\w+/)?.[0],sky:document.getElementById('globalSky')?.className,text:h.textContent.trim()};
  });
  const L1=lum(r.color),L2=lum(r.bg);
  const cr=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
  console.log(`${phase.padEnd(6)} ${hhmm}  body=${(r.body||'-').padEnd(12)} ink=${r.color.padEnd(18)} bg=${r.bg.padEnd(20)} contrast=${cr.toFixed(2)}:1  ${cr>=3?'PASS':'FAIL'}  "${r.text}"`);
  await ctx.close();
 }
 await b.close();
})();
