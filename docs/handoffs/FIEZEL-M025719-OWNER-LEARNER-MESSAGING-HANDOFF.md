# Serah Terima Resmi: FIEZEL-M025719 — Two-Way Owner-Learner Messaging & In-Dashboard GEM Injection Console

## 1. Ringkasan Eksekutif & Dasar Kebutuhan
Sebelum rilis `m025-719`, komunikasi antara Owner/Tim Pengembang dengan murid/pengguna bersifat satu arah atau terisolasi. Jika Owner ingin mengapresiasi keaktifan pengguna (misalnya pengguna yang sering memakai AI Voice atau memberikan masukan), Owner belum memiliki saluran komunikasi dua arah terintegrasi langsung di dalam dasbor owner (`owner.fiezel.my.id`) yang dapat:
1. Menampilkan riwayat percakapan (*thread conversation*) interaktif dengan murid terpilih.
2. Mengirimkan pesan apresiasi / bimbingan pedagogis langsung ke PWA murid.
3. Menyuntikkan reward GEM secara instan (*instant remote grant*) yang langsung muncul sebagai notifikasi dan modal perayaan di PWA murid.
4. Memberikan formulir balasan langsung (*interactive 2-way reply*) di PWA murid sehingga pengguna dapat membalas pesan Owner, dan balasan tersebut otomatis masuk ke dasbor Owner.

Pada build `m025-719`, seluruh rantai komunikasi dua arah ini diimplementasikan secara menyeluruh tanpa merusak isolasi data (*zero privacy leak*).

---

## 2. Arsitektur & Perubahan Sistemik

### A. Skema Basis Data D1 (`fiezel-core`)
- Diterapkan migrasi `0020_owner_learner_messages.sql` pada basis data D1 kanonikal `fiezel-core`:
  ```sql
  CREATE TABLE IF NOT EXISTS owner_learner_message (
    id TEXT PRIMARY KEY,
    sub TEXT NOT NULL,
    sender TEXT NOT NULL,         -- 'owner' | 'learner'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    gem_amount INTEGER NOT NULL DEFAULT 0,
    gem_grant_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    reply_to_id TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_owner_msg_sub_created ON owner_learner_message (sub, created_at DESC);
  CREATE INDEX IF NOT EXISTS ix_owner_msg_unread ON owner_learner_message (sub, sender, is_read);
  ```

### B. Worker Backend `fiezel-api` (`workers/api/route-learner-messages.js` — Slot 16)
- Terpasang 5 endpoint REST API kanonikal:
  1. `GET /api/learner/messages`: Mengambil seluruh riwayat pesan akun murid yang sedang login (terautentikasi session `ctx.identity.sub`).
  2. `GET /api/learner/messages/unread-count`: Menghitung jumlah pesan belum terbaca dari owner untuk indikator lonceng notifikasi PWA.
  3. `POST /api/learner/messages/reply`: Menyerahkan balasan murid ke thread owner.
  4. `POST /api/learner/messages/read`: Menandai pesan owner telah dibaca murid.
  5. `POST /api/owner/send-message`: Mengirimkan pesan dari Owner, dengan opsi lampiran reward GEM (otomatis membuat entri `gem_grant` untuk klaim instan di PWA).
  6. `GET /api/owner/learner-messages?sub=`: Mengambil riwayat obrolan lengkap antara Owner dan murid untuk panel Dasbor Owner.

### C. Worker Dasbor Owner (`workers/owner/index.js`)
- `readLearnerDetail(env, period, sub, fetchImpl)`: Membaca bukti belajar adaptif Braincore sekaligus mengambil thread pesan `owner_learner_message` murid terkait.
- `handle(request, env, ctx, nowMs)`: Mengakomodasi aksi `action === 'send_learner_message'` yang memvalidasi kueri dan memanggil `POST /api/owner/send-message` ke backend Worker.
- `renderLearnerMessagesCard(d, m)` & `renderLearnerDetail(m)`: Merender antarmuka konsol pesan interaktif, riwayat percakapan dua warna (biru untuk tim pengembang, putih/abu-abu untuk balasan murid), badge GEM reward terlampir, dan formulir pengiriman pesan + opsi suntikan GEM instan.

### D. Klien PWA (`app.js`)
- `pollOwnerMessages()`: Mendeteksi pesan baru dari owner saat inisialisasi boot PWA dan saat jendela kembali aktif (*visibilitychange*).
- `notifUnreadTotal()`: Mengintegrasikan penghitung pesan belum terbaca dari owner ke badge lonceng notifikasi header (`#fzNotifBadge`).
- `renderNotifListMarkup()`: Menampilkan seksi "Pesan Tim Pengembang" di dalam laci notifikasi murid dengan tombol "Buka & Balas".
- `openOwnerMessageModal(msgId)`: Menampilkan modal dialog interaktif yang memperlihatkan pesan owner, badge reward GEM, dan kotak ketik balasan langsung ke owner.
- `sendOwnerMessageReply(replyToId)`: Mengirimkan teks balasan murid ke backend API.

---

## 3. Hasil Pengujian Empiris & Verifikasi Gerbang Mutu Lokal

| Gerbang Pengujian | Status | Rincian / Jumlah Penegasan |
|---|---|---|
| `tests/owner-learner-messaging-test.js` | **LULUS (PASS)** | 9/9 skenario (auth, unread count, two-way thread reply, mark read, owner message history) |
| `tests/d1-schema-contract-test.js` | **LULUS (PASS)** | 41/41 skenario skema D1 valid |
| `tests/owner-dashboard-test.js` | **LULUS (PASS)** | LULUS (kontrak privasi nol kebocoran identitas murid ke publik) |
| `tests/braincore-learner-identity-test.js` | **LULUS (PASS)** | 181/181 assert PASS |
| `tests/ui-structure-test.js` | **LULUS (PASS)** | PASS (nol emoji terlarang, kontrol valid) |
| `tests/th-ui-leak-test.js` | **LULUS (PASS)** | PASS (anggaran 3/3 utuh) |
| `tests/id-golden-snapshot-test.js` | **LULUS (PASS)** | HIJAU (baseline emas Indonesia utuh) |
| `tests/gate-registry-test.js` | **LULUS (PASS)** | 10/10 pass (gerbang terdaftar di workflow `quality.yml`) |
| `tests/curriculum-cache-version-test.js` | **LULUS (PASS)** | 33 penegasan selaras di `m025-719` |
| `tools/bump-build.mjs --check` | **LULUS (PASS)** | Hexa-Sync selaras 100% pada `m025-719` |

---

## 4. Daftar Berkas yang Diubah / Dibuat
1. `workers/api/migrations/0020_owner_learner_messages.sql`: Migrasi D1 untuk tabel `owner_learner_message`.
2. `workers/api/migrations/MIGRATIONS.md`: Dokumentasi pemetaan migrasi 0020 ke basis data `fiezel-core`.
3. `workers/api/route-learner-messages.js`: Kontroler endpoint API pesan owner-murid.
4. `workers/api/route-slots.js`: Registrasi Slot 16 rute pesan.
5. `workers/api/schema.js`: Definisi batasan payload byte limit `owner_message` dan `learner_reply`.
6. `workers/owner/index.js`: Integrasi pembacaan pesan di `readLearnerDetail`, aksi `send_learner_message` di router `handle`, dan render UI di `renderLearnerDetail`.
7. `app.js`: Integrasi polling pesan, badge notifikasi, laci pesan, dan modal balasan dua arah murid.
8. `id-golden-baseline.json`: Pembaruan baseline snapshot teks Indonesia kanonikal.
9. `.github/workflows/quality.yml`: Pendaftaran uji `tests/owner-learner-messaging-test.js` di CI.
10. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`: Sinkronisasi nomor build `m025-719`.
11. `tests/owner-learner-messaging-test.js`: Suite tes terisolasi untuk fitur pesan dua arah owner-murid.
12. `docs/handoffs/FIEZEL-M025719-OWNER-LEARNER-MESSAGING-HANDOFF.md`: Dokumen serah terima ini.
