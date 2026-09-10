#!/usr/bin/env python3
"""Face rig + blink asset builder for the FIEZEL mascots.

1. Detects every eye pair (pupil + sclera) and the mouth in each mascot PNG.
2. Writes /app/assets/characters/face-rig.json  -> normalised boxes used by Remotion
   for the subtle mouth motion.
3. Bakes a closed-eye variant of every pose into <char>/png/blink/<pose>.png so the
   blink is a pixel-perfect asset swap (keeps glasses, fur outlines, hats intact).
"""
import json, os, glob
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = '/app/assets/characters'
DEBUG = '/app/tools/.rig-debug'
DBG = bool(os.environ.get('RIG_DBG'))
os.makedirs(DEBUG, exist_ok=True)

# poses that get a baked blink, with the number of real faces to keep
ALLOW = {
    'nusa': {'full-neutral': 1, 'full-wave': 1, 'full-oops': 1, 'head-happy': 1},
    'mira': {'full-neutral': 1, 'full-wave': 1, 'full-explain': 1,
             'head-happy': 1, 'head-explain': 1},
    'team': {'walking': 2, 'shoulder-wave': 2},
}

POSES = {
    'nusa': ['full-neutral', 'full-wave', 'full-celebrate', 'full-oops',
             'full-thinking', 'head-curious', 'head-happy', 'head-oops',
             'head-thinking'],
    'mira': ['full-neutral', 'full-wave', 'full-cheer', 'full-explain',
             'full-thinking', 'head-explain', 'head-happy', 'head-proud',
             'head-thinking'],
    'team': ['walking', 'shoulder-wave', 'highfive', 'teaching', 'hat-peek'],
}


def components(mask, minpx):
    lab, n = ndimage.label(mask)
    objs = ndimage.find_objects(lab)
    out = []
    for i, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        sub = lab[sl] == i
        px = int(sub.sum())
        if px < minpx:
            continue
        y0, x0 = sl[0].start, sl[1].start
        h, w = sub.shape
        ys, xs = np.where(sub)
        out.append({'x0': x0, 'y0': y0, 'w': w, 'h': h, 'px': px,
                    'cx': x0 + float(xs.mean()), 'cy': y0 + float(ys.mean()),
                    'fill': px / (w * h), 'id': i})
    return out, lab


def ring_stats(lumi, alpha, box, pad):
    x0, y0, x1, y1 = box
    H, W = lumi.shape
    ox0, oy0 = max(0, int(x0 - pad)), max(0, int(y0 - pad))
    ox1, oy1 = min(W, int(x1 + pad)), min(H, int(y1 + pad))
    m = np.zeros((H, W), bool)
    m[oy0:oy1, ox0:ox1] = True
    m[max(0, int(y0)):int(y1), max(0, int(x0)):int(x1)] = False
    m &= alpha
    return lumi[m] if m.any() else np.array([0.0])


def find_faces(png, maxr=0.09):
    im = Image.open(png).convert('RGBA')
    W, H = im.size
    a = np.array(im)
    alpha = a[..., 3] > 128
    rgb = a[..., :3].astype(float)
    lumi = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    ys, xs = np.where(alpha)
    top, left, right = ys.min(), xs.min(), xs.max()
    body_h = ys.max() - top

    region = np.zeros((H, W), bool)
    region[top:top + int(body_h * 0.5), left:right + 1] = True

    dark = (lumi < 105) & alpha & region
    minpx = max(24, int(W * H * 0.00003))
    cs, _ = components(dark, minpx)

    light = (lumi > 212) & alpha
    llab, _ = ndimage.label(light)

    pupils = []
    for c in cs:
        if not (0.010 * W < c['w'] < 0.17 * W):
            continue
        if c['w'] > body_h * maxr:
            if DBG:
                print('    rej size', c['x0'], c['y0'], c['w'])
            continue
        if not (0.55 < c['w'] / c['h'] < 1.45):
            continue
        if c['fill'] < 0.42:
            if DBG:
                print('    rej fill', c['x0'], c['y0'], round(c['fill'],2))
            continue
        box = (c['x0'], c['y0'], c['x0'] + c['w'], c['y0'] + c['h'])
        pad = max(2, int(c['w'] * 0.35))
        ring = ring_stats(lumi, alpha, box, pad)
        if (ring > 200).mean() < 0.10:
            if DBG:
                print('    rej ring', c['x0'], c['y0'], round(float((ring > 200).mean()), 2))
            continue
        # a real eye has a white glint inside / next to the pupil
        sub = lumi[max(0, c['y0'] - pad):c['y0'] + c['h'] + pad,
                   max(0, c['x0'] - pad):c['x0'] + c['w'] + pad]
        ringlight = float((ring > 200).mean())
        if (sub > 235).sum() < 4 and ringlight < 0.45:
            if DBG:
                print('    rej glint', c['x0'], c['y0'], int((sub > 243).sum()))
            continue
        # sclera = light blob touching the pupil
        yy = int(np.clip(c['cy'], 0, H - 1))
        xx = int(np.clip(c['cx'], 0, W - 1))
        ids = llab[max(0, c['y0'] - pad):c['y0'] + c['h'] + pad,
                   max(0, c['x0'] - pad):c['x0'] + c['w'] + pad]
        ids = ids[ids > 0]
        if ids.size == 0:
            continue
        vals, counts = np.unique(ids, return_counts=True)
        sid = int(vals[counts.argmax()])
        sy, sx = np.where(llab == sid)
        sbox = (sx.min(), sy.min(), sx.max() + 1, sy.max() + 1)
        if (sbox[2] - sbox[0]) > c['w'] * 2.2 or (sbox[3] - sbox[1]) > c['h'] * 2.2 \
                or sbox[0] > c['x0'] or sbox[2] < c['x0'] + c['w']:
            sbox = (c['x0'] - c['w'] * 0.20, c['y0'] - c['h'] * 0.22,
                    c['x0'] + c['w'] * 1.20, c['y0'] + c['h'] * 1.22)
        c['sclera'] = [float(v) for v in sbox]
        c['_ = '] = xx, yy
        pupils.append(c)

    pupils.sort(key=lambda c: -c['px'])
    used, pairs = set(), []
    for i in range(len(pupils)):
        if i in used:
            continue
        for j in range(i + 1, len(pupils)):
            if j in used:
                continue
            p, q = pupils[i], pupils[j]
            eh = (p['h'] + q['h']) / 2
            if abs(p['cy'] - q['cy']) > eh * 0.7:
                continue
            ew = (p['w'] + q['w']) / 2
            dx = abs(p['cx'] - q['cx'])
            if dx < ew * 0.9 or dx > ew * 3.4:
                continue
            if abs(p['w'] - q['w']) / max(p['w'], q['w']) > 0.45:
                continue
            if abs(p['px'] - q['px']) / max(p['px'], q['px']) > 0.6:
                continue
            used.update({i, j})
            pairs.append(tuple(sorted((p, q), key=lambda c: c['cx'])))
            break
    return im, np.array(im), lumi, alpha, pairs


def mouth_box(lumi, alpha, W, H, p, q):
    eh = (p['h'] + q['h']) / 2
    ey1 = max(p['y0'] + p['h'], q['y0'] + q['h'])
    mid_x = (p['cx'] + q['cx']) / 2
    span = abs(q['cx'] - p['cx']) + (p['w'] + q['w']) / 2
    reg = np.zeros((H, W), bool)
    lo, hi = int(ey1 + eh * 0.25), int(min(H, ey1 + eh * 4.5))
    reg[lo:hi, int(max(0, mid_x - span * 0.5)):int(mid_x + span * 0.5)] = True
    mdark = (lumi < 140) & alpha & reg
    cs, _ = components(mdark, max(20, int(W * H * 0.00002)))
    cs = [c for c in cs if c['w'] > c['h'] * 0.5 and c['w'] < span
          and abs(c['cx'] - mid_x) < span * 0.3]
    if not cs:
        return None
    cs.sort(key=lambda c: -c['px'])
    m = cs[0]
    pad = m['h'] * 0.5
    return [(m['x0'] - m['w'] * 0.3) / W, (m['y0'] - pad) / H,
            (m['w'] * 1.6) / W, (m['h'] + pad * 2.6) / H]


def skin_near(arr, alpha, lumi, box):
    x0, y0, x1, y1 = [int(v) for v in box]
    H, W = lumi.shape
    pad = max(3, int((x1 - x0) * 0.5))
    ox0, oy0 = max(0, x0 - pad), max(0, y0 - pad)
    ox1, oy1 = min(W, x1 + pad), min(H, y1 + pad)
    m = np.zeros((H, W), bool)
    m[oy0:oy1, ox0:ox1] = True
    m[y0:y1, x0:x1] = False
    m &= alpha & (lumi > 150) & (lumi < 245)
    if not m.any():
        m = np.zeros((H, W), bool)
        m[oy0:oy1, ox0:ox1] = True
        m &= alpha
    px = arr[..., :3][m]
    return tuple(int(v) for v in np.median(px, axis=0))


def bake_blink(im, arr, lumi, alpha, pairs, out_path):
    """Paint closed eyelids over each detected eye."""
    img = im.copy()
    dr = ImageDraw.Draw(img)
    for p, q in pairs:
        for c in (p, q):
            sx0, sy0, sx1, sy1 = c['sclera']
            w, h = sx1 - sx0, sy1 - sy0
            ex0, ey0 = sx0 - w * 0.10, sy0 - h * 0.12
            ex1, ey1 = sx1 + w * 0.10, sy1 + h * 0.12
            skin = skin_near(arr, alpha, lumi, (sx0, sy0, sx1, sy1))
            dr.ellipse([ex0, ey0, ex1, ey1], fill=skin + (255,))
            # closed lid: gentle upward arc in the character's line colour
            sub = lumi[int(sy0):int(sy1), int(sx0):int(sx1)]
            line = (74, 46, 32)
            if sub.size:
                dark_mask = np.zeros(lumi.shape, bool)
                dark_mask[int(sy0):int(sy1), int(sx0):int(sx1)] = True
                dark_mask &= (lumi < 90) & alpha
                if dark_mask.sum() > 5:
                    line = tuple(int(v) for v in np.median(arr[..., :3][dark_mask], axis=0))
            lw = max(2, int(h * 0.14))
            cx0, cx1 = sx0 + w * 0.02, sx1 - w * 0.02
            ymid = (sy0 + sy1) / 2 + h * 0.10
            amp = h * 0.30
            pts = []
            n = 18
            for i in range(n + 1):
                t = i / n
                pts.append((cx0 + (cx1 - cx0) * t, ymid + amp * ((2 * t - 1) ** 2 - 0.55)))
            dr.line(pts, fill=line + (255,), width=lw, joint='curve')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path)
    return img


def main():
    rig = {}
    for char, poses in POSES.items():
        for pose in poses:
            png = f'{ROOT}/{char}/png/{pose}.png'
            if not os.path.exists(png):
                continue
            if pose not in ALLOW.get(char, {}):
                continue
            im, arr, lumi, alpha, pairs = find_faces(png, 0.22 if pose.startswith('head-') else 0.13)
            W, H = im.size
            if not pairs:
                print(f'  -- {char}/{pose}: no open eyes (closed-eye pose?)')
                continue
            pairs = pairs[:ALLOW[char][pose]]
            faces = []
            for p, q in pairs:
                f = {'eyes': [(p['x0'] - p['w'] * 0.5) / W,
                              (min(p['y0'], q['y0']) - p['h'] * 0.6) / H,
                              (q['x0'] + q['w'] + q['w'] * 0.5 - p['x0'] + p['w'] * 0.5) / W,
                              (max(p['y0'] + p['h'], q['y0'] + q['h']) - min(p['y0'], q['y0']) + p['h'] * 1.2) / H]}
                mb = mouth_box(lumi, alpha, W, H, p, q)
                if mb:
                    f['mouth'] = mb
                faces.append(f)
            rig.setdefault(char, {})[pose] = {'faces': faces, 'blink': True}
            out = f'{ROOT}/{char}/png/blink/{pose}.png'
            bl = bake_blink(im, arr, lumi, alpha, pairs, out)
            # debug sheet: open | closed
            sheet = Image.new('RGB', (W * 2, H), (255, 255, 255))
            sheet.paste(im, (0, 0), im)
            sheet.paste(bl, (W, 0), bl)
            sheet.save(f'{DEBUG}/blink-{char}-{pose}.jpg', quality=72)
            print(f'  ok {char}/{pose} faces={len(faces)} mouths={sum(1 for f in faces if "mouth" in f)}')
    with open(f'{ROOT}/face-rig.json', 'w') as f:
        json.dump(rig, f, indent=1)
    print('wrote face-rig.json')


main()
