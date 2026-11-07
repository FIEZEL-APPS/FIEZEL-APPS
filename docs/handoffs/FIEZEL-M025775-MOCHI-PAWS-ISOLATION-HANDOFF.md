# FIEZEL-M025775 Handoff: Mochi 3D Paws Isolation & Mood Purity

**Tanggal**: 8 November 2026  
**Build Target**: `m025-775`  
**Cakupan**: `mochi-mascot/fiezel-mochi.js`, `mochi-mascot/index.html`, `mochi-mascot/preview.html`  
**Token Proteksi**: `[ALLOW-PROTECTED: pwa]`  

---

## 1. Ringkasan & Mandat Pengguna
Sesuai arahan langsung pengguna:
- Seluruh pose tangan/cakar dinonaktifkan (`handPose: 'hidden'`) untuk semua ekspresi default kecuali 3 ekspresi kanonikal:
  1. `gembira` (`joy_high`): Dua cakar Daifuku putih mengambang bersorak ("Hore / Yatta!") dengan bantalan pink halus.
  2. `senang` (`happy_wave`): Cakar kanan melambai riang di udara dengan bantalan pink halus, cakar kiri mengambang stabil.
  3. `kaget` (`shock_flail`): Dua cakar Daifuku terbentang lebar di kiri-kanan dengan bantalan pink halus saat terkejut.
- Seluruh ekspresi lain (`netral`, `tegas`, `sinis`, `empati`, `sedih`, `kesal`, `penasaran`, `lelah`, `takut`, `marah`, `sangat_marah`) dirender bersih tanpa tangan/cakar, mempertahankan estetika maskot Daifuku 3D murni yang halus dan bebas anomali.
- Transformasi kemarahan tetap mempertahankan:
  - `sangat_marah`: Taring vampir putih tajam di rahang atas dan latar belakang bersih tanpa api/aura.
  - `marah`: Kepulan uap volumetrik 3D murni yang keluar langsung dari lubang telinga.
- Aksesori pensil (`pencil_hold`) dan mode mengajar (`isTeacher`) tetap dapat memegang pensil secara independen.

---

## 2. Berkas yang Diubah
1. `mochi-mascot/fiezel-mochi.js`:
   - `resolveMoodDescriptor`: Mengubah `handPose` pada seluruh mood selain `gembira`, `senang`, dan `kaget` menjadi `'hidden'`.
   - `updatePaws`: Menambahkan filter `allowedPawsMoods = ['gembira', 'senang', 'kaget']`. Jika mood di luar ketiga mood tersebut (dan bukan aksesoris pensil/sensei), maka `st = 'hidden'`.
   - `drive`: Mengamankan visibilitas dan skala cakar instan `hand.visible = false` jika bukan mood yang diizinkan.
2. `mochi-mascot/index.html` & `mochi-mascot/preview.html`:
   - Memperbarui label subjudul storyboard aksesori agar selaras dengan persona tanpa tangan tiruan.
   - Menyinkronkan testbench render 3D.
3. Sinkronisasi Versi Hexa-Sync `m025-775`:
   - `coordination/BUILD-VERSION.json`
   - `sw.js`
   - `core-config.js`
   - `features/neural-voice/fiezel-diag-panel.js`
   - `kurikulum.html`
   - `misi.html`
   - `call.html` & `features/voice-studio/call.html`

---

## 3. Bukti Verifikasi Mutu
1. **Mochi Voice SOS Unit Tests**:
   - `node tests/mochi-voice-sos-test.js` -> PASS 27/27 assertions.
2. **Curriculum Cache Version & Gate Registry**:
   - `node tests/curriculum-cache-version-test.js` -> PASS 33 penegasan (build `m025-775`).
   - `node tests/gate-registry-test.js` -> PASS 10 pass, 0 fail.
3. **Snapshot Baseline & Thai Leak**:
   - `node tests/id-golden-snapshot-test.js` -> PASS (baseline emas Indonesia utuh).
   - `node tests/th-ui-leak-test.js` -> PASS (nol kebocoran).
4. **Hexa-Sync Arbiter**:
   - `node tools/bump-build.mjs --check` -> PASS `Selaras: true` pada `m025-775`.
5. **A10 Regression Watcher**:
   - `node tools/fiezel-guardians.mjs a10` -> PASS_WITH_RISK_REPORT (errors=0, warnings=0).
