# Audit mesin hafalan kosakata & pengulangan berkala (FSRS) — 2026-10-04

> **Status 2026-10-04:** V-A, V-B (m025-442) dan V-E (m025-443) **diperbaiki** (lihat §5). V-C, V-D belum.

**Basis:** branch `claude/inspiring-franklin-xml8hz` @ `cce82e55` (build `m025-442`; jalur kosakata
identik dengan `main` @ `1dff4b6d`). **Pertanyaan owner:** apakah kartu yang dijawab salah benar
dijadwalkan ulang (besok harinya) sesuai rumus peluruhan ingatan FSRS, atau hanya diacak ulang
secara statis di memori?

**Bukti yang bisa diulang:** `node tools/dev/vocab-fsrs-audit-2026-10-04-probe.js` — `index.html`
sungguhan di Chromium, berkas disajikan lewat `page.route` (tanpa server, tanpa egress), **jam
halaman dipalsukan** supaya jadwal bisa dimajukan hari demi hari. Klaim di bawah menunjuk V1–V8.

> Catatan lokasi. `features/brain/fiezel-mastery-bkt.js` **tidak dipakai untuk kosakata**: BKT
> hanya menerima jawaban `type:'grammar'` per lesson (`bktRecord`, `app.js:2697`). Jadwal kartu
> kosakata ditulis oleh `scheduleNext()` (`app.js:2933`) memakai model ingatan FSRS-lite di
> `features/brain/fiezel-core-brain.js` (`updateMemory` :393, `retrievability` :417,
> `nextReviewGapDays` :428). Audit ini memeriksa jalur yang sebenarnya.

---

## 1. Vonis singkat

**Rumusnya benar dan jadwalnya nyata — tetapi latihan utamanya tidak memakai jadwal itu.**

- Kartu yang salah **memang** dijadwalkan ulang oleh model peluruhan sungguhan (bukan diacak):
  kartu baru muncul lagi **±98 menit** kemudian dan benar-benar masuk "Review jatuh tempo"
  sesudah jedanya (V1, V3). Matematikanya konsisten: retensi tepat 0,900 saat jatuh tempo, efek
  jarak bekerja (V8).
- Tetapi tombol utama **"Uji kosakata" dan "Buka flashcards" mengacak SEMUA kata level itu**
  tanpa membaca jadwal (`shuffle(V.filter(...))`); 20 kartu jatuh tempo muncul sebagai kata
  pertama hanya 1 dari 15 sesi — sama dengan acak murni (0,88) (V4). Jadwal hanya dipakai oleh
  tombol "Review jatuh tempo" dan sesi adaptif.
- **Naik level menghapus ulangan level lama** dari antrean (V6), dan **kartu matang yang lupa
  baru diulang ±3,8 hari kemudian** (V2) — dua hal yang paling merusak retensi jangka panjang.

Jadi jawabannya: bukan "besok", dan bukan "acak statis" — jadwal FSRS ada dan benar, tetapi
sebagian besar jalur latihan mengabaikannya.

---

## 2. Ringkasan temuan

| ID | Tingkat | Temuan | Bukti |
|----|---------|--------|-------|
| V-A | **Tinggi** | "Uji kosakata" & flashcards mengacak semua kata level aktif; kartu jatuh tempo tidak didahulukan | V4 |
| V-B | **Tinggi** | Naik level → kartu level lama yang jatuh tempo hilang dari hitungan & sesi ulangan, selamanya | V6 |
| V-C | Sedang | Kartu matang yang lupa (stabilitas 252 hari) baru diulang 3,84 hari kemudian — tanpa langkah belajar-ulang | V2 |
| V-D | Sedang | "Sudah hafal" (`markMastered`) menulis jadwal 30 hari tetapi tidak menyentuh `stabilityDays`; model yang sama menghitung risiko lupa 78,6% keesokan harinya | V5 |
| V-E | Rendah | Flashcard "Masih belajar" dicatat sebagai jawaban SALAH (lapse, `consecutiveWrong` naik) | V7 |
| — | Bersih | Rumus FSRS-lite konsisten; kartu salah dijadwalkan dan muncul di "Review jatuh tempo" tepat waktu | V1, V3, V8 |

---

## 3. Yang terukur

**V8 — matematika modul.** Untuk paruh-waktu 3,2 hari: jeda ulang 0,486 hari, dan
`retrievability(3.2, 0.486) = 0,9001` (target retensi 0,9 tepat). Sukses pada stabilitas 5 hari:
diulang terlalu cepat (R=0,999) → 5,07; tepat waktu (R=0,9) → 12,25; terlambat (R=0,5) → 58,7.
Efek jarak (*spacing*) bekerja seperti yang dijanjikan komentar `updateMemory`.

**V1 — kartu baru dijawab salah:** `stabilityDays` 0,449 → jatuh tempo lagi **97,9 menit**
kemudian (bukan besok). Ini wajar sebagai langkah belajar-ulang di hari yang sama.

**V3 — muncul di ulangan:** "Review jatuh tempo" = 0 sebelum jedanya, 1 sesudahnya.

**V2 — kartu matang lalu lupa.** Lima ulangan tepat waktu menghasilkan jeda 1,33 → 3,47 → 8,3 →
18,4 → 38,4 hari dan stabilitas **252,7 hari**. Satu kali lupa: stabilitas jatuh ke 25,3 hari
(lantai `LAPSE_FLOOR = 0.1`, `fiezel-core-brain.js:392`) dan kartu baru muncul lagi **3,84 hari**
kemudian. Model mengklaim retensi 90% empat hari sesudah murid *gagal mengingat* kata itu.

**V4 — "Uji kosakata".** 20 dari 339 kata A1 dibuat jatuh tempo (app menghitung 20). Dari 15
sesi yang dibuka, kata pertamanya kartu jatuh tempo **1 kali**; acak murni memberi 0,88.
`startVocabQuiz` (`app.js:11539`) dan `flashcards` (`app.js:11494`) sama-sama
`shuffle(V.filter(v=>v.level===level))`. Kartu jatuh tempo hanya didahulukan di
`reviewVocab` (`app.js:11521`, tombol "Review jatuh tempo") dan di kolam sesi adaptif
(`app.js:5553`: `if(due)score+=8…`, butuh `adaptiveReady` sesudah tes penempatan).

**V6 — naik level.** Satu kartu A1 jatuh tempo: dihitung 1 saat level aktif A1, **0** sesudah
pindah ke A2. `dueItems()` (`app.js:2905`) dan `reviewVocab()` menyaring
`contentLevelFor(...)===level aktif`. Kata A1 tidak pernah diulang lagi sesudah murid naik.

**V5 — "Sudah hafal".** Sesudah satu kesalahan (`stabilityDays` 0,449), `markMastered`
(`app.js:2988`) menulis `nextReview` +30 hari tetapi `stabilityDays` tetap 0,449. Sehari kemudian
`forgettingProbability()` (`app.js:2906`), yang membaca `stabilityDays` dari model yang sama,
menghitung risiko lupa **78,6%**. Kolam adaptif menambahkan `risk*6 + risk*7` ke skornya, jadi
kartu "hafal" diperlakukan seperti hampir terlupa sementara jadwalnya berkata 30 hari.

**V7 — "Masih belajar".** Tombol flashcard (`app.js:11513`, juga `reviewLearning` :11531)
memanggil `updateMastery(...,false)`: `total` 1→2, `lapses` 0→1, `consecutiveWrong` +1 (pemicu
pesan "kesulitan beruntun"). Penilaian diri saat menjelajah kartu menjadi bukti kegagalan.

---

## 4. Rekomendasi

1. **V-A** — "Uji kosakata" memilih kartu jatuh tempo dulu (urut `reviewPriority()` yang sudah
   ada di Core Brain), lalu kartu baru; flashcard bisa tetap acak tetapi menaruh jatuh tempo di
   depan.
2. **V-B** — ulangan kosakata mencakup semua level ≤ level aktif (filter lama dibuat untuk kunci
   yatim; cukup tolak kunci yang `contentLevelFor` kosong).
3. **V-C** — sesudah lupa, jeda berikutnya dibatasi (mis. ≤ 1 hari) sebelum stabilitas
   pasca-lupa dipakai lagi — langkah belajar-ulang ala FSRS/Anki.
4. **V-D** — `markMastered` lewat `updateMemory(ok:true)` atau menulis `stabilityDays` yang
   konsisten dengan jadwal 30 harinya; satu penulis jadwal.
5. **V-E** — "Masih belajar" dicatat sebagai sinyal penilaian diri (tanpa `lapses` /
   `consecutiveWrong`), atau hanya menjadwalkan ulang tanpa menghukum statistik.

---

## 5. Status perbaikan (2026-10-04, disetujui owner)

**V-A — diperbaiki.** Satu antrean `vocabReviewQueue()` (kartu jatuh tempo di level ≤ level aktif,
paling rawan lupa lebih dulu, risiko dari model FSRS-lite yang sama) kini dibaca oleh "Uji
kosakata", flashcards, dan "Review jatuh tempo". "Uji kosakata" membangun dan menyaring soalnya
sendiri sampai tepat sebanyak sesi (kartu jatuh tempo dulu, lalu kata level aktif), karena
`quizLoop` mengacak lalu memotong kolam. Flashcards menaruh kartu jatuh tempo di depan dek.

**V-B — diperbaiki.** `dueItems()` menghitung kosakata jatuh tempo dari semua level ≤ level aktif
(`vocabReviewLevelOk`); kunci yatim tetap ditolak. Grammar/reading tidak berubah.

Probe diulang sesudah perbaikan:

| | Sebelum | Sesudah |
|---|---|---|
| V4: kata pertama "Uji kosakata" adalah kartu jatuh tempo | 1/15 sesi (acak murni 0,88) | **15/15** |
| V6: kartu A1 jatuh tempo sesudah naik ke A2 | 0 | **1** |

Gerbang: `tests/learning-integrity-2026-10-04-test.js` (V-A/V-B) dan
`tests/grammar-vocab-leveling-test.js` Test 10 (bentuk kolam "Uji kosakata").

**V-E — diperbaiki (m025-443).** "Masih belajar" di flashcards dan di "Review jatuh tempo" kini
memanggil `markStillLearning()`: total, benar, lapses, beruntun-salah, dan mastery tidak bergerak;
kartunya hanya dijadwalkan kembali dalam 10 menit (tidak pernah lebih lambat dari jadwal yang sudah
ada). Kata yang belum pernah dijawab ikut masuk antrean ulangan tanpa percobaan palsu.

**Lanjutan V-B (m025-443).** Lesson grammar dan bacaan yang jatuh tempo dari level di bawah level
aktif kini juga dihitung (`dueItems`) dan masuk sesi adaptif serta "Reading adaptif" (butir
ditandai `__crossLevelReview`, tetap tercatat dengan level aslinya). Angka "jatuh tempo" kosakata di
Beranda kini sama dengan isi "Review jatuh tempo".

Gerbang: `tests/review-continuity-2026-10-04-test.js` (16 cek; merah 1/11 di `main` m025-442).

**V-C, V-D — belum dikerjakan.**
