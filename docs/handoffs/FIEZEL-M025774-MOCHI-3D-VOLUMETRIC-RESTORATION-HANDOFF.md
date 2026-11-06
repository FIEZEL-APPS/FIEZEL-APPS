# FIEZEL RELEASE HANDOFF: M025-774 — PEMULIHAN 100% 3D MOCHI VOLUMETRIK ASLI & GOPREP FACETIME INTERACTION

## 1. Ringkasan Eksekutif & Nomor Build
- **Nomor Build**: `m025-774`
- **Active Branch**: `feat/mochi-master-expressions-m025-774`
- **Tipe Rilis**: `feat(voice,mascot): restore true 3d volumetric mochi and goprep facetime layer`
- **Penyebab & Mandat Pengguna**:
  - Pengguna secara tegas menolak gaya anime/manga cel-shading outline dan stiker kanvas 2D datar (*"aku ingin design mochinya seperti desain gravis 3D pada versi sebelumnya yaitu versi build M025-760an ,aku tidak mau bentuk anime atau manga ini , sangat jelek sekali, dan bentuk mochinya juga aneh yang versi ini, baik dari telinganya, semuanyaaaa"*).
  - Tampilan pucat dan tidak HD terbukti berakar pada penggantian objek 3D wajah menjadi dummy stubs di atas `PlaneGeometry(2.7, 2.7)` serta pelepasan `mochiSkinTexture` dari `mochiMaterial`.
  - Dilakukan pemulihan 100% ke model 3D Three.js PBR asli dari commit `b5132f32` (SSOT kanonikal build `m025-735` s/d `m025-760an`).

---

## 2. Rincian Perubahan Berkas
| Berkas | Aksi / Modifikasi | Status Mutu |
| :--- | :--- | :---: |
| `mochi-mascot/fiezel-mochi.js` | Dipulihkan 100% ke commit `b5132f32` (True 3D Volumetric Mascot Engine): mata kristal 3D bertingkat, mulut 3D Torus, telinga rubah dengan fur tufts 3D, dan tekstur kulit airbrush HD 1024px | **HIJAU** |
| `mochi-mascot/index.html` | Dipulihkan ke versi playground M025-760an | **HIJAU** |
| `android/app/src/main/assets/public/mochi-mascot/fiezel-mochi.js` | Disinkronkan identik dengan `mochi-mascot/fiezel-mochi.js` | **HIJAU** |
| `features/voice-studio/src/App.tsx` | Integrasi GoPrep FaceTime: reflex sentiment santai, transisi bicara tanpa reset mood, speech cadence wave | **HIJAU** |
| `features/voice-studio/dist/voice-studio.js` | Rebuild bundle Vite produksi (10.97s, 0 error) | **HIJAU** |
| `id-golden-baseline.json` | Regenerasi baseline literal emas pasca-build bundle | **HIJAU** |

---

## 3. Verifikasi Sistem Aktif & Operasional
- **Mikrofon & Audio Analyser**: Web Audio Analyser terhubung ke `inst.attachAudioAnalyser` / Silero VAD v5 tanpa tabrakan audio stream.
- **Gemini Live API**: Pipeline WebSockets `wss://fiezel.my.id/api/live-call`, token ephemeral, dan fallback Edge TTS dalam status siaga.
- **Cloudflare Workers & D1**: Endpoint live-call, database D1, dan cache worker berjalan normal.

---

## 4. Hasil Verifikasi Pengujian (100% PASS)
- `tests/test-all-practices-mochi-wire.js`: **5/5 PASS (100%)** (0 console errors).
- `tests/mochi-voice-sos-test.js`: **27/27 PASS (100%)**.
- `tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**.
- `tests/curriculum-cache-version-test.js`: **PASS (33 penegasan)**.
- `tests/gate-registry-test.js`: **10/10 PASS**.
- `tests/th-ui-leak-test.js`: **PASS**.
