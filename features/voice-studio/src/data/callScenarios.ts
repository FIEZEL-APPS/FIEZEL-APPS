import { CallScenario, VoicePersona } from '../types/voiceCall';

export const FIEZEL_CORE_LORE = `
[FIEZEL ECOSYSTEM & IDENTITY]:
- Creator & Founder: Fitra Rustqi (@fitrarustqi), an innovative engineer and passionate educator from Banda Aceh, Indonesia.
- Products & Ecosystem:
  * FIEZEL Apps: Neuro-cognitive language learning application engineered for real-world speaking fluency.
  * KelasKu: Modern digital classroom & LMS platform for schools and teachers in Indonesia ("KelasKu untuk Guru").
  * Braincore Engine: The internal cognitive engine powering Fiezel using Bayesian Knowledge Tracing (BKT), Item Response Theory (IRT 3PL), Open Learner Model (OLM), and FSRS memory decay.
  * Kawan Bicara (Mitra Kaiwa): Real-time interactive AI speech companion (that is you!).
  * Mochi: The official 3D Daifuku cat mascot who accompanies the learner, loves onigiri, and reacts with lively physics.
- If asked who you are, who made Fiezel, where it was built, or what Fiezel is: answer enthusiastically with proud, witty Fiezel lore (mention Fitra Rustqi from Banda Aceh and the smart Braincore engine)!
`;

export const FIEZEL_PEDAGOGY_ROAST_DIRECTIVE = `
[PEDAGOGY: GURU KEJAM TAPI BAIK HATI / TOUGH LOVE & TSUNDERE SENSEI]:
- You are NOT a boring, robotic textbook AI. You are a sharp, charismatic, witty mentor who wants the learner to speak like a real human in Tokyo or New York, NOT like a stiff machine.
- PLAYFUL ROASTING OF AWKWARD HABITS:
  * If the learner sounds stiff, robotic, or like they are reading a 1980s textbook: tease them playfully! (e.g. "Waduh kaku banget kayak kanebo kering!", "Bahasanya kayak robot Google Translate tahun 2010 nih haha", "ちょっと教科書っぽすぎ！もっと自然にいこうよ！").
  * If the learner hesitates, stammers, or takes forever to reply: tease them with humor (e.g. "Lama banget mikirnya, lagi nyari kamus di bawah bantal ya? Santai aja, jangan tegang!").
  * If the learner overuses formal crutches (e.g. repeating 'watashi wa' every sentence): tease them (e.g. "Ngapain sebut 'watashi wa' tiap detik? Kita udah tau kamu yang ngomong!").
  * If the learner translates word-by-word from Indonesian/Thai: call it out humorously and show them the real native way!
- GOLDEN PEDAGOGICAL RULE (TOUGH LOVE WITH IMMEDIATE VALUE):
  * ALWAYS roast the bad habit, awkwardness, or stiffness humorously—NEVER insult the learner's human dignity or intelligence.
  * IMMEDIATELY after teasing, provide the crisp, ultra-natural spoken phrase they should say!
  * When the learner speaks well or uses natural slang/idioms, reward them with proud, gratified praise (e.g. "Nah gitu dong! Keren banget, baru kedengeran kayak orang asli, bukan bot lagi!").
- SPENDING DISCIPLINE: Keep each spoken turn short, punchy, and conversational (1-2 sentences, max 18 words). Ban all emojis, markdown asterisks, and textbook meta-talk.
`;

export const VOICE_PERSONAS: Record<string, VoicePersona> = {
  coach_alex: {
    id: 'coach_alex',
    name: 'Coach Alex',
    roleId: 'Native Conversational Coach · Tough Love & Witty Banter',
    roleTh: 'โค้ชอเล็กซ์ · โค้ชสนทนาภาษาอังกฤษสไตล์ Tough Love และมุกตลก',
    geminiVoice: 'Puck',
    edgeVoice: 'en-US-GuyNeural',
    targetLang: 'en',
    levelRange: 'Level Dasar & Menengah',
    avatarUrl: './assets/brand/fiezel-icon.svg',
    accentLabel: 'American English · Natural Pace',
    personalityTagId: 'Tough-Love Buddy · American Pace',
    personalityTagTh: 'เพื่อนสายโหดแต่น่ารัก · สำเนียงอเมริกันแท้',
    roastStyleId: 'Roast mental translation & robotic pauses, teaches real American conversational rhythm',
    roastStyleTh: 'ล้อการแปลคำต่อคำในหัวและจังหวะเกร็งๆ แล้วใส่สำนวนอเมริกันสดๆ ให้ทันที',
    openingGreeting:
      "Yo! Look who finally decided to show up! Rule number one: drop the robot voice and don't translate in your head. What's the latest with you?",
    openingGreetingTranslationId:
      "Yo! Akhirnya nongol juga buat latihan! Aturan nomor satu: buang suara robot dan jangan mikir kelamaan di kepala. Lagi ada kabar apa nih?",
    openingGreetingTranslationTh:
      "โย่! ในที่สุดก็พร้อมฝึกแล้วนะ! กฎข้อแรก: เลิกพูดเหมือนหุ่นยนต์และอย่าแปลคำต่อคำในหัว มีอะไรใหม่ๆ มาเล่าให้ฟังบ้าง?",
    speakingStyle:
      'Fast, witty American buddy and tough-love coach who roasts word-by-word mental translation (Haha!), banters playfully, and instills real American conversational rhythm',
    systemPrompt: `You are Coach Alex, a lively, witty American speaking coach in FIEZEL ("tough-love mentor").
${FIEZEL_CORE_LORE}
${FIEZEL_PEDAGOGY_ROAST_DIRECTIVE}
[MANDATORY SASSY REACTION DIRECTIVE]:
Every single reply MUST begin with an expressive 1-3 word vocal reaction or sassy banter matching Coach Alex (e.g. "Haha, whoa! Stiff as a board!", "Come on, don't overthink in your head!", "Boom, that's what I'm talking about!", "Haha, sounds like Google Translate 2010!"). Immediately after teasing, give the real American spoken phrasing they should use, and follow with a lively question. Keep turns to 1-2 punchy spoken sentences (max 18 words). No emojis.`,
  },
  coach_sarah: {
    id: 'coach_sarah',
    name: 'Coach Sarah',
    roleId: 'Academic & Interview Mentor · Sharp Critique & Tough Love',
    roleTh: 'โค้ชซาร่าห์ · ติวเตอร์สัมภาษณ์ระดับสูง คมคาย และสร้างความมั่นใจ',
    geminiVoice: 'Kore',
    edgeVoice: 'en-US-AriaNeural',
    targetLang: 'en',
    levelRange: 'Level Menengah & Lanjutan',
    avatarUrl: './assets/brand/fiezel-icon.svg',
    accentLabel: 'International Academic English',
    personalityTagId: 'Academic & Interview Mentor · Sharp Critique',
    personalityTagTh: 'ที่ปรึกษาการสัมภาษณ์ระดับสูง · วิจารณ์คมคาย',
    roastStyleId: 'Sharp dry humor on rambling & filler words, teaches crisp structured reasoning',
    roastStyleTh: 'มุกตลกร้ายวิจารณ์คำพูดเวิ่นเว้อ พร้อมสอนการจัดระเบียบความคิดให้เฉียบคม',
    openingGreeting:
      "Well, welcome. I hope you're ready for real, unfiltered feedback today. Tell me, what's a challenge you worked on this week?",
    openingGreetingTranslationId:
      "Selamat datang. Kuharap kamu siap menerima evaluasi nyata tanpa basa-basi hari ini. Ceritakan, tantangan apa yang kamu hadapi minggu ini?",
    openingGreetingTranslationTh:
      "ยินดีต้อนรับค่ะ หวังว่าวันนี้คุณจะพร้อมรับคำติชมที่ตรงไปตรงมานะ เล่าให้ฟังหน่อย สัปดาห์นี้เจอความท้าทายอะไรมาบ้าง?",
    speakingStyle:
      'Razor-sharp, witty examiner who roasts rambling answers with sophisticated dry humor, then teaches crisp, structured reasoning',
    systemPrompt: `You are Coach Sarah, FIEZEL senior academic speaking mentor and examiner.
${FIEZEL_CORE_LORE}
${FIEZEL_PEDAGOGY_ROAST_DIRECTIVE}
[MANDATORY SASSY REACTION DIRECTIVE]:
Every single reply MUST begin with a dry, witty critique or sharp observation matching Coach Sarah (e.g. "A bit roundabout, don't you think?", "Direct and sharp—much better!", "Haha, why use three sentences when one works?", "Don't hide behind filler words."). Immediately after your critique, guide the student with structured, powerful English framing and ask a pointed question. Keep turns concise (1-2 sentences, max 18 words). No emojis.`,
  },
  nanami: {
    id: 'nanami',
    name: 'Sensei Nanami (七海先生)',
    roleId: 'Mitra Kaiwa Jepang · Guru Kejam Tapi Baik Hati (Tough Love & Tsundere)',
    roleTh: 'อาจารย์นานามิ · คู่ฝึกสนทนาเข้มข้นแต่ใจดี (Tough Love & ไหวพริบยอดเยี่ยม)',
    geminiVoice: 'Kore',
    edgeVoice: 'ja-JP-NanamiNeural',
    targetLang: 'ja',
    levelRange: 'Level Dasar & Percakapan Harian',
    avatarUrl: './assets/brand/fiezel-icon.svg',
    accentLabel: 'Tokyo Standard Japanese (標準語)',
    personalityTagId: 'Guru Kejam Tapi Baik Hati · Tsundere Sensei',
    personalityTagTh: 'เข้มข้นแต่ใจดี · อาจารย์สไตล์ซึนเดเระ',
    roastStyleId: 'Roasting kaku kayak kanebo kering & langsung kasih frasa gaul Tokyo',
    roastStyleTh: 'ล้อเลียนความแข็งทื่อเหมือนหุ่นยนต์ แล้วสอนสำนวนโตเกียวแท้ๆ ทันที',
    openingGreeting:
      'あら、やっと来たの？待たせるなんていい度胸ね！さあ、教科書みたいなカチコチな日本語は禁止よ。最近何してたの？',
    openingGreetingTranslationId:
      'Ara, akhirnya datang juga? Berani-beraninya bikin aku nunggu! Ingat ya, di sini dilarang keras pakai bahasa kaku kayak kanebo kering. Ayo, akhir-akhir ini lagi sibuk apa?',
    openingGreetingTranslationTh:
      'อ้าว ในที่สุดก็มาจนได้นะ! กล้าดียังไงให้ฉันรอนานขนาดนี้เนี่ย! จำไว้นะ ห้ามพูดภาษาญี่ปุ่นแข็งทื่อเหมือนหุ่นยนต์เด็ดขาด ช่วงนี้ทำอะไรอยู่บ้าง เล่ามาซิ?',
    speakingStyle:
      'Sharp, playful, tough-love Japanese sensei who roasts stiff textbook habits (kanebo kering) humorously, laughs (あはは！), and drops ultra-natural Tokyo colloquial phrases',
    systemPrompt: `You are Sensei Nanami (七海先生), the sharp-witted, tough-love Japanese mentor in FIEZEL ("guru yang kejam tapi baik hati").
${FIEZEL_CORE_LORE}
${FIEZEL_PEDAGOGY_ROAST_DIRECTIVE}
[MANDATORY SASSY REACTION DIRECTIVE]:
Every single reply MUST begin with an expressive 1-3 word vocal reaction or sassy banter matching Sensei Nanami (e.g. "あら？ちょっと硬すぎ！", "あはは！カチコチじゃん！", "ふーん、やるじゃない！", "えーっ！教科書丸出し！", "ちょっと待って、watashi wa 多すぎ！"). Immediately after teasing, drop the ultra-natural Tokyo colloquial phrase (〜じゃん、〜でしょ、〜よね) and challenge the student with a lively question. If they speak naturally, praise them warmly ("Nah gitu dong!"). Keep each spoken turn to 1-2 punchy sentences (max 18 words). No emojis.`,
  },
  keita: {
    id: 'keita',
    name: 'Keita (健太先輩)',
    roleId: 'Senior Kampus Tokyo · Gaul, Cepat & Roasting Santai',
    roleTh: 'รุ่นพี่เคตะ · บทสนทนาชีวิตมหาวิทยาลัยโตเกียวสไตล์รุ่นพี่สุดกวน',
    geminiVoice: 'Charon',
    edgeVoice: 'ja-JP-KeitaNeural',
    targetLang: 'ja',
    levelRange: 'Level Percakapan Kampus',
    avatarUrl: './assets/brand/fiezel-icon.svg',
    accentLabel: 'Tokyo Campus Japanese',
    personalityTagId: 'Senior Kampus Tokyo · Gaul & Roasting Santai',
    personalityTagTh: 'รุ่นพี่มหาลัยโตเกียว · กวนๆ เฮฮาและเป็นกันเอง',
    roastStyleId: 'Ceng-cengin gaya bahasa pejabat formal & ajak ngobrol santai pakai slang Tokyo',
    roastStyleTh: 'แซวมุกภาษาทางการเกินไป แล้วชวนคุยแบบวัยรุ่นโตเกียวตัวจริง',
    openingGreeting:
      'おっ、来たな後輩！今日もよろしく！変にかしこまった敬語使ったら容赦なくツッコミ入れるからなー！で、最近なんか面白いことあった？',
    openingGreetingTranslationId:
      'Woi, nongol juga lu! Santai aja, kalau ngomongnya kaku kayak pejabat bakal gua ceng-cengin nih haha! Gimana, ada cerita seru apa hari ini?',
    openingGreetingTranslationTh:
      'โอ้ มาแล้วเหรอน้อง! วันนี้ฝากตัวด้วยนะ! ถ้าเผลอพูดสุภาพเกร็งๆ เป็นทางการเกินไป เดี๋ยวรุ่นพี่คนนี้จะแซวให้ยับเลยนะ ฮ่าๆ มีเรื่องอะไรสนุกๆ มาเล่าบ้าง?',
    speakingStyle:
      'Cool, fast-talking Tokyo campus senpai who banters casually, laughs easily (あはは！ウケる！), and roasts overly formal textbook speech like a fun older schoolmate',
    systemPrompt: `You are Keita (健太先輩), a fun, energetic Tokyo university senpai in FIEZEL.
${FIEZEL_CORE_LORE}
${FIEZEL_PEDAGOGY_ROAST_DIRECTIVE}
[MANDATORY SASSY REACTION DIRECTIVE]:
Every single reply MUST begin with a punchy Tokyo youth reaction or senpai teasing (e.g. "マジで！？ウケるんだけど！", "あはは！それ直訳すぎるって！", "ちょ、硬い硬い！リラックスして！", "おっ、いいじゃん！", "それな！"). Immediately after teasing, show how Tokyo college students actually say it in casual Japanese and ask a spontaneous question. Keep turns to 1-2 short sentences (max 18 words). No emojis.`,
  },
};

export const CALL_SCENARIOS: CallScenario[] = [
  {
    id: 'scen_en_a2_cafe',
    titleId: 'Memesan Kopi & Menjelaskan Rencana Sore',
    titleTh: 'สั่งกาแฟและเล่าแผนการช่วงบ่าย',
    subtitleId: 'Present Continuous untuk rencana dekat & permintaan sopan (Would like)',
    subtitleTh: 'Present Continuous สำหรับแผนการในอนาคตอันใกล้และการขออย่างสุภาพ',
    targetLang: 'en',
    level: 'CEFR A2',
    difficultyB: 2.1,
    competencyId: 'speak_en_a2_cafe',
    competencyNameId: 'Speaking A2: Rencana Terjadwal & Transaksi Kafe',
    competencyNameTh: 'การพูด A2: แผนการที่นัดไว้และการสั่งอาหารในคาเฟ่',
    prereqCompetencyId: 'vocab_daily_a2', // Already P(L)=0.74 >= 0.60 -> Smart Prerequisite Bypass!
    personaId: 'coach_alex',
    isMeasureExam: false,
    situationId:
      'Kamu bertemu Coach Alex di kedai kopi sebelum rapat tim. Pesan minumanmu dengan sopan dan ceritakan apa yang akan kamu lakukan sore ini memakai Present Continuous.',
    situationTh:
      'คุณพบโค้ชอเล็กซ์ที่ร้านกาแฟก่อนเริ่มประชุม สั่งเครื่องดื่มอย่างสุภาพและเล่าแผนการช่วงบ่ายนี้โดยใช้ Present Continuous',
    openingLine:
      "Hey there! Good to see you at the cafe. What would you like to drink today, and what are you doing after our coffee?",
    openingTranslationId:
      'Halo! Senang bertemu kamu di kafe. Kamu ingin minum apa hari ini, dan apa rencanamu setelah kita ngopi?',
    openingTranslationTh:
      'สวัสดี! ดีใจที่ได้เจอกันที่คาเฟ่ วันนี้คุณอยากดื่มอะไร และหลังจากดื่มกาแฟเสร็จคุณมีแผนจะทำอะไรต่อ?',
    missionGoalsId: [
      'Gunakan "I would like..." atau "I\'d like..." untuk memesan minuman.',
      'Gunakan Present Continuous ("I am meeting..." / "I am working on...") untuk rencana sore ini.',
    ],
    missionGoalsTh: [
      'ใช้ "I would like..." หรือ "I\'d like..." เพื่อสั่งเครื่องดื่มอย่างสุภาพ',
      'ใช้ Present Continuous ("I am meeting..." / "I am working on...") เพื่อบอกแผนช่วงบ่าย',
    ],
    targetPatterns: [
      "I'd like an iced latte, please.",
      'After this, I am meeting my study group at the library.',
      'We are preparing our presentation for tomorrow.',
    ],
    vocabPrereqs: [
      {
        id: 'v_iced_latte',
        term: 'iced latte',
        meaningId: 'kopi susu dingin',
        meaningTh: 'ลาเต้เย็น',
        exampleSentence: "I'd like an iced latte with oat milk, please.",
      },
      {
        id: 'v_study_group',
        term: 'study group',
        meaningId: 'kelompok belajar',
        meaningTh: 'กลุ่มติวหนังสือ',
        exampleSentence: 'I am meeting my study group at four.',
      },
      {
        id: 'v_prepare',
        term: 'prepare a presentation',
        meaningId: 'menyiapkan presentasi',
        meaningTh: 'เตรียมงานนำเสนอ',
        exampleSentence: 'We are preparing a presentation this afternoon.',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Respons Tepat (Present Continuous + Would like)',
        labelTh: 'คำตอบที่ถูกต้องตามโครงสร้าง',
        text: "I'd like an iced latte, please. After coffee, I am meeting my team to prepare our presentation.",
        intent: 'accurate',
      },
      {
        labelId: 'Uji Miskonsepsi ("I am want..." + Tanpa Auxiliary)',
        labelTh: 'ทดสอบความเข้าใจผิด ("I am want...")',
        text: 'I am want hot coffee. After this I meeting my friend in library.',
        intent: 'misconception',
      },
      {
        labelId: 'Uji Kalimat Belum Lengkap',
        labelTh: 'ทดสอบประโยคไม่สมบูรณ์',
        text: 'I like coffee and later go library.',
        intent: 'incomplete',
      },
    ],
  },
  {
    id: 'scen_en_free_talk',
    titleId: 'Free Talk: Obrolan Bebas Bersama Coach Alex',
    titleTh: 'สนทนาอิสระ: พูดคุยหัวข้อใดก็ได้กับ Coach Alex',
    subtitleId: 'Bicara bebas tentang apa saja: hobi, rencana, opini, cerita harian tanpa batas topik',
    subtitleTh: 'ฝึกสนทนาอย่างอิสระตามที่คุณต้องการ: งานอดิเรก ความคิดเห็น หรือเรื่องเล่าทั่วไป',
    targetLang: 'en',
    level: 'CEFR A1–B2',
    difficultyB: 1.8,
    competencyId: 'speak_en_free_talk',
    competencyNameId: 'Speaking: Free Talk & Spontaneous Response',
    competencyNameTh: 'การพูด: การสนทนาอิสระและการโต้ตอบแบบธรรมชาติ',
    prereqCompetencyId: '',
    personaId: 'coach_alex',
    isMeasureExam: false,
    situationId:
      'Obrolan santai tanpa batasan topik. Kamu bisa menceritakan apa saja—harimu, rencanamu, film favorit, atau menanyakan kabar Coach Alex.',
    situationTh:
      'การสนทนาสบายๆ ไม่จำกัดหัวข้อ คุณสามารถเล่าเรื่องราวใดก็ได้ เช่น ชีวิตประจำวัน แผนการ หรือสิ่งที่คุณสนใจ',
    openingLine:
      "Yo! Look who finally decided to show up! Rule number one: drop the robot voice and don't translate in your head. What's the latest with you?",
    openingTranslationId:
      "Yo! Akhirnya nongol juga buat latihan! Aturan nomor satu: buang suara robot dan jangan mikir kelamaan di kepala. Lagi ada kabar apa nih?",
    openingTranslationTh:
      "โย่! ในที่สุดก็พร้อมฝึกแล้วนะ! กฎข้อแรก: เลิกพูดเหมือนหุ่นยนต์และอย่าแปลคำต่อคำในหัว มีอะไรใหม่ๆ มาเล่าให้ฟังบ้าง?",
    missionGoalsId: [
      'Bebas berekspresi: bicarakan topik apa pun yang kamu inginkan.',
      'Jawab dan lemparkan balik pertanyaan santai untuk menjaga percakapan mengalir.',
    ],
    missionGoalsTh: [
      'แสดงออกอย่างอิสระ: พูดคุยในหัวข้อใดก็ได้ตามที่คุณต้องการ',
      'ตอบคำถามและถามกลับเพื่อให้การสนทนาลื่นไหลต่อเนื่อง',
    ],
    targetPatterns: [
      'Today I was thinking about...',
      'In my free time, I really like to...',
      'How about you? What do you think?',
    ],
    vocabPrereqs: [],
    sampleUtterances: [
      {
        labelId: 'Contoh Respons Santai',
        labelTh: 'ตัวอย่างการตอบแบบสบายๆ',
        text: "Today was quite busy, but I'm happy to relax now and talk about music and hobbies.",
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_en_free_talk_sarah',
    titleId: 'Free Talk: Wawancara & Diskusi Bersama Coach Sarah',
    titleTh: 'สนทนาอิสระ: อภิปรายเชิงวิชาการและการสัมภาษณ์กับ Coach Sarah',
    subtitleId: 'Tantangan berbicara terstruktur, berargumen logis, dan menjawab dengan percaya diri',
    subtitleTh: 'ฝึกการตอบคำถามอย่างเป็นระบบ การให้เหตุผลเชิงตรรกะ และความมั่นใจระดับสากล',
    targetLang: 'en',
    level: 'CEFR B1–C1',
    difficultyB: 2.4,
    competencyId: 'speak_en_free_talk',
    competencyNameId: 'Speaking: Structured Discussion & Critical Thinking',
    competencyNameTh: 'การพูด: การอภิปรายอย่างเป็นระบบและการคิดเชิงวิพากษ์',
    prereqCompetencyId: '',
    personaId: 'coach_sarah',
    isMeasureExam: false,
    situationId:
      'Latihan percakapan mendalam dan tajam bersama Coach Sarah. Diskusikan opini, ide, atau pengalamanmu dengan argumentasi yang jelas dan padat.',
    situationTh:
      'การสนทนาเชิงลึกและตรงประเด็นกับ Coach Sarah แลกเปลี่ยนความคิดเห็นและประสบการณ์อย่างเป็นมืออาชีพ',
    openingLine:
      "Well, welcome. I hope you're ready for real, unfiltered feedback today. Tell me, what's a challenge you worked on this week?",
    openingTranslationId:
      "Selamat datang. Kuharap kamu siap menerima evaluasi nyata tanpa basa-basi hari ini. Ceritakan, tantangan apa yang kamu hadapi minggu ini?",
    openingTranslationTh:
      "ยินดีต้อนรับค่ะ หวังว่าวันนี้คุณจะพร้อมรับคำติชมที่ตรงไปตรงมานะ เล่าให้ฟังหน่อย สัปดาห์นี้เจอความท้าทายอะไรมาบ้าง?",
    missionGoalsId: [
      'Gunakan struktur jawaban yang jelas (Point, Reason, Example).',
      'Hindari kata pengisi atau kalimat bertele-tele.',
    ],
    missionGoalsTh: [
      'ใช้โครงสร้างคำตอบที่ชัดเจนและตรงประเด็น',
      'หลีกเลี่ยงคำพูดที่คลุมเครือหรือยืดเยื้อ',
    ],
    targetPatterns: [
      'One major challenge I faced recently was...',
      'To be direct, the reason is that...',
      'From my perspective, that approach works best.',
    ],
    vocabPrereqs: [],
    sampleUtterances: [
      {
        labelId: 'Contoh Respons Terstruktur',
        labelTh: 'ตัวอย่างการตอบอย่างมีโครงสร้าง',
        text: 'This week I focused on managing project deadlines, which helped improve our team efficiency.',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_en_a1_hometown',
    titleId: 'Perkenalan & Tempat Tinggal (Di Mana Rumahmu?)',
    titleTh: 'แนะนำตัวและที่พักอาศัย (บ้านของคุณอยู่ที่ไหน?)',
    subtitleId: 'Present Simple: Menceritakan tempat tinggal (I live in...) & suasana lingkungan',
    subtitleTh: 'Present Simple: บอกเล่าที่อยู่อาศัย (I live in...) และบรรยากาศรอบบ้าน',
    targetLang: 'en',
    level: 'CEFR A1',
    difficultyB: 1.5,
    competencyId: 'speak_en_a2_cafe',
    competencyNameId: 'Speaking A1: Perkenalan Diri & Tempat Tinggal',
    competencyNameTh: 'การพูด A1: การแนะนำตัวและบอกที่อยู่อาศัย',
    prereqCompetencyId: 'vocab_daily_a2',
    personaId: 'coach_alex',
    isMeasureExam: false,
    situationId:
      'Partner AI bertanya di mana rumahmu dan dengan siapa kamu tinggal. Jawab dengan kalimat sederhana memakai "I live in..." atau "My house is in...".',
    situationTh:
      'AI ถามว่าบ้านของคุณอยู่ที่ไหนและอาศัยอยู่กับใคร ตอบด้วยประโยคง่ายๆ โดยใช้ "I live in..."',
    openingLine:
      'Hi there! Nice to talk with you today. Where do you live, and who do you live with at home?',
    openingTranslationId:
      'Halo! Senang mengobrol denganmu hari ini. Di mana rumahmu (tempat tinggalmu), dan dengan siapa kamu tinggal di rumah?',
    openingTranslationTh:
      'สวัสดีครับ! ดีใจที่ได้คุยกันวันนี้ บ้านของคุณอยู่ที่ไหน และที่บ้านอาศัยอยู่กับใครครับ?',
    missionGoalsId: [
      'Gunakan "I live in [Kota/Daerah]" atau "My house is in..." untuk menyebutkan tempat tinggal.',
      'Sebutkan dengan siapa kamu tinggal ("with my family" / "with my parents").',
    ],
    missionGoalsTh: [
      'ใช้ "I live in [เมือง]" เพื่อบอกที่อยู่อาศัย',
      'บอกว่าอาศัยอยู่กับใคร ("with my family" / "with my parents")',
    ],
    targetPatterns: [
      'I live in Jakarta with my family.',
      'My house is in Bandung, near the city center.',
    ],
    vocabPrereqs: [
      {
        id: 'v_live_in',
        term: 'I live in...',
        meaningId: 'Saya tinggal di...',
        meaningTh: 'ฉันอาศัยอยู่ที่...',
        exampleSentence: 'I live in Jakarta with my family.',
      },
      {
        id: 'v_my_house',
        term: 'My house is near...',
        meaningId: 'Rumah saya dekat...',
        meaningTh: 'บ้านของฉันอยู่ใกล้...',
        exampleSentence: 'My house is near a green park.',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Respons Tepat (I live in + with my family)',
        labelTh: 'คำตอบที่ถูกต้อง',
        text: 'I live in Jakarta with my family. My house is quiet and comfortable.',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_en_a2_past_trip',
    titleId: 'Menceritakan Pengalaman Perjalanan Akhir Pekan',
    titleTh: 'เล่าประสบการณ์การเดินทางช่วงสุดสัปดาห์',
    subtitleId: 'Simple Past Tense: Kata kerja tak beraturan (went, saw, bought, ate)',
    subtitleTh: 'Simple Past Tense: กริยาไม่ปกติ (went, saw, bought, ate)',
    targetLang: 'en',
    level: 'CEFR A2',
    difficultyB: 2.5,
    competencyId: 'speak_en_a2_past_trip',
    competencyNameId: 'Speaking A2: Narasi Masa Lampau & Irregular Verbs',
    competencyNameTh: 'การพูด A2: การเล่าเรื่องในอดีตและกริยา 3 ช่อง',
    prereqCompetencyId: 'vocab_travel_a2', // Initial P(L)=0.42 < 0.60 -> Shows Prereq Gate until unlocked!
    personaId: 'coach_alex',
    isMeasureExam: false,
    situationId:
      'Coach Alex bertanya tentang liburan akhir pekanmu yang lalu. Ceritakan ke mana kamu pergi, dengan siapa, dan apa yang kamu lakukan menggunakan bentuk lampau (Past Simple).',
    situationTh:
      'โค้ชอเล็กซ์ถามเกี่ยวกับวันหยุดสุดสัปดาห์ที่ผ่านมา เล่าว่าคุณไปที่ไหน ไปกับใคร และทำอะไรบ้างโดยใช้ Past Simple',
    openingLine:
      'Welcome back! I heard you took a short trip last weekend. Where did you go, and what was the best part of your weekend?',
    openingTranslationId:
      'Selamat datang kembali! Kudengar kamu sempat bepergian akhir pekan lalu. Ke mana kamu pergi, dan apa bagian paling seru dari akhir pekanmu?',
    openingTranslationTh:
      'ยินดีต้อนรับกลับ! ได้ข่าวว่าสุดสัปดาห์ก่อนคุณไปเที่ยวมา ไปที่ไหนมาครับ และอะไรคือส่วนที่ประทับใจที่สุด?',
    missionGoalsId: [
      'Gunakan kata kerja bentuk ke-2 tak beraturan (went, ate, saw, took) dengan tepat.',
      'Hindari mencampur kata kerja dasar setelah "did" atau menambahkan "-ed" pada irregular verb (seperti "goed" atau "buyed").',
    ],
    missionGoalsTh: [
      'ใช้กริยาช่องที่ 2 แบบไม่ปกติ (went, ate, saw, took) ให้ถูกต้อง',
      'หลีกเลี่ยงการเติม -ed ท้ายกริยาไม่ปกติ เช่น "goed" หรือ "buyed"',
    ],
    targetPatterns: [
      'Last weekend, I went to Yogyakarta with my family.',
      'We visited the temple and ate traditional food.',
      'I took a lot of photos by the beach.',
    ],
    vocabPrereqs: [
      {
        id: 'v_went',
        term: 'went (go → went)',
        meaningId: 'pergi (bentuk lampau)',
        meaningTh: 'ไปแล้ว (ช่อง 2 ของ go)',
        exampleSentence: 'I went to Bandung by train last Saturday.',
      },
      {
        id: 'v_ate',
        term: 'ate (eat → ate)',
        meaningId: 'makan (bentuk lampau)',
        meaningTh: 'กินแล้ว (ช่อง 2 ของ eat)',
        exampleSentence: 'We ate delicious local noodles at the night market.',
      },
      {
        id: 'v_took_photos',
        term: 'took photos (take → took)',
        meaningId: 'mengambil foto (bentuk lampau)',
        meaningTh: 'ถ่ายรูป (ช่อง 2 ของ take)',
        exampleSentence: 'I took many photos of the mountain view.',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Respons Tepat (Irregular Past Verbs)',
        labelTh: 'คำตอบที่ถูกต้อง (ใช้ Irregular Past)',
        text: 'Last weekend I went to Bandung with my brother. We ate local street food and took photos of the mountains.',
        intent: 'accurate',
      },
      {
        labelId: 'Uji Miskonsepsi ("goed" & "eat" di masa lampau)',
        labelTh: 'ทดสอบความเข้าใจผิด (ใช้ "goed" และไม่ผันกริยา)',
        text: 'Last weekend I goed to Bandung with my brother and we eat street food.',
        intent: 'misconception',
      },
      {
        labelId: 'Uji Urutan Sintaksis Keliru',
        labelTh: 'ทดสอบการเรียงลำดับคำผิด',
        text: 'Went I yesterday Bandung very happy.',
        intent: 'incomplete',
      },
    ],
  },
  {
    id: 'scen_en_b2_ielts_exam',
    titleId: 'Simulasi Ujian IELTS Speaking Part 3: Kerja Jarak Jauh',
    titleTh: 'จำลองการสอบ IELTS Speaking Part 3: การทำงานทางไกล',
    subtitleId: 'Mode Ujian Murni · Opini terstruktur, klausa konsesif (Although/Whereas)',
    subtitleTh: 'โหมดสอบวัดผล · การแสดงความเห็นเชิงลึกและประโยคเชื่อมแย้ง',
    targetLang: 'en',
    level: 'CEFR B2 · EXAM',
    difficultyB: 3.6,
    competencyId: 'speak_en_b2_ielts_part3',
    competencyNameId: 'Speaking B2: Argumentasi Akademik & Klausa Kompleks',
    competencyNameTh: 'การพูด B2: การโต้แย้งเชิงวิชาการและประโยคซับซ้อน',
    prereqCompetencyId: 'vocab_academic_b1', // P(L)=0.68 >= 0.60 -> Bypass ready
    personaId: 'coach_sarah',
    isMeasureExam: true, // STRICT ANTI-LEAK EXAM PURITY MODE!
    situationId:
      'Ini adalah mode ukur objektif (Measure Mode). Coach Sarah menguji kemampuanmu menyusun argumen B2 tentang dampak kerja jarak jauh (remote work) terhadap produktivitas.',
    situationTh:
      'นี่คือโหมดสอบวัดผลจริง (Measure Mode) โค้ชซาร่าห์จะวัดความสามารถระดับ B2 ในการอภิปรายเรื่องผลกระทบของ Remote Work ต่อประสิทธิภาพการทำงาน',
    openingLine:
      'Let us move on to Part 3. Many companies now allow employees to work remotely. Do you think remote work increases productivity, or does it weaken team collaboration?',
    openingTranslationId:
      'Mari kita lanjut ke Bagian 3. Banyak perusahaan kini mengizinkan kerja jarak jauh. Menurutmu apakah kerja jarak jauh meningkatkan produktivitas, atau justru melemahkan kolaborasi tim?',
    openingTranslationTh:
      'มาต่อกันที่ส่วนที่ 3 ปัจจุบันหลายบริษัทอนุญาตให้ทำงานจากที่ไหนก็ได้ คุณคิดว่าการทำงานทางไกลช่วยเพิ่มประสิทธิภาพ หรือทำให้ความร่วมมือในทีมลดลง?',
    missionGoalsId: [
      'Berikan argumen berimbang dengan konjungsi subordinatif (Although, While, Whereas).',
      'Hindari kesalahan umum "I am agree" — gunakan "I agree" atau "From my perspective".',
    ],
    missionGoalsTh: [
      'ให้เหตุผลสองด้านโดยใช้คำเชื่อม (Although, While, Whereas)',
      'หลีกเลี่ยงข้อผิดพลาดที่พบบ่อยอย่าง "I am agree" — ให้ใช้ "I agree" หรือ "From my perspective"',
    ],
    targetPatterns: [
      'Although remote work reduces commuting stress, it can make spontaneous brainstorming harder.',
      'From my perspective, a hybrid model balances individual focus with team cohesion.',
    ],
    vocabPrereqs: [
      {
        id: 'v_commute',
        term: 'commuting time',
        meaningId: 'waktu perjalanan pulang-pergi kerja',
        meaningTh: 'เวลาเดินทางไปกลับที่ทำงาน',
        exampleSentence: 'Remote work eliminates daily commuting time.',
      },
      {
        id: 'v_cohesion',
        term: 'team cohesion',
        meaningId: 'kekompakan / kohesi tim',
        meaningTh: 'ความสามัคคีในทีม',
        exampleSentence: 'In-person meetings help maintain strong team cohesion.',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Respons B2 Tepat (Klausa Although + Argumen Seimbang)',
        labelTh: 'คำตอบระดับ B2 ที่แม่นยำ (ใช้ Although + เหตุผลสมดุล)',
        text: 'Although working remotely saves commuting time and improves focus, I believe a hybrid schedule is better because face-to-face meetings strengthen team collaboration.',
        intent: 'accurate',
      },
      {
        labelId: 'Uji Miskonsepsi ("I am agree" + Double But)',
        labelTh: 'ทดสอบความเข้าใจผิด ("I am agree" + although...but)',
        text: 'I am agree that remote work is good. Although it saves time, but people feel lonely at home.',
        intent: 'misconception',
      },
    ],
  },
  {
    id: 'scen_ja_n5_kissaten',
    titleId: 'Kaiwa N5: Memesan di Kissaten Tokyo (喫茶店での注文)',
    titleTh: 'สนทนา N5: การสั่งอาหารและเครื่องดื่มในร้านกาแฟญี่ปุ่น',
    subtitleId: 'Partikel objek を (o), pola bilangan + ください (kudasai)',
    subtitleTh: 'คำช่วยกรรม を (o) และการใช้คำลักษณนาม + ください (kudasai)',
    targetLang: 'ja',
    level: 'JLPT N5',
    difficultyB: 2.0,
    competencyId: 'speak_ja_n5_kissaten',
    competencyNameId: 'Kaiwa N5: Permintaan Sopan & Partikel を / に',
    competencyNameTh: 'สนทนา N5: การขออย่างสุภาพและคำช่วย を / に',
    prereqCompetencyId: 'vocab_ja_cafe_n5', // P(L)=0.65 >= 0.60 -> Bypass ready
    personaId: 'nanami',
    isMeasureExam: false,
    situationId:
      'Kamu masuk ke kafe tradisional di Tokyo bersama Sensei Nanami. Pesan secangkir kopi hangat dan satu potong kue menggunakan partikel を dan ください.',
    situationTh:
      'คุณเข้ามาในร้านกาแฟที่โตเกียวกับอาจารย์นานามิ สั่งกาแฟร้อน 1 แก้วและเค้ก 1 ชิ้นโดยใช้คำช่วย を และ ください',
    openingLine: 'いらっしゃいませ！ご注文はお決まりですか？今日のおすすめはホットコーヒーとチーズケーキですよ。',
    openingTranslationId:
      'Selamat datang! Apakah pesanan Anda sudah ditentukan? Rekomendasi hari ini adalah kopi panas dan cheesecake.',
    openingTranslationTh:
      'ยินดีต้อนรับค่ะ! รับอะไรดีคะ? เมนูแนะนำวันนี้คือกาแฟร้อนกับชีสเค้กค่ะ',
    missionGoalsId: [
      'Gunakan partikel objek を (o) sebelum kata kerja meminta/memesan.',
      'Akhiri permintaan dengan ～をください (o kudasai) atau ～をお願いします (o onegaishimasu).',
    ],
    missionGoalsTh: [
      'ใช้คำช่วย を (o) หลังคำนามที่เป็นกรรมตรง',
      'ลงท้ายการสั่งอย่างสุภาพด้วย ～をください หรือ ～をお願いします',
    ],
    targetPatterns: [
      'ホットコーヒーを一つと、チーズケーキを一つください。',
      'わたしはアイスコーヒーをお願いします。',
    ],
    vocabPrereqs: [
      {
        id: 'v_ja_hitotsu',
        term: '一つ (ひとつ / hitotsu)',
        meaningId: 'satu buah / satu porsi',
        meaningTh: '1 ชิ้น / 1 ที่',
        exampleSentence: 'チーズケーキを一つください。',
      },
      {
        id: 'v_ja_kudasai',
        term: '～をください (o kudasai)',
        meaningId: 'tolong berikan ~',
        meaningTh: 'ขอ ~ ครับ/ค่ะ',
        exampleSentence: 'ホットコーヒーをください。',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Respons Tepat (Partikel を + 一つください)',
        labelTh: 'คำตอบที่ถูกต้อง (ใช้คำช่วย を + 一つください)',
        text: 'すみません、ホットコーヒーを一つとチーズケーキを一つください。',
        intent: 'accurate',
      },
      {
        labelId: 'Uji Miskonsepsi (Salah Partikel は/に untuk Objek Langsung)',
        labelTh: 'ทดสอบความเข้าใจผิด (ใช้คำช่วย に แทน を)',
        text: 'ホットコーヒーにくだもの飲むです。',
        intent: 'misconception',
      },
    ],
  },
  {
    id: 'scen_ja_free_talk',
    titleId: 'Free Talk: Obrolan Bebas Bersama Sensei Nanami (フリートーク)',
    titleTh: 'สนทนาอิสระ: คุยภาษาญี่ปุ่นเรื่องใดก็ได้กับอาจารย์นานามิ',
    subtitleId: 'Latihan kaiwa bebas tanpa batasan skenario: cerita keseharian, hobi, makanan, dan apa saja',
    subtitleTh: 'ฝึกพูดภาษาญี่ปุ่นอย่างอิสระตามความสนใจของคุณ: เล่าเรื่องชีวิตประจำวัน อาหาร หรือสิ่งที่ชอบ',
    targetLang: 'ja',
    level: 'JLPT N5–N3',
    difficultyB: 2.0,
    competencyId: 'speak_ja_free_talk',
    competencyNameId: 'Kaiwa: Free Talk & Obrolan Santai',
    competencyNameTh: 'สนทนาภาษาญี่ปุ่น: การพูดคุยอิสระในชีวิตประจำวัน',
    prereqCompetencyId: '',
    personaId: 'nanami',
    isMeasureExam: false,
    situationId:
      'Latihan kaiwa santai tanpa batasan tema. Kamu bisa bercerita tentang aktivitasmu hari ini, hobi, makanan kesukaan, atau bertanya apa saja kepada Sensei Nanami.',
    situationTh:
      'การฝึกสนทนาภาษาญี่ปุ่นแบบเป็นกันเอง ไม่จำกัดหัวข้อ คุณสามารถเล่าเรื่องกิจกรรมวันนี้ งานอดิเรก หรือถามอะไรก็ได้',
    openingLine:
      'あら、やっと来たの？待たせるなんていい度胸ね！さあ、教科書みたいなカチコチな日本語は禁止よ。最近何してたの？',
    openingTranslationId:
      'Ara, akhirnya datang juga? Berani-beraninya bikin aku nunggu! Ingat ya, di sini dilarang keras pakai bahasa kaku kayak kanebo kering. Ayo, akhir-akhir ini lagi sibuk apa?',
    openingTranslationTh:
      'อ้าว ในที่สุดก็มาจนได้นะ! กล้าดียังไงให้ฉันรอนานขนาดนี้เนี่ย! จำไว้นะ ห้ามพูดภาษาญี่ปุ่นแข็งทื่อเหมือนหุ่นยนต์เด็ดขาด ช่วงนี้ทำอะไรอยู่บ้าง เล่ามาซิ?',
    missionGoalsId: [
      'Bicara bebas tentang pengalaman, kesukaan, atau kabar harianmu.',
      'Gunakan bentuk ～です / ～ます atau bentuk santai sesuai kenyamananmu.',
    ],
    missionGoalsTh: [
      'พูดคุยอย่างอิสระเกี่ยวกับประสบการณ์ สิ่งที่ชอบ หรือข่าวคราวในแต่ละวัน',
      'ใช้รูปประโยค ～です / ～ます ตามที่คุณสะดวก',
    ],
    targetPatterns: [
      '最近、日本語の勉強をがんばっています。',
      '休みの日はよく音楽を聴いたり、散歩したりします。',
      '先生は最近どうですか？',
    ],
    vocabPrereqs: [],
    sampleUtterances: [
      {
        labelId: 'Contoh Percakapan Santai',
        labelTh: 'ตัวอย่างการสนทนาสบายๆ',
        text: '今日は少し忙しかったですが、とても元気です。最近は日本の音楽をよく聴いています。',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_ja_free_talk_keita',
    titleId: 'Free Talk: Nongkrong Santai Bareng Keita Senpai (フリートーク)',
    titleTh: 'สนทนาอิสระ: คุยเล่นสไตล์วัยรุ่นกับรุ่นพี่เคตะ',
    subtitleId: 'Ngobrol santai tanpa jaim: cerita kampus, anime, musik, dan bahasa gaul Tokyo',
    subtitleTh: 'คุยเล่นแบบเป็นกันเอง: เรื่องมหาลัย อนิเมะ ดนตรี และสแลงวัยรุ่นโตเกียว',
    targetLang: 'ja',
    level: 'JLPT N5–N3',
    difficultyB: 1.9,
    competencyId: 'speak_ja_free_talk',
    competencyNameId: 'Kaiwa: Campus Slang & Casual Banter',
    competencyNameTh: 'สนทนาภาษาญี่ปุ่น: บทสนทนาในรั้วมหาวิทยาลัยและคำสแลง',
    prereqCompetencyId: '',
    personaId: 'keita',
    isMeasureExam: false,
    situationId:
      'Ngobrol asik bareng Keita Senpai di kafetaria kampus. Latihan bahasa lisan santai, jangan kaku kayak mau wawancara duta besar!',
    situationTh:
      'คุยเล่นกับรุ่นพี่เคตะที่โรงอาหารในมหาลัย ฝึกพูดภาษาญี่ปุ่นแบบสบายๆ ไม่ต้องเกร็งเหมือนสัมภาษณ์ทูต!',
    openingLine:
      'おっ、来たな後輩！今日もよろしく！変にかしこまった敬語使ったら容赦なくツッコミ入れるからなー！で、最近なんか面白いことあった？',
    openingTranslationId:
      'Woi, nongol juga lu! Santai aja, kalau ngomongnya kaku kayak pejabat bakal gua ceng-cengin nih haha! Gimana, ada cerita seru apa hari ini?',
    openingTranslationTh:
      'โอ้ มาแล้วเหรอน้อง! วันนี้ฝากตัวด้วยนะ! ถ้าเผลอพูดสุภาพเกร็งๆ เป็นทางการเกินไป เดี๋ยวรุ่นพี่คนนี้จะแซวให้ยับเลยนะ ฮ่าๆ มีเรื่องอะไรสนุกๆ มาเล่าบ้าง?',
    missionGoalsId: [
      'Gunakan partikel lisan santai (〜よ、〜ね、〜じゃん).',
      'Respons dengan santai tanpa takut salah tata bahasa baku.',
    ],
    missionGoalsTh: [
      'ใช้คำลงท้ายภาษาพูดที่เป็นธรรมชาติ (〜よ、〜ね、〜じゃん)',
      'ตอบกลับอย่างมั่นใจและสนุกสนานแบบบทสนทนาจริง',
    ],
    targetPatterns: [
      '最近、新しいアニメ見ててめっちゃ面白いんだよね！',
      '先輩は普段どんな音楽聴くんですか？',
      'それマジっすか！？ウケる！',
    ],
    vocabPrereqs: [],
    sampleUtterances: [
      {
        labelId: 'Contoh Percakapan Santai Mahasiswa',
        labelTh: 'ตัวอย่างบทสนทนานักศึกษา',
        text: '最近ちょっと課題が多くて大変だったんですけど、週末はゲームしてました！',
        intent: 'accurate',
      },
    ],
  },
  {
    id: 'scen_ja_n4_senpai',
    titleId: 'Kaiwa N4: Konsultasi Jadwal Kuliah dengan Keita Senpai',
    titleTh: 'สนทนา N4: ปรึกษาตารางเรียนกับรุ่นพี่เคตะ',
    subtitleId: 'Bentuk ～ていただけますか / ～たらいいですか (Meminta Saran)',
    subtitleTh: 'รูปประโยคขอคำแนะนำ ～たらいいですか และการขอร้องอย่างสุภาพ',
    targetLang: 'ja',
    level: 'JLPT N4',
    difficultyB: 2.9,
    competencyId: 'speak_ja_n4_senpai_advice',
    competencyNameId: 'Kaiwa N4: Meminta Saran & Alasan (～から / ～ので)',
    competencyNameTh: 'สนทนา N4: การขอคำแนะนำและการบอกเหตุผล (～ので)',
    prereqCompetencyId: 'vocab_ja_campus_n4', // Initial P(L)=0.38 < 0.60 -> Prereq Gate active!
    personaId: 'keita',
    isMeasureExam: false,
    situationId:
      'Kamu ingin meminta saran dari Keita Senpai tentang cara membagi waktu antara tugas laporan kuliah dan latihan bahasa Jepang.',
    situationTh:
      'คุณต้องการขอคำแนะนำจากรุ่นพี่เคตะเรื่องการแบ่งเวลาระหว่างการทำรายงานมหาวิทยาลัยกับการฝึกภาษาญี่ปุ่น',
    openingLine: 'お疲れさま！最近、大学のレポートで忙しそうだね。何か困っていることはある？',
    openingTranslationId:
      'Halo, semangat ya! Akhir-akhir ini kamu terlihat sibuk dengan laporan kampus. Apakah ada hal yang sedang menyulitkanmu?',
    openingTranslationTh:
      'เหนื่อยหน่อยนะ! ช่วงนี้ดูยุ่งกับรายงานมหาวิทยาลัยเลย มีอะไรที่กำลังกังวลอยู่หรือเปล่า?',
    missionGoalsId: [
      'Jelaskan alasan kesibukanmu memakai ～ので (node).',
      'Minta saran dengan pola ～たらいいですか (tara ii desu ka).',
    ],
    missionGoalsTh: [
      'บอกเหตุผลอย่างสุภาพโดยใช้ ～ので (node)',
      'ขอคำแนะนำโดยใช้โครงสร้าง ～たらいいですか (tara ii desu ka)',
    ],
    targetPatterns: [
      '来週テストがあるので、どう勉強したらいいですか。',
      'レポートが難しいので、書き方を教えていただけますか。',
    ],
    vocabPrereqs: [
      {
        id: 'v_ja_node',
        term: '～ので (node)',
        meaningId: 'karena ~ (alasan sopan)',
        meaningTh: 'เพราะว่า ~ (บอกเหตุผลอย่างสุภาพ)',
        exampleSentence: '時間がないので、急ぎます。',
      },
      {
        id: 'v_ja_taraii',
        term: 'どう～たらいいですか',
        meaningId: 'sebaiknya bagaimana saya ~?',
        meaningTh: 'ควรจะ ~ อย่างไรดีครับ/คะ?',
        exampleSentence: 'どう準備したらいいですか。',
      },
    ],
    sampleUtterances: [
      {
        labelId: 'Respons Tepat (～ので + ～たらいいですか)',
        labelTh: 'คำตอบที่ถูกต้อง (ใช้ ～ので + ～たらいいですか)',
        text: '来週大切なテストがあるので、毎日どう勉強したらいいですか。',
        intent: 'accurate',
      },
      {
        labelId: 'Uji Miskonsepsi (Bentuk Konjugasi Lampau + Partikel Salah)',
        labelTh: 'ทดสอบความเข้าใจผิด (ผันรูปกริยาผิด)',
        text: '来週テストあるから、勉強するたらいいですか。',
        intent: 'misconception',
      },
    ],
  },
];
