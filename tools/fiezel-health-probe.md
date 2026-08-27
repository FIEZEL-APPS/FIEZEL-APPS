# `tools/fiezel-health-probe.mjs` — pemantauan yang bisa dijalankan berulang

Probe kesehatan produksi FIEZEL untuk arsitektur **jembatan edge**: origin PHP
ArenHost (`api.fiezel.my.id`) → Worker Cloudflare `fiezel-api`. Node murni (>=18),
**nol dependency**, **nol rahasia**, aman dijalankan berulang kali (tidak menulis
apa pun kecuali diminta `--out=`).

Gerbang yang menjaga berkas ini: `health-probe-test.js` (terdaftar di
`.github/workflows/quality.yml`, **hanya** dalam mode `--selftest`).

---

## 1. Cara menjalankan

```bash
# Produksi: ringkasan Bahasa Indonesia + blok JSON. Exit 1 kalau ada KRITIS.
node tools/fiezel-health-probe.mjs

# Untuk cron / alat lain: JSON murni di stdout.
node tools/fiezel-health-probe.mjs --json

# Simpan JSON ke berkas (aman dipanggil berulang; hanya berkas ini yang ditulis).
node tools/fiezel-health-probe.mjs --json --out=/tmp/fiezel-health.json

# Selftest: 13 skenario, server HTTP loopback + fixture TLS/DNS. NOL jaringan luar.
node tools/fiezel-health-probe.mjs --selftest

# Satu skenario dengan semantik exit code nyata (dipakai gerbang CI).
node tools/fiezel-health-probe.mjs --selftest --scenario=workers_dev_terbuka
```

Contoh cron tiap 10 menit yang hanya berbunyi saat KRITIS:

```cron
*/10 * * * * cd /path/FIEZEL-APPS && node tools/fiezel-health-probe.mjs --json --out=/var/log/fiezel-health.json >/dev/null || \
  mail -s 'FIEZEL KRITIS' owner@example.com < /var/log/fiezel-health.json
```

### Aturan yang tidak boleh dilanggar: nol rahasia

- Probe ini **TIDAK memuat rahasia**, tidak membaca `process.env`, dan tidak
  mengirim header `X-Fiezel-Edge`.
- `/health` dilindungi penjaga edge. Probe memeriksanya **lewat jembatan**
  `api.fiezel.my.id`, karena origin PHP-lah yang menyisipkan header itu. Jadi
  payload `/health` (`protocol`, `edgeGuard`) tetap bisa diperiksa **tanpa**
  memegang `EDGE_SHARED_SECRET`.
- `/healthz` ada persis untuk ini: jalur bebas-header untuk monitor eksternal, dan
  ia **tidak boleh** mengumumkan `capabilities` (deploy/edge/README.md §4(e)).
- Satu-satunya alamat internal yang disebut adalah
  `fiezel-api.fitrajft.workers.dev`, dan **hanya** untuk membuktikan ia menjawab
  403. Kalau suatu hari ada yang menambah host lain atau satu header rahasia,
  `health-probe-test.js` merah.

---

## 2. Arti tiap status

| Status | Arti | Exit code |
|---|---|---|
| `OK` | Pemeriksaan sesuai kontrak. | tidak memengaruhi |
| `PERINGATAN` | Belum merugikan murid, tetapi akan menjadi kritis kalau dibiarkan: latensi > 2x acuan, sertifikat < 21 hari, SPF hilang/ganda, status `workers.dev` tak terduga selain 200. | **exit 0** (sengaja: monitor yang memerah pada peringatan akan dimatikan orang) |
| `KRITIS` | Murid terdampak sekarang, atau celah keamanan terbuka: situs/API mati, penjaga edge mati (`workers.dev` 200 atau `edgeGuard:"off"`), `protocol` tidak cocok, `/healthz` membocorkan `capabilities`, sertifikat kedaluwarsa/handshake gagal, MX hilang. | **exit 1** |
| `INFO` | Sengaja tidak diukur, dilaporkan apa adanya (batas plan gratis — butuh token akun, dan probe tidak memuat token). | tidak memengaruhi |

**Acuan latensi** (terukur, `deploy/edge/README.md` §5): hop jembatan PHP pada
`/health` **2.214 ms dingin**, **~1.051–1.163 ms hangat**. Probe memakai **1.163 ms**
sebagai acuan hangat dan memberi PERINGATAN bila > **2x** (2.326 ms). Pemeriksaan
yang **belum punya angka terukur** (situs statis, `workers.dev`, TLS, DNS) tetap
melaporkan latensinya tetapi **tidak** memberi peringatan latensi — lebih baik jujur
tanpa ambang daripada memakai ambang karangan.

**Arah yang mudah terbalik:** pada `fiezel-api.fitrajft.workers.dev`,
**403 = SEHAT** dan **200 = KRITIS**. Refleks monitor biasa ("200 berarti hidup")
justru salah di sini.

---

## 3. Runbook mini per gejala

### `situs_utama` KRITIS (`https://fiezel.my.id/` bukan 200)
Situs murid mati. Ini origin ArenHost, bukan Cloudflare.
1. cPanel → apakah akun kena batas proses / disk penuh / suspend.
2. `curl -I https://fiezel.my.id/` — 5xx = origin hidup tapi salah; timeout = origin mati.
3. Kalau origin mati, API juga akan mati (jembatan PHP ada di origin yang sama) —
   periksa `jembatan_health` untuk memastikan cakupan dampaknya.

### `situs_aplikasi` KRITIS (`/app/` bukan 200 padahal halaman depan 200)
Bukan masalah hosting, tetapi berkas. Curigai unggahan terakhir: `~/public_html/app/`
kehilangan `index.html`, atau `.htaccess` baru menahan direktori itu.

### `jembatan_health` KRITIS
Tiga sebab berbeda, tindakannya berbeda:
- **HTTP bukan 200** → origin PHP atau Worker mati. Bandingkan dengan
  `penjaga_workers_dev`: kalau alamat `workers.dev` menjawab 403 (bukan timeout),
  Worker hidup ⇒ masalahnya di jembatan PHP (`~/public_html/api/index.php`,
  `.htaccess`, batas proses PHP).
- **`edgeGuard` bukan `"on"`** → secret Worker hilang/tidak sinkron. **Celah §3
  `deploy/edge/README.md` sedang terbuka.** Pasang ulang dengan urutan yang benar:
  **PROXY DULU, Worker belakangan** (urutan terbalik = jendela 403 untuk semua murid).
- **`protocol` bukan `1.7`** → Worker dan kontrak klien beda versi. Jangan
  "perbaiki" dengan mengubah angka di probe; cari deploy Worker yang tertinggal.

### `jembatan_healthz` KRITIS
Jalur bebas-header untuk monitor eksternal. Kalau `/health` hidup tetapi `/healthz`
mati, sebab paling sering: `/healthz` keluar dari `const ALLOW` di
`~/public_html/api/index.php` (proxy menolak default). Kalau `/healthz` justru
mengembalikan `capabilities`, itu KRITIS ke arah lain: rute bebas-header sedang
membocorkan peta permukaan serang — kembalikan ke persis `{"ok":true,"protocol":"1.7"}`.

### `penjaga_workers_dev` KRITIS (200)
**Celah keamanan terbuka.** Siapa pun bisa `POST /api/auth/anon` langsung ke Worker,
melewati jembatan: setiap penerbitan menulis baris D1 dan membawa jatah gratis
sendiri (D1 plan gratis + kuota AI/TTS akun terkuras).
1. Pastikan `EDGE_SHARED_SECRET` terpasang di **proxy** (`~/public_html/api/index.php`).
2. Baru `cd workers/api && npx wrangler@3 secret put EDGE_SHARED_SECRET` dengan nilai **sama**.
3. Verifikasi: `/health` lewat jembatan → `edgeGuard:"on"`; `workers.dev/health` → 403.
4. Jangan pernah balik urutannya.

`penjaga_workers_dev` PERINGATAN (404/5xx/timeout): belum tentu celah, tetapi tidak
sesuai kontrak — periksa apakah Worker baru saja di-deploy ulang atau `workers_dev`
sudah dimatikan (kalau memang dimatikan, perbarui probe dan `deploy/edge/README.md` §6).

### `sertifikat_api` PERINGATAN (< 21 hari) / KRITIS (kedaluwarsa atau handshake gagal)
Sertifikat `api.fiezel.my.id` diterbitkan Let's Encrypt lewat AutoSSL cPanel dan
diperbarui otomatis ~30 hari sebelum kedaluwarsa. **Sisa < 21 hari berarti pembaruan
otomatis sudah gagal minimal sekali.**
1. cPanel → Security → **SSL/TLS Status** → centang host → **Run AutoSSL**.
2. Kalau gagal: AutoSSL butuh HTTP-01 — pastikan `/.well-known/acme-challenge/` tidak
   diblokir `.htaccess` di `~/public_html/api/`.
3. Kedaluwarsa = seluruh API murid mati dengan galat TLS, bukan HTTP. Perlakukan
   seperti pemadaman.

### `dns_mx` KRITIS (tidak ada MX)
Email domain mati total — surat masuk memantul, dan pemulihan kata sandi/notifikasi
tidak sampai. Pulihkan record MX di panel DNS reseller (ArenHost → PT Digital
Registra). Catat nilai MX yang benar sebelum perubahan DNS berikutnya (migrasi
nameserver ke Cloudflare, `docs/CF-MIGRATION-RUNBOOK.md` Bagian 1(c), adalah momen
paling sering MX hilang).

### `dns_spf` PERINGATAN (SPF hilang atau lebih dari satu)
Email keluar akan masuk spam atau ditolak. Harus **tepat satu** record TXT
`v=spf1 …`; dua record = `permerror` dan efeknya sama dengan tidak punya SPF.

### `batas_plan_gratis` INFO
Probe **tidak** mengukurnya (butuh token akun Cloudflare — dan probe ini tidak
memuat rahasia). Periksa manual di dashboard, ambang dari
`docs/CF-MIGRATION-RUNBOOK.md` Bagian 5:
- **CPU 10 ms/request** → tindak bila p99 > 8 ms atau ada **satu pun** error 1102.
  Gejalanya: AI/TTS gagal **acak** padahal internet baik.
- **KV 1.000 tulis/hari** → tindak bila > 700/hari. Mendekati 1.000 biasanya **bug**
  (sesuatu menulis KV per-request), bukan alasan upgrade.
- **Workers AI 10.000 neuron/hari** (kolam **seluruh akun**) → tindak bila > 8.000
  (`GLOBAL_NEURON_CAP = 8000`). Perbaikan yang benar adalah **pra-render**, bukan upgrade.

---

## 4. Selftest: kenapa ada, dan apa yang dibuktikannya

`--selftest` menyalakan server HTTP **loopback** (`127.0.0.1`, port 0 dipilih kernel)
dan lapis fixture untuk TLS/DNS, lalu menjalankan **pipeline penilaian yang sama**
terhadap 13 skenario: `sehat`, `workers_dev_terbuka`, `workers_dev_404`,
`penjaga_off`, `protokol_tidak_cocok`, `api_mati`, `situs_mati`,
`healthz_membocorkan`, `latensi_tinggi`, `sertifikat_mendekat`,
`sertifikat_kedaluwarsa`, `mx_hilang`, `spf_hilang`.

Dalam mode selftest, lapis I/O **menolak** host non-loopback dan **mencatat**
pelanggaran di `jaringan.nonLoopbackAttempts` — jadi klaim "tidak menembak jaringan"
diperiksa, bukan dipercaya. `health-probe-test.js` membaca angka itu, dan CI hanya
pernah memanggil probe dengan `--selftest`, sehingga **tidak ada** push yang menembak
produksi.

## Sumber

- `deploy/edge/README.md` — §3 (celah `workers.dev` dan kenapa header wajib), §4
  (urutan pemasangan secret + curl verifikasi), §5 (angka latensi terukur), §6 (pembongkaran).
- `docs/CF-MIGRATION-RUNBOOK.md` — Bagian 5 (tabel keputusan batas plan gratis).
- `workers/api/mw-edge.js`, `workers/api/route-health.js` — penegakan penjaga dan
  alasan `/health` dilindungi sementara `/healthz` tidak.
- `edge-guard-test.js` — gerbang yang menguji penjaga dari dalam (Worker sungguhan);
  probe ini melengkapinya dari luar (produksi yang sedang berjalan).
- Batas Workers (CPU 10 ms Free): https://developers.cloudflare.com/workers/platform/limits/
- Batas KV (1.000 tulis/hari Free): https://developers.cloudflare.com/kv/platform/limits/
- Harga Workers AI (10.000 neuron/hari gratis): https://developers.cloudflare.com/workers-ai/platform/pricing/
