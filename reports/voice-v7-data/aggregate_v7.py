#!/usr/bin/env python3
"""Rata-rata metrik per ATURAN dari semua berkas pengukuran V7 di folder ini.

Setiap ulangan dijalankan di sesi peramban yang sama untuk satu berkas, jadi yang boleh
dibandingkan adalah aturan-aturan DI DALAM satu berkas. Rata-rata lintas berkas dipakai
hanya untuk memperkecil derau beban mesin, dan jumlah ulangannya ikut dilaporkan.
"""
import glob
import json
import os
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
FIELDS = ["firstSoundMs", "meanSchedulingGapMs", "meanAudibleGapMs", "maxAudibleGapMs",
          "totalSpanS", "audioS", "silentShare"]

rows = {}
for path in sorted(glob.glob(os.path.join(HERE, "block-measurements-v7*.json"))):
    doc = json.load(open(path))
    for run in doc["runs"].values():
        rec = dict(run["metrics"])
        rec["blocks"] = len(run["blockSizes"])
        rows.setdefault(run["rule"], []).append(rec)

print(f"{'aturan':16} {'n':>2} {'blok':>4} {'suara1':>8} {'jadwal':>8} {'terdengar':>9} "
      f"{'maxTerdengar':>12} {'span':>7} {'audio':>7} {'sunyi':>7} {'totalSunyiS':>11}")
for rule, runs in rows.items():
    vals = {f: [r[f] for r in runs] for f in FIELDS}
    blocks = runs[0]["blocks"]
    gap = statistics.mean(vals["meanSchedulingGapMs"])
    print(f"{rule:16} {len(runs):>2} {blocks:>4} "
          f"{statistics.mean(vals['firstSoundMs']):>8.1f} {gap:>8.1f} "
          f"{statistics.mean(vals['meanAudibleGapMs']):>9.1f} "
          f"{statistics.mean(vals['maxAudibleGapMs']):>12.1f} "
          f"{statistics.mean(vals['totalSpanS']):>7.2f} {statistics.mean(vals['audioS']):>7.2f} "
          f"{statistics.mean(vals['silentShare']):>7.4f} {gap * (blocks - 1) / 1000:>11.2f}")
