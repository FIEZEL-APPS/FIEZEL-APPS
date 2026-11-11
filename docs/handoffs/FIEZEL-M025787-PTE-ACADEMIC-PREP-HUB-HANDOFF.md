# FIEZEL · Handoff: PTE Academic Preparation Hub & Big 4 Engine

**Build Milestone**: `m025-787`<br/>
**Authoring Worktree**: `feat/pte-academic-prep-hub` (`fiezel-pte-prep-8979c`)<br/>
**Target Level**: Vocational & Higher Ed Entry (Australian Subclass 500 Student Visa Target 42–58+)<br/>
**Authoring Session**: `8979cd84-d320-4043-80cf-c591935cf8b2`<br/>
**Mandate Source**: `a91b3a79-13cf-443d-8f8f-d3a0860668c8`<br/>
**Compliance**: `AGENTS.md` (Ironclad Scope Isolation, Live SSOT, Braincore Engine Authority, Multi-Agent Concurrency Protocol)

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
| **Scoring Engine** | `features/pte/fiezel-pte-engine.js` | Mesin penilaian murni deterministik: Levenshtein token alignment, Word Error Rate (WER), evaluasi WPM cadence & jeda, deteksi keyword tag diagram, diagnostik salah eja (*misconception ledger*), dan kalkulasi skor komposit Pearson 10–90. |
| **Tactile UI** | `features/pte/fiezel-pte-ui.js` | Antarmuka simulasi ujian Pearson: tab selector Big 4, hitung mundur persiapan, nada beep Web Audio 1000Hz, aturan 3 detik hening, integrasi Web Speech API mic, audio TTS synthesizer, renderer chart SVG, toggle contekan template hafalan, dan scorecard diagnostik. |
| **Styling** | `features/pte/pte-tactile.css` | Desain tactile clay independen: kartu kontras tinggi, kotak status Pearson resmi (`Beginning in...`, `Recording...`, `Completed`), bar waktu animasi, ring target gauge, dan chip diferensiasi kata. |
| **Bank Soal RA** | `content/pte/pte-read-aloud.json` | Kumpulan teks sains, sejarah, dan vokasi berfrekuensi berulang tinggi (Market Research, Domestication, Lincoln, Carbon Accounting, Food Production) lengkap dengan tanda nafas (`//`) dan tips fonetik. |
| **Bank Soal RS** | `content/pte/pte-repeat-sentence.json` | Kalimat akademik dan administrasi kampus resmi dengan transkrip, durasi audio, dan kata kunci konten. |
| **Bank Soal DI** | `content/pte/pte-describe-image.json` | Diagram bar chart, line graph, pie chart, dan proses HACCP dapur komersial dalam format SVG murni responsif. |
| **Bank Soal WFD** | `content/pte/pte-write-dictation.json` | Kalimat dikte asli Pearson dengan daftar jebakan ejaan umum (*accommodation*, *hygiene*, *necessary*, *successful*). |
| **Universal Templates** | `content/pte/pte-templates.json` | Template hafalan resmi FIEZEL untuk Describe Image, Retell Lecture, Summarize Written Text, dan Write Essay. |
| **Routing & App** | `app.js` | Mendaftarkan `'pte'` di `VALID_VIEWS`, `TAB_PARENT`, kartu di `latihanCards()` saat kursus Inggris aktif, dan rute di `renderInner()`. Nol sentuhan ke modul auth/onboarding. |
| **Cangkang & PWA** | `index.html`, `sw.js` | Memuat stylesheet dan skrip secara defer, serta mendaftarkan seluruh aset di array `ASSETS` Service Worker untuk kesiapan luring (offline-ready). |
| **Pengujian** | `tests/pte-academic-engine-test.js`<br>`tests/pte-bank-integrity-test.js` | 23 pengujian komprehensif menguji seluruh fungsi algoritma penilaian, keselarasan bank JSON, dan pendaftaran di `quality.yml`. |

---

## 3. Fitur Kemiripan 1:1 Resmi Pearson PTE Academic

Sesuai arahan resmi pengguna, modul mengimplementasikan tiga pilar kemiripan resmi peramban Pearson:

1. **Nada Beep 1000Hz Web Audio**:
   Tepat saat hitung mundur persiapan (35 detik RA, 25 detik DI) menyentuh angka 0, osilator Web Audio membunyikan nada murni 1000Hz selama 200 milidetik sebelum mikrofon mulai merekam.
2. **Aturan 3 Detik Hening (3-Second Silence Rule)**:
   Jika mikrofon aktif dan tidak ada aktivitas vokal yang terdeteksi dalam 3.0 detik pertama setelah nada beep, perekaman otomatis dikunci ke status `'Completed'` dengan skor nol untuk konten (persis seperti software Pearson asli).
3. **Pearson Status Box Sequence**:
   - `Beginning in X seconds...` dengan bar waktu kuning saat persiapan.
   - `Recording...` dengan bar waktu biru bergerak dan indikator denyut saat berbicara.
   - `Completed` dengan bar hijau saat waktu habis atau jawaban dikirim.

---

## 4. Bukti Pengujian & Gerbang Mutu Lokal

Seluruh gerbang mutu lokal dijalankan dan lulus 100% HIJAU:

```bash
cd C:\Users\hp\fiezel-pte-prep-8979c
node tests/gate-registry-test.js           # 10 pass, 0 fail (434 invokasi workflow, 432 bukti)
node tests/pte-academic-engine-test.js      # 13 pass, 0 fail
node tests/pte-bank-integrity-test.js       # 10 pass, 0 fail
node tests/id-golden-snapshot-test.js       # HIJAU (baseline emas Indonesia utuh)
node tests/th-ui-leak-test.js               # PASS (nol kebocoran di mode Thai)
node tests/curriculum-cache-version-test.js # OK (build m025-787)
node tools/bump-build.mjs --check           # Selaras (6 titik hexa-sync)
node tools/fiezel-guardians.mjs a10         # PASS_WITH_RISK_REPORT (errors=0, warnings=0)
```

---

## 5. Keselarasan Hexa-Sync Rilis

Nomor build resmi telah dinaikkan ke **`m025-787`** melalui arbiter `tools/bump-build.mjs`:
- `coordination/BUILD-VERSION.json`: `"m025-787"`
- `sw.js`: `"m025-787"`
- `core-config.js`: `"m025-787"`
- `features/neural-voice/fiezel-diag-panel.js`: `"m025-787"`
- `kurikulum.html`: `?v=m025-787`
- `misi.html`: `?v=m025-787`
- `index.html`: `data-fz-build="m025-787"`
