# FIEZEL BOT — Honest Runtime Probe & Superseded Findings (HANDOFF)

- **Tanggal**: 2026-10-05
- **Basis**: `origin/main` @ `97a84524` (merge #512; build `m025-482`)
- **Branch kerja**: `feat/fiezel-bot-honest-runtime-probe`
- **Jenis**: tiga peningkatan mesin review/heal (CI/tooling) — **bukan** fitur/UI murid
- **Bump build**: **TIDAK** dilakukan oleh PR ini. `main` sudah berada di `m025-482` (dari #512); PR ini tidak menyentuh aset cangkang PWA, hanya `tools/` dan workflow bot.

> **Catatan merge-order.** Saat PR ini pertama dibuka, `main` (e17fe4b0) sedang merah karena #510/#511 meninggalkan artefak turunan basi (`id-golden-baseline.json`, `cloze-bank-v1.json`, `grammar-explanations-id.json`) dan membocorkan 5 entri `ASSETS` tanpa berkas ke `sw.js` (dari PR #508). Selama pengerjaan, PR #512 (grammar) di-merge dan sudah memperbaiki semua cacat itu (`sw.js` bersih, build `m025-482`). Karena itu, saat merge `origin/main` ke PR ini, konflik pada artefak diselesaikan dengan **mengambil versi `main`**, sehingga PR ini kembali fokus murni pada perubahan bot.

---

## a) Ringkasan temuan audit & alasan perubahan

Tiga kelemahan nyata dari audit mesin `tools/fiezel-bot.mjs` dan log kasus **PR #506**:

1. **Temuan inline usang tetap tampak "terbuka".** Bot sudah punya penilaian metrik (`classifyFindingThread`) untuk `isOutdated`/`isResolved`, tetapi tidak pernah **menandai** thread lama yang kodenya sudah diganti/diperbaiki.
2. **Verifikasi temuan hanya "kutipan ada", bukan "gejala nyata".** `verifyFindings` mencocokkan `evidence` dengan baris sumber. Itu membuktikan baris itu **ada**, bukan bahwa bug-nya **nyata** — temuan padding pada kelas CSS mati `.view-container` di #506 lolos justru karena kutipan CSS-nya memang ada.
3. **Kuota LLM dibakar sia-sia & alasan heal tidak jujur.** Satu panggilan menghabiskan 23 kunci Gemini (429/401) lalu berhenti, dan laporan heal hanya berkata `unfixable` — bukan sebab persis (`blok SEARCH tidak cocok di style.css`).

**Perubahan (tiga item yang disetujui):**

- **Item #1 — tandai temuan usang.** Helper murni `selectSupersededFindings()` + mode `resolve` (`runResolve`) memakai `gh api graphql`; idempoten via marker `<!-- fiezel-bot-superseded:ID -->`. Workflow memanggilnya setelah temuan inline diposting.
- **Item #2 — verifikasi eksekusi.** `tools/fiezel-bot-probe.mjs` menjalankan aplikasi di Chromium Playwright, memblokir rute eksternal, merekam `pageerror`, `console.error` (tanpa noise jaringan), dan kebocoran nilai mentah (`[object Object]`/`undefined`/`NaN`). Engine: `pickProbeTarget()` (murni) + `probeFindingsRuntime()`. Job **review** memasang Chromium (`playwright install --with-deps chromium`, `continue-on-error`) + `FIEZEL_BOT_PROBE=on`. Bila browser/modul tidak ada → **SKIP jujur**.
- **Item #3 — hemat kuota & heal jujur.** `geminiModelExhausted` + `geminiModelStrikes` (cooldown menaik); `summarizeLlmErrors()` (tetap memuat `kunci#N`, tidak membocorkan nilai kunci); `applyReplacementBlocksDetailed()` melaporkan kegagalan per-berkas; `runHeal` mengembalikan `ai-unavailable`/`ai-patch-not-applied` (+ `detail`) dengan 1 putaran kirim-ulang `buildMismatchRetryPrompt`; laporan workflow menampilkan **"Sebab persis"** dari `HEAL_RESULT`.

---

## b) Bukti pengujian empiris

| Perintah | Hasil |
| --- | --- |
| `node --check tools/fiezel-bot.mjs` / `fiezel-bot-probe.mjs` | ✅ exit 0 |
| `node tools/fiezel-bot.mjs self-test` | ✅ **PASS (28/28)** — termasuk T27 (hemat kuota + ringkasan galat) & T28 (kegagalan SEARCH rinci + pemetaan probe + temuan usang idempoten) |
| `node tests/fiezel-bot-test.js` | ✅ **23/23 PASS** — termasuk T22 (hemat 429/heal jujur) & T23 (probe Chromium/anotasi usang/pemasangan browser) |
| `node tests/workflow-timeout-gate-test.js` | ✅ PASS |
| `node tests/gate-registry-test.js` | ✅ PASS |
| `node tests/secret-scan-test.js` | ✅ 0 temuan |
| Probe Chromium end-to-end (nyata, headless) | ✅ `PROBE_DONE: 2 … 0 galat` |
| `FIEZEL Quality Gate` (CI PR #513) | ✅ **PASS (8m42s)** saat basis masih e17fe4b0 |

> `node tests/no-network-test.js` punya **1 kegagalan pre-existing** di `tests/rewrite-test.js:17` (berkas tidak disentuh PR ini).

---

## c) Daftar berkas yang disentuh

| Berkas | Perubahan |
| --- | --- |
| `tools/fiezel-bot.mjs` | Global kuota (`KEY_COOLDOWN_MAX_MS`, `geminiModelStrikes`, `geminiModelExhausted`), `summarizeLlmErrors`, memo model-habis di `queryLLM`, `applyReplacementBlocksDetailed` + `buildMismatchRetryPrompt`, `pickProbeTarget` + `probeFindingsRuntime`, integrasi probe di `runReview`, `selectSupersededFindings` + `runResolve` + mode CLI, self-test T27/T28 |
| `tools/fiezel-bot-probe.mjs` | **Baru** — probe eksekusi Chromium (server 127.0.0.1, seed localStorage, blokir rute eksternal, rekam galat + kebocoran nilai mentah) |
| `.github/workflows/fiezel-bot.yml` | Job review: pasang Chromium + `FIEZEL_BOT_PROBE=on` + tarik probe; step `Mark superseded findings`; job heal: "Sebab persis" dari `HEAL_RESULT` |
| `tests/fiezel-bot-test.js` | T2 → 28/28, komponen wajib baru (T5), gerbang baru T22 & T23 |
| `docs/handoffs/FIEZEL-BOT-HONEST-RUNTIME-PROBE-HANDOFF.md` | **Baru** — dokumen ini |

---

## d) Status kelulusan gerbang & utang teknis

**Gerbang lokal**: LULUS (lihat tabel). **Gerbang CI**: `quality` + `Auto PR Review & Invariant Audit` (check wajib proteksi branch) + seluruh check A* dipantau hijau pada PR #513.

**Utang teknis yang tersisa (jujur):**

1. **Probe masih "boot check"**, bukan "murid sungguhan". Ia memastikan shell terbuka tanpa exception/nilai mentah, tetapi belum mengklik alur kuis atau membaca `localStorage`/IndexedDB/`state.history`. Invarian Braincore belum diuji probe ini.
2. **Recall tidak diukur.** Metrik 14-hari hanya mengukur presisi (temuan benar vs ditolak), bukan berapa bug yang terlewat.
3. **Ketergantungan kuota LLM**: saat semua kunci habis, review turun ke model ringan/deterministik.
4. **Anggaran konteks**: berkas besar (mis. `app.js` ±1,5 MB) terpotong; sebagian berkas dilewati.
