"""FIEZEL · Film "Satu Kelas, Dua Layar" — skor orisinal "Terhubung".

100 BPM (1 ketuk = 0,6 dtk, 1 bar = 2,4 dtk), 30 bar = 72 dtk. Semua bagian dibaca dari
audio/events.json (hasil `node events.mjs`) supaya musik ikut timeline film.

Peta harmoni
  bar 1–2   (0,0–4,8)   Dm          kait: drone D, piano Salamander yang bertanya, detak jantung
  bar 3     (4,8–7,2)   B♭add9      monolit bangkit: dentum, senar masuk
  bar 4–11  (7,2–26,4)  F · C/E · Dm7 · B♭maj7 · F/A · C · Dm9 · B♭→Csus   denyut "tersambung"
  jeda      26,25–26,40 hening musik (napas sebelum drop)
  bar 12–23 (26,4–55,2) Dm · B♭ · F · C (×2) · Gm · B♭ · Dm · C      DROP dasbor guru
  bar 24    (55,2–57,6) B♭maj7      napas: "waktumu kembali"
  bar 25    (57,6–60,0) F           puncak: brass, koor, bel — "Terhubung"
  bar 26    (60,0–62,05) C7sus4     implosi: semua terisap; putus 62,05
  62,05–62,40 nol digital → 62,40 sonic logo resmi (F add9, ditambahkan di mix.py)
  64,4–71,6 Fmaj9 ekor lembut di bawah VO ajakan; 71,6–72,0 hening
"""
import json, os
import numpy as np
from alib import *

EV = json.load(open(os.path.join(HERE, 'events.json')))
T = EV['T']; DUR = EV['DURATION']
BEAT, BAR = 0.6, 2.4
def bar(k, beat=0): return (k - 1) * BAR + beat * BEAT

M = {k: Track(DUR) for k in ('pad', 'keys', 'pluck', 'str', 'bass', 'drum', 'fx', 'lead')}

# --------------------------------------------------------------------------------------------
# I · KAIT (Dm) — drone, detak, piano yang bertanya
drone = supersaw(n2m('D2'), 4.9, voices=5, detune=0.08, bright=520, a=0.12, r=0.5) + supersaw(n2m('A2'), 4.9, voices=5, detune=0.08, bright=520, a=0.12, r=0.5, seed=5)
M['pad'].add(0.0, drone, db(-10))
for t0 in (0.0, 1.2, 2.4, 3.6):
    for dt, g in ((0, 1.0), (0.21, 0.6)):
        n = int(0.4 * SR); tt = np.arange(n) / SR
        th = np.sin(2 * np.pi * (48 + 20 * np.exp(-tt / 0.03)) * tt) * np.exp(-tt / 0.09)
        M['drum'].add(t0 + dt, th, db(-9) * g)
hook = [('A4', 0.30), ('F4', 0.90), ('E4', 1.50), ('D4', 2.10), ('A4', 2.70), ('G4', 3.30), ('F4', 3.90), ('E4', 4.50)]
for nm, t0 in hook: M['keys'].add(t0, piano(n2m(nm), 0.34, 1.6), db(-6))
M['keys'].add(0.30, piano(n2m('D3'), 0.3, 3.0), db(-10)); M['keys'].add(2.70, piano(n2m('Bb2'), 0.3, 2.2), db(-11))
M['fx'].add(T['whip'][0] - 0.45, riser(0.45, 300, 3000, 21), db(-18))

# --------------------------------------------------------------------------------------------
# II · MONOLIT (B♭add9) + TERSAMBUNG (bar 4–11)
chords = {
    3: ('Bb1', ['Bb2', 'D3', 'F3', 'C4']),
    4: ('F1', ['F3', 'A3', 'C4', 'E4', 'G4']),
    5: ('E2', ['E3', 'G3', 'C4', 'D4']),
    6: ('D2', ['D3', 'F3', 'A3', 'C4']),
    7: ('Bb1', ['Bb2', 'D3', 'F3', 'A3']),
    8: ('A1', ['A2', 'C3', 'F3', 'A3']),
    9: ('C2', ['C3', 'F3', 'G3', 'E4']),
    10: ('D2', ['D3', 'F3', 'A3', 'E4']),
    11: ('Bb1', ['Bb2', 'D3', 'F3', 'C4']),
}
for k, (root, tones) in chords.items():
    t0 = bar(k); d = BAR
    for i, nm in enumerate(tones):
        M['pad'].add(t0, supersaw(n2m(nm), d, voices=7, detune=0.12, bright=1500 + 120 * k, a=0.45 if k == 3 else 0.25, r=0.8, seed=k * 10 + i), db(-21))
    M['bass'].add(t0, sub(n2m(root) + 12, d - 0.05), db(-9))
# dentum monolit
M['drum'].add(T['whip'][0], taiko(1.0, 44), db(-3)); M['drum'].add(T['whip'][0], kick(1.0, 40, 1.4), db(-6))
M['str'].add(bar(3), strings(n2m('F4'), BAR * 2, a=0.9), db(-17)); M['str'].add(bar(3), strings(n2m('D5'), BAR * 2, a=1.1, seed=4), db(-20))
M['keys'].add(5.0, piano(n2m('Bb4'), 0.45, 2.0), db(-9)); M['keys'].add(5.0, piano(n2m('D5'), 0.4, 2.0), db(-11))
# motif "Terhubung" (C5 D5 F5 A5 — G5 F5) di piano
def motif(t0, oct=0, vel=0.5, g=-8):
    for nm, dt in (('C5', 0), ('D5', 0.3), ('F5', 0.6), ('A5', 0.9), ('G5', 1.5), ('F5', 1.8)):
        M['keys'].add(t0 + dt, piano(n2m(nm) + 12 * oct, vel, 1.2), db(g))
motif(bar(4)); motif(bar(8), vel=0.55)
# pluck arpeggio 16-an (bar 5–11), gema ping-pong 3/4 ketuk
arp = {5: ['C4', 'E4', 'G4', 'C5', 'D5', 'G4', 'E4', 'G4'], 6: ['D4', 'F4', 'A4', 'C5', 'D5', 'A4', 'F4', 'A4'], 7: ['Bb3', 'D4', 'F4', 'A4', 'D5', 'A4', 'F4', 'D4'],
       8: ['A3', 'C4', 'F4', 'A4', 'C5', 'A4', 'F4', 'C4'], 9: ['C4', 'F4', 'G4', 'C5', 'E5', 'C5', 'G4', 'F4'], 10: ['D4', 'F4', 'A4', 'E5', 'D5', 'A4', 'F4', 'A4'], 11: ['Bb3', 'D4', 'F4', 'C5', 'D5', 'C5', 'F4', 'D4']}
for k, pat in arp.items():
    for s16 in range(16):
        t0 = bar(k) + s16 * 0.15; nm = pat[s16 % 8]
        M['pluck'].add(t0, pluck(n2m(nm), 0.7, 0.45 + 0.3 * ((s16 % 4) == 0), seed=k * 16 + s16), db(-16 + (2 if s16 % 4 == 0 else 0)), pan=(-0.3 if s16 % 2 else 0.3))
# drum setengah-tempo (bar 5–11)
KICK = kick(0.9, 50); CLAP = clap(1.0); HAT = hat(False, 1.0); OHAT = hat(True, 1.0); SHK = shaker(1.0)
for k in range(5, 12):
    for b in (0, 2): M['drum'].add(bar(k, b), KICK, db(-8))
    if k >= 7: M['drum'].add(bar(k, 2), CLAP, db(-15))
    if k >= 6:
        for e8 in range(8): M['drum'].add(bar(k) + e8 * 0.3 + (0.3 * 0.04 if e8 % 2 else 0), HAT, db(-24 + (3 if e8 % 2 else 0)), pan=0.25)
    if k >= 8:
        for s16 in range(16): M['drum'].add(bar(k) + s16 * 0.15, SHK, db(-27 + (3 if s16 % 4 == 2 else 0)), pan=-0.3)
    if k >= 7:
        root = chords[k][0]
        for e8 in range(8): M['bass'].add(bar(k) + e8 * 0.3, sub(n2m(root) + (24 if e8 % 2 else 12), 0.22), db(-12))
for k in (7, 8, 9, 10, 11):
    M['str'].add(bar(k), strings(n2m(chords[k][1][2]) + 12, BAR - 0.1, a=0.5, seed=k), db(-19))
# build ke drop
M['fx'].add(bar(11) - 1.2, riser(T['gap1'][0] - bar(11) + 1.2, 180, 4200, 23), db(-14))
for i in range(12):   # gulungan tepuk yang merapat
    tt = bar(11, 2) + 1.05 * (1 - (1 - i / 12) ** 1.6)
    M['drum'].add(tt, CLAP, db(-22 + i * 0.8))

# --------------------------------------------------------------------------------------------
# III · DROP — dasbor guru (bar 12–23)
prog = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'Dm', 'C']
CH = {'Dm': ('D2', ['D3', 'F3', 'A3', 'D4']), 'Bb': ('Bb1', ['Bb2', 'D3', 'F3', 'Bb3']), 'F': ('F2', ['F3', 'A3', 'C4', 'F4']), 'C': ('C2', ['C3', 'E3', 'G3', 'C4']), 'Gm': ('G1', ['G2', 'Bb2', 'D3', 'G3'])}
drop = T['drop']
M['drum'].add(drop, taiko(1.0, 50), db(-2)); M['drum'].add(drop, kick(1.0, 45, 1.3), db(-4))
crash = hp(noise(int(2.4 * SR), 31), 3500) * expdecay(int(2.4 * SR), 0.55); M['fx'].add(drop, crash, db(-17))
for j, name in enumerate(prog):
    k = 12 + j; t0 = bar(k); root, tones = CH[name]
    for i, nm in enumerate(tones):
        M['pad'].add(t0, supersaw(n2m(nm), BAR, voices=7, detune=0.13, bright=2200, a=0.08, r=0.6, seed=100 + j * 7 + i), db(-23))
    # bas oktaf 8-an
    for e8 in range(8): M['bass'].add(t0 + e8 * 0.3, sub(n2m(root) + (12 if e8 % 2 else 0) + 12, 0.24), db(-10))
    # senar ostinato 8-an pada nada akor
    for e8 in range(8):
        nm = tones[[1, 2, 3, 2, 1, 2, 3, 2][e8]]
        M['str'].add(t0 + e8 * 0.3, strings(n2m(nm) + 12, 0.26, a=0.02, r=0.12, bright=4200, seed=j * 8 + e8), db(-22))
    # drum 4-on-floor + tepuk 2&4 + hat 16-an + taiko bar
    for b in range(4): M['drum'].add(bar(k, b), KICK, db(-6))
    for b in (1, 3): M['drum'].add(bar(k, b), CLAP, db(-13))
    for s16 in range(16): M['drum'].add(t0 + s16 * 0.15, HAT, db(-25 + (4 if s16 % 4 == 2 else 0)), pan=0.3)
    M['drum'].add(bar(k, 3.5), OHAT, db(-24), pan=-0.2)
    M['drum'].add(t0, taiko(0.8, 58), db(-11))
    # piano akor di ketukan 1 (hangat, jarang)
    for nm in tones[1:]: M['keys'].add(t0, piano(n2m(nm) + 12, 0.32, 1.8), db(-15))
# brass mengembang tiap 4 bar (megah)
for k, name in ((12, 'Dm'), (16, 'Dm'), (20, 'Gm')):
    for nm in CH[name][1]: M['lead'].add(bar(k), brass(n2m(nm) + 12, BAR * 1.5, a=0.25), db(-20))
# bel motif tiap 2 bar
for k in range(12, 24, 2):
    for nm, dt in (('C6', 0), ('D6', 0.3), ('F6', 0.6), ('A6', 0.9)) if k % 4 == 0 else (('A6', 0), ('G6', 0.3), ('F6', 0.6), ('D6', 1.2)):
        M['lead'].add(bar(k) + dt, bell(n2m(nm) - 12, 2.2, 2.4), db(-21))
# isian menuju napas
for i, nm in enumerate(('A3', 'G3', 'F3', 'D3')): M['drum'].add(bar(23, 2) + i * 0.3, taiko(0.7, mtof(n2m(nm)) * 0.5), db(-12))

# --------------------------------------------------------------------------------------------
# IV · NAPAS (bar 24) → PUNCAK (bar 25) → IMPLOSI (bar 26)
for nm in ('Bb2', 'D3', 'F3', 'A3', 'C4'): M['pad'].add(bar(24), supersaw(n2m(nm), BAR, voices=7, detune=0.1, bright=1300, a=0.3, r=0.6), db(-20))
M['bass'].add(bar(24), sub(n2m('Bb1') + 12, BAR - 0.1), db(-10))
for nm, dt in (('F5', 0.3), ('E5', 0.9), ('D5', 1.5), ('C5', 2.1)): M['keys'].add(bar(24) + dt, piano(n2m(nm), 0.4, 1.4), db(-9))
M['str'].add(bar(24), strings(n2m('D5'), BAR, a=0.6), db(-18)); M['str'].add(bar(24), strings(n2m('F5'), BAR, a=0.8, seed=9), db(-20))
M['fx'].add(bar(24, 2), riser(1.2, 300, 3600, 41), db(-17))
clx = T['climax']
M['drum'].add(clx, taiko(1.0, 48), db(-1)); M['drum'].add(clx, kick(1.0, 44, 1.4), db(-3)); M['fx'].add(clx, crash, db(-15))
for nm in ('F3', 'A3', 'C4', 'F4'): M['lead'].add(clx, brass(n2m(nm), BAR - 0.2, a=0.12), db(-15))
for nm in ('F4', 'A4', 'C5'): M['pad'].add(clx, choir(n2m(nm), BAR - 0.1, a=0.35), db(-20))
for nm in ('A5', 'C6'): M['str'].add(clx, strings(n2m(nm), BAR, a=0.3), db(-19))
for nm, dt in (('C6', 0.0), ('D6', 0.3), ('F6', 0.6), ('A6', 0.9), ('G6', 1.5), ('F6', 1.8)): M['lead'].add(clx + dt, bell(n2m(nm) - 12, 2.4, 2.2), db(-17))
M['bass'].add(clx, sub(n2m('F1') + 12, BAR - 0.1), db(-7))
for b in range(4): M['drum'].add(bar(25, b), KICK, db(-6))
for b in (1, 3): M['drum'].add(bar(25, b), CLAP, db(-13))
for i in range(6): M['drum'].add(bar(25, 3) + i * 0.1, taiko(0.6, 70 - i * 3), db(-15 + i))
# implosi: C7sus4 + isapan (swell terbalik) — putus keras di 62,05
imp0 = bar(26); cutT = T['black']
for nm in ('C3', 'F3', 'G3', 'Bb3', 'F4'): M['pad'].add(imp0, supersaw(n2m(nm), cutT - imp0, voices=7, detune=0.15, bright=900, a=0.2, r=0.001), db(-19))
M['fx'].add(T['implode'][0], riser(cutT - T['implode'][0], 150, 7000, 51), db(-10))
rv = reverb(np.concatenate([brass(n2m('C4'), 0.3), np.zeros(int(2.5 * SR))]), sec=2.6, mix=1.0)[::-1]
rv = rv[-int((cutT - T['implode'][0]) * SR):]; M['fx'].add(T['implode'][0], rv * np.linspace(0.2, 1, len(rv))[:, None] ** 2, db(-8))
M['bass'].add(imp0, sub(n2m('C1') + 12, cutT - imp0 - 0.02, r=0.001) * np.linspace(0.4, 1.0, int((cutT - imp0 - 0.02 + 0.001) * SR)), db(-9))

# --------------------------------------------------------------------------------------------
# V · EKOR (Fmaj9) di bawah VO ajakan
tail0 = 64.4; tailEnd = 71.6
for nm in ('F3', 'A3', 'C4', 'E4', 'G4'): M['pad'].add(tail0, supersaw(n2m(nm), tailEnd - tail0 - 1.2, voices=7, detune=0.1, bright=1100, a=1.2, r=1.2), db(-24))
for nm, dt, v in (('A5', 0.5, 0.36), ('C6', 1.2, 0.33), ('G5', 1.9, 0.3), ('F5', 3.4, 0.3)): M['keys'].add(tail0 + dt, piano(n2m(nm), v, 2.2), db(-12))
M['str'].add(tail0 + 0.3, strings(n2m('F4'), 5.2, a=1.0, r=1.4), db(-22))

# --------------------------------------------------------------------------------------------
# Bus: ruang & EQ, lalu jumlahkan
def bus(name, verb=None, g=0.0, eq=None):
    x = M[name].x
    if verb: x = reverb(x, *verb)
    if eq: x = eq(x)
    return x * db(g)
mus = (bus('pad', (2.8, 0.35, 5000), -1.5, lambda x: hp(x, 150)) + bus('keys', (2.6, 0.32, 6500), 1.0) + bus('pluck', None, -1.0, lambda x: reverb(pingpong(x, 0.45, 0.33), 1.8, 0.22)) +
       bus('str', (2.4, 0.3, 6000)) + bus('bass', None, 0.0, lambda x: lp(x, 900)) + bus('drum', (1.2, 0.12, 4000)) + bus('fx', (2.0, 0.2)) + bus('lead', (3.0, 0.35, 7000), 0.0))
mus = hp(mus, 28)
# busur dinamika per bagian (dB), transisi halus 0,35 dtk kecuali drop (jatuh tepat di jeda hening)
SEC = [(0.0, -2.0), (T['whip'][0], -1.0), (bar(4), -3.4), (bar(9), -2.6), (T['drop'], 0.6), (bar(24), -2.2), (T['climax'], -0.4), (bar(26), -0.8), (64.0, 0.0)]
gcurve = np.zeros(len(mus))
for (t0, g0), (t1, _) in zip(SEC, SEC[1:] + [(DUR + 1, 0)]):
    gcurve[int(t0 * SR):int(t1 * SR)] = g0
k = int(0.35 * SR); gcurve = np.convolve(np.pad(gcurve, (k, k), mode='edge'), np.ones(k) / k, 'same')[k:-k]
di = int(T['drop'] * SR); gcurve[di - int(0.2 * SR):di + 10] = gcurve[di + 10]
mus *= db(gcurve)[:, None]
# ruang untuk suara: potong lembut 1–3 kHz di bus musik (VO duduk di sana)
mus = peak_eq(mus, 2000, -2.5, 0.7)
# nol digital: jeda sebelum drop (musik saja), jeda sebelum logo, dan akhir
def zero(a, b, fade=0.004):
    i, j = int(a * SR), int(b * SR); f = int(fade * SR)
    mus[i - f:i] *= np.linspace(1, 0, f)[:, None]; mus[i:j] = 0
zero(T['gap1'][0], T['gap1'][1], 0.02)
zero(T['black'], DUR + 1, 0.003)
# ekor (setelah logo) ditambahkan kembali dari track yang sama, mulai 64,4
tail = (bus('pad', (2.8, 0.35, 5000), -1.5, lambda x: hp(x, 150)) + bus('keys', (2.6, 0.32, 6500), 1.0) + bus('str', (2.4, 0.3, 6000)))
i0, i1 = int(tail0 * SR), int(tailEnd * SR)
mus[i0:i1] += tail[i0:i1] * np.clip(np.linspace(0, 12, i1 - i0), 0, 1)[:, None]
fo = int(1.0 * SR); mus[i1 - fo:i1] *= np.linspace(1, 0, fo)[:, None] ** 2; mus[i1:] = 0
write(os.path.join(HERE, 'stems', 'music.wav'), mus)
print('music.wav  peak %.1f dBFS  %.1f LUFS' % (20 * np.log10(np.abs(mus).max()), lufs(mus)))
