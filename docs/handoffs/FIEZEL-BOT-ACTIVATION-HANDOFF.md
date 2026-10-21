# FIEZEL BOT — Handoff Aktivasi Penuh (2026-10-05)

## Ringkasan
Fiezel Bot (Autonomous AI Reviewer & Auto-Fix) diaktifkan penuh setelah audit
keamanan dan perbaikan lima akar masalah yang membuatnya "mati".

## Akar Masalah & Perbaikan
| # | Akar masalah | Perbaikan | PR |
|---|---|---|---|
| 1 | Workflow berstatus `disabled_manually` di GitHub | Di-enable → `active` | — |
| 2 | Workflow meng-checkout branch PR, sedangkan `tools/fiezel-bot.mjs` hanya ada di `main`, sehingga `node` gagal senyap pada semua PR lama | Menarik mesin (dan `bump-build.mjs`) dari `origin/main` bila tidak ada di branch | #497 |
| 3 | `gh pr diff` menolak PR > 300 berkas (HTTP 406); `gh pr view --json files` kosong → review melaporkan "0 berkas" | Fallback berlapis: `git diff origin/main...HEAD` + API `pulls/files --paginate` | #498 |
| 4 | Secret `GEMINI_API_KEY` repo kadaluarsa (HTTP 401) | Secret diperbarui dengan kunci valid | — |
| 5 | Nama model Gemini tidak valid (`gemini-2.5-pro` 404, `gemini-flash-latest` 503) | `gemini-3.5-flash` + fallback `gemini-3.8-flash` → `gemini-flash-lite-latest` → `gemini-flash-latest` | #499 |

## Pengerasan Keamanan (PR #496)
- Trigger `issue_comment` dihapus (menutup jalur push anonim).
- PR/run dari fork ditolak; gate aktor keras `FIEZEL-APPS`.
- Seluruh ekspresi `${{ }}` dipindah keluar dari blok `run:` (anti script injection).
- Patch jail: menolak path absolut/traversal/`.git`/`.github`/`node_modules`.
- Heal menolak log kosong (anti patch karangan) dan menolak branch terproteksi.
- Push hanya berkas yang dipatch (bukan `git add -A`).

## Konfigurasi Proteksi Branch `main`
- `required_status_checks`: **Auto PR Review & Invariant Audit** (app: GitHub Actions).
- `strict: false` (tidak memaksa branch selalu up-to-date).
- `enforce_admins: false` (MASTER dapat bypass darurat).
- Force-push & penghapusan branch dilarang.

## Verifikasi
- `tests/fiezel-bot-test.js` → 12/12 PASS.
- Uji live pada PR #460: review terposting, 15 berkas/4 subsistem terbaca, lapisan AI = Google Gemini (gemini-3.5-flash) dengan temuan semantik nyata.
- Workflow `active`; trigger: `pull_request`, `workflow_run`, `workflow_dispatch`.

## Catatan
- `GROQ_API_KEY` sengaja belum dipasang (atas keputusan owner); bot tetap berfungsi dengan Gemini dan fallback deterministik.
