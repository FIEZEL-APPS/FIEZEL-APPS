# [FASE 7] QA layar buntu Writing (empty state) + uji negatif hub/flashcard.
# Layar buntu dipaksa nyata: bank writing diganti prompts level A1 saja lewat route,
# lalu level aktif dipatok C2 -> writingPromptFor() null -> cabang empty state tercat.
from playwright.sync_api import sync_playwright
import json, os

BASE = 'http://localhost:8199/index.html'
OUT = '/home/user/workspace/pau-redesign/implementation/shots/slot-layer'
os.makedirs(OUT, exist_ok=True)

BOOT = """() => {
  localStorage.setItem('fiezel-onboarding-v1', JSON.stringify({done:true, at:Date.now(), via:'test', name:'Refa'}));
  localStorage.setItem('fiezel-tour-v1', 'test');
  localStorage.setItem('fiezel-puter-auth-skipped', '1');
  localStorage.setItem('fiezel-puter-popup-last', String(Date.now()));
  // Level aktif C2 supaya bank A1 palsu menghasilkan pool kosong.
  localStorage.setItem('fiezel-v4-state', JSON.stringify({preferences:{activeLevel:'C2', levelMode:'manual'}}));
}"""

FAKE_BANK = json.dumps({'prompts': [{'id': 'w-a1-1', 'level': 'A1', 'target': 40, 'en': 'x', 'id_hint': 'x'}], 'rubric': {'criteria': []}, 'examTasks': {}})


def boot(page):
    page.route('**/writing-prompts-v1.json', lambda r: r.fulfill(status=200, content_type='application/json', body=FAKE_BANK))
    # Kunci di-seed SEBELUM skrip halaman jalan; kalau di-seed setelah boot, save()
    # asinkron milik app menimpa seed sebelum muat ulang membacanya.
    page.add_init_script('(' + BOOT + ')()')  # add_init_script tidak memanggil arrow function sendiri
    page.goto(BASE, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_function("() => typeof window.go === 'function' && typeof window.__getFiezelState === 'function' && window.__getFiezelState().view", timeout=25000)
    page.wait_for_function("() => { const s = document.getElementById('fiezelBootSplash'); return !s || !s.isConnected || getComputedStyle(s).display === 'none' || getComputedStyle(s).opacity === '0'; }", timeout=25000)
    page.wait_for_timeout(1000)
    for _ in range(3):
        if not page.evaluate("() => { const s = document.querySelector('.fz-tour [data-tour-skip]'); if (s) { s.click(); return true; } return false; }"):
            break
        page.wait_for_timeout(400)
    page.evaluate("() => { const r = document.getElementById('fzRitual'); if (r) r.remove(); }")


results = {}
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for label, vp in [('phone-390x844', {'width': 390, 'height': 844}), ('desktop-1280x800', {'width': 1280, 'height': 800})]:
        # service worker diblok: kalau tidak, SW menyajikan writing-prompts-v1.json asli
        # dari precache dan route palsu di atas tidak pernah kena.
        ctx = b.new_context(viewport=vp, device_scale_factor=2, service_workers='block')
        page = ctx.new_page()
        boot(page)
        probe = page.evaluate("() => ({lvl: window.__getFiezelState().preferences.activeLevel, mode: window.__getFiezelState().preferences.levelMode})")
        # Uji negatif: hub (home) dan vocab TIDAK boleh punya slot PAW panel.
        neg = {'home': page.evaluate("() => !!document.querySelector('.fz-paw-slot')")}
        page.evaluate("() => go('vocab')")
        page.wait_for_timeout(900)
        neg['vocab'] = page.evaluate("() => !!document.querySelector('.fz-paw-slot')")
        page.evaluate("() => go('grammar')")
        page.wait_for_timeout(900)
        neg['grammar-hub'] = page.evaluate("() => !!document.querySelector('.fz-paw-slot')")
        # Layar buntu writing
        page.evaluate("() => go('writing')")
        page.wait_for_timeout(1200)
        info = page.evaluate("""() => {
          const slot = document.querySelector('.writing-page .fz-paw-slot');
          const m = slot && slot.querySelector('fiezel-mascot');
          const head = document.querySelector('.writing-page .section-head');
          let overlap = null;
          if (m && head) {
            const a = m.getBoundingClientRect(), b2 = head.getBoundingClientRect();
            overlap = !(a.right <= b2.left || b2.right <= a.left || a.bottom <= b2.top || b2.bottom <= a.top);
          }
          const under = m ? document.elementFromPoint(m.getBoundingClientRect().x + 10, m.getBoundingClientRect().y + 10) : null;
          return {slotClass: slot ? slot.className : null,
                  pose: m ? [...m.classList].filter(c => c.startsWith('st-') || c.startsWith('fz-m-enter')).join(' ') : null,
                  promptGone: !document.querySelector('#writingBox'),
                  headOverlap: overlap,
                  pointerHitsMascot: !!(under && under.closest && (under.closest('.fz-paw-slot')))};
        }""")
        page.screenshot(path=f'{OUT}/empty-writing-{label}.png')
        results[label] = {'probe': probe, 'negative_surfaces_have_slot': neg, 'empty_state': info}
        ctx.close()
    b.close()

print(json.dumps(results, indent=1))
with open(f'{OUT}/empty-state-qa-results.json', 'w') as f:
    json.dump(results, f, indent=1)
