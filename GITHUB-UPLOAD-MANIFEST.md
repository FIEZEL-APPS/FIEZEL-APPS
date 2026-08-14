# FIEZEL 5.18.0 GitHub Essential

Repository/deployment package mempertahankan seluruh runtime dependency, canonical data, PWA/Creator/Core tooling, licenses, CI, dan executable core quality gates.

Tambahan wajib 5.18:

- `features/speaking-listening/**`;
- `features/neural-voice/**`;
- `vendor/kokoro-js/**`;
- `vendor/kokoro-model/**`;
- `NEURAL-VOICE-SOURCE-LOCK.json`;
- `speaking-listening-test.js`;
- `rebuild-speaking-listening-data.js` karena menjadi dependency idempotence gate;
- `neural-voice-test.js`;
- `neural-voice-http-test.js`.

Walaupun besar, model q8 dan WASM tidak boleh dikeluarkan dari GitHub Essential karena keduanya adalah runtime dependency local neural voice. File model tunggal berukuran 92.361.116 byte, di bawah batas 100 MiB GitHub.

GitHub Essential harus memuat hidden `.github/workflows/*` dan `.gitignore`. Generated reports/proofs, internal handoff prompt, dan rebuild script lain yang tidak menjadi dependency CI tetap FULL-only.
