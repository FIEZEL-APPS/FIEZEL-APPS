# FIEZEL 5.17.0 — Operator Adoption Rehearsal v1

`content-adoption-rehearsal.js` menjalankan rehearsal release-time terhadap adoption request yang sudah memiliki Evidence Attestation dan signed Production Evidence Origin. Rehearsal memakai trust policy operator terpisah, menjalankan Canonical Adoption Gate, membentuk staging bundle, memverifikasi rollback reconstruction, dan menulis report tanpa memutasi canonical source.

```bash
node content-adoption-rehearsal.js \
  --request ADOPTION-REQUEST.json \
  --origin-trust-policy EVIDENCE-ORIGIN-TRUST-POLICY.json \
  --out REHEARSAL-OUTPUT
```

Output berisi `CONTENT-ADOPTION-REHEARSAL-REPORT.json` dan subdirectory `staging/`. Report selalu membedakan `productionEvidenceOriginVerified` dari `actualCanonicalAdoptionPerformed`; rehearsal tidak melakukan canonical publish/apply.

Controlled test 5.17 menggunakan synthetic aggregate evidence + ephemeral signing key. Oleh karena itu proof lokal mencatat `realProductionEvidenceUsed:false`, `productionRehearsalPerformed:false`, dan `actualCanonicalAdoptionPerformed:false`.
