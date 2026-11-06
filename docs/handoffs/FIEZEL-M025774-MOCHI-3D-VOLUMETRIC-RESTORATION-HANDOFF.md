# FIEZEL RELEASE HANDOFF: M025-774 — PEMULIHAN 100% 3D MOCHI VOLUMETRIK ASLI, ARSITEKTUR 40:60 FACETIME, & FLUID SPREI BOTTOM SHEET

## 1. Ringkasan Eksekutif & Nomor Build
- **Nomor Build**: `m025-774`
- **Active Branch**: `feat/mochi-master-expressions-m025-774`
- **Tipe Rilis**: `feat(voice): restore authentic 3d volumetric mochi, 40-60 facetime layout, and fluid sprei bottom sheet`
- **Penyebab & Mandat Pengguna**:
  1. **Pemulihan Mochi 3D Volumetrik Asli**: Menghapus kanvas cel-shaded 2D anime/manga datar dan mengembalikan 100% model 3D Three.js PBR asli dari commit `b5132f32` (mata kristal bertingkat, torus mouth, telinga rubah dengan fur tufts 3D, dan tekstur kulit airbrush HD).
  2. **Eliminasi Tombol Clutter**: Menghapus 5 tombol yang menyampah tampilan (`0.92x`, `Putar Suara`, `Mode Mentor`, `Papan Tulis`, `Telepon Live`) dan menyederhanakannya menjadi antarmuka FaceTime yang elegan dan bersih.
  3. **Arsitektur Split 40:60 FaceTime**: Membagi tampilan mobile menjadi:
     - **Top 40%**: FaceTime Video Stage (Mochi 3D, status telemetry, tombol saklar telepon FaceTime hijau/merah).
     - **Bottom 60%**: Interactive Learning Surface (Subtitle HUD bergelembung halus, terjemahan Indonesia, pinyin/furigana).
     - **Desktop Grid**: Split dua kolom berdampingan (`lg:grid-cols-12`) dengan proporsi 40:60 yang harmonis.
  4. **Gesture Bottom Sheet Sprei / Window Blind**: Bottom sheet copilot dapat ditarik secara bebas 1:1 mengikuti jari dari 58px hingga 86vh menyelimuti layar layaknya kain sprei atau membuka jendela tarik.

---

## 2. Rincian Perubahan Berkas
| Berkas | Aksi / Modifikasi | Status Mutu |
| :--- | :--- | :---: |
| `mochi-mascot/fiezel-mochi.js` | Dipulihkan 100% ke commit `b5132f32` (True 3D Volumetric Mascot Engine): mata kristal 3D, mulut Torus, telinga rubah dengan fur tufts 3D, dan tekstur kulit airbrush HD 1024px | **HIJAU** |
| `mochi-mascot/index.html` | Dipulihkan ke versi playground M025-760an | **HIJAU** |
| `features/voice-studio/src/App.tsx` | Arsitektur 40:60 FaceTime, eliminasi tombol clutter, saklar FaceTime terpadu hijau/merah, duplex mic telemetry | **HIJAU** |
| `features/voice-studio/src/components/BeginnerAnswerAssistant.tsx` | Implementasi gesture drag sprei kontinu (58px -> 86vh) dengan `setPointerCapture` | **HIJAU** |
| `features/voice-studio/src/data/callScenarios.ts` | Penyempurnaan skenario percakapan pedagogis | **HIJAU** |
| `features/voice-studio/dist/voice-studio.js` | Rebuild bundle Vite produksi (15.34s, 0 error) | **HIJAU** |
| `features/voice-studio/dist/voice-studio.css` | Rebuild bundle CSS styling produksi | **HIJAU** |
| `id-golden-baseline.json` | Regenerasi baseline literal emas pasca-build bundle | **HIJAU** |
| `reports/th-ui-leak-report.json` | Laporan th-ui-leak bersih tanpa kebocoran | **HIJAU** |

---

## 3. Verifikasi Sistem Aktif & Operasional
- **Mikrofon & Audio Analyser**: Web Audio Analyser terhubung ke `inst.attachAudioAnalyser` / Silero VAD v5 tanpa tabrakan audio stream. Duplex mic aktif dengan indikator real-time.
- **Gemini Live API**: Pipeline WebSockets `wss://fiezel.my.id/api/live-call`, token ephemeral, dan fallback Edge TTS dalam status siaga.
- **Cloudflare Workers & D1**: Endpoint live-call, database D1, dan cache worker berjalan normal.

---

## 4. Hasil Verifikasi Pengujian (100% PASS)
- `tests/voice-studio-ui-architecture-test.js`: **8/8 PASS (100%)**.
- `tests/voice-copilot-relevance-gate-test.js`: **26/26 PASS (100%)**.
- `tests/test-all-practices-mochi-wire.js`: **5/5 PASS (100%)** (0 console errors).
- `tests/mochi-voice-sos-test.js`: **27/27 PASS (100%)**.
- `tests/id-golden-snapshot-test.js`: **PASS (HIJAU)**.
- `tests/curriculum-cache-version-test.js`: **PASS (33 penegasan)**.
- `tests/gate-registry-test.js`: **10/10 PASS**.
- `tests/th-ui-leak-test.js`: **PASS**.
- `tools/fiezel-guardians.mjs a10`: **PASS (errors=0)**.
