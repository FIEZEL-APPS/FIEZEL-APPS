# FIEZEL Creator Hub

FIEZEL 5.0.0 memakai Puter Worker sebagai pengirim laporan akses dan belajar Jahran. Arsitektur ini tidak menyimpan API key, password, atau token creator di aplikasi.

## Aktivasi satu kali

1. Jalankan FIEZEL melalui HTTPS atau server lokal.
2. Buka `creator-report-setup.html`.
3. Tekan **Pasang Creator Hub**, lalu login memakai akun Puter milik creator.
4. Tunggu sampai endpoint `https://....puter.work` muncul.
5. Kembali ke FIEZEL, buka **Settings**, tinjau data, lalu aktifkan consent laporan pada perangkat Jahran.

Setelah aktif:

- laporan akses dikirim paling banyak satu kali per hari;
- laporan belajar dikirim otomatis setelah setiap sesi selesai;
- kegagalan jaringan masuk antrean lokal dan dicoba lagi saat aplikasi dibuka;
- dashboard creator tersedia di `creator-report-dashboard.html`;
- CSV dapat diunduh dari dashboard.

## Login

Login tidak diminta setiap kali FIEZEL dibuka. Puter menyimpan sesi pada browser yang sama. Login baru diperlukan jika user logout, sesi kedaluwarsa, data situs/cookie dihapus, atau FIEZEL dibuka di browser/perangkat baru.

## Privasi dan keamanan

- Jahran harus memberi consent eksplisit dan dapat mematikannya kapan saja.
- Worker hanya menerima panggilan terautentikasi melalui `puter.workers.exec()`.
- Worker mengikat penyimpanan ke akun learner pertama yang mengirim laporan.
- Hanya pemilik Worker yang dapat membuka endpoint daftar laporan.
- Data yang diterima di-whitelist: level, akurasi, jumlah latihan, streak, domain skill, area lemah, confidence, dan ringkasan sesi.
- Isi jawaban mentah, password, API key, riwayat browser, dan isi file pribadi tidak dikirim.

## Mengapa bukan email langsung

Email otomatis dari aplikasi statis membutuhkan server atau kredensial provider. Menanam kredensial email di browser tidak aman. Creator Hub lebih aman karena memakai autentikasi Puter dan penyimpanan terpusat milik creator tanpa secret di klien. Jika email tetap dibutuhkan di masa depan, Worker dapat ditambah integrasi provider dari sisi server.

## Referensi resmi

- Puter Workers: https://docs.puter.com/Workers/
- Worker router dan konteks `me.puter` / `user.puter`: https://docs.puter.com/Workers/router/
- Deploy Worker: https://docs.puter.com/Workers/create/
- Key-value store: https://docs.puter.com/KV/
- Autentikasi Puter: https://docs.puter.com/Auth/signIn/
