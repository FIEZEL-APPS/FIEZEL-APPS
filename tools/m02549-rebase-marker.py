#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one anchor, found {count}: {old!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'features/neural-voice/fiezel-diag-panel.js',
    "var DIAG_BUILD = 'm025-48';",
    "var DIAG_BUILD = 'm025-49';"
)
replace_once(
    'sw.js',
    "const SW_REV='m025-48-puter-tts-core-ai-20260819-1';",
    "const SW_REV='m025-49-puter-tts-core-ai-20260819-1';"
)
replace_once(
    'neural-voice-m02549-puter-test.js',
    "    assert.match(sw,/const SW_REV='m025-48-/);",
    "    // main advanced to m025-48 through T-026 while this PR was open; A7 therefore\n"
    "    // requires this candidate to be m025-49. Pin the candidate boundary here while\n"
    "    // pwa/A7 tests independently verify exact +1 coherence against main.\n"
    "    assert.match(sw,/const SW_REV='m025-49-/);"
)
print('m025-49 release markers and rebased release assertion applied')
