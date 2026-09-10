import json, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"

def dump(page, label):
    info = page.evaluate("""() => {
      const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
      const btns = [...document.querySelectorAll('button,a,[onclick]')].filter(vis).slice(0,60).map(b=>({tag:b.tagName,cls:b.className.toString().slice(0,60),txt:(b.textContent||'').trim().slice(0,50),oc:(b.getAttribute('onclick')||'').slice(0,60)}));
      return {title:document.title, bodyCls:document.body.className, btns};
    }""")
    print("=== " + label + " ===")
    print(json.dumps(info, ensure_ascii=False, indent=1))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())
    page = ctx.new_page()
    page.goto(URL)
    page.screenshot(path=f"{SHOTS}/m_01_splash.png")
    page.wait_for_timeout(3500)
    page.screenshot(path=f"{SHOTS}/m_02_after_splash.png")
    dump(page, "after splash")
    # onboarding step: name?
    if page.locator("[data-ob-name]").count():
        page.screenshot(path=f"{SHOTS}/m_03_onboarding_name.png")
        page.fill("[data-ob-name]", "Rara")
        page.click("[data-ob-advance]")
        page.wait_for_timeout(800)
        page.screenshot(path=f"{SHOTS}/m_04_onboarding_step2.png")
        dump(page, "ob step2")
        # advance through remaining steps
        for i in range(5, 10):
            adv = page.locator("[data-ob-advance]:not([disabled])")
            skp = page.locator("[data-ob-step-skip]")
            prim = page.locator("[data-ob-primary]")
            if adv.count():
                adv.first.click()
            elif skp.count():
                skp.first.click()
            elif prim.count():
                page.screenshot(path=f"{SHOTS}/m_0{i}_onboarding.png")
                # don't start placement; use skip if exists else primary
                if page.locator("[data-ob-step-skip]").count():
                    page.locator("[data-ob-step-skip]").first.click()
                else:
                    prim.first.click()
            else:
                break
            page.wait_for_timeout(700)
            page.screenshot(path=f"{SHOTS}/m_0{i}_onboarding.png")
            dump(page, f"ob step {i}")
        page.wait_for_timeout(1000)
    dump(page, "post-onboarding")
    page.screenshot(path=f"{SHOTS}/m_09_post_onboarding.png")
    # notification gate?
    if page.locator("#notificationGateSkip").is_visible():
        page.screenshot(path=f"{SHOTS}/m_10_notification_gate.png")
        page.click("#notificationGateSkip")
        page.wait_for_timeout(1200)
    page.screenshot(path=f"{SHOTS}/m_11_home.png")
    dump(page, "home")
    # save state for reuse
    ls = page.evaluate("() => JSON.stringify(localStorage)")
    open("/home/user/workspace/redesign/audit/ls_after_onboarding.json","w").write(ls)
    b.close()
print("DONE")
