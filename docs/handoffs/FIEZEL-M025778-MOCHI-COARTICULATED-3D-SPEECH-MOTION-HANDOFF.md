# FIEZEL Handoff Dossier — m025-778: Unified 3D Daifuku Viscoelastic Speech Rig, Coarticulated Prosody & Whole-Body Motion

## 1. Ringkasan Temuan Audit & Alasan Perubahan

Pengguna melaporkan bahwa animasi mulut berbicara pada maskot 3D Mochi terasa tidak menyatu dengan gerakan tubuh, bergerak terlalu cepat seperti kedipan mata, dan belum terasa alami.

Melalui audit empiris *frame-by-frame* (`24 frame @ 50ms/frame`) terhadap `mochi-mascot/fiezel-mochi.js`, ditemukan empat akar masalah mekanis:

1. **Bukaan Mulut Terlalu Sempit & Berpinggir Hitam Tebal**:
   - Implementasi `drawOrganicMochiMouth3D` lama membatasi tinggi bukaan bawah pada `52px` dengan garis tepi hitam `#231216` setebal `14px`, sehingga pada layar nyata rongga mulut tampak seperti celah hitam tipis yang berkedip naik-turun.
2. **Osilasi Sinus 3.4Hz yang Menutup Setiap Suku Kata (Efek Kedipan Mata)**:
   - Fungsi bicara prosedural sebelumnya menggunakan `Math.sin(t * 21.4)` yang memaksa mulut menutup mendekati nol setiap `~146ms` (`3.4` siklus per detik), bukan menjaga bukaan vokal terhubung (*coarticulation*) layaknya ucapan alami.
3. **Loncatan Diskrit Akibat Percabangan Ambang Batas (*Threshold Pops*)**:
   - Cabang boolean `if (kOpen < 0.02)` dan `if (kRound > 0.4)` memicu loncatan geometri bibir atas dan mangkuk bawah dalam 1 *frame*, serta membuat vokal bulat (`O`/`U`) tampak melengkung terbalik jika sudut bibir turun di bawah pusat elips.
4. **Ketiadaan Kopling Gerak 3D Wajah & Tubuh (*Whole-Body Speech Articulation*)**:
   - Telemetri sebelumnya menunjukkan `mochiGroup.rotation.x === 0` dan `rotation.z === 0` sepanjang bicara, sehingga mulut 2D pada kanvas tampak terpisah dari postur kepala, pipi, mata, telinga rubah, dan regangan bodi kenyal 3D Mochi.

## 2. Solusi Arsitektur yang Diterapkan

1. **Unified Branchless C2/G2 Parametric Daifuku Mouth (`drawOrganicMochiMouth3D`)**:
   - Menghapus seluruh percabangan diskrit (`kOpen < 0.02` dan `kRound > 0.4`), menggantinya dengan kurva Bezier kontinu penuh dari garis senyum tertutup `ω` (`open = 0.000`) menuju vokal lebar/terbuka (`A`, `E`, `I`) maupun elips vertikal simetris `G2` (`O` kapsul vertikal dan `U` lingkaran *pucker* bulat murni), **100% tanpa gigi** (`0` gigi).
   - Menambahkan bantalan bibir *subsurface* merah muda, torus *pucker* 3D, bayangan dagu (*chin bounce shadow*), rongga mulut beludru marun, dan lidah merah muda *glossy* terartikulasi (termasuk gulungan lidah `'L'` dan selipan bibir `'F,V'`).
2. **Coarticulated Prosody Sequencer & Asymmetric WebAudio Formant Envelope (`updateMouthMotion`)**:
   - Mengganti gelombang sinus cepat dengan sekuenser prosodi dua kalimat terkoartikulasi (`~5.35s` per siklus) di mana vokal berurutan mengalir mulus (`Ha -> looo -> te -> m -> aaan -> yuuk -> be-la-jaar`) menggunakan *quintic ease* dan pegas daging *critically damped* (`zeta = 0.96`, `omegaOpen = 11.6`, `omegaClose = 8.6`).
   - Pada jalur *live* WebAudio (`attachAudioAnalyser` untuk Mitra Kaiwa & TTS), menambahkan *asymmetric envelope follower* (`42ms` *attack*, `190ms` *release*) serta histeresis vokal `140ms` agar bebas *jitter* 60Hz, disertai *fallback* otomatis apabila `AnalyserNode` hening saat `isTalking === true`.
3. **Whole-Body 3D Viscoelastic Speech Coupling (`update`, `renderCurvedFaceAndFx`, `updateEarsAndTail`)**:
   - Mengikat artikulasi mulut secara langsung ke regangan rahang-tubuh 3D (`jawStretch`, `cheekWidthMod`, `puckerDepthMod`), daya apung vertikal (`speechBuoyancy`), anggukan/kemiringan/toleh kepala percakapan (`headPitch`, `headRoll`, `headYaw`), paralaks wajah sferis 2.5D, angkatan rona pipi apel ke kelopak mata bawah, serta gerakan telinga rubah (*ear speech perk*).
4. **Sinkronisasi Kartu Showcase Board 4 (`mochi-mascot/index.html` & `mochi-mascot/preview.html`)**:
   - Memperbarui `captureSpeakingMochiDataUrl` agar memanggil `snapMochi.setViseme(visemeCode, 0.92, true)` sehingga seluruh 12 kartu viseme 3D menampilkan bentuk vokal/konsonan penuh yang telah konvergen.

## 3. Bukti Pengujian Empiris (Playwright Headless Probe)

- Probe Playwright *frame-by-frame* membandingkan `24 frame @ 50ms/frame` (`1.20s`), `24 frame @ 100ms/frame` (`2.40s` mencakup jeda napas & transisi berhenti bicara mulus), serta `18 frame` simulasi spektrum forman WebAudio (`A -> O -> I -> Jeda -> U`).
- Hasil inspeksi visual mengonfirmasi:
  - Nol efek kedipan mata cepat; vokal terhubung mengalir mulus antar-bentuk tanpa loncatan *frame*.
  - Bentuk vokal `'O'` dan `'U'` simetris penuh sesuai acuan *Storyboard Mulut Pengucapan A, I, U, E, O (Tanpa Gigi)* dengan 0 gigi pada seluruh *frame*.
  - Seluruh 15 ekspresi statis (termasuk api & uap abu-abu `Marah`, kobaran api `Sangat Marah`, serta isolasi tangan mengambang khusus `gembira`, `senang`, `kaget`) tetap utuh 100%.

## 4. Berkas yang Disentuh

- `mochi-mascot/fiezel-mochi.js`
- `mochi-mascot/index.html`
- `mochi-mascot/preview.html`
- `coordination/BUILD-VERSION.json`
- `sw.js`
- `core-config.js`
- `features/neural-voice/fiezel-diag-panel.js`
- `kurikulum.html`
- `misi.html`
- `docs/handoffs/FIEZEL-M025778-MOCHI-COARTICULATED-3D-SPEECH-MOTION-HANDOFF.md`

## 5. Status Gerbang Mutu Lokal & Utang Teknis

- `node tools/bump-build.mjs --check`: Selaras (6 titik `m025-778`).
- `node tests/id-golden-snapshot-test.js`: LULUS.
- `node tests/th-ui-leak-test.js`: LULUS.
- `node tests/curriculum-cache-version-test.js`: LULUS.
- `node tests/gate-registry-test.js`: LULUS.
- `node tests/mochi-voice-sos-test.js`: LULUS.
- `node tools/fiezel-guardians.mjs a10`: LULUS (0 pelanggaran cakupan terproteksi).
- Utang teknis tersisa: Tidak ada pada modul bicara Mochi; 12 ekspresi non-tangan tetap dijaga `handPose: 'hidden'` sesuai arahan pengguna sebelumnya.
