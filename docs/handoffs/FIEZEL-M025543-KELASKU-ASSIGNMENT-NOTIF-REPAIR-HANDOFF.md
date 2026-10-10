# Perbaikan Menyeluruh: Penugasan Guru, Auto-Dispatch, dan Notifikasi KelasKu Murid

**Build:** `m025-543`
**Otoritas:** User Request / Anti-Ghost-Deploy Invariant
**Tanggal:** 2026-10-10
**Metodologi:** Probe-Driven Empirical Audit (Chromium Headless Playwright) + 5-Subagent Orchestration

---

## 1. Ringkasan Eksekutif & Latar Belakang

Pengguna melaporkan kendala kritis di sistem KelasKu:
> *"Tugas dari guru tidak sampai kepada murid di panel KelasKu, dan notifikasi juga tidak muncul."*

Melalui investigasi terorkestrasi 5 Subagent khusus, ditemukan bahwa kegagalan tersebut bukan bug tunggal, melainkan gabungan 5 friksi sistemik sepanjang rantai transmisi dari sisi Guru → Server Worker D1 → Mesin Polling Murid → Antarmuka KelasKu & Topbar.

---

## 2. Temuan Akar Masalah (Root Causes)

| No | Titik Friksi | Lokasi Berkas | Dampak di Lapangan |
|---|---|---|---|
| 1 | **Absennya Auto-Dispatch pada Pembuatan Tugas Guru** | `features/teacher/fiezel-teacher-shell.js` | Saat guru menekan "Terbitkan Tugas", tugas hanya di-push ke array lokal `c.assignments` dan membuka modal WhatsApp `share-assign`. `T.sendAssignment` tidak pernah dipanggil kecuali guru mengklik tombol sekunder di dalam modal. Akibatnya, tugas tidak pernah terkirim ke server D1. |
| 2 | **Pemusnahan Metadata Mata Pelajaran & Sumber (`source`, `subjectId`)** | `features/teacher/fiezel-teacher-store.js` & `features/notify/fiezel-inbox.js` | `assignmentPayload(c, a)` dan `acceptAssignmentPayload(p)` membuang `subjectId`, `subjectName`, dan `source`. Di panel murid, filter mapel `cocok(a)` gagal mencocokkan tugas, sehingga kartu tugas hilang terfilter. |
| 3 | **Kerapuhan Resolusi `classCode()` & `learnerName()` Murid** | `features/notify/fiezel-inbox.js` | `classCode()` hanya membaca `fiezel-onboarding-v1`. Jika onboarding dilewati atau murid login via Google/Akun, `classCode()` bernilai kosong `""`, menyebabkan `poll()` langsung keluar tanpa request. Selain itu, nama generik seperti "Sobat FIEZEL" menghasilkan nama target "Sobat", bukan nama akun asli murid. |
| 4 | **Bypass Orkestrasi Aplikasi pada `setClassCode`** | `features/class-hub/fiezel-class-hub.js` | `setClassCode` langsung memanggil low-level core `FiezelInbox.poll(true)` alih-alih `window.inboxPoll(true)`. Akibatnya, pembaruan badge merah `#fzNotifBadge`, audio cue denting, toast selamat datang, dan re-render DOM tidak pernah terpicu saat murid bergabung kelas. |
| 5 | **Penguncian Render DOM & False Positive Input Activity** | `app.js` & `features/class-hub/fiezel-class-hub.js` | `isInputActive()` dan `isStudentBusy()` mengunci render selama 2000–2500ms setelah interaksi klik tombol, dan tidak ada timer flush cadangan. Akibatnya kartu tugas di DOM `#fzClassHub` tidak langsung ter-render saat tugas tiba. |

---

## 3. Rincian Perbaikan yang Diterapkan

### A. Sisi Guru (`features/teacher/fiezel-teacher-shell.js` & `fiezel-teacher-store.js`)
- **Auto-Dispatch Latar Belakang**: Saat formulir penerbitan tugas disubmit, jika `T.syncAvailable() === 'ok'`, `T.sendAssignment(c, a, targets)` otomatis dipanggil di latar belakang untuk kelas utama dan seluruh kelas paralel (`target_classes`).
- **Preservasi Metadata Mapel**: `assignmentPayload` melampirkan `p.subjectId`, `p.subjectName`, `p.source`, `p.items`, dan `p.teacher`.
- **BroadcastChannel Instan**: Memancarkan event `BroadcastChannel('fiezel-assignment-sync')` bertipe `assignment-created` dan `assignment-retracted`.

### B. Sisi Worker Cloudflare & Backend (`workers/api/teacher/class-sync-core.js`)
- Memperbarui `retractPayload` agar tetap mempertahankan `subjectId` dan `subjectName` saat penarikan tugas, menjaga integritas riwayat arsip murid.

### C. Mesin Polling & Kotak Masuk Murid (`features/notify/fiezel-inbox.js`)
- **Multi-Tier Fallback & Self-Healing `classCode()`**: Memeriksa `fiezel-onboarding-v1`, `state.classCode`, `fiezel-v4-state`, `FiezelAccount.state()`, cookie `fz_cls`, dan riwayat tugas terakhir. Jika ditemukan, otomatis di-self-heal ke penyimpanan utama.
- **Penyaringan Nama Murid**: Membersihkan kata sapaan generik ("Sobat", "Teman") dan menarik nama asli akun, dengan fallback aman "Murid".
- **Preservasi `source`**: Menyimpan dan merekonstruksi metadata `subjectId` dan `source` ke `fiezel-learner-assignments-v1`.

### D. Antarmuka KelasKu & Notifikasi Topbar (`features/class-hub/fiezel-class-hub.js` & `app.js`)
- **Orkestrasi Terpadu**: `setClassCode` memanggil `window.inboxPoll(true)` untuk menggerakkan toast, audio, badge lonceng, dan render DOM secara simultan.
- **Filter Cerdas & Anti-Stale Filter**: Menambahkan `assignmentSubjectId(a)` untuk memetakan skill tugas ke 17 mapel, serta mereset filter yang basi jika tidak ada tugas yang cocok.
- **Audio Chime Notifikasi**: Memasang alias `notif` dan `notification` ke aset audio `notif_general` di `features/audio/fiezel-ui-sfx.js`.
- **Timer Flush Cadangan**: Menambahkan `setTimeout` cadangan pada `renderStudent()` saat tertahan oleh aktivitas input.

---

## 4. Bukti Empiris Playwright (`tools/dev/probe-kelasku-assignment-delivery.mjs`)

Pengujian dilakukan menggunakan browser headless Chromium riil:
1. Guru membuat kelas `FZ-SMP8A` dan menerbitkan tugas `asg-gw-101`.
2. Murid membuka aplikasi dan memasukkan kode kelas di KelasKu.
3. Tugas pertama diterima secara instan ke `localStorage['fiezel-learner-assignments-v1']` dan `localStorage['fiezel-inbox-v1']`.
4. DOM `#fzNotifBadge` menampilkan lencana merah "1" tanpa status tersembunyi.
5. DOM `#fzClassHub` merender kartu tugas pertama dengan judul dan mapel yang presisi.
6. Guru menerbitkan tugas kedua; polling berkala menangkap tugas secara dinamis.
7. Lencana bertambah menjadi "2" dan kartu tugas kedua langsung dirender di layar murid tanpa perlu me-reload halaman.

**Hasil: 10/10 PASS (100% HIJAU).**

---

## 5. Status Kelulusan Seluruh Gerbang Mutu

- `node tests/id-golden-snapshot-test.js` → **PASS** (Baseline Indonesia 100% utuh)
- `node tests/th-ui-leak-test.js` → **PASS** (0 kebocoran Thai)
- `node tests/curriculum-cache-version-test.js` → **PASS** (26 penegasan selaras m025-542)
- `node tests/gate-registry-test.js` → **PASS** (10 pass, 0 fail)
- `npm run test:class-sync` → **77/77 PASS**
- `npm run test:class-hub` → **Semua gerbang class-hub lulus (14/14 PASS)**
- `node tests/assignment-poll-speed-test.js` → **8/8 PASS**
- `node tools/bump-build.mjs --check` → **Selaras pada build `m025-542`**
