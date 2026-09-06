# DEMO GURU — dari tombol landing page ke papan KelasKu (m025-282)

Wewenang: OWNER. Status: SELESAI untuk jalur Indonesia; sisi Thai masih utang (lihat bawah).

## Masalah

Landing page memasang tombol **"Buka Demo Guru"** yang menunjuk ke `app/?teacher=preview` —
di hero, di navigasi, dan di footer. Tombol itu tidak melakukan apa pun di produksi.

`previewAllowed()` di `features/teacher/fiezel-teacher-shell.js` menolak host produksi
sebagai baris pertamanya:

```js
var h = location.hostname; if (/fiezel\.my\.id$|github\.io$/.test(h)) return false;
```

Aturan itu benar ketika ditulis — pratinjau lahir sebagai alat pengembangan. Ia berhenti
benar ketika landing page menjadikannya alat jual. Akibatnya pengunjung yang datang untuk
MELIHAT produknya mendarat di perkenalan murid: disuruh mendaftar sebelum melihat apa pun.
Tidak ada galat, tidak ada gerbang merah — tombol paling mahal di situs mengantar orang
ke tempat yang salah, diam-diam.

## Yang dikerjakan

**1. Pintunya dibuka.** `previewAllowed()` tidak lagi memagari host. Sebagai gantinya ia
menolak satu hal yang benar-benar perlu ditolak: guru yang sudah masuk (`isTeacherRole()`),
supaya papan aslinya yang tampil, bukan demo.

**2. Papan demo terisi.** `mount()` menyemai `seedDemo()` (18 murid, dua tugas, kehadiran
14 hari, catatan wali kelas, jurnal) saat pratinjau menyala dan belum ada kelas. Demo yang
kosong bukan demo — layar "buat kelas pertamamu" justru menyembunyikan seluruh produknya.

**3. Penyimpanan dipisah, dan ini bagian yang paling penting.**
`fiezel-teacher-store.js` mendapat `setPreview()`: selama mode pratinjau, `load()`/`save()`
dialihkan ke **sessionStorage** berkunci `fiezel-teacher-v1-preview`. Alasannya bukan
kerapian: tanpa pemisahan ini, satu kunjungan iseng dari perangkat seorang guru akan
menyuntikkan "Kelas 10A" berisi 18 murid karangan ke data kelasnya yang asli, dan tidak
ada yang memberitahunya. Konsekuensi yang disengaja: apa pun yang dicoba pengunjung di
demo memang tidak bertahan setelah tab ditutup.

**4. Pita DEMO.** Baris paling atas papan menyatakan statusnya, dengan dua jalan keluar:
"Keluar dari demo" (membuang penanda + penyimpanan pratinjau) dan "Punya kode undangan?
Aktifkan akun guru" (membuka lembar akun mode guru). Naskahnya dwibahasa lewat
`guru.demo-pita` / `guru.demo-keluar` / `guru.demo-cta`.

## Tiga batas yang membuatnya aman

Ketiganya ditegakkan kode, bukan sopan santun, dan `tests/teacher-demo-preview-test.js`
memerahkan pelanggaran masing-masing:

1. **Tidak menyentuh data guru** — penyimpanan pratinjau terpisah (R4, R4b).
2. **Tidak menyentuh server** — `syncAvailable()` di store menuntut peran akun `teacher`
   yang sah; pratinjau tidak pernah punya peran itu, jadi seluruh rute sinkron mengembalikan
   `no_account` dan tidak ada permintaan jaringan yang lahir.
3. **Tidak menaikkan peran** — `fz_teacher_mode` di localStorage tidak pernah ditulis oleh
   jalur ini, jadi demo tidak bertahan melewati sesi (R5).

## Bukti

`tests/teacher-demo-preview-test.js` (baru, terdaftar di `quality.yml`) menguji tujuh
rantai R1–R7, dan setiap rantai dibuktikan merah dulu lewat mutasi: pagar host dikembalikan,
seed dibuang, tulisan demo dialihkan ke penyimpanan guru, pita dihapus, naskah th dihapus.
R4b bukan pembacaan sumber melainkan perilaku nyata — store dijalankan dengan localStorage
dan sessionStorage palsu, lalu dibuktikan tulisan demo tidak mendarat di data guru.

## Utang yang jujur

- **`website/th/index.html` belum punya panel guru sama sekali.** Rebranding "KelasKu untuk
  Guru" baru mendarat di halaman Indonesia, jadi pengunjung Thai tidak melihat tombol demo
  ini. Itu pekerjaan landing page, bukan aplikasi — tetapi selama belum dikerjakan, separuh
  audiens FIEZEL tidak tahu produk gurunya ada.
- Naskah pita demo berstatus terjemahan mesin dan perlu ditinjau penutur asli, sama dengan
  copy-th lain.
- Data demo memakai nama Indonesia (`Bu Sari`, `SMP Nusantara 1`, nama murid dari
  `seedClass`). Untuk pengunjung Thai nanti, ini perlu varian tersendiri.
