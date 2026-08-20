# FIEZEL 5.23 — R6 Reliability and Multi-Device Continuity Handoff

Tanggal: 2026-08-20 WIB
Lane: R6 (roadmap `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`)
Release: `DIAG_BUILD=m025-59`, `SW_REV=m025-59-continuity-backup-20260820-1`
Base: `main@3434303` (R5 slice pertama)
Otoritas: OWNER memberi otoritas penuh untuk melanjutkan seluruh roadmap.

## STATUS

Machine-verified. Slice pertama R6: mesin backup/restore/merge. UI belum ada — lihat LANJUTAN.

## BATAS YANG SENGAJA TIDAK DILANGGAR

OWNER memberi otoritas penuh, dan justru karena itu batas ini dinyatakan terbuka, bukan diam-diam dilewati:

**Cloud sync tidak diaktifkan.** Roadmap menyatakan cloud sync tidak boleh aktif secara implisit dan memerlukan keputusan arsitektur serta consent tersendiri. Modul ini tidak melakukan network I/O sama sekali, dan gate memeriksa sumbernya tidak memuat `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, atau `navigator.serviceWorker`. Yang dihasilkan adalah satu berkas terenkripsi; pengguna yang memutuskan mau diapakan.

Kalau OWNER ingin sync otomatis, itu keputusan terpisah yang butuh consent eksplisit di UI, kebijakan retensi, dan lokasi penyimpanan — bukan efek samping dari fitur backup.

## APA YANG ADA SEKARANG

`features/continuity/fiezel-continuity.js`:

- `buildBackupPayload()` — progres belajar, dipotong ke batas yang sama dengan aplikasi. Keadaan perangkat (`view`, `activeSession`, `reportMeta`, `preferences`) sengaja TIDAK ikut.
- `encryptBackup()` / `decryptBackup()` — AES-GCM 256 dengan kunci PBKDF2-SHA256 210.000 iterasi dari passphrase pengguna. Kunci tidak pernah disimpan.
- `previewRestore()` — menjelaskan apa yang bertambah, apa yang bentrok, dan apa yang hanya ada di satu sisi. Tidak mengubah apa pun.
- `mergeProgress()` — penggabungan terbatas, deterministik, dan idempotent.

## KEPUTUSAN YANG PERLU DIWARISKAN

1. **Total dihitung ulang dari riwayat, tidak pernah dijumlahkan.** State yang membawa total mustahil (999 dari 3 jawaban) akan dikoreksi oleh backup, bukan diteruskan. Ini juga yang membuat restore berulang tidak menggelembungkan angka.
2. **Riwayat digabung berdasarkan id, bukan disambung.** Menyambung dua riwayat akan menggandakan setiap jawaban yang sudah ada di keduanya.
3. **Streak diambil yang lebih besar, bukan dijumlahkan.** Dua perangkat pada hari yang sama bukan dua hari belajar.
4. **Materi bentrok diambil yang paling maju** (lastSeen, lalu jumlah bukti, lalu mastery), sehingga arah penggabungan tidak mengubah hasil.
5. **Endpoint laporan dan kredensial tidak pernah masuk berkas backup.** Gate memeriksanya secara eksplisit.
6. **Passphrase pendek ditolak di modul, bukan hanya di UI.** Backup yang dilindungi enam karakter adalah backup yang tidak dilindungi. Konsekuensinya harus dinyatakan jelas di UI: passphrase hilang berarti backup hilang, dan itu tidak disiasati dengan menyimpan kunci.
7. **Pratinjau wajib sebelum menimpa.** Progres belajar yang tertimpa tidak bisa dikembalikan.

## GATE

`node continuity-test.js` — 18 kasus: kontrak `now`, isi backup vs keadaan perangkat, kebocoran endpoint/kredensial, total dihitung ulang, batas ukuran, round-trip enkripsi, passphrase salah, passphrase pendek, salt/IV baru tiap kali, metadata minimal, pratinjau tanpa mutasi, penggabungan tidak membuang progres lokal, pemilihan materi paling maju dari dua arah, penggabungan berdasarkan id, idempotensi penggabungan, streak, batas riwayat gabungan, dan ketiadaan kemampuan jaringan.

## LANJUTAN

1. ~~UI backup/restore di Pengaturan~~ - **SELESAI di m025-60.** Bagian "Backup dan pemulihan" di Pengaturan: kata sandi, tombol buat berkas (unduh), pilih berkas, ringkasan pratinjau, lalu tombol konfirmasi terpisah sebelum penggabungan dijalankan. Dua hal yang ditemukan gate saat menyambungkannya, dan keduanya perilaku aplikasi yang benar, bukan bug: `save()` menghitung ulang streak dari hari belajar bermakna sehingga streak tidak bisa dibawa lintas perangkat, dan sesi yang terputus dicatat oleh pemulihan sesi milik aplikasi sendiri saat state dimuat. Sesi yang SEDANG berjalan tidak ikut ke berkas; riwayat sesi yang sudah berakhir ikut, karena dari situlah tingkat sesi-tak-selesai dihitung.
2. ~~Install/update health check~~ - **SELESAI di m025-61.** Kartu "Kesehatan Instalasi" di Peta Belajar. Kasus intinya: halaman sudah memuat build baru sementara service worker masih memegang shell lama, sehingga perbaikan yang sudah dirilis terlihat "tidak berpengaruh" - persis situasi yang membuat m025-51 sulit dinilai. Revisi shell ditanyakan LANGSUNG ke worker yang aktif lewat pesan, bukan ditebak dari nama cache, karena cache lama bisa tertinggal. Build halaman disimpan di `core-config.js` sebagai `FIEZEL_PAGE_BUILD` dan dijaga gate agar selalu sama dengan `DIAG_BUILD`: penanda yang basi akan menghasilkan peringatan palsu, dan peringatan palsu lebih buruk daripada tidak ada peringatan.
3. ~~Observability tanpa raw answer history~~ - **SELESAI di m025-62.** Bukan modul baru: yang ditambahkan adalah pemeriksaan lintas-permukaan. Aplikasi ini punya banyak penghasil laporan yang masing-masing menyatakan dirinya aman; yang belum ada adalah pemeriksaan yang melihat semuanya sekaligus. Gate menanam kalimat soal, jawaban yang dipilih, transkrip, dan endpoint ke dalam state, lalu menuntut tidak satu pun muncul di keluaran mana pun. Satu kasus di dalamnya membuktikan penanda itu benar-benar ada di state, supaya gate tidak bisa lulus hanya karena datanya tidak pernah masuk. Backup adalah pengecualian yang disengaja - berisi progres pengguna sendiri - dan tetap dilarang membawa endpoint.
4. Accessibility pass: keyboard, screen reader, reduced motion, caption, contrast, touch target.
5. Cloud sync HANYA bila OWNER memutuskannya eksplisit, dengan consent dan arsitektur tersendiri.
6. Setelah seluruh roadmap ter-deploy: retest fisik neural voice oleh OWNER.
