# Skrip verifikasi visual [FASE 7] lapisan slot PAW panel (12-lesson-layer.md).
# Empat viewport (tabel breakpoint 640/860/980 + landscape pendek), empat momen
# per soal (muncul / hover / dipilih / vonis), plus pemeriksaan invarian:
#   C1 tembus-pointer (elementFromPoint tidak pernah mengenai maskot/slot)
#   C2 kotak maskot tidak beririsan dengan stem/opsi/tombol Lanjut/feedback
#   C3 CLS: delta terhadap baseline TANPA slot ~ nol (PerformanceObserver layout-shift)
#   Kurangi-gerak: pose statis st-<pose>, animasi maskot mati.
from playwright.sync_api import sync_playwright
import json, os, sys

BASE = 'http://localhost:8199/index.html'
OUT = '/home/user/workspace/pau-redesign/implementation/shots/slot-layer'
os.makedirs(OUT, exist_ok=True)

VIEWPORTS = {
    'phone-390x844': ({'width': 390, 'height': 844}, 'fz-paw-peek'),
    'tablet-768x1024': ({'width': 768, 'height': 1024}, 'fz-paw-above'),
    'desktop-1280x800': ({'width': 1280, 'height': 800}, 'fz-paw-side'),
    'landscape-844x390': ({'width': 844, 'height': 390}, 'fz-paw-peek'),
}

BOOT = """() => {
  localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({done:true, at:Date.now(), via:'test', name:'Refa', goal:'', level:''}));
  localStorage.setItem('fiezel-tour-v1', 'test');
  // Bungkam popup masuk Puter dan pengingat lain supaya kuis tidak tertutup modal.
  localStorage.setItem('fiezel-puter-auth-skipped', '1');
  localStorage.setItem('fiezel-puter-popup-last', String(Date.now()));
}"""

CLS_INIT = """() => {
  window.__cls = 0;
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { if (!e.hadRecentInput) window.__cls += e.value; } }).observe({type:'layout-shift'}); } catch (e) {}
}"""

CHECKS = """() => {
  const out = {};
  const slot = document.querySelector('.fz-paw-slot');
  out.slotClass = slot ? slot.className : null;
  out.quizMascotOld = !!document.querySelector('.quiz-mascot');
  const m = slot && slot.querySelector('fiezel-mascot');
  out.mascotState = m ? [...m.classList].filter(c => c.startsWith('st-')).join(' ') : null;
  if (!slot) return out;
  // kotak piksel maskot yang terlihat: peek dipotong kotak slot; lainnya rect maskot
  const box = slot.classList.contains('fz-paw-peek') ? slot.getBoundingClientRect() : (m ? m.getBoundingClientRect() : slot.getBoundingClientRect());
  out.box = {x: box.x, y: box.y, w: box.width, h: box.height};
  const hit = (r) => !(box.right <= r.left || r.right <= box.left || box.bottom <= r.top || r.bottom <= box.top);
  out.overlaps = [];
  for (const sel of ['#quizStem', '#quizNext', '.quiz-topbar', '#feedback:not(.hidden)', '.fz-coach-bubble']) {
    const el = document.querySelector(sel);
    if (el && hit(el.getBoundingClientRect())) out.overlaps.push(sel);
  }
  document.querySelectorAll('.option').forEach((b, i) => { if (hit(b.getBoundingClientRect())) out.overlaps.push('.option#' + i); });
  // C1: titik tengah kotak maskot harus tembus ke elemen lain
  const under = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
  out.pointerHitsMascot = !!(under && (under.closest && (under.closest('fiezel-mascot') || under.closest('.fz-paw-slot'))));
  out.underEl = under ? (under.id || under.className || under.tagName).toString().slice(0, 60) : null;
  // geometri mentah untuk debugging jarak topbar <-> kartu
  const tb = document.querySelector('.quiz-topbar');
  const cd = document.querySelector('.card.has-paw-peek') || document.querySelector('.quiz-shell .card');
  out.geom = {topbarBottom: tb ? tb.getBoundingClientRect().bottom : null,
              cardTop: cd ? cd.getBoundingClientRect().top : null,
              scrollY: window.scrollY};
  return out;
}"""


def boot_to_quiz(page, kill_slot=False):
    """Boot bersih sampai layar kuis siap: lewati splash, tur, dan modal Puter."""
    page.goto(BASE, wait_until='domcontentloaded', timeout=30000)
    page.evaluate(BOOT)
    page.goto(BASE, wait_until='domcontentloaded', timeout=30000)
    # Tunggu boot selesai betulan (fungsi global + state hidup), bukan tebak-tebakan milidetik.
    page.wait_for_function("() => typeof window.startVocabQuiz === 'function' && typeof window.__getFiezelState === 'function' && window.__getFiezelState().view", timeout=25000)
    # Splash boot menutup layar +-4 detik dan menelan semua pointer; tunggu ia benar-benar pergi.
    page.wait_for_function("() => { const s = document.getElementById('fiezelBootSplash'); return !s || !s.isConnected || getComputedStyle(s).display === 'none' || getComputedStyle(s).opacity === '0'; }", timeout=25000)
    page.wait_for_timeout(1200)
    # Tur menu tersimpan di state.toursSeen (bukan kunci lepas) - tutup lewat tombol Lewati resmi.
    for _ in range(3):
        if not page.evaluate("() => { const s = document.querySelector('.fz-tour [data-tour-skip]'); if (s) { s.click(); return true; } const t = document.querySelector('.fz-tour'); if (t) { t.remove(); return true; } return false; }"):
            break
        page.wait_for_timeout(500)
    if kill_slot:
        page.evaluate("() => { try { delete self.FiezelPawSlot; } catch (e) { self.FiezelPawSlot = undefined; } }")
    for attempt in range(3):
        page.evaluate("() => { try { startVocabQuiz(); } catch (e) { window.__startErr = String(e); } }")
        try:
            page.wait_for_selector('.quiz-shell .option', timeout=6000)
            break
        except Exception:
            if attempt == 2:
                raise
            page.wait_for_timeout(1500)
    # Dialog ritual harian menutupi layar kuis pada boot pertama - tutup supaya
    # pengukuran overlap dan tangkapan layar memotret kuisnya, bukan dialognya.
    page.evaluate("() => { const r = document.getElementById('fzRitual'); if (r) r.remove(); window.scrollTo(0, 0); }")
    page.wait_for_timeout(300)


def quiz_flow(page, label, suffix, shots=True, kill_slot=False):
    """Boot -> kuis vocab -> interaksi; kembalikan (checks, cls, errs)."""
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    boot_to_quiz(page, kill_slot=kill_slot)
    page.wait_for_timeout(900)  # animasi enter selesai dulu, baru jendela CLS dibuka
    page.evaluate(CLS_INIT)
    if shots:
        page.screenshot(path=f'{OUT}/{label}-1-shown{suffix}.png')
    checks = {'shown': page.evaluate(CHECKS)}
    # hover jawaban
    page.evaluate("() => { document.body.classList.remove('auth-locked'); const m = document.querySelector('.modal-backdrop, .puter-auth-modal'); if (m) m.remove(); }")
    page.locator('.quiz-shell .option').nth(1).hover()
    page.wait_for_timeout(500)
    if shots:
        page.screenshot(path=f'{OUT}/{label}-2-hover{suffix}.png')
    # jawaban dipilih (klik tembus juga membuktikan C1 secara fungsional)
    page.locator('.quiz-shell .option').nth(0).click()
    page.wait_for_timeout(400)
    if shots:
        page.screenshot(path=f'{OUT}/{label}-3-picked{suffix}.png')
    page.wait_for_timeout(2200)  # vonis + feedback
    if shots:
        page.screenshot(path=f'{OUT}/{label}-4-verdict{suffix}.png')
    checks['verdict'] = page.evaluate(CHECKS)
    cls = page.evaluate('() => window.__cls')
    return checks, cls, errs


results = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for label, (vp, expect) in VIEWPORTS.items():
        ctx = b.new_context(viewport=vp, device_scale_factor=2)
        page = ctx.new_page()
        checks, cls, errs = quiz_flow(page, label, '')
        ctx.close()
        # baseline tanpa slot untuk delta CLS
        ctx2 = b.new_context(viewport=vp, device_scale_factor=2)
        page2 = ctx2.new_page()
        _, cls_base, _ = quiz_flow(page2, label, '-noslot', shots=False, kill_slot=True)
        ctx2.close()
        results[label] = {'expect': expect, 'checks': checks, 'cls_with_slot': cls,
                          'cls_baseline': cls_base, 'cls_delta': round(cls - cls_base, 5),
                          'pageerrors': errs[:5]}
        with open(f'{OUT}/slot-qa-results.json', 'w') as f:
            json.dump(results, f, indent=1)
    # kurangi-gerak: pose statis di phone + desktop
    for label, (vp, expect) in [('phone-390x844', VIEWPORTS['phone-390x844']), ('desktop-1280x800', VIEWPORTS['desktop-1280x800'])]:
        ctx = b.new_context(viewport=vp, reduced_motion='reduce', device_scale_factor=2)
        page = ctx.new_page()
        boot_to_quiz(page)
        page.wait_for_timeout(700)
        rm = page.evaluate("""() => {
          const m = document.querySelector('.fz-paw-slot fiezel-mascot');
          if (!m) return {slot: false};
          return {slot: true, isStatic: m.parentElement.classList.contains('is-static'),
                  pose: [...m.classList].filter(c => c.startsWith('st-')).join(' '),
                  anim: getComputedStyle(m).animationName};
        }""")
        page.screenshot(path=f'{OUT}/{label}-reduced-motion.png')
        results[label + '-reduced'] = rm
        ctx.close()
    b.close()

print(json.dumps(results, indent=1))
with open(f'{OUT}/slot-qa-results.json', 'w') as f:
    json.dump(results, f, indent=1)
