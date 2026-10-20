# FIEZEL HANDOFF DOSSIER: M025-617
## Porting Arsitektur Voice Call Google AI Studio ke FIEZEL Vanilla PWA
### (Pedagogical Linguistic Analyzer, Braincore BKT/IRT Linkage, Persona Multikarakter, & Anti-Leak Exam Purity)

- **Nomor Dokumen**: `FIEZEL-M025617-VOICE-CALL-AI-STUDIO-PORT-HANDOFF`
- **Nomor Build Hexa-Sync**: `m025-617` (Branch: `feat/voice-call-ai-studio-port-m025-617`)
- **Tanggal Rilis**: 20 Oktober 2026
- **Status Mutu**: 100% Lulus Seluruh Gerbang Mutu Lokal & Probe Empiris Playwright (19/19 PASS)

---

### 1. Ringkasan Eksekutif & Tujuan Perubahan

Sebagai bagian dari evolusi pedagogis FIEZEL, fitur **Panggilan Suara (Kawan Bicara)** telah di-porting secara menyeluruh dari arsitektur percakapan suara **Google AI Studio Voice Call Architecture** ke lingkungan aplikasi web progresif (Vanilla PWA) FIEZEL.

Sebelum pembaruan ini, panggilan suara beroperasi sebagai percakapan terbuka umum tanpa kontrol pedagogis terstruktur:
1. **Ketiadaan Hubungan Kurikuler**: Latihan berbicara tidak terhubung ke parameter kemampuan murid di Braincore Engine (BKT & IRT 3PL).
2. **Kelemahan Evaluasi Tatabahasa (Dumb-Down Feedback)**: Model bahasa generatif rentan memuji kalimat yang memiliki kesalahan sintaksis atau morfologi fatal, atau membalas secara fiktif tanpa menunjuk miskonsepsi nyata.
3. **Ketiadaan Pembatasan Prasyarat (Smart Prerequisite Bypass)**: Murid dipaksa atau diizinkan masuk ke topik pembicaraan tingkat menengah tanpa validasi penguasaan kosa kata prasyarat.
4. **Kebocoran Informasi pada Mode Ujian (Exam Leakage)**: Mode ukur kemampuan formal tidak terisolasi dari kartu petunjuk, tombol intip, atau bocoran kalimat.

Porting arsitektur ini menghadirkan:
- **5 Skenario Pedagogis Kanonikal Bilingual (ID & TH)** dengan tingkat kesulitan IRT $b$, kompetensi BKT spesifik, target pola sintaksis, dan prasyarat kosa kata.
- **4 Persona Suara Multikarakter** (Coach Alex, Coach Sarah, Sensei Nanami, Keita Senpai) dengan pemetaan suara Edge TTS Neural dan Gemini Live Voice IDs.
- **Pedagogical Linguistic Analyzer Deterministik**: Penilai tatabahasa presisi tinggi dengan taksonomi miskonsepsi morfologi dan sintaksis untuk bahasa Inggris dan Jepang.
- **Invarian Pedagogis Ketat**: Penegakan *Zero-Dumbing Invariant* (haram memuji jawaban salah), *Zero-Loss Input* (transkrip verbatim murid wajib ditampilkan), dan *Strict Anti-Leak Exam Purity* (mode ujian bebas bocoran).
- **Komponen Visual Cyber Topo**: 5-Bar Kinetic Waveform Equalizer, Lencana Skenario & BKT Theta, Laci Prasyarat Kosa Kata, Kartu Diagnosis Miskonsepsi Real-Time, serta Sample Prompt Chips interaktif.

---

### 2. Rincian Arsitektur & Modul Sistem

Sistem Voice Call AI Studio di-porting ke dalam arsitektur modular nir-ketergantungan framework (Vanilla JavaScript UMD):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIEZEL VANILLA PWA RUNTIME                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ fiezel-voice-scenarios.js ]          [ fiezel-voice-pedagogy.js ]        │
│   • 5 Canonical Scenarios                • Deterministic Linguistic Parser  │
│   • 4 Canonical Personas                 • Misconception Taxonomy           │
│   • IRT 3PL Difficulty (b) & BKT Link    • Zero-Dumbing Rule Engine         │
│   • Smart Prerequisite Bypass (P >= 0.6) • BKT / IRT Telemetry Dispatcher   │
│   • Anti-Leak Exam Purity Metadata       • Misconception Ledger Persistence │
│                 │                                      │                    │
│                 ▼                                      ▼                    │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │             features/interactive-chat/fiezel-voice-call.js    │           │
│  │   • Hands-Free Turn Engine & Acoustic Refractory Window      │           │
│  │   • Kinetic Waveform Equalizer (5-Bar Live Audio Modulation) │           │
│  │   • Scenario Meta Badge (Level, b, IRT P(θ), BKT Theta)      │           │
│  │   • Prerequisite Warmup Drawer with Mastery Unlock Flow      │           │
│  │   • Real-Time Diagnosis Card (User Exact, whyFails, Fix)     │           │
│  │   • Interactive Sample Prompt Chips (Accurate/Misconception) │           │
│  │   • Anti-Leak Exam Purity Mode (Auto-Hides Hints & Prompts)  │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                 ▲                                      ▲                    │
│                 │                                      │                    │
│  [ fiezel-interactive-chat.js ]          [ interactive-chat.css ]           │
│   • Scenario Catalog Integration          • Cyber Topo Glassmorphism        │
│   • Offline Chat Fallback Augmentation    • Waveform Keyframe Animations    │
│   • Multi-Character Tone Matching         • Diagnosis & Prereq Overlay Skin │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.1. `features/interactive-chat/fiezel-voice-scenarios.js`
Modul penyimpan bank skenario dan profil persona resmi:
- **5 Skenario Kanonikal**:
  1. `scen_en_a2_cafe`: "Memesan Kopi & Menjelaskan Rencana Sore" (CEFR A2, $b=2.1$, Persona: Coach Alex, Kompetensi: `speak_en_a2_cafe`, Prasyarat: `vocab_daily_a2`). Pola target: *Would like* dan *Present Continuous* untuk jadwal dekat.
  2. `scen_en_a2_past_trip`: "Menceritakan Pengalaman Perjalanan Akhir Pekan" (CEFR A2, $b=2.5$, Persona: Coach Alex, Kompetensi: `speak_en_a2_past_trip`, Prasyarat: `vocab_travel_a2`). Pola target: *Simple Past Tense* kata kerja tak beraturan (*went, saw, bought, ate*).
  3. `scen_en_b2_ielts_exam`: "Simulasi Ujian IELTS Speaking Part 3: Kerja Jarak Jauh" (CEFR B2 EXAM, $b=3.6$, Persona: Coach Sarah, Kompetensi: `speak_en_b2_ielts_part3`, Prasyarat: `vocab_academic_b1`, `isMeasureExam: true`). Pola target: Klausa konsesif (*Although, While, Whereas*) dan penalaran akademik terstruktur.
  4. `scen_ja_n5_kissaten`: "Kaiwa N5: Memesan di Kissaten Tokyo" (JLPT N5, $b=2.0$, Persona: Sensei Nanami, Kompetensi: `speak_ja_n5_kissaten`, Prasyarat: `vocab_ja_cafe_n5`). Pola target: Partikel objek を ($o$), penghitung bilangan hitotsu/futatsu, dan permohonan sopan ～をください / ～をお願いします.
  5. `scen_ja_n4_senpai`: "Kaiwa N4: Konsultasi Jadwal Kuliah dengan Keita Senpai" (JLPT N4, $b=2.9$, Persona: Keita Senpai, Kompetensi: `speak_ja_n4_senpai_advice`, Prasyarat: `vocab_ja_campus_n4`). Pola target: Alasan sopan ～ので ($node$) dan meminta saran ～たらいいですか ($tara\ ii\ desu\ ka$).
- **4 Persona Suara Kanonikal**:
  - `coach_alex`: Pria penutur asli hangat (Edge: `en-US-GuyNeural`, Gemini: `Puck`).
  - `coach_sarah`: Penguji IELTS/TOEFL berartikulasi tajam (Edge: `en-US-AriaNeural`, Gemini: `Kore`).
  - `nanami`: Guru bahasa Jepang lembut dan sopan desu/masu (Edge: `ja-JP-NanamiNeural`, Gemini: `Kore`).
  - `keita`: Mahasiswa senior Tokyo ramah dan suportif (Edge: `ja-JP-KeitaNeural`, Gemini: `Charon`).
- **Smart Prerequisite Bypass (`checkPrerequisiteStatus`)**:
  - Mengevaluasi $P(L_t)$ kompetensi kosa kata prasyarat terhadap ambang batas $\ge 0.60$.
  - Bila murid sudah menguasai materi ($P(L_t) \ge 0.60$), skenario langsung terbuka tanpa mewajibkan drill kosa kata berulang.
  - Bila murid belum siap ($P(L_t) < 0.60$), laci prasyarat muncul menampilkan daftar kata kunci, contoh kalimat, dan tombol pemanasan kilat `recordVocabPrereqMastery()`.
- **Strict Anti-Leak Exam Purity (`isMeasureExam: true`)**:
  - Menandai skenario ujian formal (seperti IELTS Speaking Part 3).

#### 2.2. `features/interactive-chat/fiezel-voice-pedagogy.js`
Mesin penganalisis tatabahasa deterministik dan ledger miskonsepsi Braincore:
- **Analisis Morfologi & Sintaksis Tanpa Halusinasi**:
  - *Morfologi Bahasa Inggris*: Mendeteksi overregularization bentuk lampau (*goed* $\to$ *went*, *buyed* $\to$ *bought*, *eated* $\to$ *ate*, *seed* $\to$ *saw*) dengan `misconceptionId: 'past_tense_irregular_<verb>'`.
  - *Sintaksis Kata Kerja Statif & Kopula*: Mendeteksi "I am want", "I am like", dan "I am agree" (`misconceptionId: 'be_plus_base_verb_agree'`), mengoreksi bahwa "agree" adalah kata kerja mandiri bukan kata sifat.
  - *Klausa Konsesif Ganda*: Mendeteksi kesalahan sintaksis "Although..., but..." dan menghilangkan redundansi kata sambung.
  - *Konjugasi Bahasa Jepang*: Mendeteksi kesalahan kondisional ～たら dari bentuk kamus (e.g. 勉強するたら $\to$ 勉強したら) dengan `misconceptionId: 'ja_tara_conjugation_error'`.
  - *Partikel & Kopula Bahasa Jepang*: Mendeteksi kesalahan partikel objek langsung (menggunakan に alih-alih を) dan penempelan です pada kata kerja kamus (e.g. 飲むです $\to$ 飲みます) dengan `misconceptionId: 'ja_particle_o_and_desu_verb'`.
- **Invarian Anti-Dumbing (Zero-Dumbing Invariant)**:
  - DILARANG KERAS memuji kalimat keliru dengan pujian hampa.
  - Jika `ok === false`, sistem menghasilkan `whyFailsId` spesifik yang menjelaskan alasan logis kegagalan gramatika dan `syntacticCorrection` kalimat yang tepat.
- **Invarian Tanpa Kehilangan Input (Zero-Loss Input)**:
  - Transkrip asli yang diucapkan murid (`userExactTranscript`) diawetkan secara utuh dan ditampilkan pada kartu diagnosis.
- **Integrasi Braincore BKT & IRT 3PL**:
  - Menghitung pembaruan Bayesian Knowledge Tracing ($P(L_{t+1})$) menggunakan formula analitik BKT FIEZEL ($P(S)=0.10, P(G)=0.20, P(T)=0.18$).
  - Menghitung estimasi kemampuan $\theta$ murid pasca-ujaran dan memperbarui probabilitas keberhasilan item IRT 3PL $P(\theta) = c + (1-c)\frac{1}{1 + e^{-a(\theta - b)}}$.
  - Mencatat histori kegagalan secara persisten ke `fiezel-misconception-ledger-v1`.

#### 2.3. `features/interactive-chat/fiezel-voice-call.js`
Pembaruan antarmuka dan orkestrasi panggilan suara:
- **Lencana Skenario & Telemetri**: Menampilkan label level CEFR/JLPT, indikator status latihan vs ujian, parameter kesulitan IRT ($b$), dan estimasi $\theta$.
- **Laci Prasyarat Kosa Kata (`.fzc-call-prereq-overlay`)**: Ditampilkan jika prasyarat $P(L_t) < 0.60$ belum terpenuhi, lengkap dengan kosa kata kunci dan tombol satu sentuhan untuk menyelesaikan pemanasan.
- **Kartu Diagnosis Pedagogis Real-Time (`.fzc-call-diag-card`)**:
  - Mode Sukses (`.is-success`): Menampilkan pujian otentik bila kalimat akurat secara gramatika.
  - Mode Miskonsepsi (`.is-error`): Menampilkan transkrip verbatim murid, alasan kegagalan linguistik (`.fzc-call-diag-why`), dan saran perbaikan sintaksis (`.fzc-call-diag-fix`).
- **Sample Prompt Chips (`.fzc-call-sample-chip`)**:
  - Disediakan pada mode latihan dengan warna dan tag semantik: Hijau (`intent-accurate`), Merah (`intent-misconception`), Oranye (`intent-incomplete`).
  - Mengetuk chip secara instan menguji loop pedagogis tanpa perlu mengetik atau membaca naskah luar.
- **Penegakan Anti-Leak Exam Purity**:
  - Saat `state.isMeasureExam === true`, container sample prompt chips otomatis dibersihkan dan diganti dengan lencana `🎯 Mode Ujian Aktif: Petunjuk & contoh kalimat disembunyikan untuk kalibrasi IRT objektif.`
- **Kinetic Waveform Equalizer (`.fzc-voice-wave`)**:
  - 5 batang bar kinetik yang bergerak mengikuti level desibel normalized RMS mikrofon murid secara *real-time* dengan transisi status: `.is-connecting`, `.is-listening`, `.is-thinking`, `.is-speaking`.

#### 2.4. `features/interactive-chat/fiezel-interactive-chat.js`
- Menambahkan 5 skenario kanonikal ke dalam katalog skenario obrolan (`INTERACTIVE_SCENARIOS`) lengkap dengan target goals, pembuka percakapan beraksara furigana, catatan tata bahasa, dan saran respons.
- Menghubungkan metadata persona suara dan penanda `isMeasureExam` ke alur chat teks.

#### 2.5. `features/interactive-chat/interactive-chat.css`
- Gaya visual kaca gelap bernuansa futuristik (Cyber Topo Glassmorphism):
  - `.fzc-voice-wave` & `.fzc-wave-bar`: Equalizer gelombang suara dengan aksen neon cyan (`#00E5FF`), hijau emerald (`#10B981`), amber (`#F59E0B`), dan coral (`#E04858`).
  - `.fzc-call-scenario-badge`: Desain kapsul metalik semi-transparan dengan border aksen.
  - `.fzc-call-diag-card`: Kartu umpan balik dengan border merah karang (`#EF4444`) saat salah dan hijau emerald (`#10B981`) saat akurat.
  - `.fzc-call-sample-chip`: Chip tombol respons cepat dengan efek transisi sentuh halus.
  - `.fzc-call-prereq-overlay`: Modal laci prasyarat dengan backdrop blur dan tipografi berhierarki tinggi.

---

### 3. Bukti Pengujian Empiris Nyata (Quality Gate & Empirical Verification)

Pengujian kualitas dilakukan secara berjenjang melalui pengujian unit logika nir-DOM dan pengujian otomatisasi peramban sesungguhnya (Headless Chromium Playwright).

#### 3.1. Pengujian Integrasi Unit (`node tests/voice-call-ai-studio-port-test.js`)
Semua assertion lulus 100%:
```text
=== FIEZEL AI STUDIO VOICE CALL PORT INTEGRATION TEST ===

--- 1. Scenario & Persona bank integrity ---
✓ All 5 scenarios and 4 personas validated with exact edgeVoice and geminiVoice configs.

--- 2. Smart Prerequisite Bypass ---
✓ Smart Prerequisite Bypass correctly respects P(L) >= 0.60 threshold and live mastery updates.

--- 3. Anti-Leak Exam Purity ---
✓ Anti-Leak Exam Purity flag accurately isolates Measure Mode exams from practice sessions.

--- 4. Pedagogical Linguistic Analyzer ---
  [4.1] Testing English irregular verb overregularization...
  [4.2] Testing English stative verb error...
  [4.3] Testing English auxiliary agreement error...
  [4.4] Testing Japanese tara conjugation error...
  [4.5] Testing Japanese particle error...
  [4.6] Testing accurate English turn...
  [4.7] Testing accurate Japanese turn...
✓ Pedagogical Linguistic Analyzer verified for English and Japanese morphology & syntax.

--- 5. Braincore BKT & Misconception Ledger recording ---
✓ Braincore BKT & Misconception Ledger successfully persist attempts and errors.

=========================================================================
ALL AI STUDIO VOICE CALL PORT VERIFICATIONS PASSED (100% SUCCESS)
=========================================================================
```

#### 3.2. Pengujian Probe Empiris Playwright (`node tools/dev/probe-voice-call-ai-studio.mjs`)
Menjalankan simulasi interaksi nyata di dalam peramban Chromium:
```text
================================================================
  PROBE EMPIRIS PLAYWRIGHT: AI STUDIO VOICE CALL ARCHITECTURE
================================================================

--- 1. Navigasi ke halaman utama & verifikasi pemuatan modul ---
✓ PASS: [mod.scenarios] Window.FiezelVoiceScenarios aktif di runtime browser
✓ PASS: [mod.pedagogy] Window.FiezelVoicePedagogy aktif di runtime browser
✓ PASS: [mod.scenarios.count] 5 skenario kanonikal terdaftar

--- 2. Verifikasi Smart Prerequisite Bypass di runtime browser ---
✓ PASS: [prereq.seed.bypass] Smart Prerequisite Bypass Cafe otomatis terbuka (P=0.74 >= 0.60)
✓ PASS: [prereq.seed.locked] Prasyarat Trip terkunci sesuai seed awal (P=0.42 < 0.60)
✓ PASS: [prereq.unlock.flow] Prasyarat Trip terbuka setelah pemanasan vocab (P=0.75 >= 0.60)

--- 3. Verifikasi Inisialisasi Panggilan & Elemen UI AI Studio ---
✓ PASS: [call.start] Panggilan suara berhasil dimulai (status: listening)
✓ PASS: [ui.overlay.exists] Overlay panggilan #fzcCallOverlay terpasang di DOM
✓ PASS: [ui.wave.equalizer] 5-Bar Kinetic Waveform Equalizer aktif di panggung
✓ PASS: [ui.scenario.badge] Lencana skenario terpasang: "💬 CEFR A2 · LATIHAN TERBIMBING"
✓ PASS: [ui.sample.chips] Sample Prompt Chips terpasang (3 chips)

--- 4. Uji Simulasi Turn & Kartu Diagnosis Pedagogis Real-Time ---
✓ PASS: [pedagogy.card.rendered] Kartu diagnosis miskonsepsi ditampilkan (.fzc-call-diag-card.is-error)
✓ PASS: [pedagogy.card.whyFails] Umpan balik miskonsepsi presisi (Overregularization)
✓ PASS: [pedagogy.card.fix] Koreksi sintaksis akurat menyarankan "went"
✓ PASS: [pedagogy.telemetry.bkt] Telemetri BKT tersimpan di localStorage (fiezel-mastery-bkt-v1)
✓ PASS: [pedagogy.telemetry.ledger] Miskonsepsi tercatat di Misconception Ledger
✓ Tangkapan layar bukti visual tersimpan di: tools/dev/probe-voice-call-ai-studio-diag.png

--- 5. Verifikasi Strict Anti-Leak Exam Purity Mode ---
✓ PASS: [exam.purity.badge] Lencana mode ujian murni terverifikasi: "🎯 CEFR B2 · EXAM · MODE UJIAN MURNI (TANPA BANTUAN)"
✓ PASS: [exam.purity.no_chips] Zero Sample Prompt Chips pada Mode Ujian (Anti-Bocoran)
✓ PASS: [exam.purity.disclaimer] Catatan integritas ujian objektif tampil

================================================================
  HASIL AKHIR PROBE: 19/19 LULUS (100% PASS)
================================================================
```

#### 3.3. Verifikasi Gerbang Mutu Lokal Lengkap
- `node tests/voice-call-ai-studio-port-test.js`: **PASS (100%)**
- `node tools/dev/probe-voice-call-ai-studio.mjs`: **PASS (19/19)**
- `node tests/id-golden-snapshot-test.js`: **PASS (Baseline emas Indonesia utuh)**
- `node tests/th-ui-leak-test.js`: **PASS (Zero kebocoran teks ID di mode TH)**
- `node tests/gate-registry-test.js`: **PASS (10/10 gerbang mutu valid)**
- `node tools/bump-build.mjs --check`: **Selaras (Hexa-Sync Invariant Terpenuhi)**

---

### 4. Daftar Seluruh Berkas yang Dibuat & Dimodifikasi

#### Berkas Baru Dibuat:
1. `features/interactive-chat/fiezel-voice-scenarios.js`: Bank skenario, profil persona, formula smart prerequisite bypass, dan metadata ujian anti-bocoran.
2. `features/interactive-chat/fiezel-voice-pedagogy.js`: Penganalisis linguistik deterministik, penilai tatabahasa nir-halusinasi, serta pencatat telemetri BKT/IRT.
3. `tests/voice-call-ai-studio-port-test.js`: Suite uji verifikasi logika integrasi modul AI Studio Voice Call.
4. `tools/dev/probe-voice-call-ai-studio.mjs`: Probe otomatisasi Playwright headless untuk verifikasi siklus UI/UX dan state machine panggilan di peramban sesungguhnya.
5. `docs/handoffs/FIEZEL-M025617-VOICE-CALL-AI-STUDIO-PORT-HANDOFF.md`: Dokumen serah terima arsitektur resmi ini.

#### Berkas Dimodifikasi:
1. `features/interactive-chat/fiezel-voice-call.js`:
   - Penambahan integrasi `getVoiceScenarios()` dan `getVoicePedagogy()`.
   - Render 5-bar kinetic soundwave waveform equalizer (`#fzcVoiceWave`).
   - Render lencana skenario, tingkat kesulitan $b$, dan nilai $\theta$.
   - Modal laci prasyarat kosa kata dan alur pemanasan.
   - Kartu diagnosis miskonsepsi real-time (`#fzcCallDiagContainer`).
   - Sample prompt chips interaktif berdasarkan intensi (`accurate`, `misconception`, `incomplete`).
   - Penegakan isolasi murni pada skenario ujian (`isMeasureExam`).
2. `features/interactive-chat/fiezel-interactive-chat.js`:
   - Pendaftaran 5 skenario kanonikal ke dalam katalog obrolan interaktif utama.
   - Peta goals, translasi bilingual, dan saran respons.
3. `features/interactive-chat/interactive-chat.css`:
   - Styling cyber topo untuk waveform bar, lencana skenario, kartu diagnosis, laci prasyarat, dan sample chips.
4. `index.html`:
   - Pendaftaran berkas `fiezel-voice-scenarios.js` dan `fiezel-voice-pedagogy.js` ke antrean muat halaman.
5. `id-golden-baseline.json`:
   - Pembaruan snapshot baseline naskah teks bahasa Indonesia resmi.

---

### 5. Utang Teknis & Peta Jalan Masa Depan (Technical Debt & Future Roadmap)

Meskipun sistem telah bekerja secara mandiri, deterministik, dan tangguh di peramban murid, beberapa peningkatan arsitektural telah direncanakan untuk iterasi berikutnya:

1. **Gemini Live WebSocket Duplex Backend Endpoint (Cloudflare Workers / Node.js Server)**:
   - *Kondisi Saat Ini*: Panggilan suara menggunakan alur hybrid STT (Web Speech API) $\to$ Linguistic Analyzer / Gemini REST API Worker $\to$ Edge TTS Neural Synthesis.
   - *Target Masa Depan*: Membangun proxy WebSocket bidirectional (`wss://ai.fiezel.my.id/v1/voice/live`) yang meneruskan streaming audio PCM 16kHz/24kHz murid langsung ke Gemini Live Multimodal API untuk mencapai waktu respon suara total $<300\text{ ms}$ (setara panggilan telepon manusia sejati).
2. **Audio Chunker WebRTC / AudioWorklet Streaming**:
   - Memindahkan proses penangkapan mikrofon dan deteksi VAD dari ScriptProcessor/AnalyserNode ke AudioWorklet dedicated thread guna menjamin zero-glitch audio playback bahkan saat browser sedang melakukan repainting DOM berat.
3. **Ekspansi Bank Skenario & Dialek**:
   - Menambahkan skenario wawancara kerja profesional (Business English B2/C1) dan simulasi kehidupan kerja di Jepang (Kaiwa N3: Part-time job / Arubaito interview).
   - Menambahkan variasi dialek regional Jepang (Kansai-ben) pada modul tingkat mahir.
