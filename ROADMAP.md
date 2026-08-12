# FIEZEL Roadmap

Status: **5.17.0 PRODUCTION EVIDENCE ORIGIN VERIFICATION SOURCE DONE / real production rehearsal remains OWNER ACTION REQUIRED**.

## Completed milestones

1–12. Baseline learning OS, Core/AI, evidence/policy/outcome, Content QA, Guarded Content Patch, Shadow/Canary, dan supporting quality/security/release work — DONE.
13. **5.15 Canonical Adoption Gate — DONE**: release-time threshold, owner/audit boundary, deterministic staging/rollback, source-root refusal, proof-fixture rejection.
14. **5.16 Adoption Evidence Attestation Bundle — DONE**: aggregate evidence export/import, source/candidate/config locking, privacy whitelist, deterministic digest, tamper verification.
15. **5.17 Production Evidence Origin Verification / Controlled Operator Rehearsal — SOURCE DONE**: Ed25519 signed origin envelope, separate operator trust policy, public-key fingerprint lock, freshness/validity checks, Canonical Adoption origin binding, dan staging/rollback rehearsal tool. Controlled proof memakai synthetic evidence + ephemeral key dan tidak mengklaim production rehearsal.

## Owner activation gate

**Production rehearsal masih menunggu owner**: signed aggregate production evidence, operator-controlled public trust policy, real owner review ID, dan bila perlu akses/export dari sistem produksi. Private signing key tetap di HSM/KMS/exporter operator dan tidak boleh dimasukkan ke source.

## Next milestone after owner rehearsal

16. **Adoption Receipt / Replay Protection — NEXT AFTER REAL REHEARSAL**: bila production rehearsal sudah terbukti, standardisasi one-time adoption receipt/ledger yang mengikat origin envelope, owner review, target version, staging manifest, dan rollback identity agar evidence/review yang sama tidak dapat dipakai ulang secara diam-diam. Jangan mulai milestone ini dengan menganggap production rehearsal sudah terjadi.

## Invariants

- Tidak ada `/api/content/patch/apply`, `/api/content/patch/publish`, `/api/content/adoption`, runtime attestation, origin, atau rehearsal endpoint.
- Content QA AI tetap advisory-only; patch AI tetap candidate-only.
- Shadow/Canary/Promotion tidak memutasi canonical JSON.
- Canonical Adoption hanya release-time dan hanya ke staging directory bersih.
- Adoption memerlukan verified Evidence Attestation + verified production origin + explicit owner-release approval.
- Trust policy operator diberikan terpisah dari evidence/request; self-supplied trust root dilarang.
- Private signing key tidak disimpan di FIEZEL source/release.
- Synthetic test evidence/key tidak boleh diklaim sebagai learner evidence atau trust root produksi.
- Promotion/adoption evidence aggregate-only; raw answer/history dilarang.
- Core protocol tetap 1.7 sampai wire contract benar-benar berubah.
- Grammar schema 2.0.0 dan practice blueprint `focused-25-v1` tidak berubah tanpa kebutuhan kontraktual.
- User progress, streak, mastery, review queue, diagnostic evidence, settings, consent, Creator Hub state, dan existing backend namespace dipertahankan.
- Creator attribution `Fitrarustqi / @fitrarustqi` tidak boleh dihapus.
- Tone produk tetap relevan untuk Gen Alpha / anak Indonesia: natural, ringkas, tidak menggurui, aman, dan akurat.
