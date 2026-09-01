# Kemurnian bahasa bank soal Thai — status & handoff

Dokumen ini adalah kontrak serah-terima. Siapa pun (manusia atau agen) yang melanjutkan
pekerjaan ini cukup membaca berkas ini, menjalankan satu gerbang, dan meneruskan dari angka
yang dilaporkannya.

## Masalah yang sedang diperbaiki

Murid yang memilih bahasa Thai membaca **bahasa Indonesia** sepanjang sesi belajar. Gerbang
lama `th-coverage-test.js` hijau 143/143 dan tetap tidak melihatnya, karena empat permukaan
yang dihitungnya (copy-map, naskah brain, `grammar-explanations-th`, `vocabulary-th`) bukan
permukaan tempat **soal** berada. Bank soal punya jalur hidrasi sendiri yang tidak pernah
lewat copy-map, jadi tidak ada pemeriksaan yang melihatnya.

Ada dua cacat berbeda, keduanya sudah pernah sampai ke rilis:

1. **Lubang** — string Indonesia sampai ke layar murid th karena sidecar th-nya memang tidak
   ada. Seluruh reading A1/A2, seluruh umpan balik cloze, dan seluruh diagnosis miskonsepsi
   masuk kategori ini.
2. **Kolase** — sidecar th-nya ADA tetapi isinya campuran, hasil generator kata-per-kata:
   `"เขา ไม่ punya pena"` (Thai+Indonesia satu kalimat) dan `"รถบัส นั้น สาย นานเท่าใด?"`
   (Thai kata-per-kata bersepasi, yang bukan cara aksara Thai ditulis). Keduanya terbaca
   sebagai omong kosong bagi penutur Thai tetapi lolos pemeriksaan "apakah ada aksara Thai".

## Gerbang: `th-bank-purity-test.js`

```
node th-bank-purity-test.js
```

Ia menghitung tujuh permukaan bank soal terhadap sumbernya masing-masing dan MERAH pada
lubang pertama. Angka PASS-nya adalah ukuran kemajuan pekerjaan ini.

Detektornya ada di `th-purity-lexicon.js` dan **bukan** daftar kata fungsi. Percobaan pertama
memakai daftar kata fungsi (yang, dan, untuk, tidak…) dan ternyata buta pada frasa pendek yang
justru mendominasi bank soal: `"Tangannya kedinginan"`, `"Sebuah kuas"`, `"Dibawa temannya"` —
tidak satu pun memuat kata fungsi, semuanya Indonesia tulen; 580 dari 1.600 opsi A1/A2 lolos
secara keliru. Penggantinya membangun **leksikon dari korpus repo sendiri**: bidang yang
kontraknya Indonesia vs bidang yang kontraknya Inggris sudah terlabeli oleh struktur repo,
jadi himpunan "kata yang hanya muncul di korpus Indonesia" bisa dihitung. Kata yang muncul di
kedua korpus (data, film, ide, radio) ambigu dan sengaja dibiarkan lolos — gerbang ini harus
bebas positif palsu, karena satu tuduhan keliru membuat orang mematikannya.

Aturan level yang dipakai gerbang: **B1 ke atas boleh berbahasa Inggris.** Bank reading dan
listening memakai perancah bahasa ibu HANYA di A1/A2; mulai B1 pertanyaan dan pilihannya
memang Inggris — itu imersi yang disengaja, sama untuk murid id maupun th, jadi bukan lubang.
Mode `paraphrase` juga dikecualikan: pilihan Inggris memang objek ujinya. Yang tidak pernah sah
di level mana pun adalah bahasa Indonesia.

## Sudah selesai

- **`th-bank-purity-test.js`** — gerbang tujuh permukaan. Sudah masuk daftar CI di
  `.github/workflows/quality.yml`, tepat setelah `th-coverage-test.js`.
- **`th-purity-lexicon.js`** — detektor leksikon + detektor Thai kata-per-kata, dipakai bersama
  oleh gerbang dan alat perbaikan.
- **`features/i18n/listening-bank-th.json`** — 1.407 butir, **BERSIH**. 884 bidang diperbaiki
  (268 di antaranya membawa Indonesia, sisanya Thai kata-per-kata). Sumber terjemahannya adalah
  peta kalimat-utuh tulisan tangan di `tools/th-strings/listening-{questions,options}.json`
  (123 pertanyaan + 1.068 pilihan), dijalankan oleh `tools/repair-th-listening-bank.js`.

## Sisa pekerjaan — 5.346 string unik

Jalankan gerbang untuk angka terkini. Per commit ini:

| bucket | string unik | sidecar tujuan |
|---|---|---|
| `reading.option` | 1.866 | `features/i18n/reading-bank-th.json` |
| `reading.stem` | 491 | idem |
| `reading.why` | 60 | idem |
| `cloze.feedback` | 1.224 | `features/i18n/cloze-bank-th.json` |
| `cloze.explain` | 724 | idem |
| `misconception.diagnosis` | 644 | `features/i18n/misconception-th.json` |
| `misconception.taxonomy` | 97 | idem |
| `readingexam.explain` | 191 | `features/i18n/reading-exam-th.json` (perluas) |
| `writing.prompt` | 88 | `features/i18n/writing-prompts-th.json` (perluas) |
| `writing.rubric` | 35 | idem |
| `writing.examtask` | 6 | idem |
| `readingexam.format` | 2 | idem |

Ketiga sidecar baru sudah ada sebagai **stub kosong** dengan bentuk yang diharapkan gerbang;
isi `items` / `diagnoses` / `codes`-nya yang masih kosong.

## Cara meneruskan

Pola yang sudah terbukti di listening, ulangi apa adanya:

1. **Kumpulkan string sumber** yang masih ditandai gerbang (lihat `periksaPermukaan` di
   `th-bank-purity-test.js` untuk bidang mana yang dihitung per permukaan).
2. **Terjemahkan sebagai kalimat utuh** ke dalam peta `{indonesia: thai}` di
   `tools/th-strings/<bank>-<bidang>.json`. **JANGAN membangun peta kata-per-kata** — persis
   itulah yang melahirkan kolase yang sedang kita bersihkan. Satu entri = satu kalimat penuh.
3. **Tulis generator** `tools/generate-th-<bank>.js` yang merakit sidecar dari peta itu, dengan
   pola `tools/repair-th-listening-bank.js`: idempoten, dan **gagal keras** (`process.exit(1)`)
   sambil mencetak daftar string yang belum terpeta, bukan diam-diam melewatkannya.
4. **Jalankan gerbang** sampai permukaan itu hijau.
5. **Sambungkan ke runtime** (lihat di bawah) — sidecar yang tidak dibaca aplikasi tidak
   memperbaiki apa pun bagi murid.

### Catatan per bank

- **reading** — `makeReadingQuestion()` di `app.js` (~baris 7830). Perhatikan baris
  `if(originalText&&!stem.includes('“'))stem=originalText;`: pertanyaan mentah bank
  **menimpa** stem yang sudah dilokalkan, jadi overlay th harus masuk SEBELUM titik itu.
  Jumlah pilihan wajib sama persis — gerbang memeriksanya, karena satu pilihan hilang membuat
  kunci jawaban bergeser diam-diam.
- **cloze** — dua kunci: `explain.{why,rule,memory,avoid}` per butir, dan `distractors` yang
  dikunci oleh **teks pilihan persis** (meleset satu byte = umpan balik tak pernah ditemukan
  runtime; pola bug lama m025-129). Dirender ke murid di `app.js` ~8703 dan ~3541.
- **misconception** — `grammar-misconception-id.json` dimuat oleh `loadMisconceptionDiagnoses()`
  (`app.js` ~477). Kuncinya berbahasa Inggris, **nilainya** yang Indonesia.
- **reading-exam / writing** — sidecar-nya sudah ada tetapi baru menutup `honesty`, `formats`,
  dan `rubric`. Yang bolong: penjelasan tiap soal (`why`, `whyOthersFail`) dan prompt menulis
  (`id_hint`, `focus`, `examTasks`).

## Penyambungan runtime (belum dikerjakan)

Setelah sidecar terisi, ketiganya masih harus disambungkan — tanpa langkah ini gerbang hijau
tetapi murid tidak melihat perubahan apa pun:

1. `features/i18n/fiezel-th-loader.js` — tambah fetch untuk `reading-bank-th.json`,
   `cloze-bank-th.json`, `misconception-th.json` ke `fetchDatasets()`.
2. `app.js` — overlay di `applyContentLocale()` (pola `grammarItemForTh` / `vocabForLocale`),
   plus titik sisip di `makeReadingQuestion()` dan jalur cloze.
3. `features/i18n/locale-assets-th.json` — daftarkan path barunya (koordinasi
   `impl/handoff/W1-SW.md`, karena pencocok `isLocale` di `sw.js` terikat daftar ini).
4. **Ritual bump versi** — `core-config.js` `FIEZEL_PAGE_BUILD`, `fiezel-diag-panel.js`
   `DIAG_BUILD`, `sw.js` `SW_REV` dinaikkan **bertiga**, +1 dari `m025-N` saat ini
   (`install-health-test.js` / `pwa-release-coherence-test.js` menegakkannya).

## Sebelum menyebut selesai

Jalankan daftar tes di `.github/workflows/quality.yml` sampai hijau. Kegagalan lama yang tidak
berhubungan (tes hash-lock `vendor/kokoro-js/kokoro.web.js`, yang merah bahkan di `main` bersih
pada lingkungan ini) tidak memblokir — pastikan dulu lewat
`git diff main -- <path>` bahwa berkasnya memang tidak tersentuh.
