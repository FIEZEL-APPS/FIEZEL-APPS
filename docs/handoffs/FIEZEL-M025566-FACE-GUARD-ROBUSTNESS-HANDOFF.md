# FIEZEL HANDOFF: AUDIT & STRESS-TEST PENJAGA WAJAH UJIAN — KAMERA SINTETIS 3D (m025-566)

## 1. Ringkasan

Laporan pemilik: penjaga wajah ujian "sangat tidak sempurna" — alarm palsu saat murid bergerak
wajar, kadang meloloskan benda bukan-wajah, dan boros baterai.

Gerbang lama (`tests/exam-focus-guard-test.js`) hanya pernah melihat "wajah" berupa **persegi
kulit seragam + satu pita gelap**. Semua ambang lolos di bentuk itu, jadi tidak ada yang tahu
bagaimana mesin bersikap pada wajah sungguhan. Audit ini membangun **kamera sintetis 3D**
(`tools/face-synth.js`: ellipsoid kepala yang bisa menunduk/menoleh, alis, rongga mata, iris,
hidung, mulut, rambut pendek/poni/panjang, kerudung, kacamata dengan pantulan layar, leher &
seragam, backlight + bloom, ruangan redup dengan derau luma+kroma, 5 warna kulit) dan
menjalankan matriks uji yang diminta terhadap mesin m025-563 dan sesudah perbaikan.

| Ukuran (probe Node, 16 bingkai/kasus) | m025-563 | m025-565 |
|---|---|---|
| Wajah yang WAJIB hadir (pose, aksesoris, cahaya, kulit) — kasus ≥ 90% terdeteksi | **2 / 38** | **37 / 38** |
| Rata-rata deteksi wajah di mode ujian | 7% | 99% |
| Bukan-wajah yang WAJIB ditolak — kasus ≤ 10% lolos | 16 / 18 (mesin menolak hampir semua hal) | 18 / 18 |
| Skenario temporal tanpa alarm palsu / alarm tepat waktu | 1 / 12 | 12 / 12 |
| Readback kanvas per detik ujian | 8 (4 Hz × 2) | 2 (2 Hz × 1) |
| Foto cetak lolos liveness preflight | 120–240 ms (lewat "kedip/toleh" palsu) | ≥ 3,06 dtk (hanya jalur diam-tenang — lihat §5) |

Di **Chromium sungguhan** (kamera palsu Y4M 320x240 @15 fps, jalur `getUserMedia → <video> →
drawImage → getImageData`), mesin m025-563 memunculkan peringatan palsu ±3,3 dtk pada ketiga
video wajah (membaca, kerudung+redup, backlight) dan baru menandai kardus setelah 5,3 dtk;
m025-565 nol peringatan pada wajah, peringatan ±4,0 dtk sejak awal video pada kardus & kursi
kosong, p50 1,2–1,7 ms per tick, maks 16 ms (`reports/face-browser-m025-56{3,5}.json`).

## 2. Cara mereproduksi

```bash
node tools/dev/probe-face-robustness.mjs                     # matriks A–D, mesin saat ini
node tools/dev/probe-face-robustness.mjs --engine <berkas>   # A/B (mis. git show 5e23521:features/class-hub/fiezel-face-guard.js)
node tools/dev/probe-face-robustness.mjs --features --only kerudung   # metrik per kasus (dipN, struktur bawah, kotak)
node tools/dev/probe-face-browser.mjs [--engine <berkas>]    # Chromium + kamera palsu Y4M
```

Keluaran mentah: `reports/face-robustness-m025-563.json`, `reports/face-robustness-m025-565.json`,
`reports/face-browser-m025-563.json`, `reports/face-browser-m025-565.json`.

## 3. Matriks temuan bug (m025-563, `features/class-hub/fiezel-face-guard.js`)

| # | Tingkat | Letak (m025-563) | Kaku / longgar | Bukti probe |
|---|---|---|---|---|
| B1 | Kritis | Cabang kulit redup `yLum < 60` (L354, L378) | **Terlalu longgar** | Rambut hitam (≈42,35,32) hangat → dihitung kulit. Kotak wajah frontal 33×46 (ubun-ubun s/d seragam). Wajah frontal biasa: 0% hadir, `flat_light_or_surface`. |
| B2 | Kritis | Kotak = bbox SEMUA piksel kulit di bingkai (L408–411) | Terlalu longgar | Kusen pintu kayu di tepi, leher, seragam pramuka cokelat ikut memperbesar kotak. |
| B3 | Kritis | Jendela Haar dahi/mata/pipi berproporsi tetap terhadap kotak (L484–499) | **Terlalu kaku** | Poni, kerudung, menunduk menggeser mata di dalam kotak → jendela "dahi" jatuh di mata. Poni 0%, menunduk 25° 0%. |
| B4 | Tinggi | `flat_light_or_surface`: `(centerFill > 0,8 ∨ avgBr > 110) ∧ eyeDip < 0,4` (L548) | Terlalu kaku | `eyeDip` dalam satuan luminans mentah — di ruangan terang semua wajah yang kotaknya meleset ditolak. Alasan tolak dominan pada 24 dari 38 kasus wajah (pra-ujian). |
| B5 | Tinggi | `minEyeDipReq = clamp(eyeDipMean·0,08; 0,6; 2,0)` (L557) | Terlalu kaku | Satuan mutlak, tidak dinormalisasi cahaya: ruang redup lolos verifikasi lalu **0%** hadir di ujian (`no_facial_features`) → alarm terus-menerus. |
| B6 | Tinggi | `extreme_asymmetry: asym > 35` (L568) | Terlalu kaku | Menolak poni, wajah jauh, kulit sangat gelap. Diukur ulang dengan lokalisasi baru: asimetri tidak membedakan menoleh 75° (0,42) dari menoleh 30° (0,64) → gerbang dihapus. |
| B7 | Tinggi | Silau layar dihitung di **kotak persegi** (L190–204) | Terlalu longgar → tuduhan palsu | Jendela terang di belakang murid masuk sudut kotak → backlight = `spoof_screen` 100%. |
| B8 | Tinggi | Kedip `dipDrop ≥ max(0,8; 0,22·base)` (L1118), toleh `asymChange ≥ 5` (L1141) | Terlalu longgar | Satuan mutlak + lokalisasi yang melompat pada wajah kecil → foto cetak "berkedip"/"menoleh": lolos liveness 120–240 ms. |
| B9 | Sedang | Debounce = 8 bingkai × 250 ms (L132, L815) | Rapuh | Hitungan bingkai, bukan jam (tick yang diperlambat peramban memanjangkan "2 dtk"); satu bingkai "hadir" mereset kehilangan — kardus yang sesekali lolos menunda alarm sampai +12,75 dtk. |
| B10 | Sedang | 4 Hz, `frameSignature` + `analyzeFrame` = 2 readback/tick (L29, L730); `new Float32Array(3072)` per bingkai (L326) | Boros | 8 readback kanvas/dtk + alokasi per tick; kamera 30 fps bawaan untuk penjaga yang cuma butuh 2 sampel/dtk. |
| B11 | Catatan | Ambang `isStatic` (L280) | — | Bolak-balik antarbuild: m025-561 menulis 0,05/0,001, m025-562 diam-diam mengembalikan 0,28/0,035 (handoff 561 tidak lagi akurat). Lihat §5 — dengan derau sensor nyata ambang ini tidak membedakan foto dari wajah. |
| B12 | Sedang | Model kulit universal Cb/Cr kotak (L376) | Terlalu kaku | Lampu bohlam kuning & dinding krem: dinding ikut "kulit", kandidat meluap → `skin_count_out_of_range`. |

## 4. Perbaikan (m025-565)

1. **Kulit dinormalisasi per bingkai** — kandidat lewat sudut rona & saturasi relatif di bidang
   CbCr (bebas eksposur); klaster kulit dipisah dari rambut/dinding krem/dinding berlampu kuning
   dengan Otsu pada saturasi (dibatalkan bila hanya menyisakan serpihan < 40 px — derau ruangan
   redup); terang acuan Ys dari jangkar persentil-85. Rambut hitam & latar gelap tersaring relatif
   terhadap Ys/Ss, bukan ambang mutlak. (B1, B12)
2. **Kotak = komponen kulit terhubung** terbesar & paling tengah, dipotong di dagu saat lebar
   baris menyempit ke leher. (B2)
3. **Pita mata dicari**, bukan ditebak: lembah lokal dahi→alis/mata→pipi di dua kolom mata,
   dibandingkan dengan baris kulit tercerah di bawahnya (baris non-kulit seperti label kardus
   tidak boleh jadi "pipi"); kasus poni/kerudung rendah memakai tepi atas. Kontras dinormalisasi:
   `dipN = (pipi − pita) / Ys`. Ambang ujian `clamp(0,25·dipNMean; 0,03; 0,05)`. (B3, B4, B5)
4. **Diskriminator baru, diukur dulu**: pita lemah (dipN < 0,25) wajib disertai struktur wajah
   bawah ≥ 0,15 (wajah ≥ 0,197; telapak menutupi wajah ≤ 0,124); benda > 70% lebar bingkai ditolak
   (`box_too_large`); di mode ujian, rasio tinggi/lebar kotak > 1,4× profil = `face_turned_away`
   (menoleh 75°). Gerbang asimetri dihapus. (B6)
5. **Silau layar dihitung di dalam siluet** (rentang kulit per baris). (B7)
6. **Liveness**: kedip/toleh dinormalisasi terhadap Ys dan hanya dihitung dari bingkai yang
   lokalisasinya stabil (`sameLocalization`); mata terpejam yang menghapus pita pada gumpalan yang
   sama dihitung kedip. (B8)
7. **Debounce jam dinding + konfirmasi dua sampel**: hilang dihitung dari bingkai gagal PERTAMA
   (onAbsent 2 dtk, peringatan 3 dtk, episode 4,5 dtk — angka lama dipertahankan); satu kilasan
   "hadir" di tengah kehilangan harus dikonfirmasi sampel kedua dalam 1,5 dtk; periksa ulang
   manual murid langsung terkonfirmasi. (B9)
8. **2 FPS, satu readback/tick, buffer dipakai ulang, kamera `frameRate: { ideal: 15 }`**
   (hanya `ideal`, jadi kamera yang tidak mendukung tidak menolak). (B10)

Profil murid mendapat kunci baru `dipNMean`. Profil lama yang dipulihkan saat ujian dimuat ulang
(tanpa `dipNMean`) memakai ambang aman 0,05 dan tidak dikenai pemeriksaan `face_turned_away`.

## 5. Batas jujur (diukur, tidak ditutupi)

- **Foto cetak / foto di layar HP yang ditahan diam ≥ 3 dtk tetap lolos liveness preflight**
  lewat jalur "diam tenang". Pada 64×48, rentang dinamika fitur foto berderau (0,17–0,49) tumpang
  tindih dengan wajah hidup yang diam (0,15–0,55), dan kedipan nyaris tak teramati (iris ±1,5 px;
  rasio kontras mata tertutup/terbuka 0,96–1,0). Yang ditutup: foto tidak lagi lolos dalam
  120–240 ms lewat kedip/toleh palsu. Menutup sisanya butuh potongan mata beresolusi lebih tinggi
  atau model ML — keputusan produk berikutnya.
- **Kulit sangat gelap di ruangan sangat redup** (Y kulit ±18/255): 50–56% bingkai terdeteksi
  karena wajah tak terbedakan dari derau latar gelap. Simulasi 60 dtk membaca: nol peringatan
  palsu (debounce 3 dtk menyerapnya), tetapi tidak ada margin.
- Menoleh jauh (75°) hanya bisa dinilai terhadap profil murid (mode ujian); di model universal
  wajah tampak samping tetap "wajah".
- Jalur `FaceDetector` native (Chrome dengan flag) tidak diubah selain satu-readback.
- Ini kamera **sintetis**. Jauh lebih dekat ke wajah sungguhan daripada persegi, dan jalur
  peramban sudah diuji di Chromium, tetapi ambang tetap perlu uji lapangan di kelas.

## 6. Gerbang

`tests/exam-focus-guard-test.js`, 5 gerbang baru `face-guard (m025-565)` — semuanya MERAH pada
m025-563 (berkas produksi dikembalikan sementara) dan HIJAU sesudahnya:
wajah 3D realistis (15 adegan × 3 seed, pra-ujian + mode ujian + cahaya berubah sesudah
verifikasi); kotak wajah tanpa rambut/leher + backlight bukan `spoof_screen`; 10 benda bukan-wajah
di kedua mode + menoleh 75°; foto berderau tidak lolos sebelum jalur diam-tenang; 2 FPS, satu
readback/tick, frame drop 1–2 bingkai, deteksi tersendat 50%, pergi 8 dtk, kilasan palsu.

Gerbang lama yang disesuaikan, dengan alasan:
- `fallbackCheck … wajah murid di depan kamera` — fixture "wajah" tanpa mata diberi mata. Persegi
  kulit tanpa mata adalah definisi kardus di gerbang m025-562 sendiri.
- `SAMPLE_INTERVAL_MS` 250 → 500 (juga `tools/dev/probe-face-cv-realtime.mjs`).

## 7. Berkas

- `features/class-hub/fiezel-face-guard.js` — analisis bingkai, liveness, debounce, sampling.
- `tools/face-synth.js` — renderer kamera sintetis (dipakai gerbang & probe).
- `tools/dev/probe-face-robustness.mjs`, `tools/dev/probe-face-browser.mjs` — probe empiris.
- `tests/exam-focus-guard-test.js` — 5 gerbang baru, 2 disesuaikan.
- `reports/face-robustness-m025-56{3,5}.json`, `reports/face-browser-m025-56{3,5}.json`.
- Bump build m025-566 via `tools/bump-build.mjs`.
