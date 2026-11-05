import type { CallScenario } from '../types/voiceCall.ts';

/**
 * FIEZEL · features/voice-studio/src/data/fiezel-lifeCallScenarios.ts
 * 54 Can-Do Life in Japan Scenarios for Daifuku Mochi, Keita Senpai, & Sensei Nanami.
 * Source: The Japan Foundation (国際交流基金), fiezel-life: Japanese for Life in Japan.
 */
export const FIEZEL_LIFE_CALL_SCENARIOS: CallScenario[] = [
  {
    "id": "scen_ja_fiezel-life_01",
    "titleId": "FIEZEL Japanese Life A1: Topic",
    "titleTh": "อิโรโดริ A1: Topic",
    "subtitleId": "Can-Do Bab 1, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 1, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.5,
    "competencyId": "speak_ja_fiezel-life_l1",
    "competencyNameId": "Komunikasi Nyata: Topic",
    "competencyNameTh": "การสื่อสารจริง: Topic",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Kamu baru pertama kali mengikuti sesi latihan percakapan di FIEZEL dan menyapa instruktur di kelas.",
    "situationTh": "คุณเพิ่งเข้าสู่เซสชันฝึกสนทนาของ FIEZEL เป็นครั้งแรกและกล่าวทักทายผู้สอนในห้องเรียน",
    "openingLine": "こんにちは！フィーゼル（FIEZEL）の日本語クラスへようこそ！初めまして、よろしくお願いします。",
    "openingTranslationId": "Halo! Selamat datang di kelas bahasa Jepang FIEZEL! Senang berkenalan dengan Anda.",
    "openingTranslationTh": "สวัสดีครับ! ยินดีต้อนรับสู่คลาสภาษาญี่ปุ่นของ FIEZEL! ยินดีที่ได้รู้จักครับ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 1.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 1",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "初めまして、～です。よろしくお願いします。",
      "～から来ました。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_1_1",
        "term": "初めまして",
        "meaningId": "salam kenal",
        "meaningTh": "ยินดีที่ได้รู้จัก",
        "exampleSentence": "初めまして、田中です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "初めまして、～です。よろしくお願いします。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "～から来ました。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_02",
    "titleId": "FIEZEL Japanese Life A1: I'm sorry, I don't really understand.",
    "titleTh": "อิโรโดริ A1: I'm sorry, I don't really understand.",
    "subtitleId": "Can-Do Bab 2, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 2, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.4,
    "competencyId": "speak_ja_fiezel-life_l2",
    "competencyNameId": "Komunikasi Nyata: I'm sorry, I don't really understand.",
    "competencyNameTh": "การสื่อสารจริง: I'm sorry, I don't really understand.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Instruktur berbicara agak cepat dan kamu ingin meminta pengulangan atau menyatakan belum paham.",
    "situationTh": "ผู้สอนพูดค่อนข้างเร็ว และคุณต้องการขอให้พูดซ้ำหรือบอกว่ายังไม่ค่อยเข้าใจ",
    "openingLine": "すみません、今の説明は分かりましたか？もし分からなければ、遠慮なく言ってくださいね。",
    "openingTranslationId": "Maaf, apakah penjelasan tadi sudah jelas? Kalau belum paham, jangan sungkan untuk bilang ya.",
    "openingTranslationTh": "ขอโทษนะครับ คำอธิบายเมื่อกี้เข้าใจไหมครับ? ถ้ายังไม่เข้าใจบอกได้เลยนะไม่ต้องเกรงใจ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 2.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 2",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "すみません、よく分かりません。",
      "もう一度ゆっくりお願いします。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_2_1",
        "term": "もう一度",
        "meaningId": "sekali lagi",
        "meaningTh": "อีกครั้งหนึ่ง",
        "exampleSentence": "もう一度お願いします。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "すみません、よく分かりません。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "もう一度ゆっくりお願いします。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_03",
    "titleId": "FIEZEL Japanese Life A1: Nice to meet you.",
    "titleTh": "อิโรโดริ A1: Nice to meet you.",
    "subtitleId": "Can-Do Bab 3, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 3, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.4,
    "competencyId": "speak_ja_fiezel-life_l3",
    "competencyNameId": "Komunikasi Nyata: Nice to meet you.",
    "competencyNameTh": "การสื่อสารจริง: Nice to meet you.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Memperkenalkan nama, negara asal (Indonesia), dan status pekerjaan/studi.",
    "situationTh": "แนะนำชื่อ ประเทศบ้านเกิด (อินโดนีเซีย) และสถานะการทำงาน/การเรียน",
    "openingLine": "お名前とご出身はどちらですか？私は東京出身です。",
    "openingTranslationId": "Nama dan asal Anda dari mana? Saya berasal dari Tokyo.",
    "openingTranslationTh": "ชื่ออะไรและมาจากไหนครับ? ผมมาจากโตเกียวครับ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 3.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 3",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "わたしはインドネシアから来ました。",
      "ジャカルタ出身です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_3_1",
        "term": "出身",
        "meaningId": "asal / kampung halaman",
        "meaningTh": "บ้านเกิด / มาจาก",
        "exampleSentence": "バンドン出身です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "わたしはインドネシアから来ました。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ジャカルタ出身です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_04",
    "titleId": "FIEZEL Japanese Life A1: I live in Tokyo.",
    "titleTh": "อิโรโดริ A1: I live in Tokyo.",
    "subtitleId": "Can-Do Bab 4, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 4, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.3,
    "competencyId": "speak_ja_fiezel-life_l4",
    "competencyNameId": "Komunikasi Nyata: I live in Tokyo.",
    "competencyNameTh": "การสื่อสารจริง: I live in Tokyo.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menjelaskan kota dan daerah tempat tinggal saat ini di Jepang.",
    "situationTh": "บอกเมืองและย่านที่พักอาศัยอยู่ในปัจจุบันที่ญี่ปุ่น",
    "openingLine": "日本にはもう慣れましたか？今、どちらにお住まいですか？",
    "openingTranslationId": "Apakah sudah terbiasa tinggal di Jepang? Sekarang Anda tinggal di mana?",
    "openingTranslationTh": "เริ่มชินกับญี่ปุ่นหรือยังครับ? ตอนนี้พักอยู่ที่ไหนครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 4.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 4",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "東京の新宿に住んでいます。",
      "駅の近くです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_4_1",
        "term": "住んでいます",
        "meaningId": "tinggal di ~",
        "meaningTh": "อาศัยอยู่ที่ ~",
        "exampleSentence": "アパートに住んでいます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "東京の新宿に住んでいます。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "駅の近くです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_05",
    "titleId": "FIEZEL Japanese Life A1: I like udon.",
    "titleTh": "อิโรโดริ A1: I like udon.",
    "subtitleId": "Can-Do Bab 5, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 5, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.3,
    "competencyId": "speak_ja_fiezel-life_l5",
    "competencyNameId": "Komunikasi Nyata: I like udon.",
    "competencyNameTh": "การสื่อสารจริง: I like udon.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan makanan favorit dan menyatakan kesukaan masakan Jepang.",
    "situationTh": "เล่าถึงอาหารจานโปรดและบอกความชอบเกี่ยวกับอาหารญี่ปุ่น",
    "openingLine": "お昼ご飯は何が好きですか？日本の料理はもう食べましたか？",
    "openingTranslationId": "Kamu suka makan siang apa? Apakah sudah pernah mencoba masakan Jepang?",
    "openingTranslationTh": "ชอบทานมื้อเที่ยงเป็นอะไรครับ? ได้ลองทานอาหารญี่ปุ่นบ้างหรือยัง?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 5.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 5",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "うどんやラーメンが好きです。",
      "納豆はあまり好きじゃないです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_5_1",
        "term": "好きです",
        "meaningId": "suka ~",
        "meaningTh": "ชอบ ~",
        "exampleSentence": "寿司が好きです。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "うどんやラーメンが好きです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "納豆はあまり好きじゃないです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_06",
    "titleId": "FIEZEL Japanese Life A1: I'd like a cheeseburger, please.",
    "titleTh": "อิโรโดริ A1: I'd like a cheeseburger, please.",
    "subtitleId": "Can-Do Bab 6, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 6, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.2,
    "competencyId": "speak_ja_fiezel-life_l6",
    "competencyNameId": "Komunikasi Nyata: I'd like a cheeseburger, please.",
    "competencyNameTh": "การสื่อสารจริง: I'd like a cheeseburger, please.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Memesan set menu makanan dan minuman di restoran cepat saji.",
    "situationTh": "สั่งชุดอาหารและเครื่องดื่มที่ร้านฟาสต์ฟู้ด",
    "openingLine": "いらっしゃいませ！ご注文はお決まりですか？",
    "openingTranslationId": "Selamat datang! Apakah pesanannya sudah ditentukan?",
    "openingTranslationTh": "ยินดีต้อนรับครับ! สั่งอาหารอะไรดีครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 6.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 6",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "チーズバーガーをひとつと、アイスティーをください。",
      "ここで食べます。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_6_1",
        "term": "ください",
        "meaningId": "tolong berikan ~",
        "meaningTh": "ขอ ~ หน่อยครับ",
        "exampleSentence": "水をください。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "チーズバーガーをひとつと、アイスティーをください。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ここで食べます。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_07",
    "titleId": "FIEZEL Japanese Life A1: There are four rooms.",
    "titleTh": "อิโรโดริ A1: There are four rooms.",
    "subtitleId": "Can-Do Bab 7, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 7, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.1,
    "competencyId": "speak_ja_fiezel-life_l7",
    "competencyNameId": "Komunikasi Nyata: There are four rooms.",
    "competencyNameTh": "การสื่อสารจริง: There are four rooms.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menjelaskan fasilitas dan jumlah kamar di apartemen tempat tinggal.",
    "situationTh": "อธิบายสิ่งอำนวยความสะดวกและจำนวนห้องในอพาร์ตเมนต์",
    "openingLine": "新しいお部屋はどうですか？部屋はいくつありますか？",
    "openingTranslationId": "Bagaimana dengan kamar barumu? Ada berapa kamar di sana?",
    "openingTranslationTh": "ห้องพักใหม่เป็นอย่างไรบ้างครับ? มีห้องกี่ห้องครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 7.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 7",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "部屋がふたつあります。",
      "とても明るくて静かです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_7_1",
        "term": "あります",
        "meaningId": "ada (benda mati)",
        "meaningTh": "มี (สิ่งไม่มีชีวิต)",
        "exampleSentence": "机があります。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "部屋がふたつあります。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "とても明るくて静かです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_08",
    "titleId": "FIEZEL Japanese Life A1: Where is Yamada-san?",
    "titleTh": "อิโรโดริ A1: Where is Yamada-san?",
    "subtitleId": "Can-Do Bab 8, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 8, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": -0.1,
    "competencyId": "speak_ja_fiezel-life_l8",
    "competencyNameId": "Komunikasi Nyata: Where is Yamada-san?",
    "competencyNameTh": "การสื่อสารจริง: Where is Yamada-san?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menjelaskan keberadaan rekan kerja di kantor atau area pabrik.",
    "situationTh": "บอกตำแหน่งที่อยู่ของเพื่อนร่วมงานในออฟฟิศหรือโรงงาน",
    "openingLine": "あれ、山田さんはどこですか？見かけましたか？",
    "openingTranslationId": "Lho, Yamada-san di mana ya? Apakah kamu melihatnya?",
    "openingTranslationTh": "เอ๊ะ คุณยามาดะอยู่ไหนครับ? เห็นบ้างไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 8.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 8",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "山田さんは会議室にいますよ。",
      "今、電話中です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_8_1",
        "term": "います",
        "meaningId": "ada (orang/makhluk hidup)",
        "meaningTh": "อยู่ (คน/สิ่งมีชีวิต)",
        "exampleSentence": "ロビーにいます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "山田さんは会議室にいますよ。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "今、電話中です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_09",
    "titleId": "FIEZEL Japanese Life A1: Lunch is from noon to 1 o'clock.",
    "titleTh": "อิโรโดริ A1: Lunch is from noon to 1 o'clock.",
    "subtitleId": "Can-Do Bab 9, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 9, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0,
    "competencyId": "speak_ja_fiezel-life_l9",
    "competencyNameId": "Komunikasi Nyata: Lunch is from noon to 1 o'clock.",
    "competencyNameTh": "การสื่อสารจริง: Lunch is from noon to 1 o'clock.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menjelaskan jam istirahat makan siang dan jadwal kerja harian.",
    "situationTh": "บอกเวลาพักกลางวันและตารางเวลาทำงานประจำวัน",
    "openingLine": "お疲れさまです！お昼休みは何時から何時までですか？",
    "openingTranslationId": "Semangat kerja! Istirahat makan siang dari jam berapa sampai jam berapa?",
    "openingTranslationTh": "เหนื่อยหน่อยนะครับ! พักเที่ยงตั้งแต่กี่โมงถึงกี่โมงครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 9.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 9",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "12時から1時までです。",
      "8時半に始まります。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_9_1",
        "term": "から～まで",
        "meaningId": "dari ~ sampai ~",
        "meaningTh": "ตั้งแต่ ~ ถึง ~",
        "exampleSentence": "9時から5時までです。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "12時から1時までです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "8時半に始まります。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_10",
    "titleId": "FIEZEL Japanese Life A1: Please lend me the stapler.",
    "titleTh": "อิโรโดริ A1: Please lend me the stapler.",
    "subtitleId": "Can-Do Bab 10, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 10, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0,
    "competencyId": "speak_ja_fiezel-life_l10",
    "competencyNameId": "Komunikasi Nyata: Please lend me the stapler.",
    "competencyNameTh": "การสื่อสารจริง: Please lend me the stapler.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Meminjam alat kantor (staples/gunting) secara sopan kepada rekan kerja.",
    "situationTh": "ขอยืมอุปกรณ์สำนักงาน (เครื่องเย็บกระดาษ/กรรไกร) อย่างสุภาพ",
    "openingLine": "書類の整理ですか？何か使う道具はありますか？",
    "openingTranslationId": "Sedang merapikan dokumen ya? Apakah ada alat yang perlu kamu pakai?",
    "openingTranslationTh": "กำลังจัดเอกสารอยู่เหรอครับ? มีอุปกรณ์อะไรที่ต้องใช้ไหม?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 10.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 10",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "ホチキスを貸していただけますか？",
      "使ってもいいですか？"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_10_1",
        "term": "貸してください",
        "meaningId": "tolong pinjamkan",
        "meaningTh": "ขอยืมหน่อยครับ",
        "exampleSentence": "ペンを貸してください。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "ホチキスを貸していただけますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "使ってもいいですか？",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_11",
    "titleId": "FIEZEL Japanese Life A1: What kind of manga do you like?",
    "titleTh": "อิโรโดริ A1: What kind of manga do you like?",
    "subtitleId": "Can-Do Bab 11, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 11, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.1,
    "competencyId": "speak_ja_fiezel-life_l11",
    "competencyNameId": "Komunikasi Nyata: What kind of manga do you like?",
    "competencyNameTh": "การสื่อสารจริง: What kind of manga do you like?",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan hobi santai dan kegemaran membaca manga atau menonton anime.",
    "situationTh": "เล่าถึงงานอดิเรกและการดูอนิเมะหรืออ่านมังงะในเวลาว่าง",
    "openingLine": "休みの日は何をしていますか？好きなアニメや漫画はありますか？",
    "openingTranslationId": "Hari libur biasanya kamu ngapain? Apakah ada anime atau manga yang kamu suka?",
    "openingTranslationTh": "วันหยุดมักจะทำอะไรครับ? มีอนิเมะหรือมังงะที่ชอบไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 11.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 11",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "週末は家で漫画を読んでいます。",
      "ONE PIECEが大好きです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_11_1",
        "term": "漫画",
        "meaningId": "komik / manga",
        "meaningTh": "การ์ตูน / มังงะ",
        "exampleSentence": "漫画を読みます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "週末は家で漫画を読んでいます。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ONE PIECEが大好きです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_12",
    "titleId": "FIEZEL Japanese Life A1: Do you want to go for a drink together?",
    "titleTh": "อิโรโดริ A1: Do you want to go for a drink together?",
    "subtitleId": "Can-Do Bab 12, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 12, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.2,
    "competencyId": "speak_ja_fiezel-life_l12",
    "competencyNameId": "Komunikasi Nyata: Do you want to go for a drink together?",
    "competencyNameTh": "การสื่อสารจริง: Do you want to go for a drink together?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menerima atau menolak ajakan minum bersama rekan kerja secara ramah.",
    "situationTh": "ตอบรับหรือปฏิเสธคำชวนไปสังสรรค์หลังเลิกงานอย่างสุภาพ",
    "openingLine": "今週の金曜日、仕事のあとに一杯飲みに行きませんか？",
    "openingTranslationId": "Jumat minggu ini, maukah pergi minum bareng setelah selesai kerja?",
    "openingTranslationTh": "วันศุกร์นี้ เลิกงานแล้วไปดื่มด้วยกันสักแก้วไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 12.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 12",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "いいですね、ぜひ行きましょう！",
      "すみません、金曜日は予定があります。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_12_1",
        "term": "行きませんか",
        "meaningId": "maukah pergi bersama?",
        "meaningTh": "ไปด้วยกันไหมครับ?",
        "exampleSentence": "一緒に食べませんか。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "いいですね、ぜひ行きましょう！",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "すみません、金曜日は予定があります。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_13",
    "titleId": "FIEZEL Japanese Life A1: Does this bus go to the airport?",
    "titleTh": "อิโรโดริ A1: Does this bus go to the airport?",
    "subtitleId": "Can-Do Bab 13, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 13, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.2,
    "competencyId": "speak_ja_fiezel-life_l13",
    "competencyNameId": "Komunikasi Nyata: Does this bus go to the airport?",
    "competencyNameTh": "การสื่อสารจริง: Does this bus go to the airport?",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menanyakan rute dan memastikan apakah bus menuju ke tujuan bandara.",
    "situationTh": "ถามเส้นทางและตรวจสอบว่ารถบัสคันนี้ไปสนามบินหรือไม่",
    "openingLine": "成田空港に行きたいんですが、どのバスに乗ればいいですか？",
    "openingTranslationId": "Saya mau ke Bandara Narita, sebaiknya naik bus yang mana ya?",
    "openingTranslationTh": "อยากไปสนามบินนาริตะครับ ควรขึ้นรถบัสคันไหนดีครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 13.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 13",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "このバスは空港へ行きますか？",
      "3番乗り場から乗ってください。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_13_1",
        "term": "空港",
        "meaningId": "bandara",
        "meaningTh": "สนามบิน",
        "exampleSentence": "羽田空港に行きます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "このバスは空港へ行きますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "3番乗り場から乗ってください。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_14",
    "titleId": "FIEZEL Japanese Life A1: It's a big building, isn't it.",
    "titleTh": "อิโรโดริ A1: It's a big building, isn't it.",
    "subtitleId": "Can-Do Bab 14, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 14, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.3,
    "competencyId": "speak_ja_fiezel-life_l14",
    "competencyNameId": "Komunikasi Nyata: It's a big building, isn't it.",
    "competencyNameTh": "การสื่อสารจริง: It's a big building, isn't it.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menanyakan nama gedung dan fasilitas publik di sekitar kota.",
    "situationTh": "ถามชื่ออาคารและสถานที่สำคัญรอบๆ เมือง",
    "openingLine": "あの高いビル、見えますか？あれは何の建物か知っていますか？",
    "openingTranslationId": "Gedung tinggi di sana kelihatan kan? Tahu tidak itu gedung apa?",
    "openingTranslationTh": "เห็นตึกสูงๆ ตรงนั้นไหมครับ? รู้ไหมว่านั่นตึกอะไร?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 14.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 14",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "とても大きい建物ですね。",
      "あれは市役所ですよ。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_14_1",
        "term": "建物",
        "meaningId": "bangunan / gedung",
        "meaningTh": "อาคาร / ตึก",
        "exampleSentence": "新しい建物です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "とても大きい建物ですね。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "あれは市役所ですよ。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_15",
    "titleId": "FIEZEL Japanese Life A1: I need some batteries.",
    "titleTh": "อิโรโดริ A1: I need some batteries.",
    "subtitleId": "Can-Do Bab 15, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 15, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.3,
    "competencyId": "speak_ja_fiezel-life_l15",
    "competencyNameId": "Komunikasi Nyata: I need some batteries.",
    "competencyNameTh": "การสื่อสารจริง: I need some batteries.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menanyakan letak barang baterai atau keperluan harian ke kasir toko.",
    "situationTh": "ถามพนักงานร้านสะดวกซื้อว่าถ่านไฟฉายหรือของใช้จำเป็นวางอยู่ตรงไหน",
    "openingLine": "コンビニでお買い物ですか？何か探しているものはありますか？",
    "openingTranslationId": "Sedang belanja di konbini? Apakah ada barang yang sedang kamu cari?",
    "openingTranslationTh": "ซื้อของที่ร้านสะดวกซื้อเหรอครับ? กำลังหาอะไรอยู่หรือเปล่า?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 15.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 15",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "電池はどこにありますか？",
      "あちらの棚の2段目です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_15_1",
        "term": "電池",
        "meaningId": "baterai",
        "meaningTh": "ถ่านไฟฉาย / แบตเตอรี่",
        "exampleSentence": "単三電池を買います。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "電池はどこにありますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "あちらの棚の2段目です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_16",
    "titleId": "FIEZEL Japanese Life A1: How much is this?",
    "titleTh": "อิโรโดริ A1: How much is this?",
    "subtitleId": "Can-Do Bab 16, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 16, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.4,
    "competencyId": "speak_ja_fiezel-life_l16",
    "competencyNameId": "Komunikasi Nyata: How much is this?",
    "competencyNameTh": "การสื่อสารจริง: How much is this?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menanyakan harga pakaian dan memastikan apakah ada potongan diskon.",
    "situationTh": "ถามราคาเสื้อผ้าและตรวจสอบว่ามีส่วนลดหรือไม่",
    "openingLine": "この服、とても似合いそうですね！お値段は確認しましたか？",
    "openingTranslationId": "Baju ini kelihatannya sangat cocok untukmu! Sudah cek harganya?",
    "openingTranslationTh": "เสื้อตัวนี้ดูเหมาะกับคุณมากเลยครับ! เช็คราคาหรือยังครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 16.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 16",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "これはいくらですか？",
      "税込で3000円です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_16_1",
        "term": "いくら",
        "meaningId": "berapa harga ~",
        "meaningTh": "ราคาเท่าไหร่",
        "exampleSentence": "これはいくらですか。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "これはいくらですか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "税込で3000円です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_17",
    "titleId": "FIEZEL Japanese Life A1: I went to see a movie.",
    "titleTh": "อิโรโดริ A1: I went to see a movie.",
    "subtitleId": "Can-Do Bab 17, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 17, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.5,
    "competencyId": "speak_ja_fiezel-life_l17",
    "competencyNameId": "Komunikasi Nyata: I went to see a movie.",
    "competencyNameTh": "การสื่อสารจริง: I went to see a movie.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan kegiatan menonton bioskop bersama teman di akhir pekan.",
    "situationTh": "เล่าเรื่องการไปดูภาพยนตร์กับเพื่อนในวันหยุดสุดสัปดาห์",
    "openingLine": "週末はどう過ごしましたか？どこか出かけましたか？",
    "openingTranslationId": "Bagaimana akhir pekan kemarin? Apakah kamu jalan-jalan ke suatu tempat?",
    "openingTranslationTh": "วันหยุดสุดสัปดาห์ที่ผ่านมาเป็นอย่างไรบ้างครับ? ได้ไปเที่ยวที่ไหนไหม?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 17.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 17",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "友達と映画を見に行きました。",
      "とても面白かったです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_17_1",
        "term": "映画",
        "meaningId": "film / bioskop",
        "meaningTh": "ภาพยนตร์ / หนัง",
        "exampleSentence": "映画を見ます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "友達と映画を見に行きました。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "とても面白かったです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_18",
    "titleId": "FIEZEL Japanese Life A1: I want to go to a hot spring.",
    "titleTh": "อิโรโดริ A1: I want to go to a hot spring.",
    "subtitleId": "Can-Do Bab 18, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 18, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A1",
    "difficultyB": 0.5,
    "competencyId": "speak_ja_fiezel-life_l18",
    "competencyNameId": "Komunikasi Nyata: I want to go to a hot spring.",
    "competencyNameTh": "การสื่อสารจริง: I want to go to a hot spring.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menyatakan keinginan pergi berlibur ke pemandian air panas (onsen).",
    "situationTh": "บอกความต้องการอยากไปเที่ยวแช่น้ำพุร้อน (ออนเซ็น)",
    "openingLine": "寒くなってきましたね。どこか温かい所に行きたいですね。",
    "openingTranslationId": "Udaranya mulai dingin ya. Pengin rasanya pergi ke tempat yang hangat.",
    "openingTranslationTh": "เริ่มหนาวขึ้นแล้วนะครับ อยากไปที่อุ่นๆ จังเลย",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 18.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 18",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "草津温泉に行きたいです。",
      "露天風呂に入りたいです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_18_1",
        "term": "温泉",
        "meaningId": "pemandian air panas (onsen)",
        "meaningTh": "บ่อน้ำพุร้อน (ออนเซ็น)",
        "exampleSentence": "温泉に入ります。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "草津温泉に行きたいです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "露天風呂に入りたいです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_19",
    "titleId": "FIEZEL Japanese Life A2.1: I work in a restaurant.",
    "titleTh": "อิโรโดริ A2.1: I work in a restaurant.",
    "subtitleId": "Can-Do Bab 1, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 1, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.6,
    "competencyId": "speak_ja_fiezel-life_l19",
    "competencyNameId": "Komunikasi Nyata: I work in a restaurant.",
    "competencyNameTh": "การสื่อสารจริง: I work in a restaurant.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Kamu baru pertama kali mengikuti sesi latihan percakapan di FIEZEL dan menyapa instruktur di kelas.",
    "situationTh": "คุณเพิ่งเข้าสู่เซสชันฝึกสนทนาของ FIEZEL เป็นครั้งแรกและกล่าวทักทายผู้สอนในห้องเรียน",
    "openingLine": "こんにちは！フィーゼル（FIEZEL）の日本語クラスへようこそ！初めまして、よろしくお願いします。",
    "openingTranslationId": "Halo! Selamat datang di kelas bahasa Jepang FIEZEL! Senang berkenalan dengan Anda.",
    "openingTranslationTh": "สวัสดีครับ! ยินดีต้อนรับสู่คลาสภาษาญี่ปุ่นของ FIEZEL! ยินดีที่ได้รู้จักครับ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 1.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 1",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "初めまして、～です。よろしくお願いします。",
      "～から来ました。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_19_1",
        "term": "初めまして",
        "meaningId": "salam kenal",
        "meaningTh": "ยินดีที่ได้รู้จัก",
        "exampleSentence": "初めまして、田中です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "初めまして、～です。よろしくお願いします。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "～から来ました。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_20",
    "titleId": "FIEZEL Japanese Life A2.1: I like playing video games.",
    "titleTh": "อิโรโดริ A2.1: I like playing video games.",
    "subtitleId": "Can-Do Bab 2, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 2, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.6,
    "competencyId": "speak_ja_fiezel-life_l20",
    "competencyNameId": "Komunikasi Nyata: I like playing video games.",
    "competencyNameTh": "การสื่อสารจริง: I like playing video games.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Instruktur berbicara agak cepat dan kamu ingin meminta pengulangan atau menyatakan belum paham.",
    "situationTh": "ผู้สอนพูดค่อนข้างเร็ว และคุณต้องการขอให้พูดซ้ำหรือบอกว่ายังไม่ค่อยเข้าใจ",
    "openingLine": "すみません、今の説明は分かりましたか？もし分からなければ、遠慮なく言ってくださいね。",
    "openingTranslationId": "Maaf, apakah penjelasan tadi sudah jelas? Kalau belum paham, jangan sungkan untuk bilang ya.",
    "openingTranslationTh": "ขอโทษนะครับ คำอธิบายเมื่อกี้เข้าใจไหมครับ? ถ้ายังไม่เข้าใจบอกได้เลยนะไม่ต้องเกรงใจ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 2.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 2",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "すみません、よく分かりません。",
      "もう一度ゆっくりお願いします。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_20_1",
        "term": "もう一度",
        "meaningId": "sekali lagi",
        "meaningTh": "อีกครั้งหนึ่ง",
        "exampleSentence": "もう一度お願いします。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "すみません、よく分かりません。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "もう一度ゆっくりお願いします。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_21",
    "titleId": "FIEZEL Japanese Life A2.1: It gets very cold in winter.",
    "titleTh": "อิโรโดริ A2.1: It gets very cold in winter.",
    "subtitleId": "Can-Do Bab 3, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 3, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.7,
    "competencyId": "speak_ja_fiezel-life_l21",
    "competencyNameId": "Komunikasi Nyata: It gets very cold in winter.",
    "competencyNameTh": "การสื่อสารจริง: It gets very cold in winter.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Memperkenalkan nama, negara asal (Indonesia), dan status pekerjaan/studi.",
    "situationTh": "แนะนำชื่อ ประเทศบ้านเกิด (อินโดนีเซีย) และสถานะการทำงาน/การเรียน",
    "openingLine": "お名前とご出身はどちらですか？私は東京出身です。",
    "openingTranslationId": "Nama dan asal Anda dari mana? Saya berasal dari Tokyo.",
    "openingTranslationTh": "ชื่ออะไรและมาจากไหนครับ? ผมมาจากโตเกียวครับ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 3.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 3",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "わたしはインドネシアから来ました。",
      "ジャカルタ出身です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_21_1",
        "term": "出身",
        "meaningId": "asal / kampung halaman",
        "meaningTh": "บ้านเกิด / มาจาก",
        "exampleSentence": "バンドン出身です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "わたしはインドネシアから来ました。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ジャカルタ出身です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_22",
    "titleId": "FIEZEL Japanese Life A2.1: It rained heavily yesterday.",
    "titleTh": "อิโรโดริ A2.1: It rained heavily yesterday.",
    "subtitleId": "Can-Do Bab 4, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 4, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.8,
    "competencyId": "speak_ja_fiezel-life_l22",
    "competencyNameId": "Komunikasi Nyata: It rained heavily yesterday.",
    "competencyNameTh": "การสื่อสารจริง: It rained heavily yesterday.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menjelaskan kota dan daerah tempat tinggal saat ini di Jepang.",
    "situationTh": "บอกเมืองและย่านที่พักอาศัยอยู่ในปัจจุบันที่ญี่ปุ่น",
    "openingLine": "日本にはもう慣れましたか？今、どちらにお住まいですか？",
    "openingTranslationId": "Apakah sudah terbiasa tinggal di Jepang? Sekarang Anda tinggal di mana?",
    "openingTranslationTh": "เริ่มชินกับญี่ปุ่นหรือยังครับ? ตอนนี้พักอยู่ที่ไหนครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 4.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 4",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "東京の新宿に住んでいます。",
      "駅の近くです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_22_1",
        "term": "住んでいます",
        "meaningId": "tinggal di ~",
        "meaningTh": "อาศัยอยู่ที่ ~",
        "exampleSentence": "アパートに住んでいます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "東京の新宿に住んでいます。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "駅の近くです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_23",
    "titleId": "FIEZEL Japanese Life A2.1: It is very lively and convenient.",
    "titleTh": "อิโรโดริ A2.1: It is very lively and convenient.",
    "subtitleId": "Can-Do Bab 5, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 5, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.8,
    "competencyId": "speak_ja_fiezel-life_l23",
    "competencyNameId": "Komunikasi Nyata: It is very lively and convenient.",
    "competencyNameTh": "การสื่อสารจริง: It is very lively and convenient.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan makanan favorit dan menyatakan kesukaan masakan Jepang.",
    "situationTh": "เล่าถึงอาหารจานโปรดและบอกความชอบเกี่ยวกับอาหารญี่ปุ่น",
    "openingLine": "お昼ご飯は何が好きですか？日本の料理はもう食べましたか？",
    "openingTranslationId": "Kamu suka makan siang apa? Apakah sudah pernah mencoba masakan Jepang?",
    "openingTranslationTh": "ชอบทานมื้อเที่ยงเป็นอะไรครับ? ได้ลองทานอาหารญี่ปุ่นบ้างหรือยัง?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 5.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 5",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "うどんやラーメンが好きです。",
      "納豆はあまり好きじゃないです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_23_1",
        "term": "好きです",
        "meaningId": "suka ~",
        "meaningTh": "ชอบ ~",
        "exampleSentence": "寿司が好きです。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "うどんやラーメンが好きです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "納豆はあまり好きじゃないです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_24",
    "titleId": "FIEZEL Japanese Life A2.1: Please tell me how to get to the post office.",
    "titleTh": "อิโรโดริ A2.1: Please tell me how to get to the post office.",
    "subtitleId": "Can-Do Bab 6, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 6, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.9,
    "competencyId": "speak_ja_fiezel-life_l24",
    "competencyNameId": "Komunikasi Nyata: Please tell me how to get to the post office.",
    "competencyNameTh": "การสื่อสารจริง: Please tell me how to get to the post office.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Memesan set menu makanan dan minuman di restoran cepat saji.",
    "situationTh": "สั่งชุดอาหารและเครื่องดื่มที่ร้านฟาสต์ฟู้ด",
    "openingLine": "いらっしゃいませ！ご注文はお決まりですか？",
    "openingTranslationId": "Selamat datang! Apakah pesanannya sudah ditentukan?",
    "openingTranslationTh": "ยินดีต้อนรับครับ! สั่งอาหารอะไรดีครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 6.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 6",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "チーズバーガーをひとつと、アイスティーをください。",
      "ここで食べます。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_24_1",
        "term": "ください",
        "meaningId": "tolong berikan ~",
        "meaningTh": "ขอ ~ หน่อยครับ",
        "exampleSentence": "水をください。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "チーズバーガーをひとつと、アイスティーをください。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ここで食べます。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_25",
    "titleId": "FIEZEL Japanese Life A2.1: I will be a bit late because I got lost.",
    "titleTh": "อิโรโดริ A2.1: I will be a bit late because I got lost.",
    "subtitleId": "Can-Do Bab 7, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 7, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 0.9,
    "competencyId": "speak_ja_fiezel-life_l25",
    "competencyNameId": "Komunikasi Nyata: I will be a bit late because I got lost.",
    "competencyNameTh": "การสื่อสารจริง: I will be a bit late because I got lost.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menjelaskan fasilitas dan jumlah kamar di apartemen tempat tinggal.",
    "situationTh": "อธิบายสิ่งอำนวยความสะดวกและจำนวนห้องในอพาร์ตเมนต์",
    "openingLine": "新しいお部屋はどうですか？部屋はいくつありますか？",
    "openingTranslationId": "Bagaimana dengan kamar barumu? Ada berapa kamar di sana?",
    "openingTranslationTh": "ห้องพักใหม่เป็นอย่างไรบ้างครับ? มีห้องกี่ห้องครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 7.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 7",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "部屋がふたつあります。",
      "とても明るくて静かです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_25_1",
        "term": "あります",
        "meaningId": "ada (benda mati)",
        "meaningTh": "มี (สิ่งไม่มีชีวิต)",
        "exampleSentence": "机があります。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "部屋がふたつあります。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "とても明るくて静かです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_26",
    "titleId": "FIEZEL Japanese Life A2.1: Have you ever played baseball?",
    "titleTh": "อิโรโดริ A2.1: Have you ever played baseball?",
    "subtitleId": "Can-Do Bab 8, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 8, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1,
    "competencyId": "speak_ja_fiezel-life_l26",
    "competencyNameId": "Komunikasi Nyata: Have you ever played baseball?",
    "competencyNameTh": "การสื่อสารจริง: Have you ever played baseball?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menjelaskan keberadaan rekan kerja di kantor atau area pabrik.",
    "situationTh": "บอกตำแหน่งที่อยู่ของเพื่อนร่วมงานในออฟฟิศหรือโรงงาน",
    "openingLine": "あれ、山田さんはどこですか？見かけましたか？",
    "openingTranslationId": "Lho, Yamada-san di mana ya? Apakah kamu melihatnya?",
    "openingTranslationTh": "เอ๊ะ คุณยามาดะอยู่ไหนครับ? เห็นบ้างไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 8.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 8",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "山田さんは会議室にいますよ。",
      "今、電話中です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_26_1",
        "term": "います",
        "meaningId": "ada (orang/makhluk hidup)",
        "meaningTh": "อยู่ (คน/สิ่งมีชีวิต)",
        "exampleSentence": "ロビーにいます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "山田さんは会議室にいますよ。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "今、電話中です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_27",
    "titleId": "FIEZEL Japanese Life A2.1: Will you tell me how to read this?",
    "titleTh": "อิโรโดริ A2.1: Will you tell me how to read this?",
    "subtitleId": "Can-Do Bab 9, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 9, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.1,
    "competencyId": "speak_ja_fiezel-life_l27",
    "competencyNameId": "Komunikasi Nyata: Will you tell me how to read this?",
    "competencyNameTh": "การสื่อสารจริง: Will you tell me how to read this?",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menjelaskan jam istirahat makan siang dan jadwal kerja harian.",
    "situationTh": "บอกเวลาพักกลางวันและตารางเวลาทำงานประจำวัน",
    "openingLine": "お疲れさまです！お昼休みは何時から何時までですか？",
    "openingTranslationId": "Semangat kerja! Istirahat makan siang dari jam berapa sampai jam berapa?",
    "openingTranslationTh": "เหนื่อยหน่อยนะครับ! พักเที่ยงตั้งแต่กี่โมงถึงกี่โมงครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 9.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 9",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "12時から1時までです。",
      "8時半に始まります。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_27_1",
        "term": "から～まで",
        "meaningId": "dari ~ sampai ~",
        "meaningTh": "ตั้งแต่ ~ ถึง ~",
        "exampleSentence": "9時から5時までです。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "12時から1時までです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "8時半に始まります。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_28",
    "titleId": "FIEZEL Japanese Life A2.1: I would like to take a Japanese-language class.",
    "titleTh": "อิโรโดริ A2.1: I would like to take a Japanese-language class.",
    "subtitleId": "Can-Do Bab 10, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 10, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.1,
    "competencyId": "speak_ja_fiezel-life_l28",
    "competencyNameId": "Komunikasi Nyata: I would like to take a Japanese-language class.",
    "competencyNameTh": "การสื่อสารจริง: I would like to take a Japanese-language class.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Meminjam alat kantor (staples/gunting) secara sopan kepada rekan kerja.",
    "situationTh": "ขอยืมอุปกรณ์สำนักงาน (เครื่องเย็บกระดาษ/กรรไกร) อย่างสุภาพ",
    "openingLine": "書類の整理ですか？何か使う道具はありますか？",
    "openingTranslationId": "Sedang merapikan dokumen ya? Apakah ada alat yang perlu kamu pakai?",
    "openingTranslationTh": "กำลังจัดเอกสารอยู่เหรอครับ? มีอุปกรณ์อะไรที่ต้องใช้ไหม?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 10.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 10",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "ホチキスを貸していただけますか？",
      "使ってもいいですか？"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_28_1",
        "term": "貸してください",
        "meaningId": "tolong pinjamkan",
        "meaningTh": "ขอยืมหน่อยครับ",
        "exampleSentence": "ペンを貸してください。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "ホチキスを貸していただけますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "使ってもいいですか？",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_29",
    "titleId": "FIEZEL Japanese Life A2.1: I will bring meat and vegetables.",
    "titleTh": "อิโรโดริ A2.1: I will bring meat and vegetables.",
    "subtitleId": "Can-Do Bab 11, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 11, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.2,
    "competencyId": "speak_ja_fiezel-life_l29",
    "competencyNameId": "Komunikasi Nyata: I will bring meat and vegetables.",
    "competencyNameTh": "การสื่อสารจริง: I will bring meat and vegetables.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan hobi santai dan kegemaran membaca manga atau menonton anime.",
    "situationTh": "เล่าถึงงานอดิเรกและการดูอนิเมะหรืออ่านมังงะในเวลาว่าง",
    "openingLine": "休みの日は何をしていますか？好きなアニメや漫画はありますか？",
    "openingTranslationId": "Hari libur biasanya kamu ngapain? Apakah ada anime atau manga yang kamu suka?",
    "openingTranslationTh": "วันหยุดมักจะทำอะไรครับ? มีอนิเมะหรือมังงะที่ชอบไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 11.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 11",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "週末は家で漫画を読んでいます。",
      "ONE PIECEが大好きです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_29_1",
        "term": "漫画",
        "meaningId": "komik / manga",
        "meaningTh": "การ์ตูน / มังงะ",
        "exampleSentence": "漫画を読みます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "週末は家で漫画を読んでいます。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ONE PIECEが大好きです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_30",
    "titleId": "FIEZEL Japanese Life A2.1: Your bento looks delicious.",
    "titleTh": "อิโรโดริ A2.1: Your bento looks delicious.",
    "subtitleId": "Can-Do Bab 12, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 12, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.2,
    "competencyId": "speak_ja_fiezel-life_l30",
    "competencyNameId": "Komunikasi Nyata: Your bento looks delicious.",
    "competencyNameTh": "การสื่อสารจริง: Your bento looks delicious.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menerima atau menolak ajakan minum bersama rekan kerja secara ramah.",
    "situationTh": "ตอบรับหรือปฏิเสธคำชวนไปสังสรรค์หลังเลิกงานอย่างสุภาพ",
    "openingLine": "今週の金曜日、仕事のあとに一杯飲みに行きませんか？",
    "openingTranslationId": "Jumat minggu ini, maukah pergi minum bareng setelah selesai kerja?",
    "openingTranslationTh": "วันศุกร์นี้ เลิกงานแล้วไปดื่มด้วยกันสักแก้วไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 12.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 12",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "いいですね、ぜひ行きましょう！",
      "すみません、金曜日は予定があります。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_30_1",
        "term": "行きませんか",
        "meaningId": "maukah pergi bersama?",
        "meaningTh": "ไปด้วยกันไหมครับ?",
        "exampleSentence": "一緒に食べませんか。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "いいですね、ぜひ行きましょう！",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "すみません、金曜日は予定があります。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_31",
    "titleId": "FIEZEL Japanese Life A2.1: It will probably end in about ten minutes.",
    "titleTh": "อิโรโดริ A2.1: It will probably end in about ten minutes.",
    "subtitleId": "Can-Do Bab 13, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 13, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.3,
    "competencyId": "speak_ja_fiezel-life_l31",
    "competencyNameId": "Komunikasi Nyata: It will probably end in about ten minutes.",
    "competencyNameTh": "การสื่อสารจริง: It will probably end in about ten minutes.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menanyakan rute dan memastikan apakah bus menuju ke tujuan bandara.",
    "situationTh": "ถามเส้นทางและตรวจสอบว่ารถบัสคันนี้ไปสนามบินหรือไม่",
    "openingLine": "成田空港に行きたいんですが、どのバスに乗ればいいですか？",
    "openingTranslationId": "Saya mau ke Bandara Narita, sebaiknya naik bus yang mana ya?",
    "openingTranslationTh": "อยากไปสนามบินนาริตะครับ ควรขึ้นรถบัสคันไหนดีครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 13.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 13",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "このバスは空港へ行きますか？",
      "3番乗り場から乗ってください。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_31_1",
        "term": "空港",
        "meaningId": "bandara",
        "meaningTh": "สนามบิน",
        "exampleSentence": "羽田空港に行きます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "このバスは空港へ行きますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "3番乗り場から乗ってください。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_32",
    "titleId": "FIEZEL Japanese Life A2.1: May I take a day off?",
    "titleTh": "อิโรโดริ A2.1: May I take a day off?",
    "subtitleId": "Can-Do Bab 14, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 14, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.4,
    "competencyId": "speak_ja_fiezel-life_l32",
    "competencyNameId": "Komunikasi Nyata: May I take a day off?",
    "competencyNameTh": "การสื่อสารจริง: May I take a day off?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menanyakan nama gedung dan fasilitas publik di sekitar kota.",
    "situationTh": "ถามชื่ออาคารและสถานที่สำคัญรอบๆ เมือง",
    "openingLine": "あの高いビル、見えますか？あれは何の建物か知っていますか？",
    "openingTranslationId": "Gedung tinggi di sana kelihatan kan? Tahu tidak itu gedung apa?",
    "openingTranslationTh": "เห็นตึกสูงๆ ตรงนั้นไหมครับ? รู้ไหมว่านั่นตึกอะไร?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 14.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 14",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "とても大きい建物ですね。",
      "あれは市役所ですよ。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_32_1",
        "term": "建物",
        "meaningId": "bangunan / gedung",
        "meaningTh": "อาคาร / ตึก",
        "exampleSentence": "新しい建物です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "とても大きい建物ですね。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "あれは市役所ですよ。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_33",
    "titleId": "FIEZEL Japanese Life A2.1: I have a fever, and my throat is sore.",
    "titleTh": "อิโรโดริ A2.1: I have a fever, and my throat is sore.",
    "subtitleId": "Can-Do Bab 15, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 15, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.4,
    "competencyId": "speak_ja_fiezel-life_l33",
    "competencyNameId": "Komunikasi Nyata: I have a fever, and my throat is sore.",
    "competencyNameTh": "การสื่อสารจริง: I have a fever, and my throat is sore.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menanyakan letak barang baterai atau keperluan harian ke kasir toko.",
    "situationTh": "ถามพนักงานร้านสะดวกซื้อว่าถ่านไฟฉายหรือของใช้จำเป็นวางอยู่ตรงไหน",
    "openingLine": "コンビニでお買い物ですか？何か探しているものはありますか？",
    "openingTranslationId": "Sedang belanja di konbini? Apakah ada barang yang sedang kamu cari?",
    "openingTranslationTh": "ซื้อของที่ร้านสะดวกซื้อเหรอครับ? กำลังหาอะไรอยู่หรือเปล่า?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 15.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 15",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "電池はどこにありますか？",
      "あちらの棚の2段目です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_33_1",
        "term": "電池",
        "meaningId": "baterai",
        "meaningTh": "ถ่านไฟฉาย / แบตเตอรี่",
        "exampleSentence": "単三電池を買います。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "電池はどこにありますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "あちらの棚の2段目です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_34",
    "titleId": "FIEZEL Japanese Life A2.1: I try not to eat too much.",
    "titleTh": "อิโรโดริ A2.1: I try not to eat too much.",
    "subtitleId": "Can-Do Bab 16, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 16, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.5,
    "competencyId": "speak_ja_fiezel-life_l34",
    "competencyNameId": "Komunikasi Nyata: I try not to eat too much.",
    "competencyNameTh": "การสื่อสารจริง: I try not to eat too much.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menanyakan harga pakaian dan memastikan apakah ada potongan diskon.",
    "situationTh": "ถามราคาเสื้อผ้าและตรวจสอบว่ามีส่วนลดหรือไม่",
    "openingLine": "この服、とても似合いそうですね！お値段は確認しましたか？",
    "openingTranslationId": "Baju ini kelihatannya sangat cocok untukmu! Sudah cek harganya?",
    "openingTranslationTh": "เสื้อตัวนี้ดูเหมาะกับคุณมากเลยครับ! เช็คราคาหรือยังครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 16.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 16",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "これはいくらですか？",
      "税込で3000円です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_34_1",
        "term": "いくら",
        "meaningId": "berapa harga ~",
        "meaningTh": "ราคาเท่าไหร่",
        "exampleSentence": "これはいくらですか。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "これはいくらですか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "税込で3000円です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_35",
    "titleId": "FIEZEL Japanese Life A2.1: This is a personal amulet my older brother gave me.",
    "titleTh": "อิโรโดริ A2.1: This is a personal amulet my older brother gave me.",
    "subtitleId": "Can-Do Bab 17, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 17, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.5,
    "competencyId": "speak_ja_fiezel-life_l35",
    "competencyNameId": "Komunikasi Nyata: This is a personal amulet my older brother gave me.",
    "competencyNameTh": "การสื่อสารจริง: This is a personal amulet my older brother gave me.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan kegiatan menonton bioskop bersama teman di akhir pekan.",
    "situationTh": "เล่าเรื่องการไปดูภาพยนตร์กับเพื่อนในวันหยุดสุดสัปดาห์",
    "openingLine": "週末はどう過ごしましたか？どこか出かけましたか？",
    "openingTranslationId": "Bagaimana akhir pekan kemarin? Apakah kamu jalan-jalan ke suatu tempat?",
    "openingTranslationTh": "วันหยุดสุดสัปดาห์ที่ผ่านมาเป็นอย่างไรบ้างครับ? ได้ไปเที่ยวที่ไหนไหม?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 17.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 17",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "友達と映画を見に行きました。",
      "とても面白かったです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_35_1",
        "term": "映画",
        "meaningId": "film / bioskop",
        "meaningTh": "ภาพยนตร์ / หนัง",
        "exampleSentence": "映画を見ます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "友達と映画を見に行きました。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "とても面白かったです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_36",
    "titleId": "FIEZEL Japanese Life A2.1: How about giving something as a gift?",
    "titleTh": "อิโรโดริ A2.1: How about giving something as a gift?",
    "subtitleId": "Can-Do Bab 18, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 18, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.1",
    "difficultyB": 1.6,
    "competencyId": "speak_ja_fiezel-life_l36",
    "competencyNameId": "Komunikasi Nyata: How about giving something as a gift?",
    "competencyNameTh": "การสื่อสารจริง: How about giving something as a gift?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menyatakan keinginan pergi berlibur ke pemandian air panas (onsen).",
    "situationTh": "บอกความต้องการอยากไปเที่ยวแช่น้ำพุร้อน (ออนเซ็น)",
    "openingLine": "寒くなってきましたね。どこか温かい所に行きたいですね。",
    "openingTranslationId": "Udaranya mulai dingin ya. Pengin rasanya pergi ke tempat yang hangat.",
    "openingTranslationTh": "เริ่มหนาวขึ้นแล้วนะครับ อยากไปที่อุ่นๆ จังเลย",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 18.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 18",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "草津温泉に行きたいです。",
      "露天風呂に入りたいです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_36_1",
        "term": "温泉",
        "meaningId": "pemandian air panas (onsen)",
        "meaningTh": "บ่อน้ำพุร้อน (ออนเซ็น)",
        "exampleSentence": "温泉に入ります。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "草津温泉に行きたいです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "露天風呂に入りたいです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_37",
    "titleId": "FIEZEL Japanese Life A2.2: I just came to Japan last week.",
    "titleTh": "อิโรโดริ A2.2: I just came to Japan last week.",
    "subtitleId": "Can-Do Bab 1, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 1, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 1.7,
    "competencyId": "speak_ja_fiezel-life_l37",
    "competencyNameId": "Komunikasi Nyata: I just came to Japan last week.",
    "competencyNameTh": "การสื่อสารจริง: I just came to Japan last week.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Kamu baru pertama kali mengikuti sesi latihan percakapan di FIEZEL dan menyapa instruktur di kelas.",
    "situationTh": "คุณเพิ่งเข้าสู่เซสชันฝึกสนทนาของ FIEZEL เป็นครั้งแรกและกล่าวทักทายผู้สอนในห้องเรียน",
    "openingLine": "こんにちは！フィーゼル（FIEZEL）の日本語クラスへようこそ！初めまして、よろしくお願いします。",
    "openingTranslationId": "Halo! Selamat datang di kelas bahasa Jepang FIEZEL! Senang berkenalan dengan Anda.",
    "openingTranslationTh": "สวัสดีครับ! ยินดีต้อนรับสู่คลาสภาษาญี่ปุ่นของ FIEZEL! ยินดีที่ได้รู้จักครับ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 1.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 1",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "初めまして、～です。よろしくお願いします。",
      "～から来ました。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_37_1",
        "term": "初めまして",
        "meaningId": "salam kenal",
        "meaningTh": "ยินดีที่ได้รู้จัก",
        "exampleSentence": "初めまして、田中です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "初めまして、～です。よろしくお願いします。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "～から来ました。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_38",
    "titleId": "FIEZEL Japanese Life A2.2: He looks a serious person.",
    "titleTh": "อิโรโดริ A2.2: He looks a serious person.",
    "subtitleId": "Can-Do Bab 2, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 2, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 1.7,
    "competencyId": "speak_ja_fiezel-life_l38",
    "competencyNameId": "Komunikasi Nyata: He looks a serious person.",
    "competencyNameTh": "การสื่อสารจริง: He looks a serious person.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Instruktur berbicara agak cepat dan kamu ingin meminta pengulangan atau menyatakan belum paham.",
    "situationTh": "ผู้สอนพูดค่อนข้างเร็ว และคุณต้องการขอให้พูดซ้ำหรือบอกว่ายังไม่ค่อยเข้าใจ",
    "openingLine": "すみません、今の説明は分かりましたか？もし分からなければ、遠慮なく言ってくださいね。",
    "openingTranslationId": "Maaf, apakah penjelasan tadi sudah jelas? Kalau belum paham, jangan sungkan untuk bilang ya.",
    "openingTranslationTh": "ขอโทษนะครับ คำอธิบายเมื่อกี้เข้าใจไหมครับ? ถ้ายังไม่เข้าใจบอกได้เลยนะไม่ต้องเกรงใจ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 2.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 2",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "すみません、よく分かりません。",
      "もう一度ゆっくりお願いします。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_38_1",
        "term": "もう一度",
        "meaningId": "sekali lagi",
        "meaningTh": "อีกครั้งหนึ่ง",
        "exampleSentence": "もう一度お願いします。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "すみません、よく分かりません。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "もう一度ゆっくりお願いします。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_39",
    "titleId": "FIEZEL Japanese Life A2.2: I cannot eat it because of an allergy.",
    "titleTh": "อิโรโดริ A2.2: I cannot eat it because of an allergy.",
    "subtitleId": "Can-Do Bab 3, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 3, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 1.8,
    "competencyId": "speak_ja_fiezel-life_l39",
    "competencyNameId": "Komunikasi Nyata: I cannot eat it because of an allergy.",
    "competencyNameTh": "การสื่อสารจริง: I cannot eat it because of an allergy.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Memperkenalkan nama, negara asal (Indonesia), dan status pekerjaan/studi.",
    "situationTh": "แนะนำชื่อ ประเทศบ้านเกิด (อินโดนีเซีย) และสถานะการทำงาน/การเรียน",
    "openingLine": "お名前とご出身はどちらですか？私は東京出身です。",
    "openingTranslationId": "Nama dan asal Anda dari mana? Saya berasal dari Tokyo.",
    "openingTranslationTh": "ชื่ออะไรและมาจากไหนครับ? ผมมาจากโตเกียวครับ",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 3.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 3",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "わたしはインドネシアから来ました。",
      "ジャカルタ出身です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_39_1",
        "term": "出身",
        "meaningId": "asal / kampung halaman",
        "meaningTh": "บ้านเกิด / มาจาก",
        "exampleSentence": "バンドン出身です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "わたしはインドネシアから来ました。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ジャカルタ出身です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_40",
    "titleId": "FIEZEL Japanese Life A2.2: Please eat it without soy sauce.",
    "titleTh": "อิโรโดริ A2.2: Please eat it without soy sauce.",
    "subtitleId": "Can-Do Bab 4, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 4, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 1.8,
    "competencyId": "speak_ja_fiezel-life_l40",
    "competencyNameId": "Komunikasi Nyata: Please eat it without soy sauce.",
    "competencyNameTh": "การสื่อสารจริง: Please eat it without soy sauce.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menjelaskan kota dan daerah tempat tinggal saat ini di Jepang.",
    "situationTh": "บอกเมืองและย่านที่พักอาศัยอยู่ในปัจจุบันที่ญี่ปุ่น",
    "openingLine": "日本にはもう慣れましたか？今、どちらにお住まいですか？",
    "openingTranslationId": "Apakah sudah terbiasa tinggal di Jepang? Sekarang Anda tinggal di mana?",
    "openingTranslationTh": "เริ่มชินกับญี่ปุ่นหรือยังครับ? ตอนนี้พักอยู่ที่ไหนครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 4.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 4",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "東京の新宿に住んでいます。",
      "駅の近くです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_40_1",
        "term": "住んでいます",
        "meaningId": "tinggal di ~",
        "meaningTh": "อาศัยอยู่ที่ ~",
        "exampleSentence": "アパートに住んでいます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "東京の新宿に住んでいます。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "駅の近くです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_41",
    "titleId": "FIEZEL Japanese Life A2.2: You should make a reservation early.",
    "titleTh": "อิโรโดริ A2.2: You should make a reservation early.",
    "subtitleId": "Can-Do Bab 5, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 5, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 1.9,
    "competencyId": "speak_ja_fiezel-life_l41",
    "competencyNameId": "Komunikasi Nyata: You should make a reservation early.",
    "competencyNameTh": "การสื่อสารจริง: You should make a reservation early.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan makanan favorit dan menyatakan kesukaan masakan Jepang.",
    "situationTh": "เล่าถึงอาหารจานโปรดและบอกความชอบเกี่ยวกับอาหารญี่ปุ่น",
    "openingLine": "お昼ご飯は何が好きですか？日本の料理はもう食べましたか？",
    "openingTranslationId": "Kamu suka makan siang apa? Apakah sudah pernah mencoba masakan Jepang?",
    "openingTranslationTh": "ชอบทานมื้อเที่ยงเป็นอะไรครับ? ได้ลองทานอาหารญี่ปุ่นบ้างหรือยัง?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 5.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 5",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "うどんやラーメンが好きです。",
      "納豆はあまり好きじゃないです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_41_1",
        "term": "好きです",
        "meaningId": "suka ~",
        "meaningTh": "ชอบ ~",
        "exampleSentence": "寿司が好きです。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "うどんやラーメンが好きです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "納豆はあまり好きじゃないです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_42",
    "titleId": "FIEZEL Japanese Life A2.2: I am glad that I went to a lot of different places.",
    "titleTh": "อิโรโดริ A2.2: I am glad that I went to a lot of different places.",
    "subtitleId": "Can-Do Bab 6, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 6, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2,
    "competencyId": "speak_ja_fiezel-life_l42",
    "competencyNameId": "Komunikasi Nyata: I am glad that I went to a lot of different places.",
    "competencyNameTh": "การสื่อสารจริง: I am glad that I went to a lot of different places.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Memesan set menu makanan dan minuman di restoran cepat saji.",
    "situationTh": "สั่งชุดอาหารและเครื่องดื่มที่ร้านฟาสต์ฟู้ด",
    "openingLine": "いらっしゃいませ！ご注文はお決まりですか？",
    "openingTranslationId": "Selamat datang! Apakah pesanannya sudah ditentukan?",
    "openingTranslationTh": "ยินดีต้อนรับครับ! สั่งอาหารอะไรดีครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 6.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 6",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "チーズバーガーをひとつと、アイスティーをください。",
      "ここで食べます。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_42_1",
        "term": "ください",
        "meaningId": "tolong berikan ~",
        "meaningTh": "ขอ ~ หน่อยครับ",
        "exampleSentence": "水をください。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "チーズバーガーをひとつと、アイスティーをください。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ここで食べます。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_43",
    "titleId": "FIEZEL Japanese Life A2.2: If it rains, it will be held at the hall.",
    "titleTh": "อิโรโดริ A2.2: If it rains, it will be held at the hall.",
    "subtitleId": "Can-Do Bab 7, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 7, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2,
    "competencyId": "speak_ja_fiezel-life_l43",
    "competencyNameId": "Komunikasi Nyata: If it rains, it will be held at the hall.",
    "competencyNameTh": "การสื่อสารจริง: If it rains, it will be held at the hall.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menjelaskan fasilitas dan jumlah kamar di apartemen tempat tinggal.",
    "situationTh": "อธิบายสิ่งอำนวยความสะดวกและจำนวนห้องในอพาร์ตเมนต์",
    "openingLine": "新しいお部屋はどうですか？部屋はいくつありますか？",
    "openingTranslationId": "Bagaimana dengan kamar barumu? Ada berapa kamar di sana?",
    "openingTranslationTh": "ห้องพักใหม่เป็นอย่างไรบ้างครับ? มีห้องกี่ห้องครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 7.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 7",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "部屋がふたつあります。",
      "とても明るくて静かです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_43_1",
        "term": "あります",
        "meaningId": "ada (benda mati)",
        "meaningTh": "มี (สิ่งไม่มีชีวิต)",
        "exampleSentence": "机があります。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "部屋がふたつあります。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "とても明るくて静かです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_44",
    "titleId": "FIEZEL Japanese Life A2.2: Do you know where the food stands are?",
    "titleTh": "อิโรโดริ A2.2: Do you know where the food stands are?",
    "subtitleId": "Can-Do Bab 8, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 8, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.1,
    "competencyId": "speak_ja_fiezel-life_l44",
    "competencyNameId": "Komunikasi Nyata: Do you know where the food stands are?",
    "competencyNameTh": "การสื่อสารจริง: Do you know where the food stands are?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menjelaskan keberadaan rekan kerja di kantor atau area pabrik.",
    "situationTh": "บอกตำแหน่งที่อยู่ของเพื่อนร่วมงานในออฟฟิศหรือโรงงาน",
    "openingLine": "あれ、山田さんはどこですか？見かけましたか？",
    "openingTranslationId": "Lho, Yamada-san di mana ya? Apakah kamu melihatnya?",
    "openingTranslationTh": "เอ๊ะ คุณยามาดะอยู่ไหนครับ? เห็นบ้างไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 8.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 8",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "山田さんは会議室にいますよ。",
      "今、電話中です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_44_1",
        "term": "います",
        "meaningId": "ada (orang/makhluk hidup)",
        "meaningTh": "อยู่ (คน/สิ่งมีชีวิต)",
        "exampleSentence": "ロビーにいます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "山田さんは会議室にいますよ。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "今、電話中です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_45",
    "titleId": "FIEZEL Japanese Life A2.2: What do people do on Coming-of-Age Day?",
    "titleTh": "อิโรโดริ A2.2: What do people do on Coming-of-Age Day?",
    "subtitleId": "Can-Do Bab 9, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 9, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.1,
    "competencyId": "speak_ja_fiezel-life_l45",
    "competencyNameId": "Komunikasi Nyata: What do people do on Coming-of-Age Day?",
    "competencyNameTh": "การสื่อสารจริง: What do people do on Coming-of-Age Day?",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menjelaskan jam istirahat makan siang dan jadwal kerja harian.",
    "situationTh": "บอกเวลาพักกลางวันและตารางเวลาทำงานประจำวัน",
    "openingLine": "お疲れさまです！お昼休みは何時から何時までですか？",
    "openingTranslationId": "Semangat kerja! Istirahat makan siang dari jam berapa sampai jam berapa?",
    "openingTranslationTh": "เหนื่อยหน่อยนะครับ! พักเที่ยงตั้งแต่กี่โมงถึงกี่โมงครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 9.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 9",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "12時から1時までです。",
      "8時半に始まります。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_45_1",
        "term": "から～まで",
        "meaningId": "dari ~ sampai ~",
        "meaningTh": "ตั้งแต่ ~ ถึง ~",
        "exampleSentence": "9時から5時までです。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "12時から1時までです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "8時半に始まります。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_46",
    "titleId": "FIEZEL Japanese Life A2.2: What kind of clothes should I wear?",
    "titleTh": "อิโรโดริ A2.2: What kind of clothes should I wear?",
    "subtitleId": "Can-Do Bab 10, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 10, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.2,
    "competencyId": "speak_ja_fiezel-life_l46",
    "competencyNameId": "Komunikasi Nyata: What kind of clothes should I wear?",
    "competencyNameTh": "การสื่อสารจริง: What kind of clothes should I wear?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Meminjam alat kantor (staples/gunting) secara sopan kepada rekan kerja.",
    "situationTh": "ขอยืมอุปกรณ์สำนักงาน (เครื่องเย็บกระดาษ/กรรไกร) อย่างสุภาพ",
    "openingLine": "書類の整理ですか？何か使う道具はありますか？",
    "openingTranslationId": "Sedang merapikan dokumen ya? Apakah ada alat yang perlu kamu pakai?",
    "openingTranslationTh": "กำลังจัดเอกสารอยู่เหรอครับ? มีอุปกรณ์อะไรที่ต้องใช้ไหม?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 10.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 10",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "ホチキスを貸していただけますか？",
      "使ってもいいですか？"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_46_1",
        "term": "貸してください",
        "meaningId": "tolong pinjamkan",
        "meaningTh": "ขอยืมหน่อยครับ",
        "exampleSentence": "ペンを貸してください。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "ホチキスを貸していただけますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "使ってもいいですか？",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_47",
    "titleId": "FIEZEL Japanese Life A2.2: I forgot to bring my point card.",
    "titleTh": "อิโรโดริ A2.2: I forgot to bring my point card.",
    "subtitleId": "Can-Do Bab 11, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 11, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.3,
    "competencyId": "speak_ja_fiezel-life_l47",
    "competencyNameId": "Komunikasi Nyata: I forgot to bring my point card.",
    "competencyNameTh": "การสื่อสารจริง: I forgot to bring my point card.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan hobi santai dan kegemaran membaca manga atau menonton anime.",
    "situationTh": "เล่าถึงงานอดิเรกและการดูอนิเมะหรืออ่านมังงะในเวลาว่าง",
    "openingLine": "休みの日は何をしていますか？好きなアニメや漫画はありますか？",
    "openingTranslationId": "Hari libur biasanya kamu ngapain? Apakah ada anime atau manga yang kamu suka?",
    "openingTranslationTh": "วันหยุดมักจะทำอะไรครับ? มีอนิเมะหรือมังงะที่ชอบไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 11.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 11",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "週末は家で漫画を読んでいます。",
      "ONE PIECEが大好きです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_47_1",
        "term": "漫画",
        "meaningId": "komik / manga",
        "meaningTh": "การ์ตูน / มังงะ",
        "exampleSentence": "漫画を読みます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "週末は家で漫画を読んでいます。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "ONE PIECEが大好きです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_48",
    "titleId": "FIEZEL Japanese Life A2.2: This vacuum cleaner is light and easy to move around.",
    "titleTh": "อิโรโดริ A2.2: This vacuum cleaner is light and easy to move around.",
    "subtitleId": "Can-Do Bab 12, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 12, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.3,
    "competencyId": "speak_ja_fiezel-life_l48",
    "competencyNameId": "Komunikasi Nyata: This vacuum cleaner is light and easy to move around.",
    "competencyNameTh": "การสื่อสารจริง: This vacuum cleaner is light and easy to move around.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menerima atau menolak ajakan minum bersama rekan kerja secara ramah.",
    "situationTh": "ตอบรับหรือปฏิเสธคำชวนไปสังสรรค์หลังเลิกงานอย่างสุภาพ",
    "openingLine": "今週の金曜日、仕事のあとに一杯飲みに行きませんか？",
    "openingTranslationId": "Jumat minggu ini, maukah pergi minum bareng setelah selesai kerja?",
    "openingTranslationTh": "วันศุกร์นี้ เลิกงานแล้วไปดื่มด้วยกันสักแก้วไหมครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 12.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 12",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "いいですね、ぜひ行きましょう！",
      "すみません、金曜日は予定があります。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_48_1",
        "term": "行きませんか",
        "meaningId": "maukah pergi bersama?",
        "meaningTh": "ไปด้วยกันไหมครับ?",
        "exampleSentence": "一緒に食べませんか。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "いいですね、ぜひ行きましょう！",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "すみません、金曜日は予定があります。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_49",
    "titleId": "FIEZEL Japanese Life A2.2: They display a lot of materials.",
    "titleTh": "อิโรโดริ A2.2: They display a lot of materials.",
    "subtitleId": "Can-Do Bab 13, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 13, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.4,
    "competencyId": "speak_ja_fiezel-life_l49",
    "competencyNameId": "Komunikasi Nyata: They display a lot of materials.",
    "competencyNameTh": "การสื่อสารจริง: They display a lot of materials.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menanyakan rute dan memastikan apakah bus menuju ke tujuan bandara.",
    "situationTh": "ถามเส้นทางและตรวจสอบว่ารถบัสคันนี้ไปสนามบินหรือไม่",
    "openingLine": "成田空港に行きたいんですが、どのバスに乗ればいいですか？",
    "openingTranslationId": "Saya mau ke Bandara Narita, sebaiknya naik bus yang mana ya?",
    "openingTranslationTh": "อยากไปสนามบินนาริตะครับ ควรขึ้นรถบัสคันไหนดีครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 13.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 13",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "このバスは空港へ行きますか？",
      "3番乗り場から乗ってください。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_49_1",
        "term": "空港",
        "meaningId": "bandara",
        "meaningTh": "สนามบิน",
        "exampleSentence": "羽田空港に行きます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "このバスは空港へ行きますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "3番乗り場から乗ってください。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_50",
    "titleId": "FIEZEL Japanese Life A2.2: Will you cut my bangs a little shorter?",
    "titleTh": "อิโรโดริ A2.2: Will you cut my bangs a little shorter?",
    "subtitleId": "Can-Do Bab 14, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 14, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.4,
    "competencyId": "speak_ja_fiezel-life_l50",
    "competencyNameId": "Komunikasi Nyata: Will you cut my bangs a little shorter?",
    "competencyNameTh": "การสื่อสารจริง: Will you cut my bangs a little shorter?",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menanyakan nama gedung dan fasilitas publik di sekitar kota.",
    "situationTh": "ถามชื่ออาคารและสถานที่สำคัญรอบๆ เมือง",
    "openingLine": "あの高いビル、見えますか？あれは何の建物か知っていますか？",
    "openingTranslationId": "Gedung tinggi di sana kelihatan kan? Tahu tidak itu gedung apa?",
    "openingTranslationTh": "เห็นตึกสูงๆ ตรงนั้นไหมครับ? รู้ไหมว่านั่นตึกอะไร?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 14.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 14",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "とても大きい建物ですね。",
      "あれは市役所ですよ。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_50_1",
        "term": "建物",
        "meaningId": "bangunan / gedung",
        "meaningTh": "อาคาร / ตึก",
        "exampleSentence": "新しい建物です。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "とても大きい建物ですね。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "あれは市役所ですよ。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_51",
    "titleId": "FIEZEL Japanese Life A2.2: The lights in the meeting room were left on.",
    "titleTh": "อิโรโดริ A2.2: The lights in the meeting room were left on.",
    "subtitleId": "Can-Do Bab 15, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 15, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.5,
    "competencyId": "speak_ja_fiezel-life_l51",
    "competencyNameId": "Komunikasi Nyata: The lights in the meeting room were left on.",
    "competencyNameTh": "การสื่อสารจริง: The lights in the meeting room were left on.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menanyakan letak barang baterai atau keperluan harian ke kasir toko.",
    "situationTh": "ถามพนักงานร้านสะดวกซื้อว่าถ่านไฟฉายหรือของใช้จำเป็นวางอยู่ตรงไหน",
    "openingLine": "コンビニでお買い物ですか？何か探しているものはありますか？",
    "openingTranslationId": "Sedang belanja di konbini? Apakah ada barang yang sedang kamu cari?",
    "openingTranslationTh": "ซื้อของที่ร้านสะดวกซื้อเหรอครับ? กำลังหาอะไรอยู่หรือเปล่า?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 15.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 15",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "電池はどこにありますか？",
      "あちらの棚の2段目です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_51_1",
        "term": "電池",
        "meaningId": "baterai",
        "meaningTh": "ถ่านไฟฉาย / แบตเตอรี่",
        "exampleSentence": "単三電池を買います。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "電池はどこにありますか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "あちらの棚の2段目です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_52",
    "titleId": "FIEZEL Japanese Life A2.2: Do not panic in case of an earthquake.",
    "titleTh": "อิโรโดริ A2.2: Do not panic in case of an earthquake.",
    "subtitleId": "Can-Do Bab 16, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 16, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.6,
    "competencyId": "speak_ja_fiezel-life_l52",
    "competencyNameId": "Komunikasi Nyata: Do not panic in case of an earthquake.",
    "competencyNameTh": "การสื่อสารจริง: Do not panic in case of an earthquake.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menanyakan harga pakaian dan memastikan apakah ada potongan diskon.",
    "situationTh": "ถามราคาเสื้อผ้าและตรวจสอบว่ามีส่วนลดหรือไม่",
    "openingLine": "この服、とても似合いそうですね！お値段は確認しましたか？",
    "openingTranslationId": "Baju ini kelihatannya sangat cocok untukmu! Sudah cek harganya?",
    "openingTranslationTh": "เสื้อตัวนี้ดูเหมาะกับคุณมากเลยครับ! เช็คราคาหรือยังครับ?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 16.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 16",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "これはいくらですか？",
      "税込で3000円です。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_52_1",
        "term": "いくら",
        "meaningId": "berapa harga ~",
        "meaningTh": "ราคาเท่าไหร่",
        "exampleSentence": "これはいくらですか。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "これはいくらですか？",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "税込で3000円です。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_53",
    "titleId": "FIEZEL Japanese Life A2.2: I can speak Japanese better than before.",
    "titleTh": "อิโรโดริ A2.2: I can speak Japanese better than before.",
    "subtitleId": "Can-Do Bab 17, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 17, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.6,
    "competencyId": "speak_ja_fiezel-life_l53",
    "competencyNameId": "Komunikasi Nyata: I can speak Japanese better than before.",
    "competencyNameTh": "การสื่อสารจริง: I can speak Japanese better than before.",
    "personaId": "nanami",
    "isMeasureExam": false,
    "situationId": "Menceritakan kegiatan menonton bioskop bersama teman di akhir pekan.",
    "situationTh": "เล่าเรื่องการไปดูภาพยนตร์กับเพื่อนในวันหยุดสุดสัปดาห์",
    "openingLine": "週末はどう過ごしましたか？どこか出かけましたか？",
    "openingTranslationId": "Bagaimana akhir pekan kemarin? Apakah kamu jalan-jalan ke suatu tempat?",
    "openingTranslationTh": "วันหยุดสุดสัปดาห์ที่ผ่านมาเป็นอย่างไรบ้างครับ? ได้ไปเที่ยวที่ไหนไหม?",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 17.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 17",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "友達と映画を見に行きました。",
      "とても面白かったです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_53_1",
        "term": "映画",
        "meaningId": "film / bioskop",
        "meaningTh": "ภาพยนตร์ / หนัง",
        "exampleSentence": "映画を見ます。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "友達と映画を見に行きました。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "とても面白かったです。",
        "intent": "accurate"
      }
    ]
  },
  {
    "id": "scen_ja_fiezel-life_54",
    "titleId": "FIEZEL Japanese Life A2.2: I am thinking about starting my own company in the future.",
    "titleTh": "อิโรโดริ A2.2: I am thinking about starting my own company in the future.",
    "subtitleId": "Can-Do Bab 18, Percakapan Kehidupan Nyata di Jepang",
    "subtitleTh": "Can-Do บทที่ 18, การสนทนาชีวิตจริงในญี่ปุ่น",
    "targetLang": "ja",
    "level": "FIEZEL Japanese Life A2.2",
    "difficultyB": 2.7,
    "competencyId": "speak_ja_fiezel-life_l54",
    "competencyNameId": "Komunikasi Nyata: I am thinking about starting my own company in the future.",
    "competencyNameTh": "การสื่อสารจริง: I am thinking about starting my own company in the future.",
    "personaId": "keita",
    "isMeasureExam": false,
    "situationId": "Menyatakan keinginan pergi berlibur ke pemandian air panas (onsen).",
    "situationTh": "บอกความต้องการอยากไปเที่ยวแช่น้ำพุร้อน (ออนเซ็น)",
    "openingLine": "寒くなってきましたね。どこか温かい所に行きたいですね。",
    "openingTranslationId": "Udaranya mulai dingin ya. Pengin rasanya pergi ke tempat yang hangat.",
    "openingTranslationTh": "เริ่มหนาวขึ้นแล้วนะครับ อยากไปที่อุ่นๆ จังเลย",
    "missionGoalsId": [
      "Gunakan pola kalimat situasional yang sesuai untuk bab 18.",
      "Pastikan pelafalan nada intonasi (pitch accent) terdengar alami tanpa ragu."
    ],
    "missionGoalsTh": [
      "ใช้โครงสร้างประโยคที่เหมาะสมสำหรับบทที่ 18",
      "ออกเสียงวรรณยุกต์สูงต่ำ (Pitch Accent) ให้เป็นธรรมชาติ"
    ],
    "targetPatterns": [
      "草津温泉に行きたいです。",
      "露天風呂に入りたいです。"
    ],
    "vocabPrereqs": [
      {
        "id": "v_fiezel-life_54_1",
        "term": "温泉",
        "meaningId": "pemandian air panas (onsen)",
        "meaningTh": "บ่อน้ำพุร้อน (ออนเซ็น)",
        "exampleSentence": "温泉に入ります。"
      }
    ],
    "sampleUtterances": [
      {
        "labelId": "Respons Alami Penutur Asli",
        "labelTh": "คำตอบที่ถูกต้องเป็นธรรมชาติ",
        "text": "草津温泉に行きたいです。",
        "intent": "accurate"
      },
      {
        "labelId": "Respons Alternatif",
        "labelTh": "คำตอบเสริม",
        "text": "露天風呂に入りたいです。",
        "intent": "accurate"
      }
    ]
  }
];
