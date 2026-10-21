#!/usr/bin/env python3
"""Final WCAG matrix with adjusted FIEZEL tokens -> markdown rows."""
import json

def srgb_to_lin(c):
    c /= 255.0
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lum(rgb):
    r, g, b = rgb
    return 0.2126*srgb_to_lin(r)+0.7152*srgb_to_lin(g)+0.0722*srgb_to_lin(b)

def ratio(fg, bg):
    l1, l2 = lum(hex_to_rgb(fg)), lum(hex_to_rgb(bg))
    return (max(l1,l2)+0.05)/(min(l1,l2)+0.05)

def composite(fg, a, bg):
    f, b = hex_to_rgb(fg), hex_to_rgb(bg)
    return '#%02X%02X%02X' % tuple(round(a*f[i]+(1-a)*b[i]) for i in range(3))

F = {  # FINAL tokens
 'bg':'#FFF9EE','panel':'#FFFFFF','panel-soft':'#FFF3DC','line':'#F0E4CF','line-soft':'#F7EFDF',
 'text':'#241A11','muted':'#6E5E47','muted-soft':'#7E6C4B','text-disabled':'#75654C',
 'sun':'#FFC700','sun-deep':'#E6A800','sun-press':'#CC9600','sun-soft':'#FFF3C4',
 'grad-top':'#FFDE59','grad-bot':'#FFA500',
 'core':'#1B1418','core-soft':'#2A2126','core-line':'#3A3038','on-core':'#FDFAF3',
 'good':'#1F6B4E','good-bright':'#2E8B69','good-soft':'#E9F7F0',
 'bad':'#AC3E2A','bad-bright':'#B8432D','bad-soft':'#FDE3DE',
 'info':'#7A5F1B','info-soft':'#FFF3C4',
 'focus-ring':'#A67A00',
 'ink-hover':'#3A2B1C','ink-press':'#120C07',
}
F['on-core-muted@core'] = composite('#FDFAF3', .68, F['core'])
F['on-core-muted@core-soft'] = composite('#FDFAF3', .68, F['core-soft'])

# label, fg, bg, req, note
PAIRS = [
 ('Teks utama — body','text','bg',4.5,''),
 ('Teks utama di kartu putih','text','panel',4.5,''),
 ('Teks utama di panel-soft','text','panel-soft',4.5,''),
 ('Teks sekunder (muted) di bg','muted','bg',4.5,''),
 ('Muted di panel','muted','panel',4.5,''),
 ('Muted di panel-soft','muted','panel-soft',4.5,''),
 ('Muted-soft (tersier) di bg','muted-soft','bg',4.5,'digeser dari #857350 (4,39)'),
 ('Muted-soft di panel','muted-soft','panel',4.5,''),
 ('Muted-soft di panel-soft','muted-soft','panel-soft',4.5,''),
 ('On-core di panel AI (core)','on-core','core',4.5,''),
 ('On-core di core-soft','on-core','core-soft',4.5,''),
 ('On-core-muted (a=.68) di core','on-core-muted@core','core',4.5,'komposit efektif'),
 ('On-core-muted di core-soft','on-core-muted@core-soft','core-soft',4.5,'komposit efektif'),
 ('Sun (aksen) di core','sun','core',3.0,'ikon/teks besar AI'),
 ('Ink di tombol Sun (CTA)','text','sun',4.5,''),
 ('Ink di sun hover (sun-deep)','text','sun-deep',4.5,''),
 ('Ink di sun press (sun-press)','text','sun-press',4.5,''),
 ('Ink di sun-soft (chip/tile)','text','sun-soft',4.5,''),
 ('Ink di gradasi CTA atas (#FFDE59)','text','grad-top',4.5,''),
 ('Ink di gradasi CTA bawah (#FFA500)','text','grad-bot',4.5,''),
 ('Krem (bg) di CTA ink','bg','text',4.5,''),
 ('Krem di CTA ink hover','bg','ink-hover',4.5,''),
 ('Krem di CTA ink press','bg','ink-press',4.5,''),
 ('Good di good-soft','good','good-soft',4.5,'digeser dari #2E8B69 (3,80)'),
 ('Good di bg','good','bg',4.5,''),
 ('Good di panel','good','panel',4.5,''),
 ('Good-bright (ikon/teks besar)','good-bright','good-soft',3.0,'hanya >=18px/ikon'),
 ('Bad di bad-soft','bad','bad-soft',4.5,'digeser dari #B8432D (4,44)'),
 ('Bad di bg','bad','bg',4.5,''),
 ('Bad di panel','bad','panel',4.5,''),
 ('Info di info-soft','info','info-soft',4.5,'digeser dari #8C6D1F (4,37)'),
 ('Info di bg','info','bg',4.5,''),
 ('Disabled text di panel-soft','text-disabled','panel-soft',4.5,'token baru'),
 ('Disabled text di bg','text-disabled','bg',4.5,''),
 ('Disabled text di panel','text-disabled','panel',4.5,''),
 ('Focus ring vs bg (non-teks)','focus-ring','bg',3.0,'token baru; sun-deep gagal (2,01)'),
 ('Focus ring vs panel','focus-ring','panel',3.0,''),
 ('Focus ring vs panel-soft','focus-ring','panel-soft',3.0,''),
 ('Muted di sun-soft','muted','sun-soft',4.5,'meta di chip kuning'),
]

rows = []
nfail = 0
for label, fg, bg, req, note in PAIRS:
    r = ratio(F[fg], F[bg])
    ok = r >= req
    nfail += (not ok)
    lvl = '4.5 (AA normal)' if req == 4.5 else '3.0 (AA besar/non-teks)'
    rows.append(f"| {label} | `{fg}` {F[fg]} | `{bg}` {F[bg]} | **{r:.2f}:1** | {lvl} | {'✅ LULUS' if ok else '❌ GAGAL'} | {note} |")
    print(('PASS' if ok else 'FAIL'), f"{r:6.2f}", label)

print(f"\nTotal pairs: {len(PAIRS)}, failures: {nfail}")
with open('/home/user/workspace/redesign/tokens/matrix_rows.md','w') as f:
    f.write('\n'.join(rows))
json.dump(F, open('/home/user/workspace/redesign/tokens/final_tokens.json','w'), indent=2)
