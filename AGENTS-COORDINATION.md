# FIEZEL Agent Coordination Protocol (v1)

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
- **Coordinator**: memetakan tugas, memantau CI/ledger, menegakkan protokol.
- **Implementer**: menulis/mengubah kode aplikasi.
- **Verifier**: menjalankan test, memeriksa CI, memvalidasi klaim.
- **Observer**: memantau repo/CI/sesi dan melaporkan perubahan.

## Area Kerja Saat Ini

| Area | File utama | Status |
|------|-----------|--------|
| Neural voice init | features/neural-voice/fiezel-neural-voice-bootstrap.js | lihat ledger |
| Browser TTS fallback | features/neural-voice/fiezel-neural-voice-audibility-fix.js | lihat ledger |
| iOS asset caching | features/neural-voice/fiezel-neural-voice-ios-cache-fix.js | lihat ledger |
| SW / COI | sw.js | lihat ledger |
| UI/UX voice | app.js | lihat ledger |

Versi protokol ini: v1 (2026-08-14). Perubahan protokol hanya oleh Coordinator dengan persetujuan Owner.