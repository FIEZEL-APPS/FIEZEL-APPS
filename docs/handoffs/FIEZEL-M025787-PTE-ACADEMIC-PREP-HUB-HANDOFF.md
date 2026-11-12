# FIEZEL · Handoff: PTE Academic Preparation Hub & Big 4 Engine

**Build Milestone**: `m025-787`<br/>
**Authoring Worktree**: `feat/pte-academic-prep-hub` (`fiezel-pte-prep-8979c`)<br/>
**Target Level**: Vocational & Higher Ed Entry (Australian Subclass 500 Student Visa Target 42–58+)<br/>
**Authoring Session**: `8979cd84-d320-4043-80cf-c591935cf8b2`<br/>
**Authority**: Explicit OWNER / MASTER Authority Mandate (`m025-787`)<br/>
**Compliance**: `AGENTS.md` (Ironclad Scope Isolation, Live SSOT, Braincore Engine Authority, Multi-Agent Concurrency Protocol)<br/>
**Status**: 100% HIJAU & READY FOR VERIFICATION

---

## 1. Executive Summary & Educational Mission

Modul **PTE Academic Big 4 Prep Hub** adalah sistem persiapan ujian kecakapan bahasa Inggris Pearson Test of English (PTE) Academic berbasis komputer dan AI yang terintegrasi langsung ke dalam ekosistem FIEZEL.

Model penilaian silang (*cross-skill scoring*) Pearson membuktikan bahwa **70%–80% dari total skor PTE disumbangkan oleh hanya empat tipe soal ("The Big 4")**:
1. **Read Aloud (RA)**: Menyuplai poin besar ke Speaking dan Reading.
2. **Repeat Sentence (RS)**: Menyuplai poin masif ke Speaking dan Listening.
3. **Describe Image (DI)**: Menyuplai poin kelancaran dan keyword ke Speaking.
4. **Write from Dictation (WFD)**: *Kingmaker task* yang menyuplai payload terbesar ke Listening dan Writing.

Dengan menguasai keempat tipe soal ini, murid dijamin mencapai target benchmark **PTE 42** (setara IELTS 5.5, syarat mutlak visa pelajar Australia Subclass 500 dan penerimaan kampus vokasi seperti Commercial Cookery & Hospitality di AILFE Perth) tanpa kelelahan kognitif pada tipe soal bernilai rendah.

---

## 2. Arsitektur & Berkas yang Disentuh

| Komponen | Berkas | Peran & Tanggung Jawab |
| --- | --- | --- |
| **Scoring Engine** | `features/pte/fiezel-pte-engine.js` | Mesin penilaian deterministik Pearson: Zero-Content Rule (jika konten 0, fluency=0, pronunciation=0, skor Pearson=10), Nakul Golden 50% Rule (match >=50% menyumbang raw score 8-11/13 -> skor 42-68, lolos Target 42), Levenshtein token alignment, Word Error Rate (WER), evaluasi WPM cadence & jeda, deteksi keyword tag diagram, diagnostik salah eja (*misconception ledger*), dan kalkulasi skor komposit Pearson 10–90. |
| **Tactile UI** | `features/pte/fiezel-pte-ui.js` | Antarmuka simulasi ujian Pearson: tab selector Big 4, hitung mundur persiapan, nada beep Web Audio 1000Hz, aturan 3 detik hening, integrasi `PteMicBridge` dengan Web Audio `createAnalyser` & live pulsating green VU meter bar (`#fzPteMicMeterFill`), audio neural pipeline dari Kawan Bicara (`FiezelChatVoice`), toggle contekan template hafalan, dan scorecard diagnostik. |
| **Styling** | `features/pte/pte-tactile.css` | Desain tactile clay independen: kartu kontras tinggi, kotak status Pearson resmi (`Beginning in...`, `Recording...`, `Completed`), bar waktu animasi, ring target gauge, dan chip diferensiasi kata. |
| **Bank Soal RA** | `content/pte/pte-read-aloud.json` | Kumpulan teks sains, sejarah, dan vokasi berfrekuensi berulang tinggi lengkap dengan tanda nafas (`//`) dan tips fonetik. |
| **Bank Soal RS** | `content/pte/pte-repeat-sentence.json` | 27 kalimat akademik dan administrasi kampus resmi dengan transkrip, durasi audio, `wordCount`, dan kata kunci konten. |
| **Bank Soal DI** | `content/pte/pte-describe-image.json` | Diagram bar chart, line graph, pie chart, dan proses HACCP dapur komersial dalam format SVG responsif. |
| **Bank Soal WFD** | `content/pte/pte-write-dictation.json` | 25 kalimat dikte asli Pearson dengan daftar jebakan ejaan umum (*accommodation*, *hygiene*, *necessary*, *successful*) dan tips Nakul Extra Words Hack. |
| **Bank Soal Reading FIB** | `content/pte/pte-reading-fib.json` | 20 reading fill-in-the-blanks teks akademik dengan dropdown options dan structured `deepFeedback` (3-Second Grammar Formula, Collocations, Linking Words, Distractor Analysis, Translation). |
| **Bank Soal Drag & Drop** | `content/pte/pte-reading-drag-drop.json` | 16 teks akademik dengan word pool dan penjelasan grammar. |
| **Bank Soal Listening FIB** | `content/pte/pte-listening-fib.json` | 16 audio-driven blanks dengan transkrip dan pedoman ejaan. |
| **Universal Templates** | `content/pte/pte-templates.json` | Template hafalan resmi FIEZEL untuk Describe Image, Retell Lecture, Summarize Written Text, dan Write Essay. |
| **Routing & App** | `app.js` | Mendaftarkan `'pte'` di `VALID_VIEWS`, `TAB_PARENT`, kartu di `latihanCards()` saat kursus Inggris aktif, parameter pintasan `?pte=1` di `openApp()`, dan integrasi tombol back topbar ke `latihan`. Nol sentuhan ke modul auth/onboarding. |
| **Cangkang & PWA** | `index.html`, `sw.js` | Memuat `fiezel-chat-voice.js` untuk menyediakan audio neural multi-persona tanpa browser `speechSynthesis`, serta mendaftarkan seluruh aset di array `ASSETS` Service Worker untuk kesiapan luring (offline-ready). |
| **Pengujian** | `tests/pte-academic-engine-test.js`<br>`tests/pte-bank-integrity-test.js` | 59 pengujian komprehensif (29 engine tests + 30 bank integrity tests) menguji seluruh algoritma penilaian, bank JSON, dan pendaftaran di `quality.yml`. |

---

## 3. Fitur Kemiripan 1:1 Resmi Pearson PTE Academic

Sesuai arahan resmi pengguna, modul mengimplementasikan pilar kemiripan resmi peramban Pearson:

1. **Neural Voice Pipeline (Wired from Kawan Bicara)**:
   - Seluruh prompt audio (RS, WFD, RL, SST, LF, HIW) disintesis menggunakan `FiezelChatVoice` multi-persona (`aria` pendidik wanita, `guy` dosen pria) melalui Edge Neural / Puter.
   - Nol ketergantungan pada browser robotik `window.speechSynthesis`.
2. **Hardware Mic Priming & Real-Time VAD Meter**:
   - `PteMicBridge` menginisialisasi `getUserMedia` + Web Audio `AudioContext` + `createAnalyser()`.
   - Real-time RMS volume menggerakkan bar meter hijau menyala (`#fzPteMicMeterFill`) di dalam bubble pengenalan suara.
   - Watchdog hening 3.2 detik otomatis mengunci mikrofon jika murid terdiam setelah tone beep.
   - Auto-commit otomatis setelah jeda hening 2.4 detik pasca-berbicara.
3. **Kalibrasi Penilaian Skor Pearson Otentik**:
   - **Zero-Content Rule**: Jika kata kunci tidak terdeteksi (content = 0), kelancaran dan pengucapan otomatis 0, dan total skor di-cap pada baseline Pearson 10.
   - **Nakul Golden 50% Rule**: Murid yang berhasil menangkap minimal 50% kata kalimat (5-6 kata pertama) secara lancar tanpa berhenti langsung mendapatkan 2/3 poin konten dan kelancaran penuh (skor Pearson 42–68, lolos Target 42).
4. **Nada Beep 1000Hz Web Audio**:
   - Tepat saat hitung mundur persiapan menyentuh angka 0, osilator Web Audio membunyikan nada murni 1000Hz selama 200ms sebelum mikrofon mulai mendengarkan.
5. **Pearson Status Box Sequence**:
   - `Beginning in X seconds...` dengan bar waktu kuning saat persiapan.
   - `Recording...` dengan bar waktu biru bergerak dan indikator denyut saat berbicara.
   - `Completed` dengan bar hijau saat waktu habis atau jawaban dikirim.

---

## 4. Bukti Pengujian & Gerbang Mutu Lokal

Seluruh gerbang mutu lokal dijalankan dan lulus 100% HIJAU:

```bash
cd C:\Users\hp\fiezel-pte-prep-8979c
node tests/gate-registry-test.js           # 10 pass, 0 fail (434 invokasi workflow, 432 bukti)
node tests/pte-academic-engine-test.js      # 29 pass, 0 fail
node tests/pte-bank-integrity-test.js       # 30 pass, 0 fail
node tests/id-golden-snapshot-test.js       # HIJAU (baseline emas Indonesia utuh)
node tests/th-ui-leak-test.js               # PASS (nol kebocoran di mode Thai)
node tests/curriculum-cache-version-test.js # OK (build m025-787)
node tests/audio-locale-guard-test.js       # PASS (nol speechSynthesis di zona audio)
node tools/bump-build.mjs --check           # Selaras (6 titik hexa-sync m025-787)
node tools/dev/pte_full_verification_probe.mjs # ALL BROWSER PLAYWRIGHT PROBE AUDITS PASSED
```

---

## 5. Keselarasan Hexa-Sync Rilis

Nomor build resmi telah diverifikasi pada **`m025-787`** melalui arbiter `tools/bump-build.mjs`:
- `coordination/BUILD-VERSION.json`: `"m025-787"`
- `sw.js`: `"m025-787"`
- `core-config.js`: `"m025-787"`
- `features/neural-voice/fiezel-diag-panel.js`: `"m025-787"`
- `kurikulum.html`: `?v=m025-787`
- `misi.html`: `?v=m025-787`
- `index.html`: `data-fz-build="m025-787"`

---

## 6. Next-Step Roadmap & Continuous Evolution

1. **Uji Langsung Siswa (Fitra Rusdiawan)**:
   - Menjalankan latihan Repeat Sentence dan Write from Dictation harian via `http://localhost:4173/?pte=1` dengan headphone mikrofon eksternal.
2. **Braincore Bayesian Knowledge Tracing**:
   - Memantau akumulasi penguasaan kosakata akademik PTE (`updateMastery('pte', ...)`) dan ledger miskonsepsi ejaan.
3. **Simulasi Full-Length Mock Exam**:
   - Mengembangkan mode timer gabungan beruntun (Speaking + Writing 54-67 menit) pada rilis berikutnya.
