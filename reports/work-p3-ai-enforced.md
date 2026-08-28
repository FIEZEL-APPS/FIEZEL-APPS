# P3 — AI ditegakkan: flag mengikat, jawaban sampai, laporan jujur

Cabang `work/p3ai`. Tanpa push, tanpa bump versi build, tanpa menyentuh `workers/owner/`,
`features/`, `app.js`, `sw.js`, `core-config.js`, `coordination/`.

Lanjutan langsung dari `reports/work-p2-ai-cloudflare.md`. P2 menemukan tiga masalah ini; P3
menutupnya di kode dan mengunci penutupannya dengan gerbang. **Semua verifikasi P3 dilakukan
TANPA satu pun panggilan model.** Alasannya ada di bagian 6, dan itu keputusan sadar, bukan
kemalasan.

---

## 1. Ringkasan yang tidak nyaman

Ketiga masalah **sudah ditutup di kode dan terkunci gerbang**, tetapi **belum satu pun
terbukti hidup di produksi**, karena perbaikannya belum di-deploy dan AI masih mati di KV.
Jadi status jujurnya:

| Masalah | Di kode | Terkunci gerbang | Terbukti hidup di produksi |
|---|---|---|---|
| 1. `cfAiEnabled` tidak ditegakkan (lubang biaya) | ya | ya (17 assert baru) | **belum** — butuh deploy |
| 2. 3/5 task tidak menyampaikan jawaban | ya | ya | **belum** — butuh 5 panggilan owner |
| 3. `quotaRolledBack` berbohong | ya | ya | **belum** — butuh deploy |

Keadaan produksi saat laporan ini ditulis (28 Agu 2026, `curl` langsung, nol biaya model):

```
GET  /api/config  -> {"flags":{"cfAiEnabled":false,...},"enabled":{"ai":false,...},
                      "limits":{"aiPerDay":25,"ttsCharsPerDay":12000}}
POST /api/auth/anon -> 200   (masih tanpa syarat, build lama)
```

Dua catatan yang mengubah rencana P2:

- **Angka jatah SUDAH sinkron di produksi**: `/api/config` kini melaporkan 25 / 12000, sama
  dengan yang ditegakkan. Ketidakcocokan 20/6000 yang dilaporkan P2 sudah tidak ada — var
  Worker rupanya sudah ter-deploy sejak itu. Assert kesinambungan di
  `tools/ai-live-verify.mjs` dibiarkan tetap merah-kalau-beda; ia sekarang cuma tidak menyala.
- **`POST /api/auth/anon` masih 200 tanpa syarat di produksi.** Itu wajar: penegakan baru ada
  di cabang ini, belum di Worker terpasang. Selama belum di-deploy, lubang biaya P2 MASIH
  TERBUKA di produksi — hanya diselamatkan oleh fakta `FEATURE_AI="off"`, yang **bukan**
  pertahanan yang saya percayai sebelum bagian 2 di-deploy.

---

## 2. Masalah 1 — lubang biaya: flag sekarang MENGIKAT, fail-closed

### Apa yang salah

`cfAiEnabled` nol kali dirujuk di jalur permintaan (`index.js`, `route-wiring.js`). Ia hanya
hidup di `schema.js` dan `route-config.js`, yang **melaporkannya ke klien**. Jadi flag itu
sopan-santun antarmuka, bukan pagar. Siapa pun bisa `POST /api/auth/anon` (200 tanpa syarat),
lalu memanggil `/api/ai/task` dan membelanjakan neuron akun owner. Kuota per-pengguna tidak
menolong: terbitkan 100 sesi anon, dapat 100 × 25 permintaan.

### Apa yang sekarang berlaku

Berkas baru **`workers/api/feature-gate.js`** — satu sumber kebenaran untuk pertanyaan "apakah
AI boleh jalan":

```
aiAllowedFrom() = FEATURE_AI === 'on'          (var Worker, butuh deploy)
             AND enabled.ai === true            (kill switch KV, tanpa deploy)
             AND flags.cfAiEnabled === true     (flag rilis KV)
             AND snapshot.ok === true           (KV benar-benar TERBACA)
```

Ketiganya di-AND. Yang paling penting: **`snapshot.ok`**. Kalau binding KV hilang, KV melempar,
atau kunci `cfg:flags` tidak ada, hasilnya **tolak**, bukan "pakai default lalu jalan". Ini
sengaja berbeda dari `route-config.js`, yang tetap **fail-soft** (200 dengan default) karena
`/api/config` tidak membelanjakan uang — kalau ia ikut fail-closed, aplikasi mati total setiap
kali KV batuk. Jalur yang membelanjakan uang fail-closed; jalur yang cuma bercerita fail-soft.
Perbedaan itu ditulis sebagai komentar di kedua berkas.

Gerbangnya dipasang di `route-wiring.js` **di dalam `wrapMetered`, sebelum handler dijalankan**,
jadi penolakan terjadi sebelum badan permintaan diparsing dan jelas sebelum model disentuh.

Amplop penolakan (`RouteAi.aiDisabledResponse`): **HTTP 403**, `error:'ai_disabled'`,
`copyKey:'ai.disabled'`, `source:'unavailable'`, `degraded:true`, `quotaChecked:false`,
**`quotaCharged:false`**, dan **tanpa `retryAfter`**.

**Kenapa 403 dan bukan 429**, ditulis sebagai komentar di `route-ai.js`: 429 berarti "kamu
sedang terlalu banyak, coba lagi nanti" — itu soal waktu, dan klien kami memang menampilkan
hitungan mundur untuknya. Penolakan flag bukan soal waktu; menunggu tidak mengubah apa pun,
dan `retryAfter` di sini adalah janji yang tidak bisa ditepati. Fitur ini **tidak tersedia**,
titik. Kuota murid juga tidak boleh tersentuh: murid tidak melakukan kesalahan apa pun, jadi
`quotaCharged:false` dan `quotaChecked:false` — bukan sekadar "tidak ditagih", tetapi **tidak
pernah diperiksa**, karena memeriksanya saja sudah menyiratkan permintaannya masuk hitungan.

### Pagar tingkat akun: `GLOBAL_NEURON_CAP` akhirnya mengikat

Sebelum P3, `GLOBAL_NEURON_CAP="8000"` nol kali dirujuk kode. Ia var yang cuma enak dilihat.
`neuronsUsedToday` yang dipakai `pickModel` untuk menurunkan tier juga selalu 0 di jalur nyata,
jadi tier degradasi mati.

Berkas baru **`workers/api/ai/ai-account-budget.js`** + migrasi
**`migrations/0005_ai_account_budget.sql`** (`ai_account_day(day, neurons, requests, touched_at)`):

- Plafon = `GLOBAL_NEURON_CAP`, **dijepit** oleh `QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET`
  (10000). Var yang salah tulis (`80000`) tidak bisa membuka plafon di atas jatah akun.
- Reservasi memakai satu `UPDATE ... WHERE neurons + ? <= cap ... RETURNING` — atomik, jadi
  dua permintaan bersamaan tidak bisa sama-sama lolos di ambang plafon.
- **Fail-closed**: tabel belum ada / D1 galat ⇒ tolak dengan `ai_budget_unreadable`.
- Penolakan plafon = **503** `service_degraded` + `copyKey:'ai.accountBudget'` + `retryAfter`
  ke 00:00 UTC (reset harian sungguhan), dan murid **tetap menerima teks materi** dari fallback
  deterministik. Ini beda dari penolakan flag: plafon akun memang soal waktu.
- `pickModel` sekarang menerima `neuronsUsedToday = max(deps, accountUsedBefore)`, jadi tier
  degradasi (model murah saat pemakaian tinggi) akhirnya benar-benar bisa menyala.
- Penolakan plafon **tidak memakan jatah murid** — bukan urusannya kalau owner yang kehabisan.

---

## 3. Masalah 2 — kenapa 3 dari 5 task tidak menyampaikan jawaban

Ini didiagnosis dari **bukti dokumentasi + kode**, bukan tebakan, dan bukan dengan menembak
produksi berulang kali. Tiga sebab berbeda, bukan satu:

### (a) `response_format` dikirim tanpa skema, ke model yang tidak mendukung JSON Mode

Kode lama mengirim `response_format: { type: 'json_object' }`. Dokumentasi Cloudflare
[Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
menyatakan JSON Mode butuh `{ type: 'json_schema', json_schema: <skema valid> }` dan hanya
didukung **daftar model tertentu** — yang **tidak** memuat `@cf/meta/llama-3.1-8b-instruct-fp8`
maupun granite. Model yang diminta mematuhi mode yang tidak ia dukung mengembalikan galat
"JSON Mode couldn't be met" atau content kosong. `usage.outputTokens: 0` yang kamu ukur di
`session_recap` konsisten dengan ini: model dipanggil, tagihan input jalan, keluaran nol.

Perbaikan: setiap entri `MODELS` kini punya `jsonModeCapable` (hanya tier reasoning/70b = true),
`session_recap` mendapat **skema JSON sungguhan** (`{points: string[3]}`), dan `buildPayload()`
mengirim `response_format` **hanya** kalau task punya skema DAN model mendukungnya. Kalau tidak,
JSON Mode dilewati (`jsonModeSkipped`) dan bukan dipaksakan.

### (b) `writing_feedback` meminta prosa tetapi menyalakan JSON Mode

Promptnya minta umpan balik naratif; `jsonMode:true` menuntut objek JSON. Model diberi dua
perintah yang bertentangan, dan yang keluar tidak lolos parser. `jsonMode` → **false**.

### (c) `translate_subtitle` memakai model yang terbukti mengembalikan kosong

P2 sudah mengukur `granite-4.0-h-micro` faktualnya salah dan `gemma` mengosongkan content karena
membakar token di `reasoning_content`. `translate_subtitle` memakai `MODELS.cheap` (granite).
Model dipindah ke **`MODELS.standard`** (`llama-3.1-8b-instruct-fp8`, yang di benchmark P2
menjawab). `MODELS.cheap` ditandai `usedByTasks:false` + catatan pencabutan, dan gerbang
sekarang menolak model itu dipakai task mana pun **termasuk di tier degradasi** — supaya
"hemat" tidak diam-diam kembali lewat pintu belakang.

**Biaya perubahan ini**: `translate_subtitle` naik dari 3,8 → **12,5 neuron/permintaan**
(≈3,3×). Dengan jatah `aiTranslate` 15/hari/murid, itu paling banyak 187,5 neuron/murid/hari
dari jalur ini, dan plafon akun 8000/hari tetap mengikat di atasnya. Menukar 3,8 neuron untuk
jawaban kosong bukan penghematan; itu membayar untuk nol.

### `tutor_turn` — `sentence_limit_exceeded` setiap kali

Batasnya **tidak dilonggarkan**. Batas 6 kalimat ada supaya murid tidak dibanjiri teks; kalau
gerbangnya dilonggarkan biar hijau, yang "diperbaiki" hanya laporannya.

Dua langkah:

1. **Instruksi diperketat**: `promptTutorTurn` mempertahankan "maksimal 6 kalimat" secara
   literal dan menambahkan instruksi berhenti keras **sebelum** data murid, bukan sesudah —
   instruksi yang ditaruh setelah teks panjang cenderung tenggelam.
2. **Dipotong dengan aman di sisi server**, dan hanya untuk task yang `clampable:true`
   (`tutor_turn`, `context_coach`). `clampSentences()` memotong **pada batas kalimat**, tidak
   pernah di tengah kalimat, dan hanya dipakai kalau `sentence_limit_exceeded` adalah
   **satu-satunya** pelanggaran. Sesudah dipotong, kontrak **diperiksa ulang**; kalau masih ada
   pelanggaran lain (kata terlarang, kebocoran rangka prompt) jawabannya tetap **dibuang**.
   Task berkeluaran JSON (`session_recap`, `translate_subtitle`) `clampable:false` — memotong
   JSON menghasilkan JSON rusak, bukan jawaban yang lebih pendek.

Amplop sukses yang dipotong jujur soal itu: `clamped:true`, `reason:'sentence_limit_clamped'`,
`sentencesBefore:<n>`. Murid dapat jawaban, kamu bisa melihat berapa sering model melanggar,
dan kalau angkanya tinggi itu sinyal prompt/model perlu diganti — bukan sesuatu yang bisa
disembunyikan clamp.

---

## 4. Masalah 3 — `quotaRolledBack` sekarang laporan, bukan basa-basi

Dua cacat, bukan satu:

1. `deps.rollbackQuota` **tidak pernah disuntikkan** di `route-wiring.js`, jadi amplop
   melaporkan `false` sementara reservasi kuota memang dibatalkan di jalur `settleQuota`.
2. `releaseQuota()` mengembalikan `true` semata-mata karena **ada** fungsi yang bisa dipanggil,
   tanpa pernah melihat hasilnya. Jadi ia juga bisa berbohong ke arah sebaliknya.

Perbaikan: `rollbackQuotaBridgeFactory()` di `route-wiring.js` menandai
`ctx.quotaRollbackRequested` dan mengembalikan `false` jujur kalau tidak ada ctx/tiket;
`settleQuota` menghitung `failed = response===null || providerFailed(body) ||
ctx.quotaRollbackRequested===true` lalu mereset penanda. `releaseQuota` jadi `async` dan
mengembalikan `out !== false` (dan `false` kalau pembatalnya melempar), dan kedua callsite
`await`. Hasilnya: kalau kuota dikembalikan, amplop mengatakannya; kalau tidak, amplop tidak
mengklaimnya.

---

## 5. Matriks merah — setiap penegakan baru dibuktikan bisa gagal

Setiap penegakan dicabut satu per satu, gerbangnya dijalankan, lalu berkas dipulihkan. **12
dari 12 mutasi menghasilkan MERAH pada assert yang dimaksud.**

| # | Penegakan yang dicabut | Gerbang | Hasil | Assert yang merah |
|---|---|---|---|---|
| 1 | gerbang flag dilewati di jalur permintaan | `cf-wiring-test` | MERAH | G KV flag kosong ⇒ 403 |
| 2 | pembaca flag dibuat fail-OPEN saat kunci absen | `cf-wiring-test` | MERAH | G KV flag kosong ⇒ 403 |
| 3 | `accountBudget` tidak disuntikkan | `cf-wiring-test` | MERAH | G plafon neuron akun MENGIKAT |
| 4 | pagar akun fail-OPEN saat D1 galat | `cf-wiring-test` | MERAH | G tabel anggaran belum ada ⇒ 503 |
| 5 | `rollbackQuota` tidak disuntikkan | `cf-wiring-test` | MERAH | G quotaRolledBack:true |
| 6 | `response_format` kembali `{type:'json_object'}` | `ai-task-contract-test` | MERAH | response_format hanya dikirim saat didukung |
| 7 | JSON Mode dikirim ke model tak mampu | `ai-task-contract-test` | MERAH | tier degradasi tidak dikirim JSON Mode |
| 8 | `translate_subtitle` kembali ke model kosong | `ai-task-contract-test` | MERAH | model TERBUKTI MENJAWAB |
| 9 | task JSON diizinkan dipotong | `ai-task-contract-test` | MERAH | task JSON TIDAK boleh dipotong |
| 10 | potongan kalimat dicabut | `ai-response-shape-test` | MERAH | jawaban >batas DIPOTONG |
| 11 | potongan lolos tanpa periksa ulang | `ai-response-shape-test` | MERAH | potongan yang masih melanggar aturan lain |
| 12 | `releaseQuota` klaim `true` tanpa lihat hasil | `ai-response-shape-test` | MERAH | pembatal yang melaporkan "tidak ada yang dibatalkan" |

Catatan jujur soal #12: pada percobaan pertama mutasi ini **tetap hijau** — tidak ada satu pun
assert yang menangkap `releaseQuota` yang berbohong. Itu lubang gerbang yang nyata, jadi saya
menambahkan dua assert di `ai-response-shape-test.js` (pembatal mengembalikan `false`, dan
pembatal melempar) dan mengulang mutasinya sampai merah. Tanpa langkah ini, perbaikan #3 hanya
setengah terkunci.

### Gerbang: semua exit 0

`ai-task-contract-test`, `ai-response-shape-test`, `cf-api-contract-test`, `cf-wiring-test`,
`cf-config-killswitch-test`, `quota-core-test`, `config-consistency-test`, `no-network-test`,
`secret-scan-test`, `gate-registry-test`, `coordination-guard-test`, `regression-test`,
`install-health-test` — **13/13 exit 0**.

Tambahan yang saya jalankan sendiri karena bersinggungan dengan berkas yang disunting, semuanya
exit 0: `ai-integration-test`, `cf-shadow-mode-test`, `cf-live-contract-test`,
`core-worker-contract-test`, `quota-manipulation-test`, `quota-notice-a11y-test`,
`neural-voice-m02593-subtitle-translate-test`, `d1-schema-contract-test`.

17 assert baru ada di bagian **G** `cf-wiring-test.js` ("FLAG DITEGAKKAN, PAGAR AKUN MENGIKAT,
ROLLBACK JUJUR"). Tidak ada berkas gerbang baru, jadi `.github/workflows/quality.yml` tidak
perlu disunting.

---

## 6. Biaya panggilan model: NOL

**Panggilan model nyata di paket ini: 0. Neuron terbelanja: 0. Biaya: US$0,00.**

Ini keputusan sadar, dan alasannya harus kamu setujui atau tolak secara eksplisit:

1. Perbaikannya **belum di-deploy**. Menembak `https://api.fiezel.my.id` hari ini hanya menguji
   build lama — ia akan mengonfirmasi cacat yang sudah kita ketahui, dengan biaya nyata, tanpa
   informasi baru.
2. Produksi **tidak bisa** membandingkan dua bentuk payload. Pertanyaan sebenarnya ("apakah
   `json_schema` memperbaiki keluaran kosong?") butuh build baru, bukan panggilan tambahan ke
   build lama.
3. Sebab-sebabnya bisa dipastikan **tanpa biaya** dari dokumentasi resmi (daftar model
   pendukung JSON Mode) + benchmark P2 yang **sudah dibayar**. Membayar lagi untuk mengukur
   ulang hal yang sudah terukur adalah pemborosan, bukan kehati-hatian.

Biaya yang akan **kamu** keluarkan saat memverifikasi setelah deploy: `tools/ai-live-verify.mjs`
= satu panggilan model per tipe task = **5 panggilan**. Perkiraan neuron: `tutor_turn` 60 +
`context_coach` 30 + `writing_feedback` 12,5 + `session_recap` 60 + `translate_subtitle` 12,5
≈ **175 neuron ≈ US$0,00006**. Batasi lebih jauh dengan
`FIEZEL_AI_LIVE_TASKS=tutor_turn` kalau hanya ingin menguji satu.

### Perubahan pada `tools/ai-live-verify.mjs` (tidak ada alat baru)

- Assert lama menuntut task yang ditembak mencakup **kedua** bentuk provider (`llama` +
  `openai`). Yang membuat `openai` tercakup hanyalah granite di `translate_subtitle` — model
  yang baru saja dicabut karena mengembalikan kosong. Menahan model itu hanya supaya assert
  cakupan tetap hijau berarti membayar neuron untuk kepuasan gerbang. Assert dipecah: bentuk
  yang **benar-benar dipakai registry** wajib terbukti hidup (nol biaya tambahan), sementara
  pembaca bentuk `openai` dibuktikan pada payload **sintetis** — nol panggilan model. Kalau
  suatu hari ada task memakai `openai` lagi, cabang pertama otomatis menuntutnya terbukti hidup.
- Pra-syarat baru: kalau Worker menjawab `403 ai_disabled`, alat **berhenti seketika** dengan
  satu kalimat + perintah persis untuk menyalakannya, **nol panggilan model dibelanjakan**.
  Ia tetap MERAH, bukan SKIP: "AI mati di server" berarti kontrak ujung-ke-ujung memang belum
  terbukti, dan itu tidak boleh terbaca hijau.

---

## 7. Yang HARUS kamu kerjakan sebelum AI boleh dinyalakan untuk murid

Berurutan. Saya sengaja **tidak** menyentuh KV, tidak deploy, tidak push.

**Langkah 0 — tinjau cabang ini.** Terutama: keputusan clamp di `tutor_turn` (kamu boleh
menolaknya dan memilih "buang jawaban" seperti sebelumnya), dan kenaikan biaya
`translate_subtitle` 3,8 → 12,5 neuron.

**Langkah 1 — terapkan migrasi 0005.** Wajib SEBELUM deploy: pagar akun fail-closed, jadi kalau
tabelnya belum ada, seluruh `/api/ai/task` akan dijawab 503 `ai_budget_unreadable`.

```bash
cd workers/api
npx wrangler d1 execute fiezel-core --remote --file=migrations/0005_ai_account_budget.sql
```

**Langkah 2 — nyalakan var Worker, lalu deploy.** Di `workers/api/wrangler.toml`, ubah
`FEATURE_AI = "off"` menjadi `"on"` (saya biarkan `off` — menyalakannya adalah keputusanmu).
`GLOBAL_NEURON_CAP = "8000"` sudah benar dan sekarang mengikat.

```bash
cd workers/api && npx wrangler deploy
```

**Langkah 3 — verifikasi bahwa AI masih MATI sesudah deploy.** Ini pemeriksaan yang paling
berharga: KV masih `cfAiEnabled:false`, jadi penolakannya harus sudah bekerja **sebelum** kamu
menyalakan apa pun. Nol biaya model.

```bash
curl -s -X POST https://api.fiezel.my.id/api/auth/anon -c /tmp/c.txt -o /dev/null
curl -s -b /tmp/c.txt -X POST https://api.fiezel.my.id/api/ai/task \
  -H 'content-type: application/json' \
  -d '{"schema":"fiezel-ai-task-v2","task":"tutor_turn","input":{"level":"A1","question":"apa itu present simple?"}}' -i | head -20
```

Harus: **403** dengan `"error":"ai_disabled"`, `"quotaCharged":false`, tanpa `retryAfter`. Kalau
yang keluar 200, **berhenti** dan panggil saya — berarti gerbangnya tidak mengikat di runtime
nyata dan lubang biayanya masih terbuka.

**Langkah 4 — nyalakan flag di KV.** Hanya setelah langkah 3 lolos.

```bash
cd workers/api
npx wrangler kv key put --binding=CFG cfg:flags --remote \
  '{"flags":{"cfApiEnabled":true,"cfAiEnabled":true,"cfTtsEnabled":false,"cfQuotaEnabled":true,"cfAnalyticsEnabled":false,"cfIdentityEnabled":true},"enabled":{"ai":true,"tts":false,"coach":false,"analytics":false}}'
```

(Sesuaikan isinya dengan nilai `cfg:flags` yang sedang berjalan — perintah di atas mencerminkan
`/api/config` produksi hari ini dengan `cfAiEnabled`/`enabled.ai` dinaikkan. Jangan menyalakan
`tts` di langkah yang sama; satu variabel per perubahan.)

**Langkah 5 — jalankan verifikasi live, SEKALI.** 5 panggilan model, ≈175 neuron.

```bash
FIEZEL_AI_LIVE_BASE=https://api.fiezel.my.id node tools/ai-live-verify.mjs --report
```

Yang harus kamu baca di `AI-LIVE-REPORT.json`: setiap task `source:"provider"` (**bukan**
`deterministic-fallback`), `degraded:false`, nol sukses berteks kosong, dan `/api/quota` naik
tepat sebanyak jawaban provider yang sukses.

**Langkah 6 — matikan lagi kalau ada satu saja yang merah**, lewat KV, tanpa deploy:

```bash
npx wrangler kv key put --binding=CFG cfg:flags --remote '{"enabled":{"ai":false}}'
```

Efeknya dalam ≤60 detik (TTL cache flag).

### Yang masih TIDAK saya klaim bekerja

- **Belum ada satu pun bukti hidup** untuk ketiga perbaikan. Semuanya lolos gerbang di atas
  harness palsu (`fakeD1`, `fakeKV`), bukan D1/KV sungguhan. Harness bisa lebih ramah daripada
  kenyataan.
- **Apakah `json_schema` benar-benar menyelesaikan keluaran kosong** belum terbukti. Itu
  kesimpulan dari dokumentasi Cloudflare, dan yang membuktikannya hanya langkah 5.
- **Apakah instruksi tutor yang diperketat menurunkan pelanggaran batas kalimat** belum
  terukur. Clamp memastikan murid tetap mendapat jawaban; ia tidak memberi tahu apakah
  promptnya membaik. Pantau `clamped:true` sesudah dinyalakan — kalau hampir setiap jawaban
  dipotong, promptnya masih salah dan model 70b mungkin bukan pilihan tepat untuk task ini.
- **Kualitas bahasa jawaban model** tidak diuji di sini sama sekali. Itu telaah manusia atas
  kartu hasil render, bukan pencocokan pola.
- **`POST /api/auth/anon` masih tanpa syarat.** P3 menutup lubang biaya di sisi hilir (AI tidak
  bisa dipanggil kalau flag mati, dan plafon akun mengikat kalau menyala), tetapi penerbitan
  sesi anon yang tidak terbatas tetap kelemahan tersendiri: ia masih memungkinkan penyerang
  menghabiskan plafon akun 8000 neuron/hari dan mematikan AI untuk murid sungguhan. Itu **paket
  berikutnya** — rate limit per IP atau proof-of-work di `/api/auth/anon`. Jangan anggap P3
  menyelesaikannya.

---

## 8. Berkas yang disentuh

Baru: `workers/api/feature-gate.js`, `workers/api/ai/ai-account-budget.js`,
`workers/api/migrations/0005_ai_account_budget.sql`.

Disunting: `workers/api/ai/ai-tasks.js`, `workers/api/ai/route-ai.js`,
`workers/api/route-wiring.js`, `workers/api/route-config.js`,
`workers/api/migrations/MIGRATIONS.md`, `tools/ai-live-verify.mjs`, `cf-wiring-test.js`,
`ai-task-contract-test.js`, `ai-response-shape-test.js`, `config-consistency-test.js`.

Tidak disentuh: `workers/owner/`, `features/`, `app.js`, `sw.js`, `core-config.js`,
`coordination/`, versi build.
