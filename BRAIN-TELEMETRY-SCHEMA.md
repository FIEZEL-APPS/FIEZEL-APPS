# Skema Telemetri Belajar — `fiezel-learning-event-v1`

**Basis:** FIEZEL 5.19.0 · branch `brain-learning-infra-v1` · **Tanggal:** 2026-08-28
**Status:** kontrak DESAIN yang mengikat implementasi Fase 2 (emitter klien) dan perluasan
ingestion. Belum ada satu baris pun emitter di `app.js` (grep `usage/events` = 0 hit) — dokumen
ini ada justru supaya baris pertamanya lahir dengan kontrak yang benar, bukan menyusul belakangan.

Basis rancangan: skema v1 usulan GPT-5.6 Sol (`../model-council-gpt_5_6_sol.md` §5.2) +
keputusan kardinalitas per-sinyal Sonnet (`../model-council-claude_sonnet_5_0.md` §2.4),
diselaraskan dengan `EVENT_SPEC` yang sudah dikapalkan
(`workers/api/analytics/analytics-core.js:170`).

---

## 1. Prinsip yang tidak bisa ditawar

1. **Dua event dulu, bukan tujuh belas.** Master prompt §5 meminta 17 tipe; v1 mengapalkan
   **2**: `answer_outcome` dan `session_summary`. Setiap tipe tambahan = risiko re-identifikasi
   + beban validasi + migrasi; tipe baru masuk lewat bump versi skema, bukan lewat "sekalian".
2. **Enum tertutup total.** Setiap field adalah enum/bucket dari daftar tertutup di dokumen ini.
   Nilai di luar daftar → event **ditolak diam-diam di klien** (tidak pernah terkirim). Tanpa
   free-text, tanpa float presisi, tanpa string bebas — meneruskan disiplin `EVENT_SPEC` yang
   sudah lulus `analytics-privacy-test.js` (54 cek, dieksekusi PASS oleh council).
3. **Tanpa timestamp presisi.** Granularitas waktu maksimum = `day` (YYYY-MM-DD) + `studyDay`
   (integer hari sejak instal). Kontrak eksisting sudah begini: envelope `at` diterima tapi
   TIDAK PERNAH disimpan (`analytics-core.js:197`). Timestamp milidetik adalah sidik jari.
4. **Grammar-only.** `domain` di v1 hanya punya satu nilai sah: `grammar`. Listening/reading
   menunggu QA konten selesai (842 soal listening masih Inggris, 170 reading `evidence_mismatch`
   — `ADAPTIVITY-READINESS-REPORT.md` §7). Menelemetrikan domain yang kontennya salah berarti
   mengumpulkan error pengukuran dengan rapi.
5. **Tanpa identifier stabil.** Tidak ada field user/device/install ID di payload mana pun.
   `eventId`/`batchId` adalah UUID acak sekali-pakai untuk deduplikasi, bukan identitas
   (kontrak penghapusan di §5). Larangan lengkap: [BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md) §7.
6. **Fail-open untuk murid.** Telemetri gagal → belajar jalan terus. Emitter tidak pernah
   memblokir UI, tidak pernah retry sinkron, dan menghormati `ANALYTICS_ENABLED`
   (hari ini `"off"`, `workers/api/wrangler.toml:65`).

---

## 2. Amplop batch (transport)

Dikirim ke `POST /api/usage/learning` (rute baru, satu keluarga dengan `POST /api/usage/events`
eksisting di `route-events.js:279`). Limit transport mewarisi nilai terpasang
`route-events.js:29–33`: body maks **8 KB**, maks **20 event/batch**, rate **60 batch/jam**.

```json
{
  "schema": "fiezel-learning-event-v1",
  "batchId": "b3e9c2d4-....",
  "appBuild": "m025-173",
  "brainBundle": "brain-v3",
  "contentVersion": "grammar-templates@2026-08",
  "day": "2026-08-28",
  "events": [ ... maks 20 ... ]
}
```

| Field | Tipe | Aturan |
|---|---|---|
| `schema` | konstanta | Versi skema; server menolak versi yang tidak dikenal (fail-closed) |
| `batchId` | UUID v4 | Dibuat saat batch dibentuk, dipersist bersama batch, dipakai untuk dedup level-batch |
| `appBuild` | enum terbuka-terkontrol | Nilai `FIEZEL_PAGE_BUILD` (`core-config.js:19`); kardinalitas = jumlah rilis |
| `brainBundle` | string versi | Identitas bundle Brain dari manifest (keputusan #3b di [BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md)) |
| `contentVersion` | string versi | Versi bank konten grammar yang aktif |
| `day` | YYYY-MM-DD | Satu-satunya penanda waktu kalender; zona waktu perangkat, tanpa jam |

Yang **tidak ada** di amplop: `visitor_token`, installId, user agent, IP (server tidak boleh
menyimpannya — kontrak `PRIVACY.md` eksisting), timestamp presisi.

---

## 3. Event 1: `answer_outcome`

Satu event per attempt soal grammar yang selesai dinilai. Semua field wajib kecuali bertanda (ops).

```json
{
  "eventId": "9f1c7a2e-....",
  "type": "answer_outcome",
  "studyDay": 14,
  "payload": {
    "domain": "grammar",
    "level": "A2",
    "mode": "adaptive",
    "skillBucket": "tense-past",
    "correct": true,
    "predictedBucket": "p60-80",
    "responseTimeBucket": "s2-5",
    "attemptBucket": "a2-3",
    "reviewGapBucket": "d1-3",
    "hintUsed": false,
    "decisionReason": "due_review"
  }
}
```

Enum tertutup per field:

| Field | Nilai sah | Kenapa bucket, bukan mentah |
|---|---|---|
| `domain` | `grammar` | Prinsip §1.4 |
| `level` | `A1 A2 B1 B2 C1` | Mengikuti `LEVELS` klien |
| `mode` | `lesson` `adaptive` `review` `exam` | Konteks pemilihan soal |
| `skillBucket` | daftar tertutup famili skill kurikulum (≤ ~30 nilai, diturunkan dari graf 139 lesson `grammar-curriculum-v1.json`; ID lesson individual TIDAK dikirim) | 139 nilai × dimensi lain = sel kecil; famili skill cukup untuk evaluasi kebijakan |
| `correct` | `true` `false` | Outcome inti |
| `predictedBucket` | `p0-40` `p40-60` `p60-80` `p80-100` | Kalibrasi prediksi Brain (Brier per bucket) tanpa membocorkan skor kontinu |
| `responseTimeBucket` | `s0-2` `s2-5` `s5-15` `s15p` | Waktu respons milidetik adalah fingerprint perilaku; 4 bucket cukup untuk mendeteksi guessing (<1.800 ms sudah jadi ambang bug guess/stretch yang diketahui — kita butuh bucketnya, bukan nilainya) |
| `attemptBucket` | `a1` `a2-3` `a4p` | Attempt ke-berapa pada item ini |
| `reviewGapBucket` | `d0` `d1-3` `d4-14` `d15p` `none` | Jarak sejak review terakhir, untuk kurva lupa agregat |
| `hintUsed` | `true` `false` | Efek scaffolding tutor |
| `decisionReason` | `due_review` `weak_skill` `target_difficulty` `new_content` `fallback` | Alasan Brain memilih item ini — sinyal terpenting untuk mengevaluasi kebijakan tanpa merekonstruksi murid |

`confidenceBucket` (ops, `c-low c-mid c-high`) hanya bila UI keyakinan aktif; absen ≠ `c-low`.

## 4. Event 2: `session_summary`

Satu event per sesi belajar berakhir (maks ~beberapa event/hari — kardinalitas sangat rendah).

```json
{
  "eventId": "c4d0e8b1-....",
  "type": "session_summary",
  "studyDay": 14,
  "payload": {
    "domain": "grammar",
    "level": "A2",
    "policyId": "core-brain-v3-default",
    "plannedBucket": "q6-12",
    "answeredBucket": "q6-12",
    "completed": true,
    "accuracyBucket": "p60-80",
    "durationBucket": "m5-15"
  }
}
```

| Field | Nilai sah |
|---|---|
| `policyId` | daftar tertutup kebijakan terdaftar di manifest bundle Brain |
| `plannedBucket` / `answeredBucket` | `q1-5` `q6-12` `q13p` |
| `completed` | `true` `false` |
| `accuracyBucket` | `p0-40` `p40-60` `p60-80` `p80-100` |
| `durationBucket` | `m0-5` `m5-15` `m15p` |

Ini cukup untuk pertanyaan yang boleh dijawab server ("apakah kebijakan X menghasilkan sesi
selesai dan akurasi di jendela target 0,80–0,85?") tanpa satu pun kuantitas yang menunjuk orang.

---

## 5. Kontrak idempotency (WAJIB sebelum emitter pertama)

Celah terukur hari ini: agregasi eksisting berbasis increment tanpa dedup event — grep
`eventId|batchId|batch_id` di `workers/api/analytics/*.js` = **0 hit**; retry setelah timeout =
hitung ganda (temuan Sol §4.3). Kontraknya:

1. **Klien**: `eventId` UUID v4 dibuat SEKALI saat event terjadi, dipersist ke antrean lokal
   SEBELUM upload pertama. Retry mengirim ulang `eventId` yang sama, tidak pernah membuat baru.
   `eventId` tidak pernah diturunkan dari timestamp, installId, atau konten event.
2. **Server**: `INSERT OR IGNORE` `eventId` ke tabel dedup retensi-pendek; hanya baris yang
   benar-benar baru yang boleh menaikkan agregat. Replay batch penuh = agregat tidak berubah
   (properti yang harus dibuktikan gate).
3. **Retensi dedup**: `eventId` dihapus setelah jendela retry (7 hari) — tabel dedup bukan log
   event, dan tidak boleh membesar tanpa batas.
4. **Cap kontribusi**: maks 300 `answer_outcome` per hari per batch-stream diterima; sisanya
   dibuang diam-diam (menutup replay-amplification dan menahan satu perangkat hiperaktif
   mendistorsi agregat kecil).
5. **Klien menghapus antrean** hanya setelah 2xx; 4xx skema = buang event (jangan retry selamanya);
   5xx/timeout = retry dengan backoff, `eventId` tetap.

Gate Node baru yang wajib menyertai implementasi: `learning-events-idempotency-test.js` —
membuktikan replay-safe end-to-end terhadap fake D1, dengan pola yang sama seperti
`analytics-aggregate-test.js` (45 cek) eksisting.

## 6. Aturan versioning

- Perubahan APA PUN pada daftar enum/field = bump ke `fiezel-learning-event-v2`; server menolak
  versi tak dikenal, klien lama tetap sah mengirim v1 selama masa deprekasi.
- Menambah nilai enum baru ke field lama juga bump versi — "cuma nambah satu nilai" adalah cara
  kardinalitas mati pelan-pelan.
- Skema hidup di repo (dokumen ini + konstanta di kode), bukan dinegosiasikan runtime —
  konsisten dengan repo-as-registry ([BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md) §3).

## 7. Yang eksplisit dilarang di v1 (dan tidak akan lolos review)

ID lesson/item individual · skor/probabilitas kontinu · durasi milidetik · urutan jawaban dalam
sesi (sequence fingerprint) · teks jawaban/opsi/prompt · state BKT/memori mentah · field
`actor`/`user`/`device` dalam bentuk apa pun · timestamp lebih halus dari hari · domain selain
`grammar`. Alasan per larangan: [BRAIN-DATA-PRIVACY.md](BRAIN-DATA-PRIVACY.md).
