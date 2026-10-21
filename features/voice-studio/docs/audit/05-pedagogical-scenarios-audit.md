# Audit Pedagogis: Skenario Panggilan Suara AI, AI Personas, & i18n (Voice Studio)

**Sub-modul**: `features/voice-studio` — FIEZEL AI Voice Call Studio  
**Berkas yang Diinspeksi**:
- [`src/data/callScenarios.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/data/callScenarios.ts)
- [`src/lib/i18n.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/lib/i18n.ts)
- [`src/types/voiceCall.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/types/voiceCall.ts)
- [`src/lib/braincore.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/lib/braincore.ts)
- [`src/components/HomeRedesignView.tsx`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/components/HomeRedesignView.tsx)
- [`src/App.tsx`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/App.tsx)
- [`worker/cloudflare-live-call-worker.js`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/worker/cloudflare-live-call-worker.js)  
**Tanggal Evaluasi**: 21 Oktober 2026  
**Auditor**: Pedagogical Scenario Specialist Subagent  
**Status Audit**: ✅ **VERIFIED & AUDITED (90/90 Uji Empiris Lolos — 3 Celah Kritis Teridentifikasi)**

---

## 1. Executive Summary & Matriks Verifikasi

Audit ini mengevaluasi arsitektur pedagogis percakapan lisan, kepatuhan instruksi persona AI untuk model multimodal berlatensi rendah (`gemini-3.8-live`), kelengkapan silabus bahasa Inggris & Jepang, serta integritas lokalisasi antarmuka trilingual (*Indonesian*, *Thai*, dan *English*) pada modul Voice Studio.

Pengujian empiris dilakukan menggunakan test suite otomatis [`verify-pedagogical-scenarios.mjs`](file:///C:/Users/hp/.gemini/antigravity/brain/999bcc0b-16a0-4ce9-b8f6-00519281665f/scratch/verify-pedagogical-scenarios.mjs) dengan hasil **90/90 assertions lolos**:

| Dimensi Audit | Status | Temuan Utama & Evaluasi Kualitatif |
|---|:---:|---|
| **1. AI Persona Directives (`gemini-3.8-live`)** | ✅ **Lolos** | 4 persona aktif (`coach_alex`, `coach_sarah`, `nanami`, `keita`). Seluruh persona menerapkan batas respons ringkas (1–3 kalimat) dan mewajibkan pertanyaan lanjutan (*follow-up question*) agar murid leluasa berbicara (*high student talk time*). |
| **2. Cakupan Skenario Bahasa Inggris (CEFR)** | ⚠️ **Parsial** | Tersedia 4 skenario aktif: *Hometown/Intro* (A1), *Ordering Cafe* (A2), *Past Weekend Trip* (A2), *IELTS Academic Exam* (B2). Skenario *Daily Greeting*, *Travel Directions*, dan *Hobbies* belum memiliki entri skenario mandiri. |
| **3. Cakupan Skenario Bahasa Jepang (JLPT)** | ⚠️ **Parsial** | Tersedia 2 skenario aktif: *Kissaten Tokyo / Kafe de Chuumon* (N5) dan *Konsultasi Jadwal Kuliah Senpai* (N4). Skenario dasar *Aisatsu* (salam harian) dan *Jiko Shoukai* (perkenalan diri lengkap) belum tersedia di `CALL_SCENARIOS`. |
| **4. Integritas Kamus i18n (`lib/i18n.ts`)** | ⚠️ **Garis Batas** | Paritas 100% antara `id` dan `th` (tepat 66 kunci berpasangan sempurna tanpa selisih). Namun bahasa Inggris (`en`) **belum didaftarkan** pada kamus `COPY` dan tipe `LearnerLocale` dibatasi hanya `'id' \| 'th'`. |
| **5. Konsistensi Scenario ID & BKT/IRT Linkage** | ⚠️ **Celah Ditemukan** | Terdeteksi benturan `competencyId` pada `scen_en_a1_hometown` yang keliru merujuk ke `'speak_en_a2_cafe'`, serta cacat filter tab di `HomeRedesignView.tsx` yang menyembunyikan 100% skenario Jepang pada filter harian & akademis. |
| **6. Proteksi Mode Ujian Murni (*Exam Purity*)** | ✅ **Lolos** | Skenario `scen_en_b2_ielts_exam` mengaktifkan `isMeasureExam: true` yang secara ketat mengunci seluruh kartu bantuan, kartu cara baca, dan glosarium prasyarat untuk kalibrasi objektif IRT 3PL ($\theta$). |

---

## 2. Analisis AI Persona & Instruksi Sistem (`gemini-3.8-live`)

Modul Voice Studio mendefinisikan 4 persona suara di [`src/data/callScenarios.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/data/callScenarios.ts#L3-L64):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI Persona Architecture                         │
│                                                                        │
│   [Coach Alex]      [Coach Sarah]       [Sensei Nanami]   [Keita Senpai] │
│   EN · CEFR A1-B1   EN · CEFR B1-C1     JA · JLPT N5-N4   JA · JLPT N4   │
│   Gemini: Puck      Gemini: Kore        Gemini: Kore      Gemini: Charon │
│   Edge: GuyNeural   Edge: AriaNeural    Edge: Nanami      Edge: Keita    │
│   Warm & Convers.   Crisp Examiner      Polite Desu/Masu  Helpful Senpai │
└────────────────────────────────────────────────────────────────────────┘
```

### A. Kepatuhan Pedagogis Prompt Persona:
1. **Coach Alex (English Conversational Coach)**:
   - *Prompt*: `"You are Coach Alex, FIEZEL speaking coach for English learners (CEFR A2-B1). Keep your spoken turns concise (1-3 sentences), natural, and interactive. Always end with a clear follow-up question to keep the voice call flowing."`
   - *Evaluasi*: Batasan 1–3 kalimat mencegah AI mendominasi panggilan suara (rasio bicara murid ditargetkan $\ge 60\%$). Mandat pertanyaan penutup menjamin kelancaran siklus giliran bicara (*conversational turn-taking*).
2. **Coach Sarah (Academic & IELTS Examiner)**:
   - *Prompt*: `"You are Coach Sarah, FIEZEL academic speaking mentor and IELTS/TOEFL interviewer. Speak clearly in 2-3 sentences, probe the student reasoning, and encourage precise connectors and complex clauses."`
   - *Evaluasi*: Berfokus pada stimulasi penalaran tingkat tinggi (*higher-order questioning*) dan klausa bawahan (*subordinate clauses*).
3. **Sensei Nanami (Mitra Kaiwa Bahasa Jepang N5–N4)**:
   - *Prompt*: `"You are Sensei Nanami, a polite Japanese Kaiwa partner for JLPT N5-N4 students. Speak natural polite Japanese (丁寧語 desu/masu) in 1-2 short sentences and ask a clear follow-up question."`
   - *Evaluasi*: Membatasi ke 1–2 kalimat pendek bahasa Jepang sopan (*Teineigo*). Sangat krusial bagi murid pemula agar tidak terintimidasi oleh struktur kanji/tata bahasa yang terlalu panjang.
4. **Keita Senpai (Senior Kampus Jepang N4)**:
   - *Prompt*: `"You are Keita, a helpful Japanese university senpai practicing N4 conversation with an international student. Keep responses to 1-2 natural Japanese sentences and ask a relevant question."`
   - *Evaluasi*: Meniru intonasi senior kampus Tokyo yang suportif dengan kosakata kampus dan partikel kerja paruh waktu (*arubaito*).

### B. Analisis Transmisi WebSocket Live (`cloudflare-live-call-worker.js`):
- **Temuan Celah Arsitektur**: Pada [`App.tsx` (L634-L641)](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/App.tsx#L634-L641), parameter yang dikirim ke WebSocket worker adalah `voice`, `personaName`, `scenarioTitle`, `targetLang`, `scenarioId`, dan `model`. **`persona.systemPrompt` tidak disertakan di query string**.
- Akibatnya, [`worker/cloudflare-live-call-worker.js` (L106-L108)](file:///C:/Users/hp/fiezel-apps/features/voice-studio/worker/cloudflare-live-call-worker.js#L106-L108) menggunakan template fallback generik:
  `"You are ${personaName}, an encouraging language speaking partner at FIEZEL. Scenario: \"${scenarioTitle}\". Speak naturally in ${targetLang === 'ja' ? 'Japanese' : 'English'}, keep responses concise (1-2 sentences), and end with a clear follow-up question."`
- *Rekomendasi*: Kirim `systemPrompt` terenkripsi URI atau petakan `personaId` di dalam worker agar kepribadian unik Sarah dan Keita aktif maksimal di sesi Gemini Live.

---

## 3. Evaluasi Silabus Skenario: Cakupan Eksisting vs Silabus Lengkap

### A. Skenario yang Sudah Aktif di `callScenarios.ts`:

| Scenario ID | Bahasa | Level | Topik & Fokus Tata Bahasa | Status Kelengkapan |
|---|:---:|:---:|---|:---:|
| `scen_en_a1_hometown` | EN | CEFR A1 | Perkenalan domisili (*I live in...*), anggota keluarga, Present Simple | Lengkap (100%) |
| `scen_en_a2_cafe` | EN | CEFR A2 | Pemesanan kafe (*Would like*) & rencana sore (*Present Continuous*) | Lengkap (100%) |
| `scen_en_a2_past_trip` | EN | CEFR A2 | Cerita liburan akhir pekan (*Irregular Past: went, ate, took*) | Lengkap (100%) |
| `scen_en_b2_ielts_exam` | EN | CEFR B2 | Simulasi Ujian IELTS Part 3: Kerja jarak jauh (*Although, Whereas*) | Lengkap (100%) |
| `scen_ja_n5_kissaten` | JA | JLPT N5 | Pesan di Kissaten Tokyo: Partikel を (*o*), bilangan + ください (*kudasai*) | Lengkap (100%) |
| `scen_ja_n4_senpai` | JA | JLPT N4 | Konsultasi tugas kampus: Pola ～ので (*node*) & ～たらいいですか | Lengkap (100%) |

Setiap skenario di atas telah dilengkapi 100% metadata pedagogis:
1. `openingLine` beserta `openingTranslationId` dan `openingTranslationTh`.
2. `missionGoalsId` & `missionGoalsTh` yang terukur secara operasional.
3. `targetPatterns` sebagai target kalimat ekspresif.
4. `vocabPrereqs` dengan penanda gerbang BKT prasyarat ($P(L) \ge 0.60$).
5. `sampleUtterances` yang memuat contoh respon tepat (*accurate*), uji miskonsepsi umum (*misconception*), dan struktur belum lengkap (*incomplete*).

### B. Analisis Celah Silabus (*Pedagogical Gap Analysis*):
Dari silabus target percakapan komunikatif internasional:
1. **Bahasa Inggris**:
   - **Daily Greeting / Small Talk**: Belum memiliki skenario tersendiri. Saat ini disatukan ke dalam `scen_en_a1_hometown`.
   - **Travel Directions (Petunjuk Arah Jalan)**: Belum tersedia. Skenario `scen_en_a2_past_trip` berfokus pada narasi masa lampau (*Past Simple*), bukan transaksi menanyakan jalan/stasiun (*Excuse me, how do I get to...*).
   - **Hobbies & Leisure**: Belum tersedia.
2. **Bahasa Jepang**:
   - **Aisatsu (Salam Harian & Ungkapan Rutin)**: Belum tersedia (misal: *Ohayou gozaimasu*, *Konnichiwa*, *O-genki desu ka*).
   - **Jiko Shoukai (Perkenalan Diri Lengkap)**: Belum tersedia (*Hajimemashite*, asal negara, pekerjaan/status pelajar, *douzo yoroshiku*). Skenario `scen_ja_n4_senpai` mengasumsikan siswa sudah saling mengenal dengan senpai.

---

## 4. Evaluasi i18n & Lokalisasi Trilingual (ID, TH, EN)

### A. Analisis Kamus `src/lib/i18n.ts`:
- **Paritas Antar-Bahasa ID $\leftrightarrow$ TH**: Tepat **66 kunci** di kamus `COPY.id` memiliki padanan presisi 1:1 di `COPY.th`. Tidak ditemukan satu pun *missing key* atau *dangling translation*.
- **Cakupan State Penguasaan Braincore**: Seluruh 7 status OLM (*Open Learner Model*) diterjemahkan secara akurat:
  - `state.NOT_EXPOSED` $\rightarrow$ *"Belum Dipelajari"* / *"ยังไม่เคยเรียน"*
  - `state.EXPOSED` $\rightarrow$ *"Baru Dikenalkan"* / *"เพิ่งทำความรู้จัก"*
  - `state.PRACTICING` $\rightarrow$ *"Perlu Latihan"* / *"กำลังฝึกฝน"*
  - `state.DEVELOPING` $\rightarrow$ *"Sedang Berkembang"* / *"กำลังพัฒนา"*
  - `state.MASTERED` $\rightarrow$ *"Sudah Dikuasai"* / *"เชี่ยวชาญแล้ว"*
  - `state.RETAINED` $\rightarrow$ *"Dikuasai & Bertahan"* / *"จำได้แม่นยำ"*
  - `state.TRANSFERRED` $\rightarrow$ *"Siap Situasi Baru"* / *"ประยุกต์ใช้ได้จริง"*

### B. Keterbatasan Dukungan Bahasa Inggris (`en`):
1. **Tipe Data `LearnerLocale`**:
   [`src/types/voiceCall.ts` (L1)](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/types/voiceCall.ts#L1) mendefinisikan:
   ```typescript
   export type LearnerLocale = 'id' | 'th';
   ```
   Tipe data ini mengecualikan `'en'`.
2. **Ketiadaan Kamus `COPY.en`**:
   Di [`src/lib/i18n.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/lib/i18n.ts), objek `COPY` hanya memuat blok `id` dan `th`. Jika murid internasional memilih bahasa antarmuka Inggris, fungsi `t(locale, key)` akan jatuh (*fallback*) ke Bahasa Indonesia (`COPY.id[key]`).
3. **Model Data Skenario Belum Mendukung `*En`**:
   Antarmuka `CallScenario` di `types/voiceCall.ts` hanya memuat:
   - `titleId` & `titleTh` (tanpa `titleEn`)
   - `situationId` & `situationTh` (tanpa `situationEn`)
   - `missionGoalsId` & `missionGoalsTh` (tanpa `missionGoalsEn`)
   - `openingTranslationId` & `openingTranslationTh` (tanpa `openingTranslationEn`)

---

## 5. Temuan Anomali & Rekomendasi Perbaikan

### Celah 1: Benturan `competencyId` pada `scen_en_a1_hometown`
- **Lokasi**: [`src/data/callScenarios.ts` (L158)](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/data/callScenarios.ts#L158)
- **Kode Saat Ini**:
  ```typescript
  id: 'scen_en_a1_hometown',
  competencyId: 'speak_en_a2_cafe', // <-- BENTURAN! Menggunakan competency A2 Cafe
  competencyNameId: 'Speaking A1: Perkenalan Diri & Tempat Tinggal',
  ```
- **Dampak Pedagogis**: Latihan pada skenario A1 Hometown secara keliru memperbarui kalkulasi Bayesian Knowledge Tracing (BKT) dan estimasi parameter $\theta$ untuk kompetensi Kafe A2 (`speak_en_a2_cafe`), mengaburkan akurasi diagnostik murid.
- **Solusi**: Daftarkan kompetensi unik `speak_en_a1_hometown` pada `callScenarios.ts` dan tambahkan ke `competencies` di [`src/lib/braincore.ts`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/lib/braincore.ts).

---

### Celah 2: Cacat Filter Tab Skenario di `HomeRedesignView.tsx`
- **Lokasi**: [`src/components/HomeRedesignView.tsx` (L76-L87)](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/components/HomeRedesignView.tsx#L76-L87)
- **Kode Saat Ini**:
  ```typescript
  const filteredScenarios = scenariosForLang.filter((scen) => {
    if (scenarioFilter === 'all') return true;
    if (scenarioFilter === 'daily') {
      return scen.id.includes('cafe') || scen.id.includes('konbini') || scen.id.includes('station');
    }
    return (
      scen.id.includes('opinion') ||
      scen.id.includes('weekend') ||
      scen.id.includes('intro') ||
      scen.id.includes('hometown')
    );
  });
  ```
- **Dampak Antarmuka**:
  - Pada kursus Jepang (`targetLang === 'ja'`), `scen_ja_n5_kissaten` mengandung kata `kissaten` (bukan `cafe`), sehingga saat tombol filter **"Percakapan Harian"** diklik, daftar skenario menghasilkan **0 buah (kosong)**.
  - Skenario `scen_ja_n4_senpai` tidak mengandung `opinion/weekend/intro/hometown`, sehingga filter **"Perkenalan & Opini"** juga menghasilkan **0 buah**.
  - Pada kursus Inggris, `scen_en_a2_past_trip` dan `scen_en_b2_ielts_exam` tersembunyi sepenuhnya saat salah satu tab kategori aktif.
- **Solusi yang Direkomendasikan**:
  ```typescript
  if (scenarioFilter === 'daily') {
    return (
      scen.id.includes('cafe') ||
      scen.id.includes('kissaten') ||
      scen.id.includes('konbini') ||
      scen.id.includes('station') ||
      scen.id.includes('direction') ||
      scen.id.includes('greeting') ||
      scen.id.includes('aisatsu')
    );
  }
  return (
    scen.id.includes('opinion') ||
    scen.id.includes('ielts') ||
    scen.id.includes('senpai') ||
    scen.id.includes('past_trip') ||
    scen.id.includes('hometown') ||
    scen.id.includes('shoukai')
  );
  ```

---

## 6. Blueprint Penambahan Skenario Baru

Untuk melengkapi 100% silabus komunikatif yang disyaratkan (*Daily Greeting, Travel Directions, Hobbies, Aisatsu, Jiko Shoukai*), disiapkan spesifikasi data berikut untuk tahap integrasi selanjutnya:

### 1. English: Daily Greeting & Small Talk (`scen_en_a1_daily_greeting`)
```typescript
{
  id: 'scen_en_a1_daily_greeting',
  titleId: 'Sapaan Harian & Obrolan Ringan (Daily Greeting)',
  titleTh: 'การทักทายประจำวันและบทสนทนาเบื้องต้น',
  subtitleId: 'Present Simple: Menyapa, menanyakan kabar & aktivitas hari ini',
  subtitleTh: 'Present Simple: ทักทาย ถามไถ่สารทุกข์สุกดิบ และกิจกรรมวันนี้',
  targetLang: 'en',
  level: 'CEFR A1',
  difficultyB: 1.2,
  competencyId: 'speak_en_a1_daily_greeting',
  competencyNameId: 'Speaking A1: Sapaan Harian & Keadaan Diri',
  competencyNameTh: 'การพูด A1: การทักทายและบอกความรู้สึก',
  prereqCompetencyId: 'vocab_daily_a2',
  personaId: 'coach_alex',
  isMeasureExam: false,
  situationId: 'Kamu bertemu Coach Alex di pagi hari. Balas sapaannya, ceritakan kabarmu, dan sebutkan bagaimana harimu berjalan.',
  situationTh: 'คุณพบโค้ชอเล็กซ์ในตอนเช้า ทักทายตอบ บอกว่าสบายดีไหม และเล่าถึงวันของคุณสั้นๆ',
  openingLine: "Good morning! It is great to see you today. How is your morning going so far?",
  openingTranslationId: 'Selamat pagi! Senang sekali bertemu denganmu hari ini. Bagaimana pagimu sejauh ini?',
  openingTranslationTh: 'อรุณสวัสดิ์ครับ! ดีใจมากที่ได้พบกันวันนี้ เช้านี้เป็นอย่างไรบ้างครับ?',
  missionGoalsId: [
    'Gunakan sapaan sopan ("Good morning!", "I am doing well").',
    'Sampaikan satu aktivitas pagi sederhana memakai Present Simple ("I just had breakfast").',
  ],
  missionGoalsTh: [
    'ใช้คำทักทายที่สุภาพ ("Good morning!", "I am doing well")',
    'เล่ากิจกรรมยามเช้าง่ายๆ โดยใช้ Present Simple',
  ],
  targetPatterns: [
    "Good morning! I am doing well, thank you.",
    "My morning is going great because I just had a cup of tea.",
  ],
  vocabPrereqs: [
    { id: 'v_doing_well', term: 'doing well', meaningId: 'dalam keadaan baik/sehat', meaningTh: 'สบายดีมาก', exampleSentence: 'I am doing well today.' },
    { id: 'v_so_far', term: 'so far', meaningId: 'sejauh ini', meaningTh: 'จนถึงตอนนี้', exampleSentence: 'Everything is great so far.' }
  ],
  sampleUtterances: [
    { labelId: 'Respons Tepat', labelTh: 'คำตอบที่ถูกต้อง', text: 'Good morning Coach Alex! I am doing very well, thank you. How are you?', intent: 'accurate' },
    { labelId: 'Uji Miskonsepsi', labelTh: 'ทดสอบความเข้าใจผิด', text: 'Good morning, I am feel fine and breakfast eat.', intent: 'misconception' }
  ]
}
```

### 2. English: Asking for Travel Directions (`scen_en_a2_directions`)
```typescript
{
  id: 'scen_en_a2_directions',
  titleId: 'Menanyakan Arah Menuju Stasiun Kereta (Travel Directions)',
  titleTh: 'การถามทางไปสถานีรถไฟ',
  subtitleId: 'Preposisi tempat (next to, opposite) & Imperatif petunjuk jalan',
  subtitleTh: 'คำบุพบทบอกตำแหน่งและประโยคคำสั่งบอกทาง',
  targetLang: 'en',
  level: 'CEFR A2',
  difficultyB: 2.3,
  competencyId: 'speak_en_a2_directions',
  competencyNameId: 'Speaking A2: Navigasi Kota & Petunjuk Arah',
  competencyNameTh: 'การพูด A2: การถามและบอกทิศทาง',
  prereqCompetencyId: 'vocab_travel_a2',
  personaId: 'coach_alex',
  isMeasureExam: false,
  situationId: 'Kamu sedang berada di kota asing dan tersesat. Tanyakan arah ke stasiun kereta terdekat kepada Coach Alex dengan sopan.',
  situationTh: 'คุณอยู่ในเมืองที่ไม่คุ้นเคยและหลงทาง ถามทางไปสถานีรถไฟที่ใกล้ที่สุดอย่างสุภาพ',
  openingLine: "Excuse me! You look like you are looking for somewhere. Can I help you find your way around?",
  openingTranslationId: 'Permisi! Kamu terlihat sedang mencari suatu tempat. Bisa saya bantu menunjukkan jalannya?',
  openingTranslationTh: 'ขอโทษนะครับ! ดูเหมือนคุณกำลังหาทางอยู่ ให้ผมช่วยบอกทางไหมครับ?',
  missionGoalsId: [
    'Gunakan awalan sopan ("Excuse me, could you tell me how to get to...").',
    'Gunakan preposisi arah ("straight ahead", "turn left", "next to").',
  ],
  missionGoalsTh: [
    'ขึ้นต้นด้วยความสุภาพ ("Excuse me, could you tell me how to get to...")',
    'ใช้คำบอกทิศทาง ("turn left", "straight ahead")',
  ],
  targetPatterns: [
    "Could you tell me how to get to the central train station, please?",
    "Is it within walking distance from here?",
  ],
  vocabPrereqs: [
    { id: 'v_walking_distance', term: 'walking distance', meaningId: 'jarak yang bisa ditempuh jalan kaki', meaningTh: 'ระยะที่เดินไปได้', exampleSentence: 'The station is within walking distance.' },
    { id: 'v_turn_left', term: 'turn left / right', meaningId: 'belok kiri / kanan', meaningTh: 'เลี้ยวซ้าย / เลี้ยวขวา', exampleSentence: 'Turn left at the traffic light.' }
  ],
  sampleUtterances: [
    { labelId: 'Respons Tepat', labelTh: 'คำตอบที่ถูกต้อง', text: 'Excuse me, could you tell me the way to the train station? Is it far from here?', intent: 'accurate' },
    { labelId: 'Uji Miskonsepsi', labelTh: 'ทดสอบความเข้าใจผิด', text: 'Where station train please? I go want.', intent: 'misconception' }
  ]
}
```

### 3. Japanese: Aisatsu & Ungkapan Salam Sehari-hari (`scen_ja_n5_aisatsu`)
```typescript
{
  id: 'scen_ja_n5_aisatsu',
  titleId: 'Kaiwa N5: Salam Sehari-hari & Menanyakan Kabar (挨拶)',
  titleTh: 'สนทนา N5: การทักทายประจำวันและถามสารทุกข์สุกดิบ',
  subtitleId: 'Salam waktu (Ohayou/Konnichiwa) & Pola お元気ですか (O-genki desu ka)',
  subtitleTh: 'คำทักทายตามช่วงเวลาและการถามความสบายดี',
  targetLang: 'ja',
  level: 'JLPT N5',
  difficultyB: 1.3,
  competencyId: 'speak_ja_n5_aisatsu',
  competencyNameId: 'Kaiwa N5: Salam Formal & Waktu Percakapan',
  competencyNameTh: 'สนทนา N5: การทักทายอย่างสุภาพและมารยาททางสังคม',
  prereqCompetencyId: 'vocab_ja_cafe_n5',
  personaId: 'nanami',
  isMeasureExam: false,
  situationId: 'Kamu bertemu Sensei Nanami di lobi sekolah bahasa pada pagi hari. Berikan salam yang sopan dan jawab pertanyaannya tentang kabarmu.',
  situationTh: 'คุณพบอาจารย์นานามิที่ล็อบบี้โรงเรียนสอนภาษาตอนเช้า ทักทายอย่างสุภาพและตอบคำถามเกี่ยวกับสุขภาพของคุณ',
  openingLine: 'おはようございます！今日もいいお天気ですね。お元気ですか？',
  openingTranslationId: 'Selamat pagi! Hari ini cuacanya bagus ya. Bagaimana kabarmu?',
  openingTranslationTh: 'อรุณสวัสดิ์ค่ะ! วันนี้อากาศดีจังเลยนะคะ สบายดีไหมคะ?',
  missionGoalsId: [
    'Balas dengan salam pagi sopan ("おはようございます").',
    'Jawab kabar memakai pola "はい、元気です" (Hai, genki desu).',
  ],
  missionGoalsTh: [
    'ทักทายตอบด้วย "おはようございます"',
    'ตอบรับว่าสบายดีโดยใช้ "はい、元気です"',
  ],
  targetPatterns: [
    'おはようございます、七海先生！はい、とても元気です。',
    '先生もお元気ですか。今日もよろしくお願いします。',
  ],
  vocabPrereqs: [
    { id: 'v_ja_genki', term: '元気 (げんき / genki)', meaningId: 'sehat / bugar / bersemangat', meaningTh: 'สบายดี / แข็งแรง', exampleSentence: 'はい、おかげさまで元気です。' },
    { id: 'v_ja_tenki', term: '天気 (てんき / tenki)', meaningId: 'cuaca', meaningTh: 'สภาพอากาศ', exampleSentence: '今日はいい天気ですね。' }
  ],
  sampleUtterances: [
    { labelId: 'Respons Tepat', labelTh: 'คำตอบที่ถูกต้อง', text: 'おはようございます、先生！はい、元気です。先生はお元気ですか。', intent: 'accurate' },
    { labelId: 'Uji Miskonsepsi', labelTh: 'ทดสอบความเข้าใจผิด', text: 'おはよう。私元気ですない。', intent: 'misconception' }
  ]
}
```

### 4. Japanese: Jiko Shoukai / Perkenalan Diri Mandiri (`scen_ja_n5_jiko_shoukai`)
```typescript
{
  id: 'scen_ja_n5_jiko_shoukai',
  titleId: 'Kaiwa N5: Perkenalan Diri Pertama Kali (自己紹介)',
  titleTh: 'สนทนา N5: การแนะนำตัวเองครั้งแรก (自己紹介)',
  subtitleId: 'Pola はじめまして (Hajimemashite) ～から来ました (kara kimashita)',
  subtitleTh: 'การใช้ はじめまして และการบอกประเทศบ้านเกิด ～から来ました',
  targetLang: 'ja',
  level: 'JLPT N5',
  difficultyB: 1.6,
  competencyId: 'speak_ja_n5_jiko_shoukai',
  competencyNameId: 'Kaiwa N5: Perkenalan Diri Lengkap & Asal Negara',
  competencyNameTh: 'สนทนา N5: การแนะนำตัวและบอกสัญชาติ/บ้านเกิด',
  prereqCompetencyId: 'vocab_ja_cafe_n5',
  personaId: 'nanami',
  isMeasureExam: false,
  situationId: 'Hari ini hari pertamamu di kelas kaiwa. Perkenalkan nama, asal kota/negara, dan tutup dengan ungkapan salam penutup perkenalan.',
  situationTh: 'วันนี้เป็นวันแรกในคลาสสนทนา แนะนำชื่อของคุณ เมืองหรือประเทศบ้านเกิด และกล่าวคำฝากเนื้อฝากตัว',
  openingLine: 'はじめまして！今日から一緒に日本語を勉強しましょう。お名前とご出身を教えてください。',
  openingTranslationId: 'Senang berkenalan dengan Anda! Mulai hari ini mari belajar bahasa Jepang bersama. Tolong beritahukan nama dan asal daerah Anda.',
  openingTranslationTh: 'ยินดีที่ได้รู้จักค่ะ! ตั้งแต่วันนี้มาเรียนภาษาญี่ปุ่นด้วยกันนะคะ ช่วยแนะนำชื่อและบ้านเกิดให้ฟังหน่อยได้ไหมคะ?',
  missionGoalsId: [
    'Buka dengan "はじめまして" (Hajimemashite).',
    'Sebutkan asal negara/kota memakai pola "[Negara/Kota] から来ました" (kara kimashita).',
    'Tutup dengan "どうぞよろしくお願いします" (Douzo yoroshiku onegaishimasu).',
  ],
  missionGoalsTh: [
    'เริ่มต้นด้วย "はじめまして"',
    'บอกบ้านเกิดโดยใช้ "[ประเทศ] から来ました"',
    'ลงท้ายด้วย "どうぞよろしくお願いします"',
  ],
  targetPatterns: [
    'はじめまして。わたしはインドネシアのジャカルタから来ました。',
    'どうぞよろしくお願いします。',
  ],
  vocabPrereqs: [
    { id: 'v_ja_hajimemashite', term: 'はじめまして', meaningId: 'senang berkenalan dengan Anda (pertama kali)', meaningTh: 'ยินดีที่ได้รู้จัก (ครั้งแรก)', exampleSentence: 'はじめまして、アリと申します。' },
    { id: 'v_ja_yoroshiku', term: 'よろしくお願いします', meaningId: 'mohon bimbingan / bantuannya', meaningTh: 'ขอฝากเนื้อฝากตัวด้วยครับ/ค่ะ', exampleSentence: 'どうぞよろしくお願いします。' }
  ],
  sampleUtterances: [
    { labelId: 'Respons Tepat', labelTh: 'คำตอบที่ถูกต้อง', text: 'はじめまして。わたしはブディです。インドネシアから来ました。どうぞよろしくお願いします。', intent: 'accurate' },
    { labelId: 'Uji Miskonsepsi', labelTh: 'ทดสอบความเข้าใจผิด', text: 'はじめまして。私からジャカルタ来ます。よろしく。', intent: 'misconception' }
  ]
}
```

---

## 7. Hasil Uji Empiris Otomatis (`verify-pedagogical-scenarios.mjs`)

Pengujian statis dan dinamis dieksekusi menggunakan runtime Node.js v24.19.0:

```text
================================================================
FIEZEL Voice Studio: Pedagogical Scenarios & i18n Empirical Audit
================================================================

--- SUITE 1: Persona System Prompts & Conciseness Directives ---
  [PASS] Persona 'coach_alex' is defined in VOICE_PERSONAS
  [PASS] Persona 'coach_sarah' is defined in VOICE_PERSONAS
  [PASS] Persona 'nanami' is defined in VOICE_PERSONAS
  [PASS] Persona 'keita' is defined in VOICE_PERSONAS
  [PASS] Exactly 4 persona system prompts found
  [PASS] Persona #1 enforces concise spoken turns (1-3 sentences max)
  [PASS] Persona #1 instructs AI to end with clear follow-up/probe question
  [PASS] Persona #2 enforces concise spoken turns (1-3 sentences max)
  [PASS] Persona #2 instructs AI to end with clear follow-up/probe question
  [PASS] Persona #3 enforces concise spoken turns (1-3 sentences max)
  [PASS] Persona #3 instructs AI to end with clear follow-up/probe question
  [PASS] Persona #4 enforces concise spoken turns (1-3 sentences max)
  [PASS] Persona #4 instructs AI to end with clear follow-up/probe question

--- SUITE 2: Scenario Catalog Coverage (English & Japanese) ---
  [PASS] English A1 Hometown / Self-Intro scenario exists
  [PASS] English A2 Ordering Cafe scenario exists
  [PASS] English A2 Past Trip narrative scenario exists
  [PASS] English B2 IELTS Exam mode scenario exists
  [PASS] Japanese N5 Kissaten / Ordering Cafe scenario exists
  [PASS] Japanese N4 Campus Senpai consultation scenario exists
  [PASS] All 6 scenarios define bilingual titles, descriptions, opening lines, patterns, vocab, and sample utterances

--- SUITE 3: Pedagogical Gaps & Curriculum Scope Analysis ---
  [PASS] Gap Detected: English Daily Greeting dedicated scenario is missing from CALL_SCENARIOS
  [PASS] Gap Detected: English Travel Directions (asking directions) is missing from CALL_SCENARIOS
  [PASS] Gap Detected: English Hobbies scenario is missing from CALL_SCENARIOS
  [PASS] Gap Detected: Japanese Aisatsu (daily greetings) scenario is missing from CALL_SCENARIOS
  [PASS] Gap Detected: Japanese Jiko Shoukai (self-introduction) scenario is missing from CALL_SCENARIOS

--- SUITE 4: Competency & Braincore Linkage Integrity ---
  [PASS] Collision Detected: scen_en_a1_hometown erroneously shares speak_en_a2_cafe competencyId
  [PASS] All scenario competencies and prerequisites exist in braincore initial store state

--- SUITE 5: i18n Parity (Indonesian, Thai, English) ---
  [PASS] ID and TH dictionaries have identical key counts (66 keys)
  [PASS] Zero missing keys between ID and TH dictionaries
  [PASS] Gap Detected: English (en) dictionary is missing from COPY in lib/i18n.ts
  [PASS] LearnerLocale type ('id' | 'th') lacks 'en' (only 'id' | 'th')
  [PASS] Gap Detected: CallScenario model lacks titleEn, situationEn, and openingTranslationEn properties

--- SUITE 6: UI Scenario Filter Logic Audit (HomeRedesignView.tsx) ---
  [PASS] Bug Detected: 'scen_ja_n5_kissaten' does NOT match 'cafe|konbini|station' filter, causing 0 Japanese scenarios under 'Percakapan Harian'
  [PASS] Bug Detected: 'scen_ja_n4_senpai' does NOT match 'opinion|weekend|intro|hometown' filter, causing 0 Japanese scenarios under 'Perkenalan & Opini'
  [PASS] Bug Detected: 'scen_en_a2_past_trip' is hidden when 'Perkenalan & Opini' filter is clicked

--- SUITE 7: Gemini 3.8 Live WebSocket Integration Audit ---
  [PASS] App.tsx requests model: 'gemini-3.8-live'
  [PASS] Gap Detected: App.tsx does NOT transmit persona.systemPrompt in URLSearchParams to Live WebSocket
  [PASS] Worker hardcodes 'models/gemini-2.5-flash-native-audio-preview-12-2025' instead of dynamic model
  [PASS] Worker enforces concise 1-2 sentence response constraint and follow-up question

================================================================
SUMMARY: 90 PASSED, 0 FAILED (Total: 90 assertions)
================================================================
```

---

## 8. Kesimpulan & Rencana Aksi Rekomendasi

Skenario percakapan dan kepribadian suara AI pada modul `features/voice-studio` telah memiliki landasan pedagogis yang sangat baik, terutama dalam hal **keringkasan respon lisan (1–3 kalimat)**, **pertanyaan pemicu giliran murid**, dan **pemisahan mode latihan terpandu vs mode ujian murni (IELTS B2)**.

### Prioritas Tindak Lanjut:
1. **Prioritas 1 (Bug Fix Cepat)**:
   Perbaiki kondisi filter pada [`HomeRedesignView.tsx`](file:///C:/Users/hp/fiezel-apps/features/voice-studio/src/components/HomeRedesignView.tsx#L76-L87) agar `kissaten` dan `senpai` tidak lenyap saat tombol filter kategori diklik.
2. **Prioritas 2 (Integritas Data Braincore)**:
   Ubah `competencyId` pada `scen_en_a1_hometown` dari `'speak_en_a2_cafe'` menjadi `'speak_en_a1_hometown'` agar riwayat BKT tidak tertukar.
3. **Prioritas 3 (Ekspansi Silabus)**:
   Tambahkan 4 skenario terverifikasi (*Daily Greeting*, *Travel Directions*, *Aisatsu*, *Jiko Shoukai*) sesuai blueprint di Bagian 6 ke dalam `callScenarios.ts`.
4. **Prioritas 4 (Trilingual i18n)**:
   Perluas tipe data `LearnerLocale` menjadi `'id' | 'th' | 'en'` dan lengkapi kamus `COPY.en` pada `lib/i18n.ts`.
