const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const DIR = '/home/user/workspace/redesign/screens/a';
const PAGES = ['onboarding', 'home', 'library'];

// ---------- audit code injected into the page ----------
const AUDIT_FN = `
(() => {
  function parseColor(str){
    const m = str.match(/rgba?\\(([^)]+)\\)/);
    if(!m) return null;
    const p = m[1].split(',').map(s=>parseFloat(s));
    return { r:p[0], g:p[1], b:p[2], a:p.length>3?p[3]:1 };
  }
  function lum({r,g,b}){
    const f = c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); };
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
  }
  function contrast(c1,c2){
    const L1=lum(c1), L2=lum(c2);
    return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
  }
  function blend(fg,bg){ // fg over bg
    const a=fg.a;
    return { r:fg.r*a+bg.r*(1-a), g:fg.g*a+bg.g*(1-a), b:fg.b*a+bg.b*(1-a), a:1 };
  }
  function hex2rgb(h){
    return { r:parseInt(h.slice(1,3),16), g:parseInt(h.slice(3,5),16), b:parseInt(h.slice(5,7),16), a:1 };
  }
  // effective background colors (worst case list) for an element
  function effBgs(el){
    let node = el;
    while(node && node !== document.documentElement){
      const cs = getComputedStyle(node);
      const bi = cs.backgroundImage;
      if(bi && bi !== 'none'){
        const stops = [...bi.matchAll(/rgba?\\([^)]+\\)|#[0-9a-fA-F]{6}/g)].map(m=>m[0]);
        if(stops.length) return stops.map(s => s.startsWith('#') ? hex2rgb(s) : parseColor(s));
      }
      const bc = parseColor(cs.backgroundColor);
      if(bc && bc.a > 0.9) return [bc];
      node = node.parentElement;
    }
    return [hex2rgb('#FFF9EE')];
  }
  const results = { tinyText: [], smallTargets: [], contrast: [], dockOverlap: [] };

  // 1) font floor 12px — every element with a direct visible text node
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while(walker.nextNode()){
    const t = walker.currentNode;
    if(!t.textContent.trim()) continue;
    const el = t.parentElement;
    if(!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') continue;
    const r = el.getBoundingClientRect();
    if(r.width===0 && r.height===0) continue;
    const fsz = parseFloat(cs.fontSize);
    if(fsz < 12){
      results.tinyText.push({ tag: el.tagName, cls: el.className.toString().slice(0,60), text: t.textContent.trim().slice(0,40), fontSize: fsz });
    }
  }

  // 2) touch targets >= 44px
  document.querySelectorAll('a,button,input,[role="tab"],[role="button"]').forEach(el=>{
    const cs = getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') return;
    const r = el.getBoundingClientRect();
    if(r.width===0 || r.height===0) return;
    if(r.width < 44 || r.height < 44){
      results.smallTargets.push({ tag: el.tagName, cls: el.className.toString().slice(0,60),
        label: (el.getAttribute('aria-label')||el.textContent.trim()).slice(0,40),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1) });
    }
  });

  // 3) contrast — all text-bearing elements + explicit button checks
  seen.forEach(el=>{
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    if(!fg) return;
    const fsz = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight)||400;
    const large = fsz >= 24 || (fsz >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const bgs = effBgs(el);
    const worst = Math.min(...bgs.map(bg => contrast(blend(fg,bg), bg)));
    const entry = { tag: el.tagName, cls: el.className.toString().slice(0,60),
      text: el.textContent.trim().slice(0,36), fontSize: fsz, weight,
      ratio: +worst.toFixed(2), need, pass: worst >= need };
    if(!entry.pass) results.contrast.push(entry);
    // always record primary buttons
    if(el.closest('.btn-sun,.btn-ink,.btn-ghost,.chip.is-active,.nav-item')){
      entry.note='key-control';
      if(entry.pass) results.contrast.push(entry);
    }
  });

  // 4) maskot dock tidak boleh menutupi teks konten (aturan maskot DIRECTION)
  const dock = document.querySelector('.mascot-dock');
  if(dock){
    const d = dock.getBoundingClientRect();
    seen.forEach(el=>{
      if(dock.contains(el)) return;
      const r = el.getBoundingClientRect();
      const ox = Math.min(r.right,d.right)-Math.max(r.left,d.left);
      const oy = Math.min(r.bottom,d.bottom)-Math.max(r.top,d.top);
      if(ox>1 && oy>1){
        results.dockOverlap.push({ tag: el.tagName, cls: el.className.toString().slice(0,50),
          text: el.textContent.trim().slice(0,30), overlapPx:[+ox.toFixed(0),+oy.toFixed(0)] });
      }
    });
  }
  return results;
})()
`;

(async () => {
  const browser = await chromium.launch();
  const report = {};
  for (const name of PAGES) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await page.goto('file://' + path.join(DIR, name + '.html'));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(DIR, name + '.png') });
    report[name] = await page.evaluate(AUDIT_FN);
    // page height info
    report[name].scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(DIR, 'audit_report.json'), JSON.stringify(report, null, 2));
  // summary
  for (const name of PAGES) {
    const r = report[name];
    const fails = r.contrast.filter(c => !c.pass);
    console.log(`\n=== ${name} (scrollHeight ${r.scrollHeight}) ===`);
    console.log(`tinyText(<12px): ${r.tinyText.length}`);
    r.tinyText.forEach(t => console.log('  TINY', JSON.stringify(t)));
    console.log(`smallTargets(<44px): ${r.smallTargets.length}`);
    r.smallTargets.forEach(t => console.log('  SMALL', JSON.stringify(t)));
    console.log(`contrast fails: ${fails.length}`);
    fails.forEach(t => console.log('  CONTRAST', JSON.stringify(t)));
    if(r.dockOverlap){ console.log(`dock overlaps text: ${r.dockOverlap.length}`);
      r.dockOverlap.forEach(t => console.log('  DOCK', JSON.stringify(t))); }
    const keys = r.contrast.filter(c => c.pass && c.note);
    console.log(`key controls checked (pass): ${keys.length}`);
    keys.slice(0, 8).forEach(t => console.log('  OK', t.cls || t.tag, t.text, t.ratio));
  }
})();
