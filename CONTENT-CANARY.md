# FIEZEL 5.15.0 — Shadow/Canary Content Overlay

Shadow/Canary tetap menjadi lapisan isolasi antara Guarded Content Patch dan Autonomous Promotion. Candidate yang sudah gated berjalan hanya pada clone runtime; canonical learning data tidak ditulis ulang.

## Safety model

- `content-canary-config.js` default `enabled:false` / `mode:'off'`.
- Candidate harus lebih dulu lulus `content-patch-gate.js`; `content-canary-config-builder.js` menolak candidate ungated/stale.
- `shadow` mempertahankan konten canonical untuk learner dan memberi marker runtime `phase:'control'` pada target untuk evidence agregat; patched clone tetap terisolasi sebagai `shadowDataset`.
- `canary` memakai patched clone hanya jika assignment cocok. Cohort dibatasi maksimal 10%, exposure maksimal 20 session, dan expiry maksimal 30 hari.
- Learner/cohort yang tidak mendapat canary tetap memakai canonical target dengan marker `phase:'control'` agar outcome control dapat dihitung tanpa mengubah isi.
- Source version/hash, patch ID, candidate digest, gate version, dan canonical-immutable proof harus konsisten; mismatch fail closed.
- Evidence hanya agregat: control/canary/promoted attempts, correct/incorrect counts, exposure, rollback, promotion ledger, dan timestamps. Raw answer/history tidak disimpan di metadata canary.
- `phase:'promoted'` hanya boleh muncul bila `fiezel-content-promotion-v1` mengembalikan keputusan `promote` yang cocok dengan canary ID + patch ID.
- Menonaktifkan/mengganti config, expiry, stale source, digest mismatch, exposure limit, atau promotion rollback mengembalikan runtime ke canonical baseline.

## Builder

```bash
node content-canary-config-builder.js \
  --candidate CONTENT-PATCH-CANDIDATE.json \
  --mode shadow \
  --canary-id shadow-vocab-001 \
  --expires 2026-08-20T00:00:00Z \
  --output content-canary-config.js
```

Untuk canary learner target:

```bash
node content-canary-config-builder.js \
  --candidate CONTENT-PATCH-CANDIDATE.json \
  --mode canary \
  --canary-id canary-vocab-001 \
  --target-learner Jahran \
  --sessions 3 \
  --expires 2026-08-20T00:00:00Z \
  --output content-canary-config.js
```

Setelah config berubah, seluruh quality gate harus dijalankan ulang sebelum packaging/deployment. Release 5.15.0 tetap OFF dan tidak mengklaim learner-facing activation.
