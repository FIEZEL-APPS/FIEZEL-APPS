# FIEZEL Handoff Dossier: Home Topbar Unified Notification Bell & Profile Friend System

- **Build Version**: `m025-524`
- **Tanggal**: 2026-10-09
- **Tipe Perubahan**: `feat(notif): satukan lonceng notifikasi di topbar home dan aksi permintaan teman`

---

## 1. Ringkasan Permintaan Pengguna

Pengguna memberikan instruksi spesifik:
1. *"lonceng notifikasi letakkan di topbar home, pokoknya semua notifikasi akan masuk disana, baik itu tugas dari guru, permintaan pertemanan, dan lain lain, ini harus tersambung ke backend dengan sangat mulus"*
2. *"kalau sudah selesai integrasinya, jalankan suite test, dan jika semua notifnya sudah terhubung dengan lancar, lanjutkan merge dan deploy sampai semuanya aktif di pwa user"*
3. Sebelumnya: memindahkan slot "Online & Teman" ke panel profil (dengan slot ringkas, minimalis, dan slot di topbar profil untuk tambah teman via ID dan QR) serta membersihkan panel progres.

---

## 2. Rincian Arsitektur & Solusi Teknis

### A. Lonceng Notifikasi di Topbar Home (`#fzNotifBtn`)
- **Penempatan**: Ditempatkan di `#topGamifyCluster` bersebelahan dengan selektor bahasa kursus (`#fzCourseSwitchBtn`).
- **Contextual View Visibility**:
  - Pada halaman Home (`body.fz-stage-home`): `#fzNotifBtn` tampil (`inline-flex`), sementara `#topProfileFriendBtn` dan `#topSettingsBtn` disembunyikan (`display: none`).
  - Pada halaman Profil (`body.fz-view-profile`): `#topProfileFriendBtn` dan `#topSettingsBtn` tampil (`inline-flex`), sementara `#fzNotifBtn` dan `#fzCourseSwitchBtn` disembunyikan.
  - Pada tab lain (KelasKu, Latihan, Game, Progres): kedua tombol disembunyikan agar layar tetap bersih dan fokus.

### B. Unifikasi Notifikasi Multi-Sumber (Backend-Connected Seamlessly)
- **Agregasi Multi-Kategori**:
  1. **Tugas dari Guru (`teacher_assignment`)**: Diambil dari `FiezelInbox` (`/api/class/tasks/active` / `inboxPoll()`). Menampilkan judul tugas, pengirim (guru), jumlah soal, durasi, tenggat waktu, dan tombol aksi 1-tap "Kerjakan sekarang →" (`openAssignmentFromNotif(id)`).
  2. **Permintaan Pertemanan (`friend_request`)**: Diambil langsung dari backend social API (`/api/social/friends/requests` via `core.api.friendRequests()`). Menampilkan nama & avatar pemohon, waktu, serta tombol aksi instan 1-tap **"Terima"** (`notifAcceptFriend(handle)`) dan **"Tolak"** (`notifRejectFriend(handle)`).
  3. **Kabar dari Teman (`social_notify`)**: Diambil dari `FiezelSocialNotify` (`/api/social/notify`), menampilkan sorakan (`cheer_received`), pencapaian streak, dan status pertemanan baru.
  4. **Undangan Teman Menunggu**: Mendeteksi tautan undangan pertemanan pending.
- **Badge Unread Dinamis**:
  `notifUnreadTotal()` menghitung total belum dibaca dari: tugas guru belum dibaca + kabar sosial belum dibaca + jumlah permintaan teman pending (`socialRequestCount`) + tawaran undangan pending. Badge diperbarui secara reaktif ke `#fzNotifBadge` di topbar Home.
- **Background Synchronization**:
  Saat membuka sheet notifikasi via `openNotifications()`, data ditampilkan seketika dari memori lokal (instant UI feedback), kemudian secara bersamaan melakukan sinkronisasi backend non-blocking lewat `Promise.allSettled([inboxPoll(true), socialNotifyPoll(true), core.api.friendRequests()])` dan memperbarui daftar tanpa kedip.

### C. Profil "Online & Teman" & Topbar Slot
- Slot "Online & Teman" ditempatkan di panel Profil dengan gaya tactile travertine daylight minimalis: kartu ID pengguna (@handle), tombol Salin ID, tombol QR, Hubungkan ID Teman, Scan QR, Daftar Teman, dan Papan Skor.
- Topbar Profil dilengkapi tombol orang/tambah teman (`#topProfileFriendBtn`) yang langsung membuka sheet/modal tambah teman dan QR.

---

## 3. Berkas yang Diperbarui

1. `index.html`:
   - Memasang `#fzNotifBtn` di klaster kanan topbar.
2. `style.css` & `features/ui/fiezel-tactile-clay.css`:
   - Menambahkan guard display kontekstual per-halaman untuk `#fzNotifBtn` dan `#topProfileFriendBtn`.
   - Styling kartu notifikasi berkontras tinggi (`.notif-item`, `#FFFFFF`, teks `#0F172A`, subteks `#64748B`, tombol CTA `#0284C7` dan ghost `#CBD5E1`).
3. `app.js`:
   - Sinkronisasi `notifCachedRequests`, `socialRequestCount`, `refreshFriendRequestCount`, `updateTemanBadge`, dan `refreshNotifBadge`.
   - Implementasi `renderNotifListMarkup` dengan section khusus "Permintaan Pertemanan" (+ tombol Terima/Tolak 1-tap), "Dari guru" (+ tombol Kerjakan sekarang), "Teman", dan "Undangan menunggu".
   - Fungsi aksi `notifAcceptFriend` dan `notifRejectFriend` dengan umpan balik toast instan dan refetch otomatis.
   - Pengecekan background polling berkala di `startNotifPolling()`.
4. `id-golden-baseline.json` & `reports/th-ui-leak-report.json`:
   - Penyesuaian baseline ID golden dan laporan i18n Thai/Indonesia tanpa utang tambahan baru.
5. `tools/dev/verify-home-notif-bell-probe.mjs`:
   - Skrip probe otomatis headless Playwright untuk memvalidasi alur lonceng notifikasi, sheet notifikasi, aksi terima teman, dan transisi ke profil.
6. Enam Titik Hexa-Sync Build Arbiter (`m025-524`):
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

---

## 4. Bukti Verifikasi Empiris Playwright

Skrip probe `tools/dev/verify-home-notif-bell-probe.mjs` dijalankan di lingkungan Chromium Playwright (390x844 DPR 2):
1. **Lonceng di Home**:
   - `fzNotifBtn visible di Home`: `true`
   - `fzNotifBadge text`: `3`
   - Tangkapan layar: `01_home_topbar_lonceng_notifikasi.png` (terverifikasi bersih tanpa elemen terpotong).
2. **Lembar Notifikasi Agregasi Lengkap**:
   - Menampilkan section Permintaan Pertemanan (Siti Zahra) dengan tombol Tolak dan Terima.
   - Menampilkan section Dari Guru (Pak Rudi: "Persiapan Kuis Unit 3: Phrasal Verbs") dengan tombol "Kerjakan sekarang →".
   - Menampilkan kabar dari teman (rian_p menyemangati).
   - Tangkapan layar: `02_lembar_notifikasi_semua_kabar.png`.
3. **Eksekusi 1-Tap Aksi Terima Permintaan Pertemanan**:
   - Tombol Terima diklik -> API `/api/social/friends/accept` dipanggil -> daftar permintaan teman diperbarui seketika.
   - Toast feedback muncul: *"Kamu dan @siti_zahra sekarang berteman."*
4. **Transisi ke Panel Profil**:
   - Navigasi ke `go('profile')`:
   - `fzNotifBtn di Profil`: `false` (otomatis tersembunyi).
   - `topProfileFriendBtn di Profil`: `true` (muncul di topbar profil).
   - Tangkapan layar: `03_profil_topbar_slot_teman_qr.png`.

---

## 5. Hasil Gerbang Mutu Lokal

- `node tests/th-ui-leak-test.js`: **PASS (3957 kunci id, tanpa kebocoran)**
- `node tests/id-golden-snapshot-test.js`: **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/curriculum-cache-version-test.js`: **PASS (build m025-524 selaras)**
- `node tests/gate-registry-test.js`: **PASS (364 gerbang mutu aktif)**
- `node tests/social-frontend-test.js`: **PASS (68 pemeriksaan lolos)**
- `node tests/search-feedback-test.js`: **PASS (23 pemeriksaan lolos)**
- `node tools/bump-build.mjs --check`: **PASS (Selaras 6-titik m025-524)**
