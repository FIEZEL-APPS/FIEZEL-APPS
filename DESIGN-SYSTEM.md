# FIEZEL — Design System

Dokumen ini adalah jawaban atas Audit UX **Bagian 5** dan **Roadmap Jangka Menengah**
("bangun design system terdokumentasi supaya semua fitur baru konsisten").

Aturannya satu: **jangan pernah menulis nilai mentah.** Setiap warna, radius, bayangan,
durasi, dan font di produk ini punya token. Nilai mentah di dalam komponen adalah cara
paling umum sebuah aplikasi perlahan-lahan terlihat "campur aduk".

---

## 1. Warna

Sumber kebenaran: blok `:root` **kedua** di `style.css` (bertanda `FIEZEL Design System v6.0`).
Blok `:root` pertama di kepala berkas adalah generasi v5 dan **ditimpa** oleh v6 — jangan
menambah token baru di sana.

### Peran, bukan nama warna

| Token | Terang | Gelap | Dipakai untuk |
|---|---|---|---|
| `--accent` | `#8C2233` | `#e0708a` | Warna merek. Aksen, tautan, sorotan. |
| `--accent-strong` | `#6D1926` | `#f093a8` | Keadaan tekan/hover dari aksen. |
| `--accent-soft` | `#f7e8eb` | `#3a1f27` | Latar lembut bernuansa aksen. |
| `--gold` | `#d8b36b` | `#e3c07d` | **Aksen kedua**: streak, hadiah, lencana. |
| `--bg` | `#faf7f6` | `#150c11` | Latar halaman. |
| `--panel` | `#fffdfc` | `#1e1418` | Permukaan kartu, modal, gerbang. |
| `--panel-soft` | `#f6eef0` | `#281a20` | Permukaan sekunder, kolom isian. |
| `--line` / `--line-soft` | `#e9dfe1` / `#f2ebec` | `#3a2a30` / `#2e2027` | Garis rambut, pemisah. |
| `--text` | `#1d1114` | `#fdf4f6` | Teks utama. |
| `--muted` / `--muted-soft` | `#6b5a60` / `#8a757c` | `#c3aeb5` / `#a38f96` | Teks pendukung. |
| `--green` / `--green-soft` | `#278268` / `#e8f4ef` | `#4fc79b` / `#16302a` | Berhasil. |
| `--red` / `--red-soft` | `#bd4f63` / `#faecef` | `#f08098` / `#3a1c24` | Gagal, bahaya. |
| `--black` | `#1b1418` | `#8C2233` | **Permukaan tombol utama** (teksnya dipaku `#fff`). |

> **Jebakan `--black`.** Token ini memikul dua peran: permukaan tombol utama *dan* warna
> teks pada beberapa label. Di mode gelap satu nilai tidak bisa melayani keduanya, jadi
> nilainya dipilih untuk **tombol** (marun, kontras 7,3:1 dengan teks putih) dan dua
> pemakaian teks (`.nav.active`, `.welcome-mark`/`.modal-mark`) dialihkan ke aksen terang
> lewat penimpaan khusus. Kalau menambah pemakaian `--black` sebagai warna teks, tambahkan
> penimpaannya juga.

### Mode gelap

Ditulis **tepat setelah** blok `:root` v6, dengan dua selektor yang wajib ada berdua:

```css
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){ … } }  /* preferensi sistem */
:root[data-theme="dark"]{ … }                                               /* sakelar manual */
```

Sakelar manual disimpan di `localStorage` oleh `features/ui/fiezel-dark-mode.js` dan
disuntikkan ke modal Pengaturan.

**Jangan** memberi warna satu-satunya definisi di dalam blok gelap — setiap token harus
punya nilai terang di `:root` polos lebih dulu.

### Empat fase suasana

`body` membawa salah satu dari `scene-day` / `scene-dawn` / `scene-dusk` / `scene-night`.
Fase ini menimpa token *ambient* dan *glass* (`--ambient-text`, `--chrome-bg`, `--glass-*`)
mengikuti waktu setempat. Ini **terpisah** dari mode gelap dan keduanya harus tetap terbaca
saat digabung.

---

## 2. Tipografi

Dua keluarga, dua peran, dua token — berlaku **global**, termasuk di dialog sistem:

| Token | Font | Peran |
|---|---|---|
| `--fz-heading` | FZ Fredoka (500/600/700) | Judul, wordmark, tanda merek. |
| `--fz-body` | FZ Plus Jakarta Sans (400–700) | Seluruh teks tubuh, tombol, label. |

Keduanya di-*self-host* dari `assets/fonts/` lewat `@font-face` — **tidak boleh** kembali ke
Google Fonts CDN, karena aplikasi ini offline-first dan gate `onboarding-test.js` menahannya.

`body` memakai `--fz-body`; `h1–h4`, `.brand`, `.welcome-mark`, `.modal-mark` memakai
`--fz-heading`. Tombol mewarisi lewat `font:inherit`.

---

## 3. Bentuk dan kedalaman

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--radius-lg` | `22px` | Kartu, panel besar. |
| `--radius-md` | `16px` | Kotak sekunder, kolom isian. |
| `--radius-sm` | `12px` | Chip, lencana. |
| `--shadow-sm` | `0 8px 24px` | Kartu diam. |
| `--shadow-md` | `0 20px 50px` | Elemen terangkat. |
| `--shadow-lg` | `0 34px 90px` | Modal, gerbang. |

Tombol berbentuk pil memakai `border-radius:999px`, bukan token — itu bentuk, bukan skala.

**Liquid glass**: tiga bobot saja (`--glass-thin/regular/thick`) plus `--glass-edge` dan
`--glass-blur`. Kedalaman datang dari blur dan satu garis rambut, **bukan** dari kotak
bertumpuk di atas kotak.

---

## 4. Gerak

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--ease` | `cubic-bezier(.22,.8,.28,1)` | Transisi tenang: halaman, warna, opasitas. |
| `--ease-spring` | `cubic-bezier(.34,1.4,.4,1)` | Interaksi bertenaga: tekan tombol, modal masuk. |
| `--dur-s` / `--dur-m` / `--dur-l` | `.18s` / `.32s` / `.5s` | Pendek / sedang / panjang. |

**Kurangi-gerak wajib dihormati.** Ada blok global `@media (prefers-reduced-motion:reduce)`
yang memangkas semua animasi, ditambah penimpaan lokal untuk sekuens splash dan onboarding.
Modul SFX transisi juga diam total di modus ini.

---

## 5. Ikon

Satu keluarga: **Lucide**, gaya garis, semuanya `stroke`. Bundle di `lucide.min.js` adalah
**subset** — hanya ikon yang benar-benar dipakai yang disertakan.

> **Aturan wajib:** setiap `data-lucide="…"` baru **harus** ada di dalam subset. Ikon yang
> tidak ada tidak gagal dengan berisik — ia merender kotak kosong, dan itulah "■" yang
> ditandai audit sebagai terasa belum matang. Audit m025-80 menemukan 22 ikon hilang seperti
> ini, termasuk `bell-ring` di gerbang notifikasi.

Cara menambah ikon:

```bash
npm pack lucide-static@latest          # ambil paket resmi
# ekstrak path data dari package/icons/<nama>.svg,
# lalu sisipkan ke map `const icons={…}` di lucide.min.js
```

Jangan pernah menggambar ulang path ikon dengan tangan, dan jangan mencampur emoji dengan
ikon garis di permukaan yang sama.

---

## 6. Keadaan yang wajib didesain

Setiap layar yang memuat data **harus** punya ketiganya. Ini bagian dari definisi selesai,
bukan tambahan.

| Keadaan | Kelas | Catatan |
|---|---|---|
| Memuat | `.skeleton`, `.skeleton-card`, `.skeleton-grid` | Kerlip, bukan pemutar berputar. |
| Kosong | `.empty-state`, `.empty-state-minimal`, `.empty-inline` | Lambang + judul + ajakan, bukan layar putih. |
| Gagal | `.empty-state` + lambang peringatan | Sediakan tombol coba lagi. |

Bantuannya ada di `features/ui/skeleton-helpers.js`.

---

## 7. Bunyi

Seluruh bunyi lahir dari satu DNA supaya aplikasi terdengar seperti satu alat:

1. **Satu timbre** — "bel": sinus dasar + harmonik oktaf yang lebih pelan dan cepat hilang.
2. **Satu tangga nada** — F mayor (F, A, C), dengan F sebagai pusat karena F adalah huruf
   mereknya sendiri.
3. **Pendek dan lembut** — SFX transisi di bawah 220 ms, serangan diayun 8 ms agar tidak
   terdengar mengklik.

| Sumber | Berkas | Isi |
|---|---|---|
| Nada pembuka merek | `features/brand/fiezel-splash.js` | Dua nada bel F4→C5, di bawah 1 detik. |
| SFX transisi | `features/audio/fiezel-ui-sfx.js` | `tap`, `nav`, `open`, `close`, `toggle`, `celebrate`. |
| Umpan balik jawaban | `app.js` (`playFeedbackSound`) | Benar/salah — ini **informasi**, jadi tetap berbunyi saat kurangi-gerak. |

Audisi: buka `sfx-preview.html`. Semua bunyi ikut sakelar **Suara jawaban** di Pengaturan —
jangan menambah sakelar baru untuk hal sejenis.

---

## 8. Identitas merek

| Aset | Berkas | Catatan |
|---|---|---|
| Ikon aplikasi | `assets/brand/fiezel-icon.svg` (sumber) | Huruf F gading + dua batang emas: inisial merek sekaligus gelombang suara. |
| Ikon ter-render | `favicon-64`, `apple-touch-icon` (180), `fiezel-icon-192`, `fiezel-icon-512` | Di-render dari SVG, diperkecil dengan LANCZOS. |

**Zona aman maskable.** `fiezel-icon-512.png` didaftarkan dengan `purpose:"maskable"`, dan
Android memotongnya menjadi lingkaran/squircle. Seluruh isi ikon karena itu harus berada di
dalam lingkaran berjari-jari **204,8 px** dari pusat kanvas 512. Lockup saat ini berada di
161,4 px — ada ruang, tapi periksa ulang setiap kali bentuknya diubah.

`background_color` di `manifest.json` (`#120C0F`) sengaja disamakan dengan bidang ikon dan
splash, supaya layar peluncuran PWA menyambung mulus ke sapaan pembuka.

> **Maskot.** Karakter "Percik" **dihapus** pada m025-80 atas permintaan pemilik. Lambang
> pengganti di onboarding adalah ikon Lucide di atas piringan lembut (`.fiezel-step-art`).
> Jangan memperkenalkan gaya ilustrasi baru tanpa keputusan merek yang eksplisit.

---

## 9. Aturan alur masuk

Ini bukan soal gaya, tapi soal urutan — dan urutannya sudah pernah salah sekali.

1. **Splash bermerek adalah layar pertama, selalu.** Untuk setiap murid, setiap peluncuran.
2. **Perkenalan menyusul** bila belum pernah selesai.
3. **Baru gerbang** — notifikasi, lalu akun Puter, lalu paket suara.

Gerbang **tidak boleh** membuka dirinya sendiri hanya untuk menutup lagi: memanggil
`setNotificationGateState('granted')` pada gerbang yang sedang tersembunyi menyebabkan
kedipan panel di setiap peluncuran. Kedua gerbang kini menjaga hal ini.

Gerbang juga **tidak boleh** menumpuk di atas splash atau perkenalan; gerbang paket suara
memeriksanya lewat `.fiezel-splash` / `.fiezel-ob` / `auth-locked` sebelum tampil.

---

## 10. Sebelum menambah komponen baru

- [ ] Semua warna dari token; tidak ada heksadesimal mentah di komponen.
- [ ] Terbaca di terang **dan** gelap, di keempat fase suasana.
- [ ] Sasaran sentuh ≥ 44 px; cincin fokus terlihat.
- [ ] Punya keadaan memuat, kosong, dan gagal.
- [ ] Ikon baru sudah masuk subset `lucide.min.js`.
- [ ] Animasi tunduk pada kurangi-gerak.
- [ ] Naskah bernada suportif — tanpa "wajib", tanpa "tidak bisa dibuka", tanpa menyapa nama
      murid di layar sistem.
