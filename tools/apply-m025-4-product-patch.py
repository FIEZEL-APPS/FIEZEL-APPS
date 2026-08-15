from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = "m025-4"
VENDOR_URL = "vendor/kokoro-js/kokoro.web.js?nv=m025-4"

PHASES = [
    "espeak_module_loaded",
    "espeak_worker_promise_create",
    "espeak_runtime_already_ready",
    "espeak_runtime_wait",
    "espeak_runtime_ready",
    "espeak_worker_construct_enter",
    "espeak_worker_construct_ready",
    "espeak_initcache_enter",
    "espeak_list_voices_enter",
    "espeak_list_voices_return",
    "espeak_initcache_ready",
    "espeak_phonemize_enter",
    "espeak_worker_await_ready",
    "espeak_initcache_await_ready",
    "espeak_set_voice_enter",
    "espeak_set_voice_return",
    "espeak_synthesize_enter",
    "espeak_synthesize_return",
    "espeak_synthesize_error",
]


def replace_once(path, old, new):
    p = ROOT / path
    s = p.read_text()
    if new in s:
        return
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"PATCH FAIL: {path}: expected one anchor, got {count}: {old[:80]!r}")
    p.write_text(s.replace(old, new, 1))


def replace_all_literal(path, old, new):
    p = ROOT / path
    s = p.read_text()
    if old not in s:
        if new in s:
            return
        raise SystemExit(f"PATCH FAIL: {path}: missing literal {old!r}")
    p.write_text(s.replace(old, new))


# 1) Install a bounded bridge before Kokoro is dynamically imported. The vendor
# source can emit only allowlisted phase names; payload fields are discarded.
boot_path = "features/neural-voice/fiezel-neural-voice-bootstrap.js"
diag_anchor = "function diag(entry){try{const key='fiezel-neural-voice-diagnostics-v1';const list=JSON.parse(root.localStorage?.getItem(key)||'[]');list.push({t:Date.now(),v:version,...entry});root.localStorage?.setItem(key,JSON.stringify(list.slice(-200)))}catch{}}"
phase_literal = ",".join(repr(x) for x in PHASES)
bridge = diag_anchor + "\n  const VENDOR_STAGE_PHASES=new Set([" + phase_literal + "]);\n  root.__fiezelNeuralVendorStage=entry=>{try{const vendorPhase=String(entry?.phase||'');if(VENDOR_STAGE_PHASES.has(vendorPhase))diag({phase:vendorPhase})}catch{}};"
replace_once(boot_path, diag_anchor, bridge)
replace_once(
    boot_path,
    "{path:'vendor/kokoro-js/kokoro.web.js',bytes:2135645}",
    "{path:'vendor/kokoro-js/kokoro.web.js?nv=m025-4',bytes:2135645}",
)
replace_once(
    boot_path,
    "absolute('vendor/kokoro-js/kokoro.web.js')",
    "absolute('vendor/kokoro-js/kokoro.web.js?nv=m025-4')",
)

# 2) Advance the physical diagnostics build marker exactly one step.
replace_once(
    "features/neural-voice/fiezel-diag-panel.js",
    "var DIAG_BUILD = 'm025-3';",
    "var DIAG_BUILD = 'm025-4';",
)

# 3) Force an installed-PWA shell refresh and pre-cache the versioned vendor URL.
replace_once(
    "sw.js",
    "const SW_REV='m025-3-neural-stage-probe-20260816-1';",
    "const SW_REV='m025-4-espeak-phase-probe-20260816-1';",
)
replace_once(
    "sw.js",
    "'./fiezel-report-worker.js','./features/neural-voice/fiezel-neural-voice-config.js'",
    "'./fiezel-report-worker.js','./vendor/kokoro-js/kokoro.web.js?nv=m025-4','./features/neural-voice/fiezel-neural-voice-config.js'",
)

# 4) Advance the existing device verifier and add m025-4 privacy/cache contracts.
test_path = "neural-voice-device-hotfix-test.js"
replace_all_literal(test_path, "m025-3", "m025-4")
replace_once(
    test_path,
    "const diag=read('features/neural-voice/fiezel-diag-panel.js');",
    "const diag=read('features/neural-voice/fiezel-diag-panel.js');\nconst phon=read('vendor/kokoro-js/source-overrides/phonemizer.js');\nconst sourceLock=JSON.parse(read('NEURAL-VOICE-SOURCE-LOCK.json'));",
)
privacy_anchor = "assert.ok(!adapter.includes('error.message'),'adapter stage diagnostics must not persist external error messages that could echo prompt text');"
phase_array_js = ",".join(repr(x) for x in PHASES)
extra = privacy_anchor + "\nfor(const phase of [" + phase_array_js + "]){\n  assert.ok(phon.includes(`stage(\"${phase}\")`),`missing source-derived eSpeak diagnostic phase ${phase}`);\n  assert.ok(boot.includes(`'${phase}'`),`bootstrap must allowlist eSpeak diagnostic phase ${phase}`);\n}\nassert.ok(!/stage\\(\"[^\"]+\",/.test(phon),'eSpeak probe must emit phase names only');\nassert.ok(!phon.includes('error.message'),'eSpeak probe must not persist external error messages');\nassert.ok(boot.includes(\"vendor/kokoro-js/kokoro.web.js?nv=m025-4\"),'m025-4 must import the versioned vendor URL');\nassert.ok(sw.includes(\"./vendor/kokoro-js/kokoro.web.js?nv=m025-4\"),'m025-4 SW must pre-cache the versioned vendor URL');\nassert.ok(sourceLock.dependencies.phonemizerSourceOverride&&sourceLock.dependencies.phonemizerSourceOverride.path==='vendor/kokoro-js/source-overrides/phonemizer.js','m025-4 source lock must record the phonemizer override');"
replace_once(test_path, privacy_anchor, extra)

print("m025-4 guarded product patch applied")
