# FIEZEL 5.19.0 — Braincore Autonomy Langkah 1 Handoff

Tanggal: 2026-08-31 WIB
Lane: roadmap otonomi (`BRAINCORE-AUTONOMY-ROADMAP.md`), Langkah 1 dari 6
Release: `FIEZEL_PAGE_BUILD=m025-214`, `DIAG_BUILD=m025-214`, `SW_REV=m025-214-brain-longterm-sensors-20260831`
Bundle Brain: `3.0.0` → `3.1.0`
Base: `main@50e9fe7`
Otoritas: **OWNER** memegang keputusan promosi dan rilis (`MASTER-ONLY-GOVERNANCE.md`).
Sesi ini advisory + implementasi; tidak ada merge/deploy yang diambil sendiri.

## STATUS

Machine-verified. **92 test yang membaca `app.js` dijalankan penuh: 0 gagal.** Tidak ada
retest fisik yang dibutuhkan — perubahan ini tidak menyentuh jalur audio/neural voice selain
satu baris penanda build (`DIAG_BUILD`), dan tidak mengubah satu pun keputusan yang dialami
murid.

## APA YANG BERUBAH

Tiga hal, semuanya menutup temuan yang sudah diverifikasi terhadap repo:

1. **Peta otoritas dijujurkan.** Manifest menyebut `stepTutor` dan `productionGrader` `off`
   dengan alasan tertulis "NOL referensi di app.js". Klaim itu berhenti benar sejak C5:
   `stepTutorGuidance()` merender tuntunan langkah di jalur render jawaban (`app.js`), dan
   `FiezelProductionGrader.grade` menilai jawaban cloze murid. Keduanya → `active`.
   `retentionProbe` dan `learningMetrics` → `shadow`. `statGate` tetap `off` **di perangkat**,
   dengan catatan eksplisit bahwa ia berwenang di `content-promotion.js`.
   Hitungan: 8 active / 6 shadow / 7 off → **10 active / 8 shadow / 3 off**.

2. **Dua gerbang anti-drift.** `brain-page-wiring-test.js` **W8**: modul berotoritas `off`
   yang punya pemanggil di `app.js` = FAIL. `brain-manifest-test.js` ditulis ulang supaya
   otoritas **diturunkan dari pembacaan `app.js`** (dua arah), bukan dihafal sebagai literal —
   gate lama menghafal jawabannya, jadi ia tetap hijau sambil menegakkan peta yang bohong.
   Keduanya membawa blok BUKTI-BISA-MERAH.

3. **Sensor jangka panjang dihidupkan.** `fiezel-retention-probe.js` akhirnya dimuat halaman
   + precache dan dipanggil (`schedule()` saat mastery BKT tembus, dievaluasi dari jawaban
   **nyata** sesudah jatuh tempo — tanpa menyisipkan soal tambahan ke sesi murid).
   `learningMetricsSnapshot()` menghitung lima metrik longitudinal dan merendernya di panel
   diagnostik.

```yaml
files_added:
  - BRAINCORE-AUTONOMY-ROADMAP.md
  - BRAINCORE-AUTONOMY-CONTRACTS.md
  - FIEZEL-5.19.0-BRAINCORE-AUTONOMY-LANGKAH1-HANDOFF.md
files_touched:
  - app.js                                     # retentionProbe* + learningMetrics* + panel; hook di bktRecord
  - index.html                                 # muat fiezel-retention-probe.js
  - sw.js                                      # precache probe + SW_REV
  - core-config.js                             # FIEZEL_PAGE_BUILD
  - features/neural-voice/fiezel-diag-panel.js # DIAG_BUILD (ritual bump saja)
  - features/brain/fiezel-brain-manifest.js    # authorityMap + bundleVersion
  - brain-page-wiring-test.js                  # gerbang W8
  - brain-manifest-test.js                     # otoritas diukur, bukan dihafal
```

## BATAS YANG DIJAGA

- **Nol perubahan pengalaman murid.** Tidak ada baris di gelombang ini yang mengubah soal yang
  tampil, jadwal ulangan, atau kesulitan. Rekomendasi half-life dari `evaluate()` sengaja tidak
  diteruskan ke mana pun: penulis `nextReview` tetap tunggal (single-writer FSRS, kontrak B3).
- `fiezel-sl-v1-state` tidak disentuh; state baru di kunci baru (`fiezel-post-test-v1`).
- Modul absen = perilaku identik hari ini (semua wiring di balik availability-check + try/catch).
- Tidak ada telemetri baru. `metricsDigest` sengaja tetap `off`: ia PENGUNGGAH, dan
  menyalakannya tanpa keputusan produk soal telemetri berarti menambah permukaan privasi
  diam-diam.

## LANGKAH BERIKUTNYA (serah-terima ke agent paralel)

Kontrak kepemilikan lengkap + prompt siap-pakai per agent ada di
`BRAINCORE-AUTONOMY-CONTRACTS.md`. Ringkasnya, dan ini yang mengikat:

| Agent | Langkah | Milik eksklusif | Kesiapan |
|---|---|---|---|
| A-STAT | 2 · verdict statistik | `features/brain/fiezel-policy-verdict.js` + test | siap jalan |
| A-NOF1 | 3 · eksperimen N-of-1 | `features/brain/fiezel-nof1.js` + test | siap jalan |
| A-CFG | 4 · registry + ledger parameter | `fiezel-brain-config.js`, `fiezel-param-ledger.js` + test | siap jalan |
| A-GOV | 6 · gate runner + draf governance | worker, `tools/run-content-gates.js`, draf | siap jalan |
| A-TUNE | 5 · penyetelan-diri | `features/brain/fiezel-self-tune.js` + test | menunggu A-STAT + A-CFG |
| A-WIRE | integrasi | jalur aplikasi + manifest + CI | menunggu semuanya |

Aturan anti-bentrok yang paling penting: **agent membangun modul murni, bukan wiring.** Seluruh
penyambungan ke `app.js`/`index.html`/`sw.js` dipegang satu integrator di gelombang terakhir.

Keputusan yang menunggu OWNER (Langkah 6, dan tidak bisa digantikan kode apa pun):
`MASTER-ONLY-GOVERNANCE.md` melarang promosi otomatis secara struktural, sementara
`fiezel-autonomy-config.js` menyediakan level `full`. Keduanya tidak bisa benar sekaligus.
Yang harus OWNER tuliskan: kelas perubahan apa yang boleh terbit tanpa manusia, dengan
otorisasi bertanda tangan, berbatas waktu, dan bisa dicabut.
