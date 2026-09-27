# python3 tools/sheet.py <folder> <keluar.jpg> [kolom] [lebar-sel] — contact sheet berlabel.
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4; cw = int(sys.argv[4]) if len(sys.argv) > 4 else 405
fs = sorted(glob.glob(os.path.join(d, '*.jpg')), key=lambda p: float(os.path.basename(p)[1:-4].replace('_', '.')))
ch = int(cw * 1920 / 1080); rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cw, rows * (ch + 26)), (30, 30, 30)); dr = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(f).resize((cw, ch)); x, y = (i % cols) * cw, (i // cols) * (ch + 26)
    sheet.paste(im, (x, y)); dr.text((x + 6, y + ch + 5), os.path.basename(f)[1:-4].replace('_', '.') + ' s', fill=(240, 240, 240))
sheet.save(out, quality=88); print(out, sheet.size)
