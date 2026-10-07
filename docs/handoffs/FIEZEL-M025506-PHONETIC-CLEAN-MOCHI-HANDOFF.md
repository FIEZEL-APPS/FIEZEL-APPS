# FIEZEL HANDOFF DOSSIER: M025-506
## Complete Eradication of Phonetic Red Border Box & Universalization of 3D Mochi Companion

- **Build Version**: `m025-506`
- **Tanggal**: 2026-10-08
- **Tipe**: `fix(ui)`
- **Status Mutu**: 100% HIJAU (Semua Gerbang Mutu Lokal Lulus)
- **Hexa-Sync**: Selaras di 6 titik kanonik (`m025-506`)

---

### 1. Ringkasan Eksekutif & Amanat Perubahan

Berdasarkan amanat dan pengujian langsung pada antarmuka murid PWA FIEZEL:
1. **Penghapusan Kotak Merah Fonetik (Red Border Box & Pink Background Eradication)**:
   - Murid melaporkan adanya kotak garis merah/merah muda dengan latar belakang merah muda terang di sekitar simbol pelafalan fonetik (seperti `/jɪə(r)/`, `/ɑːsk/`) pada soal kosakata.
   - Seluruh aturan CSS lawas yang memberikan `border: 1.5px solid #F43F5E; background: #FFF1F2;` atau sejenisnya pada `.phonetic` telah dimusnahkan secara tuntas.
   - Fonetik kini tampil elegan, jernih, dan menyatu dengan tipografi desain sistem travertine: `background: transparent !important; border: none !important; box-shadow: none !important; color: #64748B !important;`.
2. **Pemusnahan Maskot Lama 2D "PAW" & Pengangkatan Penuh Maskot 3D Mochi**:
   - Seluruh kemunculan nama warisan "PAW" pada antarmuka murid (*copy map* Bahasa Indonesia `copy-id-*` dan Thai `copy-th-*`) telah diganti secara konsisten menjadi "Mochi".
   - Atribut DOM aksesibilitas dan gambar seperti `alt="PAW"` telah diperbarui menjadi `alt="Mochi"`.
   - Komponen maskot lama SVG 2D (`.fz-svg`, `.paw-avatar`, dsb.) ditekan sepenuhnya agar tidak bocor, dan wadah maskot diisi secara kanonik oleh maskot 3D Volumetric Plush Jelly Mochi Daifuku.
3. **Badge Indikator Idle & Gerakan Telinga (Ear Wiggle)**:
   - Saat maskot diam (*idle*), selalu terpasang badge chat ungu aktif (`badge: 'chat_purple'`) dengan 3 titik animasi meloncat (*hopping dots*) dan aura lembut ungu (*purple aura*).
   - Setiap kali masuk soal baru (*transition* `question-shown`) atau sesi baru, telinga Mochi secara dinamis bergerak/menggoyang (*ear wiggle* `triggerEarWiggle(1.3)`).
4. **Proporsi Mochi Lebih Besar & Mewah (Enlarged Framing)**:
   - Kamera 3D didekatkan dari kejauhan `Z=7.3` ke `Z=5.35` (`this.camera.position.set(0, 0.08, 5.35)`), memberikan tampilan Mochi yang bulat, tebal, mewah, dan berukuran cukup besar tanpa terpotong di tepi kanvas.

---

### 2. Berkas yang Diubah & Rincian Perbaikan

1. **`features/ui/fiezel-vivid.css`**:
   - Menimpa `.vocab-focus .phonetic, #app .phonetic, .phonetic` dengan styling bersih:
     ```css
     color: #64748B !important;
     background: transparent !important;
     border: none !important;
     box-shadow: none !important;
     outline: none !important;
     padding: 0 !important;
     ```
2. **`features/ui/mobile-edge-fit.css`**:
   - Menambahkan pengamanan global fallback untuk `.phonetic` agar bebas dari garis tepi merah dan background merah muda di semua kondisi viewport mobile/desktop.
   - Menekan elemen SVG lawas `.fz-svg` agar tidak muncul mendampingi maskot 3D.
3. **`features/i18n/copy-id-*.js` & `copy-th-*.js`**:
   - `copy-id-feat-b.js` & `copy-th-feat-b.js`: "Halo! Aku Mochi. Nama kamu siapa?" / "สวัสดี! เราคือ Mochi คุณชื่ออะไร?".
   - `copy-id-redesign.js` & `copy-th-redesign.js`: "Maskot Mochi", "Kata Mochi", "Mochi, bantu!", "MOCHI TURUN TANGAN", "{n} dibantu Mochi".
   - `copy-id-proctor.js` & `copy-th-proctor.js`: "Mochi istirahat dulu".
   - `copy-id-student.js` & `copy-th-student.js`: "Mochi menemani dari A1".
   - `copy-id-worker.js` & `copy-th-worker.js`: "Saya Mochi".
4. **`index.html`**:
   - Memperbarui atribut `alt="Mochi"` pada avatar.
5. **`features/speaking-listening/fiezel-jlpt-listening.js`**:
   - Membungkus label pembicara dinamis dengan `t('speaker.student', 'Murid')` sehingga bebas dari kebocoran naskah di mode Thai (`th-ui-leak-test`).
6. **`id-golden-baseline.json`**:
   - Menyelaraskan 4938 entri baseline emas teks murid Indonesia terhadap pembaruan nama resmi Mochi.
7. **Arbiter Hexa-Sync (Versi `m025-506`)**:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`

---

### 3. Bukti Pengujian Empiris (Playwright Headless Probe)

Skrip probe empiris peramban `tests/mochi_pwa_integration_probe.js` dijalankan secara mandiri pada server lokal PWA (`http://localhost:8129`):
1. **Inspeksi Elemen DOM Fonetik**:
   - `computedStyle.border`: `"0px none rgb(100, 116, 139)"` (TERKONFIRMASI 0px / TANPA GARIS MERAH).
   - `computedStyle.backgroundColor`: `"rgba(0, 0, 0, 0)"` (TERKONFIRMASI 100% TRANSPARAN / TANPA BACKGROUND PINK).
   - `computedStyle.color`: `"rgb(100, 116, 139)"` (Warna netral slate-500 selaras tema).
2. **Inspeksi Maskot 3D Mochi**:
   - Maskot terpasang dengan canvas WebGL Three.js beresolusi penuh.
   - State awal memuat `badge === 'chat_purple'` dan `aura === 'purple'`.
   - Event `question-shown` memicu `triggerEarWiggle(1.3)` pada kedua telinga secara elastis.
   - Tangkapan layar empiris tersimpan di `tests/output/mochi_pwa_quiz_initial.png`.

---

### 4. Status Gerbang Mutu Lokal (Quality Gates)

Semua gerbang mutu lulus 100%:
- `node tests/id-golden-snapshot-test.js` : **PASS** (13 berkas identik, 4938 literal selaras)
- `node tests/th-coverage-test.js` : **PASS** (250/250 asserts)
- `node tests/th-bank-purity-test.js` : **PASS** (26/26 asserts)
- `node tests/th-ui-leak-test.js` : **PASS** (0 leaks)
- `node tests/gate-registry-test.js` : **PASS** (10 pass, 0 fail)
- `node tests/paw-mascot-test.js` : **PASS** (35 pass)
- `node tests/pawprint-geometry-gate-test.js` : **PASS** (5 pass)
- `node tests/mascot-reduced-motion-test.js` : **PASS** (19 states, 14 expressions)
- `node tests/precache-covers-shell-test.js` : **PASS** (5/5 asserts)
- `node tests/curriculum-cache-version-test.js` : **PASS** (26 penegasan, 2 halaman, build m025-506)
- `node tools/bump-build.mjs --check` : **SELARAS** di seluruh 6 titik wajib.

---

### 5. Prosedur Rilis & Verifikasi CI

Sesuai *Git Protection Rule*:
1. Perubahan di-commit ke branch `feat/m025-505-phonetic-clean-mochi-companion`.
2. Dibuat Pull Request (PR) ke branch `main`.
3. CI dipantau hingga lulus 100%.
4. Dilakukan merge squash ke `main`.
5. Pengecekan deployment live di `https://fiezel.my.id/app/coordination/BUILD-VERSION.json` memastikan versi `m025-506` aktif.
