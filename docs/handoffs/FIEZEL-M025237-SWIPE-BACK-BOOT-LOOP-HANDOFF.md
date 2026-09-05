# m025-237 — Swipe back tidak lagi mem-boot ulang aplikasi ke splash

OWNER:

> "ada satu masalah yang sangat fatal pada PWA fiezel, saat user masuk ke menu, atau panel,
> setting, sesi soal listening, audio book, dan lain lain, saat melakukan swipe back, selalu
> melakukan force boot loop ke splash, dan sering berkedip blackscreen, itu sangat mengganggu
> sekali, aku ingin kamu analisa dan perbaiki sepenuhnya"

Ini kelanjutan langsung dari m025-117 (`FIEZEL-M025117-NAMA-MURID-SWIPEBACK-COREBRAIN-HANDOFF.md`).
Rilis itu memperbaiki dua pemilik riwayat yang bertabrakan dan menambahkan lapisan stage;
rilis ini memperbaiki hal ketiga yang tertinggal, dan yang paling merusak: **cara modul
riwayat membuang entri.**

Diagnosisnya sekali lagi dijalankan di peramban sungguhan (Chromium, modul back-nav asli
plus cermin `go()`/`enterStage()`/`leaveStage()`/`openModal()`/`closeModal()` dari `app.js`,
dimuat dari server lokal) sambil mencatat setiap `pushState`, `go`, `back`, dan `popstate`
berikut `history.state` yang benar-benar didarati. Membaca kode saja tidak cukup: bugnya
adalah balapan waktu, dan hanya kelihatan kalau urutan nyatanya dicetak.

---

## 1. Diagnosis

### Reproduksi

Lima alur yang owner sebut dijalankan apa adanya. Kelimanya berakhir sama:

| # | Alur | Hasil SEBELUM |
|---|---|---|
| S1 | sesi soal listening → keluar lewat nav bawah → swipe back | dokumen ter-unload |
| S2 | buka panel/pengaturan → tutup → pindah view → swipe back | dokumen ter-unload |
| S3 | Perpustakaan → rak buku → audiobook → nav bawah → swipe back | dokumen ter-unload |
| S4 | modal instruksi → mulai kuis → swipe back | dokumen ter-unload |
| S5 | "← Rak buku" → langsung buka buku lain → swipe back | dokumen ter-unload |

"Dokumen ter-unload" artinya url berubah menjadi `about:blank` — itulah **kedipan
blackscreen** yang owner lihat — lalu PWA diluncurkan ulang dan murid mendarat di splash.
Bukan "boot loop" dalam arti gelung tak berhingga, melainkan **relaunch paksa**: setiap
swipe back yang jatuh melewati dasar riwayat membunuh dokumen dan memulai aplikasi dari nol.

### Penyebab: `dismiss()` menelusuri riwayat secara asinkron

Sampai rilis ini, `dismiss()` — dipakai oleh tombol "Batal" milik modal, "← Rak buku" milik
pembaca, dan `leaveStage()` milik setiap sub-layar — membuang entri riwayat dengan
`history.go(-n)`.

Penelusuran riwayat bersifat **asinkron**. Pemanggil `dismiss()` di aplikasi ini hampir
selalu langsung mengerjakan sesuatu yang **sinkron** sesudahnya:

- `closeModal()` lalu `go(view)`
- `closeModal()` lalu `enterStage(...)`
- `leaveStage()` lalu `enterStage(...)`
- `leaveStage()` lalu `go(view)`

`pushState` yang sinkron itu memotong cabang riwayat di depan penunjuk, dan penelusuran yang
masih tertunda kemudian mendarat di entri yang **sama sekali bukan** entri yang dihitung
tumpukan. Jejak sungguhannya, dari sesi Chromium (alur S5):

```
PUSH #1                                   masuk Perpustakaan
PUSH #2                                   masuk rak buku
GO -1                        (len=4)      tombol "← Rak buku": dismiss, ASINKRON, belum diproses
PUSH #3                      (len=4)      langsung membuka pembaca — SINKRON, memotong cabang
  popstate → mendarat di state {"fiezelBackNav":1,"__n":1}   depth tumpukan = 2
```

Baris terakhir itu bencananya: tumpukan JavaScript mengira masih ada **2** entri miliknya di
riwayat, padahal penunjuk sudah duduk di entri **#1** — hanya satu entri tersisa di
bawahnya. Sejak titik itu tumpukan **lebih dalam** daripada riwayat sungguhan:

```
back #1 → popstate mendarat di state null   ← entri dokumen; layar tidak berubah
back #2 → about:blank                       ← jatuh keluar dokumen; PWA relaunch; splash
```

Penelan popstate (`noteSkip`/`consumeSkip`) tidak menolong sama sekali — ia justru menelan
`popstate` yang salah mendarat itu dan membuat modul yakin semuanya baik-baik saja.

Pola "tutup lalu langsung buka sesuatu yang lain" ada di hampir setiap layar, jadi bug ini
bisa dipicu dari mana pun. Itu menjelaskan kata **"selalu"** dalam laporan owner.

### Penyebab kedua: `dropStages()` meninggalkan entri lapisan mati

`go()` memanggil `dropStages()` pada setiap perpindahan view. Fungsi itu mengosongkan
`stageStack` tetapi **tidak** memberi tahu modul back-nav, jadi entri lapisan milik stage
yang layarnya sudah hilang tetap tinggal di tumpukan. Entri mati itu harus dilewati satu per
satu oleh tekanan kembali berikutnya, dan sampai rilis ini setiap entri mati memakan satu
`history.back()` tambahan — riwayat yang seharusnya dipakai untuk mundur ke layar sungguhan
justru habis dipakai melewati layar yang sudah tidak ada.

Ini sengaja dibiarkan di m025-117 (gate-nya bahkan menuntut `dropStages` tidak menyentuh
riwayat) karena alasannya benar pada saat itu: `dismiss()` yang asinkron memang tidak boleh
dipanggil tepat sebelum `pushState`. Setelah `dismiss()` menjadi sinkron, alasan itu hilang
dan tinggal kerugiannya.

---

## 2. Perbaikan — riwayat berhenti dipakai sebagai tempat penyimpanan

Kedalaman layar sekarang hidup **hanya** di tumpukan JavaScript. Riwayat sungguhan dipakai
sebagai **satu entri penanda** yang selalu duduk tepat satu langkah di atas entri dokumen:

```
[entri dokumen] [penanda]   ← penunjuk selalu di sini selama masih ada layar
```

- Navigasi maju menambah entri di tumpukan. Penanda sudah ada, jadi **tidak** ada
  `pushState` kedua.
- Tekanan kembali menjatuhkan penunjuk ke entri dokumen. Modul mengerjakan **tepat satu**
  tindakan, lalu **memasang ulang** penanda.
- `dismiss()` menjadi murni bedah tumpukan: **nol** sentuhan History API.

Konsekuensinya, dan inilah inti perbaikannya:

1. **Kedalaman riwayat KONSTAN.** Tidak ada lagi yang bisa didesinkronisasi, karena tidak
   ada lagi hitungan yang perlu dicocokkan.
2. **Balapan itu tidak bisa diwakili lagi.** Tidak ada operasi riwayat asinkron yang kita
   mulai sendiri, jadi tidak ada yang bisa dibalap oleh `pushState` sinkron sesudahnya.
3. **Selama masih ada satu layar di tumpukan, tekanan kembali MUSTAHIL keluar dokumen.**
4. Batas `pushState` Safari (100 panggilan / 30 detik) menjauh: satu sesi belajar mendorong
   satu entri per tekanan kembali, bukan satu entri per layar.

Entri mati sekarang dilewati **gelung biasa di dalam satu handler** (nol penelusuran
riwayat), dan `dropStages()` ikut membuang entri lapisannya lewat `dismiss()` yang sudah
sinkron — jadi keluar dari sesi lewat navigasi bawah tidak lagi meninggalkan sampah.

### Keluar aplikasi: pola tekan-lagi

Karena penanda selalu terpasang, tekanan kembali yang **menghabiskan** tumpukan tidak
langsung menutup PWA: ia melepas penanda, memanggil hook `onExit`, dan menyerahkan keputusan
ke tekanan **berikutnya**. `app.js` menyambungkan hook itu ke toast
"Tekan kembali sekali lagi untuk keluar dari FIEZEL." (Thai: "กดย้อนกลับอีกครั้งเพื่อออกจาก FIEZEL").

Ini perubahan perilaku yang disengaja dan perlu dicoba OWNER: satu gestur tepi yang meleset
di beranda tidak lagi bisa membuang sesi belajar murid, dan polanya sudah dikenal murid
Android. Murid tetap **tidak** terkurung — tekanan kedua benar-benar keluar.

---

## 3. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `features/ui/fiezel-back-nav.js` | model riwayat penanda; `dismiss()` tanpa History API; `handlePop()` gelung sinkron; `holdMarker()`/`notifyExit()`; buang `SKIP_WINDOW_MS`/`noteSkip`/`consumeSkip` dan `now()` yang jadi mati |
| `app.js` | `dropStages()` membuang entri lapisannya; hook `onExit` → toast |
| `features/i18n/copy-id-app-c.js`, `copy-th-app-c.js` | kunci `nav.tekan-lagi-untuk-keluar` |
| `id-golden-baseline.json` | baseline emas Indonesia ditulis ulang untuk satu literal baru itu (`--write-baseline`, di commit yang sama) |
| `tests/back-nav-test.js` | gerbang baru + gerbang lama yang mengunci mekanisme rusak diperbarui |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` | m025-236 → m025-237 lewat `node tools/bump-build.mjs` |

`features/neural-voice/fiezel-diag-panel.js` tersentuh **hanya** oleh nomor build
(`DIAG_BUILD`), karena `bump-build.mjs` menulis keempat tempat sekaligus. Tidak ada logika
neural-voice yang berubah di rilis ini — tetapi sentuhan itulah yang membuat A13 Handoff
Keeper menuntut dokumen ini, dan tuntutannya benar: rilis yang mengubah bentuk riwayat
seluruh aplikasi memang layak ditulis.

## 4. Gate

`tests/back-nav-test.js` sekarang mengunci kontrak barunya, termasuk tiga gerbang yang menahan
persis penyebab boot loop:

- `dismiss() TIDAK BOLEH menyentuh History API sama sekali` — penelusuran asinkron di situ =
  boot loop ke splash;
- `kedalaman riwayat KONSTAN berapa pun dalamnya layar` — 10 lapisan bersarang tetap satu
  entri penanda;
- `tekanan kembali tidak pernah melepas penanda selama masih ada layar` — satu cabang yang
  lupa memasangnya ulang sudah cukup untuk mengembalikan bug ini;
- `tutup-lalu-langsung-buka: pola yang dulu menjatuhkan murid keluar dokumen` — urutan persis
  dari jejak Chromium di bagian 1.

Gerbang lama yang mengunci mekanisme rusak diperbarui **beserta alasannya** (bukan dihapus):
`popstate` sekarang memang mendorong entri, dan yang dijaga adalah bahan kedua dari gelung
tak berujung — jalur kembali tidak boleh **menelusuri** riwayat.

Seluruh daftar gerbang `quality.yml` (286 langkah) dijalankan lokal. Hijau kecuali lima yang
**juga merah pada `main` bersih** di lingkungan ini, diverifikasi dengan `git stash`:
`content-adoption-test`, `ui-render-audit-test` (butuh peramban/jaringan),
`fiezel-evolution-loop-test`, `release-audit-gate-test`, dan `tools/fiezel-health-probe.mjs`
(probe jaringan). Tidak satu pun menyentuh berkas yang diubah rilis ini.

`audiobook-safari` tetap merah karena `vendor/supertonic-3` yang dihapus di m025-100 — sudah
dicatat sebagai rusak permanen di handoff m025-117 bagian akhir, dan rilis ini tidak
menyentuh `vendor/` sama sekali.

## 5. Verifikasi

Kelima alur di bagian 1, dijalankan ulang di Chromium sesudah perbaikan:

| # | Hasil SESUDAH |
|---|---|
| S1–S5 | mundur layar demi layar sampai beranda; `history.length` tidak berubah; dokumen hidup |

Uji tekanan: **60 siklus** "tutup lalu langsung buka" berturut-turut (`enterStage` →
`leaveStage` → `openModal` → `closeModal` → `go`). `history.length` **tetap 3** dari awal
sampai akhir, dan 40 tekanan kembali beruntun sesudahnya tidak pernah meng-unload dokumen.
Sebelum perbaikan, satu siklus saja sudah cukup untuk mendesinkronisasi.

## Status rilis — menunggu OWNER

Kode dan gerbang selesai. Yang **belum** ada, dan tidak boleh ditulis dari sisi yang
mengerjakan patch, adalah bukti perangkat sungguhan: emulasi Chromium membuktikan bentuk
riwayatnya benar, tetapi ia bukan gestur jari di PWA terpasang.

**Yang dibutuhkan dari OWNER:** coba di perangkat, terutama —

1. kelima alur di bagian 1 (menu, panel/pengaturan, sesi listening, audiobook, kuis dari modal);
2. tekan kembali berulang kali sampai beranda, lalu sekali lagi: toast "Tekan kembali sekali
   lagi untuk keluar" harus muncul, dan tekanan sesudahnya benar-benar menutup aplikasi;
3. pastikan tidak ada layar yang bisa dimasuki tetapi tidak bisa ditinggalkan.

**Langkah berikutnya sesudah OWNER menerima:** tidak ada pekerjaan lanjutan yang tertunda
dari rilis ini. Kalau masih ada satu layar pun yang tekanan kembalinya terasa salah, yang
dicari adalah pemanggil yang membuka layar TANPA `enterStage`/`pushLayer` — bukan lagi modul
riwayatnya, karena bentuk riwayatnya sekarang tidak bisa desinkron.
