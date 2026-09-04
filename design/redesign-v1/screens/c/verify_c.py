#!/usr/bin/env python3
"""Screenshot 390x844 @2x + verifikasi programatik (kontras, lantai font 12px, target 44px, overflow)."""
import json, math, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

DIR = Path(__file__).parent
PAGES = ["listening.html", "listening-dictation.html", "listening-feedback.html", "vocab.html"]

def srgb_to_lin(c):
    c /= 255.0
    return c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4

def luminance(rgb):
    r,g,b = rgb
    return 0.2126*srgb_to_lin(r)+0.7152*srgb_to_lin(g)+0.0722*srgb_to_lin(b)

def ratio(a,b):
    la,lb = luminance(a), luminance(b)
    hi,lo = max(la,lb), min(la,lb)
    return (hi+0.05)/(lo+0.05)

def parse_rgb(s):
    m = re.findall(r"[\d.]+", s)
    if not m: return None
    vals = [float(x) for x in m]
    if len(vals) >= 4 and vals[3] == 0: return None  # transparan
    return vals[:4] if len(vals) >= 4 else vals[:3]+[1.0]

def composite(fg, bg):
    """fg rgba di atas bg rgb -> rgb"""
    a = fg[3]
    return [fg[i]*a + bg[i]*(1-a) for i in range(3)]

JS_COLLECT = """
() => {
  const out = {texts: [], targets: [], smallFonts: []};
  const walk = (el) => {
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim()) {
        out.texts.push(el); return;
      }
    }
  };
  const bgOf = (el) => {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      const bg = cs.backgroundColor;
      if (bg && !bg.includes('rgba(0, 0, 0, 0)') && bg !== 'transparent') return bg;
      const bgi = cs.backgroundImage;
      if (bgi && bgi !== 'none') return 'GRADIENT:' + bgi;
      cur = cur.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const res = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest('svg')) return;
    let hasText = false;
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.textContent.trim()) { hasText = true; break; }
    }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (hasText && r.width > 0 && r.height > 0) {
      res.push({
        kind: 'text',
        text: el.textContent.trim().slice(0, 42).replace(/\\s+/g,' '),
        sel: el.className && typeof el.className === 'string' ? el.className : el.tagName,
        color: cs.color, bg: bgOf(el),
        fontSize: parseFloat(cs.fontSize), fontWeight: parseInt(cs.fontWeight) || 400,
      });
    }
    if (el.matches('button, a, input, [role=button], [role=radio]')) {
      res.push({
        kind: 'target',
        sel: (el.className && typeof el.className === 'string' ? el.className : el.tagName) +
             ' | ' + el.textContent.trim().slice(0, 24).replace(/\\s+/g,' '),
        w: r.width, h: r.height,
      });
    }
  });
  // input placeholder / value
  const inp = document.querySelector('input.field');
  if (inp) {
    const cs = getComputedStyle(inp);
    res.push({kind:'text', text:'[input value]', sel:'field', color:cs.color,
              bg:cs.backgroundColor, fontSize:parseFloat(cs.fontSize), fontWeight:parseInt(cs.fontWeight)||400});
  }
  // overflow layar + konten terpotong di dalam <main>
  const doc = document.documentElement;
  const main = document.querySelector('main');
  res.push({kind:'meta', scrollH: Math.max(doc.scrollHeight, document.body.scrollHeight),
            scrollW: Math.max(doc.scrollWidth, document.body.scrollWidth),
            mainScroll: main ? main.scrollHeight : 0, mainClient: main ? main.clientHeight : 0});
  return res;
}
"""

# Warna dasar per konteks gradient (sun-grad dipakai hanya utk dp-fill non-teks)
GRADIENT_FALLBACK = (255, 199, 0)

report = {}
fail_total = 0

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    for name in PAGES:
        page.goto(f"file://{DIR/name}")
        page.wait_for_timeout(400)
        png = DIR / (name.replace('.html', '.png'))
        page.screenshot(path=str(png))
        items = page.evaluate(JS_COLLECT)
        fails, checks = [], []
        for it in items:
            if it['kind'] == 'meta':
                if it['scrollH'] > 845 or it['scrollW'] > 391:
                    fails.append(f"OVERFLOW: scroll {it['scrollW']}x{it['scrollH']} > 390x844")
                elif it['mainScroll'] > it['mainClient'] + 1:
                    fails.append(f"KONTEN TERPOTONG di main: {it['mainScroll']} > {it['mainClient']}")
                else:
                    checks.append(f"layout pas 390x844, tanpa clipping (main {it['mainScroll']}/{it['mainClient']})")
            elif it['kind'] == 'text':
                fs, fw = it['fontSize'], it['fontWeight']
                if fs < 12:
                    fails.append(f"FONT<12px: {fs:.1f}px [{it['sel']}] \"{it['text']}\"")
                fg = parse_rgb(it['color'])
                bgs = it['bg']
                if bgs.startswith('GRADIENT'):
                    bg = list(GRADIENT_FALLBACK)
                else:
                    bg = parse_rgb(bgs)
                if fg and bg:
                    if fg[3] < 1.0:
                        fg = composite(fg, bg[:3]) + [1.0]
                    r = ratio(fg[:3], bg[:3])
                    large = fs >= 24 or (fs >= 18.66 and fw >= 700)
                    need = 3.0 if large else 4.5
                    line = f"{r:.2f}:1 (butuh {need}) [{it['sel']}] \"{it['text']}\""
                    (checks if r >= need else fails).append(("KONTRAS " if r < need else "") + line)
            elif it['kind'] == 'target':
                ok = it['w'] >= 44 and it['h'] >= 44
                line = f"{it['w']:.0f}x{it['h']:.0f} [{it['sel']}]"
                (checks if ok else fails).append(("TARGET<44 " if not ok else "") + line)
        report[name] = {"fails": fails, "pass_count": len(checks), "checks": checks}
        fail_total += len(fails)
        print(f"\n=== {name}: {len(fails)} GAGAL / {len(checks)} lolos ===")
        for f in fails: print("  ✗", f)
    browser.close()

(DIR / "verify_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(f"\nTOTAL GAGAL: {fail_total}")
sys.exit(0)
