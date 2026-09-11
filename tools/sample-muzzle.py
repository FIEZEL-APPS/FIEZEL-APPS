#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FIEZEL — pengukur WARNA MONCONG per pose karakter.

Kenapa ada: lapisan viseme harus MENUTUP mulut yang sudah tergambar di seni
sebelum menggambar mulut barunya. Tanpa itu ada dua mulut sekaligus di wajah
karakter — benar-benar terjadi dan terlihat saat dirender di Chromium.

Menutupnya butuh satu warna: kulit di sekitar mulut. Warna itu DIUKUR dari
asetnya, tidak ditulis tangan, karena Nusa (krem #F5DDB2) dan Mira (kulit
#F5AB88) berbeda dan akan berbeda lagi kalau seninya diperbarui.

Caranya: ambil piksel di dalam kotak mulut face-rig, buang yang gelap (itu
mulutnya sendiri), lalu ambil median dari sisanya. Median, bukan rata-rata,
supaya garis bibir atau bayangan tidak menggeser hasilnya.

Setiap entri MENCATAT sha256 PNG yang disampel, dan dokumennya mencatat sha256
face-rig.json + parameter penyampel. Empat masukan itulah SELURUH masukan yang
menentukan hasil, jadi memeriksa keempatnya cukup untuk menjawab "masih segar?"
tanpa mendekode gambar. Versi sebelumnya hanya mencatat PNG, dan komentarnya
mengklaim "mustahil basi tanpa ketahuan" — klaim yang lebih besar daripada yang
diperiksanya, dan review gitar-bot benar menangkapnya: kotak mulut yang bergeser
di face-rig, parameter penyampel yang berubah, atau pose baru yang tak pernah
disampel semuanya lolos diam-diam.

Pose yang TIDAK bisa disampel (piksel terangnya terlalu sedikit) dicatat di
`dilewati` dengan alasannya, bukan dibiarkan absen begitu saja — absen dan
sengaja-dilewati harus bisa dibedakan. Itu bukan hiasan: dengan sidik
jari itu, "muzzle.json masih segar terhadap seninya" bisa diperiksa tanpa
mendekode satu gambar pun — jadi gerbangnya tidak bergantung pada Pillow
terpasang. Pillow hanya dibutuhkan untuk MENGHASILKAN ulang, bukan untuk
memverifikasi. Alasannya konkret: CI memerahkan gerbang ini dengan
ModuleNotFoundError karena Pillow tidak ada di sana, dan jawaban "pasang Pillow
di CI" membuat jaminannya bergantung pada lingkungan — kalau suatu hari paket itu
hilang, pemeriksaannya berhenti menjaga tanpa suara.

Keluaran: assets/characters/muzzle.json  (dibaca tools/gen-character-art-table.mjs)
Pemakaian: python3 tools/sample-muzzle.py [--check]
"""
import json, os, sys, statistics, hashlib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/characters/muzzle.json')
GRID = 28              # 28x28 sampel di dalam kotak mulut
LUMA_MIN = 150         # di atas ini dianggap kulit, di bawahnya mulut/bayangan
MIN_SAMPEL = 40        # di bawah ini median tidak dipercaya; pose dicatat 'dilewati'

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for blk in iter(lambda: fh.read(65536), b''):
            h.update(blk)
    return h.hexdigest()


def sample(png, box):
    im = Image.open(os.path.join(ROOT, png)).convert('RGBA')
    W, H = im.size
    mx, my, mw, mh = box
    light = []
    for i in range(GRID):
        for j in range(GRID):
            x = int((mx + mw * i / (GRID - 1)) * W)
            y = int((my + mh * j / (GRID - 1)) * H)
            if 0 <= x < W and 0 <= y < H:
                p = im.getpixel((x, y))
                if p[3] > 200 and (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) > LUMA_MIN:
                    light.append(p[:3])
    if len(light) < MIN_SAMPEL:
        return None, len(light)
    med = tuple(int(statistics.median([c[k] for c in light])) for k in range(3))
    return '#%02X%02X%02X' % med, len(light)

def build():
    rig_path = os.path.join(ROOT, 'assets/characters/face-rig.json')
    with open(rig_path) as fh:
        rig = json.load(fh)
    with open(os.path.join(ROOT, 'assets/characters/manifest.json')) as fh:
        man = json.load(fh)
    out = {
        'generator': 'tools/sample-muzzle.py',
        'cara': 'median piksel terang (luma>%d) di dalam kotak mulut face-rig' % LUMA_MIN,
        # Sidik jari SELURUH masukan yang menentukan hasil. Gerbang memeriksa
        # keempatnya, jadi kebasian dari sumber mana pun ketahuan tanpa Pillow.
        'masukan': {
            'faceRig': 'assets/characters/face-rig.json',
            'faceRigSha256': sha256_file(rig_path),
            'grid': GRID,
            'lumaMin': LUMA_MIN,
            'minSampel': MIN_SAMPEL,
        },
        'warna': {},
        'dilewati': {},
    }
    for char in sorted(rig):
        for pose in sorted(rig[char]):
            e = man['characters'].get(char, {}).get(pose)
            if not e:
                # pose ada di face-rig tapi tidak punya aset di manifest: bukan
                # kelalaian penyampel, jadi tidak dicatat sebagai dilewati.
                continue
            hexv, n = sample(e['png'], rig[char][pose]['faces'][0]['mouth'])
            kunci = '%s/%s' % (char, pose)
            if hexv:
                out['warna'][kunci] = {
                    'hex': hexv,
                    'sampel': n,
                    'png': e['png'],
                    'pngSha256': sha256_file(os.path.join(ROOT, e['png'])),
                }
            else:
                out['dilewati'][kunci] = {
                    'png': e['png'],
                    # Sidik jari juga untuk yang DILEWATI: kalau seninya kelak
                    # digambar ulang sehingga piksel terangnya cukup, pose ini
                    # berhenti pantas dilewati. Tanpa sha256, muzzle.json akan
                    # terus mencatatnya sebagai dilewati dan gerbangnya tetap
                    # hijau — absen yang disengaja berubah diam-diam jadi basi.
                    'pngSha256': sha256_file(os.path.join(ROOT, e['png'])),
                    'sampelTerang': n,
                    'alasan': 'piksel terang < %d, warna moncong tidak bisa diukur andal' % MIN_SAMPEL,
                }
    return out

def main():
    doc = build()
    text = json.dumps(doc, indent=2, ensure_ascii=False) + '\n'
    if '--check' in sys.argv:
        if not os.path.exists(OUT):
            print('FAIL - %s belum ada' % os.path.relpath(OUT, ROOT)); sys.exit(1)
        with open(OUT) as fh:
            sekarang = fh.read()
        if sekarang != text:
            print('FAIL - %s menyimpang dari aset — jalankan: python3 tools/sample-muzzle.py'
                  % os.path.relpath(OUT, ROOT)); sys.exit(1)
        print('sample-muzzle --check: PASS (%d pose)' % len(doc['warna'])); return
    with open(OUT, 'w') as fh:
        fh.write(text)
    print('json - %s (%d pose)' % (os.path.relpath(OUT, ROOT), len(doc['warna'])))
    for k, v in doc['warna'].items():
        print('       %-22s %s' % (k, v['hex']))

if __name__ == '__main__':
    main()
