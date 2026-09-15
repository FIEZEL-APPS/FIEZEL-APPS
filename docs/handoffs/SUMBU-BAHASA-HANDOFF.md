# Sumbu bahasa FIEZEL — handoff m025-314

**Otoritas: OWNER.** Dokumen ini melaporkan apa yang SUDAH dikerjakan di m025-314 dan
menyerahkan daftar yang BELUM, lengkap dengan alasan kenapa sisanya tidak dikerjakan
sekaligus. Ia bukan laporan "selesai".

Pemicu: laporan OWNER 14 September 2026 — *"masih banyak bug dan konten yang tidak sesuai,
seperti i18n Thai, UI DAN UX Bahasa Jepang masih memuat konten bahasa Inggris, seharusnya
tampilan UI dan UX-nya ikut berubah."*

Audit lengkap beserta nomor baris: `reports/AUDIT-UI-UX-BAHASA-2026-09-14.md` (16 temuan).

---

## Status

**Sebagian.** 7 dari 16 temuan diperbaiki di m025-314. Sembilan sisanya dicatat terbuka,
dan **satu di antaranya P0** — lihat "Langkah berikutnya" di bawah. Kursus Jepang hari ini
sudah tidak lagi menawarkan permukaan berbahasa Inggris dan tutor AI-nya sudah menyebut
kursus yang benar, tetapi **progresnya masih dipakai bersama dengan kursus Inggris.**

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

## Langkah berikutnya — berurutan, yang pertama P0

### 1. (P0) Pisahkan progres per bahasa — `sideStateKey()`

`features/brain/fiezel-target-language.js` sudah ada, murni, dan diuji 10/10 hijau.
**Tetapi `app.js` tidak pernah memanggilnya untuk membentuk satu pun kunci penyimpanan.**

```js
// app.js — hari ini
function sideStateKey(base){return activeAccountUuid?base+':'+activeAccountUuid:base}
```

Akibatnya BKT, matriks konfusi, ledger miskonsepsi, kalibrasi item, jadwal ingatan, dan
state murid utama **dipakai bersama** kursus Inggris dan Jepang.
`tests/target-language-axis-test.js` tidak menangkapnya karena ia menguji MODULNYA, bukan
pemakaiannya.

Yang membuatnya P0: pemilih bahasa menjanjikan kepada murid *"Progres tiap bahasa berdiri
sendiri. Berganti tidak menghapus apa pun."* (`bahasa.penjelasan`). Paruh keduanya benar;
paruh pertamanya belum.

Arah yang disarankan: `sideStateKey()` memanggil
`FiezelTargetLanguage.key(base, activeTargetLang())`. Kunci Inggris tetap identik byte per
byte — itu janji inti modulnya — jadi murid Inggris yang sudah ada tidak membayar apa pun.
Butuh PR sendiri: menyentuh setiap pembaca state, dan perlu gerbang yang menguji PEMAKAIAN,
bukan modulnya lagi.

### 2. (P1) Jepit level ke cakupan bank yang aktif

`getActiveLevel()` juga tidak bersumbu bahasa. Cakupan bank Jepang hari ini:

| Bank | A1 | A2 | B1+ |
|---|---|---|---|
| tata bahasa | 242 | 180 | 0 |
| menulis | 24 | 30 | 0 |

Murid B1 di kursus Inggris yang mencoba Jepang menemukan Grammar dan Writing **kosong**,
tanpa satu kalimat penjelasan. Turunan langsung dari butir 1.

### 3. (P1) Bank cloze dan set ujian membaca ikut bersumbu bahasa

`ensureClozeBank()` selalu menarik `cloze-bank-v1.json` (kalimat Inggris), dan
`clozeSkillReady()` hanya menanyakan penguasaan BKT — pada state BKT yang dibagi bersama
(butir 1). `READING_EXAM` (delapan teks IELTS/TOEFL berbahasa Inggris) dimuat dan
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
node tests/japanese-surface-honesty-test.js
node tests/target-language-axis-test.js
node tests/th-ui-leak-test.js
node tests/th-coverage-test.js
node tests/id-golden-snapshot-test.js
```
