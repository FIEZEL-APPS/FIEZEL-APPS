# FIEZEL HANDOFF: DISKRIMINASI PRESISI WAJAH NYATA VS BUKAN WAJAH DI SESI UJIAN (m025-563)

## 1. Ringkasan & Latar Belakang

Pada build `m025-561`/`m025-562`, verifikasi awal pra-ujian (*preflight active liveness*) telah berjalan mulus. Namun, di dalam sesi ujian pengawasan, sistem belum mampu membedakan secara objektif mana yang merupakan wajah manusia asli dan mana yang merupakan objek bukan wajah (seperti kardus cokelat, dinding krem/tan, meja kayu, gorden, bantal, atau telapak tangan).

Hal ini disebabkan oleh dua akar masalah anatomis:
1. **Bypass Penuh Struktur Wajah Setelah Enrollment**:
   Di `analyzeFrame()` (`features/class-hub/fiezel-face-guard.js`), saat profil murid telah terkalibrasi (`enrolledProfile.valid = true`), pemeriksaan `flat_light_or_surface` dilewati sepenuhnya karena dijaga oleh `if (!enrolledProfile.valid && ...)` dan tidak ada ambang minimum untuk lekukan rongga mata (`eyeDip`). Akibatnya, permukaan datar apa pun yang memiliki warna spektrum kulit (kardus, dinding tan, meja kayu, bantal) langsung dinilai `present: true`.
2. **Koordinat Haar Kaku (Bukan Skala Adaptif)**:
   Fitur dahi, mata, dan pipi sebelumnya dihitung dengan offset piksel kaku (`cY - 12`, `cY - 5`, `cX - 10`). Ketika murid sedikit mundur (wajah mengecil) atau mendekat (wajah membesar) atau memiringkan ponsel, kotak sampel meleset dari rongga mata dan menyebabkan fluktuasi deteksi.

Di build `m025-563`, kedua masalah di atas telah diselesaikan dan dibuktikan secara empiris.

---

## 2. Solusi Teknis & Invarian

1. **Haar Cascade Skala Adaptif Bounding Box**:
   - Sampel dahi, mata bilateral (kiri & kanan terpisah), dan pipi kini dihitung proporsional terhadap *bounding box* wajah (`minX, maxX, minY, maxY`, `boxW, boxH`):
     - Dahi: `minY + 0.08*boxH` s/d `minY + 0.28*boxH`, lebar `minX + 0.20*boxW` s/d `maxX - 0.20*boxW`.
     - Rongga Mata Bilateral: `minY + 0.32*boxH` s/d `minY + 0.54*boxH`, dengan mata kiri (`0.10` s/d `0.44`) dan mata kanan (`maxX - 0.44` s/d `maxX - 0.10`).
     - Pipi/Hidung Bawah: `minY + 0.58*boxH` s/d `minY + 0.82*boxH`.
   - Mengikuti gerakan murid maju-mundur atau kemiringan perangkat secara mulus tanpa kehilangan fitur rongga mata.

2. **Diskriminator Wajah Nyata vs Bukan Wajah di Sesi Ujian**:
   - `flat_light_or_surface` kini aktif tanpa memandang status kalibrasi saat area tengah didominasi permukaan datar tanpa rongga mata (`centerFillFraction > 0.80 || avgBr > 110` dengan `eyeDip < 0.4`).
   - Pada mode ujian (`enrolledProfile.valid = true`), diwajibkan ambang anatomis minimum:
     `var minEyeDipReq = Math.min(2.0, Math.max(0.6, (enrolledProfile.eyeDipMean || 10) * 0.08));`
     Jika `eyeDip < minEyeDipReq`, frame ditolak dengan `reason: 'no_facial_features'`.
   - Menolak objek masif/panoramik: jika `boxW > enrolledProfile.boxWMean * 2.6`, frame ditolak dengan `reason: 'box_too_large'`.

---

## 3. Bukti Empiris Sebelum & Sesudah

Hasil eksekusi komparatif pada frame kanvas ujian:

| Objek di Depan Kamera | Sebelum (`m025-561`) | Sesudah (`m025-563`) | Status |
|---|---|---|---|
| Wajah murid nyata (ruang normal) | `true` | `true` (eyeDip: 125.4) | Diterima |
| Murid mundur sedikit (lean back) | `true` (eyeDip: 11.5) | `true` (eyeDip: 126.0 adaptif) | Diterima |
| Murid menoleh wajar / tilt ponsel | `true` | `true` (eyeDip: 125.4) | Diterima |
| Wajah murid di ruangan redup (dim) | `true` (eyeDip: 20.8) | `true` (eyeDip: 18.9) | Diterima |
| **Kardus cokelat (tanpa mata)** | **`true` (False Positive)** | **`false` (`no_facial_features`)** | **Ditolak Instan** |
| **Dinding / gorden tan di tengah** | **`true` (False Positive)** | **`false` (`no_facial_features`)** | **Ditolak Instan** |
| **Telapak tangan menutupi lensa** | **`true` (False Positive)** | **`false` (`no_facial_features`)** | **Ditolak Instan** |
| **Kardus gradien lampu plafon** | **`true` (False Positive)** | **`false` (`no_facial_features`)** | **Ditolak Instan** |

---

## 4. Berkas yang Diubah

1. `features/class-hub/fiezel-face-guard.js`:
   - Implementasi grid Haar anatomis adaptif berbasis proporsi oval bounding box.
   - Penambahan diskriminator ketiadaan rongga mata `minEyeDipReq` dan batas ukuran masif `box_too_large` di sesi ujian.
2. `tests/exam-focus-guard-test.js`:
   - Penambahan gerbang uji diskriminasi wajah nyata vs bukan wajah di sesi ujian (`face-guard (m025-562)`).
   - Seluruh 38 uji gerbang fokus & pengawasan wajah lulus 100% HIJAU.
3. Sinkronisasi Build m025-563 (Hexa-Sync Arbiter):
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `coordination/BUILD-VERSION.json`
