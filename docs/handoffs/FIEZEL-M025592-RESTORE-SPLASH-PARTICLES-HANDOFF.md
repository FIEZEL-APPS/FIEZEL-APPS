# FIEZEL Handoff: Pemulihan Penuh Animasi Konvergensi Partikel Splash Boot (m025-592)

## Ringkasan Temuan Audit & Solusi
Dalam peluncuran dingin (cold boot) FIEZEL, pengguna melaporkan hilangnya animasi partikel yang seharusnya melayang, berputar dalam dinamika *curl-noise*, lalu menyatu membentuk ikon **F** dan dua balok emas (*golden telemetry bars*).

### Akar Masalah Teknis (Root Causes Discovered):
1. **Premature CSS Keyframe di `index.html` (Baris 173–175)**:
   Aturan CSS kritis berikut dipasang di header inline untuk mempercepat cat pertama:
   ```css
   #fiezelBootSplash:not([data-fiezel-boot-claimed="shown"]):not(.fiezel-splash-still) .fz-fgroup { opacity: 1; animation: fz-fade-in .45s ease .08s both }
   #fiezelBootSplash:not([data-fiezel-boot-claimed="shown"]):not(.fiezel-splash-still) .fz-barsgroup { opacity: 1; animation: fz-fade-in .45s ease .18s both }
   ```
   Aturan ini memudarkan logo SVG statis pejal pada $t = 80\text{ms}$, sebelum JavaScript sempat mengeksekusi inisialisasi partikel, menutupi seluruh partikel dan membunuh efek pembentukan ikon.

2. **Loophole `adoptedRevealed` di `features/brand/fiezel-splash.js` (Baris 519 & 609)**:
   Karena `#fiezelBootSplash` selalu diadopsi dari markup statis `index.html`, variabel `adoptedRevealed = !!(ctl.adopted && !frozenMode)` bernilai `true` 100% dari waktu.
   Akibatnya:
   - Modul memanggil `particles.init(canvas, { skipBuild: true })` sehingga partikel **tidak pernah dialokasikan sama sekali** ($N = 0$).
   - `applyVisualState(t)` memaksakan `fGroup.style.opacity = 1` dan `barsGroup.style.opacity = 1` sejak frame 0.

3. **Lonjakan Jam Koreografi `startOffset` di `features/brand/fiezel-splash.js` (Baris 765)**:
   Saat pemuatan skrip nyata memakan waktu $\ge 1.3\text{s}$, `startOffset` melompat melewati $T_{\text{DONE}} = 1320\text{ms}$, sehingga jam koreografi langsung meloncat ke tahap cap PAW tanpa pernah merender frame partikel.

---

## Solusi & Perbaikan Sistemik:
1. **Pembersihan `index.html`**:
   Mencabut aturan CSS prematur `.fz-fgroup` & `.fz-barsgroup` sehingga SVG tajam tetap berada pada `opacity: 0` sampai partikel mengonvergensi bentuknya.
2. **Koreksi `adoptedRevealed` & `skipBuild`**:
   `adoptedRevealed` kini hanya bernilai `true` bila `ctl.startOffset >= 1320ms` (artinya fase partikel memang sengaja dilewati).
3. **Penegakan `startOffset: 0` pada Jalur Gerak (*Motion*)**:
   Pada peluncuran dengan animasi aktif (`!still`), `ctl.startOffset` selalu mulai dari $t = 0$. Partikel $N \approx 589$ (ponsel) hingga $2200$ (desktop) dialokasikan dan disimulasikan secara penuh.
4. **Penyesuaian Fallback Safety Timer**:
   Pewaktu pengaman diperpanjang menjadi `VISIBLE_MS + 400` untuk mode gerak, sehingga transisi cap PAW dan pelepasan tirai splash berjalan sempurna tanpa terputus di tengah jalan.
5. **Pendaftaran Gerbang CI di `.github/workflows/quality.yml`**:
   Mendaftarkan `tests/ios-pwa-mic-shadowing-test.js` ke `quality.yml` agar seluruh gerbang mutu `tests/gate-registry-test.js` lulus 100%.

---

## Bukti Pengujian Empiris (Headless Chromium Playwright Probe):
Pengujian empiris Playwright dijalankan via `tools/dev/probe-particles-visual.mjs` dan membuktikan 5 milidetik kritis:
1. **$t = 150\text{ms}$ (Scatter Swirl)**:
   - `canvasHasPixels: true` (pixelSample: 51, particlesN: 589).
   - `fGroupComputedOpacity: 0`, `barsGroupComputedOpacity: 0`.
   - Awan partikel emas dan krem melayang menyebar dalam medan gaya rotasi *curl-noise*.
2. **$t = 500\text{ms}$ (F-Stem Converging)**:
   - `canvasHasPixels: true` (particlesN: 589).
   - Partikel terbang berputar ke arah dalam dan memadat membentuk tiang vertikal huruf F.
3. **$t = 850\text{ms}$ (F-Arms & Crossfade)**:
   - `fGroupComputedOpacity: 0.564` (crossfade lembut SVG F sedang berlangsung).
   - Partikel emas mulai mengalir menuju posisi dua balok telemetry di kanan.
4. **$t = 1100\text{ms}$ (Bars Solidifying)**:
   - `fGroupComputedOpacity: 1.0` (F SVG tajam solid).
   - `barsGroupComputedOpacity: 0.444` (balok emas mengkristal dan menyatu).
5. **$t = 1400\text{ms}$ (Equalizer Active & Clean GPU Clear)**:
   - Kanvas partikel selesai tepat pada $t = 1320\text{ms}$ dan dibersihkan (`ctx.clearRect()`) demi efisiensi daya/GPU.
   - Logo SVG solid 100%, equalizer berdenyut, dan wordmark *KelasKu untuk Guru* tampil anggun.

---

## Status Gerbang Mutu Lokal:
- `node tests/splash-first-paint-test.js` -> **PASS**
- `node tests/splash-choreography-test.js` -> **PASS**
- `node tests/boot-order-test.js` -> **PASS**
- `node tests/boot-auth-verdict-test.js` -> **PASS**
- `node tests/id-golden-snapshot-test.js` -> **PASS**
- `node tests/curriculum-cache-version-test.js` -> **PASS**
- `node tests/gate-registry-test.js` -> **PASS (10/10)**
