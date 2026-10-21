# FIEZEL — kontras bidang pastel, dan gerbangnya (handoff m025-118)

Rilis: `m025-118`
Berkas yang berubah: `style.css`, `tests/pastel-field-contrast-test.js` (baru),
`.github/workflows/quality.yml`, `core-config.js`,
`features/neural-voice/fiezel-diag-panel.js`, `sw.js`

---

## 1. Kenapa dokumen ini ada

OWNER, setelah m025-116 hidup:

> "WARNA DAN CONTRAST BELUM STABIL"

Ini keluhan kontras **ketiga berturut-turut**: m025-85, m025-113, m025-116. Ketiganya
bentuknya identik. Itulah alasan rilis ini tidak berhenti pada memperbaiki warnanya.

## 2. Akarnya: bidang dan tinta memutuskan dari sumber berbeda

`style.css` punya **dua** blok `:root`. Blok kedua yang menang, tetapi seluruh palet
pastel justru hanya hidup di blok pertama — dan penimpaan gelapnya tidak pernah ditulis
untuk bidang pastel **lembut**.

```
bidang  --yellow-soft / --coral-soft / --mint-soft   tetap terang di mode gelap
tinta   --text                                        berbalik menjadi #FFF6E6
```

Terang di atas terang. Ini persis akar m025-113 ("satu permukaan punya dua sumber
kebenaran"), hanya berpindah ke lapisan token.

Lima permukaan terkena, diukur:

| Permukaan | Bidang | Kontras di mode gelap |
|---|---|---|
| Gelembung pesan pembimbing | `--yellow-soft` | **1,01:1** |
| Kartu masukan Writing | `--yellow-soft` | **1,01:1** |
| Ikon kartu modul Reading | `--mint-soft` | **1,03:1** |
| Ikon kartu modul Grammar | `--coral-soft` | **1,07:1** |
| Gelembung pesan pengguna, badge runtun Home | `--coral-soft` | **1,07:1** |

1,01:1 berarti benar-benar tidak terlihat, bukan "agak pudar".

## 3. Perbaikannya

Enam token bidang lembut diberi pasangan gelap yang dihitung, bukan dikira:

| Token | Gelap | vs teks tema |
|---|---|---|
| `--cream` | `#241C13` | 15,66:1 |
| `--cream-deep` | `#2C2218` | 14,51:1 |
| `--yellow-soft` | `#3B2F17` | 12,20:1 |
| `--coral-soft` | `#3C2620` | 13,14:1 |
| `--mint-soft` | `#1C302A` | 13,00:1 |
| `--lilac-soft` | `#292145` | 14,01:1 |

Literal `#F1EDF9` pada ikon Skills ikut ditokenkan menjadi `--lilac-soft`, supaya ia tidak
lolos lagi tanpa pasangan.

Bidang pastel **pekat** (`--yellow`, `--coral`) sengaja **tetap beku**: ia selalu
berpasangan dengan `--ink` coklat di kedua tema, persis seperti tombol chunky m025-116.
Yang tidak boleh beku hanyalah bidang lembut yang menampung teks.

## 4. Gerbangnya

`tests/pastel-field-contrast-test.js`, terpasang di CI.

`tests/contrast-test.js` yang sudah ada memeriksa **pasangan warna yang sudah diketahui**. Ia
tidak bisa menangkap pola ini karena masalahnya bukan satu pasangan, melainkan bidang dan
tinta yang memutuskan gelap-terang dari sumber berbeda. Yang dijaga gerbang baru:

1. tes membaca **semua** blok `:root`, bukan satu — kalau strukturnya berubah, tes ini
   yang berteriak lebih dulu;
2. setiap bidang pastel lembut wajib punya pasangan gelap;
3. token warna beku hanya yang punya **alasan tertulis** di `FROZEN_BY_DESIGN`;
4. bidang beku tidak boleh dipasangkan tinta yang berbalik;
5. tinta coklat terbaca di atas setiap bidang pastel pekat;
6. setiap bidang lembut terbaca oleh teks tema **di kedua tema**.

Diverifikasi dengan **mengembalikan bug m025-116 lebih dulu**: gerbang menolak dengan 4
dari 6 pemeriksaan merah dan menyebut angka 1,01:1 yang tepat. Tes yang lulus di percobaan
pertama tanpa pernah dilihat gagal tidak membuktikan apa pun.

Pengecualiannya ditulis beserta alasannya (`FROZEN_BY_DESIGN`, `NO_TEXT_INSIDE`,
`INHERITS_FROZEN_INK`) supaya bisa ditinjau, bukan disembunyikan.

## 5. Yang ditemukan tetapi TIDAK diperbaiki di sini

Angka rilis bentrok **dua kali dalam satu hari** karena beberapa sesi berjalan bersamaan
(`m025-115` dua kali, lalu `m025-117` dua kali). Gerbangnya sebenarnya **sudah ada** —
A11 Release Readiness Auditor menolak dengan `product release must advance DIAG_BUILD
exactly +1`. Yang kurang bukan gerbangnya, melainkan menjalankannya sebelum push.

Cara menghindarinya, untuk siapa pun yang melanjutkan:

```
BASE_SHA=$(git rev-parse origin/main) node tools/fiezel-guardians.mjs a11
```

Perlu dicatat juga bahwa `tests/install-health-test.js` dan `tests/pwa-release-coherence-test.js`
**tetap lulus walau angkanya bentrok** — keduanya hanya memeriksa ketiga penanda saling
cocok, bukan bahwa angkanya belum pernah dipakai. A11 yang menutup lubang itu.

## 6. Status dan langkah berikutnya

Status: **selesai dan di-merge**, 68 pemeriksaan lulus.

Yang perlu OWNER lihat di perangkat sungguhan, karena inilah yang tidak bisa diukur dari
DOM — apakah pastelnya terasa benar, bukan sekadar terbaca:

1. Mode gelap: gelembung pembimbing, kartu masukan Writing, badge runtun di Home, dan
   ikon kartu modul Grammar/Reading/Skills. Keempat permukaan inilah yang tadinya hilang.
2. Mode terang: pastikan tidak ada yang berubah — perbaikan ini seharusnya tidak
   menyentuh tampilan siang sama sekali.
3. Sakelar tema manual di Pengaturan, bukan hanya preferensi sistem.
