# Audit kabel BrainCore → dashboard murid dan KelasKu

> **Status:** Gelombang 1 (D1, D2, D3, D5, D6) tersambung di m025-457. Gelombang 2 (K1, K2, K3) tersambung di m025-462 (`docs/handoffs/FIEZEL-M025-462-BRAINCORE-WAVE2-KELASKU-HANDOFF.md`). Yang belum: K4, D4, D7, D8, dan graf kurikulum.

**Tanggal:** 2026-10-04 · **Basis:** `main` @ `587335cd` (m025-450)
**Pertanyaan owner:** kemampuan BrainCore mana yang sudah dihitung tetapi belum sampai ke dashboard
murid dan KelasKu, sehingga cuma jadi "kode bagus yang disimpan di gudang"?

**Cara cek:**
1. Inventaris semua fungsi publik di `features/brain/` (32 modul), lalu cari pemakainya di luar folder
   itu.
2. Telusuri tiap layar murid sampai ke sumber datanya: Beranda `todayHomeMarkup`, `progress()` empat tab,
   dan `fiezel-class-hub.js` untuk sisi murid maupun guru.
3. Uji browser nyata `tools/dev/braincore-wiring-probe-2026-10-04.js`: murid memainkan sesi adaptif dan
   sesi grammar dengan sepertiga jawaban salah, lalu probe membaca teks setiap layar.

---

## 1. Gambaran besar

BrainCore **sudah bekerja keras di balik layar**. Menurut `fiezel-brain-manifest.js`, 24 dari 32 modul
berstatus `active`, artinya mereka memang memilih soal, menjadwalkan ulangan, membuka lesson, dan
menyetel tingkat kesulitan. Masalahnya ada di **etalasenya**:

| Layar | Hasil BrainCore yang terlihat murid/guru (uji browser) |
|---|---|
| **Beranda "Hari ini"** | Hanya kartu AI Booster (pasangan kata yang tertukar), plus ukuran sesi dari rencana adaptif. **Tidak ada** materi rawan lupa, akar masalah, arah belajar, kelelahan, atau miskonsepsi. |
| Progres · Ringkasan | Panel "Sesi berikutnya" (rencana adaptif). Tidak ada wawasan lain. |
| Progres · Kesiapan | Tidak ada (kesiapan akademik memakai modulnya sendiri). |
| Progres · Analisis | Kalibrasi keyakinan dan pola salah, **dihitung ulang dari riwayat mentah**, bukan dari BrainCore. |
| **Progres · "Cara soal dipilih"** (tab ke-4) | **Satu-satunya tempat** wawasan BrainCore tampil: level kemampuan, arah belajar, beban, materi rawan lupa, akar masalah, jam produktif, OLM, miskonsepsi, dan pasangan tertukar. BKT ada di dalam lipatan "Detail teknis". |
| Grammar hub | Persen "Dikuasai", yang memakai BKT. |
| Ringkasan akhir sesi | Nasihat kalibrasi OLM (hanya muncul kalau murid terlalu yakin atau kurang yakin). |
| **KelasKu murid** (Tugas / Papan Kelas / Paspor) | **Nol.** Papan Kelas menghitung streak dari kiriman tugas dan menentukan skill terkuat/terlemah dari **akurasi mentah** LearnerFlow. |
| **KelasKu guru** | **Nol data model murid.** Laporan murid ke guru hanya berisi `{c, t}` (benar/total) per skill, jumlah lesson, dan tugas. Kartu "Saran Braincore" guru memakai akurasi mentah itu. |

Kesimpulannya: wawasan BrainCore tersimpan di tab ke-4 Progres, tab yang paling jarang dibuka murid.
KelasKu (murid maupun guru) sama sekali tidak tersambung ke model belajar BrainCore.

---

## 2. Kabel yang belum tersambung, diurutkan dari dampak terbesar

### A. Ke KelasKu (guru dan murid)

| # | Kabel putus | Bukti | Dampak |
|---|---|---|---|
| K1 | **Laporan murid ke guru tidak membawa BrainCore.** Payload `tutorCode()` hanya berisi `skills:{c,t}`, `lessons`, `assign`, dan `fx`. Tidak ada penguasaan BKT per lesson, miskonsepsi aktif, materi rawan lupa, level kemampuan, maupun arah belajar. | `features/learner-flow/fiezel-learner-flow.js` `tutorCode()` | Guru menilai murid dari persen benar mentah, padahal BrainCore sudah tahu *konsep mana yang salah paham* dan *apa yang akan lupa minggu ini*. |
| K2 | **"Saran Braincore" untuk guru tidak memakai BrainCore murid.** Skill terlemah kelas dihitung dari akurasi mentah laporan. | `fiezel-class-hub.js` `tBraincore()` | Saran remedial guru tidak tahu akar masalah (misalnya lemah di *past tense* karena *verb 2* belum dikuasai). |
| K3 | **Papan Kelas murid tidak memakai BrainCore.** Skill terkuat/terlemah dihitung dari `lf.skills` (correct/total LearnerFlow), dan streak dihitung dari kiriman tugas saja. | `fiezel-class-hub.js` `progresView()` | Angka di KelasKu bisa bertentangan dengan Progres. Murid yang rajin latihan mandiri tetap terlihat "0 hari" kalau belum mengerjakan tugas. |
| K4 | **Tugas guru tidak dipersonalisasi.** Isi tugas dari bank (`B().pickFresh`) dipilih acak per skill. Miskonsepsi aktif, prior kesulitan, dan jadwal lupa murid tidak dipakai. | `fiezel-class-hub.js` jalur `remedial`/`bank` | Murid yang sudah menguasai mendapat soal yang sama dengan murid yang tertinggal. |

### B. Ke dashboard murid

| # | Kabel putus | Bukti | Dampak |
|---|---|---|---|
| D1 | **Beranda tidak menampilkan satu pun wawasan pribadi BrainCore** selain AI Booster: materi rawan lupa, akar masalah, arah belajar, beban/kelelahan, dan miskonsepsi yang sedang diperbaiki semuanya absen. | `todayHomeMarkup()` hanya memanggil `levelTrustState`, `homeVocabStats`, dan `buildAdaptivePolicy` (ukuran sesi) | Murid tidak tahu *kenapa* sesi hari ini berisi soal-soal itu. Kecerdasan BrainCore tidak terasa. |
| D2 | **Panel metrik belajar mati total.** `learningMetricsMarkup()` (perolehan belajar, retensi pada jarak waktu, ketergantungan petunjuk, kegigihan miskonsepsi, hasil uji retensi) **tidak dipanggil di mana pun**. | 0 pemanggil di seluruh repo. `FiezelLearningMetrics.learningGain/retentionAtGap/hintDependency/misconceptionPersistence` hanya dibaca fungsi mati ini. | Bukti "aku benar-benar makin pintar" sudah dihitung, tetapi tidak pernah dilihat siapa pun. |
| D3 | **Daftar materi rawan lupa hanya berupa angka.** `snapshot.memory.top` (8 item prioritas review) tidak pernah dirender. Panel hanya menulis "N dari M rawan". `CoreBrain.reviewPriority()` juga tidak dipakai. | `coreBrainPanelMarkup()` | Murid tahu *ada* yang akan lupa, tetapi tidak tahu *apa*, dan tidak bisa mengetuknya untuk mengulang. |
| D4 | **Jam belajar terbaik tidak dipakai pengingat.** `chronotype`/`studyWindows` hanya ditampilkan di tab ke-4 Progres, tidak dibaca jadwal notifikasi. | `chronotype` hanya muncul di `coreBrainPanelMarkup` | Pengingat belajar tidak dikirim di jam paling produktif murid. |
| D5 | **Akar masalah tidak menjadi tombol aksi.** `rootCause` hanya kalimat di tab ke-4, tanpa tombol "Perbaiki dasarnya". | `coreBrainPanelMarkup()` | Murid membaca diagnosis tanpa jalan pintas ke lesson akar. |
| D6 | **Miskonsepsi aktif tidak punya etalase sendiri.** `MisconceptionLedger.summarize()` hanya masuk ke panel OLM di tab ke-4. | `olmPanelMarkup()` | "Kesalahan yang sedang kamu perbaiki" tidak terlihat di Beranda maupun hub Grammar. |
| D7 | **Tab Analisis menghitung ulang dari riwayat mentah.** Pola salah dan kalibrasi di tab ini tidak memakai matriks kekeliruan dan OLM yang sudah ada. | `progress()` tab `analysis` | Dua mesin, dua angka. Hasil Analisis bisa berbeda dari tab ke-4. |
| D8 | **Belajar mandiri tidak menampilkan status konsep.** `QuestionMemory.summary/stateOf/priorityOf` tidak dipakai. LearnerFlow hanya memanggil `allocate` dan `recordAttempt`. | inventaris API | Ingatan per butir soal ada, tetapi murid tidak melihat "konsep yang sudah kuat / masih goyah". |

### C. Kemampuan mesin yang sama sekali belum dipanggil

| Modul | Fungsi yang belum punya pemanggil | Catatan |
|---|---|---|
| `fiezel-core-brain.js` | `setCurriculumGraph`, `prerequisiteChain`, `lessonNode`, `curriculumGraphSize` | **Graf kurikulum tidak pernah diisi.** Analisis akar masalah hanya berjalan di atas graf keluarga konsep, bukan rantai prasyarat lesson. |
| | `trend`, `reviewPriority`, `optimalDifficulty`, `difficultyBand` (publik) | Sebagian dipakai secara internal oleh `analyze()`, tetapi tidak pernah ditampilkan. |
| `fiezel-confusion-matrix.js` | `suggestPrerequisiteEdges` | Bisa mengusulkan sambungan prasyarat baru dari pola tertukar murid. Ini pasangan alami untuk graf kurikulum di atas. |
| `fiezel-affect.js` | `suggestionFor` | `affectSuggestionMarkup()` ada, tetapi tidak memakai fungsi modul ini. |
| `fiezel-item-prior.js` | `explain` | Alasan tingkat kesulitan soal. Berguna untuk tinjauan soal guru di KelasKu. |
| `fiezel-question-memory.js` | `summary`, `stateOf`, `priorityOf`, `recordOf` | Lihat D8. |
| `fiezel-param-ledger.js` | `verify`, `rollbackTo` | Penyetelan-diri tidak punya layar audit atau tombol kembalikan untuk owner. |
| `fiezel-policy-verdict.js` | `requiredPerArm` | |
| `fiezel-metrics-digest.js`, `fiezel-content-chain.js` | seluruh modul (`off`) | **Sengaja dimatikan** oleh keputusan owner (privasi dan rantai konten). Jangan dinyalakan tanpa keputusan baru. |

---

## 3. Rencana penyambungan yang saya sarankan

Setiap teks baru wajib lewat pasangan `copy-id-*` / `copy-th-*`.

**Gelombang 1: murid langsung merasakan (Beranda)**
1. Kartu **"Kata BrainCore hari ini"** di Beranda: 1 kalimat arah belajar (momentum), 3 materi rawan lupa
   teratas dari `memory.top` (bisa diketuk untuk review), dan akar masalah dengan tombol "Perbaiki
   dasarnya" (D1, D3, D5).
2. Hidupkan `learningMetricsMarkup()` di Progres · Ringkasan sebagai kartu "Bukti kamu makin pintar"
   (D2).
3. Satu baris "Kesalahan yang sedang kamu perbaiki" dari ledger di hub Grammar dan Beranda (D6).

**Gelombang 2: KelasKu**
4. Tambahkan blok `bc` ringkas ke payload laporan kelas: penguasaan BKT per lesson (dibulatkan),
   maksimal 3 miskonsepsi aktif, jumlah materi rawan lupa, level, dan arah belajar. Server dan
   `tHasil`/`tBraincore` guru membacanya (K1, K2). Payload tetap kecil dan tanpa jawaban mentah, sesuai
   batas privasi `coreBrainDigest`.
5. Papan Kelas murid membaca skill terkuat/terlemah dari BrainCore, dan streak dihitung dari semua
   aktivitas belajar, bukan hanya tugas (K3).
6. Tugas remedial dari guru diisi butir yang menyasar miskonsepsi aktif tiap murid (K4).

**Gelombang 3: mesin yang belum dipanggil**
7. Isi graf kurikulum (`setCurriculumGraph` dari `grammar-curriculum-v1.json`) supaya akar masalah
   memakai rantai prasyarat lesson (C).
8. Pengingat belajar memakai jam terbaik dari `studyWindows` (D4).
9. Tab Analisis membaca matriks kekeliruan dan OLM, bukan menghitung ulang (D7).

---

## 4. Catatan uji

- Probe browser memainkan 4 sesi adaptif dan 3 sesi lesson grammar. Pencocokan teks per layar (§1)
  diambil dari putaran itu.
- Di putaran pertama sebagian sesi macet di tombol "Lihat pembahasan". Probe sudah diperbaiki. Datanya
  cukup untuk membuktikan **ada atau tidaknya** etalase di tiap layar, tetapi belum cukup untuk menguji
  isi angka secara mendalam.
- Temuan sampingan: judul teks bacaan di soal reading (kartu gelap) tidak terbaca, teks gelap di atas
  latar gelap. Ini sama polanya dengan U1/U3 di `GRAMMAR-SESSION-UX-AUDIT-2026-10-04.md`.
