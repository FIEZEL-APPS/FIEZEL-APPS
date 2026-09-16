# Dua permukaan terbit, dan kenapa "SEO" di repo ini gampang mendarat di tempat yang salah

Otoritas: OWNER. Dokumen ini menutup satu perangkap yang sudah memakan satu putaran kerja
penuh — pekerjaan SEO yang benar isinya, dikerjakan di direktori yang salah, lalu lolos
tinjauan karena tidak ada satu pun dari 278 gerbang yang bisa melihat bedanya.

Status: **SELESAI untuk lubang yang dijelaskan di sini** (m025-314), dengan gerbang
`tests/seo-surface-gate-test.js` yang menahannya. Utang yang sengaja ditinggalkan ada di
bagian terakhir.

## Aturannya, satu kalimat

**Repo ini punya DUA permukaan terbit, dan akar repo BUKAN root domain.**

```
akar repo   --rsync-->  ~/public_html/app/   =>  https://fiezel.my.id/app/...
website/    --rsync-->  ~/public_html/       =>  https://fiezel.my.id/...
```

Sumbernya `.cpanel.yml` (jalur cPanel Git Version Control) dan
`.github/workflows/deploy-site.yml` (jalur Actions). Keduanya sengaja memakai urutan yang
sama, dan `website/` tercantum di `deploy/site-exclude.txt` supaya ia TIDAK ikut gelombang
`/app/`.

Artinya, untuk apa pun yang crawler baca:

| Kalau kamu menyunting… | Yang berubah di publik |
| --- | --- |
| `robots.txt` (akar) | `fiezel.my.id/app/robots.txt` — **tidak pernah dibaca crawler** |
| `website/robots.txt` | `fiezel.my.id/robots.txt` — **ini yang mengikat seluruh host** |
| `sitemap.xml` (akar) | `fiezel.my.id/app/sitemap.xml` — terikat jalur `/app/` saja |
| `website/sitemap.xml` | `fiezel.my.id/sitemap.xml` — yang ditunjuk robots.txt |
| `index.html` (akar) | `fiezel.my.id/app/` — cangkang aplikasi murid |
| `website/index.html` | `fiezel.my.id/` — beranda pemasaran |

## Apa yang rusak, dan kenapa tidak ada yang menangkapnya

Commit `c4e506d` dan `7587cf9` mengerjakan seluruh paket SEO di akar repo dengan anggapan
akar = root domain. Yang terjadi:

1. **`robots.txt` akar diubah dari `Disallow: /` ke `Allow: /`**, dicatat di pesan commit
   sebagai "fix kritis — Googlebot diblokir total". Berkas itu mendarat di
   `/app/robots.txt`. Crawler tidak pernah membaca robots.txt dari subdirektori; yang
   mengikat `website/robots.txt`, dan ia **sudah** `Allow: /` sejak PR #416. Nol perilaku
   berubah — tetapi laporannya berbunyi seolah lubang terbesar baru saja ditutup.

2. **`tentang.html` dibuat khusus supaya Google AI Overview punya bahan**, dengan kanonik
   `https://fiezel.my.id/tentang.html`. Berkasnya mendarat di `/app/tentang.html`; alamat
   yang dijanjikan kanoniknya **404**. Kanonik yang menunjuk 404 tidak membuat Google
   memilih alamat lain — ia membuang halamannya.

3. **`sitemap.xml` akar berisi 13 URL root domain**, mendarat di `/app/sitemap.xml`, dan
   tidak pernah ditunjuk robots.txt yang mengikat. Sebelas dari tiga belas URL-nya tidak
   punya berkas di akar sama sekali.

4. **`hreflang="id"` dan `hreflang="th"` menunjuk URL yang sama persis** di ketiga halaman.
   Pasangan yang bertentangan dengan dirinya sendiri dibuang Google tanpa satu pun pesan
   galat di Search Console — jadi ia terlihat seperti berhasil sampai berbulan-bulan
   kemudian.

5. **Blok JSON-LD di `<head>` memerahkan dua gerbang lama** (`boot-order-test`,
   `splash-first-paint-test`), jadi Quality Gate `main` GAGAL. Karena `deploy-site.yml`
   hanya berjalan sesudah Quality Gate hijau, **tidak satu bita pun dari seluruh pekerjaan
   SEO itu pernah sampai ke produksi.**

Kelas cacatnya satu, dan bukan salah satu dari lima butir di atas: **tidak ada apa pun yang
membandingkan alamat yang DIKLAIM sebuah berkas dengan alamat tempat berkas itu
benar-benar mendarat.** Kanonik, `og:url`, `<loc>` sitemap, dan target hreflang semuanya
adalah janji tentang URL — dan semuanya ditulis tangan.

## Gerbang yang sekarang menahannya

`tests/seo-surface-gate-test.js` memegang peta terbit di atas sebagai kode
(`berkasUntukUrl` / `urlUntukBerkas`) lalu menuntut, 19 cek:

- setiap `<loc>` di `website/sitemap.xml` punya berkas yang benar-benar terbit di alamat itu;
- kanonik dan `og:url` setiap halaman = URL terbit halaman itu sendiri;
- dua hreflang berbeda tidak pernah menunjuk URL yang sama, dan setiap targetnya ada;
- hreflang timbal balik (A→B menuntut B→A);
- satu `@id` schema.org tidak pernah dipakai dengan dua `@type` berbeda;
- robots.txt (keduanya) tidak memblokir `.js`/`.css`/`.json` — `/app/` adalah SPA, dan
  memblokirnya berarti meminta Googlebot merender halaman tanpa berkas yang membuat
  halaman itu ada;
- sitemap tidak memuat halaman `noindex`;
- setiap blok `application/ld+json` adalah JSON yang sah.

Gerbangnya dibuktikan MERAH terhadap keempat cacat asli sebelum dipakai, bukan dipercaya
karena hijau.

## Kontrak untuk siapa pun yang menyentuh SEO berikutnya

1. **Halaman yang ingin diindeks publik ditulis di `website/`**, bukan di akar. Akar hanya
   untuk cangkang aplikasi murid di `/app/`.
2. **Kanonik selalu URL terbit berkas itu sendiri.** Kalau kamu ingin Google memilih alamat
   lain, pindahkan berkasnya — jangan berbohong di kanoniknya.
3. **hreflang hanya ditulis kalau ada URL berbeda per bahasa.** Cangkang `/app/` satu URL
   untuk semua bahasa (ganti bahasa terjadi di dalam aplikasi), jadi ia tidak punya hreflang
   sama sekali, dan itu benar.
4. **Setiap halaman baru lahir dua bahasa**, sesuai `docs/handoffs/I18N-TH-PARITY-HANDOFF.md`.
   Pasangannya di `website/` adalah `website/<nama>.html` + `website/th/<nama>.html`, saling
   menunjuk lewat hreflang.
5. **Structured data tidak boleh mengklaim yang tidak tertulis kasatmata di halaman itu.**
   Ini bukan kerapian: ia pedoman Google, dan pelanggarannya berisiko penalti. Contoh nyata
   yang dicabut m025-314: `N5–N3 JLPT` (bank Jepang hanya N5–N4), "tes diagnostik CEFR dan
   JLPT otomatis" (nol kemunculan `JLPT` di `app.js`), dan speaking/listening tanpa batas
   (keduanya sengaja disembunyikan untuk kursus Jepang — lihat
   `tests/japanese-surface-honesty-test.js`).

## Catatan untuk A13: kenapa PR m025-314 menyentuh `features/neural-voice/`

Satu baris, dan hanya satu: `DIAG_BUILD` naik `m025-313` → `m025-314` di
`features/neural-voice/fiezel-diag-panel.js`. Itu **ritual bump build yang diwajibkan**
`CLAUDE.md` dan ditegakkan `tests/install-health-test.js` — menurunkannya kembali
memerahkan dua cek di gerbang itu. **Nol perubahan perilaku neural-voice**, jadi tidak ada
serah-terima neural-voice yang perlu ditulis; dokumen ini adalah handoff untuk perubahan
yang sebenarnya, yaitu permukaan terbit SEO.

## Yang SENGAJA belum dikerjakan (utang, bukan kelalaian)

- **Beranda `website/index.html` masih bicara Bahasa Inggris saja.** Menambahkan klaim
  Jepang ke JSON-LD-nya tanpa menambah teks kasatmata melanggar butir 5 di atas. Menulis
  ulang copy beranda adalah keputusan produk milik OWNER. Sampai itu diputuskan,
  `website/tentang.html` (+ pasangan th-nya) yang menampung cerita kursus Jepang.
- **`lastmod` di `website/sitemap.xml` seragam** untuk semua URL, termasuk halaman yang
  tidak berubah bulan ini. Nilai sinyalnya rendah; belum ada yang menurunkannya dari riwayat
  git.
- **Langkah berikutnya kalau OWNER mau melanjutkan**: daftarkan `fiezel.my.id` di Google
  Search Console (berkas verifikasinya sudah ada di `website/google65e8091974392340.html`),
  kirim `sitemap.xml`, lalu pantau laporan hreflang — gerbang ini menjaga bentuknya, bukan
  penerimaannya oleh Google.
