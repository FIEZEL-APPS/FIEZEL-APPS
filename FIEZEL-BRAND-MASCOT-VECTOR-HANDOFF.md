# FIEZEL — Maskot Vektor dan Splash Handoff

Tanggal: 2026-08-21 WIB
Lane: brand / redesign
Release: `DIAG_BUILD=m025-75`, `SW_REV=m025-75-brand-mascot-vector-20260821-1`
Base: `main@78e99be`
Sumber: sheet karakter FIEZEL + `FIEZEL_Complete_Design_Specification.pdf`

## APA YANG DIKERJAKAN

Sheet karakternya adalah render 3D berbulu. Vektor tidak bisa dan tidak seharusnya meniru bulu itu helai per helai — yang ditiru adalah **ciri pengenalnya**, karena itulah yang membuat sebuah karakter tetap dikenali pada 24 piksel maupun 240 piksel.

Ciri yang dipegang, semuanya ada dan dikunci gate:

- telinga kiri terlipat, asimetris terhadap telinga kanan;
- bandana merah dengan liontin huruf F emas;
- ekor lebat berujung krem;
- mata amber besar dengan kilau;
- bintang emas kecil di dekat telinga.

Warna diambil langsung dari spesifikasi (`#7a1e2e`, `#4a1119`, `#fdf3e2`, `#d9a441`, `#f3e0e0`), bukan dikira-kira dari gambar, dan gate menahannya tetap sama.

## LIMA POSE, SATU MARKUP

`wave` (splash), `study`, `cheer`, `sleep`, `idle`. Semuanya memakai markup yang sama; yang membedakan hanya kelas CSS. Bagian yang bergerak — telinga, ekor, tangan, kelopak mata, bintang — adalah elemen tersendiri, jadi animasi cukup menggerakkan bagiannya tanpa menggambar ulang karakternya.

## KENAPA CSS, BUKAN SMIL

Animasi ditulis sebagai `@keyframes` CSS. Alasannya bukan selera: blok `prefers-reduced-motion` global yang sudah ada di `style.css` memangkas durasi setiap animasi CSS, sehingga maskot ini otomatis ikut diam ketika pengguna meminta kurangi-gerak. SMIL tidak tunduk pada aturan itu, dan gate menolak kalau `<animate>` masuk ke berkas maskot.

## SPLASH: STEP 0 SPESIFIKASI

Wordmark, tagline, maskot melambai, gelembung ucapan `"Hai! Aku temanmu belajar di FIEZEL. Yuk, siap-siap!"`, dan satu tombol `Mulai kenalan`. Tayang 2,5 detik sesuai rentang 2–3 detik yang diminta.

Tiga batas yang dijaga, semuanya sudah dibayar mahal di produk ini:

1. **Tidak pernah menghalangi gerbang notifikasi.** Splash dipanggil SETELAH gerbang lolos, bukan sebelumnya. Notifikasi wajib di FIEZEL, dan sapaan tidak boleh berdiri di depan syarat masuk. Ia juga menutup diri lewat pewaktu DAN lewat sentuhan, jadi tidak ada keadaan di mana ia tertinggal menutupi layar — gate memeriksa kedua jalan keluar itu ada.
2. **Sekali sehari.** Splash yang muncul setiap kali membuka aplikasi berubah dari sambutan menjadi penghalang.
3. **Tunduk pada kurangi-gerak.** Maskotnya tetap tampil, hanya diam.

## GATE

`node brand-mascot-test.js` — 15 kasus: palet sesuai spesifikasi, semua ciri pengenal ada, `viewBox` tetap dan tanpa aset luar, id gradien tidak bertabrakan saat dua maskot tampil bersamaan, pose asing jatuh ke `idle`, judul yang disuntikkan tidak bisa menyuntik markup, maskot dekoratif tidak dibacakan dua kali pembaca layar, animasi berupa CSS sehingga tunduk pada kurangi-gerak, isi splash sesuai Step 0, tayang sekali sehari, selalu punya jalan keluar, menutup dua kali aman, tanpa modul maskot tidak merusak apa pun, penyimpanan yang menolak tidak menghalangi splash, dan tombolnya memenuhi ukuran sentuh 44px.

## YANG BELUM DIKERJAKAN, DAN KEPUTUSAN YANG MENUNGGU OWNER

- **Nama maskot.** Spesifikasi menyebut **"Percik"**; sheet karakter dan aplikasi memakai **FIEZEL**. Kode ini menyebutnya "maskot FIEZEL" secara netral sampai OWNER memutuskan. Sekali diputuskan, namanya muncul di teks yang dibaca murid, jadi lebih baik benar sejak awal.
- **Onboarding 6 langkah** (carousel fitur, pemilihan tujuan, placement test, dan seterusnya) belum dibuat — slice ini berhenti di Step 0. Maskot dan poseknya sudah siap dipakai di langkah-langkah berikutnya tanpa tambahan aset.
- **Ikon aplikasi berbasis maskot** (sheet menunjukkan dua varian) belum dibuat; itu perlu PNG berukuran tetap, bukan SVG inline.
- Tipografi Fredoka dan Plus Jakarta Sans belum dipasang; teks masih memakai fallback sistem. Memuatnya berarti menambah aset font ke shell offline — keputusan ukuran unduhan, jadi ditahan sampai OWNER menyetujui.
