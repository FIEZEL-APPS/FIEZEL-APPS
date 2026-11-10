import type { CallScenario } from '../types/voiceCall.ts';

/**
 * FIEZEL · features/voice-studio/src/data/pteCallScenarios.ts
 * 4-Stage Progressive PTE Academic Curriculum Ladder for Dr. Julian Examiner.
 * Standard Pearson PTE Academic Target 42-58+ (Australian Visa & University Entry).
 */
export const PTE_CALL_SCENARIOS: CallScenario[] = [
  {
    id: 'scen_pte_coach_intro',
    titleId: 'PTE Academic: Orientasi Formula & Tes Diagnostik',
    titleTh: 'PTE Academic: แนะนำสูตรและแบบทดสอบวัดระดับ',
    subtitleId: 'PTE Target 42–58+ · Pemetaan Kemampuan Bicara & Ujian Awal',
    subtitleTh: 'PTE Target 42-58+ · ทดสอบและวางแผนการเรียนรู้',
    targetLang: 'en',
    level: 'PTE Academic Score 42-58+',
    difficultyB: 2.0,
    competencyId: 'speak_pte_intro',
    competencyNameId: 'PTE Academic: Orientasi & Diagnostik',
    competencyNameTh: 'PTE Academic: ปฐมนิเทศและการวินิจฉัย',
    personaId: 'dr_julian',
    isMeasureExam: false,
    situationId:
      'Kamu pertama kali masuk ke kelas bimbingan intensif Dr. Julian. Dr. Julian akan menjelaskan aturan penilaian Pearson PTE Academic (Fluency, Pronunciation, Content) dan melakukan uji diagnostik awal.',
    situationTh:
      'คุณเข้าสู่การฝึกฝนเข้มข้นกับ Dr. Julian เป็นครั้งแรก เขาจะอธิบายเกณฑ์ Pearson (Fluency, Pronunciation, Content) และทดสอบวัดระดับเบื้องต้น',
    openingLine:
      'Welcome to PTE Academic Master Training. I am Dr. Julian. In Pearson testing, hesitation kills your score. Today we establish your baseline. Tell me clearly: what is your target PTE score, and have you ever taken the exam before?',
    openingTranslationId:
      'Selamat datang di Pelatihan Master PTE Academic. Saya Dr. Julian. Dalam ujian Pearson, keraguan menghancurkan nilaimu. Hari ini kita petakan kemampuan dasarmu. Ceritakan dengan jelas: berapa target skor PTE-mu, dan apakah kamu pernah ikut ujian sebelumnya?',
    openingTranslationTh:
      'ยินดีต้อนรับสู่การฝึกอบรมระดับสูง PTE Academic ผมคือ Dr. Julian ในการสอบ Pearson ความลังเลจะทำลายคะแนนของคุณ วันนี้เราจะวัดระดับพื้นฐาน บอกผมชัดๆ: คะแนนเป้าหมายของคุณคือเท่าไร และเคยสอบมาก่อนไหม?',
    missionGoalsId: [
      'Jawab pertanyaan Dr. Julian dengan lancar tanpa jeda "umm" atau "err" melebihi 2 detik.',
      'Sebutkan target skor PTE (misalnya 42 atau 58) dan tujuan visa/studi Anda.',
      'Dengarkan penjelasan formula 4 pilar kingmaker PTE Academic.'
    ],
    missionGoalsTh: [
      'ตอบคำถาม Dr. Julian อย่างคล่องแคล่วโดยไม่ลังเลเกิน 2 วินาที',
      'ระบุคะแนนเป้าหมาย PTE (เช่น 42 หรือ 58) และเป้าหมายวีซ่า/การศึกษา',
      'รับฟังคำแนะนำสูตร 4 เสาหลักของ PTE Academic'
    ],
    targetPatterns: [
      'My primary goal is to achieve an overall PTE score of...',
      'I am preparing for an Australian vocational visa requirement...'
    ],
    vocabPrereqs: [
      {
        id: 'v_pte_intro_1',
        term: 'oral fluency',
        meaningId: 'kelancaran berbicara tanpa jeda ragu',
        meaningTh: 'ความคล่องแคล่วในการพูดโดยไม่ติดขัด',
        exampleSentence: 'Oral fluency is the single most heavily weighted factor in PTE speaking.'
      },
      {
        id: 'v_pte_intro_2',
        term: 'visa benchmark',
        meaningId: 'standar nilai minimum untuk pengajuan visa',
        meaningTh: 'เกณฑ์คะแนนขั้นต่ำสำหรับการขอวีซ่า',
        exampleSentence: 'A score of 42 meets the vocational English visa benchmark.'
      }
    ],
    sampleUtterances: [
      {
        labelId: 'Jawaban Lancar Target 42–58+',
        labelTh: 'คำตอบระดับเป้าหมาย 42-58+',
        text: 'My primary goal is to achieve a PTE score of 50 for my Australian visa application. I have not taken the exam before, and I want to master the official templates.',
        intent: 'accurate'
      }
    ]
  },
  {
    id: 'scen_pte_di_level1',
    titleId: 'PTE Tingkat 1: Describe Image Master (Hafalan Template Universal)',
    titleTh: 'PTE ระดับ 1: Describe Image Master (สูตรจำสากลและความคล่องแคล่ว)',
    subtitleId: 'Hafalkan Formula Universal 40 Detik & Kunci Nilai Fluency 5/5',
    subtitleTh: 'สูตรจำสากล 40 วินาที พิชิตคะแนนความคล่องแคล่ว 5/5',
    targetLang: 'en',
    level: 'PTE Academic Target 42+',
    difficultyB: 2.2,
    competencyId: 'speak_pte_describe_image',
    competencyNameId: 'PTE Speaking: Describe Image Universal Template',
    competencyNameTh: 'PTE Speaking: Describe Image สูตรสำเร็จสากล',
    personaId: 'dr_julian',
    isMeasureExam: false,
    situationId:
      'Latihan resmi Describe Image. Dr. Julian akan memproyeksikan visual grafik (Bar Chart / Line Graph). Gunakan Formula Universal FIEZEL: Judul -> Kategori Utama -> Angka Maksimum -> Angka Minimum -> Kesimpulan.',
    situationTh:
      'การฝึกอย่างเป็นทางการ Describe Image โดย Dr. Julian จะเปิดกราฟบนหน้าจอ ใช้สูตรสำเร็จสากล: ชื่อกราฟ -> หมวดหมู่หลัก -> ค่าสูงสุด -> ค่าต่ำสุด -> บทสรุป',
    openingLine:
      'Candidate, this is Describe Image Level 1. I am projecting the visual chart onto your learning workbench now. You have 25 seconds to study the categories and peak numbers. When you speak, follow the Universal Formula without stopping. Begin your preparation.',
    openingTranslationId:
      'Kandidat, ini adalah Describe Image Tingkat 1. Saya membuka grafik visual pada papan belajarmu sekarang. Anda punya waktu 25 detik mempelajari kategori dan angka puncaknya. Saat berbicara, ikuti Formula Universal tanpa berhenti. Mulai persiapan.',
    openingTranslationTh:
      'ผู้เข้าสอบ นี่คือ Describe Image ระดับ 1 ผมกำลังแสดงกราฟบนกระดานการเรียนรู้ของคุณ คุณมีเวลา 25 วินาทีในการศึกษาข้อมูล เมื่อพูด ให้ใช้สูตรสำเร็จสากลอย่างต่อเนื่อง เริ่มเตรียมตัวได้',
    missionGoalsId: [
      'Bicaralah selama 30 hingga 38 detik penuh menggunakan Formula Universal FIEZEL.',
      'Hindari jeda lebih dari 3 detik (Aturan Hening Pearson) dan pertahankan kelancaran 5/5.',
      'Sebutkan judul grafik, minimal 2 kategori, nilai puncak maksimum, dan nilai minimum.'
    ],
    missionGoalsTh: [
      'พูดต่อเนื่อง 30-38 วินาทีโดยใช้สูตรสำเร็จสากล',
      'หลีกเลี่ยงการหยุดพูดเกิน 3 วินาทีเพื่อรักษาคะแนนความคล่องแคล่ว 5/5',
      'ระบุชื่อกราฟ หมวดหมู่หลัก ค่าสูงสุด และค่าต่ำสุดให้ครบถ้วน'
    ],
    targetPatterns: [
      'The given image represents an informative chart regarding...',
      'According to the picture, we can see several key elements, including...',
      'Looking closely, the maximum figure is observed in..., while the minimum figure is found in...',
      'In conclusion, the picture provides significant data and is very beneficial for further understanding.'
    ],
    vocabPrereqs: [
      {
        id: 'v_pte_di_1',
        term: 'maximum figure',
        meaningId: 'angka atau titik tertinggi pada grafik',
        meaningTh: 'ตัวเลขหรือจุดสูงสุดในกราฟ',
        exampleSentence: 'The maximum figure is observed in the first quarter.'
      },
      {
        id: 'v_pte_di_2',
        term: 'significant data',
        meaningId: 'data penting yang memberikan gambaran jelas',
        meaningTh: 'ข้อมูลที่มีนัยสำคัญ',
        exampleSentence: 'In conclusion, the picture provides significant data.'
      }
    ],
    sampleUtterances: [
      {
        labelId: 'Contoh Deskripsi Sempurna (Formula Universal)',
        labelTh: 'ตัวอย่างการตอบตามสูตรสำเร็จสากล',
        text: 'The given image represents an informative chart regarding global renewable energy production. According to the picture, we can see several key elements, including solar, wind, and hydro power. Looking closely, the maximum figure is observed in solar energy, while the minimum figure is found in geothermal power. In conclusion, the picture provides significant data and is very beneficial for further understanding.',
        intent: 'accurate'
      }
    ]
  },
  {
    id: 'scen_pte_ra_level2',
    titleId: 'PTE Tingkat 2: Read Aloud (Teknik Chunking & 130 WPM Pacing)',
    titleTh: 'PTE ระดับ 2: Read Aloud (การแบ่งวรรคและจังหวะ 130 WPM)',
    subtitleId: 'Pemenggalan Frasa Sintaksis // & Artikulasi Kata Akademik',
    subtitleTh: 'การแบ่งช่วงหายใจและฝึกการออกเสียงคำศัพท์วิชาการ',
    targetLang: 'en',
    level: 'PTE Academic Target 42+',
    difficultyB: 2.4,
    competencyId: 'speak_pte_read_aloud',
    competencyNameId: 'PTE Speaking & Reading: Read Aloud Chunking',
    competencyNameTh: 'PTE Speaking & Reading: Read Aloud การแบ่งวรรคตอน',
    personaId: 'dr_julian',
    isMeasureExam: false,
    situationId:
      'Latihan resmi Read Aloud. Dr. Julian akan menampilkan teks akademik dengan tanda jeda chunking (//). Baca dengan tempo konstan 120-140 WPM tanpa mengeja kata per kata.',
    situationTh:
      'การฝึกอย่างเป็นทางการ Read Aloud โดย Dr. Julian จะแสดงข้อความวิชาการพร้อมเครื่องหมายแบ่งวรรค (//) อ่านด้วยความเร็วคงที่ 120-140 WPM',
    openingLine:
      'We are now at Read Aloud Level 2. I have opened the academic text passage on your workbench. Pay strict attention to the double-slash chunking markers for natural breath pockets. Maintain a brisk, steady pace of 130 words per minute. Read the passage aloud now.',
    openingTranslationId:
      'Kita sekarang berada di Read Aloud Tingkat 2. Saya membuka kutipan teks akademik pada papan belajarmu. Perhatikan baik-baik penanda jeda garis miring ganda (//) untuk kantong nafas alami. Pertahankan tempo stabil 130 kata per menit. Baca teks tersebut dengan suara lantang sekarang.',
    openingTranslationTh:
      'เราอยู่ที่ Read Aloud ระดับ 2 ผมได้เปิดข้อความวิชาการบนกระดานของคุณแล้ว สังเกตเครื่องหมาย // สำหรับการเว้นวรรคหายใจ รักษาจังหวะให้คงที่ 130 คำต่อนาที เริ่มอ่านออกเสียงได้เลยครับ',
    missionGoalsId: [
      'Baca teks dengan ritme stabil (120-140 WPM) dan jeda hanya pada tanda chunking //.',
      'Artikulasikan konsonan akhir (-ed, -s, -tion) dengan jelas tanpa melebih-lebihkan.',
      'Jangan perbaiki diri sendiri (self-correction) bila salah baca kata, lanjutkan tanpa jeda.'
    ],
    missionGoalsTh: [
      'อ่านข้อความด้วยจังหวะคงที่ 120-140 WPM และเว้นวรรคเฉพาะจุด //',
      'ออกเสียงพยัญชนะท้าย (-ed, -s, -tion) ชัดเจน',
      'ห้ามย้อนกลับไปอ่านซ่อมหากอ่านผิด ให้รักษาความลื่นไหลต่อเนื่อง'
    ],
    targetPatterns: [
      'The rapid development of modern technology // has revolutionized international trade...',
      'Recent archaeological evidence demonstrates // that sustainable agriculture existed in early civilizations...'
    ],
    vocabPrereqs: [
      {
        id: 'v_pte_ra_1',
        term: 'chunking',
        meaningId: 'pengelompokan kata-kata ke dalam unit makna alami untuk bernafas',
        meaningTh: 'การจัดกลุ่มคำตามความหมายเพื่อจังหวะการหายใจที่เหมาะสม',
        exampleSentence: 'Chunking prevents erratic pauses during Read Aloud.'
      },
      {
        id: 'v_pte_ra_2',
        term: 'articulation',
        meaningId: 'kejelasan pengucapan suku kata dan konsonan',
        meaningTh: 'ความชัดเจนในการออกเสียงสระและพยัญชนะ',
        exampleSentence: 'Clear articulation earns maximum Pronunciation points.'
      }
    ],
    sampleUtterances: [
      {
        labelId: 'Contoh Bacaan Lancar 130 WPM',
        labelTh: 'ตัวอย่างการอ่านลื่นไหล 130 WPM',
        text: 'The rapid expansion of urban populations // has intensified pressure on public infrastructure, // compelling city planners to design sustainable public transit systems // that minimize carbon emissions // while enhancing daily commuter accessibility.',
        intent: 'accurate'
      }
    ]
  },
  {
    id: 'scen_pte_rs_level3',
    titleId: 'PTE Tingkat 3: Repeat Sentence (Trik 50% Memori Akustik)',
    titleTh: 'PTE ระดับ 3: Repeat Sentence (กลยุทธ์จำเสียง 50% รักษาจังหวะ)',
    subtitleId: 'Kingmaker Speaking & Listening · Kelancaran Irama Di Atas Segalanya',
    subtitleTh: 'หัวใจสำคัญของการฟังและพูด · จังหวะต่อเนื่องสำคัญที่สุด',
    targetLang: 'en',
    level: 'PTE Academic Target 42-58+',
    difficultyB: 2.8,
    competencyId: 'speak_pte_repeat_sentence',
    competencyNameId: 'PTE Speaking & Listening: Repeat Sentence Acoustic Shadowing',
    competencyNameTh: 'PTE Speaking & Listening: Repeat Sentence การเลียนเสียงจำจังหวะ',
    personaId: 'dr_julian',
    isMeasureExam: false,
    situationId:
      'Latihan resmi Repeat Sentence. Dengarkan kalimat akademik yang diucapkan Dr. Julian, tirukan segera dengan intonasi dan kecepatan yang sama persis. Ingat: tangkap minimal 50% kata tanpa ragu untuk mengamankan nilai kelancaran penuh.',
    situationTh:
      'การฝึก Repeat Sentence ฟังประโยควิชาการจาก Dr. Julian แล้วพูดเลียนแบบทันทีด้วยจังหวะเดิม จำเนื้อหาอย่างน้อย 50% เพื่อคะแนนความคล่องแคล่วสูงสุด',
    openingLine:
      'Repeat Sentence Level 3. In this task, fluency is king. Even if you miss a middle word, never hesitate. Mimic my exact intonation and cadence immediately as I finish. Listen carefully: "The university library offers extensive digital resources for postgraduate researchers." Repeat now.',
    openingTranslationId:
      'Repeat Sentence Tingkat 3. Dalam soal ini, kelancaran adalah raja. Meskipun kamu melewatkan satu kata di tengah, jangan pernah ragu. Tirukan intonasi dan irama saya seketika setelah saya selesai. Dengarkan baik-baik: "The university library offers extensive digital resources for postgraduate researchers." Ulangi sekarang.',
    openingTranslationTh:
      'Repeat Sentence ระดับ 3 ความคล่องแคล่วคือหัวใจสำคัญ แม้จะจำคำตรงกลางไม่ได้ อย่าลังเล เลียนแบบน้ำเสียงและจังหวะของผมทันที ฟังให้ดี: "The university library offers extensive digital resources for postgraduate researchers." พูดตามตอนนี้เลยครับ',
    missionGoalsId: [
      'Tirukan kalimat seketika tanpa jeda "hmmm" di awal.',
      'Pertahankan irama dan intonasi native speaker (suara naik-turun alami).',
      'Ucapkan minimal 50-80% urutan kata dengan benar.'
    ],
    missionGoalsTh: [
      'พูดตามทันทีโดยไม่ลังเลหรือมีเสียง "เอ่อ"',
      'รักษาทำนองและน้ำเสียงแบบเจ้าของภาษา',
      'ออกเสียงคำถูกต้องอย่างน้อย 50-80% ตามลำดับ'
    ],
    targetPatterns: [
      'The university library offers extensive digital resources for postgraduate researchers.',
      'Statistical analysis indicates a significant correlation between sleep quality and academic performance.'
    ],
    vocabPrereqs: [
      {
        id: 'v_pte_rs_1',
        term: 'acoustic memory',
        meaningId: 'kemampuan mengingat bunyi dan irama kalimat sesaat setelah didengar',
        meaningTh: 'ความจำเสียงและจังหวะประโยคทันทีที่ได้ยิน',
        exampleSentence: 'Acoustic memory allows you to echo sentences effortlessly.'
      }
    ],
    sampleUtterances: [
      {
        labelId: 'Tiruan Tepat 100%',
        labelTh: 'การพูดตามถูกต้อง 100%',
        text: 'The university library offers extensive digital resources for postgraduate researchers.',
        intent: 'accurate'
      }
    ]
  },
  {
    id: 'scen_pte_wfd_level4',
    titleId: 'PTE Tingkat 4: Write from Dictation & Ejaan Akademis',
    titleTh: 'PTE ระดับ 4: Write from Dictation (การเขียนตามคำบอกและสะกดคำ)',
    subtitleId: 'Penyumbang Terbesar Nilai Listening & Writing (Kingmaker)',
    subtitleTh: 'คะแนนสูงสุดสำหรับพาร์ทฟังและเขียน · สะกดคำถูกต้อง 100%',
    targetLang: 'en',
    level: 'PTE Academic Target 42-58+',
    difficultyB: 3.0,
    competencyId: 'speak_pte_write_dictation',
    competencyNameId: 'PTE Listening & Writing: Write from Dictation Spelling',
    competencyNameTh: 'PTE Listening & Writing: Write from Dictation การสะกดคำแม่นยำ',
    personaId: 'dr_julian',
    isMeasureExam: false,
    situationId:
      'Latihan Write from Dictation. Dr. Julian akan membacakan satu kalimat akademik pendek. Ketik kalimat tersebut di papan belajar. Perhatikan huruf kapital di awal, tanda titik di akhir, dan ejaan kata kunci.',
    situationTh:
      'การฝึก Write from Dictation ฟังประโยคสั้นๆ จาก Dr. Julian แล้วพิมพ์ลงในกระดาน ระวังตัวพิมพ์ใหญ่จุดเริ่มต้นและจุดสิ้นสุด รวมถึงการสะกดคำที่ถูกต้อง',
    openingLine:
      'Welcome to Level 4: Write from Dictation. Every correct word awards one full point directly to your Listening and Writing scores. Listen to the sentence once, then write it down with meticulous academic spelling: "Government regulations require strict environmental assessments before construction."',
    openingTranslationId:
      'Selamat datang di Tingkat 4: Write from Dictation. Setiap kata yang benar menyumbang satu poin penuh langsung ke skor Listening dan Writing Anda. Dengarkan kalimatnya sekali, lalu ketik dengan ejaan akademis yang teliti: "Government regulations require strict environmental assessments before construction."',
    openingTranslationTh:
      'ยินดีต้อนรับสู่ระดับ 4: Write from Dictation แต่ละคำที่ถูกต้องจะได้รับ 1 คะแนนเต็มเข้าสู่พาร์ทฟังและเขียน ฟังประโยคหนึ่งครั้งแล้วพิมพ์อย่างละเอียด: "Government regulations require strict environmental assessments before construction."',
    missionGoalsId: [
      'Tangkap setiap kata kunci dan ketik di papan belajar.',
      'Perhatikan huruf kapital awal dan tanda titik akhir.',
      'Waspadai ejaan jebakan (double consonants, silent letters).'
    ],
    missionGoalsTh: [
      'จับใจความคำศัพท์หลักและพิมพ์ลงบนกระดาน',
      'ขึ้นต้นด้วยตัวพิมพ์ใหญ่และลงท้ายด้วยจุดเสมอ',
      'ระวังคำสะกดผิดที่พบบ่อย (พยัญชนะซ้ำ, ตัวอักษรไม่ออกเสียง)'
    ],
    targetPatterns: [
      'Government regulations require strict environmental assessments before construction.',
      'The department will publish the updated lecture schedule tomorrow morning.'
    ],
    vocabPrereqs: [
      {
        id: 'v_pte_wfd_1',
        term: 'environmental assessments',
        meaningId: 'penilaian dampak lingkungan',
        meaningTh: 'การประเมินผลกระทบสิ่งแวดล้อม',
        exampleSentence: 'Environmental assessments are legally required before construction.'
      }
    ],
    sampleUtterances: [
      {
        labelId: 'Ejaan Sempurna 100%',
        labelTh: 'การสะกดถูกต้อง 100%',
        text: 'Government regulations require strict environmental assessments before construction.',
        intent: 'accurate'
      }
    ]
  }
];
