# CF-ROLLOUT-PLAN — rencana penyalaan bertahap jalur Cloudflare

> Dokumen ini **bukan** ringkasan `docs/CF-MIGRATION-RUNBOOK.md`. Runbook menjawab "bagaimana
> memutar flag". Berkas ini menjawab tiga hal yang runbook belum jawab dengan angka: **urutan
> mana**, **ambang batal berapa**, dan **apa yang memblokir langkah mana hari ini**.
>
> Gerbang yang menjaga berkas ini: `tests/rollout-plan-test.js` (terdaftar di
> `.github/workflows/quality.yml`). Kalkulator keadaan flag: `tools/flag-plan-check.mjs`.

---

## 0. Keadaan nyata hari ini (diverifikasi dari repo, bukan diingat)

| Fakta | Bukti di repo |
|---|---|
| Worker `fiezel-api` hidup di Cloudflare, `workers_dev = false` | `workers/api/wrangler.toml:18` |
| Worker `fiezel-owner` terpisah, hostname `owner.fiezel.my.id` | `workers/owner/wrangler.toml` |
| `https://api.fiezel.my.id` adalah **proxy PHP di origin ArenHost**, bukan custom domain CF; dijaga header bersama `X-Fiezel-Edge`; akses langsung ke `*.workers.dev` dijawab **403 `forbidden_edge`** | `reports/work-e9-edge.md` §1–2, `workers/api/mw-edge.js`, `deploy/edge/api-index.php` |
| D1 `fiezel-core` + `fiezel-stats` sudah dimigrasi, dua binding terpisah | `workers/api/wrangler.toml` blok `[[d1_databases]]`, `workers/api/migrations/MIGRATIONS.md` |
| 2 cron terpasang: `*/5 * * * *` (sweep kuota) dan `5 17 * * *` (rollup + rotasi pepper 00:05 WIB) | `workers/api/wrangler.toml` `[triggers]`, `workers/api/index.js:214` `scheduled()` |
| **Semua flag klien MATI**: `enabled:false`, `base:''`, ketujuh endpoint `off` | `core-config.js` `FIEZEL_CF_CONFIG` |
| `FEATURE_AI` / `FEATURE_TTS` / `FEATURE_COACH` = `off`, `ANALYTICS_ENABLED = on` di Worker | `workers/api/wrangler.toml` `[vars]` |
| Kill switch server ada: `GET /api/config` membaca KV `cfg:flags`, `cacheTtl` 60 s, `no-store`; nilai sampah/absen jatuh ke default `false` | `workers/api/route-config.js`, `workers/api/schema.js:108-123` |
| Mode `shadow` sudah ada di sakelar transport dan sudah diuji perilakunya (36 assert) | `app.js` blok `CF-TRANSPORT-BEGIN/END`, `tests/cf-shadow-mode-test.js` |
| `main` auto-deploy ke produksi **tiap 5 menit** lewat cron di server | `docs/CF-MIGRATION-RUNBOOK.md`, `workers/owner/wrangler.toml` alasan #2 |

**Konsekuensi yang mengikat seluruh dokumen ini:** karena `main` auto-deploy tiap 5 menit dan
`core-config.js` ikut precache `sw.js:35` (dilayani **cache-first**), tidak ada satu pun langkah
di bawah yang boleh bergantung pada "edit `core-config.js` lalu push" sebagai cara menyalakan
atau mematikan. Lihat Bagian 4.

---

## 1. Urutan penyalaan — satu rilis per endpoint

Prinsip urutan: **yang kegagalannya tidak terlihat murid lebih dulu, yang kegagalannya
menghapus pengalaman murid paling akhir**. Tiap langkah punya nomor rilis sendiri
(`R1`…`R7`); dua langkah **tidak boleh** berada dalam satu rilis.

Setiap langkah dijalankan dalam tiga gerak: `off` → `shadow` (Bagian 2) → `on`. Yang ditulis
sebagai "ambang batal" di bawah berlaku untuk **gerak `on`**; ambang tahap bayangan ada di
Bagian 2.

Ringkasan urutan:

`R1 health` → `R2 config` → `R3 usage` → `R4 quota` → `R5 auth` → `R6 tts` → `R7 ai`

`R2 config` sengaja **kedua, bukan terakhir**: selama klien tidak membaca `/api/config`, KV
`cfg:flags` tidak mengendalikan apa pun dan seluruh rencana ini kehilangan kill switch-nya.
`tools/flag-plan-check.mjs` menolak kombinasi itu dengan `DANGER KILL_SWITCH_TAK_TERBACA`.

---

### R1 — `health` → `on`

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.health='on'` + `flags.cfApiEnabled=true`. Path terkena: `GET /health` saja. |
| **Siapa yang terkena** | Nol murid. `/health` hanya dipanggil `coreBrainHealth()` untuk panel diagnostik; kegagalannya tidak menghapus satu pun pelajaran. |
| **Yang diukur** | (a) rasio jawaban HTTP 200; (b) `protocol` di badan jawaban; (c) p95 latensi jembatan; (d) jumlah 403 `forbidden_edge` (= proxy tidak mengirim header). |
| **Ambang BATAL (konkret)** | Batalkan bila salah satu terjadi: **rasio non-200 > 1% dari ≥ 200 permintaan**; **≥ 1 jawaban dengan `protocol` ≠ `1.7`**; **p95 > 800 ms** diukur pada ≥ 200 permintaan; **≥ 1 respons 403 `forbidden_edge`** dari klien yang lewat `api.fiezel.my.id`. |
| **Batal < 60 detik** | Prosedur B-1 (Bagian 1.8): satu `wrangler kv key put` menjadikan `cfApiEnabled=false`. Efek ≤ 60 detik (`cacheTtl` KV 60 s), tanpa deploy ulang. |

### R2 — `config` → `on`

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.config='on'`. Path: `GET /api/config`. Setelah langkah ini, kill switch server benar-benar mengendalikan klien. |
| **Siapa yang terkena** | Semua murid, tetapi hanya pada **satu pembacaan saat boot** dengan timeout pendek; kegagalannya sudah didefinisikan aman (`route-config.js`: gagal ⇒ pakai default `off`). |
| **Yang diukur** | (a) rasio 200; (b) `flags` **tidak kosong** dan semuanya bertipe boolean; (c) p95 latensi; (d) waktu boot ke first paint dibanding baseline; (e) jumlah boot yang jatuh ke default karena timeout. |
| **Ambang BATAL** | **rasio non-200 > 1% dari ≥ 200 permintaan**; **p95 > 500 ms**; **`flags` kosong `{}` ≥ 1 kali** (klien akan mengira semua off dan rencana macet tanpa sebab yang terlihat); **tambahan waktu boot > 300 ms** pada p95 dibanding baseline; **> 5% boot jatuh ke default karena timeout** dari ≥ 200 boot. |
| **Batal < 60 detik** | B-1 dengan `cfApiEnabled=false`. Catatan: setelah `cfApiEnabled=false`, klien kembali membaca hanya flag statis — dan flag statis semuanya `off`. |

### R3 — `usage` → `on`

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.usage='on'` + `flags.cfAnalyticsEnabled=true` + `enabled.analytics=true` + var Worker `ANALYTICS_ENABLED='on'`. Path: `/api/usage/*`, `/api/activity`, `/api/feedback`, `/api/policy/*`. |
| **Siapa yang terkena** | Semua murid, tetapi ketiga jalur pertama punya fallback senyap/antrean di klien. `/api/policy/*` adalah pengecualian: ia memberi rekomendasi adaptif dan pemanggilnya menolak jawaban dengan `policy_protocol_mismatch` — kegagalannya membuat rekomendasi kembali ke aturan lokal, bukan hilang. |
| **Yang diukur** | (a) rasio 2xx; (b) rasio ketidaksesuaian status CF vs baseline Puter dari tahap bayangan; (c) p95 latensi `/api/policy/next`; (d) jumlah `policy_protocol_mismatch`; (e) baris ganda di D1 `fiezel-stats` (rollup harian tidak boleh menghitung satu peristiwa dua kali). |
| **Ambang BATAL** | **rasio non-2xx > 2% dari ≥ 500 permintaan**; **p95 `/api/policy/next` > 1200 ms**; **≥ 1 `policy_protocol_mismatch`**; **≥ 1 baris ganda** terdeteksi di rollup harian; **> 700 tulis KV/hari** (70% dari 1.000, batas plan gratis — tanda ada jalur panas yang menulis KV). |
| **Batal < 60 detik** | B-1 dengan `cfAnalyticsEnabled=false`. Kalau yang bermasalah adalah **penulisan** (bukan transport), gerak yang lebih murah adalah `enabled.analytics=false` — `/api/usage/*` tetap menjawab 202 `{disabled:true}` sehingga klien lama tidak mengulang tanpa henti. |

### R4 — `quota` → `on`

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.quota='on'` + `flags.cfQuotaEnabled=true`. Path: `/api/quota/*`. Ini **tampilan + gerbang** kuota server; penegakannya sudah ada di Worker. |
| **Siapa yang terkena** | Semua murid melihat angka sisa jatah dari server. Salah angka = naskah UX kuota (bab 12) berbohong. |
| **Yang diukur** | (a) rasio 200; (b) selisih angka yang ditampilkan vs `snapshot()` server; (c) rasio 401 (identitas belum ada); (d) p95; (e) `used_effective = counter + Σ reservasi terbuka` (invarian `reports/exec-e3-quota.md` §3.1); (f) jumlah reservasi menggantung setelah cron sweep 5 menit. |
| **Ambang BATAL** | **> 1 dari 200 tampilan berbeda** dari snapshot server; **rasio 401 > 0,5% dari ≥ 200 permintaan** pada sesi yang seharusnya beridentitas; **p95 > 700 ms**; **≥ 1 pelanggaran invarian `used_effective`**; **≥ 5 reservasi masih menggantung > 10 menit** (dua siklus cron) — berarti sweep tidak berjalan. |
| **Batal < 60 detik** | B-1 dengan `cfQuotaEnabled=false`. **Konsekuensi yang harus disadari sebelum menekan:** dengan `quota=off`, `ai`/`tts` yang masih `on` menjadi **tanpa plafon**. Jadi urutan batal yang benar adalah `ai`+`tts` dulu, `quota` sesudahnya — itu satu perintah yang sama (B-2), bukan dua. |

### R5 — `auth` → `on` (identitas; paling berisiko dari yang non-biaya)

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.auth='on'` + `flags.cfIdentityEnabled=true`. Path: `/api/auth/*` (`anon`, `claim`, sesi cookie `fz_id`). |
| **Siapa yang terkena** | **Semua murid.** Salah pemetaan identitas = progres murid **tampak hilang massal**, dan tidak bisa dipulihkan dari server karena progres memang tidak pernah ada di server (bab 1). Progres lama tetap ada di perangkat; yang patah adalah kunci yang dipakai membacanya. |
| **Yang diukur** | (a) `Set-Cookie fz_id` lengkap (`HttpOnly`, `Secure`, `SameSite=Lax`, `Domain=fiezel.my.id`, `Max-Age`) — sudah dijamin `tests/cf-live-contract-test.js` bila dijalankan; (b) rasio 200 pada `POST /api/auth/anon`; (c) laju penerbitan identitas anonim per jam; (d) rasio 401 pada `/api/user/me` untuk sesi yang seharusnya sah; (e) laporan "progres hilang" dari murid; (f) p99 CPU Worker. |
| **Ambang BATAL** | **≥ 1 laporan progres tampak hilang** (nol toleransi — ini bukan metrik statistik); **≥ 1 respons tanpa `Domain=fiezel.my.id`** pada `Set-Cookie` (cookie host-only ⇒ identitas patah antara `fiezel.my.id` dan `api.fiezel.my.id`); **rasio 401 pada `/api/user/me` > 1% dari ≥ 200 permintaan bersesi**; **laju penerbitan anon > 3× baseline per jam**; **p99 CPU > 8 ms** atau **≥ 1 error 1102** (batas plan gratis 10 ms/permintaan; verifikasi HMAC + parse JSON memakai 10–20 ms menurut dokumentasi, jadi jalur ini praktis tidak muat). |
| **Batal < 60 detik** | B-1 dengan `cfIdentityEnabled=false`. Kunci progres lama tetap dibaca klien, jadi `off` **memulihkan** — itu sebabnya identitas tidak boleh pernah menulis ulang kunci progres lokal. |

### R6 — `tts` → `on` (mulai membakar uang)

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.tts='on'` + `flags.cfTtsEnabled=true` + `enabled.tts=true` + var Worker `FEATURE_TTS='on'`. Path: `/api/tts/render`, `/api/tts/manifest`. |
| **Siapa yang terkena** | Semua murid yang mendengar suara. Kegagalan terburuk bukan galat, tetapi **senyap total** — audio 0 byte yang tetap "berhasil". |
| **Yang diukur** | (a) rasio cache-hit R2 (`env.AUDIO.head()` sebelum render — server yang berwenang menyatakannya, bukan klien); (b) rasio klip dengan panjang byte 0 atau gagal decode; (c) neuron akun terpakai per hari; (d) p95 waktu ke audio pertama; (e) jumlah "too many subrequests" pada jalur murid; (f) karakter TTS per murid per hari vs plafon. |
| **Ambang BATAL** | **rasio cache-hit < 70% dari ≥ 200 permintaan** (di bawah itu, biaya runtime menggantikan pra-render dan tagihannya naik lipat); **rasio audio senyap/gagal decode > 0,5% dari ≥ 200 klip**; **neuron > 8.000/hari** (= `GLOBAL_NEURON_CAP`, sengaja di bawah plafon akun 10.000/hari); **p95 waktu ke audio pertama > 2.500 ms**; **≥ 1 "too many subrequests"** pada jalur yang dipakai murid; **≥ 1 murid melampaui 12.000 karakter/hari** (`FREE_TTS_DAILY_CHARS`). |
| **Batal < 60 detik** | B-1 dengan `cfTtsEnabled=false`; suara kembali ke jalur Puter/neural lokal yang masih hidup. Kalau yang rusak adalah **provider** (bukan transport), `enabled.tts=false` lebih tepat: klien menyembunyikan tombol alih-alih mencoba lalu gagal. |

### R7 — `ai` → `on` (paling berisiko: biaya + paling terlihat)

| | |
|---|---|
| **Yang dinyalakan** | `endpoints.ai='on'` + `flags.cfAiEnabled=true` + `enabled.ai=true` (+ `enabled.coach=true` bila `/api/coach/*` ikut) + var Worker `FEATURE_AI='on'` / `FEATURE_COACH='on'`. |
| **Urutan di dalam R7** | Satu flag klien (`ai`) menutupi `/api/ai/*` **dan** `/api/coach/*`. Urutan yang diminta runbook — `/api/ai/translate` → `/api/coach/context` → `/api/ai/chat` — karena itu **tidak bisa** dilakukan dari flag klien saja; ia harus dilakukan dari **registry task di server** (`workers/api/ai/ai-tasks.js`, `POST /api/ai/task`), satu task dinyalakan per rilis. Selama pemisahan itu belum ada, R7 adalah **satu langkah besar** — dan itu ditulis di sini sebagai kelemahan rencana, bukan disembunyikan (lihat P6 di Bagian 3). |
| **Siapa yang terkena** | Semua murid, pada fitur yang paling terlihat. Kegagalan = soal tidak bisa dijawab, tutor bisu. |
| **Yang diukur** | (a) rasio 5xx; (b) rasio jawaban kosong / hanya spasi; (c) neuron per hari; (d) p95 latensi jawaban; (e) jumlah breaker OPEN per jam; (f) pelanggaran plafon 25 panggilan AI/hari per murid; (g) rasio 429 (kuota habis) vs 502 (provider gagal) — keduanya tidak boleh bertukar tempat. |
| **Ambang BATAL** | **rasio 5xx > 1% dari ≥ 200 permintaan**; **rasio jawaban kosong > 0,5% dari ≥ 200 jawaban**; **neuron > 8.000/hari**; **p95 > 6.000 ms** (batas kesabaran murid; `AI_TIMEOUT_MS=20000` adalah batas gagal, bukan batas nyaman); **breaker OPEN > 2 kali/jam**; **≥ 1 murid berhasil melewati 25 panggilan/hari** (over-grant kuota — nol toleransi, ini kebocoran biaya); **≥ 1 kegagalan provider yang dijawab 429** atau **≥ 1 kuota habis yang dijawab 5xx** (pertukaran amplop galat berarti naskah UX berbohong ke murid). |
| **Batal < 60 detik** | B-1 dengan `cfAiEnabled=false` **dan** `enabled.ai=false` dalam satu perintah. Jalur Puter melayani AI seperti sebelum rilis. |

### 1.8 Prosedur pembatalan — B-1, B-2, B-3

**B-1 — batalkan satu endpoint (target: < 60 detik, tanpa deploy, tanpa push).**
Waktu terukur: 1 perintah `kv key put` (≈ 3–8 s) + propagasi `cacheTtl` KV **≤ 60 s**.
Bentuk nilai KV **wajib** `{"flags":{…},"enabled":{…}}` — itu yang benar-benar dibaca
`route-config.js` lewat `mergeFlags(CLIENT_FLAG_DEFAULTS, stored.flags)` dan
`mergeFlags(KILL_SWITCH_DEFAULTS, stored.enabled)`. Bentuk lain **diabaikan tanpa galat**
(lihat P1 di Bagian 3).

```bash
cd FIEZEL-APPS/workers/api
# contoh: batalkan R7 (ai) saja, sisanya dibiarkan seperti sebelumnya
npx wrangler@3 kv key put --binding=CFG "cfg:flags" --remote '{
  "flags":{"cfApiEnabled":true,"cfIdentityEnabled":true,"cfQuotaEnabled":true,
           "cfTtsEnabled":true,"cfAnalyticsEnabled":true,"cfAiEnabled":false},
  "enabled":{"ai":false,"tts":true,"coach":false,"analytics":true}
}'
```

**B-2 — MATIKAN SEMUA JALUR CF (satu perintah, < 60 detik).** Ini yang dipakai kalau ragu.
Aman untuk ditekan tanpa analisis: semua `false` adalah default berkas ini, dan Puter masih
hidup penuh.

```bash
npx wrangler@3 kv key put --binding=CFG "cfg:flags" --remote '{
  "flags":{"cfApiEnabled":false,"cfAiEnabled":false,"cfTtsEnabled":false,
           "cfQuotaEnabled":false,"cfAnalyticsEnabled":false,"cfIdentityEnabled":false},
  "enabled":{"ai":false,"tts":false,"coach":false,"analytics":false}
}'
```

**Verifikasi B-1/B-2 (wajib, jangan percaya perintahnya sendiri).** Ambil jawaban server,
lalu hitung keadaan efektifnya dengan alat di repo — jangan hitung di kepala:

```bash
curl -s https://api.fiezel.my.id/api/config | node tools/flag-plan-check.mjs
# keluaran: satu baris EFFECTIVE per endpoint + daftar DANGER/WARN. Exit 3 = ada DANGER.
```

**B-3 — kalau KV sendiri yang tidak bisa ditulis** (batas 1.000 tulis/hari plan gratis
terlampaui, atau token salah): buka route Worker di dashboard (Workers & Pages → `fiezel-api`
→ Settings → Domains & Routes) **atau** matikan proxy PHP jembatan di origin dengan
menonaktifkan `X-Fiezel-Edge` — klien gagal fetch dan jatuh ke Puter. Ini lebih lambat dari
B-1 dan bukan langkah pertama.

**Yang DILARANG sebagai pembatalan:** mengubah nilai di `core-config.js` lalu push. Lihat
Bagian 4.

---

## 2. Tahap bayangan (`shadow`) — apa yang dibandingkan dan apa yang TIDAK

Mode `shadow` sudah ada dan perilakunya sudah dijamin gerbang: jawaban yang dipakai murid
**selalu** dari Puter, body respons CF **tidak pernah dibaca** (tidak ada `.json()`/`.text()`
di seluruh blok transport — di-assert), salinan membawa penanda dry-run `X-Fiezel-Shadow: 1`,
satu permintaan bayangan tanpa retry, dan blok transport tidak menyentuh
`localStorage`/state/DOM (`tests/cf-shadow-mode-test.js`).

### 2.1 Yang DIBANDINGKAN — tepatnya tiga hal

1. **Status HTTP.** `puterStatus` vs `cfStatus`, per path. Sudah dicatat hari ini oleh
   `cfShadowLog()` ke `console.debug('[cf-shadow]', path, 'puter=…', 'cf=…', 'match'|'diff')`.
   Ambang lulus: **rasio `diff` ≤ 1%**.
2. **Bentuk jawaban, bukan isinya.** Yang dibandingkan hanya: daftar kunci tingkat atas,
   tipe tiap nilai, nilai `protocol`, dan ada/tidaknya kunci wajib per endpoint. Dua jawaban
   dianggap **sesuai bentuk** bila himpunan kunci dan tipe nilainya identik.
   Ambang lulus: **rasio ketidaksesuaian bentuk ≤ 0,5% dari sampel**.
3. **Latensi.** p50 dan p95 per path, CF vs Puter. Ambang lulus: **p95 CF ≤ p95 Puter + 300 ms**.
   Latensi CF di sini **selalu memuat satu lompatan tambahan** (proxy PHP di origin ArenHost),
   jadi angka ini adalah latensi jembatan, bukan latensi Cloudflare — dan itu memang angka
   yang dialami murid hari ini.

### 2.2 Yang TIDAK BOLEH DIBANDINGKAN — dan mengapa

- **Isi jawaban AI** (`/api/ai/*`, `/api/coach/*`): keluaran model **tidak deterministik**.
  Dua panggilan dengan prompt identik ke model yang sama menghasilkan teks berbeda.
  Membandingkan isinya akan menghasilkan **alarm palsu 100%** — setiap sampel "tidak cocok",
  dan alarm yang selalu berbunyi adalah alarm yang akan dimatikan orang.
- **Byte audio TTS**: encoder, versi model, dan seam buffer membuat byte berbeda untuk teks
  yang sama. Yang boleh dibandingkan hanya **kunci cache** (deterministik, dihitung server:
  `sha256(schema␟locale␟voiceId␟engineId␟engineVersion␟settings-allowlist␟canonicalText)`) dan
  **ada/tidaknya objek di R2**. `speed`/`playbackRate` sengaja **di luar** kunci.
- **Stempel waktu dan id yang dibuat server**: `serverTime`, id reservasi kuota, `jti` tiket
  klaim. Selalu berbeda; membandingkannya tidak mengukur apa pun.
- **Angka kuota absolut selama bayangan**: permintaan bertanda `X-Fiezel-Shadow` adalah
  read-only, jadi counter CF **sengaja** tidak bergerak seperti counter Puter. Perbedaan di
  sini adalah bukti kontrak dry-run bekerja, bukan cacat.
- **Urutan atau jumlah baris analytics**: rollup CF berjalan 00:05 WIB, jalur Puter tidak.

### 2.3 Durasi dan jumlah sampel minimum

| Endpoint | Durasi minimum `shadow` | Sampel minimum sebelum kesimpulan sah |
|---|---|---|
| `health`, `config` | **24 jam** | **200 pasang** per endpoint |
| `usage` (`feedback`/`activity`/`policy`) | **72 jam** (≥ 3 hari, syarat runbook 4.6) | **500 pasang** per keluarga path |
| `quota` | **72 jam** | **200 pasang** |
| `auth` | **72 jam** | **200 pasang**, dan **≥ 20 sesi berbeda** |
| `tts` | **24 jam** dan **tidak lebih dari 48 jam** | **200 pasang** |
| `ai` | **24 jam** dan **tidak lebih dari 48 jam** | **200 pasang** |

Dua batas atas itu bukan kelalaian: `shadow` pada `ai`/`tts` **membakar neuron sungguhan**
walau jawabannya dibuang. `tools/flag-plan-check.mjs` mengeluarkan `WARN SHADOW_BERBAYAR`
setiap kali salah satu dari keduanya bernilai `shadow`.

Kesimpulan **tidak sah** bila durasi minimum belum lewat **atau** jumlah sampel minimum belum
tercapai — mana pun yang lebih lambat. Satu hari sepi dengan 12 sampel bukan bukti apa pun.
Rentang jam juga harus memuat **≥ 1 jam sibuk sore/malam WIB**, karena kuota Cloudflare reset
00:00 UTC = 07:00 WIB sehingga gejala batas harian muncul sore/malam dan hilang jam 7 pagi.

---

## 3. Prasyarat yang BELUM dipenuhi — dan langkah mana yang diblokirnya

Daftar ini adalah **prasyarat belum terpenuhi**, ditulis apa adanya. Tidak ada satu pun
langkah di Bagian 1 yang boleh dijalankan sebelum prasyarat yang memblokirnya selesai.

| # | Prasyarat yang belum terpenuhi | Bukti | Memblokir |
|---|---|---|---|
| **P0** | **Klien belum punya pembaca `/api/config`.** Di seluruh `app.js`, `index.html`, dan `features/`, string `/api/config` hanya muncul **satu kali, di dalam komentar** (`app.js:2044`). Artinya KV `cfg:flags` hari ini tidak mengendalikan apa pun di sisi klien: kill switch ada di server, tapi belum ada yang mendengarnya. | `grep -rn '/api/config' app.js index.html features/` → 1 hasil, komentar | **R1–R7 semuanya.** Tanpa ini, prosedur B-1/B-2 hanya mengubah JSON yang tidak dibaca siapa pun. |
| **P1** | **Bentuk nilai KV di runbook 4.6/4.7 SALAH.** Contoh di runbook menulis kunci datar `{"transport":"shadow","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}`. `route-config.js` membaca `stored.flags` dan `stored.enabled`, dan `mergeFlags()` **hanya menerima kunci yang sudah dikenal bertipe boolean**. Perintah runbook itu karena itu **diterima KV tanpa galat lalu diabaikan sepenuhnya** — kill switch yang terasa bekerja tetapi tidak mengubah apa pun. | `workers/api/route-config.js` `mergeFlags`, `workers/api/schema.js:108-123` vs `docs/CF-MIGRATION-RUNBOOK.md` 4.6/4.7 | **R1–R7.** Perbaiki runbook ke bentuk B-1/B-2 di Bagian 1.8, atau tambahkan penerimaan kosakata lama di Worker. Jangan biarkan dua bentuk hidup bersama. |
| **P2** | **Kuota 25/26 belum diuji di runtime nyata.** `FREE_AI_DAILY_LIMIT=25` diuji hanya lewat `tools/cf-test-harness.js` (D1/KV/R2/AI palsu). Belum pernah ada bukti bahwa permintaan **ke-26** ditolak 429 oleh D1 sungguhan, dan `UPDATE … WHERE used + held + :amount <= limit RETURNING` bukan serializable seketat Durable Object. Tambahan: `AI_LIMIT_PER_DAY="20"` di `[vars]` **tidak sama** dengan 25 yang ditegakkan — satu angka untuk naskah UX, satu untuk gerbang; itu perlu disatukan atau naskahnya akan berbohong. | `reports/exec-e3-quota.md` §2 & §4, `workers/api/wrangler.toml` `[vars]` | **R4, R6, R7.** `ai`/`tts` tanpa plafon yang terbukti = biaya tak terbatas. `flag-plan-check.mjs` menandainya `DANGER AI_TANPA_KUOTA` / `TTS_TANPA_KUOTA`. |
| **P3** | **Cache TTS belum diuji di runtime nyata.** Kunci cache v2 dan `HEAD R2` sebelum render diuji `tests/tts-key-test.js` secara murni; **rasio cache-hit sungguhan belum pernah diukur** terhadap bucket `fiezel-audio` berisi 1.170 objek. Ambang batal R6 (< 70%) karena itu belum punya baseline. | `reports/exec-e5-ai-tts.md`, `tests/tts-key-test.js` | **R6.** |
| **P4** | **Kedua cron belum terbukti benar-benar berjalan.** `[triggers] crons` terpasang dan `scheduled()` ada, tetapi belum ada satu pun bukti eksekusi: tidak ada log run, tidak ada tabel dengan baris hasil sweep, tidak ada penanda rotasi pepper. Selama itu: reservasi kuota yang menggantung tidak dibersihkan, dan kontrak privasi analytics (token harian dihapus, pepper dirotasi 24 jam) **belum benar** — ia baru terjadwal. | `workers/api/wrangler.toml` `[triggers]`, `workers/api/index.js:214`, `workers/api/analytics/PRIVACY.md` | **R3** (klaim privasi) dan **R4** (ambang "≥ 5 reservasi menggantung > 10 menit" mengandaikan sweep hidup). |
| **P5** | **Analytics Engine belum tersedia untuk dibaca.** `ANALYTICS_ENABLED="on"` sekarang menyalakan pengumpulan event dan rollup berbasis D1, tetapi `workers/api` sengaja tidak memiliki binding Analytics Engine (binding mati `fiezel_events` sudah dihapus). Binding `fiezel_ops` di `workers/owner` hanya jejak audit akses owner yang opsional. Membaca AE tetap butuh SQL API + token akun (bukan binding), sehingga panel SYSTEM/AE **belum dibangun**. Konsekuensinya: `cache_hit/miss`, `quota_denied`, `circuit_open` — tepat metrik yang dipakai ambang R6 dan R7 — **belum bisa dibaca** dari mana pun. | `workers/api/wrangler.toml` `[vars]` + catatan penghapusan binding AE, `workers/owner/wrangler.toml` binding audit + `workers/owner/README.md` | **R3, R6, R7.** Tanpa pembacaan AE, ambangnya harus diukur manual lewat rollup D1, `wrangler tail`, dan dashboard Metrics, dan itu harus disepakati **sebelum** rilis, bukan saat insiden. |
| **P6** | **`workers/owner/wrangler.toml` masih memuat blok route `custom_domain`.** `[[routes]] pattern = "owner.fiezel.my.id"`, `custom_domain = true` mengandaikan zona `fiezel.my.id` ada di Cloudflare. Ia **tidak ada** — `api.fiezel.my.id` adalah proxy PHP di origin ArenHost, nameserver masih di reseller. `wrangler deploy` untuk Worker owner karena itu akan **GAGAL**, bukan jatuh ke workers.dev. | `workers/owner/wrangler.toml` vs `reports/work-e9-edge.md` §1 | **Deploy `fiezel-owner`** — dan karenanya seluruh pemantauan berbasis dashboard owner. Setiap ambang di Bagian 1 yang mengandalkan angka dari dashboard owner harus diukur dengan cara lain sampai P6 selesai. |
| **P7** | **Klien belum memuat modul telemetri bayangan.** `index.html` dan `sw.js` tidak memuat satu pun berkas telemetri shadow (`grep -n 'shadow' index.html sw.js` → 0 hasil). Yang ada hari ini hanya `console.debug('[cf-shadow]', …)` di `app.js`: **tidak teragregasi, tidak terhitung, tidak bisa dipanen**. Rasio `diff` ≤ 1%, ketidaksesuaian bentuk ≤ 0,5%, dan p95 di Bagian 2 karena itu **belum bisa dihitung** dari perangkat murid. | `grep -n 'shadow' index.html sw.js` → 0; `app.js` `cfShadowLog()` | **Seluruh Bagian 2**, dan karenanya gerak `shadow` → `on` pada **R1–R7**. |
| **P8** | **`FEATURE_AI` / `FEATURE_TTS` / `FEATURE_COACH` hanya bisa diubah dengan `wrangler deploy`** (nilainya di `[vars]`, bukan di KV). Artinya entitlement Worker **bukan** sakelar < 60 detik. Selama ini belum dipindah ke KV, pembatalan cepat harus bertumpu pada `enabled.{ai,tts,coach}` di `cfg:flags` — dan itu hanya menyembunyikan tombol di klien, bukan menutup rute di server. | `workers/api/wrangler.toml` `[vars]` | **R6, R7.** Rute server tetap bisa dipanggil pihak yang melewati klien; penutupan sungguhan butuh deploy. |
| **P9** | **`EDGE_SHARED_SECRET` masih boleh kosong** (`/health` melaporkan `edgeGuard:"off"`). Selama `off`, `*.workers.dev` terbuka dan siapa pun bisa `POST /api/auth/anon` melewati jembatan, menulis D1, dan membawa jatah gratisnya sendiri. | `workers/api/mw-edge.js`, `reports/work-e9-edge.md` §1 & "Mode `off`" | **R5, R6, R7.** Identitas dan biaya tidak boleh dinyalakan selama pintu belakang masih terbuka. |

---

## 4. Aturan yang mengikat (tidak bisa dinegosiasikan per rilis)

1. **Setiap penyalaan dan setiap pembatalan harus lewat perubahan flag yang bisa dibatalkan
   tanpa deploy ulang**, yaitu KV `cfg:flags` yang dibaca `GET /api/config`. Alasannya bukan
   selera: `main` **auto-deploy ke produksi tiap 5 menit**, jadi setiap perubahan berkas
   adalah rilis produksi dalam ≤ 5 menit — dan rilis bukan sakelar.
2. **DILARANG menyalakan atau mematikan dengan mengedit `core-config.js`.** Berkas itu ada di
   daftar precache `sw.js:35` (`ASSETS`) dan dilayani **cache-first**, jadi perubahannya
   **tidak menjangkau PWA yang sudah terpasang** sampai `SW_REV` naik dan generasi shell baru
   terpasang. Orang yang memakainya sebagai kill switch akan **mengira** sudah mematikan
   sesuatu yang masih hidup pada perangkat murid.
3. **`core-config.js` hanya menentukan jalur mana yang ADA**, dan nilainya wajib `off` saat
   di-push kecuali rilis itu sendiri adalah rilis penyalaan endpoint tersebut. Peningkatan
   `off` → `shadow` → `on` di berkas statis adalah **rilis klien** dengan bump invarian build
   yang menjadi wewenang MASTER — bukan gerakan operasional.
4. **Server hanya bisa MEMATIKAN, tidak bisa MENYALAKAN.** `flags.cf*Enabled=true` pada
   endpoint yang statisnya `off` tetap menghasilkan `off`. Konsekuensi praktis: KV bisa
   dipakai untuk panik, tidak untuk eksperimen.
5. **Satu rilis, satu endpoint.** Dua flag tidak boleh naik dalam satu jendela pengamatan;
   kalau naik bersamaan, gejala apa pun tidak bisa diatribusikan. `flag-plan-check.mjs`
   menolak `auth`/`tts`/`ai` yang bernilai `on` bersamaan dengan
   `DANGER BANYAK_RISIKO_SEKALIGUS`.
6. **Kegagalan membaca `/api/config` berarti `off`**, bukan "pakai nilai terakhir". Gagal ke
   arah aman, bukan ke arah mahal (`workers/api/route-config.js`).
7. **Sebelum dan sesudah setiap gerakan flag, jalankan
   `curl -s https://api.fiezel.my.id/api/config | node tools/flag-plan-check.mjs`** dan simpan
   keluarannya di catatan rilis. Exit 3 = ada `DANGER` = jangan lanjut.

---

## 5. Kriteria BERHENTI TOTAL (rollout dibatalkan, Puter dikembalikan penuh)

Kalau salah satu kondisi di bawah terjadi, **seluruh rollout dibatalkan** — bukan endpoint yang
bermasalah saja. Jalankan **B-2** (satu perintah, semua `false`), lalu hentikan rencana ini
sampai ada laporan penyebab tertulis. Jangan naikkan apa pun lagi pada hari yang sama.

**Kondisi yang menyangkut murid (nol toleransi — satu kejadian sudah cukup):**

1. **Progres tampak hilang.** ≥ 1 murid melihat riwayat/level/streak-nya kosong atau mundur.
   Progres tidak pernah ada di server, jadi ini selalu berarti **kunci identitas** yang patah;
   server tidak bisa memulihkannya, tapi `auth=off` memulihkan pembacaan kunci lama.
2. **Suara senyap total.** ≥ 1 sesi listening/speaking berjalan tanpa suara sama sekali,
   termasuk kasus paling jahat: audio 0 byte yang tetap dilaporkan "berhasil" sehingga UI
   tidak pernah menampilkan galat.
3. **Soal tidak bisa dijawab.** ≥ 1 murid tidak bisa mengirim jawaban, atau jawabannya diterima
   tetapi tidak tersimpan, atau tombol lanjut tidak pernah aktif — jalan buntu di dalam sesi.
4. **Blank screen / halaman galat Cloudflare (1027, 1102) terlihat murid** — bukan pesan
   FIEZEL. Ini melanggar aturan produk "jangan pernah blank screen ke murid".

**Kondisi teknis (dengan angka):**

5. **Kuota terlampaui walau sekali**: ada murid yang berhasil melewati **25 panggilan AI/hari**
   atau **12.000 karakter TTS/hari**. Ini kebocoran biaya, dan D1 tanpa Durable Object memang
   tidak serializable — jadi bukti pertamanya harus menghentikan rollout, bukan menaikkan
   ambang.
6. **Neuron akun > 9.500/hari** (95% dari plafon gratis 10.000). Di atas itu, satu penyalahguna
   sedang mengeringkan kolam untuk **semua** murid sekaligus.
7. **Permintaan Worker > 90.000/hari** (90% dari 100.000) — batas berikutnya adalah halaman
   1027 untuk semua orang.
8. **Tulis KV > 900/hari** (90% dari 1.000). Di atas itu kill switch sendiri bisa gagal ditulis,
   dan rollout tanpa kill switch harus berhenti.
9. **Kill switch tidak berefek dalam 120 detik** setelah B-1/B-2 diverifikasi terkirim (dua kali
   `cacheTtl`). Ini berarti P0/P1 belum benar-benar selesai; berhenti dan perbaiki dulu.
10. **`edgeGuard:"off"` ditemukan di `/health` produksi** saat ada endpoint berbiaya (`ai`/`tts`)
    hidup: pintu belakang `*.workers.dev` terbuka bersamaan dengan jalur yang menagih dompet.
11. **`protocol` ≠ `1.7`** dari jawaban CF mana pun. Klien mengunci `1.7` di tiga tempat; jalur
    CF akan ditolak sebagian-sebagian, dan gejalanya akan terlihat acak.
12. **Data murid ditulis ke server tanpa diminta**: ada baris progres per-orang di D1, atau ada
    join antara tabel kuota dan tabel analytics. Kontrak privasi lebih penting daripada rollout.

**Yang terjadi setelah BERHENTI TOTAL:** jalur Puter (`https://fiezel-core.puter.work`,
`FIEZEL_CORE_CONFIG.workerUrl`) **masih hidup penuh** dan melayani semuanya seperti sebelum
rollout dimulai — itu sebabnya pencabutan Worker Puter tidak boleh dilakukan sampai seluruh
R1–R7 stabil. Worker CF dibiarkan hidup dengan semua flag `false`; tidak perlu dihapus, dan
menghapusnya justru menghilangkan bukti untuk analisis.

---

## 6. Alat: `tools/flag-plan-check.mjs`

Node murni, **nol jaringan**, nol dependency, nol tulis berkas. Ia mengalikan flag statis
(tri-state, `core-config.js`) dengan jawaban server (boolean, `/api/config` dari **stdin**) dan
mencetak keadaan efektif tiap endpoint, lalu memperingatkan kombinasi berbahaya.

```bash
# keadaan produksi
curl -s https://api.fiezel.my.id/api/config | node tools/flag-plan-check.mjs

# menguji sebuah RENCANA sebelum dieksekusi (core-config.js kandidat + jawaban server hipotetis)
node tools/flag-plan-check.mjs --config /tmp/core-config-kandidat.js --json < /tmp/api-config.json
```

Aturan yang ditegakkan: `off` bila `enabled=false`, `base=''`, statis `off`, `/api/config` tidak
terbaca, flag server `false`, atau kill switch fitur `false`. `shadow` **tidak pernah** naik
menjadi `on` karena server bilang `true`.

Kombinasi yang dilaporkan `DANGER` (exit code 3): `AI_TANPA_AUTH`, `AI_TANPA_KUOTA`,
`TTS_TANPA_KUOTA`, `KILL_SWITCH_TAK_TERBACA`, `BANYAK_RISIKO_SEKALIGUS`,
`PROTOKOL_TIDAK_COCOK`. Kelas `WARN`: `SHADOW_BERBAYAR`, `RENCANA_MANDUL`,
`SERVER_TIDAK_BISA_MENYALAKAN`, `ANALYTICS_BISA_SENYAP`.

---

## 7. Sumber angka batas plan gratis

Angka plafon yang dipakai sebagai ambang di Bagian 1 dan Bagian 5 berasal dari dokumentasi
Cloudflare, dikutip lewat `docs/CF-MIGRATION-RUNBOOK.md` Bagian 5:

- CPU 10 ms/permintaan, 100.000 permintaan/hari, 50 subrequest/invocation —
  [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- KV 1.000 tulis/hari — [KV limits](https://developers.cloudflare.com/kv/platform/limits/)
- Workers AI 10.000 neuron/hari (kolam **seluruh akun**, bukan per murid) —
  [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

Angka internal (`FREE_AI_DAILY_LIMIT=25`, `FREE_TTS_DAILY_CHARS=12000`,
`GLOBAL_NEURON_CAP=8000`, `RESERVATION_TTL_MS=30000`, `AI_TIMEOUT_MS=20000`) berasal dari
`workers/api/quota/quota-config.js` dan `workers/api/wrangler.toml`, dan dicatat di
`reports/exec-e3-quota.md` §2.
