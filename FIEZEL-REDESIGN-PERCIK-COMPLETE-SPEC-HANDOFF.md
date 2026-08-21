# FIEZEL — Redesign Percik + Onboarding + Gerbang Notifikasi (m025-78)

Tanggal: 2026-08-21 WIB
Lane: brand / redesign
Release: `DIAG_BUILD=m025-78`, `SW_REV=m025-78-redesign-percik-complete-spec-20260821-1`
Sumber: `FIEZEL_Complete_Design_Specification.pdf` (53 halaman, mengganti sheet PDF yang dipakai m025-76/77) + 7 aset produksi baru dari `D:\png`

## KENAPA INI ADA

OWNER menandai versi sebelumnya "kartunya tidak penuh layar, terlalu kecil", mengirim spesifikasi desain lengkap ("ikuti ini"), tujuh gambar produksi baru, lalu memerintahkan "ubah notification gate di akhir flow". m025-78 adalah jawaban penuh atas ketiganya: redesain visual, aset baru, dan urutan boot yang berubah.

## ASET BARU

Enam pose + ikon aplikasi diganti dari kiriman `D:\png` (kualitas jauh di atas potongan sheet PDF lama, latar sudah transparan):

| Aset | Ukuran | Sumber |
|---|---|---|
| `fiezel-semangat.png` | 620×712 | baru |
| `fiezel-coding.png` | 620×737 | baru |
| `fiezel-istirahat.png` | 620×492 | baru |
| `fiezel-jadwal.png` | 620×703 | baru |
| `fiezel-pencapaian.png` | 620×808 | baru |
| `fiezel-menulis.png` | 620×828 | baru |
| `fiezel-icon-512.png` | 512×512 | baru, penuh bidang, aman jadi ikon maskable |
| `hero`, `belajar`, `mark`, `mengintip` | — | TETAP potongan sheet lama - belum ada penggantinya |

Empat pose terakhir kualitasnya tidak seragam dengan yang lain, dan itu ditulis terbuka di header `features/brand/fiezel-mascot.js`, bukan disembunyikan.

Proses: potong rapat (trim latar transparan) lalu perkecil dengan Lanczos-3 + alpha dikalikan dulu (bukan bilinear - tepi ilustrasi bergaris tetap tegas, tidak ada garis pucat di sekeliling karakter) lalu kuantisasi PNG-8 256 warna (ilustrasi bidang-warna-rata ini paling rugi disimpan RGBA penuh; turun kira-kira 7x tanpa kehilangan yang terlihat mata). `apple-touch-icon.png`/`favicon-64.png` diganti dari sumber yang sama.

## FONT: FREDOKA + PLUS JAKARTA SANS, DI-SELF-HOST

Spesifikasi meminta Fredoka (heading) dan Plus Jakarta Sans (body) dari Google Fonts. FIEZEL adalah PWA offline-first dengan service worker; bergantung pada fonts.googleapis.com saat runtime berarti splash/onboarding kosong huruf begitu jaringan mati. Tujuh berkas woff2 (Fredoka 500/600/700, Plus Jakarta Sans 400/500/600/700, disubset ke karakter yang benar-benar dipakai) diunduh sekali dan disimpan di `assets/fonts/` (kira-kira 55 KB total), dimuat lewat `@font-face` lokal, ikut ke shell offline. Ini juga menyelesaikan item yang sudah lama tertunda sejak m025-76 (font Fredoka/Plus Jakarta Sans, soal berat unduhan).

## TOKEN WARNA PERSIS SPESIFIKASI

`--fz-bg:#efe3d3`, `--fz-paper:#fdf3e2`, `--fz-ink:#2c1b1c`, `--fz-accent:#7a1e2e`, `--fz-gold:#d9a441`, `--fz-soft:#f3e0e0` - dilingkupi ke `.fiezel-splash`/`.fiezel-ob` saja lewat custom property, BUKAN skema warna aplikasi (yang tetap `--accent:#8C2233` dkk di seluruh layar lain). Menyamakan keduanya berarti mengecat ulang puluhan layar yang tidak diminta pada redesign ini.

## PENUH LAYAR, BUKAN KARTU KECIL

Versi lama menaruh kartu terpusat (lebar dibatasi kira-kira 22rem) di tengah layar krem kosong. Sekarang `.fiezel-splash`/`.fiezel-ob` menutupi SELURUH viewport, maskotnya besar di area atas, dan sebuah "bottom sheet" selebar penuh (`.fiezel-sheet`, sudut atas membulat 28px) menempel di tepi bawah - pola onboarding mobile modern, CTA selalu terjangkau ibu jari.

## ONBOARDING DIBANGUN ULANG: 6 LANGKAH SHEET LAMA MENJADI 5 LANGKAH SPESIFIKASI

`features/onboarding/fiezel-onboarding.js` ditulis ulang total mengikuti bagian 3 spesifikasi (Step 1-5; Step 0/splash tetap di `fiezel-splash.js`). Empat tempat SENGAJA tidak mengikuti spesifikasi persis, dan bedanya ditulis di header modul serta di kartunya sendiri:

1. Goal Selection memakai profil tujuan ASLI aplikasi (Sekolah/IT/Beasiswa/Fondasi IELTS-TOEFL dari `FiezelPersonalJourney`), bukan "Travel/Work/Fun" - kategori itu tidak berkaitan dengan apa pun di produk.
2. Level Reveal adalah SELF-REPORT ("perkiraan awal darimu sendiri, bukan hasil tes"), tersimpan di `preferences.selfAssessedLevel`, tidak pernah menimpa `state.level` (milik tes penempatan asli).
3. Placement Test mengarah ke tes 150 soal yang sungguhan ada di produk, bukan "4-5 pertanyaan cepat" spesifikasi - jumlah sebenarnya dituliskan di kartu. Tes cepat yang sungguhan sudah didelegasikan sebagai tugas lanjutan terpisah, lihat bagian LANJUTAN.
4. Schedule Setup tidak memasang pemilih hari/jam. FIEZEL belum punya jadwal yang diatur pengguna - pengingat dipilih ALRS dari bukti belajar. Pertanyaan spesifikasi "Kapan kamu ingin belajar?" dijawab jujur dengan cara ALRS sebenarnya bekerja.

Dua lapis jalan keluar: tombol "Lewati" global (kanan atas, mengakhiri seluruh perkenalan) ditambah "Lewati langkah ini" pada langkah dengan aksi berat (goal, placement) supaya menunda satu langkah tidak memaksa mengakhiri semuanya.

## GERBANG NOTIFIKASI DIPINDAH KE UJUNG ALUR

OWNER: "ubah notification gate di akhir flow".

Sebelumnya: gerbang notifikasi adalah hal PERTAMA yang dilihat murid baru, sebelum tahu FIEZEL itu apa.

Sekarang: murid baru (perkenalan belum selesai) melihat splash lalu onboarding 5 langkah DULU, gerbang notifikasi baru muncul di ujungnya - persis sebelum Home. Murid lama (perkenalan sudah pernah selesai) tidak berubah sama sekali: gerbang tetap hal pertama yang diperiksa setiap boot, persis seperti sebelumnya.

Notifikasi tetap WAJIB di kedua jalur - yang berubah hanya urutannya, bukan apakah gerbangnya ada. Implementasi:

- `startNotificationGate()` adalah logika gerbang asli (`lockAppForNotifications`/`unlockAppAfterNotification`), tidak berubah satu baris pun, hanya berganti nama dari `startWelcomeExperience()` lama.
- `startWelcomeExperience()` (baru) adalah titik masuk boot yang memutuskan: kalau `FiezelOnboarding.completed()` belum, tampilkan splash (yang lalu menyambung ke onboarding); kalau sudah, langsung `startNotificationGate()` seperti dulu.
- `afterOnboardingExit(action)` adalah corong tunggal untuk semua jalan keluar onboarding (selesai normal, atau jalan pintas "Mulai tes penempatan"). Kalau app belum lolos gerbang, keduanya mampir ke `startNotificationGate()` dulu - termasuk jalan pintas tes penempatan: mengklik "Mulai tes penempatan" di langkah 3 TIDAK langsung membuka kuis, melainkan menunda (`pendingAfterGate='placement'`) sampai gerbang notifikasi lolos, baru kuis 150 soal benar-benar dibuka. Ini disengaja - tanpa penundaan itu, jalan pintas tes penempatan akan menjadi celah untuk memakai aplikasi tanpa pernah melewati gerbang wajib.

Diuji langsung di browser (bukan cuma gate otomatis): murid baru lewat splash yang auto-tutup, lalu onboarding 5 langkah bisa dijelajah penuh (goal dipilih, placement dilewati, jadwal, ringkasan), lalu "Mulai Belajar" membuat `body` mendapat kelas `notification-locked`, dialog gerbang muncul, status "Izin notifikasi ditolak. FIEZEL tetap terkunci." (karena browser uji menolak izin) - persis perilaku wajib yang sama, hanya di ujung. Memuat ulang halaman (onboarding sudah selesai) membuat gerbang langsung terkunci di awal boot tanpa onboarding muncul lagi - jalur murid lama tidak berubah.

## GATE

- `brand-mascot-test.js` (18 kasus): palet persis spesifikasi, enam pose baru dari sumber berukuran besar, empat pose lama tetap terdaftar, font di-self-host dan ikut cache, layar penuh bukan kartu kecil.
- `onboarding-test.js` (28 kasus, ditulis ulang total): goal ASLI bukan Travel/Work/Fun, level diberi label "perkiraan" eksplisit, 150 soal tidak disamarkan, tidak ada pemilih jadwal palsu, setiap langkah dan setiap slide carousel punya jalan keluar, navigasi maju-mundur carousel, tombol Lanjut nonaktif sebelum goal dipilih, gerbang notifikasi terverifikasi dipindah bukan dihapus.
- Semua gate tetangga hijau: `pwa-cache-test.js`, `pwa-release-coherence-test.js`, `ui-structure-test.js`, `a11y-test.js`, `validator.js`, `product-audit.js`, `install-health-test.js`, `alrs-behavior-test.js`, `notification-reminder-test.js`, `m02542-experience-test.js`, `experience-integration-test.js`, `regression-test.js`, `content-audit.js` (dua terakhir lambat, bukan gagal - dikonfirmasi keluar dengan kode 0 setelah dibiarkan selesai).

## LANJUTAN (didelegasikan ke agent lain via control bus issue #12)

1. Tes cepat 4-5 soal yang sungguhan, terpisah dari tes 150 soal - brief lengkap sudah disiapkan.
2. Sambungkan `preferences.studyWindows` (hari/jam) ke `selectALRSDecision()` - brief lengkap sudah disiapkan, tidak dikerjakan di sini karena berisiko mengganggu tangga eskalasi ALRS yang sudah teruji.
3. Berkas master AI/EPS/SVG untuk vektor sejati dan ikon 1024x1024 - permintaan ke OWNER.
4. Empat pose (hero/belajar/mark/mengintip) menunggu kiriman produksi baru yang setara kualitasnya dengan enam pose lainnya.
