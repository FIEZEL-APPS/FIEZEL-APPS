# FIEZEL Handoff Dossier: m025-653
## Live 3D Three.js WebGL Mochi Mascot with Headset & Physics on Beranda

**Tanggal:** 24 Oktober 2026
**Versi:** m025-653
**Otoritas:** OWNER / MASTER
**Status:** 100% HIJAU (Lulus seluruh 408 gerbang uji lokal & CI)

---

### 1. Ringkasan Masalah & Solusi
- **Akar Masalah Mochi Tidak Bergerak di Beranda:**
  - Sebelumnya, kartu salam Beranda hanya menampilkan gambar statis PNG (`assets/brand/mochi-mascot-headset.png`) dengan sedikit animasi CSS float 6px berdurasi 3.8s yang nyaris tidak terlihat.
  - Modul Three.js `FiezelMochiCompanion` hanya memindai kontainer latihan kuis (`.quiz-stage`, `.writing-stage`, dsb.) dan tidak pernah diarahkan ke Beranda.
- **Implementasi Solusi 3D WebGL Penuh di Beranda:**
  - **Integrasi Three.js WebGL Pool:** Mengarahkan `FiezelMochiCompanion` untuk mendeteksi kontainer `.fz-vissol-mascot-wrap` di Beranda sebagai host 3D Mochi yang valid.
  - **Aksesoris & Persona Khusus Beranda:**
    - Pada host Beranda (`session === 'home'`), Mochi memakai aksesoris headphone 3D (`accessory: 'headset'`), mood ceria (`mood: 'happy'`), dan aura emas berkilau (`aura: 'gold'`).
  - **Fisika Pegas & Interaktivitas Sentuh/Klik:**
    - Saat disentuh/diklik oleh murid, Mochi melompat gembira (`triggerHop(0.35)`), melambaikan tangan (`triggerHandGesture('wave')`), menggoyangkan telinga lucu (`triggerEarWiggle(1.4)`), dan membunyikan efek suara haptic (`uiSfx('paw_greet')`).
    - Dilengkapi pelacakan pointer/kursor (3D head-tracking) sehingga mata dan tubuh Mochi mengikuti gerakan jari/mouse murid.
  - **Hierarki Prioritas Antar Panggung (Seamless Transitions):**
    - Fungsi pemeringkat `outranks(a, b)` dikonfigurasi agar panggung latihan kuis (`.quiz-stage`, `.writing-stage`, `.fsl-player`, dll.) mengambil alih Mochi dari Beranda secara instan saat murid mulai belajar, dan Mochi otomatis kembali ke Beranda saat murid selesai/kembali ke Home.
  - **Fallback Anggun & A11y:**
    - Bila WebGL tidak didukung perangkat atau sebelum instance canvas 3D terpasang, gambar cadangan `.fz-vissol-mascot-img` tetap tersedia dan diberi animasi squish & stretch dinamis (`fzMochiFloat` 2.6s). Saat Three.js siap, gambar fallback disembunyikan secara rapi (`display: none`).

---

### 2. Berkas yang Disentuh
1. `features/mascot/fiezel-mochi-companion.js`:
   - Menambahkan `.fz-vissol-mascot-wrap` ke `PRACTICE_CONTAINER_SELECTORS`.
   - Mengatur prioritas `outranks(a, b)` agar quiz stage mengalahkan home.
   - Mengatur deteksi sesi `detectSession(host)` untuk mengenali Beranda (`session = 'home'`).
   - Menyematkan aksesoris headset, aura emas, dan mood happy di `applySessionAccessories()`.
   - Menangani persembunyian dan pemulihan elemen fallback `.fz-vissol-mascot-img` di `mountOn()` dan `releaseHost()`.
2. `features/ui/fiezel-tactile-clay.css`:
   - Menambahkan aturan CSS `.fz-vissol-mascot-wrap` (`cursor: grab`, `touch-action: none`, canvas full-size).
   - Menambahkan animasi awan bernapas dinamis `@keyframes fzCloudBreathe`.
   - Memperhalus animasi fallback squash & stretch `@keyframes fzMochiFloat` (2.6s).
3. `app.js`:
   - Menghubungkan klik maskot di `todayHomeMarkup()` untuk memicu aksi 3D Mochi (`triggerHop`, `triggerHandGesture`, `triggerEarWiggle`, `uiSfx`).
   - Memanggil `FiezelMochiCompanion.scan()` saat memuat tampilan Beranda `home()`.
4. `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`, `call.html`, `features/voice-studio/call.html`, `coordination/BUILD-VERSION.json`:
   - Kenaikan nomor build m025-653 oleh arbiter resmi (`bump-build.mjs`).

---

### 3. Bukti Verifikasi Empiris Headless Playwright
- Dijalankan pengujian empiris headless browser via `tools/dev/probe-3d-mochi-home.mjs`:
  - Canvas Three.js WebGL terpasang pada kontainer Beranda (dimensi: 118x118).
  - Aksesoris terkonfirmasi: `headset`, mood: `happy`, aura: `gold`.
  - Gambar fallback tersembunyi sempurna (`display: none`).
  - Interaksi tap/klik terbukti memicu kompresi viskoelastik squish `squishY: 0.7` dan loncatan vertikal.
  - Pointer movement terbukti memutar rotasi 3D mesh `rotation.y`.
- Tangkapan layar bukti visual tersimpan di:
  - `mochi-3d-home-mobile.png`
- Seluruh rangkaian gerbang lokal terkonfirmasi lulus 100%:
  - `tests/test-all-practices-mochi-wire.js` -> PASS (5/5 tes integrasi maskot 3D)
  - `tests/target-lang-shortcut-test.js` -> PASS (6/6 penegasan)
  - `tests/id-golden-snapshot-test.js` -> PASS (100% baseline emas)
  - `tests/curriculum-cache-version-test.js` -> PASS (33/33 penegasan, build m025-653)
  - `tests/gate-registry-test.js` -> PASS (10/10 penegasan)

---

### 4. Langkah Berikutnya (Roadmap / Next Steps)
- Pantau performa render 60 FPS Three.js WebGL Mochi pada perangkat Android entri-level.
- Seluruh 408 pengujian CI dipantau hingga rilis produksi siap disajikan ke murid.
