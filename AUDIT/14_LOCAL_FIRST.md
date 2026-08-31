# 14 — Local-first, proven by execution (Phase 2 / Phase L)

**The claim:** Braincore keeps working with no internet, no server, no telemetry, and with the AI
quota exhausted. Telemetry must never become a requirement for learning.

**Result: all seven assertions pass.** 23 Braincore modules load *and run a full learning
session* inside a world that has no network, no storage, no DOM and no clock.

---

## 1. Why this gate runs code instead of grepping

Proving local-first with `grep -L fetch features/brain/` is the same weak proof as the hollow
manifest test from Phase A: it tests **text**, not **behaviour**. A network dependency can arrive
through another module, through a global assumed to exist, or through something that only
explodes when actually called.

So `§2` loads every Braincore module into a `vm` sandbox whose global object simply **does not
contain** `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator`, `localStorage`, `sessionStorage`,
`indexedDB`, `document`, `window`, `Date`, `setTimeout` or `process`. Not disabled — absent.
Touching any of them is a `ReferenceError`.

Inside that world it then runs a **ten-answer learning session** through the real modules —
credibility weighting, BKT update, tutor diagnosis, tutor decision — and asserts that ten
non-empty decisions come out, that they are not all identical, and that learner state actually
accumulates (`n === 10`).

## 2. Proven, and the proof was itself tested

A network dependency was inserted into `BKT.update()` on a copy of the tree:

```
FAIL - §1 tidak satu pun modul Braincore menyebut API jaringan atau penyimpanan
FAIL - §2 satu sesi belajar penuh MENGHASILKAN KEPUTUSAN di dunia tanpa jaringan
ok   - §2 SETIAP modul Braincore bisa dimuat ...
```

Note which one stayed green: the **load** test passed, because `navigator.onLine` sat inside a
function that loading never calls. Only the **session** test caught it. That is precisely why the
session test exists, and it is a good argument against ever settling for "the module imports
cleanly" as evidence of anything.

### My first attempt at this proof was worthless, and it looked fine

The first mutation targeted `function update(state, evidence, nowMs)`. The real signature is
`function update(st, obs, nowMs)`. Python's `str.replace` does not error on a miss, so **the
mutation silently did nothing**, the gate stayed green, and the output read exactly like a
successful mutation test. I was one step from reporting "the gate is proven to catch violations"
on the strength of a mutation that never happened.

The re-run asserts the anchor exists *and* that the mutated text is present before the gate is
run. **A mutation test that does not verify it mutated is not a test — it is a green light with
no wiring behind it**, and it belongs on the same list as the three field-name defects in
`AUDIT/09` and `AUDIT/12`.

## 3. What was checked about quota

`§3` asserts the core learning path — `bktRecord`, `tutorObserve`, `itemCalibrationObserve`,
`affectObserve` — contains no reference to quota. Quota belongs to the AI assistant
(`aiTask`/Cloudflare transport). If quota logic ever appears in the functions that record an
answer or choose the next question, learning could stop because an AI budget ran out, and that is
exactly what this phase forbids.

`§4` guards the guard: it asserts those function names still exist in `app.js`, so a rename cannot
quietly turn `§3` into a check of nothing.

## 4. Honest limits

1. **This proves Braincore is local-first. It does not prove the whole app is.** The question
   bank, service worker and UI shell are outside this gate's scope; offline behaviour of the full
   PWA is covered by other suites (`sw-nav-budget-test.js`, `install-health-test.js`), not this one.
2. **`§1` and `§3` are text checks.** They are fast tripwires, deliberately not the main evidence.
   `§2` is the evidence.
3. **No real device was taken offline.** The sandbox is a faithful *absence* of these globals, not
   a real airplane-mode test on a real phone.
