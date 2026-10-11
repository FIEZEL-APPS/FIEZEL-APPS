# FIEZEL — Laporan QA & Keamanan Backend API

**Tanggal:** 2026-10-11 · **Peran:** Senior Backend QA & Security Engineer
**Lingkup:** dua backend repo —
(A) Cloudflare **Worker API** `workers/api/**` (`api.fiezel.my.id`), dan
(B) **FastAPI** "mesin kurikulum" `backend/**`.
**Metode:** black-box + white-box, in-process, nol jaringan. Harness & skrip:
`tools/dev/api-qa/` (lihat `tools/dev/api-qa/README.md`). Bukti mentah:
`reports/api-qa-worker-results.json`, `reports/api-qa-backend-results.json`.

Harness menjalankan Worker **sungguhan** (`index.js`) dengan D1 di atas **SQLite
nyata** (`node:sqlite`, migrasi `workers/api/migrations/*` diterapkan) — jadi payload
SQLi diuji terhadap mesin SQL sungguhan, bukan fixture regex — dan FastAPI lewat
Starlette TestClient dengan MongoDB diganti `mongomock_motor`.

---

## 1. Ringkasan eksekutif

| Backend | Rute diuji | Pemeriksaan | PASS | FAIL | Temuan |
|---|---:|---:|---:|---:|---|
| Worker API | 119 | 655 | 642 | 13 | 1 MEDIUM, 1 LOW |
| FastAPI | 15 (+router penuh) | 63 | 63 | 0 | — |

**Tidak ditemukan kerentanan HIGH/CRITICAL.** Pertahanan inti kedua backend tegak:

- **SQLi/NoSQLi**: semua payload (`' OR '1'='1`, `'; DROP TABLE auth_account;--`,
  `UNION SELECT pass_hash`, `{"$ne":null}`, dst.) tertahan oleh parameter terikat
  (D1 `?n` / Mongo driver). Verifikasi white-box: `auth_account` **selamat** setelah
  seluruh payload DROP/UPDATE dijalankan.
- **Auth/IDOR**: cookie `fz_id` ber-HMAC palsu ditolak; JWT tanda tangan salah ditolak;
  murid tidak bisa menembak rute guru; murid **tidak** bisa menarik data murid lain
  lewat `?student_id=` (handler memaksa `sid = user_id`); guru **tidak** bisa membaca/
  menulis kelas & roster guru lain; rute owner fail-closed tanpa `OWNER_TOKEN_HASH`.
- **Anti-oracle**: penolakan tiket (kedaluwarsa / `aud` salah / tanda tangan salah /
  versi salah) mengembalikan **body identik** → tidak membocorkan sebab ke pemalsu.
- **Concurrency/idempotency**: balapan klaim handle → tepat 1 pemenang; undangan guru
  sekali-pakai → ≤1 pemenang pada aktivasi serentak; identitas anon stabil lintas
  permintaan (tidak menggandakan kuota); tiket KelasKu tidak bisa di-replay (jti dibakar);
  `event_id`/`idempotency_key` dedup.
- **Kebocoran error**: tidak ada stack trace, teks SQL, path, nama secret/hash yang
  bocor ke body klien; galat internal tetap `{"error":"internal_error"}` generik.

---

## 2. Temuan

### MEDIUM-1 — Body JSON non-objek (`null`) → HTTP 500 tak tertangani (Worker)

**Endpoint (9):** `POST /api/account/register`, `/api/account/login`,
`/api/account/teacher-activate`, `/api/feedback`, `/api/push/subscribe`,
`/api/activity`, `/api/policy/next`, `/api/policy/outcome`, `/api/brain/attempts`.

**Payload pemicu:** body permintaan berisi literal JSON `null` (juga memicu jalur yang
sama: skalar/`true`).

**Perilaku:** respons `500 {"error":"internal_error"}` alih-alih `400`. Body tetap
generik (tidak ada kebocoran), tetapi setiap hit mencetak `fiezel-api unhandled` +
stack ke log Worker.

**Akar masalah — `workers/api/mw-guard.js`:**

```js
// readJsonLimited()  (dan readJsonFromCtx() yang memanggilnya)
if (!read.text) return { ok: true, value: {} };
try {
  return { ok: true, value: JSON.parse(read.text) };   // <-- `null` lolos sebagai value "ok"
} catch {
  return { ok: false, response: badRequest('invalid_json', opt) };
}
```

`JSON.parse("null")` menghasilkan `null`, tetapi dikembalikan sebagai `{ok:true,
value:null}`. Handler lalu langsung mengakses properti — mis.
`route-account.js` `routeAccountRegister`:
`normalizeHandle(body.value.handle)` → `null.handle` → `TypeError` → 500.
(Array `[...]` dan angka `42` **tidak** 500 karena fungsi normalisasi sudah memeriksa
`Array.isArray`/`typeof`, dan akses properti pada angka menghasilkan `undefined`, bukan
lemparan. Yang lolos hanya `null`.)

**Dampak:** rendah-menengah. Bukan bypass otorisasi dan bukan kebocoran; tetapi murid
ber-identitas bisa memancing 500 berulang dengan satu byte, membanjiri log Worker
(observability) dan menutupi insiden nyata. Melanggar kontrak "input buruk → 4xx".

**Perbaikan disarankan (satu titik, risiko rendah):** di `readJsonLimited` /
`readJsonFromCtx`, tolak hasil parse yang bukan objek-biasa sebelum mengembalikan —
mis. setelah `JSON.parse`:

```js
const value = JSON.parse(read.text);
if (value === null || typeof value !== 'object' || Array.isArray(value)) {
  return { ok: true, value: {} };   // biarkan tiap handler memakai jalur 400-nya sendiri
}
return { ok: true, value };
```

(atau kembalikan `badRequest('invalid_json')` bila kebijakannya menolak eksplisit.)
Semua gerbang kuota/wiring tetap hijau karena fungsi normalisasi handler tidak berubah.

**Reproduksi:**
```bash
node tools/dev/api-qa/run-worker.mjs      # lihat baris "scalar/null body no-5xx"
```

---

### LOW-1 — Tabrakan kunci laporan kelas: nama depan sama saling menimpa (Worker)

**Endpoint:** `POST /api/learner/class-report`.

**Perilaku terukur (white-box):** dua **murid berbeda** (sub berbeda) yang melapor ke
satu kelas dengan **nama depan sama** (mis. "Budi") disimpan di baris D1 yang sama.
Baris murid pertama **tertimpa seluruhnya** oleh murid kedua, termasuk kolom
`learner_sub`. Dikonfirmasi: setelah dua laporan, `tc_class_report` hanya memuat **1
baris** untuk `learner_key='budi'`, berisi data murid kedua.

**Akar masalah — `workers/api/teacher/class-sync-core.js`:**

```js
export function learnerKey(name) { return firstName(name).toLocaleLowerCase('id'); }
```
dipakai sebagai kunci unik `ON CONFLICT(class_code, learner_key) DO UPDATE SET …,
learner_sub = excluded.learner_sub, …` di `route-class-sync.js`.

**Dampak:** integritas data, bukan keamanan lintas-penyewa. Di kelas dengan dua murid
bernama depan sama, progres salah satu **hilang dari layar guru**. Ini sebagian
disengaja (laporan kelas bersifat agregat & "local-first", murid tidak saling membaca),
tetapi kehilangan diam-diam layak dinaikkan ke kesadaran owner.

**Opsi perbaikan (butuh keputusan owner, bukan perubahan sepihak):** tambahkan
pembeda ke kunci (mis. 4 hex dari `identity.sub`) sehingga nama depan sama tetap
dua baris, atau tampilkan peringatan "nama bentrok" ke guru. Keduanya mengubah kontrak
laporan yang terlihat guru, jadi diserahkan ke owner.

**Reproduksi:**
```bash
node tools/dev/api-qa/run-worker.mjs      # baris "same first-name learners kept separate"
```

---

## 3. Observasi (bukan cacat — terverifikasi by-design)

- **`GET /api/usage/pepper`, `/api/tts/manifest`, `/api/braincore/item-difficulty`**
  menjawab `200` **tanpa identitas**. Diverifikasi **bebas PII** (tidak ada
  `sub`/handle/email/hash). Pepper memang harus dibaca klien sebelum ia punya identitas
  (untuk hashing `visitor_tok` sisi klien) — publik secara sengaja, terdokumentasi di
  handler. Bukan temuan.
- **Rute sosial** (`/api/social/profile/me`, `/api/social/friends…`) menjawab `404
  {"error":"profile_required"}` sebelum profil dibuat. Itu 404 **semantik** (handler
  hidup, menolak benar), bukan rute hilang.
- **CORS Worker**: allowlist eksplisit (`ALLOWED_ORIGINS`), bukan pantulan Origin,
  `*` dilarang bersama credentials. **CORS FastAPI** fail-closed bila `CORS_ORIGINS`
  kosong, dan mematikan credentials otomatis bila `*`. Keduanya benar.
- **Edge guard** (`mw-edge.js`) fail-closed tanpa `EDGE_SHARED_SECRET` (semua rute
  kecuali `/healthz` → 403). Pembatas penerbitan identitas anon (`rate-anon.js`)
  berfungsi (jalur uji memicunya).

---

## 4. Matriks hasil per-endpoint (ringkas)

**Worker API** — 119 rute terdaftar, 655 pemeriksaan, 642 PASS. Semua FAIL adalah
manifestasi MEDIUM-1/LOW-1 di endpoint berikut (1 pemeriksaan gagal masing-masing),
sisanya PASS:

| Endpoint | Pemeriksaan gagal | Temuan |
|---|---|---|
| `/api/account/register` · `/login` · `/teacher-activate` | `null` body → 500 | MEDIUM-1 |
| `/api/feedback` · `/push/subscribe` · `/activity` | `null` body → 500 | MEDIUM-1 |
| `/api/policy/next` · `/policy/outcome` · `/brain/attempts` | `null` body → 500 | MEDIUM-1 |
| `/api/ai/chat` · `/ai/translate` · `/coach/context` | `null` body → 502 (breaker, **tertangani**) | — (bukan cacat) |
| `/api/learner/class-report` | tabrakan kunci nama depan | LOW-1 |

Seluruh pemeriksaan **kontrak, injeksi (SQLi/XSS), auth/RBAC/IDOR, concurrency,
dan kebocoran** untuk endpoint di atas (dan 106 endpoint lainnya) **PASS**.

**FastAPI** — 63 pemeriksaan, **63 PASS, 0 FAIL, 0 temuan**. Cakupan termasuk:
login tiket sah/replay/kedaluwarsa/aud-salah/sig-salah/versi-salah (anti-oracle),
owner_guard (guru → 403, owner → 200), IDOR murid→murid (`/api/learning/events`,
`/api/braincore/passport/{id}`), IDOR guru→guru (`/api/classes/{id}`,
`/api/classes/{id}/roster`), SQLi/NoSQLi/XSS ke tiket & kode kelas, dedup event.

JSON lengkap (tiap baris pemeriksaan + payload) ada di `reports/api-qa-*-results.json`.

---

## 5. Cara menjalankan ulang

```bash
# Worker (D1 = SQLite nyata + migrasi):
node tools/dev/api-qa/run-worker.mjs

# FastAPI (mongomock; sekali pasang paket uji):
pip install fastapi starlette "httpx<0.28" bcrypt pyjwt python-dotenv email-validator mongomock_motor motor
python3 tools/dev/api-qa/run_backend.py
```

Kode keluar `2` bila ada temuan HIGH/CRITICAL (saat ini `0`). Keduanya aman diulang,
nol jaringan, nol berkas temporer di luar `reports/`.
