# FIEZEL 5.18.0 Repository Reconciliation Ledger

Schema: `fiezel-repository-reconciliation-ledger-v1` | Generated: 2026-08-14

## Verdict

**PASS — source of truth ditetapkan: FULL ZIP tree 5.18.0. GitHub main tetap 5.17.0 tanpa perubahan (tidak ada push).**

## Evidence

### 1. GitHub main (5.17.0)

- HEAD: `e0d8d83b056f3b0834ac01cad64ffa8f75a5a968` — `[closed-app-proof] Send iPhone proof after live route verification`
- VERSION.json `5.17.0`, version.js `5.17.0`, package.json `5.17.0`
- Branch tunggal `main`; full history (25+ commits terakhir) menunjukkan pekerjaan closed-app push proof 5.17, **tanpa** fitur 5.18 (tidak ada `features/`, `vendor/`, Speaking/Listening, atau Neural Voice).
- ROADMAP.md repo: status `5.17.0 PRODUCTION EVIDENCE ORIGIN VERIFICATION SOURCE DONE / real production rehearsal OWNER ACTION REQUIRED`.

### 2. FULL 5.18.0 (ZIP)

- 145 file, 123.050.589 byte; manifest checksum: `FIEZEL-5.18.0-BASELINE-CHECKSUM.json`
- Struktur lengkap: `features/neural-voice`, `features/speaking-listening`, `vendor/kokoro-js` (+`wasm`, `licenses`), `vendor/kokoro-model` (+`onnx`, `voices`), `.github/workflows` (4 workflow).
- Model ONNX q8: `vendor/kokoro-model/onnx/model_quantized.onnx` = 92.361.116 byte (di bawah limit 100 MiB GitHub), sha256 `fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478` — konsisten dengan `NEURAL-VOICE-SOURCE-LOCK.json`.

### 3. Lineage

| Aspek | Repo main 5.17.0 | FULL 5.18.0 | Status |
|---|---|---|---|
| vocabulary-master.json | `2482da...` | `2482da...` | IDENTICAL |
| reading-bank.json | `f399c9...` | `f399c9...` | IDENTICAL |
| grammar-templates.json | `CF9400...` | `AC17FF...` | DIFFERENT (version bump → 5.18.0; schema 2.0.0 & blueprint focused-25-v1 tetap) |
| File statis (icon/svg) | — | — | IDENTICAL |

Kesimpulan: konten canonical learner identik byte → 5.18.0 adalah keturunan langsung baseline 5.17.0.

### 4. Perbandingan workspace flatten (`Desktop\penting\semua`)

- 112 file identik dengan ZIP; **32 file struktur hilang** di folder flatten (file `features/**`, `vendor/**`, `.github/workflows/**` diletakkan flattened di root).
- Implikasi: **folder flatten BUKAN tree yang dapat menjalankan suite penuh** — verifikasi pertama di folder flatten gagal 6/32 hanya karena path struktur, bukan karena konten.
- Suite penuh dijalankan dari tree ZIP: **32/32 PASS** (lihat `FIEZEL-5.18.0-SUITE-RERUN-EVIDENCE.json`).
- Semua report yang diregenerasi gate (release audit, product audit, grammar, proof JSON, dll.) **byte-identik** dengan yang diarsipkan — deterministik. `CONTENT-QA-REPORT.json` hanya berbeda field `generatedAt`; substansi identik.

## Keputusan

1. **Source of truth** = tree `FIEZEL-5.18.0-FULL` dari ZIP (bukan folder flatten, bukan repo main).
2. **GitHub main tidak diubah** — tetap 5.17.0 di commit `e0d8d83`; push/promosi 5.18.0 butuh otorisasi eksplisit.
3. **Rollback source** bila perlu: repo main `e0d8d83` + canonical sha256 lama (grammar `e6af40a2...`, vocabulary `2482dab7...`, reading `f399c98a...`).
4. **Release decision**: `NOT READY` — `realDeviceGate: PENDING` (lihat `NEURAL-VOICE-SOURCE-LOCK.json` promotion).
5. **External action**: NONE.

## Lampiran

- `FIEZEL-5.18.0-BASELINE-CHECKSUM.json` — checksum 145 file.
- `FIEZEL-5.18.0-SUITE-RERUN-EVIDENCE.json` — 32/32 command PASS (exit code 0).