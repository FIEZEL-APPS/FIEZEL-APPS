# FIEZEL 5.17.0 — Production Evidence Origin Verification / Operator Adoption Rehearsal

## Version decision

**5.16.0 → 5.17.0 (MINOR).** Build menambah capability release/security backward-compatible. Learner storage schema, canonical IDs, grammar schema, practice blueprint, Core protocol, dan learner-facing workflow tidak berubah.

## Added

- `content-evidence-origin.js` — Ed25519 Production Evidence Origin verifier.
- `content-evidence-origin-test.js` — controlled signature/tamper/trust failure probes.
- `CONTENT-EVIDENCE-ORIGIN.md` dan `CONTENT-EVIDENCE-ORIGIN-PROOF.json`.
- `content-adoption-rehearsal.js` — operator staging/rollback rehearsal.
- `content-adoption-rehearsal-test.js` dan `CONTENT-ADOPTION-REHEARSAL.md`.
- `CONTENT-ADOPTION-REHEARSAL-PROOF.json`.
- `PRODUCTION-ORIGIN-OWNER-ACTION.md` untuk dependency/operator boundary yang tidak boleh dipalsukan AI.
- CI, Product Audit, Release Audit, handoff v1.8, dan packaging coverage untuk origin/rehearsal tooling.

## Security contract

- Evidence origin memakai Ed25519.
- Signed payload mengunci Evidence Attestation digest, source/candidate/source-item/config identity, canary ID, observation end, origin/export/exporter/key identity, environment, dan issued-at.
- Trust policy operator diberikan terpisah dari untrusted adoption request; self-supplied trust root ditolak.
- Public-key fingerprint, key/policy validity, signature age, clock skew, dan production environment diverifikasi fail-closed.
- Private signing key tidak disimpan atau dibutuhkan di source.
- Signature **tidak menggantikan owner approval**.

## Canonical Adoption changes

Canonical Adoption 5.17 sekarang memerlukan:

1. valid Guarded Patch candidate + canary config;
2. verified Adoption Evidence Attestation;
3. verified signed production origin terhadap operator trust policy terpisah;
4. stable promotion + extended evidence thresholds;
5. no prior rollback;
6. Release Audit/Product Audit/Content QA boundary;
7. explicit `owner-release` approval.

Adoption manifest mengikat origin envelope digest, origin/key ID, trust-policy ID/digest, serta evidence attestation digest.

## Controlled proof boundary

Local proofs menggunakan synthetic aggregate evidence dan ephemeral Ed25519 key. Mereka membuktikan verifier/staging/rollback contract saja dan mencatat:

- `productionOriginClaimed:false`;
- `realProductionEvidenceUsed:false`;
- `productionRehearsalPerformed:false`;
- `actualCanonicalAdoptionPerformed:false`.

## Canonical content / compatibility

- Vocabulary: 1.765.
- Grammar: 129 × 25 = 3.225 runtime questions.
- Reading: 300 / 1.500 questions.
- Grammar schema: `2.0.0`.
- Practice blueprint: `focused-25-v1`.
- Core protocol: `1.7`.
- Release Shadow/Canary config: OFF.
- Canonical Content QA: **0 blocker / 61 review**.

## Source quality

- Full source suite: **31/31 PASS**.
- Product Audit: **47 PASS / 0 FAIL**.
- Grammar Quality: **24 PASS / 0 FAIL**.
- Release Audit: **127 PASS / 0 FAIL**.
- Grammar runtime: **3.225 questions; 0 cross-lesson duplicates; 0 focus leaks**.

## Owner action still required

Real production rehearsal belum dijalankan karena workspace tidak memiliki signed production learner evidence, operator trust policy nyata, signing service/private key, atau real owner review approval. Bila file berada di sistem privat/URL berautentikasi, owner harus mengekspor/download file lalu melampirkannya. AI tidak boleh mengarang atau menyimpan credential/private key produksi.
