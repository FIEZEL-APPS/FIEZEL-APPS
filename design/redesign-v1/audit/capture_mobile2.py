import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"
LOG = open("/home/user/workspace/redesign/audit/capture_log2.txt", "w")

def log(*a):
    print(*a, file=LOG); LOG.flush()

def dump(page, label):
    try:
        info = page.evaluate("""() => {
          const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
          return [...document.querySelectorAll('button,a,[onclick]')].filter(vis).slice(0,90).map(b=>{const r=b.getBoundingClientRect();return {cls:b.className.toString().slice(0,55),txt:(b.textContent||'').trim().replace(/\\s+/g,' ').slice(0,60),oc:(b.getAttribute('onclick')||'').slice(0,55),w:Math.round(r.width),h:Math.round(r.height)}});
        }""")
        log(f"--- DUMP {label} ---")
        for b in info: log(" ", json.dumps(b, ensure_ascii=False))
    except Exception as e:
        log("dump fail", e)

def snap(page, name, full=False):
    try:
        page.screenshot(path=f"{SHOTS}/{name}.png", full_page=full, animations="disabled", timeout=20000)
        log("SNAP", name)
    except Exception as e:
        log("snap fail", name, e)

def clear_tour(page, prefix=None):
    """capture and dismiss the guided tour overlay if present"""
    for i in range(10):
        card = page.locator("[data-tour-card]")
        if not card.count(): break
        if prefix and i < 4: snap(page, f"{prefix}_tour_step{i+1}")
        nxt = page.locator("[data-tour-next]")
        skp = page.locator("[data-tour-skip]")
        try:
            if prefix and nxt.count(): nxt.first.click(timeout=3000)
            elif skp.count(): skp.first.click(timeout=3000)
            elif nxt.count(): nxt.first.click(timeout=3000)
            else: break
        except Exception: break
        page.wait_for_timeout(700)

def govia(page, view):
    page.evaluate(f"go('{view}')")
    page.wait_for_timeout(1200)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())
    page = ctx.new_page()
    page.goto(URL)
    page.wait_for_timeout(3500)
    # fast onboarding
    page.wait_for_selector("[data-ob-name]", timeout=10000)
    page.fill("[data-ob-name]", "Rara")
    page.click("[data-ob-advance]")
    page.wait_for_selector("[data-ob-step='2']", timeout=10000); page.wait_for_timeout(600)
    for _ in range(8):
        if page.locator("[data-ob-goal]").count(): break
        page.locator("[data-ob-advance]:not([disabled])").first.click(); page.wait_for_timeout(700)
    page.wait_for_selector("[data-ob-goal]", timeout=10000); page.wait_for_timeout(400)
    page.locator("[data-ob-goal]").first.click(); page.wait_for_timeout(400)
    ch = page.locator("[data-ob-level]")
    if ch.count(): ch.nth(1).click(); page.wait_for_timeout(300)
    page.locator("[data-ob-advance]:not([disabled])").first.click(); page.wait_for_timeout(600)
    page.locator("[data-ob-step-skip]").first.click(); page.wait_for_timeout(600)
    for i in range(4):
        if page.locator(".fiezel-btn-primary", has_text="Mulai Belajar").count(): break
        adv = page.locator("[data-ob-advance]:not([disabled])")
        skp = page.locator("[data-ob-step-skip]")
        (adv.first if adv.count() else skp.first).click(); page.wait_for_timeout(700)
    page.locator(".fiezel-btn-primary", has_text="Mulai Belajar").first.click()
    # notification gate: wait up to 6s
    try:
        page.wait_for_selector("#welcome.show, #welcome:not(.hidden)", timeout=6000)
        page.wait_for_timeout(500)
        snap(page, "m08_notification_gate")
        page.click("#notificationGateSkip"); page.wait_for_timeout(1500)
    except Exception as e:
        log("no notification gate", e)
    page.wait_for_timeout(1500)
    # tour overlay: capture steps then finish
    clear_tour(page, prefix="m09t")
    page.wait_for_timeout(800)
    snap(page, "m10_home_top")
    snap(page, "m10b_home_full", full=True)
    dump(page, "home clean")
    open("/home/user/workspace/redesign/audit/ls_home.json","w").write(page.evaluate("() => JSON.stringify(localStorage)"))

    # settings modal
    try:
        page.click("[onclick^='openSettings']", timeout=8000); page.wait_for_timeout(1000)
        snap(page, "m11_settings_modal")
        snap(page, "m11b_settings_modal_full", full=True)
        dump(page, "settings")
        page.locator("#settingsCancel").click(timeout=5000); page.wait_for_timeout(600)
    except Exception as e: log("settings fail", e)

    # level panel
    try:
        page.click("[onclick^='openLevelPanel']", timeout=8000); page.wait_for_timeout(900)
        snap(page, "m12_level_panel")
        dump(page, "level panel")
        page.keyboard.press("Escape"); page.wait_for_timeout(400)
        # close via any close button
        for sel in ["#modal .primary", "#modalClose", "[onclick^='closeModal']"]:
            loc = page.locator(sel)
            if loc.count() and loc.first.is_visible():
                loc.first.click(timeout=3000); break
        page.wait_for_timeout(500)
    except Exception as e: log("level panel fail", e)
    govia(page, "home"); clear_tour(page)

    # main views
    views = [("vocab","m13_vocab_view"),("grammar","m14_grammar_view"),("reading","m15_reading_view"),
             ("progress","m16_progress_view"),("library","m17_library_view"),("classroom","m18_classroom_view"),
             ("skills","m19_skills_view"),("listening","m20_listening_view"),("speaking","m21_speaking_view"),
             ("writing","m22_writing_view"),("test","m23_test_view"),("ask","m24_ask_view"),("search","m25_search_view")]
    for v, name in views:
        try:
            govia(page, v); clear_tour(page)
            snap(page, name)
            snap(page, name + "_full", full=True)
            dump(page, v)
        except Exception as e: log("view fail", v, e)

    b.close()
LOG.close()
print("DONE")
