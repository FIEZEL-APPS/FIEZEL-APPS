# FIEZEL R1 — 5.18.x Device Readiness — OWNER ACTION REQUIRED

Schema: `fiezel-owner-action-required-v1` | Generated: 2026-08-14 | Status: **BLOCKED on physical devices**

## Apa yang di-block dan mengapa

Gate **R1 Device Readiness** (roadmap baris 21–31) membutuhkan bukti pada perangkat fisik nyata:

- **iPhone 12** dengan PWA terpasang (Installed PWA), dan
- **minimal satu Android kelas menengah**,

dengan bukti offline synthesis berhasil setelah warmup, tanpa crash. Bukti ini **tidak dapat dihasilkan agent**:

1. Tidak ada perangkat fisik / emulator yang terkonfigurasi di environment ini.
2. Network-trace proof lintas-origin harus diambil dari jaringan perangkat sungguhan (DevTools/Chrome remote debugging / Safari Web Inspector).
3. Metrik cold start, peak memory (Android Profiler / iOS Instruments), dan audio unlock hanya sah bila diukur di perangkat target; synthetic proof dilarang menggantikan bukti perangkat (roadmap: "Synthetic proof tidak menggantikan bukti perangkat atau produksi").

Sesuai stop rules handoff section 22, ini ditulis sebagai `OWNER ACTION REQUIRED` — bukan meminta user mengerjakan pekerjaan yang bisa dilakukan agent, dan **tanpa mengarang evidence**.

## Yang perlu dilakukan owner (di perangkat fisik)

1. Deploy/serve FULL 5.18.0 tree (atau GitHub Essential 5.18.0) melalui HTTPS.
2. Instal PWA di iPhone 12 (Safari → Share → Add to Home Screen) dan satu Android kelas menengah (Chrome → Install app).
3. Tekan tombol **Siapkan suara offline** (warmup) hingga indikator "offline ready" muncul; catat ukuran unduhan, progres, sisa ruang, dan waktu warmup.
4. Jalankan 1–2 sesi Listening (audio harus unlock dan berhasil diputar) dan 1 sesi Speaking.
5. Matikan jaringan (Airplane Mode / offline) → sintesis suara harus tetap berfungsi.
6. Biarkan app di background, lalu kembali → tidak boleh crash; interruption (telepon masuk / audio lain) harus tertangani; cleanup tidak bocor.
7. Ambil network trace dari perangkat: pastikan **tidak ada** permintaan model, voice, atau inference ke origin lain (browser speech fallback boleh, tapi neural voice harus lokal).
8. Upgrade PWA sekali (deploy ulang tree dengan versi cache baru) → pastikan cache lama tidak tercampur.
9. Catat diagnostics: cold start (detik), peak memory (MB), time-to-first-audio (ms), repeat latency (ms).

## Evidence yang harus diserahkan

- Screenshot/recording per perangkat (installed PWA, warmup selesai, offline synthesis OK).
- Angka diagnostics di atas untuk kedua perangkat.
- Network trace (DevTools HAR / Safari) yang membuktikan nol cross-origin model/voice/inference.
- Versi browser/OS per perangkat.

## Status saat ini (tidak berubah oleh artifact ini)

- `NEURAL-VOICE-SOURCE-LOCK.json` → `promotion.realDeviceGate: PENDING`, `productionClaim: false`.
- `QUALITY-GATE-EVIDENCE.json` → `releaseDecision: NOT READY`, blocker `real_device_neural_voice_gate_pending`.
- Release **tidak** boleh disebut production-ready / live sebelum R1 exit gate terpenuhi.

## Yang boleh dilakukan sebelum owner action selesai

- Audit, build, repair lokal; semua gate otomatis (32/32 PASS dari FULL tree).
- Menyiapkan skrip/panduan pengukuran untuk perangkat (lihat `DEPLOYMENT-CHECKLIST.md`, `GITHUB-UPLOAD-MANIFEST.md`).
- Menyiapkan paket GitHub Essential 5.18.0 (belum di-push).