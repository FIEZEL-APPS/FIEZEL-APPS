# -*- coding: utf-8 -*-
"""Generate layar B (quiz grammar) — FIEZEL rebrand 'Warm Paper, Bright Mind'."""
import pathlib

OUT = pathlib.Path("/home/user/workspace/redesign/screens/b")

# ---------- lucide-style icons (stroke 1.75) ----------
def ic(paths, size=20, vb=24):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {vb} {vb}" fill="none" '
            f'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{paths}</svg>')

I_X = ic('<path d="M18 6 6 18M6 6l12 12"/>', 16)
I_ARROW = ic('<path d="M5 12h14M13 6l6 6-6 6"/>', 16)
I_CHECK = ic('<path d="M20 6 9 17l-5-5"/>', 16)
I_CHECK_S = ic('<path d="M20 6 9 17l-5-5"/>', 14)
I_LAMP = ic('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0 0 12 3Z"/>', 18)
I_SPARK = ic('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"/>', 18)
I_LOCK = ic('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', 16)
I_CHEV = ic('<path d="M9 6l6 6-6 6"/>', 18)
I_SLIDERS = ic('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4"/>', 20)
I_SAVE = ic('<path d="M20 6 9 17l-5-5"/>', 14)
NAV_HOME = ic('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>', 22)
NAV_VOCAB = ic('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 16l3-8 3 8M10.2 13.5h3.6"/>', 22)
NAV_GRAMMAR = ic('<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z"/>', 22)
NAV_READ = ic('<path d="M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2Z"/><path d="M12 6v14"/>', 22)
NAV_MAP = ic('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>', 22)

# ---------- mascot variants (PAW, dari aset brand, ekspresi kontekstual) ----------
def mascot(variant, label):
    ears = ('<path d="M76 66 L 95 0 L 140 34 Z" fill="#FFD94F"/>'
            '<path d="M90 52 L 101 17 L 125 35 Z" fill="#8C2233"/>'
            '<path d="M244 66 L 225 0 L 180 34 Z" fill="#FFD94F"/>'
            '<path d="M230 52 L 219 17 L 195 35 Z" fill="#8C2233"/>')
    head = '<circle cx="160" cy="106" r="88" fill="#FFD94F"/>'
    muzzle = ('<ellipse cx="160" cy="140" rx="36" ry="25" fill="#FFF4DA"/>'
              '<path d="M153 126 L 167 126 L 160 136 Z" fill="#8C2233"/>')
    cheeks = '<circle cx="102" cy="126" r="11" fill="#F0A0AC"/><circle cx="218" cy="126" r="11" fill="#F0A0AC"/>'
    if variant == "default":
        eyes = ('<g><circle cx="126" cy="98" r="14.5" fill="#33201F"/><circle cx="130" cy="93" r="5" fill="#fff"/></g>'
                '<g><circle cx="194" cy="98" r="14.5" fill="#33201F"/><circle cx="198" cy="93" r="5" fill="#fff"/></g>')
        mouth = '<path d="M148 148 C 154 155 166 155 172 148" stroke="#33201F" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
        extra = ''
    elif variant == "thinking":
        eyes = ('<g><circle cx="130" cy="92" r="12" fill="#33201F"/><circle cx="134" cy="88" r="4" fill="#fff"/></g>'
                '<g><circle cx="198" cy="92" r="12" fill="#33201F"/><circle cx="202" cy="88" r="4" fill="#fff"/></g>'
                '<path d="M112 76 C 118 70 130 69 138 73" stroke="#33201F" stroke-width="5" stroke-linecap="round" fill="none"/>'
                '<path d="M182 73 C 190 69 202 70 208 76" stroke="#33201F" stroke-width="5" stroke-linecap="round" fill="none"/>')
        mouth = '<path d="M150 150 L 170 150" stroke="#33201F" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
        extra = ('<circle cx="236" cy="18" r="6" fill="#E6A800"/>'
                 '<circle cx="250" cy="4" r="4.5" fill="#E6A800" opacity=".7"/>'
                 '<circle cx="226" cy="34" r="7.5" fill="#E6A800" opacity=".9"/>')
    elif variant == "correct":
        eyes = ('<path d="M112 100 C 118 88 134 88 140 100" stroke="#33201F" stroke-width="7" stroke-linecap="round" fill="none"/>'
                '<path d="M180 100 C 186 88 202 88 208 100" stroke="#33201F" stroke-width="7" stroke-linecap="round" fill="none"/>')
        mouth = '<path d="M144 144 C 152 158 168 158 176 144" stroke="#33201F" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
        extra = ('<path d="M250 26l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#E6A800"/>'
                 '<path d="M70 8l2.4 5.6L78 16l-5.6 2.4L70 24l-2.4-5.6L62 16l5.6-2.4L70 8Z" fill="#E6A800" opacity=".85"/>')
    elif variant == "encouraging":
        eyes = ('<g><circle cx="126" cy="98" r="14.5" fill="#33201F"/><circle cx="130" cy="93" r="5" fill="#fff"/></g>'
                '<g><circle cx="194" cy="98" r="14.5" fill="#33201F"/><circle cx="198" cy="93" r="5" fill="#fff"/></g>'
                '<path d="M114 72 C 121 68 130 68 136 71" stroke="#33201F" stroke-width="4.5" stroke-linecap="round" fill="none"/>'
                '<path d="M184 71 C 190 68 199 68 206 72" stroke="#33201F" stroke-width="4.5" stroke-linecap="round" fill="none"/>')
        mouth = '<path d="M150 149 C 155 154 165 154 170 149" stroke="#33201F" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
        extra = ''
    else:  # hinting
        eyes = ('<g><circle cx="126" cy="98" r="14.5" fill="#33201F"/><circle cx="130" cy="93" r="5" fill="#fff"/></g>'
                '<path d="M182 96 C 188 89 200 89 206 96" stroke="#33201F" stroke-width="7" stroke-linecap="round" fill="none"/>')
        mouth = '<path d="M146 146 C 153 156 167 156 174 146" stroke="#33201F" stroke-width="5.5" stroke-linecap="round" fill="none"/>'
        extra = ('<g transform="translate(232,2)"><circle cx="12" cy="12" r="12" fill="#E6A800"/>'
                 '<path d="M8.5 15h7M9.5 17.5h5M12 5.5a4.2 4.2 0 0 0-2.8 7.3c.4.4.8 1 .8 1.7h4c0-.7.4-1.3.8-1.7A4.2 4.2 0 0 0 12 5.5Z" stroke="#241A11" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>')
    return (f'<svg viewBox="56 -14 208 224" role="img" aria-label="{label}">'
            f'{extra}{ears}{head}{muzzle}{cheeks}{eyes}{mouth}</svg>')

# ---------- neural lines (Bright Mind) ----------
NEURAL = ('<svg class="neural" viewBox="0 0 358 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
          '<g stroke="#FFC700" stroke-width="1" fill="none" opacity=".65">'
          '<path d="M-10 96 C 60 70, 110 108, 178 84 S 300 40, 372 66"/>'
          '<path d="M-10 40 C 70 66, 140 22, 210 44 S 320 88, 372 30"/>'
          '<path d="M40 -10 C 60 40, 30 80, 70 130"/>'
          '<path d="M300 -10 C 280 30, 320 70, 292 130"/></g>'
          '<g fill="#FFC700"><circle cx="70" cy="63" r="2.5"/><circle cx="178" cy="84" r="3"/>'
          '<circle cx="210" cy="44" r="2.5"/><circle cx="292" cy="55" r="2"/><circle cx="120" cy="34" r="2"/></g></svg>')

# ---------- chrome ----------
def topbar():
    return f'''<header class="topbar">
  <div class="wordmark" role="img" aria-label="FIEZEL">F<span class="wm-i"><i></i><i></i></span>EZEL</div>
  <div class="top-actions">
    <button class="ask-btn">{I_SPARK} Tanya FIEZEL?</button>
    <button class="icon-btn" aria-label="Pengaturan">{I_SLIDERS}</button>
  </div>
</header>'''

def quizbar(n, next_state, ctx=None):
    pct = round(n / 25 * 100)
    counter = f'<div class="counter" aria-label="Soal {n} dari 25">{n}<small> / 25</small>'
    if ctx:
        counter += f'<span class="ctx">{ctx}</span>'
    counter += '</div>'
    if next_state == "on":
        nxt = f'<button class="next-btn is-on">Lanjut {I_ARROW}</button>'
    else:
        nxt = f'<button class="next-btn is-off" disabled aria-disabled="true">{I_LOCK} Lanjut</button>'
    return f'''<div class="quizbar">
  <button class="exit-btn">{I_X} Keluar</button>
  {counter}
  {nxt}
</div>
<div class="progress" role="progressbar" aria-valuenow="{n}" aria-valuemin="0" aria-valuemax="25"><i style="width:{pct}%"></i></div>'''

def dock(variant, label, bubble=None):
    b = ''
    if bubble:
        b = (f'<div class="coach-bubble" role="status"><p>{bubble}</p>'
             f'<button class="coach-close" aria-label="Tutup pesan">{I_X}</button></div>')
    return f'''<aside class="dock">
  {b}
  <div class="mascot">{mascot(variant, label)}</div>
</aside>'''

def nav():
    items = [("Home", NAV_HOME, False), ("Vocab", NAV_VOCAB, False), ("Grammar", NAV_GRAMMAR, True),
             ("Reading", NAV_READ, False), ("Peta", NAV_MAP, False)]
    links = ''.join(
        f'<a href="#" class="{"active" if a else ""}"{" aria-current=\"page\"" if a else ""}>'
        f'<span class="ico">{icn}</span>{lbl}</a>' for lbl, icn, a in items)
    return f'<nav class="nav" aria-label="Navigasi utama">{links}</nav>'

def page(title, n, next_state, body, dock_html, ctx=None):
    return f'''<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=390, initial-scale=1">
<title>FIEZEL — {title}</title>
<link rel="stylesheet" href="fz.css">
</head>
<body>
<div class="phone">
{topbar()}
{quizbar(n, next_state, ctx)}
<main class="content">
{body}
</main>
{dock_html}
{nav()}
</div>
</body>
</html>'''

EYEBROW = 'Kata ganti subjek, objek &amp; kepemilikan'

def qcard(help_text=None):
    h = f'<p class="q-help">{help_text}</p>' if help_text else ''
    return f'''<section class="card">
  <div class="eyebrow">{EYEBROW} · Soal 1</div>
  <h1 class="q-title"><span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span> name is Sari.</h1>
  {h}
</section>'''

def opt(letter, word, state="", mark="", tag="", review=False):
    cls = "option"
    if state: cls += f" is-{state}"
    if review: cls += " is-review"
    m = f'<span class="mark">{mark}</span>' if mark else ''
    t = f'<span class="tag {state if state in ("good","bad") else ""}">{tag}</span>' if tag else ''
    return f'<button class="{cls}"><span class="key">{letter}</span>{word}{m}{t}</button>'

# ============================================================
# 1. quiz.html — kartu soal + 4 opsi default
# ============================================================
body1 = f'''{qcard("Pilih kata yang paling pas untuk mengisi bagian kosong.")}
<div class="options" role="group" aria-label="Pilihan jawaban">
{opt("A","She")}
{opt("B","Her")}
{opt("C","Me")}
{opt("D","Hers")}
</div>
<div class="core-panel" style="padding:14px 16px">{NEURAL}<div style="display:flex;align-items:center;gap:10px">
  <span class="core-eyebrow" style="letter-spacing:.14em">MODE ADAPTIF</span>
  <span style="font-size:13px;color:var(--on-core-muted)">FIEZEL menyesuaikan soal berikutnya dari jawabanmu.</span>
</div></div>'''
p1 = page("Quiz Grammar", 1, "off", body1,
          dock("default", "PAW, maskot FIEZEL",
               "Salah itu wajar — yang penting ngerti kenapanya."))

# ============================================================
# 2. quiz-analyzing.html — state ANALYZING (Bright Mind)
# ============================================================
body2 = f'''{qcard()}
<div class="options" role="group" aria-label="Pilihan jawaban (terkunci saat dianalisis)">
{opt("A","She", review=True)}
{opt("B","Her", state="picked", tag="PILIHANMU")}
{opt("C","Me", review=True)}
{opt("D","Hers", review=True)}
</div>
<section class="core-panel" aria-live="polite">{NEURAL}<div>
  <div class="core-eyebrow">ANALYZING</div>
  <div class="core-title">FIEZEL membaca jawabanmu…</div>
  <div class="core-sub">Mencocokkan pilihanmu dengan pola lesson: kata ganti subjek, objek &amp; kepemilikan.</div>
  <div class="core-bar"><i></i></div>
  <div class="core-dots" aria-hidden="true"><b></b><b></b><b></b></div>
</div></section>'''
p2 = page("Quiz — FIEZEL menganalisis", 1, "off", body2,
          dock("thinking", "PAW sedang berpikir"))

# ============================================================
# 3. quiz-correct.html — feedback benar + why card
# ============================================================
toast_ok = f'<div class="toast" role="status">{I_SAVE} Progres tersimpan · Streak 1/5 hari ini</div>'
body3 = f'''{toast_ok}
<div class="fb-banner good">
  <span class="fb-ico">{I_CHECK}</span>
  <div>
    <div class="fb-title">Benar, mantap!</div>
    <p class="fb-sub">Jawabanmu <b>Her</b> — jawaban yang paling tepat.</p>
  </div>
</div>
<div class="options" role="group" aria-label="Review jawaban">
{opt("B","Her", state="good", mark=I_CHECK_S, tag="BENAR")}
<div class="others" aria-label="Pilihan lain">
  <span class="mini"><small>A</small> She</span>
  <span class="mini"><small>C</small> Me</span>
  <span class="mini"><small>D</small> Hers</span>
</div>
</div>
<section class="why-card">
  <div class="eyebrow">Kenapa ini benar</div>
  <p class="why-body">Sesudah bagian kosong ada kata benda <b>“name”</b> — posisi itu butuh <b>bentuk kepemilikan</b>. Jadi pakai <b>Her</b>.</p>
  <div class="why-rule"><span class="chip">Her</span> + name {I_ARROW} kepemilikan sebelum kata benda</div>
  <button class="acc-head" aria-expanded="false" aria-controls="accOthers">Bandingkan pilihan lain {I_CHEV}</button>
  <div class="acc-list" id="accOthers" hidden>
    <div class="acc-item"><b>She</b><span>kata ganti subjek sebelum kata benda — posisi ini butuh bentuk kepemilikan.</span></div>
    <div class="acc-item"><b>Me</b><span>kata ganti objek di posisi yang butuh penanda kepemilikan.</span></div>
    <div class="acc-item"><b>Hers</b><span>bentuk milik yang berdiri sendiri — nggak dipakai tepat sebelum kata benda.</span></div>
  </div>
</section>
<div class="tip">{I_LAMP}<span><b>Inget:</b> fokus kata ganti subjek, objek, dan bentuk kepemilikan, ya. Cek kenapa tiap jebakan beda dari jawaban benar.</span></div>
<button class="ai-btn">{I_SPARK} Jelaskan dengan cara yang lebih sederhana</button>'''
p3 = page("Quiz — Benar", 1, "on", body3,
          dock("correct", "PAW merayakan jawaban benar", "Yes! Kamu nangkep polanya."))

# ============================================================
# 4. quiz-wrong.html — feedback salah encouraging + diagnosis
# ============================================================
body4 = f'''<div class="fb-banner bad">
  <span class="fb-ico">{I_X}</span>
  <div>
    <div class="fb-title">Belum tepat — nggak apa-apa.</div>
    <p class="fb-sub">Jawabanmu <b>She</b>. Tenang, kita bedah jawabannya bareng.</p>
  </div>
</div>
<div class="options" role="group" aria-label="Review jawaban">
{opt("A","She", state="bad", mark=I_X, tag="PILIHANMU")}
{opt("B","Her", state="good", mark=I_CHECK_S, tag="BENAR")}
<div class="others" aria-label="Pilihan lain">
  <span class="mini"><small>C</small> Me</span>
  <span class="mini"><small>D</small> Hers</span>
</div>
</div>
<section class="core-panel">{NEURAL}<div>
  <div class="core-eyebrow">DIAGNOSIS FIEZEL</div>
  <div class="core-sub" style="margin-top:8px;font-size:14px;color:var(--on-core)">Kamu pakai <b style="color:var(--sun)">kata ganti subjek</b> sebelum kata benda, padahal posisi sebelum “name” butuh <b style="color:var(--sun)">bentuk kepemilikan</b>.</div>
  <div class="core-sub" style="margin-top:6px">Pola ini muncul 2× di sesi ini — kita kunci dulu sebelum lanjut.</div>
</div></section>
<button class="cta">Lihat kenapa {I_ARROW}</button>
<button class="ghost-link"><u>Nanti aja — lanjut ke soal berikutnya</u></button>'''
p4 = page("Quiz — Belum tepat", 1, "on", body4,
          dock("encouraging", "PAW menyemangati", "Salah itu data — kita pakai buat belajar."))

# ============================================================
# 5. quiz-hint.html — teach pause, PROBE→HINT→EXAMPLE→EXPLAIN (langkah 2 aktif)
# ============================================================
body5 = f'''<section class="card">
  <div class="teach-head">
    <div class="teach-avatar">{mascot("hinting","PAW memberi petunjuk")}</div>
    <div>
      <div class="eyebrow" style="color:var(--info)">Ajar ulang</div>
      <h1 class="teach-title">Kata ganti subjek, objek &amp; kepemilikan</h1>
    </div>
  </div>
  <div class="diagnosis"><b>Yang bikin tadi keliru:</b> caranya bener, tapi itu cara dari lesson “Artikel a, an, the” — milih dari bunyi awal, bukan makna kalimat di kartu ini.</div>
  <div class="steps" aria-label="Tahap bantuan: langkah 2 dari 4 aktif">
    <div class="step done"><span class="bead">{I_CHECK_S}</span><span class="lbl">PROBE</span></div>
    <span class="step-link done"></span>
    <div class="step active" aria-current="step"><span class="bead">2</span><span class="lbl">HINT</span></div>
    <span class="step-link"></span>
    <div class="step"><span class="bead">3</span><span class="lbl">EXAMPLE</span></div>
    <span class="step-link"></span>
    <div class="step"><span class="bead">4</span><span class="lbl">EXPLAIN</span></div>
  </div>
  <div class="stage-prev">{I_CHECK_S}<span><b>Probe tadi:</b> “Coba baca ulang kalimatnya pelan-pelan ya.”</span></div>
  <div class="stage-now">
    <div class="eyebrow">Hint · langkah 2</div>
    <p>Mulai dari <b>subjek, kata kerja utama, dan waktu kejadian</b>. Setelah itu, cocokkan bentuk yang bikin makna kalimat lengkap dan wajar. Fokus khusus: kata ganti subjek, objek, dan bentuk kepemilikan.</p>
  </div>
  <div class="lock-row">
    <div class="stage-lock">{I_LOCK}<span><b>3 · Example</b> — soal mirip bareng FIEZEL</span></div>
    <div class="stage-lock">{I_LOCK}<span><b>4 · Explain</b> — penjelasan penuh</span></div>
  </div>
</section>
<button class="cta sticky">Oke, aku siap coba lagi {I_ARROW}</button>
<button class="ghost-link">{I_LAMP}<u>Masih bingung? Buka langkah 3: contoh</u></button>'''
p5 = page("Quiz — Jeda mengajar", 4, "off", body5, "", ctx="JEDA MENGAJAR")

for name, html in [("quiz.html", p1), ("quiz-analyzing.html", p2),
                   ("quiz-correct.html", p3), ("quiz-wrong.html", p4),
                   ("quiz-hint.html", p5)]:
    (OUT / name).write_text(html, encoding="utf-8")
    print("wrote", name)
