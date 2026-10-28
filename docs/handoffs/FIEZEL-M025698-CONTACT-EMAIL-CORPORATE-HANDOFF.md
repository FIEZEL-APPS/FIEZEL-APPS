# FIEZEL m025-698: Integrasi Email Korporat Resmi halo@fiezel.my.id & Pembaruan Kontak Situs

Otoritas: OWNER.
Nomor Build: `m025-698`
Tanggal: 28 Oktober 2026

## Ringkasan Perubahan
Memperbarui seluruh titik kontak dan data penanggung jawab di website publik FIEZEL (`https://fiezel.my.id`) dari email personal sebelumnya (`fitrajft@gmail.com`) ke email korporat resmi **`halo@fiezel.my.id`**.

## Rincian Berkas yang Disentuh
1. `website/index.html`:
   - Footer kredit menambahkan `Kontak: halo@fiezel.my.id`.
   - Navigasi footer (`foot-links`) menambahkan tautan `Kontak Kami` (`mailto:halo@fiezel.my.id`).
2. `website/tentang.html`:
   - Menambahkan kontak resmi `halo@fiezel.my.id` di area footer dan tautan footer.
3. `website/untuk-sekolah.html`:
   - Tombol CTA kemitraan sekolah menambahkan tombol `Hubungi Email: halo@fiezel.my.id`.
4. `website/privacy/index.html`:
   - Mengalihkan penanggung jawab data dan kontak pertanyaan privasi ke `halo@fiezel.my.id`.
5. `website/terms/index.html`:
   - Mengalihkan kontak syarat ketentuan ke `halo@fiezel.my.id`.
6. `website/th/privacy/index.html` & `website/th/terms/index.html`:
   - Menyelaraskan kontak privasi dan syarat penggunaan versi bahasa Thai ke `halo@fiezel.my.id`.
7. `website/llms.txt`:
   - Memperbarui email perwakilan resmi pendiri ke `halo@fiezel.my.id`.
8. Sinkronisasi Build Versi `m025-698`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`

## Status Pengujian Mutu (Quality Gates)
- `node tests/id-golden-snapshot-test.js` -> PASS
- `node tests/th-ui-leak-test.js` -> PASS
- `node tests/curriculum-cache-version-test.js` -> PASS (33 penegasan, build m025-698)
- `node tests/gate-registry-test.js` -> PASS (10 pass, 0 fail)
- `node tools/bump-build.mjs --check` -> PASS (Selaras)
