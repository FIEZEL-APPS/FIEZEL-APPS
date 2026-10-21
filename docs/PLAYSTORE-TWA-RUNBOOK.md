# Runbook — FIEZEL ke Google Play lewat TWA

Tujuan: FIEZEL muncul di Play Store sebagai aplikasi Android, tanpa menulis ulang apa pun.
TWA (Trusted Web Activity) membungkus PWA yang sudah ada menjadi paket Android.

**Kenapa ini penting:** di Indonesia orang mencari aplikasi di Play Store, bukan di Google.
PWA tanpa listing Play Store praktis tidak terlihat oleh mayoritas calon murid.

---

## Yang harus disiapkan pemilik (tidak bisa dikerjakan dari repo)

| Item | Keterangan |
| --- | --- |
| Akun Google Play Console | USD 25, sekali bayar seumur hidup |
| JDK 17+ | Bubblewrap butuh ini untuk membangun paket |
| Node.js 18+ | Untuk menjalankan Bubblewrap CLI |
| Akses tulis ke `~/public_html/` ArenHost | Untuk memasang `assetlinks.json` |

---

## Langkah

### 1. Pasang Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### 2. Inisialisasi proyek TWA

Jalankan di direktori KOSONG di luar repo ini (proyek Android tidak perlu masuk repo):

```bash
bubblewrap init --manifest https://fiezel.my.id/app/manifest.json
```

Jawaban yang harus dipakai supaya cocok dengan `website/.well-known/assetlinks.json`:

| Pertanyaan | Jawaban |
| --- | --- |
| Application ID / package name | `id.my.fiezel.twa` |
| Host | `fiezel.my.id` |
| Start URL | `/app/` |
| Display mode | `standalone` |

Kalau kamu memilih package name lain, **ubah juga `package_name` di
`website/.well-known/assetlinks.json`** — kalau tidak, verifikasi akan gagal diam-diam.

### 3. Bangun paket

```bash
bubblewrap build
```

Keluarannya `app-release-bundle.aab` (untuk diunggah ke Play) dan `app-release-signed.apk`
(untuk uji pasang langsung ke HP).

### 4. Ambil DUA sidik jari — ini bagian yang paling sering salah

Digital Asset Links butuh sidik jari SHA-256 dari kunci yang **benar-benar menandatangani
aplikasi saat sampai ke pengguna**. Sejak Play App Signing menjadi bawaan, ada **dua** kunci
berbeda, dan keduanya harus terdaftar:

**a. Upload key** — kunci lokalmu, dipakai saat uji pasang APK langsung:

```bash
bubblewrap fingerprint list
```

**b. Play App Signing key** — kunci Google, dipakai untuk aplikasi yang diunduh dari Play
Store. Ambil di:

> Play Console → aplikasimu → **Test and release** → **Setup** → **App integrity**
> → tab **App signing** → salin **SHA-256 certificate fingerprint**

Kunci ini **baru ada setelah** kamu mengunggah `.aab` pertama kali. Jadi urutannya:
unggah dulu → ambil sidik jari → baru isi `assetlinks.json`.

> **Gejala kalau langkah ini terlewat:** aplikasi terbuka, tapi ada bilah alamat peramban
> di atas layar. Itu tandanya verifikasi Digital Asset Links gagal — bukan bug aplikasi.

### 5. Isi dan pasang `assetlinks.json`

Sunting `website/.well-known/assetlinks.json`, ganti kedua placeholder dengan sidik jari
dari langkah 4 (format `AA:BB:CC:...`, huruf besar, dipisah titik dua).

Lalu unggah ke ArenHost sehingga terlayani **tepat** di:

```
https://fiezel.my.id/.well-known/assetlinks.json
```

Bukan di `/app/.well-known/`. Harus di akar domain.

Pastikan juga servernya mengirim `Content-Type: application/json`. Kalau cPanel
mengirimnya sebagai `text/plain`, tambahkan di `.htaccess` akar:

```apache
<Files "assetlinks.json">
  ForceType application/json
</Files>
```

### 6. Verifikasi

```bash
curl -sI https://fiezel.my.id/.well-known/assetlinks.json | grep -i content-type
curl -s  https://fiezel.my.id/.well-known/assetlinks.json | head
```

Lalu pakai penguji resmi Google:

```
https://developers.google.com/digital-asset-links/tools/generator
```

Di HP: pasang APK, buka aplikasi. **Tidak ada bilah alamat** = verifikasi berhasil.

### 7. Listing Play Store

Yang diminta Google saat submit:

| Aset | Spesifikasi |
| --- | --- |
| Ikon aplikasi | 512×512 PNG — sudah ada di `assets/brand/fiezel-icon-512.png` |
| Feature graphic | 1024×500 PNG — **belum ada, harus dibuat** |
| Tangkapan layar ponsel | Minimal 2, sudah ada 2 di `manifest.json` → cek apakah cukup besar |
| Deskripsi singkat | Maks 80 karakter |
| Deskripsi panjang | Maks 4000 karakter |
| Kebijakan privasi | Sudah ada: `https://fiezel.my.id/privacy/` |

Isi **Data safety form** dengan jujur: FIEZEL menyimpan progres di perangkat, dan
mengirim telemetri belajar ke `api.fiezel.my.id` saat lane-nya menyala. Rujuk
`docs/BRAIN-DATA-PRIVACY.md` saat mengisi formulir itu.

---

## Catatan pemeliharaan

- **Isi PWA berubah, aplikasi Play ikut berubah** — TWA memuat situs live, jadi rilis
  konten tidak perlu unggah ulang ke Play Store.
- **Unggah ulang hanya perlu** kalau berubah: package name, ikon aplikasi, target SDK,
  atau izin Android.
- `assetlinks.json` **tidak boleh dihapus** dari akar domain. Menghapusnya membuat bilah
  alamat muncul kembali di semua pemasangan yang sudah ada.
