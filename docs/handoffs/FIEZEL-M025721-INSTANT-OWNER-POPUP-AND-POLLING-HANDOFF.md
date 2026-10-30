# Serah Terima Resmi: FIEZEL-M025721 — Instant Owner Message Popup & Real-Time Polling Heartbeat

## 1. Ringkasan Eksekutif & Temuan Empiris
Pada rilis `m025-720`, integrasi pengiriman pesan dan injeksi GEM dari Dashboard Owner telah terhubung ke database Cloudflare D1 dan Worker backend. Namun pada pengujian empiris langsung di sisi pengguna, ditemukan bahwa:
1. **Tidak Ada Auto-Popup Dialog**: Handler `pollOwnerMessages()` hanya memanggil `showToast()` (banner notifikasi teks kecil) dan tidak membuka modal dialog pop-up interaktif secara otomatis. Akibatnya, murid yang tidak memperhatikan lonceng kecil di atas tidak melihat pesan atau popup perayaan reward.
2. **Ketiadaan Polling Heartbeat Berkala**: Pemeriksaan `pollOwnerMessages()` dan `checkPendingGemGrants()` hanya dieksekusi satu kali saat boot awal (`setTimeout` 1200ms) dan saat perpindahan tab (`visibilitychange` / `focus`). Ketika murid tetap berada di satu layar, PWA tidak pernah melakukan polling berkala, sehingga pesan terasa sangat lambat atau tidak muncul sama sekali.
3. **Bypass Transport Eksekusi**: `coreWorkerExec()` sebelumnya membelokkan rute yang belum terdaftar di `CF_ENDPOINT_ROUTES` ke jalur warisan Puter fallback (`corePuterExec()`) yang menambah latensi.
4. **Resiliensi Kartu Pesan di Dasbor Owner**: `workers/owner/index.js` menyembunyikan kartu pesan murid bila subrequest bukti belajar Braincore berada dalam status `unconfigured` atau `unavailable`.

Pada build `m025-721`, seluruh masalah ini diselesaikan dengan otoritas penuh OWNER/MASTER.

---

## 2. Rincian Perubahan Kode

### A. Auto-Popup Dialog & Heartbeat Polling di PWA (`app.js`)
1. **Bypass Langsung Transport Cloudflare**:
   - Menambahkan pengecekan eksplisit di `coreWorkerExec`:
     ```javascript
     if(p.startsWith('/api/learner/')||p.startsWith('/api/gems/')||p.startsWith('/api/owner/'))return cfWorkerFetch(path,options);
     ```
   - Seluruh pemanggilan pesan dan klaim GEM kini langsung menuju gateway Cloudflare API tanpa hambatan atau jeda fallback.
2. **Otomatis Munculkan Modal Dialog (`openOwnerMessageModal`)**:
   - Di dalam `pollOwnerMessages()`: ketika terdeteksi pesan baru belum dibaca dari Owner (`ownerMessagesUnreadCount > prevUnread || force`), PWA seketika membunyikan efek suara notifikasi dan **langsung membuka modal pop-up interaktif di tengah layar** (`openOwnerMessageModal(latestMsg.id)`).
   - Menambahkan silent claim pada `checkPendingGemGrants(true)` agar GEM bonus yang terlampir di pesan otomatis dikreditkan ke saldo akun tanpa menimpa modal pesan aktif.
3. **Heartbeat Polling Aktif (`startNotifPolling`)**:
   - Menambahkan pemeriksaan berkala `pollOwnerMessages(false)` dan `checkPendingGemGrants(true)` ke dalam interval loop `startNotifPolling()`, sehingga pesan baru dari dashboard sampai ke layar murid dalam hitungan detik secara real-time.

### B. Resiliensi Kartu Pesan Dasbor Owner (`workers/owner/index.js`)
- Memastikan `renderLearnerMessagesCard(d, m)` tetap dirender dan ditampilkan pada profil murid sekalipun subrequest bukti adaptif berada dalam status `unconfigured` atau `unavailable`.

---

## 3. Penyelarasan Hexa/Octa-Sync (m025-721)
1. `coordination/BUILD-VERSION.json` -> `m025-721`
2. `sw.js` -> `m025-721`
3. `core-config.js` -> `m025-721`
4. `features/neural-voice/fiezel-diag-panel.js` -> `m025-721`
5. `kurikulum.html` -> `?v=m025-721`
6. `misi.html` -> `?v=m025-721`
7. `call.html` -> `?v=m025-721`
8. `features/voice-studio/call.html` -> `?v=m025-721`

---

## 4. Status Pengujian & Mutu Lokal
- `node --check app.js`: PASS
- `node --check workers/owner/index.js`: PASS
- `node tests/owner-learner-messaging-test.js`: PASS (9/9)
- `node tests/owner-dashboard-test.js`: PASS
- `node tests/id-golden-snapshot-test.js`: PASS
- `node tests/th-ui-leak-test.js`: PASS
- `node tests/curriculum-cache-version-test.js`: PASS (33/33)
- `node tests/view-reachability-test.js`: PASS (67/67)
- `node tests/gate-registry-test.js`: PASS (10/10)
- Guardian A11 Release Readiness: PASS (base=719, head=720)

---

## 5. Rencana Langkah Berikutnya (Roadmap)
- Pantau metrik latensi delivery pesan dan responsivitas murid di Dasbor Owner.
- Evaluasi push notification Web Push API (VAPID) saat aplikasi sedang ditutup total di perangkat Android murid.
