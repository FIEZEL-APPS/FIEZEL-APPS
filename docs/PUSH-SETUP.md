# FIEZEL 5.15.0 — Core Brain + Remote Web Push Activation

Source sudah memiliki Web Push architecture, Core-only AI, Learner Evidence, ALRS, Adaptive Policy, Policy Outcome, Context-Aware Coach, dan Content QA Agent. Aktivasi live memerlukan operator-owned Puter deployment dan secrets yang tidak dibundel.

## Activation sequence

1. Siapkan Puter CLI/session milik operator atau `PUTER_AUTH_TOKEN` pada environment deployment.
2. Generate VAPID + cron secrets dengan `npm run push:secrets`; simpan private values hanya sebagai deployment secrets.
3. Deploy `fiezel-core-worker.js` sebagai operator-owned Puter Worker.
4. Konfigurasikan Worker VAPID public/private key dan cron auth sesuai deployment environment.
5. Jalankan `npm run core:smoke`; wajib melaporkan **protocol 1.7**, `core-only`, capability `learner-evidence-v1`, `adaptive-policy-v1`, `policy-outcome-v1`, `context-coach-v1`, `content-qa-v1`, `guarded-content-patch-v1`, `alrs`, dan push configured.
6. Jalankan `npm run core:activate -- https://<worker>.puter.work` untuk menulis URL public yang sudah divalidasi ke `core-config.js` secara lokal.
7. Jalankan ulang seluruh quality gates setelah config berubah.
8. Deploy static PWA melalui HTTPS.
9. Subscribe push pada perangkat Jahran dan lakukan real-device closed-app test.
10. Aktifkan scheduler hanya setelah test manual end-to-end berhasil.

## Success criteria

- `/health` protocol `1.7`, `aiGateway: core-only`, dan capability policy-outcome/context-coach/content-qa tersedia;
- `/api/push/public-key` mengembalikan VAPID public key configured;
- authenticated `/api/policy/next` mengembalikan `fiezel-adaptive-policy-v1`;
- authenticated `/api/policy/outcome` menyimpan bounded `fiezel-policy-outcome-v1` tanpa raw answer/history;
- authenticated `/api/coach/context` memakai deterministic policy sebagai authority;
- owner-only `/api/content/qa/review` menerima bounded `fiezel-content-qa-v1` candidate dan mengembalikan `advisory-only` review;
- tidak ada Content QA apply/publish endpoint;
- unauthenticated learner/policy/outcome/coach/AI request dan non-owner Content QA review ditolak;
- push dapat masuk ketika FIEZEL UI tertutup pada perangkat/browser yang mendukung Web Push;
- tidak ada VAPID private key, cron token, Puter auth token, atau vendor AI key di runtime ZIP/repository.

## Current source status

Build 5.15.0 menyiapkan activation tooling tetapi tidak mengklaim live deployment. `core-config.js` sengaja tetap kosong sampai Worker operator lulus smoke test.
