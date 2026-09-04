import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:8930/index.html"
SHOTS = "/home/user/workspace/redesign/audit/shots"
LOG = open("/home/user/workspace/redesign/audit/capture_log3.txt", "w")
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

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.route("**://js.puter.com/**", lambda r: r.abort())
    page = boot(ctx)

    # ============ GRAMMAR LESSON FLOW ============
    page.evaluate("go('grammar')"); page.wait_for_timeout(1200)
    page.locator("button:has-text('Buka lesson')").first.click(); page.wait_for_timeout(1200)
    snap(page, "f01_grammar_lesson_intro")
    snap(page, "f01b_grammar_lesson_intro_full", full=True)
    dump(page, "grammar lesson intro")
    # find start practice button
    started = False
    for txt in ["Mulai latihan", "Latihan", "Mulai"]:
        loc = page.locator(f"button:has-text('{txt}')")
        if loc.count():
            loc.first.click(); started = True; break
    page.wait_for_timeout(1500)
    log("quiz started:", started)
    snap(page, "f02_grammar_quiz_question")
    dump(page, "grammar quiz question")

    got = {"err": False, "ok": False, "conf": False, "teach": False, "tutor": False}
    for step in range(80):
        page.wait_for_timeout(400)
        # confidence pop?
        pop = page.locator("#confidencePop")
        if pop.count() and pop.first.is_visible():
            if not got["conf"]:
                snap(page, "f03_confidence_pop"); got["conf"] = True
            try:
                page.locator("#confidencePop .confidence-scale button").nth(1).click(timeout=3000)
                page.wait_for_timeout(500)
                cont = page.locator("#confidencePop button:has-text('Lanjut')")
                if cont.count(): cont.first.click(timeout=3000)
            except Exception:
                try: page.locator("#confidencePop .confidence-skip").click(timeout=2000)
                except Exception: pass
            page.wait_for_timeout(500)
            continue
        # teach card?
        teach = page.locator("#teachNext")
        if teach.count() and teach.first.is_visible():
            if not got["teach"]:
                snap(page, "f06_grammar_teach_pause"); got["teach"] = True
            teach.first.click(); page.wait_for_timeout(600); continue
        # feedback visible?
        fb = page.locator("#feedback:not(.hidden)")
        if fb.count() and fb.first.is_visible():
            cls = fb.first.get_attribute("class") or ""
            if "feedback-error" in cls and not got["err"]:
                snap(page, "f04_feedback_wrong"); snap(page, "f04b_feedback_wrong_full", full=True); got["err"] = True
            if "feedback-success" in cls and not got["ok"]:
                snap(page, "f05_feedback_correct"); snap(page, "f05b_feedback_correct_full", full=True); got["ok"] = True
            tt = page.locator("#tutorTurn:not(.hidden)")
            if tt.count() and tt.first.is_visible() and not got["tutor"]:
                snap(page, "f06b_tutor_turn"); got["tutor"] = True
            nxt = page.locator("#quizNext")
            if nxt.count() and nxt.first.is_enabled():
                nxt.first.click(); page.wait_for_timeout(700); continue
        # tutor turn (hint/retry) without feedback
        tt = page.locator("#tutorTurn:not(.hidden)")
        if tt.count() and tt.first.is_visible():
            if not got["tutor"]:
                snap(page, "f06b_tutor_turn_hint"); dump(page, "tutor turn"); got["tutor"] = True
            btn = tt.locator("button")
            if btn.count(): btn.first.click(); page.wait_for_timeout(600); continue
        # options available -> answer
        opts = page.locator(".option:enabled")
        if opts.count():
            opts.first.click(); page.wait_for_timeout(800); continue
        # no options, no feedback: completion?
        if not page.locator(".option").count() and not page.locator("#quizNext").count():
            break
    page.wait_for_timeout(800)
    snap(page, "f07_grammar_completion")
    snap(page, "f07b_grammar_completion_full", full=True)
    dump(page, "grammar completion")
    log("got:", got)

    # ============ VOCAB QUIZ ============
    page.evaluate("go('vocab')"); page.wait_for_timeout(1200)
    dump(page, "vocab view")
    for txt in ["Mulai", "Latihan", "Belajar"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count():
            log("vocab start via", txt)
            loc.first.click(); break
    page.wait_for_timeout(1500)
    snap(page, "f08_vocab_quiz_question")
    dump(page, "vocab quiz")
    opts = page.locator(".option:enabled")
    if opts.count():
        opts.first.click(); page.wait_for_timeout(900)
        try: page.locator("#confidencePop .confidence-skip").click(timeout=2500); page.wait_for_timeout(400)
        except Exception: pass
        snap(page, "f09_vocab_feedback")

    # ============ LISTENING EXERCISE ============
    page = boot(ctx)
    page.evaluate("go('listening')"); page.wait_for_timeout(1500)
    dump(page, "listening view")
    for txt in ["Mulai", "Putar", "Latihan", "Dengarkan"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count():
            log("listening start via", txt)
            loc.first.click(); break
    page.wait_for_timeout(2000)
    snap(page, "f10_listening_exercise")
    snap(page, "f10b_listening_exercise_full", full=True)
    dump(page, "listening exercise")
    lb = page.locator("#quizListen, .quiz-listen-btn")
    if lb.count():
        lb.first.click(); page.wait_for_timeout(2500)
        snap(page, "f11_listening_playing")
        dump(page, "listening playing")

    # ============ TEST (placement/adaptive) ============
    page = boot(ctx)
    page.evaluate("go('test')"); page.wait_for_timeout(1500)
    snap(page, "f12_test_start")
    dump(page, "test view")
    for txt in ["Mulai tes", "Mulai"]:
        loc = page.locator(f"#app button:has-text('{txt}')")
        if loc.count():
            loc.first.click(); break
    page.wait_for_timeout(2000)
    snap(page, "f13_test_question")
    dump(page, "test question")

    b.close()
LOG.close()
print("DONE")
