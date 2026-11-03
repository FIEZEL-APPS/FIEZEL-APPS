# FIEZEL m025-755 Handoff: CSS Integrity, Zombie CSS Elimination, and Anti-Stacking Invariant

## Authority & Mandate
- **Authority**: OWNER & MASTER Mandate
- **Status**: PRODUCTION READY (m025-755)
- **Scope**: CSS Integrity, Dead Zombie Stylesheet Purge, and Specificity Governance

---

## 1. Executive Summary & Root Cause Analysis
Pengguna mengidentifikasi regresi visual di mana CSS lama atau rusak muncul kembali setelah pembaruan non-CSS (misalnya saat memperbaiki grammar atau kuis). Investigasi mendalam menemukan akar masalah:
1. **Perangkap "Slipping Mask"**: Selektor baru menggunakan multi-class chains berspesifisitas semu (misal `.clay-theme .option-btn`) untuk menimpa aturan 596 KB di `style.css`. Saat agen lain menyentuh markup DOM di fitur kuis atau grammar dan melepaskan wrapper tersebut, aturan CSS modern gagal cocok dan browser jatuh kembali ke visual lama di `style.css`.
2. **Zombie Code Residue**: Berkas stylesheet lama seperti `features/ui/fiezel-marshmallow.css` (24 KB) dan `features/mascot/micro-ui.css` (10 KB) masih tersimpan di repositori git tanpa pernah dimuat oleh `index.html` atau di-precache oleh `sw.js`. Hal ini membingungkan agen baru yang memindai workspace.
3. **Patch-CSS Sprawl**: Kebiasaan membuat berkas stylesheet penambal baru bertumpuk-tumpuk (`fiezel-2.css`, `features/grammar/grammar-upgrade.css`, `features/ui/fiezel-tactile-clay.css`) alih-alih mengedit berkas sumber aslinya.

---

## 2. Actions Taken
1. **Pemusnahan Berkas CSS Zombie**:
   - Menghapus secara permanen `features/ui/fiezel-marshmallow.css`.
   - Menghapus secara permanen `features/mascot/micro-ui.css`.
   - Memperbarui `features/mascot/README.md` agar bebas dari rujukan berkas yang telah dihapus.
2. **Formalisasi Aturan Anti-Stacking di `AGENTS.md`**:
   - Menambahkan pasal mutlak **§0-C. CSS ARCHITECTURE, SPECIFICITY SANITY, & ZERO-STACKING INVARIANT**:
     - Larangan keras membuat berkas CSS penambal baru (`fiezel-3.css`, `style-fix.css`, dll.). Perubahan harus dilakukan langsung di berkas sumber aslinya.
     - Kewajiban membuat komponen DOM inti (`.option-btn`, `.card`, `.badge`, umpan balik) memiliki gaya dasar mandiri tanpa spesifisitas semu multi-wrapper.
     - Larangan meninggalkan berkas CSS mati di repositori.
     - Kewajiban sinkronisasi build (`bump-build.mjs`) pada setiap modifikasi CSS agar cache Service Worker (`SW_REV`) selalu sinkron.
3. **Sinkronisasi Build m025-755**:
   - Menyelaraskan seluruh 6 titik rilis: `BUILD-VERSION.json`, `sw.js`, `core-config.js`, `fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`.

---

## 3. Verification & Empirical Audit
- **Git Check**: `git diff --check` lulus 100% tanpa trailing whitespace.
- **Hexa-Sync**: `node tools/bump-build.mjs --check` menghasilkan status `Selaras`.
- **Integrity**: Seluruh 21 berkas stylesheet aktif di `index.html` diverifikasi utuh dan terdaftar di `sw.js` `ASSETS`.

---

## 4. Next Steps & Roadmap (Langkah Berikut)
1. **Monitoring Evaluasi Murid**: Pantau rilis produksi `m025-755` di `https://fiezel.my.id/app/` untuk memastikan tampilan visual tetap mulus dan konsisten.
2. **Penerapan Mandat**: Seluruh agen masa depan yang memodifikasi fitur kuis, grammar, atau dialog wajib menaati klausul §0-C di `AGENTS.md`.
