# F7 — assert `server-flag-wins` dirancang ulang jadi presedensi DUA ARAH

Branch `main`, worktree `master`. Tidak ada push, tidak ada bump versi build
(`FIEZEL_PAGE_BUILD` tetap `m025-172`). Bukti mentah: `reports/fix-f7-data/e2e-before-21of22.json`
(sebelum) dan `reports/fix-f7-data/e2e-after.json` (sesudah), keduanya sudah diredaksi
(lihat §7).

**Hasil E2E terhadap `https://api.fiezel.my.id`: 21/22 sebelum → 24/24 sesudah.**
Jumlah assert naik dari 22 ke 24 karena satu assert lama dipecah jadi tiga.

---

## 1. Masalahnya adalah desain assert, bukan cacat produk

Assert lama `server-flag-wins` menuntut jawaban `/api/config` memuat flag server yang
**SEMUANYA false**, supaya bisa dibuktikan bahwa kill switch server mengalahkan konfigurasi
statis klien yang "on". Premis itu tidak bisa dipenuhi bersamaan dengan premis 12 assert
lain di putaran yang sama, karena KV `cfg:flags` sekarang sengaja memuat
`cfApiEnabled/cfIdentityEnabled/cfQuotaEnabled = true` untuk tahap rollout R2–R3. Tanpa flag
itu true, assert auth/quota/cookie tidak bisa diuji sama sekali. Satu putaran gerbang tidak
boleh menuntut dua keadaan KV yang bertentangan.

Lebih buruk: **hijaunya assert ini di masa lalu adalah HIJAU BOHONG.** Ia lolos justru karena
jawaban `/api/config` tidak pernah tiba (batas waktu klien 2500 ms, lihat
`reports/fix-f6-client-timeout.md`), sehingga `flags` bernilai `null` dan kondisi "semua flag
false" dianggap terpenuhi secara hampa. Aplikasi yang **diam total** membuat assert itu hijau.
Itu kebalikan dari yang seharusnya diuji.

## 2. Kunci solusinya: flag server TIDAK seragam

Nilai nyata di KV saat pengujian (`GET https://api.fiezel.my.id/api/config`):

| Flag server | Nilai | Endpoint yang diatur (`CF_SERVER_FLAG_FOR` di `app.js`) |
|---|---|---|
| `cfApiEnabled` | `true` | induk seluruh jalur CF (`health`, `config`) |
| `cfIdentityEnabled` | `true` | `auth` (`/api/auth/*`) |
| `cfQuotaEnabled` | `true` | `quota` (`/api/quota*`) |
| `cfAiEnabled` | `false` | `ai` (`/api/ai/*`), plus kill `coach` |
| `cfTtsEnabled` | `false` | `tts` (`/api/tts`) |
| `cfAnalyticsEnabled` | `false` | `usage` (`/api/usage`) |

Karena flagnya campur, satu putaran bisa membuktikan presedensi **dua arah sekaligus**: dengan
konfigurasi statis klien yang menyalakan SEMUA endpoint (`endpoints: {health, config, auth,
quota, ai, tts, usage}` semuanya `'on'` di skenario `B-config-on` — batas atas paling agresif
yang bisa diminta klien), maka

* endpoint yang flag servernya `true` **HARUS** sampai ke jembatan (kalau nol permintaan,
  buktinya hampa: aplikasi cuma diam), dan
* endpoint yang flag servernya `false` **HARUS NOL** permintaan ke jembatan (kalau ada
  permintaan, klien menang atas server, dan itu cacat).

Ini bukti yang lebih kuat daripada versi lama, karena ia menutup kedua arah dan tidak bisa
lolos hanya karena aplikasi bisu.

## 3. Bentuk barunya: satu assert dipecah tiga

| Assert baru | Membuktikan | Merah kalau |
|---|---|---|
| `server-flag-partition` | premisnya ADA: jawaban `/api/config` sungguhan tiba dan flagnya tidak seragam | `flags` null/kosong (gagal keras). `INCONCLUSIVE` kalau flag seragam |
| `server-flag-wins-off` | flag server `false` mengalahkan statis klien `on` | ada ≥1 permintaan ke jembatan untuk `ai`/`tts`/`usage` |
| `server-flag-wins-on` | flag server `true` benar-benar melewatkan panggilan | nol permintaan ke jembatan untuk `auth`/`quota` |

Probe yang dipakai per endpoint (dijalankan dari dalam halaman, lewat jalur transport CF
aplikasi, bukan `fetch` mentah): `auth` → `POST /api/auth/anon`, `quota` → `GET /api/quota`,
`ai` → `POST /api/ai/task`, `tts` → `POST /api/tts`, `usage` → `GET /api/usage`. Arah "harus
nol" dijalankan lebih dulu dengan batas 4000 ms (harus habis waktunya secara wajar), arah
"harus sampai" dengan batas 8000 ms.

**Aturan `INCONCLUSIVE`.** Kalau seluruh flag server kebetulan bernilai sama (semua true atau
semua false), presedensi dua arah tidak bisa diuji dalam satu putaran. Gerbang lalu
melaporkan `INCONCLUSIVE` secara eksplisit dan **TIDAK** menghitungnya sebagai lulus:
`counts.inconclusive` naik, `inconclusiveIds` terisi, `status` laporan jadi `INCONCLUSIVE`,
`pass` jadi `false`, dan exit code bukan 0. Konsol mencetak "INCONCLUSIVE BUKAN HIJAU".
Ini disengaja: keadaan "tidak bisa dibuktikan" tidak boleh berubah jadi lulus diam-diam.
Mekanismenya: `checkStatus(id, name, status, details)` menerima tiga status, dan `check()`
lama sekarang hanya delegasi ke sana.

## 4. Hasil nyata terhadap `https://api.fiezel.my.id`

Perintah: `FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id FIEZEL_E2E_REPORT=reports/fix-f7-data/e2e-after.json node tools/fiezel-e2e-bridge.mjs`
→ **`PASS`, 24 assert lulus, 0 merah, 0 inconclusive, 51.019 ms.**

Isi `presedensiFlagServer` pada skenario `B-config-on` (semua endpoint statis klien `on`):

| Endpoint | Flag server | Nilai | Harus | Permintaan ke jembatan | Status HTTP |
|---|---|---|---|---|---|
| `ai` | `cfAiEnabled` | `false` | nol permintaan | **0** (timeout 4011 ms) | — |
| `tts` | `cfTtsEnabled` | `false` | nol permintaan | **0** (timeout 4000 ms) | — |
| `usage` | `cfAnalyticsEnabled` | `false` | nol permintaan | **0** (timeout 4000 ms) | — |
| `auth` | `cfIdentityEnabled` | `true` | sampai ke jembatan | **1** | 200 |
| `quota` | `cfQuotaEnabled` | `true` | sampai ke jembatan | **1** | 200 |

Seluruh permintaan jembatan yang tercatat di skenario itu: `GET /api/config`,
`POST /api/auth/anon`, `GET /api/quota`. Tidak ada satu pun ke `ai`, `tts`, atau `usage`
walaupun konfigurasi statis klien menyalakan ketiganya. Itu presedensi yang dibuktikan, bukan
diasumsikan.

Catatan proses: putaran live pertama gagal karena Chromium mati di tengah skenario
`A2-enabled-false` ("Target page, context or browser has been closed") — kerusakan lingkungan,
bukan assert merah. Putaran ulang bersih dan itulah yang dilaporkan di atas.

## 5. Matriks self-test loopback: 21 → 24 skenario

`node tests/e2e-bridge-selftest.js` → **PASS (36 assert, 24 skenario loopback), exit 0.** Jumlah
skenario tidak turun. Empat skenario yang menyangkut assert baru:

| Mutasi jembatan/aplikasi tiruan | Diharapkan | Hasil |
|---|---|---|
| `ignoresServerFlags` — aplikasi memanggil endpoint yang flag servernya `false` | GAGAL @ `server-flag-wins-off` | GAGAL @ `server-flag-wins-off`, exit 1 |
| `deafToServerTrue` — server mengizinkan, aplikasi tetap bisu | GAGAL @ `server-flag-wins-on` | GAGAL @ `server-flag-wins-on`, exit 1 |
| `flagsAllTrue` — flag server seragam `true` | `INCONCLUSIVE` @ `server-flag-partition` | `INCONCLUSIVE`, `pass=false`, exit 1, nol assert FAIL |
| `flagsAllFalse` — flag server seragam `false` | `INCONCLUSIVE` @ `server-flag-partition` | `INCONCLUSIVE`, `pass=false`, exit 1, nol assert FAIL |

Selain itu: jembatan tiruan sekarang menjawab `/api/config` dengan flag campur seperti
produksi (plus lapis `enabled`) dan melayani `/api/ai/task`, `/api/tts`, `/api/usage`;
mutasi `flagsEmpty` membuktikan `flags` kosong = merah keras, bukan lulus. Ambang assert
minimal untuk skenario "benar" dinaikkan dari 20 ke 22, dan ada invarian baru
"Presedensi flag server ditutup dua arah PLUS kasus tak tersimpulkan".

## 6. Kejujuran soal batas klaim ini

**Hijau 24/24 hanya berlaku untuk keadaan KV pada saat diuji**, yaitu
`cfApiEnabled/cfIdentityEnabled/cfQuotaEnabled = true` dan
`cfAiEnabled/cfTtsEnabled/cfAnalyticsEnabled = false`. Kalau rollout maju sampai seluruh flag
`true` (atau kill switch total menjadikan semuanya `false`), gerbang **tidak** akan hijau dan
juga **tidak** akan merah: ia akan melaporkan `INCONCLUSIVE` dengan exit code bukan 0, karena
presedensi dua arah tidak bisa dibuktikan dalam satu putaran. Itu perilaku yang diinginkan.
Yang harus dilakukan pada saat itu bukan melunakkan assert, tetapi menguji presedensi dengan
dua putaran KV berbeda atau lewat endpoint uji khusus.

Batas lain yang tidak boleh dibaca berlebihan:

* Gerbang ini membuktikan **perilaku transport klien** terhadap flag server. Ia tidak
  membuktikan server benar-benar menolak permintaan seandainya klien nakal — itu ranah
  `tests/cf-config-killswitch-test.js` dan kontrak sisi Worker.
* Arah "harus nol" dibuktikan lewat kehabisan waktu 4000 ms. Itu bukti negatif berbatas waktu;
  permintaan yang tertunda lebih lama dari itu tidak akan tertangkap.
* Ketiga assert baru dievaluasi hanya di skenario `B-config-on`. Skenario lain tidak punya
  premisnya.

## 7. Efek samping yang saya kerjakan dan alasannya

`tests/secret-scan-test.js` **sudah MERAH sebelum pekerjaan ini dimulai**: commit F6 (`9a3316b`)
ikut men-commit `reports/fix-f6-data/e2e-after.json` dan `e2e-after-2.json` yang memuat nilai
cookie sesi NYATA (`fz_id`, `AWSALB`, `AWSALBCORS`) apa adanya, plus URL tantangan Cloudflare.
Artefak bukti F7 saya akan menambah masalah yang sama. Jadi:

* dibuat `tools/redact-live-cookies.mjs` — versi generik (menerima daftar berkas) dari
  `tools/redact-a5-live-cookies.mjs` yang alamat berkasnya ditulis keras. Nilai cookie dan
  jalur tantangan Cloudflare diganti `<REDAKSI len=N sha256=…>`, sehingga nama cookie,
  jumlah, panjang, dan sidik jarinya tetap bisa diperiksa;
* dijalankan atas empat berkas: dua artefak F7 saya dan dua artefak F6 yang bikin merah.
  Setelah itu `tests/secret-scan-test.js` **46/46 assert PASS, 0 temuan, exit 0**.

**Yang TIDAK selesai:** riwayat git masih memuat nilai asli untuk berkas F6 yang sudah pernah
ter-commit. Token itu harus dianggap bocor dan dirotasi owner. Memasukkannya ke allowlist akan
salah — itu kredensial, bukan fixture.

`GATE-REGISTRY-REPORT.json` dan `EDGE-PROXY-HOPBYHOP-REPORT.json` yang ikut berubah saat
menjalankan gerbang sudah di-restore ke keadaan commit. Catatan kecil: artefak
`GATE-REGISTRY-REPORT.json` di commit menyebut `gateFilesInRepo: 148`, sedangkan angka nyata
sekarang 149 karena `tests/cf-client-timeout-test.js` belum terlacak saat F6 membuat artefaknya.
Gerbangnya tetap PASS; artefaknya saja yang basi, dan saya tidak menyentuhnya karena bukan
lingkup paket ini.

## 8. Verifikasi

| Gerbang | Exit |
|---|---|
| `node tests/e2e-bridge-selftest.js` | 0 (PASS, 36 assert, 24 skenario) |
| `node tests/no-network-test.js` | 0 |
| `node tests/gate-registry-test.js` | 0 |
| `node tests/cf-config-killswitch-test.js` | 0 |
| `node tests/cf-client-timeout-test.js` | 0 |
| `node tests/secret-scan-test.js` | 0 (setelah redaksi §7) |
| `node tests/regression-test.js` | 0 |
| `node tests/install-health-test.js` | 0 |
| `FIEZEL_E2E_BRIDGE_BASE=https://api.fiezel.my.id node tools/fiezel-e2e-bridge.mjs` | 0 (24/24 HIJAU) |

Berkas yang berubah: `tools/fiezel-e2e-bridge.mjs`, `tests/e2e-bridge-selftest.js`,
`tools/redact-live-cookies.mjs` (baru), `reports/fix-f7-data/*.json` (baru),
`reports/fix-f6-data/e2e-after*.json` (redaksi), dan catatan ini.
