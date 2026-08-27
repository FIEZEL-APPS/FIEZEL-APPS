# A12 — Tiga cacat produksi CF: render TTS senyap, amplop kuota AI, tagihan untuk jawaban kosong

Branch: `add/a12tts`. Tidak ada bump versi build (`VERSION.json`, `FIEZEL_PAGE_BUILD`, `SW_REV` tidak
disentuh). Tidak di-push.

Ketiga cacat datang dari uji staging, bukan dari review, dan ketiganya **hijau di seluruh gerbang yang
ada sebelum paket kerja ini**. Itu fakta yang paling penting di laporan ini: gerbang lama menguji
bentuk kunci cache, bentuk permintaan, dan bentuk jawaban, tapi tidak satu pun menguji **apa yang
benar-benar dikirim ke provider** atau **apakah jatah murid benar-benar berkurang**.

---

## Cacat 1 — `voiceId` tidak pernah sampai ke provider

**Bukti masalah.** `workers/api/tts/route-tts.js` memanggil `env.AI.run(engineId, { text: text }, options)`
— hanya `text`. `tools/prerender-tts.mjs:596` memanggil model yang sama dengan
`{ text, speaker: env.speaker || model.voiceId }`. `voiceId` masuk kunci cache (`tts-key.js`
mem-hash-nya), tapi tidak pernah berangkat. Uji staging: 100% `POST /api/tts/render` menjawab
`source:"unavailable"`, `bytes:0`, kuota tidak bergerak.

**Nama parameter tidak ditebak.** Yang dipakai adalah `speaker`, dan dasarnya bukan dokumentasi luar:
`tools/prerender-tts.mjs` adalah jalur yang **memproduksi aset R2 yang ada hari ini** dengan
`{text, speaker}`, jadi bukti kebenarannya berupa byte audio, bukan bacaan. Karena nama parameter
berbeda per keluarga model, pemetaannya sekarang hidup di satu berkas:

`workers/api/tts/tts-provider-params.js` (UMD, sama seperti `tts-key.js`):

| engineId | textParam | voiceParam | localeParam | voice didukung | defaultVoiceId | dasar |
|---|---|---|---|---|---|---|
| `@cf/deepgram/aura-1` | `text` | `speaker` | — | ya | `aura-asteria-en` | jalur pra-render yang menghasilkan aset R2 sekarang |
| `@cf/deepgram/aura-2-en` | `text` | `speaker` | — | ya | `aura-2-thalia-en` | keluarga API yang sama, dipakai terarah untuk RISKY_PHRASES |
| `@cf/myshell-ai/melotts` | `prompt` | — | `lang` | **tidak** | `aura-asteria-en` (tidak pernah dikirim) | model DITOLAK di `REJECTED_MODELS`; nol aset R2 ⇒ nol bukti byte di repo |

Alasan `melotts` ditandai `voiceSupported:false` alih-alih dikarang nama parameternya: model itu
tercatat DITOLAK di `tools/prerender-tts.mjs` (500 pada 3 dari 4 kalimat, keluaran WAV-base64) dan
tidak menghasilkan satu pun aset, jadi tidak ada bukti byte di repositori tentang nama parameter
suaranya. Mengarang nama untuk model itu berarti mengulangi cacat yang sedang diperbaiki, hanya
dengan lebih percaya diri. Yang dikirim ke `melotts` sekarang `{prompt, lang}`, tanpa parameter suara.

**Perubahan kode.**
- `workers/api/tts/route-tts.js`: `callEngine(env, engineId, text, voiceId, locale, timeoutMs)`
  membangun badan permintaan lewat `ProviderParams.buildProviderInput(...)`, dan voice bawaan di
  `TtsKey.build` diambil dari registry (`defaultVoiceIdFor(engine.id)`), bukan dari string lokal.
- `tools/prerender-tts.mjs`: `workersAiTts` membangun badan permintaannya lewat **fungsi yang sama**.
  Jadi "kedua jalur cocok" bukan konvensi yang dijaga manusia, melainkan satu pemanggilan fungsi.
- `workers/api/route-wiring.js`: registry di-import sebelum `route-tts.js` (kedua berkas UMD dan
  saling menemukan lewat `globalThis` di bawah ESM; urutan impor di berkas itu memang bermakna).

**Kompatibilitas korpus.** `defaultVoiceId` untuk `aura-1` = `aura-asteria-en`, sama dengan
`ENGINE.voiceId` pra-render dan `DEFAULT_VOICE_ID` klien di
`features/neural-voice/fiezel-cf-tts-transport.js`. Gerbang membuktikannya bukan dengan membandingkan
tiga konstanta saja, tapi dengan mengirim permintaan runtime tanpa `voiceId` dan memastikan
`audioKey`-nya **identik** dengan kunci aset pra-render (`ff5f2e83c699…`). Kalau bawaan bergeser,
604.962 karakter yang sudah dibayar dianggap belum ada dan biayanya keluar dua kali.

---

## Cacat 2 — amplop `route-ai.js` tanpa `quotaCharged`

`route-tts.js` menyertakan `quotaCharged` di lima tempat; `route-ai.js` tidak menyertakannya sama
sekali. Klien tidak bisa membedakan penolakan yang menagih dari yang tidak, dan itu satu-satunya cara
jujur menampilkan sisa jatah tanpa polling `/api/quota` tiap kali.

Sekarang `quotaCharged` ada di **bawaan amplop** (`baseResponse`, nilai `false`) sehingga jalur baru
yang lupa mengejanya tetap jujur alih-alih menghilangkan field dari kontrak, lalu dieja eksplisit di
setiap jalur: `bad_request` 400, `body_too_big` 413, `bad_json` 400, validasi 400, breaker OPEN 200,
kuota habis 429, penolakan mutu 200, kegagalan provider 200, dan sukses.

Nilainya bukan hiasan: `true` hanya pada jalur sukses. Predikatnya sengaja dieja mengikuti
`workers/api/route-wiring.js:settleQuota()`, yang menyelesaikan reservasi dengan melihat amplop
(`providerFailed(body)` ⇒ `rollback`, selain itu `commit`). Kalau salah satu berubah tanpa yang lain,
gerbang merah.

---

## Cacat 3 — `writing_feedback` menagih untuk keluaran kosong

Uji staging: 22 dari 25 tagihan mengembalikan `text:"{}"` dengan `outputTokens:1` dan dinyatakan
SUKSES. Sebabnya `writing_feedback` memakai `jsonMode:true`, jadi bentuk kosong dari model bukan `""`
melainkan `"{}"` — dan pemeriksaan gaya `!text.trim()` melewatkannya seluruhnya.

`workers/api/ai/ai-tasks.js` sekarang punya `isEmptyOutput(text)` yang dipakai bersama oleh
`classifyModelFailure` dan `checkOutputContract`. Yang dihitung kosong: string kosong, whitespace
(termasuk NBSP/ZWSP), `null`/`undefined`, `{}`, `{ }`, `[]`, `null` literal, JSON berpagar
```` ```json {}``` ````, dan objek yang **semua** nilainya kosong. Yang **tidak** dihitung kosong:
`"0"`, `"false"`, JSON rusak (`{rusak`), dan objek bersarang yang berisi — pemeriksa yang menolak
segalanya sama merusaknya dengan yang meloloskan segalanya.

Kuotanya **di-rollback, bukan di-commit**: `releaseQuota(deps, info)` di `route-ai.js` dipanggil di
cabang penolakan mutu dan cabang kegagalan model, memakai `deps.rollbackQuota` atau
`globalThis.FIEZEL_ROLLBACK_QUOTA`, dan amplopnya membawa `quotaRolledBack`. Ini mengikuti doktrin
`workers/api/quota/quota-core.js`: commit hanya untuk barang yang terkirim; kegagalan provider =
`rollback()`, bukan 429. Aturan owner "kalau harus salah, salah ke arah murid" berarti kalau status
rollback tidak bisa dipastikan, amplop tetap melaporkan `quotaCharged:false`.

---

## Gerbang

**Baru: `tts-provider-contract-test.js`** — node murni, nol jaringan, memakai
`tools/cf-test-harness.js`. 21 assert, semua PASS. Yang dijaga:
- `voiceId` benar-benar ada di badan permintaan `env.AI.run`, dan **kunci cache dihitung ulang dari
  voice yang benar-benar dikirim** lalu dibandingkan dengan `audioKey` di amplop. Kalau berbeda,
  kunci berbohong tentang bunyi yang tersimpan.
- Perbandingan route-tts vs pra-render dilakukan **programatik**: `tools/prerender-tts.mjs`
  mengekspor `workersAiTts` dan gerbang menjalankannya dengan `fetch` global distub, lalu
  membandingkan badan permintaan objek-ke-objek (nama parameter dan nilainya). Daftar parameter
  tidak diketik ulang di gerbang — mengetiknya dua kali adalah cacat yang sama, hanya berpindah
  berkas. Hasil tertangkap: `{"text":"…","speaker":"aura-asteria-en"}` di **kedua** jalur.
- Identitas objek registry: kedua modul menunjuk `PROVIDER_PARAMS` yang sama, bukan dua salinan.
- Voice bawaan sama di registry, `MODELS` pra-render, `ENGINE` pra-render, dan klien; ditambah uji
  kunci-aset di atas.
- Mesin tak terdaftar **melempar**, tidak ditebak menjadi `{text}`.
- Substitusi tier murah mengirim `{prompt, lang}` (parameter milik melotts), bukan `{text, speaker}`.
- Cache hit: `source:"cache"`, `quotaCharged:false`, nol panggilan kuota, nol panggilan provider, nol
  tulis R2 — sementara render pertama (miss) memang memanggil gerbang kuota, supaya "nol lawan nol"
  tidak bisa lolos sebagai hijau.

**Diperluas: `ai-response-shape-test.js`** — 69 assert, semua PASS (sebelumnya 40-an). Tambahannya:
- Sepuluh jalur `route-ai.js` dipanggil sungguhan dan **semuanya** wajib membawa `quotaCharged`
  bertipe boolean; `true` hanya di jalur sukses; tidak ada penolakan yang menagih; 429 tetap 429.
- Keadaan breaker OPEN dibangun lewat modul breaker sungguhan, plus assert bahwa jalur itu benar-benar
  tereksekusi (`breaker:"OPEN"`) — fixture karangan sendiri ditolak `clone()` dan diam-diam jadi
  CLOSED, artinya gerbang hijau tanpa menguji apa pun. Itu sempat terjadi saat menulis gerbang ini.
- Sembilan bentuk keluaran kosong: tidak satu pun boleh `source:"provider"`, semuanya `degraded:true`,
  `quotaCharged:false`, dan `rollbackQuota` dipanggil **tepat sekali** dengan `quotaRolledBack:true`.
- Sisi sebaliknya: enam bentuk keluaran yang sah tidak boleh dianggap kosong, dan satu jawaban
  `writing_feedback` yang berisi tetap sukses **dan menagih**.

Terdaftar di `.github/workflows/quality.yml`: `tts-provider-contract-test.js` tepat sesudah
`tts-key-test.js` (dua sisi dari satu invarian biaya), dan komentar `ai-response-shape-test.js`
diperbarui.

### Matriks bukti merah

`node tools/a12-red-proof.mjs` (alat sekali jalan, bukan bagian CI) mengembalikan setiap cacat satu
per satu, menjalankan gerbangnya, lalu memulihkan berkasnya. Hasil di `A12-RED-PROOF.json`:

| Cacat yang dikembalikan | Gerbang | Exit | Merah? |
|---|---|---|---|
| D1 `voiceId` tidak diteruskan ke provider (cacat staging asli) | tts-provider-contract-test.js | 1 | ya |
| D1b voice bawaan runtime beda dari korpus | tts-provider-contract-test.js | 1 | ya |
| D1c nama parameter route-tts menyimpang dari pra-render | tts-provider-contract-test.js | 1 | ya |
| D1d mesin tak dikenal ditebak `{text}` alih-alih melempar | tts-provider-contract-test.js | 1 | ya |
| D1e cache hit mengaku menagih kuota | tts-provider-contract-test.js | 1 | ya |
| D2 `quotaCharged` hilang dari penolakan kuota 429 | ai-response-shape-test.js | 1 | ya |
| D2b jalur sukses mengaku tidak menagih (field jadi konstanta) | ai-response-shape-test.js | 1 | ya |
| D3 keluaran kosong dideteksi `.trim()` saja (lolos `"{}"`) | ai-response-shape-test.js | 1 | ya |
| D3b keluaran kosong ditolak tapi kuota tidak dikembalikan | ai-response-shape-test.js | 1 | ya |

9 dari 9 merah; sesudah pemulihan kedua gerbang exit 0. Dua catatan jujur dari proses ini: percobaan
pertama D3b **hijau** karena patch-nya salah sasaran — keluaran kosong diklasifikasikan sebagai
kegagalan model, jadi ia keluar lewat cabang `failureKind`, bukan `qualityRejected`; matriks sekarang
mem-patch kedua cabang. Dan D1d pertama kali gagal karena jangkar patch-nya tidak cocok, bukan karena
gerbangnya lemah.

### Verifikasi

Semua exit 0: `tts-provider-contract-test.js`, `tts-key-test.js`, `ai-task-contract-test.js`,
`ai-response-shape-test.js`, `cf-wiring-test.js`, `cf-api-contract-test.js`, `quota-core-test.js`,
`prerender-plan-test.js`, `prerender-dryrun-test.js`, `regression-test.js`, `install-health-test.js`.
Ikut dijalankan hijau: `breaker-test.js`, `quota-manipulation-test.js`, `quota-reset-test.js`,
`tts-transport-switch-test.js`.

### Temuan sampingan: `cf-api-contract-test.js` sebelumnya FLAKY

Bukan bagian dari brief, tapi ditemukan saat verifikasi dan diperbaiki karena ia merusak arti "exit 0".
Gerbang itu memalsukan tanda tangan cookie dengan mengubah **karakter terakhir** base64url. Karakter
terakhir bisa memuat bit yang tidak signifikan, jadi `A`→`B` di sana kadang mendekode ke byte yang
sama dan tanda tangannya tetap sah. Pada baseline yang belum disentuh: 1 merah dari 8 jalan.
Sekarang yang diubah karakter di tengah segmen tanda tangan: 20 dari 20 jalan hijau.

---

## Yang MASIH tidak bisa dibuktikan tanpa staging

Ini daftar batas, bukan basa-basi. Semua gerbang di atas berjalan di atas stub, jadi:

1. **Apakah Workers AI benar-benar menerima `speaker` untuk `@cf/deepgram/aura-1`.** Yang dibuktikan
   di repo hanyalah bahwa jalur pra-render dengan `{text, speaker}` menghasilkan aset R2 yang nyata,
   dan bahwa runtime kini mengirim badan permintaan yang **identik** dengan jalur itu. Bahwa provider
   sungguhan menjawab audio untuk badan itu adalah kesimpulan dari bukti byte, bukan pengamatan
   langsung dari paket kerja ini. Satu render staging sungguhan menutup ini.
2. **Nama parameter suara untuk `@cf/myshell-ai/melotts`.** Tidak ada bukti di repo. Ditandai
   `voiceSupported:false`. Kalau tier murah pernah dipakai serius, suaranya akan mengikuti bawaan
   model — bukan pilihan murid. Ini keputusan sadar, bukan kelalaian, dan konsekuensinya harus diuji
   staging sebelum melotts diaktifkan.
3. **Apakah `deps.rollbackQuota` benar-benar terpasang di produksi.** `route-ai.js` memanggil
   `deps.rollbackQuota` atau `globalThis.FIEZEL_ROLLBACK_QUOTA`. Di produksi, pembatalan sebenarnya
   terjadi lewat `route-wiring.js:settleQuota()` yang membaca amplop (`degraded:true` +
   `source:"deterministic-fallback"` ⇒ `rollbackD1`). Kedua mekanisme itu **tidak** diuji berjalan
   bersamaan di atas D1 sungguhan; yang diuji di sini adalah amplopnya benar dan pembatal yang
   disuntikkan dipanggil tepat sekali. Risiko yang tersisa: rollback ganda (satu dari `releaseQuota`,
   satu dari `settleQuota`). Arahnya menguntungkan murid, tapi angka `rolled_back` di D1 bisa
   terhitung dua kali. Perlu satu tagihan staging + pembacaan baris D1 untuk memastikan.
4. **Angka staging 22/25 tidak direproduksi**, hanya bentuk kegagalannya (`text:"{}"`). Apakah rasio
   itu turun ke nol setelah perbaikan hanya bisa diketahui dari staging berikutnya.
5. **Biaya nyata.** Gerbang membuktikan kunci cache runtime = kunci aset pra-render untuk kalimat uji,
   bukan untuk seluruh 604.962 karakter korpus. Sampel korpus sungguhan lewat `HEAD` R2 masih perlu
   dijalankan sebelum render massal berikutnya.

Sumber angka & perilaku yang dirujuk laporan ini: `tools/prerender-tts.mjs` (registry model,
`REJECTED_MODELS`, `ENGINE`, `CANONICAL`), `workers/api/tts/tts-key.js`,
`workers/api/route-wiring.js`, `workers/api/quota/quota-core.js`, `reports/roll-s6-tts.md`,
`reports/voice-v4-aifix.md`, dan artefak gerbang `TTS-PROVIDER-CONTRACT-REPORT.json` +
`A12-RED-PROOF.json` di root repo.
