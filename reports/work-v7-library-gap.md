# V7 - jeda narasi Library: dari 603,6 ms ke 533,5 ms tanpa menunda suara pertama

Cabang `work/v7lib`. Wilayah yang disentuh HANYA `features/library/fiezel-library-ui.js` dan
`voice-callsite-prefetch-test.js`, ditambah data pengukuran baru di `reports/voice-v7-data/`.
Tidak ada satu berkas pun di `features/neural-voice/` yang diubah. Tidak ada push, tidak ada
bump versi build.

---

## 1. Yang ditemukan sebelum menyentuh apa pun

Tugasnya "perhalus jeda". Yang saya temukan lebih buruk daripada jeda: **aturan anggaran blok V6
tidak pernah benar-benar menaikkan tangganya pada buku nyata**, dan komentarnya sendiri
menyatakan sebaliknya.

`nextBlockBudget()` versi V6:

```js
if (previousChars >= RAMP_SETTLED_CHARS) return BLOCK_MAX_CHARS;   // 224 -> 900
return Math.max(LEAD_BLOCK_CHARS, Math.round(previousChars * RAMP_COVER_FACTOR)); // 80, 1.15x
```

Anggaran dihitung dari `previousChars`, yaitu panjang blok yang **benar-benar dihasilkan**. Blok
hanya boleh pecah di batas kalimat, jadi panjang yang dihasilkan selalu **lebih kecil atau sama
dengan** anggarannya. Akibatnya barisan itu punya titik tetap di sekitar 80 char dan tidak pernah
sampai 224, apalagi 900. Pada "The Three Little Pigs" (32 kalimat) anggaran V6 menghasilkan blok:

```
47, 71, 57, 64, 67, 52, 35, 78, 75, 80, 60, 65, 66, 72, 35, 49, 46, 34, 50, 44
```

Dua puluh blok untuk 32 kalimat, rata-rata 57 char. Itu praktis narasi per kalimat sepanjang
buku - persis pola yang paket V6 diklaim menggantikan. Klaim "blok bertangga sampai 900 char"
tidak pernah terjadi di produksi.

Dan `Math.max(LEAD_BLOCK_CHARS, ...)` bukan cuma tidak berguna, ia yang **membuat lubangnya**.
Lantai 80 memaksa blok berikutnya lebih panjang daripada yang bisa ditutup audio blok sekarang:

| batas | blok sebelumnya | tutupan jujur | dipaksa lantai | jeda penjadwalan terukur |
|---|---|---|---|---|
| 1 -> 2 | 47 char | 54 char | 80 char | **1.615,2 ms** |
| 7 -> 8 | 35 char | 40 char | 80 char | **2.508,3 ms** |
| batas lain (tertutup) | - | - | - | 11,6 - 393,6 ms |

Tujuh dari sembilan batas hampir gratis. Dua batas yang dipaksa lantai menyumbang 4,1 detik dari
5,43 detik total senyap penjadwalan. Jadi "jeda narasi Library" bukan masalah rata-rata, itu
**dua lubang di tempat tertentu**, dan penyebabnya satu baris `Math.max`.

### Fisika yang mengikat, diukur bukan dikarang

Dari `reports/voice-v6-data/block-measurements.json`:

- generasi: 36.494 ms / 626 char = **0,0583 s per char**
- audio PCM: 41,86 s / 626 char = **0,0669 s per char** (sudah termasuk senyap kepala/ekor)
- rasio tutupan 0,0669 / 0,0583 = **1,147x**

Artinya blok berikutnya boleh maksimal ~1,15x panjang blok sekarang kalau generasinya harus
selesai sebelum audio sekarang habis. Model jedanya:

```
jeda_i ~ max(0, GEN * chars_i - SPEAK * chars_(i-1)) + biaya serah-terima
```

Diuji ke data V6 nyata: model memprediksi 1,10 s dan 2,33 s di dua batas mahal; harness mengukur
1,29 s dan 2,50 s. Selisihnya adalah biaya serah-terima tetap, yang juga terukur konsisten
**~450-650 ms per batas** (jeda di batas yang tutupannya penuh tidak pernah nol).

Dua konsekuensi yang harus jujur disebut:

1. Karena blok hanya bisa tumbuh 1,15x sementara granularitasnya adalah **kalimat**, menambah
   satu kalimat pendek (20-45 char) ke blok kecil selalu melompati tutupan. Untuk buku
   berkalimat pendek, blok multi-kalimat **tidak bisa dicapai tanpa membayar satu lubang**. Ini
   batas fisik, bukan bug yang bisa dirapikan di sisi pemanggil.
2. Biaya serah-terima ~530 ms per batas berarti **memperbanyak blok memperburuk yang didengar
   murid**, walaupun rata-rata jedanya turun. Ini yang membuat "rata-rata jeda" sendirian
   menyesatkan, dan saya menabraknya langsung di eksperimen di bawah.

---

## 2. Yang dikerjakan

### 2a. Anggaran blok adaptif dari tutupan terukur, tanpa lantai

`features/library/fiezel-library-ui.js`:

```js
var GEN_S_PER_CHAR = 0.0583;
var SPEAK_S_PER_CHAR = 0.0669;
var BOUNDARY_SLACK_S = 0.80;
var RAMP_SETTLED_CHARS = 226;
function nextBlockBudget(previousChars) {
  var prev = Math.max(0, Number(previousChars) || 0);
  var coverSeconds = prev * SPEAK_S_PER_CHAR + BOUNDARY_SLACK_S;
  var budget = Math.round(coverSeconds / GEN_S_PER_CHAR);
  if (budget >= RAMP_SETTLED_CHARS) return BLOCK_MAX_CHARS;
  return Math.min(BLOCK_MAX_CHARS, budget);
}
```

Anggaran sekarang dihitung dari **tutupan yang benar-benar tersedia**, bukan dari pengali tetap.
Kelonggaran 0,80 s adalah satu-satunya angka yang boleh melebihi tutupan, dan harganya diukur:
satu batas yang dihilangkan menghemat ~530 ms senyap penjadwalan ditambah senyap tepi satu
render (~250-535 ms per sisi, `headSilenceMs`/`tailSilenceMs`). Jadi membayar sampai 0,80 s
generasi tak tertutup untuk menghapus satu batas masih untung; di atas itu tidak.

**Lantai minimum dihapus sama sekali.** Percobaan pertama saya masih memakai lantai (70 char,
lebih rendah daripada 80 milik V6) dan gerbang yang saya tulis sendiri menangkapnya: sesudah
blok 31 char, lantai 70 menjanjikan generasi **1.774 ms** di luar tutupan. Itu cacat kelas yang
sama dengan cacat V6, cuma lebih kecil. Saya tidak menaikkan atap gerbangnya supaya lolos; saya
membuang lantainya.

### 2b. Pagar urutan, karena blok besar menaikkan risiko inversi

Blok lebih besar berarti prefetch lebih sering benar-benar terpakai, dan itu menaikkan risiko
yang jauh lebih buruk daripada jeda: blok N+1 berbunyi mendahului N (inversi antrean m025-47).
Sekarang **semua** teks narasi lewat satu pintu:

```js
var dispatchedThrough = -1;
var dispatchRejects = { stopped: 0, order: 0, replay: 0, prefetchLate: 0 };
function dispatchBlock(block, token) {
  if (!narrating || token !== narrationToken) { dispatchRejects.stopped++; return null; }
  if (!block || !block.text) { dispatchRejects.order++; return null; }
  if (block.from <= dispatchedThrough) { dispatchRejects.replay++; return null; }
  if (block.from !== dispatchedThrough + 1) { dispatchRejects.order++; return null; }
  dispatchedThrough = block.to;
  return speak(...);
}
```

- `narrate()` tidak lagi memanggil `speak()` langsung; kalau pintu menolak, ia berhenti dan
  membersihkan timer sorotan.
- `stopNarration()` mereset kursor kirim; `narrate()` menyetelnya dari posisi kalimat murid, jadi
  memutar ulang dari tengah buku tidak ditolak sebagai replay.
- `warmNext()` menolak menghangatkan blok yang sudah **di belakang** kursor kirim - prefetch yang
  terlambat hanya akan mengisi satu-satunya slot hangat mesin dengan teks yang salah.
- `narrationDiagnostics()` mengekspos `dispatchedThrough`, keempat penghitung penolakan, dan
  `orderViolations` supaya harness bisa memeriksanya, bukan cuma percaya.

Harness memverifikasi ini di peramban nyata: `guardHits` **kosong di 18 dari 18 sesi pengukuran**
untuk semua aturan yang diuji.

---

## 3. Angka SESUDAH, dengan metrik yang diberi nama

Harness yang sama dengan V6 (`reports/voice-v6-data/measure_callers.py` + `harness-callers.html`),
dipanggil lewat `reports/voice-v7-data/measure_v7.py`, 18 kalimat pertama
`library-books-v1.json`, TTS lokal `vendor/supertonic-3/`. Data mentah:
`reports/voice-v7-data/block-measurements-v7.json`, `-v7b.json`, `-v7c.json`. Ringkasan:
`python3 reports/voice-v7-data/aggregate_v7.py`.

| aturan | ulangan | blok | suara pertama | **jeda penjadwalan** | **jeda terdengar** | jeda terdengar TERBURUK | span | **porsi sunyi** | total senyap penjadwalan |
|---|---|---|---|---|---|---|---|---|---|
| aturan V6 terkirim | 7 | 10 | 2.677,7 ms | 603,6 ms | 1.318,8 ms | 3.203,7 ms | 40,43 s | 13,44% | 5,43 s |
| lantai 70 + 0,30 s | 4 | 10 | 2.635,8 ms | 531,8 ms | 1.290,0 ms | 2.145,5 ms | 39,75 s | 12,04% | 4,79 s |
| tutupan murni 0,30 s | 2 | 18 | 2.717,8 ms | **497,4 ms** | 1.087,4 ms | 2.810,2 ms | 41,69 s | **20,30%** | 8,46 s |
| **tanpa lantai + 0,80 s (TERKIRIM)** | 5 | 9 | **2.659,5 ms** | **533,5 ms** | 1.278,6 ms | **2.072,2 ms** | **39,67 s** | **10,76%** | **4,27 s** |

Konfigurasi yang benar-benar akan terkirim ke murid adalah baris terakhir: tanpa lantai,
kelonggaran 0,80 s, 9 blok.

Perubahan terhadap garis dasar yang saya ukur sendiri di sesi peramban yang sama:

- jeda penjadwalan **603,6 -> 533,5 ms (-11,6%)**
- porsi sunyi **13,44% -> 10,76% (-20,0%)**
- jeda terdengar TERBURUK **3.203,7 -> 2.072,2 ms (-35,3%)** - ini perbaikan terbesarnya
- total senyap penjadwalan **5,43 -> 4,27 s (-21,4%)**
- suara pertama **2.677,7 -> 2.659,5 ms (-18,2 ms)**, di dalam derau. **Tidak ada penundaan
  suara pertama yang dibeli untuk perbaikan ini.**

### Pertukaran yang harus dilihat, bukan diklaim

Baris "tutupan murni 0,30 s" adalah bukti paling penting di tabel itu, dan ia bukti yang
melawan saya: aturan itu **menjamin setiap batas tertutup** dan mencatat rata-rata jeda
penjadwalan terbaik (497,4 ms), tetapi **porsi sunyi yang didengar murid melonjak ke 20,3%** dan
span totalnya paling panjang. Sebabnya 18 blok x biaya serah-terima ~500 ms. Rata-rata jeda bisa
diperbaiki cuma dengan memperbanyak batas sambil membuat pengalaman lebih buruk. Karena itu
aturan yang dipilih **bukan** yang rata-ratanya paling kecil, tapi yang **total senyapnya** paling
kecil. Kalau ada laporan yang mengklaim perbaikan berdasarkan rata-rata jeda saja, tabel ini
adalah alasan untuk tidak mempercayainya.

### Beda dengan angka yang saya diberi, dilaporkan sebagai temuan

Saya diberi angka produksi Library 560,6 ms / 12,6% sunyi. `block-measurements.json` memang
mencatat itu (560,6 / terdengar 1.286,0 / sunyi 0,126 / suara pertama 2.816,8). Tapi
**mesin ini hari ini mengukur aturan V6 yang sama di 603,6 ms / 13,44% (7 ulangan)**. Derau beban
mesin per batas mencapai +-500 ms, jadi:

- ambang "di bawah 560,6 ms" **tidak bisa dipakai sebagai lulus/gagal** di mesin ini - aturan V6
  sendiri gagal ambang itu di sini;
- yang sah hanya perbandingan berpasangan **di dalam sesi peramban yang sama**, dan itulah yang
  ada di tabel di atas. Angka 533,5 ms kebetulan juga di bawah 560,6 ms, tapi saya tidak
  memakainya sebagai bukti - buktinya adalah -11,6% terhadap garis dasar yang diukur bersamaan.

### Yang belum selesai, jujur

Batas yang masih mahal di aturan terkirim (rata-rata 5 ulangan): 41->60 char **1.378,6 ms**,
60->70 char 938,2 ms, 70->88 char 1.097,6 ms. Ketiganya adalah kelonggaran yang sengaja dibeli
plus biaya serah-terima. Anggaran blok di sisi pemanggil sudah mendekati batas fisiknya: dengan
rasio tutupan 1,147x, satu slot hangat, dan tanpa overlap, tidak ada aturan aritmetika di sisi
pemanggil yang bisa menutup ketiga batas ini sekaligus tanpa memperbanyak blok - dan memperbanyak
blok sudah terbukti lebih buruk. Sisa perbaikannya ada di mesin, bagian 5.

---

## 4. Gerbang baru dan matriks merah/hijau

`voice-callsite-prefetch-test.js`: **68 assert, semua hijau**. Sebelas assert baru (c9, c10,
f1-f9). Bagian (f) tidak membaca sumber, ia **menjalankan** `dispatchBlock`, `warmNext`, dan
`resetDispatchCursor` di dalam `vm` dengan data buku nyata.

Setiap assert baru dibuktikan bisa merah lewat mutasi terarah pada kode produksi, lalu berkasnya
dipulihkan. Skrip: `reports/voice-v7-data/red-green-matrix.sh`, keluaran tersimpan di
`reports/voice-v7-data/red-green-matrix.txt`.

| assert | mutasi | yang gagal | hasil |
|---|---|---|---|
| c9 | kelonggaran dinaikkan ke 1,20 s | c9 | merah sesuai harapan |
| c10 | anggaran dipaku di blok pembuka (tangga mati) | c9, c10 | merah sesuai harapan |
| f1 | kursor kirim maju ke `block.from`, bukan `.to` | f1 | merah sesuai harapan |
| f2 | penjaga lompatan urutan dihapus | f2 | merah sesuai harapan |
| f3 | penjaga replay dihapus | f3 | merah sesuai harapan |
| f4 | penjaga penghenti dihapus | f4, f5 | merah sesuai harapan |
| f5 | penjaga penghenti dihapus (token lama lolos) | f4, f5 | merah sesuai harapan |
| f6 | penjaga prefetch-terlambat dihapus | f6 | merah sesuai harapan |
| f7 | prefetch menganggur tidak cek token lagi | f7 | merah sesuai harapan |
| f8 | `narrate()` memanggil `speak()` langsung | f8 | merah sesuai harapan |
| f9 | `stopNarration` tidak mereset kursor kirim | f9 | merah sesuai harapan |

Sesudah pemulihan: 68 pass, 0 fail.

Isi assertnya:

- **c9** - utang generasi tak tertutup di tiap batas, dihitung dari blok yang benar-benar
  dihasilkan pada buku nyata. Atap: kelonggaran yang dideklarasikan <= 800 ms, lubang terbesar
  <= 1.000 ms, total <= 90% total aturan V6. Angka sekarang: **lubang terbesar 852 ms, total
  3.813 ms**; aturan V6: **lubang terbesar 2.206 ms, total 4.356 ms**. Yang mengikat adalah
  lubang terbesar; gerbang totalnya di 90% memang lemah dan saya sebut lemah - total bisa turun
  sambil satu lubang 2,4 detik tetap ada, dan lubang itulah yang didengar murid.
- **c10** - tangga anggaran harus benar-benar melewati blok pembuka pada buku nyata, dan narasi
  tidak boleh merosot jadi satu kalimat per blok (<= 70% jumlah kalimat). Gerbang inilah yang
  tidak ada di V6, dan ketiadaannya yang membuat cacat V6 lolos bertahun paket.
- **f1-f3** - urutan: tiga blok berurutan terkirim berurutan dan kursor maju ke `block.to`; blok
  yang melompat ditolak; blok yang sudah dikirim ditolak sebagai replay.
- **f4-f5** - penghenti: `narrating=false` (murid menekan jeda) dan token kedaluwarsa (murid
  pindah halaman) sama-sama membuat blok berikutnya tidak berbunyi.
- **f6-f7** - prefetch tidak pernah berbunyi belakangan: blok di belakang kursor ditolak
  sementara blok di depan tetap dihangatkan, dan pengajuan prefetch yang masih menganggur mati
  begitu penghenti ditekan.
- **f8-f9** - tidak ada jalan pintas: `narrate()` tidak punya jalur `speak()` selain lewat
  `dispatchBlock`, dan kursor kirim disetel ulang di kedua tempat produksi.

### Verifikasi (semua exit 0)

| gerbang | hasil |
|---|---|
| `voice-callsite-prefetch-test.js` | PASS (68 pass, 0 fail) |
| `voice-fallback-chain-test.js` | PASS (45 pass, 0 fail) |
| `voice-pipeline-gap-test.js` | PASS (36/36) |
| `library-integrity-test.js` | PASS |
| `no-network-test.js` | PASS (39 assert, 168 gerbang dipindai) |
| `regression-test.js` | PASS |
| `install-health-test.js` | PASS |
| `gate-registry-test.js` | PASS (10 pass, 0 fail) |
| `coordination-guard-test.js` | PASS (24/24) |
| `ui-structure-test.js` | PASS |

`library-test.js` **tidak ada** di repo ini; yang ada `library-integrity-test.js` dan itu yang
dijalankan.

---

## 5. Rekomendasi untuk `features/neural-voice/` - TIDAK dikerjakan, dan alasannya

`coordination/CLAIMS.json` mencatat `features/neural-voice/` diklaim sesi lain
(`ses_0027db319ffeiu7OrUF1qbWBH8`, executor-1, T-026 diagnostik PCM crackle). Tidak satu berkas
pun di sana saya ubah. Empat dari ide yang disarankan di tugas ini **tidak bisa dikerjakan dari
sisi pemanggil sama sekali**, dan alasannya bukan selera - alasannya kode:

1. **Prefetch dua blok ke depan: mustahil dari pemanggil.**
   `features/neural-voice/fiezel-neural-voice.js:461` - `let warmed = null;`. Mesin punya
   **satu** slot hangat. Memanggil `prefetch()` untuk blok N+2 hanya membuang blok N+1 yang sudah
   hangat. Perbaikannya: jadikan slot hangat sebuah peta ber-kunci teks (atau antrean pendek
   dengan batas) sehingga dua blok bisa hangat sekaligus. Sesudah itu barulah `warmNext()` di
   sisi pemanggil layak diperluas untuk mengajukan dua blok.

2. **Blok besar tidak bisa diprefetch sama sekali.**
   `fiezel-neural-voice.js:485` - `if (chunks.length !== 1) return false;` di dalam `prefetch()`.
   Blok yang lebih panjang daripada satu potongan (CHUNK_CHARS max 260 di `fiezel-prosody.js`)
   **ditolak diam-diam**. Jadi begitu tangga anggaran naik melewati ~260 char, batas blok
   kehilangan seluruh tutupannya. Ini yang membatasi manfaat pekerjaan V7 ini di buku panjang.
   Perbaikannya: hangatkan potongan PERTAMA saja untuk teks multi-potongan - itu sudah cukup,
   karena yang harus siap tepat waktu memang hanya potongan pertama.

3. **Overlap terkendali: mustahil dari pemanggil.**
   `fiezel-neural-voice.js:544` - `const callGeneration = ++generation;` diikuti pemeriksaan
   `if (callGeneration !== generation) throw new Error('TTS request superseded')`. `speak()`
   kedua yang dimulai sebelum yang pertama selesai **membunuh** yang pertama. Jadi "mulai blok
   N+1 sebelum N benar-benar habis" tidak bisa dicoba dari `fiezel-library-ui.js` tanpa memutus
   audio yang sedang berbunyi. Perbaikannya ada di mesin: generation counter harus per-suara/
   per-antrean, bukan global tunggal.

4. **Memangkas keheningan di batas blok: ada di mesin, bukan di pemanggil.** Ini yang paling
   besar nilainya. Bukti angkanya ada di tabel bagian 3: jeda **penjadwalan** 533,5 ms tetapi
   jeda **terdengar** 1.278,6 ms. Selisih ~745 ms per batas adalah senyap kepala+ekor PCM yang
   tidak dipangkas.
   - `fiezel-neural-voice.js:735` - `const joined = chunks.length > 1;` lalu
     `{ continuous: joined && chunkIndex > 0, gapMs, trim: joined, ... }`. Untuk ucapan
     satu-potongan (yaitu hampir semua blok Library), `trim` **false** dan `continuous`
     **false**. Senyap tepinya dibiarkan utuh di kedua sisi setiap batas blok.
     Perbaikannya: pangkas tepi juga untuk ucapan satu-potongan ketika ia adalah lanjutan
     lintas-panggilan.
   - `fiezel-neural-voice.js:763` - `if (typeof playAudio === 'function') await drainScheduled(0, requestId, voice);`
     di akhir `speak()`. `say()` baru selesai sesudah SELURUH audio habis diputar, jadi timeline
     pemutar selalu kosong di batas blok. Akibatnya `timelineJoinable()` di
     `fiezel-web-audio-player.js:816` (menuntut `pipelineCursor > contextTime + CROSS_CALL_JOIN_MIN_LEAD_S`)
     **tidak pernah bisa benar** antar blok, sehingga penyambungan tanpa senyap yang sudah ada
     di pemutar itu mati di jalur Library. Perbaikannya: selesaikan `speak()` ketika audio
     terakhir sudah **terjadwal**, bukan sesudah selesai berbunyi, atau sediakan opsi
     `resolveOnScheduled` untuk pemanggil yang berantai.

5. **Pemanggil tidak bisa mengatur ukuran potongan.** `fiezel-prosody.js` mengekspos
   `planUtterance(text, {max, target})`, tapi `fiezel-neural-voice.js` memakai `planChunks`
   internalnya sendiri. Kalau ukuran potongan bisa disetel per panggilan, sisi pemanggil bisa
   menyelaraskan batas blok dengan batas potongan dan menghapus satu sumber senyap tepi tanpa
   menyentuh mesin lagi.

Estimasi jujur: nomor 4 sendirian bernilai ~700 ms per batas pada jeda yang **terdengar** - lebih
besar daripada seluruh perbaikan V7 ini. Pekerjaan sisi pemanggil sudah hampir habis; sisanya
milik pemilik wilayah `features/neural-voice/`.

## 6. Catatan koordinasi

- Sesi ini tidak punya entri di `coordination/CLAIMS.json`, dan `coordination/` sendiri diklaim
  MASTER, jadi saya tidak menambahkan klaim sendiri. Kalau protokolnya menuntut setiap wilayah
  kerja punya klaim, entri untuk `features/library/fiezel-library-ui.js` +
  `voice-callsite-prefetch-test.js` perlu ditambahkan oleh pemilik `coordination/`.
- Playwright di lingkungan ini butuh `executable_path` eksplisit ke
  `chromium_headless_shell-1217`; `measure_v7.py` sudah memakainya. Tanpa itu harness gagal boot,
  bukan gagal ukur.

## Berkas

- diubah: `features/library/fiezel-library-ui.js`, `voice-callsite-prefetch-test.js`
- baru: `reports/voice-v7-data/measure_v7.py`, `aggregate_v7.py`, `red-green-matrix.sh`,
  `red-green-matrix.txt`, `block-measurements-v7.json`, `block-measurements-v7b.json`,
  `block-measurements-v7c.json`, `reports/work-v7-library-gap.md`
- tidak disentuh: seluruh `features/neural-voice/`, `coordination/`, versi build
