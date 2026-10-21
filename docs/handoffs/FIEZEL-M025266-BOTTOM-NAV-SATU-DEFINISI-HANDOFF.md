# m025-270 — Chrome: bottom nav + topbar satu definisi, kapsul aktif, dua ikon baru

**Status:** selesai, 252/252 gerbang `quality.yml` hijau di build `m025-270` (termasuk
`ui-render-audit` di Chromium 320/390/768/1280).
**Otoritas:** OWNER (fitrajft-ux).

**KOREKSI CAKUPAN (m025-270).** Judul dan status dokumen ini semula menyebut `m025-266`,
branch `redesign/chrome-bottomnav`, dan "PR 1 dari tiga (nav → topbar → Home)". Dua-duanya
tidak lagi benar dan sudah diperbaiki di tempat:

1. **Nomor build.** `m025-266` sudah dipakai sapuan kebocoran naskah Thai yang mendarat
   lebih dulu. Cabang ini naik ke `m025-270` lewat `tools/bump-build.mjs`.
2. **Cakupan.** PR ini TIDAK hanya menyentuh nav: ia juga merancang ulang topbar menjadi
   pil lengket sekeluarga dengan tab bar (lihat blok `.topbar` di `style.css`, dan blok
   `body.fz-lux .topbar`/`.icon-button` yang dicabut dari `fiezel-lux.css`). Membaca
   dokumen ini sebagai "topbar belum tersentuh" akan menyesatkan penerusnya — dan sempat
   menyesatkan agen yang melanjutkannya: percobaan mengembalikan blok lux itu justru
   melahirkan definisi topbar kedua yang bertabrakan, persis penyakit yang PR ini
   sembuhkan. Percobaan itu sudah di-revert.

**Regresi yang ditemukan dan ditutup sebelum merge.** `ui-render-audit` merah: judul
halaman Vocab jatuh ke kontras 1,02:1 pada beberapa fase langit, di tema terang dan gelap.
Sebabnya diukur, bukan ditebak — gerbang itu menyampel WARNA TERBANYAK di dalam kotak
judul, dan bayangan pil topbar (`0 14px 34px -14px`, jarak 18 px) jatuh tepat di kotak itu
lalu memecah krem di sana menjadi beberapa bin. Tidak ada bin krem yang menang, jadi yang
menang adalah goresan huruf: tinta dibanding tinta.

| warna dominan di kotak judul "Kosakata" (390 px, layar Vocab) | |
| --- | --- |
| `origin/main` | (252, 236, 204) krem |
| cabang ini sebelum patch | (36, 28, 20) tinta |
| sesudah patch | (252, 244, 212) krem |

Bayangan menjadi `0 10px 22px -18px rgba(36,26,17,.20)`: pil topbar tetap terangkat, tapi
ekornya tidak lagi mencapai baris judul. **Aturan berikutnya untuk siapa pun yang menyentuh
chrome: bayangan pil lengket tidak boleh mencapai baris judul halaman di bawahnya.**

---

## 1. Yang salah, disebut penyebabnya

OWNER: tampilan bottom nav "kurang". Bukan warna yang salah — **tidak ada yang merancangnya**.
Sebelum commit ini, rupa tab bar ditulis oleh **sembilan blok `.bottomnav`/`.nav` di empat
berkas** (`style.css` ×6, `home-polish.css`, `fiezel-lux.css`, `fiezel-2.css`) yang saling
menimpa. Yang murid lihat adalah *penulis-terakhir yang menang*, bukan keputusan:

| Properti | Nilai yang bertarung |
|---|---|
| lebar pil | 560 / 620 / 580 / 600 px |
| ukuran ikon | 18 / 20 / 22 / 24 / 26 px |
| label | .58 / .6 / .66 / .7 rem / 11 px — **semua di bawah lantai 12 px F2-15** |
| keadaan aktif | kapsul kuning + naik 2 px + bayangan 2 px + titik coklat + lingkaran kuning penuh + latar tinta + garis kuning 14×3 |
| blur | `backdrop-filter` di dua berkas — melanggar keputusan baterai m025-81 yang `ui-structure-test` jaga, tetapi hanya di `style.css` |

Akibat yang terlihat: titik coklat di bawah label aktif terbaca sebagai **noda**; ikon
tidak-aktif berbidang `--surface-mute` (putih di atas putih) sehingga lima ikon tampil
sebagai empat garis + satu bidang; `skills` (lima batang tipis) terlalu ringan dan `map`
(lipatan + dua garis) terlalu ramai untuk 24 px; bidang `profile` hanya lingkaran r4.

## 2. Kontrak visual yang ditetapkan

Semua di **satu blok** `style.css` — *"Tab bar — satu definisi, bukan enam"* — dan blok itu
penulis terakhir untuk setiap properti rupa. Aturannya:

1. **Pil**: `min(560px, 100% − 24px)`, padding 6, radius `--radius-xl`, latar `--glass-solid`,
   border `--line`, satu bayangan lembut. **Tanpa blur** (m025-81).
2. **Tab tidak aktif**: ikon 24 px berbidang `--sun-soft` + garis `--muted`; label
   `--fs-caption` (12 px) 600 `--muted`. Kelima ikon punya bidang **sebanding**.
3. **Tab aktif — satu sinyal bentuk + satu sinyal warna**: kapsul `--sun` 46×30 di belakang
   ikon (digambar `::after`, penanda yang bekerja tanpa warna), ikon berbidang `--panel`
   dengan garis `--ink`, label `--ink` 700, tab naik 3 px, ikon memantul sekali (`fzNavPop`).
   Tidak ada titik, tidak ada bayangan padat, tidak ada latar tinta.
4. **Rel kiri ≥1000 px** (`tutor-v3.css` / `fiezel-lux.css`) hanya **memindahkan posisi
   pil**; ia tidak lagi menyentuh rupa `.nav` atau ukuran label.
5. **Ikon**: `practice` dan `progress` baru; `classroom` dan `profile` digambar ulang.
   Semua mengikuti aturan set (kanvas 24, kotak 3..21, satu `.fz-fill`, garis 1,7, ujung
   bulat, tanpa warna dipaku). `skills` dan `map` **tetap ada** untuk kartu dalam layar.

### Yang tidak boleh dilanggar berikutnya

- **Jangan menambah blok `.bottomnav`/`.nav` di berkas lain.** Kalau rupa tab bar harus
  berubah, ubah blok tunggal di `style.css`. Blok-blok `.bottomnav{}` yang lebih awal di
  `style.css` sengaja dibiarkan karena gerbang membaca literalnya (`glass-solid`,
  `z-index:40`, `width:calc(100% - 16px)`, `min-height:44px`) — jangan dihapus, jangan
  ditambah.
- Literal yang dijaga gerbang dan **harus tetap ada**: `.nav .fz-i .fz-line{stroke-width:2}`,
  `.nav.active{…transform:translateY(-3px)}`, `.nav.active::after{`, `fzNavPop`
  (`paw-mascot-test`).
- Label tab tidak boleh turun di bawah `--fs-caption`.
- TEPAT lima `.nav`, `data-view` dan `class="bottomnav"` tetap (tur + diagnostik).

## 3. Berkas

| Berkas | Isi |
|---|---|
| `style.css` | blok tab bar tunggal; blok "Version B Tactile" dan aturan v6 lama dihapus |
| `features/ui/fiezel-icons.js` | `practice`, `progress` baru; `classroom`, `profile` ulang |
| `index.html` | Latihan → `practice`, Progres → `progress` (atribut ikon saja, nol copy) |
| `fiezel-2.css`, `features/ui/fiezel-lux.css`, `features/learner-flow/home-polish.css`, `features/tutor-classroom/tutor-v3.css` | aturan tab bar dicabut, catatan penunjuk ditinggal |
| `tools/dev/chrome-shots.mjs`, `tools/dev/computed.mjs` | harness tinjau lokal (bukan gerbang) |
| bump m025-265 → **m025-266** di keempat tempat | |

**Nol kata Indonesia berubah** (`id-golden-snapshot` hijau), **nol kunci i18n baru**.

## 4. Berikutnya

- **PR 2 — top bar**: bobot wordmark vs lonceng vs gigi; gigi Pengaturan **tidak boleh**
  hilang (satu-satunya pintu Pengaturan dalam mode pelajaran; tiga langkah tur menunjuknya).
- **PR 3 — Home**: satu `.primary` milik kartu "Hari ini"; kartu Duel tetap pertama di
  learner-flow; kepadatan di 390 px.
