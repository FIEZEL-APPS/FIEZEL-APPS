#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================
FIEZEL — penyintesis SUARA MONYET (tekstur NUSA + 5 SFX)
============================================================

KENAPA BERKAS INI ADA. Pustaka tekstur lama (assets/audio/paw-textures/) adalah
suara KUCING: meow, purr, chirp, trill. Itu benar selama maskotnya PAW. Sejak
karakter aplikasi menjadi NUSA — seekor monyet — suara kucing menjadi salah:
murid mendengar seekor hewan, melihat hewan lain. Berkas ini membuat penggantinya.

KENAPA DISINTESIS, BUKAN DIREKAM ATAU DI-GENERATE MODEL. Tekstur kucing lama pun
sintetis (README OA-8 menyebut "desis nafas sintetis"), jadi ini bukan penurunan
mutu melainkan jalur yang sama. Model SFX pihak ketiga tidak dipakai karena yang
tersedia di sesi ini terkunci untuk pipeline lain — memakainya untuk aset produksi
adalah penyalahgunaan, dan aset merek tidak lahir dari jalan pintas.

SIFAT YANG DIJAGA:
  - DETERMINISTIK. Seed tetap per-bunyi; menjalankan ulang skrip ini menghasilkan
    berkas yang sama byte-demi-byte. Itu yang membuat manifest sha256 bermakna.
  - BUKAN REALISME. Nusa adalah karakter datar bergaya storybook, bukan monyet
    sungguhan. Bunyinya distilasi: dua-tiga formant, glide pitch yang jelas,
    tanpa derau lapangan. Realisme akan bertabrakan dengan senirupanya.
  - RANTAI POLES OA-8 DIPERTAHANKAN apa adanya (README paw-textures): high-pass
    lembut, shelf tinggi -2..-3 dB, ekor reverb tipis, fade halus, normalisasi
    RMS -20 dBFS (bunyi lembut -22), puncak <= -1 dBFS.

ANATOMI SUARA MONYET YANG DIPAKAI (empat tekstur dasar):
  chirp   — glide naik cepat, sangat pendek. Bunyi "perhatian".
  chatter — deret pulsa pendek ber-formant. Bunyi "bicara/ramai".
  coo     — nada lembut ber-vibrato, naik lalu turun. Bunyi "hangat/menyemangati".
  whoop   — glide naik lebar dengan ekor. Bunyi "rayakan".

PEMAKAIAN:
  python3 tools/synth-monkey-sfx.py --probe DIR  # tulis ke DIR untuk didengar dulu
  python3 tools/synth-monkey-sfx.py --apply       # tulis ke repo (MENIMPA SFX kapal)
  python3 tools/synth-monkey-sfx.py --check       # verifikasi tanpa menulis

KENAPA --apply WAJIB, dan ini bukan kehati-hatian teoretis. Skrip ini menulis ke
assets/audio/sfx/paw_*.{ogg,mp3} — berkas yang SEDANG dikapalkan ke murid, dan
salah satunya splash_paw_appear yang dipakai cap splash. Versi pertama berkas ini
menimpa kelimanya begitu dijalankan tanpa argumen, dan itu benar-benar terjadi
saat menguji mode --check: lima SFX produksi tertimpa tanpa satu pun pertanyaan,
padahal keputusan owner saat itu adalah MENUNDA pergantian suara. Dipulihkan
lewat git, tetapi hanya karena kebetulan ada yang memeriksa git status.
Menimpa aset kapal harus jadi keputusan yang diketik, bukan efek samping.
============================================================
"""
import sys, os, json, math, hashlib, wave, struct

import numpy as np
import soundfile as sf

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---------- primitif ----------

def t_axis(dur):
    return np.arange(int(SR * dur)) / SR

def glide(t, f0, f1, curve=1.0):
    """Frekuensi sesaat yang meluncur f0->f1; curve>1 = melengkung di akhir."""
    x = np.linspace(0, 1, len(t)) ** curve
    return f0 + (f1 - f0) * x

def phase_of(freq):
    return 2 * np.pi * np.cumsum(freq) / SR

def formant(sig, f, q=6.0):
    """Resonator biquad band-pass sederhana — memberi 'tenggorokan' pada sinyal."""
    w = 2 * math.pi * f / SR
    alpha = math.sin(w) / (2 * q)
    b0, b1, b2 = alpha, 0.0, -alpha
    a0, a1, a2 = 1 + alpha, -2 * math.cos(w), 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    out = np.zeros_like(sig)
    x1 = x2 = y1 = y2 = 0.0
    for i, x0 in enumerate(sig):
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        out[i] = y0
        x2, x1 = x1, x0
        y2, y1 = y1, y0
    return out

def highpass(sig, fc):
    """One-pole high-pass — membuang lumpur/gemuruh (rantai OA-8)."""
    a = math.exp(-2 * math.pi * fc / SR)
    out = np.zeros_like(sig)
    prev_x = prev_y = 0.0
    for i, x in enumerate(sig):
        y = a * (prev_y + x - prev_x)
        out[i] = y
        prev_x, prev_y = x, y
    return out

def high_shelf(sig, fc, gain_db):
    """Shelf tinggi lembut — menjinakkan desis (rantai OA-8)."""
    a = math.exp(-2 * math.pi * fc / SR)
    low = np.zeros_like(sig)
    prev = 0.0
    for i, x in enumerate(sig):
        prev = (1 - a) * x + a * prev
        low[i] = prev
    high = sig - low
    return low + high * (10 ** (gain_db / 20.0))

def env_ad(t, attack, decay, curve=2.0):
    """Amplop attack-decay; attack/decay dalam detik."""
    e = np.ones_like(t)
    na = max(1, int(attack * SR))
    nd = max(1, int(decay * SR))
    e[:na] = np.linspace(0, 1, na) ** 0.6
    if nd < len(e):
        e[-nd:] = np.linspace(1, 0, nd) ** curve
    return e

def reverb_tail(sig, amount=0.13, delay_ms=38, decay=0.45, taps=5):
    """Ekor reverb tipis (rantai OA-8) — comb sederhana, bukan ruang sungguhan."""
    out = sig.copy()
    d = int(SR * delay_ms / 1000.0)
    g = amount
    for k in range(1, taps + 1):
        off = d * k
        if off >= len(sig):
            break
        out[off:] += sig[: len(sig) - off] * g
        g *= decay
    return out

def fade_edges(sig, ms=6):
    n = max(1, int(SR * ms / 1000.0))
    if len(sig) > 2 * n:
        sig[:n] *= np.linspace(0, 1, n)
        sig[-n:] *= np.linspace(1, 0, n)
    return sig

def normalize(sig, rms_db=-20.0, peak_ceiling_db=-1.0):
    """Normalisasi RMS lalu jaga puncak <= ceiling (rantai OA-8)."""
    rms = float(np.sqrt(np.mean(sig ** 2))) or 1e-9
    sig = sig * (10 ** (rms_db / 20.0) / rms)
    peak = float(np.max(np.abs(sig))) or 1e-9
    ceil = 10 ** (peak_ceiling_db / 20.0)
    if peak > ceil:
        sig = sig * (ceil / peak)
    return sig

def polish(sig, rms_db=-20.0):
    """Rantai poles OA-8, urutan persis seperti README paw-textures."""
    sig = highpass(sig, 120)
    sig = high_shelf(sig, 5200, -2.5)
    sig = reverb_tail(sig)
    sig = fade_edges(sig)
    return normalize(sig, rms_db=rms_db)

# ---------- empat tekstur dasar monyet ----------

def tex_chirp(seed=101):
    """Glide naik cepat 700->1650 Hz, ~110 ms. Bunyi 'perhatian'."""
    rng = np.random.default_rng(seed)
    t = t_axis(0.11)
    f = glide(t, 700, 1650, curve=0.55)
    body = np.sin(phase_of(f)) + 0.28 * np.sin(2 * phase_of(f))
    breath = rng.normal(0, 1, len(t)) * 0.05
    sig = formant(body + breath, 1500, q=5.0)
    return sig * env_ad(t, 0.006, 0.055, curve=2.2)

def tex_chatter(seed=202):
    """Deret 7 pulsa pendek ber-formant. Bunyi 'bicara/ramai'."""
    rng = np.random.default_rng(seed)
    n_pulse, gap = 7, 0.052
    total = gap * n_pulse + 0.12
    out = np.zeros(int(SR * total))
    for k in range(n_pulse):
        dur = 0.030 + 0.006 * math.sin(k * 1.7)
        t = t_axis(dur)
        base = 520 + 130 * math.sin(k * 2.1) + rng.uniform(-25, 25)
        f = glide(t, base * 1.25, base, curve=0.8)
        p = np.sin(phase_of(f)) + 0.34 * np.sin(2 * phase_of(f)) + 0.15 * np.sin(3 * phase_of(f))
        p = formant(p, 1150, q=7.0) + 0.35 * formant(p, 2350, q=9.0)
        p *= env_ad(t, 0.003, dur * 0.7, curve=2.6)
        at = int(k * gap * SR)
        out[at:at + len(p)] += p * (0.78 + 0.22 * math.cos(k * 0.9))
    return out

def tex_coo(seed=303):
    """Nada lembut ber-vibrato, naik lalu turun. Bunyi 'hangat'."""
    t = t_axis(0.62)
    x = np.linspace(0, 1, len(t))
    arc = np.sin(math.pi * x)                     # naik lalu turun
    f = 330 + 150 * arc
    vib = 1 + 0.016 * np.sin(2 * math.pi * 5.4 * t)
    body = np.sin(phase_of(f * vib)) + 0.22 * np.sin(2 * phase_of(f * vib))
    sig = formant(body, 820, q=4.0) + 0.4 * formant(body, 1900, q=6.0)
    return sig * env_ad(t, 0.05, 0.30, curve=1.6)

def tex_whoop(seed=404):
    """Glide naik lebar 340->1250 Hz dengan ekor. Bunyi 'rayakan'."""
    t = t_axis(0.46)
    f = glide(t, 340, 1250, curve=1.8)
    body = np.sin(phase_of(f)) + 0.3 * np.sin(2 * phase_of(f)) + 0.12 * np.sin(3 * phase_of(f))
    sig = formant(body, 1050, q=4.5) + 0.45 * formant(body, 2200, q=7.0)
    return sig * env_ad(t, 0.02, 0.18, curve=1.9)

TEXTURES = {
    'chirp':   (tex_chirp,   -20.0),
    'chatter': (tex_chatter, -20.0),
    'coo':     (tex_coo,     -22.0),   # bunyi lembut: -22 dBFS (aturan OA-8 untuk purr)
    'whoop':   (tex_whoop,   -20.0),
}

# ---------- lima SFX aplikasi, disusun dari tekstur ----------

def place(out, sig, at_s, gain=1.0):
    at = int(at_s * SR)
    end = at + len(sig)
    if end > len(out):
        out = np.pad(out, (0, end - len(out)))
    out[at:end] += sig * gain
    return out

def sfx_greet():
    """BUNYI TANDA TANGAN (paw_greet). Dua suku kata 'halo' — chirp naik, chirp
    lebih pendek, ditutup coo tipis. Ramah, tidak kaget."""
    out = np.zeros(int(SR * 1.05))
    out = place(out, tex_chirp(101), 0.00, 0.95)
    out = place(out, tex_chirp(111) * 0.9, 0.145, 0.8)
    out = place(out, tex_coo(303) * 0.5, 0.30, 0.55)
    return out

def sfx_appear():
    """Nusa muncul — satu chirp pendek, tanpa ekor panjang."""
    out = np.zeros(int(SR * 0.40))
    return place(out, tex_chirp(121), 0.0, 1.0)

def sfx_encourage():
    """Menyemangati — coo hangat, sedikit chatter lembut di belakangnya."""
    out = np.zeros(int(SR * 1.15))
    out = place(out, tex_coo(303), 0.0, 1.0)
    out = place(out, tex_chatter(212) * 0.35, 0.42, 0.4)
    return out

def sfx_celebrate():
    """Rayakan — whoop naik lalu chatter riang."""
    out = np.zeros(int(SR * 1.35))
    out = place(out, tex_whoop(404), 0.0, 1.0)
    out = place(out, tex_chatter(202), 0.34, 0.72)
    out = place(out, tex_chirp(131) * 0.8, 0.80, 0.6)
    return out

def sfx_splash_appear():
    """Splash — chirp dengan ekor sedikit lebih panjang (ruang untuk logo)."""
    out = np.zeros(int(SR * 0.75))
    out = place(out, tex_chirp(141), 0.0, 1.0)
    out = place(out, tex_coo(313) * 0.42, 0.12, 0.5)
    return out

# TARGET RMS DIUKUR DARI BERKAS YANG BENAR-BENAR DIKAPALKAN, bukan dari angka di
# README. README OA-8 menulis -20 dBFS, tetapi lima SFX kucing yang sungguh ada di
# assets/audio/sfx/ mengukur -22.3 s/d -24.5 dBFS. Memakai -20 membuat suara Nusa
# 2-4 dB lebih keras daripada seluruh UI di sekitarnya - terdengar sebagai maskot
# yang berteriak, dan itu cacat yang baru ketahuan setelah dikapalkan. Angka di
# bawah menyamakan Nusa dengan tetangganya, per bunyi:
#   paw_greet -23.4 | paw_appear -22.3 | paw_encourage -24.5 | paw_celebrate -23.3
SFX = {
    'paw_greet':         (sfx_greet,        -23.4),
    'paw_appear':        (sfx_appear,       -22.3),
    'paw_encourage':     (sfx_encourage,    -24.5),
    'paw_celebrate':     (sfx_celebrate,    -23.3),
    'splash_paw_appear': (sfx_splash_appear, -22.3),
}

# ---------- pengukuran (bukti, bukan pendapat) ----------

def measure(sig):
    peak = float(np.max(np.abs(sig))) or 1e-9
    rms = float(np.sqrt(np.mean(sig ** 2))) or 1e-9
    spec = np.abs(np.fft.rfft(sig * np.hanning(len(sig))))
    freqs = np.fft.rfftfreq(len(sig), 1 / SR)
    centroid = float((spec * freqs).sum() / (spec.sum() or 1e-9))
    return {
        'durasi_s': round(len(sig) / SR, 3),
        'puncak_dbfs': round(20 * math.log10(peak), 2),
        'rms_dbfs': round(20 * math.log10(rms), 2),
        'centroid_hz': round(centroid, 1),
    }

def sha256_pcm(sig):
    """Sidik jari SINYAL, bukan berkas.

    Kenapa PCM dan bukan hash berkas .ogg/.mp3: yang ingin dijaga adalah
    "berkas yang dikapalkan benar-benar lahir dari kode sintesis INI". Hash
    berkas terkode tidak bisa menjawab itu — encoder Vorbis/LAME versi berbeda
    menghasilkan byte berbeda dari sinyal yang sama persis, jadi gerbangnya akan
    merah di mesin lain tanpa ada yang salah. Sidik jari PCM float32 bebas dari
    encoder: ia berubah kalau dan hanya kalau SINYALNYA berubah."""
    return hashlib.sha256(sig.astype(np.float32).tobytes()).hexdigest()


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as fh:
        for blk in iter(lambda: fh.read(65536), b''):
            h.update(blk)
    return h.hexdigest()

def write_twins(base_noext, sig):
    """Tulis kembar .ogg + .mp3 (kontrak urlFor() fiezel-ui-sfx.js) + .wav master."""
    data = sig.astype(np.float32)
    written = []
    for ext, fmt, sub in (('.wav', 'WAV', 'PCM_16'), ('.ogg', 'OGG', 'VORBIS'), ('.mp3', 'MP3', None)):
        p = base_noext + ext
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if sub:
            sf.write(p, data, SR, format=fmt, subtype=sub)
        else:
            sf.write(p, data, SR, format=fmt)
        written.append(p)
    return written


def build():
    """Hitung semua bunyi sekali; kembalikan {nama: (sinyal, rms_target)}."""
    tex = {}
    for name, (fn, rms_db) in TEXTURES.items():
        raw = fn()
        tex[name] = (normalize(raw, rms_db=-3.0, peak_ceiling_db=-3.0), polish(raw, rms_db=rms_db))
    sfx = {}
    for name, (fn, rms_db) in SFX.items():
        sfx[name] = polish(fn(), rms_db=rms_db)
    return tex, sfx


def main():
    args = sys.argv[1:]
    check = '--check' in args
    apply_to_repo = '--apply' in args
    probe = None
    if '--probe' in args:
        i = args.index('--probe') + 1
        if i >= len(args):
            print('synth-monkey-sfx: --probe butuh direktori tujuan.\n'
                  '  contoh: python3 tools/synth-monkey-sfx.py --probe /tmp/dengar-dulu')
            sys.exit(2)
        probe = args[i]

    if not check and not probe and not apply_to_repo:
        print('synth-monkey-sfx: menolak menulis ke repo tanpa --apply.\n'
              '  Skrip ini MENIMPA assets/audio/sfx/paw_*.{ogg,mp3} yang sedang dikapalkan\n'
              '  (termasuk splash_paw_appear yang dipakai cap splash).\n'
              '  Dengarkan dulu : python3 tools/synth-monkey-sfx.py --probe /tmp/dengar\n'
              '  Baru terapkan  : python3 tools/synth-monkey-sfx.py --apply')
        sys.exit(2)

    tex, sfx = build()

    out_root = probe if probe else ROOT
    manifest = {
        'generator': 'tools/synth-monkey-sfx.py',
        'karakter': 'NUSA (monyet) — menggantikan tekstur kucing PAW (OA-8)',
        'sample_rate': SR,
        'tekstur': {}, 'sfx': {}, 'files': {},
    }

    plan = []
    for name, (raw, pol) in tex.items():
        plan.append((os.path.join(out_root, 'assets/audio/monkey-textures/raw', name), raw, ('tekstur', name + '/raw')))
        plan.append((os.path.join(out_root, 'assets/audio/monkey-textures/polished', name), pol, ('tekstur', name + '/polished')))
    for name, sig in sfx.items():
        plan.append((os.path.join(out_root, 'assets/audio/sfx', name), sig, ('sfx', name)))

    if check:
        errs = []
        mpath = os.path.join(ROOT, 'assets/audio/monkey-sfx-manifest.json')
        if not os.path.exists(mpath):
            errs.append('manifest belum ada — jalankan tanpa --check dulu')
        else:
            with open(mpath) as fh:
                old = json.load(fh)
            for base, sig, (kind, key) in plan:
                rel_base = os.path.relpath(base, ROOT)
                # LAPIS 1 — kode vs aset: sinyal yang baru disintesis harus cocok
                # dengan sidik jari yang tercatat. Inilah yang menangkap "kodenya
                # diubah tapi lupa regenerasi", dan lapis inilah yang dulu TIDAK
                # ADA: versi pertama hanya membandingkan berkas dengan manifest,
                # dan keduanya selalu dicommit bersama, jadi drift kode lolos
                # hijau (temuan review gitar-bot, PR #401).
                if old.get(kind, {}).get(key, {}).get('pcm') != sha256_pcm(sig):
                    errs.append(rel_base + ' — sinyalnya beda dari yang tercatat; '
                                'kode sintesis berubah tanpa regenerasi aset')
                # LAPIS 2 — aset vs manifest: menangkap berkas yang disunting
                # sesudah dicommit.
                for ext in ('.ogg', '.mp3'):
                    rel = os.path.relpath(base + ext, ROOT)
                    if not os.path.exists(base + ext):
                        errs.append(rel + ' hilang'); continue
                    if old.get('files', {}).get(rel) != sha256_file(base + ext):
                        errs.append(rel + ' disunting sesudah di-generate')
        for e in errs:
            print('FAIL - ' + e)
        if errs:
            print('\nsynth-monkey-sfx --check: FAIL (%d)' % len(errs)); sys.exit(1)
        print('synth-monkey-sfx --check: PASS (sinyal + berkas cocok)')
        return

    for base, sig, (kind, key) in plan:
        for p in write_twins(base, sig):
            rel = os.path.relpath(p, out_root)
            if p.endswith(('.ogg', '.mp3')):
                manifest['files'][rel] = sha256_file(p)
        manifest[kind][key] = measure(sig)
        manifest[kind][key]['pcm'] = sha256_pcm(sig)
        print('aud  - %s (.wav/.ogg/.mp3)  %s' % (os.path.relpath(base, out_root), measure(sig)))

    if not probe:
        mpath = os.path.join(ROOT, 'assets/audio/monkey-sfx-manifest.json')
        # Satu handle, satu penulisan: versi pertama menulis JSON lalu MENAMBAHKAN
        # baris baru lewat handle kedua, dan itu hanya selamat karena CPython
        # menutup handle pertama seketika lewat refcount. Di implementasi lain
        # tulisan JSON-nya bisa belum sampai ke disk saat append berjalan, dan
        # manifestnya rusak (temuan review gitar-bot, PR #401).
        with open(mpath, 'w') as fh:
            json.dump(manifest, fh, indent=2, ensure_ascii=False)
            fh.write('\n')
        print('man  - ' + os.path.relpath(mpath, ROOT))
    print('\nsynth-monkey-sfx: SELESAI')


if __name__ == '__main__':
    main()
