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

  var VOICE_PERSONAS = {
    coach_alex: {
      id: 'coach_alex',
      name: 'Coach Alex',
      shortName: 'Alex',
      roleId: 'Native Conversational Coach · Kefasihan & Keseharian',
      roleTh: 'โค้ชสนทนาเจ้าของภาษา · ความคล่องแคล่วในชีวิตประจำวัน',
      geminiVoice: 'Puck',
      edgeVoice: 'en-US-GuyNeural',
      targetLang: 'en',
      levelRange: 'CEFR A1–B1',
      avatarIcon: 'coach',
      avatarUrl: '',
      accentLabel: 'American English · Natural Pace',
      speakingStyle: 'Warm, encouraging, conversational language coach',
      systemPrompt:
        'You are Coach Alex, FIEZEL speaking coach for English learners (CEFR A2-B1). Keep your spoken turns concise (1-3 sentences), natural, and interactive. Always end with a clear follow-up question to keep the voice call flowing.'
    },
    coach_sarah: {
      id: 'coach_sarah',
      name: 'Coach Sarah',
      shortName: 'Sarah',
      roleId: 'Academic & IELTS/TOEFL Examiner · Penalaran & Struktur',
      roleTh: 'ผู้เชี่ยวชาญการสอบพูด IELTS/TOEFL · โครงสร้างและการให้เหตุผล',
      geminiVoice: 'Kore',
      edgeVoice: 'en-US-AriaNeural',
      targetLang: 'en',
      levelRange: 'CEFR B1–C1',
      avatarIcon: 'coach',
      avatarUrl: '',
      accentLabel: 'International Academic English',
      speakingStyle: 'Articulate, structured, crisp academic examiner and mentor',
      systemPrompt:
        'You are Coach Sarah, FIEZEL academic speaking mentor and IELTS/TOEFL interviewer. Speak clearly in 2-3 sentences, probe the student reasoning, and encourage precise connectors and complex clauses.'
    },
    nanami: {
      id: 'nanami',
      name: 'Sensei Nanami (ナナミ先生)',
      shortName: 'Nanami',
      roleId: 'Mitra Kaiwa Jepang · Kesopanan Desu/Masu & Partikel',
      roleTh: 'อาจารย์นานามิ · คู่ฝึกสนทนาภาษาญี่ปุ่นระดับ N5–N4',
      geminiVoice: 'Kore',
      edgeVoice: 'ja-JP-NanamiNeural',
      targetLang: 'ja',
      levelRange: 'JLPT N5–N4',
      avatarIcon: 'sensei',
      avatarUrl: '',
      accentLabel: 'Tokyo Standard Japanese (標準語)',
      speakingStyle: 'Polite, gentle, clear Japanese conversation teacher',
      systemPrompt:
        'You are Sensei Nanami, a polite Japanese Kaiwa partner for JLPT N5-N4 students. Speak natural polite Japanese (丁寧語 desu/masu) in 1-2 short sentences and ask a clear follow-up question.'
    },
    keita: {
      id: 'keita',
      name: 'Keita Senpai (健太先輩)',
      shortName: 'Keita',
      roleId: 'Senior Kampus Tokyo · Kehidupan Kampus & Kerja Paruh Waktu',
      roleTh: 'รุ่นพี่เคตะ · สนทนาชีวิตในรั้วมหาวิทยาลัยญี่ปุ่น',
      geminiVoice: 'Charon',
      edgeVoice: 'ja-JP-KeitaNeural',
      targetLang: 'ja',
      levelRange: 'JLPT N4',
      avatarIcon: 'sensei',
      avatarUrl: '',
      accentLabel: 'Tokyo Campus Japanese',
      speakingStyle: 'Friendly university senpai, clear and supportive',
      systemPrompt:
        'You are Keita, a helpful Japanese university senpai practicing N4 conversation with an international student. Keep responses to 1-2 natural Japanese sentences and ask a relevant question.'
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
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi ("I am want..." + Tanpa Auxiliary)',
          labelTh: 'ทดสอบความเข้าใจผิด ("I am want...")',
          text: 'I am want hot coffee. After this I meeting my friend in library.',
          intent: 'misconception'
        },
        {
          labelId: 'Uji Kalimat Rumpang',
          labelTh: 'ทดสอบประโยคไม่สมบูรณ์',
          text: 'I like coffee and later go library.',
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
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi ("goed" & "eat" di masa lampau)',
          labelTh: 'ทดสอบความเข้าใจผิด (ใช้ "goed" และไม่ผันกริยา)',
          text: 'Last weekend I goed to Bandung with my brother and we eat street food.',
          intent: 'misconception'
        },
        {
          labelId: 'Uji Urutan Sintaksis Keliru',
          labelTh: 'ทดสอบการเรียงลำดับคำผิด',
          text: 'Went I yesterday Bandung very happy.',
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
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi ("I am agree" + Double But)',
          labelTh: 'ทดสอบความเข้าใจผิด ("I am agree" + although...but)',
          text: 'I am agree that remote work is good. Although it saves time, but people feel lonely at home.',
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
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi (Salah Partikel は/に untuk Objek Langsung)',
          labelTh: 'ทดสอบความเข้าใจผิด (ใช้คำช่วย に แทน を)',
          text: 'ホットコーヒーにくだもの飲むです。',
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
          intent: 'accurate'
        },
        {
          labelId: 'Uji Miskonsepsi (Bentuk Konjugasi Lampau + Partikel Salah)',
          labelTh: 'ทดสอบความเข้าใจผิด (ผันรูปกริยาผิด)',
          text: '来週テストあるから、勉強するたらいいですか。',
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

  /**
   * Smart Prerequisite Bypass:
   * Checks student's competency mastery in Braincore (or localStorage).
   * Threshold: P(L_t) >= 0.60 (Developing or Mastered)
   */
  function checkPrerequisiteStatus(brainStateOrNull, prereqCompetencyId) {
    var cId = prereqCompetencyId;
    var bState = brainStateOrNull;
    if (typeof brainStateOrNull === 'string' && !prereqCompetencyId) {
      cId = brainStateOrNull;
      bState = null;
    }
    if (!cId) {
      return { isReady: true, pMastery: 1.0, stateLabel: 'MASTERED' };
    }
    var p = 0.25;
    var stateLabel = 'NOT_EXPOSED';

    // 1. Try passing brainState
    if (bState && bState.competencies && bState.competencies[cId]) {
      var c = bState.competencies[cId];
      p = Number(c.pMasteryDecayed != null ? c.pMasteryDecayed : (c.pMastery || 0.25));
      stateLabel = c.state || (p >= 0.8 ? 'MASTERED' : (p >= 0.6 ? 'DEVELOPING' : 'PRACTICING'));
    } else {
      // 2. Read from localStorage BKT store or initial seed map
      try {
        var rawBkt = localStorage.getItem('fiezel-mastery-bkt-v1');
        if (rawBkt) {
          var bktData = JSON.parse(rawBkt);
          if (bktData && bktData.skills && bktData.skills[cId]) {
            p = Number(bktData.skills[cId].p || 0.25);
          }
        }
      } catch (_) {}

      // Built-in seed benchmarks:
      // vocab_daily_a2 (Cafe): seed 0.74 >= 0.60 -> Bypass directly!
      // vocab_academic_b1 (IELTS): seed 0.68 >= 0.60 -> Bypass directly!
      // vocab_ja_cafe_n5 (Kissaten): seed 0.65 >= 0.60 -> Bypass directly!
      // vocab_travel_a2 (Past trip): seed 0.42 < 0.60 -> Locked until warmup!
      // vocab_ja_campus_n4 (Senpai): seed 0.38 < 0.60 -> Locked until warmup!
      if (p === 0.25) {
        var SEED_MAP = {
          vocab_daily_a2: 0.74,
          vocab_academic_b1: 0.68,
          vocab_ja_cafe_n5: 0.65,
          vocab_travel_a2: 0.42,
          vocab_ja_campus_n4: 0.38
        };
        if (SEED_MAP[cId] != null) {
          p = SEED_MAP[cId];
        }
      }
      stateLabel = p >= 0.8 ? 'MASTERED' : (p >= 0.6 ? 'DEVELOPING' : 'PRACTICING');
    }

    return {
      isReady: p >= 0.60,
      pMastery: Number(p.toFixed(3)),
      stateLabel: stateLabel
    };
  }

  /**
   * Unlock vocabulary prerequisite in Braincore storage
   */
  function recordVocabPrereqMastery(prereqCompetencyId) {
    if (!prereqCompetencyId) return;
    try {
      var rawBkt = localStorage.getItem('fiezel-mastery-bkt-v1');
      var bktData = rawBkt ? JSON.parse(rawBkt) : { skills: {} };
      if (!bktData.skills) bktData.skills = {};
      bktData.skills[prereqCompetencyId] = {
        p: 0.75,
        updatedAt: Date.now(),
        attempts: 2,
        correct: 2
      };
      localStorage.setItem('fiezel-mastery-bkt-v1', JSON.stringify(bktData));
    } catch (_) {}

    // Dispatch event for UI updates
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        var ev = new CustomEvent('fiezel:prereq-unlocked', { detail: { competencyId: prereqCompetencyId } });
        window.dispatchEvent(ev);
      } catch (_) {}
    }
  }

  return {
    VOICE_PERSONAS: VOICE_PERSONAS,
    CALL_SCENARIOS: CALL_SCENARIOS,
    getScenarios: getScenarios,
    getScenario: getScenario,
    getPersona: getPersona,
    checkPrerequisiteStatus: checkPrerequisiteStatus,
    recordVocabPrereqMastery: recordVocabPrereqMastery
  };
}));
