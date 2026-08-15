# FIEZEL MASTER-ONLY WRITE AUTHORITY

Status: ENFORCED POLICY
Owner identity: `fitrajft-ux`
Control model: single MASTER executor; all other internal/external helpers are advisory-only.

## 1. Sole write authority
Only the MASTER may perform or authorize repository-changing or production-changing operations, including:
- create/update/delete branches or refs;
- create/update/delete repository files;
- commit, push, force-push, rebase, cherry-pick, or merge;
- open/modify/merge/close production pull requests as an execution step;
- dispatch or re-run deploy/configuration workflows;
- deploy GitHub Pages, Puter Workers, or any other production runtime;
- change secrets, repository settings, Actions settings, environments, rulesets, Pages settings, or release configuration;
- publish releases/tags or mutate production data/configuration.

## 2. Helper boundary
Any other AI/model/agent/helper, whether internal or external, is advisory-only.
Helpers may provide proposals, analyses, test suggestions, review findings, or evidence to the MASTER.
Helpers must NOT directly access GitHub write tools, repository credentials, deployment credentials, secrets, workflow dispatch, branch creation, commits, pushes, merges, releases, or deployment actions.

A1-A7 labels are governance lanes/roles, not autonomous GitHub accounts. A6/A7 GitHub Actions are deterministic read-only verifiers, not write-authorized agents.

## 3. Automated verifier boundary
Deterministic CI/verifier workflows may check out source and run tests with explicit read-only GitHub permissions.
They must not mutate repository contents, branches, PR state, releases, deployments, secrets, environments, or external production configuration.
Their output is evidence for the MASTER; it is never an autonomous approval or execution authority.

## 4. Sensitive workflow boundary
Deployment/configuration workflows must be manual-only and fail closed unless the GitHub actor is the owner identity `fitrajft-ux`.
No push-triggered autonomous deployment/configuration is permitted.
Product runtime automation that is not a repository/deployment decision (for example scheduled end-user reminder delivery) may continue only within its bounded runtime contract and must not mutate repository state.

## 5. Decision flow
Required flow for any material change:
1. Helper/verifier may propose or report.
2. MASTER independently reviews repository state and evidence.
3. MASTER decides whether to change code/configuration.
4. MASTER performs the GitHub write through the owner-authenticated channel.
5. Read-only verifiers may validate the candidate.
6. MASTER alone decides merge/deploy/promotion.

No helper may skip from step 1/5 to execution.

## 6. Identity limitation
GitHub sees owner-authenticated writes as the account `fitrajft-ux`. GitHub cannot cryptographically distinguish a MASTER action from another process that has stolen or reused the same owner credential. Therefore credential custody remains a hard security boundary: owner credentials/tokens must not be shared with helpers or external agents.

## 7. Enforcement checks
- Direct collaborator inventory must remain owner-only unless the MASTER explicitly changes policy.
- CI/verifier workflows must use read-only GitHub permissions.
- Sensitive deploy/configure workflows must be manual-only and owner-actor gated.
- `MASTER Authority Guard` must fail any observed `main` push whose `github.actor` is not `fitrajft-ux`.
- CODEOWNERS designates `@fitrajft-ux` as sole code owner.

Any violation is a BLOCKER and invalidates autonomous promotion until reviewed by the MASTER.
