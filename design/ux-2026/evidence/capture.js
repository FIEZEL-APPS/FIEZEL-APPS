const { chromium } = require(process.env.SP + '/node_modules/playwright');
const fs = require('fs'); const path = require('path');
const SEED = fs.readFileSync(process.env.SP + '/ux/seed.json','utf8').trim();
const OUT = process.env.SP + '/ux/shots';
const BASE = 'http://127.0.0.1:8931';
const VIEWS = ['home','vocab','grammar','reading','skills','listening','speaking','writing','test','progress','classroom','library','ask','online'];

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  // block puter SDK so auth gate does not hijack
  await ctx.route('**js.puter.com/**', r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0,200)));
  await page.addInitScript(seed => {
    localStorage.setItem('fiezel-v4-state', seed);
    localStorage.setItem('fiezel-splash-seen-v1', '2026-08-29');
    localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({done:true,at:Date.now(),via:'finish',name:'Rara',goal:'general',level:'A2'}));localStorage.setItem('fiezel-tour-v1', JSON.stringify({done:true,seen:['home','vocab','grammar','reading','progress']}));
    localStorage.setItem('fiezel_ab_variant','control');
  }, SEED);
  await page.goto(BASE + '/index.html', { waitUntil:'load', timeout:60000 });
  await page.waitForTimeout(3500);
  // dismiss any gate/tour
  for (let i=0;i<8;i++){
    const dismissed = await page.evaluate(() => {
      const sels = ['[data-tour-next]','[data-tour-skip]','#authGateSkip','#notificationGateSkip','.tour-skip','[data-tour-done]'];
      for (const s of sels){ const el=document.querySelector(s); if(el && el.offsetParent!==null){ el.click(); return s; } }
      for (const id of ['authGate','welcome']) { const el=document.getElementById(id); if(el && !el.classList.contains('hidden')) el.classList.add('hidden'); }
      return null;
    });
    if(!dismissed) break;
    await page.waitForTimeout(400);
  }
  const report = {};
  for (const v of VIEWS) {
    try {
      await page.evaluate(view => window.go(view), v);
      await page.waitForTimeout(1400);
      await page.evaluate(() => { for (const id of ['authGate','welcome']) { const el=document.getElementById(id); if(el) el.classList.add('hidden'); } });
      await page.screenshot({ path: path.join(OUT, `m-${v}.png`), fullPage:true });
      const m = await page.evaluate(() => {
        const app = document.getElementById('app');
        const vis = el => { const r=el.getBoundingClientRect(); const s=getComputedStyle(el); return r.width>0 && r.height>0 && s.display!=='none' && s.visibility!=='hidden'; };
        const all = [...app.querySelectorAll('*')].filter(vis);
        const boxed = all.filter(el => { const s=getComputedStyle(el); const hasBorder = parseFloat(s.borderTopWidth)>0 || parseFloat(s.borderLeftWidth)>0; const hasBg = s.backgroundColor!=='rgba(0, 0, 0, 0)' && s.backgroundColor!=='transparent'; const hasShadow = s.boxShadow!=='none'; const r=el.getBoundingClientRect(); return (hasBorder||hasBg||hasShadow) && r.width>80 && r.height>40; });
        const btns = all.filter(el => el.tagName==='BUTTON' || el.getAttribute('role')==='button' || el.classList.contains('option') || el.classList.contains('chip'));
        const textNodes = [];
        const walk = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
        let n, chars=0, blocks=0;
        while (n = walk.nextNode()) { const t=(n.textContent||'').trim(); if(t.length>1 && n.parentElement && vis(n.parentElement)) { chars+=t.length; if(t.length>60) blocks++; textNodes.push(t.slice(0,80)); } }
        const smallTargets = btns.filter(b => { const r=b.getBoundingClientRect(); return r.height>0 && (r.height<44 || r.width<44); }).map(b=>({c:b.className.toString().slice(0,40), t:(b.textContent||'').trim().slice(0,24), h:Math.round(b.getBoundingClientRect().height), w:Math.round(b.getBoundingClientRect().width)}));
        return { scrollH: document.documentElement.scrollHeight, elements: all.length, boxed: boxed.length, buttons: btns.length, textChars: chars, longTextBlocks: blocks, headings: app.querySelectorAll('h1,h2,h3,h4').length, smallTargets: smallTargets.slice(0,14), sampleText: textNodes.slice(0,25) };
      });
      report[v] = m;
      console.log(v, JSON.stringify({scrollH:m.scrollH, el:m.elements, boxed:m.boxed, btn:m.buttons, chars:m.textChars, longs:m.longTextBlocks, small:m.smallTargets.length}));
    } catch (e) { report[v] = { error: String(e).slice(0,200) }; console.log(v, 'ERR', String(e).slice(0,120)); }
  }
  fs.writeFileSync(process.env.SP + '/ux/metrics.json', JSON.stringify({report, pageErrors: errs.slice(0,20)}, null, 1));
  console.log('PAGE ERRORS:', errs.slice(0,6));
  await browser.close();
})();
