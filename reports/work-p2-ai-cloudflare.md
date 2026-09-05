# P2 — AI Cloudflare: apa yang TERBUKTI hidup, apa yang belum

Cabang `work/p2ai`. Tanpa push, tanpa bump versi build, tanpa menyentuh
`features/neural-voice/`, `features/library/`, `workers/owner/`, `coordination/`, `app.js`,
`sw.js`, `core-config.js`.

Bukti mentah jalan live ada di `AI-LIVE-REPORT.json` (gitignored, dihasilkan
`tools/ai-live-verify.mjs`). Semua angka di bawah berasal dari sana atau dari `curl` langsung
ke `https://api.fiezel.my.id` pada 28 Agustus 2026, bukan dari ingatan.

---

## 1. Ringkasan yang tidak nyaman

**AI lewat Cloudflare SUDAH HIDUP secara teknis, tapi belum bisa disebut "sudah bisa diambil
alih".** Endpoint-nya berjalan, model sungguhan menjawab, kuota ditagih dengan benar. Yang
belum: mayoritas tipe task masih membuang jawaban model dan menyajikan fallback deterministik
ke murid. Menyalakan flag klien hari ini akan menyalakan sesuatu yang sebagian besar belum
memberi nilai tambah, sambil menambah tagihan.

Tiga hal yang harus kamu baca sampai habis sebelum menyalakan apa pun:

1. **`cfAiEnabled` TIDAK ditegakkan di server.** `POST /api/ai/task` menjalankan model
   SUNGGUHAN hari ini, dengan flag masih `false`. Ini lubang biaya, bukan detail.
2. **Model membocorkan rangka prompt internal ke jawaban yang dilihat murid.** Terbukti hidup,
   dan seluruh gerbang lama menyebutnya sukses. Sudah ditutup di cabang ini.
3. **Angka jatah yang DIKATAKAN ke murid (`/api/config`) berbeda dari yang DITEGAKKAN
   (`/api/quota`)** — 20 vs 25 dan 6000 vs 12000. Repo sudah benar; yang salah adalah Worker
   terpasang.

---

## 2. Tugas 1 — var Worker vs `quota-config.js`

**Repo sudah benar. Tidak ada yang perlu disunting.** `workers/api/wrangler.toml` `[vars]`
sudah memuat `AI_LIMIT_PER_DAY = "25"` dan `TTS_CHARS_PER_DAY = "12000"`, dan keduanya cocok
dengan `workers/api/quota/quota-config.js` (`FREE_AI_DAILY_LIMIT: 25`,
`FREE_TTS_DAILY_CHARS: 12000`). `tests/config-consistency-test.js` sudah menegakkan pasangan itu
plus lantai nilainya (`FLOOR = { FREE_AI_DAILY_LIMIT: 25, FREE_TTS_DAILY_CHARS: 12000 }`),
jadi "menyelaraskan angka dengan menurunkan jatah murid" akan memerahkan gerbang — sesuai
mandat.

Var batas lain yang menyimpang dari padanan penegakan, semuanya SUDAH terdaftar sebagai
pengecualian beralasan di `tests/config-consistency-test.js`, dan saya setuju dengan alasannya:

| Var | Nilai | Status |
|---|---|---|
| `AI_LIMIT_PER_HOUR` | 40 | Tanpa padanan penegakan. Yang ditegakkan `FREE_AI_RATE_PER_MINUTE=8` dan harian 25; 25/hari mengikat jauh lebih dulu. Naskah tanpa penegakan — dibiarkan terbuka, tidak didiamkan. |
| `GLOBAL_NEURON_CAP` | 8000 | SENGAJA di bawah `ACCOUNT_DAILY_NEURON_BUDGET=10000` sebagai margin. "Cocok" di sini justru salah. |
| `MAX_USERS` | 250 | Batas kapasitas pemasangan, bukan kuota per murid. |

**Yang RUSAK bukan repo, tapi deploy.** Terukur dari luar, satu Worker yang sama:

```
GET /api/config → limits: { aiPerDay: 20,  ttsCharsPerDay: 6000  }   ← var lama, STALE
GET /api/quota  → buckets.ai.limit: 25, buckets.ttsChars.limit: 12000 ← penegakan, BENAR
```

Artinya penegakan sudah berjalan di angka yang benar (murid memang dapat 25), tetapi angka
yang DITAMPILKAN ke murid masih 20. Murid diberi tahu jatahnya lebih kecil dari yang
sebenarnya ia punya. Perbaikannya bukan menyunting repo, tapi men-deploy `[vars]` yang sudah
ada. Perintahnya ada di §7.

Ketidakcocokan ini sekarang punya pemeriksa dari luar: `tools/ai-live-verify.mjs` cek
`limit-naskah-sama-dengan-penegakan` MERAH selama keduanya berbeda, dan keduanya dibaca dari
Worker hidup — bukan dari repo, jadi tidak bisa dibantah sebagai "selisih repo vs deploy".

---

## 3. Tugas 2 — `tools/ai-live-verify.mjs`

Alat baru, nol dependency, menembak `https://api.fiezel.my.id` sungguhan.

- **Tanpa `FIEZEL_AI_LIVE_BASE`:** cetak alasan jujur, `status:"SKIP"`, `pass:null`, exit 0.
  Tidak ada URL bawaan (`|| 'https://…'`) — larangan itu diperiksa dengan MENJALANKAN berkasnya
  di `tests/no-network-test.js` blok 2d, bukan dipercaya dari komentar.
- **Env diset tapi tidak sah:** MERAH (exit 1), bukan SKIP. Seseorang memang meminta pengujian
  nyata; "produksi tidak bisa dihubungi" tidak boleh berubah menjadi hijau.
- **Registry sebagai sumber kebenaran:** daftar task, `FORBIDDEN_FIELDS`, nama skema, dan
  `responseShape` per model dibaca dari `workers/api/ai/ai-tasks.js`. Kalau ditulis ulang di
  alatnya, alat itu akan lulus terhadap kontrak versi lamanya sendiri.
- **Kontrak mutu dijalankan ULANG di sisi luar** terhadap teks yang benar-benar dikirim
  (`checkOutputContract`). Kalau Worker menyatakan sukses untuk teks yang pemeriksa kami
  sendiri tolak, kedua sisi sudah menyimpang.

**Panggilan model: 5 — satu per tipe task, dan itu minimum yang cukup.** Bukti lain dirancang
supaya berbiaya nol: `prompt` terlarang, `input.prompt` terlarang, dan skema salah semuanya
ditolak pada validasi sebelum provider disentuh; `quotaCharged` di jalur penolakan dibaca dari
ketiga respons 400 itu; kedua bentuk provider dibuktikan dari `responseShape` registry (task
yang ditembak wajib mencakup `llama` dan `openai`) bukan dari panggilan tambahan; keluaran
kosong dibaca dari task yang kebetulan menjawab kosong pada jalan yang sama — TIDAK dipancing
dengan panggilan ekstra, dan kalau tidak muncul ia dilaporkan `SKIPPED`, bukan `PASS`.
Batasi lebih jauh dengan `FIEZEL_AI_LIVE_TASKS=tutor_turn` bila hanya mau membayar sebagian.

Registrasi CI: satu langkah `workflow_dispatch` bergerbang aktor di `quality.yml` (input
`ai_live_base`), **tidak ada** di jalur per-push. Dua gerbang menjaga itu dari dua sisi —
`tests/no-network-test.js` (langkahnya wajib tepat satu dan wajib bergerbang) dan
`tests/workflow-actor-gate-test.js` cek (H), yang regexnya saya perluas supaya langkah termahal di
workflow tidak menjadi satu-satunya yang penjaganya tak pernah diverifikasi.

---

## 4. Yang TERBUKTI hidup (jalan 28 Agu 2026, 45 PASS / 1 FAIL)

| Bukti yang diminta | Hasil |
|---|---|
| (a) sesi anon | `POST /api/auth/anon` → 200, `Set-Cookie fz_id` lolos utuh melewati Cloudflare |
| (b) setiap tipe task | 5/5 menjawab 200 dengan skema `fiezel-ai-response-v2` |
| (c) `prompt` terlarang | `prompt` → **400** `client_prompt_forbidden:prompt`; `input.prompt` juga 400; provider tidak pernah dipanggil |
| (d) dua bentuk provider | `llama` (`result.response`) dan `openai` (`choices[0].message.content`) sama-sama ditembak; **nol** sukses berteks kosong |
| (e) `quotaCharged` boolean | ada dan bertipe boolean di 5 amplop sukses DAN 3 amplop penolakan; `false` di setiap penolakan |
| (f) keluaran kosong | `empty_output` → `source:deterministic-fallback`, `degraded:true`, `quotaCharged:false`, dan kuota memang tidak naik |
| (g) kuota dari luar | `ai.used` 0 → **2**, tepat sebanyak 2 jawaban provider yang sukses. 3 sisanya nol. |

Yang paling penting dari tabel itu: **(g) membuktikan A12 dari luar.** Dua jawaban gagal karena
`empty_output` dan satu karena `sentence_limit_exceeded`, dan tidak satu pun menagih. Rollback
kuota untuk keluaran kosong bekerja pada Worker yang sungguhan, bukan hanya di stub.

Satu FAIL: `limit-naskah-sama-dengan-penegakan` (§2). Itu memang harus merah.

---

## 5. Yang BELUM hidup — dan ini yang menahan penyalaan

**Hanya 2 dari 5 tipe task yang benar-benar menyampaikan jawaban model ke murid.**

| Task | Hasil | Yang dilihat murid |
|---|---|---|
| `context_coach` | provider, 146 token keluar | jawaban AI (dengan cacat §6.1) |
| `session_recap` | provider, 97 token keluar | JSON `{"points":[…]}` — sesuai desain, klien yang merakit |
| `tutor_turn` | `sentence_limit_exceeded` | fallback "Mode hemat — jawaban ini dari FIEZEL, bukan AI" |
| `writing_feedback` | `empty_output` | fallback pemeriksaan bentuk |
| `translate_subtitle` | `empty_output` | **string kosong** (fallback `translate_subtitle` sengaja kosong) |

`tutor_turn` melanggar batas 6 kalimat pada dua jalan berbeda yang saya coba. `writing_feedback`
dan `translate_subtitle` mengembalikan keluaran kosong dari `granite-4.0-h-micro` /
llama — bukan galat, memang kosong. Jadi untuk tiga task itu, "AI Cloudflare" hari ini berarti
"murid membaca fallback deterministik sambil owner membayar token". Kualitas prompt/model per
task adalah pekerjaan berikutnya, dan itu di luar cakupan paket ini — tapi jangan menyalakan
flag dengan asumsi ia sudah selesai.

---

## 6. Temuan yang tidak saya minta, tapi menemukan saya

### 6.1 Model membocorkan rangka prompt ke layar murid — DITUTUP di cabang ini

`context_coach`, llama-3.3-70b, 200 OK, `source:"provider"`, `degraded:false`,
`quotaCharged:true`, dan teksnya dibuka:

```
---END DATA---
Kamu sudah menunjukkan kemajuan yang cukup baik...
```

Model MENUTUP pembatas data kami lalu menjawab. Sebelum perbaikan ini, **semua** pemeriksa
kami menyebutnya sukses: teksnya panjang (bukan kosong), kalimatnya di bawah batas, kanon
katanya benar. Murid membaca potongan rangka prompt internal, kuotanya ditagih untuk itu, dan
CI tetap hijau.

Kenapa ini bukan cacat kosmetik: kebocoran rangka menandakan model memperlakukan bagian
instruksi kami sebagai bahan yang boleh dikutip. Jarak dari "mengutip pembatas" ke "mengutip
kalimat penjaganya" nol, dan kalimat penjaga itulah satu-satunya yang menahan data murid
supaya tidak dibaca sebagai perintah.

Perbaikan: kelas kegagalan baru `OUTPUT_FAILURES.scaffoldEcho = 'prompt_scaffold_echo'` di
`workers/api/ai/ai-tasks.js`, diperiksa di `checkOutputContract()` SEBELUM batas kalimat dan
kanon kata, berlaku untuk SEMUA task termasuk `translate_subtitle` yang `sentenceLimit`-nya 0.
Pembatas `DATA_DELIM` sekarang satu sumber untuk pembangun prompt DAN pendeteksinya. Polanya
sengaja sempit (dua tanda hubung atau lebih di kedua sisi kata DATA, plus kalimat pembuka
penjaga) supaya tanda hubung sah dan kata "data" biasa tidak kena — dan sisi itu ikut
di-assert. Blok 6 baru di `tests/ai-response-shape-test.js` menutupnya ujung-ke-ujung: handler
membuang jawaban itu, mengganti dengan fallback, dan TIDAK menagih.

**Perbaikan ini ada di repo, BELUM di Worker terpasang.** Sampai di-deploy, murid masih bisa
melihat kebocorannya, dan `tools/ai-live-verify.mjs` akan MERAH di cek
`provider-lulus-kontrak-mutu:context_coach` kalau kebocorannya berulang — itu perilaku yang
benar.

### 6.2 `cfAiEnabled` tidak ditegakkan di server sama sekali

`grep` untuk `cfAiEnabled`, `enabled.ai`, dan `FEATURE_AI` di `workers/api/index.js` dan
`route-wiring.js`: **nol hasil di jalur permintaan.** Dan itu bukan teori — dua jawaban model
sungguhan di §4 dihasilkan dengan `flags.cfAiEnabled:false` dan `enabled.ai:false`.

Konsekuensinya: **premis tugas 3 salah.** Verifikasi penuh TIDAK butuh flag dinyalakan
sementara — saya sudah membuktikan seluruh kontrak dengan flag tetap `false`, dan saya tidak
menyentuh KV. Tapi ini terbalik menjadi risiko yang lebih besar: siapa pun yang bisa mengambil
cookie anon (`POST /api/auth/anon`, tanpa syarat apa pun) bisa membelanjakan jatah neuron akun
Cloudflare hari itu. Yang menahan hari ini hanya kuota per-identitas 25/hari dan rate 8/menit;
tidak ada yang menahan pembuatan identitas baru berulang kali.

Saya TIDAK memperbaikinya di paket ini: penegakan flag ada di jalur `route-wiring.js` /
`index.js` yang bukan lingkup saya, dan mematikan endpoint yang saat ini hidup adalah keputusan
owner, bukan keputusan agen. Ini pekerjaan P0 berikutnya.

### 6.3 `quotaRolledBack` melaporkan `false` padahal rollback terjadi

Kelima amplop melaporkan `quotaRolledBack:false`, tetapi `ai.used` membuktikan kuotanya
memang tidak pernah naik untuk ketiga jawaban yang gagal. Sebabnya `deps.rollbackQuota` tidak
diinjeksi di jalur nyata, jadi `settleQuota()` di `route-wiring.js` melakukan rollback lewat
jalur lain sementara fieldnya tetap `false`. Field yang salah lapor lebih buruk daripada field
yang tidak ada, karena ia dipercaya. Saya laporkan, tidak saya "rapikan" diam-diam — jalur
itu di luar lingkup paket ini, dan menyentuh `route-wiring.js` tanpa mandat adalah cara
memasukkan cacat baru.

---

## 7. Yang harus KAMU kerjakan, urut, untuk menyalakan AI dengan aman

1. **Deploy `[vars]` yang sudah benar di repo** (menutup §2, tanpa mengubah satu baris pun):
   ```bash
   cd workers/api && npx wrangler deploy
   # verifikasi dari luar, harus 25 dan 12000:
   curl -s https://api.fiezel.my.id/api/config | grep -o '"limits":{[^}]*}'
   ```
2. **Deploy perbaikan gema rangka prompt (§6.1)** — ikut pada deploy yang sama, karena ia ada
   di `workers/api/ai/ai-tasks.js`. Tanpa ini, murid masih bisa membaca `---END DATA---`.
3. **Putuskan §6.2 sebelum menyalakan flag klien.** Dua pilihan, dan keduanya perlu kamu:
   - tegakkan `cfAiEnabled` di server (fail-closed) sehingga flag berarti sesuatu; atau
   - terima bahwa endpoint AI terbuka dan pasang batas biaya di sisi akun Cloudflare.
   Menyalakan flag klien tanpa memutuskan ini tidak menambah risiko baru (endpoint sudah
   terbuka), tapi ia menghapus satu-satunya alasan untuk menundanya.
4. **Jalankan pembukti live sesudah deploy** dan harapkan HIJAU penuh:
   ```bash
   FIEZEL_AI_LIVE_BASE=https://api.fiezel.my.id node tools/ai-live-verify.mjs --report
   ```
   Atau lewat CI: Actions → FIEZEL Quality Gate → Run workflow → isi `ai_live_base`.
   Biaya sekali jalan: 5 panggilan model, ±US$0.002, ±244 neuron. Batasi dengan
   `FIEZEL_AI_LIVE_TASKS=tutor_turn,translate_subtitle` kalau hanya mau memeriksa sebagian.
5. **Baru setelah itu** pertimbangkan menyalakan flag klien — dan sadari dari §5 bahwa hari ini
   hanya `context_coach` dan `session_recap` yang benar-benar memberi jawaban AI. Tiga task
   lain butuh perbaikan prompt/model dulu kalau tidak mau murid membaca "Mode hemat" sambil
   owner membayar token.
6. **Jangan** memakai jalan pintas apa pun yang menurunkan `FREE_AI_DAILY_LIMIT` atau
   `FREE_TTS_DAILY_CHARS` untuk "merapikan angka". `tests/config-consistency-test.js` akan merah, dan
   itu memang tujuannya.

---

## 8. Biaya yang SAYA keluarkan

Dua jalan live, 10 panggilan model sungguhan total (5 probe manual + 5 jalan alat):

- Model: 8× `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, 2× `@cf/ibm-granite/granite-4.0-h-micro`
- Perkiraan biaya: **±US$0.0036** (jalan alat sendiri: US$0.00179)
- Perkiraan neuron: **±488** dari 10.000/hari jatah AKUN (±4,9%)
- Kuota murid terpakai: 1 dan 2 permintaan `ai` pada DUA identitas anon uji, bukan identitas
  murid nyata

Keluaran yang ditolak kontrak mutu tetap dibayar — model sudah menghasilkan token sebelum
pemeriksa kami membuangnya. Alat ini memperkirakan bagian itu pada setengah plafon token task,
bukan nol, supaya laporan biayanya tidak lebih kecil dari tagihan yang benar-benar terjadi.

---

## 9. Gerbang

Semua exit 0 di cabang ini: `tests/ai-task-contract-test.js`, `tests/ai-response-shape-test.js`,
`tests/cf-api-contract-test.js`, `tests/cf-wiring-test.js`, `tests/quota-core-test.js`,
`tests/config-consistency-test.js`, `tests/no-network-test.js`, `tests/secret-scan-test.js`,
`tests/gate-registry-test.js`, `tests/coordination-guard-test.js`, `tests/regression-test.js`,
`tests/install-health-test.js`, plus `tests/workflow-actor-gate-test.js` yang ikut tersentuh.

Berkas yang berubah: `tools/ai-live-verify.mjs` (baru), `workers/api/ai/ai-tasks.js`,
`tests/ai-response-shape-test.js`, `tests/no-network-test.js`, `tests/workflow-actor-gate-test.js`,
`.github/workflows/quality.yml`. Tidak ada gerbang duplikat — dua gerbang AI yang ada
diperluas, bukan digandakan.
