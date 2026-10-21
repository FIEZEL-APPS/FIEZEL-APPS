#!/usr/bin/env python3
"""Mira hair-bun consistency pass.

Canon: the pith-hat hair bun of _reference/mira-sheet.jpg, reproduced pixel-exact in
mira/full-neutral. Every pose gets that same bun sprite re-stamped at an identical
head-relative position and size, using the blush-cheek pair as the rigid head landmark
(works for open- and closed-eye poses alike).

  python3 tools/mira-bun-fix.py            # dry run + preview montage
  python3 tools/mira-bun-fix.py --apply    # rewrite png / png@1x / webp + manifest
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = '/app/assets/characters'
SPRITE = f'{ROOT}/mira/png/parts/bun.png'
DEBUG = '/app/tools/.rig-debug'
APPLY = '--apply' in sys.argv
os.makedirs(DEBUG, exist_ok=True)

# canon landmark, measured on mira/full-neutral (== reference sheet)
CANON_DX = 162.5                 # blush-cheek centre separation
CANON_MID = (297.55, 330.25)     # midpoint between the cheeks
CANON_BUN = (354.0, 0.0)         # bun sprite top-left

TEAM = ['walking', 'shoulder-wave', 'highfive', 'teaching', 'hat-peek']
POSES = ['full-neutral', 'full-cheer', 'full-explain', 'full-wave', 'full-thinking',
         'head-explain', 'head-happy', 'head-proud', 'head-thinking']


def cheeks(a, rg=45, rb=40):
    rgb = a[..., :3].astype(int)
    al = a[..., 3] > 128
    H, W = al.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    ys, xs = np.where(al)
    top, bh = ys.min(), ys.max() - ys.min()
    reg = np.zeros((H, W), bool)
    reg[top:top + int(bh * 0.6)] = True
    lab, n = ndimage.label(al & reg & (r - g > rg) & (r - b > rb) & (lum > 150) & (lum < 235))
    cand = []
    for i in range(1, n + 1):
        y, x = np.where(lab == i)
        if len(x) < 200:
            continue
        w, h = x.max() - x.min() + 1, y.max() - y.min() + 1
        if not (0.85 < w / h < 1.25):
            continue
        cand.append({'cx': float(x.mean()), 'cy': float(y.mean()), 'w': int(w),
                     'h': int(h), 'px': len(x)})
    cand.sort(key=lambda c: -c['px'])
    for i in range(len(cand)):
        for j in range(i + 1, len(cand)):
            p, q = cand[i], cand[j]
            if abs(p['cy'] - q['cy']) > 0.25 * max(p['h'], q['h']) + 4:
                continue
            dx = abs(p['cx'] - q['cx'])
            mw = max(p['w'], q['w'])
            if not (mw * 1.15 < dx < mw * 2.1):
                continue
            if abs(p['w'] - q['w']) / mw > 0.15 or abs(p['h'] - q['h']) / max(p['h'], q['h']) > 0.15:
                continue
            p, q = sorted((p, q), key=lambda c: c['cx'])
            return ((p['cx'] + q['cx']) / 2, (p['cy'] + q['cy']) / 2), dx
    return None, None


def hat_top_profile(a, mid, dx):
    """topmost pith-hat (khaki) pixel per column."""
    rgb = a[..., :3].astype(int)
    al = a[..., 3] > 128
    H, W = al.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    lim = int(mid[1] + dx * 0.2)
    reg = np.zeros((H, W), bool)
    reg[:max(1, lim), :] = True
    hat = al & reg & (r - b > 50) & (lum > 105)
    prof = np.full(W, np.inf)
    cols = np.where(hat.any(axis=0))[0]
    for x in cols:
        prof[x] = np.argmax(hat[:, x])
    return prof


def strip_old_bun(im, mid, dx):
    """erase every brown/green pixel that sits outside (above) the hat crown."""
    a = np.array(im)
    rgb = a[..., :3].astype(int)
    al = a[..., 3] > 128
    H, W = al.shape
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    prof = hat_top_profile(a, mid, dx)
    yy = np.arange(H)[:, None]
    above = yy < (prof[None, :] + 4)
    guard = np.zeros((H, W), bool)
    guard[:max(1, int(mid[1] - dx * 0.5)), :] = True
    brown = lum < 120
    green = (g > r + 6) & (g > b + 6) & (lum < 170)
    tan = (r - b > 55) & (lum > 80)
    kill = al & above & guard & (brown | green) & (~tan)
    if kill.any():
        halo = ndimage.binary_dilation(kill, iterations=4) & ~kill
        skin = (r - g > 20) & (r - b > 30) & (lum > 170)
        kill = kill | (halo & above & guard & (a[..., 3] > 0) & ~tan & ~skin)
    a[..., 3] = np.where(kill, 0, a[..., 3])
    return Image.fromarray(a), int(kill.sum())


def main():
    sprite = Image.open(SPRITE).convert('RGBA')
    manifest = json.load(open(f'{ROOT}/manifest.json'))
    tiles = []
    for char, pose in [('mira', p) for p in POSES] + [('team', p) for p in TEAM]:
        png = f'{ROOT}/{char}/png/{pose}.png'
        im = Image.open(png).convert('RGBA')
        W, H = im.size
        a = np.array(im)
        mid, dx = cheeks(a)
        if mid is None:
            mid, dx = cheeks(a, 28, 24)
        if mid is None:
            print(f'  !! {char}/{pose}: cheeks not found — skipped')
            continue
        s = dx / CANON_DX
        tx = mid[0] + (CANON_BUN[0] - CANON_MID[0]) * s
        ty = mid[1] + (CANON_BUN[1] - CANON_MID[1]) * s
        base, killed = strip_old_bun(im, mid, dx)
        sp = sprite.resize((max(1, round(sprite.width * s)), max(1, round(sprite.height * s))),
                           Image.LANCZOS)
        tx, ty = int(round(tx)), int(round(ty))
        padl, padt = max(0, -tx), max(0, -ty)
        padr, padb = max(0, tx + sp.width - W), max(0, ty + sp.height - H)
        nw, nh = W + padl + padr, H + padt + padb
        canvas = Image.new('RGBA', (nw, nh), (0, 0, 0, 0))
        canvas.alpha_composite(sp, (tx + padl, ty + padt))
        canvas.alpha_composite(base, (padl, padt))
        print(f'  {char}/{pose:15} cheeks dx={dx:6.1f} s={s:4.2f} bun@({tx},{ty}) '
              f'erased={killed:6d}px  {W}x{H} -> {nw}x{nh}')

        if APPLY:
            canvas.save(png)
            canvas.resize((max(1, nw // 2), max(1, nh // 2)), Image.LANCZOS).save(
                f'{ROOT}/{char}/png@1x/{pose}.png')
            canvas.save(f'{ROOT}/{char}/webp/{pose}.webp', 'WEBP', quality=92, method=6)
            e = manifest['characters'][char].get(pose)
            if e:
                e['w'], e['h'] = nw, nh

        crop = canvas.crop((0, 0, nw, int(nh * (0.42 if pose.startswith('full-') else 1.0)) if char == 'mira' else nh))
        th = 300
        crop = crop.resize((max(1, int(crop.width * th / crop.height)), th))
        bg = Image.new('RGB', crop.size, (255, 255, 255))
        bg.paste(crop, (0, 0), crop)
        tiles.append((f'{char}/{pose}', bg))

    if APPLY:
        json.dump(manifest, open(f'{ROOT}/manifest.json', 'w'), indent=1)
        print('manifest updated')

    total = sum(t.width for _, t in tiles)
    sheet = Image.new('RGB', (total, 326), (250, 250, 250))
    d = ImageDraw.Draw(sheet)
    x = 0
    for n, t in tiles:
        sheet.paste(t, (x, 26))
        d.text((x + 6, 8), n, fill=(170, 0, 0))
        x += t.width
    half = sheet.width // 2
    two = Image.new('RGB', (half + 4, 652), (250, 250, 250))
    two.paste(sheet.crop((0, 0, half, 326)), (0, 0))
    two.paste(sheet.crop((half, 0, sheet.width, 326)), (0, 326))
    two.resize((int(two.width * 0.68), int(two.height * 0.68))).save(f'{DEBUG}/bun-after.jpg',
                                                                     quality=85)
    print('preview:', f'{DEBUG}/bun-after.jpg')


main()
