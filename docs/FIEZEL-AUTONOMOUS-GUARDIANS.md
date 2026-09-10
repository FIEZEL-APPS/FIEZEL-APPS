# FIEZEL A8–A14 Autonomous Guardians

Status: governance automation candidate. These guardians are designed to work automatically on GitHub events without taking MASTER/OWNER release authority.

## Authority boundary

- OWNER / MASTER remains the only release authority.
- A8–A14 may inspect, block, classify, report, and recommend review.
- A8–A14 must not merge, enable auto-merge, push to `main`, deploy, rotate secrets, or silently waive physical evidence.
- A14's strongest positive verdict is `READY FOR MASTER REVIEW`, never `DEPLOY`.
- Physical-device acceptance remains a human/OWNER evidence boundary unless OWNER explicitly records a waiver.

## Agents

### A8 — CI Failure Analyst

Trigger: completion of selected critical workflows when the conclusion is `failure`.

Actions:
- captures failed-job logs through GitHub Actions;
- classifies likely failure domains with deterministic signatures;
- posts or updates one bounded PR comment;
- never claims root cause merely from a keyword match.

### A9 — Security Sentinel

Trigger: PR changes targeting `main`.

Blocks:
- common committed private-key/token signatures;
- `pull_request_target` in changed workflows without a separate OWNER security design;
- `permissions: write-all`.

Also runs existing Puter auth/COOP and SW/CORP regressions.

### A10 — Regression Watcher

Trigger: PR changes targeting `main`.

Checks:
- `git diff --check`;
- sensitive runtime vs companion test/workflow coverage signal;
- assertion-surface shrink warnings;
- single-flight, diagnostics search, PWA cache, and release-coherence regressions.

Warnings do not become false hard failures unless a deterministic invariant is violated.

### A11 — Release Readiness Auditor

Trigger: PR changes targeting `main`.

Checks:
- candidate contains current `origin/main`;
- clean merge-tree against current main;
- product changes increment `DIAG_BUILD` exactly +1;
- `SW_REV` build matches `DIAG_BUILD`.

A11 can report `MACHINE_BOUNDARY_OK`; it cannot declare physical acceptance.

### A12 — Evidence Gatekeeper

Trigger: PR changes targeting `main`.

For voice/audio/Classroom-sensitive changes:
- draft PRs may remain on `HOLD_DRAFT` while evidence is pending;
- non-draft PRs require a machine-readable OWNER evidence marker.

Accepted markers:

```html
<!-- FIEZEL_PHYSICAL_ACCEPTANCE: ACCEPTED -->
```

or an explicit OWNER waiver:

```html
<!-- FIEZEL_PHYSICAL_ACCEPTANCE: WAIVED_BY_OWNER -->
```

Release authorization is separately recorded with:

```html
<!-- FIEZEL_OWNER_RELEASE: AUTHORIZED -->
```

A12 never invents either marker and never grants release authority itself.

### A13 — Handoff Keeper

Trigger: PR changes targeting `main`.

For major neural-voice/Classroom changes, requires continuity through a changed handoff file or an explicit handoff reference in the PR body. It also warns when changed handoffs do not make status, authority, or next-step language explicit.

### A14 — Autonomous Review

Trigger: after A9–A13 finish.

Actions:
- consolidates job results;
- updates a single PR review-status comment;
- returns `BLOCKED`, `MACHINE-GREEN / DRAFT-HOLD`, or `READY FOR MASTER REVIEW`;
- fails if any blocking guardian fails.

A14 is deliberately deterministic. A future model-assisted reviewer may be added only as an advisory layer with a separately reviewed provider/privacy policy; it must not receive merge/deploy authority.

## Why A14 is not silently connected to an external AI model

The repository currently has no approved guardian-specific AI credential/provider contract in this automation. Sending source diffs or logs to an external model without an explicit OWNER privacy, billing, credential, and retention decision would violate the least-privilege design. The current system is autonomous immediately and can later host an AI advisory layer without weakening release governance.

## Activation

The workflows become active after this governance PR is merged to the default branch. Until then they run only where GitHub evaluates PR-defined `pull_request` workflows; `workflow_run` A8 becomes fully active once its workflow exists on `main`.
