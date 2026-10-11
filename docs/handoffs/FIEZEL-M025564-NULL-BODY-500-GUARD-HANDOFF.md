# FIEZEL HANDOFF: TANGKAL CRASH 500 BODY JSON NULL / NON-OBJEK (m025-564)

## 1. Ringkasan & Latar Belakang

Pada audit QA & keamanan backend mendalam (PR #589), ditemukan satu temuan tingkat MEDIUM (MEDIUM-1):
Body JSON literal `null` (atau skalar non-objek) yang dikirimkan ke rute `POST` memicu `500 {"error":"internal_error"}` alih-alih `400 Bad Request`.

Akar masalah berasal dari dua titik pembacaan JSON:
1. `workers/api/mw-guard.js` (`readJsonLimited` dan `readJsonFromCtx`):
   `JSON.parse("null")` menghasilkan nilai `null` yang dikembalikan sebagai `{ ok: true, value: null }`. Ketika handler mengakses properti `value.handle` atau field lainnya, JavaScript melempar `TypeError: Cannot read properties of null` yang berujung pada HTTP 500 tidak tertangani.
2. `workers/api/route-legacy.js` (`readJson`):
   Fungsi pembaca internal mengevaluasi `JSON.parse` atau `ctx.request.json()` langsung tanpa memastikan nilai balikan bertipe objek biasa, menyebabkan crash 500 pada rute legacy seperti `/api/policy/next`, `/api/policy/outcome`, `/api/brain/attempts`, `/api/feedback`, dll.

## 2. Solusi Teknis & Invarian

1. **mw-guard.js**:
   Pada `readJsonLimited` dan `readJsonFromCtx`, hasil `JSON.parse` diverifikasi bertipe objek biasa:
   ```javascript
   const value = JSON.parse(text);
   if (value === null || typeof value !== 'object' || Array.isArray(value)) {
     return { ok: true, value: {} };
   }
   return { ok: true, value };
   ```
   Dengan mengembalikan `{ ok: true, value: {} }`, setiap handler memproses properti sebagai `undefined` dan mengeksekusi alur validasi input `400 Bad Request` masing-masing tanpa melempar exception 500.

2. **route-legacy.js**:
   Fungsi pembaca `readJson(ctx)` dinormalisasi agar selalu mengembalikan objek `{}` jika nilai parse bernilai `null`, skalar, atau array.

3. **Verifikasi Empiris**:
   Rangkaian uji `node tools/dev/api-qa/run-worker.mjs` dijalankan:
   - Sebelumnya: 9 rute crash dengan status 500.
   - Sesudah perbaikan: 0 rute crash (lulus 654/655 uji; 1 gagal tersisa adalah LOW-1 `learnerKey` yang merupakan keputusan arsitektur owner).

## 3. Berkas yang Diubah

- `workers/api/mw-guard.js`: Penjagaan nilai null/non-objek pada `readJsonLimited` dan `readJsonFromCtx`.
- `workers/api/route-legacy.js`: Penjagaan nilai null/non-objek pada fungsi pembaca internal `readJson`.
- `reports/api-qa-worker-results.json`: Pembaruan hasil uji bukti empiris (654/655 PASS).
- `docs/handoffs/FIEZEL-M025564-NULL-BODY-500-GUARD-HANDOFF.md`: Dokumen serah terima ini.
- Hexa-Sync Arbiter (`coordination/BUILD-VERSION.json`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `kurikulum.html`, `misi.html`) dinaikkan ke `m025-564`.
