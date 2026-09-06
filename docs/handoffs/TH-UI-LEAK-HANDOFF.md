# Kebocoran naskah Indonesia di mode Thai: apa yang bocor, apa yang sudah ditutup

Otoritas: OWNER. Dokumen ini lahir dari audit m025-265 atas satu pertanyaan owner —
"apakah kerja agen PR #358 (Thai full localization) berguna atau tidak?" — dan
jawabannya membuka cacat yang lebih besar daripada PR itu sendiri.

## Status

SELESAI (gelombang 1-3) di build `m025-266`; naskah notice kuota + suara menyusul di `m025-269`. Sisa utang tercatat sebagai ANGGARAN
di `tests/th-ui-leak-test.js`, bukan sebagai pekerjaan yang dilupakan.

## Temuan

FIEZEL punya lapisan i18n lengkap (2.205 kunci id, semuanya berpadanan th) sejak
gelombang multilingual. Tapi lapisan itu hanya bekerja untuk kalimat yang
MEMANGGILNYA. Sapuan menemukan **204 kalimat yang tidak**: literal Indonesia yang
dicetak langsung ke DOM. Murid yang memilih ภาษาไทย membacanya dalam bahasa
Indonesia, dan tidak satu pun gerbang merah karenanya.

Yang paling parah adalah sisi guru: `fiezel-teacher-shell.js` (79), `fiezel-class-hub.js`
(51), `fiezel-tutor-action-center.js` (24) — ketiganya nol panggilan i18n sama sekali.

## Yang ditutup

| Berkas | Sebelum | Sesudah |
| --- | --- | --- |
| `app.js` | 42 | 1 (potongan prompt AI) |
| `features/teacher/fiezel-teacher-shell.js` | 79 | 0 |
| `features/class-hub/fiezel-class-hub.js` | 51 | 0 |
| `features/tutor-action-center/fiezel-tutor-action-center.js` | 24 | 0 |
| `features/learner-flow/*` (flow, duel, review-bank, backup) | 31 | 0 |
| `features/teacher/fiezel-teacher-store.js` | 4 | 0 |
| lain-lain (inbox, coach-bubble, tutor-v3, braincore-review) | 6 | 0 |

Pola yang dipakai sama dengan `features/auth/fiezel-account.js` yang sudah ada:
`t(kunci, fallback-id)` fail-soft. Murid th memuat copy-th secara DINAMIS, jadi
sebelum copy-nya tiba yang tampil adalah fallback id — bukan kunci mentah.

Ditambah blok `umum.*` (22 kata lintas modul) supaya satu kata tidak lahir sepuluh
kali dengan sepuluh kunci berbeda.

## Yang SENGAJA tidak disentuh, dan alasannya

1. **Berkas kanon ber-sha terkunci**: `features/quota/quota-copy.js` (5) dan
   `features/prasasti/fiezel-prasasti-core.js` (3), dikunci `id-golden-snapshot`.
   `features/neural-voice/fiezel-cf-voice-notice.js` (3) adalah cermin naskah quota.

   **KOREKSI (diverifikasi m025-268)**: versi pertama dokumen ini menyebut penghalangnya
   adalah `CANON_TH_RULES` yang "menunggu penutur asli, fail-closed". Itu TIDAK BENAR lagi —
   `tests/quota-notice-a11y-test.js:164` sudah terisi (status `DRAFT AI`, empat aturan nada
   th) dan gerbangnya HIJAU. Penghalang yang sebenarnya lebih sederhana dan lebih besar:
   **naskah notice-nya tidak punya padanan th sama sekali.** `copy-th-quota.js` hanya
   memuat 4 kunci `ai.*` yang tidak berhubungan; tabel kanon notice (`quota.ok`,
   `quota.low`, `quota.exhausted`, `service.degraded`, `service.providerError`,
   `service.unknown`, `quota.unavailable`, `network.offline` — masing-masing dengan
   `title`/`spoken`/`silent`) hidup sebagai objek beku berbahasa Indonesia di
   `quota-copy.js`, dan `presentQuotaNotice()` membacanya LANGSUNG lewat `copy.build()`,
   bukan lewat `FiezelI18n.t()`. Jadi pekerjaannya dua bagian: (a) tulis padanan th untuk
   tabel itu, (b) alirkan pembacaannya lewat copy-map dengan tabel id sebagai fallback.

   **SELESAI di m025-269.** Keduanya dikerjakan: 49 kunci `quota.copy.*` dan 23 kunci
   `voice.notice.*` (nilai id byte-identik + padanan th) di `copy-id-quota.js` /
   `copy-th-quota.js`, dan `build()` di kedua modul membaca copy-map lebih dulu dengan
   tabel beku sebagai cadangan fail-soft. Anggaran keduanya di `th-ui-leak` sengaja TIDAK
   diturunkan: yang dihitung pemindai sekarang adalah kalimat cadangan itu, dan
   menghapusnya berarti menghapus jaring pengamannya.
2. **ZONA AUDIO**: `fiezel-diag-panel.js` (6) dan
   `fiezel-neural-voice-audibility-fix.js` (2). Gerbang P0
   `tests/audio-locale-guard-test.js` melarang berkas zona audio menyebut
   `FiezelI18n` SAMA SEKALI — locale yang bocor ke sana pernah ikut ter-hash ke kunci
   cache audio (AI-17 F02). Sapuan ini sempat memindahkan naskahnya lalu
   MENGEMBALIKANNYA begitu gerbang itu merah. Pagar P0 tidak dilonggarkan demi naskah.
3. **Konten belajar**: `listening-scenarios-a1/a2.js` (23) adalah pilihan jawaban
   komprehensi; jalur th-nya lewat sidecar `listening-bank-th.json`, bukan copy-map.
4. **Tabel copy brain**: `brain-olm.*`, `brain-tutor.*` — padanan th-nya hidup di
   `naskah-th-brain.js`, jadi bukan kebocoran.
5. **Prompt AI** (1 di `app.js`): rubrik penilaian yang dikirim ke model, bukan naskah UI.

## Gerbang

`tests/th-ui-leak-test.js` (terdaftar di `quality.yml`) memindai `app.js` +
`features/**` untuk literal Indonesia di jalur render yang tidak lewat `t()`, lalu
membandingkannya dengan anggaran per berkas. Naik satu = merah. Anggaran yang tidak
lagi terpakai JUGA merah, supaya izin tidak menganga setelah utangnya dibayar. Ia
juga menuntut setiap kunci id punya padanan th.

## Langkah berikutnya (roadmap)

1. **Zona audio**: label UI di dua berkas itu harus disuntik dari LUAR zona audio
   (mis. host memberi teks lewat opsi mount), bukan dengan menambah pengecualian di
   `audio-locale-guard`. Setelah itu turunkan anggarannya ke 0.
2. ~~**Berkas kanon**: quota/prasasti menunggu naskah th.~~ **Sebagian SELESAI di
   m025-269**: notice kuota + suara sudah punya jalur th penuh (lihat butir 1 di atas).
   Yang masih tersisa di kelompok ini hanya `features/prasasti/fiezel-prasasti-core.js`
   (3 kalimat: judul/deskripsi lencana runtun), yang sha-nya dikunci id-golden dan naskah
   th-nya belum ditulis.
3. **Sidecar listening**: petakan `listening-scenarios-*` ke `listening-bank-th.json`
   supaya pilihan jawaban komprehensi ikut berbahasa Thai.
4. ~~**Prompt AI**: locale murid belum ikut dikirim ke prompt.~~ **KOREKSI
   (diverifikasi m025-268): butir ini SALAH dan sudah dicoret.** Jalur AI sudah
   sadar-locale dari ujung ke ujung, jangan dikerjakan ulang:
   - klien mengirimnya — `aiTaskRequestBody()` di `app.js` menyertakan
     `locale: FiezelI18n.getLocale()` pada skema `fiezel-ai-task-v2`;
   - server memakainya — `workers/api/ai/ai-tasks.js` punya `LANG_DIRECTIVE` per-locale
     (`guardFor(locale)`) plus `checkOutputContractTh()` untuk memeriksa keluarannya;
   - prompt di sisi klien bercabang pada th — Tanya FIEZEL (`app.js`), coach, dan rubrik
     penilaian menulis semuanya punya cabang Thai penuh; literal Indonesia yang terlihat
     di rubrik itu ada di dalam cabang `id`, bukan di jalur bersama.

   Yang MASIH terbuka di wilayah ini hanyalah naskah notice kuota/suara di butir 1.
5. Naskah Thai di commit ini adalah terjemahan yang ditulis mesin dan **wajib
   direview penutur asli** sebelum dianggap final, sama dengan aturan copy-th lain.
