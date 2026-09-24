"""FIEZEL · Film "Satu Kelas, Dua Layar" — mix latar (musik + SFX + sonic logo resmi).

Keluaran (audio/stems/):
  music.flac, sfx.flac   stem dengan gain yang sama seperti di latar
  bed.flac               latar lengkap, −16 LUFS, true peak ≤ −2,5 dBTP → masukan skrip VO
  ../mix-tanpa-vo.flac    master tanpa VO, −14 LUFS, true peak ≤ −1,5 dBTP (versi musik saja)
Nol digital dijaga di 62,05–62,40 (napas sebelum logo) dan 71,6–72,0.
Sonic logo resmi (brand/splash_intro.ogg) hanya diberi gain — tidak di-EQ, tidak dikompres.
"""
import json, os
import numpy as np, soundfile as sf
from scipy import signal
from alib import *

EV = json.load(open(os.path.join(HERE, 'events.json'))); T = EV['T']; DUR = EV['DURATION']
N = int(DUR * SR)
def load(p):
    x, sr = sf.read(p, always_2d=True)
    if sr != SR: x = signal.resample_poly(x, SR, sr, axis=0)
    if x.shape[1] == 1: x = np.repeat(x, 2, 1)
    y = np.zeros((N, 2)); y[:min(N, len(x))] = x[:N]; return y
music = load(os.path.join(HERE, 'stems', 'music.wav'))
sfx = load(os.path.join(HERE, 'stems', 'sfx.wav'))
logo_raw, lsr = sf.read(os.path.join(ROOT, 'brand', 'splash_intro.ogg'), always_2d=True)
logo_raw = signal.resample_poly(logo_raw, SR, lsr, axis=0); logo_raw = np.repeat(logo_raw, 2, 1) if logo_raw.shape[1] == 1 else logo_raw
logo = np.zeros((N, 2)); i = int(T['splash'] * SR); logo[i:i + len(logo_raw)] = logo_raw[:N - i]

G_SFX = db(-1.5)
bed = music + sfx * G_SFX
# logo ≈ 2 LU di bawah puncak musik (dinilai pada jendelanya sendiri)
L_clx = lufs(bed[int(57.6 * SR):int(60.0 * SR)]); L_logo = lufs(logo_raw)
g_logo = db((L_clx - 2.0) - L_logo); bed += logo * g_logo
def zeros(x):
    x[int(T['black'] * SR):int(T['splash'] * SR)] = 0; x[int(71.6 * SR):] = 0; return x
bed = zeros(bed)
# normalisasi latar ke −16 LUFS lalu limiter
g = db(-16 - lufs(bed)); bed *= g
bed = zeros(limiter(bed, -2.5))
music_out = zeros(music * g); sfx_out = zeros(sfx * G_SFX * g)
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'stems', 'bed.flac'), bed.astype(np.float32), SR, subtype='PCM_24')
sf.write(os.path.join(HERE, 'stems', 'music.flac'), music_out.astype(np.float32), SR, subtype='PCM_24')
sf.write(os.path.join(HERE, 'stems', 'sfx.flac'), sfx_out.astype(np.float32), SR, subtype='PCM_24')
# master tanpa VO
m = bed * db(-14 - lufs(bed)); m = zeros(limiter(m, -1.5))
sf.write(os.path.join(HERE, 'mix-tanpa-vo.flac'), m.astype(np.float32), SR, subtype='PCM_24', format='FLAC')
z = np.abs(bed[int(T['black'] * SR) + 10:int(T['splash'] * SR) - 10]).max()
print('bed  %.2f LUFS  TP %.2f dBTP | tanpa-VO %.2f LUFS TP %.2f dBTP | hening 62,05–62,40 maks %.1e | logo gain %.1f dB'
      % (lufs(bed), true_peak_db(bed), lufs(m), true_peak_db(m), z, 20 * np.log10(g_logo)))
