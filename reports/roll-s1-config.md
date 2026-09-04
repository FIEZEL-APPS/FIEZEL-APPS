# S1 — Kill switch server (branch `roll/s1cfg`)

**Ringkasan satu paragraf.** Sampai commit ini, klien FIEZEL tidak pernah membaca
`GET /api/config`, jadi kill switch yang disebut di runbook dan di komentar `core-config.js`
hanya benar untuk sisi server. Sekarang klien membacanya, dan membacanya dengan arah yang
benar: hasil akhir = **AND** dari flag statis dan flag server, sehingga server hanya bisa
**MEMATIKAN** dan tidak bisa menyalakan apa pun yang di `FIEZEL_CF_CONFIG` bernilai `off`.
Lima keadaan berbeda — belum dijawab, tak terjangkau, HTTP bukan 2xx, timeout, `protocol`
bukan `1.7` — menghasilkan satu keputusan yang sama: seluruh jalur CF mati dan aplikasi
berjalan lewat jalur Puter hari ini. Nol dampak murid hari ini dan **nol permintaan
tambahan**: selama tidak ada satu pun endpoint statis yang `'on'`/`'shadow'`, tidak ada apa
pun yang bisa dimatikan, dan pengambil sengaja tidak menembak server sama sekali.

## Yang berubah (5 berkas + 1 gerbang baru)

| Berkas | Perubahan |
|---|---|
| `core-config.js` | Blok BARU `self.FIEZEL_CF_REMOTE` (`path`, `protocol:'1.7'`, `timeoutMs:2500`, `mirrorTtlMs:300000`, `mirrorMinTtlMs:30000`, `mirrorKey`), `Object.freeze`. `FIEZEL_CF_CONFIG` **tidak disentuh** — masih `enabled:false`, `base:''`, ketujuh endpoint `'off'`. |
| `app.js` | Blok BARU `CF-KILLSWITCH-BEGIN/END` (±200 baris, tepat di depan blok transport): pengambil `GET /api/config`, penggabungan AND, cermin `sessionStorage` 5 menit, snapshot untuk panel, `self.FiezelCfKillSwitch`. |
| `app.js` (transport) | `cfEndpointMode()` kini meminta izin lapis server: `if(self.FiezelCfKillSwitch?.allows?.(key)!==true)return 'off'`. Tiga baris; sisa blok transport utuh. |
| `features/neural-voice/fiezel-diag-panel.js` | Field `cfKillSwitch` di `collectSync()`, membaca `FiezelCfKillSwitch.snapshot()` (bukan memparse ulang). |
| `cf-shadow-mode-test.js` | Harness menyuntikkan stub kill switch permisif + DUA assert baru: tanpa stub, jalur CF mati (fail-closed); izin `false` mematikan endpoint statis `'on'`. 36 → **38 assert**. |
| `cf-config-killswitch-test.js` | **BARU** — 58 assert, node murni (`vm` + mock `fetch`), menjalankan blok kill switch **dan** blok transport bersama-sama. |
| `.github/workflows/quality.yml` | `node cf-config-killswitch-test.js` sesudah `cf-shadow-mode-test.js`. |

Tidak ada bump invarian build: `FIEZEL_PAGE_BUILD`/`DIAG_BUILD`/`SW_REV` tetap `m025-172`
(di-assert oleh gerbang baru). Tidak ada berkas baru di `features/`, jadi tidak ada
perubahan `index.html`/daftar precache `sw.js` — satu alasan lagi kenapa kode ini dipasang
sebagai blok di `app.js`: berkas baru berarti entri precache baru berarti `SW_REV` baru,
padahal paket ini justru mengobati penyakit "harus naik SW_REV dulu". `*-REPORT.json` yang
tersentuh gerbang (`CF-TRANSPORT`, `CF-WIRING`, `NO-NETWORK`, `SETTINGS-CACHE`) sudah
di-restore; `CF-CONFIG-KILLSWITCH-REPORT.json` TIDAK di-commit (artefak regenerable, sama
perlakuannya dengan `CF-SHADOW-MODE-REPORT.json`).

## 1. Penggabungan AND — dan kenapa ketidaksimetrisannya disengaja

```
statis 'off' + server on   -> off      (server TIDAK BISA menyalakan)
statis 'on'  + server off  -> off      (server BISA mematikan)
statis 'on'  + server on   -> on
statis 'shadow' + server on -> shadow  (server tidak bisa MENAIKKAN mode)
```

Keputusan "hidup" butuh DUA suara; keputusan "mati" cukup satu. Ini bukan kerapian: satu
Worker yang disusupi — atau satu nilai `cfg:flags` di KV yang salah ketik oleh owner pada
jam paling buruk — tidak boleh bisa menyalakan jalur AI/TTS/kuota di perangkat murid. Flag
statis yang `off` tetap butuh rilis untuk dibalik (dan itu memang lambat); yang `on` bisa
dimatikan server dalam hitungan menit. Kedua arah itu memang tidak setara.

Yang **fail-closed**, bukan warisan:
- flag yang tidak dikirim server = MATI (bukan "pakai nilai statis");
- nilai non-boolean (`'true'`, `1`, `'on'`) = MATI — flag yang ambigu tidak boleh berarti hidup;
- `cfApiEnabled` adalah sakelar induk server: `false` mematikan ketujuh endpoint sekaligus;
- `self.FiezelCfKillSwitch` hilang dari bundel = jalur CF MATI (`!==true`, bukan `===false`).
  Jalur CF yang hidup tanpa pengawas server adalah persis keadaan yang paket ini menghapus.

Peta flag→endpoint: `cfIdentityEnabled`→auth, `cfQuotaEnabled`→quota, `cfAiEnabled`→ai
(termasuk `/api/coach/*`), `cfTtsEnabled`→tts, `cfAnalyticsEnabled`→usage. `health` dan
`config` tidak punya flag sendiri: keduanya diatur `cfApiEnabled` saja. Lapis kedua server
`enabled:{ai,tts,coach,analytics}` ikut dihormati dan **hanya bisa mematikan**: kunci yang
tidak dikirim = tidak berpendapat (daftar `flags` yang otoritatif), kunci `false` = mati.

## 2. Memori + cermin 5 menit di `sessionStorage` (bukan localStorage)

Keadaan hidup di memori, jadi navigasi antar layar tidak menembak server sama sekali —
di-assert dengan 13 panggilan transport berturut-turut yang menghasilkan nol permintaan
`/api/config`. Cermin hanya menutup celah reload/relaunch PWA: `sessionStorage`, satu kunci
(`fiezel-cf-flags-mirror-v1`), isi `{v,at,ttl,data}`.

Batas umurnya **5 menit, dipaksa di klien di dua tempat**: saat menulis (server yang mengaku
`ttlSeconds: 86400` tetap dipangkas ke 300000) dan saat membaca (cermin yang membawa `ttl`
karangan satu hari tetap dianggap kedaluwarsa pada 5 menit). Kalau server mengirim
`ttlSeconds` lebih pendek (produksi: 60 s), cermin ikut lebih pendek — dengan lantai 30 s
supaya reload berulang tidak jadi badai permintaan. `localStorage` tidak disentuh sama
sekali: kill switch yang bertahan berhari-hari di perangkat adalah kill switch yang bisa
diabaikan murid hanya dengan tidak menutup tabnya. Sepuluh skenario gerbang menghitung
panggilan `localStorage.setItem`/`removeItem` = **0**.

Jam mundur (`at` di masa depan) juga membuang cermin, bukan memperpanjangnya.

## 3. `protocol:'1.7'` — mismatch = SELURUH CF mati

`protocol` yang bukan `1.7` (`1.6`, `1.8`, `2.0`, kosong) menghasilkan
`status:'protocol_mismatch'` dan ketujuh endpoint mati **walau keenam flag bernilai true** —
diuji dengan menjalankan tujuh path pada empat nilai protokol berbeda, bukan dengan membaca
kode. Nilai yang diharapkan dibaca dari `core-config.js`, tidak ditulis ulang di `app.js`.
Keputusan mismatch itu ikut dicerminkan sebentar: mencegah setiap reload menembak server
yang sudah dipastikan tidak cocok.

Tiga pemeriksaan protokol yang sudah ada (`policy_protocol_mismatch`, health
`protocol_mismatch`, `coach_protocol_mismatch`) tidak disentuh.

## 4. Kapan pengambil jalan — DIUKUR, bukan diasumsikan

**Keputusan: tidak menunggu sentuhan pengguna, tetapi juga tidak di jalur kritis.** Pengambil
dijadwalkan `requestIdleCallback(run,{timeout:3000})` (fallback `setTimeout(run,1500)`)
setelah layar pertama tercat, tidak pernah di-`await` oleh `load()` maupun siapa pun.

Angka yang mendasari keputusan (dari `CF-CONFIG-KILLSWITCH-REPORT.json`, mesin ini):

| Yang diukur | Hasil |
|---|---|
| Permintaan jaringan pada saat blok selesai dievaluasi (= boot) | **0** (hanya 1 tugas idle terjadwal) |
| Kelanjutan boot selesai sesudah idle dipicu | **2 ms** |
| Jawaban `/api/config` tiba (mock dilambatkan 300 ms) | **302 ms** — jadi boot selesai ~150× lebih dulu |
| Evaluasi blok kill switch (parse+exec, min dari 20 kali) | **0,078 ms** (12,7 KB sumber) |
| Server menggantung, `timeoutMs:40` | dibatalkan pada **41 ms**, hasil `unreachable`, aplikasi tetap jalan |
| Keadaan repo hari ini (semua statis `off`) | **0 permintaan, 0 tugas terjadwal** (`status:'not_needed'`) |

Kenapa BUKAN "tunggu sentuhan pengguna": kill switch yang baru dibaca setelah murid menyentuh
sesuatu tiba terlambat justru pada kasus yang paling ingin dihentikan — layar pertama yang
langsung memanggil AI/TTS. Kenapa BUKAN di jalur kritis: satu permintaan jaringan di depan
`load()` adalah cara paling mudah menukar satu masalah biaya dengan satu masalah layar
kosong. Idle callback membeli keduanya, dan biayanya nol hari ini.

Jendela ketidakpastian (boot → jawaban tiba) berjalan dengan `status:'idle'` ⇒ seluruh jalur
CF mati ⇒ trafik ke Puter. Arah yang aman, dan di-assert.

**Yang TIDAK diukur:** waktu bulat-bulat `GET https://api.fiezel.my.id/api/config` dari
jaringan nyata. Menembaknya butuh header `X-Fiezel-Edge` (staging) dan tidak boleh ditulis ke
repo/laporan/perintah tersimpan, sementara di produksi paket ini hari ini tidak melakukan
satu pun permintaan (semua flag statis `off`). Jadi angka RTT itu baru relevan pada hari
endpoint pertama dinyalakan, dan harus diukur di sana — dicatat sebagai utang, bukan diklaim
selesai.

## 5. Panel diagnostik

`collectSync()` di `features/neural-voice/fiezel-diag-panel.js` kini punya field
`cfKillSwitch` yang memanggil `FiezelCfKillSwitch.snapshot()`. Isinya empat hal yang owner
butuh dalam satu tampilan: `statis` (enabled, base terpasang, tujuh mode), `server` (status,
sumber `server|mirror`, protokol vs protokol yang diharapkan, keenam flag, `enabled`, alasan
kegagalan), `gabungan` (tujuh mode yang BENAR-BENAR dipakai transport), dan
`terakhirDiambil`/`umurMs` + keadaan cermin. Tanpa modul termuat, jawabannya kalimat
(`'(kill switch CF belum dimuat)'`), bukan galat.

Snapshot tidak membawa alamat server, token, atau nilai rahasia apa pun — dump panel ini
ditempel ke chat, jadi itu syarat, bukan selera. Di-assert.

## 6. Gerbang `cf-config-killswitch-test.js` (58 assert, PASS)

Node murni, nol dependency, nol jaringan (`fetchMock` lokal — pola yang dikenali
`no-network-test.js`, 120 gerbang dipindai, PASS). Ia memotong **kedua** blok dari `app.js`
lewat sentinel dan menjalankannya bersama di `vm`, dengan `requestIdleCallback` yang DIREKAM
(bukan dijalankan) supaya (g) bisa dibuktikan.

- **(a) server tidak bisa menyalakan:** flag statis NYATA dari repo + server `status:'ok'`
  dengan keenam flag `true` ⇒ ketujuh mode gabungan `off`, tujuh path dilayani Puter, nol
  permintaan data ke CF. Ditambah tiga bentuk lain: `enabled:false` statis, satu endpoint
  `off` di tengah tetangga `on`, dan `'shadow'` yang tidak bisa dinaikkan ke `'on'`.
- **(b) server bisa mematikan:** `cfAiEnabled:false` mematikan ai sementara tts tetap hidup
  (presisi, bukan pemadaman total); `cfApiEnabled:false` mematikan ketujuhnya;
  `enabled:{tts:false,coach:false}` mematikan tts+ai; flag hilang = mati; nilai ambigu = mati.
- **(c) tak terjangkau:** jaringan mati, HTTP 500 (body tidak dipercaya), timeout, JSON rusak,
  dan keadaan "belum dijawab" — semuanya CF mati + ketujuh path tetap dilayani Puter, dan
  pengambil tidak pernah `reject` (jadi boot mustahil gagal karenanya).
- **(d) protokol:** empat nilai salah × tujuh path.
- **(e) cermin:** ditulis dengan cap waktu + TTL ≤ 5 menit; umur 4 menit ⇒ nol permintaan
  (plus 13 panggilan transport tetap nol); umur 5 menit 1 detik ⇒ dibuang lalu ditembak ulang
  sekali; `ttlSeconds:86400` dipangkas; `ttl` karangan di cermin dipangkas saat dibaca.
- **(f) localStorage:** nol tulisan di sepuluh skenario, hanya satu kunci `sessionStorage`,
  dan `app.js` tidak menulis flag CF ke localStorage di tempat lain.
- **(g) boot:** tidak ada `await` pengambil di seluruh `app.js`; `load()` tidak menyebutnya;
  penjadwalan idle; nol permintaan saat blok selesai dievaluasi; boot 2 ms vs config 302 ms;
  `cfConfigBootOnce()` idempoten; dua refresh serentak = satu permintaan.
- **Anti-vakum:** jalur "hidup" dibuktikan benar-benar hidup (statis `on` + server `on` ⇒
  jawaban dari CF, nol Puter), dan permintaan `/api/config` diperiksa bentuknya
  (`GET`, `cache:'no-store'`, `credentials:'omit'`, alamat = `base + path`). Tanpa itu,
  (a)–(d) hanya menguji ruang kosong.

## 7. Verifikasi (semua exit 0, dijalankan lokal)

`cf-config-killswitch-test` (58 PASS) · `cf-transport-test` (25 PASS) ·
`cf-shadow-mode-test` (38 PASS) · `boot-order-test` · `core-brain-test` · `pwa-cache-test` ·
`sw-corp-test` · `regression-test` · `ui-structure-test` · `install-health-test` ·
`diag-panel-test`.
Tetangga yang ikut diperiksa karena bisa terkena: `no-network-test`, `cf-wiring-test`,
`cf-api-contract-test`, `release-audit-gate-test` (0 blocker), `observability-privacy-test`,
`remote-push-test`, `core-brain-v2-test`, `http-smoke-test`, `pwa-release-coherence-test`,
`analytics-privacy-test`, `settings-cache-test`, `onboarding-test`, `a11y-test`,
`validator.js`.

## 8. Yang MASIH belum ada (jangan dibaca sebagai selesai)

- **Belum diuji terhadap Worker nyata.** Seluruh 58 assert memakai `fetch` mock. Bahwa
  jawaban produksi benar-benar berbentuk `{protocol,flags,enabled,limits,ttlSeconds}` dengan
  `Cache-Control: no-store` sudah dijaga di sisi Worker (`workers/api/route-config.js`,
  `cf-api-contract-test`), tetapi kontrak ujung-ke-ujung klien↔Worker belum pernah dijalankan
  sekali pun. Itu pekerjaan sesi staging (`STAGING-INFO.md`), dan HARUS dilakukan sebelum
  endpoint pertama dinyalakan.
- **CORS belum dibuktikan.** `GET /api/config` dikirim `mode:'cors'` `credentials:'omit'` dari
  origin aplikasi. Kalau Worker tidak mengirim `Access-Control-Allow-Origin` untuk origin itu,
  hasilnya `unreachable` — arah yang aman, tetapi juga berarti kill switch **tidak berfungsi**
  tanpa ada yang menyadarinya. Perlu satu assert sisi Worker/staging.
- **Tidak ada penyegaran ulang saat tab kembali terlihat.** Cermin 5 menit berarti tab yang
  dibiarkan terbuka berjam-jam memakai keadaan memori yang tidak pernah disegarkan; kill
  switch baru terbaca pada reload berikutnya. Menambah `visibilitychange` + refresh ber-debounce
  adalah langkah berikutnya yang jelas, tetapi ia menambah permintaan periodik dan sebaiknya
  diputuskan bersama anggaran plan gratis, bukan diselipkan di sini.
- **Belum ada jalur "matikan tombolnya", hanya "matikan transportnya".** `enabled:{ai,tts,...}`
  dari server dipakai untuk mematikan jalur CF, bukan untuk menyembunyikan tombol AI/TTS di
  UI. Selama semua endpoint `off`, itu tidak berbeda; begitu ai `on`, UX kuota (cf-b8) harus
  ikut membaca snapshot ini.
- Utang W1 yang belum tersentuh dan masih berlaku: pra-syarat keras SDK Puter di
  `askFiezelAI`, kontrak dry-run `X-Fiezel-Shadow` yang belum diuji di sisi Worker, dan
  keputusan origin tunggal untuk cookie `credentials:'include'`.
