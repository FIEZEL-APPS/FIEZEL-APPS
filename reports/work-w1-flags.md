# W1 — Flag transport Cloudflare (branch `work/flags`)

**Ringkasan satu paragraf.** Yang di-merge di sini adalah SAKELARNYA, dalam keadaan MATI.
Worker `fiezel-api` memang sudah hidup di Cloudflare (D1+KV, `/health` menjawab
`protocol 1.7`, `/api/config` menjawab semua flag `false`), tetapi `api.fiezel.my.id` BELUM
aktif (menunggu nameserver) dan workers.dev sengaja dimatikan — jadi frontend tidak boleh
benar-benar memanggil CF, dan memang tidak bisa: `FIEZEL_CF_CONFIG.base` kosong dan
`enabled:false`. Nol perubahan perilaku untuk murid hari ini; nol fetch tambahan.

## Yang berubah (4 berkas + 1 gerbang baru)

| Berkas | Perubahan |
|---|---|
| `core-config.js` | Blok BARU `self.FIEZEL_CF_CONFIG` = `{enabled:false, base:'', endpoints:{health,config,auth,quota,ai,tts,usage → 'off'}}`, `Object.freeze` dua lapis. `FIEZEL_CORE_CONFIG.workerUrl` **tidak disentuh**. |
| `app.js` | Blok `CF-TRANSPORT-BEGIN/END` di depan `coreWorkerExec`: pra-cabang `on`/`shadow`/`off`. Jalur Puter hari ini dipindahkan APA ADANYA ke `corePuterExec` (ekor `const sdk=await awaitPuter();…` utuh). |
| `tests/cf-transport-test.js` | `REQUIRE_CF_FLAGS = true`; tiga assert yang dulu SKIP kini berjalan atas NILAI hasil evaluasi vm. |
| `tests/cf-shadow-mode-test.js` | **BARU** — gerbang perilaku (36 assert), menjalankan blok transport `app.js` di dalam `vm`. |
| `.github/workflows/quality.yml` | `node tests/cf-shadow-mode-test.js` didaftarkan sesudah `tests/cf-transport-test.js`. |

Tidak ada bump invarian build (`SW_REV`, `DIAG_BUILD`, `FIEZEL_PAGE_BUILD` tetap `m025-168`) —
itu wewenang MASTER saat merge. `*-REPORT.json` yang berubah sudah di-restore.

## 1. Bentuk flag — dan mengapa BUKAN bentuk draf cf-b1 §5.3

Draf cf-b1 §5.3 menulis `{baseUrl, routes:{'<path>':'puter'|'cf'|'cf-shadow'}, fallbackToPuter,
shadowSampleRate}`. Yang dipasang adalah kosakata `'off'|'shadow'|'on'` **per endpoint** sesuai
`reports/cf-b6-migration-plan.md` (pola pagar rilis P1) dan `docs/CF-MIGRATION-RUNBOOK.md`
(Bagian 4.6: tabel tiga status + kill switch `GET /api/config`). Alasannya operasional, bukan
selera: orang yang memutar flag saat insiden membaca kata yang sama di tiga tempat — repo,
runbook, dan jawaban `GET /api/config` di server. Dua kosakata berbeda untuk satu sakelar
adalah cara paling mudah memutar flag yang salah pada jam paling buruk.

Konsekuensinya: assertion `routes`/`fallbackToPuter`/`shadowSampleRate` di
`tests/cf-transport-test.js` disesuaikan ke `enabled`/`base`/`endpoints`. **Tidak ada jaminan yang
dilonggarkan** — daftarnya justru bertambah (nilai mode divalidasi terhadap himpunan
`off|shadow|on`, tujuh kunci endpoint wajib ada, `endpoints` wajib ikut `Object.freeze`).
Rollback per-request `fallbackToPuter` dari draf **tidak** dipasang: pada fase ini tidak ada
satu pun endpoint yang 'on', jadi fallback per-request tidak punya apa pun untuk di-fallback-i;
menambahkannya sekarang berarti menulis kode yang tidak bisa diuji. Rollbacknya sekarang
adalah sakelar induk (butir 4 di bawah). Ini catatan untuk MASTER: kalau fase H nanti
menyalakan endpoint pertama, `fallbackToPuter` (atau padanannya) HARUS ditambahkan bersama
endpoint itu, bukan sesudahnya.

`workerUrl` tetap `https://fiezel-core.puter.work` + `deploymentState:'validated'`;
`tests/remote-push-test.js` hijau (`liveDeploymentConfigured:true`).

## 2. Pra-cabang di `coreWorkerExec`

```
mode = cfEndpointMode(path)
  'on'     -> return cfWorkerFetch(path, options)          // credentials:'include', mode:'cors'
  'shadow' -> answer = corePuterExec(path, options)        // JAWABAN MURID = Puter, selalu
              cfShadowProbe(path, options, answer)          // salinan ke CF, hasil DIBUANG
              return answer
  'off'    -> return corePuterExec(path, options)           // jalur hari ini, nol tambahan
```

Peta path→flag: `/health`→health, `/api/config`→config, `/api/auth/*`→auth,
`/api/quota/*`→quota, `/api/ai/*`+`/api/coach/*`→ai, `/api/tts/*`→tts,
`/api/usage|activity|feedback|policy/*`→usage. Path yang **tidak** terpetakan — terutama
`/api/push/subscribe` yang terikat VAPID dan `MAX_USERS` — selamanya `'off'`; menambah jalur
CF harus keputusan eksplisit di peta itu. Nilai mode yang tidak dikenali (typo, nilai lama)
jatuh ke `'off'`: flag yang tak dikenali harus berarti aman, bukan berarti hidup.

Yang dijaga di mode `shadow`, karena inilah yang bisa melukai murid:
- Hasil CF tidak pernah dikembalikan ke pemanggil dan **body-nya tidak pernah dibaca** (tidak
  ada `.json()`/`.text()` di seluruh blok transport — ini di-assert). Jadi mustahil menjadi
  jawaban yang dilihat murid.
- Efek samping tidak digandakan: salinan membawa penanda dry-run `X-Fiezel-Shadow: 1`
  (kontrak Worker: permintaan bertanda itu read-only — tidak menulis progres/kuota/analytics),
  jalur lama dipanggil **sekali** (bukan dua), salinan dikirim **sekali** tanpa retry, dan blok
  transport tidak menyentuh `localStorage`/`state`/DOM sama sekali.
- `options` asli tidak dimutasi: penanda shadow hanya ada di salinan.
- Perbandingan status Puter vs CF hanya masuk `console.debug('[cf-shadow]', …)`.

Gate yang tetap hijau karena pra-cabangnya sisipan, bukan penulisan ulang:
`tests/boot-order-test.js:273` (ekor `const sdk=await awaitPuter();if(sdk?.workers?.exec)` utuh di
`corePuterExec`), `tests/core-brain-test.js:3-4`, `tests/remote-push-test.js:10`
(`puter.workers.exec` + `coreWorkerExec` masih ada), `tests/regression-test.js:14`.

## 3. `protocol:'1.7'` tidak dilonggarkan

Tiga pemeriksaan frontend tetap apa adanya: `policy_protocol_mismatch` (`resolveAdaptivePolicy`),
`protocol_mismatch` (`coreBrainHealth`), `coach_protocol_mismatch` (`askCoachAI`). Blok
transport tidak memuat kata `protocol` sama sekali (di-assert) — ia mengembalikan objek
Response-like, dan pemeriksaan protokol tetap milik pemanggil. `fetch()` memenuhi bentuk yang
dibutuhkan (`r.ok`, `r.status`, `r.json()`) tanpa adaptor, jadi jawaban CF diperiksa dengan
ukuran yang sama dengan jawaban Puter.

## 4. Rollback nyata — dan batas kejujurannya

`FIEZEL_CF_CONFIG.enabled=false` mematikan SELURUH jalur CF walau ketujuh endpoint bernilai
`'on'`: `CF_ENABLED = enabled===true && base!==''`, dan `cfEndpointMode()` mengembalikan
`'off'` sebelum melihat nilai endpoint. Diuji dengan menjalankan sepuluh path
(`tests/cf-shadow-mode-test.js` butir d), bukan dengan membaca kode.

**Sakelar statis ini BUKAN kill switch instan** — dicatat sebagai komentar di `core-config.js`
dan di-assert oleh `tests/cf-transport-test.js`. `core-config.js` ada di daftar precache
`sw.js:35` (ASSETS) dan dilayani cache-first, jadi mengubah nilainya **tidak** menjangkau PWA
yang sudah terpasang sampai `SW_REV` naik dan generasi shell baru terpasang. Kill switch yang
nyata ada di server: `GET /api/config` pada Worker CF (KV `cfg:flags`), efek ≤60 detik tanpa
rilis. Flag statis = lapis KEDUA.

## 5. Gerbang

`tests/cf-transport-test.js`: `REQUIRE_CF_FLAGS = true`. Tiga assert yang sebelumnya SKIP sekarang
berjalan dan lulus dengan nama yang sama — `Struktur FIEZEL_CF_CONFIG`,
`Semua nilai flag CF default OFF`, `Jalur rollback CF ada dan hidup` — masing-masing atas
nilai hasil evaluasi `core-config.js` di dalam `vm`, ditambah assert pecahan supaya kegagalan
menunjuk bagian mana yang salah. Hasil: **PASS 25 assert, 0 SKIP**.

`tests/cf-shadow-mode-test.js` (BARU, 36 assert, nol dependency/jaringan): memotong blok transport
dari `app.js` lewat sentinel `CF-TRANSPORT-BEGIN/END`, menjalankannya di `vm` dengan `fetch`
mock lokal, lalu meng-assert (a) mode off = jalur pemanggilan identik + nol fetch + objek
`options` yang sama, (b) shadow tidak pernah memakai jawaban CF, (c) shadow tidak menggandakan
efek samping, (d) `enabled:false` mengalahkan semua `'on'`, (e) nol URL Cloudflare hardcode di
`app.js`. Anti-vakum: mode `'on'` ikut dijalankan dan dibuktikan benar-benar memakai CF dengan
`credentials:'include'` — tanpa itu, (a)-(d) hanya menguji ruang kosong. Terdaftar di
`quality.yml` (dan `tests/cf-transport-test.js` ikut meng-assert pendaftaran itu).

## 6. Verifikasi (semua exit 0, dijalankan lokal)

`cf-shadow-mode-test` (36 PASS) · `cf-transport-test` (25 PASS, 0 SKIP) · `remote-push-test` ·
`core-brain-test` · `boot-order-test` · `regression-test` · `ui-structure-test` ·
`install-health-test` · `pwa-cache-test` · `validator.js`.
Tetangga yang ikut diperiksa karena bisa terkena: `no-network-test` (PASS, 119 gerbang
dipindai — gerbang baru dikenali memakai mock lokal), `cf-wiring-test`, `cf-api-contract-test`,
`release-audit-gate-test` (audit rilis nyata, 0 blocker), `core-brain-v2-test`, `sw-corp-test`,
`pwa-release-coherence-test`, `http-smoke-test`, `diag-panel-test`.

`CF-SHADOW-MODE-REPORT.json` dihasilkan gerbang baru tetapi TIDAK di-commit (artefak
regenerable; `*-REPORT.json` lain di-restore sesuai aturan fase ini). MASTER boleh
memutuskan untuk melacaknya seperti artefak gerbang lain.

## 7. Yang MASIH belum ada (jangan dibaca sebagai selesai)

- Frontend belum membaca `GET /api/config` sama sekali. Kill switch server yang disebut di
  komentar dan di runbook **belum terpasang di klien** — hari ini ia hanya benar untuk sisi
  server. Lapis dinamis itu paket kerja tersendiri; sampai ia ada, satu-satunya sakelar klien
  adalah `enabled` statis dengan konsekuensi cache-first di atas.
- `askFiezelAI` masih punya pra-syarat keras SDK Puter (cf-b1 §5.4 "satu pengecualian"). Selama
  baris itu ada, menyalakan `endpoints.ai='on'` tidak akan bekerja tanpa SDK Puter termuat.
  Belum disentuh: melonggarkannya sekarang berarti mengubah jalur AI murid untuk keuntungan
  nol pada fase flag-mati.
- Kontrak dry-run `X-Fiezel-Shadow` diuji di sisi KLIEN saja (salinan membawa header, sekali,
  tanpa mutasi lokal). Bahwa Worker CF benar-benar memperlakukan header itu sebagai read-only
  harus diuji di sisi Worker — belum ada di gerbang mana pun.
- Cookie: `credentials:'include'` hanya berguna kalau origin produksi tunggal
  (`fiezel.my.id` → `api.fiezel.my.id` = same-site). Kalau aplikasi juga disajikan dari
  `*.github.io`, cookie `SameSite=Lax` tidak terkirim (cf-b1 §5.5). Keputusan origin tunggal
  belum tercatat sebagai keputusan owner.
