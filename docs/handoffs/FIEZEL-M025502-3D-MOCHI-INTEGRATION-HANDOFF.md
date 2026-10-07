# FIEZEL HANDOFF DOSSIER: BUILD m025-502
## 3D Mochi Mascot Companion, Travertine Unified Card Palette, and JLPT Chōkai Event Integration

**Tanggal Rilis**: 2026-10-07
**Nomor Build**: `m025-502`
**Branch Fitur**: `feat/m025-502-3d-mochi-companion`
**Otoritas Arbiter**: `coordination/BUILD-VERSION.json`
**Status Gerbang Mutu**: 100% HIJAU (Semua Gerbang PASS)

---

### 1. Ringkasan Eksekutif & Latar Belakang Perubahan
Pembaruan ini menuntaskan integrasi 3D Mochi Daifuku Companion ke dalam shell PWA FIEZEL di seluruh mode latihan (Grammar, Kosakata, Reading, Writing, dan JLPT Chōkai Listening), sekaligus menyelesaikan permasalahan estetika dan kontras kartu kuis yang dilaporkan oleh pengguna.

Tiga pilar utama dalam rilis ini:
1. **Perbesaran & Velvet PBR Lighting 3D Mochi (+36.4% Scale)**:
   - Skala mochi diperbesar +36.4% dengan posisi kamera diperdekat ($Z = 5.35$, $\text{FOV} = 44^\circ$, `THREE.NoToneMapping`).
   - Material `MeshPhysicalMaterial` dikalibrasi ke `roughness: 0.28` (tekstur beludru tepung ketan daifuku lembut, menghapus pantulan silau berminyak di dagu).
   - Siluet tepi memancarkan pendaran peach tipis (`sheenColor: #FFD2DE`), telinga dalam merah stroberi kontras tinggi (`#FF829E`).
   - Kontras terverifikasi di atas latar travertine daylight (`#FDFAF3`) maupun background gelap (`#0E1015`) tanpa titik putih terik (*blowout*) 100%.
2. **Solusi Palet Travertine Hangat & ZERO Isolated Box**:
   - Seluruh badan kartu kuis (`.quiz-shell > .card`, `.quiz-shell .card`, `.jlpt-mobile-card`) diubah menjadi gradien travertine hangat harmonis (`#FDF8F1` ke `#F5ECE0`, border `#E6D9C8`).
   - **ZERO Isolated Box**: Seluruh slot maskot (`.fz-paw-slot`, `.fz-paw-above`, `.jlpt-mascot-slot`, `.fsl-mascot-slot`) 100% transparan tanpa kotak tambalan yang mengisolasi maskot.
   - Opsi jawaban bertingkat berupa tile putih bersih (`#FFFFFF`, border `#E8DFD3`).
3. **Integrasi Interaksi & Event Wire Lintas Sesi**:
   - **Badge Indikator Chat Idle**: Menampilkan kapsul violet `badge: 'chat_purple'` dan aura ungu dengan 3 titik animasi meloncat saat posisi diam/idle.
   - **Kibasan Telinga Dinamis**: Animasi pegas harmonik 2 tahap (`triggerEarWiggle(1.3)`) dipicu otomatis pada transisi masuk sesi, pergantian soal baru (`question-shown`), dan pemutaran audio Chokai.
   - **Ekspresi Balita**: Cemberut balita (*toddler pout*) pada jawaban salah dan lompatan gembira (*joyful hop*) bertabur bintang pada jawaban benar.
   - **Stabilisasi Fisika**: Menambahkan batas aman osilasi pegas (`jiggleAmp <= 1.0`, `jiggleOffset <= 0.35`) dan batas non-negatif `dt` pada `fiezel-mochi.js` agar animasi tidak meledak saat frame drop atau perpindahan tab peramban.

---

### 2. Bukti Pengujian Empiris & Lintas Perangkat (Playwright)

| Perangkat / Viewport | Dimensi Maskot | Posisi Bawah Opsi D | Status Viewport | Zero-Box Verification |
|---|---|---|---|---|
| **iPhone SE (375 × 667)** | 142.5px × 140.0px | 650.8px (Batas: 667px) | PASS (Muat Nyaman) | Transparan 100%, Border 0 |
| **iPhone 14 (390 × 844)** | 148.2px × 140.4px | 615.0px (Margin: >220px) | PASS (Muat Nyaman) | Transparan 100%, Border 0 |
| **iPhone 14 Pro Max (430 × 932)** | 163.4px × 154.8px | 629.6px (Margin: >300px) | PASS (Muat Nyaman) | Transparan 100%, Border 0 |
| **Android Pixel 7 (412 × 915)** | 156.5px × 148.3px | 623.0px (Margin: >290px) | PASS (Muat Nyaman) | Transparan 100%, Border 0 |
| **iPad / Tablet (768 × 1024)** | 150.0px × 165.0px | Layout berdampingan | PASS (Muat Nyaman) | Transparan 100%, Border 0 |
| **Desktop HD (1280 × 800)** | 192.0px × 148.0px | Kolom samping lapang | PASS (Muat Nyaman) | Transparan 100%, Border 0 |

---

### 3. Daftar Berkas Produksi yang Disentuh
1. `coordination/BUILD-VERSION.json` — Naik ke `m025-502`.
2. `sw.js` — Pembaruan `SW_REV` ke `m025-502` dan penambahan `./features/mascot/fiezel-mochi-companion.js` ke precache shell `ASSETS`.
3. `core-config.js` — Sinkronisasi build ke `m025-502`.
4. `features/neural-voice/fiezel-diag-panel.js` — Sinkronisasi build ke `m025-502`.
5. `kurikulum.html` & `misi.html` — Cache query string versi selaras `?v=m025-502`.
6. `index.html` — Pemuatan modul `fiezel-mochi-companion.js`.
7. `style.css` — Penegasan aturan `.quiz-shell > .card` travertine dan transparansi slot maskot.
8. `features/ui/mobile-edge-fit.css` — Kalibrasi tinggi slot vertikal responsif clamp dan penegasan zero isolated box.
9. `features/mascot/fiezel-mochi-companion.js` — Orkestrasi companion Three.js Mochi, reflow calibration timeout, event wiring kuis & JLPT.
10. `mochi-mascot/fiezel-mochi.js` — Kamera FOV 44° Z=5.35, velvet daifuku shader, PBR lighting seimbang, clamping jiggleAmp & non-negative dt.
11. `mochi-mascot/index.html` — Playground visual Mochi 3D.
12. `features/speaking-listening/fiezel-jlpt-listening.js` — Integrasi slot companion ke kartu modal Chōkai JLPT, sinyal reaksi benar/salah, audio start/stop.
13. `features/speaking-listening/jlpt-listening.css` — Penyesuaian layout `.jlpt-mascot-slot`.

---

### 4. Hasil Verifikasi Gerbang Mutu Lokal (Hexa-Sync 100% HIJAU)
- `node tests/precache-covers-shell-test.js` -> **PASS (5/5)**
- `node tests/id-golden-snapshot-test.js` -> **PASS (HIJAU: baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js` -> **PASS (3945 kunci valid)**
- `node tests/curriculum-cache-version-test.js` -> **PASS (26 penegasan, build m025-502)**
- `node tests/gate-registry-test.js` -> **PASS (10 pass, 0 fail)**
- `node tests/paw-mascot-test.js` -> **PASS (35/35)**
- `node tests/pawprint-geometry-gate-test.js` -> **PASS (5/5)**
- `node tests/mascot-reduced-motion-test.js` -> **PASS (19 state, 14 ekspresi)**
- `node tools/bump-build.mjs --check` -> **SELARAS (m025-502)**
