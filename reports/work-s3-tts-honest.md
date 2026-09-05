# S3 — Flag TTS ditegakkan, dan amplop TTS berhenti bohong soal jatah

Branch `work/s3tts`. Tidak dipush. Versi build tidak dibump. `app.js`, `style.css`,
`index.html`, `features/`, `coordination/`, `workers/owner/`, `workers/api/rate-anon.js`
tidak disentuh.

Bacaan awal: `reports/work-s2-account-cap.md` (plafon neuron akun jadi wajib) dan
`reports/work-p3-ai-enforced.md` (pagar flag di jalur AI). Angka produksi di brief tidak
diukur ulang dari nol; paket ini memakainya sebagai spesifikasi cacat.

Commit HEAD sebelum paket ini: `9523ace`.

---

## 1. Kedua cacat, dan mengapa keduanya satu kelas

**CACAT 1 — pagar flag dipasang di jalur AI, tidak di jalur TTS.** Dengan
`cfTtsEnabled:false` DAN `enabled.tts:false` di KV `cfg:flags`,
`POST https://api.fiezel.my.id/api/tts/render` tetap dijawab 200 dan tetap MENJALANKAN
jalur render — amplopnya memuat `accountNeuronsReleased`, jadi ia benar-benar memesan lalu
melepas neuron akun. Pembandingnya `POST /api/ai/task`: 403 `ai_disabled` dalam 141 ms,
nol token model.

**CACAT 2 — amplop mengaku menagih padahal buku jatah tidak bergerak.**
`source:"unavailable"`, `bytes:0`, `quotaCharged:true`, sementara `GET /api/quota` sebelum
dan sesudah identik (`ttsChars.used = 0`, `remaining = 12000`).

Satu kelas: **jalur TTS diperlakukan sebagai jalur kelas dua.** Setiap paket yang
memperkuat jalur AI (P3 pagar flag, A12 kejujuran `quotaCharged`, S2 plafon akun) berhenti
di batas AI. TTS memanggil binding `env.AI` yang SAMA dan menghabiskan neuron yang SAMA.

---

## 2. Peta jalur × (menagih? menghasilkan audio?) — SEBELUM dan SESUDAH

Kolom "buku jatah bergerak" = kolom `quota_daily.tts_chars_used` di D1, dibaca SEBELUM dan
SESUDAH tiap permintaan. Kolom "amplop mengaku" = field `quotaCharged`. Baris SESUDAH
diambil dari `quotaLedgerMatrix` di `TTS-PROVIDER-CONTRACT-REPORT.json`, bukan dari ingatan.

### SEBELUM

| Jalur | Audio? | Buku jatah bergerak? | Amplop mengaku menagih? | Jujur? |
|---|---|---|---|---|
| sukses, tersimpan | ya | ya | `true` | ya |
| cache hit R2 | ya | tidak | `false` | ya |
| permintaan digabungkan (single-flight) | ya (aset pemimpin) | **ya** | mewarisi pemimpin | **TIDAK** |
| provider melempar 5xx | tidak | tidak (di-rollback `settleQuota`) | **`true`** | **TIDAK** |
| provider mengembalikan nol byte | tidak | tidak | **`true`** | **TIDAK** |
| timeout provider | tidak | tidak | **`true`** | **TIDAK** |
| R2 gagal menulis (`stored:false`) | ya | tidak | **`true`** | **TIDAK** |
| breaker terbuka | tidak | tidak | `false` | ya |
| jatah murid habis (429) | tidak | tidak | `false` | ya |
| plafon neuron akun habis (503) | tidak | tidak | `false` | ya |
| **flag TTS mati** | **ya (render jalan!)** | **ya** | `true` | **TIDAK — dan seharusnya tidak jalan** |

### SESUDAH

| Jalur | Status | `source` | `bytes` | Buku jatah bergerak | `quotaCharged` | Jujur? |
|---|---|---|---|---|---|---|
| sukses, tersimpan | 200 | `provider` | 4096 | +42 | `true` | ya |
| cache hit R2 | 200 | `cache` | 4096 | 0 | `false` | ya |
| permintaan digabungkan | 200 | `cache` | = pemimpin | 0 | `false` | ya |
| provider melempar 5xx | 200 | `unavailable` | 0 | 0 | `false` | ya |
| provider nol byte | 200 | `unavailable` | 0 | 0 | `false` | ya |
| timeout provider | 200 | `unavailable` | 0 | 0 | `false` | ya |
| R2 gagal menulis | 200 | `provider` | 4096 | 0 | `false` | ya |
| breaker terbuka | 200 | `unavailable` | 0 | 0 | `false` | ya |
| jatah murid habis | 429 | `unavailable` | 0 | 0 | `false` | ya |
| plafon neuron habis | 503 | `unavailable` | 0 | 0 | `false` | ya |
| flag TTS mati | **403** | `unavailable` | 0 | 0 | `false` | ya |

Arah perbaikannya SATU: tidak ada jalur baru yang menagih. Jalur `stored:false` menghasilkan
audio yang benar-benar dipakai murid tetapi tidak menagih — itu memang salah ke arah murid,
sesuai mandat, karena aset itu tidak tercatat ready dan render berikutnya harus mengulang.

---

## 3. Apa yang diubah

### 3.1 `workers/api/feature-gate.js` — satu mesin keputusan, dua fitur

Pola AI tidak digandakan. Tabel `PAID_FEATURES` menyimpan per fitur: nama var wrangler,
kunci kill-switch, kunci flag, dan set alasan. `featureAllowedFrom(env, snapshot, spec)`
adalah satu-satunya tempat keputusan lahir; `aiAllowedFrom` dan `ttsAllowedFrom`
mendelegasikan ke sana, begitu pula `checkAiEnabled` / `checkTtsEnabled` lewat
`checkFeatureEnabled`. Alasannya lugas: dua mekanisme untuk satu maksud adalah cara celah
berikutnya lahir — cacat 1 sendiri lahir begitu.

Urutan penolakan (sama untuk AI dan TTS): var wrangler ≠ `on` → `*_feature_var_off`;
snapshot flag tidak terbaca → `*_flags_unreadable` (**fail-CLOSED**); `enabled.<fitur>` ≠
true → `*_kill_switch`; `flags.cf<Fitur>Enabled` ≠ true → `*_flag_off`.

### 3.2 `workers/api/route-wiring.js` — penolakan terjadi SEBELUM handler dipanggil

Pagar dipasang di `wrapMetered`, di dalam sink TTS, hanya untuk rute berbiaya
(`metered === true`, yaitu `POST /api/tts/render`):

```js
async (request, env, executionCtx) => {
  if (metered) {
    const gate = await checkTtsEnabled(env);
    if (!gate.allowed) { ... return RouteTts.ttsDisabledResponse({ reason: gate.reason, ... }); }
  }
  return handler(request, env, executionCtx);
}
```

Bukti bahwa penolakan mendahului biaya, dan bukan sekadar klaim: `handler` tidak pernah
dipanggil, dan `handleRender` adalah SATU-SATUNYA tempat `env.AI.run` dan
`deps.accountBudget` disentuh di jalur ini. Gerbang mengukurnya sebagai angka, bukan sebagai
harapan: penghitung `env.AI.run` palsu = 0 dan tabel `ai_account_day` kosong (S3-a2).

`GET /api/tts/manifest` SENGAJA tidak digerbangi: nol panggilan model, nol kuota, nol
neuron. Menutupnya hanya membuat klien tidak tahu suara apa yang ada saat flag mati, tanpa
menghemat sepeser pun (di-assert di S3-a8 supaya keputusan ini tidak berubah diam-diam).

### 3.3 `workers/api/tts/route-tts.js`

- `ttsDisabledResponse()` — 403, `error:'tts_disabled'`, `copyKey:'tts.disabled'`, `reason`,
  `source:'unavailable'`, `degraded:true`, `bytes:0`, `chars:0`, `quotaChecked:false`,
  `quotaCharged:false`, dan **tanpa `retryAfter`**. Menunggu tidak mengubah flag; hanya
  pemilik aplikasi yang mengubahnya, jadi `retryAfter` apa pun adalah janji yang tidak bisa
  ditepati. Naskahnya menyebut penyebabnya (dimatikan di server), menegaskan jatah utuh, dan
  menunjuk suara perangkat sebagai jalan keluar.
- **Satu sumber `quotaCharged`.** `newQuotaLedger()` mencatat `checked` dan
  `rollbackRequested`; `chargedFor(ledger)` adalah satu-satunya produsen nilai
  `quotaCharged` di berkas ini; `requestQuotaRollback()` menyetel `rollbackRequested`
  **walau jembatan pembatal tidak ada** — kalau kami tidak yakin reservasinya bertahan,
  satu-satunya laporan yang aman bagi murid adalah "tidak ditagih".
- **`bytes` = byte sungguhan.** `decodeBase64()` ditambahkan; `toBytes` membongkar audio
  base64 menjadi `Uint8Array`; `byteSize(string)` mengembalikan 0. Sebelumnya string base64
  ditulis ke R2 sebagai TEKS dengan `content-type: audio/mpeg`, dan dilaporkan sebagai
  `length * 0.75` — jadi render dan cache hit atas aset yang SAMA melaporkan dua angka
  berbeda (`existing.size` vs taksiran).
- **`accountNeuronsReleased`** kini `!!released`, hasil pemanggilan
  `ModelCallGate.releaseReservation` yang sesungguhnya. Jalur timeout melaporkan `false` dan
  memang tidak melepas — mesin sudah bekerja, jadi neuronnya memang terpakai.
- `baseResponse` memberi nilai bawaan eksplisit `quotaChecked:false`,
  `quotaCharged:false`, `accountNeuronsReserved:false`, `accountNeuronsReleased:false`,
  supaya jalur yang lupa mengeja tidak diam-diam mengaku menagih.

---

## 4. CACAT KETIGA, ditemukan paket ini: penggabungan permintaan menagih murid

`joinInFlight` dulu dijalankan **SESUDAH** gerbang kuota (LANGKAH 5) dan pagar neuron.
Akibatnya tiga hal sekaligus:

1. Permintaan kedua atas kunci yang sama MEMESAN dan MENAGIH jatah murid untuk audio yang
   tidak pernah ia minta dibuat.
2. Amplopnya menyalin field akuntansi pemimpin, jadi `quotaCharged` permintaan kedua
   melaporkan penagihan pemimpin — bukan penagihannya sendiri.
3. Kegagalan pemimpin ditutupi sebagai `source:'cache'`, sehingga `providerFailed()` di
   `route-wiring.js` menjawab `false` dan `settleQuota()` **meng-COMMIT** jatah untuk nol
   byte audio.

Perbaikannya struktural, bukan tambalan: penggabungan dipindahkan ke SEBELUM gerbang kuota
dan sebelum pagar neuron (urutan sekarang: cache HEAD → single-flight → breaker → kuota →
neuron akun). Permintaan yang digabungkan tidak pernah menyentuh gerbang kuota, jadi tidak
ada yang bisa ditagih dan `ledger.checked` tetap `false` tanpa perlu dieja. Hasil pemimpin
dilaporkan apa adanya soal berhasil/gagal; yang tidak diwarisi adalah seluruh field
akuntansi.

Cacat ini di luar dua yang diklaim brief, tetapi berada di dalam berkas dan mekanisme yang
sama (`quotaCharged` di jalur TTS), jadi ditambal di sini, bukan di luar wilayah klaim.

**Cacat keempat, dilaporkan TANPA ditambal di luar wilayah:** `tools/a12-red-proof.mjs`
kasus `D3b` sekarang `PATCH_TIDAK_COCOK` karena paket S2 mengubah
`releaseQuota` di `workers/api/ai/route-ai.js` menjadi `await releaseQuota` tanpa
memutakhirkan jangkar patch-nya. Berkas `route-ai.js` tidak disentuh paket ini; alat
buktinya yang usang, bukan produksinya. `tools/account-cap-red-matrix.mjs` exit 0.

---

## 5. Gerbang

Diperluas, bukan diduplikasi: `tests/tts-provider-contract-test.js` (sudah terdaftar di
`.github/workflows/quality.yml`). Dari 21 assert menjadi **54 assert, semuanya PASS**.

Tambahan infrastruktur: `tools/cf-worker-boot.js` — mem-boot Worker API PENUH di dalam
gerbang (D1 palsu bermigrasi, KV, R2, penghitung `env.AI`), karena pagar flag hidup di
`route-wiring.js` dan **tidak bisa dilihat dari `handleRender`**. Menguji pagar di tingkat
handler akan menghasilkan gerbang yang hijau sementara produksi tetap bocor — persis
kegagalan yang melahirkan cacat 1.

| Tuntutan brief | Assert | Cara membuktikan |
|---|---|---|
| (a) flag mati ⇒ penolakan, nol neuron, nol model | S3-a1…a8 | Worker penuh; penghitung `env.AI.run` = 0; tabel `ai_account_day` = 0; fail-closed saat KV tak terbaca |
| (b) `quotaCharged` cocok buku jatah tiap jalur | S3-b1…b7 | 10 jalur × baca `quota_daily.tts_chars_used` sebelum/sesudah — bukan angka yang diketik dua kali |
| (c) render nol byte tidak pernah menagih | S3-c1, b4 | filter atas matriks: `quotaCharged && bytes === 0` harus kosong |
| (d) cache hit dan penggabungan = nol jatah | S3-d1…d5 | penghitung panggilan gerbang kuota = 1 untuk dua permintaan |
| (e) bentuk amplop TTS = bentuk amplop AI | S3-e1…e4 | perbandingan set field terhadap penolakan `/api/ai/task` yang nyata + satu tabel `PAID_FEATURES` |
| (3) `accountNeuronsReleased` dan `bytes` | S3-f1…f4, g1…g3 | penghitung release palsu; ukuran objek R2 lawan `bytes` di amplop |

Buku jatah palsu di tingkat handler tidak "diketik dua kali": keputusan COMMIT/ROLLBACK
diambil oleh `quotaSettlementFailed()` yang **diimpor dari `workers/api/route-wiring.js`** —
aturan yang sama yang dipakai produksi (di-assert di S3-0). Fungsi itu diekspor dari
`route-wiring.js` khusus untuk ini.

### 5.1 Bukti setiap assert bisa MERAH

`tools/tts-honest-red-matrix.mjs` (alat sekali jalan, tidak dipanggil `quality.yml`)
mengembalikan 17 cacat satu per satu ke berkas sumber produksi, menjalankan gerbang, lalu
memulihkan berkasnya.

Hasil (`reports/S3-TTS-HONEST-RED-MATRIX.json`): **17/17 merah, 17/17 assert sasaran benar-benar
ikut merah (bukan cuma "ada yang merah"), dan gerbang hijau kembali sesudah pemulihan.**
Mutasinya mencakup: pagar flag dicabut; fail-open saat flag tak terbaca; var wrangler
diabaikan; `retryAfter` dijanjikan; naskah memakai bahasa jatah; `copyKey` menyimpang; 403
jadi 503; jalur nol byte mengaku menagih; pembatalan tidak dicatat; jalur sukses mengaku
tidak menagih; cache hit menagih; penggabungan dikembalikan ke sesudah kuota; pewarisan
klaim pemimpin; `accountNeuronsReleased` dipatok true; `bytes` ditaksir 0,75x; base64
ditulis sebagai teks; dan R2 palsu kembali salah mengukur.

**Lubang yang ditemukan lewat matriks ini, dan diperbaiki:**

1. **R2 palsu berbohong tentang ukuran.** `tools/cf-test-harness.js` menghitung `size`
   dengan `Buffer.byteLength(String(body))`. Untuk `Uint8Array`, `String(body)` menghasilkan
   `"97,117,100,..."` — objek 4.096 byte dilaporkan ~15.080 byte. Bucket palsu yang
   berbohong tentang ukuran membuat gerbang tidak bisa membedakan byte audio dari teks
   base64, yaitu tepat cacat yang sedang ditutup. Diganti `r2BodySize()` yang sadar byte;
   self-test harness tetap PASS (45 assert). Mutasi S6 mengembalikan kebohongan itu dan
   gerbang MERAH, jadi harness-nya sendiri sekarang ikut dijaga.
2. **Mutasi pertama untuk `bytes` ternyata INERT, bukan gerbangnya yang bolong.** Mutasi
   awal hanya mengubah cabang `byteSize(string)`, yang tidak pernah tercapai karena
   `toBytes` sudah membongkar base64 lebih dulu. Mutasi diarahkan ulang ke cacat aslinya
   (`toBytes` mengembalikan string base64) dan gerbang langsung MERAH di S3-g1…g3. Dicatat
   di sini karena "mutasi hijau" bisa berarti dua hal — gerbang bolong ATAU mutasi tidak
   mengubah perilaku — dan yang kedua tidak boleh diklaim sebagai bukti.
3. Tiga mutasi awal lain gagal sebagai `PATCH_TIDAK_COCOK` (jangkar diketik dari ingatan,
   bukan dari berkas). Diperbaiki dengan mengambil jangkar dari sumber. Ini alasan skrip
   memisahkan `PATCH_TIDAK_COCOK` dari `merah:false` — patch yang tidak terpasang bukan
   bukti apa pun.

### 5.2 Fixture yang gagal, dan apa yang diajarkannya

`TTS_CHARS_PER_DAY: '10'` **tidak** membuat jatah habis: plafon TTS datang dari
`quota-config.js`, bukan dari env var itu. Fixture diganti menjadi mendorong baris
`quota_daily` murid ke plafon lewat satu render sungguhan lalu `UPDATE`. Dicatat karena env
var yang tidak mengikat apa pun adalah jenis kebohongan konfigurasi yang sama dengan cacat 2.

### 5.3 Verifikasi (semua exit 0)

`tests/tts-provider-contract-test.js`, `tests/tts-transport-switch-test.js`, `tests/tts-key-test.js`,
`tests/ai-account-cap-gate-test.js`, `tests/ai-task-contract-test.js`, `tests/ai-response-shape-test.js`,
`tests/cf-wiring-test.js`, `tests/quota-core-test.js`, `tests/rate-anon-test.js`, `tests/no-network-test.js`,
`tests/secret-scan-test.js`, `tests/gate-registry-test.js`, `tests/coordination-guard-test.js`,
`tests/regression-test.js`, `tests/install-health-test.js`. Ditambah `tools/cf-test-harness.js`
self-test (PASS) karena harness-nya diubah.

Catatan temuan sampingan: gerbang `tests/tts-provider-contract-test.js` sudah **MERAH sejak paket
S2** (`tts_key_missing_voice`), karena S2 membuat `deps.accountBudget` wajib sementara
gerbang ini menyuntikkan `enforceQuota` saja — setiap render dijawab 503 dan seluruh assert
A12 di atasnya menguji jalur yang salah. S2 tidak pernah menjalankan gerbang ini. Sudah
dibetulkan di `render()`.

---

## 6. Yang BELUM bisa dibuktikan sampai flag TTS dinyalakan

Jujur, dan ini bukan formalitas:

1. **Semua bukti di atas adalah bukti in-process.** Yang dijalankan adalah kode Worker yang
   sama, tetapi dengan D1, KV, R2, dan binding `env.AI` palsu. Ia tidak membuktikan bahwa
   Cloudflare benar-benar menolak sebelum menagih neuron di akun; ia membuktikan bahwa
   kode kita tidak sampai ke titik itu.
2. **Jalur SUKSES sungguhan belum pernah dijalankan sesudah paket ini.** `FEATURE_TTS="off"`
   di `wrangler.toml` dan flag KV mati. Jadi klaim "`bytes` = byte audio sungguhan" diuji
   terhadap audio palsu 4.096 byte, bukan terhadap keluaran `@cf/deepgram/aura-1`. Kalau
   provider sungguhan mengembalikan bentuk yang belum ditangani `toBytes` (misalnya
   `ReadableStream`), `bytes` akan 0 dan rendernya dilaporkan gagal — salah ke arah murid,
   tapi tetap salah.
3. **Commit jatah sungguhan belum diamati.** `quotaCharged:true` pada jalur sukses
   dibuktikan lewat kolom D1 palsu yang bergerak +42 dan lewat `quotaSettlementFailed()`
   yang diimpor dari produksi. Yang belum diamati: `GET /api/quota` produksi bergerak
   sebesar `chars` yang sama sesudah satu render sukses. Itu butuh flag dinyalakan.
4. **Perilaku breaker di produksi belum diuji.** Jalur breaker terbuka dipaksa dengan
   penyimpan palsu yang selalu `OPEN`, bukan dengan kegagalan provider berturut-turut.
5. **`tools/cf-worker-boot.js` menduplikasi sebagian `tools/cf-test-harness.js`** (boot
   Worker, migrasi D1). Itu utang, bukan desain: seharusnya harness yang tumbuh. Dibiarkan
   terpisah supaya paket ini tidak mengubah perilaku harness yang dipakai belasan gerbang
   lain, di luar satu perbaikan ukuran R2 yang memang wajib.

Langkah verifikasi produksi yang harus dijalankan begitu flag dinyalakan, berurutan:
`GET /api/quota` → satu render sukses → `GET /api/quota` (harus naik sebesar `chars`) →
render kedua atas teks yang sama (harus `source:'cache'`, `quotaCharged:false`, kuota tidak
bergerak) → matikan `cfTtsEnabled` → render (harus 403 `tts_disabled`, tanpa `retryAfter`,
kuota tidak bergerak).

---

## 7. Berkas

| Berkas | Perubahan |
|---|---|
| `workers/api/feature-gate.js` | `PAID_FEATURES`, `featureAllowedFrom`, `ttsAllowedFrom`, `checkTtsEnabled`, `TTS_GATE_REASONS` |
| `workers/api/route-wiring.js` | pagar `checkTtsEnabled` di `wrapMetered` sink TTS; ekspor `providerFailed` dan `quotaSettlementFailed` |
| `workers/api/tts/route-tts.js` | `ttsDisabledResponse`, buku jatah + `chargedFor`, `decodeBase64`/`byteSize` jujur, single-flight dipindah sebelum kuota |
| `tests/tts-provider-contract-test.js` | +33 assert S3 (total 54) |
| `tools/cf-test-harness.js` | `r2BodySize()` — ukuran objek per byte, termasuk body biner |
| `tools/cf-worker-boot.js` | BARU — boot Worker API penuh untuk gerbang |
| `tools/tts-honest-red-matrix.mjs` | BARU — 17 mutasi terarah, bukti merah |
