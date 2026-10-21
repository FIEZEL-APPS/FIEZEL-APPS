# S7 — Pemantauan arsitektur jembatan edge (`roll/s7monitor`)

Ringkas: satu skrip pemantauan yang bisa dijalankan berulang (`tools/fiezel-health-probe.mjs`),
satu runbook mini (`tools/fiezel-health-probe.md`), dan satu gerbang CI
(`tests/health-probe-test.js`) yang menjaga sifat-sifat yang paling mudah rusak diam-diam.
**Versi build TIDAK dinaikkan** (`VERSION.json` tetap `5.19.0`).

---

## 1. Yang dibuat

| Berkas | Isi |
|---|---|
| `tools/fiezel-health-probe.mjs` | Probe Node murni (>=18), nol dependency, nol rahasia, nol berkas temporer (hanya menulis kalau diberi `--out=`). Mode: produksi, `--json`, `--selftest`, `--selftest --scenario=<nama>`. |
| `tools/fiezel-health-probe.md` | Cara menjalankan (termasuk contoh cron), arti tiap status + exit code, dan runbook mini per gejala untuk kedelapan pemeriksaan. |
| `tests/health-probe-test.js` | Gerbang: 49 assert, menjalankan probe sungguhan dalam 13 skenario loopback. |
| `.github/workflows/quality.yml` | Dua langkah baru sesudah `tests/edge-guard-test.js`: `node tests/health-probe-test.js` dan `node tools/fiezel-health-probe.mjs --selftest`. **Tidak ada** pemanggilan mode produksi di CI. |

## 2. Pemeriksaan dan derajatnya

| id | Kontrak | KRITIS bila | PERINGATAN bila |
|---|---|---|---|
| `situs_utama` | `https://fiezel.my.id/` = 200 | bukan 200 / tak terhubung | — |
| `situs_aplikasi` | `https://fiezel.my.id/app/` = 200 | bukan 200 | — |
| `jembatan_health` | `https://api.fiezel.my.id/health` = 200 + `protocol:"1.7"` + `edgeGuard:"on"` | bukan 200, bukan JSON, protokol beda, `edgeGuard != "on"` | latensi > 2x acuan hangat |
| `jembatan_healthz` | `https://api.fiezel.my.id/healthz` = 200, `ok:true`, `protocol:"1.7"`, **tanpa** `capabilities` | bukan 200 / bentuk salah / membocorkan `capabilities` | latensi > 2x acuan hangat |
| `penjaga_workers_dev` | `https://fiezel-api.fitrajft.workers.dev/health` = **403** | **200** (penjaga edge mati = celah terbuka) | status lain (404/5xx/timeout) |
| `sertifikat_api` | sisa umur sertifikat | kedaluwarsa atau handshake TLS gagal | sisa < 21 hari |
| `dns_mx` | MX `fiezel.my.id` ada | tidak ada MX (email memantul total) | — |
| `dns_spf` | tepat satu TXT `v=spf1` | — | nol atau lebih dari satu (permerror) |
| `batas_plan_gratis` | — | — | — (status `INFO`, lihat §5) |

Exit code: **1** bila ada KRITIS, **0** bila hanya PERINGATAN. Keputusan itu sadar —
monitor yang memerah pada peringatan akan dimatikan orang, dan monitor yang dimatikan
tidak melindungi apa pun.

## 3. Acuan latensi: memakai angka terukur yang sudah ada, bukan mengarang baru

`deploy/edge/README.md` §5 mencatat hop jembatan PHP pada `/health`: **2.214 ms dingin**,
**~1.051–1.163 ms hangat**. Probe memakai **1.163 ms** sebagai acuan hangat dan memberi
PERINGATAN bila latensi > **2x** (2.326 ms) untuk dua pemeriksaan yang benar-benar
melewati hop itu (`jembatan_health`, `jembatan_healthz`).

Pemeriksaan lain (situs statis, `workers.dev`, TLS, DNS) **tidak punya angka terukur**,
jadi latensinya dilaporkan tetapi `acuanMs: null` dan tidak ada ambang. Memberi ambang
karangan pada empat pemeriksaan akan membuat separuh peringatan probe ini tidak berarti.
Gerbang meng-assert kedua angka acuan masih cocok dengan teks README (kalau README
berubah dan probe tidak, CI merah).

## 4. Aturan nol rahasia — dan bagaimana ia dipaksa

- Probe tidak membaca `process.env` sama sekali (di-assert), tidak mengirim header edge,
  dan tidak menyebut nama secret di dalam kode.
- `/health` dilindungi penjaga edge, jadi probe memeriksanya **lewat jembatan**
  `api.fiezel.my.id` — origin PHP-lah yang menyisipkan header. Payload `protocol` dan
  `edgeGuard` tetap bisa diperiksa **tanpa** memegang secret.
- `/healthz` dipakai sebagai jalur bebas-header, sesuai alasan aslinya di
  `deploy/edge/README.md` §4(e). Probe juga memeriksa arah sebaliknya: `/healthz` yang
  mulai mengumumkan `capabilities` = KRITIS.
- Himpunan host di dalam probe **tertutup**: `api.fiezel.my.id`, `fiezel.my.id`,
  `fiezel-api.fitrajft.workers.dev`, `127.0.0.1`. Host lain = gerbang merah.
- Pemindaian rahasia dibagi dua kelas: **nama/mekanisme** dipindai pada kode (komentar
  boleh menjelaskan header edge — kalau komentar dihukum, orang menghapus penjelasannya
  alih-alih memperbaiki kodenya), **nilai** (kunci privat, token panjang, kata sandi)
  dipindai pada sumber mentah, komentar ikut. Keduanya punya fixture anti-vakum yang
  membuktikan polanya bisa merah.

## 5. Batas plan gratis: dilaporkan, bukan dipalsukan

CPU 10 ms/request, KV 1.000 tulis/hari, Workers AI 10.000 neuron/hari
(`docs/CF-MIGRATION-RUNBOOK.md` Bagian 5) **tidak bisa** dibaca dari luar tanpa token
akun Cloudflare. Menaruh token di skrip yang dijalankan cron = memindahkan kunci akun ke
tempat paling mudah bocor. Jadi pemeriksaan `batas_plan_gratis` berstatus `INFO` dan
memuat ambang tindak + tempat melihatnya (p99 CPU > 8 ms atau error 1102; > 700 tulis
KV/hari; > 8.000 neuron/hari), bukan angka palsu. Ini kekurangan yang diketahui, bukan
yang disembunyikan.

## 6. Selftest: nol jaringan, dan itu diperiksa

`--selftest` menyalakan server HTTP loopback (`127.0.0.1`, port 0 dipilih kernel) plus
lapis fixture TLS/DNS, lalu menjalankan **pipeline penilaian yang sama** pada 13 skenario:
`sehat`, `workers_dev_terbuka`, `workers_dev_404`, `penjaga_off`, `protokol_tidak_cocok`,
`api_mati`, `situs_mati`, `healthz_membocorkan`, `latensi_tinggi`, `sertifikat_mendekat`,
`sertifikat_kedaluwarsa`, `mx_hilang`, `spf_hilang`.

Lapis I/O selftest **menolak** host non-loopback dan mencatat pelanggarannya di
`jaringan.nonLoopbackAttempts`; gerbang membaca angka itu untuk setiap skenario yang ia
jalankan, dan juga memeriksa bahwa **semua** target adalah `http://127.0.0.1:…`,
`tls://…`, atau `dns://fixture`.

Yang dijaga gerbang, sesuai permintaan paket kerja:
- (a) nol rahasia + himpunan host tertutup (tidak ada alamat internal Cloudflare selain
  `workers.dev` yang memang harus diuji 403);
- (b) `workers.dev` 200 = **KRITIS**, dan dari arah sebaliknya `403` = **OK** — arah ini
  paling mudah terbalik, jadi kedua arah diuji, plus pesan galatnya harus menyebut
  celahnya (bukan hanya kode status);
- (c) exit non-nol untuk 6 skenario kritis, exit **0** untuk 4 skenario peringatan-saja;
- (d) tidak menembak jaringan dalam `--selftest`.

### Catatan jujur soal `tests/no-network-test.js`

`tests/no-network-test.js` memindai `readdirSync(root)` dengan pola
`-(test|audit|selftest).js$` — **hanya berkas gerbang di akar repo**. Karena itu
`tools/fiezel-health-probe.mjs` tidak pernah masuk pemindaiannya (sama seperti
`tools/cf-test-harness.js`), dan **tidak** ditambahkan ke allowlist mana pun di sana:
tiga kelas allowlist di berkas itu bicara tentang *gerbang*, bukan *alat*, dan
menambahkan nama ke sana akan mengubah assert ukuran daftar (`SOCKET_ALLOWLIST.size === 3`,
`TRAP_ONLY_ALLOWLIST.size === 1`, `ENV_GATED_LIVE_ALLOWLIST.size === 1`) tanpa alasan
arsitektur. Yang menjaga CI tetap bebas jaringan adalah dua hal yang diperiksa:
`quality.yml` hanya memanggil probe dengan `--selftest` (di-assert), dan probe menolak
host non-loopback dalam mode itu (di-assert per skenario). `tests/health-probe-test.js` sendiri
tetap ikut dipindai `tests/no-network-test.js` — dan lolos, karena ia hanya `spawnSync` probe,
tanpa modul socket dan tanpa `fetch` remote.

## 7. Verifikasi (dijalankan di worktree ini, Node v20.20.1)

| Perintah | Hasil |
|---|---|
| `node tests/health-probe-test.js` | **exit 0** — PASS, 49 assert, 13 skenario selftest |
| `node tools/fiezel-health-probe.mjs --selftest` | **exit 0** — PASS 13/13 skenario, 0 percobaan non-loopback |
| `node tests/no-network-test.js` | **exit 0** — PASS, 35 assert, 128 gerbang dipindai (naik dari 127: `tests/health-probe-test.js` ikut dipindai dan lolos) |
| `node tests/regression-test.js` | **exit 0** — PASS |
| `node tests/install-health-test.js` | **exit 0** — PASS |

## 8. Probe SUNGGUHAN terhadap produksi — dijalankan sekali, dilaporkan apa adanya

`node tools/fiezel-health-probe.mjs` — 2026-08-27T16:28:48.135Z (WIB 27 Agu 2026, 23:28),
**exit 0**, `KRITIS 0 | PERINGATAN 0 | OK 8 | INFO 1`:

| Pemeriksaan | Hasil | Latensi |
|---|---|---|
| `situs_utama` | OK — HTTP 200 | 833 ms |
| `situs_aplikasi` | OK — HTTP 200 | 249 ms |
| `jembatan_health` | OK — HTTP 200, `protocol:"1.7"`, `edgeGuard:"on"`, `plan:"free-tier"` | 847 ms |
| `jembatan_healthz` | OK — HTTP 200, `{"ok":true,"protocol":"1.7"}`, tanpa `capabilities` | 760 ms |
| `penjaga_workers_dev` | OK — HTTP **403** (`forbidden_edge`), penjaga edge hidup | 132 ms |
| `sertifikat_api` | OK — sisa **89 hari**, kedaluwarsa `Nov 25 14:16:49 2026 GMT`, penerbit Let's Encrypt, CN `www.api.fiezel.my.id` | 484 ms |
| `dns_mx` | OK — 1 record: `fiezel.my.id (0)` | 482 ms |
| `dns_spf` | OK — `v=spf1 +a +mx +ip4:195.88.211.212 include:spf-c.mailbaby.net ~all` | 482 ms |
| `batas_plan_gratis` | INFO — tidak diukur (butuh token akun) | — |

Catatan apa adanya, bukan dipoles:

1. **Latensi lebih rendah dari acuan hangat.** `/health` 847 ms dan `/healthz` 760 ms,
   di bawah acuan 1.163 ms. Sebabnya jujur: jembatan sudah **hangat** karena beberapa
   permintaan verifikasi manual dijalankan beberapa menit sebelumnya pada sesi yang sama.
   Angka ini **bukan** bukti jembatan menjadi lebih cepat, dan acuan di probe **tidak**
   diturunkan berdasarkan satu pengukuran.
2. **`/healthz` pernah 2.071 ms pada permintaan pertama** saat verifikasi manual sebelum
   probe dijalankan — konsisten dengan angka "dingin" 2.214 ms di README, dan sudah di
   bawah ambang PERINGATAN 2.326 ms tetapi hanya **tipis**. Artinya panggilan pertama
   setelah idle memang bisa memicu PERINGATAN latensi pada jalankan berikutnya. Itu
   perilaku yang diinginkan (ambang menandai hop dingin yang memburuk), bukan bug — tetapi
   siapa pun yang menjalankan probe dari cron tiap 10 menit perlu tahu bahwa peringatan
   latensi pertama pagi hari kemungkinan besar hop dingin, bukan kerusakan.
3. **Subjek sertifikat adalah `www.api.fiezel.my.id`**, bukan `api.fiezel.my.id` —
   AutoSSL cPanel menerbitkan satu sertifikat yang mencakup keduanya. Handshake dengan SNI
   `api.fiezel.my.id` berhasil, jadi rantainya benar; ini dicatat karena membaca `subject`
   saja bisa membuat orang berikutnya menyangka host-nya salah.
4. **MX menunjuk ke domain itu sendiri** (`fiezel.my.id`, prioritas 0) — normal untuk
   mail cPanel di origin yang sama, dan konsisten dengan SPF yang memuat
   `+ip4:195.88.211.212` (IP origin ArenHost) plus `include:spf-c.mailbaby.net`.
5. **Batas plan gratis tetap tidak terpantau otomatis.** Selama tidak ada token akun yang
   boleh dipegang skrip cron, tiga ambang itu hanya bisa dilihat manual di dashboard.
   Kalau nanti pemantauan otomatis benar-benar dibutuhkan, jalannya bukan menaruh token di
   probe ini, melainkan endpoint ringkas ber-owner di Worker yang sudah punya gerbang CI.

## Sumber

- `deploy/edge/README.md` — §3 (celah `workers.dev`), §4 (urutan pemasangan + curl
  verifikasi, kenapa monitor eksternal wajib ke `/healthz`), §5 (2.214 ms dingin /
  ~1.051–1.163 ms hangat), §6 (pembongkaran jembatan).
- `docs/CF-MIGRATION-RUNBOOK.md` — Bagian 5 (tabel keputusan batas plan gratis: CPU 10 ms,
  KV 1.000 tulis/hari, Workers AI 10.000 neuron/hari).
- `workers/api/mw-edge.js`, `workers/api/route-health.js`, `tests/edge-guard-test.js` — penjaga
  edge dari dalam; probe ini melengkapinya dari luar.
- Batas Workers: https://developers.cloudflare.com/workers/platform/limits/
- Batas KV: https://developers.cloudflare.com/kv/platform/limits/
- Harga Workers AI: https://developers.cloudflare.com/workers-ai/platform/pricing/
