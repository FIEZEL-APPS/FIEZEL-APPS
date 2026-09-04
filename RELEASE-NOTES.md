# FIEZEL 5.18.0 — Speaking, Listening, dan Local Neural Voice

## Version decision

**5.17.0 → 5.18.0 (MINOR).** Build menambah domain belajar dan runtime voice baru secara backward-compatible. Canonical learner state `fiezel-v4-state`, canonical content IDs, grammar schema, practice blueprint, Core protocol, serta backend namespace lama tetap dipertahankan.

## Added

- Skills Lab route dan kartu Home untuk Speaking + Listening tanpa menambah bottom navigation keenam.
- 36 Listening items dan 36 Speaking items, enam item per level per domain.
- Isolated aggregate evidence store `fiezel-sl-v1-state`.
- Explicit neural voice preparation UI dengan progress asset.
- Patched Kokoro.js 1.2.1 browser bundle, q8 ONNX model, enam locked voices, ONNX Runtime Web WASM, dan dependency licenses.
- Source lock berisi immutable upstream commits, asset sizes, dan SHA-256.
- Gate baru: `speaking-listening-test.js`, `neural-voice-test.js`, dan `neural-voice-http-test.js`.

## Repairs from audit

- Memperbaiki beberapa sample Speaking yang gagal memenuhi scoring target miliknya sendiri.
- Mengganti open-response keyword scoring dengan concept-group coverage yang menerima wording alternatif terkontrol.
- Mengunci kontrol jawaban Listening sampai audio sukses, sehingga item tidak dapat dinilai tanpa stimulus.
- Memastikan raw audio/transcript/dictation tidak masuk persistent state.
- Menambahkan lifecycle cleanup ketika pengguna meninggalkan Skills Lab.
- Menghapus implicit service-worker caching untuk neural assets besar; hanya explicit user opt-in yang dapat mengisinya.
- Membatalkan stale `prepared` state jika cache perangkat tidak lagi lengkap.
- Membatasi fallback offline hanya untuk navigasi, sehingga request binary yang gagal tidak menerima `index.html`.
- Memperbaiki release-audit temp routing agar portabel pada environment tanpa `/tmp`.
- Memperbaiki kegagalan persiapan neural voice pada device dengan Cache Storage terbatas (mis. iOS Safari): body aset di-buffer penuh sebelum `cache.put` (Safari streaming-safe), dan bila kuota cache menolak, aset diunduh ke memori dengan mode `memory` — UI menampilkan peringatan "mode memori" plus saran memasang ke Layar Utama agar tersimpan permanen.
- Menambahkan 2 assertion bootstrap (buffered body + memory fallback); gate audit disesuaikan ke **28 assertion neural voice**.

## Automated evidence

- Release Audit: **145 PASS / 0 FAIL**.
- Product Audit: **49 PASS / 0 FAIL**.
- Grammar Quality: **24 PASS / 0 FAIL**.
- Speaking + Listening: **25 PASS / 0 FAIL**.
- Neural Voice: **28 PASS / 0 FAIL**.
- Grammar runtime: 3.225 questions; 0 cross-lesson duplicates; 0 focus leaks.
- Content QA: 0 blocker / 61 bounded review candidates.
- Model HTTP: exact HEAD sizes and 1.024-byte Range response PASS.

## Remaining promotion gate

Source and asset closure sudah PASS, tetapi `realDeviceGate` tetap `PENDING`. Build tidak boleh dipromosikan sebagai production-ready sampai cold start, peak memory, latency, offline synthesis, audio unlock, interruption, dan zero cross-origin runtime trace terbukti pada perangkat target.

## Autonomous Brain (evolution loop)

Menambahkan modul otonom yang berjalan di memori tanpa menyentuh canonical sampai bukti lolos:

- `fiezel-meta-learning.js` — insight dari leaderboard aggregate (weak accuracy, trend, retention risk) tanpa raw answers.
- `fiezel-prompt-library.js` + `fiezel-prompt-library.json` — template prompt per domain (grammar/vocabulary/reading/listening/speaking), slot render, secret scan, bounds.
- `fiezel-evolution-ledger.js` — hash-chained append-only log (genesis/append/verify/prune) dengan 10 event.
- `fiezel-autonomy-config.js` — level otonomi advisory/canary/full; fail-closed; `halt` darurat; level full wajib `ownerApproved + ownerRef + approvedAt` eksplisit.
- `fiezel-self-refine.js` — orkestrator candidate-only: insight → prompt → AI → `content-patch-gate` → `content-promotion` → `adoptionReady` (hanya di level full + auto-adopt + evidence).
- `fiezel-evolution-loop.js` — loop end-to-end (max 8 insight/siklus) + ledger.
- **Core Worker 5.18.0**: endpoint `POST /api/evolution/config`, `GET /api/evolution/status`, `POST /api/content/self-refine` (owner-only, candidate-only, `gateStatus: UNVERIFIED_LOCAL_GATES_REQUIRED`, ledger hash-chain di KV, advisory hold). Library prompt di-embed agar worker self-contained; parity dengan file JSON diverifikasi test.
- Konfigurasi owner: `fiezel-autonomy-config.example.json` (template). File live `fiezel-autonomy-config.json` di-gitignore.

Evidence: 98/98 assertion modul baru + contract test evolution endpoints PASS.

## App-update notification

Saat build baru tiba di perangkat user (PWA yang sudah terpasang), FIEZEL memberi tahu sekali per versi:

- Toast in-app `FIEZEL telah diperbarui ke v5.18.0` pada pembukaan pertama versi baru.
- Jika izin notifikasi sudah granted, sistem juga menampilkan notifikasi `FIEZEL diperbarui`.
- Tidak berulang untuk versi yang sama (`fiezel.seenAppVersion`).
