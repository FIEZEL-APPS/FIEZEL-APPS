# Braincore v3 — Laporan Upgrade

**Basis:** FIEZEL 5.19.0 · **Tanggal:** 2026-08-28 · **Status:** kontrak final (Fase 1 gelombang A + Fase 2 gelombang B + Fase 3 gelombang C), implementasi paralel berjalan — hasil test BELUM diverifikasi di dokumen ini

Dokumen ini menjawab satu pertanyaan: **apa yang diubah di Braincore v3, mengapa, dan bagaimana
membuktikannya salah?** Ditulis dengan aturan yang sama seperti
[ADAPTIVITY-READINESS-REPORT.md](ADAPTIVITY-READINESS-REPORT.md): klaim harus berupa angka
yang bisa dibantah, dan yang belum terbukti ditulis sebagai belum terbukti. Karena modul-modul
v3 sedang dibangun paralel oleh agent lain saat laporan ini ditulis, bagian implementasi
mendeskripsikan **kontrak API** ([BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md)),
bukan baris kode — dan tidak ada satu pun hasil test yang diklaim di sini.

---

## 1. Mengapa v3 ada: audit Model Council

Empat model frontier (Claude Fable 5, Claude Opus 5, Claude Sonnet 5.0, GPT-5.6 Sol) mengaudit
Core Brain v2 dan Tutor Brain secara independen; dua di antaranya menjalankan modul di Node
dengan probe numerik. Laporan lengkap: `../model-council-synthesis.md` dan
`../model-council-{claude_fable_5,claude_opus_5_0,claude_sonnet_5_0,gpt_5_6_sol}.md`.

Vonisnya tidak enak didengar tapi berbukti: **arsitektur v2 sehat (modul murni, confidence
gate, rationale codes, fallback berlapis), namun sebagian besar keputusan brain tidak pernah
sampai ke soal yang dikerjakan murid.** Empat defek terverifikasi dengan probe:

| # | Defek | Bukti | Sumber |
|---|---|---|---|
| D1 | **`targetDifficulty` adalah no-op.** Di `buildAdaptivePool` (app.js:1599) semua kandidat difilter ke satu level dengan difficulty identik, sehingga term penalti konstan dan tidak mengubah urutan sort. Seluruh pipeline optimal-difficulty v2 tidak menyentuh pemilihan soal | Penelusuran jalur end-to-end + probe | Opus T2, `../model-council-claude_opus_5_0.md` |
| D2 | **Pembulatan difficulty menghancurkan target.** `predictedSuccess` aktual berayun **0,467–0,889** (target deklarasi 0,80; rata-rata probe 0,761) karena langkah pembulatan menggeser log-odds 1,5; band `foundation` tidak pernah keluar (0/621 titik grid) | Probe grid θ ∈ [0,4; 6,6] langkah 0,005 | Opus T3 |
| D3 | **`successes = streak` meruntuhkan half-life >99% pada satu lapse.** `coreBrainMemory()` (app.js:1348) memasok streak, bukan hitungan kumulatif; item dengan 8 sukses lalu 1 gagal jatuh dari h ≈ 268 hari ke ≈ 0,9 hari — hukuman ganda (×0,55 DAN reset eksponen 1,9^n) | Aritmetika formula, direplikasi dua model | Fable §2.3, Opus §memori |
| D4 | **416 label miskonsepsi unik dari 417 entri = nol daya transfer.** `repeats >= 2` hanya bisa terpicu pada item identik; "persistent misconception" hari ini berarti "diulang dalam satu sesi" pada soal yang sama persis | Hitung kardinalitas `grammar-templates.json` | Opus T5 |

Ditambah dua bug yang lebih kecil tapi memalukan:

- **`guess` → `stretch`:** `decideMove()` (tutor-brain, baris 332–334) menghitung jawaban
  benar berlabel guess (<1.800 ms) sebagai alasan menaikkan kesulitan setelah streak 4 —
  empat tebakan beruntun menaikkan difficulty (`../model-council-gpt_5_6_sol.md` §5).
- **`explanationsUsed` janji kosong:** dibuat tapi tidak pernah dibaca; klaim "tidak mengulang
  penjelasan yang gagal" di header modul belum diimplementasikan (Sol §6).

Catatan jujur yang harus ikut dicatat: keempat model juga sepakat bahwa disiplin rekayasa v2
(kemurnian modul, gate kepercayaan, degradasi anggun) **benar dan wajib dipertahankan** sebagai
kontrak v3. Yang diganti adalah matematikanya dan jalur pengaruhnya, bukan arsitekturnya.

---

## 2. Apa yang diubah, per file, dan mengapa

Peta kepemilikan eksklusif ada di [BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md).
Deskripsi di bawah adalah kontrak yang mengikat pembangunnya — bukan laporan implementasi.

### 2.1 Perbaikan file yang sudah ada

| File (agent) | Yang diubah | Mengapa |
|---|---|---|
| `features/brain/fiezel-core-brain.js` (A1) | Mesin memori jadi FSRS-lite: sukses `S' = S·(1+1.2·(11−Dmap)·S^−0.15·(e^(1.8·(1−R))−1))`; lapse `S' = min(S, 1.5·Dmap^−0.6·((S+1)^0.35−1))` dengan floor ≥10% S; `halfLife(item)` memakai `item.stability` bila ada, formula lama bila tidak | Menutup D3: lapse mempertahankan sebagian besar stabilitas, dan review pada R rendah menumbuhkan ingatan lebih besar — perilaku yang terbukti unggul di [benchmark SRS terbuka](https://github.com/open-spaced-repetition/srs-benchmark) mengikuti [algoritma FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) |
| `features/brain/fiezel-tutor-brain.js` (A2) | Hapus `guess` dari pemicu stretch; implementasikan (atau cabut klaim) `explanationsUsed`; gate lama yang menguji perilaku defek boleh diperbarui dengan dokumentasi di komentar test | Dua kontradiksi pedagogis langsung dari audit Sol; satu baris perbaikan, satu janji yang harus ditepati atau dihapus |
| `app.js`, `index.html`, service worker (A3) | Wiring semua modul baru dibungkus availability-check + try/catch (pola `coreBrainAvailable`); state baru di kunci localStorage baru; `fiezel-sl-v1-state` tidak disentuh | Menutup D1 di titik integrasinya, dan menjamin: modul absen = perilaku identik hari ini |

### 2.2 Sembilan modul baru (semuanya murni, UMD, waktu sebagai argumen)

| Modul (agent) | Kontrak | Mengapa ada |
|---|---|---|
| `fiezel-misconception-ledger.js` (A4) | `update(ledger, evidence, nowMs)` murni; `active()` bergerbang ≥3 bukti, ≥2 sesi, belief ≥0,7; log-odds prior logit(0,1), salah+distraktor +ln(10) (guess ×0,3), benar −ln(2), decay half-life 14 hari | Kesepakatan terkuat council: diagnosis miskonsepsi hari ini menguap tiap sesi. Tradisi bug-library sejak [BUGGY (Brown & Burton)](https://dspace.mit.edu/bitstream/handle/1721.1/38796/35332952-MIT.pdf), kerangka [MC-DINA](https://academiccommons.columbia.edu/doi/10.7916/d8-1wa8-kn61/download) |
| `misconception-taxonomy-v1.json` + builder (A5) | 416 string bebas → kosakata tertutup ≤50 kode `family.mechanism`, termasuk keluarga transfer-L1 Indonesia; setiap string HARUS terpetakan, nol yatim | Menutup D4: tanpa taksonomi kanonik, ledger persisten pun tidak bisa menggeneralisasi antar-item |
| `fiezel-item-prior.js` (A6) | `difficultyFor({level, mode, domain})` kontinu; basis level + `MODE_COST` ±0,9 untuk 25 mode grammar | Menutup D2 dari sisi sumber: difficulty berhenti jadi integer hasil `Math.round`, jadi target sukses bisa dipegang |
| `fiezel-confusion-matrix.js` (A7) | Matriks kebingungan lesson 139×139 dari `optionSources` yang sudah ada di konten tapi tak terpakai | Validasi empiris graf prasyarat + sinyal transfer antar-lesson (temuan unik Opus) |
| `fiezel-olm.js` (A8) | `summarize({bkt, ledger, memory, calibration}, nowMs)` — presentasi saja, tanpa keputusan sesi; pesan coaching kalibrasi (Brier, bias) | Data `setConfidence` sudah ada tapi tidak dipedagogikan; [Bull & Kay, OLM](https://pure-oai.bham.ac.uk/ws/portalfiles/portal/19588792/chap_2013_metacog.pdf), scaffolding SRL [g = 0,587](https://pmc.ncbi.nlm.nih.gov/articles/PMC10075206/) |
| `fiezel-affect.js` (A9) | `assess()` → neutral/frustrated/bored/gaming/fatigued; minimum 8–10 attempt; histeresis via state sebelumnya | Intervensi yang benar berbeda per keadaan; syarat minimum-bukti mencegah model sok tahu |
| `fiezel-mastery-bkt.js` (A10) | BKT per lesson (L0=0,2, T=0,15, slip=0,1, guess=0,25); `frontier()` prasyarat L ≥0,95, p prediksi 0,55–0,90 | Mastery `accuracy × min(1, total/5)` terlalu lemah untuk menggerbangi unlock; [Corbett & Anderson, BKT](https://www.semanticscholar.org/paper/Knowledge-tracing%3A-Modeling-the-acquisition-of-Corbett-Anderson/645b2c28c28bd28eaa187a2faafa5ec12bc12e3a) |
| `fiezel-evidence-credibility.js` (A12) | `weigh({timing, langLoad, integrity})` → κ; guess = 0,3, beban bahasa penuh-EN untuk A1/A2 = 0,45, `evidence_mismatch` = 0 | 842 soal listening masih Inggris: "salah" yang tercemar bahasa tidak boleh masuk model dengan bobot penuh (§7 readiness report v2) |
| `fiezel-step-tutor.js` (A13) | `stepsFor(template)` dari field `reasoningOperation` yang sudah ada di 139 template | Granularitas langkah — bukan kefasihan LLM — adalah sumber efek d ≈ 0,76 tutoring ([VanLehn](https://www.tandfonline.com/doi/abs/10.1080/00461520.2011.611369)) |
| `fiezel-production-grader.js` (A14) | `grade(answer, target, opts)` → normalisasi, edit distance ≤1 non-inisial, deteksi distraktor | Mode produksi (mengetik jawaban) butuh penilai yang memaafkan typo tapi menangkap miskonsepsi |

*(A7 dihitung sebagai modul analisis; total 9 modul brain baru + 1 taksonomi.)*

### 2.3 Simulator

`adaptivity-simulation-v3.js` (A11) menggantikan simulasi lama yang oleh Sol disebut
**wiring certificate, bukan bukti efektivitas**: tak berseed, generator jawaban mengabaikan
difficulty, tanpa metrik kalibrasi. Versi v3 dikontrak berseed dan mengukur hasil
(kalibrasi/retensi), bukan hanya membuktikan kabel tersambung.

---

## 3. Batas yang dijaga (kendala keras, tidak bisa ditawar)

1. **Modul murni** — tanpa DOM, network, storage, `Math.random` tak berseed; waktu SELALU
   argumen `nowMs`. Ini bukan estetika: Sol membuktikan v2 melanggar kontraknya sendiri
   (fallback `Date.now()` di tiga fungsi), dan v3 menghapusnya total.
2. **Zero runtime cost** — tanpa API cloud, tanpa model neural di jalur keputusan.
3. **Gate kepercayaan** — setiap keputusan membawa `rationale` (prefix `brain3_`) dan
   `confidence`; di bawah ambang bukti, modul diam dan kebijakan lama dipakai utuh.
4. **Kompatibilitas mundur** — state lama tetap valid (`fiezel-sl-v1-state` tidak disentuh;
   state baru di kunci baru); `halfLife()` memakai formula lama bila `stability` absen;
   **modul absen = perilaku identik hari ini**.
5. **Privasi** — tidak ada audio/transkrip mentah yang disimpan; data tidak meninggalkan
   perangkat.

---

## 4. Yang SENGAJA tidak dilakukan, dan alasannya

Ini keputusan, bukan kelalaian — keempat anggota council bulat pada semuanya.

| Ditolak | Alasan | Literatur |
|---|---|---|
| **DKT/SAKT/transformer knowledge tracing** | FIEZEL punya N=1 murid per perangkat dan tak boleh mengirim data; BKT yang diperkaya menyamai DKT pada benchmark umum, dan model attention kehilangan daya prediksi lebih cepat pada data baru | [Khajah dkk., "How Deep is Knowledge Tracing?"](https://www.educationaldatamining.org/EDM2016/proceedings/paper_144.pdf); [robustness KT models](https://arxiv.org/html/2511.00704v1); [pyKT tentang sensitivitas evaluasi](https://arxiv.org/pdf/2206.11460.pdf) |
| **Contextual bandit untuk memilih intervensi** | Bandit memisahkan sinyal dari noise lewat agregasi lintas-murid; pada N=1, murid itu sendiri yang menanggung seluruh biaya eksplorasi. Yang dilakukan: **mencatat** pasangan (aksi, hasil) untuk evaluasi retrospektif | [Contextual bandits untuk aksi pembelajaran](https://people.umass.edu/~andrewlan/papers/16edm-bandits.pdf); [Learning to Optimize Feedback for One Million Students](https://www.arxiv.org/pdf/2508.00270) |
| **Model ONNX di brain** | Runtime `onnxruntime-web` puluhan MB sebelum model; membayar itu untuk keputusan yang bisa dihitung regresi logistik ~40 parameter adalah pertukaran buruk | [Diskusi ukuran WASM onnxruntime](https://github.com/microsoft/onnxruntime/discussions/24161); [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) |
| **LLM lokal untuk tutoring** | Yang membuat tutoring efektif adalah granularitas interaksi (step-based d ≈ 0,76 vs answer-based d ≈ 0,31), bukan kefasihan bahasa; jalannya menaikkan granularitas via `reasoningOperation`, bukan menambah model bahasa | [VanLehn 2011](https://www.tandfonline.com/doi/abs/10.1080/00461520.2011.611369); [meta-analisis ITS K-12](https://virtuallearninglab.org/wp-content/uploads/sites/10/2024/11/AERA-2024-Do-intelligent-tutoring-systems-benefit-K-12-students-in-the-U.S.A-meta-analysis.pdf) |

---

## 5. Cara verifikasi

**Status semua gate: terdaftar per kontrak, dijalankan pada integrasi akhir.** Laporan ini
tidak mengklaim satu pun hasil PASS/FAIL, karena penulisnya belum melihat hasilnya — modul
sedang dibangun paralel. Setiap agent wajib menjalankan test miliknya + tiga gate wajib
sebelum menyerahkan.

Gate lama (harus tetap PASS — regresi = perbaiki pendekatan, bukan gate):

```bash
node tests/core-brain-v2-test.js       # 31 gate keputusan v2
node tests/tutor-brain-v3-test.js      # gate tutor (A2 boleh perbarui gate yang menguji defek terverifikasi)
node tests/regression-test.js          # regresi aplikasi
```

Gate baru per kontrak (satu file test Node mandiri per modul, pola `tests/core-brain-v2-test.js`,
baris akhir `<Nama>: PASS`):

```bash
node tests/core-brain-v3-upgrade-test.js    # FSRS-lite + kompat halfLife
node tests/misconception-ledger-test.js     # posterior log-odds, gate ≥3 bukti/≥2 sesi
node tests/misconception-taxonomy-test.js   # 416 string → ≤50 kode, nol yatim
node tests/item-prior-test.js               # difficulty kontinu, MODE_COST 25 mode
node tests/confusion-matrix-test.js         # matriks 139×139 dari optionSources
node tests/olm-test.js                      # ringkasan OLM + coaching kalibrasi
node tests/affect-test.js                   # 5 keadaan, minimum bukti, histeresis
node tests/mastery-bkt-test.js              # BKT + frontier 0,55–0,90
node tests/evidence-credibility-test.js     # κ: guess 0,3, langLoad 0,45, mismatch 0
node tests/step-tutor-test.js               # langkah dari reasoningOperation
node tests/production-grader-test.js        # normalisasi + edit distance ≤1
node adaptivity-simulation-v3.js      # simulasi berseed dengan metrik hasil
```

Dua gate yang menurut probe council **gagal hari ini** dan wajib lulus di v3: "kolam dengan
target berbeda harus berbeda ≥40%" (membantah D1) dan "kenaikan session size survive
integrasi" (kenaikan dari momentum tertelan `min()` di `refinePolicy`).

---

## 6. Fase 2 — Gelombang B: apa yang ditambahkan, dan mengapa

Kontrak Fase 2 ada di [BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md) bagian "FASE 2 —
Kontrak Gelombang B". Seperti §2, deskripsi di bawah adalah **kontrak yang mengikat
pembangunnya, bukan laporan implementasi** — modul-modul B sedang dibangun paralel saat
bagian ini ditulis, dan tidak ada satu pun hasil test yang diklaim di sini. Setiap baris
dipilih untuk menutup defek atau celah spesifik yang terdokumentasi, bukan karena "bagus
kalau ada".

### 6.1 Per kontrak: yang ditambahkan dan MENGAPA

| Kontrak (agent) | Yang ditambahkan | Mengapa (defek/celah yang ditutup) |
|---|---|---|
| `fiezel-core-brain.js` — momentum residual (B1) | `momentum(attempts)`: bila ≥60% baris membawa `predicted` (prediksi P saat penyajian), tren dihitung pada **residual** `(ok?1:0)−predicted` per blok, ambang slope ±0,03, field `basis:'residual'`; tanpa `predicted` → perilaku lama (`basis:'accuracy'`) | Simulator A11 mendokumentasikan **osilasi targetDifficulty v2 = 4,22 perubahan/10 sesi vs v1 = 2,84** (metrik `difficultyOscillationPer10`, seed 42): logika plateau_break/trend memantul ±1 karena momentum dihitung dari akurasi mentah — padahal ketika kebijakan sengaja menahan akurasi di 0,80, akurasi mentah *pasti* berayun di sekitar 0,80 tanpa berarti muridnya berubah. Residual memisahkan "murid membaik/memburuk relatif terhadap prediksi" dari "kebijakan bekerja sesuai target" |
| `fiezel-core-brain.js` — `sd` gaya Glicko (B1) | `estimateAbility` mengeluarkan `sd` (deviasi: naik `sqrt(sd²+0,03²·hariMenganggur)` saat senggang, turun mengikuti informasi Fisher per jawaban; sd0=1,2, sdMax=1,2, sdMin=0,15) dan `sdConfidence = 1 − sd/sdMax`; semantik `confidence` lama TIDAK diubah | Menutup T7 Opus (`../model-council-claude_opus_5_0.md` §2.7): probe membuktikan `confidence` v2 adalah fungsi volume attempt semata (`weightedEvidence/24`) — 24 jawaban lempar-koin cukup untuk membuat brain 98% "yakin". Confidence yang benar adalah turunan presisi posterior (informasi Fisher), bukan hitungan; dan ketidakpastian harus *naik lagi* saat murid menganggur |
| `fiezel-core-brain.js` — bobot `credibility` (B1) | Baris riwayat boleh membawa `credibility` (0..1, default 1) yang mengalikan bobot langkah estimator (recency×credibility) | Meneruskan κ dari `fiezel-evidence-credibility.js` (A12) sampai ke estimator: bukti tercemar (guess, beban bahasa, replay berlebih) selama ini didiskon di ledger tapi masih masuk penuh ke taksiran kemampuan |
| `fiezel-tutor-brain.js` — afek + fading (B2) | `decideMove` membaca `opts.affect` SEBELUM aturan stretch/continue: frustrated→breathe, bored→stretch, gaming→continue+`suggestModeSwitch`, fatigued→wrapup (hanya bila remaining>2); aturan keselamatan lama tetap menang. Scaffold FADING: dua keberhasilan independen berturut pada konsep → titik mulai tangga turun satu anak tangga (tak pernah di bawah probe), rationale `scaffold_faded`. `selectNext` dengan `opts.seed` → softmax suhu 0,35 atas 4 kandidat teratas (mulberry32 berseed) | Menutup temuan Opus §3.4 (`../model-council-claude_opus_5_0.md`): `decideMove` adalah pohon prioritas tetap yang buta terhadap keadaan murid, dan `scaffoldLevel` **tidak pernah turun** — "eskalator satu arah menuju tell", padahal fading adalah separuh definisi scaffolding. Deteksi afek dari A9 (Fase 1) baru berguna kalau intervensinya benar-benar berbeda per keadaan; softmax berseed memecah determinisme exposure tanpa mengorbankan testabilitas |
| `app.js`/`index.html`/`sw.js` — single-writer memory (B3) | `scheduleNext` memakai stability FSRS + `nextReviewGapDays` sebagai penulis `nextReview` TUNGGAL bila `FiezelCoreBrain.updateMemory` tersedia; `forgettingProbability` dari model yang sama; field legacy tetap ditulis untuk rollback; tanpa modul → jalur lama utuh. Plus wiring: `predicted`+κ ke baris riwayat, BKT shadow, confusion matrix, afek→`decideMove` (targetSuccess frustrated 0,90 / bored 0,75), replayCount listening, panel OLM, precache modul baru | Menutup T4 Opus (`../model-council-claude_opus_5_0.md`, vonis "Fatal"): dua model memori hidup bersamaan dan **yang menulis jadwal adalah yang lebih lemah** (SM-2 turunan v1), sementara model half-life v2 hanya membaca. Gate pencegah kambuh: hanya satu fungsi di seluruh basis kode yang menulis `nextReview` |
| `adaptivity-simulation-v3.js` (B5) | Simulator berseed yang sama dijalankan ulang terhadap kebijakan Fase 2; metrik `difficultyOscillationPer10` adalah angka yang harus turun | Angka 4,22 vs 2,84 di atas adalah klaim yang bisa dibantah — dan satu-satunya cara membantahnya (atau membuktikan momentum residual bekerja) adalah run berseed yang sama pada murid sintetis yang sama |
| `fiezel-listening-adaptive.js` (B6) | `policy({mastery, replayHistory, targetSuccess})` → `{rateBand, replayQuota, clipLength, rationale}`; murni; kesulitan listening = kecepatan + replay + panjang klip, dikontrol aturan 0,80; **satu dimensi berubah per langkah** | Dari Sol §7.10 (`../model-council-gpt_5_6_sol.md`): kalau murid gagal, turunkan kecepatan ATAU kompleksitas — bukan keduanya sekaligus — supaya diagnosis tetap *identifiable*; mengubah dua dimensi serentak membuat mustahil tahu dimensi mana yang menyebabkan perubahan hasil. Listening bisa diadaptasi hari ini tanpa model apa pun (nol biaya runtime) |
| `tools/build-cloze-bank.js` + `cloze-bank-v1.json` (B7) | Bank cloze ≥200 item lintas level dari kalimat target `grammar-templates.json` (schema `fiezel-cloze-bank-v1`); jawaban blank = jawaban benar template; distraktor dibawa beserta label miskonsepsinya (untuk `FiezelProductionGrader` + ledger) | Dari P8 Fable (`../model-council-claude_fable_5.md`): seluruh bukti FIEZEL hari ini adalah recognition (pilihan ganda), padahal efek testing klasik [Roediger & Karpicke 2006](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x) dan tindak lanjutnya [Karpicke & Roediger 2008 di Science](https://web.mit.edu/educationgroup/HHMIEducationGroup/wp-content/uploads/2011/04/14-Karpicke-Roediger-2008.pdf) menunjukkan retrieval aktif — bukan studi/recognition berulang — yang mendorong retensi jangka panjang. Konversi dari 139 template yang sudah punya kalimat target sebagian besar mekanis, dan grader-nya (A14) sudah dikontrak di Fase 1 |

### 6.2 Gate baru Fase 2, per file test

**Status semua gate Fase 2: terdaftar per kontrak, dijalankan pada integrasi akhir.** Sama
seperti §5, laporan ini tidak mengklaim satu pun hasil PASS/FAIL — penulisnya belum melihat
hasilnya, dan mengklaim PASS yang belum dilihat adalah persis dosa yang laporan ini ada untuk
mencegahnya.

| Gate | Pemilik | Yang dibuktikan bila lulus |
|---|---|---|
| `node tests/core-brain-v3-upgrade-test.js` | B1 | Momentum `basis:'residual'` aktif bila ≥60% baris ber-`predicted`, ambang ±0,03; fallback `basis:'accuracy'` utuh; `sd` naik saat senggang/turun per jawaban dalam [0,15; 1,2]; `sdConfidence` konsisten; `credibility` default 1 tidak mengubah hasil lama |
| `node tests/tutor-brain-v3-test.js` | B2 | Empat intervensi afek dengan rationale `affect_*` dan preseden aturan keselamatan lama; `scaffold_faded` turun satu anak tangga setelah dua sukses independen, tak pernah di bawah probe; `selectNext` berseed deterministik, tanpa seed = argmax lama |
| `node tests/core-brain-v2-test.js` + `node tests/regression-test.js` | B3 | Modul absen = perilaku identik hari ini; `fiezel-sl-v1-state` tidak disentuh; satu-satunya penulis `nextReview` adalah jalur `nextReviewGapDays` saat modul tersedia |
| `node adaptivity-simulation-v3.js` | B5 | Run berseed byte-identik (exit 2 bila tidak); `difficultyOscillationPer10` turun dari 4,22 tanpa mengorbankan `accuracyGapVsTarget`, retensi hari-90, dan Brier |
| `node tests/listening-adaptive-test.js` | B6 | Policy murni, keluaran `{rateBand, replayQuota, clipLength}` valid, rationale `brain3_listening_*`, dan hanya SATU dimensi berubah per langkah |
| `node tests/cloze-bank-test.js` | B7 | Schema `fiezel-cloze-bank-v1`, ≥200 item lintas level, setiap `blank.answer` = jawaban benar template asal, setiap distraktor berlabel miskonsepsi |

Gate lama (§5) tetap wajib PASS untuk semua agent B — regresi berarti perbaiki pendekatan,
bukan gate.

---

## 7. Fase 3 — Gelombang C: apa yang ditambahkan, dan mengapa

Kontrak Fase 3 ada di [BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md) bagian "FASE 3 —
Kontrak Gelombang C". Seperti §2 dan §6, deskripsi di bawah adalah **kontrak yang mengikat
pembangunnya, bukan laporan implementasi** — modul-modul C sedang dibangun paralel saat
bagian ini ditulis, dan tidak ada satu pun hasil test yang diklaim di sini. Fase 3 menyerap
tiga butir roadmap pasca-Fase 2 (kalibrasi item, speaking adaptif, negotiated OLM) — masing-
masing dalam bentuk yang SUDAH bisa dipertanggungjawabkan pada satu perangkat, bukan bentuk
idealnya yang menunggu data populasi (lihat §8).

### 7.1 Per kontrak: yang ditambahkan dan MENGAPA

| Kontrak (agent) | Yang ditambahkan | Mengapa (defek/celah yang ditutup) |
|---|---|---|
| `fiezel-item-calibration.js` (C1) | Elo dua-sisi **sisi item** dengan shrinkage keras: `observe()` menggeser delta item `delta_i -= Kb·(y−p)` dengan `Kb = 0,35/(1+0,08·n_i)` (p dari 3PL, κ mengalikan langkah); clamp `abs(delta_i) ≤ 0,6` dari prior pada SETIAP update; `effective()` menerapkan delta HANYA bila `n_i ≥ 8`, selain itu prior konten apa adanya (`applied:false`) | Ini Tahap B dari rancangan C1 Opus (`../model-council-claude_opus_5_0.md` §C1): update online `θ ← θ+K_θ(y−p̂)`, `b_i ← b_i−K_b(y−p̂)` dengan langkah meluruh `1/(1+γn)` — bentuk yang [direkomendasikan Pelánek](https://www.fi.muni.cz/~xpelanek/publications/CAE-elo.pdf) karena mengonvergenkan estimasi alih-alih membiarkannya berosilasi — plus shrinkage ke prior `clamp(b_i−b_i^(0), −δ, +δ)` dengan δ=0,6, versi murah dari [kalibrasi hierarkis untuk data jarang](https://pubmed.ncbi.nlm.nih.gov/36333627/). Shrinkage-nya KERAS karena Sonnet mendokumentasikan risiko yang persis mengenai FIEZEL: ketika hanya satu sisi Elo diperbarui sementara seleksi item bergantung pada rating yang sedang berubah, varians rating bisa membesar artifisial dan tidak konvergen ([Keeping Elo Alive](https://pubmed.ncbi.nlm.nih.gov/40476309/), dikutip `../model-council-claude_sonnet_5_0.md` §1.1). Pada N=1 murid, delta tanpa clamp adalah resep divergensi — maka clamp per-update + gerbang n≥8, dan kalibrasi *permanen* tetap milik pipeline konten (§8 butir 1) |
| `fiezel-speaking-adaptive.js` (C2) | Speaking adaptif dari **agregat saja**: `policy({coverageHistory, weakLessons, mastery})` → kompleksitas prompt/target skill/scaffold, SATU dimensi naik per langkah (aturan yang sama dengan listening B6); `evidence({coverage, latencyMs, replays})` → κ **selalu ≤ 0,6** — bukti speaking permanen didiskon; TANPA ONNX, TANPA ASR baru, TANPA audio/transkrip disimpan | Keputusan sadar, bukan kelalaian, mengikuti dua vonis council yang independen. Sol §7.10 (`../model-council-gpt_5_6_sol.md`): recognizer browser existing "sebaiknya dinilai sebagai **target coverage**, bukan pronunciation quality"; yang boleh disimpan hanya agregat (token/structure hit, attempt count, latency bucket, recognizer confidence, scaffold level); "raw audio dan transcript tidak pernah disimpan". Dan Opus C10 (`../model-council-claude_opus_5_0.md`) menolak ONNX di brain dengan alasan ukuran yang eksplisit: "runtime `onnxruntime-web` sendiri sudah puluhan MB sebelum model, dan pengurangan ke ~8 MB butuh custom build ([diskusi ukuran WASM onnxruntime](https://github.com/microsoft/onnxruntime/discussions/24161); [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)); biaya itu sudah dibayar untuk Kokoro (~119 MB, opt-in), dan menambah beban serupa untuk keputusan yang dapat dihitung dengan regresi logistik 40 parameter adalah pertukaran yang buruk." Kualitas pelafalan yang tidak bisa diukur jujur → tidak diukur; coverage yang bisa → diukur dengan diskon |
| `fiezel-olm.js` — negotiate (C3) | `negotiate(state, {claimId, action:'dispute'}, nowMs)`: murid menekan "menurutku ini salah" pada klaim panel OLM → instruksi `remeasure` (3 probe pada skill itu di sesi berikutnya) untuk klaim mastery/miskonsepsi, atau `discount_evidence` untuk klaim memori; klaim disputed ditandai "sedang diukur ulang" di `summarize` (API lama TIDAK berubah) | OLM Fase 1 (A8) sengaja presentasi-saja; ini langkah kedua yang dijanjikan roadmap: dari *open* ke *negotiated*. Justifikasinya bukan hanya pedagogis tapi juga **akurasi model** — sanggahan murid adalah bukti baru yang memicu pengukuran ulang, sesuai kerangka [Bull, negotiated learner modelling](https://pure-oai.bham.ac.uk/ws/portalfiles/portal/56790376/Bull_Negotiated_learner_modelling_to_maintain_today_s_learner_models_Research_and_Practice_in_Technology.pdf) yang dikutip Opus §C9: model yang bisa dibantah lebih akurat daripada model yang hanya bisa dilihat. Sanggahan TIDAK langsung mengubah taksiran (murid bukan oracle) — ia mengantrikan pengukuran, dan pengukuranlah yang memutuskan |
| `fiezel-srl-coach.js` (C4) | Coach regulasi-diri tiga titik: `sessionPlan` (pilihan tujuan sesi), `predictPrompt` ("seberapa yakin?" — MAKSIMAL 1 per sesi, hanya item ke-2..4, TIDAK PERNAH saat affect frustrated), `reflect` (pesan kalibrasi spesifik-konten Indonesia di akhir sesi); FADING: 3 sesi berturut kalibrasi baik → prompt berhenti 5 sesi (`brain3_srl_faded`) | Scaffolding SRL adalah efek menengah yang murah: meta-analisis melaporkan [g = 0,587](https://pmc.ncbi.nlm.nih.gov/articles/PMC10075206/) untuk scaffolding regulasi belajar, [ES 0,438](https://link.springer.com/article/10.1007/s12564-016-9426-9) untuk scaffold SRL berbasis komputer, dan [0,69 untuk intervensi SRL daring/blended](https://www.tandfonline.com/doi/full/10.1080/0144929X.2022.2151935) — rentang 0,44–0,69 yang oleh Opus disebut "setara atau melebihi banyak perbaikan algoritmik, dengan biaya implementasi jauh lebih rendah" (`../model-council-claude_opus_5_0.md` §C9). Syarat Opus dipegang sebagai kontrak: prompt harus **spesifik-konten dan jarang** (bukan pengingat generik), tidak boleh muncul saat frustrasi (menambah beban saat murid gagal adalah kesalahan), dan fading — SRL coach yang tidak pernah mundur bukan coach, melainkan nag. Data `setConfidence` yang sudah ada akhirnya dipedagogikan |
| `app.js`/`index.html`/`sw.js` (C5) | Wiring keempat modul di atas (guarded try/catch, modul absen = perilaku lama) PLUS dua fitur render: **mode cloze produksi** — item dari `cloze-bank-v1.json` (B7), input ketik, dinilai `FiezelProductionGrader.grade` (A14); `matchedDistractor` → ledger miskonsepsi, bukti produksi weight 1,5 di BKT; digerbang BKT L ≥ 0,6 per skill. Dan **step-tutor rendering** — saat scaffold mencapai `worked` pada template yang punya langkah, langkah `FiezelStepTutor` ditampilkan sebagai tuntunan bertahap sebelum opsi (tampilan saja) | Cloze menutup celah P8 Fable (`../model-council-claude_fable_5.md`): seluruh bukti FIEZEL adalah recognition, padahal efek testing ([Roediger & Karpicke 2006](https://journals.sagepub.com/doi/10.1111/j.1467-9280.2006.01693.x); [Karpicke & Roediger 2008, Science](https://web.mit.edu/educationgroup/HHMIEducationGroup/wp-content/uploads/2011/04/14-Karpicke-Roediger-2008.pdf)) menunjukkan retrieval aktif — bukan recognition berulang — yang mendorong retensi; gerbang L ≥ 0,6 menjaga urutan pedagogis (recall belum siap sebelum recognition stabil). Step-tutor rendering adalah titik di mana investasi A13 akhirnya menyentuh murid: granularitas langkah — bukan kefasihan bahasa — adalah sumber efek step-based d ≈ 0,76 vs answer-based d ≈ 0,31 ([VanLehn 2011](https://www.tandfonline.com/doi/abs/10.1080/00461520.2011.611369)). Semua state di kunci baru; `fiezel-sl-v1-state` dan `observability-privacy-test` tidak disentuh |

`adaptivity-simulation-v3.js` (C6) dijalankan ulang terhadap kebijakan Fase 3 dengan seed
yang sama — kalibrasi item dan gerbang cloze adalah kebijakan baru yang harus terbukti tidak
memperburuk `difficultyOscillationPer10`, `accuracyGapVsTarget`, retensi hari-90, dan Brier.

### 7.2 Gate baru Fase 3, per file test

**Status semua gate Fase 3: terdaftar per kontrak, dijalankan pada integrasi akhir.** Sama
seperti §5 dan §6.2, laporan ini tidak mengklaim satu pun hasil PASS/FAIL — penulisnya belum
melihat hasilnya, dan mengklaim PASS yang belum dilihat adalah persis dosa yang laporan ini
ada untuk mencegahnya.

| Gate | Pemilik | Yang dibuktikan bila lulus |
|---|---|---|
| `node tests/item-calibration-test.js` | C1 | `observe` murni dan tahan korup; langkah `Kb = 0,35/(1+0,08·n_i)` dikalikan κ; clamp `abs(delta) ≤ 0,6` dipegang di SETIAP update (bukan hanya di akhir); `effective` mengembalikan prior apa adanya (`applied:false`) selama `n_i < 8`; rationale `brain3_item_calibration_*` |
| `node tests/speaking-adaptive-test.js` | C2 | `policy` murni, satu dimensi naik per langkah; `evidence` mengembalikan κ ≤ 0,6 untuk SEMUA input (tidak ada jalur bukti speaking berbobot penuh); tidak ada dependensi audio/transkrip di API |
| `node tests/olm-test.js` | C3 | API `summarize` lama utuh; `negotiate` menghasilkan `remeasure` (probeCount 3) untuk klaim mastery/miskonsepsi dan `discount_evidence` untuk klaim memori; klaim disputed ditandai "sedang diukur ulang"; dispute tercatat dengan nowMs |
| `node tests/srl-coach-test.js` | C4 | `predictPrompt` maksimal 1 per sesi, hanya item ke-2..4, null saat `opts.affect` frustrated; `reflect` menghasilkan pesan kalibrasi Indonesia; fading 3-sesi-baik → 5 sesi diam (`brain3_srl_faded`) |
| `node tests/core-brain-v2-test.js` + `node tests/regression-test.js` | C5 | Modul absen = perilaku identik hari ini; mode cloze hanya menyajikan item ber-BKT L ≥ 0,6; `fiezel-sl-v1-state` tidak disentuh; `observability-privacy-test` tetap PASS (tanpa audio/transkrip) |
| `node adaptivity-simulation-v3.js` | C6 | Run berseed byte-identik; kebijakan Fase 3 tidak memperburuk `difficultyOscillationPer10`, `accuracyGapVsTarget`, retensi hari-90, dan Brier terhadap baseline Fase 2 |

Gate lama (§5, §6.2) tetap wajib PASS untuk semua agent C — regresi berarti perbaiki
pendekatan, bukan gate.

---

## 8. Roadmap sisa (pasca-Fase 3)

Tiga butir roadmap pasca-Fase 2 sudah diserap Fase 3, masing-masing dalam bentuk satu-perangkat
yang jujur: **kalibrasi Elo dua-sisi** kini kontrak C1 (dengan shrinkage keras δ=0,6 dan
gerbang n≥8 sebagai pagar divergensi), **speaking adaptif** kini kontrak C2 (varian tanpa-ASR,
agregat saja), dan **negotiated OLM** kini kontrak C3. Yang tersisa setelah Fase 3 hanyalah
hal-hal yang membutuhkan **data populasi** atau **keputusan produk** — bukan kode yang bisa
ditulis hari ini:

1. **Agregasi telemetri lintas-perangkat untuk kalibrasi item permanen.** Delta C1 di satu
   perangkat adalah koreksi lokal yang sengaja dikekang; kalibrasi item yang *permanen* butuh
   banyak murid. Opus sendiri menulis catatan kejujurannya: untuk satu siswa sinyal ini
   "terlalu noisy untuk diandalkan sebagai kalibrasi permanen" dan jalurnya adalah "feed ke
   pipeline konten, bukan langsung ke keputusan real-time siswa"
   (`../model-council-claude_opus_5_0.md` §2.3); literatur menyebut estimasi kesulitan item
   baru reliabel di kisaran 200–250 pelajar ([Pelánek](https://www.sciencedirect.com/science/article/abs/pii/S0360131511003058),
   dikutip `../model-council-claude_sonnet_5_0.md`). Ini keputusan produk (telemetri anonim
   antar-rilis vs tidak sama sekali), bukan pekerjaan brain.
2. **ASR on-device opt-in — bila suatu saat dibenarkan.** C2 sengaja hidup tanpa ASR baru.
   Sol membuka pintunya selebar satu kalimat: "opt-in local ONNX dapat diteliti kemudian,
   tetapi bukan dependency" (`../model-council-gpt_5_6_sol.md` §7.10) — dan argumen ukuran
   Opus C10 (puluhan MB runtime untuk keputusan regresi-logistik) tetap berlaku sampai ada
   bukti bahwa skor pelafalan mengubah keputusan pedagogis yang tidak bisa diubah oleh
   coverage. Bila dibenarkan: digerbang ganda (opt-in unduhan + confidence gate), hanya skor
   disimpan, mengikuti preseden neural voice.
3. **Evaluasi delayed post-test dunia nyata.** Semua metrik v3 hari ini adalah metrik
   simulator dan proxy sesi. Urutan bukti Sol §11.4 (`../model-council-gpt_5_6_sol.md`)
   berlaku sebelum brain diberi otoritas lebih: offline replay → shadow mode → bounded canary
   → micro-randomized comparison → **delayed post-test dan transfer sebagai outcome primer**
   → baru otoritas unlock/session-stop. Efek laboratorium (testing effect, interleaving)
   tidak boleh dianggap otomatis terjadi di FIEZEL — harus diukur pada retensi/transfer
   murid nyata ([evidence-based learning review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10368606/);
   [classroom interleaving study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969/)). Ini
   butuh murid, waktu kalender, dan keputusan produk tentang pengukuran — bukan modul baru.

---

## 9. Batas kejujuran laporan ini

Laporan ini ditulis oleh A15 (Fase 1), B8 (Fase 2), dan C7 (Fase 3), yang kepemilikannya
hanya file ini. Yang bisa dijamin: kontrak, alasan desain, dan daftar gate di atas akurat
terhadap [BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md), laporan council, dan temuan
simulator A11. Yang TIDAK bisa dijamin dari sini: bahwa implementasi paralel memenuhi
kontraknya. Itu tugas gate di §5, §6.2, dan §7.2 — dan sampai semuanya dijalankan pada
integrasi akhir dan PASS, status v3 yang jujur adalah **"dikontrak dan sedang dibangun"**,
bukan "selesai".

---

## 10. Wave D — audit menyeluruh & perbaikan (2026-08-28)

Setelah gelombang A/B/C, sepuluh auditor READ-ONLY menyisir seluruh repo pada branch
`audit-wave-d` (HEAD `f3d8659`), lalu sepuluh fixer mengeksekusi perbaikannya. Laporan
lengkap tiap audit ada di `/home/user/workspace/d-findings/` — ringkasan di bawah hanya
penunjuk, angkanya milik laporan sumber.

**Sepuluh audit (D1–D10), satu baris per temuan terpenting:**

| Audit | Temuan kunci | Sumber |
|---|---|---|
| D1 gate sweep | 168 gate dijalankan: 165 PASS, 3 FAIL dari SATU akar (needle literal `release-audit.py` basi terhadap `app.js` wave-D + domino + jendela proximity `tests/paw-mascot-test.js`); 1 gate yatim CI (`adaptivity-simulation-v3.js`) | `d-findings/D1-gate-sweep.md` |
| D2 kontaminasi konten | Angka §7 readiness report basi: listening MCQ nyatanya 100% EN (bukan 842), reading 1.024 soal ber-opsi EN, `evidence_mismatch` = 0 hari ini; 1.407 item listening tanpa penjelasan | `d-findings/D2-content-contamination.md` |
| D3 keamanan & privasi | 0 CRITICAL; 3 HIGH: tanpa CSP, `/api/auth/anon` tanpa rate limit, edge guard fail-open saat secret belum terpasang; nol secret hardcode | `d-findings/D3-security-privacy.md` |
| D4 performa | `app.js` 669 KB monolitik; `Intl.DateTimeFormat` dibuat per baris riwayat; 3× `save()` per jawaban | `d-findings/D4-performance.md` |
| D5 aksesibilitas & UX | Zoom dikunci total (gagal WCAG 1.4.4/1.4.10); `setApp()` tidak memindahkan fokus; `#app` live-region seluruh aplikasi; tap target 27–39 px | `d-findings/D5-a11y-ux.md` |
| D6 kode mati & wiring | 15 modul brain semua punya jalur runtime; beberapa ekspor layak di-wire (`topConfusions`, saran afek); bug `classroomBaseRenderer` menangkap pembungkusnya sendiri | `d-findings/D6-dead-code-wiring.md` |
| D7 PWA & offline | `fiezel-search.js` dimuat index.html tapi tidak dipre-cache (membeku lintas rilis); jendela campuran versi index-baru/app-lama; cache lama tak pernah dibersihkan (±152 MB/bump) | `d-findings/D7-pwa-offline.md` |
| D8 deploy Cloudflare/Puter | Core Worker deploy ke PUTER, bukan Cloudflare; `fiezel-api`/`fiezel-owner` TIDAK punya CI deploy — manual owner; semua workflow digerbang aktor `fitrajft-ux` | `d-findings/D8-cloudflare-deploy.md` |
| D9 kualitas grammar | 139 template: integritas referensial 100% bersih, tapi 4 item FATAL berjawaban ambigu (TA-006, GI-002, b4_003, b4_018) + tier distraktor tipis-penjaga | `d-findings/D9-grammar-quality.md` |
| D10 peta tabrakan | Kunci T-026 neural-voice (agent lain) tetap berlaku; `sw.js` disentuh 8 PR terbuka, `quality.yml` 5 — file panas yang hanya boleh diubah additive | `d-findings/D10-collision-map.md` |

**Sepuluh perbaikan (D11–D20), kepemilikan file eksklusif per fixer:**

| Fixer | Area (file yang dimiliki) | Perbaikan dari temuan |
|---|---|---|
| D11 | `grammar-templates.json`, `grammar-misconception-id.json`, `cloze-bank-v1.json` | 4 item fatal D9 + metadata + register `whyFailsId` |
| D12 | `reading-bank.json`, `reading-exam-v1.json` | 4 evidence ber-elipsis + kerangka item A1/A2 per rekomendasi D2 |
| D13 | `listening-bank-v1.json`, `listening-exam-v1.json` | Stem A1/A2 ke Indonesia + `explain` Indonesia (P0 D2) |
| D14 | `app.js` | Perf P0 D4, bug wiring D6, fokus & popup a11y D5 |
| D15 | `style.css` | Cincin fokus kontras, tap target ≥44 px, PRM, styling cloze/step-tutor (D5) |
| D16 | `index.html`, `sw.js`, zoom-lock | Precache `fiezel-search.js`, pembersihan cache lama, buka pinch-zoom, live region, CSP hati-hati (D7/D5/D3) |
| D17 | `workers/api/**`, `workers/owner/**` | Rate limit auth, edge guard fail-closed, hardening feedback (D3 HIGH-2/HIGH-3/MED-2) |
| D18 | Dokumen (laporan ini, readiness report, release notes) | Koreksi angka basi §7 + bagian ini + `WAVE-D-RELEASE-NOTES.md` |
| D19 | `.github/workflows/nightwatch.yml` (baru), `quality.yml` (additive) | Gate yatim masuk CI + suite malam berjadwal dengan pelaporan issue |
| D20 | `release-audit.py`, gate rapuh, `tools/release-check.js` (baru) | Needle basi → regex sah, assert proximity → struktural, registry blind spot, satu perintah cek rilis |

**Status jujur, dengan aturan yang sama seperti §5–§7:** perbaikan dieksekusi **paralel**
(bagian ini ditulis saat fixer lain masih bekerja), **gate final pada integrasi** — tidak
satu pun hasil PASS/FAIL pasca-perbaikan diklaim di sini. Ringkasan untuk owner, termasuk
risiko sisa dan daftar tindak lanjut yang ditunda, ada di
[WAVE-D-RELEASE-NOTES.md](WAVE-D-RELEASE-NOTES.md).
