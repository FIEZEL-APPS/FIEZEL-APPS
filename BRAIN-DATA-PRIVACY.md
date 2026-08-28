# Privasi Data Belajar — Kontrak & Argumen Hukum

**Basis:** FIEZEL 5.19.0 · branch `brain-learning-infra-v1` · **Tanggal:** 2026-08-28
**Cakupan:** telemetri belajar `fiezel-learning-event-v1`
([BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md)) + analitik produk eksisting
(`workers/api/analytics/PRIVACY.md`). Dokumen ini menambahkan argumen hukum dan aturan agregasi;
kontrak teknis analitik produk yang sudah dikapalkan tetap otoritatif di file aslinya.

Posisi dasarnya satu kalimat: **data yang tidak pernah dikumpulkan tidak perlu dilindungi,
tidak bisa bocor, dan tidak bisa diminta siapa pun.**

---

## 1. Apa yang dikumpulkan, kenapa, berapa lama

| Data | Kenapa dikumpulkan | Bentuk saat disimpan | Retensi | Penghapusan |
|---|---|---|---|---|
| `answer_outcome` (enum/bucket, grammar-only) | Evaluasi kalibrasi & kebijakan Brain di tingkat populasi | Hanya menaikkan counter agregat per (day × dimensi); baris event tidak disimpan | Agregat: 90 hari (mengikuti `usage_daily`, `PRIVACY.md:105`) | Kedaluwarsa otomatis via rollup harian |
| `session_summary` (bucket kasar) | Apakah kebijakan menghasilkan sesi selesai di jendela akurasi target | Sama: counter agregat | 90 hari | Sama |
| `eventId` / `batchId` (UUID acak) | Idempotency saja | Tabel dedup retensi-pendek | 7 hari | Dihapus setelah jendela retry ([BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md) §5.3) |
| `metrics_daily` / `usage_daily` / `retention_daily` / `dau_dedup` (eksisting) | Analitik produk | Counter tanpa individu | Permanen / 90 hari / 400 hari / dihapus tiap malam (`PRIVACY.md:104–108`) | Sesuai kontrak eksisting |
| Riwayat belajar lengkap (attempt, timing, prediksi, miskonsepsi, state BKT/memori) | Adaptivitas untuk murid itu sendiri | **localStorage perangkat murid — tidak pernah diunggah** | Selama aplikasi terinstal | Hapus data situs / uninstal = hilang total; tidak ada salinan server |

Yang TIDAK dikumpulkan, titik: nama, email, IP (tidak disimpan server), user agent, GPS,
timestamp presisi (`at` diterima tapi TIDAK PERNAH disimpan —
`workers/api/analytics/analytics-core.js:197`), teks jawaban, ID lesson individual, dan
identifier stabil apa pun (§7).

## 2. Arsitektur penghapusan: erasure-by-construction

Klaim yang bisa dibantah: **48 jam setelah sebuah event dikirim, tidak ada satu record pun di
sistem yang dapat diatributkan ke individu mana pun, oleh siapa pun, termasuk operator.**

Mekanismenya kriptografis, bukan kebijakan: satu-satunya kuantitas mirip-identitas yang pernah
menyentuh server adalah `visitor_token = HMAC-SHA256(pepper_hari_ini, installId)` dipotong 128
bit, dihitung DI PERANGKAT (server menerbitkan pepper via `GET /api/usage/pepper` justru untuk
itu — `workers/api/analytics/route-events.js:6,13`); pepper dirotasi tiap 24 jam dan pepper dua
putaran lalu **dihapus permanen** (`analytics-core.js:10–20`; cron `*/5 * * * *` di
`workers/api/wrangler.toml:158`). Token hari-1 dan hari-2 tidak bisa di-link karena materi
kuncinya sudah tidak ada; `dau_dedup` dihapus tiap malam setelah rollup (`PRIVACY.md:107`).
Telemetri belajar v1 malah tidak memakai token sama sekali — hanya counter.

Konsekuensi terhadap **UU No. 27 Tahun 2022 (Pelindungan Data Pribadi)**
([teks resmi JDIH Komdigi](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang+nomor+27+tahun+2022);
[terjemahan Inggris ABNR](https://www.abnrlaw.com/lib/files/IND-ENG-UU%2027-2022%20Pelindungan%20Data%20Pribadi%20(ABNR).pdf)):
hak subjek data — akses, koreksi, penghapusan, portabilitas — melekat pada data pribadi, yaitu
data tentang orang yang **teridentifikasi atau dapat diidentifikasi secara langsung maupun tidak
langsung** ([ringkasan Linklaters](https://www.linklaters.com/en/insights/data-protected/data-protected---indonesia)).
Counter agregat tanpa jalur atribusi bukan data pribadi; permintaan penghapusan atas agregat
menjadi kosong bukan karena ditolak, melainkan karena **arsitektur sudah menghapus lebih dulu
dan lebih total daripada yang bisa diminta**. Sisi lain koin yang sama: riwayat belajar penuh
tetap 100% milik murid di perangkatnya — penghapusan = hapus data situs, tuntas, tanpa perlu
meminta siapa pun.

Kejujuran yang wajib dicatat: klaim ini berlaku untuk data yang MENGALIR sesuai kontrak.
`installId` di perangkat tetap data pribadi selama aplikasi terinstal — kontraknya adalah dia
tidak pernah ditransmisikan (§7), bukan bahwa dia tidak ada. Dan "anonim" adalah properti
sistem yang harus terus ditegakkan gate CI, bukan label yang ditempel sekali.

## 3. Kenapa on-device-first, secara hukum dan teknis

Metrik longitudinal (retensi, kurva lupa, learning gain) dihitung di perangkat dan hanya digest
bucket yang naik — keputusan #4 [BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md),
dipaksa oleh desain pepper di §2. Preseden produksinya sudah ada: `retention_daily` — klien
membukukan `cohort_day` + `day_index` (0–400) sendiri, server hanya menyimpan hitungan
(`analytics-core.js:178`). Prinsip: **server boleh mengevaluasi kelas kebijakan; server tidak
boleh bisa merekonstruksi seorang anak** (`../model-council-gpt_5_6_sol.md` §5.3).

## 4. Aturan supresi sel kecil: k = 20

Agregasi saja tidak cukup pada populasi ≤ 250 (`MAX_USERS`, `workers/api/wrangler.toml:58`):
sel `(day=2026-08-28 × level=C1 × skillBucket=conditional-3)` yang berisi satu murid adalah
record individual dengan kostum agregat.

Aturannya:
1. **Tidak ada sel agregat yang ditampilkan/diekspor bila menghimpun < 20 perangkat berbeda**
   pada periodenya; sel < 20 dilaporkan sebagai `<20`, bukan angkanya (ambang interim k≥20 dari
   rekomendasi Sonnet §2.4 dan aturan display Sol §4.2).
2. Bila kombinasi dimensi rutin jatuh di bawah k, **dimensinya yang dikoarsenkan** (mis. gabung
   `skillBucket` ke famili lebih besar), bukan supresinya yang dilonggarkan.
3. Ambang k ini aturan tampilan/ekspor DAN aturan desain skema: setiap field baru di
   [BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md) wajib membawa estimasi ukuran sel
   terburuknya saat review.
4. Differential privacy secara sadar TIDAK dipakai sebagai ganti aturan ini — pada N≈40 noise DP
   menghancurkan sinyal ([NIST SP 800-226](https://csrc.nist.gov/pubs/sp/800/226/final));
   argumen penuh di [BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md) §6.

## 5. Deviasi sadar dari xAPI / Caliper

FIEZEL **tidak konforman** terhadap xAPI maupun 1EdTech Caliper, dan ini keputusan, bukan
kelalaian. Kedua standar mensyaratkan aktor dengan identitas persisten — statement xAPI wajib
punya `actor` ber-identifier unik (mbox/account), plus timestamp presisi dan field respons bebas
([spesifikasi data xAPI](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md));
Caliper serupa via entitas Person
([perbandingan resmi 1EdTech](https://www.imsglobal.org/initial-xapicaliper-comparison),
[Caliper 1.2](https://www.1edtech.org/standards/caliper)). Identitas persisten adalah persis
properti yang arsitektur ini hapus dengan sengaja (§2) — konformansi berarti regresi privasi.
Yang diadopsi hanya kosakata penamaannya bila berguna; payload, `actor`, timestamp, dan konsep
LRS-nya tidak diimpor. Reviewer masa depan yang menemukan "ketidakpatuhan" ini diarahkan ke
paragraf ini: jangan diperbaiki.

## 6. Anak-anak, usia, dan batas klaim (catatan COPPA)

- FIEZEL tidak punya gerbang usia dan mungkin dipakai anak < 13 tahun. Di bawah COPPA (bila
  yurisdiksinya relevan), **persistent identifier saja sudah tergolong informasi pribadi** untuk
  layanan child-directed, dan analitik internal tertentu punya pengecualian terbatas
  ([FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
  Desain tanpa-identifier-stabil membuat posisi ini kuat by default — dan itu alasan tambahan
  §7 permanen.
- **Larangan istilah**: "anonymous installation ID" tidak boleh muncul di dokumen/kode/marketing.
  Identifier stabil per perangkat adalah **pseudonim**, bukan anonim — data pseudonim tetap data
  pribadi ([panduan anonimisasi ICO](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/introduction-to-anonymisation/)).
  Yang benar-benar anonim di sistem ini hanyalah counter agregat pasca-supresi.
- Bila kelak "Lane B" riset ber-`studyId` (status `research`,
  [BRAIN-EVOLUTION-DECISIONS.md](BRAIN-EVOLUTION-DECISIONS.md) §4) dipertimbangkan: wajib review
  usia/yurisdiksi lebih dulu, consent eksplisit (opt-out kemungkinan tidak memadai untuk anak),
  dan UU 27/2022 mengkategorikan data anak sebagai data pribadi spesifik dengan perlakuan lebih
  ketat ([Linklaters](https://www.linklaters.com/en/insights/data-protected/data-protected---indonesia)).
  Sebelum review itu ada, Lane B tidak dibangun.

## 7. Larangan identifier stabil — permanen

Tidak ada identifier stabil lintas-hari dalam bentuk apa pun di telemetri: bukan installId,
bukan hash-nya (hash statis dari ID stabil = ID stabil), bukan fingerprint perangkat, bukan
`eventId` yang diturunkan dari sesuatu yang stabil, bukan "ID anonim". Penegakan yang sudah ada
dan wajib diperluas ke rute telemetri belajar:

- `installId` tidak pernah meninggalkan perangkat (`analytics-core.js:16`); HMAC dihitung
  on-device dengan pepper harian yang berumur pendek (§2).
- Join analitik × quota diharamkan: `user_id` terlarang di zona analitik, ditegakkan
  `FORBIDDEN_TABLES` di `analytics-store-d1.js` dan `analytics-server-only-test.js`
  (69 cek, PASS pada eksekusi council).
- Gate anti-regresi: CI menolak diff yang memperkenalkan field ber-nama/ber-bentuk identifier
  ke skema telemetri (daftar larangan [BRAIN-TELEMETRY-SCHEMA.md](BRAIN-TELEMETRY-SCHEMA.md) §7).

Satu-satunya jalur pengecualian adalah Lane B §6 — terpisah, ber-consent, ber-rotasi 90 hari,
dan hari ini berstatus tidak-dibangun.

## 8. Batas kejujuran dokumen ini

Dokumen ini menjelaskan kontrak untuk sistem yang **belum menyala**: `ANALYTICS_ENABLED = "off"`
dan `database_id` D1 masih placeholder (`workers/api/wrangler.toml:65,78,95`) — hari ini tidak
ada telemetri apa pun yang mengalir, dan itu berarti klaim §1–§4 tentang perilaku produksi
adalah klaim tentang desain + gate lokal, bukan observasi produksi. Penulis dokumen ini bukan
penasihat hukum; §2 dan §6 adalah argumen arsitektur yang dipetakan ke teks regulasi yang
dikutip, bukan opini hukum — keputusan mengaktifkan telemetri pada populasi nyata tetap butuh
review manusia yang berwenang per `MASTER-ONLY-GOVERNANCE.md`.
