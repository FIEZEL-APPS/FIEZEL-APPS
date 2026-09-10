# V3 Pemecah Teks — Neural Voice FIEZEL

Worktree: `/home/user/workspace/wt-vchunk`, branch `voice/vchunk`, dasar HEAD `f7b5f6e`.
Berkas produksi yang disentuh HANYA dua: `features/neural-voice/fiezel-prosody.js` dan
`features/neural-voice/fiezel-neural-voice.js`. `fiezel-web-audio-player.js` tidak disentuh
sama sekali (milik agen pemutar), demikian juga jalur unduhan model dan `prepare()`.
Versi build tidak dibump. Berkas `*-REPORT.json` dikembalikan.

Keluhan owner: *"setiap akhir kalimat, setiap ada titik, setiap menyambung ke kalimat atau
paragraf baru, selalu delay."*

Jawaban jujur di depan: **pemecahan yang terlalu halus itu nyata, dan sudah diperbaiki di
sini, tapi ia BUKAN penyebab utama.** Audit V1 dengan mesin supertonic-3 sungguhan
(`/home/user/workspace/reports/voice-v1-audit.md`) mengukur jeda produksi rata-rata
**4.422 ms**, dan **647 ms** bila seluruh teks dikirim dalam satu `speak()`. Porsi
penyebabnya: generasi model 82,6%, keheningan tak dipangkas 16,6%, jeda buatan 0 ms. Yang
mematikan seluruh mesin gapless adalah bentuk PEMANGGILAN: satu kalimat per `speak()`
membuat `chunks.length === 1`, jadi `joined` false
(`features/neural-voice/fiezel-neural-voice.js:735`) dan penjadwalan berkelanjutan,
pemangkasan senyap, serta `gapMs` semuanya mati. Pengelompokan di lapisan ini hanya
berdampak kalau teks yang masuk memang utuh.

---

## 1. Perilaku SEBELUM (bukti path:baris)

Nomor baris di bawah dari `git show f7b5f6e:<file>`.

| Apa | Di mana | Perilaku |
|---|---|---|
| Pemecah streaming (jalur aktif) | `features/neural-voice/fiezel-neural-voice.js:167` | `String(text).match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)` → **satu kalimat = satu potongan**; `streamMaxWords` default 26 |
| Sakelar jalur aktif | `features/neural-voice/fiezel-neural-voice-bootstrap.js:55`, `features/neural-voice/fiezel-neural-voice-config.js:76` | `streamSentences: true` default, `streamMaxWords: 26` |
| Pemecah lama (non-streaming) | `features/neural-voice/fiezel-neural-voice.js:115` | kalimat lalu paket 140/190 kata |
| Pemecah frasa prosodi | `features/neural-voice/fiezel-prosody.js:252` | `source.match(/[^.!?…]+[.!?…]+|\S[^.!?…]*$/g)`; klausa `(?<=[,;:])\s+` hanya kalau lewat 200 char |
| Normalisasi | `features/neural-voice/fiezel-neural-voice.js:8-16` | `\s+` → satu spasi, jadi **struktur paragraf hancur sebelum pemecahan** |
| Pecah ulang di adapter | `features/neural-voice/fiezel-sherpa-vits-adapter.js:62,360` | `PHRASE_MAX_CHARS = 160`, pecah lagi DI DALAM satu `generate()` — sambungan di sini gratis |

Karakter tempat teks dipecah sebelumnya: `.`, `!`, `?`, `…` tanpa pengecualian. Tidak ada
perlindungan untuk singkatan ("Mr.", "e.g.") maupun angka desimal ("3.5"), dan tidak ada
satu pun cabang yang mengenali paragraf.

### Pengukuran contoh nyata dari bank FIEZEL

**Reading B1 `r0123`** (`reading-bank.json`, 1.044 karakter, 3 paragraf, 13 kalimat):

| Strategi | Potongan | Rata-rata char | Min | Maks |
|---|---|---|---|---|
| `planStream(maxWords=26)` — **produksi sebelum** | **13** | **79,2** | 46 | 116 |
| `prosody.phrases(160)` | 13 | 79,3 | 46 | 116 |
| `splitIntoChunks(140/190)` (jalur non-streaming) | 2 | 520,5 | 287 | 754 |

**Listening B1 `listen_sc_b1_gist_007`** (`features/speaking-listening/listening-bank-v1.json`,
341 karakter, 1 paragraf, 4 kalimat):

| Strategi | Potongan | Rata-rata char | Min | Maks |
|---|---|---|---|---|
| `planStream(maxWords=26)` — **produksi sebelum** | **4** | **84,5** | 17 | 135 |

Potongan 17 karakter itu (`"My name is Gerry."`) adalah gambaran paling telanjang dari
masalahnya: satu batas generasi penuh dibayar untuk empat kata.

---

## 2. SESUDAH — pengelompokan berdasarkan anggaran karakter

Ditambahkan di `features/neural-voice/fiezel-prosody.js`:

- `CHUNK_CHARS = { min: 180, target: 220, max: 260 }` (`:305`) — konstanta yang bisa disetel,
  dengan blok komentar aritmetikanya di atasnya. Alasan angka: adapter memecah ulang di
  160 char di dalam satu `generate()` (gratis), jadi ambang di atas itu aman; 260 char
  ≈ 2–3 kalimat B1 dan masih di bawah panjang yang membuat RTF 0,86–0,91 pada supertonic-3
  menunda suara pertama secara terasa.
- `BOUNDARY = { comma, sentence, paragraph }` (`:310`) — penanda sebagai DATA.
- `ABBREVIATIONS` + `isAbbreviationStop()` (`:341`) — "Mr.", "Dr.", "e.g.", "U.S.", inisial
  satu huruf, plus set Indonesia ("dll.", "dsb.", "hlm.", "tsb.", "Yth.").
- `splitSentences()` (`:359`) — pemindaian karakter, melewati titik desimal (`3.5`), titik
  yang menempel ke kata berikutnya, singkatan, dan lanjutan huruf kecil; menelan deretan
  terminator dan tanda kutip penutup.
- `splitParagraphs()` (`:392`) — pecah pada baris kosong `\n[ \t]*\n+`.
- `splitOversized()` (`:409`) — kalimat yang sendirian melebihi `max` dipecah di `,;:` lalu
  di batas kata. **Tidak pernah memotong di tengah kata**; satu kata yang lebih panjang dari
  `max` dikeluarkan utuh.
- `groupChunks()` (`:447`) — pengemasan berimbang per paragraf: `pieceCount = ceil(total/max)`,
  `soft = min(max, ceil(total/pieceCount))`. Potongan terakhir setiap paragraf selalu
  bertanda `paragraph`.
- `planUtterance()` (`:547`) — **kontrak teks utuh**: masuk satu passage, keluar daftar
  potongan bertanda plus `stats` (`chunks`, `sentences`, `paragraphs`, `avgChars`,
  `boundariesRemoved`, `boundaries`).

Di `features/neural-voice/fiezel-neural-voice.js`:

- `normalizeText()` (`:17`) sekarang **mempertahankan baris kosong** sebagai `\n\n`; spasi
  dalam paragraf tetap dirapikan. Tanpa ini batas paragraf sudah hilang sebelum pemecah
  melihatnya.
- `planBudget()` (`:223`) memakai `prosody.groupChunks`, tetap menghormati `hardChars` Apple
  lewat `splitByHardChars` yang sudah ada (potongan paksa ditandai `comma`, karena tanda
  bacanya memang tidak ada di sana).
- `withFastLeadInPlan()` (`:261`) mempertahankan potongan pembuka pendek (waktu-ke-suara
  pertama) tanpa merusak penanda.
- `planChunks()` (`:352`) mengembalikan `[{text, boundary}]`; jalur anggaran dipakai bila
  `streamSentences && budgetChunking`, kalau tidak jatuh ke `planStream`/`splitIntoChunks`
  lama yang **dibiarkan utuh** sebagai cadangan.
- `planUtterance()` (`:791`) — API teks utuh di tingkat layanan, plus `stats.strategy`.
- Penanda diteruskan ke pemutar sebagai `boundary` (sambungan) dan `boundaryAfter` (`:730-737`).
  **Lapisan ini tidak menyisipkan keheningan sendiri** — hanya menyediakan penandanya.

### Hasil, dengan angka

| Contoh | Kalimat | Potongan SEBELUM (per titik) | Potongan SESUDAH (anggaran) | Batas yang hilang | Rata-rata char sesudah |
|---|---|---|---|---|---|
| `r0123` (reading B1) | 13 | **13** | **6** | **7** | 172,8 (min 147, maks 193) |
| `listen_sc_b1_gist_007` | 4 | **4** | **2** | **2** | 170 (255 / 85) |

Penanda batas `r0123`: `sentence, paragraph, sentence, paragraph, sentence, paragraph` —
tepat tiga penanda paragraf untuk tiga paragraf, di posisi paragraf berganti.

Setiap potongan yang hilang adalah satu batas yang tidak lagi bisa menimbulkan jeda. Pada
skala angka audit V1 (jeda terdengar 4.422 ms per batas di jalur produksi), 7 batas yang
hilang di `r0123` setara ~31 detik keheningan yang tidak lagi punya tempat untuk muncul —
**dengan syarat** teks dikirim utuh dalam satu `speak()`. Kalau pemanggil tetap mengirim
per kalimat, angka ini nol, karena pemecah tidak pernah melihat lebih dari satu kalimat.
Itu batas kejujuran klaim di sini.

---

## 3. Titik pemanggil yang saat ini mengirim PER KALIMAT

Semua masuk lewat pintu bersama `FiezelVoiceSay.say()`
(`features/neural-voice/fiezel-voice-say.js:137-177` → `:181-224` → `:226-243`), yang
memanggil `local.speak(english, ...)` sekali per panggilan. **Tidak satu pun pemanggil di
bawah ini saya ubah** — pemetaan dan usulan saja, sesuai pembagian kerja.

| # | Pemanggil | Bukti | Bentuk sekarang | Usulan teks utuh |
|---|---|---|---|---|
| 1 | Audiobook Library | `features/library/fiezel-library-ui.js:149-153` (`speak`), loop `narrate()` `:186-215`, prefetch `:164-170` | `while` menunggu tiap kalimat; sumbernya memang array kalimat (`features/library/fiezel-library.js:38-55` `sentencesOf`) | Kirim satu paragraf/halaman per `speak()` (gabungkan kalimat sampai `\n\n`), lalu gerakkan sorotan dari daftar potongan `planUtterance()` — pemetaan potongan→kalimat masih bisa dijaga karena teks utuh terpelihara dan urutan potongan stabil |
| 2 | Tutor v3 | `features/tutor-classroom/fiezel-tutor-v3.js:543` | satu `{en,id}` pair per panggilan, `voiceBusy` mengunci | Kalau satu langkah pelajaran punya beberapa pair berurutan, gabungkan `en` dengan `\n\n` antar-pair dan kirim sekali; subtitle tetap per pair karena `id` sudah dipegang pemanggil |
| 3 | Classroom (`classroomSpeak`) | `app.js:3735` | satu baris per panggilan | Gabungkan baris satu blok penjelasan menjadi satu `speak()`; subtitle sudah digambar terpisah, jadi tidak ada yang hilang |
| 4 | Speaking & Listening | `features/speaking-listening/fiezel-speaking-listening-addon.js:335-341` (`play`), dipakai `:398` dan `:580` | **sudah** mengirim `item.script` utuh | Tidak perlu diubah; ini pemanggil yang paling langsung menikmati pengelompokan baru (4 → 2 potongan) |
| 5 | Tes suara Settings | `app.js:3712` | satu kalimat pendek | Biarkan; memang satu kalimat |
| 6 | Cadangan Puter/TTS | `app.js:4100` | meneruskan teks apa pun yang diberikan | Tidak perlu diubah; ikut apa yang dikirim pemanggil hulu |

Pola usulannya sama di semua kasus: **kumpulkan teks yang akan dibaca berurutan, kirim
sekali, lalu pakai daftar potongan bertanda untuk sinkronisasi UI** — bukan memanggil suara
per satuan UI. Pekerjaan itu ada di lapisan pemanggil/pemutar, bukan di sini.

---

## 4. Konsekuensi cache (dan cara amannya)

Kunci cache TTS bergantung pada teks kanonik, jadi ini harus dinyatakan terang:

- **Aset R2 / prerender tidak terpengaruh.** Kunci dibangun dari teks item PENUH, bukan dari
  potongan lokal: `workers/api/tts/tts-key.js` (`build()` → `sha256(material)`, objek
  `<audioKey>.mp3`) dan `features/audio-assets/fiezel-audio-key.js`. Pemecahan ulang terjadi
  setelah kunci ditentukan, jadi aset lama tetap cocok. Gerbang `tests/tts-key-test.js` yang
  menjaga kunci ini tetap hijau dan tidak disentuh.
- **Jalur Puter tidak terpengaruh.** `features/neural-voice/fiezel-puter-voice.js:115` punya
  `cacheKey(text, opts)` sendiri dan dipanggil dengan teks penuh, bukan lewat `planChunks`.
- **Yang berubah hanya cache hangat sesaat.** Neural lokal (sherpa/VITS) tidak punya cache
  per potongan yang persisten; hanya satu slot `warmKey(text, options)` di memori
  (`features/neural-voice/fiezel-neural-voice.js:~351` pada versi lama). Teks potongan yang
  berubah paling banyak membatalkan satu entri hangat yang umurnya sesi.

Cara amannya sudah dipasang: pengelompokan anggaran **hanya aktif di jalur mesin neural
lokal** (`streamSentences && budgetChunking`, dengan `budgetChunking: false` sebagai
opt-out), dan tidak menyentuh pembangun kunci aset mana pun.

---

## 5. Gerbang baru

`tests/voice-chunker-test.js` (node murni, tanpa dependency), terdaftar di
`.github/workflows/quality.yml:146`. Sebelas pemeriksaan:

| Kode | Yang diassert |
|---|---|
| a | Tidak ada potongan melebihi ambang aman model |
| b | Tidak ada potongan memotong kata di tengah (rekonstruksi kata demi kata) |
| c | Singkatan umum ("Mr.", "Dr.", "e.g.", inisial) tidak menjadi batas kalimat |
| d | Angka desimal ("3.5") tidak menjadi batas |
| e | Batas paragraf selalu menjadi batas potongan |
| f | Setiap potongan punya penanda jenis batas yang sah, dan **tidak ada** medan `gapMs`/`silence` di lapisan ini |
| g | Jumlah potongan contoh nyata TURUN: `r0123` 13 → 6, `listen_sc_b1_gist_007` 4 → 2 (angka, bukan pernyataan; strategi lama diimplementasikan ulang di dalam tes sebagai pembanding) |
| h | Pemecah murni: input sama → keluaran identik; sumbernya tidak menyebut `fetch(`, `XMLHttpRequest`, `document.`, `window.`, `localStorage`, `Date.now`, `Math.random`, `setTimeout` |
| i | `planUtterance()` teks utuh: potongan < kalimat, dengan angka pastinya, dan teks utuh terjaga |
| j | Penanda `paragraph` muncul tepat di indeks paragraf berganti, tidak di tengah paragraf |
| k | Layanan suara mengembalikan satu rencana `chunks.length > 1` untuk teks utuh (syarat `joined` benar) |

## 6. Verifikasi

Semua exit 0:

```
node tests/voice-chunker-test.js          # 11/11
node tests/prosody-test.js
node tests/voice-fallback-chain-test.js
node tests/regression-test.js
node tests/ui-structure-test.js
node tests/install-health-test.js
node content-integrity-audit.js
node validator.js
```

Tambahan yang juga dijalankan dan hijau: `tests/tts-key-test.js`,
`tests/neural-cache-isolation-test.js`, `tests/voice-offline-fallback-test.js`,
`tests/neural-voice-m02592-puter-subtitle-test.js`, `tests/neural-voice-m02593-subtitle-translate-test.js`,
`tests/boot-order-test.js`, `tests/no-network-test.js`, `tests/audio-asset-pipeline-test.js`,
`tests/runtime-stage8-test.js`, `tests/release-audit-gate-test.js`, `tests/workflow-actor-gate-test.js`,
`tests/pwa-release-coherence-test.js`.

Satu gerbang merah dan itu **bukan** dari perubahan ini: `neural-voice-m02520-webgpu-acceleration-test.js`
gagal `MODULE_NOT_FOUND` pada `features/neural-voice/fiezel-kokoro-adapter.js`. Diverifikasi
pra-ada dengan `git stash` — merah juga di `f7b5f6e` bersih.

## 7. Yang berubah dari rencana awal

Mandat awal mengasumsikan penyebabnya panjang potongan. Audit V1 membuktikan penyebab
terbesarnya arsitektur serial × waktu model, jadi lingkupnya ditambah: **kontrak teks utuh**
(`prosody.planUtterance` dan `service.planUtterance`), **peta titik pemanggil per kalimat**
di bagian 3, dan tiga pemeriksaan gerbang tambahan (i, j, k). Klaim dampaknya juga
diturunkan supaya jujur: pengelompokan ini menghapus 7 dan 2 batas pada dua contoh nyata,
tapi keuntungannya baru terwujud kalau pemanggil berhenti mengirim satu kalimat per
`speak()`. Perubahan pemanggil dan pemutar bukan pekerjaan saya dan tidak saya lakukan.
