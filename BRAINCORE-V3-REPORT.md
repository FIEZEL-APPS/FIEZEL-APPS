# Braincore v3 — Laporan Upgrade

**Basis:** FIEZEL 5.19.0 · **Tanggal:** 2026-08-28 · **Status:** kontrak final, implementasi paralel berjalan — hasil test BELUM diverifikasi di dokumen ini

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
node core-brain-v2-test.js       # 31 gate keputusan v2
node tutor-brain-v3-test.js      # gate tutor (A2 boleh perbarui gate yang menguji defek terverifikasi)
node regression-test.js          # regresi aplikasi
```

Gate baru per kontrak (satu file test Node mandiri per modul, pola `core-brain-v2-test.js`,
baris akhir `<Nama>: PASS`):

```bash
node core-brain-v3-upgrade-test.js    # FSRS-lite + kompat halfLife
node misconception-ledger-test.js     # posterior log-odds, gate ≥3 bukti/≥2 sesi
node misconception-taxonomy-test.js   # 416 string → ≤50 kode, nol yatim
node item-prior-test.js               # difficulty kontinu, MODE_COST 25 mode
node confusion-matrix-test.js         # matriks 139×139 dari optionSources
node olm-test.js                      # ringkasan OLM + coaching kalibrasi
node affect-test.js                   # 5 keadaan, minimum bukti, histeresis
node mastery-bkt-test.js              # BKT + frontier 0,55–0,90
node evidence-credibility-test.js     # κ: guess 0,3, langLoad 0,45, mismatch 0
node step-tutor-test.js               # langkah dari reasoningOperation
node production-grader-test.js        # normalisasi + edit distance ≤1
node adaptivity-simulation-v3.js      # simulasi berseed dengan metrik hasil
```

Dua gate yang menurut probe council **gagal hari ini** dan wajib lulus di v3: "kolam dengan
target berbeda harus berbeda ≥40%" (membantah D1) dan "kenaikan session size survive
integrasi" (kenaikan dari momentum tertelan `min()` di `refinePolicy`).

---

## 6. Roadmap sisa (Fase 2–3 sintesis council)

Yang di atas adalah Fase 0–1 (perbaikan defek + fondasi bukti + model murid awal). Yang
sengaja ditunda, berurut:

1. **Single-writer memory penuh** — satu mesin DSR/FSRS-lite sebagai satu-satunya penulis
   `nextReview` di seluruh aplikasi, dengan gate "hanya satu penulis"; hari ini masih ada dua
   definisi memori (v1 otoritas, v2 advisory) yang bentuk fungsionalnya pun berbeda.
2. **Kalibrasi Elo dua-sisi** — estimasi kesulitan item online berdampingan dengan prior
   konten (shrinkage δ=0,6 usulan Opus). Ditunda dengan mata terbuka: Sonnet mengutip risiko
   divergensi pada perangkat tunggal ([Keeping Elo Alive](https://pubmed.ncbi.nlm.nih.gov/40476309/))
   dan menyarankan menjadikannya feed pipeline konten antar-rilis dulu, bukan keputusan
   real-time. Keputusan final menunggu data κ dari Fase 1.
3. **Listening/speaking adaptif** — listening bisa diadaptasi tanpa model apa pun (kecepatan
   putar, jumlah replay, panjang klip sebagai variabel kesulitan); speaking butuh ASR
   on-device opt-in dengan hanya skor yang disimpan, audio dibuang segera. Keduanya digerbang
   ganda (opt-in + confidence) dan **ditahan sampai audit polusi bahasa Inggris konten
   listening selesai** — 842 pertanyaan berbahasa Inggris membuat bukti dari domain itu belum
   layak dipercaya, persis alasan §7 laporan readiness v2.

---

## 7. Batas kejujuran laporan ini

Laporan ini ditulis oleh A15, yang kepemilikannya hanya file ini. Yang bisa dijamin: kontrak,
alasan desain, dan daftar gate di atas akurat terhadap [BRAINCORE-V3-CONTRACTS.md](BRAINCORE-V3-CONTRACTS.md)
dan laporan council. Yang TIDAK bisa dijamin dari sini: bahwa implementasi paralel memenuhi
kontraknya. Itu tugas gate di §5 — dan sampai semuanya dijalankan pada integrasi akhir dan
PASS, status v3 yang jujur adalah **"dikontrak dan sedang dibangun"**, bukan "selesai".
