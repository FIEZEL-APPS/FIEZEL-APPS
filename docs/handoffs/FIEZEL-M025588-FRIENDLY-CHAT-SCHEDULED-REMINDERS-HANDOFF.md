# FIEZEL Handoff Dossier — Build m025-588
**Topik**: Notifikasi Pengingat Personal Bergaya Chat Sahabat (7 Hari Berbeda, Penjadwalan Waktu Emas WIB, & Personalisasi Nama Murid Tanpa Branding FIEZEL)

---

## 1. Ringkasan Kebutuhan & Arsitektur Solusi
Pengguna meminta sistem pengingat belajar via remote push dirombak secara pedagogis dan psikologis:
1. **0% Branding FIEZEL**: Menghilangkan sepenuhnya kata "FIEZEL" dan frasa kaku seperti *"Reminder belajar"* atau *"Waktunya kembali ke sesi belajar"* dari judul maupun isi notifikasi.
2. **Gaya Chat Sahabat**: Notifikasi dirancang menyerupai pesan obrolan personal dari seorang teman/sahabat yang hangat, penasaran, dan mengajak santai sejenak (komitmen 2-3 menit).
3. **Personalisasi Nama Murid Dinamis (`{name}`)**: Notifikasi secara otomatis menyisipkan nama panggilan murid yang terdaftar (misal: `"Hei Budi! 🌙"`). Jika nama belum diisi di profil, sistem secara cerdas dan anggun menggunakan sapaan akrab (seperti `"Hei kamu! 🌙"`).
4. **Penjadwalan Teratur Berdasarkan Waktu Emas WIB**:
   - **Senin s/d Sabtu**: Dikirim **1x sehari** di waktu santai malam (pukul 19:45 WIB / jendela 18:00–21:59 WIB), waktu saat murid selesai beraktivitas dan sedang bersantai/rebahan dengan ponsel.
   - **Khusus Hari Minggu**: Dikirim **2x sehari** (sesi pagi santai liburan 10:00 WIB / jendela 09:00–13:59 WIB, dan sesi malam persiapan awal minggu 19:45 WIB).
   - **Pagar Jam Tenang (Quiet Hours)**: Pukul 22:00–05:59 WIB otomatis hening dan tidak pernah mengirim notifikasi agar tidak mengganggu istirahat murid (kecuali flag `force: true` saat pengujian operator).
   - **Jeda Adaptif**: Menggunakan jeda 8 jam pada hari Minggu (agar murid bisa menerima sesi pagi dan malam), dan jeda 18 jam pada hari Senin–Sabtu (agar terjamin 1x sehari).

---

## 2. Rincian Perubahan Kode
1. **`workers/api/route-legacy.js`**:
   - Menambahkan konstanta `SCHEDULED_FRIEND_MESSAGES` yang berisi matriks pesan sahabat untuk 7 hari dengan slot pagi/malam yang kontekstual.
   - Menambahkan fungsi `formatPersonalizedMessage(template, rawName)` untuk menyubstitusi token `{name}` dengan nama murid atau fallback akrab yang rapi.
   - Memperbarui handler `POST /api/reminders/due` dengan:
     - Logika penentuan hari dan jam Waktu Indonesia Barat (`WIB = UTC+7`).
     - Evaluasi jam tenang malam (`isQuietHour = hourWIB >= 22 || hourWIB < 6`).
     - Penentuan slot aktif harian (`activeSlot`).
     - Jeda adaptif (8 jam untuk Minggu, 18 jam untuk Senin–Sabtu).
     - Personalisasi dinamis `{name}` pada `title` dan `body` untuk setiap baris subscriber.
     - Mengubah tag default menjadi `chat-study-daily` dan kind `friend_reminder`.
2. **`push-dispatcher.mjs`**:
   - Memperbarui penanganan galat saat mengirim notifikasi: langganan dengan kunci tidak valid / rusak (misal `p256dh` panjang salah, 404, 410) otomatis ditandai `status = 'expired'` agar `/api/reminders/ack` mengosongkan endpoint di D1, membersihkan database secara mandiri.
   - Memperbaiki kode keluar proses agar `failed` pada token usang tidak menggagalkan eksekusi jika pengiriman ke perangkat murid aktif lainnya berhasil (`if (failed && sent === 0) process.exitCode = 1`).
3. **`sw.js`**:
   - Memperbarui payload fallback notifikasi di event listener `push` dari `FIEZEL · Reminder belajar` menjadi `Hei kamu! 👋` dan `Kemana aja nih, sepi banget nggak ada kamu. Luang 2 menit yuk?` sehingga jika terjadi kegagalan payload sekalipun, tidak ada kata "FIEZEL" yang bocor ke layar pengguna.
4. **Hexa-Sync Arbiter**:
   - Menaikkan nomor build ke `m025-588` di 6 titik wajib (`sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, dan `coordination/BUILD-VERSION.json`).

---

## 3. Hasil Pengujian & Bukti Mutu
- `node tests/remote-push-test.js` — **PASS**
- `node tests/id-golden-snapshot-test.js` — **PASS**
- `node tests/th-ui-leak-test.js` — **PASS**
- `node tests/curriculum-cache-version-test.js` — **PASS (m025-588)**
- `node tests/gate-registry-test.js` — **PASS (10 pass, 0 fail)**
- `python release-audit.py` — **PASS (1109 pass, 0 fail)**
- `node tools/bump-build.mjs --check` — **Selaras (Hexa-Sync 100%)**

---

## 4. Otoritas MASTER & OWNER
Perubahan ini dilakukan di bawah arahan langsung OWNER untuk meningkatkan kenyamanan dan retensi murid secara etis tanpa spam, dengan mematuhi seluruh aturan Git Protection Rule dan MASTER authority.

---

## 5. Rencana Langkah Lanjutan (Roadmap & Next Steps)
- Memantau tingkat interaksi (click-through rate) murid terhadap notifikasi gaya obrolan sahabat di dasbor analitik.
- Menambahkan variasi pesan kontekstual berdasarkan progres materi terakhir murid pada iterasi mendatang.
