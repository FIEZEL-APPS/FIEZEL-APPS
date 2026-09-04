# FIEZEL 5.17.0 — Adoption Evidence Attestation Bundle v1

Adoption Evidence Attestation adalah tooling **release-time** untuk mengekspor dan mengimpor evidence aggregate dari Shadow/Canary + Autonomous Promotion sebelum Canonical Adoption Gate. Tool ini bukan runtime dependency dan tidak memberi browser, Core Worker, atau AI kemampuan menulis canonical content.

## Contract

- Schema: `fiezel-adoption-evidence-attestation-v1`.
- Gate version: `adoption-evidence-attestation-v1`.
- Source version wajib sama dengan `candidate.target.sourceVersion`.
- Candidate dikunci dengan SHA-256 yang sama dengan `canaryConfig.gateProof.candidateSha256`.
- Sanitized canary config juga dikunci dengan digest deterministik.
- Evidence hanya aggregate dan bounded: exposure, control/canary/promoted attempts/correct/incorrect, bounded promotion ledger, timestamps ringkas, rollback count/reason, dan privacy flags.
- Count harus konsisten: `correct + incorrect = attempts` per phase; target totals harus sama dengan canary + promoted totals.
- Unknown evidence fields, raw answers, dan raw history fail closed.
- Observation hanya `startedAt` / `endedAt` yang valid.
- Promotion summary dihitung ulang secara deterministic dari config + evidence + observation end.

## Integrity vs authority

Bundle memakai canonical JSON key ordering (`json-key-sort-v1`) dan SHA-256 payload digest agar export/import reproducible dan tamper-evident. Digest lokal **bukan bukti asal evidence dan bukan owner approval**. Bundle secara eksplisit menyatakan `ownerApprovalIncluded:false` dan `ownerApprovalRequiredSeparately:true`.

Canonical Adoption Gate 5.16 menolak direct/unattested evidence. Gate hanya memakai evidence + observation dari attestation yang lolos verifikasi, lalu tetap menjalankan seluruh threshold 5.15, candidate/config lock, no-rollback rule, release/product/content-QA boundary, dan explicit `owner-release` approval.

## CLI

Build bundle dari request yang memuat `sourceVersion`, `candidate`, `canaryConfig`, `evidence`, dan `observation`:

```bash
node content-adoption-evidence.js --request ADOPTION-EVIDENCE-REQUEST.json --out ADOPTION-EVIDENCE-ATTESTATION.json
```

Verifikasi kembali bundle terhadap request/source identity:

```bash
node content-adoption-evidence.js --attestation ADOPTION-EVIDENCE-ATTESTATION.json --request ADOPTION-EVIDENCE-REQUEST.json
```

## Proof boundary

`content-adoption-evidence-test.js` menggunakan controlled synthetic aggregate evidence untuk membuktikan deterministic export/import, tamper rejection, source/candidate/config lock, whitelist privacy, bounds, count consistency, owner-boundary separation, dan canonical immutability. Proof lokal tidak mengklaim bahwa evidence tersebut berasal dari learner produksi.

## 5.17 origin boundary

Mulai 5.17, attestation digest saja tidak cukup untuk Canonical Adoption. Evidence harus dibungkus `fiezel-evidence-origin-envelope-v1` yang lolos Ed25519 verification terhadap operator-supplied `fiezel-evidence-origin-trust-policy-v1`. Trust policy tidak boleh berasal dari untrusted adoption request dan owner approval tetap boundary terpisah.
