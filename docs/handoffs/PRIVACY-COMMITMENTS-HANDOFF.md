# Janji privasi yang terbit publik — dan apa yang kodenya wajib penuhi

Otoritas: OWNER. Sejak 6 September 2026, `https://fiezel.my.id/privacy/` dan `/terms/`
terbit sebagai halaman publik, dan Google memakai keduanya sebagai syarat OAuth consent
screen FIEZEL. Sejak saat itu isinya **berhenti menjadi dokumentasi dan menjadi janji**.

Dokumen ini mencatat janji mana yang sudah dipenuhi kode hari ini, dan mana yang belum —
supaya tidak ada yang lupa bahwa halaman itu berbicara atas nama sistem.

## Sudah benar hari ini (diverifikasi saat penulisan)

| Janji di halaman | Buktinya di kode |
| --- | --- |
| Progres belajar hidup di perangkat, server bukan sumber kebenaran | `workers/api/wrangler.toml` bab 1; binding `USERDATA` sengaja TIDAK dipasang |
| Bisa dipakai tanpa akun | `POST /api/auth/anon` menerbitkan identitas anonim |
| Rekaman suara tidak dikirim atau disimpan | `features/speaking-listening/fiezel-speaking-listening-addon.js` memakai MediaRecorder lokal; satu-satunya `fetch` di berkas itu memuat bank soal JSON |
| Notifikasi disimpan 30 hari | `NOTIFY_LIMITS.RETENTION_DAYS = 30` (`workers/api/social/notify-core.js:72`), dipakai di baris 259 |
| Statistik tanpa identitas/IP/UA | kontrak privasi migrasi 0001/0006, dijaga `tests/auth-schema-contract-test.js` |
| Guru hanya melihat nama tampilan + hasil | `tc_class_report`; tidak ada kolom email di jalur guru |

## BELUM dipenuhi — utang yang harus dibayar

**1. Penghapusan akun tidak aktif 24 bulan.**
Halaman menjanjikan akun dan email dihapus setelah 24 bulan tanpa aktivitas. **Belum ada
kode yang melakukannya.** Yang ada hari ini hanya purge untuk rollup analytics
(`workers/api/cron-status.js`) dan token anon (`rate-anon.js`) — bukan akun.

Kata "otomatis" sengaja TIDAK dipakai di halaman itu, supaya tidak mengklaim mekanisme yang
belum ada. Janjinya tetap sah karena FIEZEL belum berumur 24 bulan, jadi belum ada akun yang
jatuh tempo. **Tetapi tenggatnya nyata**: mekanismenya harus ada sebelum akun pertama
mencapai 24 bulan tanpa aktivitas. Terlambat satu hari = halaman itu berbohong.

Yang perlu dibangun: job harian yang membaca `auth_account.last_login_at`, dan menghapus
baris yang lebih tua dari 730 hari BESERTA seluruh baris berkunci `sub` di 16 tabel yang
mengacu padanya. Setengah penghapusan lebih buruk daripada tidak sama sekali — ia
meninggalkan laporan murid tanpa pemiliknya.

**2. Permintaan hapus/ekspor data belum punya jalur.**
Halaman menjanjikan salinan data, koreksi, dan penghapusan atas permintaan, dijawab dalam
30 hari. Hari ini jawabannya harus dikerjakan MANUAL lewat `wrangler d1 execute`. Selama
volumenya kecil itu memadai; begitu ada belasan permintaan, ia butuh perkakas.

**3. Email belum benar-benar disimpan.**
Bagian 3.2/3.3 menjelaskan penyimpanan email untuk login Google dan akun FIEZEL. Fiturnya
BELUM ada saat halaman ini terbit — halaman menjelaskan perilaku yang akan berlaku begitu
login Google mendarat. Kalau rencana itu batal, bagian tersebut harus dicabut, bukan
dibiarkan menjanjikan pengumpulan data yang tidak terjadi.

Perlu diingat saat membangunnya: `tests/auth-schema-contract-test.js` hari ini MELARANG
kolom email. Kontrak itu harus diubah dengan sengaja dan bertanggal, bukan dilonggarkan
diam-diam.

## Aturan untuk siapa pun yang menyentuh ini berikutnya

1. **Mengubah perilaku data = mengubah halaman privasi, di PR yang sama.** Menambah kolom
   yang menyimpan sesuatu tentang murid tanpa menyentuh `/privacy/` berarti halaman itu
   mulai berbohong sejak commit itu.
2. **Versi Indonesia adalah acuan.** Versi Thai membawa catatan itu di kakinya; kalau ID
   berubah, TH wajib menyusul.
3. **Google membaca halaman ini.** URL-nya terdaftar di OAuth consent screen. Menghapus,
   memindahkan, atau membuatnya 404 akan mematahkan login Google seluruh murid.
