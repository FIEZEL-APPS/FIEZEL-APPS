# FIEZEL Handoff: Penyempurnaan Kinematika Konvergensi Partikel C2 & Crossfade Komplementer Logo (m025-594)

## 1. Ringkasan Masalah & Temuan Audit Empiris
Pengguna memberikan masukan tajam terkait pembentukan ikon F dan balok emas pada layar splash:
> *"kenapa animasi partikel tidak ada lagi? seharusnya icon F dan dua balok itu seolah olah tercipta oleh perikan partikel sebelumnya yang berbentuk geometri atau berputar atau apalah istilahnya sehingga seolah olah menghasilkan icon, paham kan maksudku?"*
> *"tapi masih belum mulus proses terbrntuknya? benarkan?"*

### Analisis Akar Masalah Teknis (Kinematika & Rendering):
1. **Patah Sudut Orbital (*Angular Clamp Kink* / $C^1$ Discontinuity)**:
   - Pada `posAt(i, t)`, sudut rotasi awan dihitung dengan rumus `a = rotW[i] * (t < t0a[i] ? t : t0a[i])`.
   - Hal ini menyebabkan kecepatan sudut tangensial partikel langsung membeku secara mendadak ke 0 tepat di saat $t = t0a[i]$, memicu patahan tajam (*kink*) pada lintasan kurva partikel.
2. **Hentakan Kecepatan Datang (*Arrival Velocity Shock*)**:
   - Fungsi easing lama `1 - q^3(1 + 0.2p)` tidak memiliki turunan nol pada saat tiba ($p = 1$). Partikel menabrak batas koordinat target seperti dinding bata (*snap to target*).
3. **Pop Rasio Aspek Regangan 1-Frame (*Aspect-Ratio Velocity Pop*)**:
   - Kecepatan partikel dihitung melalui beda hingga (*finite difference*) `(x1 - _px)`. Pada frame kedatangan, beda hingga melompat karena desakan curl-noise, menghasilkan $sp2 > 0.09$ (partikel teregang menjadi lonjong hingga 2.5×).
   - Pada frame persis berikutnya ($t - 16.7 \ge t1a$), kecepatan dipaksa ke 0, membuat partikel secara instan "pop" dari lonjong kembali ke lingkaran dalam rentang 1 frame (16.7ms).
4. **Isolasi Formasi Balok Emas**:
   - Partikel kedua balok emas sebelumnya ditarik dari gumpalan rapat terisolasi di $(356, 256)$ yang diam mematung hingga $t = 700\text{ms}$ sebelum meluncur singkat secara terputus dari galaksi partikel utama.
5. **Lonjakan Luminansi Crossfade (*Crossfade Luminance Spike*)**:
   - SVG F dan balok memudar masuk sementara partikel masih berada pada opasitas 100%, menghasilkan penumpukan cahaya ganda (*double exposure*) sebelum partikel memudar.
6. **Lag 2-Frame pada Boot Gerak**:
   - `env.requestAnimationFrame(function () { env.setTimeout(bootMotion, 0); });` menambahkan penundaan ganda sebelum kanvas partikel mulai dirender.

---

## 2. Solusi & Perbaikan Sistemik (Kinematika $C^2$ & Koreografi Kosmik)

1. **Kinematika $C^2$ Quintic Smootherstep**:
   - Menerapkan fungsi interpolasi berkesinambungan tingkat dua:
     $$e(p) = p^3 (6p^2 - 15p + 10) = 10p^3 - 15p^4 + 6p^5$$
   - Memiliki turunan pertama dan kedua yang bernilai persis 0 pada saat peluncuran ($p = 0$) dan saat mendarat ($p = 1$). Partikel terangkat lembut dari orbit dan mendarat mulus tanpa deselerasi kasar.
2. **Rotasi Orbital Berkelanjutan Tanpa Kink**:
   - Sudut rotasi dihitung kontinu terhadap jam waktu $t$: $a = rotW[i] \cdot t$.
   - Lintasan dasar diinterpolasi mulus dari orbit yang terus berputar ke target:
     $$x_{\text{base}}(t) = ox(t) \cdot (1 - e(p)) + tx[i] \cdot e(p)$$
     $$y_{\text{base}}(t) = oy(t) \cdot (1 - e(p)) + ty[i] \cdot e(p)$$
   - Menghasilkan kurva spiral logaritmik yang alami dan anggun.
3. **Peredaman Kuadratik Turbulensi Curl-Noise**:
   - Amplitudo curl-noise dimodulasi dengan fungsi kubik:
     $$w(p) = 2.6 \cdot p \cdot (1 - p)^2 \cdot swA[i]$$
   - Pada $p = 0$, $w = 0$; mekar maksimal pada $p = 1/3$; dan meluruh mulus ke $w = 0$ dan $w'(1) = 0$ saat partikel mendarat di target.
4. **Distribusi Galaksi Spiral Kosmik Terpadu**:
   - Partikel krem membentuk galaksi spiral dua lengan berpusat di $(259, 256)$.
   - Partikel emas membentuk pita spiral harmonis di kuadran kanan yang mengalir anggun ke kedua balok emas sejak $t = 520\text{ms}$ hingga $1148\text{ms}$.
   - Seluruh partikel mengorbit dalam arah rotasi terpadu (`rotW = 0.00062 + rnd() * 0.00032`), menghilangkan tabrakan partikel berlawanan arah.
5. **Crossfade Komplementer Tanpa Lonjakan Cahaya**:
   - Jendela pudar partikel disinkronkan komplementer: F ($820 \to 960\text{ms}$) dan balok ($1060 \to 1180\text{ms}$), memastikan $\alpha_{\text{partikel}} + \alpha_{\text{SVG}} \approx 1$.
6. **Eliminasi 2-Frame Lag**:
   - `env.requestAnimationFrame(bootMotion)` langsung dipanggil pada first paint tanpa `setTimeout(0)`.

---

## 3. Hasil Pengujian Empiris & Bukti Visual

Pengujian empiris Playwright dijalankan melalui probe headless `tools/dev/probe-particles-visual.mjs` di perangkat mobile (412x915 @ DPR 2):

- **Milestone 1 ($t = 150\text{ms}$)**:
  `splash-particle-01-scatter-swirl-150ms.png` — Galaksi spiral kosmik dua lengan tampak anggun dan terpadu, partikel terdistribusi melengkung mengikuti medan topografi gelap.
- **Milestone 2 ($t = 500\text{ms}$)**:
  `splash-particle-02-f-stem-converging-500ms.png` — Aliran partikel mengalir mulus dalam kurva spiral logaritmik, batang tegak F mengkristal dengan kepadatan tinggi tanpa regangan patah.
- **Milestone 3 ($t = 850\text{ms}$)**:
  `splash-particle-03-f-arms-crossfade-850ms.png` — Huruf F krem terkunci sempurna, SVG crossfade masuk pada opasitas 0.564 sementara debu partikel memudar secara komplementer. Partikel emas mengalir anggun ke kanan.
- **Milestone 4 ($t = 1100\text{ms}$)**:
  `splash-particle-04-bars-solidifying-1100ms.png` — Huruf F padat krem, kedua balok emas memadat dari debu emas bergradien dengan crossfade SVG (opasitas 0.444).
- **Milestone 5 ($t = 1400\text{ms}$)**:
  `splash-particle-05-equalizer-active-1400ms.png` — Kanvas partikel bersih tuntas (`canvasHasPixels: false`), logo F dan dua balok emas berdiri pejal dengan ekualiser audio aktif dan wordmark muncul di bawah.

### Status Gerbang Mutu Lokal:
- `node tests/splash-choreography-test.js` -> **PASS (28/28)**
- `node tests/splash-first-paint-test.js` -> **PASS (32/32)**
- `node tests/boot-order-test.js` -> **PASS**
- `node tests/boot-auth-verdict-test.js` -> **PASS (5/5)**
- `node tests/id-golden-snapshot-test.js` -> **PASS (HIJAU)**
- `node tests/th-ui-leak-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS (m025-594)**
- `node tests/gate-registry-test.js` -> **PASS (10/10)**
- `node tools/bump-build.mjs --check` -> **PASS (Selaras m025-594)**

---

## 4. Daftar Berkas yang Disentuh

1. `features/brand/fiezel-splash-particles.js`:
   - Penyesuaian tabel waktu `T` untuk aliran balok emas ($520\text{ms}$) dan crossfade komplementer ($820-960\text{ms}$, $1060-1180\text{ms}$).
   - Penerapan distribusi galaksi spiral terpadu dengan kecepatan sudut satu arah di `build()`.
   - Penerapan interpolasi posisi $C^2$ Quintic Smootherstep dan peredaman analitik curl-noise di `posAt()`.
   - Eliminasi pop regangan 1-frame pada `update()`.
2. `features/brand/fiezel-splash.js`:
   - Pemanggilan langsung `env.requestAnimationFrame(bootMotion)` untuk eliminasi jeda 2-frame.
3. `coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`:
   - Kenaikan nomor build sinkron ke `m025-594`.
