"""V5 prefetch: mengukur JEDA lewat PINTU FiezelVoiceSay, bukan lewat layanan neural.

Harness V1 (reports/voice-v1-data/measure.py) memanggil layanan neural langsung, jadi
skenario A2-nya adalah batas atas teoretis: ia membuktikan prefetch neural MAMPU menutup
jeda, bukan bahwa pintu bersama benar-benar sampai ke sana. Skrip ini menutup celah itu:
mesin supertonic-3 yang sama, tetapi yang dipanggil adalah FiezelVoiceSay.say/prefetch,
sekali dengan berkas pintu SEBELUM perbaikan v5 (git HEAD) dan sekali SESUDAH.

Jalankan: python3 reports/voice-v5-data/measure_door.py   (dari akar worktree wt-vprefetch)
"""
import json
import os
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/home/user/workspace/wt-vprefetch"
OUT = os.path.join(ROOT, "reports/voice-v5-data")
PORT = 8741

# Teks uji IDENTIK dengan reports/voice-v1-data/measure.py, supaya angkanya sebanding.
PARA1 = [
    "The morning market opens before the sun clears the rooftops.",
    "Sellers arrange fruit in careful rows while the first buyers arrive.",
    "By seven the narrow lanes are already loud with bargaining.",
]
PARA2 = [
    "Across the road a small kitchen serves rice and hot broth.",
    "Students stop there before class because the food is quick and cheap.",
    "When the rain begins everyone crowds under the same blue awning.",
]
SENTENCES = PARA1 + PARA2

DOORS = [
    ("before_v5_door", "/reports/voice-v5-data/fiezel-voice-say-before.js"),
    ("after_v5_door", "/features/neural-voice/fiezel-voice-say.js"),
]


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


def serve():
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), partial(Handler, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def metrics(dump):
    events = dump["events"]
    starts = [e for e in events if e["type"] == "source_start"]
    says = [e for e in events if e["type"] == "say_call"]
    silence = {}
    for meta in dump["pcmMeta"]:
        silence.setdefault(meta["text"], meta)

    boundaries = []
    for i in range(len(starts) - 1):
        cur, nxt = starts[i], starts[i + 1]
        sched = (nxt["startsAtCtx"] - (cur["startsAtCtx"] + (cur["durationS"] or 0))) * 1000
        tail = silence.get(says[i]["text"], {}).get("tailMs") if i < len(says) else None
        head = silence.get(says[i + 1]["text"], {}).get("headMs") if i + 1 < len(says) else None
        audible = sched + (tail or 0) + (head or 0)
        boundaries.append({
            "boundary": f"{i + 1}->{i + 2}",
            "schedulingGapMs": round(sched, 1),
            "tailSilenceMs": tail,
            "headSilenceMs": head,
            "audibleGapMs": round(audible, 1),
            "paragraphBreak": i == 2,
        })

    audio_s = sum((s["durationS"] or 0) for s in starts)
    total_s = ((starts[-1]["startsAtCtx"] + (starts[-1]["durationS"] or 0)) - starts[0]["startsAtCtx"]) if starts else 0
    first_sound = None
    if starts and says:
        first_sound = round((starts[0]["wall"] - says[0]["wall"]), 1)
    gens = [e for e in events if e["type"] == "generate_ready"]
    prefetch_results = [e for e in events if e["type"].startswith("prefetch_")]
    return {
        "sentences": len(says),
        "renders": len(gens),
        "firstSoundMs": first_sound,
        "meanSchedulingGapMs": round(sum(b["schedulingGapMs"] for b in boundaries) / len(boundaries), 1) if boundaries else None,
        "meanAudibleGapMs": round(sum(b["audibleGapMs"] for b in boundaries) / len(boundaries), 1) if boundaries else None,
        "paragraphAudibleGapMs": next((b["audibleGapMs"] for b in boundaries if b["paragraphBreak"]), None),
        "totalSpanS": round(total_s, 2),
        "audioS": round(audio_s, 2),
        "silentShare": round((total_s - audio_s) / total_s, 4) if total_s else None,
        "meanRtf": round(sum(g["rtf"] for g in gens if g.get("rtf")) / max(1, len([g for g in gens if g.get("rtf")])), 3),
        "prefetchEvents": prefetch_results,
        "guardHits": dump["guardHits"],
        "boundaries": boundaries,
    }


def main():
    from playwright.sync_api import sync_playwright

    httpd = serve()
    out = {"sentences": SENTENCES, "runs": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--autoplay-policy=no-user-gesture-required",
            "--disable-features=AudioServiceOutOfProcess",
        ])
        page = browser.new_page()
        page.set_default_timeout(900000)
        page.on("pageerror", lambda e: print("[pageerror]", str(e)[:300]))
        page.goto(f"http://127.0.0.1:{PORT}/reports/voice-v5-data/harness-door.html")
        page.wait_for_function("() => !!window.__boot")
        booted = time.time()
        page.evaluate("() => window.__boot()")
        out["bootSeconds"] = round(time.time() - booted, 2)
        print("booted in", out["bootSeconds"], "s")

        for label, src in DOORS:
            page.evaluate("(s) => window.__loadDoor(s)", src)
            page.wait_for_function("() => !!window.FiezelVoiceSay")
            # render pemanasan supaya angka pertama bukan biaya start dingin
            page.evaluate("async () => { await window.FiezelVoiceRuntime.speak('Ready.', {}); }")
            page.evaluate("() => window.__reset()")
            print("running", label)
            page.evaluate("async (a) => { await window.__runDoor(a[0], a[1]); }", [SENTENCES, label])
            dump = page.evaluate("() => window.__dump()")
            out["runs"][label] = {"metrics": metrics(dump), "dump": dump}
            m = out["runs"][label]["metrics"]
            print("  audible gap mean:", m["meanAudibleGapMs"], "ms; total", m["totalSpanS"], "s; guardHits", m["guardHits"])
        browser.close()
    httpd.shutdown()

    with open(os.path.join(OUT, "door-measurements.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote door-measurements.json")


if __name__ == "__main__":
    main()
