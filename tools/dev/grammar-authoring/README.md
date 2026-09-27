# Penyusun soal grammar (m025-377)

Alat untuk menulis kalimat latihan grammar baru per lesson, lengkap dengan jawaban, alasan per pilihan,
aturan, dan terjemahan Thai, lalu memeriksanya sebelum masuk bank. Hasilnya adalah paket
`tools/grammar-upgrade/new-templates-<g|h|i>.json` yang dipasang oleh `tools/apply-grammar-upgrade.js`.

Sumber soal ada di `sources/` (satu berkas per kelompok lesson). Yang diedit adalah sumbernya, bukan
paket JSON-nya: paket selalu dibangun ulang dari sumber.

| Paket | Sumber | Isi |
| --- | --- | --- |
| g | `sources/a1_part1.py` … `a1_part3.py` | A1 lesson 1–17, A1-301..368 (4 kalimat per lesson) |
| h | `sources/a2_part1.py`, `a2_part2.py` | A2 lesson 18–31, A2-301..356 (4 kalimat per lesson) |

## Alur kerja

```bash
# 1. bangun + periksa (keluar dengan kode 1 kalau ada error; paket hanya ditulis kalau 0 error)
python3 tools/dev/grammar-authoring/build_pack.py tools/grammar-upgrade/new-templates-h.json \
  tools/dev/grammar-authoring/sources/a2_part1.py tools/dev/grammar-authoring/sources/a2_part2.py
#    REUSED=1 di depan perintah menampilkan label lama yang dipakai ulang beserta teks diagnosisnya.
#    Periksa semua sumber sekaligus (keunikan teks label lintas paket) dengan target /dev/null.

# 2. label baru butuh kode taksonomi: tambahkan ke TAX di taxonomy_map.py, lalu
python3 tools/dev/grammar-authoring/taxonomy_map.py tools/build-misconception-taxonomy.js

# 3. pipa resmi
node tools/apply-grammar-upgrade.js
node tools/sync-grammar-explanations-id.js --write
node tools/build-misconception-taxonomy.js --write
node tools/generate-th-misconception.js
node audit/merge-grammar-id.js
node tools/build-cloze-bank.js --write
node tools/generate-th-cloze.js
node tests/id-golden-snapshot-test.js --write-baseline
```

Pembangun membaca bank dari repo, tetapi membuang dulu isi paket g/h/i yang sudah terpasang, jadi
bisa dijalankan ulang kapan saja dan hasilnya byte-identik.

## Format sumber

```python
LESSONS = {subskill: dict(obj=(en, id, th), mis=(en, id, th), rule=(en, id, th), avoid=(en, id, th))}
ITEMS = [dict(s=subskill, id="A2-3xx", stem="… ___ …", opts=[4 opsi], ans="…",
              why=(en, id, th), others=(en, id, th), cue=(en, id, th),
              rsn=("langkah -> langkah -> langkah", "… → …", "… → …"),
              d=[(opsi_salah, LABEL, whyFails_en, whyFails_id, whyFails_th), …])]
```

`LABEL` bisa berupa:
- nama label lama (string) — teks diagnosis bersama dipakai apa adanya;
- `L(nama_label_lama, teks_id_soal_ini, teks_th_soal_ini)` — label lama dengan teks khusus soal ini;
- `(nama_baru, teks_id, teks_th)` — label baru (teks id/th menjadi diagnosis bersama);
- `N(label_baru, teks_id_soal_ini, teks_th_soal_ini)` — label baru dengan teks khusus soal ini.

## Yang diperiksa pembangun

Setiap aturan di bawah lahir dari kesalahan nyata yang ditemukan saat soal-soal ini dimainkan sebagai murid.

- Stem: tepat satu `___`, ≤ 11 kata (A1) / ≤ 14 kata (A2), tidak sama dengan stem bank.
- Opsi: 4 unik, dan tetap unik setelah tanda baca/apostrof dibuang (cara audit membandingkan).
- Pengecoh dipetakan tepat ke 3 opsi salah; satu templat tidak boleh memakai label yang sama dua kali.
- Alasan opsi salah (`whyFails`) harus berupa predikat, karena panel menampilkannya sebagai
  “opsi” + alasan; tidak boleh menyebut kunci (mode "kenapa benar" membuangnya); bila Thai < 50%
  huruf Thai, panel Thai jatuh ke kalimat umum.
- `whyCorrect` tidak boleh berakhir dengan “: jawaban” (kartu "Yang benar “X”: …" jadi dobel).
- Langkah penalaran: ≥ 2 langkah, tiap langkah diawali kata kerja kamus, jumlah langkah en/id/th sama,
  dan langkah terakhir tidak menyebut jawabannya (tuntunan tampil sebelum murid memilih lagi).
- Teks Indonesia: ≤ 170 karakter (objective ≤ 240), tanpa istilah teknis (nomina, klausa, partisip,
  miskonsepsi, …), tanpa kutip lurus, dan lolos filter `tutorIndonesian` di app.js.
- Teks label baru: huruf kecil di awal, bertitik, 25–240 karakter, unik, tanpa kata penanda Inggris di
  luar kutip tunggal (aturan `tests/misconception-diagnosis-test.js`).
- Thai: ≥ 30% huruf Thai (peringatan di bawah 50%), dua kutipan Inggris tidak boleh berdempetan tanpa
  kata penyambung, dan lolos `residuIndonesia` / `thaiKataPerKata` dari `th-purity-lexicon.js`.
