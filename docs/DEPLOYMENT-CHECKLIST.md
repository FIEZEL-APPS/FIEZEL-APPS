# FIEZEL 5.18.0 - Core Brain Activation Checklist

## Before deployment
- [ ] Full source gates PASS.
- [ ] `npm run core:preflight` source/security/Core 1.7 checks PASS.
- [ ] Puter CLI/session atau `PUTER_AUTH_TOKEN` tersedia pada trusted deployment environment.
- [ ] VAPID private key dan cron token disimpan sebagai secret; tidak pernah masuk runtime/repo public.

## Worker
- [ ] Deploy `fiezel-core-worker.js` ke operator-owned Worker.
- [ ] `/health` mengembalikan `protocol: 1.7`, `aiGateway: core-only`, `learner-evidence-v1`, `adaptive-policy-v1`, `policy-outcome-v1`, `context-coach-v1`, `content-qa-v1`, `guarded-content-patch-v1`, `content-self-refine-v1`, `evolution-config-v1`, dan `alrs`.
- [ ] `/api/push/public-key` configured.
- [ ] Unauthenticated AI/policy/outcome/coach requests ditolak; non-owner Content QA review ditolak.
- [ ] Authenticated `/api/policy/next` menghasilkan schema `fiezel-adaptive-policy-v1`.
- [ ] Authenticated `/api/policy/outcome` menerima bounded `fiezel-policy-outcome-v1` dan tidak menyimpan raw fields.
- [ ] Authenticated `/api/coach/context` menjawab melalui Core server-side model dan tidak mengganti deterministic policy.
- [ ] Owner-only `/api/content/qa/review` mengembalikan schema `fiezel-content-qa-v1` dan `authority: advisory-only`.
- [ ] Tidak ada endpoint `/api/content/qa/apply` atau `/api/content/qa/publish`.
- [ ] Owner-only `/api/evolution/config` menerima `fiezel-autonomy-config-v1`; level `full` wajib `ownerApproved + ownerRef UUID + approvedAt`; konfigurasi invalid ditolak 400.
- [ ] Owner-only `GET /api/evolution/status` menampilkan config + ledger hash-chain (`chainOk`); ledger yang di-tamper terdeteksi.
- [ ] Owner-only `/api/content/self-refine` mematuhi level otonomi: advisory -> hold `advisory-only`; halt -> 503; canary/full -> candidate-only dengan `gateStatus: UNVERIFIED_LOCAL_GATES_REQUIRED`; AI rate limit tetap berlaku.
- [ ] Upload config owner via `/api/evolution/config` dari `fiezel-autonomy-config.json` (live file lokal, di-gitignore; template di `fiezel-autonomy-config.example.json`).

## Static PWA
- [ ] Jalankan `core-live-smoke.mjs` sebelum mengisi Worker URL.
- [ ] Jalankan `core-activate.mjs` hanya setelah smoke PASS.
- [ ] Rerun full gates setelah `core-config.js` berubah.
- [ ] Deploy HTTPS dan pastikan service-worker cache version benar.

## Real-device proof
- [ ] Notification permission accepted.
- [ ] Push subscription tersimpan.
- [ ] FIEZEL ditutup.
- [ ] Scheduler/dispatcher memicu reminder eligible.
- [ ] Notification diterima di perangkat nyata.
- [ ] Click notification membuka FIEZEL pada target yang benar.
- [ ] Quiet hours/cooldown/one-per-day guard terverifikasi.

Jangan menandai remote push **LIVE** sebelum seluruh real-device proof selesai.