# Tabrakan nomor build m025-196 … m025-199 (riwayat main, 29–30 Agu 2026)

**Status: dicatat, TIDAK ditulis ulang.** Riwayat `main` sudah publik dan dipakai sesi lain;
menulis ulangnya menuntut `push --force` ke `main`, yang dilarang tanpa izin OWNER dan akan
merusak klon setiap sesi yang sedang berjalan. Dokumen ini ada supaya nomornya tidak pernah
lagi dibaca sebagai penanda unik.

## Apa yang terjadi

Dua jalur kerja bercabang dari `m025-195` (`d7fe7be`) dan berjalan berhari-hari tanpa saling
melihat:

- jalur **audit produksi** (`claude/fiezel-production-audit-1ttcdp`, PR #256–#260);
- jalur **i18n Thai** (`perplexity-computer`, dikerjakan di klon lokal dan lama tidak di-push).

Masing-masing memanggil `tools/bump-build.mjs` **dengan benar**. Masing-masing membaca
`origin/main` dan menaikkan satu. Karena keduanya berangkat dari basis yang sama dan tidak
pernah melihat cetakan lawannya, keduanya menghasilkan deret nomor yang sama. Pada 30 Agu
keduanya di-**merge** (bukan di-rebase dan dinomori ulang), sehingga kedua deret masuk riwayat
`main` utuh.

## Nomor yang dipakai dua kali

| Nomor | Jalur audit produksi | Jalur i18n Thai |
|---|---|---|
| m025-196 | `5d513a8` hapus cincin fokus emas | `1dea85e` 12 gate Windows + audio watchdog |
| m025-197 | `4d63ec9` cincin fokus hanya papan tik | `fd383b4` i18n judul grammar + panel |
| m025-198 | `cc7a429` subtitle listening dimatikan | `59f3bf0` perbaikan gate prasasti/regression/tours |
| m025-199 | `fdea3bc` style.css berhenti menahan cat pertama | `0f872f9` hapus string Indonesia hardcoded |

`m025-200` (`0a31ee6`) unik dan koheren di keempat tempat — **tip aman**.

## Apa yang rusak dan apa yang tidak

**Tidak rusak:** apa yang terpasang sekarang. Tip `main` koheren di `core-config.js`,
`sw.js`, `fiezel-diag-panel.js`, dan `coordination/BUILD-VERSION.json` pada `m025-200`;
`install-health-test.js` dan `pwa-release-coherence-test.js` memeriksa keselarasan tip, dan
keduanya hijau. Tidak ada murid yang memegang shell campur akibat ini, karena tidak ada dua
isi berbeda yang pernah **terbit** dengan satu nomor — jalur i18n belum pernah di-deploy saat
nomornya bertabrakan.

**Rusak:** kemampuan membaca riwayat. "m025-198 ada di produksi" sekarang adalah kalimat yang
tidak bisa dijawab dari nomornya saja; ia butuh commit hash. Setiap laporan, handoff, atau
tiket yang menyebut m025-196..199 tanpa hash bersifat ambigu dan harus diperlakukan begitu.

## Aturan yang berlaku sejak sekarang

1. Menyebut m025-196..199 **wajib** disertai hash commit atau nama jalur. Tanpa itu, anggap
   ambigu — jangan tebak.
2. Rentang ini tidak boleh dipakai sebagai basis perbandingan "sebelum/sesudah" tanpa
   menyebut sisi mana yang dimaksud.
3. Nomor di bawah m025-200 **tidak boleh** dicetak ulang. Dijaga oleh
   `build-number-uniqueness-test.js` (pemeriksaan monotonik).

## Kenapa ini tidak akan terulang

`tools/bump-build.mjs` menutup tabrakan **saat mencetak**: sebelum memakai sebuah nomor, ia
menelusuri riwayat `origin/main` dan melompati setiap nomor yang sudah pernah diklaim di sana,
lalu mengatakan nomor mana yang dilompati dan kenapa.

`build-number-uniqueness-test.js` menutup tabrakan **sebelum merge**, yaitu titik yang dulu
tidak dijaga siapa pun: ia menolak nomor yang sudah diklaim di `origin/main` oleh commit yang
bukan leluhur HEAD, dan menolak nomor yang mundur dari klaim tertinggi di hulu. Bukti merahnya
diambil dari kejadian nyata ini — dijalankan pada `0f872f9`, gerbang menyebut `fdea3bc`
sebagai penabraknya.

Yang tetap **tidak** dijaga alat, dan memang tidak bisa: dua sesi yang mencetak nomor pada
detik yang sama sebelum salah satunya push. Gerbang menangkapnya di PR, bukan di `bump`.
