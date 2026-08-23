# FIEZEL Global Learner-Level and Ordered Grammar Contract

Dokumen ini menjadi handoff untuk AI yang menerapkan perubahan pada repository
FIEZEL-APPS. Tujuannya adalah memastikan pilihan level siswa menjadi sumber konteks
tunggal di seluruh aplikasi, sementara Grammar mengajar berdasarkan urutan prasyarat.

## Kontrak produk

### 1. Level belajar aktif

Simpan pilihan siswa sebagai preferensi akun, misalnya `activeLevel`, dengan nilai
`A1`, `A2`, `B1`, `B2`, `C1`, atau `C2`. Sediakan satu resolver global. Semua panel
memanggil resolver yang sama. `state.level` hasil placement tetap menjadi bukti
diagnostik, bukan pengganti pilihan level belajar siswa.

Saat siswa memilih `A1`, konteks `A1` harus berlaku untuk:

- Grammar dan Grammar Hub;
- Vocabulary dan flashcard;
- Reading;
- Listening dan Speaking;
- Writing;
- Classroom;
- Adaptive/Core Brain;
- Tutor AI, pencarian materi, rekomendasi, dan ringkasan progress.

Tes placement adalah satu-satunya pengecualian. Tes tersebut boleh mengambil soal
lintas A1-C2 karena memang mengukur level.

### 2. Kurikulum Grammar

Gunakan satu data curriculum yang memuat sekurang-kurangnya:

```json
{
  "schema": "fiezel-grammar-curriculum-v1",
  "lessons": [
    {
      "id": "to_be",
      "level": "A1",
      "sequence": 1,
      "unit": "foundations",
      "prerequisites": []
    }
  ]
}
```

`sequence` harus unik dalam setiap level. Urutan lesson tidak boleh bergantung pada
`Object.keys`, urutan hasil fetch, atau `shuffle`. Pengacakan hanya boleh berlaku
pada posisi opsi jawaban dan variasi soal dalam lesson. Prasyarat harus menunjuk ke
lesson yang lebih awal.

Urutan fondasi A1 yang disarankan:

1. Subject pronouns dan *to be*
2. Articles, singular, plural, dan demonstratives
3. Have/has dan possessive adjectives
4. There is/There are
5. Prepositions of place
6. Present simple
7. Do/Does dan question words
8. Can/Can't
9. Present continuous
10. Was/Were
11. Past simple
12. Some/Any dan countable nouns
13. Prepositions of time
14. Review dan mastery check

Progress disimpan berdasarkan ID lesson atau skill. Mengubah level aktif hanya
mengubah filter dan konteks belajar. Progres A1 tidak boleh dihapus ketika siswa
berpindah ke A2, lalu kembali ke A1.

## Acceptance criteria

| Kode | Kriteria | Verifikasi |
|---|---|---|
| LV-01 | Active level tersimpan pada akun dan memiliki resolver tunggal | Source inspection |
| LV-02 | Semua domain menggunakan active level yang sama | Domain block inspection |
| LV-03 | Placement menjadi satu-satunya akses lintas level | Cross-level scan |
| GR-01 | Curriculum Grammar memiliki ID, level, dan sequence | JSON schema scan |
| GR-02 | Urutan per level deterministik dan prasyarat valid | Sequence/prerequisite scan |
| GR-03 | A1 memiliki sedikitnya 14 lesson fondasi | Curriculum inventory |
| GR-04 | Urutan lesson tidak diacak, opsi jawaban tetap boleh diacak | Grammar/runtime source scan |
| PR-01 | Progress domain terpisah dari active-level preference | State declaration scan |
| PR-02 | Setter level menyimpan perubahan tanpa reset progress | Setter scan |
| PR-03 | Cache/revision diinvalidasi setelah level berubah | Setter scan |

## Perintah verifikasi

Dari root repository:

```powershell
node .\level-grammar-contract-test.js
node .\grammar-curriculum-test.js
node .\classroom-test.js
node .\speaking-listening-test.js
```

Report mesin akan ditulis ke:

```text
LEVEL-GRAMMAR-CONTRACT-REPORT.json
```

Shortcut setelah dependency tersedia:

```powershell
npm run test:level-contract
```

Status `PASS` wajib dicapai sebelum merge atau deployment. Status `NOT_READY` berarti
AI penerap harus memperbaiki implementasi, bukan mengabaikan test.

Verifikasi tambahan yang direkomendasikan:

```powershell
node --check .\app.js
node --check .\level-grammar-contract-test.js
git diff --check
```

Lalu jalankan quality gate repository yang sudah ada. Jangan menghapus bank data lama,
jangan mereset progress saat migrasi, dan jangan menaruh token atau secret ke commit.

## Checklist deployment untuk AI lain

1. Periksa perubahan source dan data sebelum commit.
2. Jalankan `node level-grammar-contract-test.js` sampai `PASS`.
3. Jalankan seluruh test quality gate dan pemeriksaan syntax.
4. Pastikan service worker/cache memuat file curriculum baru bila file tersebut dipakai
   saat runtime.
5. Uji manual: pilih A1, buka setiap panel, lalu pastikan tidak ada materi A2-C2.
6. Selesaikan satu lesson A1, pindah ke A2, kembali ke A1, dan pastikan progress lesson
   tetap ada.
7. Jalankan tes placement dan pastikan hanya tes itu yang menampilkan soal lintas level.
8. Commit, push, dan buat PR setelah semua gate lulus.
