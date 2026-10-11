# FIEZEL HANDOFF: AUDIT VERIFIKASI WAJAH UJIAN KELASKU (m025-560)

## 1. Ringkasan

Audit menyeluruh atas verifikasi wajah pra-ujian dan pengawasan kamera selama ujian dari guru
(`features/class-hub/fiezel-face-guard.js` + alurnya di `fiezel-class-hub.js`), dari kamera murid
sampai layar guru. Sepuluh temuan; semuanya diperbaiki dan dikunci gerbang di
`tests/exam-focus-guard-test.js` (10 gerbang baru/diubah — semuanya MERAH pada kode m025-559 dan
HIJAU sesudahnya; diperiksa dengan mengembalikan berkas produksi ke m025-559).

## 2. Temuan & perbaikan

| # | Tingkat | Temuan (m025-559) | Perbaikan (m025-560) |
|---|---|---|---|
| 1 | Kritis | **Foto cetak lolos liveness dalam ~1,4 dtk.** Profil dikunci sesudah 2 tick kalibrasi, dan profil terkunci mematikan `spoof_static`; lalu 22 tick "diam tenang" (tick preflight 60 ms = 1,3 dtk, bukan 3 dtk) meluluskan apa pun yang diam. | Profil baru dikunci **sesudah** liveness lulus. Diam tenang diukur jam dinding (≥ 3 dtk terus-menerus, reset bila wajah hilang) dan wajib lolos uji temporal (tidak statis, tidak bergoyang kaku). |
| 2 | Tinggi | **Foto yang digeser 5 px lolos sebagai "toleh kepala"** (lolos dalam 180 ms). Tolehan cukup berupa translasi centroid ≥ 4 px. | Tolehan wajib membawa isyarat 3D: perubahan asimetri rongga mata ≥ 5. Ikut diperbaiki: baseline asimetri 0 jatuh ke nilai saat ini lewat `||`. |
| 3 | Tinggi | **"Lanjut Tanpa Kamera (Dilaporkan ke Guru)" tidak pernah sampai ke guru.** `focus.noCamera` di-set tetapi tidak ada di payload, learner-flow, server, maupun layar guru. Murid cukup menolak izin kamera lalu menekan tombol itu. | Bendera `nc: 1` di `FG.payload` → `recordAssignmentFocus` → `class-sync-core` (hanya nilai 1; lainnya ditolak `bad_assign_focus`) → teacher store (kabar `focus_exit`, label "Tanpa kamera", level `ringan`) → chip kelas & laci murid. |
| 4 | Tinggi | **Preflight dihitung sebagai pelanggaran.** `face.start(faceGuardOptions())` menyalakan pemantau selama murid masih membetulkan posisi; wajah "hilang" tercatat dan terkirim ke guru sebelum ujian dimulai, dan `updateProctorBanner` di layar preflight memicu `renderStudent` (video pratinjau hancur). | Callback pemantau tidak berbuat apa pun sampai `runner.faceVerified` (`faceMonitoring()`). |
| 5 | Tinggi | **Muat ulang di tengah ujian membuang profil** → model universal + `spoof_static` aktif lagi → murid yang membaca dengan tenang dituduh foto selama sisa ujian. | Profil (statistik numerik, bukan gambar) disimpan di `runner.faceProfile` saat "Mulai Kerjakan Ujian" dan dipulihkan lewat `start({ profile })` (disaring ke kunci numerik yang dikenal). |
| 6 | Sedang | **Kamera beku/terputus dihitung "hadir" selamanya.** Sesudah enrollment, bingkai terakhir dari track yang dibisukan OS / direbut aplikasi lain / kamera virtual gambar diam selalu lolos. Kamera yang gagal menyala lagi sesudah muat ulang: diam, tanpa laporan. | Track `ended`/`muted` = wajah tidak terlihat; bingkai identik (derau sensor nol) ≥ 3 dtk = beku; track ended → sambung ulang tiap 5 dtk, gagal 3× → `onCameraLost` → `nc` ke guru + toast dua bahasa. Start yang gagal di tengah ujian juga melapor `nc`. |
| 7 | Sedang | Halaman tersembunyi juga dihitung "wajah hilang" → satu kepergian tercatat dua kali. | Pemeriksaan dilewati saat `visibilityState === 'hidden'`; episode wajah yang sedang berjalan ditutup di titik itu. |
| 8 | Sedang | Preflight "memindai/terverifikasi" yang tersimpan sesudah muat ulang: tombol terkunci "Memindai wajah..." selamanya — satu-satunya jalan keluar "Keluar ujian" (selesai dengan 0 jawaban). | `resumeFocus` mengembalikan preflight basi (kamera tidak aktif) ke `idle`. |
| 9 | Rendah | Kamera tetap menyala sesudah preflight gagal dan sesudah "Lanjut Tanpa Kamera". Bar progres penuh dalam 1,5 dtk apa pun yang dilihat kamera; batas 9 dtk. | Kamera dimatikan pada galat & bypass (`runner.noCamera` mencegah dinyalakan lagi). Bar mengikuti progres liveness sebenarnya (maks 95% sebelum lulus); batas 20 dtk jam dinding. |
| 10 | Rendah | `start()` ganda / `stop()` saat dialog izin terbuka → stream bocor (lampu kamera tak padam). | Penghitung generasi + janji `pending` bersama. |

Bukti eksploit sebelum/sesudah (jam tiruan, tick 60 ms):

```
m025-559  foto diam (kertas/wallpaper)    -> LOLOS setelah 1380ms
m025-559  foto digeser 5px (bukan toleh)  -> LOLOS setelah 180ms
m025-560  foto diam / digeser / digoyang  -> DITOLAK (ditahan 10 dtk)
m025-560  wajah hidup diam (derau sensor) -> LOLOS 3060ms (steady)
m025-560  wajah hidup kedip / toleh 3D    -> LOLOS 420ms / 360ms
```

## 3. Batas yang TIDAK diubah (keputusan pemilik)

- **Ini verifikasi kehadiran, bukan identitas.** "Profil biometrik" hanya statistik warna kulit &
  posisi; ia tidak bisa membedakan murid A dari murid B. Pengenalan wajah sungguhan butuh model ML
  dan menyimpan data biometrik anak — keputusan produk & privasi, bukan perbaikan bug.
- Heuristik 64×48 tidak bisa menolak **video rekaman** wajah murid yang diputar di HP lain (ia
  berkedip). Sesudah enrollment, `FaceDetector` native dipercaya penuh (pilihan m025-559 agar murid
  yang membaca tenang tidak dituduh) — foto yang diangkat ke kamera di tengah ujian tidak ditolak.
- Semua pemeriksaan berjalan di perangkat murid; murid yang paham devtools tetap bisa memalsukannya.
  Laporan ke guru adalah sinyal untuk ditanyakan, bukan vonis — nadanya dijaga begitu.
- Ambang (asimetri ≥ 5, statis MAE < 0,28, beku Σ|Δ| < 1) divalidasi pada kanvas sintetis, belum
  pada kamera ponsel nyata. Perlu uji lapangan di kelas sebelum dianggap final.

## 4. Berkas

- `features/class-hub/fiezel-face-guard.js` — liveness, enrollment, kamera beku/terputus, start/stop.
- `features/class-hub/fiezel-class-hub.js` — gating preflight, simpan/pulihkan profil, bypass, progres, preflight basi, chip guru.
- `features/class-hub/fiezel-focus-guard.js` — `markNoCamera`, `restore`/`payload` membawa `nc`.
- `features/learner-flow/fiezel-learner-flow.js`, `workers/api/teacher/class-sync-core.js` — transport & gerbang server `nc`.
- `features/teacher/fiezel-teacher-store.js`, `features/teacher/fiezel-teacher-shell.js` — label, level, kabar, laci.
- `features/i18n/copy-{id,th}-proctor.js` — 3 kunci baru, dua bahasa.
- `tests/exam-focus-guard-test.js` — 8 gerbang baru, 2 gerbang lama dikoreksi (keduanya mengunci celah #1/#2).
- Bump build m025-560 via `tools/bump-build.mjs`.

**Server:** `class-sync-core.js` berubah — perlu deploy worker agar `nc` tersimpan. Sebelum deploy,
server lama mengabaikan `nc` (tidak menolak laporan), jadi klien baru aman dirilis lebih dulu.
