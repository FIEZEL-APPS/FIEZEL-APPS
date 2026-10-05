# Fitur Sekolah Indonesia 2026 — handoff

Wewenang: OWNER, 5 Oktober 2026. Rencana induk: `docs/STRATEGI-SEKOLAH-INDONESIA-2026.md`
(delapan rekomendasi R1–R8). Keputusan owner: **fitur ini dibangun dalam bahasa Indonesia
saja**. Naskahnya di `features/i18n/copy-id-sekolah.js`; utang th tercatat bertanggal di
`UTANG_TANPA_TH` (`tests/th-coverage-test.js`, domain `sekolah`).

## R1 — Kelas Tanpa HP (m025-478)

Masalah: HP murid dibatasi di sekolah (Jabar 2025, DKI dan SE Kemendikdasmen 2026), padahal
FIEZEL hanya bisa dipakai lewat HP murid.

| Bagian | Berkas |
|---|---|
| Inti murni: soal tugas, varian A/B, lembar cetak, nilai kertas, pemanasan | `features/teacher/fiezel-kelas-tanpa-hp.js` (`FiezelKelasTanpaHP`) |
| Tombol "Cetak lembar soal" + "Nilai kertas" di kartu tugas; modal & form nilai kertas; tombol "Mulai pemanasan 5 menit" di Mode Papan; layar pemanasan | `features/teacher/fiezel-teacher-shell.js` (`warmup`, `paperScoresModal`, `case 'print-sheet'`, `warm-*`) |
| Gaya | `features/teacher/teacher-shell.css` (blok `R1 Kelas Tanpa HP`) |
| Gerbang | `tests/kelas-tanpa-hp-test.js` |

Kontrak:
1. **Varian B berbiji dari id tugas.** Cetak ulang besok = lembar yang sama dengan hari ini;
   jangan ganti biji dengan `Date.now()`.
2. **Semua teks soal lewat `esc()`.** Soal tulisan guru adalah input bebas dan lembar dibuka
   di jendela baru milik origin yang sama.
3. **Nilai kertas tidak menimpa hasil aplikasi.** Hasil dari aplikasi membawa bukti per soal
   (`w[]`) yang dibutuhkan pemanasan dan BrainCore; satu angka dari kertas lebih miskin.
   Hasil kertas ditandai `src:'kertas'` dan boleh dikoreksi.
4. **Pemanasan tanpa nama murid** dan daftarnya dibekukan saat dibuka (`ui.warm`).

## R2 — Rapor KKTP (m025-478)

Masalah: rekap memakai "KKM 75" yang sudah tidak dipakai Kurikulum Merdeka, dan guru menulis
deskripsi capaian rapor satu per satu.

| Bagian | Berkas |
|---|---|
| Inti murni: KKTP kelas, tingkat per TP, nilai akhir, deskripsi, CSV e-Rapor | `features/teacher/fiezel-rapor-kktp.js` (`FiezelRaporKKTP`) |
| KKTP menggantikan 0.75/“KKM 75” di rekap, CSV, cetak rekap, kartu remedial; tombol & modal "Rapor KKTP" | `features/teacher/fiezel-teacher-shell.js` (`kktpKelas`, `raporKktpModal`, form `rapor-kktp`) |
| Gerbang | `tests/rapor-kktp-test.js` |

Kontrak:
1. **KKTP milik kelas** (`c.kktp`, 50–95%, bawaan 75%). Tidak ada angka ambang tertanam lagi.
2. **TP dengan < 5 jawaban tidak diberi tingkat** ("Belum cukup data"). Rapor dokumen resmi.
3. **Deskripsi memakai rumusan tujuan dari bank** (`SKILLS[k].objective`), tidak pernah kode
   keterampilan.
4. **Suntingan guru disimpan** di `c.raporEdits` dan menang atas deskripsi otomatis di CSV.
   Mengubah KKTP menyusun ulang deskripsi (suntingan lama dibuang karena tingkatnya berubah).

## R3 — Jalur Membaca TKA (m025-478)

Masalah: Bahasa Inggris di TKA SMA diuji lewat membaca (tekstual, inferensial, evaluatif),
sedangkan bank ujian membaca FIEZEL hanya 8 bacaan.

| Bagian | Berkas |
|---|---|
| 3 keterampilan (`tka_tekstual`, `tka_inferensial`, `tka_evaluatif`) + 16 bacaan × 3 = 48 soal, kunci tersebar rata 12/12/12/12 | `features/learner-flow/fiezel-review-bank.js` (`TKA_ORDER`, `TKA_ITEMS`) |
| Kartu "Latihan Membaca TKA" + peta kesiapan jujur (tanpa prediksi nilai) + sesi 6 soal | `features/learner-flow/fiezel-learner-flow.js` (`tkaMarkup`, `startTka`, `case 'start-tka'`) |
| Guru bisa menugaskan keterampilan TKA | `fiezel-teacher-store.js` (`TKA_SKILLS`), modal tugas di shell, `bankSkills()` di class hub |
| Gerbang | `tests/tka-membaca-test.js` |

Kontrak:
1. **TKA di luar `SKILL_ORDER`.** `SKILL_ORDER` menggerakkan tes diagnostik (5 soal), rencana
   harian, risiko, dan laporan murid ke guru. Memasukkan TKA ke sana mengubah semuanya untuk
   seluruh murid.
2. **Kunci tidak boleh menumpuk di satu huruf.** Soal baru ditulis lalu diacak berbiji;
   `tests/tka-membaca-test.js` T4 menjaga sebarannya.
3. **Peta kesiapan bukan prediksi.** Status hanya muncul setelah 6 soal per level; tidak ada
   angka peluang lulus.

## Gerbang Thai yang disesuaikan (keputusan owner, bertanggal)

- `tests/th-coverage-test.js`: `UTANG_TANPA_TH` + `['sekolah', { sejak: '2026-10-05' }]`.
- `tests/teacher-i18n-lazy-test.js` dan `tests/th-ui-leak-test.js`: kunci `sekolah.*` dikecualikan
  dari tuntutan th **hanya selama** entri utang di atas ada. Anggaran literal th-ui-leak naik
  untuk `fiezel-review-bank.js` (1→15, naskah soal TKA), `fiezel-teacher-shell.js` (7→8), dan
  `fiezel-rapor-kktp.js` (baru, 3: kepala kolom CSV e-Rapor).
- `tests/teacher-lazy-load-test.js`: bundel guru boleh memuat modul `features/teacher/` di antara
  kurikulum dan shell; urutan kurikulum-pertama/shell-terakhir tetap dijaga.

## Belum dikerjakan

R4–R8 (lihat dokumen strategi). Bank TKA target ≥ 60 bacaan; sekarang 16. Pemetaan TP ke Capaian Pembelajaran Fase D resmi belum
ada: TP saat ini = keterampilan yang dilatih kelas.
