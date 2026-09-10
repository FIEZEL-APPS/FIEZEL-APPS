"""Perbaiki artefak papan-catur (background gagal dihapus) pada aset Mira dari PR#399.

Jalankan dari akar repo: python3 tools/fix-mira-assets.py
- full-thinking  : dibangun ulang dari _orig/mira-full-thinking.png yang bersih.
- head-thinking  : dipotong dari full-thinking bersih (pose sama: tangan di dagu).
- head-happy     : dibangun ulang dari _orig/mira-head-happy.png; blink & head-proud
                   dibersihkan dengan flood-fill sisa papan-catur dari tepi luar.
Menulis ulang png / png@1x / webp / svg dan memperbarui manifest.json.
"""
import json, os, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'characters')
MIRA = os.path.join(ROOT, 'mira')


def flood_clean(im):
    """Hapus piksel abu/putih netral yang tersambung ke area transparan luar."""
    a = np.array(im.convert('RGBA'))
    rgb = a[..., :3].astype(int); al = a[..., 3]
    neutral = (abs(rgb[..., 0] - rgb[..., 1]) < 10) & (abs(rgb[..., 1] - rgb[..., 2]) < 10) & (rgb[..., 0] > 180)
    passable = (al < 250) | neutral
    h, w = al.shape
    seen = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if passable[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if passable[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and passable[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    a[..., 3] = np.where(seen, 0, al)
    return Image.fromarray(a, 'RGBA')


def trim(im):
    bbox = im.getchannel('A').getbbox()
    return im.crop(bbox) if bbox else im


def export(name, im, manifest):
    im = im.convert('RGBA')
    p = os.path.join(MIRA, 'png', name + '.png'); im.save(p, optimize=True)
    half = im.resize((max(1, im.width // 2), max(1, im.height // 2)), Image.LANCZOS)
    half.save(os.path.join(MIRA, 'png@1x', name + '.png'), optimize=True)
    im.save(os.path.join(MIRA, 'webp', name + '.webp'), quality=90, method=6)
    try:
        import vtracer
        vtracer.convert_image_to_svg_py(p, os.path.join(MIRA, 'svg', name + '.svg'), colormode='color',
                                        hierarchical='stacked', mode='spline', filter_speckle=4,
                                        color_precision=6, layer_difference=16)
    except Exception as e:  # svg tetap ada versi lama bila vtracer tidak tersedia
        print('svg skip', name, e)
    entry = manifest['characters']['mira'][name]
    entry['w'], entry['h'] = im.width, im.height
    print('ok', name, im.size)


def main():
    mpath = os.path.join(ROOT, 'manifest.json')
    manifest = json.load(open(mpath))
    full = trim(Image.open(os.path.join(ROOT, '_orig', 'mira-full-thinking.png')).convert('RGBA'))
    export('full-thinking', full, manifest)
    head = full.crop((0, 0, full.width, int(full.height * 0.56)))
    export('head-thinking', trim(head), manifest)
    happy = flood_clean(Image.open(os.path.join(MIRA, "png", "head-happy.png")))  # _orig tanpa topi: tidak konsisten
    export('head-happy', happy, manifest)
    proud = flood_clean(Image.open(os.path.join(MIRA, 'png', 'head-proud.png')))
    export('head-proud', proud, manifest)
    blink = flood_clean(Image.open(os.path.join(MIRA, 'png', 'blink', 'head-happy.png')))
    blink.save(os.path.join(MIRA, 'png', 'blink', 'head-happy.png'), optimize=True)
    json.dump(manifest, open(mpath, 'w'), indent=1)
    print('manifest updated')


if __name__ == '__main__':
    sys.exit(main())
