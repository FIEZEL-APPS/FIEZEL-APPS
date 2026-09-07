# FIEZEL — Audit & Arsitektur "Class" sebagai Learning Hub Guru ↔ Murid ↔ Braincore

Tanggal: 2026-09-06 · Build target: m025-259 · Status: audit selesai, implementasi tahap 1 masuk di commit yang sama.

## 1. Hasil audit (kondisi sebelum perubahan)

| Area | Lokasi | Temuan |
| --- | --- | --- |
| Bottom navigation | `index.html:432-438` | 5 tab: Latihan · **Kelas** (`go('classroom')`) · Hari ini · Progres · Profil. Tab Kelas ada, tapi isinya bukan kelas. |
| View `classroom` | `app.js:8312-8384` (`classroom()` → `classroomBase`) dan `features/tutor-classroom/fiezel-tutor-v3.js:1010` (`root.classroom = classroomV3`) | "Kelas" = pelajaran tutor bersuara (materi FIEZEL + subtitle). Tidak ada guru, tidak ada murid, tidak ada tugas. Kartu Home `classroom-launch` bahkan dikunci *Coming Soon*. Tutor-v3 menimpa global `classroom` sehingga pembungkus di app.js tidak pernah konsisten. |
| Dashboard guru | `features/teacher/fiezel-teacher-shell.js` + `fiezel-teacher-store.js` (localStorage `fiezel-teacher-v1`) | Sudah lengkap: kelas, siswa, tugas dari bank soal, analitik skill/heatmap, komunikasi, jurnal, sinkron server, inbox guru. Tapi hidup sebagai **cangkang terpisah** (`fz-teacher-mode` menyembunyikan bottom nav; `go()` memaksa guru ke view `tutor`). Tugas hanya bisa dari bank FIEZEL (`buildAssignment` → `FiezelReviewBank.pickFresh`), tidak bisa menulis/impor soal, tidak bisa melihat soal yang dikirim, status hanya selesai/belum. |
| Dashboard murid | `features/learner-flow/fiezel-learner-flow.js` (view `learn`) | Tugas guru masuk sebagai blok "Tugas dari guru" di *Rencana hari ini* (`ASSIGN_KEY` = `fiezel-learner-assignments-v1`). Setelah selesai, tugas **dihapus** dari antrean (`finishLesson`) → tidak ada daftar "selesai", tidak ada deadline/status, murid tidak melihat siapa gurunya (payload hanya `from` = nama kelas). |
| Alur assignment | store `assignmentPayload` → `POST /api/teacher/class/assign` → D1 `tc_class_assignment` → murid poll `GET /api/learner/class-assignments` (`features/notify/fiezel-inbox.js`) → `acceptAssignmentPayload` → lonceng notifikasi → `openAssignmentFromNotif` → `go('learn')`. | Loop bekerja tapi hanya membawa `itemIds` (referensi bank). Hasil kembali hanya agregat `{id, c, t}` per tugas → guru tidak bisa melihat soal mana yang salah. |
| Class sync | `workers/api/route-class-sync.js`, `teacher/class-sync-core.js`, D1 `tc_class`, `tc_class_report`, `tc_class_assignment` | Identitas relasi: guru = `teacher_sub`; kelas = `code` (FZ-XXXXXX); murid = `learner_key` (nama depan lowercase) + `learner_sub` (cookie HMAC). Konsisten dan sudah ber-gerbang peran. |
| Inbox | murid: `fiezel-inbox.js` (+ `refreshNotifBadge` app.js:12874); guru: `TeacherStore.notify/inbox` | Dua inbox, sudah terhubung ke sinkron. Aman dipertahankan. |
| Braincore bridge | `workers/api/teacher/braincore-bridge.js` (+ `content-core.js`, `route-teacher.js`: tree/node/question/csv/assign/progress) | Kontrak item guru → Braincore (`normalizeForBraincore`, `evidenceFromAttempt`, `chooseNextActivity`, `classProgress`) **ada di server tapi nol pemanggil di frontend**. Sistem konten pohon (`tc_node/tc_question/tc_assignment` per `learner_sub`) paralel dengan sistem kode kelas — dua jalur assignment yang tidak bertemu. |
| Brain sisi klien | `features/brain/fiezel-item-prior.js` (`difficultyFor`), `fiezel-misconception-ledger.js`, `misconception-taxonomy-v1.json` (49 kode), `FiezelReviewBank.explain/why` | Kemampuan analisis lokal tersedia tanpa Puter/API key: prior kesulitan per level+domain+panjang stem, taksonomi miskonsepsi, alasan distraktor. Belum pernah dipakai untuk meninjau soal guru. |

### Flow diagram (sebelum)

```
GURU (Ruang Guru, view tutor, nav tersembunyi)          MURID (Home/Learn/Kelas=tutor suara)
  buat tugas dari bank ──► /class/assign ──► D1 ──► poll inbox ──► lonceng ──► go('learn')
  ◄── /class/reports ◄── D1 ◄── /class-report ◄── pushToClass (agregat {c,t}) ◄── selesai (tugas dihapus)
  Braincore bridge (server, tanpa pemanggil)            Tab "Kelas" = pelajaran tutor, tidak terkait guru
```

### Daftar gap

1. **G1 — Kelas bukan kelas.** Tab Kelas menampilkan tutor suara; hubungan guru–murid tidak punya pintu di bottom nav.
2. **G2 — Dua sistem terpisah.** Guru dikunci di cangkang `tutor`; murid tidak pernah melihat "kelas saya", nama guru, deadline, atau daftar selesai.
3. **G3 — Tugas hanya dari bank.** Tidak ada tulis/impor soal sendiri; guru tidak bisa melihat soal persis yang dikirim.
4. **G4 — Status biner.** Hanya selesai/belum; tidak ada *sedang mengerjakan* dan *terlambat* yang dihitung dari deadline.
5. **G5 — Bukti terlalu kasar.** Laporan hanya `{c,t}`; tidak ada per-soal → miskonsepsi murid tidak bisa dilihat guru.
6. **G6 — Braincore black box / tidak dipakai.** Bridge server tak terpanggil; tidak ada tahap *Original → Analysis → Suggested → Final* untuk guru.
7. **G7 — Identitas guru tidak sampai ke murid.** Payload `from` = nama kelas, bukan guru.
8. **G8 — Wiring `classroom` rapuh.** Global ditimpa tutor-v3; pembungkus app.js membandingkan dirinya sendiri.

## 2. Arsitektur yang diusulkan (dan diimplementasikan)

Prinsip: **satu modul hub, dua wajah, satu kontrak data.** Tidak ada Classroom baru; hub *menyusun ulang* fondasi yang ada.

```
                    ┌──────────────── features/class-hub/fiezel-class-hub.js ────────────────┐
                    │  Teacher face (di dalam Ruang Guru, view "Kelas" = landing default)     │
                    │  Student face (bottom nav "Kelas", view classroom)                       │
                    └───────────────┬───────────────────────────────┬─────────────────────────┘
        FiezelTeacherStore (data & sinkron) ◄──────┐          FiezelLearnerFlow (mesin skill/laporan)
        FiezelReviewBank (bank soal + why)          │          FiezelInbox (poll tugas)
        FiezelBraincoreReview (analisis lokal) ◄────┘          FiezelTeacherStore.acceptAssignmentPayload
                    │
        workers/api/teacher/class-sync-core.js  (payload v1 diperluas, kompatibel mundur)
```

Learning loop yang kini utuh:

```
GURU → Buat Tugas (bank | tulis | impor) → BRAINCORE REVIEW (CEFR, skill, kesulitan, kualitas, distraktor,
miskonsepsi, remediasi) → Guru edit/approve (Original→Analysis→Suggested→Final) → kirim (/class/assign, payload
+items +teacher) → MURID Kelas ▸ Tugas (deadline, dari guru X) → kerjakan DI DALAM Kelas (runner) → started
dilaporkan (assign.s) → selesai: hasil per-soal (assign.w) → /class-report → GURU Kelas ▸ Hasil (status 4 warna,
per-soal, miskonsepsi per distraktor) → Insight Braincore (remediasi → "Buat tugas remedial") → loop.
```

Relasi identitas: `teacher_sub` → `tc_class.code` → `learner_key`/`learner_sub` → `assignment.id` → `itemIds`/`items[].id` → `report.assign[{id,c,t,s,w}]` → `a.done[sid]`/`a.progress[sid]` → insight. Semua identifier sudah ada; yang ditambah hanya bidang opsional.

### Perubahan kontrak data (aditif, kompatibel mundur)

| Objek | Tambahan | Alasan |
| --- | --- | --- |
| Payload tugas v1 | `teacher` (≤60), `items[]` (≤40 soal kustom: `id, prompt, options[2..6], answer, skill, why{}, tag`) | G3, G7 |
| Laporan murid v1 `assign[]` | `s:1` (sedang dikerjakan), `w[]` (`{i:itemId,o:indeksPilihan}` ≤40) | G4, G5 |
| Teacher store assignment | `items, teacher, source, review, progress{sid}`, `done[sid].w` | G3–G6 |
| Byte limit | `/api/teacher/class/assign` 32 KB, `/api/learner/class-report` 8 KB | items & w |

### Tiga konsep UI yang dibandingkan

**A — "Dua wajah, satu hub" (dipilih).** Tab Kelas menampilkan hub role-aware. Murid: *Tugas · Kelas Saya · Progres* (3 tab; Upcoming/Completed digabung sebagai dua bagian dalam Tugas agar tidak ada tab kosong). Guru: *Kelas · Tugas · Buat · Hasil · Braincore* sebagai landing default Ruang Guru; fitur administratif lama (absensi, komunikasi, jurnal, papan) tetap satu ketuk di sidebar. Kelebihan: nol silo, semua loop di satu tempat, fondasi dipakai apa adanya. Kekurangan: layar guru padat → diatasi dengan wizard 3 langkah.

**B — "Feed kelas ala LMS".** Satu timeline campuran (pengumuman, tugas, hasil) untuk kedua peran. Kelebihan: sederhana secara mental. Kekurangan: status tugas dan review Braincore tenggelam di feed; guru butuh tabel status, bukan kronologi. Ditolak.

**C — "Assignment-first".** Kelas = daftar tugas saja; kelas/guru/murid jadi metadata. Kelebihan: paling ringkas. Kekurangan: melanggar "Class = pusat hubungan"; murid tidak melihat kelas & guru, guru tidak melihat daftar murid. Ditolak, tapi urutan prioritasnya (tugas di atas) diserap ke konsep A: tab pertama murid adalah Tugas.

## 3. Yang diimplementasikan (tahap 1, commit ini)

- `features/class-hub/fiezel-braincore-review.js` — Braincore review lokal: `parseQuestions` (pipe/CSV/TSV/blok A-D), `analyzeQuestion` (estimasi CEFR, tebakan skill, kesulitan via `FiezelItemPrior.difficultyFor`, 9 pemeriksaan kualitas, analisis distraktor → kode taksonomi miskonsepsi, kebutuhan remediasi), `suggestImprovement`, `analyzeSet`, `assignmentStatus` (belum/sedang/selesai/terlambat).
- `features/class-hub/fiezel-class-hub.js` + `class-hub.css` — dua wajah hub.
- `app.js` — `classHubView()` dipasang pada view `classroom`; wrapper `classroom()` diperbaiki (G8) dan tetap tersedia sebagai "Tutor FIEZEL" di dalam hub; notifikasi tugas membuka Kelas, bukan Learn.
- `fiezel-teacher-shell.js` — view `hub` ("Kelas") jadi landing default; modal lama dipakai ulang dari hub.
- `fiezel-teacher-store.js` — payload `teacher/items`, `ingest` membaca `s/w`, `buildAssignment` menerima soal kustom.
- `fiezel-learner-flow.js` — `markAssignmentStarted`, `recordAssignmentResult` (satu mesin laporan, tidak ada duplikat); blok "Tugas dari guru" di Rencana hari ini dirutekan ke runner Kelas (soal kustom guru hanya bisa dirender di sana).
- `workers/api/teacher/class-sync-core.js`, `schema.js` — kontrak diperluas.
- `tests/class-hub-test.js` — gerbang baru; gerbang lama (`class-sync-test`, `classroom-test`, `teacher-instant-boot-test`, dst.) tetap hijau.

## 4. Backlog (tahap berikutnya)

- P1: satukan jalur `route-teacher.js` (pohon konten / CSV server / `tc_assignment` per `learner_sub`) ke hub sebagai sumber "Impor dari bank sekolah" — kontraknya sudah cocok dengan `items[]`.
- P1: kalibrasi `review` dengan bukti nyata (`fiezel-item-calibration.js`) setelah ≥5 murid mengerjakan soal kustom yang sama.
- P2: ledger miskonsepsi murid (`fiezel-misconception-ledger.js`) diberi umpan dari `w[]` supaya tutor pribadi murid ikut belajar dari tugas guru.
- P2: i18n TH untuk teks hub (saat ini ID, sama seperti Ruang Guru dan learner-flow).
