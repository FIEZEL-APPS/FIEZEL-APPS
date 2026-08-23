# FIEZEL Level Control dan Grammar Curriculum

Status implementasi: **READY FOR AI DEPLOYMENT**
Build: `5.19.0` · release marker: `m025-136`
Tanggal validasi: `2026-08-23`

## Ringkasan hasil

Perbaikan ini menyelesaikan dua sumber kebingungan utama:

1. Grammar sekarang memiliki jalur belajar deterministik per CEFR, bukan urutan dari
   object atau hasil fetch yang dapat terlihat acak.
2. Siswa memiliki satu `activeLevel` global. Saat siswa memilih A1, seluruh pengalaman
   belajar memakai A1: Grammar, Vocabulary, Reading, Writing, Classroom,
   Listening, Speaking, Adaptive/Core Brain, pencarian, AI Coach, progress, dan review.

Placement tetap menjadi satu-satunya alur lintas level karena fungsinya memang mengukur
level. Mengganti level tidak menghapus progress level lain.

## Diagnosis dan penyebab

| Temuan | Dampak | Perbaikan |
|---|---|---|
| Grammar hanya bergantung pada urutan bank/insertion order | Siswa melihat topik yang belum punya fondasi | `grammar-curriculum-v1.json` dengan `sequence` dan `prerequisites` |
| Sepuluh konsep Classroom A1 belum menjadi template Grammar canonical | Jalur A1 terputus dan beberapa topik tidak bisa dipraktikkan | 10 template A1 ditambahkan ke bank canonical |
| `state.level` placement dipakai sebagai konteks semua panel | Siswa tidak bisa memilih jalur sendiri dan panel dapat bercampur level | Resolver `getActiveLevel()` dan preference `activeLevel` |
| Riwayat, memori review, dan policy tidak membedakan level | Core Brain bisa mendiagnosis level yang salah | Filter aktif pada history, memory, evidence, due items, policy outcomes |
| Speaking/Listening dan Classroom punya state/picker sendiri | Global level tidak benar-benar global | Host callback/setter dari app utama, stale session reset |
| Curriculum baru tidak ikut shell offline | Grammar dapat kembali tidak berurutan ketika offline | Asset curriculum dimasukkan ke service-worker precache |

## Data curriculum

`grammar-curriculum-v1.json` berisi 139 lesson canonical dengan distribusi berikut:

| CEFR | Lesson |
|---|---:|
| A1 | 17 |
| A2 | 17 |
| B1 | 47 |
| B2 | 32 |
| C1 | 19 |
| C2 | 7 |

Setiap row memiliki identitas stabil, level, sequence integer, unit, title,
prerequisites, `lessonId`, dan `templateId`. A1 dimulai dari pronoun dan `to be`,
articles/plurals, possessives, `there is/are`, prepositions, present simple,
questions, can, present continuous, past be, past simple, countability, lalu
prepositions of time.

## Kontrak level global

- Nilai valid: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`.
- Tersimpan di `state.preferences.activeLevel`.
- `getActiveLevel()` adalah resolver tunggal.
- Mode `placement` mengikuti hasil tes; mode `manual` mengikuti pilihan siswa.
- `setActiveLevel()` menyimpan preference, mengosongkan sesi yang sedang berjalan,
  mereset state Classroom/Skills Lab yang stale, dan menginvalidasi cache Core Brain.
- Progress tetap disimpan berdasarkan lesson/content ID, sehingga pindah A1 -> B1 -> A1
  tidak mereset bukti belajar.

Panel level tersedia dari Home dan header panel. Onboarding juga dapat menyimpan level
self-assessed sebelum placement selesai.

## Cakupan runtime

| Area | Kontrak aktif |
|---|---|
| Grammar | Filter level + urutan curriculum; lesson dan practice menolak level lain |
| Vocabulary | Card, flashcard, quiz, distractor, review, due item satu level |
| Reading | Passage, question order, adaptive/random pool satu level |
| Writing | Prompt dan weekly evidence satu level |
| Classroom | Pack/session mengikuti callback host dan reset saat switch |
| Speaking/Listening | Addon menerima `getActiveLevel`, tanpa picker kedua |
| Adaptive/Core Brain | History, memory, grammar evidence, due review, policy outcome satu level |
| Search | Index result difilter oleh level aktif |
| AI Coach/Tutor | Prompt dan profil ringkas mencantumkan level aktif |
| Progress/Readiness | Snapshot, mastery, evidence, readiness dan dashboard terfilter |

## File utama yang berubah

- `app.js`: resolver global, selector, filtering semua domain, ordered Grammar Hub,
  Core Brain level isolation, active-level AI context.
- `grammar-curriculum-v1.json`: data curriculum ordered.
- `grammar-templates.json`: 139 template canonical, termasuk 10 A1 tambahan.
- `grammar-misconception-id.json`: diagnosis Indonesia untuk seluruh miskonsepsi baru.
- `features/classroom/fiezel-classroom.js`: host level contract dan session filtering.
- `features/speaking-listening/fiezel-speaking-listening-addon.js`: host level contract.
- `features/search/fiezel-search.js`: filter index berdasarkan level.
- `style.css`: control dan picker level, scope note, serta layout responsif.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`: asset offline
  dan marker release `m025-136`.
- `level-grammar-contract-test.js`, `grammar-curriculum-test.js`: gate baru.
- `.github/workflows/quality.yml`, `package.json`: gate dan shortcut CI.
- `LEVEL-GRAMMAR-CONTRACT.md`, `GRAMMAR-CURRICULUM-HANDOFF.md`: handoff teknis.

## Bukti validasi

Semua pemeriksaan berikut lulus:

- Full CI quality gate: **82/82 PASS**.
- Level grammar contract: **18/18 PASS**, domain leaks `0`, cross-level uses `0`.
- Grammar curriculum: **12/12 PASS**, 139 rows, sequence/prerequisite valid.
- Grammar runtime audit: **3.475 questions** (139 x 25), duplicate `0`, focus leak `0`.
- Core Brain v2, tutor brain, learner evidence, adaptive policy: PASS.
- Speaking/Listening: **45/45 PASS**.
- Classroom: **20/20 PASS**.
- Misconception diagnosis: **416 nama, cakupan 100%**.
- Regression, lesson experience, product audit, HTTP smoke: PASS.
- Syntax seluruh `.js` dan `.mjs`: PASS.
- `git diff --check`: PASS.

Machine reports:

- `GRAMMAR-CURRICULUM-REPORT.json`
- `LEVEL-GRAMMAR-CONTRACT-REPORT.json`

## Instruksi deploy untuk AI lain

Dari root clone repository:

```bash
git apply FIEZEL-level-grammar-hardening.patch
npm install --ignore-scripts
node grammar-curriculum-test.js
node grammar-quality-audit.js
node level-grammar-contract-test.js
node pwa-cache-test.js
node regression-test.js
git diff --check
```

Setelah semua PASS:

```bash
git add -A
git commit -m "feat: add global learner levels and ordered grammar curriculum"
git push -u origin claude/log-checkpoint-m025-136-42sk6e
```

Untuk deployment static/PWA, file `grammar-curriculum-v1.json` wajib berada pada
origin yang sama dan service worker baru harus aktif. Marker `m025-136` sengaja dinaikkan
agar shell lama tidak terus menyajikan asset tanpa curriculum.

## Rollback aman

Rollback dilakukan dengan revert commit/PR, bukan menghapus localStorage. Data progress
tidak dimigrasikan ke bucket level baru, sehingga revert tidak menghilangkan history.
Jika shell lama masih aktif, lakukan reload setelah service worker versi target selesai
install dan pastikan health check membaca `m025-136`.
