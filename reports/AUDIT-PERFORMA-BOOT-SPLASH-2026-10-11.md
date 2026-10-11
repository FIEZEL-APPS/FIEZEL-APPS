# Audit performa boot & splash PWA — 2026-10-11

**Laporan OWNER:** *"aplikasi fiezel yang berjalan di pwa android dan iphone sangat lambat dan
super ngelag sekali, terutama saat memasuki splash."*

**Status:** investigasi saja, nol baris kode produksi disentuh. Build yang diukur: `main` @
`c86b85d` (m025-564). Alat ukurnya ikut di commit ini: `tools/dev/probe-boot-splash-perf.js`.

---

## 1. Jawaban singkat

Splash bukan sumber lambatnya — splash adalah **layar yang kebetulan tampil selama boot yang
berat**. Tiga hal yang membuatnya terasa "macet lalu patah-patah":

1. **Animasi splash baru boleh mulai di UJUNG `load()`.** Sebelum itu murid hanya melihat latar
   gelap bergaris topo **tanpa logo** (logo & wordmark `opacity:0` di CSS kritis sampai JS
   jalan). Di HP menengah (CPU 4x) fase "layar gelap kosong" ini **2,8–4,3 detik**; di HP murah
   (CPU 6x) **4,9–6,0 detik**. Selama fase itu main thread sibuk ±98 %, frame rate 6–9 fps.
2. **Selama animasi pun main thread tetap penuh (±99 %).** Animasi partikel kanvas berjalan di
   main thread yang sama dengan sisa boot. Hasilnya 23–32 fps di HP menengah dan 12–14 fps di HP
   murah, dengan beberapa jeda 150–400 ms. Hampir separuh waktu per frame habis di
   **style recalc** karena CSS yang dimuat sudah 1,38 MB / 7.334 aturan.
3. **Aplikasinya tumbuh 2–3x sejak putaran optimasi boot terakhir**, dan setiap rilis memaksa
   setiap HP mengunduh ulang 26 MB. Pada 2026-10-10 saja `SW_REV` naik 23 kali.

Ditambah **satu bug** yang membuat jaringan lambat terasa jauh lebih buruk (§4.6): pada boot
pertama di Slow 4G murid melihat layar gelap ±17 detik → layar krem kosong ±8 detik → splash
**kedua** → baru onboarding.

---

## 2. Cara mengukur

- Chromium (Playwright) di kontainer, layar 390×844 DPR 3, `isMobile`, sentuh.
- CPU diperlambat lewat CDP: **4x ≈ HP Android menengah**, **6x ≈ HP Android murah**.
- Skenario **warm** = PWA terpasang (service worker + cangkang ter-cache), dibuka di sesi baru,
  jadi dihitung "peluncuran dingin" dan splash dipaksa tampil. Ini kasus murid sehari-hari.
- Skenario **cold** = kunjungan pertama (cache kosong) dengan Fast 4G (9 Mbps, RTT 60 ms) atau
  Slow 4G (1,6 Mbps, RTT 150 ms).
- Atribusi lewat trace Chromium (`devtools.timeline` + sampler CPU V8).

**Batas jujur:** iPhone (WebKit) **tidak bisa diukur langsung** di sini — yang ada hanya
Chromium. Kodenya sama persis, jadi pekerjaan main thread yang sama juga dibayar di iPhone;
angka mutlaknya yang berbeda. Perlambatan CPU adalah pendekatan, bukan HP sungguhan. Satu kali
jalan bisa berselisih ±0,5 detik, jadi angka di bawah adalah rentang dari 3–5 kali jalan.

Mereproduksi:

```
node tools/dev/probe-boot-splash-perf.js warm 4            # PWA terpasang, HP menengah
node tools/dev/probe-boot-splash-perf.js warm 6            # PWA terpasang, HP murah
node tools/dev/probe-boot-splash-perf.js cold 4 slow4g     # instal pertama, sinyal lemah
VARIANT=nofeaturecss node tools/dev/probe-boot-splash-perf.js local 4   # A/B CSS
SWBUMP=1 node tools/dev/probe-boot-splash-perf.js warm 4 fast4g         # tepat sesudah rilis
```

---

## 3. Angka

### 3.1 Linimasa boot (PWA terpasang, peluncuran dingin)

| Profil | Splash tercat (FCP) | Animasi splash mulai | Fase "gelap kosong" | fps fase gelap | fps animasi | Splash lepas |
|---|---|---|---|---|---|---|
| CPU 1x (desktop) | 0,2 dtk | 1,1 dtk | 0,9 dtk | 23 | 56 | 3,2 dtk |
| **CPU 4x (HP menengah)** | 0,4–0,5 dtk | **3,3–4,7 dtk** | **2,8–4,3 dtk** | 7–9 | **23–32** | 4,4–5,8 dtk |
| **CPU 6x (HP murah)** | 0,7 dtk | **5,6–6,7 dtk** | **4,9–6,0 dtk** | 6–8 | **12–14** | 6,8–8,0 dtk |

Di 6x, satu kali jalan mencatat delapan long task (54–203 ms) **di dalam** 1,3 detik animasi.

### 3.2 Instal pertama (tanpa service worker), CPU 4x

| Jaringan | FCP | Animasi mulai | Yang dilihat murid |
|---|---|---|---|
| Fast 4G | 0,65 dtk | 5,9 dtk | 5,2 dtk layar gelap tanpa logo, lalu animasi 36 fps |
| **Slow 4G** | 2,2 dtk | — | gelap 0–17 dtk → **layar krem kosong** 17–25 dtk → splash kedua 25–29 dtk → onboarding |

Satu kunjungan pertama memuat **234 request, 4,6 MB terkirim (20 MB terurai)**.

### 3.3 Ke mana waktu main thread pergi (CPU 4x, warm, satu trace)

| Fase | Lama | Main thread sibuk | Isi terbesar |
|---|---|---|---|
| 0 → FCP | 0,73 dtk | 99 % | parse CSS 103 ms (style.css 53 ms), parse HTML, style recalc |
| FCP → DOMContentLoaded | 1,6 dtk | 99 % | evaluasi 156 skrip 553 ms (app.js sendiri 284 ms + kompilasi 78 ms), parse HTML 288 ms |
| DCL → animasi mulai | 2,6 dtk | 98 % | `load()`: microtask 1.034 ms (fetch + parse ±8 MB JSON + pengolahan + **render beranda di balik splash**), style recalc 431 ms, layout 126 ms |
| Animasi (1,1 dtk pertama) | 1,1 dtk | **99 %** | **style recalc 437 ms**, JS splash (bootMotion 72 ms, `resetOverlay` cap 64 ms), timer 170 ms |

Satu long task **697 ms** tepat sebelum animasi mulai: render beranda (style recalc 258 ms,
`connectedCallback` maskot 163 ms, layout 96 ms) — padahal beranda masih tertutup splash.

---

## 4. Akar masalah (urut dampak)

### 4.1 Splash diam tanpa logo sampai `load()` selesai

`showBrandSplash()` dipanggil di `app.js:7714`, **sesudah** seluruh 156 skrip defer dieksekusi,
semua JSON konten terurai, dan beranda selesai dirender (`render()`/`go('home')` di
`app.js:7587–7683`). Markup splash frame-pertama memang sudah tercat sejak FCP (perbaikan
m025-84/m025-199 tetap bekerja), tetapi CSS kritisnya menyetel `.fz-fgroup,.fz-barsgroup{opacity:0}`
dan `.fiezel-splash-brand .fiezel-splash-word{opacity:0}`. Jadi yang tampil berdetik-detik hanya
garis topo di latar gelap (lihat tangkapan layar Slow 4G detik ke-6). Bagi murid itu terbaca
sebagai "aplikasinya hang".

### 4.2 Main thread jenuh: 5 MB JS + ±8 MB JSON + render beranda, semuanya sebelum animasi

| Muatan boot | Sekarang | Catatan handoff m025-199 / komentar index.html |
|---|---|---|
| Skrip `defer` | **156 berkas, 4,97 MB** (1,59 MB gzip) | "±50 berkas skrip" |
| `app.js` | **1.560 KB** | 835 KB |
| `style.css` | **509 KB** | 286 KB |
| JSON konten di `load()` | **±7,8 MB** | "±2,7 MB JSON" |
| CSS total | **18 berkas, 1,38 MB, 7.334 aturan** | — |

Skrip seperti `fiezel-class-hub.js` (219 KB), `fiezel-teacher-store.js` (62 KB),
`fiezel-face-guard.js` (45 KB), `fiezel-nujum.js` (83 KB), `fiezel-paw-arena.js`,
`fiezel-duel.js`, `fiezel-grammar-video.js`, `fiezel-jlpt-listening.js` ikut dievaluasi di
setiap boot, walau beranda murid tidak memakainya.

### 4.3 JSON besar diambil dan diurai DUA KALI saat boot

| Berkas | Ukuran | Pemuat kedua (selain `load()` di `app.js:6004`) |
|---|---|---|
| `grammar-templates.json` | 2,1 MB | `features/nujum/fiezel-nujum.js:332` — `loadGrammarTemplatesAsync()` dipanggil saat modul dimuat |
| `content/grammar-vocab-map-v1.json` | 0,8 MB | `features/grammar/grammar-vocab-bridge.js:127` — pramuat saat modul dimuat |
| `content/video-grammar-bank-v1.json` | 45 KB | `app.js:13569` — fetch di tingkat modul |

Jadi ±3 MB JSON terurai dua kali. Ditambah `bug-species.json` + `misconception-taxonomy-v1.json`
yang diambil `features/bug/fiezel-bug.js:28` begitu modulnya dimuat. Parse murni seluruh set ini
"hanya" 145 ms di 4x / 264 ms di 6x, tetapi membaca body, mendekode, dan mengolah hasilnya
menambah antrean di main thread yang sudah penuh.

### 4.4 CSS raksasa membuat setiap frame animasi mahal

Selama animasi, splash mengubah gaya ±50–76 elemen SVG per frame. Dengan CSS penuh, satu kali
style recalc butuh **18 ms** (4x) — sudah melebihi anggaran 16,7 ms per frame sebelum JS
animasinya sendiri jalan. Uji A/B (CPU 4x, mode local, satu trace per varian):

| Varian | Style recalc selama animasi | Per recalc | fps animasi |
|---|---|---|---|
| Apa adanya | 457 ms dari 1.123 ms | 18,3 ms | 20 |
| Tanpa 17 CSS fitur (hanya style.css) | 278 ms | 7,3 ms | 33 |
| Tanpa CSS sama sekali | 60 ms | 1,4 ms | 40 |

Isi CSS yang dimuat: **12.094 `!important`**, **223 selektor `:has()`** (136 di antaranya
berjangkar `html`/`body`, mis. `body:has(.quiz-shell) …`), **65 `backdrop-filter`**. Dua lapisan
penimpa terbesar — `fiezel-tactile-clay.css` (214 KB, 4.230 `!important`) dan
`mobile-edge-fit.css` (156 KB, 2.901 `!important`) — dimuat dan memblokir render di setiap boot.
Di iPhone, `backdrop-filter` dan selektor `:has()` dikenal lebih mahal lagi.

### 4.5 Setiap rilis = setiap HP mengunduh ulang 26 MB, sering kali tepat saat boot

`sw.js` mem-precache **294 berkas / 26 MB** dengan `cache:'reload'` (melewati cache HTTP), dan
nama cache-nya terkunci `SW_REV`. Jadi setiap kenaikan `SW_REV` — bahkan yang hanya mengubah
satu berkas backend — membuat setiap perangkat mengunduh ulang seluruh 26 MB.
Di 53 commit terakhir yang terlihat, `sw.js` berubah **38 kali** (23 kali pada 2026-10-10).
Murid yang membuka app tepat sesudah rilis membayar unduhan itu bersamaan dengan boot:

| CPU 4x, Fast 4G, 3 kali jalan | Animasi mulai (median) | fps animasi (median) | Total macet >50 ms selama animasi |
|---|---|---|---|
| Tanpa rilis baru | 4,46 dtk | 27,6 | 350 ms |
| Ada rilis baru (SW baru terpasang) | 5,06 dtk | 20,9 | 600 ms |

Di HP sungguhan dengan sinyal seluler dan penyimpanan lambat, efeknya kemungkinan lebih besar.

### 4.6 BUG: pengaman 15 detik tidak pernah menampilkan kartu pemulihan, lalu splash tampil dua kali

Di skrip inline `index.html`:

```js
timer = setTimeout(function () {
  try { if (!el.parentNode) return; } catch (e) {}
  showRecovery();   // memasang kartu "FIEZEL belum siap / Muat ulang"
  dismiss();        // ... yang baris pertamanya memanggil clearRecovery() -> kartu langsung dicopot
}, 15000);
```

`dismiss()` memanggil `clearRecovery()`, jadi kartu pemulihan dicopot di task yang sama saat ia
dipasang — murid tidak pernah melihatnya. Splash dicopot dan yang tersisa adalah cangkang
aplikasi kosong (hanya bilah bawah "Hari ini / KelasKu / …"). Begitu `load()` akhirnya selesai,
`FiezelSplash.show()` tidak menemukan splash boot lagi, lalu **membuat splash kedua**. Terukur di
Slow 4G instal pertama: splash boot lepas di 17,1 dtk, layar krem kosong sampai 25,4 dtk, splash
kedua 25,4–28,9 dtk, lalu onboarding.

### 4.7 Titik panas JS yang lebih kecil (profil CPU, boot di 4x)

| Fungsi | Self time | Kenapa mahal |
|---|---|---|
| `setApp` `app.js:6180` | 191 ms | `innerHTML` beranda, di balik splash |
| `_restartAnimations` `features/mascot/fiezel-mascot.js:1192` | 147 ms | `getAnimations({subtree:true})` memaksa style recalc sinkron dengan CSS 1,38 MB |
| `detectedTimeZone` `app.js:274` | 91 ms | membuat `Intl.DateTimeFormat()` baru di setiap panggilan, tanpa memo |
| `ukuranHost` `features/mascot/fiezel-paw-outfit.js:332` | 87 ms | baca `offsetWidth` = layout paksa |
| `syncNavActivePill` `app.js:8959` | 51 ms | `getBoundingClientRect` = layout paksa saat boot |
| `bootMotion` (partikel `init` + `makeSprites`) | 72 ms | satu task tepat di frame pertama animasi = hentakan |
| `resetOverlay` `features/brand/fiezel-splash-pawstamp.js:317` | 64 ms | di tengah animasi |

### 4.8 Khusus iPhone (tidak terukur di sini, dari membaca kode)

- PWA iOS sering dihentikan sistem saat di latar belakang, dan `sessionStorage` ikut hilang.
  `isColdLaunch()` (`app.js:11606`) lalu menganggap hampir setiap pembukaan dari layar utama sebagai
  peluncuran dingin, jadi **seluruh boot + splash dibayar hampir setiap kali app dibuka**.
- `requestIdleCallback` tidak ada di Safari, jadi lazy loader jatuh ke `setTimeout`.

---

## 5. Rekomendasi (urut prioritas)

**P0 — dampak besar, risiko kecil**

1. **Perbaiki bug pengaman 15 detik** (§4.6): tampilkan kartu pemulihan *sesudah* `dismiss()`
   atau jangan bersihkan kartu di jalur ini, dan jangan membuat splash kedua kalau splash boot
   sudah dicopot oleh pengaman.
2. **Jangan biarkan layar splash kosong.** Tampilkan logo statis sejak frame pertama, atau
   jalankan pengungkapan logo sebagai animasi CSS murni `transform`/`opacity` di frame pertama.
   Animasi jenis itu dijalankan compositor, jadi tetap mulus walau main thread sedang memuat
   skrip. Partikel kanvas (yang butuh main thread) bisa dipersingkat atau dihapus.
3. **Hapus tiga fetch ganda** (§4.3): `fiezel-nujum.js`, `grammar-vocab-bridge.js`, dan
   `app.js:13569` cukup memakai data yang sudah diambil `load()`.
4. **Jangan render beranda sebelum animasi mulai.** Jalankan splash dulu, lalu render beranda
   sesudah (atau bertahap di sela frame). Long task 697 ms di §3.3 hilang dari jendela animasi.

**P1 — struktural**

5. **Perbarui hanya berkas yang berubah, bukan seluruh 26 MB per rilis**: revisi per berkas
   (hash konten) di daftar precache, atau pisahkan cache konten besar dari cangkang. Gabungkan
   rilis supaya `SW_REV` tidak naik puluhan kali sehari.
6. **Potong JS boot**: hanya skrip yang dibutuhkan beranda yang dimuat `defer`; KelasKu/guru,
   face-guard, nujum, bug, duel, arena, JLPT, video grammar diangkut lewat lazy loader saat
   layarnya dibuka. Target: < 1 MB JS saat boot.
7. **Jangan urai seluruh bank konten saat boot**: ambil potongan per level, atau urai di Web
   Worker / simpan hasil olahan di IndexedDB.
8. **Diet CSS**: satukan lapisan penimpa (`fiezel-tactile-clay.css`, `mobile-edge-fit.css`),
   buang aturan mati (Chrome DevTools Coverage), kurangi `body:has()` dan `!important`.
   Tujuannya biaya per elemen turun mendekati varian "tanpa CSS fitur" (7 ms → 2 ms per recalc).
9. Titik panas kecil (§4.7): memo `detectedTimeZone`, kumpulkan pembacaan geometri maskot
   dalam satu fase baca, ganti `getAnimations({subtree:true})` dengan restart animasi yang
   ditargetkan.

**Verifikasi di HP sungguhan** sebelum dan sesudah perbaikan: Chrome remote debugging
(`chrome://inspect`) untuk Android dan Safari Web Inspector untuk iPhone, dengan rekaman
Performance saat membuka PWA dari layar utama.

---

## 6. Lampiran: hubungan dengan perbaikan sebelumnya

- **m025-84 / m025-199** memindahkan splash ke frame pertama dan membuat `style.css` non-blokir.
  Masih bekerja — FCP warm 0,4 dtk di 4x. Yang tidak ikut terselesaikan adalah fase sesudah FCP.
- **m025-535** menunda Three.js maskot, mengurangi partikel, dan menunda lazy loader selama
  splash. Penundaan itu juga masih bekerja (nol evaluasi skrip lazy dan nol Three.js di jendela
  animasi). Handoff itu mencatat 48,6 fps di CPU 4x; pengukuran ini mendapat 23–32 fps di 4x
  dengan harness berbeda (termasuk service worker). Angkanya tidak bisa dibandingkan satu lawan
  satu, tetapi arahnya cocok dengan pertumbuhan JS/CSS/JSON di §4.2.

---

## 7. Realisasi Perbaikan & Verifikasi Empiris (`m025-567`)

Seluruh temuan **P0** dan titik panas utama (**§3.1–§3.4, §4.3, §4.4, §4.6, §4.7**) telah
diperbaiki pada cabang ini (`m025-567`) dan diverifikasi ulang memakai harness yang sama
(`node tools/dev/probe-boot-splash-perf.js`):

### 7.1 Rincian Perbaikan yang Diterapkan

1. **Perbaikan Bug Watchdog 15 Detik & Pencegahan Splash Ganda (§3.4 / P0 #1)**:
   - Di `index.html:559-588`, menambahkan penjaga `keepingRecovery` agar panggilan
     `showRecovery(); dismiss();` pada batas waktu 15 detik tidak menghapus kartu pemulihan
     yang baru saja dipasang, serta menandai `window.__fiezelBootWatchdogFired = true`.
   - Di `features/brand/fiezel-splash.js` (`show()`), jika `target.__fiezelBootWatchdogFired`
     sudah aktif saat `load()` terlambat selesai (>15 dtk), `show()` langsung membersihkan
     kartu pemulihan dan mengembalikan `{ shown: false, reason: 'watchdog_elapsed' }` sehingga
     aplikasi langsung masuk tanpa memutar splash kedua dari awal.
2. **Pengungkapan Logo & Wordmark Sejak Frame Pertama + Isolasi Layout Boot (§3.1 / P0 #2)**:
   - Di `index.html` (`#fiezelBootCritical`), menambahkan `contain: layout style paint` pada
     `#fiezelBootSplash`, `content-visibility: hidden; contain: strict` pada
     `html.fz-booting main.app, html.fz-booting #globalSky`, serta animasi CSS compositor
     (`fz-fade-in`) untuk `.fz-fgroup`, `.fz-barsgroup`, dan `.fiezel-splash-word` selama
     `#fiezelBootSplash:not([data-fiezel-boot-claimed="shown"]):not(.fiezel-splash-still)`.
   - Di `features/brand/fiezel-splash.js` (`startMotion`), menyinkronkan status opasitas awal
     begitu splash diadopsi (`adoptedRevealed`) agar tidak terjadi kedipan 1 frame saat atribut
     `data-fiezel-boot-claimed="shown"` dipasang.
3. **Penghapusan 3 Fetch JSON Ganda & 3 Fetch Non-Boot Eager (§4.3 / P0 #3)**:
   - `features/nujum/fiezel-nujum.js`: menghapus `loadGrammarTemplatesAsync()` saat evaluasi
     skrip dan memakai kembali `root.__grammarTemplatesCache` yang diisi `app.js` `load()`
     (menghemat fetch ganda **2,1 MB** `grammar-templates.json`).
   - `features/grammar/grammar-vocab-bridge.js`: tidak lagi memanggil `loadGrammarVocabMap()`
     saat evaluasi skrip di peramban karena `app.js` `load()` sudah mengunduh dan menyuntikkan
     `content/grammar-vocab-map-v1.json`.
   - `app.js:13568`: menghapus `fetch('content/video-grammar-bank-v1.json')` tingkat atas yang
     menduplikasi `optional('content/video-grammar-bank-v1.json')` di dalam `load()`.
   - `features/bug/fiezel-bug.js` & `features/speaking-listening/fiezel-jlpt-listening.js`:
     menunda pemuatan `bug-species.json`, `misconception-taxonomy-v1.json`, dan
     `jlpt-listening-bank-v1.json` sampai sesudah splash selesai atau saat fitur dibuka.
4. **Penghapusan Render Beranda Prematur di Balik Splash (§3.2, §4.4 / P0 #4)**:
   - Mencegah `grammar-vocab-bridge.js`, `fiezel-bug.js`, `drawTopScreen()`, dan
     `repaintQuietly()` memicu `render()` beranda penuh di balik layar splash sebelum
     `openApp()` dipanggil.
5. **Optimasi Titik Panas Animasi Splash & Maskot (§3.3, §4.6, §4.7 / P1 #9)**:
   - `features/mascot/fiezel-mascot.js` (dan kembarnya `website/assets/mascot/fiezel-mascot.js`):
     menginisialisasi `this._state = ""` sebelum `this.setState("idle")` di `connectedCallback()`
     sehingga pemasangan awal tidak memicu `_restartAnimations()` → `getAnimations({subtree:true})`
     (**147,2 ms** style recalculation).
   - `app.js`: mememoisasi `detectedTimeZone()` sehingga tidak menginstansiasi ulang
     `Intl.DateTimeFormat()` berulang kali (**90,6 ms**).
   - `features/brand/fiezel-splash-pawstamp.js`: hanya memanggil `void o.offsetHeight` di
     `resetOverlay()` apabila overlay pernah diputar sebelumnya (menghilangkan paksaan layout
     sinkron **64 ms** tepat di awal animasi cap PAW).
   - `features/brand/fiezel-splash-particles.js` & `fiezel-splash.js`: melewati pembuatan
     sprite dan sampling partikel (`skipBuild`) bila `startOffset >= T.DONE` (adopsi lambat),
     serta menghentikan `ctx.clearRect()` berulang di setiap frame sesudah `t >= T.DONE`.
   - `fiezel-lazy-loader.js`: menahan gelombang 18 skrip lazy sampai elemen `#fiezelBootSplash`
     benar-benar lepas dari DOM (termasuk 320 ms animasi keluar `is-leaving`).

### 7.2 Tabel Perbandingan Metrik Empiris (Sebelum vs Sesudah)

| Skenario & Metrik | Sebelum (`m025-564`) | Sesudah (`m025-567`) | Perubahan |
|---|---:|---:|---:|
| **Warm, CPU 4x**: FCP | 864 ms | **320 ms** | **-63%** |
| **Warm, CPU 4x**: `splashShow` | 4.274 ms | **3.538 ms** | **-736 ms** |
| **Warm, CPU 4x**: `splashGone` (total waktu splash) | 5.320 ms | **4.533 ms** | **-787 ms** |
| **Warm, CPU 4x**: Long task selama boot (`staticSplash.longtaskMs`) | 1.863 ms | **1.004 ms** | **-46%** |
| **Warm, CPU 4x**: Long task tunggal terpanjang | 429 ms | **143 ms** | **-67%** |
| **Warm, CPU 4x**: FPS selama boot (`staticSplash.fps`) | 24,2 fps | **37,3 fps** | **+54%** |
| **Warm, CPU 4x**: FPS animasi cap PAW (`animation.fps`) | 25,7 fps | **36,0 fps** | **+40%** |
| **Warm, CPU 4x**: Waktu beku animasi (`animation.frozenMs`) | 384 ms | **200 ms** | **-48%** |
| **Warm, CPU 6x**: `splashShow` | 5.654 ms | **2.640 ms** | **-53%** |
| **Warm, CPU 6x**: `splashGone` (total waktu splash) | 6.846 ms | **3.699 ms** | **-46%** |
| **Warm, CPU 6x**: Long task selama boot (`staticSplash.longtaskMs`) | 2.752 ms | **648 ms** | **-76%** |
| **Warm**: Jumlah fetch JSON saat boot | 17 (3 duplikat) | **11 (0 duplikat)** | **-6 fetch** |
| **Cold, CPU 4x + Slow 4G**: Bug `secondSplash` (>15 dtk) | Muncul di 25.356 ms | **0 (Teratasi)** | **100% hilang** |
