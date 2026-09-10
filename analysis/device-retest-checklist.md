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

Hapus data website Safari untuk situs ini (jarang perlu):

1. Pengaturan → Safari → Lanjutan → **Data Situs Web**.
2. Cari `fitrajft-ux.github.io` (atau entri "FIEZEL") → geser ke kiri → **Hapus** → konfirmasi.
   > ⚠️ **Penting**: langkah ini menghapus data belajar lokal (progres tersimpan di
   > localStorage Safari). Lakukan **hanya** jika "buka 2x" tidak cukup, dan lebih baik
   > minta konfirmasi coordinator dulu jika progres dianggap berharga.
3. Tutup Safari **total** (geser ke atas dari bawah → geser ke atas kartu Safari, buang).
4. Buka Safari lagi → buka URL FIEZEL.

Jika aplikasi dipasang ke **Layar Utama** (ikon "FIEZEL" di home screen):
-hapus ikon lama (tekan lama ikon → **Hapus** → Hapus dari Layar Utama),
-lalu pasang ulang dari Safari (tombol **Bagikan** → **Ke Layar Utama**).

Jika **MASIH** muncul gate setelah semua langkah di atas:
- **Foto layar gate-nya** (screenshot),
- Catat langkah troubleshooting yang sudah dicoba,
- Catat versi iOS & versi aplikasi,
- Laporkan sebagai **TIDAK LOLOS** (template di Bagian 5).

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

### Cara 1 — DENGAN Mac (direkomendasikan; satu-satunya cara menyalin JSON penuh)

1. **Di Mac**: buka Safari → menu **Safari** → **Pengaturan** → tab **Lanjutan** →
   centang **"Tampilkan menu Pengembang"** (Show Develop menu).
2. **Hubungkan iPhone** ke Mac:
   - Via kabel USB, atau
   - Via Wi-Fi (kedua perangkat di jaringan yang sama; pastikan di iPhone:
     Pengaturan → Safari → Lanjutan → **Web Inspector** **aktif** — biasanya otomatis aktif).
3. Di iPhone, **buka aplikasi FIEZEL**.
4. Di Mac Safari, menu **Pengembang** (Develop) → pilih nama **iPhone** → pilih
   halaman FIEZEL. Jendela **Web Inspector** terbuka.
5. Buka tab **"Konsol"** (Console). Di kolom input bawah, ketik lalu Enter:

   ```js
   JSON.stringify(FiezelVoiceRuntime.diagnostics(), null, 2)
   ```

   Salin seluruh hasil JSON (tampil berformat rapi).

6. Opsional, untuk info status tambahan:

   ```js
   FiezelVoiceRuntime.status()
   localStorage.getItem('fiezel-neural-voice-diagnostics-v1')
   ```

7. Tempel hasil JSON ke pesan laporan (Bagian 5).

### Cara 2 — TANPA Mac (keterangan JUJUR)

Safari di iPhone **tidak menyediakan konsol pengembang** sendiri; konsol hanya bisa
dibuka lewat Web Inspector dari Mac. Pada rilis ini, aplikasi **tidak menyediakan halaman
debug internal** untuk menyalin JSON diagnostics dari dalam aplikasi (sudah dicek di kode
5.19.0). **Kesimpulan jujur: tanpa Mac, owner tidak bisa menyalin JSON penuh dari iPhone.**

Alternatif yang masuk akal (pilih salah satu):

- **Opsi A — bukti parsial (bisa langsung, tanpa Mac):**
  - Screenshot kartu suara neural di Skills Lab (label status + teks `Status:` jika ada),
  - Screenshot pesan error/notif "Persiapan gagal ..." bila muncul,
  - Screenshot hasil uji suara (Bagian 3).
  - Kirim sebagai bukti interim. Ini **tidak menggantikan** JSON penuh, tapi membantu analisis.

- **Opsi B — pinjam Mac**, lalu lakukan Cara 1 di atas (30–60 menit). Ini satu-satunya
  jalur untuk mendapat JSON diagnostics yang sah dari iPhone.

- **Opsi C — cross-check saja di laptop (BUKAN bukti iPhone):**
  Buka URL yang sama di Chrome/Edge di laptop. Adanya catatan: diagnostics/lokalStorage
  **tersimpan per-perangkat** — data di laptop **bukan** data iPhone, jadi **tidak boleh**
  diklaim sebagai bukti device iPhone. Hanya berguna melihat perilaku versi 5.19.0 secara umum.

**Keputusan yang jujur untuk laporan:** jika tidak ada Mac sama sekali, kirim hasil
Opsi A sebagai bukti parsial **dan** tulis eksplisit: *"T-006 belum bisa diekstrak penuh
tanpa Mac"*, agar coordinator memutuskan langkah berikut (menunggu Mac, menerima bukti
parsial, atau jalur alternatif lain).

---

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