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

## Belum dikerjakan

R3–R8 (lihat dokumen strategi). Pemetaan TP ke Capaian Pembelajaran Fase D resmi belum
ada: TP saat ini = keterampilan yang dilatih kelas.
