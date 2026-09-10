#!/usr/bin/env python3
"""Layar D — screenshot 390x844 @dsf2 + verifikasi programatik."""
import json, pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

D = pathlib.Path(__file__).parent
PAGES = ["progress", "completion", "settings"]

JS_CHECKS = r"""
() => {
  const out = {};
  const phone = document.querySelector('.phone');
  const pr = phone.getBoundingClientRect();
  out.phone = {w: pr.width, h: pr.height};

  // 1. font loaded
  out.fonts = {
    jakarta: document.fonts.check('700 15px "FZ Plus Jakarta Sans"'),
    fredoka: document.fonts.check('600 26px "FZ Fredoka"')
  };

  // 2. lantai font 12px
  const small = [];
  document.querySelectorAll('body *').forEach(el => {
    if (!el.textContent.trim()) return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) small.push({tag: el.tagName, cls: el.className.toString().slice(0,40), fs});
  });
  out.font_floor_violations = small;

  // 3. touch target >= 44px (toggle punya hit-area pseudo +8/+4)
  const tiny = [];
  document.querySelectorAll('button, input, [role="switch"], a').forEach(el => {
    const r = el.getBoundingClientRect();
    let w = r.width, h = r.height;
    if (el.classList.contains('toggle')) { w += 8; h += 16; }
    if (Math.min(w, h) < 44) tiny.push({cls: el.className.toString().slice(0,40), label: (el.getAttribute('aria-label')||el.textContent.trim()).slice(0,30), w: +w.toFixed(1), h: +h.toFixed(1)});
  });
  out.touch_violations = tiny;

  // 4. overflow horizontal & konten muat vertikal
  out.h_overflow = [];
  document.querySelectorAll('.content *').forEach(el => {
    if (el.closest('.chips')) return; // overflow chips disengaja (fade + chevron affordance)
    const r = el.getBoundingClientRect();
    if (r.right > pr.right + 1 || r.left < pr.left - 1) out.h_overflow.push(el.className.toString().slice(0,40));
  });
  const c = document.querySelector('.content');
  out.content_scroll = {scrollH: c.scrollHeight, clientH: c.clientHeight, fits: c.scrollHeight <= c.clientHeight + 1};

  // 5. toast ink+krem (jika ada)
  const toast = document.querySelector('.toast');
  if (toast) {
    const cs = getComputedStyle(toast);
    out.toast = {bg: cs.backgroundColor, color: getComputedStyle(toast.querySelector('p')).color};
  }

  // 6. maskot tidak menutupi kontrol interaktif
  const masks = [...document.querySelectorAll('.mascot-cel, .map-note .paw, .avatar img')];
  const overlaps = [];
  masks.forEach(m => {
    const mr = m.getBoundingClientRect();
    document.querySelectorAll('button, input').forEach(b => {
      if (b.contains(m) || m.contains(b)) return;
      const br = b.getBoundingClientRect();
      const ox = Math.max(0, Math.min(mr.right, br.right) - Math.max(mr.left, br.left));
      const oy = Math.max(0, Math.min(mr.bottom, br.bottom) - Math.max(mr.top, br.top));
      if (ox > 4 && oy > 4) overlaps.push({mask: m.className.toString(), btn: b.className.toString().slice(0,30)});
    });
  });
  out.mascot_overlaps = overlaps;

  // 7. semua img termuat
  out.broken_imgs = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
  return out;
}
"""

def lum(c):
    c = [v/255 for v in c]
    c = [v/12.92 if v <= .03928 else ((v+.055)/1.055)**2.4 for v in c]
    return .2126*c[0] + .7152*c[1] + .0722*c[2]

def ratio(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la+.05)/(lb+.05)

report = {}
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    for name in PAGES:
        pg.goto(f"file://{D}/{name}.html")
        pg.wait_for_timeout(700)
        pg.evaluate("document.fonts.ready.then(()=>1)")
        pg.wait_for_timeout(300)
        png = D / f"{name}.png"
        pg.screenshot(path=str(png), clip={"x": 0, "y": 0, "width": 390, "height": 844})
        checks = pg.evaluate(JS_CHECKS)
        im = Image.open(png)
        checks["png"] = {"size": im.size, "ok": im.size == (780, 1688)}
        if "toast" in checks:
            import re
            nums = lambda s: tuple(int(x) for x in re.findall(r"\d+", s)[:3])
            bg, fg = nums(checks["toast"]["bg"]), nums(checks["toast"]["color"])
            checks["toast"]["contrast"] = round(ratio(bg, fg), 2)
            checks["toast"]["aa_pass"] = ratio(bg, fg) >= 4.5
        report[name] = checks
    b.close()

(D / "verify_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

ok = True
for name, c in report.items():
    probs = []
    if not c["png"]["ok"]: probs.append(f"PNG {c['png']['size']}")
    if not all(c["fonts"].values()): probs.append(f"fonts {c['fonts']}")
    if c["font_floor_violations"]: probs.append(f"font<12px x{len(c['font_floor_violations'])}")
    if c["touch_violations"]: probs.append(f"target<44 x{len(c['touch_violations'])}: {c['touch_violations'][:3]}")
    if c["h_overflow"]: probs.append(f"h-overflow x{len(c['h_overflow'])}")
    if not c["content_scroll"]["fits"]: probs.append(f"scroll {c['content_scroll']}")
    if c.get("toast") and not c["toast"]["aa_pass"]: probs.append(f"toast {c['toast']}")
    if c["mascot_overlaps"]: probs.append(f"maskot overlap {c['mascot_overlaps']}")
    if c["broken_imgs"]: probs.append(f"img rusak {c['broken_imgs']}")
    status = "OK" if not probs else "MASALAH: " + "; ".join(str(x) for x in probs)
    if probs: ok = False
    print(f"[{name}] {status}")
print("SEMUA LULUS" if ok else "ADA MASALAH")
