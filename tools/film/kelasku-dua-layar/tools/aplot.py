# python3 tools/aplot.py <wav> <out.png> — spektrogram + loudness jangka pendek (3 dtk) per 0,1 dtk.
import sys, numpy as np, soundfile as sf, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
import pyloudnorm as pyln
x, sr = sf.read(sys.argv[1], always_2d=True); m = x.mean(1)
meter = pyln.Meter(sr, block_size=0.4)
ts = np.arange(0, len(x) / sr, 0.1); st = []
for t in ts:
    a, b = int(max(0, t - 1.5) * sr), int(min(len(x) / sr, t + 1.5) * sr)
    seg = x[a:b]
    try: st.append(meter.integrated_loudness(seg) if len(seg) > 0.5 * sr else -70)
    except Exception: st.append(-70)
fig, ax = plt.subplots(2, 1, figsize=(16, 7), sharex=True, gridspec_kw={'height_ratios': [2, 1]})
ax[0].specgram(m, NFFT=2048, Fs=sr, noverlap=1024, cmap='magma', vmin=-120, vmax=-20); ax[0].set_ylim(20, 12000); ax[0].set_yscale('symlog', linthresh=200)
ax[1].plot(ts, np.maximum(st, -60)); ax[1].set_ylim(-45, -5); ax[1].grid(alpha=.3); ax[1].set_ylabel('LUFS-S')
for t in np.arange(0, len(x) / sr, 2.4): ax[1].axvline(t, color='k', alpha=.12)
plt.tight_layout(); plt.savefig(sys.argv[2], dpi=70); print('ok', sys.argv[2])
