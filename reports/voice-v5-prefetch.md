# V5 — Prefetch neural disambungkan ke pintu bersama

Worktree: `/home/user/workspace/wt-vprefetch`, branch `voice/vprefetch`, dasar `f7b5f6e`.
Usulan **peringkat 1** di `reports/voice-v1-audit.md §5`. Versi build TIDAK dinaikkan.

Berkas produksi yang diubah: **satu**, `features/neural-voice/fiezel-voice-say.js` (hanya
`prefetch()` dan jalur pemanggilnya di dalam berkas itu). `fiezel-web-audio-player.js`,
`fiezel-neural-voice.js`, dan `fiezel-prosody.js` tidak disentuh sama sekali.

---

## 1. Angka sebelum–sesudah, diukur ulang lewat PINTU

Audit V1 mengukur skenario A vs A2 dengan memanggil layanan neural **langsung**. Itu
membuktikan prefetch neural *mampu* menutup jeda, bukan bahwa pintu bersama benar-benar
sampai ke sana. Karena itu pengukuran v5 dibuat lewat `FiezelVoiceSay.say/prefetch` yang
asli, mesin supertonic-3 yang sama (11 aset, 152 MB dari `vendor/supertonic-3/`, Chromium
headless), teks uji identik dengan V1 (6 kalimat, 2 paragraf, 384 karakter), resolver aset
dan Puter sengaja tidak dipasang — keadaan kalimat yang belum punya aset ElevenLabs, yaitu
justru kasus yang diserahkan ke neural.

Alat: `reports/voice-v5-data/harness-door.html` + `measure_door.py`
(`python3 reports/voice-v5-data/measure_door.py`), data mentah
`reports/voice-v5-data/door-measurements.json`. Berkas pintu versi lama disimpan apa adanya
di `reports/voice-v5-data/fiezel-voice-say-before.js` (= `git show HEAD:...`), jadi keduanya
diukur dalam SATU sesi mesin yang sama.

| Ukuran | Sebelum (pintu HEAD) | Sesudah (v5) | Selisih |
|---|---|---|---|
| **Jeda terdengar rata-rata** | **4.510,7 ms** | **797,2 ms** | **−82,3%** |
| Jeda penjadwalan rata-rata | 3.736,1 ms | 109,1 ms | −97,1% |
| Jeda pindah paragraf (batas 3→4) | 4.120,5 ms | 752,9 ms | −81,7% |
| Total waktu 6 kalimat | 43,58 s | 25,44 s | −18,14 s |
| Porsi senyap | 42,87% | 2,14% | −40,7 pp |
| Waktu sampai suara pertama | 3.455,9 ms | 3.399,4 ms | ≈ sama (di luar cakupan usulan 1) |
| Audio bersih | 24,90 s | 24,90 s | identik (bukan pemangkasan, murni pipelining) |
| RTF rata-rata model | 0,888 | 0,876 | mesin yang sama |
| `prefetch()` mengembalikan | `false` × 5 (semua kalimat) | `true` × 5 | inti bug-nya |
| `prepare()`/`ensureReady()`/`prewarm()` dipanggil | 0 | **0** | pagar 152 MB utuh |

Angka ini menempel pada audit V1 (4.422 ms → 777 ms) dalam ±2%: perbedaan kecilnya adalah
varians satu-jalan pada CPU sandbox yang sama (2 vCPU Xeon 2,90 GHz).

Per batas kalimat (jeda terdengar = jeda penjadwalan + senyap ekor N + senyap kepala N+1,
ambang 0,0025 sama dengan `fiezel-web-audio-player.js:57`):

| Batas | Sebelum | Sesudah |
|---|---|---|
| 1→2 | 4.841,1 ms | 888,2 ms |
| 2→3 | 4.124,4 ms | 741,2 ms |
| 3→4 (pindah paragraf) | 4.120,5 ms | 752,9 ms |
| 4→5 | 5.031,7 ms | 955,2 ms |
| 5→6 | 4.435,7 ms | 648,5 ms |

Sisa 797 ms sesudah perbaikan ini **hampir seluruhnya keheningan di dalam berkas audio**
(~330 ms kepala + ~360 ms ekor, tidak dipangkas di jalur satu-potongan). Itu usulan
peringkat 2 di audit dan bukan pekerjaan berkas ini.

Shim runtime di harness membuat `prepare`, `ensureReady`, dan `prewarm` **melempar** bila
dipanggil; `guardHits` kosong pada kedua jalur, jadi pengukuran ini juga bukti pagar.

---

## 2. Apa yang diubah di `fiezel-voice-say.js`

1. **Tangga prefetch lengkap, urutan sama dengan `say()`**: aset R2 → Puter → neural lokal.
   `prefetchWithEngine()` menuruni tangga hanya bila lapisan di atasnya gagal/absen, dan
   `prefetchWithLocal()` adalah satu-satunya cabang yang menyentuh mesin neural — lewat
   `localEngine()`, pintu yang sama dengan `speakWithLocal()`.
2. **Pagar 152 MB tidak dilonggarkan sedikit pun.** Tidak ada `prepare()`, `ensureReady()`,
   `prewarm()`, maupun `refreshPreparedFlag()` di seluruh jalur prefetch. `localEngine()`
   membaca `status().prepared || ready` dan menjawab `null` selama aset belum lengkap, dan
   `null` berarti `false` dengan tenang — bukan unduhan latar belakang. Komentar tegas soal
   ini ada di atas blok prefetch dan di atas `prefetchWithLocal()`, termasuk peringatan
   untuk agen berikutnya: prefetch yang selalu `false` pada murid baru **bukan bug, itu
   pagarnya**.
3. **Tidak menghambat, tidak melempar, senyap.** Janji yang dikembalikan tidak pernah
   reject (galat sinkron maupun asinkron di lapisan mana pun ditelan menjadi `false`), dan
   pemanggil boleh mengabaikannya. Prefetch tidak menyentuh pita subtitle atau penerjemah
   (jadi jatah AI aman), tidak menyentuh pemutar, dan **tidak pernah** menyalakan L4
   `speechSynthesis` — suara peramban tidak punya singgah simpan, jadi "menghangatkannya"
   sama dengan membunyikannya lebih awal.
4. **Kuota Puter.** Memo `creditStatus().outOfCredit` dihormati persis seperti di
   `speakWithEngine()`: pekerjaan spekulatif tidak boleh menjadi alasan SDK Puter
   memunculkan dialog upgrade. Kredit ElevenLabs tidak bisa bocor: L1 hanya mengambil
   berkas yang sudah ada di manifest, dan tak satu pun mesin di bawahnya memanggilnya.
5. **Batas konkurensi + deduplikasi.** `PREFETCH_MAX_INFLIGHT = 2`; permintaan ke-3
   dijawab `false` (bukan diantrekan) supaya ponsel kelas bawah tidak menjalankan tiga
   generasi sekaligus. Deduplikasi memakai kunci teks **kanonik** (spasi diciutkan, huruf
   kecil, kutip melengkung dinormalkan) + locale + contentType + voice + speed; pemanggil
   kedua untuk teks yang sama menerima **janji yang sama**, bukan generasi kedua, dan slot
   dibebaskan setelah selesai sehingga replay tetap bisa menghangatkan.
6. Penundaan satu task di `warmNext` (`features/library/fiezel-library-ui.js:161-172`)
   **tidak disentuh** — itu penjaga inversi antrean m025-47, dan mesin neural memang
   single-flight (`fiezel-neural-voice.js:286-290`).

---

## 3. Titik yang SEHARUSNYA memanggil `prefetch()` tetapi tidak (dilaporkan, tidak diubah)

Prefetch yang benar tetapi tidak pernah dipanggil sama saja tidak ada. Setelah perbaikan
ini, **satu-satunya** pemanggil `FiezelVoiceSay.prefetch()` di seluruh repo tetap Library:
`features/library/fiezel-library-ui.js:170` (di dalam `warmNext`, `:161-172`, dipanggil dari
loop narasi `:196`). Semua jalur di bawah ini masih membayar penuh ~4,5 detik per titik.

| # | Lokasi | Kalimat berikutnya sudah diketahui? | Catatan |
|---|---|---|---|
| 1 | `app.js:3735` `classroomSpeak()` — dipanggil dari `app.js:3791`, `app.js:3793`, `app.js:3794`, `app.js:3800` | Sebagian. `s.currentSegment()` ada, tetapi tidak ada **peek** segmen berikutnya; `s.nextSegment()` (`app.js:3794`) memindahkan kursor | Jalur pelajaran Classroom, urutan segmennya deterministik — ini kandidat terkuat sesudah Library. Perlu accessor peek di sesi Classroom (perubahan di luar berkas ini) |
| 2 | `features/tutor-classroom/fiezel-tutor-v3.js:543` (di `speak(pair)`, `:527-556`) | Ya, paket materi sudah dimuat penuh (`:97` `lesson.segments`) | Tidak ada satu pun kata `prefetch` di berkas ini. `voiceBusy` di `:527` sudah mencegah tumpang-suara, jadi prefetch aman ditambahkan sesudah `say()` diajukan |
| 3 | `features/speaking-listening/fiezel-speaking-listening-addon.js:336` (`TtsService.play`, `:335-341`) | Ya — `this.items[this.index + 1]` (lihat `current()` `:389` dan `renderSession()` `:390`) | Listening biasa. **Hati-hati**: pada `listening_exam` (`renderListeningExam` `:534`) prefetch naskah item yang belum tampil bisa membocorkan generasi; `fiezel-neural-voice.js` menolak dengan `superseded`, jadi token/supersession harus dijaga dulu (risiko yang sama dicatat audit §5 butir 4) |
| 4 | `app.js:4097-4113` `AudioService.play()` | Tergantung pemanggil | Pintu audio untuk Reading/Vocabulary/Grammar. Ia sendiri tidak tahu apa kalimat berikutnya; yang perlu memanggil prefetch adalah pemanggilnya (baris 5 dan 6 di bawah) |
| 5 | `app.js:4130` flashcards (`speakWord`/`speakSentence`, kartu digambar di `app.js:4126`) | Ya — `pool[i + 1].word` / `.example` sudah ada di memori | Murid hampir selalu menekan "Dengar" pada kartu berikutnya; menghangatkan satu kartu ke depan gratis secara UX |
| 6 | `app.js:4753` soal listening kuis (`audio.play(q.script, …)`) | Hanya pada saat `draw()`; soal berikutnya dipilih adaptif di `$('quizNext')` `app.js:4759` | Prefetch bisa diajukan sesudah audio soal sekarang mulai berbunyi, bukan saat `draw()` |
| 7 | `features/tutor-classroom/fiezel-tutor-voice-chat.js:57-66` `speak(reply)` | Tidak | Jawaban tutor lahir dari pertanyaan murid; tidak ada "kalimat berikutnya" untuk dihangatkan. **Tidak perlu prefetch** — dicatat supaya tidak dikejar sebagai celah |
| 8 | `features/library/fiezel-library-ui.js:552-555` `speakAnswer()` | Tidak | Sekali bunyi per pertanyaan. **Tidak perlu prefetch** |
| 9 | `app.js:3712` `testNeuralVoice()` | Tidak | Tombol tes satu kalimat. **Tidak perlu prefetch** |
| 10 | `app.js:3846` Skills Lab `tts.play` (adaptor ke addon) | Lihat #3 | Adaptor ini hanya meneruskan; prefetch-nya milik addon |

Catatan pola: `app.js:4568` `prefetchPlacementListening()` sudah memakai
`requestIdleCallback` untuk pekerjaan spekulatif bank listening. Pola yang sama (idle,
gagal-senyap, bukan prasyarat) adalah bentuk yang cocok untuk enam titik di atas.

---

## 4. Gerbang baru

`tests/voice-prefetch-neural-test.js` (node murni, tanpa dependency, pola `vm` + `sourceBlock`
seperti `tests/voice-fallback-chain-test.js`), terdaftar di
`.github/workflows/quality.yml:81`. **32 pass, 0 fail.** Ia menjalankan `prefetch()` yang
asli di dalam `vm`, bukan mencocokkan kata kunci, dan membuktikan:

- (a) jalur neural lokal TERCAPAI saat mesin prepared, dengan teks apa adanya;
- (b) `prepare()`/`ensureReady()`/`prewarm()` **tidak pernah** dipanggil — tiruannya
  MELEMPAR bila disentuh, diuji pada keadaan prepared, belum prepared, dan luring;
- (c) belum prepared → `false` dengan tenang, mesin neural tidak disentuh, dan pagar dibaca
  dari `status()`;
- (d) galat (async, sinkron, resolver gagal, semua modul absen, teks kosong) tidak pernah
  menjalar ke pemanggil;
- (e) deduplikasi kunci kanonik bekerja (termasuk beda spasi/huruf besar-kecil), tidak
  kebablasan untuk teks berbeda, dan slotnya dibebaskan setelah selesai;
- (f) batas konkurensi dihormati dan slotnya kembali (prefetch tidak mati sesudah dua
  kalimat);
- (g) urutan aset R2 → Puter → neural dipertahankan, dan lapisan atas yang berhasil
  menghentikan tangga.
- Penjaga statis tambahan: jalur prefetch tidak menyebut `prepare`/`ensureReady`/`prewarm`,
  memakai `localEngine()` alih-alih `FiezelVoiceRuntime` langsung, dan tidak menyentuh L4
  `speechSynthesis` maupun subtitle.

**Uji mutasi gerbang** (dilakukan, lalu dibalik): mengembalikan `prefetch()` ke versi HEAD
membuat 13 assert gagal; melonggarkan pagar dengan `ensureReady()` di `prefetchWithLocal`
membuat 4 assert gagal. Gerbangnya benar-benar mengikat, bukan hiasan.

## 5. Verifikasi

Semua exit 0:

`tests/voice-prefetch-neural-test.js` (32/0) · `tests/voice-fallback-chain-test.js` (45/0) ·
`tests/voice-offline-fallback-test.js` (14) · `tests/speaking-listening-test.js` (45/0) ·
`tests/listening-exam-test.js` · `tests/regression-test.js` · `tests/ui-structure-test.js` ·
`tests/install-health-test.js` · `tests/pwa-cache-test.js`.

`*-REPORT.json` yang sudah ada dikembalikan ke isi commit (hanya
`VOICE-PREFETCH-NEURAL-REPORT.json` yang baru, milik gerbang baru). Versi build tidak
dinaikkan.

## 6. Batas kejujuran

1. CPU sandbox ≠ ponsel. RTF terukur 0,876–0,888; **bila RTF > 1 di perangkat murah,
   pipelining satu kalimat ke depan tidak cukup** dan sisa jeda akan muncul kembali —
   jalan keluarnya potongan lebih pendek (klausa), bukan prefetch yang lebih agresif.
2. Sekali jalan per versi pintu, 6 kalimat. Selisih 5,7× jauh di atas varians, tetapi ini
   bukan statistik varians.
3. Resolver aset dan Puter tidak dipasang di harness (itu memang kasus kalimat tanpa aset).
   Di perangkat, `store.resolve()` dan percobaan Puter tetap berada di depan neural, dan
   audit §4/§6 sudah menandai keduanya sebagai biaya masuk yang belum terukur.
4. Jalur khusus Apple (worklet PCM, `appleHardChunkChars`, `withFastLeadIn`) mati di
   Chromium dan tetap belum teruji.
5. Angka ini hanya menutup usulan 1. Sisa ~797 ms adalah keheningan dalam berkas (usulan 2)
   dan waktu ke suara pertama 3,4 s (usulan 3/5) — keduanya di berkas yang sedang dikerjakan
   agen lain.
