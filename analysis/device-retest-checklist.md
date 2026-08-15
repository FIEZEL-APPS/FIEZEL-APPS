# FIEZEL 5.19.0 — Checklist Retest di iPhone (untuk Owner)

Dokumen ini langkah-demi-langkah untuk **owner** (orang awam) yang akan memverifikasi
FIEZEL langsung dari iPhone + Safari. Tiga hal yang diverifikasi:

1. **T-008** — gate notifikasi saat masuk sudah tidak muncul (app terbuka langsung).
2. **Neural voice** — suara terdengar, dan kita tahu itu suara neural atau suara browser.
3. **T-006** — ekstraksi diagnostics `fiezel-neural-voice-diagnostics-v1` (bukti emas).

Total waktu: sekitar 30–60 menit. Ikuti urutan; tulis hasilnya di Bagian 5.

---

## 1. Persiapan (5 menit)

1. **Catat versi iOS**: Pengaturan → Umum → Tentang → baris "Versi". Contoh: `18.3`.
2. **Pastikan koneksi stabil**: pakai Wi-Fi rumah yang bagus (unduhan aset suara ±119 MB dan
   update aplikasi butuh jaringan).
3. **Matikan Mode Hemat Baterai**: Pengaturan → Baterai → "Mode Daya Rendah" → **off**
   (mode hemat bisa membatasi Safari dan suara).
4. **Volume & sakelar senyap**: naikkan volume ke >50%. Pastikan sakelar senyap di samping
   iPhone dalam posisi **bunyi aktif** (posisi atas/terangkat).
5. **Bersihkan tab lama**: tutup semua tab Safari yang membuka FIEZEL.
6. **Catat jam mulai**.

Alamat aplikasi (Safari): `https://fitrajft-ux.github.io/FIEZEL-APPS/`
(gunakan alamat/manajemen bookmark yang biasa dipakai).

Catatan: versi aplikasi tampil di pojok kanan atas aplikasi sebagai `v5.19.0`.

---

## 2. Retest T-008 — gate notifikasi (10 menit)

**Ekspektasi**: begitu halaman terbuka, aplikasi **LANGSUNG masuk tampilan utama (Home)** —
**TANPA** muncul layar hitam "Oii Jahran, nyalain notifikasi dulu 👀".

### 2a. Pastikan versi terbaru (SW baru) yang termuat

Karena aplikasi memakai *service worker* (SW), ponsel bisa saja masih memakai salinan lama.
Lakukan urutan ini:

1. Buka Safari → buka URL FIEZEL.
2. Jika aplikasi pernah dibuka sebelumnya, buka **2x**:
   - Buka aplikasi, tunggu tampil.
   - Tutup penuh: di Safari, geser ke atas dari bawah untuk melihat semua tab →
     geser ke atas (close) tab FIEZEL.
   - Buka lagi dari daftar tab terbaru (Recent Tab) atau ketik ulang URL-nya.
3. **Verifikasi versi**: angka `v5.19.0` harus tampil di pojok kanan atas.

### 2b. Bila masih tampak perilaku lama / gate masih muncul (troubleshooting)

> ### 🛑 JANGAN LAKUKAN INI
>
> Versi sebelumnya dokumen ini menyuruh menghapus Data Situs Web dan memasang ulang
> ikon Layar Utama. **Kedua langkah itu menghapus `localStorage`**, termasuk key
> `fiezel-neural-voice-diagnostics-v1` yang justru diminta di Bagian 4 dokumen yang
> sama. Kalau hilang, T-006 harus mulai dari reproduksi kegagalan dari nol.
>
> Jadi: **jangan** hapus ikon FIEZEL dari Layar Utama. **Jangan** Pengaturan → Safari →
> Hapus Riwayat dan Data Situs Web. **Jangan** Data Situs Web → Hapus. **Jangan**
> pasang ulang PWA. Semua ini hanya boleh setelah diagnostics berhasil dikirim, dan
> hanya atas persetujuan coordinator.

Kalau versi lama masih dilayani, penyebabnya hampir selalu service worker yang belum
install ulang. Urutan yang benar dan aman:

1. Buka FIEZEL dari ikon Layar Utama.
2. Tutup penuh: geser ke atas ke app switcher, buang kartu FIEZEL.
3. Buka lagi. Biasanya cukup sekali — `sw.js` memakai `skipWaiting()` + `clients.claim()`.
4. Kalau setelah **3** kali masih versi lama, **berhenti dan laporkan**. Service worker
   yang tidak meng-update adalah temuan tersendiri, bukan sesuatu yang diselesaikan
   dengan memasang ulang aplikasi.

Kalau gate notifikasi masih muncul: foto layarnya, catat versi iOS dan versi aplikasi,
lalu laporkan sebagai TIDAK LOLOS.

**Hasil T-008** (diisi di laporan):
- [ ] Aplikasi terbuka langsung ke Home — TANPA gate notifikasi (YA / TIDAK)
- [ ] Versi pojok kanan atas = `v5.19.0`

---

## 3. Uji neural voice (15 menit)

Suara neural butuh diunduh **sekali** (±119 MB, hanya lewat Wi-Fi).

### 3a. Persiapan (sekali saja)

1. Di Home, ketuk kartu **"Speaking + Listening"** (masuk ke *Skills Lab*).
2. Cari kartu **"NEURAL VOICE · OPTIONAL"**:
   - Jika belum disiapkan: tombol **"Siapkan suara offline"**.
   - Ketuk tombol itu dan **tunggu sampai selesai** (beberapa menit; jangan tutup halaman,
     jangan alih aplikasi). Saat selesai muncul teks **"Suara neural lokal siap"**.
3. Catat status kartu yang tampil:
   - `Suara neural lokal siap`
   - `Aset tersimpan, inisialisasi belum aktif`
   - `Belum disiapkan`
   - Jika muncul teks `Status: ...` (merah) → **foto** teks itu, itu data penting untuk T-006.

### 3b. Memicu suara

1. Tetap di Skills Lab, buka salah satu latihan **Listening** atau **Speaking**
   (contoh: latihan *repeat* / *guided response*).
2. Ketuk tombol **play / speaker** pada latihan (atau tunggu jika aplikasi otomatis membacakan).
3. Ukur waktu: **hitung detik dari ketukan sampai suara terdengar** (pakai stopwatch iPhone
   atau perkiraan). Catat angkanya.

### 3c. Apa yang didengar

- **Suara NEURAL** = terdengar seperti **manusia natural** (suara khas "FIEZEL", vokal alami).
- **Suara BROWSER TTS** = terdengar **mekanik/robot** (suara standar sistem iOS/Safari).

Ulangi 2–3 kali dengan kalimat berbeda, lalu catat:
- Suara selalu muncul / kadang / tidak pernah.
- Berapa detik jedanya. Jika jeda **> 20 detik** lalu baru bersuara → kemungkinan besar
  neural gagal memuat dan aplikasi jatuh ke suara browser (fallback).

**Hasil uji suara** (diisi di laporan):
- [ ] Suara terdengar jelas (YA / TIDAK)
- [ ] Jenis suara: **NEURAL** (natural) / **BROWSER TTS** (robot)
- [ ] Jeda tap → suara: **___ detik**
- [ ] Unduhan aset 119 MB: selesai / gagal / tidak pernah dicoba

---

## 4. Ekstraksi diagnostics T-006 (bukti emas)

Data diagnostics tersimpan di localStorage dengan key
`fiezel-neural-voice-diagnostics-v1` — log otomatis dari aplikasi
(`bootstrap_loaded`, `prepare_error`, `init_error`, `speak_fallback`, `prepared`, dst).
Key ini juga bisa dibaca lewat `FiezelVoiceRuntime.diagnostics()`.

### Cara 1 — Panel Diagnostics di dalam aplikasi (utama, tanpa Mac)

Sejak build `m019-1`, aplikasi bisa mengekspor diagnostiknya sendiri. Ini cara yang
dipakai owner, karena Safari di iPhone tidak punya konsol dan storage PWA Layar Utama
terisolasi dari tab Safari biasa.

1. Buka FIEZEL dari ikon Layar Utama (bukan tab Safari — datanya beda container).
2. Tombol hitam **Diagnostics** ada di kanan atas. Ketuk.
3. Cek baris pertama JSON: `"diagBuild": "m019-1"`. Kalau tombolnya tidak ada,
   ikuti urutan cold launch di Bagian 2b.
4. Ketuk **Kirim** → pilih Notes/WhatsApp → kirim isinya ke coordinator.
   - Kalau share sheet gagal, tombol berubah jadi "Tersalin" → langsung tempel.
   - Kalau dua-duanya gagal, tahan di dalam kotak teks → Select All → Copy.
   - **Kirim ringkas** hanya mengirim `target` + `storageEstimate`. Pakai ini kalau
     payload penuh terlalu besar untuk share sheet.

Yang ikut terkirim selain isi key: `storageEstimate` (kuota & pemakaian asli device),
`cacheInventory` (aset kokoro mana yang benar-benar tersimpan beserta ukuran dan MIME),
`crossOriginIsolated`, `swController`, dan `puterLoaded`.

Panel ini read-only: tidak menulis atau menghapus apa pun di localStorage,
CacheStorage, maupun IndexedDB.

### Cara 2 — Mac + Safari Web Inspector (opsional, kalau kebetulan ada Mac)

1. **iPhone**: Pengaturan → Safari → Lanjutan → **Web Inspector** aktif.
2. **Mac**: Safari → Pengaturan → Lanjutan → tampilkan menu **Develop**.
3. Sambungkan kabel, ketuk **Trust**, buka FIEZEL di iPhone.
4. Mac Safari → Develop → nama iPhone → pilih entri **PWA**-nya, bukan tab Safari.
5. Tab Console:

   ```js
   copy(JSON.stringify(FiezelVoiceRuntime.diagnostics(), null, 2))
   ```

Kalau iPhone tidak muncul di daftar: buka kunci HP, cabut-pasang kabel, pastikan bukan
Private Browsing.

### Yang sudah tidak berlaku

Versi lama dokumen ini menyatakan tanpa Mac owner tidak bisa menyalin JSON penuh, dan
aplikasi tidak punya halaman debug internal. Keduanya sudah tidak benar sejak panel
Diagnostics ada. Bookmarklet tetap tidak bisa dipakai: hanya jalan di tab Safari, yang
container storage-nya berbeda dari PWA Layar Utama.

## 5. Format laporan ke coordinator

Salin template ini, isi bagian `[...]`, dan kirim ke coordinator.

```text
=== LAPORAN RETEST FIEZEL 5.19.0 (iPhone) ===

PERANGKAT & LINGKUNGAN
- Nama owner: [...]
- iPhone model: [mis. iPhone 13]
- iOS version: [mis. 18.3]
- Koneksi: [Wi-Fi / 4G / 5G]
- Aplikasi: FIEZEL v[5.19.0]
- Tanggal & jam: [...]
- URL yang dipakai: https://fitrajft-ux.github.io/FIEZEL-APPS/

HASIL RETEST T-008 (gate notifikasi)
- App terbuka langsung tanpa gate notifikasi: YA / TIDAK
- Jika TIDAK (lampirkan foto gate + langkah yang sudah dicoba): [...]

UJI NEURAL VOICE
- Status kartu suara di Skills Lab: [Suara neural lokal siap /
  Aset tersimpan, inisialisasi belum aktif / Belum disiapkan / Status error: ...]
- Suara terdengar: [YA selalu / YA kadang / TIDAK]
- Jenis suara: [NEURAL (natural) / BROWSER TTS (robot) / tidak tahu]
- Jeda tap → suara: [...] detik
- Unduhan aset 119 MB: [selesai / gagal / tidak pernah dicoba]
- Screenshot: [lampirkan]

DIAGNOSTICS T-006
- Cara ekstraksi: [Mac Web Inspector / Tanpa Mac (hanya parsial) / belum]
- JSON diagnostics (tempel di sini jika berhasil, format teks):
```

```json
[]
```

```text
CATATAN / HAMBATAN
- [...]
```

**Cek sebelum kirim:**
- [ ] Semua hasil diisi
- [ ] Screenshot terlampir
- [ ] JSON diagnostics (jika ada) dikirim sebagai **teks**, bukan foto
- [ ] Jika tanpa Mac: pernyataan "T-006 parsial / menunggu Mac" ditulis eksplisit

---

## Lampiran teknis (untuk coordinator, bukan untuk owner)

- Key localStorage: `fiezel-neural-voice-diagnostics-v1`
  (baca juga lewat `FiezelVoiceRuntime.diagnostics()`).
- Status runtime: `FiezelVoiceRuntime.status()` → bidang `phase`, `prepared`, `ready`,
  `error`, `storage`, `crossOriginIsolated`, `speechSynthesis`, `storageEstimate`.
- Aset neural: ~113–119 MB total; hipotesis T-005: CacheStorage iOS (quota ±50 MB) tidak
  cukup + `fetch no-store` + init timeout 20 s → lihat TASKS-LEDGER.json T-005/T-006/T-007.
- Gate notifikasi dimatikan di T-008 (HEAD 6fa2d82): `globalThis.FIEZEL_REQUIRE_NOTIFICATIONS`
  default **off**; gate `#welcome` hanya tampil jika flag ini `true`.