"""Turns raw-measurements.json + the exported WAV renders into the audit tables.

Silence inside each render is measured twice:
  - ffmpeg silencedetect at -50 dB (the log kept as evidence per file)
  - a direct sample scan at 0.0025 amplitude, which is the SAME threshold the
    player's own trimmer uses (fiezel-web-audio-player.js:57 SILENCE_FLOOR)
"""
import json
import os
import re
import subprocess
import wave

import numpy as np

OUT = os.path.dirname(os.path.abspath(__file__))
RAW = json.load(open(os.path.join(OUT, "raw-measurements.json")))
FLOOR = 0.0025


def ffprobe_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 4)


def ffmpeg_silence(path):
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path,
         "-af", "silencedetect=noise=-50dB:d=0.05", "-f", "null", "-"],
        capture_output=True, text=True)
    return [l.strip() for l in r.stderr.splitlines() if "silence_" in l]


def edge_silence(path):
    with wave.open(path) as w:
        rate = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768.0
    loud = np.nonzero(np.abs(data) >= FLOOR)[0]
    if not len(loud):
        return dict(rate=rate, totalMs=round(len(data) / rate * 1000, 1), headMs=None, tailMs=None)
    return dict(
        rate=rate,
        totalMs=round(len(data) / rate * 1000, 1),
        headMs=round(loud[0] / rate * 1000, 1),
        tailMs=round((len(data) - 1 - loud[-1]) / rate * 1000, 1),
        speechMs=round((loud[-1] - loud[0] + 1) / rate * 1000, 1),
    )


report = {"files": {}, "scenarios": {}}

for scenario in sorted(os.listdir(os.path.join(OUT, "wav"))):
    d = os.path.join(OUT, "wav", scenario)
    rows = []
    for name in sorted(os.listdir(d)):
        p = os.path.join(d, name)
        row = {"file": f"{scenario}/{name}", "ffprobeDurationS": ffprobe_duration(p)}
        row.update(edge_silence(p))
        row["ffmpegSilencedetect"] = ffmpeg_silence(p)
        rows.append(row)
    report["files"][scenario] = rows

for scenario, run in RAW["runs"].items():
    ev = run["events"]
    starts = [e for e in ev if e["type"] == "source_start"]
    gens = [e for e in ev if e["type"] == "generate_ready"]
    says = [e for e in ev if e["type"] == "say_call"]
    t_cmd = says[0]["wall"] if says else None
    ttfa = round(starts[0]["wall"] - t_cmd, 1) if starts and t_cmd is not None else None
    pieces = []
    for i, s in enumerate(starts):
        end = s["startsAtCtx"] + (s["durationS"] or 0)
        gap = None
        if i + 1 < len(starts):
            gap = round((starts[i + 1]["startsAtCtx"] - end) * 1000, 1)
        pieces.append({
            "index": i,
            "startsAtCtx": s["startsAtCtx"],
            "playedDurationMs": round((s["durationS"] or 0) * 1000, 1),
            "scheduledAhead": s["requestedWhen"] is not None,
            "gapToNextMs": gap,
        })
    gaps = [p["gapToNextMs"] for p in pieces if p["gapToNextMs"] is not None]
    report["scenarios"][scenario] = {
        "timeToFirstSoundMs": ttfa,
        "generationMs": [g["elapsedMs"] for g in gens],
        "generatedAudioS": [g["audioSeconds"] for g in gens],
        "realtimeFactor": [g["rtf"] for g in gens],
        "pieces": pieces,
        "gapStats": {
            "count": len(gaps),
            "minMs": min(gaps) if gaps else None,
            "maxMs": max(gaps) if gaps else None,
            "meanMs": round(sum(gaps) / len(gaps), 1) if gaps else None,
            # sentence 3 -> 4 is the paragraph boundary of the test passage
            "paragraphBoundaryMs": gaps[2] if len(gaps) > 2 else None,
        },
        "wallClockTotalMs": round(ev[-1]["wall"] - ev[0]["wall"], 1),
        "audibleAudioMs": round(sum(p["playedDurationMs"] for p in pieces), 1),
    }
    report["scenarios"][scenario]["silenceSharePct"] = round(
        100 * (1 - report["scenarios"][scenario]["audibleAudioMs"] /
               report["scenarios"][scenario]["wallClockTotalMs"]), 1)

json.dump(report, open(os.path.join(OUT, "analysis.json"), "w"), indent=1)

for k, v in report["scenarios"].items():
    print("==", k)
    print(" TTFA", v["timeToFirstSoundMs"], "gaps", v["gapStats"])
    print(" gen", v["generationMs"])
    print(" wall", v["wallClockTotalMs"], "audible", v["audibleAudioMs"], "silence%", v["silenceSharePct"])
for k, rows in report["files"].items():
    print("==", k)
    for r in rows:
        print("  ", r["file"], "total", r["totalMs"], "head", r["headMs"], "tail", r["tailMs"])
