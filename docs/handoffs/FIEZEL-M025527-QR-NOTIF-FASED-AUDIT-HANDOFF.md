# FIEZEL Handoff Dossier — Build m025-527: Hotfix Scanner QR, Polling Throttle, dan Tata Kelola Butir Mapel Fase D

Otoritas: OWNER / CI Arbiter
Tanggal: 9 Oktober 2026
Branch: `fix/m025-527-qr-notif-fased-audit`
Target Merge: `main` via PR (sesuai Git Protection Rule)
Build Version: `m025-527` (Hexa-Sync Arbiter Verified)

---

## 1. Ringkasan Temuan Audit & Dasar Perubahan

Audit komprehensif tertanggal 9 Oktober 2026 atas rilis `m025-526` mengidentifikasi sejumlah anomali penting pada integrasi Scanner QR, Polling Notifikasi Teman, serta Integritas Konten Mapel Fase D. Dokumen ini merekam hasil investigasi dan eksekusi Sprint 1 perbaikan:

| # | Temuan Audit | Dampak & Gejala Lapangan | Status Solusi di m025-527 |
|---|---|---|---|
| 1 | **Kamera Bocor / Track Leak (`app.js`)** | Race condition: jika modal ditutup/navigasi berpindah saat `getUserMedia` masih berlangsung, stream tidak dimatikan dan rAF loop berjalan abadi. | **SELESAI**: Diberi generation counter (`_qrScanGen++`), validasi state pasca-await, dan penghentian otomatis pada event `visibilitychange` (hidden). |
| 4 | **Loop QR Tidak Valid & Audio Feedback Palsu** | `handleScannedQrResult()` selalu memutar SFX sukses lebih dulu; scan payload invalid/milik sendiri memicu loop cepat toast + sfx berulang. | **SELESAI**: SFX sukses hanya berbunyi jika handle valid dan bukan milik sendiri; payload yang sama di-debounce 3 detik tanpa restart kamera destruktif. |
| 8 | **Modal QR Terblokir Latensi Jaringan** | `openFriendConnectModal` melakukan `await refreshFriendRequestCount()` sebelum merender modal, menyebabkan tombol macet saat offline/koneksi lambat. | **SELESAI**: Modal dibuka instan (optimistic UI), update badge dilakukan asinkron di latar belakang (`#connectBadgeCount`). |
| 2 (Klien) | **Polling Teman Tanpa Throttle** | `refreshFriendRequestCount()` dipanggil setiap 6 detik (`NOTIF_POLL_MS`) tanpa batas gap minimal. | **SELESAI**: Diberikan throttle `FRIEND_REQ_MIN_GAP_MS = 60000` (60 detik) pada panggilan berkala latar belakang, kecuali dipaksa (`force=true`). |
| 10 | **Galeri QR Decode Resolusi Penuh** | Memuat foto kamera resolusi tinggi (12 MP / ~48 MB piksel mentah) langsung ke jsQR dengan `attemptBoth`. | **SELESAI**: Canvas galeri di-downscale dengan batas dimensi maksimum 1024px sebelum diserahkan ke decoder jsQR. |
| 11 | **Regex Parser QR Terlalu Longgar** | Regex mencocokkan `@` di tengah string (misal alamat email `budi@gmail.com` -> `gmail`) dan batas karakter 24 berbeda dari server (20). | **SELESAI**: Regex dibatasi hanya di awal string, whitespace, atau path/parameter resmi, dengan rentang panjang 3–20 karakter sesuai schema server. |
| 12 | **Komentar Polling Tidak Sinkron** | Komentar di atas `NOTIF_POLL_MS` menyebut 15 detik, sedangkan kode aktual 6000 ms. | **SELESAI**: Komentar diperbarui menjelaskan interval 6 detik untuk guru-murid dan throttle 60 detik untuk D1. |
| 3 | **Tata Kelola Butir Mapel Fase D (928 Butir)** | Label `penyusunButir: "resmi-terverifikasi"` dipakai tanpa dokumen pembuktian pencocokan PDF buku siswa terarsip di repo. | **SELESAI**: Sesuai instruksi owner, label pada kelima mapel Fase D (`eng`, `ind`, `ipa`, `ips`, `mat`) diturunkan menjadi `kurikulum-merdeka-terkurasi`. `tests/mapel-fase-d-content-test.js` diperbarui mengakui status ini. |

---

## 2. Bukti Pengujian Empiris (Playwright Probe)

Sesuai *Mandatory Protocol: Probe-Driven Empirical Audit*, pengujian dilakukan menggunakan skrip probe Chromium headless nyata (`tools/dev/qr-notif-audit-m025-527-probe.mjs`).

### Hasil Eksekusi Pra-Perbaikan vs Pasca-Perbaikan:

```
[SEBELUM PERBAIKAN]:
FAIL: parseFriendHandleFromQr("halo@gmail.com") -> dapat="gmail", harap=null
FAIL: parseFriendHandleFromQr("https://google.com/search?q=@test") -> dapat="test", harap=null
FAIL: handleScannedQrResult(invalid) tidak memutar sfx success -> dapat=["success"], harap=[]
FAIL: refreshFriendRequestCount() throttling (3 panggilan beruntun) -> dapat=3, harap=1
FAIL: startQrVideoScan() race condition menutup modal menghentikan track kamera -> dapat=false, harap=true

[SESUDAH PERBAIKAN (m025-527)]:
PASS: parseFriendHandleFromQr("https://fiezel.my.id/app/?friend=rian_guru") -> dapat="rian_guru"
PASS: parseFriendHandleFromQr("https://fiezel.my.id/app/#friend/siti_pintar") -> dapat="siti_pintar"
PASS: parseFriendHandleFromQr("@dian_pertiwi") -> dapat="dian_pertiwi"
PASS: parseFriendHandleFromQr("budi_123") -> dapat="budi_123"
PASS: parseFriendHandleFromQr("halo@gmail.com") -> dapat=undefined (ditolak)
PASS: parseFriendHandleFromQr("https://google.com/search?q=@test") -> dapat=undefined (ditolak)
PASS: parseFriendHandleFromQr("aaaaaaaaaaaaaaaaaaaaaaaaa") -> dapat=undefined (panjang > 20 ditolak)
PASS: handleScannedQrResult(invalid) tidak memutar sfx success -> sfxCalls=[] (nol sfx sukses)
PASS: refreshFriendRequestCount() throttling (3 panggilan beruntun) -> apiFetchCount=1 (hemat 66% kueri)
PASS: startQrVideoScan() race condition menutup modal menghentikan track kamera -> trackStopped=true
```

---

## 3. Daftar Berkas yang Disentuh

1. `app.js`:
   - Penambahan lifecycle safety token `_qrScanGen`, pembersihan track kamera saat modal tertutup/hidden.
   - Perbaikan `parseFriendHandleFromQr` (pengetatan regex handle, cegah kebocoran email).
   - Penambahan debounce 3 detik dan pengondisian SFX pada `handleScannedQrResult`.
   - Optimasi `openFriendConnectModal` menjadi non-blocking.
   - Downscale canvas galeri foto ke batas 1024px pada `handleQrFilePicked`.
   - Throttle 60 detik (`FRIEND_REQ_MIN_GAP_MS = 60000`) pada `refreshFriendRequestCount`.
   - Penyelarasan komentar polling di sekitar `NOTIF_POLL_MS`.
2. `content/mapel/mapel-eng-d.json`:
   - Penyesuaian `penyusunButir` ke `"kurikulum-merdeka-terkurasi"`.
3. `content/mapel/mapel-ind-d.json`:
   - Penyesuaian `penyusunButir` ke `"kurikulum-merdeka-terkurasi"`.
4. `content/mapel/mapel-ipa-d.json`:
   - Penyesuaian `penyusunButir` ke `"kurikulum-merdeka-terkurasi"`.
5. `content/mapel/mapel-ips-d.json`:
   - Penyesuaian `penyusunButir` ke `"kurikulum-merdeka-terkurasi"`.
6. `content/mapel/mapel-mat-d.json`:
   - Penyesuaian `penyusunButir` ke `"kurikulum-merdeka-terkurasi"`.
7. `tests/mapel-fase-d-content-test.js`:
   - Menambahkan `'kurikulum-merdeka-terkurasi'` ke array `PENYUSUN_SAH`.
8. `tools/dev/qr-notif-audit-m025-527-probe.mjs`:
   - Skrip probe otomatis headless Playwright penguji ketahanan scanner dan throttle.
9. Berkas Hexa-Sync Versi Build (`m025-527`):
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

---

## 4. Status Kelulusan Gerbang Mutu Lokal

Seluruh pemeriksaan mutu lokal lolos 100%:
- `tests/mapel-fase-d-content-test.js`: **PASS (171/171 assertions)**
- `tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `tests/th-ui-leak-test.js`: **PASS (FIEZEL m025-265 kebocoran naskah Indonesia di mode Thai: PASS)**
- `tests/curriculum-cache-version-test.js`: **PASS (build m025-527)**
- `tests/gate-registry-test.js`: **PASS (10 pass, 0 fail)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6 titik pada m025-527)**

---

## 5. Catatan Utang Teknis untuk Sprint Berikutnya

Temuan audit yang dijadwalkan pada sprint lanjutan:
1. **Worker API N+1 Query (`workers/api/route-social.js`)**: Batching kueri `readProfile` di `routeFriendsRequests` (Sprint 2).
2. **jsQR Lazy Load & License Header**: Ekstraksi header Apache-2.0, pemindahan ke `fiezel-lazy-loader.js`, dan pencatatan di `THIRD-PARTY-LICENSES.md` (Sprint 3).
3. **i18n Thai Modal QR**: Ekstraksi 10+ teks literal modal QR ke token kamus dua bahasa (Sprint 4).
4. **Deploy Exclude Hygiene**: Memperluas `deploy/site-exclude.txt` untuk berkas internal non-runtime tanpa melanggar aset yang dimuat runtime.
