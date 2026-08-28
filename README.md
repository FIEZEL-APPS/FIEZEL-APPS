# FIEZEL 5.19.0

FIEZEL adalah Personal English OS. Build 5.19.0 mengintegrasikan **Speaking + Listening Skills Lab**, **Core Brain adaptif**, dan jalur **local neural voice** yang tetap menjaga privasi, biaya runtime nol, serta kompatibilitas state lama.

Handoff berikutnya memakai master prompt v2.0 dan roadmap berbasis gerbang bukti. Baca `FIEZEL-5.18.0-NEXT-HANDOFF-MASTER-PROMPT.md` bersama `FIEZEL-PRODUCT-ROADMAP-2026-2027.md`. GitHub dan archive wajib direkonsiliasi sebelum promosi bila version surfaces berbeda.

## Fitur 5.18

- 36 latihan Listening dan 36 latihan Speaking, masing-masing mencakup A1–C2.
- State sidecar terpisah di `fiezel-sl-v1-state`; raw audio, transcript, dan jawaban dictation tidak disimpan.
- Listening tidak dapat dinilai sebelum audio benar-benar berhasil diputar.
- Skor Speaking mengukur target-language coverage, bukan pronunciation atau kualitas fonem.
- Kokoro.js 1.2.1 dan model q8 berjalan lokal melalui ONNX Runtime Web/WASM.
- Model neural sekitar 119 MB hanya diunduh setelah tombol **Siapkan suara offline** ditekan. Sebelum siap, FIEZEL memakai browser Speech Synthesis.
- Tidak ada API key vendor, paid inference, subscription, atau remote inference.

## Baseline content

- Vocabulary: 1.865 entri (+100 C1 kurasi gen2).
- Grammar: 179 lesson × 25 mode = 4.475 runtime questions (gen2 m025-188: +26 lesson penutup gap CEFR).
- Reading: 312 passages / 1.560 questions.
- Cloze: 148 item + 293 alternates (cloze-alternates-v1.json).
- Listening: 1.407 item bank + 36 latihan Skills Lab.
- Speaking: 36 item.
- Grammar schema: `2.0.0`.
- Practice blueprint: `focused-25-v1`.
- Core protocol: `1.7`.
- Shadow/Canary release config: OFF.

## Quality commands

```bash
node validator.js
node regression-test.js
node content-audit.js
node product-audit.js
node grammar-quality-audit.js
node speaking-listening-test.js
node neural-voice-test.js
node neural-voice-http-test.js
node pwa-cache-test.js
node http-smoke-test.js
python3 release-audit.py
```

Aplikasi harus dijalankan melalui HTTP/HTTPS, bukan `file://`.

## Release boundary

Automated source, schema, content, privacy, PWA, asset-hash, HTTP, dan regression gates lulus. **Real-device neural voice promotion masih pending**: cold start, peak memory, latency, offline synthesis, audio unlock, interruption, dan network trace harus dibuktikan pada perangkat target sebelum build ini disebut production-ready.

External Puter deployment, scheduler/VAPID, live canary/promotion, real production evidence origin, production rehearsal, dan canonical adoption produksi juga tidak dianggap LIVE hanya karena source capability tersedia.
