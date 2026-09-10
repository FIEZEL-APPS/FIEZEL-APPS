"""V1 voice pause audit: measures the REAL supertonic-3 engine in Chromium.

Serves the worktree over http://127.0.0.1:PORT (secure context, Worker allowed),
loads harness.html which builds the engine exactly like
features/neural-voice/fiezel-neural-voice-bootstrap.js:269-313, then runs two
call shapes and writes raw event logs + per-render WAV files.
"""
import base64
import json
import os
import subprocess
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/home/user/workspace/wt-vaudit"
OUT = os.path.join(ROOT, "reports/voice-v1-data")
PORT = 8731

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
PASSAGE = " ".join(PARA1) + "\n\n" + " ".join(PARA2)


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


def main():
    from playwright.sync_api import sync_playwright

    httpd = serve()
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(
            args=[
                "--autoplay-policy=no-user-gesture-required",
                "--disable-features=AudioServiceOutOfProcess",
                "--use-fake-device-for-media-stream",
            ]
        )
        page = browser.new_page()
        page.set_default_timeout(900000)
        page.on("console", lambda m: print("[console]", m.type, m.text[:300]))
        page.on("pageerror", lambda e: print("[pageerror]", str(e)[:300]))
        page.goto(f"http://127.0.0.1:{PORT}/reports/voice-v1-data/harness.html")
        page.wait_for_function("() => !!window.__boot")
        boot_started = time.time()
        page.evaluate("() => window.__boot()")
        results["boot_seconds"] = round(time.time() - boot_started, 2)
        print("booted in", results["boot_seconds"], "s")

        results["chunk_plan_passage"] = page.evaluate(
            "(t) => window.__plan(t)", PASSAGE
        )
        results["chunk_plan_single_sentence"] = page.evaluate(
            "(t) => window.__plan(t)", SENTENCES[0]
        )

        runs = {}

        # warm-up render so the first measured number is not the cold-start cost
        page.evaluate(
            "async () => { await window.__runPerSentence(['Ready.'], false); window.__reset(); }"
        )

        for name, expr, arg in [
            ("A_per_sentence_no_prefetch", "window.__runPerSentence(a, false)", SENTENCES),
            ("A2_per_sentence_with_prefetch", "window.__runPerSentence(a, true)", SENTENCES),
            ("B_single_speak_streaming", "window.__runOneCall(a)", PASSAGE),
        ]:
            page.evaluate("() => window.__reset()")
            print("running", name)
            page.evaluate("async (a) => { await %s; }" % expr, arg)
            dump = page.evaluate("() => window.__dump()")
            runs[name] = dump
            # export every captured render as WAV for ffmpeg silence measurement
            wav_dir = os.path.join(OUT, "wav", name)
            os.makedirs(wav_dir, exist_ok=True)
            for meta in dump["pcmMeta"]:
                b64 = page.evaluate("(i) => window.__wav(i)", meta["index"])
                if not b64:
                    continue
                with open(os.path.join(wav_dir, f"chunk{meta['index']:02d}.wav"), "wb") as fh:
                    fh.write(base64.b64decode(b64))
            print("  events:", len(dump["events"]), "renders:", len(dump["pcmMeta"]))

        results["runs"] = runs
        browser.close()
    httpd.shutdown()

    with open(os.path.join(OUT, "raw-measurements.json"), "w") as fh:
        json.dump(results, fh, indent=1)
    print("wrote raw-measurements.json")


if __name__ == "__main__":
    main()
