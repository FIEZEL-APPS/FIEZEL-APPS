# FIEZEL — Notifikasi Tugas Guru ↔ Murid

## Problem statement (asli)
Guru harus bisa mengirim tugas (dari panel mana pun) ke masing-masing murid atau semua murid; tugas langsung
masuk notifikasi di dashboard murid; ketuk notif = sesi tugas terbuka; setelah selesai hasil masuk ke server &
dashboard guru dengan notif di atas. Tombol "Tanya FIEZEL" di topbar diganti lonceng notifikasi (teman, tugas, dll).
Pilihan user: clone repo GitHub FIEZEL-APPS/FIEZEL-APPS ke /app, polling berkala (bukan WebSocket), Tanya FIEZEL
dihapus dari topbar saja.

## Arsitektur
- PWA vanilla JS (index.html/app.js/features/*), backend Cloudflare Worker + D1 (workers/api/*), deploy via GitHub Actions.
- Sinkron guru-murid lewat KODE KELAS (tc_class) — murid identitas cookie anon, guru akun peran `teacher`.

## Yang diimplementasikan (2026-09-04, build m025-254)
### Server (workers/api)
- Tabel baru `tc_class_assignment` (auth-schema.js TEACHER_DDL + migrations/0012_teacher_content.sql).
- `POST /api/teacher/class/assign` — guru kirim tugas (payload = kode tugas v1) ke semua / daftar nama murid.
- `GET /api/learner/class-assignments?cls=&name=&since=` — murid tarik tugas baru (polling, kursor updated_at).
- role-core ROUTE_CAPABILITY + schema BYTE_LIMITS diperbarui. class-sync-test.js diperluas (46 assert PASS).
### Guru (features/teacher)
- store: `sendAssignment`, `sentTo`, `assignmentPayload`, kotak masuk guru (`notify/inboxUnread/inboxMarkAllRead/inboxText`);
  `pullReports` menghasilkan events (assignment_done, student_joined, report_in); ingest mengembalikan isNew.
- shell: tombol "Kirim ke semua murid" di kartu tugas; modal Kirim tugas dengan tombol per-murid "Kirim"; lonceng
  notifikasi di topbar Ruang Guru dengan badge + panel (ketuk → detail tugas/murid). Auto-sync tiap 45 dtk.
### Murid
- `features/notify/fiezel-inbox.js` (baru): kotak masuk lokal + `poll()` ke server; tugas yang tiba otomatis masuk
  antrean Today Plan (`FiezelTeacherStore.acceptAssignmentPayload`).
- `fiezel-learner-flow.js`: `openAssignment(id)` (buka sesi langsung, tertunda sampai mount), plan memuat sampai 3 tugas guru.
- app.js: lonceng topbar (`openNotifications`, `refreshNotifBadge`, `openAssignmentFromNotif`, `inboxPoll`,
  `startNotifPolling` 60 dtk + visibilitychange), lembar notifikasi gabungan (tugas guru, teman/sorakan, undangan).
- index.html: tombol Tanya FIEZEL topbar → lonceng `#fzNotifBtn`; sw.js ASSETS + i18n ID/TH + tour step diperbarui.
- Tes disesuaikan: search-feedback-test, tours-test, tour-test. Build number di-bump via tools/bump-build.mjs.

## Catatan
- Server belum di-deploy dari sini (deploy lewat CI repo). deploy-site-gate-test & global-name-collision-test gagal
  di sandbox ini hanya karena `git ls-files` memakai indeks lama /app; lolos di clone bersih.
- Tidak ada screenshot / testing agent sesuai permintaan user.

## Backlog
- P1: notifikasi push server (VAPID) untuk tugas saat aplikasi tertutup.
- P2: guru melihat daftar tugas terkirim dari server (GET /api/teacher/class/assignments) lintas perangkat.
- P2: permintaan teman (friend_request) masuk lonceng saat rute server-nya hidup.
