# FIEZEL — Design System · "Warm Paper, Bright Mind"

Dokumen ini adalah jawaban atas Audit UX **Bagian 5** dan **Roadmap Jangka Menengah**
("bangun design system terdokumentasi supaya semua fitur baru konsisten"). Ditulis ulang
pada audit UI/UX 2026-08 (temuan 03-001) karena versi lama masih mendokumentasikan palet
marun v5 dan mode gelap yang sudah dihapus — dokumen kanonis yang menyesatkan lebih
berbahaya daripada tidak ada dokumen.

Aturannya satu: **jangan pernah menulis nilai mentah.** Setiap warna, radius, bayangan,
durasi, dan font di produk ini punya token. Nilai mentah di dalam komponen adalah cara
paling umum sebuah aplikasi perlahan-lahan terlihat "campur aduk".

---

## 1. Warna

Sumber kebenaran: blok `:root` **kedua** di `style.css` (bertanda `FIEZEL Design System
v6.0`, ±baris 652–790). Blok `:root` pertama di kepala berkas adalah generasi lama dan
**ditimpa** oleh v6 — jangan menambah token baru di sana. (`--yellow`/`--yellow-deep` di
blok pertama adalah alias lawas yang nilainya sudah disamakan dengan `--sun`/`--sun-deep`;
pemakaian baru harus memakai keluarga `--sun`.)

### Kuning adalah warna BIDANG, bukan warna teks

Ini aturan warna terpenting seluruh produk (komentar style.css di blok v6): `--sun` di
atas `--bg` hanya 1,5:1. Kuning boleh mengisi tombol, kapsul, dan latar — teks di atasnya
selalu tinta (`--text` di atas `--sun` ≈ 10,9:1). Satu-satunya "kuning" yang boleh menjadi
teks adalah `--info` `#7A5F1B` (≈5,9:1 di atas cream). Chip yang melanggar aturan ini
(`.level-trust-chip`) sudah dikoreksi pada audit 02-003.

### Keluarga merek (bidang kuning)

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--sun` | `#FFC700` | Bidang merek: tombol utama (`.primary`), kapsul nav aktif, isian ikon. |
| `--sun-deep` | `#E6A800` | Garis/tepi di atas bidang kuning; border `.primary`. |
| `--sun-press` | `#CC9600` | Keadaan tekan bidang kuning. |
| `--sun-soft` | `#FFF3C4` | Latar kuning lembut (kapsul tab aktif, hover). |
| `--sun-grad` | `linear-gradient(180deg,#FFDE59,#FFA500)` | Gradien splash/hero. |

### Netral "kertas hangat"

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--bg` | `#FFF9EE` | Latar halaman (cream). |
| `--panel` | `#FFFFFF` | Permukaan kartu, modal, gerbang. |
| `--panel-soft` | `#FFF3DC` | Permukaan sekunder, kolom isian. |
| `--line` / `--line-soft` | `#F0E4CF` / `#F7EFDF` | Garis rambut, pemisah. |
| `--text` (= `--black`) | `#241A11` | Tinta utama. |
| `--muted` / `--muted-soft` | `#6E5E47` / `#7E6C4B` | Teks pendukung. `--muted` di atas cream ≈5,7:1 — **jangan** diturunkan lagi dengan `opacity` (pelajaran audit 14-002). |

### Aksen dan emas

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--accent` | `#C2402C` | **Terracotta — BUKAN marun.** Aksen, tautan, sorotan. |
| `--accent-strong` | `#A33422` | Keadaan tekan/hover aksen; tinta aksen di teks kecil. |
| `--accent-soft` | `#FDE3DE` | Latar lembut bernuansa aksen. |
| `--gold` | `#C9A24B` | Aksen kedua dekoratif: garis jalur, hadiah. Hanya 1,9:1 di atas cream — dekorasi saja, bukan teks/fokus. |

### Semantik

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--good` / `--good-bright` / `--good-soft` | `#1F6B4E` / `#2E8B69` / `#E9F7F0` | Berhasil (tinta / bidang terang / latar). |
| `--bad` / `--bad-bright` / `--bad-soft` | `#AC3E2A` / `#B8432D` / `#FDE3DE` | Gagal, bahaya. `--bad-bright` untuk garis/bidang, bukan teks kecil. |
| `--info` / `--info-soft` | `#7A5F1B` / `#FFF3C4` | Satu-satunya kuning-teks yang sah + latarnya. |
| `--focus-ring` | `#A67A00` | Cincin fokus tunggal seluruh aplikasi. |
| `--scrim` / `--scrim-soft` | `rgba(36,26,17,.45)` / `rgba(36,26,17,.28)` | Backdrop modal (turunan tinta, bukan kabut terang). |

### Permukaan gelap "core"

Satu-satunya keluarga gelap yang tersisa — panggung splash, kartu highlight, toast:
`--core #1B1418`, `--core-soft #2A2126`, `--core-line #3A3038`, `--on-core #FDFAF3`,
`--on-core-muted rgba(253,250,243,.68)`. Teks di atas core memakai `--on-core*`, bukan
`--text`.

### Empat fase suasana

`body` membawa salah satu dari `scene-day` / `scene-dawn` / `scene-dusk` / `scene-night`.
Fase ini menimpa token *ambient* dan *glass* (`--ambient-text`, `--chrome-bg`, `--glass-*`)
mengikuti waktu setempat. Ini **bukan** mode gelap — keempat fase tetap keluarga terang, dan
`theme-color` runtime ikut kroma fase (chrome boot tetap `#FFF9EE`).

---

## 2. Mode gelap: DIHAPUS

Mode gelap **dihapus seluruhnya pada m025-134** (lihat `FIEZEL-M025134-HAPUS-MODE-GELAP-HANDOFF.md`).
Fakta yang berlaku sekarang:

- Tidak ada `@media (prefers-color-scheme:dark)` dan tidak ada blok `:root[data-theme="dark"]`
  di `style.css`. `features/ui/fiezel-dark-mode.js` tidak pernah ada lagi.
- `index.html` memasang `<meta name="color-scheme" content="light">` dan
  `<meta name="theme-color" content="#FFF9EE">` supaya kontrol bawaan peramban ikut terang.
- `features/ui/fiezel-ui-manager.js` memaku `data-theme='light'` sebagai shim defensif —
  atribut itu **bukan** sakelar; nilainya tidak boleh dibaca sebagai fitur.

**Jangan** menambahkan token yang hanya punya nilai "gelap", dan jangan menghidupkan kembali
tabel dua kolom terang/gelap di dokumen ini. Aplikasi ini terang, selalu.

---

## 3. Tipografi

Tiga wajah, tiga peran, semuanya *self-host* dari `assets/fonts/` lewat `@font-face` —
**tidak boleh** kembali ke Google Fonts CDN, karena aplikasi ini offline-first dan gate
`onboarding-test.js` menahannya.

| Token | Font | Peran |
|---|---|---|
| `--fz-display` | FZ Instrument Serif (400) | **Display besar saja**: `.section-head h1`, `.welcome-panel h2`, `.modal-panel h2`, `.fiezel-title`, wordmark splash. Selalu `font-weight:400` — serif ini **tidak boleh di-faux-bold** (temuan 02-004). |
| `--fz-heading` | FZ Plus Jakarta Sans (700) | Bawaan `h1–h4`, `.welcome-mark`, `.modal-mark`, judul kartu/UI. |
| `--fz-body` | FZ Plus Jakarta Sans (400–700) | Seluruh teks tubuh, tombol, label. Tombol mewarisi lewat `font:inherit`. |
| `--fz-display-round` | FZ Fredoka (variabel) | **Terbatas**: hanya `.word` dan `.lesson-title` (kata target di kuis dan judul materi). Jangan meluas tanpa keputusan merek. |

Serif display dipakai HANYA di ukuran besar dengan `letter-spacing:-.015em`; di ukuran kecil
serif kontras-tinggi kehilangan keterbacaan di ponsel, jadi judul kecil tetap Jakarta.

---

## 4. Bentuk dan kedalaman

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--radius-lg` | `24px` | Kartu, panel besar. |
| `--radius-md` | `16px` | Kotak sekunder, kolom isian. |
| `--radius-sm` | `12px` | Chip, lencana. |
| `--radius-pill` | `999px` | Tombol pil, kapsul. |
| `--shadow-sm` | `0 2px 10px rgba(36,26,17,.06)` | Kartu diam. |
| `--shadow-md` | `0 10px 30px rgba(36,26,17,.09)` | Elemen terangkat. |
| `--shadow-lg` | `0 24px 60px rgba(36,26,17,.15)` | Modal, gerbang. |

**Tanda tangan taktil FIEZEL**: permukaan interaktif utama memakai *hard offset* pekat —
`box-shadow:0 4px 0 var(--sun-deep)` (tombol utama), `0 3px 0 var(--surface-edge)` (kartu
tombol), `0 2px 0 var(--surface-edge)` (bottom nav) — lalu bayangan ambient lembut di
belakangnya. Offset keras + ambient halus itulah yang membuat UI terasa "bisa ditekan";
jangan menggantinya dengan drop-shadow biasa.

---

## 5. Gerak

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--ease` (= `--fz-out`) | `cubic-bezier(.22,.8,.28,1)` | Transisi tenang: halaman, warna, opasitas. |
| `--ease-spring` (= `--fz-spring`) | `cubic-bezier(.34,1.4,.4,1)` | Interaksi bertenaga: tekan tombol, modal masuk. |
| `--dur-s` / `--dur-m` / `--dur-l` | `.18s` / `.32s` / `.5s` | Pendek / sedang / panjang. |

Aturan: animasi hanya `transform` dan `opacity`; splash punya **satu jam koreografi**
(`splash-choreography-test.js` menjaganya); nama `@keyframes` harus unik seberkas penuh
(tabrakan nama pernah mematikan animasi diam-diam, temuan 12-003).

**Kurangi-gerak wajib dihormati.** Ada blok global `@media (prefers-reduced-motion:reduce)`
yang memangkas semua animasi, ditambah penimpaan lokal untuk sekuens splash dan onboarding,
plus kelas `.is-static` dari sakelar Pengaturan. Modul SFX transisi juga diam total di modus ini.

---

## 6. Ikon — dua keluarga, dua peran

1. **`fz-i` duotone** (`features/ui/fiezel-icons.js`) — ikon identitas: garis coklat
   (`--fz-i-line`) + isian pastel (`--fz-i-fill`). Untuk *chrome* aplikasi: bottom nav,
   kartu modul/skill, ritual harian.
2. **Lucide** (garis, `stroke`) — glyph di dalam konten: tombol, baris pengaturan, panah.
   Bundle `lucide.min.js` adalah **subset**; setiap `data-lucide="…"` baru **harus** ada di
   dalam subset. Ikon yang tidak ada merender kotak kosong tanpa galat ("■", temuan m025-80).

> **Aturan ukuran wajib (pelajaran 20-002 dan m025-166):** setiap konteks pemakaian `.fz-i`
> **harus** mendeklarasikan `width`/`height`-nya sendiri, dan kelas dasar `.fz-i` membawa
> pagar `max-width:48px;max-height:48px`. Tanpa ukuran eksplisit SVG-nya mekar ke ukuran
> intrinsik 300px — bug ini sudah terjadi dua kali (ikon Peta, api ritual harian).

Jangan menggambar ulang path ikon dengan tangan, dan jangan mencampur emoji dengan ikon
garis di permukaan yang sama.

---

## 7. Keadaan yang wajib didesain

Setiap layar yang memuat data **harus** punya ketiganya. Ini bagian dari definisi selesai,
bukan tambahan.

| Keadaan | Kelas | Catatan |
|---|---|---|
| Memuat | `.skeleton`, `.skeleton-card`, `.skeleton-grid` | Kerlip, bukan pemutar berputar. |
| Kosong | `.empty-state`, `.empty-state-minimal`, `.empty-inline` | Lambang + judul + ajakan, bukan layar putih. |
| Gagal | `.empty-state` + lambang peringatan | Sediakan tombol coba lagi. |

Bantuannya ada di `features/ui/skeleton-helpers.js`.

---

## 8. Bunyi

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

## 9. Identitas merek

| Aset | Berkas | Status |
|---|---|---|
| Ikon aplikasi | `assets/brand/fiezel-icon.svg` (sumber) | Huruf F + dua batang: inisial merek sekaligus gelombang suara. |
| Ikon ter-render | `favicon-64`, `apple-touch-icon` (180), `fiezel-icon-192`, `fiezel-icon-512` | Di-render dari SVG, diperkecil dengan LANCZOS. |
| Wordmark | `assets/brand/fiezel-wordmark.svg` / `-mono.svg` | Topbar: tinta coklat + dua balok terracotta (token `--wordmark-*`). |
| **Maskot PAW — HIDUP** | `assets/brand/paw-mascot-full.svg` / `-head.svg` (+ PNG 512) | Kucing maskot produk. Bukan konsep — dipakai di ritual harian, kuis, gerbang level. |
| Motion maskot — HIDUP | `features/mascot/fiezel-mascot.js` + `fiezel-motion.css` | Custom element `<fiezel-mascot>`, 14 state. Panggil lewat `pawReact`/`pawFaceMarkup` di `app.js` (pembungkus itu yang menghormati kurangi-gerak), jangan lewat elemennya langsung. |

**Zona aman maskable.** `fiezel-icon-512.png` didaftarkan dengan `purpose:"maskable"`;
seluruh isi ikon harus berada di dalam lingkaran berjari-jari **204,8 px** dari pusat kanvas
512. Periksa ulang setiap kali bentuknya diubah.

**Warna chrome PWA**: `manifest.json` memakai `background_color:#FFF9EE` (menyambung mulus
ke splash cream) dan `theme_color:#FFC700`; meta `theme-color` statis di `index.html`
adalah `#FFF9EE` dan boleh ditimpa runtime oleh fase suasana (§1).

> Karakter lama "Percik" dihapus pada m025-80; PAW adalah penggantinya yang sah. Jangan
> memperkenalkan gaya ilustrasi ketiga tanpa keputusan merek yang eksplisit.

---

## 10. Aturan alur masuk

Ini bukan soal gaya, tapi soal urutan — dan urutannya sudah pernah salah sekali.

1. **Splash bermerek adalah layar pertama, selalu.** Untuk setiap murid, setiap peluncuran.
   Markup statisnya di `index.html` harus **identik byte demi byte** dengan
   `FiezelSplash.markup()`, dan setiap aturan CSS di `<style id="fiezelBootCritical">` harus
   ada apa adanya di `style.css` (kecuali aturan khusus-boot) — `splash-first-paint-test.js`
   menjaganya.
2. **Perkenalan menyusul** bila belum pernah selesai.
3. **Baru gerbang** — notifikasi, lalu akun Puter, lalu paket suara.

Gerbang **tidak boleh** membuka dirinya sendiri hanya untuk menutup lagi, dan **tidak
boleh** menumpuk di atas splash atau perkenalan; gerbang paket suara memeriksanya lewat
`.fiezel-splash` / `.fiezel-ob` / `auth-locked` sebelum tampil.

---

## 11. Sebelum menambah komponen baru

- [ ] Semua warna dari token **v6**; tidak ada heksadesimal mentah di komponen.
- [ ] Kuning hanya bidang; teks kuning satu-satunya adalah `--info`.
- [ ] Terbaca di keempat fase suasana (tidak ada mode gelap yang perlu diuji).
- [ ] Sasaran sentuh ≥ 44 px; cincin fokus `--focus-ring` terlihat.
- [ ] Punya keadaan memuat, kosong, dan gagal.
- [ ] Ikon baru: Lucide sudah masuk subset; `.fz-i` baru punya `width`/`height` eksplisit.
- [ ] Animasi tunduk pada kurangi-gerak; hanya `transform`/`opacity`; nama keyframes unik.
- [ ] Naskah kamu/aku bernada suportif — tanpa "wajib", tanpa "tidak bisa dibuka", tanpa
      menyapa nama murid di layar sistem.
