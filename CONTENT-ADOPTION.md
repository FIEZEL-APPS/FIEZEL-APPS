# FIEZEL 5.15.0 — Canonical Adoption Gate v1

Canonical Adoption Gate adalah boundary **release-time**, bukan runtime mutation. Tujuannya menentukan apakah active overlay yang sudah stabil cukup kuat untuk dipersiapkan sebagai canonical content pada rilis baru. Build 5.15.0 tidak melakukan canonical adoption produksi karena evidence yang tersedia di workspace adalah controlled/synthetic proof, bukan learner evidence nyata.

## Contract

Schema: `fiezel-content-adoption-v1`. Gate version: `canonical-adoption-v1`.

Syarat minimum yang tidak dapat diturunkan oleh AI, candidate, atau config:

- 10 exposure sessions;
- 30 control attempts;
- 30 canary attempts;
- 20 promoted attempts;
- promoted accuracy minimal 75%;
- promoted accuracy tidak boleh lebih dari 3 percentage points di bawah control;
- observation window minimal 7 hari;
- tidak ada prior runtime rollback;
- Promotion harus berstatus `post_promotion_stable`;
- Release Audit minimal 111 PASS / 0 FAIL;
- Product Audit minimal 44 PASS / 0 FAIL;
- Content QA blocker 0;
- candidate SHA-256 dan canonical immutability harus konsisten.

## Owner/audit boundary

Adoption memerlukan `authority: owner-release`, `approved: true`, dan `reviewId` bounded. `local-proof-fixture` selalu ditolak untuk canonical adoption. Tidak ada endpoint `/api/content/adoption`, `/api/content/patch/apply`, atau `/api/content/patch/publish`.

## Staging dan rollback

`content-adoption.js` hanya menulis ke staging directory yang bersih. Tool menolak source root dan directory yang sudah memiliki canonical files. Eligible bundle menghasilkan tiga canonical data staged, `VERSION.json`, `CONTENT-ADOPTION-MANIFEST.json`, dan `CONTENT-ADOPTION-ROLLBACK.json`.

Rollback artifact menyimpan original target item, source/target item SHA-256, source/target canonical hashes, source/target version, patch identity, dan privacy flags. Learner answer/history tidak disimpan.

## Proof boundary

`content-adoption-test.js` membuktikan threshold, owner gate, privacy fail-closed, audit boundary, proof-fixture rejection, deterministic staging, rollback reconstruction, source-root write refusal, dan canonical source immutability. Proof menggunakan synthetic evidence dan secara eksplisit mencatat `canonicalAdoptionPerformed:false`.

## 5.16 Evidence Attestation boundary

Mulai 5.16, Canonical Adoption Gate tidak menerima direct/unattested canary-promotion evidence sebagai sumber keputusan. Request harus membawa `evidenceAttestation` schema `fiezel-adoption-evidence-attestation-v1` yang lolos source/candidate/config lock, privacy whitelist, bounds, count consistency, deterministic payload digest, dan promotion-summary recomputation. Evidence dan observation yang dipakai gate berasal dari bundle terverifikasi tersebut.

Attestation integrity tidak menggantikan `authority: owner-release`, `approved: true`, dan bounded `reviewId`. Local digest hanya tamper-evidence; authenticity production evidence tetap harus ditentukan oleh operator/trusted-origin workflow di luar capability lokal ini.

## 5.17 production origin boundary

Canonical Adoption 5.17 memerlukan Evidence Attestation **dan** signed Production Evidence Origin yang diverifikasi menggunakan trust policy operator terpisah. Adoption manifest merekam origin envelope digest, origin/key identity, serta trust-policy digest. Signature tidak menggantikan `owner-release` approval, dan private signing key tidak pernah menjadi input source/tooling release.
