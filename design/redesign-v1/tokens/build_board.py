#!/usr/bin/env python3
"""Inline assets into board.html -> board_final.html, then screenshot 1600x2000."""
import re, pathlib

d = pathlib.Path('/home/user/workspace/redesign/tokens')
a = d / 'board-assets'
html = (d / 'board.html').read_text()

def icon(name, stroke='1.75'):
    s = (a / f'ic-{name}.svg').read_text()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = s.replace('stroke-width="2"', f'stroke-width="{stroke}"')
    s = s.replace('width="24"', 'width="100%"').replace('height="24"', 'height="100%"')
    return s

mascot = (a / 'mascot-full.svg').read_text()

repl = {
    '<!--MASCOT_FULL-->': mascot,
    '<!--MASCOT_FULL2-->': mascot,
    '<!--IC_CHECK-->': icon('check', '2.5'),
    '<!--IC_X-->': icon('x', '2.5'),
    '<!--IC_LOCK-->': icon('lock', '2'),
    '<!--IC_BRAIN-->': icon('brain'),
    '<!--IC_BRAIN2-->': icon('brain').replace('currentColor', '#FFC700'),
    '<!--IC_SPARKLES-->': icon('sparkles'),
    '<!--IC_BOOK-->': icon('book-open'),
    '<!--IC_HEADPHONES-->': icon('headphones'),
    '<!--IC_MIC-->': icon('mic'),
    '<!--IC_TARGET-->': icon('target'),
    '<!--IC_CHART-->': icon('bar-chart-3'),
    '<!--IC_LIGHTBULB-->': icon('lightbulb'),
    '<!--IC_AUDIO-->': icon('audio-lines'),
    '<!--IC_CHECK2-->': icon('check', '2.5'),
    '<!--IC_CHECK3-->': icon('check', '2.5'),
    '<!--IC_CHECK4-->': icon('check', '2.5'),
    '<!--IC_X2-->': icon('x', '2.5'),
    '<!--IC_X3-->': icon('x', '2.5'),
    '<!--IC_X4-->': icon('x', '2.5'),
}
for k, v in repl.items():
    assert k in html, k
    html = html.replace(k, v)

(d / 'board_final.html').write_text(html)
print('board_final.html written')

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1600, 'height': 2000}, device_scale_factor=1)
    pg.goto(f'file://{d}/board_final.html')
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(d / 'brand-board.png'))
    b.close()
print('brand-board.png saved')
