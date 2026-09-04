import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"
LOG = open("/home/user/workspace/redesign/audit/capture_log5.txt", "w")
LS = json.loads(open("/home/user/workspace/redesign/audit/ls_home.json").read())

def log(*a):
    print(*a, file=LOG); LOG.flush()

def snap(page, name, full=False):
    try:
        page.screenshot(path=f"{SHOTS}/{name}.png", full_page=full, animations="disabled", timeout=20000)
        log("SNAP", name)
    except Exception as e:
        log("snap fail", name, e)

def boot(ctx):
    page = ctx.new_page()
    page.goto(URL)
    page.evaluate("ls => { localStorage.clear(); for (const [k,v] of Object.entries(ls)) localStorage.setItem(k,v); }", LS)
    page.reload()
    page.wait_for_timeout(4000)
    return page

with sync_playwright() as p:
    b = p.chromium.launch()

    # ===== finish mobile listening feedback =====
    ctxm = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctxm.route("**://js.puter.com/**", lambda r: r.abort())
    page = boot(ctxm)
    page.evaluate("go('listening')"); page.wait_for_timeout(1500)
    for txt in ["Mulai", "Latihan", "Dengarkan"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count(): loc.first.click(); break
    page.wait_for_timeout(1500)
    listen = page.locator("#app button.fsl-primary:has-text('Dengarkan')")
    if listen.count():
        listen.first.click(); page.wait_for_timeout(3500)
    opt = page.locator(".fsl-option")
    if opt.count():
        try:
            opt.first.click(timeout=5000); page.wait_for_timeout(1500)
            snap(page, "f11b_listening_feedback")
            snap(page, "f11c_listening_feedback_full", full=True)
        except Exception as e: log("listening answer fail", e)
    else:
        # dictation variant
        inp = page.locator(".fsl-input")
        if inp.count():
            try:
                inp.first.fill("hello", timeout=4000)
                page.locator("#app button.fsl-primary:has-text('Nilai jawaban')").first.click(timeout=4000)
                page.wait_for_timeout(1500)
                snap(page, "f11b_listening_feedback")
            except Exception as e: log("dictation fail", e)
    ctxm.close()

    # ===== desktop =====
    ctx = b.new_context(viewport={"width":1280,"height":800}, device_scale_factor=1)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())
    page = boot(ctx)
    snap(page, "d01_home_top")
    snap(page, "d01b_home_full", full=True)
    page.evaluate("go('grammar')"); page.wait_for_timeout(1300)
    snap(page, "d02_grammar_hub")
    page.locator("button:has-text('Buka lesson')").first.click(); page.wait_for_timeout(1200)
    snap(page, "d03_grammar_lesson_intro")
    for txt in ["Mulai latihan", "Latihan", "Mulai"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count(): loc.first.click(); break
    page.wait_for_timeout(1500)
    snap(page, "d04_grammar_quiz_question")
    opts = page.locator(".option:enabled")
    if opts.count():
        opts.first.click(); page.wait_for_timeout(900)
        try:
            page.locator("#confidencePop .confidence-skip").click(timeout=3000); page.wait_for_timeout(400)
        except Exception: pass
        snap(page, "d05_grammar_feedback")
    page.evaluate("go('progress')"); page.wait_for_timeout(1300)
    snap(page, "d06_progress")
    snap(page, "d06b_progress_full", full=True)
    page.evaluate("go('library')"); page.wait_for_timeout(1300)
    snap(page, "d07_library")
    page.evaluate("go('vocab')"); page.wait_for_timeout(1300)
    snap(page, "d08_vocab")
    page.evaluate("go('skills')"); page.wait_for_timeout(1300)
    snap(page, "d09_skills")
    try:
        page.click("[onclick^='openSettings']", timeout=8000); page.wait_for_timeout(1000)
        snap(page, "d10_settings")
    except Exception as e: log("settings fail", e)

    b.close()
LOG.close()
print("DONE")
