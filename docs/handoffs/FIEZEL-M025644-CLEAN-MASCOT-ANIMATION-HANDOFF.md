# FIEZEL HANDOFF DOSSIER: BUILD M025-644

**Tanggal**: 24 Oktober 2026  
**Cakupan**: Refinement Animasi Maskot 3D Mochi (Clean Minimalist, Smooth Lofi Headset, Rhythmic Pencil Bobbing, Articulated Talking Mouth, Thinking Badge Guard)  
**Nomor Build**: `m025-644`  
**Hexa-Sync**: Selaras (sw.js, core-config.js, fiezel-diag-panel.js, kurikulum.html, misi.html, call.html)

---

## 1. Ringkasan & Akar Masalah

User memberikan masukan kritis:
> "APA APAN INI, MASIH BAGUS YANG SEBELUMNYA, YANG INI BERANTAKAN SEKALI"

Penambahan properti 3D fisik besar seperti clipboard/buku di depan perut maskot membuat tampilan visual berantakan, menutupi keimutan tubuh bulat Daifuku Mochi, dan menimbulkan tumpukan elemen yang semrawut.

Akar masalah animasi sebelumnya yang membuat user merasa jelek/pusing:
1. **Heterodyning Frekuensi**: Terjadi bentrokan antara `ambientSway` ($\sin(1.8t)$), `tiltZ` ($\sin(2.2t)$), dan `nodX` ($\sin(4.4t)$), menyebabkan maskot bergoyang tidak stabil dan membuat user pusing saat sesi listening.
2. **Jittering Pencil 60 FPS**: Tangan kanan pada mode pensil mengalami perebutan nilai rotasi antara `updateAccessoriesMotion` dan `updatePaws`, ditambah frekuensi getar 3.5 rad/s yang terlalu cepat mirip getaran bor listrik.
3. **Left Paw Dangling**: Pada mode pensil sebelumnya, tangan kiri keluar melayang di udara tanpa alasan yang jelas.
4. **Sudut Earcup Headset**: Silinder earcup menghadap 90° ke samping sehingga piringan LED cyan dan not balok kurang terlihat dari arah kamera depan.

---

## 2. Solusi Desain Bersih & Elegan (Clean & Kawaii)

1. **Kemurnian Siluet Mochi (Zero-Clutter)**:
   - Menghapus objek prop papan tulis / buku yang berantakan di depan perut.
   - Maskot tetap tampil bersih, minimalis, dan imut sesuai desain asli Sanrio/Daifuku.
2. **Animasi Sesi Menulis (Pencil)**:
   - Tangan kiri disembunyikan rapi (`P.s = 0.0`), hanya tangan kanan yang memegang pensil.
   - Pensil diikat langsung ke `this.handR` (bukan ke squash-stretch core) agar geometri pensil tetap kokoh dan solid.
   - Gerakan menulis diubah menjadi ritme belajar yang santai, manis, dan harmonis ($\omega = 1.8\text{ rad/s}$): ayunan naik-turun halus $\pm 0.035$ dengan anggukan kepala fokus yang selaras.
   - Menghilangkan manipulasi `handR.rotation.z` manual di `updateAccessoriesMotion` sehingga 100% gerakan paw dikontrol mulus oleh spring solver `updatePaws`.
3. **Animasi Sesi Mendengarkan (Headset)**:
   - Mengunci seluruh osilasi ke single master frequency 50 BPM lofi chill ($\omega = 1.5\text{ rad/s}$).
   - Mematikan `ambientSway` liar selama headset aktif sehingga gerakan rotasi murni, tenang, dan bebas dari pusing.
   - Memiringkan earcup $30^\circ$ ke arah kamera (`-side * 0.52`) agar piringan LED cyan dan aksen not balok terlihat jelas dan menyala indah dari depan.
4. **Animasi Sesi Membaca (Glasses)**:
   - Menggunakan kacamata pelajar anime bulat yang lebih tipis dan berkelas (`radius: 0.25, tube: 0.020`).
   - Gerakan membaca berupa pemindaian mata santai dari kiri ke kanan.
5. **Artikulasi Mulut Berbicara (Mouth Flap)**:
   - Saat `setTalking(true)`, mulut bergantian secara dinamis antara senyum terbuka ceria (`mouthHappy`) dan bibir kucing imut (`mouthW`) mengikuti suku kata percakapan.
6. **Thinking Badge Guard**:
   - Badge ungu `chat_purple` tetap 100% terkunci HANYA muncul saat `isThinking = true`, dan bersih menghilang di semua sesi lainnya.

---

## 3. Bukti Pengujian Empiris & Gerbang Mutu

- **Probe Playwright Visual Snapshot** (`node tools/dev/probe-mochi-visual-snapshot.mjs`):
  - `tests/output/mochi_headset_listening.png` — Headset earcup cyan bercahaya jelas, proporsional, dan elegan.
  - `tests/output/mochi_glasses_reading.png` — Kacamata anime tipis, rapi, dan wajah mochi bersih.
  - `tests/output/mochi_pencil_writing.png` — Tangan kanan memegang pensil kuning imut, tanpa papan berantakan, siluet daifuku 100% bersih.
  - `tests/output/mochi_thinking_badge.png` — Badge ungu muncul rapi saat berpikir.
  - `tests/output/mochi_talking_mouth.png` — Artikulasi berbicara aktif dan responsif.
- **Gerbang Mutu Lokal**:
  - `tests/id-golden-snapshot-test.js` : PASS (baseline emas Indonesia utuh)
  - `tests/curriculum-cache-version-test.js`: PASS (build m025-644 selaras di 3 halaman)
  - `tests/gate-registry-test.js`: PASS (10 pass, 0 fail)
  - `tests/build-number-uniqueness-test.js`: PASS (m025-644 bebas dan unik)
  - `tests/test-all-practices-mochi-wire.js`: PASS (100% verifikasi 5 integrasi latihan JLPT Chokai, Quiz, Writing, Skills Lab, dan Global pawReact)
