# FIEZEL — Home minimalis dan eksklusif (handoff m025-113)

Rilis: `m025-113`
Berkas yang berubah: `style.css`, `features/tutor-classroom/tutor-v3.css`, `app.js`,
`contrast-test.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `sw.js`

---

## 1. Kenapa dokumen ini ada

OWNER, 22 Agustus 2026 pukul 22.00 WIB, setelah membuka menu utama:

> "dari atas sampai bawah masih berantakan sekali ui atau ux nya, jadi aku mau kamu
> lakukan brief redesign"
> "buatkan dengan kesan minimalis dan eksklusif"

Yang ditemukan saat mengukur bukan satu masalah rasa, melainkan satu bug kontras yang
membuat sebagian layar benar-benar tidak terbaca, plus tata letak yang menumpuk.

Diukur di 375x812 sebelum menulis satu baris:

| | Sebelum | Sesudah |
|---|---|---|
| Tinggi Home | 2.791px (3,4 layar) | ~2.000px |
| Tinggi hero | 916px | 686px |
| Kontras judul kartu modul (malam, tema terang) | **1,05:1** | 14,6:1 |
| Ajakan aksi di layar pertama | 4 | 1 |

## 2. Akar bugnya: dua sumber kebenaran untuk satu permukaan

Kartu modul mengambil **latar** dari `--ui-surface-rgb` (lapisan `fiezel-ui-v6` di
`tutor-v3.css`), yang hanya sadar **tema** — di tema terang ia selalu putih. **Tinta**-nya
diambil dari `--glass-text`, yang sadar **fase langit** — pada `.scene-night` ia menjadi
hampir putih.

Pukul 22.00 di tema terang: putih di atas putih. Judul "Vocabulary", "Grammar",
"Reading" hilang seluruhnya.

Bentuk yang sama ditemukan pada: topbar (`--ui-chrome` terang vs `--ambient-text`
sadar-fase), tombol ikon topbar, `.setting-row small`, `.section-kicker`, dan tab aktif.

## 3. Kenapa tidak ada tes yang memerah

`contrast-test.js` (m025-85) **sengaja** mengecualikan kombinasi tema terang + fase malam.
Alasannya tertulis di kepala berkasnya: "memperbaikinya berarti mengubah tampilan mode
terang, yang justru dilarang oleh perbaikan m025-85".

Pengecualian itu menahan satu perbaikan dan membiarkan satu kelas bug hidup tanpa gerbang.
Sejak m025-113 keempat kombinasi tema x fase diuji, dan `skyOpacity()` menjadi sadar fase.

## 4. Aturan yang sekarang dipegang

1. **Permukaan dan tinta selalu dari keluarga yang sama.** Kaca dengan kaca (`--glass-*`),
   tema dengan tema (`--surface-*`/`--text`). Aturan yang mencampur keduanya adalah bug,
   bukan pilihan gaya.
2. **Tanah halaman ikut fase langit di kedua tema.** m025-85 meredam langit untuk tema
   gelap; kebalikannya tidak pernah ditangani, sehingga malam hari di tema terang tanahnya
   berhenti di abu-abu tengah — terlalu gelap untuk tinta gelap, terlalu terang untuk
   tinta terang.
3. **`--accent-on-glass`** untuk aksen yang duduk di atas material kaca: `--accent-strong`
   saat siang, `#e0708a` saat senja/malam. Marun `#8C2233` di atas kaca malam hanya 2:1.

## 5. Redesign Home

- Satu bidang per gagasan: kartu Coach keluar dari dalam hero (dipisah satu garis rambut);
  misi + 4 statistik menjadi satu bidang; dua panel Perjalanan menjadi satu bidang.
- Satu aksi utama: tombol hero kedua dihapus — ia memanggil `askCoachAI()`, fungsi yang
  sama persis dengan tautan "Buka analisis personal" ~300px di bawahnya.
- Tombol utama hero kembali gading. `html.fiezel-ui-v6 .primary` (0,2,1) sudah lama menang
  atas `.launcher-actions .luxe` (0,2,0), jadi tombol utama menjadi marun gelap di atas
  hero marun gelap.
- Satu wajah display: serif merek untuk yang besar, sans untuk sisanya.
- Kartu modul: judul dulu, angka menyusul. Keterangan Perpustakaan dan Classroom
  dipendekkan supaya enam kartu berhenti punya empat tinggi berbeda.
- Kabut biru sisa palet v6 (`#5b9bec`, `#715bda`) dihapus dari latar aplikasi.

Tidak ada informasi yang dibuang; yang dipotong ruang dan pengulangan.

## 6. Kenapa `tutor-v3.css` ikut berubah

Berkas itu bukan CSS Classroom saja: `fiezel-tutor-v3.js` memasang kelas `fiezel-ui-v6`
pada `<html>` tanpa syarat, jadi setiap aturan `html.fiezel-ui-v6` berlaku se-aplikasi
(dicatat pertama kali di m025-85). Perbaikan kontras kartu modul, topbar, dan papan
Classroom karena itu harus dilakukan di sumbernya, bukan ditumpuk lapisan baru — kalau
tidak, `contrast-test` akan mengukur deklarasi yang bukan pemenang cascade-nya.

## 7. Catatan untuk pekerjaan berikutnya

- `.tutor-hub` kini permukaan pekat. Kalau suatu saat Classroom ikut memakai material
  kaca, tintanya (`--ui-text`/`--ui-muted`) harus ikut pindah keluarga di saat yang sama.
- `--ui-muted` (#67758d) masih ~4,4:1 di atas tint dingin Classroom mode terang. Dicatat
  sejak m025-85, belum diperbaiki, dan tetap di luar lingkup rilis ini.
- Verifikasi rilis ini dilakukan di server lokal pada 375x812 untuk fase malam dan siang.
  Pengujian di perangkat OWNER menyusul.
