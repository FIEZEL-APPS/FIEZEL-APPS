# V6 - Pemanggil suara: menyambungkan prefetch dan teks utuh di sisi pemanggil

Cabang: `voice/vcallers` (basis `7e4b4a8`). Worktree `/home/user/workspace/wt-vcallers`.
Tidak ada bump versi build. Tidak ada push.

Empat agen sebelumnya memperbaiki MESINnya: `FiezelVoiceSay.prefetch()` benar-benar
menghangatkan mesin neural lokal, `planUtterance(text)` menerima teks utuh dan mengembalikan
potongan bertanda batas, pemutar memangkas keheningan dan menyambung antrean lintas
`speak()`. Yang belum dikerjakan: PEMANGGIL masih mengirim satu kalimat per panggilan dan
tidak pernah menghangatkan kalimat berikutnya. V6 mengerjakan itu.

Berkas mesin (`fiezel-voice-say.js`, `fiezel-web-audio-player.js`, `fiezel-prosody.js`,
`fiezel-neural-voice.js`) TIDAK disentuh - gerbang e2 yang menjaganya.

## 1. Yang berubah

| Berkas | Perubahan |
| --- | --- |
| `app.js` | `voicePrefetchGeneration`, `cancelVoicePrefetch()`, `prefetchNextVoice(next, options)` (tunda satu task + pagar generasi). `classroomSpeak(en, id, next)` menghangatkan segmen berikut lewat `classroomPeekNextText()`; `AudioService.play()` menerima `options.next`; `AudioService.prefetch()` baru; flashcards menghangatkan `pool[i+1]` (kata dan contoh); kuis listening menghangatkan soal listening berikutnya; adaptor tts skillsLab dapat `prefetch`/`stop`. |
| `features/classroom/fiezel-classroom.js` | `peekSegment()` murni - hanya di fase `teach`, tidak menggeser state. |
| `features/tutor-classroom/fiezel-tutor-v3.js` | `prefetchNextBeat()` menghangatkan beat berikutnya dari `session.snapshot().beatIndex + 1`; `stopVoice()` menaikkan generasi. |
| `features/speaking-listening/fiezel-speaking-listening-addon.js` | `TTSService.prefetch()`; `Controller.prefetchNextScript()` dengan daftar putih domain; `cancelPrefetch()` di `open`/`exit`/`destroy`. `renderListeningExam` sengaja tidak disentuh. |
| `features/library/fiezel-library-ui.js` | Narasi audiobook mengirim BLOK teks utuh satu kali lewat `planUtterance`, dengan anggaran blok bertangga; sorotan per kalimat digerakkan penanda batas dari `planUtterance`. |
| `voice-callsite-prefetch-test.js` | Gerbang baru, 57 pemeriksaan, node murni. |
| `.github/workflows/quality.yml` | Gerbang baru terdaftar setelah `voice-prefetch-neural-test.js`. |
| `voice-fallback-chain-test.js` | Sandbox `audioHarness`-nya perlu stub `cancelVoicePrefetch`/`prefetchNextVoice` karena ia menjalankan blok `AudioService` terisolasi dan `stop()` sekarang memanggil helper induk. |

Catatan jalur: berkas tutor ada di `features/tutor-classroom/fiezel-tutor-v3.js`, bukan
`features/tutor/...` seperti tertulis di mandat.

Dua pagar yang berlaku di semua titik:
- Prefetch selalu diajukan SETELAH `say()` dibuat tapi SEBELUM di-`await`, dan selalu
  ditunda satu task (`setTimeout 0`/idle). Kalau tidak, permintaan N+1 bisa merebut mesin
  single-flight sebelum N sampai - itu persis inversi antrean m025-47.
- Setiap jalur punya penghenti: `voicePrefetchGeneration` (app.js), `prefetchGeneration`
  (tutor-v3, addon), `narrationToken` + `highlightTimers` (library). Prefetch yang sudah
  berjalan tidak bisa berbunyi belakangan karena hasilnya hanya masuk cache, tidak pernah
  dijadwalkan ke pemutar.

## 2. Anti-kebocoran ujian

`prefetchNextScript()` memakai daftar putih, bukan daftar hitam:

```js
if (this.domain !== 'listening') return false;
```

Jadi `listening_exam`, `speaking_exam`, dan `speaking` tidak pernah menghangatkan item
berikutnya, dan `renderListeningExam` tidak memuat kata `prefetch` sama sekali. Alasannya
bukan performa: menghangatkan skrip ujian berikutnya berarti teks yang belum boleh dilihat
murid sudah lewat di jalur render/subtitle. Gerbang b1-b4 mengunci ini per domain, plus satu
pemeriksaan statis bahwa fungsi render ujian bersih.

## 3. Teks panjang: blok utuh, bukan satu kalimat satu panggilan

Narasi Library sekarang menyusun BLOK - kalimat-kalimat berurutan dalam satu bab - lalu
mengirim satu `speak({en: block.text, ...})`. `planUtterance` memotongnya sendiri (180-260
char per potongan) dan pemutar menyambungnya, jadi jeda di dalam blok adalah jeda prosodi
0,22 detik, bukan jeda mesin.

Sorotan per kalimat TIDAK dibuang. `scheduleBlockHighlight()` menghitung waktu tiap kalimat
dari offset karakternya di dalam blok, memakai laju bicara terukur 15,4 char/detik ditambah
jeda batas yang dilaporkan `planUtterance`. Ini estimasi, bukan sinyal dari mesin - mesin
tidak memancarkan waktu kata. Kalau nanti pemutar mengekspos posisi audio nyata, penjadwal
ini yang harus diganti. Terjemahan Indonesia untuk pita subtitle diambil dari pasangan
`{en,id}` yang sudah ada di `library-books-v1.json`, jadi jatah AI tidak tersentuh.

**Tidak ada fitur "baca passage" terpisah di app.js.** Pembaca teks panjang yang nyata hanya
dua: audiobook Library dan jalur skrip listening - dan jalur listening memang sudah mengirim
`item.script` utuh sejak awal. Jadi butir "pembacaan passage" di mandat tidak punya sasaran
selain kedua itu.

## 4. Pengukuran mesin nyata

Harness: `reports/voice-v6-data/harness-callers.html` + `measure_callers.py` (pola pemanggil)
dan `measure_blocks.py` (pola narasi Library). Mesin supertonic-3 lokal, teks uji sama dengan
V1/V5, boot 1,95 detik. Data mentah: `caller-measurements.json`, `block-measurements.json`.

Pola pemanggilan satu kalimat per panggilan - ini bentuk classroom, tutor, flashcards, kuis:

| Pola | Suara pertama | Jeda penjadwalan rata-rata | Jeda terdengar rata-rata | Rentang total | Porsi sunyi |
| --- | --- | --- | --- | --- | --- |
| Sebelum V6 (tanpa prefetch) | 3.407 ms | 3.750,6 ms | 4.519,1 ms | 39,32 s | 47,7% |
| Sesudah V6 (prefetch berikutnya) | 3.453 ms | **449,1 ms** | 1.147,5 ms | 23,16 s | 9,7% |

Jeda antar kalimat turun 8,4x dan hampir separuh sesi berhenti jadi keheningan. Suara pertama
tidak berubah, memang tidak seharusnya berubah - prefetch tidak mempercepat kalimat pertama.

Angka "jeda terdengar" adalah batas ATAS: ia menambahkan keheningan kepala/ekor PCM mentah
yang justru dipangkas pemutar di jalur tersambung. Jeda nyata di jalur tersambung mendekati
jeda prosodi 220 ms yang memang disengaja.

## 5. Satu percobaan yang GAGAL, dan kenapa itu penting

Versi pertama narasi Library mengirim blok besar (anggaran 900 char) sejak blok pertama.
Terukur:

| Pola | Suara pertama | Jeda penjadwalan rata-rata | Rentang total |
| --- | --- | --- | --- |
| Teks utuh, blok 900 char | **12.395 ms** | 220,0 ms | 22,31 s |

Jedanya memang jatuh ke 220 ms - tapi murid menatap layar bisu 12,4 detik setelah menekan
putar, karena potongan pembuka jadi 248 char dan generasinya sendiri butuh 12,39 detik. Itu
bukan perbaikan, itu memindahkan biaya ke tempat yang paling terasa.

Percobaan kedua - tangga tetap 80 -> 200 -> 440 -> 900 - juga ditolak oleh pengukuran: suara
pertama membaik jadi 3.705 ms, tapi batas pertama membayar 7.351 ms, karena blok 60 char cuma
memberi 3,2 detik penutup untuk generasi 9,7 detik.

Aritmetika yang menjelaskan keduanya, dari data yang sama: generasi ~0,056 detik/char
(RTF ~0,865), bicara ~0,065 detik/char (15,4 char/detik). Blok N menutupi generasi potongan
pembuka blok N+1 hanya jika

    panjang(potongan pembuka N+1) <= 1,15 x panjang(blok N)

Karena itu anggaran blok tumbuh proporsional terhadap blok sebelumnya (`RAMP_COVER_FACTOR =
1.15`, mulai dari `LEAD_BLOCK_CHARS = 80`) dan langsung melompat ke 900 begitu blok mencapai
224 char - titik di mana potongan mana pun (dibatasi 260 char oleh `planUtterance`) sudah
tertutup penuh.

Hasil terukur pada buku nyata (`library-books-v1.json`, 18 kalimat pertama):

| Pola | Panggilan say | Suara pertama | Jeda penjadwalan rata-rata | Jeda terdengar rata-rata | Porsi sunyi |
| --- | --- | --- | --- | --- | --- |
| Narasi V6 bertangga | 10 blok | **2.816,8 ms** | 560,6 ms | 1.286,0 ms | 12,6% |

Batas per blok: 1.286, 3, 208, 283, 18, 18, 2.496, 719, 14 ms. Tujuh dari sembilan batas
praktis nol.

**Yang harus dikatakan terang, bukan disembunyikan:** buku ini kalimatnya pendek (35-80
char), jadi anggaran bertangga tidak pernah cukup untuk menggabungkan dua kalimat, dan blok
tetap satu kalimat. Untuk buku semacam itu narasi V6 berperilaku seperti pola per-kalimat +
prefetch, bukan seperti pemutaran tersambung penuh. Itu bukan kelalaian, itu batas fisik
mesinnya: blok 50 char hanya menghasilkan ~3 detik audio, dan 3 detik tidak bisa menutupi
generasi apa pun yang lebih panjang dari 50-an char. Blok baru menyatu pada prosa
berkalimat panjang. Kalau yang diinginkan pemutaran tersambung penuh sejak kalimat pertama,
yang harus dibereskan bukan pemanggil lagi - melainkan mesinnya (RTF di bawah ~0,5, atau
mesin yang bisa streaming potongan sambil menghasilkan).

Kedua pilihan sudah ditimbang eksplisit: suara pertama 2,8 detik lebih penting daripada
menghapus 300 ms di batas kalimat kedua.

`guardHits` kosong di semua run - tidak ada `prepare()`, `ensureReady()`, atau `prewarm()`
yang tersentuh dari sisi pemanggil, jadi tidak ada risiko memicu unduhan model.

## 6. Gerbang baru: `voice-callsite-prefetch-test.js`

57 pemeriksaan, node murni, pola `sourceBlock`/`vm` repo, menulis
`VOICE-CALLSITE-PREFETCH-REPORT.json`. Ia bukan pencari kata `prefetch`:

- **(a)** Setiap titik V5 §3 diperiksa dengan pola spesifik pada blok fungsinya - termasuk
  URUTAN (`say()` dibuat dulu, prefetch diajukan, baru `await`), dan identitas item
  berikutnya (`pool[i+1]`, `beatIndex + 1`, `items[index + 1]`, `peekSegment()`).
- **(b)** `prefetchNextScript` dijalankan di `vm` terhadap controller palsu untuk KEEMPAT
  domain; hanya `listening` boleh menghangatkan.
- **(c)** `blockAt`/`nextBlockBudget` dijalankan di `vm` terhadap data buku nyata dan
  `FiezelProsody` nyata: dibuktikan `chunks.length > 1` pada contoh nyata, blok utuh membayar
  potongan lebih sedikit daripada per kalimat, blok pembuka tetap kecil, dan pertumbuhan
  anggaran tidak melewati batas penutup 1,15x.
- **(d)** `scheduleBlockHighlight` dijalankan nyata: satu timer per kalimat, urut naik, dan
  terjemahan dioper ke pita subtitle.
- **(e)** Tidak ada `prepare()`/`ensureReady()`/`prewarm()` baru di 12 fungsi jalur pemanggil,
  dan berkas mesin tidak berubah dari basis.

Bukti gerbangnya menggigit (mutasi, keduanya sudah dibalik): `pool[i+1]` -> `pool[i]`
menggagalkan a17; menghapus `this.prefetchNextScript();` menggagalkan a12.

## 7. Verifikasi

Semua exit 0:

`voice-callsite-prefetch-test.js` 57/0, `voice-prefetch-neural-test.js` 32/0,
`voice-pipeline-gap-test.js` 36/36, `voice-chunker-test.js` 11/11,
`voice-fallback-chain-test.js` 45/0, `voice-offline-fallback-test.js` 14,
`speaking-listening-test.js` 45/0, `listening-exam-test.js`, `tutor-brain-v3-test.js`,
`tutor-classroom-regression-test.js` 5/0, `tutor-reteach-card-test.js` 13/0,
`regression-test.js`, `ui-structure-test.js`, `install-health-test.js`, `a11y-test.js`.

Ditambah semua gerbang lain yang menyentuh berkas yang diubah:
`audio-asset-pipeline-test.js`, `back-nav-test.js`, `classroom-test.js`, `contrast-test.js`,
`diagnostic-scanner-test.js`, `experience-integration-test.js`, `gems-test.js`,
`library-integrity-test.js`, `m02542-experience-test.js`,
`neural-voice-m02592-puter-subtitle-test.js`, `puter-popup-once-test.js`,
`pwa-cache-test.js`, `search-feedback-test.js`, `speaking-exam-test.js`, `tours-test.js`.

`library-test.js` tidak ada di repo; gerbang Library yang relevan adalah
`library-integrity-test.js`.

`*-REPORT.json` selain milik gerbang baru sudah dipulihkan ke keadaan basis.

## 8. Yang masih terbuka

1. Waktu sorotan masih estimasi (15,4 char/detik + jeda batas), bukan posisi audio nyata.
   Pada blok panjang, kesalahan akumulasi mungkin terlihat. Perbaikan sebenarnya ada di
   pemutar, bukan di sini.
2. Pemutaran tersambung penuh untuk buku berkalimat pendek terhalang RTF mesin (~0,865),
   bukan oleh sisi pemanggil.
3. Metrik "jeda terdengar" di harness menghitung keheningan PCM mentah, jadi ia melebih-
   lebihkan jalur tersambung. Kalau angka yang lebih tepat dibutuhkan, harness perlu membaca
   audio hasil trim pemutar, bukan buffer mentah.
