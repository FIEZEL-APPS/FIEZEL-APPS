# -*- coding: utf-8 -*-
"""Screenshot 390x844 dsf2 + verifikasi programatik: font >=12px, target >=44px, kontras teks."""
import json, pathlib
from playwright.sync_api import sync_playwright

B = pathlib.Path("/home/user/workspace/redesign/screens/b")
PAGES = ["quiz", "quiz-analyzing", "quiz-correct", "quiz-wrong", "quiz-hint"]

JS = r"""
() => {
  function lum(r,g,b){
    const f = c => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
  }
  function parse(c){
    const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if(!m) return null;
    return [ +m[1], +m[2], +m[3], m[4]===undefined?1:+m[4] ];
  }
  function blend(fg, bg){ // fg over bg, both [r,g,b,a]
    const a = fg[3];
    return [ fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1 ];
  }
  function effBg(el){
    let bg = [255,249,238,1]; // --bg fallback
    const chain = [];
    let n = el;
    while(n && n.nodeType===1){ chain.unshift(n); n = n.parentElement; }
    for(const node of chain){
      const c = parse(getComputedStyle(node).backgroundColor);
      if(c && c[3] > 0) bg = blend(c, bg);
    }
    return bg;
  }
  function contrast(a, b){
    const l1 = lum(a[0],a[1],a[2]), l2 = lum(b[0],b[1],b[2]);
    const [hi, lo] = l1>l2 ? [l1,l2] : [l2,l1];
    return (hi+0.05)/(lo+0.05);
  }
  const fontViolations = [], contrastRows = [], targetViolations = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let t;
  while((t = walker.nextNode())){
    const txt = t.textContent.trim();
    if(!txt) continue;
    const el = t.parentElement;
    if(seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') continue;
    const r = el.getBoundingClientRect();
    if(r.width===0 || r.height===0) continue;
    const fs = parseFloat(cs.fontSize);
    if(fs < 12) fontViolations.push({text: txt.slice(0,40), fontSize: fs, cls: el.className});
    let fg = parse(cs.color);
    const bg = effBg(el);
    if(fg[3] < 1) fg = blend(fg, bg);
    const ratio = contrast(fg, bg);
    const weight = parseInt(cs.fontWeight);
    const large = fs >= 24 || (fs >= 18.66 && weight >= 700);
    const disabled = el.closest('[disabled],[aria-disabled="true"]') !== null;
    const req = large ? 3 : 4.5;
    contrastRows.push({text: txt.slice(0,36), fs, weight, ratio: Math.round(ratio*100)/100,
      req, pass: ratio >= req, large, disabled, cls: (el.className||'').toString().slice(0,40)});
  }
  document.querySelectorAll('button, a, [role="button"]').forEach(el => {
    const cs = getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') return;
    const r = el.getBoundingClientRect();
    if(r.width===0 && r.height===0) return;
    if(r.width < 44 || r.height < 44){
      targetViolations.push({cls:(el.className||'').toString(), w: Math.round(r.width), h: Math.round(r.height),
        text:(el.textContent||'').trim().slice(0,30)});
    }
  });
  return {fontViolations, contrastRows, targetViolations};
}
"""

report = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width":390,"height":844}, device_scale_factor=2)
    pg = ctx.new_page()
    for name in PAGES:
        pg.goto(f"file://{B}/{name}.html")
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(B/"png"/f"{name}.png"))
        res = pg.evaluate(JS)
        fails = [r for r in res["contrastRows"] if not r["pass"]]
        report[name] = {
            "font_violations": res["fontViolations"],
            "target_violations": res["targetViolations"],
            "contrast_fail": fails,
            "contrast_checked": len(res["contrastRows"]),
        }
        print(f"== {name}: fonts<12={len(res['fontViolations'])} targets<44={len(res['targetViolations'])} contrastFail={len(fails)}/{len(res['contrastRows'])}")
        for f in res["fontViolations"]: print("   FONT", f)
        for f in res["targetViolations"]: print("   TARGET", f)
        for f in fails: print("   CONTRAST", f)
    browser.close()
(B/"verify_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
print("saved verify_report.json")
