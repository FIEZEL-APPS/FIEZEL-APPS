#!/usr/bin/env python3
"""WCAG 2.x contrast computation for FIEZEL token pairs."""
import json

def srgb_to_lin(c):
    c /= 255.0
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lum(rgb):
    r, g, b = rgb
    return 0.2126*srgb_to_lin(r) + 0.7152*srgb_to_lin(g) + 0.0722*srgb_to_lin(b)

def ratio(fg, bg):
    l1, l2 = lum(hex_to_rgb(fg)), lum(hex_to_rgb(bg))
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

def composite(fg_hex, alpha, bg_hex):
    f, b = hex_to_rgb(fg_hex), hex_to_rgb(bg_hex)
    return '#%02X%02X%02X' % tuple(round(alpha*f[i] + (1-alpha)*b[i]) for i in range(3))

T = {
    'bg':'#FFF9EE','panel':'#FFFFFF','panel-soft':'#FFF3DC','line':'#F0E4CF','line-soft':'#F7EFDF',
    'text':'#241A11','muted':'#6E5E47','muted-soft':'#857350',
    'sun':'#FFC700','sun-deep':'#E6A800','sun-press':'#CC9600','sun-soft':'#FFF3C4',
    'grad-top':'#FFDE59','grad-bot':'#FFA500',
    'core':'#1B1418','core-soft':'#2A2126','core-line':'#3A3038','on-core':'#FDFAF3',
    'good':'#2E8B69','good-soft':'#E9F7F0','bad':'#B8432D','bad-soft':'#FDE3DE',
    'info':'#8C6D1F','info-soft':'#FFF3C4',
}
# composited tokens
T['on-core-muted@core'] = composite('#FDFAF3', 0.68, T['core'])
T['on-core-muted@core-soft'] = composite('#FDFAF3', 0.68, T['core-soft'])

pairs = [
    # (fg, bg, label, requirement)  req: 4.5 normal, 3.0 large, 3.0 nontext
    ('text','bg','Teks utama di background', 4.5),
    ('text','panel','Teks utama di panel putih', 4.5),
    ('text','panel-soft','Teks utama di panel-soft', 4.5),
    ('muted','bg','Teks sekunder (muted) di bg', 4.5),
    ('muted','panel','Muted di panel', 4.5),
    ('muted','panel-soft','Muted di panel-soft', 4.5),
    ('muted-soft','bg','Muted-soft di bg (hanya >=14px?)', 4.5),
    ('muted-soft','panel','Muted-soft di panel', 4.5),
    ('on-core','core','On-core di panel AI (core)', 4.5),
    ('on-core','core-soft','On-core di core-soft', 4.5),
    ('on-core-muted@core','core','On-core-muted di core (komposit)', 4.5),
    ('on-core-muted@core-soft','core-soft','On-core-muted di core-soft (komposit)', 4.5),
    ('text','sun','Ink di tombol Sun (CTA)', 4.5),
    ('text','sun-deep','Ink di sun-deep (hover)', 4.5),
    ('text','sun-press','Ink di sun-press (press)', 4.5),
    ('text','sun-soft','Ink di sun-soft', 4.5),
    ('text','grad-top','Ink di gradasi atas #FFDE59', 4.5),
    ('text','grad-bot','Ink di gradasi bawah #FFA500', 4.5),
    ('bg','text','Krem (bg) di CTA ink', 4.5),
    ('panel','text','Putih di CTA ink', 4.5),
    ('good','good-soft','Good di good-soft', 4.5),
    ('good','bg','Good di bg', 4.5),
    ('bad','bad-soft','Bad di bad-soft', 4.5),
    ('bad','bg','Bad di bg', 4.5),
    ('info','info-soft','Info di info-soft', 4.5),
    ('info','bg','Info di bg', 4.5),
    ('muted','sun-soft','Muted di sun-soft', 4.5),
    ('sun-deep','bg','Focus ring sun-deep vs bg (non-teks)', 3.0),
    ('sun','core','Sun di core (aksen AI, non-teks/teks besar)', 3.0),
    ('sun-deep','panel','Ring vs panel (non-teks)', 3.0),
]

rows = []
for fg, bg, label, req in pairs:
    r = ratio(T[fg], T[bg])
    rows.append({'fg': fg, 'fg_hex': T[fg], 'bg': bg, 'bg_hex': T[bg], 'label': label,
                 'ratio': round(r, 2), 'req': req, 'pass': r >= req})
    mark = 'PASS' if r >= req else 'FAIL'
    print(f"{mark:4} {r:6.2f} (req {req}) {label}: {fg} {T[fg]} on {bg} {T[bg]}")

with open('/home/user/workspace/redesign/tokens/contrast_results.json','w') as f:
    json.dump({'tokens': T, 'rows': rows}, f, indent=2)

# --- search helpers for adjustments ---
print("\n--- kandidat penyesuaian ---")
def probe(fg, bgs):
    print(fg, {b: round(ratio(fg, T[b] if b in T else b),2) for b in bgs})

# disabled text on panel-soft: need >=4.5 on #FFF3DC
for cand in ['#6E5E47','#75654C','#7A6A50','#857350']:
    print('disabled cand', cand, 'on panel-soft:', round(ratio(cand, T['panel-soft']),2), 'on bg:', round(ratio(cand, T['bg']),2))
# muted-soft alternatives
for cand in ['#857350','#7E6C4B','#786748','#736244']:
    print('muted-soft cand', cand, 'on bg:', round(ratio(cand, T['bg']),2), 'on panel:', round(ratio(cand, T['panel']),2))
# good on good-soft alternatives
for cand in ['#2E8B69','#25795A','#1F6B4E','#1A6249']:
    print('good cand', cand, 'on good-soft:', round(ratio(cand, T['good-soft']),2), 'on bg:', round(ratio(cand, T['bg']),2), 'on panel:', round(ratio(cand,'#FFFFFF'),2))
# bad on bad-soft
for cand in ['#B8432D','#AC3E2A','#A33A27','#9E3825']:
    print('bad cand', cand, 'on bad-soft:', round(ratio(cand, T['bad-soft']),2), 'on bg:', round(ratio(cand, T['bg']),2))
# info on info-soft (#FFF3C4)
for cand in ['#8C6D1F','#83661D','#7A5F1B','#715818']:
    print('info cand', cand, 'on info-soft:', round(ratio(cand, T['info-soft']),2), 'on bg:', round(ratio(cand, T['bg']),2))
# on-core-muted alpha probe
for a in [0.68, 0.72, 0.75, 0.78, 0.80]:
    c = composite('#FDFAF3', a, T['core-soft'])
    c2 = composite('#FDFAF3', a, T['core'])
    print(f'on-core-muted a={a}: on core {round(ratio(c2, T["core"]),2)}, on core-soft {round(ratio(c, T["core-soft"]),2)}')
