# S2 — Plafon neuron tingkat AKUN dibuat WAJIB

Branch `work/s2cap`. Tidak dipush. Versi build tidak dibump. `app.js`, `style.css`,
`index.html`, `features/`, `coordination/`, `workers/owner/`, `workers/api/rate-anon.js`
tidak disentuh.

Bacaan awal: `reports/work-s1-auth-anon.md` (§ celah dep opsional) dan
`reports/work-p3-ai-enforced.md` (penulis `workers/api/ai/ai-account-budget.js`).

---

## 1. Peta pemanggil jalur AI — SEBELUM

Diambil dari `git grep` pada commit HEAD sebelum paket ini, bukan dari ingatan.

| Pemanggil model | Berkas:baris (HEAD) | Menyuntikkan `accountBudget`? | Akibat |
|---|---|---|---|
| `handleAiTask` lewat `aiDeps` | `workers/api/route-wiring.js:461` | YA | plafon aktif |
| pagar di dalam route AI | `workers/api/ai/route-ai.js:382` (`if (typeof deps.accountBudget === 'function')`) | opsional | dep hilang = LOLOS tanpa galat |
| panggilan binding AI | `workers/api/ai/route-ai.js:279` (`env.AI.run(...)`) | — | binding dipanggil langsung dari rute |
| `handleTtsRender` lewat `ttsDeps` | `workers/api/route-wiring.js` (deps TTS tanpa `accountBudget`) | **TIDAK** | TTS memanggil model TANPA plafon akun |
| panggilan binding TTS | `workers/api/tts/route-tts.js:193` (`env.AI.run(engineId, input, options)`) | — | jalur berbayar kedua, tanpa pagar |

Dua cacat berbeda, satu kelas:

1. **Celah yang dilaporkan S1**: pagar akun OPSIONAL per pemanggil. `route-ai.js:382`
   memasang pagar hanya kalau dep-nya ada. Pemanggil yang lupa dilayani penuh, tanpa
   satu pun log, galat, atau metrik.
2. **Instansi nyata dari celah itu, ditemukan paket ini**: `ttsDeps` memang lupa.
   Komentar P3 di `route-wiring.js` membenarkannya dengan alasan "TTS tidak memakai
   neuron Workers AI". Alasan itu salah — `route-tts.js:193` memanggil `env.AI.run`
   dengan model `@cf/myshell-ai/melotts`, yang ditagih sebagai neuron sama seperti LLM.
   Jadi celah S1 bukan hipotesis; ia sudah terjadi di produksi-siap-kirim, di jalur yang
   paling mudah dibanjiri (TTS tidak butuh prompt pintar, cukup teks panjang).

## 2. Peta pemanggil — SESUDAH

| Pemanggil model | Berkas:baris (sekarang) | Plafon |
|---|---|---|
| `aiDeps` | `workers/api/route-wiring.js:520` | `accountBudget` disuntikkan |
| `ttsDeps` | `workers/api/route-wiring.js:521` | `accountBudget` disuntikkan (ditambal) |
| pagar route AI | `workers/api/ai/route-ai.js:465` (`if (!budgetFn) return budgetDenied(... 'ai_budget_dep_missing' ...)`) | WAJIB, fail-closed |
| pagar route TTS | `workers/api/tts/route-tts.js:406` (`if (!accountBudget) return accountDenied(... 'ai_budget_dep_missing' ...)`) | WAJIB, fail-closed |
| **satu-satunya** panggilan binding | `workers/api/ai/model-call-gate.js:119` (`return env.AI.run(a.modelId, a.input, a.options || {})`) | menolak tanpa tanda terima reservasi (`model-call-gate.js:113`) |

`env.AI.run(` sekarang dieja di TEPAT SATU berkas di seluruh repo. Itu dipindai dari
sumber oleh gerbangnya (assert A1/A2), bukan diklaim di sini.

## 3. Rancangan yang dipilih, dan kenapa

Dua lapis, sengaja. Satu lapis saja bisa dilanggar oleh suntingan yang kelihatan wajar.

**Lapis 1 — chokepoint fisik (`workers/api/ai/model-call-gate.js`).**
Semua panggilan model lewat `runReservedModel({ env, modelId, input, options, reservation })`.
Fungsi itu memeriksa TANDA TERIMA reservasi (`assertReservation`) **sebelum** menyentuh
binding, dan melempar `model_call_unreserved` kalau tanda terimanya tidak ada, mereknya
salah, neuronnya < 1, atau tidak punya `release()`. Tanda terima hanya bisa diterbitkan
oleh `makeReservation()`, dan `makeReservation()` sendiri menolak dibuat tanpa `release()`
(`reservation_needs_release`) — jadi pelepasan pun tidak bisa jadi opsional.

Kenapa ini yang paling sulit dilanggar: rute baru yang mau memanggil model harus
mengimpor berkas ini, dan begitu ia mengimpornya ia TIDAK BISA jalan tanpa memesan
neuron dulu. "Lupa menyambung" berhenti menjadi keadaan senyap. Satu-satunya cara
melangkahinya adalah mengeja `env.AI.run` sendiri di rute baru — dan itu MERAH di assert
A1 (mutasi M4 membuktikannya).

**Lapis 2 — fail-closed di tingkat rute.**
Dep hilang, dep melempar, atau dep menjawab dengan objek permisif karangan yang bukan
tanda terima → 503, `error:'service_degraded'`, `quotaChecked:false`, `quotaCharged:false`.
Alasannya dipisah supaya tidak bisa dibaca salah: `ai_budget_dep_missing` (salah pasang),
`ai_budget_receipt_invalid` (dep palsu), `ai_budget_store_missing` / `ai_budget_unreadable`
(D1), `ai_account_cap` (jatah akun benar-benar penuh).

Kenapa BUKAN hanya "ambil dep dari satu tempat perakitan": itu memang menghapus
kemungkinan lupa di `route-wiring.js`, tapi rute bisa diuji, dipanggil, atau dipakai dari
tempat lain (uji, cron, worker lain) dengan `deps` kosong. Satu tempat perakitan
melindungi jalur yang lewat perakit; fail-closed melindungi jalur yang tidak. Kami ambil
dua-duanya.

## 4. Apa yang terjadi pada MURID kalau perakitannya salah

Jujur: **AI mati total untuk semua orang** sampai perakitannya benar. Itu konsekuensi
yang dipilih sadar — alternatifnya (fail-open) berarti satu salah pasang bisa
menghabiskan 8.000 neuron/hari dan mematikan AI untuk semua murid HINGGA BESOK, dengan
tagihan yang harus dibayar owner. Mati sekarang dan berisik lebih murah daripada mati
besok dan diam-diam.

Yang dijaga supaya murid tidak jadi korban dua kali:

- **Materi tetap jalan.** Penolakan tetap mengirim `text: fallbackText` dari jalur
  deterministik, `source:'deterministic-fallback'`, HTTP 503 dengan amplop yang sah —
  bukan 500 kosong.
- **Jatah murid tidak terpotong.** Pagar akun berjalan SEBELUM kuota murid, jadi
  penolakannya `quotaChecked:false` dan `quotaCharged:false`. Murid tidak kehilangan satu
  pun dari 25 permintaan hariannya karena server salah dipasang.
- **Pesannya jujur.** Salah pasang memakai `POLITE.ai_budget_missing` + `copyKey:'ai.disabled'`
  ("layanan AI sedang tidak tersambung"), BUKAN kalimat "jatah AI hari ini penuh".
  Kalimat "jatah penuh" (`copyKey:'ai.accountBudget'`) dipakai HANYA kalau plafon benar-benar
  tercapai. Mutasi M12 membuktikan assert-nya merah kalau kebohongan ini ditanam.
- **`retryAfter` tidak berbohong.** Plafon penuh → detik sampai tengah malam UTC.
  D1 tidak terbaca → 60 detik. Salah pasang → TIDAK ADA `retryAfter`, karena menunggu
  tidak akan memperbaikinya; yang memperbaikinya adalah deploy.
- **TTS masih bersuara.** Penolakan TTS mengembalikan amplop yang membiarkan klien jatuh
  ke `speechSynthesis` perangkat. Murid kehilangan suara premium, bukan pelajarannya.

## 5. Plafonnya MENGIKAT, bukan cuma tersambung

Yang diperiksa, dan hasilnya:

- **Atomik.** SQL reservasi: `UPDATE ai_account_day SET neurons = neurons + ?2, requests = requests + 1, touched_at = ?3 WHERE day = ?1 AND neurons + ?2 <= ?4 RETURNING neurons`
  (`workers/api/ai/ai-account-budget.js:63`). Syarat plafon ada DI DALAM `WHERE`, jadi dua
  permintaan bersamaan di ambang terakhir tidak bisa dua-duanya lolos: yang kedua tidak
  mendapat baris dan ditolak `ai_account_cap`. Dibuktikan dengan dua reservasi bersamaan
  di ambang (assert F1–F3), bukan dengan membaca SQL-nya saja.
- **Angkanya nyata.** `GLOBAL_NEURON_CAP = "8000"` benar-benar ada di
  `workers/api/wrangler.toml`; `QUOTA_CONFIG.ACCOUNT_DAILY_NEURON_BUDGET = 10000`.
  `accountCapNeurons()` memakai var kalau sah, MEMOTONG ke 10.000 kalau var salah tulis
  (mis. `80000`), dan jatuh ke 10.000 kalau var hilang. Ketiganya di-assert (E1–E5).
- **D1 galat = fail-closed.** Binding hilang → `ai_budget_store_missing`; D1 melempar
  (termasuk tabel `ai_account_day` belum ada) → `ai_budget_unreadable`. Keduanya
  `allowed:false`. Diuji dua arah: unit pada modulnya DAN end-to-end lewat jalur
  permintaan dengan D1 yang melempar (G1–G4) — 503, NOL panggilan model, jatah murid
  tidak ditagih.

**Yang harus DIPERBAIKI paket ini (bukan cuma diverifikasi):**

1. `accountBudget` tidak disuntikkan ke `ttsDeps` (lihat §1). Ditambal.
2. Tidak ada pelepasan reservasi. Kalau panggilan model gagal SEBELUM model bekerja
   (mis. binding hilang), neuronnya sudah terpesan dan tidak pernah kembali — 8.000 neuron
   bisa habis oleh permintaan yang tidak menghasilkan apa pun. Ditambahkan
   `releaseAccountNeurons()` + `ACCOUNT_SQL.release` dengan `MAX(0, ...)` supaya pelepasan
   ganda tidak bisa membuat penghitung negatif. **TIMEOUT TIDAK dilepas** — model sudah
   bekerja, biayanya nyata, dan mengembalikannya berarti penghitung yang berbohong ke
   arah yang merugikan owner (`releasableFailure()`).
3. Izin tanpa tanda terima diterima diam-diam. Sekarang `ModelCallGate.isReservation()`
   diwajibkan di kedua rute (`ai_budget_receipt_invalid`).

## 6. Gerbangnya: `ai-account-cap-gate-test.js`

Terdaftar di `.github/workflows/quality.yml` (tepat sesudah `rate-anon-test.js`, karena
keduanya menjaga dua sisi ancaman yang sama). Laporan mesin: `AI-ACCOUNT-CAP-GATE.json`,
skema `fiezel-ai-account-cap-gate-v1`. 53 assert, exit 0.

**Bagian yang paling penting: penemuannya PROGRAMATIK.** Daftar rute yang diketik tangan
akan basi begitu rute baru lahir — dan itu persis cara celah TTS ini muncul. Jadi
gerbangnya:

1. memindai sumber `workers/api/**` dan menuntut `env.AI.run(` hanya ada di
   `ai/model-call-gate.js`;
2. membangun graf impor dari sumber, menandai setiap modul yang bisa mencapai chokepoint
   itu (langsung atau transitif) sebagai **model-capable**;
3. mengambil setiap `function register*Routes(` dari modul model-capable, MENJALANKANNYA
   ke router pengumpul, dan mendaftar rute yang benar-benar terdaftar;
4. menuntut setiap rute hasil temuan punya fixture di gerbang ini — rute model baru tanpa
   fixture = MERAH (mutasi M15);
5. untuk setiap fixture: menjalankan permintaan sungguhan pada worker terpasang dan
   menuntut SQL reservasi tercatat di `_log` D1 **sebelum** panggilan model pertama, dan
   penghitung `ai_account_day` benar-benar bergerak.

Assert lain: refusal chokepoint (B), dep-less = 503 + `quotaCharged:false` + nol panggilan
model + pesan jujur (D), angka plafon nyata (E), atomik (F), D1 fail-closed (G), pelepasan
saat gagal dan TIDAK saat timeout (H), pendaftaran CI (I).

Satu perbaikan di gerbang lama: `rate-anon-test.js` (g6) dulu meng-assert bahwa literal
`typeof deps.accountBudget === 'function'` **tetap ada** — cara sah S1 mendokumentasikan
celah tanpa menyentuh berkas paket lain. Tapi begitu celahnya ditambal, assert itu
berubah fungsi jadi PENJAGA CELAH: merah pada perbaikan, hijau pada kerusakan. Arahnya
dibalik: sekarang ia menuntut penolakan `ai_budget_dep_missing` dan `quotaCharged:false`.
`workers/api/rate-anon.js` sendiri tidak disentuh.

## 7. Matriks merah (`tools/account-cap-red-matrix.mjs`)

Baseline HIJAU → mutasi → gerbang dijalankan → berkas dipulihkan → akhir HIJAU.
Laporan mesin: `AI-ACCOUNT-CAP-RED-MATRIX.json`. **15 mutasi, 15 MERAH, 0 hijau.**

| # | Mutasi | Hasil | Assert yang jatuh (contoh) |
|---|---|---|---|
| M1 | `aiDeps` kehilangan `accountBudget` | MERAH | C5/C6/C7 [ai/task], H1–H3 |
| M2 | `ttsDeps` kehilangan `accountBudget` (cacat ASLI P3) | MERAH | C5/C6/C7 [tts/render] |
| M3 | dep dibuat opsional lagi (bentuk celah S1) | MERAH | D1 |
| M4 | `route-tts` memanggil `env.AI.run` langsung | MERAH | A1, A2 |
| M5 | `assertReservation` dilemahkan jadi no-op | MERAH | B1, B2, B3 |
| M6 | tanda terima diterbitkan tanpa memesan apa pun | MERAH | C6, C7 (dua rute), G3, G4, H1, H3 |
| M7 | syarat plafon dikeluarkan dari `WHERE` | MERAH | E6, F1, F2, F3, C6 |
| M8 | D1 hilang = fail-OPEN | MERAH | G1 |
| M9 | D1 galat = fail-OPEN | MERAH | G2, G3, G4 |
| M10 | reservasi tidak dilepas saat panggilan model gagal | MERAH | H1, H2 |
| M11 | timeout ikut dilepas (penghitung berbohong) | MERAH | H3 |
| M12 | salah pasang memakai kalimat "jatah penuh" | MERAH | D4 |
| M13 | penolakan plafon menagih kuota murid | MERAH | D2, G4 |
| M14 | plafon dijadikan `MAX_SAFE_INTEGER` | MERAH | E1, E2, F1, F2, F3 |
| M15 | rute model BARU lahir tanpa fixture | MERAH | C4 |

Dua mutasi pertama yang ditulis (M5, M14) awalnya GALAT karena polanya tidak cocok dengan
sumber. Itu bukan lubang gerbang, tapi tetap dicatat: matriks yang polanya basi akan
melaporkan "tidak bisa dimutasi" dan itu harus dibaca sebagai gagal, bukan lewat —
karena itu runner-nya melempar, bukan menelan.

## 8. Verifikasi

Semua exit 0:

`ai-account-cap-gate-test.js`, `tools/account-cap-red-matrix.mjs`,
`ai-task-contract-test.js`, `ai-response-shape-test.js`, `cf-wiring-test.js`,
`cf-api-contract-test.js`, `quota-core-test.js`, `d1-schema-contract-test.js`,
`rate-anon-test.js`, `no-network-test.js`, `secret-scan-test.js`,
`gate-registry-test.js`, `coordination-guard-test.js`, `regression-test.js`,
`install-health-test.js`.

## 9. Apa yang MASIH TIDAK tertutup

Ini bagian yang perlu keputusan owner, bukan bagian yang perlu terdengar selesai.

1. **Serangan dari banyak IP tetap bisa MENGHABISKAN plafon.** Plafon akun mencegah
   TAGIHAN membengkak; ia TIDAK mencegah penyerang membakar 8.000 neuron pagi-pagi dan
   membuat AI mati untuk murid sungguhan sampai tengah malam UTC. Batas per-IP 15/jam
   tidak menyentuh serangan tersebar. Yang benar-benar menutup ini ada di luar Worker:
   - **Cloudflare WAF rate rule** pada `/api/ai/*` dan `/api/tts/*` dengan karakteristik
     per-ASN atau per-JA4, bukan per-IP;
   - **Turnstile** pada `POST /api/auth/anon`, supaya menerbitkan identitas punya biaya.
   Keduanya dashboard/konfigurasi, bukan kode. Belum dipasang.
2. **Botnet residensial yang meniru laju murid** tidak bisa dibedakan dari murid oleh
   sinyal mana pun yang kita punya sekarang. Ini butuh identitas berbiaya (login, atau
   Turnstile di atas), bukan pembatas laju yang lebih ketat.
3. **Presisi lintas-isolate saat D1 sedang mati** tidak ada. Fail-closed berarti aman
   secara biaya, tapi juga berarti D1 down = AI mati. Tidak ada cache plafon lintas
   isolate, dan menambahkannya berarti memilih antara akurasi dan ketersediaan — keputusan
   owner, bukan keputusan paket ini.
4. **Over-counting sengaja tidak dikoreksi.** Timeout dan keluaran kosong TIDAK dilepas,
   dan reservasi memakai biaya model utama task, bukan model yang akhirnya dipakai. Jadi
   penghitung condong ke atas. Itu pilihan: memesan kelebihan aman untuk dompet, memesan
   kekurangan tidak.
5. **Nol bukti produksi.** Flag AI masih mati dan tidak ada yang dideploy dari branch ini.
   Semua di atas adalah bukti dari gerbang dan harness palsu, BUKAN dari lalu lintas
   sungguhan. Yang harus dilihat pertama setelah flag dinyalakan: apakah
   `ai_account_day.neurons` benar-benar bergerak, dan apakah rasio penolakan
   `ai_account_cap` masuk akal.

## Sumber

- Kontrak neuron & harga model Workers AI: <https://developers.cloudflare.com/workers-ai/platform/pricing/>
- Pola `UPDATE ... WHERE ... RETURNING` sebagai penambahan terjaga di D1:
  <https://developers.cloudflare.com/d1/sql-api/sql-statements/>
- Rate limiting rules & karakteristik (ASN/JA4) untuk butir §9.1:
  <https://developers.cloudflare.com/waf/rate-limiting-rules/>
- Turnstile untuk membebani penerbitan identitas: <https://developers.cloudflare.com/turnstile/>
