# V2 Pemutar Berpipa — Lapisan Pemutar Suara Neural FIEZEL (m025-73)

Worktree: `/home/user/workspace/wt-vplayer`, branch `voice/vplayer`, HEAD induk `f7b5f6e`.
Berkas produksi yang diubah hanya dua: `features/neural-voice/fiezel-web-audio-player.js` dan
titik antrean di `features/neural-voice/fiezel-neural-voice-bootstrap.js`. `fiezel-prosody.js`,
pemecah teks, dan `fiezel-voice-say.js` tidak disentuh. Versi build tidak dinaikkan.

## 1. Apa yang berubah dari rencana awal, dan mengapa

Rencana awal saya salah sasaran, dan audit V1 (`reports/voice-v1-audit.md`) yang membuktikannya.

Rencana awal: bangun mesin berpipa baru (generate N+1 sambil N berbunyi, penjadwalan garis
waktu, trim, jeda prosodi). Saya sudah membangunnya sebagai `enqueue()` + `playSequence()`.
Audit V1 lalu mengukur dengan model supertonic-3 asli dan menunjukkan mesin semacam itu
**sudah ada** di repo (streaming, `SCHEDULE_DEPTH`, `gapBefore`, `trimSilence`) tetapi
**tidak pernah aktif di produksi**: semua pemanggil mengirim satu kalimat per panggilan,
sehingga `chunks.length === 1` dan `fiezel-neural-voice.js:604-607` selalu meneruskan
`continuous:false, trim:false`. Konsekuensinya di pemutar: `startAt = now` (tanpa penjadwalan
ke depan), `stopAll()` tiap potongan, dan `trimSilence()` tidak pernah jalan.

Jadi masalahnya bukan ketiadaan mesin, melainkan **mesin yang mati karena bentuk pemanggilan**.
Pekerjaan saya berpindah dari "menulis mesin" ke "membuat mesin itu tidak bisa dimatikan oleh
flag pemanggil". Dua perubahan yang menanggung hampir seluruh dampak:

1. **Trim berlaku untuk potongan tunggal.** `trim:false` dari pemanggil lama tidak lagi
   mematikan pemangkasan. Yang mematikannya hanya `trim:'off'` eksplisit dan mode diagnostik
   `raw` (yang memang harus memutar PCM apa adanya). Dampak terukur audit V1: **-733 ms per
   batas kalimat** (kepala 331 ms + ekor 361 ms rata-rata), 16,6% dari jeda 4.422 ms.
2. **Antrean menyambung lintas panggilan.** Kontinuitas tidak lagi ditentukan flag pemanggil,
   melainkan kenyataan garis waktu: kalau kursor AudioContext masih lebih dari
   `CROSS_CALL_JOIN_MIN_LEAD_S` (10 ms) di depan `currentTime`, potongan baru dijadwalkan di
   ujung bunyi yang sedang berjalan, bukan `start()` "sekarang" setelah `stopAll()`. Pemanggil
   hanya bisa memaksa PUTUS lewat `interrupt:true`.

Batas jujurnya: perubahan (2) baru berbuah kalau kalimat berikutnya **sudah siap** sebelum
kalimat sekarang habis. Selama `FiezelVoiceSay.prefetch()` belum menyentuh mesin neural
(ditangani agen lain), pemanggil tetap menunggu bunyi selesai lalu menggenerasi — skenario A
audit V1 — dan yang tersisa dari kontribusi saya di kasus itu hanya trim (-733 ms). Klaim
"jeda hilang" hanya sah untuk pola pemanggil yang prefetch (skenario A2). Itu diuji terpisah
di gerbang, dan keduanya dilaporkan apa adanya.

## 2. Perubahan di pemutar

`features/neural-voice/fiezel-web-audio-player.js`:

- Konstanta baru dengan alasan tertulis: `PIPELINE_LOOKAHEAD_CHUNKS=2`,
  `PIPELINE_MAX_QUEUED_CHUNKS=3` (batas memori ponsel), `SCHEDULE_LEAD_S=0.03`,
  `CROSS_CALL_JOIN_MIN_LEAD_S=0.01`, dan tabel jeda prosodi
  `PROSODY_GAP_DEFAULT_S = { none: 0, clause: 0.09, sentence: 0.22, paragraph: 0.45 }`
  (detik) yang bisa disetel lewat `createPlayer(env, { prosodyGaps })`.
- `resolveProsodyGaps()`, `boundaryFromText()` (paragraf dari `\n\n`, kalimat dari `.!?…`,
  klausa dari `,;:`), `boundaryFromGapMs()` — petunjuk `gapMs` dari lapisan atas hanya
  **mengklasifikasikan** batas; panjang jedanya selalu dari tabel konstanta. Ini yang mencegah
  jeda pemanggil (420 ms `FiezelProsody.GAP_MS.sentence`) menumpuk di atas jeda pemutar.
- `enqueue(rawAudio, options)`: satu potongan masuk antrean pada garis waktu berkelanjutan
  (`start(kursor + jeda)`), tanpa `onended`. Penyelesaian dicatat timer pada waktu akhir yang
  sudah diketahui saat penjadwalan.
- `playSequence(items, generate, options)`: mengisi hingga `lookahead` generate secara paralel
  sebelum menunggu apa pun, mengisi ulang segera setelah menjadwalkan, dan menahan diri
  (back-pressure) saat ≥3 potongan belum selesai.
- `play()` (jalur yang dipakai pemanggil satu-kalimat) kini memakai kursor yang sama, trim
  default, jeda dari tabel konstanta, dan `start(startAt)` untuk setiap potongan yang
  disambung. Hasilnya melaporkan `joined`, `trimmed`, `boundary`, `gapSeconds`.
- `stop()`/`cancel()`: menaikkan `pipelineGeneration`, menolkan kursor, lalu `stopAll()`.
  Potongan yang generate-nya selesai SESUDAH `stop()` tidak pernah dijadwalkan, dan panggilan
  `play()` berikutnya tidak menyambung ke garis waktu yang sudah mati.
- iOS/Safari: tidak ada AudioContext baru per potongan. Semua jalur memakai
  `env.__fiezelWebAudioContext` lewat `resumeContext()`; konstruksi hanya terjadi di
  `constructContext()` yang dipanggil sesudah gesture (`warm()`).

`features/neural-voice/fiezel-neural-voice-bootstrap.js`: hanya titik antrean —
`playAudio: sherpaPlayer.enqueue`, `playSequence: sherpaPlayer.playSequence`, dan `stop()`
ikut memanggil `playerRef.cancel()`. `prepare()`, `ensureReady()`, daftar 11 aset
(158.889.523 byte) dan `verifyCachedAssets()` tidak disentuh; penjaga unduhan 152 MB utuh dan
diuji ulang oleh gerbang.

## 3. Gerbang baru: `tests/voice-pipeline-gap-test.js`

Node murni, tanpa dependency, pola `vm`/`sourceBlock` yang sama dengan
`tests/voice-fallback-chain-test.js`. Terdaftar di `.github/workflows/quality.yml` (baris sesudah
`node tests/voice-fallback-chain-test.js`). **36/36 lolos**, exit 0.

Yang di-assert (label sesuai keluaran):

| Label | Isi |
|---|---|
| a, a2, a3 | generate potongan N+1 dimulai sebelum N selesai (dibuktikan dari urutan waktu adapter tiruan) |
| b, b2 | tidak ada satu pun event `ended` yang menyala di jalur pipa; semua `start(when)` di masa depan dan naik |
| b3, b4 | celah antar potongan tepat sebesar jeda prosodi, nol underrun pada latensi tetap 120 ms |
| b5, b6 | sumber memakai `start(startAt)` tanpa `onended`; keheningan ujung PCM dipotong sebelum dijadwalkan |
| c–c5 | `stop()` membatalkan yang terjadwal, tidak ada potongan baru sesudah stop, `playSequence` tidak menggantung, alias `cancel()`, bootstrap ikut membatalkan |
| d–d4 | hanya SATU AudioContext untuk seluruh ucapan, dipakai ulang, hanya dibuat lewat jalur bersama |
| e–e6 | jeda prosodi dari konstanta yang bisa disetel, bukan angka tersebar; petunjuk atas hanya diklasifikasikan; kedalaman pipa dibatasi |
| f–f3 | tidak ada `prepare()`/`ensureReady()`/`warmAssets()` di jalur pemutaran; penjaga 11 aset utuh |
| **h–h7** | **realitas produksi**: potongan tunggal tetap dipangkas walau `trim:false`; antrean menyambung lintas panggilan; mesin menyambung walau `continuous:false`; `gapMs:420` tidak menumpuk; pemanggil yang menunggu bunyi selesai tidak menyambung ke garis waktu mati tetapi tetap dipangkas; `stop()` aman pada antrean lintas panggilan; bootstrap mengarahkan `playAudio` ke antrean |
| g, g2 | pengukuran: keheningan tak sengaja nol, sisa jeda persis jeda prosodi |

## 4. Angka sebelum/sesudah

### 4a. Gerbang, adapter tiruan berlatensi tetap 120 ms

PCM tiruan: 60 ms keheningan kepala + 300 ms bersuara + 100 ms keheningan ekor.

| Pola | Celah terukur per batas | Keheningan TAK SENGAJA | Jeda disengaja |
|---|---|---|---|
| Lama (tanpa trim, tanpa sambung; `trim:'off', interrupt:true`) | 0,125 / 0,126 / 0,127 s | **0,286 s** (celah + 160 ms keheningan PCM) | 0 s |
| Berpipa `playSequence()` | 0,220 / 0,090 / 0,450 s | **0 s** | 0,253 s rata-rata |
| Produksi + prefetch (satu kalimat per panggilan) | 0,220 / 0,090 / 0,450 s | **0 s** | 0,253 s rata-rata |
| Produksi tanpa prefetch (skenario A) | 0,131 s rata-rata | celah generate saja; 160 ms keheningan PCM **hilang** | 0 s |

Angka mentah: `VOICE-PIPELINE-GAP-REPORT.json` (kunci `productionPattern`,
`unintendedSilence*`).

### 4b. Playwright/Chromium, AudioContext sungguhan

Harness: `/home/user/workspace/vplayer-playwright-gap-evidence.js` (di luar repo), memuat
berkas pemutar asli di Chromium, menyadap sinyal sebelum `destination` dengan ScriptProcessor,
lalu mengukur keheningan dari **bunyi yang benar-benar dirender** — bukan dari angka
penjadwalan. Hasil: `/home/user/workspace/vplayer-playwright-gap-evidence.json`.

| Jalur | Keheningan terdengar per batas | Rata-rata |
|---|---|---|
| Lama (tanpa trim, tanpa sambung) | 0,276 / 0,276 / 0,276 s | **0,276 s** — seluruhnya tak sengaja |
| Berpipa `playSequence()` | 0,241 / 0,110 / 0,473 s | 0,275 s — 0,253 s di antaranya jeda prosodi yang disengaja |
| Pola produksi satu kalimat per panggilan + prefetch | 0,241 / 0,113 / 0,470 s | 0,275 s — sama, jadi mesin memang aktif di pola produksi |

Sisa 21–23 ms di atas konstanta prosodi adalah `TRIM_KEEP_S` (12 ms) yang **sengaja**
disisakan di kedua ujung supaya awal kata dan ekor konsonan tidak terpotong.

### 4c. Ekstrapolasi ke perangkat nyata — batas kejujuran

Latensi tiruan 120 ms bukan latensi model. Audit V1 mengukur generasi supertonic-3 asli
3.368–4.194 ms per kalimat, RTF 0,86–0,91. Pada latensi itu:

- Kontribusi saya yang **pasti** berlaku tanpa syarat: 733 ms keheningan PCM per batas,
  hilang untuk semua pola pemanggilan, termasuk yang menunggu bunyi selesai.
- Kontribusi antrean lintas panggilan baru terasa setelah prefetch neural tersambung. Pada
  skenario A2 audit V1 sisa jeda 777 ms; dari jumlah itu ~733 ms adalah keheningan PCM dan
  ~86 ms jeda penjadwalan, keduanya digantikan oleh jeda prosodi terpilih 90/220/450 ms.
- RTF 0,86–0,91 berarti marginnya tipis: satu kalimat ke depan cukup, dua lebih aman, dan
  underrun tetap mungkin di perangkat lambat. Karena itu `pipelineStats().underruns` ada dan
  di-assert bernilai 0 pada latensi terkendali; di perangkat nyata angka itu yang harus
  dipantau, bukan diasumsikan nol.

## 5. Risiko yang saya buat sendiri

- **Antrean menyambung bisa menyambung hal yang salah.** Kalau dua fitur berbeda berbicara
  hampir bersamaan tanpa `stop()` di antaranya, kalimat kedua kini ikut mengantre alih-alih
  menggantikan yang pertama. Mitigasi: `interrupt:true` untuk pemanggil yang memang mau
  memutus, dan `stop()` bootstrap yang sudah memanggil `playerRef.cancel()`. Kalau ada laporan
  "suara menumpuk berurutan", inilah tersangka pertama.
- **`trim:false` yang diabaikan adalah perubahan semantik.** Kalau ada pemanggil yang benar
  memerlukan PCM utuh, ia harus dipindahkan ke `trim:'off'`. Saya sudah memeriksa: tidak ada
  gerbang yang bergantung pada semantik lama.
- Verifikasi: 14 gerbang dijalankan, semua exit 0 — `voice-pipeline-gap-test`,
  `voice-fallback-chain-test`, `voice-offline-fallback-test`, `speaking-listening-test`,
  `listening-exam-test`, `regression-test`, `ui-structure-test`, `install-health-test`,
  `a11y-test`, `prosody-test`, `neural-voice-m02592-puter-subtitle-test`,
  `neural-voice-m02593-subtitle-translate-test`, `neural-cache-isolation-test`,
  `audio-asset-pipeline-test`. `neural-voice-test.js` tidak ada di repo ini.
