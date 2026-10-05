# FIEZEL BOT — Honest Runtime Probe & Superseded Findings (HANDOFF)

- **Tanggal**: 2026-10-05
- **Basis**: `origin/main` @ `e17fe4b0` (build `m025-481`)
- **Branch kerja**: `feat/fiezel-bot-honest-runtime-probe`
- **Jenis**: perubahan sistemik pada mesin review/heal (CI/tooling) — **bukan** fitur/UI murid
- **Bump build**: **TIDAK** dilakukan. Tidak ada aset PWA (`sw.js`/shell cache) yang berubah; bot hanya berjalan di GitHub Actions. Bump akan memicu notifikasi pembaruan palsu ke perangkat murid.

---

## a) Ringkasan temuan audit & alasan perubahan

Tiga kelemahan nyata ditemukan dari audit mesin `tools/fiezel-bot.mjs` dan log kasus **PR #506**:

1. **Temuan inline usang tetap tampak "terbuka".**
   Bot sudah punya penilaian metrik (`classifyFindingThread`) untuk `isOutdated`/`isResolved`, tetapi tidak pernah **menandai** thread lama yang kodenya sudah diperbaiki/diganti. Akibatnya reviewer melihat temuan yang sebenarnya sudah tidak berlaku (contoh: temuan `.view-container`).

2. **Verifikasi temuan hanya "kutipan ada", bukan "gejala nyata".**
   `verifyFindings` mencocokkan `evidence` dengan baris sumber. Itu membuktikan baris itu **ada**, bukan bahwa bug-nya **nyata**. Temuan padding pada kelas CSS mati `.view-container` lolos justru karena kutipan CSS-nya memang ada.

3. **Kuota LLM dibakar sia-sia & alasan heal tidak jujur.**
   Pada #506, satu panggilan menghabiskan 23 kunci Gemini (429/401) lalu berhenti, dan laporan heal hanya berkata `unfixable` — bukan sebab persis (`blok SEARCH tidak cocok di style.css`).

**Perubahan yang dilakukan (3 item yang disetujui):**

- **Item #1 — tandai temuan usang.** Helper murni `selectSupersededFindings()` + mode `resolve` (`runResolve`) memakai `gh api graphql`; idempoten via marker `<!-- fiezel-bot-superseded:ID -->`. Workflow memanggilnya setelah temuan inline diposting.
- **Item #2 — verifikasi eksekusi.** File baru `tools/fiezel-bot-probe.mjs` menjalankan aplikasi di Chromium Playwright, memblokir rute eksternal, merekam `pageerror`, `console.error` (tanpa noise jaringan), dan kebocoran nilai mentah (`[object Object]`/`undefined`/`NaN`). Engine punya `pickProbeTarget()` (murni) + `probeFindingsRuntime()`. Job **review** memasang Chromium (`playwright install --with-deps chromium`, `continue-on-error`) dan mengeset `FIEZEL_BOT_PROBE=on`. Bila browser/modul tidak ada → **SKIP jujur** dan temuan ditandai "belum diuji eksekusi".
- **Item #3 — hemat kuota & heal jujur.** `geminiModelExhausted` + `geminiModelStrikes` (cooldown menaik) mencegah memprobe ulang model yang kuncinya sudah habis; `summarizeLlmErrors()` meringkas galat per model (tetap memuat `kunci#N`, tidak pernah membocorkan nilai kunci); `applyReplacementBlocksDetailed()` melaporkan kegagalan per-berkas; `runHeal` mengembalikan `ai-unavailable` / `ai-patch-not-applied` (+ `detail`) dengan **1 putaran kirim-ulang** `buildMismatchRetryPrompt` saat SEARCH tidak cocok; laporan workflow menampilkan **"Sebab persis"** dari `HEAL_RESULT`.

---

## b) Bukti pengujian empiris

Perintah yang dijalankan pada branch ini:

| Perintah | Hasil |
| --- | --- |
| `node --check tools/fiezel-bot.mjs` | ✅ exit 0 |
| `node --check tools/fiezel-bot-probe.mjs` | ✅ exit 0 |
| `node tools/fiezel-bot.mjs self-test` | ✅ **PASS (28/28)** — termasuk T27 (hemat kuota + ringkasan galat) & T28 (kegagalan SEARCH rinci + pemetaan probe + temuan usang idempoten) |
| `node tests/fiezel-bot-test.js` | ✅ **23/23 PASS** — termasuk T22 (hemat 429/heal jujur) & T23 (probe Chromium/anotasi usang/pemasangan browser) |
| `node tests/workflow-timeout-gate-test.js` | ✅ PASS |
| `node tests/gate-registry-test.js` | ✅ PASS (10 pass, 0 fail) |
| `node tests/secret-scan-test.js` | ✅ 0 temuan |

**Probe Playwright end-to-end (Chromium sungguhan, dijalankan nyata):**

```json
[
  {"id":"probe1","probed":true,"ok":true,"target":"index.html","errors":[]},
  {"id":"probe2","probed":true,"ok":true,"target":"index.html","errors":[]}
]
```
Keluaran: `PROBE_DONE: 2 temuan diuji eksekusi (0 memunculkan galat).`

> Catatan jujur: `node tests/no-network-test.js` melaporkan **1 kegagalan yang sudah ada sebelumnya** pada `tests/rewrite-test.js:17` (bukan berkas dalam PR ini — berkas tersebut tidak disentuh).

---

## c) Daftar berkas yang disentuh

| Berkas | Perubahan |
| --- | --- |
| `tools/fiezel-bot.mjs` | Globals kuota (`KEY_COOLDOWN_MAX_MS`, `geminiModelStrikes`, `geminiModelExhausted`), `summarizeLlmErrors`, memo model-habis di `queryLLM`, `applyReplacementBlocksDetailed` + `buildMismatchRetryPrompt`, `pickProbeTarget` + `probeFindingsRuntime`, integrasi probe di `runReview`, `composeInlineComment`/`composeAiSection`, honest `runHeal`, `selectSupersededFindings` + `runResolve` + mode CLI, self-test T27/T28 |
| `tools/fiezel-bot-probe.mjs` | **Baru** — probe eksekusi Chromium (server repo 127.0.0.1, seed localStorage, blokir rute eksternal, rekam galat + kebocoran nilai mentah) |
| `.github/workflows/fiezel-bot.yml` | Job review: pasang Chromium + `FIEZEL_BOT_PROBE=on` + tarik probe dari `origin/main`; step `Mark superseded findings`; job heal: tampilkan "Sebab persis" dari `HEAL_RESULT` |
| `tests/fiezel-bot-test.js` | T2 → 28/28, komponen wajib baru (T5), gerbang baru T22 (kuota/heal) & T23 (eksekusi/anotasi/pemasangan browser), header |
| `docs/handoffs/FIEZEL-BOT-HONEST-RUNTIME-PROBE-HANDOFF.md` | **Baru** — dokumen ini |

---

## d) Status kelulusan gerbang & utang teknis

**Gerbang lokal**: LULUS (lihat tabel di atas). Gerbang CI (Quality Gate + Deploy) dipantau pada PR.

**Utang teknis yang tersisa (jujur):**

1. **Probe masih "boot check"**, bukan "murid sungguhan". Ia memastikan shell terbuka tanpa exception/nilai mentah, tetapi belum mengklik alur kuis atau membaca `localStorage`/IndexedDB/`state.history`. Invarian Braincore belum diuji oleh probe ini.
2. **Recall tidak diukur.** Metrik 14-hari hanya mengukur presisi (temuan benar vs ditolak), bukan berapa bug yang terlewat.
3. **Ketergantungan kuota LLM**: saat semua kunci habis, review turun ke model ringan/deterministik.
4. **Anggaran konteks**: berkas besar (mis. `app.js` ±1,5 MB) terpotong; sebagian berkas dilewati.
