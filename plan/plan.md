# Laporan Penilaian & Valuasi Braincore Engine FIEZEL

Sebuah laporan singkat (1 halaman) yang memberi Braincore Engine skor 1–100 dan taksiran harga
jual putus (kode sumber + hak cipta) dalam USD untuk pasar edtech Asia Tenggara/global.

## Untuk siapa
- Pemilik FIEZEL yang ingin tahu posisi mesinnya dan angka wajar bila ditawarkan ke pembeli.
- Calon pembeli/investor edtech yang butuh ringkasan objektif sebelum uji tuntas.

## Isi laporan
- **Skor total 1–100** dengan rincian 6 dimensi berbobot: kedalaman algoritma (25), kebenaran
  & bukti uji (20), keamanan & keandalan (15), performa & skalabilitas (10), kesiapan komersial
  — dokumentasi, lisensi, portabilitas (15), keunikan/pembeda vs pustaka gratis seperti pyBKT (15).
- **Skor sementara: 68/100** (sebelum perbaikan sesi ini ≈ 58). Kuat di matematika inti
  (BKT + IRT 3PL + peluruhan lupa + FSRS-lite + ledger miskonsepsi + prasyarat + diagnosis
  tebakan/keyakinan palsu + rekomendasi guru yang bisa dieksekusi). Lemah di: kalibrasi parameter
  dari data skala besar belum ada, tanpa validasi empiris/publikasi, dokumentasi hanya Bahasa
  Indonesia, belum ada integrasi standar (LTI/xAPI), bank soal kecil, celah kepercayaan
  `sync-state`.
- **Taksiran harga jual putus** dengan dua pendekatan yang mudah dicek:
  1. Biaya membangun ulang (replacement cost): mesin adaptif kelas menengah BKT/IRT + analitik
     di pasar internasional ≈ USD 260–420 ribu.
  2. Diskon pasar kode-sumber-tanpa-pengguna: pembeli lazim membayar 20–40% dari biaya bangun ulang
     karena tidak ada data murid, merek, atau pendapatan yang ikut terjual.
  - **Rentang wajar: USD 60–150 ribu; angka tawaran realistis USD 90–120 ribu.**
  - Tabel pendorong naik/turun harga (apa yang menaikkan ke USD 200 ribu+, apa yang menjatuhkan
    ke bawah USD 50 ribu).
- **3 langkah termurah untuk menaikkan skor & harga** (contoh: kalibrasi parameter dari data
  nyata + laporan validasi; dokumentasi/README Inggris; tutup `sync-state`).

## Alur pengguna
1. Membaca skor total dan satu kalimat kesimpulan.
2. Melihat rincian 6 dimensi (skor per dimensi + alasan satu baris).
3. Membaca dua pendekatan harga dan rentang akhirnya.
4. Melihat pendorong harga dan 3 langkah peningkatan.

## Bentuk & rasa
Teks ringkas berbahasa Indonesia, angka tebal, tabel kecil untuk rincian skor dan harga;
tanpa jargon yang tidak dijelaskan. Disampaikan sebagai jawaban chat dan disimpan sebagai
berkas Markdown di folder memori proyek agar bisa dirujuk ulang.

## Fase implementasi
- **Fase 1 (dibuat sekarang):** laporan Markdown satu halaman berisi skor, rincian dimensi,
  dua pendekatan harga, rentang akhir, pendorong harga, dan 3 langkah peningkatan.
- Fase 2: paket "data room" untuk pembeli — ringkasan arsitektur berbahasa Inggris, hasil uji,
  daftar aset yang ikut terjual (backend + brain klien), pernyataan lisensi pihak ketiga.
- Fase 3: validasi empiris (kalibrasi parameter dari data murid nyata + laporan akurasi prediksi)
  sebagai bukti yang menaikkan harga ke kelas berikutnya.

## Asumsi
- "Seluruh kode braincore" = backend (`braincore.py`, assessment/learning loop, access) **dan**
  brain klien (`features/brain/*.js`), tanpa konten soal, kurikulum, aplikasi, merek, atau data murid.
- Harga adalah jual putus sekali bayar (kode + hak cipta), bukan lisensi tahunan atau valuasi perusahaan.
- Acuan harga = tarif pengembangan internasional (AS/Eropa/Asia Tenggara) tahun 2026, bukan tarif lokal.
- Tidak ada pendapatan, pengguna aktif, atau paten yang ikut dihitung — murni nilai kode dan IP.
- Skor didasarkan pada kondisi kode setelah perbaikan sesi ini (IDOR tertutup, B7, N+1, CI).
- Angka bersifat estimasi profesional, bukan appraisal resmi; rentang diberikan alih-alih satu angka pasti.
