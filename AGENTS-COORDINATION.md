# FIEZEL Agent Coordination Protocol (v1.2)

Semua agent opencode yang bekerja pada repo ini WAJIB baca file ini SEBELUM
melakukan tindakan apa pun, dan WAJIB update `TASKS-LEDGER.json` setelah selesai
satu unit kerja. Ini satu-satunya sumber kebenaran tentang siapa mengerjakan apa.

## Aturan Emas

1. **Baca-dulu-sebelum-bertindak.** Sebelum mulai: `git fetch origin`, cek
   `git log origin/main --oneline -5`, cek CI (`gh run list --limit 5`), lalu
   baca `TASKS-LEDGER.json`. Jangan pernah bekerja dengan asumsi state repo.
2. **Satu penulis per file per waktu.** Jika ledger menunjukkan file sedang
   dikerjakan agent lain, TUNGGU atau ambil area lain. Tidak ada dua agent
   yang menulis file yang sama secara bersamaan.
3. **Clone/kerjaan terpisah.** Tiap agent bekerja di direktori sendiri
   (`Temp\opencode\<nama-clone>`). Jangan pakai direktori kerja agent lain.
4. **Komunikasi lewat artefak.** Laporan antar agent lewat: commit message,
   `TASKS-LEDGER.json`, `AGENTS-COORDINATION.md` (hanya perubahan prosedur),
   dan CI. Tidak ada obrolan langsung antar sesi.
5. **Verifikasi > asumsi.** Semua klaim perbaikan harus punya bukti: test
   lokal dijalankan + CI hijau + (jika klaim tentang device) diagnostik dari
   device. Label status wajib jujur (lihat ledger).
6. **Jangan ubah kontrak tanpa alasan.** `NEURAL-VOICE-SOURCE-LOCK.json` dan
   kontrak `FiezelVoiceRuntime` hanya boleh berubah dengan alasan eksplisit
   yang dicatat di ledger.
7. **Owner yang memutuskan.** Konflik antar agent tidak diselesaikan antar
   agent; dicatat di ledger sebagai `BLOCKED` dan ditanyakan ke owner.

## Siklus Kerja Agent

1. Baca ledger + sync repo + cek CI.
2. Ambil tugas dari daftar `pending` (klaim: ubah `owner` dan `status=in_progress`
   pada commit pertama).
3. Kerjakan di clone sendiri. Push ke branch sendiri atau main dengan
   commit message ber-prefix `[5.19.0] <kegiatan>`.
4. Jalankan test lokal yang relevan + pastikan CI hijau.
5. Update ledger: `status=done|blocked|failed` + `evidence` (test/CI/diagnostik).
6. Laporkan ke owner lewat ringkasan singkat di sesi masing-masing.

## Definisi Status (wajib jujur)

- `done` — kode berubah + diuji (test lokal/CI) + jika klaim device: bukti device.
- `changed-not-tested` — kode berubah, belum diuji.
- `blocked` — menunggu keputusan owner atau bukti dari device.
- `pending` — belum dikerjakan.
- `failed` — dicoba, gagal, dan penyebabnya tercatat.

## Peran

- **Owner** (manusia): pengambil keputusan akhir; hanya memperhatikan.
- **Main Coordinator (Agent 5)**: menerima task user, menganalisis, membagi pekerjaan
  ke worker pool (agent-1..4), meminta verifikasi ke verifier, menangani failure/
  remediation loop, dan memberi final report. Satu-satunya yang mendelegasikan.
- **Coordinator** (observer): memetakan tugas, memantau CI/ledger, menegakkan protokol.
- **Implementer / Worker (agent-1..4)**: menulis/mengubah kode aplikasi dalam scope
  yang didelegasikan Agent 5. Tidak boleh mendelegasikan ke agent lain (depth 1).
- **Verifier**: menjalankan test, memeriksa CI, memvalidasi klaim (read-only).
- **Observer**: memantau repo/CI/sesi dan melaporkan perubahan.

## Orkestrasi (Agent 5 sebagai Main Coordinator)

Hierarki tetap depth 1:

```
Agent 5 (Main Coordinator)
├── worker pool: agent-1 .. agent-4   (implementasi dalam scope)
└── verifier                          (verifikasi read-only, verdict VERIFIED/REFUTED/UNVERIFIED)
```

Alur: USER → Agent 5 → ANALYZE → PLAN → DELEGATE (worker) → TEST → VERIFIER →
PASS/DONE atau FAIL → kembali ke WORKER → perbaikan → test → verifikasi ulang → DONE.
Agent 5 tidak menyatakan selesai hanya karena worker melapor "done"; wajib ada
verifikasi + bukti (test lokal/CI/evidence device).

## Protokol Pelengkap (WAJIB dibaca semua agent)

`FIEZEL-Orkestrasi-Protokol-Pelengkap.md` (root repo) melengkapi protokol ini dan
WAJIB dibaca ulang di setiap sesi baru sebelum memproses request FIEZEL. Empat
titik kontrol wajib:

1. **SCOPE-LOCK** — setiap delegasi Agent 5 → worker wajib memakai format
   `scope.files_allowed / files_forbidden / objective / forbidden_actions /
   done_when / evidence_required`. Task tanpa field lengkap DITOLAK oleh worker.
   Worker berhenti & lapor jika menemukan kebutuhan di luar scope — dilarang
   "sekalian dibenerin". Agent 5 wajib cek overlap scope antar worker di tahap
   PLANNING, bukan menyerahkannya ke INTEGRATE.
2. **CONTEXT-INJECTION** — jika root cause sudah diketahui (CONFIRMED/SUSPECTED),
   Agent 5 wajib menyuntikkan blok `root_cause_context` (summary, evidence,
   previously_attempted_fixes, do_not_repeat) ke worker. Worker dilarang
   re-investigasi dari nol; jika meragukan, ajukan ke Agent 5 SEBELUM ganti
   pendekatan.
3. **CHECKLIST VERIFIER (6 poin)** — verifier wajib menjalankan satu per satu:
   DIFF CHECK (perubahan hanya di files_allowed), EVIDENCE CHECK (bukti eksekusi
   nyata), OBJECTIVE CHECK (done_when tercapai satu per satu), REGRESSION CHECK
   (fitur yang sudah berhasil tetap jalan), FORBIDDEN-ACTION CHECK (larangan
   dilanggar = REFUTED otomatis), CI CHECK (hijau, tidak di-skip). Output hanya
   VERIFIED / REFUTED / UNVERIFIED.
4. **KRITERIA SELESAI Agent 5** — sebelum FINAL REPORT: SEMUA subtask VERIFIED
   (bukan sebagian), status tiap gejala disebutkan terpisah, regresi yang
   ditemukan verifier dilaporkan eksplisit, dan laporan membedakan "lolos test
   otomatis" vs "perlu konfirmasi manual di device".

## Area Kerja Saat Ini

| Area | File utama | Status |
|------|-----------|--------|
| Neural voice init | features/neural-voice/fiezel-neural-voice-bootstrap.js | lihat ledger |
| Browser TTS fallback | features/neural-voice/fiezel-neural-voice-audibility-fix.js | lihat ledger |
| iOS asset caching | features/neural-voice/fiezel-neural-voice-ios-cache-fix.js | lihat ledger |
| SW / COI | sw.js | lihat ledger |
| UI/UX voice | app.js | lihat ledger |

Versi protokol ini: v1.2 (2026-08-14). v1.1: Agent 5 ditetapkan sebagai Main Coordinator
(worker pool agent-1..4 + verifier, depth 1); protokol squad v1 tetap berlaku. v1.2:
FIEZEL-Orkestrasi-Protokol-Pelengkap.md ditetapkan sebagai bacaan wajib (scope-lock,
context-injection, checklist verifier 6 poin, kriteria selesai). Perubahan
protokol hanya oleh Coordinator dengan persetujuan Owner.