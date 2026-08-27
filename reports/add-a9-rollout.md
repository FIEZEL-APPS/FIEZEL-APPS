# A9 — Rencana rollout Cloudflare yang bisa dieksekusi

Branch `add/a9rollout`, worktree `/home/user/workspace/wt-a9rollout`. **Tidak di-push.**
Invarian build tiga titik tidak disentuh (`SW_REV='m025-172-jembatan-edge-api-20260827'`,
`FIEZEL_PAGE_BUILD='m025-172'`, `VERSION.json` tetap `5.19.0`). `core-config.js`, `app.js`,
`sw.js`, `index.html` **nol perubahan** — paket kerja ini tidak menyalakan apa pun, ia menulis
cara menyalakannya.

## 1. Berkas

| Berkas | Status | Isi |
|---|---|---|
| `docs/CF-ROLLOUT-PLAN.md` | BARU | Rencana penyalaan bertahap: urutan R1–R7 satu rilis per endpoint, ambang batal berangka per langkah, tahap bayangan, prasyarat belum terpenuhi, aturan mengikat, kriteria BERHENTI TOTAL |
| `tools/flag-plan-check.mjs` | BARU | Node murni, nol jaringan/dependency/tulis-berkas. `core-config.js` (tri-state) × `/api/config` dari stdin (boolean) = keadaan efektif per endpoint + deteksi kombinasi berbahaya |
| `rollout-plan-test.js` | BARU | Gerbang, **141 assert**, nol jaringan. Menjaga dokumen bisa dieksekusi dan membuktikan kalkulator di atas benar-benar mendeteksi kombinasi berbahaya |
| `.github/workflows/quality.yml` | diubah | `node rollout-plan-test.js` didaftarkan sesudah `cf-shadow-mode-test.js`, dengan alasan penempatan ditulis di komentar |
| `NO-NETWORK-REPORT.json` | diubah | `scanned` 127 → 128 (gerbang baru ikut terpindai dan lulus) |
| `ROLLOUT-PLAN-REPORT.json` | BARU | Keluaran gerbang |

`CF-TRANSPORT-REPORT.json` sengaja **di-restore**: menjalankan `cf-transport-test.js` memperbarui
isinya (laporan di HEAD masih dari keadaan sebelum W1 mendarat, `skipped:true`), tetapi
pembaruan itu bukan milik paket kerja ini.

## 2. Urutan yang dipilih, dan mengapa berbeda dari runbook

Runbook 4.6 menyebut urutan **per path**: `/api/feedback` → `/api/activity` → `/api/policy/*` →
`/api/ai/translate` → `/api/coach/context` → `/api/ai/chat`. Urutan itu **tidak bisa dieksekusi
dari flag klien** — `app.js` `CF_ENDPOINT_ROUTES` memetakan keempat path pertama ke **satu**
flag (`usage`) dan kedua path AI ke **satu** flag (`ai`). Jadi rencana ini memakai granularitas
yang benar-benar ada, yaitu tujuh kunci `FIEZEL_CF_CONFIG.endpoints`:

`R1 health` → `R2 config` → `R3 usage` → `R4 quota` → `R5 auth` → `R6 tts` → `R7 ai`

Dua keputusan yang perlu diketahui MASTER:

1. **`config` sengaja langkah KEDUA, bukan terakhir.** Selama klien tidak memakai jalur CF untuk
   `/api/config`, KV `cfg:flags` tidak mengendalikan apa pun dan seluruh rencana kehilangan kill
   switch-nya. `flag-plan-check.mjs` menolak kombinasi "endpoint hidup + config off" dengan
   `DANGER KILL_SWITCH_TAK_TERBACA`.
2. **Pemecahan R7 ke per-task (`translate` → `coach` → `chat`) tidak bisa dilakukan dari klien**
   dan harus dilakukan dari registry task di server (`workers/api/ai/ai-tasks.js`). Selama itu
   belum ada, R7 adalah satu langkah besar. Itu ditulis di dokumen sebagai kelemahan rencana
   (prasyarat P6 di bagian 3 dokumen, dan di baris "Urutan di dalam R7"), bukan disembunyikan.

## 3. Dua temuan yang mengubah rencana, ditemukan saat verifikasi repo

### (a) Klien BELUM PERNAH membaca `/api/config` — P0

`grep -rn '/api/config' app.js index.html features/` menghasilkan **satu** hasil, dan hasil itu
**komentar** (`app.js:2044`). Kill switch server ada dan benar (`workers/api/route-config.js`,
KV `cfg:flags`, `cacheTtl` 60 s, default `false` saat KV gagal), tetapi **belum ada satu baris
klien yang mendengarnya**. Konsekuensi yang tidak boleh dilewatkan: hari ini prosedur "putar KV
lalu tunggu 60 detik" **tidak mematikan apa pun di perangkat murid**. Karena itu P0 memblokir
R1–R7 seluruhnya, bukan sebagian.

### (b) Perintah kill switch di runbook 4.6/4.7 menulis bentuk yang TIDAK DIBACA Worker — P1

Runbook menulis:

```
'{"transport":"shadow","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}'
```

`route-config.js` membaca `stored.flags` dan `stored.enabled`, lalu
`mergeFlags(CLIENT_FLAG_DEFAULTS, …)` **hanya menerima kunci yang sudah dikenal dan bertipe
boolean** (`workers/api/schema.js:108-123`: `cfApiEnabled`, `cfAiEnabled`, `cfTtsEnabled`,
`cfQuotaEnabled`, `cfAnalyticsEnabled`, `cfIdentityEnabled`; kill switch `ai`, `tts`, `coach`,
`analytics`). Bentuk datar di runbook karena itu **diterima KV tanpa galat lalu diabaikan
sepenuhnya** — kill switch yang terasa bekerja dan tidak mengubah apa pun. Itu jenis kegagalan
terburuk untuk sebuah kill switch: ia gagal dengan tenang, pada hari orang paling percaya
padanya.

Dokumen A9 memakai bentuk yang benar (`{"flags":{…},"enabled":{…}}`) di prosedur B-1/B-2 dan
menuliskan ketidakcocokan itu sebagai prasyarat P1. Saya **tidak** menyunting runbook: dua
dokumen yang saling bertentangan lebih buruk daripada satu dokumen yang salah dengan koreksi
yang ditunjuk, dan pemilihan mana yang diperbaiki (runbook, atau Worker yang menerima kosakata
lama) adalah keputusan MASTER, bukan keputusan saya di paket kerja dokumentasi.

## 4. Prasyarat yang BELUM terpenuhi (bagian 3 dokumen) — sepuluh, bukan enam

Enam yang diminta brief, semuanya diverifikasi dari repo dan **masing-masing diikat gerbang**
(`rollout-plan-test.js` memverifikasi pernyataannya masih benar terhadap repo, jadi dokumen
tidak bisa membusuk menjadi klaim basi):

- **P2** kuota 25/26 belum diuji di runtime nyata (`reports/exec-e3-quota.md` §2/§4). Bonus temuan:
  `AI_LIMIT_PER_DAY="20"` di `[vars]` **tidak sama** dengan `FREE_AI_DAILY_LIMIT=25` yang
  ditegakkan — satu angka untuk naskah UX, satu untuk gerbang.
- **P3** cache TTS belum diukur terhadap bucket `fiezel-audio` sungguhan (1.170 objek), jadi
  ambang batal R6 (cache-hit < 70%) belum punya baseline.
- **P4** kedua cron terpasang tetapi belum terbukti pernah berjalan; selama itu klaim privasi
  analytics (token harian dihapus, pepper dirotasi 24 jam) baru **terjadwal**, belum benar.
- **P5** Analytics Engine belum diaktifkan (`ANALYTICS_ENABLED="off"`; baca AE butuh SQL API +
  token akun, bukan binding) — persis metrik yang dipakai ambang R6/R7 belum bisa dibaca.
- **P6** `workers/owner/wrangler.toml` masih memuat `[[routes]] custom_domain = true` untuk
  `owner.fiezel.my.id`, sementara zona `fiezel.my.id` **tidak ada di Cloudflare**
  (`reports/work-e9-edge.md` §1). `wrangler deploy` Worker owner akan GAGAL, bukan jatuh ke
  workers.dev — jadi setiap ambang yang mengandalkan dashboard owner harus diukur dengan cara
  lain sampai P6 selesai.
- **P7** `index.html`/`sw.js` tidak memuat modul telemetri bayangan (`grep -n 'shadow'` → 0
  hasil). Yang ada hanya `console.debug('[cf-shadow]', …)`: tidak teragregasi, tidak terhitung,
  tidak bisa dipanen — jadi rasio `diff` ≤ 1%, ketidaksesuaian bentuk ≤ 0,5%, dan p95 di bagian
  2 dokumen **belum bisa dihitung** dari perangkat murid.

Empat tambahan yang muncul dari verifikasi: **P0** (klien belum membaca `/api/config`),
**P1** (bentuk KV runbook salah), **P8** (`FEATURE_AI/TTS/COACH` ada di `[vars]` sehingga hanya
bisa diubah lewat `wrangler deploy` — entitlement Worker **bukan** sakelar < 60 detik),
**P9** (`EDGE_SHARED_SECRET` masih boleh kosong ⇒ `edgeGuard:"off"` ⇒ `*.workers.dev` terbuka;
tidak boleh bersamaan dengan endpoint berbiaya).

## 5. `tools/flag-plan-check.mjs`

Satu aturan yang ditegakkan dan tidak bisa dibantah: **server hanya bisa MEMATIKAN.**

```
effective = 'off'  bila enabled=false | base='' | statis='off' | /api/config tak terbaca
                        | flag server false | kill switch fitur false
effective = statis bila semuanya true; 'shadow' TIDAK PERNAH naik menjadi 'on' karena server true
```

`DANGER` (exit 3): `AI_TANPA_AUTH`, `AI_TANPA_KUOTA` (biaya tak terbatas), `TTS_TANPA_KUOTA`,
`KILL_SWITCH_TAK_TERBACA`, `BANYAK_RISIKO_SEKALIGUS` (dua/tiga endpoint paling berisiko `on`
sekaligus = melanggar satu rilis per endpoint dan gejalanya tidak bisa diatribusikan),
`PROTOKOL_TIDAK_COCOK`.
`WARN`: `SHADOW_BERBAYAR` (shadow pada ai/tts tetap membakar neuron), `RENCANA_MANDUL`,
`SERVER_TIDAK_BISA_MENYALAKAN`, `ANALYTICS_BISA_SENYAP`.

Pemakaian saat insiden — perkaliannya dikerjakan alat, bukan kepala:

```bash
curl -s https://api.fiezel.my.id/api/config | node tools/flag-plan-check.mjs
```

Alat ini **tidak pernah** memanggil HTTP sendiri: alat yang boleh menembak produksi tidak boleh
sama dengan alat yang dipakai saat panik. Gerbang meng-assert ketiadaan `fetch(`, import modul
socket, URL literal `http(s)://`, dan penulisan berkas di dalam sumbernya.

## 6. Gerbang `rollout-plan-test.js` — 141 assert, dan buktinya bisa MERAH

Yang dijaga, semuanya diperiksa mesin (bukan gaya bahasa):

1. **Per langkah R1–R7**: bagian ada, endpoint disebut, "Siapa yang terkena" ada, "Yang diukur"
   ada, baris "Ambang BATAL" ada dan memuat **≥ 3 angka bersatuan** (pola
   `angka + %|ms|detik|jam|hari|kali|neuron|karakter|…`), **tidak** memuat frasa kabur
   (`kalau bermasalah`, `terlalu tinggi`, …), dan ada prosedur batal `< 60 detik` yang menunjuk
   B-1/B-2. Urutan R1..R7 harus benar-benar menaik di dokumen, dan setiap kunci endpoint yang ada
   di `core-config.js` harus punya langkahnya sendiri (endpoint kedelapan tanpa langkah = merah).
2. **Pembatalan**: B-1 dan B-2 ada dengan target 60 detik, memakai `kv key put cfg:flags`,
   menuliskan bentuk `{"flags":…,"enabled":…}` yang benar, diverifikasi lewat
   `flag-plan-check.mjs`, dan menjelaskan 60 detik berasal dari `cacheTtl` KV.
3. **Tahap bayangan**: status/bentuk/latensi disebut, durasi berangka, sampel minimum berangka,
   "kesimpulan tidak sah" sebelum keduanya terpenuhi, ≥ 3 "Ambang lulus" berangka, dan larangan
   membandingkan **isi jawaban AI** dengan alasannya (nondeterministik ⇒ **alarm palsu**) plus
   pengecualian byte audio TTS dan stempel waktu server.
4. **Prasyarat**: enam item wajib disebut, dan untuk tiap item gerbang **memverifikasi ke repo
   bahwa prasyaratnya masih belum terpenuhi**. Kalau suatu hari `ANALYTICS_ENABLED` menjadi `on`
   atau `custom_domain` dihapus, gerbang MERAH dan memaksa dokumennya diperbarui alih-alih
   membiarkannya berbohong.
5. **Aturan mengikat**: auto-deploy 5 menit disebut sebagai alasan, larangan memakai
   `core-config.js` sebagai kill switch beserta alasan cache-first/precache, "server hanya bisa
   MEMATIKAN", "satu rilis satu endpoint", dan `core-config.js` repo masih **semua off**.
6. **BERHENTI TOTAL**: progres tampak hilang, suara senyap total, soal tidak bisa dijawab, nol
   toleransi untuk kondisi murid, ≥ 5 kondisi teknis berangka, Puter disebut masih hidup penuh,
   dan tindakannya B-2.
7. **`flag-plan-check.mjs` benar-benar mendeteksi bahaya**, diuji dengan **fixture yang
   dijalankan** sebagai proses anak (`spawnSync`, stdin sintetis, fixture ditulis ke
   `os.tmpdir()` dan dibersihkan — working tree tidak pernah kotor):

| Fixture | Diharapkan | Hasil |
|---|---|---|
| `ai=on`, `auth=off`, `quota=on` | `DANGER AI_TANPA_AUTH`, exit 3 | terdeteksi |
| `ai=on`, `quota=off`, `auth=shadow` | `DANGER AI_TANPA_KUOTA` + pesan memuat "BIAYA TAK TERBATAS", exit 3 | terdeteksi |
| `usage=on`, `config=off` | `DANGER KILL_SWITCH_TAK_TERBACA`, exit 3 | terdeteksi |
| `auth=on` + `tts=on` + `ai=on` | `DANGER BANYAK_RISIKO_SEKALIGUS` | terdeteksi |
| **keadaan `core-config.js` repo hari ini** | **nol temuan, exit 0, tujuh endpoint OFF** | **bersih** |
| urutan sah (`health`+`config`+`auth`+`quota` on, ai/tts off) | nol DANGER, exit 0 | bersih |
| `cfAiEnabled=false` atas statis `ai=on` | efektif `off` (server mematikan) | benar |
| statis `usage=shadow` + server true | tetap `shadow` (server tidak menyalakan) | benar |
| stdin kosong (`/api/config` tak terbaca) | semua `off` | benar |
| `enabled.tts=false` atas flag klien true | `tts` efektif `off` | benar |

**Bukti gerbang bisa MERAH (dijalankan, bukan diperkirakan):** ambang batal R7 diganti sementara
menjadi kalimat `kalau bermasalah, batalkan` → gerbang **exit 1** dengan assert
`R7: ambang batal tidak memakai frasa kabur` FAIL. Dokumen dipulihkan sesudahnya (diverifikasi
`diff` identik dengan salinan sebelum mutasi, dan gerbang kembali exit 0).

## 7. Verifikasi

| Perintah | Hasil |
|---|---|
| `node rollout-plan-test.js` | **PASS (141 assert)**, exit 0 |
| `node cf-transport-test.js` | exit 0 |
| `node cf-shadow-mode-test.js` | exit 0 |
| `node no-network-test.js` | exit 0 (`scanned` 128; gerbang baru ikut terpindai dan bersih) |
| `node regression-test.js` | exit 0 |
| `node install-health-test.js` | exit 0 |
| `node --check tools/flag-plan-check.mjs` | lulus (step `Syntax` di quality.yml memindai `*.mjs`) |

Tidak ada bump versi build. Tidak ada push. Commit di `add/a9rollout`.

## 8. Yang TIDAK saya kerjakan (batas paket kerja ini)

- **Tidak menyunting `docs/CF-MIGRATION-RUNBOOK.md`** walau P1 membuktikan perintah kill
  switch-nya tidak berefek — lihat §3(b) untuk alasannya.
- **Tidak menambahkan pembaca `/api/config` ke klien** (P0). Itu perubahan `app.js` +
  kemungkinan bump invarian build, yaitu wewenang MASTER, dan ia butuh gerbang perilakunya
  sendiri (timeout pendek, default `off` saat gagal, nol tulis state) yang tidak boleh
  diselundupkan ke dalam paket kerja dokumentasi.
- **Tidak memperbaiki `workers/owner/wrangler.toml`** (P6). Menghapus blok `custom_domain` berarti
  memilih jalur pengganti (`workers.dev` + Access, atau proxy PHP kedua seperti jalur api), dan
  pilihan itu punya konsekuensi keamanan yang harus diputuskan owner, bukan disisipkan di sini.
- **Tidak menyamakan `AI_LIMIT_PER_DAY=20` dengan `FREE_AI_DAILY_LIMIT=25`.** Angka mana yang
  benar adalah keputusan produk (naskah UX vs plafon biaya), dan mengubah salah satunya diam-diam
  akan membuat pesan kuota ke murid berbohong ke arah yang berbeda.
