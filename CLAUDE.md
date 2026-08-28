# FIEZEL-APPS — working agreement

This is FIEZEL-APPS's personal repo (FIEZEL, a personal English-learning PWA). Owner has
pre-authorized the following so Claude can work without stopping to ask each time:

- **Git/GitHub actions on this repo are pre-authorized**: commit, push to feature branches,
  create PRs, and merge PRs (including `--delete-branch`) without asking first. Still create
  a feature branch per change rather than committing straight to `main`, and still run the
  relevant tests before merging.
- Still ask first for anything genuinely destructive or hard to undo in a way a normal merge
  isn't: `git push --force` to `main`, `git reset --hard`, deleting data, or anything outside
  this repo.
- Version/build bump ritual: there are **four** places, not three — `core-config.js`
  `FIEZEL_PAGE_BUILD`, `fiezel-diag-panel.js` `DIAG_BUILD`, `sw.js` `SW_REV`, and the single
  source of truth `coordination/BUILD-VERSION.json`. **Never type the number into the three
  code files by hand**; run `node tools/bump-build.mjs "<reason>"`, which reads the base from
  `origin/main`, bumps +1, and writes all four together. If the three markers are already
  correct and only the JSON lags, use `node tools/bump-build.mjs --adopt "<reason>"` — a plain
  bump there would raise `SW_REV` for no product reason and make every learner redownload the
  shell cache. Verify with `node tools/bump-build.mjs --check`. Gates:
  `install-health-test.js`, `pwa-release-coherence-test.js`, and `coordination-guard-test.js`
  (the last one is the only gate that checks the JSON, so a hand-typed bump looks green in the
  other two and fails ~150 gates later).
- Before calling any change done, run the local test suite (see `.github/workflows/quality.yml`
  for the exact list) and loop until green. Pre-existing unrelated failures (e.g. the
  `vendor/kokoro-js/kokoro.web.js` hash-lock tests, which fail even on a clean `main` checkout
  in this environment) don't block — confirm via `git diff main -- <path>` that the file is
  untouched before treating a failure as pre-existing.
- Owner reports should stay short in chat; put detail in the PR description, not the chat reply.
