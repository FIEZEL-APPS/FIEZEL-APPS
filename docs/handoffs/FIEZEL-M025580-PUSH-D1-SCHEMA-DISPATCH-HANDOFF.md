# FIEZEL Handoff Dossier — Build m025-580
**Topik**: Perbaikan Push Notifikasi Ponsel: D1 Legacy Schema Bootstrap, Auto-Refresh Kunci VAPID Klien, & Dukungan Pengiriman Notifikasi Kustom

---

## 1. Ringkasan Temuan Audit & Akar Masalah
Saat pengujian pengiriman notifikasi pengingat via remote push (*"belum muncul di pwa hp ku"*), dilakukan penelusuran telemetri dan log eksekusi GitHub Actions workflow `push-reminders.yml` (run 38411462048 & 38412144159) dengan hasil:
`{"checked":0,"sent":0,"failed":0,"suppressed":0,"at":"..."}`

Akar masalah ditemukan di 3 titik kritis:
1. **Tabel D1 `push_subscriptions` Belum Terpasang di Produksi (Missing Runtime Schema)**:
   - Migrasi D1 `0014_legacy_puter.sql` mendefinisikan tabel `push_subscriptions`, `brain_attempts`, `policy_outcomes`, `feedback`, dan `evolution_ledger`.
   - Token CI Cloudflare Worker secara terdesain tidak memiliki izin `wrangler d1 execute --remote`. Fitur lain (seperti `social_profile` pada `workers/api/social-schema.js`) menyelesaikan ini dengan menerapkan DDL idempoten (`CREATE TABLE IF NOT EXISTS`) saat isolate dingin pertama.
   - Pada `route-legacy.js`, tidak ada runtime schema bootstrap. Panggilan `INSERT INTO push_subscriptions` dan kueri `SELECT ... FROM push_subscriptions` gagal (`no such table: push_subscriptions`) dan ditelan oleh `.catch(() => {})`, menyebabkan jumlah pendaftar selalu 0 (`checked: 0`).
2. **Kunci VAPID Usang pada Push Subscription Klien (Stale ApplicationServerKey)**:
   - Pada `app.js`, `let sub = await reg.pushManager.getSubscription()` langsung memakai langganan lama tanpa memverifikasi apakah `applicationServerKey` cocok dengan kunci publik VAPID server terbaru. Jika klien pernah mendaftar dengan kunci lama/dummy, token tidak pernah diperbarui.
3. **Ketiadaan Parameter Pesan Kustom & Override Jeda 18 Jam**:
   - `POST /api/reminders/due` dan `push-dispatcher.mjs` sebelumnya hanya memfilter subscriber dengan `last_push_at <= 18 jam lalu`, tidak menyediakan isi pesan teks custom (hanya judul default), dan tidak memiliki sakelar `force` untuk tes pengiriman langsung dari operator/CI.

---

## 2. Rincian Perubahan Kode
1. **`workers/api/legacy-schema.js` (Baru)**:
   - Menyediakan `ensureLegacySchema(db)` dengan WeakMap cache yang mengeksekusi DDL `0014_legacy_puter.sql` secara idempoten (`CREATE TABLE IF NOT EXISTS`) untuk kelima tabel warisan: `push_subscriptions`, `brain_attempts`, `policy_outcomes`, `feedback`, dan `evolution_ledger`.
2. **`workers/api/route-legacy.js`**:
   - Menghubungkan `ensureLegacySchema(ctx.env.CORE_DB)` sebelum operasi D1 pada `POST /api/push/subscribe`, `POST /api/activity`, `GET /api/admin/status`, dan `POST /api/reminders/due`.
   - Menambahkan parsing body parameter `force`, `customTitle`, dan `customBody` pada `POST /api/reminders/due`.
   - Menghilangkan filter 18 jam saat `force === true` sehingga tes push dapat dikirimkan langsung ke semua subscriber.
   - Mengisi properti `body` dan `title` pada objek `notification` sesuai pesan kustom yang diminta.
3. **`app.js`**:
   - Memperbarui `ensureRemotePushSubscription()` untuk mencocokkan byte `sub.options.applicationServerKey` dengan `base64UrlBytes(key)`. Jika tidak cocok (stale key), langganan otomatis di-unsubscribe dan didaftarkan ulang dengan kunci VAPID server aktif.
4. **`push-dispatcher.mjs`**:
   - Mengirimkan payload `{ force, customTitle, customBody }` dari environment variable `REMINDER_FORCE`, `REMINDER_CUSTOM_TITLE`, dan `REMINDER_CUSTOM_BODY` ke `POST /api/reminders/due`.
5. **`.github/workflows/push-reminders.yml`**:
   - Menambahkan `workflow_dispatch` inputs: `custom_body`, `custom_title`, dan `force` (default `true` untuk eksekusi manual).
6. **Hexa-Sync Arbiter**:
   - Menaikkan nomor build ke `m025-580`.

---

## 3. Hasil Pengujian & Bukti Empiris
- **Syntax Check**: `node --check` pada semua berkas lulus 100%.
- **Local Contract Gates**:
  - `tests/remote-push-test.js` PASS
  - `tests/core-brain-test.js` PASS
  - `tests/cf-api-contract-test.js` PASS
  - `tests/cf-wiring-test.js` PASS
  - `tests/d1-schema-contract-test.js` PASS (41/41 checks)
  - `tests/id-golden-snapshot-test.js` PASS
  - `tests/th-ui-leak-test.js` PASS
  - `tests/curriculum-cache-version-test.js` PASS (m025-580)
  - `tests/gate-registry-test.js` PASS (10/10 checks)
  - `tests/secret-scan-test.js` PASS (46/46 checks, 0 secrets leaked)
- **Hexa-Sync Status**: `node tools/bump-build.mjs --check` mencetak `Selaras`.
