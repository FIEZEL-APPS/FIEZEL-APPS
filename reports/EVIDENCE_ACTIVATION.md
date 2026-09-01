# Menyalakan lane bukti belajar Braincore (fiezel-evidence)

Panduan langkah demi langkah untuk Owner (bukan developer) — dijalankan dari
laptop sendiri, bukan dari chat. Setiap perintah diketik di **Terminal**
(Windows: PowerShell; Mac: Terminal.app), satu baris, tekan Enter, tunggu
selesai sebelum baris berikutnya.

Urutannya wajib dari atas ke bawah. Melompat ke tengah biasanya berujung error
yang membingungkan karena langkah sebelumnya belum ada.

## 0. Persiapan satu kali

```
node -v
```
Harus mencetak `v20` atau lebih baru. Kalau tidak dikenali, pasang dari
https://nodejs.org (tombol LTS), lalu tutup-buka Terminal dan ulangi.

```
git clone https://github.com/FIEZEL-APPS/FIEZEL-APPS.git
cd FIEZEL-APPS
```
(lewati `git clone` kalau foldernya sudah ada di laptop — cukup `cd` ke sana)

```
npx wrangler@3 login
```
Browser terbuka, klik **Allow** di halaman Cloudflare, kembali ke Terminal.
Harus muncul "Successfully logged in". **Kalau langkah ini gagal, berhenti
dan minta bantuan — semua langkah berikutnya butuh ini.**

## 1. Buat database `fiezel-evidence`

```
cd workers/api
npx wrangler@3 d1 create fiezel-evidence
```

## 2. Terapkan migrasi (buat tabel-tabelnya)

```
npx wrangler@3 d1 execute fiezel-evidence --remote --file=migrations/0008_evidence.sql
```
`--remote` wajib ada, jangan dihapus.

Cek:
```
npx wrangler@3 d1 execute fiezel-evidence --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```
Harus muncul 3 baris: `evidence_daily`, `evidence_dedup`, `evidence_learner_day`.

## 3. Tempel binding ke Worker live (skrip otomatis, anti salah-akun)

Ini satu-satunya bagian yang **manual sekali** — sesudah ini CI mengurus
sendiri di setiap deploy berikutnya.

```
cp wrangler.toml /tmp/wrangler.toml.asli
node tools/attach-live-bindings.mjs
```

Skrip ini membaca daftar database & KV di akun Anda lewat `wrangler`, lalu
mengisi `wrangler.toml` — **tanpa Anda copy-paste UUID apa pun**. Ia
mencocokkan nama database secara **persis** (`fiezel-core`, bukan
`fiezel-core-staging`), jadi database staging tidak akan pernah tertukar ke
Worker produksi. Logika ini diuji di `attach-live-bindings-test.js` (jalan
otomatis di CI setiap PR).

Setelah skrip selesai, **wajib** periksa sebelum deploy:
```
grep -n "staging" wrangler.toml
```
Baris ini **harus tidak mencetak apa pun**. Kalau mencetak sesuatu, JANGAN
lanjut ke `wrangler deploy` — screenshot dan minta bantuan.

Lalu deploy dan kembalikan berkas ke bentuk template:
```
npx wrangler@3 deploy
cp /tmp/wrangler.toml.asli wrangler.toml
git status
```
Baris terakhir (`git status`) harus bersih — `wrangler.toml` tidak boleh
tercatat berubah. Kalau tercatat berubah, jangan `git add`/`git commit`.

## 4. Secret `OWNER_TOKEN_HASH` di Worker `fiezel-api`

Satu token owner, dua Worker — nilainya harus **identik** dengan yang sudah
dipakai login di `owner.fiezel.my.id`.

```
printf '%s' 'TOKEN_OWNER_ANDA' | sha256sum | cut -d' ' -f1
```
Salin hex 64 karakter yang keluar, lalu:
```
npx wrangler@3 secret put OWNER_TOKEN_HASH
```
(masih di folder `workers/api`) — tempel hash tadi saat diminta.

Tanpa langkah ini, `/api/owner/braincore-evidence` selalu menjawab 403.

## 5. Secret di Worker `fiezel-owner`

```
cd ../owner
npx wrangler@3 secret put EVIDENCE_API_BASE
```
isi: `https://api.fiezel.my.id`
```
npx wrangler@3 secret put EVIDENCE_API_TOKEN
```
isi: token owner **mentah** (bukan hash-nya — beda dengan langkah 4).

```
npx wrangler@3 deploy
```

Di titik ini panel di `owner.fiezel.my.id` sudah berubah dari "BELUM
DIKONFIGURASI" menjadi "PENGUKURAN BELUM TERSEDIA" — itu tanda jalur
owner→api sudah tersambung.

## 6. Nyalakan flag server (lewat PR, bukan dashboard)

`workers/api/wrangler.toml` baris `EVIDENCE_ENABLED = "off"` → `"on"`, lalu
PR dan merge. Alasan lewat PR: `deploy-api-worker.yml` menimpa ulang vars dari
repo setiap deploy, jadi override manual di dashboard Cloudflare akan hilang.

Setelah merge, jalankan workflow deploy di:
https://github.com/FIEZEL-APPS/FIEZEL-APPS/actions/workflows/deploy-api-worker.yml
→ tombol **Run workflow** (hanya login `FIEZEL-APPS` yang bisa).

## 7. Nyalakan emitter di aplikasi

`features/telemetry/fiezel-telemetry-config.js`, bagian `evidence`:
```
mode: 'on',
endpoint: 'https://api.fiezel.my.id/api/braincore/evidence',
```
Sarannya: coba `mode: 'local'` dulu (event dibangun & diantre di perangkat,
tidak dikirim) sebelum `'on'`.

Menyentuh app = wajib bump `FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, `SW_REV`
bersamaan (+1 dari `m025-N` saat ini), lalu jalankan
`deploy-site.yml`.

Kadens kirim: maksimal sekali sehari per perangkat — angka pertama baru
muncul dalam hitungan jam, bukan menit.

## 8. Membaca panel dashboard

| Tampilan | Artinya | Langkah yang kurang |
|---|---|---|
| BELUM DIKONFIGURASI | secret owner belum ada | 5 |
| TIDAK TERSEDIA (status N) | 403 = hash token tidak cocok | 4 |
| PENGUKURAN BELUM TERSEDIA | binding/migrasi belum ada di api | 1–3 |
| BELUM ADA PENGUKURAN pada periode ini | semua hidup, belum ada batch masuk | 6–7, atau tunggu |
| tabel + tren | beres | — |

## Sudah otomatis, tidak perlu dikerjakan manual

- Purge TTL cohort (14 hari) — cron `5 17 * * *` sudah terpasang.
- Rute owner — sudah terdaftar.
- Deploy `fiezel-api` berikutnya — CI membaca ID binding sendiri sesudah
  langkah 3 selesai sekali.
