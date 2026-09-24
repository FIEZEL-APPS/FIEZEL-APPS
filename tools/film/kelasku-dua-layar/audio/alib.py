"""FIEZEL · Film "Satu Kelas, Dua Layar" — pustaka DSP kecil (numpy/scipy).

Semua bunyi di film ini disintesis di sini, kecuali:
  · sonic logo resmi FIEZEL  : brand/splash_intro.ogg (dari repo, tidak diolah)
  · sampel piano             : Salamander Grand Piano V3 — Alexander Holm, CC BY 3.0
                               (paket npm @audio-samples/piano-velocity{5,9,12})
Tidak ada loop, whoosh stok, atau musik berlisensi pihak ketiga.
Acak selalu berseed (np.random.default_rng) supaya hasilnya bisa diulang persis.
"""
import os, glob, math
import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12.0)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def n2m(s):
    """'A4' → 69, 'Bb3' → 58"""
    name = s[:-1] if s[-1].isdigit() else s
    octv = int(s[len(name):]); return 12 * (octv + 1) + NOTE[name]
def db(x): return 10 ** (x / 20.0)

class Track:
    """Kanvas stereo panjang tetap; tempel bunyi mono/stereo di waktu t (detik)."""
    def __init__(self, dur):
        self.n = int(dur * SR); self.x = np.zeros((self.n, 2), np.float64)
    def add(self, t, y, gain=1.0, pan=0.0):
        if y is None or len(y) == 0: return
        i = int(round(t * SR));
        if y.ndim == 1:
            l, r = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
            y = np.stack([y * l * 1.4142, y * r * 1.4142], 1)
        a, b = max(0, i), min(self.n, i + len(y))
        if b <= a: return
        self.x[a:b] += y[a - i:b - i] * gain

# ---------------------------------------------------------------------------------------------
# Amplop
def env(n, a=0.005, d=0.1, s=0.7, r=0.2, hold=None):
    """ADSR dalam sampel; hold = panjang bagian sustain (detik) sebelum release."""
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    H = n - A - D - R if hold is None else int(hold * SR)
    H = max(0, H)
    e = np.concatenate([np.linspace(0, 1, max(A, 1), False) ** 1.2, 1 - (1 - s) * (np.linspace(0, 1, max(D, 1), False) ** 0.7), np.full(H, s), s * (1 - np.linspace(0, 1, max(R, 1))) ** 2])
    if len(e) < n: e = np.pad(e, (0, n - len(e)))
    return e[:n]
def expdecay(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def fade(y, fi=0.003, fo=0.01):
    y = y.copy(); a, b = int(fi * SR), int(fo * SR)
    if a: y[:a] *= np.linspace(0, 1, a)[:, None] if y.ndim == 2 else np.linspace(0, 1, a)
    if b: y[-b:] *= np.linspace(1, 0, b)[:, None] if y.ndim == 2 else np.linspace(1, 0, b)
    return y

# ---------------------------------------------------------------------------------------------
# Osilator anti-alias (polyBLEP)
def _blep(ph, dt):
    y = np.zeros_like(ph)
    m = ph < dt; t = ph[m] / dt[m]; y[m] = t + t - t * t - 1
    m2 = ph > 1 - dt; t = (ph[m2] - 1) / dt[m2]; y[m2] = t * t + t + t + 1
    return y
def saw(freq, n, phase=0.0, vib=None):
    f = np.full(n, float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, float)
    if vib is not None: f = f * vib
    dt = f / SR; ph = (phase + np.cumsum(dt)) % 1.0
    return 2 * ph - 1 - _blep(ph, dt)
def square(freq, n, pw=0.5, phase=0.0):
    a = saw(freq, n, phase); b = saw(freq, n, (phase + pw) % 1.0); return (a - b) * 0.5
def sine(freq, n, phase=0.0):
    f = np.full(n, float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, float)
    return np.sin(2 * np.pi * (phase + np.cumsum(f) / SR))
def noise(n, seed=0): return np.random.default_rng(seed).standard_normal(n)

# ---------------------------------------------------------------------------------------------
# Filter
def lp(y, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'); return signal.sosfilt(sos, y, axis=0)
def hp(y, fc, order=2):
    sos = signal.butter(order, max(fc, 10), 'high', fs=SR, output='sos'); return signal.sosfilt(sos, y, axis=0)
def bp(y, lo, hi, order=2):
    sos = signal.butter(order, [max(lo, 10), min(hi, SR * 0.45)], 'band', fs=SR, output='sos'); return signal.sosfilt(sos, y, axis=0)
def lp_sweep(y, fcs, block=256, order=2):
    """Low-pass berubah waktu: fcs = array cutoff per sampel (blok-demi-blok, state dibawa)."""
    out = np.zeros_like(y); zi = None
    for i in range(0, len(y), block):
        fc = float(np.clip(fcs[min(i + block // 2, len(fcs) - 1)], 30, SR * 0.45))
        sos = signal.butter(order, fc, 'low', fs=SR, output='sos')
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        out[i:i + block], zi = signal.sosfilt(sos, y[i:i + block], zi=zi)
    return out
def peak_eq(y, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w), 1 - al / A]
    return signal.lfilter(b, a, y, axis=0)
def shelf_low(y, f0, gain_db):
    A = 10 ** (gain_db / 40); w = 2 * np.pi * f0 / SR; al = np.sin(w) / 2 * np.sqrt(2)
    c = np.cos(w); sA = 2 * np.sqrt(A) * al
    b = [A * ((A + 1) - (A - 1) * c + sA), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sA)]
    a = [(A + 1) + (A - 1) * c + sA, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sA]
    return signal.lfilter(b, a, y, axis=0)

# ---------------------------------------------------------------------------------------------
# Ruang: IR sintetis (derau stereo terdekorelasi, meluruh eksponensial, tersaring gelap)
_IR = {}
def ir(sec=2.4, damp=5500, pre=0.018, seed=11, early=True):
    key = (sec, damp, pre, seed, early)
    if key in _IR: return _IR[key]
    n = int(sec * SR); rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    decay = np.exp(-6.9 * t / sec)
    L = rng.standard_normal(n) * decay; R = rng.standard_normal(n) * decay
    # gelapkan ekor secara progresif
    L = lp(L, damp); R = lp(R, damp)
    L = hp(L, 120); R = hp(R, 120)
    x = np.stack([L, R], 1)
    if early:
        for k, (dt, g) in enumerate([(0.011, 0.5), (0.019, 0.42), (0.027, 0.33), (0.041, 0.28), (0.053, 0.2)]):
            i = int(dt * SR); x[i, k % 2] += g * 12
    x = np.pad(x, ((int(pre * SR), 0), (0, 0)))
    x /= np.sqrt((x ** 2).sum() / 2)
    _IR[key] = x; return x
def reverb(y, sec=2.4, mix=0.25, damp=5500, pre=0.018):
    if y.ndim == 1: y = np.stack([y, y], 1)
    h = ir(sec, damp, pre)
    wet = np.stack([signal.fftconvolve(y[:, 0], h[:, 0])[:len(y)], signal.fftconvolve(y[:, 1], h[:, 1])[:len(y)]], 1)
    return y * (1 - mix) + wet * mix
def pingpong(y, dt, fb=0.35, taps=6, damp=4000):
    if y.ndim == 1: y = np.stack([y, y], 1)
    out = y.copy(); d = int(dt * SR); cur = y.copy()
    for k in range(1, taps + 1):
        cur = lp(cur, damp) * fb
        sh = np.zeros_like(y)
        if d * k < len(y): sh[d * k:] = cur[:len(y) - d * k]
        ch = k % 2; out[:, ch] += sh[:, ch] * 1.3; out[:, 1 - ch] += sh[:, 1 - ch] * 0.3
    return out
def chorus(y, depth=0.004, rate=0.6, mix=0.5, seed=0):
    """Chorus stereo: dua salinan tertunda termodulasi (L/R berlawanan fase)."""
    if y.ndim == 2: y = y.mean(1)
    n = len(y); t = np.arange(n) / SR; base = 0.012
    out = []
    for ph in (0, math.pi):
        dl = (base + depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + ph))) * SR
        idx = np.arange(n) - dl; idx = np.clip(idx, 0, n - 1)
        out.append(y * (1 - mix) + np.interp(idx, np.arange(n), y) * mix)
    return np.stack(out, 1)

# ---------------------------------------------------------------------------------------------
# Piano Salamander (sampel tiap terts kecil; digeser nada ±1,5 semiton lewat resample)
_PIANO = {}
PIANO_DIR = os.environ.get('FZ_PIANO_DIR', os.path.join(ROOT, 'node_modules', '@audio-samples'))
def _piano_bank(v):
    if v in _PIANO: return _PIANO[v]
    d = os.path.join(PIANO_DIR, f'piano-velocity{v}', 'audio'); bank = {}
    for f in glob.glob(os.path.join(d, '*.ogg')):
        nm = os.path.basename(f).split('v')[0]
        x, sr = sf.read(f, always_2d=True)
        if sr != SR: x = signal.resample_poly(x, SR, sr, axis=0)
        bank[n2m(nm)] = x
    _PIANO[v] = bank; return bank
def piano(m, vel=0.6, dur=None):
    """Nada piano midi m. vel 0..1 memilih lapisan velocity (5/9/12)."""
    v = 5 if vel < 0.45 else 9 if vel < 0.78 else 12
    bank = _piano_bank(v)
    if not bank: raise RuntimeError('Sampel piano tidak ditemukan. Jalankan: npm install (lihat README) atau set FZ_PIANO_DIR.')
    k = min(bank.keys(), key=lambda q: abs(q - m)); x = bank[k]
    ratio = 2 ** ((m - k) / 12)
    if abs(ratio - 1) > 1e-6:
        n2 = int(len(x) / ratio); idx = np.arange(n2) * ratio
        x = np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in range(2)], 1)
    if dur is not None:
        n = min(len(x), int((dur + 0.6) * SR)); x = x[:n].copy(); r = int(0.6 * SR)
        x[-r:] *= np.linspace(1, 0, r)[:, None] ** 2
    g = 0.55 + 0.45 * vel
    return x * g

# ---------------------------------------------------------------------------------------------
# Instrumen sintetis
def supersaw(m, dur, voices=7, detune=0.14, seed=0, bright=2600, a=0.6, r=1.2):
    n = int((dur + r) * SR); rng = np.random.default_rng(seed); y = np.zeros(n)
    for k in range(voices):
        cents = (k - (voices - 1) / 2) / ((voices - 1) / 2) * detune * 100
        y += saw(mtof(m) * 2 ** (cents / 1200), n, rng.random())
    y /= voices
    y = lp(y, bright, 2) * env(n, a, 0.4, 0.85, r, hold=max(0, dur - a - 0.4))
    return y
def strings(m, dur, a=0.35, r=0.9, bright=3200, seed=1):
    n = int((dur + r) * SR); t = np.arange(n) / SR
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.6, 0, 1)
    rng = np.random.default_rng(seed); y = np.zeros(n)
    for k, c in enumerate((-6, 0, 7)):
        y += saw(mtof(m) * 2 ** (c / 1200), n, rng.random(), vib)
    y = lp(y / 3, bright, 2); y = hp(y, 90)
    return y * env(n, a, 0.3, 0.9, r, hold=max(0, dur - a - 0.3))
def brass(m, dur, a=0.08, r=0.45, seed=2):
    n = int((dur + r) * SR); rng = np.random.default_rng(seed)
    y = sum(saw(mtof(m) * 2 ** (c / 1200), n, rng.random()) for c in (-9, 0, 9)) / 3
    fe = 700 + 2600 * np.exp(-np.arange(n) / (0.35 * SR)) * np.clip(np.arange(n) / (a * SR), 0, 1)
    y = lp_sweep(y, fe, 256, 2)
    return y * env(n, a, 0.25, 0.8, r, hold=max(0, dur - a - 0.25))
def choir(m, dur, a=0.5, r=1.0, seed=3):
    n = int((dur + r) * SR); t = np.arange(n) / SR; rng = np.random.default_rng(seed)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 4.6 * t + rng.random() * 6)
    src = sum(saw(mtof(m) * 2 ** (c / 1200), n, rng.random(), vib) for c in (-8, 0, 8)) / 3
    y = 0.9 * bp(src, 600, 800) + 0.55 * bp(src, 1100, 1350) + 0.25 * bp(src, 2450, 2750)
    return y * env(n, a, 0.3, 0.9, r, hold=max(0, dur - a - 0.3)) * 2.2
def bell(m, dur=2.5, idx=3.2, ratio=3.5, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = mtof(m)
    I = idx * np.exp(-t / 0.5)
    mod = np.sin(2 * np.pi * f * ratio * t) * I
    y = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / (dur * 0.35))
    y += 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / (dur * 0.12))
    return fade(y * amp, 0.001, 0.05)
def pluck(m, dur=0.9, bright=0.5, seed=4):
    """Karplus–Strong divektorkan per periode."""
    f = mtof(m); N = max(2, int(round(SR / f))); n = int(dur * SR)
    rng = np.random.default_rng(seed); buf = lp(rng.uniform(-1, 1, N * 2), 1500 + 7000 * bright)[:N]
    out = np.zeros(n + N); out[:N] = buf; k = 0.996
    for i in range(N, n + N, N):
        prev = out[i - N:i]; nxt = 0.5 * (prev + np.roll(prev, -1)) * k
        out[i:i + N] = nxt[:len(out[i:i + N])]
    return fade(out[:n], 0.001, 0.08)
def sub(m, dur, a=0.01, r=0.12):
    n = int((dur + r) * SR); y = sine(mtof(m), n) + 0.18 * sine(mtof(m) * 2, n)
    return np.tanh(1.3 * y) * env(n, a, 0.05, 0.9, r, hold=max(0, dur - a - 0.05)) * 0.8
def kick(amp=1.0, tone=52, punch=1.0):
    n = int(0.55 * SR); t = np.arange(n) / SR
    f = tone + 110 * np.exp(-t / 0.035) * punch
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = hp(noise(n, 5), 2500) * np.exp(-t / 0.004) * 0.25
    return np.tanh(1.6 * (y + click)) * amp
def taiko(amp=1.0, tone=62):
    n = int(1.4 * SR); t = np.arange(n) / SR
    f = tone + 40 * np.exp(-t / 0.06)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)
    y += 0.5 * lp(noise(n, 9), 900) * np.exp(-t / 0.05)
    return np.tanh(1.2 * y) * amp
def clap(amp=1.0, seed=6):
    n = int(0.35 * SR); t = np.arange(n) / SR; x = bp(noise(n, seed), 900, 2600)
    e = np.zeros(n)
    for k, dt in enumerate((0, 0.009, 0.018, 0.027)):
        i = int(dt * SR); e[i:] += np.exp(-(t[:n - i]) / (0.008 if k < 3 else 0.12))
    return x * e * 0.5 * amp
def hat(open_=False, amp=1.0, seed=7):
    n = int((0.32 if open_ else 0.06) * SR); t = np.arange(n) / SR
    x = sum(square(fq, n) for fq in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)) / 6 + 0.4 * noise(n, seed)
    x = hp(x, 7500) * np.exp(-t / (0.12 if open_ else 0.018))
    return x * amp * 0.6
def shaker(amp=1.0, seed=8):
    n = int(0.09 * SR); t = np.arange(n) / SR
    return bp(noise(n, seed), 4500, 9000) * np.exp(-t / 0.025) * np.clip(t / 0.01, 0, 1) * amp * 0.7
def riser(dur, f0=200, f1=2400, seed=10):
    n = int(dur * SR); t = np.arange(n) / SR; k = (t / dur) ** 2
    y = bp(noise(n, seed), 300, 9000); fc = f0 + (f1 - f0) * k
    y = lp_sweep(y, fc * 2.5, 256, 2) * (k ** 1.5)
    y += 0.25 * saw(f0 * 0.5 + (f1 * 0.25 - f0 * 0.5) * k, n) * k ** 2
    return y
def whoosh(dur=0.5, f0=600, f1=3500, seed=12, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; k = t / dur
    e = np.sin(np.pi * np.clip(k, 0, 1)) ** 1.6
    y = lp_sweep(noise(n, seed), f0 + (f1 - f0) * k, 256, 2)
    return hp(y, 150) * e * amp

# ---------------------------------------------------------------------------------------------
# Dinamika & loudness
def limiter(x, ceiling_db=-1.5, look=0.004, release=0.08):
    """Limiter look-ahead sederhana (deteksi puncak 4× oversampling)."""
    c = db(ceiling_db)
    up = signal.resample_poly(np.abs(x).max(1), 4, 1)
    pk = up.reshape(-1, 4).max(1)[:len(x)] if len(up) >= len(x) * 4 else np.abs(x).max(1)
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    L = int(look * SR)
    g = np.array([g[max(0, i - L):i + 1].min() for i in range(0, len(g))]) if len(g) < 5000 else _minfilter(g, L)
    a = math.exp(-1 / (release * SR)); out = np.empty_like(g); cur = 1.0
    # release halus (vektor blok)
    for i0 in range(0, len(g), 4096):
        seg = g[i0:i0 + 4096]
        for i in range(len(seg)):
            v = seg[i]; cur = v if v < cur else v + (cur - v) * a; out[i0 + i] = cur
    xd = np.zeros_like(x); xd[L:] = x[:-L] if L else x
    return xd * out[:, None]
def _minfilter(g, L):
    from scipy.ndimage import minimum_filter1d
    return minimum_filter1d(g, size=2 * L + 1, origin=0)
def lufs(x):
    import pyloudnorm as pyln
    return pyln.Meter(SR).integrated_loudness(x)
def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0); return 20 * np.log10(np.abs(up).max() + 1e-12)
def write(path, x, subtype='PCM_24'):
    os.makedirs(os.path.dirname(path), exist_ok=True); sf.write(path, x.astype(np.float32), SR, subtype=subtype)
