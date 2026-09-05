# roll/s5ai — Lepas jalur AI dari SDK Puter

Cabang: `roll/s5ai`. Basis: `2b4b3eb` (m025-172). Tidak di-push. Versi build TIDAK dinaikkan.

## 1. Masalah yang ditutup

`askFiezelAI` punya dua ikatan yang membuat `FIEZEL_CF_CONFIG.endpoints.ai='on'` mustahil dinyalakan:

1. **Pra-syarat SDK Puter yang keras.** `if(typeof puter==='undefined'||!puter?.workers?.exec) throw` — dicatat di `reports/work-w1-flags.md` §7 butir 2. Tanpa SDK, tidak ada jawaban AI, walau Worker Cloudflare sudah hidup dan tidak butuh Puter sama sekali.
2. **Prompt dirakit di klien.** Prompt jadi dikirim ke `/api/ai/chat` sebagai field `prompt`. Worker memakai kontrak lain: `POST /api/ai/task`, skema `fiezel-ai-task-v2`, **input terstruktur**, dan `prompt` masuk `FORBIDDEN_FIELDS` (`workers/api/ai/ai-tasks.js`) yang dijawab **HTTP 400**. Jadi mengarahkan pemanggil lama ke endpoint baru bukan sekadar ganti URL — badan permintaannya pasti ditolak.

Ditambah dua cacat UX yang sudah tercatat dan ikut diperbaiki di sini: tombol "Coba lagi" pada cabang kuota habis (`app.js:5272`, `reports/cf-b8-ux-quota.md` §1 S2/S3) dan `renderAIError` yang mencetak galat provider mentah dengan tombol ulang aktif seketika (temuan cf-a12).

## 2. Bentuk perubahan

Semuanya di dalam `app.js`, di satu blok bersentinel `/* AI-TASK-TRANSPORT-BEGIN … /* AI-TASK-TRANSPORT-END */` yang menempati posisi `askFiezelAI` lama.

```
askFiezelAI(prompt, task, ctx)        -> STRING   (kontrak lama, tidak berubah)
  askFiezelAIResult(prompt, task, ctx) -> {text, degraded, note, source, transport}
    aiTaskTransportMode()==='on' && task terpetakan && input lengkap
      -> askCloudflareAITask(task, ctx)   POST /api/ai/task  (INPUT TERSTRUKTUR)
    selain itu
      -> askPuterAI(prompt, task)         coreWorkerExec('/api/ai/chat')  (JALUR HARI INI)
```

`askPuterAI` memuat badan `askFiezelAI` hari ini **apa adanya**: pra-syarat SDK Puter, perakitan prompt di klien, `coreWorkerExec('/api/ai/chat')`, dan pembungkus timeout. Pada mode `off` (default repo) yang dijalankan adalah jalur itu, tanpa satu pun fetch tambahan, dan badan permintaannya tetap tepat tiga kunci `{task, profile, prompt}`.

### Kenapa TIDAK jadi modul di `features/`

Brief mengizinkan modul baru "bila perlu". Ternyata tidak perlu, dan biayanya nyata: berkas baru harus masuk `index.html` **dan** daftar `ASSETS` precache `sw.js`, dan perubahan precache mewajibkan `SW_REV`/`DIAG_BUILD`/`FIEZEL_PAGE_BUILD` naik bersamaan (`tests/install-health-test.js`, `tests/pwa-release-coherence-test.js`). Brief melarang bump versi build. Jadi blok bersentinel di `app.js` adalah satu-satunya bentuk yang memenuhi kedua batasan sekaligus. Blok itu bisa diangkat menjadi modul kapan saja dalam commit yang memang menaikkan versi.

## 3. Pemetaan task ke registry Worker

Nama field dibaca dari `spec.input` tiap task di `workers/api/ai/ai-tasks.js`, tidak dikarang. Gerbang barunya **memparse ulang registry itu** dan membandingkan field yang benar-benar dikirim, jadi kalau schema Worker berubah gerbangnya merah, bukan tetap hijau atas nama lama.

| Task klien | Task Worker | Field input yang dikirim |
|---|---|---|
| `quiz_explanation`, `question`, `vocabulary_explanation` | `tutor_turn` | `question`, `surface:'ask'`, `level`, `lessonId?`, `focusLabel?`, `stage?` |
| `coach_question` | `tutor_turn` | idem, `surface:'coach'` |
| `writing_feedback` | `writing_feedback` | `text`, `promptId`, `level`, `rubricId` |
| `context_coach` | `context_coach` | `snapshot`, `privacy`, `evidence?`, `policy?`, `outcomes?`, `profile?` |
| `translate_subtitle` | `translate_subtitle` | `en`, `bankVersion`, `itemId?` |
| `session_recap` | `session_recap` | `level`, `bankVersion`, `weakSkills`, `missedItemIds?` |

Panjang dipotong di klien pada batas yang sama dengan schema, supaya permintaan yang pasti dijawab 400 tidak pernah dikirim. Task yang tidak terpetakan, atau input yang tidak lengkap, **tidak** menghasilkan permintaan CF — pemanggilnya jatuh ke jalur Puter.

`rubricId` diambil dari `WRITING_BANK.rubric.id` (`fiezel-writing-rubric-v1`, ada di `writing-prompts-v1.json`), bukan konstanta baru.

## 4. Degradasi dan kuota, memakai naskah yang sudah ada

Semua kalimat dikutip dari `reports/cf-b8-ux-quota.md` dan dari `POLITE` milik Worker. Tidak ada kalimat baru yang dikarang.

| Keadaan | Sumber naskah | Tombol "Coba lagi" |
|---|---|---|
| 429 kuota habis | **QC-A1** §2.1 + `{waktuReset}` dari `retryAfter` | **tidak dirender** |
| provider mati / skema asing | **QC-A3** §2.4 (kalimat `extra` hanya bila server melaporkan `breaker`) | **tidak dirender** |
| offline | **QC-B3** §2.5 | **tidak dirender** |
| 200 + `degraded:true` | `POLITE.degraded` (`route-ai.js`): "Mode hemat — jawaban ini dari FIEZEL, bukan AI." | tidak relevan, ini **jawaban** |
| jaringan sekejap / timeout | naskah generik kami | dirender **lumpuh** selama 6000 ms |

`degraded:true` sengaja **tidak** dilempar sebagai galat. Ia dirender lewat `renderAIResult`/`renderCoachResult` sebagai jawaban normal dengan satu penanda `<p class="ai-degraded-note" data-ai-degraded="1">`. Sebab internal (`reason`, `breaker`, `source`) tidak ikut ke DOM.

`{waktuReset}` diisi lewat `levelExamCooldownLabel()` yang sudah ada ("3 jam lagi"). Tanpa `retryAfter` yang jujur, teksnya turun ke "nanti" — cf-b8 §2 melarang menebak jam.

## 5. `renderAIError` (temuan cf-a12)

- `aiErrorMessage` tidak lagi mengembalikan `err.message` apa adanya di cabang terakhirnya. Kode terkurasi (`popup_blocked`, `auth_window_closed`, timeout) tetap; sisanya jadi satu kalimat kami. Isi mentah dibuang ke `console.debug('[ai-error]', …)` — konsol, bukan DOM.
- Kalimat "Pastikan Anda sudah login ke Puter" dihapus: menyebut nama vendor ke murid (larangan cf-b8 S3) dan memakai "Anda" (aturan nada §2 mewajibkan kamu-POV).
- Tombol ulang, ketika memang layak, dirender `disabled aria-disabled="true" data-retry-delay="6000"`. `onclick` dipasang **lebih dulu**; yang ditahan adalah kemampuan menekan, bukan keberadaan penangannya. `AI_RETRY_DELAY_MS=6000`.

## 6. Kontrak protokol

- Tiga pemeriksaan `protocol:'1.7'` (`policy_protocol_mismatch`, `protocol_mismatch`, `coach_protocol_mismatch`) **tidak disentuh**. Blok transport tidak memuat `CORE_PROTOCOL_VERSION` sama sekali, dan gerbangnya mengassert ketiganya masih ada dan masih dibandingkan terhadap konstanta itu.
- Jalur `/api/ai/task` punya kontraknya sendiri: `fiezel-ai-response-v2`. Jawaban tanpa skema itu **mematikan jalur CF** untuk sisa umur halaman (latch `aiTaskProtocolOk`) dan jawabannya tidak ditampilkan. Sesudah latch, `aiTaskTransportMode()` mengembalikan `'off'` dan murid dilayani jalur Puter. Latch tidak ditulis ke `localStorage` — ia keadaan halaman, bukan keputusan permanen.
- Pemeriksaan skema dilakukan **sebelum** status HTTP diperiksa, termasuk pada 429. Server yang salah kontrak tidak boleh dipercaya bahkan soal kuota.

## 7. Gerbang baru: `tests/ai-transport-switch-test.js`

Node murni, tanpa dependency, tanpa jaringan (`fetchMock` lokal, dikenali `tests/no-network-test.js`). Blok transport dan fungsi render dipotong dari `app.js` lewat sentinel dan dijalankan di `vm` — perilaku diuji, bukan teks dicocokkan. Terdaftar di `.github/workflows/quality.yml` sesudah `tests/cf-shadow-mode-test.js`. **113 assert, semuanya PASS.**

| Tuntutan | Cara diassert |
|---|---|
| (a) `off` = nol permintaan CF, jalur Puter tak berubah | `cfCalls.length===0`; tepat satu `coreWorkerExec('/api/ai/chat')`; kunci badan tepat `profile,prompt,task`; prompt klien terkirim utuh; `enabled:false` mengalahkan `ai:'on'`; flag repo diassert masih `off` |
| (b) `on` = input terstruktur, tanpa prompt jadi | field dibandingkan dengan schema hasil parse `ai-tasks.js`; nol `FORBIDDEN_FIELDS`; **plus** pemindaian nilai: tidak ada string >600 char dan tidak ada penanda instruksi model di seluruh badan |
| (c) 429 | naskah QC-A1 verbatim, label reset relatif, `Upgrade Plus` sebagai kalimat bukan tautan, `!/id="aiRetry"/`, callback retry nol kali |
| (d) `degraded:true` | dirender sebagai `.ai-answer` + `data-ai-degraded="1"`, bukan modal galat; `reason`/`breaker`/`source` absen dari DOM |
| (e) galat provider mentah | empat skenario (429, 500, 200-tanpa-teks, jaringan gagal): nol penanda mentah, nol angka status HTTP, nol nama vendor di DOM |
| (f) jeda | tombol `disabled`+`aria-disabled`, `onclick` sudah terpasang, timer ≥1000 ms terjadwal, aktif sesudah timer, satu tekanan = satu percobaan |
| (g) protokol tidak cocok | `ai_protocol_mismatch`; permintaan CF kedua tidak pernah terjadi; `aiTaskTransportMode()==='off'`; jawaban server salah kontrak tidak masuk DOM |

Ditambah assert struktural: blok transport tidak menyentuh `localStorage`/`document`/`innerHTML`, dan tidak ada URL Cloudflare hardcode di `app.js`.

## 8. Satu gerbang lama diubah — ini alasannya

`tests/ai-integration-test.js` dulu memanggil `renderAIError('<svg onload=x>',{message:'<img src=x onerror=x>'})` lalu menuntut `&lt;img` **muncul** di DOM. Tuntutan itu kini bertabrakan dengan kontrak baru: isi `err.message` tidak boleh sampai ke DOM sama sekali. Menuntut versi ter-esc-nya muncul sama dengan menuntut kebocoran yang baru ditutup.

Perubahannya minimal dan tidak melemahkan apa pun: teks bermarkup dipindahkan ke argumen **judul** (judul berasal dari kode kami sendiri dan tetap harus diloloskan), jadi jalur pelolosan HTML tetap diuji lewat fungsi yang sama. Satu assert **ditambah**: isi galat provider tidak boleh muncul. Bersihnya cek jadi lebih kuat, bukan lebih lemah.

## 9. Yang TIDAK dikerjakan, dan sebabnya

Tiga hal ini sengaja tidak diselesaikan. Menyebutnya di sini supaya tidak dibaca sebagai sudah beres.

1. **Terjemahan subtitle belum memakai jalur baru.** Pembentuk input `translate_subtitle` sudah ada dan sudah digerbangi, tetapi `features/neural-voice/fiezel-subtitle-translate.js` masih memanggil `coreWorkerExec('/api/ai/translate')` dengan `{text}`. Modul itu punya kontrak `translate() -> ''` yang masuk daftar jangan-diubah cf-b8, dan mengalihkannya butuh gerbang sendiri untuk perilaku subtitle. Itu pekerjaan terpisah.
2. **`session_recap` belum punya pemanggil.** Pembentuk input ada dan digerbangi, tetapi tidak ada satu pun tempat di UI yang memanggilnya. Menambah permintaan AI di akhir sesi mengubah perilaku murid, dan itu keputusan produk, bukan sisipan refactor.
3. **`stage` dipakai sebagai tempat jawaban murid.** `tutor_turn` tidak punya field khusus untuk pasangan "jawaban dipilih / jawaban benar". `stage` (object, maxBytes 200) adalah satu-satunya slot bebas, jadi datanya dibawa di situ **sebagai data**, bukan dijahit menjadi kalimat prompt. Kalau registry Worker menambahkan field yang tepat, pindahkan ke situ.

Dua catatan kecil lain:

- `bankVersion` diisi dari `self.FIEZEL_VERSION`, bukan nomor bank yang sebenarnya. Klien tidak punya konstanta versi bank. Nilainya naik setiap rilis, jadi ia aman sebagai kunci cache (paling buruk: cache dibuang lebih sering dari yang perlu), tetapi ia bukan versi bank yang jujur.
- `aiErrorMessage` masih menyebut "Puter" pada cabang `popup_blocked` dan `auth_window_closed`. Itu naskah lama untuk galat login, di luar lingkup tugas ini, dan `tests/ai-integration-test.js` masih mengassert kalimat "diblokir browser". Kalau naskah login mau dibersihkan dari nama vendor, itu perubahan tersendiri beserta gerbangnya.
- `.ai-degraded-note` di `style.css` memakai `--panel-soft`/`--muted`/`--line`, bukan warna galat. Ikonnya `cloud-cog` karena `battery-low` tidak ada di subset `lucide.min.js` yang dibundel; ikon yang tidak ada akan gagal senyap.

## 10. Verifikasi

Default repo tetap `endpoints.ai:'off'` di `core-config.js` — diassert oleh gerbang baru, bukan cuma diklaim di sini. Versi build tidak dinaikkan. `*-REPORT.json` yang ikut ter-regenerasi dipulihkan.

Semua exit 0:

```
tests/ai-transport-switch-test.js   tests/ai-integration-test.js   tests/cf-transport-test.js
tests/cf-shadow-mode-test.js        tests/tutor-reteach-card-test.js  tests/regression-test.js
tests/ui-structure-test.js          tests/install-health-test.js   tests/a11y-test.js
```

Gerbang tetangga yang menyentuh literal yang sama, juga exit 0: `product-audit.js`, `tests/core-brain-test.js`, `tests/boot-order-test.js`, `tests/no-network-test.js`, `tests/contrast-test.js`, `validator.js`, `tests/cf-live-contract-test.js`, `tests/release-audit-gate-test.js`, `tests/pwa-release-coherence-test.js`, `grammar-quality-audit.js`, `content-integrity-audit.js`.
