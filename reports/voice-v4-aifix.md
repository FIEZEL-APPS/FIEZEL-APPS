# V4 — Gerbang AI: bentuk jawaban, model terukur, kontrak mutu keluaran

Cabang `voice/aifix`. Berkas yang disunting: `workers/api/ai/ai-tasks.js`,
`workers/api/ai/route-ai.js`, `tests/ai-task-contract-test.js`, `tests/ai-response-shape-test.js` (baru),
`.github/workflows/quality.yml`. Tidak ada berkas suara, tidak ada `app.js`, tidak ada bump versi
(`VERSION.json` tetap 5.19.0).

Semua yang di bawah berasal dari **pengujian langsung ke Workers AI hari ini** (2026-08-27), bukan
dari katalog dan bukan dari dugaan. Yang membuat temuan ini berbahaya: ketiganya mengembalikan
**HTTP 200**. Jalur lama menganggapnya sukses.

---

## 1. Dua bentuk jawaban — kegagalan senyap yang paling mahal

| Model | Bentuk jawaban |
|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, `@cf/meta/llama-3.1-8b-instruct-fp8` | `result.response` (string) |
| `@cf/ibm-granite/granite-4.0-h-micro`, `@cf/google/gemma-*`, `@cf/aisingapore/gemma-sea-lion-v4-27b-it` | `result.choices[0].message.content` (bentuk OpenAI) |

Kode yang membaca satu bentuk saja mengembalikan **string kosong tanpa galat**: murid melihat kotak
jawaban kosong, owner tetap dibayari token, dan monitoring melihat 200 OK. Karena itu:

- Pembacaan dipusatkan di `AiTasks.readModelText(result)` → `{ text, reasoning, finishReason, shape }`.
  Ia membaca kedua bentuk, pembungkus `result.result.*`, dan `choices[0].text`.
- `route-ai.js` **tidak lagi punya logika bentuknya sendiri**; wrapper `readProviderText()` hanya
  memanggil `readModelText().text` untuk pemanggil lama. Gerbang membuktikan `message.content` dan
  `choices[0]` tidak lagi muncul di kode `route-ai.js` (di luar komentar).
- Kosong **selalu** kegagalan: `AiTasks.classifyModelFailure()` → `empty_output`, respons menjadi
  200 + `degraded:true` + `source:"deterministic-fallback"` + `reason`. Tidak ada jalan bagi jawaban
  kosong untuk keluar sebagai `source:"provider"`.

## 2. `reasoning_overflow` — model yang membakar keluarannya di reasoning

`@cf/google/gemma-4-26b-a4b-it` mengembalikan `message.content` **kosong** dengan
`finish_reason:"length"` sementara seluruh anggaran token habis di `message.reasoning_content`.

- Sebabnya punya nama sendiri: `OUTPUT_FAILURES.reasoningOverflow` = `reasoning_overflow`, dibedakan
  dari `empty_output` supaya owner tahu ini model yang salah setelan, bukan provider yang mati.
- **Isi reasoning tidak pernah ditampilkan.** Ia hanya dipakai untuk mengklasifikasikan sebab.
  Gerbang menyuntik penanda di dalam `reasoning_content` dan membuktikan penanda itu tidak ada di
  seluruh JSON respons — juga pada kasus ketika `content` DAN `reasoning_content` terisi bersama.
- Bagi breaker ia dihitung `empty_body` (satu-satunya anggota `FAILURE_KINDS` yang menggambarkan
  badan kosong); `breaker.js` sengaja tidak disentuh dari paket kerja ini.
- Model ini dicatat di registry sebagai `MODELS.rejected` dengan alasannya, supaya tidak ada yang
  mencobanya lagi tanpa membaca sebabnya.

## 3. Registry model diperbarui oleh hasil ukur

Dua tugas FIEZEL nyata (penjelasan soal + analisa murid), semuanya HTTP 200:

| Model | Hasil terukur | Harga masuk | Keputusan |
|---|---|---|---|
| `llama-3.3-70b-instruct-fp8-fast` | patuh batas kalimat (6 dan 4), pakai "kamu"/"nggak", akurat pedagogis, 4,1–9,6 s | US$0,293/M | **dipakai semua tugas kebenaran** |
| `gemma-sea-lion-v4-27b-it` | nada Indonesia paling alami, **tercepat** 3,1–3,7 s, tetapi menyebut jawaban salah "nggak salah banget sih" | US$0,351/M | **kandidat**, `usedByTasks:false`, butuh uji lanjutan |
| `llama-3.1-8b-instruct-fp8` | bertele-tele, 7–8 kalimat dari maksimal 6, paling lambat 8,4–10,8 s | US$0,152/M | hanya tier degradasi |
| `granite-4.0-h-micro` | **SALAH FAKTA**: present perfect 48% disebut "kekuatan" berdampingan dengan simple present 92% | US$0,017/M | **dilarang untuk tugas analisa** |
| `gemma-4-26b-a4b-it` | `reasoning_overflow` (butir 2) | — | ditolak |

Peta task sesudah perubahan:

| Task | Model | Tier degradasi | Batas kalimat |
|---|---|---|---|
| `tutor_turn` (penjelasan soal) | llama-3.3-70b | llama-3.1-8b | 6 |
| `writing_feedback` | llama-3.3-70b | llama-3.1-8b | 8 |
| `context_coach` (analisa murid) | llama-3.3-70b | llama-3.1-8b | 4 |
| `session_recap` | llama-3.3-70b | llama-3.1-8b | 3 |
| `translate_subtitle` (ringan) | granite-4.0-h-micro | granite | 0 (mengikuti kalimat asli) |

Alasan yang ditulis di komentar tiap keputusan, bukan hanya di sini:

- **Tugas kebenaran naik ke 70b** karena satu-satunya model yang lulus dua tugas itu adalah 70b.
  Batasnya sekarang bukan frekuensi/harga, tetapi apakah jawaban task menyatakan sesuatu tentang
  benar/salah, kuat/lemah, atau aturan tata bahasa (`AiTasks.TRUTH_TASKS`).
- **Tier degradasi tugas kebenaran sengaja bukan yang termurah.** Granite lebih murah tetapi salah
  fakta; llama-3.1-8b hanya melanggar panjang — pelanggaran yang **tertangkap** pemeriksa kontrak
  lalu diganti fallback deterministik. Jawaban salah yang murah lebih mahal daripada jawaban yang
  ditolak.
- **`translate_subtitle` tetap granite**: ia menerjemahkan kalimat bank yang sudah divalidasi
  manusia, tidak menilai murid, tidak menjelaskan aturan. Frekuensi tertinggi ⇒ model termurah.
- **sea-lion menunggu.** Syarat promosi tertulis di kode: ≥50 kasus jawaban salah tanpa satu pun
  pelunakan benar/salah, plus lulus `checkOutputContract()` pada dua tugas kebenaran.
- Konsekuensi biaya dicatat jujur: 70b = 60 neuron/permintaan ⇒ ±165 permintaan/hari di jatah
  10.000 neuron gratis. Yang memotong adalah `NEURONS.softLimit` (8.000) → tier degradasi →
  fallback, bukan menukar kebenaran dengan harga sejak permintaan pertama.

## 4. Mutu keluaran sebagai kontrak, disetel di satu tempat

`AiTasks.OUTPUT_CONTRACT` (frozen) memegang seluruh angka dan daftar kata:

```
sentenceLimits { tutor_turn:6, writing_feedback:8, context_coach:4, session_recap:3, translate_subtitle:0 }
bannedWords ['tidak']   preferredWord 'nggak'   sentenceTolerance 0
styleCheckedTasks [tutor_turn, writing_feedback, context_coach, session_recap]
```

- Batas yang sama dipakai **dua kali**: sebagai kalimat di prompt (permintaan) dan sebagai
  `checkOutputContract()` sesudah jawaban (penegakan). Tidak ada angka yang diketik ulang — prompt
  membaca `sentenceLimitFor()`, dan gerbang memeriksa bahwa `route-ai.js` tidak menyimpan ambang
  atau daftar kata sendiri.
- Penolakan: melebihi batas kalimat (`sentence_limit_exceeded`), memakai "tidak" pada task naskah
  (`banned_word:tidak`), atau kosong (`empty_output`). Jawaban yang ditolak **tidak pernah tampil**;
  murid mendapat fallback deterministik dan sebabnya dicatat (`deps.recordFailure` +
  field `reason` pada respons, memakai kosakata kami sendiri — tanpa nama model/akun).
- `countSentences()` membuang penanda daftar ("1.", "2)", "- ") sebelum menghitung, jadi jawaban
  berpoin tidak ditolak hanya karena rapi.
- **Penolakan mutu TIDAK membuka breaker** (provider menjawab; jawabannya yang tidak layak),
  sementara `empty_output`/`reasoning_overflow` dihitung `empty_body`. Perbedaan ini diuji.
- Kanon diterapkan pada fallback juga: `Skor nggak dicatat.`, `nggak ada kelemahan menonjol`, dan
  daftar recap dirapatkan dengan koma (dulu "1. x 2. y" — nomor bertitik membuat satu kalimat
  terbaca sebagai beberapa kalimat). Gerbang membuktikan setiap fallback **lulus pemeriksa yang
  sama** dengan jawaban model; `translate_subtitle` tetap sengaja kosong (kegagalan senyap subtitle
  dipertahankan supaya latihan listening tidak tertutup).

## 5. Gerbang

`tests/ai-response-shape-test.js` (baru, node murni + `tools/cf-test-harness.js` `makeEnv`/`fakeAI`) —
**48 assert PASS**, exit 0. Yang dibuktikan: kedua bentuk jawaban terbaca; `content` kosong +
`reasoning_content` terisi = `reasoning_overflow`; lima variasi jawaban kosong tidak pernah lolos
sebagai sukses; jawaban 8 kalimat pada batas 6 ditolak sementara tepat 6 diterima; pola pelanggaran
terukur 7–8 kalimat tertangkap; isi reasoning tidak pernah muncul di respons; "tidak" ditolak pada
task naskah dan diizinkan pada terjemahan verbatim; sebab dicatat dengan `breakerCounted` yang benar;
registry tidak memakai granite untuk tugas analisa (model maupun tier degradasi); sea-lion tercatat
kandidat; gemma-4-26b tidak dirujuk task mana pun.

`tests/ai-task-contract-test.js` (diperluas) — **125 assert PASS**, exit 0. Tiga assert lama yang membagi
model berdasarkan frekuensi/harga diganti assert berbasis bukti, ditambah: granite dilarang di
tugas analisa, degradasi tidak mendarat di granite, batas kalimat ada di satu kontrak, prompt
memakai batas dari kontrak itu, dan fallback lulus kontraknya sendiri.

Terdaftar di `.github/workflows/quality.yml` (`node tests/ai-response-shape-test.js`, tepat sesudah
`tests/ai-task-contract-test.js`).

Verifikasi exit 0: `tests/ai-response-shape-test.js`, `tests/ai-task-contract-test.js`, `tests/cf-wiring-test.js`,
`tests/cf-api-contract-test.js`, `tests/quota-core-test.js`, `tests/regression-test.js`, `tests/install-health-test.js`
(ikut diperiksa: `tests/ai-integration-test.js`, `tests/breaker-test.js`, `tests/core-worker-contract-test.js`).

## 6. Yang masih terbuka

- **sea-lion belum diuji lanjutan.** Kalau lulus ≥50 kasus jawaban salah, ia menawarkan jawaban
  2–3× lebih cepat dari 70b dengan nada yang lebih baik; itu perbaikan nyata bagi murid, jadi uji
  ini bernilai dijalankan.
- **Biaya 70b di `tutor_turn`** (rate limit 20/jam) adalah task berfrekuensi tertinggi di antara
  tugas kebenaran. Angka lapangan sesudah pemakaian nyata perlu dibaca ulang: kalau `softLimit`
  terlalu sering memotong, jalan keluarnya adalah cache/pra-generate penjelasan soal, bukan
  menurunkan model ke granite.
- Ambang `NEURONS.softLimit` masih 8.000 dari desain lama; ia belum dikalibrasi ulang terhadap
  campuran model baru (70b = 60 neuron/permintaan).
