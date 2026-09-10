import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"
LS = json.loads(open("/home/user/workspace/redesign/audit/ls_home.json").read())
OUT = {}

JS_METRICS = """(sels) => {
  function bg(el){ // walk up for effective background
    let n = el;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !c.startsWith('rgba(0, 0, 0, 0)') && c !== 'transparent') return c;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }
  const res = {};
  for (const [key, sel] of Object.entries(sels)) {
    const el = document.querySelector(sel);
    if (!el) { res[key] = null; continue; }
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    res[key] = {
      sel, text: (el.textContent||'').trim().slice(0,40),
      color: s.color, background: bg(el), ownBg: s.backgroundColor,
      fontSize: s.fontSize, fontWeight: s.fontWeight, fontFamily: s.fontFamily.slice(0,60),
      lineHeight: s.lineHeight, borderRadius: s.borderRadius, padding: s.padding,
      boxShadow: s.boxShadow.slice(0,80), border: s.border,
      w: Math.round(r.width), h: Math.round(r.height)
    };
  }
  return res;
}"""

JS_TOUCH = """() => {
  const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
  return [...document.querySelectorAll('button,a,[onclick],input[type=checkbox]')].filter(vis).map(b=>{
    const r=b.getBoundingClientRect();
    return {cls:b.className.toString().slice(0,45), txt:(b.textContent||'').trim().replace(/\\s+/g,' ').slice(0,35), w:Math.round(r.width), h:Math.round(r.height)};
  }).filter(x=>x.w<44||x.h<44);
}"""

JS_FOCUS = """() => {
  // check for :focus-visible styles in stylesheets
  let focusRules = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.selectorText && /focus/.test(rule.selectorText)) focusRules.push(rule.selectorText.slice(0,120));
      }
    } catch(e){}
  }
  return focusRules.slice(0,40);
}"""

def boot(ctx):
    page = ctx.new_page()
    page.goto(URL)
    page.evaluate("ls => { localStorage.clear(); for (const [k,v] of Object.entries(ls)) localStorage.setItem(k,v); }", LS)
    page.reload()
    page.wait_for_timeout(4000)
    return page

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())
    page = boot(ctx)

    # HOME metrics
    OUT["home"] = page.evaluate(JS_METRICS, {
        "h1_or_title": "#app h1, #app .home-title, #app h2",
        "body_text": "#app p",
        "muted_text": "#app .muted, #app small",
        "primary_btn": "button.primary",
        "launch_card": ".launch-card",
        "launch_card_label": ".launch-card b, .launch-card .launch-name, .launch-card span",
        "nav_item": "button.nav",
        "nav_active": "button.nav.active",
        "eyebrow": ".eyebrow",
        "skill_card": ".skill-card",
        "coach_strip_more": ".coach-strip-more",
        "goal_chip": ".journey-goal-chip",
        "goal_chip_active": ".journey-goal-chip.is-active",
        "text_button": ".text-button",
        "level_context": ".home-level-context",
        "topbar_ask": ".ask-button .ask-label",
        "card": "#app .card",
    })
    OUT["home_small_targets"] = page.evaluate(JS_TOUCH)
    OUT["focus_rules"] = page.evaluate(JS_FOCUS)

    # GRAMMAR HUB metrics
    page.evaluate("go('grammar')"); page.wait_for_timeout(1300)
    OUT["grammar"] = page.evaluate(JS_METRICS, {
        "hub_title": "#app h1",
        "hub_sub": "#app .muted, #app p",
        "lesson_card": ".lesson-item, .grammar-lesson, #app .card",
        "lesson_title": "#app .card h3, #app .card b",
        "open_btn": "#app button:not(.nav)",
        "level_control": ".active-level-control",
    })
    OUT["grammar_small_targets"] = page.evaluate(JS_TOUCH)

    # QUIZ metrics
    page.locator("button:has-text('Buka lesson')").first.click(); page.wait_for_timeout(1200)
    for txt in ["Mulai latihan", "Latihan", "Mulai"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count(): loc.first.click(); break
    page.wait_for_timeout(1500)
    OUT["quiz"] = page.evaluate(JS_METRICS, {
        "question": ".question",
        "option": ".option",
        "eyebrow": ".eyebrow",
        "quiz_exit": "#quizExit",
        "quiz_next": "#quizNext",
        "quiz_progress": ".quiz-progress",
        "passage": ".passage p",
    })
    OUT["quiz_small_targets"] = page.evaluate(JS_TOUCH)
    # answer to get feedback metrics
    opts = page.locator(".option:enabled")
    if opts.count():
        opts.first.click(); page.wait_for_timeout(900)
        try: page.locator("#confidencePop .confidence-skip").click(timeout=3000); page.wait_for_timeout(400)
        except Exception: pass
        OUT["feedback"] = page.evaluate(JS_METRICS, {
            "feedback_box": "#feedback",
            "feedback_title": ".feedback-title b",
            "feedback_body": "#feedback p",
            "feedback_muted": "#feedback p.muted",
            "memory_tip": ".memory-tip span",
            "ai_btn": ".ai-btn",
            "option_correct": ".option.correct",
            "option_disabled": ".option[disabled]",
        })

    # keyboard focus test on home
    page.evaluate("go('home')"); page.wait_for_timeout(1200)
    page.keyboard.press("Tab"); page.keyboard.press("Tab"); page.keyboard.press("Tab")
    OUT["focus_after_tabs"] = page.evaluate("""() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      return {tag: el.tagName, cls: el.className.toString().slice(0,50), outline: s.outline, outlineOffset: s.outlineOffset, boxShadow: s.boxShadow.slice(0,100)};
    }""")
    page.screenshot(path=f"{SHOTS}/m26_focus_state_tab3.png", animations="disabled")

    b.close()

open("/home/user/workspace/redesign/audit/metrics.json","w").write(json.dumps(OUT, ensure_ascii=False, indent=1))
print("METRICS DONE")
