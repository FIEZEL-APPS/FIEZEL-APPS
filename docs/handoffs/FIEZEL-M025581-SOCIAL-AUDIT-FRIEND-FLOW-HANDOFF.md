# FIEZEL — handoff m025-581: Audit & Refactoring Menyeluruh Fitur Invite & Accept Teman

**Otoritas: OWNER & PWA Release Arbiter**  
**Build:** `m025-581`  
**Cakupan:** Frontend Social Core, Cloudflare Worker API & D1, Ergonomi UI, UX Psikologi Murid, dan Integrasi PWA Sync.  
**Dokumen Audit Induk:** `C:\Users\hp\.gemini\antigravity\brain\68535665-6b05-4886-8185-ca05608806a3\AUDIT-INVITE-ACCEPT-TEMAN-FIEZEL.md`  

---

## 1. Ringkasan Perubahan & Temuan yang Dituntaskan

Dalam rilis `m025-581`, seluruh 4 pilar arsitektur sosial FIEZEL telah diperbaiki secara terstruktur melalui koordinasi 10 subagent terspesialisasi:

1. **Backend Cloudflare Worker & D1 Database**:
   - **Indeks D1 `idx_social_friend_b`**: Dibuat via `0017_social_friend_idx.sql` untuk mengeliminasi Full Table Scan pada kueri relasi masuk (*friend edges / incoming requests*).
   - **Rate Limiting Anti-Brute Force**: Maksimal 15 tebakan salah per user/IP per jam pada `POST /api/social/friends/redeem` (mengembalikan 429 `rate_limited` dengan `retryAfter: 3600`) untuk melindungi kuota penulisan harian D1.
   - **Atomisitas Transaksi `db.batch()`**: Menghubungkan penandaan kode hangus `used_by` dan kedua arah `INSERT INTO social_friend` (A->B dan B->A) dalam satu batch atomik D1. Tidak ada lagi status kode hangus tanpa terbentuk pertemanan.
   - **Enforce Batas `FRIENDS_MAX = 50` Dua Belah Pihak**: Penebusan kode dan penerimaan pertemanan memverifikasi bahwa pengundang dan penebus belum mencapai batas 50 teman.
   - **Pencegahan Ghost Friend Request**: `routeFriendsAccept` menggunakan *conditional insert* `WHERE EXISTS` agar pembatalan di satu sisi tidak memicu permintaan balik tak diinginkan.
   - **Eliminasi Bias Modulo Generator Kode**: `randomInviteCode()` menggunakan *uniform rejection sampling* matematika seragam.
   - **Cron Pembersihan Retensi D1**: `runSocialRetentionPurge` dipasang di cron harian `runScheduled()` pada `route-wiring.js` untuk membersihkan kode kedaluwarsa (>7 hari) dan log usang.

2. **Frontend Social Core & Outbox Concurrency**:
   - **Pencegahan Data Loss pada Outbox Evidence**: `flushOutbox()` menggabungkan JTI baru yang masuk selama request API berjalan, mencegah terhapusnya bukti belajar murid.
   - **Pemulihan Sesi 401 & Deduplikasi Inflight**: Reset `anonReady = false` dan deduplikasi promise `ensureAnon()` saat menerima respons 401.
   - **AbortSignal Timeout 10 Detik**: Menghentikan socket gantung pada koneksi seluler lambat.

3. **UX & Alur Onboarding Murid Baru**:
   - **P0 Inline Handle Creation**: Murid baru yang mengklik tautan `?friend=@handle` atau memindai QR kini otomatis dipandu membuat nama samaran in-line via `socialFriendAskHandleThenAdd`, lalu permintaan langsung dikirim tanpa pesan buntu 404.
   - **Pembersihan URL `cleanFriendUrl()`**: Parameter `?friend=` dibersihkan dari bilah alamat browser untuk mencegah perulangan modal saat reload atau navigasi riwayat.
   - **Normalisasi Crockford Base32**: Murid yang salah mengetik angka `0` dinormalisasi menjadi `O`, dan angka `1` atau huruf `L` menjadi `I`.

4. **UI Styling, Kontras WCAG & Ergonomi Ponsel**:
   - **Pemulihan Kontras Modal Gelap**:
     * Kode tiket undangan `.social-code`: `#FFDE43` di atas background emas transparan (`rgba(255, 200, 0, 0.12)`), rasio kontras 11.14:1 AAA.
     * Handle murid `.fz2-myid`: teks `#111118` di atas pill `#FFF9E6`, rasio kontras 17.85:1 AAA.
     * Tombol tolak `.text-button`: teks slate `#64748B` di atas kartu putih `#F8FAFC`, rasio kontras 4.55:1 AA.
   - **Ergonomi Touch Target Minimum $\ge 40\text{px}$**: Navigasi tab segmented, tombol Terima & Tolak (dengan jarak 10px mencegah salah sentuh), dan tombol Salin ID.
   - **Pencegahan Horizontal Overflow**: Media query $\le 400\text{px}$ pada baris teman `.social-friend`.
   - **Pencegahan Dropdown Collapse**: `<details class="fz2-more"` mempertahankan status `open` saat tiket undangan selesai dibuat.
   - **Kepatuhan Tipografi**: Mengganti `font-weight: 900` pada `.social-avatar` menjadi `font-weight: 800` (Plus Jakarta Sans tanpa faux bold).

5. **PWA Native Capabilities & Sinkronisasi**:
   - **PWA Launch Queue**: Mendaftarkan `window.launchQueue.setConsumer(...)` untuk menangkap tautan undangan saat PWA berjalan di background.
   - **PWA App Shortcuts**: Mengaktifkan shortcut launcher Android `"Ajak teman"` (`?invite-hub=1`) dan `"Duel Belajar"` (`?duel-hub=1`).
   - **Sinkronisasi Multi-Tab**: Menghubungkan `BroadcastChannel('fiezel-social-sync')` dan event storage antar-tab.
   - **App Badging API**: Mengintegrasikan `navigator.setAppBadge` dan `clearAppBadge` pada lencana notifikasi aplikasi.
   - **Penukaran Offline**: Kode undangan yang dimasukkan saat offline disimpan ke antrean pending dan otomatis ditukarkan saat kembali online.

---

## 2. Bukti Pengujian Empiris (Empirical Verification)

1. **Headless Playwright Probe (`tools/dev/probe-friend-flow.mjs`)**:
   - Uji 1: Pembuatan kode & persistensi reload -> **PASS**
   - Uji 2: Blokir double-click & busy lock -> **PASS** (1 panggilan API saja)
   - Uji 3: Tautan profil & cleanFriendUrl -> **PASS** (Modal terbuka, URL bersih)
   - Uji 4: Pencegahan penambahan ID sendiri -> **PASS** (0 panggilan network)
   - Uji 5: Kontras WCAG AAA/AA -> **PASS** (11.14:1, 17.85:1, 4.55:1)

2. **Rangkaian Gerbang Mutu Lokal**:
   - `node tests/id-golden-snapshot-test.js` -> **PASS**
   - `node tests/th-ui-leak-test.js` -> **PASS**
   - `node tests/curriculum-cache-version-test.js` -> **PASS (m025-581)**
   - `node tests/gate-registry-test.js` -> **PASS (10/10)**
   - `node tools/bump-build.mjs --check` -> **SELARAS (m025-581)**

---

## 3. Daftar Berkas yang Disentuh

- `workers/api/migrations/0017_social_friend_idx.sql`
- `workers/api/migrations/MIGRATIONS.md`
- `workers/api/social-schema.js`
- `workers/api/social-config.js`
- `workers/api/route-social.js`
- `workers/api/route-wiring.js`
- `features/social/fiezel-social.js`
- `features/social/fiezel-invite-link.js`
- `features/social/fiezel-qr.js`
- `features/ui/mobile-edge-fit.css`
- `features/i18n/copy-id-friend.js`
- `features/i18n/copy-th-friend.js`
- `features/i18n/copy-id-feat-c.js`
- `features/i18n/copy-th-feat-c.js`
- `style.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `coordination/BUILD-VERSION.json`
- `tools/dev/probe-friend-flow.mjs`
- `tests/subagent1-backend-audit-test.js`
- `tests/social-concurrency-test.js`
