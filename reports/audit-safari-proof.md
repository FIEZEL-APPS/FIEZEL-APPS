# Audit: kegagalan `m02526-product-neural-safari.yml` di b43152d

**Putusan: (b) FLAKE latensi/lingkungan runner.** Bukan regresi E1.

Lebih kuat dari itu: **premis tugas tidak akurat.** Commit `b43152d` tidak memuat perubahan E1
sama sekali, dan tidak satu pun berkas yang dimuat oleh harness proof ini berubah sejak
25 Agustus — dua hari sebelum semua commit yang disebut dalam riwayat sukses/gagal.

Repo: `/home/user/workspace/FIEZEL-APPS`, branch `main`, HEAD `b43152d`. Tidak ada commit,
push, atau perubahan kode produksi yang dilakukan. Berkas kerja yang saya tambahkan hanya
harness lokal (`m02526-probe.html`, `m02526-local-runner.mjs`, `m02526-repeat*.mjs`,
`m02526-pre-e1-runner.mjs`) — belum di-stage, silakan hapus.

---

## 1. E1 bukan di b43152d

`b43152d` hanya menyentuh 5 berkas, tidak satu pun berkas E1:

```
$ git show --stat b43152d
 .gitignore                                 |    1 +
 core-config.js                             |    2 +-   (FIEZEL_PAGE_BUILD m025-167 -> m025-168)
 features/neural-voice/fiezel-diag-panel.js |    2 +-   (DIAG_BUILD m025-167 -> m025-168)
 reading-bank.json                          | 4814 +++---
 sw.js                                      |    2 +-   (SW_REV bump)
```

E1 sesungguhnya adalah **`ec2b119`** ("perbaiki tiga bug suara produksi dan tambah gerbang
tangga suara", 2026-08-26 22:24 UTC), dua commit lebih awal:

```
$ git show --stat --format="" ec2b119
 .github/workflows/quality.yml                            |   1 +
 VOICE-FALLBACK-CHAIN-REPORT.json                         | 241 ++
 app.js                                                   |  72 +-
 features/neural-voice/fiezel-voice-say.js                | 109 +-
 features/speaking-listening/fiezel-speaking-listening-addon.js | 89 +-
 voice-fallback-chain-test.js                             | 510 ++
```

Rantai: `ec2b119` (E1, 22:24) → `2c60ab7` (m031 Worker CF, 23:10) → `b43152d` (00:06).

## 2. Harness proof tidak pernah memuat satu pun berkas E1

Probe page dibuat inline di workflow dan memuat **tepat tujuh** skrip
(`.github/workflows/m02526-product-neural-safari.yml:55-61`):

```
55: features/neural-voice/fiezel-neural-voice-config.js
56: features/neural-voice/fiezel-kokoro-adapter.js      <- 404, berkas ini tidak ada di repo
57: features/neural-voice/fiezel-voice-persona.js
58: features/neural-voice/fiezel-sherpa-vits-adapter.js
59: features/neural-voice/fiezel-neural-voice.js
60: features/neural-voice/fiezel-web-audio-player.js
61: features/neural-voice/fiezel-neural-voice-bootstrap.js
```

Tidak ada `fiezel-voice-say.js`. Tidak ada `fiezel-speaking-listening-addon.js`. Tidak ada
`app.js`. Probe juga **tidak** memuat `core-config.js` dan **tidak** mendaftarkan service
worker (`grep -c "core-config\|serviceWorker" m02526-probe.html` → `0`), jadi bump
`FIEZEL_PAGE_BUILD` dan `SW_REV` di b43152d pun tidak terlihat olehnya. Nama cache neural
adalah `fiezel-v${version}` (`features/neural-voice/fiezel-neural-voice-bootstrap.js:9`)
yang bersumber dari `window.FIEZEL_VERSION='5.19.0'` yang di-hardcode probe di
`m02526-product-neural-safari.yml:53` — bukan dari `SW_REV` atau `FIEZEL_PAGE_BUILD`.

Konsekuensinya: **b43152d juga inert terhadap workflow ini**, bukan hanya E1.

## 3. Diff kosong: kode yang diuji identik byte antara run SUKSES dan run GAGAL

`0bbb652` adalah commit terakhir sebelum E1, dan menurut riwayat yang kamu berikan ia **sukses**.

```
$ git diff --stat 0bbb652 b43152d -- <tujuh skrip probe di atas>
(kosong)
```

Diperluas ke seluruh direktori runtime + vendor engine:

```
$ git diff --stat ec2b119 b43152d -- features/neural-voice vendor/supertonic-3
 features/neural-voice/fiezel-diag-panel.js | 2 +-      <- tidak dimuat probe
```

Dan menyeluruh atas kedelapan commit yang relevan — jumlah berkas yang diubah yang
menyentuh apa pun yang dimuat probe, `vendor/supertonic-3`, atau workflow itu sendiri:

| commit | waktu (UTC) | hasil CI (riwayat kamu) | berkas probe-relevan yang diubah |
|---|---|---|---|
| c8eac1e | 08-26 17:05 | **gagal** | 0 |
| 6164edb | 08-26 18:35 | sukses | 0 |
| 5ee5ec3 | 08-26 18:46 | **gagal** | 0 |
| 6df6b3d | 08-26 19:21 | sukses | 0 |
| 0bbb652 | 08-26 20:58 | sukses | 0 |
| ec2b119 (E1) | 08-26 22:24 | — | 0 |
| 2c60ab7 | 08-26 23:10 | — | 0 |
| b43152d | 08-27 00:06 | **gagal** | 0 |

```
$ git log -1 --format='%h %ad %s' -- <tujuh skrip probe> vendor/supertonic-3 <workflow>
ee6eb7b 2026-08-25 13:42:52 +0000 Audio: aset vocabulary hasil produksi terkendali
```

Perubahan terakhir pada kode yang diuji terjadi **25 Agustus**. Sesudah itu workflow ini
bergantian sukses dan gagal di atas kode yang **identik byte**. Itu definisi flake.

## 4. Argumen struktural: `usedBrowserTts` dan `lastFallbackReason` tak terjangkau oleh E1

Probe memanggil `rt.speak(text,{allowFallback:false})`
(`m02526-product-neural-safari.yml:91`). Di dalam bootstrap:

- `features/neural-voice/fiezel-neural-voice-bootstrap.js:422` — `const allowFallback=options.allowFallback!==false;` → `false`
- `:424` — `if(!allowFallback)throw error;` → jalur kegagalan **melempar**, tidak pernah mencapai `browserSpeak` di `:425`
- `:427` — satu-satunya `browserSpeak` tanpa syarat juga di-gate `&&allowFallback`

Jadi satu-satunya cara `usedBrowserTts` bisa `true` atau `lastFallbackReason` bisa terisi
di probe adalah lewat `fiezel-neural-voice-bootstrap.js` sendiri — berkas yang **tidak
disentuh E1**. `browserSpeak` versi E1 hidup di `features/neural-voice/fiezel-voice-say.js:259`
(`speakWithBrowser`), di modul yang tidak pernah dimuat halaman probe.

Perlu dicatat juga bahwa deskripsi masalah menyebut "penjaga `prepared||ready` dilonggarkan".
Itu tidak terjadi. Penjaga tetap utuh dan tidak berubah di
`features/neural-voice/fiezel-voice-say.js:90`:

```js
if (!st || !(st.prepared || st.ready)) return null;
```

Yang diubah E1 hanyalah apa yang terjadi **sesudah** `null`: dulu `Promise.resolve(false)`,
sekarang `return speakWithBrowser(...)` (`fiezel-voice-say.js:226-233`). Mesin neural tetap
tidak bisa dinyalakan dari jalur gagal.

## 5. Eksekusi: 13/13 assertion LULUS di b43152d

Runner macOS/SafariDriver tidak ada di sandbox, jadi saya jalankan probe page yang
**identik** (disalin verbatim dari workflow) di Chromium via Playwright, dua kunjungan,
profil persisten yang sama seperti reload Safari. Engine 110MB tidak perlu diunduh — ia
sudah ter-vendor di repo (`vendor/supertonic-3`, 155MB).

Step "Verify vendored engine bytes" saya verifikasi lolos lokal — keempat sha256 yang
di-`grep` workflow cocok:

```
325adfe5...932fe  sherpa-onnx-wasm-main-tts.wasm    OK
6ded938a...0eaa3  sherpa-onnx-wasm-main-tts.js      OK
20cd86fa...db93d  vector_estimator.int8.onnx        OK
e923d60f...a6152  vocoder.int8.onnx                 OK
```

Hasil run pertama (b43152d, `reports/audit-safari-proof-evidence/m02526-run1.json` dan `m02526-run2.json`):

| field | run1 | run2 |
|---|---|---|
| success | true | true |
| engine | supertonic-3 | supertonic-3 |
| usedBrowserTts | **false** | **false** |
| plays[].provider | supertonic-3 ×3 | supertonic-3 ×3 |
| plays ms | first 5928 / warm-1 5967 / warm-2 **6756** | 5928 / 5898 / **6711** |
| circuitOpen | false | false |
| lastFallbackReason | **""** | "" |
| readyAfter | true | true |
| prepared / storage | true / cache | **true / cache** |
| prepareMs | 5930 | 1345 |
| engineTransferBytes | **158,897,832** | **0** |
| eventLoop maxTickDriftMs | 29 | 1 |

Blok assert workflow dijalankan apa adanya terhadap JSON ini:

```
PASS  .success==true
PASS  .usedBrowserTts==false                    (run1)
PASS  .usedBrowserTts==false                    (run2)
PASS  .engine=="supertonic-3"
PASS  (.plays|length)==3
PASS  [.plays[].provider]|all(.!="browser-speech-synthesis")
PASS  .circuitOpen==false and .lastFallbackReason=="" and .readyAfter==true
PASS  [warm ms]|all(.<7000)
PASS  [warm ms]|(max/min)<1.5
PASS  (.plays[0].ms)<15000
PASS  .prepared==true and .storage=="cache"     (run2)
PASS  .engineTransferBytes > 90000000           (run1)
PASS  .engineTransferBytes < 1000000            (run2)
```

Semua properti yang dituduhkan sebagai regresi — `usedBrowserTts`, provider,
`lastFallbackReason`, `circuitOpen`, `readyAfter` — **hijau di commit yang gagal**, dengan
margin absolut (bukan mendekati batas). Tidak ada apa pun yang bergerak ke arah browser TTS.

## 6. Assertion mana yang paling mungkin jadi penyebab

**`m02526-product-neural-safari.yml:172` — `[warm ms]|all(.<7000)`.** Ini satu-satunya
assertion yang berdiri di tepi jurang.

- Komentar workflow sendiri (`:165-174`) mencatat pengukuran runner: `first 6320ms, warm 6250/6281ms` terhadap plafon **7000ms** → sisa **11%**.
- Pengukuran lokal saya: warm-2 = **6756ms** → sisa **244ms, 3,5%**. Run kedua: 6711ms → sisa 289ms.

Plafon setipis itu di runner macOS bersama (tetangga bising, thermal throttling, jadwal CPU)
akan melewati batas secara acak. `max/min<1.5` (`:173`) lulus lega (rasio 1,132), jadi
degradasi relatif bukan penyebabnya — yang menggigit adalah plafon rata 7000ms.

Bukti bahwa nilai ini tidak dipengaruhi diff E1: angka `plays[].ms` sepenuhnya diproduksi
oleh `fiezel-sherpa-vits-adapter.js` + `fiezel-web-audio-player.js` +
`fiezel-neural-voice-bootstrap.js`, ketiganya identik byte antara `0bbb652` (sukses) dan
`b43152d` (gagal) — lihat §3. E1 tidak menyentuh satu baris pun dari jalur inferensi.

**Kandidat kedua: kegagalan `prepare()` karena Cache Storage runner.** Saya menabraknya
langsung. Menjalankan ulang harness yang **sama sekali identik** (tree b43152d yang sama,
probe yang sama, server yang sama, port yang sama) dua kali lagi memberi kegagalan total
di `prepare()`, tanpa satu baris kode berubah:

```
$ node m02526-repeat2.mjs   # dan m02526-repeat3.mjs
"engine": null, "plays": [], "success": false,
"errors": ["Offline voice storage failed: vendor/supertonic-3/sherpa-onnx-wasm-main-tts.wasm
           · Failed to execute 'put' on 'Cache': Cache.put() encountered a network error"]
```

Disk tetap 3,7-4,0 GB lega; bytes wasm identik (sha256 cocok); server menjawab HTTP 200
dengan panjang penuh 13.476.398 byte; tidak ada error di log server.
Jadi: **satu commit, satu tree, tiga eksekusi — lulus, gagal, gagal.** Kalau assertion
paling awal (`.success==true`, `:156`) yang jatuh di CI, ia jatuh di step yang sama
("Assert OWNER acceptance properties") dan dengan pesan yang sama seperti flake ini.
Ini persis mekanisme yang menghasilkan pola bergantian di §3.

*(Catatan jujur: kegagalan Cache.put ini spesifik sandbox/Chromium. Ia membuktikan harness
ini rapuh terhadap lingkungan, bukan membuktikan bahwa runner macOS gagal pada penyebab
yang sama. Tanpa log CI, penyebab pasti di runner tidak bisa saya pastikan — plafon 7000ms
adalah kandidat paling kuat berdasarkan margin terukur.)*

## 7. A/B ke induk: hasil tidak konklusif, tapi tidak diperlukan

Saya membuat worktree di `0bbb652` (pra-E1) dan menjalankan probe yang sama di port 8001.
Kedua kunjungan gagal dengan `Cache.put()` yang sama — bukti tidak terpakai, karena tree
b43152d pun mulai gagal serupa (§6). A/B empiris karenanya tidak konklusif di sandbox ini.

Itu tidak melemahkan putusan: A/B **tidak dibutuhkan**, karena `git diff` atas ketujuh
berkas yang dimuat probe antara `0bbb652` dan `b43152d` benar-benar **kosong** (§3). Dua
tree yang identik pada kode yang dieksekusi tidak bisa berperilaku berbeda karena E1.

## 8. Gerbang E1 sendiri hijau

```
$ node voice-fallback-chain-test.js
FIEZEL tangga suara: PASS (45 pass, 0 fail)
```

Termasuk assert eksplisit `voice-say: mesin neural yang BERHASIL tidak diikuti suara
peramban dua kali` — yaitu invarian "browser TTS tidak menyalip jalur neural yang sehat"
sudah dijaga oleh gerbang E1 sendiri.

---

## Rekomendasi

Karena putusan adalah (b), tidak ada patch produksi yang diusulkan. Tujuan E1 (murid baru
tidak boleh senyap total) tetap aman dan tidak perlu diubah.

Yang layak diperbaiki adalah **workflow-nya**, bukan kode suara:

1. **Ganti plafon rata 7000ms dengan ambang yang tidak setipis 3,5%.** Assertion
   `max/min<1.5` di `:173` sudah menangkap degradasi nyata secara relatif; plafon absolut
   di `:172` sekarang berfungsi terutama sebagai generator flake. Pilihan: naikkan ke
   ~9000ms, atau ubah menjadi median dari 3 warm run, atau jadikan warning (bukan hard
   fail) sambil mempertahankan `max/min`.
2. **Jangan gabungkan properti korektif dengan properti performa dalam satu step.** Step
   `Assert OWNER acceptance properties` (`:151`) mencampur invarian yang tidak boleh gagal
   (`usedBrowserTts`, provider, `lastFallbackReason`) dengan pengukuran latensi yang
   memang berisik. Pisahkan jadi dua step supaya log langsung menunjukkan kelas kegagalan
   dan flake performa tidak menyamarkan regresi korektif.
3. **Perbaiki 404 di `:56`.** `features/neural-voice/fiezel-kokoro-adapter.js` tidak ada di
   repo; probe memuatnya setiap run dan Safari mencatat error. Tidak berdampak pada
   assertion, tapi ia menambah noise pada setiap investigasi.
4. **Kalau harness E1 memang ingin diuji**, workflow ini bukan tempatnya — ia sama sekali
   tidak memuat `fiezel-voice-say.js`, `app.js`, atau addon listening. Gerbang node
   `voice-fallback-chain-test.js` (sudah terdaftar di `quality.yml`) adalah gerbang E1.

### Satu risiko produksi yang tetap layak diawasi (di luar lingkup kegagalan ini)

`features/neural-voice/fiezel-voice-say.js:230` — `if (done === false) return speakWithBrowser(...)`.
Di perangkat yang neural-nya **sehat tetapi lambat**, `local.speak()` yang resolve `false`
karena timeout generasi kini menjatuhkan murid ke speechSynthesis, sedangkan sebelum E1 ia
diam. Ini sesuai tujuan E1 dan tidak memengaruhi workflow Safari ini, tapi kalau nanti ada
laporan "suaranya berubah jadi suara robot iOS di tengah sesi", inilah barisnya. Tidak saya
usulkan diubah sekarang — tanpa telemetri lapangan itu akan jadi perbaikan spekulatif.

---

## Berkas bukti

Semua di `/home/user/workspace/reports/audit-safari-proof-evidence/`:

| berkas | isi |
|---|---|
| `m02526-run1.json`, `m02526-run2.json` | hasil probe di b43152d — 13/13 assertion lulus |
| `rep2-out.txt`, `rep3-out.txt` | dua rerun tree identik yang GAGAL — bukti nondeterminisme |
| `pre-e1-run1.json` | run worktree pra-E1 (inkonklusif, `Cache.put()`) |
| `m02526-probe.html` | probe page verbatim dari workflow |
| `m02526-local-runner.mjs` | driver Playwright/Chromium |
