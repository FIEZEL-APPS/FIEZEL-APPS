import json, os, sys, time
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"
LOG = open("/home/user/workspace/redesign/audit/capture_log.txt", "w")

def log(*a):
    print(*a)
    print(*a, file=LOG); LOG.flush()

def dump(page, label):
    try:
        info = page.evaluate("""() => {
          const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
          const btns = [...document.querySelectorAll('button,a,[onclick]')].filter(vis).slice(0,80).map(b=>{const r=b.getBoundingClientRect();return {cls:b.className.toString().slice(0,50),txt:(b.textContent||'').trim().replace(/\\s+/g,' ').slice(0,60),oc:(b.getAttribute('onclick')||'').slice(0,50),w:Math.round(r.width),h:Math.round(r.height)}});
          return btns;
        }""")
        log(f"--- DUMP {label} ---")
        for b in info: log(" ", json.dumps(b, ensure_ascii=False))
    except Exception as e:
        log("dump fail", e)

def snap(page, name, full=False):
    page.screenshot(path=f"{SHOTS}/{name}.png", full_page=full)
    log("SNAP", name)

def close_pops(page):
    """dismiss confidence pop if open"""
    try:
        skip = page.locator("#confidencePop .confidence-skip")
        if skip.count() and skip.first.is_visible():
            skip.first.click(); page.wait_for_timeout(300); return True
    except Exception: pass
    return False

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())
    page = ctx.new_page()
    page.on("console", lambda m: None)

    # ---------- PHASE 1: splash + onboarding ----------
    page.goto(URL)
    snap(page, "m01_splash_boot")
    page.wait_for_timeout(3500)
    snap(page, "m02_onboarding_1_name")
    page.fill("[data-ob-name]", "Rara")
    page.wait_for_timeout(200)
    snap(page, "m02b_onboarding_1_name_filled")
    page.click("[data-ob-advance]"); page.wait_for_timeout(800)
    snap(page, "m03_onboarding_2_carousel")
    # advance carousel one slide for variety
    try:
        page.click("[data-ob-carousel-next]"); page.wait_for_timeout(500)
        snap(page, "m03b_onboarding_2_carousel_slide2")
    except Exception: pass
    page.click("[data-ob-advance]"); page.wait_for_timeout(800)
    snap(page, "m04_onboarding_3_goal")
    # select goal + level
    try:
        page.locator("[data-ob-goal]").first.click(); page.wait_for_timeout(400)
        chips = page.locator("[data-ob-level]")
        if chips.count(): chips.nth(1).click(); page.wait_for_timeout(300)
        snap(page, "m04b_onboarding_3_goal_selected")
    except Exception as e: log("goal fail", e)
    page.locator("[data-ob-advance]:not([disabled])").first.click(); page.wait_for_timeout(800)
    snap(page, "m05_onboarding_4_placement_offer")
    page.locator("[data-ob-step-skip]").first.click(); page.wait_for_timeout(800)
    snap(page, "m06_onboarding_5")
    dump(page, "onboarding step5")
    # keep advancing until summary (Mulai Belajar)
    for i in range(4):
        if page.locator(".fiezel-btn-primary", has_text="Mulai Belajar").count(): break
        adv = page.locator("[data-ob-advance]:not([disabled])")
        skp = page.locator("[data-ob-step-skip]")
        if adv.count(): adv.first.click()
        elif skp.count(): skp.first.click()
        else: break
        page.wait_for_timeout(800)
        snap(page, f"m06{'bcd'[i] if i<3 else 'e'}_onboarding_step")
    snap(page, "m07_onboarding_summary")
    page.locator(".fiezel-btn-primary", has_text="Mulai Belajar").first.click()
    page.wait_for_timeout(1200)
    # notification gate
    if page.locator("#welcome").is_visible():
        snap(page, "m08_notification_gate")
        page.click("#notificationGateSkip"); page.wait_for_timeout(1500)

    # ---------- PHASE 2: home ----------
    snap(page, "m09_home_top")
    snap(page, "m09b_home_full", full=True)
    dump(page, "home")
    # save state
    open("/home/user/workspace/redesign/audit/ls_home.json","w").write(page.evaluate("() => JSON.stringify(localStorage)"))

    # ---------- PHASE 3: settings modal ----------
    try:
        page.click("[onclick^='openSettings']"); page.wait_for_timeout(900)
        snap(page, "m10_settings_modal")
        snap(page, "m10b_settings_modal_full", full=True)
        dump(page, "settings")
        # close via Batal
        page.locator("#settingsCancel").click(); page.wait_for_timeout(600)
    except Exception as e: log("settings fail", e)

    # ---------- PHASE 4: main views via bottom nav / launch cards ----------
    def nav(sel, name, desc):
        try:
            page.locator(sel).first.click(); page.wait_for_timeout(1300)
            snap(page, name)
            dump(page, desc)
            return True
        except Exception as e:
            log("nav fail", desc, e); return False

    nav("button.nav:has-text('Vocab')", "m11_vocab_view", "vocab view")
    snap(page, "m11b_vocab_full", full=True)
    nav("button.nav:has-text('Reading')", "m12_reading_view", "reading view")
    nav("button.nav:has-text('Peta')", "m13_progress_view", "progress view")
    snap(page, "m13b_progress_full", full=True)
    nav("button.nav:has-text('Home')", "m14_home_again", "home again")
    nav("button.launch-card.library-launch", "m15_library_view", "library view")
    snap(page, "m15b_library_full", full=True)
    nav("button.nav:has-text('Home')", "tmp_home1", "home")
    nav("button.launch-card.classroom-launch", "m16_classroom_view", "classroom view")
    nav("button.nav:has-text('Home')", "tmp_home2", "home")
    nav("button.launch-card.skills-launch", "m17_skills_view", "skills view")
    snap(page, "m17b_skills_full", full=True)
    nav("button.nav:has-text('Home')", "tmp_home3", "home")
    nav("button.ask-button", "m18_ask_view", "ask view")
    nav("button.nav:has-text('Home')", "tmp_home4", "home")
    # test (Mulai hari ini)
    nav("button.primary.luxe", "m19_test_view", "test view")
    dump(page, "test view detail")
    nav("button.nav:has-text('Home')", "tmp_home5", "home")

    b.close()
LOG.close()
print("PHASE A DONE")
