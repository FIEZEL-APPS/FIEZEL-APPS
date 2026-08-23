# m025-134 — Mode gelap dihapus, aplikasi punya satu tampilan

OWNER: *"aku ingin kamu menghapus mode gelap di aplikasi"*. Permintaannya singkat, tetapi
yang diminta bukan mencabut sakelarnya — melainkan menutup seluruh jalur temanya.

**Status: SELESAI, menunggu penerimaan fisik OWNER.** Otoritas rilis tetap milik OWNER/MASTER;
berkas ini tidak memberi wewenang merge atau deploy kepada siapa pun.

---

## 1. Mengapa penghapusannya sampai menyentuh `features/tutor-classroom/`

`fiezel-tutor-v3.js` memanggil `installBrowser()` tanpa syarat saat dimuat, dan fungsi itu
memasang kelas `fiezel-ui-v6` pada `<html>`. Akibatnya `tutor-v3.css` bukan CSS Classroom
saja: seluruh token `--ui-*` di sana adalah palet SELURUH aplikasi. Di berkas itulah setiap
token punya kembaran gelap, jadi menghapus mode gelap tanpa menyentuhnya berarti
meninggalkan separuh sistem temanya tetap hidup.

Yang diubah di sana **hanya penghapusan dua blok gelap** (`@media (prefers-color-scheme:dark)`
dan `:root[data-theme="dark"].fiezel-ui-v6`). Palet terang `html.fiezel-ui-v6` tidak
disentuh satu nilai pun, dan tidak ada logika Classroom/tutor yang berubah.

## 2. Yang dihapus

| Berkas | Perubahan |
| --- | --- |
| `style.css` | Blok palet gelap (media query preferensi sistem **dan** atribut) beserta tiga penimpaan turunannya: `.nav.active`, `.welcome-mark`/`.modal-mark`/`.instagram-mark`, dan rem opasitas `.global-sky`/`.sky-light`. |
| `features/tutor-classroom/tutor-v3.css` | Kembaran gelap seluruh token `--ui-*`, kedua selektor. |
| `features/ui/fiezel-dark-mode.js` → `features/ui/fiezel-ui-manager.js` | Namanya sudah tidak jujur: kelas ini memang pengelola UI (A/B testing, skeleton, empty state). Jalur temanya menyusut jadi satu `initTheme()`. |
| `features/ui/fiezel-boot-tail.js` | Berhenti membungkus `window.openSettings` hanya untuk menyuntikkan baris "Mode gelap"; tersisa pendaftaran service worker. |
| `features/ui/fiezel-ab-testing.js` | Metrik `darkModeToggle` / event `dark_mode_toggled` dilepas. |
| `index.html` | `data-theme="light"` pada `<html>` + `<meta name="color-scheme" content="light">`. |

Terang tetap **dinyatakan**, bukan dibiarkan kosong: konvensi `data-theme` masih dibaca
stylesheet atau ekstensi lain, dan atribut yang absen berarti "terserah perangkat" — persis
yang OWNER tidak inginkan. `color-scheme:light` mengurus kontrol bawaan peramban (scrollbar,
input, tombol form) yang tidak pernah dijangkau CSS kita.

Berkas probe pengembang `tools/puter-tts-probe.html` dan `tools/puter-tts-prosody-probe.html`
sengaja dibiarkan: keduanya alat diagnostik, bukan bagian aplikasi murid.

## 3. Tes: satu tema, dan dua gerbang yang diperbaiki karena rapuh

Pemeriksaan "setiap token punya pasangan gelap" hilang bersama temanya di
`contrast-test.js`, `topbar-logo-contrast-test.js`, dan `pastel-field-contrast-test.js`.
Sebagai gantinya ada gerbang baru **"tidak ada sisa mode gelap di kode maupun palet"** yang
memerah bila `prefers-color-scheme`, `data-theme="dark"`, `settingDarkMode`, atau
`toggleDarkMode` muncul lagi. Jadi yang dulu menjaga keberadaan tema kedua kini menjaga
ketiadaannya — cakupannya tidak berkurang, hanya berbalik arah.

Dua gerbang lain memerah tanpa satu pun aturan tampilan berubah, dan keduanya diperbaiki
di akarnya, bukan dilonggarkan:

- **`ui-structure-test.js`** memotong blok `@media` di kemunculan `'@media'` BERIKUTNYA,
  sehingga panjang satu blok bergantung pada ada-tidaknya media query lain sesudahnya.
  Menghapus blok gelap saja sudah cukup membuat blok ponsel menelan aturan milik breakpoint
  tetangga dan memerahkan pemeriksaan grid modul. Batas blok sekarang dihitung dengan
  menghitung kurung.
- **`splash-first-paint-test.js`** mencocokkan tag `<html …>` persis; sekarang mencocokkan
  kelas `fz-booting`, supaya atribut lain boleh menumpang di sana.

Seluruh suite di `.github/workflows/quality.yml` dijalankan lokal dan hijau.

## 4. Ritual versi

`FIEZEL_PAGE_BUILD`, `DIAG_BUILD`, dan `SW_REV` naik bersama ke `m025-134`.

## 5. Langkah berikutnya

1. **OWNER**: buka aplikasi di ponsel yang sistemnya DISETEL GELAP, lalu pastikan dasarnya
   tetap cream di Home, Classroom, Perpustakaan, dan Pengaturan — dan bahwa baris "Mode
   gelap" benar-benar tidak ada lagi di Pengaturan. Inilah bukti yang tidak bisa
   digantikan tes statis mana pun.
2. Murid yang pernah menyimpan preferensi gelap: `initTheme()` membersihkan kunci lamanya
   dari `localStorage` pada boot pertama, jadi tidak ada yang tertinggal di mode gelap.
3. Roadmap: kalau kelak ada permintaan "ikuti sistem", ia harus lahir sebagai keputusan
   produk yang eksplisit dengan paletnya sendiri — bukan dengan menghidupkan kembali dua
   selektor yang dulu diam-diam saling menimpa.
