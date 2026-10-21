# E5 — Gateway AI + TTS (Cloudflare), pra-render korpus, circuit breaker

Cabang: `exec/prerender`. Tidak ada push, tidak ada bump build (`SW_REV`/`DIAG_BUILD`/`FIEZEL_PAGE_BUILD` tidak disentuh).
`workers/wrangler.toml` dan `workers/fiezel-audio-worker.js` tidak disunting. `workers/api/index.js` tidak dibuat
maupun disunting — modul di sini mengekspor `registerAiRoutes()`/`registerTtsRoutes()` dan menunggu dipasang.

## Berkas yang dibangun

| Berkas | Isi |
| --- | --- |
| `workers/api/ai/ai-tasks.js` | Registry `fiezel-ai-task-v2`: 5 task, schema input, batas token, timeout, kebijakan cache, model + alasan + harga, fallback deterministik |
| `workers/api/ai/route-ai.js` | `POST /api/ai/task`: validasi schema → breaker → kuota → provider bertimeout, pemetaan galat sopan |
| `workers/api/tts/tts-key.js` | Kunci cache v2 deterministik + normalisasi teks kanonik |
| `workers/api/tts/route-tts.js` | `POST /api/tts/render` (hitung ulang kunci di server, HEAD R2 dulu), `GET /api/tts/manifest` (ETag) |
| `workers/api/breaker/breaker.js` | State machine CLOSED/OPEN/HALF-OPEN murni + penyimpan KV/D1 ringan |
| `tools/prerender-tts.mjs` | Pipeline pra-render: sensus bank → kunci v2 → HEAD R2 → render yang belum ada → PUT → manifest |
| `.github/workflows/audio-prerender-cf.yml` | Dispatch manual, gate aktor, dry-run bawaan, laporan biaya sebelum apply |

Gerbang baru: `tests/tts-key-test.js` (31 cek), `tests/ai-task-contract-test.js` (107), `tests/breaker-test.js` (51),
`tests/prerender-dryrun-test.js` (45). Semuanya Node murni, tanpa dependensi, terdaftar di
`.github/workflows/quality.yml` setelah `tests/puter-popup-once-test.js`.

## Cara memasang (untuk pemilik `workers/api/index.js`)

Modul ini UMD: jalan di Workers (`globalThis`), CommonJS (test Node), dan bisa di-`import` lewat interop.
Di `workers/api/index.js`, setelah router dibuat:

```js
import { registerAiRoutes } from './ai/route-ai.js';
import { registerTtsRoutes } from './tts/route-tts.js';

registerAiRoutes(router);   // POST /api/ai/task
registerTtsRoutes(router);  // POST /api/tts/render, GET /api/tts/manifest
```

Adapter router mengenali dua bentuk: Hono (`c.req.raw`, `c.env`, `c.executionCtx`) dan handler manual
`(request, env, ctx)`. Kalau router memakai bentuk lain, panggil `handleAiTask({request, env, ctx, deps})`
dan `handleRender(...)`/`handleManifest(...)` langsung.

Binding yang dibaca dari `env`: `AI` (Workers AI), `AUDIO_BUCKET` (R2, atau `deps.bucket`), `BREAKER_KV`
(opsional; tanpa itu breaker jalan per-isolate saja), `DB` (opsional, D1 untuk catatan penggunaan),
`AUDIO_PUBLIC_BASE` (basis URL publik objek audio).

Kuota: `resolveEnforceQuota()` mencari `deps.enforceQuota`, lalu `globalThis.FIEZEL_ENFORCE_QUOTA`, lalu
`require('../quota/route-quota.js')` di dalam `try`. Jadi paket kerja kuota (E-lain) boleh mendarat sebelum
atau sesudah paket ini tanpa mengubah apa pun di sini. **Selama modul kuota belum ada, rute ini fail-open pada
kuota** — breaker dan batas token tetap berlaku, tapi tidak ada plafon harian per murid. Itu keadaan sementara
yang harus ditutup saat merge, bukan desain akhir.

## Kunci cache TTS v2

Material hash: `sha256(schema␟locale␟voiceId␟engineId␟engineVersion␟JSON(settings-allowlist)␟canonicalText)`.
Allowlist setelan tertutup dan hanya tiga field: `bitRate`, `container`, `sampleRate`.

**`speed` DIKELUARKAN dari kunci.** Ini perbaikan bug bayar-ulang yang dicatat cf-a5/cf-a10:
`fiezel-puter-voice.js:115-127` memasukkan speed ke kunci, sementara speed sebenarnya diterapkan di
`:292-293` lewat `playbackRate` pada elemen audio. Akibatnya satu kalimat buku dibayar tiga kali untuk
`SPEED_STEPS [0.75, 1, 1.25]`, dan kalimat yang sama dibayar dua kali antara Listening (`ttsRate` 0.86) dan
Library. Seluruh field pemutar (`speed`, `rate`, `playbackRate`, `pitch`, `volume`, `gain`) ikut dikeluarkan
dan dilaporkan lewat `ignoredSettings` supaya keputusan itu bisa diperiksa, bukan ditebak.

`contentType` juga di luar hash: label 'word'/'sentence'/'book' tidak mengubah bunyi, dan memasukkannya
membuat tombol pengucapan flashcard mendapat ABSENT untuk MP3 yang sudah dibayar.

`engineVersion` WAJIB eksplisit dan ikut di-hash. Menebaknya otomatis berarti pergantian model diam-diam
memakai suara lama, atau membayar ulang seluruh korpus tanpa ada yang memutuskan.

## Urutan rute TTS (yang bikin hemat)

1. Hitung ulang kunci di server dari input terstruktur. Kunci dari klien hanya dibandingkan; beda ⇒ 400
   `key_mismatch`. Kalau kunci dari klien dipercaya, siapa pun bisa menyuruh Worker membayar untuk objek
   yang tidak pernah diminta pedagogi mana pun.
2. HEAD ke R2. **Cache hit tidak menyentuh kuota sama sekali** — tidak menghitung, tidak mencatat kuota.
   Murid ke-2 sampai ke-n membayar nol, dan replay (maksimum 2, tetap seperti semula) adalah pedagogi,
   bukan biaya.
3. Breaker. 4. Kuota. 5. Single-flight per kunci di dalam isolate: 30 murid menekan kalimat yang sama
   dalam 2 detik menghasilkan satu panggilan provider, bukan 30.
6. HEAD-lalu-PUT idempoten, plus `ctx.waitUntil(recordUsage)` — pencatatan server-side, tidak pernah
   dari klien.

`GET /api/tts/manifest` mengembalikan daftar kunci terurut dengan ETag = sha256 daftar kunci, menghormati
`If-None-Match` (304), `cache-control: public, max-age=300, stale-while-revalidate=86400`.

## Kontrak AI: input terstruktur, bukan prompt

Frontend mengirim `{schema:'fiezel-ai-task-v2', task, input, locale}`. Template prompt hanya hidup di Worker.
`prompt`, `system`, `systemPrompt`, `messages`, `template`, `instructions`, `model`, `maxTokens`,
`temperature`, `response_format` adalah **field terlarang**: kehadirannya di tingkat atas maupun di dalam
`input` menghasilkan 400 `client_prompt_forbidden`, dan provider tidak dipanggil. Selama prompt bisa datang
dari klien, `maxOutputTokens` cuma dekorasi dan tagihannya ditentukan orang lain.

Task tak dikenal ⇒ 400 `unknown_task`. Ini perbaikan atas perilaku lama di `fiezel-core-worker.js:447`
yang menjatuhkan task tak dikenal ke default 'question' — artinya membayar untuk sesuatu yang tak pernah diminta.

| Task | Model | Neuron/permintaan | Token in/out | Timeout | Cache |
| --- | --- | --- | --- | --- | --- |
| `tutor_turn` | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | 12,5 | 900/300 | 12 s | none |
| `writing_feedback` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 60 | 1400/600 | 25 s | none (tulisan pribadi) |
| `context_coach` | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 60 | 1500/500 | 20 s | private per user |
| `translate_subtitle` | `@cf/ibm-granite/granite-4.0-h-micro` | 3,8 | 1200/1400 | 10 s | shared permanent |
| `session_recap` | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | 12,5 | 700/350 | 12 s | shared |

Alasan pemilihan: `translate_subtitle` adalah task frekuensi tertinggi (setiap baris subtitle setiap
sesi listening), jadi ia memakai model termurah di katalog dan hasilnya di-cache bersama permanen — murid
kedua yang membuka pelajaran yang sama membayar nol. Model penalaran 70b hanya untuk dua task berfrekuensi
rendah (4/jam) yang benar-benar butuh penalaran: umpan balik tulisan dan coach adaptif.

`context_coach` dibatasi 8.000 B payload (dari 100.000 B) dan menolak `privacy.rawAnswersIncluded`/
`rawHistoryIncluded` bernilai `true`. `learnerName` tidak ada di schema task mana pun: nama murid tidak
pernah dikirim ke provider.

Degradasi berbayar-murah sebelum fallback: `pickModel()` menurunkan SEMUA task ke model termurah begitu
`neuronsUsedToday` melewati ambang lunak 8.000, dan probe HALF-OPEN selalu memakai model termurah.

Setiap task punya fallback deterministik (fungsi murni, tanpa jaringan/jam/acak). Provider mati ⇒ **200 dengan
`degraded:true` dan teks fallback**, bukan 5xx. Galat mentah provider tidak pernah diteruskan; setiap kalimat
yang sampai ke murid berasal dari peta `POLITE`. `translate_subtitle` sengaja jatuh ke string kosong:
subtitle yang hilang tidak boleh menutup latihan listening, karena audio Inggrisnya tetap berbunyi.

## Circuit breaker

Pemicu: 429 (`rate_limit`), 5xx (`server_error`), timeout, galat jaringan (`unavailable`), 402/kuota provider
(`quota_exhaustion`), dan 200 dengan body kosong (`empty_body`). **400/401/403/404/422 tidak memicu apa pun** —
kalau galat klien dihitung, satu murid dengan permintaan cacat bisa memutus layanan untuk semua orang.

Ambang: 5 kegagalan dalam jendela luncur 60 s, atau 3× 429 berturut-turut, atau error-rate >50% atas ≥10
sampel; `quota_exhaustion` membuka seketika karena retry tidak akan pernah berhasil sebelum seseorang membayar.

Backoff 60 → 120 → 300 → 900 s, dan tangga itu **naik antar-pembukaan**, tidak reset tiap kali OPEN. Tangga
kembali ke 60 s hanya setelah 10 menit CLOSED bersih; tanpa syarat itu, provider yang gagal-sembuh-gagal
setiap menit selamanya membuka dengan 60 s. `Retry-After` dari mesin dihormati bila lebih panjang dari
backoff sendiri.

HALF-OPEN: **1 probe per 10 detik**, konkurensi 1. Ini bagian yang paling gampang salah — HALF-OPEN yang
melepas semua permintaan yang menunggu berarti 200 murid menghantam mesin yang baru pulih dan langsung
memicu 429 lagi. Gerbang `tests/breaker-test.js` melempar 200 permintaan dalam 2 detik dan menuntut nol probe
tambahan. Butuh 2 probe sukses untuk menutup; satu probe gagal langsung membuka lagi ke tangga berikutnya.

Satu hal ditambahkan di luar spesifikasi cf-b4 karena tanpa itu breaker bisa macet permanen: `staleProbeMs`
30 s. Probe yang tidak pernah melaporkan hasilnya (isolate mati, `waitUntil` dipotong) menahan
`probesInFlight` selamanya dan breaker tidak akan pernah pulih sendiri. 30 s dipilih karena di atas
`TTS_TIMEOUT_MS` 25 s: probe yang melewatinya pasti mati, bukan lambat.

Logika state machine murni — waktu selalu disuntik sebagai argumen `now`, tidak ada `Date.now()`, tidak ada
`Math.random()`, state masukan tidak dimutasi. Penyimpan hanya menulis KV saat state BERUBAH: batas KV Free
1.000 tulis/hari itu nyata, dan breaker yang menulis setiap request menghabiskannya sebelum tengah hari.
Cermin KV ber-TTL 60 s karena konsistensi akhir KV memang sampai ~60 s. State rusak atau tidak ada ⇒ CLOSED
(fail-open: murid tetap bisa belajar).

## Pra-render: angka yang diukur, bukan dikutip

`tests/prerender-dryrun-test.js` menghitung ulang korpus dari bank pada setiap kali jalan:

| Domain | Item | Karakter |
| --- | --- | --- |
| listening (`listening-bank-v1.json` → `items[].script`) | 1.407 | 414.779 |
| book (`library-books-v1.json` → `chapters[].sentences[].en`) | 1.703 | 101.749 |
| vocabulary word (`vocabulary-master.json` → `.word`) | 1.765 | 13.602 |
| vocabulary example (`vocabulary-master.json` → `.example`) | 1.765 | 74.832 |
| **Total** | **6.640** | **604.962** |

**604.962 karakter ⇒ US$9,07** sekali bayar pada aura-1 (US$0,015/1.000 karakter), ±0,56 GB di R2
(di dalam free tier 10 GB). cf-b4 dan cf-a10 memakai 591.898 karakter / US$8,88 — angka itu warisan draf awal
dan sudah dikoreksi cf-c1 §K1. Gerbang menolak angka lama secara eksplisit.

Temuan tambahan dari implementasi: dari 6.640 baris hanya **5.657 objek unik** — 983 duplikat lenyap karena
kunci adalah hash teks kanonik (kalimat yang sama di dua bank berbagi satu objek). Jadi biaya sesungguhnya
untuk seluruh korpus lebih rendah dari US$9,07: rencana penuh saat ini menghitung **286.851 karakter belum
ada ⇒ US$4,30**. Dedup itu bukan efek samping, itu tujuan kunci deterministik.

Pertanyaan listening dan pilihan jawaban TIDAK ikut dirender — hanya `script`. Membacakannya akan
membocorkan jawaban dan merusak validitas latihan.

Manifest pra-render ditulis ke `audio/manifest-tts-v2.json`, **terpisah** dari `audio/manifest.json` milik
pipeline ElevenLabs yang sudah ada. Dua katalog, dua kunci, nol tabrakan.

## Jatah gratis Workers AI: TIDAK CUKUP, dan itu harus dikatakan

Free tier Workers AI 10.000 neuron/hari berlaku untuk **seluruh akun**, bukan per fitur.

- Pra-render korpus butuh ±825.000 neuron ⇒ **83 hari** kalau menunggu jatah gratis. Itu bukan rencana.
  Pra-render adalah biaya yang dibelanjakan (US$4,30–9,07 sekali), bukan biaya yang ditunggu. Rekomendasi:
  bayar sekali, bertahap lewat `limit` + `budget_usd`, dan biarkan runtime hidup di dalam jatah gratis
  setelahnya.
- TTS runtime pada aura-1 hanya ±7.333 karakter/hari untuk SATU akun di dalam jatah gratis. Tanpa pra-render,
  itu habis oleh belasan murid. Setelah pra-render, hampir semua permintaan adalah cache hit dan tidak
  memakai neuron sama sekali — inilah alasan pra-render ada.
- AI teks: `translate_subtitle` di model termurah (3,8 neuron) memberi ±2.600 permintaan/hari di dalam jatah
  gratis. Task 70b (60 neuron) hanya ±166/hari kalau dipakai sendirian, karena itu ia dibatasi ke dua task
  frekuensi rendah dan diturunkan otomatis ke model murah setelah 8.000 neuron terpakai.

Kesimpulan jujur: rencana ini bisa jalan di plan gratis untuk RUNTIME sesudah pra-render, tapi pra-render
sendiri tidak bisa gratis. Angka yang perlu diputuskan pemilik akun: US$4,30 (harga rencana saat ini setelah
dedup) sampai US$9,07 (batas atas seluruh korpus).

## Workflow `audio-prerender-cf.yml`

Hanya `workflow_dispatch`; tidak ada `push`/`schedule` yang bisa membelanjakan uang tanpa manusia. Gate aktor
`github.actor == 'fitrajft-ux'` di tingkat job. `apply` bawaan kosong ⇒ dry-run adalah keadaan bawaan;
produksi hanya jalan pada `inputs.apply == 'APPLY'`. `budget_usd` bawaan `1.00` — sekali tekan tidak
menghabiskan sembilan dolar.

Catatan yang perlu disebut: `audio-generate.yml` yang sudah ada TIDAK punya gate aktor, sementara workflow
Cloudflare (`deploy-core-worker.yml:17`, `configure-core.yml:12`) punya. Workflow ini mengikuti yang lebih
ketat, bukan yang lebih longgar.

Properti lain: langkah rencana berjalan tanpa satu rahasia pun (jadi orang yang hanya ingin melihat ongkos
tidak perlu diberi akses token); masukan pengguna masuk lewat `env:` dan tidak pernah ditanam ke dalam `run:`
(satu dispatch dengan `limit` berisi payload shell bisa mengirim `CLOUDFLARE_API_TOKEN` keluar dan penyamaran
log tidak menarik kembali apa pun yang sudah terkirim); `concurrency` grup tunggal dengan
`cancel-in-progress: false` supaya dua jalan tidak membayar objek yang sama; `tests/tts-key-test.js` +
`tests/prerender-dryrun-test.js` jalan lebih dulu (kunci yang salah hitung = seluruh batch dibayar ulang);
`tests/audio-asset-pipeline-test.js` jalan sebelum commit; hanya `audio/manifest-tts-v2.json` yang di-commit;
push diulang 3× dengan `git pull --rebase --autostash` karena manifest yang tidak mendarat berarti seluruh
batch diproduksi ulang pada jalan berikutnya.

## Status gerbang

Hijau lokal: `tests/tts-key-test.js`, `tests/ai-task-contract-test.js`, `tests/breaker-test.js`, `tests/prerender-dryrun-test.js`,
`tests/regression-test.js`, `tests/install-health-test.js`, `tests/ui-structure-test.js`, `tests/audio-asset-pipeline-test.js`.
`node --check` lolos untuk enam berkas sumber baru dan empat gerbang; kedua YAML tervalidasi.
Tidak ada `*-REPORT.json` yang berubah.

## Yang masih terbuka

1. **Kuota belum ada.** Sampai `workers/api/quota/route-quota.js` mendarat, kedua rute fail-open pada kuota.
2. **Pemasangan rute belum dilakukan.** `workers/api/index.js` belum ada di cabang ini; tanpa pemasangan,
   modul ini tidak dipanggil siapa pun.
3. **`engineVersion` aura-1 dipaku sebagai `cf-aura-1@v1`.** Itu label kita, bukan versi resmi Cloudflare.
   Kalau Cloudflare mengubah model di belakang nama yang sama tanpa memberi tahu, kunci kita tidak ikut
   berubah dan katalog lama tetap dipakai. Tidak ada cara mendeteksinya dari sisi kita; yang bisa dilakukan
   hanya menaikkan label secara manual saat perubahan suara terdengar.
4. **Biaya rencana US$4,30 belum diverifikasi terhadap R2 nyata.** Angka itu mengasumsikan R2 kosong;
   `ready` = 0 karena `audio/manifest-tts-v2.json` belum ada. Jalan dry-run pertama di CI (dengan HEAD R2
   nyata pada `--apply`) yang akan memberi angka final.
