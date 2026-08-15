# T-024-A2 — Independent Audit PR #23: isolate Apple WebKit ONNX proxy stall

- task_id: T-024-A2
- assigned_to: agent-2
- date: 2026-08-15 (WIB, +07:00)
- scope: read-only audit; satu-satunya file yang ditulis = file ini
- status: DONE (audit selesai, rekomendasi di bawah)

## 1. Identitas PR dan commit (diverifikasi dari git/GitHub)

- PR: `#23` "A3: isolate Apple WebKit ONNX proxy stall"
  - URL: https://github.com/fitrajft-ux/FIEZEL-APPS/pull/23
  - state: **MERGED**
  - base: `main` @ `6ee0eb9bf102d803427923f7c20afad66ceb152a`
  - head (final candidate): `agent/a3-webkit-direct-wasm` @ `7363c2ed0b14f61e5340c8213ad6da939f5a8d62`
  - merge commit di main: `b0ab5ff7f4b7408443fdd5b1bb56fee3a87da4f8`
  - 6 commit PR: `ea1fe6e` (instrument stages), `8c90ffe` (require direct WASM policy + stage diag),
    `08216c4` (direct single-thread WASM Apple standalone), `debf972` (prompt-safe diag),
    `ffb9f01` (harden diagnostic privacy regression), `7363c2e` (merge main verifier bootstrap).
  - root_cause_context menyebut head `ffb9f0128d78a4d8b51dbd04010e22e0f3c05f74` =
    commit `ffb9f01` (5th PR commit) — **sesuai** dengan commit final PR sebelum refresh main.

### Changed files (net diff `6ee0eb9..b0ab5ff`, hanya 3 file — PAS sesuai klaim PR)

```
features/neural-voice/fiezel-kokoro-adapter.js     | 52 +++++++++++++++++++---    (+45/-7)
features/neural-voice/fiezel-neural-voice-bootstrap.js  |  7 +--                   (+4/-3)
neural-voice-device-hotfix-test.js                 | 14 ++++--                     (+11/-3)
3 files changed, 60 insertions(+), 13 deletions(-)
```

TIDAK ada file lain yang berubah antara base main dan merge (numstat hanya 3 file di atas).
Merge bersih: `git diff 7363c2e b0ab5ff` kosong (tree merge == tree PR head, tanpa resolusi konflik).

## 2. Perubahan perilaku (behavioral diff)

### a) `features/neural-voice/fiezel-kokoro-adapter.js`

- **`wasmEnv.proxy` untuk Apple standalone: `true` → `false`** (di bootstrap, lihat b).
- `generate(text, generationOptions)`:
  - lama: `const tts = await getInstance(); return tts.generate(text, {voice, speed})`.
  - baru: di-bungkus `Promise.resolve(tts.generate(...))`, ditambah stage telemetry
    `adapter_generate_enter/invoke/dispatched/resolved/error`; hasil (`value`) dan error
    (`throw error`) tetap diteruskan ke caller — **kontrak perilaku generate() tidak berubah**,
    hanya observabilitas yang bertambah.
- `getInstance()`: `instancePromise` sekarang dibentuk lewat `.then/.catch` + stage
  `adapter_instance_start/ready/error`; `.catch` tetap reset `instancePromise=null` dan
  rethrow — **perilaku retry dan error sama seperti sebelumnya**.
- Helper `stage(phase, detail)`: memanggil `onStage(Object.freeze({phase, ...detail}))`
  di dalam `try/catch` (tidak bisa melempar ke runtime) dan no-op jika `onStage` bukan function.
- Helper `errorKind(error)`: `String(error?.code || error?.name || 'error').slice(0,80)` —
  **tidak pernah membaca `error.message`** (mencegah echo prompt text via pesan error).

### b) `features/neural-voice/fiezel-neural-voice-bootstrap.js`

- `if(appleStandalone)wasmEnv.proxy=true;` → `if(appleStandalone)wasmEnv.proxy=false;`
  → **ONNX WASM proxy-worker round trip dimatikan** pada Apple standalone
  (eksperimen terkontrol sesuai tujuan PR; `numThreads=1` tetap dipertahankan).
- `wasmPolicy` marker: `'apple-standalone-single-thread-proxy'` → `'apple-standalone-single-thread-direct'`.
- Adapter dibuat dengan opsi baru `onStage: entry => diag(entry)` — stage telemetry mengalir
  ke `diag()` yang menulis ke `localStorage[fiezel-neural-voice-diagnostics-v1]` (list max 200 entri).
- **Tidak ada** perubahan: `INITIALIZE_TIMEOUT_MS` (20s), `NEURAL_GENERATION_TIMEOUT_MS` (30s),
  `BROWSER_TTS_TIMEOUT_MS`, alur fallback, single-flight, kontrak `FiezelVoiceRuntime`.

### c) `neural-voice-device-hotfix-test.js`

- Assertion lama `wasmEnv.proxy=true` / `apple-standalone-single-thread-proxy` diganti dengan
  `wasmEnv.proxy=false` / `apple-standalone-single-thread-direct`.
- Ditambah gate: semua 7 stage telemetry harus ada di adapter; dilarang `stage('adapter_generate_enter', { text`
  dan `error.message` (privacy). Test PASS (lihat §5).

## 3. Privasi diagnostics

- Semua payload stage = `{phase, voice, elapsedMs, samples?, errorKind?}`.
  - `voice` = ID suara (mis. `af_heart`), bukan prompt text.
  - `samples` = `value.audio?.length || value.data?.length` (angka) atau `null`.
  - `errorKind` = hanya `code/name` terpotong 80 char; **tidak pernah `error.message`**.
- **Prompt text (`text`/chunk) TIDAK pernah masuk stage telemetry** (grep `stage('` pada adapter:
  tidak ada argumen `text` di payload manapun). Gate test mengunci hal ini.
- `diag()` membatasi retensi 200 entri (slice(-200)) — bounded, sesuai pola m025/m026.
- `wasmPolicy` diagnostics: marker policy baru `apple-standalone-single-thread-direct` —
  tidak mengandung data user.
- Verdict: **tidak ada risiko privasi baru**; telemetry terbatas pada timing/voice/sample-count/error-kind.

## 4. Kontrak (contract preservation)

- `FiezelVoiceRuntime` (public API, bootstrap line 368) **TIDAK berubah**:
  `{schema, status, prepare, ensureReady, speak, stop, release, verifyCachedAssets,
  refreshPreparedFlag, storageEstimate, diagnostics, assets, totalBytes, assetCount}`.
- `FiezelKokoroAdapter` export (adapter line 121) **TIDAK berubah**:
  `{createKokoroAdapter, assertLocalPath, normalizeWasmPath}`; instance tetap
  `{kind, modelId, localModelPath, voiceBaseUrl, wasmBasePath, dtype, device,
  initialize, generate, listVoices}`.
- Opsi baru `onStage` pada `createKokoroAdapter` bersifat opsional
  (`typeof options.onStage === 'function' ? options.onStage : null`) — aman untuk caller lama.
- `NEURAL-VOICE-SOURCE-LOCK.json`, `sw.js`, `app.js`, `index.html`, workflows, vendor:
  **tidak tersentuh** (bukti numstat di §1).

## 5. Bukti eksekusi (real command output)

```
# 1) Syntax check 3 file (node --check) — semua exit 0
PS> node --check features/neural-voice/fiezel-kokoro-adapter.js      -> exit 0
PS> node --check features/neural-voice/fiezel-neural-voice-bootstrap.js -> exit 0
PS> node --check neural-voice-device-hotfix-test.js                  -> exit 0

# 2) Focused regression (device-hotfix gate) — PASS
PS> node neural-voice-device-hotfix-test.js
FIEZEL neural device hotfix m025: PASS
EXIT=0

# 3) Net diff scope: hanya 3 file (numstat 6ee0eb9..b0ab5ff)
45  7  features/neural-voice/fiezel-kokoro-adapter.js
4   3  features/neural-voice/fiezel-neural-voice-bootstrap.js
11  3  neural-voice-device-hotfix-test.js

# 4) Merge tree == PR head (tanpa perubahan tak terduga)
git diff 7363c2e b0ab5ff  -> (kosong)

# 5) Tidak ada sisa referensi policy lama di repo (source non-vendor)
git grep "apple-standalone-single-thread-proxy|wasmEnv.proxy=true" -> (0 match)

# 6) Konsistensi gate CI A6/A7 dengan kode baru
.github/workflows/a6-a7-verifiers.yml:62: grep -F "wasmEnv.proxy=false" features/neural-voice/fiezel-neural-voice-bootstrap.js
.github/workflows/a6-a7-verifiers.yml:63: grep -F "apple-standalone-single-thread-direct" features/neural-voice/fiezel-neural-voice-bootstrap.js
```

### CI (gh run, diverifikasi langsung)

| Run ID | Workflow | event | headSha | status |
|---|---|---|---|---|
| 31890896563 | FIEZEL Quality Gate | pull_request | 7363c2e | SUCCESS |
| 31890896589 | FIEZEL A6 A7 Automated Verifiers | pull_request | 7363c2e | SUCCESS |
| 31891031289 | FIEZEL Quality Gate (post-merge) | push main | b0ab5ff | SUCCESS |
| 31891030795 | pages build and deployment | push main | b0ab5ff | SUCCESS |

Semua gate CI hijau; tidak ada run yang di-skip.

## 6. Evaluasi per kriteria audit

| Kriteria | Hasil |
|---|---|
| Behavioral safety | PASS — perubahan terbatas pada `proxy=false` (Apple standalone, eksperimen terkontrol), stage telemetry non-blocking (try/catch, optional onStage), timeout & fallback tidak diubah, error di-rethrow sama seperti sebelumnya |
| Privacy diagnostics | PASS — tidak ada prompt text di telemetry; `errorKind` tanpa `error.message` (cap 80); retensi 200 entri bounded |
| Contract preservation | PASS — `FiezelVoiceRuntime` dan `FiezelKokoroAdapter` ekspor/instance tidak berubah; `onStage` opsional |
| Out-of-scope changes | PASS — tepat 3 file (60+/13-), tidak ada sw.js/app.js/index.html/quality.yml/vendor/workflow/ledger |

## 7. Batasan dan status kejujuran

- Ini **audit statis kode + CI**, BUKAN bukti keberhasilan di device fisik.
- PR #23 adalah **eksperimen diagnostik terkontrol** (m027-adjacent): mematikan proxy-worker
  ONNX di Apple standalone untuk memisahkan "proxy round trip" dari variabel lain.
- `root_cause_context.status = SUSPECTED` — konsisten: kode belum terbukti menyelesaikan
  timeout ~30s (`generate_timeout`) di Apple standalone; validasi fisik Apple standalone
  tetap otoritatif (sesuai PR body dan koordinasi sebelumnya).
- Tidak ada klaim keberhasilan device dalam catatan ini.

## 8. REKOMENDASI

**SAFE CANDIDATE** (aman untuk deployment diagnostik terkontrol yang sudah dilakukan).

Alasan:
1. Diff persis 3 file yang diklaim PR — tidak ada perubahan out-of-scope.
2. Perubahan perilaku minimal & terkendali (`proxy=false` khusus Apple standalone;
   `numThreads=1` tetap; timeout/fallback/kontrak tidak tersentuh).
3. Telemetry baru prompt-safe dan non-blocking; tidak ada data user baru yang dipersist.
4. Semua gate lokal (node --check 3 file, neural-voice-device-hotfix-test.js PASS) dan
   CI (QG 31890896563, A6/A7 31890896589, post-merge QG 31891031289) hijau.

Catatan: "safe candidate" berarti aman sebagai langkah diagnostik dan tidak membahayakan
runtime/kontrak/privacy — BUKAN klaim bahwa suara neural audible di device sudah teratasi.
Bukti keberhasilan (atau kegagalan) harus datang dari diagnostics device
`fiezel-neural-voice-diagnostics-v1` pada pengujian fisik berikutnya.
