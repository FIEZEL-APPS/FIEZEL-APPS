import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
OUT_DIR = os.path.join(os.getcwd(), 'assets', 'marketing', 'instagram', 'story')
os.makedirs(OUT_DIR, exist_ok=True)

# Color Palette (BRIEF-IG50 locked)
C_BG_YELLOW = '#FDF3C9'
C_BG_PINK = '#F9E4DF'
C_BG_MINT = '#ECF6F0'
C_TERRACOTTA = '#AA4B35'
C_TERRACOTTA_DARK = '#7A3626'
C_GOLD = '#F0C241'
C_WHITE = '#FFFFFF'
C_FUR = '#FFD94F'
C_MAROON = '#8C2233'
C_CREAM = '#FFF4DA'

FONT_BOLD = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', 'segoeuib.ttf')
FONT_REG = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', 'segoeui.ttf')

def get_font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REG
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def draw_sparkle(draw, cx, cy, size=24, color='#F0C241'):
    pts = [
        (cx, cy - size), (cx + size*0.35, cy - size*0.35),
        (cx + size, cy), (cx + size*0.35, cy + size*0.35),
        (cx, cy + size), (cx - size*0.35, cy + size*0.35),
        (cx - size, cy), (cx - size*0.35, cy - size*0.35)
    ]
    draw.polygon(pts, fill=color)

def draw_header(draw, seri_text):
    draw.rounded_rectangle([72, 110, 72+46, 110+46], radius=14, fill=C_TERRACOTTA)
    draw.ellipse([72+10, 110+10, 72+36, 110+36], fill=C_BG_YELLOW)
    f_logo = get_font(40, bold=True)
    draw.text((134, 110), 'FIEZEL', fill=C_TERRACOTTA, font=f_logo)

    f_seri = get_font(30, bold=True)
    draw.text((W - 72, 118), seri_text, fill=C_TERRACOTTA, font=f_seri, anchor='ra')
    draw.line([(72, 185), (W - 72, 185)], fill=C_TERRACOTTA, width=3)

def draw_footer(draw, chip_text):
    draw.line([(72, 1725), (W - 72, 1725)], fill=C_TERRACOTTA, width=3)
    f_chip = get_font(30, bold=True)
    bbox = f_chip.getbbox(chip_text)
    tw = bbox[2] - bbox[0]
    draw.rounded_rectangle([72, 1760, 72 + tw + 60, 1760 + 72], radius=36, fill=C_TERRACOTTA)
    draw.text((72 + 30, 1778), chip_text, fill=C_BG_YELLOW, font=f_chip)

    f_wm = get_font(30, bold=True)
    draw.text((W - 72, 1780), 'fiezel.my.id', fill=C_TERRACOTTA, font=f_wm, anchor='ra')

def draw_paw(draw, cx, cy, scale=1.0, mood='happy'):
    bw, bh = int(116 * scale), int(96 * scale)
    draw.rounded_rectangle([cx - bw//2, cy + int(4*scale), cx + bw//2, cy + int(100*scale)], radius=int(42*scale), fill=C_FUR)

    cw, ch = int(72 * scale), int(56 * scale)
    draw.ellipse([cx - cw//2, cy + int(42*scale), cx + cw//2, cy + int(42*scale) + ch], fill=C_CREAM)
    draw.rounded_rectangle([cx - int(4*scale), cy + int(58*scale), cx + int(4*scale), cy + int(70*scale)], radius=int(2*scale), fill=C_MAROON)

    hw, hh = int(116 * scale), int(92 * scale)
    hy = cy - int(20*scale)

    draw.polygon([(cx - int(48*scale), hy - int(10*scale)), (cx - int(32*scale), hy - int(55*scale)), (cx - int(12*scale), hy - int(20*scale))], fill=C_MAROON)
    draw.polygon([(cx - int(44*scale), hy - int(12*scale)), (cx - int(32*scale), hy - int(46*scale)), (cx - int(18*scale), hy - int(20*scale))], fill=C_FUR)
    draw.polygon([(cx + int(48*scale), hy - int(10*scale)), (cx + int(32*scale), hy - int(55*scale)), (cx + int(12*scale), hy - int(20*scale))], fill=C_MAROON)
    draw.polygon([(cx + int(44*scale), hy - int(12*scale)), (cx + int(32*scale), hy - int(46*scale)), (cx + int(18*scale), hy - int(20*scale))], fill=C_FUR)

    draw.ellipse([cx - hw//2, hy - hh//2, cx + hw//2, hy + hh//2], fill=C_FUR)
    draw.ellipse([cx - int(40*scale), hy + int(8*scale), cx - int(24*scale), hy + int(24*scale)], fill='#F0A0AC')
    draw.ellipse([cx + int(24*scale), hy + int(8*scale), cx + int(40*scale), hy + int(24*scale)], fill='#F0A0AC')

    draw.ellipse([cx - int(20*scale), hy + int(4*scale), cx + int(20*scale), hy + int(24*scale)], fill=C_CREAM)
    draw.polygon([(cx, hy + int(10*scale)), (cx - int(4*scale), hy + int(15*scale)), (cx + int(4*scale), hy + int(15*scale))], fill=C_MAROON)

    if mood == 'curious':
        draw.ellipse([cx - int(26*scale), hy - int(8*scale), cx - int(14*scale), hy + int(4*scale)], fill=C_MAROON)
        draw.ellipse([cx + int(14*scale), hy - int(5*scale), cx + int(26*scale), hy], fill=C_MAROON)
        draw.arc([cx - int(6*scale), hy + int(14*scale), cx + int(6*scale), hy + int(22*scale)], start=0, end=180, fill=C_MAROON, width=int(3*scale))
    elif mood == 'sleepy':
        draw.arc([cx - int(26*scale), hy - int(6*scale), cx - int(14*scale), hy + int(4*scale)], start=0, end=180, fill=C_MAROON, width=int(4*scale))
        draw.arc([cx + int(14*scale), hy - int(6*scale), cx + int(26*scale), hy + int(4*scale)], start=0, end=180, fill=C_MAROON, width=int(4*scale))
    else:
        draw.arc([cx - int(26*scale), hy - int(10*scale), cx - int(14*scale), hy + int(2*scale)], start=200, end=340, fill=C_MAROON, width=int(4*scale))
        draw.arc([cx + int(14*scale), hy - int(10*scale), cx + int(26*scale), hy + int(2*scale)], start=200, end=340, fill=C_MAROON, width=int(4*scale))
        draw.arc([cx - int(8*scale), hy + int(14*scale), cx + int(8*scale), hy + int(26*scale)], start=0, end=180, fill=C_MAROON, width=int(3.5*scale))

# 1. QUIZ
img1 = Image.new('RGB', (W, H), C_BG_MINT)
draw1 = ImageDraw.Draw(img1)
draw_header(draw1, 'QUIZ · 01')
draw_sparkle(draw1, 950, 260, 28)
draw_sparkle(draw1, 140, 1600, 24)
draw1.rounded_rectangle([72, 280, 72 + 280, 280 + 56], radius=28, fill=C_WHITE, outline=C_TERRACOTTA, width=2)
f_kicker = get_font(24, bold=True)
draw1.text((72 + 25, 292), 'VOCAB CHECK', fill=C_TERRACOTTA, font=f_kicker)

f_title = get_font(58, bold=True)
draw1.text((72, 380), 'Kata ', fill=C_TERRACOTTA, font=f_title)
draw1.rounded_rectangle([210, 375, 545, 455], radius=16, fill=C_GOLD)
draw1.text((230, 380), '\"Abundant\"', fill=C_TERRACOTTA_DARK, font=f_title)
draw1.text((72, 470), 'artinya apa sih?', fill=C_TERRACOTTA, font=f_title)

draw1.rounded_rectangle([72, 600, W - 72, 1160], radius=36, fill=C_WHITE, outline=C_TERRACOTTA, width=3)
f_sticker_head = get_font(28, bold=True)
draw1.text((W//2, 650), 'TEBAK JAWABAN LU', fill=C_TERRACOTTA_DARK, font=f_sticker_head, anchor='mm')

draw1.rounded_rectangle([112, 730, W - 112, 870], radius=28, fill=C_BG_YELLOW, outline=C_TERRACOTTA, width=2)
f_opt = get_font(34, bold=True)
draw1.text((150, 780), 'A. Banyak banget / Melimpah', fill=C_TERRACOTTA_DARK, font=f_opt)

draw1.rounded_rectangle([112, 910, W - 112, 1050], radius=28, fill=C_BG_PINK, outline=C_TERRACOTTA, width=2)
draw1.text((150, 960), 'B. Langka / Jarang ada', fill=C_TERRACOTTA_DARK, font=f_opt)

draw_paw(draw1, W//2, 1420, scale=2.2, mood='curious')
f_sub = get_font(28, bold=True)
draw1.text((W//2, 1640), 'Yuk vote di stiker quiz dan cek jawabannya!', fill=C_TERRACOTTA_DARK, font=f_sub, anchor='mm')
draw_footer(draw1, 'Tebak di Quiz!')
p1 = os.path.join(OUT_DIR, 'story-quiz-01.png')
img1.save(p1, 'PNG')
print('Rendered:', p1)

# 2. TOEFL
img2 = Image.new('RGB', (W, H), C_BG_YELLOW)
draw2 = ImageDraw.Draw(img2)
draw_header(draw2, 'TOEFL · 01')
draw_sparkle(draw2, 940, 270, 26)
draw_sparkle(draw2, 120, 1580, 24)
draw2.rounded_rectangle([72, 280, 72 + 260, 280 + 56], radius=28, fill=C_WHITE, outline=C_TERRACOTTA, width=2)
draw2.text((72 + 25, 292), 'TAU GA SIH?', fill=C_TERRACOTTA, font=f_kicker)

draw2.text((72, 380), 'TOEFL ITP itu ada', fill=C_TERRACOTTA, font=f_title)
draw2.rounded_rectangle([72, 465, 335, 545], radius=16, fill=C_GOLD)
draw2.text((85, 470), '140 Soal', fill=C_TERRACOTTA_DARK, font=f_title)
draw2.text((360, 470), 'dalam ±115 Menit!', fill=C_TERRACOTTA, font=f_title)

cards = [
    ('Listening Comprehension', '50 Soal · 35 Menit', C_BG_MINT, 620),
    ('Structure & Written', '40 Soal · 25 Menit', C_BG_PINK, 820),
    ('Reading Comprehension', '50 Soal · 55 Menit', C_WHITE, 1020),
]
for title, sub, bg, cy in cards:
    draw2.rounded_rectangle([72, cy, W - 72, cy + 160], radius=32, fill=bg, outline=C_TERRACOTTA, width=2)
    draw2.text((120, cy + 35), title, fill=C_TERRACOTTA_DARK, font=get_font(34, bold=True))
    draw2.text((120, cy + 90), sub, fill=C_TERRACOTTA, font=get_font(28, bold=True))

draw2.rounded_rectangle([72, 1240, W - 72, 1420], radius=32, fill=C_WHITE, outline=C_TERRACOTTA, width=2)
draw2.text((120, 1280), 'Pacing Tips:', fill=C_TERRACOTTA, font=get_font(30, bold=True))
draw2.text((120, 1340), 'Structure cuma punya ~37 detik per soal! Latihan rutin wajib.', fill=C_TERRACOTTA_DARK, font=get_font(26))
draw_paw(draw2, W//2, 1560, scale=1.6, mood='happy')
draw_footer(draw2, 'Save dulu, pasti kepake!')
p2 = os.path.join(OUT_DIR, 'story-toefl-01.png')
img2.save(p2, 'PNG')
print('Rendered:', p2)

# 3. MEME
img3 = Image.new('RGB', (W, H), C_BG_PINK)
draw3 = ImageDraw.Draw(img3)
draw_header(draw3, 'MEME · 01')
draw_sparkle(draw3, 950, 260, 28)
draw3.rounded_rectangle([72, 280, 72 + 250, 280 + 56], radius=28, fill=C_WHITE, outline=C_TERRACOTTA, width=2)
draw3.text((72 + 25, 292), 'REAL TALK', fill=C_TERRACOTTA, font=f_kicker)

draw3.rounded_rectangle([72, 390, W - 72, 1140], radius=36, fill=C_WHITE, outline=C_TERRACOTTA, width=3)
draw3.rounded_rectangle([112, 430, W - 112, 730], radius=28, fill=C_BG_YELLOW, outline=C_TERRACOTTA, width=2)
draw3.text((150, 465), 'Niat gue jam 19.00:', fill=C_TERRACOTTA, font=get_font(26, bold=True))
draw3.text((150, 520), '\"Malam ini pokoknya kelarin', fill=C_TERRACOTTA_DARK, font=get_font(34, bold=True))
draw3.text((150, 580), '3 bab grammar dan 20 vocab!\"', fill=C_TERRACOTTA_DARK, font=get_font(34, bold=True))

draw3.rounded_rectangle([112, 770, W - 112, 1070], radius=28, fill=C_BG_PINK, outline=C_TERRACOTTA, width=2)
draw3.text((150, 805), 'Kenyataan jam 21.30:', fill=C_TERRACOTTA, font=get_font(26, bold=True))
draw3.text((150, 860), 'Malah scroll video kucing', fill=C_TERRACOTTA_DARK, font=get_font(34, bold=True))
draw3.text((150, 920), 'sambil rebahan di kasur...', fill=C_TERRACOTTA_DARK, font=get_font(34, bold=True))

draw_paw(draw3, W//2, 1340, scale=2.2, mood='sleepy')
draw3.text((W//2 + 150, 1260), 'Zzz...', fill=C_TERRACOTTA, font=get_font(40, bold=True))
draw3.text((W//2, 1580), 'Di FIEZEL 5 menit sehari aja cukup, gausah maksain 2 jam!', fill=C_TERRACOTTA_DARK, font=get_font(28, bold=True), anchor='mm')
draw_footer(draw3, 'Tag temen lu yang begini')
p3 = os.path.join(OUT_DIR, 'story-meme-01.png')
img3.save(p3, 'PNG')
print('Rendered:', p3)

# 4. PROMO
img4 = Image.new('RGB', (W, H), C_BG_YELLOW)
draw4 = ImageDraw.Draw(img4)
draw_header(draw4, 'PROMO · 01')
draw_sparkle(draw4, 940, 260, 28)
draw_sparkle(draw4, 130, 1600, 24)
draw4.rounded_rectangle([72, 280, 72 + 420, 280 + 56], radius=28, fill=C_WHITE, outline=C_TERRACOTTA, width=2)
draw4.text((72 + 25, 292), 'RUANG BELAJAR PERSONAL', fill=C_TERRACOTTA, font=f_kicker)

draw4.text((72, 380), 'Belajar TOEFL, Grammar,', fill=C_TERRACOTTA, font=f_title)
draw4.text((72, 470), 'dan Vocab ', fill=C_TERRACOTTA, font=f_title)
draw4.rounded_rectangle([340, 465, 560, 545], radius=16, fill=C_GOLD)
draw4.text((360, 470), 'Gratis', fill=C_TERRACOTTA_DARK, font=f_title)

draw4.rounded_rectangle([72, 590, W - 72, 1080], radius=36, fill=C_WHITE, outline=C_TERRACOTTA, width=3)
features = [
    ('180 Materi Grammar Lengkap (A1–C2)', '4.500+ latihan interaktif terstruktur', C_BG_MINT, 630),
    ('2.440 Kosakata dan Audio Asli', 'Latih speaking & listening percaya diri', C_BG_PINK, 780),
    ('100% Gratis & Pasang ke HP (PWA)', 'Langsung buka tanpa download file berat', C_BG_YELLOW, 930),
]
for title, sub, bg, cy in features:
    draw4.rounded_rectangle([102, cy, W - 102, cy + 120], radius=24, fill=bg)
    draw4.text((130, cy + 20), title, fill=C_TERRACOTTA_DARK, font=get_font(30, bold=True))
    draw4.text((170, cy + 65), sub, fill=C_TERRACOTTA, font=get_font(24))

draw4.rounded_rectangle([180, 1140, W - 180, 1260], radius=40, fill=C_WHITE, outline=C_TERRACOTTA, width=3)
draw4.text((W//2, 1200), 'fiezel.my.id', fill=C_TERRACOTTA, font=get_font(44, bold=True), anchor='mm')
draw_paw(draw4, W//2, 1460, scale=2.2, mood='happy')
draw4.text((W//2, 1640), 'Tinggal klik link di bio atau buka langsung di browser!', fill=C_TERRACOTTA_DARK, font=get_font(28, bold=True), anchor='mm')
draw_footer(draw4, 'Buka di Bio / Browser')
p4 = os.path.join(OUT_DIR, 'story-promo-01.png')
img4.save(p4, 'PNG')
print('Rendered:', p4)
