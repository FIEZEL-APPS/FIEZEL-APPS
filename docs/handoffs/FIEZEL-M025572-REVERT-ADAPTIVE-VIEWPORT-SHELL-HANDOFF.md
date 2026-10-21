# FIEZEL-M025572 — Revert cangkang 100dvh & tata letak adaptif #602 (`m025-572`)

**Status:** revert darurat, menunggu konfirmasi OWNER di perangkat. Keputusan rilis tetap di tangan OWNER/MASTER.

## 1. Laporan OWNER sesudah #602 masuk main

> *"KENAPA BEBERAPA HALAMAN TIDAK BISA DI SCROL LAGI, DAN TAMPILAN HALAMAN HOME TAMPAK DI PAKSAKAN
> SEHINGGA MEMBUAT KARTU MENUMPUK, DAN SISI KIRI KANAN LAYARNYA TIDAK FIT KE LAYAR, DAN GARIS
> TEPIAN TIDAK BAGUS DAN TIDAK SEMPURNA, SEMUANYA TAMPAK ANOMALI"*

## 2. Akar masalah (terukur di Chromium 390x844 pada `e1227d6`)

#602 mengunci `html`, `body`, `main.app`, dan `#app` setinggi `100dvh` dengan `overflow: hidden`.
Setiap layar dipaksa muat satu layar penuh.

- **Scroll mati.** Di Home, Latihan, Kosakata, dan Membaca tidak ada satu pun elemen yang bisa
  di-scroll. Di Progres hanya `#progressTabPane` setinggi 333 px yang bisa di-scroll; kartu
  statistik di atasnya diam.
- **Kartu terjepit.** Di Game, poster arena gepeng sehingga judul "FIEZEL ARENA" dan tombol
  "Mulai Duel Arena" terpotong oleh `overflow: hidden`. Di Menulis dan Perpustakaan, 4–6 kartu
  terpotong.
- **Tepi kiri-kanan.** Padding samping `#app > section` menjadi 0. Kartu menempel ke tepi layar,
  dan di Grammar deret tombol (Ujian / Sesi Kilat / Video) meluber ke kanan tanpa penggulir.

## 3. Tindakan

`git revert e1227d6` (squash #602), lalu nomor build dinaikkan lewat `node tools/bump-build.mjs`
ke `m025-572`. Semua yang ditambahkan #602 ikut dicabut: Section 14 di `fiezel-tactile-clay.css`,
pill 2D `syncNavActivePill`, kunci i18n `nav.sidebar-heading` (sidebarnya ikut hilang), dan probe
`tools/dev/adaptive-viewport-probe.mjs`.

## 4. Langkah berikutnya

- Kalau tata letak tablet/desktop (rail kiri dan sidebar) masih diinginkan, kerjakan ulang
  **hanya** untuk `min-width: 768px`. Di ponsel, scroll halaman jangan dikunci. Dan untuk setiap
  layar, buktikan dengan probe bahwa tidak ada konten yang terpotong oleh `overflow: hidden`.
- PR #601 (topbar) perlu digabung dengan main ini lalu dinaikkan ke `m025-573`. Listener
  scroll-nya sudah menangani jendela maupun panel dalam, jadi tetap benar sesudah revert.
