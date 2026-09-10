# FIEZEL 5.19.0

FIEZEL adalah Personal English OS. Build 5.19.0 mengintegrasikan **Speaking + Listening Skills Lab**, **Core Brain adaptif**, dan jalur **local neural voice** yang tetap menjaga privasi, biaya runtime nol, serta kompatibilitas state lama.

Handoff berikutnya memakai master prompt v2.0 dan roadmap berbasis gerbang bukti. Baca `docs/handoffs/FIEZEL-5.18.0-NEXT-HANDOFF-MASTER-PROMPT.md` bersama `docs/FIEZEL-PRODUCT-ROADMAP-2026-2027.md`. GitHub dan archive wajib direkonsiliasi sebelum promosi bila version surfaces berbeda.

## Struktur repo

Sampai m025-253 akar repo memuat 498 berkas terlacak: aplikasi, 243 gerbang uji, dan 129
dokumen handoff bercampur dalam satu daftar. m025-254 memisahkannya — akar kini hanya berisi
apa yang benar-benar dijalankan atau disajikan aplikasi.

| Tempat | Isinya |
| --- | --- |
| akar | shell aplikasi (`index.html`, `app.js`, `style.css`, `sw.js`), konfigurasi, bank data JSON, dan skrip rilis yang dipanggil CI (`validator.js`, `*-audit.js`, `release-audit.py`) |
| `tests/` | seluruh gerbang mutu (`*-test.js`, `*-selftest.js`). Jalankan dari akar repo: `node tests/<nama>-test.js` |
| `features/` | modul fitur yang dimuat `index.html` dan di-precache `sw.js` |
| `tools/` | perkakas rilis dan pemeliharaan; `tools/dev/` untuk harness sekali pakai dan probe |
| `docs/` | dokumen arsitektur, kontrak, runbook; `docs/handoffs/` untuk seluruh handoff milestone |
| `reports/` | laporan audit dan berkas bukti (evidence, red-proof, checkpoint) |
| `workers/`, `deploy/` | Cloudflare Worker dan berkas penyebaran |

Gerbang di `tests/` membaca berkas produksi lewat `__fzRoot` (alias `path.join(__dirname, '..')`),
jadi maknanya sama persis seperti saat berkas itu masih di akar. Jalankan gerbang dari akar repo.

## Fitur 5.18

- 36 latihan Listening dan 36 latihan Speaking, masing-masing mencakup A1–C2.
- State sidecar terpisah di `fiezel-sl-v1-state`; raw audio, transcript, dan jawaban dictation tidak disimpan.
- Listening tidak dapat dinilai sebelum audio benar-benar berhasil diputar.
- Skor Speaking mengukur target-language coverage, bukan pronunciation atau kualitas fonem.
- Kokoro.js 1.2.1 dan model q8 berjalan lokal melalui ONNX Runtime Web/WASM.
- Model neural sekitar 119 MB hanya diunduh setelah tombol **Siapkan suara offline** ditekan. Sebelum siap, FIEZEL memakai browser Speech Synthesis.
- Tidak ada API key vendor, paid inference, subscription, atau remote inference.

## Baseline content

- Vocabulary: 2.440 entri (+605 wave-2, +70 C1 kurasi gen2 non-duplikat).
- Grammar: 248 template / 179 lesson unik (gen2 +26 subskill baru; wave-2 +69 varian latihan) × 25 mode.
- Reading: 312 passages / 1.560 questions.
- Cloze: 209 item (gen2 +25, wave-2 +61) + alternates (cloze-alternates-v1.json).
- Listening: 1.407 item bank + 36 latihan Skills Lab.
- Speaking: 36 item.
- Grammar schema: `2.0.0`.
- Practice blueprint: `focused-25-v1`.
- Core protocol: `1.7`.
- Shadow/Canary release config: OFF.

## Quality commands

```bash
node validator.js
node tests/regression-test.js
node content-audit.js
node product-audit.js
node grammar-quality-audit.js
node tests/speaking-listening-test.js
node neural-voice-test.js
node neural-voice-http-test.js
node tests/pwa-cache-test.js
node tests/http-smoke-test.js
python3 release-audit.py
```

Aplikasi harus dijalankan melalui HTTP/HTTPS, bukan `file://`.

## Release boundary

Automated source, schema, content, privacy, PWA, asset-hash, HTTP, dan regression gates lulus. **Real-device neural voice promotion masih pending**: cold start, peak memory, latency, offline synthesis, audio unlock, interruption, dan network trace harus dibuktikan pada perangkat target sebelum build ini disebut production-ready.

External Puter deployment, scheduler/VAPID, live canary/promotion, real production evidence origin, production rehearsal, dan canonical adoption produksi juga tidak dianggap LIVE hanya karena source capability tersedia.
