# Braincore Autonomy — Kontrak Antar-Agent (WAJIB DIIKUTI SEMUA AGENT)

**Basis:** FIEZEL 5.19.0 · bundle Brain `3.1.0` · build `m025-214`
**Peta jalan:** [BRAINCORE-AUTONOMY-ROADMAP.md](BRAINCORE-AUTONOMY-ROADMAP.md) — enam langkah dari
otak adaptif ke otak otonom (L5).
**Pola dokumen ini:** sama dengan [BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md), yang sudah
terbukti memandu 14 agent paralel tanpa bentrok pada gelombang v3.

Satu kalimat yang menjelaskan seluruh isi dokumen: **agent membangun MODUL MURNI, bukan
wiring.** Semua penyambungan ke `app.js` / `index.html` / `sw.js` dikerjakan SATU agent
integrator di gelombang terakhir. Itulah yang membuat lima agent bisa jalan bersamaan tanpa
saling menimpa — karena satu-satunya berkas yang semua orang ingin sentuh hanya dipegang satu
tangan.

---

## 0. Status hari ini (jangan diasumsikan, ini sudah diverifikasi)

Langkah 1 **SUDAH SELESAI** dan mendarat bersama dokumen ini:

- Peta otoritas dijujurkan: `stepTutor` dan `productionGrader` → `active` (keduanya memang
  sudah menyentuh murid), `retentionProbe` dan `learningMetrics` → `shadow` (mengukur, tidak
  memutuskan). Bundle `3.0.0` → `3.1.0`.
- `features/brain/fiezel-retention-probe.js` dimuat `index.html` + precache `sw.js`, dan
  benar-benar dipanggil: `retentionProbeSync()` saat mastery BKT tembus, dievaluasi dari
  jawaban NYATA sesudah jatuh tempo.
- `learningMetricsSnapshot()` menghitung lima metrik longitudinal dari riwayat lokal;
  `learningMetricsMarkup()` merendernya di panel diagnostik.
- **Dua gerbang anti-drift baru.** `brain-page-wiring-test.js` W8: modul berotoritas `off`
  yang punya pemanggil di `app.js` = FAIL. `brain-manifest-test.js`: otoritas sekarang
  DITURUNKAN dari pembacaan `app.js`, bukan dihafal sebagai literal — dua arah sekaligus
  (`off` wajib nol pemanggil, `active` wajib punya pemanggil).

**Konsekuensi untuk semua agent:** kalau modulmu belum disambungkan integrator, otoritasnya
di manifest WAJIB `off`, dan itu bukan aib — itu yang membuat petanya jujur. Jangan menaikkan
otoritas modulmu sendiri; W8 akan menangkapmu, dan memang untuk itu ia ada.

Yang masih `off` dan menunggu langkah di bawah: `brainConfig` (Langkah 4), `metricsDigest`
(keputusan produk telemetri, di luar lingkup enam langkah), `statGate` (`off` di perangkat,
tetapi berwenang di `content-promotion.js` — Langkah 2 yang memindahkannya ke otak).

---

## 1. Aturan keras (berlaku untuk SEMUA agent, tanpa kecuali)

1. **MODUL MURNI.** Tanpa DOM, tanpa jaringan, tanpa `localStorage`, tanpa `Math.random` tak
   berseed, tanpa jam internal. Waktu SELALU argumen `nowMs`. Tidak ada fallback `Date.now()`
   — Sol membuktikan v2 melanggar kontraknya sendiri di tiga fungsi, dan v3 menghapusnya.
2. **Pola UMD** identik `features/brain/fiezel-core-brain.js`:
   `(function(root,factory){var api=factory(); if(typeof module==='object'&&module.exports)module.exports=api; if(root)root.<Global>=api;})(typeof globalThis!=='undefined'?globalThis:this, function(){ 'use strict'; ... })`
3. **Komentar berbahasa Indonesia**, menjelaskan **KENAPA**, bukan apa. Gaya file brain yang
   ada: sebutkan defek/temuan yang ditutup, dan sertakan angka yang bisa dibantah.
4. Setiap keluaran keputusan membawa `rationale` (prefix `brain4_`) dan `confidence` bila relevan.
5. **Satu file test Node mandiri per modul** di root repo. Pola `core-brain-v2-test.js`:
   `require` modul, `assert`, `console.log('ok - ...')`, exit non-zero saat gagal, baris akhir
   `<Nama>: PASS`. **Wajib punya blok BUKTI-BISA-MERAH** — racuni input dan buktikan detektormu
   merah; gerbang yang tidak pernah bisa merah bukan gerbang.
6. **JANGAN sentuh berkas di luar kepemilikanmu.** JANGAN `git commit`/`push`/`merge`. JANGAN
   menaikkan `SW_REV`/`DIAG_BUILD`/`FIEZEL_PAGE_BUILD` (milik integrator; kalau tiga agent
   menaikkannya bersamaan, ritualnya justru pecah).
7. **`fail-safe ke diam.`** Di bawah ambang bukti, modulmu WAJIB mengembalikan keputusan
   "tidak memutuskan" (`hold` / `null` / `insufficient:true`), bukan menebak. Memaksa keputusan
   biner dari data bisu adalah cacat yang sudah terbukti Monte Carlo 200.000 trial di repo ini.
8. **Sebelum menyerahkan**, jalankan test milikmu DAN:
   `node core-brain-v2-test.js && node tutor-brain-v3-test.js && node brain-manifest-test.js && node brain-page-wiring-test.js && node regression-test.js`
   Semua harus PASS. Kalau perubahanmu memecahkan gate lama, **perbaiki pendekatanmu, bukan
   gate-nya** — kecuali gate itu memaku klaim yang terbukti salah, dan itu wajib kamu
   dokumentasikan di komentar test (contoh presedennya ada di `brain-manifest-test.js`).
9. **Nol biaya runtime.** Tanpa API cloud, tanpa model neural di jalur keputusan, tanpa
   dependensi npm baru.
10. **Privasi.** Tidak ada audio/transkrip mentah, tidak ada ID yang bisa menyambungkan hari-1
    ke hari-2, tidak ada teks bebas yang bisa naik ke server. Baca `BRAIN-DATA-PRIVACY.md`
    sebelum menulis apa pun yang berbentuk laporan.

---

## 2. Kepemilikan berkas (EKSKLUSIF — sumber anti-bentrok)

| Agent | Langkah | Berkas yang DIMILIKI (hanya ini yang boleh diedit) |
|---|---|---|
| **selesai** | 1 | `app.js`, `index.html`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `features/brain/fiezel-brain-manifest.js`, `brain-page-wiring-test.js`, `brain-manifest-test.js` |
| **A-STAT** | 2 | `features/brain/fiezel-policy-verdict.js`, `policy-verdict-test.js` |
| **A-NOF1** | 3 | `features/brain/fiezel-nof1.js`, `nof1-test.js` |
| **A-CFG** | 4 | `features/brain/fiezel-brain-config.js`, `brain-config-test.js`, `features/brain/fiezel-param-ledger.js`, `param-ledger-test.js` |
| **A-TUNE** | 5 | `features/brain/fiezel-self-tune.js`, `self-tune-test.js` |
| **A-GOV** | 6 | `fiezel-core-worker.js`, `core-worker-contract-test.js`, `tools/run-content-gates.js`, `content-gate-runner-test.js`, `BRAINCORE-AUTONOMY-GOVERNANCE.md` |
| **A-WIRE** | integrasi | `app.js`, `index.html`, `sw.js`, `core-config.js`, `features/neural-voice/fiezel-diag-panel.js`, `features/brain/fiezel-brain-manifest.js`, `brain-page-wiring-test.js`, `.github/workflows/quality.yml` |

**Berkas yang TIDAK BOLEH disentuh siapa pun di gelombang ini:** semua modul brain v3 yang
sudah aktif (`fiezel-core-brain.js`, `fiezel-tutor-brain.js`, `fiezel-mastery-bkt.js`,
`fiezel-misconception-ledger.js`, `fiezel-item-prior.js`, `fiezel-evidence-credibility.js`,
`fiezel-affect.js`, `fiezel-item-calibration.js`, `fiezel-srl-coach.js`), seluruh konten
kanonik (`grammar-templates.json`, `vocabulary-master.json`, `reading-bank.json`), dan
`fiezel-sl-v1-state`.

**Aturan gelombang.** A-STAT, A-NOF1, A-CFG, A-GOV boleh jalan BERSAMAAN (kepemilikan
terpisah, nol dependensi kode antar mereka). A-TUNE menunggu A-STAT + A-CFG selesai karena ia
MEMANGGIL keduanya. A-WIRE menunggu semuanya.

---

## 3. API antar-agent (tanda tangan FINAL — jangan diubah sepihak)

Ini kontrak yang mengikat: A-TUNE menulis kodenya berdasarkan tanda tangan di bawah sebelum
modul yang dipanggilnya selesai. Mengubahnya sepihak = memecahkan agent lain.

```
FiezelPolicyVerdict.verdict({control, candidate, margin, seed}, nowMs)
  control/candidate : {n, ok}  — hitungan attempt dan benar per lengan
  margin            : batas non-inferioritas dalam proporsi (default 0.05)
  -> {decision:'promote'|'reject'|'hold', diff, ci:{lo,hi}, n, rationale:'brain4_verdict_*', confidence}
  WAJIB: 'hold' saat bukti tidak cukup; keputusan dari INTERVAL (Wilson/Newcombe), bukan titik.

FiezelNof1.assign(itemId, experimentId)          -> 'control'|'candidate'   (FNV-1a, deterministik, tanpa state)
FiezelNof1.tally(history, experiment, nowMs)     -> {control:{n,ok}, candidate:{n,ok}, spanDays, rationale}
  experiment: {id, startedAt, arms:['control','candidate'], minPerArm}
  WAJIB: assignment murni fungsi (itemId, experimentId) — tanpa jam, tanpa acak, tanpa state.

FiezelBrainConfig.resolve(overrides, nowMs)      -> konfigurasi efektif (beku) + {applied[], rejected[], clamped[]}
FiezelBrainConfig.DEFAULTS / BOUNDS / sanitize   -> TETAP seperti sekarang, jangan diubah semantiknya

FiezelParamLedger.genesis(nowMs)                                  -> entri akar
FiezelParamLedger.append(chain, entry, nowMs)                     -> chain' (hash-chained)
FiezelParamLedger.verify(chain)                                   -> {ok, brokenAt, length}
FiezelParamLedger.rollbackTo(chain, seq, nowMs)                   -> {chain', restored}
  entry.event ∈ 'param_proposed'|'param_applied'|'param_rolled_back'|'experiment_started'|'experiment_ended'|'halt'

FiezelSelfTune.propose(state, {metrics, verdict, config}, nowMs)
  -> {change:{path, from, to}|null, decision:'apply'|'hold'|'rollback', rationale:'brain4_tune_*', confidence}
  WAJIB: `to` selalu di dalam BOUNDS; maksimum SATU parameter per proposal; 'hold' adalah
  keluaran normal, bukan kegagalan.
```

---

## 4. Prompt siap-pakai per agent

Salin satu blok utuh ke satu agent. Setiap blok sudah memuat batas kepemilikannya sendiri.

---

### A-STAT — Langkah 2: ganti vibes dengan interval

```
Kamu agent A-STAT di repo FIEZEL-APPS/FIEZEL-APPS (FIEZEL 5.19.0, PWA offline, zero runtime cost).
WAJIB baca dulu: BRAINCORE-AUTONOMY-CONTRACTS.md (§1 aturan keras, §3 API final) dan
BRAINCORE-AUTONOMY-ROADMAP.md (Langkah 2).

KEPEMILIKAN EKSKLUSIF (hanya dua berkas ini yang boleh kamu buat/edit):
  features/brain/fiezel-policy-verdict.js
  policy-verdict-test.js
JANGAN sentuh app.js, index.html, sw.js, manifest, atau modul brain lain. JANGAN commit/push.

MASALAH YANG KAMU TUTUP (sudah diverifikasi, bukan dugaan):
app.js menilai kebijakannya sendiri lewat evaluatePolicyOutcome(): skor komposit bobot-tangan
(0,30*completionRate + 0,35*accuracy + 0,15*targetAdherence + 0,10*calibration + 0,10*improvement)
lalu ambang if/else (score<45 -> 'negative', score>=72 && completionRate>=80 -> 'positive').
Bobot itu tidak pernah divalidasi dan ambangnya tidak membawa interval. Ini kelas cacat yang
SAMA dengan gerbang promosi 8-attempt yang dibuktikan council lempar-koin lewat 200.000 trial
Monte Carlo (kandidat identik promote 53,9%; kandidat 15pp lebih buruk lolos 27,5%) — akarnya:
lebar-setengah CI proporsi pada n=8 adalah +-30pp.

YANG KAMU BANGUN:
Modul murni FiezelPolicyVerdict dengan API PERSIS seperti §3 kontrak. Wajib:
 1. Keputusan dari INTERVAL, bukan titik: promosi = batas BAWAH CI selisih melewati -margin
    (kerangka non-inferioritas); penolakan = batas ATAS CI di bawah nol.
 2. Wilson score per lengan + CI selisih hibrid Newcombe (metode 10) — Wald runtuh pada n kecil.
 3. 'hold' saat bukti bisu, TANPA batas waktu, dan didokumentasikan sebagai hasil SAH.
 4. Deterministik: kalau kamu pakai bootstrap, PRNG mulberry32 berseed; dua run seed sama
    wajib byte-identik.
 5. Laporkan MDE/kebutuhan sampel supaya pemanggil tahu harga sebenarnya dari klaimnya.
PENTING: features/brain/fiezel-stat-gate.js SUDAH mengimplementasikan Wilson/Newcombe/
non-inferioritas dan sudah dipakai content-promotion.js. BACA dan PAKAI ULANG modul itu
(require/global), jangan tulis ulang matematikanya. Modulmu adalah ADAPTER tipis dari dunia
policy-outcome ke stat-gate, plus penerjemah hasil ke bentuk yang app.js bisa pakai nanti.

TEST WAJIB (policy-verdict-test.js):
 - oracle manual untuk Wilson/Newcombe pada beberapa (n, ok) yang dihitung tangan;
 - data 8-attempt per lengan menghasilkan 'hold', BUKAN keputusan (ini gerbang anti-kambuh);
 - kandidat identik dengan kontrol tidak pernah 'promote' pada n kecil;
 - determinisme byte-identik untuk seed sama;
 - ketahanan input korup (null, NaN, string yang kelihatan angka, n<0, ok>n);
 - blok BUKTI-BISA-MERAH: racuni ambang/CI dan buktikan detektormu merah.

SELESAI KALAU: node policy-verdict-test.js PASS, dan
node core-brain-v2-test.js && node tutor-brain-v3-test.js && node brain-manifest-test.js &&
node brain-page-wiring-test.js && node regression-test.js semuanya PASS.
Lapor: tanda tangan final modulmu + angka MDE yang kamu hitung + apa yang TIDAK kamu kerjakan.
```

---

### A-NOF1 — Langkah 3: eksperimen di dalam satu murid

```
Kamu agent A-NOF1 di repo FIEZEL-APPS/FIEZEL-APPS (FIEZEL 5.19.0, PWA offline, zero runtime cost).
WAJIB baca dulu: BRAINCORE-AUTONOMY-CONTRACTS.md (§1, §3) dan BRAIN-EVOLUTION-DECISIONS.md §1.

KEPEMILIKAN EKSKLUSIF:
  features/brain/fiezel-nof1.js
  nof1-test.js
JANGAN sentuh berkas lain. JANGAN commit/push.

KENAPA BENTUK INI, BUKAN A/B BIASA (sudah diputus, jangan dibuka ulang):
A/B antar-murid DIBATALKAN dengan matematika dan keputusannya tertulis. Mendeteksi d=0,2 pada
alpha 0,05/power 0,80 butuh ~392 murid per lengan; efek ed-tech rata-rata 0,125 SD butuh 1.000+
per lengan; kapasitas aplikasi di-hard-cap 250 (MAX_USERS di fiezel-core-worker.js:5 dan
workers/api/wrangler.toml). Menambah SOAL per murid tidak menolong: attempt ter-cluster dalam
murid, attempt efektif ber-asimtot di ~1/ICC. Yang sah pada N=1 adalah evaluasi interleaved
within-subject dengan assignment deterministik per item — itulah yang kamu bangun.

YANG KAMU BANGUN:
Modul murni FiezelNof1 dengan API PERSIS seperti §3 kontrak. Wajib:
 1. assign(itemId, experimentId) = fungsi MURNI dari dua string via FNV-1a. Tanpa jam, tanpa
    acak, tanpa state. Murid yang sama, item yang sama, eksperimen yang sama -> selalu lengan
    yang sama, termasuk setelah reinstall. Ini yang membuat hasilnya bisa diaudit ulang.
 2. Keseimbangan lengan wajib diuji: pada 10.000 itemId sintetis, selisih proporsi lengan
    < 2pp. Hash yang berat sebelah membuat seluruh eksperimen bohong.
 3. tally(history, experiment, nowMs) menghitung {n, ok} per lengan HANYA dari baris riwayat
    yang jatuh setelah experiment.startedAt, dan hanya item yang benar-benar ter-assign.
 4. Interleaving: dua lengan berselang-seling di aliran item yang sama, BUKAN blok terpisah —
    blok memasukkan tren waktu (kelelahan, waktu belajar) ke dalam selisih lengan.
 5. Modul TIDAK memutuskan promote/reject. Itu milik FiezelPolicyVerdict (A-STAT). Kamu hanya
    membagi lengan dan menghitung; batas ini keras.

TEST WAJIB (nof1-test.js):
 - determinisme: assign() sama untuk masukan sama, lintas run;
 - keseimbangan lengan pada 10.000 id (< 2pp);
 - sensitivitas experimentId: eksperimen berbeda menghasilkan partisi yang berbeda;
 - tally menolak baris sebelum startedAt dan baris tanpa assignment;
 - ketahanan input korup;
 - blok BUKTI-BISA-MERAH: ganti hash dengan yang berat sebelah, buktikan uji keseimbangan merah.

SELESAI KALAU: node nof1-test.js PASS + lima gate wajib di §1 butir 8 PASS.
Lapor: tanda tangan final + hasil uji keseimbangan (angka aslinya) + apa yang TIDAK kamu kerjakan.
```

---

### A-CFG — Langkah 4: parameter jadi permukaan yang bisa dikendalikan

```
Kamu agent A-CFG di repo FIEZEL-APPS/FIEZEL-APPS (FIEZEL 5.19.0, PWA offline, zero runtime cost).
WAJIB baca dulu: BRAINCORE-AUTONOMY-CONTRACTS.md (§1, §3) dan seluruh komentar kepala
features/brain/fiezel-brain-config.js.

KEPEMILIKAN EKSKLUSIF:
  features/brain/fiezel-brain-config.js   (edit)
  brain-config-test.js                    (edit)
  features/brain/fiezel-param-ledger.js   (baru)
  param-ledger-test.js                    (baru)
JANGAN sentuh app.js, manifest, atau modul brain lain — TERMASUK modul sumber konstanta
(fiezel-mastery-bkt.js, fiezel-core-brain.js, fiezel-misconception-ledger.js). Membuat modul
itu MEMBACA registry adalah pekerjaan integrator A-WIRE, bukan kamu. JANGAN commit/push.

MASALAH YANG KAMU TUTUP:
fiezel-brain-config.js menyatakan sendiri di kepala berkasnya bahwa ia "TIDAK dibaca oleh modul
brain lain saat runtime" — ia salinan baca-saja untuk manusia. Selama itu benar, parameter otak
hanya bisa berubah lewat commit, dan penyetelan-diri (Langkah 5) mustahil. Kamu menyiapkan
permukaannya: resolve() yang aman, plus ledger yang membuat tiap perubahan bisa diaudit dan
dikembalikan.

YANG KAMU BANGUN:
1. FiezelBrainConfig.resolve(overrides, nowMs) sesuai §3. Wajib:
   - sanitize() dan BOUNDS yang sudah ada TETAP jadi satu-satunya penjaga: masukan tak
     tepercaya (string yang kelihatan angka, NaN, Infinity, fungsi, field asing) DITOLAK
     dengan alasan eksplisit; nilai valid di luar batas DIJEPIT, dan kejadiannya DILAPORKAN
     di `clamped[]` — penjepitan diam-diam adalah kebohongan yang rapi;
   - `schema` dan `brainVersion` tetap TIDAK bisa di-override;
   - keluaran beku (deep-frozen), masukan tidak pernah dimutasi;
   - KONTRAK SINKRONISASI yang sudah ditegakkan brain-config-test.js (default identik dengan
     konstanta modul sumber) WAJIB tetap hidup — perluas, jangan lemahkan.
2. FiezelParamLedger sesuai §3: rantai hash on-device untuk perubahan parameter.
   - Pola sudah ada di fiezel-evolution-ledger.js (genesis, append, verifyChain, prune
     re-chain). BACA dan tiru disiplinnya; ini versi ringkas untuk parameter, bukan konten.
   - Hash WAJIB deterministik dan murni (tanpa WebCrypto async; implementasi hash sinkron di
     dalam modul, atau fungsi hash diterima sebagai argumen).
   - verify() harus mendeteksi entri yang diubah DI TENGAH rantai, bukan hanya di ujung.
   - rollbackTo(chain, seq) mengembalikan konfigurasi ke titik itu DAN mencatat rollback-nya
     sebagai entri baru — sejarah tidak boleh dihapus untuk menyembunyikan kesalahan.

TEST WAJIB:
 - brain-config-test.js: sinkronisasi default vs konstanta sumber tetap ditegakkan; resolve()
   menolak setiap kelas masukan korup dengan alasan; clamped[] benar-benar terisi saat dijepit.
 - param-ledger-test.js: rantai utuh terverifikasi; tamper di tengah TERDETEKSI; rollback
   memulihkan nilai dan tercatat; determinisme hash; blok BUKTI-BISA-MERAH untuk keduanya.

SELESAI KALAU: node brain-config-test.js && node param-ledger-test.js PASS + lima gate wajib PASS.
Lapor: tanda tangan final + daftar parameter yang menurutmu AMAN disetel otomatis dan yang
TIDAK, dengan alasan per butir.
```

---

### A-TUNE — Langkah 5: penyetelan-diri berbatas (JALAN SETELAH A-STAT + A-CFG)

```
Kamu agent A-TUNE di repo FIEZEL-APPS/FIEZEL-APPS (FIEZEL 5.19.0, PWA offline, zero runtime cost).
WAJIB baca dulu: BRAINCORE-AUTONOMY-CONTRACTS.md (§1 aturan keras, §3 API final — kamu
MEMANGGIL FiezelPolicyVerdict, FiezelNof1, FiezelBrainConfig, FiezelParamLedger) dan
BRAINCORE-AUTONOMY-ROADMAP.md (Langkah 5).

KEPEMILIKAN EKSKLUSIF:
  features/brain/fiezel-self-tune.js
  self-tune-test.js
JANGAN edit modul yang kamu panggil — kalau tanda tangannya kurang, LAPOR, jangan tambal
sendiri. JANGAN sentuh app.js/manifest. JANGAN commit/push.

INI TITIK DI MANA KATA "OTONOM" MULAI JUJUR DIPAKAI, dan karena itu justru di sinilah pagar
harus paling rapat. Modulmu mengusulkan perubahan parameter otak berdasarkan hasil yang
terukur, dan mengembalikannya sendiri saat memburuk.

YANG KAMU BANGUN — FiezelSelfTune sesuai §3. Pagar yang WAJIB ada, semuanya bisa diuji:
 1. `to` SELALU di dalam BOUNDS FiezelBrainConfig. Bukan dijepit belakangan — usulan di luar
    batas tidak pernah lahir.
 2. MAKSIMUM SATU parameter per proposal, dan maksimum satu perubahan aktif per N sesi
    (N argumen, default konservatif). Dua perubahan bersamaan membuat atribusi mustahil:
    kamu tidak akan pernah tahu yang mana yang bekerja.
 3. Perubahan hanya lahir kalau FiezelPolicyVerdict memberi 'promote'. 'hold' -> tidak
    berbuat apa-apa, dan itu keluaran NORMAL, bukan kegagalan.
 4. ROLLBACK OTOMATIS pada regresi, dengan ambang yang ditulis eksplisit, dan rollback itu
    TERCATAT di FiezelParamLedger.
 5. KILL SWITCH: satu bendera halt mematikan seluruh jalur usul (pola sudah ada di
    fiezel-autonomy-config.js — tiru semantiknya: halt menang atas segalanya).
 6. FAIL-CLOSED: konfigurasi absen/korup, metrik absen, verdict absen -> tidak mengusulkan
    apa pun. Diam adalah default yang aman; menebak tidak pernah.
 7. Modulmu MURNI: ia mengembalikan usulan, ia tidak menulis apa pun ke mana pun.

TEST WAJIB (self-tune-test.js):
 - usulan tidak pernah keluar BOUNDS, termasuk saat metrik ekstrem/korup;
 - verdict 'hold'/'reject' -> tidak ada perubahan;
 - dua perubahan dalam jendela N sesi -> yang kedua ditolak dengan alasan;
 - regresi memicu rollback dan entri ledger;
 - halt mematikan semua jalur;
 - fail-closed pada setiap dependensi yang absen (uji satu per satu);
 - determinisme;
 - blok BUKTI-BISA-MERAH untuk setiap pagar di atas — pagar yang tidak terbukti bisa merah
   bukan pagar, cuma komentar.

SELESAI KALAU: node self-tune-test.js PASS + lima gate wajib PASS.
Lapor: tanda tangan final + daftar pagar dengan test yang membuktikan tiap pagar bisa merah +
satu paragraf jujur tentang apa yang MASIH bisa salah setelah semua pagar ini.
```

---

### A-GOV — Langkah 6: perpanjangan-diri konten + keputusan otoritas

```
Kamu agent A-GOV di repo FIEZEL-APPS/FIEZEL-APPS (FIEZEL 5.19.0, PWA offline).
WAJIB baca dulu: BRAINCORE-AUTONOMY-CONTRACTS.md (§1), MASTER-ONLY-GOVERNANCE.md (seluruhnya),
fiezel-autonomy-config.js, fiezel-self-refine.js, fiezel-evolution-loop.js, content-patch-gate.js,
content-promotion.js, content-canary.js, content-adoption-receipt.js.

KEPEMILIKAN EKSKLUSIF:
  fiezel-core-worker.js, core-worker-contract-test.js
  tools/run-content-gates.js, content-gate-runner-test.js   (baru)
  BRAINCORE-AUTONOMY-GOVERNANCE.md                          (baru)
JANGAN sentuh app.js/index.html/sw.js/manifest/modul brain. JANGAN sentuh konten kanonik
(grammar-templates.json, vocabulary-master.json, reading-bank.json) — canonical immutable saat
runtime adalah invarian yang sudah tercatat, bukan preferensi. JANGAN commit/push.

KEADAAN YANG KAMU HADAPI (verifikasi sendiri, jangan percaya ringkasan ini begitu saja):
Seluruh lapisan evolusi konten 5.18.0 sudah ada dan lulus test — meta-learning, prompt library,
evolution ledger hash-chain, autonomy config (advisory/canary/full + halt), self-refine, evolution
loop, plus tiga endpoint owner-only di worker. Lingkarnya terputus di dua tempat:
 (a) jalur produksi mengembalikan authority:'candidate-only' dengan
     gateStatus:'UNVERIFIED_LOCAL_GATES_REQUIRED' — gerbang lokal belum pernah dijalankan atas
     kandidat, jadi tidak ada kandidat yang bisa naik;
 (b) MASTER-ONLY-GOVERNANCE.md melarang promosi otomatis terpicu ambang secara STRUKTURAL,
     sementara fiezel-autonomy-config.js menyediakan level 'full'. Keduanya tidak bisa benar
     sekaligus, dan kontradiksi ini bukan bug kode.

YANG KAMU KERJAKAN:
1. tools/run-content-gates.js — runner deterministik yang menjalankan gerbang lokal atas satu
   kandidat patch (content-patch-gate + validator konten yang relevan) dan menghasilkan verdict
   yang bisa diaudit, sehingga gateStatus bisa berpindah dari UNVERIFIED_LOCAL_GATES_REQUIRED
   ke status yang JUJUR. Runner ini TIDAK boleh menyentuh konten kanonik; ia menilai, tidak
   menerapkan.
2. Sambungkan hasil runner ke jalur worker HANYA sebagai status yang dilaporkan. Batas keras
   yang tidak boleh kamu lewati: worker tetap kandidat-saja, canonical tidak pernah disentuh
   runtime, promosi tetap butuh keputusan manusia. Kalau kamu merasa perlu melewati batas ini
   untuk "menyelesaikan" langkah, JANGAN — tulis di laporanmu kenapa, itu memang jawabannya.
3. BRAINCORE-AUTONOMY-GOVERNANCE.md — DRAF KEPUTUSAN untuk OWNER, bukan keputusan itu sendiri.
   Isinya wajib: (a) kontradiksi di atas dinyatakan terang-terangan dengan kutipan pasalnya;
   (b) usulan KELAS PERUBAHAN yang boleh terbit tanpa manusia, sesempit mungkin, dengan contoh
   konkret yang boleh dan yang tidak (misal: penulisan ulang penjelasan pada item kanonik BOLEH;
   menyentuh kunci jawaban, opsi, atau label miskonsepsi TIDAK); (c) bentuk otorisasinya:
   bertanda tangan, berbatas waktu, bisa dicabut, dengan kill switch yang sudah ada (halt);
   (d) apa yang HILANG kalau owner menyetujuinya — risiko ditulis, bukan disembunyikan.
   Dokumen ini TIDAK mengubah MASTER-ONLY-GOVERNANCE.md. Hanya OWNER yang boleh.

TEST WAJIB: content-gate-runner-test.js (runner deterministik, menolak kandidat cacat, tidak
pernah menulis ke konten kanonik — buktikan dengan hash sebelum/sesudah) dan
core-worker-contract-test.js tetap PASS.

SELESAI KALAU: test milikmu PASS + lima gate wajib PASS + draf governance selesai.
Lapor: apa yang bisa otomatis SEKARANG tanpa melanggar governance, apa yang menunggu keputusan
OWNER, dan satu rekomendasi tegas — kamu advisory, tapi advisory yang tidak berpendapat tidak berguna.
```

---

### A-WIRE — Integrator (JALAN PALING AKHIR)

```
Kamu agent A-WIRE di repo FIEZEL-APPS/FIEZEL-APPS. Kamu satu-satunya yang boleh menyentuh
jalur aplikasi di gelombang ini.
WAJIB baca dulu: BRAINCORE-AUTONOMY-CONTRACTS.md seluruhnya + laporan akhir A-STAT, A-NOF1,
A-CFG, A-TUNE, A-GOV.

KEPEMILIKAN EKSKLUSIF:
  app.js, index.html, sw.js, core-config.js, features/neural-voice/fiezel-diag-panel.js,
  features/brain/fiezel-brain-manifest.js, brain-page-wiring-test.js, .github/workflows/quality.yml

TUGAS:
1. Sambungkan modul yang sudah mendarat, SEMUANYA dibungkus availability-check + try/catch
   (pola coreBrainAvailable/retentionProbeAvailable yang sudah ada). Modul absen = perilaku
   identik hari ini; ini kontrak, bukan saran.
2. State baru di kunci localStorage BARU. fiezel-sl-v1-state TIDAK disentuh.
3. Ganti pemutus di evaluatePolicyOutcome dengan FiezelPolicyVerdict. Skor komposit lama tetap
   DILAPORKAN sebagai deskripsi, tetapi kehilangan status sebagai pemutus.
4. Perbarui authorityMap dengan JUJUR, dan naikkan bundleVersion. Ingat dua gerbang yang sudah
   ada: W8 di brain-page-wiring-test.js menolak modul 'off' yang punya pemanggil, dan
   brain-manifest-test.js sekarang MENURUNKAN otoritas dari pembacaan app.js dua arah. Kamu
   tidak bisa berbohong di peta ini walaupun ingin.
5. Daftarkan SEMUA test baru ke .github/workflows/quality.yml. Gate yang tidak berjalan di CI
   bukan gate.
6. Naikkan ritual build BERSAMAAN: FIEZEL_PAGE_BUILD (core-config.js), DIAG_BUILD
   (features/neural-voice/fiezel-diag-panel.js), SW_REV (sw.js) — +1 dari m025-214.

SELESAI KALAU: seluruh daftar test di quality.yml PASS, termasuk install-health-test.js dan
pwa-release-coherence-test.js.
Lapor: peta otoritas sebelum/sesudah, dan daftar modul yang SENGAJA kamu biarkan 'off' beserta
alasannya per butir.
```

---

## 5. Cara menyelesaikan bentrok kalau tetap terjadi

Kalau dua agent merasa membutuhkan berkas yang sama, itu bukan alasan mengedit bersama — itu
tanda pembagian di §2 salah. Yang benar: **agent yang tidak memilikinya berhenti dan melapor**,
lalu dokumen ini diperbarui sebelum kerja dilanjutkan. Dua agent yang sama-sama "cuma menambah
sedikit" ke `app.js` adalah cara paling umum sebuah gelombang paralel kehilangan setengah harinya.
