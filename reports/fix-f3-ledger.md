# F3 — `tests/cf-shadow-ledger-test.js` merah sesudah merge: diagnosis, akar masalah, perbaikan

Cabang: `fix/f3ledger`. Tidak ada bump versi (`VERSION.json` tetap `5.19.0`), tidak ada push.

---

## 1. Gejala

```
FIEZEL cf-shadow-ledger gate: FAIL (harness melempar)
TypeError: Cannot read properties of undefined (reading 'match')
    at tests/cf-shadow-ledger-test.js:473:21
```

Baris 473 adalah assert `(e)`:

```js
check('(e) bentuk jawaban Puter vs CF dinilai COCOK padahal isinya beda jauh',
  eLedger.rows[0].match === 1 && eLedger.rows[0].diff === 0, ...);
```

`eLedger.rows[0]` `undefined` ⇒ harness tidak menghasilkan satu pun baris ledger.

## 2. Diagnosis dengan bukti

Hipotesis awal (ekstraksi blok bersentinel dari `app.js` gagal karena resolusi konflik besar
di `AI-TASK-TRANSPORT`/`renderAIResult` dan penyisipan blok `CF-KILLSWITCH`) **diverifikasi
dan TERBUKTI SALAH**. Ekstraksi sehat:

```
$ node -e "...indexOf('/* CF-TRANSPORT-BEGIN')..."
begin=229565 end=240055 len=577620   blocklen=10490
```

Sentinel di `app.js` hari ini: `CF-KILLSWITCH` 2070–2269, `CF-TRANSPORT` 2270–2405,
`AI-TASK-TRANSPORT` 5762–6025. Urutannya benar, potongannya utuh, `async function
coreWorkerExec(` ada di dalam potongan.

Reproduksi terinstrumentasi (harness minimal yang menirukan `makeTransport`, satu panggilan
`/api/ai/chat` dengan semua flag `shadow`):

```
ledger loaded?     object
killswitch present? undefined      <-- di sini rantainya putus
mode /api/ai/chat = off
fetch calls 0   puter 1
debug []
ledger summary {"observed":0, ..., "rows":[]}
```

**Titik putus yang PERSIS**: `cfEndpointMode()` di blok `CF-TRANSPORT` (app.js:2303) sekarang
berbunyi

```js
if(self.FiezelCfKillSwitch?.allows?.(key)!==true)return 'off';
```

Sejak paket kerja kill switch (`CF-KILLSWITCH-BEGIN/END`) masuk, izin lapis **server** adalah
gerbang WAJIB dan gagal ke arah MATI. Sandbox `makeTransport` di `tests/cf-shadow-ledger-test.js`
tidak pernah memasang `self.FiezelCfKillSwitch` ⇒ setiap mode jatuh ke `'off'` ⇒
`cfShadowProbe` tidak pernah dipanggil ⇒ `fetch` mock nol ⇒ `FiezelShadowLedger.observe()`
tidak pernah menulis ⇒ `rows` kosong ⇒ `rows[0].match` melempar `TypeError`.

Jadi rantainya: **bukan** ekstraksi blok, **bukan** modul ledger, **bukan** blok transport.
Yang basi adalah ASUMSI harness tentang prasyarat blok transport. Bukti pendukung: gerbang
saudara `tests/cf-shadow-mode-test.js` sudah diperbarui saat paket itu masuk
(`if (killSwitch) sandbox.FiezelCfKillSwitch = killSwitch;`, baris 138) — `tests/cf-shadow-ledger-test.js`
terlewat. Semua assert `(d)` juga sedang merah/lulus-kosong; `TypeError` di `(e)` hanya
kegagalan pertama yang berisik.

## 3. Perbaikan akar masalah (tidak ada assert yang dilemahkan)

Semua perubahan ada di `tests/cf-shadow-ledger-test.js`. `app.js` dan
`features/cf-shadow/fiezel-shadow-ledger.js` **tidak disentuh** — keduanya benar.

1. **Rantai izin yang nyata, bukan stub.** Harness sekarang memotong DUA blok dari `app.js`
   lewat sentinel eksplisit (`CF-KILLSWITCH`, `CF-TRANSPORT`) dan menjalankan keduanya
   sebagai satu skrip dalam urutan app.js. Izin server dibuka **tanpa satu pun permintaan
   jaringan**: cermin `sessionStorage` (`fiezel-cf-flags-mirror-v1`) yang masih segar diisi
   dengan bentuk jawaban Worker apa adanya (protokol `1.7`, enam flag yang dikenal), yang
   dibaca `cfConfigBootOnce()` → `status:'ok'`. Konsekuensinya `(e)` sekarang membuktikan
   bayangan mencatat lewat rantai gerbang yang SAMA dengan produksi (statis AND server),
   bukan lewat pintu belakang.
2. **Ekstraksi tahan bentuk.** `sliceBlock(source, name)` — sentinel eksplisit, nol nomor
   baris, nol regex atas bentuk kode di dalam blok. Isi blok boleh ditulis ulang sebebas apa
   pun; yang tidak boleh berubah hanya sepasang sentinelnya. Fungsinya murni (mengembalikan
   pesan galat, tidak melempar) supaya pagarnya sendiri bisa diuji.
3. **Kegagalan perakitan berbicara.** `gagalTotal()` mencatat assert merah, menulis
   `CF-SHADOW-LEDGER-REPORT.json`, mencetak kalimat yang menyebut sebab dan tempat
   memperbaikinya, lalu keluar 1. `barisPertama(summary, label)` menggantikan setiap
   `rows[0]` telanjang. `.catch()` terakhir juga mencatat assert merah dulu, jadi laporan
   JSON tidak pernah kosong saat merah.
4. **Assert `(e)` tetap apa adanya** (`match === 1 && diff === 0`) dan hijau: penilai
   kecocokan tetap membandingkan BENTUK, dan tetap menilai COCOK dua jawaban yang isinya
   beda jauh. Perilakunya tidak berubah; ia memang tidak pernah dijalankan sejak merge.

### Assert baru (pencegah kegagalan senyap yang sama)

Enam assert perakitan, di depan semua assert perilaku:

* `pagar ekstraksi: sentinel BEGIN hilang -> pesan jelas yang menyebut sentinelnya`
* `pagar ekstraksi: blok yang terpotong KOSONG ditolak, tidak dijalankan sebagai konteks hampa`
* `pagar ekstraksi: blok yang hanya berisi komentar juga dihitung KOSONG (nol kode = nol bukti)`
* `pagar ekstraksi: sentinel END yang mendahului BEGIN dikenali sebagai urutan rusak`
* `pagar ekstraksi: app.js hari ini LOLOS pagar yang sama (pagarnya bukan hiasan)`
* `pagar ledger: nol baris menghasilkan pesan yang menyebut rantai yang harus diperiksa`

plus tiga assert keadaan harness: `mode bayangan BENAR-BENAR aktif di harness (izin statis DAN
izin kill switch server lolos)`, `izin server datang dari cermin sessionStorage, bukan dari
permintaan jaringan`, dan pagar arah sebaliknya `tanpa izin lapis server, bayangan mati total
dan murid tetap dilayani Puter`.

Bukti pagar itu bekerja pada kegagalan sungguhan — sentinel `CF-TRANSPORT-BEGIN` di `app.js`
sengaja diganti nama sementara (`app.js` dipulihkan sesudahnya):

```
FAIL Blok transport bisa dipotong lewat sentinel CF-TRANSPORT-BEGIN/END — sentinel
     "/* CF-TRANSPORT-BEGIN" tidak ditemukan di app.js — blok CF-TRANSPORT hilang atau
     sentinelnya diubah
FIEZEL cf-shadow-ledger gate: FAIL (perakitan harness) — sentinel "/* CF-TRANSPORT-BEGIN" ...
(1 assert merah; ini kegagalan yang DIJELASKAN, bukan TypeError)
EXIT=1
```

## 4. Verifikasi

| gerbang | exit | hasil |
|---|---|---|
| `tests/cf-shadow-ledger-test.js` | 0 | PASS (94 assert; sebelumnya melempar) |
| `tests/cf-shadow-mode-test.js` | 0 | PASS (38 assert) |
| `tests/cf-transport-test.js` | 0 | PASS (25 assert) |
| `tests/cf-config-killswitch-test.js` | 0 | PASS (58 assert) |
| `tests/ai-transport-switch-test.js` | 0 | PASS (113 assert) |
| `tests/regression-test.js` | 0 | PASS |
| `tests/install-health-test.js` | 0 | PASS |
| `tests/observability-privacy-test.js` | 0 | PASS |

## 5. Jawaban jujur: apakah mode bayangan hari ini benar-benar mencatat?

**TIDAK. Di perangkat murid hari ini, mode bayangan tidak mencatat apa pun — dan itu memang
keadaan yang disengaja, bukan kerusakan.** Yang hijau adalah MEKANISMENYA, dijalankan atas
kode `app.js` yang sesungguhnya.

Dua lapis sakelar keduanya mati di repo:

* `core-config.js`: `FIEZEL_CF_CONFIG = { enabled:false, base:'', endpoints: semua 'off' }`.
  Satu nilai itu saja sudah membuat `cfEndpointMode()` selalu `'off'` ⇒ `cfShadowProbe()`
  tidak pernah berjalan ⇒ `FiezelShadowLedger.observe()` tidak pernah dipanggil di lapangan.
  Ledger di perangkat murid mana pun hari ini berisi `observed: 0`.
* Lapis server (`GET /api/config`) bahkan tidak ditembak: `cfConfigBootOnce()` keluar lewat
  `not_needed` selama tidak ada satu pun endpoint statis yang hidup.

Yang dibuktikan gerbang ini sesudah F3, dan yang TIDAK dibuktikannya:

* DIBUKTIKAN: begitu kedua lapis mengizinkan, satu panggilan `/api/ai/chat` menghasilkan
  tepat satu permintaan bayangan, jawaban murid tetap objek Puter, body Puter tidak pernah
  dihabiskan (perbandingan hanya lewat `clone()`), dan satu baris agregat masuk ledger dengan
  latensi kedua sisi sebagai angka serta nol PII. Semuanya di atas blok `CF-KILLSWITCH` +
  `CF-TRANSPORT` yang dipotong dari `app.js`, bukan salinan yang bisa basi.
* TIDAK DIBUKTIKAN: bahwa ada bukti bayangan yang benar-benar terkumpul dari perangkat nyata.
  Nol, karena rollout belum dimulai. Perbandingan Cloudflare vs Puter tanpa mengorbankan
  murid baru mulai punya data pada hari `endpoints.<key>` dinaikkan ke `'shadow'` **dan**
  Worker menjawab `cfApiEnabled:true` + flag endpointnya.

Pelajaran yang perlu dicatat untuk paket berikutnya: selama satu-satunya pemakai jalur
bayangan adalah gerbang, prasyarat baru di `app.js` (seperti izin kill switch) bisa mematikan
jalur itu tanpa ada yang merasa. Sejak F3, kegagalan seperti itu berhenti sebagai kalimat
yang menyebut rantainya, bukan sebagai `TypeError` di baris assert yang tidak bersalah.
