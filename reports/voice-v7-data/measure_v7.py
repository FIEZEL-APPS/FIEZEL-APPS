"""V7: mengukur ulang narasi Library (garis dasar V6) lalu menguji aturan anggaran blok V7.

Harness, mesin, teks uji, dan cara hitung metrik DIPINJAM UTUH dari reports/voice-v6-data/
(measure_callers.py + harness-callers.html). Yang berbeda hanya satu variabel: aturan
nextBlockBudget() yang memecah bab menjadi blok. Dua urutan blok diukur dalam SATU sesi
browser yang sama supaya angkanya sebanding baris demi baris.

  v6_shipped  : max(80, round(prev * 1.15)), settled 224      <- yang terkirim sebelum V7
  v7_measured : max(70, round((prev*0.0669 + 0.30) / 0.0583)) <- calon V7

Jalankan: python3 reports/voice-v7-data/measure_v7.py   (dari akar worktree wt-v7lib)
"""
import json
import os
import sys
import time

ROOT = "/home/user/workspace/wt-v7lib"
sys.path.insert(0, os.path.join(ROOT, "reports/voice-v6-data"))

import measure_callers as mc  # noqa: E402

mc.ROOT = ROOT
OUT = os.path.join(ROOT, "reports/voice-v7-data")
CHROME = ("/home/user/.cache/ms-playwright/chromium_headless_shell-1217/"
          "chrome-headless-shell-linux64/chrome-headless-shell")

BLOCK_MAX_CHARS = 900
LEAD_BLOCK_CHARS = 80

# Tetapan V6 yang terkirim hari ini.
V6_FACTOR = 1.15
V6_SETTLED = 224

# Tetapan V7, diturunkan dari reports/voice-v6-data/block-measurements.json:
#   GEN   = 36494 ms generate / 626 char  = 0.0583 s/char
#   SPEAK = 41.86 s PCM       / 626 char  = 0.0669 s/char (sudah termasuk senyap tepi)
GEN_S_PER_CHAR = 0.0583
SPEAK_S_PER_CHAR = 0.0669
BOUNDARY_SLACK_S = 0.30
MIN_RAMP_CHARS = 70
V7_SETTLED = 226


def budget_v6(prev):
    if prev >= V6_SETTLED:
        return BLOCK_MAX_CHARS
    return max(LEAD_BLOCK_CHARS, round(prev * V6_FACTOR))


def budget_v7(prev, floor=MIN_RAMP_CHARS, slack=BOUNDARY_SLACK_S):
    cover_s = prev * SPEAK_S_PER_CHAR + slack
    budget = round(cover_s / GEN_S_PER_CHAR)
    if budget >= V7_SETTLED:
        return BLOCK_MAX_CHARS
    return max(floor, min(BLOCK_MAX_CHARS, budget))


def budget_v7_pure(prev):
    """Tanpa lantai minimum, kelonggaran 0,30 s: blok jadi jauh lebih banyak."""
    return budget_v7(prev, floor=0, slack=0.30)


def budget_v7_slack800(prev):
    """Tanpa lantai minimum, kelonggaran 0,80 s: satu tetapan saja, lubang tetap terbatas."""
    return budget_v7(prev, floor=0, slack=0.80)


def blocks_for(sentences, budget_fn):
    """Aritmetika yang sama dengan blockAt() + nextBlockBudget() di fiezel-library-ui.js."""
    out = []
    i = 0
    cap = LEAD_BLOCK_CHARS
    while i < len(sentences):
        picked = [sentences[i]]
        chars = len(sentences[i])
        j = i + 1
        while j < len(sentences) and chars + 1 + len(sentences[j]) <= min(cap, BLOCK_MAX_CHARS):
            picked.append(sentences[j])
            chars += 1 + len(sentences[j])
            j += 1
        out.append(" ".join(picked))
        cap = budget_fn(len(out[-1]))
        i = j
    return out


def main():
    from playwright.sync_api import sync_playwright

    book = json.load(open(os.path.join(ROOT, "features/library/library-books-v1.json")))["books"][0]
    sentences = [s["en"] for ch in book["chapters"] for s in ch["sentences"]][:18]

    all_rules = {
        "v6_shipped": budget_v6,
        "v7_measured": budget_v7,
        "v7_pure_cover": budget_v7_pure,
        "v7_slack800": budget_v7_slack800,
    }
    wanted = [r for r in os.environ.get(
        "V7_RULES", "v6_shipped,v7_measured,v7_pure_cover").split(",") if r]
    runs = {name: blocks_for(sentences, all_rules[name]) for name in wanted}
    repeats = int(os.environ.get("V7_REPEATS", "2"))
    for name, blocks in runs.items():
        print(name, "->", len(blocks), "blok", [len(b) for b in blocks], "char")

    out = {
        "sentences": sentences,
        "book": book.get("title") or book.get("id"),
        "nextBlock": mc.NEXT_BLOCK,
        "rules": {
            "v6_shipped": {"lead": LEAD_BLOCK_CHARS, "factor": V6_FACTOR,
                           "settled": V6_SETTLED, "max": BLOCK_MAX_CHARS},
            "v7_measured": {"lead": LEAD_BLOCK_CHARS, "genSPerChar": GEN_S_PER_CHAR,
                            "speakSPerChar": SPEAK_S_PER_CHAR,
                            "boundarySlackS": BOUNDARY_SLACK_S,
                            "minRampChars": MIN_RAMP_CHARS,
                            "settled": V7_SETTLED, "max": BLOCK_MAX_CHARS},
            "v7_pure_cover": {"lead": LEAD_BLOCK_CHARS, "genSPerChar": GEN_S_PER_CHAR,
                              "speakSPerChar": SPEAK_S_PER_CHAR,
                              "boundarySlackS": 0.30,
                              "minRampChars": 0,
                              "settled": V7_SETTLED, "max": BLOCK_MAX_CHARS},
            "v7_slack800": {"lead": LEAD_BLOCK_CHARS, "genSPerChar": GEN_S_PER_CHAR,
                            "speakSPerChar": SPEAK_S_PER_CHAR,
                            "boundarySlackS": 0.80,
                            "minRampChars": 0,
                            "settled": V7_SETTLED, "max": BLOCK_MAX_CHARS,
                            "catatan": "INI aturan yang terkirim di features/library/"
                                       "fiezel-library-ui.js sesudah V7"},
        },
        "repeats": repeats,
        "blockSizes": {k: [len(b) for b in v] for k, v in runs.items()},
        "blocks": runs,
        "runs": {},
    }

    httpd = mc.serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=[
            "--autoplay-policy=no-user-gesture-required",
            "--disable-features=AudioServiceOutOfProcess",
        ])
        page = browser.new_page()
        page.set_default_timeout(900000)
        page.on("pageerror", lambda e: print("[pageerror]", str(e)[:300]))
        page.goto(f"http://127.0.0.1:{mc.PORT}/reports/voice-v6-data/harness-callers.html")
        page.wait_for_function("() => !!window.__boot")
        booted = time.time()
        page.evaluate("() => window.__boot()")
        out["bootSeconds"] = round(time.time() - booted, 2)
        print("booted in", out["bootSeconds"], "s")

        page.evaluate("(s) => window.__loadDoor(s)", "/features/neural-voice/fiezel-voice-say.js")
        page.wait_for_function("() => !!window.FiezelVoiceSay")

        for rep in range(repeats):
            for name, blocks in runs.items():
                key = f"{name}#{rep + 1}"
                page.evaluate("async () => { await window.FiezelVoiceRuntime.speak('Ready.', {}); }")
                page.evaluate("() => window.__reset()")
                print("running", key)
                page.evaluate("async (a) => { await window.__runBlocks(a[0], a[1]); }",
                              [blocks, mc.NEXT_BLOCK])
                dump = page.evaluate("() => window.__dump()")
                out["runs"][key] = {"rule": name, "repeat": rep + 1,
                                    "blockSizes": [len(b) for b in blocks],
                                    "metrics": mc.metrics(dump), "dump": dump}
                m = out["runs"][key]["metrics"]
                print("  say:", m["sayCalls"], "renders:", m["renders"],
                      "firstSound:", m["firstSoundMs"], "ms; sched mean:", m["meanSchedulingGapMs"],
                      "ms; audible mean:", m["meanAudibleGapMs"], "ms; span", m["totalSpanS"],
                      "s; silentShare", m["silentShare"], "guardHits", m["guardHits"])
        browser.close()
    httpd.shutdown()

    os.makedirs(OUT, exist_ok=True)
    name = os.environ.get("V7_OUT", "block-measurements-v7.json")
    with open(os.path.join(OUT, name), "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote reports/voice-v7-data/" + name)


if __name__ == "__main__":
    main()
