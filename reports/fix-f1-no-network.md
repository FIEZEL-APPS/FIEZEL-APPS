# F1 — `tests/no-network-test.js` merah setelah merge: mock TTS yang tak dikenali pemindai

Cabang: `fix/f1net` · pohon kerja: `wt-f1net` · tanpa push, tanpa bump versi.

## 1. Gejala

```
Tak ada `fetch` global asli yang disuntikkan ke konteks vm => FAIL
  tests/tts-transport-switch-test.js:84  menyuntik `fetch` tanpa mock lokal yang mendahului
  tests/tts-transport-switch-test.js:201 menyuntik `fetch` tanpa mock lokal yang mendahului
```

## 2. Aturan pemindai — apa yang SEBENARNYA dipakai (bukan tebakan)

`tests/no-network-test.js` memotong komentar lebih dulu (`stripComments`), lalu untuk setiap
penyuntikan `fetch` ke konteks `vm` menerapkan empat aturan berurutan di `analyzeSource()`:

| # | Bentuk | Putusan |
|---|--------|---------|
| (a) | `fetch: <fungsi inline>` (`async url => …`, `function(){…}`, `(…) =>`) | AMAN — fungsi baru, mustahil jadi fetch global |
| (b) | `fetch: globalThis.fetch` / `global.fetch` | BOCOR (`vmFetchLeak`) |
| (c) | `fetch: <pengenal lain>` | AMAN **hanya bila** deklarasi `const/let/var <pengenal> =` atau `function <pengenal>(` ada pada indeks karakter **lebih kecil** dari indeks penyuntikan |
| (d) | shorthand `{…, fetch, …}` atau `fetch: fetch` | AMAN hanya bila ada definisi mock bernama `fetch` (`const fetch=` / `function fetch(` / `globalThis.fetch=`) yang mendahului secara posisi; kalau tidak + berkas memakai `vm` → `vmFetchLeak` |

Tambahan: mock apa pun yang memuat `globalThis.fetch(` / `global.fetch(` dihukum sebagai
`mockDelegatesToReal` (kebocoran berkedok mock), dan `fetch(` ke URL literal non-loopback
dihukum sebagai `literalRemoteFetch`.

Detektor penyuntikan mengenali dua bentuk saja: `vmInjectionShorthand`
(`/[{,]\s*fetch\s*(?=[,}])/`) dan `vmInjectionExplicit` (`/\bfetch\s*:\s*/`).

## 3. Diagnosis: AMAN — bukan kebocoran nyata, tetapi juga bukan salah pemindai saja

Dua baris yang dilaporkan (84 dan 201 pada sumber **setelah komentar dipotong**) berkorespondensi
dengan baris 130 dan 247 pada sumber asli, dan **tidak satu pun adalah penyuntikan**:

* `trace.push('fetch:' + String(url))` — label jejak
* `idx(on.trace, 'fetch:')` — pencarian label jejak yang sama

Literal `'fetch:'` cocok dengan `vmInjectionExplicit`, sisi kanannya bukan fungsi/pengenal,
sehingga jatuh ke aturan (d) dan dihukum.

Penyuntikan yang SESUNGGUHNYA ada di `sandbox` berbentuk **metode shorthand**
(`fetch(url, init) { … }`) — bentuk yang tidak dikenali kedua regex penyuntikan, jadi
justru lolos tanpa pemeriksaan. Mocknya sendiri terverifikasi aman: ia hanya menyusun
`{status, json}` sintetis dari `opts`, tidak pernah menyentuh `globalThis.fetch`, dan modul
produksi `features/neural-voice/fiezel-cf-tts-transport.js` hanya pernah memanggilnya
untuk satu alamat (`base() + RENDER_PATH`).

Kesimpulan: **tidak ada kebocoran jaringan**. Yang salah adalah bentuk penulisan di sisi
gerbang TTS — pesan lokasinya menyesatkan, dan bentuk metode shorthand membuat penyuntikan
tak terperiksa. Keduanya diperbaiki di sisi TTS. `tests/no-network-test.js` **tidak disentuh sama
sekali** (lihat `git diff --stat`): melemahkan aturan (d) akan membebaskan pula gerbang lain
yang benar-benar menyuntikkan `fetch` global.

## 4. Perbaikan di `tests/tts-transport-switch-test.js`

1. Mock jaringan didefinisikan **eksplisit dan bernama** sebelum `sandbox`:
   `function cfTtsRenderFetchMock(url, init)`, disuntikkan sebagai `fetch: cfTtsRenderFetchMock`
   → memenuhi aturan (c) pemindai (deklarasi mendahului penyuntikan secara posisi).
2. Mock **MELEMPAR** untuk URL apa pun di luar `RENDER_URL` (`https://api.fiezel.my.id/api/tts/render`),
   dan URL asing itu juga dicatat di `unexpectedFetchUrls` agar lemparannya tidak bisa
   ditelan `try/catch` jalur render produksi.
3. Label jejak `'fetch:'` → `'fetch-mock:'` (dan `idx(...)` mengikutinya): jejaknya kini
   menyebut apa yang sebenarnya dipanggil, dan tidak lagi menyamai pola penyuntikan.
4. `CF_BASE + '/api/tts/render'` yang tersebar diganti konstanta `RENDER_URL` (nilai identik).

### Kekuatan uji: naik, bukan turun

| | sebelum | sesudah |
|---|---|---|
| assert | 31 pass / 0 fail | **33 pass / 0 fail** |

Tidak ada assert yang dihapus atau dilonggarkan; kondisi (a)–(g) dan seluruh penjaga statis
tetap identik kata per kata. Dua assert **baru**:

* `penjaga: mock fetch lokal MELEMPAR untuk URL di luar endpoint render (kebocoran tidak bisa senyap)`
* `penjaga: sepanjang gerbang ini, mock fetch lokal hanya pernah dipanggil untuk endpoint render CF`

Skenario yang diminta tetap teruji dan hijau: **429** (jatuh ke lapisan berikutnya, naskah
advisory tanpa lock/replay, satu permintaan per sesi, varian bisu yang jujur), **cache hit**
(URL R2 langsung, jembatan PHP ditolak, C0 hangat nol permintaan), **flag off** (nol sentuhan
CF, tangga aset → Puter → speechSynthesis utuh, prefetch juga bersih).

## 5. Bukti pemindai masih bisa merah

Berkas sementara `tmp-f1net-probe-test.js` disuntik empat pola berbahaya satu per satu, lalu
dihapus. Setiap probe membuat `tests/no-network-test.js` **exit 1**:

| Probe | Pola | Exit | Assert yang merah |
|---|---|---|---|
| vm-inject-global-fetch | `const ctx={console,fetch}` + `vm.createContext` | **1** | Tak ada `fetch` global asli yang disuntikkan ke konteks vm — `tmp-f1net-probe-test.js:1 menyuntik `fetch` tanpa mock lokal yang mendahului` |
| vm-inject-explicit-globalThis | `fetch: globalThis.fetch` | **1** | idem — `menyuntik globalThis.fetch…` |
| literal-remote-fetch | `await fetch('https://api.fiezel.my.id/api/tts/render')` | **1** | Tak ada fetch( ke URL literal non-loopback |
| mock-delegates-to-real | `const fetch=async u=>globalThis.fetch(u)` lalu disuntikkan | **1** | Tak ada mock `fetch` yang meneruskan ke fetch global |

Sesudah berkas probe dihapus: `tests/no-network-test.js` exit **0** (36 assert, 144 gerbang dipindai).

## 6. Catatan jujur — celah yang TIDAK ditutup di paket ini

Bentuk penyuntikan **metode shorthand** (`fetch(url, init) { … }` sebagai properti objek
sandbox) masih tidak dikenali `tests/no-network-test.js`. Sesudah perbaikan ini, satu berkas lain
masih memakainya: `tests/audio-asset-pipeline-test.js`. Memperlebar detektor ke bentuk itu akan
memerahkan berkas tersebut sekaligus, jadi ia tidak diselundupkan ke paket F1 — dicatat di
sini sebagai tindak lanjut, bukan disembunyikan. Lapis 3 (`tools/no-net-preload.js` via
`NODE_OPTIONS`) tetap BELUM dipasang, sesuai laporan gerbang itu sendiri.

## 7. Verifikasi

| Gerbang | Exit | Catatan |
|---|---|---|
| `tests/no-network-test.js` | 0 | PASS, 36 assert, 144 gerbang dipindai |
| `tests/tts-transport-switch-test.js` | 0 | PASS, 33 pass / 0 fail |
| `tests/cf-live-contract-test.js` | 0 | SKIP bersih (tanpa `FIEZEL_CF_LIVE_BASE`) |
| `tests/staging-live-test.js` | 0 | SKIP bersih (tanpa `FIEZEL_STAGING_BASE`) |
| `tests/regression-test.js` | 0 | PASS |
| `tests/install-health-test.js` | 0 | PASS |

Berkas yang berubah: `tests/tts-transport-switch-test.js`, plus dua `*-REPORT.json` milik gerbang
yang diperbaiki (`NO-NETWORK-REPORT.json`, `TTS-TRANSPORT-SWITCH-REPORT.json`). Tidak ada
`*-REPORT.json` lain yang berubah; `VERSION.json` tidak disentuh.
