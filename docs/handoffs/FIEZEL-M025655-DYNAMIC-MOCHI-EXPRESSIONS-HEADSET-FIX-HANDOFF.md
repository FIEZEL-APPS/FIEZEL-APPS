# FIEZEL m025-655 Handoff: Dynamic Autonomous Expressions, Non-Clipping Headset, and Symplectic Spring Physics

**Build:** `m025-655`
**Tanggal:** 24 Oktober 2026
**Status Mutu:** 100% HIJAU (Quality Gate: 395/395 Pass, 0 Fail)

---

## 1. Ringkasan Temuan Audit & Akar Masalah

User melaporkan dua anomali krusial pada maskot 3D Mochi di Beranda:
1. **Wajah Beku / Statis:** Ekspresi Mochi tidak berubah-ubah secara otonom saat santai (idle).
2. **Anomali Headset & Telinga "Tembus Pandang":** Headset dan telinga terlihat tembus pandang atau saling bertabrakan / terpotong (clipping).

### Diagnosis Teknis:
1. **Akar Masalah Clipping & Tembus Pandang Headset:**
   - Di `mochi-mascot/fiezel-mochi.js`, `createHeadsetAccessory()` mendefinisikan headband Three.js `CatmullRomCurve3` yang membelah titik koordinat $X = \pm 0.75, Y = 1.46, Z = 0.12$. Sementara itu, pangkal telinga terpasang pada $X = \pm 0.52, Y = 0.94, Z = 0.06$ dan menyapu ke atas hingga $Y = 1.92, Z = 0.01 \dots 0.16$. Akibatnya, headband melintang tepat di dalam volume telinga, menembus mesh luar dan dalam.
   - Selain itu, komponen headset dipasangi `renderOrder = 2500` secara artifisial, yang merusak Z-buffer alami WebGL Three.js dan menghasilkan ilusi optik "tembus pandang" (*translucency artifact*).
2. **Akar Masalah Ketidakstabilan Pegas Telinga (Euler Divergence):**
   - Integrasi gerak pegas telinga sebelumnya menggunakan Explicit Euler integration `vel += (-(val - target) * k - vel * cdamp) * dt; val += vel * dt;`.
   - Ketika browser mengalami delta-time spike ($dt \approx 0.1\text{s}$) atau saat ekspresi berganti cepat, pegas bertransformasi menjadi tidak stabil secara numerik, melontarkan rotasi `earL_Flex` hingga puluhan radian ($48.39\text{ rad}$) yang melipat telinga ke dalam kepala.
3. **Kebutuhan Autonomous Idle Expressions:**
   - Mochi membutuhkan siklus ekspresi otonom saat menganggur (idle): `dots` (mata bersinar ramah) $\to$ `wink` (kedipan centil) $\to$ `happy` (mata bulan sabit ceria) $\to$ `hearts` (mata hati penuh kasih sayang), diselingi kedipan mata natural dan goyangan telinga halus.
   - Interaksi sentuh/klik di Beranda harus memicu reaksi gembira ceria (`happy` + loncatan kenyal + lambaian tangan + kedipan telinga + SFX `paw_greet`) serta menahan mood tersebut selama 3.5 detik sebelum melanjutkan siklus otomatis.

---

## 2. Solusi & Perubahan Arsitektur

1. **Geometri Headset & Kedalaman Z-Buffer Bersih:**
   - Memindahkan spline headband ke belakang telinga secara elegan ($X = \pm 0.80, Y = 1.38, Z = -0.10$ dan puncak mahkota $X = 0, Y = 1.48, Z = -0.12$).
   - Memindahkan koordinat telinga sedikit ke depan ($Z = 0.14$), memastikan pemisahan fisik yang bersih antara volume telinga dan bando headset tanpa tumpang tindih.
   - Menghapus seluruh override `renderOrder = 2500` artifisial, mempercayakan resolusi kedalaman 100% pada hardware depth buffer WebGL standar.
2. **Fisika Pegas Simpletik (Symplectic Sub-Stepped Harmonic Oscillator):**
   - Mengubah `springStep` menjadi semi-implicit symplectic Euler dengan sub-stepping adaptif ($\le 16\text{ms}$ per langkah).
   - Membatasi batas kecepatan sudut dan batas anatomis rotasi telinga (clamping) sehingga telinga selalu berdiri tegak, gagah, dan elastis secara konsisten di semua suasana hati (`dots`, `wink`, `happy`, `hearts`, `pout`).
3. **Autonomous Expression Cycling & Tap Response:**
   - Menambahkan mesin ekspresi otonom di `mochi-mascot/fiezel-mochi.js`: setiap 3.2–5.5 detik Mochi secara alami bertransisi ke ekspresi berikutnya dalam urutan `idleMoods = ['dots', 'wink', 'happy', 'dots', 'hearts']`.
   - Mengintegrasikan fungsi `holdMood(seconds)` untuk menahan ekspresi tertentu saat ada interaksi belajar.
   - Memperbarui handler tap di `app.js` dan `features/mascot/fiezel-mochi-companion.js` agar klik langsung membangkitkan Mochi dengan ekspresi gembira (`happy`), sorakan tangan (`cheer`), kedipan telinga (`triggerEarWiggle`), dan audio haptik `paw_greet`.

---

## 3. Bukti Pengujian Empiris (Probe Playwright & Visual Inspection)

1. **Uji Transformasi Telinga 4 Mood (`tools/dev/inspect-ear-rot.mjs`):**
   - `dots`: $rx = -0.042, flex\_rx = +0.020, rz = 0.435$ (Berdiri tegak, stabil)
   - `happy`: $rx = -0.047, flex\_rx = +0.021, rz = 0.408$ (Berdiri tegak, getaran ceria halus)
   - `wink`: $rx = -0.050, flex\_rx = +0.018, rz = 0.376$ (Asimetris playfully perky)
   - `hearts`: $rx = -0.039, flex\_rx = +0.031, rz = 0.404$ (Tegak hangat penuh kasih)
2. **Inspeksi Visual Frame Hasil Render:**
   - `diag-happy.png`: Telinga berdiri tegak sempurna di depan headband headset; mata bulan sabit ceria; tangan melambai gembira; pipi merona; zero clipping.
   - `diag-wink.png`: Satu mata berkedip nakal, satu mata anime bersinar, telinga berdiri tegak alami.
   - `diag-hearts.png`: Mata hati merah muda menyala, headband membingkai kepala di belakang telinga tanpa menembus.
   - `mascot-crop.png`: Tangkapan layar Beranda pada perangkat mobile asli (412x915px) membuktikan Three.js Mochi terpasang sempurna di kartu Beranda dengan bayangan lembut dan responsif.
3. **Uji Regresi Otomatis (Quality Gate):**
   - `tests/id-golden-snapshot-test.js` $\to$ PASS
   - `tests/multi-device-comfort-test.js` $\to$ PASS (8/8 invarian)
   - `tests/th-ui-leak-test.js` $\to$ PASS
   - `tests/curriculum-cache-version-test.js` $\to$ PASS (33 penegasan)
   - `tests/gate-registry-test.js` $\to$ PASS (395 gerbang sah)
   - `tests/test-all-practices-mochi-wire.js` $\to$ PASS (5 skenario maskot di kuis, listening, menulis, & skills lab)

---

## 4. Berkas yang Diubah

- `mochi-mascot/fiezel-mochi.js`: Headband CatmullRom spline di belakang telinga, ear position adjustment, autonomous expression state machine, holdMood API, semi-implicit symplectic spring integration.
- `features/mascot/fiezel-mochi-companion.js`: Tap handler memicu `setMood('happy')`, `holdMood(3.5)`, `cheer` gesture, audio sfx `paw_greet`.
- `app.js`: Update inline `onclick` handler Beranda mascot wrap untuk menyinkronkan mood `happy` dan `holdMood`.
- `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `coordination/BUILD-VERSION.json`, `kurikulum.html`, `misi.html`, `call.html`: Bump versi build ke `m025-655` (Hexa-Sync Arbiter).
