"""Generator §FZFLOW untuk website/style.css (28 s master: 2 siklus tugas + pertemuan MIRA×PAW)."""
import re

OUT = '/app/fiezel/website/style.css'

def fmt(p):
    s = ('%.2f' % p).rstrip('0').rstrip('.')
    return s

def kf(name, stops):
    """stops: list of (pct, css). Sort, dedupe (last wins), merge equal consecutive css."""
    d = {}
    for p, css in stops:
        d[round(p, 3)] = css
    items = sorted(d.items())
    out = []
    i = 0
    while i < len(items):
        j = i
        pcts = [items[i][0]]
        while j + 1 < len(items) and items[j + 1][1] == items[i][1]:
            j += 1
            pcts.append(items[j][0])
        # keep only first and last of a run (intermediate identical stops are redundant)
        sel = [pcts[0]] if len(pcts) == 1 else [pcts[0], pcts[-1]]
        out.append(','.join(fmt(p) + '%' for p in sel) + '{' + items[i][1] + '}')
        i = j + 1
    return '@keyframes ' + name + '{' + ''.join(out) + '}\n'

def cyc(spec, rest, extra=()):
    """spec: (p7, css) dalam persen siklus 7 s -> dua siklus di 0-50% dari 28 s; rest 50-100%."""
    stops = []
    for c in (0, 1):
        for p, css in spec:
            stops.append((c * 25 + p / 4.0, css))
    stops.append((50, rest))
    stops.append((100, rest))
    stops.extend(extra)
    return stops

EX = 'animation-timing-function:var(--fz-ease-x)'
EY = 'animation-timing-function:var(--fz-ease-y)'
TC = 'translate(-50%,-50%)'
HID = 'opacity:0;transform:%s scale(.45)' % TC
css = []

# ---------------- Lapisan A ----------------
css.append(kf('fzflow-task-x', cyc([(0, 'transform:translateX(var(--fz-tx));' + EX), (4, 'transform:translateX(var(--fz-tx));' + EX),
    (13, 'transform:translateX(var(--fz-t-mid-x));' + EX), (22, 'transform:translateX(var(--fz-sx))')], 'transform:translateX(var(--fz-sx))')))
css.append(kf('fzflow-task-y', cyc([(0, 'transform:translateY(var(--fz-ty));' + EY), (4, 'transform:translateY(var(--fz-ty));' + EY),
    (13, 'transform:translateY(var(--fz-t-mid-y));' + EY), (22, 'transform:translateY(var(--fz-sy))')], 'transform:translateY(var(--fz-sy))')))
css.append(kf('fzflow-task-pop', cyc([(0, 'opacity:0;transform:%s scale(.4)' % TC), (4, 'opacity:1;transform:%s scale(1)' % TC),
    (20, 'opacity:1;transform:%s scale(1)' % TC), (24, HID)], HID)))
css.append(kf('fzflow-result-x', cyc([(0, 'transform:translateX(var(--fz-sx));' + EX), (60, 'transform:translateX(var(--fz-sx));' + EX),
    (70, 'transform:translateX(var(--fz-r-mid-x));' + EX), (80, 'transform:translateX(var(--fz-tx))')], 'transform:translateX(var(--fz-tx))')))
css.append(kf('fzflow-result-y', cyc([(0, 'transform:translateY(var(--fz-sy));' + EY), (60, 'transform:translateY(var(--fz-sy));' + EY),
    (70, 'transform:translateY(var(--fz-r-mid-y));' + EY), (80, 'transform:translateY(var(--fz-ty))')], 'transform:translateY(var(--fz-ty))')))
css.append(kf('fzflow-result-pop', cyc([(0, 'opacity:0;transform:%s scale(.4)' % TC), (57, 'opacity:0;transform:%s scale(.4)' % TC),
    (60, 'opacity:1;transform:%s scale(1)' % TC), (78, 'opacity:1;transform:%s scale(1)' % TC), (82, HID)], HID)))
BH = 'opacity:0;transform:%s scale(.4)' % TC
css.append(kf('fzflow-badge', cyc([(0, BH), (21, BH), (24, 'opacity:1;transform:%s scale(1.18)' % TC), (27, 'opacity:1;transform:%s scale(1)' % TC),
    (56, 'opacity:1;transform:%s scale(1)' % TC), (60, 'opacity:0;transform:%s scale(.6)' % TC)], 'opacity:0;transform:%s scale(.6)' % TC)))
PH = 'opacity:0;transform:%s translateY(6px)' % TC
css.append(kf('fzflow-progress', cyc([(0, PH), (25, PH), (28, 'opacity:1;transform:%s translateY(0)' % TC), (58, 'opacity:1;transform:%s translateY(0)' % TC),
    (62, 'opacity:0;transform:%s translateY(-4px)' % TC)], 'opacity:0;transform:%s translateY(-4px)' % TC)))
css.append(kf('fzflow-bar', cyc([(0, 'transform:scaleX(0)'), (28, 'transform:scaleX(0)'), (54, 'transform:scaleX(1)')], 'transform:scaleX(1)')))
css.append(kf('fzflow-check', cyc([(0, 'opacity:0;transform:scale(.4)'), (54, 'opacity:0;transform:scale(.4)'), (57, 'opacity:1;transform:scale(1)'),
    (60, 'opacity:1;transform:scale(1)'), (63, 'opacity:0;transform:scale(1)')], 'opacity:0;transform:scale(1)')))
NH = 'opacity:0;transform:%s scale(.6) translateY(6px)' % TC
css.append(kf('fzflow-notif', cyc([(0, NH), (80, NH), (83, 'opacity:1;transform:%s scale(1.08) translateY(0)' % TC), (86, 'opacity:1;transform:%s scale(1)' % TC),
    (96, 'opacity:1;transform:%s scale(1)' % TC), (99, 'opacity:0;transform:%s scale(.8)' % TC)], 'opacity:0;transform:%s scale(.8)' % TC)))

# ---------------- MIRA: pose siklus tugas + pertemuan ----------------
LEAN = 'transform:rotate(-7deg) translate(-3px,-2px) scale(1.04)'
head = []
for c, variant in ((0, 'A'), (1, 'B')):
    b = c * 25
    head += [(b, 'transform:none'), (b + 1.1, LEAN), (b + 2.6, LEAN), (b + 4.1, 'transform:none'), (b + 9.75, 'transform:rotate(2deg)'),
             (b + 15, 'transform:rotate(-1.5deg)'), (b + 19.5, 'transform:none')]
    if variant == 'A':
        head += [(b + 20.6, 'transform:translateY(-5px) scale(1.03)'), (b + 21.75, 'transform:translateY(0)'),
                 (b + 22.9, 'transform:translateY(-4px) scale(1.02)'), (b + 24.4, 'transform:none')]
    else:
        head += [(b + 21.4, 'transform:rotate(8deg) translate(2px,-2px) scale(1.04)'), (b + 23.6, 'transform:rotate(8deg) translate(2px,-2px) scale(1.04)'),
                 (b + 24.75, 'transform:none')]
head += [(50, 'transform:none'), (59, 'transform:none'), (60.5, 'transform:rotate(-9deg)'), (63, 'transform:rotate(-9deg)'), (64.5, 'transform:none'),
         (65.5, 'transform:rotate(4deg) translateY(-4px)'), (67, 'transform:none')]
for i, p in enumerate(range(68, 83, 2)):
    head.append((p, 'transform:translateY(-5px) rotate(%sdeg)' % (3 if i % 2 else -3)))
    head.append((p + 1, 'transform:translateY(0)'))
head += [(84, 'transform:rotate(-6deg)'), (86, 'transform:none'), (100, 'transform:none')]
css.append(kf('fzflow-mira-head', head))

HN = 'transform:none'
css.append(kf('fzflow-mira-hand', cyc([(0, HN), (2, 'transform:rotate(-58deg) translate(6px,-4px)'), (7, 'transform:rotate(-52deg) translate(6px,-4px)'),
    (11, HN), (82, HN), (85, 'transform:rotate(-22deg)'), (88, 'transform:rotate(-38deg)'), (91, 'transform:rotate(-20deg)'), (95, HN)], HN)))
css.append(kf('fzflow-mira-bubble', cyc([(0, 'opacity:0;transform:scale(.5)'), (2.5, 'opacity:1;transform:scale(1)'), (8, 'opacity:1;transform:scale(1)'),
    (11, 'opacity:0;transform:translate(-10px,-6px) scale(.7)')], 'opacity:0;transform:translate(-10px,-6px) scale(.7)')))
SH = 'opacity:0;transform:scale(.3) rotate(0)'
css.append(kf('fzflow-mira-sparkle', cyc([(0, SH), (81, SH), (84, 'opacity:1;transform:scale(1.1) rotate(20deg)'), (88, 'opacity:.6;transform:scale(.85) rotate(40deg)'),
    (92, 'opacity:1;transform:scale(1) rotate(60deg)'), (97, 'opacity:0;transform:scale(.4) rotate(80deg)')], SH,
    extra=[(66.5, SH), (67.5, 'opacity:1;transform:scale(1.1) rotate(20deg)'), (69.5, 'opacity:.6;transform:scale(.85) rotate(40deg)'),
           (71.5, 'opacity:1;transform:scale(1) rotate(60deg)'), (74, 'opacity:0;transform:scale(.4) rotate(80deg)')])))
css.append(kf('fzflow-mira-blush', cyc([(0, 'opacity:.32'), (80, 'opacity:.32'), (85, 'opacity:.62'), (95, 'opacity:.62'), (99, 'opacity:.32')], 'opacity:.32',
    extra=[(66, 'opacity:.32'), (68, 'opacity:.62'), (84, 'opacity:.62'), (86, 'opacity:.32')])))
css.append(kf('fzflow-mira-mouth', cyc([(0, 'transform:scale(1)'), (80, 'transform:scale(1)'), (84, 'transform:scale(1.3,1.7)'), (95, 'transform:scale(1.3,1.7)'),
    (99, 'transform:scale(1)')], 'transform:scale(1)',
    extra=[(59, 'transform:scale(1)'), (60, 'transform:scale(1.2,1.5)'), (63, 'transform:scale(1.2,1.5)'), (64, 'transform:scale(1)'),
           (67, 'transform:scale(1)'), (68, 'transform:scale(1.3,1.7)'), (84, 'transform:scale(1.3,1.7)'), (86, 'transform:scale(1)')])))

# perjalanan MIRA: turun dari balik lid ke titik temu, lalu kembali. z-index ikut dianimasikan (diskrit).
HOME = 'transform:translateX(-50%%) translateY(%s) scale(1);z-index:1'
MEET = 'transform:translate(calc(-50% + var(--fz-mira-dx)),var(--fz-mira-dy)) scale(var(--fz-mira-scale));z-index:4'
APEX = 'transform:translate(calc(-50% + var(--fz-mira-dx) * .5),calc(var(--fz-mira-dy) * .35 - 64px)) scale(calc(var(--fz-mira-scale) * .92 + .08));z-index:4'
travel = []
for i in range(0, 9):
    travel.append((i * 6.25, HOME % ('0' if i % 2 == 0 else '-5px')))
travel += [(50, HOME % '0'), (52, 'transform:translateX(-50%) translateY(-36px) scale(1.06);z-index:1'), (52.5, 'transform:translateX(-50%) translateY(-36px) scale(1.06);z-index:4'),
           (55.5, APEX), (58, MEET), (58.7, 'transform:translate(calc(-50% + var(--fz-mira-dx)),var(--fz-mira-dy)) scale(calc(var(--fz-mira-scale) * 1.07),calc(var(--fz-mira-scale) * .91));z-index:4'), (59.5, MEET),
           (67, MEET), (67.6, 'transform:translate(calc(-50% + var(--fz-mira-dx)),calc(var(--fz-mira-dy) - 12px)) scale(var(--fz-mira-scale));z-index:4'), (68.4, MEET),
           (69.8, 'transform:translate(calc(-50% + var(--fz-mira-dx)),calc(var(--fz-mira-dy) - 12px)) scale(var(--fz-mira-scale));z-index:4'), (70.6, MEET),
           (86.5, MEET), (87.3, 'transform:translate(calc(-50% + var(--fz-mira-dx)),var(--fz-mira-dy)) scale(calc(var(--fz-mira-scale) * 1.06),calc(var(--fz-mira-scale) * .91));z-index:4'),
           (90, APEX), (90.6, 'transform:translate(calc(-50% + var(--fz-mira-dx) * .3),calc(var(--fz-mira-dy) * .2 - 70px)) scale(1.08);z-index:1'),
           (92.5, 'transform:translateX(-50%) translateY(-30px) scale(1);z-index:1'), (93.5, HOME % '0'), (96.75, HOME % '-5px'), (100, HOME % '0')]
css.append(kf('fzflow-mira-travel', travel))
css.append(kf('fzflow-mira-chin', [(0, 'opacity:1'), (52.5, 'opacity:1'), (53.5, 'opacity:0'), (91, 'opacity:0'), (92, 'opacity:1'), (100, 'opacity:1')]))
css.append(kf('fzflow-mira-arms', [(0, 'opacity:0'), (52.5, 'opacity:0'), (53.5, 'opacity:1'), (91, 'opacity:1'), (92, 'opacity:0'), (100, 'opacity:0')]))
AR0 = 'transform:rotate(0)'
css.append(kf('fzflow-mira-arm-r', [(0, AR0), (58.5, AR0), (59.5, 'transform:rotate(-125deg)'), (60.5, 'transform:rotate(-100deg)'), (61.5, 'transform:rotate(-135deg)'),
    (62.5, 'transform:rotate(-100deg)'), (63.5, 'transform:rotate(-125deg)'), (64.5, 'transform:rotate(-132deg)'), (66.6, 'transform:rotate(-132deg)'), (68, AR0),
    (84, AR0), (84.6, 'transform:rotate(-125deg)'), (85.4, 'transform:rotate(-98deg)'), (86.2, 'transform:rotate(-132deg)'), (87.2, AR0), (100, AR0)]))
css.append(kf('fzflow-mira-arm-l', [(0, AR0), (63.5, AR0), (64.5, 'transform:rotate(128deg)'), (66.6, 'transform:rotate(128deg)'), (68, AR0), (100, AR0)]))

# ---------------- PAW: rig lompat + kostum ----------------
css.append(kf('fzflow-paw-x', [(0, 'transform:translateX(0)'), (53, 'transform:translateX(0)'), (59, 'transform:translateX(var(--fz-paw-dx))'),
    (87, 'transform:translateX(var(--fz-paw-dx))'), (93, 'transform:translateX(0)'), (100, 'transform:translateX(0)')]))
def py(f, up):
    return 'transform:translateY(calc(var(--fz-paw-dy) * %s - %spx))' % (f, up)
pawy = [(0, 'transform:translateY(0)'), (53, 'transform:translateY(0)'), (54, py(.17, 36)), (55, py(.33, 0)), (56, py(.5, 36)), (57, py(.67, 0)), (58, py(.83, 30)),
        (59, py(1, 0)), (67, py(1, 0)), (67.6, py(1, 16)), (68.4, py(1, 0)), (69.8, py(1, 16)), (70.6, py(1, 0)), (87, py(1, 0)),
        (88, py(.83, 36)), (89, py(.67, 0)), (90, py(.5, 36)), (91, py(.33, 0)), (92, py(.17, 30)), (93, 'transform:translateY(0)'), (100, 'transform:translateY(0)')]
css.append(kf('fzflow-paw-y', pawy))
SQ = 'transform:scale(1)'
css.append(kf('fzflow-paw-squash', [(0, SQ), (53, SQ), (53.6, 'transform:scale(1.06,.94)'), (54, 'transform:scale(.96,1.05)'), (55, 'transform:scale(1.06,.94)'),
    (55.6, SQ), (57, 'transform:scale(1.06,.94)'), (57.6, SQ), (59, 'transform:scale(1.08,.92)'), (59.8, SQ), (88, 'transform:scale(1.06,.94)'), (88.6, SQ),
    (91, 'transform:scale(1.06,.94)'), (91.6, SQ), (93, 'transform:scale(1.08,.92)'), (93.8, SQ), (100, SQ)]))
css.append(kf('fzflow-pc-star', [(0, 'opacity:0'), (58.8, 'opacity:0'), (59.6, 'opacity:1'), (66.4, 'opacity:1'), (67, 'opacity:0'), (100, 'opacity:0')]))
css.append(kf('fzflow-pc-joy', [(0, 'opacity:0'), (67, 'opacity:0'), (67.6, 'opacity:1'), (84.5, 'opacity:1'), (85.2, 'opacity:0'), (100, 'opacity:0')]))
css.append(kf('fzflow-pc-mouth', [(0, 'opacity:0'), (58.8, 'opacity:0'), (59.6, 'opacity:1'), (84.5, 'opacity:1'), (85.2, 'opacity:0'), (100, 'opacity:0')]))
CH = 'opacity:0;transform:scale(.6)'
css.append(kf('fzflow-pc-costume', [(0, CH), (66, CH), (66.8, 'opacity:1;transform:scale(1.12)'), (67.6, 'opacity:1;transform:scale(1)'), (93.6, 'opacity:1;transform:scale(1)'),
    (94.6, CH), (100, CH)]))
PF = 'opacity:0;transform:scale(.2)'
css.append(kf('fzflow-pc-poof', [(0, PF), (65.6, PF), (66.4, 'opacity:1;transform:scale(1)'), (67.6, 'opacity:0;transform:scale(1.7)'), (93.4, PF),
    (94.2, 'opacity:1;transform:scale(1)'), (95.4, 'opacity:0;transform:scale(1.7)'), (100, PF)]))
HH = 'opacity:0;transform:translateY(8px) scale(.6)'
css.append(kf('fzflow-heart', [(0, HH), (60, HH), (62, 'opacity:1;transform:translateY(0) scale(1)'), (66, 'opacity:0;transform:translateY(-34px) scale(1.1)'), (67, HH),
    (69, 'opacity:1;transform:translateY(0) scale(1)'), (74, 'opacity:0;transform:translateY(-38px) scale(1.15)'), (75, HH),
    (77, 'opacity:1;transform:translateY(0) scale(1)'), (82.5, 'opacity:0;transform:translateY(-38px) scale(1.15)'), (83, HH), (100, HH)]))

KEYFRAMES = ''.join(css)

BLOCK = open('/app/fzflow_static.css', encoding='utf-8').read().replace('__KEYFRAMES__', KEYFRAMES)

src = open(OUT, encoding='utf-8').read()
start = src.index('/* ============ FZFLOW')
src = src[:start] + BLOCK
open(OUT, 'w', encoding='utf-8').write(src)
print('keyframes:', len(css), 'bytes:', len(BLOCK))
