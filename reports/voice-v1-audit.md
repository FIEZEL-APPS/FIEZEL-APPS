# V1 Audit Jeda — Neural Voice FIEZEL (supertonic-3)

Worktree: `/home/user/workspace/wt-vaudit`, branch `voice/vaudit`, HEAD `f7b5f6e`.
Tidak ada satu baris kode produksi yang diubah. Yang ditambahkan hanya laporan ini plus
alat ukur dan data mentah di `reports/voice-v1-data/`.

Keluhan owner yang diuji: *"setiap akhir kalimat, setiap ada titik, setiap menyambung ke
kalimat atau paragraf baru, selalu delay."*

Jawaban singkat: **keluhan itu benar, dan penyebab terbesarnya bukan titik, bukan
paragraf, dan bukan jeda buatan.** Penyebabnya adalah kalimat berikutnya baru mulai
digenerasi SESUDAH kalimat sebelumnya habis berbunyi, sementara satu kalimat butuh
3,4–4,2 detik untuk digenerasi. Di atasnya menumpuk ~0,7 detik keheningan yang memang ada
di dalam berkas audio dan tidak pernah dipangkas di jalur yang dipakai produksi.

---

## 1. Angka utama

Semua angka di bawah dari mesin supertonic-3 **sungguhan** (11 aset, 152 MB, dari
`vendor/supertonic-3/`) yang berjalan di Chromium headless, bukan adapter tiruan. Teks uji:
6 kalimat, 2 paragraf (3+3 kalimat), 384 karakter.

| Skenario | Bentuk pemanggilan | Waktu sampai suara pertama | Jeda penjadwalan rata-rata | **Jeda terdengar rata-rata** | Jeda paragraf | Total waktu / audio |
|---|---|---|---|---|---|---|
| **A** (= perilaku produksi) | `speak()` per kalimat, ditunggu, tanpa prefetch efektif | **3.449 ms** | **3.690 ms** | **4.422 ms** | 4.034 ms | 46,8 s / 24,9 s (46,8% senyap) |
| **A2** (bila prefetch benar-benar sampai ke mesin neural) | idem + `prefetch()` kalimat berikut | 3.362 ms | 86 ms | **777 ms** | 626 ms | 28,7 s / 24,9 s (13,2% senyap) |
| **B** (satu `speak()` untuk seluruh teks) | jalur streaming internal | 3.388 ms | 623 ms | **647 ms** | 444 ms | 27,4 s / 20,9 s (23,7% senyap) |

"Jeda terdengar" = jeda penjadwalan + keheningan di ekor potongan N + keheningan di kepala
potongan N+1 (di skenario B keduanya sudah dipangkas pemutar, jadi dihitung 12 ms sesuai
`TRIM_KEEP_S`). Rincian per batas kalimat ada di `reports/voice-v1-data/perceptual.json`.

Jeda per batas kalimat, skenario A (produksi):

| Batas | Jeda penjadwalan | Senyap ekor (dalam berkas) | Senyap kepala (dalam berkas) | Jeda terdengar |
|---|---|---|---|---|
| 1→2 | 4.088 ms | 290 ms | 285 ms | 4.663 ms |
| 2→3 | 3.380 ms | 369 ms | 413 ms | 4.161 ms |
| 3→4 (**pindah paragraf**) | 3.374 ms | 346 ms | 314 ms | 4.034 ms |
| 4→5 | 4.180 ms | 428 ms | 402 ms | 5.009 ms |
| 5→6 | 3.427 ms | 424 ms | 394 ms | 4.244 ms |

**Pindah paragraf tidak lebih lambat dari pindah kalimat biasa (4.034 ms vs rata-rata
4.422 ms).** Tidak ada satu pun cabang kode yang mengenali paragraf: `splitIntoChunks`
(`features/neural-voice/fiezel-neural-voice.js:111-144`) dan `planStream` (`:163-195`)
hanya mengenal kalimat dan klausa, dan `FiezelProsody.GAP_MS`
(`features/neural-voice/fiezel-prosody.js:42-49`) tidak punya entri paragraf. Yang owner
rasakan sebagai "jeda paragraf lebih parah" secara terukur adalah jeda kalimat yang sama,
hanya terasa lebih menusuk karena datang setelah kalimat penutup.

Biaya generasi model per kalimat (real-time factor = waktu generasi ÷ durasi audio):

| Kalimat | Karakter | Waktu generasi | Durasi audio | RTF |
|---|---|---|---|---|
| 1 | 60 | 3.445 ms | 3,876 s | 0,89 |
| 2 | 68 | 4.098 ms | 4,515 s | 0,91 |
| 3 | 59 | 3.368 ms | 3,941 s | 0,86 |
| 4 | 58 | 3.382 ms | 3,924 s | 0,86 |
| 5 | 69 | 4.194 ms | 4,654 s | 0,90 |
| 6 | 64 | 3.431 ms | 3,987 s | 0,86 |

RTF 0,86–0,91 artinya mesin ini **hampir tidak punya kelebihan tenaga**. Menggenerasi satu
kalimat memakan ~88% dari durasi kalimat sebelumnya. Pipelining satu kalimat ke depan
masih cukup (skenario A2 membuktikannya: sisa jeda 7–209 ms), tetapi marginnya tipis.

Inisialisasi mesin (11 aset dari disk lokal + start worker): **2,58 s** sekali per sesi.

---

## 2. Pembagian penyebab dengan angka

Untuk jalur yang benar-benar dipakai produksi (skenario A), satu jeda 4.422 ms terdiri
dari:

| Sumber | Besar | Porsi | Bukti |
|---|---|---|---|
| (i) Waktu generasi model kalimat berikutnya | 3.653 ms | **82,6%** | `generate_ready.elapsedMs` di `raw-measurements.json` |
| (iii) Arsitektur: generasi baru dimulai setelah audio sebelumnya habis (serial, bukan berpipa) | membuat 100% angka (i) itu terdengar; selisih glue hanya ~37 ms | — | `fiezel-neural-voice.js:569-631`, `fiezel-web-audio-player.js:974-975` |
| (ii) Keheningan di dalam berkas audio (ekor + kepala, tidak dipangkas) | 733 ms rata-rata (kepala 215–412 ms, ekor 290–490 ms) | **16,6%** | pengukuran per berkas WAV, `analysis.json` |
| (iv) Jeda buatan di kode | **0 ms** di jalur ini | 0% | `gapMs` hanya dipakai bila `continuous`, dan `continuous` selalu false di jalur ini |

Jadi urutan besarnya jelas: **arsitektur serial × waktu model (≈83%) jauh mengalahkan
keheningan dalam berkas (≈17%), dan jeda buatan sama sekali bukan penyebab** — di jalur
produksi. Jeda buatan baru muncul di skenario B, di mana `FiezelProsody.GAP_MS.sentence =
420 ms` (`fiezel-prosody.js:42-49`) menyumbang 420 dari 444 ms jeda mantap (95%).

Keheningan dalam berkas, per skenario (ambang 0,0025 amplitudo — ambang yang sama dipakai
pemangkas pemutar, `fiezel-web-audio-player.js:57`):

| Skenario | Kepala rata-rata | Ekor rata-rata | Dipangkas pemutar? |
|---|---|---|---|
| A / A2 (satu potongan per `speak()`) | 331 ms | 361 ms | **Tidak** |
| B (streaming) | 339 ms | 324 ms | Ya (636 ms hilang dari potongan pertama: 3,800 s → 3,164 s) |

Log `silencedetect` mentah per berkas ada di `analysis.json` (`ffmpegSilencedetect`), file
WAV-nya di `reports/voice-v1-data/wav/<skenario>/chunkNN.wav`.

---

## 3. Peta jalur teks → sintesis → bunyi (bukti path:baris)

**Pemecahan teks.** `splitIntoChunks` (`fiezel-neural-voice.js:111-144`) memotong per
kalimat lewat regex `:115`, lalu memaketkan sampai `targetChunkWords=140` /
`hardChunkWords=190` (`fiezel-neural-voice-config.js:65-70`). Untuk streaming, `planStream`
(`:163-195`) memaksa **satu kalimat per potongan** (`streamMaxWords=26`,
`fiezel-neural-voice-config.js:75-79`), dengan pecah klausa di `,;:` (`:175`).

**Ini titik kuncinya:** pemanggil nyata mengirim SATU kalimat per panggilan, sehingga
`chunks.length === 1`:

- `features/library/fiezel-library-ui.js:149-154` (`speak()`) dipanggil dari loop narasi
  yang menunggu tiap kalimat; teks buku tersimpan sebagai kalimat, bukan paragraf
  (`features/library/fiezel-library.js:10`)
- `features/tutor-classroom/fiezel-tutor-v3.js:543`
- `features/speaking-listening/fiezel-speaking-listening-addon.js:336`
- `app.js:3735` (classroomSpeak) dan `app.js:4100`

Semuanya masuk lewat pintu bersama `FiezelVoiceSay.say()`
(`features/neural-voice/fiezel-voice-say.js:137-177`) → `speakWithEngine` (`:181-224`) →
`speakWithLocal` (`:226-243`), yang memanggil `local.speak(english, ...)` satu kalimat
sekali jalan.

**Akibat di kode:** di `fiezel-neural-voice.js:604`, `joined = chunks.length > 1` → false,
sehingga opsi pemutar `:605-607` menjadi `continuous: false` dan `trim: false`. Di pemutar,
`fiezel-web-audio-player.js:974-975`:

- `startAt = continuous ? scheduledUntil() + gap : now` → selalu `now`, jadi **tidak ada
  penjadwalan ke depan**
- `if (!continuous) stopAll(current, epoch)` → antrean dibersihkan tiap potongan
- `trim: false` → `trimSilence` (`:463-476`) tidak pernah jalan, keheningan 733 ms tetap
  berbunyi
- `gapMs` tidak dipakai sama sekali

Artinya seluruh mesin "gapless" yang sudah dibangun (streaming `:244`, `SCHEDULE_DEPTH = 2`
`:249`, `gapBefore` `:268-275`, prosodi `GAP_MS`) **tidak pernah aktif di produksi**.

**Satu potongan = satu node baru.** Tiap panggilan `play()` membuat `createBuffer` +
`createBufferSource` + `GainNode` baru (`fiezel-web-audio-player.js:984-996`) dengan fade-in
6 ms dan fade-out 18 ms (`:8-13`). AudioContext **tidak** dibuat ulang: ia disimpan global
di `env.__fiezelWebAudioContext` (`ensureContext` `:538-542`) dan hanya ditutup oleh
`close()` (`:1072-1091`) atau `release()` bootstrap (`:505-515`). Jadi jeda ini bukan biaya
membuat AudioContext.

**Jeda buatan yang ada di kode** (semua kecil atau tidak di jalur ini):

| Lokasi | Nilai | Aktif di jalur produksi? |
|---|---|---|
| `fiezel-prosody.js:42-49` `GAP_MS.sentence` | 420 ms | Tidak (hanya bila `continuous`) |
| `fiezel-prosody.js:27` `PAUSE_MS.sentence` | 500 ms | Tidak (tanda baca, bukan penjadwalan) |
| `fiezel-neural-voice.js:379` `setTimeout(...,0)` di `prefetch` | ~0 ms | Ya, tak signifikan |
| `fiezel-library-ui.js:161-172` `warmNext` `setTimeout(...,0)` | ~0 ms | Ya, tak signifikan (dan sengaja, anti queue-inversion m025-47) |
| `fiezel-neural-voice.js:217` fallback peramban | 60 ms | Hanya jalur fallback |
| `fiezel-sherpa-vits-adapter.js:386-389` `padSilence` | — | Tidak (`padBetweenPhrases: false`, `fiezel-neural-voice-bootstrap.js:286`) |

**Sintesis vs pemutaran: serial, bukan berpipa.** Di loop utama
`fiezel-neural-voice.js:569-631`, prefetch potongan berikutnya baru diajukan di `:617`
SESUDAH `playAudio`, dan pada jalur non-streaming ada `await drainScheduled(0)` di `:627`
yang menunggu audio benar-benar selesai. Mesin dijaga single-flight (`runOnEngine`
`:286-290`, `pending || generating` di `fiezel-sherpa-vits-adapter.js:347-351`), jadi
generasi berikutnya tidak bisa menyelip.

---

## 4. Temuan paling penting: prefetch neural tidak pernah sampai ke mesin neural

Library sudah berusaha benar: `warmNext()` (`fiezel-library-ui.js:161-172`) memanggil
`say.prefetch(upcoming.en, ...)`. Tapi `prefetch()` di pintu bersama
(`fiezel-voice-say.js:304-320`) hanya menyentuh dua lapis:

1. `assets().prefetch(...)` — resolver aset ElevenLabs (L1)
2. `engine()` = `root.FiezelPuterVoice` (`:69`) — L2

**Tidak ada satu pun cabang yang memanggil `localEngine()` / `FiezelVoiceRuntime.prefetch`,
padahal bootstrap sudah menyediakannya di `fiezel-neural-voice-bootstrap.js:523-528.**
Pencarian seluruh repo mengonfirmasi: satu-satunya pemanggil `prefetch` selain resolver dan
Puter adalah pembungkus internal.

Konsekuensinya persis seperti yang diukur: untuk kalimat yang **belum punya aset
ElevenLabs** — yaitu justru bagian korpus yang rencananya diserahkan ke suara neural —
mesin neural selalu berjalan dalam mode skenario A, **4.422 ms senyap per titik**, bukan
mode A2 yang 777 ms. Selisihnya 3.645 ms per kalimat, atau 18 detik senyap tambahan per 6
kalimat.

Tambahan yang tidak bisa saya ukur di sandbox tetapi ada di kode dan menambah jeda di
perangkat nyata: setiap kalimat lewat `store.resolve()` (jaringan/manifest) dulu
(`fiezel-voice-say.js:157-162`), lalu percobaan Puter dengan `CALL_TIMEOUT_MS = 25000`
(`features/neural-voice/fiezel-puter-voice.js:52`) sebelum jatuh ke neural. Bila Puter
gagal tanpa memo kredit terstruktur, penantian itu ditanggung **per kalimat**.

---

## 5. Usulan perbaikan berperingkat (tidak diterapkan)

Peringkat berdasarkan dampak terukur di atas.

**1. Sambungkan prefetch neural ke pintu bersama.**
Berkas: `features/neural-voice/fiezel-voice-say.js:304-320`. Pendekatan: setelah resolver
dan Puter gagal/absen, jatuhkan ke `localEngine().prefetch(english, opts)` — memakai
`localEngine()`, bukan `FiezelVoiceRuntime` langsung.
Dampak terukur: jeda terdengar 4.422 ms → 777 ms (−82%); total pembacaan 6 kalimat 46,8 s →
28,7 s.
Risiko: `localEngine()` (`:85-93`) sudah menjaga unduhan 152 MB lewat
`status().prepared || ready`, jadi penjaga itu **tidak perlu dilonggarkan** — asal prefetch
dipanggil lewat fungsi itu dan tidak lewat `rt.prepare()`. Kontrak `fiezel-voice-say.js`
tidak berubah (`prefetch` sudah publik dan sudah mengembalikan `Promise<boolean>`).
Jebakan nyata: prefetch memesan mesin single-flight (`fiezel-neural-voice.js:286-290`,
`366-410`); pertahankan penundaan satu task di `warmNext` (`fiezel-library-ui.js:161-172`)
supaya inversi antrean m025-47 tidak kembali.

**2. Pangkas keheningan tepi juga untuk `speak()` satu potongan.**
Berkas: `features/neural-voice/fiezel-neural-voice.js:604-607` (`trim: joined` →
`trim: true`). Pemangkasnya sudah ada dan sudah terbukti bekerja di skenario B (memangkas
636 ms dari potongan pertama).
Dampak terukur: −733 ms per batas kalimat, dan −~331 ms pada waktu ke suara pertama.
Digabung dengan usulan 1: jeda terdengar tinggal ~86 ms.
Risiko: rendah. Ambang `SILENCE_FLOOR = 0.0025` dengan `TRIM_KEEP_S = 0.012`
(`fiezel-web-audio-player.js:57-58`) perlu diuji telinga pada konsonan letup di awal
kalimat; tidak menyentuh penjaga 152 MB maupun kontrak pintu suara.

**3. Turunkan `silenceScale` dan ukur ulang keheningan model.**
Berkas: `fiezel-neural-voice-bootstrap.js:304` (kini 0,4) diteruskan ke
`fiezel-sherpa-vits-adapter.js:249-265`. Model masih menaruh ~331 ms kepala + ~361 ms ekor
pada 0,4.
Dampak: sampai −700 ms per kalimat tanpa mengubah arsitektur; murah untuk dicoba.
Risiko: 0,4 kemungkinan besar dipilih untuk kejelasan artikulasi; perubahan ini mengubah
karakter suara, jadi harus dinilai telinga, bukan hanya angka. Tidak berisiko pada
penjaga unduhan.

**4. Prefetch untuk pemanggil yang belum punya prefetch sama sekali.**
Berkas: `features/tutor-classroom/fiezel-tutor-v3.js:543`,
`features/speaking-listening/fiezel-speaking-listening-addon.js:336`, `app.js:3735`,
`app.js:4100`. Ketiganya kini membayar penuh 4.422 ms per kalimat.
Dampak: sama seperti usulan 1 untuk jalur-jalur itu.
Risiko: menengah — pada listening exam, prefetch kalimat berikutnya bisa membocorkan
generasi item yang belum tampil bila token/supersession tidak dijaga
(`fiezel-neural-voice.js` menolak dengan `superseded`).

**5. Kirim teks multi-kalimat sebagai SATU `speak()` dan buat jeda prosodi adaptif.**
Berkas: pemanggil + `features/neural-voice/fiezel-prosody.js:42-49`. Jalur streaming sudah
punya penjadwalan berkelanjutan; masalahnya jeda mantap 420 ms itu murni pilihan dan
kelaparan buffer di batas pertama (1.435 ms) karena `SCHEDULE_DEPTH = 2`
(`fiezel-neural-voice.js:249`) tidak cukup pada RTF 0,9.
Dampak: 647 ms → ~250 ms bila `GAP_MS.sentence` diturunkan ke 180–250 ms dan kedalaman
jadwal dinaikkan ke 3.
Risiko: mengubah ritme bicara untuk semua fitur sekaligus; `SCHEDULE_DEPTH` lebih besar
menambah memori buffer di iOS. Kontrak `fiezel-voice-say.js` berubah bila pemanggil mulai
mengirim paragraf (subtitle per kalimat di `prepareSubtitle` `:110-129` ikut terpengaruh) —
ini satu-satunya usulan yang menyentuh kontrak.

**6. Kurangi biaya masuk sebelum neural (khusus perangkat).**
Berkas: `fiezel-voice-say.js:157-224` dan `fiezel-puter-voice.js:52`. Percobaan Puter
25 detik per kalimat di depan mesin neural adalah risiko jeda terbesar yang tidak
terlihat di sandbox.
Dampak: perlu diukur di perangkat owner dulu.
Risiko: menyentuh urutan tangga suara — jangan diubah tanpa mengukur, karena urutan itulah
penjaga kredit ElevenLabs.

Yang **tidak** perlu disentuh: pembuatan ulang AudioContext (tidak terjadi),
`padBetweenPhrases` (sudah false), dan jeda `setTimeout(...,0)` (≈0 ms).

---

## 6. Metode dan batasnya (jujur)

Yang dipakai: model supertonic-3 asli dari `vendor/supertonic-3/` (11 aset, 152 MB) di
Chromium headless (Playwright), worktree diservis di `http://127.0.0.1:8731`. Mesin dibangun
persis seperti `fiezel-neural-voice-bootstrap.js:270-313` (padBetweenPhrases false,
generationSteps 4, silenceScale 0,4, usePitchContour false, useEmotion true, streamSentences
true, streamMaxWords 26). **Tidak ada adapter tiruan.** Instrumentasi: tambalan pada
`AudioBufferSourceNode.prototype.start` (waktu AudioContext + durasi buffer) dan pembungkus
`adapter.generate`; alat ukurnya di `reports/voice-v1-data/harness.html`, `measure.py`,
`analyze.py`, `perceptual.py`.

Batas yang harus dinyatakan:

1. **CPU sandbox ≠ iPhone.** Mesin uji: 2 vCPU Intel Xeon 2,90 GHz, 7 GB RAM. RTF terukur
   0,86–0,91. Di iPhone dengan Neural Engine bisa lebih cepat, di perangkat Android murah
   bisa >1. **Bila RTF > 1, tidak ada pipelining yang bisa menyembunyikannya** dan
   satu-satunya jalan adalah potongan lebih pendek (klausa, `planStream:175`) agar suara
   pertama datang lebih cepat.
2. **Tidak ada keluaran audio nyata** di sandbox; jeda diukur dari jam AudioContext dan
   durasi buffer, bukan dari mikrofon. Jam AudioContext berjalan real-time, jadi angka ini
   sahih sebagai jeda penjadwalan, tetapi tidak menangkap latensi keluaran perangkat.
3. **Jalur khusus Apple tidak teruji**: worklet PCM (`fiezel-web-audio-player.js:624-663`,
   `:702-780`), `appleHardChunkChars` (`fiezel-neural-voice.js:236-237`, `:253`),
   `withFastLeadIn` (`:82-109`), dan yield makrotask Apple (`:611-616`) semuanya mati di
   Chromium. Harus diukur di PWA iPhone owner.
4. **Resolver aset dan Puter tidak ikut diukur** (harness memanggil layanan neural
   langsung). Di produksi keduanya berada di depan mesin neural, jadi jeda nyata di
   perangkat kemungkinan **lebih besar** dari 4.422 ms, bukan lebih kecil.
5. Sekali jalan per skenario, 6 kalimat. Cukup untuk memisahkan penyebab (selisih antar
   skenario 5–50×), tidak cukup untuk statistik varians.

Yang perlu diukur di perangkat nyata: RTF supertonic-3 di iPhone owner, waktu
`store.resolve()` per kalimat, apakah Puter dipanggil dan berapa lama sebelum jatuh ke
neural, dan apakah worklet Apple mengubah profil jeda.

---

## 7. Berkas data

- `reports/voice-v1-data/raw-measurements.json` — seluruh event mentah (say_call,
  generate_enter/ready, source_start) untuk 3 skenario
- `reports/voice-v1-data/analysis.json` — tabel per potongan, statistik jeda, keheningan per
  berkas + log `silencedetect`
- `reports/voice-v1-data/perceptual.json` — jeda terdengar per batas kalimat
- `reports/voice-v1-data/wav/<skenario>/chunkNN.wav` — 18 hasil render model (bahan ukur
  keheningan)
- `reports/voice-v1-data/harness.html`, `measure.py`, `analyze.py`, `perceptual.py` — alat
  ukur, bisa dijalankan ulang dengan `python3 reports/voice-v1-data/measure.py`
