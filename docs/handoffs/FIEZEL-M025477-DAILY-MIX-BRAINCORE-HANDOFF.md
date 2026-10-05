# Handoff: Daily Mix Interleaving berbasis Braincore (M025-477)

## Ringkasan Eksekutif
Sistem "Rencana Hari Ini" di Fiezel Learner Flow telah dirombak. Alih-alih menampilkan *to-do list* yang memaksa murid memilih blok kompetensi (Grammar, Vocabulary, Listening) secara manual, kini UI menampilkan **satu tombol "Mulai Belajar Sekarang"**. 

Di balik layar, sistem secara cerdas menggabungkan alokasi soal dari tiap skill (BKT / FSRS) menjadi satu sesi `mixed` dengan metode *Interleaved Practice* (selang-seling). Ini memberikan pengalaman yang lebih mengalir (*seamless*) ala Duolingo tanpa melanggar otoritas Braincore Engine.

## Perubahan Kode Utama
1. **`features/learner-flow/fiezel-learner-flow.js`**
   - **`buildPlan()`**: Dimodifikasi untuk menggabungkan `ids` dari berbagai blok kompetensi (maks. 13 soal) menggunakan pola *interleaving* (selang-seling 1 per 1). Blok yang dipush kini adalah blok tunggal dengan `id: 'daily_mix'` dan `skill: 'mixed'`.
   - **`startLesson()`**: Diubah agar saat memanggil `markSeen`, iterasi merujuk pada `item.skill` aslinya (didapatkan via `B.byId(id)`), bukan `block.skill`.
   - **`finishLesson()` & `buildNext()`**: Diperkuat untuk mencegah *crash* saat menjumpai properti `L.skill === 'mixed'` yang tidak ada di *Dictionary* `B.SKILLS`.
   - **`planView()`**: UI dirancang ulang menjadi satu *card* besar berisi tombol sentral "Mulai Belajar Sekarang". Tugas dari guru (Assignments) tetap dirender di bagian bawah dengan jelas.
   - **`lessonView()`**: Objektif pelajaran untuk `'mixed'` di-*hardcode* untuk mencegah referensi undefined.

## Validasi Mutu (Quality Gate)
- [x] **Zero-Loss Input (Braincore)**: `answerLesson` membaca properti `item.skill` per butir soal individu. Ini memastikan telemetry yang dialirkan ke `record()` dan BKT/OLM tetap 100% presisi walau soalnya digabung dalam mode `mixed`.
- [x] **Anti-Ghost Deploy**: Versi berhasil dinaikkan dari `m025-476` menjadi `m025-477` menggunakan arbiter. Enam titik sinkronisasi selaras.

## Bukti Eksekusi Empiris
Secara konseptual, logika telah dibuktikan dari aliran variabel:
1. `allocateIds` menghasilkan himpunan `id` yang diurutkan *interleaved* di `buildPlan`.
2. Himpunan ini dipush ke `itemIds` `daily_mix`.
3. `startLesson` memulai *lesson*.
4. UI *lesson* menarik `item = B.byId(id)`, di mana `item` memiliki atribut `skill` masing-masing yang tetap valid.
5. `answerLesson` memanggil `record(st, item.skill, ...)` (BUKAN L.skill), sehingga data master BKT tidak rusak.

## Keputusan Arsitektur
Mode `daily_mix` bukan sistem baru di luar *bank/braincore*, melainkan sekadar penyajian agregat UI (View layer orchestration). Alih-alih merombak *QuestionAllocator*, kita hanya menggabungkan *array* hasilnya secara *round-robin*, sehingga seluruh batas *throttle* server dan model Bayesian *Knowledge Tracing* di bawahnya sama sekali tak tersentuh.
