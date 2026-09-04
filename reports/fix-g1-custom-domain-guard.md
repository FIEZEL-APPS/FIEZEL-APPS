# G1 — Pagar edge untuk CUSTOM DOMAIN `api.fiezel.my.id`

Branch: `fix/g1guard`. Tidak di-push. Versi build **tidak** dinaikkan (itu wewenang master lewat
`node tools/bump-build.mjs`).

## 1. Masalah yang diselesaikan

Worker `fiezel-api` sudah diikat sebagai **custom domain** ke `api.fiezel.my.id`. Artinya jembatan
reverse-proxy PHP (`deploy/edge/api-index.php`) **tidak lagi di jalur permintaan**, sehingga header
`X-Fiezel-Edge` **tidak ada** pada permintaan nyata. Tanpa perubahan, `workers/api/mw-edge.js`
akan menolak semuanya dengan `forbidden_edge` kecuali `/healthz` — seluruh jalur Cloudflare mati
begitu zona aktif.

Yang **tidak** dilakukan: mematikan pagarnya. Yang dilakukan: menambah jalur sah kedua dan
mengubah sisanya menjadi **default-deny**.

## 2. Perubahan (per berkas)

| Berkas | Status klaim | Perubahan |
|---|---|---|
| `workers/api/mw-edge.js` | wilayahku | dua jalur sah + default-deny + dokumentasi keputusan |
| `edge-guard-test.js` | wilayahku | butir **(h)** baru (h1–h9) + assert `edgeGuardPath` di butir (c) |
| `owner-edge-guard-test.js` | wilayahku | butir **(f)** baru: asimetri api vs owner |
| `deploy/edge/README.md` | wilayahku | jembatan = **JALUR CADANGAN**, daftar periksa pembongkaran jalur header |
| `workers/api/route-health.js` | **di luar** daftar klaimku | satu field baru `edgeGuardPath` (perlu untuk butir 5 brief); bukan berkas terlarang |
| `docs/CF-MIGRATION-RUNBOOK.md` | dokumen bersama | blok `🔄 TEMUAN LAPANGAN 28 Agu 2026` di Bagian 2A |
| `reports/g1-custom-domain-red-proof.mjs` + `.json` | baru | alat + bukti merah |

Tidak menyentuh `app.js`, `sw.js`, `core-config.js`, `features/neural-voice/`, `coordination/`.

### Logika gerbang sesudah perubahan (urutan sengaja)

1. `EDGE_FREE_PATHS` (`/healthz` saja) → lolos, jalur `free-path`.
2. secret tidak terpasang **dan** `ALLOW_NO_EDGE_SECRET === 'true'` → lolos, jalur `off`, `console.warn` sekali per isolate.
3. **hostname tepercaya** (`TRUSTED_EDGE_HOSTS`) → lolos, jalur `custom-domain`.
4. secret tidak terpasang → **fail-closed** 403.
5. `*.workers.dev` → wajib header benar (`ctEq`, waktu tetap) → jalur `header`; salah/kosong = 403.
6. hostname lain (tidak tepercaya, bukan `workers.dev`) → **403, walau headernya sah**.

Urutan 3 sebelum 4 disengaja: kalau nanti `EDGE_SHARED_SECRET` dihapus saat pembongkaran, produksi
**tidak** mati. Itu diassert langsung di (h2).

### Satu sumber kebenaran hostname

`TRUSTED_EDGE_HOSTS = Object.freeze(['api.fiezel.my.id'])` diekspor dari `mw-edge.js`, dibaca gerbang,
dan **diverifikasi identik** dengan `routes = [{ pattern = "api.fiezel.my.id", custom_domain = true }]`
di `workers/api/wrangler.toml` oleh assert (h7). Sengaja **bukan** env var: env var berarti keadaan
produksi tidak terbaca dari repo dan tidak bisa dijaga gerbang.

`owner.fiezel.my.id` **sengaja tidak** masuk daftar — owner belum custom domain, masih proxy PHP.

### Soal "Host bisa dipalsukan" — jawaban jujur

Hostname dibaca **hanya** dari `ctx.url.hostname` (turunan request line Worker), tidak dari
`X-Forwarded-Host`/`X-Host`/`Forwarded`. Assert (h8) menolak substring/suffix trickery
(`api.fiezel.my.id.jahat.example`, `xapi.fiezel.my.id`, huruf besar, titik akhir, port).

Di Cloudflare Workers **tidak ada** sinyal yang benar-benar tak-bisa-dipalsukan untuk ini pada plan
Free: `cf.*` bukan bukti asal, dan mTLS/Access ada di luar jangkauan paket ini. Maka argumennya
bukan "tidak bisa dipalsukan", tapi **"pemalsuan tidak memberi apa pun"**: satu-satunya cara
menyalahgunakan ini adalah menembak Worker langsung di `*.workers.dev` sambil memalsukan `Host:
api.fiezel.my.id` — dan yang diperoleh **persis sama** dengan yang diperoleh siapa pun dengan
membuka `https://api.fiezel.my.id` dari browser, karena hostname itu memang publik. Jadi pagar ini
bukan pagar rahasia; ia pagar **permukaan**. Pengendalian penyalahgunaan nyata pindah ke lapis
yang memang untuk itu: gerbang origin (`forbidden_origin`), sesi/cookie, dan kuota
`rate-anon.js` / `ANON_ISSUE_LIMIT_PER_HOUR`. Semua ini ditulis di komentar `mw-edge.js`, dan
assert (h9) memaksa penjelasannya tetap ada.

Sabuk-dan-bretel tambahan yang benar untuk nanti: `workers_dev = false` (sudah ada di
`wrangler.toml`) mematikan permukaan `*.workers.dev` secara struktural, sehingga skenario Host
palsu tidak punya pintu masuk lagi.

### `/health` vs `/healthz` — tidak dilonggarkan

`EDGE_FREE_PATHS = Object.freeze(['/healthz'])` **tidak berubah**. `/healthz` hanya
`{"ok":true,"protocol":"1.7"}`. `/health` memetakan permukaan serang (flag, binding, versi, jalur
gerbang) sehingga **tetap** di belakang gerbang. Assert (h6) menjaga keduanya, termasuk bahwa
`/healthz` **tidak** ikut membocorkan `edgeGuardPath`.

### Pelaporan jalur di `/health`

Field baru `edgeGuardPath`: `"custom-domain"` | `"header"` | `"off"` | `"free-path"` | `"unknown"`.
Field lama `edgeGuard` **tetap** `"on"`/`"off"` — tidak diubah karena `tools/fiezel-health-probe.mjs`
dan `staging-live-test.js` menilai `edgeGuard !== 'on'` sebagai KRITIS; mengubah nilainya akan
memadamkan monitor hidup tanpa alasan.

### Kapan jalur header boleh dihapus

Ditulis di `mw-edge.js` dan `deploy/edge/README.md` §6: butuh (1) zona `Active`, (2) `dig` bersih
lebih lama dari TTL lama, (3) `/health` konsisten `custom-domain` tanpa satu pun `header`,
(4) `workers_dev = false` ter-deploy, (5) `api-index.php` dicabut dari origin. Sesudah itu
`ALLOW_NO_EDGE_SECRET` **DIHAPUS**, bukan disetel `"false"`. **Keputusan milik OWNER, eksekusi
MASTER.**

## 3. Matriks BUKTI MERAH

`node reports/g1-custom-domain-red-proof.mjs` menyuntik satu mutasi pada satu waktu ke berkas
sungguhan, menjalankan gerbang, mencatat butir yang jatuh, lalu memulihkan berkas. Hasil
(`reports/g1-custom-domain-red-proof.json`, `pass: true`):

| Mutasi | Gerbang | exit | Butir yang jatuh |
|---|---|---|---|
| M1 jalur hostname tepercaya dimatikan | edge-guard | 1 | (h1) (h2) (h5) |
| M2 default-allow untuk hostname asing | edge-guard | 1 | (h4) (h6) |
| M3 `*.workers.dev` diloloskan tanpa header | edge-guard | 1 | (a) (b) (e) (f) (h3) (h4) (h6) |
| M4 `/health` dimasukkan ke `EDGE_FREE_PATHS` | edge-guard | 1 | (a)–(f) + (h1)–(h6) |
| M5 `edgeGuardPath` tidak dilaporkan `/health` | edge-guard | 1 | (c) (h1) (h2) (h5) |
| M6 daftar hostname menyimpang dari `wrangler.toml` | edge-guard | 1 | (h7) |
| M7 pencocokan hostname jadi substring | edge-guard | 1 | (h8) |
| M8 hostname dibaca dari `X-Forwarded-Host` | edge-guard | 1 | (h7) |
| M9 bentuk galat hostname asing dibedakan (`forbidden_host`) | edge-guard | 1 | (h4) |
| M10 bab syarat penghapusan jalur header dihapus dari kode | edge-guard | 1 | (h9) |
| M11 penjaga owner ikut meloloskan hostname | owner-edge-guard | 1 | (f) |

Pemulihan **dibuktikan**, bukan diasumsikan: sesudah semua mutasi, `edge-guard-test.js` exit 0 dan
`owner-edge-guard-test.js` exit 0.

Pemetaan ke butir brief: (a) hostname tepercaya lolos tanpa header → h1/h2 (merah lewat M1);
(b) `*.workers.dev` ditolak → h3 (merah lewat M3); (c) hostname asing ditolak → h4 (merah lewat
M2); (d) header sah tetap lolos → h5 (merah lewat M1 jalur pembanding + butir (a)/(b) lama);
(e) header salah ditolak dengan **bentuk galat yang sama** → h4 membandingkan bodi 403 secara
karakter-per-karakter (merah lewat M9); (f) `/health` tidak pernah bebas → h6 (merah lewat M4).

## 4. Gerbang (semua exit 0)

`edge-guard-test` (190/190), `owner-edge-guard-test` (591/591), `edge-proxy-contract-test`,
`edge-proxy-hopbyhop-test`, `cf-api-contract-test`, `cf-wiring-test`, `secret-scan-test`,
`no-network-test`, `coordination-guard-test`, `gate-registry-test`, `regression-test`,
`install-health-test`. Tambahan yang juga kujalankan karena bentuk `/health` berubah:
`health-probe-test`, `config-consistency-test`, `cron-contract-test`, `owner-dashboard-test` —
semuanya exit 0.

Tidak ada berkas gerbang baru, jadi tidak ada yang perlu didaftarkan di
`.github/workflows/quality.yml`. `reports/g1-custom-domain-red-proof.mjs` adalah **alat bukti**,
bukan gerbang CI — ia mengubah berkas sumber sementara, jadi tidak boleh jalan paralel di CI.

## 5. YANG BELUM BISA DIBUKTIKAN (baca ini sebelum mengklaim beres)

1. **Zona masih `pending`.** Tidak satu pun permintaan nyata pernah tiba di Worker lewat
   `api.fiezel.my.id` tanpa header. Semua bukti di atas berasal dari harness in-process
   (`Request` sintetis + stub D1/KV). Yang terbukti: **logika gerbang**. Yang belum: **kenyataan
   jaringan**.
2. **`edgeGuardPath:"custom-domain"` belum pernah terlihat dari luar.** Sampai
   `curl -s https://api.fiezel.my.id/health` benar-benar menjawab itu, status yang benar adalah
   "gerbang siap", bukan "jalur hidup".
3. **Sertifikat edge dan perilaku SSL Full belum diuji dari klien nyata.** Kalau `525/526` muncul,
   itu bukan urusan gerbang ini dan tidak akan terlihat di gerbang mana pun di sini.
4. **Argumen keamanan Host palsu adalah argumen, bukan pengukuran.** Ia bergantung pada premis
   "hostname `api.fiezel.my.id` toh publik". Kalau nanti ada endpoint yang hanya sah dipanggil
   dari origin tertentu, pagar yang benar adalah gerbang origin/sesi, **bukan** gerbang hostname —
   jangan bebani gerbang ini dengan tugas yang bukan miliknya.
5. **Jembatan PHP belum diverifikasi masih hidup sesudah perubahan ini.** Secara logika ia masih
   lolos lewat jalur `header` (diassert h5), tapi ujian sungguhannya adalah curl lewat origin
   ArenHost, dan agen tidak punya SSH/cPanel (`MASTER-ONLY-GOVERNANCE.md`).

Langkah verifikasi lapangan yang harus dijalankan master begitu zona `Active`:

```bash
curl -s https://api.fiezel.my.id/health | grep -o '"edgeGuard[A-Za-z]*":"[a-z-]*"'
# HARUS: "edgeGuard":"on"  dan  "edgeGuardPath":"custom-domain"
curl -s -o /dev/null -w '%{http_code}\n' https://fiezel-api.<sub>.workers.dev/api/config
# HARUS: 403   (kalau 200 => workers_dev belum mati / gerbang bocor)
curl -s https://api.fiezel.my.id/healthz
# HARUS PERSIS: {"ok":true,"protocol":"1.7"}
```
