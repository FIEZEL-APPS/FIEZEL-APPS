# FIEZEL HANDOFF DOSSIER: M025-554
**Judul**: Perbaikan Deteksi Wajah Instan di Halaman Verifikasi Wajah (Preflight), Eliminasi False-Positive Anti-Spoofing, & Stabilitas Kalibrasi Liveness
**Tanggal**: 2026-10-10
**Build Target**: `m025-554`
**Otoritas**: OWNER / MASTER Release Authority
**Status**: READY FOR PRODUCTION DEPLOYMENT
**Penulis**: Antigravity AI Engine Pair Programmer

---

## 1. Ringkasan Temuan Audit & Akar Masalah (Root Cause Analysis)

### Keluhan Pengguna:
*"wajahnya tidak bisa terdeteksi di halam verivikasi wajah"*
(Wajah murid tidak dapat terdeteksi sama sekali di modal verifikasi wajah sebelum ujian dimulai).

### Temuan Akar Masalah Teknis (Deep Technical RCA):
1. **False-Positive Fatal 1: `hasBacklightBleed` Menolak Seluruh Wajah Manusia Asli di Ruangan Berlampu**:
   - Pada build `m025-553`, fungsi `detectScreenArtifacts()` menambahkan aturan:
     ```javascript
     var hasBacklightBleed = (eyeDip >= 1.5 && eyeDarkMin > 52);
     ```
   - Asumsi teoritis ini mengira rongga mata manusia asli selalu menghasilkan piksel hitam pekat ($Y \le 52$).
   - Namun dalam kondisi nyata pada feed webcam resolusi $64\times 48$, di ruangan mana pun dengan lampu menyala, cahaya ambien memantul pada kelopak mata, bulu mata, dan sklera sehingga luminansi minimum rongga mata berada di rentang $Y \approx 60 - 85$.
   - Akibatnya, pada setiap manusia asli di ruangan normal, kondisi `eyeDarkMin > 52` selalu bernilai `true`, menandai wajah asli sebagai `spoof_screen` dan mengembalikan `present: false`! Wajah tidak pernah terdeteksi sama sekali.

2. **False-Positive Fatal 2: `centerSkinRatio < 0.12` Menolak Murid di Jarak Duduk Normal**:
   - Kode menghitung rasio:
     ```javascript
     var centerSkinRatio = centerTotal > 0 ? (centerSkin / centerTotal) : 0;
     ```
     di mana `centerTotal = 1089` (seluruh area kotak tengah $33 \times 33$ piksel).
   - Nilai $0.12$ mensyaratkan minimal 131 piksel kulit berada di kotak tengah.
   - Pada murid yang duduk santai di depan meja laptop/HP pada jarak 50–70 cm, ukuran wajah hanya mencakup 60–120 piksel. Meskipun 100% wajah murid berada tepat di tengah pemandu, rasionya hanya $60 / 1089 = 0.055 < 0.12$. Sistem langsung menolaknya sebagai `not_centered`.

3. **False-Positive Fatal 3: Penolakan Cahaya Datar (`flat_light_or_surface`) Mereset Kalibrasi Kedipan Mata**:
   - Ketika murid berkedip, kelopak mata menutup sehingga rongga mata menghilang sesaat (`eyeDip < 0.6`).
   - Kode lama langsung mencocokkan:
     ```javascript
     if ((centerSkinRatio > 0.85 || avgBr > 130) && eyeDip < 0.6) return { present: false, reason: 'flat_light_or_surface' };
     ```
   - Begitu frame kedipan mengembalikan `present: false`, fungsi `checkLiveness()` langsung mengeksekusi `liveness.calibrated = false;`, menghapus baseline mata terbuka, dan mengembalikan status UI ke awal (`align`). Murid terjebak di lingkaran verifikasi tanpa pernah bisa lolos ke `verified`.

4. **Kekakuan Ambang Kromatisitas Warna Kulit**:
   - Ambang $R - G \ge 3$ dan $R \ge B + 10$ terlalu restriktif untuk webcam modern yang menerapkan *auto white balance* dingin/netral di mana $R - B \approx 4 - 8$.

---

## 2. Solusi Rekayasa Computer Vision & Liveness (m025-554)

1. **Eliminasi Pemeriksaan Rapuh Backlight Bleed**:
   - Menghapus aturan rapuh `hasBacklightBleed` dari `detectScreenArtifacts()`. Deteksi layar HP/laptop difokuskan murni pada pantulan kaca (*specular glass glare*) luas ($\ge 30\text{ px}$ jenuh murni $R, G, B > 235$ dengan kontras warna netral $\le 10$).

2. **Koreksi Rasio Konsentrasi Kulit Tengah**:
   - Mengubah penghitungan menjadi fraksi relatif kulit murid:
     ```javascript
     var skinInCenterFraction = skinCount > 0 ? (centerSkin / skinCount) : 0;
     if (skinInCenterFraction < 0.35) return { present: false, reason: 'not_centered' };
     ```
   - Syarat ini memastikan minimal 35% kulit murid berada di dalam kotak pemandu tengah, sangat toleran terhadap jarak duduk murid (50–70 cm) tanpa kehilangan presisi pemusatan.

3. **Buffer Ketahanan Kedipan Mata (Liveness Absent Grace Buffer)**:
   - Menambahkan buffer toleransi `absentTicks < 6` pada `checkLiveness()`. Penutupan mata sesaat saat berkedip (1–3 frame) TIDAK mereset kalibrasi baseline:
     ```javascript
     liveness.absentTicks = (liveness.absentTicks || 0) + 1;
     if (liveness.absentTicks >= 6) {
       liveness.calibrated = false;
       liveness.calibTicks = 0;
       liveness.eyeDips = [];
       liveness.blinkClosing = false;
     }
     ```
   - Begitu mata membuka kembali, deteksi kedipan mencatat drop $\to$ rise dan langsung memvalidasi `verified` dalam $< 300\text{ms}$.

4. **Kalibrasi Kromatisitas Adaptif**:
   - Normal room light: $Cb \in [70, 145]$, $Cr \in [125, 185]$, $Cr - Cb \ge 4$, $R \ge B + 3$, $(R + 4) \ge G$, $normR \ge 0.33$, $normB \le 0.33$, $yLum \le 215$.
   - Redup (low light $yLum < 60$): $R \ge B + 2$, $(R + 3) \ge G$, $Cr - Cb \ge 2$, $normB \le 0.35$, $yLum \ge 8$.
   - Lampu senter/bohlam silau ($yLum > 215$ atau piksel jenuh $> 235$) tetap ditolak 100%.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu Lokal

1. **Uji Simulasi CV & Active Liveness (`tools/dev/test-face-verification-fix.mjs`)**:
   - `Wajah manusia normal room (luminansi mata Y=65)`: **LULUS** (`present: true`).
   - `Wajah manusia jarak meja alami (50 px)`: **LULUS** (`present: true`).
   - `Siklus Liveness`: Transisi mulus `align` $\to$ `challenge` $\to$ `verified` saat 1x kedipan mata alami.
   - `Foto statis kertas / wallpaper`: **DITOLAK** (`isLivenessVerified = false`).
   - `Lampu sorot / bohlam jenuh`: **DITOLAK** (`flat_light_or_surface`).
   - `Kamera tertutup rapat`: **DITOLAK** (`camera_covered`).

2. **Gerbang Mutu Lokal (Local Quality Gates)**:
   - `node tests/exam-focus-guard-test.js`: **PASS** (Semua 26 pengujian fokus & face-guard lulus).
   - `node tests/id-golden-snapshot-test.js`: **PASS** (Baseline emas Indonesia utuh).
   - `node tests/th-ui-leak-test.js`: **PASS** (Nol kebocoran naskah).
   - `node tests/curriculum-cache-version-test.js`: **PASS** (26 penegasan lulus pada build `m025-554`).
   - `node tests/gate-registry-test.js`: **PASS** (374 berkas uji terdaftar, 0 fail).
   - `git diff --check`: **BERSIH** (Tanpa trailing whitespace).

---

## 4. Daftar Berkas yang Disentuh (Hexa-Sync Invariant)

1. `features/class-hub/fiezel-face-guard.js`:
   - Penyesuaian kromatisitas kulit dan toleransi jarak duduk (`skinInCenterFraction >= 0.35`).
   - Penghapusan heuristik rapuh `hasBacklightBleed`.
   - Penambahan buffer toleransi kedipan `absentTicks >= 6` pada state liveness.
2. `tests/exam-focus-guard-test.js`:
   - Uji penegasan anti-spoofing diperbarui untuk memvalidasi penerimaan wajah asli di ruangan normal dan penolakan glare kaca layar digital.
3. `coordination/BUILD-VERSION.json`: Dinaikkan ke `m025-554`.
4. `sw.js`: `SW_REV` dinaikkan ke `m025-554`.
5. `core-config.js`: `self.FIEZEL_PAGE_BUILD` dinaikkan ke `m025-554`.
6. `features/neural-voice/fiezel-diag-panel.js`: `var DIAG_BUILD` dinaikkan ke `m025-554`.
7. `kurikulum.html`: Cache query dinaikkan ke `?v=m025-554`.
8. `misi.html`: Cache query dinaikkan ke `?v=m025-554`.

---

## 5. Status Rilis & Verifikasi Produksi

- Build resmi: `m025-554`.
- Hexa-sync check: `node tools/bump-build.mjs --check` $\to$ `selaras: true`.
- Zero-Ghost-Deploy: Menggunakan Pull Request (PR) ke branch `main`, menunggu GitHub Actions CI 100% hijau, digabungkan, dan diverifikasi di live production `https://fiezel.my.id/app/`.
