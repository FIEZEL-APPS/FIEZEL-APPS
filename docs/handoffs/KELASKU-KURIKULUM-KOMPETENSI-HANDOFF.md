# KelasKu — Kurikulum & Kompetensi: perbaikan lima gelombang

Otoritas: **OWNER**. Dokumen ini adalah kontrak berjalan untuk program perbaikan yang lahir
dari audit 20 September 2026,
`reports/AUDIT-UIUX-KELASKU-KURIKULUM-KOMPETENSI-2026-09-20.md` (35 temuan, 10 usulan fitur).
Auditnya sendiri tetap menjadi sumber rinci; yang ada di sini hanya keadaan sekarang, kontrak
yang wajib dijaga, dan langkah berikutnya.

Perintah OWNER (20 September 2026): kerjakan **seluruh** 35 temuan dan 10 fitur, bertahap
mengikuti lima gelombang di laporan audit.

## Status

| Gelombang | Isi | Keadaan |
|---|---|---|
| **1 — kejujuran layar** | K1, K2, K4, K8, K9, K14, G5, F5 (jalan cepat) | **SELESAI** · `m025-349` |
| **2 — pintu** | X2, X3, K10, G1 | belum |
| **3 — satu buku kompetensi** | X4, X5, F1 | belum |
| **4 — alat, bukan rapor** | F3, F4, F6, K3, K5, K6, K11, K13 | belum |
| **5 — jangkauan** | A1–A5, G2–G4, G6–G10, K12, F7–F10 | belum |

Di luar gelombang, sudah mendarat di program yang sama:
`tests/modal-assign-teacher-ux-test.js` didaftarkan di `quality.yml`, dan 32 kunci hantu
Ruang Guru didaftarkan dwibahasa (`m025-350`) — dua-duanya sudah merah di `main` sebelum
program ini dimulai.

## Kontrak yang harus dijaga

1. **Bukti penguasaan dikunci pada ID UNIT, tidak pernah pada genre.** Genre dipakai
   bersama lintas tingkat kelas — "Procedure Text" ada di Kelas 7 dan Kelas 9, "Narrative
   Text" di Kelas 8 dan Kelas 10. Mencocokkan lewat genre berarti mencap bab yang belum
   pernah dibuka murid (temuan K1). `tests/kelasku-paspor-kompetensi-test.js` menjaga ini
   dan sudah di-red-proof.

2. **Buku paspor (`fiezel-class-passport-v1`) TIDAK BOLEH dipotong.** Riwayat kiriman
   (`fiezel-class-submissions-v1`) memang dipotong `slice(-30)` dan itu disengaja — ia
   hanya memberi makan daftar "Selesai" di layar Tugas. Menyatukan keduanya kembali
   mengembalikan temuan K2: stempel yang hilang diam-diam.

3. **Tugas guru bukan bukti unit kurikulum.** Migrasi paspor sengaja hanya membaca kiriman
   `misi_<unitId>`. Membuka jalur dari tugas guru ke stempel unit adalah K1 lewat pintu
   belakang.

4. **Stempel memakai percobaan TERBAIK, layar menyebut yang TERAKHIR.** Kode lama membaca
   "terbaik" sementara menulis "terakhir", sehingga tombol "Ulangi Misi" diam-diam mencabut
   stempel. Kalau salah satu sisi diubah, ubah keduanya.

5. **Keadaan kosong tidak boleh dikarang.** Nol tugas bukan "Lengkap"; kelas tanpa guru
   mapel tidak memajang mapel contoh; daftar unit kosong berkata bahwa ia gagal memuat.
   Layar yang diam saat rusak membuat murid menyalahkan dirinya sendiri.

6. **Ruang lingkup disebut sebelum diketuk.** Misi Belajar hari ini hanya Bahasa Inggris
   Fase D–F sementara panel di sebelahnya menjanjikan 17 mapel. Baris ruang lingkup di
   `curriculumCard()` turun sendiri begitu mapel lain benar-benar menyusul — jangan
   dihapus sebelum itu.

7. **Setiap naskah lahir dwibahasa.** Berlaku penuh di program ini; lihat CLAUDE.md dan
   `docs/handoffs/I18N-TH-PARITY-HANDOFF.md`.

## Langkah berikutnya (roadmap)

Gelombang 2 — **pintu**, dan alasannya: fitur yang sudah selesai tetapi tidak bisa dibuka
adalah nilai yang sudah dibayar dan belum diambil.

- **X2** — `kurikulum.html` (konsol Kurikulum & Kompetensi) tidak punya satu pun tautan dari
  produk; satu-satunya yang ada menunjuk dari layar **murid**. Pintunya pernah sengaja
  ditutup saat backend 404 (7 Sep 2026, `fiezel-ux-flags.js`), tetapi alamatnya kini terisi.
- **X3** — `misi.html` (mesin misi adaptif) hanya ditautkan dari konsol **guru**.
- **K10** — `progresView()` di `fiezel-class-hub.js` tidak punya tab yang membukanya.
- **G1** — `render()` di `teacher-console.js` mengecat ulang seluruh `app.innerHTML`, jadi
  isian guru hilang saat permintaan latar selesai. Membuka pintu ke konsol yang menghapus
  ketikan gurunya adalah urutan yang salah; G1 dikerjakan bersama X2.

Sesudahnya Gelombang 3 (satu buku kompetensi) adalah pekerjaan terberat dan prasyarat semua
yang bermakna di Gelombang 4.
