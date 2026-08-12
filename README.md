# FIEZEL 5.17.0

FIEZEL adalah Personal English OS untuk Jahran. Build 5.17.0 menambahkan **Production Evidence Origin Verification v1** dan **Operator Adoption Rehearsal v1** pada release pipeline.

Adoption Evidence Attestation 5.16 tetap menjadi boundary integritas aggregate evidence. 5.17 menambahkan Ed25519 signed-origin envelope dan operator-supplied trust policy yang diberikan terpisah dari adoption request. Canonical Adoption hanya dapat menerima evidence yang attestation-nya valid, origin-nya terverifikasi terhadap trust root operator, seluruh threshold/audit lulus, dan explicit `owner-release` approval tersedia.

Tidak ada private signing key di source. Controlled proof memakai ephemeral key dan synthetic evidence; build ini tidak mengklaim real production rehearsal atau canonical adoption produksi.

## Baseline content

- Vocabulary: 1.765 entri.
- Grammar: 129 lesson × 25 mode = 3.225 runtime questions.
- Reading: 300 passages / 1.500 questions.
- Grammar schema: `2.0.0`.
- Practice blueprint: `focused-25-v1`.
- Core protocol: `1.7`.
- Shadow/Canary release config: OFF.

## Quality commands

```bash
node validator.js
node regression-test.js
node content-audit.js
node product-audit.js
node grammar-quality-audit.js
node content-adoption-evidence-test.js
node content-evidence-origin-test.js
node content-adoption-rehearsal-test.js
node content-adoption-test.js
python3 release-audit.py
```

Aplikasi harus dijalankan melalui HTTP/HTTPS, bukan `file://`. External Puter deployment, scheduler/VAPID, live canary/promotion, real production evidence origin, production rehearsal, dan canonical adoption produksi tidak dianggap LIVE hanya karena source capability tersedia. Lihat `PRODUCTION-ORIGIN-OWNER-ACTION.md` untuk input operator yang masih dibutuhkan.
