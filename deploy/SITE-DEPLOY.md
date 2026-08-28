# Menerbitkan FIEZEL ke `fiezel.my.id/app/`

Dokumen ini menjelaskan satu hal: bagaimana commit di `main` sampai ke HP murid, dan apa
yang harus owner pasang sekali supaya jalur itu hidup.

## Kenapa dokumen ini ada

Audit rilis `m025-179` (28 Agu 2026) menyisir seluruh `.github/workflows/` dan menemukan
**nol** mekanisme yang menerbitkan aplikasi ke `https://fiezel.my.id/app/` — permukaan yang
benar-benar dipakai murid. Yang ada hanya deploy Worker Cloudflare dan cermin GitHub Pages.
Akibatnya setiap nomor build di repo adalah **janji**, bukan fakta, sampai ada yang
mengunggahnya dengan tangan — dan paritas produksi tidak pernah bisa dibuktikan.

## Jalurnya sekarang

```
commit ke main
  └─> FIEZEL Quality Gate  (174 gerbang)
        └─ HIJAU ──> FIEZEL Deploy Site
                       1. unggah SELURUH aset          (sw.js ditahan)
                       2. unggah sw.js                 (paling akhir)
                       3. tarik ulang dari situs hidup dan BUKTIKAN penandanya cocok
        └─ MERAH ──> tidak menerbitkan apa pun
```

**Deploy tidak pernah jalan kalau gerbang mutu merah.** Itu interlock yang membuat
"main = produksi" aman.

### Kenapa `sw.js` diunggah terakhir

`sw.js` memanggil `caches.addAll(ASSETS)` atas **157 berkas**. Kalau ia mendarat lebih dulu,
service worker generasi baru mem-precache bita **lama** (atau 404) di bawah nama revisi baru —
murid memegang shell yang tidak sepadan. Satu entri gagal membuat **seluruh** precache gagal.

Urutan ini ditegakkan `deploy-site-gate-test.js` di sumber, bukan diserahkan ke kebiasaan:
membalik urutannya memerahkan CI.

---

## TUGAS OWNER — sekali saja

### Langkah 1 — cek dulu apakah cPanel sudah menarik sendiri

Login cPanel ArenHost → cari menu **Git™ Version Control**.

- **Kalau repo `FIEZEL-APPS` sudah terdaftar di sana** → jalur cPanel sudah hidup.
  `.cpanel.yml` di akar repo sudah berisi resep yang benar (aset dulu, `sw.js` terakhir).
  Tidak perlu secret apa pun. **Lompat ke Langkah 3.**
- **Kalau tidak ada / kosong** → lanjut Langkah 2.

### Langkah 2 — pasang empat secret di GitHub

`Settings → Secrets and variables → Actions → New repository secret`

| Nama secret | Isi | Dari mana |
|---|---|---|
| `FIEZEL_DEPLOY_HOST` | hostname SSH cPanel | cPanel → sidebar kanan, "Shared IP" / nama server |
| `FIEZEL_DEPLOY_USER` | username cPanel | tertulis di sidebar cPanel |
| `FIEZEL_DEPLOY_SSH_KEY` | **kunci privat** OpenSSH | cPanel → SSH Access → Manage SSH Keys → Generate, lalu Authorize, lalu View/Download kunci privatnya |
| `FIEZEL_DEPLOY_PATH` | `/home/<user>/public_html/app` | ganti `<user>` dengan username cPanel |

Opsional:

| Nama | Bawaan | Kapan diisi |
|---|---|---|
| `FIEZEL_DEPLOY_PORT` | `22` | kalau ArenHost memakai port SSH lain |
| `FIEZEL_SITE_BASE` | `https://fiezel.my.id/app` | kalau aplikasi pindah path |

> Tempel kunci privat **utuh**, termasuk baris `-----BEGIN ...-----` dan `-----END ...-----`.
> Kunci privat tidak pernah masuk repo — `secret-scan-test.js` menjaga itu.

### Langkah 3 — buktikan

Kapan saja, dari mana saja, tanpa kredensial:

```bash
node tools/deploy-site-verify.mjs --base https://fiezel.my.id/app
```

Ia mencetak build dan revisi shell yang **benar-benar disajikan produksi**. Kalau angkanya
sama dengan `coordination/BUILD-VERSION.json`, paritas terbukti.

Kalau belum terpasang, `FIEZEL Deploy Site` **tidak gagal dan tidak diam** — ia menulis SKIP
beserta alasannya di ringkasan Actions. SKIP bukan PASS.

---

## Menerbitkan dengan tangan

`Actions → FIEZEL Deploy Site → Run workflow`. Penjaga aktor hanya mengizinkan akun owner
(`FIEZEL-APPS`).

## Kalau deploy merah di langkah pembuktian

Artinya bita sudah terunggah tetapi situs hidup masih menyajikan penanda lama. Urutan
pemeriksaan:

1. Cache origin/CDN belum kedaluwarsa — verifier sudah mencoba ulang 6× tiap 10 detik; kalau
   masih beda, cachenya lebih panjang dari itu.
2. `FIEZEL_DEPLOY_PATH` menunjuk direktori yang salah (aplikasi ada di `public_html/app`,
   **bukan** `public_html`).
3. Ada berkas `.htaccess` yang menyajikan salinan lain.

## Kalau deploy merah di langkah unggah

Cek dulu apakah `rsync` memang ada di server — sebagian shared hosting tidak memasangnya:

```bash
ssh <user>@<host> 'command -v rsync || echo TIDAK-ADA'
```

Kalau `TIDAK-ADA`, jalur cPanel Git Version Control (Langkah 1) adalah pilihan yang benar —
`.cpanel.yml` berjalan di sisi server dan tidak butuh SSH dari GitHub sama sekali. Beri tahu
saya kalau ini yang terjadi; jalur `tar | ssh` bisa dipasang sebagai pengganti, dengan urutan
dua gelombang yang sama persis.

Yang **tidak boleh** dilakukan: melonggarkan tuntutan verifier. Merahnya benar — selama ia
merah, nomor build di repo bukan fakta produksi.

## Batas yang ditulis terbuka

Verifier membuktikan **bita yang disajikan**, bukan bahwa aplikasi berjalan benar di
perangkat murid. Yang terakhir itu tugas gerbang E2E browser
(`tools/fiezel-e2e-bridge.mjs`).
