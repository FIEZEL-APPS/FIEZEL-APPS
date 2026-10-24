# FIEZEL m025-656 Handoff: Unclipped Mochi Paws with Safe Camera Framing and Natural Cuddle Kinematics

**Build:** `m025-656`
**Tanggal:** 24 Oktober 2026
**Status Mutu:** 100% HIJAU (Quality Gate: 395/395 Pass, 0 Fail)

---

## 1. Ringkasan Temuan Audit & Masalah

Pengguna menyoroti bahwa pada tangkapan layar Beranda:
*"tangannya tampak terpotong, seperti ada kotak tembus pandang yang tidak terlihat"*

### Analisis Teknis:
1. **Frustum Culling & Batas Canvas WebGL:**
   - Kamera `PerspectiveCamera` di `mochi-mascot/fiezel-mochi.js` sebelumnya disetel dengan `FOV = 44` pada posisi $Z = 5.35$.
   - Pada jarak tersebut, batas horizontal frustum kamera di $Z = 0$ adalah:
     $$W_{half} = 5.35 \times \tan(22^\circ) \approx 2.16$$
   - Ketika Mochi melakukan pose lambaian atau sorakan (`cheer`/`wave`), target posisi tangan diatur pada $P.x = 1.82$ (kanan) dan $P.x = -1.82$ (kiri).
   - Ditambah geometri telapak tangan dan jari jempol marshmallow berskala $1.45$ (lebar $\approx 0.45$), koordinat terluar cakar mencapai $X = 1.82 + 0.45 = 2.27$, melampaui batas pandang $X = 2.16$.
   - Karena elemen `<canvas>` WebGL tidak dapat menggambar di luar batas piksel kotaknya ($118 \times 118$), bagian ujung luar tangan terpotong lurus secara vertikal (*hard edge clipping*), menciptakan ilusi optik seolah ada "kotak tembus pandang yang tidak terlihat".

---

## 2. Solusi & Perubahan Arsitektur

1. **Pelebaran Frustum Kamera & Safe Breathing Room:**
   - Memperlebar bidang pandang kamera menjadi `FOV = 46` dan memundurkan posisi kamera secara lembut ke $Z = 5.80$ (`this.camera.position.set(0, 0.08, 5.80)`).
   - Batas horizontal pandang meningkat dari $2.16$ menjadi $2.48$, menyediakan ruang aman $\ge 0.50$ unit di seluruh sisi kiri dan kanan.
2. **Kinematika Pelukan Cakar yang Alami (Cuddle Kinematics):**
   - Mendekatkan posisi cakar pada pose `cheer` dan `wave` dari $P.x = \pm 1.82$ menjadi $P.x = \pm 1.54$.
   - Cakar kini menempel manis dan ergonomis di samping pipi bulat Mochi layaknya kucing/anak anjing memegang pipinya dengan gembira, bukan melayang terlampau jauh di luar siluet tubuh.
3. **Penyelarasan Kontainer Beranda:**
   - Menyesuaikan ukuran wrapper maskot Beranda `.fz-vissol-mascot-wrap` menjadi $122 \times 122\text{px}$ di `features/ui/fiezel-tactile-clay.css`.

---

## 3. Bukti Verifikasi Empiris

1. **Visual Inspection:**
   - `mascot-crop.png`: Menampilkan Mochi di kartu Beranda ponsel sesungguhnya (412x915px). Kedua cakar Mochi terlihat utuh 100%, bantalan cakar pink (*paw beans*) terlihat bulat sempurna tanpa potongan garis lurus.
   - `fresh-happy.png`: Seluruh pose gembira menari dengan kedua tangan terangkat tinggi tidak lagi menyentuh tepi kanvas sama sekali.
   - `fresh-wink.png`: Cakar kanan melambai manis dengan bantalan cakar utuh dan telinga tegak berseri.
2. **Quality Gate:**
   - `tests/id-golden-snapshot-test.js` $\to$ PASS
   - `tests/multi-device-comfort-test.js` $\to$ PASS
   - `tests/th-ui-leak-test.js` $\to$ PASS
   - `tests/curriculum-cache-version-test.js` $\to$ PASS (33 penegasan)
   - `tests/gate-registry-test.js` $\to$ PASS (395 gerbang sah)
   - `tests/test-all-practices-mochi-wire.js` $\to$ PASS (5/5 sesi latihan terintegrasi)
