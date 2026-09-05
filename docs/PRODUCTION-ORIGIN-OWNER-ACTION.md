# OWNER ACTION REQUIRED — Production Evidence Origin / Adoption Rehearsal

Source/package FIEZEL 5.17.0 dapat memverifikasi origin dan menjalankan rehearsal, tetapi workspace lokal ini tidak memiliki production learner evidence, operator trust root nyata, private signing service, atau approval produksi. AI tidak boleh membuat atau mengarang material tersebut.

Owner/operator perlu menyediakan **file lokal**, bukan secret di chat/source:

1. `ADOPTION-REQUEST.json` yang mengacu pada candidate/config produksi yang benar dan Evidence Attestation aggregate.
2. `EVIDENCE-ORIGIN-ENVELOPE.json` yang ditandatangani exporter produksi dengan Ed25519.
3. `EVIDENCE-ORIGIN-TRUST-POLICY.json` berisi **public key**/trust policy operator. Jangan sertakan private key.
4. Jika Evidence Attestation belum memiliki signature, gunakan `content-evidence-origin.js --payload-out ...`, tanda tangani payload melalui HSM/KMS/exporter milik operator, lalu assemble envelope dari signature base64.
5. Setelah owner review memang selesai, `ADOPTION-REQUEST.json` harus membawa `approval.authority: owner-release`, `approved:true`, dan bounded `reviewId` yang nyata.

Kemudian jalankan/verifikasikan:

```bash
node content-evidence-origin.js --verify \
  --origin EVIDENCE-ORIGIN-ENVELOPE.json \
  --attestation ADOPTION-EVIDENCE-ATTESTATION.json \
  --request ADOPTION-REQUEST.json \
  --trust-policy EVIDENCE-ORIGIN-TRUST-POLICY.json

node content-adoption-rehearsal.js \
  --request ADOPTION-REQUEST.json \
  --origin-trust-policy EVIDENCE-ORIGIN-TRUST-POLICY.json \
  --out REHEARSAL-OUTPUT
```

Jika file evidence/trust policy hanya tersedia melalui URL privat, dashboard, bucket, repository private, atau sistem yang memerlukan credential yang tidak tersedia bagi AI, owner harus mengekspor atau mengunduh file tersebut lalu melampirkannya/menempatkannya di workspace. Setelah file tersedia secara lokal, AI dapat melanjutkan verifikasi tanpa meminta private credential.

Jangan pernah memberikan private signing key, password, bearer token, VAPID private key, atau credential produksi ke source archive.
