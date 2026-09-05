# m025-238 — Swipe back di iOS berhenti menelan tarikan ibu jari

OWNER, sesudah m025-237 terbit:

> "splash loopnya memang sudah hilang, tapi masalahnya tetap ada, ketika user melakukan swipe
> back, sekarang ada jeda sekitar 10 detik, itu sangat mengganggu, tapi kalau user berpindah
> halaman dengan menekan taskbar navigasi, itu lancar dan mulus, aku ingin swipeback juga
> lebih mulus dari pada itu"

Dua keterangan tambahan yang menentukan seluruh diagnosis, ditanyakan langsung ke OWNER
sebelum satu baris pun diubah: perangkatnya **iOS**, dan bentuk jedanya **"diam, lalu
tiba-tiba pindah"** (bukan beku, bukan animasi yang tersendat).

---

## 1. Yang diukur lebih dulu — dan yang TIDAK ditemukan di sana

Godaan terbesar di sini adalah menyalahkan kode riwayat yang baru saja diganti di m025-237.
Karena itu ia diukur dulu, di Chromium sungguhan, memuat `index.html` asli dengan seluruh
data produksi, dengan `Emulation.setCPUThrottlingRate` 6× untuk meniru ponsel kelas bawah:

| Yang diukur | Hasil |
|---|---|
| `handlePop()` (seluruh keputusan jalur kembali) | **1–7 ms** |
| Satu perpindahan layar penuh (`go()` → DOM berubah) | 116–227 ms |
| Jalur nav bawah vs jalur kembali | **identik** |
| Jeda 10 detik | **tidak tereproduksi** |

Tidak ada apa pun di jalur riwayat yang bisa memakan 10 detik. Urutan `pushState` di dalam
`popstate` juga diuji terpisah (dorong-lalu-transisi vs transisi-lalu-dorong vs tanpa dorong):
ketiganya 550–620 ms, tidak ada bedanya.

Kesimpulannya: yang dialami OWNER **bukan lambat**. Sesuatu yang lambat akan sama lambatnya
di kedua jalur, dan taskbar terbukti mulus. "Diam, lalu tiba-tiba pindah" adalah bentuk khas
**masukan yang hilang** — tarikan yang tidak pernah sampai menjadi perintah.

## 2. Penyebab: ambang gestur tepi menolak tarikan ibu jari yang sesungguhnya

Di iOS mode standalone, Safari **tidak** menyediakan gestur swipe-back — itu gestur milik
chrome browser, dan di PWA terpasang chrome itu tidak ada. Jadi yang dipakai adalah gestur
tepi milik `features/ui/fiezel-back-nav.js`. (Di Android tidak: `needsEdgeSwipe()` sengaja
memagarinya, karena gestur sistem Android sudah memanggil `history.back()` sendiri.)

Pengenal gesturnya dijalankan apa adanya terhadap lintasan-lintasan yang benar-benar
dilakukan jari:

```
JALAN    tarikan lurus sempurna dari x=6
DITELAN  busur ibu jari x6->x206 dengan naik 40px      <- tarikan PALING NORMAL
DITELAN  mulai 26px dari tepi
DITELAN  mulai 30px dari tepi
JALAN    tarikan miring 45 derajat
```

### Penyebab utama: penyerahan vertikal yang permanen dan terlalu dini

```js
if (Math.abs(dy) > VERTICAL_SLOP_PX && Math.abs(dy) >= Math.abs(dx)) { tracking = false; return false; }
```

Ibu jari berputar pada pangkalnya, jadi tarikan "mendatar" yang sesungguhnya selalu berupa
**busur**: di awal tarikan jari sudah naik ~30px sementara `dx` baru ~14px. Syarat di atas
terpenuhi **pada gerakan pertama**, dan penyerahannya **permanen** — `tracking` mati dan
tidak bisa dijemput lagi, sehingga sisa tarikan sejauh 200px ke kanan tidak berarti apa-apa.

Dari sisi murid: gesturnya benar, layarnya diam. Ia menarik lagi, diam lagi, sampai kebetulan
ada satu tarikan yang cukup lurus untuk lolos — lalu layar tiba-tiba pindah. **Itulah "jeda
sekitar 10 detik".** Bukan satu jeda; belasan tarikan yang hilang beruntun.

### Penyebab kedua: zona tepi 24px

Titik sentuh ibu jari di iPhone gampang mendarat 26–30px dari tepi walau murid merasa menarik
"dari pinggir". Pada 24px tarikan itu ditolak **mentah-mentah di sentuhan pertama** — tidak
ada apa pun di layar yang menjelaskan kenapa.

### Penyebab ketiga: jeda antar-gestur 450ms

Sesudah satu tarikan berhasil, tarikan berikutnya dalam 450ms **ditelan diam-diam**. Di
perangkat yang menggambar ulang layar dalam 200–400ms, murid yang menarik lagi karena
layarnya belum berubah persis jatuh di dalam jendela itu.

## 3. Perbaikan

| | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| penyerahan vertikal | `\|dy\| >= dx` | `\|dy\| > dx * 2,5` | busur ibu jari bukan gulir; gulir sungguhan punya dx nyaris nol |
| zona tepi | 24px | 32px | titik sentuh ibu jari mendarat 26–30px |
| rasio mendatar | 1,6 | 1,2 | tarikan mendatar sungguhan selalu melengkung |
| jeda antar-gestur | 450ms | 250ms | perlindungan sesungguhnya ada di `fired`/`tracking`, bukan di jeda |

Yang **tidak** disentuh, dan itu disengaja: `scrollsHorizontally()`. Tarikan yang dimulai di
dalam carousel, blok kode, atau tabel lebar tetap tidak dibajak — di sana tarikan mendatar
sudah punya arti sendiri.

Hasil sesudahnya, pagar dua arah:

```
JALAN    lurus / busur ibu jari / mulai 26px / mulai 30px / miring 45 derajat
DITELAN  gulir vertikal di dekat tepi kiri
DITELAN  tarikan dari tengah layar (x=200)
DITELAN  menarik ke KIRI dari tepi kiri
```

## 4. Ikut diperbaiki: `state.view` tertinggal satu frame di belakang transisi

Ditemukan saat mengukur, dan berdiri sendiri sebagai cacat.

Sampai rilis ini satu-satunya tempat `state.view` berubah adalah `swap()`, yang dijalankan
**asinkron** oleh `document.startViewTransition()`. Jalur maju tidak peduli — ia hanya
*menulis* `state.view`. Jalur kembali **membacanya** untuk dua keputusan:

- `entry.kind === 'layer' && entry.view === view` — apakah lapisan ini masih di layar;
- `target && target !== view` — apakah perlu berpindah view.

Dengan `state.view` yang tertinggal, keduanya diputuskan atas layar yang **salah**: lapisan
yang masih hidup terbaca mati, dan entri yang tujuannya beda terbaca sama. Dua-duanya
berakhir sebagai tekanan kembali yang tidak mengubah apa pun di layar.

Terukur langsung: sesudah satu tekanan kembali mendarat di beranda, `currentView()` masih
menjawab `'vocab'`.

`state.view` kini dinaikkan ke `go()` sendiri, sebelum transisi dimulai. Aman, dan alasannya
harus dibaca sebelum ada yang menurunkannya kembali: yang menggambar ulang DOM **hanya**
`render()`, dan `render()` tetap di dalam callback. Cuplikan layar LAMA yang diambil
`startViewTransition` karena itu tetap utuh — yang berubah hanya kapan sumber kebenaran ikut
maju. `pushBackNavView()` tetap dipanggil **sebelumnya**, sebab yang ia rekam adalah view ASAL.

## 5. Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `features/ui/fiezel-back-nav.js` | empat ambang gestur tepi + `VERTICAL_DOMINANCE` |
| `app.js` | `state.view` naik ke luar callback transisi |
| `tests/back-nav-test.js` | empat gerbang baru |
| `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json` | m025-237 → m025-238 lewat `node tools/bump-build.mjs` |

`features/neural-voice/fiezel-diag-panel.js` tersentuh **hanya** oleh nomor build
(`DIAG_BUILD`), sama seperti m025-237 — itulah yang membuat A13 Handoff Keeper menuntut
dokumen ini. Nol logika neural-voice berubah.

## 6. Gerbang

Empat gerbang baru di `tests/back-nav-test.js`, **semuanya dibuktikan MERAH pada ambang lama**
(dijalankan dengan konstanta lama dipasang kembali) dan hijau pada ambang baru:

- `busur ibu jari dari tepi kiri TETAP dibaca sebagai kembali`
- `tarikan yang dimulai 26-30px dari tepi tetap dibaca sebagai kembali`
- `gulir vertikal sungguhan TETAP bukan gestur kembali` — pagar arah sebaliknya, supaya
  melonggarkan busur tidak berubah menjadi membajak gulir halaman
- `jeda antar-gestur tidak boleh menelan tarikan kedua yang disengaja`

Seluruh daftar `quality.yml` (286 langkah) dijalankan lokal: hijau kecuali lima yang **juga
merah pada `main` bersih** di lingkungan ini, diverifikasi dengan `git stash`:
`content-adoption-test`, `ui-render-audit-test`, `fiezel-evolution-loop-test`,
`release-audit-gate-test`, `tools/fiezel-health-probe.mjs`. Tidak satu pun menyentuh berkas
yang diubah rilis ini.

## Status rilis — menunggu OWNER

**Batas yang ditulis terbuka:** jeda 10 detiknya sendiri **tidak pernah direproduksi** di
Chromium, bahkan dengan CPU dicekik 6×. Yang direproduksi adalah tarikan-tarikan yang
ditelan, dan bentuknya cocok persis dengan "diam, lalu tiba-tiba pindah" di iOS. Emulasi
tidak bisa membuktikan rasa ibu jari di kaca; hanya perangkat yang bisa.

**Yang dibutuhkan dari OWNER:** coba di iPhone terpasang —

1. tarik dari tepi kiri dengan cara biasa (melengkung, tidak perlu lurus) — layar harus
   mundur satu tingkat setiap tarikan, tanpa tarikan yang hilang;
2. tarik dua kali beruntun cepat — tarikan kedua tidak boleh ditelan;
3. gulir halaman ke atas/bawah dimulai dari dekat tepi kiri — TIDAK boleh memundurkan layar;
4. gulir carousel/level mendatar yang dimulai dekat tepi kiri — harus tetap menggulung isinya.

**Langkah berikutnya kalau (1) atau (2) masih gagal:** ambangnya bukan lagi tersangka utama;
yang dicari berikutnya adalah biaya `render()` di perangkat itu — kandidat konkretnya `save()`
yang berjalan sinkron di dalam callback transisi pada setiap perpindahan layar.
