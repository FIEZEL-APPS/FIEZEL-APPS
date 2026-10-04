# FIEZEL m025-458: Perbaikan UX sesi grammar (U1 sampai U14)

Tanggal: 2026-10-04
Release: `FIEZEL_PAGE_BUILD=m025-458`, `DIAG_BUILD=m025-458`, `SW_REV=m025-458-unified-grammar-20261002` (lewat
`tools/bump-build.mjs`). Perubahan `features/neural-voice/fiezel-diag-panel.js` HANYA nomor build.
Otoritas: OWNER "perbaiki semua dan lanjutkan sampai semuanya merge", atas temuan
`reports/GRAMMAR-SESSION-UX-AUDIT-2026-10-04.md`.

## Yang diperbaiki
| # | Perbaikan | Berkas |
|---|---|---|
| U1 | Subtitle soal video bertulisan terang yang pasti (dulu putih di atas putih, 1,05:1). Baris yang sama dengan kalimat soal terisi ditampilkan rumpang, jadi jawabannya tidak bocor. Kalimat "Video tidak tersedia" disembunyikan dari murid. | `features/grammar/fiezel-grammar-video.js` |
| U2 | Soal video hanya diambil dari skill pelajaran itu sendiri. Tanpa video yang cocok, soal dibuat dari kalimat pelajaran. Perintahnya lewat i18n, bukan "Complete the subtitle:". | `app.js` `getOrMakeVideoGrammarQuestion`, modul video |
| U3 | Kartu Prasasti berlatar terang yang pasti. Dulu `var(--bg)` yang kini hampir hitam membuat teks tak terbaca. Tanda pisah di deskripsinya juga dihapus (id dan th). | `style.css`, copy app-d |
| U4 | Petunjuk sebelum jawaban dibuka (pegangan ingatan, saran menghindar) tidak lagi memuat kunci jawaban. Rotasi kontras sesudah gagal berulang tetap ada, sesuai gerbang `tutor-brain-v3`. Petunjuk bawaan dibuat umum, tidak lagi khusus "kapan kejadiannya". | `features/brain/fiezel-tutor-brain.js`, copy feat-a |
| U5 | Soal susun kata menampilkan kalimat tujuannya, jadi susunan lain yang sama benarnya tidak lagi dinilai salah. | `app.js`, `grammar.token-order-panduan` |
| U6 | Arti kosakata misi dan FIEZEL QUEST mengikuti locale murid, jadi murid Thai menerima arti Thai. | `features/grammar/grammar-vocab-bridge.js` |
| U7 | Tur pengenalan ditunda selama ada modal lain terbuka. Judulnya dipaku putih karena dulu tercat transparan. | `features/onboarding/fiezel-tour.js`, CSS |
| U8 | Isi kuis diberi ruang di bawah selama bar mengambang tampil. Tombol "Buntu? Buka pembahasan lengkap" disembunyikan selama bar coba lagi sudah punya "Buka Pembahasan". | CSS |
| U9 | Vonis sesudah salah terakhir: "yuk lihat pembahasannya", bukan "coba lagi". | copy student |
| U10 | Di pembahasan, tuntunan langkah tidak lagi ditutup "apa jawabanmu?". | `app.js` `stepTutorGuidanceMarkup` |
| U11 | Judul FIEZEL QUEST memakai nama pelajaran, bukan kunci mesin. "Kesiapan BKT" diganti "Siap Latihan", "Kosakata Dikuasai" diganti "Kosakata Dikenali". Tombol tutup tidak lagi terpotong. | bridge JS/CSS, copy app-d |
| U12 | Kartu materi diberi satu contoh kalimat dengan kata kunci ditebalkan. Tombol kembali ganda dihapus. | `app.js` `renderGrammarLesson`, CSS |
| U14 | "Buka materi" bertulisan gelap di atas amber, dan catatan pelajaran terkunci dipertegas. | CSS |

## Gerbang
- Baru: `tests/grammar-ux-p1-2026-10-04-test.js` (15 cek).
- `id-golden-baseline.json` ditulis ulang dengan sengaja.
- Probe browser `tools/dev/grammar-ux-audit-2026-10-04-probe.js`: subtitle video 0 pelanggaran kontras (sebelumnya 4), dan judul tur tidak lagi tercatat. Prasasti terbaca di tangkapan layar.

## Belum dikerjakan
U13 (toast "Setengah jalan" yang menutupi bawah layar), dan BrainCore Gelombang 2 (KelasKu) serta 3.
