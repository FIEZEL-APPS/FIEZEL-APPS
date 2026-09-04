# FIEZEL 5.15.0 — Autonomous Content Promotion v1

FIEZEL 5.15.0 menambahkan promotion authority deterministik untuk menaikkan Guarded Content Patch dari bounded canary menjadi **active overlay**. Promotion tidak pernah menulis `vocabulary-master.json`, `grammar-templates.json`, atau `reading-bank.json`; canonical baseline tetap fallback yang immutable.

## Contract

- Schema keputusan: `fiezel-content-promotion-v1`.
- Input hanya config canary yang sudah lolos Guarded Patch gate dan evidence agregat `fiezel-content-canary-evidence-v1`.
- Threshold tidak berasal dari AI atau config runtime dan tidak dapat diturunkan oleh candidate.
- Promotion hanya berjalan saat canary masih valid, belum expired, source/hash/candidate tetap konsisten, dan tidak ada prior runtime rollback.
- Keputusan yang sah: `hold`, `promote`, atau `rollback`.
- `promote` berarti patched clone menjadi active overlay; canonical JSON tidak dimutasi.

## Evidence threshold

Promotion memerlukan seluruh syarat berikut:

- minimal 3 canary exposure sessions;
- minimal 8 control attempts pada konten canonical target;
- minimal 8 canary attempts pada overlay target;
- canary accuracy minimal 70%;
- canary accuracy tidak boleh lebih dari 5 percentage points di bawah control accuracy.

Control evidence dikumpulkan dari canonical content yang diberi metadata runtime `phase:'control'`; isi pedagogisnya tidak diubah. Canary outcome menggunakan `phase:'canary'`. Setelah promotion, outcome menggunakan `phase:'promoted'`.

## Post-promotion rollback

Setelah minimal 5 promoted attempts, active overlay dievaluasi lagi. Runtime fail closed ke canonical jika promoted accuracy:

- di bawah 60%; atau
- lebih dari 10 percentage points di bawah control accuracy.

Expiry, stale source, candidate digest mismatch, atau prior rollback juga tetap menghentikan promotion.

## Audit ledger dan privacy

`contentCanaryMeta.promotionLedger` menyimpan maksimal 20 entry agregat. Entry hanya memuat timestamp, status/reason, patch ID, attempt counts, dan accuracy. Raw answer, selected answer, raw history, dan private learner history tidak masuk ledger. Entry identik tidak diduplikasi.

Satu learner dan sedikit attempt tidak dianggap bukti kausal. Threshold ini adalah guard deterministik untuk active overlay, bukan klaim eksperimen statistik atau causal certainty.

## Release behavior

Build distribusi 5.15.0 tetap mengirim `content-canary-config.js` dalam keadaan `enabled:false` / `mode:'off'`. Controlled proof membuktikan promotion engine dan rollback contract tanpa mengaktifkan learner-facing promotion.

Proof executable:

```bash
node content-canary-test.js
node content-promotion-test.js
```

`content-promotion-test.js` menulis `CONTENT-PROMOTION-PROOF.json`.
