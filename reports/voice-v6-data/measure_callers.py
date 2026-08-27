"""V6 pemanggil: mengukur jeda pada POLA PEMANGGILAN, bukan pada implementasi pintu.

Harness V5 (reports/voice-v5-data/measure_door.py) membandingkan DUA BERKAS PINTU dengan
satu pola pemanggilan. Skrip ini membalik variabelnya: satu berkas pintu (yang sesudah V5),
tiga POLA PEMANGGILAN - persis tiga bentuk yang ada di kode setelah V6.

Mesin, teks uji, dan cara menghitung jeda terdengar identik dengan V5, supaya angkanya
sebanding baris demi baris.

Jalankan: python3 reports/voice-v6-data/measure_callers.py   (dari akar worktree wt-vcallers)
"""
import json
import os
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/home/user/workspace/wt-vcallers"
OUT = os.path.join(ROOT, "reports/voice-v6-data")
PORT = 8743

# Teks uji IDENTIK dengan V1 dan V5.
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
# Blok berikutnya yang dihangatkan pola whole_text: bentuknya sama dengan yang benar-benar
# dikirim narasi Library (teks utuh satu blok), bukan satu kalimat.
NEXT_BLOCK = "The afternoon heat empties the lanes for an hour. Only the tea stall stays open, and its radio keeps playing."

PATTERNS = ["per_sentence_no_prefetch", "per_sentence_prefetch", "whole_text_prefetch"]


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
    """Sama dengan measure_door.py, dengan satu perbedaan yang perlu dijelaskan.

    Pada pola whole_text hanya ada SATU say(), jadi batas yang diukur adalah batas antar
    POTONGAN di dalam satu ucapan - dan itu memang perbandingan yang benar: yang didengar
    murid adalah jeda di tempat yang sama (akhir kalimat), yang berubah hanya siapa yang
    menjadwalkannya. Senyap tepi diambil dari PCM per potongan.
    """
    events = dump["events"]
    starts = [e for e in events if e["type"] == "source_start"]
    gens = [e for e in events if e["type"] == "generate_ready"]
    says = [e for e in events if e["type"] == "say_call"]
    pcm = dump["pcmMeta"]

    boundaries = []
    for i in range(len(starts) - 1):
        cur, nxt = starts[i], starts[i + 1]
        sched = (nxt["startsAtCtx"] - (cur["startsAtCtx"] + (cur["durationS"] or 0))) * 1000
        tail = pcm[i]["tailMs"] if i < len(pcm) else None
        head = pcm[i + 1]["headMs"] if i + 1 < len(pcm) else None
        boundaries.append({
            "boundary": f"{i + 1}->{i + 2}",
            "schedulingGapMs": round(sched, 1),
            "tailSilenceMs": tail,
            "headSilenceMs": head,
            "audibleGapMs": round(sched + (tail or 0) + (head or 0), 1),
        })

    audio_s = sum((s["durationS"] or 0) for s in starts)
    total_s = ((starts[-1]["startsAtCtx"] + (starts[-1]["durationS"] or 0)) - starts[0]["startsAtCtx"]) if starts else 0
    first_sound = round(starts[0]["wall"] - says[0]["wall"], 1) if starts and says else None
    return {
        "sayCalls": len(says),
        "renders": len(gens),
        "audioSources": len(starts),
        "firstSoundMs": first_sound,
        "meanSchedulingGapMs": round(sum(b["schedulingGapMs"] for b in boundaries) / len(boundaries), 1) if boundaries else None,
        "meanAudibleGapMs": round(sum(b["audibleGapMs"] for b in boundaries) / len(boundaries), 1) if boundaries else None,
        "maxAudibleGapMs": max((b["audibleGapMs"] for b in boundaries), default=None),
        "totalSpanS": round(total_s, 2),
        "audioS": round(audio_s, 2),
        "silentShare": round((total_s - audio_s) / total_s, 4) if total_s else None,
        "guardHits": dump["guardHits"],
        "boundaries": boundaries,
    }


def main():
    from playwright.sync_api import sync_playwright

    httpd = serve()
    out = {"sentences": SENTENCES, "nextBlock": NEXT_BLOCK, "door": "features/neural-voice/fiezel-voice-say.js", "runs": {}}
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
        print("booted in", out["bootSeconds"], "s")

        page.evaluate("(s) => window.__loadDoor(s)", "/features/neural-voice/fiezel-voice-say.js")
        page.wait_for_function("() => !!window.FiezelVoiceSay")

        for pattern in PATTERNS:
            page.evaluate("async () => { await window.FiezelVoiceRuntime.speak('Ready.', {}); }")
            page.evaluate("() => window.__reset()")
            print("running", pattern)
            page.evaluate("async (a) => { await window.__runPattern(a[0], a[1], a[2]); }", [SENTENCES, pattern, NEXT_BLOCK])
            dump = page.evaluate("() => window.__dump()")
            out["runs"][pattern] = {"metrics": metrics(dump), "dump": dump}
            m = out["runs"][pattern]["metrics"]
            print("  say calls:", m["sayCalls"], "renders:", m["renders"],
                  "audible gap mean:", m["meanAudibleGapMs"], "ms; total", m["totalSpanS"], "s; guardHits", m["guardHits"])
        browser.close()
    httpd.shutdown()

    with open(os.path.join(OUT, "caller-measurements.json"), "w") as fh:
        json.dump(out, fh, indent=1)
    print("wrote caller-measurements.json")


if __name__ == "__main__":
    main()
