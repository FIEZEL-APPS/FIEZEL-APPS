#!/usr/bin/env python3
"""QA component library: full-page screenshot + programmatic WCAG contrast checks."""
import json, math
from playwright.sync_api import sync_playwright

BASE = "/home/user/workspace/redesign/components"

JS_CONTRAST = r"""
() => {
  function parse(c){
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if(!m) return null;
    return [ +m[1], +m[2], +m[3], m[4]===undefined?1:+m[4] ];
  }
  function effBg(el){
    // walk up ancestors compositing alpha until opaque
    let acc = null; // [r,g,b,a] accumulated (topmost first)
    let node = el;
    const layers = [];
    while(node && node !== document.documentElement){
      const cs = getComputedStyle(node);
      const bg = parse(cs.backgroundColor);
      const bgi = cs.backgroundImage;
      if(bgi && bgi !== 'none' && bgi.includes('gradient')){
        // sample midpoint of gradient by averaging declared stops (approx for sun-grad)
        const cols = [...bgi.matchAll(/rgba?\([^)]+\)/g)].map(x=>parse(x[0])).filter(Boolean);
        if(cols.length){
          const avg = [0,1,2].map(i=>cols.reduce((s,c)=>s+c[i],0)/cols.length);
          layers.push([avg[0],avg[1],avg[2],1]);
          break;
        }
      }
      if(bg && bg[3] > 0){
        layers.push(bg);
        if(bg[3] >= 1) break;
      }
      node = node.parentElement;
    }
    if(!layers.length) return [255,255,255,1];
    // composite from bottom-most collected layer upward
    let out = layers[layers.length-1].slice(0,3);
    for(let i=layers.length-2;i>=0;i--){
      const [r,g,b,a] = layers[i];
      out = [ r*a + out[0]*(1-a), g*a + out[1]*(1-a), b*a + out[2]*(1-a) ];
    }
    return out;
  }
  function lum(rgb){
    const f = v => { v/=255; return v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
    return 0.2126*f(rgb[0]) + 0.7152*f(rgb[1]) + 0.0722*f(rgb[2]);
  }
  function ratio(a,b){
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  }
  const out = [];
  document.querySelectorAll('[data-cc]').forEach(el=>{
    const cs = getComputedStyle(el);
    const fg = parse(cs.color).slice(0,3);
    const bg = effBg(el);
    const size = parseFloat(cs.fontSize);
    const weight = +cs.fontWeight >= 600;
    const large = size >= 24 || (size >= 18.66 && weight);
    const need = large ? 3.0 : 4.5;
    const r = ratio(fg,bg);
    out.push({
      id: el.getAttribute('data-cc'),
      text: (el.textContent||'').trim().slice(0,40),
      fg: cs.color, bg: 'rgb('+bg.map(x=>Math.round(x)).join(', ')+')',
      fontSize: size, fontWeight: cs.fontWeight,
      ratio: Math.round(r*100)/100, required: need,
      pass: r >= need
    });
  });
  // font floor scan
  const tiny = [];
  document.querySelectorAll('body *').forEach(el=>{
    if(!el.textContent || !el.textContent.trim()) return;
    if(![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if(fs < 12) tiny.push({tag: el.tagName, cls: el.className.toString().slice(0,50), fontSize: fs, text: el.textContent.trim().slice(0,30)});
  });
  return {contrast: out, fontFloorViolations: tiny};
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.goto(f"file://{BASE}/index.html")
    pg.wait_for_timeout(1200)
    result = pg.evaluate(JS_CONTRAST)
    pg.screenshot(path=f"{BASE}/components-full.png", full_page=True)
    # also a mobile-width capture for reference
    pg.set_viewport_size({"width": 390, "height": 844})
    pg.wait_for_timeout(400)
    pg.screenshot(path=f"{BASE}/components-mobile-full.png", full_page=True)
    b.close()

with open(f"{BASE}/contrast-report.json", "w") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

fails = [c for c in result["contrast"] if not c["pass"]]
print(f"contrast checks: {len(result['contrast'])} | FAIL: {len(fails)}")
for c in result["contrast"]:
    print(f"  {'PASS' if c['pass'] else 'FAIL'}  {c['id']:<22} {c['ratio']:>6}:1 (min {c['required']})  fg={c['fg']} bg={c['bg']}")
print(f"font <12px violations: {len(result['fontFloorViolations'])}")
for t in result["fontFloorViolations"][:10]:
    print("  ", t)
