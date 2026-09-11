# PAW pensiun — NUSA & MIRA mengambil alih

**Status:** SUDAH dikapalkan. Karakter aplikasi hari ini adalah Nusa & Mira; rig PAW
tidak ada lagi di repo. Otoritas: OWNER (fitrajft-ux). Build lahir: m025-300.

## Masalah yang dikejar

PR #399 membawa karakter baru — Nusa (monyet) dan Mira (penjelajah) — sebagai **aset
saja**: PNG/WebP/SVG, `manifest.json`, `face-rig.json`, dan render Remotion. Tidak ada
satu baris kode aplikasi pun yang memuatnya. Sementara itu murid tetap melihat PAW.

Jadi pekerjaannya bukan "ganti berkas gambar" melainkan **membangun lapisan runtime**
untuk seni gambar, lalu memensiunkan rig vektor yang selama ini menggerakkan PAW.

## Keputusan terbesar: pintunya TIDAK ikut berganti

Aplikasi memanggil maskot dari ~340 tempat. Panggilan itu menyatakan **maksud**
("bereaksi atas jawaban benar"), bukan seni ("gambar kucing kuning"). Menulis ulang 340
titik panggil demi mengganti gambar adalah risiko besar tanpa satu pun perubahan yang
dilihat murid.

Yang dipertahankan apa adanya:

| Kontrak | Keterangan |
|---|---|
| `self.FiezelPaw` | tetap hidup, kini **alias** dari `self.FiezelCharacter` (objek yang SAMA) |
| `<fiezel-mascot>` | nama elemen tidak berubah |
| kosakata `react()` | 22 event, sama persis |
| 19 state | sama persis |
| `TRANSIENT` / `PRIO` | durasi transien dan tangga prioritas disalin apa adanya |

`app.js`, `fiezel-coach-bubble.js`, `fiezel-paw-slot.js`, `fiezel-speech-bridge.js`,
`fiezel-onboarding.js`: **nol baris berubah**.

Nama `FiezelPaw` bertahan sebagai PINTU, bukan sebagai karakter. Mengganti namanya di
340 tempat adalah pekerjaan kosmetik yang bisa dilakukan kapan saja secara terpisah.

## Peta berkas

| Dulu | Kini |
|---|---|
| `features/mascot/fiezel-mascot.js` (rig SVG) | `features/mascot/fiezel-character.js` |
| `features/mascot/fiezel-motion.css` | `features/mascot/fiezel-character.css` |
| `features/mascot/fiezel-paw-outfit.js` | **dihapus** (lihat di bawah) |
| — | `features/mascot/fiezel-character-art.js` (HASIL GENERATE) |
| `tools/export-mascot.mjs` | `tools/gen-character-art-table.mjs` + `tools/sample-muzzle.py` |

459 berkas seni PAW dihapus: rig, 200 pose koleksi, 100 kembar website, ekspor
marketing, prototipe `design/`, dan sistem karakter merek m025-302.

## Tiga hal yang tidak boleh hilang, dan cara mempertahankannya tanpa rig vektor

1. **KEDIP.** Sebagian pose punya frame mata-tertutup tersendiri; komponen menukarnya
   ~110 ms lalu kembali. Empat state hidup-lama (`idle`, `listening`, `speaking`,
   `greeting`) DIJAMIN punya frame itu oleh gerbang, bukan oleh harapan. Karakter yang
   diam berpuluh detik terbaca sebagai stiker, bukan makhluk.

2. **VISEME / lip-sync.** `face-rig.json` memberi kotak mulut ternormalisasi per pose.
   Lapisan mulut ditumpuk di kotak itu dan bentuknya ditukar mengikuti jembatan suara
   neural. Lip-sync tetap hidup meski senirupanya bukan vektor lagi.

3. **KURANGI-GERAK.** Di sini justru **lebih kuat** daripada rig lama: setiap state
   SUDAH berupa bingkai statis yang berbeda, jadi mematikan animasi tidak menghapus
   satu pun informasi. Yang dimatikan hanya napas, pantulan, dan kedip.

## Dua cacat yang hanya ketahuan setelah DIRENDER

Keduanya lahir dari asumsi yang terasa benar saat menulis kode, dan tidak satu pun
tertangkap oleh membaca ulang. Ditulis di sini karena pelajarannya berlaku untuk
pekerjaan seni berikutnya: **untuk lapisan visual, render dan lihat.**

1. Kotak penempatan mulut dan ukuran bentuk mulut memperebutkan `width`/`height` yang
   sama, jadi bentuk viseme diukur terhadap SELURUH TUBUH — mulut sebesar dada.
   Perbaikannya memisah lapisan kotak dan lapisan bentuk.

2. Seni karakter **sudah punya mulut tergambar**. Viseme hanya menumpuk di atasnya, dan
   wajahnya punya dua mulut. Butuh penutup sewarna kulit — dan warna itu tidak boleh
   ditebak: `tools/sample-muzzle.py` MENGUKURNYA dari aset (median piksel terang di
   dalam kotak mulut; Nusa `#F5DDB2`, Mira `#F5AB88`). Penutup versi pertama memuai ke
   atas dan memakan hidung Nusa — juga baru terlihat saat dirender.

## Gerbang: tiga pensiun, jaminannya pindah

| Dihapus | Jaminannya pindah ke |
|---|---|
| `tests/e5-checksum-gate-test.js` | satu sumber bentuk → peta state→seni & warna moncong wajib hasil generate yang segar |
| `tests/mascot-reduced-motion-test.js` | bingkai statis per state → 19 state lengkap + blok kurangi-gerak benar-benar mati |
| `tests/keyframe-rotation-gate-test.js` | tubuh tidak liar → amplitudo & durasi gerak tertahan |

Semuanya ke **`tests/character-art-gate-test.js`** (12 tes), yang dibuktikan bisa MERAH
dua arah sebelum dipercaya. Plus satu jaminan tanpa pendahulu, karena cacatnya baru
mungkin ada di sistem gambar: **setiap seni yang ditunjuk peta wajib ada di disk DAN
ikut precache.** Rig SVG inline tidak bisa 404; gambar bisa, dan murid luring akan
melihat lubang di tempat karakternya.

`paw-mascot-test`, `pawprint-geometry-gate-test`, `palette-gate-test`,
`event-vocabulary-gate-test` DIPERTAHANKAN dengan lingkup yang dirapikan, bukan
dilonggarkan.

## Yang SENGAJA tidak disentuh

- **SPLASH.** Permintaan OWNER: biarkan seperti sekarang sampai ada penggantinya.
  Aman secara struktural: geometri cap PAW digambar *inline* di
  `fiezel-splash-pawstamp.js`, jadi ia tidak bergantung pada satu pun berkas terhapus.
  Gerbangnya juga tetap utuh. **Pekerjaan berikutnya:** splash versi Nusa & Mira.
- **SFX `paw_*` dan tekstur suara.** Permintaan OWNER: suara ditunda.
  `tools/synth-monkey-sfx.py` sudah ada dan siap (4 tekstur monyet + 5 SFX,
  deterministik), tetapi asetnya BELUM dicommit. Menjalankannya wajib `--apply`.
  Tekstur kucing lama (`assets/audio/paw-textures/`, keputusan OA-8) tetap sebagai
  arsip bahan promo.
- **`assets/brand/fiezel-paw.svg`.** Itu **lambang merek**, bukan maskot: favicon, cap
  splash, lima tempat di UI — dan Nusa sendiri memakainya di bandana, Mira di pin.
- **`features/mascot/fiezel-paw-slot.js`** tetap dipakai (ia memesan ruang, tidak
  menggambar karakter).

## Utang yang diketahui

- **Lapisan outfit hilang.** `fiezel-paw-outfit.js` bekerja dengan menyuntik item SVG ke
  jangkar `fz-outfit-*` di dalam rig; gambar utuh tidak punya jangkar. Peran "outfit
  merek" sudah dibawa seni Nusa & Mira sendiri (bandana telapak, pin telapak), tetapi
  outfit kontekstual per-sesi (topi tidur, dsb.) tidak ada penggantinya.
- **Berat shell naik.** Seni 19 state (WebP saja) menambah 3,52 MB ke shell yang sudah
  20,21 MB (17,4%). PNG (21 MB) dan SVG (5,1 MB) TIDAK di-precache. Kalau ini jadi
  masalah di jaringan murid, langkah berikutnya adalah memuat malas state yang jarang
  dipakai alih-alih mem-precache kesembilan belasnya.
- **11 dari 19 state tidak punya kotak mulut** di `face-rig.json`, jadi viseme hanya
  hidup pada 8 state (termasuk `speaking`, yang memang satu-satunya yang penting).
- **`lookAt()` melemah.** Seni gambar tidak bisa memutar bola mata; kini ia menggeser
  karakter beberapa piksel ke arah sasaran.
