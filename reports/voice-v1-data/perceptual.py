"""Perceived pause = scheduling gap + trailing silence inside piece N + leading
silence inside piece N+1. Path A never trims (trim only when chunks>1, see
fiezel-neural-voice.js:604-607), so both silences are fully audible there.
"""
import json
import os

OUT = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(os.path.join(OUT, "analysis.json")))
res = {}
for scen, s in A["scenarios"].items():
    files = A["files"][scen]
    trimmed = scen.startswith("B_")
    rows = []
    for i, p in enumerate(s["pieces"][:-1]):
        gap = p["gapToNextMs"]
        tail = files[i]["tailMs"]
        head = files[i + 1]["headMs"]
        # in path B the player already removed the edges (fiezel-web-audio-player.js:463-476)
        eff_tail = 12 if trimmed else tail
        eff_head = 12 if trimmed else head
        rows.append({
            "boundary": f"{i}->{i+1}",
            "schedulingGapMs": gap,
            "tailSilenceInFileMs": tail,
            "headSilenceInFileMs": head,
            "silenceCountedMs": round(eff_tail + eff_head, 1),
            "perceivedPauseMs": round(gap + eff_tail + eff_head, 1),
            "isParagraphBoundary": i == 2,
        })
    per = [r["perceivedPauseMs"] for r in rows]
    res[scen] = {
        "trimActive": trimmed,
        "boundaries": rows,
        "perceivedMeanMs": round(sum(per) / len(per), 1),
        "perceivedMinMs": min(per),
        "perceivedMaxMs": max(per),
        "perceivedParagraphMs": rows[2]["perceivedPauseMs"],
        "modelGenMeanMs": round(sum(s["generationMs"]) / len(s["generationMs"]), 1),
        "timeToFirstSoundMs": s["timeToFirstSoundMs"],
    }
json.dump(res, open(os.path.join(OUT, "perceptual.json"), "w"), indent=1)
for k, v in res.items():
    print("==", k, "trim", v["trimActive"])
    for r in v["boundaries"]:
        print("   ", r)
    print("   mean", v["perceivedMeanMs"], "min", v["perceivedMinMs"], "max", v["perceivedMaxMs"], "para", v["perceivedParagraphMs"])
