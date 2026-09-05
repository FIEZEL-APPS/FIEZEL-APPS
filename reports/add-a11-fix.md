# A11 — Perbaikan kritis: kill switch yang gagal diam-diam + dua angka kuota

Branch `add/a11fix` · 28 Agustus 2026 · tanpa bump versi build, tanpa push.

Dua cacat nyata di `main` diperbaiki, dan satu gerbang baru dipasang supaya keduanya tidak
bisa kembali secara senyap: **`tests/config-consistency-test.js`** (node murni, nol dependency,
nol jaringan), terdaftar di `.github/workflows/quality.yml`.

---

## CACAT 1 — kill switch gagal dengan tenang (paling berbahaya)

**Apa yang salah.** `docs/CF-MIGRATION-RUNBOOK.md` §4.5/§4.6/§4.7 menyuruh owner menulis ke KV:

```
{"transport":"off","tts":"off","identity":"off","quotaUi":"off","analytics":"off"}
```

`workers/api/route-config.js:53-54` hanya membaca `stored.flags` dan `stored.enabled`, lalu
`mergeFlags()` (berkas yang sama) **hanya menyalin kunci yang sudah dikenal dan hanya kalau
tipenya boolean**:

- `CLIENT_FLAG_DEFAULTS` (`workers/api/schema.js:108-115`): `cfApiEnabled`, `cfAiEnabled`,
  `cfTtsEnabled`, `cfQuotaEnabled`, `cfAnalyticsEnabled`, `cfIdentityEnabled`
- `KILL_SWITCH_DEFAULTS` (`:118-123`): `ai`, `tts`, `coach`, `analytics`

Jadi perintah runbook itu masuk KV **tanpa satu pun galat** (KV tidak punya skema) dan
**diabaikan sepenuhnya**: tidak ada kunci `transport` di daftar mana pun, dan `"off"` bukan
boolean. Konsekuensi operasionalnya persis yang paling buruk: owner menjalankan kill switch,
`wrangler` menjawab sukses, `curl /api/config` tetap seperti semula — dan biaya AI/TTS jalan
terus sementara owner yakin sudah mematikannya.

**Yang diperbaiki di dokumen** (semuanya ditandai `🔄 TEMUAN LAPANGAN 28 Agu 2026`, mengikuti
konvensi penanda yang sudah dipakai bagian lain dokumen itu):

| Bagian | Sebelum | Sesudah |
|---|---|---|
| §4.5 | satu blok `kv key put` bentuk datar + "HARUS: semua nilai `off`" | ditulis ulang: tabel dua blok KV (`flags` / `enabled`) dengan sumber barisnya di `schema.js`, tabel pemetaan nama lama → nama benar, perintah `kv key put` bentuk bersarang boolean, dua langkah verifikasi (`kv key get` + `curl /api/config`), dan **prosedur sebelum/sesudah** yang membuktikan nilainya benar-benar berubah (`grep cfTtsEnabled` → `kv key put` → `sleep 65` → `grep` lagi) |
| §4.6 | `{"transport":"shadow",...}` ke KV | dijelaskan bahwa `shadow` **tidak bisa** diwakili KV (server hanya boolean, penggabungan `AND`, hanya bisa mematikan). Dipisah Langkah A (statis `core-config.js`, butuh rilis) dan Langkah B (KV, ≤60 s), plus **contoh menyalakan satu endpoint saja** (`/api/ai/translate`: `cfApiEnabled` + `cfAiEnabled` true, sisanya false eksplisit) dengan verifikasi `curl` yang juga membuktikan jalur lain tetap mati |
| §4.7 | perintah kill switch nomor 1 bentuk datar | **contoh mematikan darurat** bentuk bersarang (semua `false` eksplisit), konfirmasi `curl` wajib + apa yang harus dilakukan kalau masih `true` setelah 60 detik, ditambah contoh **mematikan satu fitur saja** (TTS mati, AI hidup) |
| §6.1 checklist | "perintah kill switch (4.7 nomor 1)" | ditegaskan bentuk bersarang boolean, bukan bentuk datar yang gagal diam-diam |
| §6.1 checklist flag | "KV `cfg:flags` semua `off`" | "setiap kunci di `flags` dan `enabled` bernilai `false` (boolean, bukan string `"off"`)" |
| §6.3 tabel pembatalan | `identity` → `off`, `transport`/`tts` → `off` | `flags.cfIdentityEnabled` → `false`, `flags.cfAiEnabled`/`flags.cfTtsEnabled` → `false` (atau `flags.cfApiEnabled` untuk semuanya) |

Prosa **tetap** menyebut bentuk lama — sengaja: orang yang sudah menyalin perintah lama ke
catatan insidennya perlu mengenalinya dan tahu kenapa harus diganti. Yang dilarang gerbang
adalah bentuk lama muncul sebagai **perintah yang bisa disalin-tempel** di blok kode.

**Konfirmasi lintas branch.** `add/a9rollout` menemukan cacat yang sama secara independen dan
mencatatnya sebagai P1 di `docs/CF-ROLLOUT-PLAN.md` ("Bentuk nilai KV di runbook 4.6/4.7
SALAH"). Bentuk bersarang yang dipakai di sini identik dengan prosedur B-1/B-2 di dokumen itu,
jadi kedua branch akan konsisten setelah merge.

---

## CACAT 2 — dua angka kuota untuk hal yang sama

`workers/api/wrangler.toml` `[vars]` adalah angka yang **dikirim ke murid** (`limits.aiPerDay`,
`limits.ttsCharsPerDay` di `route-config.js:69-70` dan `route-user.js:53-55`) untuk merakit
naskah kuota. Angka yang **ditegakkan** hidup di `workers/api/quota/quota-config.js`.

| Naskah (`[vars]`) | Sebelum | Penegakan (`quota-config.js`) | Sesudah | Efek ke murid sebelum perbaikan |
|---|---|---|---|---|
| `AI_LIMIT_PER_DAY` | `"20"` | `FREE_AI_DAILY_LIMIT: 25` | `"25"` | murid diberi tahu jatahnya 20 padahal server memberi 25 → berhenti belajar sebelum jatah habis; pesan "sisa" tidak pernah cocok dengan 429 sesungguhnya |
| `TTS_CHARS_PER_DAY` | `"6000"` | `FREE_TTS_DAILY_CHARS: 12000` | `"12000"` | separuh jatah suara "hilang" di naskah |

**Arah penyelarasan, dan alasannya ditulis, bukan didiamkan:** naskah mengikuti penegakan.
`quota-config.js` adalah satu sumber kebenaran (bab 10) dan **tidak diturunkan** — menurunkan
25 → 20 berarti memotong jatah murid hanya untuk merapikan dokumen. Gerbang menegakkan dua hal
sekaligus: pasangannya harus **cocok**, dan nilai penegakan tidak boleh **turun** di bawah
lantai `FREE_AI_DAILY_LIMIT ≥ 25` / `FREE_TTS_DAILY_CHARS ≥ 12000` (cf-a10 §6) — kalau tidak,
"menyelaraskan" dengan cara memangkas jatah murid akan lolos hijau.

**Var batas yang SENGAJA tidak dipasangkan** (didaftar dengan alasan di gerbang, dan gerbang
merah kalau ada var batas baru yang tidak masuk salah satu daftar):

- `AI_LIMIT_PER_HOUR = "40"` — tidak ada batas AI **per-jam** di `quota-config.js` untuk
  dipasangkan; yang ditegakkan hanya `FREE_AI_RATE_PER_MINUTE: 8` (= 480/jam) dan harian 25,
  dan 25/hari mengikat jauh lebih dulu daripada 40/jam, jadi angka ini tidak pernah menolak
  permintaan siapa pun. Var ini **tetap dikirim** ke klien sebagai `limits.aiPerHour`
  (`route-user.js:54`; `GET /api/config` tidak membawanya) — naskah tanpa penegakan, dibiarkan
  apa adanya di paket ini tapi didaftar dengan alasan.
- `GLOBAL_NEURON_CAP = "8000"` vs `ACCOUNT_DAILY_NEURON_BUDGET: 10000` — di sini "cocok" justru
  SALAH: 8.000 memang disetel **di bawah** plafon akun sebagai margin.
- `MAX_USERS = "250"` — batas kapasitas pemasangan (cermin `fiezel-core-worker.js:5`), bukan
  kuota per-pengguna.

Harness `tests/cf-api-contract-test.js` ikut disesuaikan (fixture `'20'`/`'6000'` → `'25'`/`'12000'`
dan assert `aiPerDay === 25`): sebelumnya harness mengabadikan angka naskah yang membohongi
murid, jadi membiarkannya berarti gerbang "hijau" atas perilaku yang salah.

---

## Gerbang baru: `tests/config-consistency-test.js`

Node murni (`fs` + `path`), keluar 0/1, menulis `CONFIG-CONSISTENCY-REPORT.json`. Terdaftar di
`.github/workflows/quality.yml` tepat sesudah `tests/cf-config-killswitch-test.js` (keduanya menjaga
sakelar yang sama dari dua sisi: perilaku kode vs perintah yang benar-benar diketik owner).

Yang di-assert — 23 pemeriksaan:

- **(a)** setiap kunci flag di **blok kode** runbook ada di `CLIENT_FLAG_DEFAULTS` atau
  `KILL_SWITCH_DEFAULTS`. Daftar sahnya **dibaca dari `workers/api/schema.js`**, bukan diketik
  ulang — kalau daftar di sumber berubah, gerbang ikut berubah; kalau bloknya tidak bisa dibaca,
  gerbang MERAH (bukan hijau dengan daftar kosong yang meloloskan semuanya).
- **(b)** setiap contoh KV di dokumen bersarang di `flags`/`enabled` — nol kunci tingkat atas
  lain, nol bentuk datar.
- **(c)** pasangan naskah↔penegakan dipetakan **eksplisit** di kode gerbang
  (`AI_LIMIT_PER_DAY`↔`FREE_AI_DAILY_LIMIT`, `TTS_CHARS_PER_DAY`↔`FREE_TTS_DAILY_CHARS`), plus
  lantai anti-penurunan, plus keharusan setiap var batas berada di daftar dipetakan **atau**
  dikecualikan dengan alasan tertulis.
- **(d)** nilai flag berupa boolean, bukan string `"off"`/`"on"`/`"shadow"`.
- Tambahan: nama datar lama tidak dipakai sebagai kunci JSON di blok kode; runbook memuat
  penanda temuan lapangan, penjelasan kegagalan senyap (`route-config.js:53-54` + `mergeFlags`),
  perintah verifikasi `curl`, contoh menyalakan satu endpoint, dan contoh mematikan darurat.

Pemindaian dilakukan atas **blok kode berpagar** (penyeimbangan kurung kurawal + `JSON.parse`),
ditambah pemindaian pola `"kunci":` untuk menangkap contoh yang rusak sintaksnya. Cakupan
pemindaian pola kedua dibatasi ke blok yang memang berbicara tentang flag/konfigurasi, supaya
JSON milik domain lain (mis. `edgeGuard` di Bagian 2A) tidak melatih orang mengabaikan gerbang.

### Matriks bukti MERAH

Dihasilkan `bash tools/config-consistency-redproof.sh` — setiap kasus merusak **satu** nilai,
menjalankan gerbang, lalu memulihkan berkas dari git sebelum kasus berikutnya:

| Kerusakan yang disuntikkan | Hasil gerbang | Pemeriksaan pertama yang merah |
|---|---|---|
| wrangler `AI_LIMIT_PER_DAY` 25 → 20 | exit 1 | (c) `AI_LIMIT_PER_DAY` == `FREE_AI_DAILY_LIMIT` — naskah=20 penegakan=25 |
| wrangler `TTS_CHARS_PER_DAY` 12000 → 6000 | exit 1 | (c) `TTS_CHARS_PER_DAY` == `FREE_TTS_DAILY_CHARS` — naskah=6000 penegakan=12000 |
| quota-config `FREE_AI_DAILY_LIMIT` 25 → 20 | exit 1 | (c) naskah=25 penegakan=20 |
| quota-config `FREE_TTS_DAILY_CHARS` 12000 → 20000 | exit 1 | (c) naskah=12000 penegakan=20000 |
| runbook: kembalikan bentuk KV DATAR `{"transport":"off",...}` | exit 1 | (b) kunci tingkat atas `[transport,tts,identity,quotaUi,analytics]` |
| runbook: satu boolean diganti string `"off"` | exit 1 | (d) `flags.cfTtsEnabled = "off"` (string) |
| runbook: kunci karangan `cfCoachEnabled` | exit 1 | (a) `flags.cfCoachEnabled` tidak ada di `CLIENT_FLAG_DEFAULTS` |
| quality.yml: gerbang dihapus dari daftar | exit 1 | "Gerbang ini terdaftar di quality.yml" |

Baseline setelah semua pemulihan: `node tests/config-consistency-test.js` **exit 0**, `git status`
bersih untuk keempat berkas yang disentuh skrip. Skrip melaporkan `BUKTI MERAH: LENGKAP`.

Catatan proses yang layak dicatat: versi pertama skrip ini memakai `sed` untuk kasus bentuk
datar dan `sed`-nya tidak mencocokkan apa pun, sehingga matriks melaporkan "gerbang buta"
padahal gerbangnya tidak pernah diuji. Kasus itu sekarang memakai `python3` dengan `assert`
pada teks target — suntikan yang gagal **menggagalkan skrip**, bukan menuduh gerbang.

---

## Verifikasi

| Gerbang | Exit |
|---|---|
| `tests/config-consistency-test.js` (baru) | 0 |
| `tests/cf-api-contract-test.js` | 0 |
| `tests/cf-wiring-test.js` | 0 |
| `tests/quota-core-test.js` | 0 |
| `tests/cf-config-killswitch-test.js` | 0 |
| `tests/regression-test.js` | 0 |
| `tests/install-health-test.js` | 0 |
| `tests/rollout-plan-test.js` | **tidak ada di branch ini** — lihat catatan |

**`tests/rollout-plan-test.js`.** Berkasnya belum ada di `main` maupun `add/a11fix`; ia lahir di
`add/a9rollout` (commit `20b54b7`) bersama `docs/CF-ROLLOUT-PLAN.md` dan
`tools/flag-plan-check.mjs`, dan gerbang itu berhenti lebih awal ("berkas wajib tidak ada")
kalau dua berkas itu tidak ada. Jadi ia tidak bisa dijalankan di sini, dan itu dilaporkan
apa adanya alih-alih diklaim hijau. Diperiksa manual dari `git show add/a9rollout:...`: satu-
satunya assert-nya yang menyentuh berkas yang kusentuh adalah
`read('workers/api/wrangler.toml').includes('AI_LIMIT_PER_DAY')` (masih benar) dan pola
`kv key put ... cfg:flags` di dokumen rollout (dokumen itu sudah memakai bentuk bersarang).
Setelah kedua branch merge ke `main`, gerbang itu harus dijalankan ulang oleh MASTER.

Tidak ada bump versi build (`SW_REV`, `DIAG_BUILD`, `FIEZEL_PAGE_BUILD`, `VERSION.json`
tidak disentuh). Tidak ada push.

## Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `docs/CF-MIGRATION-RUNBOOK.md` | §4.5 ditulis ulang, §4.6/§4.7 diperbaiki, dua butir checklist + dua baris tabel pembatalan diselaraskan |
| `workers/api/wrangler.toml` | `AI_LIMIT_PER_DAY` 20→25, `TTS_CHARS_PER_DAY` 6000→12000, + alasan & pasangan penegakan ditulis di tempat angkanya hidup |
| `tests/cf-api-contract-test.js` | fixture env + assert `aiPerDay` diselaraskan ke nilai yang ditegakkan |
| `tests/config-consistency-test.js` | **baru** — gerbang (a)(b)(c)(d) |
| `tools/config-consistency-redproof.sh` | **baru** — skrip bukti merah yang memulihkan dirinya |
| `.github/workflows/quality.yml` | gerbang baru didaftarkan sesudah `tests/cf-config-killswitch-test.js` |
| `CONFIG-CONSISTENCY-REPORT.json` | artefak gerbang |

## Yang TIDAK dikerjakan (sengaja, untuk pembaca berikutnya)

- **Worker tidak dibuat menerima kosakata lama.** Menerima `{"transport":"off"}` di
  `route-config.js` akan membuat dua bentuk hidup bersama; `add/a9rollout` P1 juga
  menyimpulkan "jangan biarkan dua bentuk hidup bersama". Dokumen yang diperbaiki + gerbang
  lebih murah dan tidak menambah permukaan yang harus dipercaya.
- **`FEATURE_AI`/`FEATURE_TTS`/`FEATURE_COACH` tetap di `[vars]`**, jadi entitlement server
  masih butuh `wrangler deploy` (bukan sakelar <60 detik). Itu temuan P8 milik A9, di luar
  cakupan paket ini.
- **`AI_LIMIT_PER_HOUR` tidak dihapus dan tidak ditegakkan**, hanya didokumentasikan sebagai
  tanpa-pasangan. Menghapus var yang mungkin masih dibaca konfigurasi produksi, atau menambah
  penegakan per-jam yang belum pernah diputuskan, dua-duanya bukan keputusan subagent.

### Koreksi atas klaimku sendiri

Draf pertama komentar `wrangler.toml` dan alasan di gerbang menulis bahwa `AI_LIMIT_PER_HOUR`
"tidak dibaca satu pun jalur naskah". Itu **salah**: `route-user.js:54` mengirimnya sebagai
`limits.aiPerHour`. Klaim itu sudah dikoreksi di kedua tempat sebelum commit. Yang benar adalah
var ini dikirim ke klien tetapi tidak punya padanan penegakan sama sekali.
