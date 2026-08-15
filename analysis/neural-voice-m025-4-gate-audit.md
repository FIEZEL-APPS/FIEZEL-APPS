# T-026-A3 — Gate/Release Audit m025-3→m025-4: independent m025-4 candidate promotion decision

- task_id: T-026-A3
- assigned_to: agent-3
- model session: agent-3 (sesi ini); ledger target model `opencode-go/kimi-k3`
- date: 2026-08-16 (WIB, +07:00)
- scope: read-only audit; satu-satunya file yang ditulis = file ini
- status: DONE (audit selesai; rekomendasi jujur di §9)

> **Ringkasan eksekutif:** origin/main **470fe4d** (Merge PR #29, deploy Diagnostics
> m025-3 neural stage probe) adalah main authoritative. PR #29 SUDAH MERGED dan Pages
> ter-deploy dengan `DIAG_BUILD='m025-3'` dan `SW_REV='m025-3-neural-stage-probe-20260816-1'`
> (diverifikasi live via HTTP 200). Gate otomatis: QG post-merge 31898117557 SUCCESS,
> Pages 31898117287 SUCCESS; A6/A7 exact-head PR #29 (31897982298) SUCCESS, tetapi **A6/A7
> terakhir pada head yang sama (31898108573) FAILURE pada step "Verify branch freshness
> and release boundary" dengan `A7 FAIL: candidate head does not contain current main`**
> — kegagalan *branch freshness* akibat merge race (kode tidak berubah antar kedua run).
> **Belum ada kandidat m025-4 yang dapat dipromosikan**: Issue #30 masih OPEN dan belum
> ada PR/branch m025-4 di origin; branch lokal yang muncul di clone bersama adalah
> pekerjaan sesi lain (bukan kandidat auditable dari remote). Seluruh gate neural/regression
> lokal di HEAD 470fe4d **PASS** (kecuali `regression-test.js` HANG di node v24/Windows —
> isu lingkungan terdokumentasi, PASS di CI node 22). **Release tetap di-hold**:
> audibility fisik Apple masih UNVERIFIED (T-005/T-006 tetap `blocked`; tidak ada payload
> diagnostics device di repo/CI).

---

## 1. Identitas state yang diaudit (diverifikasi dari git/GitHub, bukan asumsi)

| Item | Nilai terverifikasi |
|---|---|
| origin/main HEAD (authoritative) | `470fe4d93b7d206ac0fc7cb069b1d7eead9f03de` (Merge PR #29: deploy Diagnostics m025-3 neural stage probe) |
| PR #29 | **MERGED** — `state=MERGED`, `mergedAt=2026-08-15T17:22:20Z`, merge commit `470fe4d` |
| PR #29 head (final candidate) | `master/m025-3-wasm-env-bind` @ `cba42b68b9b1fffe0abe3fc6b4814031d6418f48` |
| PR #29 base | main @ `f83035c` (Merge PR #27: searchable Diagnostics m025-2) |
| PR #29 net diff | **persis 5 file**: `diag-search-test.js`, `features/neural-voice/fiezel-diag-panel.js`, `features/neural-voice/fiezel-kokoro-adapter.js`, `neural-voice-device-hotfix-test.js`, `sw.js` (110 insertions / 15 deletions) |
| Issue #30 | **OPEN** — `[A3][m025-4] Isolate pre-tokenizer phonemizer/eSpeak stall` (base main 470fe4d; bounded probe, 8 kriteria acceptance; non-goals: tidak ubah timeout/model/aset/single-flight/Puter/fallback/vendor) |
| Kandidat m025-4 (PR/branch di origin) | **TIDAK ADA** — `git ls-remote origin refs/heads/*m025-4*` kosong; `gh pr list --head agent/m025-4-*` kosong |
| Branch lokal di clone bersama | `agent/m025-4-pretokenizer-boundary-20260816` @ 470fe4d (placeholder tanpa commit unik) dan `agent/m025-4-audit-20260816` @ 260404e — dibuat sesi lain di clone bersama, **bukan kandidat yang bisa diaudit dari remote dan bukan milik sesi ini** (tidak disentuh) |
| Clone audit | worktree terisolasi `Temp\opencode\FIEZEL-APPS-A3-T026-worktree` @ 470fe4d (branch `agent/a3-m0254-gate-audit-20260816`) — agar bukti gate tidak terganggu sesi lain yang aktif di clone utama |

`git log origin/main --oneline -5`:
```
470fe4d Merge PR #29: deploy Diagnostics m025-3 neural stage probe
cba42b6 [m025-3] Make Diagnostics search regression build-agnostic
7834971 [m025-3] Verify deep neural stage diagnostics
e3e326f [m025-3] Refresh PWA shell for neural stage probe
176a71c [m025-3] Advance Diagnostics build marker
```

`git fetch origin` PASS; working tree audit bersih sebelum & sesudah eksekusi gate.

---

## 2. Hasil gate lokal yang DIEKSEKUSI di sesi ini (PASS/FAIL/HANG + runtime caveat)

Semua perintah dijalankan dari worktree audit @ 470fe4d (node v24.19.0, Windows
PowerShell 5.1). Output aktual dirangkum; tidak ada hasil yang dibuat-buat.

### 2.1 Gate neural fokus (setara A6/A7 run list; semua PASS)

| Test | Command | Hasil aktual |
|---|---|---|
| Device-hotfix (m025-3) | `node neural-voice-device-hotfix-test.js` | `FIEZEL neural device hotfix m025-3: PASS` |
| Diagnostics search | `node diag-search-test.js` | `FIEZEL diagnostics m025-3 search regression: PASS` |
| Generation timeout | `node neural-voice-generation-timeout-test.js` | `FIEZEL neural generation timeout regression: PASS` |
| Single-flight (m026) | `node neural-voice-single-flight-test.js` | `FIEZEL neural single-flight regression: PASS` |
| Diagnostics retention | `node neural-voice-diagnostics-retention-test.js` | `FIEZEL neural diagnostics retention regression: PASS` |
| Audibility fallback | `node neural-voice-audibility-test.js` | `FIEZEL neural voice audibility regression: PASS` |
| Puter auth/COOP | `node puter-auth-coop-test.js` | `FIEZEL Puter auth/COOP regression: PASS` |
| SW CORP | `node sw-corp-test.js` | `semua gate sw-corp LOLOS` (8/8 ok: COEP credentialless, WebKit COOP, SW_REV, shell reinstall, Puter bypass, opaque-200 absent, version 5.19.0) |
| Neural voice core | `node neural-voice-test.js` | `FIEZEL Neural Voice: PASS 39/0` (39 assertion PASS / 0 gagal) |
| Timeout phase m026 | `node neural-voice-timeout-phase-test.js` | `FIEZEL neural timeout phase m026: PASS` |
| Neural HTTP | `node neural-voice-http-test.js` | `FIEZEL neural voice HTTP: PASS` |
| Product repair | `node neural-voice-product-repair-test.js` | `FIEZEL neural voice product repair: ALL GATES PASS` |
| iOS cache compat | `node ios-cache-compat-test.js` | `FIEZEL iOS CacheStorage compatibility: PASS` |
| iOS WASM module | `node ios-wasm-module-test.js` | `FIEZEL iOS WASM module regression: PASS` |
| PWA cache | `node pwa-cache-test.js` | `"pass": true` (35 aset precache, version 5.19.0) |
| Diag panel | `node diag-panel-test.js` | `semua gate diag-panel LOLOS` (4 kasus: key-absent, normal, estimate/caches reject, double-mount) |
| Lifecycle fix (T-023) | `node neural-voice-fix-test.js` | `semua gate neural-voice-fix LOLOS` (6 bagian, termasuk release/close) |

### 2.2 Regression & produksi

| Test | Command | Hasil | Caveat |
|---|---|---|---|
| Validator | `node validator.js` | PASS (vocab 1765, reading 300/1500, grammar 129, security clean) | — |
| HTTP smoke | `node http-smoke-test.js` | `FIEZEL HTTP smoke test: PASS` + `{"status":"PASS","httpAssets":3}` | — |
| Speaking/listening | `node speaking-listening-test.js` | `FIEZEL Speaking + Listening: PASS 25/0` | — |
| Notification reminder | `node notification-reminder-test.js` | `FIEZEL notification reminder: PASS` | — |
| Regression | `node regression-test.js` | **HANG/terminated >45 s tanpa output** | **Isu lingkungan node v24/Windows yang SUDAH didokumentasikan** (ledger T-023: "hang di node v24/Windows = isu lingkungan, PASS di CI node 22"). Bukan regresi baru dari PR #29. |
| Syntax (6 file kunci: kokoro-adapter, diag-panel, diag-search-test, device-hotfix-test, sw.js, bootstrap) | `node --check <file>` | PASS semua (`SYNTAX-ALL-PASS`) | — |

### 2.3 Konfirmasi behavioral diff PR #29 (ringkas, untuk gate kebenaran)

- `fiezel-kokoro-adapter.js` (+86): `effectiveWasmPolicy()` menandai policy
  `apple-standalone-single-thread-direct-default` dengan `readBack: false` (tidak mengklaim
  verifikasi setter/read-back yang tidak bisa diekspos wrapper Kokoro); `instrumentInstance()`
  membungkus `tts.tokenizer` dan `tts.model` via `Proxy` untuk stage bounded:
  `adapter_tokenizer_enter/resolved/error`, `adapter_model_enter/dispatched/resolved/error`,
  `adapter_stage_probe_ready`; stage `wasm_policy`; `tokenCount` hanya jumlah token
  (dari `input_ids.dims`), **tidak pernah konten token/phoneme**; `errorKind(error)` hanya
  `code/name` (cap 80), **tidak pernah `error.message`**; prompt text tidak masuk payload.
- `fiezel-diag-panel.js`: `var DIAG_BUILD = 'm025-3';` (+1 dari m025-2 — sesuai A7).
- `sw.js`: `SW_REV='m025-3-neural-stage-probe-20260816-1'` (prefix m025-3, agar PWA
  terpasang me-refresh shell).
- `neural-voice-device-hotfix-test.js`: assertion diperketat ke stage list m025-3 +
  DIAG_BUILD/SW_REV eksak + `tokenCount` hanya count + larangan `phonemes` dan `error.message`.
- `diag-search-test.js`: regression search dibuat build-agnostic.

---

## 3. Kesimpulan CI (diverifikasi via `gh run` / `gh run view`, dengan run IDs)

### 3.1 Main 470fe4d (post-merge PR #29)

| Run ID | Workflow | headSha | Conclusion |
|---|---|---|---|
| 31898117557 | FIEZEL Quality Gate | 470fe4d | SUCCESS (1m46s) |
| 31898117287 | pages build and deployment | 470fe4d | SUCCESS (44s) |
| 31899598315 | FIEZEL Remote Push Reminders (schedule) | main | SUCCESS (13s) |

**Catatan penting:** workflow A6/A7 hanya trigger `pull_request` — jadi **TIDAK ada run
A6/A7 post-merge untuk main 470fe4d**. Quality + Pages post-merge yang hijau TIDAK dapat
diposisikan sebagai pengganti A7 exact-head (sesuai forbidden_actions).

### 3.2 PR #29 (head `cba42b6`) — exact-head A6/A7

| Run ID | Workflow | headSha | Conclusion |
|---|---|---|---|
| 31897982298 | FIEZEL A6 A7 Automated Verifiers | cba42b6 | **SUCCESS** (A6 + A7) — exact-head awal |
| 31897982305 | FIEZEL Quality Gate | cba42b6 | SUCCESS |
| 31897980504 | FIEZEL Quality Gate (push) | cba42b6 | SUCCESS |
| 31897939373 | FIEZEL Quality Gate (push, iterasi awal) | — | FAIL (diperbaiki pada iterasi berikutnya) |
| 31898108573 | FIEZEL A6 A7 Automated Verifiers | cba42b6 | **FAILURE** — A6 SUCCESS, **A7 FAILURE** pada step "Verify branch freshness and release boundary" |

**A7 failure 31898108573 — akar masalah (dari log `gh run view --log`):**
```
A7 Automated Release Safety  Verify branch freshness and release boundary
  A7 FAIL: candidate head does not contain current main
  ##[error]Process completed with exit code 1.
```
Step menjalankan `git fetch origin main` lalu `git merge-base --is-ancestor origin/main HEAD`.
Pada saat job A7 dieksekusi (17:22:41Z) main sudah maju ke merge commit 470fe4d sementara
HEAD candidate = cba42b6 (tidak mengandung 470fe4d) → **branch freshness gagal karena
merge race**, bukan karena perubahan kode (kode cba42b6 identik di kedua run; A6 pada run
yang sama PASS). Ini sesuai `root_cause_context` yang di-inject. Saya TIDAK menyembunyikan
run FAILURE ini: artinya status A7 eksak-head PR #29 adalah SUCCESS pada run pertama dan
FAILURE (freshness) pada run terakhir — tidak bisa diklaim "A7 final green tanpa caveat".

### 3.3 Pages live (verifikasi HTTP nyata)

| URL | HTTP | Marker |
|---|---|---|
| `https://fitrajft-ux.github.io/FIEZEL-APPS/sw.js` | 200 | `const SW_REV='m025-3-neural-stage-probe-20260816-1';` |
| `https://fitrajft-ux.github.io/FIEZEL-APPS/features/neural-voice/fiezel-diag-panel.js` | 200 | `var DIAG_BUILD = 'm025-3';` |

Produksi Pages == HEAD 470fe4d (build marker cocok). Deployment m025-3 terkonfirmasi live.

---

## 4. Keputusan promosi kandidat m025-4

**Belum ada kandidat m025-4 yang dapat dipromosikan.** Bukti:

1. Issue #30 OPEN (base 470fe4d) — proposal bounded probe pre-tokenizer
   (phonemizer/eSpeak/voice-cache/voice-selection/IPA), bukan PR.
2. `git ls-remote origin` untuk `*m025-4*` = kosong; `gh pr list --head agent/m025-4-*` = kosong.
3. Branch lokal di clone bersama (`agent/m025-4-pretokenizer-boundary-20260816`,
   `agent/m025-4-audit-20260816`) dibuat sesi lain dan tidak ada di remote — bukan
   kandidat yang bisa diaudit/dinilai dari sisi remote; sesi ini tidak menyentuhnya.

Sesuai acceptance Issue #30, kandidat m025-4 baru layak dipertimbangkan untuk **promosi
controlled-diagnostic** bila memenuhi: (1) scope terbatas + claim/lease A3 fresh,
(2) timeout tetap, (3) m026 single-flight tetap, (4) tidak ada prompt text/error message
luar yang dipersist, (5) regression test membuktikan stage ordering & privacy, (6) QG
exact-head SUCCESS, (7) **A6 VERIFY PASS dan A7 VERIFY PASS exact-head** (bukan hanya
post-merge Quality/Pages), dan (8) tetap berakhir pada bukti iPhone standalone fisik.
Semua gate di atas belum ada untuk m025-4 → **NO promotion, NO release**.

---

## 5. Release readiness — DINILAI TERPISAH dari CI hijau

| Komponen | Status | Bukti |
|---|---|---|
| Kode & gate otomatis main 470fe4d | HIJAU (automated) | QG 31898117557 + Pages 31898117287 SUCCESS; local gates PASS |
| A6/A7 exact-head PR #29 | SUCCESS (31897982298) + A7 FAILURE freshness pada run terakhir (31898108573) | run IDs di atas; race didokumentasikan |
| Physical Apple audibility (`fiezel-neural-voice-diagnostics-v1`) | **MISSING / UNVERIFIED** | Tidak ada payload diagnostics device di repo/CI; ledger T-005/T-006 tetap `blocked` |
| Verdict device atas m025-3 stage probe | **BELUM ADA** | Issue #30 menyatakan request masih berhenti sebelum `adapter_tokenizer_enter`; m025-3 hanya probe diagnostics, bukan verdict audibility |

**Kesimpulan release:** main 470fe4d aman sebagai **controlled diagnostic deployment**
(sudah ter-deploy, build marker live). Namun **tidak boleh dirilis sebagai "neural voice
audible di Apple standalone"** — bukti device fisik masih belum ada. `physical_release_gate`
tetap **UNVERIFIED**.

---

## 6. Konsistensi dengan `root_cause_context` (SUSPECTED)

Context yang di-inject agent-5 menyatakan: PR #29 merged/deployed sebagai controlled
diagnostic build, A7 later run gagal branch freshness saat merge race, audibility fisik
belum terverifikasi, Issue #30 = bounded probe bukan release.

**Sesuai 100% dengan bukti yang saya kumpulkan ulang secara independen:**
- Main 470fe4d post-merge QG 31898117557 + Pages 31898117287 SUCCESS ✔
- PR exact-head A6/A7 31897982298 SUCCESS; later A6/A7 31898108573 **A7 FAILURE**
  (`candidate head does not contain current main` — branch freshness, merge race) ✔
- Tidak ada payload diagnostics device; T-005/T-006 blocked ✔
- Issue #30 OPEN, tidak ada PR kandidat m025-4 ✔

Saya tidak mengubah pendekatan; temuan konsisten. Tidak ada penyimpangan yang perlu
dilaporkan sebagai temuan baru.

---

## 7. Forbidden files / scope compliance

- Hanya file audit ini yang ditulis (satu file: `analysis/neural-voice-m025-4-gate-audit.md`).
- Tidak ada perubahan pada code/config/workflow/vendor/ledger (semua `files_forbidden`
  tidak disentuh; `TASKS-LEDGER.json`, `quality.yml`, `package-lock.json`, `sw.js`,
  `app.js`, `index.html`, `features/neural-voice/*`, `vendor/**` — read-only).
- Tidak ada merge/push source/release/deploy; tidak ada bukti device yang dibuat-buat;
  tidak ada klaim audibility/rilis baru.
- Gate dieksekusi di worktree pribadi terisolasi agar tidak terganggu sesi lain yang
  aktif berpindah-pindah branch di clone utama (fenomena yang sama pernah dicatat
  T-024-A3 §7).

---

## 8. Catatan lingkungan

- `node v24.19.0` di Windows: `regression-test.js` HANG (terterminate >45 s tanpa output).
  Ini isu lingkungan yang sudah didokumentasikan (T-023); CI memakai node 22 dan PASS.
- Warning `MODULE_TYPELESS_PACKAGE_JSON` dari `vendor/kokoro-js/kokoro.web.js` saat
  `neural-voice-test.js` — warning performa, bukan kegagalan.

---

## 9. REKOMENDASI (jujur, berbasis bukti)

**Status: NO-RELEASE. m025-3 tetap sebagai controlled diagnostic build (live di Pages,
bukan bukti audibility). Belum ada kandidat m025-4 untuk dipromosikan.**

1. **Jangan rilis** klaim "neural voice audible Apple standalone" berdasarkan QG/Pages
   post-merge — A7 exact-head terakhir (31898108573) FAILURE karena merge race dan bukti
   device fisik masih MISSING.
2. **Jangan promosikan kandidat m025-4 apa pun** sampai ada PR/branch nyata di origin
   dengan QG exact-head SUCCESS + **A6 dan A7 exact-head VERIFY PASS** (bukan hanya
   post-merge Quality/Pages) + regression stage/privacy PASS — lalu baru evaluasi
   diagnostics device (jalur T-005/T-006 → T-007).
3. **Langkah device berikutnya (otoritatif):** owner jalankan kembali PWA Apple terpasang
   pada build m025-3 (SW_REV m025-3 sudah live), ekstrak
   `fiezel-neural-voice-diagnostics-v1`, kirim payload; perhatikan stage mana yang
   tercapai sebelum `generate_timeout` (masalah Issue #30: berhenti sebelum
   `adapter_tokenizer_enter`). Ini gerbang verdict fisik, bukan substitusi CI.
4. `regression-test.js` HANG lokal = isu lingkungan node v24/Windows (dikenal), bukan
   regresi kode; CI node 22 PASS. Jangan jadikan blocker.
