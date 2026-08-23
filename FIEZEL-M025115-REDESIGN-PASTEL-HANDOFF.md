# FIEZEL — redesign pastel: ceria, eksklusif, minimalis, mahal (handoff m025-115)

Rilis: `m025-115`
Sumber: `FIEZEL_Instruksi_Redesign_UIUX.pdf` (brief OWNER v1) + instruksi susulan di sesi
yang sama: *"AKU LUPA BILANG SEMUA WARNANYA HARUS PASTEL, SEPERTI KUNING PASTEL, CREAM
PASTEL, DLL"*.

Berkas yang berubah: `style.css`, `features/tutor-classroom/tutor-v3.css`, `app.js`,
`index.html`, `manifest.json`, `sw.js`, `core-config.js`,
`features/neural-voice/fiezel-diag-panel.js`, `contrast-test.js`, `ui-structure-test.js`,
plus dua berkas baru: `features/ui/fiezel-icons.js`, `features/ui/fiezel-coach-bubble.js`.

---

## 1. Yang diminta, dan bagaimana ketegangannya diselesaikan

Brief meminta empat kata sekaligus: **ceria, eksklusif, minimalis, mahal**. Dua pasang
pertama gampang saling menegasikan — ceria biasanya identik warna ramai, mahal biasanya
identik restraint gelap. Brief sendiri yang memutuskan arahnya: *"ceria jadi basis
dominan, mahal jadi bumbu di detail"*.

Pembagian yang dipegang seluruh rilis ini:

| Kata | Dari mana ia datang |
|---|---|
| Ceria | **bidang**: cream, kuning pastel, koral pastel, mint, lilac |
| Mahal | **tinta dan garis**: coklat lembut `#33281C`, emas tipis `#D9BC7E`, satu garis rambut, jarak longgar |
| Minimalis | disiplin lama: satu aksi utama per bidang, satu material per bidang, tidak ada kotak di dalam kotak |
| Eksklusif | ikon buatan sendiri, tombol yang benar-benar bisa ditekan, serif merek untuk ukuran besar |

## 2. Palet

| Peran | Nilai |
|---|---|
| Dasar | `#FFF9F0` cream |
| Tinta & garis | `#33281C` coklat lembut |
| Aksen utama (CTA, progress, ikon aktif) | `#FFE07E` kuning pastel |
| Aksen kedua (streak, badge, notifikasi) | `#F5A091` koral pastel |
| Detail premium | `#D9BC7E` emas pastel — garis dan badge saja, **tidak pernah teks** |
| Pembeda skill | mint `#A8DCC4`, lilac `#C9BCE4` |

Pastel adalah warna **bidang**, bukan warna **teks**: `#FFE07E` di atas cream hanya 1,2:1
dan `#F5A091` 2,2:1. Karena itu setiap keluarga punya turunan pekat khusus tinta
(`--accent` `#B8452F`, 6,5:1) dan turunan gelap khusus bayangan tombol. Tidak ada satu pun
teks di aplikasi yang memakai warna pastelnya langsung.

Dasar maroon gelap lama **diganti total**, termasuk hero — hero sekarang gradien kuning
pastel dengan tinta coklat, dan seluruh literal tinta terangnya ikut dibalik. Membiarkan
setengahnya adalah persis bug kontras yang baru diperbaiki di m025-113.

## 3. Perubahan kontrak: fase langit berhenti menentukan material

Sampai m025-114 aturannya: `.scene-dusk`/`.scene-night` **membalik seluruh permukaan
menjadi gelap di kedua tema**. Satu permukaan punya dua sumber kebenaran — tema DAN jam —
dan itulah akar dua bug kontras berturut-turut (m025-85, m025-113).

Brief menutupnya dari sisi produk: *"Ceria adalah default, bukan aksen."* Membalik seluruh
aplikasi jadi gelap tiap pukul 17.00 adalah kebalikan persis dari itu.

Aturan barunya, dan sekarang ini yang dijaga tes:

- blok `.scene-*` **hanya** boleh memasang `--sky-*`, `--scene-light`, `--orbit-*`;
- material malam **identik** dengan material siang, per tema;
- tema terang tetap terang sepanjang hari; tema gelap tetap gelap.

`SCENE_STOPS` di `app.js` ikut pastel, jadi langit tidak pernah lagi menjadi bidang gelap
yang menutup halaman. Peredup langit malam milik m025-113 dicabut bersama sebabnya.

## 4. Ikon: set duotone milik FIEZEL sendiri

`features/ui/fiezel-icons.js` — 14 ikon, kanvas 24x24, satu bidang pastel + garis coklat
1,7 dengan ujung membulat, **tanpa satu pun warna dipaku di dalam SVG** (warnanya dari
`--fz-i-fill` / `--fz-i-line`, jadi tab aktif cukup menukar dua variabel dan mode gelap
ikut sendiri).

Dipakai untuk kroma yang dilihat murid tiap hari: tab bar, kartu modul, empat kartu skill,
dan wajah pembimbing. Lucide **tidak dilepas** — ia masih melayani ikon sekali-pakai di
dalam layar (panah, centang, ikon pengaturan). `ui-structure-test` diperbarui: yang dijaga
tetap "ikon harus lokal, bukan CDN", hanya sekarang dua sistem lokal dihitung bersama.

## 5. Home jadi hub empat skill inti

Hero → **4 kartu skill** (Listening, Speaking, Reading, Writing) dengan cincin progres →
ringkasan → perjalanan → lipatan → kartu modul lama.

**Nol fitur dihapus.** Vocabulary, Grammar, Reading, Perpustakaan, Classroom, Speaking +
Listening semuanya tetap ada di Home dan tetap satu ketukan; tab bar tetap lima destinasi
yang sama. Yang berubah hanya urutan perhatian.

Tiga halaman baru dibuat dengan pola yang sama persis dengan halaman lama:
`listening`, `speaking` (keduanya memasang Skills Lab langsung pada domainnya) dan
`writing` (topik berjenjang A1–C1, target kata, draf tersimpan lokal, masukan dari AI).

## 6. Pembimbing, bukan panel AI

`features/ui/fiezel-coach-bubble.js` — gelembung mengambang yang hadir di **semua**
halaman, bukan panel teks yang hanya muncul di Home:

- sapaannya **sadar konteks** (di Reading: "Ketuk kalimat yang bikin bingung, gue
  jelasin"), bukan paragraf analisis;
- membuka lembar percakapan pendek dengan chip pertanyaan siap pakai;
- napasnya pelan (`fzCoachBreath`) supaya terbaca hadir, dan **berhenti sepenuhnya** kalau
  perangkat minta kurangi-gerak;
- evidence/level/diagnosis tetap ada sebagai data di belakangnya — yang berubah cara
  penyampaiannya.

## 7. Tombol chunky dan micro-interaction

Tombol pill putih rata diganti seluruhnya: bidang kuning pastel, tinta coklat, bayangan
bawah **pekat dan tidak buram** 4px, dan saat ditekan tombolnya turun 3px sementara
bayangannya memendek — itulah yang membuatnya terasa ditekan, bukan diklik. Aksi kedua
memakai koral. Confetti kecil sekali jalan saat sesi selesai, tunduk pada kurangi-gerak.

## 8. Catatan untuk pekerjaan berikutnya

- `style.css` punya **dua** blok `:root`; yang menang adalah blok "Design System v6.0" di
  tengah berkas, bukan yang di kepala. m025-115 sudah menyamakan keduanya, tetapi siapa pun
  yang mengubah palet lagi harus menyentuh dua-duanya.
- Halaman Writing memanggil AI lewat `askFiezelAI`. Jalur itu bisa menggantung kalau akun
  Puter belum tersambung, jadi permintaannya dibatasi 25 detik dan **selalu** jatuh ke cek
  cepat offline (panjang, jumlah kalimat, kalimat kepanjangan, kata berulang) yang jujur
  menyebut dirinya bukan penilaian bahasa.
- Verifikasi rilis ini dilakukan di server lokal 375x812 secara terukur (rasio kontras
  dihitung langsung dari DOM, kedua tema). Panel Browser sedang tidak tampil di sesi ini,
  jadi tangkapan layar tidak bisa diambil — pemeriksaan mata di perangkat OWNER menyusul.
