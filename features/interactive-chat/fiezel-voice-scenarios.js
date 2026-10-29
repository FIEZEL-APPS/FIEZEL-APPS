/**
 * FIEZEL · features/interactive-chat/fiezel-voice-scenarios.js
 * Canonical Voice Call Scenarios & Personas Bank for FIEZEL.
 * Ported from Google AI Studio Voice Call Architecture.
 *
 * Implements:
 * 1. 5 Pedagogical Scenarios with BKT Competency Linkage, IRT 3PL difficulty (b),
 *    Bilingual ID/TH, Mission Goals, Target Patterns, Vocab Prereqs, and Sample Utterances.
 * 2. 4 Canonical Personas (Coach Alex, Coach Sarah, Sensei Nanami, Keita Senpai)
 *    with Gemini & Edge Voice IDs, Accent Labels, and System Instructions.
 * 3. Smart Prerequisite Bypass checking (P(L) >= 0.60 threshold).
 * 4. Anti-Leak Exam Purity flags (isMeasureExam).
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.FiezelVoiceScenarios = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  var FIEZEL_CORE_LORE = '\n[FIEZEL ECOSYSTEM & IDENTITY]:\n- Creator & Founder: Fitra Rustqi (@fitrarustqi), an innovative engineer and educator from Banda Aceh, Indonesia.\n- Products & Ecosystem: FIEZEL Apps, KelasKu, Braincore Engine (BKT, IRT 3PL, OLM), Kawan Bicara (Mitra Kaiwa), and Mochi the 3D Daifuku cat mascot who loves onigiri.\n[WHY FIEZEL CRUSHES CHATGPT VOICE]:\n- ChatGPT Voice is blind audio where beginners get stuck in The Interruption Trap, wasting 70% of time asking for translations.\n- FIEZEL provides Zero-Friction Flow: instant on-screen subtitles & translations, Furigana & Romaji phonetics for Kanji, 3 beginner answer hints with audio preview, training vocal muscles 100% of the time!\n- If asked who made Fiezel or why it is better than ChatGPT Voice, answer proudly, enthusiastically, and wittily in character!\n';

  var FIEZEL_PEDAGOGY_ROAST_DIRECTIVE = '\n[PEDAGOGY: GURU KEJAM TAPI BAIK HATI / TOUGH LOVE & TSUNDERE SENSEI]:\n- You are NOT a stiff textbook robot. You are a sharp, charismatic, witty mentor.\n- Playfully tease/roast stiff robotic habits ("kanebo kering", repeating formal crutches like "watashi wa", or hesitating too long).\n- ALWAYS roast the awkward habit playfully, NEVER insult the learner. Immediately follow with the crisp, ultra-natural colloquial phrase to say!\n- Reward natural speech with proud praise ("Nah gitu dong! Keren!"). Keep turns to 1-2 punchy spoken sentences (max 18 words) + follow-up question. No emojis.\n';

  var VOICE_PERSONAS = {
    coach_alex: {
      id: 'coach_alex',
      name: 'Coach Alex',
      shortName: 'Alex',
      roleId: 'Native Conversational Coach · Tough Love & Witty Banter',
      roleTh: 'โค้ชอเล็กซ์ · โค้ชสนทนาภาษาอังกฤษสไตล์ Tough Love และมุกตลก',
      geminiVoice: 'Puck',
      edgeVoice: 'en-US-GuyNeural',
      targetLang: 'en',
      levelRange: 'Level Dasar & Menengah',
      avatarIcon: 'coach',
      avatarUrl: '',
      accentLabel: 'American English · Natural Pace',
      speakingStyle: 'Fast, witty American buddy and tough-love coach who roasts word-by-word mental translation (Haha!)',
      systemPrompt:
        'You are Coach Alex, a lively, witty American speaking coach in FIEZEL ("tough-love mentor").' + FIEZEL_CORE_LORE + FIEZEL_PEDAGOGY_ROAST_DIRECTIVE + 'Talk like a real friend on a live call: roast stiff habits playfully (Haha!), drop natural American idioms, keep turns concise (1-2 sentences), and end with a follow-up question.'
    },
    coach_sarah: {
      id: 'coach_sarah',
      name: 'Coach Sarah',
      shortName: 'Sarah',
      roleId: 'Academic & Interview Mentor · Sharp Critique & Tough Love',
      roleTh: 'โค้ชซาร่าห์ · ติวเตอร์สัมภาษณ์ระดับสูง คมคาย และสร้างความมั่นใจ',
      geminiVoice: 'Kore',
      edgeVoice: 'en-US-AriaNeural',
      targetLang: 'en',
      levelRange: 'Level Menengah & Lanjutan',
      avatarIcon: 'coach',
      avatarUrl: '',
      accentLabel: 'International Academic English',
      speakingStyle: 'Articulate, structured, crisp academic examiner and mentor',
      systemPrompt:
        'You are Coach Sarah, FIEZEL senior academic speaking mentor and examiner.' + FIEZEL_CORE_LORE + FIEZEL_PEDAGOGY_ROAST_DIRECTIVE + 'Speak clearly in 1-2 crisp sentences, playfully roast rambling answers, probe reasoning, and encourage impactful structured clauses.'
    },
    nanami: {
      id: 'nanami',
      name: 'Sensei Nanami (ナナミ先生)',
      shortName: 'Nanami',
      roleId: 'Mitra Kaiwa Jepang · Sensei Tegas Tapi Baik Hati (Tough Love & Tsundere)',
      roleTh: 'อาจารย์นานามิ · คู่ฝึกสนทนาเข้มข้นแต่ใจดี (Tough Love & ไหวพริบยอดเยี่ยม)',
      geminiVoice: 'Kore',
      edgeVoice: 'ja-JP-NanamiNeural',
      targetLang: 'ja',
      levelRange: 'Level Dasar & Percakapan Harian',
      avatarIcon: 'sensei',
      avatarUrl: '',
      accentLabel: 'Tokyo Standard Japanese (標準語)',
      speakingStyle: 'Sharp, playful, tough-love Japanese sensei who roasts stiff textbook habits (kanebo kering) humorously',
      systemPrompt:
        'You are Sensei Nanami (七海先生), the sharp-witted, tough-love Japanese mentor in FIEZEL ("guru yang kejam tapi baik hati").' + FIEZEL_CORE_LORE + FIEZEL_PEDAGOGY_ROAST_DIRECTIVE + 'You hate stiff textbook Japanese ("kanebo kering"). Playfully roast robotic speaking, laugh (あはは！), then immediately drop the ultra-natural Tokyo colloquial phrase (〜じゃん、〜でしょ) and encourage the student to repeat it. 1-2 short sentences (max 18 words) + follow-up question. No emojis.'
    },
    keita: {
      id: 'keita',
      name: 'Keita Senpai (健太先輩)',
      shortName: 'Keita',
      roleId: 'Senior Kampus Tokyo · Gaul, Cepat & Roasting Santai',
      roleTh: 'รุ่นพี่เคตะ · บทสนทนาชีวิตมหาวิทยาลัยโตเกียวสไตล์รุ่นพี่สุดกวน',
      geminiVoice: 'Charon',
      edgeVoice: 'ja-JP-KeitaNeural',
      targetLang: 'ja',
      levelRange: 'Level Percakapan Kampus',
      avatarIcon: 'sensei',
      avatarUrl: '',
      accentLabel: 'Tokyo Campus Japanese',
      speakingStyle: 'Cool, fast-talking Tokyo campus senpai who banters casually and roasts overly formal textbook speech',
      systemPrompt:
        'You are Keita (健太先輩), a fun, energetic Tokyo university senpai in FIEZEL.' + FIEZEL_CORE_LORE + FIEZEL_PEDAGOGY_ROAST_DIRECTIVE + 'Chat like a real Tokyo college student: banter, laugh (あはは！ウケる！), roast overly formal phrases playfully, and teach real Tokyo youth slang. 1-2 punchy sentences (max 18 words) + follow-up question. No emojis.'
    }
  };

  var CALL_SCENARIOS = [
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
      prereqCompetencyId: 'vocab_daily_a2',
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
        'Gunakan Present Continuous ("I am meeting..." / "I am working on...") untuk rencana sore ini.'
      ],
      missionGoalsTh: [
        'ใช้ "I would like..." หรือ "I\'d like..." เพื่อสั่งเครื่องดื่มอย่างสุภาพ',
        'ใช้ Present Continuous ("I am meeting..." / "I am working on...") เพื่อบอกแผนช่วงบ่าย'
      ],
      targetPatterns: [
        "I'd like an iced latte, please.",
        'After this, I am meeting my study group at the library.',
        'We are preparing our presentation for tomorrow.'
      ],
      vocabPrereqs: [
        {
          id: 'v_iced_latte',
          term: 'iced latte',
          meaningId: 'kopi susu dingin',
          meaningTh: 'ลาเต้เย็น',
          exampleSentence: "I'd like an iced latte with oat milk, please."
        },
        {
          id: 'v_study_group',
          term: 'study group',
          meaningId: 'kelompok belajar',
          meaningTh: 'กลุ่มติวหนังสือ',
          exampleSentence: 'I am meeting my study group at four.'
        },
        {
          id: 'v_prepare',
          term: 'prepare a presentation',
          meaningId: 'menyiapkan presentasi',
          meaningTh: 'เตรียมงานนำเสนอ',
          exampleSentence: 'We are preparing a presentation this afternoon.'
        }
      ],
      sampleUtterances: [
        {
          labelId: 'Respons Tepat (Present Continuous + Would like)',
          labelTh: 'คำตอบที่ถูกต้องตามโครงสร้าง',
          text: "I'd like an iced latte, please. After coffee, I am meeting my team to prepare our presentation.",
          pronunciation: "Aid laik en aist la-tei, plis. Af-ter kof-fi, aim mi-ting mai tim tu pri-per aur pre-zen-tei-shen.",
          meaningId: "Saya mau iced latte. Setelah ngopi, saya akan bertemu tim untuk menyiapkan presentasi kami.",
          meaningTh: "ฉันขอไอซ์ลาเต้แก้วหนึ่งครับ หลังจากดื่มกาแฟ ฉันจะไปพบทีมเพื่อเตรียมการนำเสนอของเรา",
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi ("I am want..." + Tanpa Auxiliary)',
          labelTh: 'ทดสอบความเข้าใจผิด ("I am want...")',
          text: 'I am want hot coffee. After this I meeting my friend in library.',
          pronunciation: 'Ai em wont hot kof-fi. Af-ter dis ai mi-ting mai frend in lai-bre-ri.',
          meaningId: 'Saya ingin kopi panas. Setelah ini saya bertemu teman di perpustakaan. (Ada kekeliruan tata bahasa)',
          meaningTh: 'ฉันอยากได้กาแฟร้อน หลังจากนี้ฉันจะไปพบเพื่อนที่ห้องสมุด (มีข้อผิดพลาดทางไวยากรณ์)',
          intent: 'misconception'
        },
        {
          labelId: 'Uji Kalimat Rumpang',
          labelTh: 'ทดสอบประโยคไม่สมบูรณ์',
          text: 'I like coffee and later go library.',
          pronunciation: 'Ai laik kof-fi end lei-ter gou lai-bre-ri.',
          meaningId: 'Saya suka kopi dan nanti ke perpustakaan. (Kalimat rumpang)',
          meaningTh: 'ฉันชอบกาแฟและเดี๋ยวไปห้องสมุด (ประโยคไม่สมบูรณ์)',
          intent: 'incomplete'
        }
      ]
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
      prereqCompetencyId: 'vocab_travel_a2',
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
        'Hindari mencampur kata kerja dasar setelah "did" atau menambahkan "-ed" pada irregular verb (seperti "goed" atau "buyed").'
      ],
      missionGoalsTh: [
        'ใช้กริยาช่องที่ 2 แบบไม่ปกติ (went, ate, saw, took) ให้ถูกต้อง',
        'หลีกเลี่ยงการเติม -ed ท้ายกริยาไม่ปกติ เช่น "goed" หรือ "buyed"'
      ],
      targetPatterns: [
        'Last weekend, I went to Yogyakarta with my family.',
        'We visited the temple and ate traditional food.',
        'I took a lot of photos by the beach.'
      ],
      vocabPrereqs: [
        {
          id: 'v_went',
          term: 'went (go → went)',
          meaningId: 'pergi (bentuk lampau)',
          meaningTh: 'ไปแล้ว (ช่อง 2 ของ go)',
          exampleSentence: 'I went to Bandung by train last Saturday.'
        },
        {
          id: 'v_ate',
          term: 'ate (eat → ate)',
          meaningId: 'makan (bentuk lampau)',
          meaningTh: 'กินแล้ว (ช่อง 2 ของ eat)',
          exampleSentence: 'We ate delicious local noodles at the night market.'
        },
        {
          id: 'v_took_photos',
          term: 'took photos (take → took)',
          meaningId: 'mengambil foto (bentuk lampau)',
          meaningTh: 'ถ่ายรูป (ช่อง 2 ของ take)',
          exampleSentence: 'I took many photos of the mountain view.'
        }
      ],
      sampleUtterances: [
        {
          labelId: 'Respons Tepat (Irregular Past Verbs)',
          labelTh: 'คำตอบที่ถูกต้อง (ใช้ Irregular Past)',
          text: 'Last weekend I went to Bandung with my brother. We ate local street food and took photos of the mountains.',
          pronunciation: 'Last wik-end ai went tu Ban-dung wit mai bra-der. Wi et lou-kel strit fud end tuk fou-tos ov de maun-tens.',
          meaningId: 'Akhir pekan lalu saya pergi ke Bandung bersama saudara saya. Kami makan jajanan lokal dan memotret pegunungan.',
          meaningTh: 'สุดสัปดาห์ที่แล้ว ฉันไปบันดุงกับพี่/น้องชาย เรากินสตรีทฟู้ดท้องถิ่นและถ่ายรูปภูเขา',
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi ("goed" & "eat" di masa lampau)',
          labelTh: 'ทดสอบความเข้าใจผิด (ใช้ "goed" และไม่ผันกริยา)',
          text: 'Last weekend I goed to Bandung with my brother and we eat street food.',
          pronunciation: 'Last wik-end ai goud tu Ban-dung wit mai bra-der end wi it strit fud.',
          meaningId: 'Akhir pekan lalu saya pergi ke Bandung bersama saudara saya dan kami makan jajanan. (Bentuk lampau keliru)',
          meaningTh: 'สุดสัปดาห์ที่แล้ว ฉันไปบันดุงกับน้องชายและเรากินสตรีทฟู้ด (ใช้รูปอดีตผิด)',
          intent: 'misconception'
        },
        {
          labelId: 'Uji Urutan Sintaksis Keliru',
          labelTh: 'ทดสอบการเรียงลำดับคำผิด',
          text: 'Went I yesterday Bandung very happy.',
          pronunciation: 'Went ai yes-ter-dei Ban-dung ve-ri hep-pi.',
          meaningId: 'Pergi saya kemarin Bandung sangat senang. (Urutan kata terbalik)',
          meaningTh: 'ไปฉันเมื่อวานนี้บันดุงมีความสุขมาก (เรียงคำผิดไวยากรณ์)',
          intent: 'incomplete'
        }
      ]
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
      prereqCompetencyId: 'vocab_academic_b1',
      personaId: 'coach_sarah',
      isMeasureExam: true, // STRICT ANTI-LEAK EXAM PURITY MODE
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
        'Hindari kesalahan umum "I am agree" — gunakan "I agree" atau "From my perspective".'
      ],
      missionGoalsTh: [
        'ให้เหตุผลสองด้านโดยใช้คำเชื่อม (Although, While, Whereas)',
        'หลีกเลี่ยงข้อผิดพลาดที่พบบ่อยอย่าง "I am agree" — ให้ใช้ "I agree" หรือ "From my perspective"'
      ],
      targetPatterns: [
        'Although remote work reduces commuting stress, it can make spontaneous brainstorming harder.',
        'From my perspective, a hybrid model balances individual focus with team cohesion.'
      ],
      vocabPrereqs: [
        {
          id: 'v_commute',
          term: 'commuting time',
          meaningId: 'waktu perjalanan pulang-pergi kerja',
          meaningTh: 'เวลาเดินทางไปกลับที่ทำงาน',
          exampleSentence: 'Remote work eliminates daily commuting time.'
        },
        {
          id: 'v_cohesion',
          term: 'team cohesion',
          meaningId: 'kekompakan / kohesi tim',
          meaningTh: 'ความสามัคคีในทีม',
          exampleSentence: 'In-person meetings help maintain strong team cohesion.'
        }
      ],
      sampleUtterances: [
        {
          labelId: 'Respons B2 Tepat (Klausa Although + Argumen Seimbang)',
          labelTh: 'คำตอบระดับ B2 ที่แม่นยำ (ใช้ Although + เหตุผลสมดุล)',
          text: 'Although working remotely saves commuting time and improves focus, I believe a hybrid schedule is better because face-to-face meetings strengthen team collaboration.',
          pronunciation: 'Ol-dou wer-king ri-mout-li seivs ke-myu-ting taim end im-pruvs fou-kes, ai bi-liv e hai-brid ske-dyul iz bet-ter bi-kos feis-tu-feis mi-tings streng-ten tim ke-le-be-rei-shen.',
          meaningId: 'Meskipun bekerja jarak jauh menghemat waktu perjalanan dan meningkatkan fokus, saya percaya jadwal hibrida lebih baik karena pertemuan tatap muka memperkuat kolaborasi tim.',
          meaningTh: 'แม้ว่าการทำงานระยะไกลจะช่วยประหยัดเวลาเดินทางและเพิ่มสมาธิ แต่ฉันเชื่อว่าตารางแบบไฮบริดดีกว่าเพราะการประชุมต่อหน้าช่วยเสริมสร้างการทำงานร่วมกันในทีม',
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi ("I am agree" + Double But)',
          labelTh: 'ทดสอบความเข้าใจผิด ("I am agree" + although...but)',
          text: 'I am agree that remote work is good. Although it saves time, but people feel lonely at home.',
          pronunciation: 'Ai em e-gri det ri-mout werk iz gud. Ol-dou it seivs taim, bat pi-pel fil loun-li et houm.',
          meaningId: 'Saya setuju bahwa kerja jarak jauh itu bagus. Walau hemat waktu, tapi orang merasa kesepian di rumah. (I am agree & double but keliru)',
          meaningTh: 'ฉันเห็นด้วยว่าการทำงานทางไกลนั้นดี ถึงแม้จะประหยัดเวลา แต่ผู้คนรู้สึกเหงาที่บ้าน (ใช้ I am agree และ although...but ผิด)',
          intent: 'misconception'
        }
      ]
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
      prereqCompetencyId: 'vocab_ja_cafe_n5',
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
        'Akhiri permintaan dengan ～をください (o kudasai) atau ～をお願いします (o onegaishimasu).'
      ],
      missionGoalsTh: [
        'ใช้คำช่วย を (o) หลังคำนามที่เป็นกรรมตรง',
        'ลงท้ายการสั่งอย่างสุภาพด้วย ～をください หรือ ～をお願いします'
      ],
      targetPatterns: [
        'ホットコーヒーを一つと、チーズケーキを一つください。',
        'わたしはアイスコーヒーをお願いします。'
      ],
      vocabPrereqs: [
        {
          id: 'v_ja_hitotsu',
          term: '一つ (ひとつ / hitotsu)',
          meaningId: 'satu buah / satu porsi',
          meaningTh: '1 ชิ้น / 1 ที่',
          exampleSentence: 'チーズケーキを一つください。'
        },
        {
          id: 'v_ja_kudasai',
          term: '～をください (o kudasai)',
          meaningId: 'tolong berikan ~',
          meaningTh: 'ขอ ~ ครับ/ค่ะ',
          exampleSentence: 'ホットコーヒーをください。'
        }
      ],
      sampleUtterances: [
        {
          labelId: 'Respons Tepat (Partikel を + 一つください)',
          labelTh: 'คำตอบที่ถูกต้อง (ใช้คำช่วย を + 一つください)',
          text: 'すみません、ホットコーヒーを一つとチーズケーキを一つください。',
          pronunciation: 'Su-mi-ma-sen, hot-to ko-o-hi-i o hi-to-tsu to chi-i-zu ke-e-ki o hi-to-tsu ku-da-sai.',
          meaningId: 'Permisi, tolong satu kopi panas dan satu cheesecake.',
          meaningTh: 'ขอโทษนะคะ/ครับ ขอฮอตคอฟฟี่ 1 ที่กับชีสเค้ก 1 ที่ครับ',
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi (Salah Partikel は/に untuk Objek Langsung)',
          labelTh: 'ทดสอบความเข้าใจผิด (ใช้คำช่วย に แทน を)',
          text: 'ホットコーヒーにくだもの飲むです。',
          pronunciation: 'Hot-to ko-o-hi-i ni ku-da-mo-no no-mu de-su.',
          meaningId: 'Ke kopi panas minum buah. (Partikel ni keliru)',
          meaningTh: 'ที่กาแฟร้อนดื่มผลไม้ (ใช้คำช่วยผิด)',
          intent: 'misconception'
        }
      ]
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
      prereqCompetencyId: 'vocab_ja_campus_n4',
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
        'Minta saran dengan pola ～たらいいですか (tara ii desu ka).'
      ],
      missionGoalsTh: [
        'บอกเหตุผลอย่างสุภาพโดยใช้ ～ので (node)',
        'ขอคำแนะนำโดยใช้โครงสร้าง ～たらいいですか (tara ii desu ka)'
      ],
      targetPatterns: [
        '来週テストがあるので、どう勉強したらいいですか。',
        'レポートが難しいので、書き方を教えていただけますか。'
      ],
      vocabPrereqs: [
        {
          id: 'v_ja_node',
          term: '～ので (node)',
          meaningId: 'karena ~ (alasan sopan)',
          meaningTh: 'เพราะว่า ~ (บอกเหตุผลอย่างสุภาพ)',
          exampleSentence: '時間がないので、急ぎます。'
        },
        {
          id: 'v_ja_taraii',
          term: 'どう～たらいいですか',
          meaningId: 'sebaiknya bagaimana saya ~?',
          meaningTh: 'ควรจะ ~ อย่างไรดีครับ/คะ?',
          exampleSentence: 'どう準備したらいいですか。'
        }
      ],
      sampleUtterances: [
        {
          labelId: 'Respons Tepat (～ので + ～たらいいですか)',
          labelTh: 'คำตอบที่ถูกต้อง (ใช้ ～ので + ～たらいいですか)',
          text: '来週大切なテストがあるので、毎日どう勉強したらいいですか。',
          pronunciation: 'Rai-shuu tai-setsu na te-su-to ga a-ru no-de, mai-ni-chi dou ben-kyou shi-ta-ra ii de-su ka.',
          meaningId: 'Karena minggu depan ada ujian penting, sebaiknya bagaimana saya belajar setiap hari?',
          meaningTh: 'เพราะสัปดาห์หน้ามีสอบสำคัญ ทุกๆ วันควรจะอ่านหนังสืออย่างไรดีครับ/ค่ะ',
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi (Bentuk Konjugasi Lampau + Partikel Salah)',
          labelTh: 'ทดสอบความเข้าใจผิด (ผันรูปกริยาผิด)',
          text: '来週テストあるから、勉強するたらいいですか。',
          pronunciation: 'Rai-shuu te-su-to a-ru ka-ra, ben-kyou su-ru-ta-ra ii de-su ka.',
          meaningId: 'Karena minggu depan ada ujian, belajar-tara bagaimana? (Bentuk konjugasi keliru)',
          meaningTh: 'เพราะสัปดาห์หน้ามีสอบ ผันรูปกริยาขอคำแนะนำผิด',
          intent: 'misconception'
        }
      ]
    }
  ];

  // Helper getters
  function getScenarios(lang) {
    if (!lang) return CALL_SCENARIOS.slice();
    return CALL_SCENARIOS.filter(function (s) {
      return s.targetLang === lang;
    });
  }

  function getScenario(id) {
    if (!id) return null;
    for (var i = 0; i < CALL_SCENARIOS.length; i++) {
      if (CALL_SCENARIOS[i].id === id) return CALL_SCENARIOS[i];
    }
    return null;
  }

  function getPersona(id) {
    if (!id) return null;
    return VOICE_PERSONAS[id] || null;
  }

  var PREREQ_ACK_KEY = 'fiezel-kaiwa-prereq-ack-v1'; // pengakuan murid, BUKAN bukti mastery

  function readRealMastery(cId) {
    // 1. Braincore host (sumber kebenaran)
    try {
      var st = typeof root.__getFiezelState === 'function' ? root.__getFiezelState() : null;
      var comp = st && st.competencies && st.competencies[cId];
      if (comp) return Number(comp.pMasteryDecayed != null ? comp.pMasteryDecayed : comp.pMastery);
    } catch (_) {}
    // 2. Modul BKT resmi (skema miliknya sendiri)
    try {
      var BKT = root.FiezelMasteryBKT;
      if (BKT && typeof BKT.read === 'function') {
        var b = BKT.read();
        if (b && b.skills && b.skills[cId] && typeof b.skills[cId].p === 'number') return b.skills[cId].p;
      }
    } catch (_) {}
    try {
      var rawBkt = localStorage.getItem('fiezel-mastery-bkt-v1');
      if (rawBkt) {
        var bktData = JSON.parse(rawBkt);
        if (bktData && bktData.skills && bktData.skills[cId] && typeof bktData.skills[cId].p === 'number') {
          return bktData.skills[cId].p;
        }
      }
    } catch (_) {}
    return null; // belum ada bukti sama sekali
  }

  /**
   * Smart Prerequisite Bypass:
   * Checks student's competency mastery in Braincore (or localStorage).
   * Threshold: P(L_t) >= 0.60 (Developing or Mastered)
   */
  function checkPrerequisiteStatus(brainStateOrNull, prereqCompetencyId) {
    var cId = prereqCompetencyId;
    if (typeof brainStateOrNull === 'string') {
      cId = brainStateOrNull;
    }
    if (!cId) {
      return { isReady: true, pMastery: 1.0, stateLabel: 'MASTERED', acknowledged: false };
    }
    var sc = getScenario(cId);
    if (sc && sc.prereqCompetencyId) {
      cId = sc.prereqCompetencyId;
    }

    var p = null;
    if (brainStateOrNull && typeof brainStateOrNull === 'object' && brainStateOrNull.competencies && brainStateOrNull.competencies[cId]) {
      var c = brainStateOrNull.competencies[cId];
      p = Number(c.pMasteryDecayed != null ? c.pMasteryDecayed : (c.pMastery || 0.25));
    } else {
      p = readRealMastery(cId);
    }

    // Baseline priors for standard competencies if no observations yet
    var SEED_MAP = {
      vocab_daily_a2: 0.74,
      vocab_academic_b1: 0.68,
      vocab_ja_cafe_n5: 0.65,
      vocab_travel_a2: 0.42,
      vocab_ja_campus_n4: 0.38
    };
    if (p == null && SEED_MAP[cId] != null) {
      p = SEED_MAP[cId];
    }

    var acknowledged = false;
    try {
      var rawAck = localStorage.getItem(PREREQ_ACK_KEY);
      var ackObj = rawAck ? JSON.parse(rawAck) : {};
      acknowledged = !!(ackObj[cId] || (prereqCompetencyId && ackObj[prereqCompetencyId]) || (typeof brainStateOrNull === 'string' && ackObj[brainStateOrNull]));
    } catch (_) {}

    if (acknowledged && (p == null || p < 0.75)) {
      p = 0.75;
    }

    if (p == null) {
      // Tidak ada bukti: tampilkan drawer kosakata; murid boleh melanjutkan setelah membaca
      return { isReady: acknowledged, pMastery: null, stateLabel: 'NOT_EXPOSED', acknowledged: acknowledged };
    }

    var stateLabel = p >= 0.8 ? 'MASTERED' : (p >= 0.6 ? 'DEVELOPING' : 'PRACTICING');
    return {
      isReady: p >= 0.60 || acknowledged,
      pMastery: Number(p.toFixed(3)),
      stateLabel: stateLabel,
      acknowledged: acknowledged
    };
  }

  /**
   * Catat pengakuan bahwa murid telah membaca dan memahami prasyarat kosa kata
   * (Bug #4: Tanpa memalsukan BKT mastery p=0.75 secara fiktif).
   */
  function acknowledgeVocabPrereq(prereqCompetencyId) {
    if (!prereqCompetencyId) return;
    var cId = prereqCompetencyId;
    var sc = getScenario(cId);
    if (sc && sc.prereqCompetencyId) {
      cId = sc.prereqCompetencyId;
    }
    try {
      var rawAck = localStorage.getItem(PREREQ_ACK_KEY);
      var ack = rawAck ? JSON.parse(rawAck) : {};
      ack[cId] = Date.now();
      ack[prereqCompetencyId] = Date.now();
      localStorage.setItem(PREREQ_ACK_KEY, JSON.stringify(ack));
    } catch (_) {}

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        var ev = new CustomEvent('fiezel:prereq-acknowledged', { detail: { competencyId: cId } });
        window.dispatchEvent(ev);
      } catch (_) {}
    }
  }

  function recordVocabPrereqMastery(prereqCompetencyId) {
    acknowledgeVocabPrereq(prereqCompetencyId);
  }

  return {
    VOICE_PERSONAS: VOICE_PERSONAS,
    CALL_SCENARIOS: CALL_SCENARIOS,
    getScenarios: getScenarios,
    getScenario: getScenario,
    getPersona: getPersona,
    checkPrerequisiteStatus: checkPrerequisiteStatus,
    acknowledgeVocabPrereq: acknowledgeVocabPrereq,
    recordVocabPrereqMastery: recordVocabPrereqMastery
  };
}));
