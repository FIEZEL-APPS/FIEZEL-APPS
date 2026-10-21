"""V6: mengukur pola yang BENAR-BENAR dikirim narasi Library setelah tangga anggaran.

measure_callers.py memperlihatkan masalahnya: mengirim seluruh teks sebagai satu ucapan
membuat potongan pembuka 248 char, dan suara pertama baru datang 12.395 ms setelah tombol
putar. Skrip ini mengukur perbaikannya - blok bertangga 80 -> 200 -> 440 -> 900 char, sama
seperti BLOCK_CHAR_RAMP di features/library/fiezel-library-ui.js - dengan mesin, teks uji,
dan cara hitung yang sama seperti V1/V5.

Jalankan: python3 reports/voice-v6-data/measure_blocks.py
"""
import json
import os
import time

from measure_callers import (  # noqa: E402  - satu sumber kebenaran untuk teks uji & metrik
    NEXT_BLOCK,
    OUT,
    PORT,
    SENTENCES,
    metrics,
    serve,
)

LEAD = 80
FACTOR = 1.15
SETTLED = 224
MAXC = 900


def next_budget(prev):
    return MAXC if prev >= SETTLED else max(LEAD, round(prev * FACTOR))


def ramped_blocks(sentences):
    """Aritmetika yang sama dengan blockAt()+nextBlockBudget() di fiezel-library-ui.js."""
    blocks = []
    i = 0
    cap = LEAD
    while i < len(sentences):
        picked = [sentences[i]]
        chars = len(sentences[i])
        j = i + 1
        while j < len(sentences) and chars + 1 + len(sentences[j]) <= cap:
            picked.append(sentences[j])
            chars += 1 + len(sentences[j])
            j += 1
        blocks.append(" ".join(picked))
        cap = next_budget(len(blocks[-1]))
        i = j
    return blocks


def main():
    from playwright.sync_api import sync_playwright

    import json as _json
    bk = _json.load(open(os.path.join(os.path.dirname(OUT), "..", "features", "library", "library-books-v1.json")))["books"][0]
    long_sentences = [s["en"] for ch in bk["chapters"] for s in ch["sentences"]][:18]
    blocks = ramped_blocks(long_sentences)
    out_sent = long_sentences
    print("blok:", [len(b) for b in blocks], "char")

    httpd = serve()
    out = {"sentences": out_sent, "ramp": {"lead": LEAD, "factor": FACTOR, "settled": SETTLED, "max": MAXC}, "blocks": blocks, "nextBlock": NEXT_BLOCK, "runs": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--autoplay-policy=no-user-gesture-required",
            "--disable-features=AudioServiceOutOfProcess",
        ])
        page = browser.new_page()
        page.set_default_timeout(900000)
        page.on("pageerror", lambda e: print("[pageerror]", str(e)[:300]))
        page.goto(f"http://127.0.0.1:{PORT}/reports/voice-v6-data/harness-callers.html")
        page.wait_for_function("() => !!window.__boot")
        booted = time.time()
        page.evaluate("() => window.__boot()")
        out["bootSeconds"] = round(time.time() - booted, 2)
        page.evaluate("(s) => window.__loadDoor(s)", "/features/neural-voice/fiezel-voice-say.js")
        page.wait_for_function("() => !!window.FiezelVoiceSay")
        page.evaluate("async () => { await window.FiezelVoiceRuntime.speak('Ready.', {}); }")
        page.evaluate("() => window.__reset()")
        print("running ramped_blocks_prefetch")
        page.evaluate("async (a) => { await window.__runBlocks(a[0], a[1]); }", [blocks, NEXT_BLOCK])
        dump = page.evaluate("() => window.__dump()")
        out["runs"]["ramped_blocks_prefetch"] = {"metrics": metrics(dump), "dump": dump}
        m = out["runs"]["ramped_blocks_prefetch"]["metrics"]
        print("  say calls:", m["sayCalls"], "renders:", m["renders"],
              "first sound:", m["firstSoundMs"], "ms; audible gap mean:", m["meanAudibleGapMs"],
              "ms; total", m["totalSpanS"], "s; guardHits", m["guardHits"])
        browser.close()
    httpd.shutdown()

    with open(os.path.join(OUT, "block-measurements.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote block-measurements.json")


if __name__ == "__main__":
    main()
