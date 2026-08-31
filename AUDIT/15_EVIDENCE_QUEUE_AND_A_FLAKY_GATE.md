# 15 — The evidence queue is optional (Phase M), and a flaky CI gate found on the way

## Part 1 — Phase M: the queue already exists, and learning does not depend on it

The brief says *"if server evidence collection already exists, verify LOCAL EVIDENCE → QUEUE →
BATCH → UPLOAD, and if upload fails: LEARNING CONTINUES."*

**It exists.** `features/analytics/fiezel-analytics-client.js` is exactly that shape, and its own
header already states the Phase M guarantee:

> `track()` never throws and never holds up the learning path: it just puts one small row on the
> local queue and returns. Sending is batched, later, and network failure is invisible to the learner.

It is already guarded by `analytics-client-test.js` — **190 assertions** on privacy, the
server-only event blacklist, and visitor tokens. Per `AUDIT/08`, this phase does **not** rebuild
or re-test any of that.

**What was not guarded by anyone**, and is what `braincore-evidence-queue-test.js` adds: does
Braincore's *learning decision* change when upload fails? The same twelve-answer session is run in
four worlds — normal, network dead, server 500, no transport at all — and the decisions must be
**identical**. Not "still present": identical. If a failed upload shifted even one decision,
learning would be reading the state of the network.

They are identical, and learner state still accumulates (`n === 12`) with no transport at all.

`§3` adds the structural argument: Braincore contains **no `Promise`, no `async`, no `await`, no
`setTimeout`** — so it *cannot* wait for a network, whatever anyone names a variable.

### Two of my own assertions were wrong first, in an instructive way

- `§1` grepped this gate's own source for `visitor_token` to prove it wasn't duplicating the
  analytics gate — and matched **its own assertion message**. A gate that fails by reading itself
  is testing spelling.
- `§3` originally searched Braincore for the words `queue`, `retry`, `flush`. It found four
  "violations", **all false**: `queue` is a breadth-first-search queue for walking the
  prerequisite graph; `retryCount` is *the learner* re-attempting a question. Same words,
  completely different domain.

Both were the exact defect I have criticised repeatedly elsewhere: **testing text instead of
behaviour.** They are now dependency- and structure-based.

---

## Part 2 — `analytics-client-test.js` is flaky under CPU load

Found while checking whether Phase M was already covered. **This is pre-existing, unrelated to
Braincore, and not fixed here.**

**Reproduction.** Idle, the gate passes 8 runs out of 8. With four CPU-burning processes running:

```
run 1: 188/190      run 4: 184/190
run 2: 190/190      run 5: 188/190
run 3: 184/190      run 6: 188/190
```

**Five failures in six runs.** The gate exits `1` on any failure, so on a loaded CI runner this
produces a red build with no code change behind it.

**The failing assertions and the cause:**

```
FAIL  (f) tiga periode pepper menghasilkan tiga token
FAIL  (f) token BERBEDA di setiap periode pepper
```

`analytics-client-test.js:922` waits `await settle(80)` — a fixed 80 ms — for the emitter to flush,
then reads the captured events. Under load, one of the three iterations has not emitted its
`app_open` yet, so only two tokens are collected and both assertions fail. **It is a fixed-timeout
race, not a defect in the pepper rotation it is testing.**

**The fix is to wait for the condition rather than for a duration** — poll until the third event
appears, with a generous ceiling. It is a test-only change, a few lines.

**Not applied here.** It is unrelated to what this PR is for, and quietly widening a Braincore PR
into another author's 1,200-line test file is how a reviewable change becomes an unreviewable one.
Recorded so the owner can decide.

**One consequence worth stating for this audit's own credibility:** any gate I ran manually while
the background suite was loading the machine could in principle have been affected the same way.
The authoritative results in this branch are the isolated full-suite runs, not manual spot-checks.
