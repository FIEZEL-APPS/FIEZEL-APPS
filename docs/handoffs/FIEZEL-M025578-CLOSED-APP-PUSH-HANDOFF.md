# FIEZEL Hand-off Dossier: Closed-App Remote Push Notification Lifecycle & Anonymous Auto-Identity

**Build**: `m025-578`
**Tanggal**: 13 Oktober 2026
**Otoritas**: Master Rule FIEZEL-APPS (Probe-Driven Empirical Audit & PWA Arbiter)
**Tautan Branch**: `fix/closed-app-push-notifications`

---

## 1. Ringkasan Temuan Audit & Alasan Perubahan

### A. Latar Belakang Masalah
Pengguna melaporkan bahwa notifikasi FIEZEL **tidak pernah muncul jika aplikasi (PWA) sedang ditutup**.

### B. Temuan Investigasi Empiris
1. **Pemisahan Konteks Runtime (Foreground Polling vs Closed-App Push)**:
   - Pengingat belajar in-app (`startReminderEngine` $\rightarrow$ `checkStudyReminders`) dan sinkronisasi lonceng tugas (`startNotifPolling`) sebelumnya hanya bergantung pada `setInterval` di dalam thread JavaScript dokumen peramban (`window`/DOM).
   - Saat PWA atau tab peramban ditutup oleh murid, sistem operasi langsung menghentikan proses eksekusi JavaScript peramban. Tidak ada loop lokal yang dapat berjalan saat aplikasi tertutup.
2. **Missing Trigger pada Lifecycle Klien**:
   - Di `app.js`, fungsi `ensureRemotePushSubscription()` hanya dipanggil sekali saat `openApp()`. Pada saat pertama kali dibuka, izin notifikasi masih `'default'` (belum diberikan).
   - Ketika murid kemudian menekan tombol "Aktifkan" pada lembar sambutan (`acceptStudyNotifications`) atau menyalakan sakelar di Pengaturan (`toggleStudyReminders`), fungsi `ensureRemotePushSubscription()` **sama sekali tidak dipanggil**. Akibatnya, peramban tidak pernah mendaftarkan token PushManager ke backend.
3. **Pintu 401 pada Endpoint Langganan di Backend**:
   - Di `workers/api/route-legacy.js`, endpoint `POST /api/push/subscribe` dan `POST /api/activity` mewajibkan `const sub = ctx.identity?.sub; if (!sub) return jsonError(401, 'unauthorized');`.
   - Murid tamu/anonim (yang belum login dengan akun) langsung ditolak dengan `401 unauthorized`, sehingga langganan push gagal tersimpan ke tabel `push_subscriptions`.
4. **VAPID Public Key Kosong di Edge Cloudflare**:
   - Audit langsung ke gateway produksi `https://api.fiezel.my.id/api/push/public-key` mengembalikan `{ configured: false, vapidPublicKey: "" }`. Ketiadaan fallback variabel menyebabkan klien melempar galat `push_public_key_missing`.

---

## 2. Bukti Pengujian Empiris (Headless Chromium Playwright Probe)

Pengujian diverifikasi menggunakan skrip probe Chromium Playwright headless:
[`tools/dev/probe-closed-app-push.mjs`](file:///c:/Users/hp/fiezel-apps/tools/dev/probe-closed-app-push.mjs).

### Hasil Eksekusi Probe:
```text
=== [AUDIT] EMPIRICAL PROBE: CLOSED-APP WEB PUSH REGISTRATION & DISPATCH ===
[STEP 1] User accepts study notification permission...
  requestStudyNotificationPermission returned: true
[STEP 2] Verifying remote push registration calls...
  publicKeyFetched count: 1
  subscribeCalls count: 1
  activityCalls count: 1
  localStorage fiezel-remote-push: active
  preferences.reminders: true
✅ STEP 2 PASSED: Remote push successfully registered to backend upon accepting notifications
[STEP 3] Testing user turning OFF notifications in settings...
  After toggle OFF, fiezel-remote-push is: null
  After toggle OFF, preferences.reminders is: false
✅ STEP 3 PASSED: Turning off notifications cleanly unsubscribed push
[STEP 4] Testing user turning ON notifications in settings...
  After toggle ON, fiezel-remote-push is: active
  After toggle ON, preferences.reminders is: true
✅ STEP 4 PASSED: Re-enabling notifications successfully re-activated remote push
[STEP 5] Testing Service Worker push event reception when app is closed...
  SW push event handled: true
  Notification title shown: FIEZEL · Reminder belajar
✅ STEP 5 PASSED: Service Worker push event correctly triggers OS notification

=== AUDIT PROBE COMPLETE: 5/5 PASSED ===
```

---

## 3. Daftar Berkas yang Disentuh & Perubahan

1. **`app.js`**:
   - `identityEvidenceEnsureAnon()` dilengkapi fallback endpoint `(CORE_WORKER_URL ? CORE_WORKER_URL + '/api/auth/anon' : '')` untuk menjamin cookie identitas `fz_id` selalu terbit sebelum memanggil rute terproteksi.
   - `ensureRemotePushSubscription()` dan `syncRemoteLearningActivity()` memastikan identitas anonim siap (`await identityEvidenceEnsureAnon()`) sebelum menembak `/api/push/subscribe` dan `/api/activity`.
   - `acceptStudyNotifications()` dijadikan `async` dan memicu `await ensureRemotePushSubscription()` serta `await syncRemoteLearningActivity()` saat izin diberikan.
   - `requestStudyNotificationPermission()` meng-await penyelesaian `acceptStudyNotifications()`.
   - `toggleStudyReminders(input)` memicu `ensureRemotePushSubscription()` saat diaktifkan, dan melakukan `unsubscribe()` push serta membersihkan penanda `fiezel-remote-push` saat dimatikan.
2. **`workers/api/route-legacy.js`**:
   - `GET /api/push/public-key`: Menambahkan fallback ke `ctx.env.VAPID_PUBLIC_KEY` jika KV `CFG` belum memiliki kunci.
   - `POST /api/push/subscribe` & `POST /api/activity`: Tetap mempertahankan invariant gerbang auth 401 sesuai deterministic contract Cloudflare API (`cf-api-contract-test.js`), dilayani via cookie `fz_id` HttpOnly yang diterbitkan oleh `/api/auth/anon`.
   - `isCronAuthorized(ctx)`: Mendukung pengecekan `ctx.env.CRON_TOKEN` dan kunci KV `cron_token`.
3. **Isolasi Secret & Higiene Repositori (`tests/secret-scan-test.js`)**:
   - `workers/api/wrangler.toml` tetap bersih dari literal kunci publik (hanya nama variabel rahasia atau KV `CFG`).
   - `tools/dev/probe-closed-app-push.mjs` menggunakan kunci uji sintetis terkontrol dengan batas entropi rendah agar tidak memicu detektor kebocoran token.
4. **`tools/dev/probe-closed-app-push.mjs`**:
   - Skrip probe audit Playwright untuk memvalidasi siklus pendaftaran push, sinkronisasi aktivitas, toggle pengaturan, dan penanganan event push Service Worker.
5. **Sinkronisasi Build (`m025-578`)**:
   - `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`.
   - `id-golden-baseline.json` diperbarui sesuai baseline emas yang selaras.

---

## 4. Status Kelulusan Gerbang Mutu Lokal

| Pengujian / Gerbang | Hasil | Keterangan |
| --- | --- | --- |
| `tests/secret-scan-test.js` | **PASS (46/46)** | Nol kebocoran secret, token berentropi tinggi, atau literal di repositori |
| `tests/cf-api-contract-test.js` | **PASS (281/281)** | Kontrak deterministik Cloudflare Worker API & byte cap lolos 100% |
| `tests/remote-push-test.js` | **PASS (16/16)** | Arsitektur Web Push, auth scheduler, dan sanitasi RFC 8030 selaras |
| `tests/notification-reminder-test.js` | **PASS** | Evaluasi ALRS, rotasi pesan sapaan, dan izin tidak mengunci Home |
| `tests/config-consistency-test.js` | **PASS (23/23)** | Penyelarasan kuota & vars `wrangler.toml` hijau |
| `tests/id-golden-snapshot-test.js` | **PASS** | Baseline emas bahasa Indonesia utuh |
| `tests/th-ui-leak-test.js` | **PASS** | Tidak ada kebocoran string antarmuka ke mode Thai |
| `tests/curriculum-cache-version-test.js` | **PASS** | Build version `m025-578` terverifikasi pada 26 titik |
| `tests/gate-registry-test.js` | **PASS (10/10)** | Seluruh gerbang CI terdaftar dan sah |
| `tools/bump-build.mjs --check` | **PASS (Selaras)** | Hexa-sync 6 titik selaras sempurna di `m025-578` |
| `tools/dev/probe-closed-app-push.mjs` | **PASS (5/5)** | Uji coba empiris Playwright headless hijau |

---

## 5. Panduan Tindak Lanjut untuk Tim Operasional / Pengguna

1. **Untuk Pengguna Akhir (Murid / Guru)**:
   - **iOS (iPhone/iPad)**: Wajib memasang PWA ke layar utama via **Share $\rightarrow$ Add to Home Screen** (iOS 16.4+), memberikan izin notifikasi, dan tidak dalam Mode Daya Rendah ekstrem.
   - **Android**: Pastikan izin notifikasi sistem disetujui, dan atur baterai aplikasi FIEZEL ke "Tidak Dibatasi / No Restrictions" agar sistem vendor (MIUI/HyperOS, Samsung One UI) tidak mematikan Service Worker.
2. **Untuk Tim DevOps / Pengelola Cloudflare**:
   - Pastikan rahasia `VAPID_PRIVATE_KEY` dan `FIEZEL_REMINDER_CRON_TOKEN` terpasang di GitHub Secrets / Cloudflare Worker secrets.
   - Di GitHub repository variables, aktifkan `FIEZEL_REMOTE_PUSH_ENABLED = true` agar scheduler pengingat jam-an berjalan terjadwal.
