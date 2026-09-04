# FIEZEL 5.17.0 — Production Evidence Origin Verification v1

Tool `content-evidence-origin.js` memverifikasi bahwa Adoption Evidence Attestation berasal dari exporter yang dipercaya operator. Verifikasi ini **release-time only** dan tidak menambah runtime/Core endpoint.

## Security contract

- Envelope schema: `fiezel-evidence-origin-envelope-v1`.
- Signed payload schema: `fiezel-evidence-origin-signed-payload-v1`.
- Trust policy schema: `fiezel-evidence-origin-trust-policy-v1`.
- Gate version: `evidence-origin-verification-v1`.
- Signature algorithm: Ed25519.
- Payload mengunci SHA-256 Evidence Attestation, source version, candidate/source-item/config digest, canary ID, observation end, origin ID, exporter ID, export ID, key ID, environment, dan issued-at.
- Production verification hanya menerima `environment: production`.
- Trust policy **tidak boleh embedded di evidence envelope**. Ia diberikan operator melalui jalur terpisah dan digest-nya ikut direkam pada adoption manifest/rehearsal report.
- `keyId` adalah fingerprint SPKI public key: `ed25519-sha256:<hex>`.
- Policy/key validity, signature freshness, dan clock skew dibatasi oleh operator trust policy.
- Private signing key tidak dibutuhkan verifier dan tidak boleh disimpan di source/release artifact.

Hash attestation membuktikan integritas. Ed25519 + operator-controlled trust policy membuktikan bahwa payload ditandatangani oleh key yang dipilih operator. Keduanya tetap **bukan owner approval**.

## Signing workflow

FIEZEL dapat menghasilkan canonical signing payload, tetapi signing production dilakukan oleh exporter/HSM/KMS/operator-controlled signer:

```bash
node content-evidence-origin.js --payload-out EVIDENCE-ORIGIN-PAYLOAD.json \
  --attestation ADOPTION-EVIDENCE-ATTESTATION.json \
  --metadata EVIDENCE-ORIGIN-METADATA.json
```

Signer eksternal menandatangani bytes file payload tersebut dengan Ed25519 tanpa menambahkan newline/transformasi. Signature base64 lalu dirakit:

```bash
node content-evidence-origin.js --assemble \
  --payload EVIDENCE-ORIGIN-PAYLOAD.json \
  --signature-file EVIDENCE-ORIGIN-SIGNATURE.txt \
  --out EVIDENCE-ORIGIN-ENVELOPE.json
```

Verifikasi lokal:

```bash
node content-evidence-origin.js --verify \
  --origin EVIDENCE-ORIGIN-ENVELOPE.json \
  --attestation ADOPTION-EVIDENCE-ATTESTATION.json \
  --request ADOPTION-REQUEST.json \
  --trust-policy EVIDENCE-ORIGIN-TRUST-POLICY.json
```

## Proof boundary

`content-evidence-origin-test.js` memakai ephemeral Ed25519 key hanya untuk controlled failure probes. Test key tidak disimpan dan tidak diklaim sebagai production trust root. Production authenticity hanya boleh diklaim setelah operator memasok trust policy nyata dan signed production evidence.
