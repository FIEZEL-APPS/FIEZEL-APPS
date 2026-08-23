# FIEZEL — palet dikembalikan ke brief OWNER (handoff m025-119)

Rilis: `m025-119`
Sumber: `FIEZEL_Instruksi_Redesign_UIUX.pdf` bagian 3
Berkas yang berubah: `style.css`, `features/tutor-classroom/tutor-v3.css`, `app.js`,
`index.html`, `manifest.json`, `pastel-field-contrast-test.js`, `core-config.js`,
`features/neural-voice/fiezel-diag-panel.js`, `sw.js`

---

## 1. Kenapa dokumen ini ada

OWNER, setelah m025-118:

> "TAPI WARNANYA MASIH BELUM SESUAI DENGAN INSTRUKSIKU"

Brief-nya dilampirkan ulang. Diukur terhadap bagian 3, **kelima warnanya meleset semua**:

| Peran | Brief | Yang terpasang | |
|---|---|---|---|
| Dasar cream | `#FFF8ED` | `#FFF9F0` | beda |
| Tinta coklat | `#2B2118` | `#33281C` | beda |
| Kuning golden | `#FFD23F` | `#FFE07E` | beda |
| Terracotta | `#EE5D4A` | `#F5A091` | beda |
| Gold tipis | `#C9A24B` | `#D9BC7E` | beda |

Bukan satu kekeliruan, melainkan lima sekaligus — dan itu menandakan penyebabnya sistemik,
bukan salah ketik.

## 2. Apa yang sebenarnya terjadi

Instruksi susulan OWNER di sesi redesign — *"SEMUA WARNANYA HARUS PASTEL"* — diterapkan ke
**aksen**, bukan hanya ke bidang. Kuning golden `#FFD23F` dipudarkan jadi `#FFE07E`,
terracotta `#EE5D4A` dipudarkan jadi salmon `#F5A091`.

Brief sendiri sebenarnya sudah menjawab ketegangan itu di bagian 3:

> "Kuning dipakai sebagai aksen di atas dasar cream — bukan pengganti seluruh background,
> supaya tidak jatuh norak."

Rasa pastelnya datang dari **dominasi cream**, bukan dari memudarkan aksennya. Memudarkan
aksen justru membunuh "ceria" yang jadi kata pertama di brief.

Dan tidak pernah ada alasan teknis untuk mengubahnya: kelima hex brief lolos kontras
terhadap tinta brief sendiri — kuning 10,91:1, terracotta 4,72:1, cream 14,93:1, gold
6,56:1.

## 3. Yang dikerjakan

Kelima warna dikembalikan persis, dan turunannya dihitung ulang dari sana:

| Token | Nilai | vs tinta `#2B2118` |
|---|---|---|
| `--yellow-deep` (bayangan tombol) | `#E0B22A` | 7,93:1 |
| `--yellow-soft` (bidang berteks) | `#FFF1C9` | 14,01:1 |
| `--coral-deep` | `#C9432F` | 3,25:1 (bayangan, bukan teks) |
| `--coral-soft` | `#FDE3DE` | 12,91:1 |
| `--accent` (tinta terracotta) | `#C2402C` | 4,90:1 di atas cream |
| `--accent-strong` | `#A33422` | 6,48:1 di atas cream |

Pasangan gelapnya ikut dihitung ulang: `--cream` `#221A11`, `--cream-deep` `#2A2016`,
`--yellow-soft` `#3A2E12`, `--coral-soft` `#3B231D`, `--accent` `#F08A78`,
`--accent-strong` `#F5A996`, `--gold` `#DCBA72` — semuanya di atas 12:1 terhadap teks tema.

## 4. Akar sistemiknya: palet hidup di banyak tempat sekaligus

Warna yang sama disimpan **terpisah** di lima berkas: `style.css` (dua blok `:root`),
`features/tutor-classroom/tutor-v3.css` (lapisan `fiezel-ui-v6`), `app.js` (`SCENE_STOPS`
dan warna confetti), `index.html` (`theme-color`), dan `manifest.json`.

Tidak ada satu pun yang merujuk ke yang lain. Itulah kenapa palet bisa melenceng seluruhnya
tanpa satu pun tes berteriak — dan kenapa keluhan warna/kontras muncul empat kali
berturut-turut (m025-85, m025-113, m025-116, m025-118).

## 5. Gerbangnya

`pastel-field-contrast-test.js` diperluas dari 6 menjadi 9 pemeriksaan. Tiga yang baru:

1. **`BRIEF_PALETTE` dipaku** — kelima hex brief ditulis di dalam tes; kalau salah satu
   berubah, tes menyebut token dan nilai yang diminta brief.
2. **`SUPERSEDED` dilarang** — kelima hex lama tidak boleh muncul lagi di `style.css`,
   `tutor-v3.css`, `app.js`, `index.html`, maupun `manifest.json`. Komentar boleh
   menyebutnya untuk menjelaskan sejarah; nilainya tidak boleh dipakai.
3. **Tinta brief wajib terbaca** di atas setiap warna brief.

Diverifikasi dengan mengembalikan kuning pastel lama: gerbang menolak dengan dua
pemeriksaan merah dan menyebut nilai yang diminta brief.

## 6. Status dan langkah berikutnya

Status: **selesai dan di-merge**, 68 pemeriksaan lulus.

Yang perlu OWNER lihat, karena inilah yang tidak bisa diukur dari DOM:

1. Apakah kuning `#FFD23F` sekarang terasa **ceria**, bukan pudar — terutama di tombol
   utama dan progress ring kartu skill.
2. Apakah terracotta `#EE5D4A` pada badge streak dan notifikasi terasa **urgent**, sesuai
   perannya di brief.
3. Apakah dominasi cream masih menjaga kesan minimalis dan mahal — brief menolak kuning
   yang menggantikan seluruh background.
4. Mode gelap: keempat permukaan yang diperbaiki di m025-118 harus tetap terbaca dengan
   palet baru ini.
