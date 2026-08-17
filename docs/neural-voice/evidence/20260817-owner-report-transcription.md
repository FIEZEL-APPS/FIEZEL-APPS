# Laporan Diagnostik & Instruksi Perbaikan (Final)

Source attachment: `Laporan Final FIEZEL Neural Voice m025-10 ke m025-21.pdf`

Integrity:
- SHA-256: `cab330aaa40b74f79d923b715a1732274b7d5ac06745ae5476a5e1bdf8056130`
- Size: `10444` bytes
- Pages: 3

This is a text transcription for durable GitHub access. The source report is owner-supplied evidence and should be read together with `20260817-m02521-owner-report-reconciled.md`, which separates observations from claims superseded by later repository/physical evidence.

## Header

Modul FIEZEL Neural Voice (Kokoro TTS On-Device) — Ditujukan kepada Developer

Aplikasi: FIEZEL Adaptive Learning Engine | Versi App: 5.19.0

Build dianalisis: m025-10, m025-12, m025-16, m025-21 (rentang 2026-08-16 18:19 UTC s/d 2026-08-17 02:52 UTC)

## 1. Ringkasan untuk Developer

Empat diagnostic dump terpisah, dikumpulkan sepanjang sekitar 8,5 jam pengujian manual, disebut menunjukkan akar masalah yang identik dan tidak berubah dari build ke build, dengan performa memburuk. Build m025-21 mengandung penanda `rollbackBuild`, menunjukkan perubahan yang sempat dicoba lalu dibatalkan. Dokumen menyatakan dirinya sebagai rangkuman final lintas-build dengan instruksi perbaikan konkret.

## 2. Tren Performa Lintas Build

| Build | Waktu ditangkap | crossOriginIsolated | wasmPolicy | Waktu chunk pertama | Catatan |
|---|---|---|---|---:|---|
| m025-10 | 16:19 (16 Agu) | false | tidak dilog eksplisit | 17,6 dtk | Baseline awal |
| m025-12 | 19:08 (16 Agu) | false | apple-standalone-single-thread | 14,9 dtk | Gagal total setelah app di-background ("gagal lagi") |
| m025-16 | 22:39 (16 Agu) | false | default | 17,1 dtk | Selesai tapi 1 kalimat = 250 detik total |
| m025-21 | 02:52 (17 Agu) | false | apple-standalone-single-thread | 93,6 dtk | Terburuk. WebGPU tersedia tapi dimatikan. Ada rollbackBuild |

Report menyatakan dari m025-16 ke m025-21, waktu chunk pertama naik dari 17,1 detik menjadi 93,6 detik, lebih dari 5 kali lebih lambat, sementara `crossOriginIsolated: false` tidak berubah.

## 3. Temuan Baru yang Kritis — Build m025-21

### 3.1 WebGPU tersedia tapi sengaja dimatikan

Report mencatat event `adapter_backend_capability` m025-21 dengan `webgpuAvailable: true`, tetapi `autoWebGpuSuppressed: true` dan `configuredDevice: "wasm"`. Report mengusulkan WebGPU sebagai jalur perbaikan performa yang mungkin lebih cepat daripada menunggu COOP/COEP.

### 3.2 Penanda rollback tanpa penjelasan

Field `rollbackBuild: "m025-21"` muncul pada `adapter_backend_capability`. Report meminta dokumentasi apa yang dicoba dan kenapa dibatalkan.

### 3.3 Timeout tidak ditegakkan

`generationTimeoutMs: 30000` ada di konfigurasi, tetapi generate chunk pertama m025-21 berjalan sampai 95.480 ms dan dicatat sebagai `generate_completed_over_budget`, bukan dibatalkan.

### 3.4 Reload berulang dalam satu sesi

Satu capture m025-21 disebut mengandung 3 kali `bootstrap_loaded` dan 2 kali `init_start` penuh, masing-masing menghabiskan 11–19 detik untuk mencapai ready sebelum bicara.

## 4. Temuan sebelumnya yang disebut belum ditutup

- Cross-origin isolation tidak aktif di seluruh empat build; report menyebut ini menghalangi WASM threaded / optimisasi yang membutuhkan SharedArrayBuffer.
- Report menyatakan instance model tidak di-cache antar-permintaan dan tiap sesi bicara mengulang inisialisasi 10–19 detik.
- Recovery setelah app di-background disebut gagal senyap pada m025-12.

## 5. Instruksi Perbaikan — Urutan Prioritas Baru

### #1 Aktifkan backend WebGPU

Hapus atau syaratkan ulang `autoWebGpuSuppressed`; izinkan WebGPU saat tersedia. Jika suppression dipasang karena bug tertentu, dokumentasikan dan gunakan pengecualian device yang lebih spesifik.

### #2 Aktifkan cross-origin isolation (COOP/COEP)

Report mengusulkan service-worker shim pola `coi-serviceworker` untuk menyisipkan Cross-Origin-Opener-Policy dan Cross-Origin-Embedder-Policy pada GitHub Pages.

### #3 Cache instance model antar-permintaan

Simpan adapter/model pada scope modul dan hindari re-init tiap permintaan bicara.

### #4 Tegakkan timeout secara nyata

`generationTimeoutMs` harus benar-benar membatalkan proses generate yang melebihi batas, bukan hanya mencatat over-budget setelah selesai.

### #5 Pulihkan pipeline setelah app di-background

Tambahkan state machine dan logging eksplisit pada handler tap bicara agar kegagalan setelah released tidak senyap.

### #6 Dokumentasikan alasan rollback

Dokumentasikan apa yang dicoba, kenapa dibatalkan, dan apakah pendekatan masih relevan untuk dicoba ulang.

## 6. Kriteria selesai sebelum build berikutnya dikirim testing

| No | Kriteria | Cara verifikasi cepat |
|---:|---|---|
| 1 | Backend WebGPU aktif jika tersedia | `adapter_backend_capability`: device terpakai webgpu, bukan wasm |
| 2 | `crossOriginIsolated` aktif sebagai fallback | `self.crossOriginIsolated === true` |
| 3 | Tidak ada re-init model di permintaan kedua dst. | `adapter_instance_ready` tidak muncul lagi setelah request pertama dalam sesi yang sama |
| 4 | Timeout benar-benar membatalkan proses | generate tidak pernah melebihi `generationTimeoutMs` di log |
| 5 | Pipeline pulih setelah app di-background | background 30 detik, buka lagi, bicara, harus capai `generate_start` |

Target performa yang ditulis report: generate per chunk di bawah 1–2 detik jika WebGPU berhasil, atau 1–3 detik jika threaded WASM via cross-origin isolation.

## 7. Permintaan kepada Developer

Report meminta agar build baru tidak dikirim untuk testing manual sebelum minimal perubahan WebGPU diverifikasi developer terlebih dahulu, karena siklus manual dari m025-16 ke m025-21 disebut menunjukkan regresi 17 detik menjadi 93,6 detik.

## Important repository reconciliation

The report predates the m025-22 repair and its priority order is not automatically authoritative. In particular, the WebGPU-first recommendation is superseded by the physical m025-20 blackout/ejection failure and m025-21 rollback. See `20260817-m02521-owner-report-reconciled.md` before acting on any recommendation above.
