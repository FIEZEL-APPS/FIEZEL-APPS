# FIEZEL Hand-off Dossier: API Worker VAPID & Cron Provisioning

**Build**: `m025-579`
**Tanggal**: 13 Oktober 2026
**Otoritas**: Master Rule FIEZEL-APPS (Probe-Driven Empirical Audit & PWA Arbiter)
**Tautan Branch**: `fix/deploy-api-vapid-provisioning`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Latar Belakang Masalah
Notifikasi belum dapat diterima pada perangkat HP pengguna karena endpoint publik gateway `GET /api/push/public-key` di produksi masih mengembalikan `{ configured: false, vapidPublicKey: "" }`.

### B. Temuan Investigasi Empiris
1. **Penyebab `configured: false` di Produksi**:
   - Cloudflare KV namespace `CFG` belum memuat entri `vapid_public_key` maupun `cron_token`.
   - Workflow `.github/workflows/deploy-api-worker.yml` sebelumnya hanya mendistribusikan kode dan binding dasar tanpa melakukan provisi nilai kunci publik VAPID dan token cron ke penyimpanan KV `CFG` atau Worker Secrets.
2. **Dampak pada Perangkat Pengguna**:
   - Saat PWA dibuka di HP, browser memanggil `fetchRemoteVapidPublicKey()`.
   - Karena kunci kosong, browser melempar galat `push_public_key_missing` dan mencatat `fiezel-remote-push: error` di `localStorage`.
   - PWA tidak dapat memanggil `reg.pushManager.subscribe(...)` ke server push browser (FCM / APNs), sehingga token endpoint perangkat tidak pernah tersimpan di tabel `push_subscriptions`.

---

## 2. Solusi yang Diterapkan

1. **Otomatisasi Provisi pada Deploy API Worker (`.github/workflows/deploy-api-worker.yml`)**:
   - Menyuntikkan rahasia GitHub `VAPID_PUBLIC_KEY` dan `FIEZEL_REMINDER_CRON_TOKEN` ke dalam execution environment workflow.
   - Setelah `npx wrangler deploy`, workflow secara otomatis menulis:
     a) `vapid_public_key` ke namespace KV `CFG`.
     b) `cron_token` ke namespace KV `CFG`.
     c) Worker Secret `VAPID_PUBLIC_KEY` dan `CRON_TOKEN`.
2. **Penyelarasan Build (`m025-579`)**:
   - Sinkronisasi Hexa-Sync pada `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, dan `misi.html`.

---

## 3. Status Kelulusan Gerbang Mutu Lokal

| Pengujian / Gerbang | Hasil | Keterangan |
| --- | --- | --- |
| `tests/deploy-api-binding-guard-test.js` | **PASS** | Skrip substitusi binding dan penjaga placeholder tetap utuh |
| `tests/secret-scan-test.js` | **PASS (46/46)** | Nol kebocoran secret atau literal berentropi tinggi di repositori |
| `tests/curriculum-cache-version-test.js` | **PASS** | Build version `m025-579` terverifikasi pada 26 titik |
| `tests/gate-registry-test.js` | **PASS (10/10)** | Seluruh gerbang CI terdaftar dan sah |
| `tools/bump-build.mjs --check` | **PASS (Selaras)** | Hexa-sync 6 titik selaras sempurna di `m025-579` |
