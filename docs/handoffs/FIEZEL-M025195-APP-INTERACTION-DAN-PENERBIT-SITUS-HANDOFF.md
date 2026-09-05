# Handoff m025-195 — interaksi app-like + penerbit situs

**Status:** kode siap dan hijau; **penerbitan ke produksi masih menunggu OWNER.**
**Otoritas:** keputusan kunci zoom diambil **OWNER** 29 Agu 2026. Nomor build lewat arbiter
MASTER (`tools/bump-build.mjs`), bukan diketik tangan.
**Basis:** `m025-195`, di atas `origin/main` `af07279`.

---

## Kenapa handoff ini ada

`features/neural-voice/fiezel-diag-panel.js` ikut berubah di rilis ini, dan A13 menuntut
handoff untuk setiap perubahan yang menyentuh wilayah neural/classroom. **Perubahan pada
berkas itu hanyalah nomor build** yang ditulis arbiter — nol perubahan perilaku neural.
Handoff ini tetap ditulis, bukan diakali lewat kata kunci di body PR, karena ada dua hal yang
memang perlu diserahkan: satu keputusan produk yang berbiaya, dan satu jalur rilis baru yang
belum pernah dipakai siapa pun.

## 1. Keputusan OWNER: zoom halaman dikunci

Sampai m025-186 repo ini **sengaja membuka** zoom demi WCAG 1.4.4/1.4.10 (audit D16/D5-T1).
OWNER membalikkannya sesudah biayanya disampaikan: FIEZEL harus terasa aplikasi, bukan dokumen.

**Biaya yang diterima:** murid low-vision kehilangan perbesaran halaman. Penyimpangan sadar
dari WCAG 1.4.4 (Resize Text) dan 1.4.10 (Reflow).

**Utang yang belum dibayar, dan ini rekomendasi utama handoff ini:** *pengatur ukuran teks di
dalam aplikasi*. Belum ada — dicek, `preferences` tidak punya field ukuran teks. Itu
satu-satunya cara menutup biaya di atas **tanpa** membatalkan keputusan OWNER. Siapa pun yang
melanjutkan: kerjakan ini lebih dulu daripada polesan interaksi lain.

**Jangan balik tanpa OWNER.** Kuncinya bukan kelalaian. Biayanya tercatat di tiga tempat
(`index.html`, `features/ui/fiezel-zoom-lock.js`, `tests/app-interaction-policy-test.js`), dan dua
gerbang kini **merah** kalau zoom dibuka lagi — atau kalau kuncinya dikerjakan setengah.

> Setengah = mengubah viewport saja. iOS Safari **mengabaikan** `user-scalable=no` sejak
> iOS 10, jadi meta sendirian tidak mengunci apa pun di iPhone. Yang mengunci adalah
> `gesturestart/gesturechange/gestureend`.

## 2. Jalur rilis baru — BELUM PERNAH DIPAKAI

Sebelum rilis ini repo tidak punya **satu pun** mekanisme yang menerbitkan aplikasi ke
`fiezel.my.id/app/`. Sekarang ada, dan ini yang perlu diketahui penerusnya:

- `deploy-site.yml` menyala **hanya** sesudah *FIEZEL Quality Gate* hijau di `main`.
- Urutan dua gelombang: seluruh aset dulu, **`sw.js` paling akhir**. Membaliknya = murid
  memegang shell campur. `tests/deploy-site-gate-test.js` menegakkan urutan ini di sumber.
- Sesudah unggah, `tools/deploy-site-verify.mjs` menarik ulang dari situs hidup dan menuntut
  penandanya cocok. Kalau merah, unggahan **tidak** terbukti sampai — jangan longgarkan.

**Status: SKIP.** Secret hosting belum terpasang, jadi workflow menulis alasan di ringkasan
Actions dan tidak menerbitkan apa pun. Selama ini SKIP, nomor build di repo tetap **janji**,
bukan fakta produksi.

## Langkah berikutnya (berurutan)

1. **OWNER**: cek cPanel → *Git Version Control*. Kalau repo sudah terdaftar, `.cpanel.yml`
   sudah benar dan tidak perlu secret sama sekali.
2. **OWNER**: kalau belum, pasang `FIEZEL_DEPLOY_HOST/USER/SSH_KEY/PATH`. Rincian lengkap
   dan penanganan galat ada di **`deploy/SITE-DEPLOY.md`**.
3. **Siapa pun**: `node tools/deploy-site-verify.mjs --base https://fiezel.my.id/app` untuk
   melihat build yang benar-benar disajikan produksi. Nol kredensial dibutuhkan.
4. **OWNER**: jalankan tiga gerbang live (`cf_live_base`, `ai_live_base`) sekali di SHA hijau.
   Sejak migrasi identitas akun, ketiganya sudah **bisa** dijalankan lagi.
5. **Penerus**: bayar utang pengatur ukuran teks (bagian 1).

## Batas jujur

Dua kontrol panel diagnostik (`#fiezelDiagSearch` 13px, `#fiezelDiagText` 11px) masih di bawah
lantai 16px. Gayanya disuntik dari `features/neural-voice/fiezel-diag-panel.js` dengan selector
ID sehingga menang atas lantai elemen di `style.css`. Berkas itu **wilayah klaim sesi
neural-voice**, jadi tidak disentuh dan tidak dipura-purakan beres — assert (F) di
`tests/app-interaction-policy-test.js` menguncinya supaya tetap terlihat. Panel itu permukaan
**owner**, bukan murid, jadi dampaknya terbatas.

Verifikasi peramban dilakukan di Chromium (profil iPhone 13 / Pixel 5 / desktop), **bukan
WebKit asli**. Perilaku zoom-saat-fokus iOS baru final di Safari sungguhan.
