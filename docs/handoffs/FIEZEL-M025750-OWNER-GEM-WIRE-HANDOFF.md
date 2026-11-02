# FIEZEL M025-750: Audit & Perbaikan Sinkronisasi Injeksi GEM & Pesan Owner ke PWA Murid

**Tanggal**: 3 November 2026
**Penulis**: Agent `5383d0ff-a591-4f55-9dfc-dfb9dfa955a4`
**Penerima / Bundler Release**: Agent `59330e96-cf0f-4b1b-b649-dcdef9cc3dff`
**Status**: SIAP DIGABUNGKAN (Ready for Bundled Release)
**Branch Sumber**: `fix/owner-gem-wire-m025-750` di worktree `../fiezel-owner-gem-wire-5383`

---

## 1. Ringkasan Eksekutif & Temuan Audit Empiris

Pengguna melaporkan bahwa saat melakukan pengiriman pesan teks atau injeksi reward GEM dari Owner Dashboard (`owner.fiezel.my.id`) kepada murid, saldo GEM tidak bertambah di sisi PWA murid (`fiezel.my.id/app/`) dan notifikasi popup lambat atau tidak muncul sama sekali.

Berdasarkan audit mendalam pada lapisan backend (Cloudflare Workers/D1), transport, dan runtime PWA di `app.js`, ditemukan 4 akar masalah utama:

1. **Akar Masalah 1 (Kegagalan Autentikasi 401 Silent Drop)**:
   - Endpoint `/api/gems/claim` dan `/api/learner/messages` mewajibkan identitas ber-HMAC yang diturunkan dari cookie `fz_id` (`ctx.identity.verified === true`).
   - Di `app.js`, fungsi `checkPendingGemGrants()` dan `pollOwnerMessages()` sebelumnya langsung memanggil `coreWorkerExec()` tanpa memanggil `identityEvidenceEnsureAnon()`.
   - Murid baru atau murid yang cookie `fz_id`-nya belum terinisialisasi langsung menerima `HTTP 401 Unauthorized` (`unauthenticated`), lalu `app.js` langsung `return false` dalam diam tanpa pemulihan identitas.

2. **Akar Masalah 2 (Penghilangan Dialog Perayaan Reward oleh Parameter `silent=true`)**:
   - Saat pesan owner masuk dengan bonus GEM (`latestMsg.gem_amount > 0`), fungsi `pollOwnerMessages` memanggil `checkPendingGemGrants(true)` (`silent = true`).
   - Di dalam `checkPendingGemGrants`, pemanggilan `showGemRewardModal` dipagari oleh `if (!silent)`. Akibatnya dialog modal perayaan penerimaan reward GEM ditekan dan tidak pernah muncul.
   - Selain itu, di `startNotifPolling()`, interval 6 detik juga memanggil `checkPendingGemGrants(true)`, sehingga hadiah GEM yang masuk tanpa pesan teks pun tidak memunculkan modal perayaan kepada murid.

3. **Akar Masalah 3 (Kerusakan Struktur Objek `state.gems` Menjadi Integer Primitif)**:
   - Pada baris fallback saat `gemsHook()` belum siap atau null:
     ```javascript
     state.gems = (Number(state.gems) || 0) + amt; // FATAL: mengubah state.gems menjadi integer primitif
     ```
   - Di FIEZEL, `state.gems` wajib mengikuti format Schema 1: `{ schema: 1, balance: N, earnedTotal: N, spentTotal: N, ledger: [] }`.
   - Begitu `state.gems` berubah menjadi integer primitif, pemanggilan `gemsBalance()` (`state?.gems?.balance`) menghasilkan `undefined` -> `0 GEM`!
   - Di `features/speaking-listening/gems-core.js:143`, fungsi `sanitizeGems(raw)` mendeteksi `typeof raw !== 'object'`, sehingga seluruh saldo di-reset otomatis menjadi 0.

4. **Akar Masalah 4 (Ketiadaan Cadangan Resolusi `email` & `handle` dari Form Dashboard Owner)**:
   - Form kirim pesan di `workers/owner/index.js` sebelumnya hanya mengirimkan `learner: targetSub` (UUID).
   - Jika murid login dengan akun Google di perangkat lain, `sub` di perangkat aktif berbeda dengan entri UUID di database audit perangkat lama.
   - Parameter `target_email` dan `target_handle` tidak disertakan di form, dan backend `routeOwnerSendMessage` tidak memprioritaskan resolusi sub kanonikal dari tabel `auth_email`.

5. **Akar Masalah 5 (Interval Polling Terlalu Lambat & Syarat Popup Terblokir)**:
   - Interval polling notifikasi sebelumnya 6000ms (6 detik).
   - Logika pemunculan pesan `(ownerMessagesUnreadCount > prevUnread || force)` mengabaikan pesan unread jika `prevUnread` sudah bernilai sama (misal saat boot gagal merender modal). Ditambahkan guard `!modalOpen` agar pop-up pesan unread langsung terbuka saat layar siap.

---

## 2. Rincian Perbaikan Kode

### A. Runtime PWA (`app.js`)
1. **Bootstrap Identitas Anonim Otomatis & Retry 401**:
   - Di awal `checkPendingGemGrants()` dan `pollOwnerMessages()`, dipanggil `try { await identityEvidenceEnsureAnon(); } catch(_) {}`.
   - Bila menerima HTTP 401, sistem mereset `__identityAnonReady = false` dan melakukan satu kali retry otomatis dengan identitas baru.
2. **Anti-Corruption Schema 1 Objek `state.gems`**:
   - Fallback kredit GEM diperbaiki secara total untuk memelihara format `{ schema: 1, balance: ..., earnedTotal: ..., spentTotal: ..., ledger: ... }` dengan memanfaatkan `gemsCore().gemsEarn()` atau rakitan objek skema kanonikal.
3. **Umpan Balik Instan (Audio, Haptik, Toast, dan Modal)**:
   - Saat `checkPendingGemGrants(true)` dipanggil dalam mode senyap, saldo di topbar langsung diperbarui, efek suara `streak_5` dan reaksi maskot `pawReact('reward', { kind: 'gems' })` langsung berbunyi, serta `showToast('+X GEM berhasil ditambahkan ke saldo akunmu! 💎', 'success')` ditampilkan seketika.
   - Saat pesan owner dengan GEM dibuka di `openOwnerMessageModal()`, efek konfeti `celebrate()`, suara `streak_5`, dan animasi maskot langsung menyala.
4. **Fast-Heartbeat Polling & Instant Focus Trigger**:
   - Mengurangi `NOTIF_POLL_MS` dari 6000ms menjadi 3500ms.
   - Pada event `visibilitychange` dan `focus`, dipicu pemeriksaan instan: `pollOwnerMessages(true)` dan `checkPendingGemGrants(false)`.

### B. Owner Dashboard (`workers/owner/index.js`)
1. Di `renderLearnerMessagesCard(d, m)`, input formulir hidden ditambahkan:
   - `<input type="hidden" name="target_email" value="${esc(targetEmail)}">`
   - `<input type="hidden" name="target_handle" value="${esc(targetHandle)}">`
2. Di handler `action === 'send_learner_message'`, parameter `targetEmail` dan `targetHandle` diteruskan ke `/api/owner/send-message`.

### C. Backend API Routes (`workers/api/route-learner-messages.js` & `workers/api/route-gem-grant.js`)
1. Resolusi `body.email` diprioritaskan: jika akun murid terikat dengan akun Google resmi di `auth_email`, `targetSub` otomatis diselaraskan dengan sub kanonikal akun Google murid tersebut.
2. Resolusi fallback `body.handle` tetap aktif untuk mencari sub via `social_handle`.

---

## 3. Bukti Pengujian Empiris

1. **Unit Test Spesialis Baru (`tests/owner-gem-wire-e2e-test.js`)**:
   - Menguji resolusi sub akun Google dari `body.email` di `routeOwnerSendMessage`: **PASS**.
   - Menguji resolusi sub di `routeOwnerGrantGems`: **PASS**.
   - Menguji integritas invarian skema `state.gems` terhadap mutasi fallback (termasuk pemulihan dari nilai integer primitif): **PASS**.

2. **Pengujian Suite Lokal**:
   - `node tests/owner-learner-messaging-test.js`: **9/9 PASS**.
   - `node tests/owner-dashboard-test.js`: **PASS**.
   - `node tests/id-golden-snapshot-test.js`: **PASS**.
   - `node tests/th-ui-leak-test.js`: **PASS**.
   - `node tests/curriculum-cache-version-test.js`: **PASS**.
   - `node tests/gate-registry-test.js`: **10/10 PASS** (418 gerbang bukti terverifikasi).

---

## 4. Berkas yang Diubah

- `app.js`
- `workers/owner/index.js`
- `workers/api/route-learner-messages.js`
- `workers/api/route-gem-grant.js`
- `tests/owner-gem-wire-e2e-test.js` (berkas baru)
- `.github/workflows/quality.yml` (registrasi baris uji baru)
- `reports/th-ui-leak-report.json` (penyesuaian nomor baris laporan)

---

## 5. Instruksi Penggabungan untuk Agent Bundler (`59330e96-cf0f-4b1b-b649-dcdef9cc3dff`)

Sesuai mandat USER, branch ini TIDAK melakukan `bump-build.mjs` mandiri dan TIDAK membuat PR sendiri ke `main`.
Agent `59330e96-cf0f-4b1b-b649-dcdef9cc3dff` dapat menggabungkan perubahan ini ke dalam PR mereka dengan perintah:
```bash
git fetch origin fix/owner-gem-wire-m025-750:fix/owner-gem-wire-m025-750
git merge fix/owner-gem-wire-m025-750 --no-edit
```
Atau mengambil patch langsung dari branch `fix/owner-gem-wire-m025-750`.
Setelah seluruh gerbang CI hijau dan siap rilis, nomor build akan dinaikkan bersamaan.
