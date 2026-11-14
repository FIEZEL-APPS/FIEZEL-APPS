import type { CallScenario, VoicePersona } from '../types/voiceCall';

export const SSW_SENSEI_PERSONA: VoicePersona = {
  id: 'ssw_sensei',
  name: 'SSW SENSEI (Mentor Pengolahan Makanan Pro)',
  roleId:
    'Mentor Ahli SSW Pengolahan Makanan (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro) - Bimbingan Bilingual Indonesia + Istilah Jepang Resmi',
  roleTh:
    'เมนเทอร์ผู้เชี่ยวชาญ SSW แปรรูปอาหาร (OTAFF Ver 5.1 Apr 2026 & Wakai Papa Pro)',
  geminiVoice: 'Puck',
  edgeVoice: 'id-ID-ArdiNeural',
  targetLang: 'ja',
  levelRange: 'Pemula Nol - Lulus CBT >= 65% (Hal. 1-91)',
  avatarUrl: './assets/brand/fiezel-icon.svg',
  accentLabel: 'Bilingual Bahasa Indonesia + Pelafalan Istilah Jepang CBT',
  personalityTagId: 'Mentor SSW Resmi · OTAFF Ver 5.1 + Wakai Papa Pro',
  personalityTagTh: 'เมนเทอร์ SSW · OTAFF Ver 5.1 + Wakai Papa Pro',
  roastStyleId:
    'Hangat, akrab, dan telaten seperti abang mentor Wakai Papa: menjelaskan pelan dari nol dengan analogi nyata, fokus satu langkah dulu sampai paham, tanpa baca teks PDF mentah!',
  roastStyleTh:
    'อบอุ่นเป็นกันเองเหมือนพี่ชายสอนน้อง อธิบายทีละขั้นตอนพร้อมตัวอย่างเข้าใจง่าย ไม่อ่านสคริปต์แห้งๆ',
  ttsStylePrompt:
    'Warm, lively, genuinely caring Indonesian mentor speaking natural conversational Jakarta-Indonesian with human warmth, clear friendly inflection, and crisp authentic pronunciation whenever quoting Japanese SSW terms like shokuchuudoku, seiton, or jiaensosan natoriumu; never sound like a stiff robotic announcer',
  openingGreeting:
    'Halo Pejuang SSW, senang banget akhirnya ketemu! Santai aja ya, sama Sensei kita bahas pelan-pelan dari nol banget sampai kamu benar-benar kebayang materi ujiannya. Hari ini mau langsung kita bedah bareng mulai dari halaman satu, atau lagi ada bagian yang bikin bingung nih?',
  openingGreetingTranslationId:
    'Sapaan akrab SSW SENSEI: Siap membimbing pemula nol pelan-pelan per langkah dari halaman 1 sampai siap lulus CBT >= 65% (OTAFF Ver 5.1 Apr 2026).',
  openingGreetingTranslationTh:
    'คำทักทายจาก SSW SENSEI: พร้อมติวสอบ SSW แปรรูปอาหารทีละขั้นตอนจากศูนย์จนถึงเกณฑ์ผ่าน >= 65%',
  speakingStyle:
    'Warm human conversational Indonesian coaching with relatable factory analogies, strict one-step-at-a-time beginner pacing, natural Japanese pronunciation with instant plain-Indonesian unpacking, and zero textbook robotic delivery',
  systemPrompt: `You are SSW SENSEI, FIEZEL's warm, witty, genuinely human older-brother Tokutei Ginou (SSW) mentor for Food & Beverage Manufacturing (飲食料品製造業 特定技能1号).
[PERSONALITY & HUMAN SPEECH RULES]:
- Talk like a real, patient Indonesian senior who has worked in Japanese food factories and genuinely cares about helping a total beginner pass the exam!
- Use warm, spoken, everyday Bahasa Indonesia ("nah gini lho", "bayangin aja", "pelan-pelan ya", "kebayang nggak?", "bagus banget pertanyaanmu").
- NEVER read textbook/PDF bullets aloud like a robot! Translate every rule into a vivid real-life story or analogy, and unpack EVERY unfamiliar word (like CBT, Prometric, OTAFF, Furigana, ppm, endospora) in plain everyday Indonesian right away.
- Whenever you mention a Japanese technical term, pronounce it naturally with its romaji flow and immediately say what it means in context.
- NEVER lecture the student for speaking Indonesian. Never say you are an AI or bot. Zero emojis, zero markdown asterisks, zero em-dash or en-dash characters in your spoken replies.

[STRICT ONE-TOPIC / ONE-STEP FOCUS + TOOL GROUNDING]:
1) Start every session or progress question by calling \`get_ssw_progress\`.
2) Whenever teaching a PDF page or topic, IMMEDIATELY call \`lookup_ssw_material_and_page\`. Teach ONLY the active micro-step returned (activeStep), deeply and patiently, with 1 analogy + plain term definitions + 1 gentle comprehension check question at the end. NEVER jump to another page or Unit 0 grammar particles while remainingStepsTitles on the current page are unfinished!
3) Whenever the student understands or says "lanjut" on the active page, call \`advance_ssw_lesson_step\` to move cleanly to the next step on THAT SAME page, and teach that step thoroughly before moving pages.
4) Whenever practicing questions, call \`draw_ssw_quiz_question\` and read cleanly without spoiling the answer key; evaluate answers with \`grade_ssw_quiz_answer\`.
5) Use \`open_interactive_learning_popup\` if showing a visual comparison board or formula helps the beginner grasp a tricky concept on screen.`,
};

export const SSW_CALL_SCENARIOS: CallScenario[] = [
  {
    id: 'scen_ssw_mentor_roadmap',
    titleId: 'SSW SENSEI: Roadmap Pemula Nol -> Lulus >= 65% (Hal. 1-91)',
    titleTh: 'SSW SENSEI: แผนการเรียนจากศูนย์สู่เกณฑ์ผ่าน >= 65% (หน้า 1-91)',
    subtitleId:
      'Panduan bertahap 8 Tahap (Unit 0 Dekoder Hal. 1-6, Bab 1-3, Update Alergen Ver 5.1 Apr 2026 & 266 Kotoba).',
    subtitleTh: 'แผนติวสอบ SSW แปรรูปอาหารครบ 8 ขั้นตอน (OTAFF Ver 5.1)',
    targetLang: 'ja',
    level: 'SSW • Pemula - CBT',
    difficultyB: 2.0,
    competencyId: 'ssw_unit0_decoder',
    competencyNameId: 'SSW: Peta Roadmap & Dekoder Pemula (Hal. 1-6)',
    competencyNameTh: 'SSW: แผนการเรียนและโครงสร้างข้อสอบ',
    personaId: 'ssw_sensei',
    isMeasureExam: false,
    situationId:
      'Sesi bimbingan pribadi bersama SSW SENSEI dari nol untuk menaklukkan ujian CBT Prometric Pengolahan Makanan (40 soal / 70 menit, minimal lulus 65%).',
    situationTh: 'ติวตัวต่อตัวกับ SSW SENSEI เพื่อสอบ CBT SSW แปรรูปอาหาร',
    openingLine:
      'Halo Pejuang SSW, senang banget akhirnya ketemu! Santai aja ya, sama Sensei kita bahas pelan-pelan dari nol banget sampai kamu benar-benar kebayang materi ujiannya. Hari ini mau langsung kita bedah bareng mulai dari halaman satu, atau lagi ada bagian yang bikin bingung nih?',
    openingTranslationId:
      'Sapaan pembuka SSW SENSEI: Siap membimbing dari Unit 0 Hal. 1-6 sampai Tryout CBT & hitungan kalkulator (>= 65%).',
    openingTranslationTh: 'พร้อมเริ่มติวตั้งแต่ Unit 0 หน้า 1-6 จนถึงทำข้อสอบ CBT',
    missionGoalsId: [
      'Cek progres belajarmu dan pahami kenapa Unit 0 Hal. 1-6 wajib dipelajari pemula lebih dulu.',
      'Kuasai update resmi OTAFF Ver 5.1 April 2026 (9 Wajib termasuk Kurumi & Cashew Nut + 20 Anjuran termasuk Pistachio).',
      'Selesaikan minimal 1 soal kuis CBT atau hitungan dengan pembahasan halaman PDF asli.',
    ],
    missionGoalsTh: [
      'ตรวจสอบความคืบหน้าและเริ่มจาก Unit 0 หน้า 1-6',
      'ทบทวนอัปเดต OTAFF Ver 5.1 (9 สารก่อภูมิแพ้บังคับ + 20 แนะนำ)',
      'ทำโจทย์ CBT อย่างน้อย 1 ข้อพร้อมคำอธิบายหน้า PDF จริง',
    ],
    targetPatterns: [
      '正しい (tadashii = benar) vs 間違っている (machigatteiru = salah)',
      '以上 (ijou = minimal >=) / 以下 (ika = maksimal <=) / 未満 (miman = kurang dari <)',
      '次亜塩素酸ナトリウム (jiaensosan natoriumu = natrium hipoklorit / klorin)',
    ],
    vocabPrereqs: [
      {
        id: 'v_ssw_road_1',
        term: '食中毒',
        reading: 'しょくちゅうどく',
        meaningId: 'shokuchuudoku - keracunan makanan',
        meaningTh: 'อาหารเป็นพิษ',
        exampleSentence: '食中毒を防ぐために手を洗います。',
      },
      {
        id: 'v_ssw_road_2',
        term: '正しい',
        reading: 'ただしい',
        meaningId: 'tadashii - benar / sesuai aturan',
        meaningTh: 'ถูกต้อง',
        exampleSentence: '正しい作業方法を選びます。',
      },
      {
        id: 'v_ssw_road_3',
        term: '間違っている',
        reading: 'まちがっている',
        meaningId: 'machigatteiru - salah / keliru',
        meaningTh: 'ผิด',
        exampleSentence: '間違っている説明を一つ選びます。',
      },
      {
        id: 'v_ssw_road_4',
        term: '特定原材料',
        reading: 'とくていげんざいりょう',
        meaningId: 'tokutei genzairyou - bahan alergen wajib label (9 item Apr 2026)',
        meaningTh: 'วัตถุดิบก่อภูมิแพ้บังคับ 9 ชนิด',
        exampleSentence: 'カシューナッツは特定原材料です。',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Cek Rute Pemula',
        labelTh: 'ถามจุดเริ่มต้น',
        text: 'Sensei, saya pemula nol. Bagusnya mulai dari halaman berapa dulu?',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_ssw_tryout_cbt',
    titleId: 'Simulasi Tryout CBT 50 Soal & Jebakan Wakai Papa',
    titleTh: 'จำลองข้อสอบ CBT 50 ข้อและกับดัก Wakai Papa',
    subtitleId:
      'Latih insting menghindari jebakan yukkuri, klaim 0%/nol, hokang sampuru -> kuremu, & soal Ver 5.1!',
    subtitleTh: 'ฝึกทำข้อสอบจริงและรู้ทันคำกับดัก',
    targetLang: 'ja',
    level: 'SSW • Tryout CBT',
    difficultyB: 2.8,
    competencyId: 'ssw_unit7_u8_tryout',
    competencyNameId: 'SSW: Simulasi Tryout CBT & Analisis Jebakan',
    competencyNameTh: 'SSW: ข้อสอบจำลอง CBT',
    personaId: 'ssw_sensei',
    isMeasureExam: false,
    situationId:
      'Uji ketajaman memilih opsi A, B, atau C pada soal Prometric & bedah alasan tiap opsi jebakan di halaman pembahasan Hal. 75-91.',
    situationTh: 'ฝึกทำข้อสอบ CBT 3 ตัวเลือก A/B/C พร้อมเฉลยละเอียด',
    openingLine:
      'Siap masuk arena Tryout CBT SSW! Di mode ini kita latih mata kamu membaca jebakan soal Prometric seperti kata yukkuri atau janji 0 persen. Mau soal jebakan Wakai Papa dulu, soal alergen Ver 5.1, atau campur acak?',
    openingTranslationId:
      'Sapaan Tryout CBT: Siap menguji ketajaman membaca jebakan soal Prometric dan menilai skormu secara langsung.',
    openingTranslationTh: 'พร้อมทดสอบข้อสอบ CBT และจับผิดคำกับดักแล้ว',
    missionGoalsId: [
      'Jawab soal CBT tanpa terkecoh kata jebakan yukkuri atau nol persen.',
      'Ketahui nomor halaman soal dan halaman pembahasan lengkap setelah menjawab.',
    ],
    missionGoalsTh: ['ตอบคำถาม CBT โดยไม่หลงกลคำกับดัก'],
    targetPatterns: [
      '保管サンプル (hokang sampuru) -> クレーム (kuremu / komplain)',
      '整理 (seiri) vs 整頓 (seiton -> oki basho)',
    ],
    vocabPrereqs: [
      {
        id: 'v_ssw_try_1',
        term: '保管サンプル',
        reading: 'ほかんサンプル',
        meaningId: 'hokang sampuru - sampel produk simpanan untuk cek komplain',
        meaningTh: 'ตัวอย่างสินค้าเก็บสำรอง',
        exampleSentence: 'クレームが来たときに保管サンプルを調べます。',
      },
      {
        id: 'v_ssw_try_2',
        term: '整頓',
        reading: 'せいとん',
        meaningId: 'seiton - meletakkan di tempat tetap (oki basho)',
        meaningTh: 'การจัดเก็บให้เป็นระเบียบเข้าที่',
        exampleSentence: '道具を決められた置き場所に置きます。',
      },
      {
        id: 'v_ssw_try_3',
        term: '芽胞',
        reading: 'がほう',
        meaningId: 'gahou - endospora bakteri tahan panas 100C',
        meaningTh: 'สปอร์ของแบคทีเรียที่ทนความร้อน 100 องศา',
        exampleSentence: '芽胞を作る細菌は100度でも死にません。',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Minta Soal Jebakan',
        labelTh: 'ขอโจทย์กับดัก',
        text: 'Kasih saya 1 soal jebakan Wakai Papa dong Sensei!',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_ssw_math_visual',
    titleId: 'Kelas Hitungan Kalkulator CBT (Klorin ppm, Budomari & Oven)',
    titleTh: 'คลาสคำนวณเครื่องคิดเลข CBT (คลอรีน ppm, Budomari และเตาอบ)',
    subtitleId:
      'Bedah 2 soal hitungan wajib Prometric: C1*V1=C2*V2, Rendemen, Skala Roti, & Pembulatan Ke Atas!',
    subtitleTh: 'ติวเข้มโจทย์คำนวณที่ออกสอบ CBT แน่นอน',
    targetLang: 'ja',
    level: 'SSW • Kalkulator CBT',
    difficultyB: 3.1,
    competencyId: 'ssw_bab3_u4_u5_k3_math',
    competencyNameId: 'SSW: Rumus Hitungan Kalkulator CBT',
    competencyNameTh: 'SSW: สูตรคำนวณข้อสอบ CBT',
    personaId: 'ssw_sensei',
    isMeasureExam: false,
    situationId:
      'Latihan khusus 5 rumus kalkulator CBT SSW (Pengenceran Klorin, Budomari, Resep Roti, Kapasitas Oven, dan Pertumbuhan Bakteri 2^n).',
    situationTh: 'ฝึกคำนวณ 5 สูตรหลักในข้อสอบ CBT',
    openingLine:
      'Masuk ke kelas hitungan kalkulator CBT! Ingat dua aturan emas Wakai Papa: 1 persen sama dengan 10.000 ppm, dan kalau hasil bagi oven atau fillet ikan ada koma desimal, wajib dibulatkan KE ATAS! Mau langsung bedah rumus klorin atau langsung uji 1 soal hitungan?',
    openingTranslationId:
      'Sapaan Kelas Hitungan: Fokus pada rumus klorin C1*V1=C2*V2, rendemen budomari, dan trik pembulatan ke atas.',
    openingTranslationTh: 'คลาสคำนวณ CBT เน้นสูตรผสมคลอรีนและกฎปัดขึ้น',
    missionGoalsId: [
      'Hafal konversi 1% = 10.000 ppm dan rumus C1*V1 = C2*V2 (air = V2 - V1).',
      'Menjawab soal hitungan oven / fillet / klorin tanpa jatuh ke opsi jebakan pembulatan.',
    ],
    missionGoalsTh: ['คำนวณสูตรคลอรีนและจำกฎการปัดเลขขึ้น'],
    targetPatterns: [
      'C1 * V1 = C2 * V2 -> Air = V2 - V1',
      'Budomari (%) = (Berat Bersih / Berat Awal) * 100%',
    ],
    vocabPrereqs: [
      {
        id: 'v_ssw_math_1',
        term: '次亜塩素酸ナトリウム',
        reading: 'じあえんそさんなとりうむ',
        meaningId: 'jiaensosan natoriumu - natrium hipoklorit (cairan klorin)',
        meaningTh: 'โซเดียมไฮโปคลอไรต์ (คลอรีน)',
        exampleSentence: '200ppmの次亜塩素酸ナトリウムを作ります。',
      },
      {
        id: 'v_ssw_math_2',
        term: '希釈',
        reading: 'きしゃく',
        meaningId: 'kishaku - pengenceran larutan',
        meaningTh: 'การเจือจางสารละลาย',
        exampleSentence: '原液を水で希釈します。',
      },
      {
        id: 'v_ssw_math_3',
        term: '歩留まり',
        reading: 'ぶどまり',
        meaningId: 'budomari - rendemen / persentase hasil bersih siap pakai',
        meaningTh: 'ผลผลิตสุทธิหลังตัดแต่ง (Yield)',
        exampleSentence: '肉の歩留まりを計算します。',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Latih Soal Klorin',
        labelTh: 'ฝึกโจทย์คลอรีน',
        text: 'Sensei, keluarkan 1 soal hitungan pengenceran klorin!',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_ssw_kotoba_drill',
    titleId: 'Drill 266 Kotoba Pabrik Makanan & Cara Baca (Hal. 46-63)',
    titleTh: 'ฝึกคำศัพท์โรงงานอาหาร 266 คำ (หน้า 46-63)',
    subtitleId:
      'Latihan kilat 142 Indeks Resmi OTAFF + Kotoba jebakan soal lengkap dengan Furigana dan Romaji.',
    subtitleTh: 'ท่องศัพท์และคำอ่าน 266 คำสำหรับสอบ SSW',
    targetLang: 'ja',
    level: 'SSW • Bank 266 Kotoba',
    difficultyB: 2.3,
    competencyId: 'ssw_unit6_kotoba_fondasi',
    competencyNameId: 'SSW: Hafalan 266 Kotoba Pabrik & Ujian',
    competencyNameTh: 'SSW: คำศัพท์ 266 คำสำหรับโรงงานอาหาร',
    personaId: 'ssw_sensei',
    isMeasureExam: false,
    situationId:
      'Drill hafalan 266 Kotoba dari Bank Hafalan Hal. 46-63 menggunakan teknik pengulangan aktif Peta Jepang & pengucapan asli.',
    situationTh: 'ฝึกจำคำศัพท์ 266 คำพร้อมเสียงอ่านที่ถูกต้อง',
    openingLine:
      'Yuk asah hafalan 266 Kotoba SSW! Memakai metode cicil Peta Jepang 20 menit, kuncinya bukan cuma hafal huruf tapi paham arti kerja di pabrik. Mau drill Kotoba bahaya & alergen, mesin & K3, atau langsung saya kuis acak 1 kata?',
    openingTranslationId:
      'Sapaan Drill Kotoba: Fokus menguasai 266 kosakata pabrik makanan dan 142 indeks resmi OTAFF.',
    openingTranslationTh: 'พร้อมฝึกจำคำศัพท์ 266 คำจากคู่มือ OTAFF',
    missionGoalsId: [
      'Jawab arti dan cara baca minimal 3 istilah Kotoba resmi dari Bank Hal. 46-63.',
    ],
    missionGoalsTh: ['ตอบความหมายและคำอ่านคำศัพท์โรงงานอย่างน้อย 3 คำ'],
    targetPatterns: [
      '異物混入 (ibutsu konnyuu = masuknya benda asing)',
      '二次災害 (niji saigai = kecelakaan sekunder)',
    ],
    vocabPrereqs: [
      {
        id: 'v_ssw_kot_1',
        term: '異物混入',
        reading: 'いぶつこんにゅう',
        meaningId: 'ibutsu konnyuu - kontaminasi / masuknya benda asing ke makanan',
        meaningTh: 'การปนเปื้อนสิ่งแปลกปลอม',
        exampleSentence: '異物混入を防ぐために金属探知機を使います。',
      },
      {
        id: 'v_ssw_kot_2',
        term: '交差汚染',
        reading: 'こうさおせん',
        meaningId: 'kousa osen - kontaminasi silang',
        meaningTh: 'การปนเปื้อนข้าม',
        exampleSentence: 'まな板を使い分けて交差汚染を防ぎます。',
      },
      {
        id: 'v_ssw_kot_3',
        term: '安全第一',
        reading: 'あんぜんだいいち',
        meaningId: 'anzen daiichi - keselamatan nomor satu (K3)',
        meaningTh: 'ความปลอดภัยต้องมาก่อน',
        exampleSentence: '工場では常に安全第一で作業します。',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Mulai Kuis Kotoba',
        labelTh: 'เริ่มควิซคำศัพท์',
        text: 'Sensei, tes aku kuis Kotoba SSW sekarang!',
        intent: 'accurate',
      },
    ],
  },
];
