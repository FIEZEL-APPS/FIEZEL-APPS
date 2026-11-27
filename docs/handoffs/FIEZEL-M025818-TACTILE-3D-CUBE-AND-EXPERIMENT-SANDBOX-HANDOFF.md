# FIEZEL Handoff Dossier — `m025-818`
## 60 FPS Tactile 3D Cube Net Folding & Multi-Domain Interactive Experiment Sandboxes

### 1. Ringkasan Temuan & Alasan Perubahan
Pengguna memberikan umpan balik langsung setelah menguji papan belajar interaktif:
- *"aku masih belum puas dengan visual interaktifnya, misalnya kan ada tugas buat kubus, user belum bisa melipat kertas menjadi kubus dan lain lain, belum bisa berekspreimen gitu, paham ga sih, intinya masih kurang terasa interaktifnya"*
- Audit empiris menemukan dua celah utama:
  1. Latihan papan sebelumnya didominasi pencocokan pasif atau slider satu arah tanpa ruang eksperimen langsung (murid belum bisa melipat jaring-jaring kertas 2D menjadi kubus 3D utuh, memutar bangun ruang 360°, atau membuktikan mengapa pola jaring tertentu gagal karena dua sisi bertabrakan).
  2. Regex deteksi niat belajar pada `App.tsx` (`asksGrammarOrStruggle`) dan `workers/api/voice/route-voice-live.js` (`isExplanationQuestion`) belum mencakup kata tanya praktis seperti `"cara membuat jaring-jaring kubus"` atau `"cara menghitung..."`.

### 2. Arsitektur Solusi yang Diimplementasikan (`m025-818`)
1. **Mesin Sandbox Eksperimen 60 FPS (`features/voice-studio/src/components/WhiteboardExperimentSandbox.tsx`)**:
   - **`CubeNet3DFoldingLab` (`cube_3d_net`)**: Pohon engsel kinematika kaku 3D (`0° → 90°`) dengan 3 pola jaring kubus sah (`Pola Salib 1-4-1`, `Pola Huruf T`, `Pola Tangga Zigzag`) + 1 jaring jebakan (`Uji Jaring Gagal` dengan deteksi tabrakan ruang 3D nyata pada sisi `#3` & `#4`), rotasi orbit sentuh/mouse 360°, kamera dolly-zoom adaptif, serta pengubah panjang rusuk $s$ langsung ($L = 6s^2$, $V = s^3$).
   - **`Geometry2DVertexSandbox` (`geometry_2d_morph`)**: Meja geometri berpetak dengan titik sudut puncak & alas yang dapat digeser langsung menggunakan jari (`setPointerCapture`), lengkap dengan sakelar bukti visual persegi panjang utuh ($L = \frac{1}{2} \times a \times t$), mode Pythagoras ($c = \sqrt{a^2 + b^2}$), dan pembentangan keliling lingkaran ($2\pi r$).
   - **`PhysicsLiveSimulatorLab` (`circuit_ohm_live` & `newton_motion_track`)**: Simulasi rangkaian listrik Hukum Ohm berarus elektron hidup (`requestAnimationFrame` proporsional terhadap $I = V/R$) dengan nyala filamen lampu dinamis, serta lintasan kereta Hukum II Newton ($a = F_{\text{net}}/m$) lengkap dengan uji gesekan es licin vs aspal kasar.
   - **`FractionGridVisualMixer` (`fraction_grid_mixer`)**: Pemotong silang visual petak KPK (`Potong Silang Sama Besar`) dan penggabung petak pecahan beda penyebut.
   - **`AlgebraLiveScaleLab` (`algebra_live_scale`)**: Timbangan dua ruas yang tetap seimbang saat operasi kebalikan diterapkan pada kedua ruas dan miring $-11^\circ$ saat diuji tambah satu sisi saja.
   - **`GrammarTimeMorphSandbox` (`grammar_time_morph`)**: Mesin mutasi kalimat langsung (`(+) Positif`, `(-) Negatif`, `(?) Tanya`, tukar kata kerja Regular/Irregular, serta tombol `⚡ Uji Tabrakan Salah (did not went)` yang memperlihatkan bagaimana magnet lampau `did` menarik `Verb 2` kembali ke `Verb 1`).
2. **Integrasi Teach-First + Prioritas Fase 2 (`whiteboardDirector.ts`, `App.tsx`, `route-voice-live.js`)**:
   - Mempertahankan penuh jaminan **Teach-First (`0 Konsep` → `1 Penjelasan & Contoh Dulu` → `2 Praktik Eksperimen` → `3 Bedah` → `4 Uji`)** dari `m025-817`, serta memastikan `experiment_sandbox` selalu menempati urutan pertama pada fase `2 Praktik`.
   - Menambahkan sanitasi `experiment_sandbox` + `ALLOWED_SANDBOX_KINDS` serta versi cache `wb-v8-experiment-live` pada Cloudflare Worker `workers/api/voice/route-voice-live.js`.

### 3. Bukti Pengujian Empiris (Headless Chromium Playwright)
- Skrip probe `verify-experiment-sandbox-m025818.mjs` menguji langsung pada viewport mobile `390×844`:
  - `pageErrors: []`
  - `detectedCollision: true` (mendeteksi tabrakan sisi `#3` & `#4` pada jaring gagal)
  - `cubeSealed: true` (melipat jaring salib 90° menjadi kubus 3D tertutup utuh)
  - `ohmCurrentOk: true` ($12\text{ V} / 4\;\Omega = 3\text{ A}$)
  - `morphedToV1: true` (`did not` + `Kembali Verb 1!`)
- `tests/whiteboard-contract-test.js`: **17/17 PASS** (termasuk `PASS 17` khusus `WhiteboardExperimentSandbox.tsx`).

### 4. Berkas yang Disentuh
- `features/voice-studio/src/components/WhiteboardExperimentSandbox.tsx` (baru)
- `features/voice-studio/src/components/WhiteboardInteractiveManipulatives.tsx`
- `features/voice-studio/src/lib/whiteboardDirector.ts`
- `features/voice-studio/src/types/voiceCall.ts`
- `features/voice-studio/src/App.tsx`
- `features/voice-studio/dist/voice-studio.js` & `features/voice-studio/dist/voice-studio.css`
- `workers/api/voice/route-voice-live.js`
- `tests/whiteboard-contract-test.js`
- Enam titik Hexa-Sync melalui `node tools/bump-build.mjs` (`m025-818`) + snapshot baseline `tests/snapshots/id-ui-golden.json`

### 5. Status Gerbang Mutu & Utang Teknis
- Seluruh gerbang mutu lokal (`id-golden-snapshot-test`, `th-ui-leak-test`, `curriculum-cache-version-test`, `gate-registry-test`, `whiteboard-contract-test`, `voice-studio-ui-architecture-test`, `voice-call-studio-integration-test`, `fiezel-guardians` A9/A10/A11/A13) lulus 100% hijau dengan nol permukaan terproteksi tersentuh.
