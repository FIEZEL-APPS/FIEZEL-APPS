# m025-135 — Core Brain dikeraskan, kontrak deployment dirapikan

Asal pekerjaan ini adalah patch Codex `feat/core-brain-hardening-5-19` (4bd65ba) yang
dikirim OWNER untuk diperiksa. Patch-nya diterapkan utuh, ditinjau baris demi baris, dan
**empat temuan diperbaiki sebelum masuk** — tiga di antaranya adalah kegagalan senyap:
tidak ada galat, tidak ada tes merah, hanya perilaku yang diam-diam berbeda dari maksudnya.

**Status: SELESAI, menunggu penerimaan fisik OWNER.** Otoritas rilis tetap milik
OWNER/MASTER; berkas ini tidak memberi wewenang merge atau deploy kepada siapa pun.

---

## 1. Empat perbaikan atas patch aslinya

### 1.1 Tujuan belajar murid tidak sampai ke Core AI

Patch menghapus `LEARNER_GOALS` yang dipaku ("kelas 1 SMA", "kuliah IT di luar negeri
dengan beasiswa") dan menggantinya dengan `goalProfile` pilihan murid. Niatnya benar, tetapi
kosakatanya tidak nyambung: aplikasi menulis id dari `FiezelPersonalJourney` — `it`,
`scholarship`, `school` — sedangkan worker hanya mengenal `general|school|exam|career|travel`.

Diukur, bukan dikira: dua dari tiga pilihan (`it`, `scholarship`) jatuh ke `general`
—"meningkatkan kemampuan Bahasa Inggris secara bertahap". Jadi murid yang memilih tujuan
paling spesifik justru kehilangan tujuannya, persis seperti ketika tujuan itu masih dipaku
untuk satu orang. `GOAL_PROFILES` kini memuat kedua id itu dengan kalimatnya sendiri.

### 1.2 Insight `weak_skill` hilang tanpa jejak

`normalizeInsight` mewajibkan `itemId`. Insight `weak_skill` — temuan UTAMA meta-learning —
menyebut subskill, bukan item, jadi seluruhnya dibuang kecuali pemanggil menyediakan peta
`skillTargets`; tidak ada pemanggil yang menyediakannya. Yang terlihat hanyalah
`insightCount` yang lebih kecil.

Sekarang insight tanpa sasaran item tetap dikembalikan, ditandai `incomplete`, dan dicatat
runLoop sebagai `hold` dengan alasan `missing_item_target`. Jalur meta → loop yang sebelumnya
tidak pernah diuji sama sekali kini punya tiga tes.

### 1.3 `/api/policy/outcome` mengaku idempoten padahal menimpa

Rutenya selalu menjawab `idempotent:true`, tetapi implementasinya membuang entri lama
bersessionId sama lalu menulis yang baru. Tesnya sendiri mengirim skor 35 lalu 30 dan hanya
memeriksa panjang riwayat. Akibatnya kiriman susulan — bisa saja hasil parsial dari perangkat
yang tertinggal — mengalahkan penilaian yang lebih lengkap. Kini tulisan pertama yang menang,
dan kiriman ulang dijawab `duplicate:true` supaya klien tahu kirimannya diterima, bukan gagal.

### 1.4 Ritual versi

`FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, dan `SW_REV` dinaikkan bersama ke `m025-135`. Tanpa
`SW_REV` baru, PWA yang sudah terpasang akan terus menyajikan `app.js` lama — seluruh
pengerasan ini tidak akan pernah sampai ke perangkat murid.

Satu perbaikan tambahan di luar empat itu: buku besar evolusi. Patch aslinya menghitung ulang
hash SELURUH jendela pada setiap penambahan, sehingga `entryHash` entri lama berubah setiap
kali jendelanya bergeser — bukti yang pernah dicatat di luar sistem berhenti cocok. Sekarang
jendela yang terpangkas menyimpan `baseHash` (sidik jari entri terakhir yang dibuang), jadi
rantainya tetap bisa diverifikasi tanpa satu pun hash lama ditulis ulang.

## 2. Isi patch aslinya yang dipertahankan

- **State per akun.** Seluruh kemajuan dulu hidup di satu kunci `localStorage`, jadi dua akun
  Puter di ponsel yang sama saling menimpa riwayat, level, dan nama. Kuncinya kini terikat
  uuid akun; kunci lama dimigrasikan sekali dan pemiliknya dicatat.
- **Zona waktu murid.** `Asia/Jakarta` tidak lagi dipaku di klien maupun worker, dan jarak
  hari dihitung per hari KALENDER — berhenti pukul 23.30 lalu membuka pukul 07.00 memang
  sudah berganti hari, meski selisihnya kurang dari 24 jam.
- **Penjadwalan.** Materi yang dikuasai tidak lagi dibekukan selamanya melainkan dirawat;
  `lapseBurden` memisahkan "pernah lupa" dari "sedang rapuh"; dan keyakinan berhenti dihitung
  sebagai jawaban kedua — satu jawaban salah kini satu lapse, bukan dua.
- **Ember ulangan ditulis di riwayat.** Dulu ditebak belakangan dengan "kalau bukan vocab dan
  bukan grammar berarti reading", sehingga jawaban listening menulis ke `state.reading`.
- **Kelelahan sesi** dihitung dari sesi yang sedang berjalan, bukan dari 16 jawaban terakhir
  yang bisa saja milik sesi kemarin.
- **Retry** memperbarui ingatan tutor tanpa menggelembungkan akurasi atau baseline waktu.
- **Kolam adaptif 4x** panjang sesi: panjang sesi TIDAK berubah (tetap `asked>=planned`),
  yang berubah hanya keleluasaan tutor memilih soal berikutnya.
- **Worker:** kunci mutasi KV per-isolate untuk penghitung yang dibagi, batas ukuran kiriman,
  `constraints` wajib pada setiap template prompt, dan kontrak `fiezel-ai-response-v1`.

## 3. Bukti

- Seluruh suite `.github/workflows/quality.yml` dijalankan lokal: **hijau, tanpa kecuali**.
- `release-audit.py`: **287 PASS / 0 FAIL**, status `PASS`, version 5.19.0.
- `node --check` menyapu seluruh pohon (190 berkas, termasuk `vendor/`): 0 gagal.
- Gerbang baru yang dijaga: idempotensi per sesi, insight tanpa sasaran, keyakinan tidak
  menggandakan lapse, materi mastered kembali masuk Review Due saat pemeliharaan jatuh tempo.

## 4. Langkah berikutnya

1. **OWNER**: masuk dengan dua akun Puter berbeda di satu perangkat dan pastikan riwayat
   keduanya benar-benar terpisah. Ini inti rilis ini dan tidak bisa dibuktikan tes statis.
2. Periksa Coach menyebut tujuan yang benar setelah memilih "kuliah IT" atau "beasiswa".
3. Roadmap: `skillTargets` (peta subskill → item) belum ada. Sampai ia dibuat, insight
   `weak_skill` akan tercatat sebagai `hold` beralasan — terlihat, bukan hilang.
