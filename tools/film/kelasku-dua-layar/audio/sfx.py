"""FIEZEL · Film "Satu Kelas, Dua Layar" — SFX, semuanya disintesis & dikunci ke gambar.

Waktu dibaca dari audio/events.json (T + penerbangan kapsul), jadi setiap ketukan tombol,
ketikan, kapsul yang tiba, dan stempel jatuh tepat di frame-nya. Nada SFX memakai
pentatonik F (F G A C D) supaya bunyi antarmuka ikut bermain di dalam musik.
Tanpa whoosh stok; "udara" dibuat dari derau tersaring yang disapu.
"""
import json, os
import numpy as np
from alib import *

EV = json.load(open(os.path.join(HERE, 'events.json')))
T = EV['T']; DUR = EV['DURATION']; FL = EV['FLIGHTS']
S = Track(DUR)
PENTA = [n2m(x) for x in ('F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6')]

# ---- rupa bunyi ------------------------------------------------------------------------------
def tap(bright=1.0, seed=0):
    n = int(0.09 * SR); t = np.arange(n) / SR
    y = 0.55 * np.sin(2 * np.pi * 1150 * t) * np.exp(-t / 0.006) + 0.5 * hp(noise(n, seed), 2800) * np.exp(-t / 0.003) * bright
    y += 0.6 * np.sin(2 * np.pi * (140 + 60 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.022)
    return fade(y, 0.0005, 0.02)
def key(seed=0):
    n = int(0.05 * SR); t = np.arange(n) / SR; r = np.random.default_rng(seed)
    y = bp(noise(n, seed), 1800 + 1500 * r.random(), 6500) * np.exp(-t / (0.006 + 0.004 * r.random()))
    y += 0.25 * np.sin(2 * np.pi * (320 + 80 * r.random()) * t) * np.exp(-t / 0.008)
    return y * (0.8 + 0.4 * r.random())
def tick(m, dec=0.03):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t / dec) + 0.2 * hp(noise(n, m), 4000) * np.exp(-t / 0.002))
def pip(m, dur=0.45, amp=1.0): return bell(m, dur, 1.6, 2.0, amp)
def chime(ms, gap=0.07, amp=1.0):
    y = np.zeros(int((len(ms) * gap + 1.2) * SR))
    for i, m in enumerate(ms):
        b = bell(m, 1.1, 2.0, 3.0); a = int(i * gap * SR); y[a:a + len(b)] += b * (0.8 + 0.1 * i)
    return y * amp
def boom(amp=1.0):
    n = int(2.0 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * np.cumsum(30 + 45 * np.exp(-t / 0.18)) / SR) * np.exp(-t / 0.7)
    y += 0.35 * lp(noise(n, 77), 300) * np.exp(-t / 0.12)
    return np.tanh(1.4 * y) * amp
def thud(amp=1.0, tone=70):
    n = int(0.5 * SR); t = np.arange(n) / SR
    return np.tanh(1.5 * (np.sin(2 * np.pi * np.cumsum(tone + 50 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.09) + 0.3 * lp(noise(n, tone), 700) * np.exp(-t / 0.02))) * amp
def slide(dur=0.45, seed=0, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; e = np.sin(np.pi * t / dur) ** 1.4
    return bp(noise(n, seed), 250, 2200) * e * amp * 0.6
def paper(dur=0.3, seed=0, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; r = np.random.default_rng(seed)
    crk = (r.random(n) < 0.02) * r.standard_normal(n) * 3
    return bp(noise(n, seed) * 0.4 + crk, 1500, 8000) * np.sin(np.pi * t / dur) * amp * 0.5
def scratch(dur=0.3, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp_sweep(noise(n, 91), 1800 + 3000 * t / dur, 128) * np.sin(np.pi * t / dur) * amp * 0.7
def stamp(amp=1.0):
    a = thud(amp, 95); b = paper(0.12, 5, amp * 0.8); a[:len(b)] += b; return a
def shimmer(dur, amp=1.0, base='C6'):
    n = int(dur * SR); t = np.arange(n) / SR; y = np.zeros(n)
    for k, m in enumerate((n2m(base), n2m(base) + 4, n2m(base) + 7, n2m(base) + 12)):
        y += np.sin(2 * np.pi * mtof(m) * t + k) * (0.5 + 0.5 * np.sin(2 * np.pi * (3.1 + k * 0.7) * t))
    return y * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2 * amp * 0.25
def counter(t0, t1, n, m0=PENTA[0], up=True, g=-27):
    for i in range(n):
        u = i / max(1, n - 1); tt = t0 + (t1 - t0) * (u ** 0.8)
        S.add(tt, tick(PENTA[i % 5] if up else m0, 0.02), db(g))
def typing(t0, t1, n, seed=0, g=-26):
    r = np.random.default_rng(seed)
    for i in range(n):
        tt = t0 + (t1 - t0) * (i + 0.5 * r.random()) / n
        S.add(tt, key(seed * 97 + i), db(g), pan=0.1 * (r.random() - 0.5))

# ---- I · kait ----------------------------------------------------------------------------------
for t0, m in ((T['dimRaka'], 'A6'), (T['dimYoga'], 'F6'), (T['dimFajar'], 'D6')):
    S.add(t0, bell(n2m(m), 1.8, 1.2, 2.0, 0.6), db(-26), pan=-0.2)
    S.add(t0 + 0.05, whoosh(1.0, 2400, 400, seed=int(t0 * 10)), db(-34))
S.add(T['whip'][0], boom(1.0), db(-8))
S.add(T['monoRise'][0], slide(1.05, 3, 1.0), db(-20)); S.add(T['monoRise'][0], lp(noise(int(1.05 * SR), 4), 180) * np.sin(np.linspace(0, np.pi, int(1.05 * SR))), db(-24))
S.add(T['monoRise'][1] - 0.08, thud(1.0, 55), db(-12))
S.add(T['monoRise'][0] + 0.2, shimmer(1.6, 1.0, 'Bb5'), db(-24))

# ---- II · tersambung ---------------------------------------------------------------------------
typing(*T['kodeType'], 8, 1); counter(T['codeReveal'][0], T['codeReveal'][1], 9, g=-28)
S.add(T['copy'], tap(), db(-17))
S.add(T['codeLift'], whoosh(0.45, 700, 4200, 5), db(-24))
for f in FL:
    if f.get('code'): S.add(f['t0'] + f['dur'], pip(PENTA[(f['i'] * 3) % 8], 0.35), db(-33), pan=(f['i'] % 4 - 1.5) * 0.25)
typing(*T['typeJoin'], 9, 2)
S.add(T['join'], tap(1.1, 3), db(-15)); S.add(T['joinSent'], chime([n2m('C6'), n2m('F6')]), db(-21))
S.add(T['joinReq'], whoosh(0.95, 3200, 900, 6), db(-26))
for i, a in enumerate(T['add']): S.add(a, tap(1.0, 10 + i), db(-16)); S.add(a + 0.12, pip(n2m('A5') + 2 * i, 0.5), db(-23))
for row in range(8):
    S.add(T['wave'][0] + row * 0.1 + 0.3, pip(PENTA[row], 0.8), db(-22 + row * 0.3), pan=-0.4 + row * 0.1)
S.add(T['wave'][0], shimmer(1.2, 1.0, 'F5'), db(-22))

# ---- III · kirim & pulang ----------------------------------------------------------------------
S.add(T['mode'], tap(0.7, 20), db(-19))
S.add(T['send'], tap(1.1, 21), db(-14)); S.add(T['send'] + 0.05, whoosh(0.45, 900, 5200, 7), db(-20))
S.add(T['fold'][0], paper(0.3, 8), db(-22))
for f in FL:
    if f['dir'] == 1 and T['fly'] <= f['t0'] < T['fly'] + 2:
        S.add(f['t0'] + f['dur'], pip(PENTA[(f['i'] * 5) % 8], 0.4), db(-30), pan=(f['i'] % 4 - 1.5) * 0.3)
for k in range(5): S.add(T['fly'] + 0.8 + k * 0.18, tick(n2m('A6'), 0.05), db(-30), pan=0.4 - k * 0.2)   # lonceng notifikasi
S.add(T['start'], tap(1.0, 22), db(-16)); S.add(T['flip'][0], whoosh(0.35, 1500, 4000, 9), db(-22)); S.add(T['flip'][0] + 0.2, tick(n2m('C6'), 0.02), db(-26))
S.add(T['pick'], tap(1.0, 23), db(-16)); S.add(T['why'], chime([n2m('C6'), n2m('E6'), n2m('G6')], 0.06), db(-19))
counter(21.62, 21.95, 9, g=-28); S.add(T['sent'], whoosh(0.4, 1200, 5000, 10), db(-22)); S.add(T['sent'] + 0.08, pip(n2m('F6'), 0.5), db(-24))
res = sorted(f['t0'] + f['dur'] for f in FL if f.get('result'))
for i, tt in enumerate(res): S.add(tt, tick(PENTA[i % 5] - 12, 0.03), db(-27), pan=0.1)
S.add(T['hasilIn'], slide(0.4, 11), db(-22))
S.add(T['away'][0], whoosh(0.5, 2500, 700, 12), db(-22)); S.add(T['away'][1] - 0.2, whoosh(0.4, 700, 2500, 13), db(-24))
S.add(T['focus'], chime([n2m('E6'), n2m('C6')], 0.12, 0.9), db(-20))

# ---- IV · dasbor ---------------------------------------------------------------------------------
S.add(T['drop'], boom(1.0), db(-10))
for k in range(16):
    S.add(T['wallRise'][0] + 0.05 * (k % 8) + 0.1 * (k // 8), thud(0.6, 60 + 7 * k), db(-26), pan=((k % 8) - 3.5) / 5)
S.add(T['wallRise'][0] + 0.2, shimmer(1.2, 1.0, 'F5'), db(-26))
beats = [T['cutRing'], T['sapa'], T['kartu'], T['heat'], T['mis'], T['grp'], T['rem'], T['ortu'], T['absen'], T['kur'], T['bc'], T['umum']]
for i, tt in enumerate(beats): S.add(tt + 0.02, whoosh(0.55, 500, 3000, 30 + i), db(-27))   # panel lepas dari dinding
counter(T['kpi'][0], T['kpi'][1], 10)
for i in range(3): S.add(T['rise'][0] + 0.12 * i, pip(n2m('E6') - 3 * i, 0.5), db(-22))
typing(T['type'][0], T['type'][1], 26, 3, -29)
S.add(T['kirim'], tap(1.1, 40), db(-15)); S.add(T['kirim'] + 0.06, whoosh(0.4, 1000, 5000, 41), db(-22))
S.add(T['disapa'], chime([n2m('F5'), n2m('A5'), n2m('C6')], 0.08), db(-19))
for i in range(24): S.add(T['heatFill'][0] + i * 0.05, tick(PENTA[i % 8] - 12, 0.015), db(-31), pan=(i % 6 - 2.5) / 4)
S.add(T['heatHl'], shimmer(0.6, 1.0, 'D6'), db(-24))
S.add(T['strike'][0], scratch(0.32), db(-22)); S.add(T['fix'][0], chime([n2m('C6'), n2m('G6')], 0.08), db(-20))
S.add(T['regroup'][0], slide(1.0, 50), db(-21))
for g in range(8): S.add(T['mentor'][0] + g * 0.05, pip(PENTA[g], 0.6), db(-25), pan=(g % 2 - 0.5) * 0.6)
S.add(T['lanes'][0], slide(0.8, 51), db(-22)); S.add(T['remPress'], tap(1.0, 52), db(-16))
for i in range(3): S.add(T['par'][0] + 0.2 * i, chime([n2m('A5') + 2 * i, n2m('D6') + 2 * i], 0.05, 0.8), db(-22))
S.add(T['home'][0], slide(0.9, 53), db(-24))
typing(T['ortuType'][0], T['ortuType'][1], 24, 4, -29)
S.add(T['ortuSend'], tap(1.1, 54), db(-15)); S.add(T['ortuFly'][0], paper(0.35, 55), db(-19)); S.add(T['ortuFly'][0], whoosh(0.45, 800, 3800, 56), db(-23))
S.add(T['allHadir'], tap(1.1, 57), db(-15))
for i in range(7): S.add(T['allHadir'] + 0.05 + i * 0.07, tick(PENTA[i] - 12, 0.025), db(-26))
S.add(T['rekapIn'], paper(0.35, 58), db(-22)); S.add(T['export'], tap(1.0, 59), db(-16)); S.add(T['export'] + 0.1, whoosh(0.3, 1200, 3000, 60), db(-26))
S.add(T['make'], tap(1.1, 61), db(-15))
for i in range(10): S.add(T['fan'][0] + i * 0.06, paper(0.14, 62 + i, 0.8), db(-25), pan=(i - 4.5) / 6)
for i in range(4): S.add(T['steps'][0] + 0.27 * i, tick(n2m('C6') + [0, 2, 4, 7][i], 0.05), db(-24))
S.add(T['approve'], stamp(0.9), db(-17)); S.add(T['approve'] + 0.05, chime([n2m('F5'), n2m('C6')], 0.07), db(-21))
typing(T['umumType'][0], T['umumType'][1], 12, 5, -29)
S.add(T['umumSend'], tap(1.1, 63), db(-15)); S.add(T['umumSend'] + 0.05, whoosh(0.6, 700, 4500, 64), db(-20))
for f in FL:
    if f['dir'] == 1 and f['t0'] >= T['umumSend']: S.add(f['t0'] + f['dur'], pip(PENTA[(f['i'] * 7) % 8], 0.3), db(-33), pan=(f['i'] % 4 - 1.5) * 0.3)
S.add(T['ann'], chime([n2m('C6'), n2m('F6')], 0.08), db(-22)); S.add(T['stamp'], stamp(1.0), db(-15))
counter(T['saved'][0], T['saved'][1], 22, g=-29)
typing(T['jurnalType'][0], T['jurnalType'][1], 16, 6, -30)

# ---- V · puncak & implosi -----------------------------------------------------------------------
S.add(T['climax'], boom(1.0), db(-11)); S.add(T['climax'] + 0.1, shimmer(2.3, 1.0, 'F5'), db(-22))
S.add(T['implode'][0], whoosh(T['black'] - T['implode'][0], 300, 9000, 70), db(-14))
S.add(T['orb'][1] - 0.02, bell(n2m('C7'), 0.4, 0.6, 2.0), db(-22))
# setelah logo
S.add(T['lock'][0], whoosh(0.8, 3000, 900, 71, 0.6), db(-32))
S.add(T['kk'][0], chime([n2m('F5'), n2m('A5'), n2m('C6')], 0.09, 0.8), db(-28))
S.add(T['cta'][0] + 0.1, tap(0.6, 72), db(-24)); S.add(T['ctaPress'], tap(1.0, 73), db(-20))

x = S.x
i0, i1 = int(T['black'] * SR), int(T['splash'] * SR); x[i0:i1] = 0          # nol digital sebelum logo
x[int(71.6 * SR):] = 0
write(os.path.join(HERE, 'stems', 'sfx.wav'), x)
print('sfx.wav  peak %.1f dBFS  %.1f LUFS' % (20 * np.log10(np.abs(x).max() + 1e-9), lufs(x)))
