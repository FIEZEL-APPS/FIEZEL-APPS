import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"
LOG = open("/home/user/workspace/redesign/audit/capture_log4.txt", "w")
LS = json.loads(open("/home/user/workspace/redesign/audit/ls_home.json").read())

def log(*a):
    print(*a, file=LOG); LOG.flush()

def snap(page, name, full=False):
    try:
        page.screenshot(path=f"{SHOTS}/{name}.png", full_page=full, animations="disabled", timeout=20000)
        log("SNAP", name)
    except Exception as e:
        log("snap fail", name, e)

def dump(page, label):
    try:
        info = page.evaluate("""() => {
          const vis = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
          return [...document.querySelectorAll('button,a,[onclick],input')].filter(vis).slice(0,90).map(b=>{const r=b.getBoundingClientRect();return {cls:b.className.toString().slice(0,55),txt:(b.textContent||b.placeholder||'').trim().replace(/\\s+/g,' ').slice(0,60),oc:(b.getAttribute('onclick')||'').slice(0,55),w:Math.round(r.width),h:Math.round(r.height)}});
        }""")
        log(f"--- DUMP {label} ---")
        for x in info: log(" ", json.dumps(x, ensure_ascii=False))
    except Exception as e:
        log("dump fail", e)

def boot(ctx):
    page = ctx.new_page()
    page.goto(URL)
    page.evaluate("ls => { localStorage.clear(); for (const [k,v] of Object.entries(ls)) localStorage.setItem(k,v); }", LS)
    page.reload()
    page.wait_for_timeout(4000)
    return page

def close_conf(page):
    try:
        skip = page.locator("#confidencePop .confidence-skip")
        if skip.count() and skip.first.is_visible():
            skip.first.click(timeout=3000); page.wait_for_timeout(400); return True
    except Exception: pass
    return False

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())

    # ============ GRAMMAR QUIZ FEEDBACK (wrong + correct) ============
    page = boot(ctx)
    page.evaluate("go('grammar')"); page.wait_for_timeout(1200)
    page.locator("button:has-text('Buka lesson')").first.click(); page.wait_for_timeout(1200)
    for txt in ["Mulai latihan", "Latihan", "Mulai"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count(): loc.first.click(); break
    page.wait_for_timeout(1500)
    got = {"err": False, "ok": False}
    for step in range(40):
        if got["err"] and got["ok"]: break
        page.wait_for_timeout(400)
        if close_conf(page):
            # feedback should now be visible
            fb = page.locator("#feedback")
            if fb.count() and fb.first.is_visible():
                cls = fb.first.get_attribute("class") or ""
                if "feedback-error" in cls and not got["err"]:
                    snap(page, "f04_feedback_wrong")
                    snap(page, "f04b_feedback_wrong_full", full=True)
                    dump(page, "feedback wrong")
                    got["err"] = True
                elif "feedback-success" in cls and not got["ok"]:
                    snap(page, "f05_feedback_correct")
                    snap(page, "f05b_feedback_correct_full", full=True)
                    got["ok"] = True
            nxt = page.locator("#quizNext")
            if nxt.count() and nxt.first.is_enabled():
                nxt.first.click(); page.wait_for_timeout(700)
            continue
        teach = page.locator("#teachNext")
        if teach.count() and teach.first.is_visible():
            teach.first.click(); page.wait_for_timeout(600); continue
        nxt = page.locator("#quizNext")
        if nxt.count() and nxt.first.is_visible() and nxt.first.is_enabled():
            nxt.first.click(); page.wait_for_timeout(700); continue
        tt = page.locator("#tutorTurn:not(.hidden) button")
        if tt.count() and tt.first.is_visible():
            tt.first.click(); page.wait_for_timeout(600); continue
        opts = page.locator(".option:enabled")
        if opts.count():
            # alternate between first and second option to vary correctness
            opts.nth(step % min(2, opts.count())).click(); page.wait_for_timeout(900); continue
        break
    log("feedback got:", got)

    # ============ VOCAB QUIZ + FLASHCARDS ============
    page = boot(ctx)
    page.evaluate("go('vocab')"); page.wait_for_timeout(1200)
    snap(page, "f08_vocab_view")
    page.locator("[onclick^='startVocabQuiz']").first.click(); page.wait_for_timeout(1500)
    snap(page, "f08b_vocab_quiz_question")
    dump(page, "vocab quiz question")
    opts = page.locator(".option:enabled")
    if opts.count():
        opts.first.click(); page.wait_for_timeout(900)
        close_conf(page)
        snap(page, "f09_vocab_feedback")
    # flashcards
    page.evaluate("go('vocab')"); page.wait_for_timeout(1000)
    fc = page.locator("[onclick^='flashcards']")
    if fc.count():
        fc.first.click(); page.wait_for_timeout(1200)
        snap(page, "f09b_vocab_flashcards")
        dump(page, "flashcards")

    # ============ LISTENING DICTATION: play + grade ============
    page = boot(ctx)
    page.evaluate("go('listening')"); page.wait_for_timeout(1500)
    for txt in ["Mulai", "Latihan", "Dengarkan"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count(): loc.first.click(); break
    page.wait_for_timeout(1500)
    listen = page.locator("#app button.fsl-primary:has-text('Dengarkan')")
    if listen.count():
        listen.first.click(); page.wait_for_timeout(3000)
        snap(page, "f11_listening_playing")
        dump(page, "listening playing")
    inp = page.locator(".fsl-input")
    if inp.count():
        try:
            inp.first.fill("hello how are you", timeout=5000)
            page.locator("#app button.fsl-primary:has-text('Nilai jawaban')").first.click(timeout=5000)
            page.wait_for_timeout(1500)
            snap(page, "f11b_listening_feedback")
            snap(page, "f11c_listening_feedback_full", full=True)
            dump(page, "listening feedback")
        except Exception as e: log("listening grade fail", e)

    # ============ SPEAKING EXERCISE ============
    page.evaluate("go('speaking')"); page.wait_for_timeout(1500)
    snap(page, "f14_speaking_view")
    dump(page, "speaking view")
    for txt in ["Mulai", "Latihan"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count(): loc.first.click(); break
    page.wait_for_timeout(1500)
    snap(page, "f14b_speaking_exercise")
    dump(page, "speaking exercise")

    # ============ READING SESSION ============
    page.evaluate("go('reading')"); page.wait_for_timeout(1500)
    dump(page, "reading view")
    for sel in ["[onclick^='startReading']", "#app button:has-text('Baca')", "#app button:has-text('Mulai')"]:
        loc = page.locator(sel)
        if loc.count(): loc.first.click(); log("reading via", sel); break
    page.wait_for_timeout(1500)
    snap(page, "f15_reading_session")
    snap(page, "f15b_reading_session_full", full=True)
    dump(page, "reading session")

    b.close()
LOG.close()
print("DONE")
