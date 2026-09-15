# Sumbu bahasa FIEZEL — handoff m025-317

**Otoritas: OWNER.** Dokumen ini melaporkan apa yang SUDAH dikerjakan sampai m025-317 dan
menyerahkan daftar yang BELUM, lengkap dengan alasan kenapa sisanya tidak dikerjakan
sekaligus. Ia bukan laporan "selesai".

Pemicu: laporan OWNER 14 September 2026 — *"masih banyak bug dan konten yang tidak sesuai,
seperti i18n Thai, UI DAN UX Bahasa Jepang masih memuat konten bahasa Inggris, seharusnya
tampilan UI dan UX-nya ikut berubah."*

Audit lengkap beserta nomor baris: `reports/AUDIT-UI-UX-BAHASA-2026-09-14.md` (16 temuan).

---

## Status

**Sebagian.** 7 dari 16 temuan diperbaiki di m025-314; butir P0 ("progres tiap bahasa
berdiri sendiri") dibayar di **m025-317** dan ikut menutup sebagian butir 2 dan 3 yang
lama. Enam sisanya masih terbuka dan **tidak ada lagi yang P0** — lihat "Langkah
berikutnya" di bawah. Kursus Jepang hari ini sudah tidak menawarkan permukaan berbahasa
Inggris, tutor AI-nya menyebut kursus yang benar, dan progresnya sudah berdiri sendiri.
Yang belum: **isi** kursus Jepang (cloze, set ujian, jalur Thai) masih berbahasa Inggris
atau Indonesia.

Dua sumbu yang sepanjang dokumen ini dibedakan tegas, karena keduanya paling mudah tertukar:

| Sumbu | Nilai | Yang diatur |
|---|---|---|
| `learnerLocale` | `id` / `th` | bahasa LAYAR |
| `targetLang` | `en` / `ja` | bahasa yang DIPELAJARI |

---

## Yang sudah berdiri sesudah m025-314

**Penjaga bahasa duduk di RUTE, bukan di kartu.** `targetLangSurfaceBlocked()` (app.js)
adalah satu-satunya sumber kebenaran untuk "permukaan ini belum punya isi bahasa target".
`go()` yang menolak, `renderInner()` menjepit layar tersimpan dari sesi sebelum murid
berganti kursus, dan ketiga daftar kartu (`latihanCards`, `skillHubModel`, `quickChips`)
menyaring lewat penjaga yang sama.

Sebelumnya penjaganya dipasang di satu daftar kartu saja, dan tiga pintu lain — kartu skill
hub Beranda, chip "Dengar" Beranda, dan rute itu sendiri — tidak terjaga. Chip "Dengar"
berdiri tepat di bawah chip yang mengantar murid ke Bahasa Jepang.

**Cara mencabutnya nanti:** kosongkan entri `'ja'` di `TARGET_LANG_BLOCKED_VIEWS`. JANGAN
menambah pengecualian di tempat lain. `tests/japanese-surface-honesty-test.js` mengikat
syaratnya ke isi `content/ja/` dan pakunya en-US, jadi gerbang itu yang akan menuntut
pencabutannya begitu keduanya siap.

**Prompt AI menyebut kursus aktif.** `courseLanguageLabel()` membaca copy-map `bahasa.<kode>`
— copy-map yang sama dengan pemilih bahasa — dan dipakai kelima perakit prompt. Nama kursus
di prompt dan di Pengaturan karena itu mustahil berbeda, dan keduanya ikut berbahasa Thai.

**Dua kartu berhenti mengarang.** `continueLearningCard()` dan `aiBoosterCard()` kini
dibangun dari `state.history` dan tidak dicat saat buktinya belum ada.

**Tombol dengar flashcard disembunyikan** selama `targetLangVoiceBlocked()`, dengan alasan
yang dikatakan kepada murid.

**Gerbang baru:** `tests/target-lang-surface-guard-test.js` — memuat `app.js` di vm lalu
MEMANGGIL daftar kartunya di kedua bahasa, bukan memindai pola teks.

---

## Yang ditambahkan m025-317 — progres tiap bahasa berdiri sendiri

Butir P0 di bawah sudah dibayar. `sideStateKey()` sendiri **tidak** diubah menjadi
bersumbu bahasa — cara itu akan memindahkan seluruh isi state, termasuk hal-hal yang
memang milik murid dan bukan milik kursus. Yang dilakukan: state dibelah tiga golongan,
dan hanya golongan progres yang ikut bahasa.

| Golongan | Isi | Disimpan di |
|---|---|---|
| `PROGRESS_STATE_FIELDS` | `level`, penempatan, `history`, `wrongAnswers`, `vocab`/`grammar`/`reading`, BKT & kebijakan adaptif, sesi | kunci bahasa |
| `PROGRESS_PREF_FIELDS` | `activeLevel`, `selfAssessedLevel`, `levelMode` | kunci bahasa |
| `GLOBAL_RHYTHM_FIELDS` | `streak`, `daily`, `learningDays` | kunci dasar |
| sisanya | preferensi, identitas, sumbu bahasa itu sendiri | kunci dasar |

**Streak sengaja TIDAK ikut bahasa.** Ia mengukur kebiasaan murid, bukan kemajuan satu
kursus; mengikatnya ke bahasa akan membakar streak tujuh hari begitu murid mencoba kursus
lain sekali. Ini keputusan produk, bukan kebetulan implementasi — kalau suatu hari ingin
diubah, ubah daftar `GLOBAL_RHYTHM_FIELDS`, jangan menambal di tempat lain.

**Bahasa Inggris tidak dibelah.** `loadState()` mengembalikan blob dasar apa adanya untuk
`en` dan `saveFlushWrite()` menulis satu blob utuh, jadi kunci lama identik bita per bita
dan **tidak ada migrasi** yang perlu dijalankan pada murid yang sudah ada. Bahasa lain
membaca progres dari `<dasar>@<lang>`; kalau belum ada, ia mulai dari nol dan tidak pernah
mewarisi progres Inggris.

**Urutan di `switchTargetLangStorage()` adalah bagian dari perbaikannya:** siram progres
bahasa LAMA dulu, baru geser sumbu di blob global, baru muat ulang. Menggeser lebih dulu
menyalin progres lama ke kunci bahasa baru — jebakan ini tertangkap saat implementasi, dan
sekarang ada assert khusus yang memutasi state tanpa menyimpan supaya jebakannya benar-benar
tergigit.

**Ruang nama baru menuntut migrasinya ikut diperbarui — ini sudah menggigit sekali.**
Sumbu bahasa melahirkan kunci `<dasar>@ja` dan `<sisi>:<uuid>@ja`. Migrasi sekali-jalan yang
memindahkan progres anonim ke ruang akun (`activateAccountStateFromPuter()` dan
`migrateSideStateToAccount()`) ditulis jauh sebelum ruang nama itu ada, jadi ia hanya mengenal
kunci datar. Murid yang belajar Jepang tanpa akun lalu masuk akun kehilangan seluruh progres
Jepangnya — tidak terhapus, hanya ditinggal di kunci yang tidak pernah dibaca lagi.

Ada TIGA titik, dan dua saja tidak cukup:

1. `migrateSideStateToAccount()` berputar atas `targetLangsKnown()`;
2. `activateAccountStateFromPuter()` memindahkan `<LEGACY>@lang` → `<akun>@lang`, **dan**
   menilai "ada isinya" dari blob `@lang` juga — blob dasar milik murid yang hanya belajar
   Jepang memang tampak kosong, sehingga cabang migrasinya tidak akan pernah jalan;
3. satu baris sesudahnya, state dibangun lewat `loadState(key)`, bukan `sanitizeState(raw)`.
   `raw` adalah blob DASAR; membangun darinya lalu `save()` menulis progres KOSONG ke
   `<akun>@ja`, menimpa persis yang baru dipindahkan.

**Kalau bahasa ketiga lahir:** `targetLangsKnown()` membacanya sendiri dari
`FiezelTargetLanguage.all()`, jadi ketiga titik di atas ikut tanpa disunting. Yang TIDAK ikut
otomatis: ruang nama baru apa pun di luar ketiganya. Periksa migrasi setiap kali sebuah kunci
penyimpanan baru lahir.

**Gerbang:** `tests/target-lang-progress-isolation-test.js` (15 assert) menjalankan jalur
simpan/muat yang sungguhan di kedua bahasa — jawab di Inggris, pindah ke Jepang, jawab lagi,
pulang — dan menuntut tiga janji: progres berdiri sendiri, kembali tidak menghapus apa pun,
dan kunci Inggris tidak bergeser sebita pun.

---

## Langkah berikutnya — berurutan, tidak ada lagi yang P0

### ~~1. (P0) Pisahkan progres per bahasa~~ — SELESAI di m025-317

Lihat bagian "Yang ditambahkan m025-317" di atas. Janji `bahasa.penjelasan` kepada murid
(*"Progres tiap bahasa berdiri sendiri. Berganti tidak menghapus apa pun."*) kini benar
pada kedua paruhnya.

### 2. (P1) Jepit level ke cakupan bank yang aktif — sebagian terbayar

`getActiveLevel()` juga tidak bersumbu bahasa. Cakupan bank Jepang hari ini:

| Bank | A1 | A2 | B1+ |
|---|---|---|---|
| tata bahasa | 242 | 180 | 0 |
| menulis | 24 | 30 | 0 |

Sesudah m025-317 `level` dan `activeLevel` sudah ikut bahasa, jadi murid B1 Inggris yang
mencoba Jepang tidak lagi membawa B1-nya ke sana — ia mulai dari A1 di kursus itu. Yang
**belum**: tidak ada yang mencegah murid menaikkan levelnya sendiri ke B1 di kursus Jepang
lalu menemukan Grammar dan Writing **kosong**, tanpa satu kalimat penjelasan. Jepitannya
harus datang dari cakupan bank, bukan dari pemisahan penyimpanan.

### 3. (P1) Bank cloze dan set ujian membaca ikut bersumbu bahasa

`ensureClozeBank()` selalu menarik `cloze-bank-v1.json` (kalimat Inggris). State BKT-nya
sendiri sudah tidak lagi dibagi sesudah m025-317, jadi `clozeSkillReady()` kini menanyakan
penguasaan yang benar — tetapi **kalimat yang disodorkan tetap berbahasa Inggris** di
kursus Jepang. `READING_EXAM` (delapan teks IELTS/TOEFL berbahasa Inggris) dimuat dan
ditawarkan di Ruang Reading tanpa cabang bahasa.

### 4. (P1) Jalur Thai untuk kursus Jepang

Bank Jepang membawa medan `*Id` (Indonesia) dan `*` (Inggris), tanpa medan Thai. Overlay
Thai `grammarItemForTh()` menyambung lewat **id template**, dan id Jepang `JP-*` tidak ada
di `grammar-explanations-th.json`, jadi `if(!x)return item` selalu terpilih. Kombinasi
layar Thai + kursus Jepang karena itu menyajikan seluruh penjelasan dalam bahasa Indonesia.

### 5. (P2) Jenis kata Jepang, dan peringatan pemilih bahasa yang basi

`PART_OF_SPEECH_ID` tidak mengenal `adjective-na` (27 kata) dan `phrase` (78 kata) — kartu
menghapus perbedaan -i/-na tepat di kursus yang sedang mengajarkannya. Dan
`bahasa.ja-peringatan` masih berbunyi "baru tingkat A1" padahal banknya sudah A2.

---

## Utang naskah Thai yang ikut terbuka di gelombang ini

`tests/th-ui-leak-test.js` mendeteksi lewat daftar kata (`ID_WORDS`). Daftar itu diperlebar
di m025-314 karena audit menunjukkan ia melewatkan setiap kalimat yang ditemukan. Pelebaran
itu menerangi **35 kalimat Indonesia lain** yang sudah lama ada — sebagian besar naskah yang
dibaca MURID tiap sesi (umpan balik tutor, transisi sesi, nama prasasti, kartu KelasKu).

Semuanya dinyatakan terbuka sebagai anggaran bertanggal di gerbang itu dan didaftar penuh di
§C3 laporan audit. **Turunkan angkanya saat utangnya dibayar; jangan mempersempit daftar
katanya kembali** — itu mengembalikan kebutaan yang baru saja diperbaiki, dan kesalahan itu
sudah pernah dilakukan sekali (m025-283, tercatat di kepala berkas gerbang itu).

Satu di antaranya salah dua kali dan perlu disebut sendiri:
`features/tutor-classroom/fiezel-tutor-v3.js:175` adalah kalimat AJAR untuk murid
("subjek, have atau has, lalu bentuk ketiga kata kerja") — berbahasa Indonesia, dan isinya
tata bahasa Inggris yang disajikan tanpa memeriksa bahasa target.

---

## Cara memverifikasi keadaan sekarang

```
node tests/target-lang-surface-guard-test.js
node tests/target-lang-progress-isolation-test.js
node tests/japanese-surface-honesty-test.js
node tests/target-language-axis-test.js
node tests/th-ui-leak-test.js
node tests/th-coverage-test.js
node tests/id-golden-snapshot-test.js
```
