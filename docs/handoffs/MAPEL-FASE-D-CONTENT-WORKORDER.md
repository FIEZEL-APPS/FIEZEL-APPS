# WORK ORDER — Konten Mapel Fase D: Matematika, IPA, Bahasa Inggris (kelas 7–9)

**Untuk:** agen AI pelaksana · **Repo:** `FIEZEL-APPS/FIEZEL-APPS` · **Wewenang:** OWNER
**Status:** belum dikerjakan · **Basis ukur:** `m025-339`

> Prompt ini ditulis setelah mengukur langsung kode produksinya. Setiap angka di bawah
> berasal dari menjalankan fungsi aslinya, bukan dari membaca dokumentasi. Verifikasi ulang
> sebelum mulai — kalau angkanya sudah berubah, laporkan dan sesuaikan, jangan diam-diam
> memakai angka lama.

---

## 1. Misi

Isi materi **tiga mata pelajaran** untuk **SMP kelas 7, 8, dan 9 (Fase D)** sampai layak
dipakai guru sungguhan di kelas:

| Mapel | ID | Cakupan |
|---|---|---|
| Matematika | `MAT` | kelas 7, 8, 9 |
| Ilmu Pengetahuan Alam | `IPA` | kelas 7, 8, 9 |
| Bahasa Inggris | `ENG` | kelas 7, 8, 9 |

**Hanya tiga mapel ini. Hanya kelas 7–9.** Empat belas mapel lain dan semua jenjang SD/SMA
**di luar lingkup** — jangan disentuh, jangan "sekalian", jangan dirapikan.

---

## 2. Kondisi sekarang — ukur ulang dulu, ini hasil ukuran saya

Jalankan ini persis untuk memverifikasi titik awalmu:

```bash
node -e "
global.window=global;global.self=global;
global.document={addEventListener(){},body:{classList:{add(){},remove(){}}}};
global.localStorage={getItem(){return null},setItem(){},removeItem(){}};
global.sessionStorage=global.localStorage;global.location={hostname:'localhost',search:''};
require('./features/teacher/fiezel-teacher-shell.js');
const S=global.FiezelTeacherShell;
for(const id of ['MAT','IPA','ENG']){
  const q=S._synthesizeMapelQuestions(id,'K','T',20);
  console.log(id, '-> soal unik:', new Set(q.map(x=>x.prompt)).size);
}
const a=new Set(S._synthesizeMapelQuestions('MAT','KOMP-MAT-D-7-BIL-01','Bilangan Bulat',20).map(x=>x.prompt));
const b=new Set(S._synthesizeMapelQuestions('MAT','KOMP-MAT-D-9-STA-01','Statistika',20).map(x=>x.prompt));
console.log('irisan kompetensi berbeda:', [...a].filter(x=>b.has(x)).length, 'dari', a.size);
"
```

Hasil per `m025-339`:

```
MAT -> soal unik: 15
IPA -> soal unik: 15
ENG -> soal unik: 15
irisan kompetensi berbeda: 15 dari 15      <- INI CACATNYA
```

Kompetensi yang terdaftar hari ini (`MAPEL_CATALOG`, `features/teacher/fiezel-teacher-shell.js:124`):

| Mapel | Kompetensi ada | Masalahnya |
|---|---|---|
| `MAT` | 4 (kelas 7×1, 8×2, 9×1) | kelas 7 dan 9 masing-masing cuma 1 |
| `IPA` | 3 (kelas 7, 8, 9) | 1 per kelas |
| `ENG` | 3 — tapi satu di antaranya `KOMP-ENG-E-10-EXP-01` | **kelas 10, Fase E — bukan SMP** |

---

## 3. Tiga cacat yang WAJIB ditutup (bukan opsional)

### Cacat 1 — kompetensi dan kelas diabaikan total

`synthesizeMapelQuestions()` (`features/teacher/fiezel-teacher-shell.js:439`) memilih kolam
soal begini:

```js
var baseList = templates[subjectId] || templates.MAT || [];
```

`compCode` dan `compTitle` **tidak pernah menyaring apa pun** — keduanya hanya dipakai
sebagai metadata (`skill`, `context`). Akibatnya guru Matematika kelas 9 yang menerbitkan
"Statistika & Peluang" mengirim soal operasi bilangan bulat kelas 7 ke muridnya.

**Yang harus jadi:** penyaringan berjenjang `mapel → kelas → kompetensi`. Dan yang paling
penting:

> **Saringan yang menghabiskan kolam WAJIB mengembalikan kosong, bukan diisi ulang
> diam-diam dari kolam mapel.**

Ini bukan selera. Penambalan senyap persis itulah cacat nomor satu yang sudah ditutup untuk
jalur Bahasa Inggris di [`KURIKULUM-SEKOLAH-HANDOFF.md`](KURIKULUM-SEKOLAH-HANDOFF.md)
lewat `curriculumOnly`. Jalur 17-mapel mengulanginya. Guru lebih baik melihat "3 soal" yang
jujur daripada 8 soal yang setengahnya mengajarkan bab yang salah.

### Cacat 2 — seluruh naskah soal MONOLINGUAL dan tidak ada gerbang yang melihatnya

Ini yang paling mudah terlewat, jadi baca pelan.

`prompt`, `options`, dan `why` pada semua template ditulis **langsung sebagai literal
Indonesia di dalam `.js`** — nol i18n. Selain itu, 206 kunci `mapel_*` di `MAPEL_CATALOG`
dipanggil lewat `t()` tetapi **nol** yang terdaftar di bank copy:

```bash
grep -o "t('mapel_[a-z0-9_]*'" features/teacher/fiezel-teacher-shell.js | sort -u | wc -l   # 206
grep -rc "'mapel_" features/i18n/ | grep -v ':0' | wc -l                                    # 0
```

Kenapa `i18n-kunci-hantu-test` tetap hijau? Karena gerbangnya **melewati kunci tanpa titik**:

```js
// tests/i18n-kunci-hantu-test.js:76
if (!/^[a-z0-9][a-z0-9_.-]*\.[a-z0-9]/i.test(k)) continue;   // bukan bentuk kunci
```

`mapel_mat_c1_name` memakai garis bawah, bukan titik → tidak pernah diperiksa. **Gerbang
hijau di sini bukan bukti kebenaran; ia bukti gerbangnya tidak melihat.** Jangan bersandar
padanya, dan jangan menambah utang baru lewat celah yang sama.

FIEZEL punya murid Thai. Aturan repo di `CLAUDE.md` mutlak: *setiap teks yang dilihat
pengguna lahir DUA BAHASA.* Soal yang kamu tulis dilihat murid.

### Cacat 3 — pembahasan tidak boleh menyebut posisi pilihan

Seluruh template sekarang `answer: 0` dan diacak saat terbit oleh `shuffleOptions()`
(`features/teacher/fiezel-teacher-shell.js:420`). Fungsi itu memindahkan pembahasan
mengikuti jawaban ke posisi barunya, jadi pengacakannya benar — **tetapi pembahasan yang
berbunyi "pilihan pertama adalah yang benar" akan berbohong 3 dari 4 kali.**

Setiap `why` yang kamu tulis **wajib menjelaskan konsepnya**, bukan letaknya. Contoh yang
benar sudah ada di repo: `'Luas segitiga = ½ × alas × tinggi = ½ × 14 × 8 = 56 cm².'`

---

## 4. Keputusan arsitektur — konten pindah ke JSON, JANGAN ditambah ke .js

`features/teacher/fiezel-teacher-shell.js` sudah **3.369 baris**. Menambahkan ~324 soal
sebagai literal JS ke dalamnya akan membuatnya tak terpelihara, dan menyembunyikan seluruh
naskah dari setiap gerbang bahasa yang dimiliki repo ini.

**Yang dikerjakan:**

```
content/mapel/
  mapel-mat-d.json          <- Matematika Fase D (kelas 7,8,9), naskah Indonesia
  mapel-mat-d-th.json       <- sidecar Thai, kunci sama persis
  mapel-ipa-d.json
  mapel-ipa-d-th.json
  mapel-eng-d.json
  mapel-eng-d-th.json
```

Pola sidecar `-th.json` ini **bukan karangan** — ia pola yang sudah dipakai kursus Jepang
(`content/ja/`) dan sudah punya gerbang sensusnya sendiri
(`tests/japanese-th-parity-test.js`). Tiru polanya, termasuk gagasan sensus bertanggal.

### Bentuk berkas

```jsonc
{
  "schema": "fiezel-mapel-bank-v1",
  "subjectId": "MAT",
  "phase": "fase_d",
  "competencies": [
    {
      "code": "KOMP-MAT-D-7-BIL-01",
      "grade": 7,
      "semester": 1,
      "name": "Operasi Hitung Bilangan Bulat & Pecahan",
      "materi": "Penjumlahan, pengurangan, perkalian, pembagian bilangan rasional dan estimasi",
      "cpRef": "<rujukan Capaian Pembelajaran Fase D resmi>",
      "items": [
        {
          "id": "mat-d7-bil-001",
          "prompt": "…",
          "options": ["…", "…", "…", "…"],
          "answer": 0,
          "why": { "0": "<penjelasan KONSEP, tanpa menyebut posisi pilihan>" },
          "distractorWhy": {
            "1": "<miskonsepsi apa yang membuat murid memilih ini>",
            "2": "…",
            "3": "…"
          },
          "difficulty": "dasar | sedang | tinggi"
        }
      ]
    }
  ]
}
```

`answer: 0` tetap dipertahankan di berkas sumber (pengacakan terjadi saat terbit). Sidecar
Thai memakai **`code` dan `id` yang sama persis**, hanya menerjemahkan `name`, `materi`,
`prompt`, `options`, `why`, `distractorWhy`.

---

## 5. Spesifikasi konten

### Volume minimum

| Satuan | Jumlah |
|---|---|
| Kompetensi per kelas per mapel | **3** |
| Total kompetensi | 3 mapel × 3 kelas × 3 = **27** |
| Soal per kompetensi | **minimal 12** |
| **Total soal minimum** | **324** (× 2 bahasa) |

Kenapa 12: pilihan jumlah soal di UI guru mencapai 10. Dengan 12, tugas 10-soal tidak
mengulang dan masih ada rotasi antar-tugas. Di bawah itu, guru yang menerbitkan dua tugas
untuk kompetensi yang sama mengirim soal yang persis sama dua kali.

### Kompetensi: turunkan dari CP resmi, jangan dikarang

Ambil dari **Capaian Pembelajaran Fase D Kurikulum Merdeka** (Kepmendikbudristek tentang CP).
Setiap kompetensi mencantumkan `cpRef` yang bisa ditelusuri. Kalau sebuah rujukan tidak bisa
kamu pastikan, **tulis apa adanya sebagai catatan, jangan dikarang** — kurikulum palsu jauh
lebih merusak daripada kurikulum yang jujur mengaku belum lengkap.

Format kode mengikuti yang sudah ada: `KOMP-<MAPEL>-D-<kelas>-<TOPIK>-<NN>`
(contoh `KOMP-IPA-D-8-SEL-01`).

`KOMP-ENG-E-10-EXP-01` yang sekarang nyasar di katalog ENG **dikeluarkan dari lingkup SMP**
— ia Fase E kelas 10. Jangan dihapus dari repo tanpa alasan; cukup jangan dipakai sebagai
kompetensi Fase D.

### Mutu tiap butir soal

1. **Empat pilihan, tepat satu benar.** Tidak ada "semua benar" / "tidak ada yang benar".
2. **Pengecoh harus memuat miskonsepsi bernama**, bukan angka acak. Tiap pengecoh dijelaskan
   di `distractorWhy`: kesalahan berpikir apa yang membuat murid memilihnya. Ini bukan
   hiasan — Braincore FIEZEL memakai peta miskonsepsi untuk mendiagnosis, dan pengecoh acak
   membuat diagnosisnya jadi derau.
3. **Konteks Indonesia** bila relevan (rupiah, nama orang Indonesia, geografi Nusantara),
   sebagaimana bank yang sudah ada.
4. **`why` menjelaskan konsep dan langkah**, tidak menyebut posisi pilihan (lihat Cacat 3).
5. **Sebaran kesulitan** per kompetensi kira-kira 4 dasar / 5 sedang / 3 tinggi.
6. **Bahasa Inggris (`ENG`):** batang soal boleh berbahasa Inggris (itu materinya), tetapi
   `why` dan `distractorWhy` **berbahasa Indonesia** di berkas id — itu penjelasan untuk
   murid Indonesia, bukan bagian ujiannya. Sidecar Thai menerjemahkan penjelasannya ke Thai.

### Terjemahan Thai

Ber-aksara Thai sungguhan, bukan transliterasi, bukan Indonesia yang disalin. Kalau sebuah
butir belum bisa diterjemahkan, **catat sebagai utang bertanggal** dan sebutkan di laporan —
jangan diam-diam mengirim butir tanpa Thai. Polanya ada di `UTANG_TANPA_TH` /
`UTANG_KUNCI` (`tests/th-coverage-test.js`) dan di `SENSUS` (`tests/japanese-th-parity-test.js`).

---

## 6. Kontrak yang TIDAK BOLEH pecah

Diuji `tests/kelasku-17mapel-assignment-test.js`. Memecahkannya = merah.

| Kontrak | Nilai |
|---|---|
| `_MAPEL_LIST.length` | tepat **17** — jangan menghapus 14 mapel lain |
| Nama fungsi | `synthesizeMapelQuestions` tetap ada dan tetap diekspor sebagai `_synthesizeMapelQuestions` |
| Ekspor | `_MAPEL_LIST`, `_MAPEL_CATALOG` tetap ada |
| Minta 5 soal | mengembalikan **tepat 5** untuk mapel yang punya isi |
| Penanda UI | `data-tg="assign-tab" data-tab="mapel"`, `data-tg="create-assign-from-comp"`, `data-mode="ujian"`, `srcType === 'mapel'`, `mapelName(k)` tetap ada |
| Normalisasi | `skill` murid tetap lowercase (`'ipa'`, bukan `'IPA'`) |
| 14 mapel lain | tetap berjalan seperti sekarang — pemuatan bank JSON **fail-quiet**: bank absen ⇒ perilaku lama, bukan lemparan |

**Catatan penting soal "tepat 5":** setelah penyaringan kompetensi berlaku, sebuah
kompetensi dengan 12 soal tetap bisa melayani permintaan 5. Yang berubah hanyalah permintaan
yang melampaui isi kompetensi — dan itu harus dipotong jujur, bukan ditambal. Pastikan uji
yang sudah ada tetap hijau; kalau kontraknya perlu diperjelas, tambah assert baru, jangan
melonggarkan yang lama.

---

## 7. Aturan repo yang mengikat (dari `CLAUDE.md`)

1. **Cabang fitur per perubahan.** Jangan commit ke `main` langsung. Buat PR.
2. **Jangan pernah mengetik nomor build dengan tangan.** Pakai
   `node tools/bump-build.mjs "<alasan>"`. Ia menaikkan `core-config.js`
   (`FIEZEL_PAGE_BUILD`), `sw.js` (`SW_REV`), `features/neural-voice/fiezel-diag-panel.js`
   (`DIAG_BUILD`), rujukan `?v=` di `kurikulum.html` + `misi.html`, dan
   `coordination/BUILD-VERSION.json` — bersama-sama. `main` bergerak cepat: kalau
   `build-number-uniqueness-test` merah karena nomormu sudah diklaim, **merge `origin/main`
   lalu jalankan tool-nya lagi**, jangan menambal angkanya.
3. **Bank JSON baru wajib masuk precache `sw.js`** kalau dimuat saat runtime, dan revisi SW
   ikut naik. Tanpa itu murid yang sudah memasang PWA tidak pernah menerima berkas barunya.
4. **Regenerasi `id-golden-baseline.json`** di commit yang sama bila literal Indonesia di
   berkas terkunci berubah: `node tests/id-golden-snapshot-test.js --write-baseline`.
5. **Jangan commit churn `reports/*.json`** hasil menjalankan tes — `git restore reports/`
   sebelum commit.
6. **Gerbang baru wajib terdaftar** di `.github/workflows/quality.yml`, atau
   `gate-registry-test` merah.

---

## 8. Gerbang & bukti

### Uji baru yang wajib kamu tulis

`tests/mapel-fase-d-content-test.js`, didaftarkan di `quality.yml`. Minimal harus
membuktikan:

1. Tiap mapel (`MAT`, `IPA`, `ENG`) punya **≥3 kompetensi per kelas 7, 8, 9**.
2. Tiap kompetensi punya **≥12 butir**.
3. **Kompetensi berbeda menghasilkan kolam berbeda** — assert irisan, persis kebalikan dari
   cacat yang ada sekarang.
4. **Kelas berbeda menghasilkan kolam berbeda.**
5. **Saringan yang menghabiskan kolam mengembalikan KOSONG**, bukan diisi dari kolam mapel.
6. Tiap butir: 4 pilihan, `answer` menunjuk indeks sah, `why` ada untuk jawaban benar.
7. **Tidak ada `why` yang menyebut posisi** — cari pola seperti `pilihan pertama`,
   `opsi A`, `ตัวเลือกแรก`; assert nol.
8. **Paritas sidecar Thai**: tiap `code` dan `id` di berkas id punya kembaran di `-th.json`,
   nilai Thai ber-aksara Thai, dan `{placeholder}` sama persis bila ada.
9. **Fail-quiet**: bank absen ⇒ `synthesizeMapelQuestions` berperilaku seperti sekarang,
   nol lemparan.

### Disiplin merah-dulu (tidak bisa ditawar)

Untuk **setiap** assert baru: rusak kodenya dengan sengaja, buktikan assert-nya **MERAH**,
pulihkan, buktikan **HIJAU**. Assert yang tidak pernah terbukti bisa gagal bukan gerbang —
ia hiasan. **Sertakan tabel mutasi di deskripsi PR:** apa yang dirusak, assert mana yang
merah.

### Sapuan penuh

Jalankan seluruh daftar di `.github/workflows/quality.yml` sampai hijau. Kegagalan lama yang
tidak berhubungan (mis. hash-lock `vendor/kokoro-js/kokoro.web.js`) tidak memblokir — tetapi
**buktikan** dengan `git diff main -- <path>` bahwa berkasnya memang tidak kamu sentuh,
sebelum menyebutnya warisan.

> **Peringatan yang datang dari pengalaman:** gerbang hijau bukan bukti premismu benar.
> Di sesi sebelumnya `i18n-kunci-hantu-test` hijau justru **karena** kunci yang disangka
> hilang tidak pernah hilang, dan grep verifikasinya meng-`exclude` berkas tempat
> definisi aslinya berada. Sebelum menyimpulkan "X tidak terdaftar", **grep tanpa
> exclude apa pun** dan baca hasilnya utuh.

---

## 9. Definisi selesai

- [ ] 27 kompetensi (3 mapel × 3 kelas × 3), tiap satu ber-`cpRef`
- [ ] ≥324 butir soal Indonesia + sidecar Thai yang lengkap (atau utang bertanggal tertulis)
- [ ] Penyaringan `mapel → kelas → kompetensi` bekerja; kolam habis ⇒ kosong, bukan ditambal
- [ ] Nol `why` yang menyebut posisi pilihan
- [ ] `tests/mapel-fase-d-content-test.js` ada, terdaftar di `quality.yml`, tiap assert
      terbukti merah lebih dulu
- [ ] `kelasku-17mapel-assignment-test` tetap hijau; 14 mapel lain tidak berubah perilakunya
- [ ] Sapuan penuh `quality.yml` hijau
- [ ] Nomor build naik lewat `tools/bump-build.mjs`; bank baru masuk precache `sw.js`
- [ ] `reports/*.json` bersih dari churn
- [ ] PR dibuat, deskripsi memuat: angka sebelum/sesudah, tabel mutasi merah-dulu, rujukan CP,
      dan utang Thai yang tersisa

---

## 10. Yang TIDAK boleh dikerjakan

- ❌ Menyentuh 14 mapel di luar `MAT`/`IPA`/`ENG`, atau jenjang SD/SMA
- ❌ Mengurangi `_MAPEL_LIST` dari 17
- ❌ Menambah naskah murid sebagai literal di `.js` — semua naskah baru masuk JSON dwibahasa
- ❌ Memakai kunci tanpa titik untuk menghindari gerbang kunci-hantu (celah di §3 Cacat 2)
- ❌ Mengetik nomor build dengan tangan
- ❌ Melonggarkan atau menonaktifkan gerbang yang sudah ada supaya hijau
- ❌ Mengarang rujukan Capaian Pembelajaran
- ❌ Menyentuh `tests/japanese-th-parity-test.js` — ada keputusan owner yang belum diambil
      di sana, di luar lingkup work order ini
- ❌ Menaikkan lingkup "sekalian" tanpa bertanya ke owner lebih dulu

---

## 11. Laporkan apa adanya

Kalau ada bagian yang tidak selesai, **tulis bagian mana dan kenapa** — jangan dibulatkan
jadi "selesai". Kalau ada angka di dokumen ini yang ternyata sudah berubah saat kamu mulai,
**sebutkan** dan pakai angka barumu. Kalau sebuah keputusan ternyata milik owner (misalnya
menambah kompetensi di luar CP resmi), **berhenti dan tanya**, jangan diputuskan sendiri.
